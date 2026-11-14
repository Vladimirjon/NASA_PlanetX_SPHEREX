"""HiPS tile addressing for the SPHEREx DR1 all-sky cube (IVOA HiPS 1.0).

Constants come from the service `properties` file
(docs/fuentes/spherex-dr1-hips-properties.txt): hips_order=5, hips_cube_depth=102,
hips_tile_format=png. Tiles are for visualization only, never for measurement.
"""

from dataclasses import dataclass

MAX_ORDER = 5
CUBE_DEPTH = 102
DIR_STEP = 10_000  # HiPS 1.0 §4.2: Dir = floor(Npix / 10000) * 10000


class InvalidTileAddress(ValueError):
    """Raised when order/npix/plane/dir do not describe an existing tile."""


def npix_count(order: int) -> int:
    return 12 * 4**order


@dataclass(frozen=True, slots=True)
class HipsTileAddress:
    order: int
    npix: int
    plane: int

    def __post_init__(self) -> None:
        if not 0 <= self.order <= MAX_ORDER:
            raise InvalidTileAddress(f"order must be in [0, {MAX_ORDER}]")
        if not 0 <= self.npix < npix_count(self.order):
            raise InvalidTileAddress(f"npix out of range for order {self.order}")
        if not 0 <= self.plane < CUBE_DEPTH:
            raise InvalidTileAddress(f"plane must be in [0, {CUBE_DEPTH - 1}]")

    @classmethod
    def from_path(cls, *, order: int, dir_: int, npix: int, plane: int) -> "HipsTileAddress":
        address = cls(order=order, npix=npix, plane=plane)
        if address.dir != dir_:
            raise InvalidTileAddress(f"dir {dir_} does not match npix {npix}")
        return address

    @property
    def dir(self) -> int:
        return (self.npix // DIR_STEP) * DIR_STEP

    @property
    def path(self) -> str:
        suffix = "" if self.plane == 0 else f"_{self.plane}"
        return f"Norder{self.order}/Dir{self.dir}/Npix{self.npix}{suffix}.png"

    @property
    def cache_key(self) -> str:
        return f"hips:spherex_dr1:{self.path}"
