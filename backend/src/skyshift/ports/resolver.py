"""Name resolver port (CDS Sesame today)."""

from dataclasses import dataclass
from typing import Protocol

from skyshift.domain.motion import Motion
from skyshift.domain.position import SkyPosition
from skyshift.ports.origin import Fetched


@dataclass(frozen=True, slots=True)
class ResolvedTarget:
    canonical_name: str
    position: SkyPosition
    motion: Motion | None
    epoch_label: str
    source: str


class NameResolver(Protocol):
    def cache_key(self, name: str) -> str: ...

    async def fetch(self, name: str) -> Fetched: ...

    def parse(self, data: bytes) -> ResolvedTarget | None:
        """None when the name is unknown; InvalidPayload when the response is broken."""
        ...
