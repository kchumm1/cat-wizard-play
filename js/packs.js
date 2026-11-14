// Shop packages (DATA.packs). Practice only: there is no real payment, the contents are simply given.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function mod(file) { return isNode ? require(file) : root.CW; }
  function packById(id) { for (var i = 0; i < DATA.packs.length; i++) if (DATA.packs[i].id === id) return DATA.packs[i]; return null; }
  function packSigils(p) { return (p.give.sigils || []).reduce(function (a, x) { return a + x.n; }, 0); }
  function daily(state) { if (!state.dailyGems) state.dailyGems = { left: 0, last: '' }; return state.dailyGems; }
  // 'ok', or why it cannot be bought now: 'tier' (that job is not reached yet), 'limit' (bought as often as it can be),
  // 'daily' (the daily gems still have days left), 'none' (no such package)
  function packOpen(state, id) {
    var p = packById(id); if (!p) return 'none';
    if (p.need && p.need.tier && (state.tier || 1) < p.need.tier) return 'tier';
    if (p.limit && ((state.packs || {})[id] || 0) >= p.limit) return 'limit';
    if (p.give.daily && daily(state).left > 0) return 'daily';
    return 'ok';
  }
  // returns the list of sigils given (empty when none; gear pulled is on it as .gear), or false when the package cannot
  // be bought now or the sigil bag has no room (then nothing is given)
  function buyPack(state, id, rng, now) {
    if (packOpen(state, id) !== 'ok') return false;
    var p = packById(id), S = mod('./sigil.js'), need = packSigils(p);
    if (need) { S.sigilById(state, ''); if (state.sigil.items.length + need > DATA.sigilConf.cap) return false; }
    var g = p.give, got = [];
    if (g.gems) state.gems += g.gems;
    if (g.goldMin) state.gold += mod('./economy.js').goldPerSecond(state) * 60 * g.goldMin;
    if (g.potionMin) {
      now = now || Date.now(); if (!state.alch) state.alch = { brews: 0, until: {} }; if (!state.alch.until) state.alch.until = {};
      DATA.potions.forEach(function (pt) { state.alch.until[pt.id] = Math.max(now, state.alch.until[pt.id] || 0) + g.potionMin * 60000; });
    }
    if (g.pulls) { var GA = mod('./gacha.js'), cost = GA.gachaCost(g.pulls); state.gems += cost; got.gear = GA.pull(state, g.pulls, rng) || []; }
    if (g.daily) { var dd = daily(state); dd.left = g.daily.days; dd.gems = g.daily.gems; dd.last = ''; }
    if (g.runeStone) state.runeStone = (state.runeStone || 0) + g.runeStone;
    (g.sigils || []).forEach(function (x) { for (var i = 0; i < x.n; i++) got.push(S.addSigil(state, x.grade, rng)); });
    if (g.sigilStone) state.sigil.stone += g.sigilStone;
    state.packs = state.packs || {}; state.packs[id] = (state.packs[id] || 0) + 1;
    return got;
  }
  // today's daily gems: the number given, or 0 (none bought, all days used, or already taken today). dayKey: 'YYYY-MM-DD'
  function claimDaily(state, dayKey) {
    var d = daily(state); if (!(d.left > 0) || d.last === dayKey) return 0;
    d.left -= 1; d.last = dayKey; state.gems += d.gems || 0;
    return d.gems || 0;
  }
  return { packById: packById, packSigils: packSigils, packOpen: packOpen, buyPack: buyPack, claimDaily: claimDaily };
});
