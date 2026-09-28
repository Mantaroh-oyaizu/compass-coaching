/* フレイア・クロニクル — 起動・画面遷移 */
(function () {
'use strict';
const G = window.G, D = G.data, A = G.audio, $ = G.$, sleep = G.sleep;
const MAP_SRC = 'assets/freia-map.jpg';
let mapImg = null, mapOk = false;

function show(id) { ['scrLoading', 'scrTitle', 'scrIntro', 'scrMap', 'scrOver', 'scrEnd'].forEach(s => $(s).hidden = s !== id); }
function hideAll() { show('__none'); }

/* ---------- 読み込み ---------- */
function loadImage(src, ms) {
  return new Promise((res, rej) => {
    const img = new Image(); let done = false;
    const t = setTimeout(() => { if (!done) { done = true; rej(new Error('timeout')); } }, ms);
    img.onload = () => { if (!done) { done = true; clearTimeout(t); res(img); } };
    img.onerror = () => { if (!done) { done = true; clearTimeout(t); rej(new Error('error')); } };
    img.src = src;
  });
}
async function boot(bust) {
  show('scrLoading'); $('loadErr').hidden = true; $('loadMsg').textContent = '冒険の準備をしています…';
  $('loadBar').style.width = '10%';
  try { G.gfx.build(); D.buildMaps(); } catch (e) { console.error(e); }
  $('loadBar').style.width = '40%';
  const fontP = (document.fonts && document.fonts.load) ? Promise.race([Promise.all([document.fonts.load('16px DotGothic16'), document.fonts.load('16px "Zen Maru Gothic"')]), sleep(2500)]).catch(() => { }) : Promise.resolve();
  try {
    mapImg = await loadImage(MAP_SRC + (bust ? '?r=' + Date.now() : ''), 20000);
    mapOk = true;
  } catch (e) {
    $('loadErr').hidden = false; $('loadMsg').textContent = '読み込みエラー'; return;
  }
  $('loadBar').style.width = '80%';
  await fontP;
  $('loadBar').style.width = '100%';
  await sleep(200);
  finishBoot();
}
let booted = false;
function finishBoot() {
  if (booted) { toTitle(); return; }
  booted = true;
  $('mapImg').src = mapOk ? mapImg.src : '';
  if (!mapOk) $('mapWrap').classList.add('noimg');
  G.layout(); G.startLoop();
  toTitle();
}
$('btnRetry').onclick = () => boot(true);
$('btnSkipLoad').onclick = () => { mapOk = false; finishBoot(); };

/* ---------- タイトル ---------- */
let titleAnim = null;
function toTitle() {
  G.epoch++; G.busy = false; G.closeDlg(); G.closeModal(); G.clearMenu();
  $('battleUI').hidden = true; document.body.classList.remove('inBattle'); G.setPads(true);
  $('fader').style.opacity = 0; G.onScreenA = null;
  G.mode = 'none';
  show('scrTitle');
  $('btnContinue').hidden = !G.loadSave();
  A.play('title');
  startTitleAnim();
  const btns = [$('btnStart'), $('btnContinue'), $('btnTitleSettings')].filter(b => !b.hidden);
  G.setMenu(btns);
}
G.toTitle = toTitle;
function startTitleAnim() {
  const c = $('titleCv'), x = c.getContext('2d'); const motes = [];
  for (let i = 0; i < 50; i++) motes.push({ x: Math.random(), y: Math.random(), v: 0.01 + Math.random() * 0.03, s: 1 + Math.random() * 2.5, p: Math.random() * 6 });
  cancelAnimationFrame(titleAnim);
  (function f(t) {
    if ($('scrTitle').hidden) return;
    const W = c.clientWidth, H = c.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#0d0906'; x.fillRect(0, 0, W, H);
    if (mapOk) {
      const s = Math.max(W / 1536, H / 1024) * 1.25; const iw = 1536 * s, ih = 1024 * s;
      const px = (W - iw) / 2 + Math.sin(t / 9000) * iw * 0.05, py = (H - ih) / 2 + Math.cos(t / 11000) * ih * 0.04;
      x.globalAlpha = 0.5; x.drawImage(mapImg, px, py, iw, ih); x.globalAlpha = 1;
    }
    const g = x.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(40,20,8,0.1)'); g.addColorStop(1, 'rgba(8,4,2,0.92)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    // 失われた月
    const mx = W * 0.5, my = H * 0.13, mr = Math.min(W, H) * 0.07;
    x.strokeStyle = 'rgba(200,210,255,0.25)'; x.lineWidth = 1.5; x.setLineDash([4, 6]); x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    for (const m of motes) {
      m.y -= m.v / 60; if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
      const a = 0.4 + Math.sin(t / 500 + m.p) * 0.3;
      x.fillStyle = `rgba(255,${190 + (m.p * 10 | 0)},110,${a})`; x.beginPath(); x.arc(m.x * W + Math.sin(t / 1500 + m.p) * 10, m.y * H, m.s, 0, Math.PI * 2); x.fill();
    }
    titleAnim = requestAnimationFrame(f);
  })(0);
}
$('btnStart').onclick = async () => {
  A.init(); A.sfx('ok');
  if (G.loadSave()) {
    const ok = await G.confirm('はじめから遊ぶ', '記録されている「つづき」を消して、はじめから遊びますか？', 'はじめから');
    if (!ok) { G.setMenu([$('btnStart'), $('btnContinue'), $('btnTitleSettings')].filter(b => !b.hidden)); return; }
  }
  newGame();
};
$('btnContinue').onclick = () => { A.init(); A.sfx('ok'); continueGame(); };
$('btnTitleSettings').onclick = () => { A.init(); G.openSettings(() => G.setMenu([$('btnStart'), $('btnContinue'), $('btnTitleSettings')].filter(b => !b.hidden))); };

async function newGame() {
  G.epoch++; const ep = G.epoch;
  G.clearMenu(); G.clearSave();
  G.S = G.newState(); G.fxLight = 1;
  $('fader').style.opacity = 0;
  G.busy = true;
  await playIntro(); if (ep !== G.epoch) return;
  await G.showWorldMap('intro'); if (ep !== G.epoch) return;
  hideAll();
  G.enterMap('village', 11, 10, 3);
  G.mode = 'field'; G.setObj('');
  G.busy = false;
  await G.fade(1, 1); await G.fade(0, 600);
  G.run(G.story.opening);
}
function continueGame() {
  const s = G.loadSave(); if (!s) return newGame();
  G.epoch++; G.clearMenu();
  G.S = s; G.fxLight = 1; G.busy = false;
  hideAll();
  G.enterMap(s.map, s.x, s.y, s.dir);
  G.mode = 'field'; G.setObj(s.obj || '');
  $('fader').style.opacity = 1; G.fade(0, 500);
  G.toast('つづきから再開します', 1200);
}

/* ---------- 導入 ---------- */
const INTRO = [
  '三十年前――\nフレイア大陸の夜空から、月が消えた。',
  '月のない夜には「夜霧」が満ち、\n魔物たちは正気を失っていく。',
  '人々は、灯守（ひもり）がともす\n「聖灯」に守られて暮らしている。',
  'そして今――\nひとつの村の灯が、消えかけていた。',
];
function playIntro() {
  const ep = G.epoch;
  return new Promise(res => {
    show('scrIntro'); A.play('title');
    let i = -1, timer = null, done = false;
    const el = $('introText');
    function next() {
      if (done || ep !== G.epoch) return;
      i++; clearTimeout(timer);
      if (i >= INTRO.length) { finish(); return; }
      el.innerHTML = `<div class="ln">${INTRO[i].replace(/\n/g, '<br>')}</div>`;
      timer = setTimeout(next, 3400);
    }
    function finish() { done = true; clearTimeout(timer); G.onScreenA = null; $('scrIntro').onclick = null; res(); }
    let lastTap = 0;
    $('scrIntro').onclick = e => { if (e.target.id === 'btnSkipIntro') return; if (performance.now() - lastTap < 350) return; lastTap = performance.now(); A.sfx('cursor'); next(); };
    $('btnSkipIntro').onclick = e => { e.stopPropagation(); A.sfx('ok'); finish(); };
    G.onScreenA = () => { if (performance.now() - lastTap < 350) return; lastTap = performance.now(); next(); };
    next();
  });
}

/* ---------- 世界地図 ---------- */
function mark(key, cls, html) {
  const p = G.story.POS[key];
  return `<div class="mk ${cls}" style="left:${p[0] / 15.36}%;top:${p[1] / 10.24}%"><div class="dot"></div>${html ? `<div class="lb">${html}</div>` : ''}</div>`;
}
G.showWorldMap = function (mode) {
  const ep = G.epoch;
  return new Promise(res => {
    show('scrMap');
    const marks = $('mapMarks'), svg = $('mapSvg'), cap = $('mapCaption'), btn = $('btnMapNext');
    let pages;
    const P = G.story.POS;
    if (mode === 'intro') {
      $('mapTitle').textContent = 'フレイア大陸';
      pages = [{ marks: mark('village', 'here', '<b>現在地</b>　ルミナ村<br>エジスタダイト王国・南部') + mark('ruins', 'soft up', '目的地　星見の祠'), route: [['village', 'forest', 'ruins']], cap: '旅は、エジスタダイト王国の南のはずれ――<br>小さな「ルミナ村」から始まる。' }];
    } else if (mode === 'here') {
      const where = G.S.map; const nm = { village: 'ルミナ村', forest: '月影の森', ruins: '星見の祠' }[where];
      $('mapTitle').textContent = 'フレイア大陸';
      pages = [{ marks: mark(where, 'here', `<b>現在地</b>　${nm}`) + (where !== 'ruins' ? mark('ruins', 'soft up', '星見の祠') : ''), route: [], cap: 'エジスタダイト王国・南部。大陸は、まだまだ広い。' }];
    } else {
      $('mapTitle').textContent = '冒険は、大陸のほんの一部にすぎない';
      pages = [
        { marks: mark('village', 'here', '<b>今回の旅</b><br>ルミナ村〜星見の祠'), route: [['village', 'forest', 'ruins']], cap: '今回の旅は、フレイア大陸の南の、ほんの一角。' },
        { marks: mark('village', 'soft', '') + mark('yugres', 'here', '<b>次なる舞台</b><br>ユーグレース公国'), route: [['ruins', 'yugres']], cap: '次なる舞台は、霧に沈む山の国「ユーグレース公国」。<br>そこでも、月の獣が泣いているという。' },
        { marks: mark('yugres', 'soft', '') + mark('spersatin', 'soft up', 'スペルサティン王国<br>禁書庫の魔導士？') + mark('aurelian', 'soft', 'オーレリアン帝国<br>空駆ける竜騎士？'), route: [['ruins', 'yugres', 'spersatin']], cap: 'まだ見ぬ仲間たち――<br>禁書庫に眠る魔導士、空を駆ける竜騎士……。' },
        { marks: mark('village', 'soft', '') + mark('moonlit', 'far up', '<b>ムーンリット帝国</b><br>蝕帝ノクス'), route: [['ruins', 'yugres', 'spersatin', 'moonlit']], cap: 'そして北の果て、月の都「ムーンリット帝国」。<br>月を隠した者が、そこで待っている。' },
      ];
    }
    let i = 0;
    function render() {
      const pg = pages[i];
      marks.innerHTML = pg.marks;
      svg.innerHTML = pg.route.map(r => { const pts = r.map(k => P[k]); let d = `M${pts[0][0]},${pts[0][1]}`; for (let j = 1; j < pts.length; j++) { const a = pts[j - 1], b = pts[j]; const mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.15, my = (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.15; d += ` Q${mx},${my} ${b[0]},${b[1]}`; } return `<path class="route anim" d="${d}"/>`; }).join('');
      cap.innerHTML = pg.cap;
      btn.textContent = i < pages.length - 1 ? 'つぎへ' : (mode === 'here' ? 'とじる' : 'すすむ');
      if (mode === 'ending' && i === 3) A.sfx('warn');
    }
    btn.onclick = () => { A.sfx('ok'); if (ep !== G.epoch) return; if (i < pages.length - 1) { i++; render(); return; } G.clearMenu(); G.onScreenA = null; hideAll(); res(); };
    G.setMenu([btn]);
    if (mode === 'ending') A.play('ending');
    render();
  });
};

/* ---------- 全滅 ---------- */
G.gameOver = function () {
  return new Promise(res => {
    show('scrOver');
    $('btnRetryBattle').onclick = () => { A.sfx('ok'); G.clearMenu(); hideAll(); res(true); };
    $('btnOverTitle').onclick = async () => { A.sfx('ok'); const ok = await G.confirm('タイトルへ戻る', 'この戦闘をやめて、タイトルへ戻りますか？（直前の記録から再開できます）', '戻る'); if (ok) toTitle(); else G.setMenu([$('btnRetryBattle'), $('btnOverTitle')]); };
    G.setMenu([$('btnRetryBattle'), $('btnOverTitle')]);
  });
};

/* ---------- エンディング ---------- */
let endAnim = null;
G.showEnding = function () {
  show('scrEnd'); $('scrEnd').scrollTop = 0;
  // アニメーションを再生し直す
  document.querySelectorAll('.endInner>div').forEach(d => { d.style.animation = 'none'; void d.offsetWidth; d.style.animation = ''; });
  A.play('ending');
  const c = $('endCv'), x = c.getContext('2d'); const stars = []; for (let i = 0; i < 120; i++) stars.push({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + .3, p: Math.random() * 6 });
  const t0 = performance.now();
  cancelAnimationFrame(endAnim);
  (function f(t) {
    if ($('scrEnd').hidden) return;
    const W = c.clientWidth, H = c.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05030c'); g.addColorStop(1, '#1d1238'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (const s of stars) { x.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(t / 700 + s.p) * 0.3})`; x.fillRect(s.x * W, s.y * H, s.s, s.s); }
    // 戻りはじめる月
    const k = Math.min(1, (t - t0) / 6000); const mx = W * 0.82, my = H * 0.14, r = Math.min(W, H) * 0.06;
    x.fillStyle = `rgba(235,240,255,${0.15 + k * 0.6})`; x.beginPath(); x.arc(mx, my, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#0a0618'; x.beginPath(); x.arc(mx + r * (0.2 + (1 - k) * 0.8), my - r * 0.1, r * 0.95, 0, Math.PI * 2); x.fill();
    endAnim = requestAnimationFrame(f);
  })(t0);
  G.setMenu([$('btnAgain'), $('btnEndTitle'), $('btnShare')]);
};
$('btnAgain').onclick = () => { A.sfx('ok'); newGame(); };
$('btnEndTitle').onclick = () => { A.sfx('ok'); toTitle(); };
$('btnShare').onclick = async () => {
  A.sfx('ok');
  const url = location.href.split('#')[0];
  const data = { title: 'フレイア・クロニクル 灯守の旅立ち｜無料体験版', text: 'ブラウザですぐ遊べるRPG体験版『フレイア・クロニクル 灯守の旅立ち』', url };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  let copied = false;
  try { await navigator.clipboard.writeText(url); copied = true; } catch (e) { }
  G.openModal(`<h3>体験版のURL</h3><p>${copied ? 'URLをコピーしました。LINEやメールに貼り付けて送れます。' : '下のURLを長押し（または選択）してコピーしてください。'}</p>
    <input id="shareUrl" readonly value="${url.replace(/"/g, '&quot;')}" style="width:100%;font-size:14px;padding:8px;border:2px solid #b89a6a;border-radius:6px;user-select:text;-webkit-user-select:text">
    <div class="mrow"><button class="btn sub" id="shCopy">コピー</button><button class="btn" id="shClose">とじる</button></div>`, { onCancel: closeShare });
  function closeShare() { G.closeModal(); G.setMenu([$('btnAgain'), $('btnEndTitle'), $('btnShare')]); }
  $('shareUrl').addEventListener('focus', e => e.target.select());
  $('shCopy').onclick = async () => { const i = $('shareUrl'); i.focus(); i.select(); i.setSelectionRange(0, 9999); let ok = false; try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { try { ok = document.execCommand('copy'); } catch (_) { } } $('shCopy').textContent = ok ? 'コピーしました' : '長押しでコピー'; };
  $('shClose').onclick = closeShare;
};

// タブ非表示時の音
document.addEventListener('visibilitychange', () => { if (!A.ctx) return; if (document.hidden) A.ctx.suspend().catch(() => { }); else A.ctx.resume().catch(() => { }); });

// テスト用フック
window.__freia = { G, newGame, continueGame, toTitle };

G.layout();
boot(false);
})();
