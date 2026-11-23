// 우편함 (2026-11-15, the user: 운영자처럼 서버에서 골드 주는 것). There is no game server: the saves live on each phone.
// So the letters are a list on the site (mail.json, next to index.html); the game reads it when it starts and every few
// minutes, and each letter can be claimed once. A letter is { id, title, text, to: 'all' or [player numbers],
// goldJo (gold in 조 as the screen shows it), gems, from, until (dates) }. Every save has its own player number, shown in
// the mailbox, so a letter can go to one player only.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // other currencies and items on a letter (2026-11-16): js/mail-gift.js
  var GIFT = typeof module !== 'undefined' && module.exports ? require('./mail-gift.js') : null;
  function gift() { return GIFT || (typeof CW !== 'undefined' && CW.giftOf ? CW : null); }
  var ABC = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function box(state) { if (!state.mail || typeof state.mail !== 'object') state.mail = {}; if (!state.mail.got || typeof state.mail.got !== 'object') state.mail.got = {}; return state.mail; }
  function mailPid(state) {
    var m = box(state);
    if (!/^[0-9A-Z]{8}$/.test(m.pid || '')) { var p = ''; for (var i = 0; i < 8; i++) p += ABC[Math.floor(Math.random() * ABC.length)]; m.pid = p; }
    return m.pid;
  }
  function day(s, end) { var t = Date.parse(s + (end ? 'T23:59:59+09:00' : 'T00:00:00+09:00')); return isFinite(t) ? t : (end ? Infinity : -Infinity); }
  // 지운 편지 (2026-11-23): state.mail.del[id] — kept on the phone only (not a server field)
  function gone(state, l) { var m = state.mail; return !!(m && m.del && m.del[l.id]); }
  function forMe(state, l) { return l.to === 'all' || (Array.isArray(l.to) && l.to.indexOf(mailPid(state)) >= 0); }
  // the letters still waiting for this player
  function mailWaiting(state, list, now) {
    var got = box(state).got; now = now || Date.now();
    return (Array.isArray(list) ? list : []).filter(function (l) {
      return l && typeof l.id === 'string' && l.id && !got[l.id] && !gone(state, l) && forMe(state, l) && (!l.from || now >= day(l.from)) && (!l.until || now <= day(l.until, true));
    });
  }
  // every letter for this player that is in its days, claimed or not, newest first (the 전체 tab)
  function mailAll(state, list, now) {
    now = now || Date.now();
    return (Array.isArray(list) ? list : []).filter(function (l) { return l && typeof l.id === 'string' && l.id && !gone(state, l) && forMe(state, l) && (!l.from || now >= day(l.from)) && (!l.until || now <= day(l.until, true)); });
  }
  function mailGot(state, l) { return !!(l && box(state).got[l.id]); }
  function mailHasReward(l) { var G = gift(); return mailGold(l) > 0 || +l.gems > 0 || !!(G && G.giftHas(l)); }
  // a player may delete a letter once nothing is left to take on it (taken, or nothing on it) — never an untaken reward
  function mailCanDel(state, l) { return !!(l && l.id) && (mailGot(state, l) || !mailHasReward(l)); }
  function mailDel(state, l) {
    if (!mailCanDel(state, l)) return false;
    var m = box(state); if (!m.del || typeof m.del !== 'object') m.del = {};
    m.del[l.id] = 1; return true;
  }
  // every letter in the list that can go (the 전체 tab's 「받은 우편 지우기」); returns how many went
  function mailDelAll(state, list, now) { return mailAll(state, list, now).filter(function (l) { return mailDel(state, l); }).length; }
  // why a letter cannot be claimed right now ('' = it can): runes or sigils that do not fit their bag
  function mailClaimBlock(state, l) { var G = gift(); return G && G.giftHas(l) ? G.giftRoom(state, l) : ''; }
  // when it was sent, the way a letter says it: 오늘 · 어제 · 11월 3일 (Korean time)
  function mailWhen(l, now) {
    if (!l || !l.date) return '';
    var k = function (t) { var d = new Date(t + 9 * 3600e3); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
    var d0 = Date.parse(l.date + 'T12:00:00+09:00'); if (!isFinite(d0)) return '';
    var diff = Math.round((k(now || Date.now()) - k(d0)) / 864e5), dd = new Date(d0 + 9 * 3600e3);
    return diff === 0 ? '오늘' : diff === 1 ? '어제' : (dd.getUTCMonth() + 1) + '월 ' + dd.getUTCDate() + '일';
  }
  // claim one letter: gold in 조 as shown, times the gold scale the game divides by; returns false if it was taken already
  function mailClaim(state, l, goldScale, now) {
    var m = box(state); if (!l || !l.id || m.got[l.id]) return false;
    if (mailClaimBlock(state, l)) return false;   // nothing is given until everything fits
    mailGive(state, l, goldScale, null, now);
    m.got[l.id] = now || Date.now();
    return true;
  }
  // what a letter carries, given now (the bag, js/chest.js, opens a taken letter's box with this; room checked before)
  // spill: see js/mail-gift.js giftApply (가방: a rune or sigil whose bag is full). Returns the gold given
  function mailGive(state, l, goldScale, rng, now, spill) {
    var g = mailGold(l), d = +l.gems || 0, G = gift(), gold = g > 0 ? g * (goldScale > 0 ? goldScale : 1) : 0;
    if (gold) state.gold = (state.gold || 0) + gold;
    if (d > 0) state.gems = (state.gems || 0) + Math.floor(d);
    if (G && G.giftHas(l)) G.giftApply(state, l, rng, now, spill);
    return gold;
  }
  // the letter counts as taken (its reward went into the bag, js/chest.js)
  function mailMarkGot(state, l, now) { box(state).got[l.id] = now || Date.now(); }
  // the letter's gold as the screen shows it, a whole number (goldJo may be a part of 조: 0.5 = 5000억, 1e-12 = 1)
  function mailGold(l) { return Math.round((+(l && l.goldJo) || 0) * 1e12); }
  // 1500000000300 → 1조 5000억 300 (2026-11-15, the user: 1원부터 9999조까지)
  function goldWords(n) {
    n = Math.round(+n || 0); if (n <= 0) return '0';
    var u = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']], a = [];
    u.forEach(function (x) { var k = Math.floor(n / x[0]); if (k) { a.push(k + x[1]); n -= k * x[0]; } });
    if (n) a.push(String(n));
    return a.join(' ');
  }
  // the game shows a letter's gold short, the rest is not shown (2026-11-16, the user: 8542442…경 → 8.54경): the biggest
  // unit, two decimals under 10, one under 100, none above, cut (not rounded up): 8.54경 · 85.4경 · 8542경, 1조 5000억 300
  // → 1.5조, 300 → 300. ops.html keeps goldWords.
  function goldShort(n) {
    n = Math.round(+n || 0); if (n <= 0) return '0'; if (n < 10000) return String(n);
    var U = ['', '만', '억', '조', '경', '해'], k = Math.min(U.length - 1, Math.floor(Math.log10(n) / 4)), v = n / Math.pow(10, 4 * k);
    if (v < 1 && k > 0) { k -= 1; v = n / Math.pow(10, 4 * k); }
    var cut = function (x) { var p = x < 10 ? 100 : x < 100 ? 10 : 1; return Math.floor(x * p + 1e-6) / p; }, r = cut(v);
    if (r >= 10000 && k < U.length - 1) { k += 1; r = cut(n / Math.pow(10, 4 * k)); }
    return String(r) + U[k];
  }
  function mailGoldText(l) { return goldShort(mailGold(l)); }
  function mailRewardText(l) {
    var a = [], G = gift(); if (mailGold(l) > 0) a.push('골드 ' + mailGoldText(l)); if (+l.gems > 0) a.push('다이아 ' + l.gems);
    if (G && G.giftHas(l)) a.push(G.giftText(l));
    return a.join(' · ');
  }
  return { mailCanDel: mailCanDel, mailDel: mailDel, mailDelAll: mailDelAll, mailGive: mailGive, mailMarkGot: mailMarkGot, mailClaimBlock: mailClaimBlock, mailAll: mailAll, mailGot: mailGot, mailHasReward: mailHasReward, mailWhen: mailWhen, mailPid: mailPid, mailWaiting: mailWaiting, mailClaim: mailClaim, mailRewardText: mailRewardText, mailGold: mailGold, mailGoldText: mailGoldText, goldWords: goldWords, goldShort: goldShort };
});
