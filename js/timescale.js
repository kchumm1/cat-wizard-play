(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // Game speed for impacts (scene.js hitStop / slowmo).
  // It used to freeze the game (4% speed) on hits and end slow motion with a jump back to full speed; with the high
  // skills that happened 6-8 times every 6 seconds, which on a phone reads as "the game keeps stopping". Now every call
  // is a dip: the speed drops at once, never below 30%, and comes back smoothly (fastest at the start, flat at the end).
  // Several dips at once do not add up: the deepest one at each moment wins.
  var MAX_DEPTH = 0.7, HIT_GAP = 0.22, MAX_DIPS = 32;
  function createTimeScale() {
    var clock = 0, lastStop = -9, dips = [];
    function dip(depth, dur) {
      if (!(depth > 0) || !(dur > 0)) return;
      dips.push({ d: Math.min(MAX_DEPTH, depth), t: dur, all: dur });
      if (dips.length > MAX_DIPS) { var j = 0; for (var i = 1; i < dips.length; i++) if (dips[i].t < dips[j].t) j = i; dips.splice(j, 1); }
    }
    // a hit: deeper and longer for a bigger hit (0.1 s -> down to 30%, back over 0.3 s); not more than one every 0.22 s
    function hitStop(sec) {
      if (clock - lastStop < HIT_GAP) return;
      lastStop = clock; dip(sec * 7, sec * 3);
    }
    // slow motion at speed s; one that was meant to hold and then jump back (ease false) gets a longer smooth return,
    // so about the same amount of slow motion is seen
    function slowmo(sec, s, ease) { dip(1 - s, ease ? sec : sec * 1.6); }
    // the one big moment of a skill (the black hole bursting): time nearly stands still at first, then comes back
    // smoothly (flat at the start, unlike a dip). Never a full stop, and at most one every 1.5 s, so it cannot turn
    // back into the game that keeps stopping.
    var lastClimax = -9, climaxes = [];
    function climax(depth, dur) {
      if (!(depth > 0) || !(dur > 0) || clock - lastClimax < 1.5) return;
      lastClimax = clock; climaxes.push({ d: Math.min(0.92, depth), t: dur, all: dur });
    }
    function scaleDt(dt) {
      var deficit = 0;
      for (var c = climaxes.length - 1; c >= 0; c--) {
        var X = climaxes[c], e = 1 - X.t / X.all, cv = X.d * (1 - e * e * (3 - 2 * e));
        if (cv > deficit) deficit = cv;
        X.t -= dt; if (X.t <= 0) climaxes.splice(c, 1);
      }
      for (var i = dips.length - 1; i >= 0; i--) {
        var D = dips[i], k = D.t / D.all, v = D.d * k * k;
        if (v > deficit) deficit = v;
        D.t -= dt; if (D.t <= 0) dips.splice(i, 1);
      }
      clock += dt;
      return dt * (1 - deficit);
    }
    return { hitStop: hitStop, slowmo: slowmo, climax: climax, scaleDt: scaleDt };
  }
  return { createTimeScale: createTimeScale };
});
