// ======================== 7. POWER-UP SYSTEM ========================
const POWERUP_TYPES = [
  { id: 'speed', icon: '⚡', name: '加速', color: '#ffc400', duration: 5, desc: '速度翻倍' },
  { id: 'shield', icon: '🛡️', name: '护盾', color: '#40c4ff', duration: 8, desc: '免疫一次碰撞' },
  { id: 'magnet', icon: '🧲', name: '磁铁', color: '#ff80ab', duration: 6, desc: '自动吸引食物' },
  { id: 'ghost', icon: '👻', name: '幽灵', color: '#b388ff', duration: 5, desc: '穿过其他蛇' },
];

class PowerUp {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    this.r = 16; this.pulse = Math.random() * Math.PI * 2;
    this.alive = true;
  }
  update(dt) { this.pulse += dt * 3; }
}

let powerups = [];
let powerupTimer = CFG.POWERUP_INTERVAL[0] + Math.random() * (CFG.POWERUP_INTERVAL[1] - CFG.POWERUP_INTERVAL[0]);

function spawnPowerUp() {
  if (powerups.length >= CFG.POWERUP_MAX) return;
  const m = 80;
  const x = m + Math.random() * (CFG.WORLD_W - m * 2);
  const y = m + Math.random() * (CFG.WORLD_H - m * 2);
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  powerups.push(new PowerUp(x, y, type));
}


// ======================== 18. POWER-UP COLLECTION ========================
function checkPowerUps() {
  for (const s of snakes) {
    if (!s.alive || !s.isPlayer) continue;
    const head = s.head;
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      const dx = head.x - pu.x, dy = head.y - pu.y;
      if (dx * dx + dy * dy < (s.radius + pu.r) * (s.radius + pu.r)) {
        // Apply power-up
        s.powerups[pu.type.id] = pu.type.duration;
        if (pu.type.id === 'shield') s.shieldActive = true;
        SFX.powerup();
        if (settings.particles) {
          particles.burst(pu.x, pu.y, 20, 100, 0.5, pu.type.color, [2, 5], 0);
        }
        powerups.splice(i, 1);
      }
    }
  }
}
