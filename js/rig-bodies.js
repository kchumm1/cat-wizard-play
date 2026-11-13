// Puppet bodies for the monster and boss pictures in js/bestiary.js. Coordinates are fractions of the cut picture
// (x from the left, y from the top, both 0..1), so one body fits every picture drawn in the same pose.
// e: [cx, cy, rx, ry] the part of the picture the bone moves · p: [px, py] where it turns.
// FIT: per-picture corrections on top of the body, found by looking at each picture (tools/rig-sheet.py draws them).
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var BEST = (isNode ? require('./bestiary.js') : root.CW).BESTIARY;
  function B(o) { return o; }
  var BODIES = {
    // four legs, side view, head on the left, tail up on the right (the cats)
    catL: B({ head: { e: [0.32, 0.32, 0.31, 0.31], p: [0.40, 0.60] }, legL: { e: [0.31, 0.91, 0.13, 0.10], p: [0.31, 0.78] },
      legR: { e: [0.60, 0.91, 0.13, 0.10], p: [0.60, 0.78] }, tail: { e: [0.88, 0.52, 0.14, 0.30], p: [0.74, 0.74] } }),
    // four legs, side view, head low on the left (boar, wolves, lizards, bosses on all fours)
    quadL: B({ head: { e: [0.24, 0.40, 0.25, 0.30], p: [0.36, 0.56] }, legL: { e: [0.27, 0.91, 0.12, 0.10], p: [0.27, 0.78] },
      legR: { e: [0.68, 0.91, 0.12, 0.10], p: [0.68, 0.78] }, tail: { e: [0.92, 0.55, 0.10, 0.22], p: [0.82, 0.62] } }),
    // four legs, facing us (hippo, turtle, frog, ram)
    quadF: B({ head: { e: [0.50, 0.36, 0.32, 0.30], p: [0.50, 0.62] }, legL: { e: [0.28, 0.91, 0.13, 0.10], p: [0.30, 0.80] },
      legR: { e: [0.72, 0.91, 0.13, 0.10], p: [0.70, 0.80] } }),
    // standing on two legs, facing us, arms at the sides
    stand: B({ head: { e: [0.50, 0.28, 0.34, 0.28], p: [0.50, 0.52] }, armL: { e: [0.13, 0.58, 0.14, 0.17], p: [0.27, 0.50] },
      armR: { e: [0.87, 0.58, 0.14, 0.17], p: [0.73, 0.50] }, legL: { e: [0.37, 0.93, 0.12, 0.08], p: [0.40, 0.84] },
      legR: { e: [0.63, 0.93, 0.12, 0.08], p: [0.60, 0.84] } }),
    // sitting, facing us, a tail low on one side
    sitTail: B({ head: { e: [0.52, 0.30, 0.33, 0.29], p: [0.52, 0.56] }, armL: { e: [0.36, 0.64, 0.10, 0.10], p: [0.40, 0.56] },
      armR: { e: [0.66, 0.64, 0.10, 0.10], p: [0.62, 0.56] }, tail: { e: [0.13, 0.78, 0.14, 0.18], p: [0.30, 0.84] } }),
    sitDog: B({ head: { e: [0.50, 0.32, 0.36, 0.30], p: [0.50, 0.60] }, legL: { e: [0.36, 0.93, 0.11, 0.07], p: [0.38, 0.86] },
      legR: { e: [0.64, 0.93, 0.11, 0.07], p: [0.62, 0.86] }, tail: { e: [0.14, 0.80, 0.12, 0.14], p: [0.28, 0.86] } }),
    pod: B({ head: { e: [0.50, 0.30, 0.25, 0.25], p: [0.50, 0.55] }, armL: { e: [0.12, 0.56, 0.11, 0.10], p: [0.24, 0.55] },
      armR: { e: [0.88, 0.56, 0.11, 0.10], p: [0.76, 0.55] }, legL: { e: [0.40, 0.95, 0.09, 0.06], p: [0.42, 0.88] },
      legR: { e: [0.60, 0.95, 0.09, 0.06], p: [0.58, 0.88] } }),
    // floating things with wisps or little arms at the sides
    ghost: B({ head: { e: [0.50, 0.30, 0.34, 0.30], p: [0.50, 0.60] }, armL: { e: [0.10, 0.62, 0.12, 0.14], p: [0.24, 0.58] },
      armR: { e: [0.90, 0.62, 0.12, 0.14], p: [0.76, 0.58] }, tail: { e: [0.50, 0.92, 0.22, 0.10], p: [0.50, 0.80] } }),
    sprout: B({ head: { e: [0.50, 0.22, 0.42, 0.24], p: [0.50, 0.48] }, legL: { e: [0.30, 0.88, 0.18, 0.13], p: [0.42, 0.74] },
      legR: { e: [0.70, 0.88, 0.18, 0.13], p: [0.58, 0.74] } }),
    // snails and slugs: the face and eye stalks on the left sway, the shell stays
    snail: B({ head: { e: [0.20, 0.52, 0.19, 0.33], p: [0.28, 0.82] } }),
    seal: B({ head: { e: [0.30, 0.38, 0.27, 0.30], p: [0.40, 0.62] }, tail: { e: [0.86, 0.40, 0.14, 0.30], p: [0.74, 0.66] } }),
    birdL: B({ head: { e: [0.32, 0.30, 0.26, 0.26], p: [0.42, 0.52] }, tail: { e: [0.84, 0.55, 0.16, 0.30], p: [0.66, 0.62] },
      legL: { e: [0.42, 0.94, 0.08, 0.06], p: [0.42, 0.86] }, legR: { e: [0.56, 0.94, 0.08, 0.06], p: [0.56, 0.86] } }),
    // wings out to both sides (bats, owls, moths, mantas)
    fly: B({ head: { e: [0.50, 0.40, 0.20, 0.24], p: [0.50, 0.62] }, wingL: { e: [0.18, 0.42, 0.20, 0.32], p: [0.38, 0.46] },
      wingR: { e: [0.82, 0.42, 0.20, 0.32], p: [0.62, 0.46] } }),
    // small wings on a round body (bees, chicks, imps)
    flyArms: B({ head: { e: [0.50, 0.32, 0.30, 0.28], p: [0.50, 0.60] }, wingL: { e: [0.12, 0.46, 0.13, 0.20], p: [0.28, 0.48] },
      wingR: { e: [0.88, 0.46, 0.13, 0.20], p: [0.72, 0.48] }, legL: { e: [0.40, 0.94, 0.09, 0.06], p: [0.42, 0.86] },
      legR: { e: [0.60, 0.94, 0.09, 0.06], p: [0.58, 0.86] } }),
    // many legs out to the sides (spiders, crabs, beetles)
    spider: B({ head: { e: [0.50, 0.40, 0.24, 0.26], p: [0.50, 0.62] }, armL: { e: [0.12, 0.66, 0.14, 0.22], p: [0.30, 0.60] },
      armR: { e: [0.88, 0.66, 0.14, 0.22], p: [0.70, 0.60] }, legL: { e: [0.30, 0.90, 0.12, 0.10], p: [0.38, 0.75] },
      legR: { e: [0.70, 0.90, 0.12, 0.10], p: [0.62, 0.75] } }),
    scorpion: B({ head: { e: [0.48, 0.58, 0.22, 0.20], p: [0.50, 0.72] }, armL: { e: [0.15, 0.78, 0.15, 0.20], p: [0.32, 0.72] },
      armR: { e: [0.85, 0.78, 0.15, 0.20], p: [0.68, 0.72] }, tail: { e: [0.62, 0.22, 0.22, 0.24], p: [0.56, 0.48] } }),
    octo: B({ head: { e: [0.50, 0.34, 0.32, 0.30], p: [0.50, 0.62] }, armL: { e: [0.10, 0.70, 0.13, 0.20], p: [0.28, 0.66] },
      armR: { e: [0.90, 0.70, 0.13, 0.20], p: [0.72, 0.66] }, legL: { e: [0.34, 0.90, 0.14, 0.12], p: [0.40, 0.74] },
      legR: { e: [0.66, 0.90, 0.14, 0.12], p: [0.60, 0.74] } }),
    jelly: B({ head: { e: [0.50, 0.30, 0.34, 0.26], p: [0.50, 0.50] }, legL: { e: [0.32, 0.80, 0.16, 0.20], p: [0.40, 0.58] },
      legR: { e: [0.68, 0.80, 0.16, 0.20], p: [0.60, 0.58] } }),
    snake: B({ head: { e: [0.36, 0.24, 0.30, 0.24], p: [0.46, 0.52] }, tail: { e: [0.84, 0.84, 0.18, 0.15], p: [0.68, 0.86] } }),
    lizard: B({ head: { e: [0.50, 0.30, 0.28, 0.26], p: [0.52, 0.55] }, legL: { e: [0.36, 0.90, 0.12, 0.10], p: [0.38, 0.78] },
      legR: { e: [0.70, 0.90, 0.12, 0.10], p: [0.68, 0.78] }, tail: { e: [0.12, 0.62, 0.13, 0.25], p: [0.28, 0.70] } }),
    foxTail: B({ head: { e: [0.30, 0.30, 0.28, 0.28], p: [0.36, 0.58] }, legL: { e: [0.26, 0.92, 0.11, 0.08], p: [0.27, 0.80] },
      legR: { e: [0.48, 0.92, 0.11, 0.08], p: [0.48, 0.80] }, tail: { e: [0.82, 0.56, 0.18, 0.34], p: [0.62, 0.72] } }),
    wolf: B({ head: { e: [0.48, 0.30, 0.30, 0.28], p: [0.50, 0.56] }, legL: { e: [0.36, 0.91, 0.12, 0.09], p: [0.38, 0.80] },
      legR: { e: [0.66, 0.91, 0.12, 0.09], p: [0.64, 0.80] }, tail: { e: [0.10, 0.62, 0.11, 0.20], p: [0.24, 0.66] } }),
    dragonL: B({ head: { e: [0.40, 0.26, 0.26, 0.24], p: [0.46, 0.50] }, legL: { e: [0.34, 0.92, 0.11, 0.08], p: [0.36, 0.82] },
      legR: { e: [0.60, 0.92, 0.11, 0.08], p: [0.58, 0.82] }, tail: { e: [0.86, 0.72, 0.15, 0.22], p: [0.70, 0.76] } }),
    fish: B({ head: { e: [0.46, 0.34, 0.32, 0.28], p: [0.48, 0.55] }, wingL: { e: [0.12, 0.42, 0.12, 0.14], p: [0.26, 0.44] },
      wingR: { e: [0.86, 0.42, 0.12, 0.14], p: [0.72, 0.44] }, tail: { e: [0.60, 0.86, 0.20, 0.16], p: [0.56, 0.68] } }),
    seahorse: B({ head: { e: [0.40, 0.24, 0.30, 0.24], p: [0.48, 0.44] }, tail: { e: [0.52, 0.86, 0.22, 0.16], p: [0.52, 0.70] } }),
    eagle: B({ head: { e: [0.22, 0.30, 0.22, 0.24], p: [0.34, 0.48] }, wingR: { e: [0.74, 0.42, 0.26, 0.40], p: [0.56, 0.50] },
      legL: { e: [0.34, 0.92, 0.12, 0.08], p: [0.36, 0.82] }, legR: { e: [0.58, 0.92, 0.12, 0.08], p: [0.56, 0.82] } }),
    peacock: B({ head: { e: [0.50, 0.40, 0.14, 0.18], p: [0.50, 0.58] }, wingL: { e: [0.20, 0.40, 0.22, 0.34], p: [0.42, 0.55] },
      wingR: { e: [0.80, 0.40, 0.22, 0.34], p: [0.58, 0.55] } })
  };
  // standing with a tail on one side (mouse, monkey on the left; squirrel on the right)
  BODIES.standTailL = Object.assign({}, BODIES.stand, { tail: { e: [0.12, 0.74, 0.13, 0.20], p: [0.28, 0.80] } });
  BODIES.standTailR = Object.assign({}, BODIES.stand, { tail: { e: [0.86, 0.50, 0.14, 0.30], p: [0.70, 0.76] } });
  // a snake rearing up and facing us: the head sways on top, the coils stay
  BODIES.cobra = B({ head: { e: [0.50, 0.24, 0.32, 0.24], p: [0.50, 0.50] }, tail: { e: [0.86, 0.86, 0.15, 0.13], p: [0.72, 0.88] } });
  var FIT = {};
  var RIGS = {};
  Object.keys(BEST).forEach(function (id) {
    var b = BEST[id].body; if (!b || !BODIES[b]) return;
    var r = { frac: true }, base = BODIES[b], fix = FIT[id] || {};
    Object.keys(base).forEach(function (k) { r[k] = base[k]; });
    Object.keys(fix).forEach(function (k) { if (fix[k] === null) delete r[k]; else r[k] = fix[k]; });
    RIGS[id] = r;
  });
  return { BODY_RIGS: RIGS, RIG_BODIES: BODIES };
});
