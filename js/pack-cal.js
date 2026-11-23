// 운영 달력 → 상점 패키지 (2026-11-23, 형: 달력에 「패키지 2달」이라고 적으면 그 기간만 팔리고 끝나면 자동으로 안 팔리게).
// The phone reads the open package rows of the server table ops_calendar (signed-in players only, kind = 'pack') when the game
// starts, every minute and when the shop opens, keeps the last table in localStorage, and tells js/packs.js which calendar
// packages are open now (packCalUse). Buying is checked again by the server (act passes the same rows as env.packCal).
// Never fetched yet → js/packs.js uses DATA.packCalDefault.
(function (root) {
  var CW = root.CW = root.CW || {};
  var BASE = 'https://ifqlrmenlyzmxojwspya.supabase.co', ANON = 'sb_publishable_SOyPUpNNkACwLWJbUX-H_A_p-Y-Iwbe', KEY = 'cw-packcal';
  var rows = null, busy = false, last = 0;
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && Array.isArray(saved.rows)) rows = saved.rows; } catch (e) { /* none */ }
  // the rows open at `now`: [{ ref, starts_at, ends_at }]
  function openRows(now) {
    if (!rows) return null; now = now || Date.now();
    return rows.filter(function (r) { var a = Date.parse(r.starts_at), b = Date.parse(r.ends_at); return isFinite(a) && isFinite(b) && a <= now && now <= b; });
  }
  function openIds(now) { var o = openRows(now); return o ? o.map(function (r) { return r.ref; }) : undefined; }
  // the last Korean day a calendar package is on sale ('' when it is not open now), for the shop's 「N일 남음」
  CW.packCalEnd = function (id, now) {
    var o = openRows(now);
    if (o) { var ends = o.filter(function (r) { return r.ref === id; }).map(function (r) { return Date.parse(r.ends_at); }); return ends.length ? new Date(Math.max.apply(null, ends) + 9 * 3600e3).toISOString().slice(0, 10) : ''; }
    var d = ((CW.DATA && CW.DATA.packCalDefault) || []).filter(function (x) { return x.id === id; })[0]; return d ? d.until : '';
  };
  CW.packCalFetch = function (force) {
    if (busy || typeof fetch !== 'function' || (!force && Date.now() - last < 50000)) return;
    busy = true; last = Date.now();
    // 로그인한 실제 사용자만 읽을 수 있음 (2026-11-23, 형: 익명 말고 실사용자로) — 토큰이 없으면 묻지 않고 마지막 표·처음 기간
    Promise.resolve(CW.packCalAuth ? CW.packCalAuth() : null).then(function (a) {
      if (!a || !a.access) return null;
      return fetch(BASE + '/rest/v1/ops_calendar?select=ref,starts_at,ends_at&kind=eq.pack&ended_at=is.null', { headers: { apikey: ANON, Authorization: 'Bearer ' + a.access }, cache: 'no-store' });
    })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (j) {
        if (!Array.isArray(j)) return;
        var changed = JSON.stringify(j) !== JSON.stringify(rows); rows = j;
        try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), rows: rows })); } catch (e) { /* full */ }
        if (changed && root.GAME && root.GAME.ui && root.GAME.ui.renderPanel) root.GAME.ui.renderPanel(true);
      })
      .catch(function () { /* keep the last table */ })
      .then(function () { busy = false; });
  };
  if (CW.packCalUse) CW.packCalUse(openIds);
  setInterval(function () { if (!document.hidden) CW.packCalFetch(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) CW.packCalFetch(); });
})(this);
