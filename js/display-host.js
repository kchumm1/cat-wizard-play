// Keep the game in one browsing context. Rotating its viewport lets the browser
// resolve media queries, scrolling, canvas size and touch coordinates together.
(function () {
  var host;
  try { host = window.frameElement && window.frameElement.id === 'cw-play-viewport' && parent.CWDisplay; } catch (e) {}
  if (host) { window.CWDisplay = host; window.CWPlayViewport = true; return; }
  if (window !== window.top) return;

  var mode = 'portrait';
  try { if (localStorage.getItem('cw-display-mode') === 'landscape') mode = 'landscape'; } catch (e) {}
  var frame, mount, topInset;
  function fitMount() {
    var portrait = mode === 'portrait' && innerWidth <= innerHeight;
    // In upright play the inner game already positions the HUD and home bar.
    // Reserve cutouts in the host only for the other (possibly rotated) layouts.
    mount.style.inset = portrait ? '0' : 'env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    var inside = false;
    try { inside = localStorage.getItem('cw-bottom') === 'inside'; } catch (e) {}
    var height = Math.max(screen.width, screen.height);
    var standalone = navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    var stretch = portrait && standalone && topInset.offsetHeight > 0 && !inside && height >= innerHeight && height - innerHeight <= 120;
    mount.style.position = stretch ? 'absolute' : 'fixed';
    mount.style.height = stretch ? height + 'px' : '';
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
    frame.style.width = width + 'px'; frame.style.height = height + 'px';
    frame.style.transform = 'translate(-50%, -50%)' + (rotate ? ' rotate(' + (landscape ? 90 : -90) + 'deg)' : '');
  }
  window.CWDisplay = {
    refresh: layout,
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
    mount = document.createElement('main');
    mount.style.cssText = 'position:fixed;inset:0;overflow:hidden';
    topInset = document.createElement('i');
    topInset.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px)';
    document.body.appendChild(topInset);
    frame = document.createElement('iframe'); frame.id = 'cw-play-viewport'; frame.title = '냥법사 게임';
    frame.style.cssText = 'position:absolute;left:50%;top:50%;border:0;display:block';
    var url = new URL(location.href); url.searchParams.set('cwViewport', '1'); frame.src = url.href;
    document.body.appendChild(mount); layout(); mount.appendChild(frame);
    new ResizeObserver(layout).observe(mount);
    window.addEventListener('resize', layout);
    window.addEventListener('pageshow', layout);
  });
})();
