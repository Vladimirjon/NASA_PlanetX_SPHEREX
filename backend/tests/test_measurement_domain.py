# pyright: basic
# Reason: astropy.wcs ships no type stubs (same convention as test_build_series.py).
"""Spec 0010 / plan 0011: measurement domain on SYNTHETIC images (is_synthetic; never real data)."""

import math

import numpy as np
import pytest
from astropy.wcs import WCS

from skyshift.domain.measurement.astrometry import (
    add_isotropic,
    fit_centroid,
    pixel_to_sky,
    tangent_offset_arcsec,
)
from skyshift.domain.measurement.criteria import InvalidCriteria, MeasurementCriteria, Threshold
from skyshift.domain.measurement.motion_fit import EpochOffset, MotionFitError, fit_proper_motion
from skyshift.domain.significance import astrometric_p_value, equivalent_sigma_two_sided

PIXEL_ARCSEC = 6.15
TEST_CRITERIA = MeasurementCriteria(
    reference="TEST values (synthetic fixtures only)",
    min_snr_per_exposure=Threshold(5.0, "test"),
    min_significance_sigma_two_sided=Threshold(5.0, "test"),
    sigma_wcs_arcsec_per_axis=Threshold(0.3, "test"),
    flag_radius_px=Threshold(2.5, "test"),
)


def tan_wcs(ra: float = 331.0, dec: float = -56.8, crpix: tuple[float, float] = (11, 11)) -> WCS:
    w = WCS(naxis=2)
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.crval = [ra, dec]
    w.wcs.crpix = list(crpix)
    w.wcs.cdelt = [-PIXEL_ARCSEC / 3600, PIXEL_ARCSEC / 3600]
    return w


def scene(
    x: float, y: float, *, amp: float = 1000.0, fwhm: float = 1.2, noise: float = 0.0, seed: int = 0
) -> tuple[np.ndarray, np.ndarray]:
    """21x21 synthetic SPHEREx-like stamp: circular Gaussian PSF on a flat background."""
    sigma = fwhm / (2 * math.sqrt(2 * math.log(2)))
    yy, xx = np.mgrid[0:21, 0:21].astype(np.float64)
    img = amp * np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * sigma**2)) + 10.0
    var = np.full_like(img, max(noise, 1.0) ** 2)
    if noise > 0:
        img = img + np.random.default_rng(seed).normal(0.0, noise, img.shape)
    return img, var


ALL = np.ones((21, 21), dtype=bool)


def test_criteria_have_no_defaults():
    with pytest.raises(TypeError):
        MeasurementCriteria(  # type: ignore[call-arg]  # missing thresholds must fail (task 2)
            reference="x",
            min_snr_per_exposure=Threshold(5, "s"),
        )
    with pytest.raises(InvalidCriteria):
        Threshold(5.0, "  ")
    with pytest.raises(InvalidCriteria):
        Threshold(float("nan"), "s")


def test_chi2_threshold_is_computed_not_rounded():
    # Sebastián, 2nd message: p = 5.7330314376e-7 and Q = 28.7437024269 for 5sigma two-sided.
    assert TEST_CRITERIA.p_threshold == pytest.approx(5.7330314376e-7, rel=1e-9)
    assert TEST_CRITERIA.q_threshold_2dof == pytest.approx(28.7437024269, rel=1e-10)
    assert equivalent_sigma_two_sided(TEST_CRITERIA.p_threshold) == pytest.approx(5.0, rel=1e-9)
    assert equivalent_sigma_two_sided(0.0) is None


def test_t13_covariance_changes_the_statistic():
    delta = (1.0, 1.0)
    corr = 0.8
    cov = ((1.0, corr), (corr, 1.0))
    test = astrometric_p_value(delta, cov)
    assert test is not None
    by_hand = float(np.array(delta) @ np.linalg.inv(np.array(cov)) @ np.array(delta))
    assert test.statistic == pytest.approx(by_hand)
    assert test.statistic != pytest.approx(2.0)  # what independent errors would give
    assert test.statistic != pytest.approx(math.hypot(*delta) ** 2)  # not separation/sigma squared
    assert test.p_value == pytest.approx(math.exp(-by_hand / 2))


def test_t1_identical_images_give_zero_offset():
    img, var = scene(10.3, 9.7)
    a = fit_centroid(img, var, ALL, (10, 10))
    b = fit_centroid(img, var, ALL, (10, 10))
    assert a is not None
    assert b is not None
    assert (a.x, a.y) == pytest.approx((b.x, b.y), abs=1e-9)
    assert (a.x, a.y) == pytest.approx((10.3, 9.7), abs=1e-4)


def test_t2_measured_in_the_sky_not_in_pixels():
    # Same star; image B's WCS is shifted 2 px and the star sits 2 px further in pixels.
    w_a, w_b = tan_wcs(crpix=(11, 11)), tan_wcs(crpix=(13, 11))
    a_img, var = scene(10.0, 10.0)
    b_img, _ = scene(12.0, 10.0)
    ca = fit_centroid(a_img, var, ALL, (10, 10))
    cb = fit_centroid(b_img, var, ALL, (12, 10))
    assert ca is not None
    assert cb is not None
    ra_a, dec_a, _ = pixel_to_sky(w_a, ca.x, ca.y, ca.cov_px)
    ra_b, dec_b, _ = pixel_to_sky(w_b, cb.x, cb.y, cb.cov_px)
    xi, eta = tangent_offset_arcsec(ra_b, dec_b, ra_a, dec_a)
    assert math.hypot(xi, eta) == pytest.approx(0.0, abs=1e-3)
    assert cb.x - ca.x == pytest.approx(2.0, abs=1e-4)


def test_t3_one_pixel_shift_is_6_15_arcsec():
    w = tan_wcs()
    a_img, var = scene(10.0, 10.0)
    b_img, _ = scene(11.0, 10.0)
    ca = fit_centroid(a_img, var, ALL, (10, 10))
    cb = fit_centroid(b_img, var, ALL, (11, 10))
    assert ca is not None
    assert cb is not None
    ra_a, dec_a, _ = pixel_to_sky(w, ca.x, ca.y, ca.cov_px)
    ra_b, dec_b, _ = pixel_to_sky(w, cb.x, cb.y, cb.cov_px)
    xi, eta = tangent_offset_arcsec(ra_b, dec_b, ra_a, dec_a)
    assert math.hypot(xi, eta) == pytest.approx(PIXEL_ARCSEC, abs=0.01)


def test_noisy_centroid_has_positive_honest_uncertainty():
    errs: list[float] = []
    for seed in range(40):
        img, var = scene(10.25, 9.6, amp=300.0, noise=5.0, seed=seed)
        c = fit_centroid(img, var, ALL, (10, 10))
        assert c is not None
        assert c.cov_px[0][0] > 0
        assert c.cov_px[1][1] > 0
        assert c.snr > 5
        errs.append((c.x - 10.25) / math.sqrt(c.cov_px[0][0]))
    # Pull distribution: the declared sigma must not be badly underestimated.
    assert float(np.std(errs)) < 1.5


def test_too_few_good_pixels_returns_none():
    img, var = scene(10, 10)
    usable = np.zeros((21, 21), dtype=bool)
    assert fit_centroid(img, var, usable, (10, 10)) is None


def test_sky_covariance_scales_with_pixel_size():
    w = tan_wcs()
    _, _, cov = pixel_to_sky(w, 10.0, 10.0, ((0.01, 0.0), (0.0, 0.01)))
    assert math.sqrt(cov[0][0]) == pytest.approx(0.1 * PIXEL_ARCSEC, rel=1e-3)
    assert math.sqrt(cov[1][1]) == pytest.approx(0.1 * PIXEL_ARCSEC, rel=1e-3)
    total = add_isotropic(cov, 0.3)
    assert total[0][0] == pytest.approx(cov[0][0] + 0.09)


def test_motion_fit_recovers_injected_proper_motion():
    pm = (3.98, -2.47)  # arcsec/yr, shape of the eps Ind B case but SYNTHETIC
    cov = ((0.09, 0.0), (0.0, 0.09))
    epochs = [
        EpochOffset(t, pm[0] * (t - 2025.0), pm[1] * (t - 2025.0), cov)
        for t in (2025.3, 2025.8, 2026.3, 2026.7)
    ]
    fit = fit_proper_motion(epochs)
    assert (fit.pm_xi_arcsec_yr, fit.pm_eta_arcsec_yr) == pytest.approx(pm, abs=1e-9)
    assert fit.dof == 4
    assert not fit.scaled
    test = astrometric_p_value((fit.pm_xi_arcsec_yr, fit.pm_eta_arcsec_yr), fit.cov_pm)
    assert test is not None
    assert test.statistic > TEST_CRITERIA.q_threshold_2dof


def test_motion_fit_inflates_when_residuals_exceed_errors():
    rng = np.random.default_rng(3)
    cov = ((0.01, 0.0), (0.0, 0.01))
    noise = rng.normal(0, 0.5, (10, 2))
    epochs = [
        EpochOffset(2025 + 0.1 * i, float(noise[i, 0]), float(noise[i, 1]), cov) for i in range(10)
    ]
    assert fit_proper_motion(epochs).scaled


def test_motion_fit_needs_two_epochs():
    with pytest.raises(MotionFitError):
        fit_proper_motion([EpochOffset(2025.0, 0, 0, ((1, 0), (0, 1)))])
