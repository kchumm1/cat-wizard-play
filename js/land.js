// 가로 화면 (2026-11-17, 형: 핸드폰 가로모드를 완벽하게 · 세로모드 해 논 건 유지).
// The screen counts as sideways when it is clearly wider than tall: the same question the stylesheet asks
// (index.html, the last @media block), so the scripts and the layout never disagree. CW.isLand() answers it now;
// CW.onLand(fn) is told when it changes (the phone turned) and when a sideways window is resized.
// A box (#modal) taller than a phone held sideways is made smaller to fit the screen (CSS zoom) instead of running off
// the bottom with its buttons; upright it is left exactly as it was.
(function (root) {
  var CW = root.CW = root.CW || {};
  var Q = '(orientation:landscape) and (min-aspect-ratio:6/5)';
  var mq = root.matchMedia ? root.matchMedia(Q) : null;
  var fns = [], de = document.documentElement;
  if (/iPhone/.test(root.navigator && root.navigator.userAgent)) de.classList.add('iphone');
  CW.isLand = function () { return !!(mq && mq.matches); };
  CW.onLand = function (fn) { fns.push(fn); };
  // Which side the notch (or the Dynamic Island) is on: an iPhone held sideways keeps the same safe gap at both edges,
  // but only one of them has the notch; the other has just the round corner. The column on that side may go nearer the
  // edge (형, 2026-11-17: 핸드폰 끝쪽에 붙힌다는 느낌으로 · 더 넓게). window.orientation (Safari): 90 = turned to the left,
  // the top of the phone and its notch at the left; -90 = turned to the right, the notch at the right. Without it, the
  // screen's angle the same way (90 / 270). Not known (a computer) = no change.
  function notchSide() {
    var o = root.orientation;
    if (typeof o === 'number') return o === 90 ? 'L' : (o === -90 || o === 270) ? 'R' : '';
    var so = root.screen && root.screen.orientation, a = so && so.angle;
    return a === 90 ? 'L' : a === 270 ? 'R' : '';
  }
  // An iPhone with a notch keeps a safe gap at BOTH sides when held sideways. A Galaxy (Android) has no such gap (none in
  // the browser, one narrow side for the camera hole in a full-screen app), so the "column at the very edge / floating
  // rounded column" treatment made for the iPhone's round corners stays off there: both ways of holding it look the same
  // (형 2026-11-18, 갤럭시 안드로이드 가로).
  function twoGaps() {
    var d = document.body || de, p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:0 env(safe-area-inset-right,0px) 0 env(safe-area-inset-left,0px)';
    d.appendChild(p);
    var cs = getComputedStyle(p), ok = parseFloat(cs.paddingLeft) > 0 && parseFloat(cs.paddingRight) > 0;
    d.removeChild(p); return ok;
  }
  function markNotch() { var s = CW.isLand() && twoGaps() ? notchSide() : ''; de.classList.toggle('notchL', s === 'L'); de.classList.toggle('notchR', s === 'R'); }
  function tell() { var on = CW.isLand(); de.classList.toggle('land', on); markNotch(); fns.forEach(function (f) { try { f(on); } catch (e) { /* one listener's trouble is not the others' */ } }); fit(); }
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', tell); else if (mq.addListener) mq.addListener(tell); }
  de.classList.toggle('land', CW.isLand()); markNotch();
  root.addEventListener('orientationchange', function () { setTimeout(tell, 60); });
  if (root.screen && root.screen.orientation && root.screen.orientation.addEventListener) root.screen.orientation.addEventListener('change', function () { setTimeout(tell, 60); });
  var rt = 0;
  root.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (CW.isLand()) tell(); else fit(); }, 120); });

  // ---------- boxes made to fit ----------
  var raf = 0;
  function fit() {
    var m = document.getElementById('modal'), c = document.getElementById('modalCard'); if (!m || !c) return;
    if (m.hidden || !CW.isLand()) { if (c.style.zoom) c.style.zoom = ''; return; }
    c.style.zoom = '';
    // the card's own margins count: 돌아왔어요 keeps 150px above its card for the cat on the dome
    var cs = getComputedStyle(m), ks = getComputedStyle(c), room = m.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
      h = c.offsetHeight + (parseFloat(ks.marginTop) || 0) + (parseFloat(ks.marginBottom) || 0);
    // (a little to spare: pictures stand out of some cards — the cat's hat over 돌아왔어요)
    if (h > room && room > 0) c.style.zoom = String(Math.max(0.5, Math.floor(room / h * 960) / 1000));
  }
  function soon() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; fit(); }); }
  function watch() {
    var m = document.getElementById('modal'), c = document.getElementById('modalCard'); if (!m || !c || !root.MutationObserver) return;
    new MutationObserver(soon).observe(m, { attributes: true, attributeFilter: ['hidden'] });
    // a new box put in it; not its text (numbers counting up every frame do not change its height) and not the card's own
    // style (the zoom set here)
    new MutationObserver(soon).observe(c, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  CW.fitModal = fit;
})(window);
