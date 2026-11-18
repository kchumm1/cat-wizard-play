(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // Claude에게 저장 보내기 (2026-11-18, the user: 룬·신성력 최강 조합을 내 실제 저장으로 — 저장 코드 붙여넣기 말고 자동으로).
  // 형꺼 only (체험판 never makes one: createOwnerSync returns null). Once the owner pastes a private key in
  // 설정 › 문제 확인용 (kept in this browser's localStorage only, never in the site's code), the save is sent to the
  // Supabase function upload-save every 10 minutes and when the app is put away. The function checks the key and
  // keeps the last few saves in a table nobody can read with the public key; Claude reads it from there.
  // Anything that fails (no network, a wrong key, too soon) is noted on the settings row and the game goes on.
  //   o.friend   체험판 → null
  //   o.store    localStorage (or null)
  //   o.fetch    window.fetch
  //   o.now      clock (ms)
  //   o.body()   the save as JSON text (the same as localStorage cw-save)
  //   o.info()   a little text about the device and the version (optional)
  var URL = 'https://ifqlrmenlyzmxojwspya.supabase.co/functions/v1/upload-save';
  var GET_URL = 'https://ifqlrmenlyzmxojwspya.supabase.co/functions/v1/download-save';
  var KEY = 'cw-claude-key', LOG = 'cw-claude-sync';
  var EVERY = 10 * 60 * 1000, MIN_GAP = 65 * 1000, MAX = 2 * 1024 * 1024, KEEPALIVE_MAX = 60000;
  var KEY_RE = /^[A-Za-z0-9_-]{24,128}$/;

  function createOwnerSync(o) {
    o = o || {};
    if (o.friend) return null;
    var store = o.store || null, now = o.now || function () { return Date.now(); };
    var busy = false, lastTry = -1e15, lastSent = '';
    function get(k) { try { return store ? store.getItem(k) : null; } catch (e) { return null; } }
    function put(k, v) { try { if (!store) return; if (v === null) store.removeItem(k); else store.setItem(k, v); } catch (e) { /* storage full or blocked */ } }
    function status() { try { return JSON.parse(get(LOG) || 'null') || {}; } catch (e) { return {}; } }
    function note(r) { var s = status(); s.t = now(); s.ok = r.ok ? 1 : 0; s.msg = r.msg || ''; s.code = r.code || 0; if (r.ok) { s.okAt = s.t; s.n = r.n; } put(LOG, JSON.stringify(s)); return r; }
    function key() { var k = get(KEY); return k && KEY_RE.test(k) ? k : ''; }
    function setKey(k) {
      k = String(k || '').replace(/\s+/g, '');
      if (!KEY_RE.test(k)) return false;
      put(KEY, k); lastSent = ''; lastTry = -1e15; return true;
    }
    function clearKey() { put(KEY, null); put(LOG, null); lastSent = ''; }
    function done(r) { busy = false; return r; }
    // reason: 'tick' | 'hide' | 'now' (지금 보내기). Never throws; resolves to { ok, skip, msg }.
    function push(reason) {
      try {
        var k = key();
        if (!k) return Promise.resolve({ skip: 'nokey' });
        if (busy) return Promise.resolve({ skip: 'busy' });
        var t = now();
        if (t - lastTry < MIN_GAP) return Promise.resolve({ skip: 'soon' });
        var data = o.body ? o.body() : '';
        if (!data) return Promise.resolve({ skip: 'empty' });
        if (data === lastSent && reason !== 'now') return Promise.resolve({ skip: 'same' });
        var body = '{"reason":' + JSON.stringify(reason || '') + ',"info":' + JSON.stringify(o.info ? String(o.info() || '') : '') + ',"data":' + data + '}';
        if (body.length > MAX) return Promise.resolve(note({ ok: false, msg: '저장이 너무 커요' }));
        if (!o.fetch) return Promise.resolve({ skip: 'nofetch' });
        busy = true; lastTry = t;
        var opts = { method: 'POST', headers: { 'content-type': 'application/json', 'x-owner-key': k }, body: body };
        if (body.length < KEEPALIVE_MAX) opts.keepalive = true;   // put away: lets the send finish after the page is hidden
        return Promise.resolve().then(function () { return o.fetch(URL, opts); }).then(function (res) {
          if (res && res.ok) { lastSent = data; return done(note({ ok: true, n: body.length })); }
          var st = res ? res.status : 0;
          return done(note({ ok: false, code: st, msg: st === 401 ? '열쇠가 맞지 않아요' : st === 429 ? '잠시 뒤에 다시 보내요' : st === 413 ? '저장이 너무 커요' : '서버 오류 ' + st }));
        }, function () { return done(note({ ok: false, msg: '인터넷 연결을 확인해 주세요' })); });
      } catch (e) { busy = false; return Promise.resolve({ ok: false, msg: 'error' }); }
    }
    // called about once a minute while the game is on screen: sends when 10 minutes have passed since the last send
    function tick() {
      var s = status(), t = now();
      if (!key()) return Promise.resolve({ skip: 'nokey' });
      // after a send: 10 minutes; after a failure: 2 minutes (no network), 10 with a wrong key (no knocking every minute)
      var wait = s.ok || s.code === 401 ? EVERY : 2 * 60 * 1000;
      if (s.t && t - s.t < wait) return Promise.resolve({ skip: 'wait' });
      return push('tick');
    }
    // 저장 되돌리기 (2026-11-18): the kept save back from the server ('top' = the furthest, the default).
    // Never throws; resolves to { ok, data, savedAt } or { ok: false, msg }.
    function fetchSave(slot) {
      try {
        var k = key();
        if (!k) return Promise.resolve({ ok: false, msg: '열쇠를 먼저 넣어 주세요' });
        if (!o.fetch) return Promise.resolve({ ok: false, msg: '인터넷 연결을 확인해 주세요' });
        var opts = { method: 'POST', headers: { 'content-type': 'application/json', 'x-owner-key': k }, body: JSON.stringify({ slot: slot === 'latest' ? 'latest' : 'top' }) };
        return Promise.resolve().then(function () { return o.fetch(GET_URL, opts); }).then(function (res) {
          if (!res || !res.ok) {
            var st = res ? res.status : 0;
            return { ok: false, code: st, msg: st === 401 ? '열쇠가 맞지 않아요' : st === 404 ? '서버에 저장이 없어요' : '서버 오류 ' + st };
          }
          return res.json().then(function (j) {
            if (!j || !j.data || typeof j.data !== 'object') return { ok: false, msg: '서버 저장을 읽지 못했어요' };
            return { ok: true, data: j.data, savedAt: Date.parse(j.saved_at) || 0 };
          });
        }).then(null, function () { return { ok: false, msg: '인터넷 연결을 확인해 주세요' }; });
      } catch (e) { return Promise.resolve({ ok: false, msg: 'error' }); }
    }
    return { key: key, setKey: setKey, clearKey: clearKey, status: status, push: push, tick: tick, fetchSave: fetchSave };
  }
  // how far a save has come: 차수 first, then level (a fresh start after the app was deleted is far behind)
  function ahead(a, b) {
    var ta = +(a && a.tier) || 0, tb = +(b && b.tier) || 0, la = +(a && a.level) || 0, lb = +(b && b.level) || 0;
    return ta > tb || (ta === tb && la > lb + 10);
  }

  return { createOwnerSync: createOwnerSync, ownerSaveAhead: ahead, OWNER_SYNC_URL: URL, OWNER_GET_URL: GET_URL, OWNER_SYNC_KEY: KEY, OWNER_SYNC_LOG: LOG, OWNER_SYNC_EVERY: EVERY };
});
