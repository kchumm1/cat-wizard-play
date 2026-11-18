// 오팔 연구소 메뉴 (2026-11-16, 사용자 시안 cat-wizard-opal): 우윳빛 세라믹 + 오팔 유리 + 밝은 성운색.
// 훈련·장비·스킬 시트(#sheet.opal, ui.js openTab)에만 입힌다. 두 가지를 담는다.
//  1. 공통 재질 CSS (아래 CSS 문자열, 페이지에 한 번 붙임)
//  2. 메뉴 안의 작은 입체 장치: WebGLRenderer 하나를 계속 쓰고(전투 렌더러와 별개), 지금 열린 패널의 장치만 그린다.
//     ui.js가 패널을 innerHTML로 다시 그릴 때마다 mount(host, kind, vm)로 같은 캔버스를 새 자리로 옮긴다.
//     고리 각도는 시계(performance.now)로 정해서 다시 그려도 0으로 돌아가지 않는다.
//     안 보이면(시트 닫힘·다른 탭·화면 밖·document.hidden) 프레임 루프를 멈추고, 오래 안 쓰면 GPU 자원을 정리한다.
(function (root) {
  var CW = root.CW = root.CW || {};
  var doc = root.document;

  // ---------- 1. 공통 재질 ----------
  var CSS = [
    // 토큰 (작업지시서 4장). 큰 면적은 진주색·세라믹, 성운색은 장치 안쪽·유리 가장자리·선택 강조에만.
    '#sheet.opal{--opal-bg:#f6f7fc;--opal-surface:#fff;--opal-ink:#30364d;--opal-muted:#606980;--opal-line:#d6ddec;--opal-blue:#e2f1ff;--opal-rose:#f8eaf4;--opal-mint:#bceae1;--opal-lilac:#d9d6f4;--opal-primary:#52669a;--opal-pos:#236c68;--opal-neg:#a13f58;',
    '--opal-glass:linear-gradient(135deg,#e6f3ff 0%,#f6e9f6 38%,#e3f6f0 70%,#ece8fb 100%);--opal-card:linear-gradient(180deg,#fff,#fbfbfe);--opal-cut:inset 0 0 0 1px #d6ddec,0 1px 0 #fff inset,0 2px 6px rgba(70,84,130,.08);',
    '--panel:#fff;--panel-2:#eef1f8;--card:var(--opal-card);--cut:var(--opal-cut);--ol:#d6ddec;--text:#30364d;--muted:#606980;--faint:#8189a0;--gold:#8a6a1f;--gem:#2f6f9a;--cr-ink:#30364d;--cr-mut:#606980;--cr-card:#fff;--cr-line:#d6ddec;--cr-ch:#9fb0d8;',
    'background:radial-gradient(120% 60% at 12% 0%,rgba(226,241,255,.95),transparent 60%),radial-gradient(90% 50% at 100% 8%,rgba(248,234,244,.9),transparent 62%),radial-gradient(80% 40% at 60% 100%,rgba(217,214,244,.55),transparent 70%),#f6f7fc;color:#30364d}',
    '#sheet.opal .sheet-head b{color:#30364d;font-size:21px}',
    '#sheet.opal .sheet-head::before{background:rgba(48,54,77,.18)}',
    '#sheet.opal #sheetClose{background:#fff;color:#30364d;box-shadow:inset 0 0 0 1.2px #c9d2e6,0 2px 4px rgba(70,84,130,.12)}',
    '#sheet.opal #panel h3{color:#30364d}#sheet.opal #panel h3::before{background:linear-gradient(180deg,#a9c8f0,#d8b8e6)}',
    '#sheet.opal .note{color:#606980}',
    // 하위 탭: 흰 세라믹 막대, 고른 탭은 얇은 오팔 유리 + 아래 민트 선 (색 하나로만 구분하지 않게 선도 함께)
    '#sheet.opal .subtabs{background:#fff;box-shadow:inset 0 0 0 1px #d6ddec,0 2px 6px rgba(70,84,130,.07)}',
    '#sheet.opal .subtabs button{color:#606980;position:relative}',
    '#sheet.opal .subtabs button[aria-selected="true"]{background:var(--opal-glass);color:#30364d;box-shadow:inset 0 0 0 1.2px #b9c6e4,0 1px 3px rgba(70,84,130,.14)}',
    '#sheet.opal .subtabs button[aria-selected="true"]::after{content:"";position:absolute;left:28%;right:28%;bottom:3px;height:3px;border-radius:3px;background:linear-gradient(90deg,#8fd8c8,#9cc4f0)}',
    // 카드·행
    '#sheet.opal .row,#sheet.opal .manaline,#sheet.opal .tpoints,#sheet.opal .tinfo,#sheet.opal .alchhead,#sheet.opal .rankbox,#sheet.opal .rankup,#sheet.opal .ceff div,#sheet.opal .codexbar,#sheet.opal .shards,#sheet.opal .sghead,#sheet.opal .sglv,#sheet.opal .potbox,#sheet.opal .dcard,#sheet.opal .ccard,#sheet.opal .skrow,#sheet.opal .binfo,#sheet.opal .bdetail{background:var(--opal-card);border:0;box-shadow:var(--opal-cut);color:#30364d}',
    '#sheet.opal .row .name,#sheet.opal .dname,#sheet.opal .ccard b,#sheet.opal .pull b{color:#30364d}',
    '#sheet.opal .row .desc,#sheet.opal .ccard .cdesc{color:#606980}',
    '#sheet.opal .row .lv,#sheet.opal .lv{color:#52669a;background:#eef2fb;box-shadow:inset 0 0 0 1px #d2dbef}',
    '#sheet.opal .row>.ricon,#sheet.opal .ricon.pt,#sheet.opal .ricon.mk,#sheet.opal .dicon{border-radius:50%;background:radial-gradient(circle at 38% 30%,#fff 0 30%,#eef3fb 62%,#e3e8f5);box-shadow:inset 0 0 0 1px #d6ddec,inset 0 -3px 6px rgba(120,140,190,.16),0 2px 0 rgba(255,255,255,.9)}',
    '#sheet.opal .row.lockrow>.ricon{filter:grayscale(.85) opacity(.7)}#sheet.opal .lockrow .need{color:#8a5a2a}',
    '#sheet.opal .codexbar b,#sheet.opal .note b,#sheet.opal .shards b,#sheet.opal .sghead b,#sheet.opal .deff,#sheet.opal .ceff b,#sheet.opal .tleft{color:#236c68}',
    '#sheet.opal b[style*="#fff"],#sheet.opal span[style*="#fff"]{color:#30364d!important}',
    // 버튼: 주 행동은 밝은 오팔 유리에 어두운 글씨, 보조는 흰 세라믹. 번쩍이는 플라스틱 광택 없이 가장자리만.
    '#sheet.opal .buy,#sheet.opal .buy.gemb,#sheet.opal .pull.big{background:linear-gradient(180deg,#eef5ff,#dfe4fa 55%,#e9def4);color:#30364d;box-shadow:inset 0 0 0 1.2px #a9b8de,inset 0 1px 0 #fff,0 2px 0 #b7c2e2,0 4px 10px rgba(82,102,154,.16)}',
    '#sheet.opal .buy:active{box-shadow:inset 0 0 0 1.2px #a9b8de,0 1px 0 #b7c2e2}',
    '#sheet.opal .buy.off,#sheet.opal .buy.gemb.off,#sheet.opal .btn.off,#sheet.opal .pull.off{background:#eef0f6;color:#8f96aa;box-shadow:inset 0 0 0 1px #dde1ec}',
    '#sheet.opal .btn,#sheet.opal .pull{border:0;background:#fff;color:#30364d;box-shadow:inset 0 0 0 1.2px #cdd5e8,0 2px 0 #dfe4f0}',
    '#sheet.opal .btn.on,#sheet.opal .btn.pri{background:var(--opal-glass);color:#30364d;box-shadow:inset 0 0 0 1.5px #8fa4d4,0 2px 0 #c2cce6}',
    '#sheet.opal .pull span,#sheet.opal .sglv b{color:#2f6f9a}',
    '#sheet.opal .pull.big b,#sheet.opal .pull.big span,#sheet.opal .pull.big small{color:#30364d}',
    '#sheet.opal .kindtabs button{color:#606980;background:#fff;box-shadow:inset 0 0 0 1px #d6ddec}',
    '#sheet.opal .kindtabs button[aria-selected="true"]{background:var(--opal-glass);color:#30364d;box-shadow:inset 0 0 0 1.5px #8fa4d4}',
    '#sheet.opal .guide-summary{background:rgba(255,255,255,.7);color:#606980;box-shadow:inset 0 0 0 1px #dfe4f0}',
    '#sheet.opal .guide-summary b{background:#fff;color:#52669a;box-shadow:inset 0 0 0 1px #cdd5e8}',
    '#sheet.opal .notice{background:#fbeef2;color:#8a3a52;box-shadow:inset 0 0 0 1px #efc9d5}',
    '#sheet.opal #dock,#sheet.opal #dock .dockbox{background:#fbfbfe}',
    '#sheet.opal .cmp{background:#f3f5fb}',
    // 숫자 바뀜: 행 안의 값만 짧게 (성장 180ms, 아이콘 260ms)
    '@keyframes opNum{0%{transform:translateY(5px);opacity:.2}100%{transform:none;opacity:1}}',
    '@keyframes opPop{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}',
    '.op-num{animation:none}.op-pop{animation:opPop .26s ease-out}',   // 숫자가 바뀔 때 위로 튀어 오르던 움직임을 뺌 (inline-block 으로 바뀌며 줄 높이도 흔들렸음 — 사용자 2026-11-18 「숫자만 바껴야」)
    // ---- 마나서클 ----
    '#sheet.opal .opcircle{position:relative;margin:2px auto 0;width:min(320px,86vw);display:flex;flex-direction:column;align-items:center}',
    '#sheet.opal .opdev{position:relative;width:100%;aspect-ratio:1/.86;border-radius:22px;overflow:hidden;background:radial-gradient(70% 60% at 50% 42%,rgba(226,241,255,.9),rgba(248,234,244,.55) 55%,transparent 75%)}',
    '#sheet.opal .opdev canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block}',
    // 정지 포스터 (렌더러 없음·동작 줄이기·오류): 같은 실루엣을 CSS로
    '#sheet.opal .opfb{position:absolute;inset:0;display:grid;place-items:center}',
    '#sheet.opal .opdev.gl .opfb{display:none}',
    '#sheet.opal .opfb i{position:absolute;left:50%;top:44%;width:78%;aspect-ratio:1/.42;border-radius:50%;translate:-50% -50%;box-shadow:0 0 0 3px rgba(255,255,255,.85),0 0 0 5px rgba(170,190,235,.55),0 0 16px rgba(190,170,240,.5)}',
    '#sheet.opal .opfb i:nth-child(2){width:62%;rotate:38deg}#sheet.opal .opfb i:nth-child(3){width:50%;rotate:-34deg}',
    '#sheet.opal .opfb b{position:absolute;left:50%;top:44%;width:21%;aspect-ratio:.86;translate:-50% -50%;border-radius:50% 50% 50% 50%/58% 58% 42% 42%;background:radial-gradient(circle at 35% 30%,#fff,#dff2ff 35%,#f6dcf0 62%,#cfeee6);box-shadow:inset 0 0 0 1.5px #fff,0 6px 14px rgba(120,130,200,.35)}',
    '#sheet.opal .opfb em{position:absolute;left:50%;bottom:7%;width:58%;height:15%;translate:-50% 0;border-radius:50%;background:linear-gradient(180deg,#fff,#e8ebf5);box-shadow:inset 0 -4px 8px rgba(120,130,170,.18),0 8px 14px rgba(70,84,130,.22)}',
    '#sheet.opal .ocname{margin-top:-14px;position:relative;display:flex;align-items:center;gap:8px;padding:7px 18px;border-radius:999px;background:#fff;box-shadow:var(--opal-cut);font:400 19px var(--display);color:#30364d;font-variant-numeric:tabular-nums}',
    '#sheet.opal .ocname small{font:700 12px var(--body);color:#606980}',
    '#sheet.opal .oeff{display:flex;flex-direction:column;gap:6px;margin:12px 0 0}',
    '#sheet.opal .oeff p{margin:0;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px 12px;border-radius:14px;background:#fff;box-shadow:var(--opal-cut)}',
    '#sheet.opal .oeff p>i{width:24px;height:24px;border-radius:50%;background:var(--opal-glass);box-shadow:inset 0 0 0 1px #c9d4ec;display:grid;place-items:center;font-style:normal;font-size:13px;color:#52669a}',
    '#sheet.opal .oeff p span{font:700 14px var(--body);color:#30364d;min-width:0}#sheet.opal .oeff p span small{display:block;font:700 11.5px var(--body);color:#606980}',
    '#sheet.opal .oeff p b{font:400 18px var(--display);color:#236c68;white-space:nowrap;font-variant-numeric:tabular-nums}#sheet.opal .oeff p b em{font-style:normal;color:#9aa3b8;margin:0 4px;font-size:14px}',
    '#sheet.opal .oprog{margin:10px 2px 0;display:grid;grid-template-columns:1fr auto;gap:5px 8px;font:700 13px var(--body);color:#30364d}',
    '#sheet.opal .oprog b{font:400 14px var(--display);font-variant-numeric:tabular-nums}',
    '#sheet.opal .oprog>i{grid-column:1/-1;height:9px;border-radius:9px;background:#e8ecf5;box-shadow:inset 0 0 0 1px #d6ddec;overflow:hidden}',
    '#sheet.opal .oprog>i em{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#9fe0d2,#a9cdf2 60%,#d9c0ee)}',
    '#sheet.opal .obig{display:flex;width:100%;min-height:54px;margin:12px 0 0;align-items:center;justify-content:center;gap:10px;border-radius:999px;font:400 19px var(--display)}',
    '#sheet.opal .obig span{display:inline-flex;align-items:center;gap:4px;font-size:16px;font-variant-numeric:tabular-nums}',
    '#sheet.opal .ohint{margin:6px 0 0;text-align:center;font:700 12px var(--body);color:#606980}#sheet.opal .ohint.bad{color:#a13f58}',
    // ---- 공통: 제목 줄 + 그 옆 작은 선택 (성장 ×1·×10·×100) ----
    '#sheet.opal .ophead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:4px 0 2px}',
    '#sheet.opal .ophead h3{margin:0}',
    '#sheet.opal .ophead .mulpick{display:flex;gap:0;margin:0;padding:3px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px #d6ddec}',
    '#sheet.opal .ophead .mulpick .btn{min-width:54px;min-height:36px;padding:0 10px;border-radius:999px;background:transparent;box-shadow:none;color:#606980;font:400 15px var(--display)}',
    '#sheet.opal .ophead .mulpick .btn.on{background:var(--opal-glass);color:#30364d;box-shadow:inset 0 0 0 1.2px #8fa4d4}',
    '#sheet.opal .ophint{margin:0 0 8px;text-align:right}',
    // ---- 성장: 아이콘 | 이름·레벨 / 지금→다음 | 비용 ----
    '#sheet.opal .row.grow{padding:10px 10px 10px 8px;border-radius:16px}',
    '#sheet.opal .row.grow .glines{background:#f4f6fb;box-shadow:inset 0 0 0 1px #e3e8f2;border-radius:10px}',
    '#sheet.opal .row.grow .glines b{background:#fff;color:#606980;box-shadow:inset 0 0 0 1px #dfe4f0}',
    '#sheet.opal .row.grow .glines b.gl-next{background:#e3f5f0;color:#236c68;box-shadow:inset 0 0 0 1px #b9e2d7}',
    '#sheet.opal .row.grow .glines b.gl-over{background:#f3ecfb;color:#5b4a8a;box-shadow:inset 0 0 0 1px #d9cdee}',
    '#sheet.opal .row.grow .glines b.gl-next+span{color:#236c68;font-weight:800}',
    '#sheet.opal .row.grow .gabout{color:#606980}',
    '#sheet.opal .ricon.opfx,#sheet.opal .ti.opfx{animation:opPop .26s ease-out var(--opd,0s) both}',
    // ---- 특성: 유리 소켓 + 줄 사이 공용 연결선 ----
    '#sheet.opal .tpoints small{display:block;font:700 11.5px var(--body);color:#606980;margin-top:1px}',
    '#sheet.opal .tpoints b{color:#236c68}',
    '#sheet.opal .ttree{padding:6px 0}',
    '#sheet.opal .tnode{background:transparent!important;box-shadow:none!important;padding:0 2px 4px}',
    '#sheet.opal .tnode .ti{width:58px;height:58px;margin:0 auto 4px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 36% 28%,#fff 0 22%,rgba(226,241,255,.95) 45%,rgba(248,234,244,.9) 70%,rgba(188,234,225,.85));box-shadow:inset 0 0 0 1.5px #fff,inset 0 -5px 10px rgba(120,130,200,.22),0 0 0 1.2px #c9d4ec,0 6px 10px -4px rgba(70,84,130,.35);transition:transform .2s}',
    '#sheet.opal .tnode .ti img{width:78%!important;height:78%!important}',
    '#sheet.opal .tnode.sel .ti{transform:translateY(-4px);box-shadow:inset 0 0 0 1.5px #fff,inset 0 -5px 10px rgba(120,130,200,.22),0 0 0 2.5px #8fa4d4,0 0 0 6px rgba(159,176,216,.25),0 10px 12px -4px rgba(70,84,130,.35)}',
    '#sheet.opal .tnode.lock .ti{filter:grayscale(.7);opacity:.7}',
    '#sheet.opal .tnode b{display:inline-block;min-width:38px;padding:1px 7px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px #d6ddec;color:#30364d;font-variant-numeric:tabular-nums}',
    '#sheet.opal .tnode.max b{background:#e3f5f0;box-shadow:inset 0 0 0 1px #b9e2d7;color:#236c68}',
    '#sheet.opal .tnode small{color:#606980}',
    '#sheet.opal .tnode .tlock{left:50%;top:40px;margin-left:12px;width:20px;height:20px;padding:2px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px #d6ddec}',
    '#sheet.opal .trow.shut{opacity:.86}',
    '#sheet.opal .tlink{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin:2px 4px 8px}',
    '#sheet.opal .tlink>i{height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#c9d4ec)}#sheet.opal .tlink>i:last-child{background:linear-gradient(90deg,#c9d4ec,transparent)}',
    '#sheet.opal .tlink.ok>i{background:linear-gradient(90deg,transparent,#9fe0d2 40%,#a9cdf2)}#sheet.opal .tlink.ok>i:last-child{background:linear-gradient(90deg,#a9cdf2,#d9c0ee 60%,transparent)}',
    '#sheet.opal .tlink span{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}',
    '#sheet.opal .tlink em{font:700 12px var(--body);font-style:normal;padding:3px 9px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px #d6ddec;color:#606980;white-space:nowrap}',
    '#sheet.opal .tlink em.ok{background:#e3f5f0;color:#236c68;box-shadow:inset 0 0 0 1px #b9e2d7}#sheet.opal .tlink em.no{color:#8a5a2a}',
    '#sheet.opal .tlink em b{color:inherit}',
    '@keyframes opFlow{0%{filter:none}40%{filter:drop-shadow(0 0 6px #9fe0d2) brightness(1.15)}100%{filter:none}}',
    '#sheet.opal .tlink.opfx{animation:opFlow .45s ease-out var(--opd,0s) both}',
    '#sheet.opal .tinfo span[style]{color:#236c68!important}',
    // ---- 승급: 진주 별 훈장 + 여섯 징표 ----
    '#sheet.opal .oprank{display:flex;flex-direction:column;align-items:center;padding:12px 10px 10px;border-radius:20px}',
    '#sheet.opal .rk-ring{position:relative;width:min(240px,66vw);aspect-ratio:1}',
    '#sheet.opal .rk-paths{position:absolute;inset:0;width:100%;height:100%}',
    '#sheet.opal .rk-paths line{stroke:#d6ddec;stroke-width:2;stroke-dasharray:3 5}#sheet.opal .rk-paths line.on{stroke:#9fd8cc;stroke-width:3;stroke-dasharray:none}',
    '#sheet.opal .rk-sock{position:absolute;left:50%;top:50%;width:25%;aspect-ratio:1;margin:-12.5% 0 0 -12.5%;border-radius:50%;display:grid;place-items:center;transform:rotate(calc(var(--i) * 360deg / var(--n))) translateY(-150%) rotate(calc(var(--i) * -360deg / var(--n)));background:radial-gradient(circle at 36% 28%,#fff 0 25%,#eef3fb 60%,#e1e7f4);box-shadow:inset 0 0 0 1.2px #d6ddec,0 4px 8px -3px rgba(70,84,130,.3)}',
    '#sheet.opal .rk-sock img{width:72%;height:72%}#sheet.opal .rk-sock:not(.on) img{filter:grayscale(.55);opacity:.75}',
    '#sheet.opal .rk-sock i{position:absolute;right:2%;top:2%;width:13px;height:13px;border-radius:50%;background:#e3e7f0;box-shadow:inset 0 0 0 1.5px #c9d0e0}',
    '#sheet.opal .rk-sock.on i{background:radial-gradient(circle at 35% 30%,#fff,#7fd6c4);box-shadow:0 0 0 1.5px #fff,0 0 8px #7fd6c4}',
    '#sheet.opal .rk-sock.on{box-shadow:inset 0 0 0 1.5px #9fd8cc,0 4px 8px -3px rgba(70,84,130,.3)}',
    '#sheet.opal .rk-medal{position:absolute;left:50%;top:50%;width:46%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-align:center;background:radial-gradient(circle at 38% 28%,#fff 0 16%,#e4f1ff 42%,#f5e3f2 68%,#d9f1ea);box-shadow:inset 0 0 0 2px #fff,0 0 0 2px #b9c6e4,0 0 0 6px rgba(217,214,244,.45),0 8px 14px -4px rgba(70,84,130,.35)}',
    '#sheet.opal .rk-medal::before{content:"★";font-size:22px;line-height:1;color:#8e9fd0;text-shadow:0 1px 0 #fff}',
    '#sheet.opal .rk-medal b{font:400 13px/1.15 var(--display);color:#30364d;max-width:84%;word-break:keep-all}#sheet.opal .rk-medal small{font:700 11px var(--body);color:#52669a}',
    '#sheet.opal .rk-sum{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;margin-top:6px;font:700 13px var(--body);color:#606980}#sheet.opal .rk-sum b{color:#236c68;font:400 15px var(--display)}',
    '@keyframes opRank{0%{filter:none}35%{filter:brightness(1.12) drop-shadow(0 0 14px #c9b8f0)}100%{filter:none}}',
    '#sheet.opal .oprank.opfx .rk-ring{animation:opRank .9s ease-out var(--opd,0s) both}',
    '#sheet.opal .oprankup{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;align-items:center;padding:10px 12px;border-radius:16px;margin:8px 0}',
    '#sheet.opal .rk-next small{display:block;font:700 11.5px var(--body);color:#606980}#sheet.opal .rk-next b{font:400 17px var(--display);color:#30364d}',
    '#sheet.opal .oprankup ul{grid-column:1/2;list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}',
    '#sheet.opal .oprankup li{display:flex;align-items:center;gap:6px;font:700 13px var(--body);color:#606980}#sheet.opal .oprankup li i{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:11px;background:#eef0f6;color:#8f96aa}',
    '#sheet.opal .oprankup li.ok{color:#236c68}#sheet.opal .oprankup li.ok i{background:#d6f1ea;color:#236c68}#sheet.opal .oprankup li .icur{width:16px;height:16px}',
    '#sheet.opal .oprankup .buy{grid-column:2;grid-row:1/3;min-width:86px;min-height:52px}',
    '#sheet.opal .row.mkextra{box-shadow:inset 0 0 0 1px #d9cdee,0 2px 6px rgba(70,84,130,.08)}',
    // ---- 연금술: 유리 가마솥 + 세 병 ----
    '#sheet.opal .opalch{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);align-items:center;gap:8px;padding:10px 12px;border-radius:20px}',
    '#sheet.opal .opcaul{position:relative;height:132px;display:grid;place-items:center}',
    '#sheet.opal .opcaul .cl-glass{position:relative;z-index:1;width:112px;height:112px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 50% 62%,rgba(188,234,225,.75),rgba(226,241,255,.55) 45%,rgba(248,234,244,.4) 70%,transparent 72%)}',
    '#sheet.opal .opcaul .cl-glass img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(70,84,130,.28))}',
    '#sheet.opal .opcaul .cl-base{position:absolute;bottom:2px;width:96px;height:16px;border-radius:50%;background:radial-gradient(closest-side,rgba(60,70,120,.25),transparent)}',
    '#sheet.opal .opcaul .bub{position:absolute;z-index:2;left:50%;top:24px;width:10px;height:10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,rgba(190,225,255,.7) 60%,rgba(255,255,255,.2));box-shadow:0 0 0 1px rgba(255,255,255,.8);opacity:0;animation:opBub 3.6s ease-in infinite}',
    '#sheet.opal .opcaul .b2{margin-left:-18px;width:7px;height:7px;animation-delay:1.2s}#sheet.opal .opcaul .b3{margin-left:14px;width:8px;height:8px;animation-delay:2.4s}',
    '@keyframes opBub{0%{transform:translateY(22px) scale(.6);opacity:0}25%{opacity:.9}100%{transform:translateY(-18px) scale(1);opacity:0}}',
    '@keyframes opBrew{0%{filter:none}30%{filter:brightness(1.18) drop-shadow(0 0 12px #bfe9df)}100%{filter:none}}',
    '#sheet.opal .opcaul.opfx .cl-glass{animation:opBrew .55s ease-out var(--opd,0s) both}#sheet.opal .opcaul.opfx .bub{animation-duration:.55s;animation-delay:var(--opd,0s)}',
    '#sheet.opal .al-lv{display:flex;flex-direction:column;gap:4px;align-items:flex-start}',
    '#sheet.opal .al-lv b{font:400 19px var(--display);color:#30364d;padding:4px 14px;border-radius:999px;background:#fff;box-shadow:var(--opal-cut)}',
    '#sheet.opal .al-lv small{font:700 12px var(--body);color:#606980}',
    '#sheet.opal .al-dots{display:flex;gap:6px;align-items:center;margin:2px 0}#sheet.opal .al-dots i{width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 1.5px #c9d4ec}#sheet.opal .al-dots i.on{background:radial-gradient(circle at 35% 30%,#fff,#9fe0d2);box-shadow:inset 0 0 0 1.5px #7fcfbf}',
    '#sheet.opal .pgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 0}',
    '#sheet.opal .pcard{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px 8px;border-radius:18px;background:var(--opal-card);box-shadow:var(--opal-cut);text-align:center;min-width:0}',
    '#sheet.opal .pcard.on{box-shadow:inset 0 0 0 2px #9fd8cc,0 0 0 4px rgba(159,216,204,.22)}',
    '#sheet.opal .pbot{width:64px;height:64px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 50% 60%,rgba(226,241,255,.9),transparent 70%)}#sheet.opal .pbot img{width:100%;height:100%}',
    '#sheet.opal .pbot.opfx{animation:opPop .55s ease-out var(--opd,0s) both}',
    '#sheet.opal .pname{font:400 14.5px var(--display);color:#30364d;white-space:nowrap}',
    '#sheet.opal .peff{font:700 12px var(--body);color:#606980}#sheet.opal .peff b{display:block;font:400 17px var(--display);color:#236c68}',
    '#sheet.opal .ptime{font:700 12px var(--body);color:#52669a;padding:2px 9px;border-radius:999px;background:#eef2fb;font-variant-numeric:tabular-nums}#sheet.opal .ptime.live{background:#e3f5f0;color:#236c68}',
    '#sheet.opal .pcard .buy{width:100%;min-height:48px;padding:4px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}#sheet.opal .pcard .buy small{font-size:12px}#sheet.opal .pcard .buy span{display:inline-flex;align-items:center;gap:3px;font-size:14px;white-space:nowrap}#sheet.opal .pcard .buy .coin{width:15px;height:15px;flex:none}',
    '#sheet.opal .opflow{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:4px 6px;margin:10px 0 0;padding:8px 10px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px #dfe4f0;font:700 12.5px var(--body);color:#30364d}#sheet.opal .opflow i{font-style:normal;color:#9aa3b8}',
    '#sheet.opal .ohint.ophint{text-align:right;margin:-2px 2px 8px}',
    '#sheet.opal .ohint.ogline{text-align:center;margin:8px 4px}',
    // ---- 장비: 선택 장비는 세라믹 전시대, 장착·보유·잠재력 칸은 흰 유리 판 ----
    '#sheet.opal .bagtop{background:var(--opal-card)!important;box-shadow:var(--opal-cut)!important}',
    '#sheet.opal .bcell.big{background:radial-gradient(70% 55% at 50% 40%,#fff,#eef3fb 55%,transparent 72%),linear-gradient(180deg,#f7f9fe,#e9edf7);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--gc) 70%,#fff),inset 0 -14px 16px -10px rgba(70,84,130,.25),0 6px 10px -4px rgba(70,84,130,.3)}',
    '#sheet.opal .bcell.big::after{content:"";position:absolute;left:18%;right:18%;bottom:9%;height:9%;border-radius:50%;background:radial-gradient(closest-side,rgba(60,70,120,.28),transparent);z-index:0}',
    '#sheet.opal .bcell.big>*{position:relative;z-index:1}',
    '#sheet.opal .bcell .tg,#sheet.opal .bcell .blv,#sheet.opal .bcell .bn{color:#30364d;text-shadow:0 1px 0 #fff}',
    '#sheet.opal .bagtop .bname b{color:#30364d}#sheet.opal .bagtop .blv span{color:#606980}',
    '#sheet.opal .bagtop .blv i{background:#e8ecf5;box-shadow:inset 0 0 0 1px #d6ddec}#sheet.opal .bagtop .blv i em{background:linear-gradient(90deg,#9fe0d2,#a9cdf2 60%,#d9c0ee)}',
    '#sheet.opal .bagtop .bdiv::before,#sheet.opal .bagtop .bdiv::after{background:linear-gradient(90deg,transparent,#d6ddec 15%,#d6ddec 85%,transparent)}',
    '#sheet.opal .bagtop .effrow,#sheet.opal .bagtop .gpot{background:#f6f8fc;box-shadow:inset 0 0 0 1.2px #dfe4f0}',
    '#sheet.opal .bagtop .effrow>em,#sheet.opal .bagtop .ptab{color:#30364d;background:var(--opal-glass);box-shadow:inset 0 0 0 1px #c9d4ec}',
    '#sheet.opal .bagtop .effrow>span,#sheet.opal .bagtop .potline>span{border-left-color:#d6ddec;color:#30364d}',
    '#sheet.opal .bagtop .pnote{border-top-color:#dfe4f0;color:#606980}',
    '#sheet.opal .bgrid .bcell{background:linear-gradient(180deg,#fff,#f0f3f9);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--gc) 75%,#fff),0 2px 4px rgba(70,84,130,.1)}',
    '#sheet.opal .bgrid .bcell.none{background:#f1f3f8;box-shadow:inset 0 0 0 1.5px #dde2ec}#sheet.opal .bgrid .bcell.none>svg,#sheet.opal .bgrid .bcell.none>img,#sheet.opal .bgrid .bcell.none .gart{filter:grayscale(1) brightness(1.1) opacity(.45)}',
    '#sheet.opal .bgrid .bcell.sel{box-shadow:inset 0 0 0 2.5px #8fa4d4,0 0 0 3px rgba(159,176,216,.35)}',
    '#sheet.opal .bgrid .bcell.eq .E{background:#52669a;color:#fff}',
    // ---- 신성력·룬 보석 칸: 어두운 원 대신 밝은 유리 소켓, 등급색은 테두리로 ----
    '#sheet.opal .sgcell{background:radial-gradient(circle at 40% 30%,#fff 0 20%,#f1f5fc 55%,#e5eaf5);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--gc,#9aa) 70%,#fff),0 3px 6px -2px rgba(70,84,130,.25)}',
    '#sheet.opal .sgcell .tg,#sheet.opal .sgcell .q{color:#30364d;text-shadow:0 1px 0 #fff}',
    '#sheet.opal .sgcell.sel{box-shadow:inset 0 0 0 2.5px #52669a,0 0 0 3px rgba(82,102,154,.25)}',
    '#sheet.opal .sgcell.empty{background:#f4f6fb;box-shadow:inset 0 0 0 1.5px #dfe4f0}#sheet.opal .sgcell.empty::before{box-shadow:inset 0 0 0 2px #dfe4f0}',
    // 신성력 진열대: 4칸마다 세라믹 선반 한 단 (칸이 늘면 단도 늘어남)
    '#sheet.opal .sgshelf{position:relative;padding:12px 10px 14px;border-radius:20px;background:radial-gradient(90% 70% at 50% 0%,rgba(226,241,255,.9),rgba(248,234,244,.5) 55%,transparent 80%),#fff;box-shadow:var(--opal-cut);row-gap:16px;background-size:100% 100%}',
    '#sheet.opal .sgshelf>.sgcell{position:relative;overflow:visible}',
    '#sheet.opal .sgshelf>.sgcell::after{content:"";position:absolute;left:-6%;right:-6%;bottom:-9px;height:7px;border-radius:50%;background:linear-gradient(180deg,#fff,#e1e6f2);box-shadow:0 3px 5px -2px rgba(70,84,130,.35)}',
    '#sheet.opal .sgmore{margin:6px 4px 10px;text-align:center;font:700 12px var(--body);color:#606980}',
    '#sheet.opal .sgcell.lockd{background:#eef0f6;color:#8f96aa;box-shadow:inset 0 0 0 1px #dde1ec}',
    '#sheet.opal .runering{background:radial-gradient(circle,#fff 0 28%,#eef3fb 29% 62%,rgba(226,241,255,.5) 63% 66%,transparent 67%);box-shadow:inset 0 0 0 1.5px #d6ddec,0 10px 18px -8px rgba(70,84,130,.35)}',
    '#sheet.opal .rcore{background:radial-gradient(circle at 40% 30%,#fff,#e4f1ff 45%,#f5e3f2 75%,#d9f1ea);box-shadow:inset 0 0 0 2px #fff,0 0 0 2px #b9c6e4}#sheet.opal .rcore b{color:#30364d}#sheet.opal .rcore small,#sheet.opal .rcore span{color:#52669a}',
    '#sheet.opal .rune b{background:#fff;color:#30364d}',
    '#sheet.opal .runering.r7 .rune.empty{border-color:#c9d4ec;color:#8f96aa}',
    // 룬 공명: 기준(최저) 룬 라벨, 다음 공명에 못 미친 룬 표시점, 강화·공명 상승 빛 (위치 transform은 건드리지 않음)
    '#sheet.opal .rune.base::after{content:"기준";position:absolute;left:50%;top:-14px;translate:-50% 0;padding:1px 6px;border-radius:999px;background:#52669a;color:#fff;font:800 10px/1.3 var(--body);white-space:nowrap;z-index:3}',
    '#sheet.opal .rune.lag::before{content:"";position:absolute;right:-2px;top:4px;width:11px;height:11px;border-radius:50%;background:#f0a868;box-shadow:0 0 0 2px #fff;z-index:3}',
    '#sheet.opal .rune.sel{filter:drop-shadow(0 0 6px rgba(82,102,154,.6))}',
    '#sheet.opal .rune.opfx{animation:opFlow .45s ease-out var(--opd,0s) both}',
    '@keyframes opRes{0%{filter:none}30%{filter:brightness(1.15) drop-shadow(0 0 16px #9fe0d2)}100%{filter:none}}',
    '#sheet.opal .rcore.opfx{animation:opRes .8s ease-out var(--opd,0s) both}',
    '#sheet.opal .rnext{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1.2fr);align-items:center;gap:4px;margin:8px 0 6px;padding:10px;border-radius:16px;background:var(--opal-card);box-shadow:var(--opal-cut);text-align:center}',
    '#sheet.opal .rnext>div small{display:block;font:700 11px var(--body);color:#606980}#sheet.opal .rnext>div b{font:400 14px var(--display);color:#30364d;white-space:nowrap}',
    '#sheet.opal .rnext .rn-c b{color:#236c68}#sheet.opal .rnext>i{font-style:normal;color:#9aa3b8}',
    '#sheet.opal .rnext p{grid-column:1/-1;margin:4px 0 0;font:700 12px var(--body);color:#606980}#sheet.opal .rnext p b{color:#8a5a2a}',
    '#sheet.opal .lagdot{display:inline-block;width:9px;height:9px;margin-right:5px;border-radius:50%;background:#f0a868;vertical-align:0}',
    // ---- 코스튬·유물·삼신기 카드 ----
    '#sheet.opal .ccard{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--gc) 60%,#fff),0 2px 6px rgba(70,84,130,.08)}',
    '#sheet.opal .ccard.on{box-shadow:inset 0 0 0 2.5px #52669a,0 0 0 3px rgba(82,102,154,.2)}',
    '#sheet.opal .ccard.none img{filter:grayscale(.5) opacity(.75)}',
    '#sheet.opal .ccard{position:relative}#sheet.opal .ccard.prev{box-shadow:inset 0 0 0 2.5px #8fd8c8,0 0 0 3px rgba(143,216,200,.3)}',
    '#sheet.opal .cprevb{display:block;width:100%;padding:0;border:0;background:radial-gradient(60% 55% at 50% 55%,#eef3fb,transparent 70%);border-radius:12px;cursor:pointer}#sheet.opal .cprevb img{display:block;width:100%;max-width:120px;margin:0 auto}',
    '#sheet.opal .cb{display:inline-block;font:800 11px/1.2 var(--body);font-style:normal;padding:3px 9px;border-radius:999px;white-space:nowrap}',
    '#sheet.opal .cb.wear{background:#236c68;color:#fff}#sheet.opal .cb.own{background:#eef2fb;color:#52669a;box-shadow:inset 0 0 0 1px #c9d4ec}#sheet.opal .cb.none{background:#f6eef2;color:#8a3a52;box-shadow:inset 0 0 0 1px #efc9d5}',
    '#sheet.opal .cb.mini{position:absolute;top:30px;right:6px;padding:2px 7px}',
    '#sheet.opal .rlstage{display:grid;grid-template-columns:110px minmax(0,1fr);gap:12px;align-items:center;padding:12px;border-radius:20px;background:radial-gradient(70% 80% at 18% 45%,rgba(226,241,255,.95),rgba(248,234,244,.5) 55%,transparent 75%),#fff;box-shadow:var(--opal-cut)}',
    '#sheet.opal .rlstage.divine{box-shadow:inset 0 0 0 2px #e6cf8c,0 2px 6px rgba(70,84,130,.08)}',
    '#sheet.opal .rl-fig{position:relative;height:104px;display:grid;place-items:center}#sheet.opal .rl-fig>img,#sheet.opal .rl-fig>svg{position:relative;z-index:1;width:78px;height:78px;animation:opFloat 3s ease-in-out infinite}',
    '#sheet.opal .rl-fig>i{position:absolute;bottom:2px;left:10%;right:10%;height:20px;border-radius:50%;background:linear-gradient(180deg,#fff,#e6eaf4);box-shadow:inset 0 -3px 6px rgba(120,130,170,.2),0 6px 10px -4px rgba(70,84,130,.35)}',
    '@keyframes opFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}',
    '#sheet.opal .rlstage.none .rl-fig>img,#sheet.opal .rlstage.none .rl-fig>svg{filter:grayscale(1) brightness(1.15) opacity(.5)}',
    '#sheet.opal .rl-info{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}#sheet.opal .rl-info>b{font:400 18px var(--display);color:#30364d}',
    '#sheet.opal .rl-lv{font:700 12.5px var(--body);color:#606980}#sheet.opal .rl-eff{font:800 13.5px var(--body);color:#236c68}#sheet.opal .rl-eff em{font-style:normal;color:#9aa3b8}',
    '#sheet.opal .rlgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:8px}',
    '#sheet.opal .rlsock{position:relative;aspect-ratio:1;min-height:44px;border:0;border-radius:50%;padding:12% 12% 22%;display:grid;place-items:center;background:radial-gradient(circle at 40% 28%,#fff 0 20%,#f1f5fc 58%,#e3e8f4);box-shadow:inset 0 0 0 1.2px #d6ddec,0 3px 6px -2px rgba(70,84,130,.25);cursor:pointer}',
    '#sheet.opal .rlsock>img,#sheet.opal .rlsock>svg{width:100%;height:100%}',
    '#sheet.opal .rlsock b{position:absolute;bottom:-2px;left:50%;translate:-50% 0;padding:1px 7px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px #d6ddec;font:700 11px var(--body);color:#30364d;white-space:nowrap}',
    '#sheet.opal .rlsock.none>img,#sheet.opal .rlsock.none>svg{filter:grayscale(1) brightness(1.2) opacity(.4)}#sheet.opal .rlsock.none b{color:#9aa1b5}',
    '#sheet.opal .rlsock.divine{box-shadow:inset 0 0 0 2px #e6cf8c,0 3px 6px -2px rgba(70,84,130,.25)}',
    '#sheet.opal .rlsock.sel{box-shadow:inset 0 0 0 2.5px #52669a,0 0 0 3px rgba(82,102,154,.25)}',
    '#sheet.opal .cosstage{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:10px;align-items:center;margin:4px 0 10px;padding:12px;border-radius:20px;background:radial-gradient(80% 70% at 25% 40%,rgba(226,241,255,.9),rgba(248,234,244,.6) 55%,transparent 75%),#fff;box-shadow:var(--opal-cut)}',
    '#sheet.opal .cs-fig{position:relative;display:grid;place-items:end center;min-height:150px}',
    '#sheet.opal .cs-fig img{position:relative;z-index:1;width:100%;max-width:160px;animation:opBreath 3.2s ease-in-out infinite;transform-origin:50% 100%}',
    '@keyframes opBreath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,.985)}}',
    '#sheet.opal .cs-base{position:absolute;bottom:-2px;left:12%;right:12%;height:22px;border-radius:50%;background:linear-gradient(180deg,#fff,#e6eaf4);box-shadow:inset 0 -3px 6px rgba(120,130,170,.2),0 6px 10px -4px rgba(70,84,130,.35)}',
    '#sheet.opal .cs-fig.opfx img{animation:opPop .65s ease-out var(--opd,0s) both}',
    '#sheet.opal .cs-info{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}',
    '#sheet.opal .cs-info>b{font:400 18px/1.2 var(--display);color:#30364d;word-break:keep-all}',
    '#sheet.opal .cs-g{font:800 12px var(--body)}#sheet.opal .cs-lv{font:700 12px var(--body);color:#606980}#sheet.opal .cs-eff{font:800 13.5px var(--body);color:#236c68}',
    '#sheet.opal .cs-act{display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:6px;width:100%;margin-top:4px}#sheet.opal .cs-act button{min-height:46px;padding:4px 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}',
    '#sheet.opal .cs-act .buy span{display:inline-flex;align-items:center;gap:3px}#sheet.opal .cs-act .gem{width:14px;height:14px;flex:none}',
    '#sheet.opal .shards .coin{display:inline-block;width:16px;height:16px;vertical-align:-3px;border-radius:0;background:url(art/ic-gold.webp) 50% 50%/contain no-repeat;box-shadow:none}',
    // 삼신기: 세 전시대 나란히, 고른 것만 3px 떠오름
    '#sheet.opal .dvstands{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:4px 0 10px;padding:12px 8px 10px;border-radius:20px;background:radial-gradient(90% 70% at 50% 20%,rgba(226,241,255,.9),rgba(248,234,244,.5) 55%,transparent 80%),#fff;box-shadow:var(--opal-cut)}',
    '#sheet.opal .dvstand{display:flex;flex-direction:column;align-items:center;gap:3px;min-height:44px;padding:4px 2px 6px;border:0;border-radius:16px;background:transparent;cursor:pointer;color:#30364d}',
    '#sheet.opal .dv-fig{position:relative;width:72px;height:80px;display:grid;place-items:center}',
    '#sheet.opal .dv-fig>img,#sheet.opal .dv-fig>svg{position:relative;z-index:1;width:62px;height:62px;transition:transform .25s}',
    '#sheet.opal .dv-fig>i{position:absolute;bottom:2px;left:4px;right:4px;height:16px;border-radius:50%;background:linear-gradient(180deg,#fff,#e3e8f4);box-shadow:inset 0 -3px 5px rgba(120,130,170,.2),0 5px 8px -3px rgba(70,84,130,.35)}',
    '#sheet.opal .dvstand.sel{background:rgba(255,255,255,.75);box-shadow:inset 0 0 0 2px #8fa4d4}',
    '#sheet.opal .dvstand.sel .dv-fig>img,#sheet.opal .dvstand.sel .dv-fig>svg{transform:translateY(-3px);animation:opFloat 3s ease-in-out infinite}',
    '#sheet.opal .dvstand.sleep .dv-fig>img,#sheet.opal .dvstand.sleep .dv-fig>svg{filter:grayscale(.6) opacity(.7)}',
    '#sheet.opal .dvstand b{font:400 12.5px/1.2 var(--display);text-align:center;word-break:keep-all}#sheet.opal .dvstand small{font:700 11px var(--body);color:#606980}',
    '#sheet.opal .dvpaths{display:flex;flex-direction:column;gap:4px;width:100%;margin:6px 0}',
    '#sheet.opal .dvpaths p{margin:0;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:12px;background:#f4f6fb;font:700 12.5px var(--body);color:#606980}',
    '#sheet.opal .dvpaths em{flex:none;display:inline-flex;align-items:center;gap:3px;min-width:52px;font-style:normal;color:#52669a}#sheet.opal .dvpaths b{color:#236c68}#sheet.opal .dvpaths .coin{width:14px;height:14px}',
    '#sheet.opal .dcard .btns .btn small{display:block;font-size:11px;color:#606980}',
    '#sheet.opal .opstars{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:8px;width:100%;max-width:220px;margin:0 auto 4px}',
    '#sheet.opal .opstars b{font:400 15px var(--display);color:#52669a;white-space:nowrap}',
    '#sheet.opal .opstars i{height:8px;border-radius:8px;background:#e8ecf5;box-shadow:inset 0 0 0 1px #d6ddec;overflow:hidden}#sheet.opal .opstars i em{display:block;height:100%;background:linear-gradient(90deg,#a9cdf2,#d9c0ee)}',
    '@keyframes opStar{0%{box-shadow:var(--opal-cut)}35%{box-shadow:inset 0 0 0 2px #c9b8f0,0 0 18px rgba(201,184,240,.7)}100%{box-shadow:var(--opal-cut)}}',
    '#sheet.opal .dcard.opfx{animation:opStar .7s ease-out var(--opd,0s) both}#sheet.opal .dicon.opfx{animation:opPop .3s ease-out var(--opd,0s) both}',
    // ---- 스킬: 네 슬롯 유리 소켓, 순서 흐름, 강화 두 갈래 ----
    '#sheet.opal .skflow{display:flex;align-items:center;justify-content:center;gap:6px;margin:2px 0 8px;font:700 12px var(--body);color:#606980}',
    '#sheet.opal .skflow b{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--opal-glass);box-shadow:inset 0 0 0 1.2px #b9c6e4;font:400 13px var(--display);color:#30364d}',
    '#sheet.opal .skflow i{font-style:normal;color:#9aa3b8}#sheet.opal .skflow i.back{color:#52669a}#sheet.opal .skflow small{margin-left:6px;font:700 11.5px var(--body)}',
    '#sheet.opal .slotpick{background:radial-gradient(circle at 40% 25%,#fff 0 20%,#f1f5fc 60%,#e3e8f4);border:0;box-shadow:inset 0 0 0 1.5px #d6ddec,inset 0 -6px 0 color-mix(in srgb,var(--c,#9fb0d8) 55%,#fff),0 4px 8px -3px rgba(70,84,130,.3);color:#30364d}',
    '#sheet.opal .slotcard.on .slotpick{box-shadow:inset 0 0 0 2.5px #52669a,0 0 0 4px rgba(82,102,154,.2),inset 0 -6px 0 color-mix(in srgb,var(--c,#9fb0d8) 55%,#fff)}',
    '#sheet.opal .slotpick small,#sheet.opal .slotpick em{color:#30364d}',
    '#sheet.opal .slotout{background:#fff;color:#606980;box-shadow:inset 0 0 0 1px #d6ddec}',
    '#sheet.opal .skinfo.opsk{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:16px;background:var(--opal-card);box-shadow:var(--opal-cut);color:#30364d}',
    '#sheet.opal .skup2{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px}',
    '#sheet.opal .sk-from{padding:6px 10px;border-radius:12px;background:var(--opal-glass);box-shadow:inset 0 0 0 1.2px #b9c6e4;font:700 12px var(--body);white-space:nowrap}#sheet.opal .sk-from b{font:400 16px var(--display)}',
    '#sheet.opal .sk-two{position:relative;display:flex;flex-direction:column;gap:4px;padding-left:12px;border-left:2px solid #c9d4ec}',
    '#sheet.opal .sk-two p{margin:0;font:700 13px var(--body);color:#30364d}#sheet.opal .sk-two em{display:inline-block;min-width:62px;margin-right:6px;font-style:normal;font-size:11.5px;color:#52669a}#sheet.opal .sk-two strong{color:#236c68}',
    '#sheet.opal .sk-own,#sheet.opal .sk-place{margin:0;font:700 12px var(--body);color:#606980}#sheet.opal .sk-own strong{color:#236c68}#sheet.opal .sk-place.on{color:#52669a}',
    '#sheet.opal .sktier{color:#30364d}#sheet.opal .sktier b{color:#30364d;background:var(--opal-glass);box-shadow:inset 0 0 0 1px #b9c6e4}',
    '#sheet.opal .elchip{color:#30364d}',
    // ================= 승인 시안 최종 (2026-11-16, 승인한-최종기준.png): 아래 규칙이 위의 규칙보다 우선 =================
    '#sheet.opal{--teal:#2f9c97;--teal-d:#1f706c;--teal-l:#5cc0b8;--navy:#2a3150;--pearl:#fbfbfd;--pearl-e:#dfe3ee;--sel:0 0 0 2px #45b3ab,0 0 0 4px rgba(120,210,200,.28);',
    'background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'90\' height=\'60\'%3E%3Cg fill=\'none\' stroke=\'%23a9b3cf\' stroke-width=\'.8\' opacity=\'.7\'%3E%3Cpolyline points=\'6,40 22,30 40,34 56,18\'/%3E%3C/g%3E%3Cg fill=\'%23a9b3cf\'%3E%3Ccircle cx=\'6\' cy=\'40\' r=\'1.4\'/%3E%3Ccircle cx=\'22\' cy=\'30\' r=\'1.4\'/%3E%3Ccircle cx=\'40\' cy=\'34\' r=\'1.4\'/%3E%3Ccircle cx=\'56\' cy=\'18\' r=\'1.6\'/%3E%3C/g%3E%3C/svg%3E") 6px 6px/90px 60px no-repeat,url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'90\' height=\'60\'%3E%3Cg fill=\'none\' stroke=\'%23a9b3cf\' stroke-width=\'.8\' opacity=\'.7\'%3E%3Cpolyline points=\'84,44 66,30 50,36 34,22\'/%3E%3C/g%3E%3Cg fill=\'%23a9b3cf\'%3E%3Ccircle cx=\'84\' cy=\'44\' r=\'1.4\'/%3E%3Ccircle cx=\'66\' cy=\'30\' r=\'1.4\'/%3E%3Ccircle cx=\'50\' cy=\'36\' r=\'1.4\'/%3E%3Ccircle cx=\'34\' cy=\'22\' r=\'1.6\'/%3E%3C/g%3E%3C/svg%3E") calc(100% - 6px) 6px/90px 60px no-repeat,linear-gradient(180deg,#f7f6fb,#f2f2f8);box-shadow:inset 0 0 0 1.5px #fff,inset 0 0 0 2.5px #e3e5ef,0 -14px 30px rgba(40,40,80,.28)}',
    // 제목: 가운데, 양옆 가는 선과 ✦ (아이콘 빼고)
    '#sheet.opal .sheet-head{justify-content:center;position:relative}#sheet.opal .sheet-head b{display:flex;align-items:center;gap:10px;font:400 22px var(--display);color:var(--navy);letter-spacing:1px}',
    '#sheet.opal .sheet-head b .ico,#sheet.opal .sheet-head b img,#sheet.opal .sheet-head b svg{display:none}',
    '#sheet.opal .sheet-head b::before,#sheet.opal .sheet-head b::after{content:"✦";font-size:12px;color:#9aa3c2;padding:0 0 0 46px;background:linear-gradient(90deg,transparent,#c4cade) left 50%/40px 1px no-repeat}',
    '#sheet.opal .sheet-head b::after{padding:0 46px 0 0;background:linear-gradient(90deg,#c4cade,transparent) right 50%/40px 1px no-repeat}',
    '#sheet.opal #sheetClose{position:absolute;right:12px}',
    // 하위 탭·종류 탭: 캡슐 대신 글씨 + 짧은 청록 밑줄 + 작은 마름모
    '#sheet.opal .subtabs,#sheet.opal .kindtabs{background:var(--pearl);border-radius:16px;box-shadow:inset 0 0 0 1px var(--pearl-e),inset 0 -6px 10px -8px rgba(80,90,140,.25);padding:2px 4px}',
    '#sheet.opal .subtabs button,#sheet.opal .kindtabs button{background:none!important;box-shadow:none!important;color:#5d6580;font-weight:700;position:relative}',
    '#sheet.opal .subtabs button[aria-selected="true"],#sheet.opal .kindtabs button[aria-selected="true"]{color:var(--navy)!important;font-weight:900}',
    '#sheet.opal .subtabs button[aria-selected="true"]::after,#sheet.opal .kindtabs button[aria-selected="true"]::after{content:"";position:absolute;left:30%;right:30%;bottom:4px;height:2.5px;border-radius:2px;background:var(--teal)}',
    '#sheet.opal .subtabs button[aria-selected="true"]::before,#sheet.opal .kindtabs button[aria-selected="true"]::before{content:"";position:absolute;left:50%;bottom:1.5px;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);background:var(--teal);box-shadow:0 0 0 1.5px var(--pearl)}',
    '#sheet.opal .kindtabs button i{display:none}',
    // 버튼: 주 = 청록(흰 글씨, 윗면 얇은 반사, 아래 3px 두께) / 보조 = 진주 / 불가 = 회색
    '#sheet.opal .buy,#sheet.opal .buy.gemb,#sheet.opal .btn.pri.teal{background:linear-gradient(180deg,#5cbdb5 0%,#3aa49d 48%,#2b928c 100%);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 0 0 1px #2a8781,0 3px 0 var(--teal-d),0 5px 10px -3px rgba(31,112,108,.45);text-shadow:0 1px 1px rgba(20,70,70,.35)}',
    '#sheet.opal .buy:active,#sheet.opal .buy.gemb:active{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 0 0 1px #2a8781,0 1px 0 var(--teal-d)}',
    '#sheet.opal .buy .gn,#sheet.opal .buy .gn small,#sheet.opal .buy small,#sheet.opal .buy span{color:inherit}',
    '#sheet.opal .buy.off,#sheet.opal .buy.gemb.off{background:linear-gradient(180deg,#eef0f5,#e2e5ed);color:#8d93a6;text-shadow:none;box-shadow:inset 0 0 0 1px #d7dbe6,0 2px 0 #cfd3de}',
    '#sheet.opal .btn,#sheet.opal .pull,#sheet.opal .btn.pri{background:linear-gradient(180deg,#fff,#f1f2f7);color:var(--navy);box-shadow:inset 0 1px 0 #fff,inset 0 0 0 1px var(--pearl-e),0 2px 0 #d9dce7,0 4px 8px -4px rgba(60,70,120,.25)}',
    '#sheet.opal .btn.pri::first-letter{color:inherit}',
    '#sheet.opal .btn.on{background:linear-gradient(180deg,#fff,#eef8f7);color:var(--teal-d);box-shadow:inset 0 0 0 1.5px #45b3ab,0 2px 0 #cfe3e1}',
    '#sheet.opal .btn.off,#sheet.opal .pull.off{background:#eef0f5;color:#9aa0b2;box-shadow:inset 0 0 0 1px #dde0e9}',
    '#sheet.opal .pull.big{background:linear-gradient(180deg,#5cbdb5,#2b928c);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 3px 0 var(--teal-d)}#sheet.opal .pull.big b,#sheet.opal .pull.big span,#sheet.opal .pull.big small{color:#fff}',
    '#sheet.opal .ophead .mulpick .btn.on{background:none;box-shadow:none;color:var(--navy);font-weight:900;position:relative}#sheet.opal .ophead .mulpick .btn.on::after{content:"";position:absolute;left:28%;right:28%;bottom:4px;height:2.5px;border-radius:2px;background:var(--teal)}',
    // 효과 영역: 한 덩어리의 반투명 진주 판, 줄 사이 가는 선. 라벨마다 캡슐 없음
    '#sheet.opal .opfx-area,#sheet.opal .bagtop .bdetail{background:rgba(255,255,255,.82);border-radius:14px;box-shadow:inset 0 0 0 1px #e1e4ee,inset 0 -8px 14px -12px rgba(80,90,140,.3),0 1px 0 #fff}',
    // ---- 성운 전시 공간 + 받침대 ----
    // 물체는 받침 윗면에 놓인다: 받침은 바닥에서 12px·높이 36px, 물체 바닥은 받침 윗면 가운데(바닥에서 34px)
    '#sheet.opal .opstage{position:relative;isolation:isolate;display:grid;place-items:end center;min-height:180px;overflow:visible;padding:14px 8px 34px}',
    '#sheet.opal .ns-neb{position:absolute;inset:0 0 20px 0;z-index:-2;border-radius:50% 50% 42% 42%/58% 58% 42% 42%;background:var(--opneb) 50% 40%/cover no-repeat!important;-webkit-mask:radial-gradient(64% 66% at 50% 46%,#000 72%,rgba(0,0,0,.6) 88%,transparent 100%)!important;mask:radial-gradient(64% 66% at 50% 46%,#000 72%,rgba(0,0,0,.6) 88%,transparent 100%)!important}',
    '#sheet.opal .ns-stars{position:absolute;inset:4% 6%;width:88%;height:84%;z-index:-1;pointer-events:none}',
    '#sheet.opal .ns-stars circle{fill:#fff;opacity:.85}#sheet.opal .ns-stars circle.tw{animation:opTw 3.4s ease-in-out infinite}#sheet.opal .ns-stars circle.tw+circle.tw{animation-delay:1.7s}',
    '#sheet.opal .ns-stars .cn polyline{fill:none;stroke:#fff;stroke-width:.6;opacity:.55}#sheet.opal .ns-stars .cn circle.v{opacity:.9}#sheet.opal .ns-stars .sp{fill:#fff;opacity:.8}',
    '@keyframes opTw{0%,100%{opacity:.85}50%{opacity:.3}}',
    '#sheet.opal .ns-ped{position:absolute;z-index:0;left:14%;right:14%;bottom:12px;height:36px}',
    '#sheet.opal .ns-ped::before{content:"";position:absolute;z-index:1;left:0;right:0;top:0;height:62%;border-radius:50%;background:radial-gradient(ellipse 46% 40% at 50% 46%,rgba(120,220,210,.55),rgba(190,240,232,.25) 55%,transparent 72%),radial-gradient(ellipse at 50% 40%,#ffffff 30%,#eef0f7 70%,#dfe3ee);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.95),inset 0 -2px 5px rgba(110,120,170,.25)}',
    '#sheet.opal .ns-ped::after{content:"";position:absolute;z-index:0;left:0;right:0;top:31%;bottom:0;border-radius:0 0 50% 50%/0 0 70% 70%;background:linear-gradient(180deg,#e7eaf3 0%,#cdd3e4 70%,#bcc3d8);box-shadow:0 10px 14px -6px rgba(40,50,100,.45),0 2px 0 rgba(255,255,255,.6) inset}',
    '#sheet.opal .ns-ped>i{position:absolute;z-index:2;left:20%;right:20%;top:12%;height:38%;border-radius:50%;box-shadow:0 0 0 1px rgba(90,200,190,.55),0 0 10px rgba(110,220,210,.5)}',
    '#sheet.opal .ns-obj{position:relative;z-index:1;display:grid;place-items:end center;animation:opFloat 3.2s ease-in-out infinite}',
    '#sheet.opal .ns-obj>img,#sheet.opal .ns-obj>svg,#sheet.opal .ns-obj>.gart{filter:drop-shadow(0 6px 6px rgba(30,40,90,.35)) drop-shadow(0 0 1px rgba(255,255,255,.8))}',
    '#sheet.opal .ns-sh{position:absolute;z-index:-1;left:22%;right:22%;bottom:-6px;height:12px;border-radius:50%;background:radial-gradient(closest-side,rgba(30,40,90,.38),transparent);animation:opShadow 3.2s ease-in-out infinite}',
    '@keyframes opShadow{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.9);opacity:.75}}',
    '@keyframes opFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
    // 선택: 청록·오팔 테두리 + 체크, 미선택은 차분
    '#sheet.opal .opsel-check{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:var(--teal);color:#fff;font:900 12px/20px var(--body);text-align:center;box-shadow:0 0 0 2px #fff;z-index:3}',
    // ---- 장비 (승인 시안 왼쪽) ----
    '#sheet.opal .bagtop.opbag{display:grid!important;grid-template-columns:46% minmax(0,1fr);grid-template-rows:auto 1fr;gap:6px 10px;align-items:start;background:transparent!important;box-shadow:none!important;padding:0!important;margin:2px 0 10px}',
    '#sheet.opal .opbag .gstage{grid-row:1/3;align-self:start;min-height:0;height:250px;padding-top:30px}',
    '#sheet.opal .gstage .ns-obj{width:92%}#sheet.opal .gstage .ns-obj>*{width:100%;height:auto;max-height:200px;object-fit:contain}',
    '#sheet.opal .gstage .ns-ped{left:6%;right:6%}',
    '#sheet.opal .gstage.none .ns-obj>*{filter:grayscale(.7) brightness(1.1) opacity(.6) drop-shadow(0 6px 6px rgba(30,40,90,.25))}',
    '#sheet.opal .gs-tag{position:absolute;left:6%;top:4%;z-index:3;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.88);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--gc) 70%,#fff);font:800 11px var(--body);color:var(--navy)}',
    '#sheet.opal .gs-eq{position:absolute;right:6%;top:4%;z-index:3;padding:2px 8px;border-radius:999px;background:var(--teal);color:#fff;font:800 11px var(--body)}',
    '#sheet.opal .gs-n{position:absolute;right:8%;bottom:2%;z-index:3;font:800 11px var(--body);color:#5d6580}',
    '#sheet.opal .opbag .binfo{background:none!important;box-shadow:none!important;padding:4px 2px 0;display:flex;flex-direction:column;gap:4px}',
    '#sheet.opal .opbag .bname{display:flex;align-items:baseline;gap:8px}#sheet.opal .opbag .bname b{font:400 21px var(--display)!important;color:var(--navy)!important}#sheet.opal .opbag .glv{font:700 13px var(--body);font-style:normal;color:#5d6580}',
    '#sheet.opal .opbag .gstars{font-size:15px;letter-spacing:2px;color:#9aa3c2}#sheet.opal .opbag .gstars i.on{color:#e3b24a;text-shadow:none}',
    '#sheet.opal .opbag .blv span{font:700 11.5px var(--body);color:#5d6580}#sheet.opal .opbag .blv i{height:6px}',
    '#sheet.opal .opbag .bdetail{display:flex;flex-direction:column;gap:0;padding:4px 10px 8px}',
    '#sheet.opal .opbag .ef{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:center;gap:6px;margin:0;padding:7px 0;border-bottom:1px solid #e6e8f0;font:700 12.5px var(--body);color:var(--navy)}',
    '#sheet.opal .opbag .ef i,#sheet.opal .opbag .pthead i{font-style:normal;color:#8a95bd}',
    '#sheet.opal .opbag .ef b{justify-self:end;font:800 12.5px var(--body);color:#1f7a74;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
    '#sheet.opal .opbag .gpot{margin:0!important;padding:6px 0 0!important;background:none!important;box-shadow:none!important;border-radius:0}',
    '#sheet.opal .opbag .pthead{display:flex;align-items:center;gap:6px;margin:0 0 4px;font:800 12.5px var(--body);color:var(--navy)}#sheet.opal .opbag .pthead small{margin-left:auto;font:700 10.5px var(--body);color:#8a90a6}',
    '#sheet.opal .opbag .potline{grid-template-columns:auto minmax(0,1fr) auto!important;padding:4px 2px!important;margin:0;border-radius:0!important;background:none!important;box-shadow:none!important;border-bottom:1px solid #eceef4}',
    '#sheet.opal .opbag .potline .pspark{display:none}#sheet.opal .opbag .ptag{width:auto!important;padding:1px 6px!important;font-size:10.5px!important}',
    '#sheet.opal .opbag .potline>span{border:0!important;padding-left:0!important;font:700 11.5px/1.3 var(--body);color:var(--navy);white-space:normal!important;overflow:visible!important;word-break:keep-all}',
    '#sheet.opal .opbag .plock{width:26px;height:22px;border-radius:6px;background:#f4f5f9;border:1px solid #dcdfe9;color:#8a90a6}#sheet.opal .opbag .plock.on{background:#e6f5f3;border-color:#45b3ab;color:var(--teal-d)}',
    '#sheet.opal .opbag .potnone{font:700 11.5px/1.45 var(--body);color:#5d6580;padding:2px 0}',
    '#sheet.opal .opbag .pnote{border-top:0;padding-top:4px;font:700 10.5px/1.4 var(--body);color:#8a90a6}#sheet.opal .opbag .pnote .plocknote{width:16px;height:16px}',
    // 버튼 줄: 레벨업은 청록 주 버튼으로 넓게, 나머지는 진주색 보조 2×2
    '#sheet.opal .bagbtns{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 10px}#sheet.opal .bagbtns .tr{grid-column:auto;white-space:normal}#sheet.opal .bagbtns>.btn{white-space:normal}',
    '#sheet.opal .bgrid .bcell.none{filter:none}#sheet.opal .bgrid .bcell.none>*:not(.tg):not(.blv):not(.bn){filter:grayscale(.8) opacity(.45)}',
    '#sheet.opal .bagbtns>.buy{grid-column:1/-1;min-height:52px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:10px;font:400 19px var(--display)}',
    '#sheet.opal .bagbtns>.buy small{font:400 19px var(--display)}#sheet.opal .bagbtns>.buy span{font-size:16px;display:inline-flex;align-items:center;gap:4px}',
    '#sheet.opal .bagbtns>.buy::before,#sheet.opal .bagbtns>.buy::after{content:"✦";font-size:11px;opacity:.85}',
    '#sheet.opal .bagbtns>.btn{min-height:46px;padding:4px 4px;border-radius:14px;font:800 13px var(--body);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;line-height:1.15}',
    '#sheet.opal .bagbtns>.btn small{font:700 10px/1.25 var(--body);color:#7a8199;text-align:center}#sheet.opal .bagbtns>.btn.off small{color:#a3a8b8}',
    '#sheet.opal .bagbtns .tr small{display:block}#sheet.opal .bagbtns .tr .trcost .coin{width:11px;height:11px}',
    '#sheet.opal .bagbtns .pot span{font-size:13px}',
    '#sheet.opal .bagacts{margin:10px 0}',
    // 목록 칸: 진주 타일, 고른 칸만 청록 테두리 + 체크
    '#sheet.opal .bgrid{gap:8px}',
    '#sheet.opal .bgrid .bcell{background:linear-gradient(180deg,#fff,#f2f3f8)!important;border-radius:14px!important;box-shadow:inset 0 0 0 1px #dfe2ec,0 2px 0 #e3e5ee,0 4px 8px -5px rgba(60,70,120,.3)!important}',
    '#sheet.opal .bgrid .bcell .tg{color:var(--navy);font:800 10.5px var(--body)}#sheet.opal .bgrid .bcell .tg{background:none;text-shadow:none}',
    '#sheet.opal .bgrid .bcell::before{content:"";position:absolute;left:14%;right:14%;bottom:20%;height:9%;border-radius:50%;background:radial-gradient(closest-side,rgba(40,50,100,.22),transparent)}',
    '#sheet.opal .bgrid .bcell.sel{box-shadow:inset 0 0 0 2px #45b3ab,0 0 0 3px rgba(120,210,200,.3),0 2px 0 #cfe3e1!important}',
    '#sheet.opal .bgrid .bcell.sel::after{content:"✓";position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:var(--teal);color:#fff;font:900 11px/18px var(--body);text-align:center;box-shadow:0 0 0 1.5px #fff}',
    '#sheet.opal .bgrid .bcell.none{background:#f3f4f8!important;box-shadow:inset 0 0 0 1px #e3e5ee!important}',
    '#sheet.opal .bgrid .bcell .blv,#sheet.opal .bgrid .bcell .bn{color:var(--navy);text-shadow:none}',
    '#sheet.opal .bgrid .bcell.eq .E{background:var(--teal);color:#fff}',
    '#sheet.opal .codexbar{background:rgba(255,255,255,.82);box-shadow:inset 0 0 0 1px #e1e4ee}#sheet.opal .codexbar span{color:var(--navy)}#sheet.opal .codexbar b{color:#1f7a74}',
    // ---- 장비 2차 대조 (2026-11-16): 효과·잠재력 두 상자, 레벨업 + 글씨 행동 한 줄, 종류 탭 한 줄, 아래 하위 탭 ----
    '#sheet.opal .bagtop.opbag{grid-template-rows:auto auto 1fr}',
    '#sheet.opal .opbag .gstage{grid-row:1/4;height:268px}',
    '#sheet.opal .opbag .gpot{grid-column:2;background:rgba(255,255,255,.82)!important;border-radius:14px!important;box-shadow:inset 0 0 0 1px #e1e4ee,inset 0 -8px 14px -12px rgba(80,90,140,.3)!important;padding:6px 10px 6px!important}',
    '#sheet.opal .opbag .bdetail{padding:2px 10px}',
    '#sheet.opal .opbag .ef:last-child{border-bottom:0}',
    '#sheet.opal .opbag .potline:last-child{border-bottom:0}',
    '#sheet.opal .gstage .ns-neb{inset:-2% -5% 18px -5%}',
    '#sheet.opal .gstage .ns-ped{left:2%;right:2%;height:40px;bottom:10px}',
    '#sheet.opal .bagbtns{grid-template-columns:minmax(0,1.7fr) repeat(4,minmax(0,1fr))!important;gap:0!important;align-items:center;margin:0 0 4px}',
    '#sheet.opal .bagbtns>.buy{grid-column:auto!important;min-height:48px;margin-right:6px;padding:2px 8px;font:400 16px var(--display)!important;flex-direction:column!important;gap:0!important}',
    '#sheet.opal .bagbtns>.buy{border-radius:999px!important;flex-direction:row!important;flex-wrap:wrap;align-content:center;column-gap:6px!important;row-gap:0!important;padding:4px 10px!important}',
    '#sheet.opal .bagbtns>.buy::before,#sheet.opal .bagbtns>.buy::after{content:none}',
    '#sheet.opal .bagbtns>.buy small::before{content:"✦ ";font-size:11px}#sheet.opal .bagbtns>.buy small::after{content:" ✦";font-size:11px}#sheet.opal .bagbtns>.buy span{flex-basis:100%;justify-content:center}',
    '#sheet.opal .bagbtns>.buy small{font:400 16px/1.1 var(--display)!important}#sheet.opal .bagbtns>.buy span{font:800 12px var(--body)!important}#sheet.opal .bagbtns>.buy .coin{width:13px;height:13px}',
    '#sheet.opal .bagbtns>.btn{min-height:46px;background:none!important;box-shadow:none!important;border-radius:0;font:800 14px var(--body)!important;color:var(--navy);position:relative;padding:2px 2px}',
    '#sheet.opal .bagbtns>.btn+.btn::before{content:"";position:absolute;left:0;top:28%;bottom:28%;width:1px;background:#d3d7e4}',
    '#sheet.opal .bagbtns>.btn.on{color:var(--teal-d)!important}#sheet.opal .bagbtns>.btn.off{color:#a3a8b8!important}',
    '#sheet.opal .bagbtns>.btn small{font:700 10.5px var(--body)!important;color:#6b738c}#sheet.opal .bagbtns>.btn small .gem{display:inline-block;width:11px;height:11px;vertical-align:-1px;margin-right:1px}',
    '#sheet.opal .trhint{margin:0 2px 10px;text-align:right;font:700 11px var(--body);color:#7a8199}#sheet.opal .trhint .trcost{display:inline-flex;align-items:center;gap:2px}#sheet.opal .trhint .coin{width:12px;height:12px;display:inline-block}#sheet.opal .trhint .gn,#sheet.opal .trhint .gn small{font:inherit;color:inherit;display:inline}',
    '#sheet.opal .kindtabs[role=tablist]:not(.rgroup){display:grid;grid-template-columns:repeat(7,minmax(0,1fr));overflow:visible}#sheet.opal .kindtabs[role=tablist]:not(.rgroup) button{min-width:0;padding:10px 0 12px;font-size:13px;white-space:nowrap}',
    '#sheet.opal .bagacts .btn{border-radius:999px;min-height:44px;display:flex;align-items:center;justify-content:center;gap:6px;font:800 14px var(--body)}#sheet.opal .opsp{font-style:normal;color:#8a95d0;font-size:15px}',
    '#sheet.opal .opbag .gstage{height:244px;padding-top:20px}',
    '#sheet.opal .gstage .ns-neb{inset:0 -9% 16px -9%}',
    '#sheet.opal .opbag .glv small{font-size:11px;color:#8a90a6}',
    '#sheet.opal .opbag .gsub{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;font:700 11px var(--body);color:#6b738c}',
    '#sheet.opal .opbag .gsub em{font-style:normal;padding:1px 7px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1.2px color-mix(in srgb,var(--gc) 70%,#fff);color:var(--navy);font-weight:800}',
    '#sheet.opal .opbag .gsub b{padding:1px 7px;border-radius:999px;background:var(--teal);color:#fff;font:800 11px var(--body)!important}',
    '#sheet.opal .opbag .gstage{height:228px}',
    '#sheet.opal .bgrid .bcell{padding:0!important}',
    '#sheet.opal .bgrid .bcell .gcimg{position:absolute;z-index:1;left:16%;top:20%;width:68%;height:54%;object-fit:contain;filter:drop-shadow(0 3px 3px rgba(30,40,90,.3))}',
    '#sheet.opal .bgrid .bcell::before{bottom:22%}',
    '#sheet.opal .gstage .ns-obj>*{max-height:176px}',
    '#sheet.opal .bgrid .bcell.none .gcimg{filter:grayscale(.85) opacity(.45)}',
    '#sheet.opal .bgrid .bcell .tg{position:absolute;left:6px;top:4px;font:800 10.5px var(--body)!important;color:var(--navy)!important}',
    '#sheet.opal .bgrid .bcell .blv{position:absolute;left:0;right:0;bottom:4px;text-align:center;font:800 11px var(--body);color:var(--navy)}#sheet.opal .bgrid .bcell .bn{position:absolute;right:6px;top:4px;bottom:auto;font:700 10px var(--body);color:#8a90a6}',
    '#sheet.opal .bgrid .bcell.sel .bn{right:24px}',
    '#sheet.opal .bgrid .bcell .E{position:absolute;left:auto;right:4px;bottom:20px;top:auto;width:16px;height:16px;font:900 10px/16px var(--body)}',
    '#sheet.opal .opbag .pnote{display:block;text-align:right}#sheet.opal .opbag .pnote .gem{display:inline-block;width:11px;height:11px;vertical-align:-1px}',
    '#sheet.opal .ballg{grid-column:1/-1;min-height:40px;border:0;border-radius:999px;background:transparent;color:#52669a;font:800 12.5px var(--body);box-shadow:inset 0 0 0 1px #d6dbe8}',
    // ---- 성운 판을 쓰는 다른 장치들 (같은 재료) ----
    '#sheet.opal .dvstands,#sheet.opal .rk-ring,#sheet.opal .opboard,#sheet.opal .runering,#sheet.opal .sgshelf,#sheet.opal .opdev{position:relative;isolation:isolate}',
    '#sheet.opal .dvstands>.ns-neb,#sheet.opal .opboard>.ns-neb,#sheet.opal .sgshelf>.ns-neb{inset:0}',
    '#sheet.opal .dvstands>.ns-stars,#sheet.opal .opboard>.ns-stars,#sheet.opal .sgshelf>.ns-stars,#sheet.opal .rk-ring>.ns-stars,#sheet.opal .runering>.ns-stars,#sheet.opal .opdev>.ns-stars{z-index:-1}',
    // 유물
    '#sheet.opal .rlstage{grid-template-columns:150px minmax(0,1fr)!important;background:transparent!important;box-shadow:none!important;padding:0!important}',
    '#sheet.opal .rstage{height:170px;padding-bottom:30px}#sheet.opal .rstage .ns-obj>img,#sheet.opal .rstage .ns-obj>svg{width:96px;height:96px}',
    '#sheet.opal .rlstage .rl-info{background:rgba(255,255,255,.82);border-radius:14px;box-shadow:inset 0 0 0 1px #e1e4ee;padding:10px 12px}',
    '#sheet.opal .rlstage.none .ns-obj>*{filter:grayscale(.9) brightness(1.15) opacity(.55)}',
    // 삼신기: 세 받침을 한 성운 판에
    '#sheet.opal .dvstands{background:transparent!important;box-shadow:none!important;padding:16px 4px 6px!important}',
    '#sheet.opal .dvstands>.ns-neb{inset:0 0 10px 0;border-radius:44% 44% 30% 30%/60% 60% 40% 40%}',
    '#sheet.opal .dvstand{background:transparent!important;box-shadow:none!important}#sheet.opal .dvstand b,#sheet.opal .dvstand small{color:#fff;text-shadow:0 1px 3px rgba(30,40,90,.6)}',
    '#sheet.opal .dv-fig{width:82px;height:96px}#sheet.opal .dv-fig>img,#sheet.opal .dv-fig>svg{width:70px;height:70px;filter:drop-shadow(0 5px 5px rgba(20,30,80,.4))}',
    '#sheet.opal .dv-fig>i{height:18px;bottom:0;background:radial-gradient(ellipse 46% 40% at 50% 40%,rgba(120,220,210,.5),transparent 70%),linear-gradient(180deg,#fff,#d9deeb);box-shadow:0 6px 8px -3px rgba(30,40,90,.45),inset 0 -3px 0 #c7cde0}',
    '#sheet.opal .dvstand.sel{box-shadow:inset 0 0 0 2px #45b3ab,0 0 0 3px rgba(120,210,200,.35)!important;background:rgba(255,255,255,.18)!important}',
    '#sheet.opal .dlist .dcard{background:rgba(255,255,255,.86)!important;box-shadow:inset 0 0 0 1px #e1e4ee!important}',
    '#sheet.opal .dlist .dcard .dicon{display:none}',
    // 연금술: 가마솥 전시
    '#sheet.opal .opalch{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)!important;background:transparent!important;box-shadow:none!important;padding:0!important}',
    '#sheet.opal .opcaul{height:auto}#sheet.opal .astage{height:190px;width:100%;padding-bottom:30px}#sheet.opal .astage .cl-glass{width:120px;height:120px;background:none}#sheet.opal .astage .cl-glass img{filter:none}',
    '#sheet.opal .astage .bub{top:30px}',
    '#sheet.opal .al-lv{background:rgba(255,255,255,.82);border-radius:14px;box-shadow:inset 0 0 0 1px #e1e4ee;padding:10px 12px}#sheet.opal .al-lv b{background:none;box-shadow:none;padding:0}',
    '#sheet.opal .pcard{background:rgba(255,255,255,.86)!important}',
    '#sheet.opal .pbot{position:relative;width:76px;height:76px;border-radius:0;background:radial-gradient(50% 46% at 50% 46%,rgba(100,136,214,.55),rgba(150,174,230,.3) 60%,transparent 72%)}',
    '#sheet.opal .pbot::after{content:"";position:absolute;left:12%;right:12%;bottom:2px;height:10px;border-radius:50%;background:linear-gradient(180deg,#fff,#d9deeb);box-shadow:0 4px 6px -2px rgba(30,40,90,.4);z-index:-1}',
    '#sheet.opal .pbot img{filter:drop-shadow(0 4px 4px rgba(30,40,90,.35))}',
    // 승급: 성운 원판 + 가운데 훈장 전시물
    '#sheet.opal .oprank{background:transparent!important;box-shadow:none!important;padding:4px 0!important}',
    '#sheet.opal .rk-ring>.ns-neb{inset:-4%;border-radius:50%}',
    '#sheet.opal .rk-paths line{stroke:rgba(255,255,255,.55)}#sheet.opal .rk-paths line.on{stroke:#8ff0e0;stroke-width:3}',
    '#sheet.opal .rk-medal{background:none!important;box-shadow:none!important;width:42%;display:block}#sheet.opal .rk-medal::before{content:none!important}',
    '#sheet.opal .rk-obj{position:relative;z-index:1;display:block;width:100%;animation:opFloat 3.2s ease-in-out infinite}#sheet.opal .rk-obj svg{width:100%;height:auto;display:block;filter:drop-shadow(0 6px 6px rgba(20,30,80,.45))}',
    '#sheet.opal .rk-ped{position:absolute;left:8%;right:8%;bottom:-8%;height:18%;border-radius:50%;background:radial-gradient(ellipse 46% 40% at 50% 40%,rgba(120,220,210,.55),transparent 70%),linear-gradient(180deg,#fff,#dfe3ee);box-shadow:inset 0 -4px 0 #c5cbde,0 8px 10px -4px rgba(20,30,80,.5)}',
    '#sheet.opal .rk-name{display:flex;flex-direction:column;align-items:center;margin:8px 0 2px}#sheet.opal .rk-name b{font:400 18px var(--display);color:var(--navy)}#sheet.opal .rk-name small{font:700 12px var(--body);color:#5d6580}',
    '#sheet.opal .rk-sock{background:radial-gradient(circle at 40% 28%,#fff 0 20%,#eef1f8 60%,#d9deec)!important}',
    '#sheet.opal .rk-sum{background:rgba(255,255,255,.82);border-radius:14px;box-shadow:inset 0 0 0 1px #e1e4ee;padding:8px 12px;margin-top:8px}',
    '#sheet.opal .oprankup{background:rgba(255,255,255,.86)!important;box-shadow:inset 0 0 0 1px #e1e4ee!important}',
    // 특성: 별자리 판
    '#sheet.opal .opboard{border-radius:22px;padding:14px 6px 10px!important;margin:4px 0 10px}',
    '#sheet.opal .opboard>.ns-neb{border-radius:22px;-webkit-mask:none!important;mask:none!important}',
    '#sheet.opal .opboard .tnode b{background:rgba(255,255,255,.92)}#sheet.opal .opboard .tnode small{color:#fff;text-shadow:0 1px 3px rgba(20,30,80,.7);font-weight:800}',
    '#sheet.opal .opboard .tnode .ti{position:relative}#sheet.opal .opboard .tnode .ti::after{content:"";position:absolute;left:4%;right:4%;bottom:-7px;height:10px;border-radius:50%;background:linear-gradient(180deg,#fff,#cfd5e6);box-shadow:0 4px 6px -2px rgba(20,30,80,.5);z-index:-1}',
    '#sheet.opal .opboard .tnode.sel .ti{box-shadow:inset 0 0 0 1.5px #fff,0 0 0 2.5px #45b3ab,0 0 0 6px rgba(120,210,200,.35),0 10px 12px -4px rgba(20,30,80,.45)}',
    '#sheet.opal .opboard .tlink>i{background:linear-gradient(90deg,transparent,rgba(255,255,255,.7))}#sheet.opal .opboard .tlink>i:last-child{background:linear-gradient(90deg,rgba(255,255,255,.7),transparent)}',
    '#sheet.opal .opboard .tlink.ok>i{background:linear-gradient(90deg,transparent,#8ff0e0)}#sheet.opal .opboard .tlink.ok>i:last-child{background:linear-gradient(90deg,#8ff0e0,transparent)}',
    '#sheet.opal .opboard .tclabel{text-shadow:0 1px 2px rgba(255,255,255,.8)}',
    '#sheet.opal .tinfo{background:rgba(255,255,255,.88)!important;box-shadow:inset 0 0 0 1px #e1e4ee!important}',
    // 마나서클: 3D 장치 뒤 성운
    '#sheet.opal .opdev{background:none!important}#sheet.opal .opdev>.ns-neb{inset:2% 2% 10% 2%}#sheet.opal .opdev canvas{z-index:1}',
    '#sheet.opal .ocname{background:rgba(255,255,255,.92)}',
    '#sheet.opal .oeff p{background:rgba(255,255,255,.86)}',
    // 룬·신성력 판
    '#sheet.opal .runering{background:transparent!important;box-shadow:none!important}#sheet.opal .runering>.ns-neb{inset:-3%;border-radius:50%}',
    '#sheet.opal .runering .rlines line{opacity:.9}',
    '#sheet.opal .sgshelf{background:transparent!important;box-shadow:none!important}#sheet.opal .sgshelf>.ns-neb{border-radius:22px;-webkit-mask:none!important;mask:none!important}',
    // 스킬: 네 소켓을 성운 전시 띠 위에
    '#sheet.opal .skstage{position:relative;isolation:isolate;padding:12px 8px 14px;margin:2px 0 10px}#sheet.opal .skstage>.ns-neb{inset:0;border-radius:22px;-webkit-mask:none!important;mask:none!important}',
    '#sheet.opal .skstage .skflow{color:#fff;text-shadow:0 1px 2px rgba(20,30,80,.6)}#sheet.opal .skstage .skflow i{color:#dfe6ff}#sheet.opal .skstage .skflow i.back{color:#9ff0e2}',
    '#sheet.opal .skstage .slotpick{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.9),inset 0 -6px 0 color-mix(in srgb,var(--c,#9fb0d8) 55%,#fff),0 6px 10px -3px rgba(20,30,80,.5)}',
    '#sheet.opal .skstage .slotcard.on .slotpick{box-shadow:inset 0 0 0 2.5px #45b3ab,0 0 0 4px rgba(120,210,200,.35),inset 0 -6px 0 color-mix(in srgb,var(--c,#9fb0d8) 55%,#fff)}',
    '#sheet.opal .skstage .slotout{background:rgba(255,255,255,.9)}',
    // 성장: 「지금 → 다음」을 한 줄로 (작은 상자 여러 개 대신)
    '#sheet.opal .row.grow .glines{display:flex!important;flex-wrap:wrap;align-items:baseline;gap:2px 6px;background:none!important;box-shadow:none!important;padding:4px 0 0!important}',
    '#sheet.opal .row.grow .glines b{background:none!important;box-shadow:none!important;padding:0!important;font:700 11px var(--body)!important;color:#8a90a6!important}',
    '#sheet.opal .row.grow .glines span{font:800 14px var(--body);color:var(--navy)}',
    '#sheet.opal .row.grow .glines b.gl-next::before{content:"→";margin:0 4px 0 2px;color:#9aa3b8;font-size:13px}',
    '#sheet.opal .row.grow .glines b.gl-next+span{color:#1f7a74!important}',
    '#sheet.opal .row.grow .glines b.gl-max,#sheet.opal .row.grow .glines b.gl-over,#sheet.opal .row.grow .glines b.gl-dmg{flex-basis:100%;height:0;overflow:visible;margin-top:2px}',
    '#sheet.opal .row.grow .glines b.gl-max+span,#sheet.opal .row.grow .glines b.gl-over+span,#sheet.opal .row.grow .glines b.gl-dmg+span{font:700 11.5px var(--body);color:#6b738c}',
    '#sheet.opal .row.grow{background:rgba(255,255,255,.86)!important;box-shadow:inset 0 0 0 1px #e1e4ee,inset 0 -8px 14px -12px rgba(80,90,140,.3)!important}',
    // ==== 시안 대조 3차 (2026-11-16, 사용자: 원이며 밖에 색상이며 다르다) ====
    // 전시 성운 = 위가 둥근 유리 돔(아래는 받침까지 곧게), 가장자리 얇은 밝은 테두리. 흐린 원형 마스크 없음
    // 시안 대조 4차: 성운은 닫힌 도형이 아니라 가장자리가 부드럽게 퍼지는 구름 덩어리 (위는 둥글게, 아래는 구름으로)
    '#sheet.opal .opstage>.ns-neb{inset:-4% -10% 8px -10%!important;border-radius:0!important;-webkit-mask:radial-gradient(52% 58% at 50% 50%,#000 58%,rgba(0,0,0,.7) 72%,transparent 100%)!important;mask:radial-gradient(52% 58% at 50% 50%,#000 58%,rgba(0,0,0,.7) 72%,transparent 100%)!important}',
    '#sheet.opal .gstage>.ns-neb{inset:-6% -16% 4px -22%!important}',
    // 받침: 넓고 두껍게, 앞 가운데 작은 반짝임
    '#sheet.opal .opstage .ns-ped{height:46px!important;bottom:8px!important}',
    '#sheet.opal .gstage .ns-ped{left:-2%!important;right:-2%!important}',
    '#sheet.opal .opstage .ns-ped::before{height:58%!important}#sheet.opal .opstage .ns-ped::after{top:28%!important}',
    '#sheet.opal .opstage .ns-ped>i::after{content:"✦";position:absolute;left:50%;bottom:-18px;translate:-50% 0;font-size:13px;color:#fff3c8;text-shadow:0 0 6px #ffe7a0,0 0 2px #fff}',
    // 제목 크게, 양옆 선 길게
    '#sheet.opal .sheet-head b{font-size:27px!important;letter-spacing:2px}',
    '#sheet.opal .sheet-head b::before{padding-left:70px!important;background-size:64px 1.2px!important}#sheet.opal .sheet-head b::after{padding-right:70px!important;background-size:64px 1.2px!important}',
    // 레벨업: 넓은 알약
    '#sheet.opal .bagbtns{grid-template-columns:minmax(0,2.3fr) repeat(4,minmax(0,1fr))!important}',
    // 패널 바깥: 라벤더·분홍 안개가 섞인 진주 바탕 + 두꺼운 흰 진주 테두리
    '#sheet.opal{background-color:#efeaf6!important;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'90\' height=\'60\'%3E%3Cg fill=\'none\' stroke=\'%239aa3c8\' stroke-width=\'.8\' opacity=\'.8\'%3E%3Cpolyline points=\'6,40 22,30 40,34 56,18\'/%3E%3C/g%3E%3Cg fill=\'%239aa3c8\'%3E%3Ccircle cx=\'6\' cy=\'40\' r=\'1.4\'/%3E%3Ccircle cx=\'22\' cy=\'30\' r=\'1.4\'/%3E%3Ccircle cx=\'40\' cy=\'34\' r=\'1.4\'/%3E%3Ccircle cx=\'56\' cy=\'18\' r=\'1.6\'/%3E%3C/g%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'90\' height=\'60\'%3E%3Cg fill=\'none\' stroke=\'%239aa3c8\' stroke-width=\'.8\' opacity=\'.8\'%3E%3Cpolyline points=\'84,44 66,30 50,36 34,22\'/%3E%3C/g%3E%3Cg fill=\'%239aa3c8\'%3E%3Ccircle cx=\'84\' cy=\'44\' r=\'1.4\'/%3E%3Ccircle cx=\'66\' cy=\'30\' r=\'1.4\'/%3E%3Ccircle cx=\'50\' cy=\'36\' r=\'1.4\'/%3E%3Ccircle cx=\'34\' cy=\'22\' r=\'1.6\'/%3E%3C/g%3E%3C/svg%3E"),radial-gradient(40% 22% at 8% 18%,rgba(214,196,240,.75),transparent 70%),radial-gradient(36% 20% at 96% 30%,rgba(238,206,232,.7),transparent 70%),radial-gradient(44% 24% at 0% 64%,rgba(206,196,242,.6),transparent 70%),radial-gradient(40% 22% at 100% 78%,rgba(232,200,234,.6),transparent 70%),radial-gradient(60% 30% at 50% 100%,rgba(214,204,244,.6),transparent 70%),linear-gradient(180deg,#f3eff8,#ece7f5)!important;background-position:6px 6px,calc(100% - 6px) 6px,0 0,0 0,0 0,0 0,0 0,0 0!important;background-size:90px 60px,90px 60px,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%!important;background-repeat:no-repeat!important;box-shadow:inset 0 0 0 4px rgba(255,255,255,.92),inset 0 0 0 5.5px #d8d1ea,inset 0 6px 14px rgba(255,255,255,.7),0 -14px 30px rgba(40,40,80,.28)!important}',
    '#sheet.opal #opTabs{background:linear-gradient(180deg,rgba(239,234,246,0),#ece7f5 30%)}',
    '#sheet.opal .bdetail,#sheet.opal .opbag .gpot,#sheet.opal .cs-eff2,#sheet.opal .row.grow,#sheet.opal .codexbar{background:rgba(255,255,255,.72)!important}',
    '#sheet.opal .subtabs,#sheet.opal .kindtabs{background:rgba(255,255,255,.7)!important}',
    // ==== 시안 대조 5차: 승인 이미지에서 잘라 만든 성운·받침대 그림 사용 (tools/cut-opal-ui.py → art/opal-neb.webp, art/opal-ped.webp) ====
    '#sheet.opal .ns-neb{background:url(art/opal-neb.webp) 50% 100%/100% 100% no-repeat!important;-webkit-mask:none!important;mask:none!important;border-radius:0!important}',
    '#sheet.opal .ns-neb::after{content:none!important}',
    '#sheet.opal .opstage>.ns-neb{inset:-2% -6% 26px -6%!important;-webkit-mask:none!important;mask:none!important}',
    '#sheet.opal div>.ns-neb{-webkit-mask:none!important;mask:none!important}',
    '#sheet.opal .cstage .ns-ped{left:10%!important;right:10%!important}',
    // 물체 바닥 = 받침 윗면 가운데 (받침 그림 윗면 중심은 위에서 30%): 바닥에서 8px + 받침 높이의 70%
    '#sheet.opal .opstage .ns-ped{height:auto!important}',   // 폭에서 높이를 (271:72)
    // 코스튬 전시 = 시안 실측 (2026-11-16): 돔 폭 패널의 0.88·높이 150 넓은 타원, 받침 윗면 = 돔 꼭대기 + 160, 캐릭터 약 175px
    '#sheet.opal#sheet.opal .cstage{height:194px!important;padding:0 8px 0!important}',   // 시안: 받침대가 얇아서 이름 줄이 18px 위
    // 코스튬 성운 = 시안 윤곽(넓은 아치, 어깨가 둥근)에 줄마다 맞춘 art/opal-neb-cos2.webp (385.8×193.5, 시트 기준 (2.6, 38.4))
    '#sheet.opal#sheet.opal .cstage>.ns-neb{inset:auto!important;top:-12.6px!important;left:-13.4px!important;width:385.8px!important;height:193.5px!important;background:url(art/opal-neb-cos2.webp) 0 0/100% 100% no-repeat!important}',
    '#sheet.opal .cstage>.ns-neb::before,#sheet.opal .cstage>.ns-neb::after{-webkit-mask:url(art/opal-neb-cos2.webp) 0 0/100% 100% no-repeat;mask:url(art/opal-neb-cos2.webp) 0 0/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .cstage .ns-ped{left:50%!important;right:auto!important;width:336.3px!important;margin-left:-168.2px;bottom:-18.1px!important;aspect-ratio:951/141.2!important;background-image:url(art/opal-ped-w.webp)!important}',   // 시안 받침대: 하얀 진주빛·청록 고리·금색 ✦·빛무리 (art/opal-ped-w.webp, 받침 290px), 세로 0.66   // 시안 받침대: 윗면·옆면 모두 납작 (세로 0.66)
    // 코스튬 새 원화 (2026-11-16): 캔버스 그대로 192px (시안 「오색 별빛 마녀」 겹침 실측: 배율 0.235, 발이 받침대 윗면 앞쪽 y 233),
    // 가운데는 시안처럼 4.5px 왼쪽. 발은 고정한 채 숨쉬듯 아주 조금 커졌다 작아지고(발 기준), 둘레로 작은 별이 떠오름
    '#sheet.opal#sheet.opal .cstage.cosnew .ns-obj{bottom:4px;animation:none}',
    '#sheet.opal#sheet.opal .cstage .ns-obj>img.cosart{height:192px!important;width:192px!important;max-width:none;object-fit:contain;transform-origin:50% 96%;transform:translate(-4.5px,var(--fy,0%));animation:opBreath 3.8s ease-in-out infinite;filter:drop-shadow(0 3px 4px rgba(60,50,110,.18))}',
    '@keyframes opBreath{0%,100%{transform:translate(-4.5px,var(--fy,0%)) scale(1,1)}50%{transform:translate(-4.5px,var(--fy,0%)) scale(1.012,1.022)}}',
    '#sheet.opal .cstage.cosnew .ns-obj::before,#sheet.opal .cstage.cosnew .ns-obj::after{content:"";position:absolute;left:50%;bottom:30px;width:230px;height:170px;margin-left:-119px;pointer-events:none;z-index:2;background:radial-gradient(1.8px 1.8px at 12% 80%,#fff,transparent),radial-gradient(1.4px 1.4px at 30% 92%,#fff6d8,transparent),radial-gradient(2px 2px at 78% 86%,#fff,transparent),radial-gradient(1.5px 1.5px at 92% 70%,#e8f4ff,transparent),radial-gradient(1.3px 1.3px at 58% 96%,#fff,transparent);animation:opRise 4.2s linear infinite}',
    '#sheet.opal .cstage.cosnew .ns-obj::after{animation-delay:-2.1s;transform:scaleX(-1)}',
    '@keyframes opRise{0%{opacity:0;translate:0 0}20%{opacity:1}80%{opacity:.8}100%{opacity:0;translate:0 -60px}}',
    '#sheet.opal#sheet.opal .cs-name{position:relative;justify-content:center;min-height:28px;align-items:center}',
    '#sheet.opal#sheet.opal .cs-name .cb{position:absolute;right:4px;top:50%;transform:translateY(-50%);margin:0;padding:3px 12px 3px 10px;background:none!important;box-shadow:none!important;border:0 solid transparent;border-image:url(art/opal-pearl.webp) 23 23 23 23 fill / 50% 11px stretch;font:700 12px/1.25 var(--body);color:var(--navy)}',
    '#sheet.opal#sheet.opal .cs-name.long{padding-right:84px}#sheet.opal#sheet.opal .cs-name.long b{font-size:18px!important}',   // 긴 이름(9자 이상)은 오른쪽 알약과 안 겹치게
    '#sheet.opal#sheet.opal .cs-name .cb.wear{color:#1f6d68}#sheet.opal#sheet.opal .cs-name .cb i{font-style:normal;color:#5d6487;font-size:10px;margin-right:6px}',
    '#sheet.opal#sheet.opal .cstage .ns-obj{position:absolute;left:0;right:0;bottom:30px;display:grid;place-items:end center}#sheet.opal#sheet.opal .cstage .ns-obj>img{height:178px!important}',
    // 성장: 지금 → 다음 한 줄, 최대·돌파·피해는 그 아래 줄 (라벨 + 값)
    '#sheet.opal .row.grow .glines{display:grid!important;grid-template-columns:auto auto auto minmax(0,1fr);column-gap:6px;row-gap:2px;align-items:baseline}',
    '#sheet.opal .row.grow .glines b.gl-max,#sheet.opal .row.grow .glines b.gl-over,#sheet.opal .row.grow .glines b.gl-dmg{grid-column:1;flex-basis:auto;height:auto;margin:0}',
    '#sheet.opal .row.grow .glines b.gl-max+span,#sheet.opal .row.grow .glines b.gl-over+span,#sheet.opal .row.grow .glines b.gl-dmg+span{grid-column:2/-1}',
    // 승급 훈장·삼신기·물약 받침도 잘라낸 진주 받침 그림
    '#sheet.opal .rk-ped,#sheet.opal .dv-fig>i{background:url(art/opal-ped.webp) 50% 50%/100% 100% no-repeat!important;box-shadow:none!important;border-radius:0!important;height:auto!important;aspect-ratio:820/188}',
    '#sheet.opal .rk-ped{bottom:-14%!important;left:2%!important;right:2%!important}',
    '#sheet.opal .dv-fig>i{left:0!important;right:0!important;bottom:-2px!important}',
    '#sheet.opal .pbot::after{background:url(art/opal-ped.webp) 50% 50%/100% 100% no-repeat!important;box-shadow:none!important;border-radius:0!important;height:auto!important;aspect-ratio:820/188;left:4%!important;right:4%!important;bottom:-6px!important}',
    '#sheet.opal .gstage .ns-obj{width:82%!important}#sheet.opal .gstage .ns-obj>*{max-height:158px!important}',
    '#sheet.opal .gstage>.ns-neb{inset:-4% -6% 24px -2%!important}#sheet.opal .gstage .ns-ped{left:-1%!important;right:-6%!important}',
    '#sheet.opal .cstage{padding-bottom:56px!important}',
    '#sheet.opal .gstage{padding-bottom:44px!important}#sheet.opal .gstage .ns-ped{left:-8%!important;right:-8%!important}',
    '#sheet.opal .gstage>.ns-neb{inset:-4% -8% 24px -8%!important}',
    '#sheet.opal .rstage{padding-bottom:40px!important}#sheet.opal .astage{padding-bottom:40px!important}',
    '#sheet.opal .cs-name .cb{margin-left:4px;align-self:center}',
    '#sheet.opal .cstage .ns-obj>img{height:220px!important;image-rendering:auto}',
    '#sheet.opal .gstage>.ns-neb{inset:-4% -12% 24px -14%!important}',
    '#sheet.opal .opboard>.ns-neb,#sheet.opal .sgshelf>.ns-neb,#sheet.opal .skstage>.ns-neb,#sheet.opal .dvstands>.ns-neb{background-size:cover!important;background-position:50% 30%!important;border-radius:22px!important}',
    '#sheet.opal .rk-ring>.ns-neb,#sheet.opal .runering>.ns-neb{background-size:cover!important;background-position:50% 40%!important;border-radius:50%!important}',
    '#sheet.opal .ns-stars{display:none}',   // 별·별자리는 그림 안에 있음
    // 받침대 = 잘라낸 진주 원판 그림 (가로:세로 271:72) + 아래 접촉 그림자
    '#sheet.opal .ns-ped{height:auto!important;aspect-ratio:820/188;background:url(art/opal-ped.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal .ns-ped::before{content:none!important}',
    '#sheet.opal .ns-ped::after{content:""!important;top:auto!important;bottom:-6px!important;left:6%!important;right:6%!important;height:14px!important;border-radius:50%!important;background:radial-gradient(closest-side,rgba(40,40,90,.32),transparent)!important;box-shadow:none!important;z-index:-1!important}',
    '#sheet.opal .ns-ped>i{display:none}',
    '#sheet.opal .opstage{padding-bottom:calc(var(--pedh,40px) - 6px)}',
    // 아래 하위 탭 막대
    '#opTabs[hidden]{display:none}',
    '#sheet.opal #opTabs{flex:none;padding:6px 12px 8px;background:linear-gradient(180deg,rgba(247,246,251,0),#f4f4f9 30%)}',
    '#sheet.opal #opTabs .subtabs{margin:0;box-shadow:inset 0 0 0 1px var(--pearl-e),0 2px 8px -4px rgba(60,70,120,.3)}',
    '#sheet:not(.opal) #opTabs{display:none}',
    // ---- 코스튬 (승인 시안 오른쪽) ----
    '#sheet.opal .cosstage{display:flex!important;flex-direction:column;gap:8px;padding:0!important;background:none!important;box-shadow:none!important;margin:2px 0 10px}',
    '#sheet.opal .cstage{height:260px;padding-top:8px}#sheet.opal .cstage .ns-obj>img{width:auto;height:220px;max-width:none;animation:none}#sheet.opal .cstage .ns-ped{left:22%;right:22%}',
    '#sheet.opal .cstage>.cb{position:absolute;top:8px;left:10px;z-index:3}',
    '#sheet.opal .cs-name{display:flex;align-items:baseline;justify-content:center;gap:8px}#sheet.opal .cs-name b{font:400 21px var(--display);color:var(--navy)}#sheet.opal .cs-name small{font:800 12px var(--body)}',
    '#sheet.opal .cs-eff2{background:rgba(255,255,255,.82);border-radius:14px;box-shadow:inset 0 0 0 1px #e1e4ee,inset 0 -8px 14px -12px rgba(80,90,140,.3);padding:2px 12px}',
    '#sheet.opal .cs-eff2 p{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:8px;align-items:center;margin:0;padding:8px 0;border-bottom:1px solid #e6e8f0;font:800 13px var(--body);color:var(--navy)}#sheet.opal .cs-eff2 p:last-child{border-bottom:0}',
    '#sheet.opal .cs-eff2 i{font-style:normal;color:#8a95bd}#sheet.opal .cs-eff2 em{font:700 12px var(--body);font-style:normal;color:#5d6580;text-align:right}#sheet.opal .cs-eff2 em b,#sheet.opal .cs-eff2 .cs-lvrow b{color:#1f7a74}',
    '#sheet.opal .cs-eff2 .cs-lvrow{grid-template-columns:auto auto minmax(0,1fr)}#sheet.opal .cs-eff2 .cs-st{letter-spacing:1px;color:#e3b24a;text-align:left!important;font-size:13px!important}',
    '#sheet.opal .cosstage .cs-act{display:grid;grid-template-columns:1.3fr 1fr;gap:10px}#sheet.opal .cosstage .cs-act>*{min-height:50px;border-radius:999px;font:400 17px var(--display)}',
    '#sheet.opal .cosstage .cs-act .btn[data-cwear]:not(.on){background:linear-gradient(180deg,#5cbdb5 0%,#3aa49d 48%,#2b928c 100%);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 0 0 1px #2a8781,0 3px 0 var(--teal-d)}',
    '#sheet.opal .cosstage .cs-act .buy[data-cup]{background:linear-gradient(180deg,#fff,#f1f2f7);color:var(--navy);text-shadow:none;box-shadow:inset 0 0 0 1px var(--pearl-e),0 2px 0 #d9dce7}#sheet.opal .cosstage .cs-act .buy[data-cup].off{color:#9aa0b2}',
    '#sheet.opal .ophide,#sheet.opal .ophead h3{display:none!important}',
    '#sheet.opal .opsubh{display:flex;align-items:baseline;gap:6px;margin:2px 2px 6px;font:800 13px var(--body)!important;color:#5d6580!important}#sheet.opal .opsubh::before{display:none}#sheet.opal .opsubh b{color:var(--teal-d)}',
    '#sheet.opal .cosstage{align-items:stretch!important}',
    '#sheet.opal .cstage{height:270px;padding:0 8px 30px}#sheet.opal .cstage .ns-neb{inset:0 -2% 18px -2%}#sheet.opal .cstage .ns-ped{left:16%;right:16%;height:44px;bottom:6px}',
    '#sheet.opal .cstage .ns-obj>img{height:230px}',
    // 의상 목록: 시안처럼 작은 4칸 (라벨·그림·이름), 고른 칸만 청록 테두리 + 체크. 행동은 위 전시의 입기·강화·구매
    '#sheet.opal .cgrid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;margin:10px 0}',
    '#sheet.opal .ccard{padding:22px 3px 6px!important;gap:2px!important;border-radius:14px!important;position:relative}',
    '#sheet.opal .ccard .cdesc,#sheet.opal .ccard .cstars,#sheet.opal .ccard>small,#sheet.opal .ccard .cbtns,#sheet.opal .ccard>.buy,#sheet.opal .ccard .cgrade,#sheet.opal .ccard .cb.mini{display:none!important}',
    '#sheet.opal .ccard .cprevb{background:none}#sheet.opal .ccard .cprevb img{max-width:none;width:100%;aspect-ratio:1;object-fit:contain}',
    '#sheet.opal .ccard>b{font:800 11px/1.2 var(--body)!important;color:var(--navy)!important;word-break:keep-all;text-align:center}',
    '#sheet.opal .cbadge{position:absolute;left:0;top:0;padding:3px 7px;border-radius:13px 0 9px 0;font:800 10px/1.2 var(--body);font-style:normal}',
    '#sheet.opal .cbadge.wear{background:#dff3f0;color:var(--teal-d)}#sheet.opal .cbadge.own{background:#f1f2f7;color:#5d6580}#sheet.opal .cbadge.none{background:#f6eef2;color:#8a3a52}',
    '#sheet.opal .cgrid{gap:8px}#sheet.opal .ccard{background:linear-gradient(180deg,#fff,#f3f4f9)!important;box-shadow:inset 0 0 0 1px #dfe2ec,0 2px 0 #e3e5ee!important}',
    '#sheet.opal .ccard.prev{box-shadow:inset 0 0 0 2px #45b3ab,0 0 0 3px rgba(120,210,200,.3)!important}#sheet.opal .ccard.prev::after{content:"✓";position:absolute;top:4px;right:4px;width:18px;height:18px;border-radius:50%;background:var(--teal);color:#fff;font:900 11px/18px var(--body);text-align:center}',
    '#sheet.opal .ccard.on .cb.mini{background:var(--teal)}',
    // ===================== 시안 틀 그림 (tools/cut-opal-skin.py, 승인 이미지에서 자름) — 맨 마지막이라 위 규칙보다 우선 =====================
    // 패널: 시안 바탕색 + 위 두 모서리(오른쪽 별자리) + 위·왼쪽·오른쪽 진주 테두리 줄
    '#sheet.opal{box-shadow:0 -14px 30px rgba(40,40,80,.28)!important;background:url(art/opal-fr-tl.webp) 0 0/52px 52px no-repeat,url(art/opal-fr-tr.webp) 100% 0/64px 60px no-repeat,url(art/opal-fr-top.webp) 52px 0/4px 17px repeat-x,url(art/opal-fr-l.webp) 0 52px/17px 4px repeat-y,url(art/opal-fr-r.webp) 100% 52px/17px 4px repeat-y,radial-gradient(60% 40% at 50% 45%,#f0eaf7,transparent 80%),linear-gradient(180deg,#e5daea 0%,#e9e5f1 40%,#efe4f5 100%)!important}',
    '#sheet.opal .sheet-head{padding-top:8px}',
    // 효과·정보 상자 = 시안 효과 상자 틀
    '#sheet.opal .bdetail,#sheet.opal .opbag .gpot,#sheet.opal .cs-eff2,#sheet.opal .row,#sheet.opal .codexbar,#sheet.opal .oprankup,#sheet.opal .tinfo,#sheet.opal .al-lv,#sheet.opal .rl-info,#sheet.opal .pcard,#sheet.opal .dlist .dcard,#sheet.opal .oeff p,#sheet.opal .rk-sum,#sheet.opal .rnext,#sheet.opal .skinfo.opsk,#sheet.opal .tpoints,#sheet.opal .sglv,#sheet.opal .potbox,#sheet.opal .shards,#sheet.opal .sghead,#sheet.opal .ocname,#sheet.opal .opflow,#sheet.opal #dock .dockbox,#sheet.opal .cmp{background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-image:url(art/opal-box.webp) 15 fill / 9px stretch!important;border-radius:9px!important}',
    // 청록 주 버튼 = 시안 레벨업 알약 (금빛 테두리), 꺼짐 = 같은 모양 회색
    '#sheet.opal .buy,#sheet.opal .buy.gemb,#sheet.opal .pull.big,#sheet.opal .cosstage .cs-act .btn[data-cwear]:not(.on){background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-image:url(art/opal-teal.webp) 27 27 27 27 fill / 50% 24px stretch!important;border-radius:999px!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.55)!important}',
    '#sheet.opal .buy.off,#sheet.opal .buy.gemb.off,#sheet.opal .pull.big.off{border-image-source:url(art/opal-teal-off.webp)!important;color:#7d8394!important;text-shadow:0 1px 0 rgba(255,255,255,.6)!important}',
    '#sheet.opal .buy:active{transform:translateY(1px)}',
    // 진주 보조 버튼 = 시안 「전부 합성」 알약
    '#sheet.opal .btn,#sheet.opal .pull,#sheet.opal .slotout,#sheet.opal .cosstage .cs-act .buy[data-cup],#sheet.opal .cosstage .cs-act .btn.on,#sheet.opal .ballg{background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-image:url(art/opal-pearl.webp) 23 23 23 23 fill / 50% 22px stretch!important;border-radius:999px!important;color:var(--navy)!important}',
    '#sheet.opal .btn.on,#sheet.opal .cosstage .cs-act .btn.on{color:#1f7a74!important}',
    '#sheet.opal .btn.off,#sheet.opal .pull.off{opacity:.55}',
    '#sheet.opal .cosstage .cs-act .buy[data-cup]{color:var(--navy)!important;text-shadow:none!important}',
    // 글씨 행동(장착|합성|초월|잠재력)은 틀 없이
    '#sheet.opal .bagbtns>.btn{border-image:none!important;border:0!important;background:none!important}',
    // 탭 막대 = 시안 탭 막대 틀, 고른 탭 밑줄 = 시안 밑줄+마름모 그림
    '#sheet.opal .subtabs,#sheet.opal .kindtabs,#sheet.opal .ophead .mulpick{background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-image:url(art/opal-bar.webp) 16 fill / 9px stretch!important;border-radius:9px!important}',
    '#sheet.opal .subtabs button[aria-selected="true"]::before,#sheet.opal .kindtabs button[aria-selected="true"]::before{content:none!important}',
    '#sheet.opal .subtabs button[aria-selected="true"]::after,#sheet.opal .kindtabs button[aria-selected="true"]::after,#sheet.opal .ophead .mulpick .btn.on::after{content:""!important;left:50%!important;right:auto!important;width:46px!important;height:9px!important;margin-left:-23px;bottom:2px!important;border-radius:0!important;background:url(art/opal-tabmark.webp) 50% 50%/100% 100% no-repeat!important}',
    '#sheet.opal .ophead .mulpick .btn{border-image:none!important;border:0!important}',
    // 목록 칸 = 시안 칸 틀 (고른 칸은 청록 틀 + 체크 그림)
    '#sheet.opal .bgrid .bcell,#sheet.opal .ccard{background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-image:url(art/opal-tile.webp) 16 fill / 9px stretch!important;border-radius:9px!important}',
    '#sheet.opal .bgrid .bcell.sel,#sheet.opal .ccard.prev{border-image-source:url(art/opal-tile-sel.webp)!important;box-shadow:0 0 10px rgba(80,190,180,.35)!important}',
    '#sheet.opal .bgrid .bcell.sel::after,#sheet.opal .ccard.prev::after{content:""!important;top:0!important;right:0!important;width:20px!important;height:19px!important;border-radius:0 9px 0 6px!important;background:url(art/opal-check.webp) 50% 50%/100% 100% no-repeat!important;box-shadow:none!important}',
    '#sheet.opal .bgrid .bcell.none{border-image-source:url(art/opal-tile.webp)!important;opacity:.8}',
    // ---- 간격: 시안 치수(폰 390px 환산)대로 — 전시대 198, 효과 줄 23, 잠재력 줄 19, 그 바로 아래 레벨업 줄 ----
    '#sheet.opal .bagtop.opbag{gap:4px 8px!important;margin:0 0 6px!important;grid-template-columns:47% minmax(0,1fr)!important}',
    '#sheet.opal .opbag .gstage{height:206px!important;padding-top:6px!important}',
    '#sheet.opal .opbag .binfo{padding:0 2px!important;gap:0!important}#sheet.opal .opbag .bname b{font-size:19px!important}#sheet.opal .opbag .gstars{font-size:13px;letter-spacing:1.5px;margin:1px 0 2px}',
    '#sheet.opal .opbag .bdetail{padding:3px 9px!important}#sheet.opal .opbag .ef{padding:4px 0!important;font-size:11.5px!important}#sheet.opal .opbag .ef b{font-size:11.5px!important}',
    '#sheet.opal .opbag .gpot{padding:4px 9px 4px!important}#sheet.opal .opbag .pthead{margin:0 0 1px!important;font-size:11.5px!important}',
    // 효과 줄 높이는 글씨 크기와 상관없이 늘 같게 (숫자가 길어져 글씨가 줄어도 줄·칸이 움직이지 않게)
    '#sheet.opal .opbag .ef{height:22px;box-sizing:border-box}#sheet.opal .opbag .ef>*{line-height:14px!important}',
    '#sheet.opal .opbag .potline{grid-template-columns:auto minmax(0,1fr) auto!important;gap:5px!important;padding:2px 0!important;min-height:22px}',
    '#sheet.opal .opbag .ptag{width:8px!important;height:8px!important;padding:0!important;border-radius:50%!important;font-size:0!important;background:var(--ink)!important;overflow:hidden}',
    '#sheet.opal .opbag .potline>span{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis;font-size:11px!important}',
    '#sheet.opal .opbag .plock{width:22px!important;height:20px!important}#sheet.opal .opbag .plock .plk{width:13px;height:13px}',
    '#sheet.opal .opbag .pnote{display:none}',
    '#sheet.opal .opbag .potline{min-height:0!important;padding:1px 0!important}#sheet.opal .opbag .plock{width:20px!important;height:17px!important;border-radius:5px!important}',
    '#sheet.opal .opbag .ef{padding:3px 0!important}',
    '#sheet.opal .opbag .ggr{font:800 10.5px var(--body);font-style:normal;margin-left:6px;letter-spacing:0;filter:saturate(.8) brightness(.85)}',
    // 레벨업: 넓은 알약 한 줄 (낱말 + 비용)
    '#sheet.opal .bagbtns>.buy{flex-direction:row!important;flex-wrap:nowrap!important;gap:6px!important;padding:2px 12px!important}#sheet.opal .bagbtns>.buy span{flex-basis:auto!important;font:800 12.5px var(--body)!important}',
    '#sheet.opal .bagbtns>.buy small{font:400 16px var(--display)!important}#sheet.opal .bagbtns>.buy small::before,#sheet.opal .bagbtns>.buy small::after{content:none!important}',
    '#sheet.opal .bagbtns>.btn{min-height:44px!important;font:800 13.5px var(--body)!important}',
    '#sheet.opal .trhint{text-align:center!important;line-height:1.45}#sheet.opal .trhint .gem{display:inline-block;width:11px;height:11px;vertical-align:-1px}',
    // 목록 칸: 로마 숫자(시안처럼 세리프)와 Lv.만, 등급 이름·개수는 「다른 등급 보기」에서만
    '#sheet.opal .bgrid .bcell .tg{font:700 14px Georgia,"Times New Roman",serif!important;left:9px!important;top:6px!important}',
    '#sheet.opal .bgrid .bcell .tgg{display:none}#sheet.opal .bgrid .bcell .bn{display:none}',
    '#sheet.opal .bgrid .ballg{min-height:40px}',
    '#sheet.opal .opbag .pthead small{display:none}',
    '#sheet.opal .bgrid .bcell .gcimg{top:15%!important;left:10%!important;width:80%!important;height:62%!important}',
    '#sheet.opal .bgrid .ballg{border-image:none!important;border:0!important;background:none!important;min-height:36px!important;font:800 12px var(--body)!important;color:#52669a!important;text-decoration:underline;text-underline-offset:3px}',
    '#sheet.opal .cs-eff2 p{padding:5px 0!important;font-size:12.5px!important}#sheet.opal .cosstage{gap:6px!important}#sheet.opal .cosstage .cs-act>*{min-height:46px!important}',
    '#sheet.opal .bgrid.all .bcell .tg{font:800 10.5px var(--body)!important}#sheet.opal .bgrid.all .bcell .tgg{display:inline}',
    '#sheet.opal .bagbtns{margin:0 0 2px!important}#sheet.opal .bagbtns>.buy{min-height:44px!important}',
    '#sheet.opal .trhint{margin:0 2px 6px!important;font-size:10.5px!important}',
    // 패널 위 띠: 위 가장자리 줄은 모서리 사이에만, 높이는 테두리 두께만큼
    '#sheet.opal{background-size:52px 52px,64px 60px,calc(100% - 116px) 12px,12px calc(100% - 52px),12px calc(100% - 60px),100% 100%,100% 100%!important;background-position:0 0,100% 0,52px 0,0 52px,100% 60px,0 0,0 0!important;background-repeat:no-repeat!important}',
    // ===================== 움직임 (사용자 2026-11-16: 룬·신성력도 애니메이션, 그림 같지 않게) =====================
    // 성운: 아주 천천히 숨쉬듯 커졌다 작아짐 + 성긴 별 깜빡임 (장식 층만 움직임, 버튼·글씨·터치 위치는 고정)
    '@keyframes opNeb{0%{transform:scale(1) translateY(0);filter:saturate(1) brightness(1)}100%{transform:scale(1.035) translateY(-1.2%);filter:saturate(1.12) brightness(1.05)}}',
    '@keyframes opTwk{0%,100%{opacity:.25}50%{opacity:1}}',
    '#sheet.opal .ns-neb{animation:opNeb 9s ease-in-out infinite alternate;will-change:transform}',
    '#sheet.opal .ns-neb::after{content:""!important;position:absolute;inset:0;pointer-events:none;background:radial-gradient(1.6px 1.6px at 18% 22%,#fff,transparent),radial-gradient(1.4px 1.4px at 72% 18%,#fff,transparent),radial-gradient(2px 2px at 84% 46%,#fff,transparent),radial-gradient(1.4px 1.4px at 30% 60%,#fff,transparent),radial-gradient(1.8px 1.8px at 58% 34%,#fff,transparent),radial-gradient(1.3px 1.3px at 44% 14%,#fff,transparent);animation:opTwk 2.8s ease-in-out infinite}',
    '#sheet.opal .ns-neb::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(1.5px 1.5px at 26% 40%,#fff,transparent),radial-gradient(1.7px 1.7px at 66% 58%,#fff,transparent),radial-gradient(1.3px 1.3px at 90% 26%,#fff,transparent),radial-gradient(1.5px 1.5px at 10% 52%,#fff,transparent);animation:opTwk 3.6s ease-in-out -1.8s infinite}',
    // 룬: 돌마다 엇갈려 떠오르기, 빛길을 따라 빛이 핵으로 흐름, 공명 핵 숨쉬기, 「올리기」 점 깜빡임
    '@keyframes opBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '@keyframes opGlowR{0%,100%{box-shadow:inset 0 0 0 2px #fff,0 0 0 2px #b9c6e4,0 0 10px rgba(150,210,255,.35)}50%{box-shadow:inset 0 0 0 2px #fff,0 0 0 2px #9fd8cc,0 0 26px rgba(150,230,220,.85)}}',
    '@keyframes opFlowL{to{stroke-dashoffset:-28}}',
    '@keyframes opDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.6}}',
    '#sheet.opal .runering .rune>:not(b):not(i){animation:opBob 3.2s ease-in-out infinite;animation-delay:calc(var(--i,0) * -.46s)}',
    '#sheet.opal .runering .rune.sel>:not(b):not(i){animation-duration:1.6s;filter:drop-shadow(0 0 8px rgba(140,230,220,.9))}',
    '#sheet.opal .runering .rlines line{stroke-dasharray:6 8;animation:opFlowL 1.4s linear infinite}',
    '#sheet.opal .runering .rlines line:not(.flow){animation-duration:3s;opacity:.35}',
    '#sheet.opal .rcore{animation:opGlowR 2.6s ease-in-out infinite}',
    '#sheet.opal .rune.lag::before{animation:opDot 1.4s ease-in-out infinite}',
    // 신성력: 선반 위 보석이 엇갈려 떠오르고, 보석 표면에 빛이 스침
    '@keyframes opGem{0%,100%{transform:translateY(0);filter:brightness(1) drop-shadow(0 3px 3px rgba(30,40,90,.3))}50%{transform:translateY(-3px);filter:brightness(1.18) drop-shadow(0 6px 5px rgba(30,40,90,.22))}}',
    '#sheet.opal .sggrid .sgcell>:not(span){animation:opGem 3s ease-in-out infinite}',
    '#sheet.opal .sggrid .sgcell:nth-child(3n+1)>:not(span){animation-delay:-1s}#sheet.opal .sggrid .sgcell:nth-child(3n+2)>:not(span){animation-delay:-2s}',
    '#sheet.opal .sggrid .sgcell.sel>:not(span){animation-duration:1.5s}',
    '@keyframes opShine{0%{background-position:-120% 0}60%,100%{background-position:220% 0}}',
    '#sheet.opal .sgshelf .sgcell:not(.empty):not(.lockd){background-image:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.75) 48%,transparent 60%)!important;background-size:220% 100%!important;background-repeat:no-repeat!important;animation:opShine 4.5s ease-in-out infinite}',
    '#sheet.opal .sgshelf{padding-top:20px!important;padding-bottom:16px!important}',
    '#sheet.opal .sgshelf .sgcell.empty::after{content:"";position:absolute;inset:18%;border-radius:50%;box-shadow:0 0 12px rgba(160,200,255,.6);animation:opTwk 2.4s ease-in-out infinite}',
    // 삼신기·유물·특성·승급도 장치가 살아 있게 (선택한 것만 조금 더)
    '#sheet.opal .dvstand .dv-fig>img,#sheet.opal .dvstand .dv-fig>svg{animation:opBob 3.4s ease-in-out infinite}#sheet.opal .dvstand:nth-child(odd) .dv-fig>*{animation-delay:-1.1s}',
    '#sheet.opal .rk-sock.on>img{animation:opBob 3s ease-in-out infinite}',
    '#sheet.opal .rk-paths line.on{stroke-dasharray:5 6;animation:opFlowL 1.6s linear infinite}',
    '#sheet.opal .opboard .tnode .ti>*{animation:opBob 3.6s ease-in-out infinite}#sheet.opal .opboard .tnode:nth-child(2n) .ti>*{animation-delay:-1.4s}',
    '#sheet.opal .rlsock>img,#sheet.opal .rlsock>svg{animation:opBob 3.4s ease-in-out infinite}#sheet.opal .rlsock:nth-child(2n)>*{animation-delay:-1.5s}',
    // ==== 확대 대조 2차 (2026-11-16) ====
    // 패널 테두리: 시안 테두리 단면으로 다시 그린 틀 하나를 시트 위에 겹침 (터치 통과), 오른쪽 위 별자리
    // 위쪽 별자리 장식은 뺌 (사용자, 2026-11-16 「저거 별 없애버리고」) — 층 자리만 none 으로 남김
    '#sheet.opal{background:none,radial-gradient(60% 40% at 50% 45%,#f0eaf7,transparent 80%),linear-gradient(180deg,#e5daea 0%,#e9e5f1 40%,#efe4f5 100%)!important;background-size:54px 49px,100% 100%,100% 100%!important;background-position:calc(100% - 14px) 10px,0 0,0 0!important}',
    '#sheet.opal::after{content:"";position:absolute;inset:0;z-index:30;pointer-events:none;border:0 solid transparent;border-image:url(art/opal-frame.webp) 40 / 34px 34px 0 34px stretch;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(150,140,190,.35),inset 0 0 18px rgba(120,110,170,.18)}',
    '#sheet.opal .sheet-head b{font-size:28px!important;font-weight:400}',
    '#sheet.opal .cstage>.ns-neb{inset:0 3% 22px 3%!important}',
    // 장비: 성운 돔 오른쪽이 정보 칸 쪽으로 서서히 흐려짐 (시안 — 지워진 듯 안 지워진 듯), 정보 칸 밑으로도 조금 이어짐
    // 시안 장비 돔 실측(2026-11-16, domeshape.py): 꼭대기 = 이름 줄 높이, 폭 = 전시 칸 폭(패널 0.43), 가로:세로 1.10(위가 반원), 오른쪽 끝은 효과 상자 바로 앞
    '#sheet.opal .gstage>.ns-neb{inset:auto!important;top:0!important;left:1%!important;width:100%!important;height:auto!important;aspect-ratio:1.1;-webkit-mask:none!important;mask:none!important;background-size:100% 100%!important}',
    '#sheet.opal{background-position:calc(100% - 92px) 8px,0 0,0 0!important}',   // 별자리: 닫기 버튼 왼쪽
    '#sheet.opal .gstage .ns-ped{left:6%!important;right:4%!important}',   // 받침 폭 = 돔 폭의 90%, 가운데 같음
    '#sheet.opal .opbag .gstage{height:196px!important}',   // 받침 윗면 = 돔 꼭대기 + 153px (시안 실측)
    '#sheet.opal .sheet-head{padding-bottom:5px!important}',
    // ==== 글꼴 (사용자 자료 docs: Noto Sans KR — 제목 900, 물체 이름 800, 행동 글씨 800, 주요 값 700, 본문 500) ====
    '#sheet.opal{--display:"Noto Sans KR","Malgun Gothic",sans-serif;--body:"Noto Sans KR","Malgun Gothic",sans-serif;font-family:var(--body);font-weight:500}',
    '#sheet.opal *{font-family:"Noto Sans KR","Malgun Gothic",sans-serif}',
    '#sheet.opal .sheet-head b{font-weight:900!important;font-size:25px!important;letter-spacing:1px}',
    // 긴 제목(ui.js fitTitle): 양옆 장식 선을 짧게, 닫기 버튼에 안 닿게 — 글씨는 fitTitle 이 한 줄 될 때까지 줄임
    '#sheet.opal .sheet-head b.tlong{letter-spacing:0;gap:6px;white-space:nowrap;max-width:calc(100% - 150px)}#sheet.opal .sheet-head b.tlong::before{padding-left:22px!important;background-size:18px 1.2px!important}#sheet.opal .sheet-head b.tlong::after{padding-right:22px!important;background-size:18px 1.2px!important}',
    // 굵기는 앞의 font: 400 … !important 규칙보다 세게 (id 두 번)
    '#sheet.opal#sheet.opal :is(.bname b,.cs-name b,.nm,.pname,.rl-info>b,.dvstand b,.rk-name b,.ocname b,.dname,.rk-next b,.sktier span){font-weight:800!important}',
    '#sheet.opal#sheet.opal :is(button,.buy,.btn,.pull b,.blab,.obig,.ophold){font-weight:800!important}',
    '#sheet.opal#sheet.opal :is(.ef b,.gpill,.gpill b,.peff b,.oeff p b,.rnext b,.glv,.bcell .blv,.cs-eff2 b,.codexbar b,.opstars b,.rk-sum b,.al-lv b,.ptime,.lv){font-weight:700!important}',
    '#sheet.opal#sheet.opal :is(.subtabs,.kindtabs) button{font-weight:700!important}#sheet.opal#sheet.opal :is(.subtabs,.kindtabs) button[aria-selected="true"]{font-weight:900!important}',
    '#sheet.opal .opbag{line-height:1.3}#sheet.opal .opbag .potline,#sheet.opal .opbag .ef{line-height:1.25!important}',
    '#sheet.opal .opbag .gstars{display:flex!important;align-items:center;flex-wrap:nowrap;white-space:nowrap}#sheet.opal .opbag .gstars i{width:13px!important;height:13px!important;margin-right:2px!important}#sheet.opal .opbag .ggr{font-size:10px!important;margin-left:4px!important}',
    '#sheet.opal .opbag .bname b{font-size:20px!important}',
    // 잠재력 줄 = 시안 실측 19px (줄 17 + 사이 2)
    '#sheet.opal#sheet.opal .opbag .potline{padding:0 6px!important;min-height:17px!important;height:17px;margin:0 0 2px!important}#sheet.opal#sheet.opal .opbag .plock{height:15px!important;width:18px!important}',
    '#sheet.opal .opbag .gpot{padding:3px 8px 3px!important}#sheet.opal .opbag .pthead{margin:0 0 2px!important;line-height:1.2}',
    // ==== 아이콘 (사용자 부품): 잠재력 자물쇠, 장비 별 ====
    '#sheet.opal .opbag .plock .plk{display:none}#sheet.opal#sheet.opal .opbag .plock{background:url(art/opal-unlock.webp) 50% 50%/16px 16px no-repeat!important}#sheet.opal#sheet.opal .opbag .plock.on{background-image:url(art/opal-lock.webp)!important}',
    '#sheet.opal .opbag .gstars i{display:inline-block;width:15px;height:15px;margin-right:3px;font-size:0;vertical-align:-2px;background:url(art/opal-star0.webp) 50% 50%/100% 100% no-repeat}#sheet.opal .opbag .gstars i.on{background-image:url(art/opal-star.webp)}',
    '#sheet.opal .gstage .ns-obj>img{position:relative;left:25px;top:7px;max-height:165px!important}',   // 무기 = 시안 실측 x 72~178, y 68~224 (각도 같음 0~1°, 끝이 받침 윗면 가운데)   // 무기 = 시안 실측 x 72~178, y 68~224 (끝이 받침 윗면 가운데에 닿음)
    // 성운: 윗곡선은 그대로, 받침대 높이까지 내려오는 키 큰 돔 (art/opal-neb-tall.webp, 가로:세로 0.884)
    // 사용자 성운 nebula-arch-only (2026-11-16). 시안 실측: 큰 아치의 윗곡선만 보임 — 꼭대기 시트 위 43px, 가운데 x 113px,
    // 가로 224px (왼쪽은 패널 테두리에서 잘리고 오른쪽은 반투명 정보 상자 뒤로). 비율 그대로, 받침대 아래는 그림에서 잘라 냄
    // → 시안 아치는 좌우 대칭이 아님(왼쪽은 아래로 벌어져 패널 밖, 오른쪽은 정보 상자 앞에서 끝). 같은 질감을 시안 윤곽에 줄마다 맞춰 편
    //   art/opal-neb-gear.webp (tools/import-opal-parts.py make_gear_neb). 그림 = 212.4×196.8, 시트 기준 (-13, 41.7)
    '#sheet.opal .gstage>.ns-neb{background:url(art/opal-neb-gear.webp) 0 0/100% 100% no-repeat!important;inset:auto!important;top:-9.3px!important;left:-29px!important;width:212.4px!important;height:196.8px!important;aspect-ratio:auto!important}',
    // 반짝이 점은 아치 안에서만 (아치 밖 투명 모서리에 점이 뜨지 않게)
    '#sheet.opal .gstage>.ns-neb::before,#sheet.opal .gstage>.ns-neb::after{-webkit-mask:url(art/opal-neb-gear.webp) 0 0/100% 100% no-repeat;mask:url(art/opal-neb-gear.webp) 0 0/100% 100% no-repeat}',
    // 별자리 세 별(그림 안 위치 38%·20.7% / 28.3%·27.1% / 24.4%·36.9%)이 숨쉬듯 반짝 + 흩어진 작은 별
    '#sheet.opal .gstage>.ns-neb::after{background:radial-gradient(circle at 38% 20.7%,rgba(255,255,255,.95) 0,rgba(255,236,210,.55) 2.5px,transparent 8px),radial-gradient(circle at 28.3% 27.1%,rgba(255,255,255,.9) 0,rgba(255,236,210,.4) 1.5px,transparent 5px),radial-gradient(circle at 24.4% 36.9%,rgba(255,255,255,.9) 0,rgba(255,236,210,.45) 2px,transparent 6px),radial-gradient(1.6px 1.6px at 72% 18%,#fff,transparent),radial-gradient(2px 2px at 84% 46%,#fff,transparent),radial-gradient(1.8px 1.8px at 58% 34%,#fff,transparent);animation:opTwk 2.6s ease-in-out infinite}',
    // 시안 성운 꼭대기(시트 위 42px)가 패널 윗선(49px)에 잘리지 않게: 패널을 16px 위로 넓히고 제목 줄은 그 위에.
    // 스크롤했을 때만 패널 위 18px 를 흐리게 (내용이 제목 글자와 겹쳐 보이지 않게)
    '#sheet.opal .sheet-head{z-index:3}#sheet.opal #panel{margin-top:-16px;padding-top:18px}',
    '#sheet.opal #panel.opscr{-webkit-mask:linear-gradient(transparent 0,transparent 15px,#000 26px);mask:linear-gradient(transparent 0,transparent 15px,#000 26px)}',
    // 받침대: 보이는 몸체 폭 152px(그림 상자 163px), 가운데 x 105px, 윗면 y 211px (시안 실측)
    '#sheet.opal .gstage .ns-ped{left:7px!important;right:auto!important;width:163px!important;bottom:-2px!important}',
    // 시안 받침대: 옆면 두껍게·하얀 진주빛·밝은 빛무리 (art/opal-ped-gear.webp 951×246, 받침 820 이 가운데, 윗면 위치는 그대로)
    '#sheet.opal#sheet.opal .gstage .ns-ped{left:-6px!important;width:189px!important;bottom:-13.5px!important;aspect-ratio:951/246!important;background-image:url(art/opal-ped-gear.webp)!important}',   // 제목 아래 여백: 내용이 시안처럼 시트 위에서 50px부터 (전엔 59px)
    '#sheet.opal .opbag .gstage{z-index:0}#sheet.opal .opbag .binfo,#sheet.opal .opbag .bdetail,#sheet.opal .opbag .gpot{position:relative;z-index:1}',
    // ==== 성장 승인 시안 ====
    '#sheet.opal .ophead{justify-content:center!important;margin:2px 0 12px!important}',
    '#sheet.opal .ophead .mulpick{border-image:none!important;background:none!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px!important;width:100%;padding:0!important}',
    '#sheet.opal .ophead .mulpick .btn{min-height:42px!important;font:400 19px var(--display)!important;border:0 solid transparent!important;border-image:url(art/opal-pearl.webp) 23 23 23 23 fill / 50% 22px stretch!important;color:var(--navy)!important}',
    '#sheet.opal .ophead .mulpick .btn.on{border-image-source:url(art/opal-teal.webp)!important;border-image-slice:27 27 27 27 fill!important;border-image-width:50% 24px!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.55)!important}',
    '#sheet.opal .ophead .mulpick .btn.on::after{content:none!important}#sheet.opal .ophead .mulpick .btn.on::before{content:"✦";font-size:12px;margin-right:6px;opacity:.9}',
    '#sheet.opal .row.grow{display:grid!important;grid-template-columns:72px minmax(0,1fr) auto!important;align-items:center;gap:8px!important;padding:10px 10px 10px 8px!important;margin-bottom:8px!important}',
    '#sheet.opal .row.grow .gorb{width:70px!important;height:70px!important;border-radius:50%!important;position:relative;display:grid;place-items:center;background:url(art/opal-neb.webp) 50% 40%/180% 140% no-repeat!important;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7),0 0 0 1px rgba(160,170,220,.35)!important;overflow:visible}',
    '#sheet.opal .row.grow .gorb::after{content:"";position:absolute;left:8%;right:8%;bottom:-4px;aspect-ratio:820/188;background:url(art/opal-ped.webp) 50% 50%/100% 100% no-repeat;z-index:0}',
    '#sheet.opal .row.grow .gorb>*{position:relative;z-index:1;width:72%!important;height:72%!important;margin-bottom:12%;filter:drop-shadow(0 3px 3px rgba(30,40,90,.35))}',
    '#sheet.opal .row.grow{grid-template-areas:none!important;row-gap:0!important}',
    '#sheet.opal .row.grow .info{display:flex!important;flex-direction:column;align-items:flex-start;min-width:0;gap:0}',
    '#sheet.opal .row.grow .ricon,#sheet.opal .row.grow .name,#sheet.opal .row.grow .gabout,#sheet.opal .row.grow .buy{grid-area:auto!important}',
    '#sheet.opal .row.grow>.buy{width:auto!important}',
    '#sheet.opal .row.grow .info{min-width:0}#sheet.opal .row.grow .name{display:flex;align-items:baseline;gap:8px}',
    '#sheet.opal .row.grow .name .nm{color:var(--navy)!important}#sheet.opal .row.grow .name .lv{background:none!important;box-shadow:none!important;padding:0!important;font:700 13px Georgia,"Times New Roman",serif!important;color:#3d4462!important}',
    '#sheet.opal .row.grow .gabout{color:#3d4462!important;margin:2px 0 5px!important;text-align:left!important;align-self:flex-start!important}',
    '#sheet.opal .row.grow .name .lv,#sheet.opal .bgrid .bcell .tg{font-variant-numeric:lining-nums!important;font-family:"Times New Roman",Georgia,serif!important}',
    '#sheet.opal .gpill{display:inline-flex;align-items:center;gap:8px;padding:4px 16px;border:0 solid transparent;border-image:url(art/opal-pearl.webp) 23 23 23 23 fill / 50% 14px stretch;font:800 14px var(--body);color:var(--navy);white-space:nowrap;max-width:100%}',
    '#sheet.opal .gpill i{font-style:normal;color:#6b738c}#sheet.opal .gpill b{color:#1f7a74}',
    '#sheet.opal .gmore{display:flex;flex-direction:column;margin-top:3px;font:700 10.5px var(--body);color:#6b738c}#sheet.opal .gmore em{font-style:normal;color:#8a90a6}',
    '#sheet.opal .row.grow .glines{display:none!important}',
    '#sheet.opal .row.grow>.buy{position:relative;margin-left:8px;min-width:86px;min-height:58px!important;display:flex!important;flex-direction:column!important;align-items:center;justify-content:center;gap:0!important;padding:4px 10px!important;border-image-width:50% 22px!important}',
    '#sheet.opal .row.grow>.buy::before{content:"";position:absolute;left:-9px;top:10%;bottom:10%;width:1px;background:#d0d4e2}',
    '#sheet.opal .row.grow>.buy .bp{font:800 13px var(--body)!important;display:inline-flex;align-items:center;gap:3px}#sheet.opal .row.grow>.buy .coin{width:16px;height:16px}',
    '#sheet.opal .row.grow>.buy .blab{font:400 17px var(--display);font-style:normal}#sheet.opal .row.grow>.buy .blab::before{content:"✦ ";font-size:10px}#sheet.opal .row.grow>.buy .blab::after{content:" ✦";font-size:10px}',
    '#sheet.opal .ophold{display:flex;align-items:center;justify-content:center;gap:8px;margin:4px auto 10px;width:max-content;max-width:100%;padding:8px 24px;border:0 solid transparent;border-image:url(art/opal-pearl.webp) 23 23 23 23 fill / 50% 20px stretch;font:800 13px var(--body);color:var(--navy)}#sheet.opal .ophold i{font-style:normal;color:#8a95bd}',
    // 코스튬 효과 상자: 「✦ 라벨 · 설명」 왼쪽부터 (시안)
    '#sheet.opal .cs-eff2 p{grid-template-columns:auto auto minmax(0,1fr)!important;padding:6px 2px!important}',
    '#sheet.opal .cs-eff2 p>span{min-width:62px}#sheet.opal .cs-eff2 em{text-align:left!important;color:#3d4462!important}#sheet.opal .cs-eff2 p:not(.cs-lvrow) em::before{content:"·";margin:0 8px 0 2px;color:#8a95bd}',
    '#sheet.opal .cs-eff2 .cs-lvrow{grid-template-columns:auto auto minmax(0,1fr)!important}#sheet.opal .cs-eff2 .cs-lvrow em:last-child{text-align:right!important;border-left:1px solid #d3d7e4;padding-left:10px}',
    // 입기·강화: 얇은 알약 두 개 + 가운데 「|」, 강화는 한 줄
    '#sheet.opal .cosstage .cs-act{display:grid!important;grid-template-columns:1.25fr 1px 1fr!important;align-items:center;gap:12px!important}',
    '#sheet.opal .cosstage .cs-act::before{content:"";grid-column:2;grid-row:1;height:60%;background:#c9cede}',
    '#sheet.opal .cosstage .cs-act>:first-child{grid-column:1;grid-row:1}#sheet.opal .cosstage .cs-act>:last-child:not(:first-child){grid-column:3;grid-row:1}',
    '#sheet.opal .cosstage .cs-act>*{min-height:42px!important;font:400 16px var(--display)!important;flex-direction:row!important;gap:6px!important}',
    '#sheet.opal .cosstage .cs-act .buy small{font:400 16px var(--display)!important}#sheet.opal .cosstage .cs-act .buy span{font:800 13px var(--body)!important;display:inline-flex;align-items:center;gap:3px}',
    // 의상 목록: 정사각형에 가까운 작은 칸 (그림 + 이름)
    '#sheet.opal .ccard{padding:18px 3px 5px!important;justify-content:flex-start}#sheet.opal .ccard .cprevb img{width:auto!important;height:58px!important;max-width:100%;margin:0 auto}',
    '#sheet.opal .ccard>b{font-size:10.5px!important;line-height:1.15!important;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
    // 잠재력 줄: 줄마다 옅은 밝은 띠, 자물쇠는 상자 없이 회색 채운 아이콘
    '#sheet.opal .opbag .potline{background:rgba(255,255,255,.55)!important;border-radius:7px!important;border-bottom:0!important;margin:0 0 2px!important;padding:2px 6px!important}',
    '#sheet.opal .opbag .plock{background:none!important;border:0!important;box-shadow:none!important;color:#8a8fa3!important;width:20px!important}#sheet.opal .opbag .plock.on{color:#5d6580!important}',
    // 목록 칸: 그림 크게, E 표시 빼기 (장착 상태는 「장착 중」 글씨로)
    '#sheet.opal .bgrid .bcell .E{display:none!important}',
    '#sheet.opal .bgrid .bcell .gcimg{top:11%!important;left:7%!important;width:86%!important;height:68%!important}',
    // 전부 합성 · 추천 장착: 얇은 알약 + 가운데 세로 구분선
    '#sheet.opal .bagacts{position:relative;gap:22px!important;margin:6px 0 10px!important}#sheet.opal .bagacts .btn{min-height:40px!important;font-size:13.5px!important}',
    '#sheet.opal .bagacts::after{content:"";position:absolute;left:50%;top:22%;bottom:22%;width:1px;background:#c9cede}',
    // 아래 하위 탭: 탭 사이 구분선, 고른 탭 글씨 크게
    '#sheet.opal #opTabs .subtabs button+button{background:linear-gradient(#d3d7e4,#d3d7e4) 0 50%/1px 42% no-repeat!important}',
    '#sheet.opal #opTabs .subtabs button[aria-selected="true"]{font-size:16px!important}',
    // ---- 코스튬 아래쪽 = 승인 시안 실측 (2026-11-16, 600폭 단위 → css /1.5345) ----
    // 효과 상자: 줄 높이 21px(시안 32단위), 아이콘은 상자 안 36px, 이름 칸 52px, 줄 사이 가는 선, 오른쪽 여백 34px
    '#sheet.opal#sheet.opal .cs-eff2{padding:3px 30px 3px 30px!important}',
    '#sheet.opal#sheet.opal .cs-eff2 p{padding:2px 0!important;min-height:21px;line-height:17px;gap:10px!important;font:800 13px/17px var(--body)!important;border-bottom:1px solid rgba(190,196,218,.55)!important}',
    '#sheet.opal#sheet.opal .cs-eff2 p:last-child{border-bottom:0!important}',
    '#sheet.opal#sheet.opal .cs-eff2 p>span{min-width:52px}#sheet.opal#sheet.opal .cs-eff2 em{font:500 12px/17px var(--body)!important;letter-spacing:-.1px}',
    // 보유 효과 줄은 늘 한 줄: 값 뒤 설명이 안 들어가면 둘째 줄로 밀려 가려짐 (값은 그대로 보임)
    '#sheet.opal#sheet.opal .cs-eff2 p:nth-child(2) em{display:flex;flex-wrap:wrap;column-gap:5px;height:17px;overflow:hidden}#sheet.opal#sheet.opal .cs-eff2 .cs-suf{flex:none;color:#5d6580}',
    '#sheet.opal#sheet.opal .cs-eff2 p>i{width:14px;height:14px;font-size:0;background:url(art/opal-spark.webp) 50% 50%/contain no-repeat}',
    '#sheet.opal#sheet.opal .cs-eff2 p:nth-child(2)>i{filter:hue-rotate(40deg) saturate(1.3)}',
    '#sheet.opal#sheet.opal .cs-eff2 .cs-lvrow{grid-template-columns:62px auto minmax(0,1fr)!important;gap:16px!important;padding-left:6px!important}',
    '#sheet.opal#sheet.opal .cs-eff2 .cs-lvrow>span{font:800 13px/17px var(--body)}#sheet.opal#sheet.opal .cs-eff2 .cs-st{font-size:14px!important;letter-spacing:2px;color:#8a90ad!important}',
    '#sheet.opal#sheet.opal .cs-eff2 .cs-lvrow em:last-child{font:600 12px/17px var(--body)!important;padding-left:14px}',
    // 버튼: 높이 29px, 상자보다 안쪽(왼 21 · 오른 16), 입기 : 강화 = 1.45 : 1, 가운데 세로선. 입기 양끝 ✦
    '#sheet.opal#sheet.opal .cosstage .cs-act{padding:0 16px 0 21px;grid-template-columns:1.45fr 1px 1fr!important;gap:18px!important}',
    '#sheet.opal#sheet.opal .cosstage .cs-act>*{min-height:29px!important;height:29px;padding:0 10px!important;font:800 15px var(--body)!important}',
    '#sheet.opal#sheet.opal .cosstage .cs-act .buy small{font:800 15px var(--body)!important}#sheet.opal#sheet.opal .cosstage .cs-act .buy span{font:800 13px var(--body)!important}',
    '#sheet.opal .cosstage .cs-act .btn[data-cwear]:not(.on){position:relative}',
    '#sheet.opal .cosstage .cs-act .btn[data-cwear]:not(.on)::before,#sheet.opal .cosstage .cs-act .btn[data-cwear]:not(.on)::after{content:"✦";position:absolute;top:50%;transform:translateY(-52%);font-size:12px;color:rgba(255,255,255,.85);text-shadow:0 0 6px rgba(255,255,255,.8)}',
    '#sheet.opal .cosstage .cs-act .btn[data-cwear]:not(.on)::before{left:18px}#sheet.opal .cosstage .cs-act .btn[data-cwear]:not(.on)::after{right:18px}',
    // 버튼이 하나뿐(미보유 → 구매)일 때는 세로선 없이 가운데 하나. 예전엔 :has(>:only-child) 로 골랐는데, 이 규칙이 있으면 게임 어디서든 글자·요소가
    // 바뀔 때마다 브라우저가 메뉴 창 전체 스타일을 다시 계산했음(제목 한 글자 바꾸기 40ms → 빼면 2ms, CPU 4배 느리게 실측, 2026-11-18) → ui.js 가 붙이는 .one 으로
    '#sheet.opal#sheet.opal .cosstage .cs-act.one{grid-template-columns:minmax(0,200px)!important;justify-content:center}',
    '#sheet.opal .cosstage .cs-act.one::before{display:none}',
    '#sheet.opal#sheet.opal .cosstage .cs-act.one>*{grid-column:1!important}',
    // 목록 카드: 시안 82px 높이 (그림 48px, 위 여백 15px)
    '#sheet.opal#sheet.opal .ccard{padding-top:15px!important}#sheet.opal#sheet.opal .ccard .cprevb img{height:48px!important}',
    // ---- 장비 아래쪽 = 승인 시안 실측 (2026-11-16): 레벨업 28px · 부위 탭 막대 29px · 장비 칸 94px(그림 72%) · 전부 합성/추천 장착 26px, 좌우 15px 안쪽 ----
    '#sheet.opal#sheet.opal .bagbtns>.buy,#sheet.opal#sheet.opal .bagbtns>.btn{min-height:28px!important;height:28px;padding-top:0!important;padding-bottom:0!important}',
    '#sheet.opal#sheet.opal .bagbtns>.btn{font:800 14px var(--body)!important}',
    '#sheet.opal#sheet.opal .kindtabs[role=tablist]:not(.rgroup){padding:1px 4px!important}#sheet.opal#sheet.opal .kindtabs[role=tablist]:not(.rgroup) button{padding:4px 0 6px!important;min-height:0!important;line-height:17px!important}',
    '#sheet.opal#sheet.opal .bgrid .bcell{aspect-ratio:auto!important;height:94px!important;min-height:0!important}',
    '#sheet.opal#sheet.opal .bgrid.opgrade{margin-top:13px!important}',   // 부위 탭 → 칸 간격: 시안 30단위(19px, 탭 아래 -6px·칸 안 12px 포함)
    '#sheet.opal#sheet.opal .bgrid .bcell .gcimg{top:8%!important;left:8%!important;width:84%!important;height:72%!important}',
    '#sheet.opal#sheet.opal .bagacts{padding:0 15px}#sheet.opal#sheet.opal .bagacts .btn{min-height:26px!important;height:26px;font-size:13.5px!important}',
    // ---- 성장 = 사용자 성장 부품 + 시안 실측 (2026-11-16, 시안 패널 936px = 화면 391px) ----
    // 부품 PNG 는 바깥에 투명 그림자 여백(논리 옆 3.3 · 위 3.7 · 아래 5.3)이 있어 border-image-outset 으로 상자 밖에 그림 → 상자 크기 = 보이는 크기
    // 바탕: 위쪽 성운 띠 (nebula-background). 성장 화면일 때만
    '#sheet.opal:has(#panel .row.grow){background:url(art/gp-neb.webp) 50% 0/100% auto no-repeat,linear-gradient(180deg,#ebe5f4,#efe9f6)!important}',
    // ×1·×10·×100: 가운데 모은 알약 셋 (보이는 88×29, 간격 7), 고른 것 청록 + ✦
    '#sheet.opal#sheet.opal .ophead{margin:11px 0 5px!important;justify-content:center!important}',   // 알약 아래 → 첫 카드 17px (패널 사이 12 포함)
    '#sheet.opal#sheet.opal .ophead .mulpick{display:flex!important;justify-content:center;gap:7px!important;border-image:none!important;background:none!important;padding:0!important;width:auto!important}',
    '#sheet.opal#sheet.opal .ophead .mulpick .btn{flex:none;width:88px!important;min-height:0!important;height:29px!important;padding:0 0 1px!important;font:800 17px/1 var(--body)!important;color:var(--navy)!important;border:0 solid transparent!important;border-image:url(art/gp-mul.webp) 48 fill / 16px / 3.7px 3.3px 5.3px 3.3px stretch!important;background:none!important;box-shadow:none!important}',
    '#sheet.opal#sheet.opal .ophead .mulpick .btn.on{border-image:url(art/gp-mul-sel.webp) 48 fill / 16px / 3.7px 3.3px 6.3px 3.3px stretch!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)}',
    '#sheet.opal#sheet.opal .ophead .mulpick .btn::after{content:none!important}#sheet.opal .ophead .mulpick .btn.on::before{content:"✦";font-size:11px;margin-right:9px;opacity:.9}',
    // 카드: 보이는 362×78 (9분할 18), 열 = 구슬 83 | 글 | 세로선 1 | 버튼 87, 사이 8, 오른쪽 8, 카드 사이 7
    '#sheet.opal#sheet.opal .list{gap:7px!important}',
    '#sheet.opal#sheet.opal .row.grow,#sheet.opal#sheet.opal .row.lockrow{position:relative;display:grid!important;grid-template-areas:none!important;grid-template-columns:83px minmax(0,1fr) 1px 94px!important;column-gap:8px!important;align-items:center;min-height:78px;padding:3px 8px 3px 0!important;margin:0 -2px!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-image:url(art/gp-card.webp) 54 fill / 18px / 3.7px 3.3px 5.3px 3.3px stretch!important;border-radius:0!important}',
    '#sheet.opal#sheet.opal .row.grow.sel{border-image:url(art/gp-card-sel.webp) 54 fill / 18px / 3px 3px 5px 3px stretch!important}',
    '#sheet.opal#sheet.opal .row.lockrow{border-image:url(art/gp-card-lock.webp) 54 fill / 18px / 3.7px 3.3px 5.3px 3.3px stretch!important;grid-template-columns:83px minmax(0,1fr) 40px!important}',
    '#sheet.opal#sheet.opal .row.grow::after{content:"";grid-column:3;grid-row:1;align-self:center;height:48px;background:url(art/gp-div.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .row.grow>.buy{grid-column:4;grid-row:1;justify-self:start;margin-left:2px!important;position:relative;top:-2px}',   // 사용자: 세로선~카드 테두리 사이 딱 가운데(양쪽 보이는 틈 5.7px), 2px 위로
    // 왼쪽: 은은한 성운 구슬(지름 67) + 작은 하얀 받침(70×16) + 아이콘(72, 캔버스 그대로) — 예전 성장 규칙(칸 안 그림 60×50)보다 우선
    '#sheet.opal#sheet.opal .ricon.gnew{position:relative;width:83px!important;height:72px!important;min-width:0!important;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;overflow:visible!important}',
    '#sheet.opal#sheet.opal .ricon.gnew::before,#sheet.opal#sheet.opal .ricon.gnew::after{content:none!important}',
    '#sheet.opal#sheet.opal .ricon.gnew{z-index:0!important;isolation:isolate}#sheet.opal#sheet.opal .ricon.gnew>.gorbbg{z-index:0!important}#sheet.opal#sheet.opal .ricon.gnew>.gped{z-index:1!important}#sheet.opal#sheet.opal .ricon.gnew>.gico{z-index:2!important}',   // 구슬 → 받침 → 아이콘 (예전 규칙이 구슬을 카드 뒤로 보냈음)
    '#sheet.opal#sheet.opal .ricon.gnew>.gorbbg{position:absolute!important;left:7px!important;top:1px!important;width:67px!important;height:67px!important;max-width:none!important;border-radius:50%;background:url(art/gp-orb.webp) 50% 50%/100% 100% no-repeat!important;animation:opOrb 26s linear infinite}',
    '#sheet.opal#sheet.opal .ricon.gnew>.gped{position:absolute!important;left:6px!important;top:auto!important;bottom:-2px!important;width:70px!important;height:16px!important;max-width:none!important;background:url(art/gp-ped.webp) 50% 50%/100% 100% no-repeat!important}',
    '#sheet.opal#sheet.opal .ricon.gnew>.gico{position:absolute!important;left:5px!important;top:-6px!important;width:72px!important;height:72px!important;max-width:none!important;max-height:none!important;object-fit:contain;filter:drop-shadow(0 2px 2px rgba(40,30,90,.25));animation:opFloat 3.2s ease-in-out infinite}',
    '#sheet.opal .row:nth-child(3n+2) .gico{animation-delay:-1.1s}#sheet.opal .row:nth-child(3n) .gico{animation-delay:-2.2s}',
    '#sheet.opal#sheet.opal .row.lockrow .gico{filter:grayscale(.55) opacity(.7)}#sheet.opal#sheet.opal .row.lockrow .gorbbg{filter:grayscale(.5) opacity(.7)}',
    '@keyframes opOrb{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
    // 가운데 글 (시안 실측): 이름 15.5 / Lv 13 (세리프, /최대는 흐리게) / 설명 11 / 수치 알약 보이는 103×19, 글 13
    '#sheet.opal#sheet.opal .row.grow .info,#sheet.opal#sheet.opal .row.lockrow .info{display:flex!important;flex-direction:column;align-items:flex-start;gap:3px!important;padding:4px 0 3px!important;min-width:0}',
    '#sheet.opal#sheet.opal .row.grow .name,#sheet.opal#sheet.opal .row.lockrow .name{display:flex!important;align-items:baseline;gap:10px!important;margin:0!important;font:800 15.5px/1.15 var(--body)!important;color:var(--navy)!important;white-space:nowrap;max-width:100%}',
    '#sheet.opal#sheet.opal .row.grow .name .nm{font-family:var(--body)!important;font-weight:800!important;font-size:15.5px;line-height:1.15!important;overflow:hidden;text-overflow:ellipsis;min-width:0}',   // 크기는 고정 안 함: 긴 이름은 fitGrowNames 가 줄임
    '#sheet.opal#sheet.opal .row.grow .name .lv{flex:none;font:700 13px/1 "Times New Roman",Georgia,serif!important;color:var(--navy)!important}#sheet.opal .row.grow .name .lv small{font:600 10px var(--body);color:#9aa0b8;margin-left:1px}#sheet.opal .row.grow .name.nomax .lv small{display:none}',
    // 좁은 폰 (lvdown, fitGrowNames): Lv 는 아이콘 받침 위 작은 알약으로 — 이름이 칸을 다 씀 (2026-11-17)
    '#sheet.opal .list.lvdown .row.grow{position:relative}#sheet.opal#sheet.opal .list.lvdown .row.grow .name .lv{position:absolute;left:49px;bottom:7px;transform:translateX(-50%);z-index:2;white-space:nowrap}',
    '#sheet.opal#sheet.opal .row.grow .gabout,#sheet.opal#sheet.opal .row.lockrow .desc{font-family:var(--body)!important;font-weight:500!important;font-size:11px;line-height:1.3!important;letter-spacing:-.2px;color:#3d4260!important;margin:0!important}',
    // 설명도 한 줄: 넘치면 fitGrowNames 가 글씨를 9.5px 까지 줄이고, 그래도 넘치면 두 줄 (.wrap)
    '#sheet.opal#sheet.opal .row.grow .gabout{white-space:nowrap;max-width:100%;overflow:hidden}#sheet.opal#sheet.opal .row.grow .gabout.wrap{white-space:normal}',
    '#sheet.opal#sheet.opal .row.grow .gpill{display:inline-flex!important;align-items:center;gap:7px;min-width:118px;max-width:100%;height:23px;padding:0 13px 1px!important;margin-top:2px;justify-content:center;border:0 solid transparent!important;border-image:url(art/gp-pill.webp) 36 fill / 11.5px / 3.5px 3.2px 5.1px 3.2px stretch!important;background:none!important;box-shadow:none!important;font-family:var(--body)!important;font-weight:700!important;font-size:13.5px;line-height:1!important;color:var(--navy)!important;white-space:nowrap}',   // 사용자: 수치 상자 조금 크게 (23px). 숫자가 길면 fitGrowNames 가 글씨만 줄여 양 끝 여백 13px 유지
    // 원소 지배 (형 2026-11-18: 「422레벨 폭주 400, 칸 글자 넘쳐」): "약점 +200% · 폭주 +400% → 약점 피해 +223%" does not fit one line even at 10.5px (js/ui.js
    // puts .pill2 on it): the box grows to two lines — the now-value on top, the arrow and the next value under it — both centred
    '#sheet.opal#sheet.opal .row.grow .gpill.pill2{height:auto;min-height:23px;flex-wrap:wrap;justify-content:center;column-gap:6px;row-gap:1px;padding:4px 7px 5px!important;font-size:11px;letter-spacing:-.3px;line-height:1.15!important;white-space:normal}#sheet.opal#sheet.opal .row.grow .gpill.pill2>span{flex:0 0 100%;text-align:center;word-break:keep-all}',
    '#sheet.opal#sheet.opal .row.grow .gpill i{font-style:normal;color:#6f7591;font-size:11px}#sheet.opal#sheet.opal .row.grow .gpill b{font-family:var(--body)!important;font-weight:800!important;font-size:inherit!important;line-height:1!important;color:#1f857e!important}#sheet.opal#sheet.opal .row.grow .gpill span{font-size:inherit!important}',
    '#sheet.opal#sheet.opal .row.grow .gmore{margin:0!important;font:600 10.5px/1.3 var(--body)!important;color:#7a8099!important}',
    // 강화 버튼 보이는 87×42 (9분할 15): 위 동전+비용 12.5, 아래 ✦ 강화 ✦ 17. 돈 부족·최대는 회색 판, 누르면 눌린 판 + 0.98배
    '#sheet.opal#sheet.opal .row.grow>.buy{width:87px!important;min-width:0!important;height:42px!important;min-height:0!important;padding:0 4px 1px!important;display:flex!important;flex-direction:column!important;align-items:center;justify-content:center;gap:4px!important;border:0 solid transparent!important;border-image:url(art/gp-up.webp) 45 fill / 15px / 4.7px 4.3px 7.3px 4.3px stretch!important;background:none!important;box-shadow:none!important;border-radius:0!important;color:#fff!important;transition:transform .12s}',
    '#sheet.opal#sheet.opal .row.grow>.buy:active{border-image:url(art/gp-up-press.webp) 45 fill / 15px / 4.7px 4.3px 7.3px 4.3px stretch!important;transform:scale(.98)}',
    '#sheet.opal#sheet.opal .row.grow>.buy.off{border-image:url(art/gp-up-off.webp) 45 fill / 15px / 4.7px 4.3px 7.3px 4.3px stretch!important;color:#8d93ab!important;text-shadow:none!important}',
    '#sheet.opal#sheet.opal .row.grow>.buy.max{border-image:url(art/gp-up-max.webp) 45 fill / 15px / 4.7px 4.3px 7.3px 4.3px stretch!important;font:800 16px var(--body)!important;color:#7d8399!important}',
    '#sheet.opal#sheet.opal .row.grow>.buy .bp{position:relative;display:flex!important;align-items:center;justify-content:center;gap:3px;text-align:center;font:700 11.5px/1 var(--body)!important;color:inherit!important;margin:0!important}',   // 사용자: 금화 숫자를 강화와 같은 가운데 줄에 (동전은 숫자 왼쪽에 붙임)
    '#sheet.opal#sheet.opal .row.grow>.buy .coin{position:static!important;margin:0!important;width:12px!important;height:12px!important;flex:none;background:url(art/gp-coin.webp) 50% 50%/contain no-repeat!important;border:0!important;box-shadow:none!important}#sheet.opal#sheet.opal .row.grow>.buy .coin::before,#sheet.opal#sheet.opal .row.grow>.buy .coin::after{content:none!important}',
    '#sheet.opal#sheet.opal .row.grow>.buy .blab{display:flex!important;align-items:center;justify-content:center;gap:6px;font:800 13.5px/1 var(--body)!important;font-style:normal!important;color:inherit!important;margin:0!important}',   // 사용자: 강화 글자 더 작게 (13.5)
    '#sheet.opal#sheet.opal .row.grow>.buy .blab::before,#sheet.opal#sheet.opal .row.grow>.buy .blab::after{content:"✦"!important;font-size:7px;opacity:.8;position:static!important;display:inline!important}',
    '#sheet.opal .row.grow>.buy:not(.off){animation:opBtnGlow 2.6s ease-in-out infinite}',
    '@keyframes opBtnGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.08) drop-shadow(0 0 4px rgba(90,220,210,.45))}}',
    // 잠긴 줄: 오른쪽 자물쇠 부품
    '#sheet.opal#sheet.opal .row.lockrow .lockic{justify-self:center;width:24px;height:26px;background:url(art/gp-lock.webp) 50% 50%/contain no-repeat}#sheet.opal#sheet.opal .row.lockrow .lockic>*{display:none!important}',
    // 「길게 누르면 연속 강화」: 아래 탭 바로 위 고정 자리 (보이는 166×19, 9분할 13) — ui.js 가 #opTabs 로 옮김
    '#sheet.opal#sheet.opal .ophold{width:max-content;min-width:150px;height:18px;margin:0 auto 9px!important;padding:0 16px 1px!important;display:flex;align-items:center;justify-content:center;gap:8px;border:0 solid transparent!important;border-image:url(art/gp-hint.webp) 39 fill / 9px / 2.6px 2.3px 3.8px 2.3px stretch!important;background:none!important;font:600 10.5px var(--body)!important;color:var(--navy)!important}',   // 사용자: 안내 글자 작게
    '#sheet.opal#sheet.opal .ophold i{width:10px;height:10px;font-size:0;background:url(art/gp-spark.webp) 50% 50%/contain no-repeat}',
    // ---- 특성 = 사용자 특성 부품 + 시안 실측 (2026-11-16, 시안 패널 936px = 화면 391px). 부품 그림자 여백은 border-image-outset 으로 상자 밖 ----
    // 위: 「✦ 남은 포인트 N」 청록 알약(보이는 120×24) + 「초기화」 진주 버튼(71×24), 가운데 모음
    '#sheet.opal#sheet.opal .tpoints.tnw{position:relative;z-index:2;display:flex!important;justify-content:center;align-items:center;gap:10px!important;margin:-8px 0 2px!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important}',
    '#sheet.opal#sheet.opal .tpoints.tnw .tpp{display:flex;align-items:center;justify-content:center;gap:7px;min-width:120px;height:24px;padding:0 15px 1px 12px;border:0 solid transparent;border-image:url(art/tp-points.webp) 51 fill / 13.2px / 2.9px 2.6px 4.1px 2.6px stretch;font:700 13.5px/1 var(--body)!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)}',
    '#sheet.opal#sheet.opal .tpoints.tnw .tpp::before{content:"✦";font-size:13px;line-height:1;color:#f8d8f6;text-shadow:0 0 4px rgba(255,190,250,.95),0 0 1px #fff;margin-right:3px}#sheet.opal#sheet.opal .tpoints.tnw .tpp b{font:800 15px/1 var(--body)!important;color:#d9fff5!important;margin-left:5px}',   // 사용자: 별 색 살리고 숫자 왼쪽으로
    '#sheet.opal#sheet.opal .tpoints.tnw .treset{width:71px!important;min-height:0!important;height:24px!important;padding:0 0 1px!important;font:700 13px/1 var(--body)!important;color:var(--navy)!important;border:0 solid transparent!important;border-image:url(art/tp-reset.webp) 51 fill / 13.2px / 2.9px 2.6px 4.1px 2.6px stretch!important;background:none!important;box-shadow:none!important}',
    '#sheet.opal#sheet.opal .tpoints.tnw .treset:active{border-image:url(art/tp-reset-press.webp) 51 fill / 13.2px / 2.9px 2.6px 4.1px 2.6px stretch!important}',
    // 나무 판: 성운 바탕 (패널 폭 가득, 가장자리는 부드럽게), 천천히 흐름
    '#sheet.opal#sheet.opal .ttree.tnw{position:relative;display:flex!important;flex-direction:column;align-items:stretch;gap:0!important;margin:-24px -12px 0!important;padding:34px 12px 14px!important;border:0!important;border-radius:26px!important;box-shadow:none!important;background:linear-gradient(rgba(238,232,252,.3),rgba(240,228,250,.22)),url(art/tp-neb.webp) 50% 0/cover no-repeat!important;-webkit-mask:linear-gradient(180deg,transparent 0,#000 34px,#000 calc(100% - 22px),transparent 100%),linear-gradient(90deg,transparent 0,#000 12px,#000 calc(100% - 12px),transparent 100%);-webkit-mask-composite:source-in;mask:linear-gradient(180deg,transparent 0,#000 34px,#000 calc(100% - 22px),transparent 100%) intersect,linear-gradient(90deg,transparent 0,#000 12px,#000 calc(100% - 12px),transparent 100%);animation:opNebDrift 46s ease-in-out infinite alternate}',
    '@keyframes opNebDrift{from{background-position:50% 0}to{background-position:50% 100%}}',
    '#sheet.opal#sheet.opal .ttree.tnw>.trow{display:flex!important;justify-content:center;align-items:flex-start;gap:13px!important;margin:0!important}',
    // 노드 92×88: 돔(지름 77) 뒤판 → 아이콘(70) → 앞 유리 반짝임 → 이름판(86×28) → 레벨 알약(40×14)
    '#sheet.opal#sheet.opal .tnode.tnw{position:relative;flex:none!important;width:92px!important;height:88px!important;min-height:0!important;margin:0!important;padding:0!important;display:block!important;background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;overflow:visible!important;opacity:1!important}',
    '#sheet.opal#sheet.opal .tnode.tnw>.tdome,#sheet.opal#sheet.opal .tnode.tnw>.tglint{position:absolute;left:-14.4px;top:-7px;width:120.8px;height:94.9px;background:url(art/tp-dome.webp) 50% 50%/100% 100% no-repeat;pointer-events:none}',
    '#sheet.opal#sheet.opal .tnode.tnw>.tglint{background-image:url(art/tp-glint.webp);z-index:3}',
    '#sheet.opal#sheet.opal .tnode.tnw>.thalo{display:none;position:absolute;left:-12.6px;top:-5.7px;width:117px;height:92px;background:url(art/tp-halo.webp) 50% 50%/100% 100% no-repeat;pointer-events:none;z-index:1}',
    '#sheet.opal#sheet.opal .tnode.tnw.sel>.thalo{display:block;animation:opHalo 2.4s ease-in-out infinite}',
    '@keyframes opHalo{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.025)}}',
    '#sheet.opal#sheet.opal .tnode.tnw>.ti{position:absolute!important;left:11px!important;top:4px!important;width:70px!important;height:70px!important;margin:0!important;padding:0!important;display:grid!important;place-items:center;background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;transform:none!important;z-index:2}',
    '#sheet.opal#sheet.opal .tnode.tnw>.ti>img.tico{width:70px!important;height:70px!important;max-width:none!important;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(30,20,80,.35));animation:opFloat 3.4s ease-in-out infinite}',
    '#sheet.opal#sheet.opal .tnode.tnw>.ti>:not(.tico){width:44px!important;height:44px!important}',
    '#sheet.opal#sheet.opal .tnode.tnw>.ti::after,#sheet.opal#sheet.opal .tnode.tnw>.ti::before{content:none!important}',
    '#sheet.opal .trow>.tnode.tnw:nth-child(2n) .tico{animation-delay:-1.3s}#sheet.opal .trow>.tnode.tnw:nth-child(3n) .tico{animation-delay:-2.4s}',
    '#sheet.opal#sheet.opal .tnode.tnw>.tplate{position:absolute;left:3.2px;top:51.6px;width:85.6px;height:28.5px;padding:0 4px 5px;display:flex;align-items:center;justify-content:center;border:0 solid transparent;border-image:url(art/tp-plate.webp) 42 fill / 14.8px / 3.9px 6.7px 5.6px 6.7px stretch;z-index:4}',
    '#sheet.opal#sheet.opal .tnode.tnw>.tplate small{display:block;font:800 12.5px/1.1 var(--body)!important;letter-spacing:-.3px;color:var(--navy)!important;text-shadow:none!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
    '#sheet.opal#sheet.opal .tnode.tnw.sel>.tplate{filter:drop-shadow(0 0 1px #3fd3c7) drop-shadow(0 0 2px #3fd3c7)}',
    '#sheet.opal#sheet.opal .tnode.tnw>b{position:absolute;left:26px;top:73px;width:40px;min-width:0!important;height:14px;padding:0 0 1px!important;display:flex!important;align-items:center;justify-content:center;border-radius:0!important;background:none!important;box-shadow:none!important;border:0 solid transparent;border-image:url(art/tp-lv-zero.webp) 27 fill / 8.4px / 3.4px 3.1px 4.9px 3.1px stretch;font:800 10.5px/1 var(--body)!important;color:var(--navy)!important;z-index:5}',
    '#sheet.opal#sheet.opal .tnode.tnw>b.lvpart{border-image-source:url(art/tp-lv-part.webp);color:#fff!important;text-shadow:0 1px 1px rgba(40,50,80,.45)}',
    '#sheet.opal#sheet.opal .tnode.tnw>b.lvmax{border-image-source:url(art/tp-lv-max.webp);color:#fff!important;text-shadow:0 1px 1px rgba(10,60,60,.5)}',
    // 잠김: 돔 안을 흐리게, 오른쪽 아래 자물쇠 (부품)
    '#sheet.opal#sheet.opal .tnode.tnw.lock>.ti{filter:grayscale(.65) opacity(.6)}#sheet.opal#sheet.opal .tnode.tnw.lock>.tplate{filter:grayscale(.5) opacity(.85)}#sheet.opal#sheet.opal .tnode.tnw.lock>.tdome{opacity:.75}',
    '#sheet.opal#sheet.opal .tnode.tnw>.tlock{position:absolute;left:auto!important;right:8px;top:36px!important;margin:0!important;width:19px!important;height:20px!important;padding:0!important;border-radius:0!important;background:url(art/tp-lock.webp) 50% 50%/contain no-repeat!important;box-shadow:none!important;z-index:6}',
    '#sheet.opal#sheet.opal .tnode.tnw>.tlock>*{display:none!important}',
    // 줄 사이: 양옆 연결선 + 「누적 포인트 지금/필요」 알약 (충족 청록빛 / 모자람 흰빛)
    '#sheet.opal#sheet.opal .tlink.tnw{display:grid!important;grid-template-columns:1fr auto 1fr;align-items:center;gap:0!important;margin:7px 0 2px!important;height:14px}',
    '#sheet.opal#sheet.opal .tlink.tnw>i{height:12px!important;border-radius:0!important;background:url(art/tp-con-l.webp) 100% 50%/100% 100% no-repeat!important;opacity:.9}#sheet.opal#sheet.opal .tlink.tnw>i:last-child{background-image:url(art/tp-con-r.webp)!important}',
    '#sheet.opal#sheet.opal .tlink.tnw .treq{display:flex!important;align-items:center;justify-content:center;gap:0!important;min-width:79px;height:14px;padding:0 10px 1px!important;border:0 solid transparent;border-image:url(art/tp-req-no.webp) 33 fill / 7.8px / 2.6px 2.3px 3.7px 2.3px stretch;font:700 10.5px/1 var(--body)!important;color:#5a6080!important;white-space:nowrap}',
    '#sheet.opal#sheet.opal .tlink.tnw .treq.ok{border-image-source:url(art/tp-req-ok.webp);color:#1f6d68!important}#sheet.opal#sheet.opal .tlink.tnw .treq b{font-weight:800;color:inherit;margin-left:4px}#sheet.opal#sheet.opal .tlink.tnw .treq em{font-style:normal;color:#9a5a3a}',
    // 크리티컬 특성: 구역 이름표 + 단계마다 [단계 이름표] [확률] [피해]
    '#sheet.opal#sheet.opal .tarrow.tnw{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;margin:14px 6px 8px!important;height:30px;padding:0 0 4px!important;border:0 solid transparent;border-image:url(art/tp-crit-sec.webp) 48 fill / 13px / 3px 2.7px 4.4px 2.7px stretch;font:800 12.5px/1.1 var(--body)!important;color:var(--navy)!important}',
    '#sheet.opal#sheet.opal .tarrow.tnw small{font:600 9.5px/1.1 var(--body);color:#6f7591}',
    '#sheet.opal#sheet.opal .ttree.tnw>.trow.tcrit{align-items:flex-start;margin:0 0 10px!important}',
    '#sheet.opal#sheet.opal .trow.tcrit.tnw .tclabel{flex:none!important;width:92px;height:22px;margin-top:28px!important;padding:0 0 1px!important;display:flex;align-items:center;justify-content:center;text-align:center!important;border:0 solid transparent;border-image:url(art/tp-crit-tier.webp) 36 fill / 11px / 3px 2.7px 4.4px 2.7px stretch;font:800 12px/1 var(--body)!important;text-shadow:none!important}',
    // 아래 상세 칸 (아래 탭 바로 위 고정, 보이는 374×75): 돔 그림 | 이름·Lv / 효과 지금 → 다음 / 조건 | 「✦ 포인트 1로 강화 ✦」 125×29
    '#sheet.opal#sheet.opal .tinfo.tnw{display:grid!important;grid-template-columns:80px minmax(0,1fr) 118px;align-items:center;column-gap:8px;height:75px;margin:0 -4px 8px!important;padding:0 16px 0 0!important;text-align:left!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/tp-detail.webp) 66 fill / 19.9px / 3.3px 3px 4.8px 3px stretch!important}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tidome{position:relative;width:80px;height:75px;align-self:stretch;margin-left:-2px}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tidome>.tdome,#sheet.opal#sheet.opal .tinfo.tnw .tidome>.tglint{position:absolute;left:-1.4px;top:1.8px;width:87.8px;height:69px;background:url(art/tp-dome.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tidome>.tglint{background-image:url(art/tp-glint.webp);z-index:3}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tidome>.tped{position:absolute;left:-5.3px;top:-2.3px;width:95.6px;height:76.9px;background:url(art/tp-ped.webp) 50% 50%/100% 100% no-repeat;z-index:1}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tidome>.ti{position:absolute!important;left:15px!important;top:8px!important;width:55px!important;height:55px!important;margin:0!important;display:grid;place-items:center;background:none!important;box-shadow:none!important;border:0!important;z-index:2}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tidome>.ti>img.tico{width:55px!important;height:55px!important;object-fit:contain;animation:opFloat 3.4s ease-in-out infinite}#sheet.opal#sheet.opal .tinfo.tnw .tidome>.ti>:not(.tico){width:36px!important;height:36px!important}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tidesc{position:relative;top:-5px;align-self:center;height:62px;overflow:hidden;min-width:0;padding-left:10px;border-left:1px solid #d6d9e6;display:flex;flex-direction:column;justify-content:flex-start;gap:6px}',   // 높이 고정·위부터: 어떤 특성이든 이름 줄·선·효과 줄이 같은 자리 (사용자 2026-11-16)   // 사용자: 이름 줄 살짝 위로, 이름과 효과 사이 넓게
    '#sheet.opal#sheet.opal .tinfo.tnw .tidesc>b{display:block;padding-bottom:6px;border-bottom:1px solid #e2e4ee;font:800 15.5px/1.15 var(--body)!important;color:var(--navy)!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#sheet.opal#sheet.opal .tinfo.tnw .tidesc>b small{font:700 11px var(--body);color:#8a90a8;margin-left:3px}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tieff{font-family:var(--body)!important;font-weight:700!important;font-size:12px;line-height:1.2!important;letter-spacing:-.2px;color:var(--navy)!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#sheet.opal#sheet.opal .tinfo.tnw .tieff i{font-style:normal;color:#7a8099;margin:0 1px}#sheet.opal#sheet.opal .tinfo.tnw .tieff span{color:#1f857e!important;font-weight:800}',
    '#sheet.opal #opTabs:has(.tinfo.tnw){position:relative;background:#ece7f5!important}',   // 상세 칸 위 틈으로 뒤 글자가 비치지 않게
    // 2026-11-17 (형: 줄·칸·여백 맞춰): 상세 칸 위로 뒤 목록이 반쯤 잘려 비치던 것 → 칸 위 16px 에서 부드럽게 사라짐
    '#sheet.opal #opTabs:has(.tinfo.tnw)::before{content:"";position:absolute;left:0;right:0;top:-16px;height:16px;background:linear-gradient(180deg,rgba(236,231,245,0),#ece7f5);pointer-events:none}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tieff.wrap{white-space:normal;line-height:1.15!important}#sheet.opal#sheet.opal .tinfo.tnw .tidesc:has(.tieff.wrap) .tinote{display:none}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tinote{margin-top:-2px;font:600 9.5px/1.2 var(--body);color:#8a90a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    // 2026-11-18 (형: 「여기 하나도 안맞잖아」): the card's painted frame (art/tp-detail.webp) has two rules across it, at 25px and
    // 48px from the top of the card, and the writing sat across them (the name over the first, the effect over the second) with an
    // extra rule of its own under the name. The three lines now stand in the three bands the frame makes — name 4-25,
    // effect 25-48, note 48-70 — each in a box of its own height, centred in it; the painted rules are the only rules
    // (the numbers are in the 「특성 상세 칸 다시 맞춤」 rules further down, which come last)
    '#sheet.opal#sheet.opal .tinfo.tnw .tupb{width:118px!important;min-height:0!important;height:29px!important;padding:0 0 1px!important;display:flex!important;align-items:center;justify-content:center;gap:5px;font:800 12.5px/1 var(--body)!important;letter-spacing:-.2px;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)!important;border:0 solid transparent!important;border-image:url(art/tp-up.webp) 54 fill / 12.1px / 2.5px 2.2px 3.6px 2.2px stretch!important;background:none!important;box-shadow:none!important;border-radius:0!important;transition:transform .12s}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tupb::before,#sheet.opal#sheet.opal .tinfo.tnw .tupb::after{content:"✦";font-size:8px;line-height:1;opacity:.85;flex:none}',   // 사용자: 별을 글 양쪽에 같은 간격으로
    '#sheet.opal#sheet.opal .tinfo.tnw .tupb:active{border-image-source:url(art/tp-up-press.webp)!important;transform:scale(.98)}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tupb.off{border-image-source:url(art/tp-up-off.webp)!important;color:#8d93ab!important;text-shadow:none!important}',
    '#sheet.opal .tinfo.tnw .tupb:not(.off){animation:opBtnGlow 2.6s ease-in-out infinite}',
    // ---- 연금술 = 사용자 연금술 부품 + 시안 실측 (2026-11-16, 시안 패널 910px = 화면 391px). 움직임 주기는 60초를 나누어떨어지게(--ph 로 이어짐) ----
    '#sheet.opal#sheet.opal .alchhead.anw{position:relative;display:block!important;height:175px;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;overflow:visible}',
    '#sheet.opal#sheet.opal .alchhead.anw .acaul{position:absolute;left:0;top:0;width:200px;height:175px;z-index:0;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;overflow:visible}',
    '#sheet.opal#sheet.opal .alchhead.anw .acaul>*{position:absolute;pointer-events:none}',
    '#sheet.opal#sheet.opal .alchhead.anw .aneb{left:-13.4px;top:-8px;width:385.8px;height:214px;background:url(art/al-neb-fill.webp) 40% 55%/cover no-repeat;-webkit-mask:url(art/al-win.webp) 0 0/100% 100% no-repeat;mask:url(art/al-win.webp) 0 0/100% 100% no-repeat;animation:opAlNeb 30s ease-in-out calc(var(--ph,0s) + 0s) infinite alternate}',
    '@keyframes opAlNeb{from{transform:scale(1);filter:brightness(1)}to{transform:scale(1.025);filter:brightness(1.05) saturate(1.08)}}',
    '#sheet.opal#sheet.opal .alchhead.anw .aped{left:-19.4px;top:106px;width:264.6px;height:88.3px;background:url(art/al-ped.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .alchhead.anw .acimg{left:9.8px;top:27.4px;width:206.8px!important;height:138px!important;max-width:none!important;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(60,40,120,.18))}',
    // 기포: 가마솥 입구 위로 떠올라 사라짐 (3·2.4·4초)
    '#sheet.opal#sheet.opal .alchhead.anw .abub{background:none;opacity:0;animation:opBubRise 3s ease-out calc(var(--ph,0s) + 0s) infinite}',
    '#sheet.opal#sheet.opal .alchhead.anw .abub::before{content:"";position:absolute;inset:12.5%;border-radius:50%;background:radial-gradient(circle at 33% 28%,rgba(255,255,255,.95) 0,rgba(255,255,255,.85) 9%,transparent 18%),radial-gradient(circle at 66% 70%,rgba(190,255,255,.9) 0,rgba(140,230,250,.45) 22%,transparent 46%),radial-gradient(circle closest-side,rgba(113,152,233,.82) 0,rgba(132,172,239,.82) 45%,rgba(160,200,246,.85) 78%,rgba(214,236,255,.95) 92%,rgba(255,255,255,.9) 100%);box-shadow:0 0 4px rgba(200,235,255,.8)}',
    '#sheet.opal#sheet.opal .alchhead.anw .abub::after{content:"";position:absolute;inset:0;background:url(art/al-bubble.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .alchhead.anw .abub.b1{left:99px;top:-1px;width:24px;height:24px}',
    '#sheet.opal#sheet.opal .alchhead.anw .abub.b2{left:89.3px;top:23.3px;width:13.4px;height:13.4px;animation-duration:2.4s;animation-delay:calc(var(--ph,0s) - .8s)}',
    '#sheet.opal#sheet.opal .alchhead.anw .abub.b3{left:124.3px;top:18.3px;width:17.4px;height:17.4px;animation-duration:4s;animation-delay:calc(var(--ph,0s) - 1.9s)}',
    '@keyframes opBubRise{0%{transform:translateY(16px) scale(.55);opacity:0}18%{opacity:1}75%{opacity:.95}100%{transform:translateY(-14px) scale(1.05);opacity:0}}',
    // 연기: 가마솥 위로 천천히 (5초)
    '#sheet.opal#sheet.opal .alchhead.anw .asteam{left:80px;top:2px;width:44px;height:52px;background:url(art/al-steam.webp) 50% 50%/100% 100% no-repeat;opacity:0;animation:opSteam 5s ease-in-out calc(var(--ph,0s) + 0s) infinite}',
    '#sheet.opal#sheet.opal .alchhead.anw .asteam.s2{left:108px;animation-delay:calc(var(--ph,0s) - 2.5s)}',
    '@keyframes opSteam{0%{transform:translateY(14px) scaleX(.8);opacity:0}30%{opacity:.9}100%{transform:translateY(-16px) scaleX(1.25);opacity:0}}',
    // 레벨 칸 (보이는 151×104): 「연금술 Lv.N」 / 선 / 「다음 레벨까지 물약 N개」 / 별 (제작 수)
    '#sheet.opal#sheet.opal .alchhead.anw .al-lv{position:absolute;z-index:2;left:192px;top:40px;width:151px;height:104px;margin:0!important;padding:13px 12px 0!important;display:flex!important;flex-direction:column;align-items:center;gap:0!important;text-align:center;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/al-lvpanel.webp) 63 fill / 16px / 2.8px 2.5px 4px 2.5px stretch!important}',
    '#sheet.opal#sheet.opal .alchhead.anw .al-lv>b{display:flex;align-items:baseline;justify-content:center;gap:12px;width:100%;padding:0 0 8px;border-bottom:1px solid #dcdfea;font:900 20px/1.1 var(--body)!important;color:var(--navy)!important}',
    '#sheet.opal#sheet.opal .alchhead.anw .al-lv .alvn{font:700 15px/1 "Times New Roman",Georgia,serif!important;color:var(--navy)}',
    '#sheet.opal#sheet.opal .alchhead.anw .al-lv>small{display:block;margin:9px 0 0;font:700 11.5px/1.2 var(--body)!important;color:var(--navy)!important}',
    '#sheet.opal#sheet.opal .alchhead.anw .al-stars{display:flex;justify-content:center;gap:8px;margin-top:9px}',
    '#sheet.opal#sheet.opal .alchhead.anw .al-stars i{width:16px;height:16px;background:url(art/al-spark.webp) 50% 50%/contain no-repeat;opacity:.6}#sheet.opal#sheet.opal .alchhead.anw .al-stars i.on{opacity:1;filter:sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.05) drop-shadow(0 0 3px rgba(255,200,90,.7))}',   // 시안: 네 갈래 별
    // 흐름 바 (보이는 357×26): 제작 → 효과 즉시 적용 → 남은 시간
    '#sheet.opal#sheet.opal .opflow.anw{display:grid!important;grid-template-columns:1fr 18px 1.5fr 18px 1fr;align-items:center;justify-items:center;height:26px;margin:0!important;padding:0 6px 1px!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/al-flow.webp) 51 fill / 13px / 2.8px 2.5px 4.1px 2.5px stretch!important}',
    '#sheet.opal#sheet.opal .opflow.anw span{font:800 12.5px/1 var(--body)!important;color:var(--navy)!important;background:none!important;box-shadow:none!important;padding:0!important;white-space:nowrap}',
    '#sheet.opal#sheet.opal .opflow.anw i{width:18px;height:13px;font-size:0;background:url(art/al-arrow.webp) 50% 50%/contain no-repeat}',
    // 물약 카드 3장 (보이는 119×256, 사이 6.6): 물약 그림 → 이름 → 효과 알약 → 시간 알약 → 「만들기 🪙 비용」
    '#sheet.opal#sheet.opal .pgrid.anw{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:6.6px!important;margin:3px 0 0!important}',   // 2026-11-17 (형: 줄·칸 맞춰): 위 띠·카드와 같은 양쪽 끝 (전엔 4.3px 더 나감)
    '#sheet.opal#sheet.opal .pcard.anw{position:relative;display:block!important;height:256px;margin:0!important;padding:0!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/al-card.webp) 63 fill / 22.3px / 3.9px 3.5px 5.6px 3.5px stretch!important;overflow:visible!important}',
    '#sheet.opal#sheet.opal .pcard.anw>*{position:absolute;left:50%;transform:translateX(-50%);margin:0!important}',
    '#sheet.opal#sheet.opal .pcard.anw .pbot{top:1.5px;width:132px;height:124px;display:block!important;background:none!important;box-shadow:none!important;border:0!important;border-radius:0!important;padding:0!important}',
    '#sheet.opal#sheet.opal .pcard.anw .pbot::before,#sheet.opal#sheet.opal .pcard.anw .pbot::after{content:none!important}',
    '#sheet.opal#sheet.opal .pcard.anw .paimg{width:132px!important;height:124px!important;max-width:none!important;object-fit:contain;filter:drop-shadow(0 4px 5px rgba(60,40,120,.22));animation:opFloat 3s ease-in-out calc(var(--ph,0s) + 0s) infinite}',
    '#sheet.opal#sheet.opal .pcard.anw:nth-child(2) .paimg{animation-delay:calc(var(--ph,0s) - 1s)}#sheet.opal#sheet.opal .pcard.anw:nth-child(3) .paimg{animation-delay:calc(var(--ph,0s) - 2s)}',
    '#sheet.opal#sheet.opal .pcard.anw .pname{top:118px;width:112px;text-align:center;font:800 15.5px/1.15 var(--body)!important;color:var(--navy)!important;white-space:nowrap}',
    '#sheet.opal#sheet.opal .pcard.anw .peff,#sheet.opal#sheet.opal .pcard.anw .ptime{width:109px;height:26px;padding:0 6px 1px 9px!important;display:flex!important;align-items:center;gap:5px;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;font-family:var(--body)!important;font-weight:700!important;font-size:11.5px;line-height:1!important;color:var(--navy)!important;white-space:nowrap;letter-spacing:-.2px}',
    '#sheet.opal#sheet.opal .pcard.anw .peff{top:143px;padding:0 10px 1px 7px!important;gap:4px!important;border-image:url(art/al-eff.webp) 45 fill / 15.6px / 3.8px 3.4px 5.5px 3.4px stretch!important}',
    '#sheet.opal#sheet.opal .pcard.anw .peff i{flex:none;width:10px;height:10px;background:url(art/al-spark.webp) 50% 50%/contain no-repeat}#sheet.opal#sheet.opal .pcard.anw .peff b{margin-left:auto;font-family:var(--body)!important;font-weight:800!important;font-size:1.09em!important;line-height:1!important;color:#1f857e!important}',
    '#sheet.opal#sheet.opal .pcard.anw .ptime{top:176px;justify-content:flex-start;gap:0;border-image:url(art/al-timer.webp) 42 fill / 14.6px / 3.8px 3.4px 5.5px 3.4px stretch!important;font:700 12.5px/1 var(--body)!important}',
    '#sheet.opal#sheet.opal .pcard.anw .ptime i{position:absolute;left:9px;top:50%;margin-top:-7px;width:13px;height:13px;background:url(art/al-clock.webp) 50% 50%/contain no-repeat}#sheet.opal#sheet.opal .pcard.anw .ptime{justify-content:center!important;padding:0 18px 1px 18px!important}',
    '#sheet.opal#sheet.opal .pcard.anw .ptime.live{color:#1f857e!important;font-weight:800!important}',
    '#sheet.opal#sheet.opal .pcard.anw .buy{top:209px;width:107px!important;min-width:0!important;height:33px!important;min-height:0!important;padding:0 8px 1px!important;display:flex!important;flex-direction:row!important;align-items:center;justify-content:center;gap:6px!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/al-btn.webp) 57 fill / 13.3px / 2.6px 2.3px 3.7px 2.3px stretch!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)!important}',
    '#sheet.opal#sheet.opal .pcard.anw .buy:active{border-image-source:url(art/al-btn-press.webp)!important;transform:translateX(-50%) scale(.98)}',
    '#sheet.opal#sheet.opal .pcard.anw .buy.off{border-image-source:url(art/al-btn-off.webp)!important;color:#8d93ab!important;text-shadow:none!important}',
    '#sheet.opal#sheet.opal .pcard.anw .buy{white-space:nowrap;font-family:var(--body)!important;font-size:13px}#sheet.opal#sheet.opal .pcard.anw .buy small{flex:none;font-family:var(--body)!important;font-weight:800!important;font-size:1em!important;line-height:1!important;color:inherit!important;white-space:nowrap}',
    '#sheet.opal#sheet.opal .pcard.anw .buy span{flex:none;display:flex!important;align-items:center;gap:3px;font-family:var(--body)!important;font-weight:800!important;font-size:.93em!important;line-height:1!important;color:inherit!important;white-space:nowrap}',
    '#sheet.opal#sheet.opal .pcard.anw .buy .coin{width:14px!important;height:14px!important;flex:none;background:url(art/al-coin.webp) 50% 50%/contain no-repeat!important;border:0!important;box-shadow:none!important}#sheet.opal#sheet.opal .pcard.anw .buy .coin::before,#sheet.opal#sheet.opal .pcard.anw .buy .coin::after{content:none!important}',
    '#sheet.opal#sheet.opal .pcard.anw .buy.nolab>small{display:none!important}',   // 비용이 길면 「만들기」 글자 빼고 동전+비용만 (ui.js fitAlch)
    '#sheet.opal .pcard.anw .buy:not(.off){animation:opBtnGlow3 3s ease-in-out calc(var(--ph,0s) + 0s) infinite}',
    '@keyframes opBtnGlow3{0%,100%{filter:brightness(1)}50%{filter:brightness(1.08) drop-shadow(0 0 4px rgba(90,220,210,.45))}}',
    '#sheet.opal#sheet.opal .pcard.anw .pcheck{left:auto;right:5px;top:6px;transform:none;width:20px;height:20px;background:url(art/al-check.webp) 50% 50%/contain no-repeat}',
    '#sheet.opal#sheet.opal .pcard.anw.on{filter:drop-shadow(0 0 3px rgba(80,210,200,.55))}',
    // 카드 상자는 물약을 실제로 만들어 효과가 켜진 카드에만 (사용자 2026-11-16 아이폰: 상자 그림이 손 닿은 카드에만 그려져 「분노의 물약」만 상자로 잡혀 보였음)
    '#sheet.opal#sheet.opal .pcard.anw:not(.on){border-image-source:none!important}',
    '#sheet.opal#sheet.opal .pcard.anw .pcheck{display:none!important}',   // 켜진 카드 귀퉁이 체크 표시는 뺌 (사용자 2026-11-16)
    // 가운데 정리 (사용자 2026-11-16 「연금술 만들기 가운데 정렬해서 이쁘게」): 효과 알약·시간 알약은 아이콘+글을 한 덩어리로 가운데,
    // 남는 세로 공간은 위아래로 똑같이 나눠 화면 가운데에 (넘치면 auto 여백이 0 이 되어 예전처럼 위부터)
    '#sheet.opal#sheet.opal .pcard.anw .peff{justify-content:center!important;padding:0 8px 1px!important;gap:4px!important}#sheet.opal#sheet.opal .pcard.anw .peff b{margin-left:2px!important}',
    '#sheet.opal#sheet.opal .pcard.anw .ptime{justify-content:center!important;gap:5px!important;padding:0 8px 1px!important}#sheet.opal#sheet.opal .pcard.anw .ptime i{position:static!important;margin:0!important;flex:none}',
    '#sheet.opal#sheet.opal .pcard.anw .pname{text-align:center;left:50%}',
    '#sheet.opal#sheet.opal #panel>.alchhead.anw{margin-top:auto!important}#sheet.opal#sheet.opal #panel>.pgrid.anw{margin-bottom:auto!important}',
    // 연금술 물약 만들 때 톡 (사용자 2026-11-17 「생성하면 오른쪽으로 밀려났다 다시 가운데로」): 카드 안 칸은 translateX(-50%)로 가운데인데
    // opPop 이 transform 을 통째로 바꿔서 0.55초 동안 반 칸 오른쪽으로 밀렸음 → 가운데 맞춤을 넣은 톡
    '@keyframes opPopC{0%{transform:translateX(-50%) scale(1)}40%{transform:translateX(-50%) scale(1.12)}100%{transform:translateX(-50%) scale(1)}}',
    '#sheet.opal#sheet.opal .pcard.anw .pbot.opfx{animation:opPopC .55s ease-out var(--opd,0s) both}',
    // 골드·재료가 모자라 꺼진 버튼도 회색 그림 대신 반투명 유리 (사용자 2026-11-16 「응, 반투명으로」): 성장·장비·연금술·특성·승급·마나서클·뽑기.
    // 최대 버튼(아래, 글씨 .55)보다 글씨를 조금 더 흐리게(.42) 해서 「모자람」과 「다 올림」을 구분. 동전 아이콘도 살짝 흐리게
    '#sheet.opal#sheet.opal#sheet.opal :is(.buy.off,.buy.gemb.off,.pull.big.off,.tupb.off,.rkup.off,.rkbuy.off,.mcup.off){border-image:none!important;border:1.5px solid rgba(255,255,255,.8)!important;border-radius:14px!important;background:linear-gradient(180deg,rgba(255,255,255,.30),rgba(255,255,255,.10))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.65),0 0 0 1px rgba(140,150,190,.25),0 2px 6px rgba(80,70,140,.10)!important;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);color:rgba(48,54,77,.42)!important;text-shadow:0 1px 0 rgba(255,255,255,.6)!important;animation:none!important;filter:none!important}',
    '#sheet.opal#sheet.opal#sheet.opal .bagbtns .buy.off{border-radius:999px!important}#sheet.opal#sheet.opal#sheet.opal :is(.buy,.tupb,.rkup,.rkbuy,.mcup,.pull).off :is(.coin,.gem){opacity:.55}',
    // 최대 레벨 버튼 (사용자 2026-11-16 「최대하면 회색으로 변하잖아, 가운데 색 빼고 반투명으로」): 장비 「최대 레벨」·성장 줄 「최대」 —
    // 회색으로 채운 그림 대신 속이 비친 유리 테두리만 (돈이 모자라 꺼진 버튼은 그대로 회색)
    '#sheet.opal#sheet.opal#sheet.opal .bagbtns .buy.max,#sheet.opal#sheet.opal#sheet.opal .row.grow>.buy.max{border-image:none!important;border:1.5px solid rgba(255,255,255,.85)!important;background:linear-gradient(180deg,rgba(255,255,255,.34),rgba(255,255,255,.12))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 0 0 1px rgba(140,150,190,.28),0 2px 6px rgba(80,70,140,.10)!important;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);color:rgba(48,54,77,.55)!important;text-shadow:0 1px 0 rgba(255,255,255,.7)!important;animation:none!important;filter:none!important}',
    '#sheet.opal#sheet.opal#sheet.opal .bagbtns .buy.max{border-radius:999px!important}#sheet.opal#sheet.opal#sheet.opal .row.grow>.buy.max{border-radius:14px!important}',
    '#sheet.opal#sheet.opal .skr .b.up.max{background:rgba(255,255,255,.25)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.8)!important;color:rgba(48,54,77,.5)!important}',
    '#sheet.opal #panel{overflow-x:hidden!important;overscroll-behavior-x:none}',
    '#sheet.opal #panel.opz>*{zoom:var(--opz,1)}',   // 좁은 폰: 스킬·마나서클 화면을 패널 폭에 맞게 통째로 줄임 (ui.js fitNarrow)   // 그림이 조금 넘쳐도 화면이 옆으로 밀리지 않게 (사용자 2026-11-16)
    // ---- 승급 = 사용자 승급 부품 + 시안 실측 (2026-11-16, 시안 패널 948px = 화면 391px) ----
    '#sheet.opal#sheet.opal .rkwrap{margin:-11px 0 0!important;padding:0!important;display:block}',
    '#sheet.opal#sheet.opal .rkv{position:relative;height:216.5px;margin:0 0 12px!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important}',
    '#sheet.opal#sheet.opal .rkv>*{position:absolute;pointer-events:none}',
    '#sheet.opal#sheet.opal .rkv-neb{left:-15px;top:-19.3px;width:392px;height:266px;overflow:hidden}',
    // 성운 그림은 예전처럼 426px(시안 크기)로 그리되, 상자는 패널 안(화면 1~393)까지만 — 넘치면 승급 화면이 옆으로 밀림 (사용자 2026-11-16). 숨쉬기도 상자 안에서만
    '#sheet.opal#sheet.opal .rkv-neb::before{content:"";position:absolute;left:-14px;top:0;width:426px;height:266px;background:url(art/rk-neb.webp) 50% 50%/100% 100% no-repeat;animation:opAlNeb 30s ease-in-out infinite alternate}',
    // 빛줄기: 훈장 가운데(179.5,111)에서 각 징표 쪽으로 (길이·각도는 ui.js 가 계산)
    '#sheet.opal#sheet.opal .rkv-ray{left:179.5px;top:111px;width:var(--l);height:24px;margin-top:-12px;transform-origin:0 50%;transform:rotate(var(--a));background:url(art/rk-ray.webp) 50% 50%/100% 100% no-repeat;opacity:.45}',
    '#sheet.opal#sheet.opal .rkv-ray.on{opacity:1;filter:brightness(1.25) drop-shadow(0 0 2px #fff) drop-shadow(0 0 5px rgba(150,220,255,.85));animation:opRay 3s ease-in-out infinite}',
    '@keyframes opRay{0%,100%{opacity:.75}50%{opacity:1}}',
    '#sheet.opal#sheet.opal .rkv-ped{left:80px;top:163.6px;width:199px;height:66.3px;background:url(art/rk-ped.webp) 50% 50%/100% 100% no-repeat}',
    // 별 훈장: 틀 + 발바닥 메달 (같은 캔버스), 둥실 + 메달 은은한 빛
    '#sheet.opal#sheet.opal .rkv-badge{left:89px;top:35px;width:181.7px;height:166px;animation:opFloat 4s ease-in-out infinite}',
    '#sheet.opal#sheet.opal .rkv-badge img{position:absolute;inset:0;width:100%!important;height:100%!important;max-width:none!important;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(60,40,120,.25))}',
    '#sheet.opal#sheet.opal .rkv-badge .rkv-paw{inset:auto;left:16.78%;top:15.97%;width:66.59%!important;height:66.59%!important;filter:none;animation:opPaw 3s ease-in-out infinite}',
    '@keyframes opPaw{0%,100%{filter:brightness(1)}50%{filter:brightness(1.12) drop-shadow(0 0 6px rgba(255,240,255,.9))}}',
    // 징표 돔 (원 지름 56): 받침 → 돔 뒤판 → 그림 → 앞 반짝임. 조건을 채운 징표는 청록 빛
    '#sheet.opal#sheet.opal .rkv-mk{width:90px;height:70.7px}',
    '#sheet.opal#sheet.opal .rkv-mk>*{position:absolute}',
    // 돔 뒤판 + 우윳빛 속 (구: 너비의 31%, 높이의 39.4%, 가운데 50% 48.9%). 받침대 안쪽(구 중심 +12)에서 잘라 받침대 앞면이 아랫부분을 감싸게
    '#sheet.opal#sheet.opal .rkv-mk .rkv-dome,#sheet.opal#sheet.opal .rkv-mk .rkv-glint{left:0;top:0;width:90px;height:70.7px;clip-path:inset(0 0 24.2px 0)}',
    '#sheet.opal#sheet.opal .rkv-mk .rkv-dome,#sheet.opal#sheet.opal .row.rkrow .rkr-ico .rkv-dome{z-index:1;background:url(art/rk-dome.webp) 50% 50%/100% 100% no-repeat,radial-gradient(31.5% 40% at 50% 48.9%,rgba(240,234,253,.5) 0,rgba(228,218,250,.6) 60%,rgba(248,244,255,.9) 91%,rgba(248,244,255,0) 100%) no-repeat!important}',
    '#sheet.opal#sheet.opal .rkv-mk .rkv-glint{z-index:4;background:url(art/rk-glint.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .rkv-mk .rkv-nped{z-index:2;left:2px;top:34.9px;width:86px;height:28.6px;background:url(art/rk-ped.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .rkv-mk img{z-index:3;left:24px;top:5.5px;width:42px!important;height:42px!important;max-width:none!important;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(40,30,90,.3));animation:opFloat 3s ease-in-out infinite;animation-delay:calc(var(--d) * -.5s)}',
    '#sheet.opal#sheet.opal .rkv-mk.on .rkv-dome{filter:drop-shadow(0 0 3px rgba(90,225,215,.85));animation:opMkOn 2.4s ease-in-out infinite}',
    // 가로로 긴 그림(혜성·왕관·마도서)은 시안처럼 조금 크게 (가운데 그대로)
    '#sheet.opal#sheet.opal .rkv-mk img[src$="mComet.webp"],#sheet.opal#sheet.opal .rkv-mk img[src$="mCrown.webp"],#sheet.opal#sheet.opal .rkv-mk img[src$="mBook.webp"]{left:21px;top:2.5px;width:48px!important;height:48px!important}',
    '@keyframes opMkOn{0%,100%{filter:drop-shadow(0 0 2px rgba(90,225,215,.6))}50%{filter:drop-shadow(0 0 6px rgba(90,225,215,.95))}}',
    // 승급 성공 (data-opfx=rankup, .9초): 훈장이 커졌다 빛나고 가운데서 빛 고리가 퍼지고 빛줄기가 번쩍. 이름판도 톡
    '#sheet.opal#sheet.opal .rkv.opfx .rkv-frame{animation:opRkPop .9s ease-out var(--opd,0s) both}#sheet.opal#sheet.opal .rkv.opfx .rkv-paw{animation:opRkPaw .9s ease-out var(--opd,0s) both,opPaw 3s ease-in-out infinite}',
    '@keyframes opRkPop{0%{scale:1;filter:drop-shadow(0 4px 6px rgba(60,40,120,.25))}28%{scale:1.1;filter:brightness(1.25) drop-shadow(0 0 8px #fff) drop-shadow(0 0 20px rgba(140,230,255,.9))}100%{scale:1;filter:drop-shadow(0 4px 6px rgba(60,40,120,.25))}}',
    '@keyframes opRkPaw{0%{scale:1}28%{scale:1.1}100%{scale:1}}',
    '#sheet.opal#sheet.opal .rkv.opfx::after{content:"";position:absolute;z-index:5;left:179.5px;top:111px;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;border:3px solid rgba(255,255,255,.95);box-shadow:0 0 14px 4px rgba(140,230,255,.85),inset 0 0 12px 3px rgba(255,255,255,.7);pointer-events:none;animation:opRkRing .9s ease-out var(--opd,0s) both}',
    '@keyframes opRkRing{0%{transform:scale(.4);opacity:1}100%{transform:scale(4.4);opacity:0}}',
    '#sheet.opal#sheet.opal .rkv.opfx .rkv-ray{animation:opRkRay .9s ease-out var(--opd,0s) both}',
    '@keyframes opRkRay{0%{opacity:.5}25%{opacity:1;filter:brightness(2) drop-shadow(0 0 4px #fff) drop-shadow(0 0 8px rgba(140,230,255,.9))}}',
    '#sheet.opal#sheet.opal .rk-plate2.opfx{animation:opPop .5s ease-out var(--opd,0s) both}',
    // 징표 강화 성공 (data-opfx=mk:아이디): 목록 그림과 위쪽 돔 그림이 톡
    '#sheet.opal#sheet.opal .row.rkrow .rkr-ico.opfx img{animation:opPop .26s ease-out var(--opd,0s) both}',
    '#sheet.opal#sheet.opal .rkv-mk.opfx img{animation:opMkPop .26s ease-out var(--opd,0s) both,opFloat 3s ease-in-out infinite;animation-delay:var(--opd,0s),calc(var(--d) * -.5s)}',
    '@keyframes opMkPop{0%{scale:1}40%{scale:1.16}100%{scale:1}}',
    // 이름판 (보이는 332×35): ✦ 지금 계급 → 다음 계급 ✦
    '#sheet.opal#sheet.opal .rk-plate2{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;height:35px;margin:0 12.3px 8.4px 13.7px!important;padding:0 0 1px;border:0 solid transparent;border-image:url(art/rk-plate.webp) 66 fill / 17.9px / 3px 2.7px 4.3px 2.7px stretch}',
    '#sheet.opal#sheet.opal .rk-plate2 b{font:800 20px/1 var(--body)!important;color:var(--navy)!important;white-space:nowrap}#sheet.opal#sheet.opal .rk-plate2 small{font:700 12px var(--body);color:#1a6c82}',
    '#sheet.opal#sheet.opal .rk-plate2 em{flex:none;width:36px;height:26.4px;margin:1px 2px 0;background:url(art/rk-arrow.webp) 50% 50%/100% 100% no-repeat;filter:brightness(.66) saturate(2.6)}',
    '#sheet.opal#sheet.opal .rk-plate2>i,#sheet.opal#sheet.opal .rk-sum2>i,#sheet.opal#sheet.opal .rk-cmp2>i{width:21px;height:21px;background:url(art/rk-spark.webp) 50% 50%/contain no-repeat;filter:brightness(.72)}#sheet.opal#sheet.opal .rk-sum2>i{width:16px;height:16px}#sheet.opal#sheet.opal .rk-cmp2>i{width:22px;height:22px}',
    '#sheet.opal#sheet.opal .rk-plate2>i{position:absolute;top:50%;margin-top:-11px}#sheet.opal#sheet.opal .rk-plate2>i:first-child{left:13.5px}#sheet.opal#sheet.opal .rk-plate2>i:last-child{right:13.5px}#sheet.opal#sheet.opal .rk-sum2>i{position:absolute;top:50%;margin-top:-8.5px}#sheet.opal#sheet.opal .rk-sum2>i:first-child{left:26px}#sheet.opal#sheet.opal .rk-sum2>i:last-child{right:26px}',
    // 징표 조건 6칸 (상자 361×95, 칸 167×23, 2열×3줄)
    '#sheet.opal#sheet.opal .rk-conds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:10.3px;row-gap:6px;align-content:start;height:95px;margin:0 -1.5px 8.7px!important;padding:6px 8.5px 0 8.5px;box-sizing:border-box;border:0 solid transparent;border-image:url(art/rk-row.webp) 57 fill / 16px / 2.8px 2.5px 4px 2.5px stretch}',
    '#sheet.opal#sheet.opal .rk-cond{display:flex;align-items:center;gap:6px;height:23px;padding:0 8px 1px 9px;border:0 solid transparent;border-image:url(art/rk-cond.webp) 51 fill / 13.5px / 2.9px 2.6px 4.2px 2.6px stretch;font:700 11.5px/1 var(--body);color:var(--navy);white-space:nowrap}',
    '#sheet.opal#sheet.opal .rk-cond>i{flex:none;width:15px;height:15px;margin:0 -2px;background:url(art/rk-spark.webp) 50% 50%/contain no-repeat;filter:brightness(.72)}#sheet.opal#sheet.opal .rk-cond>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}',
    '@media (max-width:389px){#sheet.opal#sheet.opal .rk-cond{gap:4px;padding:0 6px 1px 7px}#sheet.opal#sheet.opal .rk-cond>i{display:none}#sheet.opal#sheet.opal .rk-cond>span{overflow:visible;text-overflow:clip}}',
    '#sheet.opal#sheet.opal .rk-cond>b{font:800 12px/1 var(--body);color:#8a90a8}#sheet.opal#sheet.opal .rk-cond.ok>b{color:#1a6c82}',
    '#sheet.opal#sheet.opal .rk-cond>em{flex:none;width:13px;font:900 14px/1 var(--body);font-style:normal;-webkit-text-stroke:.7px currentColor;color:#1a6c82;text-align:center}',
    // 요약 줄 (보이는 357×26): 징표 · 계정 Lv · 마력석 (모자라면 주황)
    '#sheet.opal#sheet.opal .rk-sum2{position:relative;display:flex;align-items:center;justify-content:center;gap:14px;height:26px;margin:0 0 8.3px 1.3px!important;padding:0 0 1px;border:0 solid transparent;border-image:url(art/rk-sum.webp) 48 fill / 13.4px / 3.1px 2.8px 4.4px 2.8px stretch;font:700 12.5px/1 var(--body);color:var(--navy)}',
    '#sheet.opal#sheet.opal .rk-sum2 span+span::before{content:"•";margin:0 10px 0 -4px;font-size:9px;vertical-align:2px;color:var(--navy)}#sheet.opal#sheet.opal .rk-sum2 b{font-weight:800;margin-left:3px}#sheet.opal#sheet.opal .rk-sum2 b.ok{color:#1a6c82}#sheet.opal#sheet.opal .rk-sum2 b.no{color:#c0603d}',
    // 비교 줄 (보이는 340×35): ✦ 모든 피해   +0% → +50%
    '#sheet.opal#sheet.opal .rk-cmp2{display:grid;grid-template-columns:22px 1fr auto 34px auto;align-items:center;column-gap:8px;height:35px;margin:0 8px!important;padding:0 26px 1px 12px;border:0 solid transparent;border-image:url(art/rk-cmp.webp) 54 fill / 16.2px / 3.3px 3px 4.8px 3px stretch}',
    '#sheet.opal#sheet.opal .rk-cmp2 .rkc-l{font:700 14px/1 var(--body);color:var(--navy);white-space:nowrap}@media (max-width:339px){#sheet.opal#sheet.opal .rk-cmp2{column-gap:5px;padding:0 18px 1px 8px;grid-template-columns:18px 1fr auto 26px auto}#sheet.opal#sheet.opal .rk-cmp2 em{width:26px}}#sheet.opal#sheet.opal .rk-cmp2 .rkc-a{font:800 17px/1 var(--body);color:var(--navy)}',
    '#sheet.opal#sheet.opal .rk-cmp2 em{width:34px;height:25px;background:url(art/rk-arrow.webp) 50% 50%/100% 100% no-repeat;filter:brightness(.6) saturate(2.4)}#sheet.opal#sheet.opal .rk-cmp2 b{font:900 18px/1 var(--body);color:#1a6c82}',
    // 승급하기 (보이는 220×40)
    '#sheet.opal#sheet.opal .rkup{display:flex!important;align-items:center;justify-content:center;gap:22px;width:220px!important;min-width:0!important;height:40px!important;min-height:0!important;margin:13px auto 0!important;padding:0 0 2px!important;font:800 20px/1 var(--body)!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/rk-btn.webp) 57 fill / 16.2px / 3.1px 2.8px 4.5px 2.8px stretch!important}',
    '#sheet.opal#sheet.opal .rkup::before,#sheet.opal#sheet.opal .rkup::after{content:"✦";font-size:14px;opacity:.95}',
    '#sheet.opal#sheet.opal .rkup:active{border-image-source:url(art/rk-btn-press.webp)!important;transform:scale(.98)}#sheet.opal#sheet.opal .rkup.off{border-image-source:url(art/rk-btn-off.webp)!important;color:#8d93ab!important;text-shadow:none!important}',
    '#sheet.opal .rkup:not(.off){animation:opBtnGlow3 3s ease-in-out infinite}',
    // 징표 강화 목록 (실제 기능): 작은 돔 그림 | 이름·Lv / 효과 | 마력석 강화 버튼
    '#sheet.opal#sheet.opal .rkl{gap:7px!important;margin-top:6px!important}',
    '#sheet.opal#sheet.opal .row.rkrow{display:grid!important;grid-template-areas:none!important;grid-template-columns:48px minmax(0,1fr) auto!important;column-gap:9px!important;align-items:center;min-height:66px;margin:0!important;padding:4px 10px 4px 6px!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/rk-row.webp) 57 fill / 16px / 3.1px 2.8px 4.5px 2.8px stretch!important}',
    '#sheet.opal#sheet.opal .row.rkrow .rkr-ico{position:relative;width:48px;height:48px}',
    '#sheet.opal#sheet.opal .row.rkrow .rkr-ico .rkv-dome{position:absolute;left:-10.5px;top:-2.5px;width:69px;height:54.2px;background:url(art/rk-dome.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .row.rkrow .rkr-ico img{position:absolute;z-index:2;left:8px;top:8px;width:32px!important;height:32px!important;object-fit:contain;filter:drop-shadow(0 2px 2px rgba(40,30,90,.3))}',
    '#sheet.opal#sheet.opal .row.rkrow .info{display:flex!important;flex-direction:column;gap:3px!important;min-width:0}',
    '#sheet.opal#sheet.opal .row.rkrow .name{display:flex!important;align-items:baseline;gap:8px;margin:0!important;font:800 14.5px/1.15 var(--body)!important;color:var(--navy)!important}#sheet.opal#sheet.opal .row.rkrow .name .lv{font:700 12.5px/1 "Times New Roman",Georgia,serif!important;color:var(--navy)!important;background:none!important;box-shadow:none!important;padding:0!important}',
    '#sheet.opal#sheet.opal .row.rkrow .desc{margin:0!important;font:500 11.5px/1.3 var(--body)!important;color:#3d4260!important}',
    '#sheet.opal#sheet.opal .row.rkrow .rkbuy{display:flex!important;flex-direction:row!important;align-items:center;justify-content:center;gap:4px;min-width:84px!important;height:30px!important;min-height:0!important;padding:0 12px 1px!important;font:800 12.5px/1 var(--body)!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/rk-btn.webp) 57 fill / 12.1px / 2.3px 2px 3.4px 2px stretch!important}',
    '#sheet.opal#sheet.opal .row.rkrow .rkbuy.off{border-image-source:url(art/rk-btn-off.webp)!important;color:#8d93ab!important;text-shadow:none!important}#sheet.opal#sheet.opal .row.rkrow .rkbuy:active{border-image-source:url(art/rk-btn-press.webp)!important}',
    '#sheet.opal#sheet.opal .row.rkrow .rkgem{flex:none;width:13px;height:14px;background:url(art/rk-gem.webp) 50% 50%/contain no-repeat}',
    '#sheet.opal#sheet.opal .row.rkrow.lockrow{grid-template-columns:48px minmax(0,1fr) 32px!important}#sheet.opal#sheet.opal .row.rkrow.lockrow .rkr-ico{filter:grayscale(.6) opacity(.65)}',
    '#sheet.opal#sheet.opal .row.rkrow .lockic{justify-self:center;width:20px;height:22px;background:url(art/rk-lock.webp) 50% 50%/contain no-repeat}#sheet.opal#sheet.opal .row.rkrow .lockic>*{display:none!important}',
    // ---- 마나서클 = 사용자 마나서클 부품 + 시안 실측 (2026-11-16, 시안 패널 906px = 화면 391px, 좌표는 .mcv 기준 = 화면 x-16, y-40) ----
    '#sheet.opal#sheet.opal .mcwrap{margin:-11px 0 0!important;padding:0!important;display:block}',
    '#sheet.opal#sheet.opal .mcv{position:relative;height:245px;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important}',
    '#sheet.opal#sheet.opal .mcv>*{position:absolute;pointer-events:none}',
    // 성운 전시 창 (사용자 2026-11-16 「마나서클 성운 시안 다시」): 스킬 화면과 같은 부품 — 창 마스크(mc-win)로 자른 부품 성운(mc-neb) + 유리 테두리(mc-winrim).
    // 시안(05-mana) 성운 경계 38점에 맞춘 자리: 시안 화면 x-0.5 y41.5, 390.6×279 (.mcv 기준 -16.5, 1.5). 만드는 곳 tools/import-skill-parts.py make_window
    '#sheet.opal#sheet.opal .mcv-neb{z-index:0;left:-16.5px;top:1.5px;width:390.6px;height:279px;-webkit-mask:url(art/mc-win.webp) 0 0/100% 100% no-repeat;mask:url(art/mc-win.webp) 0 0/100% 100% no-repeat}',
    // 창 모양은 그대로, 안의 성운만 천천히 숨쉬듯 (마스크까지 커지면 테두리와 어긋남)
    '#sheet.opal#sheet.opal .mcv-neb::before{content:"";position:absolute;inset:0;background:url(art/mc-neb.webp) 0 0/100% 100% no-repeat;animation:opAlNeb 30s ease-in-out infinite alternate}',
    '#sheet.opal#sheet.opal .mcv-rim{z-index:0;left:-16.5px;top:1.5px;width:390.6px;height:279px;background:url(art/mc-winrim.webp) 0 0/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .mcv-cst{z-index:0;left:0;top:0;width:359px;height:245px;overflow:visible}',
    '#sheet.opal#sheet.opal .mcv-cst .ln{fill:none;stroke:rgba(255,255,255,.82);stroke-width:.9;filter:drop-shadow(0 0 1.5px rgba(255,255,255,.75))}',
    '#sheet.opal#sheet.opal .mcv-cst .gl{fill:url(#mcCstGlow)}#sheet.opal#sheet.opal .mcv-cst .sp,#sheet.opal#sheet.opal .mcv-cst .co{fill:#fff}#sheet.opal#sheet.opal .mcv-cst .sp{filter:drop-shadow(0 0 1px #fff) drop-shadow(0 0 2.5px rgba(255,225,246,.95))}#sheet.opal#sheet.opal .mcv-cst .co{filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 4px rgba(255,214,240,.9))}#sheet.opal#sheet.opal .mcv-cst .dg{stroke:rgba(255,255,255,.75);stroke-width:.7;stroke-linecap:round}',
    // 반짝임: 살짝 작아지며 빛이 잦아들었다 다시 반짝 (별마다 빠르기 다르게)
    '#sheet.opal#sheet.opal .mcv-cst .st g{transform-box:fill-box;transform-origin:50% 50%;animation:mcTw 3s ease-in-out infinite}#sheet.opal#sheet.opal .mcv-cst .st g:nth-child(2n){animation-duration:4s;animation-delay:-1.3s}#sheet.opal#sheet.opal .mcv-cst .st g:nth-child(3n){animation-duration:2.5s;animation-delay:-.7s}',
    '@keyframes mcTw{0%,100%{opacity:1;scale:1}45%,55%{opacity:.88;scale:.88}75%{opacity:1;scale:1.14}}',
    // 받침대 (보이는 236×44, 윗면 y198)
    '#sheet.opal#sheet.opal .mcv-ped{z-index:1;left:0;top:154.8px;width:357px;height:119px;background:url(art/mn-ped.webp) 50% 50%/100% 100% no-repeat}',
    // 고리 2개 (시안 맞춤 유리관 그림, .mcv 기준 (-10,-10)부터 379×265). 뒤 반쪽 z2, 앞 반쪽 z6. 결정 가운데를 축으로 ±3도 천천히 흔들림
    '#sheet.opal#sheet.opal .mcv-o{left:-10px;top:-10px;width:379px;height:265px;transform-origin:187px 137px;background:50% 50%/100% 100% no-repeat;animation:mcSway 10s ease-in-out infinite alternate;animation-delay:var(--ph,0s)}',
    '#sheet.opal#sheet.opal .mcv-o.b{z-index:2}#sheet.opal#sheet.opal .mcv-o.f{z-index:6}',
    '#sheet.opal#sheet.opal .mcv-o.o1.b{background-image:url(art/mn-o1b.webp)}#sheet.opal#sheet.opal .mcv-o.o1.f{background-image:url(art/mn-o1f.webp)}#sheet.opal#sheet.opal .mcv-o.o2.b{background-image:url(art/mn-o2b.webp)}#sheet.opal#sheet.opal .mcv-o.o2.f{background-image:url(art/mn-o2f.webp)}',
    '@keyframes mcSway{from{rotate:-3deg}to{rotate:3deg}}',
    // 물방울 결정 (보이는 104×150, 꼭대기 y50) + 발바닥 (보이는 37×32, 가운데 177.5,129): 함께 위아래 3px, 발바닥 밝기 0.8~1
    '#sheet.opal#sheet.opal .mcv-cry{z-index:4;left:83.9px;top:26.9px;width:187px!important;height:204.6px!important;max-width:none!important;filter:drop-shadow(0 0 6px rgba(255,255,255,.55)) drop-shadow(0 0 14px rgba(200,190,255,.45));animation:mcFloat 3s ease-in-out infinite;animation-delay:var(--ph,0s)}',
    // 시안 대조 (사용자 2026-11-16: 「윤택·대비가 없다」): 결정은 면 색을 진하게 + 둘레 분홍빛, 고리는 유리 무지개빛·명암, 은구슬은 덜 밝게(반들반들한 명암), 결정 뒤 성운은 환하게
    '#sheet.opal#sheet.opal .mcv-cry{filter:contrast(1.14) saturate(1.4) drop-shadow(0 0 5px rgba(255,255,255,.6)) drop-shadow(0 0 16px rgba(255,170,232,.55))}',
    '#sheet.opal#sheet.opal .mcv-o{filter:saturate(1.3) contrast(1.3) brightness(1.04) drop-shadow(0 0 1.5px rgba(255,255,255,.85)) drop-shadow(0 0 5px rgba(210,190,255,.4))}',
    '@keyframes mcBall{0%{scale:.94;filter:contrast(1.25) brightness(1.02) drop-shadow(0 2px 2px rgba(40,40,90,.4))}25%{scale:1.08;filter:contrast(1.25) brightness(1.12) drop-shadow(0 2px 2px rgba(40,40,90,.4))}50%{scale:.94;filter:contrast(1.25) brightness(1) drop-shadow(0 2px 2px rgba(40,40,90,.4))}75%{scale:.84;filter:contrast(1.25) brightness(.88) drop-shadow(0 2px 2px rgba(40,40,90,.4))}100%{scale:.94;filter:contrast(1.25) brightness(1.02) drop-shadow(0 2px 2px rgba(40,40,90,.4))}}',
    '#sheet.opal#sheet.opal .mcv-neb::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 30% 40% at 49% 46%,rgba(255,240,255,.55),rgba(225,200,255,.25) 55%,transparent 80%)}',   // (예전 달걀 창 가장자리 보라 그늘은 뺌: 새 유리 돔은 부품 성운의 흰 안개가 가장자리)
    // 폭이 넓은 폰(412·430)에서도 성운이 패널 양옆까지 차고, 그림은 가운데로 (그림 자리는 폭 359 기준 실측이라 그 틀을 가운데에 두고 성운만 넓힘)
    '#sheet.opal#sheet.opal .mcwrap{container-type:inline-size}#sheet.opal#sheet.opal .mcv{width:359px;margin:0 auto!important}',
    // 받침대 둘레 흰 바닥 빛 (시안 05-mana). 아래 양옆은 새 유리 돔 성운이 패널 양옆까지 채움 (사용자 2026-11-16 「마나서클 성운 시안 다시」)
    '#sheet.opal#sheet.opal .mcv::before{content:"";position:absolute;z-index:0;pointer-events:none;left:calc((359px - 100cqw) / 2);width:100cqw;top:40px;height:240px;background:radial-gradient(ellipse 50% 16% at 50% 84%,rgba(255,255,255,.95),rgba(240,232,255,.6) 50%,transparent 100%)}',
    '#sheet.opal#sheet.opal .alchhead.anw{container-type:inline-size}#sheet.opal#sheet.opal .alchhead.anw .acaul{left:calc((100cqw - 359px) / 2)}#sheet.opal#sheet.opal .alchhead.anw .al-lv{left:calc((100cqw - 359px) / 2 + 192px)}',
    '#sheet.opal#sheet.opal .alchhead.anw .aneb{left:calc(-13.4px - (100cqw - 359px) / 2);width:calc(100cqw + 26.8px)}',
    '#sheet.opal#sheet.opal .mcv-paw{z-index:5;left:148px;top:98.9px;width:58px!important;height:58px!important;max-width:none!important;animation:mcFloat 3s ease-in-out infinite,mcPaw 3s ease-in-out infinite;animation-delay:var(--ph,0s),var(--ph,0s)}',
    '@keyframes mcFloat{0%,100%{translate:0 0}50%{translate:0 -3px}}',
    '@keyframes mcPaw{0%,100%{filter:brightness(1) drop-shadow(0 0 4px rgba(255,255,255,.85)) drop-shadow(0 0 9px rgba(190,225,255,.6))}50%{filter:brightness(1.12) drop-shadow(0 0 8px #fff) drop-shadow(0 0 16px rgba(170,220,255,.9))}}',
    // 은구슬: 고리 타원 상자(넓은 고리 2개, 비스듬한 고리 1개)를 고리 각도로 돌리고 그 안의 타원 길을 따라 돎. 앞 반쪽(0~50%)에서는 결정 앞(z7), 뒤 반쪽에서는 결정 뒤(z3), 뒤로 갈수록 작고 어둡게
    '#sheet.opal#sheet.opal .mcv-bw{left:68px;top:82px;width:220px;height:82px;animation:mcZ 12s linear infinite,mcSway 10s ease-in-out infinite alternate;animation-delay:var(--ph,0s),var(--ph,0s)}',
    // 길 따라 움직이는 i (offset), 크기·밝기·방향은 안쪽 b 에만 (i 에 scale/rotate 를 주면 길까지 줄고 돌아감)
    '#sheet.opal#sheet.opal .mcv-bw i{position:absolute;left:0;top:0;width:28px;height:28px;offset-path:path("M 220 41 A 110 41 0 0 1 0 41 A 110 41 0 0 1 220 41");offset-anchor:50% 50%;offset-rotate:0deg;animation:mcOrbit 12s linear infinite;animation-delay:var(--ph,0s)}',
    '#sheet.opal#sheet.opal .mcv-bw i b{position:absolute;inset:0;background:url(art/mn-ball.webp) 50% 50%/100% 100% no-repeat;filter:drop-shadow(0 2px 2px rgba(40,40,90,.35));animation:mcBall 12s linear infinite;animation-delay:var(--ph,0s)}',
    '#sheet.opal#sheet.opal .mcv-bw.w1 i b,#sheet.opal#sheet.opal .mcv-bw.w2 i b{rotate:-3.5deg}',
    '#sheet.opal#sheet.opal .mcv-bw.w1{transform:rotate(3.5deg)}',
    '#sheet.opal#sheet.opal .mcv-bw.w2{transform:rotate(3.5deg);animation-delay:calc(var(--ph,0s) - 6s),var(--ph,0s)}#sheet.opal#sheet.opal .mcv-bw.w2 i,#sheet.opal#sheet.opal .mcv-bw.w2 i b{animation-delay:calc(var(--ph,0s) - 6s)}',
    '#sheet.opal#sheet.opal .mcv-bw.w3{left:52.75px;top:78.75px;width:220px;height:60px;transform:rotate(-49.6deg);animation-duration:15s,10s;animation-delay:calc(var(--ph,0s) - 11s),var(--ph,0s)}',
    '#sheet.opal#sheet.opal .mcv-bw.w3 i{offset-path:path("M 220 30 A 110 30 0 0 0 0 30 A 110 30 0 0 0 220 30");animation-duration:15s;animation-delay:calc(var(--ph,0s) - 11s)}#sheet.opal#sheet.opal .mcv-bw.w3 i b{rotate:49.6deg;animation-duration:15s;animation-delay:calc(var(--ph,0s) - 11s)}',
    '@keyframes mcOrbit{from{offset-distance:0%}to{offset-distance:100%}}',
    '@keyframes mcBall{0%{scale:.94;filter:brightness(1.22) drop-shadow(0 2px 2px rgba(40,40,90,.35))}25%{scale:1.08;filter:brightness(1.32) drop-shadow(0 2px 2px rgba(40,40,90,.35))}50%{scale:.94;filter:brightness(1.16) drop-shadow(0 2px 2px rgba(40,40,90,.35))}75%{scale:.84;filter:brightness(1) drop-shadow(0 2px 2px rgba(40,40,90,.35))}100%{scale:.94;filter:brightness(1.22) drop-shadow(0 2px 2px rgba(40,40,90,.35))}}',
    '@keyframes mcZ{0%,49.9%{z-index:7}50%,99.9%{z-index:3}100%{z-index:7}}',
    // 레벨업 (data-opfx=circle .6초): 결정이 빛나며 톡. 서클 오름 (mctier 1.3초): 결정에서 빛 고리가 크게 퍼짐
    '#sheet.opal#sheet.opal .mcv.opfx .mcv-cry{animation:mcFloat 3s ease-in-out infinite,mcLv .6s ease-out both;animation-delay:var(--ph,0s),var(--opd,0s)}',
    '@keyframes mcLv{0%{scale:1;filter:drop-shadow(0 0 6px rgba(255,255,255,.55)) drop-shadow(0 0 14px rgba(200,190,255,.45))}30%{scale:1.06;filter:brightness(1.3) drop-shadow(0 0 10px #fff) drop-shadow(0 0 22px rgba(140,230,255,.9))}100%{scale:1;filter:drop-shadow(0 0 6px rgba(255,255,255,.55)) drop-shadow(0 0 14px rgba(200,190,255,.45))}}',
    '#sheet.opal#sheet.opal .mcv-burst{z-index:8;left:147px;top:94px;width:60px;height:60px;border-radius:50%;opacity:0}',
    '#sheet.opal#sheet.opal .mcv-burst.opfx{border:3px solid rgba(255,255,255,.95);box-shadow:0 0 16px 5px rgba(140,230,255,.85),inset 0 0 14px 4px rgba(255,255,255,.75);animation:mcBurst 1.3s ease-out var(--opd,0s) both}',
    '@keyframes mcBurst{0%{transform:scale(.3);opacity:1}100%{transform:scale(5.5);opacity:0}}',
    // 서클·레벨 알약 (보이는 217×37): 3서클 ◆ Lv.74
    '#sheet.opal#sheet.opal .mc-pill{position:relative;z-index:9;display:flex;align-items:center;justify-content:center;gap:14px;width:217px;height:37px;margin:0 auto!important;padding:0 0 1px 2px;border:0 solid transparent;border-image:url(art/mn-pill.webp) 57 fill / 17.5px / 3.1px 3.1px 5px 3.1px stretch}',
    '#sheet.opal#sheet.opal .mc-pill b{font:800 20px/1 var(--body)!important;color:var(--navy)!important;white-space:nowrap}#sheet.opal#sheet.opal .mc-pill b.lv{font:700 21px/1 "Times New Roman",Georgia,serif!important;background:none!important;box-shadow:none!important;border:0!important;padding:0!important;margin:0!important;min-width:0!important}',
    '#sheet.opal#sheet.opal .mc-pill>i{width:6px;height:6px;background:#8f8fb0;transform:rotate(45deg);margin-top:1px}',
    '#sheet.opal#sheet.opal .mc-pill.opfx{animation:opPop .5s ease-out var(--opd,0s) both}',
    // 효과 상자 (보이는 345×70): ✦ 스킬 피해 / ✦ 모든 피해, 가운데 가는 선
    '#sheet.opal#sheet.opal .mc-eff{position:relative;display:flex;flex-direction:column;justify-content:center;height:70px;margin:-1.5px 7px 0!important;padding:0 25px 1px 22px;border:0 solid transparent;border-image:url(art/mn-panel.webp) 57 fill / 19px / 3.4px 3.4px 4px 3.4px stretch}',
    '#sheet.opal#sheet.opal .mc-eff::after{content:"";position:absolute;left:27px;right:23px;top:35px;height:1px;background:linear-gradient(90deg,rgba(150,152,196,0),rgba(150,152,196,.42) 8%,rgba(150,152,196,.42) 92%,rgba(150,152,196,0))}',
    '#sheet.opal#sheet.opal .mc-eff p{display:flex;align-items:center;height:31px;margin:0!important;padding:0!important;background:none!important;box-shadow:none!important}',
    '#sheet.opal#sheet.opal .mc-eff p>i{flex:none;width:24px;height:24px;margin-right:12px;-webkit-mask:url(art/mn-spark.webp) 50% 50%/contain no-repeat;mask:url(art/mn-spark.webp) 50% 50%/contain no-repeat;background:linear-gradient(160deg,#bfe6ff,#5f86e3)}#sheet.opal#sheet.opal .mc-eff p>i.s2{background:linear-gradient(160deg,#d9c8ee,#7d6a9e)}',
    '#sheet.opal#sheet.opal .mc-eff p span{flex:1;font:700 15px/1 var(--body);color:var(--navy)}#sheet.opal#sheet.opal .mc-eff p b{font:800 17.5px/1 var(--body)!important;color:#1a6c82!important;white-space:nowrap}',
    // 진행 상자 (보이는 345×67): 다음 서클 Lv.75   24/25 + 막대 (보이는 316×16)
    '#sheet.opal#sheet.opal .mc-prog{position:relative;height:67px;margin:1px 7px 0!important;padding:0!important;border:0 solid transparent;border-image:url(art/mn-panel.webp) 57 fill / 19px / 3.4px 3.4px 4px 3.4px stretch}',
    '#sheet.opal#sheet.opal .mc-prog>span{position:absolute;left:20px;top:11px;font:700 15.5px/1.15 var(--body);color:var(--navy);white-space:nowrap}#sheet.opal#sheet.opal .mc-prog>b{position:absolute;right:18px;top:11px;font:800 17px/1.1 var(--body)!important;color:#1a6c82!important}',
    '#sheet.opal#sheet.opal .mc-prog>i.trk{position:absolute;left:14.5px;right:9px;top:30.1px;height:28.4px;border:0 solid transparent;border-image:url(art/mn-trk.webp) 18 fill / 10.65px stretch}',
    '#sheet.opal#sheet.opal .mc-prog>i.trk em{position:absolute;left:0;top:0;bottom:0;min-width:22px;max-width:100%;border:0 solid transparent;border-image:url(art/mn-fill.webp) 18 fill / 10.65px stretch;box-sizing:border-box;filter:brightness(1.18) saturate(1.35);transition:width .3s ease-out}',
    // 레벨업 (보이는 294×49): ✦  레벨업 | ◆ 비용  ✦
    '#sheet.opal#sheet.opal .mcup{position:relative;display:block!important;width:294px!important;min-width:0!important;height:49px!important;min-height:0!important;margin:4px auto 0!important;padding:0!important;font:800 21px/1 var(--body)!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/mn-btn.webp) 57 fill / 19px / 3.4px 3.3px 4px 3.3px stretch!important}',
    '#sheet.opal#sheet.opal .mcup>*{position:absolute;top:50%}',
    '#sheet.opal#sheet.opal .mcup .sp{width:16px;height:16px;margin-top:-8px;-webkit-mask:url(art/mn-spark.webp) 50% 50%/contain no-repeat;mask:url(art/mn-spark.webp) 50% 50%/contain no-repeat;background:#fff}#sheet.opal#sheet.opal .mcup .sp.a{left:22px}#sheet.opal#sheet.opal .mcup .sp.z{left:255px}',
    '#sheet.opal#sheet.opal .mcup .t{display:block!important;left:45px;width:110px;margin-top:-11px;text-align:center;line-height:22px}',
    '#sheet.opal#sheet.opal .mcup .sep{left:155px;width:1.5px;height:24px;margin-top:-12px;background:rgba(255,255,255,.55)}',
    '#sheet.opal#sheet.opal .mcup .c{left:158px;width:92px;margin-top:-13px;height:26px;display:flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap}',
    '#sheet.opal#sheet.opal .mcup .gem{flex:none;width:22.2px;height:25px;background:url(art/mn-gem.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .mcup:active{border-image-source:url(art/mn-btn-press.webp)!important;transform:scale(.98)}#sheet.opal#sheet.opal .mcup.off{border-image-source:url(art/mn-btn-off.webp)!important;color:#8d93ab!important;text-shadow:none!important}#sheet.opal#sheet.opal .mcup.off .sp,#sheet.opal#sheet.opal .mcup.off .sep{background:#a3a8bd}#sheet.opal#sheet.opal .mcup.off .gem{filter:grayscale(.6) opacity(.7)}',
    '#sheet.opal .mcup:not(.off){animation:opBtnGlow3 3s ease-in-out infinite}',
    '#sheet.opal#sheet.opal .mch{margin:-3px 0 0!important;text-align:center;font:600 11.5px/1.3 var(--body);color:#7b8099}#sheet.opal#sheet.opal .mch.bad{color:#c0603d}',
    // ---- 특성 상세 칸 다시 맞춤 (사용자 2026-11-16): 돔 | 이름 / 효과 / 조건 (세 줄 높이 고정, 두 줄로 안 넘어감) | 강화 버튼 — 버튼 가운데 = 효과 줄 가운데 ----
    '#sheet.opal#sheet.opal .tinfo.tnw{grid-template-columns:66px minmax(0,1fr) 100px!important;column-gap:10px!important;align-items:start!important;height:78px!important;padding:0 12px 0 4px!important}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tidome{width:80px!important;height:75px!important;margin:1.5px 0 0 -2px!important;transform:scale(.84);transform-origin:0 50%}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tidesc{top:0!important;height:78px!important;overflow:hidden;padding:4px 0 0 10px!important;display:grid!important;grid-template-columns:minmax(0,1fr);grid-template-rows:21px 23px 22px;align-content:start;gap:0!important;row-gap:0!important}',
    // 2026-11-18 (형: 「여기 하나도 안맞잖아」): the card's painted frame (art/tp-detail.webp) has two rules across it, 25px and 48px from
    // the card's top; the writing used to sit ON them (name 10-32, effect 37-54) with a rule of its own under the name. The three
    // lines now stand in the three bands the frame makes — name 4-25, effect 25-48, note 48-70 — each centred in a box of its
    // own height; the painted rules are the only rules
    '#sheet.opal#sheet.opal .tinfo.tnw .tidesc>b{height:21px;padding:0!important;border-bottom:0!important;font-size:15px!important;line-height:21px!important}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tieff{height:23px;margin-top:0;font-size:12.5px;line-height:23px!important;white-space:nowrap!important;text-overflow:clip!important}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tinote{display:block!important;height:22px;margin:0!important;font:700 10px/22px var(--body)!important;color:#6f7590!important;white-space:nowrap;text-overflow:clip!important}#sheet.opal#sheet.opal .tinfo.tnw .tinote.lock{color:#b0623f!important}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tinote .tnlock{display:inline-block;width:12px;height:13px;margin:0 2px 0 -1px;vertical-align:-2.5px;background:url(art/tp-lock.webp) 50% 50%/contain no-repeat}',   // 자물쇠 = 특성 부품 (사용자 2026-11-16)
    '#sheet.opal#sheet.opal .tinfo.tnw .tupb{width:100px!important;height:30px!important;margin-top:21.5px!important;align-self:start!important;font-size:12px!important;gap:0!important}',
    '#sheet.opal#sheet.opal .tinfo.tnw .tupb::before,#sheet.opal#sheet.opal .tinfo.tnw .tupb::after{content:none!important}',
    // ---- 알림 (노란 상자 → 오팔 진주 알약): 메뉴가 열려 있을 때, 아래에서 톡 떠오르며 반짝 ----
    'body:has(#sheet.opal.on) #toast{background:linear-gradient(180deg,#ffffff,#f1ecfa)!important;color:var(--navy,#2b3157)!important;border:1px solid rgba(170,160,220,.55)!important;border-radius:999px!important;box-shadow:0 8px 20px rgba(80,70,140,.25),inset 0 1px 0 #fff,inset 0 -2px 5px rgba(150,140,210,.18)!important;font:800 13.5px/1.25 "Noto Sans KR","Malgun Gothic",sans-serif!important;padding:10px 18px 10px 16px!important;text-shadow:none!important;overflow:hidden;white-space:nowrap!important;width:max-content!important}',
    'body:has(#sheet.opal.on) #toast::before{content:"✦";margin-right:7px;color:#1f9a96;font-size:11px;vertical-align:1px}',
    'body:has(#sheet.opal.on) #toast::after{content:"";position:absolute;top:0;bottom:0;left:-40%;width:35%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.85),transparent);transform:skewX(-18deg);opacity:0}',
    'body:has(#sheet.opal.on) #toast.on{animation:opToastIn .42s cubic-bezier(.2,1.4,.4,1) both}body:has(#sheet.opal.on) #toast.on::after{animation:opToastShine .9s .15s ease-out both}',
    '@keyframes opToastIn{0%{opacity:0;transform:translateX(-50%) translateY(16px) scale(.9)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}',
    '@keyframes opToastShine{0%{left:-40%;opacity:1}100%{left:120%;opacity:1}}',
    // ---- 장비 다듬기 (사용자 2026-11-16 아이폰) ----
    // 그림: 오른쪽으로 25px 민 자리는 지팡이(비스듬한 시안 자리)만, 나머지는 받침대 가운데
    '#sheet.opal#sheet.opal .gstage:not(.k-staff) .ns-obj>img{left:4.2px!important}',
    // 종류 탭: 고른 탭의 청록 표시(9px)가 글자를 가리지 않게 글자 아래 여백을 13px로
    '#sheet.opal#sheet.opal .kindtabs[role=tablist]:not(.rgroup) button{padding:3px 0 13px!important}',
    // 효과 줄: 숫자는 남은 칸 안에서 오른쪽 맞춤 (넘치면 글자만 줄임, 두 효과면 두 줄)
    '#sheet.opal#sheet.opal .opbag .ef b{justify-self:stretch!important;width:100%;min-width:0;overflow:hidden;text-overflow:clip!important;text-align:right}',
    '#sheet.opal#sheet.opal .opbag .ef b.two{white-space:nowrap;line-height:1.25}',
    // 반지 두 효과: 이름 칸(왼쪽 맞춤) | 숫자 칸(오른쪽 맞춤) 두 줄 표, 표는 칸 오른쪽에 붙임 (사용자 2026-11-16 줄맞춤)
    '#sheet.opal#sheet.opal .opbag .ef b.two{display:grid;grid-template-columns:auto auto;column-gap:5px;row-gap:1px;justify-self:end!important;width:auto!important;max-width:100%;overflow:visible!important}',
    '#sheet.opal#sheet.opal .opbag .ef b.two>.k{text-align:left;font-weight:700}#sheet.opal#sheet.opal .opbag .ef b.two>.v{text-align:right;font-variant-numeric:tabular-nums}',
    '#sheet.opal#sheet.opal .opbag .ef.stack{grid-template-columns:auto minmax(0,1fr);row-gap:2px}#sheet.opal#sheet.opal .opbag .ef.stack>b.two{grid-column:1/-1}',
    // 장비 목록 칸: 큰 그림(불멸 반지 등)이 위쪽 「불멸 I」 글자를 덮지 않게 — 글자는 위로, 그림은 글자 아래부터 (사용자 2026-11-16)
    '#sheet.opal#sheet.opal .bgrid .bcell .tg{top:2px!important;z-index:3;text-shadow:0 0 2px #fff,0 0 2px #fff,0 1px 0 #fff!important}',
    // 폰: 그림을 꾸욱 누르면 아이폰은 그림이 상자째 떠오르는 미리보기, 갤럭시는 「이미지 저장」 메뉴가 뜸 → 메뉴 안 그림은 손가락을 받지 않음 (누름은 감싼 칸이 받음)
    '#sheet img{pointer-events:none;-webkit-touch-callout:none;-webkit-user-drag:none}',
    // 징표 그림(위쪽 돔·목록 그림)도 꾸욱 누르면 연속 강화
    '#sheet.opal#sheet.opal .rkv .rkv-mk[data-mkhold],#sheet.opal#sheet.opal .rkr-ico[data-mkhold]{pointer-events:auto;cursor:pointer;-webkit-touch-callout:none}',
    '#sheet.opal#sheet.opal .bgrid .bcell .gcimg{top:19%!important;left:12%!important;width:76%!important;height:62%!important}',
    '#sheet.opal#sheet.opal .opbag .ef span{white-space:nowrap}',
    // 레벨업 버튼: 안 글자가 버튼 밖으로 나가지 않게
    '#sheet.opal#sheet.opal .bagbtns>.buy{overflow:hidden;min-width:0!important;padding-left:8px!important;padding-right:8px!important;gap:4px!important}#sheet.opal#sheet.opal .bagbtns>.buy span{white-space:nowrap}',
    // 레벨업 버튼 크게 (형 2026-11-18 「너무 작다」): 높이 28 → 40px, 글씨 16 → 18px, 비용 12.5 → 15px. 옆 장착·합성·초월·잠재력은 그대로
    '#sheet.opal#sheet.opal#sheet.opal .bagbtns>.buy{height:40px!important;min-height:40px!important}#sheet.opal#sheet.opal#sheet.opal .bagbtns>.pot{align-self:center!important}',
    '#sheet.opal#sheet.opal#sheet.opal .bagbtns>.buy small{font-size:18px!important}#sheet.opal#sheet.opal#sheet.opal .bagbtns>.buy span{font-size:15px!important}#sheet.opal#sheet.opal#sheet.opal .bagbtns>.buy .coin{width:15px;height:15px}',
    // 장착·보유 효과 숫자: 자릿수 폭을 같게 (숫자가 바뀌어도 글자 덩어리 폭이 그대로)
    '#sheet.opal#sheet.opal .opbag .ef b,#sheet.opal#sheet.opal .opbag .glv{font-variant-numeric:tabular-nums}',
    // 반지처럼 효과가 두 개인 줄(두 줄 표): 위의 한 줄 높이 고정(22px)을 풀어 두 줄이 겹치지 않게 (형 2026-11-18)
    '#sheet.opal#sheet.opal .opbag .ef.tw2{height:auto!important;min-height:22px}#sheet.opal#sheet.opal .opbag .ef.tw2>*{line-height:1.25!important}#sheet.opal#sheet.opal .opbag .ef.tw2 b.two>*{line-height:1.25!important}',
    // 좁은 폰에서 표가 아래 줄로 내려간 경우(stack): 표를 줄 전체 폭으로 — 이름은 「장착 효과」 글자 시작에 맞추고, 숫자는 오른쪽 끝에서 같은 여백 (형 2026-11-18 「줄칸 넓이 깔끔하게, 옆에 여백」)
    '#sheet.opal#sheet.opal#sheet.opal .opbag .ef.stack>b.two{justify-self:stretch!important;width:auto!important;max-width:none!important;grid-template-columns:minmax(0,1fr) auto!important;padding:0 0 0 15px;box-sizing:border-box}',
    // 장비 줄·칸 맞춤 (형 2026-11-18 「줄맞춤 칸맞춤 다시」): 잠재력 상자도 효과 상자와 같은 안쪽 여백(9px) → ✦ 아이콘 세로줄이 같고,
    // 잠재력 줄의 점은 ✦ 칸 가운데·글자는 「장착 효과」 글자 시작과 같은 자리, 자물쇠 오른쪽 끝은 효과 숫자 오른쪽 끝과 같은 자리
    // (줄 바탕 알약은 양옆 4px만 바깥으로 — 상자 테두리와 5px 떨어지게, 형 폰 화면 2026-11-18 「여백 안 맞어」)
    // 위아래 여백도 효과 상자와 같게: 「잠재력」 글자가 윗변에 붙던 것 → 위 6px·아래 5px
    '#sheet.opal#sheet.opal#sheet.opal .opbag .gpot{padding:7px 9px 5px!important}#sheet.opal#sheet.opal#sheet.opal .opbag .potline:last-child{margin-bottom:0!important}',
    '#sheet.opal#sheet.opal#sheet.opal .opbag .potline{margin-left:-4px!important;margin-right:-4px!important;padding-left:4px!important;padding-right:4px!important;column-gap:6px!important;gap:6px!important}',
    '#sheet.opal#sheet.opal#sheet.opal .opbag .ptag{margin:0 .7px!important}#sheet.opal#sheet.opal#sheet.opal .opbag .pthead{gap:6px!important}',
    // 효과 하나인 줄: 「공격력」 칸 | 숫자 칸 (ui.js fitGear 가 두 줄 칸 너비를 같게 맞춤)
    '#sheet.opal#sheet.opal#sheet.opal .opbag .ef b.one{display:grid!important;grid-template-columns:auto auto;column-gap:5px;justify-self:end!important;width:auto!important;max-width:100%;overflow:visible!important;white-space:nowrap}',
    '#sheet.opal#sheet.opal#sheet.opal .opbag .ef b.one>.k{text-align:left}#sheet.opal#sheet.opal#sheet.opal .opbag .ef b.one>.v{text-align:left}',
    // 숫자는 「+」 시작을 두 줄 같은 세로줄에 (형 2026-11-18 「여기 맞춰」: +61920% 를 위 줄 +247682% 시작에) — 반지 표도 같게
    '#sheet.opal#sheet.opal#sheet.opal .opbag .ef b.two>.v{text-align:left!important}',
    '#sheet.opal#sheet.opal#sheet.opal .opbag .ef.stack>b.one{grid-column:1/-1;justify-self:stretch!important;width:auto!important;max-width:none!important;grid-template-columns:minmax(0,1fr) auto!important;padding:0 0 0 15px;box-sizing:border-box}',
    // 자물쇠 그림은 칸 오른쪽 끝에 붙여 효과 숫자 오른쪽 끝과 같은 세로줄로
    '#sheet.opal#sheet.opal#sheet.opal .opbag .plock{background-position:center!important;margin-right:9px!important}',   // 자물쇠는 알약 끝에서 조금 안쪽 (형 2026-11-18 「너무 끝에, 살짝 왼쪽으로」)
    // 강화 버튼 크게 (형 2026-11-18 「특성·코스튬, 스킬 강화 버튼 쪽 전부 키워」)
    // 특성: 100×30 → 102×40 (가운데 높이는 그대로, 오른쪽은 카드 끝에서 10px)
    '#sheet.opal#sheet.opal#sheet.opal .tinfo.tnw .tupb{width:102px!important;height:40px!important;margin-top:16.5px!important;font-size:13px!important;white-space:nowrap}',
    // 코스튬 전시대 아래 입기·강화: 29 → 40px
    '#sheet.opal#sheet.opal#sheet.opal .cosstage .cs-act>*{min-height:40px!important;height:40px}#sheet.opal#sheet.opal#sheet.opal .cosstage .cs-act .buy small{font-size:16px!important}#sheet.opal#sheet.opal#sheet.opal .cosstage .cs-act .buy span{font-size:14px!important}',
    // 스킬 목록 줄의 보기·넣기·강화: 23 → 28px (아래 설명 글 위까지)
    '#sheet.opal#sheet.opal#sheet.opal .skr .bs{top:8px!important;height:28px!important}#sheet.opal#sheet.opal#sheet.opal .skr .b{height:28px!important}#sheet.opal#sheet.opal#sheet.opal .skr :is(.b.see,.b.put,.b.up){font-size:13px!important}',
    // 스킬 상세의 넣기·강화: 43 → 50px
    '#sheet.opal#sheet.opal#sheet.opal .skd-bot>button{height:50px!important}',
    // ---- 스킬 목록 = 사용자 스킬 부품 + 시안(10-skills) 실측 (2026-11-16, 시안 패널 962px = 화면 391px, 좌표는 .skw 기준 = 화면 x-16, y-40) ----
    '#sheet.opal#sheet.opal .skw{position:relative;height:321px;margin:3px 0 -3px!important;padding:0!important}',   // 시안보다 14px 아래: 우리 제목 글자 아래 끝이 시안보다 11px 낮아서, 창·모자가 제목에 닿지 않게 (사용자 2026-11-16)
    '#sheet.opal#sheet.opal .skw>*{position:absolute}',
    '#sheet.opal#sheet.opal .skv{left:0;top:0;width:359px;height:128px;pointer-events:none}#sheet.opal#sheet.opal .skv>*{position:absolute}',
    // 성운 전시 창 = 부품 마스크(sk-win)로 자른 부품 성운(sk-neb, cover) + 부품 유리 테두리(sk-winrim), 안의 성운만 천천히 숨쉬기.
    // 시안 성운 경계에 맞춘 자리: 시안 화면 x8 y19.5, 371.7×265.5 (.skv 기준 -8, -20.5), 아래는 받침대 둘레에서 사라짐
    '#sheet.opal#sheet.opal .skv-neb{left:-8px;top:-20.5px;width:371.7px;height:265.5px;overflow:hidden;-webkit-mask:url(art/sk-win.webp) 0 0/100% 100% no-repeat;mask:url(art/sk-win.webp) 0 0/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .skv-neb::before{content:"";position:absolute;inset:0;background:url(art/sk-neb.webp) 0 0/100% 100% no-repeat;animation:opAlNeb 30s ease-in-out infinite alternate}',
    '#sheet.opal#sheet.opal .skv-cst{left:0;top:0;width:359px;height:128px;overflow:visible}',
    '#sheet.opal#sheet.opal .skv-rim{left:-8px;top:-20.5px;width:371.7px;height:265.5px;background:url(art/sk-winrim.webp) 0 0/100% 100% no-repeat}',
    // 받침대 (보이는 192×24, 윗면 화면 y143) + 지금 입은 코스튬 (발 화면 y155, 키 123)
    '#sheet.opal#sheet.opal .skv-ped{left:34.75px;top:84.3px;width:290.5px;height:61px;background:url(art/mn-ped.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .skv-cat{left:114px;top:-9.4px;width:130px!important;height:130px!important;max-width:none!important;object-fit:contain;transform:translateY(var(--fy,0%));animation:opBreath 4s ease-in-out infinite}',
    '@keyframes opBreath{0%,100%{scale:1 1}50%{scale:1.012 .992}}',
    // 슬롯 카드 4장 (화면 x21/113.7/206.3/299, y172, 77×93) + 사이 › 화살표
    '#sheet.opal#sheet.opal .skslots{left:0;top:132px;width:359px;height:93px}',
    '#sheet.opal#sheet.opal .skc{position:absolute;top:0;width:77px!important;height:93px!important;min-height:0!important;margin:0!important;padding:0!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/sk-slot.webp) 60 fill / 16.8px / 3.1px 2.8px 4.4px 2.8px stretch!important;color:var(--navy)!important}',
    '#sheet.opal#sheet.opal .skc:nth-child(1){left:5px}#sheet.opal#sheet.opal .skc:nth-child(2){left:97.7px}#sheet.opal#sheet.opal .skc:nth-child(3){left:190.3px}#sheet.opal#sheet.opal .skc:nth-child(4){left:283px}',
    '#sheet.opal#sheet.opal .skc.on{border-image:url(art/sk-slot-sel.webp) 51 fill / 15.2px / 2.7px 2.7px 4.5px 2.7px stretch!important;filter:drop-shadow(0 0 4px rgba(80,210,200,.45))}',
    '#sheet.opal#sheet.opal .skc>*{position:absolute}',
    '#sheet.opal#sheet.opal .skc .n{left:8px;top:4px;font:800 15px/1 "Times New Roman",Georgia,serif;color:var(--navy)}',
    '#sheet.opal#sheet.opal .skc .ic{left:11.5px;top:8px;width:54px;height:54px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,rgba(150,134,240,.95) 0,rgba(128,110,226,.75) 34%,rgba(170,156,244,.35) 58%,rgba(176,166,240,0) 72%)}',
    '#sheet.opal#sheet.opal .skc .ic img.si{width:48px!important;height:48px!important;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(60,40,120,.3));animation:opFloat 3.2s ease-in-out infinite}',
    '#sheet.opal#sheet.opal .skc .ic .si.old{width:38px;height:38px;display:grid;place-items:center;border-radius:9px;overflow:hidden}#sheet.opal#sheet.opal .skc .ic .si.old>*{width:38px!important;height:38px!important}',
    '#sheet.opal#sheet.opal .skc .ic .plus{width:24px;height:24px;background:url(art/sk-plus.webp) 50% 50%/contain no-repeat;opacity:.7}',
    '#sheet.opal#sheet.opal .skc .nm{left:3px;right:3px;top:60px;height:15px;text-align:center;font:800 13px/15px var(--body);white-space:nowrap;overflow:hidden;color:var(--navy)}',
    '#sheet.opal#sheet.opal .skc .lv{left:6px;right:6px;top:75px;height:15px;display:grid;place-items:center;border-radius:8px;background:rgba(232,228,246,.9);box-shadow:inset 0 1px 1px rgba(120,110,170,.15);font:700 12.5px/1 var(--body);font-style:normal;color:var(--navy)}',
    '#sheet.opal#sheet.opal .skc.empty .nm,#sheet.opal#sheet.opal .skc.empty .lv{color:#9aa0b8}',
    // 슬롯 카드 귀퉁이 빼기(×)·「모두 빼기」 (사용자 2026-11-16): 보이는 원 20px, 누르는 칸은 ::before 로 36px
    '#sheet.opal#sheet.opal .skx{position:absolute;top:-6px;z-index:3;width:22px;height:22px;min-width:0!important;min-height:0!important;padding:0!important;margin:0!important;border-radius:50%;border:1.5px solid rgba(255,255,255,.95)!important;background:linear-gradient(180deg,#9a8fe0,#6f66c4)!important;box-shadow:0 2px 4px rgba(60,50,130,.35)!important;-webkit-tap-highlight-color:transparent}',
    '#sheet.opal#sheet.opal .skx::before{content:"";position:absolute;inset:-8px}#sheet.opal#sheet.opal .skx::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;transform:translate(-50%,-50%);background:linear-gradient(45deg,transparent 42%,#fff 42%,#fff 58%,transparent 58%),linear-gradient(-45deg,transparent 42%,#fff 42%,#fff 58%,transparent 58%)}',
    '#sheet.opal#sheet.opal .skx:active{transform:scale(.92)}',
    '#sheet.opal#sheet.opal .skx.x1{left:66px}#sheet.opal#sheet.opal .skx.x2{left:158.7px}#sheet.opal#sheet.opal .skx.x3{left:251.3px}#sheet.opal#sheet.opal .skx.x4{left:344px}',
    '#sheet.opal#sheet.opal .skallout{position:absolute;right:4px;top:100px;z-index:3;height:26px;min-height:0!important;padding:0 11px!important;margin:0!important;border-radius:999px;border:1.5px solid rgba(255,255,255,.9)!important;background:rgba(255,255,255,.34)!important;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);box-shadow:0 2px 6px rgba(60,50,130,.18)!important;font:800 12px/1 var(--body)!important;color:var(--navy)!important;white-space:nowrap;-webkit-tap-highlight-color:transparent}',
    '#sheet.opal#sheet.opal .skallout::before{content:"";position:absolute;inset:-9px -4px}#sheet.opal#sheet.opal .skallout:active{transform:scale(.96)}',
    '#sheet.opal#sheet.opal .skc:active{transform:scale(.97)}',
    '#sheet.opal#sheet.opal .skar{position:absolute;top:38px;width:11px;height:17px;margin-left:-5.5px;background:none;border:0}',
    '#sheet.opal#sheet.opal .skar::before{content:"";position:absolute;left:0;top:3.5px;width:8px;height:8px;border-right:2.6px solid #8a8eab;border-bottom:2.6px solid #8a8eab;transform:rotate(-45deg);border-radius:1px}',
    '#sheet.opal#sheet.opal .skar.a1{left:89.8px}#sheet.opal#sheet.opal .skar.a2{left:182.5px}#sheet.opal#sheet.opal .skar.a3{left:275.2px}',
    // 다시 1번: 4번 아래에서 1번 아래로 돌아오는 선 (부품) + 가운데 알약
    '#sheet.opal#sheet.opal .skret{left:39.8px;top:219.5px;width:290.4px;height:40.8px;pointer-events:none}',
    '#sheet.opal#sheet.opal .skret>i{position:absolute;inset:0;background:url(art/sk-ret.webp) 0 0/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .skret>span{position:absolute;left:109.2px;top:13.5px;width:63px;height:18px;display:grid;place-items:center;border:0 solid transparent;border-image:url(art/sk-cost.webp) 45 fill / 9px / 1.6px 1.6px 2.4px 1.6px stretch;font:700 11.5px/1 var(--body);color:var(--navy)}',
    // 프리셋 · 자동 배치 · 일괄 강화 (화면 y300~326)
    '#sheet.opal#sheet.opal .skpre{left:0;top:260px;width:359px;height:26px}#sheet.opal#sheet.opal .skpre>*{position:absolute}',
    '#sheet.opal#sheet.opal .skpre .pp{left:1px;top:2px;width:148px;height:23px;border:0 solid transparent;border-image:url(art/sk-sec.webp) 51 fill / 11.5px / 2.2px 2.2px 3.5px 2.2px stretch}',
    '#sheet.opal#sheet.opal .skpre .pp>span{position:absolute;left:9px;top:0;line-height:23px;font:800 13px/23px var(--body);color:var(--navy)}',
    '#sheet.opal#sheet.opal .skpre .pb{position:absolute;top:1px;width:27px!important;height:21px!important;min-height:0!important;min-width:0!important;padding:0!important;margin:0!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/sk-pre.webp) 42 fill / 9px / 1.6px 1.6px 2.4px 1.6px stretch!important;font:800 13px/1 "Times New Roman",Georgia,serif!important;color:var(--navy)!important}',
    '#sheet.opal#sheet.opal .skpre .pb:nth-of-type(1){left:55px}#sheet.opal#sheet.opal .skpre .pb:nth-of-type(2){left:88px}#sheet.opal#sheet.opal .skpre .pb:nth-of-type(3){left:119px}',
    '#sheet.opal#sheet.opal .skpre .pb.on::after{content:"";position:absolute;inset:.5px .5px 1.5px;border:1.8px solid #2a9e98;border-radius:7px;box-shadow:0 0 4px rgba(42,158,152,.35)}',
    '#sheet.opal#sheet.opal .skpre .sep{left:160px;top:5px;width:1px;height:16px;background:#cfd2e2}',
    '#sheet.opal#sheet.opal .skpre .auto,#sheet.opal#sheet.opal .skpre .bulk{top:1px;height:25px!important;min-height:0!important;padding:0!important;margin:0!important;display:flex!important;align-items:center;justify-content:center;gap:8px;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;font:800 13.5px/1 var(--body)!important}',
    '#sheet.opal#sheet.opal .skpre .auto{left:170px;width:99px!important;border-image:url(art/sk-btn.webp) 57 fill / 12px / 1.8px 1.8px 2.6px 1.8px stretch!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)}',
    '#sheet.opal#sheet.opal .skpre .auto>i{width:9px;height:9px;-webkit-mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;background:#fff}',
    '#sheet.opal#sheet.opal .skpre .bulk{left:276px;width:84px!important;border-image:url(art/sk-sec.webp) 51 fill / 12px / 2.2px 2.2px 3.5px 2.2px stretch!important;color:var(--navy)!important}',
    '#sheet.opal#sheet.opal .skpre .auto:active{border-image-source:url(art/sk-btn-press.webp)!important}#sheet.opal#sheet.opal .skpre .bulk:active,#sheet.opal#sheet.opal .skpre .pb:active{filter:brightness(.96)}',
    // 보유 효과 (화면 x17~377, y339~361)
    '#sheet.opal#sheet.opal .skown{left:1px;top:299px;width:360px;height:22px;display:flex;align-items:center;justify-content:center;gap:6px;border:0 solid transparent;border-image:url(art/sk-pill.webp) 45 fill / 11px / 1.5px 1.5px 2.5px 1.5px stretch;font:800 14px/1 var(--body);color:var(--navy)}',
    '#sheet.opal#sheet.opal .skown>i{width:15px;height:15px;-webkit-mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;background:linear-gradient(160deg,#b9aee6,#7d74b3)}',
    '#sheet.opal#sheet.opal .skown em{font-style:normal;color:#7d82a0}#sheet.opal#sheet.opal .skown b{font:800 15px/1 var(--body)!important;color:#1a8c86!important}',
    // 스킬 줄 (360×54): 아이콘 칸 | 이름 +강화 / 속성·대상 / 설명 | 구분선 | 보기 · 넣기 · 강화
    '#sheet.opal#sheet.opal .skl{display:flex;flex-direction:column;gap:7px;margin:0!important;padding:0!important}',
    '#sheet.opal#sheet.opal .skr{position:relative;width:360px;height:54px;margin:0 0 0 1px;border:0 solid transparent;border-image:url(art/sk-row.webp) 66 fill / 12.4px / 1.9px 1.9px 3px 1.9px stretch}',
    '#sheet.opal#sheet.opal .skr>*{position:absolute}',
    '#sheet.opal#sheet.opal .skr .tile{left:6px;top:5px;width:47px;height:44px;border-radius:10px;display:grid;place-items:center;background:radial-gradient(circle at 32% 28%,#e4e0ff 0,#a59ef0 45%,#6c68cf 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.75),inset 0 -6px 10px rgba(60,50,150,.25),0 2px 4px rgba(80,80,150,.25);overflow:hidden}',
    '#sheet.opal#sheet.opal .skr .tile img.ti{width:42px!important;height:42px!important;object-fit:contain;filter:drop-shadow(0 2px 2px rgba(40,30,90,.35))}',
    '#sheet.opal#sheet.opal .skr .tile.oldt{background:none;box-shadow:none}#sheet.opal#sheet.opal .skr .tile .ti.old,#sheet.opal#sheet.opal .skr .tile .ti.old>*{width:46px!important;height:46px!important;display:block}',
    '#sheet.opal#sheet.opal .skr .tile.opfx{animation:opPop .3s ease-out var(--opd,0s) both}',
    '#sheet.opal#sheet.opal .skr .nm{left:63px;top:3px;font:800 15px/17px var(--body);color:var(--navy);white-space:nowrap}#sheet.opal#sheet.opal .skr .nm b{font:800 15px/17px var(--body)!important;color:var(--navy)!important}',
    '#sheet.opal#sheet.opal .skr .tile{overflow:visible!important}#sheet.opal#sheet.opal .skr .tile .wk{position:absolute;left:50%;bottom:-4px;transform:translateX(-50%);padding:1.5px 5px 2px;border-radius:6px;background:linear-gradient(180deg,#ffb48a,#f27a4d);box-shadow:0 1px 3px rgba(150,60,30,.35),inset 0 0 0 1px rgba(255,255,255,.5);font:800 9px/1 var(--body);font-style:normal;color:#fff;white-space:nowrap}',   // 지금 지역이 이 속성에 약함 (배율은 상세 「유리한 지역 보기」)
    '#sheet.opal#sheet.opal .skr .chip{left:62px;top:21px;height:14px;display:flex;align-items:center;gap:4px;padding:0 9px 0 6px;border:0!important;box-shadow:none!important;border-radius:7px;background:rgba(228,224,246,.95)!important;font:700 10.5px/1 var(--body);color:var(--navy);white-space:nowrap}',
    '#sheet.opal#sheet.opal .skr .chip .el{width:11px;height:11px;-webkit-mask:var(--el) 50% 50%/contain no-repeat;mask:var(--el) 50% 50%/contain no-repeat;background:#8f86c9}#sheet.opal#sheet.opal .skr .chip em{font-style:normal;color:#7d82a0}',
    '#sheet.opal#sheet.opal .skr .how{left:63px;top:37px;width:290px;font:600 12px/14px var(--body);color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#sheet.opal#sheet.opal .skr .dv{left:198px;top:12px;width:1px;height:24px;background:#d3d6e6}',
    '#sheet.opal#sheet.opal .skr .bs{left:205px;top:17px;width:152px;height:20px}',
    '#sheet.opal#sheet.opal .skr .b{position:absolute;top:0;height:20px!important;min-height:0!important;min-width:0!important;padding:0!important;margin:0!important;display:grid!important;place-items:center;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/sk-sec.webp) 51 fill / 9.2px / 1.8px 1.8px 2.9px 1.8px stretch!important;font:800 13px/1 var(--body)!important;color:var(--navy)!important;white-space:nowrap}',
    '#sheet.opal#sheet.opal .skr .b::before{content:"";position:absolute;inset:-12px -2px}',
    '#sheet.opal#sheet.opal .skr .b.see{left:0;width:48px!important}#sheet.opal#sheet.opal .skr .b.put,#sheet.opal#sheet.opal .skr .b.out{left:51px;width:47px!important}#sheet.opal#sheet.opal .skr .b.up{left:103px;width:49px!important}',
    '#sheet.opal#sheet.opal .skr .b.put{border-image-source:url(art/sk-btn.webp)!important;border-image-slice:57 fill!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)}',
    '#sheet.opal#sheet.opal .skr .b.put.long,#sheet.opal#sheet.opal .skr .b.out{font-size:10.5px!important;letter-spacing:-.3px}',
    // 「3번에 넣기」·「1번 빼기」가 47px 칸에 꽉 끼던 것 (사용자 2026-11-16 「너무 타이트해서 터질라고」): 가운데 칸을 60px 로, 보기·강화는 조금 좁게
    '#sheet.opal#sheet.opal .skr .b.see{width:43px!important}#sheet.opal#sheet.opal .skr .b.put,#sheet.opal#sheet.opal .skr .b.out{left:46px;width:61px!important}#sheet.opal#sheet.opal .skr .b.up{left:110px;width:42px!important}#sheet.opal#sheet.opal .skr .b.put.long,#sheet.opal#sheet.opal .skr .b.out{font-size:11px!important;letter-spacing:-.2px}',
    // 2026-11-17 (형: 줄·칸 맞춰): 보기·넣기/빼기·강화 세 버튼 글씨를 모두 12px 로 같게 (가운데만 11px 로 작았음)
    '#sheet.opal#sheet.opal .skr :is(.b.see,.b.put,.b.put.long,.b.out,.b.up){font-size:12px!important}',
    // 2026-11-17 (형: 이 세로줄 없애고 보기·1번 빼기·강화 칸을 좀 키워): 구분선 없애고 그 자리까지 버튼 칸을 넓힘 — 152×20 → 162×24,
    // 위로는 이름 줄(3~20px)과 안 겹치고 아래로는 설명 줄(37px~)과 안 겹치는 13~37px
    '#sheet.opal#sheet.opal .skr .dv{display:none!important}',
    '#sheet.opal#sheet.opal .skr .bs{left:194px;top:12px;width:162px;height:23px}',
    '#sheet.opal#sheet.opal .skr .b{height:23px!important}',
    '#sheet.opal#sheet.opal .skr .b.see{left:0;width:46px!important}#sheet.opal#sheet.opal .skr .b.put,#sheet.opal#sheet.opal .skr .b.out{left:50px;width:64px!important}#sheet.opal#sheet.opal .skr .b.up{left:118px;width:44px!important}',
    '#sheet.opal#sheet.opal .skr :is(.b.see,.b.put,.b.put.long,.b.out,.b.up){font-size:12.5px!important}',
    '#sheet.opal#sheet.opal .skr .b.off{color:#9aa0b8!important}',
    '#sheet.opal#sheet.opal .skr .b:active{filter:brightness(.95);transform:scale(.97)}#sheet.opal#sheet.opal .skr .b.put:active{border-image-source:url(art/sk-btn-press.webp)!important}',
    '#sheet.opal#sheet.opal .skr .lk{left:0;top:0;width:152px;height:20px;display:flex;align-items:center;justify-content:center;gap:4px;font:700 12px/1 var(--body);color:#8a90a8}#sheet.opal#sheet.opal .skr .lk>i{width:12px;height:13px;background:url(art/sk-lock.webp) 50% 50%/contain no-repeat}',
    '#sheet.opal#sheet.opal .skr.lock .tile,#sheet.opal#sheet.opal .skr.lock .nm,#sheet.opal#sheet.opal .skr.lock .chip,#sheet.opal#sheet.opal .skr.lock .how{opacity:.55;filter:grayscale(.4)}',
    // 차수 이름 줄 (작게)
    '#sheet.opal#sheet.opal .sktier2{display:flex;align-items:center;gap:6px;height:16px;margin:2px 4px 0;font:800 11.5px/1 var(--body);color:#6d7290}',
    '#sheet.opal#sheet.opal .sktier2>i{flex:1;height:1px;background:linear-gradient(90deg,rgba(150,152,196,0),rgba(150,152,196,.5))}#sheet.opal#sheet.opal .sktier2>i:last-child{background:linear-gradient(90deg,rgba(150,152,196,.5),rgba(150,152,196,0))}',
    '#sheet.opal#sheet.opal .sktier2 b{color:var(--navy)}#sheet.opal#sheet.opal .sktier2 small{font:700 10.5px/1 var(--body);color:#b0623f}',
    // ---- 스킬 상세 = 시안(11-skill-detail) 실측 (2026-11-16, 시안 패널 913px = 화면 391px, 좌표는 .skd 기준 = 화면 x-16, y-40) ----
    '#sheet.opal#sheet.opal .skd{position:relative;height:447px;margin:-11px 0 0!important;padding:0!important}',
    '#sheet.opal#sheet.opal .skd>*{position:absolute}',
    '#sheet.opal#sheet.opal .skd-v{left:0;top:0;width:359px;height:195px;pointer-events:none}#sheet.opal#sheet.opal .skd-v>*{position:absolute}',
    // 성운 아치 창 (화면 x10~382, 위 끝 y46) — 목록 창과 같은 모양을 조금 크게
    '#sheet.opal#sheet.opal .skd-neb{left:-15px;top:-6px;width:386.4px;height:276px;overflow:hidden;-webkit-mask:url(art/sk-dwin.webp) 0 0/100% 100% no-repeat;mask:url(art/sk-dwin.webp) 0 0/100% 100% no-repeat}',   // 목록과 같은 부품 창, 시안 상세 경계에 맞춤 (시안 화면 x1 y34, ×0.92)
    '#sheet.opal#sheet.opal .skd-neb::before{content:"";position:absolute;inset:0;background:url(art/sk-dneb.webp) 0 0/100% 100% no-repeat;animation:opAlNeb 30s ease-in-out infinite alternate}',
    '#sheet.opal#sheet.opal .skd-rim{left:-15px;top:-6px;width:386.4px;height:276px;background:url(art/sk-dwinrim.webp) 0 0/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .skd-cst{left:0;top:0;width:359px;height:200px;overflow:visible}',
    // 긴 전시대 (보이는 357×25, 윗면 y207) — 부품보다 납작해서 세로만 0.6배
    '#sheet.opal#sheet.opal .skd-ped{left:-16.2px;top:138.6px;width:391.4px;height:78px;background:url(art/sk-prev-ped.webp) 50% 50%/100% 100% no-repeat}',
    // 시전 자세 냥법사 · 연습 슬라임: 부품 그림을 시안에 직접 대서 찾은 자리 (사용자 2026-11-16 「같다고 시안이랑?」)
    // 냥법사 그림 범위 = 화면 x21.7~181.7, y80.3~214 (그림 상자 176.7×149.4) / 슬라임 = 화면 x286~361.3, y138.3~205.6 (받침대 위에 앉음)
    '#sheet.opal#sheet.opal .skd-caster{left:-5.2px;top:33px;width:176.7px!important;height:149.4px!important;max-width:none!important;object-fit:contain;transform-origin:30% 100%}',
    '#sheet.opal#sheet.opal .skd-slime{left:270px;top:98.3px;width:75.3px!important;height:67.3px!important;max-width:none!important;transform-origin:50% 100%;animation:skBob 2.4s ease-in-out infinite}',
    '@keyframes skBob{0%,100%{translate:0 0}50%{translate:0 -2px}}',
    '#sheet.opal#sheet.opal .skd-glow{left:145.8px;top:81px;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle,#fff 0,rgba(255,240,200,.9) 25%,rgba(255,200,240,.4) 55%,rgba(255,200,240,0) 72%);opacity:0}',
    '#sheet.opal#sheet.opal .skd-hit{left:261px;top:104px;width:42px;height:42px;border-radius:50%;background:radial-gradient(circle,#fff 0,rgba(255,250,220,.85) 30%,rgba(255,220,250,0) 70%);opacity:0}',
    '#sheet.opal#sheet.opal .skd-shots{left:0;top:0;width:359px;height:195px}',
    // 별 (시안 멈춘 모습 = 길 끝에 서 있음): 부품 별 19px(몸통 17px), 기울기 18·15·18도, 반짝반짝 (돌리기·크기는 길을 따라가는 칸이 아니라 안쪽 그림에)
    '#sheet.opal#sheet.opal .skd-shots .p{position:absolute;left:0;top:0;width:19px;height:19px;display:grid;place-items:center;offset-anchor:50% 50%;offset-rotate:0deg;offset-distance:100%;opacity:1;filter:drop-shadow(0 0 1.5px rgba(255,250,235,.8)) drop-shadow(0 0 5px rgba(235,215,255,.45))}',
    '#sheet.opal#sheet.opal .skd-shots .p img,#sheet.opal#sheet.opal .skd-shots .p svg,#sheet.opal#sheet.opal .skd-shots .p .orb{width:19px!important;height:19px!important;max-width:none!important;object-fit:contain;rotate:var(--r,0deg);animation:skTw 2.6s ease-in-out var(--tw,0s) infinite}',
    '#sheet.opal#sheet.opal .skd-shots .p1{--r:18deg;--tw:0s;offset-path:path("M 166 91 C 186.4 83.3 211.1 73.4 232.4 82.8")}#sheet.opal#sheet.opal .skd-shots .p2{--r:15deg;--tw:-.9s;offset-path:path("M 167 97.5 C 197.2 90.2 227.3 100.6 256.8 104.7")}#sheet.opal#sheet.opal .skd-shots .p3{--r:18deg;--tw:-1.7s;offset-path:path("M 167 101 C 189.1 105.4 210.2 113.6 232.2 118.6")}',
    '@keyframes skTw{0%,100%{scale:1}50%{scale:1.09}}',
    // 빛꼬리 · 맞는 곳 반짝임 (멈춘 모습은 다 그려져 있음)
    '#sheet.opal#sheet.opal .skd-tr{left:0;top:0;width:359px;height:195px;overflow:visible}',
    '#sheet.opal#sheet.opal .skd-tr path{fill:none;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:0}',
    '#sheet.opal#sheet.opal .skd-tr .g{stroke:#b98cff;stroke-width:7.5;opacity:.55}#sheet.opal#sheet.opal .skd-tr .m{stroke-width:3.4;opacity:.75}#sheet.opal#sheet.opal .skd-tr .c{stroke-width:1.4}',
    '#sheet.opal#sheet.opal .skd-tr .dots circle{fill:#fff;filter:drop-shadow(0 0 1.2px rgba(236,214,255,.95));animation:skDot 1.6s ease-in-out var(--d,0s) infinite}@keyframes skDot{0%,100%{opacity:.35}50%{opacity:1}}',
    '#sheet.opal#sheet.opal .skd-wf{left:0;top:0;width:359px;height:195px;overflow:visible}',
    '#sheet.opal#sheet.opal .skd-wf .ws .gl{fill:url(#mcCstGlow2);opacity:.75}#sheet.opal#sheet.opal .skd-wf .ws .sp{fill:#fff;opacity:.9}#sheet.opal#sheet.opal .skd-wf .ws .co{display:none}#sheet.opal#sheet.opal .skd-wf .ws .dg{stroke:#fff;stroke-width:.7;opacity:.75}',
    '#sheet.opal#sheet.opal .skd-wf .w{transform-box:fill-box;transform-origin:50% 50%;animation:skHs 2.2s ease-in-out -.6s infinite}',
    '#sheet.opal#sheet.opal .skd-tr .l{stroke:#f6ecff;stroke-width:1.1;opacity:.85;filter:drop-shadow(0 0 1.6px rgba(196,150,255,.95))}',
    '#sheet.opal#sheet.opal .skd-tr .hs .gl{fill:url(#mcCstGlow2)}#sheet.opal#sheet.opal .skd-tr .hs .sp,#sheet.opal#sheet.opal .skd-tr .hs .co{fill:#fff}#sheet.opal#sheet.opal .skd-tr .hs .dg{stroke:#fff;stroke-width:.7;opacity:.8}',
    '#sheet.opal#sheet.opal .skd-tr .h{transform-box:fill-box;transform-origin:50% 50%;animation:skHs 1.8s ease-in-out infinite}',
    '@keyframes skHs{0%,100%{scale:1;opacity:.95}50%{scale:1.18;opacity:1}}',
    // 재생 (.run 을 다시 붙이면 처음부터): 지팡이 빛 → 세 발 → 슬라임이 맞을 때마다 찌그러지며 번쩍
    '#sheet.opal#sheet.opal .skd-v.run .skd-caster{animation:skCast .7s ease-out both}',
    '@keyframes skCast{0%{rotate:0deg}30%{rotate:-3deg}60%{rotate:1.5deg}100%{rotate:0deg}}',
    '#sheet.opal#sheet.opal .skd-v.run .skd-glow{animation:skGlow 1.1s ease-out .05s both}',
    '@keyframes skGlow{0%{opacity:0;scale:.4}25%{opacity:1;scale:1.3}100%{opacity:0;scale:.8}}',
    '#sheet.opal#sheet.opal .skd-v.run .p1{animation:skShot .55s cubic-bezier(.3,.1,.45,1) .2s both}#sheet.opal#sheet.opal .skd-v.run .p2{animation:skShot .55s cubic-bezier(.3,.1,.45,1) .35s both}#sheet.opal#sheet.opal .skd-v.run .p3{animation:skShot .55s cubic-bezier(.3,.1,.45,1) .5s both}',
    '#sheet.opal#sheet.opal .skd-v.run .p1>*{animation:skGrow .55s ease-out .2s both,skTw 2.6s ease-in-out 1.2s infinite}#sheet.opal#sheet.opal .skd-v.run .p2>*{animation:skGrow .55s ease-out .35s both,skTw 2.6s ease-in-out 1.5s infinite}#sheet.opal#sheet.opal .skd-v.run .p3>*{animation:skGrow .55s ease-out .5s both,skTw 2.6s ease-in-out 1.8s infinite}',
    '@keyframes skGrow{0%{scale:.4}100%{scale:1}}',
    '#sheet.opal#sheet.opal .skd-v.run .skd-tr .t1 path{animation:skTrail .55s cubic-bezier(.3,.1,.45,1) .2s both}#sheet.opal#sheet.opal .skd-v.run .skd-tr .t2 path{animation:skTrail .55s cubic-bezier(.3,.1,.45,1) .35s both}#sheet.opal#sheet.opal .skd-v.run .skd-tr .t3 path{animation:skTrail .55s cubic-bezier(.3,.1,.45,1) .5s both}',
    '#sheet.opal#sheet.opal .skd-v.run .skd-tr .b path{animation:skTrail .3s ease-in .8s both}#sheet.opal#sheet.opal .skd-v.run .skd-tr .h{animation:skHsIn .45s ease-out 1.05s both,skHs 1.8s ease-in-out 1.5s infinite}',
    '#sheet.opal#sheet.opal .skd-v.run .skd-tr .dots{animation:skFade .45s ease-out .55s both}@keyframes skFade{from{opacity:0}to{opacity:1}}',
    '@keyframes skTrail{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes skHsIn{0%{opacity:0;scale:.3}60%{opacity:1;scale:1.35}100%{opacity:.95;scale:1}}',
    '@keyframes skShot{0%{offset-distance:0%;opacity:0}15%{opacity:1}100%{offset-distance:100%;opacity:1}}',
    '#sheet.opal#sheet.opal .skd-v.run .skd-slime{animation:skHit .2s ease-out 1.05s 3,skBob 2.4s ease-in-out 1.7s infinite}',
    '@keyframes skHit{0%{scale:1 1;filter:brightness(1)}40%{scale:1.12 .86;filter:brightness(1.35)}100%{scale:1 1;filter:brightness(1)}}',
    '#sheet.opal#sheet.opal .skd-v.run .skd-hit{animation:skFlash .2s ease-out 1.05s 3}',
    '@keyframes skFlash{0%{opacity:0;scale:.5}35%{opacity:1;scale:1.1}100%{opacity:0;scale:1.3}}',
    // 목록으로 (무대 왼쪽 위 작은 진주 버튼)
    '#sheet.opal#sheet.opal .skd-back{left:6px;top:8px;z-index:3;width:30px!important;height:30px!important;min-width:0!important;min-height:0!important;padding:0 0 2px!important;margin:0!important;display:grid!important;place-items:center;border-radius:50%!important;background:linear-gradient(180deg,#fff,#eeeaf8)!important;box-shadow:0 2px 6px rgba(70,60,130,.25),inset 0 0 0 1px rgba(180,170,220,.6)!important;border:0!important;font:800 22px/1 var(--body)!important;color:var(--navy)!important}',
    // 미리보기 · 다시 보기 (화면 y238~262)
    '#sheet.opal#sheet.opal .skd-b{top:198px;height:24px!important;min-height:0!important;min-width:0!important;margin:0!important;padding:0!important;display:flex!important;align-items:center;justify-content:center;gap:8px;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/sk-sec.webp) 51 fill / 12px / 2.2px 2.2px 3.5px 2.2px stretch!important;font:800 14.5px/1 var(--body)!important;color:var(--navy)!important}',
    '#sheet.opal#sheet.opal .skd-b.play{left:1px;width:95px!important}#sheet.opal#sheet.opal .skd-b.again{left:262px;width:96px!important}',
    '#sheet.opal#sheet.opal .skd-b>i{width:15px;height:15px;background:50% 50%/contain no-repeat}#sheet.opal#sheet.opal .skd-b.play>i{background-image:url(art/sk-i-play.webp)}#sheet.opal#sheet.opal .skd-b.again>i{background-image:url(art/sk-i-repeat.webp)}',
    '#sheet.opal#sheet.opal .skd-b:active{filter:brightness(.95);transform:scale(.97)}',
    // 정보 상자 (화면 y272~360): 시전자 → 대상 + 그림 | 속성·대상 칩 + 설명
    '#sheet.opal#sheet.opal .skd-info{left:1px;top:232px;width:360px;height:88px;border:0 solid transparent;border-image:url(art/sk-detail.webp) 66 fill / 16px / 1.6px 1.6px 2.6px 1.6px stretch}',
    '#sheet.opal#sheet.opal .skd-info>*{position:absolute}',
    '#sheet.opal#sheet.opal .skd-info .who{left:0;width:176px;top:10px;text-align:center;font:800 15px/18px var(--body);color:var(--navy);white-space:nowrap}#sheet.opal#sheet.opal .skd-info .who em{font-style:normal;margin:0 4px;color:#4b5070}',
    '#sheet.opal#sheet.opal .skd-info .dv{left:176px;top:16px;width:1px;height:58px;background:#d3d6e6}',
    '#sheet.opal#sheet.opal .skd-info .dg{left:22px;top:40px;width:140px;height:36px}#sheet.opal#sheet.opal .skd-info .dg>i{position:absolute}',
    '#sheet.opal#sheet.opal .dg-cast{left:0;top:5px;width:26px;height:26px;-webkit-mask:url(art/sk-el-all.webp) 50% 50%/contain no-repeat;mask:url(art/sk-el-all.webp) 50% 50%/contain no-repeat;background:linear-gradient(160deg,#a69cd8,#5e5891)}',
    '#sheet.opal#sheet.opal .dg-trail{left:20px;top:-8px;width:76px;height:52px;background:url(art/sk-trail-u.webp) 0 0/100% 100% no-repeat,url(art/sk-trail-m.webp) 0 0/100% 100% no-repeat,url(art/sk-trail-l.webp) 0 0/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .dg-s{width:11px;height:11px;margin:-5.5px 0 0 -5.5px;-webkit-mask:url(art/sk-el-star.webp) 50% 50%/contain no-repeat;mask:url(art/sk-el-star.webp) 50% 50%/contain no-repeat;background:#6f6aa8}#sheet.opal#sheet.opal .dg-s.s1{left:90px;top:0}#sheet.opal#sheet.opal .dg-s.s2{left:90px;top:18px}#sheet.opal#sheet.opal .dg-s.s3{left:90px;top:36px}',
    '#sheet.opal#sheet.opal .dg-arrow{left:99px;top:12px;width:17px;height:12px;background:url(art/sk-arrow.webp) 50% 50%/contain no-repeat;filter:brightness(.6)}',
    '#sheet.opal#sheet.opal .dg-dot{left:117px;top:10px;width:16px;height:16px;background:url(art/sk-dot.webp) 50% 50%/contain no-repeat}',
    '#sheet.opal#sheet.opal .dg-multi{left:113px;top:6px;width:32px;height:23px;background:url(art/sk-tgtn.webp) 50% 50%/contain no-repeat}',
    '#sheet.opal#sheet.opal .dg-area{left:98px;top:5px;width:48px;height:24px;background:url(art/sk-area.webp) 50% 50%/contain no-repeat;filter:brightness(.82) saturate(1.6)}',
    '#sheet.opal#sheet.opal .skd-up .org.long{font-size:15.5px!important;gap:4px}#sheet.opal#sheet.opal .skd-up .org.long b{font-size:15.5px!important}',
    '#sheet.opal#sheet.opal .skd-shots .p .orb{width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 40% 38%,#fff 0,var(--c) 45%,rgba(0,0,0,0) 72%);box-shadow:0 0 10px 3px var(--c);filter:saturate(1.3)}',
    '#sheet.opal#sheet.opal .dg-st{left:131px;top:-9px;width:17px;height:17px;background:var(--st) 50% 50%/contain no-repeat}',
    '#sheet.opal#sheet.opal .skd-info .chips{left:186px;top:17px;display:flex;gap:6px}',
    '#sheet.opal#sheet.opal .skd-info .chips .c{display:flex;align-items:center;gap:6px;height:20px;padding:0 12px 0 9px;border:0 solid transparent;border-image:url(art/sk-pill.webp) 45 fill / 10px / 1.4px 1.4px 2.2px 1.4px stretch;font:800 13.5px/1 var(--body);color:var(--navy);white-space:nowrap}',
    '#sheet.opal#sheet.opal .skd-info .chips .c>i{width:12px;height:12px;-webkit-mask:var(--el,url(art/sk-spark.webp)) 50% 50%/contain no-repeat;mask:var(--el,url(art/sk-spark.webp)) 50% 50%/contain no-repeat;background:#3a9fbf}',
    '#sheet.opal#sheet.opal .skd-info .how{left:190px;top:46px;width:162px;height:34px;display:flex;align-items:center;font:700 13.5px/17px var(--body);color:var(--navy);white-space:normal;word-break:keep-all;overflow:hidden}',   // 길면 두 줄
    // 강화 1회 효과 (제목 y385, 상자 y403~487)
    '#sheet.opal#sheet.opal .skd-h{left:0;top:335px;width:359px;height:20px;display:flex;align-items:center;justify-content:center;gap:12px}',
    '#sheet.opal#sheet.opal .skd-h b{font:800 17px/1 var(--body);color:var(--navy)}',
    '#sheet.opal#sheet.opal .skd-h>i{width:66px;height:12px;background:linear-gradient(90deg,rgba(130,128,170,0),rgba(130,128,170,.7)) 0 50%/100% 1px no-repeat;position:relative}#sheet.opal#sheet.opal .skd-h>i:last-child{transform:scaleX(-1)}',
    '#sheet.opal#sheet.opal .skd-h>i::after{content:"";position:absolute;right:-2px;top:0;width:12px;height:12px;-webkit-mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;background:#8a86b0}',
    '#sheet.opal#sheet.opal .skd-up{left:1px;top:363px;width:360px;height:85px;border:0 solid transparent;border-image:url(art/sk-detail.webp) 66 fill / 16px / 1.6px 1.6px 2.6px 1.6px stretch}',
    '#sheet.opal#sheet.opal .skd-up>*{position:absolute;margin:0!important}',
    '#sheet.opal#sheet.opal .skd-up .org{left:14px;top:27px;width:92px;height:34px;display:flex;align-items:center;justify-content:center;gap:6px;border:0 solid transparent;border-image:url(art/sk-sec.webp) 51 fill / 12px / 2.2px 2.2px 3.5px 2.2px stretch;font:800 18px/1 var(--body);color:var(--navy);white-space:nowrap}',
    '#sheet.opal#sheet.opal .skd-up .org em{font-style:normal;color:#4b5070}#sheet.opal#sheet.opal .skd-up .org b{font:800 18px/1 var(--body)!important;color:#1a8c86!important}#sheet.opal#sheet.opal .skd-up .org small{font:700 11px var(--body);color:#7d82a0}',
    '#sheet.opal#sheet.opal .skd-up .br{left:106px;top:22px;width:30px;height:38px;background:url(art/sk-up-branch.webp) 50% 50%/100% 100% no-repeat}',
    '#sheet.opal#sheet.opal .skd-up p{left:136px;width:213px;height:27px;padding:0 0 1px 12px!important;display:flex;align-items:center;gap:8px;border:0 solid transparent;border-image:url(art/sk-up-row.webp) 42 fill / 10px / 1px 1px 2px 1px stretch;font:800 14px/1 var(--body);color:var(--navy);white-space:nowrap}',
    '#sheet.opal#sheet.opal .skd-up p.r1{top:10px}#sheet.opal#sheet.opal .skd-up p.r2{top:47px}',
    '#sheet.opal#sheet.opal .skd-up p>i{width:13px;height:13px;-webkit-mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;background:#8a86b0}#sheet.opal#sheet.opal .skd-up p b{font:800 15px/1 var(--body)!important;color:#1a8c86!important}',
    // 유리한 지역 보기 (화면 y500~529) · 펼친 내용
    '#sheet.opal#sheet.opal .skd-reg{display:flex!important;align-items:center;gap:14px;width:360px!important;height:29px!important;min-height:0!important;margin:1px 0 0 1px!important;padding:0 0 0 22px!important;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;border-image:url(art/sk-region.webp) 48 fill / 12px / 1.2px 1.2px 2px 1.2px stretch!important;font:800 14.5px/1 var(--body)!important;color:var(--navy)!important;text-align:left}',
    '#sheet.opal#sheet.opal .skd-reg>i{width:15px;height:15px;background:url(art/sk-i-drop.webp) 50% 50%/contain no-repeat;transition:transform .2s}#sheet.opal#sheet.opal .skd-reg.on>i{transform:rotate(180deg)}',
    '#sheet.opal#sheet.opal .skd-regs{margin:-6px 6px 0 7px!important;padding:8px 12px 9px!important;border-radius:0 0 12px 12px;background:rgba(255,255,255,.7);box-shadow:inset 0 0 0 1px #e1e4ee;display:flex;flex-direction:column;gap:5px}',
    '#sheet.opal#sheet.opal .skd-regs .rl{display:flex;flex-wrap:wrap;gap:5px}#sheet.opal#sheet.opal .skd-regs small{font:700 11.5px/1.2 var(--body);color:#5f6585}',
    // 넣기 · 강화 (화면 y554~597)
    '#sheet.opal#sheet.opal .skd-bot{display:flex;gap:9px;margin:13px 0 0 1px!important;padding:0!important}',
    '#sheet.opal#sheet.opal .skd-bot>button{height:43px!important;min-height:0!important;min-width:0!important;margin:0!important;padding:0!important;display:flex!important;align-items:center;justify-content:center;gap:12px;background:none!important;box-shadow:none!important;border:0 solid transparent!important;border-radius:0!important;white-space:nowrap}',
    '#sheet.opal#sheet.opal .skd-bot .put{width:175px!important;border-image:url(art/sk-btn.webp) 57 fill / 18px / 2.8px 2.8px 4px 2.8px stretch!important;font:800 19px/1 var(--body)!important;color:#fff!important;text-shadow:0 1px 2px rgba(10,60,60,.5)!important}',
    '#sheet.opal#sheet.opal .skd-bot .put>i{width:13px;height:13px;-webkit-mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;mask:url(art/sk-spark.webp) 50% 50%/contain no-repeat;background:#fff}',
    '#sheet.opal#sheet.opal .skd-bot .put.out{border-image-source:url(art/sk-sec.webp)!important;border-image-slice:51 fill!important;color:var(--navy)!important;text-shadow:none!important}#sheet.opal#sheet.opal .skd-bot .put.out>i{background:#8a86b0}',
    '#sheet.opal#sheet.opal .skd-bot .up{width:174px!important;gap:8px!important;border-image:url(art/sk-sec.webp) 51 fill / 18px / 3.3px 3.3px 5px 3.3px stretch!important;font:800 18px/1 var(--body)!important;color:var(--navy)!important}',
    '#sheet.opal#sheet.opal .skd-bot .up .coin{width:22px!important;height:22px!important;background:url(art/sk-coin.webp) 50% 50%/contain no-repeat!important;border:0!important;box-shadow:none!important}#sheet.opal#sheet.opal .skd-bot .up .coin::before,#sheet.opal#sheet.opal .skd-bot .up .coin::after{content:none!important}#sheet.opal#sheet.opal .skd-bot .up span{font:700 14px/1 var(--body)}',
    '#sheet.opal#sheet.opal .skd-bot .up.off{color:#9aa0b8!important}#sheet.opal#sheet.opal .skd-bot .up.off .coin{filter:grayscale(.6) opacity(.7)}',
    '#sheet.opal#sheet.opal .skd-bot>button:active{filter:brightness(.96);transform:scale(.98)}#sheet.opal#sheet.opal .skd-bot .put:not(.out):active{border-image-source:url(art/sk-btn-press.webp)!important}',
    '#sheet.opal#sheet.opal .skd-bot.lock{height:43px;align-items:center;justify-content:center;gap:6px;font:700 14px/1 var(--body);color:#8a90a8;border:0 solid transparent;border-image:url(art/sk-sec.webp) 51 fill / 18px / 3.3px 3.3px 5px 3.3px stretch;width:360px}#sheet.opal#sheet.opal .skd-bot.lock>i{width:14px;height:15px;background:url(art/sk-lock.webp) 50% 50%/contain no-repeat}',
    // 정리 카드 (2026-11-17, 사용자: 유물 뽑기 부분 깔끔하게·줄맞춤 칸맞춤 / 코스튬 수집 이쁘게): 유물 소환·코스튬 수집이 같은 모양
    '#sheet.opal#sheet.opal#sheet.opal .opcard{margin:12px 0 4px;padding:12px 12px 11px;border-radius:18px;background:rgba(255,255,255,.82);box-shadow:inset 0 0 0 1px #e1e4ee,0 6px 16px -10px rgba(60,70,120,.45)}',
    '#sheet.opal#sheet.opal#sheet.opal .opcard-h{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px;margin:0 2px 10px}',
    '#sheet.opal#sheet.opal#sheet.opal .opcard-h>b{display:inline-flex;align-items:center;gap:6px;font:800 15px/1 var(--body);color:var(--navy)}#sheet.opal#sheet.opal#sheet.opal .opcard-h>b::before{content:"✦";font-size:11px;color:#2b928c}',
    '#sheet.opal#sheet.opal#sheet.opal .opcard-f{margin:9px 2px 0;text-align:center;font:600 11px/1.35 var(--body);color:#8a90a6;word-break:keep-all}',
    '#sheet.opal#sheet.opal#sheet.opal .rsum-rate{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 10px;border-radius:999px;background:#fbf5e6;box-shadow:inset 0 0 0 1px #ecd9a6;font:700 12px/1 var(--body);color:#7d6a3c}#sheet.opal#sheet.opal#sheet.opal .rsum-rate em{font-style:normal;font-weight:800;color:#a7761a;font-variant-numeric:tabular-nums}',
    '#sheet.opal#sheet.opal#sheet.opal .rsum-btns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
    '#sheet.opal#sheet.opal#sheet.opal .rsb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;height:66px;min-height:0;min-width:0;margin:0;padding:0;border:0;border-image:none;border-radius:14px;background:linear-gradient(180deg,#fff,#f0f2f8);box-shadow:inset 0 0 0 1px #d9deeb,0 2px 0 #d3d8e7;color:var(--navy);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform .08s}',
    '#sheet.opal#sheet.opal#sheet.opal .rsb:active{transform:translateY(2px);box-shadow:inset 0 0 0 1px #d9deeb}',
    '#sheet.opal#sheet.opal#sheet.opal .rsb-n{display:flex;align-items:baseline;gap:1px;font:700 12.5px/1 var(--body);color:#6b738c}#sheet.opal#sheet.opal#sheet.opal .rsb-n b{font:800 21px/1 var(--body);color:var(--navy);font-variant-numeric:tabular-nums}',
    '#sheet.opal#sheet.opal#sheet.opal .rsb-c{display:flex;align-items:center;justify-content:center;gap:4px;font:800 13px/1 var(--body);color:#2f6f9a;font-variant-numeric:tabular-nums}#sheet.opal#sheet.opal#sheet.opal .rsb-c .gem{flex:none;width:14px;height:14px}',
    '#sheet.opal#sheet.opal#sheet.opal .rsb.big{background:linear-gradient(180deg,#5cbdb5,#2b928c);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 2px 0 #1f6f6a}#sheet.opal#sheet.opal#sheet.opal .rsb.big:active{box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}',
    '#sheet.opal#sheet.opal#sheet.opal .rsb.big .rsb-n,#sheet.opal#sheet.opal#sheet.opal .rsb.big .rsb-n b,#sheet.opal#sheet.opal#sheet.opal .rsb.big .rsb-c{color:#fff;text-shadow:0 1px 2px rgba(10,60,60,.4)}',
    '#sheet.opal#sheet.opal#sheet.opal .rsb.off .rsb-c{color:#c4485f}#sheet.opal#sheet.opal#sheet.opal .rsb.big.off .rsb-c{color:#ffdbe2}',   // 다이아 부족: 버튼은 그대로, 값만 빨갛게
    '#sheet.opal#sheet.opal#sheet.opal .rsum-f{display:grid;grid-template-columns:auto 1fr;gap:5px 10px;margin:11px 2px 0;padding:10px 0 0;border-top:1px dashed #dde1ec;font:600 12px/1.3 var(--body)}',
    '#sheet.opal#sheet.opal#sheet.opal .rsum-f dt{font-weight:700;color:#8a90a6}#sheet.opal#sheet.opal#sheet.opal .rsum-f dd{margin:0;font-weight:700;color:var(--navy)}#sheet.opal#sheet.opal#sheet.opal .rsum-f dd::before{content:"→";margin-right:6px;color:#9aa3b8}',
    '#sheet.opal#sheet.opal#sheet.opal .ccol-n{font:700 13px/1 var(--body);color:#8a90a6;font-variant-numeric:tabular-nums}#sheet.opal#sheet.opal#sheet.opal .ccol-n b{font:800 19px/1 var(--body);color:var(--navy)}',
    '#sheet.opal#sheet.opal#sheet.opal .ccol-bar{display:block;height:8px;margin:0 2px;border-radius:999px;background:#eceff6;box-shadow:inset 0 1px 2px rgba(60,70,120,.15);overflow:hidden}#sheet.opal#sheet.opal#sheet.opal .ccol-bar em{display:block;height:100%;min-width:8px;border-radius:inherit;background:linear-gradient(90deg,#8fdcd2,#2b928c)}',
    '#sheet.opal#sheet.opal#sheet.opal .ccol-cells{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}',
    '#sheet.opal#sheet.opal#sheet.opal .ccol-cells p{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;height:54px;margin:0;border-radius:12px;background:#f6f7fb;box-shadow:inset 0 0 0 1px #e4e7f0}',
    '#sheet.opal#sheet.opal#sheet.opal .ccol-cells small{font:700 11px/1 var(--body);color:#8a90a6}#sheet.opal#sheet.opal#sheet.opal .ccol-cells b{font:800 15px/1 var(--body);color:var(--navy);font-variant-numeric:tabular-nums}',
    '#sheet.opal#sheet.opal#sheet.opal .ccol-cells p.nx{background:#eaf6f3;box-shadow:inset 0 0 0 1px #c5e6de}#sheet.opal#sheet.opal#sheet.opal .ccol-cells p.nx b{color:#1f7a74}',
    '#sheet.opal#sheet.opal#sheet.opal .rsum-btns.n2{grid-template-columns:repeat(2,minmax(0,1fr))}#sheet.opal#sheet.opal#sheet.opal .rsb.lock{opacity:.5}',
    '#sheet.opal#sheet.opal#sheet.opal .rnsum .opcard-h{margin-bottom:10px}#sheet.opal#sheet.opal#sheet.opal .rnsum .rsseg button{height:28px;min-width:44px!important}',
    // 강화·승급·레벨업 버튼: 위 이름 / 아래 값 두 줄을 칸 가운데에 (사용자: 글자를 칸에 딱 맞게)
    '#sheet.opal#sheet.opal#sheet.opal .rdup.two{flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;padding:0 6px!important;min-height:44px!important;line-height:1!important;overflow:hidden}',
    '#sheet.opal#sheet.opal#sheet.opal .rdup.two .t{display:block;font:800 14px/1 var(--body)!important;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}',
    '#sheet.opal#sheet.opal#sheet.opal .rdup.two .c{display:inline-flex!important;align-items:center;justify-content:center;gap:3px!important;font:800 12px/1 var(--body)!important;font-variant-numeric:tabular-nums;opacity:.95}#sheet.opal#sheet.opal#sheet.opal .rdup.two .c .ico{width:13px!important;height:13px!important;flex:none}',
    // 룬석·신성석 are the user's pictures (2026-11-17): a little bigger than the drawn icons so they read (the user: 살짝 키우자)
    '#sheet.opal#sheet.opal#sheet.opal#sheet.opal img.icur{width:16px!important;height:16px!important;flex:none;object-fit:contain}',
    // in the two-line buttons (강화 / 레벨업): the cost line as tall as the picture, a little air between it and the number, so it sits in the middle
    '#sheet.opal#sheet.opal#sheet.opal#sheet.opal .rdup.two .c{gap:4px!important;line-height:16px!important;height:16px}#sheet.opal#sheet.opal#sheet.opal#sheet.opal .rdup.two{row-gap:2px!important;gap:2px!important}',
    // 강화 · 레벨업: the cost beside the word on one line (2026-11-17, the user: 강화 밑으로 말고 옆으로); 승급 keeps two lines (its grade name is long)
    '#sheet.opal#sheet.opal#sheet.opal#sheet.opal .rdup.two[data-rune],#sheet.opal#sheet.opal#sheet.opal#sheet.opal .rdup.two[data-sglv]{flex-direction:row!important;gap:7px!important}#sheet.opal#sheet.opal#sheet.opal#sheet.opal .rdup.two[data-rune] .c,#sheet.opal#sheet.opal#sheet.opal#sheet.opal .rdup.two[data-sglv] .c{font-size:13px!important}',
    // 각성 카드: 작은 소제목 · 파편 상자(왼쪽 보유 / 오른쪽 제작 값) · 제작 버튼 같은 크기 칸
    '#sheet.opal#sheet.opal#sheet.opal .aw-tag{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;background:#f3ecfb;box-shadow:inset 0 0 0 1px #ddd0f0;font:700 11.5px/1 var(--body);color:#6b5a96;white-space:nowrap}',
    '#sheet.opal#sheet.opal#sheet.opal .awcard .rsgrid.aw{margin:0 0 4px}',
    '#sheet.opal#sheet.opal#sheet.opal .aw-sub{display:flex;align-items:center;gap:8px;margin:12px 2px 8px;font:800 12px/1 var(--body);color:#8a90a6}#sheet.opal#sheet.opal#sheet.opal .aw-sub::after{content:"";flex:1;height:1px;background:#e3e6ef}',
    '#sheet.opal#sheet.opal#sheet.opal .aw-shard{display:grid;grid-template-columns:1fr 1fr;align-items:stretch;border-radius:14px;background:#f6f7fb;box-shadow:inset 0 0 0 1px #e4e7f0;overflow:hidden}',
    '#sheet.opal#sheet.opal#sheet.opal .aw-shard>span{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;height:58px;font:700 11px/1 var(--body);color:#8a90a6}#sheet.opal#sheet.opal#sheet.opal .aw-shard>span+span{box-shadow:inset 1px 0 0 #e4e7f0}',
    '#sheet.opal#sheet.opal#sheet.opal .aw-shard small{display:flex;align-items:center;gap:3px;font:700 11px/1 var(--body);color:#8a90a6}#sheet.opal#sheet.opal#sheet.opal .aw-shard small i{font-style:normal;color:#8a6fd0;font-size:12px}',
    '#sheet.opal#sheet.opal#sheet.opal .aw-shard b{font:800 18px/1 var(--body);color:var(--navy);font-variant-numeric:tabular-nums}#sheet.opal#sheet.opal#sheet.opal .aw-have>b{color:#5b48a8}#sheet.opal#sheet.opal#sheet.opal .aw-have>b.low{color:var(--navy)}',
    '#sheet.opal#sheet.opal#sheet.opal .aw-craft{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}',
    '#sheet.opal#sheet.opal#sheet.opal .aw-craft .btn{display:flex!important;align-items:center;justify-content:center;height:38px!important;min-height:0!important;min-width:0!important;margin:0!important;padding:0 6px!important;border:0!important;border-image:none!important;border-radius:12px!important;background:linear-gradient(180deg,#fff,#f0f2f8)!important;box-shadow:inset 0 0 0 1px #d9deeb,0 2px 0 #d3d8e7!important;font:800 12.5px/1 var(--body)!important;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.2px;opacity:1!important}',
    '#sheet.opal#sheet.opal#sheet.opal .aw-craft .btn:active{transform:translateY(2px);box-shadow:inset 0 0 0 1px #d9deeb!important}#sheet.opal#sheet.opal#sheet.opal .aw-craft .btn.off{filter:saturate(.4);opacity:.6!important}',
    // 룬 보관함 계열 탭: 글자는 진한 남색(밝은 바탕에서도 잘 보이게), 룬 색은 글자 위 작은 점
    '#sheet.opal#sheet.opal#sheet.opal .kindtabs button[data-rkf]{color:#4a5170!important;text-shadow:none!important}#sheet.opal#sheet.opal#sheet.opal .kindtabs button[data-rkf][aria-selected="true"]{color:var(--navy)!important}#sheet.opal#sheet.opal#sheet.opal .kindtabs button[data-rkf]{padding-top:12px!important}',
    '#sheet.opal#sheet.opal#sheet.opal .kindtabs button[data-rkf] .kdot{position:absolute;left:50%;top:3px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:var(--kc);box-shadow:0 0 0 1px rgba(48,54,77,.35)}',
    '#sheet.opal#sheet.opal#sheet.opal .kindtabs button[data-sgf]{color:#4a5170!important;padding-top:12px!important}#sheet.opal#sheet.opal#sheet.opal .kindtabs button[data-sgf][aria-selected="true"]{color:var(--navy)!important}#sheet.opal#sheet.opal#sheet.opal .kindtabs button[data-sgf] .kdot{position:absolute;left:50%;top:3px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:var(--kc);box-shadow:0 0 0 1px rgba(48,54,77,.35)}',
    // 보관함 효과 상자 (사용자: 레벨 효과·장착 효과 이름과 수치 사이가 너무 넓다 → 가운데로 모음, 줄 간격도 살짝 줄임)
    '#sheet.opal#sheet.opal#sheet.opal .rseff{padding:7px 14px 8px;margin-bottom:8px}#sheet.opal#sheet.opal#sheet.opal .rseff>small,#sheet.opal#sheet.opal#sheet.opal .rseff p{max-width:260px;margin-left:auto;margin-right:auto}#sheet.opal#sheet.opal#sheet.opal .rseff p{padding:2px 0;gap:6px}',
    // 유물 전시대 글: 신유물·미보유 꼬리표는 한 줄에, 효과 글은 낱말 단위로 줄바꿈
    '#sheet.opal#sheet.opal#sheet.opal .rlstage .rl-info{flex-direction:row;flex-wrap:wrap;align-items:center;gap:5px 4px}#sheet.opal#sheet.opal#sheet.opal .rlstage .rl-info>b,#sheet.opal#sheet.opal#sheet.opal .rlstage .rl-info>span{flex-basis:100%}#sheet.opal#sheet.opal#sheet.opal .rlstage .rl-info>b,#sheet.opal#sheet.opal#sheet.opal .rlstage .rl-eff{word-break:keep-all}',
    '@media (prefers-reduced-motion:reduce){.op-num,.op-pop,#sheet.opal .opfx,#sheet.opal .opfx *,#sheet.opal .opcaul .bub,#sheet.opal .ns-obj,#sheet.opal .ns-sh,#sheet.opal .ns-stars circle,#sheet.opal .ns-neb,#sheet.opal .ns-neb::before,#sheet.opal .ns-neb::after,#sheet.opal .cstage .ns-obj>img.cosart,#sheet.opal .ricon.gnew .gorbbg,#sheet.opal .ricon.gnew .gico,#sheet.opal .row.grow>.buy,#toast,#toast::after,#sheet.opal .skd-neb::before,#sheet.opal .skd-v *,#sheet.opal .skv-neb::before,#sheet.opal .skv-cat,#sheet.opal .skc .ic img.si,#sheet.opal .mcv-neb,#sheet.opal .mcv-neb::before,#sheet.opal .mcv-o,#sheet.opal .mcv-bw,#sheet.opal .mcv-bw i,#sheet.opal .mcv-bw i b,#sheet.opal .mcv-cry,#sheet.opal .mcv-paw,#sheet.opal .mcv-cst .st g,#sheet.opal .mcup,#sheet.opal .rkv-neb,#sheet.opal .rkv-neb::before,#sheet.opal .rkv.opfx::after,#sheet.opal .rkv-ray,#sheet.opal .rkv-badge,#sheet.opal .rkv-paw,#sheet.opal .rkv-mk img,#sheet.opal .rkv-mk .rkv-dome,#sheet.opal .rkup,#sheet.opal .alchhead.anw .aneb,#sheet.opal .alchhead.anw .abub,#sheet.opal .alchhead.anw .asteam,#sheet.opal .pcard.anw .paimg,#sheet.opal .pcard.anw .buy,#sheet.opal .ttree.tnw,#sheet.opal .tnode.tnw .tico,#sheet.opal .tnode.tnw>.thalo,#sheet.opal .tinfo.tnw .tico,#sheet.opal .tinfo.tnw .tupb,#sheet.opal .cstage.cosnew .ns-obj::before,#sheet.opal .cstage.cosnew .ns-obj::after,#sheet.opal .runering *,#sheet.opal .rcore,#sheet.opal .sggrid *,#sheet.opal .sgcell,#sheet.opal .dv-fig *,#sheet.opal .rk-sock *,#sheet.opal .rk-paths *,#sheet.opal .tnode *,#sheet.opal .rlsock *{animation:none!important}}'
  ].join('\n');
  function addCss() {
    if (!doc || doc.getElementById('opal-css')) return;
    var st = doc.createElement('style'); st.id = 'opal-css'; st.textContent = CSS; doc.head.appendChild(st);
    try { var u = nebTex(); if (u) doc.documentElement.style.setProperty('--opneb', 'url(' + u + ')'); } catch (e) {}
  }
  // 승인 시안의 전시 성운 (구름 질감·별): 처음 한 번 캔버스에 그려 그림 주소로 두고 모든 .ns-neb 배경으로 쓴다.
  // 정해진 난수라 매번 같은 그림. 중간 밝기 파랑 + 아래쪽 흰·분홍 구름 + 성긴 별
  function nebTex() {
    var W = 360, H = 300, c = doc.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d'); if (!g) return null;
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var bg = g.createRadialGradient(W * .5, H * .42, 10, W * .5, H * .5, W * .62);
    bg.addColorStop(0, '#5274c8'); bg.addColorStop(.4, '#6a88d2'); bg.addColorStop(.72, '#97a9e2'); bg.addColorStop(1, '#c9d2f0');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    var blob = function (x, y, r, col, a) { var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    // 깊은 층: 짙은 파랑·보라 얼룩
    for (var i = 0; i < 16; i++) blob(rnd() * W, rnd() * H * .7, 40 + rnd() * 70, rnd() < .55 ? '40,66,168' : '96,78,182', .2 + rnd() * .16);
    // 구름: 아래쪽 띠에 분홍·라일락·흰 덩어리, 양옆 위쪽에 옅은 흰 구름
    for (i = 0; i < 48; i++) { var by = H * (.68 + rnd() * .32), bx = rnd() * W; blob(bx, by, 16 + rnd() * 34, rnd() < .4 ? '255,255,255' : rnd() < .6 ? '242,186,226' : '200,186,246', .12 + rnd() * .18); }
    // 시안처럼 왼쪽 아래·오른쪽 아래에 뚜렷한 분홍·흰 구름 덩어리
    [[.12, .82], [.24, .9], [.06, .7], [.86, .86], [.95, .74], [.74, .94]].forEach(function (p, j) { for (var q = 0; q < 6; q++) blob(W * p[0] + (rnd() - .5) * 40, H * p[1] + (rnd() - .5) * 26, 18 + rnd() * 22, j % 2 ? '255,255,255' : '244,190,228', .28 + rnd() * .2); });
    for (i = 0; i < 16; i++) { var sx = rnd() < .5 ? rnd() * W * .2 : W * (.8 + rnd() * .2); blob(sx, H * (.2 + rnd() * .55), 14 + rnd() * 26, rnd() < .5 ? '255,255,255' : '236,200,240', .08 + rnd() * .12); }
    // 별: 작은 점 + 빛 번짐 몇 개
    for (i = 0; i < 70; i++) { var x = rnd() * W, y = rnd() * H * .8, r = rnd() < .85 ? .5 + rnd() * .8 : 1.2 + rnd(); g.fillStyle = 'rgba(255,255,255,' + (.5 + rnd() * .5) + ')'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); if (r > 1.3) blob(x, y, r * 5, '255,255,255', .35); }
    return c.toDataURL('image/webp', .9) || c.toDataURL();
  }

  // ---------- 2. 장치 렌더러 (하나만) ----------
  var R = null;            // { renderer, canvas, scene, camera, dev, w, h }
  var host = null, kind = null, vm = null, raf = 0, running = false, io = null, seen = true, idleT = 0, lastFx = { k: '', at: -9 };
  var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
  var stats = { renderers: 0, created: 0, disposed: 0, loops: 0, frames: 0, mounts: 0, lost: 0 };
  var failed = false, lastDraw = 0;

  function now() { return (root.performance && performance.now ? performance.now() : Date.now()) / 1000; }

  // 오팔 유리: 보는 각도(프레넬)와 위치에 따라 하늘·분홍·민트·라일락이 비치는 진주 재질. 빛은 좌상단.
  var VERT = 'varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vP=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*mv;}';
  var FRAG = [
    'uniform float uT;uniform float uLit;uniform float uA;uniform float uFlash;uniform vec3 uBase;uniform float uHue;',
    'varying vec3 vN;varying vec3 vV;varying vec3 vP;',
    'vec3 neb(float t){t=fract(t);',
    ' vec3 a=vec3(.66,.84,1.0),b=vec3(1.0,.74,.89),c=vec3(.58,.92,.82),d=vec3(.78,.71,.99);',
    ' if(t<.25)return mix(a,b,t*4.);if(t<.5)return mix(b,c,(t-.25)*4.);if(t<.75)return mix(c,d,(t-.5)*4.);return mix(d,a,(t-.75)*4.);}',
    'void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;',
    ' float ndv=max(dot(n,vV),0.0);float f=pow(1.0-ndv,1.7);',
    ' vec3 L=normalize(vec3(-.55,.75,.55));float dif=.62+.38*max(dot(n,L),0.0);',
    ' float sp=pow(max(dot(reflect(-L,n),vV),0.0),36.0);',
    ' vec3 iri=neb(f*.85+vP.x*.11+vP.y*.13+uT*.025+uHue);',
    ' vec3 col=mix(uBase*dif,iri*(.86+.18*dif),clamp(.5+f*.7,0.,1.)*mix(.25,1.,uLit));',
    ' col+=sp*.55+uFlash*.35*iri+uFlash*.15;',
    ' float a=clamp(mix(uA,1.0,f*.7)+sp*.4,0.,1.);',
    ' gl_FragColor=vec4(col,a);}'
  ].join('\n');
  function opalMat(T, o) {
    o = o || {};
    return new T.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: o.a !== undefined && o.a < 1, depthWrite: o.depthWrite !== false, side: o.side || T.FrontSide,
      uniforms: { uT: { value: 0 }, uLit: { value: o.lit === undefined ? 1 : o.lit }, uA: { value: o.a === undefined ? 1 : o.a }, uFlash: { value: 0 }, uBase: { value: new T.Color(o.base || '#f3f5fb') }, uHue: { value: o.hue || 0 } }
    });
  }
  function radialTex(T, stops, size) {
    var c = doc.createElement('canvas'); c.width = c.height = size || 64; var g = c.getContext('2d'), s = c.width / 2;
    var gr = g.createRadialGradient(s, s, 0, s, s, s); stops.forEach(function (st) { gr.addColorStop(st[0], st[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.width); var t = new T.CanvasTexture(c); return t;
  }
  function starTex(T) {
    var c = doc.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.quadraticCurveTo(36, 28, 62, 32); g.quadraticCurveTo(36, 36, 32, 62); g.quadraticCurveTo(28, 36, 2, 32); g.quadraticCurveTo(28, 28, 32, 2); g.fill();
    return new T.CanvasTexture(c);
  }

  // 마나서클 장치: 떠 있는 핵(작은 발바닥) + 기울어진 세 유리 궤도 + 세라믹 받침 + 접촉 그림자 + 서클 수만큼의 별
  function buildCircle(T) {
    var d = { group: new T.Group(), mats: [], geos: [], texs: [], rings: [], stars: null, burst: null, core: null };
    var keep = function (x) { if (x.geometry) d.geos.push(x.geometry); if (x.material) d.mats.push(x.material); return x; };
    // 받침대: 불투명 세라믹(빛 받는 흰 원기둥) + 윗면 안쪽 오팔 유리판
    var cer = new T.MeshStandardMaterial({ color: 0xf4f5fb, roughness: 0.38, metalness: 0.02 });
    // 받침 옆면은 한 단계 어둡게 (윗면과 경계가 보이게, 승인 시안 2026-11-16)
    var cerSide = new T.MeshStandardMaterial({ color: 0xc3cadf, roughness: 0.5, metalness: 0.02 }); d.mats.push(cer, cerSide);
    var pedG = new T.CylinderGeometry(1.32, 1.5, 0.34, 64); d.geos.push(pedG);
    var ped = new T.Mesh(pedG, [cerSide, cer, cerSide]); ped.position.y = -1.32; d.group.add(ped);
    var lip = keep(new T.Mesh(new T.TorusGeometry(1.32, 0.05, 12, 80), cer)); lip.rotation.x = Math.PI / 2; lip.position.y = -1.15; d.group.add(lip);
    var pool = keep(new T.Mesh(new T.CircleGeometry(1.22, 64), opalMat(T, { lit: 1, base: '#eef2fb' }))); pool.rotation.x = -Math.PI / 2; pool.position.y = -1.145; d.group.add(pool);
    // 받침 위 발바닥 각인 (고양이 모티프는 받침·핵에만)
    var pawM = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }); d.mats.push(pawM);
    var pawG = new T.CircleGeometry(1, 24); d.geos.push(pawG);
    [[0, 0, 0.16, 0.13], [-0.17, 0.15, 0.06, 0.07], [-0.06, 0.24, 0.06, 0.07], [0.06, 0.24, 0.06, 0.07], [0.17, 0.15, 0.06, 0.07]].forEach(function (p) {
      var m = new T.Mesh(pawG, pawM); m.scale.set(p[2], p[3], 1); m.rotation.x = -Math.PI / 2; m.position.set(p[0], -1.14, 0.95 - p[1] + 0.1); d.group.add(m);
    });
    // 접촉 그림자
    var shT = radialTex(T, [[0, 'rgba(60,70,120,.32)'], [0.55, 'rgba(60,70,120,.12)'], [1, 'rgba(60,70,120,0)']]); d.texs.push(shT);
    var sh = keep(new T.Mesh(new T.PlaneGeometry(4.2, 1.5), new T.MeshBasicMaterial({ map: shT, transparent: true, depthWrite: false }))); sh.rotation.x = -Math.PI / 2; sh.position.y = -1.5; d.group.add(sh);
    // 핵: 물방울 모양 오팔 (lathe)
    var pts = []; for (var i = 0; i <= 28; i++) { var t = i / 28, a = t * Math.PI; pts.push(new T.Vector2(Math.max(0.0001, 0.5 * Math.sin(a) * (1 - 0.42 * t * t)), -0.5 * Math.cos(a) + 0.18 * t * t)); }
    // 핵은 고리보다 확실히 작게 가운데, 그래도 잘 보이게 크게·진한 오팔로 (사용자 2026-11-16: 핵과 발바닥이 안 보임)
    var core = keep(new T.Mesh(new T.LatheGeometry(pts, 48), opalMat(T, { lit: 1, base: '#d9e4ff', hue: 0.15 })));
    core.renderOrder = 2; d.core = new T.Group(); d.core.add(core); d.core.scale.setScalar(1.32); d.group.add(d.core);
    // 발바닥: 진한 라일락 + 흰 테두리 (핵 앞면에 붙임). 테두리는 조금 큰 흰 원을 뒤에 깔아서
    var pawEdge = new T.MeshBasicMaterial({ color: 0xffffff }), pawC = new T.MeshBasicMaterial({ color: 0x7d68c9 }); d.mats.push(pawEdge, pawC);
    [[0, -0.09, 0.15, 0.12], [-0.17, 0.07, 0.055, 0.07], [-0.06, 0.17, 0.055, 0.07], [0.06, 0.17, 0.055, 0.07], [0.17, 0.07, 0.055, 0.07]].forEach(function (p) {
      var e = new T.Mesh(pawG, pawEdge); e.scale.set(p[2] + 0.025, p[3] + 0.025, 1); e.position.set(p[0], p[1] + 0.03, 0.505); d.core.add(e);
      var m = new T.Mesh(pawG, pawC); m.scale.set(p[2], p[3], 1); m.position.set(p[0], p[1] + 0.03, 0.512); d.core.add(m);
    });
    var glowT = radialTex(T, [[0, 'rgba(255,255,255,.9)'], [0.35, 'rgba(220,235,255,.45)'], [1, 'rgba(230,210,255,0)']]); d.texs.push(glowT);
    var glow = new T.Sprite(new T.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, opacity: 0.6 })); d.mats.push(glow.material); glow.scale.set(2.1, 2.1, 1); d.core.add(glow); d.glow = glow;
    // 세 궤도: 바깥은 늘 켜짐, 가운데는 2서클부터, 안쪽은 늘 켜짐 (기존 마나서클 규칙). 구슬이 붙어 있어 도는 게 보인다.
    var beadG = new T.SphereGeometry(0.075, 16, 12); d.geos.push(beadG);
    var cerBead = new T.MeshStandardMaterial({ color: 0xf6f3ff, roughness: 0.25, metalness: 0.1 }); d.mats.push(cerBead);
    [[1.68, 0.06, 1.22, 0.0, 90, 4, 0.0], [1.42, 0.052, 1.12, 0.62, 60, 3, 0.33], [1.16, 0.046, 1.05, -0.7, 24, 2, 0.66]].forEach(function (r, ri) {
      var pivot = new T.Group(), spin = new T.Group();
      var mat = opalMat(T, { lit: 1, a: 0.9, hue: r[6], base: '#eef1fa' });
      var torus = keep(new T.Mesh(new T.TorusGeometry(r[0], r[1], 14, 160), mat)); torus.renderOrder = 3;
      spin.add(torus);
      for (var b = 0; b < r[5]; b++) { var bd = new T.Mesh(beadG, cerBead); var ang = b / r[5] * Math.PI * 2; bd.position.set(Math.cos(ang) * r[0], Math.sin(ang) * r[0], 0); spin.add(bd); }
      pivot.add(spin); pivot.rotation.set(r[2], 0, r[3]); d.group.add(pivot);
      d.rings.push({ pivot: pivot, spin: spin, mat: mat, period: r[4], tilt: r[2], roll: r[3], i: ri });
    });
    // 서클 수만큼 작은 별이 핵 주위를 돈다 (1서클 = 1개 … 10서클 = 10개)
    var sT = starTex(T); d.texs.push(sT);
    var sg = new T.BufferGeometry(), sp = new Float32Array(10 * 3); sg.setAttribute('position', new T.BufferAttribute(sp, 3)); d.geos.push(sg);
    var sm = new T.PointsMaterial({ map: sT, size: 0.26, transparent: true, depthWrite: false, color: 0x9fb2ff, sizeAttenuation: true }); d.mats.push(sm);
    d.stars = new T.Points(sg, sm); d.stars.renderOrder = 4; d.group.add(d.stars);
    // 레벨업 파동: 얇은 유리 고리가 퍼지며 사라짐
    var bm = opalMat(T, { lit: 1, a: 0.9, depthWrite: false }); var burst = keep(new T.Mesh(new T.TorusGeometry(1, 0.03, 8, 120), bm)); burst.rotation.x = Math.PI / 2; burst.visible = false; d.group.add(burst); d.burst = burst;
    d.group.position.y = 0.18;
    return d;
  }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function frameCircle(d, t, v) {
    var tier = v ? v.tier : 0, fx = d.fx, fe = fx ? t - fx.at : 9, dur = fx && fx.k === 'tierup' ? 1.1 : 0.55, p = fe < dur ? fe / dur : -1;
    var flash = p >= 0 ? Math.sin(Math.PI * Math.min(1, p * 1.4)) * (fx.k === 'tierup' ? 1 : 0.6) : 0;
    // 핵: 3px 정도 위아래로, 발바닥이 뒤로 가지 않게 좌우로만 살짝
    d.core.position.y = Math.sin(t * 2 * Math.PI / 3.2) * 0.06; d.core.rotation.y = Math.sin(t * 0.5) * 0.12;   // 발바닥이 늘 앞을 보게 살짝만
    d.core.scale.setScalar(1.32 * (1 + flash * 0.08)); d.glow.material.opacity = 0.5 + 0.1 * Math.sin(t * 1.7) + flash * 0.4;
    d.core.children[0].material.uniforms.uT.value = t; d.core.children[0].material.uniforms.uFlash.value = flash;
    d.rings.forEach(function (r) {
      var lit = r.i === 1 ? (tier >= 1 ? 1 : 0.12) : 1;
      r.mat.uniforms.uLit.value = lit; r.mat.uniforms.uA.value = lit > 0.5 ? 0.9 : 0.55; r.mat.uniforms.uT.value = t; r.mat.uniforms.uFlash.value = flash;
      r.spin.rotation.z = (t % r.period) / r.period * Math.PI * 2 * (r.i === 1 ? -1 : 1);   // 기존 90 / 60 / 24초 한 바퀴
      var spread = fx && fx.k === 'tierup' && p >= 0 ? Math.sin(Math.PI * p) * 0.35 : 0;   // 서클업: 궤도가 펼쳐졌다 돌아옴
      r.pivot.rotation.x = r.tilt - spread * (r.i ? 1 : 0.4); r.pivot.rotation.z = r.roll * (1 + spread);
      r.pivot.rotation.y = t * 2 * Math.PI / (r.period * 1.7) * (r.i % 2 ? -1 : 1);
    });
    var pos = d.stars.geometry.attributes.position, n = Math.min(10, tier + 1);
    for (var i = 0; i < 10; i++) {
      var a = t * 0.6 + i / n * Math.PI * 2, on = i < n;
      pos.setXYZ(i, on ? Math.cos(a) * 0.78 : 0, on ? 0.05 + Math.sin(a * 2 + i) * 0.08 : -99, on ? Math.sin(a) * 0.78 : 0);
    }
    pos.needsUpdate = true; d.stars.geometry.setDrawRange(0, n);
    if (p >= 0) { var s = 0.6 + easeOut(p) * (fx.k === 'tierup' ? 1.9 : 1.3); d.burst.visible = true; d.burst.scale.set(s, s, s); d.burst.material.uniforms.uA.value = 0.9 * (1 - p); d.burst.material.uniforms.uFlash.value = 1 - p; d.burst.material.opacity = 1 - p; }
    else d.burst.visible = false;
  }

  var KINDS = { circle: { build: buildCircle, frame: frameCircle, cam: [0, 1.25, 6.3], look: [0, -0.05, 0], fov: 34 } };

  function create() {
    var T = root.THREE; if (!T || failed) return null;
    try {
      var canvas = doc.createElement('canvas'); canvas.className = 'opcanvas';
      var renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      if (renderer.outputEncoding !== undefined) renderer.outputEncoding = T.sRGBEncoding;
      var scene = new T.Scene(), camera = new T.PerspectiveCamera(34, 1, 0.1, 50);
      scene.add(new T.HemisphereLight(0xffffff, 0xdfe3f5, 0.95));
      var dl = new T.DirectionalLight(0xffffff, 0.75); dl.position.set(-3, 5, 4); scene.add(dl);
      // 정말 잃었을 때만 (우리가 정리하며 일부러 끈 것·이미 바뀐 옛 캔버스의 늦은 신호는 무시)
      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); if (!R || R.canvas !== canvas || R.closing) return; stats.lost++; stop(); if (host) host.classList.remove('gl'); dispose(true); });
      stats.renderers++; stats.created++;
      return { T: T, renderer: renderer, canvas: canvas, scene: scene, camera: camera, dev: null, devKind: null, w: 0, h: 0 };
    } catch (e) { failed = true; return null; }
  }
  function disposeDev() {
    if (!R || !R.dev) return;
    R.scene.remove(R.dev.group);
    R.dev.geos.forEach(function (g) { g.dispose(); }); R.dev.mats.forEach(function (m) { m.dispose(); }); R.dev.texs.forEach(function (t) { t.dispose(); });
    R.dev = null; R.devKind = null;
  }
  function dispose(lost) {
    stop(); if (!R) return;
    R.closing = true;
    disposeDev();
    try { R.renderer.dispose(); if (!lost && R.renderer.forceContextLoss) R.renderer.forceContextLoss(); } catch (e) {}
    if (R.canvas.parentNode) R.canvas.parentNode.removeChild(R.canvas);
    R = null; stats.renderers--; stats.disposed++;
    if (io) { io.disconnect(); io = null; }
  }
  function visible() {
    if (!R || !host || !host.isConnected || doc.hidden || !seen) return false;
    var sh = doc.getElementById('sheet'); return !sh || sh.classList.contains('on');
  }
  function size() {
    var w = Math.round(host.clientWidth), h = Math.round(host.clientHeight); if (!w || !h) return;
    if (w === R.w && h === R.h) return;
    R.w = w; R.h = h; R.renderer.setPixelRatio(Math.min(1.5, root.devicePixelRatio || 1)); R.renderer.setSize(w, h, false);
    R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  }
  function draw(t) {
    if (!R || !R.dev) return;
    KINDS[R.devKind].frame(R.dev, t, vm); R.renderer.render(R.scene, R.camera); stats.frames++;
  }
  function loop() {
    raf = 0;
    if (!visible()) { running = false; scheduleIdle(); return; }
    var t = now(); if (t - lastDraw >= 0.0155) { lastDraw = t; draw(t); }   // 화면이 120·165Hz여도 메뉴 장치는 60번까지만
    raf = root.requestAnimationFrame(loop);
  }
  function start() {
    if (running || !R) return;
    if (reduce && reduce.matches) { size(); draw(now()); return; }   // 동작 줄이기: 한 장만 그린 정지 장치
    running = true; stats.loops++; clearTimeout(idleT); raf = root.requestAnimationFrame(loop);
  }
  function stop() { if (raf) root.cancelAnimationFrame(raf); raf = 0; running = false; }
  // 20초 동안 다시 붙지 않으면 GPU 자원 정리 (다시 열면 새로 만든다)
  function scheduleIdle() { clearTimeout(idleT); idleT = setTimeout(function () { if (!visible()) dispose(); }, 20000); }

  function mount(el, k, model) {
    addCss();
    if (!el) return false;
    stats.mounts++;
    host = el; kind = k; vm = model || {};
    if (!R) R = create();
    if (!R) return false;
    var T = R.T, K = KINDS[k];
    if (R.devKind !== k) {
      disposeDev(); R.dev = K.build(T); R.devKind = k; R.scene.add(R.dev.group);
      R.camera.fov = K.fov; R.camera.position.set(K.cam[0], K.cam[1], K.cam[2]); R.camera.lookAt(K.look[0], K.look[1], K.look[2]);
    }
    if (vm.fx) play(vm.fx);
    if (R.canvas.parentNode !== el) el.appendChild(R.canvas);
    el.classList.add('gl');
    if (root.IntersectionObserver) {
      if (!io) io = new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; if (seen) start(); });
      io.disconnect(); io.observe(el);
    }
    size(); start();
    if (!running) draw(now());
    return true;
  }
  function update(model) { vm = model || vm; if (!running && R) draw(now()); }
  // 성공 이벤트만 (ui.js가 실제 강화가 된 다음 보냄). 연속 강화는 170ms 안의 같은 반응을 모은다(최대 약 6회/초).
  function play(k) {
    if (!R || !R.dev) return false;
    var t = now(); if (k === lastFx.k && k !== 'tierup' && t - lastFx.at < 0.17) return false;
    lastFx = { k: k, at: t }; R.dev.fx = { k: k, at: t }; if (!running) start(); return true;
  }
  if (doc) doc.addEventListener('visibilitychange', function () { if (doc.hidden) stop(); else if (host) start(); });

  // 숫자만 바뀌는 칸에 짧은 전환 (성장·특성 등). 같은 값을 다시 그린 것엔 안 붙인다.
  var lastVals = {};
  function bumpValues(panel) {
    if (!panel) return;
    panel.querySelectorAll('[data-opv]').forEach(function (el) {
      var k = el.getAttribute('data-opv'), v = el.textContent;
      if (lastVals[k] !== undefined && lastVals[k] !== v) { el.classList.remove('op-num'); void el.offsetWidth; el.classList.add('op-num'); }
      lastVals[k] = v;
    });
  }

  // 짧은 성공 반응 (DOM): ui.js가 실제 성공 뒤 fx(key)를 부르고, 다시 그린 뒤 applyFx가 data-opfx="key"인 요소에
  // .opfx와 음수 지연(--opd)을 줘서, 패널이 중간에 다시 그려져도 반응이 처음부터 다시 시작되지 않는다.
  // 같은 반응이 170ms 안에 또 오면(길게 누르기) 이어서 보여 준다 = 초당 약 6번까지.
  var fxAt = {};
  function fx(key) { var t = now(); if (fxAt[key] !== undefined && t - fxAt[key] < 0.17) return false; fxAt[key] = t; return true; }
  function applyFx(panel) {
    if (!panel) return;
    panel.querySelectorAll('[data-opfx]').forEach(function (el) {
      var k = el.getAttribute('data-opfx'), t = fxAt[k]; if (t === undefined) return;
      var e = now() - t, dur = +(el.getAttribute('data-opdur') || 0.6); if (e >= dur) return;
      el.style.setProperty('--opd', (-e).toFixed(3) + 's'); el.classList.add('opfx');
    });
  }

  // ---------- 승인 시안 (2026-11-16 최종): 물체 뒤 국소 푸른 성운 + 성긴 별·별자리 선 + 두께 있는 진주 받침대 + 접촉 그림자 ----------
  // stage(inner, opt): inner = 기존 그림(아이콘·장비·의상) 그대로. opt.cls 추가 클래스, opt.seed 별 배치, opt.ped false면 받침 없음.
  var STAR_SETS = [
    { s: [[22, 30, 1.2], [48, 18, .8], [160, 26, 1.1], [178, 58, .7], [30, 92, .7], [170, 104, 1], [96, 14, .6], [130, 40, .7], [64, 60, .6], [146, 80, .6]], c: [[30, 54], [52, 38], [74, 46], [86, 30]], c2: [[136, 22], [158, 34], [172, 18]] },
    { s: [[18, 44, 1], [40, 24, .7], [150, 20, 1.2], [182, 46, .8], [26, 110, .8], [176, 96, .9], [110, 12, .7], [70, 30, .6], [128, 64, .6], [56, 84, .6]], c: [[132, 30], [150, 46], [170, 40], [184, 60]], c2: [[22, 70], [38, 58], [30, 40]] },
    { s: [[30, 20, 1.1], [60, 40, .7], [168, 30, 1], [140, 14, .7], [20, 80, .8], [184, 84, .8], [100, 26, .6], [80, 70, .6], [150, 66, .6], [44, 120, .7]], c: [[40, 30], [60, 22], [76, 34], [70, 52]], c2: [[150, 44], [166, 56], [180, 46]] }
  ];
  function starSvg(seed) {
    var S = STAR_SETS[(seed || 0) % STAR_SETS.length], pl = function (c) { return '<polyline points="' + c.map(function (p) { return p.join(','); }).join(' ') + '"/>' + c.map(function (p) { return '<circle class="v" cx="' + p[0] + '" cy="' + p[1] + '" r="1.3"/>'; }).join(''); };
    return '<svg class="ns-stars" viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + S.s.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '"' + (i < 2 ? ' class="tw"' : '') + '/>'; }).join('') +
      '<g class="cn">' + pl(S.c) + pl(S.c2) + '</g><path class="sp" d="M150 98l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>';
  }
  function stage(inner, opt) {
    opt = opt || {};
    return '<div class="opstage' + (opt.cls ? ' ' + opt.cls : '') + '"' + (opt.attr || '') + '><i class="ns-neb"></i>' + starSvg(opt.seed) +
      (opt.ped === false ? '' : '<i class="ns-ped"><i></i></i>') + '<div class="ns-obj"' + (opt.objAttr || '') + '>' + inner + '<i class="ns-sh"></i></div>' + (opt.extra || '') + '</div>';
  }

  CW.opalUI = {
    stage: stage, starSvg: starSvg,
    addCss: addCss, mount: mount, update: update, play: play, suspend: stop, resume: start, dispose: dispose, bumpValues: bumpValues, fx: fx, applyFx: applyFx,
    stats: function () { return { renderers: stats.renderers, created: stats.created, disposed: stats.disposed, loops: stats.loops, frames: stats.frames, mounts: stats.mounts, lost: stats.lost, running: running, hasHost: !!(host && host.isConnected) }; }
  };
  // 패널을 스크롤했는지 (위쪽 흐림 표시용)
  function hookScroll() {
    var p = doc.getElementById('panel');
    if (!p || p._opscr) return;
    p._opscr = 1;
    p.addEventListener('scroll', function () { var on = p.scrollTop > 2; if (on !== p.classList.contains('opscr')) p.classList.toggle('opscr', on); }, { passive: true });
  }
  if (doc) {
    if (doc.head) addCss(); else doc.addEventListener('DOMContentLoaded', addCss);
    if (doc.getElementById('panel')) hookScroll(); else doc.addEventListener('DOMContentLoaded', hookScroll);
  }
})(typeof window !== 'undefined' ? window : globalThis);
