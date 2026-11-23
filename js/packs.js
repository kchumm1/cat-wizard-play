// Shop packages (DATA.packs). Practice only: there is no real payment, the contents are simply given.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function mod(file) { return isNode ? require(file) : root.CW; }
  function packById(id) { for (var i = 0; i < DATA.packs.length; i++) if (DATA.packs[i].id === id) return DATA.packs[i]; return null; }
  function packSigils(p) { return (p.give.sigils || []).reduce(function (a, x) { return a + x.n; }, 0); }
  function daily(state) { if (!state.dailyGems) state.dailyGems = { left: 0, last: '' }; return state.dailyGems; }
  // 'ok', or why it cannot be bought now: 'tier' (that job is not reached yet), 'limit' (bought as often as it can be),
  // 'daily' (the daily gems still have days left), 'over' (its season ended), 'none' (no such package)
  // 운영 달력 (2026-11-23): a cal package sells only while the calendar has it open. cal = the open ids (the server's env.packCal);
  // without it the phone's calendar (js/pack-cal.js, packCalUse) and, before that ever came, DATA.packCalDefault
  var calFn = null;
  function packCalUse(fn) { calFn = typeof fn === 'function' ? fn : null; }
  function kst(now) { return new Date((now || Date.now()) + 9 * 3600e3).toISOString().slice(0, 10); }
  function packCalDefaultOpen(now) { var t = kst(now); return (DATA.packCalDefault || []).filter(function (x) { return x.from <= t && t <= x.until; }).map(function (x) { return x.id; }); }
  function packCalOpenIds(cal, now) { if (Array.isArray(cal)) return cal; var c = calFn && calFn(now); return Array.isArray(c) ? c : packCalDefaultOpen(now); }
  function packOpen(state, id, cal, now) {
    var p = packById(id); if (!p) return 'none';
    if (p.cal && packCalOpenIds(cal, now).indexOf(id) < 0) return 'over';   // 달력에 열린 기간이 아님
    if (p.until && kst(now) > p.until) return 'over';
    if (p.need && p.need.tier && (state.tier || 1) < p.need.tier) return 'tier';
    if (p.limit && ((state.packs || {})[id] || 0) >= p.limit) return 'limit';
    if (p.give.daily && daily(state).left > 0) return 'daily';
    // 가방 (js/chest.js): a daily-gems box still waiting in the bag counts as the days still running
    if (p.give.daily && state.chest && Array.isArray(state.chest.items) && state.chest.items.some(function (b) { var q = b.src === 'pack' && packById(b.pack); return q && q.give.daily; })) return 'daily';
    return 'ok';
  }
  // returns the list of sigils given (empty when none; gear pulled is on it as .gear), or false when the package cannot
  // be bought now or the sigil bag has no room (then nothing is given)
  function buyPack(state, id, rng, now, cal) {
    if (packOpen(state, id, cal, now) !== 'ok') return false;
    var p = packById(id), S = mod('./sigil.js'), need = packSigils(p);
    if (need) { S.sigilById(state, ''); if (state.sigil.items.length + need > DATA.sigilConf.cap) return false; }
    var got = packGive(state, id, rng, now);
    state.packs = state.packs || {}; state.packs[id] = (state.packs[id] || 0) + 1;
    return got;
  }
  // what a package holds, given now. spill(kind, item) (가방, js/chest.js): a rune or sigil whose bag is full goes there
  // instead (without it a full rune bag gives rune stones as before). got.gold = the gold given
  function packGive(state, id, rng, now, spill) {
    var p = packById(id); if (!p) return [];
    return giveApply(state, p.give, rng, now, spill);
  }
  // a give object (the package shape: gems, goldMin, potionMin, pulls, daily, runes, runeStone, mana, sigils, sigilStone)
  // given now — packages and the 오픈 기념 이벤트 (js/open-event.js) both use it
  function giveApply(state, g, rng, now, spill) {
    var S = mod('./sigil.js'), got = [];
    S.sigilById(state, '');
    if (g.gems) state.gems += g.gems;
    if (g.goldMin) { got.gold = mod('./economy.js').goldPerSecond(state) * 60 * g.goldMin; state.gold += got.gold; }
    if (g.potionMin) {
      now = now || Date.now(); if (!state.alch) state.alch = { brews: 0, until: {} }; if (!state.alch.until) state.alch.until = {};
      DATA.potions.forEach(function (pt) { state.alch.until[pt.id] = Math.max(now, state.alch.until[pt.id] || 0) + g.potionMin * 60000; });
    }
    if (g.pulls) { var GA = mod('./gacha.js'), cost = GA.gachaCost(g.pulls); state.gems += cost; got.gear = GA.pull(state, g.pulls, rng) || []; }
    if (g.daily) { var dd = daily(state); dd.left = g.daily.days; dd.total = g.daily.days; dd.gems = g.daily.gems; dd.last = ''; dd.hide = ''; }
    // rune items (겨울 패키지, 2026-11-17): a kind that can drop now (or, before any is open, a plain one); a full bag gives the
    // rune stones it would dismantle into, like a summon
    (g.runes || []).forEach(function (x) { for (var i = 0; i < x.n; i++) {
      var R = mod('./runes.js'), pool = R.runePool(state); if (!pool.length) pool = DATA.runes.filter(function (k) { return !k.awaken && k.crit === undefined; });
      var k = pool[Math.min(pool.length - 1, Math.floor((rng || Math.random)() * pool.length))], it = R.runeAdd(state, k.id, x.grade);
      if (it) (got.runes = got.runes || []).push(it);
      else if (spill) spill('rune', { kind: k.id, grade: x.grade });
      else state.runeStone = (state.runeStone || 0) + DATA.runeConf.dismantleBase[x.grade];
    } });
    if (g.runeStone) state.runeStone = (state.runeStone || 0) + g.runeStone;
    if (g.mana) state.mana = (state.mana || 0) + g.mana;   // 마력석 packages (2026-11-15)
    (g.sigils || []).forEach(function (x) { for (var i = 0; i < x.n; i++) { var it = S.addSigil(state, x.grade, rng); if (it) got.push(it); else if (spill) spill('sigil', { grade: x.grade }); } });
    if (g.sigilStone) state.sigil.stone += g.sigilStone;
    return got;
  }
  // today's daily gems: the number given, or 0 (none bought, all days used, or already taken today). dayKey: 'YYYY-MM-DD'
  function claimDaily(state, dayKey) {
    var d = daily(state); if (!(d.left > 0) || d.last === dayKey) return 0;
    d.left -= 1; d.last = dayKey; state.gems += d.gems || 0;
    return d.gems || 0;
  }
  // the 7-day popup (2026-11-15): how many days are bought (total), taken so far, whether today's can be taken now, and
  // whether the player ticked "오늘 하루 보지 않기" today (then it does not open by itself, only from the shop)
  function dailyView(state, dayKey) {
    var d = daily(state), left = d.left || 0, total = d.total || (left ? 7 : 0);
    return { total: total, taken: Math.max(0, total - left), left: left, today: left > 0 && d.last !== dayKey, hidden: d.hide === dayKey, gems: d.gems || 0 };
  }
  function hideDaily(state, dayKey, on) { daily(state).hide = on ? dayKey : ''; }
  return { packCalUse: packCalUse, packCalDefaultOpen: packCalDefaultOpen, dailyView: dailyView, hideDaily: hideDaily, packById: packById, packSigils: packSigils, packOpen: packOpen, buyPack: buyPack, packGive: packGive, giveApply: giveApply, claimDaily: claimDaily };
});
