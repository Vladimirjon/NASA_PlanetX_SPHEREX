"""Origin port: the contract every upstream adapter (IRSA, CDS, S3, …) honours."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Fetched:
    data: bytes
    source_url: str


class OriginError(Exception):
    """Transient upstream failure (timeout, 5xx, network)."""


class OriginNotFound(Exception):
    """Upstream says the resource does not exist (404). Not a failure of the upstream."""


class InvalidPayload(Exception):
    """Upstream answered but the payload failed validation; it is never stored."""
