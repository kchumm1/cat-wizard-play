// 공지 screens (2026-11-16, the user: 우편함 밑에 공지, 우편함과 같은 느낌으로 디자인). Tap 공지 under the mailbox: the
// megaphone pops and calls out (rings), then a cream notice board rises with its notices (pinned first, newest first),
// each a card with its tag (공지 · 업데이트 · 이벤트 · 점검), title, first line and date, and a NEW mark until read. A card
// opens the notice on its own paper; 목록으로 goes back. The button shows a red dot while something is unread.
// Notices come from notice.json on the site (js/notice.js holds the rules); drawn with CSS, no pictures to load.
(function (root) {
  var CW = root.CW;
  var list = [], page = null, view = 'list', open = null;
  var TAGC = { '공지': 'n', '업데이트': 'u', '이벤트': 'e', '점검': 'm' };
  // the megaphone (the button and the board's title), drawn so it stays sharp at any size
  var hornN = 0;
  function horn() { var k = 'nz' + (hornN++); return HORN.replace(/nzg/g, k + 'g').replace(/nzp/g, k + 'p'); }
  var HORN = '<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="nzg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#ffb34d"/></linearGradient>' +
    '<linearGradient id="nzp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb1cf"/><stop offset="1" stop-color="#e2649a"/></linearGradient></defs>' +
    '<path d="M13 30l4 11a3 3 0 0 0 4 1.8l2.2-1a3 3 0 0 0 1.5-3.8L22 31z" fill="#c95b8a" stroke="#5b2b45" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M6 18.5h8l17-9.5v30l-17-9.5H6a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z" fill="url(#nzp)" stroke="#5b2b45" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<ellipse cx="31" cy="24" rx="5.4" ry="15" fill="url(#nzg)" stroke="#5b2b45" stroke-width="2.4"/>' +
    '<path d="M8 21.5h5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>' +
    '<path d="M39.5 17.5q3 6.5 0 13M43.5 13q5 11 0 22" fill="none" stroke="#ffe27a" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var PIN = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 2h6l-1 5 3 3v1.5H11V18l-1 1-1-1v-6.5H5V10l3-3z" fill="#e8664a" stroke="#7a2a1c" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  function G() { return root.GAME; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function state() { return G().state; }
  function shown() { return CW.noticeShown(list); }
  function firstLine(n) { var ls = String(n.text || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); return ls[0] === '안녕하세요, 냥법사님!' && ls[1] ? ls[1] : ls[0] || ''; }

  // the red dot on the 공지 button
  function noticeDot() {
    var b = document.querySelector('#quick [data-quick="notice"]'); if (!b || !G()) return;
    var on = CW.noticeUnread(state(), list).length > 0, d = b.querySelector('.qdot');
    if (on && !d) { d = document.createElement('b'); d.className = 'qdot'; b.appendChild(d); }
    if (!on && d) d.remove();
  }
  function fetchNotice() {
    if (typeof fetch !== 'function') return;
    fetch('notice.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (d && Array.isArray(d.notices)) { list = d.notices; noticeDot(); if (page && page.classList.contains('on')) render(); }
    }).catch(function () {});
  }

  function tagHtml(n) { var t = CW.noticeTag(n); return '<i class="nztag ' + TAGC[t] + '">' + t + '</i>'; }
  function listHtml() {
    var s = state(), all = shown(), unread = CW.noticeUnread(s, list).length;
    var cards = all.map(function (n, k) {
      var read = CW.noticeRead(s, n);
      return '<button class="nzcard t-' + TAGC[CW.noticeTag(n)] + (read ? ' read' : '') + (n.pin ? ' pin' : '') + '" data-nzopen="' + esc(n.id) + '" style="--k:' + Math.min(k, 8) + '">' +
        '<span class="nzrow">' + tagHtml(n) + (n.pin ? '<i class="nzpin">' + PIN + '</i>' : '') + (read ? '' : '<i class="nznew">NEW</i>') + '<em>' + CW.noticeDate(n) + '</em></span>' +
        '<b>' + esc(n.title) + '</b><span class="nzsub">' + esc(firstLine(n)) + '</span><i class="nzgo" aria-hidden="true"></i></button>';
    }).join('');
    return '<div class="nzw">' + head(unread ? '새 공지 ' + unread : '') +
      '<div class="nzscroll">' + (cards || '<p class="nznone"><span>' + horn() + '</span>아직 공지가 없어요</p>') + '</div></div>';
  }
  function head(badge) {
    return '<div class="nzhead"><span class="nzhorn">' + horn() + '</span><b>공지사항</b>' + (badge ? '<i class="nzcount">' + badge + '</i>' : '') +
      '<button class="nzx" data-nzx aria-label="닫기"></button></div>';
  }
  function detailHtml(n) {
    var body = String(n.text || '').split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>'; }).join('');
    return '<div class="nzw nzone">' + head('') +
      '<div class="nzpaper"><div class="nzrow">' + tagHtml(n) + '<em>' + esc(n.date || '') + '</em></div><h3>' + esc(n.title) + '</h3><i class="nzline"></i>' +
      '<div class="nzbody">' + body + '</div></div>' +
      '<button class="nzback" data-nzback><span>목록으로</span></button></div>';
  }
  function render() {
    var n = open && shown().filter(function (x) { return x.id === open; })[0];
    if (view === 'one' && n) { G().G.readNotice(n); page.querySelector('.nzstage').innerHTML = detailHtml(n); }
    else { view = 'list'; page.querySelector('.nzstage').innerHTML = listHtml(); }
    noticeDot();
  }
  function close() { page.classList.remove('on', 'pop', 'rise'); }
  function build() {
    page = document.createElement('div'); page.id = 'noticebox'; page.setAttribute('role', 'dialog'); page.setAttribute('aria-label', '공지사항');
    page.innerHTML = '<div class="nzpop" aria-hidden="true"><span class="nzbig">' + horn() + '</span><i class="nzring a"></i><i class="nzring b"></i><i class="nzring c"></i></div><div class="nzstage"></div>';
    document.body.appendChild(page);
    page.addEventListener('click', function (e) {
      var t = e.target, g = G();
      if (t === page || t.closest('[data-nzx]')) { g.G.sound('click'); close(); return; }
      if (t.closest('.nzpop')) { page.classList.remove('pop'); return; }
      var op = t.closest('[data-nzopen]'); if (op) { g.G.sound('click'); open = op.dataset.nzopen; view = 'one'; render(); page.querySelector('.nzw').classList.add('turn'); return; }
      if (t.closest('[data-nzback]')) { g.G.sound('click'); view = 'list'; render(); return; }
    });
  }
  // tap 공지: the megaphone pops and calls out, then the board rises (a tap skips the show)
  function openNotice() {
    if (!page) build();
    view = 'list'; open = null; render();
    page.classList.remove('pop'); void page.offsetWidth;
    page.classList.add('on', 'pop', 'rise');
    clearTimeout(page._t); page._t = setTimeout(function () { page.classList.remove('pop'); }, 820);
    clearTimeout(page._r); page._r = setTimeout(function () { page.classList.remove('rise'); }, 1700);
    fetchNotice();
  }
  CW.noticeOpen = openNotice; CW.noticeDot = noticeDot; CW.noticeFetch = fetchNotice;
  CW.noticeIsOpen = function () { return !!(page && page.classList.contains('on')); };
  CW.noticeHorn = horn;
  CW.noticeStart = function () {
    fetchNotice(); setInterval(fetchNotice, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) fetchNotice(); });
  };
})(this);
