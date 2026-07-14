// --- Galaxy renderer: star speckles + hue shift along body ---
bodyRenderers.galaxy = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const len = s.segs.length;
  const segStep = len > 200 ? 4 : len > 120 ? 3 : len > 60 ? 2 : 1;
  const effect = skin.effect || {};
  const time = Date.now() * 0.002;

  // Parse base color as HSL for hue shifting
  const baseHex = skin.body;
  const baseR = parseInt(baseHex.slice(1,3),16), baseG = parseInt(baseHex.slice(3,5),16), baseB = parseInt(baseHex.slice(5,7),16);
  let baseHue = 0;
  // Rough RGB->HUE conversion for shifting
  const max = Math.max(baseR, baseG, baseB), min = Math.min(baseR, baseG, baseB);
  if (max !== min) {
    if (max === baseR) baseHue = ((baseG - baseB) / (max - min)) % 6;
    else if (max === baseG) baseHue = (baseB - baseR) / (max - min) + 2;
    else baseHue = (baseR - baseG) / (max - min) + 4;
    baseHue *= 60;
  }

  for (let i = len - 1; i >= 1; i -= segStep) {
    const seg = s.segs[i];
    const sx = worldX(seg.x), sy = worldY(seg.y);
    if (!isFinite(sx) || !isFinite(sy)) continue;
    if (sx < -r * 3 || sx > W + r * 3 || sy < -r * 3 || sy > H + r * 3) continue;

    const t = i / (len - 1);
    const drawR = r * 0.68 * 1.75;
    const alpha = 0.85 - t * 0.20;

    // Hue shift along body (rainbow effect)
    const hueOffset = (i / len) * 60; // 0-60 degree shift from head to tail
    const hue = (baseHue + hueOffset) % 360;
    const sat = 70 + t * 20;
    const light = 35 + (1-t) * 20;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;

    // Draw base bead
    ctx.beginPath(); ctx.arc(sx, sy, drawR, 0, Math.PI * 2); ctx.fill();

    // Star speckles on each segment (pseudo-random based on index for consistency)
    if (camZoom > 0.35 && drawR > 5) {
      // Deterministic "random" positions based on segment index
      const seed = (i * 7919 + 997) % 10000;
      const starCount = 2 + (seed % 4);
      for (let si = 0; si < starCount; si++) {
        const sxOff = (((seed * (si+1) * 137) % 10000) / 10000 - 0.5) * drawR * 1.4;
        const syOff = (((seed * (si+1) * 269) % 10000) / 10000 - 0.5) * drawR * 1.4;
        const starSize = 0.8 + ((seed*(si+3)*43)%100)/100 * 1.5;

        // Twinkle animation
        const twinkle = effect.shimmer ? (Math.sin(time * 3 + i + si*2) * 0.5 + 0.5) : 0.7;
        ctx.globalAlpha = alpha * twinkle * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx + sxOff, sy + syOff, starSize, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
};

headRenderers.galaxy = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
  const head = s.segs[0];
  if (!head || !isFinite(hx) || !isFinite(hy) || hx < -r * 3 || hx > W + r * 3 || hy < -r * 3 || hy > H + r * 3) return;

  const headW = r * 1.35, headH = r * 1.1;
  const headAngle = s.segs.length > 1
    ? Math.atan2(s.segs[0].y - s.segs[1].y, s.segs[0].x - s.segs[1].x)
    : s.angle;
  const time = Date.now() * 0.002;

  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headAngle);

  // Nebula-style multi-stop gradient
  const hg = ctx.createRadialGradient(-headW*0.08, -headH*0.18, headW*0.04, 0, 0, headW);
  hg.addColorStop(0, '#ffffff');
  hg.addColorStop(0.1, skin.head);
  hg.addColorStop(0.4, skin.body);
  hg.addColorStop(0.7, '#2a0050');
  hg.addColorStop(1, skin.dark);
  ctx.beginPath(); ctx.ellipse(0, 0, headW, headH, 0, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();

  // Subtle ring around head (like a planet ring)
  ctx.strokeStyle = `rgba(180,130,255,${0.2 + Math.sin(time)*0.1})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, headW*1.25, headH*0.4, Math.PI*0.1, 0, Math.PI*2); ctx.stroke();

  // Stars on head (animated)
  const headSeed = 42;
  for (let si = 0; si < 6; si++) {
    const ax = (((headSeed*(si+1)*137+50)%10000)/10000-0.5)*headW*1.6;
    const ay = (((headSeed*(si+1)*269+30)%10000)/10000-0.5)*headH*1.6;
    const asz = 0.8 + ((headSeed*(si+5)*43)%100)/100*1.2;
    const twinkle = Math.sin(time*4+si*1.5)*0.4+0.6;
    ctx.globalAlpha = twinkle * 0.7;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ax, ay, asz, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Dreamy eyes (slightly glowing, soft)
  const ed = headW * 0.42, er = headW * 0.3, ef = headW * 0.08;
  for (let side = -1; side <= 1; side += 2) {
    const ex = ef, ey = ed * side;
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI*2);
    ctx.fillStyle = '#e8dff5'; ctx.fill();
    // Large soft pupil with galaxy core color
    ctx.beginPath(); ctx.arc(ex+er*0.08, ey, er*0.45, 0, Math.PI*2);
    ctx.fillStyle = '#4a0080'; ctx.fill();
    // Bright center point
    ctx.beginPath(); ctx.arc(ex+er*0.1, ey, er*0.12, 0, Math.PI*2);
    ctx.fillStyle = '#c77dff'; ctx.fill();
    // Catchlight
    ctx.beginPath(); ctx.arc(ex+er*0.02, ey-er*0.12, er*0.1, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }

  // Name tag (NPCs only)
  if (!s.isPlayer) {
    ctx.fillStyle = 'rgba(200,170,255,0.7)';
    ctx.font = `${Math.round(10 * camZoom)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    const personaLabel = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
    ctx.fillText(personaLabel + skin.name, 0, -headH - 6 * camZoom);
  }

  // Boost (cosmic trail)
  if (s.boosting) {
    for (let i = 0; i < 4; i++) {
      const fx = -headW * (0.6 + Math.random() * 0.5);
      const fy = (Math.random() - 0.5) * headH;
      const fr = headW * 0.1 * Math.random();
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI*2);
      ctx.fillStyle = ['#c77dff','#7b2cbf','#e0b0ff'][i%3];
      ctx.fill();
    }
  }

  ctx.restore();
};
