// ======================== 8. SNAKE ENTITY ========================
class Snake {
  constructor(x, y, skin, isPlayer, personality = null) {
    this.skin = skin;
    this.id = nextSnakeId++;
    this.isPlayer = isPlayer;
    this.isPlayer2 = false;
    this.alive = true;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.angle = Math.random() * Math.PI * 2;
    // NPCs are faster and more varied in speed (was: 130 + random*80 = 130-210, now: 140+random*100 = 140-240)
    this.speed = isPlayer ? CFG.PLAYER_SPEED : (CFG.NPC_BASE_SPEED + 20) + Math.random() * 100;
    this.boosting = false;
    this.boostFuel = CFG.BOOST_FUEL;
    this.radius = CFG.BASE_RADIUS;
    this.spacing = 7;
    this.kills = 0;
    this.foodEaten = 0;
    this.maxLength = 0;

    // ---- Speed Inertia System (Step 1.2) ----
    this.targetSpeed = this.speed;           // desired speed (changes instantly on boost toggle)
    this.currentSpeed = this.speed;          // actual speed (lerps toward targetSpeed)
    this.speedLerpRate = isPlayer ? 14 : 16;  // increased from 8/12 for snappier response

    // Power-up state
    this.powerups = {};  // { id: remaining_seconds }
    this.shieldActive = false;

    // AI
    this.personality = personality; // 'hunter' | 'scavenger' | 'survivor' | null
    this.aiTarget = null;
    this.aiTimer = 0;
    this.aiTargetAngle = this.angle;

    // ---- AI Dynamic State (Phase 4) ----
    this._activePersona = personality;  // current effective personality
    this._consecutiveEats = 0;
    this._recentKill = false;
    this._nearDeath = false;
    this._isTop3 = false;
    this._recentKillTimer = 0;
    this._nearDeathTimer = 0;

    // ---- Named NPC (Phase 1C) ----
    this.npcName = isPlayer ? null : getRandomNPCName();

    // Segments
    const n = isPlayer ? 15 : 10 + Math.floor(Math.random() * 10);
    this.segs = [];
    for (let i = 0; i < n; i++) this.segs.push({ x: x - i * 7 * Math.cos(this.angle), y: y - i * 7 * Math.sin(this.angle) });
    this._segPool = [];  // recycled segment array for moveSnake double-buffering
  }

  get head() { return this.segs[0]; }
  get length() { return this.segs.length; }

  updateRadius() {
    this.radius = Math.min(CFG.MAX_RADIUS, CFG.BASE_RADIUS + this.segs.length * 0.04);
    // Cap spacing to prevent "scattered balls" look at large sizes
    // Keep spacing between 5-7px range for dense, smooth body appearance
    this.spacing = clamp(this.radius * 0.32, 5, 7);  // was: Math.max(4.5, radius * 0.42) → grew too large
  }

  hasPowerUp(id) { return (this.powerups[id] || 0) > 0; }

  updatePowerUps(dt) {
    for (const k of Object.keys(this.powerups)) {
      this.powerups[k] -= dt;
      if (this.powerups[k] <= 0) delete this.powerups[k];
    }
  }

  getEffectiveSpeed() {
    // Use currentSpeed (inertia-smoothed) for players, base speed for NPCs
    let spd = this.isPlayer ? this.currentSpeed : this.speed;
    if (this.hasPowerUp('speed')) spd *= 2;
    // Speed Frenzy event
    if (window._eventSpeedFrenzy) spd *= 1.5;
    // Risk food slow debuff
    if (this._riskSlowTimer > 0) spd *= 0.5;
    return spd;
  }

  // ---- Speed Inertia Update (Step 1.2) ----
  updateSpeedInertia(dt) {
    if (!this.isPlayer) return;  // NPCs don't use inertia
    // Set target speed based on boost state
    const baseTarget = (this.boosting && this.boostFuel > 0) ? CFG.BOOST_SPEED : CFG.PLAYER_SPEED;
    this.targetSpeed = baseTarget;

    // Lerp currentSpeed toward targetSpeed (exponential smoothing)
    // Acceleration: ~0.15s to reach boost speed from normal
    // Deceleration: ~0.25s to slow down after releasing boost
    const lerpFactor = 1 - Math.exp(-this.speedLerpRate * dt);
    this.currentSpeed += (this.targetSpeed - this.currentSpeed) * lerpFactor;
  }

  // Boost fuel management (players only)
  updateBoost(dt) {
    if (this.boosting && this.boostFuel > 0) {
      this.boostFuel = Math.max(0, this.boostFuel - dt);
    } else if (!this.boosting && this.boostFuel < CFG.BOOST_FUEL) {
      this.boostFuel = Math.min(CFG.BOOST_FUEL, this.boostFuel + dt * CFG.BOOST_RECHARGE);
    }
  }
}