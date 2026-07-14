// ======================== RANDOM EVENT SYSTEM ========================
const EVENT_TYPES = [
  { id: 'food_rain', name: '食物雨', icon: '🌧️', duration: 12, desc: '地图降下额外食物！',
    color: '#ffd740',
    onStart() {
      for (let i = 0; i < 30; i++) {
        foods.push({
          x: 50 + Math.random() * (CFG.WORLD_W - 100),
          y: 50 + Math.random() * (CFG.WORLD_H - 100),
          r: 6 + Math.random() * 4, color: '#ffd740',
          pts: 15, pulse: Math.random() * Math.PI * 2,
          isDrop: true, eaten: false,
        });
      }
    },
    onEnd() {},
    onTick(dt) {},
  },
  { id: 'speed_frenzy', name: '速度狂潮', icon: '⚡', duration: 10, desc: '所有蛇速度 ×1.5，Boost 不耗燃料！',
    color: '#ffeb3b',
    onStart() {
      window._eventSpeedFrenzy = true;
    },
    onEnd() { window._eventSpeedFrenzy = false; },
    onTick(dt) {},
  },
  { id: 'ghost_time', name: '幽灵时刻', icon: '👻', duration: 8, desc: '所有蛇获得 Ghost 能力！',
    color: '#b388ff',
    onStart() {
      for (const s of snakes) {
        if (s.alive) s.powerups['ghost'] = Math.max(s.powerups['ghost'] || 0, 8);
      }
    },
    onEnd() {},
    onTick(dt) {},
  },
  { id: 'magnetic_storm', name: '磁暴', icon: '🧲', duration: 10, desc: '所有食物缓慢移向最近的蛇！',
    color: '#e040fb',
    onStart() {},
    onEnd() {},
    onTick(dt) {
      // Gently pull foods toward nearest snakes
      for (const f of foods) {
        if (f.eaten) continue;
        let nearest = null, nearestDist = Infinity;
        for (const s of snakes) {
          if (!s.alive) continue;
          const dx = s.head.x - f.x, dy = s.head.y - f.y;
          const d = dx * dx + dy * dy;
          if (d < nearestDist) { nearestDist = d; nearest = s; }
        }
        if (nearest && nearestDist > 400) {
          const dx = nearest.head.x - f.x, dy = nearest.head.y - f.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const pullSpeed = 60;
          f.x += dx / d * pullSpeed * dt;
          f.y += dy / d * pullSpeed * dt;
          f.x = clamp(f.x, 10, CFG.WORLD_W - 10);
          f.y = clamp(f.y, 10, CFG.WORLD_H - 10);
        }
      }
    },
  },
  { id: 'doom_zone', name: '末日边缘', icon: '💀', duration: 12, desc: '地图边缘出现致命红色区域！',
    color: '#ff5252',
    onStart() {
      window._eventDoomMargin = 300; // deadly margin from edges
    },
    onEnd() { window._eventDoomMargin = 0; },
    onTick(dt) {},
  },
];

let eventTimer = 25 + Math.random() * 20;  // first event after 25-45s
let currentEvent = null;
let eventTimeLeft = 0;
let eventPulse = 0;

function initEvents() {
  eventTimer = 25 + Math.random() * 20;
  if (currentEvent && currentEvent.onEnd) currentEvent.onEnd();
  currentEvent = null;
  eventTimeLeft = 0;
  eventPulse = 0;
}

function updateEvents(dt) {
  if (currentEvent) {
    eventTimeLeft -= dt;
    eventPulse += dt * 4;
    if (currentEvent.onTick) currentEvent.onTick(dt);

    if (eventTimeLeft <= 0) {
      if (currentEvent.onEnd) currentEvent.onEnd();
      currentEvent = null;
      eventTimeLeft = 0;
      eventTimer = 25 + Math.random() * 20;  // next event in 25-45s
    }
  } else {
    eventTimer -= dt;
    if (eventTimer <= 0) {
      // Pick a random event
      const idx = Math.floor(Math.random() * EVENT_TYPES.length);
      currentEvent = EVENT_TYPES[idx];
      eventTimeLeft = currentEvent.duration;
      eventPulse = 0;
      if (currentEvent.onStart) currentEvent.onStart();
      // Show event announcement
      showEventAnnouncement(currentEvent);
    }
  }
}

function showEventAnnouncement(evt) {
  const el = document.createElement('div');
  el.className = 'event-announce';
  el.innerHTML = `<span style="font-size:28px">${evt.icon}</span> <strong>${evt.name}</strong><br><span style="font-size:11px;color:rgba(255,255,255,0.7)">${evt.desc}</span>`;
  el.style.borderColor = evt.color;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2200);
}

// Draw event HUD indicator and effects overlay
function drawEventHUD() {
  if (!currentEvent) return;
  // Event indicator top-center
  const W = canvas.width;
  const alpha = 0.7 + Math.sin(eventPulse) * 0.3;
  ctx.save();
  ctx.fillStyle = currentEvent.color;
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 13px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${currentEvent.icon} ${currentEvent.name} ${Math.ceil(eventTimeLeft)}s`, W / 2, 28);
  ctx.restore();

  // Doom zone: draw deadly red margins
  if (currentEvent.id === 'doom_zone' && window._eventDoomMargin > 0) {
    const margin = window._eventDoomMargin;
    ctx.save();
    ctx.fillStyle = `rgba(255,30,30,${0.2 + Math.sin(eventPulse) * 0.08})`;
    // Top
    const topH = margin * camZoom;
    ctx.fillRect(0, 0, canvas.width, topH);
    // Bottom
    const botH = margin * camZoom;
    ctx.fillRect(0, canvas.height - botH, canvas.width, botH);
    // Left
    const leftW = margin * camZoom;
    ctx.fillRect(0, topH, leftW, canvas.height - topH - botH);
    // Right
    const rightW = margin * camZoom;
    ctx.fillRect(canvas.width - rightW, topH, rightW, canvas.height - topH - botH);
    ctx.restore();
  }
}
