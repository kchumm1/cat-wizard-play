(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // Every number but gold: Korean units, every 10^4: 만(10^4) … 무량대수(10^68). Past those the count goes on in letters
  // (A = 10^72, B = 10^76 … Z, then AA, AB …) so even the biggest numbers read as "12.3AB", never as 1.26e+33.
  var KO = ['', '만', '억', '조', '경', '해', '자', '양', '구', '간', '정', '재', '극', '항하사', '아승기', '나유타', '불가사의', '무량대수'];
  function letters(i) { var s = ''; i += 1; while (i > 0) { var r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; }
  function unit(k) { return k < KO.length ? KO[k] : letters(k - KO.length); }
  function group(n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmt(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '0';
    if (n < 10000) return group(n);
    var k = Math.floor(Math.log10(n) / 4);
    var v = n / Math.pow(10, 4 * k);
    // floating point can put a value like 9999.99… one step low or 1 one step high: settle on the right unit
    if (v < 1) { k -= 1; v = n / Math.pow(10, 4 * k); }
    var r = Math.floor(v * 10) / 10;
    if (r >= 10000) { k += 1; r = Math.floor((n / Math.pow(10, 4 * k)) * 10) / 10; }
    var s = (r % 1 === 0) ? String(r) : r.toFixed(1);
    return s + unit(k);
  }
  // Gold (2026-11-15, the user): Korean units like everything else, as the player holds it — the game's gold divided by
  // the gold scale (economy.goldScale, set by the game with setGoldScale). Holdings stop at 9999경.
  var goldDiv = 1;
  function setGoldScale(d) { goldDiv = d > 0 && isFinite(d) ? d : 1; }
  function fmtGold(n) { if (!(typeof n === 'number' && isFinite(n) && n > 0)) return '0'; var v = n / goldDiv; return v < 1 ? '1' : fmt(v); }
  // the old letter form (K, M, B, T, AA …), kept only for reading old notes
  function fmtGoldLetters(n) { return fmtGoldOld(n); }
  var BIG = ['', 'K', 'M', 'B', 'T'];
  function goldUnit(k) { if (k < BIG.length) return BIG[k]; var i = k - BIG.length; return String.fromCharCode(65 + Math.floor(i / 26) % 26) + String.fromCharCode(65 + i % 26); }
  function cut(v) { return v < 100 ? Math.floor(v * 10) / 10 : Math.floor(v); }
  function fmtGoldOld(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '0';
    if (n < 1000) return group(n);
    var k = Math.floor(Math.log10(n) / 3);
    var v = n / Math.pow(10, 3 * k);
    if (v < 1) { k -= 1; v = n / Math.pow(10, 3 * k); }
    var r = cut(v);
    if (r >= 1000) { k += 1; r = cut(n / Math.pow(10, 3 * k)); }
    var s = (r % 1 === 0) ? String(r) : r.toFixed(1);
    return s + goldUnit(k);
  }
  // a bonus as the player reads it: crit-tier damage (super…alpha) adds to a ×multiplier, so it reads in 배; the rest in %
  function bonusAmount(stat, v) {
    // a crit tier's damage: '배' is added to the multiplier, 'Pct' multiplies it (×(1 + %)) — 2026-11-16 both read as they count
    if (/^(super|ultra|hyper|mega|ultimate|alpha|omega|eternal|genesis)Dmg$/.test(stat)) return "+" + (Math.round(v * 100) / 100) + "배";
    return "+" + (Math.round(v * 1000) / 10) + "%";
  }
  // Monster and boss health (2026-11-15, the user: "11.9재" is hard to read): Korean units like fmt, rounded to a whole
  // number in the unit — 11.9재 -> 12재, 1545재 stays; 9999.6재 rounds up to 1극.
  function fmtHp(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '0';
    if (n < 10000) return group(Math.round(n));
    var k = Math.floor(Math.log10(n) / 4), v = n / Math.pow(10, 4 * k);
    if (v < 1) { k -= 1; v = n / Math.pow(10, 4 * k); }
    var r = Math.round(v);
    if (r >= 10000) { k += 1; r = Math.round(n / Math.pow(10, 4 * k)); }
    return r + unit(k);
  }
  return { fmt: fmt, fmtGold: fmtGold, setGoldScale: setGoldScale, fmtGoldLetters: fmtGoldLetters, fmtHp: fmtHp, bonusAmount: bonusAmount };
});
