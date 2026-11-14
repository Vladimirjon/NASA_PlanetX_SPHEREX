"""Response models mirroring contracts/openapi.yaml v0.2 (the contract is the source of truth)."""

import math
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from skyshift.application.build_series import PIPELINE_VERSION, Frame, SeriesResult
from skyshift.application.get_series import PIPELINE_URL
from skyshift.application.list_observations import ObservationIndex
from skyshift.application.tiered_cache import CacheLayer
from skyshift.domain.astro import mjd_to_datetime
from skyshift.domain.motion import Motion

Layer = Literal["memory", "local", "origin", "precomputed"]


class Provenance(BaseModel):
    source_url: str
    collection: str | None = None
    retrieved_at: datetime
    cache_layer: Layer
    sha256: str | None = None
    pipeline_version: str | None = None
    resolver: str | None = None
    reference: str | None = None
    astrometry_source: str | None = None


class MotionModel(BaseModel):
    pm_ra_masyr: float
    pm_dec_masyr: float
    parallax_mas: float | None = None
    ref_epoch_jyear: float

    @classmethod
    def of(cls, m: Motion | None) -> "MotionModel | None":
        if m is None:
            return None
        return cls(
            pm_ra_masyr=m.pm_ra_masyr,
            pm_dec_masyr=m.pm_dec_masyr,
            parallax_mas=m.parallax_mas,
            ref_epoch_jyear=m.ref_epoch_jyear,
        )


class ResolvedNameModel(BaseModel):
    query: str
    canonical_name: str | None = None
    ra: float
    dec: float
    coordinate_epoch: str | None = None
    motion: MotionModel | None = None
    provenance: Provenance


class ObservationModel(BaseModel):
    obs_id: str
    collection: str
    t_mid: datetime
    mjd_mid: float
    detector: int
    wavelength_min_um: float | None = None
    wavelength_max_um: float | None = None
    access_url: str


class VisitModel(BaseModel):
    visit_id: str
    t_start: datetime
    t_end: datetime
    observations: list[ObservationModel]


class ObservationIndexModel(BaseModel):
    ra: float
    dec: float
    visits: list[VisitModel]
    provenance: Provenance


class GridModel(BaseModel):
    shape: tuple[int, int]
    crval_deg: tuple[float, float]
    pixel_scale_arcsec: float
    projection: Literal["TAN"] = "TAN"


class FrameStats(BaseModel):
    p01: float | None
    p50: float | None
    p99: float | None
    masked_fraction: float = Field(ge=0, le=1)


class Position(BaseModel):
    ra: float
    dec: float


class FrameModel(BaseModel):
    index: int
    visit_id: str
    obs_id: str
    t_mid: datetime
    mjd_mid: float
    detector: int
    wavelength_um: float
    bandwidth_um: float
    wavelength_delta_nm: float
    survey_epa_deg: Literal[0, 180]
    predicted_position: Position
    unit: str
    data_url: str
    stats: FrameStats
    provenance: Provenance


class CheckModel(BaseModel):
    name: str
    passed: bool
    detail: str


class Comparability(BaseModel):
    level: Literal["OBSERVED", "EVALUATED"]
    checks: list[CheckModel]


class RejectedModel(BaseModel):
    obs_id: str
    reason: str
    detail: str


class SeriesModel(BaseModel):
    series_id: str
    target: Position
    fov_arcmin: float
    detector: int | None
    reference_wavelength_um: float | None
    wavelength_tolerance_nm: float | None
    motion: MotionModel | None
    warnings: list[str]
    grid: GridModel
    frames: list[FrameModel]
    rejected: list[RejectedModel]
    comparability: Comparability
    provenance: Provenance


def _num(value: float) -> float | None:
    return None if math.isnan(value) else value


_LAYERS: dict[CacheLayer, Layer] = {
    CacheLayer.MEMORY: "memory",
    CacheLayer.LOCAL: "local",
    CacheLayer.ORIGIN: "origin",
    CacheLayer.PRECOMPUTED: "precomputed",
}


def layer_literal(layer: CacheLayer) -> Layer:
    return _LAYERS[layer]


def index_model(index: ObservationIndex) -> ObservationIndexModel:
    return ObservationIndexModel(
        ra=index.position.ra_deg,
        dec=index.position.dec_deg,
        visits=[
            VisitModel(
                visit_id=v.visit_id,
                t_start=mjd_to_datetime(v.start_mjd),
                t_end=mjd_to_datetime(v.end_mjd),
                observations=[
                    ObservationModel(
                        obs_id=o.obs_did,
                        collection=o.collection,
                        t_mid=mjd_to_datetime(o.t_mid_mjd),
                        mjd_mid=o.t_mid_mjd,
                        detector=o.detector,
                        access_url=o.access_url,
                    )
                    for o in v.observations
                ],
            )
            for v in index.visits
        ],
        provenance=Provenance(
            source_url=index.source_urls[0]
            if index.source_urls
            else "https://irsa.ipac.caltech.edu/SIA",
            collection=",".join(
                sorted({o.collection for v in index.visits for o in v.observations})
            )
            or None,
            retrieved_at=index.retrieved_at,
            cache_layer=layer_literal(index.cache_layer),
        ),
    )


def _frame(result: SeriesResult, f: Frame) -> FrameModel:
    p01, p50, p99 = result.stretch  # one common stretch for the whole series (D12 §6.11)
    return FrameModel(
        index=f.index,
        visit_id=f.visit.visit_id,
        obs_id=f.observation.obs_did,
        t_mid=mjd_to_datetime(f.mjd_avg),
        mjd_mid=f.mjd_avg,
        detector=f.observation.detector,
        wavelength_um=round(f.wavelength_um, 5),
        bandwidth_um=round(f.bandwidth_um, 5),
        wavelength_delta_nm=f.delta_nm,
        survey_epa_deg=180 if f.survey_epa_deg == 180 else 0,
        predicted_position=Position(ra=f.predicted.ra_deg, dec=f.predicted.dec_deg),
        unit=f.unit,
        data_url=f"/api/v1/series/{result.series_id}/frames/{f.index}",
        stats=FrameStats(
            p01=_num(p01), p50=_num(p50), p99=_num(p99), masked_fraction=f.masked_fraction
        ),
        provenance=Provenance(
            source_url=f.observation.access_url,
            collection=f.observation.collection,
            retrieved_at=result.index.retrieved_at,
            cache_layer=layer_literal(result.index.cache_layer),
            pipeline_version=PIPELINE_VERSION,
        ),
    )


def present_series(result: SeriesResult) -> bytes:
    req = result.request
    model = SeriesModel(
        series_id=result.series_id,
        target=Position(ra=req.position.ra_deg, dec=req.position.dec_deg),
        fov_arcmin=req.fov_arcmin,
        detector=result.detector,
        reference_wavelength_um=None
        if result.reference_um is None
        else round(result.reference_um, 5),
        wavelength_tolerance_nm=result.tolerance_nm,
        motion=MotionModel.of(req.motion),
        warnings=list(result.warnings),
        grid=GridModel(
            shape=(result.grid.size, result.grid.size),
            crval_deg=(result.grid.ra_deg, result.grid.dec_deg),
            pixel_scale_arcsec=result.grid.pixel_scale_arcsec,
        ),
        frames=[_frame(result, f) for f in result.frames],
        rejected=[
            RejectedModel(obs_id=r.obs_did, reason=r.reason, detail=r.detail)
            for r in result.rejected
        ],
        comparability=Comparability(
            level=result.level,
            checks=[
                CheckModel(name=c.name, passed=c.passed, detail=c.detail) for c in result.checks
            ],
        ),
        provenance=Provenance(
            source_url=PIPELINE_URL,
            retrieved_at=result.index.retrieved_at,
            cache_layer=layer_literal(result.index.cache_layer),
            pipeline_version=PIPELINE_VERSION,
        ),
    )
    return model.model_dump_json().encode()
