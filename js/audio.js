/* フレイア・クロニクル — 音楽と効果音（WebAudioで合成・オリジナル曲） */
(function () {
'use strict';
const G = window.G = window.G || {};
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function freq(tok) { const m = /^([A-G][#b]?)(-?\d)$/.exec(tok); if (!m) return 0; const midi = 12 * (+m[2] + 1) + NOTE[m[1]]; return 440 * Math.pow(2, (midi - 69) / 12); }
function parse(s) { return s.replace(/\|/g, ' ').trim().split(/\s+/); }

const TRACKS = {
  title: { bpm: 76, ch: [
    { w: 'triangle', v: .22, n: 'D5 - - - A4 - D5 E5 | F5 - E5 - D5 - C5 - | D5 - - - A4 - - - | G4 - A4 - C5 - - - | D5 - - - A4 - D5 E5 | F5 - G5 - A5 - - - | G5 - F5 - E5 - C5 - | D5 - - - - - - -' },
    { w: 'sine', v: .20, n: 'D3 - A3 - D3 - A3 - | Bb2 - F3 - Bb2 - F3 - | D3 - A3 - D3 - A3 - | C3 - G3 - C3 - G3 - | D3 - A3 - D3 - A3 - | Bb2 - F3 - Bb2 - F3 - | C3 - G3 - C3 - G3 - | D3 - A3 - D3 - - -' },
    { w: 'square', v: .035, n: 'A5 F5 D5 F5 A5 F5 D5 F5 | F5 D5 Bb4 D5 F5 D5 Bb4 D5 | A5 F5 D5 F5 A5 F5 D5 F5 | G5 E5 C5 E5 G5 E5 C5 E5 | A5 F5 D5 F5 A5 F5 D5 F5 | F5 D5 Bb4 D5 F5 D5 Bb4 D5 | G5 E5 C5 E5 G5 E5 C5 E5 | A5 F5 D5 F5 A5 - - -' } ] },
  village: { bpm: 108, ch: [
    { w: 'square', v: .06, n: 'F4 - A4 - C5 - A4 - | Bb4 - A4 G4 F4 - - - | G4 - Bb4 - D5 - C5 Bb4 | A4 - - - C5 - - - | F5 - E5 - D5 - C5 - | Bb4 - D5 - C5 - A4 - | G4 - A4 Bb4 C5 - E4 - | F4 - - - - - . .' },
    { w: 'triangle', v: .22, n: 'F2 . C3 . F2 . C3 . | Bb2 . F3 . F2 . C3 . | G2 . D3 . C3 . G2 . | F2 . C3 . F2 . C3 . | D3 . A2 . Bb2 . F3 . | G2 . D3 . A2 . E3 . | Bb2 . F3 . C3 . G2 . | F2 . C3 . F2 . . .' },
    { w: 'noise', v: .025, n: '. . x . . . x . | . . x . . . x . | . . x . . . x . | . . x . . . x x | . . x . . . x . | . . x . . . x . | . . x . . . x . | . . x . x . x .' } ] },
  forest: { bpm: 116, ch: [
    { w: 'square', v: .055, n: 'A4 - C5 - E5 - D5 C5 | B4 - - - G4 - - - | A4 - C5 - E5 - G5 - | F5 - - - E5 - - - | D5 - F5 - A5 - G5 F5 | E5 - C5 - A4 - - - | B4 - C5 - D5 - E5 - | A4 - - - - - . .' },
    { w: 'triangle', v: .22, n: 'A2 E3 A2 E3 A2 E3 A2 E3 | G2 D3 G2 D3 G2 D3 G2 D3 | F2 C3 F2 C3 F2 C3 F2 C3 | E2 B2 E2 B2 E2 B2 E2 B2 | D2 A2 D2 A2 D2 A2 D2 A2 | A2 E3 A2 E3 A2 E3 A2 E3 | G2 D3 G2 D3 E2 B2 E2 B2 | A2 E3 A2 E3 A2 . . .' },
    { w: 'noise', v: .02, n: 'x . . x . . x . | x . . x . . x . | x . . x . . x . | x . . x . x x . | x . . x . . x . | x . . x . . x . | x . . x . . x . | x . . x . x . x' } ] },
  ruins: { bpm: 84, ch: [
    { w: 'triangle', v: .2, n: 'D5 - - - F5 - E5 - | D5 - - - A4 - - - | Bb4 - - - A4 - G4 - | A4 - - - - - - - | D5 - - - F5 - A5 - | G5 - - - E5 - - - | F5 - E5 - D5 - C#5 - | D5 - - - - - - -' },
    { w: 'sine', v: .22, n: 'D2 - - - A2 - - - | D2 - - - A2 - - - | G2 - - - D3 - - - | A2 - - - E3 - - - | D2 - - - A2 - - - | C3 - - - G2 - - - | Bb2 - - - A2 - - - | D2 - - - A2 - - -' },
    { w: 'square', v: .02, n: 'A5 . . . . . . . | . . . . F5 . . . | . . . . . . . . | . . E5 . . . . . | A5 . . . . . . . | . . . . G5 . . . | . . . . . . . . | . . F5 . . . . .' } ] },
  battle: { bpm: 152, ch: [
    { w: 'square', v: .055, n: 'E5 . E5 G5 . E5 D5 . | B4 - - - . . . . | C5 . C5 E5 . C5 B4 . | A4 - - - B4 - D5 - | E5 . E5 G5 . A5 B5 . | A5 - G5 - F#5 - E5 - | D5 - E5 - F#5 - D5 - | E5 - - - . . . .' },
    { w: 'triangle', v: .24, n: 'E2 E3 E2 E3 E2 E3 E2 E3 | E2 E3 E2 E3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | A1 A2 A1 A2 B1 B2 B1 B2 | E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 B1 B2 B1 B2 | E2 E3 E2 E3 E2 E3 E2 E3' },
    { w: 'noise', v: .04, n: 'x . x . x . x x | x . x . x . x x | x . x . x . x x | x . x . x x x x | x . x . x . x x | x . x . x . x x | x . x . x . x x | x x x x x . x .' } ] },
  boss: { bpm: 164, ch: [
    { w: 'square', v: .055, n: 'C5 . C5 . Eb5 . D5 C5 | G5 - - - F5 - Eb5 - | Ab4 . Ab4 . C5 . Bb4 Ab4 | G4 - - - B4 - D5 - | C5 . Eb5 . G5 . C6 - | Bb5 - Ab5 - G5 - F5 - | Eb5 - F5 - G5 - B4 - | C5 - - - . . . .' },
    { w: 'sawtooth', v: .06, n: 'C2 C2 G2 C2 C3 C2 G2 C2 | C2 C2 G2 C2 Bb1 Bb1 F2 Bb1 | Ab1 Ab1 Eb2 Ab1 Ab2 Ab1 Eb2 Ab1 | G1 G1 D2 G1 G2 G1 B1 D2 | C2 C2 G2 C2 C3 C2 G2 C2 | Ab1 Ab1 Eb2 Ab1 Bb1 Bb1 F2 Bb1 | Eb2 Eb2 Bb2 Eb2 G1 G1 D2 G1 | C2 C2 G2 C2 C2 . . .' },
    { w: 'noise', v: .045, n: 'x . x x x . x x | x . x x x . x x | x . x x x . x x | x x x x x x x x | x . x x x . x x | x . x x x . x x | x . x x x . x x | x x x x x . . .' } ] },
  sad: { bpm: 68, ch: [
    { w: 'triangle', v: .22, n: 'E5 - - - D5 - C5 - | B4 - - - A4 - - - | C5 - - - B4 - A4 - | G#4 - - - - - - - | A4 - B4 - C5 - D5 - | E5 - - - A5 - G5 - | F5 - E5 - D5 - B4 - | A4 - - - - - - -' },
    { w: 'sine', v: .2, n: 'A2 - E3 - A3 - E3 - | F2 - C3 - F3 - C3 - | D2 - A2 - D3 - A2 - | E2 - B2 - E3 - B2 - | F2 - C3 - F3 - C3 - | C2 - G2 - C3 - G2 - | D2 - A2 - E2 - B2 - | A2 - E3 - A3 - - -' } ] },
  ending: { bpm: 96, ch: [
    { w: 'square', v: .055, n: 'C5 - E5 - G5 - - - | A5 - G5 - E5 - - - | F5 - E5 - D5 - C5 - | D5 - - - - - G4 - | C5 - E5 - G5 - C6 - | B5 - A5 - G5 - E5 - | F5 - D5 - G5 - B4 - | C5 - - - - - - -' },
    { w: 'triangle', v: .22, n: 'C3 G3 C3 G3 C3 G3 C3 G3 | F2 C3 F2 C3 C3 G3 C3 G3 | F2 C3 F2 C3 C3 G3 C3 G3 | G2 D3 G2 D3 G2 D3 G2 D3 | A2 E3 A2 E3 E2 B2 E2 B2 | F2 C3 F2 C3 C3 G3 C3 G3 | F2 C3 F2 C3 G2 D3 G2 D3 | C3 G3 C3 G3 C3 . . .' },
    { w: 'noise', v: .02, n: '. . x . . . x . | . . x . . . x . | . . x . . . x . | . . x . x . x . | . . x . . . x . | . . x . . . x . | . . x . . . x . | . . x . . . . .' } ] },
  dark: { bpm: 60, ch: [
    { w: 'sine', v: .28, n: 'C2 - - - - - - - | Db2 - - - - - - - | C2 - - - - - - - | B1 - - - - - - -' },
    { w: 'triangle', v: .12, n: 'G4 - - - . . . . | Ab4 - - - . . . . | G4 - - - Eb4 - - - | D4 - - - . . . .' } ] },
};

const A = G.audio = { ctx: null, master: null, bgm: null, sfxG: null, vol: 0.6, muted: false, cur: null, timer: null, noiseBuf: null, ok: false };
try { const s = JSON.parse(localStorage.getItem('freia_audio') || 'null'); if (s) { A.vol = s.vol; A.muted = s.muted; } } catch (e) { }

A.init = function () {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => { }); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    A.ctx = new AC();
    A.master = A.ctx.createGain(); A.master.connect(A.ctx.destination);
    A.bgm = A.ctx.createGain(); A.bgm.gain.value = 0.9; A.bgm.connect(A.master);
    A.sfxG = A.ctx.createGain(); A.sfxG.gain.value = 1; A.sfxG.connect(A.master);
    const len = A.ctx.sampleRate * 0.5; A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.apply(); A.ok = true;
    if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => { });
  } catch (e) { A.ctx = null; }
};
A.apply = function () {
  if (A.master) A.master.gain.value = A.muted ? 0 : A.vol * 0.8;
  try { localStorage.setItem('freia_audio', JSON.stringify({ vol: A.vol, muted: A.muted })); } catch (e) { }
};
A.setVol = function (v) { A.vol = v; A.apply(); };
A.setMute = function (m) { A.muted = m; A.apply(); };

function tone(dest, type, f, t0, dur, vol, slideTo) {
  const c = A.ctx; let src;
  const g = c.createGain();
  if (type === 'noise') {
    src = c.createBufferSource(); src.buffer = A.noiseBuf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; src.connect(hp); hp.connect(g);
  } else {
    src = c.createOscillator(); src.type = type; src.frequency.setValueAtTime(f, t0);
    if (slideTo) src.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    src.connect(g);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.setValueAtTime(vol, t0 + Math.max(0.02, dur * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(dest); src.start(t0); src.stop(t0 + dur + 0.05);
}

A.play = function (name) {
  if (A.cur && A.cur.name === name) return;
  A.stop();
  const tr = TRACKS[name]; if (!tr) return;
  const chs = tr.ch.map(c => ({ w: c.w, v: c.v, n: parse(c.n) }));
  const len = Math.max.apply(null, chs.map(c => c.n.length));
  const step = 60 / tr.bpm / 2;
  const st = { name, chs, len, step, i: 0, next: 0 };
  A.cur = st;
  if (!A.ctx) return;
  st.next = A.ctx.currentTime + 0.08;
  A.timer = setInterval(() => {
    if (!A.ctx || A.cur !== st) return;
    while (st.next < A.ctx.currentTime + 0.2) {
      for (const ch of st.chs) {
        const tok = ch.n[st.i % ch.n.length];
        if (!tok || tok === '-' || tok === '.') continue;
        let hold = 1; while (ch.n[(st.i + hold) % ch.n.length] === '-' && hold < 16) hold++;
        if (ch.w === 'noise') tone(A.bgm, 'noise', 0, st.next, 0.05, ch.v);
        else tone(A.bgm, ch.w, freq(tok), st.next, st.step * hold * 0.95, ch.v);
      }
      st.i = (st.i + 1) % st.len; st.next += st.step;
    }
  }, 40);
};
A.stop = function () { if (A.timer) clearInterval(A.timer); A.timer = null; A.cur = null; };
A.resumeTrack = function () { if (A.cur) { const n = A.cur.name; A.cur = null; A.play(n); } };

A.sfx = function (name) {
  if (!A.ctx || A.muted) return;
  const t = A.ctx.currentTime + 0.01, d = A.sfxG;
  switch (name) {
    case 'cursor': tone(d, 'square', 880, t, 0.05, 0.05); break;
    case 'ok': tone(d, 'square', 988, t, 0.06, 0.06); tone(d, 'square', 1318, t + 0.05, 0.08, 0.06); break;
    case 'cancel': tone(d, 'square', 520, t, 0.08, 0.05, 300); break;
    case 'talk': tone(d, 'triangle', 660, t, 0.03, 0.05); break;
    case 'bump': tone(d, 'triangle', 120, t, 0.08, 0.15); break;
    case 'hit': tone(d, 'noise', 0, t, 0.12, 0.25); tone(d, 'square', 180, t, 0.12, 0.12, 60); break;
    case 'crit': tone(d, 'noise', 0, t, 0.2, 0.3); tone(d, 'sawtooth', 300, t, 0.25, 0.15, 50); break;
    case 'slash': tone(d, 'noise', 0, t, 0.08, 0.2); tone(d, 'sawtooth', 1200, t, 0.1, 0.05, 300); break;
    case 'fire': tone(d, 'sawtooth', 200, t, 0.3, 0.1, 900); tone(d, 'noise', 0, t + 0.05, 0.2, 0.15); break;
    case 'hurt': tone(d, 'square', 220, t, 0.15, 0.12, 90); break;
    case 'heal': [523, 659, 784, 1046].forEach((f, i) => tone(d, 'triangle', f, t + i * 0.06, 0.18, 0.12)); break;
    case 'moon': [880, 1175, 1397, 1760, 2093].forEach((f, i) => tone(d, 'sine', f, t + i * 0.07, 0.4, 0.09)); break;
    case 'guard': tone(d, 'square', 440, t, 0.06, 0.06); tone(d, 'square', 330, t + 0.06, 0.1, 0.06); break;
    case 'chest': [392, 523, 659, 784].forEach((f, i) => tone(d, 'square', f, t + i * 0.07, 0.12, 0.07)); break;
    case 'item': [659, 880].forEach((f, i) => tone(d, 'square', f, t + i * 0.08, 0.12, 0.06)); break;
    case 'join': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(d, 'square', f, t + i * 0.1, 0.18, 0.07)); tone(d, 'triangle', 262, t, 0.7, 0.15); break;
    case 'level': [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(d, 'square', f, t + i * 0.08, 0.14, 0.07)); break;
    case 'win': [523, 523, 523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(d, 'square', f, t + i * 0.1, 0.16, 0.07)); tone(d, 'triangle', 131, t, 0.9, 0.15); break;
    case 'warn': tone(d, 'square', 180, t, 0.18, 0.1); tone(d, 'square', 180, t + 0.25, 0.18, 0.1); tone(d, 'square', 180, t + 0.5, 0.25, 0.1); break;
    case 'roar': tone(d, 'sawtooth', 110, t, 0.9, 0.18, 40); tone(d, 'noise', 0, t, 0.7, 0.2); break;
    case 'steal': tone(d, 'sine', 1200, t, 0.4, 0.1, 200); break;
    case 'encounter': [880, 660, 880, 660, 1100].forEach((f, i) => tone(d, 'square', f, t + i * 0.05, 0.06, 0.06)); break;
    case 'lose': [392, 349, 330, 262].forEach((f, i) => tone(d, 'triangle', f, t + i * 0.25, 0.4, 0.14)); break;
    case 'spark': tone(d, 'sine', 1500, t, 0.25, 0.07, 2600); break;
  }
};
})();
