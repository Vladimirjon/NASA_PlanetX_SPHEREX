/**
 * Entry journey renderer (three.js, loaded lazily). Three passes, no post-processing:
 *   1. sky: NASA SVS Milky Way map on a sphere around the camera (rotation only, never moves);
 *   2. system (Earth radii): Earth, Sun glow, Earth marker and orbit;
 *   3. satellite (metres): the NASA/JPL-Caltech SPHEREx model, so it keeps float precision.
 * Positions are real for "now" (Sun direction, Earth rotation, 700 km dawn–dusk orbit);
 * sprite glows are visual aids. The renderer is destroyed when the journey ends so the
 * sky engine gets the GPU back (this machine class has hung on heavy GPU work before).
 */
import {
  AdditiveBlending,
  BackSide,
  Box3,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  FrontSide,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineLoop,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping,
  type Texture,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  AU_M,
  EARTH_RADIUS_M,
  ECLIPTIC_POLE,
  GALACTIC_CENTER,
  GALACTIC_NORTH_POLE,
  JOURNEY_MS,
  SPHEREX_ALTITUDE_M,
  eqVec,
  gmstDeg,
  journeyPose,
  smooth,
  sunRaDec,
  type JourneyPose,
} from './journey-math';

export type JourneyAssets = {
  readonly modelUrl: string;
  readonly earthDayUrl: string;
  readonly earthNightUrl: string;
  readonly milkyWayUrl: string;
};

export type JourneyHandle = {
  /** Plays once; resolves when the overlay has faded out (or after skip()). */
  /** `freezeAt` (QA screenshots only) holds the journey at that progress. */
  play(onFrame: (pose: JourneyPose) => void, freezeAt?: number | null): Promise<void>;
  skip(): void;
  dispose(): void;
};

const MAX_DPR = 1.5;
const MAX_PIXELS = 2_200_000;
const v3 = (a: readonly [number, number, number]): Vector3 => new Vector3(a[0], a[1], a[2]);

const EARTH_VERT = `varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const EARTH_FRAG = `uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sunDir; uniform vec3 camPos;
varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){
  vec3 n=normalize(vN); float d=dot(n,sunDir); float day=smoothstep(-0.10,0.20,d);
  vec3 dayC=texture2D(dayMap,vUv).rgb; vec3 nightC=texture2D(nightMap,vUv).rgb;
  vec3 col=dayC*(0.02+1.15*max(d,0.0))*day + nightC*vec3(1.0,0.82,0.55)*1.4*(1.0-day);
  vec3 v=normalize(camPos-vW); float rim=pow(1.0-max(dot(n,v),0.0),3.0);
  col+=vec3(0.28,0.52,1.0)*rim*(0.08+0.9*smoothstep(-0.25,0.35,d));
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const ATMO_FRAG = `uniform vec3 sunDir; uniform vec3 camPos; varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){
  vec3 n=normalize(vN); vec3 v=normalize(camPos-vW);
  float i=pow(clamp(1.0-abs(dot(n,v)),0.0,1.0),5.0);
  float lit=smoothstep(-0.35,0.3,dot(n,sunDir));
  gl_FragColor=vec4(vec3(0.32,0.58,1.0)*i*lit*1.6, i*lit);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function glowTexture(inner: string, outer: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.18, inner);
    grad.addColorStop(0.42, outer);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function wantsSoftwareGl(): boolean {
  return /[?&]gl=force\b/.test(window.location.search);
}

/** Loads every asset first (reporting 0–1 progress), then returns a handle ready to play. */
export async function prepareJourney(
  canvas: HTMLCanvasElement,
  assets: JourneyAssets,
  onProgress: (fraction: number) => void,
  now: Date = new Date(),
): Promise<JourneyHandle> {
  const gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: !wantsSoftwareGl(),
  });
  if (!gl) throw new Error('WebGL2 unavailable');
  const renderer = new WebGLRenderer({ canvas, context: gl });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 1);

  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    onProgress(total > 0 ? loaded / total : 0);
  };
  const textures = new TextureLoader(manager);
  const loadTex = async (url: string): Promise<Texture> => {
    const t = await textures.loadAsync(url);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return t;
  };
  let gltfScene: Group;
  let day: Texture;
  let night: Texture;
  let sky: Texture;
  try {
    const [g, d, n, s] = await Promise.all([
      new GLTFLoader(manager).loadAsync(assets.modelUrl),
      loadTex(assets.earthDayUrl),
      loadTex(assets.earthNightUrl),
      loadTex(assets.milkyWayUrl),
    ]);
    gltfScene = g.scene;
    day = d;
    night = n;
    sky = s;
  } catch (err) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw err instanceof Error ? err : new Error('Journey assets failed to load');
  }

  // --- real geometry for "now" -------------------------------------------------------------
  const sunInfo = sunRaDec(now);
  const sunDir = v3(eqVec(sunInfo.ra, sunInfo.dec)).normalize();
  const north = new Vector3(0, 1, 0);
  const eclNorth = v3(eqVec(ECLIPTIC_POLE.ra, ECLIPTIC_POLE.dec)).normalize();
  const gc = v3(eqVec(GALACTIC_CENTER.ra, GALACTIC_CENTER.dec)).normalize();
  // dawn–dusk orbit: SPHEREx sits above the day/night line
  const terminator = new Vector3().crossVectors(sunDir, north).normalize();
  const radial = terminator.clone().addScaledVector(north, 0.55);
  radial.addScaledVector(sunDir, -radial.dot(sunDir)).normalize();
  const satPos = radial.clone().multiplyScalar(1 + SPHEREX_ALTITUDE_M / EARTH_RADIUS_M);
  const side = new Vector3().crossVectors(radial, sunDir).normalize();
  const dirStart = radial.clone().multiplyScalar(0.42).addScaledVector(side, 1).addScaledVector(sunDir, 0.35).normalize();
  // wide view: on the galactic plane, 90° from the Sun, on the ecliptic-north side. From there the
  // Earth is half lit, the Milky Way runs behind the Sun, and the final look pans along it to the centre.
  const ngp = v3(eqVec(GALACTIC_NORTH_POLE.ra, GALACTIC_NORTH_POLE.dec)).normalize();
  const dirWide = new Vector3().crossVectors(ngp, sunDir).normalize();
  if (dirWide.dot(eclNorth) < 0) dirWide.negate();
  const sunPos = sunDir.clone().multiplyScalar(AU_M / EARTH_RADIUS_M);

  // --- pass 1: sky ---------------------------------------------------------------------------
  const skyScene = new Scene();
  const skyGeo = new SphereGeometry(10, 96, 48);
  skyGeo.scale(1, 1, -1); // NASA SVS map: RA increases to the left (see universe review, spec 0045)
  const skyMat = new MeshBasicMaterial({ map: sky, side: FrontSide, depthWrite: false, toneMapped: false });
  skyScene.add(new Mesh(skyGeo, skyMat));
  const skyCam = new PerspectiveCamera(45, 1, 0.1, 100);

  // --- pass 2: system (units: Earth radii) ---------------------------------------------------
  const sysScene = new Scene();
  const earthUniforms = {
    dayMap: { value: day },
    nightMap: { value: night },
    sunDir: { value: sunDir },
    camPos: { value: new Vector3() },
  };
  const earth = new Mesh(new SphereGeometry(1, 128, 64), new ShaderMaterial({ uniforms: earthUniforms, vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG }));
  earth.rotation.y = (gmstDeg(now) * Math.PI) / 180;
  sysScene.add(earth);
  const atmo = new Mesh(
    new SphereGeometry(1.035, 96, 48),
    new ShaderMaterial({
      uniforms: { sunDir: earthUniforms.sunDir, camPos: earthUniforms.camPos },
      vertexShader: EARTH_VERT,
      fragmentShader: ATMO_FRAG,
      side: BackSide,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  sysScene.add(atmo);

  const sunTex = glowTexture('rgba(255,250,236,1)', 'rgba(255,196,120,0.22)');
  const sun = new Sprite(new SpriteMaterial({ map: sunTex, blending: AdditiveBlending, depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false }));
  sun.position.copy(sunPos);
  sun.renderOrder = 5;
  // far objects get their own pass: they sit far beyond the Earth pass's tight depth range
  const farScene = new Scene();
  farScene.add(sun);

  const dotTex = glowTexture('rgba(150,200,255,1)', 'rgba(66,139,202,0.25)');
  const marker = new Sprite(new SpriteMaterial({ map: dotTex, blending: AdditiveBlending, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true, opacity: 0, toneMapped: false }));
  marker.scale.setScalar(0.022);
  marker.renderOrder = 6;
  farScene.add(marker);

  const orbitPts: number[] = [];
  const u = sunDir.clone().negate();
  const w = new Vector3().crossVectors(eclNorth, u).normalize();
  const rOrbit = AU_M / EARTH_RADIUS_M;
  for (let i = 0; i < 256; i++) {
    const a = (i / 256) * Math.PI * 2;
    const p = sunPos.clone().addScaledVector(u, Math.cos(a) * rOrbit).addScaledVector(w, Math.sin(a) * rOrbit);
    orbitPts.push(p.x, p.y, p.z);
  }
  const orbitGeo = new BufferGeometry();
  orbitGeo.setAttribute('position', new Float32BufferAttribute(orbitPts, 3));
  const orbitMat = new LineBasicMaterial({ color: new Color(0x9fb8d8), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
  const orbit = new LineLoop(orbitGeo, orbitMat);
  orbit.renderOrder = 4;
  farScene.add(orbit);
  const sysCam = new PerspectiveCamera(45, 1, 0.001, 10);
  const farCam = new PerspectiveCamera(45, 1, 1, 1e7);

  // --- pass 3: satellite (units: metres) -----------------------------------------------------
  const satScene = new Scene();
  const holder = new Group();
  const box = new Box3().setFromObject(gltfScene);
  const size = box.getSize(new Vector3());
  gltfScene.position.sub(box.getCenter(new Vector3()));
  holder.add(gltfScene);
  holder.scale.setScalar(3.2 / Math.max(size.x, size.y, size.z)); // SPHEREx is ~3.2 m across
  holder.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), radial); // telescope axis points away from Earth
  holder.quaternion.premultiply(new Quaternion().setFromAxisAngle(radial, 0.9));
  satScene.add(holder);
  const key = new DirectionalLight(0xfff6e8, 3.6);
  key.position.copy(sunDir).multiplyScalar(50);
  satScene.add(key);
  const earthShine = new DirectionalLight(0x6f93c8, 0.9);
  earthShine.position.copy(radial).multiplyScalar(-50);
  satScene.add(earthShine);
  satScene.add(new HemisphereLight(0xbfd2ff, 0x0b1830, 0.35));
  const satCam = new PerspectiveCamera(45, 1, 0.05, 60_000);

  // --- per-frame camera ------------------------------------------------------------------------
  const camPos = new Vector3();
  const offDir = new Vector3();
  const target = new Vector3();
  const look = new Vector3();
  const up = new Vector3();
  const tmp = new Vector3();
  let sized = '';

  const resize = (): void => {
    const cw = Math.max(1, canvas.clientWidth);
    const ch = Math.max(1, canvas.clientHeight);
    const ratio = Math.min(MAX_DPR, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / (cw * ch)));
    const sig = `${String(cw)}x${String(ch)}@${ratio.toFixed(2)}`;
    if (sig === sized) return;
    sized = sig;
    renderer.setPixelRatio(ratio);
    renderer.setSize(cw, ch, false);
    for (const c of [skyCam, sysCam, satCam, farCam]) c.aspect = cw / ch;
  };

  const sunOccluded = (): boolean => {
    // ray camPos → Sun hits the Earth sphere?
    const d = tmp.copy(sunPos).sub(camPos).normalize();
    const b = camPos.dot(d);
    const c = camPos.lengthSq() - 1;
    return b < 0 && b * b - c > 0;
  };

  const renderPose = (p: JourneyPose): void => {
    resize();
    offDir.copy(dirStart).lerp(dirWide, p.swing).normalize();
    camPos.copy(satPos).addScaledVector(offDir, p.distM / EARTH_RADIUS_M);
    // blend look directions, not points: the Sun is 23 000 Earth radii away
    target.copy(satPos).lerp(tmp.set(0, 0, 0), p.toEarth);
    look.copy(target).sub(camPos).normalize();
    look.lerp(tmp.copy(sunPos).sub(camPos).normalize(), p.toSun).normalize();
    look.lerp(gc, p.skyLook).normalize();
    up.copy(radial).lerp(north, smooth(0, 1, p.toEarth)).normalize();

    for (const c of [skyCam, sysCam, satCam, farCam]) {
      c.fov = p.fovDeg;
      c.up.copy(up);
    }
    sysCam.position.copy(camPos);
    sysCam.lookAt(tmp.copy(camPos).add(look));
    const distEarth = camPos.length();
    sysCam.near = Math.max(1e-5, (distEarth - 1.05) * 0.5);
    sysCam.far = distEarth + 1.1;
    sysCam.updateProjectionMatrix();
    skyCam.quaternion.copy(sysCam.quaternion);
    skyCam.updateProjectionMatrix();
    farCam.position.copy(camPos);
    farCam.quaternion.copy(sysCam.quaternion);
    farCam.updateProjectionMatrix();
    satCam.position.copy(offDir).multiplyScalar(p.distM);
    satCam.quaternion.copy(sysCam.quaternion);
    satCam.updateProjectionMatrix();

    earthUniforms.camPos.value.copy(camPos);
    skyMat.color.setScalar(0.42 + 0.58 * Math.max(p.toSun, p.skyLook));
    const sunScale = 0.06 + 0.08 * p.toSun;
    sun.scale.setScalar(sunScale);
    sun.material.opacity = sunOccluded() ? 0 : 1 - 0.85 * p.skyLook;
    marker.material.opacity = p.system * smooth(2e8, 2e9, p.distM);
    orbitMat.opacity = 0.5 * p.system * smooth(4e10, 1.6e11, p.distM);

    renderer.clear();
    renderer.render(skyScene, skyCam);
    renderer.render(farScene, farCam);
    renderer.clearDepth();
    renderer.render(sysScene, sysCam);
    if (p.distM < 40_000) {
      renderer.clearDepth();
      renderer.render(satScene, satCam);
    }
  };

  let raf = 0;
  let finish: (() => void) | null = null;
  let disposed = false;

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    for (const scene of [skyScene, farScene, sysScene, satScene]) {
      scene.traverse(obj => {
        const m = obj as Partial<Mesh>;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) mat.dispose();
      });
    }
    for (const t of [day, night, sky, sunTex, dotTex]) t.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  // first frame now, so the overlay never shows an empty canvas
  renderPose(journeyPose(0));

  return {
    play(onFrame, freezeAt) {
      if (freezeAt !== undefined && freezeAt !== null) {
        const pose = journeyPose(freezeAt);
        renderPose(pose);
        onFrame({ ...pose, overlay: 1 });
        return new Promise<void>(resolve => {
          finish = resolve;
        });
      }
      return new Promise<void>(resolve => {
        const start = performance.now();
        finish = () => {
          finish = null;
          cancelAnimationFrame(raf);
          resolve();
        };
        const tick = (nowMs: number): void => {
          if (disposed) return;
          const progress = Math.min(1, (nowMs - start) / JOURNEY_MS);
          const pose = journeyPose(progress);
          renderPose(pose);
          onFrame(pose);
          if (progress >= 1) {
            finish?.();
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    },
    skip() {
      finish?.();
    },
    dispose,
  };
}
