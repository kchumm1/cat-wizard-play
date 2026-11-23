// 공지 (2026-11-16, the user: 우편함 밑에 공지, 공지 디자인 만들기). Like the mailbox there is no server: the notices are
// a list on the site (notice.json, next to index.html) that the game reads when it starts and every few minutes, and that
// ops.html changes on GitHub. A notice is { id, tag, title, text, date, pin, from, until }; tag is one of NOTICE_TAGS.
// Each save remembers which notices it has opened (state.notice.read), so the button shows a dot until all are read.
// tools/build-site.cjs keeps what ops.html wrote (noticeMerge), the same way as mail.json.
(function (root, f) { var m = f(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var NOTICE_TAGS = ['공지', '업데이트', '이벤트', '점검'];
  function box(state) { if (!state.notice || typeof state.notice !== 'object') state.notice = {}; if (!state.notice.read || typeof state.notice.read !== 'object') state.notice.read = {}; return state.notice; }
  function day(s, end) { var t = Date.parse(s + (end ? 'T23:59:59+09:00' : 'T00:00:00+09:00')); return isFinite(t) ? t : (end ? Infinity : -Infinity); }
  function ok(n) { return n && typeof n.id === 'string' && n.id && typeof n.title === 'string'; }
  // the order notices are shown in: pinned first; inside each group the ops page's order (2026-11-23, 형: 공지 순서를 운영자
  // 페이지에서), notices without one after it, newest date first
  function has(n) { return typeof n.order === 'number' && isFinite(n.order); }
  function cmp(a, b) {
    return (!!b.n.pin - !!a.n.pin) || (has(b.n) - has(a.n)) || (has(a.n) && has(b.n) ? a.n.order - b.n.order : 0) ||
      (b.n.date || '').localeCompare(a.n.date || '') || a.i - b.i;
  }
  function sorted(list) { return (Array.isArray(list) ? list : []).map(function (n, i) { return { n: n, i: i }; }).filter(function (x) { return ok(x.n); }).sort(cmp); }
  // the notices shown now (in their days), in that order
  function noticeShown(list, now) {
    now = now || Date.now();
    return sorted(list).filter(function (x) {
      var n = x.n; return (!n.from || now >= day(n.from)) && (!n.until || now <= day(n.until, true));
    }).map(function (x) { return x.n; });
  }
  function noticeRead(state, n) { return !!(n && box(state).read[n.id]); }
  function noticeMarkRead(state, n) { if (!n || noticeRead(state, n)) return false; box(state).read[n.id] = 1; return true; }
  function noticeUnread(state, list, now) { return noticeShown(list, now).filter(function (n) { return !noticeRead(state, n); }); }
  // the tag a notice shows (anything else reads as 공지)
  function noticeTag(n) { return n && NOTICE_TAGS.indexOf(n.tag) >= 0 ? n.tag : '공지'; }
  // 2026-11-16 → 11.16
  function noticeDate(n) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((n && n.date) || ''); return m ? (+m[2]) + '.' + m[3] : ''; }

  // ---- ops.html: write a notice, take one off, and keep what it wrote when the site is rebuilt
  function kstDay(now) { return new Date((now || Date.now()) + 9 * 3600e3).toISOString().slice(0, 10); }
  function noticeCheck(f) {
    if (!String(f.title || '').trim()) return '제목을 적어 주세요.';
    if (String(f.title).trim().length > 40) return '제목은 40자까지예요.';
    if (!String(f.text || '').trim()) return '내용을 적어 주세요.';
    if (String(f.text).length > 2000) return '내용은 2000자까지예요.';
    if (f.from && f.until && f.until < f.from) return '마지막 날이 첫날보다 빨라요.';
    return '';
  }
  function noticeMake(f, now) {
    now = now || Date.now();
    var stamp = new Date(now + 9 * 3600e3).toISOString().replace(/[-:T]/g, '').slice(0, 14);
    var n = { id: 'notice-' + stamp + '-' + Math.random().toString(36).slice(2, 6), tag: NOTICE_TAGS.indexOf(f.tag) >= 0 ? f.tag : '공지',
      title: String(f.title).trim(), text: String(f.text).replace(/\r\n/g, '\n').trim(), date: kstDay(now) };
    if (f.pin) n.pin = true;
    if (f.from && f.from > kstDay(now)) n.from = f.from;
    if (f.until) n.until = f.until;
    n.by = 'ops';
    return n;
  }
  function doc0(doc) { doc = doc && typeof doc === 'object' ? doc : {}; return { note: doc.note, notices: Array.isArray(doc.notices) ? doc.notices.slice() : [], removed: Array.isArray(doc.removed) ? doc.removed.slice() : [] }; }
  function clean(doc) { var o = {}; if (doc.note) o.note = doc.note; o.notices = doc.notices; if (doc.removed.length) o.removed = doc.removed; return o; }
  // a new notice goes on top (above any order the ops page set)
  function noticeAdd(doc, n) {
    var d = doc0(doc), o = d.notices.filter(function (x) { return x && has(x); }).map(function (x) { return x.order; });
    if (o.length) n = Object.assign({}, n, { order: Math.min.apply(null, o) - 1 });
    d.notices.unshift(n); return clean(d);
  }
  // move one notice up (dir -1) or down (+1) past its neighbour in the shown order, inside its pinned / not pinned group;
  // every notice then gets its place as order 0, 1, 2… (the ones out of their days too, so the order stays the same later)
  // (2026-11-23 검토: the neighbour is the next notice the game shows now — notices out of their days are skipped)
  function noticeMove(doc, id, dir, now) {
    now = now || Date.now();
    var d = doc0(doc), all = sorted(d.notices).map(function (x) { return x.n; });
    var live = function (n) { return (!n.from || now >= day(n.from)) && (!n.until || now <= day(n.until, true)); };
    var i = all.findIndex(function (n) { return n.id === id; }), st = dir < 0 ? -1 : 1, j = i + st;
    while (i >= 0 && j >= 0 && j < all.length && !live(all[j])) j += st;
    if (i >= 0 && j >= 0 && j < all.length && !!all[i].pin === !!all[j].pin) { var t = all[i]; all[i] = all[j]; all[j] = t; }
    var at = {}; all.forEach(function (n, k) { at[n.id] = k; });
    d.notices = d.notices.map(function (n) { return n && at[n.id] !== undefined ? Object.assign({}, n, { order: at[n.id] }) : n; });
    return clean(d);
  }
  function noticeRemove(doc, id) {
    var d = doc0(doc); d.notices = d.notices.filter(function (n) { return !n || n.id !== id; });
    if (d.removed.indexOf(id) < 0) d.removed.push(id);
    return clean(d);
  }
  // the site's notice.json (may have notices from ops.html) + the project's notice.json: each once, none taken off
  function noticeMerge(site, main) {
    var s = doc0(site), m = doc0(main), removed = s.removed.slice();
    m.removed.forEach(function (id) { if (removed.indexOf(id) < 0) removed.push(id); });
    var seen = {}, out = [];
    s.notices.concat(m.notices).forEach(function (n) {
      if (!ok(n) || seen[n.id] || removed.indexOf(n.id) >= 0) return;
      seen[n.id] = 1; out.push(n);
    });
    out = out.map(function (n, i) { return { n: n, i: i }; }).sort(function (a, b) { return (b.n.date || '').localeCompare(a.n.date || '') || a.i - b.i; }).map(function (x) { return x.n; });
    return clean({ note: m.note || s.note, notices: out, removed: removed });
  }
  function noticeText(doc) { return JSON.stringify(doc, null, 2) + '\n'; }
  return { NOTICE_TAGS: NOTICE_TAGS, noticeShown: noticeShown, noticeRead: noticeRead, noticeMarkRead: noticeMarkRead, noticeUnread: noticeUnread, noticeTag: noticeTag, noticeDate: noticeDate,
    noticeCheck: noticeCheck, noticeMake: noticeMake, noticeAdd: noticeAdd, noticeMove: noticeMove, noticeRemove: noticeRemove, noticeMerge: noticeMerge, noticeText: noticeText };
});
