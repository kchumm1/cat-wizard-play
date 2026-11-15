// What each 성장 row says (2026-11-15, the user: the lines under 공격력 and the rest were too hard to read). Every row gets one
// plain sentence about what it does, then lines with a label in front so they line up: 지금 (what it is now), 다음 (what
// the next buy makes it), 최대 (where it stops) and 돌파 (what the levels past the max add). The numbers come from the
// game's own sums (economy.js stats), so they are what the fight uses.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var DATA = (isNode ? require('./data.js') : root.CW).DATA;
  function E() { return isNode ? require('./economy.js') : root.CW; }
  function N() { return isNode ? require('./num.js') : root.CW; }

  function pct(v) { return (Math.round(v * 1000) / 10) + '%'; }
  function x(v) { return '×' + (Math.round(v * 100) / 100).toFixed(2); }
  var NAME = { superDmg: '슈퍼 크리티컬 피해', hyperDmg: '하이퍼 크리티컬 피해', megaDmg: '메가 크리티컬 피해', ultimateDmg: '얼티밋 크리티컬 피해',
    alphaDmg: '알파 크리티컬 피해', bossDmg: '보스 피해', finalPct: '모든 피해', skillDmg: '스킬 피해', weakDmg: '약점 피해', surgeDmg: '폭주 피해' };
  var OVER_NAME = { finalMul: '모든 피해', critDmg: '치명타 피해', superDmg: '슈퍼 피해', ultraDmg: '울트라 피해', hyperDmg: '하이퍼 피해',
    megaDmg: '메가 피해', ultimateDmg: '얼티밋 피해', alphaDmg: '알파 피해', bossDmg: '보스 피해', skillDmg: '스킬 피해', weakMul: '약점 피해', surgeMul: '폭주 피해' };
  // the base rows: the plain sentence, the stat it shows, how it reads, where the stat stops (if it does) and, for the
  // crit tiers, the damage that tier does when it lands
  var ROW = {
    atk: { about: '모든 공격의 기본 힘이에요', val: function (s) { return N().fmt(s.atk); }, rise: function (a, b) { return ' (+' + Math.round((b.atk / a.atk - 1) * 100) + '%)'; } },
    speed: { about: '스킬을 쓰는 빠르기예요', val: function (s) { return x(s.speedMul); }, cap: '×2.00' },
    crit: { about: '공격이 치명타로 들어갈 확률이에요', val: function (s) { return pct(s.critRate); }, cap: '70%' },
    critDmg: { about: '치명타가 들어가면 피해가 이만큼 곱해져요', val: function (s) { return x(s.critDmg); } },
    gold: { about: '몬스터와 보스에게서 받는 골드가 늘어요', val: function (s) { return '+' + pct(s.goldMul - 1); } },
    mastery: { about: '모든 스킬 피해가 이만큼 곱해져요', val: function (s) { return x(s.mastery); } },
    superCrit: { about: '치명타가 슈퍼 크리티컬로 한 번 더 터질 확률이에요', val: function (s) { return pct(s.superRate); }, cap: '60%', dmg: function (s) { return x(s.superDmg); } },
    ultraCrit: { about: '슈퍼 크리티컬이 울트라로 한 번 더 터질 확률이에요', val: function (s) { return pct(s.ultraRate); }, cap: '50%', dmg: function (s) { return x(s.ultraDmg); } },
    hyperCrit: { about: '울트라가 하이퍼로 한 번 더 터질 확률이에요', val: function (s) { return pct(s.hyperRate); }, cap: '40%', dmg: function (s) { return x(s.hyperDmg); } },
    megaCrit: { about: '하이퍼가 메가로 한 번 더 터질 확률이에요', val: function (s) { return pct(s.megaRate); }, cap: '30%' },
    megaDmg: { about: '메가 크리티컬이 터지면 피해가 이만큼 곱해져요', val: function (s) { return x(s.megaDmg); } },
    ultimateCrit: { about: '메가가 얼티밋으로 한 번 더 터질 확률이에요', val: function (s) { return pct(s.ultimateRate); }, cap: '25%' },
    ultimateDmg: { about: '얼티밋 크리티컬이 터지면 피해가 이만큼 곱해져요', val: function (s) { return x(s.ultimateDmg); } },
    alphaCrit: { about: '얼티밋이 알파로 한 번 더 터질 확률이에요', val: function (s) { return pct(s.alphaRate); }, cap: '20%' },
    alphaDmg: { about: '알파 크리티컬이 터지면 피해가 이만큼 곱해져요', val: function (s) { return x(s.alphaDmg); } }
  };
  function withLevel(state, key, lv) { var up = {}; for (var k in state.up) up[k] = state.up[k]; up[key] = lv; var c = {}; for (var j in state) c[j] = state[j]; c.up = up; return c; }
  function overText(key, lv) {
    var u = DATA.upgrades[key], t = E().overInfo({ up: (function () { var o = {}; o[key] = lv; return o; })() }, key);
    return t && u.max !== null && lv > u.max ? OVER_NAME[t.stat] + ' +' + Math.round(t.pct * 100) + '%' : null;
  }
  // lines: [[label, text], …] in order; n = how many levels the buy button adds now (×1, ×10, ×100)
  function growLines(state, key, n) {
    var u = DATA.upgrades[key], lv = (state.up || {})[key] || 0, to = lv + Math.max(1, n || 1), econ = E();
    var lines = [], about, atMax = u.max !== null && lv >= u.max, hasOver = !!econ.overInfo(state, key);
    if (u.adds) {
      var bs = Object.keys(u.adds);
      about = bs.map(function (b) { return NAME[b] || b; }).join(' · ') + '를 키워요'; // every name here ends in 피해
      var amt = function (L) { return bs.map(function (b) { return N().bonusAmount(b, Math.min(L, u.max) * u.adds[b]); }).join(' · '); };
      lines.push(['지금', amt(lv)]);
      if (!atMax) lines.push(['다음', amt(to)]);
      lines.push(['최대', amt(u.max) + ' (Lv.' + u.max + ')']);
    } else {
      var R = ROW[key], st = econ.stats(state), nx = econ.stats(withLevel(state, key, to));
      about = R.about;
      lines.push(['지금', R.val(st)]);
      var capped = R.cap && R.val(st) === R.cap;
      if (!atMax && !capped) lines.push(['다음', R.val(nx) + (R.rise ? R.rise(st, nx) : '')]);
      if (R.dmg) lines.push(['피해', '터지면 ' + R.dmg(st)]);
      if (R.cap) lines.push(['최대', R.cap + (u.max !== null ? ' (Lv.' + u.max + ')' : '')]);
      else if (u.max !== null) lines.push(['최대', 'Lv.' + u.max]);
    }
    // 한계 돌파: past the max each level adds 1% to the damage the row is about
    if (hasOver || (atMax && econ.overInfo(withLevel(state, key, u.max + 1), key))) {
      var now = overText(key, lv), next = overText(key, Math.max(to, u.max + 1));
      if (now) lines.push(['돌파', now]);
      if (atMax) lines.push(['다음', next]);
    }
    return { about: about, lines: lines };
  }
  return { growLines: growLines };
});
