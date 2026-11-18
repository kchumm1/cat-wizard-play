(function (root) {
  var CW = root.CW = root.CW || {};
  var DATA = CW.DATA, fmt = CW.fmt, fmtG = CW.fmtGold;
  // gold in a page: the number with its Korean unit a little smaller ("6.5억", "1589조"), one size in every menu (.gn)
  function gh(n) { var m = /^([0-9.,]+)(\D*)$/.exec(fmtG(n)) || [0, fmtG(n), '']; return '<b class="gn">' + m[1] + (m[2] ? '<small>' + m[2] + '</small>' : '') + '</b>'; }
  var lastGoldTxt = '';
  var $ = function (id) { return document.getElementById(id); };
  var STAT_NAME = { atk: '공격력', atkPct: '공격력', critRate: '치명타 확률', critDmg: '치명타 피해', goldMul: '골드 획득', skillDmg: '스킬 피해', speed: '공격 속도', bossDmg: '보스 피해', speedBoss: '공격 속도·보스 피해' };
  var SLOT_NAME = { hat: '모자', staff: '지팡이', robe: '로브', belt: '벨트', necklace: '목걸이', ear1: '귀걸이', ear2: '귀걸이', ring1: '반지', ring2: '반지' };
  var SHORT = { starShot: '별탄', magicClaw: '발톱', furBomb: '털뭉치', sparkRing: '고리', fireball: '화염', chainLightning: '번개', iceStorm: '얼음', meteorRain: '별똥', moonLaser: '달빛', solarBurst: '태양', blackHole: '블랙홀', elementNova: '궁극' };
  var STATUS = { shock: '감전: 다음 피해 증가', freeze: '빙결: 잠깐 멈추고 받는 피해 증가', gather: '몬스터를 한곳에 모음' };
  var ICON = {
    hat: '<path d="M8 40h48l-6-5H14z" fill="#6a4be0"/><path d="M18 35L33 6c4 6 2 12 8 16l9 13z" fill="#7f62f0"/><circle cx="34" cy="26" r="4" fill="#ffcf4a"/><path d="M8 40h48" stroke="#2a1d4f" stroke-width="3"/>',
    staff: '<path d="M22 58L40 18" stroke="#9b6a3f" stroke-width="6" stroke-linecap="round"/><path d="M44 4l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#ffd84a" stroke="#c98a12" stroke-width="2"/>',
    robe: '<path d="M24 8h16l14 48H10z" fill="#5b4bd6"/><path d="M32 8v48" stroke="#ffcf4a" stroke-width="3"/><path d="M24 8l8 10 8-10" fill="#ff8fd0"/>',
    belt: '<rect x="4" y="24" width="56" height="16" rx="4" fill="#8a5a3c"/><rect x="24" y="20" width="16" height="24" rx="3" fill="none" stroke="#ffcf4a" stroke-width="4"/>',
    necklace: '<path d="M12 8c0 26 40 26 40 0" fill="none" stroke="#ffcf4a" stroke-width="4"/><path d="M32 30l8 10-8 12-8-12z" fill="#ff6fa8" stroke="#a02a68" stroke-width="2"/>',
    ear: '<circle cx="32" cy="14" r="6" fill="none" stroke="#ffcf4a" stroke-width="4"/><path d="M32 20c-10 14-10 26 0 32 10-6 10-18 0-32z" fill="#7fe3ff" stroke="#2a8ab8" stroke-width="2"/>',
    ring: '<circle cx="32" cy="38" r="16" fill="none" stroke="#ffcf4a" stroke-width="6"/><path d="M32 8l9 10-9 10-9-10z" fill="#ff4d6d" stroke="#a0283a" stroke-width="2"/>'
  };
  // pictures for the gear kinds when they exist (art/gear/<kind>.*), drawn icons otherwise
  function icon(kind) { var img = CW.GEAR_IMG && CW.GEAR_IMG[kind]; if (img) return '<img class="gimg" src="' + img + '" alt="" draggable="false">'; return '<svg viewBox="0 0 64 64" aria-hidden="true">' + ICON[kind] + '</svg>'; }
  function gearArt(kind, grade, sub) { return CW.ICO.gear(kind, grade, (sub || 0) + 1, CW.GEAR_IMG && CW.GEAR_IMG[kind]); }
  function mi(cat, o) { return (CW.ICO.misc && CW.ICO.misc(cat, o.id)) || o.icon; }
  function gc(g) { return 'var(--g' + g + ')'; }
  // colors and names of the eleven grades (sigils, runes, costumes)
  function hc(g) { return CW.DATA.hiGrades[Math.max(0, Math.min(CW.DATA.hiGrades.length - 1, g))].color; }
  function hn(g) { return CW.DATA.hiGrades[Math.max(0, Math.min(CW.DATA.hiGrades.length - 1, g))].name; }
  function pct(v) { return (Math.round(v * 1000) / 10) + '%'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function createUI(G) {
    var tab = 'battle', selSlot = -1, lastPanel = '', toastT = 0, lastBuffs = '', dockHtml = '';
    var TITLES = { dungeon: '던전', up: '훈련', skill: '스킬', gear: '장비', gacha: '뽑기', more: '더보기', stage: '스테이지 선택' };
    var bagKind = 'staff', selKey = null, bagAll = true;   // 사용자 2026-11-16: 모든 등급을 늘 보여 줌 (「고른 등급만 보기」 버튼 뺌)   // bagAll: 장비 목록에 미보유 등급까지 (보기만)
    var KIND_SHORT = { hat: '모자', staff: '지팡이', robe: '로브', belt: '벨트', necklace: '목걸이', ear: '귀걸이', ring: '반지' };
    // 장비 효과 숫자는 소수점 자리를 늘 같게 (형 2026-11-18 「숫자가 바뀌면 옆으로 퍼졌다 줄었다」): 47197.5% → 47244% 처럼 소수점이
    // 붙었다 떨어지며 한 레벨마다 글자 폭이 바뀌었음 → 1000% 미만은 소수 한 자리(6.0%), 1000% 이상은 정수
    function gpct(v) { var p = v * 100; return (p >= 999.95 ? String(Math.round(p)) : (Math.round(p * 10) / 10).toFixed(1)) + '%'; }
    function statLine(stat, v) { return stat === 'speedBoss' ? '공격 속도 +' + gpct(v) + ' · 보스 피해 +' + gpct(v * 8) : (STAT_NAME[stat] || STAT_KO[stat] || stat) + ' +' + gpct(v); }
    function potTag(q) { return q > 0.85 ? ['레전더리', '#ff4d6d'] : q > 0.6 ? ['유니크', '#ffd84a'] : q > 0.3 ? ['에픽', '#c47bff'] : ['레어', '#6fb8ff']; }
    function bagCell(k, big) {
      var s = G.state, p = CW.parseKey(k), e = s.bag && s.bag[k], worn = s.equip[p.kind] === k;
      return '<' + (big ? 'div' : 'button') + ' class="bcell' + (big ? ' big' : '') + (e ? '' : ' none') + (worn ? ' eq' : '') + (!big && selKey === k ? ' sel' : '') + '" ' + (big ? '' : 'data-bkey="' + k + '" ') + 'style="--gc:' + gc(p.grade) + '">' +
        '<span class="tg"><small class="tgg">' + DATA.grades[p.grade].name + ' </small>' + CW.roman(p.sub) + '</span>' + (CW.ICO.gearSrc && CW.ICO.gearSrc(p.kind, p.grade, p.sub + 1) ? '<img class="gcimg" src="' + CW.ICO.gearSrc(p.kind, p.grade, p.sub + 1) + '" alt="" draggable="false">' : gearArt(p.kind, p.grade, p.sub)) + (worn ? '<span class="E">E</span>' : '') +
        (e && e.star ? '<span class="bst">★' + e.star + '</span>' : '') + '<span class="blv">Lv.' + (e ? e.lv : 0) + '</span><span class="bn">' + (e ? e.n : 0) + '개</span></' + (big ? 'div' : 'button') + '>';
    }
    function bagPanel() {
      var s = G.state, T = CW.tierCount();
      if (!selKey || CW.parseKey(selKey).kind !== bagKind) selKey = s.equip[bagKind] || CW.bestKey(s, bagKind) || CW.keyOf(bagKind, 0);
      var k = selKey, p = CW.parseKey(k), e = s.bag[k], lv = e ? e.lv : 0, star = e ? e.star || 0 : 0, max = CW.maxLevel(k, star), stat = DATA.kindStat[p.kind], worn = s.equip[p.kind] === k, cost = CW.levelCost(k, lv, s);
      var BG = DATA.bagConf, trc = CW.transcendCost(s, k), stars = ''; for (var si = 0; si < BG.starMax; si++) stars += '<i class="' + (si < star ? 'on' : '') + '">' + (si < star ? '★' : '☆') + '</i>';
      var trOk = e && star < BG.starMax && lv >= max && e.n > trc.copies && s.gold >= trc.gold;
      // each line has a lock: locked lines stay when the potential is rolled again (2026-11-14)
      // gear card look picked by the user (2026-11-15): grade badge + name, outline stars, level bar beside the level,
      // a paw divider, one row per effect, and a potential box with a tinted row per line
      var PAW = '<img class="paw" src="' + (CW.ART_BASE || 'art/') + 'ui-paw.webp" alt="" draggable="false">';   // cut from the design the user sent (art/ui-paw.webp)
      // padlock drawn closed (locked line, on gold) or with the shackle lifted (open line, grey outline), as in the picked design
      var LOCK = function (on) { return '<svg class="plk" viewBox="0 0 24 24" aria-hidden="true">' + (on ? '<path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="4.5" y="10" width="15" height="11" rx="2.6" fill="currentColor"/><circle cx="12" cy="14.6" r="1.7" fill="#f6c95a"/><path d="M12 15.5v2.6" stroke="#f6c95a" stroke-width="1.8" stroke-linecap="round"/>' : '<path d="M7.5 10.5V6.8a4.5 4.5 0 0 1 8.8-1.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="4.8" y="10.3" width="14.4" height="10.4" rx="2.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="14.6" r="1.5" fill="currentColor"/><path d="M12 15.4v2.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>') + '</svg>'; };
      var TAGC = { '레어': 'pr', '에픽': 'pe', '유니크': 'pu', '레전더리': 'pl' };
      var pot = e && e.pot ? e.pot.map(function (pl, i) { var t = potTag(pl.q || 0); return '<p class="potline ' + (TAGC[t[0]] || 'pr') + '"><i class="pspark">✦</i><em class="ptag">' + t[0] + '</em><span>' + (STAT_KO[pl.stat] || pl.stat) + ' ' + CW.bonusAmount(pl.stat, pl.val) + '</span><button class="plock' + (pl.lock ? ' on' : '') + '" data-plock="' + k + '|' + i + '" aria-pressed="' + !!pl.lock + '" aria-label="이 줄 ' + (pl.lock ? '잠금 해제' : '잠금') + '">' + LOCK(pl.lock) + '</button></p>'; }).join('') + '' : '<p class="potnone"><b>잠재력 미개방</b><br>다이아로 개방할 수 있어요. 효과는 장착 중에만 적용돼요.</p>';
      var pnote = e && e.pot ? '<div class="pnote"><span>잠근 줄은 유지 · 1줄마다 <span class="pcost">+<i class="gem"></i>' + DATA.potConf.cost + '</span></span></div>' : '';
      // 승인 시안 (2026-11-16 최종): 왼쪽 성운 전시대 위 선택 장비, 오른쪽 이름·Lv·별 + 한 덩어리 효과 영역(장착·보유·잠재력)
      var ST = CW.opalUI ? CW.opalUI.stage : function (x) { return x; };
      var gsrc = CW.ICO.gearSrc && CW.ICO.gearSrc(p.kind, p.grade, p.sub + 1);   // 전시대엔 원판 없는 원본 그림
      // (사용자 2026-11-18: 레벨업 때 전시대 그림이 튀며 다시 시작하던 것을 뺌 — objAttr 없음, 숫자만 바뀜)
      var top = '<div class="bagtop opbag">' + ST(gsrc ? '<img class="gshow" src="' + gsrc + '" alt="" draggable="false">' : gearArt(p.kind, p.grade, p.sub), { cls: 'gstage k-' + p.kind + (e ? '' : ' none'), seed: 0 }) +
        '<div class="binfo"><div class="bname"><b>' + DATA.kindName[p.kind] + '</b><em class="glv" data-opv="blv">Lv.' + lv + '<small> / ' + max + '</small></em></div><span class="gstars">' + stars + '<em class="ggr" style="color:' + gc(p.grade) + '">' + DATA.grades[p.grade].name + ' ' + CW.roman(p.sub) + '</em></span>' +
        '</div>' +   // 승인 시안: 이름·Lv 아래엔 별만 (등급·장착·개수는 아래 목록 칸과 장착 버튼에)
        // 승인 시안: 효과 상자(장착·보유)와 잠재력 상자(옵션 줄 + 자물쇠)를 따로
        '<div class="bdetail"><p class="ef"><i>✦</i><span>장착 효과</span><b>' + statLine(stat, CW.mainValue(p.kind, p.t, lv, star)) + '</b></p><p class="ef"><i>✦</i><span>보유 효과</span><b>' + statLine(stat, CW.ownedValue(p.kind, p.t, lv, star)) + '</b></p></div>' +
        '<div class="gpot"><p class="pthead"><i>✦</i>잠재력<small>장착 중에만 · 잠근 줄 유지</small></p><div class="plist">' + pot + '</div></div></div>' +
        // 승인 시안: 청록 「레벨업」 + 낱말 행동 장착 | 합성 | 초월 | 잠재력 한 줄. 각 행동의 실제 조건·비용은 그 아래 한 줄로 모음
        '<div class="bagbtns"><button class="buy' + (!e || lv >= max || s.gold < cost ? ' off' : '') + (e && lv >= max ? ' max' : '') + '" data-blv="' + k + '">' + (lv >= max ? '최대 레벨' : '<small>레벨업</small><span><i class="coin"></i>' + gh(cost) + '</span>') + '</button>' +
        '<button class="btn' + (worn ? ' on' : '') + (e ? '' : ' off') + '" data-bequip="' + k + '">' + (worn ? '장착 중' : '장착') + '</button>' +
        '<button class="btn' + (e && e.n >= DATA.bagConf.mergeCount && p.t < T - 1 ? '' : ' off') + '" data-bmerge="' + k + '" title="합성 ' + (e ? e.n : 0) + '/' + DATA.bagConf.mergeCount + '">합성</button>' +
        '<button class="btn tr' + (trOk ? '' : ' off') + '" data-btr="' + k + '" title="' + (star >= BG.starMax ? '초월 완료 ★' + star : '초월 ★' + star + '→' + (star + 1) + ' · 최대 레벨 + 같은 장비 ' + trc.copies + '개 + 골드 ' + fmtG(trc.gold)) + '">초월</button>' +
        '<button class="btn pot' + (e ? '' : ' off') + '" data-bpot="' + k + '" title="잠재력 재설정 · 다이아 ' + fmt(e ? CW.potCost(s, k) : DATA.potConf.cost) + '">잠재력</button></div>';   // 아래 조건 안내 줄은 뺐다 (사용자 2026-11-16: 이거 빼)
      var kinds = '<div class="kindtabs" role="tablist">' + DATA.kinds.map(function (kd) {
        var w = s.equip[kd], g = w ? CW.parseKey(w).grade : -1;
        return '<button role="tab" aria-selected="' + (kd === bagKind) + '" data-bkind="' + kd + '">' + KIND_SHORT[kd] + (g >= 0 ? '<i style="background:' + gc(g) + '"></i>' : '') + '</button>';
      }).join('') + '</div>';
      var bagActs = '<div class="btns bagacts"><button class="btn pri" data-act="merge"><i class="opsp">✦</i>전부 합성</button><button class="btn" data-act="best"><i class="opsp">✦</i>추천 장착</button></div>';   // 승인 시안: 목록 아래
      // 승인 시안: 종류 탭 바로 아래 고른 장비 등급의 I~IV 한 줄. 다른 등급은 「다른 등급 보기」로 펼침 (보기만, 기능 같음)
      var rows = '', hidden = 0;
      for (var g = DATA.grades.length - 1; g >= 0; g--) {
        if (g !== p.grade && !bagAll) { hidden++; continue; }
        for (var sb = 0; sb < 4; sb++) rows += bagCell(CW.keyOf(bagKind, g * 4 + sb));
      }
      var tl = CW.gearTotalLevel(s);
      var ns = CW.gearStars(s);
      return top + kinds + '<div class="bgrid opgrade' + (bagAll ? ' all' : '') + '" data-grade="' + DATA.grades[p.grade].name + '">' + rows + '</div>' + bagActs +
        // 통합 효과 카드 (2026-11-17, 사용자: 장비 맨 밑 문구를 코스튬 맨 밑처럼 상자로): 코스튬 수집 카드와 같은 모양
        '<div class="opcard ccol gcodex"><div class="opcard-h"><b>장비 통합 효과</b></div>' +
        '<div class="ccol-cells"><p><small>통합 레벨 Lv.' + fmt(tl) + '</small><b>공격력 +' + pct(tl * DATA.gearCodex.per) + '</b></p>' +
        '<p class="nx"><small>초월 통합 성급 ★' + ns + '</small><b>모든 피해 +' + pct(ns * BG.starFinal) + '</b></p></div>' +
        '<p class="opcard-f">장비 레벨 1마다 공격력 +' + pct(DATA.gearCodex.per) + ' · 초월 ★1마다 모든 피해 +' + pct(BG.starFinal) + '</p></div>';
    }
    var ghdSeen = null, ghdPlay = false, ghdFrom = 0, ghdBar = 0;   // 뽑기 레벨 칸 움직임
    var skDetail = null, skRegOpen = false;   // 스킬 상세 (보기) · 유리한 지역 펼침
    var selDiff = -1, selRegion = -1, gearSub = 'gear', upMul = 1, trainSub = 'grow', selTalent = null, selRune = null, fxRune = null, rnFilter = 'all', rnGroup = 'all', selSigil = null, sgFilter = -1, moreSub = 0, tierAnim = false;
    function mmss(sec) { sec = Math.ceil(sec); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
    // 잠긴 메뉴 카드 (사용자 시안 2026-11-17, art/locked-*.webp · tools/cut-locked*.py): 크림 카드에 고양이·강아지가 움직이고,
    // 설명 줄에 해금 조건, 막대는 보통 난이도에서 그 보스까지 온 만큼, 버튼은 지금 갈 수 있는 맨 앞 스테이지로.
    // 고양이·강아지는 바탕(-bg)과 따로 떼어 낸 그림(-cat/-dog)을 겹쳐 놓고 CSS로만 움직인다.
    var LOCKED = {
      alch: { name: '연금술', sub: '곧 연금술이 열려요', label: '해금까지 한 걸음 더', num: true, tail: '해금돼요' },
      dung: { name: '던전', sub: '곧 던전이 열려요', label: '새로운 모험을 준비 중이에요', tail: '입장할 수 있어요' },
      sigil: { name: '신성력', sub: '곧 신성력이 깨어나요', label: '작은 빛이 모이고 있어요', tail: '깨울 수 있어요' }
    };
    function lockedCard(kind, tier) {
      var L = LOCKED[kind], s = G.state, goal = (tier - 1) * 31 - 1;   // n차 전직 = (n-1)-31 보스
      var b0 = (s.diff || 0) ? (((s.diffBest || {})[0] || { best: -1 }).best) : s.best, front = Math.max(0, Math.min(goal, b0 + 1));
      var pct = Math.round((front + 1) / (goal + 1) * 100);
      var lay = function (p) { return '<img class="lk' + p + '" src="art/locked-' + kind + '-' + p + '.webp" alt="" draggable="false">'; };
      return '<div class="lkc lk-' + kind + '"><div class="lkin">' +
        '<div class="lkhd"><b>' + L.name + '</b><span class="lkpill">오픈 준비 중</span></div>' +
        '<div class="lkart">' + lay('bg') + lay('cat') + lay('dog') + (kind === 'alch' ? lay('star') : kind === 'sigil' ? '<i class="lkglow"></i>' : '') + '</div>' +
        '<div class="lkt" role="heading" aria-level="3">조금만 기다려요<img src="art/locked-spark.webp" alt="" draggable="false"></div>' +
        '<p class="lks">' + L.sub + '</p>' +
        '<p class="lkb">' + CW.stageLabel(goal) + ' 보스 처치 후 ' + tier + '차 전직하면 ' + L.tail + '</p>' +
        '<div class="lkpr"><b>' + L.label + '</b><span>' + (L.num ? CW.stageLabel(front) + ' / ' + CW.stageLabel(goal) : '잠금 중') + '</span></div>' +
        '<div class="lkbar"><i style="width:' + pct + '%"></i></div>' +
        '<button class="lkgo" data-lkgo="' + front + '">보스 도전하러 가기<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5.5 19.5 12 13 18.5"/></svg></button>' +
        '</div></div>';
    }
    function alchPanel() {
      var s = G.state, AC = DATA.alchConf, now = Date.now();
      if (!CW.alchemyOpen(s)) return lockedCard('alch', AC.unlockTier);
      var lv = CW.alchLevel(s), cost = CW.potionCost(s), brews = (s.alch && s.alch.brews) || 0, toNext = AC.brewsPerLv - brews % AC.brewsPerLv;
      // 연금술 부품 (사용자, 2026-11-16, tools/import-alchemy-parts.py): 성운 → 받침대 → 유리 가마솥 → 기포·연기 | 레벨 칸,
      // 그 아래 「제작 → 효과 즉시 적용 → 남은 시간」, 물약 카드 3장. 만들면 바로 효과(대기·재료·보관함 없음), 다시 만들면 시간이 늘어남.
      // 물약이 켜져 있으면 남은 시간 때문에 1초마다 다시 그려지므로, 움직임은 지금 시각만큼 앞당겨 시작(--ph)해서 끊기지 않게 한다.
      // --ph 는 그린 뒤 renderPanel 이 넣음 (그림 코드에 넣으면 0.3초마다 화면을 통째로 다시 만들어 폰 스크롤이 끊김 — 사용자 2026-11-16)
      var ph = '';
      var stars = ''; for (var di = 0; di < AC.brewsPerLv; di++) stars += '<i class="' + (di < AC.brewsPerLv - toNext ? 'on' : '') + '"></i>';
      var head = '<div class="alchhead opalch anw" ' + ph + '><div class="acaul" data-opfx="brew" data-opdur=".55" aria-hidden="true"><i class="aneb"></i><i class="aped"></i>' +
        '<i class="asteam s1"></i><i class="asteam s2"></i><img class="acimg" src="art/al-cauldron.webp" alt=""><i class="abub b1"></i><i class="abub b2"></i><i class="abub b3"></i></div>' +
        '<div class="al-lv"><b>연금술 <span class="alvn">Lv.<span data-opv="alv">' + lv + '</span></span></b><small>다음 레벨까지 물약 ' + toNext + '개</small><span class="al-stars">' + stars + '</span></div></div>';
      var flow = '<div class="opflow anw" title="같은 물약은 최대 ' + CW.potionMinutes(s) * AC.stackCap + '분까지 쌓여요 · 제작 비용 = 지금 사냥 약 ' + Math.round(AC.costSec / 60) + '분 수익"><span>제작</span><i></i><span>효과 즉시 적용</span><i></i><span>남은 시간</span></div>';
      var list = DATA.potions.map(function (p) {
        var left = CW.buffLeft(s, p.id, now);
        return '<div class="pcard anw' + (left ? ' on' : '') + '"><div class="pbot" data-opfx="brew:' + p.id + '" data-opdur=".55"><img class="paimg" src="art/al-' + p.id + '.webp" alt=""></div><b class="pname">' + p.name + '</b>' +
          '<span class="peff"><i></i>' + (p.id === 'wisdom' ? '경험치' : p.desc) + ' <b>×' + (1 + CW.potionPower(s, p.id)).toFixed(2) + '</b></span>' +
          '<span class="ptime' + (left ? ' live' : '') + '"><i></i>' + (left ? '남은 ' + mmss(left) : CW.potionMinutes(s) + '분') + '</span>' +
          '<button class="buy' + (s.gold < cost ? ' off' : '') + '" data-brew="' + p.id + '"><small>' + (left ? '시간 추가' : '만들기') + '</small><span><i class="coin"></i>' + gh(cost) + '</span></button>' + (left ? '<i class="pcheck"></i>' : '') + '</div>';
      }).join('');
      return head + flow + '<div class="pgrid anw" ' + ph + '>' + list + '</div>';
    }
    function trainTabs() {
      return '<div class="subtabs n5" role="tablist">' + [['grow', '성장'], ['talent', '특성'], ['alch', '연금술'], ['mark', '승급'], ['circle', '마나서클']].map(function (t) {
        return '<button role="tab" aria-selected="' + (trainSub === t[0]) + '" data-tsub="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    }
    function manaLine() { return '<div class="manaline"><span>' + CW.ICO.cur('mana') + ' 마력석 <b>' + fmt(G.state.mana || 0) + '</b></span><small class="note">획득처 · 보스 / 마력의 탑</small></div>'; }
    function trainPanel() {
      if (trainSub === 'talent') return trainTabs() + talentPanel();
      if (trainSub === 'alch') return trainTabs() + alchPanel();
      // 메뉴 위의 재화 잔액 줄은 뺐다 (오팔 시안 2026-11-16): 비용은 버튼에, 부족하면 버튼 옆에 적는다
      if (trainSub === 'mark') return trainTabs() + markPanel();
      if (trainSub === 'circle') return trainTabs() + circlePanel();
      return trainTabs() + upPanel();
    }
    var talRowsSeen = null;
    function talentPanel() {
      var s = G.state, pts = CW.talentPoints(s), spent = CW.talentSpent(s), TC = DATA.talentConf;
      // the 크리티컬 row (row 4, 2026-11-16) is drawn on its own below the tree: rate | damage per tier, open tiers only
      var CRIT_ROW = 4, last = CRIT_ROW - 1;
      function node(t) {
          var lv = (s.talents || {})[t.id] || 0, open = CW.talentOpen(s, t.id);
          // a closed talent still shows its picture, with a small lock on its corner (design pack 2026-11-14)
          // 특성 부품 (2026-11-16): 돔 뒤판 → 아이콘 → 앞 유리 반짝임 → 이름판 → 레벨 알약(최대 청록 / 일부 회색 / 0 흰색)
          var art = CW.ICO.talentArt && CW.ICO.talentArt(t.id), lvc = lv >= t.max ? 'lvmax' : lv > 0 ? 'lvpart' : 'lvzero';
          return '<button class="tnode tnw' + (selTalent === t.id ? ' sel' : '') + (open ? '' : ' lock') + (lv >= t.max ? ' max' : '') + '" data-tal="' + t.id + '"><i class="tdome"></i><i class="thalo"></i><span class="ti" data-opfx="tal:' + t.id + '" data-opdur=".3">' + (art ? '<img class="tico" src="' + art + '" alt="">' : mi('talent', t)) + '</span><i class="tglint"></i>' +
            '<span class="tplate"><small>' + t.name + '</small></span><b class="' + lvc + '">' + (lv > t.max ? 'Lv.' + lv : lv + '/' + t.max) + '</b>' + (open ? '' : '<i class="tlock"></i>') + '</button>';
      }
      // 오팔 (2026-11-16): 줄 사이엔 공용 연결선 하나. 실제 조건 = 계정 레벨 + 위 줄들에 쓴 누적 포인트 (특정 부모 노드가 아님)
      var rowOpen = function (r) { return (s.level || 1) >= TC.rowLevel[r] && (r === 0 || CW.talentSpent(s, r - 1) >= TC.rowNeed[r]); };
      var nowOpen = TC.rowLevel.slice(0, CRIT_ROW).map(function (_, r) { return rowOpen(r); });
      if (talRowsSeen && CW.opalUI) nowOpen.forEach(function (o, r) { if (o && !talRowsSeen[r]) CW.opalUI.fx('trow:' + r); });   // 실제로 새 줄이 열렸을 때만
      talRowsSeen = nowOpen;
      var rows = TC.rowLevel.slice(0, CRIT_ROW).map(function (_, r) {
        var nodes = DATA.talents.filter(function (t) { return t.row === r; }).map(node).join('');
        var link = '';
        if (r < last) {
          var had = CW.talentSpent(s, r), need = TC.rowNeed[r + 1], lvNeed = TC.rowLevel[r + 1], ptsOk = had >= need, lvOk = (s.level || 1) >= lvNeed;
          link = '<div class="tlink tnw' + (ptsOk && lvOk ? ' ok' : '') + '" data-opfx="trow:' + (r + 1) + '" data-opdur=".45"><i></i><span class="treq ' + (ptsOk && lvOk ? 'ok' : 'no') + '">' + (need ? '누적 포인트 <b>' + had + '</b>/' + need : '') +
            (lvOk ? '' : '<em>' + (need ? ' · ' : '') + '계정 Lv.' + lvNeed + '</em>') + '</span><i></i></div>';
        }
        return '<div class="trow' + (nowOpen[r] ? '' : ' shut') + '">' + nodes + '</div>' + link;
      }).join('');
      var critRows = DATA.critTiers.map(function (ct, i) {
        if (!CW.critTierOpen(s, i)) return '';
        return '<div class="trow tcrit tnw"><span class="tclabel" style="color:' + ct.color + '">' + ct.short + '</span>' + DATA.talents.filter(function (t) { return t.crit === i; }).map(node).join('') + '</div>';
      }).join('');
      if (critRows) rows += '<div class="tarrow tnw">크리티컬 특성<small>단계마다 확률 또는 피해 · 최대 2레벨</small></div>' + critRows;
      if (!selTalent || !CW.talentById(selTalent)) { var first = DATA.talents.filter(function (x) { return CW.talentOpen(s, x.id) && ((s.talents || {})[x.id] || 0) < x.max; })[0]; selTalent = (first || DATA.talents[0]).id; }   // 시안: 처음부터 하나 골라 둠
      var t = selTalent && CW.talentById(selTalent), info = '';
      if (t) {
        var lv = (s.talents || {})[t.id] || 0;
        var tart = CW.ICO.talentArt && CW.ICO.talentArt(t.id), tmax = lv >= t.max && t.crit !== undefined;
        // 조건 줄 = 실제 열림 규칙 그대로: 계정 레벨 + 위 줄들에 쓴 포인트 합 (특정 특성이 아님), 열렸으면 남은 포인트
        var tnote = (function () {   // 이 줄 = 지금 누르면 어떻게 되는지 / 왜 잠겼는지 (사용자 2026-11-16: 쉬운 말로, 한 가지만)
          var free = pts - spent, lvNow = s.level || 1, LK = '<i class="tnlock"></i>';
          if (tmax) return { txt: '최대 레벨까지 올렸어요' };
          if (!CW.talentOpen(s, t.id)) {
            if (t.crit !== undefined) return { lock: 1, txt: LK + DATA.critTiers[t.crit].name + '이 열리면 쓸 수 있어요' };
            var needLv = TC.rowLevel[t.row], needPt = t.row ? TC.rowNeed[t.row] : 0, had = t.row ? CW.talentSpent(s, t.row - 1) : 0;
            if (lvNow < needLv) return { lock: 1, txt: LK + '계정 Lv.' + needLv + '이 되면 열려요' };
            return { lock: 1, txt: LK + '위 특성에 ' + needPt + '포인트 쓰면 열려요' };
          }
          return { txt: free > 0 ? '포인트 1개로 1레벨 올라가요' : '포인트가 없어요 · ' + TC.levelsPerPoint + '레벨마다 1개' };
        })();
        info = '<div class="tinfo tnw"><span class="tidome"><i class="tdome"></i><span class="ti">' + (tart ? '<img class="tico" src="' + tart + '" alt="">' : mi('talent', t)) + '</span><i class="tglint"></i><i class="tped"></i></span>' +
          '<div class="tidesc"><b>' + t.name + ' <small>' + (lv > t.max ? 'Lv.' + lv : lv + '/' + t.max) + '</small></b><div class="tieff">' + STAT_KO[t.stat] + ' ' + CW.bonusAmount(t.stat, lv * t.per) + (t.crit === undefined || lv < t.max ? ' <i>→</i> <span>' + CW.bonusAmount(t.stat, (lv + 1) * t.per) + '</span>' : '') + '</div>' +
          '<small class="tinote' + (tnote.lock ? ' lock' : '') + '">' + tnote.txt + '</small></div>' +
          '<button class="buy tupb' + (CW.talentCan(s, t.id) ? '' : ' off') + '" data-tup="' + t.id + '">' + (tmax ? '최대' : '포인트 1로 강화') + '</button></div>';
      }
      return '<div class="tpoints tnw"><span class="tpp" title="받은 포인트 ' + pts + ' · 계정 ' + TC.levelsPerPoint + '레벨마다 1개 · 초기화 무료">남은 포인트 <b data-opv="tpt">' + (pts - spent) + '</b></span><button class="btn treset" data-act="treset">초기화</button></div><div class="ttree opboard tnw">' + rows + '</div>' + (info || '<p class="note">특성을 선택하면 효과를 확인할 수 있어요.</p>');
    }
    function markPanel() {
      var s = G.state, RC = DATA.rankConf, r = s.rank || 0, cap = CW.markCap(s), ready = CW.rankReady(s);
      var stars = ''; for (var i = 0; i < RC.names.length - 1; i++) stars += '<i class="' + (i < r ? 'on' : '') + '">★</i>';
      // 오팔 (2026-11-16): 가운데 진주 별 훈장, 둘레에 기본 징표 6개. 이번 계급 상한(cap)에 닿은 징표만 표시등이 켜진다.
      // 추가 징표는 이 준비 조건에 들어가지 않는다 (rankReady와 같음). 승급은 전직과 다른 시스템.
      var base = DATA.marks.filter(function (m) { return !m.extra; }), nOk = base.filter(function (m) { return ((s.marks || {})[m.id] || 0) >= cap; }).length;
      // 승급 부품 (사용자, 2026-11-16, tools/import-rank-parts.py) + 시안 배치: 성운 → 빛줄기 → 받침대 → 별 훈장(틀+발바닥 메달) → 둘레 징표 돔 6개,
      // 그 아래 「지금 계급 → 다음 계급」, 징표 조건 6칸, 「징표 · 계정 Lv · 마력석」, 「모든 피해 지금 → 다음」, 승급하기. 판정은 기존 함수 그대로.
      // 개별 징표 강화는 그 아래 실제 목록 (추가 징표 2개 포함)
      var mlv = function (m) { return (s.marks || {})[m.id] || 0; };
      var POS = [[94, 44.5], [263, 44.5], [51, 110.5], [306.5, 110.5], [79.7, 180.5], [277.6, 180.5]], CEN = [179.5, 111], rays = '', domes = '';
      base.forEach(function (m, i) {
        var p = POS[i % POS.length], on = mlv(m) >= cap, dx = p[0] - CEN[0], dy = p[1] - CEN[1];
        rays += '<i class="rkv-ray' + (on ? ' on' : '') + '" style="--l:' + (Math.sqrt(dx * dx + dy * dy) - 22).toFixed(1) + 'px;--a:' + (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1) + 'deg"></i>';
        domes += '<span class="rkv-mk' + (on ? ' on' : '') + '"' + (CW.markOpen(s, m.id) ? ' data-mkhold="' + m.id + '"' : '') + ' style="left:' + (p[0] - 45).toFixed(1) + 'px;top:' + (p[1] - 34.5).toFixed(1) + 'px;--d:' + i + '" data-opfx="mk:' + m.id + '" data-opdur=".26" title="' + m.name + ' ' + mlv(m) + '/' + cap + '"><i class="rkv-nped"></i><i class="rkv-dome"></i><img src="art/rk-' + m.id + '.webp" alt=""><i class="rkv-glint"></i></span>';
      });
      var next = r + 1 < RC.names.length ? RC.names[r + 1] : null;
      var head = '<div class="rkwrap"><div class="rkv" data-opfx="rankup" data-opdur=".9"><i class="rkv-neb"></i>' + rays + '<i class="rkv-ped"></i><span class="rkv-badge"><img class="rkv-frame" src="art/rk-badge.webp" alt=""><img class="rkv-paw" src="art/rk-paw.webp" alt=""></span>' + domes + '</div>' +
        '<div class="rk-plate2" data-opfx="rankup" data-opdur=".5"><i></i><b>' + RC.names[r] + '</b>' + (next ? '<em></em><b>' + next + '</b>' : '<small>최고 계급</small>') + '<i></i></div>' +
        '<div class="rk-conds">' + base.map(function (m) { var lv = mlv(m), ok = lv >= cap; return '<span class="rk-cond' + (ok ? ' ok' : '') + '"><i></i><span>' + m.name + '</span><b>' + (lv > cap ? 'Lv.' + lv : lv + '/' + cap) + '</b><em>' + (ok ? '✓' : '') + '</em></span>'; }).join('') + '</div>';
      var cond = next ? '<div class="rk-sum2"><i></i><span>징표 <b class="' + (nOk >= base.length ? 'ok' : 'no') + '">' + nOk + '/' + base.length + '</b></span><span>계정 <b class="' + ((s.level || 1) >= RC.rankLevel[r + 1] ? 'ok' : 'no') + '">Lv.' + RC.rankLevel[r + 1] + '</b></span><span>마력석 <b class="' + ((s.mana || 0) >= RC.rankCost[r + 1] ? 'ok' : 'no') + '">' + fmt(RC.rankCost[r + 1]) + '</b></span><i></i></div>' : '';
      cond += '<div class="rk-cmp2"><i></i><span class="rkc-l">모든 피해</span><span class="rkc-a">+' + pct(r * RC.rankFinal) + '</span>' + (next ? '<em></em><b>+' + pct((r + 1) * RC.rankFinal) + '</b>' : '') + '</div>';
      cond += (next ? '<button class="buy rkup' + (ready.ok ? '' : ' off') + '" data-act="rankup">승급하기</button>' : '<p class="note">최고 계급 달성</p>') + '</div>';
      var list = DATA.marks.map(function (m) {
        var lv = mlv(m), cost = CW.markCost(lv), full = false, ov = lv - cap, rate = ({ critRate: '치명타 피해', superRate: '테라 피해' })[m.stat];   // 한계 돌파 (2026-11-15)
        var ico = '<span class="rkr-ico" data-opfx="mk:' + m.id + '" data-opdur=".26"><i class="rkv-dome"></i><img src="art/rk-' + m.id + '.webp" alt=""></span>';
        if (!CW.markOpen(s, m.id)) return '<div class="row lockrow rkrow">' + ico + '<div class="info"><div class="name">' + m.name + '</div><div class="desc need">' + RC.names[m.openRank] + ' 달성 시 해금 · ' + STAT_KO[m.stat] + '</div></div><span class="lockic"></span></div>';
        return '<div class="row rkrow' + (m.extra ? ' mkextra' : '') + '">' + ico.replace('<span class="rkr-ico"', '<span class="rkr-ico" data-mkhold="' + m.id + '"') + '<div class="info"><div class="name">' + m.name + ' <span class="lv" data-opv="mk:' + m.id + '">' + (ov > 0 ? 'Lv.' + lv : lv + '/' + cap) + '</span></div><div class="desc">' + STAT_KO[m.stat] + ' ' + CW.bonusAmount(m.stat, (rate && ov > 0 ? cap : lv) * m.per) + (rate && ov > 0 ? ' · ' + rate + ' +' + ov + '%' : '') + '</div></div>' +
          '<button class="buy rkbuy' + (full || (s.mana || 0) < cost ? ' off' : '') + '" data-mark="' + m.id + '"><i class="rkgem"></i>' + (full ? '최대' : fmt(cost)) + '</button></div>';
      }).join('');
      return head + cond + '<div class="list rkl">' + list + '</div>';
    }
    // the user's mana circle (2026-11-15) cut into three rings that turn on their own: the inner blades light up first,
    // the star lattice at 2서클; the outer rune band is always fully lit (the user, 2026-11-15),
    // each level-up sends a pulse out, a new circle a big burst. Rings keep their angle across redraws (delay from the clock).
    // the panel is redrawn often; keepCircle (after each redraw) sets the ring angles from the clock and replays the pulse
    var lastCircle = null, circleFx = '';
    function circleArt(lv, tier, prog) {
      if (lastCircle && lv > lastCircle.lv) circleFx = tier > lastCircle.tier ? 'tierup' : 'lvup';
      lastCircle = { lv: lv, tier: tier };
      var ring = function (name, lit) { return '<div class="mcl mc-' + name + (lit ? ' lit' : '') + '"><i></i></div>'; };
      return '<div class="mcircle mcx t' + Math.min(8, tier) + '" style="--p:' + Math.round(Math.max(0, Math.min(1, prog)) * 360) + 'deg">' +
        '<div class="mc-glow"></div>' + ring('out', true) +
        ring('mid', tier >= 1) + ring('in', true) + '<div class="mc-core"></div><div class="mc-burst"></div>' +
        '<b class="mc-lv">' + (tier + 1) + '</b></div>';
    }
    // 오팔 마나서클 (2026-11-16): 떠 있는 핵과 기울어진 세 유리 궤도 (js/ui-opal.js의 장치 하나를 옮겨 붙임, keepCircle).
    // 서클·레벨·효과는 돌지 않는 글씨로 아래에. 장치가 없거나 동작 줄이기면 같은 실루엣의 정지 그림(.opfb).
    var circleVm = null;
    // 빛나는 별 (마나서클·스킬 성운 별자리 공용): 분홍빛 빛번짐 + 가늘고 뾰족한 네 갈래 + 하얀 심, 큰 별은 짧은 대각선
    var opStar = function (x, y, L, big) {
        var w = L * 0.11, V = L * 1.18, d = 'M' + x + ' ' + (y - V) + 'Q' + (x + w) + ' ' + (y - w) + ' ' + (x + L) + ' ' + y + 'Q' + (x + w) + ' ' + (y + w) + ' ' + x + ' ' + (y + V) + 'Q' + (x - w) + ' ' + (y + w) + ' ' + (x - L) + ' ' + y + 'Q' + (x - w) + ' ' + (y - w) + ' ' + x + ' ' + (y - V) + 'Z';   // 가늘고 뾰족한 가시, 세로가 조금 더 김 (시안)
        var k = L * 0.5, dg = big ? '<path class="dg" d="M' + (x - k) + ' ' + (y - k) + 'L' + (x + k) + ' ' + (y + k) + 'M' + (x + k) + ' ' + (y - k) + 'L' + (x - k) + ' ' + (y + k) + '"/>' : '';
        return '<g><circle class="gl" cx="' + x + '" cy="' + y + '" r="' + (L * 1.9).toFixed(1) + '"/>' + dg + '<path class="sp" d="' + d + '"/><circle class="co" cx="' + x + '" cy="' + y + '" r="' + (L * 0.34).toFixed(1) + '"/></g>';
      };
    function circlePanel() {
      var s = G.state, CC = DATA.circleConf, lv = s.circle || 0, tier = CW.circleTier(s), cost = CW.circleCost(lv), max = lv >= CC.maxLv;
      if (lastCircle && lv > lastCircle.lv) circleFx = tier > lastCircle.tier ? 'tierup' : 'lvup';
      lastCircle = { lv: lv, tier: tier };
      circleVm = { lv: lv, tier: tier };
      // 마나서클 부품 (사용자, 2026-11-16, tools/import-mana-parts.py) + 시안 배치: 성운 아치 창 → 받침대 → 고리 뒤 반쪽 → 물방울 결정·발바닥
      // → 고리 앞 반쪽 → 고리를 도는 은구슬(결정 뒤로 지나갈 땐 뒤에). 계속 도는 움직임은 시계로 이어서 다시 그려도 처음부터 안 돌아감.
      // 레벨·서클·비용·판정은 기존 함수 그대로
      if (circleFx === 'tierup' && CW.opalUI) CW.opalUI.fx('mctier');
      var inTier = lv - tier * CC.tierEvery, ok = (s.mana || 0) >= cost;   // 움직임 시각(--ph)은 renderPanel 이 그린 뒤 넣음
      // 별자리 별 (사용자: 「빛나는 게 없어」): 시안처럼 분홍빛 빛번짐 + 굵은 네 갈래 반짝이 + 하얀 심. 큰 별은 짧은 대각선 빛줄기도
      var star = opStar;
      var cst = '<svg class="mcv-cst" viewBox="0 0 359 245"><defs><radialGradient id="mcCstGlow"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".28" stop-color="#ffe4f4" stop-opacity=".6"/><stop offset=".62" stop-color="#e3d2ff" stop-opacity=".2"/><stop offset="1" stop-color="#e3d2ff" stop-opacity="0"/></radialGradient></defs>' +
        '<g class="ln"><polyline points="36,94 49,71 88,53 118,34"/><polyline points="339,139 314,162"/></g><g class="st">' +
        star(36, 94, 4.5) + star(49, 71, 3.2) + star(88, 53, 7, 1) + star(118, 34, 5.5, 1) + star(339, 139, 6, 1) + star(314, 162, 3.2) + '</g></svg>';
      var dev = '<div class="mcwrap"><div class="mcv" data-opfx="circle" data-opdur=".6" aria-hidden="true"><i class="mcv-neb"></i><i class="mcv-rim"></i>' + cst +
        '<i class="mcv-ped"></i><i class="mcv-o o1 b"></i><i class="mcv-o o2 b"></i>' +
        '<img class="mcv-cry" src="art/mn-crystal.webp" alt=""><img class="mcv-paw" src="art/mn-paw.webp" alt="">' +
        '<i class="mcv-o o1 f"></i><i class="mcv-o o2 f"></i>' +
        '<span class="mcv-bw w1"><i><b></b></i></span><span class="mcv-bw w2"><i><b></b></i></span><span class="mcv-bw w3"><i><b></b></i></span>' +
        '<i class="mcv-burst" data-opfx="mctier" data-opdur="1.3"></i></div>' +
        '<div class="mc-pill" data-opfx="circle" data-opdur=".5"><b>' + (tier + 1) + '서클</b><i></i><b class="lv" data-opv="mcn">Lv.' + lv + '</b></div></div>';
      var eff = '<div class="mc-eff"><p><i class="s1"></i><span>스킬 피해</span><b data-opv="mcs">+' + pct(lv * CC.perLv) + '</b></p><p><i class="s2"></i><span>모든 피해</span><b>+' + pct(tier * CC.tierFinal) + '</b></p></div>';
      var prog = max ? '<div class="mc-prog"><span>최고 서클 · 한계 돌파 Lv.' + (lv - CC.maxLv) + '</span><b>최대</b><i class="trk"><em style="width:100%"></em></i></div>'
        : '<div class="mc-prog"><span>다음 서클 Lv.' + ((tier + 1) * CC.tierEvery) + '</span><b data-opv="mcp">' + inTier + '/' + CC.tierEvery + '</b><i class="trk"><em style="width:' + (100 * inTier / CC.tierEvery).toFixed(1) + '%"></em></i></div>';
      return dev + eff + prog +
        '<button class="buy mcup' + (ok ? '' : ' off') + '" data-circle="1"><i class="sp a"></i><span class="t">레벨업</span><i class="sep"></i><span class="c"><i class="gem"></i>' + fmt(cost) + '</span><i class="sp z"></i></button>' +
        '<p class="mch' + (ok ? '' : ' bad') + '">' + (ok ? (max ? '스킬 피해만 계속 올라요 · ' : '') + '길게 누르면 연속 강화돼요.' : '마력석이 부족해요 · 보스 / 마력의 탑에서 얻어요') + '</p>';
    }
    function dungeonPanel() {
      var s = G.state, now = Date.now();
      if (!CW.dungeonOpen(s)) return lockedCard('dung', DATA.dungeonConf.unlockTier);
      var run = G.dunState();
      return (run ? '<div class="notice">' + run.name + ' 진행 중</div>' : '') + guideRow('dungeon', '던전별 하루 입장권 ' + DATA.dungeonConf.tickets + '장 · 클리어하면 소탕 가능') + '<div class="dlist">' +
        DATA.dungeons.map(function (d) {
          var bonus = (s.dungeon && s.dungeon.bonus && s.dungeon.bonus[d.id]) || 0, left = CW.ticketsLeft(s, d.id, now) - bonus, best =s.dungeon && s.dungeon.best && s.dungeon.best[d.id];
          var bestTxt = best ? (d.id === 'mana' ? '최고 피해 ' + fmt(best.dmg) : '최고 ' + best.kills + '마리') : '기록 없음';
          var rw = best ? CW.dungeonReward(s, d.id, best) : null;
          var rwTxt = rw ? (rw.gold ? '골드 +' + gh(rw.gold) : rw.gems ? '다이아 +' + fmt(rw.gems) : rw.runeStone ? '룬석 +' + fmt(rw.runeStone) + (rw.runes ? ' · 룬 ' + rw.runes + '개' : '') : '마력석 +' + fmt(rw.mana)) : '';
          if (!CW.kindOpen(s, d.id)) return '<div class="dung dg-' + d.id + ' lockd"><div class="dicon">' + mi('dungeon', d) + '</div><div class="info"><div class="dname">' + d.name + '</div><div class="note">' + d.desc + '</div><div class="note">' + d.unlockTier + '차 전직 후 해금</div></div></div>';
          return '<div class="dung dg-' + d.id + '"><div class="dicon">' + mi('dungeon', d) + '</div><div class="info"><div class="dname">' + d.name + '</div><div class="note">' + d.desc + '</div><div class="note">입장권 <b style="color:#fff">' + left + '/' + DATA.dungeonConf.tickets + '</b>' + (bonus ? ' <b style="color:#ffd76a">+' + bonus + '</b>' : '') + ' · ' + bestTxt + (rwTxt ? ' (' + rwTxt + ')' : '') + '</div></div>' +
            '<div class="dbtns"><button class="buy' + ((left + bonus) && !run ? '' : ' off') + '" data-dgo="' + d.id + '">입장</button><button class="btn' + ((left + bonus) && best && !run ? '' : ' off') + '" data-dsw="' + d.id + '">소탕</button></div></div>';
        }).join('') + '</div>';
    }
    // mana surge gauge over the skill row (no pop-up words: the user wants none)
    function surgeGauge(v, max) { var f = $('surgeFill'); if (f) f.style.width = Math.min(100, v / max * 100) + '%'; var g = $('surgeGauge'); if (g) g.classList.toggle('full', v >= max - 1); }
    function dunHud(run) {
      var el = $('dunHud'); if (!run) { el.className = ''; return; }
      el.className = 'on';
      el.innerHTML = '<b>' + run.name + '</b><span>' + Math.max(0, run.t).toFixed(1) + '초</span><span>' + (run.kind === 'mana' ? '피해 ' + fmt(run.dmg) + ' · 골렘 Lv.' + run.level : '처치 ' + run.kills) + '</span>';
    }
    var STAT_KO = { atk: '기본 공격력', criticalRate: '크리티컬 확률', criticalDmg: '크리티컬 피해', criticalDmgPct: '크리티컬 피해', potion: '분노의 물약', potionGold: '황금 물약', potionXp: '지혜의 물약', megaRate: '노바 크리티컬 확률', megaDmg: '노바 크리티컬 피해', ultimateRate: '오라 크리티컬 확률', ultimateDmg: '오라 크리티컬 피해', alphaRate: '제로 크리티컬 확률', alphaDmg: '제로 크리티컬 피해', atkPct: '공격력', critRate: '치명타 확률', critDmg: '치명타 피해', superRate: '테라 크리티컬 확률', superDmg: '테라 크리티컬 피해', ultraRate: '루나 크리티컬 확률', ultraDmg: '루나 크리티컬 피해', hyperRate: '솔라 크리티컬 확률', hyperDmg: '솔라 크리티컬 피해', bossDmg: '보스 피해', normalDmg: '일반 몬스터 피해', skillDmg: '스킬 피해', goldMul: '골드 획득', xpMul: '경험치 획득', speed: '공격 속도', weakDmg: '약점 피해', surgeDmg: '폭주 피해', surgeRate: '폭주 충전 속도', finalPct: '모든 피해' };
    // crit tiers (2026-11-16): rate, '배' damage and '%' damage of every tier
    DATA.critTiers.forEach(function (t) { STAT_KO[t.rate] = t.name + ' 확률'; STAT_KO[t.dmg] = t.name + ' 피해'; STAT_KO[t.dmg + 'Pct'] = t.name + ' 피해'; });
    // "스킬 피해가" / "공격력이": the right particle after a Korean word (a final consonant takes 이)
    function iga(w) { var c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? '이' : '가'); }
    function bonusText(stat, v) { return (STAT_KO[stat] || stat) + ' +' + pct(v); }
    function subTabs() {
      return '<div class="subtabs n6" role="tablist">' + [['gear', '장비'], ['relic', '유물'], ['costume', '코스튬'], ['divine', '삼신기'], ['sigil', '신성력'], ['rune', '룬']].map(function (t) {
        return '<button role="tab" aria-selected="' + (gearSub === t[0]) + '" data-gsub="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    }
    // 다이아 소환 버튼 한 칸 (유물·신성력·각성 공용): 가운데에 「N회」, 아래 다이아 값. 모자라면 값만 빨갛게(.off)
    // 룬 가루 · 신성력 가루로 만들기 (2026-11-17): the same 5회·10회 at the same price, paid in dust (field hunting and time away)
    function dustRow(kind, have, attr, costs, lock) {
      return '<div class="rsum-dust"><div class="rsd-h"><i class="dusti ' + (kind === 'rune' ? 'dr' : 'ds') + '"></i><span>' + (kind === 'rune' ? '룬 가루' : '신성력 가루') + '로 만들기</span><b>' + fmt(Math.floor(have)) + '</b></div>' +
        '<div class="rsum-btns n2">' + [5, 10].map(function (m) {
          return '<button class="rsb dst' + (m === 10 ? ' big' : '') + (lock ? ' lock' : '') + (have < costs[m] ? ' off' : '') + '" ' + attr + '="' + m + '"><span class="rsb-n"><b>' + m + '</b>회</span><span class="rsb-c"><i class="dusti ' + (kind === 'rune' ? 'dr' : 'ds') + '"></i>' + fmt(costs[m]) + '</span></button>';
        }).join('') + '</div></div>';
    }
    function summonBtn(n, cost, attr, big) {
      return '<button class="rsb' + (big ? ' big' : '') + (G.state.gems < cost ? ' off' : '') + '" ' + attr + '="' + n + '"><span class="rsb-n"><b>' + n + '</b>회</span><span class="rsb-c"><i class="gem"></i>' + fmt(cost) + '</span></button>';
    }
    var selRelic = null;   // 유물 전시대에 보일 것 (보기만, 저장 안 함)
    function relicPanel() {
      var s = G.state, own = s.relics || {}, have = DATA.relics.filter(function (r) { return own[r.id]; }).length;
      // 소환 카드 (2026-11-17, 사용자: 뽑기 부분 깔끔하게 · 줄맞춤 칸맞춤): 제목줄 · 같은 크기 버튼 3칸 · 안내 2줄
      var RS = DATA.relicSummon;
      var pulls = '<div class="opcard rsum"><div class="opcard-h"><b>유물 소환</b><span class="rsum-rate">신유물 <em>' + pct(RS.divineRate) + '</em></span></div><div class="rsum-btns">' + [5, 10, 100].map(function (n) {
        return summonBtn(n, CW.relicCost(n), 'data-relic', n === 100);
      }).join('') + '</div><dl class="rsum-f"><dt>중복 획득</dt><dd>레벨 +1 · 보유 효과 증가</dd><dt>최대 레벨 중복</dt><dd>다이아 ' + fmt(RS.refund) + '개로 전환</dd></dl></div>';
      // 오팔 (2026-11-16): 고른 유물을 전시대에, 전체는 4열 소켓. 장착 없음 — 가진 유물 모두의 레벨 효과가 합쳐진다.
      // 성장은 중복 획득뿐 (골드 강화·합성 없음). 신유물(금빛 테두리)과 삼신기는 다른 분류.
      var sorted = DATA.relics.slice().sort(function (a, b) { return (b.divine ? 1 : 0) - (a.divine ? 1 : 0); });
      if (!selRelic || !CW.relicById(selRelic)) selRelic = (sorted.filter(function (r) { return own[r.id]; })[0] || sorted[0]).id;
      var sr = CW.relicById(selRelic), slv = own[sr.id] || 0, smax = CW.relicMax(sr);
      var show = '<div class="rlstage' + (sr.divine ? ' divine' : '') + (slv ? '' : ' none') + '">' + (CW.opalUI ? CW.opalUI.stage(mi('relic', sr), { cls: 'rstage', seed: 2 }) : '<div class="rl-fig">' + mi('relic', sr) + '<i></i></div>') + '<div class="rl-info">' +
        (sr.divine ? '<em class="cb own">신유물</em>' : '') + (slv ? '' : '<em class="cb none">미보유</em>') + '<b>' + sr.name + '</b><span class="rl-lv">Lv.<span data-opv="rl:' + sr.id + '">' + slv + '</span> / ' + smax + '</span>' +
        // 효과 이름은 윗줄, 수치는 아랫줄 — 이름 길이와 상관없이 숫자가 중간에서 끊기지 않게 (2026-11-17)
        '<span class="rl-eff">' + (STAT_KO[sr.stat] || sr.stat) + '<br><span style="white-space:nowrap">' + (slv ? '+' + pct(slv * sr.per) + (slv < smax ? ' <em>→</em> +' + pct((slv + 1) * sr.per) : ' · 최대') : '레벨당 +' + pct(sr.per)) + '</span></span></div></div>';
      var grid = sorted.map(function (r) {
        var lv = own[r.id] || 0;
        return '<button class="rlsock' + (r.divine ? ' divine' : '') + (lv ? '' : ' none') + (r.id === selRelic ? ' sel' : '') + '" data-rlsel="' + r.id + '" aria-label="' + esc(r.name) + (lv ? ' Lv.' + lv : ' 미보유') + '">' + mi('relic', r) + '<b>' + (lv ? 'Lv.' + lv : '—') + '</b></button>';
      }).join('');
      return '<h3 class="opsubh">유물 수집 <b>' + have + ' / ' + DATA.relics.length + '</b></h3>' + show + pulls + '<div class="rlgrid">' + grid + '</div>';
    }
    var cosPrev = null;   // 코스튬 미리보기 (저장 안 함, 착용과 별개)
    function costumePanel() {
      var s = G.state, own = s.costume.owned, wear = s.costume.wear;
      var cards = DATA.costumes.map(function (c) {
        var lv = own[c.id] || 0, img = (CW.ICO && CW.ICO.cosArt && CW.ICO.cosArt(c.id, true)) || G.costumeThumb(c.id), on = wear === c.id, max = lv >= DATA.costumeConf.maxLv, ns = CW.costumeStars(lv), cst = '';
        for (var ci = 0; ci < DATA.costumeConf.maxLv / DATA.costumeConf.starEvery; ci++) cst += '<i class="' + (ci < ns ? 'on' : '') + '">★</i>';
        var act = !lv ? '<button class="buy gemb' + (s.gems < c.price ? ' off' : '') + '" data-cbuy="' + c.id + '"><i class="gem"></i>' + fmt(c.price) + '</button>'
          : '<div class="cbtns"><button class="btn' + (on ? ' on' : '') + '" data-cwear="' + c.id + '">' + (on ? '입는 중' : '입기') + '</button><button class="buy gemb' + (max || s.gems < CW.costumeUpCost(c, lv) ? ' off' : '') + '" data-cup="' + c.id + '">' + (max ? '최대' : '<small>강화</small><span><i class="gem"></i>' + fmt(CW.costumeUpCost(c, lv)) + '</span>') + '</button></div>';
        return '<div class="ccard' + (on ? ' on' : '') + (lv ? '' : ' none') + ((cosPrev || wear) === c.id ? ' prev' : '') + '" style="--gc:' + hc(c.grade) + '"><em class="cbadge ' + (on ? 'wear' : lv ? 'own' : 'none') + '">' + (on ? '착용 중' : lv ? '보유' : '미보유') + '</em><div class="cgrade">' + hn(c.grade) + (lv ? ' Lv.' + lv + '/' + DATA.costumeConf.maxLv : '') + '</div>' + (img ? '<button class="cprevb" data-cprev="' + c.id + '" aria-label="' + esc(c.name) + ' 미리보기"><img src="' + img + '" alt=""></button>' : '') + (on ? '<em class="cb wear mini">착용 중</em>' : '') +
          '<b>' + c.name + '</b><span class="cdesc">' + c.desc + '</span><div class="cstars">' + cst + '</div><small>' + bonusText(c.stat, CW.costumeValue(c, Math.max(1, lv))) + (lv ? '' : ' (보유 시 적용)') + '</small>' + act + '</div>';
      }).join('');
      var nOwn = DATA.costumes.filter(function (c) { return own[c.id]; }).length, CC = DATA.costumeConf;
      // 오팔 (2026-11-16): 위에 큰 캐릭터. 카드 그림을 누르면 「미리보기」만 바뀌고(cosPrev), 실제 착용(state.costume.wear)은
      // 입기 버튼이 성공했을 때만 바뀐다. 미보유는 입기 대신 구매 조건. 효과는 그대로 보유한 모든 코스튬 합.
      if (cosPrev && !CW.costumeById(cosPrev)) cosPrev = null;
      var pc = CW.costumeById(cosPrev || wear) || DATA.costumes[0], plv = own[pc.id] || 0, pon = wear === pc.id, pnew = CW.ICO && CW.ICO.cosArt && CW.ICO.cosArt(pc.id), pimg = pnew || G.costumeThumb(pc.id, 360), pmax = plv >= CC.maxLv;
      var pns = CW.costumeStars(plv), toStar = plv && !pmax ? CC.starEvery - plv % CC.starEvery : 0;
      var badge = pon ? '<em class="cb wear">✓ 착용 중</em>' : '<em class="cb ' + (plv ? 'own' : 'none') + '"><i>▶</i>미리보기</em>';   // 시안: 이름 오른쪽 진주 알약 (보유 여부는 카드 꼬리표·구매 버튼)
      var pact = !plv ? '<button class="buy gemb' + (s.gems < pc.price ? ' off' : '') + '" data-cbuy="' + pc.id + '"><small>구매</small><span><i class="gem"></i>' + fmt(pc.price) + '</span></button>'
        : '<button class="btn' + (pon ? ' on' : '') + '" data-cwear="' + pc.id + '">' + (pon ? '착용 중' : '입기') + '</button><button class="buy gemb' + (pmax || s.gems < CW.costumeUpCost(pc, plv) ? ' off' : '') + '" data-cup="' + pc.id + '">' + (pmax ? '최대' : '<small>강화</small><span><i class="gem"></i>' + fmt(CW.costumeUpCost(pc, plv)) + '</span>') + '</button>';
      // 승인 시안 오른쪽: 큰 캐릭터 성운 전시 → 이름 → 한 덩어리 효과 영역(외형·보유 효과·Lv/★/다음 별) → 입기(청록)·강화
      var STg = CW.opalUI ? CW.opalUI.stage : function (x) { return x; };
      var csStars = ''; for (var cj = 0; cj < CC.maxLv / CC.starEvery; cj++) csStars += cj < pns ? '★' : '☆';
      var stage = '<div class="cosstage" style="--gc:' + hc(pc.grade) + '">' + STg(pimg ? '<img src="' + pimg + '" alt="' + esc(pc.name) + '"' + (pnew ? ' class="cosart" style="--fy:' + (-CW.ICO.cosFeetShift(pc.id) * 100).toFixed(2) + '%"' : '') + '>' : '', { cls: 'cstage' + (pnew ? ' cosnew' : ''), seed: 1, objAttr: ' data-opfx="cos:' + pc.id + '" data-opdur=".65"' }) +
        '<div class="cs-name' + (pc.name.length >= 9 ? ' long' : '') + '"><b>' + pc.name + '</b><small style="color:' + hc(pc.grade) + '">' + hn(pc.grade) + '</small>' + badge + '</div>' +
        '<div class="cs-eff2"><p><i>✦</i><span>외형</span><em>입으면 모습이 바뀌어요</em></p><p><i>✦</i><span>보유 효과</span><em><b>' + bonusText(pc.stat, CW.costumeValue(pc, Math.max(1, plv))) + '</b><span class="cs-suf">' + (plv ? '· 안 입어도 적용' : '· 보유하면 적용') + '</span></em></p>' +
        '<p class="cs-lvrow"><span>' + (plv ? 'Lv.<span data-opv="cosl">' + plv + '</span>' : '미보유') + '</span><em class="cs-st">' + csStars + '</em><em>' + (plv ? (pmax ? '최대 레벨' : '다음 별까지 <b>' + toStar + '레벨</b>') : '') + '</em></p></div>' +
        '<div class="cs-act' + (plv ? '' : ' one') + '">' + pact + '</div></div>';   // one: 버튼 하나(구매)뿐 — ui-opal.js 설명
      // 승인 시안 순서: 전시 → 이름 → 효과 → 입기·강화 → 의상 목록 (수집 효과는 목록 아래)
      return '<h3 class="ophide">코스튬</h3>' + stage + '<div class="cgrid">' + cards + '</div>' +
        // 수집 카드 (2026-11-17, 사용자: 코스튬 수집 부분 이쁘게): 제목·개수 → 진행 막대 → 지금 효과 | 다음 하나 더
        (function () {
          var nAll = DATA.costumes.length, done = nOwn >= nAll;
          return '<div class="opcard ccol"><div class="opcard-h"><b>코스튬 수집</b><span class="ccol-n"><b>' + nOwn + '</b> / ' + nAll + '</span></div>' +
            '<i class="ccol-bar"><em style="width:' + (100 * nOwn / nAll).toFixed(1) + '%"></em></i>' +
            '<div class="ccol-cells"><p><small>지금 효과</small><b>모든 피해 +' + pct(Math.max(0, nOwn - 1) * CC.collect) + '</b></p>' +
            '<p class="' + (done ? 'max' : 'nx') + '"><small>' + (done ? '모두 모음' : '하나 더 모으면') + '</small><b>' + (done ? '최대' : '모든 피해 +' + pct(nOwn * CC.collect)) + '</b></p></div>' +
            '<p class="opcard-f">두 번째 코스튬부터 하나 모을 때마다 모든 피해 +' + pct(CC.collect) + '</p></div>';
        })();
    }
    var selDivine = null;   // 삼신기 설명·강화 대상 (보기만)
    function divinePanel() {
      var s = G.state, open = CW.divineOpen(s), D = s.divine, C = DATA.divineConf;
      // 오팔 (2026-11-16): 조각 잔액은 별 올리기 버튼에 (보유/필요), 여기엔 얻는 곳만. 골드=레벨, 조각=별 두 길을 나눠 보임
      var head = '<div class="shards"><span>레벨 <i class="coin"></i> 골드 · 별 ✦ 신기 조각</span><small class="note">' + (open ? '획득 · 일반 보스 ' + C.shardBoss + '개 / 지역 보스 ' + C.shardRegion + '개' : C.unlockTier + '차 전직 후 해금') + '</small></div>';
      // 오팔 (2026-11-16): 세 신기를 전시대에 나란히 (셋 다 늘 효과가 있음), 고른 것 하나만 아래에서 설명·강화.
      // 고르기는 보기만 바꾼다 — 장착·효과 끄기 없음. 레벨(골드)과 별(조각) 두 길을 각각 지금→다음으로.
      if (!selDivine || !DATA.divine.some(function (x) { return x.id === selDivine; })) selDivine = DATA.divine[0].id;
      // 오팔 2판 (2026-11-17, 사용자 삼신기 부품·시안): 성운 창 + 받침대 위 세 신기 + 이름 알약·Lv·별 → 상세 상자(그림 칸·이름·효과 알약)
      // → 레벨업(골드)·별 강화(신기 조각) 두 패널. 모양은 js/opal-divine.js, 그림은 tools/import-divine-parts.py.
      if (CW.opalDivine) {
        var dvv = '<div class="dvw"><div class="dvv"><i class="dvv-halo"></i><i class="dvv-neb"></i><i class="dvv-rim"></i>' + DATA.divine.map(function (it, k) {
          var d = D[it.id] || { lv: 0, star: 0 };
          return '<button class="dvs dvs' + k + (it.id === selDivine ? ' sel' : '') + (d.lv && open ? '' : ' sleep') + '" data-dvsel="' + it.id + '" aria-label="' + it.name + '">' +
            '<i class="dvs-ped"></i><i class="dvs-sp"></i><span class="dvs-fig dv-' + it.id + '"></span><b class="dvs-name">' + it.name + '</b>' +
            '<small class="dvs-lv">Lv.' + d.lv + '</small><span class="dvs-st"><i></i>' + d.star + ' / ' + C.starMax + '</span></button>';
        }).join('') + '</div></div>';
        var dvd = DATA.divine.filter(function (it) { return it.id === selDivine; }).map(function (it) {
          var d = D[it.id] || { lv: 0, star: 0 }, cost = CW.divineUpCost(d.lv, s), sc = CW.starCost(d.star);
          var val = d.lv ? it.per * d.lv * (1 + C.starBonus * d.star) : 0;
          var lvMax = d.lv >= C.maxLv, stMax = d.star >= C.starMax;
          var lvOff = !open || s.gold < cost || lvMax, stOff = !open || !d.lv || D.shards < sc || stMax;
          var nextLv = it.per * (d.lv + 1) * (1 + C.starBonus * d.star), nextSt = it.per * d.lv * (1 + C.starBonus * (d.star + 1));
          return '<div class="dvd' + (open ? '' : ' none') + '" data-opfx="dvs:' + it.id + '" data-opdur=".7">' +
            '<span class="dvd-pic' + (d.lv && open ? '' : ' sleep') + '" data-opfx="dv:' + it.id + '" data-opdur=".3"><span class="dvs-fig dv-' + it.id + '"></span></span><i class="dvd-bar"></i>' +
            '<b class="dvd-name">' + it.name + ' <small data-opv="dv:' + it.id + '">Lv.' + d.lv + '</small></b>' +
            '<p class="dvd-eff"><i></i>' + (d.lv ? bonusText(it.stat, val) : (STAT_KO[it.stat] || it.stat) + ' 증가') + '</p>' +
            '<div class="dvd-low">' +
              '<div class="dvp"><button class="dvp-btn pri' + (lvOff ? ' off' : '') + '" data-dlv="' + it.id + '"><i></i>' + (lvMax ? '최대 레벨' : d.lv ? '레벨업' : '깨우기') + '<i></i></button>' +
                '<small class="dvp-cap">' + (open ? '골드로 레벨 성장' : C.unlockTier + '차 전직 후 해금') + '</small>' +
                '<span class="dvp-line">' + (lvMax ? 'Lv.' + d.lv + ' <b>+' + pct(val) + '</b>' : 'Lv.' + d.lv + '<em>→</em>Lv.' + (d.lv + 1) + ' <b>+' + pct(nextLv) + '</b>') + '</span>' +
                '<span class="dvp-cost' + (open && !lvMax && s.gold < cost ? ' lack' : '') + '"><i class="coin2"></i>' + (lvMax ? '<b class="gn">최대</b>' : gh(cost)) + '</span></div>' +
              '<div class="dvp"><button class="dvp-btn sec' + (stOff ? ' off' : '') + '" data-dstar="' + it.id + '"><i></i>' + (stMax ? '최대 별' : '별 강화') + '<i></i></button>' +
                '<small class="dvp-cap">' + (open ? '신기 조각으로 별 성장' : C.unlockTier + '차 전직 후 해금') + '</small>' +
                '<span class="dvp-line">' + (stMax ? '<i class="st"></i>' + d.star + ' <b>+' + pct(val) + '</b>' : '<i class="st"></i>' + d.star + '<em>→</em><i class="st"></i>' + (d.star + 1) + (d.lv ? ' <b>+' + pct(nextSt) + '</b>' : '')) + '</span>' +
                '<span class="dvp-cost' + (open && !stMax && D.shards < sc ? ' lack' : '') + '"><i class="gem2"></i><b class="gn">' + (stMax ? '최대' : fmt(sc)) + '</b><small>보유 ' + fmt(D.shards) + '</small></span></div>' +
            '</div></div>';
        }).join('');
        return '<h3 class="ophide">별의 삼신기</h3>' + dvv + dvd +
          '<p class="dvnote">신기 조각 · 일반 보스 ' + C.shardBoss + '개 / 지역 보스 ' + C.shardRegion + '개</p>';
      }
      var stands = '<div class="dvstands"><i class="ns-neb"></i>' + (CW.opalUI ? CW.opalUI.starSvg(2) : '') + DATA.divine.map(function (it) {
        var d = D[it.id] || { lv: 0, star: 0 };
        return '<button class="dvstand' + (it.id === selDivine ? ' sel' : '') + (d.lv ? '' : ' sleep') + '" data-dvsel="' + it.id + '"><span class="dv-fig">' + mi('divine', it) + '<i></i></span><b>' + it.name + '</b><small>Lv.' + d.lv + ' · ★' + d.star + '</small></button>';
      }).join('') + '</div>';
      var cards = DATA.divine.filter(function (it) { return it.id === selDivine; }).map(function (it) {
        var d = D[it.id] || { lv: 0, star: 0 }, cost = CW.divineUpCost(d.lv, s), sc = CW.starCost(d.star);
        // 오팔 (2026-11-16): 별 20개를 늘어놓지 않고 「★ 현재 / 상한」 + 막대
        var stars = '<b>★ ' + d.star + ' / ' + C.starMax + '</b><i><em style="width:' + Math.round(100 * d.star / C.starMax) + '%"></em></i>';
        var val = d.lv ? it.per * d.lv * (1 + C.starBonus * d.star) : 0;
        return '<div class="dcard' + (open ? '' : ' none') + '" data-opfx="dvs:' + it.id + '" data-opdur=".7"><div class="dstars opstars">' + stars + '</div><div class="dicon" data-opfx="dv:' + it.id + '" data-opdur=".3">' + mi('divine', it) + '</div><div class="dname">' + it.name + ' <span class="lv" data-opv="dv:' + it.id + '">Lv.' + d.lv + '</span></div><div class="note">' + it.kind + ' · ' + it.desc + '</div>' +
          '<div class="deff">' + (d.lv ? bonusText(it.stat, val) : STAT_KO[it.stat] + ' (레벨당 +' + pct(it.per) + ', 별마다 +' + pct(C.starBonus) + ')') + '</div>' +
          '<div class="dvpaths"><p><em><i class="coin"></i>레벨</em>' + (d.lv >= C.maxLv ? '최대 레벨' : '+' + pct(val) + ' → <b>+' + pct(it.per * (d.lv + 1) * (1 + C.starBonus * d.star)) + '</b>') + '</p>' +
          '<p><em>✦ 별</em>' + (d.star >= C.starMax ? '최대 별' : !d.lv ? '먼저 깨우기' : '+' + pct(val) + ' → <b>+' + pct(it.per * d.lv * (1 + C.starBonus * (d.star + 1))) + '</b>') + '</p></div>' +
          '<div class="btns"><button class="buy' + (!open || s.gold < cost || d.lv >= C.maxLv ? ' off' : '') + '" data-dlv="' + it.id + '">' + (d.lv ? '레벨업' : '깨우기') + ' <i class="coin"></i>' + gh(cost) + '</button>' +
          '<button class="btn' + (!open || !d.lv || D.shards < sc || d.star >= C.starMax ? ' off' : '') + '" data-dstar="' + it.id + '">별 올리기 <small>✦ ' + fmt(D.shards) + ' / ' + sc + '</small></button></div></div>';
      }).join('');
      return '<h3 class="ophide">별의 삼신기</h3>' + stands + '<div class="dlist">' + cards + '</div>' + head;
    }
    // ---------- the selected 신성력/룬 next to what is worn (2026-11-15, user: show what I wear at once when I tap one) ----------
    // A change line: a stat's total now and after, with the difference in green (more) or red (less).
    // 오팔 2판 (2026-11-17, 룬·신성력 시안의 비교 상자): 「현재 → 장착 후」 두 칸, 바뀐 값은 초록(늘어남)·빨강(줄어듦), 오른쪽 차이
    function cmpLine(name, from, to, fmtv, after) {
      var d = to - from, f = fmtv || function (v) { return '+' + pct(v); }, ud = d > 1e-12 ? 'up' : d < -1e-12 ? 'down' : '';
      return '<div class="cl2"><span class="cn">' + name + '</span><div class="cv a"><small>현재</small><b>' + f(from) + '</b></div><i class="rar"></i><div class="cv b"><small>' + (after || '장착 후') + '</small><b class="' + ud + '">' + f(to) + '</b></div><em class="' + ud + '">' + (Math.abs(d) < 1e-12 ? '같음' : (d > 0 ? '▲' : '▼') + pct(Math.abs(d)).replace(/^\+/, '')) + '</em></div>';
    }
    // the worn one it is compared with: its picture, name, and what it gives now
    function cmpRow(label, ico, color, name, sub) {
      return '<div class="cmprow"><span class="cmpic">' + ico + '</span><div class="cmpt"><small>' + label + '</small><b style="color:' + color + '">' + name + '</b><span>' + sub + '</span></div></div>';
    }
    // worn (2026-11-15, the user: 장착 효과 … 중 이 룬이 … 는 무슨 말인지 모르겠다): what this one gives, big; then how much of
    // all the worn ones' total for the same effect comes from it, as a bar
    function wornBox(what, nm, v, tot) {
      var share = tot > 0 ? Math.max(0, Math.min(1, v / tot)) : 1, sp = Math.round(share * 100);
      var c0 = nm.charCodeAt(nm.length - 1) - 0xAC00, eul = nm + (c0 >= 0 && c0 < 11172 && c0 % 28 ? '을' : '를');
      var wc = what.charCodeAt(what.length - 1) - 0xAC00, wye = what + (wc >= 0 && wc < 11172 && wc % 28 ? '이에요' : '예요');
      var foot = share >= 0.999 ? '<p class="wsolo">' + nm + ' 효과를 제공하는 유일한 장착 ' + wye + '.</p>'
        : '<div class="wshare"><p><span>장착 ' + what + ' 합산</span><b>' + nm + ' +' + pct(tot) + '</b></p><div class="wbar"><i style="width:' + Math.max(3, sp) + '%"></i></div><small>이 ' + what + '의 기여도 <b>' + sp + '%</b></small></div>';
      return '<div class="cmp worn"><div class="wtop"><span class="wbadge">✓ 장착 중</span><span class="wlab">이 ' + what + '의 효과</span></div>' +
        '<p class="wbig"><span>' + nm + '</span><b>+' + pct(v) + '</b></p>' + foot + '</div>';
    }
    function sigilCmp(s, sel, sum) {
      var c = CW.sigilCompare(s, sel.id), stat = sel.stat, nm = STAT_KO[stat] || stat, v = CW.sigilValue(sel), tot = sum[stat] || 0;
      if (!c) return '';
      if (c.mode === 'worn') return wornBox('신성력', nm, v, tot);
      if (c.mode === 'free') return '<div class="cmp"><p class="cmphead">빈 슬롯에 장착하면 효과가 추가돼요.</p>' + cmpLine(nm, tot, tot + v) + '</div>';
      var t = c.target, tv = CW.sigilValue(t), tn = STAT_KO[t.stat] || t.stat, fullHead = cmpFullHead(sigilWorse(sel, c), c.mode === 'same');
      var row = cmpRow(c.mode === 'same' ? '지금 낀 같은 종류' : '지금 낀 것 · 가장 약한 것', CW.ICO.sigil(t.stat, t.grade, hc(t.grade), t.q), hc(t.grade), hn(t.grade) + ' ' + tn, CW.qualityName(t.q) + ' (' + Math.round(t.q * 100) + '%) · ' + tn + ' +' + pct(tv));
      if (!c.full && c.mode !== 'same') return '<div class="cmp">' + row + '<p class="cmphead">기존 신성력을 교체하지 않고 빈 슬롯에 추가돼요.</p>' + cmpLine(nm, tot, tot + v) + '</div>';
      if (c.mode === 'same') return '<div class="cmp">' + row + fullHead + cmpLine(nm, tot, tot - tv + v, 0, '교체 후') + '</div>';
      return '<div class="cmp">' + row + fullHead + cmpLine(nm, tot, tot + v, 0, '교체 후') + cmpLine(tn, sum[t.stat] || 0, (sum[t.stat] || 0) - tv, 0, '교체 후') + '</div>';
    }
    // the resonance after a change to the worn runes (worked out on the real bag, then put back)
    function runeResAfter(s, slot, id) { var b = CW.runeBag(s), old = b.eq[slot]; b.eq[slot] = id; var r = CW.runeResonance(s); b.eq[slot] = old; return r; }
    function runeCmp(s, it) {
      var c = CW.runeCompare(s, it.id), b = CW.runeBag(s), RC = DATA.runeConf, k = CW.runeById(it.kind), nm = STAT_KO[k.stat] || k.stat, v = CW.runeValue(it), res = CW.runeResonance(s), sum = {};
      if (!c) return '';
      CW.runeEquipped(s).forEach(function (x) { var kk = CW.runeById(x.kind); sum[kk.stat] = (sum[kk.stat] || 0) + CW.runeValue(x); });
      var tot = sum[k.stat] || 0, resLine = function (r2) { return r2 === res ? '' : cmpLine('룬 공명 (모든 피해)', res * RC.resFinal, r2 * RC.resFinal, function (x) { return Math.round(x / RC.resFinal) + '단계'; }, '변경 후'); };
      if (c.mode === 'worn') return wornBox('룬', nm, v, tot);
      if (c.mode === 'free') return '<div class="cmp"><p class="cmphead">빈 슬롯에 장착하면 효과가 추가돼요.</p>' + cmpLine(nm, tot, tot + v) + resLine(runeResAfter(s, b.eq.indexOf(null), it.id)) + '</div>';
      var t = c.target, tk = CW.runeById(t.kind), tv = CW.runeValue(t), tn = STAT_KO[tk.stat] || tk.stat, slot = b.eq.indexOf(t.id), fullHead = cmpFullHead(runeWorse(s, it, c), c.mode === 'same');
      var row = cmpRow(c.mode === 'same' ? '지금 낀 같은 종류' : '지금 낀 것 · 가장 약한 것', CW.ICO.rune(t.kind, tk.color, t.grade, hc(t.grade)), hc(t.grade), hn(t.grade) + ' ' + tk.name + ' Lv.' + t.lv, tn + ' +' + pct(tv));
      if (!c.full && c.mode !== 'same') return '<div class="cmp">' + row + '<p class="cmphead">기존 룬을 교체하지 않고 빈 슬롯에 추가돼요.</p>' + cmpLine(nm, tot, tot + v) + resLine(runeResAfter(s, b.eq.indexOf(null), it.id)) + '</div>';
      var lines = c.mode === 'same' ? cmpLine(nm, tot, tot - tv + v, 0, '교체 후') : cmpLine(nm, tot, tot + v, 0, '교체 후') + cmpLine(tn, sum[tk.stat] || 0, (sum[tk.stat] || 0) - tv, 0, '교체 후');
      return '<div class="cmp">' + row + fullHead + lines + resLine(runeResAfter(s, slot, it.id)) + '</div>';
    }
    function sigilMini(s, sel, sum) {
      var c = CW.sigilCompare(s, sel.id), nm = STAT_KO[sel.stat] || sel.stat, v = CW.sigilValue(sel), tot = sum[sel.stat] || 0;
      if (!c || c.mode === 'worn') return '';
      if (c.mode === 'free' || (!c.full && c.mode !== 'same')) return '<div class="cmp mini">' + cmpLine(nm, tot, tot + v) + '</div>';
      var tg = c.target, tv = CW.sigilValue(tg), tn = STAT_KO[tg.stat] || tg.stat;
      if (c.mode === 'same') return '<div class="cmp mini">' + cmpLine(nm, tot, tot - tv + v, 0, '교체 후') + '</div>';
      return '<div class="cmp mini">' + cmpLine(nm, tot, tot + v, 0, '교체 후') + cmpLine(tn, sum[tg.stat] || 0, (sum[tg.stat] || 0) - tv, 0, '교체 후') + '</div>';
    }
    function runeMini(s, it) {
      var c = CW.runeCompare(s, it.id), b = CW.runeBag(s), RC = DATA.runeConf, k = CW.runeById(it.kind), nm = STAT_KO[k.stat] || k.stat, v = CW.runeValue(it), res = CW.runeResonance(s), sum = {};
      if (!c || c.mode === 'worn') return '';
      CW.runeEquipped(s).forEach(function (x) { var kk = CW.runeById(x.kind); sum[kk.stat] = (sum[kk.stat] || 0) + CW.runeValue(x); });
      var tot = sum[k.stat] || 0, resLine = function (r2) { return r2 === res ? '' : cmpLine('룬 공명', res * RC.resFinal, r2 * RC.resFinal, function (x) { return Math.round(x / RC.resFinal) + '단계'; }, '변경 후'); };
      if (c.mode === 'free' || (!c.full && c.mode !== 'same')) return '<div class="cmp mini">' + cmpLine(nm, tot, tot + v) + resLine(runeResAfter(s, b.eq.indexOf(null), it.id)) + '</div>';
      var tg = c.target, tk = CW.runeById(tg.kind), tv = CW.runeValue(tg), tn = STAT_KO[tk.stat] || tk.stat, slot = b.eq.indexOf(tg.id);
      var lines = c.mode === 'same' ? cmpLine(nm, tot, tot - tv + v, 0, '교체 후') : cmpLine(nm, tot, tot + v, 0, '교체 후') + cmpLine(tn, sum[tk.stat] || 0, (sum[tk.stat] || 0) - tv, 0, '교체 후');
      return '<div class="cmp mini">' + lines + resLine(runeResAfter(s, slot, it.id)) + '</div>';
    }
    // a swap that makes things worse (2026-11-15, user: show it at once, in red): same effect = a smaller value; another
    // effect = weaker by grade and quality (as 추천 장착 judges); a rune also when the resonance would go down
    function sigilWorse(sel, c) { if (!c || !(c.full || c.mode === 'same') || !c.target) return false; return c.mode === 'same' ? CW.sigilValue(sel) < CW.sigilValue(c.target) : CW.sigilPower(sel) < CW.sigilPower(c.target); }
    function runeWorse(s, it, c) {
      if (!c || !(c.full || c.mode === 'same') || !c.target) return false;
      var slot = CW.runeBag(s).eq.indexOf(c.target.id); if (runeResAfter(s, slot, it.id) < CW.runeResonance(s)) return true;
      return c.mode === 'same' ? CW.runeValue(it) < CW.runeValue(c.target) : CW.runePower(it) < CW.runePower(c.target);
    }
    function cmpFullHead(worse, same) { return worse ? '<p class="cmphead bad">교체 시 효과 감소 ▼</p>' : '<p class="cmphead">' + (same ? '같은 종류는 하나만 · 교체 후 효과' : '슬롯이 가득 찼어요 · 교체 후 효과') + '</p>'; }
    // the top-right ✕ of the bottom box
    function dockX(kind) { return '<button class="dockx" data-dockx="' + kind + '" aria-label="닫기">✕</button>'; }

    // ---------- runes (2026-11-14): seven worn runes in the ring, the bag below; pick one to level, promote, wear, lock, fuse ----------
    // 오팔 2판 (사용자 룬·신성력 부품·시안, 2026-11-17): 그림 = 종류마다 하나(rn2-/sg2-), 등급 = 따로 얹는 등급 테두리(gf-).
    // 목록 칸 = 부품 목록 칸(slot-normal / 고르면 slot-selected + 체크), 안에 유리 구슬 + 그림, 아래 Lv(룬)·품질 %(신성력).
    // decoding="sync" (2026-11-18): 무대 보석·룬은 계속 움직이는 층 안이라 크롬이 그림 풀기를 뒤로 미뤄 빈 소켓이 잠깐 보였음(신성력 17칸 장착 때 잘 보임)
    // → 240px 작은 그림이라 그리는 프레임에 바로 풀게 함. crossorigin: 신성력 보석 위 반짝임이 같은 그림을 마스크(CORS 방식)로도 받아서,
    // <img>(일반 방식)와 브라우저 메모리 칸을 서로 밀어내 가끔 보석·목록 그림 전부가 늦게 나왔음 → <img>도 CORS 방식으로 맞춤 (art-items.js framed 도 같이)
    function runeArt(kind, cls) {
      var u = CW.ICO.runeSrc && CW.ICO.runeSrc(kind), k = CW.runeById(kind);
      return u ? '<img class="' + cls + '" src="' + u + '" alt="" decoding="sync" crossorigin="anonymous" draggable="false">' : '<span class="' + cls + '">' + CW.ICO.rune(kind, k.color, 0, '#9aa0b8') + '</span>';
    }
    function sigilArt(stat, grade, cls) {
      var u = CW.ICO.sigilSrc && CW.ICO.sigilSrc(stat);
      return u ? '<img class="' + cls + '" src="' + u + '" alt="" decoding="sync" crossorigin="anonymous" draggable="false">' : '<span class="' + cls + '">' + CW.ICO.sigil(stat, grade, hc(grade)) + '</span>';
    }
    function gfImg(grade, cls) { return '<img class="' + cls + '" src="' + CW.ICO.gradeFrameSrc(grade) + '" alt="" decoding="sync" crossorigin="anonymous" draggable="false">'; }
    function rsCell(attr, id, grade, on, worn, lock, art, foot, label) {
      return '<button class="rsc' + (on ? ' sel' : '') + (worn ? ' eq' : '') + '" ' + attr + '="' + id + '" data-opfx="rc:' + id + '" data-opdur=".6" style="--gc:' + hc(grade) + '" aria-label="' + label + (worn ? ' 장착 중' : '') + (lock ? ' 잠금' : '') + '">' +
        '<i class="rsc-orb">' + gfImg(grade, 'rsc-gf') + art + '</i><span class="rsc-g">' + hn(grade) + '</span>' + (lock ? '<i class="rsc-lk"></i>' : '') +
        '<span class="rsc-lv">' + (worn ? '<em>장착</em>' : '') + foot + '</span></button>';
    }
    function runeCell(s, it, curId) {
      var k = CW.runeById(it.kind);
      return rsCell('data-rpick', it.id, it.grade, (curId !== undefined ? curId : selRune) === it.id, CW.runeIsWorn(s, it.id), it.lock, '<i class="rsc-dome"></i>' + runeArt(it.kind, 'rsc-art') + '<i class="rsc-glint"></i>', 'Lv.' + it.lv, hn(it.grade) + ' ' + k.name + ' Lv.' + it.lv);
    }
    // 룬 무대: 성운 창(부품 창 마스크·테두리·룬 성운) + 받침대 + 유리 돔 7개 + 가운데 공명 발바닥과 빛줄기 + 「공명 N단계」 알약.
    // 자리는 시안(08-rune source: 패널 465px = 화면 391px, ×0.841) 실측, 무대 .ruv 기준 px (폭 359). 슬롯 순서는 위에서 시계 방향.
    // (Lv 알약 가운데 = 자리 + 21: 시안 알약 실측 무대 y 61.5 / 79 / 137 / 195.5, 발바닥 가운데 y 122.5)
    var RU_POS = [[180, 40.5], [259, 58], [296.75, 116], [256.75, 174.5], [103.25, 174.5], [63.25, 116], [101, 58]], RU_C = [180, 122.5];
    // 성운 안 반짝이는 별 (돔·발바닥·보석을 피한 자리, 무대 px) — 움직임
    var RU_TW = [[16, 56], [343, 58], [132, 8], [228, 8], [14, 172], [345, 170], [128, 126], [232, 126]], SG_TW = [[16, 30], [343, 30], [52, 92], [308, 92], [26, 138], [334, 138], [112, 6], [248, 6]];
    function twinkles(list) { return list.map(function (q, i) { return '<i class="rtw" style="left:' + q[0] + 'px;top:' + q[1] + 'px;--i:' + i + '"></i>'; }).join(''); }
    function runePos(i, n) { if (n === RU_POS.length) return RU_POS[i]; var a = i * 2 * Math.PI / n - Math.PI / 2; return [180 + Math.cos(a) * 118, 110 + Math.sin(a) * 66]; }
    // 각성 슬롯 (2026-11-16): two slots for the 오메가·이터널·제네시스 runes / sigils, their own summon, and 각성 제작 from
    // 각성 파편 (taking apart 불멸+ runes and sigils). Shown only once 오메가 is open (체험판 never: no 10th job).
    function awakenBox(kind) {
      var s = G.state; if (!CW.critTierOpen(s, 7)) return '';
      var A = DATA.awakenConf, rune = kind === 'rune', sh = s.awakenShard || 0;
      var ids = rune ? CW.runeBag(s).aw : (s.sigil.aw || []);
      var cells = ids.map(function (id) {
        var it = id && (rune ? CW.runeItem(s, id) : CW.sigilById(s, id));
        return it ? (rune ? runeCell(s, it) : sgCell(it, true)) : '<div class="rsc empty' + (rune ? '' : ' sg') + '"><i class="rsc-orb"></i><span class="rsc-lv">빈 슬롯</span></div>';
      }).join('');
      var kinds = rune ? DATA.runes.filter(function (k) { return k.awaken && CW.runeKindOpen(s, k.id); }).map(function (k) { return [k.id, k.name, k.color]; })
        : CW.sigilPool(s, true).map(function (d) { return [d.stat, STAT_KO[d.stat] || d.stat, '']; });
      var craft = kinds.map(function (k) { return '<button class="btn' + (sh < A.craftCost ? ' off' : '') + '" ' + (rune ? 'data-rcraft' : 'data-sgcraft') + '="' + k[0] + '"' + (k[2] ? ' style="color:' + k[2] + '"' : '') + '>' + k[1] + '</button>'; }).join('');
      var sumAttr = rune ? 'data-rasum' : 'data-sgasum', cost = rune ? DATA.runeConf.summon : DATA.sigilConf.summon;
      // 각성 카드 (2026-11-17, 사용자: 각성 파편 부분 보기좋게): 슬롯 → 각성 소환 2칸 → 파편 상자(보유·제작 값) → 제작 버튼 칸 → 안내
      var full = sh >= A.craftCost;
      return '<div class="opcard awcard"><div class="opcard-h"><b>각성 슬롯</b><span class="aw-tag">오메가 이상 ' + (rune ? '룬' : '신성력') + ' 전용</span></div><div class="rsgrid aw">' + cells + '</div>' +
        '<p class="aw-sub">각성 소환</p><div class="rsum-btns n2">' + [5, 10].map(function (m) { return summonBtn(m, cost[m], sumAttr, m === 10); }).join('') + '</div>' +
        '<p class="aw-sub">각성 제작</p><div class="aw-shard"><span class="aw-have"><small><i>✧</i>보유 각성 파편</small><b class="' + (full ? '' : 'low') + '">' + fmt(sh) + '개</b></span><span class="aw-cost"><small>1회 제작 · ' + hn(A.craftGrade) + ' 등급</small><b>' + fmt(A.craftCost) + '개</b></span></div>' +
        '<div class="aw-craft">' + craft + '</div>' +
        '<p class="opcard-f">' + hn(A.from) + ' 등급 이상 룬·신성력을 분해하면 각성 파편을 얻어요<br>각성 슬롯은 기존 슬롯과 따로 쓰여요</p></div>';
    }
    var runeResSeen = null, rnBag = false;   // rnBag: 룬 보관함 보기 (본문의 「보관함」 ↔ 「‹ 룬」, 사용자 2026-11-17 「보관함도 만들고」)
    // 고른 룬 상세 머리 (시안: 왼쪽 선택 칸 안 유리 돔 + 룬 + Lv 알약 (+ 공명 기준 리본), 오른쪽 이름·실제 효과) — 본문·보관함 아래 칸이 같이 씀
    function runeHead(s, it, minLv, extra) {
      var RC = DATA.runeConf, k = CW.runeById(it.kind), cap = CW.runeCap(it), worn = CW.runeIsWorn(s, it.id), isB = worn && it.lv === minLv;
      return '<div class="rdh"><div class="rdpic" style="--gc:' + hc(it.grade) + '" data-opfx="ru:' + it.id + '" data-opdur=".45"><i class="run-dome" data-opfx="rg:' + it.id + '" data-opdur="1">' + gfImg(it.grade, 'rd-gf') + runeArt(it.kind, 'run-art') + '<i class="run-glint"></i></i><b class="run-lv">Lv.' + it.lv + '</b>' + (isB ? '<em class="run-anc">공명 기준</em>' : '') + '</div>' +
        '<div class="rdinfo"><b class="rdn"><span style="color:' + hc(it.grade) + '">' + hn(it.grade) + '</span> ' + k.name + '</b><span class="rdlv">Lv.<span data-opv="rdl:' + it.id + '">' + it.lv + '</span> / ' + cap + '</span>' +
        '<p><i class="rsp"></i><span>' + bonusText(k.stat, CW.runeValue(it)) + (worn ? '' : ' <small>장착 시 적용</small>') + '</span></p><p><i class="rsp"></i><span>등급 보너스 +' + pct(it.grade * RC.gradeStep) + '</span></p>' + (extra || '') + '</div></div>';
    }
    // 강화 (최대 레벨이면 승급) · 장착/해제/교체 · 잠금 버튼
    function runeUpBtn(s, it, open) {
      var cap = CW.runeCap(it), cost = CW.runeCost(it.lv), top = it.grade >= DATA.hiGrades.length - 1, full = it.lv >= cap, gcost = CW.runeGradeCost(it.grade);
      // 2026-11-17 사용자: 승급·강화 글자를 칸에 딱 맞게 → 위 「이름」 / 아래 「룬석 값」 두 줄 가운데 (.two)
      return full && !top ? '<button class="buy gemb rdup two' + (!open || (s.runeStone || 0) < gcost ? ' off' : '') + '" data-rgrade="' + it.id + '"><span class="t">' + hn(it.grade + 1) + ' 승급</span><span class="c">' + CW.ICO.cur('rune') + fmt(gcost) + '</span></button>'
        : '<button class="buy rdup two' + (!open || full || (s.runeStone || 0) < cost ? ' off' : '') + '" data-rune="' + it.id + '">' + (full ? '<span class="t">최대 레벨</span>' : '<span class="t">강화</span><span class="c">' + CW.ICO.cur('rune') + fmt(cost) + '</span>') + '</button>';
    }
    function runeEqBtn(s, it) {
      // 한 종류에 하나: that kind already worn → 교체 with it, even with an empty slot (js/runes.js sameWorn)
      var worn = CW.runeIsWorn(s, it.id), rc = CW.runeCompare(s, it.id), swapTo = !worn && rc && (rc.full || rc.mode === 'same') && rc.target;
      return swapTo ? (runeWorse(s, it, rc) ? '<button class="btn warn" data-rswap="' + rc.target.id + '|' + it.id + '">교체<small>떨어져요</small></button>' : '<button class="btn pri" data-rswap="' + rc.target.id + '|' + it.id + '">교체</button>')
        : '<button class="btn' + (worn ? ' on' : '') + '" data-reqp="' + it.id + '">' + (worn ? '해제' : '장착') + '</button>';
    }
    function runeLockBtn(it, short) { return '<button class="btn rdlock' + (it.lock ? ' on' : '') + '" data-rlock="' + it.id + '" aria-pressed="' + !!it.lock + '"><i class="rlk"></i>' + (it.lock ? (short ? '잠김' : '잠금 풀기') : '잠금') + '</button>'; }   // short: 본문 버튼 줄 (좁은 폰)
    // ---------- 착용 중 · 종류별 목록 (2026-11-18, 형: 뭘 끼고 있는지 한꺼번에 · 찾기 쉽게 → GPT 시안 art-src/ai-review/2026-11-18-rs-list) ----------
    // kind 'sg' = 신성력, 'rn' = 룬. 부품 그림 art/rs-*.webp (tools/cut-rs-list.py)
    var rsWornAll = { sg: false, rn: false }, rsKind = { sg: 'all', rn: 'all' }, rsAsc = false, rsMore = { sg: 8, rn: 8 };
    // 짧은 이름 (「테라 크리티컬 확률」 → 「테라 확률」): 목록 칸·버튼이 한 줄에 들도록. 상세 칸은 긴 이름 그대로
    function rsShort(stat) { var n = STAT_KO[stat] || stat; return /^\S+ 크리티컬 /.test(n) ? n.replace(' 크리티컬 ', ' ') : n; }
    function rsName(kind, it) { return kind === 'rn' ? CW.runeById(it.kind).name : rsShort(it.stat); }
    function rsIcon(kind, it, cls) { return kind === 'rn' ? '<i class="' + cls + ' rn"><i class="rw-dome"></i>' + runeArt(it.kind, 'rw-art') + '</i>' : '<i class="' + cls + ' sg">' + sigilArt(it.stat, it.grade, 'rw-art') + '</i>'; }
    // 착용 중 카드: 무대 바로 아래, 기본 4개 2열, 「착용 N개 전체 보기」로 일반·각성을 나눠 펼침. 줄을 누르면 그것이 골라짐
    function wornCard(kind, s, curId) {
      var rune = kind === 'rn', awOpen = CW.critTierOpen(s, 7), norm, aw, nMax;
      if (rune) { var rb = CW.runeBag(s); norm = CW.runeEquipped(s); aw = CW.runeAwakened(s); nMax = rb.eq.length; }
      else { norm = CW.equipped(s).map(function (id) { return CW.sigilById(s, id); }).filter(Boolean); aw = CW.sigilAwakened(s).map(function (id) { return CW.sigilById(s, id); }).filter(Boolean); nMax = CW.sigilSlots(s); }
      var row = function (it) {
        var val = '+' + pct(rune ? CW.runeValue(it) : CW.sigilValue(it)), sub = '<em style="color:' + hc(it.grade) + '">' + hn(it.grade) + '</em> · ' + (rune ? 'Lv.' + it.lv : Math.round(it.q * 100) + '%');
        return '<button class="rwr ' + kind + (it.id === curId ? ' sel' : '') + '" ' + (rune ? 'data-rpick' : 'data-sg') + '="' + it.id + '">' + rsIcon(kind, it, 'rwi') +
          '<span class="rwt"><b>' + rsName(kind, it) + '</b><small>' + sub + '</small></span><b class="rwv">' + val + '</b></button>';
      };
      var all = norm.concat(aw), open = rsWornAll[kind], tag = function (t) { return rune ? '<em class="rwtag">' + t + '</em>' : t + ' '; };
      var head = '<div class="rwh"><b><i class="rsp"></i>착용 중</b><span>' + tag('일반') + '<b>' + norm.length + '/' + nMax + '</b>' + (awOpen ? '<i>·</i>' + tag('각성') + '<b class="aw">' + aw.length + '/' + (rune ? CW.runeBag(s).aw.length : DATA.sigilConf.awakenSlots) + '</b>' : '') + '</span></div>';
      var body = !all.length ? '<p class="rwnone">아직 착용한 ' + (rune ? '룬이' : '신성력이') + ' 없어요</p>'
        : open ? '<div class="rwg">' + norm.map(row).join('') + '</div>' + (awOpen ? '<p class="rwsub">각성</p>' + (aw.length ? '<div class="rwg">' + aw.map(row).join('') + '</div>' : '<p class="rwnone">각성 칸이 비어 있어요</p>') : '')
        : '<div class="rwg">' + all.slice(0, 4).map(row).join('') + '</div>';
      var more = all.length > 4 ? '<button class="rwall" data-rwall="' + kind + '">' + (open ? '접기 <i class="rwar up"></i>' : '착용 ' + all.length + '개 전체 보기 <i class="rwar"></i>') + '</button>' : '';
      return '<div class="rwcard">' + head + body + more + '</div>';
    }
    // 종류별 목록: 종류 버튼(전체 + 가진 종류) · 강한 순/약한 순 · 4열 칸(등급·그림·이름·품질/Lv·「착용 중」/「교체만」)
    function kindCard(kind, s, curId) {
      var rune = kind === 'rn', items = rune ? CW.runeBag(s).items : s.sigil.items, keyOf = function (it) { return rune ? it.kind : it.stat; };
      var have = {}; items.forEach(function (it) { have[keyOf(it)] = 1; });
      var keys = (rune ? DATA.runes.map(function (k) { return k.id; }) : DATA.sigilStats.map(function (d) { return d.stat; })).filter(function (k) { return have[k]; });
      var f = rsKind[kind]; if (f !== 'all' && !have[f]) f = rsKind[kind] = 'all';
      // 8개까지는 시안처럼 줄 맞춤(신성력 3칸·룬 4칸), 더 많으면 두 줄로 옆으로 밀어 봄
      var few = keys.length + 1 <= 8, cols = rune ? 4 : 3;
      var chipList = ['all'].concat(keys).map(function (k) {
        var lab = k === 'all' ? '전체' : rune ? '<span class="rkci">' + runeArt(k, 'rkc-art') + '</span>' + CW.runeById(k).name.replace(' 룬', '').replace('의', '') : rsShort(k);
        return '<button class="rkc' + (f === k ? ' on' : '') + '" data-rsk="' + kind + '|' + k + '" aria-pressed="' + (f === k) + '">' + lab + '</button>';
      }), half = Math.ceil(chipList.length / 2);
      // 많을 때: 윗줄·아랫줄을 각각 왼쪽→오른쪽으로 (함께 옆으로 밀림)
      var chips = few ? '<div class="rkchips few ' + kind + '" style="--cols:' + cols + '">' + chipList.join('') + '</div>'
        : '<div class="rkchips ' + kind + '"><div class="rkrow">' + chipList.slice(0, half).join('') + '</div><div class="rkrow">' + chipList.slice(half).join('') + '</div></div>';
      // 「등급」 버튼 (형: 누르면 제일 높은 순, 다시 누르면 낮은 순): 등급 순, 같은 등급은 센 것 먼저
      var pow = rune ? CW.runePower : CW.sigilPower, list = items.filter(function (it) { return f === 'all' || keyOf(it) === f; }).sort(function (a, c) { return (rsAsc ? a.grade - c.grade : c.grade - a.grade) || pow(c) - pow(a); });
      var b = rune ? CW.runeBag(s) : s.sigil;
      var card = function (it) {
        var worn = rune ? CW.runeIsWorn(s, it.id) : CW.isEquipped(s, it.id);
        var swap = !worn && (rune ? CW.runeSameWorn(s, CW.runeIsAwaken(it) ? b.aw : b.eq, it.kind) : CW.sigilSameWorn(s, CW.sigilIsAwaken(it) ? b.aw : b.sets[b.cur], it.stat));
        return '<button class="rkcd ' + kind + (it.id === curId ? ' sel' : '') + '" ' + (rune ? 'data-rpick' : 'data-sg') + '="' + it.id + '" aria-label="' + hn(it.grade) + ' ' + rsName(kind, it) + (worn ? ' 착용 중' : swap ? ' 교체만' : '') + '">' +
          '<span class="rkg" style="color:' + hc(it.grade) + '">' + hn(it.grade) + '</span>' + rsIcon(kind, it, 'rki') + (it.lock ? '<i class="rsc-lk"></i>' : '') +
          '<b class="rkn">' + rsName(kind, it) + '</b><span class="rkq">' + (rune ? 'Lv.' + it.lv : Math.round(it.q * 100) + '%') + '</span>' +
          (worn ? '<i class="rkb on"></i>' : swap ? '<i class="rkb swap"></i>' : '<i class="rkb none"></i>') + '</button>';
      };
      var lim = rsMore[kind], shown = list.slice(0, lim).map(card).join('');
      var more = list.length > lim ? '<button class="rwall rkmore" data-rsmore="' + kind + '">더 보기 · 남은 ' + (list.length - lim) + '개 <i class="rwar"></i></button>' : '';
      return '<div class="rkcard"><div class="rwh"><b><i class="rsp"></i>종류별 목록</b><button class="rksort" data-act="rssort" aria-label="등급 ' + (rsAsc ? '낮은' : '높은') + ' 순, 누르면 바뀜">등급 순 ' + (rsAsc ? '↑' : '↓') + '</button></div>' + chips +
        (shown ? '<div class="rkgrid">' + shown + '</div>' : '<p class="rwnone">아직 보유한 ' + (rune ? '룬이' : '신성력이') + ' 없어요</p>') + more +
        '<p class="rkfoot"><i class="rsp"></i>같은 종류는 1개만 착용 · 선택하면 교체<i class="rsp"></i></p></div>';
    }
    function runePanel() {
      var s = G.state, RC = DATA.runeConf, open = CW.runeOpen(s), res = CW.runeResonance(s), bag = CW.runeBag(s), n = RC.slots;
      if (selRune && !CW.runeItem(s, selRune)) selRune = null;
      // 오팔 (2026-11-16): 공명 = 장착 룬의 최저 레벨 (빈 칸 제외, runeResonance). 최저가 같은 룬은 모두 「공명 기준」 리본
      var wornR = CW.runeEquipped(s), minLv = wornR.length ? Math.min.apply(null, wornR.map(function (x) { return x.lv; })) : null, needLv = (res + 1) * RC.resEvery;
      if (runeResSeen !== null && res > runeResSeen && CW.opalUI) CW.opalUI.fx('rres');   // 실제로 공명이 올랐을 때만
      runeResSeen = res;
      if (rnBag) return runeBagPanel(s, open, minLv);
      // 본문에 보일 룬: 고른 것, 없으면 공명 기준(가장 낮은 장착 룬) → 장착 첫 룬 → 보유 중 가장 센 룬
      var strong = bag.items.slice().sort(function (a, c) { return CW.runePower(c) - CW.runePower(a); });
      var cur = (selRune && CW.runeItem(s, selRune)) || wornR.filter(function (x) { return x.lv === minLv; })[0] || wornR[0] || strong[0] || null, curId = cur && cur.id;
      var nodes = '', rays = '', flows = '';
      bag.eq.forEach(function (id, i) {
        var it = id && CW.runeItem(s, id), p = runePos(i, n), st = 'left:' + p[0] + 'px;top:' + p[1] + 'px;--i:' + i;
        // 공명 빛줄기: 발바닥에서 돔까지 바깥으로 살짝 부푼 곡선 (왼쪽·오른쪽 대칭), 빈 칸으로 가는 줄은 흐리게
        var dx = p[0] - RU_C[0], dy = p[1] - RU_C[1], sg = dx < -1 ? -1 : dx > 1 ? 1 : 0, qx = (RU_C[0] + p[0]) / 2 + dy * 0.2 * sg, qy = (RU_C[1] + p[1]) / 2 - dx * 0.2 * sg;
        var dd = 'M' + RU_C[0] + ' ' + RU_C[1] + 'Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + p[0] + ' ' + p[1];   // 돔 가운데 = 자리
        rays += '<path' + (it ? '' : ' class="off"') + ' d="' + dd + '"/>';
        if (it) flows += '<path pathLength="100" style="--i:' + i + '" d="' + dd + '"/>';   // 발바닥 → 룬으로 흘러가는 빛 (움직임)
        if (!it) { nodes += '<div class="run empty" style="' + st + '"><i class="run-dome"><i class="run-glint"></i></i><b class="run-lv">빈 슬롯</b></div>'; return; }
        var k = CW.runeById(it.kind), isBase = it.lv === minLv;
        nodes += '<button class="run' + (it.id === curId ? ' sel' : '') + (fxRune === it.id ? ' up' : '') + (isBase ? ' base' : '') + '" data-opfx="ru:' + it.id + '" data-opdur=".45" data-rpick="' + it.id + '" style="' + st + ';--rg:' + hc(it.grade) + '" aria-label="' + hn(it.grade) + ' ' + k.name + ' Lv.' + it.lv + (isBase ? ' · 공명 기준' : '') + '">' +
          '<i class="run-dome" data-opfx="rg:' + it.id + '" data-opdur="1"><i class="run-gc"></i>' + runeArt(it.kind, 'run-art') + '<i class="run-glint"></i><i class="run-sh"></i></i><b class="run-lv">Lv.' + it.lv + '</b>' + (isBase ? '<em class="run-anc">공명 기준</em>' : '') + '</button>';
      });
      var stage = '<div class="ruw"><div class="ruv' + (res ? ' lit' : '') + '"><i class="ruv-halo"></i><i class="ruv-neb"></i><i class="ruv-rim"></i>' + twinkles(RU_TW) + '<i class="ruv-glow"></i><i class="ruv-ped"></i><i class="ruv-sp"></i>' +
        '<svg class="ruv-rays gl" viewBox="0 0 359 242" aria-hidden="true">' + rays + '</svg><svg class="ruv-rays co" viewBox="0 0 359 242" aria-hidden="true" data-opfx="rres" data-opdur=".8">' + rays + '</svg>' +
        '<svg class="ruv-rays fl" viewBox="0 0 359 242" aria-hidden="true">' + flows + '</svg><i class="ruv-wave"></i><i class="ruv-wave w2"></i>' +
        '<div class="ruv-paw" data-opfx="rres" data-opdur=".8"><i></i></div>' + nodes + '</div></div>';   // 공명 단계는 무대 아래 띠로 (2026-11-18 시안)
      // 시안: 「✦ 모든 피해 +30%」 알약, 그 아래 효과 상자 「✦ 최저 Lv.29 → Lv.30」「✦ 공명 효과 +30% → +45%」 (값은 게임 계산 그대로, 설명 글은 뺌)
      var eff = '<div class="rueff"><i class="rsp"></i><span>모든 피해</span><b data-opv="rres">+' + pct(res * RC.resFinal) + '</b></div>';
      var nx = '<div class="runx">' + (!open ? '<small>' + RC.unlockTier + '차 전직 후 해금</small>' : wornR.length ?
        '<div class="rr"><p><i class="rsp"></i><span>최저</span><b>Lv.' + minLv + '</b><i class="rar"></i><b class="to">Lv.' + needLv + '</b></p>' +
        '<p><i class="rsp"></i><span>공명 효과</span><b>+' + pct(res * RC.resFinal) + '</b><i class="rar"></i><b class="to">+' + pct((res + 1) * RC.resFinal) + '</b></p></div>'
        : '<small>룬을 장착하면 공명이 시작돼요</small>') + '</div>';
      // 시안: 고른 룬 상세 → [✦ 강화][장착][🔒 잠금][보관함] → 룬 줄 (분해·합성·추천 장착·일괄 분해는 보관함에)
      var det = cur ? '<div class="rd2 rsdet" style="--gc:' + hc(cur.grade) + '">' + runeHead(s, cur, minLv, runeMini(s, cur)) + '</div>' +
        '<div class="rdbtns r4">' + runeUpBtn(s, cur, open) + runeEqBtn(s, cur) + runeLockBtn(cur, true) + '<button class="btn rsbagbtn" data-act="rbag"><i class="rbx"></i>보관함</button></div>'
        : '<div class="rdbtns r4 solo"><button class="btn rsbagbtn" data-act="rbag"><i class="rbx"></i>보관함</button></div>';
      // 2026-11-18 시안: 무대 → 「공명 N단계 · 모든 피해 +N%」 띠 → 착용 중 → 상세·버튼 → 종류별 목록 (가로로 넘기던 룬 줄 대신)
      var resBar = '<div class="rures" data-opfx="rres" data-opdur=".8">' + (open ? '공명 ' + res + '단계<i>·</i>모든 피해 <b data-opv="rres">+' + pct(res * RC.resFinal) + '</b>' : '<small>' + RC.unlockTier + '차 전직 후 해금</small>') + '</div>';
      var strip = kindCard('rn', s, curId);
      // 룬 소환 (사용자 「룬뽑기 깔끔하게」): 상자 하나 — 제목 + 계열(전체·확률·피해) + 5회·10회
      // 소환 카드 (2026-11-17, 사용자: 룬도 소환하는 부분 이쁘게) — 유물·신성력과 같은 .opcard, 오른쪽 위에 계열 고르기
      var pulls = '<div class="opcard rsum rnsum"><div class="opcard-h"><b>룬 소환</b><div class="rsseg" role="tablist" aria-label="소환 계열">' + [['all', '전체'], ['rate', '확률'], ['dmg', '피해']].map(function (g) { return '<button role="tab" aria-selected="' + (rnGroup === g[0]) + '" data-rgrp="' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="rsum-btns n2">' + [5, 10].map(function (m) { return summonBtn(m, RC.summon[m], 'data-rsum', m === 10).replace('class="rsb', 'class="rsb' + (open ? '' : ' lock')); }).join('') + '</div>' +
        dustRow('rune', s.runeDust || 0, 'data-rdsum', RC.summon, !open) + '</div>';
      return stage + resBar + wornCard('rn', s, curId) + det + strip + pulls + awakenBox('rune');
    }
    // 룬 보관함: 위에 「‹ 룬」 돌아가기·보유 수, 추천 장착·일괄 분해, 종류 탭, 전체 칸. 고르면 아래 고정 칸에 상세(강화·장착·잠금·분해·합성)
    function runeBagPanel(s, open, minLv) {
      var RC = DATA.runeConf, bag = CW.runeBag(s), it = selRune && CW.runeItem(s, selRune);
      if (it) {
        var top = it.grade >= DATA.hiGrades.length - 1, freeIt = !CW.runeIsWorn(s, it.id) && !it.lock;
        var same = bag.items.filter(function (x) { return x !== it && x.kind === it.kind && x.grade === it.grade && !x.lock && !CW.runeIsWorn(s, x.id); }).length;
        dockHtml = '<div class="dockbox rdock rd2" style="--gc:' + hc(it.grade) + '">' + dockX('rn') + runeHead(s, it, minLv) + runeCmp(s, it) +
          '<div class="rdbtns">' + runeUpBtn(s, it, open) + runeEqBtn(s, it) + runeLockBtn(it) + '</div>' +
          '<div class="rdbtns two"><button class="btn' + (freeIt ? '' : ' off') + '" data-rdis="' + it.id + '">분해 ' + CW.ICO.cur('rune') + fmt(CW.runeDismantleValue(it)) + '</button><button class="btn' + (same >= 2 && !top && freeIt ? '' : ' off') + '" data-rfuse="' + it.id + '">합성 ' + Math.min(3, same + 1) + '/3' + fuseTag(s, 'rune', it.grade + 1, top) + '</button></div>' +
          (top ? '' : '<span class="note">합성 · 같은 종류·등급 3개 → ' + hn(it.grade + 1) + '</span>') + '</div>';
      }
      var have = {}; bag.items.forEach(function (x) { have[x.kind] = 1; });
      var filt = '<div class="kindtabs">' + ['all'].concat(DATA.runes.filter(function (x) { return have[x.id] || rnFilter === x.id; }).map(function (x) { return x.id; })).map(function (kid) { var kk = CW.runeById(kid); return '<button role="tab" aria-selected="' + (rnFilter === kid) + '" data-rkf="' + kid + '">' + (kk ? '<em class="kdot" style="--kc:' + kk.color + '"></em>' : '') + (kk ? kk.name.replace(' 룬', '').replace('의', '') : '전체') + '</button>'; }).join('') + '</div>';
      var inv = bag.items.filter(function (x) { return rnFilter === 'all' || x.kind === rnFilter; }).sort(function (a, c) { return CW.runePower(c) - CW.runePower(a); }).map(function (x) { return runeCell(s, x); }).join('');
      return '<div class="rsbh"><button class="rsback" data-act="rbagx" aria-label="룬 화면으로">‹ 룬</button><b>룬 보관함</b><span><b>' + bag.items.length + '</b> / ' + RC.cap + '</span></div>' +
        '<div class="rsacts"><button class="btn" data-act="rbest">추천 장착</button><button class="btn" data-act="rdisall">일괄 분해<small>잠금·장착 제외</small></button></div>' +
        filt + '<div class="rsgrid inv">' + (inv || '<p class="note">아직 보유한 룬이 없어요.<br>보스 처치나 소환으로 획득할 수 있어요.</p>') + '</div>';
    }
    function showRunes(list, dust) {
      var best = Math.max.apply(null, list.map(function (x) { return x.grade; }));
      modal('<h2 style="color:' + hc(best) + '">' + (best >= 5 ? hn(best) + ' 룬 획득' : '룬 ' + list.length + '개 획득') + '</h2><div class="sggrid got rsgot">' + list.slice().sort(function (a, c) { return c.grade - a.grade; }).map(function (x) { return runeCell(G.state, x); }).join('') + '</div>',
        [{ label: '확인' }, { label: dust ? '다시 만들기' : '다시 소환', pri: true, fn: function () { var r = G.runeSummon(list.length, rnGroup, dust); if (!r) toast(dust ? '만들 수 없어요. 룬 가루와 가방 여유 공간을 확인해 주세요.' : '소환할 수 없어요. 다이아와 가방 여유 공간을 확인해 주세요.'); else { showRunes(r, dust); renderPanel(true); hud(); } } }]);
    }
    function sgCell(it, eqd, curId) {
      var nm = STAT_KO[it.stat] || it.stat;
      return rsCell('data-sg', it.id, it.grade, (curId !== undefined ? curId : selSigil) === it.id, eqd, it.lock, sigilArt(it.stat, it.grade, 'rsc-art sg'), Math.round(it.q * 100) + '%', hn(it.grade) + ' ' + nm + ' ' + CW.qualityName(it.q) + ' ' + Math.round(it.q * 100) + '%');
    }
    // 신성력 무대: 성운 창(부품 창 마스크·테두리·신성력 성운) + 받침대 + 장착 보석(밑에 소켓 고리). 시안(07-sigil source: 패널 485px = 화면 391px,
    // ×0.806)은 3개씩 두 줄(아래 줄이 받침대 위). 칸이 늘면(Lv.10마다 1칸, 최대 20칸) 4·5·7개씩, 줄이 셋이면 보석을 작게 — 창 높이는 그대로.
    // 다음에 열릴 칸 하나(자물쇠 + 열리는 레벨)는 맨 끝. 위 줄이 덜 찬 줄 (받침대 위 줄은 늘 꽉).
    function sgLayout(nc) {
      var cols = nc <= 6 ? 3 : nc <= 8 ? 4 : nc <= 15 ? 5 : 7, rows = Math.ceil(nc / cols);
      // 시안(제목 기준 같은 폭 대조): 보석 60px, 가로 74px 간격, 아래 줄 가운데 무대 y102 (받침대 위), 위 줄 y40.5
      var gem = rows <= 2 ? (cols === 3 ? 60 : cols === 4 ? 54 : 50) : (cols === 5 ? 40 : 36), dx = cols === 3 ? 74 : cols === 4 ? 70 : cols === 5 ? 62 : 47, dy = rows <= 2 ? 61.5 : 38, y0 = rows <= 2 ? 102 : 106;   // 세 줄은 윗줄 양끝이 창 둥근 모서리 안에 들도록
      var first = nc - (rows - 1) * cols, pos = [];
      for (var i = 0; i < nc; i++) {
        var r = i < first ? 0 : 1 + Math.floor((i - first) / cols), c = i < first ? i : (i - first) % cols, inRow = r === 0 ? first : cols;
        pos.push([+(179.5 + (c - (inRow - 1) / 2) * dx).toFixed(1), +(y0 - (rows - 1 - r) * dy).toFixed(1)]);
      }
      return { pos: pos, gem: gem };
    }
    var sgBag = false;   // 신성력 보관함 보기 (신성력 줄 위 「보관함 ›」 ↔ 「‹ 신성력」, 룬과 같은 정리, 사용자 2026-11-17)
    // 고른 신성력 상세 머리 (시안: 왼쪽 큰 보석(선택 칸 안, 등급 테두리), 오른쪽 「✦ 등급 · 품질 · %」「✦ 옵션 [옵션 이름 +값]」)
    function sigilHead(sel, extra) {
      var snm = STAT_KO[sel.stat] || sel.stat;
      return '<div class="rdh"><div class="rdpic sg" style="--gc:' + hc(sel.grade) + '" data-opfx="sg:' + sel.id + '" data-opdur=".5">' + gfImg(sel.grade, 'rd-gf') + sigilArt(sel.stat, sel.grade, 'sd-art') + '</div>' +
        '<div class="rdinfo"><p class="sdq"><i class="rsp"></i><b style="color:' + hc(sel.grade) + '">' + hn(sel.grade) + '</b><span>·</span>' + CW.qualityName(sel.q) + '<span>·</span><b class="to">' + Math.round(sel.q * 100) + '%</b></p>' +
        '<p class="sdo"><i class="rsp"></i><span>옵션</span><em>' + snm + ' <span style="white-space:nowrap">+' + pct(CW.sigilValue(sel)) + '</span></em></p>' + (extra || '') + '</div></div>';
    }
    function sigilEqBtn(s, sel) {
      // 한 종류에 하나: that option already worn → 교체 with it, even with an empty slot (js/sigil.js sameWorn)
      var on = CW.isEquipped(s, sel.id), sc = CW.sigilCompare(s, sel.id), swapTo = !on && sc && (sc.full || sc.mode === 'same') && sc.target;
      return swapTo ? (sigilWorse(sel, sc) ? '<button class="btn warn" data-sgswap="' + sc.target.id + '|' + sel.id + '">교체<small>떨어져요</small></button>' : '<button class="btn pri" data-sgswap="' + sc.target.id + '|' + sel.id + '">교체</button>')
        : '<button class="btn' + (on ? ' on' : '') + '" data-sgeq="' + sel.id + '">' + (on ? '해제' : '장착') + '</button>';
    }
    function sigilLockBtn(sel, short) { return '<button class="btn rdlock' + (sel.lock ? ' on' : '') + '" data-sglock="' + sel.id + '" aria-pressed="' + !!sel.lock + '"><i class="rlk"></i>' + (sel.lock ? (short ? '잠김' : '잠금 풀기') : '잠금') + '</button>'; }
    // 천상·혼돈·멸망 fusions: their chance now (with the 천장) under the 합성 word; nothing when it always works
    function fuseTag(s, kind, g, top) { var r = top ? 1 : CW.fuseRate(s, kind, g); return r < 1 ? '<small class="fuse-p">성공 ' + Math.round(r * 100) + '%</small>' : ''; }
    function sigilFuseOk(s, sel) { var same = s.sigil.items.filter(function (x) { return x !== sel && x.grade === sel.grade && !x.lock && !CW.isEquipped(s, x.id); }).length; return { same: same, ok: same >= 2 && sel.grade < DATA.hiGrades.length - 1 && !sel.lock && !CW.isEquipped(s, sel.id) }; }
    function sigilUpBtn(s) {
      var C = DATA.sigilConf, b = s.sigil, lvCost = CW.sigilLvCost(b.lv);
      return '<button class="buy rdup sgup2 two' + (b.stone < lvCost || b.lv >= C.lvMax ? ' off' : '') + '" data-sglv="1">' + (b.lv >= C.lvMax ? '<span class="t">최대 레벨</span>' : '<span class="t">레벨업</span><span class="c">' + CW.ICO.cur('sigil') + fmt(lvCost) + '</span>') + '</button>';
    }
    function sigilPanel() {
      var s = G.state, C = DATA.sigilConf;
      if (!CW.sigilOpen(s)) return lockedCard('sigil', C.unlockTier);
      var b = s.sigil, eq = CW.equipped(s), slots = CW.sigilSlots(s);
      if (selSigil && !CW.sigilById(s, selSigil)) selSigil = null;
      var sum = {}; eq.concat(CW.sigilAwakened(s)).forEach(function (id) { var it = CW.sigilById(s, id); sum[it.stat] = (sum[it.stat] || 0) + CW.sigilValue(it); });
      if (sgBag) return sigilBagPanel(s, sum);
      // 본문에 보일 신성력: 고른 것, 없으면 장착 첫 보석 → 보유 중 가장 센 것
      var strong = b.items.slice().sort(function (a, c) { return CW.sigilPower(c) - CW.sigilPower(a); });
      var wornS = eq.map(function (id) { return CW.sigilById(s, id); }).filter(Boolean);
      var cur = (selSigil && CW.sigilById(s, selSigil)) || wornS[0] || strong[0] || null, curId = cur && cur.id;
      var nc = slots, L = sgLayout(nc), gems = '';   // 시안처럼 열린 칸만 (다음 칸이 열리는 레벨은 보관함 안내에)
      for (var i = 0; i < nc; i++) {
        var p = L.pos[i], st = 'left:' + p[0] + 'px;top:' + p[1] + 'px;--g:' + L.gem + 'px;--i:' + i;
        if (i >= slots) { gems += '<div class="sgn lockd" style="' + st + '"><i class="sgn-ring"></i><i class="sgn-lock"></i><small>Lv.' + ((i - C.slotsBase + 1) * C.slotsPer) + '</small></div>'; continue; }
        var it = eq[i] && CW.sigilById(s, eq[i]);
        if (!it) { gems += '<div class="sgn empty" style="' + st + '"><i class="sgn-ring"></i><i class="sgn-hole"></i></div>'; continue; }
        var su = CW.ICO.sigilSrc && CW.ICO.sigilSrc(it.stat), shm = su ? ' style="-webkit-mask-image:url(' + su + ');mask-image:url(' + su + ')"' : '';
        gems += '<button class="sgn' + (it.id === curId ? ' sel' : '') + '" data-sg="' + it.id + '" data-opfx="sg:' + it.id + '" data-opdur=".5" style="' + st + ';--gc:' + hc(it.grade) + '" aria-label="' + hn(it.grade) + ' ' + (STAT_KO[it.stat] || it.stat) + ' ' + Math.round(it.q * 100) + '%">' +
          '<i class="sgn-ring"></i><i class="sgn-f">' + sigilArt(it.stat, it.grade, 'sgn-art') + (su ? '<i class="sgn-sh"' + shm + '></i>' : '') + '</i></button>';
      }
      var stage = '<div class="sgw"><div class="sgv"><i class="sgv-halo"></i><i class="sgv-neb"></i><i class="sgv-rim"></i>' + twinkles(SG_TW) + '<i class="sgv-ped"></i><i class="ruv-sp sgsp"></i>' + gems + '</div></div>';
      // 시안 줄: 프리셋 [1][2][3] | Lv.20 | 장착 6/6 (Lv = 신성력 시스템 레벨, 장착 = 지금 프리셋의 장착 수 / 열린 칸)
      var head = '<div class="sgrow"><span class="sgl">프리셋</span><div class="sgsets">' + [0, 1, 2].map(function (j) { return '<button class="sgpre' + (b.cur === j ? ' on' : '') + '" data-sgset="' + j + '" aria-pressed="' + (b.cur === j) + '">' + (j + 1) + '</button>'; }).join('') + '</div>' +
        '<i class="sgbar"></i><b class="sglvv" data-opfx="sglv" data-opdur=".6">Lv.<span data-opv="sglv">' + b.lv + '</span></b></div>';   // 장착 수는 착용 중 카드 머리에 (2026-11-18 시안)
      // 시안: 상세(+ 끼지 않은 것은 현재 → 장착 후 비교) → [✦ 레벨업 ◆][장착][잠금][보관함] (레벨업 = 신성력 시스템 레벨).
      // 사용자 2026-11-17 「애도 보관함 만들어」: 룬과 같이 보관함 버튼, 합성·분해는 보관함 아래 칸에서
      var det = cur ? '<div class="rd2 sd2 rsdet sg" style="--gc:' + hc(cur.grade) + '">' + sigilHead(cur, sigilMini(s, cur, sum)) + '</div>' : '';
      var btns = '<div class="rdbtns ' + (cur ? 'r4 sgr' : 'r2') + '">' + sigilUpBtn(s) + (cur ? sigilEqBtn(s, cur) + sigilLockBtn(cur, true) : '') + '<button class="btn rsbagbtn" data-act="sgbag"><i class="rbx"></i>보관함</button></div>';
      // 2026-11-18 시안: 무대 → 착용 중 → 프리셋·Lv → 상세·버튼 → 종류별 목록 (가로로 넘기던 신성력 줄 대신)
      var strip = kindCard('sg', s, curId);
      // 소환 카드 (2026-11-17, 사용자: 신성력 소환도 유물처럼 딱 가운데·줄맞춤 칸맞춤) — 유물 소환과 같은 .opcard/.rsb
      var pulls = '<div class="opcard rsum sgsum"><div class="opcard-h"><b>신성력 소환</b></div><div class="rsum-btns n2">' + [5, 10].map(function (m) { return summonBtn(m, C.summon[m], 'data-sgsum', m === 10); }).join('') + '</div>' +
        dustRow('sigil', G.state.sigilDust || 0, 'data-sgdsum', C.summon, false) + '</div>';
      return stage + wornCard('sg', s, curId) + head + det + btns + strip + pulls + awakenBox('sigil');
    }
    // 신성력 보관함: 「‹ 신성력」·보유 수, 레벨 효과·장착 효과, 추천 장착·일괄 분해, 등급 탭, 전체 칸. 고르면 아래 고정 칸에 상세
    function sigilBagPanel(s, sum) {
      var C = DATA.sigilConf, b = s.sigil, slots = CW.sigilSlots(s), sel = selSigil && CW.sigilById(s, selSigil);
      if (sel) {
        var fz = sigilFuseOk(s, sel);
        dockHtml = '<div class="sgsel dockbox sd2" style="--gc:' + hc(sel.grade) + '">' + dockX('sg') + sigilHead(sel) + sigilCmp(s, sel, sum) +
          '<div class="rdbtns">' + sigilEqBtn(s, sel) + sigilLockBtn(sel) + '<button class="btn' + (fz.ok ? '' : ' off') + '" data-sgfuse="' + sel.id + '">합성 ' + Math.min(3, fz.same + 1) + '/3' + fuseTag(s, 'sigil', sel.grade + 1, sel.grade >= DATA.hiGrades.length - 1) + '</button><button class="btn' + (sel.lock || CW.isEquipped(s, sel.id) ? ' off' : '') + '" data-sgdis="' + sel.id + '">분해</button></div>' +
          (sel.grade < DATA.hiGrades.length - 1 ? '<span class="note">합성 · 같은 등급 3개 → ' + hn(sel.grade + 1) + '</span>' : '') + '</div>';
      }
      // a crit option counts up to critConf.caps.sigil for its tier (2026-11-16): the list says when the rest is wasted
      var effs = Object.keys(sum).map(function (k) {
        var d = CW.sigilStatDef(k), cap = d.awaken ? DATA.critConf.caps.sigil[d.kind] : null;
        return '<p><i class="rsp"></i><span>' + (STAT_KO[k] || k) + '</span><b>+' + pct(cap !== null ? Math.min(cap, sum[k]) : sum[k]) + (cap !== null ? ' <small>(최대 ' + pct(cap) + (sum[k] > cap + 1e-9 ? ' · 넘친 ' + pct(sum[k] - cap) + ' 안 씀' : '') + ')</small>' : '') + '</b></p>';
      }).join('') || '<p class="note">장착한 신성력이 없어요</p>';
      var lvInfo = '<p><i class="rsp"></i><span>레벨 효과 Lv.' + b.lv + '</span><b>모든 피해 <span data-opv="sglve">+' + pct(b.lv * C.lvFinal) + '</span></b></p>' +
        '<p><i class="rsp"></i><span>신성석</span><b class="stn">' + CW.ICO.cur('sigil') + ' ' + fmt(b.stone) + '</b></p>' +
        (slots < C.slotsMax ? '<p><i class="rsp"></i><span>장착 칸 ' + slots + ' / ' + C.slotsMax + '</span><b class="stn">Lv.' + C.slotsPer + '마다 1칸</b></p>' : '');
      var filt = '<div class="kindtabs">' + [-1].concat(DATA.hiGrades.map(function (x, i) { return i; })).map(function (g) { return '<button role="tab" aria-selected="' + (sgFilter === g) + '" data-sgf="' + g + '">' + (g >= 0 ? '<em class="kdot" style="--kc:' + hc(g) + '"></em>' + hn(g) : '전체') + '</button>'; }).join('') + '</div>';
      var inv = b.items.filter(function (x) { return sgFilter < 0 || x.grade === sgFilter; }).sort(function (a, c) { return CW.sigilPower(c) - CW.sigilPower(a); }).map(function (x) { return sgCell(x, CW.isEquipped(s, x.id)); }).join('');
      return '<div class="rsbh"><button class="rsback" data-act="sgbagx" aria-label="신성력 화면으로">‹ 신성력</button><b>신성력 보관함</b><span><b>' + b.items.length + '</b> / ' + C.cap + '</span></div>' +
        '<div class="rseff">' + lvInfo + '</div><div class="rseff"><small>장착 효과</small>' + effs + '</div>' +
        '<div class="rsacts"><button class="btn" data-act="sgbest">추천 장착</button><button class="btn" data-act="sgdisall">일괄 분해<small>잠금·장착 제외</small></button></div>' +
        filt + '<div class="rsgrid inv">' + (inv || '<p class="note">아직 보유한 신성력이 없어요.<br>보스 처치나 소환으로 획득할 수 있어요.</p>') + '</div>';
    }
    function showSigils(list, fromPack, dust) {
      var best = Math.max.apply(null, list.map(function (x) { return x.grade; }));
      modal('<h2 style="color:' + hc(best) + '">' + (best >= 5 ? hn(best) + ' 신성력 획득' : '신성력 ' + list.length + '개 획득') + '</h2><div class="sggrid got rsgot">' + list.slice().sort(function (a, c) { return c.grade - a.grade; }).map(function (it) { return sgCell(it, false); }).join('') + '</div>',
        fromPack ? [{ label: '확인', pri: true }] : [{ label: '확인' }, { label: dust ? '다시 만들기' : '다시 소환', pri: true, fn: function () { var r = G.sigilSummon(list.length, false, dust); if (!r) toast(dust ? '만들 수 없어요. 신성력 가루와 가방 여유 공간을 확인해 주세요.' : '소환할 수 없어요. 다이아와 가방 여유 공간을 확인해 주세요.'); else { showSigils(r, false, dust); renderPanel(true); hud(); } } }]);
    }
    function showRelics(list) {
      var shown = list.slice().sort(function (a, b) { return (CW.relicById(b.id).divine ? 1 : 0) - (CW.relicById(a.id).divine ? 1 : 0); });
      var gems = list.reduce(function (a, o) { return a + o.refund; }, 0), hasDivine = list.some(function (o) { return CW.relicById(o.id).divine; });
      modal('<h2' + (hasDivine ? ' style="color:var(--gold)"' : '') + '>' + (hasDivine ? '신유물 획득!' : '유물 ' + list.length + '개 획득') + '</h2><div class="rgot">' + shown.slice(0, 60).map(function (o) {
        var r = CW.relicById(o.id); return '<div class="' + (r.divine ? 'divine' : '') + '"><span>' + mi('relic', r) + '</span><small>' + r.name + '</small><b>' + (o.refund ? '다이아 +' + o.refund : 'Lv.' + o.lv) + '</b></div>';
      }).join('') + '</div>' + (gems ? '<p class="note">최대 레벨 유물을 다이아 ' + gems + '개로 전환했어요.</p>' : ''), [{ label: '확인' }, { label: '다시 소환', pri: true, fn: function () { var r = G.summonRelics(list.length); if (!r) toast('다이아가 부족해요'); else { showRelics(r); renderPanel(true); hud(); } } }]);
    }
    // ---------- 가방 (2026-11-17, js/chest.js) ----------
    // 패키지·우편 선물이 상자로 쌓이는 곳. 열면 룬·신성력·장비가 제자리로 들어가고, 결과 창에서 그 화면으로 바로 감
    function chestBadge() {
      var b = document.querySelector('#quick [data-quick="chest"]'); if (!b || !G.state) return;
      var n = CW.chestCount(G.state), d = b.querySelector('.qnum');
      if (n && !d) { d = document.createElement('b'); d.className = 'qnum'; b.appendChild(d); }
      if (d) { if (n) d.textContent = n > 99 ? '99+' : n; else d.remove(); }
    }
    CW.chestBadge = chestBadge;
    // 가방 창 (형의 그림 art/bag-win.webp · bag-cell.webp, tools/bag-art.py): 가죽 가방 안에 100칸, 한 줄 4칸(형: 칸 넉넉하게),
    // 위아래로 넘겨 봄. 상자 칸을 누르면 구성품과 [열기], 아래 띠에 칸 수와 [모두 열기]
    var bagWin = null;
    function chestCell(box) {
      if (!box) return '<i class="bgc"></i>';
      var p = box.src === 'pack' && CW.packById(box.pack);
      var pic = p ? mi('pack', p) : CW.chestIsItem(box) ? ((CW.giveIco && CW.giveIco(box.src, box.grade)) || '') : '<img src="art/mail-env.webp" alt="" draggable="false">';
      var gc = CW.chestIsItem(box) && DATA.hiGrades[box.grade] ? ' style="--gc:' + DATA.hiGrades[box.grade].color + '"' : '';
      return '<button class="bgc on' + (CW.chestIsItem(box) ? ' item' : '') + '"' + gc + ' data-chpick="' + box.id + '"><span class="bgp">' + pic + '</span><b>' + esc(CW.chestTitle(box)) + '</b></button>';
    }
    function bagRender() {
      var items = CW.chestItems(G.state), cells = '';
      for (var i = 0; i < CW.CHEST_CAP; i++) cells += chestCell(items[i]);
      bagWin.querySelector('.bggrid').innerHTML = cells;
      bagWin.querySelector('.bgn').innerHTML = '<b>' + items.length + '</b> / ' + CW.CHEST_CAP;
      bagWin.querySelector('.bgall').classList.toggle('off', !items.length);
      // 이름은 칸 안 아래 자리에 (긴 이름은 두 줄) — 그래도 넘치면 글씨만 줄여 칸 테두리 안에 들어가게
      bagWin.querySelectorAll('.bgc b').forEach(function (b) {
        b.style.fontSize = ''; var f = parseFloat(getComputedStyle(b).fontSize), r = document.createRange();
        var over = function () { r.selectNodeContents(b); var t = r.getBoundingClientRect(), k = b.getBoundingClientRect(); return t.height > k.height + 0.5 || t.width > k.width + 0.5; };
        for (var n = 0; n < 14 && over(); n++) { f *= 0.94; b.style.fontSize = f.toFixed(2) + 'px'; }
      });
      chestBadge();
    }
    function openChest() {
      if (!bagWin) {
        bagWin = document.createElement('div'); bagWin.id = 'bagwin'; bagWin.setAttribute('role', 'dialog'); bagWin.setAttribute('aria-label', '가방');
        // 열리는 모습 (형: 가방도 살짝 열리는 걸): 가방이 톡 튀어나와 뚜껑이 살짝 들리고 금빛이 새어 나온 뒤 창이 올라옴 (누르면 건너뜀)
        bagWin.innerHTML = '<div class="bgfan" aria-hidden="true"><div class="bgbag"><i class="bgmouth"></i><img class="bgbody" src="art/bag-body.webp" alt="" draggable="false">' +
          '<img class="bglid" src="art/bag-lid.webp" alt="" draggable="false"><i class="bgglow"></i></div></div>' +
          '<div class="bgw"><img class="bgbg" src="art/bag-win.webp" alt="" draggable="false"><button class="bgx" aria-label="닫기"></button>' +
          '<div class="bggrid"></div><div class="bgbar"><span class="bgn"></span><button class="bgall">모두 열기</button></div></div>';
        document.body.appendChild(bagWin);
        bagWin.addEventListener('click', function (e) {
          var t = e.target;
          if (bagWin.classList.contains('fan')) { bagFanEnd(); return; }
          if (t === bagWin || t.closest('.bgx')) { G.sound('click'); bagWin.classList.remove('on', 'rise'); return; }
          if (t.closest('.bgall')) { if (CW.chestCount(G.state)) { G.sound('click'); openAllChest(); } return; }
          var c = t.closest('[data-chpick]'); if (c) { G.sound('click'); chestDetail(c.dataset.chpick); }
        });
      }
      bagRender(); bagWin.querySelector('.bggrid').scrollTop = 0;
      bagWin.classList.remove('fan', 'rise'); void bagWin.offsetWidth;
      bagWin.classList.add('on', 'fan');
      clearTimeout(bagWin._t); bagWin._t = setTimeout(bagFanEnd, 1150);
    }
    function bagFanEnd() {
      clearTimeout(bagWin._t); if (!bagWin.classList.contains('fan')) return;
      bagWin.classList.remove('fan'); bagWin.classList.add('rise');
      clearTimeout(bagWin._r); bagWin._r = setTimeout(function () { bagWin.classList.remove('rise'); }, 450);
    }
    // 칸을 누르면: 상자는 여는 연출 창, 가득 차서 돌아온 룬·신성력은 [꺼내기]
    function chestDetail(id) {
      var box = CW.chestById(G.state, id); if (!box) return;
      if (!CW.chestIsItem(box)) { chestFx([id]); return; }
      var why = CW.chestRoom(G.state, box);
      modal('<h2>' + esc(CW.chestTitle(box)) + '</h2><p class="guide-lead">' + (box.src === 'rune' ? '룬' : '신성력') + ' 칸이 가득 차서 가방에 보관 중이에요.' + (why ? ' 빈자리가 생기면 꺼낼 수 있어요.' : ' 지금 꺼낼 수 있어요.') + '</p>',
        [{ label: '닫기' }, { label: '꺼내기', pri: true, fn: function () { var r = G.openChest(id); if (!r.ok) { toast(r.why + '. 빈자리를 만든 뒤 꺼내 주세요.'); return; } toast(CW.chestTitle(box) + ' · 꺼냈어요'); bagRender(); hud(); if (tab !== 'battle') renderPanel(true); } }], { variant: 'guide', close: true });
    }
    // ---------- 상자 여는 연출 (2026-11-17, 형 시안 dev/chest-reward-demo.html, 형: 느리게 하나씩 말고 빠르게 후르릭) ----------
    // [상자 열기] → 상자가 흔들리고 빛나며 열림 → 보상 카드가 한꺼번에 펼쳐짐 → 동시에 날아감: 룬·신성력·장비는 아래 칸으로,
    // 다이아·골드는 위 지갑으로, 7일 다이아·물약·마력석 같은 건 그 자리에서 바로 적용(위로 반짝 사라짐). 룬·신성력 칸이 가득
    // 찼으면 그 칸에서 튕겨 가방 칸으로. 누르면 건너뜀. 연출 전에 G.openChest 로 이미 다 지급돼 있음 (연출은 보여 주기만)
    var cfx = null;
    function rewardFace(o) {
      var I = CW.ICO || {}, gi = function (k, g) { return (CW.giveIco && CW.giveIco(k, g)) || ''; }, hn = function (g) { return DATA.hiGrades[g] ? DATA.hiGrades[g].name : ''; };
      var min = function (m) { return m >= 60 ? (m % 60 ? (m / 60).toFixed(1) : m / 60) + '시간' : m + '분'; };
      switch (o.k) {
        case 'gems': return ['<i class="gem"></i>', '다이아', fmt(o.n)];
        case 'gold': return ['<i class="coin"></i>', '골드', o.min ? '사냥 ' + min(o.min) + '치' : fmtG(o.gold)];
        case 'pulls': return [gi('pull'), '장비 뽑기', o.n + '번'];
        case 'daily': return ['<i class="gem"></i>', '매일 다이아', o.n + '일'];
        case 'potion': var pt = o.id && (DATA.potions || []).filter(function (x) { return x.id === o.id; })[0]; return [(pt && I.misc && I.misc('potion', pt.id)) || gi('potion'), pt ? pt.name : '물약 3종', min(o.n)];
        case 'mana': return [gi('mana'), '마력석', fmt(o.n)];
        case 'runeStone': return [gi('runeStone'), '룬석', fmt(o.n)];
        case 'sigilStone': return [gi('sigilStone'), '신성석', fmt(o.n)];
        case 'shards': return ['<b class="cfemo">✦</b>', '신기 조각', fmt(o.n)];
        case 'awakenShard': return ['<b class="cfemo">🔆</b>', '각성 파편', fmt(o.n)];
        case 'rune': return [gi('rune', o.grade), hn(o.grade) + ' 룬', o.n + '개'];
        case 'sigil': return [gi('sigil', o.grade), hn(o.grade) + ' 신성력', o.n + '개'];
        case 'ticket': var dg = (DATA.dungeons || []).filter(function (x) { return x.id === o.id; })[0]; return [(I.misc && I.misc('dungeon', o.id)) || '', (dg ? dg.name : '던전') + ' 입장권', o.n + '장'];
        case 'gear': return [CW.GEAR_IMG && CW.GEAR_IMG[o.id] ? '<img src="' + CW.GEAR_IMG[o.id] + '" alt="" draggable="false">' : '', DATA.grades[o.grade].name + ' ' + DATA.kindName[o.id], o.n + '개'];
        case 'relic': var rl = CW.relicById(o.id); return [(I.misc && I.misc('relic', o.id)) || '', rl ? rl.name : '유물', o.n + '개'];
        case 'costume': var cs = (DATA.costumes || []).filter(function (x) { return x.id === o.id; })[0]; return ['<b class="cfemo">👘</b>', cs ? cs.name : '코스튬', '코스튬'];
      }
      return ['', o.k, ''];
    }
    function cfCounts() {
      var s = G.state; return { rune: CW.runeBag(s).items.length, sigil: (s.sigil && s.sigil.items.length) || 0, bag: CW.chestCount(s), gems: s.gems, gold: s.gold };
    }
    function chestFx(ids) {
      var boxes = ids.map(function (id) { return CW.chestById(G.state, id); }).filter(Boolean);
      if (!boxes.length) return;
      if (!cfx) {
        cfx = document.createElement('div'); cfx.id = 'chestfx'; cfx.setAttribute('role', 'dialog'); cfx.setAttribute('aria-label', '상자 열기');
        document.body.appendChild(cfx);
        cfx.addEventListener('click', function (e) {
          var t = e.target;
          if (cfx._run) { cfx._skip = true; return; }   // 연출 중 누르면 끝으로
          if (t.closest('.cfgo')) { G.sound('click'); cfRun(); return; }
          if (t.closest('.cfx') || t === cfx || t.closest('.cfok')) { G.sound('click'); cfClose(); return; }
          var d = t.closest('[data-cfto]');
          if (d && cfx.classList.contains('done') && ['rune', 'sigil', 'gear'].indexOf(d.dataset.cfto) >= 0) {
            G.sound('click'); cfClose(true); if (bagWin) bagWin.classList.remove('on', 'rise');
            gearSub = d.dataset.cfto; selSigil = selRune = null; rnBag = sgBag = false; openTab('gear');
          }
        });
      }
      cfx._ids = boxes.map(function (b) { return b.id; }); cfx._run = false; cfx._skip = false;
      var one = boxes.length === 1, c = cfCounts(), RC = DATA.runeConf.cap, SC = DATA.sigilConf.cap;
      var pic = one ? (boxes[0].src === 'pack' ? mi('pack', CW.packById(boxes[0].pack)) : '<img src="art/mail-env.webp" alt="" draggable="false">') : '<img src="art/ic-bag.webp" alt="" draggable="false">';
      cfx.innerHTML = '<div class="cfw"><div class="cfhead"><button class="cfx" aria-label="닫기">×</button><span class="cfwal" data-cfto="gem"><i class="gem"></i><b data-cfn="gems">' + fmt(c.gems) + '</b></span>' +
        '<span class="cfwal" data-cfto="gold"><i class="coin"></i><b data-cfn="gold">' + fmtG(c.gold) + '</b></span></div>' +
        '<div class="cfhd"><span class="cfeye">' + esc(one ? CW.chestTitle(boxes[0]) : '상자 ' + boxes.length + '개') + '</span><h2 class="cft">상자 속 선물을 꺼내 볼까요?</h2><p class="cfst">' + (one ? (boxes[0].src === 'mail' ? '우편 선물' : '패키지') : '한 번에 모두 열어요') + '</p></div>' +
        '<div class="cfstage"><i class="cfhalo"></i><div class="cfchest"><i class="cflight"></i>' + pic + '</div><div class="cfloot"></div></div>' +
        '<div class="cfdest"><div class="cfd" data-cfto="rune"><i>' + ((CW.giveIco && CW.giveIco('rune', 3)) || '') + '</i><span>룬</span><small data-cfn="rune">' + c.rune + ' / ' + RC + '</small></div>' +
        '<div class="cfd" data-cfto="sigil"><i>' + ((CW.giveIco && CW.giveIco('sigil', 5)) || '') + '</i><span>신성력</span><small data-cfn="sigil">' + c.sigil + ' / ' + SC + '</small></div>' +
        '<div class="cfd" data-cfto="gear"><i>' + ((CW.giveIco && CW.giveIco('pull')) || '') + '</i><span>장비</span><small>장비함</small></div>' +
        '<div class="cfd bag" data-cfto="bag"><i><img src="art/ic-bag.webp" alt="" draggable="false"></i><span>가방</span><small data-cfn="bag">' + c.bag + ' / ' + CW.CHEST_CAP + '</small></div></div>' +
        '<p class="cfnote" aria-live="polite"></p><div class="cfbtns"><button class="cfgo">상자 열기</button></div></div>';
      cfx.classList.remove('done'); cfx.classList.add('on');
      // 상자는 화면 정가운데 (형 2026-11-17): 무대 안에서 상자·빛 자리를 화면 가운데 높이로 옮김
      // (창이 아래에서 떠오르는 0.32초 동안은 위치가 틀어져 보이므로, 다 떠오른 뒤의 자리로 계산: 움직임 없는 offsetTop 기준)
      var place = function () {
        var stg = cfx.querySelector('.cfstage'), w = cfx.querySelector('.cfw'), wr = cfx.getBoundingClientRect();
        var wTop = (wr.height - w.offsetHeight) / 2;   // 창은 화면 가운데에 놓임 (#chestfx 는 flex 가운데)
        var y = Math.max(60, Math.min(stg.offsetHeight - 60, wr.height / 2 - wTop - stg.offsetTop));
        cfx.querySelector('.cfchest').style.top = y + 'px'; cfx.querySelector('.cfhalo').style.top = y + 'px';
      };
      place();
    }
    function cfClose(keep) { if (!cfx) return; cfx.classList.remove('on', 'done'); var d = cfx._daily; cfx._daily = false; if (bagWin && !keep) bagRender(); if (d && !keep) showDaily(false); }
    function cfAnim(el, fr, ms, ease) { if (cfx._skip) ms = 1; var a = el.animate(fr, { duration: ms, easing: ease || 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }); return a.finished.catch(function () {}); }
    function cfWait(ms) { return new Promise(function (r) { if (cfx._skip) return r(); var t0 = Date.now(), f = function () { if (cfx._skip || Date.now() - t0 >= ms) r(); else setTimeout(f, 30); }; f(); }); }
    function cfPulse(el, bad) { el.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: bad ? 'translateX(-4px) scale(1.04)' : 'scale(1.1)', filter: 'brightness(1.5)' }, { transform: bad ? 'translateX(4px)' : 'scale(1.03)' }, { transform: 'none', filter: 'none' }], { duration: 300 }); }
    function cfRun() {
      var before = cfCounts(), rew = [], go = {}, daily = false, back = { rune: 0, sigil: 0 };
      // 지급은 먼저 한꺼번에 (연출이 끊겨도 받은 건 그대로)
      cfx._ids.forEach(function (id) {
        var r = G.openChest(id); if (!r.ok) return;
        (r.rewards || []).forEach(function (o) { rew.push(o); if (o.back) back[o.k] += o.back; });
        Object.keys(r.go || {}).forEach(function (k) { go[k] = 1; });
        if (r.box.src === 'pack') { var p = CW.packById(r.box.pack); if (p && p.give.daily) daily = true; }
      });
      var after = cfCounts(); cfx._daily = daily;
      chestBadge(); hud(); if (tab !== 'battle') renderPanel(true);
      // 같은 것끼리 묶어 카드 수를 줄임 (모두 열기)
      var merged = [], key = function (o) { return o.k + ':' + (o.grade === undefined ? '' : o.grade) + ':' + (o.id || '') + ':' + (o.sub === undefined ? '' : o.sub); };
      rew.forEach(function (o) { var m = merged.filter(function (x) { return key(x) === key(o); })[0]; if (m) { m.n = (m.n || 0) + (o.n || 0); m.gold = (m.gold || 0) + (o.gold || 0); m.back = (m.back || 0) + (o.back || 0); if (o.min) m.min = (m.min || 0) + o.min; } else merged.push(Object.assign({}, o)); });
      var w = cfx.querySelector('.cfw'), stage = cfx.querySelector('.cfstage'), loot = cfx.querySelector('.cfloot'), chest = cfx.querySelector('.cfchest');
      var btn = cfx.querySelector('.cfgo'), title = cfx.querySelector('.cft'), st = cfx.querySelector('.cfst'), note = cfx.querySelector('.cfnote');
      var setN = function (k, v) { var el = cfx.querySelector('[data-cfn="' + k + '"]'); if (el) el.textContent = v; };
      var pt = function (el) { var a = el.getBoundingClientRect(), b = stage.getBoundingClientRect(); return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 }; };
      cfx._run = true; cfx._skip = false; btn.disabled = true; btn.textContent = '보상을 꺼내고 있어요'; title.textContent = '상자를 여는 중…'; st.textContent = '';
      (async function () {
        await cfAnim(chest, [{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg) scale(1.04)' }, { transform: 'rotate(7deg) scale(1.06)' }, { transform: 'rotate(0) scale(1)' }], 260);
        cfAnim(cfx.querySelector('.cflight'), [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.2)' }, { opacity: 0, transform: 'scale(1.6)' }], 420);
        await cfAnim(chest, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.25)', opacity: 0 }], 220);
        title.textContent = '선물이 짜르륵!';
        // 카드: 3칸 줄, 상자 자리에서 한꺼번에 펼쳐짐
        var cards = merged.map(function (o, i) {
          var f = rewardFace(o), el = document.createElement('div'), n = merged.length, cols = 3, row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), col = i % cols;
          el.className = 'cfi' + (o.k === 'rune' || o.k === 'sigil' ? ' rare' : '');
          el.style.left = (50 + (col - (inRow - 1) / 2) * 33) + '%'; el.style.top = (6 + row * 31) + '%';
          el.innerHTML = '<span class="cfic">' + f[0] + '</span><b>' + esc(f[1]) + '</b><small>' + esc(f[2]) + '</small>';
          loot.appendChild(el); return el;
        });
        stage.style.setProperty('--rows', Math.max(1, Math.ceil(merged.length / 3)));
        await Promise.all(cards.map(function (el, i) {
          return cfWait(i * 35).then(function () { return cfAnim(el, [{ opacity: 0, transform: 'translate(-50%,60px) scale(.2) rotate(-8deg)' }, { opacity: 1, transform: 'translate(-50%,-4px) scale(1.06) rotate(2deg)' }, { opacity: 1, transform: 'translate(-50%,0) scale(1)' }], 280); });
        }));
        await cfWait(320);
        title.textContent = '보관함으로 쏙!';
        var target = function (o) { return o.to === 'gem' ? cfx.querySelector('[data-cfto="gem"]') : o.to === 'gold' ? cfx.querySelector('[data-cfto="gold"]') : o.to === 'now' ? null : cfx.querySelector('[data-cfto="' + o.to + '"]'); };
        await Promise.all(cards.map(function (el, i) {
          var o = merged[i], tg = target(o);
          return cfWait(i * 45).then(function () {
            var s0 = { x: el.offsetLeft, y: el.offsetTop + el.offsetHeight / 2 };
            if (!tg) {   // 바로 적용: 위로 반짝 사라짐
              el.classList.add('used');
              return cfAnim(el, [{ opacity: 1, transform: 'translate(-50%,0) scale(1)' }, { opacity: 1, transform: 'translate(-50%,-14px) scale(1.08)', filter: 'brightness(1.6)' }, { opacity: 0, transform: 'translate(-50%,-34px) scale(.7)' }], 420);
            }
            var e = pt(tg), dx = e.x - s0.x, dy = e.y - s0.y;
            return cfAnim(el, [{ transform: 'translate(-50%,0) scale(1)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + dx * 0.5 + 'px),' + Math.min(dy * 0.5, -30) + 'px) scale(.8)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + dx + 'px),' + dy + 'px) scale(.3)', opacity: 1 }], 420).then(function () {
              if (o.back) {   // 칸이 가득: 튕겨서 가방으로
                cfPulse(tg, true); note.textContent = '빈 칸이 없어 가방에 보관해요';
                var bg = cfx.querySelector('[data-cfto="bag"]'), b = pt(bg), bx = b.x - s0.x, by = b.y - s0.y;
                return cfAnim(el, [{ transform: 'translate(calc(-50% + ' + dx + 'px),' + dy + 'px) scale(.3)' }, { transform: 'translate(calc(-50% + ' + (dx + bx) / 2 + 'px),' + (Math.min(dy, by) - 50) + 'px) scale(.45)' }, { transform: 'translate(calc(-50% + ' + bx + 'px),' + by + 'px) scale(.2)', opacity: 0 }], 360).then(function () { cfPulse(bg); });
              }
              cfPulse(tg); return cfAnim(el, [{ opacity: 1 }, { opacity: 0 }], 80);
            });
          });
        }));
        setN('rune', after.rune + ' / ' + DATA.runeConf.cap); setN('sigil', after.sigil + ' / ' + DATA.sigilConf.cap); setN('bag', after.bag + ' / ' + CW.CHEST_CAP);
        setN('gems', fmt(after.gems)); setN('gold', fmtG(after.gold));
        loot.innerHTML = '';
        title.textContent = '선물을 모두 받았어요';
        var bt = []; if (back.rune) bt.push('룬 ' + back.rune + '개'); if (back.sigil) bt.push('신성력 ' + back.sigil + '개');
        st.textContent = bt.length ? bt.join(' · ') + '는 가방에 보관했어요' : '모두 제자리에 들어갔어요';
        note.textContent = bt.length ? '빈자리가 생기면 가방에서 꺼낼 수 있어요' : (go.rune || go.sigil || go.gear ? '룬·신성력·장비 칸을 누르면 바로 가요' : '');
        ['rune', 'sigil', 'gear'].forEach(function (k) { var d = cfx.querySelector('.cfd[data-cfto="' + k + '"]'); if (d) d.classList.toggle('hit', !!go[k]); });
        btn.textContent = '확인'; btn.className = 'cfok'; btn.disabled = false;
        cfx.classList.add('done'); cfx._run = false; cfx._skip = false;
      })();
    }
    function openAllChest() {
      var ids = CW.chestItems(G.state).filter(function (b) { return !CW.chestIsItem(b); }).map(function (b) { return b.id; });
      if (!ids.length) { toast('열 상자가 없어요. 가방의 룬·신성력은 하나씩 꺼내 주세요.'); return; }
      chestFx(ids);
    }
    CW.chestOpenUI = openChest;

    var panel = $('panel'), dock = $('dock');

    // ---------- modal / toast ----------
    // opts (2026-11-15, 안내 문구 디자인 A안): variant 'guide' = 라벤더 안내 카드, 'danger' = 위험 확인 카드,
    // close = 위 ×(순수 안내창만; 보상·콜백이 있는 창엔 붙이지 않는다). 예전 2인자 호출은 그대로.
    function modal(html, buttons, opts) {
      opts = opts || {};
      var card = $('modalCard');
      card.className = 'card' + (opts.variant === 'guide' ? ' guide-card' : opts.variant === 'danger' ? ' guide-card danger' : '');
      card.innerHTML = (opts.close ? '<button class="guide-x" data-mx aria-label="닫기">×</button>' : '') + html + '<div class="btns">' + buttons.map(function (b, i) { return '<button class="btn ' + (b.pri ? 'pri' : '') + '" data-mb="' + i + '">' + b.label + '</button>'; }).join('') + '</div>';
      if (opts.close) card.dataset.closable = '1'; else delete card.dataset.closable;
      $('modal').hidden = false;
      card.querySelectorAll('[data-mb]').forEach(function (el) { el.onclick = function () { var b = buttons[+el.dataset.mb]; $('modal').hidden = true; if (b.fn) b.fn(); G.sound('click'); }; });
      var mx = card.querySelector('[data-mx]'); if (mx) mx.onclick = function () { $('modal').hidden = true; G.sound('click'); };
    }
    function confirmBox(title, text, yes, onYes, opts) { modal('<h2>' + title + '</h2><p>' + text + '</p>', [{ label: '취소' }, { label: yes, pri: true, fn: onYes }], opts || { variant: 'guide' }); }
    // Esc 키: × 가 있는 순수 안내창만 닫는다
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modal').hidden && $('modalCard').dataset.closable) $('modal').hidden = true; });
    // ---------- 안내 카드: 긴 설명 → 한 줄 요약 + 자세히 (수치는 열 때마다 DATA·G.state에서 계산) ----------
    // 오팔 메뉴(훈련·장비·스킬, 2026-11-16)에선 도움말 버튼 없이 요약 한 줄만 남긴다 (사용자: 물음표/도움말 빼기)
    function guideRow(key, summary) { if (tab === 'up' || tab === 'gear' || tab === 'skill') return '<p class="ohint ogline">' + summary + '</p>'; return '<button class="guide-summary" data-guide="' + key + '"><span>' + summary + '</span><b>자세히</b></button>'; }
    function gSec(title, body) { return '<div class="guide-section"><h3>' + title + '</h3><p>' + body + '</p></div>'; }
    var GUIDES = {
      gear: function () { var BG = DATA.bagConf; return { t: '장비 성장 가이드', lead: '합성하고 초월할수록 장비가 강해져요.', secs: [gSec('합성', '같은 장비 <strong>' + BG.mergeCount + '개</strong>로 상위 단계를 만들어요.'), gSec('진행', 'I → II → III → IV → 다음 등급 I'), gSec('보유 효과', '장착하지 않은 장비도 효과를 제공해요.'), gSec('초월', '최대 레벨 장비와 같은 장비를 재료로 사용해요.<br>별 1개당 효과 <strong>+' + pct(BG.starMul) + '</strong> · 최대 레벨 <strong>+' + BG.starLv + '</strong>')] }; },
      alchemy: function (s) { var AC = DATA.alchConf; return { t: '물약 이용 안내', secs: [gSec('제작 비용', '현재 사냥 수익 약 <strong>' + Math.round(AC.costSec / 60) + '분</strong>에 해당하는 골드'), gSec('재제작', '남은 시간에 추가돼요. 최대 <strong>' + CW.potionMinutes(s) * AC.stackCap + '분</strong>')], tip: '접속 종료 중에도 남은 시간이 줄어들어요.' }; },
      talent: function () { var TC = DATA.talentConf; return { t: '특성 포인트', secs: [gSec('포인트 얻기', '계정 <strong>' + TC.levelsPerPoint + '레벨</strong>마다 포인트 1개를 얻어요.'), gSec('초기화', '언제든 무료로 초기화할 수 있어요.'), gSec('효과 확인', '특성을 선택하면 효과를 확인할 수 있어요.')] }; },
      dungeon: function () { return { t: '던전 이용 안내', secs: [gSec('입장권', '던전별 하루 <strong>' + DATA.dungeonConf.tickets + '장</strong>'), gSec('소탕', '클리어한 던전의 최고 기록 보상을 즉시 받아요.'), gSec('보상 규모', '최고 도달 스테이지에 따라 커져요.')] }; },
      relic: function () { var RS = DATA.relicSummon; return { t: '유물 수집 안내', secs: [gSec('중복 획득', '같은 유물의 레벨이 올라요.'), gSec('신유물', '금빛 테두리로 표시돼요. 등장 확률 <strong>' + pct(RS.divineRate) + '</strong>'), gSec('최대 레벨', '중복 유물은 다이아 <strong>' + RS.refund + '개</strong>로 전환돼요.')] }; },
      costume: function () { var CC = DATA.costumeConf; return { t: '코스튬 가이드', lead: '모으면 강해지고, 입으면 달라져요', secs: [gSec('외형 변경', '착용한 코스튬으로 모습이 바뀌어요.'), gSec('보유 효과', '입지 않아도 모든 보유 코스튬의 효과가 적용돼요.'), gSec('별 강화', '<strong>' + CC.starEvery + '레벨</strong>마다 별 1개 · 효과 <strong>+' + pct(CC.starBonus) + '</strong>')], tip: '구매와 강화에는 다이아를 사용해요.' }; },
      rune: function (s) { var RC = DATA.runeConf, res = CW.runeResonance(s); return { t: '룬 가이드', secs: [gSec('공명', '장착 룬 중 가장 낮은 레벨을 기준으로 올라요. 빈 슬롯은 제외돼요.'), gSec('다음 공명', '최저 레벨 <strong>' + ((res + 1) * RC.resEvery) + '</strong> 달성 → <strong>' + (res + 1) + '단계</strong>, 모든 피해 <strong>+' + pct(RC.resFinal) + '</strong>'), gSec('최대 레벨 · 승급', '등급마다 최대 레벨이 <strong>' + RC.lvPerGrade + '</strong>씩 늘어요. 최대 레벨에서 룬석으로 승급해요.'), gSec('합성', '같은 종류·등급 3개로 상위 등급을 얻어요.')], tip: '강화 버튼을 길게 누르면 연속 강화돼요.' }; },
      sigil: function () { var C = DATA.sigilConf; return { t: '신성력 가이드', secs: [gSec('합성', '같은 등급 3개로 다음 등급을 만들어요.'), gSec('분해', '신성석을 얻어요.'), gSec('레벨업', '신성석을 사용해 신성력 피해를 높여요.'), gSec('슬롯 확장', '<strong>' + C.slotsPer + '레벨</strong>마다 장착 슬롯 1개')] }; },
      growth: function () { return { t: '성장 가이드', secs: [gSec('길게 누르기', '버튼을 꾹 누르면 연속 강화돼요.'), gSec('×10 · ×100', '보유 골드로 가능한 만큼 한 번에 강화해요.')] }; },
      skill: function () { var B = DATA.balance; return { t: '스킬 사용 방식', secs: [gSec('사용 순서', '1번부터 4번 슬롯까지 순서대로 사용해요.'), gSec('배치', '모든 스킬을 원하는 슬롯에 배치할 수 있어요. 슬롯을 고르지 않으면 빈 슬롯에, 빈 슬롯이 없으면 4번 슬롯에 들어가요.'), gSec('빈 슬롯', '슬롯은 비워 둘 수 있지만, 스킬은 <strong>최소 1개</strong> 장착해야 해요.'), gSec('해금 · 강화', '전직할 때마다 스킬 4개가 열려요. 강화 1번마다 그 스킬 피해 <strong>+' + Math.round(B.skillLvBonus * 100) + '%</strong>, 최대 <strong>+' + B.skillMaxLv + '</strong>')] }; }
    };
    function showGuide(key) {
      var g = GUIDES[key]; if (!g) return; var o = g(G.state);
      modal('<h2>' + o.t + '</h2>' + (o.lead ? '<p class="guide-lead">' + o.lead + '</p>' : '') + o.secs.join('') + (o.tip ? '<p class="guide-tip">' + o.tip + '</p>' : ''), [{ label: '확인', pri: true }], { variant: 'guide', close: true });
      var pb = $('modalCard').querySelector('.btn.pri'); if (pb) try { pb.focus({ preventScroll: true }); } catch (er) {}
    }
    function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200); }
    function banner(text) { var b = $('banner'); b.textContent = text; b.classList.add('on'); setTimeout(function () { b.classList.remove('on'); }, 1300); }

    // ---------- HUD ----------
    var lastPlace = '', lastSub = null, lastStars = '';
    // the star path under the stage plate (2026-11-18 starry HUD): the gold line runs to pct, and each of the six stars
    // lights once the line reaches it; while farming the whole path glows
    var STAR_AT = [8, 26, 44, 60, 76, 92];
    function starPath(pct, loop) {
      var key = Math.round(pct * 10) + (loop ? 'L' : '');
      if (key === lastStars) return; lastStars = key;
      var kb = $('killBar'); kb.classList.toggle('loop', loop);
      kb.querySelector('.fill').style.strokeDashoffset = String(100 - pct);
      kb.querySelectorAll('.st').forEach(function (st, i) { st.classList.toggle('on', pct >= STAR_AT[i]); });
    }
    function hud() {
      var s = G.state, info = CW.stageInfo(s.stage), R = CW.regionAt(s.diff, info.region), sr = CW.sceneRegion(s.diff, info.region);
      var mark = CW.ICO.region ? CW.ICO.region(sr) : '';   // the region's own little mark (design-cream.js)
      // region tab (difficulty badge, mark, name) above the big stage plate (2026-11-18 starry HUD)
      var pn = (s.diff ? '<u>' + CW.diffOf(s).name + '</u>' : '') + '<span class="rmark">' + mark + '</span><b>' + R.name + '</b>', sno = CW.stageLabel(s.stage);
      if ($('stageNo').textContent !== sno) $('stageNo').textContent = sno;
      if (pn !== lastPlace) {
        lastPlace = pn; $('placeName').innerHTML = pn;
        // the clock area above the home-screen app takes the colour of this region's field, and the field fades from it
        // (tools/build-site.cjs): the phone paints that area in the page's theme colour
        if (CW.ICO.regionTop) {
          var capc = sr < 10 ? CW.ICO.regionTop(info.region) : '#' + ('00000' + R.sky.toString(16)).slice(-6), tc = document.querySelector('meta[name="theme-color"]');
          document.documentElement.style.setProperty('--capc', capc);
          if (tc && !document.documentElement.classList.contains('profon')) tc.setAttribute('content', capc);
        }
      }
      var gTxt = gh(s.gold); if (gTxt !== lastGoldTxt) { lastGoldTxt = gTxt; $('goldTxt').innerHTML = gTxt; } $('gemTxt').textContent = fmt(s.gems);
      $('lvTxt').textContent = 'Lv.' + s.level; $('xpBar').style.width = (s.level >= DATA.balance.levelMax ? 100 : Math.min(100, s.xp / CW.xpNeed(s.level) * 100)) + '%';
      var boss = G.boss(), sub = '', kp;
      $('bossbox').classList.toggle('on', !!boss);
      $('nhProg').style.display = boss ? 'none' : '';
      if (boss) {
        // "전직 시험" only while beating it still gives a new job (progress.js isTierTrial), not after the job is reached
        $('bossName').textContent = (CW.isTierTrial(s, s.stage) ? '전직 시험 · ' : '') + boss.name;
        $('bossTime').textContent = Math.max(0, boss.time).toFixed(1) + '초';
        var hpPct = Math.max(0, boss.mob.hp / boss.mob.maxHp * 100);
        $('bossHp').style.width = hpPct + '%';
        // health left as a percent: whole numbers, and a tenth below 1% so a boss still standing never reads 0%
        var pctTxt = (hpPct >= 1 ? Math.floor(hpPct) : hpPct > 0 ? Math.max(0.1, Math.floor(hpPct * 10) / 10) : 0) + '%';
        if ($('bossPct').textContent !== pctTxt) $('bossPct').textContent = pctTxt;
      } else {
        kp = G.killProgress();
        sub = s.farming ? '<span class="loop">반복 사냥</span>' : '<b>' + kp.n + '</b><em>/</em><b>' + kp.max + '</b>';
        starPath(s.farming ? 100 : Math.min(100, kp.n / kp.max * 100), !!s.farming);
      }
      if (sub !== lastSub) { lastSub = sub; $('placeSub').innerHTML = sub; }
      $('retry').classList.toggle('on', s.farming && !boss && G.canRetry() && !G.dunState());
      dunHud(G.dunState());
      var now = Date.now(), bt = DATA.potions.map(function (p) { var l = CW.buffLeft(s, p.id, now); return l ? '<span>' + mi('potion', p) + mmss(l) + '</span>' : ''; }).join('');
      if (bt !== lastBuffs) { lastBuffs = bt; $('buffs').innerHTML = bt; }
      var tier = DATA.tiers[s.tier - 1];
      var lastT = CW.FRIEND ? CW.FRIEND_MAX_TIER : DATA.tiers.length; // 체험판 ends at the 9th job
      var next = s.tier < lastT ? CW.tierNeed(s.tier + 1) + ' ' + (s.tier + 1) + '차' : (s.best >= 309 ? '마왕 토벌 완료!' : '최종 목표 10-31 늑대 왕');
      var nk = G.nickName(); if ($('nick').textContent !== nk) $('nick').textContent = nk; if ($('questTxt').textContent !== next) $('questTxt').textContent = next;
    }
    function slots() {
      var s = G.state, now = G.castingSlot();
      var pre = [0, 1, 2].map(function (i) { return '<button data-pre="' + i + '" aria-pressed="' + ((s.preset || 0) === i) + '" aria-label="스킬 프리셋 ' + (i + 1) + '">' + (i + 1) + '</button>'; }).join(''); if ($('pre').innerHTML !== pre) $('pre').innerHTML = pre;
      $('slots').innerHTML = s.slots.map(function (id, i) {
        var sk = id && CW.skillById(id);
        if (!sk) return '<button class="sk empty" data-bar="' + i + '" aria-label="' + (i + 1) + '번 칸 비어 있음"><b>' + (i + 1) + '</b></button>';
        var lv = CW.skillLevel(s, sk.id);
        return '<button class="sk ' + (i === now ? 'now' : '') + '" data-bar="' + i + '" style="--c:#' + new THREE.Color(sk.color).getHexString() + '" aria-label="' + sk.name + '">' + CW.ICO.skill(sk.id) + '<b>' + (lv ? '+' + lv : i + 1) + '</b></button>';
      }).join('');
    }

    // ---------- panels ----------
    var upSel = null;   // 성장 시안 (2026-11-16): 마지막으로 강화한 줄 = 청록 테두리 카드 (보기만, 규칙 없음)
    function upPanel() {
      var s = G.state, st = CW.stats(s);
      var eff = {
        atk: '공격력 ' + fmt(st.atk) + ' · 강화마다 +5%',
        speed: '속도 ×' + st.speedMul.toFixed(2) + ' (최대 ×2)',
        crit: '확률 ' + pct(st.critRate) + ' (최대 100%)',
        critDmg: '치명타 피해 ×' + st.critDmg.toFixed(2),
        gold: '골드 +' + pct(st.goldMul - 1),
        mastery: '모든 스킬 피해 ×' + st.mastery.toFixed(2),
        criticalCrit: '치명타 중 ' + pct(st.criticalRate) + ' 크리티컬 (피해 ×' + st.criticalDmg.toFixed(2) + ')', criticalDmg: '크리티컬 피해 ×' + st.criticalDmg.toFixed(2),   // 크리티컬 (2026-11-17)
        superCrit: '크리티컬 중 ' + pct(st.superRate) + ' 테라 (피해 ×' + st.superDmg + ')',
        ultraCrit: '테라 중 ' + pct(st.ultraRate) + ' 루나 (피해 ×' + st.ultraDmg + ')',
        hyperCrit: '루나 중 ' + pct(st.hyperRate) + ' 솔라 (피해 ×' + st.hyperDmg + ')',
        megaCrit: '솔라 중 ' + pct(st.megaRate) + ' 노바 (최대 100%)', megaDmg: '노바 크리티컬 피해 ×' + st.megaDmg.toFixed(2),
        ultimateCrit: '노바 중 ' + pct(st.ultimateRate) + ' 오라 (최대 100%)', ultimateDmg: '오라 크리티컬 피해 ×' + st.ultimateDmg.toFixed(2),
        alphaCrit: '오라 중 ' + pct(st.alphaRate) + ' 제로 (최대 100%)', alphaDmg: '제로 크리티컬 피해 ×' + st.alphaDmg.toFixed(2),
        chainInfo: ''
      };
      // 초월 lines: what each level grows, e.g. 하이퍼 크리티컬 피해 +0.20배 (1레벨당 +0.02배)
      Object.keys(DATA.upgrades).forEach(function (k) {
        var a = DATA.upgrades[k].adds; if (!a) return;
        var u0 = DATA.upgrades[k], lv = Math.min(s.up[k] || 0, u0.max === null ? Infinity : u0.max);
        eff[k] = Object.keys(a).map(function (b) {
          var f = function (v) { return CW.bonusAmount(b, v); };
          return STAT_KO[b] + ' ' + f(lv * a[b]) + ' (1레벨당 ' + f(a[b]) + ')';
        }).join(' · ');
      });
      var mul ='<div class="mulpick" role="group" aria-label="한 번에 올릴 단계">' + [1, 10, 100].map(function (n) { return '<button class="btn' + (upMul === n ? ' on' : '') + '" data-mul="' + n + '" aria-pressed="' + (upMul === n) + '">×' + n + '</button>'; }).join('') + '</div>';
      // 오팔 (2026-11-16): 제목 옆에 ×1·×10·×100만, 도움말 줄은 빼고 행이 바로 보이게
      // 성장 승인 시안 (2026-11-16): 위 ×1·×10·×100 알약 셋, 행 = 성운 구슬 아이콘 | 이름·Lv / 설명 / 「지금 → 다음」 알약 | 「🪙 비용 / ✦ 강화 ✦」, 맨 아래 「길게 누르면 연속 강화」
      if (!upSel || !CW.upgradeOpen(s, upSel)) upSel = 'atk';   // 시안: 고른 줄(청록 테두리) 하나 — 처음엔 맨 위 공격력
      return '<div class="ophead"><h3>성장</h3>' + mul + '</div><div class="list">' + Object.keys(DATA.upgrades).filter(function (k) { return !(CW.FRIEND && DATA.upgrades[k].tier > CW.FRIEND_MAX_TIER); }).map(function (k) { // 체험판: no 10차 rows (오메가 and up)
        var u = DATA.upgrades[k], lv = s.up[k] || 0, oi = CW.overInfo(s, k), one = CW.upgradeCost(k, lv, s), cost = one, nBuy = 1;
        // ×10·×100 show what the gold buys now (up to that many), so the price never runs past what one can hold
        if (upMul > 1) { var sum = 0, n = 0; while (n < upMul && sum + CW.upgradeCost(k, lv + n, s) <= s.gold) { sum += CW.upgradeCost(k, lv + n, s); n++; } if (n > 0) { cost = sum; nBuy = n; } }
        var max = u.max !== null && lv >= u.max && !oi;
        // 한계 돌파 (2026-11-15): past the row's max, each level adds 1% to the damage it is about
        var OVK = { finalMul: '모든 피해', critDmg: '치명타 피해', criticalDmg: '크리티컬 피해', superDmg: '테라 피해', ultraDmg: '루나 피해', hyperDmg: '솔라 피해', megaDmg: '노바 피해', ultimateDmg: '오라 피해', alphaDmg: '제로 피해', omegaDmg: '오메가 피해', eternalDmg: '이터널 피해', genesisDmg: '에온 피해', bossDmg: '보스 피해', skillDmg: '스킬 피해', weakMul: '약점 피해', surgeMul: '폭주 피해' };
        var past = oi && u.max !== null && lv > u.max, effTxt = past ? (eff[k] || '').replace(/ \((최대|1레벨당) [^)]*\)/g, '') : eff[k];
        var overTxt = past ? '<br>' + OVK[oi.stat] + ' +' + Math.round(oi.pct * 100) + '%' : '';
        var lvTxt = 'Lv.' + lv + (u.max !== null && lv <= u.max ? '<small>/' + u.max + '</small>' : '');   // 「최대」 줄 대신 Lv 옆에 (장비 Lv.41/400 처럼)
        if (!CW.upgradeOpen(s, k)) {
          var nd = CW.upgradeNeed(k), why = u.tier && (s.tier || 1) < u.tier ? u.tier + '차 전직 후 해금' : u.diff && (s.diffUnlocked || 0) < u.diff ? DATA.difficulties[u.diff].name + ' 난이도 해금 후 · ' + DATA.upgrades[nd.key].name + ' Lv.' + nd.lv : DATA.upgrades[nd.key].name + ' Lv.' + nd.lv + ' 달성 시 해금';
          var gl0 = CW.ICO.growArt && CW.ICO.growArt(k);
          return '<div class="row lockrow"><div class="ricon' + (gl0 ? ' gorb gnew' : '') + '">' + (gl0 ? '<i class="gorbbg"></i><i class="gped"></i><img class="gico" src="' + gl0 + '" alt="">' : CW.ICO.stat(k)) + '</div><div class="info"><div class="name">' + u.name + '</div><div class="desc need">' + why + '</div></div><span class="lockic">' + CW.ICO.pic('lock', 'ilock') + '</span></div>';
        }
        // plain words (js/grow-text.js): what the row does, then 지금 / 다음 / 최대 / 돌파 lines whose labels line up
        var gl = CW.growLines(s, k, upMul > 1 ? nBuy : 1);
        var gNow = null, gNext = null, gMore = [];
        gl.lines.forEach(function (l) { if (l[0] === '지금') gNow = l[1]; else if (l[0] === '다음') gNext = l[1]; else if (l[0] !== '최대' && l[0] !== '피해') gMore.push(l); });   // 최대는 Lv 옆 /최대레벨로, 「피해 터지면」은 뺌 (사용자 2026-11-16)
        var glHtml = '<div class="gabout">' + gl.about + '</div>' +
          (gNow !== null ? '<div class="gpill"><span data-opv="g:' + k + ':now">' + gNow + '</span>' + (gNext !== null ? '<i>→</i><b data-opv="g:' + k + ':next">' + gNext + '</b>' : '') + '</div>' : '') +
          (gMore.length ? '<div class="gmore">' + gMore.map(function (l) { return '<span><em>' + l[0] + '</em> ' + l[1] + '</span>'; }).join('') + '</div>' : '');
        var ga = CW.ICO.growArt && CW.ICO.growArt(k);   // 성장 부품 아이콘 (없으면 예전 아이콘)
        return '<div class="row grow' + (upSel === k ? ' sel' : '') + '"><div class="ricon gorb' + (ga ? ' gnew' : '') + '" data-opfx="up:' + k + '" data-opdur=".26">' + (ga ? '<i class="gorbbg"></i><i class="gped"></i><img class="gico" src="' + ga + '" alt="">' : CW.ICO.stat(k)) + '</div><div class="info"><div class="name"><span class="nm">' + u.name + '</span><span class="lv">' + lvTxt + '</span></div>' + glHtml + '</div>' +
          '<button class="buy ' + (max ? 'off max' : s.gold < one ? 'off' : '') + '" data-up="' + k + '">' + (max ? '최대' : '<span class="bp"><i class="coin"></i>' + gh(cost) + '</span><em class="blab">강화</em>') + '</button></div>';
      }).join('') + '</div><p class="ophold"><i>✦</i>길게 누르면 연속 강화</p>';
    }
    // element match-ups on each skill (2026-11-15, the user: 불 지역이면 얼음 스킬이 추가 피해 — on the skill's element tag,
    // not in a box): every region is weak to two elements; a skill shows its element, the regions it is strong in, and when
    // the region now is one of them, the hit there (×weakMul).
    function elChip(el) { var E = DATA.elements[el] || { name: el, color: '#888' }; return '<span class="elchip" style="--ec:' + E.color + '">' + E.name + '</span>'; }
    function weakX(s) { return (Math.round(CW.stats(s).weakMul * 100) / 100).toFixed(2); }
    // the regions a skill's element is strong in (the regions weak to it); the one the player is in now is marked
    function strongIn(el, s) {
      if (el === 'all') return '<span class="elgood">모든 지역</span>';
      // both worlds (하늘 세계 2026-11-17, the user: 하늘 지역 약점도 지금처럼 스킬에 나오게): the first world's regions, then
      // the sky's after a small tag; the region the player is in now is marked in its own world only
      var now = CW.regionOf(s), w = CW.worldOf(s.diff), out = '';
      [DATA.regions, DATA.skyRegions || []].forEach(function (list, wi) {
        var names = [];
        list.forEach(function (R, i) { if ((R.weak || []).indexOf(el) >= 0) names.push('<span class="elgood' + (wi === w && i === now ? ' now' : '') + '">' + R.name + '</span>'); });
        if (names.length) out += (wi ? '<span class="elworld">하늘</span>' : '') + names.join('');
      });
      return out;
    }
    function skillPanel() {
      var s = G.state;
      if (skDetail && CW.skillById(skDetail)) return skillDetail(CW.skillById(skDetail));
      skDetail = null;
      // 스킬 부품 (사용자 2026-11-16, tools/import-skill-parts.py) + 시안(10-skills) 실측: 성운 아치 창 + 시안 정면 고양이(preview-cat, 사용자 2026-11-16 「시안처럼 그 그림으로」) + 받침대,
      // 슬롯 카드 4장(1 › 2 › 3 › 4, 다시 1번), 프리셋·자동 배치·일괄 강화, 보유 효과, 스킬 줄(아이콘·이름·속성·설명 | 보기·넣기·강화).
      // 슬롯 고르기·넣기·빼기·프리셋·자동 배치·일괄 강화·길게 누르기 강화는 기존 함수 그대로. 10차는 나무(형꺼만)
      var skIco = function (sk, cls) { var a = CW.ICO.skillArt && CW.ICO.skillArt(sk.id); return a ? '<img class="' + cls + ' nw" src="' + a + '" alt="">' : '<span class="' + cls + ' old">' + CW.ICO.skill(sk.id) + '</span>'; };
      var cst = '<svg class="mcv-cst skv-cst" viewBox="0 0 359 128"><defs><radialGradient id="mcCstGlow"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".28" stop-color="#ffe4f4" stop-opacity=".6"/><stop offset=".62" stop-color="#e3d2ff" stop-opacity=".2"/><stop offset="1" stop-color="#e3d2ff" stop-opacity="0"/></radialGradient></defs>' +
        '<g class="ln"><polyline points="58.5,55.5 66.5,34 101,14"/><polyline points="295,35 265.5,57"/></g><g class="st">' + opStar(58.5, 55.5, 4.5) + opStar(66.5, 34, 3.6) + opStar(101, 14, 5.5, 1) + opStar(295, 35, 6, 1) + opStar(265.5, 57, 4.2) + '</g></svg>';
      var stage = '<div class="skv" aria-hidden="true"><i class="skv-neb"></i><i class="skv-rim"></i>' + cst + '<i class="skv-ped"></i>' +
        '<img class="skv-cat" src="' + (CW.ART_BASE || 'art/') + 'sk-cat.webp" alt=""></div>';
      var slots = '<div class="skslots">' + s.slots.map(function (id, i) {
        var sk = id && CW.skillById(id), on = i === selSlot;
        return '<button class="skc' + (on ? ' on' : '') + (sk ? '' : ' empty') + '" data-sel="' + i + '" aria-label="' + (i + 1) + '번 슬롯' + (sk ? ' ' + sk.name : ' 비어 있음') + '"><b class="n">' + (i + 1) + '</b>' +
          (sk ? '<span class="ic">' + skIco(sk, 'si') + '</span><span class="nm">' + sk.name + '</span><em class="lv">+' + CW.skillLevel(s, sk.id) + '</em>' : '<span class="ic"><i class="plus"></i></span><span class="nm">빈 칸</span><em class="lv">-</em>') + '</button>';
      }).join('') + '<i class="skar a1"></i><i class="skar a2"></i><i class="skar a3"></i>' +
        // 슬롯 카드에서 바로 빼기 (사용자 2026-11-16 「스킬 창에 스킬 빼기가 없다」): 찬 칸 귀퉁이 ×. 카드 버튼 안에 넣으면 카드 고르기로 눌려서 형제 버튼으로 둠
        s.slots.map(function (id, i) { return id ? '<button class="skx x' + (i + 1) + '" data-unslot="' + i + '" aria-label="' + (i + 1) + '번 슬롯 빼기"></button>' : ''; }).join('') + '</div>';
      var allOut = s.slots.some(Boolean) ? '<button class="skallout" data-act="unslotall">모두 빼기</button>' : '';
      var ret = '<div class="skret"><i></i><span>다시 1번</span></div>';
      var pre = '<div class="skpre"><div class="pp"><span>프리셋</span>' + [0, 1, 2].map(function (i) { return '<button class="pb' + ((s.preset || 0) === i ? ' on' : '') + '" data-preset="' + i + '" aria-pressed="' + ((s.preset || 0) === i) + '">' + (i + 1) + '</button>'; }).join('') + '</div><i class="sep"></i>' +
        '<button class="auto" data-act="autoskill"><i></i>자동 배치<i></i></button><button class="bulk" data-act="skillall">일괄 강화</button></div>';
      var own = '<div class="skown"><i></i><span>보유 효과</span><em>·</em><span>모든 스킬 피해</span><b data-opv="skown">+' + pct(CW.skillOwnedStats(s).skillDmg) + '</b></div>';
      var top = '<div class="skw">' + stage + slots + allOut + ret + pre + own + '</div>';
      var row = function (sk) {
        var locked = sk.tier > s.tier, at = s.slots.indexOf(sk.id), lv = CW.skillLevel(s, sk.id), max = lv >= DATA.balance.skillMaxLv, cost = CW.skillUpCost(sk, lv, s);
        var E = DATA.elements[sk.el] || { name: sk.el };
        var chip = '<span class="chip"><i class="el" style="--el:url(' + (CW.ART_BASE || 'art/') + 'sk-el-' + sk.el + '.webp)"></i>' + E.name + '<em>·</em>' + CW.skillTargetText(sk.targets) + '</span>';
        var btns = locked ? '<span class="lk"><i></i>' + sk.tier + '차 전직 후</span>'
          : '<button class="b see" data-skd="' + sk.id + '">보기</button>' +
            (at >= 0 ? '<button class="b out" data-unslot="' + at + '">' + (at + 1) + '번 빼기</button>' : '<button class="b put' + (selSlot >= 0 ? ' long' : '') + '" data-eq="' + sk.id + '">' + (selSlot >= 0 ? (selSlot + 1) + '번에 넣기' : '넣기') + '</button>') +
            '<button class="b up' + (max || s.gold < cost ? ' off' : '') + (max ? ' max' : '') + '" data-sup="' + sk.id + '" title="' + (max ? '최대 강화' : '강화 · 골드 ' + fmtG(cost)) + '">' + (max ? '최대' : '강화') + '</button>';
        return '<div class="skr' + (locked ? ' lock' : '') + (at >= 0 ? ' eq' : '') + '"><span class="tile' + (CW.ICO.skillArt && CW.ICO.skillArt(sk.id) ? '' : ' oldt') + '" data-opfx="sk:' + sk.id + '" data-opdur=".3">' + skIco(sk, 'ti') + (CW.isWeak(sk, CW.regionOf(s), s.diff) ? '<em class="wk" title="지금 지역에서 약점 피해 ×' + weakX(s) + '">약점</em>' : '') + '</span>' +
          '<span class="nm">' + sk.name + ' <b data-opv="sk:' + sk.id + '">' + (locked ? '' : '+' + lv) + '</b></span>' + chip + '<span class="how">' + (sk.how || '') + '</span><i class="dv"></i><span class="bs">' + btns + '</span></div>';
      };
      // 차수마다 작은 이름 줄 + 그 차수 스킬. 10차는 나무로 바뀌어 형꺼에만 (2026-11-16, the user: 10차 나무로, 친구꺼는 10차 올리지 말고)
      var list = DATA.tiers.map(function (t, i) {
        var n = i + 1, open = n <= s.tier;
        if (CW.FRIEND && n > CW.FRIEND_MAX_TIER) return '';
        return '<div class="sktier2' + (open ? '' : ' lock') + '"><i></i><b>' + n + '차</b><span>' + t.name + '</span>' + (open ? '' : '<small>' + (n >= 10 ? CW.tierGoal(n).replace(' 깨기', ' 처치') : (n - 1) + '-31 보스 처치') + ' 시 해금</small>') + '<i></i></div>' + DATA.skills.filter(function (sk) { return sk.tier === n; }).map(row).join('');
      }).join('');
      return top + '<div class="skl">' + list + '</div>';
    }
    // 스킬 상세 (시안 11-skill-detail 실측, 좌표는 .skd 기준 = 화면 x-16, y-40): 미리보기 무대(시전 자세 냥법사 → 세 발 → 연습 슬라임),
    // 미리보기(전투에서 실제 스킬)·다시 보기(무대 장면 다시), 시전자 → 대상 그림 + 속성·대상·설명, 강화 1회 효과(실제 수치),
    // 유리한 지역(펼침), 넣기/빼기 · 강화(골드, 길게 누르기). 판정·비용은 기존 함수 그대로
    function skillDetail(sk) {
      var s = G.state, A = CW.ART_BASE || 'art/', B = DATA.balance, E = DATA.elements[sk.el] || { name: sk.el };
      var locked = sk.tier > s.tier, at = s.slots.indexOf(sk.id), lv = CW.skillLevel(s, sk.id), max = lv >= B.skillMaxLv, cost = CW.skillUpCost(sk, lv, s);
      var art = CW.ICO.skillArt && CW.ICO.skillArt(sk.id), shot = sk.el === 'star' ? A + 'sk-proj-star.webp' : art;
      var shotEl = function (i) { return '<i class="p p' + i + '">' + (shot ? '<img src="' + shot + '" alt="">' : '<b class="orb" style="--c:' + (E.color || '#c8b8ff') + '"></b>') + '</i>'; };   // 새 원화가 없으면 속성 색 빛 구슬
      var cst = '<svg class="mcv-cst skd-cst" viewBox="0 0 359 200"><defs><radialGradient id="mcCstGlow"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".28" stop-color="#ffe4f4" stop-opacity=".6"/><stop offset=".62" stop-color="#e3d2ff" stop-opacity=".2"/><stop offset="1" stop-color="#e3d2ff" stop-opacity="0"/></radialGradient></defs>' +
        '<g class="ln"><polyline points="229,47 269,30"/></g><g class="st">' + opStar(229, 47, 4.2) + opStar(269, 30, 5.5, 1) + '</g></svg>';
      // 빛꼬리 (시안 실측 곡선): 지팡이 → 별까지는 굵게 빛나는 꼬리(지팡이 쪽은 투명), 별 → 슬라임 맞는 곳(282,125)은 가는 선, 맞는 곳에 반짝임
      var trA = ['M 166 91 C 186.4 83.3 211.1 73.4 232.4 82.8', 'M 167 97.5 C 197.2 90.2 227.3 100.6 256.8 104.7', 'M 167 101 C 189.1 105.4 210.2 113.6 232.2 118.6'];
      var trB = ['M 232.4 82.8 C 241.6 88.6 252.1 94.2 256.8 104.7', 'M 256.8 104.7 C 266.5 109.6 274.5 117.3 282 125', 'M 232.2 118.6 C 248.8 119.4 265.5 128.2 282 125'];
      var trX = [232.4, 256.8, 232.2];
      var trails = '<svg class="skd-tr" viewBox="0 0 359 195"><defs><filter id="skTrBlur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.7"/></filter>' +
        trX.map(function (x, i) { return '<linearGradient id="skTrG' + i + '" gradientUnits="userSpaceOnUse" x1="166" y1="0" x2="' + x + '" y2="0"><stop offset="0" stop-color="#e9d2ff" stop-opacity=".2"/><stop offset=".35" stop-color="#e4c6ff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>'; }).join('') +
        '<radialGradient id="mcCstGlow2"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="#ffe9f6" stop-opacity=".65"/><stop offset="1" stop-color="#e9d8ff" stop-opacity="0"/></radialGradient></defs>' +
        '<g class="b">' + trB.map(function (d, i) { return '<path class="l l' + (i + 1) + '" pathLength="1" d="' + d + '"/>'; }).join('') + '</g>' +
        trA.map(function (d, i) { return '<g class="a t' + (i + 1) + '"><path class="g" pathLength="1" filter="url(#skTrBlur)" d="' + d + '"/><path class="m" pathLength="1" stroke="url(#skTrG' + i + ')" d="' + d + '"/><path class="c" pathLength="1" stroke="url(#skTrG' + i + ')" d="' + d + '"/></g>'; }).join('') +
        '<g class="dots">' + [[180.4, 87, .9], [191.4, 85.1, .56], [199.9, 78.3, .89], [209.5, 74.1, .86], [218.9, 82.3, .68], [186.9, 93, .59], [201.6, 93.1, .67], [214, 97.1, .73], [225.6, 104.1, .85], [238.8, 102.9, .94], [182.2, 101.6, .53], [191.6, 108.4, .47], [202.3, 105.5, .71], [210.1, 112.3, .91], [218.7, 116.5, .71]].map(function (d, i) { return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '" style="--d:' + (-(i * 0.37) % 2).toFixed(2) + 's"/>'; }).join('') + '</g>' +
        '<g class="h">' + opStar(282, 125, 7, 1).replace('<g>', '<g class="hs">') + '</g></svg>';
      var stage = '<div class="skd-v run" aria-hidden="true"><i class="skd-neb"></i><i class="skd-rim"></i>' + cst + '<i class="skd-ped"></i>' +
        '<svg class="skd-wf" viewBox="0 0 359 195"><g class="w">' + opStar(158.8, 94, 15, 1).replace('<g>', '<g class="ws">') + '</g></svg>' +
        '<img class="skd-caster" src="' + A + 'sk-caster.webp" alt=""><i class="skd-glow"></i>' +
        '<img class="skd-slime" src="' + A + 'sk-slime.webp" alt="">' + trails + '<span class="skd-shots">' + shotEl(1) + shotEl(2) + shotEl(3) + '</span><i class="skd-hit"></i></div>' +
        '<button class="skd-back" data-skback aria-label="스킬 목록으로">‹</button>';
      var nT = sk.targets >= 99 ? '전체' : sk.targets + '마리';
      var tgt = sk.targets >= 99 ? '<i class="dg-area"></i>' : sk.targets > 1 ? '<i class="dg-arrow"></i><i class="dg-multi"></i>' : '<i class="dg-arrow"></i><i class="dg-dot"></i>';
      var stt = sk.status ? '<i class="dg-st" style="--st:url(' + A + 'sk-st-' + sk.status + '.webp)" title="' + ({ freeze: '빙결', shock: '감전', gather: '끌어당김' })[sk.status] + '"></i>' : '';
      var info = '<div class="skd-info"><b class="who">시전자 <em>→</em> 대상 ' + nT + '</b><span class="dg"><i class="dg-cast"></i><i class="dg-trail"></i><i class="dg-s s1"></i><i class="dg-s s2"></i><i class="dg-s s3"></i>' + tgt + stt + '</span><i class="dv"></i>' +
        '<span class="chips"><span class="c"><i class="el" style="--el:url(' + A + 'sk-el-' + sk.el + '.webp)"></i>' + E.name + '</span><span class="c"><i class="sp"></i>' + CW.skillTargetText(sk.targets) + '</span></span>' +
        '<span class="how">' + (sk.how || '') + '</span></div>';
      var head = '<div class="skd-h"><i></i><b>강화 1회 효과</b><i></i></div>';
      var up = '<div class="skd-up"><span class="org' + (lv >= 9 ? ' long' : '') + '">' + (max ? '+' + lv + ' <small>최대</small>' : '+' + lv + ' <em>→</em> <b>+' + (lv + 1) + '</b>') + '</span><i class="br"></i>' +
        '<p class="r1"><i></i>이 스킬 피해 <b>+' + Math.round(B.skillLvBonus * 100) + '%</b></p><p class="r2"><i></i>모든 스킬 피해 <b>+' + pct(B.skillOwnedPer) + '</b></p></div>';
      var weakNow = CW.isWeak(sk, CW.regionOf(s), s.diff);
      var reg = '<button class="skd-reg' + (skRegOpen ? ' on' : '') + '" data-skreg><i></i>유리한 지역 보기</button>' +
        (skRegOpen ? '<div class="skd-regs"><span class="rl">' + strongIn(sk.el, s) + '</span><small>' + (sk.el === 'all' ? '모든 지역에서 약점 피해 ×' + weakX(s) : weakNow ? '지금 지역에서 약점 피해 ×' + weakX(s) : '이 지역들에서 약점 피해 ×' + weakX(s)) + '</small></div>' : '');
      var first = s.slots.indexOf(null), target = selSlot >= 0 ? selSlot : first >= 0 ? first : s.slots.length - 1;
      var bot = locked ? '<div class="skd-bot lock"><i></i>' + sk.tier + '차 전직 후 쓸 수 있어요</div>'
        : '<div class="skd-bot">' + (at >= 0 ? '<button class="put out" data-unslot="' + at + '"><i></i>' + (at + 1) + '번 빼기<i></i></button>' : '<button class="put" data-eq="' + sk.id + '"><i></i>' + (target + 1) + '번에 넣기<i></i></button>') +
          '<button class="up' + (max || s.gold < cost ? ' off' : '') + '" data-sup="' + sk.id + '">' + (max ? '최대 강화' : '강화<i class="coin"></i><span>' + fmtG(cost) + '</span>') + '</button></div>';
      return '<div class="skd">' + stage + '<button class="skd-b play" data-prev="' + sk.id + '"><i></i>미리보기</button><button class="skd-b again" data-skagain><i></i>다시 보기</button>' + info + head + up + '</div>' + reg + bot;
    }
    function gearPanel() {
      if (gearSub === 'relic') return subTabs() + relicPanel();
      if (gearSub === 'costume') return subTabs() + costumePanel();
      if (gearSub === 'divine') return subTabs() + divinePanel();
      if (gearSub === 'sigil') return subTabs() + sigilPanel();
      if (gearSub === 'rune') return subTabs() + runePanel();
      return subTabs() + bagPanel();
    }
    function gachaPanel() {
      var s = G.state, lv = CW.gachaLevel(s.pulls), L = DATA.gacha.levels;
      var nextNeed = lv < L.length ? L[lv] : null, prev = L[lv - 1], rowNow = DATA.gacha.table[lv - 1];
      var newOdds = rowNow.slice(6).reduce(function (a, p) { return a + (p || 0); }, 0);   // 태초 and up (2026-11-15)
      var bar = nextNeed ? Math.min(100, (s.pulls - prev) / (nextNeed - prev) * 100) : 100;
      // 움직임은 값이 바뀌었을 때(탭을 열 때·뽑은 뒤)만 한 번 — 그냥 다시 그릴 때는 가만히 (renderPanel 이 class 를 붙인다)
      var gk = lv + '|' + s.pulls + '|' + s.pity; if (gk !== ghdSeen) { ghdPlay = true; ghdFrom = ghdSeen === null ? 0 : ghdBar; } ghdSeen = gk; ghdBar = bar;
      // 뽑기 레벨 칸 (2026-11-15, 사용자 그림): 다음 레벨 · 전설 확정 · 현재 확률을 한 줄씩 정리
      // 2026-11-16 사용자 「여기도 다르게」: 검은 칸 → 오팔(진주·청록) 칸. 왼쪽 빛나는 레벨 메달, 다음 레벨 막대, 아래 네 칸(전설 확정·전설·신화·태초 이상)
      var head = '<div class="gacha-head ghd gh2"><div class="lvl"><span class="lvn">' + lv + '</span><small>뽑기 레벨</small></div><div class="ghrows">' +
        '<p class="ghnext"><em>다음 레벨까지</em><b>' + (nextNeed ? (nextNeed - s.pulls) + '회' : '최고 레벨') + '</b></p><div class="ghbar"><i style="width:' + bar + '%"></i></div>' +
        '<div class="ghchips"><span class="c-pity"><em>전설 확정</em><b>' + (DATA.gacha.pity - s.pity) + '회</b></span>' +
        '<span class="c-leg"><em>전설</em><b>' + rowNow[4] + '%</b></span><span class="c-myth"><em>신화</em><b>' + rowNow[5] + '%</b></span><span class="c-pri"><em>태초 이상</em><b>' + Math.round(newOdds * 100) / 100 + '%</b></span></div></div></div>';
      var pulls = '<div class="pulls">' + [1, 10, 30, 100, 500].map(function (n) {
        return '<button class="pull ' + (n === 100 ? 'big' : n === 500 ? 'big huge' : '') + '" data-pull="' + n + '"><b>' + n + '회 뽑기</b><span><i class="gem"></i>' + fmt(CW.gachaCost(n)) + '</span><small class="note">' + (n >= 100 ? '영웅 이상 1개 보장' : n >= 10 ? '희귀 이상 1개 보장' : '장비 1개') + '</small></button>';
      }).join('') + '</div>';
      // 등장 확률 표는 뺐다 (2026-11-15, 사용자: 나중에 다시 만들 것). 현재 확률은 위 head 에 그대로 보인다.
      // 위의 큰 상자 장면 그림은 뺌 (2026-11-16, the user: 여기를 없애버리고) — 상자는 뽑기를 누를 때 나온다 (showGacha)
      var A = CW.ART_BASE || 'art/';
      return '<div class="gchest" aria-hidden="true"><i class="gcflash"></i><img class="cclosed" src="' + A + 'ui-chest-closed.webp" alt="" draggable="false"><img class="copen" src="' + A + 'ui-chest-open.webp" alt="" draggable="false">' +
        [1, 2, 3, 4, 5, 6, 7, 8].map(function (k) { return '<i class="gcsp s' + k + '"></i>'; }).join('') + '</div><h3>장비 뽑기</h3>' + head + pulls;   // 위 그림은 고양이 귀 상자 하나만 (2026-11-16, the user: 저 상자만 뽑기에다가 놔도)   // 아래 안내 글(다이아·패키지·연습용)은 뺌 (2026-11-16, the user: 이 글귀 없애버리고)
    }
    // 더보기: three parts only (2026-11-14): 전직 (when each job opens), 패키지 (everything for sale, practice only),
    // 설정 (how the game looks and plays; the rows for finding problems are folded away). Difficulty and going back to
    // an old region are on the map (stagePanel).
    function morePanel() {
      var s = G.state;
      var nextN = s.tier + 1;
      // 전직 (2026-11-16, the user: 보기 좋게 디자인해서 애니메이션, 글은 「전직 조건 · 루나틱 5-31 보스 깨기」처럼 간단히):
      // a track of the jobs on top (filled up to now), then a card per job — a medallion with the job's skill picture and
      // its number, the name, one condition line, and a mark (완료 ✓ · 지금 · 다음 · 자물쇠 · 준비 중). The cards slide in one
      // by one when 더보기 opens; the current one shines, the next one breathes. tierGoal: js/progress.js
      var hex = function (c) { return '#' + ('00000' + (c >>> 0).toString(16)).slice(-6); };
      var tjCard = function (n, name, sk, soon, k) {
        var st = soon ? 'soon' : s.tier > n ? 'done' : s.tier === n ? 'now' : n === nextN ? 'next' : 'lock';
        var mark = { done: '<span class="tjst done"><i></i>완료</span>', now: '<span class="tjst now">지금</span>', next: '<span class="tjst next">다음</span>', lock: '<span class="tjst lock"><i></i></span>', soon: '<span class="tjst soon">준비 중</span>' }[st];
        return '<div class="tjob st-' + st + '" style="--c:' + (sk ? hex(sk.color) : '#c8b4ff') + ';--k:' + k + '"><div class="tjmed"><span class="tjico">' + (sk ? CW.ICO.skill(sk.id) : '') + '</span><b class="tjn">' + n + '<small>차</small></b></div>' +
          '<div class="tjinfo"><div class="tjname">' + name + '</div><div class="tjcond"><i>전직 조건</i><span>' + CW.tierGoal(n) + '</span></div></div>' + mark + '</div>';
      };
      var jobs = DATA.tiers.map(function (t, i) {
        var n = i + 1; if (CW.FRIEND && n > CW.FRIEND_MAX_TIER) return null; // 체험판: the jobs past the 9th are not shown at all
        return { n: n, name: t.name, sk: CW.skillById(t.skill || (DATA.skills.filter(function (x) { return x.tier === n; })[0] || {}).id) };
      }).filter(Boolean).concat((CW.FRIEND ? [] : DATA.tierSoon || []).map(function (t) { return { n: t.n, name: t.name, soon: true }; }));
      var real = jobs.filter(function (j) { return !j.soon; }), fill = Math.max(0, Math.min(1, (s.tier - 1) / Math.max(1, real.length - 1)));
      var track = '<div class="tjtrack" style="--f:' + fill + '"><i class="tjbar"><i></i></i>' + real.map(function (j) {
        return '<b class="' + (s.tier > j.n ? 'done' : s.tier === j.n ? 'now' : '') + '" style="left:' + ((j.n - 1) / Math.max(1, real.length - 1) * 100) + '%">' + j.n + '</b>';
      }).join('') + '</div><p class="tjnow">지금 <b>' + s.tier + '차 ' + DATA.tiers[s.tier - 1].name + '</b></p>';
      var tiers = '<h3>전직</h3><div class="tjobs' + (tierAnim ? ' tjanim' : '') + '">' + track + jobs.map(function (j, k) { return tjCard(j.n, j.name, j.sk, j.soon, Math.min(k, 12)); }).join('') + '</div>';
      tierAnim = false;
      var won = function (v) { return v.toLocaleString('ko-KR') + '원'; };
      var gems = '<div class="subh">다이아</div><div class="shop">' + DATA.shop.map(function (p, i) {
        var first = !s.firstBuy[i];
        return '<div class="prod">' + (first ? '<span class="tag">첫 구매 2배</span>' : '') + '<div class="amt"><i class="gem"></i>' + fmt(p.gems * (first ? 2 : 1)) + '</div><div class="note">' + p.name + '</div>' + (CW.FRIEND ? '<button class="buy" disabled style="opacity:.5;filter:grayscale(1)">체험판</button>' : '<button class="buy gemb" data-shop="' + i + '">' + won(p.won) + '</button>') + '</div>';
      }).join('') + '</div>';
      var packLines = function (g) {
        var lines = [];
        if (g.daily) lines.push('<i class="gem"></i> 다이아 ' + fmt(g.daily.gems) + '개씩 ' + g.daily.days + '일');
        if (g.gems) lines.push('<i class="gem"></i> 다이아 ' + fmt(g.gems));
        if (g.goldMin) lines.push('<i class="coin"></i> 골드 ' + gh(CW.goldPerSecond(s) * 60 * g.goldMin) + ' (사냥 ' + (g.goldMin >= 60 ? g.goldMin / 60 + '시간' : g.goldMin + '분') + '치)');
        // marks for potions, pulls, runes and sigils too (2026-11-17, the user: 마크로, 물약도 그림으로 — js/notice-pages.js giveIco)
        var gi = function (k, gr) { return CW.giveIco ? '<i class="pkmi">' + CW.giveIco(k, gr) + '</i>' : ''; };
        if (g.potionMin) lines.push(gi('potion') + '물약 3종 ' + (g.potionMin >= 60 ? g.potionMin / 60 + '시간' : g.potionMin + '분'));
        if (g.pulls) lines.push(gi('pull') + '장비 뽑기 ' + g.pulls + '번 (다이아 안 씀)');
        (g.runes || []).forEach(function (x) { lines.push(gi('rune', x.grade) + '<b style="color:' + hc(x.grade) + '">' + hn(x.grade) + '</b> 룬 ' + x.n + '개'); });   // 겨울 패키지 (2026-11-17)
        if (g.runeStone) lines.push(CW.ICO.cur('rune') + ' 룬석 ' + fmt(g.runeStone));
        if (g.mana) lines.push(CW.ICO.cur('mana') + ' 마력석 ' + fmt(g.mana));
        (g.sigils || []).forEach(function (x) { lines.push(gi('sigil', x.grade) + '<b style="color:' + hc(x.grade) + '">' + hn(x.grade) + '</b> 신성력 ' + x.n + '개'); });
        if (g.sigilStone) lines.push(CW.ICO.cur('sigil') + ' 신성석 ' + fmt(g.sigilStone));
        // 2026-11-17 (형: 줄·칸 맞춰): 항목 하나는 끊기지 않는 덩어리 — 「(사냥 / 1시간치)」·「영웅 / 신성력」처럼 갈라지지 않고 항목 사이에서만 줄이 바뀜
        return lines.map(function (x) { return '<span class="pkit">' + x + '</span>'; }).join('<i class="pksep"> · </i>');
      };
      // 2026-11-17 (형: 글자로 나열하지 말고 상자 하나만 — 누르면 구매, 꾸욱 누르면 안에 뭐가 들었는지): one box tile a
      // package; a tap buys (data-pkbox → the old data-pack confirm), a long press opens pkInfo (contents + the same buy)
      var pkState = function (p) {
        var why = CW.packOpen(s, p.id);
        return why === 'ok' ? { ok: true, label: won(p.won) } : { ok: false, label: why === 'tier' ? p.need.tier + '차 전직 후' : why === 'limit' ? '수령 완료' : '받는 중' };
      };
      var packRow = function (p, k) {
        var st = pkState(p), times = (s.packs || {})[p.id] || 0;
        return '<button class="pkbox' + (st.ok ? '' : ' off') + '" data-pkbox="' + p.id + '" style="--pd:' + (k * 0.7) + 's">' +
          '<span class="pkpic">' + mi('pack', p) + (times && !p.limit && !p.give.daily ? '<em>' + times + '회</em>' : '') + '</span>' +
          '<span class="pkbody"><b class="pkname">' + p.name + '</b><span class="pkprice' + (st.ok ? '' : ' off') + '">' + st.label + '</span></span></button>';
      };
      pkInfo = function (id) {
        var p = CW.packById(id); if (!p) return;
        var st = pkState(p);
        modal('<div class="pkinfo"><div class="pkihead"><span class="pkpic">' + mi('pack', p) + '</span><div><h2>' + p.name + '</h2><em>' + won(p.won) + (p.limit ? ' · ' + p.limit + '번만' : '') + '</em></div></div>' +
          '<p class="pkisub">상자 안에 들어 있는 것</p><ul class="pkilist">' + pkTiles(p.give) + '</ul>' +
          '<p class="pkinote">받으면 가방에 상자로 들어가요.</p></div>',
          st.ok ? [{ label: '닫기' }, { label: won(p.won) + ' 받기', pri: true, fn: function () { pkBuy(id); } }] : [{ label: '닫기' }], { variant: 'guide', close: true });
      };
      // 구성품 창 (2026-11-17 형: 좁잖아, 한눈에 보기 좋게): two tiles a row — a big mark on top, the amount large, the name
      // and a short note under it
      var pkTiles = function (g) {
        var T = [], gi = function (k, gr) { return CW.giveIco ? CW.giveIco(k, gr) : ''; };
        var tile = function (ico, amt, name, note) { T.push('<li><span class="pkti">' + ico + '</span><b class="pkta">' + amt + '</b><span class="pktn">' + name + '</span>' + (note ? '<small>' + note + '</small>' : '') + '</li>'); };
        var hrs = function (m) { return m >= 60 ? m / 60 + '시간' : m + '분'; };
        if (g.daily) tile('<i class="gem"></i>', fmt(g.daily.gems) + ' × ' + g.daily.days + '일', '다이아', '매일 받기');
        if (g.gems) tile('<i class="gem"></i>', fmt(g.gems), '다이아');
        if (g.goldMin) tile('<i class="coin"></i>', gh(CW.goldPerSecond(s) * 60 * g.goldMin), '골드', '사냥 ' + hrs(g.goldMin) + '치');
        if (g.potionMin) tile(gi('potion'), hrs(g.potionMin), '물약 3종');
        if (g.pulls) tile(gi('pull'), g.pulls + '번', '장비 뽑기', '다이아 안 씀');
        (g.runes || []).forEach(function (x) { tile(gi('rune', x.grade), x.n + '개', '<b style="color:' + hc(x.grade) + '">' + hn(x.grade) + '</b> 룬'); });
        if (g.runeStone) tile(CW.ICO.cur('rune'), fmt(g.runeStone), '룬석');
        if (g.mana) tile(CW.ICO.cur('mana'), fmt(g.mana), '마력석');
        (g.sigils || []).forEach(function (x) { tile(gi('sigil', x.grade), x.n + '개', '<b style="color:' + hc(x.grade) + '">' + hn(x.grade) + '</b> 신성력'); });
        if (g.sigilStone) tile(CW.ICO.cur('sigil'), fmt(g.sigilStone), '신성석');
        return T.join('');
      };
      var dailyRow = function () {   // 매일 다이아: today's claim stays a plain row under the box (it is not a purchase)
        var dd = s.dailyGems || {};
        if (!(dd.left > 0)) return '';
        var took = dd.last === G.dayKey();
        return '<div class="pkdaily"><span>매일 다이아 남은 기간 <b>' + dd.left + '일</b></span>' + (took ? '<i>오늘 수령 완료</i>' : '<button class="btn pri" data-act="daily">오늘 다이아 받기</button>') + '</div>';
      };
      var pkHint = '<p class="pkhint">상자를 <b>꾸욱</b> 누르면 안에 든 걸 볼 수 있어요</p>';
      // 2026-11-17 (the user): 연습용 패키지 글 빼고, 다이아·매일 다이아·성장(골드 꾸러미·마력석 꾸러미)만 두고 룬·장비 뽑기는 빼 —
      // packages marked off stay in DATA for old saves; 겨울 신규 냥법사 comes first while its season lasts (packOpen 'over')
      var SECTIONS = [['winter', '❄️ 겨울 신규 냥법사 (한 번만)'], ['daily', '매일 다이아'], ['grow', '성장'], ['tier', '전직 축하 (한 번만)']];
      var packs = '<h3>패키지</h3>' + gems + pkHint + SECTIONS.map(function (sec) {
        var list = DATA.packs.filter(function (p) { return p.cat === sec[0] && !p.off && CW.packOpen(s, p.id) !== 'over'; });
        if (!list.length) return '';
        if (sec[0] === 'winter') {   // a frosty showcase with falling snow (2026-11-17, the user: 애니메이션화해서 보기 좋게)
          var dleft = Math.max(0, Math.ceil((Date.parse(list[0].until + 'T23:59:59+09:00') - Date.now()) / 864e5));
          var flakes = ''; for (var fi = 0; fi < 16; fi++) flakes += '<i style="--x:' + ((fi * 37) % 100) + '%;--d:' + (5 + (fi * 7) % 6) + 's;--w:' + (-((fi * 13) % 9)) + 's;--z:' + (0.5 + (fi % 4) * 0.25) + '"></i>';
          return '<div class="wpk"><div class="wsnow" aria-hidden="true">' + flakes + '</div><div class="wpkhead" style="background-image:url(' + (CW.ART_BASE || 'art/') + 'ui-winter-banner.webp)"><b>겨울 신규 냥법사</b><span>처음 오신 냥법사님께 · 각 1번</span><em>D-' + dleft + '</em></div>' +
            '<div class="pkgrid winter">' + list.map(packRow).join('') + '</div><p class="wpknote">룬은 3차, 신성력은 5차 전직 후 장착할 수 있어요 (가방에 보관)</p></div>';
        }
        return '<div class="subh">' + sec[1] + '</div><div class="pkgrid">' + list.map(packRow).join('') + '</div>' + (sec[0] === 'daily' ? dailyRow() : '');
      }).join('');
      var st = s.settings;
      // 화면 성능 (2026-11-17, 발열): everything about how hard the screen works, in one group (화질, 화면 빈도, 절전, 안티앨리어싱)
      var aaNow = !!(CW.aaOn && CW.aaOn());
      var perf = '<div class="subh">화면 성능</div><div class="list">' +
        '<div class="row"><div class="info"><div class="name">화질</div><div class="desc">화면이 끊기면 화질을 낮춰 보세요.</div></div><button class="btn" data-set="quality">' + ({ auto: '자동', high: '높음', mid: '보통', low: '낮음' })[st.quality] + '</button></div>' +
        // 60 is held to 60 even on a 120 Hz phone; 120 draws every refresh of a fast screen (warmer)
        '<div class="row"><div class="info"><div class="name">화면 빈도</div><div class="desc">120은 더 부드럽지만 폰이 더 뜨거워져요.' + (G.screenHz && G.screenHz() ? '<br>지금 화면 ' + G.screenHz() + 'Hz' : '') + '</div></div>' +
          '<div class="sbtns"><button class="btn' + ((st.fpsCap || 60) === 60 ? ' on' : '') + '" data-set="fps60">60</button><button class="btn' + ((st.fpsCap || 60) === 120 ? ' on' : '') + '" data-set="fps120">120</button></div></div>' +
        // 절전 (2026-11-15): the picture stays the same, only fewer pictures a second (js/framepace.js); 30 is the even one
        '<div class="row"><div class="info"><div class="name">절전 모드</div><div class="desc">화질을 유지하며 화면 재생 빈도를 낮춰요.</div></div><button class="btn" data-set="fpsCap">' + ({ 50: '50장', 40: '40장', 30: '30장' }[(st.fpsCap || 60)] || '끄기') + '</button></div>' +
        '<div class="row"><div class="info"><div class="name">안티앨리어싱</div><div class="desc">테두리를 매끄럽게 해요. 끄면 폰이 덜 뜨거워져요.<br>바꾸면 게임을 다시 불러와요.</div></div>' +
          '<div class="sbtns"><button class="btn' + (aaNow ? ' on' : '') + '" data-set="aaOn">켜기</button><button class="btn' + (aaNow ? '' : ' on') + '" data-set="aaOff">끄기</button></div></div>' +
        '</div><div class="subh">게임</div>';
      var settings = '<h3>설정</h3>' + perf + '<div class="list">' +
        '<div class="row"><div class="info"><div class="name">닉네임</div><div class="desc">' + esc(G.nickName()) + '</div></div><button class="btn" data-act="nick">변경</button></div>' +
        '<div class="row"><div class="info"><div class="name">화면 표현</div><div class="desc">기본 3D 또는 픽셀 스타일</div></div><button class="btn" data-set="pixel">' + (st.pixel ? '픽셀 스타일' : '기본 3D') + '</button></div>' +
        // 가로 시점 (2026-11-17): only while the phone is sideways (upright the screen is as it was)
        (CW.isLand && CW.isLand() ? '<div class="row"><div class="info"><div class="name">가로 화면 시점</div><div class="desc">옆에서: 냥법사 왼쪽, 몬스터 오른쪽으로 길게<br>멀리서: 앞에서 넓게 내려다봐요</div></div>' +
          '<div class="sbtns"><button class="btn' + (st.landView === 'far' ? '' : ' on') + '" data-set="landSide">옆에서</button><button class="btn' + (st.landView === 'far' ? ' on' : '') + '" data-set="landFar">멀리서</button></div></div>' : '') +
        '<div class="row"><div class="info"><div class="name">효과음</div></div><button class="btn" data-set="sound">' + (st.sound ? '켜짐' : '꺼짐') + '</button></div>' +
        dmgRow('dmgSize', '대미지 글씨 크기', '작게 하면 몬스터가 잘 보여요', st.dmgSize === undefined ? 60 : st.dmgSize, 30, 120) +
        dmgRow('dmgAlpha', '대미지 글씨 투명도', '낮출수록 글씨가 비쳐 보여요', st.dmgAlpha === undefined ? 85 : st.dmgAlpha, 10, 100) +
        '<div class="row"><div class="info"><div class="name">보스 자동 도전</div><div class="desc">끄면 도전 버튼을 눌러 보스전을 시작해요.</div></div><button class="btn" data-set="autoBoss">' + (st.autoBoss === false ? '꺼짐' : '켜짐') + '</button></div>' +
        // only in an iPhone home-screen app whose page lies under the clock (an icon added the old way), where the page
        // may be stretched to the screen (tools/build-site.cjs)
        (!CW.FRIEND && root.__cwFit && document.documentElement.classList.contains('under') ? '<div class="row"><div class="info"><div class="name">하단 메뉴 위치</div><div class="desc">메뉴가 잘리면 ‘안쪽’을 선택해 주세요.</div></div><button class="btn" data-set="bottomFit">' + (bottomInside() ? '안쪽' : '맨 아래') + '</button></div>' : '') +
        (G.storageOk() ? '' : '<p class="note">이 브라우저에서는 진행을 저장할 수 없어요.<br>창을 닫으면 진행이 사라져요.</p>') + '</div>' +
        (CW.FRIEND ? '' : '<details class="fold"' + (foldOpen ? ' open' : '') + '><summary>문제 확인용</summary><div class="list">' +
        '<div class="row"><div class="info"><div class="name">게임 버전</div><div class="desc">새 버전은 앱을 다시 열 때 적용돼요.</div></div><b class="appver" id="appVer">' + appVersion() + '</b></div>' +
        lastErrorRow() + hitchRow() + perfRows() + ownerSyncRow() + playerSyncRow() +
        '<div class="row"><div class="info"><div class="name">화면 높이</div><div class="desc" id="scrInfo">' + screenInfo() + '</div></div></div>' +
        '<div class="row"><div class="info"><div class="name">진행 초기화</div><div class="desc">모든 진행 데이터가 삭제돼요.</div></div><button class="btn" data-set="reset">처음부터 시작</button></div>' +
        '</div></details>');
      // each button shows only its own part (2026-11-15: they used to scroll down one long page of all three)
      // 체험판 (js/friend.js): no 패키지 part at all
      var parts = [['전직', tiers], ['패키지', packs], ['설정', settings]].filter(function (p) { return !(CW.FRIEND && p[0] === '패키지'); });
      if (moreSub >= parts.length) moreSub = 0;
      var jump = '<div class="jump three" role="tablist">' + parts.map(function (p, i) { return '<button role="tab" aria-selected="' + (i === moreSub) + '" data-jump="' + i + '">' + p[0] + '</button>'; }).join('') + '</div>';
      return jump + parts[moreSub][1];
    }
    // 패키지 상자 (morePanel): pkInfo is set there each time 더보기 › 패키지 is drawn; pkBuy gives the package (no payment)
    var pkInfo = function () {}, pkHeldAt = -1e9, pkHoldT = null;
    function pkBuy(id) {
      var pk = CW.packById(id), box = G.buyPack(id);
      if (!box) toast(CW.chestFull(G.state) ? '가방이 가득 찼어요. (최대 ' + CW.CHEST_CAP + '칸) 가방에서 열고 다시 받아 주세요.' : '현재 수령 조건을 충족하지 않아요.');
      else toast(pk.name + ' · 가방에 넣었어요');
      chestBadge(); renderPanel(true); hud();
    }
    function bottomInside() { try { return localStorage.getItem('cw-bottom') === 'inside'; } catch (e) { return false; } }
    // 문제 확인용 stays open while the page is made again (2026-11-17): its lines change on their own (화면 지연, 성능 기록
    // every 10 s), and each time the panel was rebuilt it folded shut under the finger
    var foldOpen = false;
    // the last error the game kept going through (main.js noteError), only when there was one: to find what broke
    function lastErrorRow() {
      var r = null; try { r = JSON.parse(localStorage.getItem('cw-lasterr') || 'null'); } catch (e) {}
      if (!r || !r.t) return '';
      var d = new Date(r.t), p2 = function (v) { return (v < 10 ? '0' : '') + v; };
      return '<div class="row"><div class="info"><div class="name">최근 오류 기록</div><div class="desc">' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ' · ' +
        esc(r.msg || '') + (r.at ? ' · ' + esc(r.at) : '') + ' (게임은 계속 돌아가요. 멈춤이 또 있으면 이 줄을 캡처해 보내 주세요)</div></div></div>';
    }
    // how often the picture stood still for more than 0.1 s in the last minute (main.js G.hitches)
    function hitchRow() {
      var h = G.hitches ? G.hitches() : null; if (!h) return '';
      return '<div class="row"><div class="info"><div class="name">화면 지연</div><div class="desc">최근 1분 ' + h.n + '회' + (h.n ? ' · 최장 ' + (h.worst / 1000).toFixed(1) + '초' : '') +
        ' (0.1초 넘게 멈춘 화면 수예요. 렉이 느껴질 때 이 줄을 캡처해 보내 주세요)</div></div></div>' + glLostRow();
    }
    // how often the phone took the fight's 3D picture away (main.js, cw-gllost), only when it has happened
    function glLostRow() {
      var r = null; try { r = JSON.parse(localStorage.getItem('cw-gllost') || 'null'); } catch (e) {}
      if (!r || !r.n) return '';
      var d = new Date(r.t), p2 = function (v) { return (v < 10 ? '0' : '') + v; };
      return '<div class="row"><div class="info"><div class="name">전투 화면 끊김</div><div class="desc">' + r.n + '회 · 마지막 ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) +
        ' · ' + (r.back ? '다시 그려짐' : r.reload && r.reload >= r.t ? '새로 불러옴' : '돌아오지 않음') + ' (폰이 그래픽 부담으로 전투 화면을 끊은 횟수예요. 멈춤이 또 있으면 이 줄을 캡처해 보내 주세요)</div></div></div>';
    }
    // 성능 표시 (2026-11-17, main.js · js/perfmon.js): a small box of live numbers over the game, and a row every 10 s kept
    // on this phone. The record reads as one line a minute and is copied to send back (실제 폰에서 발열·렉 재기).
    function perfRows() {
      if (!G.perfLog) return '';
      var on = G.perfOn(), L = G.perfLog(), rows = L && L.rows || [];
      var out = '<div class="row"><div class="info"><div class="name">성능 표시</div><div class="desc">게임 위에 1초에 그린 화면 수·화질·멈칫을 작게 보여 주고, 10초마다 이 폰에 기록해요. 20분쯤 플레이한 뒤 기록을 복사해 보내 주세요.</div></div>' +
        '<div class="sbtns"><button class="btn' + (on ? ' on' : '') + '" data-set="perfOn">켜기</button><button class="btn' + (on ? '' : ' on') + '" data-set="perfOff">끄기</button></div></div>';
      if (!rows.length) return out;
      var f = 0, dd = 0, h = 0; rows.forEach(function (r) { f += r.f; dd += r.d; h += r.h; });
      var d = new Date(L.start), p2 = function (v) { return (v < 10 ? '0' : '') + v; };
      return out + '<div class="row"><div class="info"><div class="name">성능 기록</div><div class="desc">' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) +
        '부터 ' + Math.floor(rows[rows.length - 1].t / 60) + '분 · 평균 ' + Math.round(dd ? f / dd : 0) + '장 · 멈칫 ' + h + '회</div></div>' +
        '<div class="sbtns"><button class="btn" data-act="perfview">보기</button><button class="btn" data-act="perfcopy">복사</button></div></div>';
    }
    // Claude에게 저장 보내기 (2026-11-18, js/owner-sync.js, main.js G.ownerSync): 형꺼 only (체험판 has no ownerSync at all)
    function ownerSyncRow() {
      var os = G.ownerSync; if (!os || CW.FRIEND) return '';
      var has = !!os.key(), s = os.status(), p2 = function (v) { return (v < 10 ? '0' : '') + v; };
      var when = function (t) { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
      var desc = !has ? 'Claude가 준 열쇠를 넣으면 10분마다, 그리고 앱을 내릴 때 저장을 보내요.'
        : (s.okAt ? '마지막으로 보낸 시각 ' + when(s.okAt) : '아직 보내지 않았어요') + (s.t && !s.ok ? ' · ' + when(s.t) + ' 실패: ' + esc(s.msg || '') : '') + ' · 10분마다 자동으로 보내요';
      return '<div class="row"><div class="info"><div class="name" style="word-break:keep-all">Claude에게 저장 보내기</div><div class="desc">' + desc + '</div></div>' +
        '<div class="sbtns">' + (has ? '<button class="btn" data-act="ownsend">지금 보내기</button><button class="btn" data-act="ownclear">열쇠 지우기</button>' : '<button class="btn" data-act="ownkey">열쇠 넣기</button>') + '</div></div>' +
        (has ? '<div class="row"><div class="info"><div class="name">저장 되돌리기</div><div class="desc">앱을 지웠다가 다시 깔았을 때 눌러요. 서버에 남은 가장 많이 진행한 저장을 불러와요.</div></div>' +
          '<div class="sbtns"><button class="btn" data-act="ownget">되돌리기</button></div></div>' : '');
    }
    // 모든 플레이어 저장 (2026-11-18, js/player-sync.js, main.js G.playerSync): only a status line, 형꺼 only
    function playerSyncRow() {
      var ps = G.playerSync; if (!ps || CW.FRIEND) return '';
      var desc = esc(CW.playerSyncText(ps.status()));   // a 429 reads "잠시 뒤에", not 실패 (js/player-sync.js)
      return '<div class="row"><div class="info"><div class="name">서버 저장</div><div class="desc">' + desc + '</div></div></div>';
    }
    // 저장 되돌리기: what the server keeps against this phone, then the save takes this phone's place (G.restoreSave)
    function ownRestore(r) {
      var p2 = function (v) { return (v < 10 ? '0' : '') + v; }, d = new Date(r.savedAt || 0), me = G.state;
      var when = r.savedAt ? (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ' 저장' : '';
      var head = CW.ownerSaveAhead(me, r.data) ? '<strong>이 기기 진행이 서버 저장보다 앞서 있어요.</strong><br>' : '';
      confirmBox('저장을 되돌릴까요?', head + '서버 저장 · <b>' + (r.data.tier || 1) + '차 Lv' + (r.data.level || 1) + '</b>' + (when ? ' · ' + when : '') +
        '<br>이 기기 · ' + (me.tier || 1) + '차 Lv' + (me.level || 1) + '<br>이 기기 진행이 서버 저장으로 바뀌어요.', '되돌리기', function () {
        if (G.restoreSave(r.data)) toast('저장을 되돌렸어요.'); else toast('저장을 불러오지 못했어요.');
        renderPanel(true); hud();
      }, { variant: 'danger' });
    }
    // one line a minute; a minute that ran under 80% of its aim or stood still is marked
    function showPerf() {
      var pm = G.perfMinutes(); if (!pm.length) { toast('아직 기록이 없어요. 10초 뒤에 다시 봐 주세요.'); return; }
      var QN = { high: '높음', mid: '보통', low: '낮음' }, hasB = pm.some(function (o) { return o.b !== undefined; });
      var th = '<tr><th>분</th><th>장</th><th>최장</th><th>계산</th><th>화질</th><th>효과</th><th>멈칫</th>' + (hasB ? '<th>배터리</th>' : '') + '</tr>';
      var tb = pm.map(function (o) {
        var bad = o.fps < (o.a || 60) * 0.8 || o.h > 0;
        return '<tr' + (bad ? ' class="bad"' : '') + '><td>' + o.m + '</td><td>' + Math.round(o.fps) + '/' + (o.a || 60) + '</td><td>' + Math.round(o.w) + '</td><td>' + o.c.toFixed(1) + '</td><td>' +
          (QN[o.q] || '-') + (o.pr ? '×' + (Math.round(o.pr * 100) / 100) : '') + '</td><td>' + Math.round((o.k === undefined ? 1 : o.k) * 100) + '%</td><td>' + o.h + '</td>' +
          (hasB ? '<td>' + (o.b === undefined ? '-' : o.b + '%' + (o.ch ? '⚡' : '')) + '</td>' : '') + '</tr>';
      }).join('');
      modal('<h2>성능 기록</h2><p class="guide-lead">한 줄이 1분이에요. 장 = 1초에 그린 화면 수, 최장·계산은 ms(1000분의 1초). 빨간 줄은 느려졌거나 멈칫한 분이에요.</p><div class="perftab"><table>' + th + tb + '</table></div>',
        [{ label: '닫기' }, { label: '복사', pri: true, fn: copyPerf }], { variant: 'guide', close: true });
    }
    function copyPerf() {
      var t = G.perfText ? G.perfText() : ''; if (!t) { toast('아직 기록이 없어요.'); return; }
      var show = function () { modal('<h2>성능 기록</h2><p class="guide-lead">글 전체를 복사해 보내 주세요.</p><textarea class="codebox" readonly>' + esc(t) + '</textarea>', [{ label: '확인', pri: true }], { variant: 'guide' }); var ta = $('modalCard').querySelector('textarea'); ta.focus(); ta.select(); };
      try { navigator.clipboard.writeText(t).then(function () { toast('성능 기록을 복사했어요. 그대로 붙여 넣어 보내 주세요.'); }, show); } catch (err) { show(); }
    }
    // the heights this phone reports (to find out why the bottom is cut on some iPhones): what is visible, the page,
    // the whole screen, the safe gaps at the top and bottom, and how tall the game really is
    function screenInfo() {
      var vv = root.visualViewport, de = document.documentElement, app = document.getElementById('app'), pr = document.getElementById('safeProbe');
      if (!pr) { pr = document.createElement('div'); pr.id = 'safeProbe'; pr.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)'; document.body.appendChild(pr); }
      var cs = getComputedStyle(pr), r = function (v) { return Math.round(v || 0); };
      return '보이는 ' + r(root.innerHeight) + ' · 뷰 ' + r(vv ? vv.height : 0) + ' · 페이지 ' + r(de.clientHeight) + ' · 화면 ' + r(screen.height) +
        ' · 위 여백 ' + r(parseFloat(cs.paddingTop)) + ' · 아래 여백 ' + r(parseFloat(cs.paddingBottom)) + ' · 게임 ' + r(app ? app.getBoundingClientRect().height : 0) +
        ' (아래가 잘리면 이 줄을 캡처해 보내 주세요)';
    }
    // the version this phone is running: the offline copy of the site is stored under "cw-<version>"
    var appVer = '';
    function appVersion() {
      if (!appVer && root.caches && caches.keys) {
        appVer = '확인 중';
        caches.keys().then(function (ks) {
          var k = ks.filter(function (x) { return /^cw-[0-9a-f]+$/.test(x); })[0];
          appVer = k ? k.slice(3) : '개발 버전'; var el = document.getElementById('appVer'); if (el) el.textContent = appVer;
        }).catch(function () { appVer = '개발판'; });
      }
      return appVer || '개발판';
    }
    // The whole map picture (art/ui-map.webp, 382x492) with a button on each island (2026-11-14): an open island goes
    // straight to that hunting ground on the difficulty shown, and its painted lock is covered with the picture's own
    // star medal (art/ui-map-open.webp, cut from island 1, which is painted open); a closed island keeps its painted
    // lock. LOCKS: the centre of each painted lock, in % of the picture (measured by matching the lock; the castle, the
    // 10th, has none painted, so the lock medal art/ui-map-lock.webp is put on it while it is closed).
    var LOCKS = [[19.63, 18.09], [50.79, 16.87], [82.72, 24.19], [18.32, 40.45], [49.21, 39.63], [81.94, 45.93], [18.32, 65.04], [49.48, 65.04], [79.58, 70.93], [62.8, 88.0]];
    // what opens a locked difficulty: the last boss of the difficulty before (늑대 왕, then 신들의 왕 in the sky world)
    function diffLockText(d) { return '이전 난이도 10-31의 ' + CW.regionAt(d - 1, 9).boss.name + ' 처치 시 해금'; }
    // 하늘 세계 (2026-11-17): the user's sky map (art/ui-map-sky.webp, art-src/sky-20261117/E-sky-map.webp), 1 at the bottom
    // left up to the throne on top; no locks are painted, so every island gets its medal (open or locked) from the code.
    var LOCKS_SKY = [[17.2, 81.9], [48.4, 80.8], [81.0, 81.5], [81.9, 58.3], [48.4, 58.3], [17.2, 58.7], [17.2, 34.8], [50.2, 34.8], [82.4, 35.5], [50.2, 14.1]];
    function worldMap(d, open, frontier, here) {
      var hereR = here >= 0 ? CW.stageInfo(here).region : -1, sky = CW.worldOf(d) === 1;
      return '<div class="wmap' + (sky ? ' sky' : '') + '">' + (sky ? LOCKS_SKY : LOCKS).map(function (p, i) {
        var on = open && i * 31 <= frontier, at = 'left:' + p[0] + '%;top:' + p[1] + '%';
        // the island goes to the furthest stage reached in it that is not a boss (x-29), or the front line in it
        var dest = Math.min(frontier, i * 31 + 28);
        var medal = on ? '<i class="wmedal' + (i === hereR ? ' cur' : '') + '" style="' + at + '"></i>' : i === 9 || sky ? '<i class="wmedal shut" style="' + at + '"></i>' : '';
        return medal + '<button class="wisle" style="' + at + '" aria-label="' + CW.regionAt(d, i).name + '" ' +
          (on ? 'data-sgo="' + dest + '" data-sd="' + d + '"' : 'data-wlock="' + (open ? i : -1) + '"') + '></button>';
      }).join('') + '</div>';
    }
    // the region's dusts for half an hour of hunting (at the kill cap) and for half an hour away, its specialty marked
    function fieldBox(d, R) {
      var B = DATA.balance.dust, sp = CW.dustSpecial(R), D = DATA.difficulties[d] || {}, sc = (1 + R) * (D.gemMul || 1);
      var play = 2880 * B.killPer * sc, away = B.awayPer30 * sc, rs = CW.runeStoneForBoss({ tier: 99, diff: d }, true, R * 31);
      var item = function (k, nm, m) { return '<span class="fb-i' + (sp.key === k ? ' sp' : '') + '"><i class="dusti ' + (k === 'rune' ? 'dr' : 'ds') + '"></i>' + nm + ' <b>' + fmt(Math.round(play * m)) + '</b><small>방치 ' + fmt(Math.round(away * m)) + '</small>' + (sp.key === k ? '<em>×' + B.specialMul + ' 잘 나와요</em>' : '') + '</span>'; };
      return '<div class="fbox"><div class="fb-h">필드 사냥 30분</div>' + item('rune', '룬 가루', sp.rune) + item('sigil', '신성력 가루', sp.sigil) +
        '<span class="fb-i rs"><i class="runestone"></i>룬석 <b>보스 ' + fmt(CW.runeStoneForBoss({ tier: 99, diff: d }, false, R * 31)) + ' · 지역 보스 ' + fmt(rs) + '</b></span>' +
        '<span class="fb-i rs"><i class="sigilstone"></i>신성석 <b>보스 ' + fmt(CW.sigilStoneForBoss({ tier: 99, diff: d }, false, R * 31)) + ' · 지역 보스 ' + fmt(CW.sigilStoneForBoss({ tier: 99, diff: d }, true, R * 31)) + '</b></span></div>';
    }
    function stagePanel() {
      var s = G.state, d = selDiff < 0 ? (s.diff || 0) : selDiff, R = selRegion < 0 ? CW.stageInfo(s.stage).region : selRegion;
      var best = d === (s.diff || 0) ? s.best : ((s.diffBest || {})[d] ? s.diffBest[d].best : -1), frontier = Math.min(309, best + 1), here = d === (s.diff || 0) ? s.stage : -1;
      var st = CW.stats(s), reg = CW.regionAt(d, R), open = d <= (s.diffUnlocked || 0);
      var head = '<div class="dsel"><button class="btn" data-dsel="-1" aria-label="이전 난이도">◀</button><b>' + DATA.difficulties[d].name + (open ? '' : ' (잠김)') + '</b><button class="btn" data-dsel="1" aria-label="다음 난이도">▶</button></div>' +
        // only when the difficulty is locked: what opens it (2026-11-15: the 보스 체력/몬스터/다이아 line and the help lines were taken out)
        (open ? '' : '<div class="note dnote">' + diffLockText(d) + '</div>') +
        (open ? '<button class="btn pri dgo" data-sgo="' + frontier + '" data-sd="' + d + '">' + (d === (s.diff || 0) ? '도전 중인 판으로' : DATA.difficulties[d].name + ' 도전 중인 판으로') + ' (' + CW.stageLabel(frontier) + ')</button>' : '') +
        worldMap(d, open, frontier, here) +
        '<div class="rsel">' + CW.regionsOf(d).map(function (r, i) { return '<button class="rchip' + (i === R ? ' on' : '') + (i * 31 > frontier ? ' lock' : '') + '" data-rsel="' + i + '">' + (i + 1) + '<i class="dusti ' + (CW.dustSpecial(i).key === 'rune' ? 'dr' : 'ds') + '"></i></button>'; }).join('') + '</div>' +
        // what hunting here gives besides gold and xp (2026-11-17, the user: 지도에 룬석·가루 얼마나 나오는지, 잘 나오는 지역 표시)
        fieldBox(d, R) +
        '<div style="height:8px"></div>';
      var rows = '', dz = CW.dustSpecial(R); dz.play = 2880 * DATA.balance.dust.killPer * (1 + R) * ((DATA.difficulties[d] || {}).gemMul || 1);
      for (var n = 0; n < 31; n++) {
        var i = R * 31 + n, info = CW.stageInfo(i), lock = !open || i > frontier, tmp = { stage: i, diff: d, up: s.up };
        var res = { id: info.isBoss ? CW.stageBoss(i, d).art : reg.monsters[(n * 5) % reg.monsters.length], tint: null };
        // the name beside the picture: the same names as the monster codex (js/bestiary.js; a region boss's own name)
        var mname = info.isBoss ? CW.stageBoss(i, d).name : ((CW.BESTIARY || {})[res.id] || {}).name || '';
        // what kind of stage it is sits small above the name (it used to follow the stage number and wrapped the row taller)
        var kind = CW.isTierTrial(s, i, d) ? '전직 시험' : info.isRegionBoss ? '지역 보스' : info.isBoss ? '보스' : '';
        // the same numbers the game uses (stage-rewards.js): one monster, or the boss and what beating it gives
        var img = G.thumb(res.id), rw = CW.stageRewards(tmp, st, !(s.firstClear || {})[CW.clearKey({ diff: d }, i)]);
        rows += '<button class="srow' + (i === here ? ' here' : '') + (info.isBoss ? ' boss' : '') + '" data-sgo="' + i + '" data-sd="' + d + '"' + (lock ? ' disabled' : '') + '>' +
          '<span class="sname">' + (rw.gems ? '<small><i class="gem"></i>' + fmt(rw.gems) + '</small>' : '') + CW.stageLabel(i) + '</span>' +
          '<span class="smon">' + (img ? '<img src="' + img + '" alt="" style="' + (res.tint ? 'filter:hue-rotate(' + (R * 36) + 'deg)' : '') + '">' : '') + '</span>' +
          '<span class="snm">' + (kind ? '<small>' + kind + '</small>' : '') + '<b>' + mname + '</b></span>' +
          '<span class="srews"><span class="srew"><i class="coin"></i>' + gh(rw.gold) + '</span><span class="srew"><b class="xpdot"></b>' + fmt(rw.xp) + '</span>' +
          (info.isBoss ? '<span class="srew"><i class="runestone"></i>' + fmt(CW.runeStoneForBoss({ tier: 99, diff: d }, info.isRegionBoss, i)) + '</span><span class="srew"><i class="sigilstone"></i>' + fmt(CW.sigilStoneForBoss({ tier: 99, diff: d }, info.isRegionBoss, i)) + '</span>'
            // field rows: both dusts for half an hour of hunting here (the user: 일반 필드 사냥 줄에도 가루 표시), the region's specialty bold
            : '<span class="srew dz' + (dz.key === 'rune' ? ' sp' : '') + '"><i class="dusti dr"></i>' + fmt(Math.round(dz.play * dz.rune)) + '</span><span class="srew dz' + (dz.key === 'sigil' ? ' sp' : '') + '"><i class="dusti ds"></i>' + fmt(Math.round(dz.play * dz.sigil)) + '</span>') +
          '<span class="srew muted hp"><b class="hpdot"></b><span class="hpbox"><b class="hpheart"></b>HP ' + CW.fmtHp(rw.hp) + '</span></span></span>' +
          '<span class="sgo">' + (lock ? '🔒' : i === here ? '여기' : '이동') + '</span></button>';
      }
      return head + '<div class="slist">' + rows + '</div>';
    }
    var PANELS = { dungeon: dungeonPanel, stage: stagePanel, up: trainPanel, skill: skillPanel, gear: gearPanel, gacha: gachaPanel, more: morePanel };
    // a redraw puts a fresh mana circle in the panel; its rings take their angle from the clock (so they never jump back to
    // the start) and a level-up pulse / new-circle burst that is still playing carries on from where it was
    var circleFxNow = null, MC_SPIN = [['.mc-out i', 90], ['.mc-mid i', 60], ['.mc-in i', 24]];
    function keepCircle() {
      var dev = panel.querySelector('.opdev[data-dev="circle"]');
      if (dev) {   // 오팔 장치: 같은 렌더러를 새 자리로 옮기고, 실제 레벨업이 있었을 때만 반응
        var fx = circleFx; circleFx = '';
        if (CW.opalUI) { CW.opalUI.mount(dev, 'circle', circleVm); if (fx) CW.opalUI.play(fx); }
        return;
      }
      var nm = panel.querySelector('.mcx'), t = performance.now() / 1000;
      if (circleFx) { circleFxNow = { k: circleFx, at: t }; circleFx = ''; }
      if (!nm) return;
      MC_SPIN.forEach(function (r) { var el = nm.querySelector(r[0]); if (el) el.style.animationDelay = -(t % r[1]).toFixed(3) + 's'; });
      var f = circleFxNow, e = f ? t - f.at : 9, dur = f && f.k === 'tierup' ? 1.3 : 0.7;
      if (!f || e >= dur) return;
      nm.classList.add(f.k);
      var d = -e.toFixed(3) + 's', core = nm.querySelector('.mc-core'), burst = nm.querySelector('.mc-burst'), fl = f.k === 'tierup' ? 1 : 0.5;
      burst.style.animationDelay = d; if (f.k === 'tierup') nm.style.animationDelay = d;
      core.style.animationDelay = d + ',' + (fl - e).toFixed(3) + 's';
    }
    // the stage list's reward column is as wide as its widest entry, so every row lines up. The name keeps at least
    // STAGE_NAME_MIN px: when the rewards would take that (the long numbers of hard difficulties) they get a smaller size.
    // A name that still does not fit in two lines gets the smaller size too.
    var STAGE_NAME_MIN = 56;
    // a growth row's name and level share one line: a long name gets just small enough to fit beside its level
    function fitGrowNames() {
      // every buy button as wide as the widest price in the list (so the boxes end in one line), never cutting a price
      var list = panel.querySelector('.list'), bw = 0, buys = panel.querySelectorAll('.row.grow .buy');
      if (list) list.style.removeProperty('--buyw');
      buys.forEach(function (b) { b.style.width = 'max-content'; bw = Math.max(bw, b.getBoundingClientRect().width); b.style.width = ''; });
      if (list && bw) list.style.setProperty('--buyw', Math.ceil(bw) + 'px');
      // 좁은 폰 (2026-11-17, 사용자: 줄·칸·너비·간격 깔끔하게): 이름이 12px 밑으로 줄거나 잘리면 목록 전체의 Lv 를
      // 아이콘 아래로 내림(lvdown) — 이름 칸을 넓혀 한 줄에 다 보이고, 줄마다 모양이 같게
      if (list) list.classList.remove('lvdown');
      // 이름 글씨 크기와 /최대 표시는 목록 전체가 같게 (2026-11-17): 가장 긴 이름에 맞춘 크기를 모든 줄에
      var sizeNames = function () {
        var names = Array.prototype.filter.call(panel.querySelectorAll('.row.grow .name'), function (n) { return n.querySelector('.nm'); });
        var fitAll = function () {
          var low = 99;
          names.forEach(function (n) {
            var nm = n.querySelector('.nm'), full = nm.scrollWidth, room = nm.clientWidth;
            if (full > room + 0.5) low = Math.min(low, parseFloat(getComputedStyle(nm).fontSize) * (room - 1) / full);
          });
          return low;
        };
        names.forEach(function (n) { n.querySelector('.nm').style.fontSize = ''; n.classList.remove('nomax'); });
        var low = fitAll();
        if (low < 13.5) { names.forEach(function (n) { n.classList.add('nomax'); }); low = fitAll(); }   // 긴 이름이 있으면 모든 줄에서 Lv 옆 /최대를 빼고 글씨를 덜 줄임
        if (low < 99) names.forEach(function (n) { n.querySelector('.nm').style.fontSize = Math.max(10, low).toFixed(2) + 'px'; });
        return low;
      };
      if (sizeNames() < 12 && list) { list.classList.add('lvdown'); sizeNames(); }
      // 수치 상자: 숫자가 길면 글씨만 줄여 양 끝 여백 유지 (최소 10.5px)
      // 2026-11-18: 칸마다 넣고-재기를 번갈아 하면 칸 수만큼 배치 계산을 다시 해서 좁은 폰(갤럭시 폭)에서 훈련이 늦게 열렸음
      // → 모든 칸을 단계마다 한꺼번에 (지우기 → 재기 → 줄이기 → 다시 재기 → 두 줄) — 칸끼리는 서로 영향이 없어 결과는 같음
      var pills = [].slice.call(panel.querySelectorAll('.row.grow .gpill'));
      var pillUsed = function (g, gap) { var u = 0; Array.prototype.forEach.call(g.children, function (c, i) { u += c.getBoundingClientRect().width + (i ? gap : 0); }); return u; };
      var pillRoom = function (g) { var cs = getComputedStyle(g); return g.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
      pills.forEach(function (g) { g.style.fontSize = ''; g.classList.remove('pill2'); });
      var pm = pills.map(function (g) { var cs = getComputedStyle(g), gap = parseFloat(cs.columnGap) || 0; return { gap: gap, room: pillRoom(g), used: pillUsed(g, gap), fs: parseFloat(cs.fontSize) }; });
      pills.forEach(function (g, i) {
        var m = pm[i], prevFs = g.__fs;   // 같은 칸의 글씨는 강화해서 숫자가 바뀌어도 다시 커지지 않음 (오르락내리락 흔들림 없음, 사용자 2026-11-18)
        if (m.used > m.room + 0.5) g.style.fontSize = Math.max(10.5, m.fs * (m.room - 1) / m.used).toFixed(2) + 'px';
        if (prevFs && parseFloat(g.style.fontSize || m.fs) > prevFs + 0.01) g.style.fontSize = prevFs.toFixed(2) + 'px';
      });
      // 원소 지배 (약점 +200% · 폭주 +400% → …): wider than the box even at 10.5px → two lines in a taller box (the now-value above, → and the next one below), nothing runs out of it
      var two = pills.map(function (g, i) { return pillUsed(g, pm[i].gap) > pillRoom(g) + 3; });
      pills.forEach(function (g, i) { if (two[i]) { g.style.fontSize = ''; g.classList.add('pill2'); } });
      pills.forEach(function (g) { g.__fs = g.classList.contains('pill2') ? 0 : parseFloat(getComputedStyle(g).fontSize); });
      // 성장 시안 (2026-11-16): 설명도 한 줄 — 넘치면 9.5px 까지 줄이고, 그래도 넘치면 두 줄로 (위와 같이 단계마다 한꺼번에)
      var abouts = [].slice.call(panel.querySelectorAll('.row.grow .gabout'));
      abouts.forEach(function (g) { g.style.fontSize = ''; g.classList.remove('wrap'); });
      abouts.map(function (g) { return { full: g.scrollWidth, room: g.clientWidth, fs: parseFloat(getComputedStyle(g).fontSize) }; }).forEach(function (m, i) {
        var g = abouts[i]; if (m.full > m.room + 0.5) { var fs = m.fs * (m.room - 1) / m.full; if (fs >= 9.5) g.style.fontSize = fs.toFixed(2) + 'px'; else g.classList.add('wrap'); }
      });
      // 설명이 두 줄인 칸이 있으면 성장 칸 높이를 모두 그 칸에 맞춤 — 칸마다 키가 들쭉날쭉하지 않게 (2026-11-17)
      var rows = panel.querySelectorAll('.row.grow'), tall = 0;
      rows.forEach(function (r) { r.style.minHeight = ''; });
      if (panel.querySelector('.row.grow .gabout.wrap, .row.grow .gpill.pill2')) {
        rows.forEach(function (r) { tall = Math.max(tall, r.getBoundingClientRect().height); });
        rows.forEach(function (r) { r.style.minHeight = Math.ceil(tall) + 'px'; });
      }
    }
    // 연금술 카드: 효과 알약·만들기 버튼 글이 칸보다 길면 글씨만 줄임 (최소 9.5px) — 값·비용은 그대로 다 보이게
    // 장비 (사용자 2026-11-16 아이폰): 효과 숫자가 길면 「장착 효과」 위로 넘쳐 겹치고, 레벨업 비용이 버튼 밖으로 넘침 → 글자만 줄임.
    // 효과가 둘(반지: 공격 속도 · 보스 피해)이면 두 줄로 나눔
    function fitGear() {
      var shrink = function (el, kids, min) { var g = 0; while (el.scrollWidth > el.clientWidth + 0.5 && g++ < 16) { var done = true; kids.forEach(function (k) { var f = parseFloat(getComputedStyle(k).fontSize); if (f > min) { k.style.setProperty('font-size', Math.max(min, f * 0.95).toFixed(2) + 'px', 'important'); done = false; } }); if (done) break; } };
      // 코스튬 카드 이름 (2026-11-17, 형: 줄·칸 맞춰): 「시계태엽 가면 …」처럼 잘리지 않게 글씨만 줄임
      panel.querySelectorAll('.ccard>b').forEach(function (b) { b.style.removeProperty('font-size'); shrink(b, [b], 8.5); });
      // 잠재력 줄 (형 2026-11-18 「칸맞춤」): 좁은 폰에서 「솔라 크리티컬 피해 +0.07배」가 「…」로 잘리던 것 → 글씨만 줄여 다 보이게
      panel.querySelectorAll('.opbag .potline>span').forEach(function (p) { p.style.removeProperty('font-size'); shrink(p, [p], 9); });
      // 같은 장비를 계속 올리는 동안 효과 숫자 글씨 크기는 다시 커지지 않음 (숫자 자릿수가 늘 때만 한 번 더 줄고, 오르락내리락 흔들리지 않게 — 사용자 2026-11-18)
      var gkey = ((panel.querySelector('.opbag .bname b') || {}).textContent || '') + '|' + ((panel.querySelector('.opbag .ggr') || {}).textContent || ''), gmem = fitGear.mem && fitGear.mem.k === gkey ? fitGear.mem.f : [];
      panel.querySelectorAll('.opbag .ef b').forEach(function (v, vi) {
        if (gmem[vi]) v.style.setProperty('font-size', gmem[vi] + 'px', 'important');
        // 두 효과(반지: 공격 속도·보스 피해)는 이름 칸 | 숫자 칸 두 줄 표로 — 이름은 왼쪽, 숫자는 오른쪽 끝을 맞춤 (사용자 2026-11-16)
        if (v.textContent.indexOf(' · ') > 0 && !v.classList.contains('two')) {
          v.innerHTML = v.textContent.split(' · ').map(function (t) { var at = t.lastIndexOf(' +'); return at > 0 ? '<span class="k">' + t.slice(0, at) + '</span><span class="v">' + t.slice(at + 1) + '</span>' : '<span class="k"></span><span class="v">' + t + '</span>'; }).join('');
          v.classList.add('two');
        }
        // 두 줄 표인 줄은 한 줄 높이(22px) 고정에서 뺌 (형 2026-11-18: 반지 효과 두 줄이 겹쳐 보임)
        if (v.classList.contains('two')) v.closest('.ef').classList.add('tw2');
        shrink(v, [v], 9.5);
      });
      // 효과가 하나인 줄도 「공격력」 칸 | 숫자 칸으로 나눠, 장착·보유 두 줄의 「공격력」을 같은 세로줄에 (숫자 길이가 달라 어긋나던 것,
      // 형 2026-11-18 「여기 안 맞다」). 숫자는 오른쪽 끝을 맞춤, 두 줄은 같은 글자 크기·같은 칸 너비
      var ones = [].slice.call(panel.querySelectorAll('.opbag .ef b')).filter(function (v) { return !v.classList.contains('two'); });
      ones.forEach(function (v) {
        if (!v.querySelector('.v')) { var t = v.textContent, at = t.lastIndexOf(' +'); if (at > 0) v.innerHTML = '<span class="k">' + t.slice(0, at) + '</span><span class="v">' + t.slice(at + 1) + '</span>'; }
        if (v.children.length === 2) v.classList.add('one');
      });
      ones = ones.filter(function (v) { return v.classList.contains('one'); });
      if (ones.length > 1) {
        var fmin1 = Math.min.apply(null, ones.map(function (v) { return parseFloat(getComputedStyle(v).fontSize); }));
        ones.forEach(function (v) { v.style.setProperty('font-size', fmin1 + 'px', 'important'); v.style.gridTemplateColumns = ''; });
        var fitOnes = function () {
          ones.forEach(function (v) { v.style.gridTemplateColumns = ''; });
          var cols1 = [0, 1].map(function (i) { return Math.max.apply(null, ones.map(function (v) { return Math.ceil(v.children[i].getBoundingClientRect().width); })); });
          ones.forEach(function (v) { v.style.gridTemplateColumns = cols1[0] + 'px ' + cols1[1] + 'px'; });
        };
        fitOnes();
        // 칸으로 나누며 생긴 사이(5px)만큼 넘치면 (「골드 획득 +353400%」 등) 두 줄 같이 글씨를 조금씩 줄임
        for (var gi = 0; gi < 14 && fmin1 > 9 && ones.some(function (v) { return v.scrollWidth > v.clientWidth + 0.5; }); gi++) {
          fmin1 = Math.max(9, fmin1 * 0.96);
          ones.forEach(function (v) { v.style.setProperty('font-size', fmin1.toFixed(2) + 'px', 'important'); });
          fitOnes();
        }
        // 그래도 넘치면(좁은 폰 360px): 반지처럼 「장착 효과」는 위 줄, 「이름 | 숫자」는 아래 줄 전체 폭으로, 글씨는 원래 크기
        if (ones.some(function (v) { return v.scrollWidth > v.clientWidth + 0.5; })) ones.forEach(function (v) { v.closest('.ef').classList.add('stack', 'tw2'); v.style.removeProperty('font-size'); v.style.gridTemplateColumns = ''; });
      }
      // 장착 효과·보유 효과 두 표를 같은 글자 크기·같은 열 너비로 (위아래 줄이 똑같이 맞게)
      var twos = [].slice.call(panel.querySelectorAll('.opbag .ef b.two'));
      // 좁은 폰(360px 등)에서 가장 작은 글씨로도 안 들어가면: 「장착 효과」 이름은 위 줄, 표는 아래 줄 전체 폭
      if (twos.some(function (v) { return v.scrollWidth > v.clientWidth + 0.5; })) twos.forEach(function (v) { v.closest('.ef').classList.add('stack'); v.style.removeProperty('font-size'); shrink(v, [v], 9.5); });
      if (twos.length > 1) {
        var fmin = Math.min.apply(null, twos.map(function (v) { return parseFloat(getComputedStyle(v).fontSize); }));
        twos.forEach(function (v) { v.style.setProperty('font-size', fmin + 'px', 'important'); });
        var cols = [0, 1].map(function (i) { return Math.max.apply(null, twos.map(function (v) { var c = v.children[i]; return c ? Math.ceil(c.getBoundingClientRect().width) : 0; })); });
        twos.forEach(function (v) { v.style.gridTemplateColumns = cols[0] + 'px ' + cols[1] + 'px'; });
      }
      var b = panel.querySelector('.bagbtns>.buy'), bk = b ? [].slice.call(b.querySelectorAll('small, span')) : [], pm = fitGear.mem && fitGear.mem.k === gkey ? fitGear.mem.bf : null;
      if (b) { if (pm) bk.forEach(function (k, ki) { if (pm[ki]) k.style.setProperty('font-size', pm[ki] + 'px'); }); shrink(b, bk, 10); }   // 레벨업 버튼 글씨도 같은 장비를 올리는 동안 다시 커지지 않음
      fitGear.mem = { k: gkey, f: [].slice.call(panel.querySelectorAll('.opbag .ef b')).map(function (v) { return parseFloat(getComputedStyle(v).fontSize); }), bf: bk.map(function (k) { return parseFloat(getComputedStyle(k).fontSize); }) };
    }
    // 스킬 줄: 설명·이름이 칸보다 길면 글자만 줄임 (설명 10px, 이름 12px 까지)
    function fitSkillRows() {
      // 위 슬롯 카드 이름(.skc .nm, 폭 71px)도 — 「원소 합체 궁극기」처럼 긴 이름이 잘리던 것 (사용자 2026-11-16): 다 보이게 글씨만 줄임
      panel.querySelectorAll('.skr .how, .skr .nm, .skc .nm').forEach(function (el) {
        var min = el.classList.contains('how') ? 10 : el.closest('.skc') ? 9 : 12, g = 0;
        if (el.classList.contains('nm')) el.style.maxWidth = el.closest('.skr') ? '124px' : '134px';   // 스킬 줄: 버튼 칸(194px~) 앞에서 끝나게 (2026-11-17)
        while (el.scrollWidth > el.clientWidth + 0.5 && g++ < 16) { var f = parseFloat(getComputedStyle(el).fontSize); if (f <= min) break; el.style.setProperty('font-size', Math.max(min, f * 0.95).toFixed(2) + 'px', 'important'); var b = el.querySelector('b'); if (b) b.style.setProperty('font-size', 'inherit', 'important'); }
      });
    }
    function fitAlch() {   // 세 카드는 늘 같은 글씨 크기 (가장 많이 줄어야 하는 카드에 맞춤)
      // 실제로 그려진 글자 덩어리 폭(첫 글자 왼쪽 ~ 끝 글자 오른쪽)을 재면서 들어갈 때까지 조금씩 줄임.
      // 예전엔 한 번에 비율로 줄였는데, 동전 아이콘·간격은 안 줄어서 「만들기 ◉ 649.9조」가 버튼 양끝에 붙고 아이폰에선 오른쪽이 잘렸음 (사용자 2026-11-17)
      function span(e) {
        var l = Infinity, r = -Infinity;
        Array.prototype.forEach.call(e.childNodes, function (c) {
          var q; if (c.nodeType === 1) q = c.getBoundingClientRect(); else { var rg = document.createRange(); rg.selectNodeContents(c); q = rg.getBoundingClientRect(); }
          if (q.width) { l = Math.min(l, q.left); r = Math.max(r, q.right); }
        });
        return r > l ? r - l : 0;
      }
      function fitTo(els, min) {   // 들어가는 가장 큰 글씨 (세 칸 중 가장 작은 쪽에 맞춤), 못 들어가면 min
        var fs = Infinity;
        els.forEach(function (e) {
          var cs = getComputedStyle(e), room = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), f = parseFloat(cs.fontSize), g = 0;
          while (span(e) > room - 0.5 && f > min && g++ < 40) { f = Math.max(min, f * 0.96); e.style.fontSize = f.toFixed(2) + 'px'; }
          fs = Math.min(fs, f); e.style.fontSize = '';
        });
        return fs;
      }
      function overflows(els) { return [].some.call(els, function (e) { var cs = getComputedStyle(e); return span(e) > e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 0.5; }); }
      ['.pcard.anw .peff', '.pcard.anw .buy'].forEach(function (sel) {
        var els = panel.querySelectorAll(sel), isBuy = sel.indexOf('.buy') >= 0, fs;
        els.forEach(function (e) { e.style.fontSize = ''; e.style.removeProperty('gap'); e.classList.remove('nolab'); });
        if (isBuy) {   // 비용이 길어 10.5px 아래로 줄여야 하면 「만들기」 글자를 빼고 동전+비용만 (폰에서 읽을 수 있게)
          fs = fitTo(els, 10.5);
          if (fs < Infinity) els.forEach(function (e) { e.style.fontSize = fs.toFixed(2) + 'px'; });
          if (overflows(els)) { els.forEach(function (e) { e.style.fontSize = ''; e.classList.add('nolab'); }); fs = fitTo(els, 9.5); }
        } else fs = fitTo(els, 9.5);
        if (fs < Infinity) els.forEach(function (e) { e.style.fontSize = fs.toFixed(2) + 'px'; });
        els.forEach(function (e) {   // 가장 작은 글씨로도 넘치면 사이 간격을 줄임
          var cs = getComputedStyle(e), room = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          if (span(e) > room - 0.5) e.style.setProperty('gap', '2px', 'important');
        });
      });
    }
    function fitStageRows() {
      var list = panel.querySelector('.slist'), row = list && list.querySelector('.srow'); if (!row) return;
      list.classList.remove('tight', 'tighter'); ['--srw', '--snw', '--sgw', '--sow', '--rc1', '--rc2'].forEach(function (k) { list.style.removeProperty(k); });
      // the widest content of a set of cells, read at its natural width
      var natural = function (els) { var w = 0; els.forEach(function (e) { var r = document.createRange(); r.selectNodeContents(e); w = Math.max(w, r.getBoundingClientRect().width); }); return Math.ceil(w); };
      var c1 = [], c2 = [];
      list.querySelectorAll('.srews').forEach(function (s) { var k = 0; [].forEach.call(s.children, function (e) { if (e.classList.contains('hp')) return; (k++ % 2 ? c2 : c1).push(e); }); });
      var rc1 = natural(c1), rc2 = natural(c2), hpw = 0;
      list.querySelectorAll('.srews .srew.hp').forEach(function (e) { hpw = Math.max(hpw, e.scrollWidth); });
      // the HP line spans both: when it is longer, both columns widen by the same amount (the second column does not run away)
      var lack = Math.ceil(hpw) - (rc1 + 8 + rc2); if (lack > 0) { rc1 += Math.ceil(lack / 2); rc2 += Math.ceil(lack / 2); }
      list.style.setProperty('--rc1', rc1 + 'px'); list.style.setProperty('--rc2', rc2 + 'px');
      list.style.setProperty('--sgw', (natural([].slice.call(list.querySelectorAll('.sname'))) + 2) + 'px');
      list.style.setProperty('--sow', (natural([].slice.call(list.querySelectorAll('.sgo'))) + 2) + 'px');
      // 모든 줄을 한꺼번에 max-content 로 두고 한 번에 잼 (2026-11-18): 줄마다 넣고-재고-빼면 줄 수(30줄)만큼 배치 계산을 다시 해서
      // 스테이지 창이 늦게 열렸음 (CPU 4배 느리게: 줄 하나 10ms × 30)
      var widest = function () { var els = list.querySelectorAll('.srews'), w = 0; els.forEach(function (e) { e.style.width = 'max-content'; }); els.forEach(function (e) { w = Math.max(w, e.getBoundingClientRect().width); }); els.forEach(function (e) { e.style.width = ''; }); return Math.ceil(w); };
      var room = function () {
        var cs = getComputedStyle(row), cols = cs.gridTemplateColumns.split(' ').map(parseFloat), gap = parseFloat(cs.columnGap) || 0;
        return row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - cols[0] - cols[1] - cols[4] - gap * 4 - STAGE_NAME_MIN;
      };
      // two steps when it does not fit: smaller reward numbers (tight), then narrower stage/picture columns too (tighter)
      var w = widest();
      if (w > room()) { list.classList.add('tight'); w = widest(); }
      if (w > room()) { list.classList.add('tighter'); w = widest(); }
      if (w) list.style.setProperty('--srw', w + 'px');
      // the name column: as wide as the longest name of this list needs, no wider (2026-11-17, the user: 이름과 골드 사이가 너무
      // 넓어 — 빡 줄여); what is left over goes to the right end before 이동, so the columns still line up row to row
      var rcs = getComputedStyle(row), rcols = rcs.gridTemplateColumns.split(' ').map(parseFloat), rgap = parseFloat(rcs.columnGap) || 0;
      var nameRoom = row.clientWidth - parseFloat(rcs.paddingLeft) - parseFloat(rcs.paddingRight) - rcols[0] - rcols[1] - rcols[3] - rcols[4] - rgap * 4, nw = 0, cv = fitStageRows.cv || (fitStageRows.cv = document.createElement('canvas').getContext('2d'));
      // each name at its narrowest on at most two lines (split between words where the longer half is shortest)
      list.querySelectorAll('.snm b, .snm small').forEach(function (b) {
        var cs = getComputedStyle(b); cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        var words = (b.textContent || '').trim().split(/s+/), best = cv.measureText(words.join(' ')).width;
        for (var k = 1; k < words.length; k++) best = Math.min(best, Math.max(cv.measureText(words.slice(0, k).join(' ')).width, cv.measureText(words.slice(k).join(' ')).width));
        nw = Math.max(nw, best);
      });
      // never wider than before; a name that still does not fit wraps or shrinks as before
      if (nw > 0) list.style.setProperty('--snw', Math.ceil(Math.min(nw + 2, nameRoom)) + 'px');
      var cut = function (n) { return n.scrollHeight > n.clientHeight + 1; };
      // 넣고-재기를 이름마다 번갈아 하지 않고 단계마다 한꺼번에 (배치 계산 두세 번으로)
      var nms = [].slice.call(list.querySelectorAll('.snm b')); nms.forEach(function (n) { n.classList.remove('tiny', 'tiny3'); });
      var big = nms.filter(cut); big.forEach(function (n) { n.classList.add('tiny'); }); big.filter(cut).forEach(function (n) { n.classList.add('tiny3'); });
    }
    // 손가락으로 스크롤하는 동안(그리고 멈춘 직후 0.5초)은 저절로 다시 그리지 않음 — 다시 그리면 폰에서 스크롤이 끊기고 제자리로 돌아감 (사용자 2026-11-16).
    // 직접 누른 것(force)은 그대로 바로 그림
    var panelTouch = false, panelScrollAt = 0, panelTouchEnd = -1e9;
    // ---- 바뀐 것만 고치기 (꾸욱 강화용) ----
    var softRender = false;
    function morphNode(a, b) {   // a = 화면에 있는 것, b = 새로 만든 것
      if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName || (a.nodeType === 1 && a.classList.contains('opfx'))) { a.parentNode.replaceChild(b, a); return; }   // 반응 중인 것은 새로 (움직임 다시 시작)
      if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
      var i, at;
      for (i = a.attributes.length - 1; i >= 0; i--) { at = a.attributes[i].name; if (!b.hasAttribute(at) && !(at === 'style' && a._cwPh)) a.removeAttribute(at); }   // 보관함 격자의 --ph는 남김 (지웠다 넣으면 300칸 스타일을 두 번 다시 계산)
      for (i = 0; i < b.attributes.length; i++) { at = b.attributes[i]; if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value); }
      morphKids(a, b);
    }
    function morphKids(a, b) {
      var ak = [].slice.call(a.childNodes), bk = [].slice.call(b.childNodes);
      if (ak.length !== bk.length) { while (a.firstChild) a.removeChild(a.firstChild); bk.forEach(function (n) { a.appendChild(n); }); return; }
      for (var i = 0; i < ak.length; i++) morphNode(ak[i], bk[i]);
    }
    // 새 그림을 틀에 담고, 아래 고정 자리(탭·특성 상세)로 옮겨 둔 것은 거기서 맞춘 뒤 틀에서 뺌. 모양이 다르면 null (= 통째로 다시)
    function softPrep(html) {
      var t = document.createElement('div'); t.innerHTML = html;
      var pairs = [[':scope > .subtabs', ':scope > .subtabs'], ['.ophold, .tinfo.tnw', ':scope > .ophold, :scope > .tinfo.tnw']], ok = true, moves = [];
      pairs.forEach(function (p) {
        var n = t.querySelector(p[0]), live = opTabs && !opTabs.hidden ? opTabs.querySelector(p[1]) : null;
        if (!n && !live) return;
        if (!n || !live || n.nodeName !== live.nodeName) { ok = false; return; }
        if (p[0] === ':scope > .subtabs' && n.outerHTML !== live.outerHTML) { ok = false; return; }   // 하위 탭을 바꿨으면 통째로 (고른 탭 반짝임은 그때 한 번만)
        moves.push([live, n]);
      });
      if (!ok || t.childNodes.length - moves.filter(function (m) { return m[1].parentNode === t; }).length !== panel.childNodes.length) return null;
      moves.forEach(function (m) { m[1].remove(); morphNode(m[0], m[1]); });
      return t;
    }
    // 좁은 폰(패널 안쪽 폭이 시안 폭 359px 보다 좁음, 예: 갤럭시 360 = 328px, 아이폰 SE 375 = 343px): 시안 좌표로 짠 스킬(목록·상세)·마나서클 화면을
    // 통째로 그 비율만큼 줄여 오른쪽이 잘리지 않게 (zoom 이라 누르는 자리·스크롤 길이도 함께 줄어듦). 화면을 돌리거나 크기가 바뀌면 다시 맞춤
    function fitNarrow() {
      if (!panel) return;
      var on = !!panel.querySelector(':scope > .skw, :scope > .skd, :scope > .mcwrap');
      var stg = !on && !!panel.querySelector(':scope > .ruw, :scope > .sgw, :scope > .dvw');   // 룬·신성력 (2026-11-17): 시안 좌표로 짠 무대만 줄이고 아래 글·목록은 그대로
      var cs = getComputedStyle(panel), cw = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var k = (on || stg) && cw > 200 && cw < 352 ? cw / 359 : 1;   // 390폭(안쪽 358.4)은 그대로 — 1~2px 넘침은 그림 여백이라 잘려도 됨
      panel.classList.toggle('opz', on && k < 1); panel.style.setProperty('--opz', k.toFixed(4));
    }
    window.addEventListener('resize', function () { fitNarrow(); });
    // 맨 위에서 새로 그리기 (탭·하위 탭 바꿀 때, 2026-11-18): 예전엔 그리기 전에 panel.scrollTop = 0 을 넣어서, 곧 버릴 예전 화면까지
    // 배치를 한 번 더 계산했음(훈련 탭 열 때 81ms+, CPU 4배 느리게 실측) → 새 화면을 넣은 뒤에 맨 위로
    var topNext = false;
    function renderTop() { topNext = true; renderPanel(true); }
    function renderPanel(force) {
      var top0 = topNext; topNext = false;
      if (tab === 'battle') return;
      if (!force && (panelTouch || performance.now() - panelScrollAt < 500)) return;
      dockHtml = '';
      var html = PANELS[tab](), dh = dockHtml, key = html + '|dock|' + dh;
      if (!force && key === lastPanel) return;
      // 꾸욱 강화 중(softRender)에는 통째로 다시 만들지 않고 바뀐 글자·속성만 고침: 아이폰은 손가락이 닿은 채로 화면이 통째로 바뀌면
      // 스크롤 자리를 놓쳐 위로 올라가 버림 (사용자 2026-11-16 승급). 누르고 있는 버튼도 그대로 남는다.
      // 아래 하위 탭이 있는 화면(훈련·장비)은 같은 하위 탭 안이면 0.3초 새로 그리기·누름도 글자·속성만 고침 (사용자 2026-11-17):
      // 통째로 다시 만들면 아래 탭이 새로 붙어 고른 탭 반짝임이 계속 다시 나오고(깜빡깜빡), 연금술 등은 누를 때마다 스크롤이 살짝 밀렸음
      // 0.3초마다 저절로 다시 그릴 때(!force)는 모든 화면(스킬·더보기 포함)에서 글자·속성만 고침 — 모양이 달라졌을 때만 통째로
      var soft = (softRender || !force || (opTabs && !opTabs.hidden && opTabs.querySelector(':scope > .subtabs'))) && panel.firstChild && softPrep(html);
      // 룬·신성력 종류 버튼 줄(옆으로 밀림)은 다시 그려도 밀어 둔 자리 그대로 (2026-11-18)
      var rkx = {}; Array.prototype.forEach.call(panel.querySelectorAll('.rkchips'), function (e) { rkx[e.className] = e.scrollLeft; });
      var y = top0 ? 0 : panel.scrollTop; if (soft) morphKids(panel, soft); else panel.innerHTML = html; if (panel.scrollTop !== y) panel.scrollTop = y; lastPanel = key;
      Array.prototype.forEach.call(panel.querySelectorAll('.rkchips'), function (e) { if (rkx[e.className] && e.scrollLeft !== rkx[e.className]) e.scrollLeft = rkx[e.className]; });
      var phv = (-(Date.now() % 60000) / 1000).toFixed(2) + 's';   // 계속 도는 움직임(마나서클·연금술)은 시계에 맞춰 이어서
      // 룬·신성력 보관함(최대 300칸, 2026-11-18): 칸을 누를 때 남아 있는 격자에 새 시간값을 넣으면 칸 전체 스타일을 다시 계산해 폰에서 느려짐
      // → 그대로 남은 격자는 처음 값을 다시 씀(같은 값이면 다시 계산 안 함), 새로 만든 격자만 지금 시간값
      panel.querySelectorAll('.mcv, .alchhead.anw, .pgrid.anw, .ruv, .sgv, .rsgrid, .rsstrip').forEach(function (e) { if (!e.classList.contains('rsgrid') && !e.classList.contains('rsstrip')) { e.style.setProperty('--ph', phv); return; } if (!e._cwPh) e._cwPh = phv; e.style.setProperty('--ph', e._cwPh); });
      if (ghdPlay) { ghdPlay = false; var ghd = panel.querySelector('.ghd'); if (ghd) { ghd.style.setProperty('--from', ghdFrom + '%'); ghd.classList.add('play'); } }
      keepCircle(); if (tab === 'stage') fitStageRows(); if (tab === 'up') { fitGrowNames(); fitAlch(); } if (tab === 'gear') fitGear(); if (tab === 'skill') fitSkillRows();
      fitNarrow();
      // 칸 높이를 맞추느라 잠깐 줄었다 늘어나는 사이 스크롤 자리가 짧아진 길이에 잘려 위로 올라가던 것 (사용자 2026-11-18 「성장에서 강화 누르면 스크롤돼서 위로」): 자리를 다시 돌려 놓음
      if (panel.scrollTop !== y) panel.scrollTop = y;
      if (CW.opalUI) { CW.opalUI.bumpValues(panel); CW.opalUI.applyFx(panel); }   // 오팔 메뉴: 바뀐 숫자·성공 반응만 짧게
      var stb, ohd;
      if (soft) { stb = opTabs.querySelector(':scope > .subtabs'); ohd = opTabs.querySelector(':scope > .ophold, :scope > .tinfo.tnw'); }   // 이미 아래 고정 자리에 있음 (softPrep가 맞춤)
      else {
        stb = $('sheet').classList.contains('opal') && panel.querySelector(':scope > .subtabs');
        ohd = stb && panel.querySelector('.ophold, .tinfo.tnw');   // 성장 시안: 「길게 누르면 연속 강화」는 아래 탭 바로 위 고정 자리
        if (typeof opTabs !== 'undefined' && opTabs) { opTabs.innerHTML = ''; opTabs.hidden = !stb; if (ohd) opTabs.appendChild(ohd); if (stb) opTabs.appendChild(stb); }
      }
      // 특성 상세 칸 효과 줄: 길면 글씨를 10.5px 까지 줄이고, 그래도 넘치면 두 줄 (조건 줄은 숨김)
      var tef = ohd && ohd.querySelector('.tieff');
      [tef, ohd && ohd.querySelector('.tinote')].forEach(function (el) { if (!el) return; el.style.fontSize = ''; var full = el.scrollWidth, room = el.clientWidth; if (full > room + 0.5) el.style.fontSize = Math.max(9, parseFloat(getComputedStyle(el).fontSize) * (room - 1) / full).toFixed(2) + 'px'; });   // 한 줄 그대로, 글자만 줄임
      // 제목은 바뀔 때만 넣음: 같은 글자를 다시 넣어도 창 전체(보관함 300칸 포함) 스타일을 다시 계산함 (2026-11-18)
      if (stb) { var stSel = stb.querySelector('[aria-selected="true"]'); if (stSel && $('sheetTitle').textContent !== stSel.textContent) $('sheetTitle').textContent = stSel.textContent; }
      if (tab === 'skill' && $('sheet').classList.contains('opal')) { var skd = skDetail && CW.skillById(skDetail); $('sheetTitle').textContent = skd ? skd.name : TITLES.skill; }   // 승인 시안: 제목 = 지금 화면 이름 (장비 / 코스튬 …)
      // 제목이 길면(스킬 상세 「원소 합체 궁극기」 등) 「원소 합체 궁극 / 기」로 끊기던 것 (사용자 2026-11-16): 양옆 장식 선을 줄이고, 그래도 두 줄이면 글씨만 줄여 한 줄로
      (function fitTitle() {
        var t = $('sheetTitle'); if (!t) return;
        t.classList.remove('tlong'); t.style.removeProperty('font-size');
        if (t.getBoundingClientRect().height < parseFloat(getComputedStyle(t).fontSize) * 1.9) return;   // 이미 한 줄
        t.classList.add('tlong');   // 한 줄로 두고(nowrap) 칸보다 넓으면 글씨를 줄임
        var one = function () { return t.scrollWidth <= t.clientWidth + 0.5; };
        for (var g = 0; g < 14 && !one(); g++) t.style.setProperty('font-size', Math.max(16, parseFloat(getComputedStyle(t).fontSize) * 0.94).toFixed(2) + 'px', 'important');
      })();
      // the selected 신성력/룬 sits at the bottom of the sheet, always in sight (2026-11-15); it slides up when it opens
      var was = !dock.hidden;
      if (soft && dh && was && dock.firstChild) { var dt = document.createElement('div'); dt.innerHTML = dh; morphKids(dock, dt); } else dock.innerHTML = dh;
      dock.hidden = !dh;
      if (dh && CW.opalUI) { CW.opalUI.bumpValues(dock); CW.opalUI.applyFx(dock); }   // 아래 상세 칸도 강화·승급 반응·숫자 바뀜 (룬·신성력 2026-11-17)
      if (dh && !was) { dock.classList.remove('pop'); void dock.offsetWidth; dock.classList.add('pop'); var sl = panel.querySelector('.sel'); if (sl) sl.scrollIntoView({ block: 'nearest' }); }
      else if (panel.scrollTop !== y) panel.scrollTop = y;   // 아래 고정 칸이 바뀌어 길이가 달라진 뒤에도 같은 자리
    }

    function dmgRow(key, name, desc, v, lo, hi) {
      return '<div class="row dmgset"><div class="info"><div class="name">' + name + ' <b class="dmgval" data-val="' + key + '">' + v + '%</b></div><div class="desc">' + desc + '</div>' +
        '<input type="range" min="' + lo + '" max="' + hi + '" step="5" value="' + v + '" data-range="' + key + '" aria-label="' + name + '"></div></div>';
    }
    // ---------- interactions ----------
    var holdT = null, holdI = null;
    // the two damage-number sliders: preview while dragging (the menu is not redrawn), keep the value on release
    function rangeVals() { var o = {}; panel.querySelectorAll('[data-range]').forEach(function (r) { o[r.dataset.range] = +r.value; }); return o; }
    var sampleT = 0;
    panel.addEventListener('input', function (e) {
      var r = e.target.closest('[data-range]'); if (!r) return;
      var o = rangeVals(), lab = panel.querySelector('[data-val="' + r.dataset.range + '"]'); if (lab) lab.textContent = r.value + '%';
      G.previewDamage(o.dmgSize, o.dmgAlpha);
      var now = Date.now(); if (now - sampleT > 450) { sampleT = now; G.showDamageSample(); }
    });
    panel.addEventListener('change', function (e) {
      var r = e.target.closest('[data-range]'); if (!r) return;
      G.setSetting(r.dataset.range, +r.value); G.showDamageSample(); renderPanel(true);
    });
    function stopHold() { clearTimeout(holdT); clearInterval(holdI); holdT = holdI = null; }
    // talent, costume, divine item and skill level-ups (2026-11-15, the user: 꾸욱 누르면 쭈욱): one step a press like
    // the rest, then repeating while held. The first step says why it cannot go on; the repeats stop quietly.
    function stepAct(d, quiet) {
      var ok;
      if (d.tup) { ok = G.talentUp(d.tup); if (ok) { /* 성공은 글 없이 노드 빛으로만 (사용자 2026-11-16) */ } else if (!quiet) toast(CW.talentSpent(G.state) >= CW.talentPoints(G.state) ? '사용할 특성 포인트가 없어요.' : '해금 조건을 먼저 달성해 주세요.'); }
      else if (d.cup) { ok = G.upCostume(d.cup); if (ok) toast(CW.costumeById(d.cup).name + ' Lv.' + G.state.costume.owned[d.cup]); else if (!quiet) toast(G.state.costume.owned[d.cup] >= DATA.costumeConf.maxLv ? '최대 레벨에 도달했어요.' : '다이아가 부족해요.'); }
      else if (d.dlv) { ok = G.divineUp(d.dlv); if (ok) toast('삼신기 레벨이 올랐어요.'); else if (!quiet) toast(!CW.divineOpen(G.state) ? DATA.divineConf.unlockTier + '차 전직 후 해금' : '골드가 부족해요.'); }
      else if (d.sup) { ok = G.skillUp(d.sup); if (ok) toast(CW.skillById(d.sup).name + ' +' + CW.skillLevel(G.state, d.sup) + ' · 스킬 강화 완료'); else if (!quiet) toast(CW.skillLevel(G.state, d.sup) >= DATA.balance.skillMaxLv ? '최대 강화에 도달했어요.' : '골드가 부족해요.'); }
      if (ok && CW.opalUI) CW.opalUI.fx(d.tup ? 'tal:' + d.tup : d.cup ? 'cos:' + d.cup : d.dlv ? 'dv:' + d.dlv : 'sk:' + d.sup);   // 성공했을 때만 반응
      softRender = true; try { renderPanel(true); } finally { softRender = false; } hud(); if (d.sup) slots();
      return ok;
    }
    var HOLD_STEP = '[data-tup],[data-cup],[data-dlv],[data-sup]';
    var onDown = function (e) {
      var hs = e.target.closest(HOLD_STEP);
      if (hs) { var dd = { tup: hs.dataset.tup, cup: hs.dataset.cup, dlv: hs.dataset.dlv, sup: hs.dataset.sup }; stopHold(); if (!stepAct(dd, false)) return; holdT = setTimeout(function () { holdI = setInterval(function () { if (!stepAct(dd, true)) stopHold(); }, 90); }, 380); return; }
      var b = e.target.closest('[data-up],[data-mark],[data-mkhold],[data-circle],[data-blv],[data-rune],[data-sglv]'); if (!b) return;
      var key = b.dataset.up, mk = b.dataset.mark || b.dataset.mkhold, ci = b.dataset.circle, bl = b.dataset.blv, ru = b.dataset.rune, sl = b.dataset.sglv;
      var once = function () { var ok = bl ? G.levelUp(bl) : ru ? G.runeUp(ru) : sl ? G.sigilLvUp() : mk ? G.markUp(mk) : ci ? G.circleUp() : (upMul > 1 ? G.upgradeN(key, upMul) : G.upgrade(key)); if (ok) { if (key) upSel = key; fxRune = ru || null; if (CW.opalUI) CW.opalUI.fx(key ? 'up:' + key : mk ? 'mk:' + mk : bl ? 'bl:' + bl : ru ? 'ru:' + ru : sl ? 'sglv' : 'circle'); softRender = true; try { renderPanel(true); } finally { softRender = false; } fxRune = null; hud(); } else stopHold(); };
      stopHold();
      // 징표 그림(돔·목록 그림)을 꾸욱 (사용자 2026-11-16, 아이폰): 스크롤하려고 닿은 것과 헷갈리지 않게 0.38초 가만히 누르고 있어야 시작, 그다음 연속 강화
      if (b.dataset.mkhold) { holdT = setTimeout(function () { once(); if (holdT) holdI = setInterval(once, 90); }, 380); return; }
      once(); holdT = setTimeout(function () { holdI = setInterval(once, 90); }, 380);
    };
    // 폰: 누르던 버튼이 다시 그려지며 바뀌어도 손을 떼거나 스크롤이 시작되면 꼭 멈춤 (아이폰은 뗀 신호가 지워진 버튼으로 가서 패널까지 안 올 때가 있음)
    ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(function (ev) { window.addEventListener(ev, stopHold, true); });
    var holdX = 0, holdY = 0;
    panel.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) { holdX = t.clientX; holdY = t.clientY; } }, { passive: true });
    window.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t && Math.abs(t.clientX - holdX) + Math.abs(t.clientY - holdY) > 10) stopHold(); }, { passive: true, capture: true });
    panel.addEventListener('pointerdown', onDown); dock.addEventListener('pointerdown', onDown);
    // 패키지 상자 꾸욱 (0.45초 가만히): 구성품 창. 손가락이 10px 넘게 움직이면(스크롤) 취소, 폰 기본 길게 누르기 메뉴는 막음
    (function () {
      var x0 = 0, y0 = 0, stop = function () { clearTimeout(pkHoldT); pkHoldT = null; };
      panel.addEventListener('pointerdown', function (e) {
        var b = e.target.closest('[data-pkbox]'); stop(); if (!b) return;
        x0 = e.clientX; y0 = e.clientY; var id = b.dataset.pkbox; b.classList.add('press');
        pkHoldT = setTimeout(function () { pkHoldT = null; b.classList.remove('press'); pkHeldAt = performance.now(); if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) {} pkInfo(id); }, 450);
      });
      panel.addEventListener('pointermove', function (e) { if (pkHoldT && Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 10) { stop(); panel.querySelectorAll('.pkbox.press').forEach(function (b) { b.classList.remove('press'); }); } });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { panel.addEventListener(ev, function () { stop(); panel.querySelectorAll('.pkbox.press').forEach(function (b) { b.classList.remove('press'); }); }); });
      panel.addEventListener('contextmenu', function (e) { if (e.target.closest('[data-pkbox]')) e.preventDefault(); });
    })();
    panel.addEventListener('touchstart', function () { panelTouch = true; }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (ev) { panel.addEventListener(ev, function () { panelTouch = false; panelScrollAt = panelTouchEnd = performance.now(); }, { passive: true }); });
    // 손가락 스크롤과 그 뒤 미끄러짐(2초 안)만 셈 — 다시 그릴 때 제자리로 맞추는 스크롤은 세지 않음
    panel.addEventListener('scroll', function () { var t = performance.now(); if (panelTouch || t - panelTouchEnd < 2000) panelScrollAt = t; }, { passive: true });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { panel.addEventListener(ev, stopHold); dock.addEventListener(ev, stopHold); });
    var onClick = function (e) {
      var t = e.target.closest('button'); if (!t) return;
      var d = t.dataset;
      if (d.guide) { G.sound('click'); showGuide(d.guide); return; }   // 안내 카드 '자세히'
      if (t.matches(HOLD_STEP)) { if (e.detail === 0) stepAct(d, false); return; }   // a press is done on pointerdown; keys still work
      if (d.skd) { skDetail = d.skd; skRegOpen = false; renderTop(); return; }
      if (t.hasAttribute('data-skback')) { skDetail = null; renderTop(); return; }
      if (t.hasAttribute('data-skagain')) { var sv = panel.querySelector('.skd-v'); if (sv) { sv.classList.remove('run'); void sv.offsetWidth; sv.classList.add('run'); } return; }
      if (t.hasAttribute('data-skreg')) { skRegOpen = !skRegOpen; renderPanel(true); return; }
      if (d.prev) { G.previewSkill(d.prev); }
      else if (d.sel !== undefined) { selSlot = selSlot === +d.sel ? -1 : +d.sel; renderPanel(true); }
      else if (d.eq) { var at = G.placeSkill(d.eq, selSlot); if (at >= 0) toast(CW.skillById(d.eq).name + ' · ' + (at + 1) + '번 슬롯에 배치했어요.'); selSlot = -1; renderPanel(true); slots(); }
      else if (d.out !== undefined || d.unslot !== undefined) { G.unequipSkill(+(d.out !== undefined ? d.out : d.unslot)); if (selSlot === +(d.out !== undefined ? d.out : d.unslot)) selSlot = -1; renderPanel(true); slots(); }
      else if (d.act === 'unslotall') { G.state.slots.forEach(function (id, i) { if (id) G.unequipSkill(i); }); selSlot = 0; toast('스킬을 모두 뺐어요. 넣을 스킬의 「1번에 넣기」를 눌러 주세요.'); renderPanel(true); slots(); }
      else if (d.mul) { upMul = +d.mul; renderPanel(true); }
      else if (d.tsub) { trainSub = d.tsub; renderTop(); }
      else if (d.tal) { selTalent = d.tal; renderPanel(true); }
      else if (d.act === 'treset') { G.talentReset(); toast('특성 포인트를 초기화했어요.'); renderPanel(true); }
      else if (d.act === 'rankup') { var rr2 = CW.rankReady(G.state); if (G.rankUp() && (!CW.opalUI || CW.opalUI.fx('rankup') || 1)) toast(DATA.rankConf.names[G.state.rank] + ' 승급 완료'); else toast(rr2.why === 'marks' ? '기본 징표 6개를 최대 레벨로 강화해 주세요.' : rr2.why === 'level' ? '계정 Lv.' + rr2.need + '이 필요해요.' : rr2.why === 'mana' ? '마력석이 부족해요.' : '최고 계급에 도달했어요.'); renderPanel(true); }
      else if (d.dgo) { var r3 = G.dungeon(d.dgo); if (r3 === 'busy') toast('진행 중인 보스전이나 던전을 먼저 마쳐 주세요.'); else if (r3 === 'ticket') toast('오늘 입장권을 모두 사용했어요.'); }
      else if (d.dsw) { var r4 = G.sweep(d.dsw); if (!r4) toast('소탕할 수 없어요. 입장권과 클리어 기록을 확인해 주세요.'); else toast('소탕 완료 · ' + (r4.gold ? '골드 +' + fmtG(r4.gold) : r4.gems ? '다이아 +' + fmt(r4.gems) : r4.runeStone ? '룬석 +' + fmt(r4.runeStone) + (r4.got && r4.got.length ? ' · 룬 ' + r4.got.length + '개' : '') + (r4.overflow ? ' · 가방 초과 보상 룬석 +' + fmt(r4.overflow) : '') : '마력석 +' + fmt(r4.mana))); renderPanel(true); hud(); }
      else if (d.jump !== undefined) { moreSub = +d.jump; tierAnim = moreSub === 0; renderTop(); }
      else if (d.gsub) { gearSub = d.gsub; selSigil = selRune = null; rnBag = sgBag = false; renderTop(); }
      else if (d.relic) { var rr = G.summonRelics(+d.relic); if (!rr) toast('다이아가 부족해요.'); else { showRelics(rr); renderPanel(true); hud(); } }
      else if (d.cbuy) { if (G.buyCostume(d.cbuy)) toast('새 코스튬 획득 · ' + CW.costumeById(d.cbuy).name); else toast('다이아가 부족해요.'); renderPanel(true); hud(); }
      else if (d.dvsel) { selDivine = d.dvsel; renderPanel(true); }
      else if (d.act === 'bagall') { bagAll = !bagAll; renderPanel(true); }
      else if (d.rlsel) { selRelic = d.rlsel; renderPanel(true); }
      else if (d.cprev) { cosPrev = d.cprev; renderPanel(true); }   // 보기만 바꿈: 착용·구매 안 함
      else if (d.cwear) { if (G.wearCostume(d.cwear) && (!CW.opalUI || (CW.opalUI.fx('cos:' + d.cwear), 1))) toast(CW.costumeById(d.cwear).name + ' 착용 완료'); renderPanel(true); }
      else if (d.dstar) { if (G.starUp(d.dstar) && (!CW.opalUI || (CW.opalUI.fx('dvs:' + d.dstar), 1))) toast('별 강화 완료!'); else toast(!CW.divineOpen(G.state) ? DATA.divineConf.unlockTier + '차 전직 후 해금' : !G.state.divine[d.dstar].lv ? '먼저 삼신기를 깨워 주세요.' : '신기 조각이 부족해요.'); renderPanel(true); }
      else if (d.preset !== undefined) { G.switchPreset(+d.preset); toast('스킬 프리셋 ' + (+d.preset + 1) + ' 적용'); renderPanel(true); slots(); }
      else if (d.act === 'skillall') { var nn = G.skillUpAll(); toast(nn ? '스킬 강화 +' + nn + ' 완료' : '골드가 부족해요.'); renderPanel(true); hud(); slots(); }
      else if (d.act === 'autoskill') { G.autoSkills(); toast('추천 스킬 4개를 배치했어요.'); renderPanel(true); slots(); }
      else if (d.dsel !== undefined) { var nd = ((selDiff < 0 ? (G.state.diff || 0) : selDiff) + +d.dsel + DATA.difficulties.length) % DATA.difficulties.length; selDiff = nd; selRegion = 0; renderPanel(true); }
      else if (d.rsel !== undefined) { selRegion = +d.rsel; renderPanel(true); }
      else if (d.wlock !== undefined) { toast(+d.wlock < 1 ? '이 난이도는 아직 잠겨 있어요.' : CW.regionAt(selDiff < 0 ? (G.state.diff || 0) : selDiff, +d.wlock - 1).name + ' 보스 처치 시 해금'); }
      else if (d.lkgo !== undefined) {   // 잠긴 메뉴 카드: 보통 난이도의 맨 앞 스테이지로 (그 자리가 보스면 바로 도전)
        var lf = +d.lkgo, st0 = G.state;
        if (G.dunState()) toast('던전이 끝나면 이동할 수 있어요.');
        else if (!(st0.diff || 0) && st0.stage === lf && !st0.farming) openTab('battle');
        else if (G.goStageIn(0, lf)) { toast(CW.stageLabel(lf) + ' 이동 완료'); openTab('battle'); }
      }
      else if (d.sgo !== undefined) { if (G.goStageIn(+d.sd, +d.sgo)) { toast(CW.stageLabel(+d.sgo) + ' 이동 완료'); selDiff = selRegion = -1; openTab('battle'); } }
      else if (d.diff !== undefined) { var dd = +d.diff; if (dd > G.state.diffUnlocked) toast(diffLockText(dd)); else confirmBox('난이도를 변경할까요?', '<b>' + DATA.difficulties[dd].name + '</b>의 진행으로 이동해요. 다른 난이도의 진행은 유지돼요.', '난이도 변경', function () { G.setDifficulty(dd); renderPanel(true); hud(); }); }
      else if (d.bkind) { bagKind = d.bkind; selKey = null; renderPanel(true); }
      else if (d.btr) { var eb = G.state.bag[d.btr]; if (G.transcend(d.btr)) { toast('초월 성공 · ' + CW.gearName(d.btr) + ' ★' + G.state.bag[d.btr].star); banner('초월 성공!'); } else toast(!eb ? '아직 획득하지 않은 장비예요.' : (eb.star || 0) >= DATA.bagConf.starMax ? '최고 초월에 도달했어요.' : eb.lv < CW.maxLevel(d.btr, eb.star) ? '최대 레벨까지 강화해 주세요.' : eb.n <= CW.transcendCost(G.state, d.btr).copies ? '같은 장비가 더 필요해요.' : '골드가 부족해요.'); renderPanel(true); hud(); }
      else if (d.brew) { if (G.brew(d.brew) && (!CW.opalUI || (CW.opalUI.fx('brew'), CW.opalUI.fx('brew:' + d.brew), 1))) toast(CW.potionById(d.brew).name + ' 제작 완료'); else toast('골드가 부족해요.'); renderPanel(true); hud(); }
      else if (d.rpick) { selRune = rnBag && selRune === d.rpick ? null : d.rpick; renderPanel(true); }
      else if (d.rgrade) { var ri = CW.runeItem(G.state, d.rgrade), rg2 = ri ? ri.grade : 0; if (G.runeGradeUp(d.rgrade)) { if (CW.opalUI) CW.opalUI.fx('rg:' + d.rgrade); toast('룬 승급 완료 · ' + CW.runeById(ri.kind).name + ' ' + hn(rg2 + 1)); banner(hn(rg2 + 1) + ' 룬!'); } else toast('룬석이 부족해요.'); fxRune = d.rgrade; renderPanel(true); fxRune = null; }
      else if (d.reqp) { var res0 = CW.runeResonance(G.state); if (G.runeEquipToggle(d.reqp) === 'full') toast('룬 슬롯이 가득 찼어요. 기존 룬을 해제한 뒤 장착해 주세요.'); else { var res1 = CW.runeResonance(G.state); if (res1 < res0) toast('룬 공명 ' + res0 + '단계 → ' + res1 + '단계 · 장착한 룬 중 가장 낮은 레벨 기준이에요.'); } renderPanel(true); }
      else if (d.rlock) { G.runeLock(d.rlock); renderPanel(true); }
      else if (d.rdis) { var rn = G.runeDismantle(d.rdis); if (rn) { toast('룬석 +' + fmt(rn)); selRune = null; } else toast('장착 중이거나 잠긴 룬은 분해할 수 없어요.'); renderPanel(true); }
      else if (d.rfuse) { var rf = G.runeFuse(d.rfuse); if (rf && rf.fail) { selRune = rf.kept.id; toast('합성 실패 · ' + hn(rf.kept.grade) + ' 룬 1개 남음 · 다음 ' + Math.round(rf.next * 100) + '%'); } else if (rf) { selRune = rf.id; if (CW.opalUI) { CW.opalUI.fx('rc:' + rf.id); CW.opalUI.fx('ru:' + rf.id); } toast('룬 합성 완료 · ' + hn(rf.grade) + ' ' + CW.runeById(rf.kind).name); banner(hn(rf.grade) + ' 룬!'); } else toast('합성하려면 같은 종류·등급의 룬 3개가 필요해요.'); renderPanel(true); }
      else if (d.rsum) { var rs = G.runeSummon(+d.rsum, rnGroup); if (!rs) toast('소환할 수 없어요. 다이아와 가방 여유 공간을 확인해 주세요.'); else { showRunes(rs); renderPanel(true); hud(); } }
      else if (d.rkf) { rnFilter = d.rkf; renderPanel(true); }
      // 착용 중 전체 보기 · 종류 버튼 · 강한 순/약한 순 · 더 보기 (2026-11-18 룬·신성력 정리)
      else if (d.rwall) { rsWornAll[d.rwall] = !rsWornAll[d.rwall]; renderPanel(true); }
      else if (d.rsk) { var rk = d.rsk.split('|'); rsKind[rk[0]] = rk[1]; rsMore[rk[0]] = 8; renderPanel(true); }
      else if (d.rsmore) { rsMore[d.rsmore] += 16; renderPanel(true); }
      else if (d.act === 'rssort') { rsAsc = !rsAsc; renderPanel(true); }
      else if (d.rgrp) { rnGroup = d.rgrp; renderPanel(true); }
      else if (d.rasum) { var ra = G.runeSummon(+d.rasum, 'awaken'); if (!ra) toast('소환할 수 없어요. 다이아와 가방 여유 공간을 확인해 주세요.'); else { showRunes(ra); renderPanel(true); hud(); } }
      else if (d.sgasum) { var sa = G.sigilSummon(+d.sgasum, true); if (!sa) toast('소환할 수 없어요. 다이아와 가방 여유 공간을 확인해 주세요.'); else { showSigils(sa); renderPanel(true); hud(); } }
      else if (d.rcraft) { var rc2 = G.runeCraft(d.rcraft); if (!rc2) toast('각성 파편이 모자라거나 가방이 가득 찼어요.'); else { selRune = rc2.id; toast(CW.runeById(rc2.kind).name + ' 제작!'); renderPanel(true); } }
      else if (d.sgcraft) { var sc2 = G.sigilCraft(d.sgcraft); if (!sc2) toast('각성 파편이 모자라거나 가방이 가득 찼어요.'); else { selSigil = sc2.id; toast('각성 신성력 제작!'); renderPanel(true); } }
      else if (d.act === 'sgbag') { sgBag = true; selSigil = null; renderTop(); }   // 신성력 보관함 (2026-11-17)
      else if (d.act === 'sgbagx') { sgBag = false; renderTop(); }
      else if (d.act === 'rbag') { rnBag = true; selRune = null; renderTop(); }   // 룬 보관함 (2026-11-17)
      else if (d.act === 'rbagx') { rnBag = false; renderTop(); }
      else if (d.act === 'rbest') { G.runeEquipBest(); toast('추천 룬을 장착했어요.'); renderPanel(true); }
      else if (d.act === 'rdisall') { confirmBox('룬을 일괄 분해할까요?', '장착하지 않고 잠기지 않은 룬을 모두 룬석으로 바꿔요.<br>분해한 룬은 되돌릴 수 없어요.', '룬 분해', function () { var rn2 = G.runeDismantleAll(); toast(rn2 ? '룬석 +' + fmt(rn2) : '분해할 룬이 없어요.'); selRune = null; renderPanel(true); }, { variant: 'danger' }); }
      else if (d.pack && CW.FRIEND) { toast('체험판에서는 수령할 수 없어요.'); }
      else if (d.pkbox) {   // 패키지 상자: 꾸욱 누른 뒤 손을 뗀 클릭은 무시(구성품 창이 이미 열림), 아니면 바로 구매 확인
        if (performance.now() - pkHeldAt < 700) return;
        var pkb = CW.packById(d.pkbox), why = CW.packOpen(G.state, d.pkbox);
        if (CW.FRIEND) toast('체험판에서는 수령할 수 없어요.');
        else if (why !== 'ok') pkInfo(d.pkbox);   // 살 수 없는 상자는 눌러도 구성품만 보여 줌
        else confirmBox('연습용 패키지를 받을까요?', '<b>' + pkb.name + '</b> · 표시 가격 ' + pkb.won.toLocaleString('ko-KR') + '원<br>실제 결제는 없어요. 구성품은 <b>가방</b>에 상자로 들어가요.<br><small>상자를 꾸욱 누르면 구성품을 볼 수 있어요.</small>', '가방에 넣기', function () { pkBuy(d.pkbox); });
      }
      else if (d.pack) { var pk = CW.packById(d.pack); confirmBox('연습용 패키지를 받을까요?', '<b>' + pk.name + '</b> · 표시 가격 ' + pk.won.toLocaleString('ko-KR') + '원<br>실제 결제는 없어요. 구성품은 <b>가방</b>에 상자로 들어가요.', '가방에 넣기', function () { pkBuy(d.pack); }); }
      else if (d.act === 'daily') { showDaily(false); }
      else if (d.dockx) { if (d.dockx === 'sg') selSigil = null; else selRune = null; renderPanel(true); }
      else if (d.sgswap) { var sw = d.sgswap.split('|'); if (G.sigilSwap(sw[0], sw[1])) { if (CW.opalUI) CW.opalUI.fx('sg:' + sw[1]); toast('신성력을 교체했어요.'); } renderPanel(true); }
      else if (d.rswap) { var rw = d.rswap.split('|'); if (G.runeSwap(rw[0], rw[1])) { if (CW.opalUI) CW.opalUI.fx('ru:' + rw[1]); toast('룬을 교체했어요.'); } renderPanel(true); }
      else if (d.sg) { selSigil = sgBag && selSigil === d.sg ? null : d.sg; renderPanel(true); }
      else if (d.sgset !== undefined) { G.sigilSet(+d.sgset); toast('신성력 세트 ' + (+d.sgset + 1) + ' 적용'); renderPanel(true); }
      else if (d.sgf !== undefined) { sgFilter = +d.sgf; renderPanel(true); }
      else if (d.sgeq) { var r5 = G.sigilEquipToggle(d.sgeq); if (r5 && r5 !== 'full' && CW.opalUI) CW.opalUI.fx('sg:' + d.sgeq); if (r5 === 'full') toast('신성력 슬롯이 가득 찼어요. 신성력 레벨을 올리면 슬롯이 늘어나요.'); renderPanel(true); }
      else if (d.sglock) { G.sigilLock(d.sglock); renderPanel(true); }
      else if (d.sgdis) { var n5 = G.sigilDismantle(d.sgdis); toast(n5 ? '신성석 +' + n5 : '장착 중이거나 잠긴 신성력은 분해할 수 없어요.'); renderPanel(true); }
      else if (d.sgfuse) { var f5 = G.sigilFuse(d.sgfuse); if (f5 && f5.fail) { selSigil = f5.kept.id; toast('합성 실패 · ' + hn(f5.kept.grade) + ' 신성력 1개 남음 · 다음 ' + Math.round(f5.next * 100) + '%'); } else if (f5) { selSigil = f5.id; if (CW.opalUI) { CW.opalUI.fx('rc:' + f5.id); CW.opalUI.fx('sg:' + f5.id); } toast('신성력 합성 완료 · ' + hn(f5.grade)); } else toast('장착하지 않고 잠기지 않은 같은 등급 3개가 필요해요.'); renderPanel(true); }
      else if (d.rdsum) { var rd = G.runeSummon(+d.rdsum, rnGroup, true); if (!rd) toast('만들 수 없어요. 룬 가루와 가방 여유 공간을 확인해 주세요.'); else { showRunes(rd, true); renderPanel(true); hud(); } }
      else if (d.sgdsum) { var sd = G.sigilSummon(+d.sgdsum, false, true); if (!sd) toast('만들 수 없어요. 신성력 가루와 가방 여유 공간을 확인해 주세요.'); else { showSigils(sd, false, true); renderPanel(true); hud(); } }
      else if (d.sgsum) { var g5 = G.sigilSummon(+d.sgsum); if (!g5) toast('소환할 수 없어요. 다이아와 가방 여유 공간을 확인해 주세요.'); else { showSigils(g5); renderPanel(true); hud(); } }
      else if (d.act === 'sgbest') { G.sigilEquipBest(); toast('추천 신성력을 장착했어요.'); renderPanel(true); }
      else if (d.act === 'sgdisall') { confirmBox('신성력을 일괄 분해할까요?', '장착하지 않고 잠기지 않은 신성력을 모두 신성석으로 바꿔요.<br>분해한 신성력은 되돌릴 수 없어요.', '신성력 분해', function () { var n6 = G.sigilDismantleAll(); toast(n6 ? '신성석 +' + fmt(n6) : '분해할 신성력이 없어요.'); renderPanel(true); }, { variant: 'danger' }); }
      else if (d.bkey) { selKey = d.bkey; renderPanel(true); }
      else if (d.bmerge) { if (G.merge(d.bmerge)) toast('장비 합성 완료 · ' + CW.gearName(CW.keyOf(CW.parseKey(d.bmerge).kind, CW.parseKey(d.bmerge).t + 1))); else toast('같은 장비 ' + DATA.bagConf.mergeCount + '개가 필요해요.'); renderPanel(true); }
      else if (d.bequip) { if (G.equipKey(d.bequip)) toast(CW.gearName(d.bequip) + ' 장착 완료'); else toast('아직 획득하지 않은 장비예요.'); renderPanel(true); }
      else if (d.plock) { var pk = d.plock.split('|'); if (!G.potLock(pk[0], +pk[1])) toast('재설정할 옵션을 최소 1줄 남겨 주세요.'); renderPanel(true); }
      else if (d.bpot) { if (!G.state.bag[d.bpot]) toast('아직 획득하지 않은 장비예요.'); else if (G.rollPotential(d.bpot)) toast('잠재력을 재설정했어요.'); else toast('다이아가 부족해요.'); renderPanel(true); hud(); }
      else if (d.act === 'best') { G.equipBest(); toast('추천 장비를 장착했어요.'); renderPanel(true); }
      else if (d.act === 'merge') { var n = G.mergeAll(); toast(n ? '장비 ' + n + '개 합성 완료' : '합성할 장비가 없어요.'); renderPanel(true); }
      else if (d.pull) { var n2 = +d.pull, items = G.pull(n2); if (!items) toast('다이아가 부족해요.'); else pullOpen(items); }
      else if (d.shop !== undefined && CW.FRIEND) { toast('체험판에서는 수령할 수 없어요.'); }
      else if (d.shop !== undefined) { var p = DATA.shop[+d.shop]; confirmBox('연습용 다이아를 받을까요?', '<b>' + p.name + '</b> · 표시 가격 ' + p.won.toLocaleString('ko-KR') + '원<br>실제 결제는 없어요. 다이아가 즉시 지급돼요.', '다이아 받기', function () { var g = G.buy(+d.shop); toast('다이아 +' + fmt(g)); renderPanel(true); hud(); }); }
      else if (d.go !== undefined) { if (G.goStage(+d.go)) { toast(CW.stageLabel(+d.go) + ' 이동 완료'); renderPanel(true); } }
      else if (d.act === 'perfview') showPerf();
      else if (d.act === 'perfcopy') copyPerf();
      else if ((d.act === 'ownkey' || d.act === 'ownsend' || d.act === 'ownclear' || d.act === 'ownget') && (CW.FRIEND || !G.ownerSync)) { /* 체험판: no such buttons */ }
      else if (d.act === 'ownget') {
        toast('서버 저장을 불러오고 있어요…');
        G.ownerSync.fetchSave('top').then(function (r) { if (r && r.ok) ownRestore(r); else toast('불러오지 못했어요' + (r && r.msg ? ': ' + r.msg : '.')); });
      }
      else if (d.act === 'ownkey') {
        modal('<h2>Claude에게 저장 보내기</h2><p class="guide-lead">Claude가 알려 준 열쇠를 붙여 넣으세요. 이 기기에만 보관돼요.</p><input class="nickin owkin" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="열쇠">',
          [{ label: '취소' }, { label: '넣기', pri: true, fn: function () {
            var v = $('modalCard').querySelector('.owkin').value;
            if (!G.ownerSync.setKey(v)) { toast('열쇠가 올바르지 않아요. 처음부터 끝까지 복사했는지 확인해 주세요.'); return; }
            toast('열쇠를 넣었어요.');
            renderPanel(true);
            // a fresh start (the app deleted and installed again): the server's save is further on → offer it back first
            // instead of sending this phone's new game
            G.ownerSync.fetchSave('top').then(function (r) {
              if (r && r.ok && CW.ownerSaveAhead(r.data, G.state)) { ownRestore(r); return; }
              G.ownerSync.push('now').then(function (p) { if (p && p.ok) toast('Claude에게 저장을 보냈어요.'); else if (p && p.msg) toast('보내지 못했어요: ' + p.msg); renderPanel(true); });
            });
          } }], { variant: 'guide' });
      }
      else if (d.act === 'ownsend') {
        G.ownerSync.push('now').then(function (r) {
          if (r && r.ok) toast('Claude에게 저장을 보냈어요.');
          else if (r && r.skip === 'soon') toast('방금 보냈어요. 1분 뒤에 다시 눌러 주세요.');
          else if (r && r.skip === 'busy') toast('보내는 중이에요.');
          else toast('보내지 못했어요' + (r && r.msg ? ': ' + r.msg : '.'));
          renderPanel(true);
        });
      }
      else if (d.act === 'ownclear') confirmBox('열쇠를 지울까요?', '지우면 더 이상 Claude에게 저장을 보내지 않아요.', '지우기', function () { G.ownerSync.clearKey(); toast('열쇠를 지웠어요.'); renderPanel(true); });
      else if (d.act === 'nick') {
        modal('<h2>닉네임 변경</h2><p class="guide-lead">1~8글자로 입력해 주세요.</p><input class="nickin" type="text" maxlength="8" autocomplete="off" value="' + esc(G.nickName()) + '">',
          [{ label: '취소' }, { label: '변경하기', pri: true, fn: function () { var v = ($('modalCard').querySelector('.nickin').value || '').replace(/\s+/g, ' ').trim(); if (!v || v.length > 8) { toast('닉네임은 1~8글자로 입력해 주세요.'); return; } G.setNick(v); toast('닉네임을 변경했어요.'); renderPanel(true); hud(); } }], { variant: 'guide' });
      }
      else if (d.set) {
        var st = G.state.settings;
        if (d.set === 'sound') G.setSetting('sound', !st.sound);
        if (d.set === 'pixel') G.setSetting('pixel', !st.pixel);
        if (d.set === 'autoBoss') G.setSetting('autoBoss', st.autoBoss === false);
        if (d.set === 'bottomFit') {
          try { if (bottomInside()) localStorage.removeItem('cw-bottom'); else localStorage.setItem('cw-bottom', 'inside'); } catch (e) {}
          if (root.__cwFit) root.__cwFit(); root.dispatchEvent(new Event('resize'));
        }
        if (d.set === 'fpsCap') G.setSetting('fpsCap', { 50: 40, 40: 30, 30: 60 }[st.fpsCap || 60] || 50);
        if (d.set === 'landSide') G.setSetting('landView', 'side');
        if (d.set === 'landFar') G.setSetting('landView', 'far');
        if (d.set === 'fps60') G.setSetting('fpsCap', 60);
        if (d.set === 'fps120') G.setSetting('fpsCap', 120);
        if (d.set === 'perfOn' && !G.perfOn()) { G.perfSet(true); toast('성능 표시를 켰어요. 지금부터 10초마다 기록해요.'); }
        if (d.set === 'perfOff' && G.perfOn()) { G.perfSet(false); toast('성능 표시를 껐어요. 기록은 남아 있어요.'); }
        if ((d.set === 'aaOn' || d.set === 'aaOff') && CW.aaOn() !== (d.set === 'aaOn')) {   // the 3D picture is made again with the new choice: save, then open the game again
          try { localStorage.setItem('cw-aa', d.set === 'aaOn' ? 'on' : 'off'); } catch (e) {}
          G.setSetting('fpsCap', st.fpsCap || 60);
          setTimeout(function () { location.reload(); }, 60);
        }
        if (d.set === 'quality') G.setSetting('quality', { auto: 'high', high: 'mid', mid: 'low', low: 'auto' }[st.quality]);
        if (d.set === 'reset') confirmBox('모든 진행을 삭제할까요?', '진행·장비·다이아가 모두 삭제되며 <strong>복구할 수 없어요.</strong>', '계속', function () { confirmBox('최종 확인', '진행을 완전히 삭제해요.', '모든 진행 삭제', G.reset, { variant: 'danger' }); }, { variant: 'danger' });
        renderPanel(true);
      }
    };
    panel.addEventListener('click', onClick); dock.addEventListener('click', onClick);
    panel.addEventListener('toggle', function (e) { var t = e.target; if (t && t.classList && t.classList.contains('fold')) foldOpen = t.open; }, true);   // (toggle does not bubble)
    // 승인 시안 (2026-11-16): 훈련·장비의 하위 탭은 시트 맨 아래 막대에 (renderPanel이 그려진 탭 줄을 여기로 옮김)
    var opTabs = document.createElement('div'); opTabs.id = 'opTabs'; opTabs.hidden = true; $('sheet').appendChild(opTabs);
    opTabs.addEventListener('click', onClick); opTabs.addEventListener('pointerdown', onDown);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { opTabs.addEventListener(ev, stopHold); });
    CW.ICO.onTint = function () { if (tab === 'gear' || tab === 'gacha') renderPanel(true); };
    document.querySelectorAll('#tabs [data-tab]').forEach(function (b) { var x = CW.ICO.misc && CW.ICO.misc('tab', b.dataset.tab), sv = b.querySelector('svg'); if (x && sv) sv.outerHTML = x; });
    // the rune and sigil shortcuts use the user's pictures (art/ic-rune.webp, ic-sigil.webp, 2026-11-14)
    var QI = { map: CW.ICO.misc('quick', 'map'), alch: CW.ICO.misc('potion', 'rage'), // the game's own rune and sigil pictures without a grade frame (2026-11-18, the user: 우리실제 룬이랑 신성력 그림 … 테두리 머야)
      rune: '<img class="ico qart" src="art/sg2-atkPct.webp" alt="" draggable="false">',   // the paw crystal (the user: 이그림을 룬으로)
      sigil: '<img class="ico qart" src="art/rn2-rOrigin.webp" alt="" draggable="false">',   // the gold ring star (the user: 이걸 신성력)
      // the monster codex (2026-11-15): the book off the user's codex picture, opens the full-screen page (js/dex-ui.js)
      dex: '<img class="ico" src="art/dex-book.webp" alt="">',
      chest: '<img class="ico" src="art/ic-bag.webp" alt="">',   // 가방 (2026-11-17): 형의 가방 그림 (tools/bag-art.py)
      mail: '<img class="ico" src="art/mail-box.webp" alt="">', notice: CW.noticeHorn ? CW.noticeHorn() : '', idle: CW.idleMoon ? CW.idleMoon() : '' };   // 우편함 (2026-11-15): the user's mailbox picture, js/mail-ui.js
    document.querySelectorAll('#quick [data-quick]').forEach(function (b) { b.querySelector('i').innerHTML = QI[b.dataset.quick] || ''; });
    setTimeout(chestBadge, 0);   // 가방에 남은 상자 수
    $('quick').addEventListener('click', function (e) {
      var b = e.target.closest('[data-quick]'); if (!b) return; var q = b.dataset.quick; G.sound('click');
      if (q === 'map') { selDiff = selRegion = -1; openTab(tab === 'stage' ? 'battle' : 'stage'); }
      else if (q === 'alch') { trainSub = 'alch'; openTab('up'); }
      else if (q === 'dex') { if (CW.dexOpen) CW.dexOpen(); }
      else if (q === 'chest') { openChest(); }
      else if (q === 'mail') { if (CW.mailOpen) CW.mailOpen(); }
      else if (q === 'notice') { if (CW.noticeOpen) CW.noticeOpen(); }   // 공지 (2026-11-16, js/notice-ui.js)
      else if (q === 'idle') { if (CW.idleOn) CW.idleOn(); }   // 방치모드 (2026-11-16, js/idle-ui.js)
      else { gearSub = q; openTab('gear'); }
    });
    $('pre').addEventListener('click', function (e) { var b = e.target.closest('[data-pre]'); if (!b) return; G.switchPreset(+b.dataset.pre); G.sound('click'); toast('스킬 프리셋 ' + (+b.dataset.pre + 1) + ' 적용'); slots(); if (tab === 'skill') renderPanel(true); });
    // 공지에서 바로 가기 (2026-11-17, js/notice-pages.js): 더보기 → 패키지, 뽑기
    CW.openPacks = function () { moreSub = 1; openTab('more'); };
    CW.openGachaTab = function () { openTab('gacha'); };
    // 확률표 → 그 뽑기 칸으로 (2026-11-17, 사용자: 장비면 장비 뽑기, 룬이면 룬, 신성력이면 신성력, 유물이면 유물로): 룬·신성력·유물 소환은
    // 장비 탭 안 각 화면 아래의 소환 카드 — 그 화면(보관함 말고 본 화면)을 열고 카드까지 내려서 잠깐 반짝이게
    CW.openSummon = function (k) {
      if (k !== 'rune' && k !== 'sigil' && k !== 'relic') { openTab('gacha'); return; }
      gearSub = k; selSigil = selRune = null; rnBag = sgBag = false; openTab('gear');
      var c = panel.querySelector(k === 'rune' ? '.rnsum' : k === 'sigil' ? '.sgsum' : '.rsum'); if (!c) return;
      panel.scrollTop = Math.max(0, c.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 12);
      c.classList.remove('sumflash'); void c.offsetWidth; c.classList.add('sumflash'); setTimeout(function () { c.classList.remove('sumflash'); }, 1600);
    };
    // 메뉴 그림 미리 불러 두기 (2026-11-18, 형: 장비를 누르면 화면은 바로 나오는데 지팡이 그림만 잠깐 늦게 나옴)
    // 메뉴는 누르는 순간 처음 만들어져서, 그때서야 그림을 저장본(서비스워커)에서 꺼내고 풀기 시작함 → 전투·화면 만들기로 바쁜 폰에서는
    // 창이 먼저 뜨고 그림이 한두 박자 뒤에 들어옴 (앱을 켜고 처음 열 때마다). 시작한 뒤 한가할 때 미리 불러 풀어 두고 붙잡아 두면
    // 메뉴를 열 때 같은 주소의 그림이 바로 그려짐. 한 번에 조금씩만 (폰 발열·전투 끊김 없게)
    // 2026-11-18 더 (형: 룬·신성력 화면에 들어가면 가끔 그림·칸이 늦게 나옴 / 전체적으로 늦게 뜨는 화면 없게): 위 방식이 장비 아이템 그림에만
    // 쓰였고, 메뉴 틀 그림(룬·신성력·삼신기 성운 창·돔·받침대·소켓, 장비 전시대, 공용 부품 sk-* 같은 CSS 바탕·마스크 그림)과 룬·신성력·
    // 삼신기 보석 그림은 빠져 있었음 → 처음 열 때마다 룬 26장·신성력 32장(17칸 장착)·삼신기 16장·장비 틀 8장을 그 순간에 받았음
    // (아이폰 크기 에뮬레이션 실측). 훈련·스킬·유물·코스튬 목록 그림도 같았고, 붙잡아 두는 곳이 없어 다시 오갈 때마다 또 받아서
    // 늦게 나왔음(옛 판: 다시 열 때도 신성력 58·룬 60·성장 36개가 한 박자 늦음). 이제 화면에 붙은 CSS 에 나오는 art/ 그림 전부와
    // 메뉴 목록 그림도 미리 받아 warmKeep 에 붙잡아 둠 (파일로 약 10MB, 이미 서비스워커 저장본에 있는 것).
    // CSS 그림은 다 풀면 200MB 가까이라 받아 두기만 하고(decode 안 함, 폰 메모리), 작은 보석 그림만 풀어 둠.
    // 마스크(mask-image) 그림은 브라우저가 CORS 방식으로 받으므로 그 방식으로도 받아 둠.
    // 받는 차례는 한 줄(warmQ)로: 한 번에 받기만 할 그림 12장 / 풀어 둘 작은 그림 6장, 한가할 때(늦어도 0.25초 뒤) 다음 묶음.
    // 처음엔 1.5초마다 4장이라 전투 중인 폰에서는 다 받는 데 몇 분 걸렸음 (CPU 4배 느리게 한 에뮬레이션: 30초 지나도 절반) → 훈련·스킬을 먼저 열면 또 늦게 나옴
    var warmKeep = [], warmHas = {}, warmQ = [], warmRun = false;
    function warmImgs(urls, opt) {
      opt = opt || {};
      urls.forEach(function (u) {
        if (!u) return; var k = (opt.cors ? 'c|' : '') + new URL(u, document.baseURI).href;
        if (warmHas[k]) return; warmHas[k] = 1; warmQ.push({ u: u, cors: !!opt.cors, decode: opt.decode !== false });
      });
      if (!warmRun) { warmRun = true; warmStep(); }
    }
    var warmLater = root.requestIdleCallback ? function (f) { root.requestIdleCallback(f, { timeout: 250 }); } : function (f) { setTimeout(f, 60); };
    function warmStep() {
      if (!warmQ.length) { warmRun = false; return; }
      var load = 0;
      while (warmQ.length && load < 12) {
        var j = warmQ.shift(), im = new Image(); if (j.cors) im.crossOrigin = 'anonymous'; im.decoding = 'async';
        // 받기만 하는 그림도 작은 것(300×300 이하: 돔·알약·칸 등, CSS 그림 중 123장·약 13MB)은 받은 뒤 풀어 둠.
        // 큰 창·버튼·성운 그림(약 190MB)은 받기만: 다 풀면 폰 메모리·발열이 크고, 미리 풀어 둬도 브라우저가 곧 버려 효과가 없었음(특성 성운 실측)
        if (!j.decode && im.decode) im.onload = function () { this.onload = null; if (this.naturalWidth * this.naturalHeight <= 90000) this.decode().catch(function () {}); };
        im.src = j.u; warmKeep.push(im);
        if (j.decode && im.decode) { im.decode().catch(function () {}); load += 2; } else load += 1;
      }
      warmLater(warmStep);
    }
    // 화면에 붙은 스타일(메뉴마다 js 가 넣은 <style>)에 나오는 art/ 그림 주소 전부, mask = 그중 마스크로 쓰이는 것
    function cssArtPics() {
      var all = [], mask = [], seen = {}, mseen = {}, re = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
      function take(v, isMask) {
        var m; re.lastIndex = 0;
        while ((m = re.exec(v))) {
          if (!/(^|\/)art\/[^\/]+\.(webp|png|jpg)$/.test(m[1])) continue;
          var u = new URL(m[1], document.baseURI).href;
          if (!seen[u]) { seen[u] = 1; all.push(u); }
          if (isMask && !mseen[u]) { mseen[u] = 1; mask.push(u); }
        }
      }
      function walk(rules) {
        for (var r = 0; r < rules.length; r++) {
          var rule = rules[r], st = rule.style;
          if (!st) { if (rule.cssRules) walk(rule.cssRules); continue; }
          for (var p = 0; p < st.length; p++) { var v = st.getPropertyValue(st[p]); if (v.indexOf('url(') >= 0) take(v, st[p].indexOf('mask') >= 0); }
        }
      }
      [].forEach.call(document.styleSheets, function (sh) { try { walk(sh.cssRules || []); } catch (e) {} });
      return { all: all, mask: mask };
    }
    function gearKindPics(kind) {   // 장비 목록 한 종류에 나오는 그림 전부 (등급 0~9, 혼돈·멸망은 단계 I~IV마다)
      var out = []; if (!CW.ICO.gearSrc) return out;
      for (var g = 0; g < DATA.grades.length; g++) for (var sb = 1; sb <= 4; sb++) out.push(CW.ICO.gearSrc(kind, g, sb));
      return out;
    }
    // 성장·특성·스킬·유물·코스튬 목록 카드와 각인·연금술·마나 서클·던전·스킬 속성 그림 (메뉴 js 가 <img>·style 로 넣는 것)
    function otherMenuPics(A) {
      var out = (CW.ICO.menuOtherPics && CW.ICO.menuOtherPics()) || [], s = G.state;
      (DATA.marks || []).forEach(function (m) { out.push(A + 'rk-' + m.id + '.webp'); });
      (DATA.potions || []).forEach(function (p) { out.push(A + 'al-' + p.id + '.webp'); });
      Object.keys(DATA.elements || {}).forEach(function (e) { out.push(A + 'sk-el-' + e + '.webp'); });
      ['gold', 'gem', 'mana', 'rune'].forEach(function (k) { out.push(A + 'ui-dungeon-' + k + '.webp'); });
      ['rk-badge', 'rk-paw', 'al-cauldron', 'mn-crystal', 'mn-paw', 'sk-cat', 'tr-state-lock'].forEach(function (n) { out.push(A + n + '.webp'); });
      // 스킬 목록 아이콘: 스킬마다 그리는 함수가 고르는 그림 그대로 (sk2-·sk-·그린 아이콘)
      (DATA.skills || []).forEach(function (sk) { var m = /src="([^"]+)"/.exec((CW.ICO.skill && CW.ICO.skill(sk.id)) || ''); if (m) out.push(m[1]); });
      var wear = s && s.costume && s.costume.wear, big = wear && CW.ICO.cosArt && CW.ICO.cosArt(wear);   // 코스튬 전시대에 서 있는 지금 옷 (큰 그림은 이것만)
      if (big) out.push(big);
      return out;
    }
    (CW.afterStart || function (f) { f(); })(function () {
      setTimeout(function () {
        var A = CW.ART_BASE || 'art/', css = cssArtPics(), abs = function (u) { return new URL(u, document.baseURI).href; };
        var items = ((CW.ICO.menuItemPics && CW.ICO.menuItemPics()) || []).concat([A + 'ic-runestone.webp', A + 'ic-sigilstone.webp']);
        // 룬·신성력 그림·등급 테두리는 <img crossorigin> 라 CORS 방식으로 (runeArt 위 설명). 스킬 속성(sk-el-)은 마스크로 쓰여 CORS
        var corsP = /\/art\/(rn2|sg2|gf|sk-el)-/, isC = function (u) { return corsP.test(abs(u)); }, other = otherMenuPics(A);
        // 차례: 장비를 열면 처음 보이는 지팡이 목록 → 모든 메뉴 틀(CSS) → 룬·신성력·삼신기 그림 → 훈련·스킬·유물·코스튬 등 그림 → 마스크 → 나머지 장비 종류
        warmImgs(gearKindPics(bagKind).concat([A + 'ui-paw.webp', A + 'ui-chest-closed.webp', A + 'ui-chest-open.webp']));
        warmImgs(css.all, { decode: false });
        warmImgs(items.filter(isC), { cors: true });
        warmImgs(items.filter(function (u) { return !isC(u); }));
        warmImgs(other.filter(function (u) { return !isC(u); }), { decode: false });
        warmImgs(other.filter(isC), { decode: false, cors: true });
        warmImgs(css.mask, { decode: false, cors: true });
        warmImgs(['hat', 'robe', 'belt', 'necklace', 'ear', 'ring'].reduce(function (a, k) { return a.concat(gearKindPics(k)); }, []));      }, 1200);
    });
    function openTab(name) {
      if (name === 'gacha') ghdSeen = null;
      if (name === 'more' && tab !== 'more') tierAnim = true;   // 전직 cards slide in when 더보기 opens
      tab = name; document.querySelectorAll('#tabs [data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x.dataset.tab === name ? 'true' : 'false'); });
      var open = name !== 'battle';
      $('sheet').classList.toggle('on', open); $('sheet').classList.toggle('tall', name !== 'more' && name !== 'gacha'); G.setSheet(open);
      $('sheet').classList.toggle('neb', name === 'gacha' || name === 'dungeon' || name === 'more');   // 뽑기·던전·더보기는 성운 바탕 (2026-11-16, the user: 색깔이 너무 튄다 / 여기랑 더보기 란도, 배경을)
      $('sheet').classList.toggle('opal', name === 'up' || name === 'gear' || name === 'skill');
      $('sheet').classList.toggle('stg', name === 'stage');   // 스테이지 선택: the user's violet cloud sky behind it (2026-11-17)   // 오팔 연구소 메뉴 (js/ui-opal.js, 2026-11-16)
      if (open) { skDetail = null; $('sheetTitle').innerHTML = ((CW.ICO.misc && CW.ICO.misc('tab', name)) || (name === 'stage' ? CW.ICO.misc('quick', 'map') : '')) + TITLES[name]; renderTop(); }
    }
    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (!b) return;
      // 탭 아이콘이 눌릴 때마다 저마다 한 번 움직임 (2026-11-16, the user: 여기도 애니메이션화, 너무 그림이다)
      b.classList.remove('tap'); void b.offsetWidth; b.classList.add('tap'); clearTimeout(b._tap); b._tap = setTimeout(function () { b.classList.remove('tap'); }, 750);
      openTab(tab === b.dataset.tab && tab !== 'battle' ? 'battle' : b.dataset.tab); G.sound('click');
    });
    $('sheetClose').addEventListener('click', function () { openTab('battle'); G.sound('click'); });
    $('slots').addEventListener('click', function (e) { var b = e.target.closest('[data-bar]'); if (!b) return; selSlot = +b.dataset.bar; openTab('skill'); G.sound('click'); });
    $('retry').addEventListener('click', function () { G.retryBoss(); });
    $('placeBtn').addEventListener('click', function () { selDiff = selRegion = -1; openTab(tab === 'stage' ? 'battle' : 'stage'); G.sound('click'); });

    // ---------- big moments ----------
    function showOffline(r, onClose) {
      // 2026-11-15 the user's 돌아왔어요 picture (art-src/away-20261115): the cat hugging the coin bag over a lavender dome,
      // a purple badge, the time, a gold card and an experience card side by side, a purple claim button. The cat, coin and
      // star are cut from that picture (tools/cut-away*.py); the rest is drawn so the words stay sharp. It moves: the card
      // pops, the cat hops in and breathes, the sparkles twinkle, the numbers count up, a shine runs over the button.
      var A = CW.ART_BASE || 'art/', h = Math.floor(r.seconds / 3600), m = Math.floor(r.seconds % 3600 / 60);
      var tile = function (cls, img, label, val, to) {
        return '<div class="awt ' + cls + '"><i class="awray"></i><img src="' + A + img + '" alt="" draggable="false"><span>' + label + '</span><b data-to="' + to + '">+' + val + '</b></div>';
      };
      var spark = function (k) { return '<i class="awsp s' + k + '"></i>'; };
      modal('<div class="awtop"><div class="awdome"></div>' + spark(1) + spark(2) + spark(3) + spark(4) + '<img class="awcat" src="' + A + 'ui-away-cat.webp" alt="" draggable="false"></div>' +
        '<div class="awbody"><div class="awbadge">오프라인 보상</div><h2>돌아왔어요!</h2><p>냥법사가 보상을 모았어요</p>' +
        '<div class="awtime"><i></i>' + h + '시간 ' + m + '분' + (r.seconds >= DATA.balance.offlineCapSec ? ' · 최대 8시간' : '') + '</div>' +
        '<div class="awtiles' + (r.xp ? '' : ' one') + '">' + tile('gold', 'ui-away-coin.webp', '골드', gh(r.gold), 'g') + (r.xp ? tile('xp', 'ui-away-star.webp', '경험치', fmt(r.xp), 'x') : '') + '</div>' +
        (r.runeDust ? '<div class="awdust"><span><i class="dusti dr"></i>룬 가루 <b data-to="rd">+' + fmt(r.runeDust) + '</b></span><span><i class="dusti ds"></i>신성력 가루 <b data-to="sd">+' + fmt(r.sigilDust) + '</b></span></div>' : '') +
        (r.levels ? '<div class="offlv">레벨 ' + r.levels + ' 올랐어요!</div>' : '') + '</div>',
        [{ label: '<i class="awstar"></i>보상 받기', pri: true, fn: onClose }]);
      var card = $('modalCard'); card.classList.add('away');
      // count up: the shown number grows from 0 to the real amount (same words as gh / fmt at every step)
      var vals = { g: r.gold || 0, x: r.xp || 0, rd: r.runeDust || 0, sd: r.sigilDust || 0 }, show = { g: gh, x: fmt, rd: fmt, sd: fmt }, t0 = performance.now(), DUR = 900, DELAY = 350;
      var still = root.matchMedia && root.matchMedia('(prefers-reduced-motion:reduce)').matches;
      if (still) return;
      card.querySelectorAll('.awt b[data-to], .awdust b[data-to]').forEach(function (el) { el.innerHTML = '+' + show[el.dataset.to](0); });
      (function step(now) {
        if ($('modal').hidden || !card.classList.contains('away')) return;
        var k = Math.max(0, Math.min(1, (now - t0 - DELAY) / DUR)), e = 1 - Math.pow(1 - k, 3);
        card.querySelectorAll('.awt b[data-to], .awdust b[data-to]').forEach(function (el) { var to = el.dataset.to; el.innerHTML = '+' + show[to](k >= 1 ? vals[to] : vals[to] * e); });
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }
    // ---------- 7-day daily gems (2026-11-15): the popup the user drew, put together from pieces cut out of that picture
    // (tools/cut-daily.py): the frame with the cat, title, day-7 chest and button is one picture; the six day cards are
    // laid on it (taken / today / still to come) and the game writes the day number on each. Every place is in the
    // picture's own units (1086 x 1448) as percent, so it keeps the picture's look at any phone size.
    // auto: opened by itself (on entering the game): only when today's gems are waiting and "오늘 하루 보지 않기" is off.
    var DW = 1086, DH = 1448, DCOL = [105, 400, 695], DROW = [[447, 243], [700, 229]];
    function dbox(x, y, w, h) { return 'left:' + (x / DW * 100) + '%;top:' + (y / DH * 100) + '%;width:' + (w / DW * 100) + '%;height:' + (h / DH * 100) + '%'; }
    function showDaily(auto) {
      var v = G.dailyView();
      if (auto && (!v.today || v.hidden)) return;
      if (!v.total) return;
      var fx = $('dailyFx');
      if (!fx) { fx = document.createElement('div'); fx.id = 'dailyFx'; document.body.appendChild(fx); }
      var A = CW.ART_BASE || 'art/', hide = v.hidden;
      function draw(fresh) {
        v = G.dailyView();
        var cards = '';
        for (var i = 0; i < 6; i++) {
          var day = i + 1, r = DROW[i < 3 ? 0 : 1], x = DCOL[i % 3], y = r[0], h = r[1];
          var st = day <= v.taken ? 'done' : (day === v.taken + 1 && v.today ? 'today' : 'lock');
          // each picture keeps its own margin around the card: done/lock 3 px, today 4 px left and its ribbon on the right
          // the picture's place inside the card box, in card pixels: [left, top, width, height] (the today picture's card is
          // 296 x 245 in the drawing, so it is scaled to the 288-wide slot; its ribbon sticks out on the right like in the drawing)
          var k = 288 / 296, kv = h / 245;
          var p = st === 'today' ? [-4 * k, -3 * kv, 315 * k, 251 * kv] : [-3, -3, 295, h + 6];
          cards += '<div class="dgcard dg-' + st + (fresh === day ? ' got' : '') + '"' + (st === 'today' ? ' data-dclaim="1"' : '') + ' style="' + dbox(x, y, 288, h) + '">' +
            '<img src="' + A + 'ui-daily-' + st + '.webp" alt="" draggable="false" style="left:' + (p[0] / 288 * 100) + '%;top:' + (p[1] / h * 100) + '%;width:' + (p[2] / 288 * 100) + '%;height:' + (p[3] / h * 100) + '%">' +
            '<b class="dgday" style="top:' + (37 / h * 100) + '%">' + day + '일차</b></div>';
        }
        var d7 = v.taken >= 7 ? 'done' : (v.taken === 6 && v.today ? 'today' : 'lock');
        var d7html = d7 === 'lock' ? '' : '<div class="dg7 dg7-' + d7 + (fresh === 7 ? ' got' : '') + '"' + (d7 === 'today' ? ' data-dclaim="1"' : '') + ' style="' + dbox(102, 943, 882, 209) + '"><img src="' + A + 'ui-daily-d7.webp" alt="" draggable="false">' +
          (d7 === 'today' ? '<span class="dpill">받기 가능</span>' : '<img class="dchk" src="' + A + 'ui-daily-check.webp" alt="" draggable="false">') + '</div>';
        var btn = v.today ? '<button class="dmain" data-dclaim="1" style="' + dbox(178, 1172, 730, 130) + '" aria-label="오늘의 다이아 받기"></button>'
          : '<button class="dmain dclose" data-dclose="1" style="' + dbox(178, 1172, 730, 130) + '"><img src="' + A + 'ui-daily-btn.webp" alt="" draggable="false"><span>' + (v.left ? '내일 또 받아요 · 닫기' : '다 받았어요 · 닫기') + '</span></button>';
        fx.innerHTML = '<div class="dwrap"><div class="dpop"><img class="dbase" src="' + A + 'ui-daily-base.webp" alt="" draggable="false">' + cards + d7html + btn +
          '<button class="dx" data-dclose="1" style="' + dbox(948, 138, 96, 96) + '" aria-label="닫기"></button>' +
          '<button class="dhide' + (hide ? ' on' : '') + '" data-dhide="1" style="' + dbox(380, 1312, 330, 60) + '" aria-label="오늘 하루 보지 않기"><i style="left:' + (8 / 330 * 100) + '%;top:' + (8 / 60 * 100) + '%;width:' + (44 / 330 * 100) + '%;height:' + (44 / 60 * 100) + '%"></i></button>' +
          '</div></div>';
      }
      draw();
      fx.hidden = false;
      fx.onclick = function (e) {
        var t = e.target.closest('[data-dclaim],[data-dclose],[data-dhide]'); if (!t) return;
        if (t.dataset.dhide) { hide = !hide; G.hideDaily(hide); t.classList.toggle('on', hide); G.sound('click'); return; }
        if (t.dataset.dclose) { fx.hidden = true; G.sound('click'); renderPanel(true); return; }
        var day = G.dailyView().taken + 1, n = G.claimDaily();
        if (n) { draw(day); toast('다이아 +' + fmt(n) + ' 수령 완료'); hud(); renderPanel(true); }
      };
    }
    // 전직 축하 (2026-11-17, the user: 노란 상자가 너무 촌스러워 — 디자인해서 애니메이션으로): a full-screen moment instead of the cream
    // box. A night nebula with slow light rays in the job's own colour, a glowing ring that lands with the job number, sparks that
    // burst out, the job name popping in letter by letter with a gold shine, then the new skill's card rising and the other skills
    // of that job beside it, and a glass button. A tap closes it once everything is in; reduced motion shows it still.
    var TIER_COL = ['#ffd84a', '#ff6a2b', '#9fd8ff', '#bfefff', '#ffe14a', '#e6e6ff', '#ffd84a', '#b04bff', '#ffffff', '#7fdc6a', '#4fc3ff', '#9fe8c8', '#c8a8ff'];
    // 전직 그림 (2026-11-17, the user: 전직을 딱 하면 저 화면이 나오기만 하면 돼 → 에니메이션화): the GPT picture of that job,
    // cut by tools/cut-tierup.py into layers at the picture's own coordinates (852×1846, art/tuNN-*.webp), put back together and
    // brought in one by one: the background, the name dropping in, a flash and light rays where the cat pops out of its ring,
    // sparks, the skill card rising and its four pictures popping in turn, then the button with a shine. Afterwards the cat
    // floats, the pictures bob and stars twinkle. The sides beyond the picture take its own edge colour. A tap closes it once
    // everything is in. Jobs without a picture keep the nebula moment below.
    // e: edge colour · a: the button colour (flash and sparks) · r: ring centre and radius · b: layer boxes [x0, y0, x1, y1]
    var TIER_PIC = {"2":{"e":"#fccebb","a":"#b54731","r":[426,720,398],"b":{"ch":[22,310,830,1126],"hd":[130,70,722,338],"sk":[18,1122,834,1500],"i1":[43,1221,238,1427],"i2":[238,1207,428,1441],"i3":[428,1218,616,1433],"i4":[616,1205,809,1442],"bt":[50,1524,802,1660]}},"3":{"e":"#feeeb4","a":"#f4b804","r":[426,720,398],"b":{"ch":[22,310,830,1126],"hd":[130,70,722,338],"sk":[18,1122,834,1500],"i1":[43,1219,238,1435],"i2":[238,1223,428,1427],"i3":[428,1214,616,1438],"i4":[616,1224,809,1433],"bt":[50,1524,802,1660]}},"4":{"e":"#bce5fd","a":"#3286bc","r":[426,720,398],"b":{"ch":[22,310,830,1126],"hd":[130,70,722,338],"sk":[18,1122,834,1500],"i1":[43,1219,238,1434],"i2":[238,1225,428,1432],"i3":[428,1229,616,1430],"i4":[616,1220,809,1435],"bt":[50,1524,802,1660]}},"5":{"e":"#e9d5fd","a":"#8d59af","r":[426,720,398],"b":{"ch":[22,310,830,1126],"hd":[130,70,722,338],"sk":[18,1122,834,1500],"i1":[43,1216,238,1423],"i2":[238,1223,428,1425],"i3":[428,1217,616,1433],"i4":[616,1216,809,1431],"bt":[50,1524,802,1660]}},"6":{"e":"#c6cffd","a":"#4b4e92","r":[426,720,398],"b":{"ch":[22,310,830,1126],"hd":[130,70,722,338],"sk":[18,1122,834,1500],"i1":[43,1233,238,1416],"i2":[238,1224,428,1419],"i3":[428,1227,616,1413],"i4":[616,1216,809,1407],"bt":[50,1524,802,1660]}},"7":{"e":"#fdddaa","a":"#d15e20","r":[426,720,398],"b":{"ch":[22,310,830,1126],"hd":[130,70,722,338],"sk":[18,1122,834,1500],"i1":[43,1220,238,1420],"i2":[238,1220,428,1412],"i3":[428,1220,616,1418],"i4":[616,1217,809,1421],"bt":[50,1524,802,1660]}},"8":{"e":"#48367f","a":"#975ba6","r":[426,720,398],"b":{"ch":[22,310,830,1126],"hd":[130,70,722,338],"sk":[18,1122,834,1500],"i1":[43,1230,238,1431],"i2":[238,1237,428,1419],"i3":[428,1234,616,1414],"i4":[616,1228,809,1428],"bt":[50,1524,802,1660]}},"9":{"e":"#fdf5e6","a":"#443c40","r":[426,768,398],"b":{"ch":[22,358,830,1168],"hd":[130,70,722,390],"sk":[18,1162,834,1504],"i1":[43,1249,238,1455],"i2":[238,1252,428,1457],"i3":[428,1254,616,1460],"i4":[616,1242,809,1468],"bt":[50,1528,802,1662]}},"10":{"e":"#dbecc4","a":"#296032","r":[426,720,398],"b":{"ch":[22,310,830,1126],"hd":[130,70,722,338],"sk":[18,1122,834,1500],"i1":[43,1224,238,1435],"i2":[238,1220,428,1437],"i3":[428,1226,616,1435],"i4":[616,1221,809,1440],"bt":[50,1524,802,1660]}},"11":{"e":"#fdeedc","a":"#0c6465","r":[426,720,398],"b":{"ch":[22,310,830,1126],"hd":[130,70,722,338],"sk":[18,1122,834,1500],"i1":[43,1228,238,1444],"i2":[238,1235,428,1443],"i3":[428,1221,616,1446],"i4":[616,1221,809,1451],"bt":[50,1524,802,1660]}}};
    function showTierPic(tier, t) {
      var P = TIER_PIC[tier], B = CW.ART_BASE || 'art/', nn = (tier < 10 ? '0' : '') + tier;
      var at = function (x0, y0, x1, y1) { return 'left:' + (x0 / 8.52).toFixed(3) + '%;top:' + (y0 / 18.46).toFixed(3) + '%;width:' + ((x1 - x0) / 8.52).toFixed(3) + '%;height:' + ((y1 - y0) / 18.46).toFixed(3) + '%;'; };
      var pic = function (k, cls, more) { var q = P.b[k] || [0, 0, 852, 1846]; return '<img class="tu-p ' + cls + '" src="' + B + 'tu' + nn + '-' + k + '.webp" style="' + at(q[0], q[1], q[2], q[3]) + (more || '') + '" alt="" draggable="false">'; };
      var cx = P.r[0], cy = P.r[1], R = P.r[2], bt = P.b.bt;
      var sparks = ''; for (var k = 0; k < 16; k++) sparks += '<b style="--a:' + (k * 22.5 + (k % 3) * 6) + 'deg;--d:' + (30 + (k * 37) % 22) + 'cqw;--s:' + (0.7 + (k % 4) * 0.22) + '"></b>';
      var tw = '', TW = [[8, 22], [90, 17], [14, 47], [87, 44], [6, 70], [93, 62], [20, 86], [80, 88], [50, 3], [30, 33], [71, 31], [48, 96]];
      TW.forEach(function (p, i) { tw += '<i class="tu-tw" style="left:' + p[0] + '%;top:' + p[1] + '%;--k:' + i + ';--z:' + (0.6 + (i % 3) * 0.3) + '"></i>'; });
      var el = document.createElement('div'); el.id = 'tierfx'; el.className = 'pic'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', tier + '차 전직 완료 · ' + t.name);
      el.style.background = P.e;
      el.innerHTML = '<div class="tu-stage" style="--ac:' + P.a + '">' + pic('bg', 'tu-bg') +
        '<div class="tu-rays" style="' + at(cx - R * 1.25, cy - R * 1.25, cx + R * 1.25, cy + R * 1.25) + '"></div>' +
        '<div class="tu-chw">' + pic('ch', 'tu-ch') + '</div>' +
        '<div class="tu-burst" style="' + at(cx - R, cy - R, cx + R, cy + R) + '"><i></i><u></u><div class="tu-sp">' + sparks + '</div></div>' +
        pic('hd', 'tu-hd') + pic('sk', 'tu-sk') + pic('i1', 'tu-ic', '--j:0') + pic('i2', 'tu-ic', '--j:1') + pic('i3', 'tu-ic', '--j:2') + pic('i4', 'tu-ic', '--j:3') +
        pic('bt', 'tu-bt') + '<div class="tu-shine" style="' + at(bt[0] + 10, bt[1] + 12, bt[2] - 10, bt[3] - 14) + '"></div>' + tw + '</div>' +
        '<button class="tf-hit" type="button" aria-label="새로운 힘 확인"></button>';
      document.body.appendChild(el);
      var ready = false, shown = false, close = function () { if (!ready) return; el.classList.add('out'); setTimeout(function () { el.remove(); }, 380); };
      var show = function () { if (shown) return; shown = true; requestAnimationFrame(function () { el.classList.add('on'); }); setTimeout(function () { ready = true; }, 1700); };
      var imgs = el.querySelectorAll('img'), left = imgs.length, one = function () { if (--left <= 0) show(); };
      for (var i = 0; i < imgs.length; i++) { if (imgs[i].complete) one(); else { imgs[i].onload = one; imgs[i].onerror = one; } }
      setTimeout(show, 2500);
      el.addEventListener('click', close);
    }
    function showTierUp(tier, skill) {
      var t = DATA.tiers[tier - 1] || { name: tier + '차' }, col = TIER_COL[tier - 1] || '#ffd84a';
      var old = document.getElementById('tierfx'); if (old) old.remove();
      if (TIER_PIC[tier]) return showTierPic(tier, t);
      var art = function (sk) { var a = CW.ICO.skillArt && CW.ICO.skillArt(sk.id); return a ? '<img src="' + a + '" alt="" draggable="false">' : '<span class="tf-noart">' + sk.name.slice(0, 1) + '</span>'; };
      var more = skill ? DATA.skills.filter(function (x) { return x.tier === tier && x.id !== skill.id; }) : [];
      var letters = t.name.split('').map(function (ch, i) { return '<i style="--i:' + i + '">' + (ch === ' ' ? '&nbsp;' : ch) + '</i>'; }).join('');
      var sparks = ''; for (var k = 0; k < 18; k++) sparks += '<b style="--a:' + (k * 20 + (k % 3) * 7) + 'deg;--d:' + (90 + (k * 37) % 70) + 'px;--s:' + (0.6 + (k % 4) * 0.25) + '"></b>';
      var el = document.createElement('div'); el.id = 'tierfx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', tier + '차 전직 완료');
      el.style.setProperty('--tc', col);
      el.innerHTML = '<div class="tf-bg"></div><div class="tf-rays"></div>' +
        '<div class="tf-wrap">' +
          '<div class="tf-ring"><i class="tf-rune"></i><i class="tf-glow"></i><div class="tf-num"><b>' + tier + '</b><span>차 전직</span></div><div class="tf-sparks">' + sparks + '</div></div>' +
          '<div class="tf-name">' + letters + '</div>' +
          '<div class="tf-sub">전직 완료!</div>' +
          (skill ? '<div class="tf-skill"><div class="tf-card">' + art(skill) + '</div><div class="tf-new"><small>새 스킬</small><b>' + skill.name + '</b><span>슬롯에 바로 넣었어요</span></div></div>' : '') +
          (more.length ? '<div class="tf-more">' + more.map(function (x, i) { return '<div class="tf-mini" style="--j:' + i + '">' + art(x) + '<span>' + x.name + '</span></div>'; }).join('') + '</div>' : '') +
          '<button class="tf-ok" type="button">확인</button>' +
        '</div>';
      document.body.appendChild(el);
      var ready = false, close = function () { if (!ready) return; el.classList.add('out'); setTimeout(function () { el.remove(); }, 380); };
      setTimeout(function () { ready = true; }, 1300);
      el.addEventListener('click', close);
      requestAnimationFrame(function () { el.classList.add('on'); });
    }
    // 뽑기를 누르면 메뉴 위의 고양이 귀 상자가 그 자리에서 덜컹 → 딱 열리고 바로 장비 카드 (2026-11-16, the user: 이 그림을 크게,
    // 100회 뽑기 누르면 저거 딱 열리면서 나오는 거지). 상자가 화면 밖(스크롤)이면 예전처럼 따로 뜨는 상자로. 메뉴는 카드가 뜬 뒤 다시 그림
    var pulling = false;
    function pullOpen(items) {
      var box = panel.querySelector('.gchest'), r = box && box.getBoundingClientRect();
      if (pulling) return;
      if (!r || r.bottom < 60 || r.top > innerHeight - 120) { showGacha(items); renderPanel(true); hud(); return; }
      var big = Math.max.apply(null, items.map(function (i) { return i.grade; })) >= 4, wait = big ? 900 : 520;
      pulling = true; hud(); G.sound('pull');
      box.classList.remove('go', 'open', 'big'); void box.offsetWidth; box.classList.add('go'); if (big) box.classList.add('big');
      setTimeout(function () { box.classList.add('open'); }, wait);
      setTimeout(function () { pulling = false; showGacha(items, true); renderPanel(true); hud(); }, wait + 380);
    }
    function showGacha(items, direct) {
      var fx = $('gachaFx'), best = Math.max.apply(null, items.map(function (i) { return i.grade; }));
      // 상자는 고양이 귀 상자 하나만 (2026-11-16, the user: 그냥 이 상자로만 하자): 덜컹덜컹 → 열림 → 장비 카드
      fx.hidden = false; fx.innerHTML = '<div class="chest"><img class="cclosed" src="' + (CW.ART_BASE || 'art/') + 'ui-chest-closed.webp" alt="" draggable="false"><img class="copen" src="' + (CW.ART_BASE || 'art/') + 'ui-chest-open.webp" alt="" draggable="false"></div><div class="note">마법 상자를 여는 중…</div><button class="btn" id="gSkip">건너뛰기</button>';
      var chest = fx.querySelector('.chest'), openT = setTimeout(function () { chest.classList.add('open'); }, best >= 4 ? 900 : 500);
      if (!direct) G.sound('pull');
      var done = false;
      function showCards() {
        if (done) return; done = true; clearTimeout(openT);
        if (best >= 4) { $('flashbg').classList.remove('go'); void $('flashbg').offsetWidth; $('flashbg').classList.add('go'); G.sound('legend'); }
        var shown = items.slice().sort(function (a, b) { return b.grade - a.grade; });
        // 500회 뽑기가 버벅이던 것 (사용자 2026-11-16): 카드 500장(요소 약 5천 개)에 빛·뒤집기 움직임이 한꺼번에 돌았음 →
        // 30장이 넘으면 같은 장비·같은 등급은 카드 한 장에 「×개수」로 묶음 (얻는 장비는 그대로, 보여 주기만 묶음)
        if (shown.length > 30) {
          var byKey = {}, grouped = [];
          shown.forEach(function (it) { var k = it.kind + ':' + it.grade + ':' + (it.sub || 0); if (byKey[k]) byKey[k].n++; else { byKey[k] = { kind: it.kind, grade: it.grade, sub: it.sub, n: 1 }; grouped.push(byKey[k]); } });
          shown = grouped;
        }
        var hero = best >= 4 ? '<div class="reveal" style="color:' + gc(best) + '">' + DATA.grades[best].name + '!</div>' : '';
        fx.innerHTML = hero + '<div class="cards">' + shown.map(function (it, i) { return '<div class="gcard" style="--gc:' + gc(it.grade) + ';--d:' + Math.min(i * 0.04, 1.2) + 's"><div class="gface">' + gearArt(it.kind, it.grade, it.sub) + '<small>' + DATA.grades[it.grade].name + ' ' + CW.roman(it.sub || 0) + '</small>' + (it.n > 1 ? '<b class="gcnt">×' + it.n + '</b>' : '') + '</div><div class="gbackc" style="background-image:url(' + (CW.ART_BASE || 'art/') + 'ui-card-back.webp)"></div></div>'; }).join('') + '</div><div class="btns" style="width:min(420px,100%)"><button class="btn" id="gClose">닫기</button><button class="btn pri" id="gAgain">한 번 더 (' + items.length + '회)</button></div>';
        $('gClose').onclick = function () { fx.hidden = true; };
        $('gAgain').onclick = function () { var more = G.pull(items.length); if (!more) { toast('다이아가 부족해요.'); return; } showGacha(more); renderPanel(true); hud(); };
      }
      if (direct) { showCards(); return; }
      $('gSkip').onclick = showCards; setTimeout(showCards, best >= 4 ? 1400 : 900);
    }

    var logLines = [];
    function gainLog(g) {
      var add = [];
      if (g.gold > 0) add.push('<i class="coin"></i>골드 +' + gh(g.gold));
      if (g.xp > 0) add.push('<b class="xpdot"></b>경험치 +' + fmt(g.xp));
      if (g.gems > 0) add.push('<i class="gem"></i>다이아 +' + fmt(g.gems));
      // field kills: each dust on its own line (the user: 붙이지 말고 따로따로), shown when a whole one more is reached
      if (g.runeStone > 0) add.push('<i class="runestone"></i>룬석 +' + fmt(g.runeStone));
      if (g.sigilStone > 0) add.push('<i class="sigilstone"></i>신성석 +' + fmt(g.sigilStone));
      if (g.runeDust > 0) add.push('<i class="dusti dr"></i>룬 가루 +' + fmt(g.runeDust));
      if (g.sigilDust > 0) add.push('<i class="dusti ds"></i>신성력 가루 +' + fmt(g.sigilDust));
      (g.more || []).forEach(function (m) { add.push('<b class="gdot" style="background:' + m.c + '"></b>' + m.t); });
      if (!add.length) return;
      logLines = add.concat(logLines).slice(0, Math.max(4, add.length));
      $('gainlog').innerHTML = logLines.map(function (l, i) { return '<div style="opacity:' + Math.max(0.4, 1 - i * 0.15) + '">' + l + '</div>'; }).join('');
    }
    // ---------- stat window (2026-11-14): tap the profile; final stats in groups, each opens to where it comes from; titles ----------
    var SRC_KO = { growth: '성장(초월)', gear: '장비', relics: '유물', costume: '코스튬', divine: '삼신기', skills: '스킬 모음', training: '훈련', runes: '룬', sigil: '신성력', alchemy: '물약', titles: '타이틀', dex: '도감' };
    // 냥법사 기록 (2026-11-15, the user's picture art-src/prof/mockup.webp): a full page. The top is the picture itself
    // (art/prof-top.webp, the example name and numbers wiped) with the real ones written in the same places; under it the
    // boxes of the picture: 공격 효과 (open), 크리티컬, 특수 효과 and 타이틀. A line opens to where its bonus comes from.
    var profEl = null, profOpen = { atk: true }, profSrc = null;
    function profParts(keys, by, short) {
      var parts = [];
      Object.keys(by.parts).forEach(function (src) {
        keys.forEach(function (k, i) { var v = by.parts[src][k]; if (v) parts.push('<li><span>' + (SRC_KO[src] || src) + '</span><i>' + (short ? short[i] : '') + '</i><b>' + CW.bonusAmount(k, v) + '</b></li>'); });
      });
      return parts.join('');
    }
    // one line of a box: name | value (| second value); with parts it opens to them
    // cell4: a 4th column's cell (the crit table's 초과 피해), extraLi: one more line for the breakdown
    function profRow(label, value, keys, by, value2, short, cell4, extraLi) {
      var parts = profParts(keys, by, short) + (extraLi || '');
      var cls = 'pfl' + (cell4 !== undefined ? ' four' : '');
      var cells = '<span>' + label + '</span>' + (value2 === undefined ? '<b class="w2">' + value + '</b>' : '<b>' + value + '</b><b>' + value2 + '</b>') + (cell4 || '');
      if (!parts) return '<div class="pfrow"><div class="' + cls + '">' + cells + '</div></div>';
      return '<details class="pfrow"><summary class="' + cls + '">' + cells + '</summary><ul>' + parts + '</ul></details>';
    }
    function profBox(id, ico, name, sum, body) {
      var on = !!profOpen[id];
      return '<section class="pfbox' + (on ? ' on' : '') + '"><button class="pfhd" data-pfsec="' + id + '" aria-expanded="' + on + '"><img src="art/prof-ico-' + ico + '.webp" alt="">' +
        '<b>' + name + '</b>' + (sum ? '<small>' + sum + '</small>' : '') + '<i class="pfchev"></i></button><div class="pfin">' + body + '</div></section>';
    }
    function profHtml() {
      var s = G.state, st = CW.stats(s), by = CW.bonusBySource(s), tier = DATA.tiers[s.tier - 1] || {}, worn = CW.titleWorn(s), owned = CW.titlesOwned(s);
      var x = function (v) { return '×' + (Math.round(v * 100) / 100).toFixed(2); };
      // 크리티컬 (2026-11-16): the open tiers by full name, each 'rate | multiplier'. When some rate is past 100% a
      // 4th column '초과 피해' shows what that overflow adds to the tier's damage (one line per tier, columns lined
      // up), and a card under the table says the rule.
      var critOpen = DATA.critTiers.filter(function (t, i) { return CW.critTierOpen(s, i); });
      var overAny = critOpen.some(function (t) { return (st[t.rate + 'Raw'] || 0) > 1; });
      // the 확률 column shows the real rate (9,276% rather than 100%), so it is plain what went past 100%
      var pctBig = function (v) { return (v >= 10 ? Math.round(v * 100).toLocaleString('ko-KR') : Math.round(v * 1000) / 10) + '%'; };
      var crit = critOpen.map(function (t) {
        var raw = st[t.rate + 'Raw'] || 0, over = st[t.dmg + 'Over'] || 0, cell, rate = pct(st[t.rate] || 0);
        if (!overAny) cell = undefined;
        else if (raw > 1) {
          rate = '<em class="over">' + pctBig(raw) + '</em>';
          cell = '<em class="pfov">+' + Math.round(over * 1000) / 10 + '%</em>';
        } else cell = '<em class="pfov none">-</em>';
        return profRow(t.name, rate, [t.rate, t.dmg, t.dmg + 'Pct'], by, x(st[t.dmg] || 0), ['확률', '배율', '피해'], cell);
      }).join('');
      var titles = DATA.titles.map(function (t) {
        var have = owned.indexOf(t.id) >= 0, on = worn === t.id;
        var eff = t.bonus ? Object.keys(t.bonus).map(function (k) { return (STAT_KO[k] || k) + ' ' + CW.bonusAmount(k, t.bonus[k]); }).join(' · ') : '효과 없음';
        return '<button class="ttl' + (on ? ' on' : '') + (have ? '' : ' lock') + '" data-title="' + t.id + '"' + (have ? '' : ' disabled') + '><b>' + (have ? '' : '🔒 ') + t.name + '</b><small>' + (have ? eff : CW.titleNeedText(t)) + '</small></button>';
      }).join('');
      var srcBox = '';
      if (profSrc) {
        var SRC = { atk: ['공격력', ['atk', 'atkPct']], speed: ['공격 속도', ['speed']] }[profSrc], parts = SRC ? profParts(SRC[1], by) : '';
        srcBox = '<div class="pfsrc"><b>' + (SRC ? SRC[0] : '') + ' 증가 내역</b>' + (parts ? '<ul>' + parts + '</ul>' : '<p>아직 더해진 게 없어요</p>') + '</div>';
      }
      var top = '<div class="pftop"><button class="pfx" aria-label="닫기"></button>' +
        '<b class="pfname">' + esc($('nick').textContent) + '</b><span class="pflv">Lv.' + s.level + ' · ' + esc(tier.name || '') + '</span>' +
        '<b class="pfv pfcp">' + fmt(CW.dps(s, st)) + '</b>' +
        '<button class="pfv pfatk" data-pfsrc="atk" aria-label="공격력 증가 내역">' + fmt(st.atk) + '</button>' +
        '<button class="pfv pfspd" data-pfsrc="speed" aria-label="공격 속도 증가 내역">' + x(st.speedMul) + '</button>' +
        '<b class="pfboss"><span>보스 예상 초당 피해</span>' + fmt(CW.bossDpsTypical(s, st, (CW.stageInfo(s.stage) || {}).timeLimit || 30)) + '</b></div>';
      var titleBox = '<section class="pfbox pftbox' + (profOpen.title ? ' on' : '') + '"><button class="pfhd" data-pfsec="title" aria-expanded="' + !!profOpen.title + '"><img src="art/prof-ico-title.webp" alt="">' +
        '<b>타이틀</b><span class="pfbar"></span><span class="pfbadge">' + esc(CW.titleById(worn).name) + '</span><em>변경</em></button><div class="pfin"><div class="ttls">' + titles + '</div></div></section>';
      return top + '<div class="pfbody">' + srcBox +
        profBox('atk', 'atk', '공격 효과', '', profRow('스킬·모든 피해', x(st.skillDmg * st.mastery), ['skillDmg', 'finalPct'], by) + profRow('보스 피해', x(st.bossDmg), ['bossDmg'], by) + profRow('분노의 물약', x(st.finalMul), ['potion'], by)) +
        profBox('crit', 'crit', '크리티컬', '확률 ' + pct(st.critRate || 0) + ' · 배율 ' + x(st.critDmg || 0), '<div class="pfcols' + (overAny ? ' four' : '') + '"><span></span><em>확률</em><em>배율</em>' + (overAny ? '<em>초과 피해</em>' : '') + '</div>' + crit +
          (overAny ? '<div class="pfhint"><p class="hd">✦ 초과 피해란?</p>' +
            '<p>확률은 <b>100%</b>까지만 쓰여요. 넘은 확률 <b>1%p</b>마다 그 단계 피해가 <b>+' + DATA.critConf.overPer + '%</b> 더 붙어요.<span class="cap">최대 +' + Math.round(DATA.critConf.overMax * 100) + '%</span></p></div>' : '')) +
        profBox('spec', 'spec', '특수 효과', '', profRow('약점 피해', x(st.weakMul), ['weakDmg'], by) + profRow('폭주 피해', x(st.surgeMul), ['surgeDmg', 'surgeRate'], by) +
          profRow('골드 획득', x(st.goldMul), ['goldMul', 'potionGold'], by) + profRow('경험치 획득', x(st.xpMul), ['xpMul', 'potionXp'], by)) +
        titleBox + '<p class="pfnote"><img src="art/prof-ico-hand.webp" alt="">능력치를 선택하면 증가 내역을 확인할 수 있어요.</p></div>';
    }
    // long numbers or names never spill out of their place: the font shrinks until it fits
    // (the room is the box's own width, capped by its max-width; the serif digits arrive late, so it fits again then)
    function profFit() {
      if (!profEl) return;
      profEl.querySelectorAll('.pfv,.pfboss,.pfname,.pflv,.pfbadge,.pfhd small,.pfl b').forEach(function (el) {
        el.style.fontSize = ''; var f = parseFloat(getComputedStyle(el).fontSize);
        for (var i = 0; i < 40 && el.scrollWidth > el.clientWidth + 0.5; i++) { f *= 0.95; el.style.fontSize = f + 'px'; }
      });
    }
    function profRender(keepScroll) {
      var col = profEl.querySelector('.pfcol'), y = col.scrollTop, open = [];
      profEl.querySelectorAll('details.pfrow[open] .pfl span').forEach(function (n) { open.push(n.textContent); });
      col.innerHTML = '<div class="pfpage">' + profHtml() + '<img class="pfcorner l" src="art/prof-corner-l.webp" alt=""><img class="pfcorner r" src="art/prof-corner-r.webp" alt=""></div>';
      profEl.querySelectorAll('details.pfrow').forEach(function (d) { if (open.indexOf(d.querySelector('.pfl span').textContent) >= 0) d.open = true; });
      col.scrollTop = keepScroll ? y : 0; profFit();
    }
    function openStats() {
      if (!profEl) {
        profEl = document.createElement('div'); profEl.id = 'prof'; profEl.setAttribute('role', 'dialog'); profEl.setAttribute('aria-label', '냥법사 기록');
        profEl.innerHTML = '<div class="pfcol"></div>'; document.body.appendChild(profEl);
        profEl.addEventListener('click', function (e) {
          var t = e.target;
          if (t.closest('.pfx') || t === profEl) { G.sound('click'); closeProf(); return; }
          var sec = t.closest('[data-pfsec]'); if (sec) { G.sound('click'); profOpen[sec.dataset.pfsec] = !profOpen[sec.dataset.pfsec]; profRender(true); return; }
          var src = t.closest('[data-pfsrc]'); if (src) { G.sound('click'); profSrc = profSrc === src.dataset.pfsrc ? null : src.dataset.pfsrc; profRender(true); return; }
          var b = t.closest('[data-title]');
          if (b && G.titleWear(b.dataset.title)) { toast(CW.titleById(b.dataset.title).name + ' 칭호 장착 완료'); profRender(true); hud(); }
        });
        window.addEventListener('resize', function () { if (profEl.classList.contains('on')) profFit(); });
        if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { if (profEl.classList.contains('on')) profFit(); });
      }
      profSrc = null; profEl.classList.add('on'); profRender(false);
      // the clock area above the home-screen app takes the page's top colour while it is open (tools/build-site.cjs)
      document.documentElement.classList.add('profon'); profTheme(PROF_TOP);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(profFit);
    }
    var PROF_TOP = '#f7ebe2';
    function profTheme(c) { var tc = document.querySelector('meta[name="theme-color"]'); if (tc && c) tc.setAttribute('content', c); }
    function closeProf() {
      profEl.classList.remove('on'); document.documentElement.classList.remove('profon');
      profTheme(getComputedStyle(document.documentElement).getPropertyValue('--capc').trim());
    }
    document.querySelector('#hud .nh-prof').addEventListener('click', function () { G.sound('click'); openStats(); });
    return { surgeGauge: surgeGauge, dunHud: dunHud, gainLog: gainLog, openTab: openTab, hud: hud, slots: slots, renderPanel: renderPanel, toast: toast, banner: banner, showOffline: showOffline, showDaily: showDaily, showTierUp: showTierUp, showGacha: showGacha, modal: modal, currentTab: function () { return tab; } };
  }
  CW.createUI = createUI;
})(this);
