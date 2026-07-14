// ======================== 9. AI SYSTEM (Smarter & More Active) ========================
// Pre-allocated arrays to avoid per-AI-recalc GC
const _threats = [];
const _prey = [];

function updateAI(snake, dt, allSnakes, foods) {
  if (!snake.alive || snake.isPlayer) return;
  snake.aiTimer -= dt;

  const head = snake.head;
  const myLen = snake.segs.length;
  const mySpeed = snake.speed;
  let targetAngle = snake.angle;  // function-scope: used both inside and outside recalc
  let nearestPU = null;          // function-scope: set inside recalc, read by boost logic
  let nearestPUDist = Infinity;

  // --- Build threat/prey map (reuses pre-allocated arrays) ---
  const threats = _threats;
  const prey = _prey;

  if (snake.aiTimer <= 0) {
    snake.aiTimer = CFG.AI_RECALC_INTERVAL * (0.6 + Math.random() * 0.8);

    threats.length = 0;
    prey.length = 0;
    for (const other of allSnakes) {
      if (other === snake || !other.alive) continue;
      const dx = head.x - other.head.x, dy = head.y - other.head.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < CFG.AI_SIGHT_RANGE) {
        if (other.segs.length > myLen * 1.1) threats.push({ snake: other, dist: d, dx, dy });
        else if (other.segs.length < myLen * 0.85) prey.push({ snake: other, dist: d, dx, dy });
      }
    }

    // --- Find nearest power-up ---
    nearestPU = null; nearestPUDist = Infinity;
    for (const pu of powerups) {
      if (!pu.alive) continue;
      const pdx = head.x - pu.x, pdy = head.y - pu.y;
      const pd = pdx * pdx + pdy * pdy;
      if (pd < nearestPUDist && pd < 350 * 350) { nearestPUDist = pd; nearestPU = pu; }
    }

    // ---- Dynamic personality override (Phase 4) ----
    let effectivePersona = snake.personality;
    if (snake._consecutiveEats >= 5) effectivePersona = 'hunter';
    if (snake._recentKill) effectivePersona = 'hunter';
    if (snake._nearDeath && threats.length > 0) effectivePersona = 'survivor';
    if (snake._isTop3 && !snake._nearDeath) effectivePersona = 'hunter';

    // --- Personality-based decision ---
    snake.aiTarget = null;
    snake._activePersona = effectivePersona;
    if (effectivePersona === 'hunter') {
      // AGGRESSIVE hunter: path prediction + active chasing
      if (prey.length > 0) {
        prey.sort((a, b) => a.dist - b.dist);
        const target = prey[0];
        // Predict where prey will be in ~0.5s
        const predT = Math.min(0.5, target.dist / Math.max(mySpeed, 100));
        const predX = target.snake.head.x + Math.cos(target.snake.angle) * target.snake.speed * predT;
        const predY = target.snake.head.y + Math.sin(target.snake.angle) * target.snake.speed * predT;
        snake.aiTarget = { x: predX, y: predY };
      } else if (threats.length > 0) {
        threats.sort((a, b) => a.dist - b.dist);
        const t = threats[0];
        snake.aiTarget = { x: head.x + t.dx * 3.5, y: head.y + t.dy * 3.5 };
      } else if (nearestPU) {
        snake.aiTarget = nearestPU;
      }
    } else if (effectivePersona === 'scavenger') {
      // Smarter scavenger: avoid threats but attack weak prey + seek food/PU
      if (threats.length > 0 && threats[0].dist < 200) {
        threats.sort((a, b) => a.dist - b.dist);
        const t = threats[0];
        snake.aiTarget = { x: head.x + t.dx * 2.5, y: head.y + t.dy * 2.5 };
      } else if (prey.length > 0 && prey[0].dist < myLen * 8 && prey[0].segs.length < myLen * 0.5) {
        prey.sort((a, b) => a.dist - b.dist);
        snake.aiTarget = prey[0].snake.head;
      } else if (nearestPU && nearestPUDist < 250 * 250) {
        snake.aiTarget = nearestPU;
      } else {
        let bestF = null, bestFD = Infinity;
        for (const f of foods) {
          const fdx = head.x - f.x, fdy = head.y - f.y, fd = fdx * fdx + fdy * fdy;
          if (fd < bestFD) { bestFD = fd; bestF = f; }
        }
        if (bestF) snake.aiTarget = bestF;
      }
    } else if (effectivePersona === 'survivor') {
      const cx = CFG.WORLD_W / 2, cy = CFG.WORLD_H / 2;
      const edgeAngle = Math.atan2(head.y - cy, head.x - cx) + Math.PI / 2;
      const edgeTargetX = head.x + Math.cos(edgeAngle) * 280;
      const edgeTargetY = head.y + Math.sin(edgeAngle) * 280;
      if (threats.length > 0) {
        threats.sort((a, b) => a.dist - b.dist);
        const t = threats[0];
        if (t.dist < 250) {
          snake.aiTarget = { x: head.x + t.dx * 4.5, y: head.y + t.dy * 4.5 };
        } else {
          snake.aiTarget = { x: edgeTargetX, y: edgeTargetY };
        }
      } else if (nearestPU && nearestPUDist < 300 * 300) {
        snake.aiTarget = nearestPU;
      } else {
        snake.aiTarget = { x: edgeTargetX, y: edgeTargetY };
      }
    } else {
      // Balanced/null personality
      if (prey.length > 0 && Math.random() < 0.55) {
        prey.sort((a, b) => a.dist - b.dist);
        snake.aiTarget = prey[0].snake.head;
      } else if (threats.length > 0 && threats[0].dist < 220) {
        threats.sort((a, b) => a.dist - b.dist);
        const t = threats[0];
        snake.aiTarget = { x: head.x + t.dx * 3, y: head.y + t.dy * 3 };
      } else if (nearestPU && nearestPUDist < 280 * 280) {
        snake.aiTarget = nearestPU;
      } else {
        let bestF = null, bestFD = Infinity;
        for (const f of foods) {
          const fdx = head.x - f.x, fdy = head.y - f.y, fd = fdx * fdx + fdy * fdy;
          if (fd < bestFD) { bestFD = fd; bestF = f; }
        }
        if (bestF) snake.aiTarget = bestF;
      }
    }

    if (snake.aiTarget) {
      targetAngle = Math.atan2(snake.aiTarget.y - head.y, snake.aiTarget.x - head.x);
    }
    snake.aiTargetAngle = targetAngle;
  } else {
    targetAngle = snake.aiTargetAngle;
  }

  // --- Wall avoidance (stronger influence, blended with target) ---
  const wallDist = CFG.AI_WALL_DIST;
  let wallDx = 0, wallDy = 0;
  if (head.x < wallDist) wallDx = 1;
  else if (head.x > CFG.WORLD_W - wallDist) wallDx = -1;
  if (head.y < wallDist) wallDy = 1;
  else if (head.y > CFG.WORLD_H - wallDist) wallDy = -1;
  if (wallDx !== 0 || wallDy !== 0) {
    const wallAngle = Math.atan2(wallDy, wallDx);
    let ad = wallAngle - targetAngle;
    while (ad > Math.PI) ad -= Math.PI * 2;
    while (ad < -Math.PI) ad += Math.PI * 2;
    targetAngle += Math.sign(ad) * 0.6;  // strong but not total override
  }

  // --- Smooth turning (faster for all) ---
  let ad = targetAngle - snake.angle;
  while (ad > Math.PI) ad -= Math.PI * 2;
  while (ad < -Math.PI) ad += Math.PI * 2;
  const personaTurnBonus = snake._activePersona === 'hunter' ? 2.5 : snake._activePersona === 'survivor' ? 1.2 : 1.8;
  const turnSpeed = (CFG.AI_TURN_BASE + personaTurnBonus) * dt;
  if (Math.abs(ad) < turnSpeed) snake.angle = targetAngle;
  else snake.angle += Math.sign(ad) * turnSpeed;

  // --- Boost logic (more liberal) ---
  if (snake._activePersona === 'hunter') {
    const shouldBoost = (prey.length > 0 && prey[0].dist < 280) ||
                         (threats.length > 0 && threats[0].dist < 180 && threats[0].snake.segs.length > myLen * 1.3);
    snake.boosting = shouldBoost;
  } else if (snake._activePersona === 'survivor') {
    snake.boosting = threats.length > 0 && threats[0].dist < 200;
  } else {
    const shouldBoost = (prey.length > 0 && prey[0].dist < 220) ||
                       (threats.length > 0 && threats[0].dist < 160) ||
                       (nearestPU && nearestPUDist < 150 * 150);
    snake.boosting = shouldBoost;
  }
}
