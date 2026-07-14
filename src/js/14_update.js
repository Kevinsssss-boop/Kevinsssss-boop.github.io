// ======================== 19. UPDATE ========================
function update(dt) {
  if (state !== 'playing') { foodPulse += dt * 2; particles.update(dt); return; }
  if (!isFinite(dt) || dt <= 0 || dt > 1) return;

  // Declare player once for the entire update() scope (used by danger hints, difficulty, camera, etc.)
  const player = getPlayer();

  // Timer: counts down in normal modes, counts up in endless/hunter
  if (mode === 'endless') {
    timer += dt;  // survival time
  } else if (mode === 'hunter') {
    timer += dt;
    if (timer >= 120) { endGame(); return; }  // 120s hunt limit
  } else {
    timer -= dt;
    if (timer <= 0) { timer = 0; endGame(); return; }
  }

  // Power-up spawning
  powerupTimer -= dt;
  if (powerupTimer <= 0) {
    spawnPowerUp();
    powerupTimer = CFG.POWERUP_INTERVAL[0] + Math.random() * (CFG.POWERUP_INTERVAL[1] - CFG.POWERUP_INTERVAL[0]);
  }
  for (const pu of powerups) pu.update(dt);

  // ---- Shrinking Circle (standard modes only) ----
  if (mode !== 'endless' && mode !== 'hunter' && timer < CFG.SHRINK_START) {
    shrinkProgress = clamp((CFG.SHRINK_START - timer) / (CFG.SHRINK_START - CFG.SHRINK_END), 0, 1);
    const marginX = CFG.WORLD_W * 0.3 * shrinkProgress;
    const marginY = CFG.WORLD_H * 0.3 * shrinkProgress;
    safeBounds.minX = marginX;
    safeBounds.maxX = CFG.WORLD_W - marginX;
    safeBounds.minY = marginY;
    safeBounds.maxY = CFG.WORLD_H - marginY;
  } else if (mode === 'endless' || mode === 'hunter' || timer >= CFG.SHRINK_START) {
    shrinkProgress = 0;
    safeBounds.minX = 0; safeBounds.maxX = CFG.WORLD_W;
    safeBounds.minY = 0; safeBounds.maxY = CFG.WORLD_H;
  }

  // ---- Random Events ----
  updateEvents(dt);

  // ---- Risk food slow timer ----
  for (const s of snakes) {
    if (s._riskSlowTimer > 0) s._riskSlowTimer -= dt;
  }
  // ---- Reveal timer decay ----
  if (window._revealedPlayers) {
    for (const k of Object.keys(window._revealedPlayers)) {
      window._revealedPlayers[k] -= dt;
      if (window._revealedPlayers[k] <= 0) delete window._revealedPlayers[k];
    }
  }

  // AI
  for (const s of snakes) {
    if (!s.isPlayer) updateAI(s, dt, snakes, foods);
  }

  // Player input processing
  for (const s of snakes) {
    if (!s.isPlayer || !s.alive) continue;
    s.updateBoost(dt);
    s.updateSpeedInertia(dt);  // Step 1.2: speed inertia
    s.updatePowerUps(dt);
    s.updateRadius();

    let ctrlAngle = null;
    if (s.isPlayer2) {
      // P2: WASD
      let dx = 0, dy = 0;
      if (keysHeld['a'] || keysHeld['A']) dx = -1;
      if (keysHeld['d'] || keysHeld['D']) dx = 1;
      if (keysHeld['w'] || keysHeld['W']) dy = -1;
      if (keysHeld['s'] || keysHeld['S']) dy = 1;
      if (dx !== 0 || dy !== 0) ctrlAngle = Math.atan2(dy, dx);
    } else if (settings.controlMode === 'keyboard') {
      // Step 1.3: P1 Keyboard Mode — Arrow keys
      let dx = 0, dy = 0;
      if (keysHeld['ArrowLeft']) dx = -1;
      if (keysHeld['ArrowRight']) dx = 1;
      if (keysHeld['ArrowUp']) dy = -1;
      if (keysHeld['ArrowDown']) dy = 1;
      if (dx !== 0 || dy !== 0) ctrlAngle = Math.atan2(dy, dx);
    } else if (vJoyActive && Math.sqrt(vJoyDX * vJoyDX + vJoyDY * vJoyDY) > 6) {
      ctrlAngle = Math.atan2(vJoyDY, vJoyDX);
    } else if (mouseActive) {
      const wx = mouseX, wy = mouseY;
      // Convert screen to world
      const worldMX = camX + (wx - canvas.width / 2) / camZoom;
      const worldMY = camY + (wy - canvas.height / 2) / camZoom;
      const dx = worldMX - s.head.x, dy = worldMY - s.head.y;
      if (Math.sqrt(dx * dx + dy * dy) > 8) ctrlAngle = Math.atan2(dy, dx);
    }

    moveSnake(s, dt, ctrlAngle);
  }

  // NPC movement
  for (const s of snakes) {
    if (!s.isPlayer) { s.updatePowerUps(dt); s.updateRadius(); moveSnake(s, dt, null); }
  }

  // ---- Speed Frenzy event: boost fuel never drains ----
  if (window._eventSpeedFrenzy) {
    for (const s of snakes) {
      if (s.alive && s.boosting) s.boostFuel = Math.max(s.boostFuel, 0.1);
    }
  }

  // Collisions
  checkCollisions();
  checkFood(dt);
  checkPowerUps();

  // ---- Update bounty ----
  updateBounty();

  // Step 1.5: Danger proximity detection for player (optimized sampling)
  if (player && player.alive) {
    const ph = player.head;
    let minDangerDist = Infinity;
    for (const s of snakes) {
      if (s === player || !s.alive) continue;
      // Sample segments sparsely for large snakes (performance)
      const step = s.segs.length > 60 ? Math.max(3, Math.floor(s.segs.length / 25)) : Math.max(1, Math.floor(s.segs.length / 20));
      for (let i = Math.floor(s.segs.length * 0.2); i < s.segs.length; i += step) {
        const seg = s.segs[i];
        const dx = ph.x - seg.x, dy = ph.y - seg.y;
        const d = dx * dx + dy * dy;  // skip sqrt for performance, compare squared
        if (d < minDangerDist * minDangerDist) minDangerDist = Math.sqrt(d);
      }
    }
    // Show vignette when very close to another snake's body (< radius * 2.5)
    if (minDangerDist < player.radius * 3) {
      const intensity = clamp(0.15 + (1 - minDangerDist / (player.radius * 3)) * 0.5, 0.15, 0.55);
      showDangerVignette(intensity);
    }
  }

  // Step 1.7: Check in-game hints
  checkHints(player);

  // Check game end (manual loops to avoid filter allocations)
  let alivePlayersCount = 0, aliveAllCount = 0, p1Alive = false, p2Alive = false;
  for (let i = 0; i < snakes.length; i++) {
    const s = snakes[i];
    if (s.alive) {
      aliveAllCount++;
      if (s.isPlayer) {
        alivePlayersCount++;
        if (!s.isPlayer2) p1Alive = true;
        else p2Alive = true;
      }
    }
  }
  if ((mode === 'single' && alivePlayersCount === 0) || (mode === 'local' && !p1Alive && !p2Alive)) {
    endGame(); return;
  }
  if (aliveAllCount <= 1) { endGame(); return; }

  // Dynamic difficulty: NPC speed scales with player performance
  if (mode === 'single' || mode === 'endless') {
    if (player && player.alive) {
      const factor = Math.min(1, player.score / 800); // 800 points = max difficulty
      const targetSpeed = CFG.NPC_MIN_SPEED + factor * (CFG.NPC_MAX_SPEED - CFG.NPC_MIN_SPEED);
      for (const s of snakes) {
        if (!s.isPlayer && s.alive) {
          s.speed += (targetSpeed - s.speed) * Math.min(0.3 * dt, 1);
        }
      }
    }
  }

  // ---- Endless mode: escalating difficulty ----
  if (mode === 'endless') {
    const elapsed = timer;  // timer counts up in endless
    if (elapsed > 0 && Math.floor(elapsed) % CFG.ENDLESS_DIFFICULTY_INTERVAL === 0 &&
        Math.floor((elapsed - dt) % CFG.ENDLESS_DIFFICULTY_INTERVAL) !== 0) {
      // Spawn 2 additional NPCs every interval
      const npcSkins = SKINS.filter(s => !s.locked || s.id === playerSkin.id);
      for (let i = 0; i < 2; i++) {
        const sk = npcSkins[Math.floor(Math.random() * npcSkins.length)] || SKINS[0];
        const persona = ['hunter', 'scavenger', 'survivor', null][Math.floor(Math.random() * 4)];
        const sx = safeBounds.minX + 100 + Math.random() * (safeBounds.maxX - safeBounds.minX - 200);
        const sy = safeBounds.minY + 100 + Math.random() * (safeBounds.maxY - safeBounds.minY - 200);
        const npc = new Snake(sx, sy, sk, false, persona);
        npc.speed = CFG.NPC_MIN_SPEED + elapsed / 60 * 8;
        snakes.push(npc);
      }
      // Force event every 2 intervals
      if (Math.floor(elapsed / CFG.ENDLESS_DIFFICULTY_INTERVAL) % 2 === 0 && !currentEvent) {
        const idx = Math.floor(Math.random() * EVENT_TYPES.length);
        currentEvent = EVENT_TYPES[idx];
        eventTimeLeft = currentEvent.duration;
        eventPulse = 0;
        if (currentEvent.onStart) currentEvent.onStart();
        showEventAnnouncement(currentEvent);
      }
    }
  }

  // ---- Hunter mode: respawn killed NPCs quickly ----
  if (mode === 'hunter') {
    let npcCount = 0;
    for (const s of snakes) { if (!s.isPlayer && s.alive) npcCount++; }
    const targetNPC = 8;
    while (npcCount < targetNPC) {
      const npcSkins = SKINS.filter(s => !s.locked || s.id === playerSkin.id);
      const sk = npcSkins[Math.floor(Math.random() * npcSkins.length)] || SKINS[0];
      const sx = safeBounds.minX + 100 + Math.random() * (safeBounds.maxX - safeBounds.minX - 200);
      const sy = safeBounds.minY + 100 + Math.random() * (safeBounds.maxY - safeBounds.minY - 200);
      snakes.push(new Snake(sx, sy, sk, false, 'survivor'));
      npcCount++;
    }
  }

  // ---- Top-3 tracking + AI state decay ----
  const aliveByScore = [];
  for (const s of snakes) { if (s.alive) aliveByScore.push(s); }
  aliveByScore.sort((a, b) => b.score - a.score);
  for (const s of snakes) {
    if (!s.alive) continue;
    s._isTop3 = (aliveByScore.indexOf(s) < 3);
    // State decay
    if (s._recentKillTimer > 0) { s._recentKillTimer -= dt; if (s._recentKillTimer <= 0) s._recentKill = false; }
    if (s._nearDeathTimer > 0) { s._nearDeathTimer -= dt; if (s._nearDeathTimer <= 0) s._nearDeath = false; }
  }

  // Camera (use existing player or fall back to P2)
  const camTarget = player || getPlayer2();
  if (camTarget && camTarget.alive) {
    const h = camTarget.head;
    // camX/camY = view CENTER (worldX adds canvas.width/2), so converge to head position
    const idealX = h.x;
    const idealY = h.y;
    camX += (idealX - camX) * Math.min(CFG.CAMERA_LERP * dt, 1);
    camY += (idealY - camY) * Math.min(CFG.CAMERA_LERP * dt, 1);
    // Zoom based on size
    targetZoom = clamp(CFG.CAMERA_ZOOM_MAX - (camTarget.segs.length / 150) * (CFG.CAMERA_ZOOM_MAX - CFG.CAMERA_ZOOM_MIN), CFG.CAMERA_ZOOM_MIN, CFG.CAMERA_ZOOM_MAX);
  }
  camZoom += (targetZoom - camZoom) * Math.min(3 * dt, 1);

  // Screen shake
  if (shakeDuration > 0) {
    shakeDuration -= dt;
    shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeY = (Math.random() - 0.5) * shakeIntensity * 2;
    shakeIntensity *= Math.pow(0.02, dt); // decay
    if (shakeDuration <= 0) { shakeX = 0; shakeY = 0; shakeIntensity = 0; }
  }

  // Kill feed decay
  for (const m of killFeed) m.life -= dt;
  killFeed = killFeed.filter(m => m.life > 0);
  document.getElementById('kill-feed').innerHTML = killFeed.map(m => `<div class="kill-msg" style="color:${m.color};opacity:${clamp(m.life, 0, 1)}">${m.text}</div>`).join('');

  // Step 1.5: Update danger vignette
  updateDangerVignette(dt);

  // Particles
  particles.update(dt);

  foodPulse += dt * 3;
  frameCount++;
  updateHUD(dt);
}

// HUD update with 10Hz throttle + value caching to avoid DOM reflows
let hudCache = { score: -1, time: '', rank: '', combo: '', fuel: -1, fuelColor: '', powerup: '' };
let hudThrottle = 0;

function updateHUD(dt) {
  hudThrottle += dt;
  if (hudThrottle < 0.09) return; // ~10 Hz
  hudThrottle = 0;

  const player = getPlayer() || getPlayer2();

  const score = player ? player.score : 0;
  if (hudCache.score !== score) {
    document.getElementById('hud-score').textContent = score;
    hudCache.score = score;
  }

  const displayTime = (mode === 'endless' || mode === 'hunter') ? timer : Math.max(0, timer);
  const m = Math.floor(displayTime / 60);
  const s = Math.floor(displayTime % 60);
  const timeStr = `${m}:${String(s).padStart(2, '0')}`;
  const timeColor = (mode !== 'endless' && mode !== 'hunter' && timer < 30) ? '#ff5252'
    : (mode !== 'endless' && mode !== 'hunter' && timer < 60) ? '#ffd740' : '#fff';
  if (hudCache.time !== timeStr) {
    const timeEl = document.getElementById('hud-time');
    timeEl.textContent = timeStr;
    timeEl.style.color = timeColor;
    hudCache.time = timeStr;
  }

  let rank = 1;
  if (player) {
    const alive = [];
    for (let i = 0; i < snakes.length; i++) { if (snakes[i].alive) alive.push(snakes[i]); }
    alive.sort((a, b) => b.score - a.score);
    for (let i = 0; i < alive.length; i++) { if (alive[i] === player) { rank = i + 1; break; } }
  }
  const rankStr = player ? `${rank}/${snakes.length}` : '-';
  if (hudCache.rank !== rankStr) {
    document.getElementById('hud-rank').textContent = rankStr;
    hudCache.rank = rankStr;
  }

  const comboStr = player && player.combo >= 2 ? `x${Math.min(CFG.MAX_COMBO_MULT, 1 + Math.floor(player.combo / 3) * 0.5)}` : '-';
  if (hudCache.combo !== comboStr) {
    document.getElementById('hud-combo').textContent = comboStr;
    hudCache.combo = comboStr;
  }

  // Boost fuel bar
  if (player) {
    const fuelPct = Math.round((player.boostFuel / CFG.BOOST_FUEL) * 100);
    if (hudCache.fuel !== fuelPct) {
      document.getElementById('fuel-fill').style.width = fuelPct + '%';
      const fuelColor = fuelPct < 25 ? 'linear-gradient(90deg,#ff5252,#ff9100)' : 'linear-gradient(90deg,#ff9100,#ffc400)';
      if (hudCache.fuelColor !== fuelColor) {
        document.getElementById('fuel-fill').style.background = fuelColor;
        hudCache.fuelColor = fuelColor;
      }
      hudCache.fuel = fuelPct;
    }
  }

  // Power-up icon
  const puEl = document.getElementById('hud-powerup');
  if (player && Object.keys(player.powerups).length > 0) {
    const PRIORITY = ['shield', 'ghost', 'speed', 'magnet'];
    const active = Object.keys(player.powerups).sort((a, b) =>
      (PRIORITY.indexOf(a) !== -1 ? PRIORITY.indexOf(a) : 99) -
      (PRIORITY.indexOf(b) !== -1 ? PRIORITY.indexOf(b) : 99)
    )[0];
    const puType = POWERUP_TYPES.find(p => p.id === active);
    if (puType) {
      const puStr = puType.icon + ' ' + Math.ceil(player.powerups[active]) + 's';
      if (hudCache.powerup !== puStr) {
        puEl.classList.remove('hidden');
        puEl.textContent = puStr;
        puEl.style.color = puType.color;
        hudCache.powerup = puStr;
      }
    }
  } else {
    if (hudCache.powerup !== '') {
      puEl.classList.add('hidden');
      hudCache.powerup = '';
    }
  }
}
