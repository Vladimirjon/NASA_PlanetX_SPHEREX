/* Warm the browser cache for the viewer and its entry journey while the visitor reads the landing.
   Idle-time only, low priority (<link rel="prefetch">), once per page; skipped on Save-Data or 2G.
   The first hover/focus on an "Explore the sky" link starts it immediately. */
const VIEWER='/viewer/';
const JOURNEY=[
  '/viewer/journey/earth-day.webp','/viewer/journey/earth-night.webp','/viewer/journey/milkyway.webp',
  '/model/spherex.gltf','/model/spherex.bin','/model/spherex_albedo_webp.webp','/model/spherex_normals.webp',
  '/model/spherex_pbr.webp','/model/foil_normal.webp','/model/corrugated_normal.webp',
];
let started=false;

function slowNetwork(){
  const c=typeof navigator!=='undefined'?navigator.connection:undefined;
  return Boolean(c&&(c.saveData||/(^|-)2g$/.test(c.effectiveType||'')));
}
function hint(href,as){
  if(document.head.querySelector(`link[rel="prefetch"][href="${href}"]`))return;
  const l=document.createElement('link');l.rel='prefetch';l.href=href;if(as)l.as=as;document.head.appendChild(l);
}
/* The viewer's hashed bundle names are only known from its index.html. */
async function viewerBundle(){
  try{
    const res=await fetch(VIEWER,{credentials:'same-origin'});
    if(!res.ok)return;
    const html=await res.text();
    for(const m of html.matchAll(/(?:src|href)="(\/viewer\/assets\/[^"]+\.(js|css))"/g))hint(m[1],m[2]==='js'?'script':'style');
  }catch{/* offline: the viewer still loads normally */}
}
export function startPrefetch(){
  if(started||slowNetwork())return;
  started=true;
  void viewerBundle();
  for(const href of JOURNEY)hint(href);
}
export function schedulePrefetch(){
  if(slowNetwork())return;
  for(const a of document.querySelectorAll('a[href^="/viewer/"]')){
    a.addEventListener('pointerenter',startPrefetch,{once:true,passive:true});
    a.addEventListener('focus',startPrefetch,{once:true});
  }
  const idle=window.requestIdleCallback||(cb=>setTimeout(cb,2500));
  const go=()=>idle(startPrefetch,{timeout:6000});
  if(document.readyState==='complete')go();else window.addEventListener('load',go,{once:true});
}
