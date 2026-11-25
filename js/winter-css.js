// 겨울 테마 CSS (2026-11-25, 형: 누구는 성운 누구는 겨울 → 밝은 메뉴는 서리 흰빛 → 전투에도 눈).
// 규칙은 전부 html.tw 아래 — 성운을 고른 화면은 한 줄도 안 바뀜 (tests/winter-theme.test.cjs 가 확인).
// 오팔 메뉴 CSS(ui-opal.js·opal-rune-sigil.js·opal-divine.js) 뒤에 읽혀 같은 세기면 이쪽이 이기고, 원래 규칙이 !important 면 이쪽도 !important.
// 설계: docs/superpowers/specs/2026-11-25-winter-theme-design.md, 계획: docs/superpowers/plans/2026-11-25-winter-theme.md
(function (root) {
  var TH = typeof module !== 'undefined' && module.exports ? require('./theme.js').theme : root.CW.theme, NEB_ART = TH.NEB_ART;
  // 서리·눈이 없는 실내 배경: 무한의 탑 방·던전 원정(앞머리) + 실내 하늘 지역(js/theme.js INDOOR)
  var INDOOR_SEL = ['[data-backdrop^="bg-tower-"]', '[data-backdrop^="expedition-"]'].concat(TH.INDOOR.map(function (b) { return '[data-backdrop="' + b + '"]'; })).join(',');
  // 겨울 유리 색: 성운의 보라 반투명(rgba(40,24,96)·rgba(26,16,70)·#2a2160 …) → 얼음빛 남색
  var TOP = 'rgba(16,40,92,', BOT = 'rgba(8,24,62,', BASE = '#16305e';
  var HUDBG = 'radial-gradient(70% 110% at 12% 10%,rgba(170,230,255,.24),transparent 55%),radial-gradient(70% 120% at 92% 90%,rgba(110,170,255,.28),transparent 55%),' +
    'linear-gradient(180deg,rgba(26,64,140,.58),rgba(10,28,72,.8)),var(--nb-mn-neb-fill) 30% 72%/420px auto';
  var HUD = ['.nh-pl::after', '.nh-cur::after', '.nh-head::after', '.nh-no::after', '.nh-map::after', '.nh-power::after'].map(function (s) { return 'html.tw #hud.nh ' + s; }).join(',');
  var CSS = [
    // 성운 그림 18장 → 겨울판 (tools/make-winter-art.py, 같은 크기·같은 투명 모양)
    'html.tw{' + Object.keys(NEB_ART).map(function (n) { return '--nb-' + n + ':url(art/w-' + n + '.webp)'; }).join(';') + '}',

    // ---- 어두운 창: 얼음빛 남색 유리, 흰 글씨 그대로 ----
    // 아래 탭 줄 (index.html #tabs·.tabneb, 가로 화면 기둥 포함): 성운처럼 탭 줄 자체는 진한 한 겹(rgba(22,13,56,.92) → 남색), 그림은 .tabneb 판
    // — 그림을 받기 전에도 전투 화면이 비쳐 보이지 않게 (전체 검사 2026-11-25)
    'html.tw #tabs{background:rgba(12,28,64,.92)}',
    'html.tw #tabs{box-shadow:0 -1px 0 rgba(255,255,255,.4),0 -8px 22px rgba(10,30,80,.35)}',
    'html.tw #tabs>.tabneb{background:linear-gradient(180deg,' + TOP + '.22),' + BOT + '.45)),var(--nb-mn-neb-fill) 0 72%/100% auto}',
    '@media (orientation:landscape) and (min-aspect-ratio:6/5){html.tw #tabs{background:rgba(12,28,64,.92)!important}' +
      'html.tw #tabs>.tabneb{background:linear-gradient(270deg,' + TOP + '.22),' + BOT + '.45)),var(--nb-mn-neb-fill) 50% 0/auto 100%}}',
    // 위쪽 HUD 칸·보스 칸
    HUD + '{background:' + HUDBG + ';background-color:' + BASE + '}',
    'html.tw #hud.nh #bossbox{background:' + HUDBG + ';background-color:' + BASE + ';box-shadow:inset 0 0 0 1.5px var(--gd),0 4px 8px rgba(8,22,60,.45)}',
    // 뽑기·던전·더보기, 스테이지 선택, 가이드, 전직 축하, 필드 요약
    'html.tw #sheet.cream.neb{background:linear-gradient(180deg,rgba(14,36,84,.36),rgba(8,22,58,.6)),var(--nb-mn-neb-fill) 50% 40%/cover;background-color:' + BASE + ';box-shadow:0 -6px 22px rgba(6,18,48,.45),inset 0 1.5px 0 rgba(255,255,255,.2)}',
    'html.tw #sheet.cream.stg{background:linear-gradient(180deg,rgba(14,36,84,.18),rgba(8,22,58,.3)),var(--nb-ui-stage-bg) 50% 0/cover;background-color:' + BASE + '}',
    'html.tw #modalCard.guide-card{background:linear-gradient(180deg,rgba(18,44,100,.48),rgba(8,24,60,.72)),var(--nb-mn-neb-fill) 50% 35%/cover;background-color:' + BASE + ';box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.3),inset 0 1.5px 0 rgba(255,255,255,.35),0 18px 48px rgba(6,16,44,.6)}',
    'html.tw #tierfx .tf-bg{background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--tc) 30%,transparent),transparent 55%),linear-gradient(180deg,rgba(10,26,62,.93),rgba(6,14,36,.96)),var(--nb-mn-neb-fill) 50% 40%/cover}',
    'html.tw #fieldSummary{background:linear-gradient(125deg,#1d3a66ed,#132a52ef),var(--nb-mn-neb-fill) center/cover;box-shadow:0 4px 16px #0a1a3488}',
    // 뽑기·더보기 안쪽: 분홍·라일락 강조 → 얼음 하늘색·민트
    'html.tw #sheet.cream.neb #panel h3::before{background:linear-gradient(#cdeeff,#9cc8ff)}',
    'html.tw #sheet.cream.neb .gchest::before{background:radial-gradient(closest-side,rgba(230,246,255,.75),rgba(150,200,255,.3) 60%,transparent)}',
    'html.tw #sheet.cream.neb #panel .gacha-head.ghd.gh2 .lvl{background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.95),rgba(215,235,255,.8) 60%,rgba(175,210,250,.75))}',
    'html.tw #sheet.cream.neb #panel .pulls .pull.huge{background:linear-gradient(110deg,rgba(170,225,255,.3),rgba(150,190,255,.28) 45%,rgba(150,235,230,.28));box-shadow:inset 0 0 0 1.5px rgba(210,235,255,.75),0 4px 14px -6px rgba(140,190,255,.7)}',
    'html.tw #sheet.cream.neb #panel :is(.dung,.tjob,.prod,.pack,.notice,.row,.guide-summary){background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,.05)),rgba(8,24,60,.42)}',
    'html.tw #sheet.cream.neb #panel .tjob.st-now{background:linear-gradient(115deg,rgba(170,225,255,.3),rgba(150,190,255,.26) 55%,rgba(150,235,230,.24)),rgba(8,24,60,.38);box-shadow:inset 0 0 0 2px rgba(210,235,255,.8),0 0 0 3px rgba(170,210,245,.25),0 6px 14px -6px rgba(60,110,190,.6)}',

    // 전투 화면 버튼 (형 2026-11-25 "여기는 그대로인데?"): 오른쪽 바로가기(이벤트·펫·미션·도감·가방·우편함·공지·방치), 목표 줄·버프, 아래 스킬 칸 4개 — 금테는 그대로
    'html.tw #app #quick button{background:radial-gradient(ellipse at 32% 8%,rgba(230,245,255,.26),transparent 55%) padding-box,linear-gradient(155deg,#3d6aa8df,#24477fe3 55%,#16305eea) padding-box,' +
      'linear-gradient(145deg,#fff1cb 2%,#cf9b59 24%,#775033 47%,#f5d49b 72%,#886144 96%) border-box;box-shadow:inset 0 1px 1px #f2fbff45,inset 0 -2px 2px #0b1a3a75,0 2px 3px #0f1f3a66}',
    'html.tw #quest,html.tw #buffs span{background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 45%),linear-gradient(180deg,rgba(30,74,150,.62),rgba(12,32,84,.74));box-shadow:inset 0 0 0 1.5px rgba(220,184,108,.85),0 0 0 1px rgba(8,22,60,.3),0 3px 8px rgba(8,22,60,.35)}',
    'html.tw #slots .sk,html.tw #slots .sk.empty{background:radial-gradient(circle at 50% 30%,rgba(120,180,240,.42),rgba(14,40,100,.55) 75%)!important;box-shadow:0 0 0 1.5px rgba(220,184,108,.9),inset 0 1px 0 rgba(255,255,255,.35),0 3px 8px rgba(8,22,60,.35)!important}',
    'html.tw #slots .sk b{background:linear-gradient(180deg,#2f5fa8,#14306a)!important}',
    'html.tw #hud.nh #retry{background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,0) 50%),radial-gradient(80% 120% at 20% 10%,rgba(170,230,255,.4),transparent 60%),linear-gradient(180deg,#2f63b8,#14316e);box-shadow:inset 0 0 0 1.5px #f0d48c,0 0 0 1px rgba(8,22,60,.35),0 3px 8px rgba(8,22,60,.4)}',   // 보스 도전
    'html.tw #hud.nh #retry::after{box-shadow:inset 0 0 0 1.5px #fff0bf,0 0 16px rgba(150,210,255,.75)}',
    'html.tw #pre button:not([aria-pressed=true]){background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 45%),linear-gradient(180deg,rgba(30,74,150,.62),rgba(12,32,84,.74))}',   // 고른 프리셋은 금색 그대로
    'html.tw #tabs button[data-tab="dungeon"]:not([aria-selected=true])::after{background:radial-gradient(circle,rgba(220,240,255,.95),rgba(160,210,255,.5) 40%,transparent 70%)}',   // 던전 탭 빛

    // 스킬 탭(ui-opal.js 「달빛 정원」 밤 유리, 자두빛 #242030) → 겨울 밤 남색 (형 "여기도 이상하게": 위 스킬 칸 판·고른 버튼까지)
    'html.tw #sheet.opal#sheet.opal .skpin{background:#17233c!important}',
    'html.tw #sheet.opal#sheet.opal .skpin::after{background:linear-gradient(#17233c,rgba(23,35,60,0))!important}',
    'html.tw #sheet.opal#sheet.opal .skbox{background:linear-gradient(180deg,rgba(44,72,120,.55),rgba(26,44,80,.55))!important;box-shadow:inset 0 0 0 1px rgba(200,225,255,.2),inset 0 1px 0 rgba(255,255,255,.12),0 4px 12px rgba(4,12,30,.4)!important}',
    'html.tw #sheet.opal#sheet.opal .skbox::after{background:radial-gradient(50% 50% at 50% 50%,rgba(180,220,255,.35),rgba(180,220,255,0) 70%)!important}',
    'html.tw #sheet.opal#sheet.opal .skc3{background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.26),rgba(255,255,255,.05) 34%,rgba(255,255,255,0) 52%),radial-gradient(circle at 50% 58%,rgba(22,36,64,.2),rgba(14,24,46,.7) 72%)!important}',
    'html.tw #sheet.opal#sheet.opal .skx3{background:linear-gradient(180deg,#4f6f9c,#34507a)!important}',
    'html.tw #sheet.opal#sheet.opal .sksec::after{background:linear-gradient(90deg,rgba(200,230,255,.28),rgba(200,230,255,0))!important}',
    'html.tw #sheet.opal#sheet.opal :is(.skfoot .pb.on,.skchip.on),html.tw #sheet.opal#sheet.opal #dock .skdk-btns .up{background:linear-gradient(180deg,#a8d8f2,#6fa3d6)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4),0 0 10px rgba(130,190,255,.5)!important}',
    'html.tw #sheet.opal.sktab{background:radial-gradient(90% 30% at 70% 8%,rgba(120,190,240,.2),rgba(120,190,240,0) 70%),radial-gradient(80% 30% at 0% 60%,rgba(90,150,220,.12),rgba(90,150,220,0) 70%),linear-gradient(180deg,#17233c 0%,#152036 45%,#1b2a46 100%)!important;box-shadow:0 -10px 26px rgba(4,12,30,.5),inset 0 0 0 1px rgba(200,225,255,.14)!important}',
    'html.tw #sheet.opal.sktab #dock,html.tw #sheet.opal.sktab #dock .dockbox{background:#1b2a46}',
    'html.tw #sheet.opal.sktab #sheetClose{box-shadow:inset 0 0 0 1px rgba(200,225,255,.3)!important}',

    // ---- 밝은 진주빛 메뉴(훈련·장비·코스튬 …): 형이 고른 서리 흰빛 — 연보라·분홍만 얼음 하늘색, 진한 글씨 그대로 ----
    'html.tw #sheet.opal{--opal-bg:#f2f7fc;--opal-rose:#e4f1fb;--opal-lilac:#d4e5f5;--opal-line:#d0dcea}',
    'html.tw #sheet.opal:not(.sktab){background:none,radial-gradient(60% 40% at 50% 45%,#eaf4fc,transparent 80%),linear-gradient(180deg,#d9e7f3 0%,#e2edf7 40%,#e6f0f9 100%)!important;background-color:#e6eff8!important}',
    // 성장 화면: ui-opal.js 의 #sheet.opal:has(#panel .row.grow) 가 (:has 안 #panel 때문에) 위 규칙보다 세서 연보라 바탕이 남았음 → 같은 모양으로 덮음
    'html.tw #sheet.opal:has(#panel .row.grow){background:var(--nb-gp-neb) 50% 0/100% auto no-repeat,linear-gradient(180deg,#e2edf7,#e6f0f9)!important}',

    // ---- 메뉴 눈 (js/theme.js mountSnow → <i class="wsn"><i class="wsn-f"></i><i class="wsn-n"></i></i>) ----
    // 눈 타일 판 두 겹(tools/make-snow-tiles.py)을 판째로 아래로 미끄러뜨림: transform 만 바뀌어 다시 칠하지 않음, 누르기는 그대로 통과
    'html.tw .wsn{display:block;position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit;z-index:-1}',
    'html.tw .wsn>i{position:absolute;left:0;right:0;bottom:0;will-change:transform;animation-timing-function:linear;animation-iteration-count:infinite}',
    'html.tw .wsn-f{top:-256px;background:url(art/snow-far.webp) 0 0/256px 256px repeat;opacity:.75;animation-name:wsnFar;animation-duration:16s}',
    'html.tw .wsn-n{top:-512px;background:url(art/snow-near.webp) 37px 0/512px 512px repeat;opacity:.9;animation-name:wsnNear;animation-duration:12s}',
    '@keyframes wsnFar{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,256px,0)}}',
    '@keyframes wsnNear{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,512px,0)}}',
    'html.tw.cw-calm .wsn>i{animation-play-state:paused}',
    '@media (prefers-reduced-motion:reduce){html.tw .wsn-f{animation-duration:40s}html.tw .wsn-n{animation-duration:30s}}',
    // 메뉴 창: 닫혀 있으면 눈도 쉼. 어두운 창은 창 바탕 위·글씨와 칸 아래(z-index:-1, #sheet 가 쌓임 맥락)
    'html.tw #sheet:not(.on)>.wsn{display:none}',
    // 밝은 진주빛 메뉴: 흰 바탕에서는 흰 눈이 안 보이고 전시 창 그림이 눈을 가리므로, 위쪽 띠에서만 내용 위로 옅게 내리고 아래로 사라지게
    'html.tw #sheet.opal:not(.sktab)>.wsn{z-index:3;bottom:auto;height:var(--wsn-band,300px);opacity:.85;-webkit-mask:linear-gradient(#000 60%,transparent);mask:linear-gradient(#000 60%,transparent)}',
    // 아래 탭 줄: 성운 판(.tabneb, z-index 0) 위, 탭 버튼(z-index 2) 아래
    'html.tw #tabs>.wsn{z-index:1}',

    // ---- 미션 창(일일·업적은 보라 → 겨울 남색, 주간 붉은 판은 그대로)·펫 화면 카드·공지 제목 칸 (형 "부족한 점은 또 뭐가 있을까?" 때 찾음) ----
    'html.tw #goalpage .gpcol:not(.week):not(.ach){--row:rgba(30,60,110,.62);--rowb:rgba(170,215,250,.22);--fill:#9fd2f2;--tab:#7fb4e4;--tabb:#c4e4fa;' +
      'background:radial-gradient(70% 40% at 50% 26%,rgba(110,180,240,.32),rgba(110,180,240,0) 70%),linear-gradient(180deg,#17294a 0,#142440 60%,#111f38 100%)}',
    'html.tw #goalpage .gpcol.ach{--row:rgba(30,56,100,.62);background:radial-gradient(70% 40% at 50% 26%,rgba(240,190,90,.22),rgba(240,190,90,0) 70%),linear-gradient(180deg,#17294a 0,#142440 60%,#111f38 100%)}',
    'html.tw #petpage .ppstage{background:rgba(14,40,90,.3)}',
    'html.tw #petpage .ppeff div,html.tw #petpage .ppskill,html.tw #petpage .ppegg{background:rgba(14,40,90,.42)}',
    'html.tw #noticebox .nzhead{background:linear-gradient(100deg,#d4ecff 0%,#dfe8ff 55%,#b8e4ff 100%)}',
    // 설정 › 테마 그림 카드: 겨울에선 고른 쪽 테두리·알약을 얼음빛으로
    'html.tw #sheet#sheet #panel .thpick .thc.on::after{box-shadow:inset 0 0 0 2.5px #bfe9ff,inset 0 0 16px rgba(170,225,255,.4)}',
    'html.tw #sheet#sheet #panel .thpick .thon{background:linear-gradient(180deg,#ffffff,#c6ecff);color:#0e2e5a}',

    // ---- 전투 바닥 서리 (형 "바닥 서리 효과", tools/make-frost-frame.py): 지역 그림 위·캐릭터 아래, 움직이지 않음, 실내는 없음 ----
    'html.tw .stagebg>.wfrost{display:block;position:absolute;inset:0;background:url(art/frost-frame.webp) 50% 50%/100% 100% no-repeat;pointer-events:none}',
    '@media (orientation:landscape) and (min-aspect-ratio:6/5){html.tw .stagebg>.wfrost{background-image:url(art/frost-frame-land.webp)}}',
    'html.tw .stagebg:is(' + INDOOR_SEL + ')>.wfrost{display:none}',
    // ---- 아래 탭 줄 윗변에 얹은 눈 더미 (형이 그려 준 그림 art/snow-cap.webp, 세 덩이) ----
    // 탭 줄은 옆으로 흐르는 성운 판 때문에 넘치는 것을 자름 → 세로 화면 겨울에서만 위쪽 12px 만 보이게 열어 눈 더미가 윗변 위로 살짝 올라옴
    // 형 실제 아이폰 (2026-11-25 "눈쌓인거 스킬에 살짝 가려서"): 스킬 칸과 탭 줄 사이 틈이 10px(390×844 실측)이라 위로는 8px 까지만,
    // 눈 더미는 조금 납작하게(가로 104~116px·세로 13~14px) 해서 탭 줄 윗변에 얹힘
    'html.tw #tabs{overflow:visible;clip-path:inset(-12px 0 0 0)}',
    'html.tw #tabs>.wcap{display:block;position:absolute;left:0;right:0;top:-8px;height:15px;z-index:3;pointer-events:none;' +
      'background:url(art/snow-cap.webp) 3% 100%/104px 13px no-repeat,url(art/snow-cap.webp) 50% 100%/116px 14px no-repeat,url(art/snow-cap.webp) 97% 100%/104px 13px no-repeat}',
    // 가로 화면은 탭 줄이 오른쪽 세로 기둥이라 눈 더미 없음, 자르기도 원래대로
    '@media (orientation:landscape) and (min-aspect-ratio:6/5){html.tw #tabs{overflow:hidden;clip-path:none}html.tw #tabs>.wcap{display:none}}',

    // ---- 펫 화면(어두운 남색 덮개)·펫도감(서리 흰빛 덮개) ----
    'html.tw #petpage .ppcol{background:linear-gradient(180deg,rgba(8,24,60,.18) 0,rgba(10,28,68,.42) 300px,rgba(10,28,68,.5) 100%),var(--nb-bg-galaxy) center top/cover no-repeat,' + BASE + ';box-shadow:0 0 30px rgba(4,12,30,.5)}',
    'html.tw #petdex{background:#dce8f4}',
    'html.tw #petdex .pdcol{background:linear-gradient(180deg,rgba(226,238,250,.58) 0,rgba(226,238,250,.7) 120px,rgba(220,232,246,.94) 250px,#dce8f4 420px),var(--nb-bg-galaxy) center top/100% auto no-repeat,#dce8f4;box-shadow:0 0 30px rgba(30,60,100,.25)}'
  ].join('\n');
  if (typeof module !== 'undefined' && module.exports) { module.exports = { WINTER_CSS: CSS }; return; }
  var doc = root.document, st = doc.createElement('style'); st.id = 'cw-winter'; st.textContent = CSS;
  (doc.head || doc.documentElement).appendChild(st);
})(this);
