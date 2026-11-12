// Shop packages for runes and sigils. Practice only: there is no real payment, the contents are simply given.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function sigilMod() { return isNode ? require('./sigil.js') : root.CW; }
  function packById(id) { for (var i = 0; i < DATA.packs.length; i++) if (DATA.packs[i].id === id) return DATA.packs[i]; return null; }
  function packSigils(p) { return (p.give.sigils || []).reduce(function (a, x) { return a + x.n; }, 0); }
  // returns the list of sigils given (empty when none), or false when the pack is unknown or the sigil bag has no room
  function buyPack(state, id, rng) {
    var p = packById(id); if (!p) return false;
    var S = sigilMod(), need = packSigils(p);
    if (need) { S.sigilById(state, ''); if (state.sigil.items.length + need > DATA.sigilConf.cap) return false; }
    var g = p.give, got = [];
    if (g.runeStone) state.runeStone = (state.runeStone || 0) + g.runeStone;
    (g.sigils || []).forEach(function (x) { for (var i = 0; i < x.n; i++) got.push(S.addSigil(state, x.grade, rng)); });
    if (g.sigilStone) state.sigil.stone += g.sigilStone;
    state.packs = state.packs || {}; state.packs[id] = (state.packs[id] || 0) + 1;
    return got;
  }
  return { packById: packById, packSigils: packSigils, buyPack: buyPack };
});
