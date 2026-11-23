// 오픈 기념 이벤트 창 (2026-11-23, 형: 들어가자마자 이벤트 하나·패스 하나가 애니메이션으로 뜨게, 디자인은 GPT).
// 그림은 코덱스·GPT 시안 「장밋빛 밤하늘」 조각 (art-src/ai-review/2026-11-23-opening-event-rose → art/ev-*.webp,
// tools/ev-art.py). 틀 그림(1086×1448) 위에 칸·버튼 조각을 그 그림의 단위(%)로 얹어서 어느 폰 크기에서도 모양이 같음.
// 글자는 창 너비 기준(cqw)이라 창과 같이 줄어듦. 규칙은 js/open-event.js, 받기·사기는 js/main.js (CW.evG = G).
//   CW.eventOpen(tab 'att'|'pass', onClose) · CW.eventClose() · CW.eventIsOpen() · CW.eventHtml(view, tab) (테스트용)
// 움직임: 열 때 아래에서 튀어 오름, 받으면 칸에 발도장 쾅 + 반짝이, 점수 막대는 지난번 본 점수에서 차오름,
// 받은 보상은 아래에서 떠올랐다 사라짐. 움직임 줄이기 설정이면 다 멈춤.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var W = 1086, H = 1448;
  function CWo() { return (root && root.CW) || (typeof globalThis !== 'undefined' && globalThis.CW) || {}; }
  function A() { return CWo().ART_BASE || 'art/'; }
  function box(x, y, w, h) { return 'left:' + (x / W * 100).toFixed(3) + '%;top:' + (y / H * 100).toFixed(3) + '%;width:' + (w / W * 100).toFixed(3) + '%;height:' + (h / H * 100).toFixed(3) + '%'; }
  function img(n, cls) { return '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + A() + 'ev-' + n + '.webp" alt="" draggable="false">'; }
  function ico(k, g) { var C = CWo(); return C.giveIco ? C.giveIco(k, g) : ''; }
  function gname(g) { var D = CWo().DATA || (typeof module !== 'undefined' && module.exports ? require('./data.js').DATA : null); return D && D.hiGrades && D.hiGrades[g] ? D.hiGrades[g].name : g + '등급'; }
  function short(n) { return n >= 10000 && n % 1000 === 0 ? (n / 10000) + '만' : Number(n).toLocaleString('ko-KR'); }
  function mins(m) { return m >= 60 ? (m / 60) + '시간' : m + '분'; }
  // gold given as "N minutes of hunting": the real amount at today's hunting speed (it is worked out again when taken)
  function goldOf(min) {
    var C = CWo(), s = C.evG && C.evG.state;
    if (s && C.goldPerSecond) { var n = C.goldPerSecond(s) * 60 * min; return C.fmtGold ? C.fmtGold(n) : C.fmt ? C.fmt(n) : String(Math.floor(n)); }
    return '사냥 ' + mins(min) + '치';
  }
  // what a cell shows: [icon, name + amount] for each thing the give holds (2026-11-23 다듬기, 형: 가독성 너무 엉망 — 「1시간」
  // 「500」만으로는 무엇인지 몰라서 이름을 붙임)
  // long: the full words for the line under the window (장비 뽑기 10회, 물약 3종 1시간, 영웅 신성력 1개, 골드 … (지금 사냥 1시간치));
  // short: name + amount for a cell with one thing (다이아 300, 뽑기 10회); the third item is the amount alone, for a cell with
  // two or three things side by side, where the picture says what it is (형: 2·3줄 칸은 너무 작아 — 큼직하게)
  function parts(g, long) {
    var out = [], cnt = function (n) { return long ? ' ' + n + '개' : n > 1 ? ' ×' + n : ''; };
    if (g.gems) out.push([ico('gem'), '다이아 ' + short(g.gems), short(g.gems)]);
    if (g.pulls) out.push([ico('pull'), (long ? '장비 뽑기 ' : '뽑기 ') + g.pulls + '회', g.pulls + '회']);
    if (g.goldMin) out.push([ico('gold'), '골드 ' + goldOf(g.goldMin) + (long && goldOf(g.goldMin).indexOf('사냥') < 0 ? ' (지금 사냥 ' + mins(g.goldMin) + '치)' : ''), goldOf(g.goldMin)]);
    if (g.potionMin) out.push([ico('potion'), (long ? '물약 3종 ' : '물약 ') + mins(g.potionMin), mins(g.potionMin)]);
    if (g.mana) out.push([ico('mana'), '마력석 ' + short(g.mana), short(g.mana)]);
    (g.runes || []).forEach(function (x) { out.push([ico('rune', x.grade), gname(x.grade) + ' 룬' + cnt(x.n), gname(x.grade) + (x.n > 1 ? ' ×' + x.n : '')]); });
    if (g.runeStone) out.push([ico('runeStone'), '룬석 ' + short(g.runeStone), short(g.runeStone)]);
    (g.sigils || []).forEach(function (x) { out.push([ico('sigil', x.grade), gname(x.grade) + ' 신성력' + cnt(x.n), gname(x.grade) + (x.n > 1 ? ' ×' + x.n : '')]); });
    if (g.sigilStone) out.push([ico('sigilStone'), '신성석 ' + short(g.sigilStone), short(g.sigilStone)]);
    return out;
  }
  // one thing: a big picture with its name and amount under it; two or more: big pictures side by side, the amount under each
  // rows: the box cells (7·14일, 패스 30단계) — one line each from the top left, a big picture and its amount beside it,
  // filling the cell down to the box drawn in its corner
  function rewards(g, max, rows) {
    var p = parts(g).slice(0, max || 9), one = p.length < 2;
    return '<span class="evrws ' + (one ? 'one' : rows ? 'rows' : 'cols') + '">' + p.map(function (x) { return '<span class="evrw"><i>' + x[0] + '</i><b>' + (one ? x[1] : x[2]) + '</b></span>'; }).join('') + '</span>';
  }
  // a cell's picture: a nine-slice border image, so the corners and sparkles keep their shape at any cell size
  function pc(n) { return '--pc:url(' + A() + 'ev-' + n + '.webp)'; }
  function md(day) { var m = /^\d{4}-(\d{2})-(\d{2})$/.exec(day || ''); return m ? (+m[1]) + '.' + m[2] : ''; }

  // ---------- 출석 ----------
  var ATT_PIC = { got: 'attendance-claimed', ready: 'attendance-ready', wait: 'attendance-future' };
  var CHEST_PIC = { got: 'attendance-chest-claimed', ready: 'attendance-chest-ready', wait: 'attendance-chest-future' };
  function attHtml(v) {
    // 칸 크게 (형: 칸을 좀 더 늘리거나 키워서): small cells 214×130 → 226×158, the 7th/14th box 228×280 → 236×330
    var SW = 226, SH = 158, BW = 236, WH = 330, XS = [62, 304, 546], XB = 788, TOPS = [540, 894];
    var cells = v.att.list.map(function (c, i) {
      var wk = i < 7 ? 0 : 1, k = i % 7, top = TOPS[wk], big = k === 6;
      var x = big ? XB : XS[k % 3], y = big ? top : top + (k < 3 ? 0 : SH + 14), w = big ? BW : SW, h = big ? WH : SH;
      var pic = big ? img(CHEST_PIC[c.st], 'evpc') : '';
      return '<button class="evcell ' + (big ? 'big ' : '') + c.st + '" data-evday="' + c.day + '" style="' + box(x, y, w, h) + (big ? '' : ';' + pc(ATT_PIC[c.st])) + '">' + pic +
        '<em class="evday">' + c.day + '일</em>' + rewards(c.give, big ? 4 : 3, big) + '</button>';
    }).join('');
    var btn = v.att.today ? img('claim-ready') + '<span>오늘 출석 받기</span>' : img('claim-done') + '<span>' + (v.att.n >= v.att.list.length ? '출석을 모두 받았어요' : '내일 또 만나요') + '</span>';
    return img('attendance-frame', 'evframe') +
      '<b class="evdate" style="' + box(340, 452, 408, 52) + '">' + md(v.start) + ' ~ ' + md(v.end) + '</b>' + cells +
      '<button class="evbtn' + (v.att.today ? '' : ' off') + '" data-evattend="1" style="' + box(168, 1256, 750, 100) + '">' + btn + '</button>';
  }

  // ---------- 패스 ----------
  function passPic(line, final, st) {
    var pre = line === 'pass' ? 'premium' : 'free', s = st === 'got' ? 'claimed' : st === 'ready' ? 'ready' : st === 'lock' ? 'locked' : 'future';
    if (pre === 'free' && s === 'locked') s = 'future';
    return pre + (final ? '-final-' : '-') + s;
  }
  function passHtml(v, friend) {
    // 3 cells fill the strip exactly (3 × 290 + 2 × GAP = 946), bigger than the 4 before (형: 칸 좀 키워서 보기 편하게), and the
    // strip stops cell by cell. The last (30th) keeps its picture's own shape (the box drawn in its corner).
    var GAP = 38, CW_ = 290, CH = 210;
    var P = v.pass, cols = '', X = 0;
    P.list.forEach(function (c) {
      var final = c.step === P.steps, w = final ? 258 : CW_;
      var cell = function (line, cc, y) {
        if (!cc) return '';
        return '<button class="evpcell ' + line + ' ' + cc.st + (final ? ' final' : '') + '" data-evstep="' + c.step + '" data-evline="' + line + '" style="left:' + X + 'px;top:' + y + '%;width:' + w + 'px;height:' + (CH / 496 * 100).toFixed(3) + '%' + (final ? '' : ';' + pc(passPic(line, false, cc.st))) + '">' +
          (final ? img(passPic(line, true, cc.st), 'evpc') : '') + '<em class="evday">' + c.step + '</em>' + rewards(cc.give, 3, final) + '</button>';
      };
      cols += cell('free', c.free, 0) + cell('pass', c.pass, ((496 - CH) / 496 * 100).toFixed(3));
      X += w + GAP;
    });
    // the strip's inner units are frame units (px inside .evrow, scaled by --u = card width / 1086)
    // 친구꺼 (패스 줄 없음): 무료 줄을 가운데쯤으로
    var dy = friend ? 150 : 0;
    var strip = '<div class="evstrip" style="' + box(70, 636 + dy, 946, 496) + '"><div class="evrow" style="width:' + (X - GAP) + 'px">' + cols + '</div></div>';
    var next = P.step >= P.steps ? 1 : (P.pts - P.step * P.per) / P.per;
    var buy = !friend && !P.bought, all = P.claim > 0;
    var btns = buy
      ? '<button class="evbtn' + (all ? '' : ' off') + '" data-evall="1" style="' + box(67, 1208, 455, 100) + '">' + img('claim-all') + '<span>모두 받기</span></button>' +
        '<button class="evbtn gold" data-evbuy="1" style="' + box(551, 1208, 465, 100) + '">' + img('unlock-pass') + '<span>패스 열기</span></button>' +
        '<b class="evprice" style="' + box(654, 1322, 260, 52) + '">' + img('price-slot') + '<span>' + Number(v.price).toLocaleString('ko-KR') + '원</span></b>'
      : '<button class="evbtn' + (all ? '' : ' off') + '" data-evall="1" style="' + box(168, 1220, 750, 100) + '">' + img(all ? 'claim-ready' : 'claim-done') + '<span>' + (all ? '모두 받기' : P.step >= P.steps ? '패스를 다 채웠어요' : '점수를 더 모아요') + '</span></button>';
    return img('pass-frame', 'evframe') +
      '<b class="evdleft" style="' + box(814, 62, 188, 56) + '">' + (v.dLeft > 0 ? 'D-' + v.dLeft : '오늘 끝') + '</b>' +
      '<div class="evbar" style="' + box(76, 469, 926, 96) + '">' + img('progress-base', 'evbarbase') +
        '<i class="evfill" style="--p:' + (Math.max(0, Math.min(1, next)) * 100).toFixed(1) + '"><span>' + img('progress-fill') + '</span></i>' +
        '<b class="evlv">' + P.step + '</b><b class="evpts">' + P.pts.toLocaleString('ko-KR') + ' / ' + (P.per * P.steps).toLocaleString('ko-KR') + '점</b>' +
        '<small>' + (P.step >= P.steps ? '30단계 완성!' : P.capped ? '오늘 점수는 다 모았어요 · 내일 또 모아요' : '다음 단계까지 ' + (P.per * (P.step + 1) - P.pts) + '점') + '</small></div>' +
      '<b class="evlabel" style="' + box(70, 588 + dy, 168, 49) + '">' + img('free-label') + '<span>무료</span></b>' +
      (friend ? '' : '<b class="evlabel gold" style="' + box(70, 866, 168, 49) + '">' + img('premium-label') + '<span>패스</span></b>') +
      strip + btns;
  }

  // what a tapped cell holds, for the line under the window (형: 칸이 무엇인지 잘 보이게)
  function eventDetail(v, t, n, line) {
    if (t === 'pass') { var c = v.pass.list[n - 1], cc = c && (line === 'pass' ? c.pass : c.free); return cc ? { title: (line === 'pass' ? '패스 ' : '무료 ') + n + '단계', give: cc.give, st: cc.st } : null; }
    var a = v.att.list[n - 1]; return a ? { title: n + '일째 보상', give: a.give, st: a.st } : null;
  }
  function eventHtml(v, tab, friend) {
    if (!v || !v.on) return '';
    if (friend === undefined) friend = !!v.pass.list[0] && v.pass.list[0].pass === null;
    return '<div class="evcard ' + tab + '">' + (tab === 'pass' ? passHtml(v, friend) : attHtml(v)) + '<div class="evgot" aria-live="polite"></div></div>';
  }

  // ---------- 브라우저 ----------
  var fx = null, tab = 'att', onClose = null, busy = false, downX = 0, downY = 0, moved = false;
  function G() { return CWo().evG; }
  function toast(m) { var C = CWo(); if (C.toast) C.toast(m); }
  function sound(k) { var g = G(); if (g && g.sound) g.sound(k); }
  var WHY = { net: '인터넷 연결이 필요해요', used: '이미 받았어요', over: '이벤트가 끝났어요', locked: '패스를 열면 받을 수 있어요', done: '출석을 모두 받았어요', nope: '아직 받을 수 없어요', full: '가방이 가득 찼어요' };
  function store(k, v) { try { if (v === undefined) return root.localStorage.getItem(k); root.localStorage.setItem(k, v); } catch (e) { return null; } }
  function css() {
    if (root.document.getElementById('evCss')) return;
    var s = root.document.createElement('style'); s.id = 'evCss';
    s.textContent = [
      '#evFx{position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(24,12,28,.62);',
      'padding:calc(10px + env(safe-area-inset-top,0px)) calc(10px + env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) calc(10px + env(safe-area-inset-left,0px));',
      'overflow-y:auto;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;',
      '--evw:min(94vw,560px,max(300px,calc((100dvh - 86px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)) * .75)))}',
      '#evFx[hidden]{display:none}',
      // 알림은 창 위로 (2026-11-23 점검: 「이미 받았어요」 등이 창 밑에 깔림)
      'body:has(#evFx:not([hidden])) #toast{z-index:95}',
      '#evFx img{-webkit-user-drag:none;-webkit-touch-callout:none;pointer-events:none}',
      '#evFx .evtop{display:flex;gap:8px;align-items:center;width:var(--evw);flex:0 0 auto}',
      '#evFx .evtab{flex:0 0 auto;min-height:44px;padding:0 20px;border-radius:22px;border:2px solid #e9b8d6;background:rgba(74,44,78,.92);color:#f5dcea;font:400 16px var(--display,inherit);position:relative}',
      '#evFx .evtab.on{background:linear-gradient(180deg,#a8648f,#7b4670);color:#fff6e3;border-color:#ffd98a}',
      '#evFx .evtab i{position:absolute;top:4px;right:6px;width:9px;height:9px;border-radius:50%;background:#ff4d6a;box-shadow:0 0 0 1.5px #fff}',
      '#evFx .evx{margin-left:auto;width:44px;height:44px;border-radius:50%;border:2px solid #e9b8d6;background:rgba(74,44,78,.92);color:#fff;font:700 22px/1 sans-serif}',
      '#evFx .evwrap{width:var(--evw);flex:0 0 auto}',
      '#evFx .evcard{position:relative;width:100%;aspect-ratio:1086/1448;container-type:inline-size;color:#fff6e3;font-family:var(--display,inherit)}',
      '#evFx.pop .evcard{animation:evPop .42s cubic-bezier(.2,1.4,.4,1) both}',
      '@keyframes evPop{0%{transform:translateY(40px) scale(.92);opacity:0}70%{transform:translateY(0) scale(1.03);opacity:1}100%{transform:none}}',
      '#evFx .evcard>*{position:absolute}',
      '#evFx .evframe{left:0;top:0;width:100%;height:100%}',
      '#evFx .evpc{position:absolute;left:-2.5%;top:-4.5%;width:105%;height:109%}',
      '#evFx .evcell,#evFx .evpcell{padding:0;border:0;background:none;color:inherit;display:block}',
      '#evFx .evcell.big .evpc{left:-2.6%;top:-2.1%;width:105.7%;height:104.6%}',
      '#evFx .evpcell.final .evpc{left:-2.6%;top:-3%;width:105.2%;height:106%}',
      // nine-slice cell pictures (corners 70px of the piece kept as drawn: the paw stamp, the check, the lock, the sparkles)
      '#evFx .evcell:not(.big),#evFx .evpcell:not(.final){border-style:solid;border-color:transparent;border-width:0;border-image-source:var(--pc);border-image-slice:70 fill;border-image-repeat:stretch}',
      '#evFx .evcell:not(.big){border-image-width:6.4cqw;border-image-outset:.5cqw}',
      '#evFx .evpcell:not(.final){border-image-width:70px;border-image-outset:6px}',
      // 칸 안 (2026-11-23 2차 다듬기, 형: 큼직큼직하게): 날짜·단계는 왼쪽 위 작은 띠, 그 밑에 보상. 하나면 큰 그림 + 이름과 양,
      // 둘·셋이면 큰 그림을 나란히 두고 그 밑에 양만 (무엇인지는 그림이, 긴 이름은 누르면 아래 줄에)
      '#evFx .evday{position:absolute;left:5%;top:6%;padding:.2cqw .9cqw;border-radius:2cqw;background:rgba(42,19,40,.55);font:400 2.6cqw/1.1 var(--display,inherit);font-style:normal;color:#ffe7b8}',
      '#evFx .evrws{position:absolute;left:4%;right:4%;top:24%;bottom:6%;display:flex;align-items:center;justify-content:center}',
      '#evFx .evrw{display:flex;flex-direction:column;align-items:center;min-width:0}',
      '#evFx .evrw i{flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-style:normal}',
      '#evFx .evrw i>*{width:100%!important;height:100%!important}',
      '#evFx .evrw b{max-width:100%;font:400 3cqw/1.1 var(--display,inherit);color:#fff6e3;text-shadow:0 0 2px #2a1328,0 0 2px #2a1328,0 1px 2px #2a1328;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#evFx .one .evrw{gap:.4cqw}#evFx .one .evrw i{width:7cqw;height:7cqw}#evFx .one .evrw i>*{font-size:6cqw}#evFx .one .evrw b{font-size:3.2cqw}',
      '#evFx .cols{justify-content:space-evenly}#evFx .cols .evrw{flex:1 1 0;gap:.3cqw}#evFx .cols .evrw i{width:6cqw;height:6cqw}#evFx .cols .evrw i>*{font-size:5.2cqw}#evFx .cols .evrw b{font-size:3cqw}',
      // 7·14일째 상자 칸: 왼쪽 위부터 한 줄에 하나씩 큰 그림 + 양, 오른쪽 아래 상자 그림까지 칸을 채움
      '#evFx .big .evrws{top:19%;bottom:22%;left:9%;right:6%}',
      '#evFx .big .rows{flex-direction:column;align-items:flex-start;justify-content:space-evenly}',
      '#evFx .big .rows .evrw{flex-direction:row;gap:1.2cqw}#evFx .big .rows .evrw i{width:6.2cqw;height:6.2cqw}#evFx .big .rows .evrw i>*{font-size:5.4cqw}#evFx .big .rows .evrw b{font-size:3.4cqw}',
      '#evFx .big .one .evrw i{width:8cqw;height:8cqw}',
      // inside the zoomed pass strip sizes are frame units (px, 1cqw ≈ 10.9px), not cqw
      '#evFx .evpcell .evday{left:5%;top:6%;padding:2px 10px;border-radius:22px;font-size:30px}',
      '#evFx .evpcell .evrws{top:24%;bottom:6%;left:4%;right:4%}',
      '#evFx .evpcell .evrw b{font-size:34px}',
      '#evFx .evpcell .one .evrw{gap:4px}#evFx .evpcell .one .evrw i{width:80px;height:80px}#evFx .evpcell .one .evrw i>*{font-size:68px}#evFx .evpcell .one .evrw b{font-size:36px}',
      '#evFx .evpcell .cols .evrw{gap:4px}#evFx .evpcell .cols .evrw i{width:68px;height:68px}#evFx .evpcell .cols .evrw i>*{font-size:58px}#evFx .evpcell .cols .evrw b{font-size:32px}',
      // 30단계 칸 (상자 그림이 오른쪽 아래): 출석 상자 칸과 같이 왼쪽 위부터 한 줄에 하나씩
      '#evFx .evpcell.final .evrws{top:21%;bottom:27%;left:7%;right:31%}',
      '#evFx .evpcell.final .rows{flex-direction:column;align-items:flex-start;justify-content:space-evenly}',
      '#evFx .evpcell.final .rows .evrw{flex-direction:row;gap:12px}#evFx .evpcell.final .rows .evrw i{width:56px;height:56px}#evFx .evpcell.final .rows .evrw i>*{font-size:48px}#evFx .evpcell.final .rows .evrw b{font-size:33px}',
      '#evFx .evpcell.free,#evFx .evpcell.pass{scroll-snap-align:start}',
      '#evFx .got .evrws,#evFx .lock .evrws,#evFx .wait .evrws{opacity:.7}',
      '#evFx .ready .evpc,#evFx .evcell.ready:not(.big),#evFx .evpcell.ready:not(.final){animation:evGlow 1.6s ease-in-out infinite}',
      '@keyframes evGlow{50%{filter:brightness(1.15) drop-shadow(0 0 1cqw #ffd98a)}}',
      '#evFx .evdate,#evFx .evdleft{display:flex;align-items:center;justify-content:center;font:400 3.2cqw/1 var(--display,inherit);color:#ffe7b8}',
      '#evFx .evbtn{padding:0;border:0;background:none;color:#fff6e3}',
      '#evFx .evbtn img,#evFx .evlabel img,#evFx .evprice img{position:absolute;left:0;top:0;width:100%;height:100%}',
      '#evFx .evbtn span,#evFx .evlabel span,#evFx .evprice span{position:relative;display:flex;height:100%;align-items:center;justify-content:center;font:400 4.2cqw/1 var(--display,inherit);text-shadow:0 1px 2px #2a1328}',
      '#evFx .evlabel span{font-size:3cqw}#evFx .evprice span{font-size:3.2cqw;color:#ffe7b8}',
      '#evFx .evbtn.off{filter:saturate(.6) brightness(.85)}',
      '#evFx .evbtn:not(.off):active,#evFx .evcell.ready:active,#evFx .evpcell.ready:active{transform:scale(.96)}',
      '#evFx .evbarbase{position:absolute;left:0;top:0;width:100%;height:100%}',
      '#evFx .evfill{position:absolute;left:10.6%;top:40.6%;height:23.9%;width:calc(87.6% * var(--p) / 100);overflow:hidden;border-radius:2cqw;transition:width .7s cubic-bezier(.3,.9,.3,1)}',
      '#evFx .evfill span{position:absolute;left:0;top:0;width:100cqw;height:100%}#evFx .evfill img{position:absolute;left:0;top:0;width:74.8cqw;height:100%}',
      '#evFx .evlv{position:absolute;left:0;top:0;width:10.2%;height:100%;display:flex;align-items:center;justify-content:center;font:400 4.6cqw/1 var(--display,inherit);color:#fff6e3}',
      '#evFx .evpts{position:absolute;left:12%;right:3%;top:38%;height:28%;display:flex;align-items:center;justify-content:center;font:400 2.7cqw/1 var(--display,inherit);color:#fff6e3;text-shadow:0 0 2px #2a1328,0 1px 2px #2a1328}',
      '#evFx .evbar small{position:absolute;right:2%;top:100%;margin-top:.4cqw;font:400 2.6cqw/1 var(--display,inherit);color:#ffe7b8;text-shadow:0 1px 2px #2a1328}',
      '#evFx .evstrip{scroll-snap-type:x mandatory;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}',
      '#evFx .evstrip::-webkit-scrollbar{display:none}',
      '#evFx .evrow{position:relative;height:100%}',
      '#evFx .evrow>*{position:absolute}',
      '#evFx .evgot{left:8%;right:8%;bottom:13%;margin:0;display:flex;flex-wrap:wrap;justify-content:center;gap:1cqw 2.4cqw;padding:2cqw 3cqw;border-radius:3cqw;background:rgba(74,40,72,.95);box-shadow:0 0 0 .4cqw #ffd98a;opacity:0;transform:translateY(4cqw);transition:opacity .25s,transform .35s cubic-bezier(.2,1.4,.4,1);pointer-events:none}',
      '#evFx .evgot.on{opacity:1;transform:none}#evFx .evgot li{list-style:none;display:flex;align-items:center;gap:1cqw;font:400 3cqw/1.2 var(--display,inherit)}',
      '#evFx .evgot .evgt{flex:0 0 100%;justify-content:center;color:#ffd98a}#evFx .evgot .evnote{flex:0 0 100%;justify-content:center;color:#f5dcea;font-size:2.6cqw}',
      '#evFx .evgot .wpi{width:5cqw;height:5cqw;display:flex}#evFx .evgot .wpi>*{width:100%!important;height:100%!important}',
      '#evFx .stamp .evpc,#evFx .evcell.stamp:not(.big),#evFx .evpcell.stamp:not(.final){animation:evStamp .45s cubic-bezier(.2,1.6,.4,1) both}',
      '@keyframes evStamp{0%{transform:scale(1.45);filter:brightness(1.6)}100%{transform:none}}',
      '#evFx .evspark{position:absolute;width:90%;aspect-ratio:1;left:5%;top:50%;transform-origin:center;margin-top:-45%;pointer-events:none;animation:evSpark .8s ease-out both}',
      '@keyframes evSpark{0%{transform:scale(.3) rotate(-30deg);opacity:0}30%{opacity:1}100%{transform:scale(1.5) rotate(20deg);opacity:0}}',
      '#evFx .evask{left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:rgba(30,14,32,.7);border-radius:4cqw}',
      '#evFx .evask div{width:78%;padding:5cqw;border-radius:4cqw;background:#5a3458;box-shadow:0 0 0 .5cqw #ffd98a;text-align:center;font:400 4cqw/1.4 var(--display,inherit)}',
      '#evFx .evask small{display:block;margin-top:1cqw;font-size:3cqw;color:#f5dcea}',
      '#evFx .evask p{display:flex;gap:3cqw;margin:4cqw 0 0}#evFx .evask button{flex:1;min-height:44px;border-radius:999px;border:0;font:400 4cqw/1 var(--display,inherit);background:#7b4670;color:#fff}',
      '#evFx .evask button.yes{background:linear-gradient(180deg,#ffd98a,#e3a84f);color:#4a2618}',
      // 가로 화면 (형 2026-11-24: 가로모드에서 창 잘림): 출석·패스·닫기를 창 옆 세로 줄로, 창은 화면 높이에 맞춤
      '@media (orientation:landscape) and (max-height:540px){#evFx{flex-direction:row;gap:10px;--evw:calc((100dvh - 16px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)) * .75)}#evFx .evtop{flex-direction:column;width:auto;align-self:center}#evFx .evx{margin:8px 0 0 0}}',
      '@media (prefers-reduced-motion:reduce){#evFx *,#evFx.pop .evcard{animation:none!important;transition:none!important}}'
    ].join('\n');
    root.document.head.appendChild(s);
  }
  function view() { return G().evView(); }
  function render(pop) {
    var v = view();
    if (!v.on) { eventClose(); return; }
    var friend = !!CWo().FRIEND;
    fx.innerHTML = '<div class="evtop">' +
      '<button class="evtab' + (tab === 'att' ? ' on' : '') + '" data-evtab="att">출석' + (v.att.today ? '<i></i>' : '') + '</button>' +
      '<button class="evtab' + (tab === 'pass' ? ' on' : '') + '" data-evtab="pass">패스' + (v.pass.claim ? '<i></i>' : '') + '</button>' +
      '<button class="evx" data-evclose="1" aria-label="닫기">×</button></div>' +
      '<div class="evwrap">' + eventHtml(v, tab, friend) + '</div>';
    var row = fitRow();
    fx.classList.remove('pop'); if (pop) { fx.getBoundingClientRect(); fx.classList.add('pop'); }
    if (tab === 'pass') {
      // the bar fills from the points seen last time; the strip starts at the first cell not taken yet
      var fill = fx.querySelector('.evfill'), want = fill && fill.style.getPropertyValue('--p'), seen = +store('cwEvPts') || 0, P = v.pass;
      if (fill && seen < P.pts) { var s0 = Math.floor(seen / P.per); fill.style.setProperty('--p', s0 === P.step ? ((seen - s0 * P.per) / P.per * 100).toFixed(1) : '0'); fill.getBoundingClientRect(); requestAnimationFrame(function () { fill.style.setProperty('--p', want); }); }
      store('cwEvPts', String(P.pts));
      var strip = fx.querySelector('.evstrip'), first = 0;
      for (var i = 0; i < P.list.length; i++) { var c = P.list[i]; if (c.free.st !== 'got' || (c.pass && c.pass.st === 'ready')) { first = i; break; } }
      if (strip) { var cell = strip.querySelector('[data-evstep="' + (first + 1) + '"]'); if (cell) strip.scrollLeft = Math.max(0, (cell.offsetLeft - 8) * (+row.style.zoom || 1)); }
    }
  }
  // the pass strip is laid out in frame units: scale it to the card (CSS zoom keeps scrolling and taps right); again when the
  // phone turns while the window is open (2026-11-23)
  function fitRow() {
    var row = fx && fx.querySelector('.evrow'), cardEl = fx && fx.querySelector('.evcard');
    if (row && cardEl) { row.style.height = '496px'; row.style.zoom = String(cardEl.clientWidth / 1086); }
    return row;
  }
  function listHtml(rows) { return rows.map(function (p) { return '<li><i class="wpi">' + p[0] + '</i><span>' + p[1] + '</span></li>'; }).join(''); }
  function showGot(lines) {
    var C = CWo(), g = fx && fx.querySelector('.evgot'); if (!g || !lines) return;
    var give = {}, gold = 0; lines.forEach(function (o) {
      if (o.k === 'gems' || o.k === 'pulls' || o.k === 'mana' || o.k === 'runeStone' || o.k === 'sigilStone') give[o.k] = (give[o.k] || 0) + o.n;
      else if (o.k === 'gold') gold += o.gold || 0;
      else if (o.k === 'potion') give.potionMin = (give.potionMin || 0) + o.n;
      else if (o.k === 'rune' || o.k === 'sigil') (give[o.k + 's'] = give[o.k + 's'] || []).push({ grade: o.grade, n: o.n });
    });
    var rows = parts(give, true);
    if (gold) rows.unshift([ico('gold'), '골드 ' + (C.fmtGold ? C.fmtGold(gold) : Math.floor(gold))]);
    g.innerHTML = '<li class="evgt">받았어요!</li>' + listHtml(rows);
    g.classList.add('on'); clearTimeout(showGot.t); showGot.t = setTimeout(function () { g.classList.remove('on'); }, 2600);
  }
  // a tapped cell that cannot be taken now: what it holds, in the line under the window
  function info(t, n, line) {
    var C = CWo(), g = fx && fx.querySelector('.evgot'), dt = eventDetail(view(), t, n, line); if (!g || !dt) return;
    var note = dt.st === 'got' ? '이미 받았어요' : dt.st === 'lock' ? '패스를 열면 받을 수 있어요' : t === 'att' ? n + '번째 출석하는 날 받아요' : '점수를 더 모으면 받아요';
    g.innerHTML = '<li class="evgt">' + dt.title + '</li>' + listHtml(parts(dt.give, true)) + '<li class="evnote">' + note + '</li>';
    g.classList.add('on'); clearTimeout(showGot.t); showGot.t = setTimeout(function () { g.classList.remove('on'); }, 3000);
    sound('click');
  }
  function spark(sel) {
    var el = fx && fx.querySelector(sel); if (!el) return;
    el.classList.add('stamp');
    var s = root.document.createElement('img'); s.className = 'evspark'; s.src = A() + 'ev-claim-spark.webp'; s.alt = ''; s.draggable = false; el.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 900);
  }
  // one request at a time (a second tap while the wallet answers does nothing)
  function after(p, ok) {
    busy = true;
    Promise.resolve(p).then(function (r) {
      busy = false;
      if (!r || r.walletFail) return;
      if (!r.ok) { toast(WHY[r.code] || WHY.nope); if (eventIsOpen()) render(false); return; }
      if (eventIsOpen()) ok(r);
    }, function () { busy = false; });
  }
  function attend() {
    if (busy) return;
    var v = view(); if (!v.on) { toast(WHY.over); eventClose(); return; }
    if (!v.att.today) { toast(v.att.n >= v.att.list.length ? WHY.done : '오늘은 이미 받았어요. 내일 또 만나요'); return; }
    var day = v.att.n + 1;
    after(G().evAttend(), function (r) { render(false); spark('[data-evday="' + day + '"]'); showGot(r.lines); });
  }
  function claim(line, step) {
    if (busy) return;
    if (!view().on) { toast(WHY.over); eventClose(); return; }
    after(G().passClaim(line, step), function (r) {
      render(false);
      (r.list || []).forEach(function (x) { spark('[data-evstep="' + x.step + '"][data-evline="' + x.line + '"]'); });
      showGot(r.lines);
    });
  }
  function askBuy() {
    var v = view(), card = fx.querySelector('.evcard'); if (!card || busy) return;
    var d = root.document.createElement('div'); d.className = 'evask';
    d.innerHTML = '<div>오픈 기념 패스를 열까요?<small>' + Number(v.price).toLocaleString('ko-KR') + '원 · 연습 결제라 실제로 돈이 나가지 않아요</small><p><button data-evno="1">다음에</button><button class="yes" data-evyes="1">열기</button></p></div>';
    card.appendChild(d);
  }
  function onClick(e) {
    if (moved) { moved = false; return; }
    var t = e.target.closest('[data-evtab],[data-evclose],[data-evday],[data-evattend],[data-evstep],[data-evall],[data-evbuy],[data-evyes],[data-evno]'); if (!t) return;
    var d = t.dataset;
    if (d.evclose) { sound('click'); eventClose(); return; }
    if (d.evtab) { if (d.evtab !== tab) { tab = d.evtab; sound('click'); render(true); } return; }
    if (d.evno) { t.closest('.evask').remove(); return; }
    if (d.evyes) { t.closest('.evask').remove(); var r = G().passBuy(); if (r) after(r, function () { render(false); toast('패스가 열렸어요!'); }); return; }
    if (d.evbuy) { askBuy(); return; }
    if (d.evattend) { attend(); return; }
    if (d.evday) { if (t.classList.contains('ready')) attend(); else info('att', +d.evday); return; }
    if (d.evall) { if (!t.classList.contains('off')) claim('all'); else toast('지금 받을 수 있는 보상이 없어요'); return; }
    if (d.evstep) {
      if (t.classList.contains('ready')) claim(d.evline, +d.evstep);
      else info('pass', +d.evstep, d.evline);
    }
  }
  function eventOpen(t, close) {
    var C = CWo(); if (!C.evG || !root.document) { if (close) close(); return false; }
    if (!view().on) { if (close) close(); return false; }
    css();
    if (!fx) {
      fx = root.document.createElement('div'); fx.id = 'evFx'; fx.setAttribute('role', 'dialog'); fx.setAttribute('aria-label', '오픈 기념 이벤트');
      root.document.body.appendChild(fx);
      fx.addEventListener('click', onClick);
      fx.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      root.addEventListener('resize', function () { if (eventIsOpen()) fitRow(); });
      fx.addEventListener('selectstart', function (e) { e.preventDefault(); });
      fx.addEventListener('pointerdown', function (e) { downX = e.clientX; downY = e.clientY; moved = false; });
      fx.addEventListener('pointermove', function (e) { if (e.buttons || e.pointerType === 'touch') { if (Math.abs(e.clientX - downX) > 8 || Math.abs(e.clientY - downY) > 8) moved = true; } });
    }
    tab = t === 'pass' ? 'pass' : 'att'; onClose = close || null; busy = false;
    fx.hidden = false; render(true); sound('click');
    return true;
  }
  function eventClose() {
    if (!fx || fx.hidden) return;
    fx.hidden = true; fx.innerHTML = '';
    var c = onClose; onClose = null; if (c) c();
  }
  function eventIsOpen() { return !!fx && !fx.hidden; }
  // 오늘 패스 창을 이미 자동으로 보여 줬는지 (하루 한 번, 폰에만 기억)
  // kind: '' 패스 창, 'att' 출석 창
  function eventSeenToday(day, mark, kind) { var k = 'cwEvSeen' + (kind ? '-' + kind : ''); if (mark) store(k, day); return store(k) === day; }
  return { eventHtml: eventHtml, eventDetail: eventDetail, eventParts: function (g, long) { return parts(g, long).map(function (p) { return p[1]; }); }, eventOpen: eventOpen, eventClose: eventClose, eventIsOpen: eventIsOpen, eventSeenToday: eventSeenToday };
});
