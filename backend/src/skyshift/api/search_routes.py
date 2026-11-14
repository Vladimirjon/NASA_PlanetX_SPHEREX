"""Search HTTP boundary."""

from typing import Annotated, Literal

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from skyshift.api.schemas import MotionModel, Provenance, layer_literal
from skyshift.application.search_targets import SearchTargets

router = APIRouter(prefix="/api/v1")


class SearchSuggestionModel(BaseModel):
    name: str
    kind: Literal["target", "coordinates", "resolver"]
    ra: float
    dec: float
    coordinate_epoch: str | None = None
    motion: MotionModel | None = None
    object_type: str | None = None
    description: str | None = None
    matched_alias: str | None = None
    score: float
    provenance: Provenance


@router.get("/search", response_model=list[SearchSuggestionModel], response_model_exclude_none=True)
async def search(
    request: Request,
    q: Annotated[str, Query(min_length=1, max_length=64)],
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
) -> list[SearchSuggestionModel]:
    service: SearchTargets = request.app.state.search_targets
    suggestions = await service(q, limit)
    return [
        SearchSuggestionModel(
            name=s.name,
            kind=s.kind,
            ra=s.ra,
            dec=s.dec,
            coordinate_epoch=s.coordinate_epoch,
            motion=MotionModel.of(s.motion),
            object_type=s.object_type,
            description=s.description,
            matched_alias=s.matched_alias,
            score=s.score,
            provenance=Provenance(
                source_url=s.source_url,
                collection="user-supplied coordinates" if s.kind == "coordinates" else None,
                retrieved_at=s.retrieved_at,
                cache_layer=layer_literal(s.cache_layer),
                resolver=s.resolver,
                reference=s.reference,
                astrometry_source=s.astrometry_source,
            ),
        )
        for s in suggestions
    ]
