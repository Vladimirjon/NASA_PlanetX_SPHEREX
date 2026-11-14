export interface Target { readonly name:string; readonly ra:number; readonly dec:number; readonly epoch:string }
// Reference ICRS epochs and sources: docs/context/12-mapa-de-datos-spherex.md §7 (Gaia DR3; WISE: Luhman & Esplin 2016).
export const TARGETS: readonly Target[] = [
  {name:"Barnard's Star",ra:269.44850253,dec:4.73942005,epoch:'J2016.0'},
  {name:'Epsilon Indi B',ra:331.07645260,dec:-56.79381207,epoch:'J2016.0'},
  {name:'WISE 0855−0714',ra:133.7952573,dec:-7.2450910,epoch:'2010.34'},
  {name:'RW Aurigae',ra:76.95608120,dec:30.40120459,epoch:'J2016.0'},
  {name:'R Draconis',ra:248.16737837,dec:66.75500675,epoch:'J2016.0'},
];
export function parseTarget(input:string): {ra:number;dec:number}|null {
 const normalized=input.trim().replaceAll('−','-');
 const target=TARGETS.find(t=>t.name.replaceAll('−','-').toLowerCase()===normalized.toLowerCase());
 if(target) return {ra:target.ra,dec:target.dec};
 const parts=normalized.split(/[\s,]+/);if(parts.length!==2)return null;
 function angle(raw:string,hours:boolean):number {
   const values=raw.split(':');if(values.some(v=>v.trim()===''))return NaN;
   if(values.length===1)return Number(values[0]);
   if(values.length!==3)return NaN;
   const [a,m,s]=values.map(Number);if(!Number.isFinite(a)||!Number.isFinite(m)||!Number.isFinite(s)||m<0||m>=60||s<0||s>=60||a<0&&hours)return NaN;
   const sign=raw.startsWith('-')?-1:1;return sign*(Math.abs(a)+m/60+s/3600)*(hours?15:1);
 }
 const ra=angle(parts[0],parts[0].includes(':')),dec=angle(parts[1],false);
 return Number.isFinite(ra)&&Number.isFinite(dec)&&ra>=0&&ra<360&&dec>=-90&&dec<=90?{ra,dec}:null;
}
