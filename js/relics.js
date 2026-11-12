// Relics: summoned with diamonds; every copy raises that relic's level, and each level adds a bonus.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var C = DATA.relicSummon;
  function relicCost(n) { return C.cost[n] || Math.ceil(n * C.cost[10] / 10); }
  function relicMax(r) { return r.divine ? C.divineMaxLv : C.maxLv; }
  function relicById(id) { for (var i = 0; i < DATA.relics.length; i++) if (DATA.relics[i].id === id) return DATA.relics[i]; return null; }
  function pick(rng) {
    var divine = rng() < C.divineRate;
    var pool = DATA.relics.filter(function (r) { return !!r.divine === divine; });
    return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  }
  // returns [{ id, lv, refund }] or null when the player cannot pay
  function summonRelics(state, n, rng) {
    rng = rng || Math.random;
    var cost = relicCost(n);
    if (state.gems < cost) return null;
    state.gems -= cost; state.relics = state.relics || {};
    var out = [];
    for (var i = 0; i < n; i++) {
      var r = pick(rng), lv = state.relics[r.id] || 0, refund = 0;
      if (lv >= relicMax(r)) { refund = C.refund; state.gems += refund; } else state.relics[r.id] = lv + 1;
      out.push({ id: r.id, lv: state.relics[r.id], refund: refund });
    }
    return out;
  }
  function relicStats(state) {
    var b = {}, own = state.relics || {};
    DATA.relics.forEach(function (r) { var lv = own[r.id] || 0; if (lv) b[r.stat] = (b[r.stat] || 0) + lv * r.per; });
    return b;
  }
  return { relicCost: relicCost, relicMax: relicMax, relicById: relicById, summonRelics: summonRelics, relicStats: relicStats };
});
