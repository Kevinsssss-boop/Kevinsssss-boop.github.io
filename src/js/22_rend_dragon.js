// --- Dragon renderer: scales pattern + horns + slit pupils ---
bodyRenderers.dragon = function(ctx, s, skin, r) {
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

    // Base color gradient
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

    // Base circle
    ctx.beginPath(); ctx.arc(sx, sy, drawR, 0, Math.PI * 2); ctx.fill();

    // Scale pattern overlay (if zoomed in enough)
    if (camZoom > 0.35 && drawR > 6) {
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, drawR - 0.5, 0, Math.PI * 2); ctx.clip();
      const scaleRows = 3, scaleCols = 3;
      const spacing = (drawR * 1.6) / scaleRows;
      const baseC = { r: cr, g: cg, b: cb };

      for (let row = 0; row < scaleRows; row++) {
        for (let col = 0; col < scaleCols; col++) {
          const offsetX = (row % 2) * (spacing * 0.5);
          const scx = sx - drawR * 0.8 + col * spacing + offsetX + spacing/2;
          const scy = sy - drawR * 0.8 + row * spacing + spacing/2;

          // Alternate between lighter and darker scales
          const isLight = (row + col) % 2 === 0;
          const sr = isLight
            ? `rgb(${Math.min(255,baseC.r+40)},${Math.min(255,baseC.g+40)},${Math.min(255,baseC.b+20)})`
            : `rgb(${Math.max(0,baseC.r-30)},${Math.max(0,baseC.g-25)},${Math.max(0,baseC.b-10)})`;

          ctx.fillStyle = sr;
          ctx.globalAlpha = alpha * 0.35;
          ctx.beginPath(); ctx.arc(scx, scy, spacing * 0.38, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // Highlight
    if (camZoom > 0.4) {
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(sx - drawR * 0.22, sy - drawR * 0.22, drawR * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.12 + (1-t)*0.06})`;
      ctx.fill();
    }
  }
};

headRenderers.dragon = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
  const head = s.segs[0];
  if (!head || !isFinite(hx) || !isFinite(hy) || hx < -r * 3 || hx > W + r * 3 || hy < -r * 3 || hy > H + r * 3) return;

  const headW = r * 1.35, headH = r * 1.1;
  const headAngle = s.segs.length > 1
    ? Math.atan2(s.segs[0].y - s.segs[1].y, s.segs[0].x - s.segs[1].x)
    : s.angle;

  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headAngle);

  // Head base shape (slightly more angular for dragon)
  const hg = ctx.createRadialGradient(-headW * 0.1, -headH * 0.2, headW * 0.06, 0, 0, headW);
  hg.addColorStop(0, skin.head); hg.addColorStop(0.6, skin.body); hg.addColorStop(1, skin.dark);
  ctx.beginPath(); ctx.ellipse(0, 0, headW, headH, 0, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();

  // Horns accessory
  if (skin.accessory === 'horns') {
    const hornColor = darken(skin.body, 15);
    ctx.fillStyle = hornColor;
    // Left horn
    ctx.beginPath();
    ctx.moveTo(-headW*0.35, -headH*0.55);
    ctx.quadraticCurveTo(-headW*0.55, -headH*1.3, -headW*0.2, -headH*1.45);
    ctx.quadraticCurveTo(-headW*0.4, -headH*1.1, -headW*0.15, -headH*0.5);
    ctx.closePath(); ctx.fill();
    // Right horn
    ctx.beginPath();
    ctx.moveTo(-headW*0.35, headH*0.55);
    ctx.quadraticCurveTo(-headW*0.55, headH*1.3, -headW*0.2, headH*1.45);
    ctx.quadraticCurveTo(-headW*0.4, headH*1.1, -headW*0.15, headH*0.5);
    ctx.closePath(); ctx.fill();
    // Horn highlights
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-headW*0.32, -headH*0.58);
    ctx.quadraticCurveTo(-headW*0.48, -headH*1.15, -headW*0.23, -headH*1.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-headW*0.32, headH*0.58);
    ctx.quadraticCurveTo(-headW*0.48, headH*1.15, -headW*0.23, headH*1.3);
    ctx.stroke();
  }

  // Slit pupils (vertical, like a cat/dragon)
  const ed = headW * 0.42, er = headW * 0.28, ef = headW * 0.08;
  for (let side = -1; side <= 1; side += 2) {
    const ex = ef, ey = ed * side;
    // Eye white (larger, slightly angled)
    ctx.beginPath(); ctx.ellipse(ex, ey, er*1.1, er*0.85, side*0.15, 0, Math.PI*2);
    ctx.fillStyle = '#fffaea'; ctx.fill();
    // Slit pupil
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(ex + er*0.05, ey, er*0.15, er*0.55, 0, 0, Math.PI*2);
    ctx.fill();
    // Small glow in pupil
    ctx.fillStyle = skin.glow || '#ff6600';
    ctx.beginPath(); ctx.ellipse(ex + er*0.06, ey, er*0.06, er*0.2, 0, 0, Math.PI*2);
    ctx.fill();
  }

  // Nostril puffs
  ctx.fillStyle = 'rgba(255,200,150,0.2)';
  ctx.beginPath(); ctx.arc(-headW*0.75, -headH*0.12, headW*0.08, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-headW*0.75, headH*0.12, headW*0.08, 0, Math.PI*2); ctx.fill();

  // Name tag (NPCs only)
  if (!s.isPlayer) {
    ctx.fillStyle = 'rgba(255,230,150,0.7)';
    ctx.font = `${Math.round(10 * camZoom)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    const personaLabel = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
    ctx.fillText(personaLabel + skin.name, 0, -headH - 6 * camZoom);
  }

  // Boost fire (dragon breath: larger flames)
  if (s.boosting) {
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 4; i++) {
      const fx = -headW * (0.7 + Math.random() * 0.5);
      const fy = (Math.random() - 0.5) * headH;
      const fr = headW * (0.12 + Math.random() * 0.12);
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() < 0.4 ? '#ffcc00' : '#ff4400';
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  ctx.restore();
};
