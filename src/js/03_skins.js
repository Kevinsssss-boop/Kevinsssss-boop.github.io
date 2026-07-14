// ======================== 4. SKINS ========================
const SKINS = [
  { id: 'green', name: '翠绿', style: 'classic', body: '#00E676', head: '#00c853', dark: '#1B5E20', glow: '#69f0ae', locked: false },
  { id: 'blue', name: '海洋', style: 'classic', body: '#448aff', head: '#2979ff', dark: '#0d47a1', glow: '#82b1ff', locked: false },
  { id: 'pink', name: '粉红', style: 'classic', body: '#ff80ab', head: '#f06292', dark: '#880e4f', glow: '#ff80ab', locked: false },
  { id: 'gold', name: '金色', style: 'classic', body: '#ffd740', head: '#ffc400', dark: '#e6a000', glow: '#ffe57f', locked: false },
  { id: 'purple', name: '紫韵', style: 'classic', body: '#b388ff', head: '#7c4dff', dark: '#4a148c', glow: '#b388ff', locked: false },

  // === Locked skins (unlock via achievements) ===
  { id: 'red', name: '赤焰', style: 'classic', body: '#ff5252', head: '#ff1744', dark: '#b71c1c', glow: '#ff8a80',
    locked: true, unlockAch: 'first_kill' },
  { id: 'cyan', name: '冰霜', style: 'classic', body: '#18ffff', head: '#00e5ff', dark: '#006064', glow: '#84ffff',
    locked: true, unlockAch: 'first_game' },
  { id: 'orange', name: '甜橙', style: 'classic', body: '#ff9100', head: '#ff6d00', dark: '#bf360c', glow: '#ffab40',
    locked: true, unlockAch: 'king' },

  // === New visual-style skins ===
  { id: 'neon', name: '霓虹', style: 'neon', body: '#00ffff', head: '#e0ffff', dark: '#006666', glow: '#00ffff',
    effect: { glowIntensity: 20, particleTrail: true, shimmer: true }, locked: true, unlockAch: 'giant_slayer' },
  { id: 'pixel', name: '像素', style: 'pixel', body: '#00E676', head: '#00c853', dark: '#1B5E20', glow: '#69f0ae',
    locked: true, unlockAch: 'glutton' },
  { id: 'metallic', name: '铬银', style: 'metallic', body: '#c0c0c0', head: '#e8e8e8', dark: '#505050', glow: '#ffffff',
    locked: true, unlockAch: 'shield_save' },
  { id: 'dragon', name: '金龙', style: 'dragon', body: '#ffd700', head: '#ffe566', dark: '#b8860b', glow: '#fff8dc',
    accessory: 'horns', eyeStyle: 'slit', pattern: { type: 'scales' }, locked: true, unlockAch: 'rampage' },
  { id: 'galaxy', name: '星河', style: 'galaxy', body: '#4a0080', head: '#7b2cbf', dark: '#1a0033', glow: '#c77dff',
    effect: { shimmer: true }, locked: true, unlockAch: 'century' },
  { id: 'candy', name: '糖果', style: 'cartoon', body: '#ff69b4', head: '#ffb6c1', dark: '#c71585', glow: '#ffc0cb',
    eyeStyle: 'cute', locked: true, unlockAch: 'speed_demon' },
  { id: 'lava', name: '熔岩', style: 'lava', body: '#ff4500', head: '#ff8c00', dark: '#8b0000', glow: '#ffcc00',
    effect: { glowIntensity: 15, shimmer: true }, locked: true, unlockAch: 'combo_master' },
  { id: 'ice', name: '冰晶', style: 'ice', body: '#87ceeb', head: '#e0ffff', dark: '#4682b4', glow: '#ffffff',
    effect: { glowIntensity: 10 }, locked: true, unlockAch: 'marathon' },
];

const SKIN_STORAGE_KEY = STORAGE_KEY + '_skins';
function loadUnlockedSkins() {
  try { return JSON.parse(localStorage.getItem(SKIN_STORAGE_KEY)) || []; } catch (_) { return []; }
}
function saveUnlockedSkin(skinId) {
  const ul = loadUnlockedSkins();
  if (!ul.includes(skinId)) { ul.push(skinId); localStorage.setItem(SKIN_STORAGE_KEY, JSON.stringify(ul)); }
}

// Apply unlocked skins based on achievements
function refreshSkinUnlocks() {
  const ul = loadUnlockedSkins();
  for (const skin of SKINS) {
    if (skin.locked && skin.unlockAch && unlockedAchievements[skin.unlockAch]) {
      skin.locked = false;
      if (!ul.includes(skin.id)) saveUnlockedSkin(skin.id);
    }
    if (skin.locked && skin.unlockAch && ul.includes(skin.id)) {
      skin.locked = false;
    }
  }
}

let playerSkin = (() => {
  const savedId = loadSetting('skin', 'green');
  const saved = SKINS.find(s => s.id === savedId);
  if (saved && !saved.locked) return saved;
  // Fallback: first unlocked skin (green should always be unlocked)
  return SKINS.find(s => !s.locked) || SKINS[0];
})();
