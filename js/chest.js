// 가방 (2026-11-17, 형: 가방을 하나 만들고 도감 밑에 아이콘 · 패키지를 사거나 상자형 패키지를 사면 가방으로 들어오고,
// 가방에서 열면 룬은 룬, 신성력은 신성력, 장비는 장비로 바로 들어가게 · 우편 선물도 가방으로 · 친구꺼도 보이게).
// state.chest = { items: [{ id, src: 'pack' | 'mail', pack (id) | mail (the letter: id, title, goldJo, gems, give), at }], seq }.
// Buying a package or taking a letter's reward puts one box here (the package counts as bought, the letter as taken right
// away); opening it gives what it holds the usual way (js/packs.js packGive, js/mail.js mailGive). A box whose runes or
// sigils do not fit stays closed and says how much room is missing.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function mod(file) { return isNode ? require(file) : root.CW; }
  function chest(state) {
    if (!state.chest || typeof state.chest !== 'object' || !Array.isArray(state.chest.items)) state.chest = { items: [], seq: 0 };
    return state.chest;
  }
  function chestItems(state) { return chest(state).items.slice(); }
  function chestCount(state) { return chest(state).items.length; }
  function chestById(state, id) { var a = chest(state).items; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  var CAP = 100;   // 가방 칸 (형 2026-11-17: 우선 100칸) — 가득 차면 패키지·우편 선물이 더 안 들어감
  function chestFull(state) { return chest(state).items.length >= CAP; }
  function put(state, box) { var c = chest(state); box.id = 'c' + (++c.seq); box.at = box.at || Date.now(); c.items.push(box); return box; }

  // a package bought → one box (false when it cannot be bought now; js/packs.js packOpen says why)
  function chestBuyPack(state, id, now, cal) {
    var PK = mod('./packs.js'); if (chestFull(state) || PK.packOpen(state, id, cal, now) !== 'ok') return false;
    state.packs = state.packs || {}; state.packs[id] = (state.packs[id] || 0) + 1;
    return put(state, { src: 'pack', pack: id, at: now });
  }
  // a letter's reward taken → one box; the letter is marked taken now (false when it was taken already or has nothing)
  function chestTakeMail(state, l, now) {
    var M = mod('./mail.js'); if (!l || !l.id || chestFull(state) || M.mailGot(state, l) || !M.mailHasReward(l)) return false;
    M.mailMarkGot(state, l, now);
    return put(state, { src: 'mail', mail: { id: l.id, title: l.title || '우편 선물', goldJo: l.goldJo, gems: l.gems, give: l.give }, at: now });
  }
  // the box's name and what it holds, as lines for the bag (the package's own lines, or the letter's)
  // 가방에 든 것: 상자(pack · mail) 또는 칸이 가득 차 돌아온 아이템(rune: { kind, grade } · sigil: { grade, stat, q })
  function chestIsItem(box) { return box.src === 'rune' || box.src === 'sigil'; }
  function chestTitle(box) {
    if (box.src === 'pack') { var p = mod('./packs.js').packById(box.pack); return p ? p.name : '패키지'; }
    if (box.src === 'rune') { var r = DATA.runes.filter(function (k) { return k.id === box.kind; })[0]; return DATA.hiGrades[box.grade].name + ' ' + (r ? r.name : '룬'); }
    if (box.src === 'sigil') return DATA.hiGrades[box.grade].name + ' 신성력';
    return (box.mail && box.mail.title) || '우편 선물';
  }
  function chestIcon(box) { var p = box.src === 'pack' && mod('./packs.js').packById(box.pack); return p ? p.icon : '✉️'; }
  function freeRunes(state) { return DATA.runeConf.cap - mod('./runes.js').runeBag(state).items.length; }
  function freeSigils(state) { mod('./sigil.js').sigilById(state, ''); return DATA.sigilConf.cap - state.sigil.items.length; }
  // '' when a returned rune or sigil can go back to its bag now, or why not
  function chestRoom(state, box) {
    if (!box) return '없는 상자예요';
    if (box.src === 'rune' && freeRunes(state) < 1) return '룬 칸이 가득 찼어요';
    if (box.src === 'sigil' && freeSigils(state) < 1) return '신성력 칸이 가득 찼어요';
    return '';
  }
  // a rune or sigil that did not fit its bag, kept in the 가방 (오픈 기념 이벤트 rewards, js/wallet-actions.js)
  // the 가방 full too (2026-11-23): a rune becomes the rune stones it would dismantle into, a sigil its sigil stones (null)
  function chestSpill(state, kind, it, now) {
    if (!chestFull(state)) return put(state, Object.assign({ src: kind, at: now }, it));
    if (kind === 'rune') state.runeStone = (state.runeStone || 0) + DATA.runeConf.dismantleBase[it.grade];
    else { mod('./sigil.js').sigilById(state, ''); state.sigil.stone += DATA.sigilConf.stones[it.grade]; }
    return null;
  }
  // the reward lines (cards) for a give object (the package shape) after js/packs.js giveApply gave it (got: what it returned)
  function giveLines(g, got) {
    var rew = [], add = function (o) { rew.push(o); };
    if (g.gems) add({ k: 'gems', n: g.gems, to: 'gem' });
    if (g.goldMin) add({ k: 'gold', gold: got && got.gold, min: g.goldMin, to: 'gold' });
    if (g.pulls) add({ k: 'pulls', n: g.pulls, to: 'gear' });
    if (g.daily) add({ k: 'daily', n: g.daily.days, gems: g.daily.gems, to: 'now' });
    if (g.potionMin) add({ k: 'potion', n: g.potionMin, to: 'now' });
    if (g.mana) add({ k: 'mana', n: g.mana, to: 'now' });
    (g.runes || []).forEach(function (x) { add({ k: 'rune', n: x.n, grade: x.grade, to: 'rune' }); });
    if (g.runeStone) add({ k: 'runeStone', n: g.runeStone, to: 'rune' });
    (g.sigils || []).forEach(function (x) { add({ k: 'sigil', n: x.n, grade: x.grade, to: 'sigil' }); });
    if (g.sigilStone) add({ k: 'sigilStone', n: g.sigilStone, to: 'sigil' });
    return rew;
  }
  // 열기 (형 2026-11-17: 열면 바로 들어가고, 룬·신성력 칸이 없으면 가방으로 돌아와 보관 · 7일 다이아 같은 건 바로 실행):
  // { ok, box, rewards: [{ k, n, grade, gold, to: 'rune'|'sigil'|'gear'|'gem'|'gold'|'now', back (가방으로 돌아간 수) }], go, got }
  function chestOpen(state, id, goldScale, rng, now) {
    var box = chestById(state, id); if (!box) return { ok: false, why: '없는 상자예요' };
    if (chestIsItem(box)) return chestTakeOut(state, id, rng);
    var go = {}, got = [], rew = [], back = {}, c = chest(state);
    c.items = c.items.filter(function (x) { return x.id !== id; });   // 열린 상자는 빠지고, 돌아온 아이템이 그 자리를 씀
    var spill = function (kind, it) { var k = kind + ':' + it.grade; back[k] = (back[k] || 0) + 1; put(state, Object.assign({ src: kind }, it), now); };
    var add = function (o) { rew.push(o); };
    if (box.src === 'pack') {
      var PK = mod('./packs.js'), p = PK.packById(box.pack);
      if (p) { got = PK.packGive(state, box.pack, rng, now, spill); rew = giveLines(p.give, got); }
    } else {
      var l = box.mail, gf = mod('./mail-gift.js').giftOf(l), M = mod('./mail.js');
      var gold = M.mailGive(state, l, goldScale, rng, now, spill);
      if (+l.gems > 0) add({ k: 'gems', n: Math.floor(+l.gems), to: 'gem' });
      if (gold) add({ k: 'gold', gold: gold, to: 'gold' });
      ['mana', 'runeStone', 'sigilStone', 'shards', 'awakenShard'].forEach(function (k) { if (gf[k]) add({ k: k, n: gf[k], to: k === 'runeStone' ? 'rune' : k === 'sigilStone' || k === 'awakenShard' ? 'sigil' : 'now' }); });
      if (gf.potions) Object.keys(gf.potions).forEach(function (id2) { add({ k: 'potion', id: id2, n: gf.potions[id2], to: 'now' }); });
      if (gf.tickets) Object.keys(gf.tickets).forEach(function (id2) { add({ k: 'ticket', id: id2, n: gf.tickets[id2], to: 'now' }); });
      (gf.gear || []).forEach(function (x) { add({ k: 'gear', id: x.kind, grade: x.grade, sub: x.sub, n: x.n, to: 'gear' }); });
      (gf.runes || []).forEach(function (x) { add({ k: 'rune', id: x.kind, n: x.n, grade: x.grade, to: 'rune' }); });
      (gf.sigils || []).forEach(function (x) { add({ k: 'sigil', n: x.n, grade: x.grade, to: 'sigil' }); });
      (gf.relics || []).forEach(function (x) { add({ k: 'relic', id: x.id, n: x.n, to: 'now' }); });
      (gf.costumes || []).forEach(function (x) { add({ k: 'costume', id: x.id, n: 1, to: 'now' }); });
      // 펫 (2026-11-23): on the phone only (js/mail-gift.js gives them there); the cards show what the letter carries
      (gf.pets || []).forEach(function (x) { add({ k: 'pet', id: x.id, n: x.n, to: 'now' }); });
      if (gf.petEggs) add({ k: 'petEggs', n: gf.petEggs, to: 'now' });
      if (gf.petFood) add({ k: 'petFood', n: gf.petFood, to: 'now' });
    }
    // 가방으로 돌아간 수를 그 보상에 적음 (같은 등급 룬·신성력 줄에 차례로)
    rew.forEach(function (o) { if ((o.k === 'rune' || o.k === 'sigil') && back[o.k + ':' + o.grade]) { var b = Math.min(o.n, back[o.k + ':' + o.grade]); o.back = b; back[o.k + ':' + o.grade] -= b; } });
    rew.forEach(function (o) { if (o.to === 'rune' || o.to === 'sigil') go[o.to] = 1; if (o.to === 'gear') go.gear = 1; if (o.k === 'relic') go.relic = 1; if (o.k === 'costume') go.costume = 1; });
    return { ok: true, why: '', box: box, got: got, go: go, rewards: rew };
  }
  // 가방에 돌아와 있던 룬·신성력을 다시 그 칸으로 (빈자리가 있을 때)
  // rng (서버 지갑, 2026-11-18): the server rolls and the phone replays the same numbers, so both get the same sigil
  function chestTakeOut(state, id, rng) {
    rng = rng || Math.random;
    var box = chestById(state, id); if (!box || !chestIsItem(box)) return { ok: false, why: '없는 아이템이에요' };
    var why = chestRoom(state, box); if (why) return { ok: false, why: why, box: box };
    if (box.src === 'rune') mod('./runes.js').runeAdd(state, box.kind, box.grade);
    else {
      var S = mod('./sigil.js'), it = S.addSigil(state, box.grade, rng);
      if (it && box.stat === '@aw') { var aw = DATA.sigilStats.filter(function (s) { return s.awaken; }); it.stat = aw[Math.floor(rng() * aw.length)].stat; }
      else if (it && box.stat) it.stat = box.stat;
      if (it && box.q) it.q = box.q;
    }
    var c = chest(state); c.items = c.items.filter(function (x) { return x.id !== id; });
    var go = {}; go[box.src] = 1;
    return { ok: true, why: '', box: box, go: go, rewards: [{ k: box.src, id: box.kind, n: 1, grade: box.grade, to: box.src }] };
  }
  return { CHEST_CAP: CAP, chestFull: chestFull, chestItems: chestItems, chestCount: chestCount, chestById: chestById, chestBuyPack: chestBuyPack, chestTakeMail: chestTakeMail,
    chestTitle: chestTitle, chestIcon: chestIcon, chestRoom: chestRoom, chestOpen: chestOpen, chestTakeOut: chestTakeOut, chestIsItem: chestIsItem, giveLines: giveLines, chestSpill: chestSpill };
});
