"""The 5 challenge test objects with verified astrometry (docs/context/12 §7).

Used first by name resolution so the demo is deterministic and works offline. Sources:
Gaia DR3 (J2016.0) except WISE 0855-0714 (not in Gaia): Luhman & Esplin 2016, Tables 2 and 4.
"""

from dataclasses import dataclass

from skyshift.domain.motion import Motion
from skyshift.domain.position import SkyPosition


@dataclass(frozen=True, slots=True)
class KnownTarget:
    canonical_name: str
    aliases: tuple[str, ...]
    position: SkyPosition
    motion: Motion
    epoch_label: str
    source: str


CHALLENGE_TARGETS: tuple[KnownTarget, ...] = (
    KnownTarget(
        "Barnard's Star",
        ("barnard's star", "barnards star", "barnard star", "barnard", "gj 699"),
        SkyPosition(269.44850253, 4.73942005),
        Motion(-801.551, 10362.394, 546.976, 2016.0),
        "J2016.0",
        "Gaia DR3 4472832130942575872",
    ),
    KnownTarget(
        "Epsilon Indi B",
        ("epsilon indi b", "eps indi b", "eps ind b", "epsilon indi ba"),
        SkyPosition(331.07645260, -56.79381207),
        Motion(3981.977, -2466.832, 270.658, 2016.0),
        "J2016.0",
        "Gaia DR3 6412596012146801152 (photocentre of Ba+Bb)",
    ),
    KnownTarget(
        "WISE 0855-0714",
        ("wise 0855-0714", "wise 0855", "wise0855", "wise j085510.83-071442.5"),
        SkyPosition(133.7952573, -7.2450910),
        Motion(-8118.0, 680.0, 449.0, 2010.34),
        "MJD 55320.38 (2010.34)",
        "Luhman & Esplin 2016, ApJ 152, 78 (arXiv:1605.06655)",
    ),
    KnownTarget(
        "RW Aurigae",
        ("rw aurigae", "rw aur", "rw aur a"),
        SkyPosition(76.95608120, 30.40120459),
        Motion(2.641, -27.398, 6.406, 2016.0),
        "J2016.0",
        "Gaia DR3 156430822114424576",
    ),
    KnownTarget(
        "R Draconis",
        ("r draconis", "r dra"),
        SkyPosition(248.16737837, 66.75500675),
        Motion(-20.643, 6.149, 1.251, 2016.0),
        "J2016.0",
        "Gaia DR3 1648328016354496384",
    ),
)


def find_known(name: str) -> KnownTarget | None:
    # Unicode minus (U+2212) and underscores are normalised before matching.
    key = " ".join(name.lower().replace("\u2212", "-").replace("_", " ").split())
    return next((t for t in CHALLENGE_TARGETS if key in t.aliases), None)
