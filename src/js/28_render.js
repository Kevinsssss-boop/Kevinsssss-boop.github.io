// ======================== 21. RENDERER ========================
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');

// ---- Offscreen blob caches (pre-rendered to avoid per-segment/food gradient creation) ----
const blobSize = 64;  // normalized segment radius in the offscreen canvas
const blobCache = {}; // keyed by skin.id -> offscreen canvas
function getBlob(skin) {
  if (blobCache[skin.id]) return blobCache[skin.id];
  const c = document.createElement('canvas');
  c.width = c.height = blobSize;
  const cx = c.getContext('2d');
  const half = blobSize / 2;
  const grad = cx.createRadialGradient(half * 0.82, half * 0.78, half * 0.06, half, half, half);
  grad.addColorStop(0, skin.body); grad.addColorStop(1, skin.dark);
  cx.beginPath(); cx.arc(half, half, half * 0.95, 0, Math.PI * 2);
  cx.fillStyle = grad; cx.fill();
  // Highlight dot
  cx.beginPath(); cx.arc(half * 0.84, half * 0.78, half * 0.22, 0, Math.PI * 2);
  cx.fillStyle = 'rgba(255,255,255,0.12)'; cx.fill();
  blobCache[skin.id] = c;
  return c;
}

// Food blob cache
const foodBlobCache = {}; // keyed by color -> offscreen canvas
function getFoodBlob(color) {
  if (foodBlobCache[color]) return foodBlobCache[color];
  const c = document.createElement('canvas');
  c.width = c.height = blobSize;
  const cx = c.getContext('2d');
  const half = blobSize / 2;
  const g = cx.createRadialGradient(half * 0.85, half * 0.78, half * 0.05, half, half, half);
  g.addColorStop(0, '#fff'); g.addColorStop(0.3, color); g.addColorStop(1, darken(color, 0.4));
  cx.beginPath(); cx.arc(half, half, half * 0.9, 0, Math.PI * 2);
  cx.fillStyle = g; cx.fill();
  cx.beginPath(); cx.arc(half * 0.82, half * 0.74, half * 0.25, 0, Math.PI * 2);
  cx.fillStyle = 'rgba(255,255,255,0.3)'; cx.fill();
  foodBlobCache[color] = c;
  return c;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Background dot-grid cache
let bgCache = null, bgCacheZoom = 0, bgCacheCamX = 0, bgCacheCamY = 0;
let bgCacheCooldown = 0; // frames until regeneration allowed
const BG_CACHE_PAD = 350;

function drawBackground() {
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#faf5ef';
  ctx.fillRect(0, 0, W, H);

  // Regenerate dot grid when zoom changes > 5% (with cooldown to prevent thrashing)
  const zoomChanged = Math.abs(bgCacheZoom - camZoom) > 0.05;
  if (bgCacheCooldown > 0) bgCacheCooldown--;
  if (!bgCache || (zoomChanged && bgCacheCooldown <= 0)) {
    const cw = W + BG_CACHE_PAD * 2, ch = H + BG_CACHE_PAD * 2;
    bgCache = document.createElement('canvas');
    bgCache.width = cw; bgCache.height = ch;
    const bctx = bgCache.getContext('2d');
    const gs = 50 / camZoom;
    const cacheLeft = camX - (W / 2 + BG_CACHE_PAD) / camZoom;
    const cacheTop  = camY - (H / 2 + BG_CACHE_PAD) / camZoom;
    const startX = Math.floor(cacheLeft / gs) * gs;
    const startY = Math.floor(cacheTop / gs) * gs;
    const endX = cacheLeft + cw / camZoom + gs;
    const endY = cacheTop + ch / camZoom + gs;
    bctx.fillStyle = 'rgba(180,160,140,0.07)';
    for (let x = startX; x <= endX; x += gs) {
      for (let y = startY; y <= endY; y += gs) {
        if (x < 0 || x > CFG.WORLD_W || y < 0 || y > CFG.WORLD_H) continue;
        const sx = (x - cacheLeft) * camZoom, sy = (y - cacheTop) * camZoom;
        const dotSize = 1.2 + Math.abs(Math.sin(x * 0.03 + y * 0.02)) * 1.5;
        bctx.fillRect(sx - dotSize, sy - dotSize, dotSize * 2, dotSize * 2);
      }
    }
    bgCacheZoom = camZoom;
    bgCacheCamX = camX;
    bgCacheCamY = camY;
    bgCacheCooldown = 30; // don't regenerate for 30 frames
  }

  // Draw cached dots — shift by camera movement since cache was built
  const dx = (bgCacheCamX - camX) * camZoom;
  const dy = (bgCacheCamY - camY) * camZoom;
  ctx.drawImage(bgCache, Math.round(dx - BG_CACHE_PAD), Math.round(dy - BG_CACHE_PAD));

  // World border / Shrink zone glow
  ctx.save();
  const bx = worldX(safeBounds.minX), by = worldY(safeBounds.minY);
  const bw = (safeBounds.maxX - safeBounds.minX) * camZoom;
  const bh2 = (safeBounds.maxY - safeBounds.minY) * camZoom;

  // Draw deadly zone outside safe bounds (red tint)
  if (shrinkProgress > 0) {
    const alpha = 0.25 + Math.sin(frameCount * 0.08) * 0.08;
    ctx.fillStyle = `rgba(255,40,40,${alpha})`;
    // Top strip
    const worldTop = worldY(0);
    if (by > worldTop) ctx.fillRect(0, 0, canvas.width, by);
    // Bottom strip
    const worldBot = worldY(CFG.WORLD_H);
    if (by + bh2 < worldBot) ctx.fillRect(0, by + bh2, canvas.width, canvas.height - (by + bh2));
    // Left strip
    const worldLeft = worldX(0);
    if (bx > worldLeft) ctx.fillRect(0, by, bx, bh2);
    // Right strip
    const worldRight = worldX(CFG.WORLD_W);
    if (bx + bw < worldRight) ctx.fillRect(bx + bw, by, canvas.width - (bx + bw), bh2);
  }

  // Safe zone border (pulsing red when shrinking)
  if (shrinkProgress > 0) {
    ctx.strokeStyle = `rgba(255,80,80,${0.6 + Math.sin(frameCount * 0.1) * 0.3})`;
    ctx.lineWidth = 5 + Math.sin(frameCount * 0.15) * 2;
    ctx.setLineDash([12, 6]);
    ctx.lineDashOffset = -frameCount * 2;
  } else {
    ctx.strokeStyle = 'rgba(255,100,140,0.5)';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
  }
  ctx.strokeRect(bx, by, bw, bh2);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawFoods() {
  const W = canvas.width, H = canvas.height;
  for (const f of foods) {
    const sx = worldX(f.x), sy = worldY(f.y);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;

    const bounce = 1 + Math.sin(foodPulse * 2.5 + f.pulse) * 0.1;
    const r = f.r * bounce * camZoom;

    if (f.isRiskFood) {
      // Risk food: purple glow + light pillar
      const pillarAlpha = 0.35 + Math.sin(foodPulse * 3 + f.pulse) * 0.2;
      ctx.fillStyle = `rgba(199,125,255,${pillarAlpha})`;
      ctx.fillRect(sx - r * 0.4, sy - r * 3, r * 0.8, r * 3);
      ctx.beginPath(); ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(199,125,255,0.25)'; ctx.fill();
      const foodBlob = getFoodBlob(f.color);
      ctx.drawImage(foodBlob, sx - r, sy - r, r * 2, r * 2);
      // Sparkle cross
      const sc = r * 1.8;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5 * camZoom;
      ctx.beginPath(); ctx.moveTo(sx - sc, sy); ctx.lineTo(sx + sc, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy - sc); ctx.lineTo(sx, sy + sc); ctx.stroke();
    } else if (f.isDrop || f.isGolden) {
      // Drop/golden food: simple glow + sparkle (blob body below)
      ctx.beginPath(); ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,215,64,0.2)'; ctx.fill();
      const foodBlob = getFoodBlob(f.color);
      ctx.drawImage(foodBlob, sx - r, sy - r, r * 2, r * 2);
      // Sparkle cross
      const sc = r * 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.2 * camZoom;
      ctx.beginPath(); ctx.moveTo(sx - sc, sy); ctx.lineTo(sx + sc, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy - sc); ctx.lineTo(sx, sy + sc); ctx.stroke();
    } else {
      // Normal food — use pre-rendered blob for speed
      const foodBlob = getFoodBlob(f.color);
      // Quick glow (single arc, no gradient object needed)
      ctx.beginPath(); ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = f.color + '33'; ctx.fill();
      // Blob body
      ctx.drawImage(foodBlob, sx - r, sy - r, r * 2, r * 2);
    }
  }
}

function drawPowerUpsOnMap() {
  const W = canvas.width, H = canvas.height;
  for (const pu of powerups) {
    const sx = worldX(pu.x), sy = worldY(pu.y);
    if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;

    const r = pu.r * camZoom;
    const rot = Math.sin(pu.pulse) * 0.25;

    // Glow
    const glowR = r * 2.5;
    const glow = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, glowR);
    glow.addColorStop(0, pu.type.color + '88'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();

    // Outer ring
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot);
    ctx.strokeStyle = pu.type.color; ctx.lineWidth = 2.5 * camZoom;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Icon
    ctx.fillStyle = '#fff'; ctx.font = `${Math.round(r * 1.2)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pu.type.icon, sx, sy);
  }
}


function drawParticles() {
  if (!settings.particles) return;
  const W = canvas.width, H = canvas.height;
  for (const p of particles.pool) {
    if (p.dead) continue;
    const sx = worldX(p.x), sy = worldY(p.y);
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.r * camZoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawMinimap() {
  mctx.clearRect(0, 0, 140, 105);
  mctx.fillStyle = 'rgba(0,0,0,0.55)';
  mctx.fillRect(0, 0, 140, 105);

  // Border
  mctx.strokeStyle = 'rgba(255,100,140,0.4)'; mctx.lineWidth = 1.2;
  mctx.strokeRect(1, 1, 138, 103);

  // Foods (sampled)
  for (let i = 0; i < foods.length; i += 2) {
    const f = foods[i];
    const mx = 1 + (f.x / CFG.WORLD_W) * 138;
    const my = 1 + (f.y / CFG.WORLD_H) * 103;
    mctx.fillStyle = f.isDrop ? '#ffd740' : f.color;
    mctx.fillRect(mx - 0.5, my - 0.5, f.isDrop ? 2 : 1.2, f.isDrop ? 2 : 1.2);
  }

  // Snakes
  for (const s of snakes) {
    if (!s.alive) continue;
    for (let i = 0; i < s.segs.length; i += Math.max(1, Math.floor(s.segs.length / 40))) {
      const seg = s.segs[i];
      const mx = 1 + (seg.x / CFG.WORLD_W) * 138;
      const my = 1 + (seg.y / CFG.WORLD_H) * 103;
      mctx.fillStyle = s.isPlayer ? '#fff' : s.skin.body;
      mctx.fillRect(mx - (s.isPlayer ? 1.2 : 0.8), my - (s.isPlayer ? 1.2 : 0.8), s.isPlayer ? 2.8 : 1.8, s.isPlayer ? 2.8 : 1.8);
    }
  }

  // Power-ups on minimap
  for (const pu of powerups) {
    const mx = 1 + (pu.x / CFG.WORLD_W) * 138;
    const my = 1 + (pu.y / CFG.WORLD_H) * 103;
    mctx.fillStyle = pu.type.color;
    mctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
  }

  // Viewport — cam is center, compute actual top-left
  const viewLeft = camX - canvas.width / (2 * camZoom);
  const viewTop  = camY - canvas.height / (2 * camZoom);
  const vx = 1 + (viewLeft / CFG.WORLD_W) * 138;
  const vy = 1 + (viewTop / CFG.WORLD_H) * 103;
  const vw = (canvas.width / camZoom / CFG.WORLD_W) * 138;
  const vh = (canvas.height / camZoom / CFG.WORLD_H) * 103;
  mctx.strokeStyle = 'rgba(255,255,255,0.5)'; mctx.lineWidth = 0.8;
  mctx.strokeRect(vx, vy, Math.min(vw, 138 - vx), Math.min(vh, 103 - vy));
}

function drawPauseOverlay() {
  if (state !== 'paused') return;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 28px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⏸ 已暂停', W / 2, H / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('按 P 或空格继续', W / 2, H / 2 + 34);
  ctx.textAlign = 'start';
}
