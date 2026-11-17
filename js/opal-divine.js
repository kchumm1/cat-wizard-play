// 삼신기 오팔 2판 (사용자 부품·시안 06-divine, 2026-11-17) — js/ui.js divinePanel 의 무대(.dvw)·상세 상자(.dvd) 모양.
// 그림 = tools/import-divine-parts.py 가 만든 art/dv2-*(원화)·dv-*(받침대·성운 창·상세 바탕·이름 알약·패널·그림 칸)와
// 다른 메뉴와 같은 공용 부품 art/sk-*(버튼·알약·동전·보석·네 갈래 별)·al-star1(별).
// 좌표는 시안 source.png(1024×1536)의 상세 상자 x58~968 = 359px(×0.3945), 무대 y0 = 성운 창 위 끝(시안 y135).
// 좁은 폰은 ui.js fitNarrow 가 --opz 로 무대·상세 상자를 같이 줄임.
(function () {
  if (typeof document === 'undefined') return;
  var CW = window.CW = window.CW || {};
  CW.opalDivine = true;
  var S = '#sheet.opal#sheet.opal ';
  var CSS = [
    // ---------- 무대: 성운 창 + 세 받침대 ----------
    S + '.dvw{position:relative;width:359px;height:226px;margin:-2px auto -4px!important;zoom:var(--opz,1)}',
    S + '.dvv{position:absolute;left:0;top:0;width:359px;height:226px;isolation:isolate}' + S + '.dvv>*{position:absolute}',
    // 창 = 부품 마스크(dv-win)로 자른 성운(dv-neb) + 진주 테두리(dv-winrim) + 창 겉 번짐(dv-halo). 시안 창 x30~993 → 무대 -11~369
    S + '.dvv-halo,' + S + '.dvv-neb,' + S + '.dvv-rim{left:-11px;top:0;width:380px;height:271.4px;pointer-events:none}',
    S + '.dvv-halo{background:url(art/dv-halo.webp) 0 0/100% 100% no-repeat;z-index:-3}',
    S + '.dvv-neb{overflow:hidden;z-index:-2;-webkit-mask:url(art/dv-win.webp) 0 0/100% 100% no-repeat;mask:url(art/dv-win.webp) 0 0/100% 100% no-repeat}',
    S + '.dvv-neb::before{content:"";position:absolute;inset:0;background:url(art/dv-neb.webp) 0 0/100% 100% no-repeat;animation:dvNeb 26s ease-in-out infinite alternate;transform-origin:50% 30%}',
    // 반짝이는 별 몇 개 (창 안, 성운 그림 별 위에 살짝)
    S + '.dvv-neb::after{content:"";position:absolute;inset:0;background:radial-gradient(1.6px 1.6px at 17% 14%,#fff,transparent),radial-gradient(2px 2px at 44% 9%,#fff,transparent),radial-gradient(1.5px 1.5px at 72% 20%,#fff,transparent),radial-gradient(1.8px 1.8px at 88% 33%,#fff,transparent),radial-gradient(1.4px 1.4px at 30% 30%,#fff,transparent),radial-gradient(1.6px 1.6px at 60% 36%,#fff,transparent);animation:dvTw 3.2s ease-in-out infinite}',
    S + '.dvv-rim{background:url(art/dv-winrim.webp) 0 0/100% 100% no-repeat;z-index:-1}',
    // 세 칸: 칸 하나가 받침대·신기·이름 알약·Lv·별 줄 전체 (누르는 영역 110×226)
    S + '.dvs{top:0;width:110px;height:226px;padding:0;border:0;background:none!important;box-shadow:none!important;cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}',
    S + '.dvs>*{position:absolute;pointer-events:none}',
    S + '.dvs0{left:4.7px}' + S + '.dvs1{left:124.5px}' + S + '.dvs2{left:244.6px}',
    // 받침대 (시안 x70~343·368~650·678~943, y465~545 → 무대 y131, 높이 30)
    S + '.dvs-ped{left:-3px;top:128px;width:114px;height:33px;background:url(art/dv-ped.webp) 0 0/100% 100% no-repeat;filter:saturate(.3) brightness(1.03);transition:filter .2s}',
    S + '.dvs1 .dvs-ped{left:-5px;width:117px}' + S + '.dvs2 .dvs-ped{left:-2px;width:110px}',
    S + '.dvs.sel .dvs-ped{filter:drop-shadow(0 0 5px rgba(110,230,240,.75));animation:dvPed 2.6s ease-in-out infinite}',
    // 고른 받침대 앞 네 갈래 별 (시안 x210, y525)
    S + '.dvs-sp{left:43px;top:144px;width:22px;height:22px;background:url(art/sk-spark.webp) 50% 50%/contain no-repeat;filter:sepia(1) saturate(2.4) brightness(1.4) drop-shadow(0 0 4px rgba(255,230,170,.95));opacity:0}',
    S + '.dvs.sel .dvs-sp{opacity:1;animation:dvSp 2.2s ease-in-out infinite}',
    // 신기 원화: 시안 물체 자리 (칸 기준) — 지팡이 x145~365 y182~492, 망토 x358~642 y235~500, 방울 x688~915 y265~465
    S + '.dvs-fig{background:50% 100%/contain no-repeat;transition:filter .2s}',
    S + '.dv-staff{background-image:url(art/dv2-staff.webp)}' + S + '.dv-robe{background-image:url(art/dv2-robe.webp)}' + S + '.dv-charm{background-image:url(art/dv2-charm.webp)}',
    S + '.dvs0 .dvs-fig{left:24.5px;top:18.5px;width:97px;height:122.3px}',
    S + '.dvs1 .dvs-fig{left:-12px;top:30px;width:124px;height:115px}',
    S + '.dvs2 .dvs-fig{left:3.9px;top:51.3px;width:89.5px;height:79px}',
    S + '.dvs .dvs-fig{filter:drop-shadow(0 4px 5px rgba(40,40,110,.28));animation:dvBob 3.6s ease-in-out infinite}',
    S + '.dvs1 .dvs-fig{animation-delay:-1.2s}' + S + '.dvs2 .dvs-fig{animation-delay:-2.4s}',
    S + '.dvs.sel .dvs-fig{filter:drop-shadow(0 4px 5px rgba(40,40,110,.28)) drop-shadow(0 0 7px rgba(255,255,255,.7));animation:dvFloat 3s ease-in-out infinite}',
    S + '.dvs.sleep .dvs-fig{filter:grayscale(.75) brightness(.95) opacity(.75);animation:none}',
    // 이름 알약 (부품 artifact-nameplate 138×42 논리, 9분할 19) — 고른 것은 청록 테두리·빛
    S + '.dvs-name{left:0;top:165px;width:110px;height:27px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0 6px;border:11px solid transparent;border-image:url(art/dv-plate.webp) 57 fill/11px/1.9px stretch;border-width:0;font:800 13px/1 var(--display);color:#2c3358;letter-spacing:-.4px;white-space:nowrap;border-image-outset:1.9px}',
    S + '.dvs.sel .dvs-name{border-radius:14px;box-shadow:0 0 0 4px #3cb2ab,0 0 10px 4px rgba(80,210,200,.45);animation:dvSel 2.4s ease-in-out infinite}',
    S + '.dvs-lv{left:0;top:195px;width:110px;text-align:center;font:800 12px/14px var(--display);color:#2c3358}',
    S + '.dvs-st{left:0;top:210px;width:110px;display:flex;align-items:center;justify-content:center;gap:3px;font:700 10.5px/12px var(--body);color:#565d7c}',
    S + '.dvs-st i{width:11px;height:11px;background:url(art/al-star1.webp) 50% 50%/contain no-repeat;filter:grayscale(1) brightness(.42)}',
    S + '.dvs:active .dvs-name{transform:scale(.97);filter:brightness(.97);transition:transform .12s,filter .12s}',
    // ---------- 상세 상자 (부품 artifact-card, 시안 x58~968 y728~1340) ----------
    S + '.dvd{position:relative;width:359px;height:250px;margin:0 auto;box-sizing:border-box;zoom:var(--opz,1);border:19px solid transparent;border-image:url(art/dv-card.webp) 66 fill/19px/2.9px stretch;color:#2c3358}',
    S + '.dvd>*{position:absolute}',
    // 그림 칸 (부품 slot-normal 과 같은 진주 칸 → 다른 메뉴 그림 칸과 같은 모양): 시안 x100~340 y765~992
    S + '.dvd-pic{left:-2.4px;top:-4.4px;width:94.7px;height:89.6px;box-sizing:border-box;border-radius:15px;background:radial-gradient(70% 60% at 50% 42%,rgba(255,255,255,.95),rgba(236,232,250,.6) 70%,rgba(226,222,246,.5)),linear-gradient(160deg,#f6f3fd,#e3def4);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.95),inset 0 0 0 2.5px #d9d3ec,0 2px 4px rgba(90,80,150,.14)}',
    S + '.dvd-pic .dvs-fig{position:absolute;left:3px;top:3px;right:3px;bottom:3px;background-position:50% 50%;filter:drop-shadow(0 3px 3px rgba(40,40,110,.25));animation:dvBob 3.6s ease-in-out infinite}',
    S + '.dvd-pic.sleep .dvs-fig{filter:grayscale(.75) opacity(.75);animation:none}',
    S + '.dvd-bar{left:104px;top:3.5px;width:1.2px;height:74px;background:linear-gradient(#c9c3dd00,#c9c3dd 20%,#c9c3dd 80%,#c9c3dd00)}',
    S + '.dvd-name{left:118px;top:-3px;right:0;margin:0;font:800 20px/24px var(--display);color:#2b3157;white-space:nowrap;letter-spacing:-.4px}',
    S + '.dvd-name small{font:800 12px var(--body);color:#5b6aa0;margin-left:2px;letter-spacing:0}',
    // 효과 알약 (공용 effect-pill = sk-pill): 시안 x395~937 y857~923
    S + '.dvd-eff{left:114.5px;top:32.3px;width:213.9px;height:26px;margin:0;box-sizing:border-box;display:flex;align-items:center;gap:7px;padding:0 10px;border:11px solid transparent;border-width:0;border-image:url(art/sk-pill.webp) 45 fill/11px/2.4px stretch;font:800 12.5px/1 var(--body);color:#2c3358;white-space:nowrap}',
    S + '.dvd-eff i{flex:none;width:12px;height:12px;background:url(art/sk-spark.webp) 50% 50%/contain no-repeat;filter:brightness(.55) saturate(.6)}',
    // 아래 두 패널을 담은 칸 (시안 x75~950 y1018~1330)
    S + '.dvd-low{left:-12.3px;top:95.4px;width:345.2px;height:131px;box-sizing:border-box;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(244,240,252,.35));box-shadow:inset 0 0 0 1.2px rgba(214,208,234,.9),inset 0 1px 0 rgba(255,255,255,.9)}',
    // 레벨업·별 강화 패널 (부품 star-up-panel 205×155 논리, 9분할 22): 시안 x93~497 / x523~932, y1040~1318
    S + '.dvp{position:absolute;top:8.6px;width:159.4px;height:117.7px;box-sizing:border-box;border:17px solid transparent;border-image:url(art/dv-starup.webp) 66 fill/17px/2.6px stretch}',
    S + '.dvp:first-child{left:7.1px}' + S + '.dvp:last-child{left:176.7px;width:161.3px}',
    S + '.dvp>*{position:absolute}',
    // 버튼: 주(청록 sk-btn)·보조(진주 sk-sec). 시안 높이 30 → 손가락 기준 38
    S + '.dvp-btn{left:-15.4px;top:-14px;right:-15.4px;height:38px;margin:0;padding:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:16px;border:10px solid transparent;border-width:0;background:none!important;box-shadow:none!important;font:800 16.5px/1 var(--display);letter-spacing:-.2px;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;transition:transform .12s,filter .12s}',
    S + '.dvp-btn i{flex:none;width:12px;height:12px;background:url(art/sk-spark.webp) 50% 50%/contain no-repeat}',
    S + '.dvp-btn.pri{border-image:url(art/sk-btn.webp) 57 fill/13px/2.3px stretch;border-width:0;color:#fff;text-shadow:0 1px 2px rgba(10,70,80,.55)}',
    S + '.dvp-btn.pri i{filter:brightness(1.6)}',
    S + '.dvp-btn.pri:active{border-image-source:url(art/sk-btn-press.webp);transform:scale(.97)}',
    S + '.dvp-btn.pri.off{border-image-source:url(art/sk-btn-off.webp);color:#8c90a8;text-shadow:none}' + S + '.dvp-btn.pri.off i{filter:brightness(.7) saturate(.4)}',
    S + '.dvp-btn.sec{border-image:url(art/sk-sec.webp) 51 fill/13px/2.5px stretch;color:#2c3358}',
    S + '.dvp-btn.sec i{filter:brightness(.55) saturate(.6)}',
    S + '.dvp-btn.sec:active{border-image-source:url(art/sk-sec-press.webp);transform:scale(.97)}',
    S + '.dvp-btn.sec.off{color:#9a9eb5}',
    // 이름 문구·지금→다음 줄·비용 알약 (공용 cost-pill = sk-cost, 9분할 15): 시안 알약 y1222~1292
    S + '.dvp-cap{left:-10px;right:-10px;top:30px;text-align:center;font:700 12px/14px var(--body);color:#2c3358;white-space:nowrap}',
    S + '.dvp-line{left:-12px;right:-12px;top:46px;display:flex;align-items:center;justify-content:center;gap:3px;font:800 12px/14px var(--body);color:#3a4166;white-space:nowrap}',
    S + '.dvp-line em{font-style:normal;color:#2a9a92;font-weight:900;margin:0 1px}' + S + '.dvp-line b{color:#1f7f78;font-weight:800;margin-left:3px}',
    S + '.dvp-line i.st{width:12px;height:12px;background:url(art/al-star1.webp) 50% 50%/contain no-repeat;filter:grayscale(1) brightness(.45)}',
    S + '.dvp-cost{left:-4.6px;right:-4.6px;top:63px;height:27.6px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;border:12px solid transparent;border-width:0;border-image:url(art/sk-cost.webp) 45 fill/12px/2.7px stretch;font:800 15.5px/1 var(--body);color:#2c3358;white-space:nowrap}',
    S + '.dvp-cost .gn{font-weight:800;color:inherit}' + S + '.dvp-cost .gn small{font-size:11px;margin-left:1px}',
    S + '.dvp-cost>small{font:700 10px var(--body);color:#6a7090;margin-left:2px}',
    S + '.dvp-cost.lack{color:#c4466b}',
    S + '.dvp-cost i{flex:none;width:19px;height:19px;background:50% 50%/contain no-repeat}',
    S + '.dvp-cost i.coin2{background-image:url(art/sk-coin.webp)}' + S + '.dvp-cost i.gem2{background-image:url(art/sk-gem.webp);width:17px;height:19px}',
    S + '.dvd.none .dvp-line{visibility:hidden}',
    // 다른 자리(가방·묶음 등)의 삼신기 그림: 별 단계는 빛으로 (art-items.js s2 7~13★, s3 14~20★)
    '.p-divine.s2{filter:drop-shadow(0 0 3px rgba(150,220,255,.75))}.p-divine.s3{filter:drop-shadow(0 0 3px rgba(255,220,120,.9)) drop-shadow(0 0 6px rgba(255,200,255,.6))}',
    S + '.dvnote{margin:6px 0 4px;text-align:center;font:700 11px var(--body);color:#6a7090}',
    // 성공 반응 (ui-opal fx: dv:<id> 레벨, dvs:<id> 별)
    S + '.dvd-pic.opfx{animation:dvPop .4s ease-out var(--opd,0s) both}',
    S + '.dvd.opfx .dvd-pic{animation:dvStar .7s ease-out both}',
    '@keyframes dvNeb{from{transform:scale(1);filter:brightness(1)}to{transform:scale(1.03) translateX(-1.5%);filter:brightness(1.06) saturate(1.08)}}',
    '@keyframes dvTw{0%,100%{opacity:.25}50%{opacity:1}}',
    '@keyframes dvBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}',
    '@keyframes dvFloat{0%,100%{transform:translateY(-1px)}50%{transform:translateY(-5px)}}',
    '@keyframes dvPed{0%,100%{filter:drop-shadow(0 0 4px rgba(110,230,240,.6))}50%{filter:drop-shadow(0 0 8px rgba(110,230,240,.95)) brightness(1.04)}}',
    '@keyframes dvSp{0%,100%{transform:scale(.8);opacity:.75}50%{transform:scale(1.15) rotate(20deg);opacity:1}}',
    '@keyframes dvSel{0%,100%{box-shadow:0 0 0 4px #3cb2ab,0 0 8px 3px rgba(80,210,200,.4)}50%{box-shadow:0 0 0 4px #5fd0c8,0 0 13px 5px rgba(80,210,200,.6)}}',
    '@keyframes dvPop{0%{transform:scale(1)}35%{transform:scale(1.08);filter:brightness(1.25)}100%{transform:scale(1)}}',
    '@keyframes dvStar{0%{transform:scale(1)}25%{transform:scale(1.14) rotate(-4deg);filter:brightness(1.6) drop-shadow(0 0 8px #fff)}60%{transform:scale(.98)}100%{transform:scale(1)}}',
    '@media (prefers-reduced-motion:reduce){' + S + '.dvv-neb::before,' + S + '.dvv-neb::after,' + S + '.dvs-fig,' + S + '.dvs.sel .dvs-ped,' + S + '.dvs.sel .dvs-sp,' + S + '.dvs.sel .dvs-name{animation:none!important}}'
  ].join('\n');
  var st = document.createElement('style'); st.id = 'opal-dv-css'; st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);
})();
