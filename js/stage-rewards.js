// What one stage is like, as the map (ui.js stagePanel) shows it: the same numbers the game uses (main.js spawn / onDeath
// / bossWin). A plain stage: one monster (four come at once, CROWD; 3 until 2026-11-15) — its health, and the gold and experience it gives.
// A boss stage: the boss's health, and the gold, experience and gems for beating it.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function dep(f) { return isNode ? require(f) : root.CW; }
  var BOSS_GOLD = 8;
  // phones (a finger, not a mouse): one step fewer monsters, each the old size (user 2026-11-15: "it stutters a bit") — fewer
  // deaths, hits and effects a second for the same hunting speed. 'cw-device' = 'phone' / 'pc' in storage overrides the guess.
  function detectPhone(env) {
    if (!env || !env.navigator) return false;
    try { var saved = env.localStorage && env.localStorage.getItem('cw-device'); if (saved === 'phone') return true; if (saved === 'pc') return false; } catch (e) { }
    var coarse = false; try { coarse = !!(env.matchMedia && env.matchMedia('(pointer: coarse)').matches); } catch (e) { }
    return (env.navigator.maxTouchPoints || 0) > 0 && coarse;
  }
  // monsters a stage is split into: 4 on a computer (5 was tried first; with the smaller field 4 keeps the same health on
  // the field), the old 3 on a phone
  function crowdOf(phone) { return phone ? 3 : 4; }
  // the field fills again when this share is left: about half on a computer; a little later on a phone, whose old-size monsters
  // would otherwise keep the field full and hunt 20% faster than before (measured 2026-11-15)
  function refillOf(phone) { return phone ? 0.4 : 0.55; }
  var PHONE = !isNode && detectPhone(root), CROWD = crowdOf(PHONE), REFILL_AT = refillOf(PHONE);
  // dungeons pay by the number of kills, so they keep the old split; the field fills again when about half is left
  var DUN_CROWD = 3;
  // most monsters on the field at once (quality: the drawing quality, extra: the difficulty's extraMobs) — about 1.3× the old
  // 14/10/7 (first tried 1.6×; phones stalled more, so the user chose a little less)
  function capOf(quality, extra, phone) {
    extra = extra || 0;
    if (phone) quality = quality === 'high' ? 'mid' : quality === 'mid' ? 'low' : 'lowest';
    return quality === 'lowest' ? 7 + Math.round(extra / 2) : quality === 'low' ? 9 + Math.round(extra * 0.65) : quality === 'mid' ? 13 + extra : 18 + Math.round(extra * 1.3);
  }
  function crowdCap(quality, extra) { return capOf(quality, extra, PHONE); }
  // monsters still to come in a wave that started on a bigger field: never more than the room the current field has
  // monsters over the field size after the quality dropped (they stay, and on hard difficulties they hardly die): that many leave
  function excessMobs(alive, cap) { return Math.max(0, alive - cap); }
  function waveRoom(left, cap, alive) { return Math.max(0, Math.min(left, cap - alive)); }
  // how many monsters a skill really hits: monsters are split CROWD/3 times finer than the skill data (made for 3), so
  // a skill that hits a few hits that many more (1→2, 3→4, 5→7); a skill for every monster (99) stays
  function hitCountFor(targets, crowd) { return targets >= 99 || crowd <= 3 ? targets : Math.max(targets + 1, Math.round(targets * crowd / 3)); }
  function hitCount(targets) { return hitCountFor(targets, CROWD); }
  // dungeons keep the old split and pay per kill, so there a skill hits its old count (review 2026-11-15)
  function targetCount(skill, inDungeon) { return inDungeon ? skill.targets : hitCount(skill.targets); }
  // state: { stage, diff }; st: the player's stats (goldMul, xpMul); firstClear: the boss gives its first-clear gems
  function stageRewards(state, st, firstClear) {
    var E = dep('./economy.js'), L = dep('./level.js'), P = dep('./progress.js'), i = state.stage, d = state.diff || 0;
    var boss = P.stageInfo(i).isBoss, gm = (st && st.goldMul) || 1, xm = (st && st.xpMul) || 1;
    if (boss) return { boss: true, hp: E.stageBossHp(state), gold: E.stageGold(state, undefined, gm) * BOSS_GOLD * gm, xp: L.bossXp(state) * xm, gems: E.bossGems(i, !!firstClear) * ((DATA.difficulties[d] || {}).gemMul || 1) };
    return { boss: false, hp: E.stageMonsterHp(state) / CROWD, gold: E.stageGold(state, undefined, gm) * gm / CROWD * DATA.balance.killPay, xp: L.killXp(state) / CROWD * xm * DATA.balance.killPay, gems: 0 };
  }
  return { stageRewards: stageRewards, CROWD: CROWD, BOSS_GOLD: BOSS_GOLD, DUN_CROWD: DUN_CROWD, REFILL_AT: REFILL_AT, crowdCap: crowdCap, hitCount: hitCount, PHONE: PHONE, detectPhone: detectPhone, crowdOf: crowdOf, refillOf: refillOf, capOf: capOf, hitCountFor: hitCountFor, targetCount: targetCount, waveRoom: waveRoom, excessMobs: excessMobs };
});
