import type { Renderer, Tile } from '../ports/renderer';
import type { ViewState } from '../view-state';

const vertex = `#version 300 es
in vec2 a_position;
out vec2 screen;
void main(){screen=a_position;gl_Position=vec4(a_position,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;
precision highp sampler2DArray;
in vec2 screen;
out vec4 color;
uniform sampler2DArray tiles;
uniform usampler2D lookup;
uniform vec4 camera;
uniform int projection;
const float PI=3.141592653589793;
uint indexBits(uint x,uint y){uint n=0u;for(uint i=0u;i<14u;i++){n|=((x>>i)&1u)<<(2u*i);n|=((y>>i)&1u)<<(2u*i+1u);}return n;}
uint skyIndex(vec3 v){
 float z=v.z, za=abs(z); float tt=mod(atan(v.y,v.x)+2.*PI,2.*PI)/(PI/2.); float ns=16384.;
 float face,x,y;
 if(za<=2./3.){
  float jp=floor(ns*(.5+tt-z*.75)); float jm=floor(ns*(.5+tt+z*.75));
  float ifp=floor(jp/ns),ifm=floor(jm/ns);
  face=ifp==ifm?mod(ifp,4.)+4.:(ifp<ifm?mod(ifp,4.):mod(ifm,4.)+8.);
  x=mod(jm,ns); y=ns-mod(jp,ns)-1.;
 } else {
  float ntt=min(3.,floor(tt)); float tp=tt-ntt; float tmp=ns*sqrt(3.*(1.-za));
  float jp=min(ns-1.,floor(tp*tmp)),jm=min(ns-1.,floor((1.-tp)*tmp));
  if(z>=0.){face=ntt;x=ns-jm-1.;y=ns-jp-1.;}else{face=ntt+8.;x=jp;y=jm;}
 }
 return uint(face)*268435456u+indexBits(uint(x),uint(y));
}
void main(){
 float fov=camera.z*PI/180.; float aspect=camera.w; vec2 p=screen*vec2(1.,1./aspect);
 int pr=projection; if(pr==0 && fov>PI) pr=2;
 float scale=pr==0?sin(min(fov,PI)*.5):(pr==1?tan(min(fov,2.6)*.5):2.82842712*min(fov/(2.*PI),1.));
 p*=scale; p.x=-p.x; float c,e,n;
 if(pr==0){float r=dot(p,p);if(r>1.){color=vec4(0.,0.,0.,1.);return;}c=sqrt(1.-r);e=p.x;n=p.y;}
 else if(pr==1){c=inversesqrt(1.+dot(p,p));e=p.x*c;n=p.y*c;}
 else {if(p.x*p.x/8.+p.y*p.y/2.>1.){color=vec4(0.,0.,0.,1.);return;}float z=sqrt(max(0.,1.-p.x*p.x/16.-p.y*p.y/4.));float lon=2.*atan(z*p.x,2.*(2.*z*z-1.));float lat=asin(clamp(z*p.y,-1.,1.));c=cos(lat)*cos(lon);e=cos(lat)*sin(lon);n=sin(lat);}
 float a=camera.x*PI/180.,d=camera.y*PI/180.;
 vec3 center=vec3(cos(d)*cos(a),cos(d)*sin(a),sin(d));
 vec3 east=vec3(-sin(a),cos(a),0.);vec3 north=vec3(-sin(d)*cos(a),-sin(d)*sin(a),cos(d));
 vec3 v=c*center+e*east+n*north;
 uint fine=skyIndex(v);uint coarse=fine>>18u;uvec4 info=texelFetch(lookup,ivec2(int(coarse%128u),int(coarse/128u)),0);
 if(info.r==0u){color=vec4(0.,0.,0.,1.);return;}
 uint bits=14u-info.g;uint x=0u,y=0u;for(uint i=0u;i<14u;i++){if(i>=bits)break;x|=((fine>>(2u*i))&1u)<<i;y|=((fine>>(2u*i+1u))&1u)<<i;}
 float size=exp2(float(bits));vec2 uv=(vec2(float(y),float(x))+.5)/size;
 float brightness=texture(tiles,vec3(uv,float(info.r-1u))).r; color=vec4(vec3(brightness),1.);
 float ra=mod(atan(v.y,v.x)+2.*PI,2.*PI)*180./PI, dec=asin(clamp(v.z,-1.,1.))*180./PI;
 float spacing=camera.z>180.?30.:camera.z>45.?15.:camera.z>10.?5.:camera.z>2.?1.:camera.z>0.5?.2:.05;
 float rx=abs(fract(ra/spacing+.5)-.5),dy=abs(fract(dec/spacing+.5)-.5);
 float line=max(1.-smoothstep(0.,max(fwidth(ra/spacing),.00001),rx),1.-smoothstep(0.,max(fwidth(dec/spacing),.00001),dy));
 color.rgb=mix(color.rgb,vec3(.38,.53,.54),line*.38);
}`;

function shader(gl: WebGL2RenderingContext, type: number, code: string): WebGLShader {
  const result = gl.createShader(type);
  if (!result) throw new Error('Cannot create WebGL shader');
  gl.shaderSource(result, code); gl.compileShader(result);
  return result;
}

export function createWebGL2Renderer(canvas: HTMLCanvasElement, capacity = 256, capture = false): Renderer {
  const context = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: capture });
  if (!context) throw new Error('WebGL2 is unavailable');
  const gl: WebGL2RenderingContext = context;
  const program = gl.createProgram();
  // WebGL can return null on context loss despite the installed DOM typings.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!program) throw new Error('Cannot create WebGL program');
  gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const parallel = gl.getExtension('KHR_parallel_shader_compile') as {COMPLETION_STATUS_KHR:number}|null;
  let linked=false, destroyed=false, compileFrame=0;
  let latest: {view:Readonly<ViewState>;images:readonly Tile[];fallbackPlane?:number}|null=null;
  let cameraUniform: WebGLUniformLocation|null=null, projectionUniform: WebGLUniformLocation|null=null;
  const texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.R8, 512, 512, capacity);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const lookup = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, lookup);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16UI, 128, 96);
  const indices = new Uint16Array(128 * 96 * 4);

  const slots = new Map<ImageBitmap, number>();
  const active = new Set<ImageBitmap>();
  const used = new Set<number>();
  let canvasWidth=canvas.clientWidth,canvasHeight=canvas.clientHeight;
  const resize=new ResizeObserver(entries=>{for(const entry of entries){canvasWidth=entry.contentRect.width;canvasHeight=entry.contentRect.height;}});resize.observe(canvas);
  function render(view: Readonly<ViewState>, images: readonly Tile[], fallbackPlane?:number): void {
    if(destroyed)return;
    if(!linked){
      if(parallel && !gl.getProgramParameter(program,parallel.COMPLETION_STATUS_KHR)){latest={view,images,fallbackPlane};if(!compileFrame) compileFrame=requestAnimationFrame(()=>{compileFrame=0;if(latest)render(latest.view,latest.images,latest.fallbackPlane);});return;}
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(`WebGL link: ${gl.getProgramInfoLog(program) ?? 'unknown error'}`);
      gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      cameraUniform=gl.getUniformLocation(program,'camera');projectionUniform=gl.getUniformLocation(program,'projection');
      gl.uniform1i(gl.getUniformLocation(program,'tiles'),0);gl.uniform1i(gl.getUniformLocation(program,'lookup'),1);linked=true;
    }
    const width = Math.max(1, Math.round(canvasWidth * window.devicePixelRatio));
    const height = Math.max(1, Math.round(canvasHeight * window.devicePixelRatio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height); gl.useProgram(program);
    active.clear(); for(const tile of images)active.add(tile.bitmap);
    for (const bitmap of slots.keys()) if (!active.has(bitmap)) slots.delete(bitmap);
    used.clear(); for(const slot of slots.values())used.add(slot);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    for (const tile of images) {
      if (slots.has(tile.bitmap)) continue;
      let slot = 0; while (used.has(slot)) slot++;
      if (slot >= capacity) break;
      slots.set(tile.bitmap, slot); used.add(slot);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, slot, 512, 512, 1, gl.RED, gl.UNSIGNED_BYTE, tile.bitmap);
      tile.bitmap.close();
    }
    indices.fill(0);
    for(let pass=0;pass<2;pass++) {
      const plane=pass===0?fallbackPlane:view.plane; if(plane===undefined)continue;
      for(let order=0;order<=5;order++) for(const tile of images) {
        if(tile.plane!==plane || tile.order!==order)continue;
        const slot=slots.get(tile.bitmap);if(slot===undefined)continue;
        const count=4**(5-order),first=tile.npix*count;
        for(let i=first;i<first+count;i++){indices[i*4]=slot+1;indices[i*4+1]=order;}
      }
    }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, lookup);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, 96, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, indices);
    gl.uniform4f(cameraUniform, view.ra, view.dec, view.fov, width / height);
    gl.uniform1i(projectionUniform, view.proj === 'SIN' ? 0 : view.proj === 'TAN' ? 1 : 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  return { render, destroy() { destroyed=true; resize.disconnect(); if(compileFrame)cancelAnimationFrame(compileFrame); gl.deleteTexture(texture); gl.deleteTexture(lookup); gl.deleteBuffer(buffer); gl.deleteProgram(program); } };
}
