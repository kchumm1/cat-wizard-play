(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var LAST = 309;

  // which world a difficulty is in (2026-11-17): 0 = the first (DATA.regions, 꽃밭 to 마왕성), 1 = the sky (DATA.skyRegions)
  function worldOf(diff) { var D = DATA.difficulties && DATA.difficulties[diff || 0]; return (D && D.world) || 0; }
  function regionsOf(diff) { return worldOf(diff) === 1 && DATA.skyRegions ? DATA.skyRegions : DATA.regions; }
  function regionAt(diff, r) { return regionsOf(diff)[r]; }
  // the scene's region number: the sky regions are 10-19, so going from 마왕성 to 구름 섬 builds a new field
  function sceneRegion(diff, r) { return r + 10 * worldOf(diff); }
  function stageLabel(i) { return (Math.floor(i / 31) + 1) + '-' + (i % 31 + 1); }
  function stageInfo(i) {
    var num = i % 31 + 1;
    var isRegionBoss = num === 31;
    var isBoss = isRegionBoss || num % 5 === 0;
    return { region: Math.floor(i / 31), num: num, isBoss: isBoss, isRegionBoss: isRegionBoss, timeLimit: isRegionBoss ? 45 : isBoss ? 30 : 0 };
  }
  // the boss of a boss stage: the region boss at 31, the region's minis in turn at 5, 10, … 30.
  // A region has up to 8 minis but only six boss stages, so each difficulty starts six further on (diff 0 shows 1-6, diff 1 shows 7, 8, 1, ...).
  function stageBoss(i, diff) {
    var info = stageInfo(i), R = regionAt(diff, info.region); if (!info.isBoss || !R) return null;
    if (info.isRegionBoss) return { art: R.boss.art, name: R.boss.name, region: true };
    var list = R.minis || [], id = list[(info.num / 5 - 1 + 6 * (diff || 0)) % list.length];
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
  // the job a region boss leads to: regions 1-8 -> jobs 2-9 on any difficulty; the 10th job (wood since 2026-11-16) is the
  // boss of 5-31 on 루나틱 (difficulty 2, 2026-11-14), the 11th (water, 2026-11-17) its last boss (10-31); 9-31 leads to none
  var TIER10 = { diff: 2, region: 4 };
  // the 11th job, water (2026-11-17): the boss of 10-31 on 루나틱
  var TIER11 = { diff: 2, region: 9 };
  // the 12th job, wind (2026-11-25): the boss of 10-31 on 어드밴스
  var TIER12 = { diff: 3, region: 9 };
  var LATE = { 10: TIER10, 11: TIER11, 12: TIER12 };
  function trialTier(i, diff) {
    var info = stageInfo(i); if (!info.isRegionBoss) return 0;
    if ((diff || 0) === TIER10.diff && info.region === TIER10.region) return root.CW && root.CW.FRIEND ? 0 : 10; // 체험판: no 10th job (js/friend.js)
    if ((diff || 0) === TIER11.diff && info.region === TIER11.region) return root.CW && root.CW.FRIEND ? 0 : 11;
    if ((diff || 0) === TIER12.diff && info.region === TIER12.region) return root.CW && root.CW.FRIEND ? 0 : 12;
    return info.region < 8 ? info.region + 2 : 0;
  }
  // a save that already beat the boss leading to its next job (2026-11-17, the user: 불러올 때 11차 주기; the 12th the same
  // way, 2026-11-25): those bosses are the last stage of their difficulty and cannot be fought again, so the job comes when
  // the save is loaded — one after the other (a 10th-job save that beat both goes straight to the 12th, one celebration).
  // Returns the new tier (and sets it) or null. friend: the 체험판 never gets it (js/friend.js)
  var LATE_STEPS = [[10, TIER11, 11], [11, TIER12, 12]];
  function lateTier(state, friend) {
    if (friend || !state) return null;
    var got = null;
    LATE_STEPS.forEach(function (st) {
      if (state.tier !== st[0]) return;
      var T = st[1], boss = T.region * 31 + 30;
      var best = (state.diff || 0) === T.diff ? state.best : (state.diffBest && state.diffBest[T.diff] && state.diffBest[T.diff].best);
      if (best >= boss) { state.tier = st[2]; got = st[2]; }
    });
    // tierShow: the celebration is owed (kept in the save until it has played — js/main.js doTierUp clears it)
    if (got) state.tierShow = got;
    return got;
  }
  // a region's weak elements as the boss result names them (2026-11-26): the 체험판 (maxTier 9) only names elements it has a
  // skill of — 나무·물·바람 come with the 10th job and later and are not shown there; maxTier null: all of them
  function weakShown(weak, maxTier) {
    weak = weak || [];
    if (maxTier == null) return weak.slice();
    return weak.filter(function (el) { return DATA.skills.some(function (k) { return k.el === el && k.tier <= maxTier; }); });
  }
  // a job trial: beating this boss would still raise the tier (shown as "전직 시험"; once the job is reached it is a
  // plain region boss). diff: the difficulty asked about (the map shows others than the one being played)
  function isTierTrial(state, i, diff) { return trialTier(i, diff === undefined ? state.diff : diff) > (state.tier || 1); }
  // what job n needs, in words (the job list and the goal line say this)
  function tierNeed(n) {
    if (n <= 1) return '처음부터';
    if (n <= 9) return (n - 1) + '-31 보스를 이기면';
    if (LATE[n] && root.CW && root.CW.FRIEND) return '체험판에서는 열리지 않아요';
    if (LATE[n]) return DATA.difficulties[LATE[n].diff].name + ' ' + (LATE[n].region + 1) + '-31 보스를 이기면';
    var soon = (DATA.tierSoon || []).filter(function (t) { return t.n === n; })[0];
    return soon ? DATA.difficulties[soon.diff].name + ' 10-31 보스를 이기면' : '';
  }
  // the same, short, for the job cards in 더보기 (2026-11-16, the user: 「전직 조건 · 루나틱 5-31 보스 깨기」처럼 간단히)
  function tierGoal(n) {
    if (n <= 1) return '처음부터';
    if (n <= 9) return (n - 1) + '-31 보스 깨기';
    if (LATE[n]) return root.CW && root.CW.FRIEND ? '체험판에서는 열리지 않아요' : DATA.difficulties[LATE[n].diff].name + ' ' + (LATE[n].region + 1) + '-31 보스 깨기';
    var soon = (DATA.tierSoon || []).filter(function (t) { return t.n === n; })[0];
    return soon ? DATA.difficulties[soon.diff].name + ' 10-31 보스 깨기' : '';
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
  // 자동 재도전 (2026-11-23, 형: 보스에 지면 강해졌을 때 알아서 다시 도전): the last loss remembers how strong the wizard was
  // (result.power, the usual boss damage a second) and how much of the boss was left (result.pct). Dealing (1 - pct) of
  // its health at that power, the wizard needs power / (1 - pct) to finish it, and RETRY_MARGIN more so a near loss is
  // not fought again and again. Auto boss off (설정) waits for the button as before.
  var RETRY_MARGIN = 1.15;
  function retryNeed(result) {
    if (!result || !(result.power > 0) || !(result.pct > 0)) return Infinity;
    // no cap: a boss left at 99.99% really does need thousands of times the power (damage is in proportion to power)
    var dealt = 1 - Math.min(100, result.pct) / 100;
    return dealt > 0 ? result.power / dealt * RETRY_MARGIN : Infinity;
  }
  function autoRetryReady(state, result, power) {
    if (!state || state.bossTry || !state.farming || (state.settings && state.settings.autoBoss === false)) return false;
    return power > 0 && power >= retryNeed(result);
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
  return { worldOf: worldOf, regionsOf: regionsOf, regionAt: regionAt, sceneRegion: sceneRegion, clearKey: clearKey, setDifficulty: setDifficulty, stageLabel: stageLabel, stageInfo: stageInfo, stageBoss: stageBoss, isTierTrial: isTierTrial, lateTier: lateTier, weakShown: weakShown, tierNeed: tierNeed, tierGoal: tierGoal, onKill: onKill, onBossResult: onBossResult, retryBoss: retryBoss, retryNeed: retryNeed, autoRetryReady: autoRetryReady, RETRY_MARGIN: RETRY_MARGIN, onHidden: onHidden, goStage: goStage, LAST_STAGE: LAST };
});
