(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // 테마 (2026-11-25, 형: "누구는 성운테마 누구는 눈이 포커스인 겨울테마" → "전투에도 눈").
  // 플레이어마다 설정 › 화면 설정 › 테마 [성운][겨울]. 값은 state.settings.theme ('neb' 기본 | 'winter'), 진행·서버 저장에
  // 같이 실림. 저장을 읽기 전(로그인·업데이트 화면)에도 맞게 보이도록 localStorage 'cw-theme'에 거울 값을 두고 index.html
  // <head>가 먼저 읽음. 겨울이면 <html>에 tw 클래스 하나, 겨울 CSS는 전부 html.tw 아래(js/winter-css.js)라 성운 화면은 그대로.
  // 설계: docs/superpowers/specs/2026-11-25-winter-theme-design.md
  var THEMES = ['neb', 'winter'];
  // 겨울판이 있는 성운(·보라) 그림 → 겨울 원본(GPT, art-src/winter-parts/W1~W8.png). art/w-<이름>.webp 는
  // tools/make-winter-art.py 가 원래 그림과 같은 크기·투명 모양으로 만듦. CSS 는 var(--nb-<이름>) 로 씀.
  var NEB_ART = {
    'mn-neb-fill': 'W1', 'mc-neb': 'W1', 'rk-neb': 'W1', 'sk-dneb': 'W1', 'opal-neb': 'W1', 'opal-neb-cos2': 'W1',
    'opal-neb-gear': 'W1', 'al-neb-fill': 'W1',
    'ru-neb': 'W2', 'si-neb': 'W2', 'dv-neb': 'W2',
    'tp-neb': 'W3', 'gp-neb': 'W4', 'ui-stage-bg': 'W5', 'bg-galaxy': 'W6', 'ui-map': 'W7', 'ui-map-sky': 'W8',
    'ui-up-bg': 'W9'   // 업데이트·로그인 화면 (형이 GPT로 그려 줌: 눈 덮인 창밖 도서관)
  };
  // 전투 눈 (three.js 점, js/snow3d.js): 화질 따라 개수, 낮음이면 끔
  var SNOW = { high: 500, mid: 300, low: 0 };

  function themeOf(settings) { return settings && settings.theme === 'winter' ? 'winter' : 'neb'; }
  function snowCount(theme, quality) { return theme === 'winter' ? (SNOW[quality] || 0) : 0; }
  // 실내(무한의 탑 방, 던전 원정, 실내 하늘 지역)와 원래 눈이 내리는 얼음 지역에서는 겨울 눈을 내리지 않음.
  // 실내 하늘 지역: 천공 도서관(bg-sky5, 도서관 던전도 이 배경)·시계탑(bg-sky6) — 나무 바닥·책장·기둥 (전체 검사 2026-11-25)
  var INDOOR = ['bg-sky5', 'bg-sky6'];
  function snowBlocked(bgId) { return !!bgId && (bgId === 'bg-ice' || INDOOR.indexOf(bgId) >= 0 || bgId.indexOf('bg-tower-') === 0 || bgId.indexOf('expedition-') === 0); }
  // 메뉴 그림 미리 받기(js/ui.js cssArtPics): 지금 테마 쪽 그림만
  function warmSkip(url, winter) {
    var m = /\/art\/(w-)?([^\/?#]+)\.webp(?:[?#].*)?$/.exec(url || '');
    if (!m || !NEB_ART.hasOwnProperty(m[2])) return false;
    return m[1] ? !winter : !!winter;
  }
  function apply(doc, theme, store) {
    doc.documentElement.classList.toggle('tw', theme === 'winter');
    if (store) try { store.setItem('cw-theme', theme); } catch (e) {}
  }
  // 메뉴 눈 판 (js/winter-css.js 가 겨울에만 보이게): 멀리 작은 눈·가까이 큰 눈 두 겹, 한 번만 넣음
  function mountSnow(el) {
    if (!el) return null;
    var have = el.querySelector(':scope > .wsn'); if (have) return have;
    var s = el.ownerDocument.createElement('i'); s.className = 'wsn'; s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<i class="wsn-f"></i><i class="wsn-n"></i>';
    el.insertBefore(s, el.firstChild);
    return s;
  }
  // 아래 탭 줄 윗변에 얹는 눈 더미 (형이 그려 준 그림 art/snow-cap.webp, js/winter-css.js 가 겨울에만 보이게), 한 번만 넣음
  function mountCap(el) {
    if (!el) return null;
    var have = el.querySelector(':scope > .wcap'); if (have) return have;
    var c = el.ownerDocument.createElement('i'); c.className = 'wcap'; c.setAttribute('aria-hidden', 'true');
    el.appendChild(c);
    return c;
  }
  return { theme: { THEMES: THEMES, NEB_ART: NEB_ART, INDOOR: INDOOR, themeOf: themeOf, snowCount: snowCount, snowBlocked: snowBlocked, warmSkip: warmSkip, apply: apply, mountSnow: mountSnow, mountCap: mountCap } };
});
