# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["astropy==8.0.2", "astropy-healpix==1.1.3", "numpy==2.5.4"]
# ///
"""Generate the SPHEREx DR1 order-5 HiPS grid; no scientific pixels are downloaded."""

import argparse
import csv
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from astropy_healpix import HEALPix

ROOT = Path(__file__).resolve().parents[1]
PROPERTIES = ROOT / 'docs' / 'fuentes' / 'spherex-dr1-hips-properties.txt'
PROPERTIES_SHA256 = '65f3bda2c1ba582989da7e2e5324fd8b7ad50823580554aae432be45ae05745f'
FITS_ROOT = 'https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/hips5_cube/hips_20261026'


def load_properties(path: Path) -> dict[str, str]:
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != PROPERTIES_SHA256:
        raise ValueError('Properties checksum mismatch; refusing to mix dataset versions')
    result = {}
    for line in data.decode('utf-8').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            result[key.strip()] = value.strip()
    for key, expected in {'hips_frame': 'equatorial', 'hips_order': '5',
                          'hips_cube_depth': '102', 'obs_collection': 'SPHEREx DR1'}.items():
        if result.get(key) != expected:
            raise ValueError(f'Unexpected {key}: {result.get(key)}')
    wavelengths = result['data_cube_crval3_arr'].split()
    if len(wavelengths) != 102:
        raise ValueError('Expected 102 spectral wavelengths')
    return result


def generate(output: Path, properties: Path) -> None:
    info = load_properties(properties)
    if output.exists():
        raise FileExistsError(f'Output already exists: {output}')
    if not output.parent.is_dir():
        raise FileNotFoundError(f'Parent directory does not exist: {output.parent}')
    grid = HEALPix(nside=32, order='nested', frame='icrs')
    cells = np.arange(grid.npix)
    lon, lat = grid.healpix_to_lonlat(cells)
    vertex_lon, vertex_lat = grid.boundaries_lonlat(cells, step=1)
    with TemporaryDirectory(prefix='.spherex-grid-', dir=output.parent) as temporary:
        stage = Path(temporary) / 'result'
        stage.mkdir()
        csv_path = stage / 'grid.csv'
        with csv_path.open('w', encoding='utf-8', newline='') as file:
            writer = csv.writer(file, lineterminator='\n')
            writer.writerow(['cell', 'ra_deg', 'dec_deg', 'vertex_ra_deg', 'vertex_dec_deg', 'fits_url'])
            for i in cells:
                vertices_ra = ';'.join(f'{value:.12f}' for value in vertex_lon.degree[i])
                vertices_dec = ';'.join(f'{value:.12f}' for value in vertex_lat.degree[i])
                url = f'{FITS_ROOT}/Norder5/Dir{int(i) // 10000 * 10000}/Npix{int(i)}_cube.fits'
                writer.writerow([int(i), f'{lon.degree[i]:.12f}', f'{lat.degree[i]:.12f}', vertices_ra, vertices_dec, url])
        manifest = {
            'dataset': 'SPHEREx DR1 all-sky cube', 'collection_version': 'hips_20261026',
            'frame': 'ICRS/equatorial', 'healpix_ordering': 'nested', 'order': 5,
            'nside': 32, 'cell_count': int(grid.npix), 'spectral_planes': 102,
            'wavelengths_um': [float(value) for value in info['data_cube_crval3_arr'].split()],
            'properties_source': info['hips_service_url'] + '/properties',
            'properties_sha256': PROPERTIES_SHA256,
            'grid_sha256': hashlib.sha256(csv_path.read_bytes()).hexdigest(),
            'limitation': 'Vertices are samples of curved HEALPix boundaries, not straight polygon edges. The cube is an aggregate, not a time series.',
        }
        (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        stage.rename(output)
    print(f'Created {grid.npix} cells in {output}')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True, help='New output directory; must not exist')
    parser.add_argument('--properties', type=Path, default=PROPERTIES)
    args = parser.parse_args()
    try:
        generate(args.output, args.properties)
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f'Error: {error}\n')


if __name__ == '__main__':
    main()
