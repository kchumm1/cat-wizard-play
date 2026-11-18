// Sigils (신성력): gems with a grade, a quality (0~1) and one stat. Only the ones in the current equip set count.
// Bosses drop them, diamonds summon them; three of a grade fuse into the next grade; dismantling gives sigil stones
// that raise the sigil level (more slots and sigil damage).
// 각성 신성력 (2026-11-16): the options of 오메가·이터널·제네시스 (awaken) come from their own summon or from 각성 파편,
// are worn only in the two awakening slots (aw), grow gently with the grade and add at most critConf.caps.sigil to a tier.
// The other options keep their old numbers.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var C = DATA.sigilConf;
  function box(state) {
    if (!state.sigil) state.sigil = { items: [], seq: 0, sets: [[], [], []], cur: 0, lv: 0, stone: 0 };
    if (!Array.isArray(state.sigil.aw)) state.sigil.aw = [];
    while (state.sigil.aw.length < C.awakenSlots) state.sigil.aw.push(null);
    return state.sigil;
  }
  function sigilOpen(state) { return (state.tier || 1) >= C.unlockTier; }
  // 신성석 a boss gives (0 before 신성력 opens): + balance.runeStoneRegionStep a region, × the difficulty's gemMul
  function sigilStoneForBoss(state, regionBoss, stage) {
    if (!sigilOpen(state)) return 0;
    var D = DATA.difficulties && DATA.difficulties[state.diff || 0];
    var r = Math.floor(Math.max(0, stage === undefined ? state.stage || 0 : stage) / 31), k = (1 + (DATA.balance.runeStoneRegionStep || 0) * r) * ((D && D.gemMul) || 1);
    return Math.round((regionBoss ? C.regionStone : C.bossStone) * k);
  }
  function addSigilStone(state, n) { if (n > 0) box(state).stone += n; return n; }
  function sigilById(state, id) { var it = box(state).items; for (var i = 0; i < it.length; i++) if (it[i].id === id) return it[i]; return null; }
  function statDef(stat) { for (var i = 0; i < DATA.sigilStats.length; i++) if (DATA.sigilStats[i].stat === stat) return DATA.sigilStats[i]; return DATA.sigilStats[0]; }
  function isAwaken(it) { return !!(it && statDef(it.stat).awaken); }
  function equipped(state) { var b = box(state), set = b.sets[b.cur] || []; return set.filter(function (id) { var it = sigilById(state, id); return !!it && !isAwaken(it); }); }
  function awakened(state) { return box(state).aw.filter(function (id) { return !!id && !!sigilById(state, id); }); }
  function isEquipped(state, id) { var b = box(state); return b.sets.some(function (s) { return s.indexOf(id) >= 0; }) || b.aw.indexOf(id) >= 0; }
  function qualityName(q) { return q < 0.2 ? '최하급' : q < 0.4 ? '하급' : q < 0.6 ? '중급' : q < 0.85 ? '상급' : '최상급'; }
  // awakened options grow gently with the grade; every other option keeps the steep grade table
  function sigilValue(it) {
    var d = statDef(it.stat);
    if (d.awaken) { var cf = d.kind === 'rate' ? C.critRate : C.critDmg; return cf.base * (1 + cf.step * it.grade) * (0.85 + 0.15 * it.q); }
    return d.base * C.gradeMul[it.grade] * (0.4 + 0.6 * it.q);
  }
  function econ() { return isNode ? require('./economy.js') : root.CW; }
  function statOpen(state, d) { return d.crit === undefined || !econ().critTierOpen || econ().critTierOpen(state, d.crit); }
  // the bonus key an option adds to: an awakened damage option adds % (key + 'Pct')
  function outKey(d) { return d.awaken && d.kind === 'dmg' ? d.stat + 'Pct' : d.stat; }
  function capOf(d) { return DATA.critConf.caps.sigil[d.kind]; }
  // the options that can roll: open tiers only; awaken = the awakened family, else the usual one
  function pool(state, awaken) { return DATA.sigilStats.filter(function (d) { return !!d.awaken === !!awaken && statOpen(state, d); }); }
  function addSigil(state, grade, rng, awaken) {
    rng = rng || Math.random;
    var b = box(state); if (b.items.length >= C.cap) return null;
    var p = pool(state, awaken); if (!p.length) return null;
    var stat = p[Math.min(p.length - 1, Math.floor(rng() * p.length))].stat;
    var it = { id: 's' + (++b.seq), grade: Math.max(0, Math.min(C.gradeMul.length - 1, grade)), q: Math.max(0, Math.min(1, rng())), stat: stat, lock: false };
    b.items.push(it); return it;
  }
  function sigilSlots(state) { return Math.min(C.slotsMax, C.slotsBase + Math.floor(box(state).lv / C.slotsPer)); }
  // 한 종류에 하나 (2026-11-18, 형: 같은 종류를 끼고 있으면 등급·품질이 달라도 같은 종류는 아예 못 끼게): a list (the worn
  // set, or the awakening slots) holds at most one sigil of each option. The one already worn of that option, apart from
  // exceptId (the one being swapped out), or null.
  function sameWorn(state, list, stat, exceptId) {
    for (var i = 0; i < list.length; i++) { var x = list[i] && list[i] !== exceptId && sigilById(state, list[i]); if (x && x.stat === stat) return x; }
    return null;
  }
  // older saves could wear an option twice: the strongest stays, the rest are taken off (every preset and the awakening slots)
  function sigilDedupe(state) {
    var b = box(state), n = 0;
    var keep = function (list) {
      var best = {};
      list.forEach(function (id) { var it = id && sigilById(state, id); if (it && (!best[it.stat] || sigilValue(it) > sigilValue(best[it.stat]))) best[it.stat] = it; });
      return list.map(function (id) { var it = id && sigilById(state, id); if (it && best[it.stat] !== it) { n++; return null; } return id; });
    };
    b.sets = b.sets.map(function (s) { return keep(s).filter(Boolean); });
    b.aw = keep(b.aw);
    return n;
  }
  function sigilEquip(state, id) {
    var b = box(state), it = sigilById(state, id); if (!it || isEquipped(state, id) && (isAwaken(it) || b.sets[b.cur].indexOf(id) >= 0)) return false;
    if (sameWorn(state, isAwaken(it) ? b.aw : b.sets[b.cur], it.stat)) return false;   // that option is already worn: 교체 only
    if (isAwaken(it)) { var e = b.aw.indexOf(null); if (e < 0) return false; b.aw[e] = id; return true; }
    var set = b.sets[b.cur]; if (set.indexOf(id) >= 0) return false;
    if (equipped(state).length >= sigilSlots(state)) return false;
    set.push(id); return true;
  }
  function sigilUnequip(state, id) {
    var b = box(state), a = b.aw.indexOf(id); if (a >= 0) { b.aw[a] = null; return true; }
    var set = b.sets[b.cur], i = set.indexOf(id); if (i < 0) return false; set.splice(i, 1); return true;
  }
  function sigilSet(state, i) { var b = box(state); if (!(i >= 0 && i < b.sets.length)) return false; b.cur = i; return true; }
  function sigilLock(state, id) { var it = sigilById(state, id); if (!it) return false; it.lock = !it.lock; return true; }
  function remove(state, id) { var b = box(state); b.items = b.items.filter(function (x) { return x.id !== id; }); b.sets.forEach(function (s, i) { b.sets[i] = s.filter(function (x) { return x !== id; }); }); b.aw = b.aw.map(function (x) { return x === id ? null : x; }); }
  function free(state, it) { return it && !it.lock && !isEquipped(state, it.id); }
  function stonesOf(it) { return Math.round(C.stones[it.grade] * (0.5 + it.q)); }
  // 각성 파편: a free sigil of grade awakenFrom or higher also gives shards when it is taken apart
  function shardsOf(it) { return it.grade >= DATA.awakenConf.from ? DATA.awakenConf.shards[it.grade - DATA.awakenConf.from] : 0; }
  function sigilDismantle(state, id) {
    var it = sigilById(state, id); if (!free(state, it)) return 0;
    var n = stonesOf(it); remove(state, id); box(state).stone += n;
    var sh = shardsOf(it); if (sh) state.awakenShard = (state.awakenShard || 0) + sh;
    return n;
  }
  function sigilDismantleAll(state) {
    var n = 0; box(state).items.slice().forEach(function (it) { if (free(state, it)) n += sigilDismantle(state, it.id); });
    return n;
  }
  // the chosen one plus the two lowest-quality free ones of the same grade (and family) become one of the next grade
  function sigilFuse(state, id, rng) {
    var it = sigilById(state, id); if (!free(state, it) || it.grade >= C.gradeMul.length - 1) return null;
    var aw = isAwaken(it);
    var others = box(state).items.filter(function (x) { return x !== it && x.grade === it.grade && isAwaken(x) === aw && free(state, x); }).sort(function (a, c) { return a.q - c.q; }).slice(0, 2);
    if (others.length < 2) return null;
    // 천상·혼돈·멸망 may fail (DATA.fuseConf, js/runes.js fuseRoll): then the one it was started from stays, the other two go
    var roll = (isNode ? require('./runes.js') : root.CW).fuseRoll(state, 'sigil', it.grade + 1, rng);
    others.forEach(function (x) { remove(state, x.id); });
    if (!roll.ok) return { fail: true, kept: it, grade: it.grade + 1, rate: roll.rate, next: roll.next };
    remove(state, it.id);
    return addSigil(state, it.grade + 1, rng, aw);
  }
  function sigilLvCost(lv) { return Math.ceil(C.lvCostBase * Math.pow(C.lvCostGrowth, lv)); }
  function sigilLvUp(state) {
    var b = box(state); if (b.lv >= C.lvMax) return false;
    var c = sigilLvCost(b.lv); if (!(b.stone >= c)) return false;
    b.stone -= c; b.lv++; return true;
  }
  function rollGrade(table, rng) {
    var total = table.reduce(function (a, x) { return a + x; }, 0), r = rng() * total;
    for (var g = 0; g < table.length; g++) { if (r < table[g]) return g; r -= table[g]; }
    return 0;
  }
  function dropTable(state) { var i = Math.min(C.dropTable.length - 1, Math.floor(Math.max(0, state.best) / 80) + (state.diff || 0)); return C.dropTable[i]; }
  function sigilDrop(state, regionBoss, rng) {
    rng = rng || Math.random;
    if (!sigilOpen(state)) return [];
    var n = regionBoss ? C.regionDrops : (rng() < C.dropRate ? 1 : 0), out = [];
    for (var i = 0; i < n; i++) { var it = addSigil(state, rollGrade(dropTable(state), rng), rng); if (it) out.push(it); }
    return out;
  }
  // awaken: summon awakened sigils instead (only once 오메가 is open)
  // dust: pay with 신성력 가루 instead of diamonds (2026-11-17, not for awakened ones), the same price and odds
  function sigilSummon(state, n, rng, awaken, dust) {
    rng = rng || Math.random;
    var cur = dust && !awaken ? 'sigilDust' : 'gems', cost = C.summon[n]; if (!cost || !((state[cur] || 0) >= cost) || !sigilOpen(state)) return null;
    if (box(state).items.length + n > C.cap) return null;
    if (awaken && !pool(state, true).length) return null;
    state[cur] -= cost;
    var out = []; for (var i = 0; i < n; i++) out.push(addSigil(state, rollGrade(C.summonTable, rng), rng, awaken));
    return out;
  }
  // 각성 제작: shards make one awakened sigil of the chosen option at awakenConf.craftGrade
  function sigilCraft(state, stat) {
    var d = DATA.sigilStats.filter(function (x) { return x.stat === stat && x.awaken; })[0], A = DATA.awakenConf;
    if (!d || !statOpen(state, d) || (state.awakenShard || 0) < A.craftCost || box(state).items.length >= C.cap) return null;
    state.awakenShard -= A.craftCost;
    var b = box(state), it = { id: 's' + (++b.seq), grade: A.craftGrade, q: 0.5, stat: stat, lock: false };
    b.items.push(it); return it;
  }
  // strength without the stat: grade and quality (stats differ in units, so they are not compared)
  function power(it) { return C.gradeMul[it.grade] * (0.4 + 0.6 * it.q); }
  // the strongest by grade and quality (usual options of open tiers); the awakening slots get the strongest awakened
  // ones that still add something (critConf.caps.sigil)
  function sigilEquipBest(state) {
    var b = box(state), byPow = b.items.slice().sort(function (a, c) { return power(c) - power(a); });
    // one of each option (sameWorn): the strongest of an option, then the next options by strength
    var seen = {}, best = byPow.filter(function (it) { if (isAwaken(it) || !statOpen(state, statDef(it.stat)) || seen[it.stat]) return false; seen[it.stat] = 1; return true; }).slice(0, sigilSlots(state));
    b.sets[b.cur] = best.map(function (it) { return it.id; });
    var sum = {}, awSeen = {}, aw = byPow.filter(function (it) {
      var d = statDef(it.stat), k = outKey(d); if (!d.awaken || !statOpen(state, d) || awSeen[it.stat] || (sum[k] || 0) >= capOf(d) - 1e-12) return false;
      awSeen[it.stat] = 1; sum[k] = (sum[k] || 0) + sigilValue(it); return true;
    }).slice(0, C.awakenSlots);
    b.aw = aw.map(function (it) { return it.id; }); while (b.aw.length < C.awakenSlots) b.aw.push(null);
    return best.length;
  }
  // what a selected sigil stands against (2026-11-15): itself if worn; else the weakest worn one with the same stat; else,
  // when every slot is full, the weakest worn one (by grade and quality); else nothing (an empty slot is waiting).
  // An awakened one is compared inside the awakening slots.
  function sigilCompare(state, id) {
    var it = sigilById(state, id); if (!it) return null;
    var aw = isAwaken(it), worn = (aw ? awakened(state) : equipped(state)).map(function (x) { return sigilById(state, x); });
    var full = aw ? worn.length >= C.awakenSlots : worn.length >= sigilSlots(state);
    if (worn.indexOf(it) >= 0) return { mode: 'worn', target: null, full: full };
    var same = worn.filter(function (x) { return x.stat === it.stat; }).sort(function (a, c) { return sigilValue(a) - sigilValue(c); });
    if (same.length) return { mode: 'same', target: same[0], full: full };
    if (full) return { mode: 'weakest', target: worn.slice().sort(function (a, c) { return power(a) - power(c); })[0] || null, full: full };
    return { mode: 'free', target: null, full: full };
  }
  // the new one takes the old one's place in the worn list
  function sigilSwap(state, oldId, newId) {
    var b = box(state), nw = sigilById(state, newId); if (!nw || isEquipped(state, newId) && b.aw.indexOf(newId) >= 0) return false;
    if (sameWorn(state, isAwaken(nw) ? b.aw : b.sets[b.cur], nw.stat, oldId)) return false;   // would wear that option twice
    if (isAwaken(nw)) { var a = b.aw.indexOf(oldId); if (a < 0) return false; b.aw[a] = newId; return true; }
    var set = b.sets[b.cur], i = set.indexOf(oldId);
    if (i < 0 || set.indexOf(newId) >= 0) return false;
    set[i] = newId; return true;
  }
  function sigilStats(state) {
    var b = {}; if (!state.sigil) return b;
    equipped(state).forEach(function (id) { var it = sigilById(state, id), d = statDef(it.stat); if (statOpen(state, d)) b[d.stat] = (b[d.stat] || 0) + sigilValue(it); });
    var aw = {};
    awakened(state).forEach(function (id) { var it = sigilById(state, id), d = statDef(it.stat), k = outKey(d); if (d.awaken && statOpen(state, d)) aw[k] = Math.min(capOf(d), (aw[k] || 0) + sigilValue(it)); });
    for (var ck in aw) b[ck] = (b[ck] || 0) + aw[ck];
    if (state.sigil.lv) b.finalPct = (b.finalPct || 0) + state.sigil.lv * C.lvFinal;
    return b;
  }
  return { sigilOpen: sigilOpen, sigilStoneForBoss: sigilStoneForBoss, addSigilStone: addSigilStone, sigilById: sigilById, equipped: equipped, sigilAwakened: awakened, sigilIsAwaken: isAwaken, isEquipped: isEquipped, qualityName: qualityName, sigilValue: sigilValue, addSigil: addSigil,
    sigilSlots: sigilSlots, sigilEquip: sigilEquip, sigilSameWorn: sameWorn, sigilDedupe: sigilDedupe, sigilUnequip: sigilUnequip, sigilSet: sigilSet, sigilLock: sigilLock, sigilDismantle: sigilDismantle,
    sigilDismantleAll: sigilDismantleAll, sigilFuse: sigilFuse, sigilLvCost: sigilLvCost, sigilLvUp: sigilLvUp, sigilDrop: sigilDrop, sigilSummon: sigilSummon, sigilCraft: sigilCraft,
    sigilPool: pool, sigilShardsOf: shardsOf,
    sigilStats: sigilStats, sigilEquipBest: sigilEquipBest, sigilCompare: sigilCompare, sigilSwap: sigilSwap, sigilPower: power, sigilStatDef: statDef, sigilOutKey: outKey, sigilIcon: function (stat) { return statDef(stat).icon; } };
});
