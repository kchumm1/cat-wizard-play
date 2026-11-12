(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var gear = isNode ? require('./gear.js') : root.CW;
  var GA = DATA.gacha;

  function gachaLevel(pulls) { var l = 1; for (var i = 0; i < GA.levels.length; i++) if (pulls >= GA.levels[i]) l = i + 1; return l; }
  function gachaCost(count) { return GA.cost[count]; }
  function rollGrade(level, rng) {
    var row = GA.table[level - 1], r = (rng || Math.random)() * 100, acc = 0;
    for (var g = 0; g < row.length; g++) { acc += row[g]; if (r < acc) return g; }
    return 0;
  }
  function item(kind, grade) { var t = grade * 4; return { kind: kind, grade: grade, sub: 0, t: t, key: gear.keyOf(kind, t) }; }
  function pull(state, count, rng) {
    rng = rng || Math.random;
    var cost = gachaCost(count);
    if (!cost || !(state.gems >= cost)) return null;
    state.gems -= cost;
    var out = [];
    for (var i = 0; i < count; i++) {
      var lvl = gachaLevel(state.pulls);
      var g = rollGrade(lvl, rng);
      if (state.pity + 1 >= GA.pity && g < 4) g = 4;
      state.pity = g >= 4 ? 0 : state.pity + 1;
      state.pulls += 1;
      var slot = DATA.slots[Math.floor(rng() * DATA.slots.length) % DATA.slots.length];
      out.push(item(slot.kind, g));
    }
    var max = Math.max.apply(null, out.map(function (x) { return x.grade; }));
    if (count >= 100 && max < 3) out[out.length - 1] = item(out[out.length - 1].kind, 3);
    else if (count >= 10 && max < 2) out[out.length - 1] = item(out[out.length - 1].kind, 2);
    out.forEach(function (it) { gear.addItem(state, it.kind, it.t, 1); });
    return out;
  }
  return { gachaLevel: gachaLevel, gachaCost: gachaCost, rollGrade: rollGrade, pull: pull };
});
