// Alchemy: brew timed potions with gold (about two minutes of income). Each brew counts toward the
// alchemy level, which makes potions stronger and longer. Brewing again adds time, up to stackCap durations.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function econ() { return isNode ? require('./economy.js') : root.CW; }
  var C = DATA.alchConf;
  function potionById(id) { for (var i = 0; i < DATA.potions.length; i++) if (DATA.potions[i].id === id) return DATA.potions[i]; return null; }
  function box(state) { if (!state.alch) state.alch = { brews: 0, until: {} }; if (!state.alch.until) state.alch.until = {}; return state.alch; }
  function alchemyOpen(state) { return (state.tier || 1) >= C.unlockTier; }
  function alchLevel(state) { return Math.min(C.maxLv, Math.floor(((state.alch && state.alch.brews) || 0) / C.brewsPerLv)); }
  function potionMinutes(state) { return C.minutes + alchLevel(state) * C.minPerLv; }
  function potionPower(state, id) { var p = potionById(id); return p ? p.val * (1 + alchLevel(state) * C.effPerLv) : 0; }
  function potionCost(state) { return Math.max(100, econ().goldPerSecond(state) * C.costSec); }
  function buffLeft(state, id, now) { var u = (state.alch && state.alch.until && state.alch.until[id]) || 0; return Math.max(0, (u - (now || Date.now())) / 1000); }
  function brew(state, id, now) {
    now = now || Date.now();
    if (!potionById(id) || !alchemyOpen(state)) return false;
    var c = potionCost(state); if (!(state.gold >= c)) return false;
    var a = box(state), dur = potionMinutes(state) * 60000, start = Math.max(now, a.until[id] || 0);
    state.gold = Math.max(0, state.gold - c);
    a.until[id] = Math.min(start + dur, now + dur * C.stackCap); a.brews++;
    return true;
  }
  // a short text of the potions that are running, so the game knows when to refresh its numbers
  function buffKey(state, now) { return DATA.potions.map(function (p) { return buffLeft(state, p.id, now) > 0 ? p.id : ''; }).join(','); }
  function alchemyStats(state) {
    var b = {}, now = Date.now();
    if (!state.alch) return b;
    DATA.potions.forEach(function (p) { if (buffLeft(state, p.id, now) > 0) b[p.stat] = (b[p.stat] || 0) + potionPower(state, p.id); });
    return b;
  }
  return { potionById: potionById, alchemyOpen: alchemyOpen, alchLevel: alchLevel, potionMinutes: potionMinutes, potionPower: potionPower, potionCost: potionCost,
    buffLeft: buffLeft, brew: brew, buffKey: buffKey, alchemyStats: alchemyStats };
});
