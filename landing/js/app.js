/* Copernix · landing. Escenas guiadas por scroll sobre un fondo de estrellas.
   Sin brillos: los marcadores son un punto y un anillo fino. */
import {D} from './i18n.js';
import {SAT3D} from './sat3d.js';
import {createRenderScheduler} from './render-scheduler.js';
import {schedulePrefetch} from './prefetch.js';

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>1-Math.pow(1-t,3);
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let RM=motionPreference.matches;
if(RM)document.body.classList.add('rm');
const DEV=new URLSearchParams(location.search).has('dev');
if(DEV)document.body.classList.add('dev');
/* colores: se leen de los tokens de CSS, no se repiten aquí */
const css=getComputedStyle(document.documentElement);
const tok=n=>css.getPropertyValue(n).trim();
const C={bg:tok('--bg'),ink:tok('--ink'),text:tok('--text'),dim:tok('--dim'),accent:tok('--accent'),violet:tok('--violet')};

/* ===================== idioma ===================== */
let lang='en';
try{const q=new URLSearchParams(location.search).get('lang');const s=localStorage.getItem('naza_lang');
  lang=(q==='es'||q==='en')?q:(s==='es'||s==='en')?s:((navigator.languages&&navigator.languages[0]||navigator.language||'en').toLowerCase().startsWith('es')?'es':'en');}catch(e){}
const t=k=>(D[lang][k]!==undefined?D[lang][k]:D.en[k]);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const tipBtn=k=>`<button type="button" class="tip" data-tip="${k}" aria-label="${esc(t('about'))}: ${esc(t('tip.'+k)[0])}" aria-expanded="false">?</button>`;
function r(s){return s.replace(/\{tip:(\w+)\}/g,(_,k)=>`<span class="term" data-term>${esc(t('tip.'+k)[2])}${tipBtn(k)}</span>`).replace(/\{tipb:(\w+)\}/g,(_,k)=>`<span class="term" data-term>${tipBtn(k)}</span>`);}

/* ===================== métricas locales (solo con ?dev) ===================== */
let hudOn=false;
const NZ={t0:performance.now(),events:[],depth:0,scenes:new Set(),interacted:false,cta:0,tips:new Set(),found:0,
  track(name,props={}){
    if(DEV){this.events.push({name,t:Math.round(performance.now()-this.t0),...props});if(this.events.length>100)this.events.shift();}
    if(['cmp_drag','target_select','coord_edit','tab_change','tip_open','find_hit','band_drag','scrub'].includes(name))this.interacted=true;
    renderHud();
  }};
function renderHud(){
  if(!hudOn)return;
  const last=NZ.events.slice(-6).reverse().map(e=>`<li>${e.t}ms · ${e.name}${e.id?' · '+e.id:''}</li>`).join('');
  $('#hud').innerHTML=`<h4>Engagement · sesión local</h4>lang: ${lang}<br>scroll depth: ${Math.round(NZ.depth*100)}%<br>scenes seen: ${NZ.scenes.size}/${scenes.length}<br>
  bg draw: ${NZ.bgMs??'-'} ms<br>interacted: ${NZ.interacted?'yes':'no'} · tooltips: ${NZ.tips.size} · found: ${NZ.found}<br>CTA clicks: ${NZ.cta}<ol>${last}</ol>`;
}
$('#hudBtn').onclick=e=>{hudOn=!hudOn;$('#hud').hidden=!hudOn;e.target.setAttribute('aria-pressed',hudOn);renderHud();};
$('#notesBtn').onclick=e=>{const on=document.body.classList.toggle('notes');e.target.setAttribute('aria-pressed',on);e.target.textContent='Dev notes: '+(on?'on':'off');};
function toast(msg){const x=$('#toast');x.textContent=msg;x.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>x.classList.remove('on'),2800);}
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-cta]');
  if(a){NZ.cta++;NZ.track('cta_click',{id:a.dataset.cta});}
  const s=e.target.closest('.sources a');if(s){NZ.track('source_click',{id:s.textContent.slice(0,40)});}
});
const depthMarks=new Set();

/* ===================== tooltips ===================== */
const tb=$('#tipbox');let tipCur=null;
function showTip(b,byClick){
  const [n,d]=t('tip.'+b.dataset.tip);
  tb.innerHTML=`<b>${esc(n)}</b>${esc(d)}`;
  if(tipCur&&tipCur!==b)tipCur.setAttribute('aria-expanded','false');
  tipCur=b;b.setAttribute('aria-expanded','true');b.setAttribute('aria-describedby','tipbox');
  const rc=b.getBoundingClientRect();tb.style.left='0px';tb.style.top='0px';tb.classList.add('on');
  const w=tb.offsetWidth,h=tb.offsetHeight;
  const x=clamp(rc.left+rc.width/2-w/2,8,innerWidth-w-8);let y=rc.top-h-10;if(y<8)y=rc.bottom+10;
  tb.style.left=x+'px';tb.style.top=y+'px';
  if(!NZ.tips.has(b.dataset.tip)){NZ.tips.add(b.dataset.tip);NZ.track('tip_open',{id:b.dataset.tip,via:byClick?'click':'hover'});}
}
function hideTip(){tb.classList.remove('on');if(tipCur){tipCur.setAttribute('aria-expanded','false');tipCur=null;}}
document.addEventListener('pointerover',e=>{const b=e.target.closest&&e.target.closest('.tip');if(b&&e.pointerType==='mouse')showTip(b,false);});
document.addEventListener('pointerout',e=>{const b=e.target.closest&&e.target.closest('.tip');if(b&&e.pointerType==='mouse'&&!b.matches(':focus-visible'))hideTip();});
document.addEventListener('focusin',e=>{const b=e.target.closest&&e.target.closest('.tip');if(b)showTip(b,false);});
document.addEventListener('focusout',e=>{if(e.target.closest&&e.target.closest('.tip'))hideTip();});
document.addEventListener('click',e=>{const b=e.target.closest('.tip');if(b){e.preventDefault();e.stopPropagation();(tipCur===b&&tb.classList.contains('on')&&e.pointerType!=='mouse')?hideTip():showTip(b,true);}else if(!e.target.closest('#tipbox'))hideTip();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});
addEventListener('scroll',()=>{if(tb.classList.contains('on')&&tipCur)showTip(tipCur);},{passive:true});
/* el "?" aparece cuando aparece el término */
const termIO='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting&&en.intersectionRatio>.6){en.target.classList.add('seen');termIO.unobserve(en.target);}}),{threshold:[.6]}):null;
function watchTerms(){$$('[data-term]').forEach(el=>{if(!termIO||RM)el.classList.add('seen');else if(!el.classList.contains('seen'))termIO.observe(el);});}

/* ===================== datos de objetivos ===================== */
/* Velocidades (″/año) de docs/context/02-ciencia-para-cs.md §3. [VERIFICAR] contra Gaia DR3 antes de citarlas fuera de la página. */
const TARGET_SLUG={wise:'wise-0855',barnard:'barnards-star',eps:'epsilon-indi-b',rw:'rw-aurigae',rdra:'r-draconis'};
const TARGETS=[
 {id:'wise',k:'T.wise',kind:'move',v:8,ra:'133.7951',dec:'-7.2452',pan:0,a:[.38,.60],b:[.62,.44]},
 {id:'barnard',k:'T.barnard',kind:'move',v:10,pan:380,a:[.62,.40],b:[.40,.58]},
 {id:'eps',k:'T.eps',kind:'move',v:5,pan:-420,a:[.44,.62],b:[.58,.42]},
 {id:'rw',k:'T.rw',kind:'flicker',pan:640,a:[.5,.52],b:[.5,.52]},
 {id:'rdra',k:'T.rdra',kind:'flicker',pan:-700,a:[.5,.5],b:[.5,.5]}];
const WHO_TXT={wise:'who.wise',barnard:'who.barnard',eps:'who.eps',rw:'who.rw',rdra:'who.rdra'};
let cur=TARGETS[0];

/* ===================== arte generado con IA (assets/manifest.json) ===================== */
/* Object artwork only; the hero shares the procedural page background. */
let ART={objects:{}};
async function loadArt(){
  try{const res=await fetch('assets/manifest.json',{cache:'no-cache'});if(res.ok)ART=Object.assign(ART,await res.json());}catch(e){}
  buildWho();
}

function pictogram(kind){
  const base='<svg viewBox="0 0 140 105" aria-hidden="true" focusable="false">';
  if(kind==='move')return base+'<line x1="40" y1="68" x2="100" y2="38" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="4 5"/><circle cx="36" cy="70" r="5" fill="none" stroke="var(--dim)" stroke-width="1.5"/><circle cx="104" cy="36" r="5" fill="var(--text)"/></svg>';
  return base+'<circle cx="70" cy="52" r="21" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="3 5"/><circle cx="70" cy="52" r="12" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="3 4"/><circle cx="70" cy="52" r="5" fill="var(--text)"/></svg>';
}
function whyFig(x){
  const f=ART.objects&&ART.objects[x.id];
  if(f)return `<div class="fig"><img src="assets/${f}" alt="${esc(t('who.alt').replace('{n}',t(x.k)[0]))}" width="560" height="420" loading="lazy" decoding="async"></div>`;
  return `<div class="fig">${pictogram(x.kind)}</div>`;
}
function buildWho(){
  let objectIndex=0;
  const grp=g=>TARGETS.filter(x=>(x.kind==='move')===(g===0));
  $('#whoList').innerHTML=[0,1].map(g=>`<div class="grp"><h3>${esc(t('who.g'+g))}</h3>${grp(g).map(x=>
    `<div class="obj${objectIndex++%2 ? ' image-right' : ''}">${whyFig(x)}<div><h4>${esc(t(x.k)[0])}</h4><p>${esc(t(WHO_TXT[x.id]))}</p><a class="viewer-link" href="/viewer/?target=${encodeURIComponent(TARGET_SLUG[x.id])}" data-cta="who-${x.id}">${esc(t('who.open'))}</a></div></div>`).join('')}</div>`).join('');
  measure();dirty();
}

function buildSources(){
  const groups=[['src.mission','s.mission'],['src.challenge','s.challenge'],['src.tools','s.tools'],['src.science','s.science'],['src.project','s.project'],['src.credits','s.credits']];
  $('#srcCols').innerHTML=groups.map(([h,l])=>`<div><h3>${esc(t(h))}</h3><ul>${t(l).map(([title,short,url,desc])=>
   `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${esc(title)}</a><span class="mono">${esc(short)}</span><span>${esc(desc)}</span></li>`).join('')}</ul></div>`).join('');
}
function buildChips(){
  $('#chips').innerHTML=TARGETS.map(x=>`<button class="chip" type="button" data-id="${x.id}" aria-pressed="${x===cur}">${esc(t(x.k)[0])}</button>`).join('');
  $$('.chip').forEach(c=>c.onclick=()=>selectTarget(TARGETS.find(x=>x.id===c.dataset.id)));
}
function colText(){const n=bandIdx+1;$('#lamN').textContent=t('col.num').replace('{n}',n);$('#colDesc').textContent=t(bandIdx<34?'col.d0':bandIdx<68?'col.d1':'col.d2');
  bars.setAttribute('aria-valuenow',n);bars.setAttribute('aria-valuetext',t('col.num').replace('{n}',n));}
function foundText(){$('#foundP').textContent=t(cur.k)[1]+' '+t('how.found');}
function apply(){
  document.documentElement.lang=lang;
  $$('[data-i]').forEach(el=>{if(el.id==='lamN')return;el.innerHTML=r(t(el.dataset.i));});
  $$('[data-ia]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.ia)));
  $$('.lang button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===lang));
  tagH.textContent=t(cur.kind==='flicker'?'how.tagflick':'how.tagmove');
  dots.forEach((d,i)=>d.setAttribute('aria-label',scenes[i].id));
  buildSources();buildChips();buildWho();colText();foundText();setCta();updatePP();watchTerms();
  animateHero();
  document.title='Copernix · Planet X and SPHEREx';
}
$$('.lang button').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;try{localStorage.setItem('naza_lang',lang);}catch(e){}apply();NZ.track('lang_change',{id:lang});dirty();});

/* ===================== pasos del método ===================== */
$$('.steps li').forEach(li=>{
  li.addEventListener('click',()=>li.classList.toggle('open'));
  li.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();li.classList.toggle('open');}});
});

/* ===================== rail ===================== */
const scenes=$$('.scene'),rail=$('.rail');
scenes.forEach(s=>{const a=document.createElement('a');a.href='#'+s.id;rail.append(a);});
const dots=$$('a',rail);

/* ===================== fondo: estrellas sobre azul marino ===================== */
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function stars(seed,n){const q=rng(seed);return Array.from({length:n},()=>({x:q(),y:q(),m:q(),p:q()*6.283,s:.5+q()*1.4}));}
function fit(c){
  const w=c.clientWidth,h=c.clientHeight,d=Math.min(1,Math.sqrt(900000/Math.max(1,w*h)));
  const width=Math.max(1,Math.round(w*d)),height=Math.max(1,Math.round(h*d));
  if(c.width!==width||c.height!==height){c.width=width;c.height=height;}
  const g=c.getContext('2d',{willReadFrequently:true});g.setTransform(width/Math.max(1,w),0,0,height/Math.max(1,h),0,0);return[g,w,h];
}
/* nubes: ruido fractal periódico (se repite sin costuras), muy tenue, en azul y en morado */
function cloudTile(seed,size,base,oct,rgb,maxA){
  const q=rng(seed),c=document.createElement('canvas');c.width=c.height=size;
  const g=c.getContext('2d',{willReadFrequently:true}),img=g.createImageData(size,size),lat=[];
  for(let o=0;o<oct;o++){const n=base<<o;lat.push({n,v:Float32Array.from({length:n*n},q)});}
  const sm=u=>u*u*(3-2*u);
  const val=(Lv,x,y)=>{const n=Lv.n,xf=x*n,yf=y*n,x0=Math.floor(xf),y0=Math.floor(yf),tx=sm(xf-x0),ty=sm(yf-y0);
    const at=(a,b)=>Lv.v[((b%n+n)%n)*n+((a%n+n)%n)];
    return lerp(lerp(at(x0,y0),at(x0+1,y0),tx),lerp(at(x0,y0+1),at(x0+1,y0+1),tx),ty);};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let f=0,a=.5,tot=0;for(let o=0;o<oct;o++){f+=a*val(lat[o],x/size,y/size);tot+=a;a*=.5;}
    f/=tot;let u=clamp((f-.44)/.36);u=sm(u);u=Math.pow(u,1.5);
    const k=(y*size+x)*4;img.data[k]=rgb[0];img.data[k+1]=rgb[1];img.data[k+2]=rgb[2];img.data[k+3]=Math.round(u*maxA*255);}
  g.putImageData(img,0,0);return c;
}
const CLOUDS=[
  {tile:cloudTile(11,256,3,5,[16,91,216],.22),s:3.6,vx:5,vy:1.6,par:.05},
  {tile:cloudTile(23,256,4,5,[139,107,217],.17),s:2.8,vx:-4,vy:2.2,par:.09}];
/* Soft clouds use a quarter-resolution buffer, updated with each visible frame. */
const cloudCv=document.createElement('canvas'),cloudG=cloudCv.getContext('2d',{willReadFrequently:true});let cloudKey='',cloudAt=-1e9;
function drawClouds(g,w,h,tt,sy){
  const cw=Math.ceil(w/4),ch=Math.ceil(h/4),key=cw+'x'+ch+':'+Math.round(sy*.5);
  if(cloudCv.width!==cw||cloudCv.height!==ch){cloudCv.width=cw;cloudCv.height=ch;cloudKey='';}
  if(key!==cloudKey||tt!==cloudAt){
    cloudKey=key;cloudAt=tt;cloudG.clearRect(0,0,cw,ch);cloudG.imageSmoothingEnabled=true;cloudG.imageSmoothingQuality='low';
    for(const c of CLOUDS){
      const ts=c.tile.width*c.s/4,ox=((tt*c.vx/4)%ts+ts)%ts-ts,oy=(((tt*c.vy-sy*c.par)/4%ts)+ts)%ts-ts;
      for(let x=ox;x<cw;x+=ts)for(let y=oy;y<ch;y+=ts)cloudG.drawImage(c.tile,x,y,ts,ts);
    }
  }
  g.imageSmoothingEnabled=true;g.drawImage(cloudCv,0,0,w,h);
}
const bg=$('#bg'),L=[stars(1,170),stars(2,90),stars(3,34)];let scrollY=0;
const pan={x:0,t:0};
function drawBg(now){
  const tt=RM?0:now/1000,[g,w,h]=fit(bg);
  pan.x+=(pan.t-pan.x)*.06;
  g.fillStyle=C.ink;g.fillRect(0,0,w,h);
  const base=g.createRadialGradient(w*.5,h*.35,0,w*.5,h*.35,Math.max(w,h)*.8);base.addColorStop(0,C.bg);base.addColorStop(1,C.ink);g.fillStyle=base;g.fillRect(0,0,w,h);
  drawClouds(g,w,h,tt,scrollY);
  g.fillStyle=C.text;
  L.forEach((layer,li)=>{const k=[.04,.1,.22][li],pk=[.5,1,1.6][li];for(const s of layer){
    const y=((s.y*h*1.6-scrollY*k)%(h*1.6)+h*1.6)%(h*1.6);if(y>h)continue;
    const x=(((s.x*w+pan.x*pk)%w)+w)%w;
    const tw=RM?1:.72+.28*Math.sin(tt*s.s+s.p);
    g.globalAlpha=(.25+.6*s.m)*(li?1:.7)*tw;g.beginPath();g.arc(x,y,(.4+s.m*(.8+li*.7)),0,7);g.fill();}});
  /* en el inicio, un punto cruza despacio el cielo: adelanta la idea de "algo se mueve" */
  if(!RM&&scrollY<h){
    const u=(tt%46)/46,fade=1-clamp(scrollY/(h*.6));
    for(let i=0;i<7;i++){const v=Math.max(0,u-i*.004);g.globalAlpha=.5*fade*(1-i/7);g.beginPath();g.arc(lerp(-.04,1.04,v)*w,h*(.8-.5*v),1.7-i*.12,0,7);g.fill();}
  }
  g.globalAlpha=1;
}

/* ===================== motor de escenas ===================== */
let geo=[],vh=innerHeight;
function measure(){vh=innerHeight;geo=scenes.map(s=>({top:s.offsetTop,h:s.offsetHeight}));measureSat();buildWave();}
const P=[];
function prog(i){const g=geo[i];if(!g)return 0;return clamp((scrollY-g.top)/Math.max(1,g.h-vh));}
const idx=id=>scenes.findIndex(s=>s.id===id);
const inView=i=>geo[i]&&scrollY+vh>geo[i].top&&scrollY<geo[i].top+geo[i].h;

/* línea ondulada de los 4 pasos: crece con el scroll y enciende cada círculo al llegar a él */
const wrapEl=$('#stepsWrap'),waveEl=$('#wave'),stepLis=$$('.steps li'),waveDraw=waveEl.querySelector('.draw'),waveTrack=waveEl.querySelector('.track');
let waveLen=0,waveMarks=[],waveT=0,waveP=0,waveBusy=false;
function buildWave(){
  const w=wrapEl.getBoundingClientRect();if(!w.width)return;
  const row=stepLis[0].getBoundingClientRect().top===stepLis[3].getBoundingClientRect().top;
  const nodes=stepLis.map(li=>{const st=li.querySelector('.st'),r=st.getBoundingClientRect(),h=parseFloat(getComputedStyle(st,'::before').height)||40;
    return {x:(row?li.getBoundingClientRect().left+li.offsetWidth/2:r.left+h/2)-w.left,y:r.top+h/2-w.top};});
  const horiz=row;
  const A=horiz?15:9,N=48,pts=[];
  for(let k=0;k<3;k++){const a=nodes[k],b=nodes[k+1],sg=k%2?-1:1;
    for(let i=(k?1:0);i<=N;i++){const u=i/N,off=A*sg*Math.sin(Math.PI*u);
      pts.push(horiz?[lerp(a.x,b.x,u),lerp(a.y,b.y,u)-off]:[lerp(a.x,b.x,u)+off,lerp(a.y,b.y,u)]);}}
  const d='M'+pts.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L');
  waveEl.setAttribute('viewBox',`0 0 ${w.width} ${w.height}`);waveTrack.setAttribute('d',d);waveDraw.setAttribute('d',d);
  waveLen=waveDraw.getTotalLength();waveDraw.style.strokeDasharray=waveLen;
  waveMarks=[0,1/3,2/3,1];   // los nodos quedan a esa fracción del recorrido (columnas iguales)
  waveBusy=true;
}
function sWave(){
  if(!waveLen)return;
  const r=wrapEl.getBoundingClientRect();
  waveT=RM?1:clamp((vh*.9-r.top)/(vh*.25+r.height));
  waveP=RM?waveT:waveP+(waveT-waveP)*.14;
  if(Math.abs(waveT-waveP)<.002)waveP=waveT;
  waveBusy=waveP!==waveT;
  waveDraw.style.strokeDashoffset=waveLen*(1-waveP);
  stepLis.forEach((li,k)=>li.classList.toggle('on',waveP>=waveMarks[k]+(k?0:.01)-.004));
}

/* marcador plano: punto blanco + anillo fino. k (0..1) controla cuánto del anillo se ve. Sin halo ni brillo. */
function mark(g,x,y,rad,k=1){
  g.fillStyle=C.text;g.beginPath();g.arc(x,y,rad,0,7);g.fill();
  if(k>.02){g.strokeStyle=C.violet;g.lineWidth=1.5;g.globalAlpha=clamp(k);g.beginPath();g.arc(x,y,rad+7+4*ease(clamp(k)),0,7);g.stroke();g.globalAlpha=1;}
}
function dot(g,x,y,rad){g.fillStyle=C.text;g.beginPath();g.arc(x,y,rad,0,7);g.fill();}
function dashed(g,x0,y0,x1,y1,alpha){g.strokeStyle=C.text;g.globalAlpha=alpha;g.lineWidth=1.2;g.setLineDash([4,5]);g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();g.setLineDash([]);g.globalAlpha=1;}

/* hero */
const heroTxt=$('#heroTxt');
function sHero(p){heroTxt.style.opacity=1-ease(clamp(p*1.6));heroTxt.style.transform=`translateY(${-p*80}px)`;}

/* problema */
const p1a=$('#p1a'),p1b=$('#p1b'),tag1=$('#tag1'),sky1=$('#sky1');
function sProblem(p){
  const[g,w,h]=fit(sky1);g.clearRect(0,0,w,h);
  const e=ease(p),x=lerp(.16,.8,e)*w,y=lerp(.72,.34,e)*h,x0=.16*w,y0=.72*h,found=p>.4;
  dashed(g,x0,y0,x,y,.45);
  mark(g,x,y,3.4,found?1:0);
  tag1.style.left=x+'px';tag1.style.top=y+'px';tag1.style.opacity=clamp((p-.45)*6);
  const k=clamp((p-.38)*8);p1a.style.opacity=1-k;p1a.style.transform=`translateY(${-k*24}px)`;p1b.style.opacity=k;p1b.style.transform=`translateY(${(1-k)*24}px)`;
}

/* comparar: el cuerpo que cambió se marca cuando la línea se acerca */
const cmpRange=$('#cmpRange'),cA=$('#cA'),cB=$('#cB'),pop=$('#pop'),knob=$('#knob'),stageB=$('#blink .stage');let manual=false;
const BA=[.30,.62],BB=[.68,.40];
function setX(v){stageB.style.setProperty('--x',v+'%');cmpRange.value=v;}
cmpRange.addEventListener('input',()=>{manual=true;knob.classList.add('used');setX(+cmpRange.value);dirty();});
cmpRange.addEventListener('pointerdown',()=>NZ.track('cmp_drag'));
cmpRange.addEventListener('keydown',()=>NZ.track('cmp_drag',{via:'key'}));
let popShown=false;
function sCompare(p,now){
  if(!manual){const sway=(!RM&&now-lastMove>1500)?Math.sin(now/1700)*3.5:0;setX(Math.round(lerp(6,94,ease(clamp((p-.08)/.8)))+sway));}
  const lx=+cmpRange.value/100,[gA,w,h]=fit(cA),[gB]=fit(cB);gA.clearRect(0,0,w,h);gB.clearRect(0,0,w,h);
  const prox=b=>clamp(1-Math.abs(lx-b[0])/.32),pa=lx>BA[0]?prox(BA):0,pb=lx<BB[0]?prox(BB):0;
  /* círculo punteado en la otra época: "estaba aquí / ahora está aquí" */
  const ghost=(g,b)=>{g.strokeStyle=C.dim;g.globalAlpha=.5;g.setLineDash([3,5]);g.lineWidth=1.2;g.beginPath();g.arc(b[0]*w,b[1]*h,14,0,7);g.stroke();g.setLineDash([]);g.globalAlpha=1;};
  ghost(gA,BB);ghost(gB,BA);
  mark(gA,BA[0]*w,BA[1]*h,4,pa);mark(gB,BB[0]*w,BB[1]*h,4,pb);
  const act=pa>pb?{b:BA,pr:pa}:{b:BB,pr:pb},show=act.pr>.2;
  pop.style.left=act.b[0]*w+'px';pop.style.top=(act.b[1]*h-26)+'px';pop.style.opacity=show?1:0;
  if(show&&!popShown){popShown=true;NZ.track('compare_reveal');}
}

/* satélite 3D: queda debajo del texto y se gira 360° (arrastrar o flechas); en reposo gira lento */
const satGL=$('#satGL'),packets=$('#packets'),loadmsg=$('#loadmsg'),satTop=$('#data .top'),satFlow=$('#data .flow'),satHint=$('#satHint');
for(let i=0;i<8;i++){const d=document.createElement('i');d.className='pk';packets.append(d);}
const pk=[...packets.children];let satStarted=false,satBox={top:0,bottom:0};
function measureSat(){satBox={top:satTop.offsetTop+satTop.offsetHeight,bottom:satFlow.offsetTop};}
function startSat(){
  if(satStarted)return;satStarted=true;
  SAT3D.onready=()=>{loadmsg.classList.add('hide');dirty();};
  SAT3D.onfail=()=>{loadmsg.textContent='3D model unavailable';};
  SAT3D.onchange=()=>{satHint.classList.add('gone');dirty();};
  SAT3D.onframe=dirty;
  SAT3D.init(satGL);
}
function sData(p,now){
  const cv=SAT3D.canvas||satGL,W=cv.clientWidth,H=cv.clientHeight;
  const top=satBox.top+14,bottom=satBox.bottom-62,diam=Math.max(120,Math.min(bottom-top,W*.7)*.95),cy=(top+bottom)/2;
  if(SAT3D.ready)SAT3D.update(now,{cx:W/2,cy,diam},RM);
  const on=SAT3D.ready;
  pk.forEach((d,i)=>{const f=(now/2400+i/pk.length)%1;d.style.left='0';d.style.top='0';d.style.transform=`translate(${W*.5+Math.sin(i*2.1)*20*(1-f)}px,${lerp(cy+diam*.32,H-58,f)}px)`;d.style.opacity=on?(1-Math.abs(f-.5)*1.4)*.9:0;});
}

/* colores: una sola tonalidad; se arrastra o se usan las flechas */
const bars=$('#bars');
for(let i=0;i<102;i++){const b=document.createElement('i');b.style.setProperty('--h',String((330+i*.74)%360));b.style.setProperty('--v',(20+55*Math.abs(Math.sin(i*.17)*Math.cos(i*.05))+10)+'%');bars.append(b);}
const barEls=[...bars.children];let bandIdx=0,bandHold=false,lastB=-1;
function setBand(i){
  const prev=lastB;bandIdx=i;if(i===prev)return;lastB=i;
  /* solo se tocan las barras cercanas a la anterior y a la nueva (no las 102) */
  const lo=Math.max(0,Math.min(i,prev<0?i:prev)-4),hi=Math.min(101,Math.max(i,prev<0?i:prev)+4);
  if(prev<0){barEls.forEach(b=>b.className='');}
  for(let k=lo;k<=hi;k++){const d=Math.abs(k-i),c=d===0?'on':d<4?'near':'';if(barEls[k].className!==c)barEls[k].className=c;}
  colText();
}
function bandFromEvent(e){const rc=bars.getBoundingClientRect();return clamp(Math.round((e.clientX-rc.left)/rc.width*101),0,101);}
bars.addEventListener('pointerdown',e=>{bandHold=true;setBand(bandFromEvent(e));NZ.track('band_drag');dirty();});
bars.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||bandHold){bandHold=true;setBand(bandFromEvent(e));dirty();}});
bars.addEventListener('pointerleave',()=>{bandHold=false;});
bars.addEventListener('keydown',e=>{
  const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-10,PageUp:10}[e.key];
  if(e.key==='Home'||e.key==='End'){bandHold=true;setBand(e.key==='Home'?0:101);e.preventDefault();dirty();return;}
  if(step){bandHold=true;setBand(clamp(bandIdx+step,0,101));e.preventDefault();NZ.track('band_drag',{via:'key'});dirty();}
});
function sSpec(p,now){
  if(bandHold)return;
  const base=Math.round(clamp(p*1.1)*101),idle=!RM&&now-lastMove>1800;
  setBand(idle?(base+Math.floor((now-lastMove-1800)/110))%102:base);
}

/* encuéntralo: el cielo ES el visor */
const cH=$('#cH'),tagH=$('#tagH'),tm=$('#tm'),pp=$('#pp'),hsteps=$$('#hstack>div');
let T=0,playing=!RM,found=false,lastT=0,ripple=null,dotXY=[0,0];
const FR=8;
function updatePP(){pp.innerHTML=playing?'<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="2" y="1" width="3.5" height="12" rx="1"/><rect x="8.5" y="1" width="3.5" height="12" rx="1"/></svg>':'<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M3 1.5v11l9-5.5z"/></svg>';pp.setAttribute('aria-label',t(playing?'how.pause':'how.play'));}
pp.onclick=()=>{playing=!playing;updatePP();NZ.track('scrub',{id:playing?'play':'pause'});dirty();};
tm.addEventListener('input',()=>{playing=false;updatePP();T=tm.value/1000;NZ.track('scrub',{id:'drag'});dirty();});
function setFound(v){found=v;hsteps.forEach((s,i)=>s.classList.toggle('on',i===(v?1:0)));if(v){NZ.found++;NZ.track('find_hit',{id:cur.id});}}
$('#showMe').onclick=()=>{if(!found)setFound(true);dirty();};
function dotAt(u){
  const W=cH.clientWidth,H=cH.clientHeight;
  if(cur.kind==='move')return[lerp(cur.a[0],cur.b[0],u)*W,lerp(cur.a[1],cur.b[1],u)*H];
  return[cur.a[0]*W,cur.a[1]*H];
}
cH.addEventListener('pointerdown',e=>{
  if(found)return;const rc=cH.getBoundingClientRect(),x=e.clientX-rc.left,y=e.clientY-rc.top,[dx,dy]=dotXY,R=e.pointerType==='touch'?56:42;
  if(Math.hypot(x-dx,y-dy)<R){setFound(true);}
  else{ripple={x,y,t:performance.now()};$('#hstack').classList.remove('shake');void $('#hstack').offsetWidth;$('#hstack').classList.add('shake');toast(t('how.wrong'));NZ.track('find_miss');}
  dirty();
});
function sUse(p,now){
  if(playing&&!RM){T=(T+Math.min(now-lastT,100)/7000)%1;tm.value=Math.round(T*1000);}
  lastT=now;
  const[g,w,h]=fit(cH);g.clearRect(0,0,w,h);
  const u=T,[x,y]=dotAt(u);dotXY=[x,y];
  const pulse=cur.kind==='flicker'?.5+.5*Math.sin(u*Math.PI*6):1;
  const rad=cur.kind==='flicker'?2.4+2.6*pulse:3.6;
  if(found){
    /* recorrido de las 8 visitas, como un mini rastro */
    if(cur.kind==='move'){const[a0,a1]=dotAt(0),[b0,b1]=dotAt(1);dashed(g,a0,a1,b0,b1,.4);
      g.fillStyle=C.text;g.globalAlpha=.6;for(let i=0;i<FR;i++){const[px,py]=dotAt(i/(FR-1));g.beginPath();g.arc(px,py,2.2,0,7);g.fill();}g.globalAlpha=1;}
    mark(g,x,y,rad,1);
    tagH.style.left=x+'px';tagH.style.top=y+'px';tagH.style.opacity=1;
  }else{
    dot(g,x,y,rad);
    tagH.style.opacity=0;
  }
  if(ripple){const k=(now-ripple.t)/600;if(k<1){g.strokeStyle=C.text;g.globalAlpha=.5*(1-k);g.lineWidth=1.5;g.beginPath();g.arc(ripple.x,ripple.y,10+k*40,0,7);g.stroke();g.globalAlpha=1;}else ripple=null;}
}
const raI=$('#ra'),decI=$('#dec'),vCta=$('#vCta');
function viewerHref(){
  const ra=raI.value.trim(),dec=decI.value.trim();
  const defaults=cur.ra&&cur.dec&&ra===cur.ra&&dec===cur.dec;
  if(ra&&dec&&!defaults)return`/viewer/?ra=${encodeURIComponent(ra)}&dec=${encodeURIComponent(dec)}`;
  return`/viewer/?target=${encodeURIComponent(TARGET_SLUG[cur.id])}`;
}
function setCta(){vCta.href=viewerHref();}
function selectTarget(x){
  cur=x;$$('.chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.id===x.id));
  tagH.textContent=t(x.kind==='flicker'?'how.tagflick':'how.tagmove');
  if(x.ra){raI.value=x.ra;decI.value=x.dec;}else{raI.value='';decI.value='';}
  setFound(false);hsteps.forEach((s,i)=>s.classList.toggle('on',i===0));T=0;playing=!RM;updatePP();
  pan.t=x.pan;foundText();setCta();NZ.track('target_select',{id:x.id});dirty();
}
[raI,decI].forEach(i=>i.addEventListener('input',()=>{setCta();NZ.track('coord_edit');}));

/* por qué */
const tabs=$$('.tab'),whyC=$('#whyDot');
function selTab(i){tabs.forEach((x,k)=>{x.setAttribute('aria-selected',k===i);x.tabIndex=k===i?0:-1;$('#'+x.getAttribute('aria-controls')).hidden=k!==i;});NZ.track('tab_change',{id:i?'flicker':'move'});watchTerms();dirty();}
tabs.forEach((x,i)=>{x.onclick=()=>selTab(i);x.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const j=(i+(e.key==='ArrowRight'?1:-1)+2)%2;selTab(j);tabs[j].focus();}};});
function sWhy(p,now){
  const[g,w,h]=fit(whyC);g.clearRect(0,0,w,h);const flick=tabs[1].getAttribute('aria-selected')==='true',ph=(now/1000)%4/4;
  g.strokeStyle=C.dim;g.globalAlpha=.3;g.setLineDash([3,6]);g.beginPath();g.moveTo(10,h/2);g.lineTo(w-10,h/2);g.stroke();g.setLineDash([]);g.globalAlpha=1;
  const x=flick?w/2:lerp(w*.15,w*.85,RM?.5:ph),rad=flick?4+7*(RM?.5:.5+.5*Math.sin(ph*Math.PI*2)):5;
  dot(g,x,h/2,rad);
}

/* títulos que entran y salen */
function fadeHeads(){scenes.forEach((s,i)=>{const hs=$$('[data-fade]',s);if(!hs.length)return;
  const e=ease(s.id==='go'?clamp((scrollY+vh-geo[i].top)/(vh*.7)):Math.min(clamp(P[i]*7),clamp((1-P[i])*7)));
  hs.forEach(el=>{el.style.opacity=e;el.style.transform=`translateY(${(1-e)*26}px)`;});});}

/* ===================== bucle ===================== */
let curS=-1,needs=true,lastY=-1,lastMove=0,scheduler;
function dirty(){needs=true;scheduler?.invalidate();}
function frame(now){
  if(document.hidden)return false;
  scrollY=window.scrollY;const moved=scrollY!==lastY;lastY=scrollY;if(moved)lastMove=now;
  const iv=id=>inView(idx(id));
  const anim=!RM&&(waveBusy||iv('blink')||iv('how')||iv('why')||iv('data')||iv('colors')||Math.abs(pan.x-pan.t)>.5);
  const heavy=moved||needs||anim,bgDue=!RM;
  if(!(heavy||bgDue))return false;
  if(moved||needs||bgDue){const tb0=DEV?performance.now():0;drawBg(now);if(DEV)NZ.bgMs=Math.round((performance.now()-tb0)*100)/100;}
  if(!heavy)return RM?false:'smooth';
  const layoutChanged=moved||needs;
  needs=false;
  if(layoutChanged)scenes.forEach((s,i)=>P[i]=prog(i));
  if(layoutChanged)sHero(P[idx('hero')]);
  if(iv('method')||waveBusy)sWave();
  if(iv('problem'))sProblem(P[idx('problem')]);
  if(iv('blink'))sCompare(P[idx('blink')],now);
  if(geo[idx('data')]&&inView(idx('data')))startSat();
  if(iv('data'))sData(P[idx('data')],now);
  if(iv('colors'))sSpec(P[idx('colors')],now);
  if(iv('how'))sUse(P[idx('how')],now);
  if(iv('why'))sWhy(P[idx('why')],now);
  if(!RM&&layoutChanged)fadeHeads();
  let a=0;scenes.forEach((s,i)=>{if(scrollY+vh*.5>=geo[i].top)a=i;});
  if(a!==curS){curS=a;dots.forEach((d,i)=>d.setAttribute('aria-current',i===a));NZ.scenes.add(a);NZ.track('scene_view',{id:scenes[a].id});}
  const dp=clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-vh));NZ.depth=Math.max(NZ.depth,dp);
  [.25,.5,.75,1].forEach(m=>{if(dp>=m-.001&&!depthMarks.has(m)){depthMarks.add(m);NZ.track('scroll_depth',{id:Math.round(m*100)});}});
  return RM?false:'smooth';
}
scheduler=createRenderScheduler(frame);
addEventListener('scroll',dirty,{passive:true});
addEventListener('pagehide',()=>scheduler.suspend());
addEventListener('pageshow',()=>{measure();scheduler.resume();});
document.addEventListener('visibilitychange',()=>{
  document.body.classList.toggle('page-hidden',document.hidden);
  if(document.hidden)scheduler.suspend();else{lastT=performance.now();scheduler.resume();}
});
motionPreference.addEventListener('change',event=>{RM=event.matches;document.body.classList.toggle('rm',RM);measure();dirty();});
addEventListener('resize',()=>{measure();dirty();});
document.fonts&&document.fonts.ready.then(()=>{measure();dirty();});
apply();measure();setBand(0);NZ.track('page_view',{rm:RM,lang,w:innerWidth});
if(RM)setFound(false);
loadArt().then(()=>{measure();dirty();});
dirty();

function animateHero(){
 const h=document.querySelector('#hero h1');
 const plain=h.innerHTML.replace(/<br\s*\/?>/gi,'\n');
 h.setAttribute('aria-label',plain.replace(/\n/g,' '));
 h.replaceChildren();let n=0;
 for(const [lineIndex,line] of plain.split('\n').entries()){
  if(lineIndex)h.append(document.createElement('br'));
  for(const [wordIndex,word] of line.split(' ').entries()){
   if(wordIndex)h.append(document.createTextNode(' '));
   const wrap=document.createElement('span');wrap.className='hero-word';wrap.setAttribute('aria-hidden','true');
   for(const char of word){const el=document.createElement('span');el.className='hero-letter';el.textContent=char;
    el.style.setProperty('--delay',(n*23)+'ms');el.style.setProperty('--lift',([32,-20,24,-28][n%4])+'px');el.style.setProperty('--turn',([8,-7,4,-5][n%4])+'deg');wrap.append(el);n++;}
   h.append(wrap);
  }
 }
}
schedulePrefetch();
