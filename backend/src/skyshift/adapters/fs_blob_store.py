"""Local-disk blob store: content files named by SHA-256 of the key, atomic writes.

Keys are hashed, so no client-controlled string ever becomes a path.
Data and metadata are written to temp files in the same directory and published with
os.replace (atomic on POSIX and Windows); a reader never sees a half-written file.
"""

import asyncio
import hashlib
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path

from skyshift.ports.storage import BlobMeta, StoredBlob


class FilesystemBlobStore:
    def __init__(self, root: Path) -> None:
        self._root = root

    def _paths(self, key: str) -> tuple[Path, Path]:
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
        base = self._root / digest[:2] / digest
        return base.with_suffix(".bin"), base.with_suffix(".json")

    async def get(self, key: str) -> StoredBlob | None:
        return await asyncio.to_thread(self._get_sync, key)

    async def put(self, key: str, data: bytes, meta: BlobMeta) -> None:
        await asyncio.to_thread(self._put_sync, key, data, meta)

    def _get_sync(self, key: str) -> StoredBlob | None:
        data_path, meta_path = self._paths(key)
        try:
            raw_meta = meta_path.read_text(encoding="utf-8")
            data = data_path.read_bytes()
        except FileNotFoundError:
            return None
        meta = _meta_from_json(raw_meta)
        if hashlib.sha256(data).hexdigest() != meta.sha256:
            # Corrupt or tampered entry: treat as a miss so it is refetched and overwritten.
            return None
        return StoredBlob(data=data, meta=meta)

    def _put_sync(self, key: str, data: bytes, meta: BlobMeta) -> None:
        data_path, meta_path = self._paths(key)
        data_path.parent.mkdir(parents=True, exist_ok=True)
        _atomic_write(data_path, data)
        _atomic_write(meta_path, _meta_to_json(meta).encode("utf-8"))


def _atomic_write(target: Path, payload: bytes) -> None:
    fd, tmp_name = tempfile.mkstemp(dir=target.parent, prefix=".tmp-")
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, target)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def _meta_to_json(meta: BlobMeta) -> str:
    return json.dumps(
        {
            "source_url": meta.source_url,
            "retrieved_at": meta.retrieved_at.isoformat(),
            "sha256": meta.sha256,
            "expires_at": meta.expires_at.isoformat() if meta.expires_at else None,
        }
    )


def _meta_from_json(raw: str) -> BlobMeta:
    obj = json.loads(raw)
    expires = obj.get("expires_at")
    return BlobMeta(
        source_url=str(obj["source_url"]),
        retrieved_at=datetime.fromisoformat(obj["retrieved_at"]),
        sha256=str(obj["sha256"]),
        expires_at=datetime.fromisoformat(expires) if expires else None,
    )
