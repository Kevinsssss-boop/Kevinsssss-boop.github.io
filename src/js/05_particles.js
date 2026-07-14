// ======================== 6. PARTICLE SYSTEM ========================
class Particle {
  constructor() { this.reset(); }
  reset() { this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.life = 0; this.maxLife = 0; this.color = '#fff'; this.size = 3; this.gravity = 0; this.dead = true; }
  init(x, y, vx, vy, life, color, size, gravity = 0) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = life; this.maxLife = life;
    this.color = color; this.size = size; this.gravity = gravity; this.dead = false;
  }
  update(dt) {
    if (this.dead) return;
    this.life -= dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    if (this.life <= 0) this.dead = true;
  }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
  get r() { return this.size * (0.2 + 0.8 * this.alpha); }
}

class ParticleSystem {
  constructor(poolSize) {
    this.pool = [];
    for (let i = 0; i < poolSize; i++) this.pool.push(new Particle());
    this.nextFree = 0;
  }
  spawn(x, y, vx, vy, life, color, size, gravity = 0) {
    const start = this.nextFree;
    for (let i = 0; i < this.pool.length; i++) {
      const idx = (start + i) % this.pool.length;
      if (this.pool[idx].dead) {
        this.pool[idx].init(x, y, vx, vy, life, color, size, gravity);
        this.nextFree = (idx + 1) % this.pool.length;
        return this.pool[idx];
      }
    }
    return null; // pool exhausted
  }
  burst(x, y, count, speed, life, color, sizeRange, gravity = 0) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.3 + Math.random() * 0.7);
      const sz = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      this.spawn(x, y, Math.cos(a) * spd, Math.sin(a) * spd, life * (0.5 + Math.random() * 0.5), color, sz, gravity);
    }
  }
  update(dt) { for (const p of this.pool) p.update(dt); }
  get alive() { return this.pool.filter(p => !p.dead); }
}
const particles = new ParticleSystem(CFG.PARTICLE_POOL);
