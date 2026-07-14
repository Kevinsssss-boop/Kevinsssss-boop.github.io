// ======================== BOUNTY SYSTEM ========================
let bountySnakeId = null;

function updateBounty() {
  // Find the alive snake with the highest score
  let best = null, bestScore = -1;
  for (const s of snakes) {
    if (!s.alive) continue;
    if (s.score > bestScore) { bestScore = s.score; best = s; }
  }
  bountySnakeId = best ? best.id : null;
}

function getBountySnake() {
  if (bountySnakeId === null) return null;
  for (const s of snakes) {
    if (s.alive && s.id === bountySnakeId) return s;
  }
  return null;
}

// Draw bounty crown above a snake's head (called from drawSnake)
function drawBountyIndicator(ctx, s, r) {
  if (s.id !== bountySnakeId) return;
  const W = canvas.width, H = canvas.height;
  const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
  if (!isFinite(hx) || !isFinite(hy) || hx < -50 || hx > W + 50 || hy < -50 || hy > H + 50) return;

  const crownY = hy - r * 2.2;
  const crownSize = r * 0.8;

  // Golden glow aura
  ctx.save();
  const glow = ctx.createRadialGradient(hx, crownY, crownSize * 0.2, hx, crownY, crownSize * 1.5);
  glow.addColorStop(0, 'rgba(255,215,0,0.5)');
  glow.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(hx, crownY, crownSize * 1.5, 0, Math.PI * 2); ctx.fill();

  // Crown icon
  ctx.fillStyle = '#ffd700';
  ctx.font = `${Math.round(crownSize * 1.6)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('👑', hx, crownY);
  ctx.restore();
}
