"""IRSA SIA2 adapter for SPHEREx L2 images (D12 §5.1).

Collections: DR1 + QR3 (same R7 calibration); QR2 is never used (D12 §1). The detector comes
from `energy_bandpassname` ("SPHEREx-Dn"); `em_min/em_max` span the whole detector and are
NOT used for wavelength matching.
"""

import asyncio
import re

import httpx
from pydantic import BaseModel, ValidationError

from skyshift.adapters.http import Sleep, get_with_retry
from skyshift.adapters.votable import read_rows
from skyshift.domain.observation import Observation
from skyshift.domain.position import SkyPosition
from skyshift.ports.origin import Fetched, InvalidPayload, OriginError

SIA_URL = "https://irsa.ipac.caltech.edu/SIA"
S3_BUCKET = "nasa-irsa-spherex"
DETECTOR = re.compile(r"^SPHEREx-D([1-6])$")
ALLOWED_ACCESS_PREFIX = "https://irsa.ipac.caltech.edu/ibe/data/spherex/"


class IrsaSia2Catalog:
    def __init__(
        self,
        client: httpx.AsyncClient,
        *,
        radius_deg: float = 0.01,
        collections: tuple[str, ...] = ("spherex_dr1", "spherex_qr3"),
        sleep: Sleep = asyncio.sleep,
    ) -> None:
        self._client = client
        self._radius = radius_deg
        self._collections = collections
        self._sleep = sleep

    @property
    def collections(self) -> tuple[str, ...]:
        return self._collections

    def cache_key(self, position: SkyPosition, collection: str) -> str:
        # Rounded to ~1″ so nearby clicks share the cache entry.
        return f"sia:{collection}:{position.ra_deg:.4f}:{position.dec_deg:.4f}:{self._radius}"

    async def fetch(self, position: SkyPosition, collection: str) -> Fetched:
        params = {
            "COLLECTION": collection,
            "POS": f"circle {position.ra_deg:.6f} {position.dec_deg:.6f} {self._radius}",
            "RESPONSEFORMAT": "VOTABLE",
        }
        try:
            response = await get_with_retry(self._client, SIA_URL, params=params, sleep=self._sleep)
        except httpx.HTTPError as exc:
            raise OriginError(f"IRSA SIA2 request failed: {type(exc).__name__}") from exc
        if response.status_code != 200:
            raise OriginError(f"IRSA SIA2 answered HTTP {response.status_code}")
        return Fetched(data=response.content, source_url=str(response.url))

    def parse(self, data: bytes) -> list[Observation]:
        observations: list[Observation] = []
        for row in read_rows(data):
            match = DETECTOR.match(row.get("energy_bandpassname", ""))
            access_url = row.get("access_url", "")
            if not match or not access_url.startswith(ALLOWED_ACCESS_PREFIX):
                continue
            try:
                observations.append(
                    Observation(
                        obs_did=row["obs_publisher_did"],
                        obs_id=row["obs_id"],
                        collection=row["obs_collection"],
                        detector=int(match.group(1)),
                        t_min_mjd=float(row["t_min"]),
                        t_max_mjd=float(row["t_max"]),
                        access_url=access_url,
                        s3_key=_s3_key(row.get("cloud_access", "")),
                    )
                )
            except (KeyError, ValueError) as exc:
                raise InvalidPayload(f"SIA2 row missing or invalid field: {exc}") from exc
        return observations


class _AwsLocation(BaseModel):
    bucket_name: str
    key: str


class _CloudAccess(BaseModel):
    aws: _AwsLocation


def _s3_key(cloud_access: str) -> str | None:
    """Validate IRSA's cloud_access JSON; only our public bucket and plain keys are accepted."""
    if not cloud_access:
        return None
    try:
        aws = _CloudAccess.model_validate_json(cloud_access).aws
    except ValidationError:
        return None
    if aws.bucket_name != S3_BUCKET or ".." in aws.key or aws.key.startswith("/"):
        return None
    return aws.key
