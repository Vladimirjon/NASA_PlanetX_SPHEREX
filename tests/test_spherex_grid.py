import csv
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import hpgeom
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts' / 'generate-spherex-grid.py'
PROPERTIES = ROOT / 'docs' / 'fuentes' / 'spherex-dr1-hips-properties.txt'


class GridTest(unittest.TestCase):
    def test_complete_grid_reproducible(self):
        with tempfile.TemporaryDirectory() as temp:
            outputs = [Path(temp) / 'one', Path(temp) / 'two']
            for output in outputs:
                subprocess.run([sys.executable, str(SCRIPT), '--output', str(output)], check=True)
            first = (outputs[0] / 'grid.csv').read_bytes()
            self.assertEqual(first, (outputs[1] / 'grid.csv').read_bytes())
            manifest = json.loads((outputs[0] / 'manifest.json').read_text(encoding='utf-8'))
            self.assertEqual(manifest['grid_sha256'], hashlib.sha256(first).hexdigest())
            self.assertEqual(manifest['cell_count'], 12288)
            self.assertEqual(manifest['spectral_planes'], 102)
            with (outputs[0] / 'grid.csv').open(encoding='utf-8', newline='') as f:
                rows = list(csv.DictReader(f))
            self.assertEqual(len(rows), 12288)
            # Official HpxFinder centers, rounded to 6 decimal degrees by IRSA.
            for cell, (ra, dec) in {0: (45.0, 1.193748), 445: (60.576923, 51.255807),
                                    10226: (133.59375, -7.180756), 12287: (315.0, -1.193748)}.items():
                self.assertAlmostEqual(float(rows[cell]['ra_deg']), ra, delta=0.000001)
                self.assertAlmostEqual(float(rows[cell]['dec_deg']), dec, delta=0.000001)
                self.assertEqual(len(rows[cell]['vertex_ra_deg'].split(';')), 4)
                self.assertEqual(len(rows[cell]['vertex_dec_deg'].split(';')), 4)
            official_vertices = [(61.2, 52.801854), (58.846154, 51.255807),
                                 (60.0, 49.702390), (62.307692, 51.255807)]
            actual_vertices = zip(map(float, rows[445]['vertex_ra_deg'].split(';')),
                                  map(float, rows[445]['vertex_dec_deg'].split(';')))
            for (actual_ra, actual_dec), (expected_ra, expected_dec) in zip(actual_vertices, official_vertices):
                self.assertAlmostEqual(actual_ra, expected_ra, delta=0.000001)
                self.assertAlmostEqual(actual_dec, expected_dec, delta=0.000001)
            ra = np.array([float(row['ra_deg']) for row in rows])
            dec = np.array([float(row['dec_deg']) for row in rows])
            self.assertTrue(np.array_equal(hpgeom.angle_to_pixel(32, ra, dec, nest=True, lonlat=True), np.arange(12288)))
            self.assertEqual([int(r['cell']) for r in rows], list(range(12288)))
            self.assertTrue(rows[445]['fits_url'].endswith('/Norder5/Dir0/Npix445_cube.fits'))
            self.assertTrue(rows[10226]['fits_url'].endswith('/Norder5/Dir10000/Npix10226_cube.fits'))
            self.assertTrue(all(-90 <= float(r['dec_deg']) <= 90 for r in rows))
            self.assertTrue(all(0 <= float(r['ra_deg']) < 360 for r in rows))
            self.assertEqual((outputs[0] / 'manifest.json').read_bytes(), (outputs[1] / 'manifest.json').read_bytes())

    def test_reject_existing_output_and_altered_properties(self):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / 'out'
            out.mkdir()
            result = subprocess.run([sys.executable, str(SCRIPT), '--output', str(out)], capture_output=True, check=False)
            self.assertNotEqual(result.returncode, 0)
            fake = Path(temp) / 'fake.txt'
            fake.write_bytes(PROPERTIES.read_bytes() + b'\n# changed')
            result = subprocess.run([sys.executable, str(SCRIPT), '--output', str(Path(temp) / 'bad'), '--properties', str(fake)], capture_output=True, check=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((Path(temp) / 'bad').exists())


if __name__ == '__main__':
    unittest.main()
