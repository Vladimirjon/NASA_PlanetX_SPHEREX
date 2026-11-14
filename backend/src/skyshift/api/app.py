"""FastAPI composition root. Wires adapters into the tiered resolver; handlers stay thin."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, FastAPI, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from skyshift.adapters.fs_blob_store import FilesystemBlobStore
from skyshift.adapters.irsa_hips import IrsaHipsTiles
from skyshift.adapters.irsa_sia import IrsaSia2Catalog
from skyshift.adapters.s3_archive import S3ImageArchive
from skyshift.adapters.sesame import SesameResolver
from skyshift.api.problems import install_problem_handlers
from skyshift.api.schemas import present_series
from skyshift.api.series_routes import SeriesServices
from skyshift.api.series_routes import router as series_router
from skyshift.application.build_series import BuildSeries
from skyshift.application.frame_reader import FrameReader
from skyshift.application.get_hips_tile import GetHipsTile
from skyshift.application.get_series import GetSeries
from skyshift.application.list_observations import ListObservations
from skyshift.application.resolve_name import ResolveName
from skyshift.application.tiered_cache import TieredResolver
from skyshift.config import Settings
from skyshift.domain.hips import CUBE_DEPTH, MAX_ORDER, HipsTileAddress


@dataclass(frozen=True, slots=True)
class Services:
    """Use cases exposed to the HTTP layer, built once in the composition root."""

    resolver: TieredResolver
    get_hips_tile: GetHipsTile


class UpstreamHealth(BaseModel):
    irsa: Literal["closed", "open", "half_open"]


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    upstream: UpstreamHealth


def _services(request: Request) -> Services:
    services: Services = request.app.state.services
    return services


router = APIRouter(prefix="/api/v1")


@router.get("/health", response_model=Health)
async def get_health(request: Request) -> Health:
    state = _services(request).resolver.breaker.state
    return Health(
        status="ok" if state == "closed" else "degraded", upstream=UpstreamHealth(irsa=state)
    )


@router.get("/hips/{order}/{dir_}/{npix}", response_class=Response)
async def get_hips_tile(
    request: Request,
    order: int,
    dir_: int,
    npix: int,
    plane: Annotated[int, Query(ge=0, lt=CUBE_DEPTH)] = 0,
) -> Response:
    if not 0 <= order <= MAX_ORDER:
        order = -1  # let the domain raise a uniform 422
    address = HipsTileAddress.from_path(order=order, dir_=dir_, npix=npix, plane=plane)
    resolved = await _services(request).get_hips_tile(address)
    return Response(
        content=resolved.data,
        media_type="image/png",
        headers={
            "X-Cache-Layer": resolved.layer.value,
            "X-Source-Url": resolved.meta.source_url,
            "X-Retrieved-At": resolved.meta.retrieved_at.isoformat(),
            "Cache-Control": "public, max-age=86400",
        },
    )


def create_app(
    settings: Settings | None = None,
    *,
    upstream_transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    cfg = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        async with httpx.AsyncClient(
            transport=upstream_transport,
            timeout=httpx.Timeout(cfg.upstream_timeout_s, connect=5.0),
            limits=httpx.Limits(max_connections=32, max_keepalive_connections=16),
            follow_redirects=False,
            headers={"User-Agent": "SkyShift/0.1 (NASA Space Apps 2026)"},
        ) as client:
            # One circuit breaker PER upstream: a burst of S3 or tile errors must never
            # block catalog queries (and vice versa). All share the same disk store.
            store = FilesystemBlobStore(cfg.cache_dir)
            precomputed = FilesystemBlobStore(cfg.precomputed_dir) if cfg.precomputed_dir else None
            memory = cfg.memory_cache_mb * 1024 * 1024

            def resolver(share: float) -> TieredResolver:
                return TieredResolver(
                    store, precomputed=precomputed, memory_max_bytes=int(memory * share)
                )

            hips, sia, s3, names, derived = (
                resolver(0.35),
                resolver(0.05),
                resolver(0.35),
                resolver(0.01),
                resolver(0.24),
            )
            app.state.services = Services(
                resolver=sia,
                get_hips_tile=GetHipsTile(hips, IrsaHipsTiles(client, cfg.hips_base_url)),
            )
            list_observations = ListObservations(sia, IrsaSia2Catalog(client))
            app.state.series_services = SeriesServices(
                resolve_name=ResolveName(names, SesameResolver(client)),
                list_observations=list_observations,
                get_series=GetSeries(
                    BuildSeries(list_observations, FrameReader(s3, S3ImageArchive(client))),
                    derived,
                    present_series,
                ),
            )
            yield

    app = FastAPI(title="SkyShift API", version="0.1.0", lifespan=lifespan)
    if cfg.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(o).rstrip("/") for o in cfg.cors_origins],
            allow_methods=["GET"],
            expose_headers=["X-Cache-Layer", "X-Source-Url", "X-Retrieved-At"],
        )
    install_problem_handlers(app)
    app.include_router(router)
    app.include_router(series_router)
    return app
