// 우편함 선물: 골드·다이아 말고 다른 재화와 아이템 (2026-11-16, the user: 운영자 선물로 모든 재화 + 모든 아이템).
// A letter may carry `give`, beside goldJo and gems:
//   { mana, runeStone, sigilStone, shards, awakenShard,    재화: 마력석 · 룬석 · 신성석 · 신기 조각 · 각성 파편 (counts)
//     potions: { rage, luck, wisdom },                     물약: minutes added to each potion's timer
//     tickets: { gold, mana, gem, rune },                  던전 입장권: extra tickets kept apart from the daily three
//     gear:     [{ kind, grade, sub, n, pot }],            장비 (grade 0..9 = 일반..멸망, sub 0..3 = I..IV; pot = 3 잠재 stats, 최상급)
//     runes:    [{ kind, grade, n }],                      룬 (grade 0..10 = 일반..멸망, level 0)
//     sigils:   [{ grade, stat, best, n }],                신성력, always 최상급 (the form always picks a stat; '' / '@aw' = random only in old letters)
//     relics:   [{ id, n }],                               유물 (each copy +1 level; past the top it turns into diamonds like a summon)
//     costumes: [{ id }],                                  코스튬 (not owned → owned at Lv.1, owned → one level up)
//     pets: [{ id, n }], petEggs, petFood }                펫 (2026-11-23): each copy like a hatch (new → Lv.1 ★1, else a shard,
//                                                          past ★5 snacks) · 펫 알 · 펫 간식. Not server wallet fields: the server has
//                                                          no js/pets.js and skips them; the phone gives them when it replays (no rng)
// Used by the game (js/mail.js claims a letter) and by ops.html (the form and the preview). Rune and sigil bags have a
// room limit: a letter whose runes or sigils do not fit is not claimed at all (the player frees room and claims again).
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function mod(file) { return isNode ? require(file) : root.CW; }
  var CUR = [
    { key: 'mana', name: '마력석', icon: '🔷' }, { key: 'runeStone', name: '룬석', icon: '🔮' },
    { key: 'sigilStone', name: '신성석', icon: '💠' }, { key: 'shards', name: '신기 조각', icon: '✦' },
    { key: 'awakenShard', name: '각성 파편', icon: '🔆' }
  ];
  // 펫 알 · 펫 간식 (2026-11-23, 형: 운영자 페이지에서 펫도 선물할 수 있게): counts kept in state.pets, capped per letter
  var PETCUR = [{ key: 'petEggs', name: '펫 알', icon: '🥚', max: 999 }, { key: 'petFood', name: '펫 간식', icon: '🍖', max: 1e6 }];
  var PGRADE = ['일반', '희귀', '영웅', '전설'];
  // js/pets.js where there is one: the phone and the tests. The server's require knows only the rule files and throws → null
  function petMod() { if (isNode) { try { return require('./pets.js'); } catch (e) { return null; } } return root.CW && root.CW.petAdd ? root.CW : null; }
  var MAX = 1e15;   // per kind per letter, so a typo cannot break a save
  function num(v) { v = Math.floor(+v || 0); return v > 0 ? Math.min(v, MAX) : 0; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function ROMAN(s) { return ['I', 'II', 'III', 'IV'][s] || 'I'; }
  function ko(n) {
    n = Math.floor(+n || 0); if (n < 10000) return String(n);
    var u = [[1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']], a = [];
    u.forEach(function (x) { var k = Math.floor(n / x[0]); if (k) { a.push(k + x[1]); n -= k * x[0]; } });
    if (n) a.push(String(n));
    return a.join(' ');
  }
  var AW = '@aw';   // 무작위 각성 신성력 (오메가·이터널·제네시스 옵션 중 하나)
  function awakenStats() { return DATA.sigilStats.filter(function (s) { return s.awaken; }); }
  function sigilStatName(stat) {
    if (stat === AW) return '무작위 각성';
    if (stat === 'critRate') return '치명타 확률';
    var names = { superRate: '테라 크리 확률', ultraRate: '루나 크리 확률', hyperRate: '솔라 크리 확률', megaRate: '노바 크리 확률', critDmg: '치명타 피해', criticalRate: '크리티컬 확률', criticalDmg: '크리티컬 피해', criticalDmgPct: '크리티컬 피해',
      superDmg: '테라 크리 피해', skillDmg: '스킬 피해', bossDmg: '보스 피해', weakDmg: '약점 피해', surgeDmg: '폭주 피해', atkPct: '공격력',
      hyperDmg: '솔라 크리 피해', megaDmg: '노바 크리 피해', alphaDmg: '제로 크리 피해' };
    var t = DATA.critTiers.filter(function (x) { return x.rate === stat || x.dmg === stat; })[0];
    return names[stat] || (t ? t.short + ' 크리 ' + (t.rate === stat ? '확률' : '피해') : stat);
  }

  // the letter's gift, cleaned: only things the game knows, whole counts, nothing empty. {} when there is none
  function giftOf(l) {
    var g = l && l.give && typeof l.give === 'object' ? l.give : {}, o = {};
    CUR.forEach(function (c) { var n = num(g[c.key]); if (n) o[c.key] = n; });
    var p = {}; (DATA.potions || []).forEach(function (pt) { var n = num(g.potions && g.potions[pt.id]); if (n) p[pt.id] = Math.min(n, 525600); });
    if (Object.keys(p).length) o.potions = p;
    var tk = {}; (DATA.dungeons || []).forEach(function (d) { var n = num(g.tickets && g.tickets[d.id]); if (n) tk[d.id] = Math.min(n, 999); });
    if (Object.keys(tk).length) o.tickets = tk;
    function rows(arr, ok) { return (Array.isArray(arr) ? arr : []).filter(function (x) { return x && typeof x === 'object' && ok(x); }); }
    var gr = DATA.grades.length, hi = DATA.hiGrades.length;
    var gear = rows(g.gear, function (x) { return DATA.kinds.indexOf(x.kind) >= 0 && x.grade >= 0 && x.grade < gr && x.sub >= 0 && x.sub < 4 && num(x.n); })
      .map(function (x) {
        var o2 = { kind: x.kind, grade: Math.floor(x.grade), sub: Math.floor(x.sub), n: Math.min(num(x.n), 9999) };
        var pot = (Array.isArray(x.pot) ? x.pot : []).filter(function (s) { return DATA.potConf.stats.some(function (p) { return p.stat === s; }); });
        if (pot.length === DATA.potConf.lines) o2.pot = pot;
        return o2;
      });
    var runes = rows(g.runes, function (x) { return !!byId(DATA.runes, x.kind) && x.grade >= 0 && x.grade < hi && num(x.n); })
      .map(function (x) { return { kind: x.kind, grade: Math.floor(x.grade), n: Math.min(num(x.n), 100) }; });
    var sigils = rows(g.sigils, function (x) { return x.grade >= 0 && x.grade < DATA.sigilConf.gradeMul.length && num(x.n) && (!x.stat || x.stat === AW || DATA.sigilStats.some(function (s) { return s.stat === x.stat; })); })
      .map(function (x) { return { grade: Math.floor(x.grade), stat: x.stat || '', best: !!x.best, n: Math.min(num(x.n), 150) }; });
    var relics = rows(g.relics, function (x) { return !!byId(DATA.relics, x.id) && num(x.n); }).map(function (x) { return { id: x.id, n: Math.min(num(x.n), 1000) }; });
    var costumes = rows(g.costumes, function (x) { return !!byId(DATA.costumes, x.id); }).map(function (x) { return { id: x.id }; });
    // 멸망 외형 (DATA.looks): 능력치·레벨 없이 갖기만. 친구꺼에서는 받아도 보이지 않는다
    var looks = rows(g.looks, function (x) { return !!byId(DATA.looks || [], x.id); }).map(function (x) { return { id: x.id }; });
    if (gear.length) o.gear = gear; if (runes.length) o.runes = runes; if (sigils.length) o.sigils = sigils;
    if (relics.length) o.relics = relics; if (costumes.length) o.costumes = costumes; if (looks.length) o.looks = looks;
    var pets = rows(g.pets, function (x) { return !!byId(DATA.pets || [], x.id) && num(x.n); }).map(function (x) { return { id: x.id, n: Math.min(num(x.n), 100) }; });
    if (pets.length) o.pets = pets;
    PETCUR.forEach(function (c) { var n = num(g[c.key]); if (n) o[c.key] = Math.min(n, c.max); });
    return o;
  }
  function giftHas(l) { return Object.keys(giftOf(l)).length > 0; }

  // every part of the gift as one short line with its picture: [{ icon, mark, text, name }] — mark says which game
  // picture js/mail-ui.js draws (2026-11-17, the user: 선물도 룬·신성석·룬석은 실제 마크로); icon is the emoji kept for ops.html — name is the thing alone, no
  // amount, for the small pill on the mailbox list (「다이아 외 6종」, 2026-11-16)
  function giftLines(l) {
    var g = giftOf(l), out = [];
    CUR.forEach(function (c) { if (g[c.key]) out.push({ icon: c.icon, mark: { k: c.key }, text: c.name + ' ' + ko(g[c.key]), name: c.name }); });
    (DATA.potions || []).forEach(function (pt) { var m = g.potions && g.potions[pt.id]; if (m) out.push({ icon: pt.icon, mark: { k: 'potion', id: pt.id }, text: pt.name + ' ' + ko(m) + '분', name: pt.name }); });
    (DATA.dungeons || []).forEach(function (d) { var n = g.tickets && g.tickets[d.id]; if (n) out.push({ icon: '🎟️', mark: { k: 'ticket', id: d.id }, text: d.name + ' 입장권 ' + n + '장', name: d.name + ' 입장권' }); });
    (g.gear || []).forEach(function (x) { out.push({ icon: '🎒', mark: { k: 'gear', id: x.kind }, text: DATA.grades[x.grade].name + ' ' + ROMAN(x.sub) + ' ' + DATA.kindName[x.kind] + (x.n > 1 ? ' ×' + x.n : '') + (x.pot ? ' (최상급 잠재: ' + x.pot.map(sigilStatName).join(' · ') + ')' : ''), name: DATA.kindName[x.kind] }); });
    (g.runes || []).forEach(function (x) { var r = byId(DATA.runes, x.kind); out.push({ icon: r.icon, mark: { k: 'rune', grade: x.grade }, text: DATA.hiGrades[x.grade].name + ' ' + r.name + (x.n > 1 ? ' ×' + x.n : ''), name: r.name }); });
    (g.sigils || []).forEach(function (x) { out.push({ icon: '💠', mark: { k: 'sigil', grade: x.grade }, text: DATA.hiGrades[x.grade].name + ' 신성력' + (x.stat ? '(' + sigilStatName(x.stat) + ')' : '') + ' 최상급' + (x.n > 1 ? ' ×' + x.n : ''), name: '신성력' }); });
    (g.relics || []).forEach(function (x) { var r = byId(DATA.relics, x.id); out.push({ icon: r.icon, mark: { k: 'relic', id: x.id }, text: '유물 ' + r.name + (x.n > 1 ? ' ×' + x.n : ''), name: r.name }); });
    (g.costumes || []).forEach(function (x) { var c = byId(DATA.costumes, x.id); out.push({ icon: '👘', text: '코스튬 ' + c.name, name: c.name }); });
    (g.looks || []).forEach(function (x) { var c = byId(DATA.looks || [], x.id); out.push({ icon: '🎭', text: '멸망 외형 ' + c.name, name: c.name }); });
    (g.pets || []).forEach(function (x) { var p = byId(DATA.pets, x.id); out.push({ icon: '🐾', mark: { k: 'pet', id: x.id }, text: PGRADE[p.grade] + ' 펫 ' + p.name + (x.n > 1 ? ' ×' + x.n : ''), name: p.name }); });
    if (g.petEggs) out.push({ icon: '🥚', mark: { k: 'petEggs' }, text: '펫 알 ' + ko(g.petEggs) + '개', name: '펫 알' });
    if (g.petFood) out.push({ icon: '🍖', mark: { k: 'petFood' }, text: '펫 간식 ' + ko(g.petFood), name: '펫 간식' });
    return out;
  }
  function giftText(l) { return giftLines(l).map(function (x) { return x.text; }).join(' · '); }

  // '' when it fits, or why the letter cannot be taken yet
  function giftRoom(state, l) {
    var g = giftOf(l), msg = [];
    var nr = (g.runes || []).reduce(function (a, x) { return a + x.n; }, 0);
    if (nr) { var b = mod('./runes.js').runeBag(state), free = DATA.runeConf.cap - b.items.length; if (nr > free) msg.push('룬 가방 자리가 ' + (nr - free) + '칸 모자라요'); }
    var ns = (g.sigils || []).reduce(function (a, x) { return a + x.n; }, 0);
    if (ns) { var items = (state.sigil && state.sigil.items) || [], fs = DATA.sigilConf.cap - items.length; if (ns > fs) msg.push('신성력 가방 자리가 ' + (ns - fs) + '칸 모자라요'); }
    return msg.join(', ');
  }

  // give everything; call giftRoom first. rng / now for tests. spill(kind, item) (가방, js/chest.js): a rune or sigil whose
  // bag is full goes there instead of being lost
  function giftApply(state, l, rng, now, spill) {
    var g = giftOf(l); rng = rng || Math.random; now = now || Date.now();
    if (g.mana) state.mana = (state.mana || 0) + g.mana;
    if (g.runeStone) state.runeStone = (state.runeStone || 0) + g.runeStone;
    if (g.sigilStone) { if (!state.sigil) mod('./sigil.js').sigilById(state, ''); state.sigil.stone = (state.sigil.stone || 0) + g.sigilStone; }
    if (g.awakenShard) state.awakenShard = (state.awakenShard || 0) + g.awakenShard;
    if (g.shards) { if (!state.divine) state.divine = { staff: { lv: 0, star: 0 }, robe: { lv: 0, star: 0 }, charm: { lv: 0, star: 0 }, shards: 0 }; state.divine.shards = (state.divine.shards || 0) + g.shards; }
    if (g.potions) {
      if (!state.alch) state.alch = { brews: 0, until: {} }; if (!state.alch.until) state.alch.until = {};
      Object.keys(g.potions).forEach(function (id) { state.alch.until[id] = Math.max(now, state.alch.until[id] || 0) + g.potions[id] * 60000; });
    }
    if (g.tickets) {
      if (!state.dungeon) state.dungeon = { day: '', used: {}, best: {} }; if (!state.dungeon.bonus) state.dungeon.bonus = {};
      Object.keys(g.tickets).forEach(function (id) { state.dungeon.bonus[id] = (state.dungeon.bonus[id] || 0) + g.tickets[id]; });
    }
    var GE = g.gear && mod('./gear.js');
    (g.gear || []).forEach(function (x) { var k = GE.addItem(state, x.kind, x.grade * 4 + x.sub, x.n); if (x.pot) GE.potBest(state, k, x.pot); });
    var RU = g.runes && mod('./runes.js');
    (g.runes || []).forEach(function (x) { for (var i = 0; i < x.n; i++) if (!RU.runeAdd(state, x.kind, x.grade) && spill) spill('rune', { kind: x.kind, grade: x.grade }); });
    var SG = g.sigils && mod('./sigil.js');
    (g.sigils || []).forEach(function (x) {
      for (var i = 0; i < x.n; i++) { var it = SG.addSigil(state, x.grade, rng);
        if (!it) { if (spill) spill('sigil', { grade: x.grade, stat: x.stat || '', q: 1 }); else break; continue; }
        if (x.stat === AW) { var aw = awakenStats(); it.stat = aw[Math.min(aw.length - 1, Math.floor(rng() * aw.length))].stat; }
        else if (x.stat) it.stat = x.stat;
        it.q = 1; }
    });
    if (g.relics) {
      var C = DATA.relicSummon; state.relics = state.relics || {};
      g.relics.forEach(function (x) {
        var r = byId(DATA.relics, x.id), top = r.divine ? C.divineMaxLv : C.maxLv, lv = state.relics[x.id] || 0, up = Math.min(x.n, Math.max(0, top - lv));
        state.relics[x.id] = lv + up; state.gems = (state.gems || 0) + (x.n - up) * C.refund;
      });
    }
    if (g.costumes) {
      if (!state.costume) state.costume = { owned: { basic: 1 }, wear: 'basic' };
      var own = state.costume.owned, cmax = DATA.costumeConf.maxLv;
      g.costumes.forEach(function (x) { own[x.id] = Math.min(cmax, (own[x.id] || 0) + 1); });
    }
    if (g.looks) {
      if (!state.costume) state.costume = { owned: { basic: 1 }, wear: 'basic' };
      g.looks.forEach(function (x) { state.costume.owned[x.id] = 1; });   // 외형은 레벨이 없다: 이미 있으면 그대로
    }
    var PT = (g.pets || g.petEggs || g.petFood) && petMod();
    if (PT) {
      (g.pets || []).forEach(function (x) { for (var i = 0; i < x.n; i++) PT.petAdd(state, x.id, now); });
      var pb = PT.petBox(state); pb.eggs += g.petEggs || 0; pb.food += g.petFood || 0;
    }
    return true;
  }
  // what the operator's form offers (ops.html)
  function giftCatalog() {
    return {
      currencies: CUR.slice(),
      potions: (DATA.potions || []).map(function (p) { return { id: p.id, name: p.name, icon: p.icon }; }),
      tickets: (DATA.dungeons || []).map(function (d) { return { id: d.id, name: d.name, icon: d.icon }; }),
      gearKinds:DATA.kinds.map(function (k) { return { id: k, name: DATA.kindName[k] }; }),
      gearGrades: DATA.grades.map(function (g) { return g.name; }),
      hiGrades: DATA.hiGrades.map(function (g) { return g.name; }),
      runes: DATA.runes.map(function (r) { return { id: r.id, name: r.name + (r.awaken ? ' (각성)' : ''), icon: r.icon }; }),
      potStats: DATA.potConf.stats.map(function (s) { return { id: s.stat, name: sigilStatName(s.stat) }; }),
      sigilStats: (DATA.sigilStats.map(function (s) { return { id: s.stat, name: sigilStatName(s.stat) + (s.awaken ? ' (각성)' : '') }; })),
      relics: DATA.relics.map(function (r) { return { id: r.id, name: r.name, icon: r.icon, divine: !!r.divine }; }),
      looks: (DATA.looks || []).map(function (l) { return { id: l.id, name: l.name }; }),
      costumes: DATA.costumes.map(function (c) { return { id: c.id, name: c.name, grade: DATA.hiGrades[c.grade] ? DATA.hiGrades[c.grade].name : '' }; }),
      pets: (DATA.pets || []).map(function (p) { var gr = byId(DATA.petGroups || [], p.group); return { id: p.id, name: p.name, grade: PGRADE[p.grade], group: gr ? gr.name : '' }; }),
      petCur: PETCUR.map(function (c) { return { key: c.key, name: c.name, icon: c.icon }; })
    };
  }
  return { giftOf: giftOf, giftHas: giftHas, giftLines: giftLines, giftText: giftText, giftRoom: giftRoom, giftApply: giftApply, giftCatalog: giftCatalog };
});
