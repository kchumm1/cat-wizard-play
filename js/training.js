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
    // 한계 돌파 (2026-11-15): a talent can go past its max; the points (one per 20 levels) are the only limit
    if (talentSpent(state) >= talentPoints(state)) return false;
    if ((state.level || 1) < TC.rowLevel[x.row]) return false;
    // 크리티컬 talents (2026-11-16): open with their tier, stop at their max
    if (x.crit !== undefined) return talentOpen(state, id) && (t[id] || 0) < x.max;
    return x.row === 0 || talentSpent(state, x.row - 1) >= TC.rowNeed[x.row];
  }
  // is the talent's row (or, for a 크리티컬 talent, its crit tier) open
  function talentOpen(state, id) {
    var x = talentById(id); if (!x) return false;
    if ((state.level || 1) < TC.rowLevel[x.row]) return false;
    if (x.crit !== undefined) { var E = isNode ? require('./economy.js') : root.CW; return !E.critTierOpen || E.critTierOpen(state, x.crit); }
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
    // 한계 돌파 (2026-11-15): past the rank's cap marks keep going for mana stones (the cost keeps growing)
    var lv = state.marks[id] || 0;
    var c = markCost(lv); if (!(c < 1e300)) return false; if (!((state.mana || 0) >= c)) return false;
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
  // past maxLv (한계 돌파, 2026-11-15) the circle keeps levelling: skill damage keeps growing, the circle (tier) and its
  // all-damage bonus and picture stay at the top one
  function circleTier(state) { return Math.floor(Math.min(state.circle || 0, CC.maxLv) / CC.tierEvery); }
  function circleUp(state) {
    var lv = state.circle || 0;
    var c = circleCost(lv); if (!(c < 1e300) || !((state.mana || 0) >= c)) return false;
    state.mana -= c; state.circle = lv + 1; return true;
  }
  function manaForBoss(stage, regionBoss) {
    var v = (MC.bossBase + stage * MC.bossPerStage) * Math.pow(MC.bossGrowth, stage);
    return Math.round(v * (regionBoss ? MC.regionMul : 1));
  }
  function trainingStats(state) {
    var b = {}, t = state.talents || {}, m = state.marks || {};
    function add(k, v) { b[k] = (b[k] || 0) + v; }
    // a 크리티컬 talent counts up to its max (a save may hold more) and only while its tier is open
    DATA.talents.forEach(function (x) { if (t[x.id] && (x.crit === undefined || talentOpen(state, x.id))) add(x.stat, (x.crit !== undefined ? Math.min(t[x.id], x.max) : t[x.id]) * x.per); });
    // a rate mark (치명타·슈퍼 확률) counts up to the rank's cap; what is past it goes to that crit's damage (markOver)
    DATA.marks.forEach(function (x) { if (m[x.id]) add(x.stat, (RATE_TO[x.stat] ? Math.min(m[x.id], markCap(state)) : m[x.id]) * x.per); });
    if (state.circle) add('skillDmg', state.circle * CC.perLv);
    add('finalPct', (state.rank || 0) * RC.rankFinal + circleTier(state) * CC.tierFinal);
    return b;
  }
  // 한계 돌파 of the rate marks: { critDmg: levels, superDmg: levels } past the cap, each +1% (economy.stats adds it like
  // the 성장 rows' levels past their max)
  var RATE_TO = { critRate: 'critDmg', superRate: 'superDmg' };
  function markOver(state) {
    var o = {}, m = state.marks || {}, cap = markCap(state);
    DATA.marks.forEach(function (x) { var t = RATE_TO[x.stat], n = (m[x.id] || 0) - cap; if (t && n > 0) o[t] = (o[t] || 0) + n; });
    return o;
  }
  return { markOver: markOver, talentById: talentById, talentPoints: talentPoints, talentSpent: talentSpent, talentCan: talentCan, talentOpen: talentOpen, talentUp: talentUp, talentReset: talentReset,
    markById: markById, markOpen: markOpen, markCap: markCap, markCost: markCost, markUp: markUp, rankReady: rankReady, rankUp: rankUp,
    circleCost: circleCost, circleTier: circleTier, circleUp: circleUp, manaForBoss: manaForBoss, trainingStats: trainingStats };
});
