/* フレイア・クロニクル — ドット絵生成（外部画像なし） */
(function () {
'use strict';
const G = window.G = window.G || {};

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rng(seed) { let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hex(c) { c = c.replace('#', ''); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
function shade(c, amt) { const [r, g, b] = hex(c); const f = v => Math.max(0, Math.min(255, Math.round(v + amt))).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }
function outline(c, col) {
  col = col || '#23150e';
  const x = c.getContext('2d'), w = c.width, h = c.height;
  const id = x.getImageData(0, 0, w, h), d = id.data, a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { if (d[i * 4 + 3] > 110) { a[i] = 1; d[i * 4 + 3] = 255; } else d[i * 4 + 3] = 0; }
  const [r, g, b] = hex(col);
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
    const i = y * w + X; if (a[i]) continue;
    if ((X > 0 && a[i - 1]) || (X < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w])) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
  }
  x.putImageData(id, 0, 0); return c;
}
function flip(c) { const o = mk(c.width, c.height), x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; }
function tint(c, color, alpha) {
  const o = mk(c.width, c.height), x = o.getContext('2d');
  x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = alpha == null ? 1 : alpha; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return o;
}
G.gfx = { mk, rng, shade, outline, flip, tint };

/* ---------- 人物 ---------- */
// dir: 0下 1左 2右 3上 / frame: 0,1,2
function humanoid(L, dir, frame) {
  if (dir === 2) return flip(humanoid(L, 1, frame));
  const c = mk(18, 23), x = c.getContext('2d');
  const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px + 1, py + 2, w, h); };
  const skin = L.skin || '#f4c9a0', hair = L.hair || '#5a3b24', cl = L.cloth || '#3f6fb0', cl2 = L.cloth2 || shade(cl, -35);
  const pants = L.pants || '#4a3a2e', boots = L.boots || '#5a3822', eye = '#2a1d1a';
  const fr = frame || 0;
  // 脚
  if (L.dress) {
    if (dir === 1) { P(5, 15, 7, 3, cl); P(5 + (fr === 1 ? -1 : 0), 18, 2, 1, boots); P(9 + (fr === 2 ? 1 : 0), 18, 2, 1, boots); }
    else { P(4, 15, 8, 3, cl); P(5, 18 - (fr === 1 ? 1 : 0), 2, 1, boots); P(9, 18 - (fr === 2 ? 1 : 0), 2, 1, boots); }
  } else if (dir === 1) {
    if (fr === 0) { P(6, 15, 4, 2, pants); P(6, 17, 2, 2, boots); P(8, 17, 2, 2, boots); }
    else if (fr === 1) { P(4, 15, 2, 2, pants); P(3, 17, 3, 2, boots); P(9, 15, 2, 2, pants); P(9, 17, 2, 2, boots); }
    else { P(5, 15, 2, 2, pants); P(5, 17, 2, 2, boots); P(8, 15, 2, 2, pants); P(9, 17, 2, 2, boots); }
  } else {
    const ly = fr === 1 ? -1 : 0, ry = fr === 2 ? -1 : 0;
    P(5, 15 + ly, 2, 2, pants); P(5, 17 + ly, 2, 2, boots);
    P(9, 15 + ry, 2, 2, pants); P(9, 17 + ry, 2, 2, boots);
  }
  // 胴
  if (dir === 1) {
    P(5, 10, 6, 5, cl); P(5, 14, 6, 1, cl2);
    const sw = fr === 1 ? -1 : fr === 2 ? 1 : 0;
    P(7 + sw, 10, 2, 3, cl2); P(7 + sw, 13, 2, 1, skin);
  } else {
    P(5, 10, 6, 5, cl); P(5, 14, 6, 1, cl2);
    const la = fr === 1 ? -1 : 0, ra = fr === 2 ? -1 : 0;
    P(4, 10, 1, 3 + la, cl2); P(4, 13 + la, 1, 1, skin);
    P(11, 10, 1, 3 + ra, cl2); P(11, 13 + ra, 1, 1, skin);
  }
  if (L.armor) {
    const ar = '#c9cfdc';
    if (dir === 1) { P(5, 10, 6, 3, ar); P(6, 10, 3, 1, '#eef1f7'); }
    else { P(5, 10, 6, 3, ar); P(3, 10, 2, 2, ar); P(11, 10, 2, 2, ar); P(6, 10, 2, 1, '#eef1f7'); }
  }
  if (L.apron && dir !== 3) P(dir === 1 ? 5 : 6, 11, 4, 4, '#f6f0e2');
  if (L.robe && dir !== 3) P(dir === 1 ? 6 : 7, 10, 2, 5, shade(cl, 30));
  // 頭
  if (dir === 0) {
    P(4, 4, 8, 5, skin); P(5, 9, 6, 1, skin);
    P(4, 0, 8, 1, hair); P(3, 1, 10, 3, hair); P(3, 4, 1, 4, hair); P(12, 4, 1, 4, hair);
    P(4, 4, 2, 1, hair); P(7, 4, 2, 1, hair); P(10, 4, 2, 1, hair);
    P(5, 6, 1, 2, eye); P(10, 6, 1, 2, eye);
    P(4, 8, 1, 1, '#eea38c'); P(11, 8, 1, 1, '#eea38c');
    if (L.beard) { P(5, 8, 6, 2, L.beard); }
  } else if (dir === 3) {
    P(4, 0, 8, 1, hair); P(3, 1, 10, 8, hair); P(4, 9, 8, 1, hair);
  } else {
    P(3, 4, 6, 5, skin); P(4, 9, 5, 1, skin);
    P(4, 0, 8, 1, hair); P(3, 1, 10, 3, hair); P(9, 4, 4, 5, hair); P(3, 4, 2, 1, hair); P(8, 4, 1, 2, hair);
    P(4, 6, 1, 2, eye); P(5, 8, 1, 1, '#eea38c');
    if (L.beard) P(3, 8, 5, 2, L.beard);
  }
  // 髪型
  if (L.style === 'spiky') {
    if (dir === 1) { P(5, -1, 1, 1, hair); P(8, -1, 2, 1, hair); P(12, 1, 2, 2, hair); }
    else { P(4, -1, 1, 1, hair); P(7, -1, 2, 1, hair); P(11, -1, 1, 1, hair); P(2, 2, 1, 2, hair); P(13, 2, 1, 2, hair); }
  } else if (L.style === 'pony') {
    const band = L.band || '#e9b44c';
    if (dir === 0) { P(13, 2, 2, 5, hair); P(13, 1, 2, 1, band); }
    else if (dir === 3) { P(7, 8, 2, 5, hair); P(7, 8, 2, 1, band); }
    else { P(13, 2, 2, 6, hair); P(14, 7, 1, 2, hair); P(12, 2, 1, 1, band); }
  } else if (L.style === 'bun') {
    P(6, -2, 4, 2, hair);
  } else if (L.style === 'long') {
    if (dir === 0) { P(3, 8, 1, 4, hair); P(12, 8, 1, 4, hair); }
    else if (dir === 3) { P(3, 9, 10, 3, hair); }
    else { P(9, 9, 4, 3, hair); }
  }
  if (L.hat) {
    const h2 = shade(L.hat, -30);
    if (dir === 1) { P(3, -1, 10, 3, L.hat); P(2, 2, 12, 1, h2); }
    else { P(4, -1, 8, 3, L.hat); P(2, 2, 12, 1, h2); }
  }
  // 小物
  if (L.scarf) {
    const s = L.scarf, s2 = shade(s, -40);
    if (dir === 0) { P(5, 10, 6, 1, s); P(10, 11, 2, 2, s2); }
    else if (dir === 3) { P(5, 10, 6, 1, s); P(6, 11, 2, 3 + (fr ? 1 : 0), s2); }
    else { P(5, 10, 5, 1, s); P(10, 10, 2, 1, s); P(11 + (fr === 1 ? 1 : 0), 11, 2, 1, s2); }
  }
  if (L.lantern) {
    if (dir === 0) { P(12, 13, 2, 2, '#ffd35a'); P(12, 12, 2, 1, '#6b4a2a'); }
    else if (dir === 1) { P(9, 13, 2, 2, '#ffd35a'); }
  }
  if (L.sword) {
    if (dir === 0) P(3, 9, 1, 6, '#b9c2d6');
    else if (dir === 3) { P(12, 8, 1, 7, '#8a6030'); }
    else P(10, 11, 1, 5, '#8a6030');
  }
  if (L.cane && dir !== 3) { P(dir === 1 ? 2 : 13, 9, 1, 10, '#8a5a2b'); }
  return outline(c);
}

/* ---------- 月狐（フィールド用） ---------- */
function foxField(frame, pal) {
  const c = mk(20, 20), x = c.getContext('2d');
  pal = pal || { fur: '#eef2ff', fur2: '#c3cdf0', mark: '#7fc8ff', tail: '#dfe6ff', tip: '#9fd6ff' };
  const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px + 1, py + 2, w, h); };
  const f = frame || 0, t = f === 1 ? -1 : 0;
  // 尻尾
  P(12, 3 + t, 4, 7, pal.tail); P(14, 1 + t, 3, 4, pal.tail); P(15, 0 + t, 2, 2, pal.tip); P(13, 3 + t, 1, 5, pal.fur2);
  // 体
  P(6, 8, 8, 4, pal.fur); P(6, 11, 8, 1, pal.fur2);
  // 脚
  if (f === 0) { P(6, 12, 1, 3, pal.fur2); P(8, 12, 1, 3, pal.fur); P(11, 12, 1, 3, pal.fur2); P(13, 12, 1, 3, pal.fur); }
  else { P(5, 12, 1, 3, pal.fur2); P(9, 12, 1, 2, pal.fur); P(10, 12, 1, 3, pal.fur2); P(14, 12, 1, 2, pal.fur); }
  // 頭
  P(2, 4, 6, 5, pal.fur); P(0, 7, 3, 2, pal.fur); P(0, 7, 1, 1, '#2a2440');
  P(3, 1, 1, 3, pal.fur); P(4, 2, 1, 2, pal.fur); P(6, 1, 1, 3, pal.fur); P(7, 2, 1, 2, pal.fur);
  P(3, 2, 1, 2, pal.mark); P(6, 2, 1, 2, pal.mark);
  P(3, 6, 2, 2, '#2a2440'); P(3, 6, 1, 1, '#ffffff');
  P(5, 4, 1, 1, pal.mark);
  P(2, 9, 4, 1, pal.fur2);
  return outline(c, '#2a2238');
}

/* ---------- 戦闘用モンスター ---------- */
function prep(w, h) { const c = mk(w, h); const x = c.getContext('2d'); return [c, x]; }
function ell(x, cx, cy, rx, ry, col) { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); }
function poly(x, pts, col) { x.fillStyle = col; x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); x.fill(); }
function px(x, a, b, w, h, col) { x.fillStyle = col; x.fillRect(a, b, w, h); }

function mKinokon() {
  const [c, x] = prep(26, 26);
  ell(x, 10, 23, 3, 2, '#d9b98a'); ell(x, 16, 23, 3, 2, '#d9b98a');
  x.fillStyle = '#f3e3c7'; x.beginPath(); x.roundRect ? x.roundRect(7, 11, 12, 12, 4) : x.rect(7, 11, 12, 12); x.fill();
  px(x, 7, 20, 12, 2, '#dcc7a2');
  ell(x, 13, 10, 11, 7, '#c8453a'); px(x, 2, 10, 22, 3, '#f1dcc0'); ell(x, 13, 7, 9, 4, '#dc5a48');
  ell(x, 8, 7, 2, 2, '#fff6e8'); ell(x, 15, 5, 2.4, 2, '#fff6e8'); ell(x, 20, 9, 1.6, 1.6, '#fff6e8');
  px(x, 10, 15, 2, 3, '#2a1d1a'); px(x, 15, 15, 2, 3, '#2a1d1a'); px(x, 12, 19, 3, 1, '#8a4a3a');
  px(x, 9, 18, 2, 1, '#f0a0a0'); px(x, 16, 18, 2, 1, '#f0a0a0');
  return outline(c);
}
function mMosslin() {
  const [c, x] = prep(28, 24);
  ell(x, 14, 15, 12, 8, '#5f9e4a'); ell(x, 14, 10, 8, 6, '#5f9e4a'); ell(x, 11, 9, 4, 3, '#8cc46a');
  ell(x, 14, 20, 11, 3, '#4a8438');
  px(x, 8, 5, 3, 3, '#3f7a33'); px(x, 13, 3, 3, 3, '#3f7a33'); px(x, 18, 5, 3, 3, '#3f7a33');
  px(x, 14, 1, 1, 2, '#3f7a33'); ell(x, 14.5, 1.5, 1.5, 1.5, '#f6d24a');
  ell(x, 10, 13, 2.5, 3, '#ffffff'); ell(x, 18, 13, 2.5, 3, '#ffffff');
  px(x, 10, 13, 2, 2, '#1e2a18'); px(x, 18, 13, 2, 2, '#1e2a18');
  px(x, 12, 18, 4, 1, '#2d5a22');
  return outline(c, '#1d2f15');
}
function mFox(corrupt, big) {
  // 右向きに座る狐（敵側で使うため）
  const W = big ? 92 : 34, H = big ? 70 : 30, s = big ? 2.6 : 1;
  const [c, x] = prep(W, H);
  x.save(); if (big) x.translate(2, 0); x.scale(s, s);
  const fur = corrupt ? '#4a3668' : '#eef2ff', fur2 = corrupt ? '#2e2145' : '#c3cdf0', mark = corrupt ? '#ff3b6b' : '#7fc8ff', tail = corrupt ? '#3a2a58' : '#e2e8ff', tip = corrupt ? '#9b4dff' : '#a6daff';
  // 尻尾
  poly(x, [4, 22, 2, 12, 5, 4, 10, 2, 12, 8, 10, 16, 8, 24], tail);
  poly(x, [5, 4, 10, 2, 11, 6, 7, 8], tip);
  // 体
  ell(x, 15, 20, 8, 7, fur); ell(x, 15, 24, 8, 3, fur2);
  // 前脚
  px(x, 19, 20, 3, 8, fur); px(x, 22, 21, 2, 7, fur2);
  // 頭
  ell(x, 23, 12, 6, 5.5, fur); poly(x, [26, 12, 32, 14, 26, 16], fur); px(x, 31, 13, 2, 2, '#2a2440');
  poly(x, [18, 9, 19, 1, 23, 7], fur); poly(x, [23, 7, 26, 0, 28, 8], fur);
  poly(x, [19, 8, 19.5, 3, 22, 7], mark); poly(x, [24, 7, 26, 2, 27, 8], mark);
  // 目
  if (corrupt) { px(x, 24, 11, 3, 2, '#ff2a4a'); px(x, 25, 11, 1, 1, '#fff'); }
  else { px(x, 24, 10, 2, 3, '#2a2440'); px(x, 24, 10, 1, 1, '#ffffff'); }
  px(x, 21, 9, 2, 1, mark);
  ell(x, 23, 16, 3, 1.3, fur2);
  if (!big && !corrupt) { px(x, 21, 15, 1, 1, '#f3a7c0'); }
  x.restore();
  return outline(c, corrupt ? '#120a1c' : '#2a2238');
}
function mStarShard() {
  const [c, x] = prep(14, 14);
  poly(x, [7, 0, 9, 5, 14, 7, 9, 9, 7, 14, 5, 9, 0, 7, 5, 5], '#fff3b0'); ell(x, 7, 7, 2.5, 2.5, '#ffffff');
  return outline(c, '#8a6a1c');
}

/* ---------- タイル ---------- */
const TS = 16;
function tile(seed, fn) { const c = mk(TS, TS), x = c.getContext('2d'); fn(x, rng(seed)); return c; }
function speck(x, r, n, cols) { for (let i = 0; i < n; i++) { x.fillStyle = cols[(r() * cols.length) | 0]; x.fillRect((r() * 16) | 0, (r() * 16) | 0, 1, 1); } }
function grassBase(x, r, dark) {
  x.fillStyle = dark ? '#4c8743' : '#6aa84f'; x.fillRect(0, 0, 16, 16);
  speck(x, r, 22, dark ? ['#3f7538', '#5a9a4e', '#447d3c'] : ['#5b9442', '#7dbb5c', '#63a048']);
  for (let i = 0; i < 2; i++) { const a = (r() * 14) | 0, b = (r() * 13 + 2) | 0; x.fillStyle = dark ? '#356a31' : '#4e8a3a'; x.fillRect(a, b, 1, 2); x.fillRect(a + 2, b + 1, 1, 1); }
}
function pathBase(x, r, dark) {
  x.fillStyle = dark ? '#b3935f' : '#d2b07a'; x.fillRect(0, 0, 16, 16);
  speck(x, r, 20, dark ? ['#a2834f', '#c3a472'] : ['#c29d63', '#e0c290', '#c9a66b']);
  for (let i = 0; i < 2; i++) { x.fillStyle = '#a88a5c'; x.fillRect((r() * 14) | 0, (r() * 14) | 0, 2, 1); }
}
function circ(x, cx, cy, rad, col) { x.fillStyle = col; for (let yy = -rad; yy <= rad; yy++) for (let xx = -rad; xx <= rad; xx++) if (xx * xx + yy * yy <= rad * rad + rad * 0.6) x.fillRect(cx + xx, cy + yy, 1, 1); }
function treeTop(x, r, dark) {
  const c1 = dark ? '#2c5a2c' : '#3f7d3a', c2 = dark ? '#1f4322' : '#2f6230', c3 = dark ? '#3f7a3c' : '#5ea24a';
  x.fillStyle = '#5b3a1f'; x.fillRect(7, 11, 3, 5); x.fillStyle = '#3e2714'; x.fillRect(9, 11, 1, 5);
  circ(x, 8, 7, 7, '#1c3318'); circ(x, 8, 7, 6, c1); circ(x, 9, 9, 4, c2); circ(x, 6, 5, 3, c1);
  for (let i = 0; i < 7; i++) { x.fillStyle = c3; x.fillRect(3 + ((r() * 7) | 0), 2 + ((r() * 5) | 0), 1, 1); }
}
function water(x, r, f) {
  x.fillStyle = '#3d78b8'; x.fillRect(0, 0, 16, 16);
  speck(x, r, 10, ['#356aa6', '#4a88c8']);
  x.fillStyle = '#9ccdf2';
  for (let i = 0; i < 3; i++) { const yy = (i * 5 + 2 + f * 2) % 16, xx = (i * 7 + f * 3) % 12; x.fillRect(xx, yy, 4, 1); }
}
function stoneFloor(x, r, moss) {
  x.fillStyle = '#7d7a88'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#5e5b69'; x.fillRect(0, 7, 16, 1); x.fillRect(7, 0, 1, 7); x.fillRect(12, 8, 1, 8); x.fillRect(3, 8, 1, 8);
  speck(x, r, 12, ['#8b8896', '#6f6c7a']);
  if (moss) speck(x, r, 14, ['#5d8a4a', '#4e7a3e', '#6f9e58']);
}
const TILES = {};
function buildTiles() {
  const t = TILES;
  for (let v = 0; v < 4; v++) {
    t['g' + v] = tile(10 + v, (x, r) => grassBase(x, r, false));
    t['G' + v] = tile(20 + v, (x, r) => grassBase(x, r, true));
    t['.' + v] = tile(30 + v, (x, r) => pathBase(x, r, false));
    t[':' + v] = tile(40 + v, (x, r) => pathBase(x, r, true));
    t['T' + v] = tile(50 + v, (x, r) => { grassBase(x, r, false); treeTop(x, r, false); });
    t['Y' + v] = tile(60 + v, (x, r) => { grassBase(x, r, true); treeTop(x, r, true); });
    t['_' + v] = tile(70 + v, (x, r) => stoneFloor(x, r, false));
    t['m' + v] = tile(80 + v, (x, r) => stoneFloor(x, r, true));
  }
  t[','] = tile(90, (x, r) => { grassBase(x, r, false); const cols = ['#ffffff', '#ffd1e0', '#fff27a', '#b9d6ff']; for (let i = 0; i < 4; i++) { const a = 2 + ((r() * 12) | 0), b = 2 + ((r() * 12) | 0); x.fillStyle = cols[i]; x.fillRect(a - 1, b, 3, 1); x.fillRect(a, b - 1, 1, 3); x.fillStyle = '#e9a93c'; x.fillRect(a, b, 1, 1); } });
  t[';'] = tile(91, (x, r) => { grassBase(x, r, true); for (let i = 0; i < 3; i++) { const a = 2 + ((r() * 12) | 0), b = 2 + ((r() * 12) | 0); x.fillStyle = '#b9e4ff'; x.fillRect(a - 1, b, 3, 1); x.fillRect(a, b - 1, 1, 3); x.fillStyle = '#ffffff'; x.fillRect(a, b, 1, 1); } });
  t.w0 = tile(92, (x, r) => water(x, r, 0)); t.w1 = tile(92, (x, r) => water(x, r, 1));
  t.b0 = tile(93, (x, r) => { water(x, r, 0); x.fillStyle = '#a0703e'; x.fillRect(0, 1, 16, 14); x.fillStyle = '#7a5028'; for (let i = 0; i < 16; i += 4) x.fillRect(i, 1, 1, 14); x.fillStyle = '#5a3a1e'; x.fillRect(0, 1, 16, 1); x.fillRect(0, 14, 16, 1); });
  t.b1 = t.b0;
  t.R = tile(94, (x, r) => { grassBase(x, r, false); circ(x, 8, 9, 6, '#3a3a42'); circ(x, 8, 9, 5, '#8d8f96'); circ(x, 6, 7, 2, '#b3b5bc'); x.fillStyle = '#6d6f76'; x.fillRect(9, 11, 3, 2); });
  t.r = tile(95, (x) => { x.fillStyle = '#b5523b'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#8f3d2b'; for (let yy = 3; yy < 16; yy += 4) { x.fillRect(0, yy, 16, 1); for (let xx = (yy % 8 === 3 ? 0 : 2); xx < 16; xx += 4) x.fillRect(xx, yy - 3, 1, 3); } x.fillStyle = '#cf6a4f'; x.fillRect(0, 0, 16, 1); });
  t.q = tile(96, (x) => { x.fillStyle = '#b5523b'; x.fillRect(0, 0, 16, 10); x.fillStyle = '#8f3d2b'; x.fillRect(0, 3, 16, 1); x.fillRect(0, 7, 16, 1); x.fillStyle = '#6e2c1f'; x.fillRect(0, 10, 16, 3); x.fillStyle = '#3a1a10'; x.fillRect(0, 13, 16, 3); });
  const wall = (x) => { x.fillStyle = '#efe0bf'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#7a4f2a'; x.fillRect(0, 0, 16, 2); x.fillRect(0, 14, 16, 2); x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16); x.fillStyle = '#e0cda6'; x.fillRect(2, 4, 3, 1); x.fillRect(10, 9, 3, 1); };
  t.h = tile(97, wall);
  t.n = tile(98, (x) => { wall(x); x.fillStyle = '#5a3a1e'; x.fillRect(4, 4, 8, 7); x.fillStyle = '#8fd0ee'; x.fillRect(5, 5, 6, 5); x.fillStyle = '#5a3a1e'; x.fillRect(7, 5, 1, 5); x.fillStyle = '#d7f1ff'; x.fillRect(5, 5, 2, 1); x.fillStyle = '#6a9a3e'; x.fillRect(4, 11, 8, 2); x.fillStyle = '#ff8fa0'; x.fillRect(5, 11, 1, 1); x.fillRect(9, 11, 1, 1); });
  t.d = tile(99, (x) => { wall(x); x.fillStyle = '#4a2a14'; x.fillRect(4, 3, 8, 13); x.fillStyle = '#7a4a24'; x.fillRect(5, 4, 6, 12); x.fillStyle = '#6a3c1c'; x.fillRect(7, 4, 1, 12); x.fillStyle = '#ffd35a'; x.fillRect(9, 10, 1, 1); });
  t.f = tile(100, (x, r) => { grassBase(x, r, false); x.fillStyle = '#9a6a3a'; x.fillRect(0, 6, 16, 2); x.fillRect(0, 11, 16, 2); x.fillStyle = '#6e4622'; x.fillRect(2, 4, 2, 11); x.fillRect(12, 4, 2, 11); x.fillStyle = '#c08a52'; x.fillRect(2, 4, 2, 1); x.fillRect(12, 4, 2, 1); });
  t.W = tile(101, (x, r) => { pathBase(x, r, false); circ(x, 8, 9, 7, '#4a4a52'); circ(x, 8, 9, 6, '#9a9ca4'); circ(x, 8, 9, 4, '#1e2a3a'); x.fillStyle = '#3d78b8'; x.fillRect(6, 9, 4, 2); x.fillStyle = '#6b4a2a'; x.fillRect(1, 0, 2, 9); x.fillRect(13, 0, 2, 9); x.fillRect(1, 0, 14, 2); });
  t.s = tile(102, (x, r) => { grassBase(x, r, false); x.fillStyle = '#5a3a1e'; x.fillRect(7, 9, 2, 7); x.fillStyle = '#3a2410'; x.fillRect(2, 2, 12, 8); x.fillStyle = '#c08a52'; x.fillRect(3, 3, 10, 6); x.fillStyle = '#7a5028'; x.fillRect(4, 5, 8, 1); x.fillRect(4, 7, 6, 1); });
  t.l = tile(103, (x, r) => { pathBase(x, r, false); x.fillStyle = '#2d2d33'; x.fillRect(7, 5, 2, 11); x.fillRect(5, 14, 6, 2); x.fillStyle = '#2d2d33'; x.fillRect(5, 0, 6, 6); x.fillStyle = '#ffe07a'; x.fillRect(6, 1, 4, 4); x.fillStyle = '#fff6c8'; x.fillRect(7, 2, 2, 2); });
  t.L = tile(104, (x, r) => { pathBase(x, r, false); x.fillStyle = '#5b574e'; x.fillRect(2, 11, 12, 5); x.fillStyle = '#9a9486'; x.fillRect(3, 11, 10, 4); x.fillStyle = '#6b5a3a'; x.fillRect(6, 3, 4, 8); x.fillStyle = '#3a2a18'; x.fillRect(4, 0, 8, 4); x.fillStyle = '#ffcf5a'; x.fillRect(5, 1, 6, 2); x.fillStyle = '#e9b44c'; x.fillRect(7, 4, 2, 6); });
  t['#'] = tile(105, (x, r) => { x.fillStyle = '#4b4658'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#35313f'; for (let yy = 0; yy < 16; yy += 5) { x.fillRect(0, yy, 16, 1); for (let xx = (yy % 10 ? 4 : 0); xx < 16; xx += 8) x.fillRect(xx, yy, 1, 5); } speck(x, r, 8, ['#5a5568', '#3f3b4c', '#4e7a3e']); x.fillStyle = '#6a6480'; x.fillRect(0, 0, 16, 1); });
  t.P = tile(106, (x, r) => { stoneFloor(x, r, false); x.fillStyle = '#2a2833'; x.fillRect(3, 1, 10, 15); x.fillStyle = '#a19eb0'; x.fillRect(4, 3, 8, 12); x.fillStyle = '#c4c1d2'; x.fillRect(4, 3, 2, 12); x.fillStyle = '#bdbacb'; x.fillRect(3, 1, 10, 2); x.fillRect(3, 14, 10, 2); speck(x, r, 4, ['#5d8a4a']); });
  t.S = tile(107, (x, r) => { stoneFloor(x, r, true); circ(x, 8, 8, 7, '#4a4658'); circ(x, 8, 8, 6, '#58b8e8'); circ(x, 7, 7, 3, '#9fe6ff'); x.fillStyle = '#ffffff'; x.fillRect(5, 5, 1, 1); x.fillRect(10, 9, 1, 1); });
  t.A = tile(108, (x, r) => { stoneFloor(x, r, false); x.fillStyle = '#2a2833'; x.fillRect(1, 4, 14, 11); x.fillStyle = '#a19eb0'; x.fillRect(2, 5, 12, 9); x.fillStyle = '#7fc8ff'; x.fillRect(5, 7, 6, 1); x.fillRect(7, 6, 2, 5); x.fillRect(4, 11, 8, 1); });
  t.E = tile(109, (x) => { x.fillStyle = '#4b4658'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#0d0b12'; x.fillRect(2, 2, 12, 14); x.fillStyle = '#1c1826'; x.fillRect(3, 3, 10, 13); x.fillStyle = '#6a6480'; x.fillRect(1, 1, 14, 1); });
  t.O = tile(110, (x, r) => { x.fillStyle = '#6a6480'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#4b4658'; x.fillRect(0, 12, 16, 4); x.fillStyle = '#1a1622'; x.fillRect(3, 3, 10, 13); x.fillStyle = '#2a2436'; x.fillRect(4, 4, 8, 12); x.fillStyle = '#8a84a0'; x.fillRect(2, 1, 12, 2); x.fillStyle = '#7fc8ff'; x.fillRect(7, 1, 2, 1); });
  t.k = tile(111, (x, r) => { x.fillStyle = '#1a1622'; x.fillRect(0, 0, 16, 16); speck(x, r, 5, ['#2a2436']); });
  t.x = tile(112, (x, r) => { grassBase(x, r, true); circ(x, 8, 10, 6, '#1f3a1c'); circ(x, 8, 10, 5, '#35602f'); circ(x, 6, 8, 2, '#4f8a45'); x.fillStyle = '#b9e4ff'; x.fillRect(10, 7, 1, 1); });
  t.c = tile(113, (x, r) => { pathBase(x, r, false); circ(x, 8, 8, 7, '#6e4622'); circ(x, 8, 8, 6, '#9a6a3a'); x.fillStyle = '#c08a52'; x.fillRect(4, 5, 8, 2); x.fillStyle = '#6e4622'; x.fillRect(2, 8, 12, 1); });
}

/* ---------- 宝箱など ---------- */
function chest(open) {
  const c = mk(16, 16), x = c.getContext('2d');
  x.fillStyle = '#2a170a'; x.fillRect(1, 4, 14, 11);
  x.fillStyle = '#a0612c'; x.fillRect(2, 8, 12, 6);
  x.fillStyle = '#e9b44c'; x.fillRect(2, 10, 12, 1); x.fillRect(7, 9, 2, 3);
  if (open) { x.fillStyle = '#3a1e0c'; x.fillRect(2, 5, 12, 3); x.fillStyle = '#7a4520'; x.fillRect(2, 1, 12, 4); x.fillStyle = '#2a170a'; x.fillRect(1, 0, 14, 1); }
  else { x.fillStyle = '#c07a3a'; x.fillRect(2, 5, 12, 4); x.fillStyle = '#e9b44c'; x.fillRect(2, 5, 1, 4); x.fillRect(13, 5, 1, 4); }
  return c;
}

/* ---------- ビルド ---------- */
const LOOKS = {
  rio: { hair: '#6b3f1f', cloth: '#3f6fb0', pants: '#3b2f28', scarf: '#f08a2a', style: 'spiky', lantern: true },
  mina: { hair: '#c8452f', cloth: '#7a2d3a', pants: '#3a2a3a', boots: '#4a3a4a', style: 'pony', armor: true, sword: true, band: '#ffd87a', skin: '#f6d0ab' },
  grandma: { hair: '#dcdcdc', cloth: '#7a5a8a', style: 'bun', dress: true, cane: true, skin: '#eec39a' },
  olga: { hair: '#8a5a2a', cloth: '#d27a3a', style: 'bun', dress: true, apron: true },
  pipi: { hair: '#e9c24a', cloth: '#5aa04a', pants: '#6b4a2a', style: 'spiky' },
  gant: { hair: '#bdbdbd', cloth: '#4a6a7a', pants: '#3a3a3a', beard: '#e6e6e6', hat: '#5a4a3a' },
  lena: { hair: '#2e2440', cloth: '#b07ab8', style: 'long', dress: true },
  guard: { hair: '#4a3020', cloth: '#6a6a78', pants: '#3a3a44', armor: true, hat: '#8a8fa0' },
};
const SPR = { h: {}, fox: [], foxR: [], mon: {}, chest: [] };
function buildSprites() {
  for (const k in LOOKS) {
    SPR.h[k] = [];
    for (let d = 0; d < 4; d++) { SPR.h[k][d] = [humanoid(LOOKS[k], d, 0), humanoid(LOOKS[k], d, 1), humanoid(LOOKS[k], d, 2)]; }
  }
  SPR.fox = [foxField(0), foxField(1)];
  SPR.foxR = SPR.fox.map(flip);
  SPR.mon.kinokon = mKinokon();
  SPR.mon.mosslin = mMosslin();
  SPR.mon.luu = mFox(false, false);
  SPR.mon.luuL = flip(SPR.mon.luu);
  SPR.mon.silva = mFox(true, true);
  SPR.mon.silvaPure = mFox(false, true);
  SPR.mon.shard = mStarShard();
  SPR.chest = [chest(false), chest(true)];
}
// 顔アイコン（会話用）
function drawFace(cv, who) {
  const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height);
  if (who === 'luu') { x.fillStyle = '#23304a'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(SPR.foxR[0], 0, 0, 13, 13, 4, 2, 52, 52); return; }
  if (who === 'silva' || who === 'silvaDark') { x.fillStyle = who === 'silva' ? '#2a3a5a' : '#1a0f24'; x.fillRect(0, 0, cv.width, cv.height); const s = who === 'silva' ? SPR.mon.silvaPure : SPR.mon.silva; x.drawImage(s, 44, 0, 44, 42, 0, 0, 56, 52); return; }
  if (who === 'nox') { x.fillStyle = '#0a0610'; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = '#b03aff'; x.fillRect(18, 22, 6, 3); x.fillRect(32, 22, 6, 3); return; }
  const s = SPR.h[who] && SPR.h[who][0][0]; if (!s) return;
  x.fillStyle = '#c9b48a'; x.fillRect(0, 0, cv.width, cv.height);
  x.drawImage(s, 2, 0, 14, 13, 0, 0, 56, 52);
}

G.gfx.TILES = TILES; G.gfx.SPR = SPR; G.gfx.LOOKS = LOOKS; G.gfx.TS = TS;
G.gfx.build = function () { buildTiles(); buildSprites(); };
G.gfx.drawFace = drawFace;
G.gfx.humanoid = humanoid;
})();
