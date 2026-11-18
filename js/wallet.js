(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  // 서버 지갑 1단계 (2026-11-18): the phone's side of the server wallet (형꺼 only for now). A diamond action goes to the
  // Edge Function act; the answer carries the server's random numbers, and applyReply runs the same line of
  // js/wallet-actions.js with them, so the phone's save changes exactly as the server's did.
  //   createWallet({ enabled, sync (player-sync: authed()), fetch, store, rules, timeout }) → wallet | null
  //   wallet.act(action, args, saveText) → reply | { ok:false, code:'net'|'pending'|'rules'|'member'|... }
  //   wallet.resume(saveText) → { req, action, args, reply } | null   (an action sent before the app closed)
  //   wallet.queueDungeon({kind, kills, sweep}) / flushDungeon(saveText) → [{ args, reply }]
  //   applyReply(state, reply, run(state, rng, env)) → what run returned
  var isNode = typeof module !== 'undefined' && module.exports;
  var F = isNode ? require('./wallet-fields.js') : root.CW;
  var URL = 'https://ifqlrmenlyzmxojwspya.supabase.co/functions/v1/act';
  var ANON = 'sb_publishable_SOyPUpNNkACwLWJbUX-H_A_p-Y-Iwbe';
  var PENDING = 'cw-wallet-pending', DUNGEON = 'cw-wallet-dungeon';

  function newReq() {
    var a = new Uint8Array(12); (root.crypto || globalThis.crypto).getRandomValues(a);
    return Array.from(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function replay(draws) { var i = 0; return function () { if (i >= draws.length) throw new Error('replay: out of numbers'); return draws[i++]; }; }

  function createWallet(o) {
    o = o || {};
    if (!o.enabled) return null;
    var store = o.store || null, wait = o.timeout || 10000;   // a slow phone line: 10 s, then the request is cut off
    function get(k) { try { return store ? JSON.parse(store.getItem(k) || 'null') : null; } catch (e) { return null; } }
    function put(k, v) { try { if (!store) return; if (v === null) store.removeItem(k); else store.setItem(k, JSON.stringify(v)); } catch (e) { /* full */ } }
    // one request; resolves to the server's answer, or { ok:false, code:'net' } (no line, no login, no answer in time)
    function send(req, action, args, saveText) {
      return Promise.resolve(o.sync && o.sync.authed ? o.sync.authed() : null).then(function (auth) {
        if (!auth || !auth.access || !o.fetch) return { ok: false, code: 'net' };
        var body;
        try { body = '{"req":' + JSON.stringify(req) + ',"rules":' + JSON.stringify(o.rules || '') + ',"action":' + JSON.stringify(action) + ',"args":' + JSON.stringify(args || {}) + ',"save":' + saveText + '}'; } catch (e) { return { ok: false, code: 'bad' }; }
        var opts = { method: 'POST', headers: { 'content-type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + auth.access }, body: body };
        // cut off (not just given up on): a request left running could reach the server after the next one (최종 검토)
        var ac = typeof AbortController !== 'undefined' ? new AbortController() : null; if (ac) opts.signal = ac.signal;
        var timer, late = new Promise(function (res) { timer = setTimeout(function () { if (ac) ac.abort(); res({ ok: false, code: 'net' }); }, wait); });
        var go = Promise.resolve().then(function () { return o.fetch(URL, opts); }).then(function (r) {
          if (!r) return { ok: false, code: 'net' };
          return Promise.resolve(r.json()).then(function (j) {
            j = j || {};
            if (r.status === 409) return { ok: false, code: 'rules', rules: j.rules };
            if (!r.ok && !j.code) j.code = 'server';
            if (!r.ok) j.ok = false;
            j.http = r.status;
            return j;
          }, function () { return { ok: false, code: 'server', http: r.status }; });
        }, function () { return { ok: false, code: 'net' }; });
        return Promise.race([go, late]).then(function (x) { clearTimeout(timer); return x; });
      }, function () { return { ok: false, code: 'net' }; });
    }
    // the server got it (an answer came, even a refusal): the kept request can go; net/busy keep it for later
    // the kept request goes only on a real answer about the action (done, or refused for a reason of the game); anything
    // else (no line, a newer site, a login or server trouble) keeps it, to be sent again with the same id (최종 검토)
    var ANSWERS = { gems: 1, nope: 1, used: 1, full: 1, ticket: 1, member: 1, time: 1, slow: 1 };
    function settled(reply) { return !!reply && (reply.ok === true || !!ANSWERS[reply.code]); }

    function act(action, args, saveText) {
      if (get(PENDING)) return Promise.resolve({ ok: false, code: 'pending' });
      var req = newReq();
      put(PENDING, { req: req, action: action, args: args || {} });
      return send(req, action, args, saveText).then(function (reply) {
        if (settled(reply)) put(PENDING, null);
        return reply;
      });
    }
    function resume(saveText) {
      var p = get(PENDING); if (!p) return Promise.resolve(null);
      return send(p.req, p.action, p.args, saveText).then(function (reply) {
        if (!settled(reply)) return null;
        put(PENDING, null);
        return { req: p.req, action: p.action, args: p.args, reply: reply };
      });
    }
    // dungeon rewards ended without a line wait here, each with its own request id (sent again with the same id)
    function queueDungeon(args) { var q = get(DUNGEON) || []; q.push({ req: newReq(), args: args }); put(DUNGEON, q); }
    function flushDungeon(saveText) {
      var done = [];
      function next() {
        var q = get(DUNGEON) || []; if (!q.length) return Promise.resolve(done);
        return send(q[0].req, 'dungeonClaim', q[0].args, saveText).then(function (reply) {
          if (!settled(reply)) return done;
          var rest = (get(DUNGEON) || []).slice(1); put(DUNGEON, rest.length ? rest : null);
          done.push({ args: q[0].args, reply: reply });
          return next();
        });
      }
      return next();
    }
    return { act: act, resume: resume, queueDungeon: queueDungeon, flushDungeon: flushDungeon, pending: function () { return get(PENDING); } };
  }

  function applyReply(state, reply, run) {
    if (!reply) return null;
    if (!reply.ok) { if (reply.server) F.applyServer(state, reply.server); return null; }
    F.applyServer(state, reply.before || {});
    var out = run ? run(state, replay(reply.draws || []), reply.env || {}) : null;
    if (reply.server) F.applyServer(state, reply.server);   // the server's numbers win if the phone ended anywhere else
    return out;
  }

  // 쿠폰 (2026-11-18): what a player typed → the code the server knows (A-Z 0-9, 6~16), or '' when it cannot be one
  function couponCode(text) { var c = String(text || '').replace(/[\s-]+/g, '').toUpperCase(); return /^[A-Z0-9]{6,16}$/.test(c) ? c : ''; }

  return { couponCode: couponCode, createWallet: createWallet, applyReply: applyReply, WALLET_URL: URL, WALLET_PENDING: PENDING, WALLET_DUNGEON: DUNGEON };
});
