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
  // 운영자가 보낸 편지가 바로 들어오게 (2026-11-18, the user: 더 빨리): on the real site read the repository file itself
  // (no wait for the site to rebuild, ?t= skips the 5-minute cache); anywhere else, or if that fails, the site's own file
  function getJson(file) {
    var rel = file + '?t=' + Date.now(), host = (root.location && root.location.hostname) || '';
    var go = function (u) { return fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }); };
    if (!/github\.io$/.test(host)) return go(rel).catch(function () { return null; });
    // raw.githubusercontent.com/…/main/ 은 ?t= 를 붙여도 5분 동안 같은 파일을 줌(2026-11-18 확인) → 최신 커밋 번호를 물어
    // 그 번호의 파일을 받음(번호가 바뀌면 새 주소라 바로 최신). 번호는 1분에 한 번만 물어 우편함·공지가 같이 씀.
    // 못 물으면(횟수 제한 등) 사이트 파일(약 1분 늦음).
    var C = root.CW || (root.CW = {}), now = Date.now();
    if (!C.repoShaP || now - C.repoShaT > 55000) {
      C.repoShaT = now;
      C.repoShaP = fetch('https://api.github.com/repos/kchumm1/cat-wizard-play/commits/main?t=' + now, { cache: 'no-store', headers: { Accept: 'application/vnd.github.sha' } })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) { t = (t || '').trim(); return /^[0-9a-f]{40}$/.test(t) ? t : null; })
        .catch(function () { return null; });
    }
    return C.repoShaP
      .then(function (sha) { return sha ? go('https://raw.githubusercontent.com/kchumm1/cat-wizard-play/' + sha + '/' + file) : null; })
      .catch(function () { return null; })
      .then(function (d) { return d || go(rel); })
      .catch(function () { return null; });
  }
  function fetchMail() {
    if (typeof fetch !== 'function') return;
    getJson('mail.json').then(function (m) {
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
        : mark(gl[0], 'mbgi') + esc(gl[0].name);
      var more = (+l.gems > 0) + (CW.mailGold(l) > 0) + gl.length - 1;
      return '<span class="one">' + first + (more ? ' 외 ' + more + '종' : '') + '</span>';
    }
    return a.join('');
  }
  // the game's own picture for a gift line (the same marks as the packages, js/notice-pages.js giveIco), else its emoji
  function mark(x, cls) {
    var m = x.mark || {}, I = CW.ICO || {}, h = '';
    if (CW.giveIco && ['mana', 'runeStone', 'sigilStone', 'rune', 'sigil'].indexOf(m.k) >= 0) h = CW.giveIco(m.k, m.grade);
    else if (m.k === 'potion' && I.misc) h = I.misc('potion', m.id);
    else if (m.k === 'ticket' && I.misc) h = I.misc('dungeon', m.id);
    else if (m.k === 'relic' && I.misc) h = I.misc('relic', m.id);
    else if (m.k === 'gear' && CW.GEAR_IMG && CW.GEAR_IMG[m.id]) h = '<img src="' + CW.GEAR_IMG[m.id] + '" alt="" draggable="false">';
    // 펫 선물 (2026-11-23): the pet's small picture, the egg, the snack bowl (the same pictures as the 내 펫 page)
    else if (m.k === 'pet' && CW.petById && CW.petById(m.id)) h = '<img src="' + (CW.ART_BASE || 'art/') + CW.petById(m.id).art + '-s.webp" alt="" draggable="false">';
    else if (m.k === 'petEggs') h = '<img src="' + (CW.ART_BASE || 'art/') + 'pet-egg.webp" alt="" draggable="false">';
    else if (m.k === 'petFood') h = '<img src="' + (CW.ART_BASE || 'art/') + 'pet-food.webp" alt="" draggable="false">';
    return h ? '<i class="mlmk' + (cls ? ' ' + cls : '') + '">' + h + '</i>' : '<i' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(x.icon) + '</i>';
  }
  // any item on a letter (2026-11-16): small chips, each with its picture, in the reward box (it slides when full)
  function manyReward(l) {
    var a = [];
    if (+l.gems > 0) a.push('<span class="mlchip"><img src="art/mail-ico-gem.webp" alt="">다이아 ' + ko(l.gems) + '</span>');
    if (CW.mailGold(l) > 0) a.push('<span class="mlchip"><img src="art/mail-ico-gold.webp" alt="">골드 ' + CW.mailGoldText(l) + '</span>');
    (CW.giftLines ? CW.giftLines(l) : []).forEach(function (x) { a.push('<span class="mlchip">' + mark(x, '') + esc(x.text) + '</span>'); });
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
      '<div class="mbscroll">' + (cards || '<p class="mbnone">새로 받을 우편이 없어요</p>') + delAllHtml(all) + '</div>' +
      '<button class="mball' + (wait.some(CW.mailHasReward) ? '' : ' off') + '" data-mball aria-label="보상 모두 받기"></button>' +
      '<b class="mbpid">' + CW.mailPid(s) + '</b><button class="mbcopy" data-mbcopy aria-label="우편번호 복사"></button></div>';
  }
  // 받은 우편 지우기 (2026-11-23): the letters nothing is left to take on; a first tap asks, a second one deletes
  var delAsk = 0;
  function delAllHtml(all) {
    var n = all.filter(function (l) { return CW.mailCanDel(state(), l); }).length; if (!n) return '';
    var ask = Date.now() - delAsk < 3000;
    return '<button class="mbdelall' + (ask ? ' ask' : '') + '" data-mbdelall>' + (ask ? '한 번 더 누르면 ' + n + '통 지워요' : '받은 우편 지우기 (' + n + '통)') + '</button>';
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
      '<button class="mllist" data-mbback aria-label="목록으로 돌아가기"></button>' +
      (CW.mailCanDel(s, l) ? '<button class="mldel" data-mbdel="' + esc(l.id) + '">지우기</button>' : '') + '</div>';
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
    // 가방 (2026-11-17): 보상은 가방에 상자로 들어가고, 룬·신성력 자리는 가방에서 열 때 봄
    var ok = false;
    return g.G.later(g.G.claimMail(l), function (got) {
      if (!got) { if (CW.chestFull && CW.chestFull(state())) g.ui.toast('가방이 가득 찼어요. 가방에서 열고 다시 받아 주세요.'); return; }
      ok = true;
      if (CW.mailHasReward(l)) g.ui.toast('가방에 넣었어요 · 가방에서 열어 받아요');
      if (CW.chestBadge) CW.chestBadge();
      g.ui.hud();
    }).then(function () { return ok; });
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
        if (l && !CW.mailGot(state(), l)) { Promise.resolve(claim(l)).then(render); } else { view = 'list'; render(); }
        return;
      }
      var dl = t.closest('[data-mbdel]');
      if (dl) {
        var dlet = list.filter(function (x) { return x.id === dl.dataset.mbdel; })[0];
        g.G.sound('click');
        if (dlet && g.G.delMail(dlet)) g.ui.toast('편지를 지웠어요');
        view = 'list'; render(); return;
      }
      if (t.closest('[data-mbdelall]')) {
        g.G.sound('click');
        if (Date.now() - delAsk >= 3000) { delAsk = Date.now(); render(); clearTimeout(page._d); page._d = setTimeout(function () { if (page.classList.contains('on') && view === 'list') render(); }, 3100); return; }
        delAsk = 0; var nd = g.G.delMailAll(list);
        if (nd) g.ui.toast('편지 ' + nd + '통을 지웠어요');
        render(); return;
      }
      if (t.closest('[data-mball]')) {
        var n = 0, chain = Promise.resolve();
        waiting().filter(CW.mailHasReward).forEach(function (x) { chain = chain.then(function () { return Promise.resolve(claim(x)).then(function (ok) { if (ok) n++; }); }); });
        chain.then(function () { if (n > 1) g.ui.toast('우편 ' + n + '통의 보상을 가방에 넣었어요.'); render(); }); return;
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
    view = 'list'; tab = 'all'; open = null; render(); fetchMail();   // opening the mailbox looks for new letters right away
    page.classList.remove('fan'); void page.offsetWidth;
    page.classList.add('on', 'fan', 'rise');   // the window rises once, when it opens (not at every redraw)
    clearTimeout(page._t); page._t = setTimeout(function () { page.classList.remove('fan'); }, 1100);
    clearTimeout(page._r); page._r = setTimeout(function () { page.classList.remove('rise'); }, 1600);
  }
  CW.mailOpen = openMail; CW.mailCount = mailCount; CW.mailFetch = fetchMail;
  CW.mailIsOpen = function () { return !!(page && page.classList.contains('on')); };
  CW.mailStart = function () {
    fetchMail(); setInterval(function () { if (!document.hidden) fetchMail(); }, 60 * 1000);   // every minute while the game is on screen
    document.addEventListener('visibilitychange', function () { if (!document.hidden) fetchMail(); });
  };
})(this);
