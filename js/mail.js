// 우편함 (2026-11-15, the user: 운영자처럼 서버에서 골드 주는 것). There is no game server: the saves live on each phone.
// So the letters are a list on the site (mail.json, next to index.html); the game reads it when it starts and every few
// minutes, and each letter can be claimed once. A letter is { id, title, text, to: 'all' or [player numbers],
// goldJo (gold in 조 as the screen shows it), gems, from, until (dates) }. Every save has its own player number, shown in
// the mailbox, so a letter can go to one player only.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var ABC = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function box(state) { if (!state.mail || typeof state.mail !== 'object') state.mail = {}; if (!state.mail.got || typeof state.mail.got !== 'object') state.mail.got = {}; return state.mail; }
  function mailPid(state) {
    var m = box(state);
    if (!/^[0-9A-Z]{8}$/.test(m.pid || '')) { var p = ''; for (var i = 0; i < 8; i++) p += ABC[Math.floor(Math.random() * ABC.length)]; m.pid = p; }
    return m.pid;
  }
  function day(s, end) { var t = Date.parse(s + (end ? 'T23:59:59+09:00' : 'T00:00:00+09:00')); return isFinite(t) ? t : (end ? Infinity : -Infinity); }
  function forMe(state, l) { return l.to === 'all' || (Array.isArray(l.to) && l.to.indexOf(mailPid(state)) >= 0); }
  // the letters still waiting for this player
  function mailWaiting(state, list, now) {
    var got = box(state).got; now = now || Date.now();
    return (Array.isArray(list) ? list : []).filter(function (l) {
      return l && typeof l.id === 'string' && l.id && !got[l.id] && forMe(state, l) && (!l.from || now >= day(l.from)) && (!l.until || now <= day(l.until, true));
    });
  }
  // claim one letter: gold in 조 as shown, times the gold scale the game divides by; returns false if it was taken already
  function mailClaim(state, l, goldScale, now) {
    var m = box(state); if (!l || !l.id || m.got[l.id]) return false;
    var g = +l.goldJo || 0, d = +l.gems || 0;
    if (g > 0) state.gold = (state.gold || 0) + g * 1e12 * (goldScale > 0 ? goldScale : 1);
    if (d > 0) state.gems = (state.gems || 0) + Math.floor(d);
    m.got[l.id] = now || Date.now();
    return true;
  }
  function mailRewardText(l) {
    var a = []; if (+l.goldJo > 0) a.push('골드 ' + l.goldJo + '조'); if (+l.gems > 0) a.push('다이아 ' + l.gems);
    return a.join(' · ');
  }
  return { mailPid: mailPid, mailWaiting: mailWaiting, mailClaim: mailClaim, mailRewardText: mailRewardText };
});
