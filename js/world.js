// Painted battlefields for the 10 regions: a detailed ground tile, a big ground map (paths, lakes, lava,
// mosaics), hand-drawn props around the edges that sway, and drifting particles (petals, snow, embers…).
// Everything is drawn on canvases at load time, no image files.
(function (root) {
  var CW = root.CW = root.CW || {};
  var T = root.THREE;

  function cvs(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rgb(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
  function css(c, a) { var v = rgb(c); return a === undefined ? 'rgb(' + v[0] + ',' + v[1] + ',' + v[2] + ')' : 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + a + ')'; }
  function mix(a, b, k) { var x = rgb(a), y = rgb(b); return (Math.round(x[0] + (y[0] - x[0]) * k) << 16) | (Math.round(x[1] + (y[1] - x[1]) * k) << 8) | Math.round(x[2] + (y[2] - x[2]) * k); }
  function shade(c, k) { return k >= 0 ? mix(c, 0xffffff, k) : mix(c, 0x000000, -k); }
  function rng(seed) { var a = seed >>> 0 || 1; return function () { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return ((a >>> 0) % 100000) / 100000; }; }
  function texOf(c, repeat) {
    var t = new T.CanvasTexture(c); if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    return t;
  }

  // ---------- ground tiles (512px, seamless) ----------
  var TS = 512;
  function wrap(g, x, y, r, fn) { for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) { var px = x + dx * TS, py = y + dy * TS; if (px + r < 0 || px - r > TS || py + r < 0 || py - r > TS) continue; fn(px, py); } }
  function blotches(g, R, n, cols, rMin, rMax, alpha) {
    for (var i = 0; i < n; i++) {
      var x = R() * TS, y = R() * TS, r = rMin + R() * (rMax - rMin), c = cols[Math.floor(R() * cols.length)];
      wrap(g, x, y, r, function (px, py) { var gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, css(c, alpha)); gr.addColorStop(1, css(c, 0)); g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2); });
    }
  }
  function blades(g, R, n, cols, len) {
    g.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var x = R() * TS, y = R() * TS, l = len * (0.6 + R() * 0.7), bend = (R() - 0.5) * l * 0.8, c = cols[Math.floor(R() * cols.length)];
      g.strokeStyle = css(c); g.lineWidth = 1.6 + R() * 1.6;
      wrap(g, x, y, l, function (px, py) { g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + bend * 0.3, py - l * 0.6, px + bend, py - l); g.stroke(); });
    }
  }
  function tufts(g, R, n, cols, len) {
    for (var i = 0; i < n; i++) {
      var x = R() * TS, y = R() * TS, k = 4 + Math.floor(R() * 4), c = cols[Math.floor(R() * cols.length)];
      wrap(g, x, y, len * 1.5, function (px, py) {
        g.strokeStyle = css(shade(c, -0.25)); g.lineWidth = 2.6; g.lineCap = 'round';
        for (var j = 0; j < k; j++) { var a = -Math.PI / 2 + (j / (k - 1) - 0.5) * 1.4, l = len * (0.7 + 0.5 * Math.sin(j * 2.3)); g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + Math.cos(a) * l * 0.4, py + Math.sin(a) * l * 0.6, px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); }
        g.strokeStyle = css(shade(c, 0.12)); g.lineWidth = 1.4;
        for (var q = 0; q < k; q += 2) { var b = -Math.PI / 2 + (q / (k - 1) - 0.5) * 1.2, m = len * 0.8; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(b) * m, py + Math.sin(b) * m); g.stroke(); }
      });
    }
  }
  function flowers(g, R, n, cols, size) {
    for (var i = 0; i < n; i++) {
      var x = R() * TS, y = R() * TS, s = size * (0.7 + R() * 0.6), c = cols[Math.floor(R() * cols.length)];
      wrap(g, x, y, s * 2, function (px, py) {
        for (var p = 0; p < 5; p++) { var a = p / 5 * Math.PI * 2; g.fillStyle = css(c); g.beginPath(); g.ellipse(px + Math.cos(a) * s * 0.8, py + Math.sin(a) * s * 0.6, s * 0.62, s * 0.5, a, 0, 6.3); g.fill(); }
        g.fillStyle = css(shade(c, 0.45)); g.beginPath(); g.arc(px - s * 0.25, py - s * 0.25, s * 0.25, 0, 6.3); g.fill();
        g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(px, py, s * 0.34, 0, 6.3); g.fill();
      });
    }
  }
  function pebbles(g, R, n, col, size) {
    for (var i = 0; i < n; i++) {
      var x = R() * TS, y = R() * TS, w = size * (0.6 + R() * 0.9), h = w * (0.55 + R() * 0.25), rot = R() * 3;
      wrap(g, x, y, w * 1.5, function (px, py) {
        g.save(); g.translate(px, py); g.rotate(rot);
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(w * 0.15, h * 0.35, w, h, 0, 0, 6.3); g.fill();
        g.fillStyle = css(col); g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, 6.3); g.fill();
        g.fillStyle = css(shade(col, 0.3)); g.beginPath(); g.ellipse(-w * 0.25, -h * 0.3, w * 0.5, h * 0.35, 0, 0, 6.3); g.fill();
        g.restore();
      });
    }
  }
  function ripples(g, R, n, light, dark) {
    g.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var x = R() * TS, y = R() * TS, l = 40 + R() * 90, amp = 3 + R() * 4;
      wrap(g, x, y, l, function (px, py) {
        [[dark, 3, 3], [light, 2, 0]].forEach(function (L) { g.strokeStyle = css(L[0], 0.55); g.lineWidth = L[1]; g.beginPath(); for (var k = 0; k <= 12; k++) { var t = k / 12, qx = px - l / 2 + t * l, qy = py + L[2] + Math.sin(t * 6.28 + x) * amp; if (k) g.lineTo(qx, qy); else g.moveTo(qx, qy); } g.stroke(); });
      });
    }
  }
  function cracks(g, R, n, col, glow, width) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (var i = 0; i < n; i++) {
      var x = R() * TS, y = R() * TS, pts = [[x, y]], a = R() * 6.28;
      for (var k = 0; k < 6; k++) { a += (R() - 0.5) * 1.4; var p = pts[pts.length - 1]; pts.push([p[0] + Math.cos(a) * (14 + R() * 18), p[1] + Math.sin(a) * (14 + R() * 18)]); }
      wrap(g, x, y, 140, function (px, py) {
        var ox = px - x, oy = py - y;
        if (glow) { g.strokeStyle = css(glow, 0.35); g.lineWidth = width * 4; g.beginPath(); pts.forEach(function (p, j) { if (j) g.lineTo(p[0] + ox, p[1] + oy); else g.moveTo(p[0] + ox, p[1] + oy); }); g.stroke(); }
        g.strokeStyle = css(col); g.lineWidth = width; g.beginPath(); pts.forEach(function (p, j) { if (j) g.lineTo(p[0] + ox, p[1] + oy); else g.moveTo(p[0] + ox, p[1] + oy); }); g.stroke();
      });
    }
  }
  function sparkles(g, R, n, col, size) {
    for (var i = 0; i < n; i++) {
      var x = R() * TS, y = R() * TS, s = size * (0.4 + R());
      wrap(g, x, y, s * 3, function (px, py) {
        var gr = g.createRadialGradient(px, py, 0, px, py, s * 3); gr.addColorStop(0, css(col, 0.9)); gr.addColorStop(1, css(col, 0)); g.fillStyle = gr; g.fillRect(px - s * 3, py - s * 3, s * 6, s * 6);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, s * 0.6, 0, 6.3); g.fill();
      });
    }
  }
  function tiles(g, R, base, line, size, jitter) {
    for (var y = 0; y < TS; y += size) {
      var off = (Math.floor(y / size) % 2) * size * 0.5;
      for (var x = -size; x < TS + size; x += size) {
        var c = shade(base, (R() - 0.5) * jitter), px = x + off, w = size - 4, h = size - 4;
        g.fillStyle = css(c); g.fillRect(px + 2, y + 2, w, h);
        g.fillStyle = css(shade(c, 0.18)); g.fillRect(px + 2, y + 2, w, 4); g.fillRect(px + 2, y + 2, 4, h);
        g.fillStyle = css(shade(c, -0.2)); g.fillRect(px + 2, y + h - 2, w, 4); g.fillRect(px + w - 2, y + 2, 4, h);
        g.strokeStyle = css(line, 0.7); g.lineWidth = 2; g.strokeRect(px + 1, y + 1, size - 2, size - 2);
      }
    }
  }
  function cobbles(g, R, base, line, n) {
    for (var i = 0; i < n; i++) {
      var x = R() * TS, y = R() * TS, r = 14 + R() * 16, c = shade(base, (R() - 0.5) * 0.3), k = 6 + Math.floor(R() * 3);
      wrap(g, x, y, r + 4, function (px, py) {
        g.beginPath(); for (var j = 0; j < k; j++) { var a = j / k * 6.28, rr = r * (0.8 + 0.2 * Math.sin(j * 3.7 + x)); if (j) g.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.8); else g.moveTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.8); }
        g.closePath(); g.fillStyle = css(c); g.fill(); g.strokeStyle = css(line, 0.8); g.lineWidth = 3; g.stroke();
        g.fillStyle = css(shade(c, 0.15), 0.8); g.beginPath(); g.ellipse(px - r * 0.2, py - r * 0.25, r * 0.45, r * 0.25, 0, 0, 6.3); g.fill();
      });
    }
  }

  var GROUNDS = {
    grass: function (g, R, P) { g.fillStyle = css(P.g0); g.fillRect(0, 0, TS, TS); blotches(g, R, 40, [P.g1, P.g2, shade(P.g0, 0.12)], 40, 110, 0.5); blades(g, R, 900, [P.g1, P.g2, shade(P.g0, 0.18), shade(P.g0, -0.15)], 11); tufts(g, R, 26, [P.g1], 16); flowers(g, R, 34, [0xff9fc8, 0xfff27a, 0xffffff, 0xc8a0ff, 0xff7f7f], 5); pebbles(g, R, 8, 0xbdb7a8, 7); },
    moss: function (g, R, P) { g.fillStyle = css(P.g0); g.fillRect(0, 0, TS, TS); blotches(g, R, 46, [P.g1, P.g2, 0x2c4a2a], 40, 120, 0.55); blades(g, R, 600, [P.g1, P.g2, shade(P.g0, 0.15)], 9); for (var i = 0; i < 40; i++) { var x = R() * TS, y = R() * TS, c = [0xc0703a, 0xe0a040, 0x8a5a2a][i % 3], a = R() * 6; wrap(g, x, y, 12, function (px, py) { g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = css(c); g.beginPath(); g.ellipse(0, 0, 9, 4, 0, 0, 6.3); g.fill(); g.strokeStyle = css(shade(c, -0.35)); g.lineWidth = 1; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); g.restore(); }); } pebbles(g, R, 10, 0x6a7a62, 8); sparkles(g, R, 10, 0x9fffd0, 2); },
    sand: function (g, R, P) { g.fillStyle = css(P.g0); g.fillRect(0, 0, TS, TS); blotches(g, R, 36, [P.g1, P.g2], 60, 150, 0.45); ripples(g, R, 46, shade(P.g0, 0.25), shade(P.g0, -0.18)); pebbles(g, R, 14, 0xc49a5a, 7); for (var i = 0; i < 300; i++) { var x = R() * TS, y = R() * TS; g.fillStyle = css(R() < 0.5 ? shade(P.g0, 0.3) : shade(P.g0, -0.2), 0.7); g.fillRect(x, y, 2, 2); } },
    snow: function (g, R, P) { g.fillStyle = css(P.g0); g.fillRect(0, 0, TS, TS); blotches(g, R, 40, [P.g1, P.g2, 0xffffff], 50, 140, 0.55); ripples(g, R, 18, 0xffffff, P.g2); pebbles(g, R, 6, 0x9fb8d8, 7); sparkles(g, R, 60, 0xbfe8ff, 2.2); },
    basalt: function (g, R, P) { g.fillStyle = css(P.g0); g.fillRect(0, 0, TS, TS); blotches(g, R, 40, [P.g1, P.g2, 0x120808], 40, 120, 0.6); cobbles(g, R, P.g1, 0x0c0606, 60); cracks(g, R, 18, 0xffb030, 0xff4a10, 3); sparkles(g, R, 14, 0xff8a2b, 2.5); },
    night: function (g, R, P) { g.fillStyle = css(P.g0); g.fillRect(0, 0, TS, TS); blotches(g, R, 40, [P.g1, P.g2], 40, 120, 0.5); blades(g, R, 700, [P.g1, P.g2, shade(P.g0, 0.2)], 10); flowers(g, R, 16, [0x9fe8ff, 0xd8b8ff, 0xfff2b0], 4.5); sparkles(g, R, 26, 0x9fe8ff, 2); },
    garden: function (g, R, P) { g.fillStyle = css(P.g0); g.fillRect(0, 0, TS, TS); blotches(g, R, 30, [P.g1, P.g2], 40, 110, 0.5); blades(g, R, 650, [P.g1, P.g2, shade(P.g0, 0.18)], 10); flowers(g, R, 26, [0xffffff, 0xe6e6ff, 0xd8b8ff], 4.5); pebbles(g, R, 8, 0x8a8aa8, 7); sparkles(g, R, 12, 0xe6e6ff, 1.8); },
    temple: function (g, R, P) { tiles(g, R, P.g0, P.g2, 64, 0.16); cracks(g, R, 10, shade(P.g2, -0.2), null, 1.5); blotches(g, R, 20, [P.g1, 0xffffff], 40, 100, 0.25); sparkles(g, R, 18, 0xfff2a0, 2); },
    space: function (g, R, P) { g.fillStyle = css(P.g0); g.fillRect(0, 0, TS, TS); blotches(g, R, 30, [P.g1, P.g2, 0x5a2a8a, 0x2a3a8a], 60, 160, 0.5); for (var i = 0; i < 260; i++) { var x = R() * TS, y = R() * TS; g.fillStyle = css(R() < 0.5 ? 0xffffff : 0xd8c8ff, 0.4 + R() * 0.6); g.fillRect(x, y, R() < 0.15 ? 2.5 : 1.3, R() < 0.15 ? 2.5 : 1.3); } sparkles(g, R, 26, 0xb58cff, 2.4); cracks(g, R, 8, 0xb58cff, 0x7a4aff, 1.6); },
    castle: function (g, R, P) { g.fillStyle = css(P.g0); g.fillRect(0, 0, TS, TS); cobbles(g, R, P.g1, 0x120a1a, 80); blotches(g, R, 20, [0x000000], 40, 100, 0.35); cracks(g, R, 12, 0xff4a6a, 0xff1a3a, 2.4); sparkles(g, R, 10, 0xff3b5c, 2); }
  };

  // ---------- big ground map: paths, lakes, lava, mosaics (one picture over the whole field) ----------
  var MAP_W = 28, MAP_D = 30, MAP_Z = -6, MS = 1024;
  function mapXY(x, z) { return [(x / MAP_W + 0.5) * MS, ((z - MAP_Z) / MAP_D + 0.5) * MS]; }
  function softBlob(g, x, z, r, col, a) { var p = mapXY(x, z), rp = r / MAP_W * MS, gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], rp); gr.addColorStop(0, css(col, a)); gr.addColorStop(1, css(col, 0)); g.fillStyle = gr; g.fillRect(p[0] - rp, p[1] - rp, rp * 2, rp * 2); }
  function pathLine(g, pts, w, col, edge) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    function run() { g.beginPath(); pts.forEach(function (q, i) { var p = mapXY(q[0], q[1]); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); }
    if (edge !== undefined) { g.strokeStyle = css(edge, 0.55); g.lineWidth = (w + 0.35) / MAP_W * MS; run(); }
    g.strokeStyle = css(col, 0.85); g.lineWidth = w / MAP_W * MS; run();
  }
  function water(g, cx, cz, rx, rz, deep, light, R) {
    var p = mapXY(cx, cz), sx = rx / MAP_W * MS, sz = rz / MAP_D * MS;
    g.save(); g.translate(p[0], p[1]);
    g.fillStyle = css(shade(light, -0.35), 0.9); g.beginPath(); g.ellipse(0, 6, sx * 1.04, sz * 1.06, 0, 0, 6.3); g.fill();
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(sx, sz)); gr.addColorStop(0, css(deep)); gr.addColorStop(1, css(light)); g.fillStyle = gr;
    g.beginPath(); g.ellipse(0, 0, sx, sz, 0, 0, 6.3); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3;
    for (var i = 0; i < 26; i++) { var x = (R() - 0.5) * sx * 1.5, y = (R() - 0.5) * sz * 1.5, l = 20 + R() * 40; if ((x * x) / (sx * sx) + (y * y) / (sz * sz) > 0.7) continue; g.beginPath(); g.moveTo(x - l / 2, y); g.quadraticCurveTo(x, y - 4, x + l / 2, y); g.stroke(); }
    g.restore();
  }
  var MAPS = {
    flowers: function (g, R, P) { pathLine(g, [[-14, 6], [-6, 3.5], [-2, 0.8], [0, -1], [3, -4], [5, -9], [9, -20]], 2.2, 0xd8c08a, 0xb89a62); for (var i = 0; i < 26; i++) softBlob(g, (R() - 0.5) * 26, MAP_Z + (R() - 0.5) * 28, 1.2 + R() * 1.8, [0xff9fc8, 0xfff27a, 0xffffff][i % 3], 0.35); softBlob(g, 0, -0.4, 4.5, 0xe8f0a0, 0.25); },
    mushrooms: function (g, R, P) { for (var i = 0; i < 18; i++) softBlob(g, (R() - 0.5) * 26, MAP_Z + (R() - 0.5) * 28, 1.5 + R() * 2.5, i % 2 ? 0x1a3a1c : 0x6aaa5a, 0.4); water(g, -6, -9, 2.4, 1.4, 0x2a6a5a, 0x5aa58a, R); water(g, 7, 1.5, 1.4, 0.9, 0x2a6a5a, 0x5aa58a, R); for (var j = 0; j < 20; j++) softBlob(g, (R() - 0.5) * 24, MAP_Z + (R() - 0.5) * 26, 0.6, 0x9fffd0, 0.25); },
    sand: function (g, R, P) { for (var i = 0; i < 14; i++) softBlob(g, (R() - 0.5) * 26, MAP_Z + (R() - 0.5) * 28, 3 + R() * 3, i % 2 ? 0xc89a50 : 0xfff0c0, 0.35); water(g, -6.5, -10, 2.6, 1.5, 0x2a8aa8, 0x6ad0d8, R); softBlob(g, -6.5, -10, 4.2, 0x6ac06a, 0.45); },
    ice: function (g, R, P) { for (var i = 0; i < 10; i++) { var x = (R() - 0.5) * 24, z = MAP_Z + (R() - 0.5) * 26; if (Math.abs(x) < 3 && z > -5 && z < 4) continue; water(g, x, z, 1 + R() * 1.6, 0.6 + R() * 0.8, 0x8ac8f0, 0xd8f4ff, R); } softBlob(g, 0, -0.5, 5, 0xffffff, 0.3); },
    lava: function (g, R, P) { var riv = [[-14, -2], [-9, -4], [-6, -9], [-7, -14], [-4, -22]]; pathLine(g, riv, 1.8, 0xff7a1a, 0x3a0a04); pathLine(g, riv, 0.7, 0xffe080); var riv2 = [[14, 3], [9, 0.5], [6.5, -6], [9, -13], [8, -22]]; pathLine(g, riv2, 1.4, 0xff6a1a, 0x3a0a04); pathLine(g, riv2, 0.5, 0xffd060); for (var i = 0; i < 16; i++) softBlob(g, (R() - 0.5) * 26, MAP_Z + (R() - 0.5) * 28, 1 + R() * 2, 0xff4a10, 0.22); },
    lake: function (g, R, P) { water(g, 0, -12.5, 9, 4.2, 0x14286a, 0x3a6ac0, R); for (var i = 0; i < 30; i++) { var p = mapXY((R() - 0.5) * 16, -12.5 + (R() - 0.5) * 7); g.fillStyle = 'rgba(255,255,220,' + (0.3 + R() * 0.6) + ')'; g.fillRect(p[0], p[1], 2, 2); } softBlob(g, 0, -12.5, 6, 0x9fd8ff, 0.18); for (var j = 0; j < 14; j++) softBlob(g, (R() - 0.5) * 24, MAP_Z + (R() - 0.5) * 20, 0.8 + R(), 0x9fe8ff, 0.18); },
    garden: function (g, R, P) { pathLine(g, [[0, 8], [0, -24]], 2.2, 0xa8a8c0, 0x6a6a88); pathLine(g, [[-14, -0.5], [14, -0.5]], 2.2, 0xa8a8c0, 0x6a6a88); var c = mapXY(0, -0.5); g.fillStyle = css(0xb8b8d0); g.beginPath(); g.arc(c[0], c[1], 2.4 / MAP_W * MS, 0, 6.3); g.fill(); g.strokeStyle = css(0x6a6a88); g.lineWidth = 6; g.stroke(); for (var i = 0; i < 16; i++) softBlob(g, (R() - 0.5) * 24, MAP_Z + (R() - 0.5) * 26, 1 + R() * 1.4, 0xffffff, 0.3); },
    temple: function (g, R, P) { var c = mapXY(0, -0.4), rr = 3.6 / MAP_W * MS; for (var k = 0; k < 3; k++) { g.strokeStyle = css(k % 2 ? 0xffe14a : 0xc89a3a, 0.75); g.lineWidth = 8; g.beginPath(); g.arc(c[0], c[1], rr * (1 - k * 0.28), 0, 6.3); g.stroke(); } for (var s = 0; s < 12; s++) { var a = s / 12 * 6.28; g.strokeStyle = 'rgba(255,225,74,0.6)'; g.lineWidth = 5; g.beginPath(); g.moveTo(c[0] + Math.cos(a) * rr * 0.35, c[1] + Math.sin(a) * rr * 0.35); g.lineTo(c[0] + Math.cos(a) * rr * 1.3, c[1] + Math.sin(a) * rr * 1.3); g.stroke(); } softBlob(g, 0, -0.4, 4, 0xfff2a0, 0.3); },
    galaxy: function (g, R, P) { for (var i = 0; i < 14; i++) softBlob(g, (R() - 0.5) * 26, MAP_Z + (R() - 0.5) * 28, 2 + R() * 3, [0x7a3aff, 0x3a6aff, 0xff4ad8][i % 3], 0.28); softBlob(g, 0, -0.4, 4, 0xb58cff, 0.22); },
    castle: function (g, R, P) { var c = mapXY(0, -0.4), rr = 3.4 / MAP_W * MS; g.strokeStyle = 'rgba(255,40,70,0.55)'; g.lineWidth = 6; g.beginPath(); g.arc(c[0], c[1], rr, 0, 6.3); g.stroke(); g.beginPath(); for (var k = 0; k <= 5; k++) { var a = -Math.PI / 2 + k * 4 * Math.PI / 5; if (k) g.lineTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr); else g.moveTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr); } g.stroke(); softBlob(g, 0, -0.4, 4.5, 0xff1a3a, 0.16); for (var i = 0; i < 16; i++) softBlob(g, (R() - 0.5) * 26, MAP_Z + (R() - 0.5) * 28, 1.5 + R() * 2, 0x000000, 0.3); }
  };

  // ---------- props (painted sprites, 256px, dark outline like the characters) ----------
  var OUT = '#3a2430';
  function stroke(g, w) { g.lineWidth = w || 7; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke(); }
  function blob(g, x, y, r, col) { g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fillStyle = css(col); g.fill(); }
  var PROPS = {
    tree: function (g, P) { g.beginPath(); g.moveTo(112, 250); g.lineTo(118, 150); g.lineTo(138, 150); g.lineTo(146, 250); g.closePath(); g.fillStyle = css(0x8a5a3a); g.fill(); stroke(g, 6);
      var cs = [[128, 95, 70], [80, 125, 46], [176, 125, 46], [100, 70, 44], [158, 72, 44]]; g.beginPath(); cs.forEach(function (c) { g.moveTo(c[0] + c[2], c[1]); g.arc(c[0], c[1], c[2], 0, 6.3); }); g.fillStyle = css(P.leaf); g.fill(); stroke(g, 7);
      cs.forEach(function (c) { blob(g, c[0] - c[2] * 0.2, c[1] - c[2] * 0.25, c[2] * 0.62, shade(P.leaf, 0.18)); }); blob(g, 112, 60, 14, shade(P.leaf, 0.4)); if (P.fruit) for (var i = 0; i < 6; i++) blob(g, 70 + i * 22, 100 + (i % 2) * 30, 7, P.fruit); },
    pine: function (g, P) { g.fillStyle = css(0x6a4a30); g.fillRect(118, 200, 20, 52); g.strokeStyle = OUT; g.lineWidth = 5; g.strokeRect(118, 200, 20, 52);
      for (var k = 0; k < 4; k++) { var y = 40 + k * 42, w = 40 + k * 22; g.beginPath(); g.moveTo(128, y - 30); g.lineTo(128 + w, y + 40); g.lineTo(128 - w, y + 40); g.closePath(); g.fillStyle = css(shade(P.leaf, -k * 0.05)); g.fill(); stroke(g, 6); if (P.snow) { g.beginPath(); g.moveTo(128, y - 30); g.lineTo(128 + w * 0.45, y + 2); g.lineTo(128 - w * 0.45, y + 2); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); } } },
    bush: function (g, P) { var cs = [[128, 170, 60], [80, 190, 42], [176, 190, 42]]; g.beginPath(); cs.forEach(function (c) { g.moveTo(c[0] + c[2], c[1]); g.arc(c[0], c[1], c[2], 0, 6.3); }); g.fillStyle = css(P.leaf); g.fill(); stroke(g, 6);
      cs.forEach(function (c) { blob(g, c[0] - 10, c[1] - 14, c[2] * 0.55, shade(P.leaf, 0.16)); }); if (P.fruit) for (var i = 0; i < 7; i++) { blob(g, 70 + i * 19, 160 + (i % 3) * 18, 8, P.fruit); blob(g, 68 + i * 19, 157 + (i % 3) * 18, 3, 0xffffff); } },
    mushroom: function (g, P) { g.beginPath(); g.moveTo(100, 250); g.quadraticCurveTo(96, 170, 110, 140); g.lineTo(146, 140); g.quadraticCurveTo(160, 170, 156, 250); g.closePath(); g.fillStyle = '#fff0d8'; g.fill(); stroke(g, 6);
      g.beginPath(); g.moveTo(24, 150); g.quadraticCurveTo(30, 40, 128, 36); g.quadraticCurveTo(226, 40, 232, 150); g.quadraticCurveTo(128, 170, 24, 150); g.closePath(); g.fillStyle = css(P.cap); g.fill(); stroke(g, 7);
      blob(g, 95, 90, 16, 0xffffff); blob(g, 160, 75, 12, 0xffffff); blob(g, 185, 120, 10, 0xffffff); blob(g, 60, 125, 9, 0xffffff); g.beginPath(); g.ellipse(100, 70, 40, 16, -0.4, 0, 6.3); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fill(); },
    cactus: function (g, P) { function arm(x, y, w, h) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, w / 2) : g.rect(x, y, w, h); g.fillStyle = css(0x5cae5c); g.fill(); stroke(g, 6); }
      arm(100, 40, 56, 212); arm(46, 100, 40, 80); arm(170, 80, 40, 90); g.fillStyle = css(0x5cae5c); g.fillRect(80, 160, 26, 22); g.fillRect(150, 150, 26, 22); g.strokeStyle = 'rgba(30,70,30,0.5)'; g.lineWidth = 3; for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(115 + i * 13, 50); g.lineTo(115 + i * 13, 245); g.stroke(); } blob(g, 128, 40, 12, 0xff7aa8); },
    rock: function (g, P) { g.beginPath(); g.moveTo(30, 240); g.lineTo(46, 150); g.lineTo(96, 96); g.lineTo(160, 88); g.lineTo(214, 140); g.lineTo(230, 240); g.closePath(); g.fillStyle = css(P.rock); g.fill(); stroke(g, 7);
      g.beginPath(); g.moveTo(60, 160); g.lineTo(100, 110); g.lineTo(150, 104); g.lineTo(120, 160); g.closePath(); g.fillStyle = css(shade(P.rock, 0.22)); g.fill(); g.beginPath(); g.moveTo(170, 150); g.lineTo(212, 230); g.lineTo(150, 236); g.closePath(); g.fillStyle = css(shade(P.rock, -0.18)); g.fill(); if (P.moss) blob(g, 120, 100, 22, P.moss); },
    crystal: function (g, P) { [[128, 30, 40, 0], [78, 90, 30, -0.35], [182, 96, 28, 0.38]].forEach(function (c) { g.save(); g.translate(c[0], 250); g.rotate(c[3]); var h = 250 - c[1]; g.beginPath(); g.moveTo(0, -h); g.lineTo(c[2], -h + 40); g.lineTo(c[2] * 0.8, 0); g.lineTo(-c[2] * 0.8, 0); g.lineTo(-c[2], -h + 40); g.closePath(); g.fillStyle = css(P.gem); g.fill(); stroke(g, 6); g.beginPath(); g.moveTo(0, -h); g.lineTo(c[2] * 0.3, -h + 40); g.lineTo(c[2] * 0.2, 0); g.lineTo(-c[2] * 0.5, 0); g.closePath(); g.fillStyle = css(shade(P.gem, 0.4), 0.8); g.fill(); g.restore(); }); },
    deadTree: function (g, P) { g.strokeStyle = OUT; g.lineCap = 'round'; function br(x, y, a, l, w) { if (w < 3) return; var x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; g.lineWidth = w + 6; g.strokeStyle = OUT; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); g.lineWidth = w; g.strokeStyle = css(P.bark); g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, a - 0.5, l * 0.7, w * 0.62); br(x2, y2, a + 0.45, l * 0.65, w * 0.6); } br(128, 252, -Math.PI / 2, 80, 26); },
    lantern: function (g, P) { g.fillStyle = css(0x4a4a5a); g.fillRect(120, 90, 16, 160); g.strokeStyle = OUT; g.lineWidth = 5; g.strokeRect(120, 90, 16, 160); var gr = g.createRadialGradient(128, 70, 4, 128, 70, 70); gr.addColorStop(0, css(P.glow, 0.85)); gr.addColorStop(1, css(P.glow, 0)); g.fillStyle = gr; g.fillRect(58, 0, 140, 140); g.beginPath(); g.rect(100, 46, 56, 50); g.fillStyle = css(shade(P.glow, 0.4)); g.fill(); stroke(g, 6); g.beginPath(); g.moveTo(92, 48); g.lineTo(128, 24); g.lineTo(164, 48); g.closePath(); g.fillStyle = css(0x3a3a4a); g.fill(); stroke(g, 5); },
    torch: function (g, P) { g.fillStyle = css(0x3a2a2a); g.fillRect(118, 110, 20, 142); g.strokeStyle = OUT; g.lineWidth = 5; g.strokeRect(118, 110, 20, 142); g.beginPath(); g.moveTo(100, 110); g.lineTo(156, 110); g.lineTo(144, 132); g.lineTo(112, 132); g.closePath(); g.fillStyle = css(0x5a4a4a); g.fill(); stroke(g, 5); var gr = g.createRadialGradient(128, 80, 4, 128, 80, 80); gr.addColorStop(0, css(P.glow, 0.8)); gr.addColorStop(1, css(P.glow, 0)); g.fillStyle = gr; g.fillRect(48, 0, 160, 160);
      g.beginPath(); g.moveTo(128, 30); g.quadraticCurveTo(160, 80, 140, 108); g.lineTo(116, 108); g.quadraticCurveTo(96, 80, 128, 30); g.fillStyle = css(P.glow); g.fill(); g.beginPath(); g.moveTo(128, 60); g.quadraticCurveTo(144, 90, 134, 106); g.lineTo(122, 106); g.quadraticCurveTo(112, 90, 128, 60); g.fillStyle = '#fff2a0'; g.fill(); },
    column: function (g, P) { g.fillStyle = css(P.stone); g.fillRect(92, 50, 72, 186); g.strokeStyle = OUT; g.lineWidth = 6; g.strokeRect(92, 50, 72, 186); for (var i = 0; i < 4; i++) { g.fillStyle = css(shade(P.stone, -0.15)); g.fillRect(100 + i * 17, 56, 6, 176); } g.beginPath(); g.rect(76, 26, 104, 28); g.rect(76, 232, 104, 22); g.fillStyle = css(shade(P.stone, 0.15)); g.fill(); stroke(g, 6); blob(g, 128, 40, 8, 0xffe14a); },
    palm: function (g, P) { g.strokeStyle = OUT; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.moveTo(140, 252); g.quadraticCurveTo(110, 160, 132, 80); g.stroke(); g.strokeStyle = css(0x9a6a3a); g.lineWidth = 18; g.stroke();
      for (var i = 0; i < 6; i++) { var a = -Math.PI / 2 + (i - 2.5) * 0.55; g.beginPath(); g.moveTo(132, 80); g.quadraticCurveTo(132 + Math.cos(a) * 60, 80 + Math.sin(a) * 50, 132 + Math.cos(a) * 110, 100 + Math.sin(a) * 40 + 40); g.lineWidth = 22; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 15; g.strokeStyle = css(P.leaf); g.stroke(); } blob(g, 126, 92, 10, 0x7a4a2a); blob(g, 142, 96, 10, 0x7a4a2a); },
    reeds: function (g, P) { g.lineCap = 'round'; for (var i = 0; i < 8; i++) { var x = 60 + i * 18, h = 120 + (i % 3) * 40, b = (i - 4) * 6; g.strokeStyle = OUT; g.lineWidth = 9; g.beginPath(); g.moveTo(x, 252); g.quadraticCurveTo(x + b, 252 - h / 2, x + b * 2, 252 - h); g.stroke(); g.strokeStyle = css(P.leaf); g.lineWidth = 5; g.stroke(); if (i % 2) { g.save(); g.translate(x + b * 2, 252 - h); g.beginPath(); g.ellipse(0, 12, 7, 18, 0, 0, 6.3); g.fillStyle = css(0x7a5a3a); g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); g.restore(); } } if (P.glow) { var gr = g.createRadialGradient(128, 200, 2, 128, 200, 30); gr.addColorStop(0, css(P.glow, 0.9)); gr.addColorStop(1, css(P.glow, 0)); g.fillStyle = gr; g.fillRect(90, 160, 80, 80); } },
    topiary: function (g, P) { g.fillStyle = css(0x8a6a4a); g.fillRect(118, 190, 20, 40); g.beginPath(); g.rect(86, 226, 84, 28); g.fillStyle = css(0x9a8aa8); g.fill(); stroke(g, 6); g.beginPath(); g.arc(128, 120, 74, 0, 6.3); g.fillStyle = css(P.leaf); g.fill(); stroke(g, 7); blob(g, 104, 96, 36, shade(P.leaf, 0.16)); for (var i = 0; i < 6; i++) blob(g, 80 + i * 20, 90 + (i % 2) * 50, 7, 0xffffff); },
    grave: function (g, P) { g.beginPath(); g.moveTo(70, 252); g.lineTo(70, 110); g.quadraticCurveTo(70, 50, 128, 50); g.quadraticCurveTo(186, 50, 186, 110); g.lineTo(186, 252); g.closePath(); g.fillStyle = css(0x6a6478); g.fill(); stroke(g, 7); g.fillStyle = css(0x4a4458); g.fillRect(118, 90, 20, 90); g.fillRect(92, 116, 72, 18); blob(g, 100, 80, 14, 0x8a84a0); },
    fence: function (g, P) { g.fillStyle = css(0x2a2030); g.fillRect(10, 150, 236, 18); g.fillRect(10, 200, 236, 14); for (var i = 0; i < 6; i++) { var x = 22 + i * 42; g.beginPath(); g.moveTo(x, 252); g.lineTo(x, 110); g.lineTo(x + 8, 80); g.lineTo(x + 16, 110); g.lineTo(x + 16, 252); g.closePath(); g.fillStyle = css(0x3a3048); g.fill(); stroke(g, 5); } },
    floatRock: function (g, P) { g.beginPath(); g.moveTo(40, 120); g.lineTo(80, 80); g.lineTo(176, 76); g.lineTo(220, 116); g.lineTo(150, 230); g.lineTo(110, 230); g.closePath(); g.fillStyle = css(0x4a3f7a); g.fill(); stroke(g, 7); g.beginPath(); g.moveTo(40, 120); g.lineTo(80, 80); g.lineTo(176, 76); g.lineTo(220, 116); g.closePath(); g.fillStyle = css(0x6a5aa8); g.fill(); stroke(g, 5);
      [[100, 80, 20], [150, 70, 26], [124, 60, 14]].forEach(function (c) { g.beginPath(); g.moveTo(c[0], c[1] - c[2] * 2.4); g.lineTo(c[0] + c[2] * 0.6, c[1]); g.lineTo(c[0] - c[2] * 0.6, c[1]); g.closePath(); g.fillStyle = css(P.gem); g.fill(); stroke(g, 4); }); },
    vent: function (g, P) { g.beginPath(); g.moveTo(40, 252); g.lineTo(84, 150); g.lineTo(172, 150); g.lineTo(216, 252); g.closePath(); g.fillStyle = css(0x2a1512); g.fill(); stroke(g, 7); g.beginPath(); g.ellipse(128, 152, 46, 14, 0, 0, 6.3); g.fillStyle = css(0xff7a1a); g.fill(); stroke(g, 5); var gr = g.createRadialGradient(128, 120, 4, 128, 120, 90); gr.addColorStop(0, 'rgba(255,140,40,0.6)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.fillRect(30, 20, 196, 200); },
    urn: function (g, P) { g.beginPath(); g.moveTo(96, 252); g.quadraticCurveTo(50, 180, 92, 110); g.lineTo(80, 80); g.lineTo(176, 80); g.lineTo(164, 110); g.quadraticCurveTo(206, 180, 160, 252); g.closePath(); g.fillStyle = css(0xe0b04a); g.fill(); stroke(g, 7); g.fillStyle = css(0xb07a2a); g.fillRect(78, 150, 100, 14); blob(g, 104, 130, 16, 0xfff2b0); }
  };
  var spriteCache = {};
  function propTex(kind, P, key) {
    var k = kind + ':' + key; if (spriteCache[k]) return spriteCache[k];
    var c = cvs(256, 256), g = c.getContext('2d'); PROPS[kind](g, P);
    return (spriteCache[k] = texOf(c));
  }

  // ---------- region recipes ----------
  var REGIONS = [
    { ground: 'grass', map: 'flowers', P: { g0: 0x7cc75a, g1: 0x5fae48, g2: 0x9ad870, leaf: 0x5fbf4a, fruit: 0xff7f9f, rock: 0xb8b0a0, moss: 0x7cc75a, glow: 0xfff2b0 }, props: ['tree', 'tree', 'bush', 'bush', 'rock'], amb: 'petals', fogK: 0.25 },
    { ground: 'moss', map: 'mushrooms', P: { g0: 0x4f8a4a, g1: 0x3a6e3a, g2: 0x6aa85a, leaf: 0x2f6e3a, cap: 0xe8544e, rock: 0x6a7a62, moss: 0x5aa04a }, props: ['mushroom', 'mushroom', 'pine', 'bush', 'rock'], alt: { mushroom: { cap: 0x6a8aff } }, amb: 'spores', fogK: 0.35 },
    { ground: 'sand', map: 'sand', P: { g0: 0xe8c27a, g1: 0xd4a85a, g2: 0xf6dc9a, leaf: 0x4fa84a, rock: 0xc8925a }, props: ['cactus', 'cactus', 'rock', 'palm'], amb: 'sand', fogK: 0.3 },
    { ground: 'snow', map: 'ice', P: { g0: 0xeef6ff, g1: 0xcfe2f8, g2: 0xb8d4f0, leaf: 0x3a7a6a, snow: 1, gem: 0x9fd8ff, rock: 0x9fb8d8 }, props: ['pine', 'pine', 'crystal', 'rock'], amb: 'snow', fogK: 0.25 },
    { ground: 'basalt', map: 'lava', P: { g0: 0x3a2420, g1: 0x2a1814, g2: 0x4a2a20, rock: 0x3a2018, bark: 0x2a1a14, glow: 0xff7a1a }, props: ['rock', 'deadTree', 'vent', 'rock'], amb: 'embers', fogK: 0.2 },
    { ground: 'night', map: 'lake', P: { g0: 0x2a4a5a, g1: 0x1f3a48, g2: 0x3a6a6a, leaf: 0x3a8a6a, rock: 0x4a5a7a, glow: 0x9fe8ff }, props: ['reeds', 'reeds', 'rock', 'bush'], amb: 'fireflies', fogK: 0.3 },
    { ground: 'garden', map: 'garden', P: { g0: 0x3f6a54, g1: 0x2f5444, g2: 0x5a8a6a, leaf: 0x2f7a5a, glow: 0xfff2b0, rock: 0x8a8aa8 }, props: ['lantern', 'topiary', 'topiary', 'bush'], amb: 'motes', fogK: 0.3 },
    { ground: 'temple', map: 'temple', P: { g0: 0xe8c890, g1: 0xf4dca8, g2: 0xa8824a, stone: 0xf0dca0, leaf: 0x4fa84a }, props: ['column', 'column', 'palm', 'urn'], amb: 'gold', fogK: 0.25 },
    { ground: 'space', map: 'galaxy', P: { g0: 0x1a1640, g1: 0x2a2060, g2: 0x120f2a, gem: 0xb58cff, rock: 0x4a3f7a }, props: ['floatRock', 'crystal', 'floatRock'], alt: { crystal: { gem: 0x8affff } }, amb: 'stars', fogK: 0.2 },
    { ground: 'castle', map: 'castle', P: { g0: 0x2a2038, g1: 0x3a2e4a, g2: 0x1a1428, bark: 0x2a2030, glow: 0xff5a3a }, props: ['deadTree', 'torch', 'grave', 'fence'], amb: 'ash', fogK: 0.2 }
  ];

  // ---------- drifting particles ----------
  var AMB = {
    petals: { col: [0xff9fc8, 0xffd0e8, 0xffffff], n: 46, size: 0.16, vy: -0.25, drift: 0.6, shape: 'petal', y0: 0.2, y1: 4 },
    spores: { col: [0x9fffd0, 0xd0ffe8], n: 56, size: 0.12, vy: 0.25, drift: 0.25, shape: 'dot', glow: 1, y0: 0, y1: 3 },
    sand: { col: [0xffe0a0, 0xfff0d0], n: 50, size: 0.09, vy: 0, drift: 2.2, shape: 'dot', y0: 0, y1: 1.5 },
    snow: { col: [0xffffff, 0xd8f0ff], n: 70, size: 0.13, vy: -0.6, drift: 0.4, shape: 'flake', y0: 0, y1: 6 },
    embers: { col: [0xffb030, 0xff6a1a, 0xffe080], n: 56, size: 0.11, vy: 0.8, drift: 0.3, shape: 'dot', glow: 1, y0: 0, y1: 5 },
    fireflies: { col: [0xd8ff8a, 0x9fe8ff], n: 40, size: 0.14, vy: 0.05, drift: 0.4, shape: 'dot', glow: 1, blink: 1, y0: 0.2, y1: 2.5 },
    motes: { col: [0xffffff, 0xe6e6ff], n: 46, size: 0.12, vy: 0.15, drift: 0.3, shape: 'dot', glow: 1, y0: 0, y1: 3.5 },
    gold: { col: [0xffe14a, 0xfff2b0], n: 50, size: 0.11, vy: 0.2, drift: 0.25, shape: 'star', glow: 1, y0: 0, y1: 3.5 },
    stars: { col: [0xffffff, 0xd8c8ff, 0x9fd8ff], n: 60, size: 0.13, vy: 0.05, drift: 0.12, shape: 'star', glow: 1, blink: 1, y0: 0, y1: 4 },
    ash: { col: [0xff5a3a, 0x8a7a8a, 0x5a4a5a], n: 56, size: 0.1, vy: 0.35, drift: 0.5, shape: 'dot', y0: 0, y1: 4 }
  };
  function shapeTex(shape) {
    var c = cvs(64, 64), g = c.getContext('2d');
    if (shape === 'petal') { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(32, 32, 26, 14, 0.5, 0, 6.3); g.fill(); }
    else if (shape === 'flake') { g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; for (var i = 0; i < 3; i++) { var a = i * Math.PI / 3; g.beginPath(); g.moveTo(32 - Math.cos(a) * 26, 32 - Math.sin(a) * 26); g.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26); g.stroke(); } }
    else if (shape === 'star') { var gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(30, 4, 4, 56); g.fillRect(4, 30, 56, 4); }
    else { var gd = g.createRadialGradient(32, 32, 0, 32, 32, 30); gd.addColorStop(0, 'rgba(255,255,255,1)'); gd.addColorStop(0.4, 'rgba(255,255,255,0.7)'); gd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gd; g.fillRect(0, 0, 64, 64); }
    return texOf(c);
  }
  var AMB_VS = 'attribute float aSize; attribute vec3 aCol; attribute float aPh; uniform float uTime; uniform float uScale; uniform float uBlink; varying vec3 vCol; varying float vA; varying float vRot;' +
    'void main(){ vCol = aCol; vRot = aPh * 6.28 + uTime * (0.5 + fract(aPh * 7.0)); vA = uBlink > 0.5 ? 0.35 + 0.65 * max(0.0, sin(uTime * 2.0 + aPh * 40.0)) : 1.0;' +
    ' vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }';
  var AMB_FS = 'uniform sampler2D map; varying vec3 vCol; varying float vA; varying float vRot;' +
    'void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); p = vec2(p.x * c - p.y * s, p.x * s + p.y * c) + 0.5; vec4 t = texture2D(map, p); if (t.a < 0.02) discard; gl_FragColor = vec4(vCol * t.rgb, t.a * vA); }';

  // sway shader for props: the top moves, the base stays
  var PROP_VS = 'uniform float uTime; uniform float uSway; uniform float uSeed; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; float k = uv.y * uv.y; p.x += sin(uTime * 1.4 + uSeed) * uSway * k; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }';
  var PROP_FS = 'uniform sampler2D map; uniform vec3 uFog; uniform float uFogK; varying vec2 vUv; void main(){ vec4 t = texture2D(map, vUv); if (t.a < 0.08) discard; gl_FragColor = vec4(mix(t.rgb, uFog, uFogK), t.a); }';

  function createWorld(scene, opts) {
    var group = new T.Group(); scene.add(group);
    var time = 0, sway = [], amb = null, ambSpec = null, ambVel = null, built = -1;
    var tilt = opts.tilt || 0.6, halfX = opts.halfX, field = opts.field;
    function disposeAll() {
      while (group.children.length) { var o = group.children.pop(); o.traverse(function (x) { if (x.geometry) x.geometry.dispose(); if (x.material) { if (x.material.map && !x.material.map._cached) x.material.map.dispose(); if (x.material.uniforms && x.material.uniforms.map && !x.material.uniforms.map.value._cached) x.material.uniforms.map.value.dispose(); x.material.dispose(); } }); }
      sway.length = 0; amb = null;
    }
    function build(r, regionData, quality) {
      disposeAll(); built = r;
      var spec = REGIONS[r % REGIONS.length], P = spec.P, R = rng(97 + r * 131), low = quality === 'low';
      var sky = new T.Color(regionData.sky), fogCol = new T.Color(P.g0).lerp(sky, 0.35);
      scene.background = fogCol.clone().lerp(new T.Color(0x000000), 0.15); scene.fog = new T.Fog(fogCol, 30, 62);
      // ground tile
      var tc = cvs(TS, TS), tg = tc.getContext('2d'); GROUNDS[spec.ground](tg, R, P);
      var tile = texOf(tc, true); tile.repeat.set(70 / 3.6, 70 / 3.6);
      var ground = new T.Mesh(new T.PlaneGeometry(70, 70), new T.MeshBasicMaterial({ map: tile }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.01, -14); ground.renderOrder = 0; group.add(ground);
      // big ground map
      var mc = cvs(MS, MS), mg = mc.getContext('2d');
      var vg = mg.createRadialGradient(MS / 2, MS * 0.7, MS * 0.1, MS / 2, MS * 0.6, MS * 0.75); vg.addColorStop(0, 'rgba(255,255,255,0.12)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)'); mg.fillStyle = vg; mg.fillRect(0, 0, MS, MS);
      MAPS[spec.map](mg, R, P);
      var overlay = new T.Mesh(new T.PlaneGeometry(MAP_W, MAP_D), new T.MeshBasicMaterial({ map: texOf(mc), transparent: true, depthWrite: false }));
      overlay.rotation.x = -Math.PI / 2; overlay.position.set(0, 0.005, MAP_Z); overlay.renderOrder = 0; group.add(overlay);
      // props around the arena: sides, the far side and the near corners
      var n = low ? 16 : 30, tries = 0, placed = [];
      while (placed.length < n && tries++ < 600) {
        var z = -16 + R() * 21, x = (R() - 0.5) * 20, inArena = z > field.z0 - 1.2 && z < field.z1 + 0.8 && Math.abs(x) < halfX(z) + 0.6;
        if (inArena) continue;
        if (placed.some(function (p) { return Math.abs(p.x - x) < 1.3 && Math.abs(p.z - z) < 1.0; })) continue;
        placed.push({ x: x, z: z });
      }
      placed.forEach(function (p, i) {
        var kind = spec.props[i % spec.props.length], alt = spec.alt && spec.alt[kind] && R() < 0.5, PP = alt ? Object.assign({}, P, spec.alt[kind]) : P;
        var tex = propTex(kind, PP, r + (alt ? 'b' : 'a')); tex._cached = true;
        var big = { tree: 2.6, pine: 2.8, mushroom: 2.0, palm: 2.8, column: 2.6, deadTree: 2.6, lantern: 1.9, torch: 1.9, topiary: 1.8, cactus: 2.0, crystal: 1.8, floatRock: 1.9, fence: 1.6, grave: 1.3, rock: 1.3, bush: 1.4, reeds: 1.6, vent: 1.4, urn: 1.2 }[kind] || 1.6;
        var h = big * (0.75 + R() * 0.5) * (p.z < -8 ? 1.25 : 1), w = h;
        var mat = new T.ShaderMaterial({ uniforms: { map: { value: tex }, uTime: { value: 0 }, uSway: { value: /tree|pine|palm|reeds|bush|topiary|mushroom/.test(kind) ? w * 0.04 : 0 }, uSeed: { value: R() * 6 }, uFog: { value: fogCol }, uFogK: { value: p.z < -8 ? spec.fogK : 0 } },
          vertexShader: PROP_VS, fragmentShader: PROP_FS, transparent: true, depthWrite: true });
        var geo = new T.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
        var m = new T.Mesh(geo, mat); m.position.set(p.x, kind === 'floatRock' ? 0.4 + R() * 0.6 : 0, p.z); m.rotation.x = -tilt; m.renderOrder = 2;
        if (R() < 0.5) m.scale.x = -1;
        var sh = new T.Mesh(new T.CircleGeometry(w * 0.34, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
        sh.rotation.x = -Math.PI / 2; sh.position.set(p.x, 0.012, p.z); sh.renderOrder = 1; group.add(sh);
        group.add(m); sway.push(mat);
      });
      // drifting particles
      ambSpec = AMB[spec.amb];
      var N = Math.round(ambSpec.n * (low ? 0.5 : 1)), pos = new Float32Array(N * 3), size = new Float32Array(N), col = new Float32Array(N * 3), ph = new Float32Array(N);
      ambVel = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) {
        pos[i * 3] = (R() - 0.5) * 9; pos[i * 3 + 1] = ambSpec.y0 + R() * (ambSpec.y1 - ambSpec.y0); pos[i * 3 + 2] = -9 + R() * 13;
        size[i] = ambSpec.size * (0.6 + R() * 0.8); var cc = new T.Color(ambSpec.col[i % ambSpec.col.length]); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; ph[i] = R();
        ambVel[i * 3] = (R() - 0.3) * ambSpec.drift; ambVel[i * 3 + 1] = ambSpec.vy * (0.6 + R() * 0.8); ambVel[i * 3 + 2] = (R() - 0.5) * ambSpec.drift * 0.4;
      }
      var geo2 = new T.BufferGeometry(); geo2.setAttribute('position', new T.BufferAttribute(pos, 3)); geo2.setAttribute('aSize', new T.BufferAttribute(size, 1)); geo2.setAttribute('aCol', new T.BufferAttribute(col, 3)); geo2.setAttribute('aPh', new T.BufferAttribute(ph, 1));
      var am = new T.ShaderMaterial({ uniforms: { map: { value: shapeTex(ambSpec.shape) }, uTime: { value: 0 }, uScale: { value: 900 }, uBlink: { value: ambSpec.blink ? 1 : 0 } }, vertexShader: AMB_VS, fragmentShader: AMB_FS, transparent: true, depthWrite: false, blending: ambSpec.glow ? T.AdditiveBlending : T.NormalBlending });
      amb = new T.Points(geo2, am); amb.frustumCulled = false; amb.renderOrder = 6; group.add(amb);
    }
    function update(dt, viewH) {
      time += dt;
      for (var i = 0; i < sway.length; i++) sway[i].uniforms.uTime.value = time;
      if (!amb) return;
      amb.material.uniforms.uTime.value = time; if (viewH) amb.material.uniforms.uScale.value = viewH * 1.1;
      var p = amb.geometry.attributes.position.array, n = p.length / 3, s = ambSpec;
      for (var k = 0; k < n; k++) {
        var o = k * 3;
        p[o] += (ambVel[o] + Math.sin(time * 0.9 + k) * s.drift * 0.3) * dt; p[o + 1] += ambVel[o + 1] * dt; p[o + 2] += ambVel[o + 2] * dt;
        if (p[o + 1] > s.y1) p[o + 1] = s.y0; if (p[o + 1] < s.y0 - 0.05) p[o + 1] = s.y1;
        if (p[o] > 4.5) p[o] = -4.5; if (p[o] < -4.5) p[o] = 4.5; if (p[o + 2] > 4) p[o + 2] = -9; if (p[o + 2] < -9) p[o + 2] = 4;
      }
      amb.geometry.attributes.position.needsUpdate = true;
    }
    return { build: build, update: update, region: function () { return built; } };
  }
  CW.createWorld = createWorld;
})(this);
