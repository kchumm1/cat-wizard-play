(function (root, f) { var m = f(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // 서버 지갑 1단계 (2026-11-18): the parts of the save the server owns. Whatever the phone has there, the server's
  // value wins (diamonds, what diamonds bought, gift boxes, coupons, the daily/dungeon counters). The phone (js/wallet.js)
  // and the server (server/wallet-core.cjs) both use this one list. Dotted names are fields inside an object.
  // (costume.wear, dailyGems.hide and the rest of mail stay the phone's: wearing a costume or hiding the daily popup is not
  // worth anything and must not be undone by the next sync)
  var SERVER_FIELDS = ['gems', 'pulls', 'pity', 'relics', 'costume.owned', 'firstBuy', 'packs',
    'dailyGems.left', 'dailyGems.last', 'dailyGems.total', 'dailyGems.gems', 'mail.pid', 'mail.got', 'chest', 'coupons', 'gemSeen',
    'dungeon.day', 'dungeon.used', 'dungeon.bonus',
    'openEvent.att', 'openEvent.claimed', 'openEvent.pass'];   // 오픈 기념 이벤트 (js/open-event.js; base·seen stay the phone's)
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function getAt(o, p) { var k = p.split('.'); for (var i = 0; i < k.length; i++) { if (o == null) return undefined; o = o[k[i]]; } return o; }
  function setAt(o, p, v) {
    var k = p.split('.');
    // 배열로 올린 칸도 객체로 바꿈 (2026-11-23 점검: openEvent: [] 로 올리면 서버 값이 배열 속성에 붙었다 사라져 출석을 끝없이 받음)
    for (var i = 0; i < k.length - 1; i++) { if (o[k[i]] == null || typeof o[k[i]] !== 'object' || Array.isArray(o[k[i]])) o[k[i]] = {}; o = o[k[i]]; }
    if (v === undefined) delete o[k[k.length - 1]]; else o[k[k.length - 1]] = v;
  }
  // { 'gems': 5, 'dungeon.used': {...}, ... } — a copy, so later changes to the state do not reach it
  // 오픈 기념 이벤트 칸은 없을 때 null로 실어 보냄 (JSON이 undefined를 버려서 폰에 남은 칸이 안 지워지던 것, 2026-11-23)
  var NULLED = /^openEvent./;
  function pickServer(state) { var out = {}; SERVER_FIELDS.forEach(function (p) { var v = clone(getAt(state, p)); out[p] = v === undefined && NULLED.test(p) ? null : v; }); return out; }
  function applyServer(state, server) {
    if (!server) return state;
    SERVER_FIELDS.forEach(function (p) { if (Object.prototype.hasOwnProperty.call(server, p)) setAt(state, p, server[p] === null && NULLED.test(p) ? undefined : clone(server[p])); });
    return state;
  }
  return { SERVER_FIELDS: SERVER_FIELDS, pickServer: pickServer, applyServer: applyServer };
});
