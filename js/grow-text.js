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
  // 꾸욱 강화할 때 숫자 폭이 흔들리지 않게 (형 2026-11-18 「숫자만 바껴야」): 지금·다음 숫자는 소수 자리를 늘 같게
  // 0.5% → 1% → 1.5% 대신 0.5% → 1.0% → 1.5%, 2.9만 → 3만 대신 2.9만 → 3.0만, +0.2배 → +0.22배 대신 +0.20배 → +0.22배.
  // 100% 이상은 정수(100%에서 멈추는 줄이 「100%」와 비교함). 「최대」 줄은 그대로
  function pctS(v) { var p = v * 100; return (p >= 99.95 ? String(Math.round(p)) : (Math.round(p * 10) / 10).toFixed(1)) + '%'; }
  function fmtS(n) { var t = N().fmt(n); return /^\d+[^\d.,]+$/.test(t) ? t.replace(/^(\d+)/, '$1.0') : t; }
  function bonusS(stat, v) { var t = N().bonusAmount(stat, v); return /배$/.test(t) ? '+' + (Math.round(v * 100) / 100).toFixed(2) + '배' : '+' + pctS(v); }
  var NAME = { criticalDmg: '크리티컬 피해', superDmg: '테라 크리티컬 피해', hyperDmg: '솔라 크리티컬 피해', megaDmg: '노바 크리티컬 피해', ultimateDmg: '오라 크리티컬 피해',
    alphaDmg: '제로 크리티컬 피해', omegaDmg: '오메가 크리티컬 피해', eternalDmg: '이터널 크리티컬 피해', genesisDmg: '에온 크리티컬 피해', bossDmg: '보스 피해', finalPct: '모든 피해', skillDmg: '스킬 피해', weakDmg: '약점 피해', surgeDmg: '폭주 피해' };
  var OVER_NAME = { finalMul: '모든 피해', critDmg: '치명타 피해', criticalDmg: '크리티컬 피해', superDmg: '테라 피해', ultraDmg: '루나 피해', hyperDmg: '솔라 피해',
    megaDmg: '노바 피해', ultimateDmg: '오라 피해', alphaDmg: '제로 피해', omegaDmg: '오메가 피해', eternalDmg: '이터널 피해', genesisDmg: '에온 피해', bossDmg: '보스 피해', skillDmg: '스킬 피해', weakMul: '약점 피해', surgeMul: '폭주 피해' };
  // the base rows: the plain sentence, the stat it shows, how it reads, where the stat stops (if it does) and, for the
  // crit tiers, the damage that tier does when it lands
  var ROW = {
    atk: { about: '모든 공격의 기본이 되는 힘', val: function (s) { return fmtS(s.atk); }, rise: function (a, b) { return ' (+' + Math.round((b.atk / a.atk - 1) * 100) + '%)'; } },
    speed: { about: '스킬을 사용하는 속도', val: function (s) { return x(s.speedMul); }, cap: '×2.00' },
    crit: { about: '공격이 치명타로 적중할 확률', val: function (s) { return pctS(s.critRate); }, cap: '100%', own: pct(DATA.balance.critPerLevel * DATA.upgrades.crit.max) },
    critDmg: { about: '치명타가 적중했을 때의 피해 배율', val: function (s) { return x(s.critDmg); } },
    gold: { about: '몬스터·보스 처치 시 골드 획득량', val: function (s) { return '+' + pctS(s.goldMul - 1); } },
    mastery: { about: '모든 스킬에 적용되는 피해 배율', val: function (s) { return x(s.mastery); } },
  };
  // the crit tiers' rows (2026-11-16: every tier has a rate row and a damage row; rates stop at 100%)
  DATA.critTiers.forEach(function (t, i) {
    if (!i) return;
    var below = DATA.critTiers[i - 1];
    var from = i === 1 ? '치명타' : below.short, c = from.charCodeAt(from.length - 1) - 0xac00, ga = c >= 0 && c % 28 ? '이' : '가';
    var to = t.short.charCodeAt(t.short.length - 1) - 0xac00, ro = to >= 0 && to % 28 && to % 28 !== 8 ? '으로' : '로';
    // 이미 100% 에서 시작하는 단계 (크리티컬, 2026-11-17): 올리면 넘친 만큼 그 단계 피해가 오름 — 「100% → 크리티컬 피해 +0.4%」
    var base = DATA.balance[t.id + 'RateBase'] || 0;
    ROW[t.rateRow] = { about: from + ga + ' ' + t.short + ro + ' 이어질 확률', val: function (s) { return pctS(s[t.rate]); }, cap: '100%', own: base ? null : pct(DATA.balance[t.id + 'PerLevel'] * DATA.upgrades[t.rateRow].max), dmg: function (s) { return x(s[t.dmg]); },
      over: function (s) { return s[t.dmg + 'Over'] || 0; }, overName: t.short + ' 피해' };
    ROW[t.dmgRow] = { about: t.name + ' 적중 시 피해 배율', val: function (s) { return x(s[t.dmg]); } };
  });
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
      about = bs.map(function (b) { return NAME[b] || b; }).join('와 ') + '를 키워요'; // every name here ends in 피해
      // a row that grows two things (원소 지배: 약점 · 폭주) names each number, so one can tell which is which (2026-11-15, the
      // user: 원소지배만 표현이 이상하다); a row with one thing reads as before
      var amt = function (L, fix) { return bs.map(function (b) { var v = Math.min(L, u.max) * u.adds[b]; return (bs.length > 1 ? (NAME[b] || b).replace(/ 피해$/, '') + ' ' : '') + (fix ? bonusS(b, v) : N().bonusAmount(b, v)); }).join(' · '); };
      lines.push(['지금', amt(lv, 1)]);
      if (!atMax) lines.push(['다음', amt(to, 1)]);
      lines.push(['최대', amt(u.max) + ' (Lv.' + u.max + ')']);
    } else {
      var R = ROW[key], st = econ.stats(state), nx = econ.stats(withLevel(state, key, to));
      about = R.about;
      lines.push(['지금', R.val(st)]);
      var capped = R.cap && R.val(st) === R.cap;
      if (!atMax && !capped) lines.push(['다음', R.val(nx) + (R.rise ? R.rise(st, nx) : '')]);
      else if (!atMax && capped && R.over && R.over(nx) > R.over(st) + 1e-12) lines.push(['다음', R.overName + ' +' + pct(R.over(nx))]);
      if (R.dmg) lines.push(['피해', '터지면 ' + R.dmg(st)]);
      if (R.own) lines.push(['최대', R.own + ' (Lv.' + u.max + ') · 룬·신성력·특성으로 ' + R.cap + '까지']);
      else if (R.cap) lines.push(['최대', R.cap + (u.max !== null ? ' (Lv.' + u.max + ')' : '')]);
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
  return { growLines: growLines, growFmt: fmtS };
});
