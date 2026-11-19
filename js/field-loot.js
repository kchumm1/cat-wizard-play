// One draw per credited field kill. Bosses, dungeons and offline earnings use their own reward paths.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(Object.assign({}, require('./data.js'), require('./runes.js'), require('./sigil.js')));
  } else Object.assign(root.CW, factory(root.CW));
})(this, function (CW) {
  var data = CW.DATA, conf = data.fieldLoot;
  function weightedIndex(weights, rng) {
    var value = rng() * weights.reduce(function (a, b) { return a + b; }, 0);
    for (var i = 0; i < weights.length - 1; i++) {
      if (value < weights[i]) return i;
      value -= weights[i];
    }
    return weights.length - 1;
  }
  function fieldDrop(state, rng) {
    if (!CW.runeOpen(state)) return null;
    rng = rng || Math.random;
    var late = CW.sigilOpen(state), roll = rng();
    if (roll >= conf.runeChance + (late ? conf.sigilChance : 0)) return null;
    var grade = weightedIndex(late ? conf.lateGrades : conf.earlyGrades, rng);
    var rune = roll < conf.runeChance, item;
    if (rune) {
      var kinds = CW.runePool(state);
      var kind = kinds[weightedIndex(kinds.map(function (k) { return k.w || 1; }), rng)];
      item = CW.runeAdd(state, kind.id, grade, true);
    } else item = CW.addSigil(state, grade, rng, false, true);
    return { type: rune ? 'rune' : 'sigil', item: item, flash: grade >= (late ? conf.lateFlash : conf.earlyFlash) };
  }
  // Keep the exact rolled item and ID until an inventory operation has finished and made room.
  function restoreFieldItems(state) {
    function restore(bag, cap) {
      if (!bag || !bag.fieldReserve || bag.items.length >= cap) return;
      var items = bag.fieldReserve.splice(0, cap - bag.items.length);
      items.forEach(function (item) { bag.items.push(item); });
      if (!bag.fieldReserve.length) delete bag.fieldReserve;
    }
    restore(state.runeBag, data.runeConf.cap);
    restore(state.sigil, data.sigilConf.cap);
  }
  function countFieldItem(summary, reward) {
    var item = Object.assign({}, reward.item);
    summary[reward.type]++;
    summary[reward.type + 'Sample'] = item;
    if (!summary.best || item.grade > summary.best.item.grade) summary.best = { type: reward.type, item: item };
  }
  return { fieldDrop: fieldDrop, restoreFieldItems: restoreFieldItems, countFieldItem: countFieldItem };
});
