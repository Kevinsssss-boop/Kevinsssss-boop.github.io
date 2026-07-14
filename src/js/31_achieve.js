// ======================== ACHIEVEMENT SYSTEM ========================
const ACHIEVEMENTS = [
  { id: 'first_game', name: '新手蛇', desc: '完成第一局游戏', icon: '🔰',
    check(p, stats) { return stats.gamesPlayed >= 1; } },
  { id: 'first_kill', name: '首杀', desc: '击杀一条蛇', icon: '💀',
    check(p, stats) { return stats.totalKills >= 1; } },
  { id: 'combo_master', name: '连击大师', desc: '达成 8x Combo', icon: '🔥',
    check(p) { return p && p.combo >= 8; } },
  { id: 'king', name: '王者', desc: '单局排名第一', icon: '👑',
    check(p, stats) { return stats.rankFirst >= 1; } },
  { id: 'giant_slayer', name: '巨人杀手', desc: '击杀体型 > 你 2x 的蛇', icon: '🗡️',
    check(p, stats) { return stats.giantKills >= 1; } },
  { id: 'speed_demon', name: '极速', desc: 'Boost 状态下击杀', icon: '⚡',
    check(p, stats) { return stats.boostKills >= 1; } },
  { id: 'shield_save', name: '坚不可摧', desc: '用护盾挡住致命碰撞', icon: '🛡️',
    check(p, stats) { return stats.shieldSaves >= 1; } },
  { id: 'rampage', name: '无双', desc: '一局击杀 5 条蛇', icon: '🌊',
    check(p) { return p && p.kills >= 5; } },
  { id: 'century', name: '百分', desc: '单局得分 > 2000', icon: '💯',
    check(p) { return p && p.score >= 2000; } },
  { id: 'marathon', name: '马拉松', desc: '一局存活满 180 秒', icon: '⏱️',
    check(p) { return p && p._surviveTime >= 180; } },
  { id: 'glutton', name: '大胃王', desc: '累计吃 500 个食物', icon: '🍽️',
    check(p, stats) { return stats.totalFood >= 500; } },
  { id: 'bounty_hunter', name: '赏金猎人', desc: '击杀悬赏蛇', icon: '🎯',
    check(p, stats) { return stats.bountyKills >= 1; } },
];

// Persistent achievement & stats storage
const ACH_STORAGE_KEY = STORAGE_KEY + '_ach';
let unlockedAchievements = {};  // { achId: unlockTimestamp }
let playerStats = {             // cumulative across all games
  gamesPlayed: 0, totalKills: 0, totalFood: 0, totalScore: 0,
  rankFirst: 0, giantKills: 0, boostKills: 0, shieldSaves: 0, bountyKills: 0,
  bestScore: 0, bestKills: 0, bestLength: 0, bestTime: 0,
};

function loadAchievements() {
  try {
    const d = JSON.parse(localStorage.getItem(ACH_STORAGE_KEY));
    if (d) {
      unlockedAchievements = d.achievements || {};
      playerStats = Object.assign(playerStats, d.stats || {});
    }
  } catch (_) {}
}

function saveAchievement(id) {
  if (unlockedAchievements[id]) return false; // already unlocked
  unlockedAchievements[id] = Date.now();
  _persistAchievements();
  return true;
}

function _persistAchievements() {
  try {
    localStorage.setItem(ACH_STORAGE_KEY, JSON.stringify({
      achievements: unlockedAchievements,
      stats: playerStats,
    }));
  } catch (_) {}
}

function updatePlayerStats(delta) {
  for (const k of Object.keys(delta)) {
    if (k in playerStats) playerStats[k] += delta[k];
  }
  // Update bests
  if (delta.bestScore && delta.bestScore > playerStats.bestScore) playerStats.bestScore = delta.bestScore;
  if (delta.bestKills && delta.bestKills > playerStats.bestKills) playerStats.bestKills = delta.bestKills;
  if (delta.bestLength && delta.bestLength > playerStats.bestLength) playerStats.bestLength = delta.bestLength;
  if (delta.bestTime && delta.bestTime > playerStats.bestTime) playerStats.bestTime = delta.bestTime;
  _persistAchievements();
}

function checkAchievements(player) {
  if (!player) return;
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (unlockedAchievements[ach.id]) continue;
    if (ach.check(player, playerStats)) {
      if (saveAchievement(ach.id)) newlyUnlocked.push(ach);
    }
  }
  for (const ach of newlyUnlocked) {
    showAchievementPopup(ach);
  }
}

// ---- Achievement unlock popup ----
function showAchievementPopup(ach) {
  const el = document.createElement('div');
  el.className = 'ach-popup';
  el.innerHTML = `<span class="ach-icon">${ach.icon}</span><div><strong>${ach.name}</strong><br><small>${ach.desc}</small></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2800);
}

// ---- Build achievement grid ----
function buildAchievementGrid() {
  const grid = document.getElementById('ach-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const ach of ACHIEVEMENTS) {
    const unlocked = !!unlockedAchievements[ach.id];
    const div = document.createElement('div');
    div.className = 'ach-card' + (unlocked ? ' unlocked' : '');
    div.innerHTML = `<span class="ach-card-icon">${unlocked ? ach.icon : '🔒'}</span>
      <span class="ach-card-name">${ach.name}</span>
      <span class="ach-card-desc">${ach.desc}</span>`;
    grid.appendChild(div);
  }

  // Stats summary below achievements
  const statsEl = document.getElementById('ach-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-item">🎮 ${playerStats.gamesPlayed} 局</div>
      <div class="stat-item">💀 ${playerStats.totalKills} 杀</div>
      <div class="stat-item">🍽️ ${playerStats.totalFood} 食物</div>
      <div class="stat-item">⭐ ${playerStats.bestScore} 最高分</div>
      <div class="stat-item">📏 ${playerStats.bestLength} 最长</div>
      <div class="stat-item">⏱️ ${playerStats.bestTime}s 存活</div>`;
  }
}
