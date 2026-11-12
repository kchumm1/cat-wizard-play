// The three star items: open at a job tier, level up with gold, gain stars with shards dropped by bosses.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var C = DATA.divineConf;
  function slot(state, id) {
    if (!state.divine) state.divine = { staff: { lv: 0, star: 0 }, robe: { lv: 0, star: 0 }, charm: { lv: 0, star: 0 }, shards: 0 };
    if (id && !state.divine[id]) state.divine[id] = { lv: 0, star: 0 };
    return id ? state.divine[id] : state.divine;
  }
  function known(id) { return DATA.divine.some(function (d) { return d.id === id; }); }
  function divineOpen(state) { return (state.tier || 1) >= C.unlockTier; }
  function divineUpCost(lv) { return C.costBase * Math.pow(C.costGrowth, lv); }
  function divineUp(state, id) {
    if (!known(id) || !divineOpen(state)) return false;
    var d = slot(state, id); if (d.lv >= C.maxLv) return false;
    var cost = divineUpCost(d.lv); if (!(state.gold >= cost)) return false;
    state.gold -= cost; d.lv++; return true;
  }
  function starCost(star) { return star + 1; }
  function starUp(state, id) {
    if (!known(id) || !divineOpen(state)) return false;
    var d = slot(state, id), all = slot(state); if (d.lv < 1 || d.star >= C.starMax || all.shards < starCost(d.star)) return false;
    all.shards -= starCost(d.star); d.star++; return true;
  }
  function addShards(state, regionBoss) { if (!divineOpen(state)) return 0; var n = regionBoss ? C.shardRegion : C.shardBoss; slot(state).shards += n; return n; }
  function divineStats(state) {
    var b = {}; if (!state.divine) return b;
    DATA.divine.forEach(function (it) { var d = state.divine[it.id]; if (d && d.lv) b[it.stat] = (b[it.stat] || 0) + it.per * d.lv * (1 + C.starBonus * d.star); });
    return b;
  }
  return { divineOpen: divineOpen, divineUpCost: divineUpCost, divineUp: divineUp, starCost: starCost, starUp: starUp, addShards: addShards, divineStats: divineStats };
});
