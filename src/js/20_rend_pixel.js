// --- Pixel renderer: retro 8-bit style with blocky segments ---
bodyRenderers.pixel = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const len = s.segs.length;
  const segStep = len > 200 ? 4 : len > 120 ? 3 : len > 60 ? 2 : 1;
  // Pixel size scales with zoom
  const pxSize = Math.max(2, Math.floor(r * 0.12));

  for (let i = len - 1; i >= 1; i -= segStep) {
    const seg = s.segs[i];
    const sx = worldX(seg.x), sy = worldY(seg.y);
    if (!isFinite(sx) || !isFinite(sy)) continue;
    if (sx < -r * 3 || sx > W + r * 3 || sy < -r * 3 || sy > H + r * 3) continue;

    const t = i / (len - 1);
    const drawR = r * 0.68 * 1.75;
    const alpha = 0.85 - t * 0.20;

    // Color gradient (same as classic but quantized feel)
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

    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;

    // Draw as rounded rectangle (pixel-art style: slightly square)
    const size = drawR * 1.8;
    const cornerR = pxSize * 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - size/2 + cornerR, sy - size/2);
    ctx.lineTo(sx + size/2 - cornerR, sy - size/2);
    ctx.quadraticCurveTo(sx + size/2, sy - size/2, sx + size/2, sy - size/2 + cornerR);
    ctx.lineTo(sx + size/2, sy + size/2 - cornerR);
    ctx.quadraticCurveTo(sx + size/2, sy + size/2, sx + size/2 - cornerR, sy + size/2);
    ctx.lineTo(sx - size/2 + cornerR, sy + size/2);
    ctx.quadraticCurveTo(sx - size/2, sy + size/2, sx - size/2, sy + size/2 - cornerR);
    ctx.lineTo(sx - size/2, sy - size/2 + cornerR);
    ctx.quadraticCurveTo(sx - size/2, sy - size/2, sx - size/2 + cornerR, sy - size/2);
    ctx.closePath();
    ctx.fill();

    // Pixel highlight (blocky, top-left)
    if (camZoom > 0.4 && pxSize >= 3) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + (1-t)*0.06})`;
      const hlSize = pxSize * 1.5;
      ctx.fillRect(sx - size*0.25, sy - size*0.3, hlSize, hlSize);
    }
  }
};

headRenderers.pixel = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
  const head = s.segs[0];
  if (!head || !isFinite(hx) || !isFinite(hy) || hx < -r * 3 || hx > W + r * 3 || hy < -r * 3 || hy > H + r * 3) return;

  const headW = r * 1.35, headH = r * 1.1;
  const headAngle = s.segs.length > 1
    ? Math.atan2(s.segs[0].y - s.segs[1].y, s.segs[0].x - s.segs[1].x)
    : s.angle;
  const pxSize = Math.max(2, Math.floor(r * 0.1));

  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headAngle);

  // Blocky pixel head (rounded rect with tiny corners)
  const cornerR = pxSize * 0.5;
  ctx.beginPath();
  ctx.moveTo(-headW + cornerR, -headH);
  ctx.lineTo(headW - cornerR, -headH);
  ctx.quadraticCurveTo(headW, -headH, headW, -headH + cornerR);
  ctx.lineTo(headW, headH - cornerR);
  ctx.quadraticCurveTo(headW, headH, headW - cornerR, headH);
  ctx.lineTo(-headW + cornerR, headH);
  ctx.quadraticCurveTo(-headW, headH, -headW, headH - cornerR);
  ctx.lineTo(-headW, -headH + cornerR);
  ctx.quadraticCurveTo(-headW, -headH, -headW + cornerR, -headH);
  ctx.closePath();

  const hg = ctx.createRadialGradient(-headW * 0.1, -headH * 0.2, headW * 0.06, 0, 0, headW);
  hg.addColorStop(0, skin.head); hg.addColorStop(0.6, skin.body); hg.addColorStop(1, skin.dark);
  ctx.fillStyle = hg; ctx.fill();

  // Blocky pixel eyes (square pupils)
  const ed = headW * 0.42, er = headW * 0.28;
  const eyeSize = er * 0.7;
  for (let side = -1; side <= 1; side += 2) {
    const ex = headW * 0.08, ey = ed * side;
    // White of eye (square-ish)
    ctx.fillStyle = '#fff';
    ctx.fillRect(ex - eyeSize, ey - eyeSize, eyeSize * 2, eyeSize * 2);
    // Pupil (smaller inner square)
    const ps = eyeSize * 0.5;
    ctx.fillStyle = '#111';
    ctx.fillRect(ex - ps*0.3, ey - ps, ps, ps * 2);
    // Catchlight (single pixel dot)
    ctx.fillStyle = '#fff';
    ctx.fillRect(ex - ps*0.3 + 1, ey - ps + 1, pxSize*0.6, pxSize*0.6);
  }

  // Name tag (NPCs only, pixel font style)
  if (!s.isPlayer) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `${Math.round(10 * camZoom)}px "Courier New",monospace`;
    ctx.textAlign = 'center';
    const personaLabel = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
    ctx.fillText(personaLabel + skin.name, 0, -headH - 6 * camZoom);
  }

  // Boost fire (pixel squares)
  if (s.boosting) {
    ctx.fillStyle = '#ff9100';
    for (let i = 0; i < 3; i++) {
      const fx = -headW * (0.6 + Math.random() * 0.5);
      const fy = (Math.random() - 0.5) * headH;
      const fs = pxSize * (1.5 + Math.random());
      ctx.fillRect(fx, fy, fs, fs);
    }
  }

  ctx.restore();
};
