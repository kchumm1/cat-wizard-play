// 던전 보상 책 (2026-11-17, the user's picture art-src/dungeon-book/book-mockup.webp: 「던전 돌아서 입장해서 보상화면
// 나오는 거 이 화면으로, 실제 우리 게임 재화 이모티콘 넣어서 완성해서 애니메이션화」).
// The open book is art/dbook-base.webp (tools/dungeon-book-art.py wiped the example words); the temple drawing, the red
// paw stamp and the gold 확인 seal are their own pieces so they can come in one by one. Places are the picture's own
// pixels (1536×1024) as percentages; sizes of words are in cqw (1cqw = 15.36 picture px), so the page scales as one.
// Left page: the dungeon's name, what was done, its picture (룬의 신전 = the drawn temple, the others = the dungeon's game
// picture pasted in like a photo). Right page: the rewards with the game's own currency pictures, counting up.
// The ticket shows the tickets left; the seal is the 확인 button. A tap before the end skips to the end.
(function () {
  if (typeof document === 'undefined') return;
  var CW = window.CW = window.CW || {};
  function A() { return CW.ART_BASE || 'art/'; }
  function px(x) { return (x / 15.36).toFixed(3) + '%'; }
  function py(y) { return (y / 10.24).toFixed(3) + '%'; }
  function box(x0, y0, x1, y1) { return 'left:' + px(x0) + ';top:' + py(y0) + ';width:' + px(x1 - x0) + ';height:' + py(y1 - y0); }

  var CSS = [
    '#dbook{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:max(12px,env(safe-area-inset-top,0px)) max(6px,env(safe-area-inset-right,0px)) max(12px,env(safe-area-inset-bottom,0px)) max(6px,env(safe-area-inset-left,0px));background:radial-gradient(ellipse at 50% 45%,rgba(40,26,14,.7),rgba(8,4,20,.9) 70%);-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;animation:dbkFade .25s ease-out both}',
    '#dbook.out{animation:dbkOut .28s ease-in both}',
    '#dbook img{-webkit-user-drag:none;-webkit-touch-callout:none;pointer-events:none}',
    '.dbk{position:relative;width:min(98vw,calc((100vh - 70px) * 1.5),780px);width:min(98vw,calc((100dvh - 70px) * 1.5),780px);aspect-ratio:1536/1024;container-type:inline-size;perspective:1400px;font-family:Jua,var(--display,sans-serif);color:#5d3418}',
    '.dbk-in{position:absolute;inset:0;transform-origin:50% 60%;animation:dbkOpen .55s cubic-bezier(.2,1.25,.4,1) both}',
    '.dbk-in>*{position:absolute}',
    '.dbk-base{left:0;top:0;width:100%;height:100%;filter:drop-shadow(0 1.4cqw 2cqw rgba(0,0,0,.55))}',
    // left page
    '.dbk-t{display:flex;align-items:center;justify-content:center;white-space:nowrap;line-height:1;color:#6b3b1d;text-shadow:0 .12cqw 0 rgba(255,240,210,.8),0 .3cqw .6cqw rgba(110,60,20,.25);animation:dbkInk .7s steps(14,end) .35s both}',
    '.dbk-s{display:flex;align-items:center;justify-content:center;gap:1.4cqw;white-space:nowrap;font-size:max(10px,2.55cqw);color:#6d4626;animation:dbkUp .4s ease-out .7s both}',
    '.dbk-s i{font-style:normal;color:#cf9636;font-size:1.25em;line-height:1;animation:dbkTw 2.4s ease-in-out 1.3s infinite}',
    '.dbk-s i+b+i,.dbk-s b+i{animation-delay:2.5s}',
    '.dbk-s b{color:#8a3d12;font-weight:400;font-size:1.12em}',
    '.dbk-temple{animation:dbkPic .6s ease-out .75s both}',
    '.dbk-photo{display:block;padding:.9cqw .9cqw 2.4cqw;background:#fffaf0;box-shadow:0 .5cqw 1.2cqw rgba(70,40,15,.35),inset 0 0 0 .15cqw rgba(160,120,70,.25);transform:rotate(-3deg);animation:dbkDrop .6s cubic-bezier(.2,1.3,.45,1) .75s both}',
    '.dbk-photo img{display:block;width:100%;height:auto;border-radius:.3cqw}',
    '.dbk-photo.library-photo img{aspect-ratio:1.48;object-fit:cover;object-position:center 25%}',
    '.dbk-photo::before,.dbk-photo::after{content:"";position:absolute;top:-1cqw;width:7cqw;height:2.2cqw;background:rgba(214,196,150,.78);box-shadow:0 .1cqw .3cqw rgba(90,60,20,.18)}',
    '.dbk-photo::before{left:-1.6cqw;transform:rotate(-32deg)}.dbk-photo::after{right:-1.6cqw;transform:rotate(30deg)}',
    '.dbk-photo span{position:absolute;left:0;right:0;bottom:.45cqw;text-align:center;font-size:max(9px,1.7cqw);color:#7b5a3a}',
    '.dbk-stamp{animation:dbkStamp .32s cubic-bezier(.3,1.6,.5,1) 1.3s both}',
    '.dbk-h{display:flex;align-items:center;font-size:max(9px,1.95cqw);line-height:1.35;color:#5a3a22;word-break:keep-all;animation:dbkUp .4s ease-out 1.9s both}',
    '.dbk.narrow .dbk-h{display:none}',
    '.dbk-cap{display:none;max-width:min(96vw,420px);text-align:center;font:400 13px/1.4 Jua,var(--display,sans-serif);color:#f3e6cf;text-shadow:0 1px 2px #000;animation:dbkUp .4s ease-out 1.9s both}',
    '#dbook.narrow .dbk-cap{display:block}',
    // right page: the rewards
    '.dbk-rw{display:flex;flex-direction:column;justify-content:center;gap:2.2cqw}',
    '.dbk-r{position:relative;display:grid;grid-template-columns:var(--ic,13.5cqw) 1fr;align-items:center;column-gap:2.6cqw}',
    '.dbk-ic{position:relative;width:var(--ic,13.5cqw);height:var(--ic,13.5cqw);animation:dbkPop .55s cubic-bezier(.25,1.6,.45,1) var(--d) both}',
    '.dbk-ic>.icw{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;animation:dbkBob 2.6s ease-in-out calc(var(--d) + .6s) infinite}',
    '.dbk-ic>.icw>*{width:100%!important;height:100%!important;max-width:none!important;margin:0!important;object-fit:contain;filter:drop-shadow(0 .5cqw .6cqw rgba(80,40,90,.3))}',
    '.dbk-ic>.icw>svg{width:86%!important;height:86%!important}',
    // gold strokes around the icon, as drawn on the picture
    '.dbk-ray{position:absolute;inset:-28%;pointer-events:none;animation:dbkRay .5s ease-out calc(var(--d) + .15s) both}',
    '.dbk-ray svg{width:100%;height:100%;overflow:visible;animation:dbkRayP 2.2s ease-in-out calc(var(--d) + .7s) infinite}',
    '.dbk-glow{position:absolute;inset:-18%;border-radius:50%;background:radial-gradient(closest-side,var(--gl,rgba(255,226,140,.75)),transparent);animation:dbkGlow 2.2s ease-in-out calc(var(--d) + .5s) infinite;opacity:0}',
    '.dbk-sp{position:absolute;width:2.2cqw;height:2.2cqw;opacity:0;animation:dbkSp 2.4s ease-in-out infinite}',
    '.dbk-sp svg{width:100%;height:100%;fill:#ffe9a8;filter:drop-shadow(0 0 .4cqw #ffd36a)}',
    '.dbk-tx small{font-size:max(9px,1.7cqw);line-height:1;color:#6d4626}',
    '.dbk-tx{display:flex;flex-direction:column;align-items:flex-start;gap:.6cqw;min-width:0;width:100%}',
    '.dbk-v{white-space:nowrap;line-height:1;font-size:var(--fs,4.4cqw);color:#5a2f14;text-shadow:0 .12cqw 0 rgba(255,240,210,.8);animation:dbkUp .35s ease-out calc(var(--d) + .2s) both}',
    '.dbk-v em{font-style:normal;display:inline-block}',
    '.dbk-v.pop em{animation:dbkNum .35s ease-out}',
    '.dbk-vine{width:16cqw;height:auto;margin-left:-.5cqw;animation:dbkUp .4s ease-out calc(var(--d) + .4s) both}',
    '.dbk-r.one{grid-template-columns:1fr;justify-items:center;row-gap:1.6cqw}.dbk-r.one .dbk-tx{align-items:center}.dbk-r.one .dbk-vine{margin-left:0}',
    '.dbk-r.sub{--ic:6.5cqw;--fs:max(10px,2.4cqw)}',
    '.dbk-r.sub .dbk-v{color:#7a4a28}',
    // the ticket and the seal
    '.dbk-tk{display:flex;align-items:center;justify-content:center;white-space:nowrap;font-size:max(10px,2.75cqw);color:#4f2e17;transform:rotate(-7.4deg);animation:dbkUp .4s ease-out 1.6s both}',
    '.dbk-tk b{font-weight:400;color:#8a3d12;font-size:1.15em;margin:0 .15em}',
    '.dbk-seal{padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;animation:dbkSeal .55s cubic-bezier(.3,1.5,.5,1) 1.85s both}',
    '.dbk-seal>i{position:absolute;inset:0;display:block;transform-origin:50% 40%;animation:dbkBeat 1.8s ease-in-out 2.6s infinite}',
    '.dbk-seal img{width:100%;height:100%;display:block}',
    '.dbk-seal>i::after{content:"";position:absolute;left:12%;top:10%;width:76%;height:62%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,240,170,.55),transparent);opacity:0;animation:dbkGlow 1.8s ease-in-out 2.6s infinite}',
    '.dbk-seal:active>i{transform:scale(.92)}',
    '.dbk-seal:focus-visible{outline:.4cqw solid #fff3c4;outline-offset:.2cqw;border-radius:40%}',
    // gold dust that floats up from the right page once everything is in
    '.dbk-dust{position:absolute;left:54%;top:12%;width:37%;height:50%;pointer-events:none}',
    '.dbk-dust i{position:absolute;bottom:0;width:.7cqw;height:.7cqw;border-radius:50%;background:radial-gradient(#fff6c8,#ffcf55 60%,transparent 70%);opacity:0;animation:dbkDust 3.2s ease-in infinite}',
    // skip: everything that comes in, at its end at once (the slow loops keep going)
    '.dbk.skip .dbk-in,.dbk.skip .dbk-t,.dbk.skip .dbk-s,.dbk.skip .dbk-temple,.dbk.skip .dbk-photo,.dbk.skip .dbk-stamp,.dbk.skip .dbk-h,.dbk.skip .dbk-ic,.dbk.skip .dbk-ray,.dbk.skip .dbk-v,.dbk.skip .dbk-vine,.dbk.skip .dbk-tk,.dbk.skip .dbk-seal,#dbook.skip .dbk-cap{animation-delay:0s!important;animation-duration:.01s!important}',
    '@keyframes dbkFade{from{opacity:0}}@keyframes dbkOut{to{opacity:0;transform:scale(.94)}}',
    '@keyframes dbkOpen{0%{opacity:0;transform:translateY(8%) scale(.72) rotateX(28deg)}60%{opacity:1}100%{transform:none}}',
    '@keyframes dbkInk{from{clip-path:inset(-20% 100% -20% 0)}to{clip-path:inset(-20% -2% -20% 0)}}',
    '@keyframes dbkUp{from{opacity:0;transform:translateY(.8cqw)}}',
    '@keyframes dbkPic{from{opacity:0;transform:translateY(1.4cqw) scale(.97)}}',
    '@keyframes dbkDrop{0%{opacity:0;transform:translateY(-4cqw) rotate(-14deg) scale(1.1)}100%{opacity:1;transform:rotate(-3deg)}}',
    '@keyframes dbkStamp{0%{opacity:0;transform:scale(2.3) rotate(-14deg)}70%{opacity:1;transform:scale(.94) rotate(2deg)}100%{opacity:1;transform:none}}',
    '@keyframes dbkPop{0%{opacity:0;transform:scale(0) rotate(-25deg)}100%{opacity:1;transform:none}}',
    '@keyframes dbkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-.5cqw)}}',
    '@keyframes dbkRay{0%{opacity:0;transform:scale(.5)}100%{opacity:1;transform:none}}',
    '@keyframes dbkRayP{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.07)}}',
    '@keyframes dbkGlow{0%,100%{opacity:0}50%{opacity:.85}}',
    '@keyframes dbkSp{0%,100%{opacity:0;transform:scale(.3) rotate(0)}45%{opacity:1;transform:scale(1) rotate(45deg)}70%{opacity:0;transform:scale(.4) rotate(90deg)}}',
    '@keyframes dbkNum{0%{transform:scale(1.25)}100%{transform:none}}',
    '@keyframes dbkSeal{0%{opacity:0;transform:translateY(-30%) scale(1.5) rotate(-12deg)}100%{opacity:1;transform:none}}',
    '@keyframes dbkBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}',
    '@keyframes dbkTw{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.75) rotate(30deg)}}',
    '@keyframes dbkDust{0%{opacity:0;transform:translateY(0)}15%{opacity:1}100%{opacity:0;transform:translateY(-14cqw)}}',
    '@keyframes dbkShake{0%,100%{transform:none}30%{transform:translate(.25cqw,.15cqw)}60%{transform:translate(-.2cqw,-.1cqw)}}',
    '.dbk.thud .dbk-in{animation:dbkShake .18s linear}',
    '@media (prefers-reduced-motion:reduce){#dbook *,#dbook{animation-duration:.01s!important;animation-delay:0s!important;animation-iteration-count:1!important}}'
  ].join('\n');
  var st = document.createElement('style'); st.id = 'dbookCss'; st.textContent = CSS; document.head.appendChild(st);

  var STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0c.8 5.6 3.4 8.6 10 10-6.6 1.4-9.2 4.4-10 10-.8-5.6-3.4-8.6-10-10 6.6-1.4 9.2-4.4 10-10z"/></svg>';
  // the short gold strokes on the picture, around the upper left of each reward
  var RAYS = '<svg viewBox="-50 -50 100 100" aria-hidden="true">' + [-165, -138, -112, -86, -60].map(function (a, i) {
    var r = a * Math.PI / 180, r0 = 39 + (i % 2) * 3, r1 = r0 + 9 + (i % 2) * 3;
    return '<line x1="' + (Math.cos(r) * r0).toFixed(1) + '" y1="' + (Math.sin(r) * r0).toFixed(1) + '" x2="' + (Math.cos(r) * r1).toFixed(1) + '" y2="' + (Math.sin(r) * r1).toFixed(1) + '"/>';
  }).join('') + '<style>line{stroke:#e7b23f;stroke-width:3.2;stroke-linecap:round}</style></svg>';

  function icon(kind) {
    var a = A();
    if (kind === 'gold') return '<img src="' + a + 'ic-gold.webp" alt="" draggable="false">';
    if (kind === 'gem') return '<img src="' + a + 'ic-gem.webp" alt="" draggable="false">';
    if (kind === 'rune') return '<img src="' + a + 'ic-rune.webp" alt="" draggable="false">';
    return (CW.giveIco && CW.giveIco(kind)) || '';
  }
  var GLOW = { gold: 'rgba(255,214,110,.8)', gem: 'rgba(140,220,255,.8)', mana: 'rgba(140,200,255,.8)', runeStone: 'rgba(200,160,255,.8)', rune: 'rgba(200,160,255,.8)' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // o: { kind, name, stat: [before, number, after], rewards: [{ ico, label, value, fmt, unit, sub }], tickets, onClose }
  CW.dungeonBook = function (o) {
    var old = document.getElementById('dbook'); if (old) old.remove();
    var a = A(), rows = o.rewards || [], main = rows.filter(function (r) { return !r.sub; }).length;
    var one = main <= 1, d0 = 1.0;
    var nm = String(o.name || ''), len = nm.replace(/\s/g, '').length + nm.split(' ').length * 0.35;
    var tSize = Math.min(6.9, 30 / Math.max(1, len * 0.98));
    var pic = o.kind === 'rune' && !o.photo
      ? '<img class="dbk-temple" src="' + a + 'dbook-temple.webp" alt="" draggable="false" style="' + box(104, 300, 759, 739) + '">'
      : '<span class="dbk-photo' + (o.kind === 'library' ? ' library-photo' : '') + '" style="left:' + px(196) + ';top:' + py(338) + ';width:' + px(476) + '"><img src="' + a + (o.photo || 'ui-dungeon-' + o.kind) + '.webp" alt="" draggable="false"></span>';
    var rw = rows.map(function (r, i) {
      var d = (d0 + i * 0.35).toFixed(2) + 's';
      var big = r.sub ? '' : one ? '--ic:16cqw;--fs:4.8cqw;' : '';
      var sp = r.sub ? '' : '<i class="dbk-sp" style="left:-6%;top:62%;animation-delay:calc(' + d + ' + .9s)">' + STAR + '</i><i class="dbk-sp" style="left:88%;top:-4%;animation-delay:calc(' + d + ' + 1.7s)">' + STAR + '</i>';
      return '<div class="dbk-r' + (r.sub ? ' sub' : one ? ' one' : '') + '" style="--d:' + d + ';' + big + '--gl:' + (GLOW[r.ico] || GLOW.gold) + '">' +
        '<div class="dbk-ic">' + (r.sub ? '' : '<i class="dbk-glow"></i><span class="dbk-ray">' + RAYS + '</span>') + '<span class="icw">' + icon(r.ico) + '</span>' + sp + '</div>' +
        '<div class="dbk-tx"><div class="dbk-v">' + esc(r.label) + ' <em data-n="' + i + '">' + esc(r.fmt(r.sub ? r.value : 0)) + '</em>' + esc(r.unit || '') + '</div>' +
        (r.detail ? '<small>' + esc(r.detail) + '</small>' : r.sub ? '' : '<img class="dbk-vine" src="' + a + 'dbook-vine.webp" alt="" draggable="false">') + '</div></div>';
    }).join('');
    var dust = ''; for (var k = 0; k < 9; k++) dust += '<i style="left:' + (8 + k * 10.5) + '%;animation-delay:' + (2.4 + k * 0.37).toFixed(2) + 's"></i>';
    var help = o.help === undefined ? '소탕으로 최고 기록의 보상을 바로 받을 수 있어요.' : esc(o.help);
    var el = document.createElement('div'); el.id = 'dbook'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', nm + ' 보상');
    el.innerHTML = '<div class="dbk"><div class="dbk-in">' +
      '<img class="dbk-base" src="' + a + 'dbook-base.webp" alt="" draggable="false">' +
      '<div class="dbk-t" style="' + box(205, 112, 690, 240) + ';font-size:' + tSize.toFixed(2) + 'cqw">' + esc(nm) + '</div>' +
      '<div class="dbk-s" style="' + box(190, 246, 712, 304) + '"><i>✦</i><span>' + esc(o.stat[0]) + ' <b>' + esc(o.stat[1]) + '</b>' + esc(o.stat[2] || '') + '</span><i>✦</i></div>' +
      pic +
      '<img class="dbk-stamp" src="' + a + 'dbook-stamp.webp" alt="" draggable="false" style="' + box(552, 626, 730, 732) + '">' +
      '<div class="dbk-h" style="' + box(250, 748, 604, 834) + '">' + help + '</div>' +
      '<div class="dbk-rw" style="' + box(830, 112, 1392, 626) + '">' + rw + '</div>' +
      '<div class="dbk-dust">' + dust + '</div>' +
      (o.tickets == null ? '' : '<div class="dbk-tk" style="' + box(655, 738, 950, 836) + '">남은 입장권<b>' + esc(o.tickets) + '</b>장</div>') +
      '<button class="dbk-seal" type="button" aria-label="확인" style="' + box(1165, 612, 1439, 873) + '"><i><img src="' + a + 'dbook-seal.webp" alt="" draggable="false"></i></button>' +
      '</div></div><p class="dbk-cap">' + help + '</p>';
    document.body.appendChild(el);
    var bk = el.querySelector('.dbk');
    function fit() { var w = bk.getBoundingClientRect().width; bk.classList.toggle('narrow', w < 560); el.classList.toggle('narrow', w < 560); }
    // a reward line that would not fit (measured with its final number) gets smaller; the main lines stay one size
    function fitWords() {
      var k = 1, vs = [];
      rows.forEach(function (r, i) {
        var v = ems[i].parentNode, keep = ems[i].textContent; v.style.fontSize = '';
        ems[i].textContent = r.fmt(r.value);
        var room = v.parentNode.clientWidth, need = v.scrollWidth, s0 = parseFloat(getComputedStyle(v).fontSize);
        var ki = room && need > room ? room / need * 0.97 : 1;
        if (r.sub) { if (ki < 1) v.style.fontSize = (s0 * ki).toFixed(2) + 'px'; } else { k = Math.min(k, ki); vs.push([v, s0]); }
        ems[i].textContent = keep;
      });
      if (k < 1) vs.forEach(function (x) { x[0].style.fontSize = (x[1] * k).toFixed(2) + 'px'; });
    }
    function fitAll() { fit(); fitWords(); }

    // numbers count up once their row is in
    var t0 = performance.now(), done = false, raf = 0, skipped = false;
    var ems = rows.map(function (r, i) { return el.querySelector('em[data-n="' + i + '"]'); });
    var shown = rows.map(function () { return -1; });
    fitAll(); window.addEventListener('resize', fitAll);
    function frame(now) {
      var all = true;
      rows.forEach(function (r, i) {
        if (r.sub) return;
        var start = (d0 + i * 0.35 + 0.25) * 1000, dur = 900, t = skipped ? 1 : Math.max(0, Math.min(1, (now - t0 - start) / dur));
        var e = 1 - Math.pow(1 - t, 3), v = t >= 1 ? r.value : Math.floor(r.value * e);
        if (v !== shown[i]) { shown[i] = v; ems[i].textContent = r.fmt(v); }
        if (t < 1) all = false;
        else if (!ems[i].dataset.end) { ems[i].dataset.end = 1; ems[i].parentNode.classList.add('pop'); }
      });
      if (!all) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    // the stamp lands with a small thud
    var thud = setTimeout(function () { bk.classList.add('thud'); setTimeout(function () { bk.classList.remove('thud'); }, 200); }, 1520);

    var introEnd = t0 + 2500;
    function close() {
      if (done) return; done = true;
      cancelAnimationFrame(raf); clearTimeout(thud); window.removeEventListener('resize', fitAll);
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 290);
      if (o.onClose) o.onClose();
    }
    el.addEventListener('click', function (e) {
      if (done) return;
      var seal = e.target.closest('.dbk-seal');
      if (performance.now() < introEnd && !skipped) {
        // first tap during the opening: show everything at once
        skipped = true; bk.classList.add('skip'); el.classList.add('skip'); clearTimeout(thud);
        cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
        return;
      }
      if (seal) close();
    });
    document.addEventListener('keydown', function kd(e) {
      if (done) { document.removeEventListener('keydown', kd); return; }
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); document.removeEventListener('keydown', kd); close(); }
    });
    setTimeout(function () { var b = el.querySelector('.dbk-seal'); if (b && !done) try { b.focus({ preventScroll: true }); } catch (_) {} }, 2000);
    return { close: close, el: el };
  };
})();
