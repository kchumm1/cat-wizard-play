// Runes (2026-11-14): rune items. Bosses drop them, the rune temple and diamond summons give them; seven can be worn.
// Each rune has a kind (its stat), a grade (일반 → 멸망) and a level raised with rune stones; the grade caps the level and
// promoting at the cap costs rune stones. Three free runes of one kind and grade fuse into one of the next grade.
// Resonance: every resEvery levels of the LOWEST worn rune adds to all damage (empty slots are not counted).
// A save from before (state.runes / state.runeGrade) becomes six items with the same levels and grades, worn in slots 1-6.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var C = DATA.runeConf, TOP = DATA.hiGrades.length - 1, OLD = ['rFire', 'rWave', 'rWind', 'rEarth', 'rLight', 'rDark'];
  function runeById(id) { for (var i = 0; i < DATA.runes.length; i++) if (DATA.runes[i].id === id) return DATA.runes[i]; return null; }
  function runeOpen(state) { return (state.tier || 1) >= C.unlockTier; }
  // aw: the awakening slots (2026-11-16) — only 각성 runes (오메가·이터널·제네시스) go there, and only there
  function runeBag(state) {
    if (state.runeBag && Array.isArray(state.runeBag.items)) {
      var b = state.runeBag; if (!Array.isArray(b.eq)) b.eq = []; if (!Array.isArray(b.aw)) b.aw = [];
      while (b.eq.length < C.slots) b.eq.push(null);
      while (b.aw.length < C.awakenSlots) b.aw.push(null);
      return b;
    }
    var bag = { items: [], seq: 0, eq: [], aw: [] }, lv = state.runes || {}, gr = state.runeGrade || {};
    OLD.forEach(function (k) {
      var it = { id: 'u' + (++bag.seq), kind: k, grade: Math.max(0, Math.min(TOP, gr[k] || 0)), lv: Math.max(0, lv[k] || 0), lock: false };
      bag.items.push(it); bag.eq.push(it.id);
    });
    while (bag.eq.length < C.slots) bag.eq.push(null);
    while (bag.aw.length < C.awakenSlots) bag.aw.push(null);
    state.runeBag = bag; return bag;
  }
  function runeItem(state, id) { var it = runeBag(state).items; for (var i = 0; i < it.length; i++) if (it[i].id === id) return it[i]; return null; }
  function isAwaken(it) { var k = it && runeById(it.kind); return !!(k && k.awaken); }
  // the slot list an item belongs to
  function slotsOf(state, it) { var b = runeBag(state); return isAwaken(it) ? b.aw : b.eq; }
  function isWorn(state, id) { var b = runeBag(state); return b.eq.indexOf(id) >= 0 || b.aw.indexOf(id) >= 0; }
  // the seven usual slots (resonance counts these)
  function runeEquipped(state) { return runeBag(state).eq.map(function (id) { return id && runeItem(state, id); }).filter(Boolean); }
  function runeAwakened(state) { return runeBag(state).aw.map(function (id) { return id && runeItem(state, id); }).filter(Boolean); }
  function runeCap(it) { return C.lvPerGrade * (it.grade + 1); }
  function runeCost(lv) { return Math.ceil(C.costBase * Math.pow(C.costGrowth, lv)); }
  function runeGradeCost(g) { return Math.ceil(C.gradeCostBase * Math.pow(C.gradeCostGrowth, g)); }
  function runeValue(it) { var k = runeById(it.kind); return k ? it.lv * k.per * (1 + it.grade * C.gradeStep) : 0; }
  // strength in 'effective levels' (the effect divided by the kind's per-level value), comparable across kinds; grade breaks ties
  function runePower(it) { return it.lv * (1 + it.grade * C.gradeStep) + it.grade * 1e-3; }
  function runeAdd(state, kind, grade) {
    var b = runeBag(state); if (b.items.length >= C.cap || !runeById(kind)) return null;
    var it = { id: 'u' + (++b.seq), kind: kind, grade: Math.max(0, Math.min(TOP, grade || 0)), lv: 0, lock: false };
    b.items.push(it); return it;
  }
  function runeEquip(state, id, slot) {
    var it = runeItem(state, id); if (!it || isWorn(state, id)) return false;
    var list = slotsOf(state, it);
    if (slot === undefined || slot === null) slot = list.indexOf(null);
    if (!(slot >= 0 && slot < list.length)) return false;
    list[slot] = id; return true;
  }
  function runeUnequip(state, id) {
    var b = runeBag(state), i = b.eq.indexOf(id); if (i >= 0) { b.eq[i] = null; return true; }
    i = b.aw.indexOf(id); if (i >= 0) { b.aw[i] = null; return true; } return false;
  }
  // a crit rune does nothing until its crit tier is open in growth (economy.critTierOpen); an awakened one also does
  // nothing more once the awakened runes worn give its tier the most they can (critConf.caps.rune)
  function econ() { return isNode ? require('./economy.js') : root.CW; }
  function kindOpen(state, kind) { var k = runeById(kind); return !!k && (k.crit === undefined || !econ().critTierOpen || econ().critTierOpen(state, k.crit)); }
  function capOf(k) { return DATA.critConf.caps.rune[k.kind]; }
  function wornOn(state, stat, exceptId) { var v = 0; runeAwakened(state).forEach(function (it) { var k = runeById(it.kind); if (it.id !== exceptId && k && k.stat === stat) v += runeValue(it); }); return v; }
  function runeUseful(state, kind, exceptId) {
    var k = runeById(kind); if (!k || !kindOpen(state, kind)) return false;
    return !k.awaken || wornOn(state, k.stat, exceptId) < capOf(k) - 1e-12;
  }
  // recommended set: keep what is worn, fill empty slots and swap the weakest worn rune for a stronger spare, but only with
  // runes that do not lower the resonance (level at least the current resonance step) and that do something (level > 0).
  // The awakening slots are filled the same way from the awakened runes (no resonance there).
  function runeEquipBest(state) {
    var b = runeBag(state);
    [[b.eq, false], [b.aw, true]].forEach(function (pair) {
      var list = pair[0], aw = pair[1];
      for (var guard = 0; guard < 50; guard++) {
        var floor = aw ? 0 : runeResonance(state) * C.resEvery, spares = b.items.filter(function (it) { return isAwaken(it) === aw && !isWorn(state, it.id) && it.lv > 0 && it.lv >= floor && runeUseful(state, it.kind); })
          .sort(function (a, c) { return runePower(c) - runePower(a); });
        if (!spares.length) break;
        var empty = list.indexOf(null);
        if (empty >= 0) { list[empty] = spares[0].id; continue; }
        var weak = list.map(function (id) { return runeItem(state, id); }).filter(Boolean).sort(function (a, c) { return runePower(a) - runePower(c); })[0];
        if (!weak || runePower(spares[0]) <= runePower(weak)) break;
        if (!runeUseful(state, spares[0].kind, weak.id)) break;
        list[list.indexOf(weak.id)] = spares[0].id;
      }
    });
    return runeEquipped(state).length;
  }
  function runeLock(state, id) { var it = runeItem(state, id); if (!it) return false; it.lock = !it.lock; return true; }
  function runeUp(state, id) {
    var it = runeItem(state, id); if (!it || !runeOpen(state) || it.lv >= runeCap(it)) return false;
    var c = runeCost(it.lv); if (!((state.runeStone || 0) >= c)) return false;
    state.runeStone -= c; it.lv++; return true;
  }
  function runeGradeUp(state, id) {
    var it = runeItem(state, id); if (!it || !runeOpen(state) || it.grade >= TOP || it.lv < runeCap(it)) return false;
    var c = runeGradeCost(it.grade); if (!((state.runeStone || 0) >= c)) return false;
    state.runeStone -= c; it.grade++; return true;
  }
  function free(state, it) { return !!it && !it.lock && !isWorn(state, it.id); }
  function remove(state, id) { var b = runeBag(state); b.items = b.items.filter(function (x) { return x.id !== id; }); b.eq = b.eq.map(function (x) { return x === id ? null : x; }); b.aw = b.aw.map(function (x) { return x === id ? null : x; }); }
  // the chosen rune plus the two lowest-level free ones of the same kind and grade become one rune of the next grade
  function runeFuse(state, id) {
    var it = runeItem(state, id); if (!free(state, it) || it.grade >= TOP) return null;
    var others = runeBag(state).items.filter(function (x) { return x !== it && x.kind === it.kind && x.grade === it.grade && free(state, x); })
      .sort(function (a, c) { return a.lv - c.lv; }).slice(0, 2);
    if (others.length < 2) return null;
    var back = 0; [it].concat(others).forEach(function (x) { back += spentOn(x); });
    state.runeStone = (state.runeStone || 0) + Math.floor(back / 2);
    remove(state, it.id); others.forEach(function (x) { remove(state, x.id); });
    return runeAdd(state, it.kind, it.grade + 1);
  }
  function spentOn(it) { var spent = 0; for (var l = 0; l < it.lv; l++) spent += runeCost(l); return spent; }
  function runeDismantleValue(it) { return C.dismantleBase[it.grade] + Math.floor(spentOn(it) / 2); }
  // 각성 파편: a free rune of grade awakenConf.from (불멸) or higher also gives shards when it is taken apart
  function shardsOf(it) { var A = DATA.awakenConf; return it.grade >= A.from ? A.shards[it.grade - A.from] : 0; }
  function runeDismantle(state, id) {
    var it = runeItem(state, id); if (!free(state, it)) return 0;
    var n = runeDismantleValue(it); remove(state, id); state.runeStone = (state.runeStone || 0) + n;
    var sh = shardsOf(it); if (sh) state.awakenShard = (state.awakenShard || 0) + sh;
    return n;
  }
  // 각성 제작: shards make one awakened rune of the chosen kind at awakenConf.craftGrade
  function runeCraft(state, kind) {
    var k = runeById(kind), A = DATA.awakenConf;
    if (!k || !k.awaken || !kindOpen(state, kind) || (state.awakenShard || 0) < A.craftCost) return null;
    var it = runeAdd(state, kind, A.craftGrade); if (!it) return null;
    state.awakenShard -= A.craftCost; return it;
  }
  function runeDismantleAll(state) { var n = 0; runeBag(state).items.slice().forEach(function (it) { if (free(state, it)) n += runeDismantle(state, it.id); }); return n; }
  function pick(table, rng) {
    var total = table.reduce(function (a, x) { return a + x; }, 0), r = rng() * total;
    for (var i = 0; i < table.length; i++) { if (r < table[i]) return i; r -= table[i]; }
    return 0;
  }
  // a full bag turns the new rune into the rune stones it would dismantle into; out.overflow counts them
  // the kinds a drop or summon can give: every open kind, or with group 'rate' / 'dmg' only the crit runes of that kind
  function runePool(state, group) {
    // awakened runes only come from their own group (or 각성 제작), never mixed into the usual drops
    return DATA.runes.filter(function (k) { return kindOpen(state, k.id) && (group === 'awaken' ? !!k.awaken : !k.awaken && (!group || group === 'all' || (k.crit !== undefined && k.kind === group))); });
  }
  function rollRune(state, table, rng, out, group) {
    var pool = runePool(state, group); if (!pool.length) pool = runePool(state);
    var kind = pool[pick(pool.map(function (k) { return k.w || 1; }), rng)].id, grade = pick(table, rng), it = runeAdd(state, kind, grade);
    if (it) out.push(it); else { var n = C.dismantleBase[grade]; out.overflow += n; state.runeStone = (state.runeStone || 0) + n; }
  }
  function dropTable(state) { var i = Math.min(C.dropTable.length - 1, Math.floor(Math.max(0, state.best) / 80) + (state.diff || 0)); return C.dropTable[i]; }
  function runeDrop(state, regionBoss, rng) {
    rng = rng || Math.random;
    if (!runeOpen(state)) return [];
    var n = regionBoss ? C.regionDrops : (rng() < C.dropRate ? 1 : 0), out = []; out.overflow = 0;
    for (var i = 0; i < n; i++) rollRune(state, dropTable(state), rng, out);
    return out;
  }
  function runeGive(state, n, rng) { rng = rng || Math.random; var out = []; out.overflow = 0; for (var i = 0; i < n; i++) rollRune(state, dropTable(state), rng, out); return out; }
  // group: undefined / 'all' (every open kind), 'rate' or 'dmg' (only the crit runes of that kind, 2026-11-16)
  function runeSummon(state, n, rng, group) {
    rng = rng || Math.random;
    var cost = C.summon[n]; if (!cost || !(state.gems >= cost) || !runeOpen(state)) return null;
    if (runeBag(state).items.length + n > C.cap) return null;
    if (group && group !== 'all' && !runePool(state, group).length) return null;
    state.gems -= cost;
    var out = []; out.overflow = 0; for (var i = 0; i < n; i++) rollRune(state, C.summonTable, rng, out, group);
    return out;
  }
  // what a selected rune stands against (2026-11-15): itself if worn; else the weakest worn rune of the same kind; else,
  // when no slot is empty, the weakest worn rune; else nothing (an empty slot is waiting)
  function runeCompare(state, id) {
    var it = runeItem(state, id); if (!it) return null;
    var list = slotsOf(state, it), worn = list.map(function (x) { return x && runeItem(state, x); }).filter(Boolean), full = list.indexOf(null) < 0;
    if (isWorn(state, id)) return { mode: 'worn', target: null, full: full };
    var weak = function (a, c) { return runePower(a) - runePower(c); };
    var same = worn.filter(function (x) { return x.kind === it.kind; }).sort(weak);
    if (same.length) return { mode: 'same', target: same[0], full: full };
    if (full) return { mode: 'weakest', target: worn.slice().sort(weak)[0] || null, full: full };
    return { mode: 'free', target: null, full: full };
  }
  // the new rune goes into the old one's slot
  function runeSwap(state, oldId, newId) {
    var nw = runeItem(state, newId); if (!nw || isWorn(state, newId)) return false;
    var list = slotsOf(state, nw), i = list.indexOf(oldId);
    if (i < 0) return false;
    list[i] = newId; return true;
  }
  function runeResonance(state) {
    var worn = runeEquipped(state); if (!worn.length) return 0;
    var min = Infinity; worn.forEach(function (it) { min = Math.min(min, it.lv); });
    return Math.floor(min / C.resEvery);
  }
  function runeStoneForBoss(state, regionBoss) { return runeOpen(state) ? (regionBoss ? C.regionStone : C.bossStone) : 0; }
  function runeStats(state) {
    var b = {};
    runeEquipped(state).forEach(function (it) { var v = runeValue(it), k = runeById(it.kind); if (v && k && !k.awaken && kindOpen(state, k.id)) b[k.stat] = (b[k.stat] || 0) + v; });
    // awakened runes: only from the awakening slots, capped per tier
    var aw = {};
    runeAwakened(state).forEach(function (it) { var v = runeValue(it), k = runeById(it.kind); if (v && k && k.awaken && kindOpen(state, k.id)) aw[k.stat] = Math.min(capOf(k), (aw[k.stat] || 0) + v); });
    for (var cs in aw) b[cs] = (b[cs] || 0) + aw[cs];
    var res = runeResonance(state); if (res) b.finalPct = (b.finalPct || 0) + res * C.resFinal;
    return b;
  }
  return { runeById: runeById, runeOpen: runeOpen, runeBag: runeBag, runeItem: runeItem, runeIsWorn: isWorn, runeCraft: runeCraft, runeShardsOf: shardsOf, runeEquipped: runeEquipped, runeAwakened: runeAwakened, runeIsAwaken: isAwaken, runeCompare: runeCompare, runeSwap: runeSwap, runeCap: runeCap, runeCost: runeCost,
    runeGradeCost: runeGradeCost, runeValue: runeValue, runePower: runePower, runeAdd: runeAdd, runeEquip: runeEquip, runeUnequip: runeUnequip, runeEquipBest: runeEquipBest, runeUseful: runeUseful,
    runeLock: runeLock, runeUp: runeUp, runeGradeUp: runeGradeUp, runeFuse: runeFuse, runeDismantleValue: runeDismantleValue, runeDismantle: runeDismantle,
    runeDismantleAll: runeDismantleAll, runeDrop: runeDrop, runeGive: runeGive, runeSummon: runeSummon, runePool: runePool, runeKindOpen: kindOpen, runeResonance: runeResonance, runeStoneForBoss: runeStoneForBoss, runeStats: runeStats };
});
