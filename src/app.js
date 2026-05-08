const homeScreen = document.querySelector("#screen-home");
const rulesScreen = document.querySelector("#screen-rules");
const gameScreen = document.querySelector("#screen-game");
const resultScreen = document.querySelector("#screen-result");
const startButton = document.querySelector("#start-button");
const rulesFromHomeButton = document.querySelector("#rules-from-home-button");
const beginLevelButton = document.querySelector("#begin-level-button");
const backHomeButton = document.querySelector("#back-home-button");
const statusBar = document.querySelector(".status-bar");
const gameStage = document.querySelector("#game-stage");
const mapArea = document.querySelector(".map-area");
const player = document.querySelector(".player");
const taskLayer = document.querySelector("#task-layer");
const handList = document.querySelector("#hand-list");
const loadSummary = document.querySelector("#load-summary");
const loadWarning = document.querySelector("#load-warning");
const gameMessage = document.querySelector("#game-message");
const tutorialBox = document.querySelector(".tutorial-box");
const helpButton = document.querySelector("#help-button");
const debugToggle = document.querySelector("#debug-toggle");
const debugPanel = document.querySelector("#debug-panel");
const restZone = document.querySelector("#rest-zone");
const restFill = document.querySelector("#rest-progress-fill");
const mobileControls = document.querySelector("#mobile-controls");
const orientationOverlay = document.querySelector("#orientation-overlay");

const meters = {
  life: { value: document.querySelector("#worker-life-value"), meter: document.querySelector("#worker-life-meter"), card: document.querySelector(".status-life") },
  case: { value: document.querySelector("#case-pressure-value"), meter: document.querySelector("#case-pressure-meter"), card: document.querySelector(".status-case-pressure") },
  doc: { value: document.querySelector("#doc-pressure-value"), meter: document.querySelector("#doc-pressure-meter"), card: document.querySelector(".status-doc-pressure") },
  network: { value: document.querySelector("#network-pressure-value"), meter: document.querySelector("#network-pressure-meter"), card: document.querySelector(".status-network-pressure") },
};

const zones = {
  desk: document.querySelector("#desk-zone"),
  service: document.querySelector("#service-zone"),
  crisis: document.querySelector("#crisis-zone"),
  meeting: document.querySelector("#meeting-zone"),
};
const zoneLayoutElements = { ...zones, rest: restZone };

const LEVELS = [
  {
    id: 1,
    label: "第一關",
    name: "第一關：先撐住今天",
    passTitle: "第一關通過",
    passText: "你完成了 15 件任務，暫時穩住了今天。",
    duration: 60,
    kpiTarget: 15,
    spawnSpeedMultiplier: 1,
    enabledTaskTypes: ["doc", "case", "crisis"],
    enabledZones: ["desk", "service", "crisis"],
    networkPressureActive: false,
    weights: {
      early: { doc: 40, case: 40, crisis: 20 },
      mid: { doc: 36, case: 28, crisis: 36 },
      late: { doc: 42, case: 20, crisis: 38 },
    },
  },
  {
    id: 2,
    label: "第二關",
    name: "第二關：事情開始追上來",
    passTitle: "第二關通過",
    passText: "事情追得更急，但你仍守住了這一輪。",
    duration: 60,
    kpiTarget: 18,
    spawnSpeedMultiplier: 1.15,
    enabledTaskTypes: ["doc", "case", "crisis", "network"],
    enabledZones: ["desk", "service", "crisis", "meeting"],
    networkPressureActive: true,
    weights: {
      early: { doc: 36, case: 22, network: 28, crisis: 14 },
      mid: { doc: 34, case: 16, network: 27, crisis: 23 },
      late: { doc: 38, case: 10, network: 26, crisis: 26 },
    },
  },
  {
    id: 3,
    label: "第三關",
    name: "第三關：體制追上來了",
    passTitle: "第三關通過",
    passText: "你在體制壓力下，仍撐過了今天。",
    duration: 60,
    kpiTarget: 20,
    spawnSpeedMultiplier: 1.28,
    enabledTaskTypes: ["doc", "case", "crisis", "network"],
    enabledZones: ["desk", "service", "crisis", "meeting"],
    networkPressureActive: true,
    hasSystemMonster: true,
    weights: {
      early: { doc: 34, case: 20, network: 28, crisis: 18 },
      mid: { doc: 36, case: 14, network: 28, crisis: 22 },
      late: { doc: 38, case: 10, network: 26, crisis: 26 },
    },
  },
];

const LEVEL_CLEAR_CONFIG = {
  1: {
    title: "第一關通過",
    image: "assets/images/level_1_clear_mission_accomplished.png",
    fallbackImage: "assets/images/level1-clear.png",
    alt: "第一關通關慶祝圖",
    message: "你暫時撐住了第一波任務壓力。",
    primaryLabel: "進入第二關",
    nextLevelId: 2,
    final: false,
  },
  2: {
    title: "第二關通過",
    image: "assets/images/level_2_achievement_celebration_scene.png",
    fallbackImage: "assets/images/level2-clear.png",
    alt: "第二關通關慶祝圖",
    message: "事情開始追上來，但你仍然守住了節奏。",
    primaryLabel: "進入第三關",
    nextLevelId: 3,
    final: false,
  },
  3: {
    title: "第三關通過",
    image: "assets/images/level_cleared_celebration_in_the_office.png",
    fallbackImage: "assets/images/level3-clear.png",
    alt: "第三關通關慶祝圖",
    message: "你撐過今天的任務壓力，功德無量！",
    primaryLabel: "重新開始",
    final: true,
  },
};

const bgm = new Audio("assets/audio/bgm.mp3");
bgm.loop = true;
bgm.volume = 0.35;
bgm.preload = "auto";
let bgmStarted = false;

function startBgm() {
  if (bgmStarted) return;
  bgm.play()
    .then(() => {
      bgmStarted = true;
    })
    .catch(() => {
      console.warn("BGM failed to play or load");
    });
}

const TASK_TYPES = {
  doc: { emojis: ["🧾", "📝", "✉️"], titles: ["核銷", "紀錄", "信件"], color: "yellow", target: "desk", weight: 1, deadline: 13, complete: { doc: -18, life: -2 }, expire: { doc: 24 } },
  case: { emojis: ["🏠", "🧑", "📦"], titles: ["家訪", "服務", "福利"], color: "blue", target: "service", weight: 2, deadline: 13, complete: { case: -14, network: -2, life: -2 }, expire: { case: 20 } },
  crisis: { emojis: ["🚨", "⚠️", "🆘"], titles: ["危機", "暴力", "自殺自傷"], color: "red", target: "crisis", weight: 4, deadline: 8.5, complete: { case: -22, life: -8 }, expire: { case: 34, life: -5, crisisMiss: 1 } },
  network: { emojis: ["🤝", "🔁", "👥"], titles: ["協調", "轉介", "網絡會議"], color: "purple", target: "meeting", weight: 2, deadline: 12, complete: { network: -18, doc: 5, life: -2 }, expire: { network: 24, doc: 7 } },
};

const BASE_PHASES = {
  early: { interval: 2.4 },
  mid: { interval: 1.8 },
  late: { interval: 1.2 },
};

const spawnPoints = [
  { id: "a", x: 282, y: 70 }, { id: "b", x: 480, y: 70 }, { id: "c", x: 60, y: 250 },
  { id: "d", x: 260, y: 245 }, { id: "e", x: 455, y: 245 }, { id: "f", x: 650, y: 245 },
  { id: "g", x: 250, y: 410 }, { id: "h", x: 445, y: 410 }, { id: "i", x: 645, y: 410 },
  { id: "j", x: 380, y: 155 }, { id: "k", x: 560, y: 155 },
];

const MAX_HAND = 3;
const MAX_MAP_TASKS = 8;
const CARD_W = 142;
const CARD_H = 104;
const BASE_SPEED = 7.2;
const BASE_REST_REGEN = 18;
const STAGE_W = 1280;
const STAGE_H = 720;
const POWERUP_TIMES = [40, 20];
const SYSTEM_MONSTER_DAMAGE = 25;
const SYSTEM_MONSTER_COOLDOWN = 1.5;
const SYSTEM_MONSTER_IMAGE = "assets/images/system-monster.png";
const SYSTEM_MONSTER_SIZE = 156;
const SYSTEM_MONSTER_SPEED = 144;
const SYSTEM_MONSTER_COLLISION_PAD = -12;
const LEVEL_ZONE_LAYOUTS = {
  1: {
    source: "fixed-level-1",
    desk: { x: 0.22, y: 0.24, w: 220, h: 128 },
    service: { x: 0.78, y: 0.24, w: 220, h: 128 },
    rest: { x: 0.5, y: 0.52, w: 210, h: 120 },
    crisis: { x: 0.5, y: 0.82, w: 220, h: 128 },
  },
  2: {
    source: "fixed-level-2",
    desk: { x: 0.15, y: 0.24, w: 220, h: 134 },
    service: { x: 0.85, y: 0.24, w: 220, h: 134 },
    crisis: { x: 0.15, y: 0.78, w: 220, h: 134 },
    meeting: { x: 0.85, y: 0.78, w: 220, h: 134 },
    rest: { x: 0.5, y: 0.82, w: 190, h: 122 },
  },
  3: {
    source: "fixed-level-3",
    desk: { x: 0.15, y: 0.24, w: 220, h: 134 },
    service: { x: 0.85, y: 0.24, w: 220, h: 134 },
    crisis: { x: 0.15, y: 0.78, w: 220, h: 134 },
    meeting: { x: 0.85, y: 0.78, w: 220, h: 134 },
    rest: { x: 0.5, y: 0.82, w: 190, h: 122 },
  },
};

const playerState = { x: 450, y: 350 };
const directTouchDrag = { active: false, pointerId: null };
const keys = new Set();
const moveKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]);
const lockKeys = new Set(["Tab", "q", "Q"]);

let lastFrame = 0;
let toastTimer = null;
let wrongHintAt = 0;
let currentLevelIndex = 0;
let rules = createRules();
let systemMonsterEl = null;
const state = {};

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

function isTouchLayout() {
  return isTouchDevice();
}

function logicalMapSize() {
  const rect = mapArea.getBoundingClientRect();
  return {
    width: mapArea.clientWidth || rect.width,
    height: mapArea.clientHeight || rect.height,
    rect,
  };
}

function elementBoxInMap(element) {
  const map = logicalMapSize();
  const rect = element.getBoundingClientRect();
  const scaleX = map.rect.width ? map.width / map.rect.width : 1;
  const scaleY = map.rect.height ? map.height / map.rect.height : 1;
  return {
    left: (rect.left - map.rect.left) * scaleX,
    right: (rect.right - map.rect.left) * scaleX,
    top: (rect.top - map.rect.top) * scaleY,
    bottom: (rect.bottom - map.rect.top) * scaleY,
  };
}

function updateStageScale() {
  const touch = isTouchLayout();
  const landscape = window.innerWidth > window.innerHeight;
  document.body.classList.toggle("is-touch-layout", touch);
  document.body.classList.toggle("is-touch-portrait", touch && !landscape);
  if (orientationOverlay) orientationOverlay.hidden = !(touch && !landscape);

  if (touch && landscape) {
    const safeX = 16;
    const safeY = 12;
    const scale = Math.min((window.innerWidth - safeX) / STAGE_W, (window.innerHeight - safeY) / STAGE_H);
    gameStage.style.setProperty("--stage-scale", clamp(scale, 0.1, 1));
  } else {
    gameStage.style.removeProperty("--stage-scale");
  }
  applyZoneLayoutForCurrentLevel();
  updatePlayer();
}

function createRules() {
  return {
    initialLife: 100,
    maxLife: 100,
    speedMultiplier: 1,
    lifeDrainMultiplier: 1,
    restRegen: BASE_REST_REGEN,
    docRateMultiplier: 1,
    caseRateMultiplier: 1,
    networkRateMultiplier: 1,
    maxLoad: 10,
    crisisWarnRatio: 0.28,
  };
}

function level() {
  return LEVELS[currentLevelIndex] || LEVELS[LEVELS.length - 1];
}

function resetState() {
  rules = createRules();
  Object.assign(state, {
    running: false,
    ended: false,
    timeLeft: level().duration,
    elapsed: 0,
    spawnTimer: 0,
    caseTimer: 0,
    docTimer: 0,
    networkTimer: 0,
    nextId: 1,
    locked: 0,
    completed: 0,
    expired: 0,
    crisisMissed: 0,
    lastWarningAt: -10,
    rest: { active: false, noticeAt: -10 },
    resultMode: "restart",
    failedLevelId: null,
    metrics: { life: rules.initialLife, case: 20, doc: 20, network: level().networkPressureActive ? 20 : 0 },
    tasks: [],
    hand: [],
    powerups: [],
    meritSpawned: {},
    systemMonster: {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      speed: SYSTEM_MONSTER_SPEED,
      size: SYSTEM_MONSTER_SIZE,
      turnAt: 0,
      hitCooldownUntil: -10,
    },
  });
  POWERUP_TIMES.forEach(time => { state.meritSpawned[time] = false; });
  playerState.x = 450;
  playerState.y = 350;
  keys.clear();
  restFill.style.width = "0%";
  restZone.classList.remove("resting");
  player.classList.remove("resting", "system-hit");
  if (systemMonsterEl) systemMonsterEl.hidden = true;
}

function setupUi() {
  if (!document.querySelector("#time-card")) {
    const card = document.createElement("article");
    card.id = "time-card";
    card.className = "status-card status-time";
    card.innerHTML = `<div class="status-heading"><span>⏱ 倒數</span><strong><span id="time-left-value">60</span>s</strong></div><div class="meter"><span id="time-meter" style="width:100%"></span></div>`;
    statusBar.append(card);
  }
  if (!document.querySelector("#result-overlay")) {
    const overlay = document.createElement("section");
    overlay.id = "result-overlay";
    overlay.className = "result-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `<article class="result-card">
      <section class="result-hero" id="result-hero"></section>
      <section class="result-section">
        <h2 id="result-title"></h2>
        <p id="result-ending" class="result-ending"></p>
        <div id="result-stats" class="result-stats"></div>
      </section>
      <div class="result-actions">
        <button id="restart-button" class="start-button" type="button">重新開始</button>
        <button id="result-home-button" class="secondary-button result-home-button" type="button" hidden>返回首頁</button>
      </div>
    </article>`;
    resultScreen.append(overlay);
    document.querySelector("#restart-button").addEventListener("click", handleResultButton);
    document.querySelector("#result-home-button").addEventListener("click", showHomeScreen);
  }
  if (!document.querySelector("#screen-flash")) {
    const flash = document.createElement("div");
    flash.id = "screen-flash";
    flash.className = "screen-flash";
    document.body.append(flash);
  }
  if (!document.querySelector("#system-monster")) {
    systemMonsterEl = document.createElement("div");
    systemMonsterEl.id = "system-monster";
    systemMonsterEl.className = "system-monster";
    systemMonsterEl.hidden = true;
    systemMonsterEl.innerHTML = `<span class="system-monster-icon">
        <img alt="" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" />
        <span hidden>⛓️</span>
      </span>
      <b>體制</b>`;
    mapArea.append(systemMonsterEl);
  } else {
    systemMonsterEl = document.querySelector("#system-monster");
  }
  debugPanel.hidden = true;
}

function setScreen(screen) {
  if (screen !== "game") stopTouchMove();
  document.body.classList.toggle("is-game-screen", screen === "game");
  homeScreen.hidden = screen !== "home";
  rulesScreen.hidden = screen !== "rules";
  gameScreen.hidden = screen !== "game";
  resultScreen.hidden = screen !== "result";
  requestAnimationFrame(updateStageScale);
}

function showHomeScreen() {
  state.running = false;
  keys.clear();
  document.querySelector("#result-overlay")?.setAttribute("hidden", "");
  setScreen("home");
}

function showRulesScreen() {
  state.running = false;
  keys.clear();
  document.querySelector("#result-overlay")?.setAttribute("hidden", "");
  setScreen("rules");
}

function showGameScreen() {
  setScreen("game");
}

function applyLevelVisibility() {
  const enabledZones = new Set(level().enabledZones || Object.keys(zones));
  document.body.classList.toggle("level-1", level().id === 1);
  document.body.classList.toggle("level-2", level().id === 2);
  document.body.classList.toggle("level-network-locked", !level().networkPressureActive);
  Object.entries(zones).forEach(([key, zone]) => {
    zone.hidden = !enabledZones.has(key);
    if (zone.hidden) zone.classList.remove("target");
  });
  applyZoneLayoutForCurrentLevel();
}

function applyZoneLayoutForCurrentLevel() {
  const layout = LEVEL_ZONE_LAYOUTS[level().id];
  Object.entries(zoneLayoutElements).forEach(([key, zone]) => {
    zone.style.removeProperty("left");
    zone.style.removeProperty("right");
    zone.style.removeProperty("top");
    zone.style.removeProperty("bottom");
    zone.style.removeProperty("transform");
    zone.style.removeProperty("width");
    zone.style.removeProperty("height");
    zone.style.removeProperty("min-height");
    if (!layout || !layout[key]) return;
    zone.style.left = `${layout[key].x * 100}%`;
    zone.style.top = `${layout[key].y * 100}%`;
    zone.style.width = `${layout[key].w}px`;
    zone.style.height = `${layout[key].h}px`;
    zone.style.minHeight = `${layout[key].h}px`;
    zone.style.transform = "translate(-50%, -50%)";
  });
  if (layout) validateZoneLayout(level().id);
  if (layout) {
    state.zoneLayoutDebug = {
      source: layout.source,
      crisis: layout.crisis ? `${Math.round(layout.crisis.x * 100)}%, ${Math.round(layout.crisis.y * 100)}% ${layout.crisis.w}x${layout.crisis.h}` : "hidden",
      rest: layout.rest ? `${Math.round(layout.rest.x * 100)}%, ${Math.round(layout.rest.y * 100)}% ${layout.rest.w}x${layout.rest.h}` : "hidden",
    };
  } else {
    state.zoneLayoutDebug = {
      source: `css-level-${level().id}`,
      crisis: "css",
      rest: "css",
    };
  }
}

function validateZoneLayout(levelId) {
  const layout = LEVEL_ZONE_LAYOUTS[levelId];
  if (!layout) return;
  const enabledZones = new Set(level().enabledZones || Object.keys(zones));
  const entries = Object.entries(layout).filter(([key]) => key !== "source" && (key === "rest" || enabledZones.has(key)));
  entries.forEach(([key, item]) => {
    if (![item.x, item.y, item.w, item.h].every(Number.isFinite)) {
      console.warn(`Invalid zone layout: ${key} missing x/y/w/h`);
    }
    if (item.w > 260 || item.h > 170 || item.w < 160 || item.h < 90) {
      console.warn(`Invalid zone layout: ${key} size too large or too small`);
    }
  });
  if (levelId === 1 && layout.meeting) console.warn("Invalid zone layout: first level should not include meeting zone");
  const map = logicalMapSize();
  const mapWidth = map.width || 1000;
  const mapHeight = map.height || 650;
  const boxes = entries.map(([key, item]) => ({
    key,
    left: item.x - item.w / 2 / mapWidth,
    right: item.x + item.w / 2 / mapWidth,
    top: item.y - item.h / 2 / mapHeight,
    bottom: item.y + item.h / 2 / mapHeight,
  }));
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (rectsOverlap(boxes[i], boxes[j])) {
        console.warn(`Invalid zone layout: ${boxes[i].key} overlaps ${boxes[j].key}`);
      }
    }
  }
}

function lockLevelMetrics() {
  if (!level().networkPressureActive) {
    state.metrics.network = 0;
    state.networkTimer = 0;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function currentLoad() {
  return state.hand.reduce((sum, task) => sum + task.weight, 0);
}

function phaseKey() {
  if (state.timeLeft > 44) return "early";
  if (state.timeLeft > 24) return "mid";
  return "late";
}

function phase() {
  const key = phaseKey();
  return {
    interval: BASE_PHASES[key].interval / level().spawnSpeedMultiplier,
    weights: enabledWeights(level().weights[key]),
  };
}

function enabledTaskTypes() {
  return level().enabledTaskTypes || Object.keys(TASK_TYPES);
}

function enabledWeights(weights) {
  const allowed = new Set(enabledTaskTypes());
  return Object.fromEntries(Object.entries(weights).filter(([type, weight]) => allowed.has(type) && weight > 0));
}

function moveSpeed() {
  let speed = BASE_SPEED * rules.speedMultiplier;
  if (state.hand.length >= 3) speed *= 0.64;
  else if (state.hand.length === 2) speed *= 0.76;
  else if (state.hand.length === 1) speed *= 0.88;
  return speed;
}

function pickWeighted(weights) {
  const entries = Object.entries(weights);
  if (entries.length === 0) return enabledTaskTypes()[0];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[0][0];
}

function rectsOverlap(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function restSpawnBlocker() {
  if (!restZone.hidden) {
    const box = elementBoxInMap(restZone);
    return {
      left: box.left - 24,
      right: box.right + 24,
      top: box.top - 24,
      bottom: box.bottom + 24,
    };
  }
  return { left: -1, right: -1, top: -1, bottom: -1 };
}

function safePoint(point, ignoreOccupancy = false) {
  const mapRect = logicalMapSize();
  if (mapRect.width && (point.x < 0 || point.y < 0 || point.x + CARD_W > mapRect.width || point.y + CARD_H > mapRect.height)) return false;
  const box = { left: point.x, right: point.x + CARD_W, top: point.y, bottom: point.y + CARD_H };
  const playerBox = { left: playerState.x - 28, right: playerState.x + 118, top: playerState.y - 28, bottom: playerState.y + 92 };
  if (rectsOverlap(box, playerBox)) return false;
  if (rectsOverlap(box, restSpawnBlocker())) return false;
  const blockers = Object.values(zones).filter(zone => !zone.hidden);
  const awayFromZones = blockers.every(zone => {
    return !rectsOverlap(box, elementBoxInMap(zone));
  });
  if (!awayFromZones) return false;
  if (ignoreOccupancy) return true;
  const occupied = [...state.tasks, ...state.powerups].some(item => item.spawn === point.id);
  return !occupied;
}

function availablePoint() {
  return spawnPoints.find(point => safePoint(point));
}

function fallbackPoint() {
  return spawnPoints.find(point => safePoint(point, true)) || { id: `fallback-${state.elapsed}`, x: 380, y: 250 };
}

function makeTask(type, spawn) {
  const cfg = TASK_TYPES[type];
  const titleIndex = Math.floor(Math.random() * cfg.titles.length);
  return {
    id: `task-${state.nextId++}`,
    kind: "task",
    type,
    emoji: cfg.emojis[titleIndex],
    title: cfg.titles[titleIndex],
    color: cfg.color,
    target: cfg.target,
    weight: cfg.weight,
    deadline: cfg.deadline,
    complete: { ...cfg.complete },
    expire: { ...cfg.expire },
    created: state.elapsed,
    spawn,
  };
}

function spawn(type) {
  if (!enabledTaskTypes().includes(type)) return false;
  if (state.tasks.length >= MAX_MAP_TASKS) return false;
  const point = availablePoint();
  if (!point) return false;
  state.tasks.push(makeTask(type, point.id));
  renderTasks();
  return true;
}

function maybeSpawnMerit() {
  POWERUP_TIMES.forEach(time => {
    if (!state.meritSpawned[time] && state.timeLeft <= time) {
      state.meritSpawned[time] = true;
      spawnMerit();
    }
  });
}

function spawnMerit() {
  const point = availablePoint() || fallbackPoint();
  state.powerups.push({
    id: `merit-${state.nextId++}`,
    kind: "merit",
    spawn: point.id,
    x: point.x,
    y: point.y,
  });
  renderTasks();
}

function updatePlayer() {
  const mapRect = logicalMapSize();
  const playerWidth = player.offsetWidth || player.getBoundingClientRect().width;
  const playerHeight = player.offsetHeight || player.getBoundingClientRect().height;
  playerState.x = clamp(playerState.x, 0, Math.max(0, mapRect.width - playerWidth));
  playerState.y = clamp(playerState.y, 0, Math.max(0, mapRect.height - playerHeight));
  player.style.left = `${playerState.x}px`;
  player.style.top = `${playerState.y}px`;
}

function chooseMonsterDirection() {
  const angle = Math.random() * Math.PI * 2;
  state.systemMonster.vx = Math.cos(angle);
  state.systemMonster.vy = Math.sin(angle);
  state.systemMonster.turnAt = state.elapsed + 2.1 + Math.random() * 2.2;
}

function setupSystemMonster() {
  if (!systemMonsterEl) return;
  if (!level().hasSystemMonster) {
    state.systemMonster.active = false;
    systemMonsterEl.hidden = true;
    return;
  }
  const map = logicalMapSize();
  const size = state.systemMonster.size;
  const img = systemMonsterEl.querySelector("img");
  const fallback = systemMonsterEl.querySelector(".system-monster-icon span");
  if (img && !img.getAttribute("src")) {
    img.hidden = false;
    if (fallback) fallback.hidden = true;
    img.src = SYSTEM_MONSTER_IMAGE;
  }
  state.systemMonster.active = true;
  state.systemMonster.size = SYSTEM_MONSTER_SIZE;
  state.systemMonster.speed = SYSTEM_MONSTER_SPEED;
  systemMonsterEl.style.setProperty("--system-monster-size", `${SYSTEM_MONSTER_SIZE}px`);
  state.systemMonster.x = clamp(map.width * 0.68, 0, Math.max(0, map.width - size));
  state.systemMonster.y = clamp(map.height * 0.42, 0, Math.max(0, map.height - size));
  state.systemMonster.hitCooldownUntil = -10;
  chooseMonsterDirection();
  systemMonsterEl.hidden = false;
  updateSystemMonsterElement();
}

function updateSystemMonsterElement() {
  if (!systemMonsterEl || !state.systemMonster.active) return;
  systemMonsterEl.style.left = `${state.systemMonster.x}px`;
  systemMonsterEl.style.top = `${state.systemMonster.y}px`;
}

function updateSystemMonster(dt) {
  if (!systemMonsterEl || !state.systemMonster.active || state.ended) return;
  const monster = state.systemMonster;
  const map = logicalMapSize();
  const maxX = Math.max(0, map.width - monster.size);
  const maxY = Math.max(0, map.height - monster.size);
  monster.x += monster.vx * monster.speed * dt;
  monster.y += monster.vy * monster.speed * dt;
  if (monster.x <= 0 || monster.x >= maxX) {
    monster.x = clamp(monster.x, 0, maxX);
    monster.vx *= -1;
  }
  if (monster.y <= 0 || monster.y >= maxY) {
    monster.y = clamp(monster.y, 0, maxY);
    monster.vy *= -1;
  }
  if (state.elapsed >= monster.turnAt) chooseMonsterDirection();
  updateSystemMonsterElement();
  checkSystemMonsterCollision();
}

function checkSystemMonsterCollision() {
  if (!systemMonsterEl || !state.systemMonster.active || systemMonsterEl.hidden) return;
  if (state.elapsed < state.systemMonster.hitCooldownUntil) return;
  if (!overlapElement(player, systemMonsterEl, SYSTEM_MONSTER_COLLISION_PAD)) return;
  state.systemMonster.hitCooldownUntil = state.elapsed + SYSTEM_MONSTER_COOLDOWN;
  state.metrics.life = clamp(state.metrics.life - SYSTEM_MONSTER_DAMAGE, 0, rules.maxLife);
  toast("被體制壓到，生命值 -25");
  flash();
  player.classList.add("system-hit");
  setTimeout(() => player.classList.remove("system-hit"), 520);
  updateHud();
  if (state.metrics.life <= 0) endGame("system");
}

function overlapElement(a, b, pad = 12) {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  return !(ar.right + pad < br.left || ar.left - pad > br.right || ar.bottom + pad < br.top || ar.top - pad > br.bottom);
}

function updateHud() {
  lockLevelMetrics();
  Object.entries(state.metrics).forEach(([key, value]) => {
    const max = key === "life" ? rules.maxLife : 100;
    const capped = clamp(value, 0, max);
    state.metrics[key] = capped;
    meters[key].value.textContent = Math.round(capped);
    meters[key].meter.style.width = `${clamp((capped / max) * 100, 0, 100)}%`;
    const danger = key === "life" ? capped < 30 : capped >= 75;
    meters[key].card.classList.toggle("danger", danger);
    meters[key].card.classList.toggle("critical", key !== "life" && capped >= 90);
  });
  const networkDanger = level().networkPressureActive && state.metrics.network >= 90;
  document.body.classList.toggle("danger-edge", state.metrics.life < 30 || state.metrics.case >= 90 || state.metrics.doc >= 90 || networkDanger);
  player.classList.toggle("tired", state.metrics.life < 30);
  document.querySelector("#time-left-value").textContent = Math.max(0, Math.ceil(state.timeLeft));
  document.querySelector("#time-meter").style.width = `${(state.timeLeft / level().duration) * 100}%`;
  document.querySelector(".goal-panel h2").textContent = level().label;
  document.querySelector("#goal-completed").textContent = `✅ 達成KPI ${state.completed} / ${level().kpiTarget}`;
  document.querySelector("#goal-pressure").textContent = level().hasSystemMonster ? "⛓️ 小心體制" : "🔥 壓力別爆表";
}

function updateHand() {
  loadSummary.textContent = `負荷 ${currentLoad()} / ${rules.maxLoad}`;
  if (state.hand.length === 0) {
    handList.className = "hand-list empty";
    handList.textContent = "目前手上沒有任務";
  } else {
    handList.className = "hand-list";
    handList.innerHTML = state.hand.map((task, index) => {
      const active = index === state.locked ? "active" : "";
      const ratio = clamp((task.deadline - (state.elapsed - task.created)) / task.deadline, 0, 1);
      return `<article class="hand-slot ${active} task-${task.color}">
        <b>${task.emoji} ${task.title}</b>
        <div class="mini-life"><i style="width:${ratio * 100}%"></i></div>
      </article>`;
    }).join("");
  }
  loadWarning.textContent = state.hand.length >= MAX_HAND ? "手上已滿 3/3" : currentLoad() >= rules.maxLoad - 1 ? "負荷太高" : "";
  loadWarning.classList.toggle("is-visible", state.hand.length >= MAX_HAND || currentLoad() >= rules.maxLoad - 1);
  highlightTarget();
}

function highlightTarget() {
  Object.values(zones).forEach(zone => zone.classList.remove("target"));
  if (state.hand.length === 0) return;
  state.locked = clamp(state.locked, 0, state.hand.length - 1);
  const targetZone = zones[state.hand[state.locked].target];
  if (targetZone && !targetZone.hidden) targetZone.classList.add("target");
}

function renderTasks() {
  taskLayer.innerHTML = "";
  state.tasks.forEach(task => {
    const point = spawnPoints.find(spawnPoint => spawnPoint.id === task.spawn);
    if (!point) return;
    const ratio = clamp((task.deadline - (state.elapsed - task.created)) / task.deadline, 0, 1);
    const urgentLine = task.type === "crisis" ? rules.crisisWarnRatio : 0.28;
    const card = document.createElement("article");
    card.className = `task-card task-${task.color} ${ratio < urgentLine ? "urgent" : ""} ${task.type === "crisis" ? "crisis" : ""}`;
    card.dataset.id = task.id;
    card.style.left = `${point.x}px`;
    card.style.top = `${point.y}px`;
    card.innerHTML = `<div class="task-card-head"><span>${task.emoji}</span></div>
      <div class="task-card-title">${task.title}</div>
      <div class="task-life"><span style="width:${ratio * 100}%"></span></div>`;
    taskLayer.append(card);
  });
  state.powerups.forEach(powerup => {
    const point = spawnPoints.find(spawnPoint => spawnPoint.id === powerup.spawn) || powerup;
    const card = document.createElement("article");
    card.className = "powerup-merit";
    card.dataset.id = powerup.id;
    card.style.left = `${point.x}px`;
    card.style.top = `${point.y}px`;
    card.innerHTML = `<span>🙏</span><b>功德無量</b>`;
    taskLayer.append(card);
  });
}

function refreshTaskBars() {
  let shouldRerender = false;
  taskLayer.querySelectorAll(".task-card").forEach(card => {
    const task = state.tasks.find(item => item.id === card.dataset.id);
    if (!task) return;
    const ratio = clamp((task.deadline - (state.elapsed - task.created)) / task.deadline, 0, 1);
    card.querySelector(".task-life span").style.width = `${ratio * 100}%`;
    const urgentLine = task.type === "crisis" ? rules.crisisWarnRatio : 0.28;
    if ((ratio < urgentLine) !== card.classList.contains("urgent")) shouldRerender = true;
  });
  if (shouldRerender) renderTasks();
}

function toast(text) {
  clearTimeout(toastTimer);
  gameMessage.textContent = text;
  gameMessage.classList.remove("is-muted");
  toastTimer = setTimeout(() => gameMessage.classList.add("is-muted"), 1800);
}

function floatText(text) {
  const el = document.createElement("div");
  el.className = "float-text";
  el.textContent = text;
  el.style.left = `${playerState.x + 26}px`;
  el.style.top = `${playerState.y - 20}px`;
  mapArea.append(el);
  setTimeout(() => el.remove(), 850);
}

function flash() {
  const el = document.querySelector("#screen-flash");
  el.className = "screen-flash active";
  setTimeout(() => { el.className = "screen-flash"; }, 360);
}

function meritFlash() {
  const el = document.querySelector("#screen-flash");
  el.className = "screen-flash merit";
  setTimeout(() => { el.className = "screen-flash"; }, 420);
}

function applyEffects(effects, opts = {}) {
  Object.entries(effects).forEach(([key, value]) => {
    if (key === "crisisMiss") state.crisisMissed += value;
    else state.metrics[key] = clamp(state.metrics[key] + value, 0, key === "life" ? rules.maxLife : 100);
  });
  lockLevelMetrics();
  updateHud();
  if (!opts.skipEnd) checkGameOver();
}

function pickup(task) {
  if (task.collecting) return;
  if (state.hand.length >= MAX_HAND) return toast("手上已滿 3/3");
  if (currentLoad() + task.weight > rules.maxLoad) return toast("負荷太高");
  task.collecting = true;
  taskLayer.querySelector(`[data-id="${task.id}"]`)?.classList.add("collected");
  toast("目的地已發光");
  floatText("接起");
  setTimeout(() => {
    state.tasks = state.tasks.filter(item => item.id !== task.id);
    state.hand.push(task);
    state.locked = state.hand.length - 1;
    renderTasks();
    updateHand();
  }, 160);
}

function pickupMerit(powerup) {
  state.tasks = [];
  state.powerups = state.powerups.filter(item => item.id !== powerup.id);
  toast("🙏 功德無量！場上任務清空");
  floatText("功德無量");
  meritFlash();
  renderTasks();
}

function deliver(zoneKey) {
  const done = state.hand.filter(task => task.target === zoneKey);
  if (done.length === 0) return false;
  state.hand = state.hand.filter(task => task.target !== zoneKey);
  done.forEach(task => {
    state.completed += 1;
    applyEffects(task.complete);
  });
  state.locked = 0;
  toast(done.length > 1 ? `KPI +${done.length}` : "KPI +1");
  floatText("KPI +1");
  updateHand();
  if (state.completed >= level().kpiTarget) passLevel();
  return true;
}

function checkPickup() {
  taskLayer.querySelectorAll(".task-card").forEach(card => {
    const task = state.tasks.find(item => item.id === card.dataset.id);
    if (task && overlapElement(player, card)) pickup(task);
  });
  taskLayer.querySelectorAll(".powerup-merit").forEach(card => {
    const powerup = state.powerups.find(item => item.id === card.dataset.id);
    if (powerup && overlapElement(player, card)) pickupMerit(powerup);
  });
}

function checkDelivery() {
  Object.entries(zones).forEach(([key, zone]) => {
    if (zone.hidden) return;
    if (!overlapElement(player, zone, 2)) return;
    const hadTask = state.hand.length > 0;
    const delivered = deliver(key);
    if (!delivered && hadTask && state.elapsed - wrongHintAt > 1.4) {
      wrongHintAt = state.elapsed;
      toast("這裡不是目的地");
    }
  });
}

function processRest(dt) {
  const inRest = overlapElement(player, restZone, 2);
  const canHeal = inRest && state.metrics.life < 100;
  state.rest.active = canHeal;
  restZone.classList.toggle("resting", canHeal);
  player.classList.toggle("resting", canHeal);

  if (!inRest || state.metrics.life >= 100) {
    restFill.style.width = "0%";
    return;
  }

  state.metrics.life = clamp(state.metrics.life + rules.restRegen * dt, 0, 100);
  restFill.style.width = `${clamp(state.metrics.life, 0, 100)}%`;
  if (state.elapsed - state.rest.noticeAt > 1.4) {
    state.rest.noticeAt = state.elapsed;
    toast("休息中 ☕");
  }
  updateHud();
}

function expireTasks() {
  const expiredTasks = state.tasks.filter(task => state.elapsed - task.created >= task.deadline);
  if (expiredTasks.length === 0) return;
  state.tasks = state.tasks.filter(task => state.elapsed - task.created < task.deadline);
  expiredTasks.forEach(task => {
    state.expired += 1;
    if (task.type === "crisis") flash();
    applyEffects(task.expire, { skipEnd: true });
    toast(`延誤 ${task.emoji} ${task.title}`);
  });
  renderTasks();
  checkGameOver();
}

function naturalPressure(dt) {
  let drain = 0.9;
  if (state.hand.length === 2) drain += 0.55;
  if (state.hand.length === 3) drain += 1.1;
  state.metrics.life -= drain * rules.lifeDrainMultiplier * dt;

  state.caseTimer += dt;
  state.docTimer += dt;
  state.networkTimer += dt;
  if (state.caseTimer >= 5 / rules.caseRateMultiplier) {
    state.caseTimer = 0;
    state.metrics.case += 3;
  }
  if (state.docTimer >= 4.5 / rules.docRateMultiplier) {
    state.docTimer = 0;
    state.metrics.doc += 4;
  }
  if (level().networkPressureActive && state.networkTimer >= 6 / rules.networkRateMultiplier) {
    state.networkTimer = 0;
    state.metrics.network += 3;
  }
  lockLevelMetrics();
  updateHud();
}

function checkWarnings() {
  if (state.elapsed - state.lastWarningAt <= 3.2) return;
  if (state.metrics.life < 30) toastAndMark("你快撐不住了");
  else if (state.metrics.case >= 90 || state.metrics.doc >= 90 || (level().networkPressureActive && state.metrics.network >= 90)) toastAndMark("再不處理就會爆表");
  else if (state.metrics.case >= 75) toastAndMark("個案壓力快爆了");
  else if (state.metrics.doc >= 75) toastAndMark("文件壓力快爆了");
  else if (level().networkPressureActive && state.metrics.network >= 75) toastAndMark("網絡壓力快爆了");
}

function toastAndMark(text) {
  toast(text);
  state.lastWarningAt = state.elapsed;
}

function checkGameOver() {
  if (state.ended) return;
  if (state.metrics.life <= 0) endGame("life");
  else if (state.metrics.case >= 100) endGame("case");
  else if (state.metrics.doc >= 100) endGame("doc");
  else if (level().networkPressureActive && state.metrics.network >= 100) endGame("network");
}

function resultText(reason) {
  if (reason === "life") return ["你先倒下了", "你接了太多，最後先倒下的是工作者自己。"];
  if (reason === "case") return ["個案壓力爆表", "太多個案端壓力沒被即時處理，安全線失守了。"];
  if (reason === "doc") return ["文件壓力爆表", "核銷、紀錄與信件把一天淹沒了。"];
  if (reason === "network") return ["網絡壓力爆表", "協調與轉介沒有接上，網絡壓力失控了。"];
  if (reason === "system") return ["你被體制壓垮了", "不是你不夠努力，而是體制壓力已經超過一個人能承受的範圍。"];
  return ["時間到了", "你撐到了這一輪，但 KPI 還沒完全達成。"];
}

function renderClearHero(hero, config, isFinalClear) {
  hero.innerHTML = "";
  hero.hidden = !config;
  if (!config) return;

  const figure = document.createElement("figure");
  figure.className = `level-clear-visual ${isFinalClear ? "final-clear-visual" : ""}`;
  const image = document.createElement("img");
  image.src = config.image;
  image.alt = config.alt;
  image.dataset.fallbackSrc = config.fallbackImage || "";
  image.addEventListener("error", () => {
    const fallback = image.dataset.fallbackSrc;
    if (fallback && !image.dataset.usedFallback) {
      image.dataset.usedFallback = "true";
      image.src = fallback;
      return;
    }
    image.hidden = true;
    figure.classList.add("is-missing");
    figure.dataset.missing = config.image;
  });
  figure.append(image);
  hero.append(figure);
}

function showResult(title, body, mode) {
  setScreen("result");
  state.resultMode = mode;
  const clearConfig = (mode === "next" || mode === "final") ? LEVEL_CLEAR_CONFIG[level().id] : null;
  const isFinalClear = Boolean(clearConfig?.final);
  const kpiDone = clearConfig ? level().kpiTarget : state.completed;
  const hero = document.querySelector("#result-hero");
  const card = document.querySelector(".result-card");
  card.classList.toggle("is-final-clear", isFinalClear);
  renderClearHero(hero, clearConfig, isFinalClear);
  document.querySelector("#result-title").textContent = clearConfig?.title || title;
  document.querySelector("#result-ending").textContent = clearConfig?.message || body;
  const crisisStat = isFinalClear ? `<span>危機漏接 ${state.crisisMissed} 件</span>` : "";
  document.querySelector("#result-stats").innerHTML = `
    <span>達成 KPI ${kpiDone} / ${level().kpiTarget}</span>
    <span>生命 ${Math.round(state.metrics.life)}</span>
    <span>個案壓力 ${Math.round(state.metrics.case)}</span>
    <span>文件壓力 ${Math.round(state.metrics.doc)}</span>
    <span>網絡壓力 ${Math.round(state.metrics.network)}</span>
    ${crisisStat}`;
  document.querySelector("#restart-button").textContent = clearConfig?.primaryLabel || "重新挑戰本關";
  document.querySelector("#result-home-button").textContent = isFinalClear ? "回到首頁" : "返回首頁";
  document.querySelector("#result-home-button").hidden = !(isFinalClear || mode === "restart");
  setTimeout(() => { document.querySelector("#result-overlay").hidden = false; }, 260);
}

function showLevelClearScreen() {
  const hasNext = currentLevelIndex < LEVELS.length - 1;
  showResult(level().passTitle, level().passText, hasNext ? "next" : "final");
}

function showGameOverScreen(reason) {
  const [title, body] = resultText(reason);
  showResult(title, body, "restart");
}

function endGame(reason = "time") {
  if (state.ended) return;
  state.failedLevelId = level().id;
  state.running = false;
  state.ended = true;
  keys.clear();
  state.rest.active = false;
  state.systemMonster.active = false;
  restZone.classList.remove("resting");
  player.classList.remove("resting");
  restFill.style.width = "0%";
  if (systemMonsterEl) systemMonsterEl.hidden = true;
  if (reason !== "time") flash();
  showGameOverScreen(reason);
}

function passLevel() {
  if (state.ended) return;
  state.running = false;
  state.ended = true;
  keys.clear();
  state.rest.active = false;
  state.systemMonster.active = false;
  restZone.classList.remove("resting");
  player.classList.remove("resting");
  restFill.style.width = "0%";
  if (systemMonsterEl) systemMonsterEl.hidden = true;
  showLevelClearScreen();
}

function handleResultButton() {
  if (state.resultMode === "next") {
    const nextLevelId = LEVEL_CLEAR_CONFIG[level().id]?.nextLevelId || Math.min(level().id + 1, LEVELS.length);
    startLevel(nextLevelId);
  } else if (state.resultMode === "restart") {
    startLevel(state.failedLevelId || level().id);
  } else {
    currentLevelIndex = 0;
    startLevel(1);
  }
}

function updateDebug() {
  const layoutDebug = state.zoneLayoutDebug || { source: "n/a", crisis: "n/a", rest: "n/a" };
  debugPanel.innerHTML = `<strong>DEBUG</strong>
    <span>phase: v4.5 levels</span>
    <span>level: ${level().id}</span>
    <span>layout: ${layoutDebug.source}</span>
    <span>crisis: ${layoutDebug.crisis}</span>
    <span>rest: ${layoutDebug.rest}</span>
    <span>timeLeft: ${Math.ceil(state.timeLeft)}</span>
    <span>spawn interval: ${phase().interval.toFixed(2)}s</span>
    <span>load: ${currentLoad()} / ${rules.maxLoad}</span>
    <span>tasks on map: ${state.tasks.length}</span>
    <span>powerups: ${state.powerups.length}</span>
    <span>system monster: ${state.systemMonster.active ? "active" : "off"}</span>
    <span>completed: ${state.completed}</span>
    <span>canvas: not used</span>`;
}

function movePlayerToPointer(event) {
  const map = logicalMapSize();
  const scaleX = map.rect.width ? map.width / map.rect.width : 1;
  const scaleY = map.rect.height ? map.height / map.rect.height : 1;
  const logicalX = clamp((event.clientX - map.rect.left) * scaleX, 0, map.width);
  const logicalY = clamp((event.clientY - map.rect.top) * scaleY, 0, map.height);
  const playerWidth = player.offsetWidth || 70;
  const playerHeight = player.offsetHeight || 72;
  playerState.x = logicalX - playerWidth / 2;
  playerState.y = logicalY - playerHeight / 2;
  player.classList.add("is-moving", "direct-dragging");
  updatePlayer();
  checkPickup();
  checkDelivery();
  processRest(0);
  checkSystemMonsterCollision();
  updateDebug();
}

function stopTouchMove() {
  directTouchDrag.active = false;
  directTouchDrag.pointerId = null;
  player.classList.remove("direct-dragging", "is-moving");
}

function movePlayer() {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy += 1;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += 1;

  if (directTouchDrag.active && dx === 0 && dy === 0) return;

  if (dx === 0 && dy === 0) {
    player.classList.remove("is-moving");
    return;
  }
  const length = Math.hypot(dx, dy) || 1;
  playerState.x += (dx / length) * moveSpeed();
  playerState.y += (dy / length) * moveSpeed();
  player.classList.add("is-moving");
  updatePlayer();
  checkPickup();
  checkDelivery();
}

function loop(time) {
  const dt = Math.min((time - lastFrame) / 1000 || 0, 0.05);
  lastFrame = time;
  if (state.running && !state.ended) {
    state.timeLeft -= dt;
    state.elapsed += dt;
    state.spawnTimer += dt;
    movePlayer();
    processRest(dt);
    updateSystemMonster(dt);
    maybeSpawnMerit();
    naturalPressure(dt);
    expireTasks();
    refreshTaskBars();
    if (state.spawnTimer >= phase().interval) {
      state.spawnTimer = 0;
      spawn(pickWeighted(phase().weights));
    }
    updateHud();
    updateHand();
    updateDebug();
    checkWarnings();
    checkGameOver();
    if (state.timeLeft <= 0) endGame("time");
  }
  requestAnimationFrame(loop);
}

function startLevel(levelNumber = 1) {
  currentLevelIndex = clamp(levelNumber - 1, 0, LEVELS.length - 1);
  document.querySelector("#result-overlay").hidden = true;
  showGameScreen();
  resetState();
  applyLevelVisibility();
  state.running = true;
  enabledTaskTypes().forEach(spawn);
  updatePlayer();
  setupSystemMonster();
  updateHud();
  updateHand();
  updateDebug();
  renderTasks();
  tutorialBox.classList.remove("is-muted");
  setTimeout(() => tutorialBox.classList.add("is-muted"), 2500);
  toast(level().networkPressureActive ? "第二關開始：網絡壓力加入，紫色任務送會議室" : level().name);
}

function startGame() {
  startLevel(currentLevelIndex + 1);
}

startButton.addEventListener("click", () => {
  startBgm();
  showRulesScreen();
});
rulesFromHomeButton.addEventListener("click", showRulesScreen);
beginLevelButton.addEventListener("click", () => {
  startBgm();
  startLevel(1);
});
backHomeButton.addEventListener("click", showHomeScreen);
debugToggle.addEventListener("click", () => { debugPanel.hidden = !debugPanel.hidden; });
helpButton.addEventListener("click", () => {
  toast(isTouchLayout() ? "拖拉地圖移動，看發光目標" : "WASD / 方向鍵移動，Q / Tab 換目標");
});

mobileControls?.querySelectorAll("button").forEach(button => {
  const key = button.dataset.key;
  const press = event => {
    event.preventDefault();
    if (state.running) keys.add(key);
  };
  const release = event => {
    event.preventDefault();
    keys.delete(key);
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
});

mapArea.addEventListener("pointerdown", event => {
  const interactiveTarget = event.target instanceof Element && event.target.closest("button");
  if (!state.running || !isTouchDevice() || interactiveTarget) return;
  event.preventDefault();
  directTouchDrag.active = true;
  directTouchDrag.pointerId = event.pointerId;
  mapArea.setPointerCapture?.(event.pointerId);
  movePlayerToPointer(event);
}, { passive: false });

mapArea.addEventListener("pointermove", event => {
  if (!directTouchDrag.active || directTouchDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  movePlayerToPointer(event);
}, { passive: false });

["pointerup", "pointercancel", "pointerleave"].forEach(type => {
  mapArea.addEventListener(type, event => {
    if (directTouchDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    mapArea.releasePointerCapture?.(event.pointerId);
    stopTouchMove();
  }, { passive: false });
});

window.addEventListener("keydown", event => {
  if (!state.running) return;
  if (moveKeys.has(event.key)) {
    event.preventDefault();
    keys.add(event.key);
  }
  if (lockKeys.has(event.key)) {
    event.preventDefault();
    if (state.hand.length > 0) {
      state.locked = (state.locked + 1) % state.hand.length;
      highlightTarget();
      toast("切換目標");
    }
    updateHand();
  }
});

window.addEventListener("keyup", event => {
  if (!moveKeys.has(event.key)) return;
  event.preventDefault();
  keys.delete(event.key);
});

window.addEventListener("resize", updateStageScale);
window.addEventListener("orientationchange", updateStageScale);

setupUi();
resetState();
updateHud();
updateHand();
updateDebug();
setScreen("home");
updateStageScale();
requestAnimationFrame(time => {
  lastFrame = time;
  requestAnimationFrame(loop);
});
