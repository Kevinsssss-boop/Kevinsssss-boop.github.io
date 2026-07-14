// ======================== 3. STORAGE ========================
const STORAGE_KEY = 'snake_ultimate';
function loadSetting(k, def) { try { const v = JSON.parse(localStorage.getItem(STORAGE_KEY)); return v && v[k] !== undefined ? v[k] : def; } catch (_) { return def; } }
function saveSetting(k, v) { try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; d[k] = v; localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (_) {} }
function loadLB() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY + '_lb')) || []; } catch (_) { return []; } }
function saveLB(entry) { const lb = loadLB(); lb.push(entry); lb.sort((a, b) => b.score - a.score); localStorage.setItem(STORAGE_KEY + '_lb', JSON.stringify(lb.slice(0, 20))); }

let settings = {
  sfx: loadSetting('sfx', true),
  particles: loadSetting('particles', true),
  shake: loadSetting('shake', true),
  controlMode: loadSetting('controlMode', 'mouse'),  // Step 1.3: 'mouse' or 'keyboard'
  difficulty: loadSetting('difficulty', 'normal'),       // Step 1.6: 'easy' | 'normal' | 'hard' | 'insane'
};
function toggleSetting(k) {
  settings[k] = !settings[k]; saveSetting(k, settings[k]);
  const el = document.getElementById('tgl-' + k);
  if (el) el.classList.toggle('on', settings[k]);

  // Step 1.8: Apply display toggles immediately
  if (k === 'minimap') {
    const mm = document.getElementById('minimap');
    if (mm) mm.style.display = settings.minimap ? '' : 'none';
  }
  if (k === 'killfeed') {
    const kf = document.getElementById('kill-feed');
    if (kf) kf.style.display = settings.killfeed ? '' : 'none';
  }
}

// ---- Step 1.8: Control Mode Setting ----
function setControlMode(mode) {
  settings.controlMode = mode;
  saveSetting('controlMode', mode);
}

// ---- Step 1.8: Reset Data Confirmation ----
function confirmResetData() {
  if (confirm('确定要清除所有数据吗？\n（包括排行榜、设置、成就等）')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + '_lb');
    localStorage.removeItem(STORAGE_KEY + '_ach');
    localStorage.removeItem(STORAGE_KEY + '_npc');
    localStorage.removeItem(STORAGE_KEY + '_skins');
    location.reload();
  }
}