(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // 모든 플레이어 저장 (2026-11-18, 형: 스토어에 올릴 거라 익명 로그인·저장 이전 먼저). 형꺼·체험판 both.
  // Each device gets an anonymous Supabase account (Auth REST, no library) and sends its save to the Edge Function
  // save-sync: once soon after the game starts (that first send is how the saves already on phones move to the
  // server), then every 10 minutes when it changed, and when the app is put away. The phone save (cw-save) stays the
  // one that counts: this file never writes it. Anything that fails is only noted (cw-player-sync) and the game goes on.
  // Off on localhost and file: unless the address has ?psync=1 (many local previews stay open; there is one real server).
  //   o.enabled  false → null
  //   o.store    localStorage (or null)
  //   o.fetch    window.fetch
  //   o.now      clock (ms)
  //   o.body()   the save as JSON text
  //   o.info()   a little text about the device and the version (optional)
  var BASE = 'https://ifqlrmenlyzmxojwspya.supabase.co';
  var URL = BASE + '/functions/v1/save-sync';
  var AUTH = BASE + '/auth/v1';
  var ANON = 'sb_publishable_SOyPUpNNkACwLWJbUX-H_A_p-Y-Iwbe';   // the public key (safe in the site's code)
  var AUTH_KEY = 'cw-player-auth', LOG = 'cw-player-sync';
  var EVERY = 10 * 60 * 1000, RETRY = 2 * 60 * 1000, MIN_GAP = 60 * 1000, MAX = 512 * 1024;
  // keepalive (the send made while the app is put away): the browser allows 64KB in bytes for all such sends at once,
  // and owner-sync may send at the same moment, so this one stays under 30KB
  var KEEPALIVE_MAX = 30 * 1024;
  var EARLY = 60 * 1000, WARM = 10 * 60 * 1000, LOCK = 20 * 1000, TIMEOUT = 20 * 1000;
  var NET = '인터넷 연결을 확인해 주세요';
  var AUTH_WAIT = 30 * 60 * 1000;   // sign up refused (off, or too many from this network): ask again only after this

  // the line in 설정 › 문제 확인용 (형꺼): a 429 is only "later", not a failure
  function statusText(s) {
    s = s || {};
    var p2 = function (v) { return (v < 10 ? '0' : '') + v; };
    var hm = function (t) { var d = new Date(t); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
    var later = s.code === 429 && !s.auth;
    return (s.okAt ? '마지막 ' + hm(s.okAt) : '아직') + (s.t && !s.ok ? (later ? ' · ' : ' · 실패: ') + (s.msg || '') : '') + ' · 익명 계정으로 10분마다 올려요';
  }

  function bytes(t) { try { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(t).length : unescape(encodeURIComponent(t)).length; } catch (e) { return t.length * 3; } }
  function allowedHere(loc) {
    loc = loc || {};
    var h = String(loc.hostname || ''), local = loc.protocol === 'file:' || !h || h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
    return !local || /[?&]psync=1(&|$)/.test(String(loc.search || ''));
  }

  function createPlayerSync(o) {
    o = o || {};
    if (!o.enabled) return null;
    var store = o.store || null, now = o.now || function () { return Date.now(); };
    var busy = false, lastTry = -1e15, lastSent = '', inflight = null, wait = o.timeout || TIMEOUT;
    // the login is also kept here: a phone whose storage takes the small status but not the login (nearly full) uses
    // this one for the rest of the session and never signs up a second time (one account per send would follow)
    var memAuth = null, noSignup = false, authErr = 0, sameAt = 0;
    function get(k) { try { return store ? store.getItem(k) : null; } catch (e) { return null; } }
    function put(k, v) { try { if (!store) return; if (v === null) store.removeItem(k); else store.setItem(k, v); } catch (e) { /* storage full or blocked */ } }
    // a phone that cannot keep anything (private mode, full) must not sign up again on every start
    function storeOk() { try { if (!store) return false; store.setItem('cw-player-probe', 'p' + now()); store.removeItem('cw-player-probe'); return true; } catch (e) { return false; } }
    function status() { try { return JSON.parse(get(LOG) || 'null') || {}; } catch (e) { return {}; } }
    function note(r) { var s = status(); s.t = now(); s.ok = r.ok ? 1 : 0; s.msg = r.msg || ''; s.code = r.code || 0; s.auth = r.auth ? 1 : 0; if (r.ok) s.okAt = s.t; put(LOG, JSON.stringify(s)); return r; }
    function storedAuth() { try { return JSON.parse(get(AUTH_KEY) || 'null'); } catch (e) { return null; } }
    function readAuth() {
      var a = null; try { a = JSON.parse(get(AUTH_KEY) || 'null'); } catch (e) { a = null; }
      return memAuth && !(a && a.access) ? memAuth : a;
    }
    function keep(j, prev) {
      if (!j || typeof j.access_token !== 'string' || typeof j.refresh_token !== 'string' || !j.user || typeof j.user.id !== 'string') return null;
      // the phone's own clock from now on: the server's expires_at is not used (a phone's clock can be off)
      var a = { access: j.access_token, refresh: j.refresh_token, exp: now() + (+j.expires_in || 3600) * 1000, uid: j.user.id };
      if (prev) a.prev = prev;   // the account before (a refused refresh made a new one): sent along so rows can be joined by hand
      var text = JSON.stringify(a); memAuth = a; put(AUTH_KEY, text);
      if (get(AUTH_KEY) !== text) noSignup = true;
      return a;
    }
    // a request that never answers (a weak phone signal) would keep busy/inflight set for the whole session
    function timed(opts) {
      if (typeof AbortController === 'undefined') return function () {};
      var ac = new AbortController(), id = setTimeout(function () { ac.abort(); }, wait);
      opts.signal = ac.signal; return function () { clearTimeout(id); };
    }
    function call(url, body) {
      var opts = { method: 'POST', headers: { 'content-type': 'application/json', apikey: ANON }, body: body }, clear = timed(opts);
      return Promise.resolve().then(function () { return o.fetch(url, opts); }).then(function (r) { clear(); return r; }, function (e) { clear(); throw e; });
    }
    // two tabs opening at once: the browser's own lock (navigator.locks, where there is one) lets one sign up and the
    // other then finds that account; without it the lock record in storage below does most of it
    function signup(prev) {
      if (noSignup) return Promise.resolve(null);
      var L = o.locks;
      if (!L || typeof L.request !== 'function') return signupNow(prev);
      return Promise.resolve().then(function () {
        return L.request('cw-player-signup', function () {
          var cur = storedAuth();
          if (cur && cur.access) { memAuth = cur; return cur; }
          return signupNow(prev);
        });
      }).then(null, function () { return signupNow(prev); });
    }
    function signupNow(prev) {
      authErr = 0;
      put(AUTH_KEY, JSON.stringify({ lock: now() }));   // another tab opening at the same moment waits for this one
      return call(AUTH + '/signup', '{}').then(function (res) {
        if (!res || !res.ok) { authErr = res ? res.status : 0; return null; }
        return res.json().then(function (j) { return keep(j, prev); });
      }).then(null, function () { return null; }).then(function (a) { if (!a) put(AUTH_KEY, null); return a; });
    }
    function refresh(a) {
      return call(AUTH + '/token?grant_type=refresh_token', JSON.stringify({ refresh_token: a.refresh })).then(function (res) {
        if (res && res.ok) return res.json().then(function (j) { return keep(j, a.prev); });
        var st = res ? res.status : 0;
        if (st === 400 || st === 401 || st === 403) { put(AUTH_KEY, null); memAuth = null; return signup(a.uid || a.prev); }   // the account is gone: a new one
        return null;
      }).then(null, function () { return null; });
    }
    // resolves to the login, null (no network / server down) or { wait: true } (another tab is signing up)
    function ensureAuth(left) {
      if (inflight) return inflight;
      var a = readAuth();
      if (a && a.access && a.exp - now() > (left || EARLY)) return Promise.resolve(a);
      var p;
      if (a && a.refresh) p = refresh(a);
      else if (a && a.lock && now() - a.lock < LOCK) return Promise.resolve({ wait: true });
      else p = signup();
      inflight = p.then(function (r) { inflight = null; return r; });
      return inflight;
    }
    function done(r) { busy = false; return r; }
    // reason: 'first' | 'tick' | 'hide'. Never throws; resolves to { ok, code, msg } or { skip }.
    function push(reason) {
      try {
        if (!storeOk()) return Promise.resolve({ skip: 'nostore' });
        if (busy) return Promise.resolve({ skip: 'busy' });
        if (!o.fetch) return Promise.resolve({ skip: 'nofetch' });
        var t = now(), first = reason === 'first';
        if (!first && t - lastTry < MIN_GAP) return Promise.resolve({ skip: 'soon' });
        var data = o.body ? o.body() : '';
        if (!data) return Promise.resolve({ skip: 'empty' });
        if (!first && data === lastSent) { sameAt = t; return Promise.resolve({ skip: 'same' }); }
        var info = o.info ? String(o.info() || '') : '';
        var bodyFor = function (a) { return '{"reason":' + JSON.stringify(reason || '') + ',"info":' + JSON.stringify((a && a.prev ? 'prev=' + a.prev + ' ' : '') + info) + ',"data":' + data + '}'; };
        if (bytes(bodyFor(null)) > MAX - 64) return Promise.resolve(note({ ok: false, code: 413, msg: '저장이 너무 커요' }));
        busy = true; lastTry = t;
        var send = function (a, again, plain) {
          var body = bodyFor(a), clear = function () {};
          var opts = { method: 'POST', headers: { 'content-type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + a.access }, body: body };
          if (reason === 'hide' && !plain && bytes(body) < KEEPALIVE_MAX) opts.keepalive = true;   // put away: lets the send finish after the page is hidden
          else clear = timed(opts);
          return Promise.resolve().then(function () { return o.fetch(URL, opts); }).then(function (res) {
            clear();
            if (res && res.ok) {
              lastSent = data; sameAt = 0;
              // 서버 지갑 (2026-11-18): an account with a server wallet gets its server fields back (diamonds etc.)
              var told = o.onServer && res.json ? Promise.resolve().then(function () { return res.json(); }).then(function (j) { if (j && j.server) o.onServer(j.server, j.rules); }, function () { }) : null;
              return Promise.resolve(told).then(function () { return note({ ok: true, code: res.status }); });
            }
            var st = res ? res.status : 0;
            if (st === 401 && !again) {   // the login ran out early: a fresh one, then once more
              var cur = readAuth(); if (cur && cur.access) { cur.exp = 0; put(AUTH_KEY, JSON.stringify(cur)); }
              return ensureAuth().then(function (b) { return b && b.access ? send(b, true) : note({ ok: false, code: 401, msg: '로그인하지 못했어요' }); });
            }
            return note({ ok: false, code: st, msg: st === 401 ? '로그인하지 못했어요' : st === 429 ? '잠시 뒤에 다시 보내요' : st === 413 ? '저장이 너무 커요' : '서버 오류 ' + st });
          }, function () {
            clear();
            if (opts.keepalive) return send(a, again, true);   // the browser refused the keepalive (its 64KB was in use): once more, plainly
            return note({ ok: false, msg: NET });
          });
        };
        return ensureAuth().then(function (a) {
          if (a && a.wait) return { skip: 'noauth' };
          if (!a || !a.access) {
            if (authErr === 422 || authErr === 429) return note({ ok: false, auth: true, code: authErr, msg: authErr === 422 ? '익명 로그인이 꺼져 있어요' : '가입 요청이 많아요 · 30분 뒤에 다시' });
            return note({ ok: false, msg: NET });
          }
          return send(a, false);
        }).then(null, function () { return note({ ok: false, msg: NET }); }).then(done);
      } catch (e) { busy = false; return Promise.resolve({ ok: false, msg: 'error' }); }
    }
    function start() { return push('first'); }
    // called about once a minute while the game is on screen: 10 minutes after a send (or a 429), 2 after a failure
    function tick() {
      if (!storeOk()) return Promise.resolve({ skip: 'nostore' });
      return warm().then(function () {
        var s = status(), t = now();
        var gap = s.auth ? AUTH_WAIT : s.ok || s.code === 401 || s.code === 429 ? EVERY : RETRY;
        if (s.t && t - s.t < gap) return { skip: 'wait' };
        if (sameAt && t - sameAt < EVERY) return { skip: 'wait' };   // looked a moment ago and nothing had changed: not every minute
        return push('tick');
      });
    }
    // while the game is on screen (and when it comes back): a login that runs out within 10 minutes is renewed now, so
    // the send made while the app is put away almost never has to renew it (a renewal cut off there can cost the account)
    function warm() {
      try {
        var a = readAuth();
        if (!o.fetch || busy || !a || !a.access || a.exp - now() > WARM) return Promise.resolve({});
        return ensureAuth(WARM).then(function () { return {}; }, function () { return {}; });
      } catch (e) { return Promise.resolve({}); }
    }
    function userId() { var a = readAuth(); return a && a.uid ? a.uid : ''; }
    // the login for the server wallet (js/wallet.js): renewed or made when needed; null when there is none to be had
    function authed() {
      if (!storeOk() || !o.fetch) return Promise.resolve(null);
      return ensureAuth().then(function (a) { return a && a.access ? a : null; }, function () { return null; });
    }
    return { start: start, tick: tick, push: push, warm: warm, status: status, userId: userId, authed: authed };
  }

  return { createPlayerSync: createPlayerSync, playerSyncAllowed: allowedHere, playerSyncText: statusText, PLAYER_SYNC_URL: URL, PLAYER_AUTH_URL: AUTH, PLAYER_ANON_KEY: ANON, PLAYER_AUTH_KEY: AUTH_KEY, PLAYER_SYNC_LOG: LOG };
});
