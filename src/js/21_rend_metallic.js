// --- Metallic renderer: chrome reflections + linear gradients ---
bodyRenderers.metallic = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const len = s.segs.length;
  const segStep = len > 200 ? 4 : len > 120 ? 3 : len > 60 ? 2 : 1;

  for (let i = len - 1; i >= 1; i -= segStep) {
    const seg = s.segs[i];
    const sx = worldX(seg.x), sy = worldY(seg.y);
    if (!isFinite(sx) || !isFinite(sy)) continue;
    if (sx < -r * 3 || sx > W + r * 3 || sy < -r * 3 || sy > H + r * 3) continue;

    const t = i / (len - 1);
    const drawR = r * 0.68 * 1.75;
    const alpha = 0.85 - t * 0.20;

    // Interpolate color
    const cr = Math.round(
      parseInt(skin.head.slice(1, 3), 16) * (1 - t) +
      parseInt(skin.dark.slice(1, 3), 16) * t
    );
    const cg = Math.round(
      parseInt(skin.head.slice(3, 5), 16) * (1 - t) +
      parseInt(skin.dark.slice(3, 5), 16) * t
    );
    const cb = Math.round(
      parseInt(skin.head.slice(1, 3), 16) * (1 - t) +
      parseInt(skin.dark.slice(1, 3), 16) * t
    );

    ctx.globalAlpha = alpha;

    // Rounded rectangle shape for metallic look
    const size = drawR * 1.8;
    ctx.beginPath();
    const cornerR = size * 0.2;
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

    // Linear gradient for metallic sheen (diagonal)
    const lg = ctx.createLinearGradient(sx - size/2, sy - size/2, sx + size/2, sy + size/2);
    lg.addColorStop(0, `rgba(${cr*0.4},${cg*0.4},${cb*0.4},1)`);
    lg.addColorStop(0.25, `rgba(${Math.min(255,cr*1.4)},${Math.min(255,cg*1.4)},${Math.min(255,cb*1.4)},1)`);
    lg.addColorStop(0.5, `rgb(${cr},${cg},${cb})`);
    lg.addColorStop(0.75, `rgba(${cr*0.6},${cg*0.6},${cb*0.6},1)`);
    lg.addColorStop(1, `rgba(${cr*0.3},${cg*0.3},${cb*0.3},1)`);
    ctx.fillStyle = lg;
    ctx.fill();

    // Sharp specular highlight stripe (the "chrome" reflection)
    if (camZoom > 0.4) {
      ctx.save();
      ctx.clip(); // Clip to the rounded rect
      // Diagonal reflection band
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(sx - size*0.3, sy - size*0.5);
      ctx.lineTo(sx + size*0.1, sy - size*0.5);
      ctx.lineTo(sx - size*0.3, sy + size*0.3);
      ctx.lineTo(sx - size*0.5, sy + size*0.1);
      ctx.closePath();
      ctx.fill();
      // Secondary smaller reflection
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(sx + size*0.1, sy - size*0.2);
      ctx.lineTo(sx + size*0.35, sy - size*0.2);
      ctx.lineTo(sx + size*0.1, sy + size*0.15);
      ctx.lineTo(sx - size*0.1, sy - size*0.05);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
};

headRenderers.metallic = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
  const head = s.segs[0];
  if (!head || !isFinite(hx) || !isFinite(hy) || hx < -r * 3 || hx > W + r * 3 || hy < -r * 3 || hy > H + r * 3) return;

  const headW = r * 1.35, headH = r * 1.1;
  const headAngle = s.segs.length > 1
    ? Math.atan2(s.segs[0].y - s.segs[1].y, s.segs[0].x - s.segs[1].x)
    : s.angle;

  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headAngle);

  // Chrome head shape
  ctx.beginPath();
  const cR = headW * 0.15;
  ctx.moveTo(-headW + cR, -headH);
  ctx.lineTo(headW - cR, -headH);
  ctx.quadraticCurveTo(headW, -headH, headW, -headH + cR);
  ctx.lineTo(headW, headH - cR);
  ctx.quadraticCurveTo(headW, headH, headW - cR, headH);
  ctx.lineTo(-headW + cR, headH);
  ctx.quadraticCurveTo(-headW, headH, -headW, headH - cR);
  ctx.lineTo(-headW, -headH + cR);
  ctx.quadraticCurveTo(-headW, -headH, -headW + cR, -headH);
  ctx.closePath();

  // Metallic gradient
  const hg = ctx.createLinearGradient(-headW, -headH, headW, headH);
  hg.addColorStop(0, skin.dark);
  hg.addColorStop(0.2, lighten(skin.body, 30));
  hg.addColorStop(0.45, skin.head);
  hg.addColorStop(0.55, skin.body);
  hg.addColorStop(0.8, darken(skin.body, 20));
  hg.addColorStop(1, skin.dark);
  ctx.fillStyle = hg; ctx.fill();

  // Chrome reflection highlights
  ctx.save(); ctx.clip();
  // Main diagonal glare
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(-headW*0.5, -headH);
  ctx.lineTo(-headW*0.1, -headH);
  ctx.lineTo(-headW*0.5, -headH*0.2);
  ctx.lineTo(-headW*0.7, -headH*0.4);
  ctx.closePath(); ctx.fill();
  // Small secondary glare
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.moveTo(headW*0.1, -headH*0.6);
  ctx.lineTo(headW*0.35, -headH*0.6);
  ctx.lineTo(headW*0.1, -headH*0.2);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Robot/LED eyes (style: 'robot')
  const ed = headW * 0.42, er = headW * 0.26;
  for (let side = -1; side <= 1; side += 2) {
    const ex = headW * 0.08, ey = ed * side;
    // LED housing (dark rectangle)
    ctx.fillStyle = '#222';
    ctx.fillRect(ex - er, - er*0.6 + ey, er * 2, er * 1.2);
    // LED glow
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(ex - er*0.5, -er*0.3 + ey, er, er*0.6);
    // LED highlight
    ctx.fillStyle = 'rgba(255,150,150,0.6)';
    ctx.fillRect(ex - er*0.4, -er*0.2 + ey, er*0.3, er*0.15);
  }

  // Name tag (NPCs only)
  if (!s.isPlayer) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.round(10 * camZoom)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    const personaLabel = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
    ctx.fillText(personaLabel + skin.name, 0, -headH - 6 * camZoom);
  }

  // Boost fire (metallic sparks)
  if (s.boosting) {
    for (let i = 0; i < 3; i++) {
      const fx = -headW * (0.6 + Math.random() * 0.5);
      const fy = (Math.random() - 0.5) * headH;
      const fr = headW * 0.12 * Math.random();
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() < 0.5 ? '#e0e0e0' : '#ffcc00';
      ctx.fill();
    }
  }

  ctx.restore();
};
