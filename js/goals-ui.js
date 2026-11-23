// 미션 창 (2026-11-23, 형 GPT 시안 「미션」 두 장 → 애니메이션·퀘스트 형식으로, 업적은 세 번째 탭). 그림은 GPT 조각
// (art-src/ai-review/2026-11-23-missions → art/ms-*.webp). 규칙은 js/goals.js, 지금 상태는 js/main.js (CW.goalCtx).
//   일일 미션: 보라, 달 그네가 흔들림 · 4줄 + 오늘의 상자(매일 0시)
//   주간 미션: 빨강, 꽃 속 고양이가 숨 쉼 · 4줄 + 이번 주 상자(매주 월요일 0시)
//   업적: 트로피 · 업적 배율 요약 + 10종 단계
// 움직임: 열 때·탭 바꿀 때 줄이 차례로 올라옴, 막대가 차오름, 다 한 줄의 받기가 통통, 받으면 보상 그림이 위로 날아감,
// 상자는 받을 수 있으면 흔들리고 열면 열린 상자 + 별이 터짐. 움직임 줄이기 설정이면 다 멈춤 (index.html).
// CW.goalsOpen(onClose) / CW.goalsClose() / CW.goalsIsOpen()
(function (root) {
  var CW = root.CW = root.CW || {};
  var page = null, tab = 'day', onClose = null, pollT = 0, lastKey = '', enterNext = false;
  function st() { return CW.petState ? CW.petState() : null; }
  function A() { return CW.ART_BASE || 'art/'; }
  function img(n, cls) { return '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + A() + n + '.webp" alt="" draggable="false">'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return CW.fmt ? CW.fmt(n) : String(Math.floor(n)); }
  function num(n) { return Math.floor(n).toLocaleString('ko-KR'); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }   // G.dayKey
  function ctx() { return CW.goalCtx ? CW.goalCtx() : { friend: !!CW.FRIEND }; }
  function pct(v) { return Math.round(v * 1000) / 10 + '%'; }
  var RW_NAME = { gold: '골드', food: '펫 간식', mana: '마력석', runeStone: '룬석' };
  function bar(have, need) { var p = need > 0 ? Math.max(0, Math.min(1, have / need)) : 0; return '<span class="gpbar"><i style="--p:' + (p * 100).toFixed(1) + '%"></i></span>'; }
  // the picture on top: the swing sways from its ropes, the cat in the flower breathes; stars twinkle round it
  function hero(kind) {
    var stars = [[8, 18, 0], [86, 14, .7], [14, 64, 1.3], [88, 58, .4], [50, 4, 1.8], [72, 82, 1.1]].map(function (p, i) {
      return '<i class="gpstar" style="left:' + p[0] + '%;top:' + p[1] + '%;--d:' + p[2] + 's;--s:' + (i % 3 ? .8 : 1.15) + '">' + img('ms-star') + '</i>';
    }).join('');
    var flies = kind === 'week' ? [[20, 30, 0], [78, 26, 1.6], [30, 76, .8], [66, 70, 2.3]].map(function (p) { return '<i class="gpfly" style="left:' + p[0] + '%;top:' + p[1] + '%;--d:' + p[2] + 's">' + img('ms-firefly') + '</i>'; }).join('') : '';
    var art = kind === 'day' ? img('ms-daily', 'gpart swing') : kind === 'week' ? img('ms-weekly', 'gpart breath') : img('ms-ach-trophy', 'gpart trophy');
    return '<div class="gphero ' + kind + '">' + stars + flies + art + '</div>';
  }
  function rowHtml(x, i, weekly, s) {
    var have = CW.goalHave(s, x), ok = have >= x.need, pre = weekly ? 'w' : 't';
    return '<div class="gprow' + (x.got ? ' got' : ok ? ' done' : '') + '" style="--i:' + i + '">' +
      '<span class="gpic">' + img('ms-ic-' + x.key) + '</span>' +
      '<div class="gptxt"><b>' + esc(CW.goalText(x)) + '</b><div class="gpprog">' + bar(have, x.need) + '<small>' + num(have) + '/' + num(x.need) + '</small></div></div>' +
      '<i class="gpdiv"></i>' +
      // 보상 칸 안에 받기 (주간 시안처럼 아이콘·이름 아래): 줄마다 제목·막대 폭이 같고, 받기가 붙어도 제목이 두 줄로 안 밀림
      '<div class="gprw' + (ok && !x.got ? ' has' : '') + '"><span class="gprwl"><span class="gprwic">' + img('ms-rw-' + x.rw) + '</span><em>' + RW_NAME[x.rw] + '</em></span>' +
      (x.got ? '<span class="gpdone">받음</span>' : ok ? '<button class="gpget" data-gp="' + pre + i + '">받기</button>' : '') + '</div></div>';
  }
  function boxHtml(weekly, ready, done, have, total) {
    var name = weekly ? '이번 주 상자' : '오늘의 상자', reset = weekly ? '매주 월요일 0시 초기화' : '매일 0시 초기화', b = weekly ? 'ms-box-w' : 'ms-box-d';
    return '<div class="gpbox' + (done ? ' got' : ready ? ' ready' : '') + '" style="--i:5"' + (ready ? ' data-gp="' + (weekly ? 'wbox' : 'box') + '" role="button" aria-label="' + name + ' 열기"' : '') + '>' +
      '<span class="gpboxic">' + img(done ? b + '-open' : b) + '</span><i class="gpdiv"></i>' +
      '<div class="gpboxt"><b>' + name + '</b><small>' + (done ? '열었어요 · 다음 상자는 ' + reset.replace(' 초기화', '') : ready ? '눌러서 열기!' : reset + ' · ' + have + '/' + total) + '</small></div></div>';
  }
  function dayHtml(s) {
    var c = ctx(), g = CW.goalsToday(s, today(), c), have = g.list.filter(function (x) { return x.got; }).length, h = hero('day');
    if (g.owed.length) h += '<div class="gprow owed" style="--i:0"><span class="gpic">' + img('ms-box-d') + '</span><div class="gptxt"><b>어제 못 받은 보상</b><small>' + g.owed.length + '개 · 다 해 놓고 못 받은 것</small></div><button class="gpget" data-gp="owed">받기</button></div>';
    h += g.list.map(function (x, i) { return rowHtml(x, i, false, s); }).join('');
    return h + boxHtml(false, CW.goalBoxReady(s), g.box, have, g.list.length);
  }
  function weekHtml(s) {
    var w = CW.goalsWeek(s, CW.weekKey(), ctx()), have = w.list.filter(function (x) { return x.got; }).length;
    return hero('week') + w.list.map(function (x, i) { return rowHtml(x, i, true, s); }).join('') + boxHtml(true, CW.weekBoxReady(s), w.box, have, w.list.length);
  }
  // 업적 아이콘 (GPT 2판): 사냥꾼·보스·던전·강화는 미션 아이콘, 나머지는 업적 그림
  var ACH_IC = { hunter: 'ms-ic-kills', boss: 'ms-ic-bossTry', dungeon: 'ms-ic-dungeon', upgrades: 'ms-ic-upgrades', growth: 'ms-ach-growth', tier: 'ms-ach-tier', collector: 'ms-ach-collector', petfriend: 'ms-ach-petfriend', petstar: 'ms-ach-petstar', diligent: 'ms-ach-diligent' };
  function achRw(r) {
    var a = [];
    if (r.mul) a.push('업적 배율 +' + pct(r.mul)); if (r.gold) a.push('골드 +' + pct(r.gold)); if (r.boss) a.push('보스 피해 +' + pct(r.boss));
    if (r.egg) a.push('펫 알 ' + r.egg + '개'); if (r.mana) a.push('마력석 ' + fmt(r.mana));
    return a.join(' · ');
  }
  function achHtml(s) {
    var friend = !!CW.FRIEND, b = CW.achBonus(s), ready = CW.achReady(s, friend);
    var h = hero('ach') + '<div class="gpsum" style="--i:0"><b>업적 배율 ×' + (Math.round(b.mul * 100) / 100) + '</b><small>골드 ×' + (Math.round(b.gold * 100) / 100) + ' · 보스 피해 ×' + (Math.round(b.boss * 100) / 100) + ' · 받을 업적 ' + ready.length + '개</small></div>';
    return h + CW.ACHIEVEMENTS.map(function (a, k) {
      var steps = CW.achSteps(a, friend), i = CW.achTaken(s, a.id), all = i >= steps.length, v = CW.achValue(s, a);
      var need = all ? steps[steps.length - 1] : steps[i], ok = !all && v >= need, unit = a.id === 'tier' ? '차' : '';
      return '<div class="gprow ach' + (all ? ' got' : ok ? ' done' : '') + '" style="--i:' + (k + 1) + '"><span class="gpic">' + img(ACH_IC[a.id] || 'ms-star') + '</span>' +
        '<div class="gptxt"><b>' + esc(a.name) + ' <span>' + (all ? '완료' : (i + 1) + '단계') + '</span></b><div class="gpprog">' + bar(Math.min(v, need), need) +
        '<small>' + num(Math.min(v, need)) + unit + '/' + num(need) + unit + '</small></div></div><i class="gpdiv"></i>' +
        '<div class="gprw wide' + (ok ? ' has' : '') + '"><span class="gprwl"><em>' + esc(all ? '모두 받음' : achRw(CW.achReward(a, i))) + '</em></span>' +
        (all ? '<span class="gpdone">완료</span>' : ok ? '<button class="gpget" data-gp="a' + a.id + '">받기</button>' : '') + '</div></div>';
    }).join('');
  }
  // 바뀐 것만 고치기 (2026-11-23, 형: 탭 누르면 바로 떠야 하는데 한 번씩 버벅): 사냥하는 동안 0.7초마다 창 안을 통째로 새로 만들면
  // 그림이 전부 새로 붙고 그네·숨쉬기·별 움직임이 처음 자세로 툭 돌아갔음(10초에 5번, CPU 4배 느리게 실측) → 글자·막대·속성만 고침
  function morph(a, b) {   // a = 화면에 있는 것, b = 새로 만든 것
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.parentNode.replaceChild(b, a); return; }
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    var i, at;
    for (i = a.attributes.length - 1; i >= 0; i--) { at = a.attributes[i].name; if (!b.hasAttribute(at)) a.removeAttribute(at); }
    for (i = 0; i < b.attributes.length; i++) { at = b.attributes[i]; if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value); }
    morphKids(a, b);
  }
  function morphKids(a, b) {
    var ak = [].slice.call(a.childNodes), bk = [].slice.call(b.childNodes);
    if (ak.length !== bk.length) { while (a.firstChild) a.removeChild(a.firstChild); bk.forEach(function (n) { a.appendChild(n); }); return; }
    for (var i = 0; i < ak.length; i++) morph(ak[i], bk[i]);
  }
  function render() {
    var s = st(); if (!page || !s) return;
    var col = page.querySelector('.gpcol'), body = page.querySelector('.gpbody'), y = body.scrollTop;
    col.className = 'gpcol ' + tab;
    var html = tab === 'day' ? dayHtml(s) : tab === 'week' ? weekHtml(s) : achHtml(s);
    if (!enterNext && body.firstChild) { var t = document.createElement('div'); t.innerHTML = html; morphKids(body, t); }   // 같은 탭 다시 그리기
    else body.innerHTML = html;                                                                                            // 열 때·탭 바꿀 때
    body.scrollTop = y;
    page.querySelectorAll('.gptabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.gt === tab); });
    // 열 때·탭 바꿀 때만: 줄이 차례로 올라오고 막대가 0에서 차오름 (0.7초마다 다시 그릴 땐 그대로)
    if (enterNext) { enterNext = false; body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter'); clearTimeout(render.t); render.t = setTimeout(function () { body.classList.remove('enter'); }, 1100); }
    lastKey = key(s);
  }
  function key(s) { return tab + JSON.stringify(s.count) + JSON.stringify(s.goals) + JSON.stringify(s.ach) + (s.level || 0) + ':' + (s.tier || 0) + ':' + (s.bossWins || 0); }
  function changed() { if (CW.petChanged) CW.petChanged(); }
  // the reward picture flies up from the row to the top of the screen (to the money bar), then the row redraws as 받음
  function flyReward(from, pic) {
    if (!from || !pic) return;
    var r = from.getBoundingClientRect(), f = document.createElement('img');
    f.src = pic; f.alt = ''; f.className = 'gpflyrw'; f.style.left = (r.left + r.width / 2 - 22) + 'px'; f.style.top = (r.top + r.height / 2 - 22) + 'px';
    f.style.setProperty('--dy', -Math.max(120, r.top - 40) + 'px');
    document.body.appendChild(f); setTimeout(function () { f.remove(); }, 900);
  }
  function burst(box) {
    if (!box) return; var r = box.getBoundingClientRect();
    for (var k = 0; k < 8; k++) {
      var b = document.createElement('img'), a = k / 8 * Math.PI * 2;
      b.src = A() + 'ms-star.webp'; b.alt = ''; b.className = 'gpburst'; b.style.left = (r.left + 46) + 'px'; b.style.top = (r.top + r.height / 2 - 12) + 'px';
      b.style.setProperty('--bx', (Math.cos(a) * 70).toFixed(0) + 'px'); b.style.setProperty('--by', (Math.sin(a) * 55 - 20).toFixed(0) + 'px');
      document.body.appendChild(b); setTimeout(function (el) { return function () { el.remove(); }; }(b), 900);
    }
  }
  function toastOf(r) {
    if (!r || !CW.toast) return; var a = [];
    if (r.gold) a.push('골드 +' + fmt(r.gold)); if (r.food) a.push('펫 간식 +' + fmt(r.food)); if (r.eggs) a.push('펫 알 +' + r.eggs);
    if (r.mana) a.push('마력석 +' + fmt(r.mana)); if (r.runeStone) a.push('룬석 +' + fmt(r.runeStone));
    if (a.length) CW.toast(a.join(' · '));
  }
  function act(what, el) {
    var s = st(); if (!s) return;
    var c = ctx(), r = null, row = el && el.closest('.gprow, .gpbox'), pic = row && row.querySelector('.gprwic img, .gpboxic img');
    if (what.charAt(0) === 'a') {   // 업적 한 단계: 업적 배율·골드 %·보스 피해 %·펫 알·마력석
      var ar = CW.achClaim(s, what.slice(1), !!CW.FRIEND); if (!ar) return;
      if (CW.toast) CW.toast(achRw(ar) + ' 받았어요');
      flyReward(row && row.querySelector('.gpic img'), A() + (ACH_IC[what.slice(1)] || 'ms-star') + '.webp');
    } else if (what === 'box' || what === 'wbox') {
      var weekly = what === 'wbox';
      if (!(weekly ? CW.weekOpenBox(s) : CW.goalOpenBox(s))) return;
      r = weekly ? { eggs: 3, food: 150 } : { eggs: 1, food: 30 };
      var bi = row && row.querySelector('.gpboxic img'); if (bi) { bi.src = A() + (weekly ? 'ms-box-w-open' : 'ms-box-d-open') + '.webp'; row.classList.add('opening'); }
      burst(row); toastOf(r);
      changed(); setTimeout(render, 650); return;
    } else {
      r = what === 'owed' ? CW.goalOwedClaim(s, c) : what.charAt(0) === 'w' ? CW.weekClaim(s, +what.slice(1), c) : CW.goalClaim(s, +what.slice(1), c);
      if (!r) return;
      flyReward(pic, pic && pic.src); toastOf(r);
    }
    changed(); render();
  }
  function build() {
    page = document.createElement('div'); page.id = 'goalpage'; page.setAttribute('role', 'dialog'); page.setAttribute('aria-label', '미션');
    page.innerHTML = '<div class="gpcol day"><div class="gphead"><h3>미션</h3><button class="gpclose" aria-label="닫기">닫기</button></div>' +
      '<div class="gptabs"><button data-gt="day" class="on">일일 미션</button><button data-gt="week">주간 미션</button><button data-gt="ach">업적</button></div><div class="gpbody"></div></div>';
    document.body.appendChild(page);
    page.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('.gpclose')) { close(); return; }
      var tb = t.closest('[data-gt]'); if (tb) { if (tb.dataset.gt !== tab) { tab = tb.dataset.gt; enterNext = true; page.querySelector('.gpbody').scrollTop = 0; render(); } return; }
      var b = t.closest('[data-gp]'); if (b) act(b.dataset.gp, b);
    });
  }
  function open(cb) {
    if (!page) build();
    onClose = cb || null; tab = 'day'; enterNext = true; page.classList.add('on'); page.querySelector('.gpbody').scrollTop = 0; render();
    clearInterval(pollT); pollT = setInterval(function () { var s = st(); if (s && page.classList.contains('on') && key(s) !== lastKey) render(); }, 700);
  }
  function close() { if (!page) return; page.classList.remove('on'); clearInterval(pollT); pollT = 0; var cb = onClose; onClose = null; if (cb) cb(); }
  CW.goalsOpen = open; CW.goalsClose = close; CW.goalsIsOpen = function () { return !!(page && page.classList.contains('on')); };
  // 창이 화면을 다 덮음 (폰 세로: .gpcol 폭 520 이하): 뒤의 전투는 안 보이니 js/main.js가 방치모드처럼 드물게만 그림 (2026-11-23,
  // 덮인 채로 3D를 1초 60번 그리느라 탭 전환·줄 올라오는 움직임이 버벅였음. 넓은 화면은 양옆에 전투가 보여서 그대로)
  CW.goalsCovers = function () { return CW.goalsIsOpen() && root.innerWidth <= 520; };
})(this);
