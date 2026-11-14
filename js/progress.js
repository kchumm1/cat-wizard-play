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
  // the boss of a boss stage: the region boss at 31, the region's minis in turn at 5, 10, … 30
  function stageBoss(i) {
    var info = stageInfo(i), R = DATA.regions[info.region]; if (!info.isBoss || !R) return null;
    if (info.isRegionBoss) return { art: R.boss.art, name: R.boss.name, region: true };
    var list = R.minis || [], id = list[(info.num / 5 - 1) % list.length];
    var BEST = (isNode ? require('./bestiary.js') : root.CW).BESTIARY || {};
    return { art: id, name: (BEST[id] && BEST[id].name) || R.name + ' 대장', region: false };
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
  // the job a region boss leads to: regions 1-8 -> jobs 2-9 on any difficulty; the 10th job (the phoenix) is the
  // boss of 5-31 on 루나틱 (difficulty 2, 2026-11-14); 9-31 and the last boss lead to none (yet)
  var TIER10 = { diff: 2, region: 4 };
  function trialTier(i, diff) {
    var info = stageInfo(i); if (!info.isRegionBoss) return 0;
    if ((diff || 0) === TIER10.diff && info.region === TIER10.region) return 10;
    return info.region < 8 ? info.region + 2 : 0;
  }
  // a job trial: beating this boss would still raise the tier (shown as "전직 시험"; once the job is reached it is a
  // plain region boss). diff: the difficulty asked about (the map shows others than the one being played)
  function isTierTrial(state, i, diff) { return trialTier(i, diff === undefined ? state.diff : diff) > (state.tier || 1); }
  // what job n needs, in words (the job list and the goal line say this)
  function tierNeed(n) {
    if (n <= 1) return '처음부터';
    if (n <= 9) return (n - 1) + '-31 보스를 이기면';
    if (n === 10) return DATA.difficulties[TIER10.diff].name + ' ' + (TIER10.region + 1) + '-31 보스를 이기면';
    var soon = (DATA.tierSoon || []).filter(function (t) { return t.n === n; })[0];
    return soon ? DATA.difficulties[soon.diff].name + ' 10-31 보스를 이기면' : '';
  }
  function onBossResult(state, won) {
    state.bossTry = false;
    state.kills = 0;
    if (!won) { state.stage = Math.max(0, state.stage - 1); state.farming = true; return { cleared: false, tierUp: null, final: false }; }
    state.bossWins = (state.bossWins || 0) + 1; if (state.diff >= 1) state.slayerWin = true;
    var tierUp = isTierTrial(state, state.stage) ? trialTier(state.stage, state.diff) : null;
    state.best = Math.max(state.best, state.stage);
    if (tierUp) state.tier = tierUp;
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
  return { clearKey: clearKey, setDifficulty: setDifficulty, stageLabel: stageLabel, stageInfo: stageInfo, stageBoss: stageBoss, isTierTrial: isTierTrial, tierNeed: tierNeed, onKill: onKill, onBossResult: onBossResult, retryBoss: retryBoss, onHidden: onHidden, goStage: goStage, LAST_STAGE: LAST };
});
