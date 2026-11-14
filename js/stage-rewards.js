// What one stage is like, as the map (ui.js stagePanel) shows it: the same numbers the game uses (main.js spawn / onDeath
// / bossWin). A plain stage: one monster (three come at once, CROWD) — its health, and the gold and experience it gives.
// A boss stage: the boss's health, and the gold, experience and gems for beating it.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function dep(f) { return isNode ? require(f) : root.CW; }
  var CROWD = 3, BOSS_GOLD = 8;
  // state: { stage, diff }; st: the player's stats (goldMul, xpMul); firstClear: the boss gives its first-clear gems
  function stageRewards(state, st, firstClear) {
    var E = dep('./economy.js'), L = dep('./level.js'), P = dep('./progress.js'), i = state.stage, d = state.diff || 0;
    var boss = P.stageInfo(i).isBoss, gm = (st && st.goldMul) || 1, xm = (st && st.xpMul) || 1;
    if (boss) return { boss: true, hp: E.stageBossHp(state), gold: E.stageGold(state) * BOSS_GOLD * gm, xp: L.bossXp(state) * xm, gems: E.bossGems(i, !!firstClear) * ((DATA.difficulties[d] || {}).gemMul || 1) };
    return { boss: false, hp: E.stageMonsterHp(state) / CROWD, gold: E.stageGold(state) * gm / CROWD, xp: L.killXp(state) / CROWD * xm, gems: 0 };
  }
  return { stageRewards: stageRewards, CROWD: CROWD, BOSS_GOLD: BOSS_GOLD };
});
