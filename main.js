import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function normalizeScale(model, targetHeight) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const scale = targetHeight / size.y;
  model.scale.setScalar(scale);
}

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

warningEl.style.padding = '13px 26px';
warningEl.style.minWidth = '420px';
warningEl.style.textAlign = 'center';

warningEl.style.borderRadius = '18px';
warningEl.style.background =
  'linear-gradient(135deg, rgba(80,24,58,0.92), rgba(130,28,64,0.88), rgba(70,18,52,0.92))';

warningEl.style.border = '1px solid rgba(255,105,190,0.45)';
warningEl.style.boxShadow =
  '0 0 14px rgba(255,80,180,0.55), inset 0 0 16px rgba(255,120,210,0.18)';

warningEl.style.backdropFilter = 'blur(10px)';
warningEl.style.color = '#ffffff';
warningEl.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';
warningEl.style.fontSize = '15px';
warningEl.style.fontWeight = '800';
warningEl.style.letterSpacing = '0.3px';

warningEl.style.display = 'none';
warningEl.style.zIndex = '65';
warningEl.style.animation = 'warningGlowPulse 1.8s ease-in-out infinite';

document.body.appendChild(warningEl);

const warningGlowStyle = document.createElement('style');
warningGlowStyle.textContent = `
  @keyframes warningGlowPulse {
    0% {
      box-shadow:
        0 0 10px rgba(255,80,180,0.45),
        inset 0 0 12px rgba(255,120,210,0.14);
    }

    50% {
      box-shadow:
        0 0 24px rgba(255,80,180,0.85),
        0 0 42px rgba(255,0,140,0.30),
        inset 0 0 18px rgba(255,160,220,0.24);
    }

    100% {
      box-shadow:
        0 0 10px rgba(255,80,180,0.45),
        inset 0 0 12px rgba(255,120,210,0.14);
    }
  }
`;
document.head.appendChild(warningGlowStyle);

// -------------------- Simple Level Music --------------------
const music1 = new Audio('/music/level1.mp3');
const music2 = new Audio('/music/level2.mp3');
const music3 = new Audio('/music/level3.mp3');

music1.loop = true;
music2.loop = true;
music3.loop = true;

music1.volume = 0.35;
music2.volume = 0.35;
music3.volume = 0.35;

function stopMusic() {
  music1.pause();
  music2.pause();
  music3.pause();

  music1.currentTime = 0;
  music2.currentTime = 0;
  music3.currentTime = 0;
}

function playMusic(level) {
  stopMusic();

  let m = null;

  if (level === 1) m = music1;
  if (level === 2) m = music2;
  if (level === 3) m = music3;

  if (m) {
    m.play().catch(() => {
      console.log('Music will start after user interaction.');
    });
  }
}

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

    beaconChainSeconds: 20.0,
  },

  player: {
    speed: 30,
    sprintMul: 1.55,
    verticalSpeed: 14,
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
  if (!terrainBaseY || terrainBaseY.length !== pos.count) {
    terrainBaseY = new Float32Array(pos.count);
  }

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

  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrainBaseY[i]);
  }

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
  forest.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(WORLD.treeCount * 3),
    3
  );

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

// -------------------- Ring Mesh visual shockwave --------------------
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

        for(int i = 0; i < ${ringMax}; i++){
          float alive = uParams[i * 4 + 3];
          if(alive < 0.5) continue;

          vec2 c = vec2(uParams[i * 4 + 0], uParams[i * 4 + 1]);
          float t0 = uParams[i * 4 + 2];

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

  for (let i = 0; i < ringMax * 4; i++) {
    arr[i] = 0;
  }

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

// -------------------- Sky Dome and Stars --------------------
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

// -------------------- Moon Sphere --------------------
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

// -------------------- Player Drone --------------------
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

// -------------------- Beacons --------------------
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
  if (beaconGroup) {
    scene.remove(beaconGroup);
  }

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
    b.mesh.position.y =
      b.y + Math.sin(t * 2.4 + b.spin) * (b.activated ? 0.18 : 0.35);

    const rings = [];

    b.mesh.traverse((obj) => {
      if (obj.isMesh && obj.geometry?.type === 'TorusGeometry') {
        rings.push(obj);
      }
    });

    if (rings[0]) {
      rings[0].rotation.z += 0.02;

      if (b.activated) {
        rings[0].scale.setScalar(1.08 + 0.04 * Math.sin(t * 5.0 + b.spin));
      } else {
        rings[0].scale.setScalar(1.0);
      }
    }

    if (rings[1]) {
      rings[1].rotation.y += 0.03;

      if (b.activated) {
        rings[1].scale.setScalar(0.82 + 0.04 * Math.sin(t * 6.0 + b.spin));
      } else {
        rings[1].scale.setScalar(0.72);
      }
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

  debrisData = new Array(WORLD.meteor.debrisCount)
    .fill(0)
    .map(() => ({ life: 0 }));

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

  if (!anyAlive) {
    debris.material.opacity = Math.max(0, debris.material.opacity - dt * 2.5);
  }
}
// -------------------- Meteor falling --------------------
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
  activeMeteor = {
    x,
    z,
    y: WORLD.meteor.spawnHeight,
    v: WORLD.meteor.fallSpeed,
    spawnT: tNow,
  };

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

    if (dist < blastRadius) {
      tr.bend = Math.max(tr.bend, (1.0 - dist / blastRadius) * 1.0);
    }
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

const grid = new THREE.GridHelper(WORLD.size, 40, 0xffffff, 0xffffff);
grid.material.opacity = 0.04;
grid.material.transparent = true;
scene.add(grid);

// -------------------- Day and Night --------------------
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
      WORLD.moonBall.baseOpacity +
      fade * WORLD.moonBall.maxExtraOpacity +
      Math.sin(t * WORLD.moonBall.pulseSpeed) * WORLD.moonBall.pulseAmp * fade;
  }
}

// -------------------- Forest Animation --------------------
function updateForest(t, dt) {
  if (!forest) return;

  const tmp = new THREE.Object3D();

  for (let i = 0; i < treeData.length; i++) {
    const tr = treeData[i];

    const quake = quakeStrength(t);
    const shake =
      Math.sin(t * WORLD.quake.timeFreq + tr.x * 0.1 + tr.z * 0.07) *
      WORLD.quake.treeBoost *
      quake *
      0.045;

    tr.bend = Math.max(0, tr.bend - dt * 0.55);

    const bend = tr.bend * 0.18;

    tmp.position.set(tr.x, tr.y - 0.18 * tr.s, tr.z);
    tmp.rotation.set(
      tr.leanX + bend + shake,
      tr.yaw,
      tr.leanZ + bend * 0.6 - shake
    );
    tmp.scale.set(tr.s, tr.s, tr.s);
    tmp.updateMatrix();

    forest.setMatrixAt(i, tmp.matrix);
  }

  forest.instanceMatrix.needsUpdate = true;
}

// -------------------- Player Controls --------------------
const keys = new Set();

window.addEventListener('keydown', (e) => {
  keys.add(e.code);

  if (e.code === 'KeyF') {
  if (GAME.currentLevel === 1) {
    tryActivateBeacon();
  }

  if (GAME.currentLevel === 2) {
    tryCollectDoracake();
  }

  if (GAME.currentLevel === 3) {
    tryRescueLevel3Humans();
  }
}

  if (e.code === 'KeyM') {
    const t = timeNow();
    const x = player.pos.x + Math.sin(player.yaw) * 22;
    const z = player.pos.z + Math.cos(player.yaw) * 22;
    startMeteorStrike(x, z, t);
  }

  if (e.code === 'KeyE') {
    WORLD.quake.enabled = !WORLD.quake.enabled;
  }

  if (e.code === 'KeyQ') {
    quakeBurstUntil = timeNow() + WORLD.quake.burstSeconds;
  }

  if (e.code === 'KeyR') {
    startMission();
  }

  if (e.code === 'KeyT') {
    GAME.debugFreeCamera = !GAME.debugFreeCamera;
    controls.enabled = GAME.debugFreeCamera;
  }
  // QUICK DEMO SHORTCUTS
// Press 2 to directly test Level 2
// DEMO SHORTCUTS
if (e.code === 'Digit1') {
  startMission();
}

if (e.code === 'Digit2') {
  startLevel2();
}

if (e.code === 'Digit3') {
  startLevel3();
}
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});

let rightMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

window.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    rightMouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    rightMouseDown = false;
  }
});

window.addEventListener('mousemove', (e) => {
  if (!rightMouseDown) return;
  if (GAME.debugFreeCamera) return;

  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;

  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  player.yaw -= dx * 0.004;
  player.pitch -= dy * 0.0025;

  player.pitch = THREE.MathUtils.clamp(player.pitch, -0.9, 0.35);
});

// -------------------- Camera / Player Update --------------------
// -------------------- Camera / Player Update --------------------
function updatePlayer(dt) {
  if (GAME.state !== 'PLAYING') return;

  let levelSpeed = WORLD.player.speed;

  if (GAME.currentLevel === 2) {
    // Level 2 free Doraemon movement
    levelSpeed = 55;
  }

  if (GAME.currentLevel === 3) {
    levelSpeed = 58;
  }

  const sprint =
    keys.has('ShiftLeft') || keys.has('ShiftRight');

  const speed =
    levelSpeed * (sprint ? WORLD.player.sprintMul : 1.0);

  // Turn left/right
  if (keys.has('ArrowLeft')) {
    player.yaw += WORLD.player.turnSpeed * dt;
  }

  if (keys.has('ArrowRight')) {
    player.yaw -= WORLD.player.turnSpeed * dt;
  }

  const forward = new THREE.Vector3(
    Math.sin(player.yaw),
    0,
    Math.cos(player.yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(player.yaw),
    0,
    -Math.sin(player.yaw)
  );

  // Free movement
  if (keys.has('Space') || keys.has('KeyW')) {
    player.pos.addScaledVector(forward, speed * dt);
  }

  if (keys.has('KeyS')) {
    player.pos.addScaledVector(forward, -speed * dt);
  }

  if (keys.has('KeyA')) {
    player.pos.addScaledVector(right, -speed * dt);
  }

  if (keys.has('KeyD')) {
    player.pos.addScaledVector(right, speed * dt);
  }

  // Up/down movement
  if (keys.has('ArrowUp')) {
    player.pos.y += WORLD.player.verticalSpeed * dt;
  }

  if (keys.has('ArrowDown')) {
    player.pos.y -= WORLD.player.verticalSpeed * dt;
  }

  // LEVEL 1 movement limits
  if (GAME.currentLevel === 1) {
    const half = WORLD.size * 0.5 - 4;

    player.pos.x = THREE.MathUtils.clamp(player.pos.x, -half, half);
    player.pos.z = THREE.MathUtils.clamp(player.pos.z, -half, half);

    const groundY = terrainHeightAt(player.pos.x, player.pos.z);
    const minY = groundY + WORLD.player.minHoverHeight;
    const maxY = groundY + WORLD.player.maxHeight;

    player.pos.y = THREE.MathUtils.clamp(player.pos.y, minY, maxY);
  }

  // LEVEL 2 free city movement
  if (GAME.currentLevel === 2 && LEVEL2.cityReady) {
    player.pos.x = THREE.MathUtils.clamp(
      player.pos.x,
      LEVEL2.bounds.minX,
      LEVEL2.bounds.maxX
    );

    player.pos.z = THREE.MathUtils.clamp(
      player.pos.z,
      LEVEL2.bounds.minZ,
      LEVEL2.bounds.maxZ
    );

    // Keep Doraemon above the city road level but still allow up/down
    player.pos.y = THREE.MathUtils.clamp(
      player.pos.y,
      LEVEL2.groundY + 6,
      LEVEL2.groundY + 35
    );
  }

  // LEVEL 3 movement limits
  if (GAME.currentLevel === 3 && LEVEL3.cityReady) {
    player.pos.x = THREE.MathUtils.clamp(
      player.pos.x,
      LEVEL3.bounds.minX,
      LEVEL3.bounds.maxX
    );

    player.pos.z = THREE.MathUtils.clamp(
      player.pos.z,
      LEVEL3.bounds.minZ,
      LEVEL3.bounds.maxZ
    );

    player.pos.y = THREE.MathUtils.clamp(
      player.pos.y,
      LEVEL3.playerMinY,
      LEVEL3.playerMaxY
    );
  }

  player.group.position.copy(player.pos);

  const bank = THREE.MathUtils.clamp(-player.vel.x * 0.01, -0.28, 0.28);
  player.group.rotation.set(0, -player.yaw, bank);
}

// ============================================================
// LEVEL 2 — SMOOTH DORAEMON CITY RESCUE
// ============================================================


const level2Loader = new GLTFLoader();

const LEVEL2 = {
  cityCenter: new THREE.Vector3(),
  doracakes: [],
  gadgets: [],
  collected: 0,
  total: 5,
  lives: 3,
  meteors: [],
  nextMeteor: Infinity,
  doraemon: null,
  impactFX: [],
  buildingBoxes: [],
  buildingParts: [],
  cityReady: false,
  lastSafePos: new THREE.Vector3(),
  invincibleUntil: 0,
  speedBoostUntil: 0,
  quakeUntil: 0,
  quakePower: 0,
  cakeDeadlineAt: Infinity,
  stabilizeUntil: 0,
  completed: false,

  bounds: { minX: -70, maxX: 70, minZ: -70, maxZ: 70 },
  groundY: 0,
  playerMinY: 4,
  playerMaxY: 26
};

let LEVEL2_CITY = null;
let DORACAKE_MODEL = null;

function hideOriginalPlayerDrone() {
  for (const child of [...player.group.children]) {
    if (child.isLight) continue;
    child.visible = false;
  }
}

function showOriginalPlayerDrone() {
  for (const child of [...player.group.children]) {
    child.visible = true;
  }
}

function clearLevel2Scene() {
  // Remove city
  if (LEVEL2_CITY) {
    scene.remove(LEVEL2_CITY);
    LEVEL2_CITY = null;
  }

  // Remove doracakes
  for (const d of LEVEL2.doracakes) {
    if (d.mesh) scene.remove(d.mesh);
  }

  // Remove gadgets
  for (const g of LEVEL2.gadgets) {
    if (g.mesh) scene.remove(g.mesh);
  }

  // Remove meteors
  for (const m of LEVEL2.meteors) {
    if (m) scene.remove(m);
  }

  // Remove impact FX
  for (const fx of LEVEL2.impactFX) {
    if (fx.mesh) scene.remove(fx.mesh);
  }

  // Remove Doraemon
  if (LEVEL2.doraemon && LEVEL2.doraemon.parent) {
    LEVEL2.doraemon.parent.remove(LEVEL2.doraemon);
  }

  // FULL RESET (IMPORTANT)
  LEVEL2.doracakes = [];
  LEVEL2.gadgets = [];
  LEVEL2.meteors = [];
  LEVEL2.impactFX = [];
  LEVEL2.buildingBoxes = [];
  LEVEL2.buildingParts = [];
  LEVEL2.doraemon = null;

  LEVEL2.collected = 0;
  LEVEL2.lives = 3;
  LEVEL2.total = 5;

  LEVEL2.nextMeteor = Infinity;
  LEVEL2.cityReady = false;

  LEVEL2.invincibleUntil = 0;
  LEVEL2.speedBoostUntil = 0;

  LEVEL2.quakeUntil = 0;
  LEVEL2.quakePower = 0;

  LEVEL2.cakeDeadlineAt = Infinity;
  LEVEL2.stabilizeUntil = 0;

  LEVEL2.completed = false; // ✅ MUST BE HERE (not inside if block)
}

function startLevel2() {
  GAME.currentLevel = 2;
  GAME.state = 'PLAYING';
  playMusic(2);

  GAME.chainDeadlineAt = Infinity;
  GAME.disasterStartsAt = Infinity;
  GAME.nextRandomMeteorAt = Infinity;
  GAME.nextRandomQuakeAt = Infinity;

  clearLevel2Scene();

  LEVEL2.invincibleUntil = timeNow() + 8;
  LEVEL2.stabilizeUntil = timeNow() + 5;
  LEVEL2.cakeDeadlineAt = timeNow() + 45;
  LEVEL2.nextMeteor = timeNow() + 5;

  if (terrainMesh) terrainMesh.visible = false;
  if (forest) forest.visible = false;
  if (water) water.visible = false;
  if (grid) grid.visible = false;
  if (beaconGroup) beaconGroup.visible = false;

  hideOriginalPlayerDrone();

  missionStateEl.textContent = 'City Rescue';
  damageLimitEl.textContent = 'Lives: ' + LEVEL2.lives;
  beaconsLeftEl.textContent = LEVEL2.total.toString();

  promptEl.style.display = 'none';
  warningEl.style.display = 'block';
  warningEl.textContent = '🍩 Collect Doracakes. City is stable for 5 seconds.';

  loadLevel2Assets();
}

function loadLevel2Assets() {
  level2Loader.load('/models/city.glb', (gltf) => {
    const city = gltf.scene;
    LEVEL2_CITY = city;
    scene.add(city);

    const box = new THREE.Box3().setFromObject(city);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const scale = 150 / Math.max(size.x, size.z);
    city.scale.setScalar(scale);

    city.position.x = -center.x * scale;
    city.position.z = -center.z * scale;
    city.position.y = -box.min.y * scale;

    city.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;

        if (obj.material) {
          obj.material = obj.material.clone();
          obj.material.side = THREE.DoubleSide;
          obj.material.needsUpdate = true;
        }
      }
    });

    const finalBox = new THREE.Box3().setFromObject(city);
    finalBox.getCenter(LEVEL2.cityCenter);

    LEVEL2.groundY = finalBox.min.y;
    LEVEL2.playerMinY = LEVEL2.groundY + 4;
    LEVEL2.playerMaxY = LEVEL2.groundY + 28;

    LEVEL2.bounds = {
      minX: finalBox.min.x + 8,
      maxX: finalBox.max.x - 8,
      minZ: finalBox.min.z + 8,
      maxZ: finalBox.max.z - 8
    };

    buildCityCollisionBoxes();

    player.pos.set(
      LEVEL2.cityCenter.x - 48,
      LEVEL2.groundY + 8,
      LEVEL2.cityCenter.z - 48
    );

    player.vel.set(0, 0, 0);
    player.yaw = Math.PI / 4;
    player.pitch = -0.18;
    player.group.position.copy(player.pos);
    LEVEL2.lastSafePos.copy(player.pos);

    LEVEL2.cityReady = true;
    LEVEL2.nextMeteor = timeNow() + 5;
    LEVEL2.cakeDeadlineAt = timeNow() + 45;

    spawnDoracakes();
  });

  level2Loader.load('/models/doraemon.glb', (gltf) => {
    const d = gltf.scene;
    LEVEL2.doraemon = d;

    d.scale.set(0.6, 0.6, 0.6);
    d.position.set(0, 0, 0);
    d.rotation.y = Math.PI; // face forward correctly

    d.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    player.group.add(d);
  });

  level2Loader.load('/models/doracake.glb', (gltf) => {
    DORACAKE_MODEL = gltf.scene;
  });
}

function buildCityCollisionBoxes() {
  LEVEL2.buildingBoxes = [];
  LEVEL2.buildingParts = [];

  if (!LEVEL2_CITY) return;

  LEVEL2_CITY.traverse((obj) => {
    if (!obj.isMesh) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);

    if (size.y < 8) return;
    if (size.x < 3 || size.z < 3) return;

    LEVEL2.buildingBoxes.push({ mesh: obj, box });

    LEVEL2.buildingParts.push({
      mesh: obj,
      baseX: obj.position.x,
      baseY: obj.position.y,
      baseZ: obj.position.z,
      baseRX: obj.rotation.x,
      baseRY: obj.rotation.y,
      baseRZ: obj.rotation.z,
      seed: Math.random() * 100
    });
  });

  refreshBuildingBoxes();
}

function refreshBuildingBoxes() {
  for (const b of LEVEL2.buildingBoxes) {
    b.box.setFromObject(b.mesh);
  }
}

function makeFallbackDoracake() {
  const group = new THREE.Group();

  const cake = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 1.0, 32),
    new THREE.MeshStandardMaterial({
      color: 0x9b5a20,
      emissive: 0x3a1600,
      emissiveIntensity: 0.4,
      roughness: 0.7
    })
  );

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.25, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffcf7a,
      emissive: 0x5a2600,
      emissiveIntensity: 0.35,
      roughness: 0.6
    })
  );

  top.position.y = 0.65;
  group.add(cake, top);
  return group;
}

function spawnDoracakes() {
  const c = LEVEL2.cityCenter;

  const positions = [
    [c.x - 35, c.z - 35],
    [c.x + 35, c.z - 30],
    [c.x - 38, c.z + 28],
    [c.x + 34, c.z + 34],
    [c.x, c.z]
  ];

  LEVEL2.doracakes = [];

  for (const p of positions) {
    const y = LEVEL2.groundY + 13;
    let mesh;

    if (DORACAKE_MODEL) {
      mesh = DORACAKE_MODEL.clone(true);
      mesh.scale.set(1.0, 1.0, 1.0);
    } else {
      mesh = makeFallbackDoracake();
      mesh.scale.set(0.65, 0.65, 0.65);
    }

    mesh.position.set(p[0], y, p[1]);
    scene.add(mesh);

    LEVEL2.doracakes.push({
      mesh,
      collected: false,
      seed: Math.random() * 10,
      baseY: y
    });
  }

  spawnLevel2Gadgets();
  updateLevel2HUD();
}

function makeGadget(type) {
  const group = new THREE.Group();

  const color =
    type === 'speed' ? 0x44ccff :
    type === 'shield' ? 0xffdd44 :
    0x66ff99;

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 24, 24),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.2,
      roughness: 0.35
    })
  );

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.0, 0.18, 16, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    })
  );

  ring.rotation.x = Math.PI / 2.8;

  const light = new THREE.PointLight(color, 4, 35, 2);
  light.position.set(0, 2, 0);

  group.add(planet, ring, light);
  return group;
}

function spawnLevel2Gadgets() {
  LEVEL2.gadgets = [];

  const c = LEVEL2.cityCenter;
  const b = LEVEL2.bounds;

  const data = [
    { type: 'speed', x: c.x - 24, z: b.minZ + 30 },
    { type: 'shield', x: c.x + 26, z: c.z + 26 },
    { type: 'time', x: b.maxX - 28, z: c.z - 24 }
  ];

  for (const g of data) {
    const mesh = makeGadget(g.type);
    mesh.position.set(g.x, LEVEL2.groundY + 12, g.z);
    scene.add(mesh);

    LEVEL2.gadgets.push({
      mesh,
      type: g.type,
      collected: false,
      baseY: mesh.position.y,
      seed: Math.random() * 10
    });
  }
}

function updateLevel2HUD() {
  beaconsLeftEl.textContent = (LEVEL2.total - LEVEL2.collected).toString();
  damageLimitEl.textContent = 'Lives: ' + LEVEL2.lives;
}

function tryCollectDoracake() {
  if (GAME.currentLevel !== 2 || GAME.state !== 'PLAYING') return;

  for (const d of LEVEL2.doracakes) {
    if (d.collected) continue;

    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(d.mesh).getCenter(center);

    if (player.pos.distanceTo(center) < 16) {
      d.collected = true;
      scene.remove(d.mesh);

      LEVEL2.collected++;

      LEVEL2.stabilizeUntil = timeNow() + 5;
      LEVEL2.invincibleUntil = timeNow() + 5;
      LEVEL2.cakeDeadlineAt = timeNow() + 45;
      LEVEL2.quakeUntil = 0;
      LEVEL2.quakePower = 0;
      LEVEL2.nextMeteor = timeNow() + 5;

      updateLevel2HUD();

      warningEl.textContent = '🍩 Doracake collected! City stabilized for 5s. Find next one in 15s.';

      if (LEVEL2.collected >= LEVEL2.total) {
        winLevel2();
      }

      return;
    }
  }
}

function collectLevel2Gadget() {
  for (const g of LEVEL2.gadgets) {
    if (g.collected) continue;

    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(g.mesh).getCenter(center);

    if (player.pos.distanceTo(center) < 16) {
      g.collected = true;
      scene.remove(g.mesh);

      LEVEL2.cakeDeadlineAt += 5;

      let msg = '';

      if (g.type === 'speed') {
        LEVEL2.speedBoostUntil = timeNow() + 8;
        msg = '🚀 Speed gadget collected! +5s bonus.';
      } else if (g.type === 'shield') {
        LEVEL2.invincibleUntil = timeNow() + 8;
        msg = '🛡️ Shield gadget collected! +5s bonus.';
      } else {
        msg = '⏱️ Time gadget collected! +5s bonus.';
      }

      warningEl.style.display = 'block';
      warningEl.textContent = msg + ' ' + getNearestDoracakeDirection();
      promptEl.textContent = '+5s BONUS!';
      promptEl.style.display = 'block';
      setTimeout(() => promptEl.style.display = 'none', 1500);

      return;
    }
  }
}

function getNearestDoracakeDirection() {
  let best = null;
  let bestDist = Infinity;

  for (const d of LEVEL2.doracakes) {
    if (d.collected) continue;

    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(d.mesh).getCenter(center);

    const dx = center.x - player.pos.x;
    const dz = center.z - player.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < bestDist) {
      bestDist = dist;
      best = center;
    }
  }

  if (!best) return '';

  const dx = best.x - player.pos.x;
  const dz = best.z - player.pos.z;

  let dir = '';

  if (Math.abs(dx) > Math.abs(dz)) {
    dir = dx > 0 ? 'RIGHT' : 'LEFT';
  } else {
    dir = dz > 0 ? 'FORWARD' : 'BACK';
  }

  return ' | Direction: ' + dir + ' | Distance: ' + Math.ceil(bestDist);
}

function winLevel2() {
  if (LEVEL2.completed) return;

  LEVEL2.completed = true;

  missionStateEl.textContent = 'Doraemon Wins';
  beaconsLeftEl.textContent = '0';
  promptEl.style.display = 'none';

  warningEl.style.display = 'block';
  warningEl.textContent = '🎉 DORAEMON WINS! Moving to Level 3...';

  setTimeout(() => {
    startLevel3();
  }, 2500);
}



function damagePlayerLevel2(reason = 'Damage taken!') {
  if (timeNow() < LEVEL2.invincibleUntil) return;
  if (GAME.currentLevel !== 2 || GAME.state !== 'PLAYING') return;

  LEVEL2.lives--;
  updateLevel2HUD();

  warningEl.textContent = '💥 ' + reason + ' Lives left: ' + LEVEL2.lives;

  player.pos.copy(LEVEL2.lastSafePos);
  player.group.position.copy(player.pos);
  player.vel.set(0, 0, 0);

  LEVEL2.invincibleUntil = timeNow() + 4;

  if (LEVEL2.lives <= 0) {
    LEVEL2.lives = 1;
    updateLevel2HUD();
    LEVEL2.invincibleUntil = timeNow() + 8;
    warningEl.textContent = '🛡️ Emergency shield activated! Keep collecting Doracakes.';
  }
}

function checkDoraemonBuildingCollision() {
  if (GAME.currentLevel !== 2 || GAME.state !== 'PLAYING') return;
  if (!LEVEL2.cityReady) return;

  LEVEL2.lastSafePos.copy(player.pos);
}

function triggerLevel2Quake(power = 1.0, duration = 1.5) {
  if (timeNow() < LEVEL2.stabilizeUntil) return;

  LEVEL2.quakeUntil = Math.max(LEVEL2.quakeUntil, timeNow() + duration);
  LEVEL2.quakePower = Math.max(LEVEL2.quakePower, power);
}

function updateLevel2Quake(dt) {
  if (!LEVEL2.cityReady) return;

  const now = timeNow();

  if (now < LEVEL2.stabilizeUntil) {
    LEVEL2.quakePower = 0;
    LEVEL2.quakeUntil = 0;

    for (const b of LEVEL2.buildingParts) {
      b.mesh.position.x = THREE.MathUtils.lerp(b.mesh.position.x, b.baseX, 0.12);
      b.mesh.position.z = THREE.MathUtils.lerp(b.mesh.position.z, b.baseZ, 0.12);
      b.mesh.rotation.x = THREE.MathUtils.lerp(b.mesh.rotation.x, b.baseRX, 0.12);
      b.mesh.rotation.z = THREE.MathUtils.lerp(b.mesh.rotation.z, b.baseRZ, 0.12);
    }

    if (LEVEL2_CITY) {
      LEVEL2_CITY.rotation.z = THREE.MathUtils.lerp(LEVEL2_CITY.rotation.z, 0, 0.12);
    }

    return;
  }

  if (now > LEVEL2.quakeUntil) {
    LEVEL2.quakePower = 0;

    for (const b of LEVEL2.buildingParts) {
      b.mesh.position.x = THREE.MathUtils.lerp(b.mesh.position.x, b.baseX, 0.08);
      b.mesh.position.z = THREE.MathUtils.lerp(b.mesh.position.z, b.baseZ, 0.08);
      b.mesh.rotation.x = THREE.MathUtils.lerp(b.mesh.rotation.x, b.baseRX, 0.08);
      b.mesh.rotation.z = THREE.MathUtils.lerp(b.mesh.rotation.z, b.baseRZ, 0.08);
    }

    if (LEVEL2_CITY) {
      LEVEL2_CITY.rotation.z = THREE.MathUtils.lerp(LEVEL2_CITY.rotation.z, 0, 0.08);
    }

    return;
  }

  const power = LEVEL2.quakePower;

  for (const b of LEVEL2.buildingParts) {
    const shakeX = Math.sin(now * 30 + b.seed) * 0.18 * power;
    const shakeZ = Math.cos(now * 34 + b.seed) * 0.18 * power;
    const tiltX = Math.sin(now * 20 + b.seed) * 0.009 * power;
    const tiltZ = Math.cos(now * 23 + b.seed) * 0.009 * power;

    b.mesh.position.x = b.baseX + shakeX;
    b.mesh.position.z = b.baseZ + shakeZ;
    b.mesh.rotation.x = b.baseRX + tiltX;
    b.mesh.rotation.z = b.baseRZ + tiltZ;
  }

  if (LEVEL2_CITY) {
    LEVEL2_CITY.rotation.z = Math.sin(now * 18) * 0.003 * power;
  }
}

function spawnLevel2Meteor() {
  if (!LEVEL2.cityReady) return;
  if (timeNow() < LEVEL2.stabilizeUntil) return;

  const m = new THREE.Group();

  const rock = new THREE.Mesh(
    new THREE.SphereGeometry(3, 18, 18),
    new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      emissive: 0xff3300,
      emissiveIntensity: 1.6,
      roughness: 0.7
    })
  );

  const glow = new THREE.PointLight(0xff6622, 2.5, 28, 2);
  m.add(rock, glow);

  const nearPlayer = Math.random() < 0.18;

  if (nearPlayer) {
    m.position.set(
      player.pos.x + (Math.random() - 0.5) * 70,
      LEVEL2.groundY + 95,
      player.pos.z + (Math.random() - 0.5) * 70
    );
  } else {
    m.position.set(
      LEVEL2.cityCenter.x + (Math.random() - 0.5) * 95,
      LEVEL2.groundY + 95,
      LEVEL2.cityCenter.z + (Math.random() - 0.5) * 95
    );
  }

  triggerLevel2Quake(0.45, 1.0);

  scene.add(m);
  LEVEL2.meteors.push(m);
}

function createMeteorImpact(pos) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(3, 18, 18),
    new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.95
    })
  );

  flash.position.copy(pos);
  scene.add(flash);

  LEVEL2.impactFX.push({
    mesh: flash,
    life: 0.35,
    maxLife: 0.35,
    type: 'flash'
  });

  const smoke = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 5, 1, 24),
    new THREE.MeshStandardMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.75
    })
  );

  smoke.position.copy(pos);
  smoke.position.y += 1;
  scene.add(smoke);

  LEVEL2.impactFX.push({
    mesh: smoke,
    life: 1.2,
    maxLife: 1.2,
    type: 'smoke'
  });
}

function damageCityAt(pos) {
  triggerLevel2Quake(1.0, 1.8);

  let damagedAny = false;

  for (const b of LEVEL2.buildingBoxes) {
    const center = new THREE.Vector3();
    b.box.getCenter(center);

    if (center.distanceTo(pos) < 18) {
      damagedAny = true;

      b.mesh.rotation.z += (Math.random() - 0.5) * 0.05;
      b.mesh.rotation.x += (Math.random() - 0.5) * 0.03;
      b.mesh.position.y -= Math.random() * 0.45;

      if (b.mesh.material) {
        b.mesh.material = b.mesh.material.clone();

        if (b.mesh.material.color) {
          b.mesh.material.color.multiplyScalar(0.7);
        }

        if (b.mesh.material.emissive) {
          b.mesh.material.emissive.set(0x220000);
          b.mesh.material.emissiveIntensity = 0.18;
        }
      }
    }
  }

  if (!damagedAny) {
    const crater = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 6.5, 0.35, 24),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 1
      })
    );

    crater.position.copy(pos);
    crater.position.y = LEVEL2.groundY + 0.05;
    scene.add(crater);

    LEVEL2.impactFX.push({
      mesh: crater,
      life: 6,
      maxLife: 6,
      type: 'crater'
    });
  }
}

function updateLevel2Meteors(dt) {
  if (GAME.state !== 'PLAYING' || GAME.currentLevel !== 2) return;
  if (!LEVEL2.cityReady) return;

  if (timeNow() < LEVEL2.stabilizeUntil) return;

  if (timeNow() > LEVEL2.nextMeteor) {
    spawnLevel2Meteor();
    LEVEL2.nextMeteor = timeNow() + 4.5;
  }

  for (let i = LEVEL2.meteors.length - 1; i >= 0; i--) {
    const m = LEVEL2.meteors[i];

    m.position.y -= 24 * dt;
    m.rotation.x += dt * 5;
    m.rotation.z += dt * 4;

    triggerLevel2Quake(0.28, 0.3);

    const playerDist = m.position.distanceTo(player.pos);

    if (playerDist < 6) {
      createMeteorImpact(m.position.clone());
      damageCityAt(m.position.clone());
      scene.remove(m);
      LEVEL2.meteors.splice(i, 1);

      warningEl.textContent = '☄️ Meteor impact near Doraemon! Keep collecting Doracakes.';
      LEVEL2.invincibleUntil = timeNow() + 3;
      continue;
    }

    if (m.position.y < LEVEL2.groundY + 2) {
      const hitPos = m.position.clone();
      hitPos.y = LEVEL2.groundY + 1.2;

      createMeteorImpact(hitPos);
      damageCityAt(hitPos);
      scene.remove(m);
      LEVEL2.meteors.splice(i, 1);
    }
  }
}

function updateLevel2ImpactFX(dt) {
  for (let i = LEVEL2.impactFX.length - 1; i >= 0; i--) {
    const fx = LEVEL2.impactFX[i];

    if (fx.type === 'crater') continue;

    fx.life -= dt;

    if (fx.type === 'flash') {
      fx.mesh.scale.addScalar(dt * 12);
      fx.mesh.material.opacity = Math.max(0, fx.life / fx.maxLife);
    } else if (fx.type === 'smoke') {
      fx.mesh.scale.x += dt * 2.5;
      fx.mesh.scale.z += dt * 2.5;
      fx.mesh.position.y += dt * 1.2;
      fx.mesh.material.opacity = Math.max(0, 0.75 * (fx.life / fx.maxLife));
    }

    if (fx.life <= 0) {
      scene.remove(fx.mesh);
      LEVEL2.impactFX.splice(i, 1);
    }
  }
}

function updateLevel2(dt) {
  if (GAME.currentLevel !== 2) return;
  if (LEVEL2.completed) return;
  if (!LEVEL2.cityReady) return;

  if (timeNow() > LEVEL2.cakeDeadlineAt && LEVEL2.collected < LEVEL2.total) {
    LEVEL2.cakeDeadlineAt = timeNow() + 60;
    LEVEL2.stabilizeUntil = timeNow() + 3;
    warningEl.style.display = 'block';
    warningEl.textContent = '⏱️ Extra time added! Keep collecting Doracakes.';
  }

  if (timeNow() < LEVEL2.stabilizeUntil) {
    const s = Math.ceil(LEVEL2.stabilizeUntil - timeNow());
    warningEl.textContent = '🟢 City stabilized for ' + s + 's';
  } else {
    const s = Math.max(0, Math.ceil(LEVEL2.cakeDeadlineAt - timeNow()));
    warningEl.textContent = '🍩 Find next Doracake in ' + s + 's';
  }

  updateLevel2Quake(dt);
  updateLevel2Meteors(dt);
  updateLevel2ImpactFX(dt);
  checkDoraemonBuildingCollision();
  collectLevel2Gadget();

  for (const d of LEVEL2.doracakes) {
    if (!d.collected) {
      d.mesh.rotation.y += dt * 2;
      d.mesh.position.y = d.baseY + Math.sin(timeNow() * 2 + d.seed) * 0.18;
    }
  }

  for (const g of LEVEL2.gadgets) {
    if (!g.collected) {
      g.mesh.rotation.y += dt * 2.5;
      g.mesh.position.y = g.baseY + Math.sin(timeNow() * 2.5 + g.seed) * 0.25;
    }
  }
}
// ============================================================
// LEVEL 3 — FINAL GLB HUMAN UFO RESCUE
// City GLB + human1/human2 GLBs + UFO + timer gameplay
// ============================================================

const level3Loader = new GLTFLoader();

const LEVEL3 = {
  city: null,
  cityCenter: new THREE.Vector3(),
  cityReady: false,

  doraemon: null,
  human1Model: null,
  human2Model: null,

humans: [],
ufos: [],
impactFX: [],
gadgets: [],

  rescued: 0,
  totalHumans: 30,

  missionSeconds: 60,
  missionDeadlineAt: Infinity,
  failed: false,

  groundY: 0,

  bounds: {
    minX: -95,
    maxX: 95,
    minZ: -95,
    maxZ: 95,
  },

  playerMinY: 10,
  playerMaxY: 65,

  rescueDistance: 18,
};

// ------------------------------------------------------------
// Clear Level 3
// ------------------------------------------------------------
function clearLevel3Scene() {
  if (LEVEL3.city) {
    scene.remove(LEVEL3.city);
    LEVEL3.city = null;
  }

  if (LEVEL3.doraemon && LEVEL3.doraemon.parent) {
    LEVEL3.doraemon.parent.remove(LEVEL3.doraemon);
  }

  for (const h of LEVEL3.humans) {
    if (h.mesh) scene.remove(h.mesh);
  }
for (const u of LEVEL3.ufos) {
  if (u.mesh && u.mesh.userData.redLaser) {
    scene.remove(u.mesh.userData.redLaser);
    u.mesh.userData.redLaser = null;
  }

  if (u.mesh) scene.remove(u.mesh);
}

  for (const fx of LEVEL3.impactFX) {
    if (fx.mesh) scene.remove(fx.mesh);
  }

  for (const g of LEVEL3.gadgets) {
  if (g.mesh) scene.remove(g.mesh);
}

  LEVEL3.doraemon = null;
  LEVEL3.humans = [];
  LEVEL3.ufos = [];
  LEVEL3.impactFX = [];
  LEVEL3.gadgets = [];

  LEVEL3.cityReady = false;
  LEVEL3.rescued = 0;
  LEVEL3.totalHumans = 30;
  LEVEL3.missionDeadlineAt = Infinity;
  LEVEL3.failed = false;
}

// ------------------------------------------------------------
// Start Level 3
// ------------------------------------------------------------
function startLevel3() {
  GAME.currentLevel = 3;
  GAME.state = 'PLAYING';
  playMusic(3);

  GAME.chainDeadlineAt = Infinity;
  GAME.disasterStartsAt = Infinity;
  GAME.nextRandomMeteorAt = Infinity;
  GAME.nextRandomQuakeAt = Infinity;

  clearLevel2Scene();
  clearLevel3Scene();

  if (terrainMesh) terrainMesh.visible = false;
  if (forest) forest.visible = false;
  if (water) water.visible = false;
  if (grid) grid.visible = false;
  if (beaconGroup) beaconGroup.visible = false;

  hideOriginalPlayerDrone();

  endScreen.style.display = 'none';
  promptEl.style.display = 'none';

  missionStateEl.textContent = 'Level 3: UFO Rescue';
  beaconsLeftEl.textContent = 'Humans: 0 / 30';
  damageLimitEl.textContent = 'Time: ' + LEVEL3.missionSeconds + 's';

  warningEl.style.display = 'block';
  warningEl.textContent = '🏙️ Loading Level 3 city, humans, and UFO...';

  loadLevel3Assets();
}

// ------------------------------------------------------------
// GLB Loader helper
// ------------------------------------------------------------
function loadLevel3GLB(url) {
  return new Promise((resolve) => {
    let done = false;

    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        console.warn('Level 3 GLB timeout:', url);
        resolve(null);
      }
    }, 6000);

    level3Loader.load(
      url,
      (gltf) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        console.warn('Level 3 GLB failed:', url, err);
        resolve(null);
      }
    );
  });
}

// ------------------------------------------------------------
// Load city, Doraemon, human GLBs
// ------------------------------------------------------------
async function loadLevel3Assets() {
  const [city, doraemon, human1, human2] = await Promise.all([
    loadLevel3GLB('/models/city.glb'),
    loadLevel3GLB('/models/doraemon.glb'),
    loadLevel3GLB('/models/human1.glb'),
    loadLevel3GLB('/models/human2.glb'),
  ]);

  LEVEL3.human1Model = human1;
  LEVEL3.human2Model = human2;

  if (city) {
    setupLevel3City(city);
  } else {
    createLevel3FallbackCity();
  }

  if (doraemon) {
    setupLevel3Doraemon(doraemon);
  } else {
    setupFallbackLevel3Doraemon();
  }

  finishLevel3Setup();
}

// ------------------------------------------------------------
// City setup
// ------------------------------------------------------------
function setupLevel3City(city) {
  LEVEL3.city = city;
  scene.add(city);

  const box = new THREE.Box3().setFromObject(city);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const scale = 190 / Math.max(size.x, size.z);
  city.scale.setScalar(scale);

  city.position.set(
    -center.x * scale,
    -box.min.y * scale,
    -center.z * scale
  );

  city.traverse((obj) => {
    if (!obj.isMesh) return;

    obj.castShadow = false;
    obj.receiveShadow = false;

    if (obj.material) {
      obj.material = obj.material.clone();
      obj.material.side = THREE.DoubleSide;
      obj.material.needsUpdate = true;
    }
  });

  const finalBox = new THREE.Box3().setFromObject(city);
  finalBox.getCenter(LEVEL3.cityCenter);

  LEVEL3.groundY = finalBox.min.y;

  LEVEL3.bounds = {
    minX: LEVEL3.cityCenter.x - 90,
    maxX: LEVEL3.cityCenter.x + 90,
    minZ: LEVEL3.cityCenter.z - 90,
    maxZ: LEVEL3.cityCenter.z + 90,
  };

  LEVEL3.playerMinY = LEVEL3.groundY + 5;
LEVEL3.playerMaxY = LEVEL3.groundY + 65;
  LEVEL3.cityReady = true;
}

// ------------------------------------------------------------
// Fallback city
// ------------------------------------------------------------
function createLevel3FallbackCity() {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(200, 1, 200),
    new THREE.MeshStandardMaterial({ color: 0x252a32 })
  );
  group.add(ground);

  for (let i = 0; i < 40; i++) {
    const h = randRange(14, 52);

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(randRange(7, 14), h, randRange(7, 14)),
      new THREE.MeshStandardMaterial({ color: 0x3f4a5a })
    );

    building.position.set(randRange(-90, 90), h / 2, randRange(-90, 90));
    group.add(building);
  }

  LEVEL3.city = group;
  scene.add(group);

  LEVEL3.cityCenter.set(0, 0, 0);
  LEVEL3.groundY = 0;

  LEVEL3.bounds = {
    minX: -90,
    maxX: 90,
    minZ: -90,
    maxZ: 90,
  };

  LEVEL3.playerMinY = 14;
  LEVEL3.playerMaxY = 65;
  LEVEL3.cityReady = true;
}

// ------------------------------------------------------------
// Doraemon setup
// ------------------------------------------------------------
function setupLevel3Doraemon(doraemon) {
  LEVEL3.doraemon = doraemon;

  doraemon.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(doraemon);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.y > 0.001) {
    const scale = 7 / size.y;
    doraemon.scale.setScalar(scale);
  }

  doraemon.position.set(0, 0, 0);
  doraemon.rotation.y = Math.PI;

  doraemon.traverse((obj) => {
    if (!obj.isMesh) return;

    obj.castShadow = false;
    obj.receiveShadow = false;

    if (obj.material) {
      obj.material = obj.material.clone();
      obj.material.side = THREE.DoubleSide;
      obj.material.needsUpdate = true;
    }
  });

  player.group.add(doraemon);
}

function setupFallbackLevel3Doraemon() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 24, 18),
    new THREE.MeshStandardMaterial({
      color: 0x1684ff,
      emissive: 0x003366,
      emissiveIntensity: 0.5,
    })
  );

  const face = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );

  face.position.set(0, 0.25, 1.0);
  group.add(body, face);

  LEVEL3.doraemon = group;
  player.group.add(group);
}

// ------------------------------------------------------------
// Finish setup
// ------------------------------------------------------------
function finishLevel3Setup() {
  LEVEL3.cityReady = true;
  LEVEL3.rescued = 0;
  LEVEL3.totalHumans = 30;
  LEVEL3.failed = false;
  LEVEL3.missionDeadlineAt = timeNow() + LEVEL3.missionSeconds;

  player.pos.set(
  LEVEL3.cityCenter.x,
  LEVEL3.groundY + 12,
  LEVEL3.cityCenter.z + 55
);

  player.vel.set(0, 0, 0);
  player.yaw = Math.PI;
  player.pitch = -0.22;
  player.group.position.copy(player.pos);

  spawnLevel3HumansBeaconStyle();
  spawnLevel3UFO();
  spawnLevel3RescueGadget();

  updateLevel3HUD();

  warningEl.style.display = 'block';
  warningEl.textContent = '🛸 Rescue 30 humans before time runs out.';
}

// ------------------------------------------------------------
// City surface raycast
// ------------------------------------------------------------
function getLevel3CitySurface(x, z) {
  if (!LEVEL3.city) {
    return {
      ok: false,
      y: 0,
      normalY: 0,
    };
  }

  const origin = new THREE.Vector3(x, LEVEL3.groundY + 500, z);
  const direction = new THREE.Vector3(0, -1, 0);

  const raycaster = new THREE.Raycaster(origin, direction, 0, 1000);
  const hits = raycaster.intersectObject(LEVEL3.city, true);

  for (const hit of hits) {
    if (!hit.object || !hit.object.isMesh || !hit.face) continue;

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(
      hit.object.matrixWorld
    );

    const worldNormal = hit.face.normal
      .clone()
      .applyMatrix3(normalMatrix)
      .normalize();

    return {
      ok: true,
      y: hit.point.y,
      normalY: worldNormal.y,
    };
  }

  return {
    ok: false,
    y: 0,
    normalY: 0,
  };
}

function isValidLevel3HumanSurface(surface) {
  if (!surface.ok) return false;

  // Must be a mostly flat upward-facing surface
  if (surface.normalY < 0.80) return false;

  // Keep humans near road/ground level only
  if (surface.y < LEVEL3.groundY - 0.2) return false;
  if (surface.y > LEVEL3.groundY + 7.5) return false;

  return true;
}

// ------------------------------------------------------------
// Normalize GLB into a clean wrapper so it stands on ground
// ------------------------------------------------------------
function makeLevel3Human(index) {
  let source = null;

  if (index % 2 === 0 && LEVEL3.human1Model) {
    source = SkeletonUtils.clone(LEVEL3.human1Model);
  } else if (LEVEL3.human2Model) {
    source = SkeletonUtils.clone(LEVEL3.human2Model);
  } else if (LEVEL3.human1Model) {
    source = SkeletonUtils.clone(LEVEL3.human1Model);
  } else {
    return makeFallbackLevel3Human(index);
  }

  const wrapper = new THREE.Group();
  wrapper.add(source);

  source.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(source);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.y > 0.001) {
    const scale = 4.8 / size.y;
    source.scale.setScalar(scale);
  }

  source.updateMatrixWorld(true);

  const fixedBox = new THREE.Box3().setFromObject(source);

  source.position.x -= (fixedBox.min.x + fixedBox.max.x) / 2;
  source.position.z -= (fixedBox.min.z + fixedBox.max.z) / 2;
  source.position.y -= fixedBox.min.y;

  source.traverse((obj) => {
    if (!obj.isMesh) return;

    obj.castShadow = false;
    obj.receiveShadow = false;

    if (obj.material) {
      obj.material = obj.material.clone();
      obj.material.side = THREE.DoubleSide;
      obj.material.needsUpdate = true;
    }
  });

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.075, 8, 36),
    new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );

  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;

  const light = new THREE.PointLight(0x00ffff, 1.3, 15, 2);
  light.position.y = 2.7;

  wrapper.add(ring, light);

  return wrapper;
}

// ------------------------------------------------------------
// Fallback human if GLBs fail
// ------------------------------------------------------------
function makeFallbackLevel3Human(index) {
  const group = new THREE.Group();

  const shirtColor =
    index % 5 === 0 ? 0x44ccff :
    index % 5 === 1 ? 0xffaa44 :
    index % 5 === 2 ? 0xff66aa :
    index % 5 === 3 ? 0x66ff99 :
    0xffff66;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.55, 1.8, 6, 12),
    new THREE.MeshStandardMaterial({
      color: shirtColor,
      emissive: shirtColor,
      emissiveIntensity: 0.25,
      roughness: 0.6,
    })
  );
  body.position.y = 1.7;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffcc99,
      roughness: 0.55,
    })
  );
  head.position.y = 3.0;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.075, 8, 32),
    new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.12;

  const light = new THREE.PointLight(0x00ffff, 1.2, 14, 2);
  light.position.y = 2.5;

  group.add(body, head, ring, light);
  return group;
}

// ------------------------------------------------------------
// Human placement using fixed layout from simple version
// ------------------------------------------------------------
function spawnLevel3HumansBeaconStyle() {
  LEVEL3.humans = [];
  LEVEL3.totalHumans = 30;

  const c = LEVEL3.cityCenter;

  const candidateOffsets = [
    [-58, -52], [-44, -52], [-30, -52], [-16, -52], [0, -52], [16, -52], [30, -52], [44, -52], [58, -52],
    [-58, -28], [-44, -28], [-30, -28], [-16, -28], [0, -28], [16, -28], [30, -28], [44, -28], [58, -28],
    [-58, -4], [-44, -4], [-30, -4], [-16, -4], [0, -4], [16, -4], [30, -4], [44, -4], [58, -4],
    [-58, 20], [-44, 20], [-30, 20], [-16, 20], [0, 20], [16, 20], [30, 20], [44, 20], [58, 20],
    [-44, 44], [-30, 44], [-16, 44], [0, 44], [16, 44], [30, 44], [44, 44],
    [-32, 60], [-12, 60], [10, 60], [32, 60],
  ];

  const validSpots = [];

  for (const off of candidateOffsets) {
    const x = c.x + off[0];
    const z = c.z + off[1];

    const surface = getLevel3CitySurface(x, z);

    if (!isValidLevel3HumanSurface(surface)) continue;

    validSpots.push({
      x,
      y: surface.y + 0.08,
      z,
    });
  }

  let tries = 0;

  while (validSpots.length < LEVEL3.totalHumans && tries < 1000) {
    tries++;

    const x = c.x + randRange(-60, 60);
    const z = c.z + randRange(-60, 60);

    const surface = getLevel3CitySurface(x, z);
    if (!isValidLevel3HumanSurface(surface)) continue;

    let tooClose = false;

    for (const p of validSpots) {
      const dx = p.x - x;
      const dz = p.z - z;

      if (Math.sqrt(dx * dx + dz * dz) < 8.5) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) continue;

    validSpots.push({
      x,
      y: surface.y + 0.08,
      z,
    });
  }

  for (let i = 0; i < validSpots.length && i < LEVEL3.totalHumans; i++) {
    const p = validSpots[i];
    const human = makeLevel3Human(i);

    human.position.set(p.x, p.y, p.z);

    human.rotation.x = 0;
    human.rotation.z = 0;
    human.rotation.y = randRange(0, Math.PI * 2);

    scene.add(human);

    LEVEL3.humans.push({
      mesh: human,
      rescued: false,

      homeX: human.position.x,
      homeY: human.position.y,
      homeZ: human.position.z,

      baseY: human.position.y,
      seed: Math.random() * 100,

      walkRadius: randRange(0.9, 2.2),
      walkSpeed: randRange(0.28, 0.55),
      panicOffset: Math.random() * Math.PI * 2,
    });
  }

  LEVEL3.totalHumans = LEVEL3.humans.length;
}

// ------------------------------------------------------------
// UFO
// ------------------------------------------------------------
function makeLevel3UFO() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd8ebff,
    emissive: 0x113355,
    emissiveIntensity: 1.0,
    roughness: 0.35,
    metalness: 0.25,
  });

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xff0000,
    emissiveIntensity: 2.0,
    roughness: 0.25,
  });

  // Main UFO body similar to Level 1 drone style
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(4.4, 32, 20),
    bodyMat
  );
  core.scale.set(1.35, 0.62, 1.35);
  group.add(core);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(6.2, 0.55, 18, 72),
    bodyMat
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.7, 24, 14),
    new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      emissive: 0x33bbff,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.85,
      roughness: 0.25,
    })
  );
  dome.position.y = 1.8;
  dome.scale.y = 0.62;
  group.add(dome);

  const podPositions = [
    [5.4, -0.35, 0],
    [-5.4, -0.35, 0],
    [0, -0.35, 5.4],
    [0, -0.35, -5.4],
  ];

  for (const [x, y, z] of podPositions) {
    const pod = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 16, 12),
      redMat
    );
    pod.position.set(x, y, z);

    const podLight = new THREE.PointLight(0xff2222, 2.5, 28, 2);
    podLight.position.set(x, y, z);

    group.add(pod, podLight);
  }

  const redLight = new THREE.PointLight(0xff2222, 8, 120, 2);
  redLight.position.y = -8;
  group.add(redLight);

  return group;
}

function spawnLevel3UFO() {
  const ufo = makeLevel3UFO();

  ufo.position.set(
    LEVEL3.cityCenter.x,
    LEVEL3.groundY + 82,
    LEVEL3.cityCenter.z
  );

  scene.add(ufo);

  LEVEL3.ufos.push({
    mesh: ufo,
    angle: 0,
    radius: 58,
    baseY: LEVEL3.groundY + 82,
    laserTimer: 0,
    targetHuman: null,
  });
}

function spawnLevel3BurnFX(x, y, z) {
  const fireGroup = new THREE.Group();

  const fire = new THREE.Mesh(
    new THREE.ConeGeometry(1.4, 4.8, 18),
    new THREE.MeshBasicMaterial({
      color: 0xff4411,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );
  fire.position.y = 2.4;

  const fireCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 3.2, 18),
    new THREE.MeshBasicMaterial({
      color: 0xffdd55,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    })
  );
  fireCore.position.y = 1.8;

  const smoke = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  smoke.position.y = 5.0;

  const light = new THREE.PointLight(0xff3311, 3.0, 26, 2);
  light.position.y = 2.8;

  fireGroup.add(fire, fireCore, smoke, light);
  fireGroup.position.set(x, y, z);

  scene.add(fireGroup);

  LEVEL3.impactFX.push({
    mesh: fireGroup,
    life: 6.0,
    maxLife: 6.0,
    seed: Math.random() * 100,
    type: 'fire',
  });
}

function updateLevel3BurnFX(dt) {
  for (let i = LEVEL3.impactFX.length - 1; i >= 0; i--) {
    const fx = LEVEL3.impactFX[i];
    if (!fx.mesh) continue;

    fx.life -= dt;

    const t = timeNow();

    fx.mesh.scale.x = 1 + Math.sin(t * 7 + fx.seed) * 0.12;
    fx.mesh.scale.z = 1 + Math.cos(t * 6 + fx.seed) * 0.12;

    fx.mesh.traverse((obj) => {
      if (obj.isPointLight) {
        obj.intensity = 2.2 + Math.sin(t * 10 + fx.seed) * 0.7;
      }
    });

    if (fx.life <= 0) {
      scene.remove(fx.mesh);
      LEVEL3.impactFX.splice(i, 1);
    }
  }
}
// ------------------------------------------------------------
// HUD
// ------------------------------------------------------------
function updateLevel3HUD() {
  const remaining = Math.max(
    0,
    Math.ceil(LEVEL3.missionDeadlineAt - timeNow())
  );

  missionStateEl.textContent = 'Level 3: UFO Rescue';

  beaconsLeftEl.textContent =
    'Humans: ' + LEVEL3.rescued + ' / ' + LEVEL3.totalHumans;

  damageLimitEl.textContent = 'Time: ' + remaining + 's';
}

// ------------------------------------------------------------
// Rescue humans
// ------------------------------------------------------------
function tryRescueLevel3Humans() {
  if (GAME.currentLevel !== 3) return;
  if (GAME.state !== 'PLAYING') return;
  if (!LEVEL3.cityReady) return;

  for (const h of LEVEL3.humans) {
    if (h.rescued || !h.mesh) continue;

    const dist = player.pos.distanceTo(h.mesh.position);

    if (dist <= LEVEL3.rescueDistance) {
      h.rescued = true;
      LEVEL3.rescued++;

      h.mesh.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material = obj.material.clone();

          if (obj.material.color) {
            obj.material.color.set(0x66ff99);
          }

          if (obj.material.emissive) {
            obj.material.emissive.set(0x22aa55);
            obj.material.emissiveIntensity = 0.7;
          }

          obj.material.transparent = true;
          obj.material.opacity = 0.68;
        }

        if (obj.isPointLight) {
          obj.color.set(0x66ff99);
          obj.intensity = 2.2;
        }
      });

      updateLevel3HUD();

      warningEl.style.display = 'block';
      warningEl.textContent =
        '✅ Human rescued! ' + LEVEL3.rescued + ' / ' + LEVEL3.totalHumans;

      if (LEVEL3.rescued >= LEVEL3.totalHumans) {
        winLevel3();
      }

      return;
    }
  }
}

// ------------------------------------------------------------
// Fail Level 3
// ------------------------------------------------------------
function failLevel3() {
  if (LEVEL3.failed) return;

  LEVEL3.failed = true;
  GAME.state = 'LOSE';

  missionStateEl.textContent = 'Level 3 Failed';
  beaconsLeftEl.textContent =
    'Humans: ' + LEVEL3.rescued + ' / ' + LEVEL3.totalHumans;
  damageLimitEl.textContent = 'Time: 0s';

  promptEl.style.display = 'none';
  warningEl.style.display = 'none';

  endTitle.textContent = 'TIME IS UP';
  endMessage.textContent =
    'Doraemon rescued ' +
    LEVEL3.rescued +
    ' out of ' +
    LEVEL3.totalHumans +
    ' humans.';

  endScreen.style.display = 'flex';
}

function failLevel3ByLaser() {
  if (LEVEL3.failed) return;

  LEVEL3.failed = true;
  GAME.state = 'LOSE';

  missionStateEl.textContent = 'Level 3 Failed';
  beaconsLeftEl.textContent =
    'Humans: ' + LEVEL3.rescued + ' / ' + LEVEL3.totalHumans;
  damageLimitEl.textContent = 'Doraemon hit';

  promptEl.style.display = 'none';
  warningEl.style.display = 'none';

  endTitle.textContent = 'DORAEMON HIT';
  endMessage.textContent =
    'The UFO laser hit Doraemon before all humans were rescued. Mission failed.';

  endScreen.style.display = 'flex';
}

function makeLevel3RescueGadget() {
  const group = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 28, 28),
    new THREE.MeshStandardMaterial({
      color: 0xff55ff,
      emissive: 0xff00dd,
      emissiveIntensity: 2.2,
      roughness: 0.18,
      metalness: 0.15,
    })
  );

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(4.2, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffccff,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );

  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(6.2, 0.22, 16, 80),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
  );
  ring1.rotation.x = Math.PI / 2;

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(4.7, 0.18, 16, 80),
    new THREE.MeshBasicMaterial({
      color: 0xff66ff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  ring2.rotation.y = Math.PI / 2;

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 2.8, 14, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xff88ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = -5.5;

  const light = new THREE.PointLight(0xff44ff, 9, 90, 2);
  light.position.y = 2.5;

  group.add(beam, diamond, core, ring1, ring2, light);

  // make it always easy to see
  group.scale.setScalar(1.15);

  return group;
}


function spawnLevel3RescueGadget() {
  LEVEL3.gadgets = [];

  const c = LEVEL3.cityCenter;

  // Visible positions near roads/center, not hidden deep inside buildings.
  const candidateOffsets = [
    [-45, -35],
    [0, -38],
    [42, -20],
    [-34, 28],
    [36, 34],
    [0, 18],
  ];

  let placedCount = 0;

  for (const off of candidateOffsets) {
    if (placedCount >= 3) break;

    const x = c.x + off[0];
    const z = c.z + off[1];

    const surface = getLevel3CitySurface(x, z);
    if (!surface.ok) continue;

    const mesh = makeLevel3RescueGadget();

    // Higher than humans so it is visible above roads/buildings.
    mesh.position.set(x, surface.y + 12, z);

    scene.add(mesh);

    LEVEL3.gadgets.push({
      mesh,
      collected: false,
      baseY: mesh.position.y,
      seed: Math.random() * 100,
    });

    placedCount++;
  }

  // If city raycast fails, force visible gadgets near city center.
  while (placedCount < 3) {
    const mesh = makeLevel3RescueGadget();

    mesh.position.set(
      c.x + randRange(-35, 35),
      LEVEL3.groundY + 18,
      c.z + randRange(-35, 35)
    );

    scene.add(mesh);

    LEVEL3.gadgets.push({
      mesh,
      collected: false,
      baseY: mesh.position.y,
      seed: Math.random() * 100,
    });

    placedCount++;
  }
}

function autoRescueLevel3Humans(amount = 3) {
  let rescuedNow = 0;

  const remainingHumans = LEVEL3.humans.filter((h) => !h.rescued && h.mesh);

  remainingHumans.sort((a, b) => {
    const da = player.pos.distanceTo(a.mesh.position);
    const db = player.pos.distanceTo(b.mesh.position);
    return da - db;
  });

  for (const h of remainingHumans) {
    if (rescuedNow >= amount) break;

    h.rescued = true;
    LEVEL3.rescued++;
    rescuedNow++;

    h.mesh.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        obj.material = obj.material.clone();

        if (obj.material.color) {
          obj.material.color.set(0x66ff99);
        }

        if (obj.material.emissive) {
          obj.material.emissive.set(0x22aa55);
          obj.material.emissiveIntensity = 0.8;
        }

        obj.material.transparent = true;
        obj.material.opacity = 0.68;
      }

      if (obj.isPointLight) {
        obj.color.set(0x66ff99);
        obj.intensity = 2.4;
      }
    });
  }

  updateLevel3HUD();

  warningEl.style.display = 'block';
  warningEl.textContent =
    '💎 Rescue gadget activated! +' +
    rescuedNow +
    ' humans rescued: ' +
    LEVEL3.rescued +
    ' / ' +
    LEVEL3.totalHumans;

  if (LEVEL3.rescued >= LEVEL3.totalHumans) {
    winLevel3();
  }
}

function collectLevel3RescueGadget() {
  if (GAME.currentLevel !== 3) return;
  if (GAME.state !== 'PLAYING') return;

  for (const g of LEVEL3.gadgets) {
    if (g.collected || !g.mesh) continue;

    const dist = player.pos.distanceTo(g.mesh.position);

    if (dist <= 15) {
      g.collected = true;
      scene.remove(g.mesh);

      autoRescueLevel3Humans(3);
      return;
    }
  }
}
// ------------------------------------------------------------
// Update Level 3
// ------------------------------------------------------------
function updateLevel3(dt) {
  if (GAME.currentLevel !== 3) return;
  if (GAME.state !== 'PLAYING') return;
  if (!LEVEL3.cityReady) return;

  const t = timeNow();

  // Keep Doraemon inside Level 3 city bounds
  player.pos.x = THREE.MathUtils.clamp(
    player.pos.x,
    LEVEL3.bounds.minX,
    LEVEL3.bounds.maxX
  );

  player.pos.z = THREE.MathUtils.clamp(
    player.pos.z,
    LEVEL3.bounds.minZ,
    LEVEL3.bounds.maxZ
  );

  player.pos.y = THREE.MathUtils.clamp(
    player.pos.y,
    LEVEL3.playerMinY,
    LEVEL3.playerMaxY
  );

  // ------------------------------------------------------------
  // Human movement - lightweight version
  // No raycasting every frame, so FPS will be much better.
  // Humans move only around their already-valid spawn/home point.
  // ------------------------------------------------------------
  for (const h of LEVEL3.humans) {
    if (!h.mesh) continue;

    if (h.rescued) {
      h.mesh.position.y = h.baseY;
      continue;
    }

    const moveT = t * h.walkSpeed + h.seed;

    const targetX =
      h.homeX + Math.cos(moveT + h.panicOffset) * h.walkRadius;

    const targetZ =
      h.homeZ + Math.sin(moveT * 0.85 + h.panicOffset) * h.walkRadius;

    const oldX = h.mesh.position.x;
    const oldZ = h.mesh.position.z;

    h.mesh.position.x = THREE.MathUtils.lerp(
      h.mesh.position.x,
      targetX,
      0.025
    );

    h.mesh.position.z = THREE.MathUtils.lerp(
      h.mesh.position.z,
      targetZ,
      0.025
    );

    // Keep on the original safe surface
    h.mesh.position.y =
      h.baseY + Math.sin(t * 2.2 + h.seed) * 0.01;

    const dx = h.mesh.position.x - oldX;
    const dz = h.mesh.position.z - oldZ;

    if (Math.abs(dx) + Math.abs(dz) > 0.0008) {
      h.mesh.rotation.y = Math.atan2(dx, dz);
    }
  }

  // ------------------------------------------------------------
  // UFO movement + red laser attack
  // ------------------------------------------------------------
  for (const u of LEVEL3.ufos) {
    u.angle += dt * 0.30;

    u.mesh.position.x =
      LEVEL3.cityCenter.x + Math.cos(u.angle) * u.radius;

    u.mesh.position.z =
      LEVEL3.cityCenter.z + Math.sin(u.angle) * u.radius;

    u.mesh.position.y =
      u.baseY + Math.sin(t * 1.4) * 3;

    u.mesh.rotation.y += dt * 1.1;

    u.laserTimer -= dt;

    if (u.laserTimer <= 0) {
      const candidates = LEVEL3.humans.filter((h) => !h.rescued && h.mesh);

      if (candidates.length > 0) {
        const target =
          candidates[Math.floor(Math.random() * candidates.length)];

        u.targetHuman = target;

        // Slower fire spawning to prevent FPS drop
        u.laserTimer = randRange(2.5, 4.0);

        const targetPos = target.mesh.position.clone();

        spawnLevel3BurnFX(
          targetPos.x + randRange(-2.2, 2.2),
          targetPos.y,
          targetPos.z + randRange(-2.2, 2.2)
        );
      }
    }

    // Red laser line from UFO to target human
    if (u.targetHuman && u.targetHuman.mesh && !u.targetHuman.rescued) {
      const start = u.mesh.position.clone();
      const end = u.targetHuman.mesh.position.clone();
      end.y += 2.2;

      // If Doraemon crosses/gets close to the UFO laser, fail Level 3
const laserLine = new THREE.Line3(start, end);
const closestToDoraemon = new THREE.Vector3();

laserLine.closestPointToPoint(player.pos, true, closestToDoraemon);

const laserHitDistance = closestToDoraemon.distanceTo(player.pos);

if (laserHitDistance < 5.5) {
  failLevel3ByLaser();
  return;
}

      let laser = u.mesh.userData.redLaser;

      if (!laser) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(),
        ]);

        const mat = new THREE.LineBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.95,
        });

        laser = new THREE.Line(geo, mat);
        scene.add(laser);
        u.mesh.userData.redLaser = laser;
      }

      laser.geometry.setFromPoints([start, end]);
      laser.material.opacity = 0.7 + Math.sin(t * 18) * 0.25;
      laser.visible = true;
    } else if (u.mesh.userData.redLaser) {
      u.mesh.userData.redLaser.visible = false;
    }
  }

  // Fire/burning FX
updateLevel3BurnFX(dt);

// Level 3 rescue gadget animation + collection
for (const g of LEVEL3.gadgets) {
  if (!g.mesh || g.collected) continue;

  g.mesh.rotation.y += dt * 3.5;
  g.mesh.rotation.x += dt * 1.2;

  g.mesh.position.y =
    g.baseY + Math.sin(t * 3.0 + g.seed) * 0.9;

  g.mesh.scale.setScalar(
    1.15 + Math.sin(t * 4.5 + g.seed) * 0.08
  );
}

collectLevel3RescueGadget();

// Rescue detection
tryRescueLevel3Humans();

  const remaining = Math.ceil(LEVEL3.missionDeadlineAt - t);

  if (remaining <= 0 && LEVEL3.rescued < LEVEL3.totalHumans) {
    failLevel3();
    return;
  }

  warningEl.style.display = 'block';
  warningEl.textContent =
    '🛸 UFO attack! Rescue humans: ' +
    LEVEL3.rescued +
    ' / ' +
    LEVEL3.totalHumans +
    ' | Time: ' +
    Math.max(0, remaining) +
    's';
}

// ------------------------------------------------------------
// Win Level 3
// ------------------------------------------------------------
function winLevel3() {
  GAME.state = 'WIN';

  missionStateEl.textContent = 'City Saved';
  beaconsLeftEl.textContent =
    'Humans: ' + LEVEL3.totalHumans + ' / ' + LEVEL3.totalHumans;
  damageLimitEl.textContent = 'Level 3 complete';

  promptEl.style.display = 'none';
  warningEl.style.display = 'none';

  endTitle.textContent = 'CITY SAVED';
  endMessage.textContent =
    'Doraemon rescued all humans and protected the city from the UFO.';

  endScreen.style.display = 'flex';
}

// ============================================================
// REQUIRED BOTTOM GAME LOOP + LEVEL 1 START MISSION FIX
// Paste this at the VERY END of main.js
// ============================================================

const clock = new THREE.Clock();

function timeNow() {
  return performance.now() / 1000;
}

function startMission() {
  GAME.currentLevel = 1;
  GAME.state = 'PLAYING';
  playMusic(1);

  clearLevel2Scene();
  clearLevel3Scene();

  if (terrainMesh) terrainMesh.visible = true;
  if (forest) forest.visible = true;
  if (water) water.visible = true;
  if (grid) grid.visible = true;
  if (beaconGroup) beaconGroup.visible = true;

  showOriginalPlayerDrone();

  startMenu.style.display = 'none';
  endScreen.style.display = 'none';
  promptEl.style.display = 'none';

  warningEl.style.display = 'block';
  warningEl.textContent = 'Activate all beacons before disasters destroy the planet.';

  destroyedScore = 0;
  scoreEl.textContent = '0';

  craterStamps.length = 0;
  shockwaves.length = 0;

  GAME.chainDeadlineAt = Infinity;
  GAME.disasterStartsAt = timeNow() + WORLD.game.disasterStartDelay;
  GAME.nextRandomMeteorAt =
    GAME.disasterStartsAt +
    randRange(WORLD.game.randomMeteorMinGap, WORLD.game.randomMeteorMaxGap);

  GAME.nextRandomQuakeAt =
    GAME.disasterStartsAt +
    randRange(WORLD.game.randomQuakeMinGap, WORLD.game.randomQuakeMaxGap);

  WORLD.quake.enabled = false;
  quakeBurstUntil = 0;

  refreshTerrainGeometry();
  resetTerrainToBase();
  resetBeacons();
  resetPlayerSpawn();

  missionStateEl.textContent = 'Level 1: Beacon Mission';
  damageLimitEl.textContent = WORLD.game.collapseDamage.toString();
  updateBeaconHUD();
}

function winMission() {
  GAME.state = 'WIN';

  promptEl.style.display = 'none';
  warningEl.style.display = 'none';

  endTitle.textContent = 'MISSION COMPLETE';
  endMessage.textContent =
    'All stabilization beacons were activated. Moving to Level 2...';

  endScreen.style.display = 'flex';

  setTimeout(() => {
    endScreen.style.display = 'none';
    startLevel2();
  }, 2200);
}

function loseMission(message) {
  GAME.state = 'LOSE';

  promptEl.style.display = 'none';
  warningEl.style.display = 'none';

  endTitle.textContent = 'MISSION FAILED';
  endMessage.textContent = message || 'The planet collapsed before the beacons were stabilized.';

  endScreen.style.display = 'flex';
}

function updateLevel1(dt) {
  if (GAME.currentLevel !== 1) return;
  if (GAME.state !== 'PLAYING') return;

  const t = timeNow();

  if (t >= GAME.disasterStartsAt) {
    if (t >= GAME.nextRandomMeteorAt) {
      const x = randRange(-WORLD.size * 0.42, WORLD.size * 0.42);
      const z = randRange(-WORLD.size * 0.42, WORLD.size * 0.42);

      startMeteorStrike(x, z, t);

      GAME.nextRandomMeteorAt =
        t + randRange(WORLD.game.randomMeteorMinGap, WORLD.game.randomMeteorMaxGap);
    }

    if (t >= GAME.nextRandomQuakeAt) {
      quakeBurstUntil = t + WORLD.quake.burstSeconds;

      GAME.nextRandomQuakeAt =
        t + randRange(WORLD.game.randomQuakeMinGap, WORLD.game.randomQuakeMaxGap);
    }
  }

  const near = nearestUnactivatedBeacon();

  if (near && near.dist <= WORLD.game.beaconActivateDistance) {
    promptEl.style.display = 'block';
    promptEl.textContent = 'Press F to activate beacon';
  } else {
    promptEl.style.display = 'none';
  }

  if (GAME.chainDeadlineAt !== Infinity) {
    const left = Math.ceil(GAME.chainDeadlineAt - t);

    if (left <= 0) {
      loseMission('You missed the beacon chain timer.');
      return;
    }

    warningEl.style.display = 'block';
    warningEl.textContent = 'Reach the next beacon in ' + left + 's';
  }
}

function updateMeteor(dt) {
  if (!activeMeteor || !meteor || !meteorTrail) return;

  activeMeteor.y -= activeMeteor.v * dt;

  meteor.position.set(activeMeteor.x, activeMeteor.y, activeMeteor.z);
  meteor.rotation.x += dt * 4;
  meteor.rotation.z += dt * 3;

  meteorTrail.position.set(activeMeteor.x, activeMeteor.y + 9, activeMeteor.z);
  meteorTrail.rotation.x = Math.PI / 2;

  const groundY = terrainHeightAt(activeMeteor.x, activeMeteor.z);

  if (activeMeteor.y <= groundY + 2) {
    meteor.visible = false;
    meteorTrail.visible = false;
    meteorTrail.material.opacity = 0;

    impactAt(activeMeteor.x, activeMeteor.z, timeNow());

    activeMeteor = null;
  }
}

function updateCamera(dt) {
  if (GAME.debugFreeCamera) {
    controls.update();
    return;
  }

  const camDistance =
    GAME.currentLevel === 3 ? 42 :
    GAME.currentLevel === 2 ? 34 :
    WORLD.player.camDistance;

  const camHeight =
    GAME.currentLevel === 3 ? 24 :
    GAME.currentLevel === 2 ? 18 :
    WORLD.player.camHeight;

  const behind = new THREE.Vector3(
    -Math.sin(player.yaw) * camDistance,
    camHeight,
    -Math.cos(player.yaw) * camDistance
  );

  const targetPos = player.pos.clone().add(behind);

  camera.position.lerp(targetPos, 0.10);

  const lookAt = player.pos.clone();
  lookAt.y += GAME.currentLevel === 1 ? 3 : 8;

  camera.lookAt(lookAt);
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.033);
  const t = timeNow();

  applyDayNightCycle(t);

  updatePlayer(dt);
  updateCamera(dt);

  updateLevel1(dt);
  updateLevel2(dt);
  updateLevel3(dt);

  updateBeaconAnimations(t);
  updateForest(t, dt);
  applyTerrainEarthquake(t, dt);
  updateRingUniforms(t);

  updateMeteor(dt);
  updateDebris(dt);

  if (water) {
    water.material.uniforms.uTime.value = t;
  }

  renderer.render(scene, camera);
  stats.update();
}

// BUTTONS
startMissionBtn.addEventListener('click', () => {
  startMission();
});

restartMissionBtn.addEventListener('click', () => {
  startMission();
});

meteorBtn.addEventListener('click', () => {
  if (GAME.state !== 'PLAYING') return;

  const t = timeNow();
  const x = player.pos.x + Math.sin(player.yaw) * 22;
  const z = player.pos.z + Math.cos(player.yaw) * 22;

  startMeteorStrike(x, z, t);
});

// RESIZE
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
});

// START RENDER LOOP
animate();