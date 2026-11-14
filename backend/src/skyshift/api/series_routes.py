"""HTTP routes for name resolution, observation listing and temporal series. Handlers stay thin:
validate at the edge, call one use case, serialize."""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Path, Query, Request, Response

from skyshift.api.problems import problem
from skyshift.api.schemas import (
    MotionModel,
    Provenance,
    ResolvedNameModel,
    index_model,
    layer_literal,
)
from skyshift.application.build_series import SeriesRequest
from skyshift.application.get_series import GetSeries
from skyshift.application.list_observations import ListObservations
from skyshift.application.resolve_name import ResolveName
from skyshift.application.tiered_cache import CacheLayer
from skyshift.domain.motion import Motion
from skyshift.domain.position import SkyPosition

router = APIRouter(prefix="/api/v1")

Ra = Annotated[float, Query(ge=0, lt=360, description="ICRS RA, degrees")]
Dec = Annotated[float, Query(ge=-90, le=90, description="ICRS Dec, degrees")]


@dataclass(frozen=True, slots=True)
class SeriesServices:
    resolve_name: ResolveName
    list_observations: ListObservations
    get_series: GetSeries


def _svc(request: Request) -> SeriesServices:
    services: SeriesServices = request.app.state.series_services
    return services


def _layer_header(layer: CacheLayer) -> dict[str, str]:
    return {"X-Cache-Layer": layer.value}


@router.get("/resolve", response_model=ResolvedNameModel)
async def resolve_name(
    request: Request, name: Annotated[str, Query(min_length=1, max_length=64)]
) -> ResolvedNameModel:
    res = await _svc(request).resolve_name(name)
    t = res.target
    return ResolvedNameModel(
        query=name,
        canonical_name=t.canonical_name or None,
        ra=t.position.ra_deg,
        dec=t.position.dec_deg,
        coordinate_epoch=t.epoch_label,
        motion=MotionModel.of(t.motion),
        provenance=Provenance(
            source_url=res.source_url,
            retrieved_at=res.retrieved_at or datetime.now(UTC),
            cache_layer=layer_literal(res.cache_layer),
        ),
    )


@router.get("/observations")
async def list_observations(request: Request, ra: Ra, dec: Dec) -> Response:
    index = await _svc(request).list_observations(SkyPosition(ra, dec))
    return Response(
        index_model(index).model_dump_json(),
        media_type="application/json",
        headers=_layer_header(index.cache_layer),
    )


@router.get("/series")
async def build_series(
    request: Request,
    ra: Ra,
    dec: Dec,
    fov_arcmin: Annotated[float, Query(ge=1, le=30)] = 5.0,
    detector: Annotated[int | None, Query(ge=1, le=6)] = None,
    wavelength_um: Annotated[float | None, Query(ge=0.7, le=5.1)] = None,
    pm_ra_masyr: Annotated[float | None, Query(ge=-20000, le=20000)] = None,
    pm_dec_masyr: Annotated[float | None, Query(ge=-20000, le=20000)] = None,
    parallax_mas: Annotated[float | None, Query(ge=0, le=1000)] = None,
    ref_epoch_jyear: Annotated[float | None, Query(ge=1990, le=2100)] = None,
) -> Response:
    motion_parts = (pm_ra_masyr, pm_dec_masyr, ref_epoch_jyear)
    if any(p is not None for p in motion_parts) and not all(p is not None for p in motion_parts):
        return problem(
            422,
            "invalid-input",
            "Invalid input",
            "pm_ra_masyr, pm_dec_masyr and ref_epoch_jyear must be given together",
        )
    motion = None
    if pm_ra_masyr is not None and pm_dec_masyr is not None and ref_epoch_jyear is not None:
        motion = Motion(pm_ra_masyr, pm_dec_masyr, parallax_mas or 0.0, ref_epoch_jyear)
    resolved = await _svc(request).get_series(
        SeriesRequest(SkyPosition(ra, dec), fov_arcmin, detector, wavelength_um, motion)
    )
    return Response(
        resolved.data, media_type="application/json", headers=_layer_header(resolved.layer)
    )


@router.get("/series/{series_id}/frames/{index}")
async def frame_data(
    request: Request,
    series_id: Annotated[str, Path(pattern=r"^[a-f0-9]{16,64}$")],
    index: Annotated[int, Path(ge=0, le=255)],
) -> Response:
    resolved = await _svc(request).get_series.frame(series_id, index)
    if resolved is None:
        return problem(404, "not-found", "Frame not found", "build the series first via /series")
    return Response(
        resolved.data,
        media_type="application/octet-stream",
        headers={
            **_layer_header(resolved.layer),
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    )
