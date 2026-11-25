// 무한의 탑 (2026-11-25, 형: 유적 보물 지도 잠깐 빼고 무한의 탑 만들어 보자)
// Floor after floor with no tickets: a floor is won by beating every monster in it before the time runs out, and the
// climb goes on to the next floor until one is lost. Floor n stands at a fixed place of the whole game (난이도 × 310 +
// 스테이지, STEP places a floor), so the same floor is as hard for everyone — a record that can later be ranked.
// Rewards come once, the first time a floor is cleared (gold every floor, 마력석 every boss floor, 룬석 every 10th), and
// every 10 floors give 탑의 가호, 모든 피해 +1% for good. No diamonds here: the server wallet owns those.
// 층 종류 (2026-11-25, 형: 탑 안 진행 방식 바꾸기): every ten floors go 일반 · 정예 · 일반 · 저주 · 보스 · 일반 · 정예 ·
// 저주 · 일반 · 큰 보스. hp is a share of one stage monster (a normal tower monster = 1/DUN_CROWD of it).
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; root.CW.tower = m; root.CW.towerStats = m.towerStats; } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  function dep(file) { return isNode ? require('./' + file + '.js') : root.CW; }
  var DATA = dep('data').DATA;
  var name = '무한의 탑';
  var C = { step: 3, span: 310, goldKills: 10, runeKills: 40, blessEvery: 10, bless: 0.01, quickMax: 300 };
  // count: monsters on the floor; hp: each one's health in normal tower monsters; sec: the time; quick: how many ordinary
  // hits of the player one may take and still count as an easy floor for 바로 깨기
  var KINDS = {
    normal: { id: 'normal', label: '일반', count: 8, hp: 1, sec: 30, quick: 1, help: '몬스터 8마리' },
    elite: { id: 'elite', label: '정예', count: 3, hp: 4, sec: 30, quick: 2, elite: true, help: '단단한 정예 3마리' },
    curse: { id: 'curse', label: '저주', count: 8, hp: 1, sec: 20, quick: 1, curse: true, help: '시간 20초' },
    boss: { id: 'boss', label: '보스', count: 1, hp: 12, sec: 30, quick: 8, boss: true, help: '지역 보스' },
    // 형 (2026-11-25): 「큰 보스」 말고 그냥 「보스」 — 10층마다 오는 더 센 보스도 이름은 보스, 설명에 탑의 가호
    big: { id: 'big', label: '보스', count: 1, hp: 30, sec: 40, quick: 8, boss: true, big: true, help: '탑의 가호' }
  };
  var PATTERN = ['big', 'normal', 'elite', 'normal', 'curse', 'boss', 'normal', 'elite', 'curse', 'normal'];   // by floor % 10
  // 탑 그림 (2026-11-25, GPT art-src/ai-review/2026-11-25-tower): each kind of floor has its own room (art/bg-tower-<kind>.webp)
  // and its own monsters (js/bestiary.js tn·te·tc·tb·tg). sky: the room's tone for effects (a light floor is 'bright').
  var LOOK = {
    normal: { bg: 'bg-tower-normal', sky: 0x3a2a4a, mobs: ['tn01', 'tn02', 'tn03', 'tn04', 'tn05', 'tn06', 'tn07', 'tn08', 'tn09', 'tn10'] },
    elite: { bg: 'bg-tower-elite', sky: 0xb08a64, mobs: ['te01', 'te02', 'te03', 'te04', 'te05'] },
    curse: { bg: 'bg-tower-curse', sky: 0x2a1a3a, mobs: ['tc01', 'tc02', 'tc03', 'tc04', 'tc05'] },
    boss: { bg: 'bg-tower-boss', sky: 0x4a1a1a, mobs: ['tb01', 'tb02', 'tb03', 'tb04', 'tb05'] },
    big: { bg: 'bg-tower-big', sky: 0xc8a07a, mobs: ['tg01', 'tg02', 'tg03', 'tg04', 'tg05'] }
  };
  Object.keys(LOOK).forEach(function (k) { KINDS[k].bg = LOOK[k].bg; KINDS[k].sky = LOOK[k].sky; KINDS[k].mobs = LOOK[k].mobs; });
  // the monsters of a floor: a boss floor has one, taking turns floor after floor (5층 tb01, 15층 tb02 … 10층 tg01, 20층 tg02 …);
  // the others draw from their kind's list
  function monstersOf(floor) {
    var k = kind(floor);
    if (k.big) return [k.mobs[(Math.floor(floor / 10) - 1) % k.mobs.length]];
    if (k.boss) return [k.mobs[Math.floor(floor / 10) % k.mobs.length]];
    return k.mobs;
  }

  function data(state) {
    if (!state.tower || typeof state.tower !== 'object' || Array.isArray(state.tower)) state.tower = {};
    var t = state.tower;
    if (!(t.best >= 0)) t.best = 0;
    t.best = Math.floor(t.best);
    return t;
  }
  function best(state) { return data(state).best; }
  function open(state) { return dep('dungeon').dungeonOpen(state); }
  // where floor n stands: the difficulty and the stage in it (past the last difficulty its stages just go on)
  function place(floor) {
    var p = (Math.max(1, floor) - 1) * C.step, last = DATA.difficulties.length - 1, d = Math.min(last, Math.floor(p / C.span));
    return { diff: d, stage: p - d * C.span };
  }
  function regionOf(floor) { var at = place(floor); return { diff: at.diff, region: Math.min(9, Math.floor(at.stage / 31)) }; }
  function kind(floor) { return KINDS[PATTERN[floor % 10]]; }
  function isBoss(floor) { return !!kind(floor).boss; }
  // one normal tower monster of this floor, and one monster of the floor as it really is (정예·보스 are tougher)
  function mobHp(floor) { var at = place(floor), E = dep('economy'); return E.stageMonsterHp(at, at.stage) / (dep('stage-rewards').DUN_CROWD || 3); }
  function unitHp(floor) { return mobHp(floor) * kind(floor).hp; }
  function reward(state, floor) {
    var at = place(floor), E = dep('economy'), r = {}, k = kind(floor);
    r.gold = Math.round(E.stageGold({ diff: at.diff, up: state.up }, at.stage, 1) * C.goldKills * (k.elite ? 1.5 : 1));
    if (k.boss) r.mana = Math.round(dep('training').manaForBoss(Math.min(at.stage, C.span - 1), false) * (1 + at.diff) * (k.big ? 2 : 1));
    if (floor % C.blessEvery === 0) r.runeStone = Math.round(DATA.runeConf.dungeonPerKill * C.runeKills * (1 + Math.floor(Math.min(at.stage, C.span - 1) / 31) * 0.4) * (1 + at.diff));
    return r;
  }
  function addTo(total, r) { Object.keys(r).forEach(function (k) { total[k] = (total[k] || 0) + r[k]; }); return total; }
  function give(state, r) { state.gold = (state.gold || 0) + (r.gold || 0); state.mana = (state.mana || 0) + (r.mana || 0); state.runeStone = (state.runeStone || 0) + (r.runeStone || 0); }
  // the next floor was won: it becomes the record and pays its first-clear reward (an old floor pays nothing)
  function clear(state, floor) {
    var t = data(state);
    if (floor !== t.best + 1) return null;
    var r = reward(state, floor); give(state, r); t.best = floor;
    if (floor % C.blessEvery === 0) r.bless = true;
    return r;
  }
  // 바로 깨기: floors whose every monster falls to one ordinary hit (a 정예 to two, a boss to eight) are climbed at once
  function easy(floor, hit) { return hit > 0 && unitHp(floor) <= hit * kind(floor).quick; }
  function quickTo(state, hit) {
    var f = best(state), n = 0;
    while (n < C.quickMax && easy(f + 1, hit)) { f++; n++; }
    return f;
  }
  function quickClimb(state, hit) {
    var from = best(state), to = quickTo(state, hit), total = {}, bless = 0;
    for (var f = from + 1; f <= to; f++) { var r = clear(state, f); if (!r) break; if (r.bless) bless++; delete r.bless; addTo(total, r); }
    return to > from ? { from: from, to: best(state), reward: total, bless: bless } : null;
  }
  function blessPct(state) { return Math.floor(best(state) / C.blessEvery) * C.bless; }
  function towerStats(state) { var b = state && state.tower ? blessPct(state) : 0; return b ? { finalPct: b } : {}; }
  return { name: name, conf: C, kinds: KINDS, data: data, best: best, open: open, place: place, regionOf: regionOf, kind: kind, isBoss: isBoss, monstersOf: monstersOf,
    mobHp: mobHp, unitHp: unitHp, reward: reward, clear: clear, quickTo: quickTo, quickClimb: quickClimb, blessPct: blessPct, towerStats: towerStats };
});
