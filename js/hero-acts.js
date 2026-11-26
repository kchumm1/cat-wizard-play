// 냥법사 동작 프레임 고르기 (12차 바람, 2026-11-25, 형: 칼바람 일섬의 휘두르기·소닉붐 화살의 활 당기기를 진짜 동작 그림으로).
// The drawn frames (js/hero-frames.js, cut by tools/cut-hero-frames.py) come per look, view and act: 'walk' and 'cast'
// for every look since 2026-11-25, and now 'swing' (staff swung sideways) and 'bow' (staff held like a bow, drawn back).
// heroAct(poseType, fm): the act a spell pose plays — the 'gale' pose swings, the 'bow' pose draws, when that look and view
// has those frames; otherwise (and for every other pose) the six spell frames, or null with no frames at all.
// actFrame(act, P, t, a, n): which of the n frames shows at time t into the pose (a = its wind-up, P = the pose's values):
//   cast · swing: frames 1-2 while it winds up, 3-4 the shot, 5 the recoil, 6 back to rest (as js/scene.js always did)
//   bow: frames 1-3 while it is drawn (raise, pull, full draw), 4 the release, 5 the recoil, 6 back to rest
(function (root, f) { var m = f(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var OWN = { gale: 'swing', bow: 'bow' };
  function heroAct(poseType, fm) {
    if (!fm) return null;
    var own = OWN[poseType];
    if (own && fm[own]) return own;
    return fm.cast ? 'cast' : null;
  }
  function actFrame(act, P, t, a, n) {
    var hold = (P && P.hold) || 0, k;
    if (act === 'bow') {
      if (t < a) k = Math.min(2, Math.floor(t / a * 3));
      else { var ub = (t - a) / (hold + 0.6); k = ub < 0.15 ? 3 : ub < 0.45 ? 4 : 5; }
    } else {
      if (t < a) k = t / a < 0.5 ? 0 : 1;
      else { var u = (t - a) / (hold + 0.6); k = u < 0.12 ? 2 : u < 0.32 ? 3 : u < 0.58 ? 4 : 5; }
    }
    return Math.max(0, Math.min(n - 1, Math.round(k * (n - 1) / 5)));
  }
  return { heroAct: heroAct, actFrame: actFrame };
});
