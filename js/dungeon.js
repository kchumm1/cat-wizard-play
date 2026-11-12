// Dungeons: three tickets a day each; 30-second runs for gold, mana stones or diamonds; sweep repeats the best run.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function dep(f) { return isNode ? require('./' + f + '.js') : root.CW; }
  var C = DATA.dungeonConf;
  function dayKey(now) { var d = new Date(now); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dstate(state, now) {
    if (!state.dungeon) state.dungeon = { day: '', used: {}, best: {} };
    var k = dayKey(now); if (state.dungeon.day !== k) { state.dungeon.day = k; state.dungeon.used = {}; }
    return state.dungeon;
  }
  function dungeonOpen(state) { return (state.tier || 1) >= C.unlockTier; }
  function kindOpen(state, kind) { var d = DATA.dungeons.filter(function (x) { return x.id === kind; })[0]; return !!d && (state.tier || 1) >= (d.unlockTier || C.unlockTier); }
  function ticketsLeft(state, kind, now) { return Math.max(0, C.tickets - (dstate(state, now).used[kind] || 0)); }
  function useTicket(state, kind, now) {
    if (!dungeonOpen(state) || !kindOpen(state, kind) || ticketsLeft(state, kind, now) <= 0) return false;
    var d = dstate(state, now); d.used[kind] = (d.used[kind] || 0) + 1; return true;
  }
  function at(state) { return { stage: Math.max(0, state.best), diff: state.diff || 0, best: state.best }; }
  function golemHp(state, lv) { return dep('economy').stageMonsterHp(at(state)) * C.golemHpMul * Math.pow(C.golemGrowth, lv); }
  function golemLevel(state, dmg) { var L = 0; while (L < 200 && dmg >= golemHp(state, L)) L++; return L; }
  function dungeonReward(state, kind, res) {
    var E = dep('economy');
    if (kind === 'gold') return { gold: (res.kills || 0) * E.stageGold(at(state)) * E.stats(state).goldMul * C.goldPerKill };
    if (kind === 'gem') return { gems: Math.min(C.gemCap, Math.floor((res.kills || 0) * C.gemPerKill)) };
    if (kind === 'rune') return { runeStone: Math.round((res.kills || 0) * DATA.runeConf.dungeonPerKill * (1 + Math.floor(Math.max(0, state.best) / 31) * 0.4) * (1 + (state.diff || 0))) };
    var L = golemLevel(state, res.dmg || 0);
    return { mana: L ? Math.round(dep('training').manaForBoss(Math.max(0, state.best), false) * L * (1 + C.manaLvMul * L)) : 0, level: L };
  }
  function value(r) { return (r.gold || 0) + (r.gems || 0) + (r.mana || 0) + (r.runeStone || 0); }
  function recordBest(state, kind, res) {
    var d = dstate(state, Date.now()), old = d.best[kind];
    if (!old || value(dungeonReward(state, kind, res)) > value(dungeonReward(state, kind, old))) d.best[kind] = { kills: res.kills || 0, dmg: res.dmg || 0 };
  }
  function applyReward(state, r) { state.gold += r.gold || 0; state.gems += r.gems || 0; state.mana = (state.mana || 0) + (r.mana || 0); state.runeStone = (state.runeStone || 0) + (r.runeStone || 0); }
  function sweep(state, kind, now) {
    var b = state.dungeon && state.dungeon.best && state.dungeon.best[kind];
    if (!b || !useTicket(state, kind, now)) return null;
    var r = dungeonReward(state, kind, b); applyReward(state, r); return r;
  }
  return { dungeonOpen: dungeonOpen, kindOpen: kindOpen, ticketsLeft: ticketsLeft, useTicket: useTicket, golemHp: golemHp, golemLevel: golemLevel, dungeonReward: dungeonReward, recordBest: recordBest, applyReward: applyReward, sweep: sweep };
});
