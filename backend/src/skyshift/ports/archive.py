"""Image archive port: byte ranges of an L2 FITS file (public S3 bucket today)."""

from typing import Protocol

from skyshift.domain.observation import Observation
from skyshift.ports.origin import Fetched


class ImageArchive(Protocol):
    def range_key(self, observation: Observation, start: int, length: int) -> str: ...

    async def fetch_range(self, observation: Observation, start: int, length: int) -> Fetched:
        """Exactly `length` bytes from `start` (shorter only at end of file)."""
        ...
