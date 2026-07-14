// ======================== NAMED NPC SYSTEM ========================
const NPC_NAMES = [
  '闪电','胖虎','幽灵','疾风','巨无霸','暗影','小灵通','毒牙',
  '铁头','幻影','暴风','赤练','青蛇','白蛇','黑曜','紫电',
  '银月','金环','碧磷','霜刃','炎尾','冰牙','雷蛇','飓风',
  '碎星','裂空','追魂','噬月','残影','玄冥',
];
const NPC_KILL_KEY = STORAGE_KEY + '_npc';

function getRandomNPCName() {
  return NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
}

function loadNPCKillMemory() {
  try { return JSON.parse(localStorage.getItem(NPC_KILL_KEY)) || {}; } catch (_) { return {}; }
}

function saveNPCKillMemory(npcName) {
  const mem = loadNPCKillMemory();
  mem[npcName] = (mem[npcName] || 0) + 1;
  try { localStorage.setItem(NPC_KILL_KEY, JSON.stringify(mem)); } catch (_) {}
}

// Check if player has been killed by this NPC before
function getNPCRevengeCount(npcName) {
  const mem = loadNPCKillMemory();
  return mem[npcName] || 0;
}
