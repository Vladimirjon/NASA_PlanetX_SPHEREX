import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { WAVELENGTHS } from '../src/engine/core/wavelengths';
it('matches all 102 values in the IRSA properties reference',()=>{
 const file=readFileSync(resolve(process.cwd(),'../docs/fuentes/spherex-dr1-hips-properties.txt'),'utf8');
 const line=file.split('\n').find(row=>row.startsWith('data_cube_crval3_arr'));
 if(!line)throw new Error('Missing wavelength table');
 const expected=line.split('=')[1].trim().split(/\s+/).map(Number);
 expect(WAVELENGTHS).toHaveLength(102);expect(WAVELENGTHS).toEqual(expected);
});
