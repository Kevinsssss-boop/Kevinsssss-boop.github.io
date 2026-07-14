// --- Classic renderer (extracted from original drawSnake inline logic) ---
bodyRenderers.classic = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const len = s.segs.length;
  const segStep = len > 200 ? 4 : len > 120 ? 3 : len > 60 ? 2 : 1;

  for (let i = len - 1; i >= 1; i -= segStep) {
    const seg = s.segs[i];
    const sx = worldX(seg.x), sy = worldY(seg.y);
    if (!isFinite(sx) || !isFinite(sy)) continue;
    if (sx < -r * 3 || sx > W + r * 3 || sy < -r * 3 || sy > H + r * 3) continue;

    const t = i / (len - 1);
    const sr = r * 0.68;
    const alpha = 0.85 - t * 0.20;

    // Color gradient: head bright, tail dark
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

    const drawR = sr * 1.75;
    ctx.beginPath();
    ctx.arc(sx, sy, drawR, 0, Math.PI * 2);
    ctx.fill();

    // Subtle inner highlight on each bead for 3D "round bead" feel
    if (camZoom > 0.4) {
      ctx.beginPath();
      ctx.arc(sx - drawR * 0.22, sy - drawR * 0.22, drawR * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.14 + (1-t)*0.06})`;
      ctx.fill();
    }
  }
};

headRenderers.classic = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
  const head = s.segs[0];
  if (!head || !isFinite(hx) || !isFinite(hy) || hx < -r * 3 || hx > W + r * 3 || hy < -r * 3 || hy > H + r * 3) return;

  const headW = r * 1.35, headH = r * 1.1;
  const headAngle = s.segs.length > 1
    ? Math.atan2(s.segs[0].y - s.segs[1].y, s.segs[0].x - s.segs[1].x)
    : s.angle;

  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headAngle);

  // Head gradient
  const hg = ctx.createRadialGradient(-headW * 0.1, -headH * 0.2, headW * 0.06, 0, 0, headW);
  hg.addColorStop(0, skin.head); hg.addColorStop(0.6, skin.body); hg.addColorStop(1, skin.dark);
  ctx.beginPath(); ctx.ellipse(0, 0, headW, headH, 0, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();

  // Highlight
  ctx.beginPath(); ctx.ellipse(-headW * 0.12, -headH * 0.2, headW * 0.26, headH * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();

  // Eyes
  const ed = headW * 0.42, er = headW * 0.3, ef = headW * 0.08;
  for (let side = -1; side <= 1; side += 2) {
    const ex = ef, ey = ed * side;
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    const po = er * 0.28;
    ctx.beginPath(); ctx.arc(ex + Math.cos(s.angle - headAngle) * po, ey + Math.sin(s.angle - headAngle) * po, er * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = '#111'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + Math.cos(s.angle - headAngle) * po - er * 0.08, ey + Math.sin(s.angle - headAngle) * po - er * 0.10, er * 0.20, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }

  // Blush
  const br = headW * 0.14;
  for (let side = -1; side <= 1; side += 2) {
    const bx = -headW * 0.04, by = (ed + headW * 0.06) * side;
    const bgr = ctx.createRadialGradient(bx, by, br * 0.05, bx, by, br);
    bgr.addColorStop(0, 'rgba(255,135,150,0.4)'); bgr.addColorStop(1, 'rgba(255,135,150,0)');
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = bgr; ctx.fill();
  }

  // Name tag (NPCs only)
  if (!s.isPlayer) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `${Math.round(10 * camZoom)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    const personaLabel = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
    ctx.fillText(personaLabel + skin.name, 0, -headH - 6 * camZoom);
  }

  // Boost fire effect
  if (s.boosting) {
    for (let i = 0; i < 3; i++) {
      const fx = -headW * (0.6 + Math.random() * 0.5);
      const fy = (Math.random() - 0.5) * headH;
      const fr = headW * 0.15 * Math.random();
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() < 0.5 ? '#ff9100' : '#ffc400';
      ctx.fill();
    }
  }

  ctx.restore();
};
