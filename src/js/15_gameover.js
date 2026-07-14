// ======================== 20. GAME OVER ========================
function endGame() {
  state = 'over';
  const sorted = [...snakes].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const player = snakes.find(s => s.isPlayer && !s.isPlayer2);
  const p2 = snakes.find(s => s.isPlayer2);

  // Calculate survive time (timer counts UP in endless/hunter, DOWN in other modes)
  const surviveTime = (mode === 'endless' || mode === 'hunter')
    ? timer
    : (CFG.GAME_DURATION - Math.max(0, timer));

  // Track survival time on player
  if (player) player._surviveTime = surviveTime;

  // ---- Achievement + Stats Updates ----
  if (player) {
    const prank = sorted.findIndex(s => s === player) + 1;
    playerStats.gamesPlayed++;
    playerStats.totalKills += player.kills;
    playerStats.totalFood += player.foodEaten;
    playerStats.totalScore += player.score;
    if (prank === 1) playerStats.rankFirst++;
    if (player.score > playerStats.bestScore) playerStats.bestScore = player.score;
    if (player.kills > playerStats.bestKills) playerStats.bestKills = player.kills;
    if (player.maxLength > playerStats.bestLength) playerStats.bestLength = player.maxLength;
    if (surviveTime > playerStats.bestTime) playerStats.bestTime = Math.round(surviveTime);
    _persistAchievements();

    // Check achievements
    checkAchievements(player);

    // Save to leaderboard
    saveLB({
      score: player.score,
      kills: player.kills,
      food: player.foodEaten,
      length: player.maxLength,
      time: surviveTime.toFixed(1),
      skin: player.skin.name,
      date: new Date().toLocaleDateString(),
      mode: mode,
    });
  }

  showPanel('game-over-panel');
  document.getElementById('btn-pause').classList.add('hidden');
  document.getElementById('hud-fuel').classList.add('hidden');
  document.getElementById('hud-powerup').classList.add('hidden');

  // Title — mode-specific
  let aliveCount = 0;
  for (const s of snakes) { if (s.alive) aliveCount++; }

  if (mode === 'hunter') {
    document.getElementById('go-title').textContent = '🔪 狩猎结束';
    document.getElementById('go-winner').textContent = `你击杀了 ${player ? player.kills : 0} 条蛇！`;
  } else if (mode === 'endless') {
    document.getElementById('go-title').textContent = '💀 你死了';
    document.getElementById('go-winner').textContent = `存活了 ${Math.round(surviveTime)} 秒 | 得分: ${player ? player.score : 0}`;
  } else if (player && player.alive && aliveCount === 1) {
    document.getElementById('go-title').textContent = '🎉 胜利!';
    document.getElementById('go-winner').textContent = '你是最后的幸存者!';
  } else if (mode !== 'endless' && mode !== 'hunter' && timer <= 0) {
    document.getElementById('go-title').textContent = '⏰ 时间到';
    document.getElementById('go-winner').textContent = `🏆 ${winner ? (winner.npcName || winner.skin.name) : '-'} 获胜! (${winner ? winner.score : 0}分)`;
  } else {
    document.getElementById('go-title').textContent = '💀 你死了';
    document.getElementById('go-winner').textContent = `🏆 ${winner ? (winner.npcName || winner.skin.name) : '-'} 获胜! (${winner ? winner.score : 0}分)`;
  }

  const prank = sorted.findIndex(s => s === player) + 1;
  document.getElementById('go-result').textContent = `你的排名: 第 ${prank || '-'} 名 | 得分: ${player ? player.score : 0}`;

  // Stats — detailed breakdown
  if (player) {
    const finalLength = player.maxLength;
    const largestKill = player.kills > 0 ? ` | 击杀: ${player.kills}` : '';
    document.getElementById('go-stats').textContent =
      `吃食物: ${player.foodEaten} | 最大长度: ${finalLength} | 存活: ${Math.round(surviveTime)}秒${largestKill}`;
  }

  // Leaderboard
  const lb = loadLB();
  const lbEl = document.getElementById('go-lb');
  if (lb.length > 0) {
    let html = '<h3>🏆 排行榜 Top 10</h3>';
    const playerEntry = player ? { score: player.score, date: new Date().toLocaleDateString(), skin: player.skin.name } : null;
    lb.slice(0, 10).forEach((e, i) => {
      const isMe = playerEntry && e.score === playerEntry.score && e.date === playerEntry.date && e.skin === playerEntry.skin;
      html += `<div class="row${isMe ? ' me' : ''}"><span>${i + 1}. ${e.skin}</span><span>${e.score}分 🔪${e.kills || 0} ${e.mode ? '('+e.mode+')' : ''}</span></div>`;
    });
    lbEl.innerHTML = html;
  } else {
    lbEl.innerHTML = '<h3>🏆 排行榜</h3><div style="color:#888;font-size:12px">暂无记录</div>';
  }

  // Trigger shake
  if (player && !player.alive) triggerShake(14, 0.4);
}
