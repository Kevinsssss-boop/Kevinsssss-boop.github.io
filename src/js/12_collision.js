// ======================== 16. COLLISION DETECTION (Spatial Hash) ========================
const spatialHash = new SpatialHash(CFG.SPATIAL_CELL);
// Pre-allocated arrays to avoid per-frame GC (reused via .length = 0)
const _aliveArr = [];
const _nearbyArr = [];
const _checkedSet = new Set();

function checkCollisions() {
  // Build spatial hash for all snake segments
  spatialHash.clear();
  _aliveArr.length = 0;
  for (let i = 0; i < snakes.length; i++) {
    if (snakes[i].alive) _aliveArr.push(snakes[i]);
  }
  const alive = _aliveArr;
  for (const s of alive) {
    // Insert a sampling of segments (more aggressive skipping for large snakes)
    const step = s.segs.length > 120 ? 5 : s.segs.length > 80 ? 3 : s.segs.length > 40 ? 2 : 1;
    for (let i = 0; i < s.segs.length; i += step) {
      spatialHash.insert({ x: s.segs[i].x, y: s.segs[i].y, snake: s, segIdx: i });
    }
  }

  for (const s of alive) {
    if (!s.alive) continue;
    const head = s.head;
    if (!head) continue;
    const sr = s.radius;
    const ghosting = s.hasPowerUp('ghost');

    // Query nearby segments (reuses pre-allocated _nearbyArr)
    spatialHash.queryInto(head.x, head.y, sr * 2 + CFG.SPATIAL_CELL * 0.6, _nearbyArr);

    // Check each nearby segment
    _checkedSet.clear();
    for (const entry of _nearbyArr) {
      const other = entry.snake;
      if (other === s) continue;
      if (!other.alive) continue;

      // Ghost power-up: pass through other snakes
      if (ghosting) continue;

      // Skip head-to-head (handled separately to avoid double-kill weirdness)
      if (entry.segIdx === 0) {
        // Head-to-head: larger snake wins
        const oh = other.head;
        const dist = Math.sqrt((head.x - oh.x) ** 2 + (head.y - oh.y) ** 2);
        if (dist < (sr + other.radius) * 0.9) {
          if (s.segs.length > other.segs.length) killSnake(other);
          else if (other.segs.length > s.segs.length) killSnake(s);
          else { killSnake(s); killSnake(other); }
          if (!s.alive) break;
          continue;
        }
      }

      // Head vs body
      // Skip first 20% of segments (grace period near head)
      const skipSegs = Math.floor(other.segs.length * CFG.COLLISION_GRACE_RATIO);
      if (entry.segIdx < skipSegs) continue;

      // Deduplicate checks per snake pair (use unique IDs)
      const pairKey = Math.min(s.id, other.id) + '_' + Math.max(s.id, other.id) + '_' + entry.segIdx;
      if (_checkedSet.has(pairKey)) continue;
      _checkedSet.add(pairKey);

      const seg = other.segs[entry.segIdx];
      const dx = head.x - seg.x, dy = head.y - seg.y;
      const collisionDist = sr * 1.3;
      if (dx * dx + dy * dy < collisionDist * collisionDist) {
        // Shield protection
        if (s.shieldActive && s.isPlayer) {
          s.shieldActive = false;
          delete s.powerups['shield'];
          particles.burst(head.x, head.y, 15, 120, 0.5, '#40c4ff', [2, 6], 0);
          showShieldBreakFlash();
          SFX.shieldBreak();
          playerStats.shieldSaves++;  // track achievement
          s._nearDeath = true;
          s._nearDeathTimer = 3;
          continue;
        }
        killSnake(s);
        break;
      }
    }
  }
}

function killSnake(s) {
  if (!s.alive) return;
  s.alive = false;
  SFX.death();

  // Death particles
  if (settings.particles) {
    const h = s.head;
    for (let i = 0; i < Math.min(s.segs.length, 40); i++) {
      const seg = s.segs[Math.floor(i * s.segs.length / 40)];
      particles.burst(seg.x, seg.y, 3, 100, 0.6, s.skin.body, [2, 5], 0);
    }
    particles.burst(h.x, h.y, 20, 180, 0.8, s.skin.glow, [3, 7], 0);
  }

  // Drop reward food based on snake size
  const dropCount = Math.min(30, 5 + Math.floor(s.segs.length / 3));
  const hx = s.head.x, hy = s.head.y;
  for (let i = 0; i < dropCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 30 + Math.random() * 80;
    foods.push({
      x: clamp(hx + Math.cos(a) * d, 30, CFG.WORLD_W - 30),
      y: clamp(hy + Math.sin(a) * d, 30, CFG.WORLD_H - 30),
      color: s.skin.glow, r: 7 + Math.random() * 5, pts: 25 + Math.floor(Math.random() * 3) * 15,
      pulse: Math.random() * Math.PI * 2, isDrop: true, eaten: false,
    });
  }

  // Give kill credit to the nearest snake
  let nearestSnake = null, nearestDist = 250;
  for (const other of snakes) {
    if (other === s || !other.alive) continue;
    const oh = other.head;
    const d = Math.sqrt((hx - oh.x) ** 2 + (hy - oh.y) ** 2);
    if (d < nearestDist) { nearestDist = d; nearestSnake = other; }
  }
  if (nearestSnake) {
    nearestSnake.kills++;
    nearestSnake._recentKill = true;
    nearestSnake._recentKillTimer = 5;  // stay in hunting mood for 5s

    // Bounty check: 3x score for killing bounty snake
    const isBountyKill = (s.id === bountySnakeId);
    const killScore = (50 + s.segs.length) * (isBountyKill ? 3 : 1);
    nearestSnake.score += killScore;

    // Achievement tracking
    if (nearestSnake.isPlayer) {
      SFX.kill();
      triggerShake(6, 0.2);
      showKillScorePopup(hx, hy, killScore);
      // Track giant kills (killed snake > 2x player size)
      if (s.segs.length > nearestSnake.segs.length * 2) {
        playerStats.giantKills++;
      }
      // Track boost kills
      if (nearestSnake.boosting && nearestSnake.boostFuel < CFG.BOOST_FUEL) {
        playerStats.boostKills++;
      }
      // Track bounty kills
      if (isBountyKill) {
        playerStats.bountyKills++;
      }
    }

    // Near-death tracking for the killed snake (if player)
    if (s.isPlayer) {
      s._nearDeath = true;  // will be saved before death
    }

    // NPC kill memory: if an NPC killed the player
    if (s.isPlayer && !nearestSnake.isPlayer && nearestSnake.npcName) {
      saveNPCKillMemory(nearestSnake.npcName);
    }

    addKillMsg(nearestSnake.isPlayer ? '你' : (nearestSnake.npcName || nearestSnake.skin.name),
              s.isPlayer ? '你' : (s.npcName || s.skin.name), nearestSnake.skin);
  }

  if (s.isPlayer) triggerShake(12, 0.35);
}
