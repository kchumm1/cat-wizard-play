// Player level 1..800: monsters give experience, each level adds attack, every 10th level gives diamonds.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var B = DATA.balance;
  function xpNeed(lv) { return Math.round(B.levelXpBase * Math.pow(lv, B.levelXpPow)); }
  function effStage(state) { return (state.stage || 0) + 310 * (state.diff || 0); }
  function killXp(state) { var e = effStage(state); return (3 + e / 10) * Math.pow(B.levelXpStage, e); }
  function bossXp(state) { return killXp(state) * B.levelBossXp; }
  // returns { levels, gems } gained
  function gainXp(state, amount) {
    var out = { levels: 0, gems: 0 };
    if (!(amount > 0) || state.level >= B.levelMax) { if (state.level >= B.levelMax) state.xp = 0; return out; }
    state.xp = (state.xp || 0) + amount;
    while (state.level < B.levelMax && state.xp >= xpNeed(state.level)) {
      state.xp -= xpNeed(state.level); state.level += 1; out.levels++;
      if (state.level % 10 === 0) { var g = B.levelGems * (1 + Math.floor(state.level / 100)); state.gems += g; out.gems += g; }
    }
    if (state.level >= B.levelMax) state.xp = 0;
    return out;
  }
  return { xpNeed: xpNeed, killXp: killXp, bossXp: bossXp, gainXp: gainXp };
});
