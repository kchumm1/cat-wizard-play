(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  var econ = isNode ? require('./economy.js') : root.CW;
  var lvl = isNode ? require('./level.js') : root.CW;
  var KEY = 'cw-save';

  function newState() {
    return {
      version: 1, stage: 0, best: -1, kills: 0, tier: 1, farming: false, bossTry: false, diff: 0, diffUnlocked: 0, diffBest: {}, level: 1, xp: 0,
      gold: 0, gems: DATA.balance.startGems,
      up: { atk: 0, speed: 0, crit: 0, critDmg: 0, gold: 0, mastery: 0, superCrit: 0, ultraCrit: 0, hyperCrit: 0, megaCrit: 0, megaDmg: 0, ultimateCrit: 0, ultimateDmg: 0, alphaCrit: 0, alphaDmg: 0,
        catEye: 0, manaBurst: 0, resonance: 0, rift: 0, arcane: 0, judge: 0, origin: 0, haste: 0, doomClaw: 0, elemRule: 0 },
      slots: ['starShot', 'magicClaw', 'furBomb', 'sparkRing'], skillLv: {}, relics: {}, preset: 0, presets: [null, null, null],
      costume: { owned: { basic: 1 }, wear: 'basic' },
      talents: {}, marks: {}, rank: 0, circle: 0, mana: 0, runes: {}, runeGrade: {}, runeStone: 0, packs: {}, dailyGems: { left: 0, last: '' }, sigil: { items: [], seq: 0, sets: [[], [], []], cur: 0, lv: 0, stone: 0 }, alch: { brews: 0, until: {} }, codex: {}, dungeon: { day: '', used: {}, best: {} },
      divine: { staff: { lv: 0, star: 0 }, robe: { lv: 0, star: 0 }, charm: { lv: 0, star: 0 }, shards: 0 },
      inv: [], bag: {}, equip: { hat: null, staff: null, robe: null, belt: null, necklace: null, ear: null, ring: null },
      pulls: 0, pity: 0, uidSeq: 0, firstBuy: {}, firstClear: {},
      settings: { sound: true, pixel: false, quality: 'auto', autoBoss: true, dmgSize: 60, dmgAlpha: 85 },
      lastSeen: Date.now()
    };
  }
  function fill(base, saved) {
    for (var k in base) {
      if (!(k in saved)) saved[k] = base[k];
      else if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && saved[k] && typeof saved[k] === 'object') fill(base[k], saved[k]);
    }
    return saved;
  }
  function save(state, storage) {
    try { if (!storage) return false; state.lastSeen = Date.now(); storage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }
  // 2체인/3체인 were replaced by 약점 피해 / 폭주 피해: sigils change their stat (their value is worked out from it),
  // gear potential lines keep their roll but move to the new range (ten times the old numbers)
  function migrateChain(s) {
    var MAP = { chain2: 'weakDmg', chain3: 'surgeDmg' };
    ((s.sigil && s.sigil.items) || []).forEach(function (it) { if (MAP[it.stat]) it.stat = MAP[it.stat]; });
    var bag = s.bag || {};
    Object.keys(bag).forEach(function (k) { (bag[k] && bag[k].pot || []).forEach(function (p) { if (p.stat === 'chain2') { p.stat = 'weakDmg'; p.val = (p.val || 0) * 10; } }); });
    return s;
  }
  function load(storage) {
    try {
      if (!storage) return null;
      var raw = storage.getItem(KEY); if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object' || typeof obj.stage !== 'number') return null;
      return migrateChain(fill(newState(), obj));
    } catch (e) { return null; }
  }
  // save code: the whole progress as one copy-and-paste text, to move it between phones without a server
  function b64enc(str) { return isNode ? Buffer.from(str, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(str))); }
  function b64dec(b) { return isNode ? Buffer.from(b, 'base64').toString('utf8') : decodeURIComponent(escape(atob(b))); }
  function exportCode(state) { return 'CW1:' + b64enc(JSON.stringify(state)); }
  // Forgiving: the code may arrive with words before or after it (a memo, a chat message), line breaks or spaces inside,
  // invisible characters, the URL-safe base64 letters, a missing "CW1:" or missing "=" at the end.
  function importCode(code) {
    try {
      var c = String(code || '').replace(/[\s​-‍﻿]+/g, '');
      var at = c.indexOf('CW1:'); c = at >= 0 ? c.slice(at + 4) : c;
      var m = /[A-Za-z0-9+/\-_]{40,}={0,2}/.exec(c); if (!m) return null;
      var b = m[0].replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
      while (b.length % 4) b += '=';
      var json = b64dec(b); return load({ getItem: function () { return json; } });
    } catch (e) { return null; }
  }
  function clear(storage) { try { storage && storage.removeItem(KEY); } catch (e) { } }
  function offlineReward(state, now) {
    var sec = Math.floor(((now || Date.now()) - (state.lastSeen || now)) / 1000);
    sec = Math.max(0, Math.min(DATA.balance.offlineCapSec, isFinite(sec) ? sec : 0));
    if (sec < 1) return { seconds: 0, gold: 0, gems: 0, xp: 0 };
    var gold = econ.goldPerSecond(state) * sec * DATA.balance.offlineRate;
    var gems = Math.floor(sec / 1800) * (1 + Math.floor(Math.max(0, state.best) / 31));
    var xp = econ.killsPerSecond(state) * sec * DATA.balance.offlineRate * lvl.killXp(state) * (econ.stats(state).xpMul || 1) * DATA.balance.killPay;
    return { seconds: sec, gold: gold, gems: gems, xp: xp };
  }
  function buy(state, i) {
    var p = DATA.shop[i]; if (!p) return 0;
    var n = state.firstBuy[i] ? p.gems : p.gems * 2;
    state.firstBuy[i] = true; state.gems += n;
    return n;
  }
  return { newState: newState, save: save, load: load, exportCode: exportCode, importCode: importCode, clearSave: clear, offlineReward: offlineReward, buy: buy };
});
