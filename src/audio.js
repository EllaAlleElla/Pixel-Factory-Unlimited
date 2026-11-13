let ac = null, on = true;
function A() {
  if (!on) return null;
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (ac.state === "suspended") ac.resume();
  return ac;
}
function tone(f, d = 0.1, type = "square", vol = 0.05, when = 0, f2 = 0) {
  const a = A(); if (!a) return;
  const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
}
const sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
export const setSound = (v) => { on = v; };
export const sfx = {
  tap: () => tone(620, 0.04, "square", 0.03),
  pick: () => tone(440, 0.05, "triangle", 0.05, 0, 660),
  drop: () => tone(300, 0.06, "triangle", 0.05, 0, 200),
  spawn: () => tone(280, 0.14, "square", 0.04, 0, 700),
  merge: (l) => { const f = 330 * 2 ** (sc[Math.min(l, 10)] / 12); tone(f, 0.12, "triangle", 0.09); tone(f * 1.5, 0.18, "triangle", 0.06, 0.07); },
  big: () => [0, 4, 7, 12, 16].forEach((s, i) => tone(440 * 2 ** (s / 12), 0.2, "triangle", 0.08, i * 0.07)),
  coin: () => { tone(988, 0.07, "square", 0.04); tone(1319, 0.14, "square", 0.04, 0.06); },
  open: () => tone(200, 0.3, "sawtooth", 0.04, 0, 900),
  deny: () => tone(150, 0.16, "sawtooth", 0.05, 0, 100),
  level: () => [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(392 * 2 ** (s / 12), 0.16, "square", 0.05, i * 0.09)),
};
