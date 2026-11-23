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
  // raise (크리티컬 정비, 2026-11-16): how much stronger the same player got there with the ten crit tiers, per region
  // (일반: balance.wallRaise, harder difficulties: balance.diffWallBoost). Every boss of a region is raised — the mini bosses
  // going from the region before's raise to this one's along the region — so bosses stand to each other as before.
  function bossHp(i, walls, raise) {
    var W = walls || B.wallMul, r = Math.floor(i / 31), wall = (W && W[r]) || 1, f = (i % 31 + 1) / 31;
    var R = raise === undefined ? B.wallRaise : raise, up = (R && R[r]) || 1, prev = r > 0 ? (R && R[r - 1]) || 1 : (walls ? up : 1);
    // mini bosses carry part of the region wall, growing toward the region boss
    if (!isRegionBoss(i)) return cap(monsterHp(i) * B.bossMul * Math.pow(wall, (B.wallShare || 0) * f) * Math.pow(prev, 1 - f) * Math.pow(up, f));
    return cap(monsterHp(i) * B.regionBossMul * wall * up);
  }
  function monsterGold(i) { return cap(B.goldBase * Math.pow(B.goldGrowth, i)); }
  // ---------- difficulty: each one continues the growth curve past 10-31 and multiplies bosses ----------
  var SPAN = 310;
  function diffOf(state) { return (DATA.difficulties && DATA.difficulties[state.diff || 0]) || { hpMul: 1, bossMul: 1, gemMul: 1, extraMobs: 0 }; }
  // 체력 곡선 (2026-11-17, the user: 곡선 새로 짜): through 루나틱 every stage is × hpGrowth (1.12) as before, so one difficulty is
  // ~1e15 harder than the last — more than a player can grow from 어드밴스 on. From there each difficulty d has its own stage growth
  // (balance.diffGrowth[d]); the curve stays continuous, only gentler. curveMul = new health / the old one, for monsters and bosses.
  function curveMul(d, i) {
    var G = B.diffGrowth; if (!G || !d) return 1;
    var g0 = Math.log(B.hpGrowth), lg = 0;
    for (var k = 0; k < d; k++) lg += SPAN * Math.log(G[k] || B.hpGrowth);
    lg += i * Math.log(G[d] || B.hpGrowth);
    return Math.exp(lg - (SPAN * d + i) * g0);
  }
  // 체력 다시 맞추기 (2026-11-17 대미지 계산식 정비: 크리 합 방식·% 묶기·스킬·공격력): 바뀐 대미지에 맞춰 몬스터·보스 체력에
  // 진행 위치(난이도 × 310 + 스테이지)마다 10^(값) 을 곱함. balance.hpRescale = [[위치, log10], …] 를 이어서 그 사이는 매끄럽게
  // (tools/hp-rescale.cjs 가 옛 게임과 새 게임의 같은 플레이어 대미지를 비교해 정함). 없으면 1
  function hpRescale(d, i) {
    var R = B.hpRescale; if (!R || !R.length) return 1;
    var p = (d || 0) * SPAN + i, k = 0;
    if (p <= R[0][0]) return Math.pow(10, R[0][1]);
    while (k < R.length - 1 && R[k + 1][0] < p) k++;
    if (k === R.length - 1) return Math.pow(10, R[k][1]);
    var a = R[k], b = R[k + 1], t = (p - a[0]) / (b[0] - a[0]);
    return Math.pow(10, a[1] + (b[1] - a[1]) * t);
  }
  function stageMonsterHp(state, i) { i = i === undefined ? state.stage || 0 : i; return cap(monsterHp(i + SPAN * (state.diff || 0)) * diffOf(state).hpMul * curveMul(state.diff || 0, i) * hpRescale(state.diff, i)); }
  // diffWallBoost[d - 1][r] (2026-11-16, 크리티컬 정비): each harder difficulty's region walls are raised on their own, from
  // that difficulty's own simulated play (tools/crit-walls.cjs), not copied from 일반
  function stageBossHp(state, i) {
    i = i === undefined ? state.stage || 0 : i;
    var d = state.diff || 0, hp = d ? bossHp(i, B.diffWallMul, (B.diffWallBoost && B.diffWallBoost[d - 1]) || null) : bossHp(i);
    // 벽 고르게 (2026-11-17, 형: 지역마다 '조금 막힘 → 키우기 → 뚫음' 리듬이 일정하게): 일반 난이도 지역 보스에 10^(wallFix[지역])
    if (!d && isRegionBoss(i) && B.wallFix) hp *= Math.pow(10, B.wallFix[Math.floor(i / 31)] || 0);
    return cap(hp * Math.pow(B.hpGrowth, SPAN * d) * diffOf(state).bossMul * curveMul(d, i) * hpRescale(d, i));
  }
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
  // state (optional): past a row's max the price follows the player's attack price (2026-11-15, the user: those levels
  // read "1" — they cost almost nothing next to what one earns). Each level past the max costs OVER_PRICE of the next
  // attack level, growing OVER_GROW a level, so it always takes real gold.
  var OVER_PRICE = 0.2, OVER_GROW = 1.005;
  function atkPrice(state) { var u = DATA.upgrades.atk; return u.costBase * Math.pow(u.costGrowth, (state.up && state.up.atk) || 0); }
  function upgradeCost(key, level, state) {
    var u = DATA.upgrades[key], c = u.costBase * Math.pow(u.costGrowth, level);
    if (state && u.max !== null && level >= u.max) c = Math.max(c, atkPrice(state) * OVER_PRICE * Math.pow(OVER_GROW, level - u.max));
    return cap(Math.ceil(c));
  }
  function upgradeNeed(key) { var u = DATA.upgrades[key]; return u && u.need ? { key: u.need[0], lv: u.need[1] } : null; }
  // a crit tier is open once its rate row can be bought (치명타 always); runes, sigils and talents of a closed tier do not appear
  function critTierOpen(state, i) { return i === 0 || (!!TIERS[i] && upgradeOpen(state, TIERS[i].rateRow)); }
  function upgradeOpen(state, key) {
    var u = DATA.upgrades[key]; if (!u) return false;
    if (u.tier && (state.tier || 1) < u.tier) return false;
    if (u.diff && (state.diffUnlocked || 0) < u.diff) return false;
    return !u.need || ((state.up || {})[u.need[0]] || 0) >= u.need[1];
  }
  // 한계 돌파 (2026-11-15, the user: rows that stopped at '최대' keep going). A row's own effect (a rate, a damage line, a
  // 초월 bonus) stops at its max as before; every level past it adds OVER_PER (1%) to the damage the row is about —
  // added, not multiplied, so it can never outgrow attack (which multiplies) however far it goes. The cost keeps growing.
  var OVER_PER = 0.01;
  // which stat the levels past the max raise: a crit-rate row raises that crit's damage, speed raises all damage,
  // a 초월 row raises what it adds
  var OVER_TO = { speed: 'finalMul', crit: 'critDmg', criticalCrit: 'criticalDmg', criticalDmg: 'criticalDmg', superCrit: 'superDmg', ultraCrit: 'ultraDmg', hyperCrit: 'hyperDmg',
    megaCrit: 'megaDmg', megaDmg: 'megaDmg', ultimateCrit: 'ultimateDmg', ultimateDmg: 'ultimateDmg', alphaCrit: 'alphaDmg', alphaDmg: 'alphaDmg',
    superDmg: 'superDmg', ultraDmg: 'ultraDmg', hyperDmg: 'hyperDmg', omegaCrit: 'omegaDmg', omegaDmg: 'omegaDmg',
    eternalCrit: 'eternalDmg', eternalDmg: 'eternalDmg', genesisCrit: 'genesisDmg', genesisDmg: 'genesisDmg' };
  var ADD_TO = { superDmg: 'superDmg', hyperDmg: 'hyperDmg', megaDmg: 'megaDmg', ultimateDmg: 'ultimateDmg', alphaDmg: 'alphaDmg',
    bossDmg: 'bossDmg', finalPct: 'finalMul', skillDmg: 'skillDmg', weakDmg: 'weakMul', surgeDmg: 'surgeMul' };
  function overTarget(key) {
    var u = DATA.upgrades[key]; if (!u || u.max === null) return null;
    if (OVER_TO[key]) return OVER_TO[key];
    var a = u.adds && Object.keys(u.adds)[0]; return a && ADD_TO[a] || null;
  }
  function overLevels(state, key) { var u = DATA.upgrades[key], lv = (state.up || {})[key] || 0; return u && u.max !== null ? Math.max(0, lv - u.max) : 0; }
  function cappedLv(state, key) { var u = DATA.upgrades[key], lv = (state.up || {})[key] || 0; return u && u.max !== null ? Math.min(lv, u.max) : lv; }
  // total gold for the next n levels
  function upgradeCostN(state, key, n) {
    var lv = state.up[key] || 0, sum = 0;
    for (var i = 0; i < n; i++) sum += upgradeCost(key, lv + i, state);
    return cap(sum);
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
    if (u.max !== null && lv >= u.max && !overTarget(key)) return false;
    var c = upgradeCost(key, lv, state);
    if (!(c < CAP)) return false;
    if (!(state.gold >= c)) return false;
    state.gold = Math.max(0, state.gold - c);
    state.up[key] = lv + 1;
    return true;
  }
  var TIERS = DATA.critTiers, CC = DATA.critConf;
  var BONUS_KEYS = ['weakDmg', 'surgeDmg', 'surgeRate', 'finalPct', 'atk', 'atkPct', 'goldMul', 'skillDmg', 'speed', 'bossDmg', 'normalDmg', 'xpMul', 'potion', 'potionGold', 'potionXp'];
  // every crit tier: its rate, its '배' damage and its '%' damage (key + 'Pct')
  TIERS.forEach(function (t) { BONUS_KEYS.push(t.rate, t.dmg, t.dmg + 'Pct'); });
  // every source of bonuses (gear, relics, costumes, star items, skill collection) adds into one object
  var SOURCES = [['gear', 'gearStats'], ['relics', 'relicStats'], ['costume', 'costumeStats'], ['divine', 'divineStats'], ['skills', 'skillOwnedStats'], ['training', 'trainingStats'], ['runes', 'runeStats'], ['sigil', 'sigilStats'], ['alchemy', 'alchemyStats'], ['titles', 'titleStats'], ['dex', 'dexStats']];
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
      var a = DATA.upgrades[k].adds, lv = cappedLv(state, k); if (!a || !lv) return;
      for (var s in a) r[s] = (r[s] || 0) + a[s] * lv;
    });
    return r;
  }
  function stats(state) {
    // the rows' own effects use levels up to their max; what is past it is added at the end (한계 돌파)
    var u = {}; for (var uk in state.up) u[uk] = cappedLv(state, uk);
    var gb = gearBonus(state), ub = upgradeBonus(state);
    for (var bk in ub) if (gb[bk] !== undefined) gb[bk] += ub[bk];
    var atk = B.atkBase * (1 + u.atk * B.atkPerLevel) * Math.pow(B.atkCompound, u.atk);
    // 2026-11-17 (형: 같은 종류 %끼리 더하기): 공격력 + 와 공격력 % 는 한 묶음으로 더함 (예전엔 서로 곱함)
    atk = atk * (1 + gb.atk + gb.atkPct) * (1 + B.levelAtk * ((state.level || 1) - 1));
    var st = statsBase(state, u, gb, atk), over = {};
    Object.keys(DATA.upgrades).forEach(function (k) { var t = overTarget(k), n = overLevels(state, k); if (t && n) over[t] = (over[t] || 0) + n; });
    var TR = dep('training'), mo = TR && TR.markOver ? TR.markOver(state) : {};   // rate marks past the rank's cap
    for (var mk in mo) over[mk] = (over[mk] || 0) + mo[mk];
    for (var t in over) st[t] = cap(st[t] * (1 + OVER_PER * over[t]));
    // 펫의 힘 (2026-11-23, 형 결정: 따로 곱해): js/pets.js, multiplied apart in hitDamage like a potion so it never drowns
    // in the big added sums; the server wallet has no pets.js and stays at 1
    var PT = dep('pets'); st.petMul = PT && PT.petMul ? PT.petMul(state) : 1;
    // 업적 (2026-11-23, js/goals.js): 업적 배율은 모든 피해에, 골드·보스 피해는 그 값에 — 셋 다 따로 곱함 (형 결정 6-0). On the
    // server there is no goals.js (dep → null): 1
    var GL = dep('goals'), ab = GL && GL.achBonus ? GL.achBonus(state) : null;
    st.achMul = ab ? ab.mul : 1; if (ab) { st.goldMul *= ab.gold; st.bossDmg *= ab.boss; }
    return st;
  }
  // the stat bonus 한계 돌파 gives a row right now: { stat, pct } (for the 성장 list)
  function overInfo(state, key) { var t = overTarget(key), n = overLevels(state, key); return t ? { stat: t, levels: n, pct: n * OVER_PER } : null; }
  // the rate a tier gets from its 성장 row (before items)
  // RateBase: a tier that starts open (크리티컬 2026-11-17: 100%, so the tiers after it lose nothing)
  function rowRate(u, i) { var t = TIERS[i]; return i === 0 ? (u.crit || 0) * B.critPerLevel : (B[t.id + 'RateBase'] || 0) + (u[t.rateRow] || 0) * (B[t.id + 'PerLevel'] || 0); }
  function rowDmg(u, i) { var t = TIERS[i]; return i === 0 ? B.critDmgBase + (u.critDmg || 0) * B.critDmgPerLevel : B[t.dmg] + (u[t.dmgRow] || 0) * (DATA.upgrades[t.dmgRow].per || B.highDmgPerLevel); }
  // rates stop at 100%; each 1%p past it adds overPer% to that tier's damage (at most overMax). Damage = (base + '배'
  // bonuses) × (1 + '%' bonuses + that overflow). st[rate + 'Raw'] keeps the rate before the stop, st[dmg + 'Pct'] the % part.
  // a closed tier (체험판 keeps 오메가 levels from a loaded save, 2026-11-16) is not rolled at all
  function critBase(st, u, gb, state) {
    TIERS.forEach(function (t, i) {
      var raw = state && !critTierOpen(state, i) ? 0 : rowRate(u, i) + (gb[t.rate] || 0), over = Math.min(CC.overMax, Math.max(0, raw - 1) * CC.overPer);
      var pctAll = (gb[t.dmg + 'Pct'] || 0) + over;
      st[t.rate] = Math.max(0, Math.min(1, raw)); st[t.rate + 'Raw'] = raw;
      st[t.dmg + 'Add'] = rowDmg(u, i) + (gb[t.dmg] || 0); st[t.dmg + 'Pct'] = pctAll; st[t.dmg + 'Over'] = over;
      st[t.dmg] = st[t.dmg + 'Add'] * (1 + pctAll);
    });
    return st;
  }
  function statsBase(state, u, gb, atk) {
    return critBase({
      atk: cap(atk),
      speedMul: Math.min(2, 1 + u.speed * B.speedPerLevel + gb.speed),
      goldMul: (1 + u.gold * B.goldPerLevel + gb.goldMul) * (1 + gb.potionGold),
      mastery: 1 + u.mastery * B.masteryPerLevel,
      // 2026-11-17: 모든 공격이 스킬이라 스킬 피해와 모든 피해(finalPct)는 한 묶음으로 더함 — 물약만 따로 곱함
      skillDmg: 1 + gb.skillDmg + gb.finalPct,
      bossDmg: 1 + gb.bossDmg,
      normalDmg: 1 + gb.normalDmg,
      finalMul: 1 + gb.potion,
      weakMul: DATA.weakConf.mul * (1 + (gb.weakDmg || 0)),
      surgeMul: DATA.surgeConf.mul * (1 + (gb.surgeDmg || 0)),
      surgeRate: 1 + (gb.surgeRate || 0),
      xpMul: (1 + gb.xpMul) * (1 + gb.potionXp),
      skillLv: state.skillLv || {}
    }, u, gb, state);
  }
  function hitDamage(st, skill, o) {
    o = o || {};
    var d = st.atk * skill.mult * st.mastery * st.skillDmg * (1 + B.skillLvBonus * ((st.skillLv && st.skillLv[skill.id]) || 0));
    if (o.boss) d *= st.bossDmg; else d *= st.normalDmg || 1;
    d *= st.finalMul || 1;
    d *= st.petMul || 1;
    d *= st.achMul || 1;
    var ct = o.critTier !== undefined ? o.critTier : (o.crit ? 1 : 0), dm = tierDmgs(st);
    d *= critMul(dm, ct);   // o.even: 2026-11-17 부터 합 방식이라 고른 크리(눌러 펴기)가 필요 없어 같은 값
    if (o.frozen) d *= B.freezeTaken;
    if (o.shocked) d *= B.shockBonus;
    return cap(d);
  }
  // element weakness: is this skill's element one the region is weak to? (tier-9 skills carry every element)
  function regionOf(state) { return Math.max(0, Math.min(DATA.regions.length - 1, Math.floor(Math.max(0, state.stage || 0) / 31))); }
  // diff: the difficulty (its world's regions — 하늘 세계 2026-11-17); left out = the first world
  function regionsFor(diff) { var D = DATA.difficulties && DATA.difficulties[diff || 0]; return D && D.world === 1 && DATA.skyRegions ? DATA.skyRegions : DATA.regions; }
  function isWeak(skill, region, diff) { var R = regionsFor(diff)[region]; return !!(skill && R && R.weak && (skill.el === 'all' || R.weak.indexOf(skill.el) >= 0)); }
  // mana surge: the gauge fills with every cast; at full the cast is a surge. Returns true when this cast surges.
  function surgeTick(state, st) {
    var g = (state.surge || 0) + (st.surgeRate || 1);
    if (g >= DATA.surgeConf.charge) { state.surge = g - DATA.surgeConf.charge; return true; }
    state.surge = g; return false;
  }
  // the average boost a surge gives over many casts
  function surgeFactor(st) { return 1 + (st.surgeMul - 1) * Math.min(1, (st.surgeRate || 1) / DATA.surgeConf.charge); }
  function weakFactor(state, st, skill) { return isWeak(skill, regionOf(state), state.diff) ? st.weakMul : 1; }
  // tiers 1..11: crit, critical, super, ultra, hyper, mega, ultimate, alpha, omega, eternal, genesis
  function tierRates(st) { return TIERS.map(function (t) { return st[t.rate] || 0; }); }
  function tierDmgs(st) { return TIERS.map(function (t, i) { return st[t.dmg] || (i ? B[t.dmg] : B.critDmgBase); }); }
  // each tier is only rolled after the one below it hits
  function rollCrit(st, rng) {
    rng = rng || Math.random;
    var rates = tierRates(st), t = 0;
    while (t < rates.length && rng() < rates[t]) t++;
    return t;
  }
  // 크리 합 방식 (2026-11-17, 형: 크리를 터진 최고 단계 배율로 — 폭발하지 않게): 터진 단계들의 (배율 - 1) 을 더함.
  // 치명타 ×1.5 만 = ×1.5, 치명타 ×1.5 와 테라 ×3 = 1 + 0.5 + 2 = ×3.5 (예전엔 곱해서 ×4.5). 단계가 열릴 때마다 확실히 세지지만
  // 열 단계를 다 곱해 10^7 배가 되던 일은 없음. 아래 단계 배율을 키우면 그 위 단계가 터질 때도 같이 커짐.
  function critMul(dm, ct) { var m = 1; for (var t = 0; t < ct && t < dm.length; t++) m += dm[t] - 1; return m; }
  // average damage factor: each tier adds (its damage - 1) whenever it is reached (the chance of reaching it × that)
  function critFactor(st) {
    var r = tierRates(st), dm = tierDmgs(st), f = 1, pr = 1;
    for (var i = 0; i < r.length; i++) { pr *= r[i]; if (!pr) break; f += pr * (dm[i] - 1); }
    return f;
  }
  // 고른 크리 (2026-11-15) 는 곱 방식의 큰 들쭉날쭉을 펴던 것 — 합 방식에서는 한 방의 차이가 작아 그대로 씀
  function evenCrit(st, ct) { return critMul(tierDmgs(st), Math.max(0, Math.min(TIERS.length, ct | 0))); }
  // The boss damage a usual fight really deals per second (the middle of 151 fights of `secs` seconds, the same random
  // numbers every time so the stats window does not flicker). One crit roll a cast — a skill split in pieces rolls
  // each piece, which lands a little closer to the average, so this errs low.
  function bossDpsTypical(state, st, secs) {
    st = st || stats(state); secs = secs || 30;
    var list = (state.slots || []).map(skillById).filter(Boolean); if (!list.length) return 0;
    var base = list.map(function (s) { return hitDamage(st, s, { boss: true }) * weakFactor(state, st, s) * (s.status === 'freeze' || s.status === 'shock' ? 1.1 : 1); });
    var dur = list.map(function (s) { return (s.dur + B.gap) / st.speedMul; });
    var seed = 12345, rng = function () { seed = (seed + 0x6D2B79F5) | 0; var x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    var charge = DATA.surgeConf.charge, out = [];
    for (var f = 0; f < 151; f++) {
      var t = 0, dmg = 0, i = Math.floor(rng() * list.length), g = rng() * charge;
      while (t < secs) {
        var k = i % list.length, mul = 1; g += st.surgeRate || 1;
        if (g >= charge) { g -= charge; mul = st.surgeMul; }
        dmg += base[k] * mul * evenCrit(st, rollCrit(st, rng)); t += dur[k]; i++;
      }
      out.push(dmg / secs);
    }
    out.sort(function (a, b) { return a - b; });
    return cap(out[75]);
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
  // ---------- gold read in Korean units, at most 9999경 (2026-11-15 9999조, 2026-11-16 the user: 9999경까지) ----------
  // The game's gold grows ×1.2 a stage, so by 엘리멘탈 it is 10^120 and more. What the player sees and holds is that gold
  // divided by goldScale. Rewards and every price are divided by the same number, so what a reward buys is exactly as
  // before; only the numbers are smaller. Holdings stop at 9999경.
  var GOLD_MAX = 9999e16;
  // the scale still moves when the attack price would pass 999조 (a tenth of the old 9999조 cap), so prices read as before
  var PRICE_MAX = 9999e11;
  function progressIndex(state) {
    var p = Math.max(0, (state.diff || 0) * SPAN + (state.best === undefined ? -1 : state.best)), db = state.diffBest || {};
    Object.keys(db).forEach(function (d) { var b = db[d] && db[d].best; if (typeof b === 'number') p = Math.max(p, d * SPAN + b); });
    return p;
  }
  // v2 (2026-11-15, the user: 골드 버는 게 너무 약하다 — a kill read "+58"): the scale follows the player's own attack
  // price, not the frontier monster's gold. On a harder difficulty a monster pays a share of the attack price, far
  // below the frontier monster's gold, so the old scale made every number tiny. Now each time a new stage is reached the
  // scale is set so the next attack level reads about 10^atkShownLog(p): 1조 early (no scale while it is cheaper), 100조 at
  // the end.
  // Between records it only grows, and only when that price would pass a tenth of the cap.
  // end = the last stage of the first world's five difficulties (하늘 세계 2026-11-17: the sky world stays at 100조, so the
  // numbers a player sees do not move when the five sky difficulties are added)
  var SHOWN_DIFFS = 5;
  function atkShownLog(p) { var end = SPAN * SHOWN_DIFFS - 1; return 12 + 2 * Math.min(1, p / end); }
  function goldScale(state) {
    var p = progressIndex(state), price = atkPrice(state);
    if (state.goldScaleP !== p || !(state.goldScale2 > 0)) { state.goldScale2 = Math.max(1, price / Math.pow(10, atkShownLog(p))); state.goldScaleP = p; }
    var d = Math.max(state.goldScale2, price / PRICE_MAX);
    if (!(d < CAP)) d = CAP;
    state.goldScale2 = d;
    return d;
  }
  // keeps holdings under 9999경 (as shown); returns the scale
  function capGold(state) {
    var d = goldScale(state);
    if (state.gold > GOLD_MAX * d) state.gold = GOLD_MAX * d;
    return d;
  }
  function goldPerSecond(state) {
    var st = stats(state);
    return cap(killsPerSecond(state, st) * stageGold(state, undefined, st.goldMul) * st.goldMul * B.killPay);
  }
  return {
    stageMonsterHp: stageMonsterHp, stageBossHp: stageBossHp, curveMul: curveMul, stageGold: stageGold, diffOf: diffOf,
    monsterHp: monsterHp, bossHp: bossHp, monsterGold: monsterGold, bossGems: bossGems,
    hpRescale: hpRescale, critTierOpen: critTierOpen, tierRates: tierRates, tierDmgs: tierDmgs,
    isWeak: isWeak, regionOf: regionOf, surgeTick: surgeTick, surgeFactor: surgeFactor, weakFactor: weakFactor, upgradeBonus: upgradeBonus, bonusBySource: bonusBySource, upgradeCostN: upgradeCostN, tryUpgradeN: tryUpgradeN, upgradeOpen: upgradeOpen, upgradeNeed: upgradeNeed, rollCrit: rollCrit, critFactor: critFactor, upgradeCost: upgradeCost, tryUpgrade: tryUpgrade, stats: stats, overInfo: overInfo, hitDamage: hitDamage,
    atkPrice: atkPrice, progressIndex: progressIndex, goldScale: goldScale, capGold: capGold, GOLD_MAX: GOLD_MAX, dps: dps, bossDps: bossDps, bossDpsTypical: bossDpsTypical, evenCrit: evenCrit, killsPerSecond: killsPerSecond, goldPerSecond: goldPerSecond, skillById: skillById,
    isRegionBoss: isRegionBoss, isMiniBoss: isMiniBoss
  };
});
