export function coordinates(ra: number, dec: number): string {
  const normalized=((ra%360)+360)%360;
  const ticks=Math.round(normalized/15*36000)%864000;
  const h=Math.floor(ticks/36000),m=Math.floor(ticks/600)%60,s=(ticks%600)/10;
  const dticks=Math.round(Math.abs(dec)*36000),d=Math.floor(dticks/36000),dm=Math.floor(dticks/600)%60,ds=(dticks%600)/10;
  const pad=(value:number):string=>String(value).padStart(2,'0');
  const sec=(value:number):string=>value.toFixed(1).padStart(4,'0');
  const decimalRa=(Math.round(normalized*100000)%36000000)/100000;
  return `${pad(h)}h ${pad(m)}m ${sec(s)}s  ${dec<0 || Object.is(dec,-0)?'−':'+'}${pad(d)}° ${pad(dm)}′ ${sec(ds)}″  (${decimalRa.toFixed(5)}°, ${dec.toFixed(5)}°)`;
}
