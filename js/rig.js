// Puppet rigs for the flat character art: where the head, arms, legs, tail and wings are in each picture.
// Coordinates are pixels of the original 1254x1254 image (x right, y down). Each bone owns a soft ellipse
// of the picture and turns it around a pivot, so one image can walk, wave, wag and flap.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var BONES = ['head', 'armL', 'armR', 'legL', 'legR', 'tail', 'wingL', 'wingR'];
  // e: [cx, cy, rx, ry]  p: [px, py]
  var RIGS = {
    hero: { head: { e: [615, 360, 370, 330], p: [610, 650] }, armL: { cap: [245, 470, 400, 990, 78, 24, 30, 0.25], cap2: [110, 540, 260, 520, 62, 22], p: [330, 745] }, armR: { e: [835, 660, 105, 120], p: [740, 750] },
      legL: { e: [470, 1085, 100, 105], p: [485, 960] }, legR: { e: [715, 1085, 95, 105], p: [700, 960] }, tail: { e: [935, 1005, 125, 135], p: [820, 1065] } },
    'hero-cheese': { head: { e: [630, 400, 400, 370], p: [630, 690] }, armL: { e: [285, 690, 150, 260], p: [440, 770] }, armR: { e: [805, 830, 95, 100], p: [735, 775] },
      legL: { e: [515, 1175, 100, 85], p: [530, 1065] }, legR: { e: [730, 1175, 100, 85], p: [715, 1065] }, tail: { e: [930, 900, 110, 170], p: [835, 1000] } },
    M2: { head: { e: [620, 390, 365, 330], p: [620, 655] }, armL: { e: [350, 790, 95, 85], p: [455, 760] }, armR: { e: [840, 675, 100, 115], p: [760, 750] },
      legL: { e: [470, 1090, 100, 100], p: [490, 965] }, legR: { e: [720, 1090, 95, 100], p: [700, 965] }, tail: { e: [935, 1000, 125, 140], p: [820, 1065] } },
    K1: { head: { e: [620, 380, 330, 300], p: [620, 640] }, armL: { e: [265, 560, 165, 270], p: [390, 770] }, armR: { e: [850, 650, 90, 110], p: [760, 730] },
      legL: { e: [470, 1095, 100, 95], p: [490, 970] }, legR: { e: [720, 1095, 95, 95], p: [700, 970] }, tail: { e: [935, 1000, 120, 135], p: [830, 1060] },
      wingL: { e: [140, 790, 120, 110], p: [320, 760] }, wingR: { e: [1060, 760, 150, 140], p: [870, 720] } },
    M10: { head: { e: [630, 420, 350, 330], p: [630, 690] }, armL: { e: [350, 830, 95, 85], p: [445, 800] }, armR: { e: [830, 770, 90, 95], p: [760, 800] },
      legL: { e: [460, 1105, 105, 110], p: [490, 980] }, legR: { e: [730, 1105, 105, 110], p: [710, 980] }, tail: { e: [955, 995, 110, 130], p: [850, 1050] } },
    M15: { head: { e: [640, 370, 385, 300], p: [640, 640] }, armL: { e: [400, 715, 125, 110], p: [500, 770] }, armR: { e: [830, 715, 125, 110], p: [750, 770] },
      legL: { e: [480, 1085, 115, 130], p: [505, 940] }, legR: { e: [770, 1085, 115, 130], p: [750, 940] }, tail: { e: [250, 950, 140, 130], p: [385, 905] } },
    M19: { head: { e: [640, 370, 400, 320], p: [640, 665] }, armL: { e: [255, 690, 165, 290], p: [420, 790] }, armR: { e: [830, 770, 80, 85], p: [760, 795] },
      legL: { e: [470, 1105, 100, 100], p: [490, 985] }, legR: { e: [720, 1105, 100, 100], p: [700, 985] }, tail: { e: [950, 990, 110, 130], p: [840, 1045] },
      wingL: { e: [170, 720, 120, 140], p: [380, 720] }, wingR: { e: [1010, 730, 160, 150], p: [850, 720] } },
    B2: { head: { e: [630, 345, 240, 250], p: [630, 570] }, armL: { e: [330, 660, 90, 80], p: [425, 700] }, armR: { e: [910, 660, 90, 80], p: [835, 700] },
      legL: { e: [440, 1010, 95, 70], p: [480, 945] }, legR: { e: [800, 1010, 95, 70], p: [770, 945] },
      wingL: { e: [195, 600, 220, 300], p: [430, 560] }, wingR: { e: [1060, 600, 220, 300], p: [830, 560] } },
    B4: { head: { e: [640, 330, 380, 300], p: [640, 570] }, armL: { e: [250, 735, 140, 130], p: [370, 690] }, armR: { e: [1000, 725, 140, 130], p: [880, 690] },
      legL: { e: [450, 1120, 125, 110], p: [500, 1000] }, legR: { e: [820, 1120, 125, 110], p: [780, 1000] }, tail: { e: [1045, 1000, 165, 160], p: [905, 985] },
      wingL: { e: [170, 900, 140, 180], p: [300, 700] } },
    // drawn costume pictures (GPT art in the hero's pose): one shared rig
    costume: { head: { e: [615, 380, 360, 330], p: [615, 660] }, armL: { e: [250, 560, 140, 280], p: [420, 760] }, armR: { e: [845, 660, 105, 120], p: [750, 750] },
      legL: { e: [465, 1130, 95, 80], p: [480, 1030] }, legR: { e: [725, 1130, 95, 80], p: [715, 1030] }, tail: { e: [935, 1020, 120, 130], p: [830, 1080] } },
    B7: { head: { e: [640, 420, 260, 270], p: [640, 650] }, legL: { e: [440, 1075, 100, 70], p: [470, 1000] }, legR: { e: [820, 1075, 100, 70], p: [790, 1000] },
      wingL: { e: [195, 600, 250, 380], p: [430, 560] }, wingR: { e: [1060, 600, 250, 380], p: [830, 560] } }
  };
  // each costume picture holds its staff a little differently: its own staff strip [top x, top y, foot x, foot y, head radius,
  // fade, shaft radius, head share of the length], turned at the paw that holds it [x, y] — measured on the pictures (2026-11-15)
  var STAFF = {
    cos1: [[180, 240, 390, 1060, 118, 26, 34, 0.42], [300, 740]],
    cos2: [[230, 330, 360, 1000, 108, 26, 32, 0.32], [320, 760]],
    cos3: [[180, 430, 370, 1020, 118, 26, 32, 0.35], [300, 760]],
    cos4: [[215, 420, 360, 1060, 112, 26, 32, 0.32], [290, 760]],
    cos5: [[175, 420, 390, 1040, 108, 26, 34, 0.33], [290, 750]],
    cos6: [[200, 380, 360, 1060, 106, 26, 34, 0.36], [290, 740]],
    cos7: [[210, 400, 400, 1030, 90, 26, 34, 0.3], [320, 750]],
    cos8: [[200, 400, 440, 1050, 85, 26, 34, 0.3], [340, 730]],
    cos9: [[220, 390, 380, 1040, 110, 26, 34, 0.33], [320, 750]],
    cos10: [[180, 380, 410, 1060, 140, 28, 34, 0.35], [320, 740]],
    cos11: [[140, 150, 330, 1120, 100, 26, 34, 0.32], [240, 740]],
    cos12: [[150, 150, 380, 1080, 112, 26, 38, 0.42], [300, 690]],
    cos13: [[190, 150, 330, 1080, 70, 26, 34, 0.35], [280, 690]],
    cos14: [[230, 280, 380, 1060, 85, 26, 34, 0.35], [290, 760]],
    cos15: [[150, 400, 410, 1040, 112, 26, 34, 0.36], [300, 730]],
    cos16: [[150, 300, 390, 1060, 125, 28, 34, 0.35], [285, 725]],
    cos17: [[150, 120, 360, 1060, 90, 26, 34, 0.35], [260, 720]],
    cos18: [[180, 300, 400, 1060, 130, 28, 34, 0.4], [290, 740]]
  };
  // fwd: these staffs are long and stand close to the face, so they tip only a quarter as far toward the monsters (and
  // rise by lift as they do); measured: about 20 degrees forward already reaches the head
  var STAFF2 = { cos10: [250, 300, 60, 640, 62, 24], cos14: [225, 330, 95, 500, 72, 24], cos15: [130, 560, 110, 770, 34, 20] };   // scythe blade, feather plume, hanging tassel
  Object.keys(STAFF).forEach(function (id) { var o = {}; for (var k in RIGS.costume) o[k] = RIGS.costume[k]; o.armL = { cap: STAFF[id][0], cap2: STAFF2[id], p: STAFF[id][1], fwd: 0.25, lift: 0.05 }; RIGS[id] = o; });
  var SIZE = 1254;
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // A staff strip: [x1, y1, x2, y2, head radius, fade, shaft radius, head share of the length]: fully moved within the radius
  // of the line (wide at the head end, narrow along the shaft), fading out over 'fade' pixels
  function capWeight(c, px, py) {
    var lx = c[2] - c[0], ly = c[3] - c[1], tq = Math.max(0, Math.min(1, ((px - c[0]) * lx + (py - c[1]) * ly) / (lx * lx + ly * ly)));
    var qx = px - (c[0] + lx * tq), qy = py - (c[1] + ly * tq);
    var rad = c[6] === undefined ? c[4] : c[6] + (c[4] - c[6]) * Math.max(0, 1 - tq / (c[7] || 0.35));
    return 1 - smooth(rad, rad + c[5], Math.sqrt(qx * qx + qy * qy));
  }
  // Weight of every bone at one point of the picture (u right, v up from the feet, both 0..1 of the cropped art).
  function weightsAt(rig, crop, u, v) {
    var px = rig && rig.frac ? u : crop.x0 + u * crop.cw, py = rig && rig.frac ? 1 - v : crop.y0 + (1 - v) * crop.ch, out = new Array(8), sum = 0;
    for (var i = 0; i < 8; i++) {
      var b = rig && rig[BONES[i]]; out[i] = 0;
      if (!b) continue;
      if (b.cap) {
        // a capsule around a line (a staff), and a second one for a hooked head (cap2): the larger pull wins
        out[i] = Math.max(capWeight(b.cap, px, py), b.cap2 ? capWeight(b.cap2, px, py) : 0); sum += out[i]; continue;
      }
      var dx = (px - b.e[0]) / b.e[2], dy = (py - b.e[1]) / b.e[3], d = Math.sqrt(dx * dx + dy * dy);
      out[i] = 1 - smooth(0.55, 1.0, d); sum += out[i];
    }
    if (sum > 1) for (var j = 0; j < 8; j++) out[j] /= sum;
    return out;
  }
  // Pivot of a bone in the billboard's own units (x from the centre line, y up from the feet).
  function pivotOf(rig, crop, name, w, h) {
    var b = rig && rig[name]; if (!b) return null;
    if (rig.frac) return [(b.p[0] - 0.5) * w, (1 - b.p[1]) * h];
    return [((b.p[0] - crop.x0) / crop.cw - 0.5) * w, (1 - (b.p[1] - crop.y0) / crop.ch) * h];
  }
  return { RIGS: RIGS, RIG_BONES: BONES, RIG_SIZE: SIZE, rigWeightsAt: weightsAt, rigPivotOf: pivotOf };
});
