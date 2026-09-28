/* フレイア・クロニクル — 物語・イベント */
(function () {
'use strict';
const G = window.G = window.G || {};
const D = G.data, A = G.audio, $ = G.$, sleep = G.sleep;
const say = (w, t) => G.say(w, t);
const F = k => G.flag(k);
const story = G.story = {};
const TS = 16;

/* ---------- 世界地図上の位置（元画像 1536×1024 基準） ---------- */
const POS = {
  village: [548, 700], forest: [590, 655], ruins: [628, 622],
  yugres: [742, 592], spersatin: [742, 398], moonlit: [1105, 262], aurelian: [1110, 495], felistil: [360, 330], mossagate: [735, 765], egista: [392, 648],
};

/* ---------- 汎用 ---------- */
async function getItem(k, n, from) {
  G.S.items[k] = (G.S.items[k] || 0) + (n || 1); A.sfx('chest');
  await G.toast(`${from ? from + 'から ' : ''}<b>${D.items[k].name}</b>${n > 1 ? ' ×' + n : ''} を手に入れた！<br><small>${D.items[k].desc}</small>`, 1500);
}
async function joinParty(id, line) {
  const S = G.S;
  if (S.members.includes(id)) return;
  S.members.push(id);
  const st = G.stat(id); S.party[id].hp = st.mhp; S.party[id].mp = st.mmp;
  G.rebuildFollowers();
  A.sfx('join');
  const p = G.player; G.sparkle(p.px + 8, p.py + 4, 40, ['#ffe07a', '#ffffff', '#9fd8ff', '#ffb0d0']);
  G.doShake(2, 200);
  await G.toast(`<b style="font-size:20px;color:#ffd87a">${st.name}が 仲間になった！</b><br>${line}`, 2600);
}
function ent(id) { return G.ents.find(e => e.id === id); }
function obj(t) { G.setObj(t); }

/* ---------- エンティティ ---------- */
const lyingMina = (() => { let c = null; return () => { if (c) return c; const s = G.gfx.SPR.h.mina[0][0]; c = document.createElement('canvas'); c.width = 24; c.height = 20; const x = c.getContext('2d'); x.translate(12, 12); x.rotate(Math.PI / 2); x.drawImage(s, -9, -12); return c; }; })();

story.entities = {
  village: [
    { id: 'grandma', kind: 'npc', look: 'grandma', x: 10, y: 10, dir: 2, talk: talkGrandma },
    { id: 'pipi', kind: 'npc', look: 'pipi', x: 14, y: 8, dir: 0, idle: true, talk: talkPipi },
    { id: 'olga', kind: 'npc', look: 'olga', x: 18, y: 6, dir: 0, talk: talkOlga },
    { id: 'gant', kind: 'npc', look: 'gant', x: 18, y: 11, dir: 2, talk: talkGant },
    { id: 'lena', kind: 'npc', look: 'lena', x: 8, y: 15, dir: 0, talk: talkLena },
    { id: 'minaLying', kind: 'npc', x: 12, y: 3, fixedDir: true, cond: () => !F('minaJoined'), talk: talkMina,
      draw: (x, sx, sy, T) => { x.drawImage(lyingMina(), sx - 4, sy - 2); if (Math.floor(T / 700) % 2) { x.fillStyle = '#fff'; x.font = '6px monospace'; } } },
    { id: 'chestV', kind: 'chest', x: 21, y: 17, opened: () => F('chestV'), talk: async () => { if (F('chestV')) return say(null, '宝箱は からっぽだ。'); G.setFlag('chestV'); await getItem('herb', 2, '宝箱'); } },
  ],
  forest: [
    { id: 'kino1', kind: 'enemy', x: 9, y: 26, cond: () => !F('won1'), touch: battleKinokon, talk: battleKinokon, draw: drawMon('kinokon') },
    { id: 'kino2', kind: 'enemy', x: 10, y: 26, cond: () => !F('won1'), touch: battleKinokon, talk: battleKinokon, draw: drawMon('kinokon', 1) },
    { id: 'moss', kind: 'enemy', x: 15, y: 23, cond: () => !F('mossWon'), touch: battleMoss, talk: battleMoss, draw: drawMon('mosslin') },
    { id: 'chestF1', kind: 'chest', x: 2, y: 22, opened: () => F('chestF1'), talk: async () => { if (F('chestF1')) return say(null, '宝箱は からっぽだ。'); G.setFlag('chestF1'); await getItem('drop', 1, '宝箱'); } },
    { id: 'chestF2', kind: 'chest', x: 16, y: 10, opened: () => F('chestF2'), talk: async () => { if (F('chestF2')) return say(null, '宝箱は からっぽだ。'); G.setFlag('chestF2'); await getItem('herb', 2, '宝箱'); if (G.S.members.includes('mina')) await say('mina', 'やくそう！　……って、食べ物じゃないのね。'); } },
    { id: 'luuEnt', kind: 'npc', x: 10, y: 9, dir: 1, cond: () => F('luuScene') && !F('luuJoined'), fixedDir: true,
      draw: (x, sx, sy, T) => { const e = ent('luuEnt'); const s = (e.dir === 2 ? G.gfx.SPR.foxR : G.gfx.SPR.fox)[e.walk ? ((e.anim || 0) % 2) : (Math.floor(T / 400) % 2)]; x.drawImage(s, sx - 2, sy - 4 - (e.hop ? 3 : 0)); } },
  ],
  ruins: [
    { id: 'silva', kind: 'boss', x: 5, y: 3, w: 5, h: 3, cond: () => !F('bossWon') || F('silvaScene'),
      draw: (x, sx, sy, T) => {
        const e = ent('silva'); const pure = F('bossWon');
        const img = pure ? G.gfx.SPR.mon.silvaPure : G.gfx.SPR.mon.silva;
        const bob = Math.round(Math.sin(T / 500) * 1.5);
        x.save(); x.globalAlpha = e.alpha == null ? 1 : e.alpha;
        if (!pure) { for (let i = 0; i < 4; i++) { const a = T / 700 + i * 1.6; x.fillStyle = 'rgba(70,30,110,0.25)'; x.beginPath(); x.ellipse(sx + 40 + Math.cos(a) * 20, sy + 30 + Math.sin(a) * 8, 34, 14, 0, 0, Math.PI * 2); x.fill(); } }
        else { const g = x.createRadialGradient(sx + 40, sy + 24, 4, sx + 40, sy + 24, 60); g.addColorStop(0, 'rgba(190,225,255,.45)'); g.addColorStop(1, 'rgba(190,225,255,0)'); x.fillStyle = g; x.fillRect(sx - 20, sy - 36, 120, 120); }
        x.drawImage(img, sx + 40 - img.width / 2, sy + 48 - img.height + bob);
        x.restore();
      } },
  ],
};
function drawMon(k, ph) {
  return (x, sx, sy, T) => { const img = G.gfx.SPR.mon[k]; const b = Math.floor(T / 300 + (ph || 0)) % 2; x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(sx + 2, sy + 13, 12, 3); x.drawImage(img, sx + 8 - img.width / 2, sy + 16 - img.height - b); };
}

story.lights = function (map) {
  if (map === 'village') { const n = G.S.night; return [{ x: 11, y: 9, r: n ? 90 : 34, a: n ? 0.55 : (F('introDone') ? 0.22 : 0.18) }, { x: 10, y: 5, r: n ? 40 : 16, a: 0.2 }, { x: 13, y: 5, r: n ? 40 : 16, a: 0.2 }]; }
  if (map === 'ruins') return [{ x: 12, y: 11, r: 40, a: 0.35, c: '120,200,255', oy: 8 }, { x: 7, y: 2, r: 46, a: F('bossWon') ? 0.45 : 0.18, c: F('bossWon') ? '190,225,255' : '160,60,200', oy: 8 }];
  if (map === 'forest') return F('luuJoined') ? [] : [{ x: 7, y: 11, r: 18, a: 0.3, c: '160,210,255', oy: 8 }];
  return [];
};

story.tileTalk = function (map, x, y, ch) {
  if (ch === 's') {
    if (map === 'village') return () => say(null, '看板：「北　月影の森　／　その先　星見の祠」');
    if (map === 'forest' && y > 20) return () => say(null, '看板：「ここより月影の森。夜霧に注意。灯を絶やすな」');
    return () => say(null, '看板：「この先　星見の祠。月の獣の眠る地」');
  }
  if (ch === 'L') return async () => { if (G.S.night) return say(null, '聖灯が あたたかく燃えている。……シルヴァの光だ。'); await say(null, 'ルミナ村の聖灯。火が細く、今にも消えそうだ……。'); };
  if (ch === 'l') return () => say(null, '村の街灯。聖灯から火を分けてもらっている。');
  if (ch === 'W') return async () => { await say(null, '井戸をのぞきこむと、水面に自分の顔が映った。'); await say('rio', '……寝ぐせ、ついてる。'); };
  if (ch === 'd') return () => (x === 4 && y === 4) ? say('rio', '自分の家だ。今は旅立ちが先だ。') : say(null, 'カギがかかっている。');
  if (ch === 'n') return () => say(null, '窓から、パンの焼けるいい匂いがする。');
  if (ch === 'c') return async () => { await say(null, '切り株の上に、小さな光の粒が いくつも散らばっている……。'); if (!F('luuJoined') && G.S.members.includes('mina')) await say('mina', 'ホタル……じゃないわね。ランタンの火みたい。'); };
  if (ch === 'P') return () => say(null, '古い柱。月と狐の紋様が刻まれている。');
  if (ch === 'A') return () => say(null, '祭壇に、月の形のくぼみがある。');
  if (ch === 'S') return spring;
  if (ch === 'w' && map === 'village') return () => say(null, '池で小魚が はねた。');
  if (ch === 'x') return () => say(null, '茂みの中で、何かが光った気がする。');
  return null;
};

/* ---------- 移動トリガー ---------- */
story.onStep = function (x, y) {
  const m = G.S.map;
  if (m === 'village' && y === 0) {
    if (!F('minaJoined')) G.run(async () => { await say('rio', '（道で倒れている人を、ほうっておけない……）'); await G.movePlayer(['down']); });
    else G.run(() => goto('forest', 9, 28, 3));
  }
  if (m === 'forest') {
    if (y === 29) G.run(() => goto('village', 11, 1, 0));
    else if (y === 0) G.run(() => goto('ruins', 7, 18, 3));
    else if (y <= 13 && !F('luuJoined')) G.run(luuEvent);
  }
  if (m === 'ruins') {
    if (y === 19) G.run(() => goto('forest', 9, 1, 0));
    else if (y <= 9 && !F('bossWon')) G.run(bossEvent);
  }
};
async function goto(map, x, y, dir) {
  await G.fade(1, 300);
  G.enterMap(map, x, y, dir);
  await G.fade(0, 300);
  G.save();
  if (map === 'forest' && !F('forestIntro')) await forestIntro();
  if (map === 'ruins' && !F('ruinsIntro')) await ruinsIntro();
}

/* ---------- 村 ---------- */
story.opening = async function () {
  obj('');
  await sleep(500);
  G.emote(ent('grandma'), '…', 1000); await sleep(700);
  await say('grandma', 'リオや。聖灯の火が、ずいぶん細くなってしもうたのう。');
  G.player.dir = 1;
  await say('rio', '……夜霧が、また濃くなってるんだね。');
  await say('grandma', '北の「月影の森」を抜けた先に「星見の祠」がある。そこに眠る「星のかけら」があれば、灯はよみがえる。');
  await say('grandma', '本当は、わしが行きたいんじゃが……。');
  await say('grandma', '昨日、張り切って薪割りをしたら、腰がのう。');
  await say('rio', '……だから言ったのに。');
  await say('rio', '任せて、ばあちゃん。見習いだけど、ぼくだって灯守だ。');
  await say('grandma', 'ふぉふぉ。ならば、このランタンを持っておいき。灯守の証じゃ。');
  A.sfx('item'); G.sparkle(G.player.px + 8, G.player.py + 6, 16, ['#ffe07a', '#fff']);
  await G.toast('<b>灯守のランタン</b> を受け取った！', 1400);
  await say('grandma', 'そういえば、ピピが「北の出口に人が落ちてた」と騒いでおったが……。');
  await say('rio', '落ちてた……？');
  G.setFlag('introDone');
  obj('北の出口へ向かおう');
  await G.toast('移動：十字パッド／矢印キー・WASD<br>話す・調べる：A／Enter　メニュー：B／Esc', 2600);
};
async function talkGrandma() {
  if (!F('introDone')) return;
  if (!F('minaJoined')) return say('grandma', '北の出口から森へ行けるよ。倒れておった人も、気にかけてやっておくれ。');
  await say('grandma', 'にぎやかな娘さんじゃのう。旅は道連れじゃ。気をつけてな。');
  if (G.S.party.rio.hp < G.stat('rio').mhp || (G.S.members.includes('mina') && G.S.party.mina.hp < G.stat('mina').mhp)) {
    G.healAll(); A.sfx('heal'); await say('grandma', 'どれ、少し休んでいきなさい。……ほれ、元気が出たろう。'); await G.toast('みんなのHPとMPが回復した！', 1200);
  }
}
async function talkPipi() {
  if (!F('minaMet') && !F('minaJoined')) { await say('pipi', 'リオにいちゃん！　北の出口にね、赤い髪の人が落ちてた！'); await say('rio', '落ちてた……？'); await say('pipi', 'うん。落ちてた。'); return; }
  if (!F('minaJoined')) return say('pipi', 'あの人、「めし……」しか言わないの。ゆうれいかな？');
  await say('pipi', 'あのお姉ちゃん、パンのにおいで起きたんだって？　犬みたい！');
  await say('mina', '聞こえてるわよ！');
}
async function talkOlga() {
  if (F('minaJoined')) return say('olga', 'あの子、パンをひと口で食べちまったよ。いい食べっぷりだねえ！');
  if (G.S.items.bread) return say('olga', '冷めないうちに、届けておあげ！');
  if (!F('minaMet')) return say('olga', 'おや、リオ。旅立ちかい？　焼きたてのパン、あとで取りにおいでよ。');
  await say('rio', 'オルガさん、北の出口で人が倒れてて……「めし」って。');
  await say('olga', '行き倒れかい!?　まあ大変！　この「はちみつパン」を持っておいき！');
  await getItem('bread', 1, 'オルガ');
  obj('行き倒れの人にパンを届けよう');
}
async function talkGant() {
  await say('gant', 'わしが若いころはな、夜空にでっかい月があった。');
  await say('gant', '「月狐」っちゅう銀色の狐が、灯守と一緒に夜を見回っとった。……今じゃ、おとぎ話じゃがの。');
}
async function talkLena() {
  if (F('luuJoined')) return say('lena', 'その子……銀色の狐？　きれい……。');
  await say('lena', 'リオ、森へ行くの？　最近、森で「灯が盗まれる」んだって。');
  await say('lena', '旅人のランタンの火が、ふっと消えちゃうの。気をつけてね。');
}
async function talkMina() {
  const m = ent('minaLying');
  if (!F('minaMet')) {
    await say('minaQ', '……うう……もう、だめ……');
    await say('rio', 'だ、大丈夫ですか!?');
    await say('minaQ', '……め……');
    await say('rio', 'め？');
    await say('minaQ', '……めし……');
    await say('rio', '…………。');
    await say('minaQ', '三日……何も食べてないの……。森で道に迷って……気づいたら、ここに……');
    G.setFlag('minaMet');
    if (!G.S.items.bread) { obj('パン屋のオルガに食べ物をもらおう'); await say('rio', '（村の東のパン屋さんに、何かもらってこよう）'); return; }
  }
  if (!G.S.items.bread) return say('minaQ', '……め……し…………（おなかの音が鳴っている）');
  // パンを渡す
  G.emote(m, '!', 900); A.sfx('spark');
  await say('minaQ', '（くんくん）……この香りは……');
  G.doShake(4, 300);
  await say('minaQ', 'はちみつパン！！');
  G.S.items.bread = 0;
  await G.fade(1, 200); G.setFlag('minaJoined'); G.setFlag('minaUp'); await sleep(150); await G.fade(0, 200);
  const e = { id: 'minaStand', kind: 'npc', look: 'mina', x: 12, y: 3, px: 12 * TS, py: 3 * TS, dir: 0 };
  G.ents.push(e);
  e.dir = G.dirTo(e.x, e.y, G.player.x, G.player.y, 0);
  await say('mina', 'むぐむぐ……むぐ……生き返ったぁぁ！');
  await say('mina', 'あたしはミーナ！　未来のエジスタダイト王国騎士団長にして、天才剣士よ！');
  await say('rio', '（……さっきまで道で倒れてたのに）');
  await say('mina', 'で、あんたは？　そのランタン、もしかして灯守？');
  await say('rio', 'リオ。見習いだけどね。これから月影の森を抜けて、星見の祠に行くんだ。');
  await say('mina', '森!?　ちょうどいいわ！　パンの恩は剣で返す！　それが騎士道よ！');
  await say('mina', '……それに、森ならキノコも食べ放題だし。');
  await say('rio', '（そっちが本音だ……）');
  G.ents.splice(G.ents.indexOf(e), 1);
  await joinParty('mina', 'とくぎ「岩砕き」：強力な一撃　「かばう」：仲間を守る');
  obj('北の出口から「月影の森」へ');
}

/* ---------- 森 ---------- */
async function forestIntro() {
  G.setFlag('forestIntro');
  await say('mina', 'うわ、暗っ……。昼なのに霧が出てる。');
  await say('rio', '夜霧だ。こんな昼間から、ここまで濃いなんて……。');
  obj('森を抜けて「星見の祠」へ');
}
async function battleKinokon() {
  if (F('won1')) return;
  G.emote(G.player, '!', 800); await sleep(400);
  await say('mina', '出たわね、キノコ！　……じゃなくて魔物ね！');
  await say('rio', '夜霧のせいで気が立ってる。少しおとなしくしてもらおう！');
  const r = await G.battle.start({ enemies: ['kinokon', 'kinokon'], bg: 'forest', tutorial: true });
  if (r !== 'win') return;
  G.setFlag('won1');
  await say('mina', 'ふっ、天才の敵じゃないわ。');
  await say('mina', '……ねえリオ。今のキノコって、焼いたら――');
  await say('rio', '食べないよ？');
  await say('mina', 'ま、まだ何も言ってないし！');
}
async function battleMoss() {
  if (F('mossWon')) return;
  G.emote(G.player, '!', 800); await sleep(300);
  await say('mina', 'コケのかたまりが動いてる！　いくわよ！');
  const r = await G.battle.start({ enemies: ['mosslin'], bg: 'forest', drop: 'herb' });
  if (r === 'win') G.setFlag('mossWon');
}
async function luuEvent() {
  if (F('luuJoined')) return;
  const p = G.player;
  G.setFlag('luuScene');
  const L = ent('luuEnt'); L.x = 10; L.y = 9; L.px = 10 * TS; L.py = 9 * TS; L.dir = 1;
  A.sfx('spark'); G.emote(p, '!', 900); await sleep(500);
  await say('mina', 'リオ、あそこ！　銀色の……狐？');
  await G.moveEnt(L, ['left', 'down', 'down'], 140);
  L.hop = true; await sleep(150); L.hop = false;
  // ランタンの灯を奪う
  A.sfx('steal');
  for (let i = 0; i < 3; i++) { G.sparkle(p.px + 8, p.py + 6, 12, ['#ffe07a', '#fff2b0']); await sleep(160); }
  G.emote(L, '♥', 800);
  await say('luuQ', '……ひかり！　ちょうだい！');
  await say('mina', 'しゃべった!?　魔物が!?');
  await say('rio', 'ランタンの灯を……吸い取った!?');
  await say('luuQ', 'ルゥの！　ぜんぶ、ルゥの！　かえさない！');
  const r = await G.battle.start({
    enemies: ['luu'], bg: 'forest', talk: true, floorHp: 1, eventExp: 20,
    introMsg: '銀色の子狐が 牙をむいた！',
    hint: s => s.round === 2 ? 'ミーナ「ねえリオ……あの子、何かを かばってない？」' : (s.round >= 3 ? 'ヒント：リオの「声をかける」で、話ができるかもしれない。' : null),
    onAfterHit: async (s, msg) => { const e = s.enemies[0]; if (e.hp <= e.mhp * 0.3) { await msg('子狐は ふらふらだ……。それでも 光の粒を 離そうとしない。', 1300); await msg('リオは 思わず 剣をおろした。', 900); return 'event'; } return null; },
  });
  if (r !== 'event' && r !== 'win') return;
  // 事情が分かる
  L.dir = 2;
  G.emote(L, '…', 1500);
  await say(null, '子狐は その場に へたりこんだ。胸に抱えた 小さな光の粒が、弱々しくまたたいている。');
  await say('luuQ', '……かあさま……くらいの、こわいって……ないてる。');
  await say('luuQ', 'ひかり、あげたら……もとに、もどる。だから、ルゥ……あつめた……。');
  await say('mina', 'かあさま……？');
  await say('rio', '祠のほうから、霧が流れてきてる……。きみのお母さん、夜霧に呑まれてるの？');
  G.emote(L, '…', 1200);
  await say('luuQ', '（こくん）……ルゥ、ひとりで、がんばった。でも……たりない……。');
  const c = await G.choose('rio', '（この子に、どうしてあげよう？）', ['ランタンの灯を、分けてあげる', 'まず、傷の手当てをしてあげる']);
  if (c === 0) {
    await say('rio', 'ほら。少しだけど……ぼくの灯だ。');
    A.sfx('moon'); for (let i = 0; i < 4; i++) { G.sparkle(L.px + 8, L.py + 6, 10, ['#ffe07a', '#fff2b0', '#bfe6ff']); await sleep(180); }
    await say('luuQ', '……あったかい。にんげんの ひかり……こわく、ない。');
  } else {
    await say('rio', 'じっとして。……ほら、もう痛くない。');
    A.sfx('heal'); G.sparkle(L.px + 8, L.py + 6, 18, ['#b8ffb0', '#ffffff']);
    await say('luuQ', '……にんげん、やさしい？　ルゥ、ひかり、とったのに？');
  }
  await say('rio', 'ぼくたちも祠へ行くんだ。一緒に、お母さんを助けに行こう。');
  await say('luuQ', '……いっしょ？');
  await say('mina', 'そうよ！　ここまで来たら、あたしたち仲間でしょ！');
  await say('mina', '……あ、でもそのしっぽ、あとでモフらせてね。');
  L.dir = 1; G.emote(L, '…', 900);
  await say(null, '子狐は しっぽを そっと かくした。');
  await say('mina', 'なんで!?');
  L.hop = true; await sleep(120); L.hop = false; await sleep(120); L.hop = true; await sleep(120); L.hop = false;
  G.emote(L, '♥', 1200);
  await say('luu', 'ルゥ！　ルゥのなまえ、ルゥ！　つきの ちから、つかえる。リオとミーナ、たすける！');
  G.setFlag('luuJoined');
  await joinParty('luu', 'とくぎ「月あかり」：黒い霧をはらう<br>「月のヴェール」：みんなを守る　「月のうた」：みんなを回復');
  obj('ルゥと一緒に、森の北の「星見の祠」へ');
}

/* ---------- 祠 ---------- */
async function ruinsIntro() {
  G.setFlag('ruinsIntro');
  await say('luu', '……かあさま、この、おく。におい、する。');
  await say('mina', 'ルゥ、しっぽが震えてる……。大丈夫、あたしたちがいるから。');
  obj('祠の奥へ（右の泉で回復・記録できる）');
}
async function spring() {
  G.healAll(); A.sfx('heal'); G.sparkle(G.player.px + 8, G.player.py + 4, 20, ['#9fe6ff', '#ffffff']);
  G.save();
  await G.toast('星の泉：HPとMPが全回復した！<br><small>ここまでの進行を記録しました</small>', 1500);
  if (!F('springTalk')) {
    G.setFlag('springTalk');
    await say('mina', 'ここで一回休憩ね！　腹が減っては戦はできぬ！');
    await say('rio', 'さっきパン食べたよね？');
    await say('mina', '別腹よ！');
  }
}
async function bossEvent() {
  if (F('bossWon')) return;
  const p = G.player;
  obj('');
  A.stop(); G.doShake(3, 800); A.sfx('roar');
  await sleep(700);
  G.emote(p, '!', 900);
  await say('silvaDark', '……ヒカリ……ヨコセ……。ニンゲン……ウバッタ……ワタシタチノ……ヒカリ……。');
  await say('luu', 'かあさま！　ルゥだよ！　ルゥ、かえってきた！');
  A.sfx('roar'); G.doShake(6, 700);
  await say('silvaDark', 'グルルル……ガアアアッ！');
  await say('mina', 'ダメ、聞こえてない！　リオ、いったん大人しくさせるわよ！');
  await say('rio', 'ルゥ、力を貸して。お母さんを取り戻すんだ！');
  await say('luu', '……うん！　ルゥ、たたかう！');
  A.play('boss');
  await G.banner('夜霧の大狐　シルヴァ', 1700);
  const r = await G.battle.start({
    enemies: ['silva'], bg: 'ruins', bgm: 'boss', keepSilent: true,
    introMsg: '夜霧の大狐 シルヴァが 立ちはだかる！',
    winMsg: 'シルヴァを包んでいた 黒い霧が はじけ飛んだ！',
    hint: s => { const e = s.enemies[0]; if (e.charging) return '「月喰い」が来る！ ぼうぎょ・月のヴェールで備えよう。'; if (e.armor) return 'ヒント：黒い霧が攻撃を弱めている。ルゥの「月あかり」ではらおう。'; return '霧が晴れている！ 今のうちに「岩砕き」や「灯火斬り」で攻めよう。'; },
    onAfterHit: async (s, msg) => {
      const e = s.enemies[0];
      if (s.armorHits && !s.armorHint) { s.armorHint = true; await msg('ルゥ「きり……！ ルゥの『月あかり』で、はらえる！」', 1400); }
      if (!e.dead && e.hp <= e.mhp * 0.5 && !s.phase2) {
        s.phase2 = true; G.doShake(6, 600); A.sfx('roar');
        await msg('シルヴァ「……ル……ゥ……？」', 1300);
        await msg('ルゥ「かあさま！ ルゥの声、きこえてる！」', 1200);
        await msg('シルヴァ「グ……ガアアアッ！」 夜霧が 暴れだした！', 1100);
        e.enrage = 1.15; if (!e.charging) { e.armor = true; await msg('黒い霧が ふたたび シルヴァを 包みこんだ！', 1000); }
      }
      return null;
    },
  });
  if (r !== 'win') return;
  G.setFlag('bossWon'); G.setFlag('silvaScene');
  await afterBoss();
}
async function afterBoss() {
  const p = G.player, S = G.S;
  A.play('sad');
  const sv = ent('silva'); sv.alpha = 1;
  G.sparkle(sv.px + 40, sv.py + 20, 40, ['#bfe6ff', '#ffffff']);
  await sleep(600);
  await say('silva', '……ルゥ……？　ずいぶん、あたたかい光を……連れてきたのね。');
  await say('luu', 'かあさま！！');
  await say('silva', '灯守の子。そして、剣の子。……ありがとう。霧の中で、ずっと声が聞こえていました。');
  await say('rio', 'あなたが……星見の祠の、守り神？');
  await say('silva', 'かつては。……灯守の子よ。「星のかけら」が何か、知っていますか？');
  await say('rio', '聖灯をともすための……祠の石、じゃないの？');
  await say('silva', 'あれは、わたしたち月の獣の……命の光。人の灯は、わたしたちの光を分けて燃えているのです。');
  await say('mina', '……え。');
  await say('silva', '責めてはいません。かつて人と月の獣は、光を分け合う友でした。');
  await say('silva', 'けれど月が隠れてから、人は光を「分け合う」のではなく「奪う」ようになった。……光を失った獣は、夜霧に呑まれていく。');
  await say('rio', 'じゃあ、ぼくたちが守ってきた灯は……。');
  await say('silva', 'わたしの光は、もう残りわずか。……この最後の灯を、あなたの村へ。そして――ルゥを、お願い。');
  await say('luu', 'やだ！　かあさま、いっしょ！　ルゥ、もっと ひかり あつめる！');
  await say('silva', 'ルゥ。泣き虫のあなたが、ひとりで灯を集めたのね。……もう、ひとりではないわ。');
  await say('silva', '月を探しなさい。北の空、月の都に……答えがあります。');
  // 光になって消える
  A.sfx('moon');
  for (let i = 0; i < 10; i++) { sv.alpha = 1 - i / 10; G.sparkle(sv.px + 20 + Math.random() * 40, sv.py + 10 + Math.random() * 30, 8, ['#bfe6ff', '#ffffff', '#ffe07a']); await sleep(180); }
  sv.alpha = 0; G.setFlag('silvaScene', false);
  G.sparkle(p.px + 8, p.py + 4, 30, ['#ffe07a', '#ffffff']);
  A.sfx('chest');
  await G.toast('<b>星のかけら（シルヴァの灯）</b> を手に入れた。<br><small>ランタンの中で、やさしく光っている</small>', 2200);
  await sleep(300);
  await say(null, 'ルゥは 祭壇の前から、しばらく動かなかった。');
  await say('mina', '……ほら。モフらないから。今は、泣いていいよ。');
  await say('luu', '……ミーナ、あったかい。');
  await say(null, 'ルゥのしっぽが、ミーナの腕に そっと巻きついた。');
  await say('rio', '……帰ろう。ルミナ村へ。');
  await epilogue();
}

/* ---------- エピローグ ---------- */
async function epilogue() {
  const S = G.S;
  await G.fade(1, 900);
  S.night = true;
  G.enterMap('village', 11, 10, 3);
  A.play('ending');
  G.healAll();
  const gm = ent('grandma'); gm.x = 10; gm.y = 10; gm.px = 160; gm.py = 160; gm.dir = 2;
  ['pipi', 'olga', 'gant', 'lena'].forEach(id => { const e = ent(id); if (e) e.hidden = true; });
  [[12, 10, 1], [11, 11, 3]].forEach((q, i) => { const f = G.followers[i]; if (f) { f.x = f.fx = q[0]; f.y = f.fy = q[1]; f.px = q[0] * TS; f.py = q[1] * TS; f.dir = q[2]; } });
  await sleep(400);
  await G.fade(0, 900);
  A.sfx('moon');
  G.sparkle(11 * TS + 8, 9 * TS + 2, 40, ['#ffe07a', '#fff2b0', '#bfe6ff']);
  await G.toast('聖灯に、光がともった――', 1800);
  G.player.dir = 1;
  await say('grandma', 'おかえり、リオ。……聖灯が、こんなに明るく。');
  await say('rio', 'ばあちゃん。……この灯は、ルゥのお母さんの命なんだ。');
  G.emote(gm, '…', 1500); await sleep(900);
  await say('grandma', '……そうかい。わしら灯守は、ずっと……知らんふりをしてきたのかもしれんのう。');
  await say('grandma', 'リオ。確かめておいで。月がなぜ消えたのか。灯守が、本当は何を守るべきなのか。');
  await say('rio', '……うん。行くよ。ルゥと、ミーナと一緒に。');
  await say('mina', '決まりね！　次は北よ！');
  await say('mina', '……ところでおばあちゃん、はちみつパン、もう一個もらえる？');
  await say('luu', 'ルゥも！　ルゥも、ぱん！');
  await say('grandma', 'ふぉふぉ。オルガに、たんと焼いてもらおうかね。');
  // 不穏な声
  A.stop(); await sleep(500);
  A.play('dark');
  G.fxLight = 0.4; G.doShake(3, 1500);
  await G.fade(0.7, 800);
  await say('nox', '――灯守の子よ。');
  await say('nox', 'お前の灯が、誰の命を燃やしているか。ようやく知ったか。');
  await say('nox', '月は返さぬ。人が、奪うことをやめぬ限り。');
  await say('nox', '北の果て、ムーンリットにて待つ。――蝕帝（しょくてい）ノクス。');
  await G.fade(1, 900);
  G.fxLight = 1;
  G.setFlag('cleared');
  G.clearSave();
  G.mode = 'none';
  await G.showWorldMap('ending');
  await G.showEnding();
}
story.POS = POS;
})();
