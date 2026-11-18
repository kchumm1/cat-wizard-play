(function (root, f) { var m = f(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // 서버 지갑 1단계 (2026-11-18): the parts of the save the server owns. Whatever the phone has there, the server's
  // value wins (diamonds, what diamonds bought, gift boxes, coupons, the daily/dungeon counters). The phone (js/wallet.js)
  // and the server (server/wallet-core.cjs) both use this one list. Dotted names are fields inside an object.
  // (costume.wear, dailyGems.hide and the rest of mail stay the phone's: wearing a costume or hiding the daily popup is not
  // worth anything and must not be undone by the next sync)
  var SERVER_FIELDS = ['gems', 'pulls', 'pity', 'relics', 'costume.owned', 'firstBuy', 'packs',
    'dailyGems.left', 'dailyGems.last', 'dailyGems.total', 'dailyGems.gems', 'mail.pid', 'mail.got', 'chest', 'coupons', 'gemSeen',
    'dungeon.day', 'dungeon.used', 'dungeon.bonus'];
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function getAt(o, p) { var k = p.split('.'); for (var i = 0; i < k.length; i++) { if (o == null) return undefined; o = o[k[i]]; } return o; }
  function setAt(o, p, v) {
    var k = p.split('.');
    for (var i = 0; i < k.length - 1; i++) { if (o[k[i]] == null || typeof o[k[i]] !== 'object') o[k[i]] = {}; o = o[k[i]]; }
    if (v === undefined) delete o[k[k.length - 1]]; else o[k[k.length - 1]] = v;
  }
  // { 'gems': 5, 'dungeon.used': {...}, ... } — a copy, so later changes to the state do not reach it
  function pickServer(state) { var out = {}; SERVER_FIELDS.forEach(function (p) { out[p] = clone(getAt(state, p)); }); return out; }
  function applyServer(state, server) {
    if (!server) return state;
    SERVER_FIELDS.forEach(function (p) { if (Object.prototype.hasOwnProperty.call(server, p)) setAt(state, p, clone(server[p])); });
    return state;
  }
  return { SERVER_FIELDS: SERVER_FIELDS, pickServer: pickServer, applyServer: applyServer };
});
