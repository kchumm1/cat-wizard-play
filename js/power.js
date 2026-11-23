// 전투력 표시 (2026-11-23, 형: 키운 게 보이게 · docs/superpowers/specs/2026-11-23-power-pets-goals-design.md 6장).
// The number is CW.dps — the same 전투력 as the profile window (냥법사 기록), never a second formula.
// - powerSample / powerFlush: growth shows as one "+N ▲" (or "−N ▼"), changes within 600ms merged (꾸욱 연속 강화);
//   a new region or difficulty (the weak element changes the number) or a whole new state (load, server save, another
//   account) only moves the number, silently.
// - bossOutlook: the line in front of a boss. With a loss on record it uses the same rule as 자동 재도전
//   (progress.js retryNeed), so '이길 수 있어요' is exactly when the auto retry would go; without one, boss health ÷ time.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  function cw() { return isNode ? Object.assign({}, require('./num.js'), require('./economy.js'), require('./progress.js')) : root.CW; }
  var CLOSE = 0.6;   // '조금 부족해요' from here (display only, not balance)
  var OUTLOOK_TEXT = { win: '이길 수 있어요', close: '조금 부족해요', far: '많이 부족해요' };

  function powerContext(state) { return (state.diff || 0) + ':' + cw().stageInfo(state.stage || 0).region; }
  function powerTrack() { return { v: null, key: null, ref: null, pending: 0, last: 0 }; }
  function powerSample(track, state, value, now) {
    if (!track || typeof value !== 'number' || !isFinite(value)) return;
    var key = powerContext(state);
    if (track.v === null || track.ref !== state || track.key !== key) {
      track.v = value; track.ref = state; track.key = key; track.pending = 0; return;
    }
    if (value === track.v) return;
    track.pending += value - track.v; track.last = now; track.v = value;
  }
  function powerFlush(track, now, waitMs) {
    if (!track || !track.pending) return 0;
    if (now - track.last < (waitMs === undefined ? 600 : waitMs)) return 0;
    var d = track.pending; track.pending = 0; return d;
  }
  function powerDeltaText(delta) {
    var up = delta > 0, txt = cw().fmt(Math.abs(delta));
    if (txt === '0') return null;
    return { text: (up ? '+' : '−') + txt + (up ? ' ▲' : ' ▼'), up: up };
  }
  function bossOutlook(state, st, stage, result) {
    var C = cw(), info = C.stageInfo(stage);
    if (!info.isBoss) return null;
    var secs = info.timeLimit || 30, have = C.bossDpsTypical(state, st, secs), need;
    var same = result && result.stage === stage && result.diff === (state.diff || 0) && result.power > 0 && result.pct > 0 && result.pct < 100;
    need = same ? C.retryNeed(result) / C.RETRY_MARGIN : C.stageBossHp(state, stage) / secs;
    var ratio = have / need;
    if (!isFinite(ratio) || ratio < 0) ratio = 0;
    return { ratio: ratio, verdict: ratio >= C.RETRY_MARGIN ? 'win' : ratio >= CLOSE ? 'close' : 'far' };
  }
  // bossOutlook runs 151 short fights (~3ms on a PC, more on a phone): measure again only while the line can be seen,
  // after the stats have stopped changing for 600ms (꾸욱 연속 강화 swaps the stats object every 90ms), and only when
  // something it depends on changed (key: boss, region/difficulty, skills, loss record; st: the stats object)
  function outlookDue(cache, key, st, now, lastChange, visible) {
    if (!visible) return false;
    if (cache.key === key && cache.st === st) return false;
    return cache.key === null || now - (lastChange || 0) >= 600;
  }
  return { powerContext: powerContext, powerTrack: powerTrack, powerSample: powerSample, powerFlush: powerFlush,
    powerDeltaText: powerDeltaText, bossOutlook: bossOutlook, outlookDue: outlookDue, OUTLOOK_TEXT: OUTLOOK_TEXT };
});
