/* フレイア・クロニクル — データ定義 */
(function () {
'use strict';
const G = window.G = window.G || {};
const D = G.data = {};

D.base = {
  rio: { name: 'リオ', mhp: 38, mmp: 10, atk: 10, def: 4, spd: 7, skills: ['torch', 'heal'], role: '灯守見習い' },
  mina: { name: 'ミーナ', mhp: 46, mmp: 6, atk: 12, def: 6, spd: 5, skills: ['crush', 'cover'], role: '自称・天才剣士' },
  luu: { name: 'ルゥ', mhp: 32, mmp: 18, atk: 7, def: 3, spd: 10, skills: ['moonlight', 'veil', 'song'], role: '月狐の子' },
};
D.grow = {
  rio: { mhp: 7, mmp: 2, atk: 2, def: 1 },
  mina: { mhp: 9, mmp: 1, atk: 2, def: 1 },
  luu: { mhp: 6, mmp: 3, atk: 1, def: 1 },
};
D.lvExp = [0, 0, 10, 30, 60, 100, 150];

D.skills = {
  torch: { name: '灯火斬り', mp: 3, target: 'enemy', power: 1.7, fx: 'fire', desc: '炎の剣でいつもより強く斬る' },
  heal: { name: 'いやしの灯', mp: 3, target: 'ally', heal: 30, desc: '味方1人のHPを30回復' },
  crush: { name: '岩砕き', mp: 3, target: 'enemy', power: 2.0, fx: 'slash', desc: '渾身の一撃。2倍ダメージ' },
  cover: { name: 'かばう', mp: 0, target: 'self', desc: 'このターン、仲間への単体攻撃を代わりに受ける' },
  moonlight: { name: '月あかり', mp: 4, target: 'enemy', desc: '月の光で黒い霧をはらう' },
  veil: { name: '月のヴェール', mp: 5, target: 'party', desc: 'このターン、味方全員の被ダメージ半減' },
  song: { name: '月のうた', mp: 6, target: 'party', heal: 18, desc: '味方全員のHPを18回復' },
};
D.items = {
  herb: { name: 'やくそう', desc: 'HPを30回復', heal: 30 },
  drop: { name: '星のしずく', desc: 'MPを10回復', mp: 10 },
  bread: { name: 'はちみつパン', desc: '焼きたて。いい匂いがする', key: true },
};
D.enemies = {
  kinokon: { name: 'キノコン', hp: 14, atk: 7, def: 1, spd: 4, exp: 6, spr: 'kinokon' },
  mosslin: { name: 'モスリン', hp: 22, atk: 8, def: 2, spd: 3, exp: 12, spr: 'mosslin' },
  luu: { name: '銀色の子狐', hp: 40, atk: 6, def: 3, spd: 9, exp: 20, spr: 'luu' },
  silva: { name: '夜霧の大狐 シルヴァ', hp: 190, atk: 13, def: 8, spd: 4, exp: 40, spr: 'silva', boss: true },
};

/* ---------- マップ ---------- */
function MB(w, h, fill) { this.w = w; this.h = h; this.g = []; for (let y = 0; y < h; y++) { this.g.push(new Array(w).fill(fill)); } }
MB.prototype.set = function (x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = c; return this; };
MB.prototype.rect = function (x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; };
MB.prototype.border = function (c) { this.rect(0, 0, this.w, 1, c); this.rect(0, this.h - 1, this.w, 1, c); this.rect(0, 0, 1, this.h, c); this.rect(this.w - 1, 0, 1, this.h, c); return this; };
MB.prototype.get = function (x, y) { return (this.g[y] || [])[x]; };
MB.prototype.house = function (x, y, w, door, wins) {
  this.rect(x, y, w, 1, 'r'); this.rect(x, y + 1, w, 1, 'q'); this.rect(x, y + 2, w, 1, 'h');
  (wins || []).forEach(i => this.set(x + i, y + 2, 'n')); this.set(x + door, y + 2, 'd'); return this;
};

function village() {
  const m = new MB(24, 20, 'g');
  m.border('T');
  [[1, 1], [2, 1], [22, 1], [21, 1], [1, 18], [2, 18], [22, 18], [21, 18], [9, 1], [14, 1], [15, 1], [8, 1], [22, 12], [1, 11], [22, 5]].forEach(p => m.set(p[0], p[1], 'T'));
  m.rect(11, 0, 2, 8, '.');
  m.rect(8, 7, 8, 5, '.');
  m.set(11, 9, 'L');
  m.house(2, 2, 5, 2, [1, 3]); m.rect(4, 5, 1, 4, '.'); m.rect(4, 8, 4, 1, '.');
  m.house(17, 2, 5, 2, [0, 4]); m.rect(19, 5, 1, 4, '.'); m.rect(16, 8, 4, 1, '.');
  m.house(3, 12, 4, 2, [0, 3]); m.house(16, 12, 5, 2, [1, 4]);
  m.rect(11, 12, 2, 5, '.'); m.rect(5, 16, 14, 1, '.'); m.rect(5, 15, 1, 1, '.'); m.rect(18, 15, 1, 1, '.');
  m.rect(19, 9, 3, 3, 'w'); [[18, 9], [18, 10], [22, 9], [22, 10], [20, 12], [21, 12]].forEach(p => m.set(p[0], p[1], ','));
  m.set(7, 10, 'W');
  m.set(13, 2, 's');
  m.set(10, 5, 'l'); m.set(13, 5, 'l');
  m.rect(2, 17, 7, 1, ','); m.rect(2, 18, 7, 1, 'f');
  m.set(15, 3, 'R'); m.set(14, 13, 'R'); m.set(14, 14, ','); m.set(9, 13, ','); m.set(6, 7, ','); m.set(16, 6, ',');
  m.set(21, 16, ','); m.set(20, 17, ',');
  return m;
}
function forest() {
  const m = new MB(20, 30, 'G');
  const r = G.gfx.rng(777);
  for (let y = 1; y < 29; y++) for (let x = 1; x < 19; x++) if (r() < 0.62) m.set(x, y, 'Y');
  m.border('Y');
  // 道
  m.rect(9, 24, 2, 6, ':'); m.rect(5, 24, 6, 1, ':'); m.rect(5, 14, 2, 11, ':');
  m.rect(4, 22, 1, 1, ':'); m.rect(1, 21, 3, 3, 'G'); m.set(1, 21, ';');
  m.rect(13, 21, 5, 5, 'G'); m.set(17, 25, ';'); m.set(13, 25, 'x');
  m.rect(1, 19, 18, 2, 'w'); m.rect(5, 19, 2, 2, 'b');
  m.rect(4, 8, 14, 6, 'G'); m.rect(5, 9, 11, 4, 'G');
  [[6, 9], [13, 12], [16, 9], [4, 12], [15, 11]].forEach(p => m.set(p[0], p[1], ';'));
  m.set(7, 11, 'c'); m.set(12, 9, 'x');
  m.rect(9, 1, 2, 8, ':'); m.set(9, 0, ':'); m.set(10, 0, ':');
  m.rect(4, 13, 3, 1, ':');
  m.rect(8, 27, 1, 2, 'G'); m.rect(11, 27, 1, 2, 'G'); m.set(8, 26, 'Y'); m.set(11, 26, 'Y'); m.set(8, 25, 'Y'); m.set(11, 25, 'Y');
  m.rect(11, 24, 3, 1, ':');
  m.set(12, 28, 's');
  m.set(11, 2, 's');
  m.set(7, 14, 'G'); m.set(7, 15, 'G'); m.set(4, 16, 'G'); m.set(4, 17, 'G');
  return m;
}
function ruins() {
  const m = new MB(15, 20, '#');
  const r = G.gfx.rng(4242);
  m.rect(1, 2, 13, 17, '_');
  for (let y = 2; y < 19; y++) for (let x = 1; x < 14; x++) if (r() < 0.25) m.set(x, y, 'm');
  [[3, 5], [11, 5], [3, 9], [11, 9], [3, 13], [11, 13], [3, 16], [11, 16]].forEach(p => m.set(p[0], p[1], 'P'));
  m.set(4, 1, 'O'); m.set(10, 1, 'O');
  m.set(7, 2, 'A');
  m.set(12, 11, 'S');
  m.rect(7, 19, 1, 1, '_');
  m.rect(1, 2, 1, 2, 'k'); m.rect(13, 2, 1, 2, 'k');
  return m;
}
D.buildMaps = function () {
  D.maps = {
    village: { name: 'ルミナ村', grid: village(), bgm: 'village', theme: 'day' },
    forest: { name: '月影の森', grid: forest(), bgm: 'forest', theme: 'mist' },
    ruins: { name: '星見の祠', grid: ruins(), bgm: 'ruins', theme: 'dark' },
  };
};
D.solid = new Set(['T', 'Y', 'w', 'R', 'f', 'r', 'q', 'h', 'n', 'd', 'L', 'l', 'W', 's', '#', 'P', 'A', 'S', 'O', 'k', 'x', 'c']);
D.animated = new Set(['w', 'b']);
})();
