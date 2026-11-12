// Equipment changes how the wizard looks: the hat and the robe take the item grade's colour, and the
// necklace, belt, earrings and rings are painted onto the picture. Higher grades shine more.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var SLOTS = ['hat', 'staff', 'robe', 'belt', 'necklace', 'ear1', 'ear2', 'ring1', 'ring2'];
  var KIND_OF = { hat: 'hat', staff: 'staff', robe: 'robe', belt: 'belt', necklace: 'necklace', ear1: 'ear', ear2: 'ear', ring1: 'ring', ring2: 'ring' };
  function lookOf(state) {
    var out = {};
    SLOTS.forEach(function (k) {
      var key = state.equip && state.equip[KIND_OF[k]];
      out[k] = key && state.bag && state.bag[key] ? Math.floor(+String(key).split(':')[1] / 4) : -1;
    });
    return out;
  }
  function lookKey(l) { return SLOTS.map(function (k) { return l[k]; }).join(','); }

  // grade colours as hue/saturation for recolouring, and a hex for jewels
  var GRADE = [
    { h: 215, s: 0.1, gem: 0xc8ccd4 }, { h: 135, s: 0.62, gem: 0x5ce07a }, { h: 214, s: 0.78, gem: 0x4f9bff },
    { h: 282, s: 0.72, gem: 0xb46cff }, { h: 32, s: 0.9, gem: 0xffa21c }, { h: 352, s: 0.8, gem: 0xff4d6d }
  ];
  function rgb2hsv(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx / 255];
  }
  function hsv2rgb(h, s, v) {
    var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  function css(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }

  // paints a new picture of the wizard; art = { canvas, crop } from the art loader (1254px source coords)
  function paintHero(art, look) {
    var src = art.canvas, crop = art.crop, W = src.width, H = src.height;
    var c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    var k = W / crop.cw;
    function P(x, y) { return [(x - crop.x0) * k, (y - crop.y0) * k]; }
    // recolour the purple hat (top) and the purple cape (middle)
    var OUT = look.outfit, zoned = !OUT && (!art.id || art.id === 'hero');
    if (OUT || (zoned && (look.hat >= 0 || look.robe >= 0))) {
      var img = g.getImageData(0, 0, W, H), d = img.data;
      for (var y = 0; y < H; y++) {
        var Y = crop.y0 + y / k, part = OUT ? 'all' : Y < 480 ? 'hat' : Y > 610 && Y < 1010 ? 'robe' : null;
        if (!part || (!OUT && look[part] < 0)) continue;
        var T = OUT || GRADE[look[part]], shine = OUT ? 1.04 : look[part] >= 4 ? 1.12 : 1;
        for (var x = 0; x < W; x++) {
          var o = (y * W + x) * 4; if (d[o + 3] < 20) continue;
          var hsv = rgb2hsv(d[o], d[o + 1], d[o + 2]);
          if (hsv[0] < 250 || hsv[0] > 325 || hsv[1] < 0.22 || hsv[2] < 0.12) continue;
          var out = hsv2rgb(T.h, Math.min(1, hsv[1] * (T.s / 0.6)), Math.min(1, hsv[2] * shine * (T.v || 1)));
          d[o] = out[0]; d[o + 1] = out[1]; d[o + 2] = out[2];
        }
      }
      g.putImageData(img, 0, 0);
    }
    if (art.id && art.id !== 'hero') return c;
    var FX = look.fx;
    // costume horns and glowing eyes, painted on the wizard until the costume has its own drawn picture
    if (FX && FX.horns) [-1, 1].forEach(function (sd) {
      var bi = P(615 + sd * 175, 250), bo = P(615 + sd * 310, 275), co = P(615 + sd * 445, 215), tip = P(615 + sd * 405, 30), ci = P(615 + sd * 265, 140);
      var gr = g.createLinearGradient(bi[0], bi[1], tip[0], tip[1]); gr.addColorStop(0, '#1a0a14'); gr.addColorStop(0.55, '#4a1a2a'); gr.addColorStop(1, css(FX.col2 || FX.col));
      g.beginPath(); g.moveTo(bi[0], bi[1]); g.lineTo(bo[0], bo[1]); g.quadraticCurveTo(co[0], co[1], tip[0], tip[1]); g.quadraticCurveTo(ci[0], ci[1], bi[0], bi[1]); g.closePath();
      g.fillStyle = gr; g.fill(); g.lineWidth = 9 * k; g.strokeStyle = '#140810'; g.stroke();
      var m = P(615 + sd * 330, 150);
      [0.3, 0.55, 0.78].forEach(function (t) { var a = P(615 + sd * (175 + t * 210), 250 - t * 190), b = P(615 + sd * (310 + t * 110), 275 - t * 230); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineWidth = 5 * k; g.strokeStyle = '#140810'; g.stroke(); });
      var b0 = bi;
      g.globalCompositeOperation = 'lighter'; g.lineWidth = 4 * k; g.strokeStyle = css(FX.col) + '88';
      g.beginPath(); g.moveTo(b0[0] + sd * 12 * k, b0[1] - 20 * k); g.quadraticCurveTo(m[0] - sd * 8 * k, m[1] + 18 * k, tip[0] - sd * 4 * k, tip[1] + 14 * k); g.stroke(); g.globalCompositeOperation = 'source-over';
    });
    if (FX && FX.eyes) [[510, 455], [735, 452]].forEach(function (q) {
      var p = P(q[0], q[1]), R = 62 * k, e = css(FX.eyes);
      g.globalCompositeOperation = 'lighter';
      var gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], R); gr.addColorStop(0, '#ffffffcc'); gr.addColorStop(0.25, e + 'cc'); gr.addColorStop(1, e + '00');
      g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], R, 0, 6.3); g.fill(); g.globalCompositeOperation = 'source-over';
    });
    function gem(x, y, r, grade) {
      var col = GRADE[grade].gem, p = P(x, y), R = r * k;
      if (grade >= 3) { var gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], R * 2.6); gr.addColorStop(0, css(col) + 'aa'); gr.addColorStop(1, css(col) + '00'); g.fillStyle = gr; g.fillRect(p[0] - R * 3, p[1] - R * 3, R * 6, R * 6); }
      g.beginPath(); g.moveTo(p[0], p[1] - R); g.lineTo(p[0] + R * 0.85, p[1]); g.lineTo(p[0], p[1] + R); g.lineTo(p[0] - R * 0.85, p[1]); g.closePath();
      g.fillStyle = css(col); g.fill(); g.lineWidth = Math.max(1.5, R * 0.28); g.strokeStyle = '#3a2430'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(p[0] - R * 0.25, p[1] - R * 0.35, R * 0.25, R * 0.15, -0.5, 0, 6.3); g.fill();
    }
    function gold(points, w) { g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); points.forEach(function (q, i) { var p = P(q[0], q[1]); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.lineWidth = (w + 5) * k; g.strokeStyle = '#3a2430'; g.stroke(); g.lineWidth = w * k; g.strokeStyle = '#ffcf4a'; g.stroke(); }
    if (look.belt >= 0) {
      var b0 = P(470, 905), b1 = P(762, 905), bh = 30 * k, bc = look.belt >= 3 ? GRADE[look.belt].gem : 0x8a5a3c;
      g.fillStyle = '#3a2430'; g.fillRect(b0[0], b0[1] - bh / 2 - 3 * k, b1[0] - b0[0], bh + 6 * k);
      g.fillStyle = css(bc); g.fillRect(b0[0], b0[1] - bh / 2, b1[0] - b0[0], bh);
      var bk = P(615, 905); g.lineWidth = 8 * k; g.strokeStyle = '#3a2430'; g.strokeRect(bk[0] - 30 * k, bk[1] - 24 * k, 60 * k, 48 * k); g.lineWidth = 6 * k; g.strokeStyle = '#ffcf4a'; g.strokeRect(bk[0] - 30 * k, bk[1] - 24 * k, 60 * k, 48 * k);
      if (look.belt >= 2) gem(615, 905, 13, look.belt);
    }
    if (look.necklace >= 0) { gold([[540, 700], [578, 752], [615, 770], [652, 752], [690, 700]], 7); gem(615, 792, 20 + look.necklace * 2, look.necklace); }
    if (look.ear1 >= 0) { gold([[322, 292], [318, 312]], 5); gem(318, 328, 13 + look.ear1, look.ear1); }
    if (look.ear2 >= 0) { gold([[908, 318], [912, 338]], 5); gem(912, 354, 13 + look.ear2, look.ear2); }
    if (look.ring1 >= 0) { gold([[305, 752], [355, 742]], 9); gem(332, 738, 11 + look.ring1, look.ring1); }
    if (look.ring2 >= 0) { gold([[808, 700], [858, 694]], 9); gem(834, 684, 11 + look.ring2, look.ring2); }
    if (look.staff >= 0) {
      var sp = P(222, 492), sr = (60 + look.staff * 10) * k, sc = GRADE[look.staff].gem;
      var sg = g.createRadialGradient(sp[0], sp[1], sr * 0.2, sp[0], sp[1], sr); sg.addColorStop(0, css(sc) + '00'); sg.addColorStop(0.55, css(sc) + '66'); sg.addColorStop(1, css(sc) + '00');
      g.globalCompositeOperation = 'destination-over'; g.fillStyle = sg; g.fillRect(sp[0] - sr, sp[1] - sr, sr * 2, sr * 2); g.globalCompositeOperation = 'source-over';
      if (look.staff >= 2) gem(300, 590, 12, look.staff);
    }
    return c;
  }
  function staffColor(look) { return look.staff >= 0 ? GRADE[look.staff].gem : 0xffe14a; }
  // ---------- costume preview (browser only) ----------
  // card picture: a soft glow and the costume's aura around the outline, a few sparkles
  function costumePreview(hero, fx) {
    if (!fx) return hero;
    var hw = hero.width, hh = hero.height, W = Math.round(hw * 1.3), H = Math.round(hh * 1.14);
    var c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
    var cx = W / 2, top = H - hh - hh * 0.03, A = css(fx.col), B = css(fx.col2 || fx.col);
    var bg = g.createRadialGradient(cx, top + hh * 0.5, 0, cx, top + hh * 0.5, W * 0.6); bg.addColorStop(0, A + '55'); bg.addColorStop(0.6, A + '18'); bg.addColorStop(1, A + '00');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    var sil = document.createElement('canvas'); sil.width = hw; sil.height = hh; var sg = sil.getContext('2d');
    sg.drawImage(hero, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = A; sg.fillRect(0, 0, hw, hh);
    g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = A; g.shadowBlur = hw * (0.05 + fx.aura * 0.06); g.globalAlpha = 0.35 + fx.aura * 0.45;
    var s1 = 1.06; g.drawImage(sil, cx - hw * s1 / 2, top + hh * (1 - s1), hw * s1, hh * s1);
    g.shadowColor = B; g.shadowBlur = hw * 0.03; g.globalAlpha = 0.25 + fx.aura * 0.3; g.drawImage(sil, cx - hw * 1.02 / 2, top + hh * (1 - 1.02), hw * 1.02, hh * 1.02);
    g.restore();
    g.drawImage(hero, cx - hw / 2, top);
    g.globalCompositeOperation = 'lighter';
    for (var s = 0; s < 9; s++) {
      var x = cx + Math.sin(s * 2.7) * W * 0.38, y = top + hh * (0.1 + (s * 0.37 % 1) * 0.85), R = hw * (0.008 + (s % 3) * 0.006);
      var pg = g.createRadialGradient(x, y, 0, x, y, R * 3); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.3, B); pg.addColorStop(1, B + '00');
      g.fillStyle = pg; g.fillRect(x - R * 3, y - R * 3, R * 6, R * 6);
    }
    g.globalCompositeOperation = 'source-over';
    return c;
  }
  return { lookOf: lookOf, lookKey: lookKey, paintHero: paintHero, staffColor: staffColor, LOOK_GRADE: GRADE, costumePreview: costumePreview };
});
