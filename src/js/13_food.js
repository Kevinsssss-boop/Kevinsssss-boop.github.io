function spawnInitialFoods() {
  for (let i = 0; i < CFG.FOOD_COUNT; i++) {
    foods.push({
      x: 40 + Math.random() * (CFG.WORLD_W - 80),
      y: 40 + Math.random() * (CFG.WORLD_H - 80),
      r: 5 + Math.random() * 5,
      color: ['#ff4757', '#ffa502', '#ffd93d', '#7bed9f', '#70a1ff', '#a55eea', '#ff6b81', '#2ed573', '#ff6348', '#1e90ff'][Math.floor(Math.random() * 10)],
      pts: 10 + Math.floor(Math.random() * 3) * 5,
      pulse: Math.random() * Math.PI * 2,
      isDrop: false,
      eaten: false,
    });
  }
}

function spawnFood() {
  if (foods.length >= CFG.FOOD_COUNT + 10) return;

  // Helper: check if a world position overlaps any live snake
  const nearSnake = (x, y) => {
    for (const s of snakes) {
      if (!s.alive) continue;
      for (let i = 0; i < s.segs.length; i += Math.max(1, Math.floor(s.segs.length / 15))) {
        const dx = x - s.segs[i].x, dy = y - s.segs[i].y;
        if (dx * dx + dy * dy < (s.radius + 10) * (s.radius + 10)) return true;
      }
    }
    return false;
  };

  // Retry to avoid snake bodies
  let tx, ty, retries = 10;
  do {
    tx = 40 + Math.random() * (CFG.WORLD_W - 80);
    ty = 40 + Math.random() * (CFG.WORLD_H - 80);
    retries--;
  } while (retries > 0 && nearSnake(tx, ty));

  // Golden food chance — count without filter allocation
  let goldenCount = 0;
  for (const f of foods) { if (f.isGolden) goldenCount++; }
  const isGolden = Math.random() < CFG.GOLDEN_FOOD_CHANCE && goldenCount < CFG.GOLDEN_FOOD_MAX;

  // Risk food chance (~2%, max 2 on map)
  let riskCount = 0;
  for (const f of foods) { if (f.isRiskFood) riskCount++; }
  const isRisk = !isGolden && Math.random() < 0.02 && riskCount < 2;

  const foodColors = ['#ff4757', '#ffa502', '#ffd93d', '#7bed9f', '#70a1ff', '#a55eea', '#ff6b81', '#2ed573', '#ff6348', '#1e90ff'];

  foods.push({
    x: tx, y: ty,
    r: isRisk ? 14 : (isGolden ? 11 : 5 + Math.random() * 5),
    color: isRisk ? '#c77dff' : (isGolden ? '#ffd740' : foodColors[Math.floor(Math.random() * foodColors.length)]),
    pts: isRisk ? 200 : (isGolden ? CFG.GOLDEN_FOOD_PTS : 10 + Math.floor(Math.random() * 3) * 5),
    pulse: Math.random() * Math.PI * 2,
    isDrop: false,
    isGolden: isGolden,
    isRiskFood: isRisk,
    eaten: false,
  });
}


// ======================== 17. FOOD COLLECTION ========================
function checkFood(dt) {
  for (const s of snakes) {
    if (!s.alive) continue;
    const head = s.head, sr = s.radius;

    // Magnet power-up: wider pickup range
    const pickupRange = s.hasPowerUp('magnet') ? sr * 3.5 : sr;

    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      if (f.eaten) continue;
      const dx = head.x - f.x, dy = head.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const eatDist = pickupRange + f.r;

      if (dist < eatDist) {
        // Combo
        s.comboTimer = CFG.COMBO_WINDOW;
        s.combo++;
        const comboMult = Math.min(CFG.MAX_COMBO_MULT, 1 + Math.floor(s.combo / 3) * 0.5);
        const pts = Math.round(f.pts * comboMult);
        s.score += pts;
        s.foodEaten++;

        // Growth
        const grow = Math.max(1, Math.round(f.pts / 14));
        for (let g = 0; g < grow; g++) {
          const t = s.segs[s.segs.length - 1];
          s.segs.push({ ...t });
        }

        // Eat particles
        if (settings.particles) {
          particles.burst(f.x, f.y, 5, 60, 0.3, f.color, [2, 4], 0);
        }

        // Golden food: grant temporary speed boost
        if (f.isGolden) {
          s.powerups['speed'] = Math.max(s.powerups['speed'] || 0, CFG.GOLDEN_BOOST_DURATION);
          if (s.isPlayer) {
            SFX.powerup();
            particles.burst(f.x, f.y, 15, 80, 0.4, '#ffd740', [2, 5], 0);
          }
        }

        // Risk food: 200pts + full boost + location revealed + slow debuff
        if (f.isRiskFood) {
          s.boostFuel = CFG.BOOST_FUEL;
          // Slow debuff: temporarily reduce speed
          if (!s._riskSlowTimer) s._riskSlowTimer = 0;
          s._riskSlowTimer = 2.0;  // 2 seconds of half speed
          if (s.isPlayer) {
            SFX.powerup();
            particles.burst(f.x, f.y, 20, 100, 0.5, '#c77dff', [3, 6], 0);
            // Reveal player position on minimap
            if (!window._revealedPlayers) window._revealedPlayers = {};
            window._revealedPlayers[s.id] = 5.0;  // visible for 5s
          }
        }

        // Consecutive eats tracking (for AI dynamic personality)
        s._consecutiveEats++;

        // Mark eaten (compacted in bulk after all snakes processed)
        f.eaten = true;

        if (s.isPlayer) {
          SFX.eat(f);
          if (comboMult >= 2) { SFX.combo(Math.floor(comboMult * 2)); showComboPopup(s.combo); }
          // Step 1.4: Show score popup at food position
          showScorePopup(f.x, f.y, pts, f.color);
        }
      }
    }

    // Combo timer
    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) { s.combo = 0; s._consecutiveEats = 0; }
    }

    // Size decay for very large snakes
    if (s.segs.length > CFG.DECAY_START && s._decayTimer === undefined) s._decayTimer = CFG.DECAY_INTERVAL;
    if (s.segs.length > CFG.DECAY_START) {
      s._decayTimer -= dt;
      if (s._decayTimer <= 0) {
        s._decayTimer = CFG.DECAY_INTERVAL;
        s.segs.pop(); // Lose one segment
      }
    } else {
      s._decayTimer = CFG.DECAY_INTERVAL;
    }
  }

  // Compact eaten foods (read-write pointer, O(n), zero allocation)
  let w = 0;
  for (let i = 0; i < foods.length; i++) {
    if (!foods[i].eaten) foods[w++] = foods[i];
  }
  foods.length = w;

  // Refill food
  while (foods.length < CFG.FOOD_COUNT) spawnFood();
}
