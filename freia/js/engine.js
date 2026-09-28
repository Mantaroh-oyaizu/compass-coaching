/* フレイア・クロニクル — エンジン（入力・会話・フィールド・描画・保存） */
(function () {
'use strict';
const G = window.G = window.G || {};
const D = G.data, A = G.audio;
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
G.$ = $; G.sleep = sleep;
G.epoch = 0;
G.busy = false;
G.mode = 'none';
G.shake = { t: 0, mag: 0 };
G.parts = [];
G.fxLight = 1;

/* ================= レイアウト ================= */
const body = document.body;
let isTouch = (window.matchMedia && matchMedia('(pointer:coarse)').matches) || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
function layout() {
  body.classList.toggle('touch', isTouch);
  const land = window.innerWidth > window.innerHeight;
  body.classList.toggle('landscape', land); body.classList.toggle('portrait', !land);
  resizeCanvas();
}
G.layout = layout;
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));
if (window.visualViewport) visualViewport.addEventListener('resize', layout);
window.addEventListener('touchstart', () => { if (!isTouch) { isTouch = true; layout(); } }, { passive: true });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (!e.target.closest('#scrEnd,#modalBox')) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (e.target.closest('#game')) e.preventDefault(); });
G.setPads = function (show) { body.classList.toggle('hidepads', !show); resizeCanvas(); };

const cv = $('cv'), ctx = cv.getContext('2d');
const buf = document.createElement('canvas'), bctx = buf.getContext('2d');
G.view = { w: 160, h: 160, scale: 2, cssW: 0, cssH: 0, dpr: 1 };
function resizeCanvas() {
  const st = $('stage'); const r = st.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  G.view.cssW = W; G.view.cssH = H; G.view.dpr = dpr;
  let scale = W < H ? W / 168 : H / 176;
  scale = Math.max(1.5, scale);
  G.view.scale = scale;
  G.view.w = Math.ceil(W / scale); G.view.h = Math.ceil(H / scale);
}

/* ================= 入力 ================= */
const held = { up: false, down: false, left: false, right: false };
const padHeld = { up: false, down: false, left: false, right: false };
G.held = held;
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
window.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'range') return;
  const d = KEYMAP[e.code];
  if (d) {
    e.preventDefault();
    if (!e.repeat && navDir(d)) return;
    if (e.repeat && menu) { navDir(d); return; }
    held[d] = true; return;
  }
  if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') { e.preventDefault(); if (!e.repeat) pressA(); }
  else if (e.code === 'Escape' || e.code === 'KeyX' || e.code === 'Backspace') { e.preventDefault(); if (!e.repeat) pressB(); }
});
window.addEventListener('keyup', e => { const d = KEYMAP[e.code]; if (d) held[d] = false; });
window.addEventListener('blur', () => { for (const k in held) held[k] = false; for (const k in padHeld) padHeld[k] = false; });

// Dパッド
(function () {
  const pad = $('dpad'); let pid = null;
  const els = { up: pad.querySelector('.up'), down: pad.querySelector('.down'), left: pad.querySelector('.left'), right: pad.querySelector('.right') };
  function setDir(d) {
    for (const k in padHeld) { const on = k === d; if (on && !padHeld[k]) navDir(k); padHeld[k] = on; els[k].classList.toggle('on', on); held[k] = on || false; }
  }
  function fromEvent(e) {
    const r = pad.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.12) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; try { pad.setPointerCapture(pid); } catch (_) { } A.init(); setDir(fromEvent(e)); });
  pad.addEventListener('pointermove', e => { if (e.pointerId !== pid) return; setDir(fromEvent(e)); });
  const end = e => { if (e.pointerId !== pid) return; pid = null; setDir(null); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end); pad.addEventListener('lostpointercapture', end);
})();
function bindBtn(el, fn) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.classList.add('on'); A.init(); fn(); });
  const off = () => el.classList.remove('on');
  el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
}
bindBtn($('btnA'), () => pressA());
bindBtn($('btnB'), () => pressB());
$('btnMenu').addEventListener('click', () => { if (canOpenMenu()) G.openMenu(); });

/* ---------- メニューフォーカス（選択肢・戦闘コマンド） ---------- */
let menu = null; // {btns, i, cols, onCancel}
G.setMenu = function (btns, opts) {
  opts = opts || {};
  menu = { btns: btns.filter(b => !b.disabled), all: btns, i: 0, cols: opts.cols || 1, onCancel: opts.onCancel || null };
  if (opts.start != null) menu.i = Math.max(0, menu.btns.indexOf(btns[opts.start]));
  if (menu.i < 0) menu.i = 0;
  focusMenu(false);
};
G.clearMenu = function () { if (menu) menu.all.forEach(b => b.classList.remove('focus')); menu = null; };
function focusMenu(sound) { if (!menu) return; menu.btns.forEach((b, j) => b.classList.toggle('focus', j === menu.i)); if (sound) A.sfx('cursor'); }
function navDir(d) {
  if (modalMenu) { return modalNav(d); }
  if (!menu || !menu.btns.length) return false;
  const n = menu.btns.length, c = menu.cols;
  if (d === 'up') menu.i = (menu.i - c + n) % n; else if (d === 'down') menu.i = (menu.i + c) % n;
  else if (d === 'left') menu.i = (menu.i - 1 + n) % n; else if (d === 'right') menu.i = (menu.i + 1) % n;
  focusMenu(true); return true;
}
function pressA() {
  A.init();
  if (modalMenu) { const b = modalMenu.btns[modalMenu.i]; if (b) b.click(); return; }
  if (!$('modal').hidden) return;
  if (menu && menu.btns.length) { const b = menu.btns[menu.i]; if (b) b.click(); return; }
  if (dlg) { advanceDlg(); return; }
  if (G.onScreenA) { G.onScreenA(); return; }
  if (G.mode === 'field' && !G.busy) G.interact();
}
function pressB() {
  if (modalMenu) { if (modalMenu.onCancel) modalMenu.onCancel(); return; }
  if (!$('modal').hidden) return;
  if (menu && menu.onCancel) { A.sfx('cancel'); menu.onCancel(); return; }
  if (dlg) { advanceDlg(); return; }
  if (canOpenMenu()) G.openMenu();
}
G.pressA = pressA; G.pressB = pressB;
function canOpenMenu() { return G.mode === 'field' && !G.busy && !dlg && $('modal').hidden && !G.player.moving; }

/* ================= 会話 ================= */
const SPEAKERS = {
  rio: 'リオ', mina: 'ミーナ', luu: 'ルゥ', grandma: 'マルタばあちゃん', olga: 'パン屋のオルガ', pipi: 'ピピ', gant: 'ガント爺さん', lena: 'レナ',
  silva: 'シルヴァ', silvaDark: '？？？', nox: '？？？', minaQ: '？？？', luuQ: '？？？',
};
let dlg = null;
G.say = function (who, text) {
  const ep = G.epoch;
  return new Promise(res => {
    const box = $('dlg'); box.hidden = false;
    const face = who === 'minaQ' ? 'mina' : who === 'luuQ' ? 'luu' : who;
    $('dlgName').textContent = SPEAKERS[who] || '';
    const hasFace = !!SPEAKERS[who];
    $('dlgFace').classList.toggle('none', !hasFace);
    if (hasFace) G.gfx.drawFace($('faceCv'), face);
    $('dlgChoices').innerHTML = '';
    const el = $('dlgText'); el.textContent = '';
    $('dlgNext').classList.add('off');
    const st = { full: text, n: 0, done: false, t0: performance.now(), res, ep };
    dlg = st;
    st.timer = setInterval(() => {
      if (dlg !== st) { clearInterval(st.timer); return; }
      st.n = Math.min(text.length, st.n + 2);
      el.textContent = text.slice(0, st.n);
      if (st.n % 6 < 2 && text[st.n - 1] !== ' ') A.sfx('talk');
      if (st.n >= text.length) finishType(st);
    }, 30);
  });
};
function finishType(st) { clearInterval(st.timer); st.done = true; $('dlgText').textContent = st.full; $('dlgNext').classList.remove('off'); st.tDone = performance.now(); }
function advanceDlg() {
  const st = dlg; if (!st || st.choosing) return;
  if (performance.now() - st.t0 < 120) return;
  if (!st.done) { finishType(st); return; }
  if (performance.now() - st.tDone < 90) return;
  dlg = null; $('dlg').hidden = true;
  if (st.ep === G.epoch) st.res();
}
$('dlg').addEventListener('pointerdown', e => { if (e.target.closest('.choice')) return; e.preventDefault(); advanceDlg(); });
$('stage').addEventListener('pointerdown', e => { if (dlg && !e.target.closest('#dlg,#hud,#battleUI')) advanceDlg(); });
G.closeDlg = function () { if (dlg) { clearInterval(dlg.timer); dlg = null; } $('dlg').hidden = true; G.clearMenu(); };
G.dlgOpen = () => !!dlg;

G.choose = function (who, text, options) {
  const ep = G.epoch;
  return new Promise(res => {
    G.say(who, text);
    const st = dlg; st.choosing = true; finishType(st); $('dlgNext').classList.add('off');
    const wrap = $('dlgChoices'); wrap.innerHTML = '';
    const btns = options.map((o, i) => {
      const b = document.createElement('button'); b.className = 'choice'; b.textContent = o;
      b.addEventListener('click', () => {
        if (dlg !== st) return; A.sfx('ok'); G.clearMenu(); dlg = null; $('dlg').hidden = true; wrap.innerHTML = '';
        if (ep === G.epoch) res(i);
      });
      wrap.appendChild(b); return b;
    });
    G.setMenu(btns);
  });
};

G.toast = async function (html, ms) {
  const t = $('toast'); t.innerHTML = html; t.hidden = false;
  await sleep(ms || 1600); t.hidden = true;
};
G.banner = async function (text, ms) { const b = $('banner'); b.textContent = text; b.hidden = false; await sleep(ms || 1800); b.hidden = true; };
G.fade = function (to, ms, white) {
  const f = $('fader'); f.classList.toggle('white', !!white); f.style.transitionDuration = (ms || 350) + 'ms';
  f.style.opacity = to; return sleep((ms || 350) + 30);
};
G.setObj = function (t) { G.S && (G.S.obj = t); $('objText').textContent = t || ''; $('obj').classList.toggle('none', !t); };
G.doShake = function (mag, ms) { G.shake.mag = mag; G.shake.t = ms; };

/* ================= 状態・保存 ================= */
G.newState = function () {
  return { v: 1, map: 'village', x: 11, y: 10, dir: 3, flags: {}, items: { herb: 2, drop: 0 }, exp: 0, lv: 1, members: ['rio'],
    party: { rio: { hp: 38, mp: 10 }, mina: { hp: 46, mp: 6 }, luu: { hp: 32, mp: 18 } }, obj: '', night: false };
};
G.stat = function (id) {
  const S = G.S, b = D.base[id], g = D.grow[id], l = S.lv - 1;
  return { name: b.name, mhp: b.mhp + g.mhp * l, mmp: b.mmp + g.mmp * l, atk: b.atk + g.atk * l, def: b.def + g.def * l, spd: b.spd, skills: b.skills };
};
G.healAll = function () { for (const id of G.S.members) { const s = G.stat(id); G.S.party[id].hp = s.mhp; G.S.party[id].mp = s.mmp; } };
G.flag = k => !!(G.S && G.S.flags[k]);
G.setFlag = (k, v) => { G.S.flags[k] = v === undefined ? true : v; };
const SAVE_KEY = 'freia_save_v1';
G.save = function () {
  if (!G.S || G.S.flags.cleared) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.S)); } catch (e) { }
};
G.loadSave = function () { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1 && D.maps[s.map]) return s; } catch (e) { } return null; };
G.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } };

G.addExp = async function (n) {
  const S = G.S; S.exp += n; const ups = [];
  while (D.lvExp[S.lv + 1] != null && S.exp >= D.lvExp[S.lv + 1]) {
    const before = {}; S.members.forEach(id => before[id] = G.stat(id));
    S.lv++;
    S.members.forEach(id => { const a = G.stat(id), b = before[id]; S.party[id].hp += a.mhp - b.mhp; S.party[id].mp += a.mmp - b.mmp; });
    ups.push(S.lv);
  }
  return ups;
};

/* ================= フィールド ================= */
const TS = 16;
G.player = { x: 0, y: 0, px: 0, py: 0, dir: 0, moving: false, t: 0, fx: 0, fy: 0, anim: 0 };
G.followers = [];
G.ents = [];
let mapCv = [null, null], mapDef = null, grid = null;
G.enterMap = function (id, x, y, dir) {
  const S = G.S; S.map = id; S.x = x; S.y = y; if (dir != null) S.dir = dir;
  mapDef = D.maps[id]; grid = mapDef.grid;
  buildMapCanvas();
  const p = G.player; p.x = x; p.y = y; p.px = x * TS; p.py = y * TS; p.dir = S.dir; p.moving = false;
  G.rebuildFollowers();
  G.ents = (G.story.entities[id] || []).map(e => Object.assign({ px: e.x * TS, py: e.y * TS, dir: e.dir || 0 }, e));
  G.parts.length = 0;
  A.play(S.night && id === 'village' ? 'sad' : mapDef.bgm);
};
G.rebuildFollowers = function () {
  const S = G.S, p = G.player;
  G.followers = S.members.slice(1).map(id => ({ id, x: p.x, y: p.y, px: p.px, py: p.py, fx: p.x, fy: p.y, dir: p.dir, anim: 0 }));
};
function buildMapCanvas() {
  const w = grid.w, h = grid.h;
  for (let f = 0; f < 2; f++) {
    const c = document.createElement('canvas'); c.width = w * TS; c.height = h * TS; const x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = grid.g[j][i]; const T = G.gfx.TILES;
      const v = ((i * 7 + j * 13) ^ (i * j)) & 3;
      const t = D.animated.has(ch) ? T[ch + f] : (T[ch + v] || T[ch] || T['g0']);
      x.drawImage(t, i * TS, j * TS);
    }
    mapCv[f] = c;
  }
}
G.tileAt = (x, y) => (grid && grid.g[y]) ? grid.g[y][x] : '#';
function entAt(x, y) {
  for (const e of G.ents) { if (e.hidden || (e.cond && !e.cond())) continue; const w = e.w || 1, h = e.h || 1; if (x >= e.x && x < e.x + w && y >= e.y && y < e.y + h) return e; }
  return null;
}
G.entAt = entAt;
function walkable(x, y) {
  if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return false;
  if (D.solid.has(grid.g[y][x])) return false;
  const e = entAt(x, y); if (e && e.solid !== false) return false;
  return true;
}
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];
const DIRN = { down: 0, left: 1, right: 2, up: 3 };
G.DIRV = DIRV;
const STEP_MS = 165;
let bumpT = 0;
function fieldUpdate(dt) {
  const p = G.player;
  if (p.moving) {
    p.t += dt;
    const k = Math.min(1, p.t / STEP_MS);
    p.px = (p.fx + (p.x - p.fx) * k) * TS; p.py = (p.fy + (p.y - p.fy) * k) * TS;
    for (const f of G.followers) { f.px = (f.fx + (f.x - f.fx) * k) * TS; f.py = (f.fy + (f.y - f.fy) * k) * TS; }
    if (k >= 1) {
      p.moving = false; p.anim++;
      G.S.x = p.x; G.S.y = p.y; G.S.dir = p.dir;
      G.story.onStep(p.x, p.y);
    }
  }
  if (!p.moving && !G.busy && !dlg && !menu && $('modal').hidden && G.mode === 'field') {
    let d = null;
    if (held.up) d = 'up'; else if (held.down) d = 'down'; else if (held.left) d = 'left'; else if (held.right) d = 'right';
    if (d) {
      const dn = DIRN[d]; p.dir = dn;
      const nx = p.x + DIRV[dn][0], ny = p.y + DIRV[dn][1];
      const e = entAt(nx, ny);
      if (e && e.touch && (!e.cond || e.cond())) { G.run(e.touch, e); return; }
      if (walkable(nx, ny)) {
        const fl = G.followers;
        for (let i = fl.length - 1; i >= 0; i--) {
          const lead = i === 0 ? p : fl[i - 1];
          fl[i].fx = fl[i].x; fl[i].fy = fl[i].y;
          if (fl[i].x !== lead.x || fl[i].y !== lead.y) { fl[i].dir = dirTo(fl[i].x, fl[i].y, lead.x, lead.y, fl[i].dir); fl[i].x = lead.x; fl[i].y = lead.y; fl[i].anim++; }
        }
        p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.moving = true; p.t = 0;
      } else if (performance.now() - bumpT > 300) { bumpT = performance.now(); }
    }
  }
}
function dirTo(x0, y0, x1, y1, def) { if (x1 > x0) return 2; if (x1 < x0) return 1; if (y1 > y0) return 0; if (y1 < y0) return 3; return def; }
G.dirTo = dirTo;
G.interact = function () {
  const p = G.player; if (p.moving) return;
  const nx = p.x + DIRV[p.dir][0], ny = p.y + DIRV[p.dir][1];
  const e = entAt(nx, ny);
  if (e && (e.talk || e.touch)) { if (e.kind === 'npc' && !e.fixedDir) e.dir = [3, 2, 1, 0][p.dir]; G.run(e.talk || e.touch, e); return; }
  const fn = G.story.tileTalk(G.S.map, nx, ny, G.tileAt(nx, ny));
  if (fn) G.run(fn);
};
G.run = async function (fn, arg) {
  if (G.busy) return;
  G.busy = true; const ep = G.epoch;
  for (const k in held) held[k] = false;
  try { await fn(arg); } catch (err) { console.error(err); }
  if (ep !== G.epoch) return;
  G.busy = false; G.save();
};
// カットシーン用：エンティティ移動
G.moveEnt = async function (e, path, ms) {
  ms = ms || 200;
  for (const d of path) {
    const dn = typeof d === 'number' ? d : DIRN[d];
    e.dir = dn; const fx = e.x, fy = e.y; e.x += DIRV[dn][0]; e.y += DIRV[dn][1];
    const t0 = performance.now();
    await new Promise(r => { (function step() { const k = Math.min(1, (performance.now() - t0) / ms); e.px = (fx + (e.x - fx) * k) * TS; e.py = (fy + (e.y - fy) * k) * TS; e.walk = k < 1; e.anim = e.anim || 0; if (k < 1) requestAnimationFrame(step); else { e.anim = (e.anim || 0) + 1; r(); } })(); });
  }
  e.walk = false;
};
G.movePlayer = async function (path, ms) {
  const p = G.player;
  for (const d of path) {
    const dn = DIRN[d]; p.dir = dn;
    const fl = G.followers;
    for (let i = fl.length - 1; i >= 0; i--) { const lead = i === 0 ? p : fl[i - 1]; fl[i].fx = fl[i].x; fl[i].fy = fl[i].y; if (fl[i].x !== lead.x || fl[i].y !== lead.y) { fl[i].dir = dirTo(fl[i].x, fl[i].y, lead.x, lead.y, fl[i].dir); fl[i].x = lead.x; fl[i].y = lead.y; } }
    p.fx = p.x; p.fy = p.y; p.x += DIRV[dn][0]; p.y += DIRV[dn][1]; p.moving = true; p.t = 0;
    await new Promise(r => { (function w() { if (!p.moving) r(); else requestAnimationFrame(w); })(); });
  }
};
G.emote = function (target, ch, ms) { target.emote = { ch, until: performance.now() + (ms || 1200) }; };
G.sparkle = function (wx, wy, n, cols) {
  for (let i = 0; i < n; i++) G.parts.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60 - 10, life: 0.8 + Math.random() * 0.6, t: 0, col: cols[i % cols.length], s: Math.random() < 0.3 ? 2 : 1, g: 30 });
};

/* ================= 描画 ================= */
let last = performance.now(), T = 0;
let errCount = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(50, now - last); last = now; T += dt;
  try {
    if (G.mode === 'field') fieldUpdate(dt);
    if (G.shake.t > 0) G.shake.t -= dt;
    render(dt);
  } catch (e) { if (errCount++ < 5) console.error(e); }
}
G.startLoop = function () { requestAnimationFrame(frame); };
function render(dt) {
  const V = G.view;
  if (G.mode === 'battle') {
    G.battle.render(ctx, cv, dt, T);
    return;
  }
  if (G.mode !== 'field' || !grid) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
  if (buf.width !== V.w || buf.height !== V.h) { buf.width = V.w; buf.height = V.h; }
  const x = bctx; x.imageSmoothingEnabled = false;
  const p = G.player;
  let cx = Math.round(p.px + 8 - V.w / 2), cy = Math.round(p.py + 8 - V.h / 2);
  const mw = grid.w * TS, mh = grid.h * TS;
  cx = mw <= V.w ? Math.round((mw - V.w) / 2) : Math.max(0, Math.min(mw - V.w, cx));
  cy = mh <= V.h ? Math.round((mh - V.h) / 2) : Math.max(0, Math.min(mh - V.h, cy));
  if (G.shake.t > 0) { cx += Math.round((Math.random() - 0.5) * G.shake.mag); cy += Math.round((Math.random() - 0.5) * G.shake.mag); }
  G.cam = { x: cx, y: cy };
  x.fillStyle = mapDef.theme === 'dark' ? '#0a0810' : mapDef.theme === 'mist' ? '#1c2a1c' : '#2f5a2a';
  x.fillRect(0, 0, V.w, V.h);
  x.drawImage(mapCv[Math.floor(T / 500) % 2], -cx, -cy);
  // 光源（下）
  drawLampGlow(x, cx, cy, false);
  // スプライト
  const list = [];
  for (const e of G.ents) { if (e.hidden || (e.cond && !e.cond())) continue; list.push({ y: e.py + (e.h ? (e.h - 1) * TS : 0), e }); }
  G.followers.forEach((f, i) => list.push({ y: f.py - 0.1 - i * 0.01, f }));
  list.push({ y: p.py, pl: true });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.pl) drawChar(x, 'rio', p.px - cx, p.py - cy, p.dir, p.moving ? 1 + (p.anim % 2) : 0);
    else if (it.f) { const f = it.f; drawChar(x, f.id, f.px - cx, f.py - cy, f.dir, p.moving ? 1 + (f.anim % 2) : 0); }
    else drawEnt(x, it.e, cx, cy);
  }
  // パーティクル
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i]; q.t += dt / 1000; if (q.t > q.life) { G.parts.splice(i, 1); continue; }
    q.x += q.vx * dt / 1000; q.y += q.vy * dt / 1000; q.vy += (q.g || 0) * dt / 1000;
    x.globalAlpha = Math.max(0, 1 - q.t / q.life); x.fillStyle = q.col; x.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), q.s, q.s);
  }
  x.globalAlpha = 1;
  // エモート
  for (const e of G.ents.concat([p], G.followers)) {
    if (e.emote && e.emote.until > performance.now()) drawEmote(x, e.px - cx + 8, e.py - cy - 8, e.emote.ch);
  }
  // 雰囲気
  if (mapDef.theme === 'mist') drawMist(x, cx, cy);
  if (mapDef.theme === 'dark' || G.S.night) drawDark(x, p.px - cx + 8, p.py - cy + 4, cx, cy);
  drawLampGlow(x, cx, cy, true);
  // 転送
  ctx.imageSmoothingEnabled = false;
  const sw = V.w * V.scale * V.dpr, sh = V.h * V.scale * V.dpr;
  ctx.drawImage(buf, 0, 0, V.w, V.h, 0, 0, sw, sh);
}
function drawChar(x, id, sx, sy, dir, fr) {
  sx = Math.round(sx); sy = Math.round(sy);
  if (id === 'luu') {
    const s = (dir === 2 ? G.gfx.SPR.foxR : G.gfx.SPR.fox)[fr ? (fr % 2) : 0];
    x.drawImage(s, sx - 2, sy - 4 + (fr ? -1 : 0)); return;
  }
  const s = G.gfx.SPR.h[id][dir][fr % 3];
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(sx + 3, sy + 13, 10, 3);
  x.drawImage(s, sx - 1, sy - 7);
}
G.drawChar = drawChar;
function drawEnt(x, e, cx, cy) {
  const sx = Math.round(e.px - cx), sy = Math.round(e.py - cy);
  if (e.draw) { e.draw(x, sx, sy, T); return; }
  if (e.kind === 'chest') { x.drawImage(G.gfx.SPR.chest[e.opened && e.opened() ? 1 : 0], sx, sy); return; }
  if (e.look) {
    const fr = e.walk ? 1 + ((e.anim || 0) % 2) : (e.idle ? (Math.floor(T / 450) % 2 ? 0 : 1) : 0);
    drawChar(x, e.look, sx, sy + (e.bob ? Math.round(Math.sin(T / 200) * 1) : 0), e.dir, fr);
  }
}
function drawEmote(x, sx, sy, ch) {
  sx = Math.round(sx); sy = Math.round(sy) - 6;
  x.fillStyle = '#23150e'; x.fillRect(sx - 6, sy - 9, 12, 10); x.fillRect(sx - 1, sy + 1, 2, 2);
  x.fillStyle = '#fffaf0'; x.fillRect(sx - 5, sy - 8, 10, 8);
  x.fillStyle = ch === '!' ? '#d0301c' : ch === '♥' ? '#e04a7a' : '#23150e';
  if (ch === '!') { x.fillRect(sx - 1, sy - 7, 2, 4); x.fillRect(sx - 1, sy - 2, 2, 1); }
  else if (ch === '?') { x.fillRect(sx - 2, sy - 7, 4, 1); x.fillRect(sx + 1, sy - 6, 1, 2); x.fillRect(sx - 1, sy - 4, 2, 1); x.fillRect(sx - 1, sy - 2, 2, 1); }
  else if (ch === '♥') { x.fillRect(sx - 3, sy - 6, 2, 2); x.fillRect(sx + 1, sy - 6, 2, 2); x.fillRect(sx - 3, sy - 5, 6, 2); x.fillRect(sx - 2, sy - 3, 4, 1); x.fillRect(sx - 1, sy - 2, 2, 1); }
  else { x.fillRect(sx - 4, sy - 3, 2, 1); x.fillRect(sx - 1, sy - 3, 2, 1); x.fillRect(sx + 2, sy - 3, 2, 1); }
}
const mistP = []; for (let i = 0; i < 26; i++) mistP.push({ x: Math.random() * 400, y: Math.random() * 600, r: 14 + Math.random() * 26, v: 4 + Math.random() * 8 });
function drawMist(x, cx, cy) {
  const V = G.view;
  x.fillStyle = 'rgba(120,90,160,0.13)'; x.fillRect(0, 0, V.w, V.h);
  for (const m of mistP) {
    const mx = ((m.x + T * m.v / 1000 - cx * 0.6) % (V.w + 80) + V.w + 80) % (V.w + 80) - 40;
    const my = ((m.y - cy * 0.6) % (V.h + 80) + V.h + 80) % (V.h + 80) - 40;
    const g = x.createRadialGradient(mx, my, 0, mx, my, m.r); g.addColorStop(0, 'rgba(210,200,235,0.20)'); g.addColorStop(1, 'rgba(210,200,235,0)');
    x.fillStyle = g; x.fillRect(mx - m.r, my - m.r, m.r * 2, m.r * 2);
  }
}
function drawDark(x, lx, ly, cx, cy) {
  const V = G.view;
  const r = (G.S.night ? 120 : 64 + Math.sin(T / 300) * 2) * G.fxLight;
  const g = x.createRadialGradient(lx, ly, r * 0.25, lx, ly, r);
  g.addColorStop(0, 'rgba(8,4,20,0)'); g.addColorStop(1, G.S.night ? 'rgba(10,12,40,0.55)' : 'rgba(6,3,14,0.82)');
  x.fillStyle = g; x.fillRect(0, 0, V.w, V.h);
}
function drawLampGlow(x, cx, cy, top) {
  if (!mapDef) return;
  const lamps = G.story.lights(G.S.map);
  for (const l of lamps) {
    const sx = l.x * TS + 8 - cx, sy = l.y * TS + (l.oy || 3) - cy;
    const r = l.r * (1 + Math.sin(T / 180 + l.x) * 0.06);
    if (sx < -r || sy < -r || sx > G.view.w + r || sy > G.view.h + r) continue;
    const g = x.createRadialGradient(sx, sy, 0, sx, sy, r);
    const a = top ? l.a * 0.6 : l.a;
    g.addColorStop(0, `rgba(${l.c || '255,210,120'},${a})`); g.addColorStop(1, `rgba(${l.c || '255,210,120'},0)`);
    x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(sx - r, sy - r, r * 2, r * 2); x.globalCompositeOperation = 'source-over';
  }
}

/* ================= モーダル（メニュー・設定・確認） ================= */
let modalMenu = null;
function openModal(html, opts) {
  opts = opts || {};
  $('modalBody').innerHTML = html; $('modal').hidden = false;
  const btns = Array.from($('modalBody').querySelectorAll('button:not([disabled])'));
  modalMenu = { btns, i: 0, onCancel: opts.onCancel || closeModal };
  modalFocus();
}
function modalFocus() { if (!modalMenu) return; modalMenu.btns.forEach((b, j) => b.classList.toggle('focus', j === modalMenu.i)); }
function modalNav(d) { if (!modalMenu || !modalMenu.btns.length) return true; const n = modalMenu.btns.length; modalMenu.i = (modalMenu.i + (d === 'up' || d === 'left' ? -1 : 1) + n) % n; modalFocus(); A.sfx('cursor'); return true; }
function closeModal() { $('modal').hidden = true; modalMenu = null; $('modalBody').innerHTML = ''; }
G.openModal = openModal; G.closeModal = closeModal;
$('modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal' && modalMenu && modalMenu.onCancel) modalMenu.onCancel(); });

G.confirm = function (title, text, yes, no) {
  return new Promise(res => {
    openModal(`<h3>${title}</h3><p>${text}</p><div class="mrow"><button class="btn sub" id="cfNo">${no || 'やめる'}</button><button class="btn" id="cfYes">${yes || 'はい'}</button></div>`, { onCancel: () => { closeModal(); res(false); } });
    $('cfYes').onclick = () => { closeModal(); res(true); };
    $('cfNo').onclick = () => { closeModal(); res(false); };
  });
};

G.openSettings = function (back) {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  const fsOk = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  openModal(`<h3>サウンド・設定</h3>
    <label>音量 <input type="range" id="stVol" min="0" max="100" value="${Math.round(A.vol * 100)}"></label>
    <label><input type="checkbox" id="stMute" ${A.muted ? 'checked' : ''}> ミュート（音を消す）</label>
    ${fsOk ? `<div class="mrow"><button class="btn sub" id="stFs">${isFs ? '全画面を終了' : '全画面で遊ぶ'}</button></div>` : ''}
    <div class="sec ctrlHelp"><b>スマートフォン</b>：左の十字パッドで移動、Aで話す・調べる・会話を進める、Bでメニュー。戦闘はコマンドを直接タップ。<br>
    <b>パソコン</b>：矢印キー / WASDで移動、Enter・Space・Zで決定、Esc・Xでメニュー／もどる。</div>
    <div class="mrow"><button class="btn" id="stClose">とじる</button></div>`, { onCancel: () => { closeModal(); back && back(); } });
  $('stVol').oninput = e => { A.setVol(e.target.value / 100); };
  $('stVol').onchange = () => A.sfx('ok');
  $('stMute').onchange = e => { A.setMute(e.target.checked); };
  if ($('stFs')) $('stFs').onclick = () => { toggleFs(); closeModal(); back && back(); };
  $('stClose').onclick = () => { closeModal(); back && back(); };
};
function toggleFs() {
  try {
    const de = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (de.requestFullscreen || de.webkitRequestFullscreen).call(de).catch && de.requestFullscreen().catch(() => { });
  } catch (e) { }
  setTimeout(layout, 300);
}

function faceCanvas(id) {
  const c = document.createElement('canvas'); c.width = 20; c.height = 22; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (id === 'luu') x.drawImage(G.gfx.SPR.foxR[0], 0, 2); else x.drawImage(G.gfx.SPR.h[id][0][0], 1, 0);
  return c;
}
G.faceCanvas = faceCanvas;
G.openMenu = function () {
  const S = G.S; A.sfx('ok');
  let html = `<h3>メニュー</h3>`;
  S.members.forEach(id => { const s = G.stat(id), p = S.party[id]; html += `<div class="pm" data-id="${id}"><span class="fc"></span><div class="inf"><b>${s.name}</b> Lv${S.lv}　<small>${D.base[id].role}</small><br>HP ${p.hp}/${s.mhp}　MP ${p.mp}/${s.mmp}</div></div>`; });
  html += `<div class="sec"><b style="font-size:14px">どうぐ</b>`;
  let any = false;
  for (const k in S.items) { if (!S.items[k]) continue; any = true; const it = D.items[k]; html += `<div class="it"><div>${it.name} ×${S.items[k]}<small>${it.desc}</small></div>${it.key ? '' : `<button class="btn sub" data-use="${k}">つかう</button>`}</div>`; }
  if (!any) html += `<p>なにも持っていない。</p>`;
  html += `</div><div class="mrow"><button class="btn sub" id="mnMap">せかいちず</button><button class="btn sub" id="mnSet">せってい</button><button class="btn sub" id="mnTitle">タイトルへ</button><button class="btn" id="mnClose">とじる</button></div>
  <p style="font-size:12px;color:#7a5a3a;text-align:center">進行はこの端末のブラウザに自動で記録されます。</p>`;
  openModal(html);
  document.querySelectorAll('#modalBody .pm').forEach(el => el.querySelector('.fc').appendChild(faceCanvas(el.dataset.id)));
  document.querySelectorAll('#modalBody [data-use]').forEach(b => b.onclick = () => useItemField(b.dataset.use));
  $('mnClose').onclick = closeModal;
  $('mnSet').onclick = () => G.openSettings(G.openMenu);
  $('mnMap').onclick = async () => { closeModal(); G.busy = true; await G.showWorldMap('here'); G.busy = false; };
  $('mnTitle').onclick = async () => { closeModal(); const ok = await G.confirm('タイトルへ戻る', '進行はここまで記録されています。タイトルへ戻りますか？', '戻る'); if (ok) { G.save(); G.toTitle(); } };
};
function useItemField(k) {
  const S = G.S, it = D.items[k];
  let html = `<h3>${it.name}：だれに使う？</h3>`;
  S.members.forEach(id => { const s = G.stat(id), p = S.party[id]; html += `<div class="it"><div><b>${s.name}</b><small>HP ${p.hp}/${s.mhp}　MP ${p.mp}/${s.mmp}</small></div><button class="btn sub" data-t="${id}">えらぶ</button></div>`; });
  html += `<div class="mrow"><button class="btn sub" id="uiBack">もどる</button></div>`;
  openModal(html, { onCancel: G.openMenu });
  $('uiBack').onclick = G.openMenu;
  document.querySelectorAll('#modalBody [data-t]').forEach(b => b.onclick = () => {
    const id = b.dataset.t, s = G.stat(id), p = S.party[id];
    if (it.heal) p.hp = Math.min(s.mhp, p.hp + it.heal); if (it.mp) p.mp = Math.min(s.mmp, p.mp + it.mp);
    S.items[k]--; A.sfx('heal'); G.save(); G.openMenu();
  });
}
})();
