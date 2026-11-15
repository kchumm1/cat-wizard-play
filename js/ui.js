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
    var bagKind = 'staff', selKey = null;
    var KIND_SHORT = { hat: '모자', staff: '지팡이', robe: '로브', belt: '벨트', necklace: '목걸이', ear: '귀걸이', ring: '반지' };
    function statLine(stat, v) { return stat === 'speedBoss' ? '공격 속도 +' + pct(v) + ' · 보스 피해 +' + pct(v * 8) : (STAT_NAME[stat] || STAT_KO[stat] || stat) + ' +' + pct(v); }
    function potTag(q) { return q > 0.85 ? ['레전더리', '#ff4d6d'] : q > 0.6 ? ['유니크', '#ffd84a'] : q > 0.3 ? ['에픽', '#c47bff'] : ['레어', '#6fb8ff']; }
    function bagCell(k, big) {
      var s = G.state, p = CW.parseKey(k), e = s.bag && s.bag[k], worn = s.equip[p.kind] === k;
      return '<' + (big ? 'div' : 'button') + ' class="bcell' + (big ? ' big' : '') + (e ? '' : ' none') + (worn ? ' eq' : '') + (!big && selKey === k ? ' sel' : '') + '" ' + (big ? '' : 'data-bkey="' + k + '" ') + 'style="--gc:' + gc(p.grade) + '">' +
        '<span class="tg">' + DATA.grades[p.grade].name + ' ' + CW.roman(p.sub) + '</span>' + gearArt(p.kind, p.grade, p.sub) + (worn ? '<span class="E">E</span>' : '') +
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
      var pnote = e && e.pot ? '<div class="pnote">' + CW.ICO.pic('lock', 'ilock plocknote') + '<span>잠근 옵션은 유지돼요.<br>옵션 1줄을 잠글 때마다 재설정 비용 <span class="pcost">+<i class="gem"></i>' + DATA.potConf.cost + '</span></span></div>' : '';
      var top = '<div class="bagtop">' + bagCell(k, true) + '<div class="binfo"><div class="bname"><em class="gbadge" style="--gc:' + gc(p.grade) + '">' + DATA.grades[p.grade].name + '</em><b>' + DATA.kindName[p.kind] + '</b></div><span class="gstars">' + stars + '</span><div class="blv"><span>Lv.' + lv + ' / ' + max + (e ? '' : ' · 아직 없어요') + '</span><i><em style="width:' + Math.round(100 * Math.min(1, lv / Math.max(1, max))) + '%"></em></i></div></div>' +
        '<div class="bdetail"><div class="bdiv">' + PAW + '</div><div class="effrow"><em>' + PAW + '장착 효과</em><span>' + statLine(stat, CW.mainValue(p.kind, p.t, lv, star)) + '</span></div><div class="effrow"><em>' + PAW + '보유 효과</em><span>' + statLine(stat, CW.ownedValue(p.kind, p.t, lv, star)) + '</span></div>' +
        '<div class="gpot"><em class="ptab">' + PAW + '잠재력</em><div class="plist">' + pot + '</div></div>' + pnote + '</div></div>' +
        '<div class="bagbtns"><button class="buy' + (!e || lv >= max || s.gold < cost ? ' off' : '') + '" data-blv="' + k + '">' + (lv >= max ? '최대 레벨' : '<small>레벨업</small><span><i class="coin"></i>' + gh(cost) + '</span>') + '</button>' +
        '<button class="btn' + (e && e.n >= DATA.bagConf.mergeCount && p.t < T - 1 ? '' : ' off') + '" data-bmerge="' + k + '">합성 ' + (e ? e.n : 0) + '/' + DATA.bagConf.mergeCount + '</button>' +
        '<button class="btn' + (worn ? ' on' : '') + (e ? '' : ' off') + '" data-bequip="' + k + '">' + (worn ? '장착 중' : '장착') + '</button>' +
        '<button class="btn tr' + (trOk ? '' : ' off') + '" data-btr="' + k + '">' + (star >= BG.starMax ? '초월 완료 ★' + star : '초월 ★' + star + '→' + (star + 1) + '<small>최대 레벨 · 같은 장비 ' + trc.copies + '개 · <span class="trcost"><i class="coin"></i>' + gh(trc.gold) + '</span></small>') + '</button>' +
        '<button class="btn pot' + (e ? '' : ' off') + '" data-bpot="' + k + '"><small>잠재력</small><span><i class="gem"></i>' + fmt(e ? CW.potCost(s, k) : DATA.potConf.cost) + '</span></button></div>';
      var kinds = '<div class="kindtabs" role="tablist">' + DATA.kinds.map(function (kd) {
        var w = s.equip[kd], g = w ? CW.parseKey(w).grade : -1;
        return '<button role="tab" aria-selected="' + (kd === bagKind) + '" data-bkind="' + kd + '">' + KIND_SHORT[kd] + (g >= 0 ? '<i style="background:' + gc(g) + '"></i>' : '') + '</button>';
      }).join('') + '</div><div class="btns bagacts"><button class="btn pri" data-act="merge">전부 합성</button><button class="btn" data-act="best">추천 장착</button></div>';
      var rows = '';
      for (var g = DATA.grades.length - 1; g >= 0; g--) for (var sb = 0; sb < 4; sb++) rows += bagCell(CW.keyOf(bagKind, g * 4 + sb));
      var tl = CW.gearTotalLevel(s);
      var ns = CW.gearStars(s);
      return top + kinds + '<div class="bgrid">' + rows + '</div><div class="codexbar"><span>장비 통합 레벨 효과 (Lv.' + fmt(tl) + ')</span><b>공격력 +' + pct(tl * DATA.gearCodex.per) + '</b></div>' +
        '<div class="codexbar"><span>장비 초월 통합 성급 (★' + ns + ')</span><b>모든 피해 +' + pct(ns * BG.starFinal) + '</b></div>' +
        guideRow('gear', '같은 장비 ' + DATA.bagConf.mergeCount + '개 → 한 단계 위 · 초월로 더 강하게');
    }
    var selDiff = -1, selRegion = -1, gearSub = 'gear', upMul = 1, trainSub = 'grow', selTalent = null, selRune = null, fxRune = null, rnFilter = 'all', selSigil = null, sgFilter = -1, moreSub = 0;
    function mmss(sec) { sec = Math.ceil(sec); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
    function alchPanel() {
      var s = G.state, AC = DATA.alchConf, now = Date.now();
      if (!CW.alchemyOpen(s)) return '<div class="notice">' + '연금술은 ' + AC.unlockTier + '차 전직 후 열려요.<br><small>1-31 보스 처치 → 2차 전직</small></div>';
      var lv = CW.alchLevel(s), cost = CW.potionCost(s), brews = (s.alch && s.alch.brews) || 0, toNext = AC.brewsPerLv - brews % AC.brewsPerLv;
      var head = '<div class="alchhead"><div class="cauldron" aria-hidden="true">' + CW.ICO.pic('cauldron') + '</div><div><b>연금술 Lv.' + lv + '</b><span class="note">다음 레벨까지 물약 ' + toNext + '개<br>물약 효과 +' + pct(lv * AC.effPerLv) + ' · 지속 ' + CW.potionMinutes(s) + '분</span></div></div>';
      var list = DATA.potions.map(function (p) {
        var left = CW.buffLeft(s, p.id, now);
        return '<div class="row potion' + (left ? ' on' : '') + '"><div class="ricon pt">' + mi('potion', p) + '</div><div class="info"><div class="name">' + p.name + '</div><div class="desc">' + p.desc + ' ×' + (1 + CW.potionPower(s, p.id)).toFixed(2) + (left ? ' · <b class="tleft">남은 시간 ' + mmss(left) + '</b>' : '') + '</div></div>' +
          '<button class="buy' + (s.gold < cost ? ' off' : '') + '" data-brew="' + p.id + '"><small>' + (left ? '시간 추가' : '만들기') + '</small><span><i class="coin"></i>' + gh(cost) + '</span></button></div>';
      }).join('');
      return head + '<div class="list">' + list + '</div>' + guideRow('alchemy', '제작 비용 · 사냥 약 ' + Math.round(AC.costSec / 60) + '분 수익 · 최대 ' + CW.potionMinutes(s) * AC.stackCap + '분');
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
      if (trainSub === 'mark') return trainTabs() + manaLine() + markPanel();
      if (trainSub === 'circle') return trainTabs() + manaLine() + circlePanel();
      return trainTabs() + upPanel();
    }
    function talentPanel() {
      var s = G.state, pts = CW.talentPoints(s), spent = CW.talentSpent(s), TC = DATA.talentConf;
      var last = TC.rowLevel.length - 1;
      var rows = TC.rowLevel.map(function (_, r) {
        var nodes = DATA.talents.filter(function (t) { return t.row === r; }).map(function (t) {
          var lv = (s.talents || {})[t.id] || 0, open = s.level >= TC.rowLevel[r] && (r === 0 || CW.talentSpent(s, r - 1) >= TC.rowNeed[r]);
          // a closed talent still shows its picture, with a small lock on its corner (design pack 2026-11-14)
          return '<button class="tnode' + (selTalent === t.id ? ' sel' : '') + (open ? '' : ' lock') + (lv >= t.max ? ' max' : '') + '" data-tal="' + t.id + '"><span class="ti">' + mi('talent', t) + '</span>' + (open ? '' : '<i class="tlock">' + CW.ICO.pic('lock', 'ilock') + '</i>') + '<b>' + (lv > t.max ? 'Lv.' + lv : lv + '/' + t.max) + '</b><small>' + t.name + '</small></button>';
        }).join('');
        return '<div class="trow">' + nodes + '</div>' + (r < last ? '<div class="tarrow">▼ ' + (TC.rowNeed[r + 1] ? '위에서 ' + TC.rowNeed[r + 1] + '포인트 · ' : '') + 'Lv.' + TC.rowLevel[r + 1] + '</div>' : '');
      }).join('');
      var t = selTalent && CW.talentById(selTalent), info = '';
      if (t) {
        var lv = (s.talents || {})[t.id] || 0;
        info = '<div class="tinfo"><b>' + t.name + ' ' + (lv > t.max ? 'Lv.' + lv : lv + '/' + t.max) + '</b><div>' + STAT_KO[t.stat] + ' ' + CW.bonusAmount(t.stat, lv * t.per) + (true ? ' → <span style="color:#8ff59a">' + CW.bonusAmount(t.stat, (lv + 1) * t.per) + '</span>' : '') + '</div>' +
          '<div class="note">해금 조건 · ' + (t.row ? '이전 줄 ' + TC.rowNeed[t.row] + '포인트 이상 · ' : '') + '계정 Lv.' + TC.rowLevel[t.row] + '</div>' +
          '<div class="btns"><button class="buy' + (CW.talentCan(s, t.id) ? '' : ' off') + '" data-tup="' + t.id + '">레벨업 (포인트 1)</button></div></div>';
      }
      return '<div class="artban ab-talent" aria-hidden="true"></div><div class="tpoints"><span>남은 포인트 <b>' + (pts - spent) + '</b> / ' + pts + '</span><button class="btn" data-act="treset">초기화</button></div>' + guideRow('talent', '계정 ' + TC.levelsPerPoint + '레벨마다 포인트 1개 · 초기화 무료') + '<div class="ttree">' + rows + '</div>' + (info || '<p class="note">특성을 선택하면 효과를 확인할 수 있어요.</p>');
    }
    function markPanel() {
      var s = G.state, RC = DATA.rankConf, r = s.rank || 0, cap = CW.markCap(s), ready = CW.rankReady(s);
      var stars = ''; for (var i = 0; i < RC.names.length - 1; i++) stars += '<i class="' + (i < r ? 'on' : '') + '">★</i>';
      var head = '<div class="rankbox"><div class="dstars">' + stars + '</div><b>' + RC.names[r] + '</b><span class="note">승급 보너스 · 모든 피해 +' + pct(r * RC.rankFinal) + '</span></div>';
      var list = DATA.marks.map(function (m) {
        var lv = (s.marks || {})[m.id] || 0, cost = CW.markCost(lv), full = false, ov = lv - cap, rate = ({ critRate: '치명타 피해', superRate: '슈퍼 피해' })[m.stat];   // 한계 돌파 (2026-11-15)
        if (!CW.markOpen(s, m.id)) return '<div class="row lockrow"><div class="ricon mk">' + mi('mark', m) + '</div><div class="info"><div class="name">' + m.name + '</div><div class="desc need">' + RC.names[m.openRank] + ' 달성 시 해금 · ' + STAT_KO[m.stat] + '</div></div><span class="lockic">' + CW.ICO.pic('lock', 'ilock') + '</span></div>';
        return '<div class="row"><div class="ricon mk">' + mi('mark', m) + '</div><div class="info"><div class="name">' + m.name + ' <span class="lv">' + (ov > 0 ? 'Lv.' + lv : lv + '/' + cap) + '</span></div><div class="desc">' + STAT_KO[m.stat] + ' ' + CW.bonusAmount(m.stat, (rate && ov > 0 ? cap : lv) * m.per) + (rate && ov > 0 ? '<br>' + rate + ' +' + ov + '%' : '') + '</div></div>' +
          '<button class="buy gemb' + (full || (s.mana || 0) < cost ? ' off' : '') + '" data-mark="' + m.id + '">' + (full ? '최대' : '' + CW.ICO.cur('mana') + ' ' + fmt(cost)) + '</button></div>';
      }).join('');
      var next = r + 1 < RC.names.length ? RC.names[r + 1] : null;
      var cond = next ? '<div class="rankup"><div class="note">다음 계급 · <b style="color:#fff">' + next + '</b><br>기본 징표 6개 ' + cap + ' · 계정 Lv.' + RC.rankLevel[r + 1] + '<br>필요 마력석 ' + CW.ICO.cur('mana') + ' ' + fmt(RC.rankCost[r + 1]) + '</div><button class="buy' + (ready.ok ? '' : ' off') + '" data-act="rankup">승급</button></div>' : '<p class="note">최고 계급 달성</p>';
      return head + '<div class="list">' + list + '</div>' + cond;
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
    function circlePanel() {
      var s = G.state, CC = DATA.circleConf, lv = s.circle || 0, tier = CW.circleTier(s), cost = CW.circleCost(lv), max = lv >= CC.maxLv;
      var toNext = (tier + 1) * CC.tierEvery - lv;
      return circleArt(lv, tier, max ? 1 : (lv - tier * CC.tierEvery) / CC.tierEvery) + '<div class="mtext mcname"><small>마나서클 레벨</small><b>Lv.' + lv + '</b><span>' + (tier + 1) + '서클 마법사</span></div>' +
        '<div class="ceff"><div><span>레벨 효과</span><b>스킬 피해 +' + pct(lv * CC.perLv) + '</b></div><div class="hi"><span>서클 효과</span><b>모든 피해 +' + pct(tier * CC.tierFinal) + '</b></div></div>' +
        '<p class="note" style="text-align:center">' + (max ? '최고 서클 달성 · 추가 레벨로 스킬 피해를 높일 수 있어요.' : (tier + 2) + '서클까지 ' + toNext + '레벨<br>달성 보너스 · 모든 피해 +' + pct(CC.tierFinal)) + '</p>' +
        '<div class="btns" style="justify-content:center"><button class="buy gemb' + ((s.mana || 0) < cost ? ' off' : '') + '" data-circle="1">' + ('레벨업 ' + CW.ICO.cur('mana') + ' ' + fmt(cost)) + '</button></div><p class="note" style="text-align:center">길게 누르면 연속 강화돼요.</p>';
    }
    function dungeonPanel() {
      var s = G.state, now = Date.now();
      if (!CW.dungeonOpen(s)) return '<div class="notice">' + '던전은 ' + DATA.dungeonConf.unlockTier + '차 전직 후 열려요.<br><small>1-31 보스 처치 → 2차 전직</small></div>';
      var run = G.dunState();
      return (run ? '<div class="notice">' + run.name + ' 진행 중</div>' : '') + guideRow('dungeon', '던전별 하루 입장권 ' + DATA.dungeonConf.tickets + '장 · 클리어하면 소탕 가능') + '<div class="dlist">' +
        DATA.dungeons.map(function (d) {
          var left = CW.ticketsLeft(s, d.id, now), best = s.dungeon && s.dungeon.best && s.dungeon.best[d.id];
          var bestTxt = best ? (d.id === 'mana' ? '최고 피해 ' + fmt(best.dmg) : '최고 ' + best.kills + '마리') : '기록 없음';
          var rw = best ? CW.dungeonReward(s, d.id, best) : null;
          var rwTxt = rw ? (rw.gold ? '골드 +' + gh(rw.gold) : rw.gems ? '다이아 +' + fmt(rw.gems) : rw.runeStone ? '룬석 +' + fmt(rw.runeStone) + (rw.runes ? ' · 룬 ' + rw.runes + '개' : '') : '마력석 +' + fmt(rw.mana)) : '';
          if (!CW.kindOpen(s, d.id)) return '<div class="dung dg-' + d.id + ' lockd"><div class="dicon">' + mi('dungeon', d) + '</div><div class="info"><div class="dname">' + d.name + '</div><div class="note">' + d.desc + '</div><div class="note">' + d.unlockTier + '차 전직 후 해금</div></div></div>';
          return '<div class="dung dg-' + d.id + '"><div class="dicon">' + mi('dungeon', d) + '</div><div class="info"><div class="dname">' + d.name + '</div><div class="note">' + d.desc + '</div><div class="note">입장권 <b style="color:#fff">' + left + '/' + DATA.dungeonConf.tickets + '</b> · ' + bestTxt + (rwTxt ? ' (' + rwTxt + ')' : '') + '</div></div>' +
            '<div class="dbtns"><button class="buy' + (left && !run ? '' : ' off') + '" data-dgo="' + d.id + '">입장</button><button class="btn' + (left && best && !run ? '' : ' off') + '" data-dsw="' + d.id + '">소탕</button></div></div>';
        }).join('') + '</div>';
    }
    // mana surge gauge over the skill row (no pop-up words: the user wants none)
    function surgeGauge(v, max) { var f = $('surgeFill'); if (f) f.style.width = Math.min(100, v / max * 100) + '%'; var g = $('surgeGauge'); if (g) g.classList.toggle('full', v >= max - 1); }
    function dunHud(run) {
      var el = $('dunHud'); if (!run) { el.className = ''; return; }
      el.className = 'on';
      el.innerHTML = '<b>' + run.name + '</b><span>' + Math.max(0, run.t).toFixed(1) + '초</span><span>' + (run.kind === 'mana' ? '피해 ' + fmt(run.dmg) + ' · 골렘 Lv.' + run.level : '처치 ' + run.kills) + '</span>';
    }
    var STAT_KO = { atk: '기본 공격력', potion: '분노의 물약', potionGold: '황금 물약', potionXp: '지혜의 물약', megaRate: '메가 크리티컬 확률', megaDmg: '메가 크리티컬 피해', ultimateRate: '얼티밋 크리티컬 확률', ultimateDmg: '얼티밋 크리티컬 피해', alphaRate: '알파 크리티컬 확률', alphaDmg: '알파 크리티컬 피해', atkPct: '공격력', critRate: '치명타 확률', critDmg: '치명타 피해', superRate: '슈퍼 크리티컬 확률', superDmg: '슈퍼 크리티컬 피해', ultraRate: '울트라 크리티컬 확률', ultraDmg: '울트라 크리티컬 피해', hyperRate: '하이퍼 크리티컬 확률', hyperDmg: '하이퍼 크리티컬 피해', bossDmg: '보스 피해', normalDmg: '일반 몬스터 피해', skillDmg: '스킬 피해', goldMul: '골드 획득', xpMul: '경험치 획득', speed: '공격 속도', weakDmg: '약점 피해', surgeDmg: '폭주 피해', surgeRate: '폭주 충전 속도', finalPct: '모든 피해' };
    // "스킬 피해가" / "공격력이": the right particle after a Korean word (a final consonant takes 이)
    function iga(w) { var c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? '이' : '가'); }
    function bonusText(stat, v) { return (STAT_KO[stat] || stat) + ' +' + pct(v); }
    function subTabs() {
      return '<div class="subtabs n6" role="tablist">' + [['gear', '장비'], ['relic', '유물'], ['costume', '코스튬'], ['divine', '삼신기'], ['sigil', '신성력'], ['rune', '룬']].map(function (t) {
        return '<button role="tab" aria-selected="' + (gearSub === t[0]) + '" data-gsub="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    }
    function relicPanel() {
      var s = G.state, own = s.relics || {}, have = DATA.relics.filter(function (r) { return own[r.id]; }).length;
      var pulls = '<div class="pulls relicpulls">' + [5, 10, 100].map(function (n) {
        return '<button class="pull' + (n === 100 ? ' big' : '') + '" data-relic="' + n + '"><b>' + n + '회 소환</b><span><i class="gem"></i>' + fmt(CW.relicCost(n)) + '</span></button>';
      }).join('') + '</div>';
      var list = DATA.relics.slice().sort(function (a, b) { return (b.divine ? 1 : 0) - (a.divine ? 1 : 0); }).map(function (r) {
        var lv = own[r.id] || 0, max = CW.relicMax(r);
        return '<div class="row relic' + (r.divine ? ' divine' : '') + (lv ? '' : ' none') + '"><div class="ricon">' + mi('relic', r) + '</div><div class="info"><div class="name">' + r.name + ' <span class="lv">Lv.' + lv + ' / ' + max + '</span></div><div class="desc">' +
          (lv ? bonusText(r.stat, lv * r.per) : r.desc + ' (레벨당 +' + pct(r.per) + ')') + '</div></div></div>';
      }).join('');
      return '<h3>유물 소환 <small class="note">수집 ' + have + ' / ' + DATA.relics.length + '</small></h3>' + pulls +
        guideRow('relic', '중복 획득 시 레벨 업 · 신유물 확률 ' + pct(DATA.relicSummon.divineRate)) + '<div class="list">' + list + '</div>';
    }
    function costumePanel() {
      var s = G.state, own = s.costume.owned, wear = s.costume.wear;
      var cards = DATA.costumes.map(function (c) {
        var lv = own[c.id] || 0, img = G.costumeThumb(c.id), on = wear === c.id, max = lv >= DATA.costumeConf.maxLv, ns = CW.costumeStars(lv), cst = '';
        for (var ci = 0; ci < DATA.costumeConf.maxLv / DATA.costumeConf.starEvery; ci++) cst += '<i class="' + (ci < ns ? 'on' : '') + '">★</i>';
        var act = !lv ? '<button class="buy gemb' + (s.gems < c.price ? ' off' : '') + '" data-cbuy="' + c.id + '"><i class="gem"></i>' + fmt(c.price) + '</button>'
          : '<div class="cbtns"><button class="btn' + (on ? ' on' : '') + '" data-cwear="' + c.id + '">' + (on ? '입는 중' : '입기') + '</button><button class="buy gemb' + (max || s.gems < CW.costumeUpCost(c, lv) ? ' off' : '') + '" data-cup="' + c.id + '">' + (max ? '최대' : '<small>강화</small><span><i class="gem"></i>' + fmt(CW.costumeUpCost(c, lv)) + '</span>') + '</button></div>';
        return '<div class="ccard' + (on ? ' on' : '') + (lv ? '' : ' none') + '" style="--gc:' + hc(c.grade) + '"><div class="cgrade">' + hn(c.grade) + (lv ? ' Lv.' + lv + '/' + DATA.costumeConf.maxLv : '') + '</div>' + (img ? '<img src="' + img + '" alt="">' : '') +
          '<b>' + c.name + '</b><span class="cdesc">' + c.desc + '</span><div class="cstars">' + cst + '</div><small>' + bonusText(c.stat, CW.costumeValue(c, Math.max(1, lv))) + (lv ? '' : ' (보유 시 적용)') + '</small>' + act + '</div>';
      }).join('');
      var nOwn = DATA.costumes.filter(function (c) { return own[c.id]; }).length, CC = DATA.costumeConf;
      return '<h3>코스튬</h3>' + guideRow('costume', '입지 않아도 보유 효과 적용 · ' + CC.starEvery + '레벨마다 ★') +
        '<div class="codexbar"><span>코스튬 수집 (' + nOwn + '/' + DATA.costumes.length + ')</span><b>모든 피해 +' + pct(Math.max(0, nOwn - 1) * CC.collect) + '</b></div><div class="cgrid">' + cards + '</div>';
    }
    function divinePanel() {
      var s = G.state, open = CW.divineOpen(s), D = s.divine, C = DATA.divineConf;
      var head = '<div class="shards"><span>✦ 신기 조각 <b>' + fmt(D.shards) + '</b></span><small class="note">' + (open ? '획득 · 일반 보스 ' + C.shardBoss + '개 / 지역 보스 ' + C.shardRegion + '개' : C.unlockTier + '차 전직 후 해금') + '</small></div>';
      var cards = DATA.divine.map(function (it) {
        var d = D[it.id] || { lv: 0, star: 0 }, cost = CW.divineUpCost(d.lv, s), sc = CW.starCost(d.star);
        var stars = ''; for (var i = 0; i < C.starMax; i++) stars += '<i class="' + (i < d.star ? 'on' : '') + '">★</i>';
        var val = d.lv ? it.per * d.lv * (1 + C.starBonus * d.star) : 0;
        return '<div class="dcard' + (open ? '' : ' none') + '"><div class="dstars">' + stars + '</div><div class="dicon">' + mi('divine', it) + '</div><div class="dname">' + it.name + ' <span class="lv">Lv.' + d.lv + '</span></div><div class="note">' + it.kind + ' · ' + it.desc + '</div>' +
          '<div class="deff">' + (d.lv ? bonusText(it.stat, val) : STAT_KO[it.stat] + ' (레벨당 +' + pct(it.per) + ', 별마다 +' + pct(C.starBonus) + ')') + '</div>' +
          '<div class="btns"><button class="buy' + (!open || s.gold < cost || d.lv >= C.maxLv ? ' off' : '') + '" data-dlv="' + it.id + '">' + (d.lv ? '레벨업' : '깨우기') + ' <i class="coin"></i>' + gh(cost) + '</button>' +
          '<button class="btn' + (!open || !d.lv || D.shards < sc || d.star >= C.starMax ? ' off' : '') + '" data-dstar="' + it.id + '">별 올리기 ✦' + sc + '</button></div></div>';
      }).join('');
      return '<h3>별의 삼신기</h3>' + head + '<div class="dlist">' + cards + '</div>';
    }
    // ---------- the selected 신성력/룬 next to what is worn (2026-11-15, user: show what I wear at once when I tap one) ----------
    // A change line: a stat's total now and after, with the difference in green (more) or red (less).
    function cmpLine(name, from, to, fmtv) {
      var d = to - from, f = fmtv || function (v) { return '+' + pct(v); };
      return '<p class="cmpline"><span>' + name + '</span><b>' + f(from) + '<i>→</i>' + f(to) + '</b><em class="' + (d > 1e-12 ? 'up' : d < -1e-12 ? 'down' : '') + '">' + (Math.abs(d) < 1e-12 ? '같음' : (d > 0 ? '▲' : '▼') + pct(Math.abs(d)).replace(/^\+/, '')) + '</em></p>';
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
      var t = c.target, tv = CW.sigilValue(t), tn = STAT_KO[t.stat] || t.stat, fullHead = cmpFullHead(sigilWorse(sel, c));
      var row = cmpRow(c.mode === 'same' ? '지금 낀 것 · 같은 효과 중 가장 약한 것' : '지금 낀 것 · 가장 약한 것', CW.ICO.sigil(t.stat, t.grade, hc(t.grade), t.q), hc(t.grade), hn(t.grade) + ' ' + tn, CW.qualityName(t.q) + ' (' + Math.round(t.q * 100) + '%) · ' + tn + ' +' + pct(tv));
      if (!c.full) return '<div class="cmp">' + row + '<p class="cmphead">기존 신성력을 교체하지 않고 빈 슬롯에 추가돼요.</p>' + cmpLine(nm, tot, tot + v) + '</div>';
      if (c.mode === 'same') return '<div class="cmp">' + row + fullHead + cmpLine(nm, tot, tot - tv + v) + '</div>';
      return '<div class="cmp">' + row + fullHead + cmpLine(nm, tot, tot + v) + cmpLine(tn, sum[t.stat] || 0, (sum[t.stat] || 0) - tv) + '</div>';
    }
    // the resonance after a change to the worn runes (worked out on the real bag, then put back)
    function runeResAfter(s, slot, id) { var b = CW.runeBag(s), old = b.eq[slot]; b.eq[slot] = id; var r = CW.runeResonance(s); b.eq[slot] = old; return r; }
    function runeCmp(s, it) {
      var c = CW.runeCompare(s, it.id), b = CW.runeBag(s), RC = DATA.runeConf, k = CW.runeById(it.kind), nm = STAT_KO[k.stat] || k.stat, v = CW.runeValue(it), res = CW.runeResonance(s), sum = {};
      if (!c) return '';
      CW.runeEquipped(s).forEach(function (x) { var kk = CW.runeById(x.kind); sum[kk.stat] = (sum[kk.stat] || 0) + CW.runeValue(x); });
      var tot = sum[k.stat] || 0, resLine = function (r2) { return r2 === res ? '' : cmpLine('룬 공명 (모든 피해)', res * RC.resFinal, r2 * RC.resFinal, function (x) { return Math.round(x / RC.resFinal) + '단계'; }); };
      if (c.mode === 'worn') return wornBox('룬', nm, v, tot);
      if (c.mode === 'free') return '<div class="cmp"><p class="cmphead">빈 슬롯에 장착하면 효과가 추가돼요.</p>' + cmpLine(nm, tot, tot + v) + resLine(runeResAfter(s, b.eq.indexOf(null), it.id)) + '</div>';
      var t = c.target, tk = CW.runeById(t.kind), tv = CW.runeValue(t), tn = STAT_KO[tk.stat] || tk.stat, slot = b.eq.indexOf(t.id), fullHead = cmpFullHead(runeWorse(s, it, c));
      var row = cmpRow(c.mode === 'same' ? '지금 낀 것 · 같은 룬 중 가장 약한 것' : '지금 낀 것 · 가장 약한 것', CW.ICO.rune(t.kind, tk.color, t.grade, hc(t.grade)), hc(t.grade), hn(t.grade) + ' ' + tk.name + ' Lv.' + t.lv, tn + ' +' + pct(tv));
      if (!c.full) return '<div class="cmp">' + row + '<p class="cmphead">기존 룬을 교체하지 않고 빈 슬롯에 추가돼요.</p>' + cmpLine(nm, tot, tot + v) + resLine(runeResAfter(s, b.eq.indexOf(null), it.id)) + '</div>';
      var lines = c.mode === 'same' ? cmpLine(nm, tot, tot - tv + v) : cmpLine(nm, tot, tot + v) + cmpLine(tn, sum[tk.stat] || 0, (sum[tk.stat] || 0) - tv);
      return '<div class="cmp">' + row + fullHead + lines + resLine(runeResAfter(s, slot, it.id)) + '</div>';
    }
    // a swap that makes things worse (2026-11-15, user: show it at once, in red): same effect = a smaller value; another
    // effect = weaker by grade and quality (as 추천 장착 judges); a rune also when the resonance would go down
    function sigilWorse(sel, c) { if (!c || !c.full || !c.target) return false; return c.mode === 'same' ? CW.sigilValue(sel) < CW.sigilValue(c.target) : CW.sigilPower(sel) < CW.sigilPower(c.target); }
    function runeWorse(s, it, c) {
      if (!c || !c.full || !c.target) return false;
      var slot = CW.runeBag(s).eq.indexOf(c.target.id); if (runeResAfter(s, slot, it.id) < CW.runeResonance(s)) return true;
      return c.mode === 'same' ? CW.runeValue(it) < CW.runeValue(c.target) : CW.runePower(it) < CW.runePower(c.target);
    }
    function cmpFullHead(worse) { return worse ? '<p class="cmphead bad">교체 시 효과 감소 ▼</p>' : '<p class="cmphead">슬롯이 가득 찼어요 · 교체 후 효과</p>'; }
    // the top-right ✕ of the bottom box
    function dockX(kind) { return '<button class="dockx" data-dockx="' + kind + '" aria-label="닫기">✕</button>'; }

    // ---------- runes (2026-11-14): seven worn runes in the ring, the bag below; pick one to level, promote, wear, lock, fuse ----------
    function runeCell(s, it) {
      var k = CW.runeById(it.kind), worn = CW.runeIsWorn(s, it.id);
      return '<button class="sgcell rcell' + (selRune === it.id ? ' sel' : '') + (worn ? ' eq' : '') + '" data-rpick="' + it.id + '" style="--gc:' + hc(it.grade) + '"><span class="tg">' + hn(it.grade) + '</span>' + CW.ICO.rune(it.kind, k.color, it.grade, hc(it.grade)) +
        (it.lock ? '<span class="lk">🔒</span>' : '') + '<span class="q">Lv.' + it.lv + '</span></button>';
    }
    function runePanel() {
      var s = G.state, RC = DATA.runeConf, open = CW.runeOpen(s), res = CW.runeResonance(s), bag = CW.runeBag(s), n = RC.slots;
      if (selRune && !CW.runeItem(s, selRune)) selRune = null;
      var head = '<div class="manaline"><span>' + CW.ICO.cur('rune') + ' 룬석 <b>' + fmt(s.runeStone || 0) + '</b></span><small class="note">' + (open ? '장착 ' + CW.runeEquipped(s).length + ' / ' + n + ' · 보유 ' + bag.items.length + ' / ' + RC.cap : RC.unlockTier + '차 전직 후 해금') + '</small></div>';
      var ring = '<div class="runering r7">' + bag.eq.map(function (id, i) {
        var it = id && CW.runeItem(s, id);
        if (!it) return '<div class="rune empty" style="--i:' + i + '"><span>빈 슬롯</span></div>';
        var k = CW.runeById(it.kind);
        return '<button class="rune' + (it.id === selRune ? ' sel' : '') + (fxRune === it.id ? ' up' : '') + (it.lv ? '' : ' zero') + '" data-rpick="' + it.id + '" style="--rc:' + k.color + ';--rg:' + hc(it.grade) + ';--i:' + i + '" aria-label="' + k.name + ' ' + hn(it.grade) + '"><i class="rgn">' + hn(it.grade) + '</i>' + CW.ICO.rune(it.kind, k.color, it.grade, hc(it.grade)) + '<b>Lv.' + it.lv + '</b></button>';
      }).join('') + '<svg class="rlines" viewBox="0 0 200 200" aria-hidden="true">' + bag.eq.map(function (id, i) {
        var it = id && CW.runeItem(s, id), a = i * 2 * Math.PI / n - Math.PI / 2, lv = it ? it.lv : 0, col = it ? CW.runeById(it.kind).color : '#8a7ad0';
        return '<line x1="100" y1="100" x2="' + (100 + Math.cos(a) * 69).toFixed(1) + '" y2="' + (100 + Math.sin(a) * 69).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (lv ? 3 : 1.5) + '" opacity="' + (lv ? 0.85 : 0.25) + '"' + (lv ? ' class="flow"' : '') + '/>';
      }).join('') + '<circle cx="100" cy="100" r="68" fill="none" stroke="#8a7ad0" stroke-width="1.5" stroke-dasharray="2 6" opacity=".6"/></svg><div class="rcore' + (res ? ' lit' : '') + '"><small>룬 공명</small><b>' + res + '단계</b><span>모든 피해 +' + pct(res * RC.resFinal) + '</span></div></div>';
      var it = selRune && CW.runeItem(s, selRune), detail = '';
      if (it) {
        var k = CW.runeById(it.kind), cap = CW.runeCap(it), cost = CW.runeCost(it.lv), top = it.grade >= DATA.hiGrades.length - 1, full = it.lv >= cap, gcost = CW.runeGradeCost(it.grade);
        var worn = CW.runeIsWorn(s, it.id), freeIt = !worn && !it.lock;
        var same = bag.items.filter(function (x) { return x !== it && x.kind === it.kind && x.grade === it.grade && !x.lock && !CW.runeIsWorn(s, x.id); }).length;
        var rc = CW.runeCompare(s, it.id), swapTo = !worn && rc && rc.full && rc.target;
        detail = '<div class="row"><div class="ricon" style="background:radial-gradient(circle,' + k.color + '55,#1a1030);box-shadow:inset 0 0 0 2px ' + k.color + '">' + CW.ICO.rune(it.kind, k.color, it.grade, hc(it.grade)) + '</div><div class="info"><div class="name"><span style="color:' + hc(it.grade) + '">' + hn(it.grade) + '</span> ' + k.name + ' <span class="lv">Lv.' + it.lv + '/' + cap + '</span></div><div class="desc">' + bonusText(k.stat, CW.runeValue(it)) + ' · 등급 보너스 +' + pct(it.grade * RC.gradeStep) + (worn ? '' : ' · 장착 시 적용') + '</div><div class="desc rwhat">레벨과 등급을 높이면 효과가 증가해요.</div></div>' +
          (full && !top ? '<button class="buy gemb' + (!open || (s.runeStone || 0) < gcost ? ' off' : '') + '" data-rgrade="' + it.id + '"><small>' + hn(it.grade + 1) + '(으)로 승급</small><span>' + CW.ICO.cur('rune') + ' ' + fmt(gcost) + '</span></button>'
            : '<button class="buy' + (!open || full || (s.runeStone || 0) < cost ? ' off' : '') + '" data-rune="' + it.id + '">' + (full ? '최대' : CW.ICO.cur('rune') + ' ' + fmt(cost)) + '</button>') + '</div>' +
          runeCmp(s, it) +
          '<div class="sgbtns">' + (swapTo ? (runeWorse(s, it, rc) ? '<button class="btn warn" data-rswap="' + rc.target.id + '|' + it.id + '">교체<small>떨어져요</small></button>' : '<button class="btn pri" data-rswap="' + rc.target.id + '|' + it.id + '">교체</button>') : '<button class="btn' + (worn ? ' on' : '') + '" data-reqp="' + it.id + '">' + (worn ? '해제' : '장착') + '</button>') + '<button class="btn' + (it.lock ? ' on' : '') + '" data-rlock="' + it.id + '">' + (it.lock ? '잠금 풀기' : '잠금') + '</button>' +
          '<button class="btn' + (freeIt ? '' : ' off') + '" data-rdis="' + it.id + '">분해 ' + CW.ICO.cur('rune') + fmt(CW.runeDismantleValue(it)) + '</button><button class="btn' + (same >= 2 && !top && freeIt ? '' : ' off') + '" data-rfuse="' + it.id + '">합성 ' + Math.min(3, same + 1) + '/3</button></div>' +
          '<span class="note">' + (top ? '최고 등급' : '합성 · 같은 종류·등급의 룬 3개 → ' + hn(it.grade + 1)) + '</span>';
      }
      var filt = '<div class="kindtabs">' + ['all'].concat(DATA.runes.map(function (x) { return x.id; })).map(function (kid) { var kk = CW.runeById(kid); return '<button role="tab" aria-selected="' + (rnFilter === kid) + '" data-rkf="' + kid + '"' + (kk ? ' style="color:' + kk.color + '"' : '') + '>' + (kk ? kk.name.replace(' 룬', '').replace('의', '') : '전체') + '</button>'; }).join('') + '</div>';
      var inv = bag.items.filter(function (x) { return rnFilter === 'all' || x.kind === rnFilter; }).sort(function (a, c) { return CW.runePower(c) - CW.runePower(a); }).map(function (x) { return runeCell(s, x); }).join('');
      var acts = '<div class="btns bagacts"><button class="btn pri" data-act="rbest">추천 장착</button><button class="btn" data-act="rdisall">잠금 안 한 것 모두 분해</button></div>' +
        '<div class="pulls sgpulls">' + [5, 10].map(function (m) { return '<button class="pull' + (!open || s.gems < RC.summon[m] ? ' off' : '') + '" data-rsum="' + m + '"><b>룬 ' + m + '회 소환</b><span><i class="gem"></i>' + RC.summon[m] + '</span></button>'; }).join('') + '</div>';
      if (detail) dockHtml = '<div class="dockbox rdock" style="--gc:' + hc(it.grade) + '">' + dockX('rn') + detail + '</div>';
      return head + ring + acts + filt + '<div class="sggrid inv">' + (inv || '<p class="note">아직 보유한 룬이 없어요.<br>보스 처치나 소환으로 획득할 수 있어요.</p>') + '</div>' +
        guideRow('rune', '다음 공명 · 최저 레벨 ' + ((res + 1) * RC.resEvery) + ' → ' + (res + 1) + '단계');
    }
    function showRunes(list) {
      var best = Math.max.apply(null, list.map(function (x) { return x.grade; }));
      modal('<h2 style="color:' + hc(best) + '">' + (best >= 5 ? hn(best) + ' 룬 획득' : '룬 ' + list.length + '개 획득') + '</h2><div class="sggrid got">' + list.slice().sort(function (a, c) { return c.grade - a.grade; }).map(function (x) { return runeCell(G.state, x); }).join('') + '</div>',
        [{ label: '확인' }, { label: '다시 소환', pri: true, fn: function () { var r = G.runeSummon(list.length); if (!r) toast('소환할 수 없어요. 다이아와 가방 여유 공간을 확인해 주세요.'); else { showRunes(r); renderPanel(true); hud(); } } }]);
    }
    function sgCell(it, eqd) {
      return '<button class="sgcell' + (selSigil === it.id ? ' sel' : '') + (eqd ? ' eq' : '') + '" data-sg="' + it.id + '" style="--gc:' + hc(it.grade) + '"><span class="tg">' + hn(it.grade) + '</span>' + CW.ICO.sigil(it.stat, it.grade, hc(it.grade), it.q) +
        (it.lock ? '<span class="lk">🔒</span>' : '') + '<span class="q">' + Math.round(it.q * 100) + '%</span></button>';
    }
    function sigilPanel() {
      var s = G.state, C = DATA.sigilConf;
      if (!CW.sigilOpen(s)) return '<div class="notice">' + '신성력은 ' + C.unlockTier + '차 전직 후 열려요.<br><small>보스 처치나 다이아 소환으로 획득해요.</small></div>';
      var b = s.sigil, eq = CW.equipped(s), slots = CW.sigilSlots(s), lvCost = CW.sigilLvCost(b.lv);
      if (selSigil && !CW.sigilById(s, selSigil)) selSigil = null;
      var head = '<div class="sghead"><span>장착 슬롯 <b>' + eq.length + '/' + slots + '</b> · 보유 ' + b.items.length + '/' + C.cap + '</span><div class="sgsets">' + [0, 1, 2].map(function (i) { return '<button class="btn' + (b.cur === i ? ' on' : '') + '" data-sgset="' + i + '" aria-pressed="' + (b.cur === i) + '">' + (i + 1) + '</button>'; }).join('') + '</div></div>';
      var cells = ''; for (var i = 0; i < C.slotsMax; i++) {
        if (i < slots) cells += eq[i] ? sgCell(CW.sigilById(s, eq[i]), true) : '<div class="sgcell empty"></div>';
        else cells += '<div class="sgcell lockd"><span>🔒</span><small>Lv.' + ((i - C.slotsBase + 1) * C.slotsPer) + '</small></div>';
      }
      var sum = {}; eq.forEach(function (id) { var it = CW.sigilById(s, id); sum[it.stat] = (sum[it.stat] || 0) + CW.sigilValue(it); });
      var effs = Object.keys(sum).map(function (k) { return '<p><span>' + (STAT_KO[k] || k) + '</span><b>+' + pct(sum[k]) + '</b></p>'; }).join('') || '<p class="note">장착한 신성력이 없어요</p>';
      var lvbar = '<div class="codexbar"><span>신성력 레벨 효과 (Lv.' + b.lv + ')</span><b>신성력 데미지 +' + pct(b.lv * C.lvFinal) + '</b></div>' +
        '<div class="sglv"><span>' + CW.ICO.cur('sigil') + ' 신성석 <b>' + fmt(b.stone) + '</b><small class="note">신성력 분해로 획득</small></span><button class="buy gemb' + (b.stone < lvCost || b.lv >= C.lvMax ? ' off' : '') + '" data-sglv="1">' + (b.lv >= C.lvMax ? '최대' : '<small>레벨업</small><span>' + CW.ICO.cur('sigil') + ' ' + fmt(lvCost) + '</span>') + '</button></div>';
      var sel = selSigil ? CW.sigilById(s, selSigil) : null, selBox = '';
      if (sel) {
        var on = eq.indexOf(sel.id) >= 0, same = b.items.filter(function (x) { return x !== sel && x.grade === sel.grade && !x.lock && !CW.isEquipped(s, x.id); }).length;
        var sc = CW.sigilCompare(s, sel.id), swapTo = !on && sc && sc.full && sc.target;
        selBox = '<div class="sgsel dockbox" style="--gc:' + hc(sel.grade) + '">' + dockX('sg') + '<div class="sgselhead"><span class="sgbig">' + CW.ICO.sigil(sel.stat, sel.grade, hc(sel.grade), sel.q) + '</span><div><b style="color:' + hc(sel.grade) + '">' + hn(sel.grade) + ' ' + (STAT_KO[sel.stat] || sel.stat) + '</b><span class="note">' + CW.qualityName(sel.q) + ' (' + Math.round(sel.q * 100) + '%) · ' + bonusText(sel.stat, CW.sigilValue(sel)) + '</span></div></div>' +
          sigilCmp(s, sel, sum) +
          '<div class="sgbtns">' + (swapTo ? (sigilWorse(sel, sc) ? '<button class="btn warn" data-sgswap="' + sc.target.id + '|' + sel.id + '">교체<small>떨어져요</small></button>' : '<button class="btn pri" data-sgswap="' + sc.target.id + '|' + sel.id + '">교체</button>') : '<button class="btn' + (on ? ' on' : '') + '" data-sgeq="' + sel.id + '">' + (on ? '해제' : '장착') + '</button>') + '<button class="btn' + (sel.lock ? ' on' : '') + '" data-sglock="' + sel.id + '">' + (sel.lock ? '잠금 풀기' : '잠금') + '</button>' +
          '<button class="btn' + (sel.lock || CW.isEquipped(s, sel.id) ? ' off' : '') + '" data-sgdis="' + sel.id + '">분해</button><button class="btn' + (same >= 2 && sel.grade < DATA.hiGrades.length - 1 && !sel.lock && !CW.isEquipped(s, sel.id) ? '' : ' off') + '" data-sgfuse="' + sel.id + '">합성 ' + Math.min(3, same + 1) + '/3</button></div>' + (sel.grade < DATA.hiGrades.length - 1 ? '<span class="note">같은 등급 3개 → ' + hn(sel.grade + 1) + '</span>' : '<span class="note">최고 등급</span>') + '</div>';
      }
      var filt = '<div class="kindtabs">' + [-1].concat(DATA.hiGrades.map(function (x, i) { return i; })).map(function (g) { return '<button role="tab" aria-selected="' + (sgFilter === g) + '" data-sgf="' + g + '"' + (g >= 0 ? ' style="color:' + hc(g) + '"' : '') + '>' + (g < 0 ? '전체' : hn(g)) + '</button>'; }).join('') + '</div>';
      var inv = b.items.filter(function (x) { return sgFilter < 0 || x.grade === sgFilter; }).sort(function (a, c) { return CW.sigilPower(c) - CW.sigilPower(a); }).map(function (x) { return sgCell(x, CW.isEquipped(s, x.id)); }).join('');
      var acts = '<div class="btns bagacts"><button class="btn pri" data-act="sgbest">추천 장착</button><button class="btn" data-act="sgdisall">잠금 안 한 것 모두 분해</button></div>' +
        '<div class="pulls sgpulls">' + [5, 10].map(function (n) { return '<button class="pull' + (s.gems < C.summon[n] ? ' off' : '') + '" data-sgsum="' + n + '"><b>신성력 ' + n + '회 소환</b><span><i class="gem"></i>' + C.summon[n] + '</span></button>'; }).join('') + '</div>';
      dockHtml = selBox;
      return head + '<div class="sggrid">' + cells + '</div>' + lvbar + '<div class="potbox sgeff"><small>신성력 장착 효과</small>' + effs + '</div>' + acts + filt + '<div class="sggrid inv">' + (inv || '<p class="note">아직 보유한 신성력이 없어요.<br>보스 처치나 소환으로 획득할 수 있어요.</p>') + '</div>' +
        guideRow('sigil', '합성 · 분해 · 레벨업 · ' + C.slotsPer + '레벨마다 슬롯 1개');
    }
    function showSigils(list, fromPack) {
      var best = Math.max.apply(null, list.map(function (x) { return x.grade; }));
      modal('<h2 style="color:' + hc(best) + '">' + (best >= 5 ? hn(best) + ' 신성력 획득' : '신성력 ' + list.length + '개 획득') + '</h2><div class="sggrid got">' + list.slice().sort(function (a, c) { return c.grade - a.grade; }).map(function (it) { return sgCell(it, false); }).join('') + '</div>',
        fromPack ? [{ label: '확인', pri: true }] : [{ label: '확인' }, { label: '다시 소환', pri: true, fn: function () { var r = G.sigilSummon(list.length); if (!r) toast('소환할 수 없어요. 다이아와 가방 여유 공간을 확인해 주세요.'); else { showSigils(r); hud(); } } }]);
    }
    function showRelics(list) {
      var shown = list.slice().sort(function (a, b) { return (CW.relicById(b.id).divine ? 1 : 0) - (CW.relicById(a.id).divine ? 1 : 0); });
      var gems = list.reduce(function (a, o) { return a + o.refund; }, 0), hasDivine = list.some(function (o) { return CW.relicById(o.id).divine; });
      modal('<h2' + (hasDivine ? ' style="color:var(--gold)"' : '') + '>' + (hasDivine ? '신유물 획득!' : '유물 ' + list.length + '개 획득') + '</h2><div class="rgot">' + shown.slice(0, 60).map(function (o) {
        var r = CW.relicById(o.id); return '<div class="' + (r.divine ? 'divine' : '') + '"><span>' + mi('relic', r) + '</span><small>' + r.name + '</small><b>' + (o.refund ? '다이아 +' + o.refund : 'Lv.' + o.lv) + '</b></div>';
      }).join('') + '</div>' + (gems ? '<p class="note">최대 레벨 유물을 다이아 ' + gems + '개로 전환했어요.</p>' : ''), [{ label: '확인' }, { label: '다시 소환', pri: true, fn: function () { var r = G.summonRelics(list.length); if (!r) toast('다이아가 부족해요'); else { showRelics(r); renderPanel(true); hud(); } } }]);
    }
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
    function guideRow(key, summary) { return '<button class="guide-summary" data-guide="' + key + '"><span>' + summary + '</span><b>자세히</b></button>'; }
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
    var lastPlace = '', lastSub = null;
    function hud() {
      var s = G.state, info = CW.stageInfo(s.stage), R = DATA.regions[info.region];
      var mark = CW.ICO.region ? CW.ICO.region(info.region) : '';   // the region's own little mark (design-cream.js)
      var pn = (s.diff ? '<u>' + CW.diffOf(s).name + '</u>' : '') + '<span class="rmark">' + mark + '</span><b data-t="' + R.name + '">' + R.name + '</b><i>' + CW.stageLabel(s.stage) + '</i>';
      if (pn !== lastPlace) {
        lastPlace = pn; $('placeName').innerHTML = pn;
        // the clock area above the home-screen app takes the colour of this region's field, and the field fades from it
        // (tools/build-site.cjs): the phone paints that area in the page's theme colour
        if (CW.ICO.regionTop) {
          var capc = CW.ICO.regionTop(info.region), tc = document.querySelector('meta[name="theme-color"]');
          document.documentElement.style.setProperty('--capc', capc);
          if (tc && !document.documentElement.classList.contains('profon')) tc.setAttribute('content', capc);
        }
      }
      var gTxt = gh(s.gold); if (gTxt !== lastGoldTxt) { lastGoldTxt = gTxt; $('goldTxt').innerHTML = gTxt; } $('gemTxt').textContent = fmt(s.gems);
      $('lvTxt').textContent = 'Lv.' + s.level; $('xpBar').style.width = (s.level >= DATA.balance.levelMax ? 100 : Math.min(100, s.xp / CW.xpNeed(s.level) * 100)) + '%';
      var boss = G.boss(), sub = '', kp;
      $('bossbox').classList.toggle('on', !!boss);
      $('killBar').style.display = boss ? 'none' : '';
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
        sub = s.farming ? '' : '<i class="mk">' + mark + '</i><b>' + kp.n + '</b><em>/' + kp.max + '</em>';
        $('killBar').firstChild.style.width = (s.farming ? 100 : kp.n / kp.max * 100) + '%';
        $('killBar').classList.toggle('loop', !!s.farming);
      }
      if (sub !== lastSub) { lastSub = sub; $('placeSub').innerHTML = sub; $('placeSub').style.display = sub ? '' : 'none'; }
      $('retry').classList.toggle('on', s.farming && !boss && G.canRetry() && !G.dunState());
      dunHud(G.dunState());
      var now = Date.now(), bt = DATA.potions.map(function (p) { var l = CW.buffLeft(s, p.id, now); return l ? '<span>' + mi('potion', p) + mmss(l) + '</span>' : ''; }).join('');
      if (bt !== lastBuffs) { lastBuffs = bt; $('buffs').innerHTML = bt; }
      var tier = DATA.tiers[s.tier - 1];
      var lastT = CW.FRIEND ? CW.FRIEND_MAX_TIER : DATA.tiers.length; // 체험판 ends at the 9th job
      var next = s.tier < lastT ? CW.tierNeed(s.tier + 1) + ' ' + (s.tier + 1) + '차' : (s.best >= 309 ? '마왕 토벌 완료!' : '최종 목표 10-31 늑대 왕');
      var wornT = CW.titleWorn ? CW.titleWorn(s) : 'tNovice';
      var tTxt = wornT !== 'tNovice' ? CW.titleById(wornT).name : s.tier + '차 ' + tier.name; if ($('tierTag').textContent !== tTxt) $('tierTag').textContent = tTxt; $('tierTag').classList.toggle('ttl', wornT !== 'tNovice'); var nk = G.nickName(); if ($('nick').textContent !== nk) $('nick').textContent = nk; if ($('questTxt').textContent !== next) $('questTxt').textContent = next;
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
    function upPanel() {
      var s = G.state, st = CW.stats(s);
      var eff = {
        atk: '공격력 ' + fmt(st.atk) + ' · 강화마다 +5%',
        speed: '속도 ×' + st.speedMul.toFixed(2) + ' (최대 ×2)',
        crit: '확률 ' + pct(st.critRate) + ' (최대 70%)',
        critDmg: '치명타 피해 ×' + st.critDmg.toFixed(2),
        gold: '골드 +' + pct(st.goldMul - 1),
        mastery: '모든 스킬 피해 ×' + st.mastery.toFixed(2),
        superCrit: '치명타 중 ' + pct(st.superRate) + ' 슈퍼 (피해 ×' + st.superDmg + ')',
        ultraCrit: '슈퍼 중 ' + pct(st.ultraRate) + ' 울트라 (피해 ×' + st.ultraDmg + ')',
        hyperCrit: '울트라 중 ' + pct(st.hyperRate) + ' 하이퍼 (피해 ×' + st.hyperDmg + ')',
        megaCrit: '하이퍼 중 ' + pct(st.megaRate) + ' 메가 (최대 30%)', megaDmg: '메가 크리티컬 피해 ×' + st.megaDmg.toFixed(2),
        ultimateCrit: '메가 중 ' + pct(st.ultimateRate) + ' 얼티밋 (최대 25%)', ultimateDmg: '얼티밋 크리티컬 피해 ×' + st.ultimateDmg.toFixed(2),
        alphaCrit: '얼티밋 중 ' + pct(st.alphaRate) + ' 알파 (최대 20%)', alphaDmg: '알파 크리티컬 피해 ×' + st.alphaDmg.toFixed(2),
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
      return '<h3>성장</h3>' + mul + '' + guideRow('growth', '길게 누르면 연속 강화 · ×10·×100은 골드만큼 한 번에') + '<div class="list">' + Object.keys(DATA.upgrades).map(function (k) {
        var u = DATA.upgrades[k], lv = s.up[k] || 0, oi = CW.overInfo(s, k), one = CW.upgradeCost(k, lv, s), cost = one, nBuy = 1;
        // ×10·×100 show what the gold buys now (up to that many), so the price never runs past what one can hold
        if (upMul > 1) { var sum = 0, n = 0; while (n < upMul && sum + CW.upgradeCost(k, lv + n, s) <= s.gold) { sum += CW.upgradeCost(k, lv + n, s); n++; } if (n > 0) { cost = sum; nBuy = n; } }
        var max = u.max !== null && lv >= u.max && !oi;
        // 한계 돌파 (2026-11-15): past the row's max, each level adds 1% to the damage it is about
        var OVK = { finalMul: '모든 피해', critDmg: '치명타 피해', superDmg: '슈퍼 피해', ultraDmg: '울트라 피해', hyperDmg: '하이퍼 피해', megaDmg: '메가 피해', ultimateDmg: '얼티밋 피해', alphaDmg: '알파 피해', bossDmg: '보스 피해', skillDmg: '스킬 피해', weakMul: '약점 피해', surgeMul: '폭주 피해' };
        var past = oi && u.max !== null && lv > u.max, effTxt = past ? eff[k].replace(/ \((최대|1레벨당) [^)]*\)/g, '') : eff[k];
        var overTxt = past ? '<br>' + OVK[oi.stat] + ' +' + Math.round(oi.pct * 100) + '%' : '';
        var lvTxt = 'Lv.' + lv;
        if (!CW.upgradeOpen(s, k)) {
          var nd = CW.upgradeNeed(k), why = u.tier && (s.tier || 1) < u.tier ? u.tier + '차 전직 후 해금' : DATA.upgrades[nd.key].name + ' Lv.' + nd.lv + ' 달성 시 해금';
          return '<div class="row lockrow"><div class="ricon">' + CW.ICO.stat(k) + '</div><div class="info"><div class="name">' + u.name + '</div><div class="desc need">' + why + '</div></div><span class="lockic">' + CW.ICO.pic('lock', 'ilock') + '</span></div>';
        }
        // plain words (js/grow-text.js): what the row does, then 지금 / 다음 / 최대 / 돌파 lines whose labels line up
        var gl = CW.growLines(s, k, upMul > 1 ? nBuy : 1);
        var glHtml = '<div class="gabout">' + gl.about + '</div><div class="glines">' + gl.lines.map(function (l) { return '<b class="gl-' + ({ 지금: 'now', 다음: 'next', 최대: 'max', 돌파: 'over', 피해: 'dmg' }[l[0]] || 'x') + '">' + l[0] + '</b><span>' + l[1] + '</span>'; }).join('') + '</div>';
        return '<div class="row grow"><div class="ricon">' + CW.ICO.stat(k) + '</div><div class="info"><div class="name"><span class="nm">' + u.name + '</span><span class="lv">' + lvTxt + '</span></div>' + glHtml + '</div>' +
          '<button class="buy ' + (max || s.gold < one ? 'off' : '') + '" data-up="' + k + '">' + (max ? '최대' : '<span class="bp"><i class="coin"></i>' + gh(cost) + '</span>') + '</button></div>';
      }).join('') + '</div>';
    }
    // element match-ups on each skill (2026-11-15, the user: 불 지역이면 얼음 스킬이 추가 피해 — on the skill's element tag,
    // not in a box): every region is weak to two elements; a skill shows its element, the regions it is strong in, and when
    // the region now is one of them, the hit there (×weakMul).
    function elChip(el) { var E = DATA.elements[el] || { name: el, color: '#888' }; return '<span class="elchip" style="--ec:' + E.color + '">' + E.name + '</span>'; }
    function weakX(s) { return (Math.round(CW.stats(s).weakMul * 100) / 100).toFixed(2); }
    // the regions a skill's element is strong in (the regions weak to it); the one the player is in now is marked
    function strongIn(el, s) {
      if (el === 'all') return '<span class="elgood">모든 지역</span>';
      var now = CW.regionOf(s), names = [];
      DATA.regions.forEach(function (R, i) { if ((R.weak || []).indexOf(el) >= 0) names.push('<span class="elgood' + (i === now ? ' now' : '') + '">' + R.name + '</span>'); });
      return names.join('');
    }
    function skillPanel() {
      var s = G.state;
      var top = guideRow('skill', '1번부터 4번 슬롯까지 순서대로 사용 · 최소 1개 장착') + '<div class="slotgrid">' +
        s.slots.map(function (id, i) {
          var sk = id && CW.skillById(id), on = i === selSlot;
          return '<div class="slotcard' + (on ? ' on' : '') + '"><button class="slotpick" data-sel="' + i + '" style="' + (sk ? '--c:#' + new THREE.Color(sk.color).getHexString() : '') + '"><small>' + (i + 1) + '번</small>' + (sk ? '<span class="spi" aria-label="' + sk.name + '">' + CW.ICO.skill(sk.id) + '</span>' : '<span class="spi none">+</span>') + (sk ? '<em>+' + CW.skillLevel(s, sk.id) + '</em>' : '') + '</button>' +
            (sk ? '<button class="slotout" data-out="' + i + '" aria-label="' + (i + 1) + '번 슬롯 비우기">빼기</button>' : '') + '</div>';
        }).join('') + '</div><div class="presets"><span class="note">프리셋</span>' + [0, 1, 2].map(function (i) { return '<button class="btn' + ((s.preset || 0) === i ? ' on' : '') + '" data-preset="' + i + '" aria-pressed="' + ((s.preset || 0) === i) + '">' + (i + 1) + '</button>'; }).join('') +
          '</div><div class="btns" style="margin:8px 0 4px"><button class="btn pri" data-act="autoskill">센 스킬로 자동 배치</button><button class="btn" data-act="skillall">일괄 강화</button></div>' +
          // 스킬 안내 한 장 (2026-11-15, 사용자: 밋밋한 세 줄 → 안내 카드처럼 한 번에): 보유 효과 · 배치 · 해금·강화
          '<div class="skinfo">' +
          '<div><em>보유 효과</em><p>모든 스킬 피해 <strong>+' + pct(CW.skillOwnedStats(s).skillDmg) + '</strong><small>강화 1단계마다 +' + pct(DATA.balance.skillOwnedPer) + '</small></p></div>' +
          '<div' + (selSlot >= 0 ? ' class="on"' : '') + '><em>배치</em><p>' + (selSlot >= 0 ? '<strong>' + (selSlot + 1) + '번 슬롯</strong> 선택 · 넣을 스킬을 고르세요.' : '슬롯을 고르지 않으면 빈 슬롯에 들어가요.<small>빈 슬롯이 없으면 4번 슬롯을 교체해요.</small>') + '</p></div>' +
          '<div><em>해금 · 강화</em><p>전직 차수마다 스킬 <strong>4개</strong><small>강화 1번마다 그 스킬 피해 +' + Math.round(DATA.balance.skillLvBonus * 100) + '% · 최대 +' + DATA.balance.skillMaxLv + '</small></p></div>' +
          '</div>';
      var row = function (sk) {
        var locked = sk.tier > s.tier, at = s.slots.indexOf(sk.id), lv = CW.skillLevel(s, sk.id), max = lv >= DATA.balance.skillMaxLv, cost = CW.skillUpCost(sk, lv, s);
        var act = locked ? '<span class="note">' + sk.tier + '차 전직</span>'
          : (at >= 0 ? '<button class="btn" data-unslot="' + at + '">' + (at + 1) + '번 빼기</button>' : '<button class="btn pri" data-eq="' + sk.id + '">' + (selSlot >= 0 ? (selSlot + 1) + '번에 넣기' : '넣기') + '</button>');
        var up = locked ? '' : '<button class="buy ' + (max || s.gold < cost ? 'off' : '') + '" data-sup="' + sk.id + '">' + (max ? '최대' : '강화 <i class="coin"></i>' + gh(cost)) + '</button>';
        return '<div class="row skrow" style="' + (locked ? 'opacity:.55' : '') + '"><div class="sk" style="--c:#' + new THREE.Color(sk.color).getHexString() + ';width:52px;height:52px">' + CW.ICO.skill(sk.id) + '</div><div class="info"><div class="name">' + sk.name + '<span class="lv">' + (locked ? sk.tier + '차' : '+' + lv) + '</span></div><div class="desc skwho"><b>' + CW.skillTargetText(sk.targets) + '</b></div><div class="desc skel">' + elChip(sk.el) + strongIn(sk.el, s) + (CW.isWeak(sk, CW.regionOf(s)) ? '<em class="weakon">약점 ×' + weakX(s) + '</em>' : '') + '</div>' +
          (sk.how ? '<div class="desc how">' + sk.how + '</div>' : '') +
          '<div class="skbtns"><button class="btn" data-prev="' + sk.id + '">보기</button>' + act + up + '</div></div></div>';
      };
      // one block per job tier: its name, then the skills that tier brings
      var list = DATA.tiers.map(function (t, i) {
        var n = i + 1, open = n <= s.tier;
        if (CW.FRIEND && n > CW.FRIEND_MAX_TIER) return ''; // 체험판: the 10th job's skills are not shown
        return '<div class="sktier' + (open ? '' : ' lock') + '"><b>' + n + '차</b><span>' + t.name + '</span>' + (open ? '' : '<small>' + (n - 1) + '-31 보스 처치 시 해금</small>') + '</div>' + DATA.skills.filter(function (sk) { return sk.tier === n; }).map(row).join('');
      }).join('');
      return top + '<h3>스킬 목록 · 강화</h3><div class="list">' + list + '</div>';
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
      // 뽑기 레벨 칸 (2026-11-15, 사용자 그림): 다음 레벨 · 전설 확정 · 현재 확률을 한 줄씩 정리
      var head = '<div class="gacha-head ghd"><div class="lvl">' + lv + '<small>뽑기 레벨</small></div><div class="ghrows">' +
        '<p><em>다음 레벨까지</em><b>' + (nextNeed ? (nextNeed - s.pulls) + '회' : '최고 레벨') + '</b></p><div class="ghbar"><i style="width:' + bar + '%"></i></div>' +
        '<p><em>전설 확정까지</em><b>' + (DATA.gacha.pity - s.pity) + '회</b></p>' +
        '<p><em>현재 확률</em><b>전설 ' + rowNow[4] + '% · 신화 ' + rowNow[5] + '%' + (newOdds > 0 ? ' · 태초+ ' + Math.round(newOdds * 100) / 100 + '%' : '') + '</b></p></div></div>';
      var pulls = '<div class="pulls">' + [1, 10, 30, 100].map(function (n) {
        return '<button class="pull ' + (n === 100 ? 'big' : '') + '" data-pull="' + n + '"><b>' + n + '회 뽑기</b><span><i class="gem"></i>' + fmt(CW.gachaCost(n)) + '</span><small class="note">' + (n >= 100 ? '영웅 이상 1개 보장' : n >= 10 ? '희귀 이상 1개 보장' : '장비 1개') + '</small></button>';
      }).join('') + '</div>';
      // 등장 확률 표는 뺐다 (2026-11-15, 사용자: 나중에 다시 만들 것). 현재 확률은 위 head 에 그대로 보인다.
      return '<div class="artban ab-gacha" aria-hidden="true"></div><h3>장비 뽑기</h3>' + head + pulls + (CW.FRIEND ? '' : '<p class="note" style="margin-top:10px">다이아가 필요하다면 더보기 → 패키지를 확인하세요.<br>연습용 기능이며 실제 결제는 없어요.</p>');
    }
    // 더보기: three parts only (2026-11-14): 전직 (when each job opens), 패키지 (everything for sale, practice only),
    // 설정 (how the game looks and plays; the rows for finding problems are folded away). Difficulty and going back to
    // an old region are on the map (stagePanel).
    function morePanel() {
      var s = G.state;
      var nextN = s.tier + 1;
      var tierRow = function (n, name, sk, nSkills, soon) {
        var now = s.tier === n, done = s.tier >= n, next = n === nextN;
        return '<div class="row tierrow' + (next ? ' next' : '') + '" style="' + (done || next ? '' : 'opacity:.6') + '"><div class="info"><div class="name">' + n + '차 ' + name +
          (now ? '<span class="lv">현재 전직</span>' : soon ? '<span class="lv soon">준비 중</span>' : next ? '<span class="lv">다음 전직</span>' : '') + '</div><div class="desc">' + CW.tierNeed(n) +
          (nSkills ? ' · 스킬 ' + nSkills + '개' + (sk ? ' (' + sk.name + ' 등)' : '') : '') + '</div></div></div>';
      };
      var tiers = '<h3>전직</h3><div class="list">' + DATA.tiers.map(function (t, i) {
        var n = i + 1; if (CW.FRIEND && n > CW.FRIEND_MAX_TIER) return ''; // 체험판: the jobs past the 9th are not shown at all
        return tierRow(n, t.name, t.skill && CW.skillById(t.skill), DATA.skills.filter(function (x) { return x.tier === n; }).length, false);
      }).join('') + (CW.FRIEND ? [] : DATA.tierSoon || []).map(function (t) { return tierRow(t.n, t.name, null, 0, true); }).join('') + '</div>';
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
        if (g.potionMin) lines.push('물약 3종 ' + (g.potionMin >= 60 ? g.potionMin / 60 + '시간' : g.potionMin + '분'));
        if (g.pulls) lines.push('장비 뽑기 ' + g.pulls + '번 (다이아 안 씀)');
        if (g.runeStone) lines.push(CW.ICO.cur('rune') + ' 룬석 ' + fmt(g.runeStone));
        if (g.mana) lines.push(CW.ICO.cur('mana') + ' 마력석 ' + fmt(g.mana));
        (g.sigils || []).forEach(function (x) { lines.push('<b style="color:' + hc(x.grade) + '">' + hn(x.grade) + '</b> 신성력 ' + x.n + '개'); });
        if (g.sigilStone) lines.push(CW.ICO.cur('sigil') + ' 신성석 ' + fmt(g.sigilStone));
        return lines.join(' · ');
      };
      var packRow = function (p) {
        var why = CW.packOpen(s, p.id), times = (s.packs || {})[p.id] || 0, btn;
        if (CW.FRIEND) btn = '<button class="buy" disabled style="opacity:.5;filter:grayscale(1)">체험판</button>';
        else if (why === 'ok') btn = '<button class="buy gemb" data-pack="' + p.id + '">' + won(p.won) + '</button>';
        else if (why === 'tier') btn = '<button class="buy" disabled>' + p.need.tier + '차 전직 후 이용</button>';
        else if (why === 'limit') btn = '<button class="buy" disabled>수령 완료</button>';
        else btn = '<button class="buy" disabled>받는 중</button>';
        var dd = s.dailyGems || {}, extra = '';
        if (p.give.daily && dd.left > 0) {
          var today = G.dayKey(), took = dd.last === today;
          extra = '<div class="desc">남은 기간 ' + dd.left + '일 · ' + (took ? '오늘 수령 완료' : '<button class="btn pri" data-act="daily">오늘 다이아 받기</button>') + '</div>';
        }
        return '<div class="pack"><div class="picon">' + mi('pack', p) + '</div><div class="info"><div class="name">' + p.name + (times && !p.limit && !p.give.daily ? ' <span class="lv">' + times + '회 수령</span>' : '') + '</div><div class="desc">' + packLines(p.give) + '</div>' + extra + '</div>' + btn + '</div>';
      };
      var SECTIONS = [['daily', '매일 다이아'], ['grow', '성장'], ['gear', '장비 뽑기'], ['tier', '전직 축하 (한 번만)'], ['rune', '룬·신성력']];
      var packs = '<h3>패키지</h3><div class="notice">' + (CW.FRIEND ? '체험판: 다이아·패키지 수령을 지원하지 않아요.' : '<b>연습용 패키지</b><br>실제 결제 없이 구성품을 즉시 받아요.') + '</div>' + gems + SECTIONS.map(function (sec) {
        return '<div class="subh">' + sec[1] + '</div><div class="packs">' + DATA.packs.filter(function (p) { return p.cat === sec[0]; }).map(packRow).join('') + '</div>';
      }).join('');
      var st = s.settings;
      var settings = '<h3>설정</h3><div class="list">' +
        '<div class="row"><div class="info"><div class="name">닉네임</div><div class="desc">' + esc(G.nickName()) + '</div></div><button class="btn" data-act="nick">변경</button></div>' +
        '<div class="row"><div class="info"><div class="name">화질</div><div class="desc">화면이 끊기면 화질을 낮춰 보세요.</div></div><button class="btn" data-set="quality">' + ({ auto: '자동', high: '높음', mid: '보통', low: '낮음' })[st.quality] + '</button></div>' +
        // 절전 (2026-11-15): the picture stays the same, only fewer pictures a second (js/framepace.js); 30 is the even one
        '<div class="row"><div class="info"><div class="name">절전 모드</div><div class="desc">화질을 유지하며 화면 재생 빈도를 낮춰요.' + (G.screenHz && G.screenHz() ? '<br>현재 화면 ' + G.screenHz() + 'Hz · 설정 ' + (st.fpsCap || 60) + 'fps' : '') + '</div></div><button class="btn" data-set="fpsCap">' + ({ 60: '끄기', 50: '50장', 40: '40장', 30: '30장' })[st.fpsCap || 60] + '</button></div>' +
        '<div class="row"><div class="info"><div class="name">화면 표현</div><div class="desc">기본 3D 또는 픽셀 스타일</div></div><button class="btn" data-set="pixel">' + (st.pixel ? '픽셀 스타일' : '기본 3D') + '</button></div>' +
        '<div class="row"><div class="info"><div class="name">효과음</div></div><button class="btn" data-set="sound">' + (st.sound ? '켜짐' : '꺼짐') + '</button></div>' +
        dmgRow('dmgSize', '대미지 글씨 크기', '작게 하면 몬스터가 잘 보여요', st.dmgSize === undefined ? 60 : st.dmgSize, 30, 120) +
        dmgRow('dmgAlpha', '대미지 글씨 투명도', '낮출수록 글씨가 비쳐 보여요', st.dmgAlpha === undefined ? 85 : st.dmgAlpha, 10, 100) +
        '<div class="row"><div class="info"><div class="name">보스 자동 도전</div><div class="desc">끄면 도전 버튼을 눌러 보스전을 시작해요.</div></div><button class="btn" data-set="autoBoss">' + (st.autoBoss === false ? '꺼짐' : '켜짐') + '</button></div>' +
        // only in an iPhone home-screen app whose page lies under the clock (an icon added the old way), where the page
        // may be stretched to the screen (tools/build-site.cjs)
        (!CW.FRIEND && root.__cwFit && document.documentElement.classList.contains('under') ? '<div class="row"><div class="info"><div class="name">하단 메뉴 위치</div><div class="desc">메뉴가 잘리면 ‘안쪽’을 선택해 주세요.</div></div><button class="btn" data-set="bottomFit">' + (bottomInside() ? '안쪽' : '맨 아래') + '</button></div>' : '') +
        (CW.FRIEND ? '' : '<div class="row"><div class="info"><div class="name">다른 기기로 진행 옮기기</div><div class="desc">저장 코드를 복사한 뒤, 다른 기기의 ‘진행 불러오기’에 붙여 넣으세요.</div></div><div class="sbtns"><button class="btn" data-act="savecopy">저장 코드 복사</button><button class="btn" data-act="savepaste">진행 불러오기</button></div></div>') +
        (G.storageOk() ? '' : '<p class="note">이 브라우저에서는 진행을 저장할 수 없어요.<br>창을 닫으면 진행이 사라져요.</p>') + '</div>' +
        (CW.FRIEND ? '' : '<details class="fold"><summary>문제 확인용</summary><div class="list">' +
        '<div class="row"><div class="info"><div class="name">게임 버전</div><div class="desc">새 버전은 앱을 다시 열 때 적용돼요.</div></div><b class="appver" id="appVer">' + appVersion() + '</b></div>' +
        lastErrorRow() + hitchRow() +
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
    function bottomInside() { try { return localStorage.getItem('cw-bottom') === 'inside'; } catch (e) { return false; } }
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
        ' (0.1초 넘게 멈춘 화면 수예요. 렉이 느껴질 때 이 줄을 캡처해 보내 주세요)</div></div></div>';
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
    function worldMap(d, open, frontier, here) {
      var hereR = here >= 0 ? CW.stageInfo(here).region : -1;
      return '<div class="wmap">' + LOCKS.map(function (p, i) {
        var on = open && i * 31 <= frontier, at = 'left:' + p[0] + '%;top:' + p[1] + '%';
        // the island goes to the furthest stage reached in it that is not a boss (x-29), or the front line in it
        var dest = Math.min(frontier, i * 31 + 28);
        var medal = on ? '<i class="wmedal' + (i === hereR ? ' cur' : '') + '" style="' + at + '"></i>' : i === 9 ? '<i class="wmedal shut" style="' + at + '"></i>' : '';
        return medal + '<button class="wisle" style="' + at + '" aria-label="' + DATA.regions[i].name + '" ' +
          (on ? 'data-sgo="' + dest + '" data-sd="' + d + '"' : 'data-wlock="' + (open ? i : -1) + '"') + '></button>';
      }).join('') + '</div>';
    }
    function stagePanel() {
      var s = G.state, d = selDiff < 0 ? (s.diff || 0) : selDiff, R = selRegion < 0 ? CW.stageInfo(s.stage).region : selRegion;
      var best = d === (s.diff || 0) ? s.best : ((s.diffBest || {})[d] ? s.diffBest[d].best : -1), frontier = Math.min(309, best + 1), here = d === (s.diff || 0) ? s.stage : -1;
      var st = CW.stats(s), reg = DATA.regions[R], open = d <= (s.diffUnlocked || 0);
      var head = '<div class="dsel"><button class="btn" data-dsel="-1" aria-label="이전 난이도">◀</button><b>' + DATA.difficulties[d].name + (open ? '' : ' (잠김)') + '</b><button class="btn" data-dsel="1" aria-label="다음 난이도">▶</button></div>' +
        // only when the difficulty is locked: what opens it (2026-11-15: the 보스 체력/몬스터/다이아 line and the help lines were taken out)
        (open ? '' : '<div class="note dnote">이전 난이도 10-31의 늑대 왕 처치 시 해금</div>') +
        (open ? '<button class="btn pri dgo" data-sgo="' + frontier + '" data-sd="' + d + '">' + (d === (s.diff || 0) ? '도전 중인 판으로' : DATA.difficulties[d].name + ' 도전 중인 판으로') + ' (' + CW.stageLabel(frontier) + ')</button>' : '') +
        worldMap(d, open, frontier, here) +
        '<div class="rsel">' + DATA.regions.map(function (r, i) { return '<button class="rchip' + (i === R ? ' on' : '') + (i * 31 > frontier ? ' lock' : '') + '" data-rsel="' + i + '">' + (i + 1) + '</button>'; }).join('') + '</div>' +
        '<div style="height:8px"></div>';
      var rows = '';
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
      panel.querySelectorAll('.row.grow .name').forEach(function (n) {
        var nm = n.querySelector('.nm'); if (!nm) return; nm.style.fontSize = '';
        var full = nm.scrollWidth, room = nm.clientWidth;
        if (full > room + 0.5) nm.style.fontSize = Math.max(10, parseFloat(getComputedStyle(nm).fontSize) * (room - 1) / full).toFixed(2) + 'px';
      });
    }
    function fitStageRows() {
      var list = panel.querySelector('.slist'), row = list && list.querySelector('.srow'); if (!row) return;
      list.classList.remove('tight', 'tighter'); list.style.removeProperty('--srw');
      var widest = function () { var w = 0; list.querySelectorAll('.srews').forEach(function (e) { e.style.width = 'max-content'; w = Math.max(w, e.getBoundingClientRect().width); e.style.width = ''; }); return Math.ceil(w); };
      var room = function () {
        var cs = getComputedStyle(row), cols = cs.gridTemplateColumns.split(' ').map(parseFloat), gap = parseFloat(cs.columnGap) || 0;
        return row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - cols[0] - cols[1] - cols[4] - gap * 4 - STAGE_NAME_MIN;
      };
      // two steps when it does not fit: smaller reward numbers (tight), then narrower stage/picture columns too (tighter)
      var w = widest();
      if (w > room()) { list.classList.add('tight'); w = widest(); }
      if (w > room()) { list.classList.add('tighter'); w = widest(); }
      if (w) list.style.setProperty('--srw', w + 'px');
      var cut = function (n) { return n.scrollHeight > n.clientHeight + 1; };
      list.querySelectorAll('.snm b').forEach(function (n) { n.classList.remove('tiny', 'tiny3'); if (cut(n)) n.classList.add('tiny'); if (cut(n)) n.classList.add('tiny3'); });
    }
    function renderPanel(force) {
      if (tab === 'battle') return;
      dockHtml = '';
      var html = PANELS[tab](), dh = dockHtml, key = html + '|dock|' + dh;
      if (!force && key === lastPanel) return;
      var y = panel.scrollTop; panel.innerHTML = html; panel.scrollTop = y; lastPanel = key;
      keepCircle(); if (tab === 'stage') fitStageRows(); if (tab === 'up') fitGrowNames();
      // the selected 신성력/룬 sits at the bottom of the sheet, always in sight (2026-11-15); it slides up when it opens
      var was = !dock.hidden; dock.innerHTML = dh; dock.hidden = !dh;
      if (dh && !was) { dock.classList.remove('pop'); void dock.offsetWidth; dock.classList.add('pop'); var sl = panel.querySelector('.sel'); if (sl) sl.scrollIntoView({ block: 'nearest' }); }
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
      if (d.tup) { ok = G.talentUp(d.tup); if (ok) toast(CW.talentById(d.tup).name + ' · 특성 레벨이 올랐어요.'); else if (!quiet) toast(CW.talentSpent(G.state) >= CW.talentPoints(G.state) ? '사용할 특성 포인트가 없어요.' : '해금 조건을 먼저 달성해 주세요.'); }
      else if (d.cup) { ok = G.upCostume(d.cup); if (ok) toast(CW.costumeById(d.cup).name + ' Lv.' + G.state.costume.owned[d.cup]); else if (!quiet) toast(G.state.costume.owned[d.cup] >= DATA.costumeConf.maxLv ? '최대 레벨에 도달했어요.' : '다이아가 부족해요.'); }
      else if (d.dlv) { ok = G.divineUp(d.dlv); if (ok) toast('삼신기 레벨이 올랐어요.'); else if (!quiet) toast(!CW.divineOpen(G.state) ? DATA.divineConf.unlockTier + '차 전직 후 해금' : '골드가 부족해요.'); }
      else if (d.sup) { ok = G.skillUp(d.sup); if (ok) toast(CW.skillById(d.sup).name + ' +' + CW.skillLevel(G.state, d.sup) + ' · 스킬 강화 완료'); else if (!quiet) toast(CW.skillLevel(G.state, d.sup) >= DATA.balance.skillMaxLv ? '최대 강화에 도달했어요.' : '골드가 부족해요.'); }
      renderPanel(true); hud(); if (d.sup) slots();
      return ok;
    }
    var HOLD_STEP = '[data-tup],[data-cup],[data-dlv],[data-sup]';
    var onDown = function (e) {
      var hs = e.target.closest(HOLD_STEP);
      if (hs) { var dd = { tup: hs.dataset.tup, cup: hs.dataset.cup, dlv: hs.dataset.dlv, sup: hs.dataset.sup }; stopHold(); if (!stepAct(dd, false)) return; holdT = setTimeout(function () { holdI = setInterval(function () { if (!stepAct(dd, true)) stopHold(); }, 90); }, 380); return; }
      var b = e.target.closest('[data-up],[data-mark],[data-circle],[data-blv],[data-rune],[data-sglv]'); if (!b) return;
      var key = b.dataset.up, mk = b.dataset.mark, ci = b.dataset.circle, bl = b.dataset.blv, ru = b.dataset.rune, sl = b.dataset.sglv;
      var once = function () { var ok = bl ? G.levelUp(bl) : ru ? G.runeUp(ru) : sl ? G.sigilLvUp() : mk ? G.markUp(mk) : ci ? G.circleUp() : (upMul > 1 ? G.upgradeN(key, upMul) : G.upgrade(key)); if (ok) { fxRune = ru || null; renderPanel(true); fxRune = null; hud(); } else stopHold(); };
      once(); holdT = setTimeout(function () { holdI = setInterval(once, 90); }, 380);
    };
    panel.addEventListener('pointerdown', onDown); dock.addEventListener('pointerdown', onDown);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { panel.addEventListener(ev, stopHold); dock.addEventListener(ev, stopHold); });
    var onClick = function (e) {
      var t = e.target.closest('button'); if (!t) return;
      var d = t.dataset;
      if (d.guide) { G.sound('click'); showGuide(d.guide); return; }   // 안내 카드 '자세히'
      if (t.matches(HOLD_STEP)) { if (e.detail === 0) stepAct(d, false); return; }   // a press is done on pointerdown; keys still work
      if (d.prev) { G.previewSkill(d.prev); }
      else if (d.sel !== undefined) { selSlot = selSlot === +d.sel ? -1 : +d.sel; renderPanel(true); }
      else if (d.eq) { var at = G.placeSkill(d.eq, selSlot); if (at >= 0) toast(CW.skillById(d.eq).name + ' · ' + (at + 1) + '번 슬롯에 배치했어요.'); selSlot = -1; renderPanel(true); slots(); }
      else if (d.out !== undefined || d.unslot !== undefined) { if (!G.unequipSkill(+(d.out !== undefined ? d.out : d.unslot))) toast('스킬은 최소 1개 장착해야 해요.'); renderPanel(true); slots(); }
      else if (d.mul) { upMul = +d.mul; renderPanel(true); }
      else if (d.tsub) { trainSub = d.tsub; panel.scrollTop = 0; renderPanel(true); }
      else if (d.tal) { selTalent = d.tal; renderPanel(true); }
      else if (d.act === 'treset') { G.talentReset(); toast('특성 포인트를 초기화했어요.'); renderPanel(true); }
      else if (d.act === 'rankup') { var rr2 = CW.rankReady(G.state); if (G.rankUp()) toast(DATA.rankConf.names[G.state.rank] + ' 승급 완료'); else toast(rr2.why === 'marks' ? '기본 징표 6개를 최대 레벨로 강화해 주세요.' : rr2.why === 'level' ? '계정 Lv.' + rr2.need + '이 필요해요.' : rr2.why === 'mana' ? '마력석이 부족해요.' : '최고 계급에 도달했어요.'); renderPanel(true); }
      else if (d.dgo) { var r3 = G.dungeon(d.dgo); if (r3 === 'busy') toast('진행 중인 보스전이나 던전을 먼저 마쳐 주세요.'); else if (r3 === 'ticket') toast('오늘 입장권을 모두 사용했어요.'); }
      else if (d.dsw) { var r4 = G.sweep(d.dsw); if (!r4) toast('소탕할 수 없어요. 입장권과 클리어 기록을 확인해 주세요.'); else toast('소탕 완료 · ' + (r4.gold ? '골드 +' + fmtG(r4.gold) : r4.gems ? '다이아 +' + fmt(r4.gems) : r4.runeStone ? '룬석 +' + fmt(r4.runeStone) + (r4.got && r4.got.length ? ' · 룬 ' + r4.got.length + '개' : '') + (r4.overflow ? ' · 가방 초과 보상 룬석 +' + fmt(r4.overflow) : '') : '마력석 +' + fmt(r4.mana))); renderPanel(true); hud(); }
      else if (d.jump !== undefined) { moreSub = +d.jump; panel.scrollTop = 0; renderPanel(true); }
      else if (d.gsub) { gearSub = d.gsub; selSigil = selRune = null; panel.scrollTop = 0; renderPanel(true); }
      else if (d.relic) { var rr = G.summonRelics(+d.relic); if (!rr) toast('다이아가 부족해요.'); else { showRelics(rr); renderPanel(true); hud(); } }
      else if (d.cbuy) { if (G.buyCostume(d.cbuy)) toast('새 코스튬 획득 · ' + CW.costumeById(d.cbuy).name); else toast('다이아가 부족해요.'); renderPanel(true); hud(); }
      else if (d.cwear) { if (G.wearCostume(d.cwear)) toast(CW.costumeById(d.cwear).name + ' 착용 완료'); renderPanel(true); }
      else if (d.dstar) { if (G.starUp(d.dstar)) toast('별 강화 완료!'); else toast(!CW.divineOpen(G.state) ? DATA.divineConf.unlockTier + '차 전직 후 해금' : !G.state.divine[d.dstar].lv ? '먼저 삼신기를 깨워 주세요.' : '신기 조각이 부족해요.'); renderPanel(true); }
      else if (d.preset !== undefined) { G.switchPreset(+d.preset); toast('스킬 프리셋 ' + (+d.preset + 1) + ' 적용'); renderPanel(true); slots(); }
      else if (d.act === 'skillall') { var nn = G.skillUpAll(); toast(nn ? '스킬 강화 +' + nn + ' 완료' : '골드가 부족해요.'); renderPanel(true); hud(); slots(); }
      else if (d.act === 'autoskill') { G.autoSkills(); toast('추천 스킬 4개를 배치했어요.'); renderPanel(true); slots(); }
      else if (d.dsel !== undefined) { var nd = ((selDiff < 0 ? (G.state.diff || 0) : selDiff) + +d.dsel + DATA.difficulties.length) % DATA.difficulties.length; selDiff = nd; selRegion = 0; renderPanel(true); }
      else if (d.rsel !== undefined) { selRegion = +d.rsel; renderPanel(true); }
      else if (d.wlock !== undefined) { toast(+d.wlock < 1 ? '이 난이도는 아직 잠겨 있어요.' : DATA.regions[+d.wlock - 1].name + ' 보스 처치 시 해금'); }
      else if (d.sgo !== undefined) { if (G.goStageIn(+d.sd, +d.sgo)) { toast(CW.stageLabel(+d.sgo) + ' 이동 완료'); selDiff = selRegion = -1; openTab('battle'); } }
      else if (d.diff !== undefined) { var dd = +d.diff; if (dd > G.state.diffUnlocked) toast('이전 난이도 10-31의 늑대 왕 처치 시 해금'); else confirmBox('난이도를 변경할까요?', '<b>' + DATA.difficulties[dd].name + '</b>의 진행으로 이동해요. 다른 난이도의 진행은 유지돼요.', '난이도 변경', function () { G.setDifficulty(dd); renderPanel(true); hud(); }); }
      else if (d.bkind) { bagKind = d.bkind; selKey = null; renderPanel(true); }
      else if (d.btr) { var eb = G.state.bag[d.btr]; if (G.transcend(d.btr)) { toast('초월 성공 · ' + CW.gearName(d.btr) + ' ★' + G.state.bag[d.btr].star); banner('초월 성공!'); } else toast(!eb ? '아직 획득하지 않은 장비예요.' : (eb.star || 0) >= DATA.bagConf.starMax ? '최고 초월에 도달했어요.' : eb.lv < CW.maxLevel(d.btr, eb.star) ? '최대 레벨까지 강화해 주세요.' : eb.n <= CW.transcendCost(G.state, d.btr).copies ? '같은 장비가 더 필요해요.' : '골드가 부족해요.'); renderPanel(true); hud(); }
      else if (d.brew) { if (G.brew(d.brew)) toast(CW.potionById(d.brew).name + ' 제작 완료'); else toast('골드가 부족해요.'); renderPanel(true); hud(); }
      else if (d.rpick) { selRune = selRune === d.rpick ? null : d.rpick; renderPanel(true); }
      else if (d.rgrade) { var ri = CW.runeItem(G.state, d.rgrade), rg2 = ri ? ri.grade : 0; if (G.runeGradeUp(d.rgrade)) { toast('룬 승급 완료 · ' + CW.runeById(ri.kind).name + ' ' + hn(rg2 + 1)); banner(hn(rg2 + 1) + ' 룬!'); } else toast('룬석이 부족해요.'); fxRune = d.rgrade; renderPanel(true); fxRune = null; }
      else if (d.reqp) { var res0 = CW.runeResonance(G.state); if (G.runeEquipToggle(d.reqp) === 'full') toast('룬 슬롯이 가득 찼어요. 기존 룬을 해제한 뒤 장착해 주세요.'); else { var res1 = CW.runeResonance(G.state); if (res1 < res0) toast('룬 공명 ' + res0 + '단계 → ' + res1 + '단계 · 장착한 룬 중 가장 낮은 레벨 기준이에요.'); } renderPanel(true); }
      else if (d.rlock) { G.runeLock(d.rlock); renderPanel(true); }
      else if (d.rdis) { var rn = G.runeDismantle(d.rdis); if (rn) { toast('룬석 +' + fmt(rn)); selRune = null; } else toast('장착 중이거나 잠긴 룬은 분해할 수 없어요.'); renderPanel(true); }
      else if (d.rfuse) { var rf = G.runeFuse(d.rfuse); if (rf) { selRune = rf.id; toast('룬 합성 완료 · ' + hn(rf.grade) + ' ' + CW.runeById(rf.kind).name); banner(hn(rf.grade) + ' 룬!'); } else toast('합성하려면 같은 종류·등급의 룬 3개가 필요해요.'); renderPanel(true); }
      else if (d.rsum) { var rs = G.runeSummon(+d.rsum); if (!rs) toast('소환할 수 없어요. 다이아와 가방 여유 공간을 확인해 주세요.'); else { showRunes(rs); renderPanel(true); hud(); } }
      else if (d.rkf) { rnFilter = d.rkf; renderPanel(true); }
      else if (d.act === 'rbest') { G.runeEquipBest(); toast('추천 룬을 장착했어요.'); renderPanel(true); }
      else if (d.act === 'rdisall') { confirmBox('룬을 일괄 분해할까요?', '장착하지 않고 잠기지 않은 룬을 모두 룬석으로 바꿔요.<br>분해한 룬은 되돌릴 수 없어요.', '룬 분해', function () { var rn2 = G.runeDismantleAll(); toast(rn2 ? '룬석 +' + fmt(rn2) : '분해할 룬이 없어요.'); selRune = null; renderPanel(true); }, { variant: 'danger' }); }
      else if (d.pack && CW.FRIEND) { toast('체험판에서는 수령할 수 없어요.'); }
      else if (d.pack) { var pk = CW.packById(d.pack); confirmBox('연습용 패키지를 받을까요?', '<b>' + pk.name + '</b> · 표시 가격 ' + pk.won.toLocaleString('ko-KR') + '원<br>실제 결제는 없어요. 구성품이 즉시 지급돼요.', '구성품 받기', function () { var got = G.buyPack(d.pack); if (got === false) toast(CW.packOpen(G.state, d.pack) !== 'ok' ? '현재 수령 조건을 충족하지 않아요.' : '신성력 가방의 여유 공간이 부족해요. (최대 ' + DATA.sigilConf.cap + '개)'); else if (got.gear && got.gear.length) showGacha(got.gear); else if (got.length) showSigils(got, true); else if (pk.give.daily) showDaily(false); else toast(pk.name + ' 수령 완료'); renderPanel(true); hud(); }); }
      else if (d.act === 'daily') { showDaily(false); }
      else if (d.dockx) { if (d.dockx === 'sg') selSigil = null; else selRune = null; renderPanel(true); }
      else if (d.sgswap) { var sw = d.sgswap.split('|'); if (G.sigilSwap(sw[0], sw[1])) toast('신성력을 교체했어요.'); renderPanel(true); }
      else if (d.rswap) { var rw = d.rswap.split('|'); if (G.runeSwap(rw[0], rw[1])) toast('룬을 교체했어요.'); renderPanel(true); }
      else if (d.sg) { selSigil = selSigil === d.sg ? null : d.sg; renderPanel(true); }
      else if (d.sgset !== undefined) { G.sigilSet(+d.sgset); toast('신성력 세트 ' + (+d.sgset + 1) + ' 적용'); renderPanel(true); }
      else if (d.sgf !== undefined) { sgFilter = +d.sgf; renderPanel(true); }
      else if (d.sgeq) { var r5 = G.sigilEquipToggle(d.sgeq); if (r5 === 'full') toast('신성력 슬롯이 가득 찼어요. 신성력 레벨을 올리면 슬롯이 늘어나요.'); renderPanel(true); }
      else if (d.sglock) { G.sigilLock(d.sglock); renderPanel(true); }
      else if (d.sgdis) { var n5 = G.sigilDismantle(d.sgdis); toast(n5 ? '신성석 +' + n5 : '장착 중이거나 잠긴 신성력은 분해할 수 없어요.'); renderPanel(true); }
      else if (d.sgfuse) { var f5 = G.sigilFuse(d.sgfuse); if (f5) { selSigil = f5.id; toast('신성력 합성 완료 · ' + hn(f5.grade)); } else toast('장착하지 않고 잠기지 않은 같은 등급 3개가 필요해요.'); renderPanel(true); }
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
      else if (d.pull) { var n2 = +d.pull, items = G.pull(n2); if (!items) toast('다이아가 부족해요.'); else { showGacha(items); renderPanel(true); hud(); } }
      else if (d.shop !== undefined && CW.FRIEND) { toast('체험판에서는 수령할 수 없어요.'); }
      else if (d.shop !== undefined) { var p = DATA.shop[+d.shop]; confirmBox('연습용 다이아를 받을까요?', '<b>' + p.name + '</b> · 표시 가격 ' + p.won.toLocaleString('ko-KR') + '원<br>실제 결제는 없어요. 다이아가 즉시 지급돼요.', '다이아 받기', function () { var g = G.buy(+d.shop); toast('다이아 +' + fmt(g)); renderPanel(true); hud(); }); }
      else if (d.go !== undefined) { if (G.goStage(+d.go)) { toast(CW.stageLabel(+d.go) + ' 이동 완료'); renderPanel(true); } }
      else if (d.act === 'savecopy') {
        var code = G.exportSave(), done = function () { toast('저장 코드를 복사했어요. 다른 기기의 ‘진행 불러오기’에 붙여 넣으세요.'); };
        var show = function () { modal('<h2>저장 코드</h2><p class="guide-lead">코드 전체를 복사해 다른 기기에서 사용하세요.</p><textarea class="codebox" readonly>' + code + '</textarea>', [{ label: '확인', pri: true }], { variant: 'guide' }); var ta = $('modalCard').querySelector('textarea'); ta.focus(); ta.select(); };
        try { navigator.clipboard.writeText(code).then(done, show); } catch (err) { show(); }
      }
      else if (d.act === 'nick') {
        modal('<h2>닉네임 변경</h2><p class="guide-lead">1~8글자로 입력해 주세요.</p><input class="nickin" type="text" maxlength="8" autocomplete="off" value="' + esc(G.nickName()) + '">',
          [{ label: '취소' }, { label: '변경하기', pri: true, fn: function () { var v = ($('modalCard').querySelector('.nickin').value || '').replace(/\s+/g, ' ').trim(); if (!v || v.length > 8) { toast('닉네임은 1~8글자로 입력해 주세요.'); return; } G.setNick(v); toast('닉네임을 변경했어요.'); renderPanel(true); hud(); } }], { variant: 'guide' });
      }
      else if (d.act === 'savepaste' && CW.FRIEND) { toast('체험판에서는 사용할 수 없어요.'); }
      else if (d.act === 'savepaste') {
        modal('<h2>진행을 불러올까요?</h2><p class="guide-lead">다른 기기에서 복사한 저장 코드를 붙여 넣으세요.</p><div class="guide-section"><p><strong>주의</strong> · 이 기기의 현재 진행이 코드의 진행으로 교체돼요.</p></div><textarea class="codebox" placeholder="CW1:로 시작하는 코드"></textarea>',
          [{ label: '취소' }, { label: '진행 불러오기', pri: true, fn: function () { var v = $('modalCard').querySelector('textarea').value; if (G.importSave(v)) toast('저장한 진행을 불러왔어요.'); else toast('저장 코드가 올바르지 않아요. 처음부터 끝까지 복사했는지 확인해 주세요.'); } }], { variant: 'danger' });
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
        if (d.set === 'fpsCap') G.setSetting('fpsCap', { 60: 50, 50: 40, 40: 30, 30: 60 }[st.fpsCap || 60]);
        if (d.set === 'quality') G.setSetting('quality', { auto: 'high', high: 'mid', mid: 'low', low: 'auto' }[st.quality]);
        if (d.set === 'reset') confirmBox('모든 진행을 삭제할까요?', '진행·장비·다이아가 모두 삭제되며 <strong>복구할 수 없어요.</strong>', '계속', function () { confirmBox('최종 확인', '진행을 완전히 삭제해요.', '모든 진행 삭제', G.reset, { variant: 'danger' }); }, { variant: 'danger' });
        renderPanel(true);
      }
    };
    panel.addEventListener('click', onClick); dock.addEventListener('click', onClick);
    CW.ICO.onTint = function () { if (tab === 'gear' || tab === 'gacha') renderPanel(true); };
    document.querySelectorAll('#tabs [data-tab]').forEach(function (b) { var x = CW.ICO.misc && CW.ICO.misc('tab', b.dataset.tab), sv = b.querySelector('svg'); if (x && sv) sv.outerHTML = x; });
    // the rune and sigil shortcuts use the user's pictures (art/ic-rune.webp, ic-sigil.webp, 2026-11-14)
    var QI = { map: CW.ICO.misc('quick', 'map'), alch: CW.ICO.misc('potion', 'rage'), rune: '<img class="ico" src="art/ic-rune.webp" alt="">', sigil: '<img class="ico" src="art/ic-sigil.webp" alt="">',
      // the monster codex (2026-11-15): the book off the user's codex picture, opens the full-screen page (js/dex-ui.js)
      dex: '<img class="ico" src="art/dex-book.webp" alt="">', mail: '<img class="ico" src="art/mail-box.webp" alt="">' };   // 우편함 (2026-11-15): the user's mailbox picture, js/mail-ui.js
    document.querySelectorAll('#quick [data-quick]').forEach(function (b) { b.querySelector('i').innerHTML = QI[b.dataset.quick] || ''; });
    $('quick').addEventListener('click', function (e) {
      var b = e.target.closest('[data-quick]'); if (!b) return; var q = b.dataset.quick; G.sound('click');
      if (q === 'map') { selDiff = selRegion = -1; openTab(tab === 'stage' ? 'battle' : 'stage'); }
      else if (q === 'alch') { trainSub = 'alch'; openTab('up'); }
      else if (q === 'dex') { if (CW.dexOpen) CW.dexOpen(); }
      else if (q === 'mail') { if (CW.mailOpen) CW.mailOpen(); }
      else { gearSub = q; openTab('gear'); }
    });
    $('pre').addEventListener('click', function (e) { var b = e.target.closest('[data-pre]'); if (!b) return; G.switchPreset(+b.dataset.pre); G.sound('click'); toast('스킬 프리셋 ' + (+b.dataset.pre + 1) + ' 적용'); slots(); if (tab === 'skill') renderPanel(true); });
    function openTab(name) {
      tab = name; document.querySelectorAll('#tabs [data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x.dataset.tab === name ? 'true' : 'false'); });
      var open = name !== 'battle';
      $('sheet').classList.toggle('on', open); $('sheet').classList.toggle('tall', name !== 'more' && name !== 'gacha'); G.setSheet(open);
      if (open) { $('sheetTitle').innerHTML = ((CW.ICO.misc && CW.ICO.misc('tab', name)) || (name === 'stage' ? CW.ICO.misc('quick', 'map') : '')) + TITLES[name]; panel.scrollTop = 0; renderPanel(true); }
    }
    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (!b) return;
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
        (r.levels ? '<div class="offlv">레벨 ' + r.levels + ' 올랐어요!</div>' : '') + '</div>',
        [{ label: '<i class="awstar"></i>보상 받기', pri: true, fn: onClose }]);
      var card = $('modalCard'); card.classList.add('away');
      // count up: the shown number grows from 0 to the real amount (same words as gh / fmt at every step)
      var vals = { g: r.gold || 0, x: r.xp || 0 }, show = { g: gh, x: fmt }, t0 = performance.now(), DUR = 900, DELAY = 350;
      var still = root.matchMedia && root.matchMedia('(prefers-reduced-motion:reduce)').matches;
      if (still) return;
      card.querySelectorAll('.awt b[data-to]').forEach(function (el) { el.innerHTML = '+' + show[el.dataset.to](0); });
      (function step(now) {
        if ($('modal').hidden || !card.classList.contains('away')) return;
        var k = Math.max(0, Math.min(1, (now - t0 - DELAY) / DUR)), e = 1 - Math.pow(1 - k, 3);
        card.querySelectorAll('.awt b[data-to]').forEach(function (el) { var to = el.dataset.to; el.innerHTML = '+' + show[to](k >= 1 ? vals[to] : vals[to] * e); });
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
    function showTierUp(tier, skill) {
      var t = DATA.tiers[tier - 1];
      $('flashbg').classList.remove('go'); void $('flashbg').offsetWidth; $('flashbg').classList.add('go');
      modal('<h2 style="color:var(--gold)">' + tier + '차 전직 완료!</h2><div class="big">' + t.name + '</div>' + (skill ? '<p>새 스킬 <b style="color:#fff">' + skill.name + '</b>을(를) 획득해 슬롯에 배치했어요.</p>' + (function () { var more = DATA.skills.filter(function (x) { return x.tier === tier && x.id !== skill.id; }); return more.length ? '<p>같은 계열 스킬 <b style="color:#fff">' + more.map(function (x) { return x.name; }).join(' · ') + '</b>도 열렸어요.<br>스킬 메뉴에서 원하는 조합을 만들어 보세요.</p>' : ''; })() : '') + '<p>효과 연출도 더 화려해져요.</p>', [{ label: '확인', pri: true }]);
    }
    function showGacha(items) {
      var fx = $('gachaFx'), best = Math.max.apply(null, items.map(function (i) { return i.grade; }));
      fx.hidden = false; fx.innerHTML = '<div class="chest"><img class="cclosed" src="' + (CW.ART_BASE || 'art/') + 'ui-chest-closed.webp" alt="" draggable="false"><img class="copen" src="' + (CW.ART_BASE || 'art/') + 'ui-chest-open.webp" alt="" draggable="false"></div><div class="note">마법 상자를 여는 중…</div><button class="btn" id="gSkip">건너뛰기</button>';
      var chest = fx.querySelector('.chest'), openT = setTimeout(function () { chest.classList.add('open'); }, best >= 4 ? 900 : 500);
      G.sound('pull');
      var done = false;
      function showCards() {
        if (done) return; done = true; clearTimeout(openT);
        if (best >= 4) { $('flashbg').classList.remove('go'); void $('flashbg').offsetWidth; $('flashbg').classList.add('go'); G.sound('legend'); }
        var shown = items.slice().sort(function (a, b) { return b.grade - a.grade; });
        var hero = best >= 4 ? '<div class="reveal" style="color:' + gc(best) + '">' + DATA.grades[best].name + '!</div>' : '';
        fx.innerHTML = hero + '<div class="cards">' + shown.map(function (it, i) { return '<div class="gcard" style="--gc:' + gc(it.grade) + ';--d:' + Math.min(i * 0.04, 1.2) + 's"><div class="gface">' + gearArt(it.kind, it.grade, it.sub) + '<small>' + DATA.grades[it.grade].name + ' ' + CW.roman(it.sub || 0) + '</small></div><div class="gbackc" style="background-image:url(' + (CW.ART_BASE || 'art/') + 'ui-card-back.webp)"></div></div>'; }).join('') + '</div><div class="btns" style="width:min(420px,100%)"><button class="btn" id="gClose">닫기</button><button class="btn pri" id="gAgain">한 번 더 (' + items.length + '회)</button></div>';
        $('gClose').onclick = function () { fx.hidden = true; };
        $('gAgain').onclick = function () { var more = G.pull(items.length); if (!more) { toast('다이아가 부족해요.'); return; } showGacha(more); renderPanel(true); hud(); };
      }
      $('gSkip').onclick = showCards; setTimeout(showCards, best >= 4 ? 1400 : 900);
    }

    var logLines = [];
    function gainLog(g) {
      var add = [];
      if (g.gold > 0) add.push('<i class="coin"></i>골드 +' + gh(g.gold));
      if (g.xp > 0) add.push('<b class="xpdot"></b>경험치 +' + fmt(g.xp));
      if (g.gems > 0) add.push('<i class="gem"></i>다이아 +' + fmt(g.gems));
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
    function profRow(label, value, keys, by, value2, short) {
      var parts = profParts(keys, by, short);
      var cells = '<span>' + label + '</span>' + (value2 === undefined ? '<b class="w2">' + value + '</b>' : '<b>' + value + '</b><b>' + value2 + '</b>');
      if (!parts) return '<div class="pfrow"><div class="pfl">' + cells + '</div></div>';
      return '<details class="pfrow"><summary class="pfl">' + cells + '</summary><ul>' + parts + '</ul></details>';
    }
    function profBox(id, ico, name, sum, body) {
      var on = !!profOpen[id];
      return '<section class="pfbox' + (on ? ' on' : '') + '"><button class="pfhd" data-pfsec="' + id + '" aria-expanded="' + on + '"><img src="art/prof-ico-' + ico + '.webp" alt="">' +
        '<b>' + name + '</b>' + (sum ? '<small>' + sum + '</small>' : '') + '<i class="pfchev"></i></button><div class="pfin">' + body + '</div></section>';
    }
    function profHtml() {
      var s = G.state, st = CW.stats(s), by = CW.bonusBySource(s), tier = DATA.tiers[s.tier - 1] || {}, worn = CW.titleWorn(s), owned = CW.titlesOwned(s);
      var x = function (v) { return '×' + (Math.round(v * 100) / 100).toFixed(2); };
      var crit = [['치명타', 'critRate', 'critDmg'], ['슈퍼', 'superRate', 'superDmg'], ['울트라', 'ultraRate', 'ultraDmg'], ['하이퍼', 'hyperRate', 'hyperDmg'], ['메가', 'megaRate', 'megaDmg'], ['얼티밋', 'ultimateRate', 'ultimateDmg'], ['알파', 'alphaRate', 'alphaDmg']]
        .map(function (c) { return profRow(c[0], pct(st[c[1]] || 0), [c[1], c[2]], by, x(st[c[2]] || 0), ['확률', '피해']); }).join('');
      var titles = DATA.titles.map(function (t) {
        var have = owned.indexOf(t.id) >= 0, on = worn === t.id;
        var eff = t.bonus ? Object.keys(t.bonus).map(function (k) { return (STAT_KO[k] || k) + ' ' + CW.bonusAmount(k, t.bonus[k]); }).join(' · ') : '효과 없음';
        return '<button class="ttl' + (on ? ' on' : '') + (have ? '' : ' lock') + '" data-title="' + t.id + '"' + (have ? '' : ' disabled') + '><b>' + (have ? '' : '🔒 ') + t.name + '</b><small>' + (have ? eff : CW.titleNeedText(t)) + '</small></button>';
      }).join('');
      var srcBox = '';
      if (profSrc) {
        var SRC = { atk: ['공격력', ['atkPct']], speed: ['공격 속도', ['speed']] }[profSrc], parts = SRC ? profParts(SRC[1], by) : '';
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
        profBox('atk', 'atk', '공격 효과', '', profRow('스킬 피해', x(st.skillDmg * st.mastery), ['skillDmg'], by) + profRow('보스 피해', x(st.bossDmg), ['bossDmg'], by) + profRow('모든 피해', x(st.finalMul), ['finalPct', 'potion'], by)) +
        profBox('crit', 'crit', '크리티컬', '확률 ' + pct(st.critRate || 0) + ' · 배율 ' + x(st.critDmg || 0), '<div class="pfcols"><span></span><em>확률</em><em>배율</em></div>' + crit) +
        profBox('spec', 'spec', '특수 효과', '', profRow('약점 피해', x(st.weakMul), ['weakDmg'], by) + profRow('폭주 피해', x(st.surgeMul), ['surgeDmg', 'surgeRate'], by) +
          profRow('골드 획득', x(st.goldMul), ['goldMul', 'potionGold'], by) + profRow('경험치 획득', x(st.xpMul), ['xpMul', 'potionXp'], by)) +
        titleBox + '<p class="pfnote"><img src="art/prof-ico-hand.webp" alt="">능력치를 선택하면 증가 내역을 확인할 수 있어요.</p></div>';
    }
    // long numbers or names never spill out of their place: the font shrinks until it fits
    // (the room is the box's own width, capped by its max-width; the serif digits arrive late, so it fits again then)
    function profFit() {
      if (!profEl) return;
      profEl.querySelectorAll('.pfv,.pfboss,.pfname,.pflv,.pfbadge,.pfhd small').forEach(function (el) {
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
    document.querySelector('#hud .prof').addEventListener('click', function () { G.sound('click'); openStats(); });
    return { surgeGauge: surgeGauge, dunHud: dunHud, gainLog: gainLog, openTab: openTab, hud: hud, slots: slots, renderPanel: renderPanel, toast: toast, banner: banner, showOffline: showOffline, showDaily: showDaily, showTierUp: showTierUp, showGacha: showGacha, modal: modal, currentTab: function () { return tab; } };
  }
  CW.createUI = createUI;
})(this);
