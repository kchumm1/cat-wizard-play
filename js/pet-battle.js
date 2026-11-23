// 펫 전투 기술 (2026-11-23, 형: 작은 기술도 쓰기 · 나머지 펫스킬도 작업하자; docs/펫기술-업적-GPT-문구.md 1장).
// The worn pet casts its skill by itself every petSkillEvery seconds (js/pets.js). This file only decides what the cast does
// with the monsters on the field now — a plan — so it can be tested in node; js/main.js carries it out through the same
// onHit the hero's spells use (crits, freeze, shock, little ones, damage numbers, kills, dungeons) and js/pet-sprite.js
// draws the pet. Families (by the pet's group): 응원 cheer (surge steps), 묶기 bubble (trap like 빙결), 한 방 flame (the
// strongest), 번개 bolt (a chain + 감전), 별비 star (all + hunting gold). A legend casts its family's big skill.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var PT = isNode ? require('./pets.js') : root.CW;
  var LINE = 0.9;   // 업화 브레스: how far off the line to the target a monster may stand and still burn

  function aimable(m) { return m && m.alive && m.arrived !== false; }
  function d2(a, b) { var dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
  function nearest(list, from, n) { return list.slice().sort(function (a, b) { return d2(a, from) - d2(b, from); }).slice(0, n); }
  function strongest(list) {
    var best = null;
    list.forEach(function (m) { if (!best || (m.boss && !best.boss) || (m.boss === best.boss && m.hp > best.hp)) best = m; });
    return best;
  }
  // a chain: the nearest to the hero, then each time the nearest to the last one struck
  function chain(list, from, n) {
    var left = list.slice(), out = [], at = from;
    while (left.length && out.length < n) {
      var k = 0; for (var i = 1; i < left.length; i++) if (d2(left[i], at) < d2(left[k], at)) k = i;
      at = left[k]; out.push(at); left.splice(k, 1);
    }
    return out;
  }
  // everyone in front of the hero within LINE of the straight line to the target
  function onLine(list, from, to) {
    var dx = to.x - from.x, dz = to.z - from.z, L = Math.sqrt(dx * dx + dz * dz) || 1, ux = dx / L, uz = dz / L;
    return list.filter(function (m) {
      var px = m.x - from.x, pz = m.z - from.z, along = px * ux + pz * uz, off = Math.abs(px * uz - pz * ux);
      return m === to || (along >= 0 && off <= LINE);
    });
  }

  // what the worn pet does now: null when no pet is worn or there is nothing to aim at
  // { id, name, fam, big, mul (per target, in average hero hits), targets, surge, trap, pull, shock, line, gold }
  function petBattlePlan(state, mobs, hero) {
    var b = PT.petBox(state), id = b.worn, k = id && PT.petSkillOf(id);
    if (!k || !b.owned[id]) return null;
    var list = (mobs || []).filter(aimable); if (!list.length) return null;
    var p = { id: id, name: k.name, fam: k.fam, big: k.big, mul: PT.petSkillPower(state, id), targets: [], surge: 0, trap: false, pull: false, shock: false, line: false, gold: 0 };
    if (k.fam === 'cheer') p.surge = k.n;
    else if (k.fam === 'bubble') { p.trap = true; p.pull = k.big; p.targets = k.big ? list : nearest(list, hero, k.n); }
    else if (k.fam === 'flame') { var top = strongest(list); p.targets = k.big ? onLine(list, hero, top) : [top]; p.line = k.big; }
    else if (k.fam === 'bolt') { p.shock = true; p.targets = chain(list, hero, k.big ? list.length : k.n); }
    else { p.targets = list; p.gold = k.gold; }
    return p;
  }
  // the hero hit the pet builds on: the mean multiplier of the equipped skills, each with its level bonus (hitDamage reads the
  // rest — attack, mastery, skill damage, boss damage, 펫의 힘 …)
  function petHeroMult(state) {
    var B = DATA.balance, lv = state.skillLv || {}, sum = 0, n = 0;
    (state.slots || []).forEach(function (id) {
      for (var i = 0; i < DATA.skills.length; i++) if (DATA.skills[i].id === id) { var s = DATA.skills[i]; sum += s.mult * (1 + B.skillLvBonus * (lv[id] || 0)); n++; return; }
    });
    return n ? sum / n : DATA.skills[0].mult;
  }
  return { petBattlePlan: petBattlePlan, petHeroMult: petHeroMult };
});
