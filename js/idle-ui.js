// 방치모드 화면 (2026-11-16, the user: 공지 밑에 방치, 누르면 애니메이션으로 전투를 가리고, 쓸어 올리면 다시 메인). Picked look:
// 시안 8번 「별자리 냥법사」 (art-src/ai-review/2026-11-16-idle-mode/index2.html). Tap 방치 under 공지: a night sky comes down
// over the battle; while monsters keep falling a star lights every 1.5 s and the lines join into a cat; when all 18 are
// lit a shooting star passes and it starts over. Below: time, kills, gold, rune stones and xp won since the sky came
// down. A swipe up lifts it away; a tap only lights the "쓸어 올려서" hint. The battle keeps being drawn underneath (the
// user chose that). The screen is asked to stay on while it is up; leaving the app turns it off (js/main.js).
(function (root) {
  var CW = root.CW;
  var box = null, tally = null, timer = 0, holdUntil = 0, lastNum = 0, lock = null, on = false;
  var MOON = '<svg viewBox="2.3 -1.2 48 48" aria-hidden="true"><path d="M30 6a17 17 0 1 0 12 26A15 15 0 0 1 30 6z" fill="#ffe7a0" stroke="#5b4320" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="22" cy="21" r="2.4" fill="#e9c66a"/><circle cx="16" cy="31" r="1.7" fill="#e9c66a"/><path d="M37 13l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="#fff6cf"/></svg>';
  function G() { return root.GAME; }

  function skySvg() {
    var S = CW.IDLE_STARS, L = CW.IDLE_LINES, s = '<svg class="idcon" viewBox="0 0 260 300" aria-hidden="true">';
    L.forEach(function (l, i) { var a = S[l[0]], b = S[l[1]]; s += '<line class="idl" data-i="' + i + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; });
    S.forEach(function (p, i) { s += '<circle class="ids" data-i="' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="3"/>'; });
    return s + '</svg>';
  }
  function dust(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<i class="iddust" style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:' + (Math.random() * 3).toFixed(2) + 's;animation-duration:' + (2 + Math.random() * 3).toFixed(2) + 's"></i>';
    return s;
  }
  function build() {
    box = document.createElement('div'); box.id = 'idlebox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '방치모드');
    box.innerHTML = '<div class="idsky">' + dust(46) + '</div><i class="idshoot"></i>' +
      '<div class="idwrap">' + skySvg() + '<div class="idname">냥법사자리 · <span data-id="n">0</span>/' + CW.IDLE_STARS.length + '</div>' +
      '<div class="idnums"><div class="idtime" data-id="t">방치 중 · 0분</div>' +
      '<div class="idrow"><span>처치</span><b data-id="kill">0마리</b></div>' +
      '<div class="idrow"><span>골드</span><b data-id="gold">+0</b></div>' +
      '<div class="idrow"><span>룬석</span><b data-id="rune">+0</b></div>' +
      '<div class="idrow"><span>경험치</span><b data-id="xp">+0</b></div></div></div>' +
      '<div class="idhint"><i></i>위로 쓸어 올려서 돌아가기</div>';
    document.body.appendChild(box);
    swipe();
  }
  function set(k, v) { var el = box.querySelector('[data-id="' + k + '"]'); if (el && el.textContent !== v) el.textContent = v; }
  // stars with index below n are lit, and every line whose two stars are lit
  function draw(n) {
    box.querySelectorAll('.ids').forEach(function (c) { c.classList.toggle('on', +c.dataset.i < n); });
    CW.IDLE_LINES.forEach(function (l, i) { var e = box.querySelector('.idl[data-i="' + i + '"]'); if (e) e.classList.toggle('on', Math.max(l[0], l[1]) < n); });
    set('n', String(n));
  }
  function nums(now) {
    set('t', '방치 중 · ' + CW.idleTimeText((now - tally.start) / 1000));
    set('kill', CW.fmt(tally.kill) + '마리');
    set('gold', '+' + CW.fmtGold(tally.gold));
    set('rune', '+' + CW.fmt(tally.rune));
    set('xp', '+' + CW.fmt(tally.xp));
  }
  function tick() {
    if (!on) return;
    var now = Date.now(), r = CW.idleStars(tally, now);
    if (r.round) {
      draw(CW.IDLE_STARS.length); holdUntil = now + 1300;
      var sh = box.querySelector('.idshoot'); sh.classList.remove('go'); void sh.offsetWidth; sh.classList.add('go');
    } else if (now >= holdUntil && r.lit) draw(tally.stars);
    if (holdUntil && now >= holdUntil) { holdUntil = 0; draw(tally.stars); }
    if (now - lastNum >= 1000) { lastNum = now; nums(now); }
  }
  function wake() {
    try { if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(function (l) { if (on) lock = l; else l.release(); }).catch(function () {}); } catch (e) {}
  }
  function idleOn() {
    if (on) return;
    if (!box) build();
    on = true; tally = CW.idleTally(Date.now()); holdUntil = 0; lastNum = 0;
    draw(0); nums(Date.now());
    box.classList.remove('leave', 'drag'); box.style.transform = ''; box.style.display = 'block';
    void box.offsetWidth; box.classList.add('enter');
    document.documentElement.classList.add('idling');
    clearInterval(timer); timer = setInterval(tick, 250);
    wake();
  }
  // gone at once (leaving the app) or lifted away (the swipe)
  function idleOff(lift) {
    if (!on) return;
    on = false; clearInterval(timer); timer = 0;
    try { if (lock) lock.release(); } catch (e) {} lock = null;
    document.documentElement.classList.remove('idling');
    if (!box) return;
    if (lift) { box.classList.remove('enter', 'drag'); box.classList.add('leave'); setTimeout(function () { if (!on) box.style.display = 'none'; }, 460); }
    else { box.classList.remove('enter', 'drag', 'leave'); box.style.display = 'none'; }
  }
  function swipe() {
    var y0 = null, dy = 0, t0 = 0, pid = null;
    box.addEventListener('pointerdown', function (e) {
      if (!on || y0 !== null) return; y0 = e.clientY; dy = 0; t0 = Date.now(); pid = e.pointerId;
      try { box.setPointerCapture(pid); } catch (x) {}
      box.classList.remove('enter'); box.classList.add('drag');
    });
    box.addEventListener('pointermove', function (e) { if (y0 === null || e.pointerId !== pid) return; dy = Math.min(0, e.clientY - y0); box.style.transform = 'translateY(' + dy + 'px)'; });
    function up(e) {
      if (y0 === null || (e && e.pointerId !== pid)) return; y0 = null; box.classList.remove('drag');
      if (CW.idleSwipeDone(dy, Date.now() - t0)) { box.style.transform = ''; idleOff(true); if (G() && G().sound) G().sound('click'); return; }
      box.style.transform = '';
      if (dy > -10) { var h = box.querySelector('.idhint'); h.classList.add('lit'); clearTimeout(h._t); h._t = setTimeout(function () { h.classList.remove('lit'); }, 1500); }
    }
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    box.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function idleNote(r) { if (on && tally) CW.idleAdd(tally, r, Date.now()); }
  CW.idleOn = idleOn; CW.idleOff = idleOff; CW.idleNote = idleNote;
  CW.idleActive = function () { return on; };
  CW.idleMoon = function () { return MOON; };
})(this);
