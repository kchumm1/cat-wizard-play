(function (root) {
  var CW = root.CW = root.CW || {};
  var DATA = CW.DATA, fmt = CW.fmt;
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
    var tab = 'battle', selSlot = -1, lastPanel = '', toastT = 0, lastBuffs = '';
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
      var k = selKey, p = CW.parseKey(k), e = s.bag[k], lv = e ? e.lv : 0, star = e ? e.star || 0 : 0, max = CW.maxLevel(k, star), stat = DATA.kindStat[p.kind], worn = s.equip[p.kind] === k, cost = CW.levelCost(k, lv);
      var BG = DATA.bagConf, trc = CW.transcendCost(s, k), stars = ''; for (var si = 0; si < BG.starMax; si++) stars += '<i class="' + (si < star ? 'on' : '') + '">★</i>';
      var trOk = e && star < BG.starMax && lv >= max && e.n > trc.copies && s.gold >= trc.gold;
      var pot = e && e.pot ? e.pot.map(function (pl) { var t = potTag(pl.q || 0); return '<p style="color:' + t[1] + '">' + t[0] + ' - ' + (STAT_KO[pl.stat] || pl.stat) + ' +' + pct(pl.val) + '</p>'; }).join('') : '<p class="note">잠재력 없음 · 다이아로 열 수 있어요 (장착 중일 때 적용)</p>';
      var top = '<div class="bagtop">' + bagCell(k, true) + '<div class="binfo"><b style="color:' + gc(p.grade) + '">' + CW.gearName(k) + '</b><span class="gstars">' + stars + '</span><span class="note">Lv.' + lv + ' / ' + max + (e ? '' : ' · 아직 없어요') + '</span>' +
        '<div class="eff"><small>장착 효과</small>' + statLine(stat, CW.mainValue(p.kind, p.t, lv, star)) + '</div><div class="eff"><small>보유 효과</small>' + statLine(stat, CW.ownedValue(p.kind, p.t, lv, star)) + '</div><div class="potbox"><small>잠재력</small>' + pot + '</div></div></div>' +
        '<div class="bagbtns"><button class="buy' + (!e || lv >= max || s.gold < cost ? ' off' : '') + '" data-blv="' + k + '">' + (lv >= max ? '최대 레벨' : '<small>레벨업</small><span><i class="coin"></i>' + fmt(cost) + '</span>') + '</button>' +
        '<button class="btn' + (e && e.n >= DATA.bagConf.mergeCount && p.t < T - 1 ? '' : ' off') + '" data-bmerge="' + k + '">합성 ' + (e ? e.n : 0) + '/' + DATA.bagConf.mergeCount + '</button>' +
        '<button class="btn' + (worn ? ' on' : '') + (e ? '' : ' off') + '" data-bequip="' + k + '">' + (worn ? '장착 중' : '장착') + '</button>' +
        '<button class="btn tr' + (trOk ? '' : ' off') + '" data-btr="' + k + '">' + (star >= BG.starMax ? '초월 완료 ★' + star : '초월 ★' + star + '→' + (star + 1) + '<small>최대 레벨 · 같은 장비 ' + trc.copies + '개 · <i class="coin"></i>' + fmt(trc.gold) + '</small>') + '</button>' +
        '<button class="btn' + (e ? '' : ' off') + '" data-bpot="' + k + '">잠재력 💎' + DATA.potConf.cost + '</button></div>';
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
        '<p class="note">같은 장비 ' + DATA.bagConf.mergeCount + '개 → 한 단계 위(I→II→III→IV→다음 등급 I). 가진 장비는 모두 보유 효과를 줘요. 최대 레벨이 된 장비는 같은 장비를 써서 초월할 수 있어요: 별마다 효과 +' + pct(BG.starMul) + ', 최대 레벨 +' + BG.starLv + '.</p>';
    }
    var selDiff = -1, selRegion = -1, gearSub = 'gear', upMul = 1, trainSub = 'grow', selTalent = null, selRune = null, fxRune = null, selSigil = null, sgFilter = -1;
    function mmss(sec) { sec = Math.ceil(sec); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
    function alchPanel() {
      var s = G.state, AC = DATA.alchConf, now = Date.now();
      if (!CW.alchemyOpen(s)) return '<div class="notice">' + AC.unlockTier + '차 전직 후에 연금술이 열려요 (1-31 보스를 이기면 2차).</div>';
      var lv = CW.alchLevel(s), cost = CW.potionCost(s), brews = (s.alch && s.alch.brews) || 0, toNext = AC.brewsPerLv - brews % AC.brewsPerLv;
      var head = '<div class="alchhead"><div class="cauldron" aria-hidden="true">' + CW.ICO.pic('cauldron') + '</div><div><b>연금술 Lv.' + lv + '</b><span class="note">' + (lv >= AC.maxLv ? '최고 레벨이에요' : '물약 ' + toNext + '개 더 만들면 레벨업') + ' · 물약 효과 +' + pct(lv * AC.effPerLv) + ' · ' + CW.potionMinutes(s) + '분 지속</span></div></div>';
      var list = DATA.potions.map(function (p) {
        var left = CW.buffLeft(s, p.id, now);
        return '<div class="row potion' + (left ? ' on' : '') + '"><div class="ricon pt">' + mi('potion', p) + '</div><div class="info"><div class="name">' + p.name + '</div><div class="desc">' + p.desc + ' ×' + (1 + CW.potionPower(s, p.id)).toFixed(2) + (left ? ' · <b class="tleft">' + mmss(left) + ' 남음</b>' : '') + '</div></div>' +
          '<button class="buy' + (s.gold < cost ? ' off' : '') + '" data-brew="' + p.id + '"><small>' + (left ? '시간 추가' : '만들기') + '</small><span><i class="coin"></i>' + fmt(cost) + '</span></button></div>';
      }).join('');
      return head + '<div class="list">' + list + '</div><p class="note">물약 값은 지금 ' + Math.round(AC.costSec / 60) + '분 동안 버는 골드쯤이에요. 다시 만들면 시간이 더해져요(최대 ' + CW.potionMinutes(s) * AC.stackCap + '분). 게임을 꺼 둔 동안에도 시간은 흘러요.</p>';
    }
    function trainTabs() {
      return '<div class="subtabs n5" role="tablist">' + [['grow', '성장'], ['talent', '특성'], ['alch', '연금술'], ['mark', '승급'], ['circle', '마나서클']].map(function (t) {
        return '<button role="tab" aria-selected="' + (trainSub === t[0]) + '" data-tsub="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    }
    function manaLine() { return '<div class="manaline"><span>' + CW.ICO.cur('mana') + ' 마력석 <b>' + fmt(G.state.mana || 0) + '</b></span><small class="note">보스·마력의 탑에서 얻어요</small></div>'; }
    function trainPanel() {
      if (trainSub === 'talent') return trainTabs() + talentPanel();
      if (trainSub === 'alch') return trainTabs() + alchPanel();
      if (trainSub === 'mark') return trainTabs() + manaLine() + markPanel();
      if (trainSub === 'circle') return trainTabs() + manaLine() + circlePanel();
      return trainTabs() + upPanel();
    }
    function talentPanel() {
      var s = G.state, pts = CW.talentPoints(s), spent = CW.talentSpent(s), TC = DATA.talentConf;
      var rows = [0, 1, 2].map(function (r) {
        var nodes = DATA.talents.filter(function (t) { return t.row === r; }).map(function (t) {
          var lv = (s.talents || {})[t.id] || 0, open = s.level >= TC.rowLevel[r] && (r === 0 || CW.talentSpent(s, r - 1) >= TC.rowNeed[r]);
          return '<button class="tnode' + (selTalent === t.id ? ' sel' : '') + (open ? '' : ' lock') + (lv >= t.max ? ' max' : '') + '" data-tal="' + t.id + '"><span class="ti">' + (open ? mi('talent', t) : CW.ICO.pic('lock', 'ilock')) + '</span><b>' + lv + '/' + t.max + '</b><small>' + t.name + '</small></button>';
        }).join('');
        return '<div class="trow">' + nodes + '</div>' + (r < 2 ? '<div class="tarrow">▼ ' + (TC.rowNeed[r + 1] ? '위에서 ' + TC.rowNeed[r + 1] + '포인트 · ' : '') + 'Lv.' + TC.rowLevel[r + 1] + '</div>' : '');
      }).join('');
      var t = selTalent && CW.talentById(selTalent), info = '';
      if (t) {
        var lv = (s.talents || {})[t.id] || 0;
        info = '<div class="tinfo"><b>' + t.name + ' ' + lv + '/' + t.max + '</b><div>' + STAT_KO[t.stat] + ' +' + pct(lv * t.per) + (lv < t.max ? ' → <span style="color:#8ff59a">+' + pct((lv + 1) * t.per) + '</span>' : '') + '</div>' +
          '<div class="note">' + (t.row ? '위 줄에 ' + TC.rowNeed[t.row] + '포인트 이상, ' : '') + '계정 레벨 ' + TC.rowLevel[t.row] + ' 이상</div>' +
          '<div class="btns"><button class="buy' + (CW.talentCan(s, t.id) ? '' : ' off') + '" data-tup="' + t.id + '">레벨업 (포인트 1)</button></div></div>';
      }
      return '<div class="artban ab-talent" aria-hidden="true"></div><div class="tpoints"><span>남은 포인트 <b>' + (pts - spent) + '</b> / ' + pts + '</span><button class="btn" data-act="treset">초기화</button></div><div class="note" style="margin:0 0 8px">계정 레벨 ' + TC.levelsPerPoint + '마다 포인트 1개. 초기화는 무료예요.</div><div class="ttree">' + rows + '</div>' + (info || '<p class="note">칸을 누르면 자세히 볼 수 있어요.</p>');
    }
    function markPanel() {
      var s = G.state, RC = DATA.rankConf, r = s.rank || 0, cap = CW.markCap(s), ready = CW.rankReady(s);
      var stars = ''; for (var i = 0; i < RC.names.length - 1; i++) stars += '<i class="' + (i < r ? 'on' : '') + '">★</i>';
      var head = '<div class="rankbox"><div class="dstars">' + stars + '</div><b>' + RC.names[r] + '</b><span class="note">승급 효과 · 모든 피해 +' + pct(r * RC.rankFinal) + '</span></div>';
      var list = DATA.marks.map(function (m) {
        var lv = (s.marks || {})[m.id] || 0, cost = CW.markCost(lv), full = lv >= cap;
        return '<div class="row"><div class="ricon mk">' + mi('mark', m) + '</div><div class="info"><div class="name">' + m.name + ' <span class="lv">' + lv + '/' + cap + '</span></div><div class="desc">' + STAT_KO[m.stat] + ' +' + pct(lv * m.per) + '</div></div>' +
          '<button class="buy gemb' + (full || (s.mana || 0) < cost ? ' off' : '') + '" data-mark="' + m.id + '">' + (full ? '최대' : '' + CW.ICO.cur('mana') + ' ' + fmt(cost)) + '</button></div>';
      }).join('');
      var next = r + 1 < RC.names.length ? RC.names[r + 1] : null;
      var cond = next ? '<div class="rankup"><div class="note">다음: <b style="color:#fff">' + next + '</b><br>조건 · 모든 징표 ' + cap + ' · 계정 Lv.' + RC.rankLevel[r + 1] + ' · ' + CW.ICO.cur('mana') + ' ' + fmt(RC.rankCost[r + 1]) + '</div><button class="buy' + (ready.ok ? '' : ' off') + '" data-act="rankup">승급</button></div>' : '<p class="note">가장 높은 계급이에요.</p>';
      return head + '<div class="list">' + list + '</div>' + cond;
    }
    function circlePanel() {
      var s = G.state, CC = DATA.circleConf, lv = s.circle || 0, tier = CW.circleTier(s), cost = CW.circleCost(lv), max = lv >= CC.maxLv;
      var toNext = (tier + 1) * CC.tierEvery - lv;
      return '<div class="mcircle t' + Math.min(8, tier) + '"><div class="mcart"></div><div class="mtext"><small>마나서클 레벨</small><b>Lv.' + lv + '</b><span>' + (tier + 1) + '서클 마법사</span></div></div>' +
        '<div class="ceff"><div><span>레벨 효과</span><b>스킬 피해 +' + pct(lv * CC.perLv) + '</b></div><div class="hi"><span>서클 효과</span><b>모든 피해 +' + pct(tier * CC.tierFinal) + '</b></div></div>' +
        '<p class="note" style="text-align:center">' + (max ? '최고 서클이에요' : toNext + '레벨 더 올리면 ' + (tier + 2) + '서클 (모든 피해 +' + pct(CC.tierFinal) + ')') + '</p>' +
        '<div class="btns" style="justify-content:center"><button class="buy gemb' + (max || (s.mana || 0) < cost ? ' off' : '') + '" data-circle="1">' + (max ? '최대' : '레벨업 ' + CW.ICO.cur('mana') + ' ' + fmt(cost)) + '</button></div><p class="note" style="text-align:center">버튼을 꾹 누르면 계속 올라가요.</p>';
    }
    function dungeonPanel() {
      var s = G.state, now = Date.now();
      if (!CW.dungeonOpen(s)) return '<div class="notice">' + DATA.dungeonConf.unlockTier + '차 전직 후에 던전이 열려요 (1-31 보스를 이기면 2차).</div>';
      var run = G.dunState();
      return (run ? '<div class="notice">지금 ' + run.name + ' 진행 중이에요.</div>' : '') + '<div class="note" style="margin-bottom:8px">던전마다 하루 입장권 ' + DATA.dungeonConf.tickets + '장. 한 번 깬 던전은 소탕으로 최고 기록만큼 바로 받을 수 있어요. 보상은 지금까지 간 가장 먼 판에 맞춰 커져요.</div><div class="dlist">' +
        DATA.dungeons.map(function (d) {
          var left = CW.ticketsLeft(s, d.id, now), best = s.dungeon && s.dungeon.best && s.dungeon.best[d.id];
          var bestTxt = best ? (d.id === 'mana' ? '최고 피해 ' + fmt(best.dmg) : '최고 ' + best.kills + '마리') : '기록 없음';
          var rw = best ? CW.dungeonReward(s, d.id, best) : null;
          var rwTxt = rw ? (rw.gold ? '골드 +' + fmt(rw.gold) : rw.gems ? '다이아 +' + fmt(rw.gems) : rw.runeStone ? '룬석 +' + fmt(rw.runeStone) : '마력석 +' + fmt(rw.mana)) : '';
          if (!CW.kindOpen(s, d.id)) return '<div class="dung dg-' + d.id + ' lockd"><div class="dicon">' + mi('dungeon', d) + '</div><div class="info"><div class="dname">' + d.name + '</div><div class="note">' + d.desc + '</div><div class="note">' + d.unlockTier + '차 전직 후에 열려요</div></div></div>';
          return '<div class="dung dg-' + d.id + '"><div class="dicon">' + mi('dungeon', d) + '</div><div class="info"><div class="dname">' + d.name + '</div><div class="note">' + d.desc + '</div><div class="note">입장권 <b style="color:#fff">' + left + '/' + DATA.dungeonConf.tickets + '</b> · ' + bestTxt + (rwTxt ? ' (' + rwTxt + ')' : '') + '</div></div>' +
            '<div class="dbtns"><button class="buy' + (left && !run ? '' : ' off') + '" data-dgo="' + d.id + '">입장</button><button class="btn' + (left && best && !run ? '' : ' off') + '" data-dsw="' + d.id + '">소탕</button></div></div>';
        }).join('') + '</div>';
    }
    var chainT = null;
    function chain(n, name) {
      var el = $('chainBanner'); el.innerHTML = '<small>' + name + '</small>' + n + '체인 발동!'; el.className = 'on c' + n;
      clearTimeout(chainT); chainT = setTimeout(function () { el.className = ''; }, 1100);
    }
    function dunHud(run) {
      var el = $('dunHud'); if (!run) { el.className = ''; return; }
      el.className = 'on';
      el.innerHTML = '<b>' + run.name + '</b><span>' + Math.max(0, run.t).toFixed(1) + '초</span><span>' + (run.kind === 'mana' ? '피해 ' + fmt(run.dmg) + ' · 골렘 Lv.' + run.level : '처치 ' + run.kills) + '</span>';
    }
    var STAT_KO = { megaRate: '메가 크리티컬 확률', megaDmg: '메가 크리티컬 피해', ultimateRate: '얼티밋 크리티컬 확률', ultimateDmg: '얼티밋 크리티컬 피해', alphaRate: '알파 크리티컬 확률', alphaDmg: '알파 크리티컬 피해', atkPct: '공격력', critRate: '치명타 확률', critDmg: '치명타 피해', superRate: '슈퍼 크리티컬 확률', superDmg: '슈퍼 크리티컬 피해', ultraRate: '울트라 크리티컬 확률', ultraDmg: '울트라 크리티컬 피해', hyperRate: '하이퍼 크리티컬 확률', hyperDmg: '하이퍼 크리티컬 피해', bossDmg: '보스 피해', normalDmg: '일반 몬스터 피해', skillDmg: '스킬 피해', goldMul: '골드 획득', xpMul: '경험치 획득', speed: '공격 속도', chain2: '2체인 확률', chain3: '3체인 확률', finalPct: '모든 피해' };
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
      return '<h3>유물 소환 <small class="note">모은 유물 ' + have + '/' + DATA.relics.length + '</small></h3>' + pulls +
        '<div class="note" style="margin:6px 0 10px">같은 유물이 또 나오면 레벨이 올라요. 금빛 테두리는 드문 신유물(' + pct(DATA.relicSummon.divineRate) + ')이에요. 최대 레벨이면 다이아 ' + DATA.relicSummon.refund + '개로 바뀌어요.</div><div class="list">' + list + '</div>';
    }
    function costumePanel() {
      var s = G.state, own = s.costume.owned, wear = s.costume.wear;
      var cards = DATA.costumes.map(function (c) {
        var lv = own[c.id] || 0, img = G.costumeThumb(c.id), on = wear === c.id, max = lv >= DATA.costumeConf.maxLv, ns = CW.costumeStars(lv), cst = '';
        for (var ci = 0; ci < DATA.costumeConf.maxLv / DATA.costumeConf.starEvery; ci++) cst += '<i class="' + (ci < ns ? 'on' : '') + '">★</i>';
        var act = !lv ? '<button class="buy gemb' + (s.gems < c.price ? ' off' : '') + '" data-cbuy="' + c.id + '"><i class="gem"></i>' + fmt(c.price) + '</button>'
          : '<div class="cbtns"><button class="btn' + (on ? ' on' : '') + '" data-cwear="' + c.id + '">' + (on ? '입는 중' : '입기') + '</button><button class="buy gemb' + (max || s.gems < CW.costumeUpCost(c, lv) ? ' off' : '') + '" data-cup="' + c.id + '">' + (max ? '최대' : '<small>강화</small><span><i class="gem"></i>' + fmt(CW.costumeUpCost(c, lv)) + '</span>') + '</button></div>';
        return '<div class="ccard' + (on ? ' on' : '') + (lv ? '' : ' none') + '" style="--gc:' + hc(c.grade) + '"><div class="cgrade">' + hn(c.grade) + (lv ? ' Lv.' + lv + '/' + DATA.costumeConf.maxLv : '') + '</div>' + (img ? '<img src="' + img + '" alt="">' : '') +
          '<b>' + c.name + '</b><span class="cdesc">' + c.desc + '</span><div class="cstars">' + cst + '</div><small>' + bonusText(c.stat, CW.costumeValue(c, Math.max(1, lv))) + (lv ? '' : ' (가지면)') + '</small>' + act + '</div>';
      }).join('');
      var nOwn = DATA.costumes.filter(function (c) { return own[c.id]; }).length, CC = DATA.costumeConf;
      return '<h3>코스튬</h3><div class="note" style="margin:-4px 0 8px">다이아로 사고 다이아로 강화해요. 입은 코스튬은 모습만 바꾸고, 가진 코스튬은 입지 않아도 효과가 모두 적용돼요. 강화 ' + CC.starEvery + '레벨마다 ★ 하나 (효과 +' + pct(CC.starBonus) + ').</div>' +
        '<div class="codexbar"><span>코스튬 수집 (' + nOwn + '/' + DATA.costumes.length + ')</span><b>모든 피해 +' + pct(Math.max(0, nOwn - 1) * CC.collect) + '</b></div><div class="cgrid">' + cards + '</div>';
    }
    function divinePanel() {
      var s = G.state, open = CW.divineOpen(s), D = s.divine, C = DATA.divineConf;
      var head = '<div class="shards"><span>✦ 신기 조각 <b>' + fmt(D.shards) + '</b></span><small class="note">' + (open ? '보스 ' + C.shardBoss + '개 · 지역 보스 ' + C.shardRegion + '개' : C.unlockTier + '차 전직 후에 열려요') + '</small></div>';
      var cards = DATA.divine.map(function (it) {
        var d = D[it.id] || { lv: 0, star: 0 }, cost = CW.divineUpCost(d.lv), sc = CW.starCost(d.star);
        var stars = ''; for (var i = 0; i < C.starMax; i++) stars += '<i class="' + (i < d.star ? 'on' : '') + '">★</i>';
        var val = d.lv ? it.per * d.lv * (1 + C.starBonus * d.star) : 0;
        return '<div class="dcard' + (open ? '' : ' none') + '"><div class="dstars">' + stars + '</div><div class="dicon">' + mi('divine', it) + '</div><div class="dname">' + it.name + ' <span class="lv">Lv.' + d.lv + '</span></div><div class="note">' + it.kind + ' · ' + it.desc + '</div>' +
          '<div class="deff">' + (d.lv ? bonusText(it.stat, val) : STAT_KO[it.stat] + ' (레벨당 +' + pct(it.per) + ', 별마다 +' + pct(C.starBonus) + ')') + '</div>' +
          '<div class="btns"><button class="buy' + (!open || s.gold < cost || d.lv >= C.maxLv ? ' off' : '') + '" data-dlv="' + it.id + '">' + (d.lv ? '레벨업' : '깨우기') + ' <i class="coin"></i>' + fmt(cost) + '</button>' +
          '<button class="btn' + (!open || !d.lv || D.shards < sc || d.star >= C.starMax ? ' off' : '') + '" data-dstar="' + it.id + '">별 올리기 ✦' + sc + '</button></div></div>';
      }).join('');
      return '<h3>별의 삼신기</h3>' + head + '<div class="dlist">' + cards + '</div>';
    }
    function runePanel() {
      var s = G.state, RC = DATA.runeConf, open = CW.runeOpen(s), res = CW.runeResonance(s);
      if (!selRune) selRune = DATA.runes[0].id;
      var r = CW.runeById(selRune), lv = CW.runeLv(s, r.id), cost = CW.runeCost(lv), rg = CW.runeGrade(s, r.id), cap = CW.runeCap(s, r.id), top = rg >= DATA.hiGrades.length - 1, full = lv >= cap, gcost = CW.runeGradeCost(rg);
      var head = '<div class="manaline"><span>' + CW.ICO.cur('rune') + ' 룬석 <b>' + fmt(s.runeStone || 0) + '</b></span><small class="note">' + (open ? '보스·던전 「룬의 신전」에서 얻어요' : RC.unlockTier + '차 전직 후에 열려요') + '</small></div>';
      var ring = '<div class="runering">' + DATA.runes.map(function (x, i) {
        var xg = CW.runeGrade(s, x.id);
        return '<button class="rune' + (x.id === selRune ? ' sel' : '') + (fxRune === x.id ? ' up' : '') + (CW.runeLv(s, x.id) ? '' : ' zero') + '" data-rpick="' + x.id + '" style="--rc:' + x.color + ';--rg:' + hc(xg) + ';--i:' + i + '" aria-label="' + x.name + ' ' + hn(xg) + '"><i class="rgn">' + hn(xg) + '</i>' + CW.ICO.rune(x.id, x.color, xg, hc(xg)) + '<b>Lv.' + CW.runeLv(s, x.id) + '</b></button>';
      }).join('') + '<svg class="rlines" viewBox="0 0 200 200" aria-hidden="true">' + DATA.runes.map(function (x, i) { var a = i * Math.PI / 3 - Math.PI / 2, lv = CW.runeLv(s, x.id); return '<line x1="100" y1="100" x2="' + (100 + Math.cos(a) * 69).toFixed(1) + '" y2="' + (100 + Math.sin(a) * 69).toFixed(1) + '" stroke="' + x.color + '" stroke-width="' + (lv ? 3 : 1.5) + '" opacity="' + (lv ? 0.85 : 0.25) + '"' + (lv ? ' class="flow"' : '') + '/>'; }).join('') + '<circle cx="100" cy="100" r="68" fill="none" stroke="#8a7ad0" stroke-width="1.5" stroke-dasharray="2 6" opacity=".6"/></svg><div class="rcore' + (res ? ' lit' : '') + '"><small>룬 공명</small><b>' + res + '단계</b><span>모든 피해 +' + pct(res * RC.resFinal) + '</span></div></div>';
      var detail = '<div class="row"><div class="ricon" style="background:radial-gradient(circle,' + r.color + '55,#1a1030);box-shadow:inset 0 0 0 2px ' + r.color + '">' + CW.ICO.rune(r.id, r.color, rg, hc(rg)) + '</div><div class="info"><div class="name"><span style="color:' + hc(rg) + '">' + hn(rg) + '</span> ' + r.name + ' <span class="lv">Lv.' + lv + '/' + cap + '</span></div><div class="desc">' + bonusText(r.stat, CW.runeValue(s, r)) + ' (등급 보너스 +' + pct(rg * RC.gradeStep) + ')</div></div>' +
        (full && !top ? '<button class="buy gemb' + (!open || (s.runeStone || 0) < gcost ? ' off' : '') + '" data-rgrade="' + r.id + '"><small>' + hn(rg + 1) + '(으)로 승급</small><span>' + CW.ICO.cur('rune') + ' ' + fmt(gcost) + '</span></button>'
          : '<button class="buy' + (!open || full || (s.runeStone || 0) < cost ? ' off' : '') + '" data-rune="' + r.id + '">' + (full ? '최대' : CW.ICO.cur('rune') + ' ' + fmt(cost)) + '</button>') + '</div>';
      return head + ring + detail + '<p class="note">가장 낮은 룬이 ' + ((res + 1) * RC.resEvery) + '레벨이 되면 공명 ' + (res + 1) + '단계 (모든 피해 +' + pct(RC.resFinal) + ' 더). 등급마다 최대 레벨이 ' + RC.lvPerGrade + '씩 늘고, 최대 레벨에서 룬석으로 승급해요 (' + hn(0) + ' → ' + hn(DATA.hiGrades.length - 1) + '). 버튼을 꾹 누르면 계속 올라가요.</p>';
    }
    function sgCell(it, eqd) {
      return '<button class="sgcell' + (selSigil === it.id ? ' sel' : '') + (eqd ? ' eq' : '') + '" data-sg="' + it.id + '" style="--gc:' + hc(it.grade) + '"><span class="tg">' + hn(it.grade) + '</span>' + CW.ICO.sigil(it.stat, it.grade, hc(it.grade), it.q) +
        (it.lock ? '<span class="lk">🔒</span>' : '') + '<span class="q">' + Math.round(it.q * 100) + '%</span></button>';
    }
    function sigilPanel() {
      var s = G.state, C = DATA.sigilConf;
      if (!CW.sigilOpen(s)) return '<div class="notice">' + C.unlockTier + '차 전직 후에 신성력이 열려요. 보스가 떨어뜨리거나 다이아로 소환해요.</div>';
      var b = s.sigil, eq = CW.equipped(s), slots = CW.sigilSlots(s), lvCost = CW.sigilLvCost(b.lv);
      if (selSigil && !CW.sigilById(s, selSigil)) selSigil = null;
      var head = '<div class="sghead"><span>장착 슬롯 <b>' + eq.length + '/' + slots + '</b> · 보유 ' + b.items.length + '/' + C.cap + '</span><div class="sgsets">' + [0, 1, 2].map(function (i) { return '<button class="btn' + (b.cur === i ? ' on' : '') + '" data-sgset="' + i + '" aria-pressed="' + (b.cur === i) + '">' + (i + 1) + '</button>'; }).join('') + '</div></div>';
      var cells = ''; for (var i = 0; i < C.slotsMax; i++) {
        if (i < slots) cells += eq[i] ? sgCell(CW.sigilById(s, eq[i]), true) : '<div class="sgcell empty"></div>';
        else cells += '<div class="sgcell lockd"><span>🔒</span><small>Lv.' + ((i - C.slotsBase + 1) * C.slotsPer) + '</small></div>';
      }
      var sum = {}; eq.forEach(function (id) { var it = CW.sigilById(s, id); sum[it.stat] = (sum[it.stat] || 0) + CW.sigilValue(it); });
      var effs = Object.keys(sum).map(function (k) { return '<p>' + bonusText(k, sum[k]) + '</p>'; }).join('') || '<p class="note">장착한 신성력이 없어요</p>';
      var lvbar = '<div class="codexbar"><span>신성력 레벨 효과 (Lv.' + b.lv + ')</span><b>신성력 데미지 +' + pct(b.lv * C.lvFinal) + '</b></div>' +
        '<div class="sglv"><span>' + CW.ICO.cur('sigil') + ' 신성석 <b>' + fmt(b.stone) + '</b><small class="note">분해하면 얻어요</small></span><button class="buy gemb' + (b.stone < lvCost || b.lv >= C.lvMax ? ' off' : '') + '" data-sglv="1">' + (b.lv >= C.lvMax ? '최대' : '<small>레벨업</small><span>' + CW.ICO.cur('sigil') + ' ' + fmt(lvCost) + '</span>') + '</button></div>';
      var sel = selSigil ? CW.sigilById(s, selSigil) : null, selBox = '';
      if (sel) {
        var on = eq.indexOf(sel.id) >= 0, same = b.items.filter(function (x) { return x !== sel && x.grade === sel.grade && !x.lock && !CW.isEquipped(s, x.id); }).length;
        selBox = '<div class="sgsel" style="--gc:' + hc(sel.grade) + '"><div class="sgselhead"><span class="sgbig">' + CW.ICO.sigil(sel.stat, sel.grade, hc(sel.grade), sel.q) + '</span><div><b style="color:' + hc(sel.grade) + '">' + hn(sel.grade) + ' ' + (STAT_KO[sel.stat] || sel.stat) + '</b><span class="note">' + CW.qualityName(sel.q) + ' (' + Math.round(sel.q * 100) + '%) · ' + bonusText(sel.stat, CW.sigilValue(sel)) + '</span></div></div>' +
          '<div class="sgbtns"><button class="btn' + (on ? ' on' : '') + '" data-sgeq="' + sel.id + '">' + (on ? '해제' : '장착') + '</button><button class="btn' + (sel.lock ? ' on' : '') + '" data-sglock="' + sel.id + '">' + (sel.lock ? '잠금 풀기' : '잠금') + '</button>' +
          '<button class="btn' + (sel.lock || CW.isEquipped(s, sel.id) ? ' off' : '') + '" data-sgdis="' + sel.id + '">분해</button><button class="btn' + (same >= 2 && sel.grade < DATA.hiGrades.length - 1 && !sel.lock && !CW.isEquipped(s, sel.id) ? '' : ' off') + '" data-sgfuse="' + sel.id + '">합성 ' + Math.min(3, same + 1) + '/3</button></div>' + (sel.grade < DATA.hiGrades.length - 1 ? '<span class="note">같은 등급 3개 → ' + hn(sel.grade + 1) + '</span>' : '<span class="note">가장 높은 등급이에요</span>') + '</div>';
      }
      var filt = '<div class="kindtabs">' + [-1].concat(DATA.hiGrades.map(function (x, i) { return i; })).map(function (g) { return '<button role="tab" aria-selected="' + (sgFilter === g) + '" data-sgf="' + g + '"' + (g >= 0 ? ' style="color:' + hc(g) + '"' : '') + '>' + (g < 0 ? '전체' : hn(g)) + '</button>'; }).join('') + '</div>';
      var inv = b.items.filter(function (x) { return sgFilter < 0 || x.grade === sgFilter; }).sort(function (a, c) { return CW.sigilPower(c) - CW.sigilPower(a); }).map(function (x) { return sgCell(x, CW.isEquipped(s, x.id)); }).join('');
      var acts = '<div class="btns bagacts"><button class="btn pri" data-act="sgbest">추천 장착</button><button class="btn" data-act="sgdisall">잠금 안 한 것 모두 분해</button></div>' +
        '<div class="pulls sgpulls">' + [5, 10].map(function (n) { return '<button class="pull' + (s.gems < C.summon[n] ? ' off' : '') + '" data-sgsum="' + n + '"><b>신성력 ' + n + '회 소환</b><span><i class="gem"></i>' + C.summon[n] + '</span></button>'; }).join('') + '</div>';
      return head + '<div class="sggrid">' + cells + '</div>' + lvbar + '<div class="potbox sgeff"><small>신성력 장착 효과</small>' + effs + '</div>' + selBox + acts + filt + '<div class="sggrid inv">' + (inv || '<p class="note">신성력이 없어요. 보스를 잡거나 소환해 보세요.</p>') + '</div>' +
        '<p class="note">같은 등급 3개를 합성하면 다음 등급이 나와요. 분해하면 신성석이 나오고, 신성석으로 레벨을 올리면 신성력 데미지와 슬롯이 늘어요(' + C.slotsPer + '레벨마다 1칸).</p>';
    }
    function showSigils(list, fromPack) {
      var best = Math.max.apply(null, list.map(function (x) { return x.grade; }));
      modal('<h2 style="color:' + hc(best) + '">' + (best >= 5 ? hn(best) + ' 신성력!' : '신성력 ' + list.length + '개') + '</h2><div class="sggrid got">' + list.slice().sort(function (a, c) { return c.grade - a.grade; }).map(function (it) { return sgCell(it, false); }).join('') + '</div>',
        fromPack ? [{ label: '좋아요', pri: true }] : [{ label: '닫기' }, { label: '한 번 더', pri: true, fn: function () { var r = G.sigilSummon(list.length); if (!r) toast('다이아가 부족하거나 가방이 꽉 찼어요'); else { showSigils(r); hud(); } } }]);
    }
    function showRelics(list) {
      var shown = list.slice().sort(function (a, b) { return (CW.relicById(b.id).divine ? 1 : 0) - (CW.relicById(a.id).divine ? 1 : 0); });
      var gems = list.reduce(function (a, o) { return a + o.refund; }, 0), hasDivine = list.some(function (o) { return CW.relicById(o.id).divine; });
      modal('<h2' + (hasDivine ? ' style="color:var(--gold)"' : '') + '>' + (hasDivine ? '신유물이 나왔어요!' : '유물 ' + list.length + '개') + '</h2><div class="rgot">' + shown.slice(0, 60).map(function (o) {
        var r = CW.relicById(o.id); return '<div class="' + (r.divine ? 'divine' : '') + '"><span>' + mi('relic', r) + '</span><small>' + r.name + '</small><b>' + (o.refund ? '다이아 +' + o.refund : 'Lv.' + o.lv) + '</b></div>';
      }).join('') + '</div>' + (gems ? '<p class="note">최대 레벨이라 다이아 ' + gems + '개로 바꿨어요.</p>' : ''), [{ label: '닫기' }, { label: '한 번 더', pri: true, fn: function () { var r = G.summonRelics(list.length); if (!r) toast('다이아가 부족해요'); else { showRelics(r); renderPanel(true); hud(); } } }]);
    }
    var panel = $('panel');

    // ---------- modal / toast ----------
    function modal(html, buttons) {
      $('modalCard').innerHTML = html + '<div class="btns">' + buttons.map(function (b, i) { return '<button class="btn ' + (b.pri ? 'pri' : '') + '" data-mb="' + i + '">' + b.label + '</button>'; }).join('') + '</div>';
      $('modal').hidden = false;
      $('modalCard').querySelectorAll('[data-mb]').forEach(function (el) { el.onclick = function () { var b = buttons[+el.dataset.mb]; $('modal').hidden = true; if (b.fn) b.fn(); G.sound('click'); }; });
    }
    function confirmBox(title, text, yes, onYes) { modal('<h2>' + title + '</h2><p>' + text + '</p>', [{ label: '취소' }, { label: yes, pri: true, fn: onYes }]); }
    function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200); }
    function banner(text) { var b = $('banner'); b.textContent = text; b.classList.add('on'); setTimeout(function () { b.classList.remove('on'); }, 1300); }

    // ---------- HUD ----------
    var lastPlace = '', lastSub = null;
    function hud() {
      var s = G.state, info = CW.stageInfo(s.stage), R = DATA.regions[info.region];
      var pn = (s.diff ? '<u>' + CW.diffOf(s).name + '</u>' : '') + '<b data-t="' + R.name + '">' + R.name + '</b><i>' + CW.stageLabel(s.stage) + '</i>';
      if (pn !== lastPlace) { lastPlace = pn; $('placeName').innerHTML = pn; }
      $('goldTxt').textContent = fmt(s.gold); $('gemTxt').textContent = fmt(s.gems);
      $('lvTxt').textContent = 'Lv.' + s.level; $('xpBar').style.width = (s.level >= DATA.balance.levelMax ? 100 : Math.min(100, s.xp / CW.xpNeed(s.level) * 100)) + '%';
      var boss = G.boss(), sub = '', kp;
      $('bossbox').classList.toggle('on', !!boss);
      $('killBar').style.display = boss ? 'none' : '';
      if (boss) {
        $('bossName').textContent = (info.isRegionBoss ? '전직 시험 · ' : '') + boss.name;
        $('bossTime').textContent = Math.max(0, boss.time).toFixed(1) + '초';
        $('bossHp').style.width = Math.max(0, boss.mob.hp / boss.mob.maxHp * 100) + '%';
      } else {
        kp = G.killProgress();
        sub = s.farming ? '' : '<i class="mk"></i><b>' + kp.n + '</b><em>/ ' + kp.max + '</em>';
        $('killBar').firstChild.style.width = (s.farming ? 100 : kp.n / kp.max * 100) + '%';
        $('killBar').classList.toggle('loop', !!s.farming);
      }
      if (sub !== lastSub) { lastSub = sub; $('placeSub').innerHTML = sub; $('placeSub').style.display = sub ? '' : 'none'; }
      $('retry').classList.toggle('on', s.farming && !boss && G.canRetry() && !G.dunState());
      dunHud(G.dunState());
      var now = Date.now(), bt = DATA.potions.map(function (p) { var l = CW.buffLeft(s, p.id, now); return l ? '<span>' + mi('potion', p) + mmss(l) + '</span>' : ''; }).join('');
      if (bt !== lastBuffs) { lastBuffs = bt; $('buffs').innerHTML = bt; }
      var tier = DATA.tiers[s.tier - 1];
      var next = s.tier < 9 ? (s.tier) + '-31 보스를 이기면 ' + (s.tier + 1) + '차' : (s.best >= 309 ? '마왕 토벌 완료!' : '최종 목표 10-31 늑대 왕');
      $('tierTag').textContent = s.tier + '차 ' + tier.name; if ($('questTxt').textContent !== next) $('questTxt').textContent = next;
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
      var mul = '<div class="mulpick" role="group" aria-label="한 번에 올릴 단계">' + [1, 10, 100].map(function (n) { return '<button class="btn' + (upMul === n ? ' on' : '') + '" data-mul="' + n + '" aria-pressed="' + (upMul === n) + '">×' + n + '</button>'; }).join('') + '</div>';
      return '<h3>성장</h3>' + mul + '<div class="note" style="margin:4px 0 8px">버튼을 꾹 누르면 계속 올라가요. ×10·×100은 골드가 되는 만큼 한 번에 올려요.</div><div class="list">' + Object.keys(DATA.upgrades).map(function (k) {
        var u = DATA.upgrades[k], lv = s.up[k] || 0, max = u.max !== null && lv >= u.max, one = CW.upgradeCost(k, lv), cost = upMul > 1 ? CW.upgradeCostN(s, k, upMul) : one;
        if (!CW.upgradeOpen(s, k)) {
          var nd = CW.upgradeNeed(k), why = u.tier && (s.tier || 1) < u.tier ? u.tier + '차 전직 후에 열려요' : DATA.upgrades[nd.key].name + ' Lv.' + nd.lv + ' 달성하면 열려요';
          return '<div class="row lockrow"><div class="ricon">' + CW.ICO.stat(k) + '</div><div class="info"><div class="name">' + u.name + '</div><div class="desc need">' + why + '</div></div><span class="lockic">🔒</span></div>';
        }
        return '<div class="row"><div class="ricon">' + CW.ICO.stat(k) + '</div><div class="info"><div class="name">' + u.name + '<span class="lv">Lv.' + lv + '</span></div><div class="desc">' + eff[k] + '</div></div>' +
          '<button class="buy ' + (max || s.gold < one ? 'off' : '') + '" data-up="' + k + '">' + (max ? '최대' : (upMul > 1 ? '<small>×' + upMul + '</small>' : '') + '<i class="coin"></i>' + fmt(cost)) + '</button></div>';
      }).join('') + '</div>';
    }
    function skillPanel() {
      var s = G.state;
      var top = '<div class="note" style="margin:0 0 8px">4칸을 1번부터 차례로 쉬지 않고 써요. 어떤 스킬이든 어느 칸에나 넣을 수 있고, 칸을 비워 둘 수도 있어요.</div><div class="slotgrid">' +
        s.slots.map(function (id, i) {
          var sk = id && CW.skillById(id), on = i === selSlot;
          return '<div class="slotcard' + (on ? ' on' : '') + '"><button class="slotpick" data-sel="' + i + '" style="' + (sk ? '--c:#' + new THREE.Color(sk.color).getHexString() : '') + '"><small>' + (i + 1) + '번</small>' + (sk ? '<span class="spi" aria-label="' + sk.name + '">' + CW.ICO.skill(sk.id) + '</span>' : '<span class="spi none">+</span>') + (sk ? '<em>+' + CW.skillLevel(s, sk.id) + '</em>' : '') + '</button>' +
            (sk ? '<button class="slotout" data-out="' + i + '" aria-label="' + (i + 1) + '번 칸 비우기">빼기</button>' : '') + '</div>';
        }).join('') + '</div><div class="presets"><span class="note">프리셋</span>' + [0, 1, 2].map(function (i) { return '<button class="btn' + ((s.preset || 0) === i ? ' on' : '') + '" data-preset="' + i + '" aria-pressed="' + ((s.preset || 0) === i) + '">' + (i + 1) + '</button>'; }).join('') +
          '</div><div class="btns" style="margin:8px 0 4px"><button class="btn pri" data-act="autoskill">센 스킬로 자동 배치</button><button class="btn" data-act="skillall">일괄 강화</button></div>' +
          '<div class="note">스킬 보유 효과: 모든 스킬 피해 +' + pct(CW.skillOwnedStats(s).skillDmg) + ' (강화 1단계마다 +' + pct(DATA.balance.skillOwnedPer) + ')</div>' +
        '<div class="note">' + (selSlot >= 0 ? (selSlot + 1) + '번 칸을 골랐어요. 아래에서 넣을 스킬을 누르세요.' : '칸을 고르지 않고 넣으면 빈 칸(없으면 4번 칸)에 들어가요.') + '</div>';
      var list = DATA.skills.map(function (sk) {
        var locked = sk.tier > s.tier, at = s.slots.indexOf(sk.id), lv = CW.skillLevel(s, sk.id), max = lv >= DATA.balance.skillMaxLv, cost = CW.skillUpCost(sk, lv);
        var dmg = sk.mult * (1 + DATA.balance.skillLvBonus * lv), next = sk.mult * (1 + DATA.balance.skillLvBonus * (lv + 1));
        var act = locked ? '<span class="note">' + sk.tier + '차 전직</span>'
          : (at >= 0 ? '<button class="btn" data-unslot="' + at + '">' + (at + 1) + '번 빼기</button>' : '<button class="btn pri" data-eq="' + sk.id + '">' + (selSlot >= 0 ? (selSlot + 1) + '번에 넣기' : '넣기') + '</button>');
        var up = locked ? '' : '<button class="buy ' + (max || s.gold < cost ? 'off' : '') + '" data-sup="' + sk.id + '">' + (max ? '최대' : '강화 <i class="coin"></i>' + fmt(cost)) + '</button>';
        return '<div class="row skrow" style="' + (locked ? 'opacity:.55' : '') + '"><div class="sk" style="--c:#' + new THREE.Color(sk.color).getHexString() + ';width:52px;height:52px">' + CW.ICO.skill(sk.id) + '</div><div class="info"><div class="name">' + sk.name + '<span class="lv">' + (locked ? sk.tier + '차' : '+' + lv) + '</span></div><div class="desc">피해 ×' + (Math.round(dmg * 100) / 100) + (!max && !locked ? ' → ×' + (Math.round(next * 100) / 100) : '') + ' · ' + (sk.targets >= 99 ? '모든 몬스터' : '몬스터 ' + sk.targets) + (sk.status ? ' · ' + STATUS[sk.status] : '') + '</div>' +
          '<div class="skbtns"><button class="btn" data-prev="' + sk.id + '">보기</button>' + act + up + '</div></div></div>';
      }).join('');
      return top + '<h3>스킬 목록 · 강화</h3><div class="note" style="margin:-4px 0 8px">강화할 때마다 그 스킬 피해가 ' + Math.round(DATA.balance.skillLvBonus * 100) + '%씩 늘어요 (최대 +' + DATA.balance.skillMaxLv + '). 강화할수록 연출도 커져요.</div><div class="list">' + list + '</div>';
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
      var nextNeed = lv < 10 ? L[lv] : null, prev = L[lv - 1];
      var bar = nextNeed ? Math.min(100, (s.pulls - prev) / (nextNeed - prev) * 100) : 100;
      var head = '<div class="gacha-head"><div class="lvl">' + lv + '<small>뽑기 레벨</small></div><div style="flex:1;min-width:0"><div class="note">' + (nextNeed ? '다음 레벨까지 ' + (nextNeed - s.pulls) + '회' : '최고 레벨') + '</div><div class="bar" style="margin:6px 0"><i style="width:' + bar + '%"></i></div><div class="note">전설 확정까지 ' + (DATA.gacha.pity - s.pity) + '회 · 지금 전설 ' + DATA.gacha.table[lv - 1][4] + '% · 신화 ' + DATA.gacha.table[lv - 1][5] + '%</div></div></div>';
      var pulls = '<div class="pulls">' + [1, 10, 30, 100].map(function (n) {
        return '<button class="pull ' + (n === 100 ? 'big' : '') + '" data-pull="' + n + '"><b>' + n + '회 뽑기</b><span><i class="gem"></i>' + fmt(CW.gachaCost(n)) + '</span><small class="note">' + (n >= 100 ? '영웅 이상 1개 보장' : n >= 10 ? '희귀 이상 1개 보장' : '장비 1개') + '</small></button>';
      }).join('') + '</div>';
      var table = '<details style="margin-top:12px"><summary class="note" style="cursor:pointer">확률 보기</summary><div class="tablewrap"><table class="prob"><tr><th>레벨</th>' + DATA.grades.map(function (g) { return '<th style="color:' + g.color + '">' + g.name + '</th>'; }).join('') + '</tr>' +
        DATA.gacha.table.map(function (r, i) { return '<tr style="' + (i + 1 === lv ? 'color:var(--gold)' : '') + '"><td>' + (i + 1) + ' (' + L[i] + '회~)</td>' + r.map(function (p) { return '<td>' + p + '%</td>'; }).join('') + '</tr>'; }).join('') + '</table></div></details>';
      return '<div class="artban ab-gacha" aria-hidden="true"></div><h3>장비 뽑기</h3>' + head + pulls + table + '<p class="note" style="margin-top:10px">다이아가 부족하면 더보기 → 상점에서 받을 수 있어요(연습용).</p>';
    }
    function morePanel() {
      var s = G.state;
      var tiers = '<h3>전직</h3><div class="list">' + DATA.tiers.map(function (t, i) {
        var n = i + 1, done = s.tier >= n, sk = t.skill && CW.skillById(t.skill);
        return '<div class="row" style="' + (done ? '' : 'opacity:.6') + '"><div class="info"><div class="name">' + n + '차 ' + t.name + (s.tier === n ? '<span class="lv">지금</span>' : '') + '</div><div class="desc">' + (n === 1 ? '처음부터' : (n - 1) + '-31 보스를 이기면') + (sk ? ' · 새 스킬 ' + sk.name : ' · 시작 스킬 4개') + '</div></div></div>';
      }).join('') + '</div>';
      var frontier = Math.min(309, s.best + 1);
      var regions = '<h3>사냥터</h3><div class="note" style="margin:-4px 0 8px">지나온 지역에서 다시 사냥할 수 있어요.</div><div class="btns">' + DATA.regions.map(function (r, i) {
        var open = i * 31 <= frontier; return '<button class="btn" data-go="' + (i * 31) + '" ' + (open ? '' : 'disabled style="opacity:.35"') + '>' + r.name + '</button>';
      }).join('') + '<button class="btn pri" data-go="' + frontier + '">도전 중인 판으로</button></div>';
      var shop = '<h3>상점</h3><div class="notice">실제 결제 없음 · 연습용</div><div class="shop">' + DATA.shop.map(function (p, i) {
        var first = !s.firstBuy[i];
        return '<div class="prod">' + (first ? '<span class="tag">첫 구매 2배</span>' : '') + '<div class="amt"><i class="gem"></i>' + fmt(p.gems * (first ? 2 : 1)) + '</div><div class="note">' + p.name + '</div><button class="buy gemb" data-shop="' + i + '">' + p.won.toLocaleString('ko-KR') + '원</button></div>';
      }).join('') + '</div>' + '<h3>패키지</h3><div class="note" style="margin:-4px 0 8px">룬·신성력 패키지예요. 실제 결제 없이 연습용으로 바로 받아요.</div><div class="packs">' + DATA.packs.map(function (p) {
        var g = p.give, lines = [];
        if (g.runeStone) lines.push(CW.ICO.cur('rune') + ' 룬석 ' + fmt(g.runeStone));
        (g.sigils || []).forEach(function (x) { lines.push('<b style="color:' + hc(x.grade) + '">' + hn(x.grade) + '</b> 신성력 ' + x.n + '개'); });
        if (g.sigilStone) lines.push(CW.ICO.cur('sigil') + ' 신성석 ' + fmt(g.sigilStone));
        return '<div class="pack"><div class="picon">' + mi('pack', p) + '</div><div class="info"><div class="name">' + p.name + (s.packs && s.packs[p.id] ? ' <span class="lv">' + s.packs[p.id] + '번 받음</span>' : '') + '</div><div class="desc">' + lines.join(' · ') + '</div></div><button class="buy gemb" data-pack="' + p.id + '">' + p.won.toLocaleString('ko-KR') + '원</button></div>';
      }).join('') + '</div>';
      var st = s.settings;
      var settings = '<h3>설정</h3><div class="list">' +
        '<div class="row"><div class="info"><div class="name">효과음</div></div><button class="btn" data-set="sound">' + (st.sound ? '켜짐' : '꺼짐') + '</button></div>' +
        '<div class="row"><div class="info"><div class="name">보는 방식</div><div class="desc">도트 느낌은 픽셀 그림처럼 보여요</div></div><button class="btn" data-set="pixel">' + (st.pixel ? '도트 느낌' : '보통 3D') + '</button></div>' +
        '<div class="row"><div class="info"><div class="name">보스 자동 도전</div><div class="desc">끄면 도전 버튼을 눌러야 보스가 나와요</div></div><button class="btn" data-set="autoBoss">' + (st.autoBoss === false ? '꺼짐' : '켜짐') + '</button></div>' +
        '<div class="row"><div class="info"><div class="name">화질</div><div class="desc">버벅이면 낮춰 보세요</div></div><button class="btn" data-set="quality">' + ({ auto: '자동', high: '높음', mid: '보통', low: '낮음' })[st.quality] + '</button></div>' +
        '<div class="row"><div class="info"><div class="name">진행 옮기기</div><div class="desc">다른 기기(아이폰·갤럭시)로 옮길 때: 코드를 복사해서 다른 기기의 "코드 넣기"에 붙여요</div></div><div class="sbtns"><button class="btn" data-act="savecopy">코드 복사</button><button class="btn" data-act="savepaste">코드 넣기</button></div></div>' +
        '<div class="row"><div class="info"><div class="name">처음부터 다시 하기</div><div class="desc">모든 진행이 지워져요</div></div><button class="btn" data-set="reset">다시 하기</button></div>' +
        (G.storageOk() ? '' : '<p class="note">이 브라우저에서는 저장이 안 돼요. 창을 닫으면 진행이 사라져요.</p>') + '</div>';
      var diffs = '<h3>난이도</h3><div class="note" style="margin:-4px 0 8px">10-31 늑대 왕을 이기면 다음 난이도가 열려요. 보스 체력이 엄청 커지고 몬스터가 더 많이 몰려와요.</div><div class="list">' + DATA.difficulties.map(function (df, i) {
        var open = i <= (s.diffUnlocked || 0), now = i === (s.diff || 0);
        return '<div class="row" style="' + (open ? '' : 'opacity:.55') + '"><div class="info"><div class="name">' + df.name + (now ? '<span class="lv">지금</span>' : '') + '</div><div class="desc">보스 체력 ×' + fmt(df.bossMul) + ' · 몬스터 +' + df.extraMobs + '마리 · 다이아 ×' + df.gemMul + '</div></div>' + (now ? '' : '<button class="btn' + (open ? ' pri' : '') + '" data-diff="' + i + '">' + (open ? '도전' : '잠김') + '</button>') + '</div>';
      }).join('') + '</div>';
      var jump = '<div class="jump">' + ['난이도', '전직', '사냥터', '상점', '패키지', '설정'].map(function (t, i) { return '<button data-jump="' + i + '">' + t + '</button>'; }).join('') + '</div>';
      return jump + diffs + tiers + regions + shop + settings;
    }
    var MAP_Y = [0, 0, 2, 26, 25, 32, 59, 59, 71, 100];   // where each region's island sits on the map picture
    function stagePanel() {
      var s = G.state, d = selDiff < 0 ? (s.diff || 0) : selDiff, R = selRegion < 0 ? CW.stageInfo(s.stage).region : selRegion;
      var best = d === (s.diff || 0) ? s.best : ((s.diffBest || {})[d] ? s.diffBest[d].best : -1), frontier = Math.min(309, best + 1), here = d === (s.diff || 0) ? s.stage : -1;
      var st = CW.stats(s), reg = DATA.regions[R], open = d <= (s.diffUnlocked || 0);
      var head = '<div class="dsel"><button class="btn" data-dsel="-1" aria-label="이전 난이도">◀</button><b>' + DATA.difficulties[d].name + (open ? '' : ' (잠김)') + '</b><button class="btn" data-dsel="1" aria-label="다음 난이도">▶</button></div>' +
        '<div class="rsel">' + DATA.regions.map(function (r, i) { return '<button class="rchip' + (i === R ? ' on' : '') + (i * 31 > frontier ? ' lock' : '') + '" data-rsel="' + i + '">' + (i + 1) + '</button>'; }).join('') + '</div>' +
        '<div class="artban ab-map" aria-hidden="true" style="background-position:50% ' + MAP_Y[R] + '%"><b>' + reg.name + '</b></div><div class="note" style="margin:6px 0 8px">판을 누르면 그곳으로 가요</div>';
      var rows = '';
      for (var n = 0; n < 31; n++) {
        var i = R * 31 + n, info = CW.stageInfo(i), lock = !open || i > frontier, tmp = { stage: i, diff: d };
        var res = info.isBoss ? CW.resolveArt(info.isRegionBoss ? reg.boss.art : (reg.miniBoss || reg.monsters[0]), 'boss', R) : CW.resolveArt(reg.monsters[n % 2], 'monster', R);
        var img = G.thumb(res.id), gold = CW.stageGold(tmp) * st.goldMul / 3, xp = CW.killXp(tmp) / 3;
        rows += '<button class="srow' + (i === here ? ' here' : '') + (info.isBoss ? ' boss' : '') + '" data-sgo="' + i + '" data-sd="' + d + '"' + (lock ? ' disabled' : '') + '>' +
          '<span class="sname"><small>' + DATA.difficulties[d].name + '</small>' + CW.stageLabel(i) + (info.isRegionBoss ? ' 전직 시험' : info.isBoss ? ' 보스' : '') + '</span>' +
          '<span class="smon">' + (img ? '<img src="' + img + '" alt="" style="' + (res.tint ? 'filter:hue-rotate(' + (R * 36) + 'deg)' : '') + '">' : '') + '</span>' +
          '<span class="srew"><i class="coin"></i>' + fmt(gold) + '</span><span class="srew"><b class="xpdot"></b>' + fmt(xp) + '</span>' +
          (info.isBoss ? '<span class="srew"><i class="gem"></i>' + fmt(CW.bossGems(i, !(s.firstClear || {})[CW.clearKey({ diff: d }, i)]) * DATA.difficulties[d].gemMul) + '</span>' : '<span class="srew muted">체력 ' + fmt(CW.stageMonsterHp(tmp) / 3) + '</span>') +
          '<span class="sgo">' + (lock ? '🔒' : i === here ? '여기' : '이동') + '</span></button>';
      }
      return head + '<div class="slist">' + rows + '</div>';
    }
    var PANELS = { dungeon: dungeonPanel, stage: stagePanel, up: trainPanel, skill: skillPanel, gear: gearPanel, gacha: gachaPanel, more: morePanel };
    function renderPanel(force) {
      if (tab === 'battle') return;
      var html = PANELS[tab]();
      if (!force && html === lastPanel) return;
      var y = panel.scrollTop; panel.innerHTML = html; panel.scrollTop = y; lastPanel = html;
    }

    // ---------- interactions ----------
    var holdT = null, holdI = null;
    function stopHold() { clearTimeout(holdT); clearInterval(holdI); holdT = holdI = null; }
    panel.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('[data-up],[data-mark],[data-circle],[data-blv],[data-rune],[data-sglv]'); if (!b) return;
      var key = b.dataset.up, mk = b.dataset.mark, ci = b.dataset.circle, bl = b.dataset.blv, ru = b.dataset.rune, sl = b.dataset.sglv;
      var once = function () { var ok = bl ? G.levelUp(bl) : ru ? G.runeUp(ru) : sl ? G.sigilLvUp() : mk ? G.markUp(mk) : ci ? G.circleUp() : (upMul > 1 ? G.upgradeN(key, upMul) : G.upgrade(key)); if (ok) { fxRune = ru || null; renderPanel(true); fxRune = null; hud(); } else stopHold(); };
      once(); holdT = setTimeout(function () { holdI = setInterval(once, 90); }, 380);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { panel.addEventListener(ev, stopHold); });
    panel.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      var d = t.dataset;
      if (d.prev) { G.previewSkill(d.prev); }
      else if (d.sel !== undefined) { selSlot = selSlot === +d.sel ? -1 : +d.sel; renderPanel(true); }
      else if (d.eq) { var at = G.placeSkill(d.eq, selSlot); if (at >= 0) toast(CW.skillById(d.eq).name + ' → ' + (at + 1) + '번 칸'); selSlot = -1; renderPanel(true); slots(); }
      else if (d.out !== undefined || d.unslot !== undefined) { if (!G.unequipSkill(+(d.out !== undefined ? d.out : d.unslot))) toast('스킬은 적어도 1개는 남겨야 해요'); renderPanel(true); slots(); }
      else if (d.mul) { upMul = +d.mul; renderPanel(true); }
      else if (d.tsub) { trainSub = d.tsub; panel.scrollTop = 0; renderPanel(true); }
      else if (d.tal) { selTalent = d.tal; renderPanel(true); }
      else if (d.tup) { if (G.talentUp(d.tup)) toast(CW.talentById(d.tup).name + ' 레벨업!'); else toast(CW.talentSpent(G.state) >= CW.talentPoints(G.state) ? '포인트가 없어요' : '아직 열리지 않았어요'); renderPanel(true); }
      else if (d.act === 'treset') { G.talentReset(); toast('특성을 초기화했어요'); renderPanel(true); }
      else if (d.act === 'rankup') { var rr2 = CW.rankReady(G.state); if (G.rankUp()) toast(DATA.rankConf.names[G.state.rank] + '(으)로 승급!'); else toast(rr2.why === 'marks' ? '모든 징표를 최대로 올려야 해요' : rr2.why === 'level' ? '계정 레벨 ' + rr2.need + '이 필요해요' : rr2.why === 'mana' ? '마력석이 부족해요' : '더 올릴 수 없어요'); renderPanel(true); }
      else if (d.dgo) { var r3 = G.dungeon(d.dgo); if (r3 === 'busy') toast('보스전이나 던전이 끝난 뒤에 들어갈 수 있어요'); else if (r3 === 'ticket') toast('오늘 입장권을 다 썼어요'); }
      else if (d.dsw) { var r4 = G.sweep(d.dsw); if (!r4) toast('입장권이 없거나 아직 기록이 없어요'); else toast('소탕! ' + (r4.gold ? '골드 +' + fmt(r4.gold) : r4.gems ? '다이아 +' + fmt(r4.gems) : r4.runeStone ? '룬석 +' + fmt(r4.runeStone) : '마력석 +' + fmt(r4.mana))); renderPanel(true); hud(); }
      else if (d.jump !== undefined) { var jh = panel.querySelectorAll('h3')[+d.jump]; if (jh) panel.scrollTop += jh.getBoundingClientRect().top - panel.getBoundingClientRect().top - 46; }
      else if (d.gsub) { gearSub = d.gsub; panel.scrollTop = 0; renderPanel(true); }
      else if (d.relic) { var rr = G.summonRelics(+d.relic); if (!rr) toast('다이아가 부족해요'); else { showRelics(rr); renderPanel(true); hud(); } }
      else if (d.cbuy) { if (G.buyCostume(d.cbuy)) toast(CW.costumeById(d.cbuy).name + ' 획득!'); else toast('다이아가 부족해요'); renderPanel(true); hud(); }
      else if (d.cup) { if (G.upCostume(d.cup)) toast(CW.costumeById(d.cup).name + ' Lv.' + G.state.costume.owned[d.cup]); else toast(G.state.costume.owned[d.cup] >= DATA.costumeConf.maxLv ? '최대 레벨이에요' : '다이아가 부족해요'); renderPanel(true); hud(); }
      else if (d.cwear) { if (G.wearCostume(d.cwear)) toast(CW.costumeById(d.cwear).name + '을(를) 입었어요'); renderPanel(true); }
      else if (d.dlv) { if (G.divineUp(d.dlv)) toast('삼신기 레벨업!'); else toast(!CW.divineOpen(G.state) ? DATA.divineConf.unlockTier + '차 전직 후에 열려요' : '골드가 부족해요'); renderPanel(true); hud(); }
      else if (d.dstar) { if (G.starUp(d.dstar)) toast('별이 하나 더 빛나요!'); else toast(!CW.divineOpen(G.state) ? DATA.divineConf.unlockTier + '차 전직 후에 열려요' : !G.state.divine[d.dstar].lv ? '먼저 깨워 주세요' : '신기 조각이 부족해요'); renderPanel(true); }
      else if (d.preset !== undefined) { G.switchPreset(+d.preset); toast((+d.preset + 1) + '번 프리셋으로 바꿨어요'); renderPanel(true); slots(); }
      else if (d.act === 'skillall') { var nn = G.skillUpAll(); toast(nn ? '스킬 ' + nn + '단계 강화!' : '골드가 부족해요'); renderPanel(true); hud(); slots(); }
      else if (d.act === 'autoskill') { G.autoSkills(); toast('가장 센 스킬 4개로 채웠어요'); renderPanel(true); slots(); }
      else if (d.sup) { if (G.skillUp(d.sup)) toast(CW.skillById(d.sup).name + ' +' + CW.skillLevel(G.state, d.sup) + ' 강화!'); else toast(CW.skillLevel(G.state, d.sup) >= DATA.balance.skillMaxLv ? '최대 강화예요' : '골드가 부족해요'); renderPanel(true); hud(); slots(); }
      else if (d.dsel !== undefined) { var nd = ((selDiff < 0 ? (G.state.diff || 0) : selDiff) + +d.dsel + DATA.difficulties.length) % DATA.difficulties.length; selDiff = nd; selRegion = 0; renderPanel(true); }
      else if (d.rsel !== undefined) { selRegion = +d.rsel; renderPanel(true); }
      else if (d.sgo !== undefined) { if (G.goStageIn(+d.sd, +d.sgo)) { toast(CW.stageLabel(+d.sgo) + '(으)로 이동했어요'); selDiff = selRegion = -1; openTab('battle'); } }
      else if (d.diff !== undefined) { var dd = +d.diff; if (dd > G.state.diffUnlocked) toast('앞 난이도의 10-31 늑대 왕을 이기면 열려요'); else confirmBox(DATA.difficulties[dd].name + ' 난이도', '이 난이도의 진행으로 옮길까요? 다른 난이도의 진행은 그대로 남아요.', '옮기기', function () { G.setDifficulty(dd); renderPanel(true); hud(); }); }
      else if (d.bkind) { bagKind = d.bkind; selKey = null; renderPanel(true); }
      else if (d.btr) { var eb = G.state.bag[d.btr]; if (G.transcend(d.btr)) { toast(CW.gearName(d.btr) + ' 초월 ★' + G.state.bag[d.btr].star + '!'); banner('초월 성공!'); } else toast(!eb ? '아직 없는 장비예요' : (eb.star || 0) >= DATA.bagConf.starMax ? '이미 최고 초월이에요' : eb.lv < CW.maxLevel(d.btr, eb.star) ? '최대 레벨까지 올려야 해요' : eb.n <= CW.transcendCost(G.state, d.btr).copies ? '같은 장비가 더 필요해요' : '골드가 부족해요'); renderPanel(true); hud(); }
      else if (d.brew) { if (G.brew(d.brew)) toast(CW.potionById(d.brew).name + '을(를) 만들었어요!'); else toast('골드가 부족해요'); renderPanel(true); hud(); }
      else if (d.rpick) { selRune = d.rpick; renderPanel(true); }
      else if (d.rgrade) { var rg2 = CW.runeGrade(G.state, d.rgrade); if (G.runeGradeUp(d.rgrade)) { toast(CW.runeById(d.rgrade).name + ' → ' + hn(rg2 + 1) + '!'); banner(hn(rg2 + 1) + ' 룬!'); } else toast('룬석이 부족해요'); fxRune = d.rgrade; renderPanel(true); fxRune = null; }
      else if (d.pack) { var pk = CW.packById(d.pack); confirmBox('연습용 구매', pk.name + ' (' + pk.won.toLocaleString('ko-KR') + '원)<br><b>실제 결제 없음 · 연습용</b><br>누르면 바로 들어와요.', '받기', function () { var got = G.buyPack(d.pack); if (got === false) toast('신성력 가방에 자리가 부족해요 (최대 ' + DATA.sigilConf.cap + '개)'); else if (got.length) showSigils(got, true); else toast(pk.name + '을(를) 받았어요'); renderPanel(true); hud(); }); }
      else if (d.sg) { selSigil = selSigil === d.sg ? null : d.sg; renderPanel(true); }
      else if (d.sgset !== undefined) { G.sigilSet(+d.sgset); toast((+d.sgset + 1) + '번 신성력 세트'); renderPanel(true); }
      else if (d.sgf !== undefined) { sgFilter = +d.sgf; renderPanel(true); }
      else if (d.sgeq) { var r5 = G.sigilEquipToggle(d.sgeq); if (r5 === 'full') toast('슬롯이 꽉 찼어요. 신성력 레벨을 올리면 늘어요'); renderPanel(true); }
      else if (d.sglock) { G.sigilLock(d.sglock); renderPanel(true); }
      else if (d.sgdis) { var n5 = G.sigilDismantle(d.sgdis); toast(n5 ? '신성석 +' + n5 : '잠금했거나 장착 중인 건 분해할 수 없어요'); renderPanel(true); }
      else if (d.sgfuse) { var f5 = G.sigilFuse(d.sgfuse); if (f5) { selSigil = f5.id; toast(hn(f5.grade) + ' 신성력 획득!'); } else toast('잠금·장착하지 않은 같은 등급 3개가 필요해요'); renderPanel(true); }
      else if (d.sgsum) { var g5 = G.sigilSummon(+d.sgsum); if (!g5) toast('다이아가 부족하거나 가방이 꽉 찼어요'); else { showSigils(g5); renderPanel(true); hud(); } }
      else if (d.act === 'sgbest') { G.sigilEquipBest(); toast('가장 좋은 신성력으로 장착했어요'); renderPanel(true); }
      else if (d.act === 'sgdisall') { confirmBox('모두 분해', '잠금하지 않고 장착하지 않은 신성력을 모두 신성석으로 바꿀까요?', '분해하기', function () { var n6 = G.sigilDismantleAll(); toast(n6 ? '신성석 +' + fmt(n6) : '분해할 신성력이 없어요'); renderPanel(true); }); }
      else if (d.bkey) { selKey = d.bkey; renderPanel(true); }
      else if (d.bmerge) { if (G.merge(d.bmerge)) toast(CW.gearName(CW.keyOf(CW.parseKey(d.bmerge).kind, CW.parseKey(d.bmerge).t + 1)) + ' 획득!'); else toast('같은 장비 ' + DATA.bagConf.mergeCount + '개가 필요해요'); renderPanel(true); }
      else if (d.bequip) { if (G.equipKey(d.bequip)) toast(CW.gearName(d.bequip) + ' 장착'); else toast('아직 없는 장비예요'); renderPanel(true); }
      else if (d.bpot) { if (!G.state.bag[d.bpot]) toast('아직 없는 장비예요'); else if (G.rollPotential(d.bpot)) toast('잠재력이 바뀌었어요'); else toast('다이아가 부족해요'); renderPanel(true); hud(); }
      else if (d.act === 'best') { G.equipBest(); toast('가장 높은 장비로 장착했어요'); renderPanel(true); }
      else if (d.act === 'merge') { var n = G.mergeAll(); toast(n ? '장비 ' + n + '개를 합성했어요' : '합성할 장비가 없어요'); renderPanel(true); }
      else if (d.pull) { var n2 = +d.pull, items = G.pull(n2); if (!items) toast('다이아가 부족해요'); else { showGacha(items); renderPanel(true); hud(); } }
      else if (d.shop !== undefined) { var p = DATA.shop[+d.shop]; confirmBox('연습용 구매', p.name + ' (' + p.won.toLocaleString('ko-KR') + '원)<br><b>실제 결제 없음 · 연습용</b><br>누르면 다이아가 바로 들어와요.', '받기', function () { var g = G.buy(+d.shop); toast('다이아 ' + fmt(g) + '개를 받았어요'); renderPanel(true); hud(); }); }
      else if (d.go !== undefined) { if (G.goStage(+d.go)) { toast(CW.stageLabel(+d.go) + '(으)로 이동했어요'); renderPanel(true); } }
      else if (d.act === 'savecopy') {
        var code = G.exportSave(), done = function () { toast('저장 코드를 복사했어요. 다른 기기에서 "코드 넣기"에 붙여 주세요'); };
        var show = function () { modal('<h2>저장 코드</h2><p class="note">아래 글자를 전부 길게 눌러 복사해 주세요.</p><textarea class="codebox" readonly>' + code + '</textarea>', [{ label: '닫기', pri: true }]); var ta = $('modalCard').querySelector('textarea'); ta.focus(); ta.select(); };
        try { navigator.clipboard.writeText(code).then(done, show); } catch (err) { show(); }
      }
      else if (d.act === 'savepaste') {
        modal('<h2>저장 코드 넣기</h2><p class="note">다른 기기에서 복사한 코드를 붙여 넣으세요. 지금 이 기기의 진행은 코드의 진행으로 바뀌어요.</p><textarea class="codebox" placeholder="CW1:로 시작하는 코드"></textarea>',
          [{ label: '취소' }, { label: '불러오기', pri: true, fn: function () { var v = $('modalCard').querySelector('textarea').value; if (G.importSave(v)) toast('진행을 불러왔어요'); else toast('코드가 맞지 않아요. 처음부터 끝까지 다 복사했는지 확인해 주세요'); } }]);
      }
      else if (d.set) {
        var st = G.state.settings;
        if (d.set === 'sound') G.setSetting('sound', !st.sound);
        if (d.set === 'pixel') G.setSetting('pixel', !st.pixel);
        if (d.set === 'autoBoss') G.setSetting('autoBoss', st.autoBoss === false);
        if (d.set === 'quality') G.setSetting('quality', { auto: 'high', high: 'mid', mid: 'low', low: 'auto' }[st.quality]);
        if (d.set === 'reset') confirmBox('처음부터 다시 하기', '정말 모든 진행을 지울까요? 되돌릴 수 없어요.', '지우기', function () { confirmBox('한 번 더 확인', '진행, 장비, 다이아가 모두 사라져요.', '정말 지우기', G.reset); });
        renderPanel(true);
      }
    });
    CW.ICO.onTint = function () { if (tab === 'gear' || tab === 'gacha') renderPanel(true); };
    document.querySelectorAll('#tabs [data-tab]').forEach(function (b) { var x = CW.ICO.misc && CW.ICO.misc('tab', b.dataset.tab), sv = b.querySelector('svg'); if (x && sv) sv.outerHTML = x; });
    var QI = { map: CW.ICO.misc('quick', 'map'), alch: CW.ICO.misc('potion', 'rage'), rune: CW.ICO.cur('rune'), sigil: CW.ICO.cur('sigil') };
    document.querySelectorAll('#quick [data-quick]').forEach(function (b) { b.querySelector('i').innerHTML = QI[b.dataset.quick] || ''; });
    $('quick').addEventListener('click', function (e) {
      var b = e.target.closest('[data-quick]'); if (!b) return; var q = b.dataset.quick; G.sound('click');
      if (q === 'map') { selDiff = selRegion = -1; openTab(tab === 'stage' ? 'battle' : 'stage'); }
      else if (q === 'alch') { trainSub = 'alch'; openTab('up'); }
      else { gearSub = q; openTab('gear'); }
    });
    $('pre').addEventListener('click', function (e) { var b = e.target.closest('[data-pre]'); if (!b) return; G.switchPreset(+b.dataset.pre); G.sound('click'); toast((+b.dataset.pre + 1) + '번 프리셋으로 바꿨어요'); slots(); if (tab === 'skill') renderPanel(true); });
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
      modal('<h2>돌아왔어요!</h2><p>' + Math.floor(r.seconds / 3600) + '시간 ' + Math.floor(r.seconds % 3600 / 60) + '분 동안 냥법사가 모은 것' + (r.seconds >= DATA.balance.offlineCapSec ? ' (최대 8시간)' : '') + '</p><div class="big"><i class="coin"></i>' + fmt(r.gold) + '</div>' + (r.xp ? '<p>경험치 +' + fmt(r.xp) + (r.levels ? ' · 레벨 ' + r.levels + ' 올랐어요' : '') + '</p>' : '') + (r.gems ? '<div class="big" style="color:var(--gem)"><i class="gem"></i>' + fmt(r.gems) + '</div>' : ''), [{ label: '받기', pri: true, fn: onClose }]);
    }
    function showTierUp(tier, skill) {
      var t = DATA.tiers[tier - 1];
      $('flashbg').classList.remove('go'); void $('flashbg').offsetWidth; $('flashbg').classList.add('go');
      modal('<h2 style="color:var(--gold)">' + tier + '차 전직!</h2><div class="big">' + t.name + '</div>' + (skill ? '<p>새 스킬 <b style="color:#fff">' + skill.name + '</b>을(를) 얻었어요. 스킬 칸에 넣어 두었어요.</p>' : '') + '<p>끼워 둔 스킬이 더 화려해져요.</p>', [{ label: '좋아요', pri: true }]);
    }
    function showGacha(items) {
      var fx = $('gachaFx'), best = Math.max.apply(null, items.map(function (i) { return i.grade; }));
      fx.hidden = false; fx.innerHTML = '<div class="circle"></div><div class="note">마법진이 장비를 부르는 중…</div><button class="btn" id="gSkip">건너뛰기</button>';
      G.sound('pull');
      var done = false;
      function showCards() {
        if (done) return; done = true;
        if (best >= 4) { $('flashbg').classList.remove('go'); void $('flashbg').offsetWidth; $('flashbg').classList.add('go'); G.sound('legend'); }
        var shown = items.slice().sort(function (a, b) { return b.grade - a.grade; });
        var hero = best >= 4 ? '<div class="reveal" style="color:' + gc(best) + '">' + DATA.grades[best].name + '!</div>' : '';
        fx.innerHTML = hero + '<div class="cards">' + shown.map(function (it, i) { return '<div class="gcard" style="--gc:' + gc(it.grade) + ';animation-delay:' + Math.min(i * 0.04, 1.2) + 's">' + gearArt(it.kind, it.grade, it.sub) + '<small>' + DATA.grades[it.grade].name + ' ' + CW.roman(it.sub || 0) + '</small></div>'; }).join('') + '</div><div class="btns" style="width:min(420px,100%)"><button class="btn" id="gClose">닫기</button><button class="btn pri" id="gAgain">한 번 더 (' + items.length + '회)</button></div>';
        $('gClose').onclick = function () { fx.hidden = true; };
        $('gAgain').onclick = function () { var more = G.pull(items.length); if (!more) { toast('다이아가 부족해요'); return; } showGacha(more); renderPanel(true); hud(); };
      }
      $('gSkip').onclick = showCards; setTimeout(showCards, best >= 4 ? 1400 : 900);
    }

    var logLines = [];
    function gainLog(g) {
      var add = [];
      if (g.gold > 0) add.push('<i class="coin"></i>골드 +' + fmt(g.gold));
      if (g.xp > 0) add.push('<b class="xpdot"></b>경험치 +' + fmt(g.xp));
      if (g.gems > 0) add.push('<i class="gem"></i>다이아 +' + fmt(g.gems));
      (g.more || []).forEach(function (m) { add.push('<b class="xpdot" style="background:' + m.c + '"></b>' + m.t); });
      if (!add.length) return;
      logLines = add.concat(logLines).slice(0, Math.max(4, add.length));
      $('gainlog').innerHTML = logLines.map(function (l, i) { return '<div style="opacity:' + Math.max(0.4, 1 - i * 0.15) + '">' + l + '</div>'; }).join('');
    }
    return { chain: chain, dunHud: dunHud, gainLog: gainLog, openTab: openTab, hud: hud, slots: slots, renderPanel: renderPanel, toast: toast, banner: banner, showOffline: showOffline, showTierUp: showTierUp, showGacha: showGacha, modal: modal, currentTab: function () { return tab; } };
  }
  CW.createUI = createUI;
})(this);
