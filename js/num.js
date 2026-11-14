(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // Letter units every 10^3 (2026-11-14, was Korean 만·억·조…): K, M, B, T, then two letters aa (10^15), ab … az, ba …,
  // so even the biggest numbers in the game read like "12.3ab", never as 1.26e+33. At most three digits: 1.2K, 12.3K, 123K.
  var BIG = ['', 'K', 'M', 'B', 'T'];
  function unit(k) { if (k < BIG.length) return BIG[k]; var i = k - BIG.length; return String.fromCharCode(97 + Math.floor(i / 26) % 26) + String.fromCharCode(97 + i % 26); }
  function group(n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function cut(v) { return v < 100 ? Math.floor(v * 10) / 10 : Math.floor(v); }
  function fmt(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '0';
    if (n < 1000) return group(n);
    var k = Math.floor(Math.log10(n) / 3);
    var v = n / Math.pow(10, 3 * k);
    // floating point can put a value like 999.99… one step low or 1 one step high: settle on the right unit
    if (v < 1) { k -= 1; v = n / Math.pow(10, 3 * k); }
    var r = cut(v);
    if (r >= 1000) { k += 1; r = cut(n / Math.pow(10, 3 * k)); }
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
