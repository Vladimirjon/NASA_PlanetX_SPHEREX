"""Load and validate the packaged catalog at the composition boundary."""

from datetime import datetime
from importlib.resources import files

from pydantic import BaseModel, Field

from skyshift.domain.motion import Motion
from skyshift.domain.search import Target


class CatalogMotion(BaseModel):
    pm_ra_masyr: float
    pm_dec_masyr: float
    parallax_mas: float
    ref_epoch_jyear: float


class Source(BaseModel):
    url: str
    resolver: str
    refPos: str | None = None
    verified_astrometry: str | None = None


class Record(BaseModel):
    name: str
    aliases: list[str]
    ra: float = Field(ge=0, lt=360)
    dec: float = Field(ge=-90, le=90)
    coordinate_epoch: str
    motion: CatalogMotion | None = None
    object_type: str | None = None
    description: str | None = Field(default=None, max_length=60)
    source: Source
    retrieved_at: datetime


def load_catalog() -> tuple[Target, ...]:
    import json

    data = json.loads(
        files("skyshift").joinpath("data/popular_targets.json").read_text(encoding="utf-8")
    )
    records = [Record.model_validate(item) for item in data]
    return tuple(
        Target(
            r.name,
            tuple(r.aliases),
            r.ra,
            r.dec,
            r.coordinate_epoch,
            Motion(**r.motion.model_dump()) if r.motion else None,
            r.object_type,
            r.description,
            r.source.url,
            r.retrieved_at,
            r.source.resolver,
            r.source.refPos,
            r.source.verified_astrometry,
        )
        for r in records
    )
