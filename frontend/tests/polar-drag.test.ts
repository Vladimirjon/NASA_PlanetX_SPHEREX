import { it } from 'vitest';
import { drag }  from '../src/engine/core/camera/camera';
import { pointAt, screenAt } from '../src/engine/core/tiles/selection';
import { DEFAULT_VIEW, type Projection } from '../src/engine/view-state';
it('prevents sudden jumps during small continuous wide-field drags near the poles', () => {
 let worst=0, info='';
 for (const proj of ['SIN','AIT'] as Projection[]) for (const dec of [-89,-80,0,80,89]) for (const x of [200,300,400,500,600]) for(const y of [100,200,300,400,500]) {
  const start={...DEFAULT_VIEW,ra:10,dec,proj,fov:proj==='AIT'?360:180}; const grab=pointAt(start,x,y,800,600); if(!grab)continue; let v=start;
  for(let i=1;i<=80;i++){const next=drag(v,x+(i-1)*2,y+(i-1),x+i*2,y+i,800,600); const p=screenAt(v,v.ra,v.dec,800,600), q=screenAt(next,v.ra,v.dec,800,600); const distance=p&&q?Math.hypot(p.x-q.x,p.y-q.y):9999;if(distance>worst){worst=distance;info=JSON.stringify({proj,dec,x,y,i,v,next});} v=next;}
 }
 if (worst > 25) throw new Error(`WORST ${worst} ${info}`);
});

it('keeps north-up orientation continuous during polar drags', () => {
  for (const proj of ['SIN', 'AIT'] as Projection[]) {
    for (const dec of [-89.9, -89, 89, 89.9]) {
      for (const x of [200, 400, 600]) {
        let current = { ...DEFAULT_VIEW, ra: 10, dec, proj, fov: proj === 'AIT' ? 360 : 180 };
        for (let i = 1; i <= 120; i++) {
          const next = drag(current, x + i - 1, 300 + i - 1, x + i, 300 + i, 800, 600);
          const rotation = Math.abs(((next.ra - current.ra + 540) % 360) - 180);
          if (rotation > 2) throw new Error(`Polar rotation: ${rotation} degrees in one pixel`);
          current = next;
        }
      }
    }
  }
});
