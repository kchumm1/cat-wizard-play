// 펫 (2026-11-23, docs/superpowers/specs/2026-11-23-power-pets-goals-design.md 7장): who you have, the codex sets and
// 펫의 힘 (one multiplier, multiplied apart from every other % like a potion — 형 결정 6-0).
// state.pets = { owned: { <id>: { lv, star, frag, t } }, worn, eggs, food, fresh: { <id>: 1 }, sets: { <group>: true }, all }
// The phone keeps it (not a server wallet field). Eggs, levels, stars, the worn pet and its skill come in the next plan.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var C = DATA.petConf;
  function obj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function num(v) { return typeof v === 'number' && isFinite(v) && v > 0 ? v : 0; }
  // a save from before pets, or a broken one, gets an empty box; what is there and sound is kept
  function int(v, lo, hi) { v = Math.floor(Number(v)); if (!isFinite(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
  function petBox(state) {
    var b = obj(state.pets) ? state.pets : (state.pets = {});
    if (!obj(b.owned)) b.owned = {};
    // every entry a sound { lv, star, frag } (검토 2026-11-23: '7', -50 or a bare number broke 펫의 힘 or gave free levels)
    for (var id in b.owned) {
      var o = b.owned[id];
      if (!obj(o)) { delete b.owned[id]; continue; }
      o.star = int(o.star, 1, C.maxStar); o.lv = int(o.lv, 1, C.lvBase + C.lvPerStar * o.star); o.frag = int(o.frag, 0, 1e9);
    }
    // a worn pet the game does not know (renamed, a newer save) is let go: the 내 펫 page draws only known pets
    if (b.worn === undefined || (b.worn !== null && (!b.owned[b.worn] || !BY[b.worn]))) b.worn = null;
    b.eggs = num(b.eggs); b.food = num(b.food);
    if (!obj(b.fresh)) b.fresh = {};
    if (!obj(b.sets)) b.sets = {};
    b.all = b.all === true;
    return b;
  }
  var BY = {}; DATA.pets.forEach(function (p) { BY[p.id] = p; });
  function petById(id) { return BY[id] || null; }
  function petGroupOf(id) { var p = BY[id]; if (!p) return null; for (var i = 0; i < DATA.petGroups.length; i++) if (DATA.petGroups[i].id === p.group) return DATA.petGroups[i]; return null; }
  function petsInGroup(g) { return DATA.pets.filter(function (p) { return p.group === g; }).sort(function (a, b) { return a.grade - b.grade; }); }
  function petAdd(state, id, now) {
    if (!BY[id]) return null;
    var b = petBox(state), o = b.owned[id];
    if (o) {
      if ((o.star || 1) >= C.maxStar) { b.food += C.fragFood; return 'food'; }   // past ★5 a shard is snacks (kind 'food')
      o.frag = num(o.frag) + 1; return 'dup';
    }
    b.owned[id] = { lv: 1, star: 1, frag: 0, t: now || 0 };
    b.fresh[id] = 1; b.food += C.dexFood;
    return 'new';
  }
  function petSeen(state, id) { delete petBox(state).fresh[id]; }
  function petHasFresh(state) { var f = petBox(state).fresh; for (var k in f) if (f[k] && BY[k]) return true; return false; }
  function petDex(state) {
    var b = petBox(state), have = 0;
    var groups = DATA.petGroups.map(function (g) {
      var list = petsInGroup(g.id), n = list.filter(function (p) { return !!b.owned[p.id]; }).length;
      have += n;
      return { id: g.id, name: g.name, have: n, total: list.length, done: n === list.length, claimed: !!b.sets[g.id] };
    });
    return { have: have, total: DATA.pets.length, groups: groups };
  }
  function petClaimSet(state, gid) {
    var b = petBox(state), g = petDex(state).groups.filter(function (x) { return x.id === gid; })[0];
    if (!g || !g.done || g.claimed) return false;
    b.sets[gid] = true; return true;
  }
  function petClaimAll(state) {
    var b = petBox(state), d = petDex(state);
    if (b.all || d.have < d.total) return false;
    b.all = true; return true;
  }
  // ---- growing (2026-11-23, 형: 알과 부화도 해) ----
  function petLvCap(o) { return C.lvBase + C.lvPerStar * ((o && o.star) || 1); }
  function petLvCost(id, lv) { var p = BY[id]; return p ? Math.round(C.levelFood * Math.pow(C.levelGrowth, (lv || 1) - 1) * C.gradeFood[p.grade]) : Infinity; }
  function petLevelUp(state, id) {
    var b = petBox(state), o = b.owned[id]; if (!o) return false;
    var lv = o.lv || 1, cost = petLvCost(id, lv);
    if (lv >= petLvCap(o) || b.food < cost) return false;
    b.food -= cost; o.lv = lv + 1; return true;
  }
  function petStarCost(o) { return (o && o.star) || 1; }
  function petStarUp(state, id) {
    var b = petBox(state), o = b.owned[id]; if (!o) return false;
    var star = o.star || 1, cost = petStarCost(o);
    if (star >= C.maxStar || num(o.frag) < cost) return false;
    o.frag -= cost; o.star = star + 1;
    if (o.star >= C.maxStar && o.frag > 0) { b.food += o.frag * C.fragFood; o.frag = 0; }   // ★5: the shards left are snacks
    return true;
  }
  function petWear(state, id) { var b = petBox(state); if (!b.owned[id]) return false; b.worn = id; return true; }
  function petEquipBonus(id, o) {
    var p = BY[id]; if (!p || !o) return 0;
    return C.equip[p.grade] * (1 + C.perLevel * ((o.lv || 1) - 1)) * (1 + C.perStar * ((o.star || 1) - 1));
  }
  function petOwnedBonus(id, o) { return petEquipBonus(id, o) * C.ownedFrac; }
  // 펫의 힘: the codex sets, the worn pet's equip effect and every other pet's owned effect, added into one multiplier
  // that is then multiplied apart from every other % (economy.js hitDamage)
  function petMul(state) {
    var b = petBox(state), n = 0, sum = 0;
    DATA.petGroups.forEach(function (g) { if (b.sets[g.id]) n++; });
    for (var id in b.owned) if (BY[id]) sum += id === b.worn ? petEquipBonus(id, b.owned[id]) : petOwnedBonus(id, b.owned[id]);
    return 1 + C.setBonus * n + (b.all ? C.allBonus : 0) + sum;
  }
  function petGradeWeights(state) {
    var t = Math.max(0, Math.min(1, ((state.tier || 1) - 1) / (C.lateTier - 1)));
    return C.gradeEarly.map(function (e, i) { return e + (C.gradeLate[i] - e) * t; });
  }
  function pickIndex(weights, rng) {
    // a grade with weight 0 is never picked, even at rng() === 1
    var v = rng() * weights.reduce(function (a, x) { return a + x; }, 0), last = 0;
    for (var i = 0; i < weights.length; i++) { if (weights[i] <= 0) continue; last = i; if (v < weights[i]) return i; v -= weights[i]; }
    return last;
  }
  function petHatch(state, rng, now) {
    var b = petBox(state); if (b.eggs < 1) return null;
    rng = rng || Math.random;
    var grade = pickIndex(petGradeWeights(state), rng), list = DATA.pets.filter(function (p) { return p.grade === grade; });
    var p = list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
    b.eggs -= 1;
    return { id: p.id, grade: grade, kind: petAdd(state, p.id, now) };
  }
  function petHatchAll(state, rng, now) { var out = [], r; while ((r = petHatch(state, rng, now))) out.push(r); return out; }
  function petEggRoll(state, dt, rng) {
    if (!(dt > 0)) return false;
    if ((rng || Math.random)() >= dt / C.eggEverySec) return false;
    petBox(state).eggs += 1; return true;
  }
  function petBossDrop(state, isRegionBoss, rng) {
    var b = petBox(state), eggs = isRegionBoss ? C.regionBossEggs : ((rng || Math.random)() < C.bossEggChance ? 1 : 0);
    var food = isRegionBoss ? C.foodRegionBoss : C.foodBoss;
    b.eggs += eggs; b.food += food;
    return { eggs: eggs, food: food };
  }
  function petFoodWave(state) { var b = petBox(state); b.food += C.foodPerWave; return C.foodPerWave; }
  // 펫 기술 (2026-11-23): the worn pet casts it by itself every petSkillEvery seconds — since 2026-11-23 a buff (petBuffOf below, js/main.js)
  var SK = DATA.petSkill;
  function petSkillOf(id) {
    var p = BY[id], g = p && petGroupOf(id); if (!p || !g) return null;
    var big = p.grade === 3, fam = g.fam;
    return { id: id, name: p.skill, fam: fam, grade: p.grade, big: big, icon: 'sk-pet-' + fam,   // 계열 아이콘 (GPT 그림, art/ 256px)
      n: fam === 'cheer' || fam === 'bubble' || fam === 'bolt' ? (big ? Infinity : SK.n[p.grade]) : 0,
      gold: fam === 'star' ? SK.gold[p.grade] : 0 };
  }
  // seconds between casts; 0 when the pet is not owned
  function petSkillEvery(state, id) {
    var p = BY[id], o = p && petBox(state).owned[id]; if (!o) return 0;
    var t = SK.every[p.grade] - SK.perStar * (o.star - 1) - SK.perLv * (o.lv - 1);
    return Math.max(SK.minSec, Math.round(t * 100) / 100);
  }
  // 세기 per target in seconds of the hero's boss damage; 0 for 응원 · 묶기 (no damage) and for a pet not owned
  function petSkillPower(state, id) {
    var k = petSkillOf(id), o = k && petBox(state).owned[id]; if (!o) return 0;
    var sh = (k.big ? SK.shareBig : SK.share)[k.fam] || 0; if (!sh) return 0;
    return SK.power[k.grade] * (1 + SK.powLv * (o.lv - 1)) * (1 + SK.powStar * (o.star - 1)) * sh;
  }
  // ---- 펫 버프 (2026-11-23, 형: 펫 스킬을 버프 형식으로 바꾸자, 물약 먹으면 나오는 것처럼 — 스킬 모양이 물약처럼 버프로) ----
  // The worn pet's skill no longer strikes: every petSkillEvery seconds it gives the hero a buff for a few seconds (a new one
  // starts the clock again), shown in the buff row over the battle like a potion, with the skill's icon. Families keep their
  // old flavour: 숲 응원 → 폭주 충전, 바다 거품 → 보스 피해, 불꽃 → 모든 피해, 하늘 번개 → 치명타 피해, 별빛 → 골드 획득.
  // { id, fam, name, icon, big, stat, label, val (0.15 = +15%), secs } or null when the pet is not owned
  function petBuffOf(state, id) {
    var k = petSkillOf(id), o = k && petBox(state).owned[id], B = SK.buff && SK.buff[k && k.fam]; if (!o || !B) return null;
    var val = B.val[k.grade] * (1 + SK.powLv * (o.lv - 1)) * (1 + SK.powStar * (o.star - 1));
    return { id: id, fam: k.fam, name: k.name, icon: k.icon, big: k.big, stat: B.stat, label: B.label,
      val: Math.round(val * 10000) / 10000, secs: SK.buffSecs[k.grade] + SK.buffSecStar * (o.star - 1) };
  }
  // '+15%' (one decimal under 10%)
  function petBuffPct(v) { var p = v * 100; return '+' + (p >= 10 ? Math.round(p) : Math.round(p * 10) / 10) + '%'; }
  // the buff on the hero's numbers (js/main.js after every CW.stats): multiplied on top, like a potion
  function petBuffApply(st, b) {
    if (!st || !b || !(b.val > 0)) return st;
    var m = 1 + b.val;
    if (b.stat === 'surge') st.surgeRate = (st.surgeRate || 1) * m;
    else if (b.stat === 'boss') st.bossDmg = (st.bossDmg || 1) * m;
    else if (b.stat === 'all') st.finalMul = (st.finalMul || 1) * m;
    else if (b.stat === 'gold') st.goldMul = (st.goldMul || 1) * m;
    else if (b.stat === 'crit') (DATA.critTiers || []).forEach(function (t) { if (st[t.dmg] > 0) st[t.dmg] *= m; });
    return st;
  }
  // the 내 펫 skill line (js/pet-ui.js), in plain words (2026-11-23, 형: 「화면 전체에 낙뢰 + 감전 · 냥법사 1.56초치」 이게 뭔 말이야
  // → 실제 피해 숫자로): { name, every: '8.2초마다', what it does, note: what that brings ('' when nothing), hit: { label, secs } or
  // null, icon }. The page turns hit into 「번개 한 번에 피해 1.2조」 with the hero's boss damage per second now (CW.heroBossDps)
  function petSkillLine(state, id) {
    var t = petSkillEvery(state, id), b = t && petBuffOf(state, id); if (!b) return null;
    // 버프로 바뀐 뒤 (2026-11-23): 무엇이 얼마나 · 몇 초 동안 (피해 숫자 줄은 없음)
    return { name: b.name, every: String(Math.round(t * 10) / 10) + '초마다', what: b.label + ' ' + petBuffPct(b.val),
      note: String(Math.round(b.secs * 10) / 10) + '초 동안 버프', hit: null, icon: b.icon };
  }


  return { petBox: petBox, petBuffOf: petBuffOf, petBuffPct: petBuffPct, petBuffApply: petBuffApply, petSkillPower: petSkillPower, petSkillLine: petSkillLine, petSkillOf: petSkillOf, petSkillEvery: petSkillEvery, petById: petById, petGroupOf: petGroupOf, petsInGroup: petsInGroup, petAdd: petAdd, petSeen: petSeen,
    petHasFresh: petHasFresh, petDex: petDex, petClaimSet: petClaimSet, petClaimAll: petClaimAll, petMul: petMul,
    petLvCap: petLvCap, petLvCost: petLvCost, petLevelUp: petLevelUp, petStarCost: petStarCost, petStarUp: petStarUp, petWear: petWear,
    petEquipBonus: petEquipBonus, petOwnedBonus: petOwnedBonus, petGradeWeights: petGradeWeights, petHatch: petHatch,
    petHatchAll: petHatchAll, petEggRoll: petEggRoll, petBossDrop: petBossDrop, petFoodWave: petFoodWave };
});
