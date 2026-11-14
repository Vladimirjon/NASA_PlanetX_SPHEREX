# /// script
# requires-python = ">=3.13"
# dependencies = ["astropy==8.0.2", "astropy-healpix==1.1.3", "numpy==2.5.4"]
# ///
"""Generate deterministic HEALPix reference points for the browser engine."""
import json
from pathlib import Path
import numpy as np
import astropy.units as u
from astropy_healpix import HEALPix
from astropy.wcs import WCS

rng = np.random.default_rng(1842)
rows = []
for order in range(6):
    hp = HEALPix(nside=2**order, order="nested")
    lon = rng.uniform(0, 360, 200)
    lat = np.degrees(np.arcsin(rng.uniform(-1, 1, 200)))
    pixels = hp.lonlat_to_healpix(lon * u.deg, lat * u.deg)
    for a, d, pixel in zip(lon, lat, pixels, strict=True):
        rows.append([order, float(a), float(d), int(pixel)])
Path('frontend/tests/fixtures/healpix.json').write_text(json.dumps(rows, separators=(',', ':')) + '\n', encoding='utf-8')

# One million reproducible angles at maximum order; packed uint16 keeps the
# reference fixture small enough for the repository.
seed = 1842
ras = np.empty(1_000_000, dtype=np.float64)
decs = np.empty(1_000_000, dtype=np.float64)
for i in range(1_000_000):
    seed = (1664525 * seed + 1013904223) & 0xFFFFFFFF
    ras[i] = seed / 2**32 * 360
    seed = (1664525 * seed + 1013904223) & 0xFFFFFFFF
    decs[i] = seed / 2**32 * 180 - 90
pixels = HEALPix(nside=32, order="nested").lonlat_to_healpix(ras * u.deg, decs * u.deg)
Path('frontend/tests/fixtures/healpix-million.bin').write_bytes(pixels.astype('<u2').tobytes())
centers = HEALPix(nside=32, order="nested").healpix_to_lonlat(np.arange(12288))
np.column_stack((centers[0].degree, centers[1].degree)).astype('<f8').tofile('frontend/tests/fixtures/healpix-centers.bin')
reference = []
hp = HEALPix(nside=32, order='nested')
for index in [0, 1, 445, 1023, 1024, 4095, 4096, 8191, 10226, 12287]:
    lon, lat = hp.boundaries_lonlat(index, step=1)
    reference.append({'pixel': index, 'corners': np.column_stack((lon.degree.ravel(), lat.degree.ravel())).tolist(), 'neighbours': [int(x) for x in hp.neighbours(index) if x >= 0]})
Path('frontend/tests/fixtures/healpix-boundaries.json').write_text(json.dumps(reference, separators=(',', ':')) + '\n', encoding='utf-8')
import warnings
with warnings.catch_warnings():
    warnings.simplefilter('ignore', RuntimeWarning)
    all_neighbours = hp.neighbours(np.arange(12288)).T.astype('<i2')
Path('frontend/tests/fixtures/healpix-neighbours.bin').write_bytes(all_neighbours.tobytes())

# ICRS positions obtained from independent FITS WCS with east to the left.
wcs_samples = []
for projection in ("SIN", "TAN", "AIT"):
    for ra0, dec0 in ((10., 20.), (359.9, 0.), (30., 89.), (125., -89.)):
        wcs = WCS(naxis=2)
        wcs.wcs.ctype = [f"RA---{projection}", f"DEC--{projection}"]
        wcs.wcs.crval = [ra0, dec0]
        wcs.wcs.crpix = [1., 1.]
        wcs.wcs.cdelt = [-1., 1.]
        for px, py in ((1., 0.), (-1., 0.), (0., 1.), (0., -1.), (1., 1.)):
            ra, dec = wcs.all_pix2world([[px, py]], 0)[0]
            wcs_samples.append({"projection": projection, "center": [ra0, dec0], "pixel": [px, py], "sky": [ra, dec]})
Path('frontend/tests/fixtures/wcs-orientation.json').write_text(json.dumps(wcs_samples, separators=(',', ':')) + '\n', encoding='utf-8')
