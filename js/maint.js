(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  // 서버 점검 (2026-11-24, 형: 실제로 서버 점검이 있어서 사람들이 접속 못 하게 하려면)
  // The operator page turns the 점검 switch on (Supabase private.maintenance). The game asks public.maint_status when it
  // opens, about once a minute and when it comes back on screen. While 점검 is on it saves once, stops the game loop
  // (js/main.js frame) and covers everything, the login screen too, with the 점검 중 screen. When the end time comes (or
  // the switch goes off) the page reloads, so the game starts again from what is stored and the usual 돌아왔어요 comes.
  // The Edge Functions refuse with 'maint' meanwhile (supabase/functions/_shared/account-access.ts), so going around
  // this screen gives nothing. Operator accounts (kind ops, e.g. nyangops) come back exempt and play on.
  // From 30 minutes before the start a small band says when it starts. No line = nothing changes (the game plays on).
  // Local test: ?maintdemo=1 (on) · ?maintdemo=soon shows the screen/band with made-up times, without the server.
  var BASE = 'https://ifqlrmenlyzmxojwspya.supabase.co';
  var URL = BASE + '/rest/v1/rpc/maint_status';
  var ANON = 'sb_publishable_SOyPUpNNkACwLWJbUX-H_A_p-Y-Iwbe';
  var SOON = 30 * 60 * 1000, EVERY = 60 * 1000, WHILE_ON = 30 * 1000, TIMEOUT = 15 * 1000;
  // 형이 GPT로 만든 점검 표지판 4장 (2026-11-24): 화면이 뜰 때마다 하나를 골라 씀. 그림에 「서버 점검 중」이 있으니 그림이
  // 뜨면 카드의 같은 제목은 화면에서만 숨김(읽어 주기에는 남김). 그림이 안 오면 글만
  var SIGNS = ['art/maint-sign-1.webp', 'art/maint-sign-2.webp', 'art/maint-sign-3.webp', 'art/maint-sign-4.webp'];

  function later(f, wait) { var id = setTimeout(f, wait); if (id && id.unref) id.unref(); return id; }   // node tests end without waiting
  function ms(t) { var v = t ? Date.parse(t) : NaN; return isFinite(v) ? v : null; }
  // what the game does with an answer: off · soon (band) · on (screen) · exempt (operator, plays on)
  function maintMode(s, now) {
    if (!s || typeof s !== 'object') return 'off';
    var start = ms(s.starts_at), end = ms(s.ends_at);
    if (end !== null && now >= end) return 'off';
    // the server gives a start time only while the switch is on: a start that has come since the answer is 점검 now
    if (s.on || (start !== null && now >= start)) return s.exempt ? 'exempt' : 'on';
    if (start !== null && start > now && start - now <= SOON) return s.exempt ? 'exempt' : 'soon';
    return 'off';
  }
  // 「11월 25일 (화) 오전 6:00」 in Korean time, whatever the phone's own zone
  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  function maintWhen(t) {
    if (t === null || t === undefined) return '';
    var d = new Date(t + 9 * 3600 * 1000);   // KST has no summer time
    var h = d.getUTCHours(), m = d.getUTCMinutes();
    return (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일 (' + DAYS[d.getUTCDay()] + ') ' + (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m;
  }
  // 「1시간 23분 남았어요」
  function maintLeft(left) {
    if (!(left > 0)) return '곧 끝나요';
    var mins = Math.ceil(left / 60000), h = Math.floor(mins / 60), m = mins % 60;
    if (h >= 24) return Math.floor(h / 24) + '일 ' + (h % 24) + '시간 남았어요';
    return (h ? h + '시간 ' : '') + (h && !m ? '' : m + '분 ') + '남았어요';
  }

  var CSS = '#cwMaint{position:fixed;inset:0;z-index:100100;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;'
    + 'background:radial-gradient(120% 80% at 50% 0%,#3a2d6b 0%,#1b1f45 55%,#0f1430 100%);color:#fff7e6;font-family:"Jua","Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;'
    + 'padding:calc(env(safe-area-inset-top,0px) + 18px) calc(env(safe-area-inset-right,0px) + 16px) calc(env(safe-area-inset-bottom,0px) + 18px) calc(env(safe-area-inset-left,0px) + 16px);'
    + '-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}'
    + '#cwMaint *{box-sizing:border-box}'
    + '#cwMaint .mt-wrap{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}'
    + '#cwMaint .mt-sign{display:block;width:min(78vw,340px);max-height:42vh;object-fit:contain;pointer-events:none;-webkit-user-drag:none;filter:drop-shadow(0 10px 24px rgba(0,0,0,.45))}'
    + '#cwMaint .mt-card{width:100%;max-width:400px;padding:20px 18px 16px;border-radius:22px;background:rgba(20,24,56,.72);border:1px solid rgba(255,226,160,.35);'
    + 'box-shadow:0 12px 40px rgba(5,8,26,.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);text-align:center}'
    + '#cwMaint h1{margin:0;font:400 27px/1.25 "Jua","Noto Sans KR",system-ui,sans-serif;color:#ffe7a8;word-break:keep-all}'
    + '#cwMaint.has-sign h1{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}#cwMaint.has-sign .mt-msg{margin-top:0}'
    + '#cwMaint .mt-msg{margin:10px 0 0;font:500 15px/1.6 "Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;color:#f2e6c9;word-break:keep-all;white-space:pre-line}'
    + '#cwMaint .mt-time{margin:14px 0 0;padding:12px 10px;border-radius:14px;background:rgba(255,240,205,.1);border:1px solid rgba(255,226,160,.22)}'
    + '#cwMaint .mt-time b{display:block;font:400 13px/1.4 "Jua",system-ui,sans-serif;color:#cdbf9c}'
    + '#cwMaint .mt-time span{display:block;margin-top:3px;font:400 19px/1.35 "Jua",system-ui,sans-serif;color:#fff4d4}'
    + '#cwMaint .mt-left{margin-top:6px;font:400 15px/1.4 "Jua",system-ui,sans-serif;color:#9fe0ff}'
    + '#cwMaint button{display:block;width:100%;min-height:50px;margin-top:14px;border-radius:14px;border:1px solid #d9b873;background:linear-gradient(#efd291,#e7b86d);color:#382715;'
    + 'box-shadow:0 3px 0 #98703c;font:400 18px "Jua","Noto Sans KR",system-ui,sans-serif;cursor:pointer;-webkit-appearance:none;appearance:none;touch-action:manipulation}'
    + '#cwMaint button:active{transform:translateY(2px);box-shadow:0 1px 0 #98703c}#cwMaint button[disabled]{opacity:.6}'
    + '#cwMaint .mt-note{margin-top:10px;font:500 12px/1.5 "Noto Sans KR",system-ui,sans-serif;color:#b9ae93;word-break:keep-all}'
    + '@media (orientation:landscape) and (max-height:500px){#cwMaint .mt-wrap{flex-direction:row;gap:18px}#cwMaint .mt-sign{width:auto;height:min(70vh,260px);max-width:40vw}#cwMaint .mt-card{padding:14px 16px 12px}#cwMaint h1{font-size:23px}}'
    + '#cwMaintSoon{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 6px);transform:translateX(-50%);z-index:99990;max-width:calc(100vw - 24px);padding:7px 14px;border-radius:999px;'
    + 'background:rgba(28,30,70,.86);border:1px solid rgba(255,226,160,.45);color:#ffe7a8;font:400 13px/1.35 "Jua","Noto Sans KR",system-ui,sans-serif;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
    + 'pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}'
    + '#cwMaint [hidden],#cwMaintSoon[hidden]{display:none!important}';

  function createMaint(o) {
    o = o || {};
    var doc = o.doc || root.document, fetchFn = o.fetch, now = o.now || function () { return Date.now(); };
    var last = null, skew = 0, mode = 'off', busy = false, endTimer = null, shown = false, bandAt = -Infinity;
    function css() { if (doc && !doc.getElementById('cwMaintCss')) { var st = doc.createElement('style'); st.id = 'cwMaintCss'; st.textContent = CSS; doc.head.appendChild(st); } }
    function serverNow() { return now() + skew; }
    function ask(token) {
      var h = { 'content-type': 'application/json', apikey: ANON };
      if (token) h.Authorization = 'Bearer ' + token;
      var opts = { method: 'POST', headers: h, body: '{}' }, id = null;
      if (typeof AbortController !== 'undefined') { var ac = new AbortController(); opts.signal = ac.signal; id = later(function () { ac.abort(); }, TIMEOUT); }
      return Promise.resolve().then(function () { return fetchFn(URL, opts); })
        .then(function (r) { if (id) clearTimeout(id); return r.ok ? r.json() : { http: r.status }; }, function () { if (id) clearTimeout(id); return null; });
    }
    function check() {
      if (o.demo) { apply(o.demo()); return Promise.resolve(mode); }
      if (!fetchFn || busy) return Promise.resolve(mode);
      busy = true;
      var tok = o.token ? Promise.resolve().then(o.token).catch(function () { return null; }) : Promise.resolve(null);
      return tok.then(function (t) {
        return ask(t).then(function (j) { return j && j.http === 401 && t ? ask(null) : j; });   // an old login token: ask as anyone
      }).then(function (j) {
        busy = false;
        if (j && typeof j === 'object' && !j.http && typeof j.on === 'boolean') apply(j);   // no line / trouble: nothing changes
        return mode;
      }, function () { busy = false; return mode; });
    }
    function apply(j) {
      last = j;
      var sn = ms(j.now); if (sn !== null) skew = sn - now();
      var was = mode; mode = maintMode(j, serverNow());
      if (mode === 'on') showScreen(); else if (shown) { endNow(); return; }
      soonBand(mode === 'soon');
      if (endTimer) { clearTimeout(endTimer); endTimer = null; }
      // the exact start (band → screen) or end (screen → reload) without waiting for the next minute
      var at = mode === 'on' ? ms(j.ends_at) : mode === 'soon' ? ms(j.starts_at) : null;
      if (at !== null) { var wait = at - serverNow() + 1500; if (wait < 2147483000) endTimer = later(function () { endTimer = null; if (o.demo) { if (mode === 'on') endNow(); else { mode = 'on'; showScreen(); soonBand(false); } } else check(); }, Math.max(1000, wait)); }
      if (was !== mode && o.onMode) o.onMode(mode);
    }
    function endNow() { mode = 'off'; if (o.onEnd) o.onEnd(); }
    function soonBand(on) {
      if (!doc) return;
      var el = doc.getElementById('cwMaintSoon');
      if (!on) { if (el) el.hidden = true; return; }
      css();
      if (!el) { el = doc.createElement('div'); el.id = 'cwMaintSoon'; el.setAttribute('role', 'status'); el.hidden = true; doc.body.appendChild(el); }
      // 위쪽 정보 칸을 가리지 않게: 8초 보였다가 사라지고, 5분마다 다시
      if (!el.hidden || now() - bandAt < 5 * 60000) return;
      bandAt = now(); el.hidden = false; later(function () { el.hidden = true; }, 8000);
      el.textContent ='🛠️ ' + maintWhen(ms(last.starts_at)).replace(/^\d+월 \d+일 \(.\) /, '') + '부터 서버 점검';
    }
    function showScreen() {
      if (!doc || !doc.body) return;
      css();
      var el = doc.getElementById('cwMaint');
      if (!shown) {
        shown = true;
        if (o.onStart) { try { o.onStart(); } catch (e) { /* the screen still comes */ } }
        el = doc.createElement('div'); el.id = 'cwMaint'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'cwMaintT');
        el.innerHTML = '<div class="mt-wrap"><img class="mt-sign" alt="" draggable="false"><div class="mt-card"><h1 id="cwMaintT">서버 점검 중이에요</h1>'
          + '<p class="mt-msg"></p><div class="mt-time"><b>끝나는 시간</b><span class="mt-end"></span><div class="mt-left"></div></div>'
          + '<button type="button" class="mt-retry">다시 확인하기</button><div class="mt-note">점검이 끝나면 저절로 게임이 다시 열려요. 진행은 이 기기에 안전하게 저장돼 있어요.</div></div></div>';
        var img = el.querySelector('.mt-sign');
        img.hidden = true;
        img.onload = function () { img.hidden = false; el.classList.add('has-sign'); };
        img.src = SIGNS[Math.floor(Math.random() * SIGNS.length)];
        // 꾸욱 눌러도 그림 메뉴·글자 잡힘 없이 (아이폰 미리보기·갤럭시 이미지 메뉴)
        ['contextmenu', 'selectstart', 'dragstart'].forEach(function (k) { el.addEventListener(k, function (e) { e.preventDefault(); }); });
        var btn = el.querySelector('.mt-retry');
        btn.addEventListener('click', function () {
          btn.disabled = true; btn.textContent = '확인하는 중이에요…';
          check().then(function () { setTimeout(function () { btn.disabled = false; btn.textContent = '다시 확인하기'; }, 800); });
        });
        doc.body.appendChild(el);
        tick();
      }
      paint(el);
    }
    function paint(el) {
      if (!el || !last) return;
      el.querySelector('.mt-msg').textContent = String(last.message || '').trim() || '더 좋은 냥법사를 위해 서버를 손보고 있어요.\n잠시만 기다려 주세요!';
      var end = ms(last.ends_at), box = el.querySelector('.mt-time');
      box.hidden = end === null;
      if (end !== null) { el.querySelector('.mt-end').textContent = maintWhen(end); el.querySelector('.mt-left').textContent = maintLeft(end - serverNow()); }
    }
    function tick() { if (mode !== 'on') return; paint(doc.getElementById('cwMaint')); later(tick, 15000); }
    function start() {
      check();
      // every 30 s while the screen is up, every minute otherwise
      var n = 0;
      setInterval(function () { n++; if ((!doc || !doc.hidden) && (mode === 'on' || n % (EVERY / WHILE_ON) === 0)) check(); }, WHILE_ON);
      if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', function () { if (!doc.hidden) check(); });
    }
    return { start: start, check: check, on: function () { return mode === 'on'; }, mode: function () { return mode; }, last: function () { return last; } };
  }

  // ?maintdemo=1 · ?maintdemo=soon: made-up times, for looking at the screen (no server)
  function maintDemo(q, now0) {
    var t0 = now0 || Date.now();
    if (q === 'soon') return function () { return { on: false, starts_at: new Date(t0 + 20 * 60000).toISOString(), ends_at: new Date(t0 + 140 * 60000).toISOString(), message: '', now: new Date().toISOString(), exempt: false }; };
    return function () { return { on: true, starts_at: new Date(t0 - 10 * 60000).toISOString(), ends_at: new Date(t0 + 83 * 60000).toISOString(), message: '', now: new Date().toISOString(), exempt: false }; };
  }

  return { createMaint: createMaint, maintMode: maintMode, maintWhen: maintWhen, maintLeft: maintLeft, maintDemo: maintDemo, MAINT_URL: URL };
});
