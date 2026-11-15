"""Injection helpers and calibration link rule (spec 0036), on SYNTHETIC data only."""

import math

import numpy as np
import pytest

from skyshift.adapters.s3_spectral_wcs import VERSION
from skyshift.domain.measurement.astrometry import fit_centroid
from skyshift.domain.measurement.injection import gaussian_stamp, recovery_stats


def test_pixel_integrated_stamp_conserves_flux_and_centre():
    stamp = gaussian_stamp((41, 41), 20.3, 19.6, 1000.0, 1.2, 1.2)
    assert float(stamp.sum()) == pytest.approx(1000.0, rel=1e-4)
    yy, xx = np.mgrid[0:41, 0:41]
    # Undersampled PSF (sigma ~0.5 px): the discrete first moment aliases by ~0.002 px.
    assert float((stamp * xx).sum() / stamp.sum()) == pytest.approx(20.3, abs=5e-3)
    assert float((stamp * yy).sum() / stamp.sum()) == pytest.approx(19.6, abs=5e-3)


def test_injected_source_is_recovered_on_flat_noise():
    rng = np.random.default_rng(7)
    errors: list[tuple[float, float]] = []
    sigmas: list[tuple[float, float]] = []
    for _ in range(60):
        x0, y0 = 20 + rng.uniform(-0.5, 0.5), 20 + rng.uniform(-0.5, 0.5)
        img = rng.normal(0.0, 1.0, (41, 41)) + gaussian_stamp((41, 41), x0, y0, 400.0, 1.2, 1.2)
        fit = fit_centroid(img, np.ones((41, 41)), np.ones((41, 41), dtype=bool), (20, 20))
        assert fit is not None
        errors.append((fit.x - x0, fit.y - y0))
        sigmas.append((math.sqrt(fit.cov_px[0][0]), math.sqrt(fit.cov_px[1][1])))
    st = recovery_stats(errors, sigmas, 60)
    assert st is not None
    assert abs(st.bias_x_px) < 0.02
    assert abs(st.bias_y_px) < 0.02
    assert st.catastrophic_fraction == 0.0
    assert 0.6 < st.robust_pull_x < 1.6  # pixel-integrated vs point model: near-honest errors


def test_robust_metrics_separate_catastrophic_captures():
    errors = [(0.01, -0.01)] * 18 + [(2.0, 0.0), (-1.5, 1.0)]
    sigmas = [(0.01, 0.01)] * 20
    st = recovery_stats(errors, sigmas, 20)
    assert st is not None
    assert st.catastrophic_fraction == pytest.approx(0.1)
    assert st.robust_sigma_x_px < 0.05  # the core is untouched by the two captures
    assert st.std_x_px > 0.4  # the plain std is not
    assert recovery_stats(errors[:2], sigmas[:2], 2) is None


def test_calibration_version_regex_keeps_the_full_name():
    text = (
        "<Key>dr1/spectral_wcs/cal-swcs-v5-2026-191/3/"
        "spectral_wcs_D3_spx_cal-swcs-v5-2026-191.fits</Key>"
    )
    assert set(VERSION.findall(text)) == {"cal-swcs-v5-2026-191"}
