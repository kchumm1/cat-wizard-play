(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var UNITS = ['', '만', '억', '조', '경', '해', '자', '양'];
  function group(n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmt(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '0';
    if (n < 10000) return group(n);
    var k = Math.floor(Math.log10(n) / 4);
    if (k >= UNITS.length) return n.toExponential(2);
    var v = n / Math.pow(10, 4 * k);
    var r = Math.floor(v * 10) / 10;
    if (r >= 10000 && k + 1 < UNITS.length) { k += 1; r = Math.floor((n / Math.pow(10, 4 * k)) * 10) / 10; }
    var s = (r % 1 === 0) ? String(r) : r.toFixed(1);
    return s + UNITS[k];
  }
  return { fmt: fmt };
});
