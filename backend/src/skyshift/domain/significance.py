"""2D chi-square test of a displacement and the two-sided sigma policy.

`AstrometricTest`, `astrometric_p_value` and `compare_significance` are Sebastián's code
(science/validation.py, branch scientific-rules, commit 34640f6), moved here unchanged so the
backend has ONE implementation (spec 0010 §0, condition A6). When PR #9 lands, its
science/validation.py should import these instead of keeping a copy (coordinate with
Sebastián and Johann). `equivalent_sigma_two_sided` is new: z = Φ⁻¹(1 - p/2), never √Q.
"""

from dataclasses import dataclass
from math import erfc, exp, isclose, isfinite, sqrt
from statistics import NormalDist
from typing import Literal


@dataclass(frozen=True)
class AstrometricTest:
    statistic: float
    p_value: float


def compare_significance(
    p_value: float | None, sigma_threshold: float | None, trials: int | None
) -> Literal["above_threshold", "below_threshold", "unknown"]:
    """Compare a single-test p-value with an explicit two-sided Gaussian policy.

    Bonferroni's correction uses the supplied number of tests; callers must
    validate the null model and account for selection before using the result.
    """
    if not _positive_number(p_value) or not _positive_number(sigma_threshold):
        return "unknown"
    if not isinstance(trials, int) or isinstance(trials, bool) or trials < 1:
        return "unknown"
    assert p_value is not None and sigma_threshold is not None  # noqa: PT018 - kept verbatim
    if p_value > 1:
        return "unknown"
    try:
        cutoff = erfc(sigma_threshold / sqrt(2))
        if cutoff == 0:
            return "unknown"
        return "above_threshold" if p_value <= cutoff / trials else "below_threshold"
    except (OverflowError, ZeroDivisionError):
        return "unknown"


def _positive_number(value: object) -> bool:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return False
    try:
        return isfinite(value) and value > 0
    except OverflowError:
        return False


def astrometric_p_value(
    delta: tuple[float, float],
    covariance: tuple[tuple[float, float], tuple[float, float]],
) -> AstrometricTest | None:
    """Return the 2D Gaussian null statistic and tail probability, if well-defined.

    Caller supplies displacement in arcseconds and covariance in arcseconds squared.
    No decision about the validity of that model or the sky source is made here.
    """
    try:
        x, y = delta
        (a, b), (c, d) = covariance
        values = (x, y, a, b, c, d)
        if any(
            isinstance(v, bool) or not isinstance(v, (int, float)) or not isfinite(v)  # pyright: ignore[reportUnnecessaryIsInstance] - verbatim runtime guard
            for v in values
        ):
            return None
        if not isclose(b, c, rel_tol=1e-12, abs_tol=1e-15) or a <= 0 or d <= 0:
            return None
        determinant = a * d - b * c
        if not isfinite(determinant) or determinant <= 0:
            return None
        statistic = (d * x * x - (b + c) * x * y + a * y * y) / determinant
        if not isfinite(statistic) or statistic < 0:
            return None
        return AstrometricTest(statistic, exp(-statistic / 2))
    except (TypeError, ValueError, OverflowError):
        return None


def equivalent_sigma_two_sided(p_value: float) -> float | None:
    """z with the same two-sided Gaussian tail: z = Φ⁻¹(1 - p/2). None if p underflows to 0."""
    if not 0 < p_value <= 1:
        return None
    return -NormalDist().inv_cdf(p_value / 2)
