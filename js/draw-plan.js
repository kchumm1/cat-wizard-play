// Keep the hunting quality separate from the cost of drawing a phone battle.
(function (root) {
  function drawPlan(setting, phone, autoQuality) {
    var quality = setting === 'auto' ? autoQuality : setting;
    var lite = phone && setting === 'auto' && quality === 'high';
    return { quality: quality, phoneLite: lite,
      fxKey: lite ? 'lite' : quality, minionQuality: lite ? 'mid' : quality };
  }
  var CW = root.CW = root.CW || {};
  CW.drawPlan = drawPlan;
  if (typeof module !== 'undefined' && module.exports) module.exports = drawPlan;
})(this);
