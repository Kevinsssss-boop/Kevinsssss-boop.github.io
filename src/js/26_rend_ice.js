// --- Ice crystal renderer: hexagonal facets + translucent + frost ---
bodyRenderers.ice = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const len = s.segs.length;
  const segStep = len > 200 ? 4 : len > 120 ? 3 : len > 60 ? 2 : 1;
  const effect = skin.effect || {};
  const time = Date.now() * 0.002;

  for (let i = len - 1; i >= 1; i -= segStep) {
    const seg = s.segs[i];
    const sx = worldX(seg.x), sy = worldY(seg.y);
    if (!isFinite(sx) || !isFinite(sy)) continue;
    if (sx < -r * 3 || sx > W + r * 3 || sy < -r * 3 || sy > H + r * 3) continue;

    const t = i / (len - 1);
    const drawR = r * 0.68 * 1.75;
    const alpha = (0.75 - t * 0.15); // More translucent

    // Color interpolation
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

    // Hexagonal ice crystal shape
    const size = drawR * 1.1;
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const angle = (Math.PI / 3) * j - Math.PI / 6;
      const px = sx + Math.cos(angle) * size;
      const py = sy + Math.sin(angle) * size;
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Ice gradient (cold blue tones)
    const ig = ctx.createLinearGradient(sx - size, sy - size, sx + size, sy + size);
    ig.addColorStop(0, `rgba(${Math.min(255,cr+60)},${Math.min(255,cg+80)},${Math.min(255,cb+40)},0.9)`);
    ig.addColorStop(0.5, `rgb(${cr},${cg},${cb})`);
    ig.addColorStop(1, `rgba(${Math.max(0,cr-30)},${Math.max(0,cg-10)},${cb},0.85)`);
    ctx.fillStyle = ig; ctx.fill();

    // Inner facet lines (crystal structure)
    if (camZoom > 0.4 && size > 6) {
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + (1-t)*0.08})`;
      ctx.lineWidth = 0.5;
      // 3 inner facet lines from center to edges
      for (let f = 0; f < 3; f++) {
        const angle = (Math.PI / 3) * f;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(angle) * size * 0.9, sy + Math.sin(angle) * size * 0.9);
        ctx.stroke();
      }
    }

    // Subtle frost glow
    if (effect.glowIntensity) {
      ctx.shadowColor = skin.glow || '#aaddff';
      ctx.shadowBlur = effect.glowIntensity * 0.4;
      ctx.beginPath(); ctx.arc(sx, sy, size * 0.3, 0, Math.PI*2);
      ctx.fillStyle = `rgba(200,240,255,${0.12 * (1-t)})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
};

headRenderers.ice = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
  const head = s.segs[0];
  if (!head || !isFinite(hx) || !isFinite(hy) || hx < -r * 3 || hx > W + r * 3 || hy < -r * 3 || hy > H + r * 3) return;

  const headW = r * 1.35, headH = r * 1.1;
  const headAngle = s.segs.length > 1
    ? Math.atan2(s.segs[0].y - s.segs[1].y, s.segs[0].x - s.segs[1].x)
    : s.angle;
  const time = Date.now() * 0.002;
  const effect = skin.effect || {};

  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headAngle);

  // Hexagonal-ish head shape (ice crystal facet style)
  ctx.beginPath();
  const points = [];
  for (let j = 0; j < 12; j++) {
    const angle = (Math.PI / 6) * j;
    const rx = j % 2 === 0 ? headW : headW * 0.82;
    const ry = j % 2 === 0 ? headH : headH * 0.85;
    points.push({ x: Math.cos(angle) * rx, y: Math.sin(angle) * ry });
  }
  ctx.moveTo(points[0].x, points[0].y);
  for (let j = 1; j < points.length; j++) ctx.lineTo(points[j].x, points[j].y);
  ctx.closePath();

  // Crystal gradient
  const hg = ctx.createRadialGradient(-headW*0.08, -headH*0.2, headW*0.04, 0, 0, headW);
  hg.addColorStop(0, '#ffffff');
  hg.addColorStop(0.15, skin.head || '#e0ffff');
  hg.addColorStop(0.5, skin.body || '#87ceeb');
  hg.addColorStop(1, skin.dark || '#4682b4');

  // Frost glow
  ctx.shadowColor = skin.glow || '#aaddff';
  ctx.shadowBlur = (effect.glowIntensity || 10) * (0.8 + Math.sin(time*2)*0.2);
  ctx.fillStyle = hg; ctx.fill();
  ctx.shadowBlur = 0;

  // Facet lines on head
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 0.8;
  for (let f = 0; f < 4; f++) {
    const ang = (Math.PI / 4) * f + 0.3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang)*headW*0.1, Math.sin(ang)*headH*0.1);
    ctx.lineTo(Math.cos(ang)*headW*0.85, Math.sin(ang)*headH*0.85);
    ctx.stroke();
  }

  // Crystalline eyes (faceted, icy look)
  const ed = headW * 0.42, er = headW * 0.28;
  for (let side = -1; side <= 1; side += 2) {
    const ex = headW * 0.08, ey = ed * side;
    // Diamond-shaped eye outline
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(side*0.1);
    ctx.beginPath();
    ctx.moveTo(0, -er); ctx.lineTo(er*0.7, 0); ctx.lineTo(0, er); ctx.lineTo(-er*0.7, 0);
    ctx.closePath();
    ctx.fillStyle = '#d0f0ff'; ctx.fill();
    ctx.strokeStyle = 'rgba(150,220,255,0.4)'; ctx.lineWidth=0.8; ctx.stroke();
    // Inner diamond pupil
    ctx.beginPath();
    ctx.moveTo(0, -er*0.45); ctx.lineTo(er*0.25, 0); ctx.lineTo(0, er*0.45); ctx.lineTo(-er*0.25, 0);
    ctx.closePath();
    ctx.fillStyle = '#4488aa'; ctx.fill();
    // Bright facet highlight
    ctx.beginPath(); ctx.arc(-er*0.08, -er*0.15, er*0.12, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
    ctx.restore();
  }

  // Name tag (NPCs only)
  if (!s.isPlayer) {
    ctx.fillStyle = 'rgba(180,230,255,0.7)';
    ctx.font = `${Math.round(10 * camZoom)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    const personaLabel = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
    ctx.fillText(personaLabel + skin.name, 0, -headH - 6 * camZoom);
  }

  // Boost (ice crystals / frost mist)
  if (s.boosting) {
    ctx.fillStyle = 'rgba(200,240,255,0.6)';
    for (let i = 0; i < 5; i++) {
      const fx = -headW * (0.6 + Math.random() * 0.5);
      const fy = (Math.random() - 0.5) * headH;
      const fs = headW * (0.08 + Math.random() * 0.1);
      // Small hexagon crystal
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.random()*Math.PI);
      ctx.beginPath();
      for (let h = 0; h < 6; h++) {
        const ha = (Math.PI/3)*h;
        const hx2 = Math.cos(ha)*fs, hy2 = Math.sin(ha)*fs;
        if (h===0) ctx.moveTo(hx2, hy2); else ctx.lineTo(hx2, hy2);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
};
