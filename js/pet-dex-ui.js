// 펫도감 page (2026-11-23, the user's GPT 시안 '라일락 정원', D:\AI-기록\작업\냥법사-펫\펫도감-라일락-정원.png): a full-screen
// page over the game like the monster codex (js/dex-ui.js). Lilac over art/bg-galaxy.webp, one card per group (숲 · 바다 ·
// 불꽃 · 하늘 · 별빛) with its 4 pets 일반 → 전설, the set reward button, and a filter (전체 / 모은 펫 / 못 모은 펫).
// Pet pictures are fetched only when their card comes near the screen; a pet not yet met is its own picture as a lilac
// shadow (CSS mask) with a padlock.
(function (root) {
  var CW = root.CW, DATA = CW.DATA;
  var A = function () { return CW.ART_BASE || 'art/'; };
  var page = null, filter = 'all', io = null, onClose = null;
  var GRADE = ['일반', '희귀', '영웅', '전설'];
  var LOCK = '<svg class="pdlock" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke="#b9761f" stroke-width="2.4" stroke-linecap="round"/><rect x="4.5" y="10" width="15" height="11" rx="2.6" fill="#f1a93a" stroke="#b9761f" stroke-width="1.2"/><circle cx="12" cy="14.6" r="1.6" fill="#8a4f12"/><path d="M12 15.4v2.3" stroke="#8a4f12" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function st() { return CW.petState ? CW.petState() : null; }
  function stars(n, have) {
    if (!have) return '<span class="pdstar off">☆</span>';
    var out = ''; for (var i = 0; i < n; i++) out += '★'; return '<span class="pdstar">' + out + '</span>';
  }
  function card(s, p) {
    var o = s.pets.owned[p.id], fr = o && s.pets.fresh[p.id];
    return '<button class="pdcard g' + p.grade + (o ? ' got' : ' lock') + (fr ? ' fresh' : '') + '" data-pd="' + p.id + '">' +
      '<span class="pdgrade">' + GRADE[p.grade] + '</span>' +
      '<i class="pdpic" data-pic="' + p.art + '-s"></i>' + (o ? '' : LOCK) +
      '<span class="pdname">' + (o ? esc(p.short) : '???') + '</span>' + stars(o ? o.star : 0, !!o) +
      (fr ? '<b class="pdnew">NEW</b>' : '') + '</button>';
  }
  function render() {
    var s = st(); if (!s) return;
    CW.petBox(s);
    var d = CW.petDex(s), pct = Math.floor(d.have / d.total * 100), bonus = Math.round(DATA.petConf.setBonus * 100);
    var groups = d.groups.map(function (g, gi) {
      var list = CW.petsInGroup(g.id).filter(function (p) {
        var got = !!s.pets.owned[p.id];
        return filter === 'all' || (filter === 'got' ? got : !got);
      });
      if (!list.length) return '';
      var tint = DATA.petGroups[gi].tint;
      var btn = g.claimed ? '<span class="pdset done">받음 ✓</span>'
        : '<button class="pdset' + (g.done ? ' ready' : '') + '" data-pdset="' + g.id + '"' + (g.done ? '' : ' aria-disabled="true"') + '>묶음 보상 받기</button>';
      return '<section class="pdgrp" style="--tint:' + tint + '"><div class="pdgh"><div><h4>' + esc(g.name) + ' 묶음 <small>' + g.have + ' / ' + g.total + '</small></h4>' +
        '<p>' + (g.claimed ? '펫의 힘 +' + bonus + '% 받는 중' : '다 모으면 펫의 힘 +' + bonus + '%') + '</p></div>' + btn + '</div>' +
        '<div class="pdgrid">' + list.map(function (p) { return card(s, p); }).join('') + '</div></section>';
    }).join('');
    var all = s.pets.all ? '<p class="pdallmsg done">20마리 모두 모음 · 펫의 힘 +' + Math.round(DATA.petConf.allBonus * 100) + '% 받는 중</p>'
      : d.have === d.total ? '<button class="pdallbtn" data-pdall="1">20마리 모두 모은 보상 받기</button>'
      : '<p class="pdallmsg">20마리를 모두 모으면 펫의 힘 +' + Math.round(DATA.petConf.allBonus * 100) + '% 더</p>';
    page.querySelector('.pdbody').innerHTML =
      '<div class="pdsum"><b>모은 펫 ' + d.have + ' / ' + d.total + '</b><span>' + pct + '%</span><i><em style="width:' + pct + '%"></em></i></div>' +
      '<div class="pdtabs">' + [['all', '전체'], ['got', '모은 펫'], ['miss', '못 모은 펫']].map(function (t) {
        return '<button data-pdf="' + t[0] + '"' + (filter === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>';
      }).join('') + '</div>' +
      (groups || '<p class="pdempty">이 조건에 맞는 펫이 없어요.</p>') + all +
      '<div class="pdfoot" aria-hidden="true"><i></i><span>✧</span><b>˅</b><span>✧</span><i></i></div>';
    watchPics();
  }
  function watchPics() {
    if (io) io.disconnect();
    var s = st();
    var show = function (el) {
      var art = el.dataset.pic, url = 'url(' + A() + art + '.webp)', card = el.closest('.pdcard');
      if (card && card.classList.contains('got')) el.style.backgroundImage = url; else { el.style.webkitMaskImage = url; el.style.maskImage = url; }
      el.removeAttribute('data-pic');
    };
    var els = page.querySelectorAll('[data-pic]');
    if (!('IntersectionObserver' in root)) { els.forEach(show); return; }
    io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); show(x.target); } }); }, { root: page.querySelector('.pdbody'), rootMargin: '300px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  function keepScroll(fn) { var b = page.querySelector('.pdbody'), y = b.scrollTop; fn(); b.scrollTop = y; }
  function build() {
    page = document.createElement('div'); page.id = 'petdex'; page.setAttribute('role', 'dialog'); page.setAttribute('aria-label', '펫도감');
    page.innerHTML = '<div class="pdcol"><div class="pdhead"><button class="pdback" aria-label="돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6"/></svg></button>' +
      '<h3><img src="' + A() + 'ic-petbook.webp" alt="" draggable="false">펫도감</h3></div><div class="pdbody"></div></div>';
    // before #modal in the page: both are z-index 20, so a window that pops up while the codex is open (the last boss,
    // 토벌 완료) is drawn above it, not hidden under it (검토 2026-11-23)
    var modal = document.getElementById('modal');
    if (modal && modal.parentNode === document.body) document.body.insertBefore(page, document.getElementById('modal')); else document.body.appendChild(page);
    page.addEventListener('click', function (e) {
      var t = e.target, s = st();
      if (t.closest('.pdback')) { close(); return; }
      var f = t.closest('[data-pdf]'); if (f) { filter = f.dataset.pdf; render(); page.querySelector('.pdbody').scrollTop = 0; return; }
      var b = t.closest('[data-pdset]');
      if (b) {
        if (s && CW.petClaimSet(s, b.dataset.pdset)) { if (CW.petChanged) CW.petChanged(); keepScroll(render); }
        else if (CW.toast) CW.toast('묶음의 펫 4마리를 모두 모으면 받을 수 있어요');
        return;
      }
      if (t.closest('[data-pdall]')) { if (s && CW.petClaimAll(s)) { if (CW.petChanged) CW.petChanged(); keepScroll(render); } return; }
      var c = t.closest('[data-pd]');
      if (c && s && c.classList.contains('fresh')) {
        CW.petSeen(s, c.dataset.pd); c.classList.remove('fresh'); var n = c.querySelector('.pdnew'); if (n) n.remove();
        if (CW.petChanged) CW.petChanged(true);
      }
    });
  }
  function open(done) {
    if (!page) build();
    onClose = done || null; filter = 'all';
    page.classList.add('on'); render(); page.querySelector('.pdbody').scrollTop = 0;
  }
  function close() {
    if (!page) return; page.classList.remove('on');
    if (io) io.disconnect(); page.querySelector('.pdbody').innerHTML = '';
    if (onClose) onClose();
  }
  CW.petDexOpen = open; CW.petDexClose = close;
  CW.petDexIsOpen = function () { return !!(page && page.classList.contains('on')); };
})(this);
