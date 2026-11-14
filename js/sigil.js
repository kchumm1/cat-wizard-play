// Sigils (신성력): gems with a grade, a quality (0~1) and one stat. Only the ones in the current equip set count.
// Bosses drop them, diamonds summon them; three of a grade fuse into the next grade; dismantling gives sigil stones
// that raise the sigil level (more slots and sigil damage).
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var C = DATA.sigilConf;
  function box(state) {
    if (!state.sigil) state.sigil = { items: [], seq: 0, sets: [[], [], []], cur: 0, lv: 0, stone: 0 };
    return state.sigil;
  }
  function sigilOpen(state) { return (state.tier || 1) >= C.unlockTier; }
  function sigilById(state, id) { var it = box(state).items; for (var i = 0; i < it.length; i++) if (it[i].id === id) return it[i]; return null; }
  function equipped(state) { var b = box(state), set = b.sets[b.cur] || []; return set.filter(function (id) { return !!sigilById(state, id); }); }
  function isEquipped(state, id) { var b = box(state); return b.sets.some(function (s) { return s.indexOf(id) >= 0; }); }
  function qualityName(q) { return q < 0.2 ? '최하급' : q < 0.4 ? '하급' : q < 0.6 ? '중급' : q < 0.85 ? '상급' : '최상급'; }
  function statDef(stat) { for (var i = 0; i < DATA.sigilStats.length; i++) if (DATA.sigilStats[i].stat === stat) return DATA.sigilStats[i]; return DATA.sigilStats[0]; }
  function sigilValue(it) { return statDef(it.stat).base * C.gradeMul[it.grade] * (0.4 + 0.6 * it.q); }
  function addSigil(state, grade, rng) {
    rng = rng || Math.random;
    var b = box(state); if (b.items.length >= C.cap) return null;
    var pool = DATA.sigilStats, stat = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))].stat;
    var it = { id: 's' + (++b.seq), grade: Math.max(0, Math.min(C.gradeMul.length - 1, grade)), q: Math.max(0, Math.min(1, rng())), stat: stat, lock: false };
    b.items.push(it); return it;
  }
  function sigilSlots(state) { return Math.min(C.slotsMax, C.slotsBase + Math.floor(box(state).lv / C.slotsPer)); }
  function sigilEquip(state, id) {
    var b = box(state), set = b.sets[b.cur]; if (!sigilById(state, id) || set.indexOf(id) >= 0) return false;
    if (equipped(state).length >= sigilSlots(state)) return false;
    set.push(id); return true;
  }
  function sigilUnequip(state, id) { var b = box(state), set = b.sets[b.cur], i = set.indexOf(id); if (i < 0) return false; set.splice(i, 1); return true; }
  function sigilSet(state, i) { var b = box(state); if (!(i >= 0 && i < b.sets.length)) return false; b.cur = i; return true; }
  function sigilLock(state, id) { var it = sigilById(state, id); if (!it) return false; it.lock = !it.lock; return true; }
  function remove(state, id) { var b = box(state); b.items = b.items.filter(function (x) { return x.id !== id; }); b.sets.forEach(function (s, i) { b.sets[i] = s.filter(function (x) { return x !== id; }); }); }
  function free(state, it) { return it && !it.lock && !isEquipped(state, it.id); }
  function stonesOf(it) { return Math.round(C.stones[it.grade] * (0.5 + it.q)); }
  function sigilDismantle(state, id) {
    var it = sigilById(state, id); if (!free(state, it)) return 0;
    var n = stonesOf(it); remove(state, id); box(state).stone += n; return n;
  }
  function sigilDismantleAll(state) {
    var n = 0; box(state).items.slice().forEach(function (it) { if (free(state, it)) n += sigilDismantle(state, it.id); });
    return n;
  }
  // the chosen one plus the two lowest-quality free ones of the same grade become one of the next grade
  function sigilFuse(state, id, rng) {
    var it = sigilById(state, id); if (!free(state, it) || it.grade >= C.gradeMul.length - 1) return null;
    var others = box(state).items.filter(function (x) { return x !== it && x.grade === it.grade && free(state, x); }).sort(function (a, c) { return a.q - c.q; }).slice(0, 2);
    if (others.length < 2) return null;
    remove(state, it.id); others.forEach(function (x) { remove(state, x.id); });
    return addSigil(state, it.grade + 1, rng);
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
  function sigilSummon(state, n, rng) {
    rng = rng || Math.random;
    var cost = C.summon[n]; if (!cost || !(state.gems >= cost) || !sigilOpen(state)) return null;
    if (box(state).items.length + n > C.cap) return null;
    state.gems -= cost;
    var out = []; for (var i = 0; i < n; i++) out.push(addSigil(state, rollGrade(C.summonTable, rng), rng));
    return out;
  }
  // strength without the stat: grade and quality (stats differ in units, so they are not compared)
  function power(it) { return C.gradeMul[it.grade] * (0.4 + 0.6 * it.q); }
  function sigilEquipBest(state) {
    var b = box(state), best = b.items.slice().sort(function (a, c) { return power(c) - power(a); }).slice(0, sigilSlots(state));
    b.sets[b.cur] = best.map(function (it) { return it.id; });
    return best.length;
  }
  // what a selected sigil stands against (2026-11-15): itself if worn; else the weakest worn one with the same stat; else,
  // when every slot is full, the weakest worn one (by grade and quality); else nothing (an empty slot is waiting)
  function sigilCompare(state, id) {
    var it = sigilById(state, id); if (!it) return null;
    var worn = equipped(state).map(function (x) { return sigilById(state, x); }), full = worn.length >= sigilSlots(state);
    if (worn.indexOf(it) >= 0) return { mode: 'worn', target: null, full: full };
    var same = worn.filter(function (x) { return x.stat === it.stat; }).sort(function (a, c) { return sigilValue(a) - sigilValue(c); });
    if (same.length) return { mode: 'same', target: same[0], full: full };
    if (full) return { mode: 'weakest', target: worn.slice().sort(function (a, c) { return power(a) - power(c); })[0] || null, full: full };
    return { mode: 'free', target: null, full: full };
  }
  // the new one takes the old one's place in the worn list
  function sigilSwap(state, oldId, newId) {
    var b = box(state), set = b.sets[b.cur], i = set.indexOf(oldId);
    if (i < 0 || !sigilById(state, newId) || set.indexOf(newId) >= 0) return false;
    set[i] = newId; return true;
  }
  function sigilStats(state) {
    var b = {}; if (!state.sigil) return b;
    equipped(state).forEach(function (id) { var it = sigilById(state, id); b[it.stat] = (b[it.stat] || 0) + sigilValue(it); });
    if (state.sigil.lv) b.finalPct = (b.finalPct || 0) + state.sigil.lv * C.lvFinal;
    return b;
  }
  return { sigilOpen: sigilOpen, sigilById: sigilById, equipped: equipped, isEquipped: isEquipped, qualityName: qualityName, sigilValue: sigilValue, addSigil: addSigil,
    sigilSlots: sigilSlots, sigilEquip: sigilEquip, sigilUnequip: sigilUnequip, sigilSet: sigilSet, sigilLock: sigilLock, sigilDismantle: sigilDismantle,
    sigilDismantleAll: sigilDismantleAll, sigilFuse: sigilFuse, sigilLvCost: sigilLvCost, sigilLvUp: sigilLvUp, sigilDrop: sigilDrop, sigilSummon: sigilSummon,
    sigilStats: sigilStats, sigilEquipBest: sigilEquipBest, sigilCompare: sigilCompare, sigilSwap: sigilSwap, sigilPower: power, sigilIcon: function (stat) { return statDef(stat).icon; } };
});
