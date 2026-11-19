// Keep the game in one browsing context. Rotating its viewport lets the browser
// resolve media queries, scrolling, canvas size and touch coordinates together.
(function () {
  var host;
  try { host = window.frameElement && window.frameElement.id === 'cw-play-viewport' && parent.CWDisplay; } catch (e) {}
  if (host) { window.CWDisplay = host; window.CWPlayViewport = true; return; }
  if (window !== window.top) return;

  var mode = 'portrait';
  try { if (localStorage.getItem('cw-display-mode') === 'landscape') mode = 'landscape'; } catch (e) {}
  var frame, mount, topInset, backdropElement, lastLayout;
  function fitBackdrop(portrait) {
    if (!mount) return;
    var edge = mount.getBoundingClientRect().bottom;
    var gap = screen.height - edge;
    var standalone = navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    var extend = portrait && standalone && gap > 0 && gap <= 120 && backdropElement && backdropElement.style.backgroundImage;
    // Paint on the host canvas. A separate box below the viewport increases
    // the document's scroll extent and can make mobile viewport metrics oscillate.
    var canvas = document.documentElement.style;
    canvas.backgroundImage = extend ? backdropElement.style.backgroundImage : '';
    canvas.backgroundSize = extend ? '100% ' + screen.height + 'px' : '';
    canvas.backgroundPosition = 'center top';
    canvas.backgroundRepeat = 'no-repeat';
    if (backdropElement) {
      backdropElement.style.backgroundSize = extend ? '100% ' + screen.height + 'px' : '';
      backdropElement.style.backgroundPosition = extend ? 'center top' : '';
    }
  }
  function fitMount() {
    var portrait = mode === 'portrait' && innerWidth <= innerHeight;
    // In upright play the inner game already positions the HUD and home bar.
    // Reserve cutouts in the host only for the other (possibly rotated) layouts.
    // Old iPhone home-screen apps can paint normal-flow content below their
    // fixed viewport. Size the document and game together, not just the artwork.
    var height = screen.height;
    var fullPage = portrait && navigator.standalone && topInset.offsetHeight > 0 &&
      height >= innerHeight && height - innerHeight <= 120;
    var pageHeight = fullPage ? height + 'px' : '';
    document.documentElement.style.height = document.body.style.height = pageHeight;
    mount.style.position = fullPage ? 'relative' : 'fixed';
    mount.style.height = fullPage ? '100%' : '';
    frame.style.position = fullPage ? 'relative' : 'absolute';
    mount.style.inset = portrait ? '0' : 'env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  }
  function layout() {
    if (!frame) return;
    fitMount();
    var w = mount.clientWidth, h = mount.clientHeight;
    var landscape = mode === 'landscape';
    var rotate = (w > h) !== landscape;
    var desktop = matchMedia('(hover:hover) and (pointer:fine)').matches;
    var width = rotate ? h : w, height = rotate ? w : h;
    if (desktop && rotate) {
      width = landscape ? w : Math.min(w, Math.round(h * 0.60));
      height = landscape ? Math.min(h, Math.round(w * 0.60)) : h;
      rotate = false;
    }
    var key = [width, height, mode, rotate, screen.height].join('/');
    if (key === lastLayout) return;
    lastLayout = key;
    fitBackdrop(mode === 'portrait' && innerWidth <= innerHeight);
    frame.style.width = width + 'px'; frame.style.height = height + 'px';
    var centered = rotate || width !== w || height !== h;
    frame.style.left = frame.style.top = centered ? '50%' : '0';
    frame.style.transform = centered ? 'translate(-50%, -50%)' + (rotate ? ' rotate(' + (landscape ? 90 : -90) + 'deg)' : '') : 'none';
  }
  window.CWDisplay = {
    refresh: layout,
    showBackdrop: function (element) {
      backdropElement = element;
      fitBackdrop(mode === 'portrait' && innerWidth <= innerHeight);
    },
    get: function () { return mode; },
    set: function (value) {
      if (value !== 'landscape' && value !== 'portrait') return;
      mode = value;
      try { localStorage.setItem('cw-display-mode', mode); } catch (e) {}
      layout();
    }
  };
  // In the host only, the rest of the game markup stays inert. The child
  // loads the normal game address so relative assets and account storage work.
  document.write('<template id="cw-game-source">');
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('cw-game-source').remove();
    document.documentElement.style.cssText += ';margin:0;background:#0f1019;overflow:hidden';
    document.body.style.margin = '0';
    topInset = document.createElement('i');
    topInset.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px)';
    document.body.appendChild(topInset);
    mount = document.createElement('main');
    mount.style.cssText = 'position:fixed;inset:0;overflow:hidden';
    frame = document.createElement('iframe'); frame.id = 'cw-play-viewport'; frame.title = '냥법사 게임';
    frame.style.cssText = 'position:absolute;left:50%;top:50%;border:0;display:block';
    var url = new URL(location.href); url.searchParams.set('cwViewport', '1'); frame.src = url.href;
    document.body.appendChild(mount); layout(); mount.appendChild(frame);
    new ResizeObserver(layout).observe(mount);
    window.addEventListener('resize', layout);
    window.addEventListener('pageshow', layout);
  });
})();
