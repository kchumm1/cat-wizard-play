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
  function bossHp(i) {
    var wall = (B.wallMul && B.wallMul[Math.floor(i / 31)]) || 1;
    // mini bosses carry part of the region wall, growing toward the region boss
    if (!isRegionBoss(i)) return cap(monsterHp(i) * B.bossMul * Math.pow(wall, (B.wallShare || 0) * ((i % 31 + 1) / 31)));
    return cap(monsterHp(i) * B.regionBossMul * wall);
  }
  function monsterGold(i) { return cap(B.goldBase * Math.pow(B.goldGrowth, i)); }
  // ---------- difficulty: each one continues the growth curve past 10-31 and multiplies bosses ----------
  var SPAN = 310;
  function diffOf(state) { return (DATA.difficulties && DATA.difficulties[state.diff || 0]) || { hpMul: 1, bossMul: 1, gemMul: 1, extraMobs: 0 }; }
  function stageMonsterHp(state, i) { i = i === undefined ? state.stage || 0 : i; return cap(monsterHp(i + SPAN * (state.diff || 0)) * diffOf(state).hpMul); }
  function stageBossHp(state, i) { i = i === undefined ? state.stage || 0 : i; return cap(bossHp(i) * Math.pow(B.hpGrowth, SPAN * (state.diff || 0)) * diffOf(state).bossMul); }
  function stageGold(state, i) { i = i === undefined ? state.stage || 0 : i; return cap(monsterGold(i + SPAN * (state.diff || 0))); }
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
  var BONUS_KEYS = ['chain2', 'chain3', 'finalPct', 'atk', 'atkPct', 'critRate', 'critDmg', 'goldMul', 'skillDmg', 'speed', 'bossDmg', 'normalDmg', 'xpMul', 'superRate', 'superDmg', 'ultraRate', 'ultraDmg', 'hyperRate', 'hyperDmg', 'megaRate', 'megaDmg', 'ultimateRate', 'ultimateDmg', 'alphaRate', 'alphaDmg', 'potion', 'potionGold', 'potionXp'];
  // every source of bonuses (gear, relics, costumes, star items, skill collection) adds into one object
  var SOURCES = [['gear', 'gearStats'], ['relics', 'relicStats'], ['costume', 'costumeStats'], ['divine', 'divineStats'], ['skills', 'skillOwnedStats'], ['training', 'trainingStats'], ['runes', 'runeStats'], ['sigil', 'sigilStats'], ['alchemy', 'alchemyStats']];
  function gearBonus(state) {
    var r = {}; BONUS_KEYS.forEach(function (k) { r[k] = 0; });
    SOURCES.forEach(function (src) {
      var m = dep(src[0]); if (!m || !m[src[1]]) return;
      var b = m[src[1]](state) || {};
      for (var k in b) if (r[k] !== undefined && isFinite(b[k])) r[k] += b[k];
    });
    return r;
  }
  function stats(state) {
    var u = state.up, gb = gearBonus(state);
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
      chain2Rate: Math.min(DATA.chainConf.max2, DATA.chainConf.base2 + gb.chain2),
      chain3Rate: Math.min(DATA.chainConf.max3, DATA.chainConf.base3 + gb.chain3),
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
  // chain casting: every cast is chain 1; chain 2 and then chain 3 may follow and multiply the whole cast
  function rollChain(st, rng) {
    rng = rng || Math.random;
    if (!(rng() < (st.chain2Rate || 0))) return 1;
    return rng() < (st.chain3Rate || 0) ? 3 : 2;
  }
  function chainMul(c) { return DATA.chainConf.mul[Math.max(1, Math.min(3, c)) - 1]; }
  function chainFactor(st) { var p2 = st.chain2Rate || 0, p3 = st.chain3Rate || 0; return (1 - p2) + p2 * ((1 - p3) * chainMul(2) + p3 * chainMul(3)); }
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
      dmg += hitDamage(st, s, {}) * Math.min(s.targets, 3) * critFactor(st) * chainFactor(st);
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
      dmg += hitDamage(st, s, { boss: true }) * critFactor(st) * chainFactor(st) * (s.status === 'freeze' || s.status === 'shock' ? 1.1 : 1);
      time += (s.dur + B.gap) / st.speedMul;
    });
    return time > 0 ? cap(dmg / time) : 0;
  }
  function killsPerSecond(state, st) { st = st || stats(state); return Math.max(0.02, Math.min(dps(state, st) / stageMonsterHp(state), 2.5)); }
  function goldPerSecond(state) {
    var st = stats(state);
    return cap(killsPerSecond(state, st) * stageGold(state) * st.goldMul);
  }
  return {
    stageMonsterHp: stageMonsterHp, stageBossHp: stageBossHp, stageGold: stageGold, diffOf: diffOf,
    monsterHp: monsterHp, bossHp: bossHp, monsterGold: monsterGold, bossGems: bossGems,
    rollChain: rollChain, chainMul: chainMul, chainFactor: chainFactor, upgradeCostN: upgradeCostN, tryUpgradeN: tryUpgradeN, upgradeOpen: upgradeOpen, upgradeNeed: upgradeNeed, rollCrit: rollCrit, critFactor: critFactor, upgradeCost: upgradeCost, tryUpgrade: tryUpgrade, stats: stats, hitDamage: hitDamage,
    dps: dps, bossDps: bossDps, killsPerSecond: killsPerSecond, goldPerSecond: goldPerSecond, skillById: skillById,
    isRegionBoss: isRegionBoss, isMiniBoss: isMiniBoss
  };
});
