const level2Loader = new GLTFLoader();

const LEVEL2 = {
  cityCenter: new THREE.Vector3(),
  doracakes: [],
  collected: 0,
  total: 5,
  meteors: [],
  nextMeteor: 0,
  doraemon: null,
  impactFX: [],
};

let DORACAKE_MODEL = null;
let LEVEL2_CITY = null;

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
  if (LEVEL2_CITY) {
    scene.remove(LEVEL2_CITY);
    LEVEL2_CITY = null;
  }

  for (const d of LEVEL2.doracakes) {
    if (d.mesh) scene.remove(d.mesh);
  }

  for (const m of LEVEL2.meteors) {
    scene.remove(m);
  }

  for (const fx of LEVEL2.impactFX) {
    scene.remove(fx.mesh);
  }

  if (LEVEL2.doraemon && LEVEL2.doraemon.parent) {
    LEVEL2.doraemon.parent.remove(LEVEL2.doraemon);
  }

  LEVEL2.doracakes = [];
  LEVEL2.meteors = [];
  LEVEL2.impactFX = [];
  LEVEL2.doraemon = null;
  LEVEL2.collected = 0;
  LEVEL2.nextMeteor = 0;
}

function startLevel2() {
  GAME.currentLevel = 2;
  GAME.state = 'PLAYING';

  clearLevel2Scene();

  if (terrainMesh) terrainMesh.visible = false;
  if (forest) forest.visible = false;
  if (water) water.visible = false;
  if (grid) grid.visible = false;
  if (beaconGroup) beaconGroup.visible = false;

  hideOriginalPlayerDrone();

  missionStateEl.textContent = 'Collect Doracakes';
  beaconsLeftEl.textContent = LEVEL2.total.toString();
  damageLimitEl.textContent = '-';
  promptEl.style.display = 'none';
  warningEl.style.display = 'block';
  warningEl.textContent = '🍩 Collect all Doracakes';

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

    const scale = 120 / Math.max(size.x, size.y, size.z);
    city.scale.setScalar(scale);

    city.position.x -= center.x;
    city.position.z -= center.z;
    city.position.y += 50;

    const box2 = new THREE.Box3().setFromObject(city);
    box2.getCenter(LEVEL2.cityCenter);

    player.pos.set(
      LEVEL2.cityCenter.x - 40,
      LEVEL2.cityCenter.y + 10,
      LEVEL2.cityCenter.z - 40
    );
    player.group.position.copy(player.pos);

    spawnDoracakes();
  });

  level2Loader.load('/models/doraemon.glb', (gltf) => {
    const d = gltf.scene;
    LEVEL2.doraemon = d;

    d.scale.set(2, 2, 2);
    d.position.set(0, 0, 0);
    d.rotation.y = Math.PI;

    player.group.add(d);
  });

  level2Loader.load('/models/doracake.glb', (gltf) => {
    DORACAKE_MODEL = gltf.scene;
  });
}

function spawnDoracakes() {
  const c = LEVEL2.cityCenter;

  const pos = [
    [c.x - 30, c.y + 8, c.z - 30],
    [c.x + 30, c.y + 8, c.z - 30],
    [c.x - 30, c.y + 8, c.z + 30],
    [c.x + 30, c.y + 8, c.z + 30],
    [c.x,      c.y + 8, c.z],
  ];

  for (const p of pos) {
    let mesh;

    if (DORACAKE_MODEL) {
      mesh = DORACAKE_MODEL.clone(true);
      mesh.scale.set(2, 2, 2);
    } else {
      mesh = new THREE.Mesh(
        new THREE.TorusGeometry(3, 1.2, 16, 32),
        new THREE.MeshStandardMaterial({
          color: 0x8b4513,
          emissive: 0xffcc66,
          emissiveIntensity: 0.8,
        })
      );
      mesh.rotation.x = Math.PI / 2;
    }

    mesh.position.set(p[0], p[1], p[2]);
    scene.add(mesh);

    LEVEL2.doracakes.push({
      mesh,
      collected: false,
      seed: Math.random(),
      baseY: p[1],
    });
  }

  beaconsLeftEl.textContent = (LEVEL2.total - LEVEL2.collected).toString();
}

function tryCollectDoracake() {
  for (const d of LEVEL2.doracakes) {
    if (d.collected) continue;

    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(d.mesh).getCenter(center);

    if (player.pos.distanceTo(center) < 14) {
      d.collected = true;
      scene.remove(d.mesh);

      LEVEL2.collected++;
      beaconsLeftEl.textContent = (LEVEL2.total - LEVEL2.collected).toString();

      if (LEVEL2.collected === LEVEL2.total) {
        GAME.state = 'WIN';
        missionStateEl.textContent = 'All Doracakes Collected!';
        promptEl.style.display = 'none';
        warningEl.style.display = 'none';
        endTitle.textContent = 'DORAEMON WINS';
        endMessage.textContent = 'You collected all Doracakes and saved the city!';
        endScreen.style.display = 'flex';
      }
      return;
    }
  }
}

function spawnLevel2Meteor() {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(2, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xaa2200,
      emissiveIntensity: 1.0,
    })
  );

  m.position.set(
    LEVEL2.cityCenter.x + (Math.random() - 0.5) * 80,
    LEVEL2.cityCenter.y + 80,
    LEVEL2.cityCenter.z + (Math.random() - 0.5) * 80
  );

  scene.add(m);
  LEVEL2.meteors.push(m);
}

function createMeteorImpact(pos) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(2, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.9,
    })
  );
  flash.position.copy(pos);
  scene.add(flash);

  LEVEL2.impactFX.push({
    mesh: flash,
    life: 0.3,
    maxLife: 0.3,
    type: 'flash',
  });

  const smoke = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 3, 0.5, 20),
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.7,
    })
  );
  smoke.position.copy(pos);
  smoke.position.y += 0.3;
  scene.add(smoke);

  LEVEL2.impactFX.push({
    mesh: smoke,
    life: 1.2,
    maxLife: 1.2,
    type: 'smoke',
  });

  if (LEVEL2_CITY) {
    LEVEL2_CITY.traverse((obj) => {
      if (!obj.isMesh) return;

      const p = new THREE.Vector3();
      obj.getWorldPosition(p);

      if (p.distanceTo(pos) < 12) {
        obj.rotation.z += (Math.random() - 0.5) * 0.05;

        if (obj.material) {
          obj.material = obj.material.clone();
          if (obj.material.color) obj.material.color.multiplyScalar(0.7);
        }
      }
    });
  }
}

function updateLevel2Meteors(dt) {
  if (timeNow() > LEVEL2.nextMeteor) {
    spawnLevel2Meteor();
    LEVEL2.nextMeteor = timeNow() + 1.5;
  }

  for (let i = LEVEL2.meteors.length - 1; i >= 0; i--) {
    const m = LEVEL2.meteors[i];
    m.position.y -= 40 * dt;
    m.rotation.x += dt * 5;
    m.rotation.z += dt * 4;

    if (m.position.y < LEVEL2.cityCenter.y) {
      const hitPos = new THREE.Vector3(m.position.x, m.position.y, m.position.z);
      createMeteorImpact(hitPos);
      scene.remove(m);
      LEVEL2.meteors.splice(i, 1);
    }
  }
}

function updateLevel2ImpactFX(dt) {
  for (let i = LEVEL2.impactFX.length - 1; i >= 0; i--) {
    const fx = LEVEL2.impactFX[i];
    fx.life -= dt;

    if (fx.type === 'flash') {
      fx.mesh.scale.addScalar(dt * 10);
      fx.mesh.material.opacity = Math.max(0, fx.life / fx.maxLife);
    } else if (fx.type === 'smoke') {
      fx.mesh.scale.x += dt * 2;
      fx.mesh.scale.z += dt * 2;
      fx.mesh.position.y += dt * 1.2;
      fx.mesh.material.opacity = Math.max(0, 0.7 * (fx.life / fx.maxLife));
    }

    if (fx.life <= 0) {
      scene.remove(fx.mesh);
      LEVEL2.impactFX.splice(i, 1);
    }
  }
}

function updateLevel2(dt) {
  updateLevel2Meteors(dt);
  updateLevel2ImpactFX(dt);

  if (LEVEL2.doraemon) {
    if (LEVEL2.doraemon.userData.baseY == null) {
      LEVEL2.doraemon.userData.baseY = LEVEL2.doraemon.position.y;
    }
    LEVEL2.doraemon.position.y =
      LEVEL2.doraemon.userData.baseY + Math.sin(timeNow() * 3) * 0.06;
  }

  for (const d of LEVEL2.doracakes) {
    if (!d.collected) {
      d.mesh.rotation.y += dt * 2;
      d.mesh.position.y = d.baseY + Math.sin(timeNow() * 2 + d.seed) * 0.2;
    }
  }
}