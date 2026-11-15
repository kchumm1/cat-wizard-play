// 업데이트 화면 (2026-11-15, the user's design package art-src/update-20261115): the screen the game opens with. It shows
// what really happens while the game starts, then waits for "모험 시작", which takes the player straight to the main screen.
//   확인      looks for a new version (the offline worker of the site; none on a local server)
//   다운로드  a new version: the worker's real download progress (sw.js tells each file it stored), after which the page
//             restarts once and this screen says the update is done. No new version: the game's own files loading.
//   적용      the game getting ready (GAME.isReady)
// The design's own motion (cat, orbits, stars, shine) is its CSS (index.html, #cwUpdate, made by tools/scope-update-css.cjs).
// Skipped inside a frame (the test and screenshot pages) and with ?noupdate; then the game starts as it always did.
// Until "모험 시작" is pressed, CW.afterStart(fn) holds back what would cover the main screen (the 돌아왔어요 popup).
(function (root) {
  var CW = root.CW = root.CW || {};
  var el = document.getElementById('cwUpdate');
  var waiting = [], started = false;
  CW.afterStart = function (fn) { if (started) fn(); else waiting.push(fn); };
  function start() {
    if (started) return; started = true;
    var list = waiting; waiting = [];
    list.forEach(function (fn) { try { fn(); } catch (e) { setTimeout(function () { throw e; }); } });
  }
  var skip = !el || root !== root.top || /[?&]noupdate\b/.test(location.search);
  if (skip) { if (el) el.parentNode.removeChild(el); start(); return; }

  var $ = function (id) { return document.getElementById(id); };
  var screen = $('update-screen'), steps = [].slice.call(screen.querySelectorAll('[data-step]'));
  var still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var updated = false;
  try { updated = sessionStorage.getItem('cwJustUpdated') === '1'; sessionStorage.removeItem('cwJustUpdated'); } catch (e) {}
  var mode = 'load'; // 'load': no new version, the game's own files; 'update': a new version is downloading
  var TITLES = { update: ['새 소식 확인 중', '모험 자료 다운로드 중', '새로운 마법 적용 중'], load: ['새 소식 확인 중', '모험 자료 불러오는 중', '모험 준비 중'] };
  var shown = 0, target = 0, stage = -1, state = 'updating';

  function paint(v) {
    var n = Math.floor(v);
    $('percent').innerHTML = n + '<span>%</span>';
    $('progress-fill').style.width = v + '%';
    $('progress-star').style.left = v + '%';
    $('progress-track').setAttribute('aria-valuenow', String(n));
  }
  function setStage(s) {
    if (s === stage) return; stage = s;
    $('stage-label').textContent = TITLES[mode][s];
    steps.forEach(function (item, i) { item.classList.toggle('active', i === s); item.classList.toggle('done', i < s); });
  }
  function words() {
    if (state !== 'updating') return;
    $('badge-label').textContent = mode === 'update' ? '업데이트 중' : '모험 준비 중';
    $('status-title').innerHTML = mode === 'update' ? '새로운 모험을<br>준비하고 있어요' : '오늘의 모험을<br>준비하고 있어요';
    $('status-copy').textContent = mode === 'update' ? '냥법사가 별빛으로 새 소식을 모으고 있어요.' : '냥법사가 마법 도구를 챙기고 있어요.';
    var t = TITLES[mode]; if (stage >= 0) $('stage-label').textContent = t[stage];
  }
  // the bar moves smoothly toward the real value (never backwards)
  function frame() {
    if (state !== 'updating') return;
    shown += (target - shown) * 0.12;
    if (target - shown < 0.3) shown = target;
    paint(shown);
    requestAnimationFrame(frame);
  }
  function setTarget(v, s) { target = Math.max(target, Math.min(100, v)); if (s !== undefined) setStage(s); }

  function celebrate() {
    var box = $('celebration'); while (box.firstChild) box.removeChild(box.firstChild);
    if (still) return;
    for (var i = 0; i < 18; i++) {
      var item = document.createElement('span'); item.className = 'celebration-piece'; item.textContent = i % 3 ? '✦' : '✧';
      var a = i / 18 * Math.PI * 2;
      item.style.setProperty('--dx', Math.cos(a) * (80 + i % 4 * 25) + 'px');
      item.style.setProperty('--dy', Math.sin(a) * 140 - 50 + 'px');
      item.style.setProperty('--size', 9 + i % 4 * 3 + 'px');
      box.appendChild(item);
      item.addEventListener('animationend', function () { if (this.parentNode) this.parentNode.removeChild(this); });
    }
  }
  function complete() {
    if (state === 'complete') return;
    state = 'complete'; screen.dataset.state = 'complete'; paint(100); setStage(3);
    $('progress-area').hidden = true; $('game-action').hidden = false; $('game-action').textContent = '모험 시작';
    $('badge-label').textContent = updated ? '업데이트 완료' : '준비 완료';
    $('status-title').innerHTML = '모험 준비가<br>끝났어요!';
    $('status-copy').textContent = updated ? '새로워진 냥법사의 세계로 떠나볼까요?' : '냥법사의 세계로 떠나볼까요?';
    $('message-label').textContent = '모험 출발 준비 완료';
    $('quiet-note').textContent = '새로운 이야기가 우리를 기다린다냥!';
    celebrate();
  }
  function fail() {
    if (state !== 'updating') return;
    state = 'error'; screen.dataset.state = 'error';
    $('game-action').hidden = false; $('game-action').textContent = '다시 시도';
    $('badge-label').textContent = '연결 확인';
    $('status-title').textContent = '별빛 연결이 끊겼어요';
    $('status-copy').textContent = '인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
    $('message-label').textContent = '잠시 쉬어가는 중';
    $('quiet-note').textContent = '연결을 확인하면 다시 출발할 수 있어요.';
  }
  $('game-action').addEventListener('click', function () {
    if (state === 'error') { location.reload(); return; }
    if (state !== 'complete') return;
    // into the game: the screen fades out, the main screen is already running under it
    el.classList.add('leave');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
    start();
  });

  // ---- 확인: is a new version on the way? ----
  var checked = false, readyLoop = 0;
  function afterCheck() {
    if (checked) return; checked = true;
    if (mode === 'update') return;
    setTarget(12, 1);
    loadLoop();
  }
  // a download that stops (the connection went away) falls back to starting the game as it is
  var stalled = 0;
  function watch() { clearTimeout(stalled); stalled = setTimeout(function () { if (state === 'updating' && mode === 'update') { mode = 'load'; words(); loadLoop(); } }, 30000); }
  function goUpdate() {
    watch();
    if (mode === 'update') return;
    mode = 'update'; words(); setTarget(12, 1); checked = true;
  }
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      var d = e.data; if (!d || d.cw !== 'dl' || !d.total) return;
      goUpdate(); setTarget(12 + d.done / d.total * 74, 1);
      if (d.done >= d.total) setTarget(86, 2);
    });
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return afterCheck();
      if (reg.installing) goUpdate();
      reg.addEventListener('updatefound', goUpdate);
      reg.update().then(function () { if (!reg.installing) afterCheck(); }, afterCheck);
    }, afterCheck);
    setTimeout(afterCheck, 2500);
  } else setTimeout(afterCheck, 500);
  setStage(0); setTarget(4); words(); requestAnimationFrame(frame);

  // ---- 다운로드 (no new version): the page's files; 적용: the game starting ----
  var loaded = document.readyState === 'complete';
  root.addEventListener('load', function () { loaded = true; });
  function loadLoop() {
    if (state !== 'updating' || mode === 'update') return;
    var ready = root.GAME && root.GAME.isReady && root.GAME.isReady();
    if (!loaded) setTarget(Math.min(80, target + 1.5), 1);
    else if (!ready) setTarget(Math.max(target, 86) + 1, 2);
    if (loaded && ready) { setTarget(100, 2); setTimeout(complete, 450); return; }
    if (++readyLoop > 600) return fail(); // 60 s with no game: the files could not be reached
    setTimeout(loadLoop, 100);
  }

  // stars over the sky (the design's particles)
  for (var i = 0; i < 22; i++) {
    var p = document.createElement('i'); p.className = 'particle';
    p.style.setProperty('--x', 8 + (i * 37) % 84 + '%'); p.style.setProperty('--y', 9 + (i * 19) % 47 + '%');
    p.style.setProperty('--size', 2 + i % 3 + 'px'); p.style.setProperty('--duration', 3.5 + i % 5 * 0.7 + 's'); p.style.setProperty('--delay', -i * 0.6 + 's');
    $('particles').appendChild(p);
  }
})(window);
