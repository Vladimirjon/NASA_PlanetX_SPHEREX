import { expect, it } from 'vitest';
import { parseTarget } from '../src/engine/core/camera/targets';
it('accepts a known target, decimal degrees and sexagesimal coordinates', () => {
 expect(parseTarget('WISE 0855−0714')).toEqual({ra:133.7952573,dec:-7.245091});
 expect(parseTarget('133.7951 -7.2451')).toEqual({ra:133.7951,dec:-7.2451});
 const point=parseTarget('08:55:10.8 -07:14:42');
 expect(point?.ra).toBeCloseTo(133.795,5);expect(point?.dec).toBeCloseTo(-7.245,5);
});
it('rejects out of range coordinates and unknown names',()=>{
 expect(parseTarget('360 0')).toBeNull();expect(parseTarget('10 91')).toBeNull();expect(parseTarget('Unknown')).toBeNull();
});
