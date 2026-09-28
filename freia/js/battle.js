/* フレイア・クロニクル — 戦闘（コマンド式ターン制） */
(function () {
'use strict';
const G = window.G = window.G || {};
const D = G.data, A = G.audio, $ = G.$, sleep = G.sleep;
const B = G.battle = {};
const VW = 240;
let st = null; // 戦闘状態
const bb = document.createElement('canvas'), bx = bb.getContext('2d');
const bgCache = {};

/* ---------- 背景 ---------- */
function makeBg(kind, w, h) {
  const key = kind + w + 'x' + h; if (bgCache[key]) return bgCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const r = G.gfx.rng(kind.length * 99 + 7);
  const hz = Math.round(h * 0.52);
  if (kind === 'ruins') {
    let g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#0d0a18'); g.addColorStop(1, '#2a2440'); x.fillStyle = g; x.fillRect(0, 0, w, hz);
    for (let i = 0; i < w; i += 14) { x.fillStyle = '#1a1628'; x.fillRect(i, 0, 12, hz); x.fillStyle = '#231e36'; for (let j = 4; j < hz; j += 8) x.fillRect(i + (j % 16 ? 0 : 6), j, 6, 1); }
    for (let i = 0; i < 5; i++) { const px = Math.round(w * (0.1 + i * 0.2)); x.fillStyle = '#3a3552'; x.fillRect(px - 5, 6, 10, hz - 6); x.fillStyle = '#4c4668'; x.fillRect(px - 5, 6, 3, hz - 6); x.fillStyle = '#5a5478'; x.fillRect(px - 7, 4, 14, 4); }
    g = x.createLinearGradient(0, hz, 0, h); g.addColorStop(0, '#4b4660'); g.addColorStop(1, '#23202e'); x.fillStyle = g; x.fillRect(0, hz, w, h - hz);
    x.fillStyle = '#3a3650'; for (let j = hz + 4; j < h; j += 7) x.fillRect(0, j, w, 1);
    for (let i = 0; i < 40; i++) { x.fillStyle = ['#4e7a3e', '#5d8a4a'][i % 2]; x.fillRect((r() * w) | 0, hz + ((r() * (h - hz)) | 0), 2, 1); }
    const mg = x.createRadialGradient(w / 2, -10, 5, w / 2, -10, h * 0.9); mg.addColorStop(0, 'rgba(160,200,255,0.35)'); mg.addColorStop(1, 'rgba(160,200,255,0)'); x.fillStyle = mg; x.fillRect(0, 0, w, h);
  } else {
    let g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#16261c'); g.addColorStop(1, '#3c5a3a'); x.fillStyle = g; x.fillRect(0, 0, w, hz);
    for (let layer = 0; layer < 3; layer++) {
      const col = ['#1c3322', '#24422a', '#2e5232'][layer];
      for (let i = -10; i < w + 10; i += 12 + layer * 3) { const th = 16 + r() * 20 + layer * 6; const cx = i + r() * 6; x.fillStyle = col; x.beginPath(); x.moveTo(cx - 9, hz - layer * 2); x.lineTo(cx, hz - th - layer * 4); x.lineTo(cx + 9, hz - layer * 2); x.fill(); }
    }
    g = x.createLinearGradient(0, hz, 0, h); g.addColorStop(0, '#4f7a3f'); g.addColorStop(1, '#2d4a26'); x.fillStyle = g; x.fillRect(0, hz, w, h - hz);
    for (let i = 0; i < 90; i++) { x.fillStyle = ['#3f6a33', '#6a9a4e', '#5a8a44'][i % 3]; x.fillRect((r() * w) | 0, hz + ((r() * (h - hz)) | 0), 1 + (i % 2), 1); }
    x.fillStyle = 'rgba(190,160,110,0.35)'; x.beginPath(); x.ellipse(w / 2, hz + (h - hz) * 0.55, w * 0.45, (h - hz) * 0.3, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(170,150,210,0.12)'; x.fillRect(0, 0, w, h);
  }
  bgCache[key] = c; return c;
}

/* ---------- ユーティリティ ---------- */
let skipWait = null;
function wait(ms) { return new Promise(r => { const t = setTimeout(done, ms); function done() { clearTimeout(t); if (skipWait === done) skipWait = null; r(); } skipWait = done; }); }
function msg(t, ms) { $('bMsg').textContent = t; return wait(ms == null ? 820 : ms); }
$('battleUI').addEventListener('pointerdown', e => { if (e.target.closest('#bCmd')) return; if (skipWait && G.mode === 'battle') skipWait(); });
$('stage').addEventListener('pointerdown', e => { if (G.mode === 'battle' && skipWait && !e.target.closest('#bCmd')) skipWait(); });
function rnd(a, b) { return a + Math.random() * (b - a); }
function alive(list) { return list.filter(a => !a.ko && !a.dead); }
function tween(obj, key, to, ms) { const from = obj[key], t0 = performance.now(); return new Promise(r => { (function s() { const k = Math.min(1, (performance.now() - t0) / ms); obj[key] = from + (to - from) * (1 - Math.pow(1 - k, 2)); if (k < 1) requestAnimationFrame(s); else r(); })(); }); }
function pop(target, text, col) { st.pops.push({ x: target.x, y: target.y - (target.h || 20) / 2 - 4, text: String(text), col: col || '#fff', t: 0 }); }
function burst(x, y, n, cols, spd) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (spd || 50) * (0.4 + Math.random()); st.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, t: 0, life: 0.5 + Math.random() * 0.5, col: cols[i % cols.length], s: Math.random() < 0.4 ? 2 : 1 }); } }

/* ---------- ステータス表示 ---------- */
function renderStatus(activeId) {
  const S = G.S;
  $('bStatus').innerHTML = st.party.map(a => {
    const s = G.stat(a.id), p = S.party[a.id];
    const tags = [a.defend ? '防御' : '', a.cover ? 'かばう' : '', st.veil ? 'ヴェール' : ''].filter(Boolean).join('・');
    return `<div class="st ${a.id === activeId ? 'act' : ''} ${a.ko ? 'ko' : ''}"><div class="nm">${s.name}<span class="lv">Lv${S.lv}</span></div>
      <div class="row"><b>HP</b><div class="bar2"><i style="width:${Math.max(0, p.hp / s.mhp * 100)}%;background:${p.hp / s.mhp < 0.3 ? '#e8743a' : ''}"></i></div><span class="v">${p.hp}</span></div>
      <div class="row"><b>MP</b><div class="bar2 mp"><i style="width:${Math.max(0, p.mp / Math.max(1, s.mmp) * 100)}%"></i></div><span class="v">${p.mp}</span></div>
      ${tags ? `<div class="tag">${tags}</div>` : ''}</div>`;
  }).join('');
}
B.renderStatus = renderStatus;

/* ---------- コマンド選択 ---------- */
function pick(head, items, cols, cancel) {
  return new Promise(res => {
    $('bCmdHead').textContent = head || '';
    const wrap = $('bCmd'); wrap.innerHTML = '';
    const btns = items.map((it, i) => {
      const b = document.createElement('button'); b.className = 'cmd ' + (it.cls || '');
      b.innerHTML = it.label + (it.sub ? `<small>${it.sub}</small>` : '');
      if (it.disabled) b.disabled = true;
      if (it.wide) b.style.gridColumn = '1 / -1';
      b.addEventListener('click', () => { if (b.disabled) return; A.sfx('ok'); G.clearMenu(); wrap.innerHTML = ''; $('bCmdHead').textContent = ''; res(i); });
      wrap.appendChild(b); return b;
    });
    G.setMenu(btns, { cols: cols || 2, onCancel: cancel ? () => { G.clearMenu(); wrap.innerHTML = ''; $('bCmdHead').textContent = ''; res(-1); } : null });
  });
}
async function pickEnemy(head) {
  const es = alive(st.enemies);
  if (es.length === 1) return es[0];
  const i = await pick(head || 'だれを攻撃する？', es.map(e => ({ label: e.name })).concat([{ label: 'もどる', cls: 'back' }]), 2, true);
  if (i < 0 || i >= es.length) return null; return es[i];
}
async function pickAlly(head) {
  const ps = alive(st.party);
  const i = await pick(head, ps.map(a => { const p = G.S.party[a.id], s = G.stat(a.id); return { label: s.name, sub: `HP ${p.hp}/${s.mhp}　MP ${p.mp}/${s.mmp}` }; }).concat([{ label: 'もどる', cls: 'back' }]), 2, true);
  if (i < 0 || i >= ps.length) return null; return ps[i];
}
async function chooseFor(a, idx, reserved) {
  const S = G.S, s = G.stat(a.id);
  while (true) {
    renderStatus(a.id);
    const main = [{ label: 'たたかう', k: 'attack' }, { label: 'とくぎ', k: 'skill' }, { label: 'ぼうぎょ', k: 'defend' }, { label: 'どうぐ', k: 'item' }];
    if (st.cfg.talk && a.id === 'rio') main.unshift({ label: '声をかける', sub: '子狐の様子がおかしい…？', k: 'talk', cls: 'special', wide: true });
    if (idx > 0) main.push({ label: '← 前の仲間にもどる', k: 'back', cls: 'back', wide: true });
    const i = await pick(`${s.name}はどうする？`, main, 2, idx > 0);
    const k = i < 0 ? 'back' : main[i].k;
    if (k === 'back') return 'back';
    if (k === 'talk') return { a, k: 'talk' };
    if (k === 'defend') return { a, k: 'defend' };
    if (k === 'attack') { const t = await pickEnemy(); if (t) return { a, k: 'attack', t }; continue; }
    if (k === 'skill') {
      const mp = S.party[a.id].mp;
      const list = s.skills.map(id => { const sk = D.skills[id]; return { label: sk.name, sub: `MP${sk.mp}　${sk.desc}`, disabled: mp < sk.mp, id }; });
      list.push({ label: 'もどる', cls: 'back' });
      const j = await pick(`${s.name}のとくぎ（MP ${mp}）`, list, 1, true);
      if (j < 0 || j >= s.skills.length) continue;
      const sid = list[j].id, sk = D.skills[sid];
      if (sk.target === 'enemy') { const t = await pickEnemy(`${sk.name}：だれに？`); if (t) return { a, k: 'skill', sid, t }; continue; }
      if (sk.target === 'ally') { const t = await pickAlly(`${sk.name}：だれに？`); if (t) return { a, k: 'skill', sid, t }; continue; }
      return { a, k: 'skill', sid };
    }
    if (k === 'item') {
      const keys = Object.keys(S.items).filter(x => !D.items[x].key && S.items[x] - (reserved[x] || 0) > 0);
      if (!keys.length) { $('bMsg').textContent = 'つかえる どうぐを 持っていない。'; A.sfx('cancel'); continue; }
      const list = keys.map(x => ({ label: `${D.items[x].name} ×${S.items[x] - (reserved[x] || 0)}`, sub: D.items[x].desc }));
      list.push({ label: 'もどる', cls: 'back' });
      const j = await pick('どのどうぐを使う？', list, 1, true);
      if (j < 0 || j >= keys.length) continue;
      const t = await pickAlly(`${D.items[keys[j]].name}：だれに？`);
      if (!t) continue;
      reserved[keys[j]] = (reserved[keys[j]] || 0) + 1;
      return { a, k: 'item', item: keys[j], t };
    }
  }
}
async function commandPhase() {
  const acts = []; const reserved = {};
  const ps = alive(st.party);
  for (const a of st.party) { a.defend = false; a.cover = false; }
  st.veil = false;
  let i = 0;
  while (i < ps.length) {
    const r = await chooseFor(ps[i], i, reserved);
    if (r === 'back') {
      i = Math.max(0, i - 1); const prev = acts.pop();
      if (prev && prev.k === 'item') reserved[prev.item]--;
      if (prev) { prev.a.defend = false; prev.a.cover = false; if (prev.sid === 'veil') st.veil = false; }
      continue;
    }
    if (r.k === 'defend') r.a.defend = true;
    acts.push(r); i++;
    if (r.k === 'talk') break;
  }
  renderStatus(null);
  return acts;
}

/* ---------- ダメージ ---------- */
function calcDmg(atk, def, power) { return Math.max(1, Math.round((atk * power - def * 0.5) * rnd(0.88, 1.12))); }
async function hitEnemy(e, dmg, crit) {
  if (e.armor) dmg = Math.max(1, Math.round(dmg * 0.25));
  if (e.guard) dmg = Math.max(1, Math.round(dmg * 0.5));
  e.hp = Math.max(0, e.hp - dmg);
  e.flash = 200; e.shake = 250; A.sfx(crit ? 'crit' : 'hit'); pop(e, dmg, crit ? '#ffd23a' : '#fff');
  burst(e.x, e.y, 8, ['#fff', '#ffd87a']);
  if (st.cfg.floorHp && e.hp < st.cfg.floorHp) e.hp = st.cfg.floorHp;
  await wait(260);
  return dmg;
}
async function hitParty(a, raw, label) {
  const p = G.S.party[a.id];
  let dmg = raw; if (a.defend) dmg *= 0.5; if (st.veil) dmg *= 0.5;
  dmg = Math.max(1, Math.round(dmg));
  p.hp = Math.max(0, p.hp - dmg); a.flash = 200; a.shake = 250; A.sfx('hurt'); pop(a, dmg, '#ff9a8a');
  G.doShake(3, 150);
  renderStatus(null);
  if (p.hp <= 0) { a.ko = true; renderStatus(null); await msg(`${G.stat(a.id).name}は たおれてしまった……`, 700); }
  return dmg;
}
function heal(a, n) { const s = G.stat(a.id), p = G.S.party[a.id]; const v = Math.min(n, s.mhp - p.hp); p.hp += v; pop(a, v, '#8dff8a'); burst(a.x, a.y, 10, ['#b8ffb0', '#fff']); return v; }

/* ---------- 行動 ---------- */
async function doAct(act) {
  const a = act.a, S = G.S, s = G.stat(a.id), p = S.party[a.id];
  if (a.ko) return;
  const name = s.name;
  if (act.k === 'talk') { await msg('リオは 剣をおろし、子狐に そっと声をかけた。', 1100); st.result = 'event'; return; }
  if (act.k === 'defend') { A.sfx('guard'); await msg(`${name}は 身を守っている。`, 600); return; }
  let t = act.t;
  if (t && t.side === 'e' && t.dead) { t = alive(st.enemies)[0]; if (!t) return; }
  if (t && t.side === 'p' && t.ko) { t = alive(st.party)[0]; if (!t) return; }
  if (act.k === 'attack') {
    await step(a); A.sfx('slash');
    const crit = Math.random() < 0.07;
    const dmg = calcDmg(s.atk, t.def, crit ? 1.6 : 1);
    slashFx(t);
    await msg(`${name}の こうげき！${crit ? ' 会心の一撃！' : ''}`, 250);
    const d = await hitEnemy(t, dmg, crit);
    await msg(`${t.name}に ${d}の ダメージ！${armorNote(t)}`, 620);
    await back(a); await checkDead(t); return;
  }
  if (act.k === 'item') {
    const it = D.items[act.item];
    if (!(S.items[act.item] > 0)) { await msg('しかし どうぐが なかった！', 600); return; }
    S.items[act.item]--; A.sfx('heal');
    if (it.heal) { const v = heal(t, it.heal); await msg(`${name}は ${it.name}を つかった！ ${G.stat(t.id).name}の HPが ${v} 回復！`, 850); }
    if (it.mp) { const tp = S.party[t.id], ts = G.stat(t.id); const v = Math.min(it.mp, ts.mmp - tp.mp); tp.mp += v; pop(t, v, '#9fd8ff'); await msg(`${name}は ${it.name}を つかった！ ${ts.name}の MPが ${v} 回復！`, 850); }
    renderStatus(null); return;
  }
  // とくぎ
  const sk = D.skills[act.sid];
  if (p.mp < sk.mp) { await msg(`${name}は ${sk.name}を つかおうとした！ しかし MPが たりない！`, 800); return; }
  p.mp -= sk.mp; renderStatus(null);
  switch (act.sid) {
    case 'torch': case 'crush': {
      await step(a); A.sfx(sk.fx === 'fire' ? 'fire' : 'slash');
      if (sk.fx === 'fire') burst(t.x, t.y, 22, ['#ffcf5a', '#ff7a2a', '#fff2b0'], 70); else slashFx(t, true);
      await msg(`${name}の ${sk.name}！`, 300);
      const d = await hitEnemy(t, calcDmg(s.atk, t.def, sk.power), false);
      await msg(`${t.name}に ${d}の ダメージ！${armorNote(t)}`, 650);
      await back(a); await checkDead(t); break;
    }
    case 'heal': { A.sfx('heal'); const v = heal(t, sk.heal); renderStatus(null); await msg(`${name}の ${sk.name}！ ${G.stat(t.id).name}の HPが ${v} 回復した！`, 900); break; }
    case 'cover': { a.cover = true; A.sfx('guard'); renderStatus(null); await msg(`${name}は 仲間の前に 立ちはだかった！`, 750); break; }
    case 'veil': { st.veil = true; A.sfx('moon'); st.party.forEach(x => burst(x.x, x.y, 8, ['#bfe6ff', '#ffffff'], 40)); renderStatus(null); await msg(`${name}の ${sk.name}！ やわらかな月の光が みんなを包んだ。`, 950); break; }
    case 'song': { A.sfx('heal'); let tot = 0; alive(st.party).forEach(x => tot += heal(x, sk.heal)); renderStatus(null); await msg(`${name}の ${sk.name}！ みんなの傷が いえていく。`, 950); break; }
    case 'moonlight': {
      A.sfx('moon'); st.beam = { x: t.x, t: 0 };
      await msg(`${name}の ${sk.name}！`, 500);
      if (t.armor) { t.armor = false; t.clear = 3; burst(t.x, t.y, 30, ['#bfe6ff', '#ffffff', '#9a7aff'], 90); await msg(`月の光が 黒い霧を はらった！ ${t.name}の 守りが消えた！`, 1100); }
      else { const d = await hitEnemy(t, calcDmg(s.atk + 4, t.def, 1), false); await msg(`${t.name}に ${d}の ダメージ！`, 650); await checkDead(t); }
      break;
    }
  }
}
function armorNote(t) { if (t.armor) { st.armorHits = (st.armorHits || 0) + 1; return '\n（黒い霧に 威力を吸いこまれた…）'; } return ''; }
async function step(a) { await tween(a, 'ox', a.side === 'p' ? -12 : 12, 110); }
async function back(a) { await tween(a, 'ox', 0, 120); }
function slashFx(t, big) { st.slashes.push({ x: t.x, y: t.y, t: 0, big }); }
async function checkDead(e) {
  if (e.hp > 0 || e.dead) return;
  e.dead = true; A.sfx('hit'); burst(e.x, e.y, 26, e.boss ? ['#b07aff', '#fff'] : ['#fff', '#cfe8a0', '#ffd87a'], 80);
  if (!e.boss) await tween(e, 'alpha', 0, 300);
  if (!e.boss) await msg(`${e.name}を たおした！`, 500);
}

/* ---------- 敵の行動 ---------- */
function targetParty(e) {
  const ps = alive(st.party); let t = ps[(Math.random() * ps.length) | 0];
  const coverer = ps.find(a => a.cover && a !== t);
  return { t, coverer };
}
async function single(e, power, label) {
  let { t, coverer } = targetParty(e); if (!t) return;
  await step(e);
  await msg(`${e.name}の ${label}！`, 350);
  if (coverer) { t = coverer; await msg(`${G.stat(t.id).name}が かばった！`, 350); }
  const s = G.stat(t.id); const d = await hitParty(t, calcDmg(e.atk * (e.enrage || 1), s.def, power));
  if (!t.ko) await msg(`${s.name}は ${d}の ダメージを うけた！`, 550);
  await back(e);
}
async function all(e, power, label, fxCols) {
  await step(e);
  await msg(`${e.name}の ${label}！`, 450);
  burst(190, 60, 30, fxCols || ['#b07aff', '#e0d0ff'], 90);
  const res = [];
  for (const a of alive(st.party)) { const s = G.stat(a.id); const d = await hitParty(a, calcDmg(e.atk * (e.enrage || 1), s.def, power)); res.push(`${s.name}${d}`); }
  await msg(`みんなは ダメージを うけた！（${res.join('・')}）`, 750);
  await back(e);
}
async function enemyAct(e) {
  if (e.dead || st.result) return;
  const k = e.key;
  if (k === 'kinokon') { if (Math.random() < 0.22) await all(e, 0.45, '胞子ばらまき', ['#e8d0a0', '#fff']); else await single(e, 1, 'たいあたり'); return; }
  if (k === 'mosslin') { if (Math.random() < 0.3) await single(e, 1.35, 'ねばねばアタック'); else await single(e, 1, 'たいあたり'); return; }
  if (k === 'luu') {
    e.guard = false;
    const r = Math.random();
    if (r < 0.4) await single(e, 1, 'ひっかき');
    else if (r < 0.75) { e.guard = true; A.sfx('guard'); await msg('子狐は 光の粒を 抱えこむように まるくなった……', 900); }
    else await all(e, 0.55, 'まぶしい月光', ['#e0f0ff', '#ffffff']);
    return;
  }
  if (k === 'silva') return bossAct(e);
}
async function bossAct(e) {
  const pat = ['claw', 'breath', 'charge', 'eater'];
  const a = pat[e.turn % 4]; e.turn++;
  if (a === 'claw') await single(e, 1.0, '夜霧の爪');
  else if (a === 'breath') await all(e, 0.6, '霧の吐息');
  else if (a === 'charge') {
    A.sfx('warn'); e.charging = true; G.doShake(4, 500);
    await msg('シルヴァは 口を大きく開き、あたりの光を 吸いこみはじめた……！', 1000);
    $('bWarn').innerHTML = '⚠ 次のターン　シルヴァの大技「月喰い」！<br>全員に大ダメージ ―「ぼうぎょ」や ルゥの「月のヴェール」で備えよう'; $('bWarn').hidden = false;
    if (!st.chargeHint) { st.chargeHint = true; await msg('ミーナ「なんかヤバいのが来る！ みんな、守りを固めて！」', 1300); }
  } else {
    e.charging = false;
    await step(e); A.sfx('roar'); G.doShake(8, 700); st.flashScreen = 350;
    await msg('シルヴァの 月喰い！ 闇が すべてを 呑みこむ！', 700);
    const res = [];
    for (const x of alive(st.party)) { const s = G.stat(x.id); const d = await hitParty(x, calcDmg(e.atk * (e.enrage || 1), s.def, 2.3)); res.push(`${s.name}${d}`); }
    $('bWarn').hidden = true;
    const guarded = st.veil || alive(st.party).some(x => x.defend);
    await msg(`みんなは 大ダメージを うけた！（${res.join('・')}）${guarded ? '\n守りを固めていたおかげで、耐えきった！' : ''}`, 1000);
    await back(e);
  }
}

/* ---------- 描画 ---------- */
B.render = function (ctx, cv, dt, T) {
  const V = G.view; if (!st) return;
  const panel = $('bPanel').offsetHeight + ($('bWarn').hidden ? 0 : $('bWarn').offsetHeight + 6);
  const sceneH = Math.max(80, V.cssH - panel);
  const sc = Math.max(1, Math.min(V.cssW / VW, sceneH / 128));
  const w = Math.ceil(V.cssW / sc), h = Math.ceil(sceneH / sc);
  if (bb.width !== w || bb.height !== h) { bb.width = w; bb.height = h; }
  const x = bx; x.imageSmoothingEnabled = false;
  const ox = Math.round((w - VW) / 2), oy = Math.round((h - 128) * 0.55);
  st.ox = ox; st.oy = oy; st.sc = sc;
  x.drawImage(makeBg(st.cfg.bg, w, h), 0, 0);
  let sx = 0, sy = 0; if (G.shake.t > 0) { sx = Math.round((Math.random() - 0.5) * G.shake.mag); sy = Math.round((Math.random() - 0.5) * G.shake.mag); }
  x.save(); x.translate(ox + sx, oy + sy);
  // 敵
  for (const e of st.enemies) {
    if (e.alpha <= 0) continue;
    let img = G.gfx.SPR.mon[e.spr];
    const bob = Math.round(Math.sin(T / (e.boss ? 380 : 260) + e.x) * (e.boss ? 2 : 1));
    let ex = Math.round(e.x - img.width / 2 + e.ox + (e.shake > 0 ? (Math.random() - 0.5) * 4 : 0)), ey = Math.round(e.y + e.h / 2 - img.height + bob);
    if (e.shake > 0) e.shake -= dt;
    if (e.boss && e.armor) { for (let i = 0; i < 3; i++) { const a = T / 400 + i * 2.1; x.fillStyle = 'rgba(90,40,140,0.28)'; x.beginPath(); x.ellipse(e.x + Math.cos(a) * 26, e.y + Math.sin(a * 1.3) * 10, 30, 18, 0, 0, Math.PI * 2); x.fill(); } }
    if (e.boss && e.charging) { const r = 40 + Math.sin(T / 80) * 6; const g = x.createRadialGradient(e.x + 30, e.y - 10, 2, e.x + 30, e.y - 10, r); g.addColorStop(0, 'rgba(255,60,120,.6)'); g.addColorStop(1, 'rgba(255,60,120,0)'); x.fillStyle = g; x.fillRect(e.x + 30 - r, e.y - 10 - r, r * 2, r * 2); }
    x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(e.x, e.y + e.h / 2, img.width * 0.35, 3, 0, 0, Math.PI * 2); x.fill();
    x.globalAlpha = e.alpha;
    if (e.flash > 0) { e.flash -= dt; img = G.gfx.tint(img, '#ffffff', 0.85); }
    x.drawImage(img, ex, ey); x.globalAlpha = 1;
    if (e.boss && e.armor && Math.random() < 0.5) st.parts.push({ x: e.x + rnd(-40, 40), y: e.y + rnd(-20, 25), vx: rnd(-8, 8), vy: -rnd(8, 20), t: 0, life: 1.2, col: Math.random() < .5 ? '#6a3aa0' : '#3a2058', s: 2 });
  }
  // 味方
  for (const a of st.party) {
    const p = G.S.party[a.id];
    let img;
    if (a.id === 'luu') img = G.gfx.SPR.mon.luuL;
    else img = G.gfx.SPR.h[a.id][1][a.ox ? 1 : 0];
    if (a.flash > 0) { a.flash -= dt; img = G.gfx.tint(img, '#ffffff', 0.85); }
    let px = Math.round(a.x - img.width / 2 + a.ox + (a.shake > 0 ? (Math.random() - 0.5) * 3 : 0)), py = Math.round(a.y + 10 - img.height);
    if (a.shake > 0) a.shake -= dt;
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(a.x - 6, a.y + 9, 12, 2);
    if (a.ko) { x.save(); x.globalAlpha = 0.55; x.translate(a.x, a.y + 6); x.rotate(-Math.PI / 2); x.drawImage(img, -img.width / 2, -img.height / 2); x.restore(); }
    else {
      if (p.hp / G.stat(a.id).mhp < 0.25 && Math.floor(T / 300) % 2) py += 1;
      x.drawImage(img, px, py);
      if (a.defend) { x.strokeStyle = 'rgba(200,220,255,.7)'; x.strokeRect(px - 2, py + 2, img.width + 4, img.height - 2); }
    }
  }
  if (st.veil) { x.fillStyle = `rgba(170,210,255,${0.10 + Math.sin(T / 200) * 0.04})`; x.fillRect(165, 0, 80, 140); }
  // 斬撃
  for (let i = st.slashes.length - 1; i >= 0; i--) {
    const s = st.slashes[i]; s.t += dt; const k = s.t / 220; if (k > 1) { st.slashes.splice(i, 1); continue; }
    x.strokeStyle = `rgba(255,255,255,${1 - k})`; x.lineWidth = s.big ? 3 : 2; x.beginPath();
    x.moveTo(s.x - 14 + k * 4, s.y - 14); x.lineTo(s.x + 14, s.y + 12 - k * 4); x.stroke();
    if (s.big) { x.beginPath(); x.moveTo(s.x + 12, s.y - 14); x.lineTo(s.x - 12, s.y + 12); x.stroke(); }
  }
  // 月光
  if (st.beam) { st.beam.t += dt; const k = st.beam.t / 700; if (k > 1) st.beam = null; else { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, `rgba(220,240,255,${0.8 * (1 - k)})`); g.addColorStop(1, 'rgba(220,240,255,0)'); x.fillStyle = g; x.fillRect(st.beam.x - 16, -oy, 32, 160); } }
  // パーティクル
  for (let i = st.parts.length - 1; i >= 0; i--) { const q = st.parts[i]; q.t += dt / 1000; if (q.t > q.life) { st.parts.splice(i, 1); continue; } q.x += q.vx * dt / 1000; q.y += q.vy * dt / 1000; q.vy += 40 * dt / 1000; x.globalAlpha = 1 - q.t / q.life; x.fillStyle = q.col; x.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
  x.globalAlpha = 1;
  x.restore();
  if (st.flashScreen > 0) { st.flashScreen -= dt; x.fillStyle = `rgba(80,0,60,${st.flashScreen / 400})`; x.fillRect(0, 0, w, h); }
  if (st.intro > 0) { st.intro -= dt; x.fillStyle = `rgba(255,255,255,${Math.min(1, st.intro / 300)})`; x.fillRect(0, 0, w, h); }
  // 転送
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  const dpr = V.dpr;
  ctx.drawImage(bb, 0, 0, w, h, 0, 0, w * sc * dpr, h * sc * dpr);
  // ダメージ数字（高解像度）
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = st.pops.length - 1; i >= 0; i--) {
    const q = st.pops[i]; q.t += dt; if (q.t > 900) { st.pops.splice(i, 1); continue; }
    const k = q.t / 900; const yy = q.y - Math.min(1, q.t / 200) * 10;
    const X = (q.x + ox) * sc * dpr, Y = (yy + oy) * sc * dpr;
    ctx.font = `bold ${Math.round(Math.max(18, sc * 9) * dpr)}px DotGothic16, sans-serif`;
    ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4; ctx.lineWidth = 4 * dpr; ctx.strokeStyle = '#1a0e08'; ctx.strokeText(q.text, X, Y); ctx.fillStyle = q.col; ctx.fillText(q.text, X, Y); ctx.globalAlpha = 1;
  }
};

/* ---------- 戦闘本体 ---------- */
function setup(cfg) {
  const S = G.S;
  const party = S.members.map((id, i) => ({ side: 'p', id, x: 196 + (i % 2) * 14, y: 38 + i * 28, ox: 0, h: 20, flash: 0, shake: 0, ko: S.party[id].hp <= 0, def: 0 }));
  party.forEach(a => a.def = G.stat(a.id).def);
  const n = cfg.enemies.length;
  const enemies = cfg.enemies.map((k, i) => {
    const d = D.enemies[k]; const img = G.gfx.SPR.mon[d.spr];
    const e = { side: 'e', key: k, name: d.name + (n > 1 ? String.fromCharCode(65 + i) : ''), hp: d.hp, mhp: d.hp, atk: d.atk, def: d.def, spd: d.spd, spr: d.spr, boss: !!d.boss, x: d.boss ? 70 : 62 - (i % 2) * 18 + (n === 1 ? 0 : 0), y: d.boss ? 62 : (n === 1 ? 64 : 42 + i * 34), h: img.height, ox: 0, alpha: 1, flash: 0, shake: 0, turn: 0 };
    if (d.boss) { e.armor = true; e.clear = 0; }
    if (cfg.name && n === 1) e.name = cfg.name;
    return e;
  });
  return { cfg, party, enemies, pops: [], parts: [], slashes: [], result: null, round: 0, intro: 400 };
}
function snapshot() { return JSON.parse(JSON.stringify({ party: G.S.party, items: G.S.items })); }
B.start = async function (cfg) {
  const S = G.S, ep = G.epoch;
  const snap = snapshot();
  const prevBgm = A.cur && A.cur.name;
  A.sfx('encounter');
  await G.fade(1, 250, true);
  G.mode = 'battle'; document.body.classList.add('inBattle'); G.setPads(false);
  $('battleUI').hidden = false; $('bWarn').hidden = true; $('bCmd').innerHTML = ''; $('bCmdHead').textContent = '';
  A.play(cfg.bgm || 'battle');
  let result;
  while (true) {
    st = setup(cfg);
    renderStatus(null);
    await G.fade(0, 250);
    if (cfg.introMsg) await msg(cfg.introMsg, 1100);
    else await msg(st.enemies.length > 1 ? `${D.enemies[cfg.enemies[0]].name}たちが あらわれた！` : `${st.enemies[0].name}が あらわれた！`, 900);
    if (cfg.onStart) await cfg.onStart(st, msg);
    result = await loop();
    if (ep !== G.epoch) return;
    if (result !== 'lose') break;
    A.play('dark'); A.sfx('lose');
    await msg('パーティは 全滅してしまった……', 1300);
    const retry = await G.gameOver();
    if (ep !== G.epoch) return;
    S.party = JSON.parse(JSON.stringify(snap.party)); S.items = JSON.parse(JSON.stringify(snap.items));
    G.healAll();
    A.play(cfg.bgm || 'battle');
    $('bWarn').hidden = true;
  }
  // 勝利
  let gained = 0;
  if (result === 'win') {
    A.play('none'); A.stop(); A.sfx('win');
    gained = st.enemies.reduce((s, e) => s + D.enemies[e.key].exp, 0);
    await msg(cfg.winMsg || 'まものたちを やっつけた！', 1000);
  } else if (result === 'event') {
    gained = cfg.eventExp || 0;
  }
  if (gained) {
    await msg(`それぞれ ${gained} の経験値を かくとく！`, 900);
    const ups = await G.addExp(gained);
    if (ups.length) { A.sfx('level'); renderStatus(null); await msg(`レベルが ${G.S.lv} に上がった！ HPやMP、ちからが のびた！`, 1400); }
  }
  if (cfg.drop) { S.items[cfg.drop] = (S.items[cfg.drop] || 0) + 1; A.sfx('item'); await msg(`${D.items[cfg.drop].name}を 手に入れた！`, 900); }
  for (const id of S.members) if (S.party[id].hp <= 0) S.party[id].hp = 1;
  await G.fade(1, 250);
  $('battleUI').hidden = true; document.body.classList.remove('inBattle'); G.setPads(true);
  G.mode = 'field'; st = null;
  if (prevBgm && !cfg.keepSilent) A.play(prevBgm);
  await G.fade(0, 250);
  return result;
};
async function loop() {
  while (true) {
    st.round++;
    if (st.cfg.tutorial && st.round === 1) $('bMsg').textContent = '【はじめての戦闘】「たたかう」で攻撃。「とくぎ」はMPを使う技、「ぼうぎょ」は受けるダメージを半分にします。';
    else if (st.cfg.hint && st.cfg.hint(st)) $('bMsg').textContent = st.cfg.hint(st);
    else $('bMsg').textContent = 'コマンドを えらんでください。';
    const acts = await commandPhase();
    acts.sort((p, q) => (q.a.id === 'rio' && q.k === 'talk') - (p.a.id === 'rio' && p.k === 'talk') || G.stat(q.a.id).spd - G.stat(p.a.id).spd);
    for (const act of acts) {
      await doAct(act);
      if (st.result) return st.result;
      if (!alive(st.enemies).length) return 'win';
      if (st.cfg.onAfterHit) { const r = await st.cfg.onAfterHit(st, msg); if (r) return r; }
    }
    for (const e of st.enemies) {
      await enemyAct(e);
      if (!alive(st.party).length) return 'lose';
    }
    // ラウンド終了
    for (const e of st.enemies) if (e.boss && !e.dead) {
      if (!e.armor) { e.clear--; if (e.clear <= 0 && !e.charging) { e.armor = true; A.sfx('roar'); await msg('黒い霧が ふたたび シルヴァを 包みこんだ！', 1000); } }
    }
    if (st.cfg.onRoundEnd) { const r = await st.cfg.onRoundEnd(st, msg); if (r) return r; }
  }
}
B.state = () => st;
})();
