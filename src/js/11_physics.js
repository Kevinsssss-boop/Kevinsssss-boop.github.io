// ======================== 15. PHYSICS / MOVEMENT ========================
// --- Object pool for segment positions (avoids ~900 allocations/sec) ---
const _posPool = [];
function _allocPos(x, y) {
  const p = _posPool.pop();
  if (p) { p.x = x; p.y = y; return p; }
  return { x: x, y: y };
}
function _freePosArr(arr) {
  for (let i = 0; i < arr.length; i++) _posPool.push(arr[i]);
}

function moveSnake(s, dt, controlAngle) {
  if (!s.alive) return;
  const head = s.head;

  // Turning
  if (controlAngle !== null) {
    let ad = controlAngle - s.angle;
    while (ad > Math.PI) ad -= Math.PI * 2;
    while (ad < -Math.PI) ad += Math.PI * 2;
    const effSpeed = s.getEffectiveSpeed();
    // Step 1.2: Boost slightly reduces turn rate (less penalty than before for better control)
    const boostTurnPenalty = s.boosting && s.boostFuel > 0 ? 0.92 : 1.0;  // was 0.8, too heavy
    const turnRate = CFG.PLAYER_TURN_RATE * (effSpeed / CFG.PLAYER_SPEED) * dt * boostTurnPenalty;
    if (Math.abs(ad) < turnRate) s.angle = controlAngle;
    else s.angle += Math.sign(ad) * turnRate;
  }

  const spd = s.getEffectiveSpeed();
  const nx = head.x + Math.cos(s.angle) * spd * dt;
  const ny = head.y + Math.sin(s.angle) * spd * dt;

  // Wall / Shrink zone collision → death
  const doomMargin = window._eventDoomMargin || 0;
  if (nx < safeBounds.minX + doomMargin || nx >= safeBounds.maxX - doomMargin ||
      ny < safeBounds.minY + doomMargin || ny >= safeBounds.maxY - doomMargin) {
    killSnake(s); return;
  }

  // --- Body following with double-buffer segment reuse ---
  const spacing = s.spacing;
  const oldSegs = s.segs;           // keep reference for pool recycling
  const newSegs = s._segPool;       // reuse alternate buffer
  newSegs.length = 0;
  newSegs.push(_allocPos(nx, ny));  // new head (from pool)

  for (let i = 0; i < oldSegs.length - 1; i++) {
    const prev = newSegs[newSegs.length - 1];
    const curr = oldSegs[i + 1];
    const dx = prev.x - curr.x, dy = prev.y - curr.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.01) {
      newSegs.push(_allocPos(curr.x, curr.y));
      continue;
    }
    const lerp = dist < spacing ? CFG.BODY_LERP_NEAR : CFG.BODY_LERP_FAR;
    const corr = (dist - spacing) * lerp;
    newSegs.push(_allocPos(curr.x + dx * corr / dist, curr.y + dy * corr / dist));
  }

  // Swap: newSegs becomes active, oldSegs objects recycled back to pool
  s.segs = newSegs;
  _freePosArr(oldSegs);
  oldSegs.length = 0;
  s._segPool = oldSegs;  // old array becomes next frame's buffer

  // Boost trail particles
  if (s.boosting && settings.particles && s.segs.length > 3) {
    const tail = s.segs[s.segs.length - 1];
    particles.spawn(tail.x, tail.y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.35, s.skin.glow, 3 + Math.random() * 3, 0);
  }

  // Track max length
  if (s.segs.length > s.maxLength) s.maxLength = s.segs.length;
}