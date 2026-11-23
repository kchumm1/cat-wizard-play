(function (root, f) { var m = f(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // 서버 지갑 규칙 지문: made by tools/wallet-rules.cjs --write (do not edit by hand)
  return { WALLET_RULES: '2e32387e6b31306d' };
});
