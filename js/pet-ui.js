// 내 펫 page (2026-11-23, the user's GPT 시안 D:\AI-기록\작업\냥법사-펫\내-펫.png): a full-screen page over the game.
// The chosen pet on a stage (big picture, name, grade, stars, Lv), its 장착/보유 효과 on 펫의 힘, its skill (battle skills
// come with the next part), 레벨업 (펫 간식, hold to repeat) · 별 올리기 (조각) · 데리고 다니기, the egg row (부화 · 모두 부화 ·
// 확률 보기), every pet in a 4-column list, and the 내 펫 / 펫도감 tabs at the bottom. Rules: js/pets.js.
(function (root) {
  var CW = root.CW, DATA = CW.DATA, C = DATA.petConf;
  var A = function () { return CW.ART_BASE || 'art/'; };
  var page = null, sel = null, onClose = null, holdT = 0, holdI = 0, busy = false, holding = false, holdXY = null;
  var GRADE = ['일반', '희귀', '영웅', '전설'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function st() { return CW.petState ? CW.petState() : null; }
  function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function fmt(n) { return CW.fmt ? CW.fmt(n) : String(Math.floor(n)); }
  function starRow(n) { var o = ''; for (var i = 1; i <= C.maxStar; i++) o += i <= n ? '<i class="on">★</i>' : '<i>☆</i>'; return o; }
  // the pets in the list: worn first, then by grade (전설 first), then level
  function myPets(s) {
    var b = s.pets, ids = Object.keys(b.owned).filter(function (id) { return CW.petById(id); });
    return ids.sort(function (x, y) {
      if (x === b.worn) return -1; if (y === b.worn) return 1;
      var px = CW.petById(x), py = CW.petById(y);
      return py.grade - px.grade || (b.owned[y].lv || 1) - (b.owned[x].lv || 1) || DATA.pets.indexOf(px) - DATA.pets.indexOf(py);
    });
  }
  function stage(s) {
    if (!sel || !s.pets.owned[sel]) {
      return '<div class="ppstage empty"><img class="ppbig egg" src="' + A() + 'pet-egg.webp" alt="" draggable="false">' +
        '<b class="ppname">알을 부화해 첫 펫을 만나요</b><span class="pplv">사냥하다 보면 알이 나와요 · 보스는 가끔, 지역 마지막 보스는 꼭</span></div>';
    }
    var p = CW.petById(sel), o = s.pets.owned[sel];
    return '<div class="ppstage g' + p.grade + '"><img class="ppbig" src="' + A() + p.art + '.webp" alt="" draggable="false">' +
      '<div class="ppnm"><b class="ppname">' + esc(p.name) + '</b><span class="ppgr g' + p.grade + '">' + GRADE[p.grade] + '</span></div>' +
      '<div class="ppstars">' + starRow(o.star || 1) + '</div><span class="pplv">Lv.' + (o.lv || 1) + ' / ' + CW.petLvCap(o) + '</span></div>';
  }
  function render() {
    var s = st(); if (!s || !page) return;
    CW.petBox(s);
    var b = s.pets, list = myPets(s);
    if (!sel || !b.owned[sel]) sel = b.worn || list[0] || null;
    var o = sel && b.owned[sel], p = sel && CW.petById(sel);
    var eq = o ? '×' + f2(1 + CW.petEquipBonus(sel, o)) : '-', ow = o ? '×' + f2(1 + CW.petOwnedBonus(sel, o)) : '-';
    var cap = o ? CW.petLvCap(o) : 0, cost = o ? CW.petLvCost(sel, o.lv || 1) : 0, lvMax = o && (o.lv || 1) >= cap;
    var starMax = o && (o.star || 1) >= C.maxStar, need = o ? CW.petStarCost(o) : 0;
    var lvBtn = '<button class="ppbtn lvup" data-pp="lv"' + (!o || lvMax || b.food < cost ? ' aria-disabled="true"' : '') + '><b>레벨업</b>' +
      (lvMax ? '<span>최대 레벨</span>' : '<span><img src="' + A() + 'pet-food.webp" alt="" draggable="false">' + fmt(cost) + '</span>') + '</button>';
    var stBtn = '<button class="ppbtn star" data-pp="star"' + (!o || starMax || (o.frag || 0) < need ? ' aria-disabled="true"' : '') + '><b>별 올리기</b>' +
      '<span>' + (starMax ? '최대 별' : '조각 ' + ((o && o.frag) || 0) + '/' + need) + '</span></button>';
    var wearBtn = '<button class="ppbtn wear" data-pp="wear"' + (!o || b.worn === sel ? ' aria-disabled="true"' : '') + '><b>' + (o && b.worn === sel ? '함께하는 중' : '데리고 다니기') + '</b></button>';
    var grid = list.map(function (id) {
      var q = CW.petById(id), w = b.owned[id];
      return '<button class="ppcard g' + q.grade + (id === sel ? ' on' : '') + '" data-ppsel="' + id + '">' + (id === b.worn ? '<em class="pptag">함께</em>' : '') +
        (b.fresh[id] ? '<em class="ppnew">NEW</em>' : '') + '<img src="' + A() + q.art + '-s.webp" alt="" loading="lazy" draggable="false">' +
        '<b>' + esc(q.short) + '</b><span class="pplvs">Lv.' + (w.lv || 1) + '</span><span class="ppst">' + new Array((w.star || 1) + 1).join('★') + '</span></button>';
    }).join('');
    page.querySelector('.ppbody').innerHTML = stage(s) +
      '<div class="ppeff"><div><b>장착 효과</b><span>펫의 힘 ' + eq + '</span></div><div><b>보유 효과</b><span>펫의 힘 ' + ow + '</span></div></div>' +
      skillRow(s) +
      '<div class="ppbtns">' + lvBtn + stBtn + wearBtn + '</div>' +
      '<div class="ppegg"><img src="' + A() + 'pet-egg.webp" alt="" draggable="false"><b>알 ' + fmt(b.eggs) + '개</b>' +
        '<button class="pppill" data-pp="hatch"' + (b.eggs < 1 ? ' aria-disabled="true"' : '') + '>부화</button>' +
        '<button class="pppill" data-pp="hatchall"' + (b.eggs < 2 ? ' aria-disabled="true"' : '') + '>모두 부화</button>' +
        '<button class="pplink" data-pp="odds">확률 보기</button></div>' +
      '<div class="pplisth"><h4>내 펫</h4><span><img src="' + A() + 'pet-food.webp" alt="" draggable="false">펫 간식 ' + fmt(b.food) + '</span></div>' +
      (list.length ? '<div class="ppgrid">' + grid + '</div>' : '<p class="ppnone">아직 펫이 없어요. 알을 부화해 보세요.</p>');
  }
  // 펫 기술 줄 (2026-11-23): 이름 · 몇 초마다 · 하는 일과 세기 (js/pets.js petSkillLine); 데리고 다니는 펫이 전투에서 씀
  function skillRow(s) {
    var k = sel && CW.petSkillLine ? CW.petSkillLine(s, sel) : null;
    // 피해 숫자: 지금 냥법사가 보스에게 1초에 주는 피해 × 몇 초치 — 전투에서 뜨는 숫자와 같은 단위 (형 고름 2026-11-23)
    var dps = k && k.hit && CW.heroBossDps ? CW.heroBossDps() : 0;
    var hit = dps > 0 ? '<span class="p3">' + k.hit.label + ' 피해 ' + CW.fmt(dps * k.hit.secs) + '</span>' : '';
    if (!k) return '<div class="ppskill"><i aria-hidden="true">✦</i><div class="pskn"><b>펫 기술</b></div><span>펫을 고르면 기술이 보여요</span></div>';
    return '<div class="ppskill"><img class="psico" src="' + A() + k.icon + '.webp" alt="" draggable="false"><div class="pskn"><b>' + esc(k.name) + '</b><em>' + k.every + '</em></div><span class="psw"><span class="p1">' + esc(k.what) + '</span>' + (k.note ? '<span class="p2">' + esc(k.note) + '</span>' : '') + hit + '</span></div>';
  }
  function changed() { if (CW.petChanged) CW.petChanged(); }
  function act(what) {
    var s = st(); if (!s || busy) return false;
    if (what === 'lv') { if (CW.petLevelUp(s, sel)) { if (CW.goalCount) CW.goalCount(s, 'petLv', 1); if (!holding) changed(); render(); return true; } return false; }
    if (what === 'star') {
      if (CW.petStarUp(s, sel)) { changed(); render(); return true; }
      var o = s.pets.owned[sel];
      if (CW.toast) CW.toast(o && (o.star || 1) >= C.maxStar ? '이미 최대 별이에요' : '같은 펫이 또 나오면 조각이 생겨요');
      return false;
    }
    if (what === 'wear') { if (CW.petWear(s, sel)) { changed(); render(); return true; } return false; }
    if (what === 'hatch') return hatch(false);
    if (what === 'hatchall') return hatch(true);
    if (what === 'odds') { odds(); return true; }
    return false;
  }
  // ---- hatching (B5 시안 not here yet: a simple version — egg shakes, the top flies off, the pet pops out in light) ----
  function hatch(all) {
    var s = st(); if (!s || s.pets.eggs < 1) return false;
    var res = all ? CW.petHatchAll(s, Math.random, Date.now()) : [CW.petHatch(s, Math.random, Date.now())];
    if (CW.goalCount) CW.goalCount(s, 'hatch', res.filter(Boolean).length);   // 오늘의 할 일 (js/goals.js)
    res = res.filter(Boolean); if (!res.length) return false;
    changed(); busy = true;
    var top = res.reduce(function (m, r) { return r.grade > m ? r.grade : m; }, 0);
    var box = page.querySelector('.pphatch');
    box.className = 'pphatch on g' + top + (all && res.length > 1 ? ' many' : '');
    box.innerHTML = '<div class="phfx"><i class="phglow"></i><img class="phbot" src="' + A() + 'pet-egg-bottom.webp" alt="" draggable="false">' +
      '<img class="phtop" src="' + A() + 'pet-egg-top.webp" alt="" draggable="false"><img class="phegg" src="' + A() + 'pet-egg.webp" alt="" draggable="false"></div>';
    setTimeout(function () { box.classList.add('crack'); }, 750);
    setTimeout(function () { box.classList.add('show'); box.insertAdjacentHTML('beforeend', resultHtml(res, all)); busy = false; render(); }, 1150);
    return true;
  }
  function resultHtml(res, all) {
    var s = st();
    if (!all || res.length === 1) {
      var r = res[0], p = CW.petById(r.id);
      var msg = r.kind === 'new' ? (p.grade === 3 ? '전설의 펫이 깨어났어요!' : '새 펫을 만났어요!') : r.kind === 'food' ? '이미 최대 별 · 펫 간식 +' + C.fragFood : '이미 있는 펫 · 조각 +1';
      return '<div class="phres one"><img class="phpet" src="' + A() + p.art + '.webp" alt="" draggable="false"><h3>' + msg + '</h3>' +
        '<div class="phnm"><span class="ppgr g' + p.grade + '">' + GRADE[p.grade] + '</span><b>' + esc(p.name) + '</b>' + (r.kind === 'new' ? '<em>NEW</em>' : '') + '</div>' +
        (r.kind === 'new' ? '<p>펫도감에 등록됐어요 · 펫 간식 +' + C.dexFood + '</p>' : '') +
        '<div class="phbtns"><button data-ph="ok">확인</button>' + (r.kind === 'new' ? '<button class="pri" data-ph="wear" data-id="' + r.id + '">데리고 다니기</button>' : '') + '</div></div>';
    }
    var n = function (k) { return res.filter(function (r) { return r.kind === k; }).length; }, food = n('food');
    return '<div class="phres many"><h3>알 ' + res.length + '개를 부화했어요</h3><p>새 펫 ' + n('new') + '마리 · 조각 ' + n('dup') + '개' + (food ? ' · 펫 간식 +' + food * C.fragFood : '') + '</p><div class="phgrid">' +
      res.map(function (r) { var p = CW.petById(r.id); return '<span class="g' + p.grade + '"><img src="' + A() + p.art + '-s.webp" alt="" loading="lazy" draggable="false">' + (r.kind === 'new' ? '<em>NEW</em>' : r.kind === 'food' ? '<small>간식</small>' : '<small>조각</small>') + '</span>'; }).join('') +
      '</div><div class="phbtns"><button class="pri" data-ph="ok">확인</button></div></div>';
  }
  function odds() {
    var s = st(), w = CW.petGradeWeights(s), sum = w.reduce(function (a, x) { return a + x; }, 0);
    var box = page.querySelector('.pphatch');
    box.className = 'pphatch on odds';
    box.innerHTML = '<div class="phres oddsbox"><h3>알 부화 확률</h3><p>전직 차수가 오를수록 좋은 펫이 잘 나와요 · 지금 ' + (s.tier || 1) + '차</p><table>' +
      w.map(function (x, g) {
        var list = DATA.pets.filter(function (p) { return p.grade === g; }), each = x / sum * 100 / list.length;
        return '<tr class="g' + g + '"><th>' + GRADE[g] + '</th><td>' + (x / sum * 100).toFixed(1) + '%</td><td>' + list.map(function (p) { return esc(p.short); }).join(' · ') + '<small>각 ' + each.toFixed(2) + '%</small></td></tr>';
      }).join('') + '</table><div class="phbtns"><button class="pri" data-ph="ok">확인</button></div></div>';
  }
  function stopHold() {
    clearTimeout(holdT); clearInterval(holdI); holdT = holdI = 0; holdXY = null;
    if (holding) { holding = false; changed(); }   // the levels gained while held: stats (전투력) and save once
  }
  function build() {
    page = document.createElement('div'); page.id = 'petpage'; page.setAttribute('role', 'dialog'); page.setAttribute('aria-label', '펫');
    page.innerHTML = '<div class="ppcol"><div class="pphead"><h3>펫</h3><button class="ppclose" aria-label="닫기">닫기</button></div>' +
      '<div class="ppbody"></div><div class="pptabs"><button class="on">내 펫</button><button data-pptab="dex">펫도감</button></div>' +
      '<div class="pphatch"></div></div>';
    document.body.appendChild(page);
    page.addEventListener('click', function (e) {
      var t = e.target, s = st();
      if (t.closest('.ppclose')) { close(); return; }
      if (t.closest('[data-pptab="dex"]')) { if (CW.petDexOpen) CW.petDexOpen(function () { render(); }); return; }
      var ph = t.closest('[data-ph]');
      if (ph) {
        if (ph.dataset.ph === 'wear' && s && CW.petWear(s, ph.dataset.id)) { sel = ph.dataset.id; changed(); }
        var box = page.querySelector('.pphatch'); box.className = 'pphatch'; box.innerHTML = ''; render(); return;
      }
      var c = t.closest('[data-ppsel]');
      if (c) { sel = c.dataset.ppsel; if (s && s.pets.fresh[sel]) { CW.petSeen(s, sel); if (CW.petChanged) CW.petChanged(true); } render(); page.querySelector('.ppbody').scrollTop = 0; return; }
      var b = t.closest('[data-pp]');
      if (b && b.dataset.pp !== 'lv') act(b.dataset.pp);   // 레벨업 runs on pointerdown (hold to repeat)
    });
    // 레벨업: once on press, then again every 90ms after 380ms while held (like the other level-up buttons). Each level
    // redraws the page, so the pressed button is gone: an iPhone then sends the lift to that removed button and it never
    // reaches the page (ui.js has the same note) — so the lift is caught on the window in the capture phase, and a move of
    // more than 10px (a scroll, not a press) stops it too. While held only the page is redrawn; stats and save once at the end.
    page.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('[data-pp="lv"]'); if (!b) return;
      stopHold(); holdXY = [e.clientX, e.clientY];
      var s = st();
      if (!act('lv')) { if (s && sel && s.pets.owned[sel] && s.pets.food < CW.petLvCost(sel, s.pets.owned[sel].lv) && CW.toast) CW.toast('펫 간식이 모자라요 · 사냥하면 모여요'); return; }
      holding = true;
      holdT = setTimeout(function () { holdI = setInterval(function () { if (!act('lv')) stopHold(); }, 90); }, 380);
    });
    ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(function (ev) { root.addEventListener(ev, stopHold, true); });
    root.addEventListener('pointermove', function (e) {
      if (holding && holdXY && Math.abs(e.clientX - holdXY[0]) + Math.abs(e.clientY - holdXY[1]) > 10) stopHold();
    }, true);
  }
  // while the page is open it follows the game (검토 2026-11-23): a new egg (hunting, a boss) redraws the page; snacks only
  // change the snack count and the 레벨업 button; a replaced save (server, login) redraws from the start. Not during a
  // hatch or while 레벨업 is held (those redraw themselves).
  var followI = 0, lastRef = null, lastEggs = -1, lastFood = -1;
  function follow() {
    var s = st(); if (!s || !page || busy || holding) return;
    var b = CW.petBox(s);
    if (s !== lastRef || b.eggs !== lastEggs) { lastRef = s; lastEggs = b.eggs; lastFood = b.food; render(); return; }
    if (b.food === lastFood) return; lastFood = b.food;
    var fs = page.querySelector('.pplisth span'); if (fs) fs.lastChild.textContent = '펫 간식 ' + fmt(b.food);
    var lv = page.querySelector('[data-pp="lv"]'), o = sel && b.owned[sel];
    if (lv && o) { var ok = (o.lv || 1) < CW.petLvCap(o) && b.food >= CW.petLvCost(sel, o.lv || 1); if (ok) lv.removeAttribute('aria-disabled'); else lv.setAttribute('aria-disabled', 'true'); }
  }
  function open(done) {
    if (!page) build();
    onClose = done || null; sel = null; busy = false;
    page.querySelector('.pphatch').className = 'pphatch';
    page.classList.add('on'); render(); page.querySelector('.ppbody').scrollTop = 0;
    var s = st(); lastRef = s; lastEggs = s ? CW.petBox(s).eggs : -1; lastFood = s ? s.pets.food : -1;
    clearInterval(followI); followI = setInterval(follow, 500);
  }
  function close() {
    if (!page) return; stopHold(); clearInterval(followI); followI = 0; page.classList.remove('on');
    if (onClose) onClose();
  }
  CW.petPageOpen = open; CW.petPageClose = close;
  CW.petPageIsOpen = function () { return !!(page && page.classList.contains('on')); };
  CW.petPageRender = function () { if (page && page.classList.contains('on')) render(); };
})(this);
