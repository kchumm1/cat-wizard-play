// 운영 달력 화면 (2026-11-23, 형: 쿠폰·패키지를 달력에 적으면 알아서 기간을 걸고, 점검해 주고, 관리해 주게).
// ops.html only. What the month shows and what the 점검 lines say, from the server's calendar rows (ops_calendar), the
// coupons, the notices (notice.json) and the letters (mail.json). Days are Korean days 'YYYY-MM-DD'.
(function (root, f) { var m = f(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  function kday(t) { var n = typeof t === 'number' ? t : Date.parse(t || ''); return isFinite(n) ? new Date(n + 9 * 3600e3).toISOString().slice(0, 10) : ''; }
  var NAME = { pack: '패키지', coupon: '쿠폰', notice: '공지', mail: '편지' }, JOSA = { pack: '가', coupon: '이', notice: '가', mail: '가' };
  function who(x) { return '「' + x.label + '」 ' + NAME[x.kind] + JOSA[x.kind]; }
  // [{ kind: pack|coupon|notice|mail, label, from, until ('' = no end), row? (calendar row), ended, id }]
  function calItems(rows, coupons, notices, letters) {
    var out = [], seen = {};
    (rows || []).forEach(function (r) {
      if (r.kind === 'coupon') seen[r.ref] = 1;
      out.push({ kind: r.kind, label: r.title || r.ref, from: kday(r.starts_at), until: kday(r.ends_at), row: r, ended: !!r.ended_at, id: r.id });
    });
    (coupons || []).forEach(function (c) { if (!seen[c.code] && c.active !== false) out.push({ kind: 'coupon', label: c.title || c.code, from: kday(c.starts_at), until: kday(c.ends_at), id: c.code }); });
    (notices || []).forEach(function (n) { out.push({ kind: 'notice', label: n.title, from: n.from || n.date || '', until: n.until || '', id: n.id }); });
    (letters || []).forEach(function (l) { out.push({ kind: 'mail', label: l.title || l.sub || '편지', from: l.from || l.date || '', until: l.until || '', id: l.id }); });
    return out;
  }
  function on(x, day) { return (!x.from || x.from <= day) && (!x.until || day <= x.until); }
  function calOnDay(items, day) { return (items || []).filter(function (x) { return on(x, day); }); }
  function md(day) { var m = /^\d{4}-(\d\d)-(\d\d)$/.exec(day); return m ? (+m[1]) + '월 ' + (+m[2]) + '일' : day; }
  function diff(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
  // 점검 줄: calendar rows only (the things the calendar turns on and off)
  function calChecks(items, notices, today) {
    var ids = {}; (notices || []).forEach(function (n) { if (n && n.id) ids[n.id] = 1; });
    var out = [];
    (items || []).forEach(function (x) {
      if (!x.row || x.ended || !on(x, today)) return;
      var left = diff(today, x.until);
      if (left === 0) out.push({ level: 'warn', id: x.id, text: who(x) + ' 오늘 밤 12시에 끝나요.' });
      else if (left > 0 && left <= 3) out.push({ level: 'warn', id: x.id, text: who(x) + ' ' + left + '일 뒤(' + md(x.until) + ') 끝나요.' });
    });
    (items || []).forEach(function (x) {
      if (!x.row || x.ended || !on(x, today)) return;
      if (!x.row.notice_id || !ids[x.row.notice_id]) out.push({ level: 'info', id: x.id, text: who(x) + ' 열려 있는데 안내 공지가 없어요.' });
    });
    // 끝난 것 (2026-11-23): 마지막 날이 지났거나 「지금 끝내기」 한 달력 줄, 끝난 지 3일 안만
    (items || []).forEach(function (x) {
      if (!x.row || !x.until || !(x.ended || x.until < today)) return;
      var ago = diff(x.until, today); if (ago < 0 || ago > 3) return;
      out.push({ level: 'done', id: x.id, text: who(x) + ' ' + (ago === 0 ? '오늘' : md(x.until) + '에') + ' 끝났어요.' });
    });
    return out;
  }
  // a period from a start day: n days (7 = 1주, last day included) or 'month' / 'month2'
  function calRange(from, len) {
    var d = new Date(from + 'T12:00:00Z'), until;
    if (len === 'month' || len === 'month2') {
      var add = len === 'month' ? 1 : 2, y = d.getUTCFullYear(), m = d.getUTCMonth() + add, day = d.getUTCDate();
      var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      until = day > last ? new Date(Date.UTC(y, m, last)) : new Date(Date.UTC(y, m, day - 1));
    } else until = new Date(d.getTime() + (Math.max(1, +len) - 1) * 864e5);
    var u = until.toISOString().slice(0, 10);
    return { from: from, until: u, starts_at: from + 'T00:00:00+09:00', ends_at: u + 'T23:59:59+09:00' };
  }
  // a calendar row's first and last Korean day (the server sends UTC)
  function calDays(r) { return { from: kday(r.starts_at), until: kday(r.ends_at) }; }
  return { calDays: calDays, calItems: calItems, calOnDay: calOnDay, calChecks: calChecks, calRange: calRange, CAL_NAME: NAME };
});
