(function (root) {
  var CW = root.CW = root.CW || {};
  var AVAILABLE = ['hero', 'hero-cheese', 'M2', 'K1', 'M10', 'M15', 'M19', 'B2', 'B4', 'B7'];
  var MONSTER_POOL = ['M2', 'M10', 'M15', 'M19'];
  var BOSS_POOL = ['B2', 'B4', 'B7'];
  // the user's monster pictures: slime 꽃밭, mushroom 버섯 숲, cactus 사막, ice penguin 얼음 동굴, crystal dragon 화산, ghost bunny 별빛 호수,
  // moss golem 달의 정원, mimic 태양 신전, crystal spider 은하, skeleton knight 마왕성. Loaded when their region is reached.
  var MON_ART = ['M1', 'M3', 'M5', 'M7', 'M9', 'M11', 'M13', 'M16', 'M17', 'M20'];
  // monsters still without their own picture borrow one that suits the place (sometimes recoloured)
  var ALIAS = { M4: { id: 'M3', tint: 0xd8ffd0 }, M6: { id: 'M20', tint: null }, M8: { id: 'M17', tint: 0xb8e4ff }, M12: { id: 'M7', tint: null }, M14: { id: 'M11', tint: 0xfff0c0 }, M18: { id: 'M9', tint: 0xc8b0ff } };
  var cache = {};

  function loadImage(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; });
  }
  // Remove the flat white background by flood-filling from the border, then crop and shrink.
  function cutout(img, maxSide) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    var d = g.getImageData(0, 0, w, h), p = d.data;
    var seen = new Uint8Array(w * h), stack = [];
    function white(i) { var o = i * 4; return p[o] >= 232 && p[o + 1] >= 232 && p[o + 2] >= 232; }
    for (var x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
    for (var y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
    while (stack.length) {
      var i = stack.pop();
      if (seen[i] || !white(i)) continue;
      seen[i] = 1; p[i * 4 + 3] = 0;
      var px = i % w, py = (i / w) | 0;
      if (px > 0) stack.push(i - 1); if (px < w - 1) stack.push(i + 1);
      if (py > 0) stack.push(i - w); if (py < h - 1) stack.push(i + w);
    }
    // soften the light fringe next to removed pixels
    for (var j = 0; j < w * h; j++) {
      if (seen[j]) continue;
      var jx = j % w, jy = (j / w) | 0, near = false;
      if ((jx > 0 && seen[j - 1]) || (jx < w - 1 && seen[j + 1]) || (jy > 0 && seen[j - w]) || (jy < h - 1 && seen[j + w])) near = true;
      if (near) { var o = j * 4, lum = (p[o] + p[o + 1] + p[o + 2]) / 3; if (lum > 200) p[o + 3] = Math.max(0, 255 - (lum - 200) * 4.6); }
    }
    g.putImageData(d, 0, 0);
    var x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (var yy = 0; yy < h; yy += 2) for (var xx = 0; xx < w; xx += 2) if (p[(yy * w + xx) * 4 + 3] > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    if (x1 <= x0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
    var cw = x1 - x0 + 1, ch = y1 - y0 + 1, s = Math.min(1, maxSide / Math.max(cw, ch));
    var out = document.createElement('canvas'); out.width = Math.round(cw * s); out.height = Math.round(ch * s);
    var og = out.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(c, x0, y0, cw, ch, 0, 0, out.width, out.height);
    var u = 1254 / w;
    out.crop = { x0: x0 * u, y0: y0 * u, cw: cw * u, ch: ch * u, W: w * u, H: h * u };
    return out;
  }
  function loadArt(ids, maxSide) {
    var T = root.THREE;
    return Promise.all(ids.map(function (id) {
      if (cache[id]) return cache[id];
      cache[id] = loadImage((CW.ART_BASE || 'art/') + id + '.webp').then(function (img) {
        var cv = cutout(img, maxSide || 512);
        var tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearMipmapLinearFilter; tex.anisotropy = 2;
        if (T.sRGBEncoding) tex.encoding = T.sRGBEncoding;
        return { id: id, tex: tex, aspect: cv.width / cv.height, canvas: cv, crop: cv.crop, rig: (CW.RIGS || {})[id] || null };
      }).catch(function () { return null; });
      return cache[id];
    })).then(function (list) { var m = {}; list.forEach(function (a) { if (a) m[a.id] = a; }); return m; });
  }
  function hasArt(id) { return AVAILABLE.indexOf(id) >= 0 || MON_ART.indexOf(id) >= 0; }
  // Picks real art when it exists, otherwise a tinted stand-in from the same family.
  function resolveArt(id, kind, region) {
    if (id && hasArt(id)) return { id: id, tint: null };
    if (id && ALIAS[id]) return { id: ALIAS[id].id, tint: ALIAS[id].tint };
    var pool = kind === 'boss' ? BOSS_POOL : MONSTER_POOL;
    var pick = pool[(region * 3 + (id ? id.length + parseInt(id.slice(1), 10) || 0 : 0)) % pool.length];
    var tints = [0xffd0e8, 0xc8ffd8, 0xffe7b0, 0xcfe8ff, 0xffb8a0, 0xc0d0ff, 0xe8d8ff, 0xfff0a0, 0xd8c8ff, 0xffb0c0];
    return { id: pick, tint: tints[region % tints.length] };
  }
  CW.loadArt = loadArt; CW.resolveArt = resolveArt; CW.ART_IDS = AVAILABLE; CW.MON_ART = MON_ART;
  // gear pictures (white background already removed, 256px). The ring still uses its drawn icon.
  CW.GEAR_IMG = {};
  ['hat', 'staff', 'robe', 'belt', 'necklace', 'ear'].forEach(function (k) { CW.GEAR_IMG[k] = (CW.ART_BASE || 'art/') + 'g-' + k + '.webp'; });
  // costume pictures load only when a costume is worn or its card is shown
  CW.COSTUME_ART = ['cos1', 'cos2', 'cos3', 'cos4', 'cos5', 'cos6', 'cos7', 'cos8', 'cos9', 'cos10'];
})(this);
