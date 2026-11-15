// 우편함 선물: 골드·다이아 말고 다른 재화와 아이템 (2026-11-16, the user: 운영자 선물로 모든 재화 + 모든 아이템).
// A letter may carry `give`, beside goldJo and gems:
//   { mana, runeStone, sigilStone, shards,                 재화: 마력석 · 룬석 · 신성석 · 신기 조각 (counts)
//     potions: { rage, luck, wisdom },                     물약: minutes added to each potion's timer
//     gear:     [{ kind, grade, sub, n }],                 장비 (grade 0..9 = 일반..멸망, sub 0..3 = I..IV)
//     runes:    [{ kind, grade, n }],                      룬 (grade 0..10 = 일반..멸망, level 0)
//     sigils:   [{ grade, stat, best, n }],                신성력 (stat '' = random; best = 최상급 quality)
//     relics:   [{ id, n }],                               유물 (each copy +1 level; past the top it turns into diamonds like a summon)
//     costumes: [{ id }] }                                 코스튬 (not owned → owned at Lv.1, owned → one level up)
// Used by the game (js/mail.js claims a letter) and by ops.html (the form and the preview). Rune and sigil bags have a
// room limit: a letter whose runes or sigils do not fit is not claimed at all (the player frees room and claims again).
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function mod(file) { return isNode ? require(file) : root.CW; }
  var CUR = [
    { key: 'mana', name: '마력석', icon: '🔷' }, { key: 'runeStone', name: '룬석', icon: '🔮' },
    { key: 'sigilStone', name: '신성석', icon: '💠' }, { key: 'shards', name: '신기 조각', icon: '✦' }
  ];
  var MAX = 1e15;   // per kind per letter, so a typo cannot break a save
  function num(v) { v = Math.floor(+v || 0); return v > 0 ? Math.min(v, MAX) : 0; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function ROMAN(s) { return ['I', 'II', 'III', 'IV'][s] || 'I'; }
  function ko(n) {
    n = Math.floor(+n || 0); if (n < 10000) return String(n);
    var u = [[1e12, '조'], [1e8, '억'], [1e4, '만']], a = [];
    u.forEach(function (x) { var k = Math.floor(n / x[0]); if (k) { a.push(k + x[1]); n -= k * x[0]; } });
    if (n) a.push(String(n));
    return a.join(' ');
  }
  function sigilStatName(stat) {
    var names = { superRate: '슈퍼 크리 확률', ultraRate: '울트라 크리 확률', hyperRate: '하이퍼 크리 확률', megaRate: '메가 크리 확률', critDmg: '치명타 피해',
      superDmg: '슈퍼 크리 피해', skillDmg: '스킬 피해', bossDmg: '보스 피해', weakDmg: '약점 피해', surgeDmg: '폭주 피해', atkPct: '공격력',
      hyperDmg: '하이퍼 크리 피해', megaDmg: '메가 크리 피해', alphaDmg: '알파 크리 피해' };
    return names[stat] || stat;
  }

  // the letter's gift, cleaned: only things the game knows, whole counts, nothing empty. {} when there is none
  function giftOf(l) {
    var g = l && l.give && typeof l.give === 'object' ? l.give : {}, o = {};
    CUR.forEach(function (c) { var n = num(g[c.key]); if (n) o[c.key] = n; });
    var p = {}; (DATA.potions || []).forEach(function (pt) { var n = num(g.potions && g.potions[pt.id]); if (n) p[pt.id] = Math.min(n, 525600); });
    if (Object.keys(p).length) o.potions = p;
    function rows(arr, ok) { return (Array.isArray(arr) ? arr : []).filter(function (x) { return x && typeof x === 'object' && ok(x); }); }
    var gr = DATA.grades.length, hi = DATA.hiGrades.length;
    var gear = rows(g.gear, function (x) { return DATA.kinds.indexOf(x.kind) >= 0 && x.grade >= 0 && x.grade < gr && x.sub >= 0 && x.sub < 4 && num(x.n); })
      .map(function (x) { return { kind: x.kind, grade: Math.floor(x.grade), sub: Math.floor(x.sub), n: Math.min(num(x.n), 9999) }; });
    var runes = rows(g.runes, function (x) { return !!byId(DATA.runes, x.kind) && x.grade >= 0 && x.grade < hi && num(x.n); })
      .map(function (x) { return { kind: x.kind, grade: Math.floor(x.grade), n: Math.min(num(x.n), 100) }; });
    var sigils = rows(g.sigils, function (x) { return x.grade >= 0 && x.grade < DATA.sigilConf.gradeMul.length && num(x.n) && (!x.stat || DATA.sigilStats.some(function (s) { return s.stat === x.stat; })); })
      .map(function (x) { return { grade: Math.floor(x.grade), stat: x.stat || '', best: !!x.best, n: Math.min(num(x.n), 150) }; });
    var relics = rows(g.relics, function (x) { return !!byId(DATA.relics, x.id) && num(x.n); }).map(function (x) { return { id: x.id, n: Math.min(num(x.n), 1000) }; });
    var costumes = rows(g.costumes, function (x) { return !!byId(DATA.costumes, x.id); }).map(function (x) { return { id: x.id }; });
    if (gear.length) o.gear = gear; if (runes.length) o.runes = runes; if (sigils.length) o.sigils = sigils;
    if (relics.length) o.relics = relics; if (costumes.length) o.costumes = costumes;
    return o;
  }
  function giftHas(l) { return Object.keys(giftOf(l)).length > 0; }

  // every part of the gift as one short line with its picture: [{ icon, text, name }] — name is the thing alone, no
  // amount, for the small pill on the mailbox list (「다이아 외 6종」, 2026-11-16)
  function giftLines(l) {
    var g = giftOf(l), out = [];
    CUR.forEach(function (c) { if (g[c.key]) out.push({ icon: c.icon, text: c.name + ' ' + ko(g[c.key]), name: c.name }); });
    (DATA.potions || []).forEach(function (pt) { var m = g.potions && g.potions[pt.id]; if (m) out.push({ icon: pt.icon, text: pt.name + ' ' + ko(m) + '분', name: pt.name }); });
    (g.gear || []).forEach(function (x) { out.push({ icon: '🎒', text: DATA.grades[x.grade].name + ' ' + ROMAN(x.sub) + ' ' + DATA.kindName[x.kind] + (x.n > 1 ? ' ×' + x.n : ''), name: DATA.kindName[x.kind] }); });
    (g.runes || []).forEach(function (x) { var r = byId(DATA.runes, x.kind); out.push({ icon: r.icon, text: DATA.hiGrades[x.grade].name + ' ' + r.name + (x.n > 1 ? ' ×' + x.n : ''), name: r.name }); });
    (g.sigils || []).forEach(function (x) { out.push({ icon: '💠', text: DATA.hiGrades[x.grade].name + ' 신성력' + (x.stat ? '(' + sigilStatName(x.stat) + ')' : '') + (x.best ? ' 최상급' : '') + (x.n > 1 ? ' ×' + x.n : ''), name: '신성력' }); });
    (g.relics || []).forEach(function (x) { var r = byId(DATA.relics, x.id); out.push({ icon: r.icon, text: '유물 ' + r.name + (x.n > 1 ? ' ×' + x.n : ''), name: r.name }); });
    (g.costumes || []).forEach(function (x) { var c = byId(DATA.costumes, x.id); out.push({ icon: '👘', text: '코스튬 ' + c.name, name: c.name }); });
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

  // give everything; call giftRoom first. rng / now for tests
  function giftApply(state, l, rng, now) {
    var g = giftOf(l); rng = rng || Math.random; now = now || Date.now();
    if (g.mana) state.mana = (state.mana || 0) + g.mana;
    if (g.runeStone) state.runeStone = (state.runeStone || 0) + g.runeStone;
    if (g.sigilStone) { if (!state.sigil) mod('./sigil.js').sigilById(state, ''); state.sigil.stone = (state.sigil.stone || 0) + g.sigilStone; }
    if (g.shards) { if (!state.divine) state.divine = { staff: { lv: 0, star: 0 }, robe: { lv: 0, star: 0 }, charm: { lv: 0, star: 0 }, shards: 0 }; state.divine.shards = (state.divine.shards || 0) + g.shards; }
    if (g.potions) {
      if (!state.alch) state.alch = { brews: 0, until: {} }; if (!state.alch.until) state.alch.until = {};
      Object.keys(g.potions).forEach(function (id) { state.alch.until[id] = Math.max(now, state.alch.until[id] || 0) + g.potions[id] * 60000; });
    }
    var GE = g.gear && mod('./gear.js');
    (g.gear || []).forEach(function (x) { GE.addItem(state, x.kind, x.grade * 4 + x.sub, x.n); });
    var RU = g.runes && mod('./runes.js');
    (g.runes || []).forEach(function (x) { for (var i = 0; i < x.n; i++) RU.runeAdd(state, x.kind, x.grade); });
    var SG = g.sigils && mod('./sigil.js');
    (g.sigils || []).forEach(function (x) {
      for (var i = 0; i < x.n; i++) { var it = SG.addSigil(state, x.grade, rng); if (!it) break; if (x.stat) it.stat = x.stat; if (x.best) it.q = 1; }
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
    return true;
  }
  // what the operator's form offers (ops.html)
  function giftCatalog() {
    return {
      currencies: CUR.slice(),
      potions: (DATA.potions || []).map(function (p) { return { id: p.id, name: p.name, icon: p.icon }; }),
      gearKinds: DATA.kinds.map(function (k) { return { id: k, name: DATA.kindName[k] }; }),
      gearGrades: DATA.grades.map(function (g) { return g.name; }),
      hiGrades: DATA.hiGrades.map(function (g) { return g.name; }),
      runes: DATA.runes.map(function (r) { return { id: r.id, name: r.name, icon: r.icon }; }),
      sigilStats: DATA.sigilStats.map(function (s) { return { id: s.stat, name: sigilStatName(s.stat) }; }),
      relics: DATA.relics.map(function (r) { return { id: r.id, name: r.name, icon: r.icon, divine: !!r.divine }; }),
      costumes: DATA.costumes.map(function (c) { return { id: c.id, name: c.name, grade: DATA.hiGrades[c.grade] ? DATA.hiGrades[c.grade].name : '' }; })
    };
  }
  return { giftOf: giftOf, giftHas: giftHas, giftLines: giftLines, giftText: giftText, giftRoom: giftRoom, giftApply: giftApply, giftCatalog: giftCatalog };
});
