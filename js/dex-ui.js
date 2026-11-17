// Monster codex page (2026-11-15): a full-screen page over the game, built from the pieces of the picture the user sent
// (art/dex-*.webp, tools/cut-dex.py). Places inside each piece are percentages of that piece measured on the picture.
// Monster pictures are fetched only when their card scrolls into view (220 of them would weigh down a phone).
(function (root) {
  var CW = root.CW, DATA = CW.DATA;
  var A = function () { return CW.ART_BASE || 'art/'; };
  var page = null, panel = null, filter = 'all', io = null, onClose = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nameOf(id) { var b = CW.BESTIARY && CW.BESTIARY[id]; return (b && b.name) || id; }
  function pad3(n) { return ('00' + n).slice(-3); }
  function day(t) { var d = new Date(t); return d.getFullYear() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + ('0' + d.getDate()).slice(-2); }

  function dexDot(on) {
    var b = document.querySelector('#quick [data-quick="dex"]'); if (!b) return;
    var d = b.querySelector('.qdot');
    if (on && !d) { d = document.createElement('b'); d.className = 'qdot'; b.appendChild(d); }
    if (!on && d) d.remove();
  }

  function card(s, e) {
    var got = s.dex && s.dex[e.id], fresh = got && got.n;
    return '<button class="dxcard' + (got ? ' got' : ' lock') + (fresh ? ' fresh' : '') + '" data-dx="' + e.id + '">' +
      '<img class="dxframe" src="' + A() + (fresh ? 'dex-card-gold' : 'dex-card') + '.webp" alt="" draggable="false">' +
      (fresh ? '<img class="dxnew" src="' + A() + 'dex-new.webp" alt="NEW" draggable="false">' : '') +
      '<b class="dxno">' + pad3(e.no) + '</b>' +
      '<i class="dxpic" data-pic="' + e.id + '"></i>' +
      (got ? '' : '<img class="dxlock" src="' + A() + 'dex-lock.webp" alt="" draggable="false">') +
      '<span class="dxname">' + (got ? esc(nameOf(e.id)) : '???') + '</span></button>';
  }

  function render() {
    var s = CW.dexState(), order = CW.dexOrder(), have = 0;
    order.forEach(function (e) { if (s.dex && s.dex[e.id]) have++; });
    var pct = Math.floor(have / order.length * 100);
    var bonusTxt = CW.dexBonusText(), anyNew = CW.dexHasNew(s);
    var groups = CW.dexRegions().map(function (R, r) {
      var list = order.filter(function (e) {
        if (e.region !== r) return false;
        var got = !!(s.dex && s.dex[e.id]);
        return filter === 'all' || (filter === 'found' ? got : !got);
      });
      if (!list.length) return '';
      var g = CW.dexRegion(s, r);
      // the sky world's regions start under their own heading (하늘 세계, 2026-11-17)
      return (r === 10 ? '<h3 class="dxworld">하늘 세계</h3>' : '') + '<section class="dxreg' + (g.done ? ' done' : '') + '"><h4><span class="dxrn">' + esc(R.name) + '</span><span class="dxrc">' + g.have + ' / ' + g.total + '</span>' +
        (g.done ? '<span class="dxdone">완성 · ' + bonusTxt + '</span>' : '<span class="dxrb">다 채우면 ' + bonusTxt + '</span>') + '</h4>' +
        '<div class="dxgrid">' + list.map(function (e) { return card(s, e); }).join('') + '</div></section>';
    }).join('');
    page.querySelector('.dxbody').innerHTML =
      '<div class="dxprog"><img src="' + A() + 'dex-progress.webp" alt="" draggable="false">' +
        '<b class="dxcount">발견 ' + have + ' / ' + order.length + '</b>' +
        '<i class="dxbar" style="width:' + (60.7 * have / order.length) + '%"></i><b class="dxpct">' + pct + '%</b></div>' +
      '<div class="dxtabs">' + [['all', '전체'], ['found', '발견'], ['missing', '미발견']].map(function (t) {
        return '<button data-dxf="' + t[0] + '"' + (filter === t[0] ? ' class="on"' : '') + '><img src="' + A() + (filter === t[0] ? 'dex-tab-on' : 'dex-tab-off') + '.webp" alt="" draggable="false"><span>' + t[1] + '</span></button>';
      }).join('') + '</div>' +
      (anyNew ? '<button class="dxall" data-dxall="1">NEW 모두 확인</button>' : '') +
      (groups || '<p class="dxempty">이 조건에 맞는 몬스터가 없어요.</p>') +
      '<img class="dxfoot" src="' + A() + 'dex-foot.webp" alt="새로운 만남을 도감에 모아보세요" draggable="false">';
    watchPics(); fitNames();
  }
  // a long name is made just small enough to fit its pill
  function fitNames() {
    page.querySelectorAll('.dxname').forEach(function (n) {
      n.style.fontSize = '';
      var room = n.clientWidth - 2, r = document.createRange(); r.selectNodeContents(n);
      var w = r.getBoundingClientRect().width;
      if (w > room && room > 0) n.style.fontSize = (parseFloat(getComputedStyle(n).fontSize) * room / w).toFixed(2) + 'px';
    });
  }

  // a card's picture is set when it comes near the screen; a locked one is the same picture as a purple shadow (CSS mask)
  function watchPics() {
    if (io) io.disconnect();
    var s = CW.dexState();
    var show = function (el) {
      var id = el.dataset.pic, url = 'url(' + A() + id + '.webp)';
      if (s.dex && s.dex[id]) el.style.backgroundImage = url; else { el.style.webkitMaskImage = url; el.style.maskImage = url; }
      el.removeAttribute('data-pic');
    };
    var els = page.querySelectorAll('[data-pic]');
    if (!('IntersectionObserver' in root)) { els.forEach(show); return; }
    io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); show(x.target); } }); }, { root: page.querySelector('.dxbody'), rootMargin: '300px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function showInfo(id) {
    var s = CW.dexState(), got = s.dex && s.dex[id];
    if (got && got.n) { CW.dexSeen(s, id); dexDot(CW.dexHasNew(s)); }
    var h = CW.dexHint(s, id), url = 'url(' + A() + id + '.webp)', R = CW.dexRegionData(got ? got.r : h.region) || {};
    var where = '';
    if (!got) {
      where = esc(R.name || '') + '에서 나와요';
      if (h.diff !== null) where = h.diffOpen ? esc(DATA.difficulties[h.diff].name) + ' 난이도 ' + where : esc(R.name || '') + ' · 더 어려운 난이도에서 나와요';
    }
    panel.innerHTML = '<div class="dxsheet"><img class="dxpanel" src="' + A() + 'dex-panel.webp" alt="" draggable="false">' +
      '<button class="dxx" aria-label="닫기">×</button>' +
      '<div class="dxtitle"><b>' + (got ? esc(nameOf(id)) : '???') + '</b>' + (got ? '<img src="' + A() + 'dex-badge.webp" alt="발견" draggable="false">' : '') + '</div>' +
      '<i class="dxbig' + (got ? '' : ' shade') + '" style="' + (got ? 'background-image:' + url : '-webkit-mask-image:' + url + ';mask-image:' + url) + '"></i>' +
      '<span class="dxv dxdate">' + (got ? (got.t ? day(got.t) : '기록 전부터 만남') : '-') + '</span>' +
      '<span class="dxv dxwhere">' + (got ? esc(R.name || '') : '-') + '</span>' +
      '<span class="dxnote">' + (got ? '' : where) + '</span>' +
      '<span class="dxdesc"><img src="' + A() + 'dex-leaf-l.webp" alt=""><span>' + (got ? esc((CW.DEX_TEXT || {})[id] || '') : '아직 발견하지 못했어요') + '</span><img src="' + A() + 'dex-leaf-r.webp" alt=""></span></div>';
    panel.classList.add('on');
    var c = page.querySelector('[data-dx="' + id + '"]');
    if (c && c.classList.contains('fresh')) { c.classList.remove('fresh'); c.querySelector('.dxframe').src = A() + 'dex-card.webp'; var nw = c.querySelector('.dxnew'); if (nw) nw.remove(); }
  }

  function build() {
    page = document.createElement('div'); page.id = 'dex'; page.setAttribute('role', 'dialog'); page.setAttribute('aria-label', '몬스터 도감');
    // Android only (2026-11-15, a friend's phone): the gap kept for the iPhone clock showed as an empty lilac strip above
    // the title picture there; the iPhone keeps its gap (index.html #dex.android)
    if (/Android/i.test(navigator.userAgent || '')) page.classList.add('android');
    page.innerHTML = '<div class="dxcol"><div class="dxhead"><img src="' + A() + 'dex-head.webp" alt="몬스터 도감" draggable="false"><button class="dxback" aria-label="돌아가기"></button></div>' +
      '<div class="dxbody"></div></div><div class="dxinfo"></div>';
    document.body.appendChild(page);
    panel = page.querySelector('.dxinfo');
    page.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('.dxback')) { close(); return; }
      if (t.closest('.dxx') || t === panel) { panel.classList.remove('on'); return; }
      if (t.closest('[data-dxall]')) { var st = CW.dexState(), y = page.querySelector('.dxbody').scrollTop; CW.dexSeenAll(st); dexDot(false); render(); page.querySelector('.dxbody').scrollTop = y; return; }
      var f = t.closest('[data-dxf]'); if (f) { filter = f.dataset.dxf; panel.classList.remove('on'); render(); page.querySelector('.dxbody').scrollTop = 0; return; }
      var c = t.closest('[data-dx]'); if (c) showInfo(c.dataset.dx);
    });
  }
  function open(done) {
    if (!page) build();
    onClose = done || null; filter = 'all';
    panel.classList.remove('on');
    page.classList.add('on'); render(); page.querySelector('.dxbody').scrollTop = 0;
  }
  function close() {
    if (!page) return; page.classList.remove('on'); panel.classList.remove('on');
    if (io) io.disconnect(); page.querySelector('.dxbody').innerHTML = '';
    if (onClose) onClose();
  }
  CW.dexOpen = open; CW.dexClose = close; CW.dexDot = dexDot;
  CW.dexIsOpen = function () { return !!(page && page.classList.contains('on')); };
})(this);
