// Keep the game in one browsing context. Rotating its viewport lets the browser
// resolve media queries, scrolling, canvas size and touch coordinates together.
(function () {
  var host;
  try { host = window.frameElement && window.frameElement.id === 'cw-play-viewport' && parent.CWDisplay; } catch (e) {}
  if (host) { window.CWDisplay = host; window.CWPlayViewport = true; return; }
  if (window !== window.top) return;

  var mode = 'portrait';
  try { if (localStorage.getItem('cw-display-mode') === 'landscape') mode = 'landscape'; } catch (e) {}
  var frame, mount;
  function layout() {
    if (!frame) return;
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
    mount.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);right:env(safe-area-inset-right,0px);bottom:env(safe-area-inset-bottom,0px);left:env(safe-area-inset-left,0px);overflow:hidden';
    frame = document.createElement('iframe'); frame.id = 'cw-play-viewport'; frame.title = '냥법사 게임';
    frame.style.cssText = 'position:absolute;left:50%;top:50%;border:0;display:block';
    var url = new URL(location.href); url.searchParams.set('cwViewport', '1'); frame.src = url.href;
    document.body.appendChild(mount); layout(); mount.appendChild(frame);
    new ResizeObserver(layout).observe(mount);
  });
})();
