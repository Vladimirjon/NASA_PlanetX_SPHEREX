# pyright: basic
# Reason: astropy ships no type stubs; this is the only module that touches astropy.io.votable.
"""Typed boundary: VOTable bytes → list of string-valued rows."""

import io
import warnings

from astropy.io.votable import parse_single_table
from astropy.io.votable.exceptions import VOWarning

from skyshift.ports.origin import InvalidPayload


def read_rows(data: bytes) -> list[dict[str, str]]:
    if not data.lstrip().startswith(b"<?xml"):
        raise InvalidPayload("response is not a VOTable")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", VOWarning)
            table = parse_single_table(io.BytesIO(data)).to_table(use_names_over_ids=True)
    except Exception as exc:  # astropy raises many unrelated types for malformed XML
        raise InvalidPayload(f"invalid VOTable: {type(exc).__name__}") from exc
    names = list(table.colnames)
    return [{name: _text(row[name]) for name in names} for row in table]


def _text(value: object) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8", "replace")
    return "" if value is None else str(value)
