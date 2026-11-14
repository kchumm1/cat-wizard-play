// Training: talent tree (points from player level), marks and rank (mana stones), mana circle.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var TC = DATA.talentConf, RC = DATA.rankConf, CC = DATA.circleConf, MC = DATA.manaConf;
  function talentById(id) { for (var i = 0; i < DATA.talents.length; i++) if (DATA.talents[i].id === id) return DATA.talents[i]; return null; }
  function talentPoints(state) { return Math.floor((state.level || 1) / TC.levelsPerPoint); }
  function talentSpent(state, maxRow) {
    var t = state.talents || {}, n = 0;
    DATA.talents.forEach(function (x) { if (maxRow === undefined || x.row <= maxRow) n += t[x.id] || 0; });
    return n;
  }
  function talentCan(state, id) {
    var x = talentById(id); if (!x) return false;
    var t = state.talents || {};
    if ((t[id] || 0) >= x.max || talentSpent(state) >= talentPoints(state)) return false;
    if ((state.level || 1) < TC.rowLevel[x.row]) return false;
    return x.row === 0 || talentSpent(state, x.row - 1) >= TC.rowNeed[x.row];
  }
  function talentUp(state, id) {
    if (!talentCan(state, id)) return false;
    state.talents = state.talents || {}; state.talents[id] = (state.talents[id] || 0) + 1; return true;
  }
  function talentReset(state) { state.talents = {}; return true; }
  function markById(id) { for (var i = 0; i < DATA.marks.length; i++) if (DATA.marks[i].id === id) return DATA.marks[i]; return null; }
  function markCap(state) { return RC.capPerRank * ((state.rank || 0) + 1); }
  function markCost(lv) { return Math.ceil(RC.markBase * Math.pow(RC.markGrowth, lv)); }
  function markOpen(state, id) { var m = markById(id); return !!m && (!m.extra || (state.rank || 0) >= m.openRank); }
  function markUp(state, id) {
    if (!markOpen(state, id)) return false;
    state.marks = state.marks || {};
    var lv = state.marks[id] || 0; if (lv >= markCap(state)) return false;
    var c = markCost(lv); if (!((state.mana || 0) >= c)) return false;
    state.mana -= c; state.marks[id] = lv + 1; return true;
  }
  function rankReady(state) {
    var r = state.rank || 0, next = r + 1;
    if (next >= RC.names.length) return { ok: false, why: 'max' };
    var capped = DATA.marks.every(function (m) { return m.extra || ((state.marks || {})[m.id] || 0) >= markCap(state); });
    if (!capped) return { ok: false, why: 'marks' };
    if ((state.level || 1) < RC.rankLevel[next]) return { ok: false, why: 'level', need: RC.rankLevel[next] };
    if ((state.mana || 0) < RC.rankCost[next]) return { ok: false, why: 'mana', need: RC.rankCost[next] };
    return { ok: true };
  }
  function rankUp(state) {
    if (!rankReady(state).ok) return false;
    state.rank = (state.rank || 0) + 1; state.mana -= RC.rankCost[state.rank]; return true;
  }
  function circleCost(lv) { return Math.ceil(CC.base * Math.pow(CC.growth, lv)); }
  function circleTier(state) { return Math.floor((state.circle || 0) / CC.tierEvery); }
  function circleUp(state) {
    var lv = state.circle || 0; if (lv >= CC.maxLv) return false;
    var c = circleCost(lv); if (!((state.mana || 0) >= c)) return false;
    state.mana -= c; state.circle = lv + 1; return true;
  }
  function manaForBoss(stage, regionBoss) {
    var v = (MC.bossBase + stage * MC.bossPerStage) * Math.pow(MC.bossGrowth, stage);
    return Math.round(v * (regionBoss ? MC.regionMul : 1));
  }
  function trainingStats(state) {
    var b = {}, t = state.talents || {}, m = state.marks || {};
    function add(k, v) { b[k] = (b[k] || 0) + v; }
    DATA.talents.forEach(function (x) { if (t[x.id]) add(x.stat, t[x.id] * x.per); });
    DATA.marks.forEach(function (x) { if (m[x.id]) add(x.stat, m[x.id] * x.per); });
    if (state.circle) add('skillDmg', state.circle * CC.perLv);
    add('finalPct', (state.rank || 0) * RC.rankFinal + circleTier(state) * CC.tierFinal);
    return b;
  }
  return { talentById: talentById, talentPoints: talentPoints, talentSpent: talentSpent, talentCan: talentCan, talentUp: talentUp, talentReset: talentReset,
    markById: markById, markOpen: markOpen, markCap: markCap, markCost: markCost, markUp: markUp, rankReady: rankReady, rankUp: rankUp,
    circleCost: circleCost, circleTier: circleTier, circleUp: circleUp, manaForBoss: manaForBoss, trainingStats: trainingStats };
});
