(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;

  function byId(id) { for (var i = 0; i < DATA.skills.length; i++) if (DATA.skills[i].id === id) return DATA.skills[i]; return null; }
  function rotation(state) {
    var idx = -1;
    return {
      next: function () {
        var n = state.slots.length;
        for (var k = 0; k < n; k++) {
          idx = (idx + 1) % n;
          var s = state.slots[idx] && byId(state.slots[idx]);
          if (s) return s;
        }
        return null;
      },
      index: function () { return idx; }
    };
  }
  function castTime(skill, speedMul) { return (skill.dur + DATA.balance.gap) / (speedMul || 1); }
  function unlockedSkills(tier) { return DATA.skills.filter(function (s) { return s.tier <= tier; }); }
  function equipSkill(state, slot, id) {
    var s = byId(id);
    if (!s || s.tier > state.tier || slot < 0 || slot >= state.slots.length) return false;
    var at = state.slots.indexOf(id);
    if (at === slot) return true;
    if (at >= 0) state.slots[at] = state.slots[slot];
    state.slots[slot] = id;
    return true;
  }
  function autoSlotNew(state, id) {
    if (state.slots.indexOf(id) >= 0) return;
    var at = state.slots.indexOf(null);
    if (at < 0) { var low = Infinity; state.slots.forEach(function (sid, i) { var sc = skillScore(state, byId(sid)); if (sc < low) { low = sc; at = i; } }); }
    state.slots[at] = id;
  }
  // ---------- skill enhancing: gold buys levels, each level adds damage to that one skill ----------
  var B = DATA.balance;
  function skillLevel(state, id) { return (state.skillLv && state.skillLv[id]) || 0; }
  function skillUpCost(skill, lv) {
    var c = B.skillUpBase * Math.pow(B.goldGrowth, 31 * (skill.tier - 1)) * Math.pow(B.skillUpGrowth, lv);
    return isFinite(c) ? Math.min(Math.ceil(c), 1e300) : 1e300;
  }
  function trySkillUp(state, id) {
    var s = byId(id); if (!s || s.tier > state.tier) return false;
    if (!state.skillLv) state.skillLv = {};
    var lv = skillLevel(state, id); if (lv >= B.skillMaxLv) return false;
    var c = skillUpCost(s, lv); if (!(state.gold >= c)) return false;
    state.gold = Math.max(0, state.gold - c); state.skillLv[id] = lv + 1;
    return true;
  }
  // ---------- free slots: any unlocked skill in any slot, slots may be empty (never all of them) ----------
  function unequipSkill(state, slot) {
    if (!state.slots[slot]) return false;
    var filled = state.slots.filter(Boolean).length; if (filled <= 1) return false;
    state.slots[slot] = null; return true;
  }
  // returns the slot used, or -1 when the skill is locked
  function placeSkill(state, id, slot) {
    var s = byId(id); if (!s || s.tier > state.tier) return -1;
    if (slot === undefined || slot === null || slot < 0) { slot = state.slots.indexOf(null); if (slot < 0) slot = state.slots.length - 1; }
    var at = state.slots.indexOf(id); if (at >= 0) state.slots[at] = null;
    state.slots[slot] = id; return slot;
  }
  // every skill level you own adds a little damage to all skills (collection bonus)
  function skillOwnedStats(state) {
    var n = 0, lv = state.skillLv || {};
    for (var k in lv) if (byId(k)) n += lv[k] || 0;
    return { skillDmg: n * (B.skillOwnedPer || 0) };
  }
  // keeps buying the cheapest affordable skill level; returns how many levels were bought
  function skillUpAll(state) {
    var bought = 0;
    for (var guard = 0; guard < 2000; guard++) {
      var best = null, bestCost = Infinity;
      unlockedSkills(state.tier).forEach(function (s) {
        var lv = skillLevel(state, s.id); if (lv >= B.skillMaxLv) return;
        var c = skillUpCost(s, lv); if (c < bestCost) { bestCost = c; best = s; }
      });
      if (!best || !trySkillUp(state, best.id)) break;
      bought++;
    }
    return bought;
  }
  // three saved slot layouts; switching keeps the current layout in the preset it came from
  function switchPreset(state, i) {
    if (!(i >= 0 && i < 3)) return false;
    if (!state.presets) state.presets = [null, null, null];
    state.presets[state.preset || 0] = state.slots.slice();
    var saved = state.presets[i], n = state.slots.length;
    if (saved) {
      var next = []; for (var k = 0; k < n; k++) { var s = saved[k] && byId(saved[k]); next.push(s && s.tier <= state.tier && next.indexOf(s.id) < 0 ? s.id : null); }
      if (next.some(Boolean)) state.slots = next;
    }
    state.preset = i; state.presets[i] = state.slots.slice();
    return true;
  }
  function skillScore(state, s) { return s.mult * (1 + B.skillLvBonus * skillLevel(state, s.id)) * Math.min(s.targets, 3) / (s.dur + B.gap); }
  function autoFillSkills(state) {
    var list = unlockedSkills(state.tier).sort(function (a, b) { return skillScore(state, b) - skillScore(state, a); });
    for (var i = 0; i < state.slots.length; i++) state.slots[i] = list[i] ? list[i].id : null;
  }
  // the skill menu's numbers (2026-11-15): what one cast does to one monster with the player's stats now, before a crit, at a
  // given upgrade level (the save is not changed), and who it hits
  function skillDamageAt(state, sk, lv) {
    var E = isNode ? require('./economy.js') : root.CW, st = E.stats(state), sl = {};
    for (var k in (st.skillLv || {})) sl[k] = st.skillLv[k];
    sl[sk.id] = lv;
    var st2 = {}; for (var j in st) st2[j] = st[j]; st2.skillLv = sl;
    return E.hitDamage(st2, sk, {});
  }
  function skillTargetText(n) { return n >= 99 ? '전체 공격' : n <= 1 ? '단일 공격' : '여러 마리 공격'; }
  return { skillOwnedStats: skillOwnedStats, skillDamageAt: skillDamageAt, skillTargetText: skillTargetText, skillUpAll: skillUpAll, switchPreset: switchPreset, unequipSkill: unequipSkill, placeSkill: placeSkill, autoFillSkills: autoFillSkills, skillScore: skillScore, skillLevel: skillLevel, skillUpCost: skillUpCost, trySkillUp: trySkillUp, rotation: rotation, castTime: castTime, unlockedSkills: unlockedSkills, equipSkill: equipSkill, autoSlotNew: autoSlotNew, skillById: byId };
});
