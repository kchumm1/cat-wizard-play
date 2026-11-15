// 체험판 (2026-11-15): the friend page (friend.html, made by tools/build-site.cjs from the same index.html and the same
// game files, so every patch reaches it too) sets window.CW_FRIEND before this file. In 체험판 the diamond shop and the
// packages cannot be taken and the 10th job does not open. The mark is kept in this browser, so taking the page name
// off the address does not undo it; index.html?owner=1 takes it away again (for testing friend.html on your own phone).
(function (root) {
  var f = !!root.CW_FRIEND;
  try {
    if (/[?&]owner=1/.test(root.location.search)) localStorage.removeItem('cw-friend');
    else if (f) localStorage.setItem('cw-friend', '1');
    else f = localStorage.getItem('cw-friend') === '1';
  } catch (e) {}
  root.CW = root.CW || {};
  root.CW.FRIEND = f;
  root.CW.FRIEND_MAX_TIER = 9;
})(this);
