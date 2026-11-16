(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // Safety valve for heavy skill spam (2026-11-16). When frames start coming late, new skills spawn a few fewer small
  // pieces (sparks, chips, embers: at most 30% fewer); the skills themselves stay — same shape, size, colour, length.
  // It eases back once the frames are smooth again. Separate from the quality setting (that changes the resolution).
  //   note(rdt, aim): one drawn frame took rdt seconds while the game aims for `aim` frames a second -> the factor
  //   k (0.7..1) that multiplies how many pieces a new effect spawns.
  var MIN = 0.7, STEP_DOWN = 0.1, STEP_UP = 0.05, WINDOW = 1, CALM = 2;
  function createFxLoad() {
    var k = 1, t = 0, late = 0, frames = 0, calm = 0;
    function note(rdt, aim) {
      aim = aim || 60;
      if (!(rdt > 0) || rdt > 0.5) return k;   // a pause (tab hidden, picture loading) is not the skills' doing
      t += rdt; frames++;
      if (rdt > Math.max(0.03, 1.6 / aim)) late++;
      if (t < WINDOW) return k;
      // 3 late frames in a second, or the whole second ran under 80% of the aim: ease off a step
      var fps = frames / t, heavy = late >= 3 || fps < aim * 0.8;
      if (heavy) { k = Math.max(MIN, +(k - STEP_DOWN).toFixed(2)); calm = 0; }
      else { calm += t; if (calm >= CALM && k < 1) { k = Math.min(1, +(k + STEP_UP).toFixed(2)); calm = 0; } }
      t = 0; late = 0; frames = 0;
      return k;
    }
    return { note: note, k: function () { return k; }, reset: function () { k = 1; t = 0; late = 0; frames = 0; calm = 0; } };
  }
  return { createFxLoad: createFxLoad, FXLOAD_MIN: MIN };
});
