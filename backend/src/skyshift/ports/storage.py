"""Storage port: where cached blobs live (local disk, precomputed seed, …)."""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class BlobMeta:
    source_url: str
    retrieved_at: datetime
    sha256: str
    expires_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class StoredBlob:
    data: bytes
    meta: BlobMeta


class BlobStore(Protocol):
    async def get(self, key: str) -> StoredBlob | None: ...

    async def put(self, key: str, data: bytes, meta: BlobMeta) -> None: ...
