// Puppet rigs for the flat character art: where the head, arms, legs, tail and wings are in each picture.
// Coordinates are pixels of the original 1254x1254 image (x right, y down). Each bone owns a soft ellipse
// of the picture and turns it around a pivot, so one image can walk, wave, wag and flap.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var BONES = ['head', 'armL', 'armR', 'legL', 'legR', 'tail', 'wingL', 'wingR'];
  // e: [cx, cy, rx, ry]  p: [px, py]
  var RIGS = {
    hero: { head: { e: [615, 360, 370, 330], p: [610, 650] }, armL: { e: [285, 640, 150, 330], p: [430, 760] }, armR: { e: [835, 660, 105, 120], p: [740, 750] },
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
  ['cos1', 'cos2', 'cos3', 'cos4', 'cos5', 'cos6', 'cos7', 'cos8', 'cos9', 'cos10'].forEach(function (id) { RIGS[id] = RIGS.costume; });
  var SIZE = 1254;
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // Weight of every bone at one point of the picture (u right, v up from the feet, both 0..1 of the cropped art).
  function weightsAt(rig, crop, u, v) {
    var px = rig && rig.frac ? u : crop.x0 + u * crop.cw, py = rig && rig.frac ? 1 - v : crop.y0 + (1 - v) * crop.ch, out = new Array(8), sum = 0;
    for (var i = 0; i < 8; i++) {
      var b = rig && rig[BONES[i]]; out[i] = 0;
      if (!b) continue;
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
