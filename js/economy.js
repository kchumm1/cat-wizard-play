(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  function dep(file) { if (isNode) { try { return require('./' + file + '.js'); } catch (e) { return null; } } return root.CW; }
  var DATA = dep('data').DATA;
  var B = DATA.balance;
  var CAP = 1e300;
  function cap(x) { return isFinite(x) ? Math.min(x, CAP) : CAP; }

  function isRegionBoss(i) { return i % 31 === 30; }
  function isMiniBoss(i) { var n = i % 31 + 1; return n <= 30 && n % 5 === 0; }

  function monsterHp(i) { return cap(B.hpBase * Math.pow(B.hpGrowth, i) * Math.pow(B.regionStep || 1, Math.floor(i / 31))); }
  function bossHp(i, walls) {
    var W = walls || B.wallMul, wall = (W && W[Math.floor(i / 31)]) || 1;
    // mini bosses carry part of the region wall, growing toward the region boss
    if (!isRegionBoss(i)) return cap(monsterHp(i) * B.bossMul * Math.pow(wall, (B.wallShare || 0) * ((i % 31 + 1) / 31)));
    return cap(monsterHp(i) * B.regionBossMul * wall);
  }
  function monsterGold(i) { return cap(B.goldBase * Math.pow(B.goldGrowth, i)); }
  // ---------- difficulty: each one continues the growth curve past 10-31 and multiplies bosses ----------
  var SPAN = 310;
  function diffOf(state) { return (DATA.difficulties && DATA.difficulties[state.diff || 0]) || { hpMul: 1, bossMul: 1, gemMul: 1, extraMobs: 0 }; }
  function stageMonsterHp(state, i) { i = i === undefined ? state.stage || 0 : i; return cap(monsterHp(i + SPAN * (state.diff || 0)) * diffOf(state).hpMul); }
  function stageBossHp(state, i) { i = i === undefined ? state.stage || 0 : i; return cap(bossHp(i, state.diff ? B.diffWallMul : null) * Math.pow(B.hpGrowth, SPAN * (state.diff || 0)) * diffOf(state).bossMul); }
  // Gold a monster gives. On a harder difficulty (2026-11-14) at most 1/goldCapKills of the player's next attack level:
  // gold grows ×1.2 a stage, and sweeping the easy first stages of a new difficulty gave hundreds of attack levels in a
  // few days (measured 584 -> 934 in three days on 슬레이어 킹). With the cap an attack level always takes about
  // goldCapKills monsters there. Normal difficulty is as it was (its pace is tuned, tests/balance).
  // goldMul: the player's gold bonus the caller multiplies by afterwards — the cap is on the gold really received.
  function stageGold(state, i, goldMul) {
    i = i === undefined ? state.stage || 0 : i;
    var g = cap(monsterGold(i + SPAN * (state.diff || 0)));
    if (!state.diff || !state.up || !B.goldCapKills) return g;
    return Math.min(g, upgradeCost('atk', state.up.atk || 0) / B.goldCapKills / Math.max(1, goldMul || 1));
  }
  function bossGems(i, first) {
    var region = Math.floor(i / 31);
    var g = isRegionBoss(i) ? B.regionBossGems * (1 + region * 0.5) : B.bossGemsBase + region * B.bossGemsPerRegion;
    return Math.round(g * (first ? B.firstClearMul : 1));
  }
  function upgradeCost(key, level) {
    var u = DATA.upgrades[key];
    return cap(Math.ceil(u.costBase * Math.pow(u.costGrowth, level)));
  }
  function upgradeNeed(key) { var u = DATA.upgrades[key]; return u && u.need ? { key: u.need[0], lv: u.need[1] } : null; }
  function upgradeOpen(state, key) {
    var u = DATA.upgrades[key]; if (!u) return false;
    if (u.tier && (state.tier || 1) < u.tier) return false;
    return !u.need || ((state.up || {})[u.need[0]] || 0) >= u.need[1];
  }
  // total gold for the next n levels (stops at the max level)
  function upgradeCostN(state, key, n) {
    var u = DATA.upgrades[key], lv = state.up[key] || 0, sum = 0;
    for (var i = 0; i < n && (u.max === null || lv + i < u.max); i++) sum += upgradeCost(key, lv + i);
    return sum;
  }
  // buys up to n levels while gold lasts; returns how many were bought
  function tryUpgradeN(state, key, n) {
    var k = 0; while (k < n && tryUpgrade(state, key)) k++;
    return k;
  }
  function tryUpgrade(state, key) {
    var u = DATA.upgrades[key];
    if (!upgradeOpen(state, key)) return false;
    var lv = state.up[key] || 0;
    if (u.max !== null && lv >= u.max) return false;
    var c = upgradeCost(key, lv);
    if (!(state.gold >= c)) return false;
    state.gold = Math.max(0, state.gold - c);
    state.up[key] = lv + 1;
    return true;
  }
  var BONUS_KEYS = ['weakDmg', 'surgeDmg', 'surgeRate', 'finalPct', 'atk', 'atkPct', 'critRate', 'critDmg', 'goldMul', 'skillDmg', 'speed', 'bossDmg', 'normalDmg', 'xpMul', 'superRate', 'superDmg', 'ultraRate', 'ultraDmg', 'hyperRate', 'hyperDmg', 'megaRate', 'megaDmg', 'ultimateRate', 'ultimateDmg', 'alphaRate', 'alphaDmg', 'potion', 'potionGold', 'potionXp'];
  // every source of bonuses (gear, relics, costumes, star items, skill collection) adds into one object
  var SOURCES = [['gear', 'gearStats'], ['relics', 'relicStats'], ['costume', 'costumeStats'], ['divine', 'divineStats'], ['skills', 'skillOwnedStats'], ['training', 'trainingStats'], ['runes', 'runeStats'], ['sigil', 'sigilStats'], ['alchemy', 'alchemyStats'], ['titles', 'titleStats']];
  // the bonus of every source on its own (for the stat window); growth = the 초월 lines; total = what stats() uses
  function bonusBySource(state) {
    var parts = {}, total = {}; BONUS_KEYS.forEach(function (k) { total[k] = 0; });
    SOURCES.forEach(function (src) {
      var m = dep(src[0]); if (!m || !m[src[1]]) return;
      var b = m[src[1]](state) || {}, p = {};
      for (var k in b) if (total[k] !== undefined && isFinite(b[k])) { p[k] = b[k]; total[k] += b[k]; }
      parts[src[0]] = p;
    });
    var ub = upgradeBonus(state), g = {}; for (var k in ub) if (total[k] !== undefined) { g[k] = ub[k]; total[k] += ub[k]; }
    parts.growth = g;
    return { parts: parts, total: total };
  }
  function gearBonus(state) {
    var r = {}; BONUS_KEYS.forEach(function (k) { r[k] = 0; });
    SOURCES.forEach(function (src) {
      var m = dep(src[0]); if (!m || !m[src[1]]) return;
      var b = m[src[1]](state) || {};
      for (var k in b) if (r[k] !== undefined && isFinite(b[k])) r[k] += b[k];
    });
    return r;
  }
  // 초월 growth lines: level × adds, into the same bonus keys
  function upgradeBonus(state) {
    var r = {}, up = state.up || {};
    Object.keys(DATA.upgrades).forEach(function (k) {
      var a = DATA.upgrades[k].adds, lv = up[k] || 0; if (!a || !lv) return;
      for (var s in a) r[s] = (r[s] || 0) + a[s] * lv;
    });
    return r;
  }
  function stats(state) {
    var u = state.up, gb = gearBonus(state), ub = upgradeBonus(state);
    for (var bk in ub) if (gb[bk] !== undefined) gb[bk] += ub[bk];
    var atk = B.atkBase * (1 + u.atk * B.atkPerLevel) * Math.pow(B.atkCompound, u.atk);
    atk = atk * (1 + gb.atk) * (1 + gb.atkPct) * (1 + B.levelAtk * ((state.level || 1) - 1));
    return {
      atk: cap(atk),
      speedMul: Math.min(2, 1 + u.speed * B.speedPerLevel + gb.speed),
      critRate: Math.min(0.7, u.crit * B.critPerLevel + gb.critRate),
      critDmg: B.critDmgBase + u.critDmg * B.critDmgPerLevel + gb.critDmg,
      goldMul: (1 + u.gold * B.goldPerLevel + gb.goldMul) * (1 + gb.potionGold),
      mastery: 1 + u.mastery * B.masteryPerLevel,
      skillDmg: 1 + gb.skillDmg,
      bossDmg: 1 + gb.bossDmg,
      normalDmg: 1 + gb.normalDmg,
      finalMul: (1 + gb.finalPct) * (1 + gb.potion),
      weakMul: DATA.weakConf.mul * (1 + (gb.weakDmg || 0)),
      surgeMul: DATA.surgeConf.mul * (1 + (gb.surgeDmg || 0)),
      surgeRate: 1 + (gb.surgeRate || 0),
      xpMul: (1 + gb.xpMul) * (1 + gb.potionXp),
      skillLv: state.skillLv || {},
      superRate: Math.min(0.6, (u.superCrit || 0) * B.superPerLevel + (gb.superRate || 0)),
      ultraRate: Math.min(0.5, (u.ultraCrit || 0) * B.ultraPerLevel + (gb.ultraRate || 0)),
      hyperRate: Math.min(0.4, (u.hyperCrit || 0) * B.hyperPerLevel + (gb.hyperRate || 0)),
      superDmg: B.superDmg + (gb.superDmg || 0), ultraDmg: B.ultraDmg + (gb.ultraDmg || 0), hyperDmg: B.hyperDmg + (gb.hyperDmg || 0),
      megaRate: Math.min(0.3, (u.megaCrit || 0) * B.megaPerLevel + gb.megaRate),
      ultimateRate: Math.min(0.25, (u.ultimateCrit || 0) * B.ultimatePerLevel + gb.ultimateRate),
      alphaRate: Math.min(0.2, (u.alphaCrit || 0) * B.alphaPerLevel + gb.alphaRate),
      megaDmg: B.megaDmg + (u.megaDmg || 0) * B.highDmgPerLevel + gb.megaDmg,
      ultimateDmg: B.ultimateDmg + (u.ultimateDmg || 0) * B.highDmgPerLevel + gb.ultimateDmg,
      alphaDmg: B.alphaDmg + (u.alphaDmg || 0) * B.highDmgPerLevel + gb.alphaDmg
    };
  }
  function hitDamage(st, skill, o) {
    o = o || {};
    var d = st.atk * skill.mult * st.mastery * st.skillDmg * (1 + B.skillLvBonus * ((st.skillLv && st.skillLv[skill.id]) || 0));
    if (o.boss) d *= st.bossDmg; else d *= st.normalDmg || 1;
    d *= st.finalMul || 1;
    var ct = o.critTier !== undefined ? o.critTier : (o.crit ? 1 : 0), dm = tierDmgs(st);
    for (var t = 0; t < ct && t < dm.length; t++) d *= dm[t];
    if (o.frozen) d *= B.freezeTaken;
    if (o.shocked) d *= B.shockBonus;
    return cap(d);
  }
  // element weakness: is this skill's element one the region is weak to? (tier-9 skills carry every element)
  function regionOf(state) { return Math.max(0, Math.min(DATA.regions.length - 1, Math.floor(Math.max(0, state.stage || 0) / 31))); }
  function isWeak(skill, region) { var R = DATA.regions[region]; return !!(skill && R && R.weak && (skill.el === 'all' || R.weak.indexOf(skill.el) >= 0)); }
  // mana surge: the gauge fills with every cast; at full the cast is a surge. Returns true when this cast surges.
  function surgeTick(state, st) {
    var g = (state.surge || 0) + (st.surgeRate || 1);
    if (g >= DATA.surgeConf.charge) { state.surge = g - DATA.surgeConf.charge; return true; }
    state.surge = g; return false;
  }
  // the average boost a surge gives over many casts
  function surgeFactor(st) { return 1 + (st.surgeMul - 1) * Math.min(1, (st.surgeRate || 1) / DATA.surgeConf.charge); }
  function weakFactor(state, st, skill) { return isWeak(skill, regionOf(state)) ? st.weakMul : 1; }
  // tiers 1..7: crit, super, ultra, hyper, mega, ultimate, alpha
  function tierRates(st) { return [st.critRate || 0, st.superRate || 0, st.ultraRate || 0, st.hyperRate || 0, st.megaRate || 0, st.ultimateRate || 0, st.alphaRate || 0]; }
  function tierDmgs(st) { return [st.critDmg, st.superDmg || B.superDmg, st.ultraDmg || B.ultraDmg, st.hyperDmg || B.hyperDmg, st.megaDmg || B.megaDmg, st.ultimateDmg || B.ultimateDmg, st.alphaDmg || B.alphaDmg]; }
  // each tier is only rolled after the one below it hits
  function rollCrit(st, rng) {
    rng = rng || Math.random;
    var rates = tierRates(st), t = 0;
    while (t < rates.length && rng() < rates[t]) t++;
    return t;
  }
  // average damage factor from all crit tiers, from the top tier down
  function critFactor(st) {
    var r = tierRates(st), dm = tierDmgs(st), f = 1;
    for (var i = r.length - 1; i >= 0; i--) f = 1 + r[i] * (dm[i] * f - 1);
    return f;
  }
  function skillById(id) { for (var i = 0; i < DATA.skills.length; i++) if (DATA.skills[i].id === id) return DATA.skills[i]; return null; }
  // average damage per second against a crowd of up to 3 normal monsters
  function dps(state, st) {
    st = st || stats(state);
    var dmg = 0, time = 0;
    (state.slots || []).forEach(function (id) {
      var s = skillById(id); if (!s) return;
      dmg += hitDamage(st, s, {}) * Math.min(s.targets, 3) * critFactor(st) * surgeFactor(st) * weakFactor(state, st, s);
      time += (s.dur + B.gap) / st.speedMul;
    });
    return time > 0 ? cap(dmg / time) : 0;
  }
  // single-target damage per second, used against bosses
  function bossDps(state, st) {
    st = st || stats(state);
    var dmg = 0, time = 0;
    (state.slots || []).forEach(function (id) {
      var s = skillById(id); if (!s) return;
      dmg += hitDamage(st, s, { boss: true }) * critFactor(st) * surgeFactor(st) * weakFactor(state, st, s) * (s.status === 'freeze' || s.status === 'shock' ? 1.1 : 1);
      time += (s.dur + B.gap) / st.speedMul;
    });
    return time > 0 ? cap(dmg / time) : 0;
  }
  function killsPerSecond(state, st) { st = st || stats(state); return Math.max(0.02, Math.min(dps(state, st) / stageMonsterHp(state), 2.5)); }
  function goldPerSecond(state) {
    var st = stats(state);
    return cap(killsPerSecond(state, st) * stageGold(state, undefined, st.goldMul) * st.goldMul * B.killPay);
  }
  return {
    stageMonsterHp: stageMonsterHp, stageBossHp: stageBossHp, stageGold: stageGold, diffOf: diffOf,
    monsterHp: monsterHp, bossHp: bossHp, monsterGold: monsterGold, bossGems: bossGems,
    isWeak: isWeak, regionOf: regionOf, surgeTick: surgeTick, surgeFactor: surgeFactor, weakFactor: weakFactor, upgradeBonus: upgradeBonus, bonusBySource: bonusBySource, upgradeCostN: upgradeCostN, tryUpgradeN: tryUpgradeN, upgradeOpen: upgradeOpen, upgradeNeed: upgradeNeed, rollCrit: rollCrit, critFactor: critFactor, upgradeCost: upgradeCost, tryUpgrade: tryUpgrade, stats: stats, hitDamage: hitDamage,
    dps: dps, bossDps: bossDps, killsPerSecond: killsPerSecond, goldPerSecond: goldPerSecond, skillById: skillById,
    isRegionBoss: isRegionBoss, isMiniBoss: isMiniBoss
  };
});
