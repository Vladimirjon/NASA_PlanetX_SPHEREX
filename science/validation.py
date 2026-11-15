"""Evidence-aware numerical helpers; these do not certify discoveries."""

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, timedelta
from math import erfc, exp, isclose, isfinite, sqrt
from typing import Literal

CheckStatus = Literal["pass", "fail", "warning", "unknown"]
REQUIRED_CHECKS = frozenset(
    {
        "identity",
        "time",
        "target",
        "coverage",
        "alignment",
        "quality",
        "uncertainty",
        "spectral_compatibility",
        "method",
    }
)


@dataclass(frozen=True)
class Check:
    status: CheckStatus
    value: float | None
    reason: str


@dataclass(frozen=True)
class AstrometricTest:
    statistic: float
    p_value: float


@dataclass(frozen=True)
class FluxDifference:
    difference: float
    uncertainty: float
    significance: float


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
    assert p_value is not None and sigma_threshold is not None
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


def _finite_number(value: object) -> bool:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return False
    try:
        return isfinite(value)
    except OverflowError:
        return False


def check_signal_to_noise(snr: float | None, threshold: float | None) -> Check:
    """Apply a supplied detection policy without claiming object identity."""
    if not _finite_number(snr) or not _positive_number(threshold):
        return Check(
            "unknown",
            None,
            "A finite SNR and explicit positive threshold are required.",
        )
    assert snr is not None and threshold is not None
    if snr < threshold:
        return Check(
            "fail", float(snr), "Signal is below the supplied detection threshold."
        )
    return Check(
        "pass",
        float(snr),
        "Threshold met; source identity and quality remain separate controls.",
    )


def check_flags(observed: set[str] | None, policy: Mapping[str, set[str]]) -> Check:
    """Interpret flag names only under an explicit method-specific policy."""
    if observed is None or not isinstance(observed, set):
        return Check("unknown", None, "Pixel flags have not been inspected.")
    blocked, warning, neutral = (
        policy.get(key) for key in ("blocked", "warning", "neutral")
    )
    if not all(isinstance(group, set) for group in (blocked, warning, neutral)):
        return Check("unknown", None, "The flag policy is incomplete.")
    assert blocked is not None and warning is not None and neutral is not None
    if (blocked & warning) or (blocked & neutral) or (warning & neutral):
        return Check(
            "unknown", None, "The flag policy contains conflicting classifications."
        )
    if observed & blocked:
        return Check("fail", None, "A flag disallowed by this method is present.")
    if observed - (blocked | warning | neutral):
        return Check("unknown", None, "At least one observed flag has no policy.")
    if observed & warning:
        return Check("warning", None, "A flag requiring attention is present.")
    return Check("pass", None, "No disallowed or unexplained flags were supplied.")


def flux_difference(
    flux_a: float | None,
    flux_b: float | None,
    sigma_a: float | None,
    sigma_b: float | None,
    covariance: float | None,
) -> FluxDifference | None:
    """Calculate a difference with explicit cross-epoch covariance in matching units."""
    if not all(_finite_number(value) for value in (flux_a, flux_b, covariance)):
        return None
    if not _positive_number(sigma_a) or not _positive_number(sigma_b):
        return None
    assert flux_a is not None and flux_b is not None
    assert sigma_a is not None and sigma_b is not None and covariance is not None
    try:
        if abs(covariance) > sigma_a * sigma_b:
            return None
        variance = sigma_a**2 + sigma_b**2 - 2 * covariance
        if not isfinite(variance) or variance <= 0:
            return None
        difference = flux_b - flux_a
        uncertainty = sqrt(variance)
        if not isfinite(difference):
            return None
        significance = abs(difference) / uncertainty
        if not isfinite(significance):
            return None
        return FluxDifference(difference, uncertainty, significance)
    except (OverflowError, ZeroDivisionError):
        return None


def check_observation_identity(
    a: Mapping[str, object], b: Mapping[str, object]
) -> Check:
    """Check known product identities and UTC times, without inferring missing fields."""
    required = ("product_id", "acquisition_id", "identity_status", "midpoint_utc")
    if any(
        not isinstance(item.get(key), str) or not item[key].strip()
        for item in (a, b)
        for key in required
    ):
        return Check(
            "unknown",
            None,
            "Product, acquisition, identity status and UTC time are required.",
        )
    if a["identity_status"] != "resolved" or b["identity_status"] != "resolved":
        return Check("unknown", None, "Both product identities must be resolved.")
    if a["product_id"] == b["product_id"] or a["acquisition_id"] == b["acquisition_id"]:
        return Check(
            "fail", None, "Two distinct products and acquisitions are required."
        )
    try:
        dates = [datetime.fromisoformat(str(item["midpoint_utc"])) for item in (a, b)]
        if any(
            date.tzinfo is None or date.utcoffset() != timedelta(0) for date in dates
        ):
            return Check("unknown", None, "Observation times must explicitly be UTC.")
        if dates[0] == dates[1]:
            return Check("fail", None, "The observation times are identical.")
    except (ValueError, OverflowError):
        return Check("unknown", None, "Observation times are invalid.")
    return Check(
        "pass",
        abs((dates[1] - dates[0]).total_seconds()),
        "Distinct acquisitions and UTC times are documented.",
    )


def spectral_check(
    wavelength_a: float | None,
    wavelength_b: float | None,
    bandwidth_a: float | None,
    bandwidth_b: float | None,
    threshold: float | None,
) -> Check:
    """Apply an explicit prefilter; a pass never establishes spectral equivalence."""
    values = (wavelength_a, wavelength_b, bandwidth_a, bandwidth_b)
    threshold_valid = _positive_number(threshold) or (
        isinstance(threshold, (int, float))
        and not isinstance(threshold, bool)
        and threshold == 0
    )
    if not all(_positive_number(value) for value in values) or not threshold_valid:
        return Check(
            "unknown",
            None,
            "Finite positive wavelengths and bandwidths and a non-negative threshold are required.",
        )
    assert wavelength_a is not None and wavelength_b is not None
    assert bandwidth_a is not None and bandwidth_b is not None and threshold is not None
    ratio = abs(wavelength_a - wavelength_b) / min(bandwidth_a, bandwidth_b)
    if not isfinite(ratio):
        return Check(
            "unknown", None, "The normalized difference could not be computed safely."
        )
    if ratio > threshold:
        return Check(
            "fail",
            ratio,
            "The pair exceeds the explicitly supplied spectral prefilter.",
        )
    return Check("pass", ratio, "This filter does not establish spectral equivalence.")


def aggregate_checks(
    checks: Mapping[str, str], *, stage: str = "preselection"
) -> Literal["pending", "rejected", "eligible_for_method"]:
    """Require every named control; a warning cannot silently become approval."""
    if any(status == "fail" for status in checks.values()):
        return "rejected"
    if stage != "prepared" or not REQUIRED_CHECKS.issubset(checks):
        return "pending"
    if any(status != "pass" for status in checks.values()):
        return "pending"
    return "eligible_for_method"


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
            isinstance(v, bool) or not isinstance(v, (int, float)) or not isfinite(v)
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
