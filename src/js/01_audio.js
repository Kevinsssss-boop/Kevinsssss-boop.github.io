// ======================== 2. AUDIO ========================
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playBeep(freq, dur, type = 'sine', vol = 0.04, glide = 0) {
  if (!audioCtx || !settings.sfx) return;
  try {
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.linearRampToValueAtTime(freq + glide, t + dur);
    g.gain.setValueAtTime(Math.min(vol, 0.08), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur);
  } catch (_) {}
}
const SFX = {
  eat(food) { playBeep(500 + food.pts * 5, 0.05, 'square', 0.03); playBeep(750 + food.pts * 3, 0.03, 'sine', 0.02); },
  kill() { playBeep(200, 0.25, 'sawtooth', 0.05, -140); playBeep(100, 0.35, 'sine', 0.03); },
  powerup() { playBeep(400, 0.06, 'sine', 0.04); playBeep(600, 0.05, 'sine', 0.03); playBeep(900, 0.04, 'triangle', 0.02); },
  boost() { playBeep(60, 0.1, 'sawtooth', 0.02, 30); },
  death() { playBeep(180, 0.3, 'sawtooth', 0.06, -120); playBeep(90, 0.4, 'sine', 0.04); },
  combo(n) { playBeep(600 + n * 80, 0.04, 'square', 0.03); },
};