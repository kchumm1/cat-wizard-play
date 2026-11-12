// Runes: six stones levelled with rune stones (from bosses, the rune temple dungeon and packages).
// Each rune has a grade (일반 → 멸망): the grade caps the level, promoting at the cap costs rune stones and makes the rune stronger.
// Resonance: every resEvery levels of the LOWEST rune adds to all damage, so keeping them even pays.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var C = DATA.runeConf, TOP = DATA.hiGrades.length - 1;
  function runeById(id) { for (var i = 0; i < DATA.runes.length; i++) if (DATA.runes[i].id === id) return DATA.runes[i]; return null; }
  function runeOpen(state) { return (state.tier || 1) >= C.unlockTier; }
  function runeLv(state, id) { return (state.runes || {})[id] || 0; }
  function runeGrade(state, id) { return Math.min(TOP, (state.runeGrade || {})[id] || 0); }
  function runeCap(state, id) { return C.lvPerGrade * (runeGrade(state, id) + 1); }
  function runeCost(lv) { return Math.ceil(C.costBase * Math.pow(C.costGrowth, lv)); }
  function runeGradeCost(g) { return Math.ceil(C.gradeCostBase * Math.pow(C.gradeCostGrowth, g)); }
  function runeUp(state, id) {
    if (!runeById(id) || !runeOpen(state)) return false;
    var lv = runeLv(state, id); if (lv >= runeCap(state, id)) return false;
    var c = runeCost(lv); if (!((state.runeStone || 0) >= c)) return false;
    state.runeStone -= c; state.runes = state.runes || {}; state.runes[id] = lv + 1; return true;
  }
  function runeGradeUp(state, id) {
    if (!runeById(id) || !runeOpen(state)) return false;
    var g = runeGrade(state, id); if (g >= TOP || runeLv(state, id) < runeCap(state, id)) return false;
    var c = runeGradeCost(g); if (!((state.runeStone || 0) >= c)) return false;
    state.runeStone -= c; state.runeGrade = state.runeGrade || {}; state.runeGrade[id] = g + 1; return true;
  }
  function runeResonance(state) {
    var min = Infinity; DATA.runes.forEach(function (r) { min = Math.min(min, runeLv(state, r.id)); });
    return Math.floor(min / C.resEvery);
  }
  function runeValue(state, r) { return runeLv(state, r.id) * r.per * (1 + runeGrade(state, r.id) * C.gradeStep); }
  function runeStoneForBoss(state, regionBoss) { return runeOpen(state) ? (regionBoss ? C.regionStone : C.bossStone) : 0; }
  function runeStats(state) {
    var b = {};
    DATA.runes.forEach(function (r) { var v = runeValue(state, r); if (v) b[r.stat] = (b[r.stat] || 0) + v; });
    var res = runeResonance(state); if (res) b.finalPct = (b.finalPct || 0) + res * C.resFinal;
    return b;
  }
  return { runeById: runeById, runeOpen: runeOpen, runeLv: runeLv, runeGrade: runeGrade, runeCap: runeCap, runeCost: runeCost, runeGradeCost: runeGradeCost,
    runeUp: runeUp, runeGradeUp: runeGradeUp, runeResonance: runeResonance, runeValue: runeValue, runeStoneForBoss: runeStoneForBoss, runeStats: runeStats };
});
