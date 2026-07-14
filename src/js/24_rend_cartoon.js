// --- Cartoon/Candy renderer: cute big eyes + glossy + bouncy ---
bodyRenderers.cartoon = function(ctx, s, skin, r) {
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
    const alpha = 0.88 - t * 0.15; // Slightly more opaque than classic

    // Color gradient (more saturated/bright)
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

    // Rounder, plumper beads
    ctx.beginPath(); ctx.arc(sx, sy, drawR * 1.05, 0, Math.PI * 2); ctx.fill();

    // Sugar/frost edge (white stroke outline)
    if (camZoom > 0.3) {
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + (1-t)*0.1})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, drawR * 1.03, 0, Math.PI * 2); ctx.stroke();
    }

    // Extra large glossy highlight (candy-like sheen)
    if (camZoom > 0.4) {
      ctx.beginPath();
      ctx.arc(sx - drawR * 0.2, sy - drawR * 0.25, drawR * 0.36, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.22 + (1-t)*0.08})`;
      ctx.fill();
      // Secondary smaller highlight
      ctx.beginPath();
      ctx.arc(sx + drawR * 0.15, sy + drawR * 0.2, drawR * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.1 + (1-t)*0.04})`;
      ctx.fill();
    }
  }
};

headRenderers.cartoon = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
  const head = s.segs[0];
  if (!head || !isFinite(hx) || !isFinite(hy) || hx < -r * 3 || hx > W + r * 3 || hy < -r * 3 || hy > H + r * 3) return;

  // Slightly larger head for cartoon look
  const headW = r * 1.42, headH = r * 1.15;
  const headAngle = s.segs.length > 1
    ? Math.atan2(s.segs[0].y - s.segs[1].y, s.segs[0].x - s.segs[1].x)
    : s.angle;

  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headAngle);

  // Plump glossy head
  const hg = ctx.createRadialGradient(-headW*0.08, -headH*0.22, headW*0.05, 0, 0, headW);
  hg.addColorStop(0, '#ffffff');
  hg.addColorStop(0.12, skin.head);
  hg.addColorStop(0.5, skin.body);
  hg.addColorStop(1, skin.dark);
  ctx.beginPath(); ctx.ellipse(0, 0, headW, headH, 0, 0, Math.PI*2); ctx.fillStyle = hg; ctx.fill();

  // Sugar rim
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, headW-1, headH-1, 0, 0, Math.PI*2); ctx.stroke();

  // BIG cute eyes (style: 'cute')
  const ed = headW * 0.44, er = headW * 0.36, ef = headW * 0.06;
  for (let side = -1; side <= 1; side += 2) {
    const ex = ef, ey = ed * side;
    // Large eye white (very round)
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
    // Big colored iris
    ctx.beginPath(); ctx.arc(ex+er*0.08, ey, er*0.72, 0, Math.PI*2);
    ctx.fillStyle = skin.body; ctx.fill();
    // Large pupil (expressive)
    ctx.beginPath(); ctx.arc(ex+er*0.12, ey, er*0.4, 0, Math.PI*2);
    ctx.fillStyle = '#222'; ctx.fill();
    // Dual catchlights (large + small for extra cuteness)
    ctx.beginPath(); ctx.arc(ex+er*0.02, ey-er*0.15, er*0.2, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex+er*0.18, ey+er*0.08, er*0.09, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }

  // Extra big blush
  const br = headW * 0.2;
  for (let side = -1; side <= 1; side += 2) {
    const bx = -headW * 0.02, by = (ed + headW * 0.04) * side;
    const bgr = ctx.createRadialGradient(bx, by, br*0.02, bx, by, br);
    bgr.addColorStop(0, 'rgba(255,120,150,0.5)'); bgr.addColorStop(1, 'rgba(255,120,150,0)');
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fillStyle = bgr; ctx.fill();
  }

  // Small smile
  ctx.strokeStyle = 'rgba(80,40,50,0.35)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(headW*0.05, headH*0.15, headW*0.12, 0.2*Math.PI, 0.8*Math.PI); ctx.stroke();

  // Name tag (NPCs only)
  if (!s.isPlayer) {
    ctx.fillStyle = 'rgba(255,180,200,0.7)';
    ctx.font = `${Math.round(11 * camZoom)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    const personaLabel = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
    ctx.fillText(personaLabel + skin.name, 0, -headH - 6 * camZoom);
  }

  // Boost (candy sparkles)
  if (s.boosting) {
    for (let i = 0; i < 5; i++) {
      const fx = -headW * (0.6 + Math.random() * 0.5);
      const fy = (Math.random() - 0.5) * headH;
      const fr = headW * (0.06 + Math.random() * 0.1);
      // Star-shaped sparkle (diamond approximation)
      ctx.fillStyle = ['#ffc0cb','#ffb6c1','#fff0a5'][i%3];
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.PI/4);
      ctx.fillRect(-fr, -fr*0.4, fr*2, fr*0.8);
      ctx.fillRect(-fr*0.4, -fr, fr*0.8, fr*2);
      ctx.restore();
    }
  }

  ctx.restore();
};
