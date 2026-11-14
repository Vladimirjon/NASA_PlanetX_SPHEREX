"""Runtime settings from environment variables (prefix SKYSHIFT_). No secrets are needed."""

from pathlib import Path

from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SKYSHIFT_", frozen=True)

    cache_dir: Path = Path(".cache/skyshift")
    precomputed_dir: Path | None = None
    hips_base_url: str = "https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube"
    hips_max_parallel: int = Field(default=6, ge=1, le=32)
    cors_origins: list[HttpUrl] = Field(default_factory=list[HttpUrl])
    upstream_timeout_s: float = Field(default=20.0, gt=0, le=120)
    memory_cache_mb: int = Field(default=256, ge=16, le=4096)
