/* Original NASA/JPL-Caltech model, rendered offline (scripts/render_satellite_views.py) and played back in a 2D canvas.
   180 turns x 9 tilts. Neighbouring views are blended, so the turn is continuous without opening a GL context. */
export const VIEWS={yaw:180,pitchDegrees:[-48,-36,-24,-12,0,12,24,36,48],start:4};
const N=VIEWS.yaw,ROWS=VIEWS.pitchDegrees.length,MAX_ROWS=3,PARALLEL=6;
const DEG_PER_PX=.45,PX_YAW=DEG_PER_PX/(360/N),PX_PITCH=DEG_PER_PX/(VIEWS.pitchDegrees[1]-VIEWS.pitchDegrees[0]);   // drag distance -> frames / rows
const IDLE_RAD_S=.3;

export const SAT3D={ready:false,failed:false,started:false,onready:null,onfail:null,onchange:null,onframe:null,update:null};

SAT3D.init=function(canvas){
  if(SAT3D.started)return;
  SAT3D.started=true;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  const rows=Array.from({length:ROWS},()=>new Map()),bad=new Set(),queued=new Set();
  let queue=[],active=0,loaded=0;
  let yaw=0,pitch=VIEWS.start,vYaw=0,vPitch=0,dragging=false,lastX=0,lastY=0,lastMove=0,lastTime=0,lastPaint='';
  const wrap=v=>((v%N)+N)%N,clampRow=v=>Math.max(0,Math.min(ROWS-1,v));
  const id=(r,y)=>r*1000+y;

  function evictRows(){
    const have=rows.map((m,r)=>m.size?r:-1).filter(r=>r>=0);
    while(have.length>MAX_ROWS){
      let far=0;for(let i=1;i<have.length;i++)if(Math.abs(have[i]-pitch)>Math.abs(have[far]-pitch))far=i;
      rows[have[far]].clear();have.splice(far,1);
    }
  }
  function want(r,y){
    r=Math.round(clampRow(r));y=wrap(y);
    const key=id(r,y);
    if(rows[r].has(y)||bad.has(key)||queued.has(key))return;
    queued.add(key);queue.push([r,y]);
  }
  function pump(){
    while(active<PARALLEL&&queue.length){
      let best=0,bd=Infinity;
      for(let i=0;i<queue.length;i++){   // closest to what is on screen first
        const [r,y]=queue[i],dy=Math.abs(wrap(y-yaw+N/2)-N/2),d=Math.abs(r-pitch)*40+dy;
        if(d<bd){bd=d;best=i;}
      }
      const [r,y]=queue.splice(best,1)[0],key=id(r,y),img=new Image();
      img.decoding='async';active++;
      img.onload=()=>{
        active--;queued.delete(key);rows[r].set(y,img);loaded++;evictRows();
        if(!SAT3D.ready){SAT3D.ready=true;SAT3D.onready?.();}
        SAT3D.onframe?.();pump();
      };
      img.onerror=()=>{
        active--;queued.delete(key);bad.add(key);
        if(!SAT3D.ready&&!active&&!queue.length){SAT3D.failed=true;SAT3D.onfail?.();}
        pump();
      };
      img.src='assets/spherex-views/'+r+'-'+String(y).padStart(2,'0')+'.webp';
    }
  }
  /* whole current row first (about 1.3 MB), then the rows on each side while the visitor looks around */
  function prefetch(){
    const r=Math.round(pitch),y=Math.round(yaw);
    for(let i=0;i<N;i++)want(r,y+i);
    if(rows[r].size>=N-4){for(const q of [r-1,r+1])if(q>=0&&q<ROWS)for(let i=0;i<N;i+=2)want(q,y+i);}
    pump();
  }
  /* nearest view that is already here, so a missing frame never leaves a hole */
  function view(r,y){
    const m=rows[r];if(!m.size)return null;
    for(let d=0;d<=N/2;d++){const a=m.get(wrap(y+d))||m.get(wrap(y-d));if(a)return a;}
    return null;
  }
  function anyView(r,y){
    const v=view(r,y);if(v)return v;
    for(let d=1;d<ROWS;d++){const a=(r-d>=0&&view(r-d,y))||(r+d<ROWS&&view(r+d,y));if(a)return a;}
    return null;
  }

  const changed=()=>{wantNear();SAT3D.onchange?.();};
  let lastWant='';
  function wantNear(){
    const key=Math.round(pitch)+':'+Math.round(yaw/4);
    if(key===lastWant)return;lastWant=key;prefetch();
  }

  canvas.addEventListener('pointerdown',event=>{
    dragging=true;lastX=event.clientX;lastY=event.clientY;lastMove=performance.now();vYaw=vPitch=0;
    canvas.setPointerCapture(event.pointerId);canvas.classList.add('grabbing');changed();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const now=performance.now(),dt=Math.max(.008,(now-lastMove)/1000),dx=(event.clientX-lastX)*PX_YAW,dy=event.pointerType==='touch'?0:(event.clientY-lastY)*PX_PITCH;
    yaw=wrap(yaw+dx);pitch=clampRow(pitch+dy);
    vYaw=vYaw*.6+(dx/dt)*.4;vPitch=vPitch*.6+(dy/dt)*.4;   // release speed, for the glide
    lastX=event.clientX;lastY=event.clientY;lastMove=now;changed();
  });
  const end=()=>{
    if(dragging&&performance.now()-lastMove>90)vYaw=vPitch=0;   // stopped before letting go: no glide
    dragging=false;canvas.classList.remove('grabbing');
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
  canvas.addEventListener('keydown',event=>{
    const step={ArrowLeft:[-3,0],ArrowRight:[3,0],ArrowUp:[0,-.5],ArrowDown:[0,.5]}[event.key];
    if(!step)return;
    event.preventDefault();yaw=wrap(yaw+step[0]);pitch=clampRow(pitch+step[1]);changed();
  });

  SAT3D.update=(now,layout,reduced)=>{
    const dt=Math.max(0,Math.min(.1,(now-lastTime)/1000));lastTime=now;
    if(!dragging&&!reduced){
      if(Math.abs(vYaw)>.05||Math.abs(vPitch)>.002){
        yaw=wrap(yaw+vYaw*dt);pitch=clampRow(pitch+vPitch*dt);
        const k=Math.exp(-dt*3.2);vYaw*=k;vPitch*=k;wantNear();
      }else{vYaw=vPitch=0;yaw=wrap(yaw+IDLE_RAD_S*dt*N/(2*Math.PI));wantNear();}
    }
    const w=canvas.clientWidth,h=canvas.clientHeight;
    const scale=Math.min(1,Math.sqrt(900000/Math.max(1,w*h)));
    const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;lastPaint='';}
    const paint=[yaw.toFixed(2),pitch.toFixed(3),loaded,width,height,layout.cx,layout.cy,layout.diam].join(':');
    if(paint===lastPaint)return;
    // four neighbours around (yaw, pitch); weights are bilinear, so both turns are continuous
    const y0=Math.floor(yaw),fy=yaw-y0,r0=Math.floor(pitch),fr=pitch-r0,r1=Math.min(ROWS-1,r0+1);
    const taps=[[r0,y0,(1-fy)*(1-fr)],[r0,y0+1,fy*(1-fr)],[r1,y0,(1-fy)*fr],[r1,y0+1,fy*fr]]
      .map(([r,y,wt])=>[anyView(r,wrap(y)),wt]).filter(([img,wt])=>img&&wt>.02).sort((a,b)=>b[1]-a[1]);
    if(!taps.length)return;
    lastPaint=paint;
    context.setTransform(width/Math.max(1,w),0,0,height/Math.max(1,h),0,0);context.clearRect(0,0,w,h);
    const size=layout.diam/.9;   // each view holds a 90 % bounding sphere: keep the original on-screen size
    let sum=0;
    for(const [img,wt] of taps){sum+=wt;context.globalAlpha=wt/sum;context.drawImage(img,layout.cx-size/2,layout.cy-size/2,size,size);}
    context.globalAlpha=1;
  };
  wantNear();prefetch();
};
