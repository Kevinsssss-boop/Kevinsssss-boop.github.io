// ======================== 22. GAME LOOP ========================
let fatalError = null;

function gameLoop(now) {
  // If a fatal error occurred, stop everything and show it
  if (fatalError) {
    document.getElementById('error-overlay').style.display = 'flex';
    document.getElementById('error-msg').textContent = fatalError;
    return; // Stop the loop completely
  }

  try {
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;

    // Clamp raw delta to prevent spiral of death after tab-switch
    const clampedDt = Math.min(rawDt, 0.25);

    if (!isFinite(clampedDt) || clampedDt < 0) { requestAnimationFrame(gameLoop); return; }

    // ---- Fixed Timestep: accumulate time and run physics at FIXED_DT ----
    accumulator += clampedDt;
    while (accumulator >= FIXED_DT) {
      update(FIXED_DT * timeScale);
      accumulator -= FIXED_DT;
    }
    renderAlpha = accumulator / FIXED_DT;  // interpolation factor for smooth rendering

    const W = canvas.width, H = canvas.height;

    // Apply screen shake
    ctx.save();
    if (shakeDuration > 0) {
      ctx.translate(shakeX, shakeY);
    }

    ctx.clearRect(-10, -10, W + 20, H + 20);
    drawBackground();
    drawFoods();
    drawPowerUpsOnMap();
    for (const s of snakes) drawSnake(s);
    drawParticles();
    drawEventHUD();       // random event overlay
    if (state === 'paused') drawPauseOverlay();

    ctx.restore();

    // Minimap (reduced frequency)
    if (frameCount % 4 === 0 && (state === 'playing' || state === 'paused')) {
      drawMinimap();
    }

    // Smoothly restore timeScale to 1.0 (for slow-mo effects that decay)
    if (timeScale < 1.0) {
      timeScale = Math.min(1.0, timeScale + clampedDt * 1.5);  // ~0.67s to fully recover
    }
  } catch (e) {
    // Show error on HTML overlay (not canvas, so it can't be covered)
    fatalError = e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n');
    document.getElementById('error-overlay').style.display = 'flex';
    document.getElementById('error-msg').textContent = fatalError;
    console.error('Game loop error:', e);
    return; // Stop the loop
  }

  requestAnimationFrame(gameLoop);
}
