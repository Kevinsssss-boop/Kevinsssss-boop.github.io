// ======================================================================
//  🐍 贪吃蛇大作战 — Ultimate Slither.io-Style Snake Game
//  Single-file, zero-dependency, full-featured.
// ======================================================================


// ======================== 1. CONFIG ========================
let nextSnakeId = 1;
const CFG = {
  WORLD_W: 4000, WORLD_H: 3000,
  FOOD_COUNT: 150,          // increased from 90 — more food = more action
  NPC_COUNT: 10,           // increased from 6 — busier map
  GAME_DURATION: 180,
  BASE_RADIUS: 9, MAX_RADIUS: 24,
  PLAYER_SPEED: 175, BOOST_SPEED: 320, NPC_BASE_SPEED: 130,
  BOOST_FUEL: 3.0, BOOST_RECHARGE: 0.35,  // fuel seconds, recharge per second
  COMBO_WINDOW: 4.0, MAX_COMBO_MULT: 5,
  DECAY_START: 55, DECAY_INTERVAL: 4.0,  // start shrinking at N segments
  POWERUP_INTERVAL: [18, 30],  // spawn every 18-30s
  POWERUP_MAX: 3,
  SPATIAL_CELL: 200,  // spatial hash cell size
  PARTICLE_POOL: 350,
  CAMERA_LERP: 5.5, CAMERA_ZOOM_MIN: 0.55, CAMERA_ZOOM_MAX: 1.4,
  // Dynamic difficulty: NPC speed scales with player performance
  NPC_MIN_SPEED: 110, NPC_MAX_SPEED: 250,
  // Golden food
  GOLDEN_FOOD_CHANCE: 0.04, GOLDEN_FOOD_MAX: 3, GOLDEN_FOOD_PTS: 50, GOLDEN_BOOST_DURATION: 2.5,
  // AI tuning (smarter, more active)
  AI_WALL_DIST: 160, AI_SIGHT_RANGE: 650, AI_TURN_BASE: 5.0, AI_RECALC_INTERVAL: 0.15,  // faster reaction
  // Body following (tighter values = smoother, more connected body)
  BODY_LERP_NEAR: 0.97, BODY_LERP_FAR: 0.90,  // increased from 0.95/0.82 for better continuity
  // Collision
  COLLISION_GRACE_RATIO: 0.18,
  // Movement
  PLAYER_TURN_RATE: 38,  // increased from 22 for snappier, more responsive turning

  // ---- Shrinking Circle (Battle Royale) ----
  SHRINK_START: 60,       // seconds remaining when shrink begins
  SHRINK_END: 10,         // seconds remaining when shrink is full (safe zone = 40% of world)

  // ---- Endless Mode ----
  ENDLESS_DIFFICULTY_INTERVAL: 60,  // seconds between difficulty bumps

  // ---- Step 1.6: Difficulty Presets ----
  DIFFICULTY_PRESETS: {
    easy: { name: '简单', label: '🟢 简单', npcCount: 6, npcSpeedRange: [90, 150], initialLength: 22, hunterRatio: 0.2, foodRateMult: 1.3 },
    normal: { name: '普通', label: '🔵 普通', npcCount: 10, npcSpeedRange: [120, 260], initialLength: 16, hunterRatio: 0.35, foodRateMult: 1.1 },
    hard: { name: '困难', label: '🟠 困难', npcCount: 13, npcSpeedRange: [170, 290], initialLength: 12, hunterRatio: 0.55, foodRateMult: 0.95 },
    insane: { name: '疯狂', label: '🔴 疯狂', npcCount: 16, npcSpeedRange: [210, 330], initialLength: 9, hunterRatio: 1.0, foodRateMult: 0.85, decayStart: 40 },
  },
};


// ======================== 11. GAME STATE ========================
let snakes = [], foods = [], mode = 'single', state = 'home';
let timer = CFG.GAME_DURATION, lastTime = 0, foodPulse = 0, frameCount = 0;
let camX = 0, camY = 0, camZoom = 1, targetZoom = 1;
let shakeX = 0, shakeY = 0, shakeDuration = 0, shakeIntensity = 0;
let killFeed = [];

// ---- Shrinking Circle State ----
let shrinkProgress = 0;            // 0 = no shrink, 1 = fully shrunk
let safeBounds = { minX: 0, maxX: CFG.WORLD_W, minY: 0, maxY: CFG.WORLD_H };  // current safe zone

// ---- Fixed Timestep System (Step 1.1) ----
const FIXED_DT = 1 / 60;        // 60 Hz physics update
let accumulator = 0;             // accumulated time for fixed timestep
let timeScale = 1.0;             // global time scale (for slow-mo effects)
let renderAlpha = 0;              // interpolation factor for rendering


// ======================== 12. HELPERS ========================
function worldX(x) { return (x - camX) * camZoom + canvas.width / 2; }
function worldY(y) { return (y - camY) * camZoom + canvas.height / 2; }

// ---- Slow-Mo Trigger (for kill replays, etc.) ----
function triggerSlowMo(intensity = 0.3, duration = 0.4) {
  // intensity: 0.3 = very slow, 0.6 = moderately slow
  // duration: how long before exponential decay starts
  timeScale = Math.max(0.05, intensity);
}
const darkenCache = new Map();
function darken(hex, amt) {
  const key = hex + '_' + amt;
  if (darkenCache.has(key)) return darkenCache.get(key);
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const result = `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`;
  darkenCache.set(key, result);
  return result;
}
function lighten(hex, amt) {
  // amt: 0-1 amount to lighten
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round((255 - parseInt(hex.slice(1, 3), 16)) * amt));
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round((255 - parseInt(hex.slice(3, 5), 16)) * amt));
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round((255 - parseInt(hex.slice(5, 7), 16)) * amt));
  return `rgb(${r},${g},${b})`;
}
function getPlayer() { return snakes.find(s => s.isPlayer && !s.isPlayer2 && s.alive); }
function getPlayer2() { return snakes.find(s => s.isPlayer2 && s.alive); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

