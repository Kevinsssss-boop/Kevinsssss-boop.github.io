// ======================== 4b. SKIN RENDERERS ========================
// Strategy pattern: each skin style has its own body + head renderer
const bodyRenderers = {};
const headRenderers = {};

function drawSnake(s) {
  if (!s.alive || s.segs.length === 0) return;
  if (!s.skin || !s.skin.glow) return; // safety: invalid skin
  const W = canvas.width, H = canvas.height;
  const skin = s.skin;
  const r = s.radius * camZoom;
  if (!isFinite(r) || r <= 0) return; // safety: invalid radius

  // Safety: validate head screen position
  const hx0 = worldX(s.segs[0].x), hy0 = worldY(s.segs[0].y);
  if (!isFinite(hx0) || !isFinite(hy0)) return;

  // Quick cull: skip non-player snakes far off-screen
  const margin = r * 8;
  if (!s.isPlayer && (hx0 < -margin || hx0 > W + margin || hy0 < -margin || hy0 > H + margin)) return;

  // Ghost effect
  if (s.hasPowerUp('ghost')) {
    ctx.globalAlpha = 0.45;
  }

  // === Body: dispatch to style-specific renderer ===
  ctx.save();
  const renderStyle = skin.style || 'classic';
  if (bodyRenderers[renderStyle]) {
    bodyRenderers[renderStyle](ctx, s, skin, r);
  } else {
    bodyRenderers.classic(ctx, s, skin, r);
  }
  ctx.restore();

  // Shield effect
  if (s.shieldActive) {
    const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
    ctx.save();
    ctx.strokeStyle = 'rgba(64,196,255,0.7)';
    ctx.lineWidth = 3 * camZoom;
    ctx.shadowColor = 'rgba(64,196,255,0.6)';
    ctx.shadowBlur = 12 * camZoom;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // === Head: dispatch to style-specific renderer ===
  if (headRenderers[renderStyle]) {
    headRenderers[renderStyle](ctx, s, skin, r);
  } else {
    headRenderers.classic(ctx, s, skin, r);
  }

  // ---- Bounty crown + NPC name overlay ----
  drawBountyIndicator(ctx, s, r);

  // Draw NPC name + revenge indicator above head (overrides skin.name from head renderer)
  if (!s.isPlayer && s.npcName) {
    const hx = worldX(s.segs[0].x), hy = worldY(s.segs[0].y);
    if (isFinite(hx) && isFinite(hy)) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `bold ${Math.round(10 * camZoom)}px "PingFang SC","Microsoft YaHei",sans-serif`;
      ctx.textAlign = 'center';
      const personaEmoji = s.personality ? { hunter: '🔪', scavenger: '🍽️', survivor: '🛡️' }[s.personality] || '' : '';
      const revengeCount = getNPCRevengeCount(s.npcName);
      const revengeMark = revengeCount > 0 ? ' ⚠️' : '';
      ctx.fillText(personaEmoji + s.npcName + revengeMark, hx, hy - r * 1.8);
      ctx.restore();
    }
  }

  // Reset ghost alpha
  if (s.hasPowerUp('ghost')) {
    ctx.globalAlpha = 1;
  }
}