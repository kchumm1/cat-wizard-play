(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // 성능 표시 (2026-11-17, the user: 폰 발열·렉을 실제 폰에서 재 보기). Everything measured so far was on a computer
  // pretending to be a phone; a real phone that warms up over 20 minutes and slows down cannot be seen from here.
  // This keeps, while 성능 표시 is on (설정 › 문제 확인용, 형꺼 only):
  //  - live numbers for the little box over the game (the last second): frames a second against the aim, the longest
  //    frame, the time the game's own code took per frame (계산), the quality and resolution, the effect valve, …
  //  - one row every 10 seconds, saved in localStorage (cw-perflog) so it survives the app being closed; it reads as one
  //    line a minute and can be copied as text to send back.
  //   frame(gapMs, cpuMs, aim): one drawn frame came gapMs after the one before; the game's code took cpuMs of it;
  //   the game aims for `aim` frames a second (60, 30 with a menu open or after a quiet while, 120 when chosen).
  //   probe(): the slow numbers ({ q, pr, k, dc, tri, tex, geo, b, ch, mem }), read once a second.
  var KEY = 'cw-perflog', EVERY = 10, MAX_ROWS = 360, KEEP_GAP = 5 * 60 * 1000, PAUSE = 5000;
  var QN = { high: '높음', mid: '보통', low: '낮음' };
  function stall(gap, aim) { return gap > Math.max(100, 2500 / (aim || 60)); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function bigN(v) { return v >= 10000 ? r1(v / 10000) + '만' : String(Math.round(v || 0)); }
  function qText(q, pr) { return (QN[q] || q || '?') + (pr ? ' ×' + Math.round(pr * 100) / 100 : ''); }   // ×1.25 (보통 on a phone) stays 1.25
  function clockText(sec) { sec = Math.max(0, Math.floor(sec)); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }

  function createPerfMon(opts) {
    opts = opts || {};
    var store = opts.store || null, now = opts.now || function () { return Date.now(); }, probe = opts.probe || function () { return {}; };
    var on = false, log = null;
    var win = { t: 0, f: 0, w: 0, c: 0 }, smp = { t: 0, f: 0, w: 0, c: 0, h: 0 }, hits = [], last = null, slow = {};
    function read() { if (!store) return null; try { var v = JSON.parse(store.getItem(KEY) || 'null'); return v && v.rows ? v : null; } catch (e) { return null; } }
    function write() { if (!store || !log) return; try { store.setItem(KEY, JSON.stringify(log)); } catch (e) { /* storage full or blocked */ } }
    function clear() { win = { t: 0, f: 0, w: 0, c: 0 }; smp = { t: 0, f: 0, w: 0, c: 0, h: 0 }; hits = []; last = null; }
    // fresh: turned on from settings (always a new record). Otherwise the record goes on when the game is opened again
    // within a few minutes (a reload, the app switched away and back), and a new one starts after a longer break.
    function start(info, fresh) {
      var old = fresh ? null : read(), t = now();
      if (old && t - (old.at || old.start) < KEEP_GAP) { log = old; log.info = info || log.info || {}; }
      else { log = { v: 1, start: t, at: t, info: info || {}, rows: [] }; write(); }
      on = true; clear(); slow = {};
    }
    function stop() { on = false; }
    function frame(gap, cpu, aim) {
      if (!on || !(gap > 0) || gap > PAUSE) return;
      aim = aim || 60; cpu = cpu > 0 ? cpu : 0;
      var st = stall(gap, aim);
      if (st) { hits.push(now()); }
      win.t += gap; win.f++; win.w = Math.max(win.w, gap); win.c += cpu;
      smp.t += gap; smp.f++; smp.w = Math.max(smp.w, gap); smp.c += cpu; if (st) smp.h++;
      if (win.t >= 999.5) {
        try { slow = probe() || {}; } catch (e) { slow = {}; }
        var t = now(); while (hits.length && t - hits[0] > 60000) hits.shift();
        last = { fps: win.f * 1000 / win.t, aim: aim, w: win.w, cpu: win.c / win.f, hits: hits.length, s: slow };
        win = { t: 0, f: 0, w: 0, c: 0 };
      }
      if (smp.t >= EVERY * 1000 - 0.5) {   // (half a millisecond for frame times that do not add up exactly)
        var p = {}; try { p = probe() || {}; } catch (e) { /* a broken probe never stops the record */ }
        var tn = now(), row = { t: r1((tn - log.start) / 1000), d: Math.round(smp.t) / 1000, f: smp.f, w: Math.round(smp.w), c: r1(smp.c / smp.f), h: smp.h, a: aim };
        for (var k in p) if (p[k] !== undefined && p[k] !== null) row[k] = p[k];
        log.rows.push(row); log.at = tn;
        // the device line and settings as they are now (the screen's Hz is only known after a few frames; a setting may change)
        if (opts.info) { try { log.info = opts.info() || log.info; } catch (e) { /* keep the old line */ } }
        if (log.rows.length > MAX_ROWS) log.rows.splice(0, log.rows.length - MAX_ROWS);
        smp = { t: 0, f: 0, w: 0, c: 0, h: 0 };
        write();
      }
    }
    function live() { return last; }
    function getLog() { return log || read(); }
    // one line a minute: frames added up over the time they took, the worst frame, the code time weighted by frames,
    // stalls added up, the setting at the end of the minute, the lowest effect valve. A row belongs to the minute its
    // middle falls in. The aim is averaged over the time too: a minute half in the fight (60) and half with a menu open
    // (30) aims for 45 — shown as 45/45 when it kept up, never 51/30.
    function minutes() {
      var L = getLog(); if (!L) return [];
      var out = [], cur = null;
      L.rows.forEach(function (r) {
        var m = Math.floor(Math.max(0, r.t - r.d / 2) / 60);
        if (!cur || cur.m !== m) { cur = { m: m, f: 0, d: 0, w: 0, cf: 0, h: 0, k: 1, ad: 0 }; out.push(cur); }
        cur.f += r.f; cur.d += r.d; cur.w = Math.max(cur.w, r.w); cur.cf += r.c * r.f; cur.h += r.h; cur.ad += (r.a || 60) * r.d;
        if (r.k !== undefined) cur.k = Math.min(cur.k, r.k);
        ['q', 'pr', 'dc', 'tri', 'tex', 'geo', 'b', 'ch', 'mem'].forEach(function (k) { if (r[k] !== undefined) cur[k] = r[k]; });
      });
      out.forEach(function (o) { o.fps = o.d ? o.f / o.d : 0; o.c = o.f ? o.cf / o.f : 0; o.a = o.d ? Math.round(o.ad / o.d) : 60; delete o.cf; delete o.ad; });
      return out;
    }
    function battery(b, ch) { return b === undefined ? '' : ' · 배터리 ' + Math.round(b) + '%' + (ch ? '(충전 중)' : ''); }
    function minuteLine(o) {
      return o.m + '분 ' + Math.round(o.fps) + '/' + (o.a || 60) + '장 · 최장 ' + Math.round(o.w) + 'ms · 계산 ' + r1(o.c) + 'ms · ' + qText(o.q, o.pr) +
        ' · 효과 ' + Math.round((o.k === undefined ? 1 : o.k) * 100) + '% · 멈칫 ' + o.h + (o.dc !== undefined ? ' · 그리기 ' + o.dc : '') + (o.tri !== undefined ? ' · 삼각형 ' + bigN(o.tri) : '') +
        (o.mem ? ' · 메모리 ' + o.mem + 'MB' : '') + battery(o.b, o.ch);
    }
    function text() {
      var L = getLog(); if (!L) return '';
      var d = new Date(L.start), p2 = function (v) { return (v < 10 ? '0' : '') + v; }, rows = L.rows, span = rows.length ? rows[rows.length - 1].t : 0;
      var info = L.info || {};
      return ['냥법사 성능 기록 · ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + '부터 ' + Math.floor(span / 60) + '분',
        info.dev || '', info.set || '', '(장 = 1초에 그린 화면 수 / 목표, 최장 = 가장 오래 걸린 화면, 계산 = 화면 하나에 게임 코드가 쓴 시간)']
        .filter(Boolean).concat(minutes().map(minuteLine)).join('\n');
    }
    // the little box: three or four short lines from the last second
    function hudText() {
      var L = last; if (!L) return '재는 중…';
      var s = L.s || {}, el = log && log.rows.length ? clockText((now() - log.start) / 1000) : '0:00';
      return [Math.round(L.fps) + '/' + L.aim + '장 · 최장 ' + Math.round(L.w) + 'ms · 계산 ' + r1(L.cpu) + 'ms',
        qText(s.q, s.pr) + ' · 효과 ' + Math.round((s.k === undefined ? 1 : s.k) * 100) + '% · 멈칫 ' + L.hits + '(1분)',
        (s.dc !== undefined ? '그리기 ' + s.dc + ' · 삼각형 ' + bigN(s.tri) + ' · ' : '') + '기록 ' + el,
        (s.mem ? '메모리 ' + s.mem + 'MB' : '') + (s.b !== undefined ? (s.mem ? ' · ' : '') + '배터리 ' + Math.round(s.b) + '%' + (s.ch ? '⚡' : '') : '')
      ].filter(Boolean).join('\n');
    }
    return { on: function () { return on; }, start: start, stop: stop, frame: frame, live: live, log: getLog, minutes: minutes, text: text, hudText: hudText };
  }
  return { createPerfMon: createPerfMon, PERF_KEY: KEY };
});
