// --- Lava renderer: cracks + pulsing heat core + ember particles ---
bodyRenderers.lava = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const len = s.segs.length;
  const segStep = len > 200 ? 4 : len > 120 ? 3 : len > 60 ? 2 : 1;
  const time = Date.now() * 0.003;
  const effect = skin.effect || {};

  for (let i = len - 1; i >= 1; i -= segStep) {
    const seg = s.segs[i];
    const sx = worldX(seg.x), sy = worldY(seg.y);
    if (!isFinite(sx) || !isFinite(sy)) continue;
    if (sx < -r * 3 || sx > W + r * 3 || sy < -r * 3 || sy > H + r * 3) continue;

    const t = i / (len - 1);
    const drawR = r * 0.68 * 1.75;
    const alpha = 0.85 - t * 0.20;

    // Temperature-based color: hotter at head, cooler at tail
    const temp = 1 - t; // 1 = hottest (head), 0 = coolest (tail)

    // Pulsing size
    const pulse = Math.sin(time * 2.5 + i * 0.4) * 0.03;
    const pulsedR = drawR * (1 + pulse);

    // Lava gradient: bright yellow-white core → orange → red → dark
    const lg = ctx.createRadialGradient(sx, sy, 0, sx, sy, pulsedR);
    if (temp > 0.7) {
      lg.addColorStop(0, '#ffffaa'); lg.addColorStop(0.3, '#ffcc00'); lg.addColorStop(0.7, '#ff6600'); lg.addColorStop(1, '#cc2200');
    } else if (temp > 0.4) {
      lg.addColorStop(0, '#ffcc00'); lg.addColorStop(0.4, '#ff8800'); lg.addColorStop(0.8, '#cc3300'); lg.addColorStop(1, '#661100');
    } else {
      lg.addColorStop(0, '#ff8800'); lg.addColorStop(0.5, '#cc4400'); lg.addColorStop(1, '#330800');
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(sx, sy, pulsedR, 0, Math.PI*2); ctx.fill();

    // Glow
    if (effect.glowIntensity) {
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = effect.glowIntensity * temp;
      ctx.beginPath(); ctx.arc(sx, sy, pulsedR * 0.5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,200,50,${0.3 * temp})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Surface crack details (on closer segments)
    if (camZoom > 0.45 && drawR > 8) {
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, pulsedR - 0.5, 0, Math.PI*2); ctx.clip();
      ctx.strokeStyle = `rgba(40,10,0,${0.25 + (1-temp)*0.15})`;
      ctx.lineWidth = 0.8;
      // Deterministic crack pattern based on segment index
      const crackSeed = (i * 3571 + 1234) % 1000;
      for (let c = 0; c < 2; c++) {
        const cxOff = ((crackSeed*(c+73)*17)%1000)/500-1;
        const cyOff = ((crackSeed*(c+97)*31)%1000)/500-1;
        ctx.beginPath();
        ctx.moveTo(sx + cxOff*pulsedR*0.3, sy + cyOff*pulsedR*0.3);
        ctx.lineTo(sx + cxOff*pulsedR*0.6 + (c*0.1-0.05), sy + cyOff*pulsedR*0.5);
        ctx.lineTo(sx + cxOff*pulsedR*0.4, sy + cyOff*pulsedR*0.7);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
};

headRenderers.lava = function(ctx, s, skin, r) {
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
  const head = s.segs[0];
  if (!head || !isFinite(hx) || !isFinite(hy) || hx < -r * 3 || hx > W + r * 3 || hy < -r * 3 || hy > H + r * 3) return;

  const headW = r * 1.35, headH = r * 1.1;
  const headAngle = s.segs.length > 1
    ? Math.atan2(s.segs[0].y - s.segs[1].y, s.segs[0].x - s.segs[1].x)
    : s.angle;
  const time = Date.now() * 0.003;
  const effect = skin.effect || {};

  ctx.save(); ctx.translate(hx, hy); ctx.rotate(headAngle);

  // Pulsing glow
  const pulse = Math.sin(time * 2.5) * 0.04;
  const pw = headW * (1+pulse), ph = headH * (1+pulse);

  // Intense heat gradient
  const hg = ctx.createRadialGradient(-pw*0.05, -ph*0.15, pw*0.02, 0, 0, pw);
  hg.addColorStop(0, '#ffffee');
  hg.addColorStop(0.15, '#ffee55');
  hg.addColorStop(0.4, skin.head || '#ff8c00');
  hg.addColorStop(0.7, skin.body || '#ff4500');
  hg.addColorStop(1, skin.dark || '#8b0000');

  ctx.shadowColor = '#ff4400';
  ctx.shadowBlur = (effect.glowIntensity || 15) * (0.8 + Math.sin(time*3)*0.2);
  ctx.beginPath(); ctx.ellipse(0, 0, pw, ph, 0, 0, Math.PI*2); ctx.fillStyle = hg; ctx.fill();
  ctx.shadowBlur = 0;

  // Cracks on head surface
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, pw-1, ph-1, 0, 0, Math.PI*2); ctx.clip();
  ctx.strokeStyle = 'rgba(60,15,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pw*0.1, -ph*0.2); ctx.lineTo(pw*0.25, ph*0.05); ctx.lineTo(pw*0.05, ph*0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-pw*0.15, -ph*0.1); ctx.lineTo(-pw*0.3, ph*0.15); ctx.lineTo(-pw*0.1, ph*0.25); ctx.stroke();
  ctx.restore();

  // Fiery eyes (glowing orange-red)
  const ed = pw * 0.42, er = pw * 0.28;
  for (let side = -1; side <= 1; side += 2) {
    const ex = pw * 0.08, ey = ed * side;
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI*2);
    ctx.fillStyle = '#ffdd44'; ctx.fill();
    ctx.shadowBlur = 0;
    // Dark pupil
    ctx.beginPath(); ctx.arc(ex+er*0.05, ey, er*0.4, 0, Math.PI*2);
    ctx.fillStyle = '#331100'; ctx.fill();
    // Glow point
    ctx.beginPath(); ctx.arc(ex+er*0.08, ey-er*0.1, er*0.12, 0, Math.PI*2);
    ctx.fillStyle = '#ffffaa'; ctx.fill();
  }

  // Name tag (NPCs only)
  if (!s.isPlayer) {
    ctx.fillStyle = 'rgba(255,200,100,0.75)';
    ctx.font = `${Math.round(10 * camZoom)}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    const personaLabel = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
    ctx.fillText(personaLabel + skin.name, 0, -ph - 6 * camZoom);
  }

  // Boost fire (intense flames)
  if (s.boosting) {
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 15;
    for (let i = 0; i < 6; i++) {
      const fx = -pw * (0.6 + Math.random() * 0.6);
      const fy = (Math.random() - 0.5) * ph;
      const fr = pw * (0.1 + Math.random() * 0.15);
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI*2);
      ctx.fillStyle = Math.random() < 0.33 ? '#ffff66' : Math.random() < 0.5 ? '#ff8800' : '#ff3300';
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  ctx.restore();
};
