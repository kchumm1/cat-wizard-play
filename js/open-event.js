// 오픈 기념 이벤트 (2026-11-23, 형: 오픈기념 이벤트 2주 — 출석 14일 + 오픈 기념 패스 30단계, 들어가자마자 뜨게,
// 보상은 서버 지갑이 줌). spec docs/superpowers/specs/2026-11-23-open-event-design.md. Rules only, run by both the server
// (js/wallet-actions.js eventAttend · passClaim · passBuy) and the phone; js/event-ui.js draws them.
//   state.openEvent = { att: { n, last }, claimed: { free: { <step>: 1 }, pass: {} }, pass: bool,   ← the server's (wallet-fields)
//                       base: { kills, bossTry, dungeon, goalsDone } | null, seen: 'day', seenPts }   ← the phone's
// Days are Korean days worked out from the time given (now + 9h), so the server (UTC) and the phone agree.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  function mod(file) { return isNode ? require(file) : root.CW; }
  var DAY = 24 * 3600e3;

  // ---------- 설정표 (형이 바꿀 수 있게 여기 한 곳에) ----------
  // start: 사이트에 나간 날 (형 결정: 나간 날부터 14일). 올리는 날 고쳐 적는다.
  var FREE_ROT = [{ goldMin: 30 }, { potionMin: 30 }, { mana: 5000 }, { gems: 100 }];
  var PAID_ROT = [{ gems: 300 }, { pulls: 10 }, { runeStone: 500 }, { gems: 300 }, { sigilStone: 500 }, { gems: 400 }];
  function freeStep(s) { return s === 30 ? { gems: 500, goldMin: 120 } : s % 5 === 0 ? { gems: 300 } : FREE_ROT[(s - 1) % FREE_ROT.length]; }
  function paidStep(s) { return s === 30 ? { gems: 3000, sigils: [{ grade: 4, n: 1 }] } : s % 10 === 0 ? { gems: 300, sigils: [{ grade: 3, n: 1 }] } : PAID_ROT[(s - 1) % PAID_ROT.length]; }
  var STEPS = []; for (var i = 1; i <= 30; i++) STEPS.push(i);
  var OPEN_EVENT = {
    id: 'open1', start: '2026-11-23', days: 14, price: 3300,
    att: [
      { gems: 300 }, { pulls: 10 }, { goldMin: 60, potionMin: 60 }, { gems: 300 }, { runes: [{ grade: 2, n: 1 }], runeStone: 500 },
      { mana: 20000 }, { gems: 1000, pulls: 30 },
      { gems: 300 }, { sigils: [{ grade: 2, n: 1 }], sigilStone: 500 }, { goldMin: 120 }, { pulls: 10 }, { runeStone: 1500 },
      { gems: 500 }, { gems: 2000, runes: [{ grade: 3, n: 1 }], sigils: [{ grade: 3, n: 1 }] }
    ],
    pass: {
      steps: 30, per: 100, dayCap: 300,
      pts: { kills100: 5, bossTry: 20, goalsDone: 30, dungeon: 20, attend: 50 },
      free: STEPS.map(freeStep), paid: STEPS.map(paidStep)
    }
  };

  // ---------- 날짜 ----------
  function evDay(now) { return new Date(now + 9 * 3600e3).toISOString().slice(0, 10); }
  function startMs() { return Date.parse(OPEN_EVENT.start + 'T00:00:00+09:00'); }
  function evIndex(now) { return Math.floor((now - startMs()) / DAY); }
  function evOn(now) { var i = evIndex(now); return i >= 0 && i < OPEN_EVENT.days; }
  function evEnd() { return evDay(startMs() + (OPEN_EVENT.days - 1) * DAY); }

  // 지갑 없는 기기 (2026-11-23): the site server's clock (the HTTP Date header) minus this phone's, in ms, or null
  function evClockOffset(header, localNow) { var t = header ? Date.parse(header) : NaN; return isFinite(t) ? t - localNow : null; }

  // ---------- 저장 칸 ----------
  function obj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function whole(v) { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? v : 0; }
  var KEYS = ['kills', 'bossTry', 'dungeon', 'goalsDone'];
  function evBox(state) {
    var e = obj(state.openEvent) ? state.openEvent : (state.openEvent = {});
    if (!obj(e.att)) e.att = { n: 0, last: '' };
    e.att.n = Math.min(OPEN_EVENT.att.length, whole(e.att.n)); if (typeof e.att.last !== 'string') e.att.last = '';
    if (!obj(e.claimed)) e.claimed = {};
    if (!obj(e.claimed.free)) e.claimed.free = {};
    if (!obj(e.claimed.pass)) e.claimed.pass = {};
    e.pass = e.pass === true;
    if (!obj(e.base)) e.base = null;
    if (typeof e.seen !== 'string') e.seen = '';
    return e;
  }
  function counts(state) { var c = obj(state.count) ? state.count : {}, o = {}; KEYS.forEach(function (k) { o[k] = whole(c[k]); }); return o; }
  // the counts when the player first met the event (kills before it do not count)
  function evBase(state) { var e = evBox(state); if (!e.base) e.base = counts(state); return e.base; }

  // ---------- 점수 ----------
  function evPoints(state, now) {
    var e = evBox(state), P = OPEN_EVENT.pass, c = counts(state), b = e.base || c, d = function (k) { return Math.max(0, c[k] - whole(b[k])); };
    var raw = Math.floor(d('kills') / 100) * P.pts.kills100 + d('bossTry') * P.pts.bossTry + d('goalsDone') * P.pts.goalsDone +
      d('dungeon') * P.pts.dungeon + e.att.n * P.pts.attend;
    var days = Math.max(0, Math.min(OPEN_EVENT.days, evIndex(now) + 1));
    var pts = Math.min(raw, days * P.dayCap);
    return { raw: raw, pts: pts, step: Math.min(P.steps, Math.floor(pts / P.per)) };
  }

  // ---------- 출석 ----------
  function evAttend(state, now, rng, spill) {
    if (!evOn(now)) return { ok: false, code: 'over' };
    var e = evBox(state), day = evDay(now);
    if (e.att.last === day) return { ok: false, code: 'used' };
    if (e.att.n >= OPEN_EVENT.att.length) return { ok: false, code: 'done' };
    var g = OPEN_EVENT.att[e.att.n];
    e.att.n += 1; e.att.last = day;
    var got = mod('./packs.js').giveApply(state, g, rng, now, spill);
    return { ok: true, day: e.att.n, give: g, got: got };
  }

  // ---------- 패스 ----------
  function evClaimable(state, now, friend) {
    if (!evOn(now)) return [];
    var e = evBox(state), st = evPoints(state, now).step, out = [];
    for (var s = 1; s <= st; s++) if (!e.claimed.free[s]) out.push({ step: s, line: 'free' });
    if (!friend && e.pass) for (var t = 1; t <= st; t++) if (!e.claimed.pass[t]) out.push({ step: t, line: 'pass' });
    return out;
  }
  function giveFor(step, line) { return (line === 'pass' ? OPEN_EVENT.pass.paid : OPEN_EVENT.pass.free)[step - 1]; }
  // args: { line: 'all', upto } (everything that can be taken now, up to the step the phone saw: the kill count keeps moving
  // between the request and the phone's replay, 2026-11-23 점검) or { step, line: 'free' | 'pass' }
  function evClaim(state, now, args, rng, spill, friend) {
    if (!evOn(now)) return { ok: false, code: 'over' };
    args = args || {};
    var e = evBox(state), list;
    if (args.line === 'all') {
      var upto = Number.isInteger(args.upto) && args.upto >= 0 ? args.upto : Infinity;
      list = evClaimable(state, now, friend).filter(function (x) { return x.step <= upto; });
      if (!list.length) return { ok: false, code: 'used' };
    } else {
      var s = args.step, line = args.line;
      if (!(typeof s === 'number' && Number.isInteger(s) && s >= 1 && s <= OPEN_EVENT.pass.steps) || (line !== 'free' && line !== 'pass')) return { ok: false, code: 'nope' };
      if (s > evPoints(state, now).step) return { ok: false, code: 'nope' };
      if (line === 'pass' && (friend || !e.pass)) return { ok: false, code: 'locked' };
      if (e.claimed[line][s]) return { ok: false, code: 'used' };
      list = [{ step: s, line: line }];
    }
    var G = mod('./packs.js');
    list.forEach(function (x) { x.give = giveFor(x.step, x.line); e.claimed[x.line][x.step] = 1; x.got = G.giveApply(state, x.give, rng, now, spill); });
    return { ok: true, list: list };
  }
  function evBuyPass(state, now) {
    if (!evOn(now)) return { ok: false, code: 'over' };
    var e = evBox(state); if (e.pass) return { ok: false, code: 'used' };
    e.pass = true; return { ok: true };
  }

  // ---------- 화면이 읽는 값 ----------
  function evView(state, now, friend) {
    var e = evBox(state), on = evOn(now), day = evDay(now), idx = evIndex(now);
    var today = on && e.att.n < OPEN_EVENT.att.length && e.att.last !== day;
    var att = OPEN_EVENT.att.map(function (g, i) { return { day: i + 1, give: g, st: i < e.att.n ? 'got' : i === e.att.n && today ? 'ready' : 'wait' }; });
    var p = evPoints(state, now), bought = e.pass && !friend;
    var cell = function (s, line) {
      var got = e.claimed[line][s], locked = line === 'pass' && !bought;
      return { give: giveFor(s, line), st: got ? 'got' : locked ? 'lock' : s <= p.step ? 'ready' : 'wait' };
    };
    var list = STEPS.map(function (s) { return { step: s, free: cell(s, 'free'), pass: friend ? null : cell(s, 'pass') }; });
    var claim = on ? evClaimable(state, now, friend) : [];
    return {
      on: on, start: OPEN_EVENT.start, end: evEnd(), dLeft: Math.max(0, OPEN_EVENT.days - 1 - idx), price: OPEN_EVENT.price,
      att: { n: e.att.n, today: today, list: att },
      pass: { bought: bought, pts: p.pts, capped: p.raw > p.pts, step: p.step, per: OPEN_EVENT.pass.per, steps: OPEN_EVENT.pass.steps, claim: claim.length, list: list },
      dot: on && (today || claim.length > 0)
    };
  }

  return { OPEN_EVENT: OPEN_EVENT, evClockOffset: evClockOffset, evDay: evDay, evIndex: evIndex, evOn: evOn, evEnd: evEnd, evBox: evBox, evBase: evBase, evPoints: evPoints,
    evAttend: evAttend, evClaimable: evClaimable, evClaim: evClaim, evBuyPass: evBuyPass, evView: evView };
});
