'use strict';

// ============================================================
// CONFIG
// ============================================================
const MAP_W = 800;
const MAP_H = 540;
const GAME_DURATION = 90;
const MAX_CARRY = 7;
const PLAYER_R = 13;
const PICKUP_R = 46;
const DELIVER_COOLDOWN = 0.32; // seconds between successive deliveries

// ============================================================
// ZONE DEFINITIONS
// headColor = solid color for the header band
// bodyColor = solid light fill for zone body
// borderColor = border stroke color
// ============================================================
const ZONES = [
  {
    id: 'desk', name: '辦公桌', accepts: ['yellow'],
    headColor: '#D4850A', bodyColor: '#FFF3CC', borderColor: '#B36A00',
    x: 40,  y: 40,  w: 168, h: 110, label: '行政紀錄', emoji: '📋'
  },
  {
    id: 'service', name: '個案服務區', accepts: ['blue'],
    headColor: '#2471A3', bodyColor: '#D6EAF8', borderColor: '#1A5276',
    x: 592, y: 40,  w: 168, h: 110, label: '服務需求', emoji: '🙋'
  },
  {
    id: 'crisis', name: '危機處理區', accepts: ['red'],
    headColor: '#C0392B', bodyColor: '#FDECEA', borderColor: '#96281B',
    x: 40,  y: 380, w: 180, h: 120, label: '危機事件', emoji: '🔔'
  },
  {
    id: 'meeting', name: '會議室', accepts: ['purple'],
    headColor: '#7D3C98', bodyColor: '#EDE0F5', borderColor: '#5B2C6F',
    x: 592, y: 290, w: 168, h: 110, label: '網絡聯繫', emoji: '📞'
  },
  {
    id: 'supervisor', name: '督導室', accepts: ['green'],
    headColor: '#1E8449', bodyColor: '#D5F5E3', borderColor: '#145A32',
    x: 292, y: 380, w: 160, h: 120, label: '支持資源', emoji: '🤝'
  },
  {
    id: 'rest', name: '休息角落', accepts: ['green'],
    headColor: '#148A68', bodyColor: '#D1F2EB', borderColor: '#0E6655',
    x: 592, y: 420, w: 168, h: 80,  label: '支持資源', emoji: '☕'
  },
];

// ============================================================
// TASK TYPE DEFINITIONS
// ============================================================
const TASK_DEFS = {
  red: {
    color: '#e74c3c',
    bgColor: '#fdedec',
    border: '#c0392b',
    label: '危機事件',
    zone: ['crisis'],
    texts: ['緊急來電', '衝突升高', '安全評估', '保護令問題'],
    urgency: 22,
    onComplete(s) {
      s.caseSafety     = clamp(s.caseSafety + 12, 0, 100);
      s.serviceProgress = clamp(s.serviceProgress + 5, 0, 100);
      if (Math.random() < 0.7) spawnTask('yellow');
    },
    onExpire(s) { s.caseSafety = clamp(s.caseSafety - 14, 0, 100); }
  },
  blue: {
    color: '#2980b9',
    bgColor: '#d6eaf8',
    border: '#1a6695',
    label: '服務需求',
    zone: ['service'],
    texts: ['福利申請', '租屋困難', '就業需求', '情緒支持'],
    urgency: 32,
    onComplete(s) {
      s.serviceProgress = clamp(s.serviceProgress + 9, 0, 100);
      if (Math.random() < 0.4) spawnTask('yellow');
    },
    onExpire(s) {
      s.serviceProgress = clamp(s.serviceProgress - 5, 0, 100);
      s.caseSafety      = clamp(s.caseSafety - 4, 0, 100);
    }
  },
  yellow: {
    color: '#c9930a',
    bgColor: '#fef9e7',
    border: '#a07800',
    label: '行政紀錄',
    zone: ['desk'],
    texts: ['服務紀錄', '評估表', '成果回報', '系統登打'],
    urgency: 38,
    onComplete(s) { s.recordPressure = clamp(s.recordPressure - 14, 0, 100); },
    onExpire(s)   { s.recordPressure = clamp(s.recordPressure + 11, 0, 100); }
  },
  purple: {
    color: '#8e44ad',
    bgColor: '#f5eef8',
    border: '#6c3483',
    label: '網絡聯繫',
    zone: ['meeting'],
    texts: ['法院回覆', '警政聯繫', '醫療轉介', '學校聯繫'],
    urgency: 32,
    onComplete(s) { s.serviceProgress = clamp(s.serviceProgress + 7, 0, 100); },
    onExpire(s) {
      s.recordPressure  = clamp(s.recordPressure + 9, 0, 100);
      s.serviceProgress = clamp(s.serviceProgress - 3, 0, 100);
    }
  },
  green: {
    color: '#27ae60',
    bgColor: '#d5f5e3',
    border: '#1e8449',
    label: '支持資源',
    zone: ['supervisor', 'rest'],
    texts: ['督導討論', '同事協助', '短暫休息', '資源清單'],
    urgency: 48,
    onComplete(s) {
      s.workerEnergy = clamp(s.workerEnergy + 22, 0, 100);
      s.caseSafety   = clamp(s.caseSafety + 4, 0, 100);
    },
    onExpire(s) { s.workerEnergy = clamp(s.workerEnergy - 4, 0, 100); }
  }
};

// ============================================================
// SURGE EVENT POOL
// ============================================================
const SURGE_POOL = [
  { text: '突發事件：主管臨時會議', type: 'purple' },
  { text: '突發事件：法院催資料',   type: 'yellow' },
  { text: '突發事件：個案突然來電', type: 'red'    },
  { text: '突發事件：家訪延誤',     type: 'blue'   },
  { text: '突發事件：網絡單位要求回覆', type: 'purple' },
  { text: '突發事件：評估期限到期', type: 'yellow' },
];

// ============================================================
// STATE
// ============================================================
let G = {};          // game stats
let player = {};
let mapTasks = [];   // tasks lying on map
let heldTasks = [];  // tasks carried by player
let effects = [];    // visual pop effects
let taskSeq = 0;

const keys = { up: false, down: false, left: false, right: false };
const touch = { up: false, down: false, left: false, right: false };

let spawnTimer = 0;
let surgeTimer = 0;
let nextSurge  = 0;
let evtTimer   = 0;
let wrongTimer = 0;
let arrowHint  = null;
let deliverTimer = 0;   // cooldown between deliveries
let lastZoneId   = null; // track zone entry to avoid hint spam

let canvas, ctx, cScale = 1;
let raf = null;
let lastT = 0;
let completed = 0;
let uncompleted = 0;

// ============================================================
// UTIL
// ============================================================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand  = (a, b) => Math.random() * (b - a) + a;
const pick  = arr => arr[0 | (Math.random() * arr.length)];

function dist2(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function getPhase(elapsed) {
  if (elapsed < 30) return { name: '上午', idx: 0 };
  if (elapsed < 60) return { name: '下午', idx: 1 };
  return { name: '傍晚', idx: 2 };
}

function spawnWeights(phase) {
  if (phase === 0) return ['blue','blue','yellow','yellow','purple'];
  if (phase === 1) return ['blue','yellow','purple','red','red','green'];
  return ['red','red','yellow','yellow','purple','purple','green'];
}

function spawnInterval(phase) {
  return [8, 5.5, 4][phase];
}

// Safe positions avoid zones, player start, and the map edges
// X range capped at MAP_W-80 so cards don't appear under zone right edges
function safePosOnMap() {
  const playerStartX = MAP_W / 2, playerStartY = MAP_H / 2;
  for (let i = 0; i < 100; i++) {
    const x = rand(55, MAP_W - 80);
    const y = rand(55, MAP_H - 55);
    if (dist2(x, y, playerStartX, playerStartY) < 75) continue;
    let blocked = false;
    for (const z of ZONES) {
      if (x > z.x - 35 && x < z.x + z.w + 35 &&
          y > z.y - 35 && y < z.y + z.h + 35) {
        blocked = true; break;
      }
    }
    if (!blocked) return { x, y };
  }
  return { x: 250, y: 280 }; // central open area fallback
}

// ============================================================
// CANVAS SETUP
// ============================================================
function setupCanvas() {
  if (!canvas) {
    canvas = document.getElementById('game-canvas');
    ctx    = canvas.getContext('2d');
  }
  resizeCanvas();
}

function resizeCanvas() {
  if (!canvas) return;
  const area = document.getElementById('game-area');
  // Force layout read; fallback to viewport estimates
  let aw = area.clientWidth;
  let ah = area.clientHeight;
  if (aw <= 0) aw = window.innerWidth  - 200; // subtract sidebar estimate
  if (ah <= 0) ah = window.innerHeight - 160; // subtract bars estimate
  if (aw <= 0) aw = 600;
  if (ah <= 0) ah = 400;
  cScale        = Math.min(aw / MAP_W, ah / MAP_H);
  // Always set canvas rendering resolution
  canvas.width  = MAP_W;
  canvas.height = MAP_H;
  canvas.style.width  = Math.floor(MAP_W * cScale) + 'px';
  canvas.style.height = Math.floor(MAP_H * cScale) + 'px';
}

// ============================================================
// SPAWN
// ============================================================
function spawnTask(forceType) {
  const elapsed = GAME_DURATION - G.timeLeft;
  const { idx }  = getPhase(elapsed);
  const type     = forceType || pick(spawnWeights(idx));
  const def      = TASK_DEFS[type];
  const pos      = safePosOnMap();
  mapTasks.push({
    id:     taskSeq++,
    type,
    text:   pick(def.texts),
    x:      pos.x,
    y:      pos.y,
    age:    0,
    maxAge: def.urgency,
  });
}

// ============================================================
// PLAYER SPEED
// ============================================================
function playerSpeed() {
  const n = heldTasks.length;
  if (n <= 2) return 170;
  if (n <= 4) return 138;
  if (n <= 6) return 108;
  return 88;
}

// ============================================================
// MOVEMENT
// ============================================================
function movePlayer(dt) {
  let dx = 0, dy = 0;
  if (keys.up    || touch.up)    dy -= 1;
  if (keys.down  || touch.down)  dy += 1;
  if (keys.left  || touch.left)  dx -= 1;
  if (keys.right || touch.right) dx += 1;

  if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }

  const spd = playerSpeed();
  player.x = clamp(player.x + dx * spd * dt, PLAYER_R, MAP_W - PLAYER_R);
  player.y = clamp(player.y + dy * spd * dt, PLAYER_R, MAP_H - PLAYER_R);
}

// ============================================================
// PICKUP
// ============================================================
function checkPickup() {
  if (heldTasks.length >= MAX_CARRY) return;
  for (let i = mapTasks.length - 1; i >= 0; i--) {
    const t = mapTasks[i];
    if (dist2(player.x, player.y, t.x, t.y) < PICKUP_R) {
      heldTasks.push(t);
      mapTasks.splice(i, 1);
      updateTaskListDOM();
      return;
    }
  }
}

// ============================================================
// DELIVERY
// ============================================================
// Use center-circle detection to avoid zone-overlap false triggers.
// Each zone gets radius = min(w,h)*0.42 + 10 (generous but non-overlapping).
function zoneDeliverRadius(z) {
  return Math.min(z.w, z.h) * 0.42 + 10;
}

function checkDelivery() {
  if (heldTasks.length === 0) { lastZoneId = null; return; }
  if (deliverTimer > 0) return;

  // Find the closest zone the player is inside
  let nearZone = null, nearDist = Infinity;
  for (const zone of ZONES) {
    const cx = zone.x + zone.w / 2, cy = zone.y + zone.h / 2;
    const d  = dist2(player.x, player.y, cx, cy);
    if (d < zoneDeliverRadius(zone) && d < nearDist) {
      nearDist = d;
      nearZone = zone;
    }
  }

  if (!nearZone) { lastZoneId = null; return; }

  // Try to deliver one matching task
  let delivered = false;
  for (let i = heldTasks.length - 1; i >= 0; i--) {
    const t   = heldTasks[i];
    const def = TASK_DEFS[t.type];
    if (def.zone.includes(nearZone.id)) {
      def.onComplete(G);
      completed++;
      heldTasks.splice(i, 1);
      delivered = true;
      deliverTimer = DELIVER_COOLDOWN;
      effects.push({ x: nearZone.x + nearZone.w / 2, y: nearZone.y + nearZone.h / 2, age: 0, type: t.type });
      updateTaskListDOM();
      lastZoneId = nearZone.id; // allow next delivery to same zone after cooldown
      break;
    }
  }

  // Show wrong-zone hint only once per zone entry (not every frame)
  if (!delivered && lastZoneId !== nearZone.id) {
    showWrongHint();
    lastZoneId = nearZone.id;
  }
}

// ============================================================
// STATS TICK
// ============================================================
function tickStats(dt) {
  const base  = 0.45;                   // reduced from 0.55
  const extra = heldTasks.length * 0.10; // reduced from 0.18
  G.workerEnergy = clamp(G.workerEnergy - (base + extra) * dt, 0, 100);

  for (let i = mapTasks.length - 1; i >= 0; i--) {
    mapTasks[i].age += dt;
    if (mapTasks[i].age >= mapTasks[i].maxAge) {
      TASK_DEFS[mapTasks[i].type].onExpire(G);
      uncompleted++;
      mapTasks.splice(i, 1);
    }
  }

  for (const t of heldTasks) {
    t.age = clamp(t.age + dt * 0.35, 0, t.maxAge);
  }
}

// ============================================================
// ARROW HINT
// ============================================================
function updateArrow() {
  const elapsed = GAME_DURATION - G.timeLeft;
  const hasRed  = heldTasks.some(t => t.type === 'red') || mapTasks.some(t => t.type === 'red');

  if (G.workerEnergy < 30) {
    const z = ZONES.find(z => z.id === 'rest');
    arrowHint = { tx: z.x + z.w / 2, ty: z.y + z.h / 2, color: '#52b788' };
  } else if (G.recordPressure > 70) {
    const z = ZONES.find(z => z.id === 'desk');
    arrowHint = { tx: z.x + z.w / 2, ty: z.y + z.h / 2, color: '#c9930a' };
  } else if (hasRed) {
    const z = ZONES.find(z => z.id === 'crisis');
    arrowHint = { tx: z.x + z.w / 2, ty: z.y + z.h / 2, color: '#e74c3c' };
  } else if (elapsed < 15) {
    const z = ZONES.find(z => z.id === 'desk');
    arrowHint = { tx: z.x + z.w / 2, ty: z.y + z.h / 2, color: '#27ae60' };
  } else {
    arrowHint = null;
  }
}

// ============================================================
// SURGE
// ============================================================
function triggerSurge() {
  const evt = pick(SURGE_POOL);
  showEventBanner(evt.text);
  spawnTask(evt.type);
  if (Math.random() < 0.45) spawnTask(evt.type);
}

// ============================================================
// RENDER
// ============================================================
function render(elapsed) {
  // Reset critical context state at start of every frame
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
  ctx.shadowColor = 'transparent';
  ctx.setLineDash([]);

  ctx.clearRect(0, 0, MAP_W, MAP_H);

  // ── Background ──
  ctx.fillStyle = '#F0ECE4';
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // Floor grid (subtle)
  ctx.strokeStyle = '#DDD6CC';
  ctx.lineWidth   = 0.8;
  for (let gx = 0; gx <= MAP_W; gx += 60) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, MAP_H); ctx.stroke();
  }
  for (let gy = 0; gy <= MAP_H; gy += 60) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(MAP_W, gy); ctx.stroke();
  }

  // Open corridors (slightly lighter strip)
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(228, 0, 60, MAP_H);   // vertical
  ctx.fillRect(0, 175, MAP_W, 60);   // horizontal upper
  ctx.fillRect(0, 360, MAP_W, 16);   // horizontal lower divider

  // ── Zones ──
  for (const z of ZONES) drawZone(z);

  // ── Arrow hint ──
  if (arrowHint) {
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; // reset before arrow
    drawArrow(player.x, player.y, arrowHint.tx, arrowHint.ty, arrowHint.color);
  }

  // ── Map tasks ──
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  for (const t of mapTasks) drawTaskCard(t);

  // ── Delivery effects ──
  for (const fx of effects) {
    const a = Math.max(0, 1 - fx.age / 0.6);
    ctx.globalAlpha  = a;
    ctx.strokeStyle  = TASK_DEFS[fx.type].color;
    ctx.lineWidth    = 3;
    ctx.shadowBlur   = 0;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, 20 + fx.age * 55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle    = TASK_DEFS[fx.type].color;
    ctx.font         = 'bold 20px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', fx.x, fx.y - fx.age * 28);
    ctx.globalAlpha = 1;
  }

  // ── Player ──
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
  drawPlayer();

  // ── Tutorial banner (first 8 s, per spec) ──
  if (elapsed < 8) {
    const alpha = elapsed > 5 ? (8 - elapsed) / 3 : 1;
    const bw = 460, bh = 44, bx = MAP_W / 2 - bw / 2, by = MAP_H / 2 - 120;
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = 'rgba(20, 40, 70, 0.88)';
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 1.5;
    rrect(ctx, bx, by, bw, bh, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle    = '#FFFFFF';
    ctx.font         = 'bold 13px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('移動社工角色，收集任務卡，送到相同顏色的工作區。', MAP_W / 2, by + bh / 2);
    ctx.globalAlpha = 1;
  }
}

// ---- helpers ----

// Draw a zone as a solid office room
function drawZone(z) {
  const hasMatch = heldTasks.some(t => TASK_DEFS[t.type].zone.includes(z.id));
  const cx = z.x + z.w / 2;
  const hh = 30; // header height

  // Body fill (solid light color)
  ctx.fillStyle   = z.bodyColor;
  ctx.strokeStyle = hasMatch ? z.headColor : z.borderColor;
  ctx.lineWidth   = hasMatch ? 3.5 : 2;
  rrect(ctx, z.x, z.y, z.w, z.h, 10);
  ctx.fill();
  ctx.stroke();

  // Colored header band (solid)
  ctx.fillStyle = z.headColor;
  // Use clip to keep rounded corners on header top
  ctx.save();
  rrect(ctx, z.x, z.y, z.w, z.h, 10);
  ctx.clip();
  ctx.fillRect(z.x, z.y, z.w, hh);
  ctx.restore();

  // Zone name (white text on header)
  ctx.fillStyle    = '#FFFFFF';
  ctx.font         = 'bold 13px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(z.name, cx, z.y + hh / 2);

  // Emoji in body center
  ctx.font         = '24px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(z.emoji, cx, z.y + hh + (z.h - hh) * 0.42);

  // Sub-label (task type accepted)
  ctx.fillStyle    = z.borderColor;
  ctx.font         = '10px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(z.label, cx, z.y + hh + (z.h - hh) * 0.75);

  // "送到這裡" pulse badge when carrying a matching task
  if (hasMatch) {
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 280);
    const tw = 72, th = 19;
    const tx = cx - tw / 2, ty = z.y + z.h - th - 4;
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = z.headColor;
    rrect(ctx, tx, ty, tw, th, 9);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 10px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('送到這裡', cx, ty + th / 2);
  }

  // Reset state
  ctx.globalAlpha = 1;
}

// Draw a task card
function drawTaskCard(t) {
  const def    = TASK_DEFS[t.type];
  const ratio  = t.age / t.maxAge;
  const urgent = ratio > 0.65;
  const w = 92, h = 54;
  const cx = t.x, cy = t.y;
  const x  = cx - w / 2, y = cy - h / 2;
  const sh = 17; // strip height

  // Card drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  rrect(ctx, x + 2, y + 3, w, h, 8);
  ctx.fill();

  // Card body
  ctx.fillStyle   = def.bgColor;
  ctx.strokeStyle = urgent ? '#C0392B' : def.border;
  ctx.lineWidth   = urgent ? 2.5 : 1.6;
  rrect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Color strip (top)
  ctx.fillStyle = urgent ? '#C0392B' : def.color;
  ctx.save();
  rrect(ctx, x, y, w, h, 8);
  ctx.clip();
  ctx.fillRect(x, y, w, sh);
  ctx.restore();

  // Type label on strip
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 9.5px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.label, cx, y + sh / 2);

  // Task text
  ctx.fillStyle    = '#1A2535';
  ctx.font         = 'bold 12px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(t.text, cx, y + sh + (h - sh - 10) / 2 + 2);

  // Timer bar
  const bx2 = x + 7, bw2 = w - 14, bh2 = 5, by2 = y + h - 9;
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(bx2, by2, bw2, bh2);
  const fill = Math.max(0, 1 - ratio);
  ctx.fillStyle = ratio < 0.5 ? def.color : ratio < 0.75 ? '#E67E22' : '#C0392B';
  ctx.fillRect(bx2, by2, bw2 * fill, bh2);
}

// Draw the player character
function drawPlayer() {
  const x = player.x, y = player.y;
  const R = 17; // slightly bigger than PLAYER_R for drawing

  // Ground shadow (ellipse)
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath();
  ctx.ellipse(x, y + R + 2, R + 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body circle
  ctx.fillStyle   = '#3A6EA8';
  ctx.strokeStyle = '#1E4A80';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(x, y + 3, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // White collar accent
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y + 3, R - 5, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle   = '#F5C5A3';
  ctx.strokeStyle = '#D4956A';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - 9, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair
  ctx.fillStyle = '#4A3020';
  ctx.beginPath();
  ctx.arc(x, y - 12, 10, Math.PI * 0.95, Math.PI * 0.05);
  ctx.fill();

  // Name label "社工"
  ctx.fillStyle    = '#FFFFFF';
  ctx.font         = 'bold 8px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('社工', x, y + 4);

  // Task count badge
  if (heldTasks.length > 0) {
    const full = heldTasks.length >= MAX_CARRY;
    const bx   = x + R - 1, by = y - R + 2;
    ctx.fillStyle   = full ? '#C0392B' : '#E67E22';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 9px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(heldTasks.length, bx, by);
  }
}

function drawArrow(fx, fy, tx, ty, color) {
  const angle = Math.atan2(ty - fy, tx - fx);
  const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 380);
  const startD = PLAYER_R + 8;
  const endD   = 32;

  const sx = fx + Math.cos(angle) * startD;
  const sy = fy + Math.sin(angle) * startD;
  const ex = tx - Math.cos(angle) * endD;
  const ey = ty - Math.sin(angle) * endD;

  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * pulse;
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = 3;
  ctx.setLineDash([9, 6]);

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead
  const al = 13, aw = 7;
  const bx = ex - Math.cos(angle) * al;
  const by = ey - Math.sin(angle) * al;
  const px = Math.sin(angle), py = -Math.cos(angle);

  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(bx + px * aw, by + py * aw);
  ctx.lineTo(bx - px * aw, by - py * aw);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ============================================================
// DOM UPDATES
// ============================================================
function updateStatsDOM() {
  const s = G;

  setBar('safety',   s.caseSafety);
  setBar('energy',   s.workerEnergy);
  setBar('pressure', s.recordPressure);
  setBar('progress', s.serviceProgress);

  // Low energy / high pressure class
  const energyFill = document.getElementById('bar-energy');
  const pressureFill = document.getElementById('bar-pressure');
  energyFill.classList.toggle('low',   s.workerEnergy < 30);
  pressureFill.classList.toggle('high', s.recordPressure > 70);

  document.getElementById('time-remaining').textContent = Math.ceil(s.timeLeft);
  const elapsed = GAME_DURATION - s.timeLeft;
  document.getElementById('phase-label').textContent = getPhase(elapsed).name;
}

function setBar(name, value) {
  document.getElementById('bar-' + name).style.width = value + '%';
  document.getElementById('val-' + name).textContent  = Math.round(value);
}

function updateTaskListDOM() {
  const badge = document.getElementById('task-count-badge');
  const items = document.getElementById('task-items');
  const warn  = document.getElementById('full-warning');

  badge.textContent = heldTasks.length + '/7';
  badge.classList.toggle('full', heldTasks.length >= MAX_CARRY);
  warn.classList.toggle('hidden', heldTasks.length < MAX_CARRY);

  items.innerHTML = '';
  for (const t of heldTasks) {
    const def = TASK_DEFS[t.type];
    const el  = document.createElement('div');
    el.className = 'task-item';
    el.style.borderLeftColor  = def.color;
    el.style.backgroundColor  = def.bgColor;
    el.innerHTML = `<span class="task-item-type" style="color:${def.color}">${def.label}</span><span class="task-item-text">${t.text}</span>`;
    items.appendChild(el);
  }
}

function showEventBanner(text) {
  const el = document.getElementById('event-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  evtTimer = 3.2;
}

function showWrongHint() {
  document.getElementById('wrong-hint').classList.remove('hidden');
  wrongTimer = 1.8;
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(ts) {
  const dt = Math.min((ts - lastT) / 1000, 0.05);
  lastT = ts;

  const elapsed = GAME_DURATION - G.timeLeft;

  G.timeLeft -= dt;
  if (G.timeLeft <= 0) { G.timeLeft = 0; endGame(); return; }

  if (G.caseSafety <= 0 || G.workerEnergy <= 0 || G.recordPressure >= 100) {
    endGame('overload'); return;
  }

  movePlayer(dt);
  checkPickup();
  checkDelivery();
  tickStats(dt);
  updateArrow();

  // Task spawning
  spawnTimer += dt;
  const { idx } = getPhase(elapsed);
  if (spawnTimer >= spawnInterval(idx)) {
    spawnTimer = 0;
    if (mapTasks.length < 14) spawnTask();
  }

  // Surge events
  surgeTimer += dt;
  if (surgeTimer >= nextSurge) {
    surgeTimer = 0;
    nextSurge  = rand(15, 25);
    triggerSurge();
  }

  // Visual timers
  if (evtTimer > 0) {
    evtTimer -= dt;
    if (evtTimer <= 0) document.getElementById('event-banner').classList.add('hidden');
  }
  if (wrongTimer > 0) {
    wrongTimer -= dt;
    if (wrongTimer <= 0) document.getElementById('wrong-hint').classList.add('hidden');
  }

  // Tick timers
  if (deliverTimer > 0) deliverTimer = Math.max(0, deliverTimer - dt);

  // Decay effects
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].age += dt;
    if (effects[i].age > 0.7) effects.splice(i, 1);
  }

  render(elapsed);
  updateStatsDOM();

  raf = requestAnimationFrame(gameLoop);
}

// ============================================================
// END GAME
// ============================================================
function endGame(reason) {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  uncompleted += mapTasks.length + heldTasks.length;
  showResult(reason);
}

function showResult(reason) {
  const s = G;
  let title, text, cls;

  const isOverload = reason === 'overload' || s.caseSafety <= 0 || s.workerEnergy <= 0 || s.recordPressure >= 100;

  if (isOverload) {
    title = '系統過載'; cls = 'ending-overload';
    text  = '這不是單一社工的失敗，而是人力、資源與制度支持不足的警訊。當一個人撐起整個系統，崩潰只是時間問題。';
  } else if (s.caseSafety >= 60 && s.workerEnergy >= 30 && s.recordPressure < 80) {
    title = '撐住今天'; cls = 'ending-good';
    text  = '你完成了最急迫的任務，也記得使用支持資源。但這樣的一天，不能只靠個人意志長期支撐。制度性的改變，才是真正的答案。';
  } else {
    title = '勉強收尾'; cls = 'ending-medium';
    text  = '你努力排序與取捨，但仍有許多工作被迫延後。這是許多第一線社工的日常——不是能力問題，而是任務量遠超過一個人能承擔的極限。';
  }

  document.getElementById('result-title').textContent = title;
  document.getElementById('result-title').className   = 'result-title ' + cls;
  document.getElementById('result-text').textContent  = text;

  const cv = v => Math.round(v);
  document.getElementById('result-stats').innerHTML = `
    <div class="result-stat-grid">
      <div class="result-stat">
        <span class="rs-icon">✅</span>
        <span class="rs-label">完成任務</span>
        <span class="rs-value good">${completed}</span>
      </div>
      <div class="result-stat">
        <span class="rs-icon">🕐</span>
        <span class="rs-label">未完成任務</span>
        <span class="rs-value ${uncompleted > 5 ? 'warn' : 'good'}">${uncompleted}</span>
      </div>
      <div class="result-stat">
        <span class="rs-icon">🛡</span>
        <span class="rs-label">個案安全</span>
        <span class="rs-value ${s.caseSafety >= 60 ? 'good' : 'warn'}">${cv(s.caseSafety)}</span>
      </div>
      <div class="result-stat">
        <span class="rs-icon">⚡</span>
        <span class="rs-label">社工能量</span>
        <span class="rs-value ${s.workerEnergy >= 30 ? 'good' : 'warn'}">${cv(s.workerEnergy)}</span>
      </div>
      <div class="result-stat">
        <span class="rs-icon">📂</span>
        <span class="rs-label">紀錄壓力</span>
        <span class="rs-value ${s.recordPressure < 80 ? 'good' : 'warn'}">${cv(s.recordPressure)}</span>
      </div>
      <div class="result-stat">
        <span class="rs-icon">📈</span>
        <span class="rs-label">服務進度</span>
        <span class="rs-value good">${cv(s.serviceProgress)}</span>
      </div>
    </div>
  `;

  showScreen('result');
}

// ============================================================
// START GAME
// ============================================================
function startGame() {
  G = {
    timeLeft:        GAME_DURATION,
    caseSafety:      70,
    workerEnergy:    80,
    recordPressure:  20,
    serviceProgress: 0,
  };

  player     = { x: MAP_W / 2, y: MAP_H / 2 };
  mapTasks   = [];
  heldTasks  = [];
  effects    = [];
  taskSeq    = 0;
  completed  = 0;
  uncompleted = 0;
  spawnTimer = 0;
  surgeTimer = 0;
  nextSurge  = rand(15, 25);
  evtTimer     = 0;
  wrongTimer   = 0;
  deliverTimer = 0;
  lastZoneId   = null;

  // Reset touch/key state
  Object.keys(keys).forEach(k => keys[k] = false);
  Object.keys(touch).forEach(k => touch[k] = false);

  // Seed initial tasks — yellow first so the tutorial arrow points at desk immediately
  spawnTask('yellow');
  spawnTask('blue');
  spawnTask('purple');

  showScreen('game');
  document.getElementById('event-banner').classList.add('hidden');
  document.getElementById('wrong-hint').classList.add('hidden');
  updateTaskListDOM();

  setupCanvas();
  lastT = performance.now();
  raf = requestAnimationFrame(gameLoop);
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  // Double-rAF ensures the browser has completed layout before we measure
  if (name === 'game') requestAnimationFrame(() => requestAnimationFrame(resizeCanvas));
}

// ============================================================
// INPUT SETUP
// ============================================================
function setupInput() {
  // Keyboard
  const KEY_MAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right'
  };
  window.addEventListener('keydown', e => {
    if (KEY_MAP[e.key]) { keys[KEY_MAP[e.key]] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    if (KEY_MAP[e.key]) keys[KEY_MAP[e.key]] = false;
  });

  // Mobile d-pad
  const DPAD = [
    ['btn-up',    'up'],
    ['btn-down',  'down'],
    ['btn-left',  'left'],
    ['btn-right', 'right'],
  ];
  for (const [id, dir] of DPAD) {
    const btn = document.getElementById(id);
    const on  = e => { e.preventDefault(); touch[dir] = true;  btn.classList.add('pressed'); };
    const off = e => { e.preventDefault(); touch[dir] = false; btn.classList.remove('pressed'); };
    btn.addEventListener('touchstart',  on,  { passive: false });
    btn.addEventListener('touchend',    off, { passive: false });
    btn.addEventListener('touchcancel', off, { passive: false });
    btn.addEventListener('mousedown', on);
    btn.addEventListener('mouseup',   off);
    btn.addEventListener('mouseleave',off);
  }

  // Buttons
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-restart').addEventListener('click', () => {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    startGame();
  });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Pre-init canvas so resize listener is added exactly once
  canvas = document.getElementById('game-canvas');
  ctx    = canvas.getContext('2d');
  window.addEventListener('resize', resizeCanvas);

  setupInput();
  showScreen('menu');
});
