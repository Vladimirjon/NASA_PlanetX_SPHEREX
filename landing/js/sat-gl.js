/* Real-time SPHEREx model (NASA's Eyes · NASA/JPL-Caltech), loaded lazily by sat3d.js.
   Deliberately modest, because this machine class has hung on heavy GPU work before:
   - one small canvas (<= 0.9 MP, pixel ratio <= 1.5), no shadows, no blur, no post-processing, no environment pass;
   - it draws only when sat3d.update() is called, which the page does only while the scene is on screen;
   - it refuses a software-GL context (failIfMajorPerformanceCaveat) and a lost context hands over to the prerendered views;
   - `?gl=0` turns it off, `?gl=force` lets automated tests run it on a software renderer.
   Returns false when it cannot start, and sat3d.js then plays the prerendered views instead. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const FOV=28,CAM_Z=30,MAX_PIXELS=900000,MAX_DPR=1.5;
const ELEV_MIN=-36,ELEV_MAX=60,ELEV_START=22;          // degrees; positive looks down on the cone
const DEG_PER_PX=.45,IDLE_RAD_S=.3,EASE_S=1.1,ELEV_DECAY=3,MAX_FLICK=12;   // MAX_FLICK in rad/s

/* One velocity: a flick glides and settles into the lazy turn with no stop-and-restart. Pure, so it is tested. */
export function stepMotion(s,dt,{idle=IDLE_RAD_S,easeS=EASE_S}={}){
  const ease=1-Math.exp(-dt/easeS);
  const vYaw=s.vYaw+(idle-s.vYaw)*ease;
  let vElev=s.vElev*Math.exp(-dt*ELEV_DECAY);if(Math.abs(vElev)<.01)vElev=0;
  const elev=Math.max(ELEV_MIN,Math.min(ELEV_MAX,s.elev+vElev*dt));
  return {yaw:s.yaw+vYaw*dt,elev,vYaw,vElev};
}
export const clampElev=v=>Math.max(ELEV_MIN,Math.min(ELEV_MAX,v));

export async function initGL(canvas,api){
  const q=typeof location!=='undefined'?location.search:'';
  if(/[?&]gl=0\b/.test(q))return false;
  const force=/[?&]gl=force\b/.test(q);
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,stencil:false,depth:true,powerPreference:'low-power',failIfMajorPerformanceCaveat:!force});
  if(!gl)return false;

  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,context:gl,alpha:true});}catch(e){return false;}
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.setClearColor(0x000000,0);

  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(FOV,1,.1,200);cam.position.set(0,0,CAM_Z);
  const rig=new THREE.Group();scene.add(rig);rig.add(cam);   // camera and lights orbit together: the lighting never changes with the elevation
  const key=new THREE.DirectionalLight(0xffffff,3.4);key.position.set(-6,7,9);rig.add(key);
  const rim=new THREE.DirectionalLight(0x9fc3e8,1.5);rim.position.set(8,-3,-7);rig.add(rim);
  const fill=new THREE.DirectionalLight(0xffffff,1.1);fill.position.set(5,2,8);rig.add(fill);
  rig.add(new THREE.HemisphereLight(0xdfe8ff,0x1a2a4a,1.1));

  const holder=new THREE.Group();scene.add(holder);
  const base=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-.95,0)),spin=new THREE.Quaternion(),AY=new THREE.Vector3(0,1,0);
  let radius=4;
  try{
    const g=await new GLTFLoader().loadAsync('model/spherex.gltf');
    const model=g.scene,box=new THREE.Box3().setFromObject(model),c=box.getCenter(new THREE.Vector3());
    radius=box.getSize(new THREE.Vector3()).length()/2;
    model.position.sub(c);holder.add(model);
  }catch(e){renderer.dispose();return false;}

  let s={yaw:0,elev:ELEV_START,vYaw:0,vElev:0},dragging=false,lastX=0,lastY=0,lastMove=0,lastTime=0,lost=false;
  const changed=()=>api.onchange?.();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;api.onGLLost?.();});
  canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;lastMove=performance.now();s.vYaw=s.vElev=0;canvas.setPointerCapture(e.pointerId);canvas.classList.add('grabbing');changed();});
  canvas.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const now=performance.now(),dt=Math.max(.008,(now-lastMove)/1000);
    const dYaw=(e.clientX-lastX)*DEG_PER_PX*Math.PI/180,dElev=e.pointerType==='touch'?0:(e.clientY-lastY)*DEG_PER_PX;
    s.yaw+=dYaw;s.elev=clampElev(s.elev+dElev);
    const cap=v=>Math.max(-MAX_FLICK,Math.min(MAX_FLICK,v));
    s.vYaw=s.vYaw*.6+cap(dYaw/dt)*.4;s.vElev=s.vElev*.6+(dElev/dt)*.4;   // release speed, for the glide
    lastX=e.clientX;lastY=e.clientY;lastMove=now;changed();
  });
  const end=()=>{if(dragging&&performance.now()-lastMove>90)s.vYaw=s.vElev=0;dragging=false;canvas.classList.remove('grabbing');};
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,end);
  canvas.addEventListener('keydown',e=>{
    const k={ArrowLeft:[-6,0],ArrowRight:[6,0],ArrowUp:[0,-6],ArrowDown:[0,6]}[e.key];
    if(!k)return;e.preventDefault();s.yaw+=k[0]*Math.PI/180;s.elev=clampElev(s.elev+k[1]);changed();
  });

  let sized='';
  api.update=(now,layout,reduced)=>{
    if(lost)return;
    const dt=Math.max(0,Math.min(.1,(now-lastTime)/1000));lastTime=now;
    if(!dragging&&!reduced)s=stepMotion(s,dt);
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
    const ratio=Math.min(MAX_DPR,(typeof devicePixelRatio==='number'?devicePixelRatio:1),Math.sqrt(MAX_PIXELS/(w*h)));
    const sig=w+'x'+h+'@'+ratio.toFixed(2);
    if(sig!==sized){sized=sig;renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);cam.aspect=w/h;}
    const worldH=2*Math.tan(THREE.MathUtils.degToRad(FOV/2))*CAM_Z,wpp=worldH/h;
    cam.setViewOffset(w,h,-(layout.cx-w/2),-(layout.cy-h/2),w,h);cam.updateProjectionMatrix();
    holder.scale.setScalar(layout.diam*wpp/(2*radius));
    holder.quaternion.copy(base).premultiply(spin.setFromAxisAngle(AY,s.yaw));   // turntable about the model's own axis
    rig.rotation.x=-THREE.MathUtils.degToRad(s.elev);
    renderer.render(scene,cam);
  };
  api.mode='gl';
  return true;
}
