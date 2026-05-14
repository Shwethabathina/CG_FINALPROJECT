import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';




// -------------------- Scene --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c7ff);
scene.fog = new THREE.FogExp2(0x87c7ff, 0.0016);

// -------------------- Camera --------------------
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000);
camera.position.set(0, 175, 260);

// -------------------- Renderer --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// -------------------- Controls (debug only) --------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 16, 0);
controls.enableZoom = true;
controls.zoomSpeed = 1.0;
controls.minDistance = 25;
controls.maxDistance = 1200;
controls.enabled = false;
controls.update();

// -------------------- Stats --------------------
const stats = new Stats();
document.body.appendChild(stats.dom);

// -------------------- UI Overlay --------------------
const hud = document.createElement('div');
hud.style.position = 'fixed';
hud.style.left = '12px';
hud.style.bottom = '12px';
hud.style.padding = '10px 12px';
hud.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';
hud.style.fontSize = '13px';
hud.style.lineHeight = '1.4';
hud.style.color = 'rgba(255,255,255,0.92)';
hud.style.background = 'rgba(0,0,0,0.35)';
hud.style.backdropFilter = 'blur(6px)';
hud.style.border = '1px solid rgba(255,255,255,0.12)';
hud.style.borderRadius = '12px';
hud.style.userSelect = 'none';

hud.innerHTML = `
  <div style="font-weight:700;margin-bottom:6px;">Evolving Realms – Planetfall</div>

  <button id="meteorBtn" style="
    appearance:none; border:1px solid rgba(255,255,255,0.18);
    background:rgba(255,255,255,0.10); color:rgba(255,255,255,0.92);
    padding:7px 10px; border-radius:10px; cursor:pointer;
    font-weight:600; margin-bottom:8px;
  ">☄️ Meteor Strike</button>

  <div>Space: <b>Move forward</b></div>
  <div>← / →: <b>Turn left / right</b></div>
  <div>↑ / ↓: <b>Up / Down</b></div>
  <div>A / D: <b>Strafe left / right</b></div>
  <div>Right Mouse Drag: <b>Look / Turn</b></div>
  <div>F: <b>Activate beacon</b></div>
  <div>M: <b>Manual meteor</b></div>
  <div>E: <b>Toggle earthquake</b></div>
  <div>Q: <b>Quake burst</b></div>
  <div>R: <b>Restart mission</b></div>
  <div>T: <b>Debug camera</b></div>
  <div style="margin-top:6px;opacity:0.85;">Destroyed area: <span id="score">0</span></div>
`;
document.body.appendChild(hud);

const scoreEl = document.getElementById('score');
const meteorBtn = document.getElementById('meteorBtn');

// -------------------- GAME UI --------------------
const missionInfo = document.createElement('div');
missionInfo.style.marginTop = '8px';
missionInfo.innerHTML = `
  <div>Mission: <b><span id="missionState">Sandbox</span></b></div>
  <div>Beacons left: <b><span id="beaconsLeft">0</span></b></div>
  <div>Damage limit: <b><span id="damageLimit">0</span></b></div>
`;
hud.appendChild(missionInfo);

const missionStateEl = document.getElementById('missionState');
const beaconsLeftEl = document.getElementById('beaconsLeft');
const damageLimitEl = document.getElementById('damageLimit');

const promptEl = document.createElement('div');
promptEl.style.position = 'fixed';
promptEl.style.left = '50%';
promptEl.style.bottom = '100px';
promptEl.style.transform = 'translateX(-50%)';
promptEl.style.padding = '10px 14px';
promptEl.style.borderRadius = '999px';
promptEl.style.background = 'rgba(0,0,0,0.45)';
promptEl.style.backdropFilter = 'blur(6px)';
promptEl.style.border = '1px solid rgba(255,255,255,0.12)';
promptEl.style.color = 'white';
promptEl.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';
promptEl.style.fontSize = '14px';
promptEl.style.display = 'none';
promptEl.style.zIndex = '40';
document.body.appendChild(promptEl);

const warningEl = document.createElement('div');
warningEl.style.position = 'fixed';
warningEl.style.left = '50%';
warningEl.style.top = '24px';
warningEl.style.transform = 'translateX(-50%)';
warningEl.style.padding = '12px 18px';
warningEl.style.borderRadius = '14px';
warningEl.style.background = 'rgba(120,20,20,0.80)';
warningEl.style.backdropFilter = 'blur(6px)';
warningEl.style.border = '1px solid rgba(255,255,255,0.18)';
warningEl.style.color = 'white';
warningEl.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';
warningEl.style.fontSize = '15px';
warningEl.style.fontWeight = '700';
warningEl.style.display = 'none';
warningEl.style.zIndex = '65';
document.body.appendChild(warningEl);

// -------------------- START MENU --------------------
const startMenu = document.createElement('div');
startMenu.style.position = 'fixed';
startMenu.style.inset = '0';
startMenu.style.display = 'flex';
startMenu.style.alignItems = 'center';
startMenu.style.justifyContent = 'center';
startMenu.style.background = 'linear-gradient(rgba(4,10,20,0.70), rgba(4,10,20,0.84))';
startMenu.style.zIndex = '60';

startMenu.innerHTML = `
  <div style="
    width:min(640px, 92vw);
    padding:30px 28px;
    border-radius:22px;
    background:rgba(8,18,30,0.84);
    border:1px solid rgba(255,255,255,0.12);
    box-shadow:0 20px 60px rgba(0,0,0,0.35);
    color:white;
    font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial;
    text-align:center;
    backdrop-filter:blur(8px);
  ">
    <div style="font-size:34px;font-weight:900;">EVOLVING REALMS</div>
    <div style="font-size:18px;font-weight:700;opacity:0.95;margin-top:4px;">PLANETFALL</div>

    <div style="margin-top:16px;font-size:15px;line-height:1.7;opacity:0.94;">
      Fly the survey drone across the unstable planet and activate all stabilization beacons
      before meteor damage turns the whole place into expensive geology.
    </div>

    <div style="margin-top:18px;text-align:left;background:rgba(255,255,255,0.05);padding:14px 16px;border-radius:16px;">
      <div style="font-weight:800;margin-bottom:8px;">How to Play</div>
      <div>• Space to move forward</div>
      <div>• Arrow Left / Arrow Right to turn left / right</div>
      <div>• Arrow Up / Arrow Down to go up / down</div>
      <div>• A / D to strafe left / right</div>
      <div>• Hold right mouse button and drag to rotate your view</div>
      <div>• Reach a glowing beacon and press <b>F</b></div>
      <div>• Activated beacons turn <b>green</b></div>
      <div>• After activating one beacon, you must reach the next before the timer ends</div>
      <div>• Miss the timer and it is <b>Game Over</b></div>
    </div>

    <button id="startMissionBtn" style="
      appearance:none;border:none;cursor:pointer;
      padding:12px 22px;border-radius:14px;
      font-size:16px;font-weight:800;
      background:linear-gradient(135deg,#59c7ff,#377dff);
      color:white;
      margin-top:22px;
      box-shadow:0 10px 28px rgba(55,125,255,0.35);
    ">Start Mission</button>
  </div>
`;
document.body.appendChild(startMenu);

const startMissionBtn = document.getElementById('startMissionBtn');

// -------------------- END SCREEN --------------------
const endScreen = document.createElement('div');
endScreen.style.position = 'fixed';
endScreen.style.inset = '0';
endScreen.style.display = 'none';
endScreen.style.alignItems = 'center';
endScreen.style.justifyContent = 'center';
endScreen.style.background = 'linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.84))';
endScreen.style.zIndex = '70';

endScreen.innerHTML = `
  <div style="
    width:min(560px, 92vw);
    padding:28px 24px;
    border-radius:22px;
    background:rgba(12,14,18,0.90);
    border:1px solid rgba(255,255,255,0.10);
    color:white;
    font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial;
    text-align:center;
    backdrop-filter:blur(8px);
  ">
    <div id="endTitle" style="font-size:34px;font-weight:900;margin-bottom:10px;">MISSION END</div>
    <div id="endMessage" style="font-size:15px;line-height:1.7;opacity:0.94;margin-bottom:20px;">
      Placeholder
    </div>
    <button id="restartMissionBtn" style="
      appearance:none;border:none;cursor:pointer;
      padding:12px 22px;border-radius:14px;
      font-size:16px;font-weight:800;
      background:linear-gradient(135deg,#59c7ff,#377dff);
      color:white;
    ">Restart Mission</button>
  </div>
`;
document.body.appendChild(endScreen);

const endTitle = document.getElementById('endTitle');
const endMessage = document.getElementById('endMessage');
const restartMissionBtn = document.getElementById('restartMissionBtn');

// -------------------- World Params --------------------
const WORLD = {
  size: 240,
  segments: 256,

  heightAmp: 42,
  noiseScale: 0.012,
  octaves: 6,
  persistence: 0.5,

  warpScale: 0.02,
  warpAmp: 18,

  river: {
    points: [
      new THREE.Vector2(-110, -90),
      new THREE.Vector2(-60, -40),
      new THREE.Vector2(-10, -10),
      new THREE.Vector2(45, 20),
      new THREE.Vector2(110, 95),
    ],
    width: 17,
    depth: 19,
    bankSmooth: 7,
  },

  waterLevel: -6.0,

  treeCount: 1300,
  treeMinDistToRiver: 10,

  crater: {
    radius: 10.0,
    depth: 10.0,
    rimHeight: 3.2,
    rimWidth: 4.0,
  },

  shockwave: {
    speed: 26.0,
    life: 3.2,
    thickness: 2.0,
    strength: 1.0,
    bendStrength: 1.0,
    bendBand: 6.0,
  },

  mountain: {
    enabled: true,
    x: 70,
    z: 55,
    radius: 52,
    height: 110,
    peakSharpness: 2.6,
    ridgeNoise: 0.08,
    noTreesBuffer: 10,
  },

  dayNight: {
    enabled: true,
    secondsPerDay: 70,
    sunRadius: 560,
    sunHeight: 380,
    moonOffset: Math.PI,
    fogDayDensity: 0.0016,
    fogNightDensity: 0.003,
  },

  meteor: {
    spawnHeight: 230,
    fallSpeed: 210,
    trailLife: 0.35,
    debrisCount: 900,
    debrisLife: 1.8,
    debrisGravity: 55,
  },

  quake: {
    enabled: false,
    amp: 3.2,
    spatialFreq: 0.055,
    timeFreq: 9.0,
    cameraAmp: 1.8,
    treeBoost: 1.3,
    waterBoost: 1.45,
    burstSeconds: 2.0,
  },

  moonBall: {
    radius: 7.0,
    distanceMul: 0.98,
    baseOpacity: 0.15,
    maxExtraOpacity: 0.75,
    fadeInAtNight: 0.15,
    fadeFullAtNight: 0.75,
    pulseAmp: 0.03,
    pulseSpeed: 1.2,
  },

  game: {
    beaconCount: 4,
    beaconActivateDistance: 18,
    collapseDamage: 4500,
    disasterStartDelay: 10.0,
    randomMeteorMinGap: 8.0,
    randomMeteorMaxGap: 14.0,
    randomQuakeMinGap: 10.0,
    randomQuakeMaxGap: 14.0,

    // chain timer: must activate next beacon before this expires
    beaconChainSeconds: 20.0,
  },

  player: {
    speed: 30,
    sprintMul: 1.55,
    verticalSpeed: 18,
    turnSpeed: 1.9,
    minHoverHeight: 4.5,
    maxHeight: 85,
    camDistance: 18,
    camHeight: 7,
    camSmooth: 0.08,
  },
};

// -------------------- GAME STATE --------------------
const GAME = {
  state: 'MENU',
  nextRandomMeteorAt: 0,
  nextRandomQuakeAt: 0,
  disasterStartsAt: Infinity,
  chainDeadlineAt: Infinity,
  debugFreeCamera: false,
  currentLevel: 1,
};

damageLimitEl.textContent = WORLD.game.collapseDamage.toString();

// -------------------- Noise --------------------
const noise = new ImprovedNoise();

function fbm(x, z, scale, amp, octaves, persistence) {
  let freq = 1.0;
  let a = 1.0;
  let sum = 0.0;
  let norm = 0.0;

  for (let o = 0; o < octaves; o++) {
    const n = noise.noise(x * scale * freq, 0, z * scale * freq);
    sum += n * a;
    norm += a;
    a *= persistence;
    freq *= 2.0;
  }
  return (sum / Math.max(1e-6, norm)) * amp;
}

function domainWarp(x, z) {
  const wx = fbm(x + 17.0, z + 91.0, WORLD.warpScale, WORLD.warpAmp, 3, 0.55);
  const wz = fbm(x - 63.0, z - 11.0, WORLD.warpScale, WORLD.warpAmp, 3, 0.55);
  return { x: x + wx, z: z + wz };
}

// -------------------- River helpers --------------------
function distanceToPolylineXZ(p, pts) {
  let minD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const ab = new THREE.Vector2().subVectors(b, a);
    const ap = new THREE.Vector2().subVectors(p, a);
    const t = THREE.MathUtils.clamp(ap.dot(ab) / ab.lengthSq(), 0, 1);
    const closest = new THREE.Vector2(a.x + ab.x * t, a.y + ab.y * t);
    const d = closest.distanceTo(p);
    if (d < minD) minD = d;
  }
  return minD;
}

function riverCarveHeight(dist, width, depth, smooth) {
  const t = THREE.MathUtils.clamp(dist / Math.max(1e-6, width), 0, 1);
  const s = t * t * (3 - 2 * t);
  const bank = Math.pow(1.0 - s, Math.max(1.0, smooth / 4.0));
  return -depth * bank;
}

// -------------------- Crater stamps --------------------
const craterStamps = [];

function smooth01(t) {
  t = THREE.MathUtils.clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function craterDelta(dx, dz, stamp) {
  const r = Math.sqrt(dx * dx + dz * dz);
  const R = stamp.radius;
  if (r > R + stamp.rimWidth) return 0.0;

  const t = 1.0 - smooth01(r / Math.max(1e-6, R));
  const bowl = -stamp.depth * (t * t);

  const rimBand = stamp.rimWidth;
  const rimT =
    1.0 -
    THREE.MathUtils.clamp(Math.abs(r - R) / Math.max(1e-6, rimBand), 0, 1);
  const rim = stamp.rimHeight * smooth01(rimT) ** 1.5;

  const rimBlend = smooth01(
    THREE.MathUtils.clamp((r - R * 0.55) / (R * 0.45), 0, 1)
  );
  return THREE.MathUtils.lerp(bowl, rim, rimBlend);
}

// -------------------- Big Mountain stamp --------------------
function mountainHeightAt(x, z) {
  if (!WORLD.mountain.enabled) return 0.0;

  const dx = x - WORLD.mountain.x;
  const dz = z - WORLD.mountain.z;
  const r = Math.sqrt(dx * dx + dz * dz);

  const R = WORLD.mountain.radius;
  if (r > R) return 0.0;

  const t = 1.0 - smooth01(r / Math.max(1e-6, R));
  let h = WORLD.mountain.height * Math.pow(t, WORLD.mountain.peakSharpness);

  const ridgeAmp = WORLD.mountain.height * WORLD.mountain.ridgeNoise;
  const ridge = fbm(x + 500, z - 300, 0.03, ridgeAmp, 4, 0.55);
  h += ridge * (0.35 + 0.65 * t);

  return h;
}

// -------------------- Terrain height --------------------
function baseTerrainHeightAt(x, z) {
  const w = domainWarp(x, z);

  let h = fbm(w.x, w.z, WORLD.noiseScale, WORLD.heightAmp, WORLD.octaves, WORLD.persistence);
  h += fbm(w.x + 200, w.z - 120, WORLD.noiseScale * 0.33, WORLD.heightAmp * 0.7, 3, 0.6);

  const d = distanceToPolylineXZ(new THREE.Vector2(x, z), WORLD.river.points);
  h += riverCarveHeight(d, WORLD.river.width, WORLD.river.depth, WORLD.river.bankSmooth);

  return h;
}

function terrainHeightAt(x, z) {
  let h = baseTerrainHeightAt(x, z);
  h += mountainHeightAt(x, z);

  for (let i = 0; i < craterStamps.length; i++) {
    const s = craterStamps[i];
    h += craterDelta(x - s.x, z - s.z, s);
  }
  return h;
}

// -------------------- Earthquake displacement (runtime only) --------------------
let quakeBurstUntil = 0;

function quakeStrength(t) {
  const on = WORLD.quake.enabled || t < quakeBurstUntil;
  if (!on) return 0.0;

  const wobble = 0.75 + 0.25 * Math.sin(t * 1.7);
  return wobble;
}

function quakeDisplacementY(x, z, t) {
  const k = quakeStrength(t);
  if (k <= 0) return 0.0;

  const A = WORLD.quake.amp * k;
  const sf = WORLD.quake.spatialFreq;
  const tf = WORLD.quake.timeFreq;

  const w1 = Math.sin((x + z) * sf + t * tf);
  const w2 = Math.sin((x - z) * (sf * 0.85) - t * (tf * 1.15));
  const n = noise.noise(x * 0.03 + t * 1.3, 0, z * 0.03 - t * 1.1);

  return A * (0.55 * w1 + 0.35 * w2 + 0.2 * n);
}

// -------------------- Terrain shader material --------------------
function makeTerrainShaderMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.6, 1.0, 0.2).normalize() },
      uSunColor: { value: new THREE.Color(1.0, 0.93, 0.8) },
      uSkyColor: { value: new THREE.Color(0.55, 0.62, 0.72) },
      uFogColor: { value: new THREE.Color(scene.fog.color) },
      uFogDensity: { value: scene.fog.density },
      uNight: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying float vH;

      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vH = position.y;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uSkyColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uNight;

      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying float vH;

      float hash(vec2 p){
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      vec3 heightColor(float h, float slope) {
        vec3 deepGrass = vec3(0.06, 0.20, 0.11);
        vec3 grass     = vec3(0.14, 0.34, 0.18);
        vec3 dirt      = vec3(0.34, 0.30, 0.22);
        vec3 rock      = vec3(0.48, 0.48, 0.48);
        vec3 snow      = vec3(0.92, 0.92, 0.94);

        float g = smoothstep(-14.0, 10.0, h);
        float r = smoothstep(16.0, 32.0, h);
        float s = smoothstep(40.0, 70.0, h);

        vec3 base = mix(deepGrass, grass, g);
        base = mix(base, dirt, slope * 0.55);
        base = mix(base, rock, r + slope * 0.65);
        base = mix(base, snow, s);

        float n = hash(vWorldPos.xz * 0.15);
        base *= mix(0.92, 1.08, n);

        float ao = mix(0.78, 1.0, smoothstep(-15.0, 12.0, h));
        base *= ao;

        vec3 cool = vec3(0.65, 0.75, 1.05);
        base = mix(base, base * cool, uNight * 0.55);

        return base;
      }

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 L = normalize(uSunDir);

        float ndl = max(dot(N, L), 0.0);
        float slope = 1.0 - clamp(N.y, 0.0, 1.0);

        vec3 base = heightColor(vH, slope);

        vec3 ambient = (0.90 + 0.25*uNight) * uSkyColor;
        vec3 diffuse = ndl * uSunColor;

        vec3 V = normalize(cameraPosition - vWorldPos);
        float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0) * (0.18 + 0.12*uNight);

        vec3 col = base * (ambient + diffuse) + rim;

        float edge = smoothstep(100.0, 120.0, length(vWorldPos.xz));
        col *= (1.0 - edge * 0.35);

        float dist = length(vWorldPos);
        float fog = 1.0 - exp(-uFogDensity*uFogDensity*dist*dist);
        col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// -------------------- Build Terrain --------------------
let terrainMesh = null;
let terrainGeom = null;
let terrainBaseY = null;

function buildTerrain() {
  const geom = new THREE.PlaneGeometry(WORLD.size, WORLD.size, WORLD.segments, WORLD.segments);
  geom.rotateX(-Math.PI / 2);

  terrainGeom = geom;

  const pos = geom.attributes.position;
  terrainBaseY = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeightAt(x, z);
    pos.setY(i, y);
    terrainBaseY[i] = y;
  }

  pos.needsUpdate = true;
  geom.computeVertexNormals();

  const mat = makeTerrainShaderMaterial();
  terrainMesh = new THREE.Mesh(geom, mat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  return terrainMesh;
}

function refreshTerrainGeometry() {
  if (!terrainGeom) return;

  const pos = terrainGeom.attributes.position;
  if (!terrainBaseY || terrainBaseY.length !== pos.count) terrainBaseY = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeightAt(x, z);
    pos.setY(i, y);
    terrainBaseY[i] = y;
  }

  pos.needsUpdate = true;
  terrainGeom.computeVertexNormals();
  terrainGeom.attributes.position.needsUpdate = true;

  rebuildWaterMask();
  refreshBeaconHeights();
}

let normalRecalcAccum = 0;
function applyTerrainEarthquake(t, dt) {
  if (!terrainGeom || !terrainBaseY) return;

  const k = quakeStrength(t);
  if (k <= 0) return;

  const pos = terrainGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dy = quakeDisplacementY(x, z, t);
    pos.setY(i, terrainBaseY[i] + dy);
  }
  pos.needsUpdate = true;

  normalRecalcAccum += dt;
  if (normalRecalcAccum > 0.1) {
    terrainGeom.computeVertexNormals();
    normalRecalcAccum = 0;
  }
}

function resetTerrainToBase() {
  if (!terrainGeom || !terrainBaseY) return;
  const pos = terrainGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainBaseY[i]);
  pos.needsUpdate = true;
  terrainGeom.computeVertexNormals();
  normalRecalcAccum = 0;
}

// -------------------- Water --------------------
let water = null;
let waterGeom = null;

function buildWater() {
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, 220, 220);
  geo.rotateX(-Math.PI / 2);
  waterGeom = geo;

  const pos = geo.attributes.position;
  geo.setAttribute('aDepth', new THREE.BufferAttribute(new Float32Array(pos.count), 1));
  geo.setAttribute('aMask', new THREE.BufferAttribute(new Float32Array(pos.count), 1));
  geo.setAttribute('aFoam', new THREE.BufferAttribute(new Float32Array(pos.count), 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.86 },
      uDeep: { value: new THREE.Color(0x071f2f) },
      uShallow: { value: new THREE.Color(0x3bbde0) },
      uFoam: { value: new THREE.Color(0xdfeff6) },
      uFlowDir: { value: new THREE.Vector2(0.7, 0.25).normalize() },
      uSunDir: { value: new THREE.Vector3(0.6, 1.0, 0.2).normalize() },
      uSunColor: { value: new THREE.Color(1.0, 0.93, 0.8) },
      uNight: { value: 0.0 },
      uWorldHalf: { value: WORLD.size * 0.5 },
      uAgitate: { value: 1.0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform vec2 uFlowDir;
      uniform float uAgitate;

      attribute float aDepth;
      attribute float aMask;
      attribute float aFoam;

      varying vec3 vWorldPos;
      varying float vDepth;
      varying float vMask;
      varying float vFoam;
      varying float vWave;
      varying vec3 vN;

      float hash(vec2 p){
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 p = position;
        float t = uTime;

        float a1 = 0.07, b1 = 0.06, w1 = 0.9;
        float a2 = -0.05, b2 = 0.085, w2 = 0.6;

        float phase1 = (p.x * a1 + p.z * b1) + t * w1;
        float phase2 = (p.x * a2 + p.z * b2) + t * w2;

        float wave1 = sin(phase1);
        float wave2 = sin(phase2);

        float flow = dot(vec2(p.x, p.z), uFlowDir) * 0.06 + t * 0.7;
        float microPhase = flow + hash(vec2(p.x, p.z)) * 6.283;
        float micro = sin(microPhase) * 0.25;

        float h = (wave1 * 0.55 + wave2 * 0.45 + micro) * 0.45 * uAgitate;
        vWave = h;
        p.y += h;

        float dhdx =
          (cos(phase1) * (a1) * 0.55 +
           cos(phase2) * (a2) * 0.45) * 0.45 * uAgitate;

        float dhdz =
          (cos(phase1) * (b1) * 0.55 +
           cos(phase2) * (b2) * 0.45) * 0.45 * uAgitate;

        float dmicro = cos(microPhase) * 0.25 * 0.45 * uAgitate;
        dhdx += dmicro * (uFlowDir.x * 0.06);
        dhdz += dmicro * (uFlowDir.y * 0.06);

        vN = normalize(vec3(-dhdx, 1.0, -dhdz));

        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorldPos = world.xyz;

        vDepth = aDepth;
        vMask = aMask;
        vFoam = aFoam;

        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uOpacity;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFoam;

      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uWorldHalf;
      uniform float uNight;

      varying vec3 vWorldPos;
      varying float vDepth;
      varying float vMask;
      varying float vFoam;
      varying float vWave;
      varying vec3 vN;

      void main() {
        if (vMask < 0.5) discard;

        float edge = smoothstep(uWorldHalf * 0.88, uWorldHalf, length(vWorldPos.xz));

        vec3 shallow = mix(uShallow, uShallow * vec3(0.55, 0.70, 1.00), uNight);
        vec3 deep    = mix(uDeep,    uDeep    * vec3(0.40, 0.55, 0.95), uNight);

        vec3 col = mix(shallow, deep, vDepth);

        float foam = smoothstep(0.15, 0.85, vFoam);
        col = mix(col, uFoam, foam * 0.65);

        col += vec3(0.12) * smoothstep(0.06, 0.30, vWave + 0.14);

        vec3 N = normalize(vN);
        vec3 L = normalize(uSunDir);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 H = normalize(L + V);

        float specPow = mix(75.0, 95.0, uNight);
        float specAmp = mix(1.10, 0.55, uNight);
        float spec = pow(max(dot(N, H), 0.0), specPow) * specAmp;
        col += spec * uSunColor;

        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col += fres * mix(vec3(0.06, 0.08, 0.10), vec3(0.08, 0.10, 0.14), uNight);

        float alpha = uOpacity * (1.0 - edge);
        if (alpha < 0.02) discard;

        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  water = new THREE.Mesh(geo, mat);
  water.position.y = WORLD.waterLevel;
  water.receiveShadow = true;
  scene.add(water);

  rebuildWaterMask();
  return water;
}

function rebuildWaterMask() {
  if (!waterGeom) return;

  const pos = waterGeom.attributes.position;
  const aDepth = waterGeom.attributes.aDepth.array;
  const aMask = waterGeom.attributes.aMask.array;
  const aFoam = waterGeom.attributes.aFoam.array;

  const waterLevel = WORLD.waterLevel;
  const depthRange = 18.0;
  const foamWidth = 2.2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    const h = terrainHeightAt(x, z);
    const d = waterLevel - h;

    const mask = d > 0.1 ? 1.0 : 0.0;
    aMask[i] = mask;

    aDepth[i] = THREE.MathUtils.clamp(d / depthRange, 0, 1);

    const foam = 1.0 - THREE.MathUtils.clamp(d / foamWidth, 0, 1);
    aFoam[i] = mask * foam;
  }

  waterGeom.attributes.aDepth.needsUpdate = true;
  waterGeom.attributes.aMask.needsUpdate = true;
  waterGeom.attributes.aFoam.needsUpdate = true;
}

// -------------------- Trees --------------------
let forest = null;
let treeData = [];

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

function makeTreeGeometry() {
  const trunk = new THREE.CylinderGeometry(0.18, 0.26, 2.4, 7);
  trunk.translate(0, 1.2, 0);

  const foliage1 = new THREE.ConeGeometry(1.35, 3.0, 8);
  foliage1.translate(0, 3.2, 0);

  const foliage2 = new THREE.ConeGeometry(1.1, 2.6, 8);
  foliage2.translate(0, 4.4, 0);

  const foliage3 = new THREE.ConeGeometry(0.85, 2.2, 8);
  foliage3.translate(0, 5.4, 0);

  const merged = mergeGeometries([trunk, foliage1, foliage2, foliage3], false);
  merged.computeVertexNormals();
  return merged;
}

function makeTreeMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
  });
}

function colorizeTreeGeometry(geom) {
  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 2.7) {
      colors[i * 3 + 0] = 0.29;
      colors[i * 3 + 1] = 0.18;
      colors[i * 3 + 2] = 0.1;
    } else {
      colors[i * 3 + 0] = 0.12;
      colors[i * 3 + 1] = 0.4;
      colors[i * 3 + 2] = 0.2;
    }
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function isInsideMountainNoTreeZone(x, z) {
  if (!WORLD.mountain.enabled) return false;
  const dx = x - WORLD.mountain.x;
  const dz = z - WORLD.mountain.z;
  const r = Math.sqrt(dx * dx + dz * dz);
  return r <= WORLD.mountain.radius + WORLD.mountain.noTreesBuffer;
}

function buildForest() {
  const geom = makeTreeGeometry();
  colorizeTreeGeometry(geom);
  const mat = makeTreeMaterial();

  forest = new THREE.InstancedMesh(geom, mat, WORLD.treeCount);
  forest.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  forest.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(WORLD.treeCount * 3), 3);

  const half = WORLD.size * 0.5;
  const tmp = new THREE.Object3D();

  treeData = [];
  let placed = 0;
  let tries = 0;

  while (placed < WORLD.treeCount && tries < WORLD.treeCount * 60) {
    tries++;

    const x = randRange(-half * 0.95, half * 0.95);
    const z = randRange(-half * 0.95, half * 0.95);

    if (isInsideMountainNoTreeZone(x, z)) continue;

    const dRiver = distanceToPolylineXZ(new THREE.Vector2(x, z), WORLD.river.points);
    if (dRiver < WORLD.treeMinDistToRiver) continue;

    const y = terrainHeightAt(x, z);
    if (y < WORLD.waterLevel + 1.7) continue;

    const s = randRange(0.9, 2.25);
    const yaw = randRange(0, Math.PI * 2);

    const leanX = randRange(-0.08, 0.08);
    const leanZ = randRange(-0.08, 0.08);

    tmp.position.set(x, y - 0.18 * s, z);
    tmp.rotation.set(leanX, yaw, leanZ);
    tmp.scale.set(s, s, s);
    tmp.updateMatrix();

    forest.setMatrixAt(placed, tmp.matrix);

    const tint = randRange(0.78, 1.15);
    forest.instanceColor.setXYZ(placed, 0.14 * tint, 0.46 * tint, 0.22 * tint);

    treeData.push({ x, y, z, s, yaw, leanX, leanZ, bend: 0.0 });
    placed++;
  }

  forest.count = placed;
  forest.instanceMatrix.needsUpdate = true;
  forest.instanceColor.needsUpdate = true;

  forest.castShadow = true;
  scene.add(forest);
  return forest;
}

// -------------------- Shockwaves --------------------
const shockwaves = [];
function addShockwave(x, z, tNow) {
  shockwaves.push({ x, z, t0: tNow });
}

// -------------------- Ring Mesh (visual shockwave) --------------------
let ringMesh = null;
const ringMax = 24;

function buildRingMesh() {
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, 1, 1);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uParams: { value: new Float32Array(ringMax * 4) },
      uSpeed: { value: WORLD.shockwave.speed },
      uLife: { value: WORLD.shockwave.life },
      uThickness: { value: WORLD.shockwave.thickness },
      uStrength: { value: WORLD.shockwave.strength },
      uColor: { value: new THREE.Color(0x9fe9ff) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uTime;
      uniform float uSpeed;
      uniform float uLife;
      uniform float uThickness;
      uniform float uStrength;
      uniform vec3  uColor;
      uniform float uParams[${ringMax * 4}];

      varying vec3 vWorld;

      float ring(float d, float r, float thick){
        float a = smoothstep(r - thick, r, d);
        float b = smoothstep(r, r + thick, d);
        return a - b;
      }

      void main() {
        vec2 p = vWorld.xz;

        float glow = 0.0;
        for(int i=0; i<${ringMax}; i++){
          float alive = uParams[i*4 + 3];
          if(alive < 0.5) continue;

          vec2 c = vec2(uParams[i*4 + 0], uParams[i*4 + 1]);
          float t0 = uParams[i*4 + 2];

          float age = uTime - t0;
          if(age < 0.0 || age > uLife) continue;

          float r = age * uSpeed;
          float d = distance(p, c);

          float band = ring(d, r, uThickness);
          float fade = 1.0 - smoothstep(0.0, uLife, age);
          glow += band * fade;
        }

        glow = clamp(glow, 0.0, 1.0);
        if(glow < 0.01) discard;

        gl_FragColor = vec4(uColor, glow * 0.65 * uStrength);
      }
    `,
  });

  ringMesh = new THREE.Mesh(geo, mat);
  ringMesh.position.y = WORLD.waterLevel + 0.05;
  scene.add(ringMesh);
}

function updateRingUniforms(tNow) {
  if (!ringMesh) return;

  const arr = ringMesh.material.uniforms.uParams.value;
  for (let i = 0; i < ringMax * 4; i++) arr[i] = 0;

  const n = Math.min(shockwaves.length, ringMax);
  for (let i = 0; i < n; i++) {
    const s = shockwaves[shockwaves.length - 1 - i];
    arr[i * 4 + 0] = s.x;
    arr[i * 4 + 1] = s.z;
    arr[i * 4 + 2] = s.t0;
    arr[i * 4 + 3] = 1.0;
  }

  ringMesh.material.uniforms.uTime.value = tNow;
}

// -------------------- Sky Dome + Stars --------------------
const skyGeo = new THREE.SphereGeometry(1200, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    top: { value: new THREE.Color(0x2a4a7a) },
    horizon: { value: new THREE.Color(0x86c9ff) },
    bottom: { value: new THREE.Color(0xdff3ff) },
    night: { value: 0.0 },
  },
  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform vec3 top;
    uniform vec3 horizon;
    uniform vec3 bottom;
    uniform float night;
    varying vec3 vPos;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    void main() {
      float h = normalize(vPos).y * 0.5 + 0.5;

      vec3 dayCol = mix(bottom, horizon, smoothstep(0.0, 0.55, h));
      dayCol = mix(dayCol, top, smoothstep(0.55, 1.0, h));

      float s = 0.0;
      vec3 dir = normalize(vPos);
      float n = hash(dir.xz * 200.0 + dir.y * 40.0);
      float star = step(0.9965, n) * smoothstep(0.15, 0.75, h);
      s += star;

      vec3 nightSky = vec3(0.02, 0.03, 0.06) + s * vec3(1.0);

      vec3 col = mix(dayCol, nightSky, night);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const skyDome = new THREE.Mesh(skyGeo, skyMat);
scene.add(skyDome);

// -------------------- Lighting --------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.48);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 6.2);
sun.position.set(170, 280, 140);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 1000;
sun.shadow.camera.left = -240;
sun.shadow.camera.right = 240;
sun.shadow.camera.top = 240;
sun.shadow.camera.bottom = -240;
scene.add(sun);
scene.add(sun.target);

const moon = new THREE.DirectionalLight(0x9db6ff, 0.0);
moon.position.set(-170, 220, -140);
moon.castShadow = false;
scene.add(moon);
scene.add(moon.target);

const rim = new THREE.DirectionalLight(0x88aaff, 0.25);
rim.position.set(-260, 160, -140);
scene.add(rim);

// -------------------- Moon Sphere (comes/goes) --------------------
let moonBall = null;

function buildCuteMoonBall() {
  const geo = new THREE.SphereGeometry(WORLD.moonBall.radius, 22, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xcfd9ff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  moonBall = new THREE.Mesh(geo, mat);
  moonBall.renderOrder = 10;
  moonBall.frustumCulled = false;
  scene.add(moonBall);
}
buildCuteMoonBall();

// -------------------- PLAYER DRONE --------------------
const player = {
  group: new THREE.Group(),
  pos: new THREE.Vector3(-90, 10, -90),
  vel: new THREE.Vector3(),
  yaw: 0,
  pitch: -0.18,
};

function buildPlayer() {
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd8ebff,
    emissive: 0x113355,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.25,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x86efff,
    emissive: 0x38cfff,
    emissiveIntensity: 1.3,
    roughness: 0.2,
    metalness: 0.05,
  });

  const core = new THREE.Mesh(new THREE.SphereGeometry(1.15, 18, 14), bodyMat);
  core.castShadow = true;
  player.group.add(core);

  const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.1, 8);
  const armX = new THREE.Mesh(armGeo, bodyMat);
  armX.rotation.z = Math.PI / 2;
  player.group.add(armX);

  const armZ = new THREE.Mesh(armGeo, bodyMat);
  armZ.rotation.x = Math.PI / 2;
  player.group.add(armZ);

  const podPositions = [
    [1.55, 0, 0],
    [-1.55, 0, 0],
    [0, 0, 1.55],
    [0, 0, -1.55],
  ];

  for (const [x, y, z] of podPositions) {
    const pod = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), glowMat);
    pod.position.set(x, y, z);
    pod.castShadow = true;
    player.group.add(pod);
  }

  const underLight = new THREE.PointLight(0x7de8ff, 2.3, 22, 2.0);
  underLight.position.set(0, -1.8, 0);
  player.group.add(underLight);

  scene.add(player.group);
}

buildPlayer();

function resetPlayerSpawn() {
  const spawnX = -95;
  const spawnZ = -95;
  const spawnY = terrainHeightAt(spawnX, spawnZ) + 9;
  player.pos.set(spawnX, spawnY, spawnZ);
  player.vel.set(0, 0, 0);
  player.yaw = 0;
  player.pitch = -0.18;
  player.group.position.copy(player.pos);
}

// -------------------- BEACONS --------------------
let beaconGroup = null;
let beacons = [];

function makeBeaconMesh() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.9, 1.2, 8),
    new THREE.MeshStandardMaterial({
      color: 0x4a515f,
      roughness: 0.95,
      metalness: 0.05,
    })
  );
  base.castShadow = true;
  base.receiveShadow = true;
  base.position.y = 0.6;

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.38, 5.5, 10),
    new THREE.MeshStandardMaterial({
      color: 0x88ecff,
      emissive: 0x1c8cd7,
      emissiveIntensity: 1.05,
      roughness: 0.28,
      metalness: 0.12,
    })
  );
  pillar.castShadow = true;
  pillar.position.y = 3.6;

  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.08, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0xbef8ff,
      emissive: 0x21a2ff,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.1,
    })
  );
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = 4.9;

  const ring2 = ring1.clone();
  ring2.scale.setScalar(0.72);
  ring2.position.y = 2.5;

  const light = new THREE.PointLight(0x57dfff, 2.0, 24, 2.0);
  light.position.y = 4.2;

  group.add(base, pillar, ring1, ring2, light);
  return group;
}

function chooseBeaconPositions(count) {
  const result = [];
  const half = WORLD.size * 0.42;

  let tries = 0;
  while (result.length < count && tries < 3000) {
    tries++;

    const x = randRange(-half, half);
    const z = randRange(-half, half);
    const y = terrainHeightAt(x, z);

    if (y < WORLD.waterLevel + 4.0) continue;
    if (isInsideMountainNoTreeZone(x, z)) continue;

    const dRiver = distanceToPolylineXZ(new THREE.Vector2(x, z), WORLD.river.points);
    if (dRiver < WORLD.treeMinDistToRiver + 6) continue;

    let tooClose = false;
    for (const p of result) {
      const dx = p.x - x;
      const dz = p.z - z;
      if (Math.sqrt(dx * dx + dz * dz) < 42) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    result.push({ x, y, z });
  }

  return result;
}

function buildBeacons() {
  beaconGroup = new THREE.Group();
  scene.add(beaconGroup);
  beacons = [];

  const positions = chooseBeaconPositions(WORLD.game.beaconCount);

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const mesh = makeBeaconMesh();
    mesh.position.set(p.x, p.y, p.z);
    beaconGroup.add(mesh);

    beacons.push({
      x: p.x,
      y: p.y,
      z: p.z,
      activated: false,
      spin: Math.random() * Math.PI * 2,
      mesh,
    });
  }

  updateBeaconHUD();
}

function resetBeacons() {
  if (beaconGroup) scene.remove(beaconGroup);
  buildBeacons();
}

function refreshBeaconHeights() {
  for (const b of beacons) {
    b.y = terrainHeightAt(b.x, b.z);
    b.mesh.position.y = b.y;
  }
}

function updateBeaconHUD() {
  const remaining = beacons.filter((b) => !b.activated).length;
  beaconsLeftEl.textContent = remaining.toString();
}

function setBeaconGreen(beacon) {
  beacon.mesh.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material = obj.material.clone();
      if (obj.material.emissiveIntensity !== undefined) {
        obj.material.color = new THREE.Color(0xa8ffd2);
        obj.material.emissive = new THREE.Color(0x42ff8a);
        obj.material.emissiveIntensity = 1.6;
      }
    }
    if (obj.isPointLight) {
      obj.color.set(0x55ff88);
      obj.intensity = 3.2;
    }
  });
}

function updateBeaconAnimations(t) {
  for (const b of beacons) {
    b.spin += 0.01;
    b.mesh.rotation.y += b.activated ? 0.006 : 0.014;
    b.mesh.position.y = b.y + Math.sin(t * 2.4 + b.spin) * (b.activated ? 0.18 : 0.35);

    const rings = [];
    b.mesh.traverse((obj) => {
      if (obj.isMesh && obj.geometry?.type === 'TorusGeometry') rings.push(obj);
    });

    if (rings[0]) {
      rings[0].rotation.z += 0.02;
      if (b.activated) rings[0].scale.setScalar(1.08 + 0.04 * Math.sin(t * 5.0 + b.spin));
      else rings[0].scale.setScalar(1.0);
    }

    if (rings[1]) {
      rings[1].rotation.y += 0.03;
      if (b.activated) rings[1].scale.setScalar(0.82 + 0.04 * Math.sin(t * 6.0 + b.spin));
      else rings[1].scale.setScalar(0.72);
    }
  }
}

function nearestUnactivatedBeacon() {
  if (!beacons.length) return null;

  let best = null;
  let bestDist = Infinity;

  for (const b of beacons) {
    if (b.activated) continue;

    const dx = player.pos.x - b.x;
    const dz = player.pos.z - b.z;
    const d = Math.sqrt(dx * dx + dz * dz);

    if (d < bestDist) {
      bestDist = d;
      best = { beacon: b, dist: d };
    }
  }

  return best;
}

function tryActivateBeacon() {
  if (GAME.state !== 'PLAYING') return;

  const near = nearestUnactivatedBeacon();
  if (!near) return;

  if (near.dist <= WORLD.game.beaconActivateDistance) {
    near.beacon.activated = true;
    setBeaconGreen(near.beacon);
    updateBeaconHUD();

    const remaining = beacons.filter((b) => !b.activated).length;

    if (remaining === 0) {
      GAME.chainDeadlineAt = Infinity;
      winMission();
      return;
    }

    GAME.chainDeadlineAt = timeNow() + WORLD.game.beaconChainSeconds;
  }
}

buildBeacons();

// -------------------- Debris Particles --------------------
let debris = null;
let debrisData = [];

function buildDebris() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(WORLD.meteor.debrisCount * 3);
  const vel = new Float32Array(WORLD.meteor.debrisCount * 3);
  const life = new Float32Array(WORLD.meteor.debrisCount);

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));

  const mat = new THREE.PointsMaterial({
    size: 0.9,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  debris = new THREE.Points(geo, mat);
  debris.frustumCulled = false;
  scene.add(debris);

  debrisData = new Array(WORLD.meteor.debrisCount).fill(0).map(() => ({ life: 0 }));
  return debris;
}

function spawnDebris(x, y, z) {
  if (!debris) return;

  const pos = debris.geometry.attributes.position.array;
  const vel = debris.geometry.attributes.aVel.array;
  const life = debris.geometry.attributes.aLife.array;

  for (let i = 0; i < WORLD.meteor.debrisCount; i++) {
    const idx = i * 3;

    const ang = Math.random() * Math.PI * 2;
    const up = randRange(0.25, 1.0);
    const sp = randRange(14, 52);

    pos[idx + 0] = x + randRange(-1.2, 1.2);
    pos[idx + 1] = y + randRange(0.2, 1.2);
    pos[idx + 2] = z + randRange(-1.2, 1.2);

    vel[idx + 0] = Math.cos(ang) * sp * (1.0 - up);
    vel[idx + 1] = sp * up;
    vel[idx + 2] = Math.sin(ang) * sp * (1.0 - up);

    life[i] = WORLD.meteor.debrisLife;
    debrisData[i].life = WORLD.meteor.debrisLife;
  }

  debris.geometry.attributes.position.needsUpdate = true;
  debris.geometry.attributes.aVel.needsUpdate = true;
  debris.geometry.attributes.aLife.needsUpdate = true;

  debris.material.opacity = 0.85;
}

function updateDebris(dt) {
  if (!debris) return;

  const pos = debris.geometry.attributes.position.array;
  const vel = debris.geometry.attributes.aVel.array;
  const life = debris.geometry.attributes.aLife.array;

  let anyAlive = false;

  for (let i = 0; i < WORLD.meteor.debrisCount; i++) {
    if (life[i] <= 0) continue;

    anyAlive = true;
    const idx = i * 3;

    vel[idx + 1] -= WORLD.meteor.debrisGravity * dt;

    pos[idx + 0] += vel[idx + 0] * dt;
    pos[idx + 1] += vel[idx + 1] * dt;
    pos[idx + 2] += vel[idx + 2] * dt;

    const ground = terrainHeightAt(pos[idx + 0], pos[idx + 2]) + 0.15;
    if (pos[idx + 1] < ground) {
      pos[idx + 1] = ground;
      vel[idx + 0] *= 0.35;
      vel[idx + 1] *= -0.25;
      vel[idx + 2] *= 0.35;

      vel[idx + 0] *= 0.85;
      vel[idx + 2] *= 0.85;
    }

    life[i] -= dt;
  }

  debris.geometry.attributes.position.needsUpdate = true;
  debris.geometry.attributes.aLife.needsUpdate = true;

  if (!anyAlive) debris.material.opacity = Math.max(0, debris.material.opacity - dt * 2.5);
}

// -------------------- Meteor (falling) --------------------
let meteor = null;
let meteorTrail = null;
let activeMeteor = null;

function buildMeteor() {
  const geo = new THREE.IcosahedronGeometry(2.4, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x4a3a2b,
    roughness: 0.95,
    metalness: 0.0,
    emissive: new THREE.Color(0x220900),
    emissiveIntensity: 0.35,
  });

  meteor = new THREE.Mesh(geo, mat);
  meteor.castShadow = true;
  meteor.visible = false;
  scene.add(meteor);

  const tGeo = new THREE.CylinderGeometry(0.6, 1.6, 18, 8, 1, true);
  const tMat = new THREE.MeshBasicMaterial({
    color: 0xffa24a,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  meteorTrail = new THREE.Mesh(tGeo, tMat);
  meteorTrail.visible = false;
  scene.add(meteorTrail);
}

function startMeteorStrike(x, z, tNow) {
  activeMeteor = { x, z, y: WORLD.meteor.spawnHeight, v: WORLD.meteor.fallSpeed, spawnT: tNow };

  meteor.visible = true;
  meteor.position.set(x, activeMeteor.y, z);

  meteorTrail.visible = true;
  meteorTrail.position.set(x, activeMeteor.y - 9, z);
  meteorTrail.material.opacity = 0.6;
}

let destroyedScore = 0;

function impactAt(x, z, tNow) {
  const r = WORLD.crater.radius * randRange(1.15, 1.75);
  const d = WORLD.crater.depth * randRange(1.1, 1.65);

  craterStamps.push({
    x,
    z,
    radius: r,
    depth: d,
    rimHeight: WORLD.crater.rimHeight * randRange(1.0, 1.45),
    rimWidth: WORLD.crater.rimWidth * randRange(1.0, 1.55),
  });

  destroyedScore += Math.round(Math.PI * r * r);
  scoreEl.textContent = destroyedScore.toString();

  refreshTerrainGeometry();
  addShockwave(x, z, tNow);

  const blastRadius = 42;
  for (let i = 0; i < treeData.length; i++) {
    const tr = treeData[i];
    const dx = tr.x - x;
    const dz = tr.z - z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < blastRadius) tr.bend = Math.max(tr.bend, (1.0 - dist / blastRadius) * 1.0);
  }

  const y = terrainHeightAt(x, z) + 1.2;
  spawnDebris(x, y, z);

  quakeBurstUntil = Math.max(quakeBurstUntil, tNow + 0.55);

  if (GAME.state === 'PLAYING' && destroyedScore >= WORLD.game.collapseDamage) {
    loseMission('Meteor damage exceeded the limit. The planet collapsed.');
  }
}

// -------------------- Build world --------------------
buildTerrain();
buildWater();
buildForest();
buildRingMesh();
buildDebris();
buildMeteor();

// optional grid
const grid = new THREE.GridHelper(WORLD.size, 40, 0xffffff, 0xffffff);
grid.material.opacity = 0.04;
grid.material.transparent = true;
scene.add(grid);

// -------------------- Day/Night --------------------
function applyDayNightCycle(t) {
  const dayT = (t / WORLD.dayNight.secondsPerDay) % 1.0;
  const ang = dayT * Math.PI * 2.0 - Math.PI * 0.5;

  const sunY = Math.sin(ang);
  const daylight = THREE.MathUtils.clamp((sunY + 0.15) / 1.15, 0, 1);
  const night = 1.0 - daylight;

  const sr = WORLD.dayNight.sunRadius;
  const sh = WORLD.dayNight.sunHeight;

  sun.position.set(
    Math.cos(ang) * sr,
    (sunY * 0.5 + 0.5) * sh + 30,
    Math.sin(ang) * sr
  );
  sun.target.position.set(0, 0, 0);
  sun.target.updateMatrixWorld();

  const mang = ang + WORLD.dayNight.moonOffset;
  const moonY = Math.sin(mang);
  moon.position.set(
    Math.cos(mang) * sr,
    (moonY * 0.5 + 0.5) * (sh * 0.85) + 30,
    Math.sin(mang) * sr
  );
  moon.target.position.set(0, 0, 0);
  moon.target.updateMatrixWorld();

  const warm = 1.0 - Math.abs(sunY);
  const warmT = THREE.MathUtils.clamp((warm - 0.2) / 0.8, 0, 1);

  const noon = new THREE.Color(1.0, 0.95, 0.86);
  const sunset = new THREE.Color(1.0, 0.58, 0.28);
  const nightSun = new THREE.Color(0.55, 0.62, 0.8);

  const sunCol = new THREE.Color().copy(noon).lerp(sunset, warmT * 0.9);
  sunCol.lerp(nightSun, night * 0.7);
  sun.color.copy(sunCol);

  sun.intensity = THREE.MathUtils.lerp(0.0, 7.2, daylight);
  ambient.intensity = THREE.MathUtils.lerp(0.18, 0.55, daylight);
  moon.intensity = THREE.MathUtils.lerp(0.75, 0.0, daylight);
  rim.intensity = THREE.MathUtils.lerp(0.1, 0.25, daylight);

  const fogD = THREE.MathUtils.lerp(
    WORLD.dayNight.fogNightDensity,
    WORLD.dayNight.fogDayDensity,
    daylight
  );
  scene.fog.density = fogD;

  const dayFog = new THREE.Color(0x87c7ff);
  const nightFog = new THREE.Color(0x05070f);
  const fogCol = new THREE.Color().copy(nightFog).lerp(dayFog, daylight);
  scene.fog.color.copy(fogCol);
  scene.background.copy(fogCol);

  const dayTop = new THREE.Color(0x2a4a7a);
  const dayH = new THREE.Color(0x86c9ff);
  const dayB = new THREE.Color(0xdff3ff);

  const nightTop = new THREE.Color(0x02040b);
  const nightH = new THREE.Color(0x071027);
  const nightB = new THREE.Color(0x0a0f22);

  skyMat.uniforms.top.value.copy(nightTop).lerp(dayTop, daylight);
  skyMat.uniforms.horizon.value.copy(nightH).lerp(dayH, daylight);
  skyMat.uniforms.bottom.value.copy(nightB).lerp(dayB, daylight);
  skyMat.uniforms.night.value = night;

  if (terrainMesh) {
    const mat = terrainMesh.material;
    const sunDir = new THREE.Vector3().copy(sun.position).normalize();

    mat.uniforms.uSunDir.value.copy(sunDir);
    mat.uniforms.uSunColor.value.copy(sun.color);
    mat.uniforms.uSkyColor.value.set(
      THREE.MathUtils.lerp(0.1, 0.55, daylight),
      THREE.MathUtils.lerp(0.14, 0.62, daylight),
      THREE.MathUtils.lerp(0.22, 0.72, daylight)
    );
    mat.uniforms.uFogColor.value.copy(scene.fog.color);
    mat.uniforms.uFogDensity.value = scene.fog.density;
    mat.uniforms.uNight.value = night;
  }

  if (water) {
    const wmat = water.material;
    const sunDir = new THREE.Vector3().copy(sun.position).normalize();
    const moonDir = new THREE.Vector3().copy(moon.position).normalize();

    const specDir = new THREE.Vector3().copy(sunDir).lerp(moonDir, night).normalize();
    const specCol = new THREE.Color().copy(sun.color).lerp(new THREE.Color(0x9db6ff), night);

    wmat.uniforms.uSunDir.value.copy(specDir);
    wmat.uniforms.uSunColor.value.copy(specCol);
    wmat.uniforms.uNight.value = night;
  }

  if (moonBall) {
    const moonDir = new THREE.Vector3().copy(moon.position).normalize();
    const moonDist = WORLD.dayNight.sunRadius * WORLD.moonBall.distanceMul;

    moonBall.position.copy(moonDir).multiplyScalar(moonDist);

    const fade = THREE.MathUtils.smoothstep(
      night,
      WORLD.moonBall.fadeInAtNight,
      WORLD.moonBall.fadeFullAtNight
    );

    moonBall.material.opacity =
      WORLD.moonBall.baseOpacity + WORLD.moonBall.maxExtraOpacity * fade;
    moonBall.visible = fade > 0.02;

    const pulse = 1.0 + WORLD.moonBall.pulseAmp * Math.sin(t * WORLD.moonBall.pulseSpeed);
    moonBall.scale.setScalar(pulse);
  }
}

// -------------------- Shockwave propagation bending --------------------
function applyShockwaveBends(tNow) {
  if (!treeData || treeData.length === 0) return;
  if (shockwaves.length === 0) return;

  const speed = WORLD.shockwave.speed;
  const life = WORLD.shockwave.life;
  const band = WORLD.shockwave.bendBand;
  const strength = WORLD.shockwave.bendStrength;

  for (let si = 0; si < shockwaves.length; si++) {
    const sw = shockwaves[si];
    const age = tNow - sw.t0;
    if (age < 0 || age > life) continue;

    const ringR = age * speed;
    const fade = 1.0 - smooth01(age / life);

    for (let i = 0; i < treeData.length; i++) {
      const tr = treeData[i];
      const dx = tr.x - sw.x;
      const dz = tr.z - sw.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      const diff = Math.abs(dist - ringR);
      if (diff > band) continue;

      const impulse = (1.0 - diff / band) * fade * strength;
      tr.bend = Math.max(tr.bend, impulse);
    }
  }
}

// -------------------- Time --------------------
const clock = new THREE.Clock();
let tAcc = 0;
function timeNow() {
  return tAcc;
}

// -------------------- Disaster helpers --------------------
function scheduleNextRandomMeteor(now) {
  GAME.nextRandomMeteorAt =
    now + randRange(WORLD.game.randomMeteorMinGap, WORLD.game.randomMeteorMaxGap);
}

function scheduleNextRandomQuake(now) {
  GAME.nextRandomQuakeAt =
    now + randRange(WORLD.game.randomQuakeMinGap, WORLD.game.randomQuakeMaxGap);
}

function triggerAutoQuake(now) {
  quakeBurstUntil = Math.max(quakeBurstUntil, now + WORLD.quake.burstSeconds);
}

function updateWarningBanner(now) {
  if (GAME.state !== 'PLAYING') {
    warningEl.style.display = 'none';
    return;
  }

  if (GAME.currentLevel === 2) {
    warningEl.textContent = '🍩 Collect all Doracakes';
    warningEl.style.display = 'block';
    return;
  }

  if (now < GAME.disasterStartsAt) {
    const s = Math.max(0, Math.ceil(GAME.disasterStartsAt - now));
    warningEl.textContent = `⚠️ Disasters begin in ${s}s`;
    warningEl.style.display = 'block';
    return;
  }

  if (Number.isFinite(GAME.chainDeadlineAt)) {
    const s = Math.max(0, Math.ceil(GAME.chainDeadlineAt - now));
    warningEl.textContent = `🟢 Beacon stabilized — activate next beacon in ${s}s`;
    warningEl.style.display = 'block';
    return;
  }

  warningEl.textContent = '⚠️ Planet unstable — find a beacon';
  warningEl.style.display = 'block';
}

// -------------------- MISSION FLOW --------------------
function startMission() {
  GAME.currentLevel = 1;
  clearLevel2Scene();
  showOriginalPlayerDrone();
  if (terrainMesh) terrainMesh.visible = true;
  if (forest) forest.visible = true;
  if (water) water.visible = true;
  if (grid) grid.visible = true;
  if (beaconGroup) beaconGroup.visible = true;
  
  GAME.state = 'PLAYING';
  missionStateEl.textContent = 'Activate Beacons';
  startMenu.style.display = 'none';
  endScreen.style.display = 'none';
  promptEl.style.display = 'none';

  craterStamps.length = 0;
  destroyedScore = 0;
  scoreEl.textContent = '0';
  refreshTerrainGeometry();

  WORLD.quake.enabled = false;
  quakeBurstUntil = 0;
  resetTerrainToBase();

  if (activeMeteor) {
    meteor.visible = false;
    meteorTrail.visible = false;
    activeMeteor = null;
  }

  resetPlayerSpawn();
  resetBeacons();

  GAME.disasterStartsAt = timeNow() + WORLD.game.disasterStartDelay;
  GAME.chainDeadlineAt = Infinity;

  scheduleNextRandomMeteor(GAME.disasterStartsAt);
  scheduleNextRandomQuake(GAME.disasterStartsAt);
}

function winMission() {
  // Level 1 → go to Level 2
  if (GAME.currentLevel === 1) {
    startLevel2();
    return;
  }

  // Level 2 → final win
  if (GAME.currentLevel === 2) {
    GAME.state = 'WIN';

    missionStateEl.textContent = 'All Doracakes Collected!';
    promptEl.style.display = 'none';
    warningEl.style.display = 'none';

    endTitle.textContent = 'DORAEMON WINS';
    endMessage.textContent =
      'You collected all Doracakes and saved the city!';

    endScreen.style.display = 'flex';
  }
}

function loseMission(reason = 'Mission failed.') {
  GAME.state = 'LOSE';
  missionStateEl.textContent = 'Planet Collapsed';
  promptEl.style.display = 'none';
  warningEl.style.display = 'none';
  endTitle.textContent = 'GAME OVER';
  endMessage.textContent = reason;
  endScreen.style.display = 'flex';
}

startMissionBtn.addEventListener('click', startMission);
restartMissionBtn.addEventListener('click', startMission);

// -------------------- Meteor triggers --------------------
function triggerRandomMeteor() {
  const half = WORLD.size * 0.5 * 0.92;
  const x = randRange(-half, half);
  const z = randRange(-half, half);
  startMeteorStrike(x, z, timeNow());
}

meteorBtn.addEventListener('click', () => triggerRandomMeteor());

// -------------------- PLAYER INPUT --------------------
const keys = {};
let mouseLookActive = false;

addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if (e.code === 'KeyR') {
    startMission();
  }

  if (e.code === 'KeyE') {
    WORLD.quake.enabled = !WORLD.quake.enabled;
    if (!WORLD.quake.enabled) resetTerrainToBase();
  }

  if (e.code === 'KeyQ') {
    quakeBurstUntil = Math.max(quakeBurstUntil, timeNow() + WORLD.quake.burstSeconds);
  }

  if (e.code === 'KeyF') {
  if (GAME.currentLevel === 1) {
    tryActivateBeacon();
  } else {
    tryCollectDoracake();
  }
}

  if (e.code === 'KeyM') {
    triggerRandomMeteor();
  }

  if (e.code === 'KeyT') {
    GAME.debugFreeCamera = !GAME.debugFreeCamera;
    controls.enabled = GAME.debugFreeCamera;
  }
});

addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 2) mouseLookActive = true;
});

addEventListener('mouseup', (e) => {
  if (e.button === 2) mouseLookActive = false;
});

addEventListener('mousemove', (e) => {
  if (!mouseLookActive || GAME.debugFreeCamera || GAME.state !== 'PLAYING') return;

  player.yaw -= e.movementX * 0.0032;
  player.pitch -= e.movementY * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -0.55, 0.45);
});

// -------------------- PLAYER UPDATE --------------------
function updatePlayer(dt) {
  if (GAME.state !== 'PLAYING') return;

  if (keys['ArrowLeft']) player.yaw += WORLD.player.turnSpeed * dt;
  if (keys['ArrowRight']) player.yaw -= WORLD.player.turnSpeed * dt;

  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const move = new THREE.Vector3();

  if (keys['Space']) move.add(forward);
  if (keys['KeyA']) move.sub(right);
  if (keys['KeyD']) move.add(right);
  if (keys['KeyS']) move.sub(forward);

  if (move.lengthSq() > 0) move.normalize();

  const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
  const speed = WORLD.player.speed * (sprint ? WORLD.player.sprintMul : 1.0);

  player.vel.x = move.x * speed;
  player.vel.z = move.z * speed;

  if (keys['ArrowUp']) player.vel.y = WORLD.player.verticalSpeed;
  else if (keys['ArrowDown']) player.vel.y = -WORLD.player.verticalSpeed;
  else player.vel.y = THREE.MathUtils.lerp(player.vel.y, 0, 0.18);

  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.z += player.vel.z * dt;

  const half = WORLD.size * 0.5 - 5;
  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -half, half);
  player.pos.z = THREE.MathUtils.clamp(player.pos.z, -half, half);

  const ground = terrainHeightAt(player.pos.x, player.pos.z);
  const minY = ground + WORLD.player.minHoverHeight + Math.max(0, quakeStrength(timeNow()) * 1.0);
  const maxY = WORLD.player.maxHeight;

  if (player.pos.y < minY) player.pos.y = minY;
  if (player.pos.y > maxY) player.pos.y = maxY;

  player.group.position.copy(player.pos);

  const bank = THREE.MathUtils.clamp(-player.vel.x * 0.01, -0.28, 0.28);
  const pitchTilt = THREE.MathUtils.clamp(player.vel.z * 0.008, -0.18, 0.18);
  player.group.rotation.set(pitchTilt, -player.yaw, bank);
}

function updateFollowCamera() {
  if (GAME.debugFreeCamera) {
    controls.update();
    return;
  }

  const cp = Math.cos(player.pitch);
  const sp = Math.sin(player.pitch);
  const sy = Math.sin(player.yaw);
  const cy = Math.cos(player.yaw);

  const lookDir = new THREE.Vector3(sy * cp, sp, cy * cp).normalize();

  const camPos = player.pos.clone().addScaledVector(lookDir, -WORLD.player.camDistance);
  camPos.y += WORLD.player.camHeight;

  camera.position.lerp(camPos, WORLD.player.camSmooth);

  const lookTarget = player.pos.clone().addScaledVector(lookDir, 12);
  lookTarget.y += 1.6;
  camera.lookAt(lookTarget);
}

// -------------------- Animate --------------------
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(0.033, clock.getDelta());
  tAcc += dt;
  const t = tAcc;

  if (WORLD.dayNight.enabled) applyDayNightCycle(t);
  updateWarningBanner(t);

  const disastersActive =
  GAME.state === 'PLAYING' &&
  GAME.currentLevel === 1 &&   // 🔥 ADD THIS
  t >= GAME.disasterStartsAt &&
  !Number.isFinite(GAME.chainDeadlineAt);

  if (disastersActive && !activeMeteor && t >= GAME.nextRandomMeteorAt) {
    triggerRandomMeteor();
    scheduleNextRandomMeteor(t);
  }

  if (disastersActive && t >= GAME.nextRandomQuakeAt) {
    triggerAutoQuake(t);
    scheduleNextRandomQuake(t);
  }

  if (GAME.state === 'PLAYING' && Number.isFinite(GAME.chainDeadlineAt) && t > GAME.chainDeadlineAt) {
    loseMission('You failed to activate the next beacon before stabilization expired.');
  }

  updatePlayer(dt);
  updateFollowCamera();
  if (GAME.currentLevel === 2) {
  updateLevel2(dt);
}

  const q = quakeStrength(t);

  if (q > 0) {
    applyTerrainEarthquake(t, dt);
  } else {
    if (!WORLD.quake.enabled) resetTerrainToBase();
  }

  if (water) {
    water.material.uniforms.uTime.value = t;
    water.material.uniforms.uAgitate.value = 1.0 + q * (WORLD.quake.waterBoost - 1.0);
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    if (t - shockwaves[i].t0 > WORLD.shockwave.life) shockwaves.splice(i, 1);
  }
  updateRingUniforms(t);
  applyShockwaveBends(t);

  if (activeMeteor) {
    activeMeteor.y -= activeMeteor.v * dt;

    meteor.position.set(activeMeteor.x, activeMeteor.y, activeMeteor.z);
    meteor.rotation.y += dt * 3.2;
    meteor.rotation.x += dt * 2.1;

    meteorTrail.position.set(activeMeteor.x, activeMeteor.y - 9, activeMeteor.z);
    meteorTrail.material.opacity = Math.max(
      0,
      meteorTrail.material.opacity - dt * (1.0 / WORLD.meteor.trailLife)
    );

    const ground = terrainHeightAt(activeMeteor.x, activeMeteor.z) + 1.2;
    if (activeMeteor.y <= ground) {
      impactAt(activeMeteor.x, activeMeteor.z, t);
      meteor.visible = false;
      meteorTrail.visible = false;
      activeMeteor = null;
    } else {
      meteorTrail.material.opacity = Math.min(0.75, meteorTrail.material.opacity + dt * 2.2);
    }
  }

  updateDebris(dt);
  updateBeaconAnimations(t);

  if (GAME.state === 'PLAYING') {
  if (GAME.currentLevel === 1) {
    const near = nearestUnactivatedBeacon();
    if (near && near.dist <= WORLD.game.beaconActivateDistance) {
      promptEl.textContent = 'Press F to activate beacon';
      promptEl.style.display = 'block';
    } else {
      promptEl.style.display = 'none';
    }
  } else {
    let nearCake = false;

    for (const d of LEVEL2.doracakes) {
      if (d.collected) continue;

      const box = new THREE.Box3().setFromObject(d.mesh);
      const center = new THREE.Vector3();
      box.getCenter(center);

      if (player.pos.distanceTo(center) < 14) {
        nearCake = true;
        break;
      }
    }

    if (nearCake) {
      promptEl.textContent = 'Press F to collect Doracake';
      promptEl.style.display = 'block';
    } else {
      promptEl.style.display = 'none';
    }
  }
} else {
  promptEl.style.display = 'none';
}

  if (forest && treeData.length > 0) {
    const tmp = new THREE.Object3D();
    const quakeTreeBoost = 1.0 + q * (WORLD.quake.treeBoost - 1.0);

    for (let i = 0; i < forest.count; i++) {
      const tr = treeData[i];

      const sway =
        0.22 *
        Math.sin(t * 0.9 + tr.x * 0.05 + tr.z * 0.04) *
        (0.65 + 0.35 * Math.sin(t * 0.33 + tr.x * 0.02));

      const qw =
        q *
        0.22 *
        Math.sin(t * 6.2 + tr.x * 0.06 - tr.z * 0.05) *
        quakeTreeBoost;

      tr.bend *= 0.92;

      let bx = 0.0;
      let bz = 0.0;
      if (shockwaves.length > 0 && tr.bend > 0.001) {
        const s = shockwaves[shockwaves.length - 1];
        const dx = tr.x - s.x;
        const dz = tr.z - s.z;
        const len = Math.max(1e-6, Math.sqrt(dx * dx + dz * dz));
        bx = (dx / len) * tr.bend * 0.25;
        bz = (dz / len) * tr.bend * 0.25;
      }

      tmp.position.set(tr.x, tr.y - 0.18 * tr.s, tr.z);
      tmp.rotation.set(
        tr.leanX + sway * 0.12 + bz + qw,
        tr.yaw,
        tr.leanZ + sway * 0.1 - bx + qw
      );
      tmp.scale.set(tr.s, tr.s, tr.s);
      tmp.updateMatrix();

      forest.setMatrixAt(i, tmp.matrix);
    }
    forest.instanceMatrix.needsUpdate = true;
  }

  if (q > 0 && !GAME.debugFreeCamera) {
    const basePos = camera.position.clone();

    const ca = WORLD.quake.cameraAmp * q;
    const sx = (Math.sin(t * 23.0) + Math.sin(t * 17.0 + 1.7)) * 0.5;
    const sy = (Math.sin(t * 29.0 + 0.8) + Math.sin(t * 13.0)) * 0.5;
    const sz = (Math.sin(t * 19.0 + 2.2) + Math.sin(t * 11.0 + 0.4)) * 0.5;

    camera.position.set(basePos.x + sx * ca, basePos.y + sy * (ca * 0.7), basePos.z + sz * ca);
    renderer.render(scene, camera);
    camera.position.copy(basePos);
  } else {
    renderer.render(scene, camera);
  }

  stats.update();
}
animate();

// -------------------- Initial HUD --------------------
missionStateEl.textContent = 'Awaiting Mission';
updateBeaconHUD();
damageLimitEl.textContent = WORLD.game.collapseDamage.toString();

// -------------------- Resize --------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});