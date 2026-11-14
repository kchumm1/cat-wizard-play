(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // Korean number units, every 10^4: 만(10^4) … 무량대수(10^68). Past those the count goes on in letters (A = 10^72,
  // B = 10^76 … Z, then AA, AB …) so even the biggest numbers in the game read as "12.3AB", never as 1.26e+33.
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
  // a bonus as the player reads it: crit-tier damage (super…alpha) adds to a ×multiplier, so it reads in 배; the rest in %
  function bonusAmount(stat, v) {
    if (/^(super|ultra|hyper|mega|ultimate|alpha)Dmg$/.test(stat)) return "+" + (Math.round(v * 100) / 100) + "배";
    return "+" + (Math.round(v * 1000) / 10) + "%";
  }
  return { fmt: fmt, bonusAmount: bonusAmount };
});
