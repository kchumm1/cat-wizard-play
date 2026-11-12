(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var LAST = 309;

  function stageLabel(i) { return (Math.floor(i / 31) + 1) + '-' + (i % 31 + 1); }
  function stageInfo(i) {
    var num = i % 31 + 1;
    var isRegionBoss = num === 31;
    var isBoss = isRegionBoss || num % 5 === 0;
    return { region: Math.floor(i / 31), num: num, isBoss: isBoss, isRegionBoss: isRegionBoss, timeLimit: isRegionBoss ? 45 : isBoss ? 30 : 0 };
  }
  function onKill(state) {
    if (state.bossTry) return null;
    state.kills = (state.kills || 0) + 1;
    if (state.kills < DATA.balance.killsPerStage) return null;
    state.kills = 0;
    if (state.farming) return null;
    state.best = Math.max(state.best, state.stage);
    // with auto boss off, wait on this stage until the player presses the challenge button
    if (state.stage + 1 <= LAST && stageInfo(state.stage + 1).isBoss && state.settings && state.settings.autoBoss === false) { state.farming = true; return 'hold'; }
    state.stage += 1;
    if (stageInfo(state.stage).isBoss) { state.bossTry = true; return 'boss'; }
    return 'next';
  }
  function onBossResult(state, won) {
    state.bossTry = false;
    state.kills = 0;
    if (!won) { state.stage = Math.max(0, state.stage - 1); state.farming = true; return { cleared: false, tierUp: null, final: false }; }
    var info = stageInfo(state.stage);
    state.best = Math.max(state.best, state.stage);
    var tierUp = null;
    if (info.isRegionBoss && info.region < 8) {
      var t = info.region + 2;
      if (t > state.tier) { state.tier = t; tierUp = t; }
    }
    var final = state.stage === LAST, unlocked = null;
    var nd = (state.diff || 0) + 1;
    if (final && DATA.difficulties && nd < DATA.difficulties.length && nd > (state.diffUnlocked || 0)) { state.diffUnlocked = nd; unlocked = nd; }
    if (!final) state.stage += 1;
    state.farming = final;
    if (!final && stageInfo(state.stage).isBoss) state.bossTry = true;
    return { cleared: true, tierUp: tierUp, final: final, unlocked: unlocked };
  }
  function retryBoss(state) {
    var b = Math.max(state.best + 1, state.stage + 1);
    if (b > LAST || !stageInfo(b).isBoss) return false;
    state.stage = b; state.farming = false; state.bossTry = true; state.kills = 0;
    return true;
  }
  function onHidden(state) {
    if (!state.bossTry) return;
    state.bossTry = false; state.stage = Math.max(0, state.stage - 1); state.farming = true; state.kills = 0;
  }
  function goStage(state, i) {
    var frontier = Math.min(LAST, state.best + 1);
    if (i < 0 || i > frontier) return false;
    state.bossTry = false; state.kills = 0;
    if (i === frontier && stageInfo(i).isBoss) { return retryBoss(state); }
    state.stage = i; state.farming = i < frontier;
    return true;
  }
  // first-clear rewards are remembered per difficulty
  function clearKey(state, stage) { return state.diff ? state.diff + ':' + stage : stage; }
  function setDifficulty(state, d) {
    if (!DATA.difficulties || d < 0 || d >= DATA.difficulties.length || d > (state.diffUnlocked || 0)) return false;
    if (d === (state.diff || 0)) return true;
    state.diffBest = state.diffBest || {};
    state.diffBest[state.diff || 0] = { best: state.best, stage: state.bossTry ? Math.max(0, state.stage - 1) : state.stage };
    var p = state.diffBest[d] || { best: -1, stage: 0 };
    state.diff = d; state.best = p.best; state.stage = p.stage; state.bossTry = false; state.kills = 0;
    if (stageInfo(state.stage).isBoss && state.stage > state.best) state.stage = Math.max(0, state.stage - 1);
    state.farming = state.stage <= state.best;
    return true;
  }
  return { clearKey: clearKey, setDifficulty: setDifficulty, stageLabel: stageLabel, stageInfo: stageInfo, onKill: onKill, onBossResult: onBossResult, retryBoss: retryBoss, onHidden: onHidden, goStage: goStage, LAST_STAGE: LAST };
});
