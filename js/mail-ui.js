// 우편함 screens (2026-11-15, the user's pictures art-src/mail/): tap the mailbox → it pops and the letters fan out →
// the list window (전체 / 받지 않은 우편, 새 편지 N, 보상 모두 받기, 내 우편번호) or, with no letter, the empty window;
// a letter opens on its own paper (보낸 사람, 내용, 첨부 보상, 보상 받기, 목록으로 돌아가기). Each window is the picture
// itself (art/mail-*.webp, tools/mail-art.py) with the example words wiped; places are percentages of that picture.
// Letters come from mail.json on the site (js/mail.js holds the rules).
(function (root) {
  var CW = root.CW;
  var list = [], page = null, view = 'list', tab = 'all', open = null;

  function G() { return root.GAME; }
  var PAW = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><circle cx="5.6" cy="10.4" r="2.3"/><circle cx="9.4" cy="6.4" r="2.4"/><circle cx="14.6" cy="6.4" r="2.4"/><circle cx="18.4" cy="10.4" r="2.3"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function state() { return G().state; }
  function waiting() { return CW.mailWaiting(state(), list); }

  // the number on the mailbox button (unclaimed letters)
  function mailCount() {
    var b = document.querySelector('#quick [data-quick="mail"]'); if (!b) return;
    var n = waiting().length, d = b.querySelector('.qnum');
    if (n && !d) { d = document.createElement('b'); d.className = 'qnum'; b.appendChild(d); }
    if (d) { if (n) d.textContent = n > 99 ? '99+' : n; else d.remove(); }
  }
  function fetchMail() {
    if (typeof fetch !== 'function') return;
    fetch('mail.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
      if (m && Array.isArray(m.letters)) { list = m.letters; mailCount(); if (page && page.classList.contains('on')) render(); }
    }).catch(function () {});
  }

  // amounts as people say them: 500000 → 50만, 12000 → 1만 2000, 8000 → 8,000
  function ko(n) {
    n = Math.floor(+n || 0); if (n < 10000) return n.toLocaleString('ko-KR');
    var man = Math.floor(n / 10000), rest = n % 10000;
    return man.toLocaleString('ko-KR') + '만' + (rest ? ' ' + rest.toLocaleString('ko-KR') : '');
  }
  function rewardPill(l) {
    var a = [];
    if (+l.gems > 0) a.push('<span><img src="art/mail-ico-gem.webp" alt="">다이아 ' + ko(l.gems) + '</span>');
    if (CW.mailGold(l) > 0) a.push('<span><img src="art/mail-ico-gold.webp" alt="">골드 ' + CW.mailGoldText(l) + '</span>');
    // two or more things (diamonds + gold too, js/mail-gift.js items): one line, the first thing's picture and name, then
    // how many more — 「💎 다이아 외 6종」 (2026-11-16, the user: the two lines did not fit the pill); one thing keeps its amount
    var gl = CW.giftLines ? CW.giftLines(l) : [];
    if (a.length + gl.length >= 2 || gl.length) {
      var first = +l.gems > 0 ? '<img src="art/mail-ico-gem.webp" alt="">다이아' : CW.mailGold(l) > 0 ? '<img src="art/mail-ico-gold.webp" alt="">골드'
        : '<i class="mbgi">' + esc(gl[0].icon) + '</i>' + esc(gl[0].name);
      var more = (+l.gems > 0) + (CW.mailGold(l) > 0) + gl.length - 1;
      return '<span class="one">' + first + (more ? ' 외 ' + more + '종' : '') + '</span>';
    }
    return a.join('');
  }
  // any item on a letter (2026-11-16): small chips, each with its picture, in the reward box (it slides when full)
  function manyReward(l) {
    var a = [];
    if (+l.gems > 0) a.push('<span class="mlchip"><img src="art/mail-ico-gem.webp" alt="">다이아 ' + ko(l.gems) + '</span>');
    if (CW.mailGold(l) > 0) a.push('<span class="mlchip"><img src="art/mail-ico-gold.webp" alt="">골드 ' + CW.mailGoldText(l) + '</span>');
    (CW.giftLines ? CW.giftLines(l) : []).forEach(function (x) { a.push('<span class="mlchip"><i>' + esc(x.icon) + '</i>' + esc(x.text) + '</span>'); });
    return a.join('');
  }
  // two rewards on a letter: the pill halved, each with its picture, a line between
  function twoReward(l) {
    return '<span class="half"><img class="gem" src="art/mail-gem-big.webp" alt=""><b>다이아<br>' + ko(l.gems) + '</b></span><i class="mldiv"></i>' +
      '<span class="half"><img class="gold" src="art/mail-ico-gold.webp" alt=""><b>골드<br>' + CW.mailGoldText(l) + '</b></span>';
  }
  // one reward on a letter, as drawn: the big picture on the left, a line, the words on the right
  function oneReward(l) {
    var gem = +l.gems > 0, n = gem ? +l.gems : 0;
    var star = function (c) { return '<svg class="mlstar ' + c + '" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0c.8 5.6 3.4 8.6 10 10-6.6 1.4-9.2 4.4-10 10-.8-5.6-3.4-8.6-10-10 6.6-1.4 9.2-4.4 10-10z"/></svg>'; };
    return '<span class="mlri' + (gem ? '' : ' sp') + '">' + (gem ? '' : star('a') + star('b') + star('c')) + '<img class="' + (gem ? 'gem' : 'gold') + '" src="art/' + (gem ? 'mail-gem-big' : 'mail-ico-gold') + '.webp" alt=""></span><i class="mldiv"></i><span class="mlrt">' + (gem ? '다이아 ' + ko(n) : '골드 ' + CW.mailGoldText(l)) + '</span>';
  }
  function sender(l) { var w = CW.mailWhen(l); return esc(l.sender || '운영팀') + (w ? ' · ' + w : ''); }
  function firstLine(l) { return l.sub || String(l.text || '').split('\n').filter(Boolean)[0] || ''; }

  function listHtml() {
    var s = state(), all = CW.mailAll(s, list), wait = waiting();
    if (!all.length) return emptyHtml();
    var shown = tab === 'all' ? all : wait, k = 0;
    var cards = shown.map(function (l) {
      var got = CW.mailGot(s, l), art = got ? 'done' : 'card' + (1 + (k++ % 3));
      return '<button class="mbcard' + (got ? ' got' : '') + '" data-mbopen="' + esc(l.id) + '"><img class="mbcbg" src="art/mail-' + art + '.webp" alt="" draggable="false">' +
        '<b class="mbct">' + esc(l.title || '편지') + '</b><span class="mbcs">' + esc(firstLine(l)) + '</span><span class="mbcf">' + sender(l) + '</span>' +
        (got ? '' : '<span class="mbcr">' + (CW.mailHasReward(l) ? rewardPill(l) : '<span>읽어 보기</span>') + '</span>') + '</button>';
    }).join('');
    return '<div class="mbw mblist"><img class="mbbg" src="art/mail-list.webp" alt="" draggable="false">' +
      '<button class="mbx" data-mbx aria-label="닫기"></button>' +
      '<b class="mbnew">' + PAW + '새 편지 ' + wait.length + '</b>' +
      '<button class="mbtab l' + (tab === 'all' ? ' on' : '') + '" data-mbtab="all"><span><i class="mbti"></i>전체</span></button>' +
      '<button class="mbtab r' + (tab === 'wait' ? ' on' : '') + '" data-mbtab="wait"><span><i class="mbti"></i>받지 않은 우편</span></button>' +
      '<div class="mbscroll">' + (cards || '<p class="mbnone">새로 받을 우편이 없어요</p>') + '</div>' +
      '<button class="mball' + (wait.some(CW.mailHasReward) ? '' : ' off') + '" data-mball aria-label="보상 모두 받기"></button>' +
      '<b class="mbpid">' + CW.mailPid(s) + '</b><button class="mbcopy" data-mbcopy aria-label="우편번호 복사"></button></div>';
  }
  function emptyHtml() {
    return '<div class="mbw mbempty"><img class="mbbg" src="art/mail-empty.webp" alt="" draggable="false">' +
      '<button class="mbx e" data-mbx aria-label="닫기"></button><b class="mbpid e">' + CW.mailPid(state()) + '</b>' +
      '<button class="mbcopy e" data-mbcopy aria-label="우편번호 복사"></button><button class="mbclose" data-mbx aria-label="닫기"></button></div>';
  }
  function letterHtml(l) {
    var s = state(), got = CW.mailGot(s, l), has = CW.mailHasReward(l), gn = CW.giftLines ? CW.giftLines(l).length : 0, n = (+l.gems > 0) + (CW.mailGold(l) > 0) + gn;
    // paragraphs (a blank line between) and lines, as on the drawn letter
    var body = String(l.text || '').split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
    return '<div class="mbw mbletter"><img class="mbbg" src="art/mail-letter.webp" alt="" draggable="false">' +
      '<button class="mbback" data-mbback aria-label="우편함으로"></button><button class="mbx l" data-mbx aria-label="닫기"></button>' +
      '<b class="mlt">' + esc(l.title || '편지') + '</b><span class="mlf">' + esc(l.sender || '운영팀') + '</span>' +
      (got ? '' : '<b class="mlnew">' + PAW + '새 편지</b>') +
      '<div class="mlbody">' + body + (l.sign ? '<p class="mlsign">' + esc(l.sign) + '</p>' : '') + '</div>' +
      '<b class="mlcnt">' + n + '개</b>' +
      (gn ? '<div class="mlrew many">' + manyReward(l) + '</div>' :
      '<div class="mlrew' + (n > 1 ? ' two' : n ? ' one' : '') + '">' + (n === 1 ? oneReward(l) : n === 2 ? twoReward(l) : has ? rewardPill(l) : '<span class="none">첨부된 보상이 없어요</span>') + '</div>') +
      '<button class="mlget' + (got ? ' done' : '') + '" data-mbget="' + esc(l.id) + '"><span>' + (got ? (has ? '수령 완료' : '읽음') : has ? '보상 받기' : '확인') + '</span></button>' +
      '<button class="mllist" data-mbback aria-label="목록으로 돌아가기"></button></div>';
  }
  function fit() {
    page.querySelectorAll('.mbct,.mbcs,.mbcf,.mlt,.mbcr span,.mbpid,.mlrt').forEach(function (el) {
      el.style.fontSize = ''; var f = parseFloat(getComputedStyle(el).fontSize);
      for (var i = 0; i < 30 && el.scrollWidth > el.clientWidth + 0.5; i++) { f *= 0.95; el.style.fontSize = f + 'px'; }
    });
    // a long letter keeps its size and is read by sliding a finger (no bar, 2026-11-15, the user)
  }
  function render() {
    var l = open && list.filter(function (x) { return x.id === open; })[0];
    if (view === 'letter' && l) page.querySelector('.mbstage').innerHTML = letterHtml(l);
    else { view = 'list'; page.querySelector('.mbstage').innerHTML = listHtml(); }
    fit(); mailCount();
  }
  function claim(l) {
    var g = G(); if (!l || CW.mailGot(state(), l)) return false;
    var why = CW.mailClaimBlock(state(), l); if (why) { g.ui.toast(why + '. 정리하고 다시 받아 주세요.'); return false; }
    if (!g.G.claimMail(l)) return false;
    if (CW.mailHasReward(l)) g.ui.toast('우편 보상 획득 · ' + CW.mailRewardText(l));
    g.ui.hud(); return true;
  }
  function close() { page.classList.remove('on', 'fan', 'rise'); if (G()) G().ui.renderPanel(true); }
  function build() {
    page = document.createElement('div'); page.id = 'mailbox'; page.setAttribute('role', 'dialog'); page.setAttribute('aria-label', '우편함');
    page.innerHTML = '<div class="mbfan" aria-hidden="true"><img class="mbbox" src="art/mail-box.webp" alt=""><img class="mbenv a" src="art/mail-env.webp" alt=""><img class="mbenv b" src="art/mail-env.webp" alt=""><img class="mbenv c" src="art/mail-env.webp" alt=""></div><div class="mbstage"></div>';
    document.body.appendChild(page);
    page.addEventListener('click', function (e) {
      var t = e.target, g = G();
      if (t === page || t.closest('[data-mbx]')) { g.G.sound('click'); close(); return; }
      if (t.closest('.mbfan')) { page.classList.remove('fan'); return; }
      var tb = t.closest('[data-mbtab]'); if (tb) { g.G.sound('click'); tab = tb.dataset.mbtab; render(); return; }
      var op = t.closest('[data-mbopen]'); if (op) { g.G.sound('click'); open = op.dataset.mbopen; view = 'letter'; render(); return; }
      if (t.closest('[data-mbback]')) { g.G.sound('click'); view = 'list'; render(); return; }
      var gt = t.closest('[data-mbget]');
      if (gt) {
        var l = list.filter(function (x) { return x.id === gt.dataset.mbget; })[0];
        if (l && !CW.mailGot(state(), l)) { claim(l); render(); } else { view = 'list'; render(); }
        return;
      }
      if (t.closest('[data-mball]')) {
        var n = 0; waiting().filter(CW.mailHasReward).forEach(function (x) { if (claim(x)) n++; });
        if (n > 1) g.ui.toast('우편 ' + n + '통의 보상을 받았어요.'); render(); return;
      }
      if (t.closest('[data-mbcopy]')) {
        var pid = CW.mailPid(state()), done = function () { g.ui.toast('우편번호를 복사했어요. (' + pid + ')'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pid).then(done, done); else done();
      }
    });
  }
  // tap the mailbox: it pops, the letters fan out, then the window rises (a tap skips the show)
  function openMail() {
    if (!page) build();
    view = 'list'; tab = 'all'; open = null; render();
    page.classList.remove('fan'); void page.offsetWidth;
    page.classList.add('on', 'fan', 'rise');   // the window rises once, when it opens (not at every redraw)
    clearTimeout(page._t); page._t = setTimeout(function () { page.classList.remove('fan'); }, 1100);
    clearTimeout(page._r); page._r = setTimeout(function () { page.classList.remove('rise'); }, 1600);
  }
  CW.mailOpen = openMail; CW.mailCount = mailCount; CW.mailFetch = fetchMail;
  CW.mailIsOpen = function () { return !!(page && page.classList.contains('on')); };
  CW.mailStart = function () {
    fetchMail(); setInterval(fetchMail, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) fetchMail(); });
  };
})(this);
