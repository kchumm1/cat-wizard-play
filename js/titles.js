// Titles (2026-11-14): five titles earned by playing; one is worn and shown in the profile, and the worn one adds its bonus.
// A title once earned stays owned (state.titles.owned), even if its condition stops being true.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function dep(file) { if (isNode) { try { return require('./' + file + '.js'); } catch (e) { return null; } } return root.CW; }
  function box(state) {
    if (!state.titles || typeof state.titles !== 'object') state.titles = { owned: {}, worn: 'tNovice' };
    if (!state.titles.owned) state.titles.owned = {};
    state.titles.owned.tNovice = true;
    return state.titles;
  }
  function titleById(id) { for (var i = 0; i < DATA.titles.length; i++) if (DATA.titles[i].id === id) return DATA.titles[i]; return null; }
  // bosses beaten: the running count, or for a save from before it, the bosses it has cleared at least once
  function bossCount(state) { return Math.max(state.bossWins || 0, Object.keys(state.firstClear || {}).length); }
  function met(state, t) {
    var c = t.need;
    if (c.kind === 'start') return true;
    if (c.kind === 'boss') return bossCount(state) >= c.n;
    if (c.kind === 'tier') return (state.tier || 1) >= c.n;
    if (c.kind === 'slayer') return !!state.slayerWin;
    if (c.kind === 'runes') { var R = dep('runes'); return !!(R && R.runeEquipped && R.runeEquipped(state).length >= c.n); }
    return false;
  }
  function titleCheck(state) {
    var b = box(state), got = [];
    DATA.titles.forEach(function (t) { if (!b.owned[t.id] && met(state, t)) { b.owned[t.id] = true; got.push(t.id); } });
    return got;
  }
  function titlesOwned(state) { var b = box(state); return DATA.titles.filter(function (t) { return b.owned[t.id]; }).map(function (t) { return t.id; }); }
  function titleWorn(state) { var b = box(state); return b.owned[b.worn] && titleById(b.worn) ? b.worn : 'tNovice'; }
  function titleWear(state, id) { var b = box(state); if (!b.owned[id] || !titleById(id)) return false; b.worn = id; return true; }
  function titleStats(state) { var t = titleById(titleWorn(state)), r = {}; if (t && t.bonus) for (var k in t.bonus) r[k] = t.bonus[k]; return r; }
  function titleNeedText(t) {
    var c = t.need;
    return c.kind === 'start' ? '처음부터' : c.kind === 'boss' ? '보스 ' + c.n + '마리 처치' : c.kind === 'runes' ? '룬 ' + c.n + '칸 모두 채우기'
      : c.kind === 'tier' ? c.n + '차 전직' : c.kind === 'slayer' ? '난이도 「슬레이어 킹」 보스 처치' : '';
  }
  return { titleById: titleById, titleCheck: titleCheck, titlesOwned: titlesOwned, titleWorn: titleWorn, titleWear: titleWear, titleStats: titleStats,
    titleNeedText: titleNeedText, titleBossCount: bossCount };
});
