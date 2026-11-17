// 공지 특별 화면 (2026-11-17, the user: 뽑기 확률표 공지 · 겨울 신규 패키지 공지 · 책처럼 넘기는 게임 가이드 공지).
// A notice with view: 'rates' | 'pack' | 'guide' opens one of these instead of plain text (js/notice-ui.js asks
// CW.noticePage[view]). Everything is read from DATA when it opens, so the table never drifts from the game.
// Each page returns { html, cls, init(el) }. Drawn with CSS and the game's own icons, no pictures to load.
(function (root) {
  var CW = root.CW;
  function D() { return CW.DATA; }
  function S() { return root.GAME && root.GAME.state; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pct(v) { if (!v) return '–'; var t = v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3); return t.replace(/\.?0+$/, '') + '%'; }
  function n(v) { return Math.round(v).toLocaleString('ko-KR'); }
  function ico(cat, id) { return (CW.ICO && CW.ICO.misc && CW.ICO.misc(cat, id)) || ''; }
  function sound() { var g = root.GAME; if (g && g.G && g.G.sound) g.G.sound('click'); }

  // ------------------------------------------------------------------ 확률표
  function bars(row, grades) {
    var max = Math.max.apply(null, row.concat([1]));
    return '<div class="rtbars">' + grades.map(function (g, i) {
      var v = row[i] || 0;
      return '<div class="rtbar' + (v ? '' : ' zero') + '" style="--c:' + g.color + ';--k:' + i + '"><i class="rtg">' + g.name + '</i>' +
        '<span class="rttrack"><b style="width:' + (v ? Math.max(2.5, v / max * 100) : 0) + '%"></b></span><em>' + pct(v) + '</em></div>';
    }).join('') + '</div>';
  }
  function costLine(cost, unit) {
    return '<div class="rtcost">' + Object.keys(cost).map(function (k) { return '<span><b>' + k + '회</b><i class="gem"></i>' + n(cost[k]) + '</span>'; }).join('') + (unit ? '<small>' + unit + '</small>' : '') + '</div>';
  }
  function gearPart(lv) {
    var GA = D().gacha, s = S(), my = s && CW.gachaLevel ? CW.gachaLevel(s.pulls || 0) : 1;
    if (!lv) lv = my;
    var chips = GA.levels.map(function (from, i) {
      var l = i + 1;
      return '<button class="rtlv' + (l === lv ? ' on' : '') + (l === my ? ' me' : '') + '" data-rtlv="' + l + '"><b>Lv.' + l + '</b><small>' + n(from) + '회~</small>' + (l === my ? '<i>내 레벨</i>' : '') + '</button>';
    }).join('');
    return '<p class="rtlead">뽑을수록 <b>뽑기 레벨</b>이 올라 높은 등급이 잘 나와요.<br>레벨을 눌러 확률을 비교해 보세요.</p>' +
      '<div class="rtlvs">' + chips + '</div>' +
      '<div class="rtcard"><div class="rtcap">뽑기 Lv.' + lv + ' · 등급별 확률</div>' + bars(GA.table[lv - 1], D().grades) + '</div>' +
      '<ul class="rtrules"><li><b>천장</b> ' + GA.pity + '번 안에 전설 등급 이상이 꼭 나와요.</li>' +
      '<li><b>10회</b> 뽑으면 희귀 이상 1개, <b>100회 이상</b>은 영웅 이상 1개 보장.</li>' +
      '<li>장비 부위 ' + D().slots.length + '곳은 모두 같은 확률이에요.</li>' +
      '<li>등급 안의 단계(Ⅰ~Ⅳ)는 Ⅰ로 나와요. 같은 장비 ' + D().bagConf.mergeCount + '개로 다음 단계!</li></ul>' + costLine(GA.cost);
  }
  function hiPart(name, C, extra) {
    return '<p class="rtlead">' + name + ' 소환은 <b>언제나 같은 확률</b>이에요.</p>' +
      '<div class="rtcard"><div class="rtcap">' + name + ' 소환 · 등급별 확률</div>' + bars(C.summonTable, D().hiGrades) + '</div>' +
      '<ul class="rtrules">' + extra + '</ul>' + costLine(C.summon);
  }
  function relicPart() {
    var C = D().relicSummon, all = D().relics, dv = all.filter(function (r) { return r.divine; }), nm = all.filter(function (r) { return !r.divine; });
    var each = function (list, total) {
      return list.map(function (r) { return '<div class="rtrel"><span class="rtri">' + (ico('relic', r.id) || r.icon) + '</span><b>' + esc(r.name) + '</b><em>' + pct(total / list.length) + '</em></div>'; }).join('');
    };
    return '<p class="rtlead">유물은 <b>신화 유물 ' + pct(C.divineRate * 100) + '</b>, 일반 유물 ' + pct((1 - C.divineRate) * 100) + '이에요.<br>같은 묶음 안에서는 모두 같은 확률이에요.</p>' +
      '<div class="rtcard"><div class="rtcap gold">신화 유물 · ' + dv.length + '종</div><div class="rtrels">' + each(dv, C.divineRate * 100) + '</div></div>' +
      '<div class="rtcard"><div class="rtcap">일반 유물 · ' + nm.length + '종</div><div class="rtrels">' + each(nm, (1 - C.divineRate) * 100) + '</div></div>' +
      '<ul class="rtrules"><li>같은 유물이 나오면 그 유물 레벨이 1 올라요.</li><li>최고 레벨(일반 ' + C.maxLv + ', 신화 ' + C.divineMaxLv + ')이면 다이아 ' + C.refund + '개로 돌려받아요.</li></ul>' + costLine(C.cost);
  }
  var RT = [['gear', '장비'], ['rune', '룬'], ['sigil', '신성력'], ['relic', '유물']];
  function ratesBody(tab, lv) {
    var body = tab === 'rune' ? hiPart('룬', D().runeConf, '<li>룬 종류는 지금 열린 룬 중에서 정해져요.</li><li>' + D().runeConf.unlockTier + '차 전직부터 소환할 수 있어요.</li><li>가방이 꽉 차면 그 룬은 룬석으로 바뀌어요.</li>')
      : tab === 'sigil' ? hiPart('신성력', D().sigilConf, '<li>옵션은 지금 열린 옵션 중에서 같은 확률로 정해져요.</li><li>' + D().sigilConf.unlockTier + '차 전직부터 소환할 수 있어요.</li><li>품질(0~100%)은 따로 무작위예요.</li>')
      : tab === 'relic' ? relicPart() : gearPart(lv);
    return '<div class="rtpane" data-rtpane="' + tab + '">' + body + '</div>';
  }
  function rates() {
    var html = '<div class="rtwrap"><div class="rthero"><span class="rtdice"><i></i><i></i><i></i></span><div><b>뽑기 확률표</b><small>모든 확률은 게임 속 값 그대로예요</small></div></div>' +
      '<div class="rttabs" role="tablist">' + RT.map(function (t, i) { return '<button role="tab" data-rttab="' + t[0] + '" aria-selected="' + !i + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="rtscroll">' + ratesBody('gear') + '</div>' +
      '<button class="nzgo2" data-nzjump="gacha"><span>뽑기 하러 가기</span></button></div>';
    return { html: html, cls: 'nzrates', init: function (el) {
      var tab = 'gear';
      el.addEventListener('click', function (e) {
        var t = e.target.closest('[data-rttab]'), l = e.target.closest('[data-rtlv]'), sc = el.querySelector('.rtscroll');
        if (t) { tab = t.dataset.rttab; sound(); el.querySelectorAll('[data-rttab]').forEach(function (b) { b.setAttribute('aria-selected', b === t); }); sc.innerHTML = ratesBody(tab); sc.scrollTop = 0; }
        else if (l) { sound(); var keep = el.querySelector('.rtlvs').scrollLeft; sc.querySelector('.rtpane').outerHTML = ratesBody('gear', +l.dataset.rtlv); el.querySelector('.rtlvs').scrollLeft = keep; }
      });
      var me = el.querySelector('.rtlv.me'); if (me) { var box = el.querySelector('.rtlvs'); box.scrollLeft = Math.max(0, me.offsetLeft - box.clientWidth / 2 + me.offsetWidth / 2); }
    } };
  }

  // ------------------------------------------------------------------ 겨울 신규 패키지
  function giveList(g) {
    var D0 = D(), hn = function (x) { return '<b style="color:' + D0.hiGrades[x].color + '">' + D0.hiGrades[x].name + '</b>'; }, out = [];
    if (g.gems) out.push(['💎', '다이아 ' + n(g.gems)]);
    if (g.pulls) out.push(['🎰', '장비 뽑기 ' + g.pulls + '번']);
    if (g.goldMin) out.push(['💰', '골드 (사냥 ' + (g.goldMin >= 60 ? g.goldMin / 60 + '시간' : g.goldMin + '분') + '치)']);
    if (g.potionMin) out.push(['🧪', '물약 3종 ' + g.potionMin / 60 + '시간']);
    if (g.mana) out.push(['🔷', '마력석 ' + n(g.mana)]);
    (g.runes || []).forEach(function (x) { out.push(['🔮', hn(x.grade) + ' 룬 ' + x.n + '개']); });
    if (g.runeStone) out.push(['🪨', '룬석 ' + n(g.runeStone)]);
    (g.sigils || []).forEach(function (x) { out.push(['💠', hn(x.grade) + ' 신성력 ' + x.n + '개']); });
    if (g.sigilStone) out.push(['✨', '신성석 ' + n(g.sigilStone)]);
    return out.map(function (x, i) { return '<li style="--k:' + i + '"><i>' + x[0] + '</i><span>' + x[1] + '</span></li>'; }).join('');
  }
  function pack() {
    var list = D().packs.filter(function (p) { return p.cat === 'winter'; }), s = S();
    var until = list[0] && list[0].until, m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(until || '');
    var flakes = ''; for (var i = 0; i < 18; i++) flakes += '<i style="--x:' + ((i * 41) % 100) + '%;--d:' + (6 + (i * 7) % 6) + 's;--w:' + (-((i * 11) % 9)) + 's;--z:' + (0.45 + (i % 4) * 0.22) + '"></i>';
    var BADGE = ['입문 추천', '가장 인기', '최고 가치'];
    var cards = list.map(function (p, k) {
      var got = s && CW.packOpen && CW.packOpen(s, p.id) === 'limit';
      return '<div class="wpcard w' + k + (got ? ' got' : '') + '" style="--k:' + k + '"><i class="wpbadge">' + BADGE[k] + '</i>' +
        '<div class="wptop"><span class="wpico">' + (ico('pack', p.id) || p.icon) + '</span><div><b>' + esc(p.name) + '</b><em>' + p.won.toLocaleString('ko-KR') + '원' + (got ? ' · 받음' : '') + '</em></div></div>' +
        '<ul>' + giveList(p.give) + '</ul></div>';
    }).join('');
    var html = '<div class="wpwrap"><div class="wsnow" aria-hidden="true">' + flakes + '</div>' +
      '<div class="wphero"><span class="wpman">⛄</span><b>겨울 신규 냥법사</b><small>처음 오신 냥법사님을 위한 겨울 선물 · 각 1번' + (m ? ' · ' + (+m[2]) + '월 ' + (+m[3]) + '일까지' : '') + '</small></div>' +
      '<div class="wpscroll">' + cards + '<p class="wpnote">룬은 3차, 신성력은 5차 전직부터 장착할 수 있어요.<br>그 전에는 가방에 잘 보관돼요.</p></div>' +
      '<button class="nzgo2 ice" data-nzjump="packs"><span>패키지 보러 가기</span></button></div>';
    return { html: html, cls: 'nzpack' };
  }

  // ------------------------------------------------------------------ 게임 가이드 (책)
  function med(svg, hue) { return '<span class="gbmed" style="--h:' + (hue || '#ffd36b') + '">' + svg + '</span>'; }
  function guidePages() {
    var D0 = D(), FR = !!CW.FRIEND, maxTier = FR ? (CW.FRIEND_MAX_TIER || 9) : D0.tiers.length;
    var regions = D0.regions.map(function (r) { return r.name; });
    var unlock = [[D0.alchConf.unlockTier, '연금술 · 던전'], [D0.runeConf.unlockTier, '룬 · 룬의 신전'], [D0.divineConf.unlockTier, '삼신기'], [D0.sigilConf.unlockTier, '신성력']];
    var P = [
      { cover: true },
      { toc: true },
      { ch: '1장', t: '전투는 자동이에요', art: med(ico('tab', 'battle'), '#ff9aa8'), body:
        '<p>냥법사는 <b>혼자서 알아서 싸워요</b>. 화면을 켜 두기만 해도 몬스터를 잡고 골드와 경험치를 모아요.</p>' +
        '<div class="gbsteps"><span>몬스터 ' + D0.balance.killsPerStage + '마리</span><i></i><span>보스 도전</span><i></i><span>다음 스테이지</span></div>' +
        '<p>보스에게 지면 앞 스테이지로 돌아가 <b>사냥하며 성장</b>해요. 강해지면 다시 도전!</p>' +
        '<p class="gbtip">지역은 ' + regions.length + '곳이에요.<br><small>' + regions.join(' → ') + '</small></p>' },
      { ch: '2장', t: '훈련으로 강해지기', art: med(ico('tab', 'up'), '#8fe0a0'), body:
        '<p>아래 <b>훈련</b> 탭에서 냥법사를 키워요.</p>' +
        '<dl class="gbdl"><dt>성장</dt><dd>골드로 공격력·치명타·공격 속도를 올려요. 제일 먼저!</dd><dt>특성</dt><dd>레벨 ' + D0.talentConf.levelsPerPoint + '마다 포인트 1개. 원하는 특성에 써요.</dd>' +
        '<dt>연금술</dt><dd>물약을 만들면 피해·골드·경험치가 몇 분 동안 올라요.</dd><dt>승급 · 마나서클</dt><dd>보스가 주는 마력석으로 더 강해져요.</dd></dl>' },
      { ch: '3장', t: '스킬과 전직', art: med(ico('tab', 'skill'), '#c4a8ff'), body:
        '<p>지역의 마지막 <b>31번째 보스</b>를 이기면 <b>전직</b>해요. 전직마다 새 원소 스킬 4개가 열려요.</p>' +
        '<div class="gbjobs">' + D0.tiers.slice(0, maxTier).map(function (t, i) { return '<span><b>' + (i + 1) + '차</b>' + t.name.replace(' 냥법사', '').replace('의 대마법냥', '') + '</span>'; }).join('') + '</div>' +
        '<p>스킬은 <b>골드로 레벨업</b>(최대 ' + D0.balance.skillMaxLv + ')하고, 스킬 칸에 넣으면 알아서 써요. 프리셋 3개로 바꿔 끼울 수 있어요.</p>' },
      { ch: '4장', t: '장비 모으고 합치기', art: med(ico('tab', 'gear'), '#ffc27a'), body:
        '<p>장비는 <b>모자 · 지팡이 · 로브 · 벨트 · 목걸이 · 귀걸이 · 반지</b>, 7곳이에요.</p>' +
        '<div class="gbmerge"><span>같은 장비</span><b>×' + D0.bagConf.mergeCount + '</b><i></i><span>한 단계 위</span></div>' +
        '<p>등급마다 Ⅰ~Ⅳ 단계가 있고, Ⅳ를 합치면 다음 등급 Ⅰ이 돼요.</p>' +
        '<div class="gbgrades">' + D0.grades.map(function (g) { return '<i style="--c:' + g.color + '">' + g.name + '</i>'; }).join('') + '</div>' +
        '<p class="gbtip">가지고만 있어도 보유 효과가 붙어요. 버리지 말고 합쳐요!</p>' },
      { ch: '5장', t: '뽑기', art: med(ico('tab', 'gacha'), '#ff9ec7'), body:
        '<p><b>다이아</b>로 장비를 뽑아요. 많이 뽑을수록 <b>뽑기 레벨</b>이 올라 좋은 등급이 잘 나와요.</p>' +
        '<ul class="gbul"><li>' + D0.gacha.pity + '번 안에 전설 이상 보장</li><li>10회·100회·500회 묶음이 더 싸요</li><li>유물·룬·신성력 소환도 여기서</li></ul>' +
        '<p class="gbtip">정확한 확률은 공지의 <b>「뽑기 확률표」</b>에서 볼 수 있어요.</p>' },
      { ch: '6장', t: '던전', art: med(ico('tab', 'dungeon'), '#b4a2ff'), body:
        '<p>' + D0.dungeonConf.unlockTier + '차 전직부터 열려요. 던전마다 <b>하루 입장권 ' + D0.dungeonConf.tickets + '장</b>, 30초 동안 싸워요.</p>' +
        '<div class="gbdung">' + D0.dungeons.map(function (d) { return '<div><span>' + (ico('dungeon', d.id) || d.icon) + '</span><b>' + d.name + '</b><small>' + d.desc.replace('30초 동안 ', '') + (d.unlockTier ? ' (' + d.unlockTier + '차부터)' : '') + '</small></div>'; }).join('') + '</div>' +
        '<p class="gbtip">한 번 깬 기록은 <b>소탕</b>으로 바로 받을 수 있어요.</p>' },
      { ch: '7장', t: '전직하면 열리는 것', art: med(ico('tab', 'more'), '#8fe0ff'), body:
        '<div class="gbunlock">' + unlock.map(function (u) { return '<div><b>' + u[0] + '차</b><span>' + u[1] + '</span></div>'; }).join('') + '</div>' +
        '<dl class="gbdl"><dt>유물</dt><dd>다이아로 소환. 같은 유물이 나오면 레벨업.</dd><dt>코스튬</dt><dd>입지 않아도 갖고만 있으면 효과가 붙어요.</dd>' +
        '<dt>룬 · 신성력</dt><dd>모아서 합치면 더 높은 등급이 돼요. 「추천 장착」으로 좋은 것부터 껴요.</dd><dt>삼신기</dt><dd>지팡이·망토·방울을 골드로 키우고, 보스 조각으로 별을 올려요.</dd></dl>' },
      { ch: '8장', t: '크리티컬 10단계', art: med('<svg viewBox="0 0 64 64"><path d="M32 4l7 18 19 1-15 12 5 19-16-11-16 11 5-19L6 23l19-1z" fill="#ffd84a" stroke="#4a2b1a" stroke-width="3" stroke-linejoin="round"/></svg>', '#ffe27a'), body:
        '<p>치명타가 터지면 그다음 단계를 한 번 더 굴려요. 위로 갈수록 피해가 훨씬 커요!</p>' +
        '<div class="gbcrit">' + D0.critTiers.map(function (t, i) { return '<span style="--c:' + t.color + ';--k:' + i + '">' + t.short + '</span>'; }).join('') + '</div>' +
        '<p>단계별 확률과 피해는 <b>훈련 → 성장</b>에서 올리고, 룬·신성력·유물·특성이 더해 줘요.</p>' },
      { ch: '9장', t: '쉬는 동안에도', art: med(ico('quick', 'map') || '', '#a8d8ff'), body:
        '<dl class="gbdl"><dt>오프라인 보상</dt><dd>게임을 꺼도 최대 ' + D0.balance.offlineCapSec / 3600 + '시간, 사냥의 ' + D0.balance.offlineRate * 100 + '%를 모아 둬요.</dd>' +
        '<dt>방치 모드</dt><dd>바로가기의 「방치」를 눌러요. 화면을 어둡게 하고 밤새 켜 둘 때 좋아요.</dd>' +
        '<dt>우편함 · 공지</dt><dd>선물과 소식이 와요. 빨간 점이 보이면 눌러 보세요.</dd>' +
        '<dt>도감</dt><dd>한 지역 몬스터를 다 찾으면 공격력 +' + D0.dexConf.regionBonus.atkPct * 100 + '%, 골드 +' + D0.dexConf.regionBonus.goldMul * 100 + '% 영구 보너스!</dd></dl>' },
      { ch: '10장', t: '난이도', art: med('<svg viewBox="0 0 64 64"><path d="M8 50l8-30 12 14 4-24 4 24 12-14 8 30z" fill="#ff7a8a" stroke="#4a1a2a" stroke-width="3" stroke-linejoin="round"/><path d="M8 50h48v6H8z" fill="#ffd84a" stroke="#4a1a2a" stroke-width="3"/></svg>', '#ff9aa8'), body:
        '<p>마지막 지역 <b>' + regions[regions.length - 1] + '</b>의 보스를 이기면 더 어려운 난이도가 열려요.</p>' +
        '<div class="gbdiff">' + D0.difficulties.map(function (d, i) { return '<span style="--k:' + i + '"><b>' + d.name + '</b><small>다이아 ×' + d.gemMul + '</small></span>'; }).join('') + '</div>' +
        '<p>1-1부터 다시 시작하지만 몬스터가 훨씬 강하고, 보상도 훨씬 커요.</p>' },
      { ch: '부록', t: '처음 오신 분 꿀팁', art: med('<svg viewBox="0 0 64 64"><path d="M32 6c12 0 20 8 20 19 0 8-5 12-8 16v7H20v-7c-3-4-8-8-8-16C12 14 20 6 32 6z" fill="#ffe27a" stroke="#4a3a1a" stroke-width="3"/><path d="M22 52h20v6H22z" fill="#c9c9d6" stroke="#4a3a1a" stroke-width="3"/></svg>', '#ffe27a'), body:
        '<ol class="gbol"><li><b>성장</b>의 공격력부터 올려요.</li><li>막히면 <b>장비 합치기 → 스킬 레벨업</b>.</li><li>던전 입장권은 <b>매일</b> 다 써요.</li><li>다이아는 <b>10회 이상 묶음</b>으로 뽑아요.</li><li>사냥할 땐 <b>물약</b>을 켜 둬요.</li><li>잘 때는 <b>방치 모드</b>!</li></ol>' },
      { back: true }
    ];
    return P;
  }
  function pageHtml(p, i, total, P) {
    var num = '<i class="gbnum">' + (i + 1) + '</i>';
    if (p.cover) return '<div class="gbpage gbcover"><div class="gbcv"><span class="gbstar s1"></span><span class="gbstar s2"></span><span class="gbstar s3"></span>' +
      '<span class="gbcrest">' + ico('tab', 'skill') + '</span><small>냥법사 모험 안내서</small><b>처음 만나는<br>냥법사</b><em>밀어서 넘겨 보세요</em><i class="gbswipe"></i></div></div>';
    if (p.back) return '<div class="gbpage gbcover gbback"><div class="gbcv"><span class="gbcrest">' + ico('tab', 'battle') + '</span><b>즐거운 모험<br>되세요!</b><small>모르는 게 생기면 언제든<br>이 안내서를 다시 펼쳐 보세요</small>' +
      '<button class="gbagain" data-gbgo="0">처음으로</button></div></div>';
    if (p.toc) return '<div class="gbpage"><div class="gbin"><div class="gbch">차례</div><h4>무엇이 궁금하세요?</h4><div class="gbtoc">' +
      P.map(function (x, k) { return x.t ? '<button data-gbgo="' + k + '"><i>' + x.ch + '</i><span>' + x.t + '</span><em>' + (k + 1) + '</em></button>' : ''; }).join('') + '</div></div>' + num + '</div>';
    return '<div class="gbpage"><div class="gbin"><div class="gbch">' + p.ch + '</div><div class="gbart">' + p.art + '</div><h4>' + p.t + '</h4><div class="gbtext">' + p.body + '</div></div>' + num + '</div>';
  }
  function guide() {
    var P = guidePages(), cur = 0, busy = false;
    var html = '<div class="gbwrap"><div class="gbbook"><i class="gbribbon"></i><div class="gbstack"></div></div>' +
      '<div class="gbnav"><button class="gbprev" data-gbstep="-1" aria-label="이전 쪽"></button><div class="gbdots"></div><button class="gbnext" data-gbstep="1" aria-label="다음 쪽"></button></div></div>';
    return { html: html, cls: 'nzbook', init: function (el) {
      var stack = el.querySelector('.gbstack'), dots = el.querySelector('.gbdots');
      function nav() {
        el.querySelector('.gbprev').disabled = cur === 0; el.querySelector('.gbnext').disabled = cur === P.length - 1;
        dots.innerHTML = '<b>' + (cur + 1) + '</b> / ' + P.length + '<span class="gbbar"><i style="width:' + ((cur + 1) / P.length * 100) + '%"></i></span>';
      }
      function show(i) { stack.innerHTML = pageHtml(P[i], i, P.length, P); nav(); }
      // the page turn: forward, the old page is a leaf that swings over the spine to the left, the new one under it;
      // back, the earlier page swings in from the left over the current one
      function go(to) {
        if (busy || to < 0 || to >= P.length || to === cur) return;
        var fwd = to > cur, old = pageHtml(P[cur], cur, P.length, P), nu = pageHtml(P[to], to, P.length, P);
        var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
        sound(); cur = to; nav();
        if (reduce) { stack.innerHTML = nu; return; }
        busy = true;
        stack.innerHTML = '<div class="gbunder">' + (fwd ? nu : old) + '</div><div class="gbleaf ' + (fwd ? 'fwd' : 'bwd') + '"><div class="gbface">' + (fwd ? old : nu) + '</div><div class="gbface gbbackf"></div><i class="gbshade"></i></div>';
        setTimeout(function () { stack.innerHTML = nu; busy = false; }, 640);
      }
      el.addEventListener('click', function (e) {
        var st = e.target.closest('[data-gbstep]'), g = e.target.closest('[data-gbgo]');
        if (st) go(cur + (+st.dataset.gbstep)); else if (g) go(+g.dataset.gbgo);
      });
      // swipe to turn (a sideways move; an up-down one is the page scrolling)
      var x0 = null, y0 = 0, t0 = 0, book = el.querySelector('.gbbook');
      book.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
      book.addEventListener('touchend', function (e) {
        if (x0 === null) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - t0 < 900) go(cur + (dx < 0 ? 1 : -1));
      }, { passive: true });
      var key = function (e) { if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1); };
      document.addEventListener('keydown', key);
      CW.noticePageOff = function () { document.removeEventListener('keydown', key); CW.noticePageOff = null; };
      show(0);
    } };
  }

  CW.noticePage = { rates: rates, pack: pack, guide: guide };
})(this);
