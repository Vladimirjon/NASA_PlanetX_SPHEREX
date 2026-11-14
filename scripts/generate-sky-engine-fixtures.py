"""Generate deterministic HEALPix reference points for the browser engine."""
import json
from pathlib import Path
import numpy as np
import astropy.units as u
from astropy_healpix import HEALPix

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
