// 오늘의 할 일 · 업적 (2026-11-23, 형: 업적이랑 오늘 할 일도 만들고 — 디자인은 GPT에게; spec 8·9장,
// docs/superpowers/plans/2026-11-23-goals.md). Rules only; js/goals-ui.js draws them, js/main.js and js/pet-ui.js count.
//   state.count = { kills, bossTry, dungeon, upgrades, skillUp, potion, hatch, petLv, boxDays }   (whole numbers from 0)
//   state.goals = { day, list: [{ id, key, need, base, rw, got }], box, owed: [rw…] }             (today's five)
//   state.ach   = { got: { <id>: steps taken } }
// Rewards are only things outside the server wallet (js/wallet-fields.js): gold, pet eggs and snacks, 마력석, and the
// achievement bonuses. 업적 배율 multiplies all damage apart (형 결정 6-0, like 펫의 힘); gold and boss damage too.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  function pets() { if (isNode) { try { return require('./pets.js'); } catch (e) { return null; } } return root.CW && root.CW.petBox ? root.CW : null; }
  var KEYS = ['kills', 'bossTry', 'dungeon', 'upgrades', 'skillUp', 'potion', 'hatch', 'petLv', 'boxDays', 'goalsDone'];
  function obj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function whole(v) { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? v : 0; }

  function goalsBox(state) {
    var c = obj(state.count) ? state.count : (state.count = {});
    KEYS.forEach(function (k) { c[k] = whole(c[k]); });
    var g = obj(state.goals) ? state.goals : (state.goals = {});
    if (typeof g.day !== 'string') g.day = '';
    if (!Array.isArray(g.list)) g.list = [];
    g.list = g.list.filter(function (x) { return obj(x) && CAND[x.id]; });
    if (!Array.isArray(g.owed)) g.owed = [];
    g.box = g.box === true;
    if (!obj(g.week)) g.week = {};
    var w = g.week; if (typeof w.key !== 'string') w.key = ''; if (!Array.isArray(w.list)) w.list = []; w.list = w.list.filter(function (x) { return obj(x) && CAND[x.id]; }); w.box = w.box === true;
    var a = obj(state.ach) ? state.ach : (state.ach = {});
    if (!obj(a.got)) a.got = {};
    return { count: c, goals: g, ach: a };
  }
  function goalCount(state, key, n) { var c = goalsBox(state).count; c[key] = whole(c[key]) + whole(n === undefined ? 1 : n); }

  // ---------- 오늘의 할 일 ----------
  // need(ctx): about ten minutes of play (몬스터는 지금 처치 속도로 10분치, 100~3000 사이 둥근 수)
  function nice(v) { var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
  var CAND = {
    kills: { key: 'kills', text: function (n) { return '몬스터 ' + n.toLocaleString('ko-KR') + '마리 잡기'; }, need: function (c) { return Math.max(100, Math.min(3000, nice((c.killsPerSec || 0.3) * 600))); } },
    bossTry: { key: 'bossTry', text: function (n) { return '보스 도전 ' + n + '번'; }, need: function () { return 2; } },
    dungeon: { key: 'dungeon', text: function (n) { return '던전 ' + n + '번 가기'; }, need: function () { return 1; }, open: function (c) { return !!c.dungeonOpen; } },
    upgrades: { key: 'upgrades', text: function (n) { return '훈련 강화 ' + n + '번'; }, need: function () { return 20; } },
    skillUp: { key: 'skillUp', text: function (n) { return '스킬 강화 ' + n + '번'; }, need: function () { return 1; } },
    potion: { key: 'potion', text: function (n) { return '물약 ' + n + '번 만들기'; }, need: function () { return 1; }, open: function (c) { return !!c.potionOpen; } },
    petLv: { key: 'petLv', text: function (n) { return '펫 레벨업 ' + n + '번'; }, need: function () { return 1; }, open: function (c, s) { var P = pets(); return !!P && Object.keys(P.petBox(s).owned).length > 0; } },
    hatch: { key: 'hatch', text: function (n) { return '펫 알 ' + n + '개 부화'; }, need: function () { return 1; }, open: function (c, s) { var P = pets(); return !!P && P.petBox(s).eggs > 0; } }
  };
  var ORDER = ['kills', 'bossTry', 'dungeon', 'upgrades', 'skillUp', 'potion', 'petLv', 'hatch'];
  // a small seeded shuffle: the day and the player's mail number, so the same day gives the same five
  function seedOf(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed || 1; return function () { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; }
  // 보상 (형 GPT 미션 시안 순서, 처음 값 — 해 보고 맞춤): 일일 골드·간식·마력석·간식 / 주간 골드·간식·마력석·룬석.
  // 골드 = 사냥 3분치(주간 20분치), 마력석 = 지금 보스 한 번의 마력석(manaUnit, 주간 ×5), 룬석 = 던전 한 마리당 룬석(runeUnit) ×20(주간 ×100)
  var RW_DAY = ['gold', 'food', 'mana', 'food'], RW_WEEK = ['gold', 'food', 'mana', 'runeStone'];
  function rewardOf(rw, ctx, weekly) {
    ctx = ctx || {};
    if (rw === 'gold') return { gold: Math.max(1, Math.round((ctx.goldPerSec || 0) * (weekly ? 1200 : 180))) };
    if (rw === 'mana') return { mana: Math.max(1, Math.round((ctx.manaUnit || 10) * (weekly ? 5 : 1))) };
    if (rw === 'runeStone') return { runeStone: Math.max(1, Math.round((ctx.runeUnit || 0.6) * (weekly ? 100 : 20))) };
    return { food: weekly ? 80 : 15 };
  }
  function give(state, r) {
    if (!r) return;
    if (r.gold) state.gold = (state.gold || 0) + r.gold;
    if (r.mana) state.mana = (state.mana || 0) + r.mana;
    if (r.runeStone) state.runeStone = (state.runeStone || 0) + r.runeStone;
    var P = (r.food || r.eggs) && pets();
    if (P) { var b = P.petBox(state); b.food += r.food || 0; b.eggs += r.eggs || 0; }
  }
  // the day's five (rolled when the day changes): a done one not taken is kept as owed, never lost
  function goalsToday(state, day, ctx) {
    var B = goalsBox(state), g = B.goals; ctx = ctx || {};
    if (g.day === day && g.list.length) return g;
    g.list.forEach(function (x) { if (!x.got && goalHave(state, x) >= x.need) g.owed.push({ rw: x.rw }); });
    var pool = (ctx.pick || ORDER).filter(function (id) { var c = CAND[id]; return c && (!c.open || c.open(ctx, state)); });
    if (!ctx.pick) { var r = rng(seedOf(day + '|' + ((state.mail && state.mail.pid) || ''))); for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; } }
    g.day = day; g.box = false;
    g.list = pool.slice(0, 4).map(function (id, i) { var c = CAND[id]; return { id: id, key: c.key, need: c.need(ctx), base: B.count[c.key], rw: RW_DAY[i], got: false }; });
    return g;
  }
  function goalHave(state, x) { var c = goalsBox(state).count; return Math.max(0, Math.min(x.need, whole(c[x.key]) - whole(x.base))); }
  function goalText(x) { return CAND[x.id] ? CAND[x.id].text(x.need) : x.id; }
  function goalClaim(state, i, ctx) {
    var x = goalsBox(state).goals.list[i]; if (!x || x.got || goalHave(state, x) < x.need) return null;
    var r = rewardOf(x.rw, ctx || {}); give(state, r); x.got = true;
    goalCount(state, 'goalsDone', 1);   // 오픈 기념 패스 점수 (js/open-event.js)
    return r;
  }
  function goalBoxReady(state) { var g = goalsBox(state).goals; return g.list.length > 0 && !g.box && g.list.every(function (x) { return x.got; }); }
  // 오늘의 상자: a pet egg and snacks
  function goalOpenBox(state) { if (!goalBoxReady(state)) return false; var B = goalsBox(state); B.goals.box = true; B.count.boxDays += 1; give(state, { eggs: 1, food: 30 }); return true; }
  function goalOwedClaim(state, ctx) {
    var g = goalsBox(state).goals; if (!g.owed.length) return null;
    var sum = { gold: 0, food: 0, mana: 0, runeStone: 0 };
    g.owed.forEach(function (o) { var r = typeof o === 'string' ? rewardOf(o, ctx) : rewardOf(o && o.rw, ctx, o && o.w); for (var k in r) sum[k] += r[k]; });
    // 오픈 기념 패스 점수: 넘어간 일일 미션도 한 개씩 (주간은 안 셈)
    goalCount(state, 'goalsDone', g.owed.filter(function (o) { return typeof o === 'string' || !(o && o.w); }).length);
    g.owed = []; give(state, sum); return sum;
  }

  // ---------- 주간 미션 (형 GPT 시안 「주간 미션」 · 이번 주 상자, 매주 월요일 0시) ----------
  // the Monday that starts this week, as the game writes a day (2026-11-23)
  function weekKey(d) { d = d || new Date(); var m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); return m.getFullYear() + '-' + (m.getMonth() + 1) + '-' + m.getDate(); }
  var WEEK_NEED = { kills: function (c) { return Math.max(500, Math.min(20000, nice(CAND.kills.need(c) * 5))); }, bossTry: 10, dungeon: 5, upgrades: 100, skillUp: 5, potion: 5, petLv: 5, hatch: 3 };
  function goalsWeek(state, key, ctx) {
    var B = goalsBox(state), g = B.goals, w = g.week; ctx = ctx || {};
    if (w.key === key && w.list.length) return w;
    w.list.forEach(function (x) { if (!x.got && goalHave(state, x) >= x.need) g.owed.push({ rw: x.rw, w: true }); });
    // 펫 알 부화는 한 주면 알이 나오니 늘 열림 (일일은 지금 알이 있어야)
    var pool = ORDER.filter(function (id) { var c = CAND[id]; return id === 'hatch' ? !!pets() : !c.open || c.open(ctx, state); });
    var r = rng(seedOf('w' + key + '|' + ((state.mail && state.mail.pid) || ''))); for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    w.key = key; w.box = false;
    w.list = pool.slice(0, 4).map(function (id, i) { var c = CAND[id], n = WEEK_NEED[id]; return { id: id, key: c.key, need: typeof n === 'function' ? n(ctx) : n, base: B.count[c.key], rw: RW_WEEK[i], got: false }; });
    return w;
  }
  function weekClaim(state, i, ctx) {
    var x = goalsBox(state).goals.week.list[i]; if (!x || x.got || goalHave(state, x) < x.need) return null;
    var r = rewardOf(x.rw, ctx || {}, true); give(state, r); x.got = true; return r;
  }
  function weekBoxReady(state) { var w = goalsBox(state).goals.week; return w.list.length > 0 && !w.box && w.list.every(function (x) { return x.got; }); }
  // 이번 주 상자: 펫 알 3개와 간식
  function weekOpenBox(state) { if (!weekBoxReady(state)) return false; goalsBox(state).goals.week.box = true; give(state, { eggs: 3, food: 150 }); return true; }

  // ---------- 업적 ----------
  // rw per step: mul (업적 배율, all damage) · gold · boss (each multiplied apart), egg, mana (처음 값, 해 보고 맞춤)
  var ACHIEVEMENTS = [
    { id: 'hunter', name: '사냥꾼', what: '몬스터 처치', val: function (s) { return goalsBox(s).count.kills; }, steps: [1000, 10000, 100000, 1000000], rw: { gold: 0.03 } },
    { id: 'boss', name: '보스 사냥', what: '보스 처치', val: function (s) { return whole(s.bossWins); }, steps: [10, 50, 100, 500, 1000], rw: { boss: 0.02 } },
    { id: 'growth', name: '성장', what: '계정 레벨', val: function (s) { return whole(s.level); }, steps: [50, 100, 200, 400, 800], rw: { mul: 0.02 } },
    { id: 'tier', name: '전직', what: '전직', val: function (s) { return whole(s.tier); }, steps: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], friendMax: 9, rw: { mul: 0.02, egg: 1 } },
    { id: 'collector', name: '수집가', what: '몬스터 도감', val: function (s) { return obj(s.dex) ? Object.keys(s.dex).length : 0; }, steps: [50, 100, 200, 380], rw: { gold: 0.03 } },
    { id: 'petfriend', name: '펫 친구', what: '펫 모으기', val: function (s) { var P = pets(); return P ? Object.keys(P.petBox(s).owned).length : 0; }, steps: [5, 10, 15, 20], rw: { mul: 0.02 } },
    { id: 'petstar', name: '별빛 조련사', what: '펫 별 합계', val: function (s) { var P = pets(); if (!P) return 0; var o = P.petBox(s).owned, n = 0; for (var k in o) n += o[k].star || 1; return n; }, steps: [10, 30, 100], rw: { mul: 0.02 } },
    { id: 'dungeon', name: '던전 탐험', what: '던전 입장·소탕', val: function (s) { return goalsBox(s).count.dungeon; }, steps: [10, 50, 200], rw: { mana: [100, 500, 2000] } },
    { id: 'upgrades', name: '강화의 달인', what: '훈련 강화', val: function (s) { return goalsBox(s).count.upgrades; }, steps: [100, 1000, 10000], rw: { mul: 0.02 } },
    { id: 'diligent', name: '성실한 냥법사', what: '오늘의 상자', val: function (s) { return goalsBox(s).count.boxDays; }, steps: [7, 30, 100], rw: { egg: [1, 2, 3] } }
  ];
  var BY = {}; ACHIEVEMENTS.forEach(function (a) { BY[a.id] = a; });
  function achSteps(a, friend) { return friend && a.friendMax ? a.steps.filter(function (v) { return v <= a.friendMax; }) : a.steps.slice(); }
  function achValue(state, a) { return a.val(state); }
  function pick(v, i) { return Array.isArray(v) ? v[Math.min(i, v.length - 1)] : v; }
  // the reward of step i (0-based) as given: { mul, gold, boss, egg, mana }
  function achReward(a, i) { var r = {}; for (var k in a.rw) r[k] = pick(a.rw[k], i); return r; }
  function achTaken(state, id) { return whole(goalsBox(state).ach.got[id]); }
  function achReady(state, friend) {
    return ACHIEVEMENTS.filter(function (a) { var i = achTaken(state, a.id), st = achSteps(a, friend); return i < st.length && achValue(state, a) >= st[i]; });
  }
  function achClaim(state, id, friend) {
    var a = BY[id]; if (!a) return null;
    var i = achTaken(state, id), st = achSteps(a, friend);
    if (i >= st.length || achValue(state, a) < st[i]) return null;
    var r = achReward(a, i); goalsBox(state).ach.got[id] = i + 1;
    give(state, { eggs: r.egg || 0, mana: r.mana || 0 });
    return r;
  }
  // the bonuses of every step taken: { mul, gold, boss } (1 = none)
  function achBonus(state) {
    var out = { mul: 1, gold: 1, boss: 1 }, got = obj(state.ach) && obj(state.ach.got) ? state.ach.got : {};
    ACHIEVEMENTS.forEach(function (a) { var n = Math.min(whole(got[a.id]), a.steps.length); for (var i = 0; i < n; i++) { var r = achReward(a, i); if (r.mul) out.mul += r.mul; if (r.gold) out.gold += r.gold; if (r.boss) out.boss += r.boss; } });
    return out;
  }
  // the red dot on 할 일
  function goalsHasClaim(state, ctx) {
    var g = goalsBox(state).goals, friend = !!(ctx && ctx.friend);
    var due = function (x) { return !x.got && goalHave(state, x) >= x.need; };
    return g.owed.length > 0 || goalBoxReady(state) || weekBoxReady(state) || g.list.some(due) || g.week.list.some(due) || achReady(state, friend).length > 0;
  }
  return { weekKey: weekKey, goalsWeek: goalsWeek, weekClaim: weekClaim, weekBoxReady: weekBoxReady, weekOpenBox: weekOpenBox, rewardOf: rewardOf,
    goalsBox: goalsBox, goalCount: goalCount, goalsToday: goalsToday, goalHave: goalHave, goalText: goalText, goalClaim: goalClaim,
    goalBoxReady: goalBoxReady, goalOpenBox: goalOpenBox, goalOwedClaim: goalOwedClaim, goalsHasClaim: goalsHasClaim,
    ACHIEVEMENTS: ACHIEVEMENTS, achSteps: achSteps, achValue: achValue, achReward: achReward, achTaken: achTaken, achReady: achReady, achClaim: achClaim, achBonus: achBonus };
});
