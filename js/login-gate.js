(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  // 아이디 로그인 (2026-11-18, 형: 앱게임처럼 아이디·비밀번호, 폰·태블릿에서 같은 캐릭터).
  // The game opens on a login screen until this browser holds a login with an id (cw-player-auth has "lid"). From then on
  // it opens straight into the game, and 설정 › 로그아웃 comes back to this screen. The password is kept by Supabase Auth
  // (the id becomes the Auth email id@cw-login.invalid); the Edge Function account gives an id to the account this device
  // already has (so the save it sent stays), and hands out the save kept for an id. Nothing here shows what kind of
  // account it is: that is only marked on the server.
  //   login   password login → the save of that id replaces this device's save (the old one is kept under cw-save-login-bak)
  //   signup  a new id on this device's account (the progress here stays with it); on a device with no login yet, a new one
  //   change  a new password (설정 › 비밀번호 변경, and at once after a temporary password made on the operator page)
  //   open    when the game opens with a login: this device becomes the one playing the id, and a newer save made on
  //           another device comes in first (this device's save is kept under cw-save-sync-bak)
  //   check   about once a minute and when the game comes back: another device opened the id → 「다른 기기에서 접속했어요」
  //   logout  the save is sent once more, this device's save is kept under cw-save-logout-bak and cleared, the login removed
  // Switching saves reloads the page, so the game always starts from what is stored. CW_NOSAVE stops the game from writing
  // its old state over the storage while that happens (js/state.js).
  var BASE = 'https://ifqlrmenlyzmxojwspya.supabase.co';
  var AUTH = BASE + '/auth/v1', ACCOUNT = BASE + '/functions/v1/account';
  var ANON = 'sb_publishable_SOyPUpNNkACwLWJbUX-H_A_p-Y-Iwbe';
  var AUTH_KEY = 'cw-player-auth', SAVE = 'cw-save', LOG = 'cw-player-sync';
  var SID_KEY = 'cw-device-sid', MARK = 'cw-sync-mark';   // this device · the newest server save this device already has
  var MAIL = '@cw-login.invalid', ID_RE = /^[a-z0-9]{3,16}$/;
  var TIMEOUT = 20 * 1000, NET = '인터넷 연결을 확인해 주세요';

  function idOk(id) { return ID_RE.test(String(id || '')); }
  function pwOk(pw) { pw = String(pw || ''); return pw.length >= 8 && pw.length <= 72; }
  // what the screen says for each refusal (the server's msg or the Auth error code)
  var SUSPENDED = '이용이 정지된 계정이에요.';
  function say(code, msg) {
    if (msg === 'suspended') return SUSPENDED;
    if (msg === 'taken') return '이미 있는 아이디예요. 다른 아이디로 해 주세요.';
    if (msg === 'id') return '아이디는 영어 소문자와 숫자 3~16자로 해 주세요.';
    if (msg === 'pw') return '비밀번호는 8자 이상, 72바이트 이내로 입력해 주세요.';
    if (code === 429) return '잠시 뒤에 다시 해 주세요.';
    if (code === 400 || code === 401) return '아이디나 비밀번호가 맞지 않아요.';
    return NET;
  }

  function createGate(o) {
    o = o || {};
    var store = o.store || null, now = o.now || function () { return Date.now(); }, fetchFn = o.fetch, reload = o.reload || function () {};
    function get(k) { try { return store ? store.getItem(k) : null; } catch (e) { return null; } }
    function put(k, v) { try { if (!store) return false; if (v === null) store.removeItem(k); else store.setItem(k, v); return true; } catch (e) { return false; } }
    function auth() { try { return JSON.parse(get(AUTH_KEY) || 'null'); } catch (e) { return null; } }
    function loginId() { var a = auth(); return a && a.lid ? a.lid : ''; }
    function loggedIn() { return !!loginId(); }
    function hasSave() { return !!get(SAVE); }
    // real progress on this device (the empty start save the game writes by itself does not count)
    function hasProgress() { try { var d = JSON.parse(get(SAVE) || 'null'); return !!d && ((d.tier || 1) > 1 || (d.level || 1) > 1 || (d.stage || 0) > 0 || (d.kills || 0) > 0); } catch (e) { return false; } }
    function req(url, body, headers) {
      var opts = { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', apikey: ANON }, headers || {}), body: JSON.stringify(body || {}) }, id = null;
      if (typeof AbortController !== 'undefined') { var ac = new AbortController(); opts.signal = ac.signal; id = setTimeout(function () { ac.abort(); }, TIMEOUT); }
      return Promise.resolve().then(function () { return fetchFn(url, opts); }).then(function (res) { if (id) clearTimeout(id); return res; }, function (e) { if (id) clearTimeout(id); throw e; })
        .then(function (res) { return res.json().then(function (j) { return { code: res.status, ok: res.ok, j: j || {} }; }, function () { return { code: res.status, ok: res.ok, j: {} }; }); });
    }
    function rec(j, lid) {
      if (!j || typeof j.access_token !== 'string' || typeof j.refresh_token !== 'string' || !j.user || typeof j.user.id !== 'string') return null;
      var a = { access: j.access_token, refresh: j.refresh_token, exp: now() + (+j.expires_in || 3600) * 1000, uid: j.user.id };
      if (lid) a.lid = lid;
      return a;
    }
    function info() { return o.info ? String(o.info() || '').slice(0, 200) : ''; }
    function save(a) { return put(AUTH_KEY, JSON.stringify(a)) && get(AUTH_KEY) === JSON.stringify(a); }
    // this device: made once, kept through logins and logouts (the saves it sends say "sid=..." so the server knows who wrote them)
    var memSid = '';
    function sid() {
      var v = get(SID_KEY) || memSid;
      if (!/^[A-Za-z0-9]{8,32}$/.test(v || '')) {
        var A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', r = '', b = null;
        try { b = (root.crypto || {}).getRandomValues ? root.crypto.getRandomValues(new Uint8Array(16)) : null; } catch (e) { b = null; }
        for (var i = 0; i < 16; i++) r += A[(b ? b[i] : Math.floor(Math.random() * 256)) % A.length];
        v = r; put(SID_KEY, v);
      }
      memSid = v; return v;
    }
    function mark(t) { if (t) put(MARK, String(t)); return get(MARK) || ''; }
    var kicked = false, accountSuspended = false;
    function isKicked() { return kicked; }
    function suspended(r) {
      if (r.code !== 403 || r.j.msg !== 'suspended') return false;
      kicked = true; accountSuspended = true;
      root.CW_NOSAVE = true;
      if (o.onSuspended) o.onSuspended();
      return true;
    }
    // this device's own (anonymous) account with a usable token: its own, or a new one when the device has none yet
    function deviceAccount() {
      var a = auth();
      if (a && a.access && a.lid) return Promise.resolve({ a: a, err: 'already' });
      var fresh = function (cur) { return cur && cur.access && cur.exp - now() > 60 * 1000; };
      if (fresh(a)) return Promise.resolve({ a: a });
      var p = a && a.refresh ? req(AUTH + '/token?grant_type=refresh_token', { refresh_token: a.refresh }).then(function (r) { return r.ok ? rec(r.j, null) : null; }) : Promise.resolve(null);
      return p.then(function (n) { return n || req(AUTH + '/signup', {}).then(function (r) { return r.ok ? rec(r.j, null) : null; }); })
        .then(function (n) { return n ? { a: n } : { err: 'net' }; });
    }
    // a new id on this device's account
    function signup(id, pw) {
      id = String(id || '').toLowerCase();
      if (!idOk(id)) return Promise.resolve({ ok: false, msg: say(400, 'id') });
      if (!pwOk(pw)) return Promise.resolve({ ok: false, msg: say(400, 'pw') });
      return deviceAccount().then(function (d) {
        if (d.err === 'net' || !d.a) return { ok: false, msg: NET };
        if (d.err === 'already') return { ok: true, id: d.a.lid };
        var a = d.a;
        return req(ACCOUNT, { act: 'register', id: id, pw: pw, info: info() }, { Authorization: 'Bearer ' + a.access }).then(function (r) {
          if (r.ok) {
            if (r.j.now) mark(r.j.now);   // this device's own progress is the newest from here on
            // giving the account its id ends the old login of this device: sign in again with the new password for a fresh one
            return req(AUTH + '/token?grant_type=password', { email: id + MAIL, password: String(pw) }).then(function (t) {
              var n = t.ok ? rec(t.j, id) : null;
              if (!n) return { ok: false, msg: '아이디는 만들었어요. 로그인 화면에서 로그인해 주세요.' };
              if (!save(n)) return { ok: false, msg: '이 기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.' };
              return { ok: true, id: id };
            });
          }
          if (r.code === 409 && r.j.msg === 'already' && r.j.login_id) {
            a.lid = r.j.login_id;
            if (!save(a)) return { ok: false, msg: '이 기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.' };
            return { ok: true, id: a.lid };
          }
          return { ok: false, msg: say(r.code, r.j.msg) };
        });
      }).then(null, function () { return { ok: false, msg: NET }; });
    }
    // an id and its password: the save kept for that id comes in
    function login(id, pw) {
      id = String(id || '').toLowerCase();
      if (!idOk(id) || !pw) return Promise.resolve({ ok: false, msg: say(400, '') });
      return req(AUTH + '/token?grant_type=password', { email: id + MAIL, password: String(pw) }).then(function (r) {
        var a = r.ok ? rec(r.j, id) : null;
        if (!a) return { ok: false, msg: say(r.code, '') };
        return req(ACCOUNT, { act: 'enter', info: info() }, { Authorization: 'Bearer ' + a.access }).then(function (e) {
          if (!e.ok) return { ok: false, msg: e.code === 404 ? say(400, '') : say(e.code, e.j.msg) };
          if (o.maxTier && e.j.data && e.j.data.tier > o.maxTier) return { ok: false, msg: '체험판에서는 9차까지의 캐릭터로 로그인할 수 있어요.' };
          var mine = get(SAVE), data = e.j.data && typeof e.j.data === 'object' ? JSON.stringify(e.j.data) : '';
          if (mine && mine !== data) put('cw-save-login-bak', mine);   // what this device had before: kept, in case it was something
          root.CW_NOSAVE = true;
          if (data) { if (!put(SAVE, data)) { root.CW_NOSAVE = false; return { ok: false, msg: '이 기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.' }; } }
          else put(SAVE, null);
          put(LOG, null); mark(e.j.saved_at || e.j.now || '');
          if (!save(a)) { root.CW_NOSAVE = false; return { ok: false, msg: '이 기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.' }; }
          return { ok: true, id: id, fresh: !data, mustChange: !!e.j.must_change };
        });
      }).then(null, function () { return { ok: false, msg: NET }; });
    }
    // a usable token of the login kept here (renewed when it is about to run out)
    function current() {
      var a = auth();
      if (!a || !a.lid) return Promise.resolve(null);
      if (a.access && a.exp - now() > 60 * 1000) return Promise.resolve(a);
      if (!a.refresh) return Promise.resolve(null);
      return req(AUTH + '/token?grant_type=refresh_token', { refresh_token: a.refresh }).then(function (r) { var n = r.ok ? rec(r.j, a.lid) : null; if (n) save(n); return n; });
    }
    // the game opened with a login: claim the id for this device; a newer save from another device replaces this one (reload)
    function open() {
      if (!loggedIn()) return Promise.resolve({ skip: 'nologin' });
      return current().then(function (a) {
        if (!a) return { skip: 'noauth' };
        return req(ACCOUNT, { act: 'open', sid: sid(), mark: mark(), info: info() }, { Authorization: 'Bearer ' + a.access }).then(function (r) {
          if (suspended(r)) return { ok: false, suspended: true };
          if (!r.ok) return { ok: false, code: r.code };
          kicked = false;
          if (r.j.adopt && r.j.data && typeof r.j.data === 'object') {
            var mine = get(SAVE), data = JSON.stringify(r.j.data);
            if (mine && mine !== data) put('cw-save-sync-bak', mine);
            root.CW_NOSAVE = true;
            if (!put(SAVE, data)) { root.CW_NOSAVE = false; return { ok: false, msg: 'store' }; }
            mark(r.j.saved_at); put(LOG, null);
            if (o.onAdopt) { try { o.onAdopt(); } catch (e) { /* the reload still comes */ } }
            reload();
            return { ok: true, adopted: true };
          }
          if (r.j.saved_at && !(Date.parse(mark()) >= Date.parse(r.j.saved_at))) mark(r.j.saved_at);
          return { ok: true, adopted: false };
        });
      }).then(null, function () { return { ok: false, msg: NET }; });
    }
    // is this device still the one playing? (another device opened the id since → o.onKicked)
    function check() {
      if (!loggedIn() || kicked) return Promise.resolve({ skip: true });
      return current().then(function (a) {
        if (!a) return { skip: 'noauth' };
        return req(ACCOUNT, { act: 'check', sid: sid() }, { Authorization: 'Bearer ' + a.access }).then(function (r) {
          if (suspended(r)) return { ok: false, suspended: true };
          if (r.ok && r.j.mine === false) { kicked = true; if (o.onKicked) { try { o.onKicked(); } catch (e) { /* shown anyway next time */ } } return { ok: true, kicked: true }; }
          return { ok: r.ok, kicked: false };
        });
      }).then(null, function () { return { ok: false }; });
    }
    // a new password for the id logged in here; then a fresh login with it (the server may end the old one)
    function changePassword(pw) {
      if (!pwOk(pw)) return Promise.resolve({ ok: false, msg: say(400, 'pw') });
      return current().then(function (a) {
        if (!a) return { ok: false, msg: '로그인이 풀렸어요. 다시 로그인해 주세요.' };
        return req(ACCOUNT, { act: 'password', pw: String(pw) }, { Authorization: 'Bearer ' + a.access }).then(function (r) {
          if (!r.ok) return { ok: false, msg: r.j.msg === 'pw' ? say(400, 'pw') : NET };
          return req(AUTH + '/token?grant_type=password', { email: a.lid + MAIL, password: String(pw) }).then(function (t) {
            var n = t.ok ? rec(t.j, a.lid) : null;
            if (n) save(n);
            return { ok: true, id: a.lid };
          });
        });
      }).then(null, function () { return { ok: false, msg: NET }; });
    }
    // sendLast(): resolves once the newest save is on the server (or failed); the sign-out goes on either way
    function logout(sendLast) {
      return Promise.resolve().then(function () { return sendLast ? sendLast() : null; }).then(null, function () { return null; }).then(function (r) {
        var sent = !!(r && r.ok);
        root.CW_NOSAVE = true;
        var mine = get(SAVE); if (mine) put('cw-save-logout-bak', mine);
        put(SAVE, null); put(AUTH_KEY, null); put(LOG, null);
        reload();
        return { ok: true, sent: sent };
      });
    }
    return { loginId: loginId, loggedIn: loggedIn, hasSave: hasSave, hasProgress: hasProgress, signup: signup, login: login, changePassword: changePassword, logout: logout, open: open, check: check, sid: sid, isKicked: isKicked, isSuspended: function () { return accountSuspended; } };
  }

  // ---------- the screen ----------
  var CSS = '#cwLogin{position:fixed;inset:0;z-index:100000;overflow:auto;-webkit-overflow-scrolling:touch;background:#16213a url("art/ui-up-bg.webp") center/cover no-repeat;color:#fff7e6;font-family:"Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;'
    + 'padding:calc(env(safe-area-inset-top,0px) + 16px) calc(env(safe-area-inset-right,0px) + 16px) calc(env(safe-area-inset-bottom,0px) + 16px) calc(env(safe-area-inset-left,0px) + 16px);-webkit-tap-highlight-color:transparent;overscroll-behavior:contain}'
    + '/* 2026-11-18 형: 로그인할 때 위로 밀리고 아래로 당겨져 → the card sits near the top instead of the middle (the iPhone keyboard changes the height, and a centred card jumped with it), and the message line keeps two lines of room so a new message does not move the buttons */'
    + '#cwLogin *{box-sizing:border-box}#cwLogin .lg-wrap{display:flex;align-items:flex-start;justify-content:center;padding-top:clamp(0px,4vh,28px)}'
    + '#cwLogin .lg-card{width:100%;max-width:420px;padding:22px 20px 16px;border-radius:20px;background:rgba(18,26,52,.87);border:1px solid rgba(255,230,170,.34);box-shadow:0 10px 40px rgba(6,10,28,.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}'
    + '#cwLogin .lg-brand{text-align:center;font-size:14px;font-weight:800;color:#ffe2a0;margin-bottom:8px}#cwLogin h1{margin:0;text-align:center;font:800 27px/1.25 "Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;color:#fff4d4;word-break:keep-all}'
    + '#cwLogin .lg-sub{margin:8px 0 16px;text-align:center;font-size:14px;line-height:1.55;color:#f5e8c8;word-break:keep-all}'
    + '#cwLogin label{display:block;margin:12px 0 6px;font-size:14px;font-weight:700;color:#fff0cf}'
    + '#cwLogin input{display:block;width:100%;height:50px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,230,170,.45);background:rgba(255,250,235,.95);color:#3b3027;font:16px "Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;-webkit-appearance:none;appearance:none;outline:none;touch-action:manipulation}'
    + '#cwLogin input:focus{border-color:#ffd986;box-shadow:0 0 0 3px rgba(255,217,134,.35)}'
    + '#cwLogin .lg-msg{min-height:19px;margin:9px 2px 0;font-size:14px;line-height:1.45;color:#ffb4a0;word-break:keep-all}#cwLogin .lg-msg.ok{color:#bfe8c4}'
    + '#cwLogin .lg-note{margin:6px 2px 0;font-size:12px;line-height:1.5;color:#d9cba4;word-break:keep-all}'
    + '#cwLogin button{display:block;width:100%;min-height:50px;margin-top:12px;border-radius:13px;font:800 16px "Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;cursor:pointer;touch-action:manipulation;-webkit-appearance:none;appearance:none}'
    + '#cwLogin .lg-go{border:1px solid #d9b873;background:linear-gradient(#efd291,#e7b86d);color:#382715;box-shadow:0 3px 0 #98703c}#cwLogin .lg-go:active{transform:translateY(2px);box-shadow:0 1px 0 #98703c}'
    + '#cwLogin .lg-alt{border:1px solid rgba(255,230,170,.4);background:transparent;color:#f2dfae;font-weight:700}'
    + '#cwLogin button[disabled]{opacity:.55}'
    + '#cwLogin .lg-link{min-height:44px;margin-top:6px;border:0;background:transparent;color:#d9cba4;font-weight:600;font-size:14px;text-decoration:underline;text-underline-offset:3px}'
    + '#cwLogin .lg-unused{margin:14px 0 4px;padding:14px 8px;border-radius:12px;border:1px dashed rgba(255,230,170,.6);background:rgba(255,250,235,.95);color:#3b3027;text-align:center;font:800 21px/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;-webkit-user-select:text;user-select:text;word-break:break-all}'
    + '#cwLogin [hidden]{display:none!important}';

  function openScreen(gate, o) {
    o = o || {};
    var doc = o.doc || root.document;
    if (!doc || doc.getElementById('cwLogin')) return;
    var st = doc.createElement('style'); st.id = 'cwLoginCss'; st.textContent = CSS; doc.head.appendChild(st);
    var el = doc.createElement('div'); el.id = 'cwLogin'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '로그인');
    var mode = 'login', busy = false;
    el.innerHTML = '<div class="lg-wrap"><form class="lg-card" novalidate>'
      + '<h1>냥법사</h1><div class="lg-sub" data-k="sub"></div>'
      + '<label for="lgId">아이디</label><input id="lgId" name="username" type="text" inputmode="latin" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="16" placeholder="영어 소문자·숫자 3~16자">'
      + '<div data-k="pwBox"><label for="lgPw" data-k="pwLabel">비밀번호</label><input id="lgPw" name="password" type="password" autocomplete="current-password" maxlength="72" placeholder="8자 이상"></div>'
      + '<div data-k="pw2" hidden><label for="lgPw2">비밀번호 확인</label><input id="lgPw2" name="password2" type="password" autocomplete="new-password" maxlength="72"></div>'
      + '<div class="lg-note" data-k="note"></div><div class="lg-msg" data-k="msg" role="alert" aria-live="polite"></div>'
      + '<button type="submit" class="lg-go" data-k="go"></button><button type="button" class="lg-alt" data-k="alt"></button><button type="button" class="lg-link" data-k="forgot">비밀번호를 잊었어요</button></form></div>';
    doc.body.appendChild(el);
    function q(k) { return el.querySelector('[data-k="' + k + '"]'); }
    var idI = el.querySelector('#lgId'), pwI = el.querySelector('#lgPw'), pw2I = el.querySelector('#lgPw2');
    function msg(t, ok) { var m = q('msg'); m.textContent = t || ''; m.className = 'lg-msg' + (ok ? ' ok' : ''); }
    var FORGOT = '운영자에게 아이디를 알려 주세요. 받은 임시 비밀번호로 로그인한 뒤 새 비밀번호를 정해 주세요.';
    function paint() {
      var reg = mode === 'signup', ch = mode === 'change';
      q('sub').textContent = ch ? '새 비밀번호를 정해 주세요' : reg ? '회원가입' : '로그인';
      el.querySelector('label[for="lgId"]').hidden = ch; idI.hidden = ch;
      q('pw2').hidden = !(reg || ch);
      q('pwLabel').textContent = ch ? '새 비밀번호' : '비밀번호';
      pwI.setAttribute('autocomplete', reg || ch ? 'new-password' : 'current-password');
      q('go').textContent = ch ? '비밀번호 바꾸고 시작하기' : reg ? '가입하기' : '로그인';
      q('alt').hidden = ch;
      q('alt').textContent = reg ? '로그인으로 돌아가기' : '회원가입';
      q('forgot').hidden = mode !== 'login';
      q('note').textContent = ch ? '임시 비밀번호로 들어왔어요. 앞으로 쓸 비밀번호를 정해 주세요. 캐릭터는 그대로예요.'
        : reg ? (gate.hasProgress() ? '지금 이 기기에서 키우던 캐릭터가 이 아이디에 이어져요. ' : '새 캐릭터로 시작해요. ') + '비밀번호는 설정에서 바꿀 수 있어요.'
        : '같은 아이디로 모험을 이어가세요.';
      msg('');
    }
    function lock(b) { busy = b; q('go').disabled = b; q('alt').disabled = b; q('forgot').disabled = b; }
    // 로그인하면 바로 게임으로 (2026-11-24, 형): the page reloads with the new save, and the update screen goes straight in
    // without 「모험 시작」 (js/update-screen.js cwAutoStart)
    function enter() {
      msg('들어가요…', true);
      try { root.sessionStorage.setItem('cwAutoStart', '1'); } catch (e) { /* the update screen just waits for 모험 시작 */ }
      if (o.reload) o.reload(); else { lock(false); el.remove(); st.remove(); }
    }
    el.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault(); if (busy) return;
      var pw = pwI.value;
      if (mode === 'change') {
        if (!pwOk(pw)) { msg(say(400, 'pw')); return; }
        if (pw !== pw2I.value) { msg('비밀번호가 서로 달라요.'); return; }
        lock(true); msg('바꾸는 중이에요…', true);
        gate.changePassword(pw).then(function (r) { if (!r.ok) { lock(false); msg(r.msg); return; } enter(); });
        return;
      }
      var id = idI.value.trim().toLowerCase();
      if (!ID_RE.test(id)) { msg(say(400, 'id')); return; }
      if (mode === 'signup') {
        if (!pwOk(pw)) { msg(say(400, 'pw')); return; }
        if (pw !== pw2I.value) { msg('비밀번호가 서로 달라요.'); return; }
      } else if (!pw) { msg('비밀번호를 넣어 주세요.'); return; }
      lock(true); msg(mode === 'signup' ? '만드는 중이에요…' : '로그인하는 중이에요…', true);
      (mode === 'signup' ? gate.signup(id, pw) : gate.login(id, pw)).then(function (r) {
        if (!r.ok) { lock(false); msg(r.msg); return; }
        if (r.mustChange) { mode = 'change'; lock(false); pwI.value = ''; pw2I.value = ''; paint(); try { pwI.focus(); } catch (x) { /* no focus */ } return; }
        enter();
      });
    });
    q('alt').addEventListener('click', function () { if (busy) return; mode = mode === 'login' ? 'signup' : 'login'; paint(); });
    q('forgot').addEventListener('click', function () { if (busy) return; msg(FORGOT, true); });
    paint();
    try { idI.focus(); } catch (e) { /* no focus */ }
  }

  // 「다른 기기에서 접속했어요」: over the whole game; 「이 기기에서 계속하기」 reloads (the opening takes the id back and brings the
  // newest save, so nothing made on the other device is lost)
  function kickedScreen(o) {
    o = o || {};
    var doc = o.doc || root.document;
    if (!doc) return;
    var previous = doc.getElementById('cwLogin');
    if (previous && !o.suspended) return;
    if (previous) previous.remove();
    if (!doc.getElementById('cwLoginCss')) { var st = doc.createElement('style'); st.id = 'cwLoginCss'; st.textContent = CSS; doc.head.appendChild(st); }
    var el = doc.createElement('div'); el.id = 'cwLogin'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
    if (o.suspended) {
      el.innerHTML = '<div class="lg-wrap"><div class="lg-card"><h1>냥법사</h1><div class="lg-sub">계정 이용 정지</div>'
        + '<p class="lg-note">이용이 정지된 계정이에요. 정지가 풀린 뒤 다시 확인해 주세요.</p>'
        + '<button type="button" class="lg-go">다시 확인</button></div></div>';
      doc.body.appendChild(el);
      el.querySelector('button').onclick = function () { if (o.reload) o.reload(); };
      return;
    }
    el.innerHTML = '<div class="lg-wrap"><div class="lg-card"><h1>냥법사</h1><div class="lg-sub">다른 기기에서 접속했어요</div>'
      + '<div class="lg-note">같은 아이디로 다른 기기에서 게임을 열어서, 이 기기는 연결이 끊겼어요. 이 기기에서 계속하면 다른 기기에서 한 진행을 받아 와서 이어서 해요.</div>'
      + '<button type="button" class="lg-go">이 기기에서 계속하기</button></div></div>';
    doc.body.appendChild(el);
    el.querySelector('button').addEventListener('click', function () { this.disabled = true; this.textContent = '불러오는 중이에요…'; if (o.reload) o.reload(); });
  }
  // while a newer save from another device comes in (a moment before the reload)
  function busyScreen(text, o) {
    o = o || {};
    var doc = o.doc || root.document;
    if (!doc || doc.getElementById('cwLogin')) return;
    if (!doc.getElementById('cwLoginCss')) { var st = doc.createElement('style'); st.id = 'cwLoginCss'; st.textContent = CSS; doc.head.appendChild(st); }
    var el = doc.createElement('div'); el.id = 'cwLogin';
    el.innerHTML = '<div class="lg-wrap"><div class="lg-card"><h1>냥법사</h1><div class="lg-sub"></div></div></div>';
    el.querySelector('.lg-sub').textContent = text;
    doc.body.appendChild(el);
  }

  // main.js: nothing happens off the real site (localhost without ?psync=1), or once a login is kept here
  function startGate(env) {
    env = env || {};
    if (!env.allowed) return null;
    var g = createGate({ maxTier: env.maxTier, store: env.store, fetch: env.fetch, now: env.now, reload: env.reload, info: env.info,
      onSuspended: function () { if (env.doc !== false) kickedScreen({ doc: env.doc, reload: env.reload, suspended: true }); },
      onKicked: function () { if (env.doc !== false) kickedScreen({ doc: env.doc, reload: env.reload }); },
      onAdopt: function () { if (env.doc !== false) busyScreen('다른 기기에서 한 진행을 받아 오는 중이에요…', { doc: env.doc }); } });
    // 업데이트 화면 먼저 (2026-11-24, 형: 업데이트 창 → 다 받으면 로그인 창 → 로그인하면 모험 시작 없이 바로 게임): the login
    // screen takes the place of 「모험 시작」 once the update screen has everything (js/update-screen.js CW.updateHold); with no
    // update screen (frames, ?noupdate) it opens at once as before
    if (!g.loggedIn()) {
      if (env.doc !== false) {
        var show = function () { if (!g.loggedIn()) openScreen(g, { doc: env.doc, reload: env.reload }); };
        var hold = env.updateHold || (root.CW && root.CW.updateHold);
        if (!(hold && hold(show))) show();
      }
      return g;
    }
    if (env.watch !== false) {
      g.open();
      var doc = env.doc || root.document;
      setInterval(function () { if (!doc || !doc.hidden) g.check(); }, 60 * 1000);
      if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', function () { if (!doc.hidden) g.check(); });
    }
    return g;
  }

  return { createLoginGate: createGate, openLoginScreen: openScreen, loginKickedScreen: kickedScreen, startLoginGate: startGate, loginIdOk: idOk, loginPwOk: pwOk, LOGIN_MAIL: MAIL };
});
