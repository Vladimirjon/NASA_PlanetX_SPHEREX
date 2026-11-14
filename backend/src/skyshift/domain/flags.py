"""SPHEREx L2 FLAGS bits used for comparing epochs (D12 §3, ES Table 16).

COMPARE_MASK = cube rejection list + OVERFLOW + GHOST*. SOURCE (21) is never masked (it is
the star we want to see); OUTLIER (19) is reported as a separate layer because a moving or
new object can be flagged as an outlier — masking it would erase a real change.
"""

import numpy as np
import numpy.typing as npt

MASKED_BITS = (0, 1, 2, 6, 7, 9, 10, 11, 14, 15, 17, 20, 22, 23, 24, 25, 26, 27, 28, 29)
COMPARE_MASK = sum(1 << b for b in MASKED_BITS)
OUTLIER_BIT = 19
SOURCE_BIT = 21

BoolArray = npt.NDArray[np.bool_]


def comparison_mask(flags: npt.NDArray[np.integer]) -> tuple[BoolArray, BoolArray]:
    """Return (masked, outlier) boolean arrays. FLAGS is int32: widen before bit tests."""
    wide = flags.astype(np.int64) & 0xFFFFFFFF
    masked = (wide & COMPARE_MASK) != 0
    outlier = (wide & (1 << OUTLIER_BIT)) != 0
    return masked, outlier
