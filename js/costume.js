// Costumes: one per grade (일반 → 멸망), bought with diamonds and enhanced with diamonds.
// The worn one sets the look; every owned one gives its bonus (levels, plus a star every few levels) and a collection bonus.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var C = DATA.costumeConf;
  function byId(id) { for (var i = 0; i < DATA.costumes.length; i++) if (DATA.costumes[i].id === id) return DATA.costumes[i];
    var L = DATA.looks || []; for (var j = 0; j < L.length; j++) if (L[j].id === id) return L[j]; return null; }
  // 멸망 외형(DATA.looks)은 형꺼에만 (친구꺼 = 체험판에서는 입을 수 없고, 저장에 남아 있어도 기본 옷으로 보인다)
  function friend() { return !isNode && !!(root && root.CW && root.CW.FRIEND); }
  function owned(state) { if (!state.costume) state.costume = { owned: { basic: 1 }, wear: 'basic' }; return state.costume.owned; }
  function costumeUpCost(c, lv) { return Math.ceil(C.upBase * Math.pow(C.upGrowth, c.grade) * (1 + lv * C.upLv)); }
  function costumeStars(lv) { return Math.floor((lv || 0) / C.starEvery); }
  function buyCostume(state, id) {
    var c = byId(id), own = owned(state); if (!c || c.past || own[id] || state.gems < c.price) return false;   // 지난 코스튬(past)은 못 삼
    state.gems -= c.price; own[id] = 1; return true;
  }
  // 지난 코스튬 (2026-11-23): 판매가 끝난 코스튬(past: true)은 가진 사람에게만 보임 (쿠폰·편지로 받으면 바로 보임)
  function costumeVisible(state, c) { return !!c && (!c.past || !!owned(state)[c.id]); }
  function upCostume(state, id) {
    var c = byId(id), own = owned(state), lv = own[id] || 0; if (!c || c.look || !lv || lv >= C.maxLv) return false;
    var cost = costumeUpCost(c, lv); if (state.gems < cost) return false;
    state.gems -= cost; own[id] = lv + 1; return true;
  }
  function wearCostume(state, id) { var w = byId(id); if (!w || !owned(state)[id] || (w.look && friend())) return false; state.costume.wear = id; if(state.dungeon && state.dungeon.explore)state.dungeon.explore.wearing=false; return true; }
  function costumeLook(state) { var e=state.dungeon && state.dungeon.explore; if(e && e.maps && e.wearing)return {id:'explorer',art:'hero',outfit:{h:164,s:.64,v:.76,compass:true},fx:null}; var c = byId(state.costume && state.costume.wear) || DATA.costumes[0]; if (c.look && friend()) c = DATA.costumes[0]; return { id: c.id, art: c.art, outfit: c.outfit, fx: c.fx || null, look: !!c.look, act: c.act || null }; }
  function costumeValue(c, lv) { return lv * c.per * (1 + costumeStars(lv) * C.starBonus); }
  function costumeStats(state) {
    var b = {}, own = (state.costume && state.costume.owned) || {}, n = 0;
    DATA.costumes.forEach(function (c) { var lv = own[c.id] || 0; if (lv) { b[c.stat] = (b[c.stat] || 0) + costumeValue(c, lv); n++; } });
    if (n > 1) b.finalPct = (b.finalPct || 0) + (n - 1) * C.collect;
    return b;
  }
  return { costumeVisible: costumeVisible, costumeById: byId, costumeUpCost: costumeUpCost, costumeStars: costumeStars, costumeValue: costumeValue, buyCostume: buyCostume, upCostume: upCostume,
    wearCostume: wearCostume, costumeLook: costumeLook, costumeStats: costumeStats };
});
