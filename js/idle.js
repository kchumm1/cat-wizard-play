(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // 방치모드 (2026-11-16, the user: 밤에 켜 두면 너무 밝아서, 절전 화면처럼). The rules only; the screen is js/idle-ui.js.
  // While the night sky covers the battle the hunt goes on as always; this counts what it won since the sky came down,
  // lights the cat constellation one star every 1.5 s while monsters keep falling, and tells a real swipe up from a tap.
  var STAR_MS = 1500, HUNT_MS = 3000;
  // the cat constellation (시안 8번): ears, face, body, tail, then the two eyes; in a 260 x 300 box
  var IDLE_STARS = [[65, 85], [75, 30], [105, 62], [155, 62], [185, 30], [195, 85], [170, 120], [90, 120], [70, 170], [60, 240], [130, 255],
    [200, 240], [190, 170], [228, 222], [246, 176], [228, 140], [110, 90], [150, 90]];
  var IDLE_LINES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 6], [11, 13], [13, 14], [14, 15]];
  function num(x) { return typeof x === 'number' && isFinite(x) && x > 0 ? x : 0; }
  function idleTally(now) { return { start: now, at: now, acc: 0, kill: 0, gold: 0, xp: 0, rune: 0, runeDust: 0, sigilDust: 0, lastKill: -Infinity, stars: 0, cycles: 0 }; }
  function idleAdd(t, r, now) {
    if (!t || !r) return;
    t.kill += num(r.kill); t.gold += num(r.gold); t.xp += num(r.xp); t.rune += num(r.rune); t.runeDust += num(r.runeDust); t.sigilDust += num(r.sigilDust);
    if (num(r.kill)) t.lastKill = now;
  }
  // { lit: stars newly lit, round: true when the 18th was lit (the count starts over at 0) }
  function idleStars(t, now) {
    var dt = Math.min(Math.max(0, now - t.at), HUNT_MS), out = { lit: 0, round: false }; t.at = now;
    if (now - t.lastKill > HUNT_MS) return out;
    t.acc += dt;
    while (t.acc >= STAR_MS) {
      t.acc -= STAR_MS; t.stars++; out.lit++;
      if (t.stars >= IDLE_STARS.length) { t.stars = 0; t.cycles++; out.round = true; }
    }
    return out;
  }
  function idleSwipeDone(dy, ms) { return dy <= -120 || (dy <= -40 && ms < 250); }
  function idleTimeText(sec) {
    var m = Math.floor(Math.max(0, sec || 0) / 60), h = Math.floor(m / 60);
    return h ? h + '시간 ' + (m % 60) + '분' : m + '분';
  }
  return { idleTally: idleTally, idleAdd: idleAdd, idleStars: idleStars, idleSwipeDone: idleSwipeDone, idleTimeText: idleTimeText,
    IDLE_STARS: IDLE_STARS, IDLE_LINES: IDLE_LINES, IDLE_STAR_MS: STAR_MS };
});
