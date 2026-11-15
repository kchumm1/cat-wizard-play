(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // How many pictures a second the game draws (2026-11-15, the phone got warm after a long run).
  // The picture itself is not touched (same quality, same effects); only how often it is drawn:
  //  - the 절전 setting caps it (60 = off, 50, 40, 30);
  //  - while a menu sheet covers most of the battle, 30 (the strip above the sheet still moves);
  //  - after IDLE_MS without a touch, 30; the next touch brings it back at once.
  // The screen asks for a frame every refresh (60 or 120 a second); a frame is drawn when its turn has come. The turns
  // are kept on an even clock (next += interval), so 30 on a 60 Hz screen is every second refresh and 40 on a 120 Hz
  // screen every third.
  var IDLE_MS = 3 * 60 * 1000, SOFT = 30, SLACK = 2;
  function createFramePace() {
    var cap = 60, sheet = false, touchedAt = 0, next = 0, lastTarget = 60;
    function target(now) {
      var t = cap;
      if (sheet) t = Math.min(t, SOFT);
      if (touchedAt && now - touchedAt > IDLE_MS) t = Math.min(t, SOFT);
      return t;
    }
    // true when this screen refresh should be drawn
    var lastRaw = 0, vs = 1000 / 60, seen = 0, gaps = [];
    function shouldDraw(now) {
      if (!touchedAt) touchedAt = now;                       // the idle clock starts when the game starts
      // the screen's own refresh time: the shortest of the last 90 gaps between refreshes (a busy frame makes a gap
      // two or three refreshes long, never shorter). A turn may come up to half a refresh early, so a little timing
      // noise does not push a frame to the next refresh.
      var raw = now - lastRaw; lastRaw = now;
      if (raw > 3 && raw < 60) {
        seen++; gaps.push(raw); if (gaps.length > 90) gaps.shift();
        var lo = gaps[0]; for (var gi = 1; gi < gaps.length; gi++) if (gaps[gi] < lo) lo = gaps[gi];
        vs = lo;
      }
      SLACK = vs * 0.5;
      var t = target(now);
      if (t !== lastTarget) { lastTarget = t; next = now; }   // the rate changed: draw now and count from here
      if (t >= 60) { next = now; return true; }
      var iv = 1000 / t;
      if (now < next - SLACK) return false;
      next += iv;
      if (now - next > iv) next = now + iv;                 // fell far behind (a stall, a hidden page): start over
      return true;
    }
    return {
      setCap: function (fps) { cap = fps === 30 || fps === 40 || fps === 50 ? fps : 60; },
      setSheet: function (open) { sheet = !!open; },
      touch: function (now) { touchedAt = now; },
      target: target,
      interval: function (now) { return 1000 / target(now); },
      // how often this screen refreshes (60, 90, 120 ...), learnt from the refreshes; 0 until enough were seen
      hz: function () {
        if (seen < 30) return 0;
        var f = 1000 / vs, best = 60;
        [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240].forEach(function (h) { if (Math.abs(h - f) < Math.abs(best - f)) best = h; });
        return best;
      },
      shouldDraw: shouldDraw
    };
  }
  // game time for one drawn frame, played in pieces of at most 0.05 s. The most one frame may add up is 0.05 s at 60 a
  // second (as before: a stall slows the game instead of jumping it) and 1.5 frames' worth at a lower rate, so the game
  // runs at the same speed whatever the rate.
  function frameSteps(gapSec, aim) {
    var most = Math.max(0.05, 1.5 / (aim || 60));
    var total = Math.min(most, Math.max(0, gapSec)), out = [];
    if (total <= 0) return [0];
    var n = Math.ceil(total / 0.05 - 1e-9);
    for (var i = 0; i < n; i++) out.push(total / n);
    return out;
  }
  return { createFramePace: createFramePace, frameSteps: frameSteps, PACE_IDLE_MS: IDLE_MS };
});
