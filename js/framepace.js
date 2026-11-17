(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // How many pictures a second the game draws (2026-11-15, the phone got warm after a long run).
  // The picture itself is not touched (same quality, same effects); only how often it is drawn:
  //  - the setting caps it (120 = every refresh of a fast screen, 60 = the usual, 50, 40, 30);
  //  - while a menu sheet covers most of the battle, 30 (the strip above the sheet still moves);
  //  - after IDLE_MS without a touch, 30; the next touch brings it back at once.
  // The screen asks for a frame every refresh (60 or 120 a second); a frame is drawn when its turn has come. The turns
  // are kept on an even clock (next += interval), so 30 on a 60 Hz screen is every second refresh and 40 on a 120 Hz
  // screen every third.
  var IDLE_MS = 3 * 60 * 1000, SOFT = 30, SLACK = 2;
  // the screen's refresh time from recent gaps between refreshes. Each usual screen rate is tried from the slowest up;
  // the first one that most gaps fit (each gap a whole number of its refreshes: 1, or 2–3 for a busy frame) is the
  // screen. The shortest gap was used before, but an iPhone's times wobble (a 120 Hz screen gave a 6 ms gap now and then
  // and showed as 165 Hz, 2026-11-17); a stray gap or two no longer decides it. No rate fits: the middle gap.
  var RATES = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240];
  function rateOf(gaps) {
    for (var r = 0; r < RATES.length; r++) {
      var P = 1000 / RATES[r], fit = 0;
      for (var i = 0; i < gaps.length; i++) { var k = gaps[i] / P, n = Math.round(k); if (n >= 1 && Math.abs(k - n) < 0.12) fit++; }
      if (fit >= gaps.length * 0.45) return RATES[r];
    }
    return 0;
  }
  function refreshOf(gaps) {
    var h = rateOf(gaps); if (h) return 1000 / h;
    var s = gaps.slice().sort(function (x, y) { return x - y; }); return s[s.length >> 1];
  }
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
      // the screen's own refresh time, from the last 90 gaps between refreshes (refreshOf). A turn may come up to half a
      // refresh early, so a little timing noise does not push a frame to the
      // next refresh.
      var raw = now - lastRaw; lastRaw = now;
      if (raw > 3 && raw < 60) {
        seen++; gaps.push(raw); if (gaps.length > 90) gaps.shift();
        if (seen < 30 || seen % 10 === 0) vs = refreshOf(gaps);
      }
      SLACK = vs * 0.5;
      var t = target(now);
      if (t !== lastTarget) { lastTarget = t; next = now; }   // the rate changed: draw now and count from here
      // 120 (설정): every refresh, whatever the screen. 60 on a 60 Hz screen: every refresh too. 60 on a 90/120 Hz screen
      // used to be every refresh as well (the phone drew twice as much as asked and got hot, 2026-11-17): now it is held
      // to 60 like the lower rates.
      if (t > 60 || (t === 60 && vs > 1000 / 66)) { next = now; return true; }
      var iv = 1000 / t;
      if (now < next - SLACK) return false;
      next += iv;
      if (now - next > iv) next = now + iv;                 // fell far behind (a stall, a hidden page): start over
      return true;
    }
    return {
      setCap: function (fps) { cap = fps === 30 || fps === 40 || fps === 50 || fps === 120 ? fps : 60; },
      setSheet: function (open) { sheet = !!open; },
      touch: function (now) { touchedAt = now; },
      target: target,
      interval: function (now) { return 1000 / target(now); },
      // how often this screen refreshes (60, 90, 120 ...), learnt from the refreshes; 0 until enough were seen
      hz: function () {
        if (seen < 30) return 0;
        var f = 1000 / vs, best = 60;
        RATES.forEach(function (h) { if (Math.abs(h - f) < Math.abs(best - f)) best = h; });
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
