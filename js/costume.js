// Costumes: one per grade (일반 → 멸망), bought with diamonds and enhanced with diamonds.
// The worn one sets the look; every owned one gives its bonus (levels, plus a star every few levels) and a collection bonus.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var C = DATA.costumeConf;
  function byId(id) { for (var i = 0; i < DATA.costumes.length; i++) if (DATA.costumes[i].id === id) return DATA.costumes[i]; return null; }
  function owned(state) { if (!state.costume) state.costume = { owned: { basic: 1 }, wear: 'basic' }; return state.costume.owned; }
  function costumeUpCost(c, lv) { return Math.ceil(C.upBase * Math.pow(C.upGrowth, c.grade) * (1 + lv * C.upLv)); }
  function costumeStars(lv) { return Math.floor((lv || 0) / C.starEvery); }
  function buyCostume(state, id) {
    var c = byId(id), own = owned(state); if (!c || own[id] || state.gems < c.price) return false;
    state.gems -= c.price; own[id] = 1; return true;
  }
  function upCostume(state, id) {
    var c = byId(id), own = owned(state), lv = own[id] || 0; if (!c || !lv || lv >= C.maxLv) return false;
    var cost = costumeUpCost(c, lv); if (state.gems < cost) return false;
    state.gems -= cost; own[id] = lv + 1; return true;
  }
  function wearCostume(state, id) { if (!byId(id) || !owned(state)[id]) return false; state.costume.wear = id; return true; }
  function costumeLook(state) { var c = byId(state.costume && state.costume.wear) || DATA.costumes[0]; return { id: c.id, art: c.art, outfit: c.outfit, fx: c.fx || null }; }
  function costumeValue(c, lv) { return lv * c.per * (1 + costumeStars(lv) * C.starBonus); }
  function costumeStats(state) {
    var b = {}, own = (state.costume && state.costume.owned) || {}, n = 0;
    DATA.costumes.forEach(function (c) { var lv = own[c.id] || 0; if (lv) { b[c.stat] = (b[c.stat] || 0) + costumeValue(c, lv); n++; } });
    if (n > 1) b.finalPct = (b.finalPct || 0) + (n - 1) * C.collect;
    return b;
  }
  return { costumeById: byId, costumeUpCost: costumeUpCost, costumeStars: costumeStars, costumeValue: costumeValue, buyCostume: buyCostume, upCostume: upCostume,
    wearCostume: wearCostume, costumeLook: costumeLook, costumeStats: costumeStats };
});
