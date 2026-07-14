// ======================== 13. UI HELPERS ========================
function showPanel(id) { document.getElementById(id).classList.remove('hidden'); }
function hidePanel(id) { document.getElementById(id).classList.add('hidden'); }

function addKillMsg(killerName, victimName, killerSkin) {
  killFeed.unshift({ text: `${killerName} 💀 ${victimName}`, color: killerSkin ? killerSkin.glow : '#fff', life: 5 });
  if (killFeed.length > 6) killFeed.pop();
  const feed = document.getElementById('kill-feed');
  feed.innerHTML = killFeed.map(m => `<div class="kill-msg" style="color:${m.color}">${m.text}</div>`).join('');
}

function showComboPopup(n) {
  if (n < 3) return;
  const el = document.createElement('div');
  el.className = 'combo-pop';
  el.textContent = `🔥 ${n}x COMBO!`;
  el.style.left = (30 + Math.random() * 40) + '%';
  el.style.top = (25 + Math.random() * 20) + '%';
  el.style.color = n >= 5 ? '#ff5252' : '#ffd740';
  el.style.fontSize = (16 + n * 3) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);

  // Step 1.4: Border flash on combo level-up milestones
  const comboLevel = Math.floor(n / 3);  // level 1 at 3, level 2 at 6, etc.
  if (n > 0 && n % 3 === 0 && comboLevel <= 5) {
    showBorderFlash();
  }
}

// ---- Step 1.4: Score Popup at world position ----
function showScorePopup(wx, wy, score, color) {
  const sx = worldX(wx), sy = worldY(wy);
  const el = document.createElement('div');
  el.className = 'score-popup';
  el.textContent = '+' + score;
  el.style.color = color || '#fff';
  el.style.left = sx + 'px';
  el.style.top = sy + 'px';
  // Slight random horizontal offset so overlapping popups are visible
  el.style.marginLeft = ((Math.random() - 0.5) * 20) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// ---- Step 1.4: Combo Level-Up Border Flash ----
let lastBorderFlashTime = 0;
function showBorderFlash() {
  const now = performance.now();
  if (now - lastBorderFlashTime < 1000) return;  // throttle to once per second
  lastBorderFlashTime = now;

  const flash = document.createElement('div');
  flash.className = 'border-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 500);
}

// ---- Step 1.5: Damage Indicators ----
let dangerVignetteEl = null;
let dangerVignetteTimer = 0;

function showDangerVignette(intensity = 0.45) {
  if (!dangerVignetteEl) {
    dangerVignetteEl = document.createElement('div');
    dangerVignetteEl.className = 'danger-vignette';
    dangerVignetteEl.style.opacity = '0';
    document.body.appendChild(dangerVignetteEl);
  }
  dangerVignetteEl.style.opacity = String(intensity);
  dangerVignetteTimer = 0.5;  // visible for 0.5s after last danger update
}

function updateDangerVignette(dt) {
  if (dangerVignetteEl && dangerVignetteTimer > 0) {
    dangerVignetteTimer -= dt;
    if (dangerVignetteTimer <= 0) {
      dangerVignetteEl.style.opacity = '0';
    }
  }
}

function showShieldBreakFlash() {
  const flash = document.createElement('div');
  flash.className = 'shield-break-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 250);
}

// Step 1.5: Shield break sound (metallic ding)
SFX.shieldBreak = function() { playBeep(2400, 0.08, 'sine', 0.04); playBeep(1800, 0.06, 'triangle', 0.03); };

// Step 1.5: Kill score popup at world position
function showKillScorePopup(wx, wy, score) {
  const sx = worldX(wx), sy = worldY(wy);
  const el = document.createElement('div');
  el.className = 'score-popup';
  el.textContent = '+' + score;
  el.style.color = '#ffd740';
  el.style.fontSize = '20px';
  el.style.left = sx + 'px';
  el.style.top = sy + 'px';
  el.style.textShadow = '0 0 12px rgba(255,215,64,0.8), 0 2px 4px rgba(0,0,0,0.7)';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// ---- Step 1.7: In-Game Hint System ----
const shownHints = new Set();
let hintQueue = [];  // show one at a time

const HINT_DEFS = [
  { id: 'hint_boost', text: '💡 按住空格键加速！燃料有限哦~', check: (p) => p && p.boosting },
  { id: 'hint_combo', text: '🔥 连续吃食物可以获得 Combo 加成！', check: (p) => p && p.combo >= 3 },
  { id: 'hint_powerup', text: '✨ 拾取道具获得特殊能力！护盾可以免疫一次碰撞', check: (p) => p && Object.keys(p.powerups).length > 0 },
  { id: 'hint_decay', text: '⚠️ 你已经很大了！注意不吃食物会慢慢变小...', check: (p) => p && p.segs.length > CFG.DECAY_START + 5 },
  { id: 'hint_rank', text: '🏆 小心！周围有很多比你大的蛇...', check: (p) => {
    if (!p) return false;
    let biggerCount = 0;
    for (const s of snakes) { if (s !== p && s.alive && s.segs.length > p.segs.length * 1.2) biggerCount++; }
    return biggerCount >= 3;
  }},
];

function showHint(text) {
  if (hintQueue.length > 0) return;  // already showing one
  const el = document.createElement('div');
  el.className = 'hint-toast';
  el.textContent = text;
  document.body.appendChild(el);
  hintQueue.push(el);
  setTimeout(() => {
    el.remove();
    hintQueue = hintQueue.filter(h => h !== el);
  }, 3100);
}

function checkHints(player) {
  if (!player || !player.alive) return;
  for (const hint of HINT_DEFS) {
    if (shownHints.has(hint.id)) continue;  // already shown
    if (hint.check(player)) {
      shownHints.add(hint.id);
      showHint(hint.text);
      break;  // only show one hint at a time
    }
  }
}

function triggerShake(intensity, duration) {
  if (!settings.shake) return;
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeDuration = Math.max(shakeDuration, duration);
}
