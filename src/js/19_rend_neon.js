// --- Neon renderer: glow pulse + additive blend + scan lines ---
bodyRenderers.neon = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const len = s.segs.length;
  const segStep = len > 200 ? 4 : len > 120 ? 3 : len > 60 ? 2 : 1;
  const effect = skin.effect || {};
  const glowInt = effect.glowIntensity || 18;
  const time = Date.now() * 0.003;

  ctx.save();
  // Additive blending for glow effect
  ctx.globalCompositeOperation = 'lighter';

  for (let i = len - 1; i >= 1; i -= segStep) {
    const seg = s.segs[i];
    const sx = worldX(seg.x), sy = worldY(seg.y);
    if (!isFinite(sx) || !isFinite(sy)) continue;
    if (sx < -r * 3 || sx > W + r * 3 || sy < -r * 3 || sy > H + r * 3) continue;

    const t = i / (len - 1);
    const sr = r * 0.68;
    const alpha = 0.85 - t * 0.20;

    // Pulsing glow intensity
    const pulse = Math.sin(time + i * 0.3) * 0.5 + 0.5;
    ctx.shadowColor = skin.glow || skin.body;
    ctx.shadowBlur = glowInt * (0.6 + pulse * 0.4);

    // Color gradient with boosted brightness for neon
    const cr = Math.round(
      parseInt(skin.head.slice(1, 3), 16) * (1 - t) +
      parseInt(skin.dark.slice(1, 3), 16) * t
    );
    const cg = Math.round(
      parseInt(skin.head.slice(3, 5), 16) * (1 - t) +
      parseInt(skin.dark.slice(3, 5), 16) * t
    );
    const cb = Math.round(
      parseInt(skin.head.slice(5, 7), 16) * (1 - t) +
      parseInt(skin.dark.slice(5, 7), 16) * t
    );

    ctx.globalAlpha = alpha * (0.7 + pulse * 0.3);
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;

    const drawR = sr * 1.75;
    ctx.beginPath();
    ctx.arc(sx, sy, drawR, 0, Math.PI * 2);
    ctx.fill();

    // Bright core highlight
    if (camZoom > 0.4) {
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(sx - drawR * 0.15, sy - drawR * 0.15, drawR * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + pulse * 0.15})`;
      ctx.fill();
    }
  }
  ctx.restore();
};

headRenderers.neon = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldX(s.segs[0].y);
  const head = s.segs[0];
  if (!head || !isFinite(hx) || isFinite(hy) || hx < -r * 3 || hx > W + r * 3 || hy < -r * 3 || hy > H + r * 3) return;

  const headW = r * 1.35, headH = r * 1.1;
  const headAngle = s.segs.length > 1
    ? Math.atan2(s.segs[0].y - s.segs[1].y, s.segs[0].x - s.segs[1].x)
    : s.angle;
  const time = Date.now() * 0.003;
  const effect = skin.effect || {};

  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headAngle);

  // Strong outer glow
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = skin.glow || skin.body;
  ctx.shadowBlur = (effect.glowIntensity || 20) * (0.8 + Math.sin(time * 2) * 0.2);

  // Head gradient with bright core
  const hg = ctx.createRadialGradient(-headW * 0.05, -headH * 0.15, headW * 0.04, 0, 0, headW);
  hg.addColorStop(0, '#ffffff');
  hg.addColorStop(0.15, skin.head);
  hg.addColorStop(0.6, skin.body);
  hg.addColorStop(1, skin.dark);
  ctx.beginPath(); ctx.ellipse(0, 0, headW, headH, 0, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();

  // Scan lines effect (horizontal glowing stripes)
  ctx.shadowBlur = 0;
  const scanCount = 5;
  for (let sc = 0; sc < scanCount; sc++) {
    const sy = -headH + (headH * 2 / scanCount) * sc + headH / scanCount;
    const scanAlpha = 0.08 + Math.sin(time * 3 + sc) * 0.05;
    ctx.fillStyle = `rgba(255,255,255,${scanAlpha})`;
    ctx.fillRect(-headW, sy - 0.5, headW * 2, 1);
  }

  // Glowing eyes (style: 'glow')
  const ed = headW * 0.42, er = headW * 0.32, ef = headW * 0.08;
  for (let side = -1; side <= 1; side += 2) {
    const ex = ef, ey = ed * side;
    // Outer glow
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(ex, ey, er * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.shadowBlur = 0;
    // Inner bright pupil
    ctx.beginPath(); ctx.arc(ex, ey, er * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
  }

  // Name tag (NPCs only)
  ctx.globalCompositeOperation = 'source-over';
  if (!s.isPlayer) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${Math.round(10 * camZoom)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    const personaLabel = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
    ctx.fillText(personaLabel + skin.name, 0, -headH - 6 * camZoom);
  }

  // Boost fire effect (neon-style: electric sparks)
  if (s.boosting) {
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 15;
    for (let i = 0; i < 4; i++) {
      const fx = -headW * (0.6 + Math.random() * 0.5);
      const fy = (Math.random() - 0.5) * headH;
      const fr = headW * (0.08 + Math.random() * 0.12);
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  ctx.restore();
};
