// Monster codex (2026-11-15, docs/superpowers/specs/2026-11-15-monster-dex-design.md).
// state.dex = { <id>: { t: first-kill ms (0 = before the codex existed), r: region, n: 1 while new and not looked at } }.
// 220 entries in a fixed order: per region its monsters, then its minis, then its boss. A full region adds DATA.dexConf.regionBonus.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function prog() { return isNode ? require('./progress.js') : root.CW; }

  var ORDER = null, INDEX = null;
  function dexOrder() {
    if (ORDER) return ORDER;
    ORDER = []; INDEX = {};
    DATA.regions.forEach(function (R, r) {
      var add = function (id, kind) { if (INDEX[id]) return; INDEX[id] = ORDER.length + 1; ORDER.push({ id: id, no: ORDER.length + 1, region: r, kind: kind }); };
      (R.monsters || []).forEach(function (id) { add(id, 'monster'); });
      (R.minis || []).forEach(function (id) { add(id, 'mini'); });
      if (R.boss && R.boss.art) add(R.boss.art, 'boss');
    });
    return ORDER;
  }
  function entry(id) { dexOrder(); return INDEX[id] ? ORDER[INDEX[id] - 1] : null; }
  function book(state) { return state.dex || (state.dex = {}); }

  // the kill hot path: one lookup when already known
  function dexRecord(state, id, region, now) {
    if (!entry(id)) return null;
    var d = book(state);
    if (d[id]) return 'old';
    d[id] = { t: now, r: region, n: 1 };
    return 'new';
  }
  function dexSeen(state, id) { var e = state.dex && state.dex[id]; if (e) delete e.n; }
  function dexHasNew(state) { var d = state.dex || {}; for (var k in d) if (d[k] && d[k].n) return true; return false; }
  function dexRegion(state, r) {
    var d = state.dex || {}, have = 0, total = 0;
    dexOrder().forEach(function (e) { if (e.region !== r) return; total++; if (d[e.id]) have++; });
    return { have: have, total: total, done: total > 0 && have === total };
  }
  function dexStats(state) {
    var b = (DATA.dexConf && DATA.dexConf.regionBonus) || {}, n = 0, r = {};
    for (var i = 0; i < DATA.regions.length; i++) if (dexRegion(state, i).done) n++;
    for (var k in b) r[k] = b[k] * n;
    return r;
  }
  // one-time fill for saves from before the codex: every difficulty's progress, as generously as it can be read
  function dexBackfill(state) {
    if (state.dexBackfill) return 0;
    var P = prog(), d = book(state), n = 0, diffs = (DATA.difficulties || [0]).length;
    var put = function (id, r) { if (!id || d[id] || !entry(id)) return; d[id] = { t: 0, r: r }; n++; };
    for (var df = 0; df < diffs; df++) {
      var best = df === (state.diff || 0) ? state.best : ((state.diffBest || {})[df] || {}).best;
      if (!(best >= 0)) continue;
      for (var i = 0; i <= best && i <= P.LAST_STAGE; i++) {
        var info = P.stageInfo(i), R = DATA.regions[info.region]; if (!R) continue;
        if (!info.isBoss) { R.monsters.forEach(function (id) { put(id, info.region); }); continue; }
        var sb = P.stageBoss(i, df); if (sb) put(sb.art, info.region);
      }
    }
    state.dexBackfill = 1;
    return n;
  }
  // where an undiscovered entry shows up; for a mini, the first difficulty whose boss stages bring it
  function dexHint(state, id) {
    var e = entry(id); if (!e) return null;
    var diff = null;
    if (e.kind === 'mini') {
      var P = prog(), diffs = (DATA.difficulties || [0]).length;
      for (var df = 0; df < diffs && diff === null; df++)
        for (var k = 1; k <= 6; k++) { var sb = P.stageBoss(e.region * 31 + k * 5 - 1, df); if (sb && sb.art === id) { diff = df; break; } }
    }
    return { region: e.region, diff: diff, diffOpen: diff === null || diff <= (state.diffUnlocked || 0) };
  }
  return { dexOrder: dexOrder, dexRecord: dexRecord, dexSeen: dexSeen, dexHasNew: dexHasNew, dexRegion: dexRegion, dexStats: dexStats,
    dexBackfill: dexBackfill, dexHint: dexHint };
});
