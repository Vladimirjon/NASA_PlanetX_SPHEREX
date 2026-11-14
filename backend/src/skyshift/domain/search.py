"""Pure name normalization, fuzzy matching and coordinate parsing."""

import math
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime

from skyshift.domain.motion import Motion

_GREEK = {
    "\u03b1": "alpha",
    "\u03b2": "beta",
    "\u03b3": "gamma",
    "\u03b4": "delta",
    "\u03b5": "epsilon",
    "\u03b6": "zeta",
    "\u03b7": "eta",
    "\u03b8": "theta",
    "\u03b9": "iota",
    "\u03ba": "kappa",
    "\u03bb": "lambda",
    "\u03bc": "mu",
    "\u03bd": "nu",
    "\u03be": "xi",
    "\u03bf": "omicron",
    "\u03c0": "pi",
    "\u03c1": "rho",
    "\u03c3": "sigma",
    "\u03c4": "tau",
    "\u03c5": "upsilon",
    "\u03c6": "phi",
    "\u03c7": "chi",
    "\u03c8": "psi",
    "\u03c9": "omega",
}
_BAYER = {
    "alf": "alpha",
    "alfa": "alpha",
    "a": "alpha",
    "bet": "beta",
    "gam": "gamma",
    "del": "delta",
    "eps": "epsilon",
    "zet": "zeta",
    "the": "theta",
}


def normalize(value: str) -> str:
    value = value.casefold().replace("\u2212", "-").replace("'", "")
    value = "".join(" " + _GREEK[c] + " " if c in _GREEK else c for c in value)
    value = "".join(c for c in unicodedata.normalize("NFKD", value) if not unicodedata.combining(c))
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(
        r"\b(messier|m|ngc|ic)\s*(\d+)\b",
        lambda m: ("m" if m[1] == "messier" else m[1]) + " " + m[2],
        value,
    )
    return " ".join(_BAYER.get(token, token) for token in value.split())


def _edit_distance(a: str, b: str) -> int:
    """Damerau-Levenshtein distance, including adjacent transpositions."""
    previous_previous: list[int] | None = None
    previous = list(range(len(b) + 1))
    for i, left in enumerate(a, 1):
        current = [i]
        for j, right in enumerate(b, 1):
            distance = min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (left != right))
            if previous_previous is not None and j > 1 and left == b[j - 2] and a[i - 2] == right:
                distance = min(distance, previous_previous[j - 2] + 1)
            current.append(distance)
        previous_previous, previous = previous, current
    return previous[-1]


def similarity(query: str, alias: str) -> float:
    a, b = normalize(query), normalize(alias)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    if b.startswith(a):
        return 0.92
    if set(a.split()) == set(b.split()):
        return 0.88
    return 0.84 * (1 - _edit_distance(a, b) / max(len(a), len(b)))


def resembles_coordinates(value: str) -> bool:
    """Recognize coordinate-shaped input without treating catalog IDs as positions."""
    text = value.strip().replace("\u2212", "-")
    decimal = re.fullmatch(r"[+-]?\d+(?:\.\d+)?\s*[, ]\s*[+-]?\d+(?:\.\d+)?", text)
    return decimal is not None or bool(re.match(r"^\d{1,2}(?::|h)\d", text, re.IGNORECASE))


def parse_coordinates(value: str) -> tuple[float, float] | None:
    value = value.strip().replace("\u2212", "-")
    decimal = re.fullmatch(r"([+-]?\d+(?:\.\d+)?)\s*[, ]\s*([+-]?\d+(?:\.\d+)?)", value)
    if decimal:
        ra, dec = float(decimal[1]), float(decimal[2])
    else:
        sexa = re.fullmatch(
            r"(\d{1,2})(?::|h)(\d{1,2})(?::|m)(\d{1,2}(?:\.\d+)?)(?:s)?\s+([+-])(\d{1,2})(?::|d)(\d{1,2})(?::|m)(\d{1,2}(?:\.\d+)?)(?:s)?",
            value,
            re.IGNORECASE,
        )
        if sexa is None:
            return None
        h, rm, rs, sign, d, dm, ds = sexa.groups()
        if int(h) >= 24 or int(rm) >= 60 or float(rs) >= 60 or int(dm) >= 60 or float(ds) >= 60:
            return None
        ra = (int(h) + int(rm) / 60 + float(rs) / 3600) * 15
        dec = (int(d) + int(dm) / 60 + float(ds) / 3600) * (-1 if sign == "-" else 1)
    return (
        (ra, dec)
        if math.isfinite(ra) and math.isfinite(dec) and 0 <= ra < 360 and -90 <= dec <= 90
        else None
    )


def rank(query: str, aliases: tuple[str, ...]) -> tuple[float, str]:
    """Best matching alias, with stable tie-breaking."""
    matches = [(similarity(query, alias), alias) for alias in aliases]
    return min(matches, key=lambda item: (-item[0], item[1].casefold()))


@dataclass(frozen=True, slots=True)
class Target:
    name: str
    aliases: tuple[str, ...]
    ra: float
    dec: float
    coordinate_epoch: str
    motion: Motion | None
    object_type: str | None
    description: str | None
    source_url: str
    retrieved_at: datetime
    resolver: str
    reference: str | None
    astrometry_source: str | None
