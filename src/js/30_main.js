// ======================== 14. GAME INIT ========================
function selectMode(m) {
  mode = m;
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-mode="${m}"]`).classList.add('selected');
  // Hide difficulty for endless/hunter modes (they have their own scaling)
  const diffRow = document.getElementById('difficulty-row');
  if (diffRow) diffRow.style.display = (m === 'endless' || m === 'hunter') ? 'none' : '';
}

// ---- Step 1.6: Difficulty Selection ----
let currentDifficulty = settings.difficulty || 'normal';

function buildDifficultyButtons() {
  const container = document.getElementById('difficulty-row');
  if (!container) return;
  container.innerHTML = '';
  for (const [key, preset] of Object.entries(CFG.DIFFICULTY_PRESETS)) {
    const btn = document.createElement('button');
    btn.className = 'btn small' + (key === currentDifficulty ? ' primary' : '');
    btn.textContent = preset.label;
    btn.dataset.difficulty = key;
    btn.onclick = () => selectDifficulty(key);
    container.appendChild(btn);
  }
}

function selectDifficulty(key) {
  currentDifficulty = key;
  settings.difficulty = key;
  saveSetting('difficulty', key);
  // Update button styles
  const container = document.getElementById('difficulty-row');
  if (container) {
    container.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('primary', btn.dataset.difficulty === key);
      btn.classList.toggle('small', btn.dataset.difficulty !== key);
    });
  }
}

// Apply difficulty preset to override CFG defaults
function applyDifficultyPreset() {
  const preset = CFG.DIFFICULTY_PRESETS[currentDifficulty];
  if (!preset) return;

  // Override key parameters
  CFG.NPC_COUNT = preset.npcCount;
  CFG.NPC_MIN_SPEED = preset.npcSpeedRange[0];
  CFG.NPC_MAX_SPEED = preset.npcSpeedRange[1];
  // Initial player length is handled in Snake constructor via the initialLength parameter
  // We pass it through a global so initGame can use it
  window._diffInitialLength = preset.initialLength;
  window._diffHunterRatio = preset.hunterRatio;
  window._diffFoodRateMult = preset.foodRateMult || 1.0;
  if (preset.decayStart) CFG.DECAY_START = preset.decayStart;
}


function startGame() {
  initAudio();

  // Fade out home panel with transition
  const homePanel = document.getElementById('home');
  const startAfterFade = () => {
    ['home', 'skin-panel', 'settings-panel', 'game-over-panel'].forEach(id => hidePanel(id));
    homePanel.classList.remove('fading');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('hud-fuel').classList.remove('hidden');
    document.getElementById('hud-powerup').classList.add('hidden');
    document.getElementById('btn-pause').classList.remove('hidden');
    document.getElementById('kill-feed').innerHTML = '';
    initGame();
  };

  // Reset HUD cache
  hudCache = { score: -1, time: '', rank: '', combo: '', fuel: -1, fuelColor: '', powerup: '' };
  hudThrottle = 0;

  if (homePanel && !homePanel.classList.contains('hidden')) {
    homePanel.classList.add('fading');
    setTimeout(startAfterFade, 350);
  } else {
    startAfterFade();
  }
}

function initGame() {
  // Step 1.6: Apply difficulty preset before creating entities
  applyDifficultyPreset();

  // Reset state
  snakes = []; foods = []; powerups = []; killFeed = [];
  timer = (mode === 'endless' || mode === 'hunter') ? 0 : CFG.GAME_DURATION;
  state = 'playing';
  powerupTimer = CFG.POWERUP_INTERVAL[0] + Math.random() * (CFG.POWERUP_INTERVAL[1] - CFG.POWERUP_INTERVAL[0]);
  shakeDuration = 0; shakeIntensity = 0; shakeX = 0; shakeY = 0;

  // Reset shrink + safe bounds
  shrinkProgress = 0;
  safeBounds = { minX: 0, maxX: CFG.WORLD_W, minY: 0, maxY: CFG.WORLD_H };

  // Reset events
  initEvents();
  window._eventSpeedFrenzy = false;
  window._eventDoomMargin = 0;
  window._revealedPlayers = {};

  const cx = CFG.WORLD_W / 2, cy = CFG.WORLD_H / 2;

  // Player 1
  const p1InitialLen = (mode === 'hunter') ? 200 : (window._diffInitialLength || 15);
  const p1 = new Snake(cx - 200, cy, playerSkin, true);
  if (p1InitialLen !== 15) {
    while (p1.segs.length > p1InitialLen) p1.segs.pop();
    while (p1.segs.length < p1InitialLen) p1.segs.push({ ...p1.segs[p1.segs.length - 1] });
  }
  // Hunter mode: permanent 1.5x speed
  if (mode === 'hunter') {
    p1.speed = CFG.PLAYER_SPEED * 1.5;
    p1.currentSpeed = p1.speed;
    p1.targetSpeed = p1.speed;
    // Huge boost fuel for hunter mode
    p1.boostFuel = CFG.BOOST_FUEL * 3;
  }
  snakes.push(p1);

  // Player 2 (local)
  if (mode === 'local') {
    const p2skin = SKINS[Math.floor(Math.random() * SKINS.length)];
    const p2 = new Snake(cx + 200, cy, p2skin, true);
    p2.isPlayer2 = true; p2.isPlayer = true;
    snakes.push(p2);
  }

  // NPCs
  const hunterRatio = window._diffHunterRatio || 0.33;
  const npcSkins = SKINS.filter(s => !s.locked || s.id === playerSkin.id);
  const npcCount = mode === 'hunter' ? 8 : CFG.NPC_COUNT;
  for (let i = 0; i < npcCount; i++) {
    const sk = npcSkins[Math.floor(Math.random() * npcSkins.length)] || SKINS[0];
    let persona;
    if (mode === 'hunter') {
      persona = 'survivor';  // all NPCs flee in hunter mode
    } else if (Math.random() < hunterRatio) {
      persona = 'hunter';
    } else {
      const others = ['scavenger', 'survivor', null];
      persona = others[Math.floor(Math.random() * others.length)];
    }
    const sx = 150 + Math.random() * (CFG.WORLD_W - 300);
    const sy = 150 + Math.random() * (CFG.WORLD_H - 300);
    snakes.push(new Snake(sx, sy, sk, false, persona));
  }

  // Initial food
  spawnInitialFoods();

  // Center camera
  const playerHead = p1.head;
  camX = playerHead.x; camY = playerHead.y;
  camZoom = 1; targetZoom = 1;
  lastTime = performance.now(); frameCount = 0;
  bgCache = null;

  updateHUD(0.1);
  if (isMobile()) { document.body.classList.add('mobile'); }
}


function backToHome() {
  state = 'home';
  ['hud', 'hud-fuel', 'hud-powerup', 'btn-pause'].forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById('kill-feed').innerHTML = '';
  showPanel('home');
  hidePanel('game-over-panel');
}

function togglePause() {
  initAudio();
  if (state === 'playing') {
    state = 'paused';
    document.getElementById('btn-pause').innerHTML = '▶ 继续<span class="key">P</span>';
  } else if (state === 'paused') {
    state = 'playing';
    document.getElementById('btn-pause').innerHTML = '⏸ 暂停<span class="key">P</span>';
  }
}


// ======================== 23. INIT ========================
function init() {
  // Load achievements and stats
  loadAchievements();

  // Refresh skin unlocks based on achievements
  refreshSkinUnlocks();

  // Build skin grid (now safe — all modules loaded)
  buildSkinGrid();

  // Restore settings toggles
  document.getElementById('tgl-sfx').classList.toggle('on', settings.sfx);
  document.getElementById('tgl-particles').classList.toggle('on', settings.particles);
  document.getElementById('tgl-shake').classList.toggle('on', settings.shake);

  // Step 1.8: Initialize display toggle states
  if (!('minimap' in settings)) settings.minimap = true;
  if (!'killfeed' in settings) settings.killfeed = true;
  if (!'combopop' in settings) settings.combopop = true;

  const tglMinimap = document.getElementById('tgl-minimap');
  const tglKillfeed = document.getElementById('tgl-killfeed');
  const tglCombopop = document.getElementById('tgl-combopop');
  if (tglMinimap) tglMinimap.classList.toggle('on', settings.minimap);
  if (tglKillfeed) tglKillfeed.classList.toggle('on', settings.killfeed);
  if (tglCombopop) tglCombopop.classList.toggle('on', settings.combopop);

  // Step 1.8: Set control mode select value
  const selControl = document.getElementById('sel-controlMode');
  if (selControl) selControl.value = settings.controlMode || 'mouse';

  // Step 1.6: Build difficulty selection buttons
  buildDifficultyButtons();

  // Show home
  showPanel('home');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('hud-fuel').classList.add('hidden');
  document.getElementById('btn-pause').classList.add('hidden');

  // Mobile: show virtual controls
  if (isMobile()) {
    document.getElementById('vjoy-zone').style.display = 'block';
    document.getElementById('boost-btn').style.display = 'flex';
  }

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ---- Achievement Panel ----
function showAchievementPanel() {
  buildAchievementGrid();
  showPanel('achievements-panel');
}
function hideAchievementPanel() {
  hidePanel('achievements-panel');
}