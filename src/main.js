import * as THREE from "three";
import "./style.css";

const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc8d1);
scene.fog = new THREE.Fog(0x9cc8d1, 90, 220);

const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 500);
const clock = new THREE.Clock();
const tmpVec = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const tmpMat = new THREE.Matrix4();
const tmpColor = new THREE.Color();

const dom = {
  hud: document.querySelector("#hud"),
  menu: document.querySelector("#menu"),
  chooser: document.querySelector("#chooser"),
  choices: document.querySelector("#choices"),
  pause: document.querySelector("#pause"),
  result: document.querySelector("#result"),
  resultTitle: document.querySelector("#result-title"),
  resultStats: document.querySelector("#result-stats"),
  start: document.querySelector("#start-btn"),
  resume: document.querySelector("#resume-btn"),
  restart: document.querySelector("#restart-btn"),
  exitMenu: document.querySelector("#menu-btn"),
  again: document.querySelector("#again-btn"),
  slots: [...document.querySelectorAll(".slot")],
  hpBar: document.querySelector("#hp-bar"),
  hpText: document.querySelector("#hp-text"),
  xpBar: document.querySelector("#xp-bar"),
  xpText: document.querySelector("#xp-text"),
  clock: document.querySelector("#run-clock"),
  coins: document.querySelector("#coins"),
  objective: document.querySelector("#objective"),
  menuStats: document.querySelector("#menu-stats"),
  selectedSummary: document.querySelector("#selected-summary"),
  unlockList: document.querySelector("#unlock-list"),
  buildList: document.querySelector("#build-list"),
  toast: document.querySelector("#toast"),
};

const keys = new Set();
const justPressed = new Set();
let selectedCharacter = "lume";
let toastTimer = 0;
const pointer = {
  rotating: false,
  lastX: 0,
  lastY: 0,
};

const cameraRig = {
  yaw: -0.55,
  pitch: 0.62,
  distance: 82,
  targetYaw: -0.55,
  targetPitch: 0.62,
  targetDistance: 82,
};

const DEFAULT_CAMERA = {
  yaw: -0.55,
  pitch: 0.62,
  distance: 82,
};

const ARENA_RADIUS = 104;
const TILE_SIZE = 8;
const META_KEY = "riftbound-rush-meta-v1";
const SHRINE_CHARGE_SECONDS = 5;
const RUN_TIME_LIMIT_SECONDS = 600;
const MAX_GROUNDED_STEP_HEIGHT = 0.58;
const AIR_LEDGE_CLEARANCE = 0.24;
const CROUCH_KEYS = ["ControlLeft", "ControlRight", "KeyQ"];
const GAME_INPUT_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "KeyC",
  "KeyP",
  "KeyF",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
]);

const rarityOrder = ["common", "rare", "epic", "legendary"];
const rarityPower = {
  common: 1,
  rare: 1.45,
  epic: 2,
  legendary: 2.8,
};

const rarityLabel = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const characters = {
  lume: {
    id: "lume",
    name: "Lume",
    color: 0x49e6ff,
    startWeapon: "pulse",
    hp: 105,
    speed: 8.4,
    pickup: 8.5,
    damage: 1,
    attackSpeed: 1,
    armor: 0,
  },
  nix: {
    id: "nix",
    name: "Nix",
    color: 0xf7c948,
    startWeapon: "orbit",
    hp: 145,
    speed: 7.1,
    pickup: 6.8,
    damage: 1.08,
    attackSpeed: 0.96,
    armor: 3,
  },
  vesper: {
    id: "vesper",
    name: "Vesper",
    color: 0xef7df3,
    startWeapon: "comet",
    hp: 86,
    speed: 9.8,
    pickup: 7.4,
    damage: 0.96,
    attackSpeed: 1.18,
    armor: 0,
  },
  orrin: {
    id: "orrin",
    name: "Orrin",
    color: 0x61d394,
    startWeapon: "mine",
    hp: 118,
    speed: 8,
    pickup: 8,
    damage: 1.02,
    attackSpeed: 1,
    armor: 1,
  },
  talia: {
    id: "talia",
    name: "Talia",
    color: 0xff8d5b,
    startWeapon: "chain",
    hp: 92,
    speed: 9.3,
    pickup: 8.2,
    damage: 0.98,
    attackSpeed: 1.22,
    armor: 0,
  },
};

const upgrades = [
  {
    id: "pulse",
    name: "Pulse Bolt",
    type: "weapon",
    max: 8,
    tags: ["weapon", "projectile"],
    description: "Auto-fires bright bolts at the nearest threat.",
  },
  {
    id: "orbit",
    name: "Gyro Blades",
    type: "weapon",
    max: 8,
    tags: ["weapon", "area"],
    description: "Summons orbiting blades that carve through close enemies.",
  },
  {
    id: "mine",
    name: "Rift Mines",
    type: "weapon",
    max: 6,
    unlock: (meta) => meta.unlocks.mine,
    tags: ["weapon", "area"],
    description: "Drops volatile mines that burst when enemies crowd them.",
  },
  {
    id: "comet",
    name: "Comet Hammer",
    type: "weapon",
    max: 7,
    tags: ["weapon", "impact"],
    description: "Launches heavy arcing shots with splash damage.",
  },
  {
    id: "chain",
    name: "Static Lasso",
    type: "weapon",
    max: 6,
    unlock: (meta) => meta.unlocks.chain,
    tags: ["weapon", "chain"],
    description: "Snaps lightning between clustered enemies.",
  },
  {
    id: "prism",
    name: "Prism Fan",
    type: "weapon",
    max: 7,
    unlock: (meta) => meta.unlocks.prism,
    tags: ["weapon", "projectile"],
    description: "Fires a forward fan of short-lived shards at nearby enemies.",
  },
  {
    id: "damage",
    name: "Cracked Sun Lens",
    type: "relic",
    max: 10,
    tags: ["damage"],
    description: "Increases all outgoing damage.",
  },
  {
    id: "haste",
    name: "Tempo Gear",
    type: "relic",
    max: 9,
    tags: ["speed", "cooldown"],
    description: "Weapons cycle faster.",
  },
  {
    id: "vitality",
    name: "Marrow Capacitor",
    type: "relic",
    max: 8,
    tags: ["health"],
    description: "Raises max health and heals a chunk.",
  },
  {
    id: "regen",
    name: "Greenline Thread",
    type: "relic",
    max: 6,
    tags: ["health"],
    description: "Regenerates health every second.",
  },
  {
    id: "armor",
    name: "Glassplate Armor",
    type: "relic",
    max: 7,
    tags: ["defense"],
    description: "Reduces incoming hit damage.",
  },
  {
    id: "speed",
    name: "Skylark Soles",
    type: "relic",
    max: 8,
    tags: ["movement"],
    description: "Improves run speed.",
  },
  {
    id: "magnet",
    name: "Moon Magnet",
    type: "relic",
    max: 7,
    tags: ["loot"],
    description: "Pulls experience shards from farther away.",
  },
  {
    id: "jump",
    name: "Pocket Spring",
    type: "relic",
    max: 3,
    tags: ["movement"],
    description: "Adds jump height and extra air control.",
  },
  {
    id: "dash",
    name: "Blink Latch",
    type: "relic",
    max: 5,
    tags: ["movement"],
    description: "Shortens dash cooldown and lengthens invulnerability.",
  },
  {
    id: "crit",
    name: "Lucky Fracture",
    type: "relic",
    max: 6,
    tags: ["damage", "luck"],
    description: "Adds critical strike chance.",
  },
  {
    id: "area",
    name: "Wide Signal",
    type: "codex",
    max: 6,
    tags: ["area"],
    description: "Expands blades, explosions, and shock arcs.",
  },
  {
    id: "projectile",
    name: "Duplicate Glyph",
    type: "codex",
    max: 4,
    tags: ["projectile"],
    description: "Adds extra shots or blades to many weapons.",
  },
  {
    id: "xp",
    name: "Blue Ledger",
    type: "codex",
    max: 6,
    tags: ["loot"],
    description: "Increases experience gained.",
  },
  {
    id: "luck",
    name: "Tilted Coin",
    type: "codex",
    max: 7,
    tags: ["luck"],
    description: "Improves rare upgrade odds and chip drops.",
  },
  {
    id: "attune",
    name: "Ritual Winder",
    type: "relic",
    max: 5,
    tags: ["utility"],
    description: "Charges shrines faster.",
  },
  {
    id: "shield",
    name: "Quiet Shell",
    type: "relic",
    max: 4,
    tags: ["defense"],
    description: "Recharges a free hit barrier.",
  },
  {
    id: "thorns",
    name: "Backfire Knot",
    type: "relic",
    max: 5,
    tags: ["defense", "damage"],
    description: "Damages enemies that touch you.",
  },
  {
    id: "evasion",
    name: "Smoke Frame",
    type: "relic",
    max: 5,
    unlock: (meta) => meta.unlocks.evasion,
    tags: ["defense", "luck"],
    description: "Adds a chance to dodge incoming hits.",
  },
  {
    id: "greed",
    name: "Chip Engine",
    type: "codex",
    max: 5,
    unlock: (meta) => meta.unlocks.greed,
    tags: ["loot"],
    description: "Increases chip value from drops.",
  },
  {
    id: "bossBane",
    name: "Gatebreaker Ink",
    type: "codex",
    max: 5,
    unlock: (meta) => meta.unlocks.bossBane,
    tags: ["boss"],
    description: "Deals bonus damage to rift bosses.",
  },
];

const upgradeById = Object.fromEntries(upgrades.map((upgrade) => [upgrade.id, upgrade]));

const enemyTypes = {
  skitter: {
    color: 0xe95353,
    hp: 12,
    speed: 3.3,
    damage: 9,
    radius: 1.05,
    xp: 5,
    coins: 0.16,
    geometry: "cone",
  },
  bruiser: {
    color: 0xe99146,
    hp: 42,
    speed: 2.15,
    damage: 15,
    radius: 1.45,
    xp: 13,
    coins: 0.35,
    geometry: "box",
  },
  wisp: {
    color: 0x9f7aea,
    hp: 16,
    speed: 4.55,
    damage: 7,
    radius: 0.86,
    xp: 7,
    coins: 0.22,
    geometry: "sphere",
    flying: true,
  },
  splinter: {
    color: 0x65d693,
    hp: 7,
    speed: 5.1,
    damage: 5,
    radius: 0.7,
    xp: 3,
    coins: 0.1,
    geometry: "tetra",
  },
  crasher: {
    color: 0xff6b3d,
    hp: 24,
    speed: 2.7,
    damage: 18,
    radius: 1.05,
    xp: 10,
    coins: 0.24,
    geometry: "wedge",
    charge: true,
  },
  spiker: {
    color: 0x48c8ff,
    hp: 22,
    speed: 2.35,
    damage: 8,
    radius: 0.92,
    xp: 9,
    coins: 0.2,
    geometry: "diamond",
    shooter: true,
    flying: true,
  },
};

const state = {
  mode: "menu",
  seed: 1,
  rng: Math.random,
  meta: loadMeta(),
  terrainSeed: 1,
  player: null,
  playerObj: null,
  groups: {},
  terrain: null,
  enemies: [],
  enemyBullets: [],
  projectiles: [],
  drops: [],
  chests: [],
  shrines: [],
  shops: [],
  effects: [],
  orbiters: [],
  gate: null,
  currentChoices: [],
  choiceSource: "level",
  weaponTimers: {},
  spawnTimer: 0,
  spawnBudget: 0,
  runStats: null,
  lastObjective: "",
};

if (state.meta.lastCharacter && characters[state.meta.lastCharacter]) {
  selectedCharacter = state.meta.lastCharacter;
}

setupScene();
setupUi();
resize();
requestAnimationFrame(frame);
render();

function setupScene() {
  scene.clear();

  const hemi = new THREE.HemisphereLight(0xf7fbff, 0x4f6a4c, 2.2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4d6, 2.15);
  sun.position.set(-42, 70, 36);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x72f0ff, 0.75);
  rim.position.set(48, 36, -60);
  scene.add(rim);

  state.groups.terrain = new THREE.Group();
  state.groups.props = new THREE.Group();
  state.groups.enemies = new THREE.Group();
  state.groups.projectiles = new THREE.Group();
  state.groups.drops = new THREE.Group();
  state.groups.effects = new THREE.Group();
  scene.add(
    state.groups.terrain,
    state.groups.props,
    state.groups.enemies,
    state.groups.projectiles,
    state.groups.drops,
    state.groups.effects,
  );
}

function setupUi() {
  syncMenuLocks();
  updateMenuMeta();

  dom.slots.forEach((slot) => {
    slot.addEventListener("click", () => {
      const id = slot.dataset.character;
      if (slot.classList.contains("locked")) return;
      selectedCharacter = id;
      state.meta.lastCharacter = id;
      saveMeta();
      dom.slots.forEach((candidate) => candidate.classList.remove("active"));
      slot.classList.add("active");
      syncMenuLocks();
    });
  });

  dom.start.addEventListener("click", () => startRun());
  dom.resume.addEventListener("click", () => togglePause(false));
  dom.restart.addEventListener("click", () => startRun());
  dom.exitMenu.addEventListener("click", () => returnToMenu());
  dom.again.addEventListener("click", () => {
    returnToMenu();
  });

  window.addEventListener("keydown", (event) => {
    if (GAME_INPUT_CODES.has(event.code) && ["playing", "paused", "upgrade"].includes(state.mode)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    justPressed.add(event.code);

    if (event.code === "Enter" && state.mode === "menu") {
      startRun();
    }
    if (event.code === "Escape") {
      releaseGamePointerLock();
    }
    if (event.code === "KeyF") {
      toggleFullscreen();
    }
    if (event.code === "KeyC" && ["playing", "paused"].includes(state.mode)) {
      resetCamera();
    }
    if (event.code === "KeyP" && ["playing", "paused"].includes(state.mode)) {
      togglePause(state.mode === "playing");
    }
    if (event.code === "Escape" && document.fullscreenElement) {
      document.exitFullscreen();
    }
    if (state.mode === "upgrade" && /^Digit[1-3]$/.test(event.code)) {
      chooseUpgrade(Number(event.code.slice(-1)) - 1);
    }
    if (event.code === "KeyR" && state.mode === "over") {
      startRun();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  const blockContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    return false;
  };
  document.addEventListener("contextmenu", blockContextMenu, true);
  window.addEventListener("contextmenu", blockContextMenu, true);
  document.addEventListener(
    "auxclick",
    (event) => {
      if (event.button === 2) blockContextMenu(event);
    },
    true,
  );
  canvas.addEventListener("click", () => {
    if (state.mode === "playing") requestGamePointerLock();
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button === 2) event.preventDefault();
    if (event.button !== 2) return;
    pointer.rotating = true;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (document.pointerLockElement === canvas && state.mode === "playing") {
      orbitCamera(event.movementX * -0.0036, event.movementY * 0.0028);
      return;
    }
    if (!pointer.rotating) return;
    const dx = event.clientX - pointer.lastX;
    const dy = event.clientY - pointer.lastY;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    orbitCamera(dx * -0.006, dy * 0.0045);
  });
  window.addEventListener("pointerup", () => {
    pointer.rotating = false;
  });
  document.addEventListener("pointerlockchange", () => {
    const locked = document.pointerLockElement === canvas;
    pointer.rotating = false;
    canvas.classList.toggle("locked", locked);
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!["playing", "paused"].includes(state.mode)) return;
      event.preventDefault();
      cameraRig.targetDistance = THREE.MathUtils.clamp(cameraRig.targetDistance + event.deltaY * 0.08, 44, 118);
    },
    { passive: false },
  );

  window.addEventListener("resize", resize);
}

function startRun() {
  clearWorld();
  state.seed = Math.floor(Math.random() * 1_000_000_000);
  state.rng = createRng(state.seed);
  state.terrainSeed = state.seed % 9973;
  state.mode = "playing";
  state.currentChoices = [];
  state.choiceSource = "level";
  state.spawnTimer = 0.2;
  state.spawnBudget = 0;
  state.enemies = [];
  state.enemyBullets = [];
  state.projectiles = [];
  state.drops = [];
  state.chests = [];
  state.shrines = [];
  state.shops = [];
  state.effects = [];
  state.orbiters = [];
  state.weaponTimers = {};
  state.runStats = {
    time: 0,
    kills: 0,
    score: 0,
    chests: 0,
    shrines: 0,
    shops: 0,
    bossSpawned: false,
    bossDefeated: false,
    finalSwarm: false,
    finalSwarmTime: 0,
    elites: 0,
    unlocks: [],
  };

  const def = characters[selectedCharacter] || characters.lume;
  state.player = {
    id: def.id,
    name: def.name,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 1.25,
    hp: def.hp,
    maxHp: def.hp,
    baseSpeed: def.speed,
    speed: def.speed,
    pickup: def.pickup,
    damageMult: def.damage,
    attackSpeed: def.attackSpeed,
    armor: def.armor,
    regen: 0,
    critChance: 0.04,
    critMult: 1.8,
    area: 1,
    xpMult: 1,
    luck: 0,
    evasion: 0,
    coinMult: 1,
    projectileBonus: 0,
    bossDamageMult: 1,
    dashCooldown: 1.9,
    dashTimer: 0,
    dashInvuln: 0,
    dashReady: 0,
    crouching: false,
    crouchAmount: 0,
    sliding: false,
    slideTimer: 0,
    slideCooldown: 0,
    slideDirX: 0,
    slideDirZ: 0,
    invuln: 0,
    maxJumps: 1,
    jumpsLeft: 1,
    grounded: true,
    shieldCharges: 0,
    shieldMax: 0,
    shieldTimer: 0,
    thorns: 0,
    shrineSpeed: 1,
    level: 1,
    xp: 0,
    xpNeeded: 28,
    coins: 0,
    upgrades: {},
    weapons: {},
  };
  state.player.y = groundHeight(0, 0);
  state.player.weapons[def.startWeapon] = 1;
  state.player.upgrades[def.startWeapon] = 1;

  createTerrain();
  createPlayerObject(def);
  scatterWorldObjects();
  dom.menu.classList.add("hidden");
  dom.hud.classList.remove("hidden");
  dom.pause.classList.add("hidden");
  dom.result.classList.add("hidden");
  dom.chooser.classList.add("hidden");
  showToast(`${def.name} enters the rift.`);
  updateHud(true);
  requestGamePointerLock();
}

function clearWorld() {
  for (const group of Object.values(state.groups)) {
    while (group.children.length) {
      const child = group.children.pop();
      child.traverse?.((node) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material.dispose?.());
        } else {
          node.material?.dispose?.();
        }
      });
    }
  }
  state.playerObj = null;
  state.gate = null;
}

function createTerrain() {
  const half = Math.ceil(ARENA_RADIUS / TILE_SIZE);
  const count = (half * 2 + 1) ** 2;
  const geometry = new THREE.BoxGeometry(TILE_SIZE * 0.98, 1, TILE_SIZE * 0.98);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.04,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  let index = 0;
  for (let gz = -half; gz <= half; gz += 1) {
    for (let gx = -half; gx <= half; gx += 1) {
      const x = gx * TILE_SIZE;
      const z = gz * TILE_SIZE;
      const dist = Math.hypot(x, z);
      const h = dist > ARENA_RADIUS + 8 ? -4 : groundHeight(x, z);
      tmpMat.makeTranslation(x, h - 0.62, z);
      mesh.setMatrixAt(index, tmpMat);

      const edgeFade = THREE.MathUtils.clamp((ARENA_RADIUS - dist) / 28, 0, 1);
      tmpColor.setHSL(
        0.31 + 0.05 * Math.sin((x + state.terrainSeed) * 0.03),
        0.42 + 0.18 * edgeFade,
        0.34 + 0.1 * Math.sin((z - x) * 0.02) + h * 0.018,
      );
      mesh.setColorAt(index, tmpColor);
      index += 1;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  state.groups.terrain.add(mesh);

  const boundary = new THREE.Mesh(
    new THREE.TorusGeometry(ARENA_RADIUS, 0.35, 8, 160),
    new THREE.MeshStandardMaterial({
      color: 0x2f8f78,
      emissive: 0x0b4a4f,
      emissiveIntensity: 0.55,
      roughness: 0.5,
    }),
  );
  boundary.rotation.x = Math.PI / 2;
  boundary.position.y = -0.2;
  boundary.receiveShadow = true;
  state.groups.props.add(boundary);
}

function createPlayerObject(def) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.72, 1.35, 5, 8),
    new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.46,
      metalness: 0.08,
    }),
  );
  body.castShadow = true;
  body.position.y = 1.2;
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.28, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xf8fbff,
      emissive: 0x78f2ff,
      emissiveIntensity: 0.45,
    }),
  );
  visor.position.set(0, 1.62, -0.62);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.055, 8, 32),
    new THREE.MeshStandardMaterial({
      color: 0xf7c948,
      emissive: 0x4f3400,
      emissiveIntensity: 0.25,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.12;
  group.add(body, visor, ring);
  state.playerObj = group;
  state.groups.props.add(group);
  syncPlayerObject();
}

function scatterWorldObjects() {
  for (let i = 0; i < 8; i += 1) {
    const point = randomArenaPoint(18, 88);
    createChest(point.x, point.z, i);
  }
  for (let i = 0; i < 5; i += 1) {
    const point = randomArenaPoint(22, 82);
    createShrine(point.x, point.z, i);
  }
  for (let i = 0; i < 4; i += 1) {
    const point = randomArenaPoint(28, 76);
    createShop(point.x, point.z, i);
  }
  const gatePoint = randomArenaPoint(48, 76);
  createBossGate(gatePoint.x, gatePoint.z);
}

function createChest(x, z, index) {
  const y = groundHeight(x, z);
  const cost = 6 + Math.floor(index * 1.5);
  const mesh = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.45, 1.75),
    new THREE.MeshStandardMaterial({
      color: 0x2f5f9f,
      roughness: 0.42,
      metalness: 0.35,
    }),
  );
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(2.72, 0.28, 1.92),
    new THREE.MeshStandardMaterial({
      color: 0xf7c948,
      emissive: 0x2d1800,
      emissiveIntensity: 0.2,
    }),
  );
  const interior = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.22, 1.24),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x3bd9ff,
      emissiveIntensity: 1.2,
      roughness: 0.18,
      transparent: true,
      opacity: 0.86,
    }),
  );
  const emptyWell = new THREE.Mesh(
    new THREE.BoxGeometry(2.12, 0.16, 1.34),
    new THREE.MeshStandardMaterial({
      color: 0x0d1b28,
      emissive: 0x05111f,
      emissiveIntensity: 0.28,
      roughness: 0.72,
    }),
  );
  base.castShadow = true;
  lid.castShadow = true;
  base.position.y = 0.72;
  emptyWell.position.y = 1.37;
  interior.position.y = 1.49;
  lid.position.y = 1.58;
  interior.visible = false;
  emptyWell.visible = false;
  mesh.add(base, emptyWell, interior, lid);
  mesh.position.set(x, y, z);
  mesh.rotation.y = (index * 0.83) % Math.PI;
  state.groups.props.add(mesh);
  state.chests.push({
    x,
    y,
    z,
    cost,
    mesh,
    parts: { base, lid, interior, emptyWell },
    opened: false,
    openAmount: 0,
    radius: 2.7,
  });
}

function createShrine(x, z, index) {
  const y = groundHeight(x, z);
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.4, 0.12, 8, 64),
    new THREE.MeshStandardMaterial({
      color: 0x62d6a3,
      emissive: 0x0a5d42,
      emissiveIntensity: 0.45,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.16;
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.78, 3.6, 7),
    new THREE.MeshStandardMaterial({
      color: 0x98f5d0,
      emissive: 0x118f6e,
      emissiveIntensity: 0.65,
      roughness: 0.28,
    }),
  );
  pillar.position.y = 1.8;
  pillar.castShadow = true;
  group.add(ring, pillar);
  group.position.set(x, y, z);
  group.rotation.y = index * 1.1;
  state.groups.props.add(group);

  const progress = new THREE.Group();
  const progressBack = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.18, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x0d1b22 }),
  );
  const progressFill = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.26, 0.24),
    new THREE.MeshBasicMaterial({ color: 0x7ff7d4 }),
  );
  progressBack.position.y = 0;
  progressFill.position.set(-1.9, 0, 0.02);
  progress.add(progressBack, progressFill);
  progress.position.set(x, y + 4.45, z);
  progress.visible = false;
  state.groups.props.add(progress);

  state.shrines.push({
    x,
    y,
    z,
    mesh: group,
    progress,
    progressFill,
    radius: 5,
    charge: 0,
    charged: false,
  });
}

function createShop(x, z, index) {
  const y = groundHeight(x, z);
  const group = new THREE.Group();
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.55, 1, 6),
    new THREE.MeshStandardMaterial({
      color: 0x5442a8,
      roughness: 0.5,
      metalness: 0.15,
    }),
  );
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.2, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xff8d5b,
      emissive: 0x4c1609,
      emissiveIntensity: 0.45,
    }),
  );
  stand.position.y = 0.5;
  sign.position.set(0, 1.8, 0);
  group.add(stand, sign);
  group.position.set(x, y, z);
  group.rotation.y = index * 0.72;
  state.groups.props.add(group);
  state.shops.push({ x, y, z, mesh: group, radius: 3.8, cost: 24, bought: false });
}

function createBossGate(x, z) {
  const y = groundHeight(x, z);
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b223f,
    roughness: 0.35,
    metalness: 0.2,
  });
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0x72f0ff,
    emissive: 0x24bde6,
    emissiveIntensity: 1.1,
    roughness: 0.22,
  });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.4, 0.9), frameMaterial);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.4, 0.9), frameMaterial);
  const top = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.9, 0.9), frameMaterial);
  const core = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 8, 48), glowMaterial);
  left.position.set(-2.7, 3.7, 0);
  right.position.set(2.7, 3.7, 0);
  top.position.set(0, 7.0, 0);
  core.position.y = 3.7;
  core.rotation.y = Math.PI / 2;
  group.add(left, right, top, core);
  group.position.set(x, y, z);
  group.rotation.y = state.rng() * Math.PI;
  state.groups.props.add(group);
  state.gate = { x, y, z, mesh: group, radius: 5.4, active: false };
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === "playing") {
    update(dt);
  }
  render();
}

function update(dt) {
  if (!state.player) return;
  state.runStats.time += dt;
  if (state.runStats.finalSwarm) {
    state.runStats.finalSwarmTime += dt;
  } else if (state.runStats.time >= RUN_TIME_LIMIT_SECONDS) {
    startFinalSwarm();
  }
  toastTimer = Math.max(0, toastTimer - dt);
  if (toastTimer <= 0) dom.toast.classList.remove("show");

  updateCameraControls(dt);
  updatePlayer(dt);
  updateWorldObjects(dt);
  updateDirector(dt);
  updateWeapons(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  updateDrops(dt);
  updateEffects(dt);
  updateMetaUnlocks();
  updateHud();

  if (state.player.hp <= 0) {
    endRun(false);
  }
  justPressed.clear();
}

function updateCameraControls(dt) {
  if (keys.has("ArrowLeft")) cameraRig.targetYaw += dt * 1.8;
  if (keys.has("ArrowRight")) cameraRig.targetYaw -= dt * 1.8;
  if (keys.has("ArrowUp")) cameraRig.targetPitch += dt * 1.15;
  if (keys.has("ArrowDown")) cameraRig.targetPitch -= dt * 1.15;
  cameraRig.targetPitch = THREE.MathUtils.clamp(cameraRig.targetPitch, 0.34, 0.95);
}

function orbitCamera(deltaYaw, deltaPitch) {
  cameraRig.targetYaw += deltaYaw;
  cameraRig.targetPitch = THREE.MathUtils.clamp(cameraRig.targetPitch + deltaPitch, 0.34, 0.95);
}

function resetCamera() {
  cameraRig.targetYaw = DEFAULT_CAMERA.yaw;
  cameraRig.targetPitch = DEFAULT_CAMERA.pitch;
  cameraRig.targetDistance = DEFAULT_CAMERA.distance;
}

function updatePlayer(dt) {
  const player = state.player;
  let mx = 0;
  let mz = 0;
  if (keys.has("KeyW")) mz += 1;
  if (keys.has("KeyS")) mz -= 1;
  if (keys.has("KeyA")) mx -= 1;
  if (keys.has("KeyD")) mx += 1;
  const rawForward = mz;
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= len;
    mz /= len;
  }
  const forwardX = -Math.sin(cameraRig.targetYaw);
  const forwardZ = -Math.cos(cameraRig.targetYaw);
  const rightX = Math.cos(cameraRig.targetYaw);
  const rightZ = -Math.sin(cameraRig.targetYaw);
  const moveX = rightX * mx + forwardX * mz;
  const moveZ = rightZ * mx + forwardZ * mz;

  player.dashReady = Math.max(0, player.dashReady - dt);
  player.dashInvuln = Math.max(0, player.dashInvuln - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.shieldTimer = Math.max(0, player.shieldTimer - dt);
  player.slideCooldown = Math.max(0, player.slideCooldown - dt);

  const crouchHeld = CROUCH_KEYS.some((code) => keys.has(code));
  const crouchPressed = CROUCH_KEYS.some((code) => justPressed.has(code));
  const horizontalSpeed = Math.hypot(player.vx, player.vz);
  const canStartSlide =
    crouchPressed &&
    player.grounded &&
    rawForward > 0.55 &&
    horizontalSpeed > player.speed * 0.74 &&
    player.slideCooldown <= 0 &&
    player.dashTimer <= 0;

  if (canStartSlide) {
    const dirX = horizontalSpeed > 0.1 ? player.vx / horizontalSpeed : moveX;
    const dirZ = horizontalSpeed > 0.1 ? player.vz / horizontalSpeed : moveZ;
    player.sliding = true;
    player.slideTimer = 0.72;
    player.slideCooldown = 0.32;
    player.slideDirX = dirX;
    player.slideDirZ = dirZ;
    const slideSpeed = Math.max(horizontalSpeed * 1.18, player.speed * 1.62);
    player.vx = dirX * slideSpeed;
    player.vz = dirZ * slideSpeed;
    spawnBurst(player.x, player.y + 0.25, player.z, 0xbff4ff, 5, 1.2);
  }

  if (!crouchHeld && player.sliding) {
    player.sliding = false;
    player.slideTimer = 0;
  }

  player.crouching = crouchHeld || player.sliding;
  player.crouchAmount = approach(player.crouchAmount, player.crouching ? 1 : 0, dt * 7.5);

  if (player.shieldMax > 0 && player.shieldCharges < player.shieldMax && player.shieldTimer <= 0) {
    player.shieldCharges += 1;
    player.shieldTimer = 10;
    showToast("Quiet Shell restored a barrier.");
  }

  if ((keys.has("ShiftLeft") || keys.has("ShiftRight")) && player.dashReady <= 0 && len > 0 && !player.sliding) {
    player.dashTimer = 0.18;
    player.dashReady = player.dashCooldown;
    player.dashInvuln = 0.32;
    player.vx = moveX * player.speed * 3.1;
    player.vz = moveZ * player.speed * 3.1;
  }

  if (justPressed.has("Space") && player.jumpsLeft > 0) {
    player.vy = 12.5 + (player.maxJumps - 1) * 0.8;
    player.jumpsLeft -= 1;
    player.grounded = false;
  }

  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
  } else if (player.sliding) {
    player.slideTimer -= dt;
    const steer = THREE.MathUtils.clamp(dt * 3.2, 0, 0.18);
    if (len > 0) {
      player.slideDirX = THREE.MathUtils.lerp(player.slideDirX, moveX, steer);
      player.slideDirZ = THREE.MathUtils.lerp(player.slideDirZ, moveZ, steer);
      const dirLen = Math.max(Math.hypot(player.slideDirX, player.slideDirZ), 0.001);
      player.slideDirX /= dirLen;
      player.slideDirZ /= dirLen;
    }
    const slideSpeed = Math.hypot(player.vx, player.vz);
    const targetSlideSpeed = player.speed * (crouchHeld ? 0.82 : 0.52);
    const nextSlideSpeed = approach(slideSpeed, targetSlideSpeed, 4.6 * dt);
    player.vx = player.slideDirX * nextSlideSpeed;
    player.vz = player.slideDirZ * nextSlideSpeed;
    if (player.slideTimer <= 0 || nextSlideSpeed <= player.speed * 0.88) {
      player.sliding = false;
    }
  } else {
    const accel = player.grounded ? 22 : 11;
    const crouchSpeed = crouchHeld ? 0.58 : 1;
    player.vx = approach(player.vx, moveX * player.speed * crouchSpeed, accel * dt);
    player.vz = approach(player.vz, moveZ * player.speed * crouchSpeed, accel * dt);
  }

  movePlayerHorizontally(dt);
  const dist = Math.hypot(player.x, player.z);
  if (dist > ARENA_RADIUS - 2) {
    const scale = (ARENA_RADIUS - 2) / dist;
    player.x *= scale;
    player.z *= scale;
    player.vx *= -0.25;
    player.vz *= -0.25;
  }

  player.vy -= 26 * dt;
  player.y += player.vy * dt;
  const floor = groundHeight(player.x, player.z);
  if (player.y <= floor) {
    player.y = floor;
    player.vy = 0;
    player.grounded = true;
    player.jumpsLeft = player.maxJumps;
  } else {
    player.grounded = false;
  }

  if (player.regen > 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
  }

  syncPlayerObject();
}

function movePlayerHorizontally(dt) {
  const player = state.player;
  const nextX = player.x + player.vx * dt;
  if (canPlayerOccupy(nextX, player.z)) {
    player.x = nextX;
  } else {
    player.vx = 0;
  }

  const nextZ = player.z + player.vz * dt;
  if (canPlayerOccupy(player.x, nextZ)) {
    player.z = nextZ;
  } else {
    player.vz = 0;
  }
}

function canPlayerOccupy(x, z) {
  const player = state.player;
  if (!player) return true;
  const targetFloor = groundHeight(x, z);
  const allowedRise = player.grounded ? MAX_GROUNDED_STEP_HEIGHT : AIR_LEDGE_CLEARANCE;
  return targetFloor <= player.y + allowedRise;
}

function syncPlayerObject() {
  if (!state.player || !state.playerObj) return;
  const player = state.player;
  state.playerObj.position.set(player.x, player.y, player.z);
  const crouch = player.crouchAmount || 0;
  state.playerObj.scale.set(1 + crouch * 0.06, 1 - crouch * 0.34, 1 + crouch * 0.06);
  if (Math.hypot(player.vx, player.vz) > 0.2) {
    state.playerObj.rotation.y = Math.atan2(player.vx, player.vz);
  }
}

function updateWorldObjects(dt) {
  const player = state.player;
  for (const chest of state.chests) {
    if (chest.opened) {
      chest.openAmount = Math.min(1, chest.openAmount + dt * 4);
      syncChestOpenVisual(chest);
      continue;
    }
    chest.mesh.rotation.y += dt * 0.55;
  }

  for (const shrine of state.shrines) {
    syncShrineProgress(shrine, false);
    if (shrine.charged) {
      shrine.mesh.rotation.y += dt * 0.35;
      continue;
    }
    shrine.mesh.rotation.y += dt * 0.8;
    if (distance2d(player, shrine) < shrine.radius) {
      shrine.charge += (dt * player.shrineSpeed) / SHRINE_CHARGE_SECONDS;
      shrine.mesh.scale.setScalar(1 + shrine.charge * 0.15);
      syncShrineProgress(shrine, true);
      if (shrine.charge >= 1) {
        shrine.charge = 1;
        shrine.charged = true;
        state.runStats.shrines += 1;
        shrine.mesh.scale.setScalar(1.25);
        syncShrineProgress(shrine, true);
        showUpgradeChooser("shrine");
        showToast("Shrine charged.");
        break;
      }
    } else {
      shrine.charge = Math.max(0, shrine.charge - dt * 0.18);
      shrine.mesh.scale.setScalar(1 + shrine.charge * 0.15);
      syncShrineProgress(shrine, false);
    }
  }

  if (justPressed.has("KeyE")) {
    for (const chest of state.chests) {
      if (chest.opened) continue;
      if (distance2d(player, chest) < chest.radius) {
        openChest(chest);
        return;
      }
    }
    for (const shop of state.shops) {
      if (shop.bought) continue;
      if (distance2d(player, shop) < shop.radius) {
        if (player.coins >= shop.cost) {
          player.coins -= shop.cost;
          shop.bought = true;
          shop.mesh.scale.setScalar(0.82);
          state.runStats.shops += 1;
          showUpgradeChooser("shop");
        } else {
          showToast(`Need ${shop.cost} chips for this pedestal.`);
        }
        return;
      }
    }
    if (state.gate && !state.gate.active && distance2d(player, state.gate) < state.gate.radius) {
      spawnBoss();
      return;
    }
  }

  if (state.gate && !state.gate.active) {
    state.gate.mesh.rotation.y += dt * 0.3;
  }
}

function openChest(chest) {
  if (state.player.coins < chest.cost) {
    showToast(`Need ${chest.cost} chips to open this cache.`);
    return false;
  }
  state.player.coins -= chest.cost;
  chest.opened = true;
  chest.openAmount = 1;
  syncChestOpenVisual(chest);
  state.runStats.chests += 1;
  spawnBurst(chest.x, chest.y + 1.4, chest.z, 0xf7c948, 18);
  showToast(`Cache opened for ${chest.cost} chips.`);
  showUpgradeChooser("chest");
  return true;
}

function syncChestOpenVisual(chest) {
  const { base, lid, interior, emptyWell } = chest.parts || {};
  if (!base || !lid || !interior || !emptyWell) return;
  const amount = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(chest.openAmount, 0, 1), 0, 1);
  emptyWell.visible = amount > 0.04;
  interior.visible = amount > 0.08;
  lid.rotation.x = -1.22 * amount;
  lid.position.y = 1.58 + amount * 0.46;
  lid.position.z = -amount * 0.78;
  lid.material.emissiveIntensity = 0.2 + amount * 0.38;
  interior.scale.set(1, 0.2 + amount * 0.8, 1);
  interior.material.opacity = 0.32 + amount * 0.54;
  base.material.emissive.setHex(amount > 0.98 ? 0x061f2e : 0x000000);
  base.material.emissiveIntensity = amount * 0.35;
}

function syncShrineProgress(shrine, active) {
  if (!shrine.progress || !shrine.progressFill) return;
  const charge = THREE.MathUtils.clamp(shrine.charge, 0, 1);
  shrine.progress.visible = active || charge > 0.01 || shrine.charged;
  shrine.progress.lookAt(camera.position);
  const width = Math.max(0.02, 3.72 * charge);
  shrine.progressFill.scale.x = width;
  shrine.progressFill.position.x = -1.86 + width / 2;
  shrine.progressFill.material.color.setHex(shrine.charged ? 0xf7c948 : 0x7ff7d4);
}

function startFinalSwarm() {
  state.runStats.finalSwarm = true;
  state.runStats.finalSwarmTime = Math.max(0, state.runStats.time - RUN_TIME_LIMIT_SECONDS);
  state.spawnTimer = 0;
  if (state.gate && !state.gate.active) {
    state.gate.mesh.scale.setScalar(1.18);
  }
  spawnBurst(state.player.x, state.player.y + 1.4, state.player.z, 0xff5e84, 42, 7);
  showToast("Final swarm. Waves will keep getting worse.");
}

function updateDirector(dt) {
  const time = state.runStats.time;
  const finalSwarm = state.runStats.finalSwarm;
  const finalTime = state.runStats.finalSwarmTime;
  const targetEnemies = finalSwarm
    ? Math.min(145 + Math.floor(finalTime / 4) * 13 + state.player.level * 7, 360)
    : Math.min(42 + Math.floor(time / 6) * 8 + state.player.level * 4, 210);
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.enemies.length < targetEnemies) {
    const wave = finalSwarm
      ? 11 + Math.floor(finalTime / 8) * 2 + Math.floor(state.player.level / 2)
      : 3 + Math.floor(time / 22) + Math.floor(state.player.level / 3);
    for (let i = 0; i < wave; i += 1) {
      spawnEnemy(chooseEnemyType(time, finalSwarm, finalTime), time);
    }
    state.spawnTimer = finalSwarm
      ? Math.max(0.08, 0.38 - finalTime * 0.002)
      : Math.max(0.24, 1.18 - time * 0.005);
  }

  if (!finalSwarm && time > 360 && !state.runStats.bossSpawned && Math.floor(time) % 9 === 0) {
    showToast("The riftstorm is closing. Find the gate.");
  }
}

function chooseEnemyType(time, finalSwarm = false, finalTime = 0) {
  const roll = state.rng();
  if (finalSwarm) {
    if (roll > Math.max(0.62, 0.86 - finalTime / 220)) return "spiker";
    if (roll < Math.min(0.34, 0.16 + finalTime / 260)) return "crasher";
    if (roll > 0.46) return "bruiser";
    if (roll > 0.24) return "wisp";
    return "splinter";
  }
  if (time > 120 && roll > 0.86) return "spiker";
  if (time > 78 && roll < 0.14) return "crasher";
  if (time > 65 && roll > 0.68) return "bruiser";
  if (time > 38 && roll > 0.46) return "wisp";
  if (time > 95 && roll < 0.28) return "splinter";
  return "skitter";
}

function spawnEnemy(typeName, time, atPoint = null) {
  const type = enemyTypes[typeName] || enemyTypes.skitter;
  const point = atPoint || spawnPointAroundPlayer();
  const scale = 1 + time / 260 + Math.max(0, state.player.level - 1) * 0.035;
  const finalScale = state.runStats?.finalSwarm ? 1 + state.runStats.finalSwarmTime / 70 : 1;
  const finalSpeed = state.runStats?.finalSwarm ? 1 + Math.min(state.runStats.finalSwarmTime / 260, 0.38) : 1;
  const elite = state.rng() < Math.min(0.03 + time / 7000, 0.12);
  const enemy = {
    type: typeName,
    x: point.x,
    z: point.z,
    y: groundHeight(point.x, point.z),
    hp: type.hp * scale * finalScale * (elite ? 3.1 : 1),
    maxHp: type.hp * scale * finalScale * (elite ? 3.1 : 1),
    speed: type.speed * finalSpeed * (elite ? 1.12 : 1),
    damage: type.damage * Math.sqrt(finalScale) * (elite ? 1.35 : 1),
    radius: type.radius * (elite ? 1.28 : 1),
    xp: type.xp * (elite ? 2.2 : 1),
    coins: type.coins + (elite ? 0.35 : 0),
    hitTimer: 0,
    aiTimer: type.shooter ? 0.9 + state.rng() * 0.7 : 0,
    chargeTimer: 0,
    chargeCooldown: type.charge ? 0.8 + state.rng() * 0.9 : 0,
    chargeX: 0,
    chargeZ: 0,
    elite,
    boss: false,
  };
  enemy.mesh = makeEnemyMesh(type, enemy);
  state.groups.enemies.add(enemy.mesh);
  state.enemies.push(enemy);
  return enemy;
}

function makeEnemyMesh(type, enemy) {
  let geometry;
  if (type.geometry === "box") geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
  else if (type.geometry === "sphere") geometry = new THREE.OctahedronGeometry(1.1, 0);
  else if (type.geometry === "tetra") geometry = new THREE.TetrahedronGeometry(1.0, 0);
  else if (type.geometry === "wedge") geometry = new THREE.ConeGeometry(1.05, 2.25, 4);
  else if (type.geometry === "diamond") geometry = new THREE.OctahedronGeometry(1.15, 0);
  else geometry = new THREE.ConeGeometry(1.0, 1.9, 6);

  const material = new THREE.MeshStandardMaterial({
    color: enemy.elite ? 0xfff06a : type.color,
    emissive: enemy.elite ? 0x4c3000 : 0x260000,
    emissiveIntensity: enemy.elite ? 0.55 : 0.1,
    roughness: 0.64,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.scale.setScalar(enemy.radius);
  mesh.position.set(enemy.x, enemy.y + enemy.radius, enemy.z);
  return mesh;
}

function spawnBoss() {
  const player = state.player;
  const angle = Math.atan2(player.z - state.gate.z, player.x - state.gate.x);
  const x = state.gate.x + Math.cos(angle) * 9;
  const z = state.gate.z + Math.sin(angle) * 9;
  const y = groundHeight(x, z);
  state.gate.active = true;
  state.runStats.bossSpawned = true;
  state.meta.unlocks.chain = true;
  saveMeta();
  updateMenuMeta();
  showToast("Static Lasso unlocked. Riftwarden incoming.");

  const boss = {
    type: "riftwarden",
    x,
    y,
    z,
    hp: 720 + state.runStats.time * 3.2 + state.player.level * 36,
    maxHp: 720 + state.runStats.time * 3.2 + state.player.level * 36,
    speed: 1.55,
    damage: 22,
    radius: 3.25,
    xp: 180,
    coins: 1,
    hitTimer: 0,
    elite: true,
    boss: true,
    shootTimer: 1.3,
    summonTimer: 5,
  };
  boss.mesh = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.7, 0),
    new THREE.MeshStandardMaterial({
      color: 0x1a2b4f,
      emissive: 0x5ae7ff,
      emissiveIntensity: 0.6,
      metalness: 0.12,
      roughness: 0.3,
    }),
  );
  const crown = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.14, 8, 48),
    new THREE.MeshStandardMaterial({
      color: 0xf7c948,
      emissive: 0x6d4100,
      emissiveIntensity: 0.4,
    }),
  );
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 2.4;
  core.castShadow = true;
  boss.mesh.add(core, crown);
  boss.mesh.position.set(x, y + 3.2, z);
  state.groups.enemies.add(boss.mesh);
  state.enemies.push(boss);
}

function updateWeapons(dt) {
  const weapons = state.player.weapons;
  if (weapons.pulse) updatePulse(dt, weapons.pulse);
  if (weapons.comet) updateComet(dt, weapons.comet);
  if (weapons.prism) updatePrism(dt, weapons.prism);
  if (weapons.mine) updateMines(dt, weapons.mine);
  if (weapons.chain) updateChain(dt, weapons.chain);
  if (weapons.orbit) updateOrbiters(dt, weapons.orbit);
  else clearOrbiters();
}

function updatePulse(dt, level) {
  state.weaponTimers.pulse = (state.weaponTimers.pulse ?? 0) - dt;
  const cooldown = Math.max(0.12, (0.58 - level * 0.025) / state.player.attackSpeed);
  if (state.weaponTimers.pulse > 0) return;
  const target = nearestEnemy(64);
  if (!target) return;
  state.weaponTimers.pulse = cooldown;

  const shots = 1 + Math.floor((level - 1) / 3) + state.player.projectileBonus;
  const baseAngle = Math.atan2(target.z - state.player.z, target.x - state.player.x);
  for (let i = 0; i < shots; i += 1) {
    const spread = (i - (shots - 1) / 2) * 0.13;
    fireProjectile({
      type: "pulse",
      angle: baseAngle + spread,
      speed: 34,
      damage: 12 + level * 4.2,
      radius: 0.42,
      ttl: 1.8,
      pierce: 1 + Math.floor(level / 4),
      color: 0x66e4ff,
    });
  }
}

function updateComet(dt, level) {
  state.weaponTimers.comet = (state.weaponTimers.comet ?? 0) - dt;
  const cooldown = Math.max(0.52, (2.1 - level * 0.08) / state.player.attackSpeed);
  if (state.weaponTimers.comet > 0) return;
  const target = nearestEnemy(76);
  if (!target) return;
  state.weaponTimers.comet = cooldown;
  const angle = Math.atan2(target.z - state.player.z, target.x - state.player.x);
  fireProjectile({
    type: "comet",
    angle,
    speed: 18,
    damage: 32 + level * 8.4,
    radius: 0.95 * state.player.area,
    ttl: 2.5,
    pierce: 0,
    area: 5.6 * state.player.area,
    color: 0xf78f48,
  });
}

function updatePrism(dt, level) {
  state.weaponTimers.prism = (state.weaponTimers.prism ?? 0) - dt;
  const cooldown = Math.max(0.34, (1.18 - level * 0.04) / state.player.attackSpeed);
  if (state.weaponTimers.prism > 0) return;
  const target = nearestEnemy(46);
  if (!target) return;
  state.weaponTimers.prism = cooldown;

  const shots = Math.min(8, 3 + Math.floor(level / 2) + state.player.projectileBonus);
  const baseAngle = Math.atan2(target.z - state.player.z, target.x - state.player.x);
  for (let i = 0; i < shots; i += 1) {
    const spread = shots === 1 ? 0 : (i / (shots - 1) - 0.5) * 0.75;
    fireProjectile({
      type: "prism",
      angle: baseAngle + spread,
      speed: 26,
      damage: 8 + level * 3.2,
      radius: 0.28,
      ttl: 0.95,
      pierce: Math.floor(level / 3),
      color: 0xf0fbff,
    });
  }
}

function updateMines(dt, level) {
  state.weaponTimers.mine = (state.weaponTimers.mine ?? 0) - dt;
  const cooldown = Math.max(0.72, (2.7 - level * 0.12) / state.player.attackSpeed);
  if (state.weaponTimers.mine > 0) return;
  state.weaponTimers.mine = cooldown;
  const player = state.player;
  const mine = {
    type: "mine",
    x: player.x - player.vx * 0.08,
    y: groundHeight(player.x, player.z) + 0.2,
    z: player.z - player.vz * 0.08,
    vx: 0,
    vz: 0,
    radius: 1.2,
    damage: 24 + level * 6,
    area: (4.2 + level * 0.32) * state.player.area,
    ttl: 9,
    armed: 0.35,
    mesh: new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.9, 0.32, 8),
      new THREE.MeshStandardMaterial({
        color: 0x68f77a,
        emissive: 0x14631f,
        emissiveIntensity: 0.65,
      }),
    ),
  };
  mine.mesh.position.set(mine.x, mine.y, mine.z);
  mine.mesh.castShadow = true;
  state.groups.projectiles.add(mine.mesh);
  state.projectiles.push(mine);
}

function updateChain(dt, level) {
  state.weaponTimers.chain = (state.weaponTimers.chain ?? 0) - dt;
  const cooldown = Math.max(0.45, (1.75 - level * 0.08) / state.player.attackSpeed);
  if (state.weaponTimers.chain > 0) return;
  const first = nearestEnemy(58 + level * 2);
  if (!first) return;
  state.weaponTimers.chain = cooldown;
  const jumped = new Set();
  let current = first;
  let from = { x: state.player.x, y: state.player.y + 1.6, z: state.player.z };
  const jumps = 2 + Math.floor(level / 2) + Math.floor(state.player.area);
  for (let i = 0; i < jumps && current; i += 1) {
    jumped.add(current);
    dealDamage(current, 15 + level * 5.5, "chain");
    createBeam(from, current, 0x8ff8ff);
    from = current;
    current = nearestEnemyTo(current, 13 * state.player.area, jumped);
  }
}

function updateOrbiters(dt, level) {
  const desired = Math.min(12, 2 + level + state.player.projectileBonus);
  while (state.orbiters.length < desired) {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.58, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfff06a,
        emissive: 0x8a5900,
        emissiveIntensity: 0.58,
        roughness: 0.35,
      }),
    );
    mesh.castShadow = true;
    state.groups.projectiles.add(mesh);
    state.orbiters.push({ mesh, angle: state.rng() * Math.PI * 2, hit: new WeakMap() });
  }
  while (state.orbiters.length > desired) {
    const orbiter = state.orbiters.pop();
    state.groups.projectiles.remove(orbiter.mesh);
  }

  const radius = (3.5 + level * 0.22) * state.player.area;
  const speed = 2.8 + level * 0.14;
  for (let i = 0; i < state.orbiters.length; i += 1) {
    const orbiter = state.orbiters[i];
    orbiter.angle += dt * speed * (i % 2 ? -1 : 1);
    const angle = orbiter.angle + (i / state.orbiters.length) * Math.PI * 2;
    const x = state.player.x + Math.cos(angle) * radius;
    const z = state.player.z + Math.sin(angle) * radius;
    const y = state.player.y + 1.1 + Math.sin(angle * 2) * 0.35;
    orbiter.mesh.position.set(x, y, z);
    orbiter.mesh.rotation.x += dt * 8;
    orbiter.mesh.rotation.y += dt * 12;
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const lastHit = orbiter.hit.get(enemy) || 0;
      if (state.runStats.time - lastHit < 0.42) continue;
      if (Math.hypot(enemy.x - x, enemy.z - z) < enemy.radius + 0.9) {
        orbiter.hit.set(enemy, state.runStats.time);
        dealDamage(enemy, 10 + level * 3.7, "orbit");
      }
    }
  }
}

function clearOrbiters() {
  while (state.orbiters.length) {
    const orbiter = state.orbiters.pop();
    state.groups.projectiles.remove(orbiter.mesh);
  }
}

function fireProjectile(config) {
  const player = state.player;
  const geometry =
    config.type === "comet"
      ? new THREE.IcosahedronGeometry(config.radius, 0)
      : new THREE.SphereGeometry(config.radius, 8, 8);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    emissive: config.color,
    emissiveIntensity: config.type === "comet" ? 0.45 : 0.75,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  const projectile = {
    type: config.type,
    x: player.x,
    y: player.y + 1.35,
    z: player.z,
    vx: Math.cos(config.angle) * config.speed,
    vz: Math.sin(config.angle) * config.speed,
    damage: config.damage,
    radius: config.radius,
    ttl: config.ttl,
    pierce: config.pierce,
    area: config.area || 0,
    mesh,
    hit: new Set(),
  };
  mesh.position.set(projectile.x, projectile.y, projectile.z);
  state.groups.projectiles.add(mesh);
  state.projectiles.push(projectile);
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = state.projectiles[i];
    projectile.ttl -= dt;

    if (projectile.type === "mine") {
      projectile.armed -= dt;
      projectile.mesh.rotation.y += dt * 3.5;
      if (projectile.armed <= 0) {
        const enemy = state.enemies.find(
          (candidate) =>
            !candidate.dead && Math.hypot(candidate.x - projectile.x, candidate.z - projectile.z) < projectile.area,
        );
        if (enemy) {
          explode(projectile.x, projectile.y, projectile.z, projectile.area, projectile.damage, 0x68f77a);
          removeProjectile(i);
          continue;
        }
      }
      if (projectile.ttl <= 0) {
        removeProjectile(i);
      }
      continue;
    }

    projectile.x += projectile.vx * dt;
    projectile.z += projectile.vz * dt;
    projectile.y = groundHeight(projectile.x, projectile.z) + (projectile.type === "comet" ? 1.2 : 1.35);
    projectile.mesh.position.set(projectile.x, projectile.y, projectile.z);
    projectile.mesh.rotation.x += dt * 8;
    projectile.mesh.rotation.y += dt * 6;

    let consumed = projectile.ttl <= 0 || Math.hypot(projectile.x, projectile.z) > ARENA_RADIUS + 18;
    for (const enemy of state.enemies) {
      if (enemy.dead || projectile.hit.has(enemy)) continue;
      if (Math.hypot(enemy.x - projectile.x, enemy.z - projectile.z) < enemy.radius + projectile.radius) {
        projectile.hit.add(enemy);
        if (projectile.area > 0) {
          explode(projectile.x, projectile.y, projectile.z, projectile.area, projectile.damage, 0xf78f48);
          consumed = true;
        } else {
          dealDamage(enemy, projectile.damage, projectile.type);
          projectile.pierce -= 1;
          consumed = projectile.pierce < 0;
        }
        if (consumed) break;
      }
    }

    if (consumed) {
      removeProjectile(i);
    }
  }

  for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.enemyBullets[i];
    bullet.ttl -= dt;
    bullet.x += bullet.vx * dt;
    bullet.z += bullet.vz * dt;
    bullet.y = groundHeight(bullet.x, bullet.z) + 1.1;
    bullet.mesh.position.set(bullet.x, bullet.y, bullet.z);
    if (distance2d(bullet, state.player) < bullet.radius + state.player.radius) {
      damagePlayer(bullet.damage);
      removeEnemyBullet(i);
      continue;
    }
    if (bullet.ttl <= 0 || Math.hypot(bullet.x, bullet.z) > ARENA_RADIUS + 20) {
      removeEnemyBullet(i);
    }
  }
}

function removeProjectile(index) {
  const projectile = state.projectiles[index];
  state.groups.projectiles.remove(projectile.mesh);
  projectile.mesh.geometry?.dispose?.();
  projectile.mesh.material?.dispose?.();
  state.projectiles.splice(index, 1);
}

function removeEnemyBullet(index) {
  const bullet = state.enemyBullets[index];
  state.groups.projectiles.remove(bullet.mesh);
  bullet.mesh.geometry?.dispose?.();
  bullet.mesh.material?.dispose?.();
  state.enemyBullets.splice(index, 1);
}

function explode(x, y, z, radius, damage, color) {
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const distance = Math.hypot(enemy.x - x, enemy.z - z);
    if (distance < radius + enemy.radius) {
      dealDamage(enemy, damage * (1 - Math.min(distance / (radius * 1.35), 0.75)), "explosion");
    }
  }
  spawnBurst(x, y, z, color, 24, radius);
}

function updateEnemies(dt) {
  const player = state.player;
  for (const enemy of [...state.enemies]) {
    if (enemy.dead) continue;
    enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);

    if (enemy.boss) {
      updateBoss(enemy, dt);
    } else if (enemyTypes[enemy.type]?.charge) {
      updateChargingEnemy(enemy, dt);
    } else if (enemyTypes[enemy.type]?.shooter) {
      updateShooterEnemy(enemy, dt);
    } else {
      const dx = player.x - enemy.x;
      const dz = player.z - enemy.z;
      const len = Math.max(Math.hypot(dx, dz), 0.001);
      enemy.x += (dx / len) * enemy.speed * dt;
      enemy.z += (dz / len) * enemy.speed * dt;
      syncEnemyMesh(enemy, dt);
    }

    if (distance2d(enemy, player) < enemy.radius + player.radius) {
      damagePlayer(enemy.damage);
      if (player.thorns > 0) {
        dealDamage(enemy, player.thorns, "thorns");
      }
    }
  }
}

function updateChargingEnemy(enemy, dt) {
  const player = state.player;
  const dx = player.x - enemy.x;
  const dz = player.z - enemy.z;
  const len = Math.max(Math.hypot(dx, dz), 0.001);
  enemy.chargeCooldown = Math.max(0, enemy.chargeCooldown - dt);

  if (enemy.chargeTimer <= 0 && enemy.chargeCooldown <= 0 && len < 34) {
    enemy.chargeTimer = 0.58;
    enemy.chargeCooldown = 2.35 + state.rng() * 0.7;
    enemy.chargeX = dx / len;
    enemy.chargeZ = dz / len;
    spawnBurst(enemy.x, enemy.y + 1.2, enemy.z, enemyTypes[enemy.type].color, 5, 1.4);
  }

  if (enemy.chargeTimer > 0) {
    enemy.chargeTimer -= dt;
    enemy.x += enemy.chargeX * enemy.speed * 3.15 * dt;
    enemy.z += enemy.chargeZ * enemy.speed * 3.15 * dt;
    enemy.mesh.scale.setScalar(enemy.radius * (1.08 + Math.sin(enemy.chargeTimer * 28) * 0.04));
  } else {
    enemy.x += (dx / len) * enemy.speed * dt;
    enemy.z += (dz / len) * enemy.speed * dt;
    enemy.mesh.scale.setScalar(enemy.radius);
  }

  syncEnemyMesh(enemy, dt, enemy.chargeTimer > 0 ? 4.5 : 2.0);
}

function updateShooterEnemy(enemy, dt) {
  const player = state.player;
  const dx = player.x - enemy.x;
  const dz = player.z - enemy.z;
  const distance = Math.max(Math.hypot(dx, dz), 0.001);
  const dirX = dx / distance;
  const dirZ = dz / distance;
  const orbitX = -dirZ;
  const orbitZ = dirX;
  const desiredDistance = 32;
  let moveX = 0;
  let moveZ = 0;

  if (distance > desiredDistance + 7) {
    moveX += dirX;
    moveZ += dirZ;
  } else if (distance < desiredDistance - 8) {
    moveX -= dirX;
    moveZ -= dirZ;
  }
  moveX += orbitX * 0.42;
  moveZ += orbitZ * 0.42;
  const moveLen = Math.max(Math.hypot(moveX, moveZ), 0.001);
  enemy.x += (moveX / moveLen) * enemy.speed * dt;
  enemy.z += (moveZ / moveLen) * enemy.speed * dt;

  enemy.aiTimer -= dt;
  if (enemy.aiTimer <= 0 && distance < 48) {
    enemy.aiTimer = Math.max(0.95, 1.85 - state.runStats.time / 420) + state.rng() * 0.45;
    fireEnemyBullet(enemy, Math.atan2(dz, dx), {
      color: 0x7fe7ff,
      speed: 12.8,
      damage: enemy.damage,
      radius: 0.48,
      ttl: 3.6,
    });
  }

  syncEnemyMesh(enemy, dt, 2.4);
}

function syncEnemyMesh(enemy, dt, turnSpeed = 1.5) {
  const type = enemyTypes[enemy.type] || enemyTypes.skitter;
  enemy.y = groundHeight(enemy.x, enemy.z);
  enemy.mesh.position.set(enemy.x, enemy.y + enemy.radius + (type.flying ? 1.2 : 0), enemy.z);
  enemy.mesh.rotation.y += dt * (enemy.elite ? turnSpeed + 1 : turnSpeed);
}

function updateBoss(enemy, dt) {
  const player = state.player;
  const dx = player.x - enemy.x;
  const dz = player.z - enemy.z;
  const len = Math.max(Math.hypot(dx, dz), 0.001);
  enemy.x += (dx / len) * enemy.speed * dt;
  enemy.z += (dz / len) * enemy.speed * dt;
  enemy.y = groundHeight(enemy.x, enemy.z);
  enemy.mesh.position.set(enemy.x, enemy.y + enemy.radius, enemy.z);
  enemy.mesh.rotation.y += dt * 0.65;
  enemy.mesh.scale.setScalar(1 + Math.sin(state.runStats.time * 5) * 0.035);

  enemy.shootTimer -= dt;
  enemy.summonTimer -= dt;
  if (enemy.shootTimer <= 0) {
    enemy.shootTimer = Math.max(0.72, 1.45 - state.runStats.time / 520);
    const count = 8 + Math.floor(state.player.level / 4);
    const base = Math.atan2(player.z - enemy.z, player.x - enemy.x);
    for (let i = 0; i < count; i += 1) {
      const angle = base + (i / count) * Math.PI * 2;
      fireEnemyBullet(enemy, angle);
    }
  }
  if (enemy.summonTimer <= 0) {
    enemy.summonTimer = 6;
    for (let i = 0; i < 5; i += 1) {
      spawnEnemy(i % 2 ? "wisp" : "splinter", state.runStats.time, {
        x: enemy.x + Math.cos((i / 5) * Math.PI * 2) * 8,
        z: enemy.z + Math.sin((i / 5) * Math.PI * 2) * 8,
      });
    }
    showToast("Riftwarden called reinforcements.");
  }
}

function fireEnemyBullet(enemy, angle, options = {}) {
  const color = options.color || 0xff5e84;
  const radius = options.radius || 0.55;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 8),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.75,
    }),
  );
  const bullet = {
    x: enemy.x,
    y: enemy.y + 1.2,
    z: enemy.z,
    vx: Math.cos(angle) * (options.speed || 10.5),
    vz: Math.sin(angle) * (options.speed || 10.5),
    radius: radius + 0.07,
    damage: options.damage || 13,
    ttl: options.ttl || 4.5,
    mesh,
  };
  mesh.position.set(bullet.x, bullet.y, bullet.z);
  state.groups.projectiles.add(mesh);
  state.enemyBullets.push(bullet);
}

function damagePlayer(amount) {
  const player = state.player;
  if (player.invuln > 0 || player.dashInvuln > 0) return;
  if (player.evasion > 0 && state.rng() < player.evasion) {
    player.invuln = 0.25;
    spawnBurst(player.x, player.y + 1.2, player.z, 0xc8f7ff, 8, 1.6);
    return;
  }
  if (player.shieldCharges > 0) {
    player.shieldCharges -= 1;
    player.invuln = 0.5;
    showToast("Barrier absorbed the hit.");
    spawnBurst(player.x, player.y + 1.2, player.z, 0x9ff7ff, 12, 2.2);
    return;
  }
  const damage = Math.max(1, amount - player.armor);
  player.hp -= damage;
  player.invuln = 0.55;
  spawnBurst(player.x, player.y + 1.2, player.z, 0xe95353, 8, 1.8);
}

function dealDamage(enemy, amount, source) {
  if (enemy.dead) return;
  let damage = amount * state.player.damageMult;
  if (enemy.boss) damage *= state.player.bossDamageMult;
  if (state.rng() < state.player.critChance) damage *= state.player.critMult;
  if (source === "pulse" && hasSynergy("pulse", "projectile")) damage *= 1.08;
  enemy.hp -= damage;
  enemy.hitTimer = 0.08;
  if (enemy.mesh.material?.emissive) {
    enemy.mesh.material.emissive.setHex(0xffffff);
    setTimeout(() => {
      if (enemy.mesh?.material?.emissive) enemy.mesh.material.emissive.setHex(enemy.elite ? 0x4c3000 : 0x260000);
    }, 50);
  }
  if (enemy.hp <= 0) {
    killEnemy(enemy);
  }
}

function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  state.runStats.kills += 1;
  state.runStats.score += enemy.boss ? 5000 : Math.round(enemy.maxHp);
  spawnDrop(enemy.x, enemy.y, enemy.z, enemy.xp, "xp");
  if (state.rng() < enemy.coins + state.player.luck * 0.04) {
    spawnDrop(enemy.x + state.rng() * 1.4 - 0.7, enemy.y, enemy.z + state.rng() * 1.4 - 0.7, 1, "coin");
  }
  if (enemy.boss) {
    state.runStats.bossDefeated = true;
    spawnBurst(enemy.x, enemy.y + 3, enemy.z, 0xf7c948, 80, 10);
    endRun(true);
  } else if (enemy.elite) {
    state.runStats.elites += 1;
    if (state.rng() < 0.45) spawnDrop(enemy.x, enemy.y, enemy.z, 9, "coin");
  }
  state.groups.enemies.remove(enemy.mesh);
  enemy.mesh.traverse?.((node) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose?.());
    else node.material?.dispose?.();
  });
  const index = state.enemies.indexOf(enemy);
  if (index >= 0) state.enemies.splice(index, 1);
}

function spawnDrop(x, y, z, value, type) {
  const isCoin = type === "coin";
  const mesh = new THREE.Mesh(
    isCoin ? new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12) : new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({
      color: isCoin ? 0xf7c948 : 0x55d6ff,
      emissive: isCoin ? 0x5f3b00 : 0x0d5c8f,
      emissiveIntensity: 0.58,
      roughness: 0.22,
      metalness: isCoin ? 0.35 : 0.05,
    }),
  );
  mesh.position.set(x, y + 0.7, z);
  state.groups.drops.add(mesh);
  state.drops.push({
    x,
    y: y + 0.7,
    z,
    value,
    type,
    mesh,
    bob: state.rng() * Math.PI * 2,
  });
}

function updateDrops(dt) {
  const player = state.player;
  for (let i = state.drops.length - 1; i >= 0; i -= 1) {
    const drop = state.drops[i];
    const dist = distance2d(player, drop);
    const pullRange = drop.type === "coin" ? player.pickup * 0.8 : player.pickup;
    if (dist < pullRange) {
      const speed = (drop.type === "coin" ? 19 : 23) * (1 - dist / pullRange + 0.35);
      drop.x += ((player.x - drop.x) / Math.max(dist, 0.001)) * speed * dt;
      drop.z += ((player.z - drop.z) / Math.max(dist, 0.001)) * speed * dt;
    }
    drop.bob += dt * 5;
    drop.y = groundHeight(drop.x, drop.z) + 0.7 + Math.sin(drop.bob) * 0.18;
    drop.mesh.position.set(drop.x, drop.y, drop.z);
    drop.mesh.rotation.y += dt * 4;
    if (dist < player.radius + 0.9) {
      if (drop.type === "coin") {
        player.coins += Math.max(1, Math.round(drop.value * player.coinMult));
      } else {
        addXp(drop.value * player.xpMult);
      }
      state.groups.drops.remove(drop.mesh);
      drop.mesh.geometry.dispose();
      drop.mesh.material.dispose();
      state.drops.splice(i, 1);
    }
  }
}

function addXp(amount) {
  const player = state.player;
  player.xp += amount;
  if (player.xp >= player.xpNeeded && state.mode === "playing") {
    player.xp -= player.xpNeeded;
    player.level += 1;
    player.xpNeeded = Math.floor(30 + player.level ** 1.42 * 13);
    player.hp = Math.min(player.maxHp, player.hp + 12);
    showUpgradeChooser("level");
  }
}

function showUpgradeChooser(source) {
  if (state.mode !== "playing") return;
  releaseGamePointerLock();
  state.choiceSource = source;
  state.mode = "upgrade";
  state.currentChoices = rollUpgradeChoices(source);
  dom.choices.innerHTML = "";
  state.currentChoices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = `choice ${choice.rarity}`;
    button.innerHTML = renderChoiceCard(choice, index);
    button.addEventListener("click", () => chooseUpgrade(index));
    dom.choices.append(button);
  });
  dom.chooser.classList.remove("hidden");
}

function renderChoiceCard(choice, index) {
  const current = state.player.upgrades[choice.id] || 0;
  const amount = choice.type === "weapon" && rarityPower[choice.rarity] >= 2 ? 2 : 1;
  const next = Math.min(choice.max, current + amount);
  const currentLabel = current > 0 ? roman(current) : "New";
  const nextLabel = roman(next);
  return [
    `<small>${index + 1} - ${rarityLabel[choice.rarity]} ${typeLabel(choice.type)}</small>`,
    `<b>${choice.name}</b>`,
    `<div class="choice-level">${currentLabel} to ${nextLabel}</div>`,
    `<span>${choice.description}</span>`,
    `<em>Press ${index + 1} or click to pick</em>`,
  ].join("");
}

function chooseUpgrade(index) {
  const choice = state.currentChoices[index];
  if (!choice) return;
  applyUpgrade(choice);
  dom.chooser.classList.add("hidden");
  state.currentChoices = [];
  state.mode = "playing";
  updateHud(true);
  requestGamePointerLock();
  if (state.player.xp >= state.player.xpNeeded) {
    addXp(0);
  }
}

function rollUpgradeChoices(source) {
  const available = upgrades.filter((upgrade) => {
    const current = state.player.upgrades[upgrade.id] || 0;
    if (current >= upgrade.max) return false;
    if (upgrade.unlock && !upgrade.unlock(state.meta, state)) return false;
    return true;
  });
  const chosen = [];
  let guard = 80;
  while (chosen.length < 3 && guard > 0 && available.length) {
    guard -= 1;
    const upgrade = available[Math.floor(state.rng() * available.length)];
    if (chosen.some((choice) => choice.id === upgrade.id)) continue;
    const rarity = rollRarity(source);
    chosen.push({
      ...upgrade,
      rarity,
      description: describeUpgrade(upgrade, rarity),
    });
  }
  return chosen;
}

function rollRarity(source) {
  const luck = state.player.luck;
  let roll = state.rng();
  if (source === "chest") roll += 0.16;
  if (source === "shrine") roll += 0.23;
  if (source === "shop") roll += 0.1;
  roll += luck * 0.055;
  if (roll > 0.985) return "legendary";
  if (roll > 0.89) return "epic";
  if (roll > 0.63) return "rare";
  return "common";
}

function describeUpgrade(upgrade, rarity) {
  const power = rarityPower[rarity];
  if (upgrade.type === "weapon") {
    return `${upgrade.description} +${power >= 2 ? 2 : 1} level${power >= 2 ? "s" : ""}.`;
  }
  const details = {
    damage: `All damage +${Math.round(14 * power)}%.`,
    haste: `Weapon speed +${Math.round(12 * power)}%.`,
    vitality: `Max health +${Math.round(18 * power)} and heal now.`,
    regen: `Health regen +${(0.65 * power).toFixed(1)}/sec.`,
    armor: `Incoming damage -${Math.round(1.2 * power)}.`,
    speed: `Movement speed +${Math.round(6 * power)}%.`,
    magnet: `Pickup range +${Math.round(2.3 * power)}m.`,
    jump: "Jump power improves. First copy adds one extra jump.",
    dash: `Dash cooldown -${Math.round(8 * power)}%.`,
    crit: `Critical chance +${Math.round(5 * power)}%.`,
    area: `Area effects +${Math.round(12 * power)}%.`,
    projectile: "Adds extra shots or blades to several weapons.",
    xp: `Experience gained +${Math.round(14 * power)}%.`,
    luck: `Rare odds and chip drops +${Math.round(10 * power)}%.`,
    attune: `Shrine charge speed +${Math.round(22 * power)}%.`,
    shield: "Adds a recharging barrier stack.",
    thorns: `Touching enemies take ${Math.round(10 * power)} backfire damage.`,
    evasion: `Dodge chance +${Math.round(4 * power)}%.`,
    greed: `Chip value +${Math.round(20 * power)}%.`,
    bossBane: `Boss damage +${Math.round(18 * power)}%.`,
  };
  return `${upgrade.description} ${details[upgrade.id] || ""}`;
}

function applyUpgrade(choice) {
  const player = state.player;
  const power = rarityPower[choice.rarity];
  const amount = choice.type === "weapon" && power >= 2 ? 2 : 1;
  player.upgrades[choice.id] = (player.upgrades[choice.id] || 0) + amount;
  if (choice.type === "weapon") {
    player.weapons[choice.id] = (player.weapons[choice.id] || 0) + amount;
  } else {
    switch (choice.id) {
      case "damage":
        player.damageMult += 0.14 * power;
        break;
      case "haste":
        player.attackSpeed += 0.12 * power;
        break;
      case "vitality": {
        const gain = Math.round(18 * power);
        player.maxHp += gain;
        player.hp = Math.min(player.maxHp, player.hp + gain + 10);
        break;
      }
      case "regen":
        player.regen += 0.65 * power;
        break;
      case "armor":
        player.armor += 1.2 * power;
        break;
      case "speed":
        player.speed += player.baseSpeed * 0.06 * power;
        break;
      case "magnet":
        player.pickup += 2.3 * power;
        break;
      case "jump":
        player.maxJumps = Math.min(3, player.maxJumps + 1);
        player.speed += 0.18 * power;
        break;
      case "dash":
        player.dashCooldown = Math.max(0.65, player.dashCooldown * (1 - 0.08 * power));
        break;
      case "crit":
        player.critChance = Math.min(0.82, player.critChance + 0.05 * power);
        break;
      case "area":
        player.area += 0.12 * power;
        break;
      case "projectile":
        player.projectileBonus += 1;
        break;
      case "xp":
        player.xpMult += 0.14 * power;
        break;
      case "luck":
        player.luck += 0.1 * power;
        break;
      case "attune":
        player.shrineSpeed += 0.22 * power;
        break;
      case "evasion":
        player.evasion = Math.min(0.45, player.evasion + 0.04 * power);
        break;
      case "greed":
        player.coinMult += 0.2 * power;
        break;
      case "shield":
        player.shieldMax += 1;
        player.shieldCharges = player.shieldMax;
        player.shieldTimer = 8;
        break;
      case "thorns":
        player.thorns += 10 * power;
        break;
      case "bossBane":
        player.bossDamageMult += 0.18 * power;
        break;
      default:
        break;
    }
  }
  showToast(`${choice.name} ${choice.type === "weapon" ? "upgraded" : "equipped"}.`);
}

function updateMetaUnlocks() {
  const meta = state.meta;
  const unlocked = [];
  if (!meta.unlocks.nix && state.runStats.kills >= 180) {
    meta.unlocks.nix = true;
    unlocked.push("Nix");
  }
  if (!meta.unlocks.vesper && state.runStats.shrines >= 1 && state.runStats.chests >= 1) {
    meta.unlocks.vesper = true;
    unlocked.push("Vesper");
  }
  if (!meta.unlocks.mine && state.runStats.chests >= 2) {
    meta.unlocks.mine = true;
    unlocked.push("Rift Mines");
  }
  if (!meta.unlocks.orrin && state.runStats.chests >= 3) {
    meta.unlocks.orrin = true;
    unlocked.push("Orrin");
  }
  if (!meta.unlocks.bossBane && state.runStats.score >= 2500) {
    meta.unlocks.bossBane = true;
    unlocked.push("Gatebreaker Ink");
  }
  if (!meta.unlocks.talia && state.runStats.score >= 5000) {
    meta.unlocks.talia = true;
    unlocked.push("Talia");
  }
  if (!meta.unlocks.prism && state.runStats.kills >= 300) {
    meta.unlocks.prism = true;
    unlocked.push("Prism Fan");
  }
  if (!meta.unlocks.evasion && state.runStats.elites >= 5) {
    meta.unlocks.evasion = true;
    unlocked.push("Smoke Frame");
  }
  if (!meta.unlocks.greed && state.player.coins >= 60) {
    meta.unlocks.greed = true;
    unlocked.push("Chip Engine");
  }
  if (unlocked.length) {
    state.runStats.unlocks.push(...unlocked);
    saveMeta();
    syncMenuLocks();
    showToast(`Unlocked: ${unlocked.join(", ")}`);
  }
}

function endRun(victory) {
  if (state.mode === "over") return;
  releaseGamePointerLock();
  state.mode = "over";
  const meta = state.meta;
  meta.runs += 1;
  meta.totalKills += state.runStats.kills;
  meta.bestKills = Math.max(meta.bestKills, state.runStats.kills);
  meta.bestTime = Math.max(meta.bestTime, Math.floor(state.runStats.time));
  meta.bestScore = Math.max(meta.bestScore, state.runStats.score);
  if (victory) meta.wins += 1;
  saveMeta();
  updateMenuMeta();

  dom.resultTitle.textContent = victory ? "Riftwarden Broken" : "Run Over";
  dom.resultStats.innerHTML = [
    `Time: ${formatTime(state.runStats.time)}`,
    `Level: ${state.player.level}`,
    `Kills: ${state.runStats.kills}`,
    `Score: ${state.runStats.score}`,
    `Best Score: ${meta.bestScore}`,
    state.runStats.finalSwarm ? `Final Swarm: ${formatTime(state.runStats.finalSwarmTime)}` : "Final Swarm: not reached",
    `Caches/Shrines/Shops: ${state.runStats.chests}/${state.runStats.shrines}/${state.runStats.shops}`,
    state.runStats.unlocks.length ? `Unlocked: ${state.runStats.unlocks.join(", ")}` : "Unlocked: none this run",
  ].join("<br>");
  dom.result.classList.remove("hidden");
  dom.hud.classList.add("hidden");
}

function togglePause(paused) {
  if (paused) {
    state.mode = "paused";
    releaseGamePointerLock();
    dom.pause.classList.remove("hidden");
  } else {
    state.mode = "playing";
    dom.pause.classList.add("hidden");
    requestGamePointerLock();
  }
}

function returnToMenu() {
  releaseGamePointerLock();
  clearWorld();
  state.mode = "menu";
  state.player = null;
  state.playerObj = null;
  state.enemies = [];
  state.enemyBullets = [];
  state.projectiles = [];
  state.drops = [];
  state.chests = [];
  state.shrines = [];
  state.shops = [];
  state.effects = [];
  state.orbiters = [];
  state.gate = null;
  state.currentChoices = [];
  state.weaponTimers = {};
  state.runStats = null;
  state.lastObjective = "";
  dom.hud.classList.add("hidden");
  dom.pause.classList.add("hidden");
  dom.chooser.classList.add("hidden");
  dom.result.classList.add("hidden");
  dom.menu.classList.remove("hidden");
  syncMenuLocks();
  updateMenuMeta();
  render();
}

function requestGamePointerLock() {
  if (state.mode !== "playing" || document.pointerLockElement === canvas || !canvas.requestPointerLock) return;
  try {
    const request = canvas.requestPointerLock();
    request?.catch?.(() => {});
  } catch {
    // Pointer lock is best-effort because browsers require a trusted user gesture.
  }
}

function releaseGamePointerLock() {
  pointer.rotating = false;
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock?.();
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen?.();
  }
}

function updateHud(force = false) {
  if (!state.player) return;
  const player = state.player;
  const hpRatio = THREE.MathUtils.clamp(player.hp / player.maxHp, 0, 1);
  const xpRatio = THREE.MathUtils.clamp(player.xp / player.xpNeeded, 0, 1);
  dom.hpBar.style.width = `${hpRatio * 100}%`;
  dom.xpBar.style.width = `${xpRatio * 100}%`;
  dom.hpText.textContent = `${Math.ceil(Math.max(0, player.hp))}/${Math.ceil(player.maxHp)}`;
  dom.xpText.textContent = `Lv ${player.level}`;
  dom.clock.textContent = runClockText();
  dom.coins.textContent = `${player.coins} chips`;

  const objective = currentObjective();
  if (force || objective !== state.lastObjective) {
    state.lastObjective = objective;
    dom.objective.textContent = objective;
  }

  if (force || Math.floor(state.runStats.time * 4) % 4 === 0) {
    const entries = Object.entries(player.upgrades)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, level]) => `<div class="build-chip">${upgradeById[id]?.name || id} ${roman(level)}</div>`);
    dom.buildList.innerHTML = entries.slice(0, 12).join("");
  }
}

function currentObjective() {
  if (state.mode === "menu") return "Choose a runner";
  if (state.runStats?.bossDefeated) return "Rift clear";
  if (state.runStats?.bossSpawned) {
    const boss = state.enemies.find((enemy) => enemy.boss);
    if (boss) {
      const label = `Defeat Riftwarden ${Math.ceil((boss.hp / boss.maxHp) * 100)}%`;
      return state.runStats.finalSwarm ? `${label} - Final swarm` : label;
    }
    return "Defeat Riftwarden";
  }
  if (state.runStats?.finalSwarm) {
    return `Final swarm +${formatTime(state.runStats.finalSwarmTime)} - reach gate`;
  }
  const chest = state.chests.find((candidate) => !candidate.opened && distance2d(candidate, state.player) < candidate.radius + 0.8);
  if (chest) {
    return state.player.coins >= chest.cost ? `Press E to open cache (${chest.cost})` : `Need ${chest.cost} chips for cache`;
  }
  const shrine = state.shrines.find(
    (candidate) => !candidate.charged && distance2d(candidate, state.player) < candidate.radius + 0.6,
  );
  if (shrine) return `Charging shrine ${Math.floor(shrine.charge * 100)}%`;
  const shop = state.shops.find((candidate) => !candidate.bought && distance2d(candidate, state.player) < candidate.radius + 0.8);
  if (shop) return state.player.coins >= shop.cost ? "Press E to buy reward" : `Need ${shop.cost} chips`;
  if (state.gate && state.player) {
    const dist = Math.ceil(distance2d(state.gate, state.player));
    return dist < 8 ? "Press E at the rift gate" : `Find rift gate ${dist}m`;
  }
  return "Survive";
}

function runClockText() {
  if (!state.runStats) return "00:00";
  if (state.runStats.finalSwarm) return `F+${formatTime(state.runStats.finalSwarmTime)}`;
  return formatTime(Math.max(0, RUN_TIME_LIMIT_SECONDS - state.runStats.time));
}

function render() {
  if (state.player) {
    const player = state.player;
    const target = tmpVec.set(player.x, player.y + 1.2, player.z);
    cameraRig.yaw = lerpAngle(cameraRig.yaw, cameraRig.targetYaw, 0.12);
    cameraRig.pitch = THREE.MathUtils.lerp(cameraRig.pitch, cameraRig.targetPitch, 0.12);
    cameraRig.distance = THREE.MathUtils.lerp(cameraRig.distance, cameraRig.targetDistance, 0.12);
    const horizontal = Math.cos(cameraRig.pitch) * cameraRig.distance;
    const desired = tmpVec2.set(
      player.x + Math.sin(cameraRig.yaw) * horizontal,
      player.y + Math.sin(cameraRig.pitch) * cameraRig.distance,
      player.z + Math.cos(cameraRig.yaw) * horizontal,
    );
    camera.position.lerp(desired, 0.08);
    camera.lookAt(target);
  } else {
    camera.position.set(-32, 44, 58);
    camera.lookAt(0, 0, 0);
  }
  renderer.render(scene, camera);
}

function resize() {
  const width = window.innerWidth || 1280;
  const height = window.innerHeight || 720;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function nearestEnemy(range = Infinity) {
  let best = null;
  let bestDistance = range;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const distance = distance2d(state.player, enemy);
    if (distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

function nearestEnemyTo(origin, range, ignored = new Set()) {
  let best = null;
  let bestDistance = range;
  for (const enemy of state.enemies) {
    if (enemy.dead || ignored.has(enemy)) continue;
    const distance = distance2d(origin, enemy);
    if (distance < bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

function hasSynergy(a, b) {
  return (state.player.upgrades[a] || 0) > 0 && (state.player.upgrades[b] || 0) > 0;
}

function spawnPointAroundPlayer() {
  const player = state.player;
  const angle = state.rng() * Math.PI * 2;
  const radius = 46 + state.rng() * 28;
  let x = player.x + Math.cos(angle) * radius;
  let z = player.z + Math.sin(angle) * radius;
  const dist = Math.hypot(x, z);
  if (dist > ARENA_RADIUS - 4) {
    x = (x / dist) * (ARENA_RADIUS - 4);
    z = (z / dist) * (ARENA_RADIUS - 4);
  }
  return { x, z };
}

function randomArenaPoint(minRadius = 0, maxRadius = ARENA_RADIUS - 8) {
  for (let i = 0; i < 80; i += 1) {
    const clusterTurn = Math.floor(state.rng() * 7);
    const angle = clusterTurn * 0.9 + (state.rng() - 0.5) * (state.rng() < 0.45 ? 0.9 : Math.PI * 2);
    const radiusRoll = state.rng();
    const radiusShape = state.rng() < 0.55 ? radiusRoll ** 0.46 : radiusRoll ** 1.9;
    const radius = minRadius + radiusShape * (maxRadius - minRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.hypot(x, z) < ARENA_RADIUS - 5) return { x, z };
  }
  return { x: minRadius, z: 0 };
}

function createBeam(from, to, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(from.x, (from.y || groundHeight(from.x, from.z)) + 1.4, from.z),
    new THREE.Vector3(to.x, (to.y || groundHeight(to.x, to.z)) + 1.4, to.z),
  ]);
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  const line = new THREE.Line(geometry, material);
  state.groups.effects.add(line);
  state.effects.push({ mesh: line, ttl: 0.14 });
}

function spawnBurst(x, y, z, color, count = 10, spread = 3) {
  for (let i = 0; i < count; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.16 + state.rng() * 0.18, 0),
      new THREE.MeshBasicMaterial({ color }),
    );
    const angle = state.rng() * Math.PI * 2;
    const speed = 2 + state.rng() * spread;
    const effect = {
      mesh,
      ttl: 0.5 + state.rng() * 0.45,
      vx: Math.cos(angle) * speed,
      vy: 1.5 + state.rng() * 5,
      vz: Math.sin(angle) * speed,
    };
    mesh.position.set(x, y, z);
    state.groups.effects.add(mesh);
    state.effects.push(effect);
  }
}

function updateEffects(dt) {
  for (let i = state.effects.length - 1; i >= 0; i -= 1) {
    const effect = state.effects[i];
    effect.ttl -= dt;
    if (effect.vx !== undefined) {
      effect.vy -= 9 * dt;
      effect.mesh.position.x += effect.vx * dt;
      effect.mesh.position.y += effect.vy * dt;
      effect.mesh.position.z += effect.vz * dt;
      effect.mesh.rotation.x += dt * 8;
      effect.mesh.rotation.y += dt * 6;
    }
    if (effect.ttl <= 0) {
      state.groups.effects.remove(effect.mesh);
      effect.mesh.geometry?.dispose?.();
      effect.mesh.material?.dispose?.();
      state.effects.splice(i, 1);
    }
  }
}

function groundHeight(x, z) {
  const seed = state.terrainSeed || 1;
  const broadNoise = smoothNoise2d(x, z, 0.026, 13) * 2 - 1;
  const brokenNoise = smoothNoise2d(x, z, 0.085, 29) * 2 - 1;
  const faultA = Math.sin(x * 0.062 + z * 0.019 + seed * 0.37);
  const faultB = Math.sin(x * -0.028 + z * 0.074 + seed * 0.19);
  const shelf = Math.sign(faultA) * 0.55 + Math.sign(faultB) * 0.38;
  const pocket = Math.max(0, smoothNoise2d(x + 140, z - 80, 0.055, 47) - 0.62) * 4.2;
  const ridge =
    Math.sin((x + seed * 0.11) * 0.047) * 1.8 +
    Math.cos((z - seed * 0.07) * 0.052) * 1.45 +
    Math.sin((x + z + seed) * 0.027) * 1.1 +
    broadNoise * 2.15 +
    brokenNoise * 0.85 +
    shelf -
    pocket;
  const terrace = Math.round(ridge * 0.72) / 0.72;
  const edge = THREE.MathUtils.smoothstep(Math.hypot(x, z), ARENA_RADIUS - 16, ARENA_RADIUS + 8);
  return terrace * (1 - edge) - edge * 4;
}

function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function approach(value, target, step) {
  if (value < target) return Math.min(value + step, target);
  return Math.max(value - step, target);
}

function lerpAngle(from, to, amount) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * amount;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function roman(value) {
  const numerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return numerals[Math.min(value, numerals.length - 1)] || String(value);
}

function typeLabel(type) {
  if (type === "weapon") return "Weapon";
  if (type === "codex") return "Tome";
  return "Item";
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  toastTimer = 2.5;
}

function syncMenuLocks() {
  const meta = state.meta;
  dom.slots.forEach((slot) => {
    const id = slot.dataset.character;
    const unlocked = id === "lume" || meta.unlocks[id];
    slot.classList.toggle("locked", !unlocked);
    if (id === selectedCharacter && !unlocked) selectedCharacter = "lume";
    slot.classList.toggle("active", id === selectedCharacter);
    let badge = slot.querySelector(".slot-badge");
    if (!badge) {
      badge = document.createElement("small");
      badge.className = "slot-badge";
      slot.append(badge);
    }
    badge.textContent = unlocked ? (id === selectedCharacter ? "Selected" : "Ready") : "Locked";
  });
  if (dom.selectedSummary) {
    const def = characters[selectedCharacter] || characters.lume;
    const weapon = upgradeById[def.startWeapon]?.name || def.startWeapon;
    dom.selectedSummary.textContent = `${def.name} selected - starts with ${weapon}`;
  }
  updateMenuMeta();
}

function updateMenuMeta() {
  const meta = state.meta;
  if (dom.menuStats) {
    dom.menuStats.textContent = `Runs ${meta.runs} - Wins ${meta.wins} - Best ${formatTime(meta.bestTime)} - Best Kills ${meta.bestKills} - Best Score ${meta.bestScore}`;
  }
  if (!dom.unlockList) return;
  const rows = [
    {
      name: "Nix",
      done: meta.unlocks.nix,
      detail: `${Math.min(meta.bestKills, 180)}/180 kills in one run`,
    },
    {
      name: "Vesper",
      done: meta.unlocks.vesper,
      detail: "charge a shrine and open a cache",
    },
    {
      name: "Orrin",
      done: meta.unlocks.orrin,
      detail: "open 3 caches in one run",
    },
    {
      name: "Talia",
      done: meta.unlocks.talia,
      detail: "score 5000 in one run",
    },
    {
      name: "Rift Mines",
      done: meta.unlocks.mine,
      detail: "open 2 caches in one run",
    },
    {
      name: "Prism Fan",
      done: meta.unlocks.prism,
      detail: `${Math.min(meta.bestKills, 300)}/300 kills in one run`,
    },
    {
      name: "Static Lasso",
      done: meta.unlocks.chain,
      detail: "activate the rift gate",
    },
    {
      name: "Smoke Frame",
      done: meta.unlocks.evasion,
      detail: "break 5 elites in one run",
    },
    {
      name: "Chip Engine",
      done: meta.unlocks.greed,
      detail: "hold 60 chips in one run",
    },
    {
      name: "Gatebreaker Ink",
      done: meta.unlocks.bossBane,
      detail: `${Math.min(meta.bestScore, 2500)}/2500 best score`,
    },
  ];
  dom.unlockList.innerHTML = `<div class="unlock-list">${rows
    .map(
      (row) =>
        `<div class="unlock-row ${row.done ? "done" : "locked"}"><span class="unlock-state"></span><span><b>${row.name}</b> - ${row.done ? "unlocked" : row.detail}</span></div>`,
    )
    .join("")}</div>`;
}

function loadMeta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_KEY) || "{}");
    return {
      lastCharacter: characters[parsed.lastCharacter] ? parsed.lastCharacter : "lume",
      runs: parsed.runs || 0,
      wins: parsed.wins || 0,
      totalKills: parsed.totalKills || 0,
      bestKills: parsed.bestKills || 0,
      bestTime: parsed.bestTime || 0,
      bestScore: parsed.bestScore || 0,
      unlocks: {
        nix: Boolean(parsed.unlocks?.nix),
        vesper: Boolean(parsed.unlocks?.vesper),
        orrin: Boolean(parsed.unlocks?.orrin),
        talia: Boolean(parsed.unlocks?.talia),
        mine: Boolean(parsed.unlocks?.mine),
        chain: Boolean(parsed.unlocks?.chain),
        prism: Boolean(parsed.unlocks?.prism),
        evasion: Boolean(parsed.unlocks?.evasion),
        greed: Boolean(parsed.unlocks?.greed),
        bossBane: Boolean(parsed.unlocks?.bossBane),
      },
    };
  } catch {
    return {
      lastCharacter: "lume",
      runs: 0,
      wins: 0,
      totalKills: 0,
      bestKills: 0,
      bestTime: 0,
      bestScore: 0,
      unlocks: {
        nix: false,
        vesper: false,
        orrin: false,
        talia: false,
        mine: false,
        chain: false,
        prism: false,
        evasion: false,
        greed: false,
        bossBane: false,
      },
    };
  }
}

function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(state.meta));
}

function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashNoise2d(x, z, offset = 0) {
  const seed = state.terrainSeed || 1;
  const value = Math.sin(x * 127.1 + z * 311.7 + (seed + offset) * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function smoothNoise2d(x, z, scale, offset = 0) {
  const sx = x * scale;
  const sz = z * scale;
  const x0 = Math.floor(sx);
  const z0 = Math.floor(sz);
  const tx = sx - x0;
  const tz = sz - z0;
  const ux = tx * tx * (3 - 2 * tx);
  const uz = tz * tz * (3 - 2 * tz);
  const a = hashNoise2d(x0, z0, offset);
  const b = hashNoise2d(x0 + 1, z0, offset);
  const c = hashNoise2d(x0, z0 + 1, offset);
  const d = hashNoise2d(x0 + 1, z0 + 1, offset);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, ux), THREE.MathUtils.lerp(c, d, ux), uz);
}

function renderGameToText() {
  const player = state.player;
  const boss = state.enemies.find((enemy) => enemy.boss);
  const payload = {
    mode: state.mode,
    coordinateSystem: "Three.js world: x/z are horizontal arena axes, y is height, origin is arena center.",
    time: state.runStats ? Number(state.runStats.time.toFixed(1)) : 0,
    timeLimit: RUN_TIME_LIMIT_SECONDS,
    timeRemaining: state.runStats
      ? Number(Math.max(0, RUN_TIME_LIMIT_SECONDS - state.runStats.time).toFixed(1))
      : RUN_TIME_LIMIT_SECONDS,
    finalSwarm: state.runStats
      ? {
          active: state.runStats.finalSwarm,
          time: Number(state.runStats.finalSwarmTime.toFixed(1)),
        }
      : { active: false, time: 0 },
    objective: currentObjective(),
    selectedCharacter,
    player: player
      ? {
          x: Number(player.x.toFixed(1)),
          y: Number(player.y.toFixed(1)),
          z: Number(player.z.toFixed(1)),
          hp: Math.ceil(player.hp),
          maxHp: Math.ceil(player.maxHp),
          level: player.level,
          xp: Math.floor(player.xp),
          xpNeeded: player.xpNeeded,
          coins: player.coins,
          weapons: player.weapons,
          shield: player.shieldCharges,
          crouching: player.crouching,
          sliding: player.sliding,
          shrineSpeed: Number(player.shrineSpeed.toFixed(2)),
        }
      : null,
    cursorLocked: document.pointerLockElement === canvas,
    camera: {
      yaw: Number(cameraRig.targetYaw.toFixed(2)),
      pitch: Number(cameraRig.targetPitch.toFixed(2)),
      distance: Number(cameraRig.targetDistance.toFixed(1)),
    },
    counts: {
      enemies: state.enemies.length,
      projectiles: state.projectiles.length + state.enemyBullets.length + state.orbiters.length,
      drops: state.drops.length,
      kills: state.runStats?.kills || 0,
    },
    enemies: state.enemies.slice(0, 12).map((enemy) => ({
      type: enemy.type,
      x: Number(enemy.x.toFixed(1)),
      z: Number(enemy.z.toFixed(1)),
      hp: Math.ceil(enemy.hp),
      boss: enemy.boss,
      elite: enemy.elite,
    })),
    boss: boss
      ? {
          x: Number(boss.x.toFixed(1)),
          z: Number(boss.z.toFixed(1)),
          hp: Math.ceil(boss.hp),
          maxHp: Math.ceil(boss.maxHp),
        }
      : null,
    gate:
      state.gate && player
        ? {
            x: Number(state.gate.x.toFixed(1)),
            z: Number(state.gate.z.toFixed(1)),
            active: state.gate.active,
            distance: Number(distance2d(state.gate, player).toFixed(1)),
          }
        : null,
    nearby: player
      ? {
          unopenedChests: state.chests.filter((chest) => !chest.opened && distance2d(chest, player) < 18).length,
          chestCost:
            state.chests.find((chest) => !chest.opened && distance2d(chest, player) < chest.radius + 0.8)?.cost ?? null,
          shrines: state.shrines
            .filter((shrine) => !shrine.charged && distance2d(shrine, player) < 18)
            .map((shrine) => ({
              charge: Number(shrine.charge.toFixed(2)),
              secondsRemaining: Number(((1 - shrine.charge) * SHRINE_CHARGE_SECONDS / player.shrineSpeed).toFixed(1)),
            })),
          shops: state.shops.filter((shop) => !shop.bought && distance2d(shop, player) < 18).length,
        }
      : null,
    choices: state.currentChoices.map((choice) => ({
      id: choice.id,
      name: choice.name,
      rarity: choice.rarity,
    })),
    meta: state.meta,
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    if (state.mode === "playing") update(1 / 60);
  }
  render();
  return renderGameToText();
};

window.__riftbound = {
  startRun,
  chooseUpgrade,
  debug: {
    grantXp(amount) {
      if (state.mode === "playing") addXp(amount);
    },
    grantCoins(amount) {
      if (state.player) state.player.coins += amount;
    },
    groundHeight(x, z) {
      return groundHeight(x, z);
    },
    setRunTime(seconds) {
      if (state.runStats) state.runStats.time = seconds;
    },
    teleportTo(kind) {
      if (!state.player) return false;
      const target =
        kind === "chest"
          ? state.chests.find((candidate) => !candidate.opened)
          : kind === "shrine"
            ? state.shrines.find((candidate) => !candidate.charged)
            : kind === "shop"
              ? state.shops.find((candidate) => !candidate.bought)
              : kind === "gate"
                ? state.gate
                : null;
      if (!target) return false;
      state.player.x = target.x;
      state.player.z = target.z;
      state.player.y = target.y;
      state.player.vx = 0;
      state.player.vz = 0;
      syncPlayerObject();
      return true;
    },
  },
  get state() {
    return state;
  },
};
