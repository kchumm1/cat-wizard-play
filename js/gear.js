// Gear bag: items stack by kind + grade + I~IV tier (t = grade * 4 + sub). Every owned item gives an
// owned effect (a share of its stat), the worn one of each kind gives its full effect and its potential.
// Three copies merge into one of the next tier; levels are bought with gold.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var B = DATA.balance, BG = DATA.bagConf;
  var ROMAN = ['I', 'II', 'III', 'IV'];

  function tierCount() { return DATA.grades.length * 4; }
  function keyOf(kind, t) { return kind + ':' + t; }
  function parseKey(k) { var p = String(k).split(':'), t = +p[1]; return { kind: p[0], t: t, grade: Math.floor(t / 4), sub: t % 4 }; }
  function validKey(k) { var p = parseKey(k); return DATA.kinds.indexOf(p.kind) >= 0 && p.t >= 0 && p.t < tierCount() && Math.floor(p.t) === p.t; }
  function roman(sub) { return ROMAN[sub]; }
  function gearName(k) { var p = parseKey(k); return DATA.grades[p.grade].name + ' ' + ROMAN[p.sub] + ' ' + DATA.kindName[p.kind]; }
  function bag(state) { if (!state.bag) state.bag = {}; return state.bag; }
  function addItem(state, kind, t, n) {
    var k = keyOf(kind, t), b = bag(state);
    if (!b[k]) b[k] = { n: 0, lv: 0 };
    b[k].n += n === undefined ? 1 : n;
    return k;
  }
  function owned(state, k) { return !!(state.bag && state.bag[k] && validKey(k)); }
  function bagCount(state, k) { return state.bag && state.bag[k] ? state.bag[k].n : 0; }
  function bagLevel(state, k) { return state.bag && state.bag[k] ? state.bag[k].lv : 0; }

  function tierMul(t) { return DATA.grades[Math.floor(t / 4)].mainMul * Math.pow(BG.subMul, t % 4); }
  function mainValue(kind, t, lv, star) { return B.gearMainBase[DATA.kindStat[kind]] * tierMul(t) * (1 + (lv || 0) * BG.lvPer) * (1 + (star || 0) * BG.starMul); }
  function ownedValue(kind, t, lv, star) { return mainValue(kind, t, lv, star) * BG.ownedFrac; }
  // each transcend star lets the item level further
  function maxLevel(k, star) { return BG.maxLvBase * (parseKey(k).grade + 1) + (star || 0) * BG.starLv; }
  function levelCost(k, lv) { return BG.lvCostBase * Math.pow(BG.lvCostGrowth, lv) * (1 + parseKey(k).t * BG.lvCostTier); }
  function levelUp(state, k) {
    if (!owned(state, k)) return false;
    var e = state.bag[k]; if (e.lv >= maxLevel(k, e.star)) return false;
    var c = levelCost(k, e.lv); if (!(state.gold >= c)) return false;
    state.gold = Math.max(0, state.gold - c); e.lv++; return true;
  }
  function merge(state, k) {
    if (!owned(state, k)) return false;
    var p = parseKey(k), e = state.bag[k];
    if (p.t >= tierCount() - 1 || e.n < BG.mergeCount) return false;
    e.n -= BG.mergeCount; addItem(state, p.kind, p.t + 1, 1); return true;
  }
  function mergeAll(state) {
    var made = 0;
    for (var t = 0; t < tierCount() - 1; t++) DATA.kinds.forEach(function (kind) { var k = keyOf(kind, t); while (merge(state, k)) made++; });
    return made;
  }
  // transcend: at max level, use copies of the same item (and gold) for one more star
  function transcendCost(state, k) {
    var e = state.bag && state.bag[k], st = e ? e.star || 0 : 0;
    return { copies: st + 1, gold: levelCost(k, maxLevel(k, st)) * BG.starGold };
  }
  function transcend(state, k) {
    if (!owned(state, k)) return false;
    var e = state.bag[k], st = e.star || 0;
    if (st >= BG.starMax || e.lv < maxLevel(k, st)) return false;
    var c = transcendCost(state, k);
    if (e.n < c.copies + 1 || !(state.gold >= c.gold)) return false;
    e.n -= c.copies; state.gold = Math.max(0, state.gold - c.gold); e.star = st + 1; return true;
  }
  function gearStars(state) { var b = state.bag || {}, n = 0; for (var k in b) if (validKey(k)) n += b[k].star || 0; return n; }
  function equip(state, k) { if (!owned(state, k)) return false; state.equip[parseKey(k).kind] = k; return true; }
  function unequip(state, kind) { state.equip[kind] = null; }
  function bestKey(state, kind) { for (var t = tierCount() - 1; t >= 0; t--) if (owned(state, keyOf(kind, t))) return keyOf(kind, t); return null; }
  function equipBest(state) { DATA.kinds.forEach(function (kind) { state.equip[kind] = bestKey(state, kind); }); }

  // potential lines can be locked (2026-11-14): a roll keeps the locked lines and redraws the rest; each lock adds the base cost,
  // and at least one line always stays open
  function locks(e) { return ((e && e.pot) || []).filter(function (pl) { return pl.lock; }).length; }
  function potCost(state, k) { return DATA.potConf.cost * (1 + locks(state.bag && state.bag[k])); }
  function potLock(state, k, i) {
    var e = owned(state, k) && state.bag[k], pl = e && e.pot && e.pot[i]; if (!pl) return false;
    if (!pl.lock && locks(e) >= e.pot.length - 1) return false;
    pl.lock = !pl.lock; return true;
  }
  function rollPotential(state, k, rng) {
    rng = rng || Math.random;
    var P = DATA.potConf;
    if (!owned(state, k)) return false;
    var cost = potCost(state, k); if (!(state.gems >= cost)) return false;
    state.gems -= cost;
    var e = state.bag[k], g = parseKey(k).grade, old = e.pot || []; e.pot = [];
    for (var i = 0; i < P.lines; i++) {
      if (old[i] && old[i].lock) { e.pot.push(old[i]); continue; }
      var sp = P.stats[Math.min(P.stats.length - 1, Math.floor(rng() * P.stats.length))], q = rng();
      e.pot.push({ stat: sp.stat, val: (sp.min + q * (sp.max - sp.min)) * (1 + g * P.gradeMul), q: q });
    }
    return true;
  }
  // every owned item counts: its level plus points for its tier
  function gearTotalLevel(state) {
    var b = state.bag || {}, t = 0;
    for (var k in b) if (validKey(k)) t += b[k].lv + (parseKey(k).t + 1) * BG.tierPoints;
    return t;
  }
  function addStat(r, stat, v) { if (stat === 'speedBoss') { r.speed += v; r.bossDmg += v * 8; } else r[stat] = (r[stat] || 0) + v; }
  function gearStats(state) {
    var r = { atk: 0, atkPct: 0, critRate: 0, critDmg: 0, goldMul: 0, skillDmg: 0, speed: 0, bossDmg: 0, superRate: 0, weakDmg: 0, finalPct: 0 };
    var b = state.bag || {}, eq = state.equip || {};
    for (var k in b) { if (!validKey(k)) continue; var p = parseKey(k); addStat(r, DATA.kindStat[p.kind], ownedValue(p.kind, p.t, b[k].lv, b[k].star)); }
    DATA.kinds.forEach(function (kind) {
      var k2 = eq[kind]; if (!k2 || !b[k2] || !validKey(k2)) return;
      var q = parseKey(k2); addStat(r, DATA.kindStat[q.kind], mainValue(q.kind, q.t, b[k2].lv, b[k2].star));
      (b[k2].pot || []).forEach(function (pl) { if (r[pl.stat] !== undefined) r[pl.stat] += pl.val; });
    });
    r.atkPct += gearTotalLevel(state) * DATA.gearCodex.per;
    r.finalPct += gearStars(state) * BG.starFinal;
    return r;
  }
  // old saves had one entry per item with a uid; move them into the bag
  function migrateBag(state) {
    var inv = state.inv || [], eq = state.equip || {}, byUid = {};
    inv.forEach(function (it) {
      if (DATA.kinds.indexOf(it.kind) < 0) return;
      var k = addItem(state, it.kind, Math.max(0, Math.min(tierCount() - 1, (it.grade || 0) * 4)), 1), e = state.bag[k];
      e.lv = Math.min(maxLevel(k), Math.max(e.lv, Math.round((it.lv || 0) * B.gearLevelPerLv / BG.lvPer)));
      if (it.pot && !e.pot) e.pot = it.pot;
      byUid[it.uid] = k;
    });
    var old = { ear: ['ear1', 'ear2'], ring: ['ring1', 'ring2'] }, next = {};
    DATA.kinds.forEach(function (kind) {
      var cand = (old[kind] ? old[kind].map(function (s) { return eq[s]; }) : []).concat([eq[kind]]);
      var k = null; cand.forEach(function (v) { if (!v) return; var mk = byUid[v] || (validKey(v) && state.bag && state.bag[v] ? v : null); if (mk && (!k || parseKey(mk).t > parseKey(k).t)) k = mk; });
      next[kind] = k;
    });
    state.equip = next; state.inv = []; delete state.codex;
    return state;
  }
  function gearCodexSync() {}
  return { tierCount: tierCount, keyOf: keyOf, parseKey: parseKey, validKey: validKey, roman: roman, gearName: gearName, addItem: addItem, owned: owned, bagCount: bagCount, bagLevel: bagLevel,
    tierMul: tierMul, mainValue: mainValue, ownedValue: ownedValue, maxLevel: maxLevel, levelCost: levelCost, levelUp: levelUp, merge: merge, mergeAll: mergeAll,
    transcendCost: transcendCost, transcend: transcend, gearStars: gearStars, equip: equip, unequip: unequip, bestKey: bestKey, equipBest: equipBest, rollPotential: rollPotential, potCost: potCost, potLock: potLock, gearTotalLevel: gearTotalLevel, gearStats: gearStats, migrateBag: migrateBag, gearCodexSync: gearCodexSync };
});
