"""Measurement criteria (spec 0010 §0 and §4, Sebastián 14-nov). No defaults anywhere.

Every threshold carries its source. A missing threshold is a construction error, never a
silent fallback: the science role decides the numbers, the code only applies them.
"""

import math
from dataclasses import dataclass


class InvalidCriteria(ValueError):
    """Raised when a threshold is missing, non-finite, non-positive or has no source."""


@dataclass(frozen=True, slots=True)
class Threshold:
    value: float
    source: str

    def __post_init__(self) -> None:
        if not math.isfinite(self.value) or self.value <= 0:
            raise InvalidCriteria(f"threshold must be finite and > 0, got {self.value}")
        if not self.source.strip():
            raise InvalidCriteria("every threshold needs a source")


@dataclass(frozen=True, slots=True)
class MeasurementCriteria:
    reference: str  # where these numbers come from, e.g. "Sebastián, 14-nov-2026, provisional"
    min_snr_per_exposure: Threshold  # R11
    min_significance_sigma_two_sided: Threshold  # R12
    sigma_wcs_arcsec_per_axis: Threshold  # §4.3, provisional (A5)
    flag_radius_px: Threshold  # R7, IRSA CONTAINS_BAD_PIXEL radius

    def __post_init__(self) -> None:
        if not self.reference.strip():
            raise InvalidCriteria("criteria need a reference")

    @property
    def p_threshold(self) -> float:
        """Two-sided Gaussian tail of the sigma policy: p = erfc(sigma/√2) (0032 §3.3)."""
        return math.erfc(self.min_significance_sigma_two_sided.value / math.sqrt(2))

    @property
    def q_threshold_2dof(self) -> float:
        """Chi-square (2 dof) statistic with that tail: Q = -2 ln p. Computed, never rounded."""
        return -2.0 * math.log(self.p_threshold)
