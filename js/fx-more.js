// The second set of skills: three more for every job tier, each built from the same parts as js/fx.js.
// Rule kept everywhere: whatever visibly lands is a real hit, and nothing is hit that the spell does not touch.
(function (root) {
  var CW = root.CW = root.CW || {};
  CW.fxMore = function (K, S) {
    var T = K.T, sc = K.sc, vx = K.vx, V = K.V, rr = K.rr, rdir = K.rdir, pick = K.pick, STAY = K.STAY, sway = K.sway, deep = K.deep, E = K.E, N = K.N, after = K.after, tick = K.tick, FC = K.FC, UPC = K.UPC, above = K.above;
    var fieldPt = K.fieldPt, fieldWave = K.fieldWave, fieldRain = K.fieldRain, flare = K.flare, glow = K.glow, sparks = K.sparks, embers = K.embers, smoke = K.smoke, fire = K.fire, trailFire = K.trailFire, shock = K.shock, ring = K.ring, gRing = K.gRing, gGlow = K.gGlow;
    var scorch = K.scorch, dust = K.dust, circle = K.circle, seal = K.seal, converge = K.converge, impact = K.impact, heavy = K.heavy, homing = K.homing, explosion = K.explosion;
    var liveMobs = K.liveMobs, gp = K.gp, share = K.share, volley = K.volley, ringHits = K.ringHits, skyBolt = K.skyBolt, zapHit = K.zapHit, beamOf = K.beamOf, picHead = K.picHead, picAt = K.picAt, picFall = K.picFall;
    var P3 = K.P3, near = K.near;
    // the monster a shot is flying at, or (if it has fallen on the way) the one standing nearest it, which is the one
    // that will take the hit (c.hit moves a fallen one's hit there): so the shot is seen to land where the damage goes
    function liveTarget(m) { if (m && !m.alive) { var nb = near(liveMobs(), m.x, m.z, 2.6); if (nb) return nb; } return m; }
    var ICE = [0xffffff, 0xd8f2ff, 0xbfe8ff];
    function mp(m) { return sc.mobPos(m); }
    // a 3D ball of coloured light: a light heart in a softer glow of its colour. In bright regions (snow, desert) light
    // added to the picture would vanish, so there it is painted in the colour itself, deeper, instead of white.
    function lightBall(col, glowK, glowA) {
      var br = vx.isBright && vx.isBright(), dc = deep(col);
      var heart = P3.orb(br ? { col: col, deep: dc } : { col: 0xffffff, deep: col });
      var haze = P3.orb(br ? { col: dc, deep: deep(dc), alpha: Math.min(0.85, (glowA || 0.5) + 0.25), order: 6 } : { col: col, deep: dc, alpha: glowA || 0.5, order: 6 });
      var gk = (glowK || 2.4) * (br ? 0.7 : 1);   // painted glow is solid colour: smaller, or it covers the field
      return { set: function (p, s) { heart.set(p, s); haze.set(p, s * gk); }, kill: function () { heart.kill(); haze.kill(); } };
    }
    function put(list, p) { for (var i = 0; i < list.length; i++) if (list[i]) { list[i].x = p.x; list[i].y = p.y; list[i].z = p.z; } }
    function kill(list) { list.forEach(vx.kill); }
    // ---------- the meshes made in Blender (fx3d bm: tools/blender/skills6_meshes.py) ----------
    var QY = new T.Vector3(0, 1, 0), QE = new T.Euler(), QT = new T.Quaternion();
    // facing the camera, then turned by (x, y, z) radians in its own frame
    function camQ(rx, ry, rz) { return sc.camera.quaternion.clone().multiply(QT.setFromEuler(QE.set(rx || 0, ry || 0, rz || 0))); }
    // the mesh's +y pointing along dir
    function alongQ(dir) { return new T.Quaternion().setFromUnitVectors(QY, dir.clone().normalize()); }
    // the mesh's +x along ax and its +z toward the camera (as near as it can while square to ax)
    function seamQ(ax) {
      var x = ax.clone().normalize(), cz = V(0, 0, 1).applyQuaternion(sc.camera.quaternion), z = cz.sub(x.clone().multiplyScalar(cz.dot(x))).normalize(), y = z.clone().cross(x);
      return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    }
    // the ground caving in under a weight: a crater (a bowl in a broken rim, cracks glowing violet) sinks in at once,
    // its cracks glow and cool, and it fades back into the ground
    function cave(g, R, life, col) {
      var h = P3.bm('crater', { col: col }), t = 0, q = new T.Quaternion().setFromAxisAngle(QY, rr(0, 6.283)), S = V(), at = V(g.x, 0.01, g.z);
      tick(function (dt) {
        t += dt; var k = Math.min(1, t / 0.08), a = t < life * 0.7 ? 1 : Math.max(0, 1 - (t - life * 0.7) / (life * 0.3));
        S.set(R, R * (0.2 + 0.8 * (1 - (1 - k) * (1 - k))), R);
        h.set(at, q, S, a, Math.max(0, 1 - t / (life * 0.55)));
        if (t < life) return false; h.kill(); return true;
      });
    }
    // a solid piece that is thrown, tumbles, falls and fades (kind: a bm mesh)
    function tumble(kind, col, at, vel, size, life) {
      var h = P3.bm(kind, { col: col }), P = at.clone(), q = new T.Quaternion().setFromEuler(QE.set(rr(0, 6.3), rr(0, 6.3), rr(0, 6.3))), w = rdir(1).normalize(), spin = rr(6, 14), t = 0, R = new T.Quaternion();
      tick(function (dt) {
        t += dt; vel.y -= 9 * dt; vel.multiplyScalar(Math.max(0, 1 - 1.1 * dt)); P.addScaledVector(vel, dt); q.multiply(R.setFromAxisAngle(w, spin * dt));
        var a = Math.max(0, 1 - Math.max(0, t - life * 0.6) / (life * 0.4));
        h.set(P, q, size, a, 1);
        if (t < life && P.y > -0.2) return false; h.kill(); return true;
      });
    }
    // a bar of light standing straight up on the screen from a ground point (len is its height)
    function shaft(g, len, w, col, life, o) { var q = { pos: above(g, len / 2), frame: 'streak', color: col, size: [len, len], ar: w, rot: 1.5708, life: life }; for (var k in o) q[k] = o[k]; return E(q); }
    // ice standing up out of the ground at a spot
    function iceSpike(g, h, life, lean) { return E({ sys: 'norm', pos: V(g.x, h * 0.42, g.z + 0.25), frame: 'shard', color: pick(ICE), size: [0.05, h * 0.5], ar: 2.0, rot: lean || 0, ease: 2, life: life, fadeOut: 0.85, white: true }); }
    function iceBurst(c, m, big, noCards) {
      var g = gp(m), q = mp(m), B = (m.boss ? 1.45 : 1) * (big || 1);
      // five sharp spikes of ice (3D, 2026-11-16; they were flat pictures), fanning out
      for (var s = 0; s < 9 && !noCards; s++) K.sharpSpike(V(g.x + (s - 4) * 0.13 * B, 0, g.z + 0.25 + rr(-0.05, 0.1)), { h: rr(0.72, 1.1) * Math.min(2.0, c.s) * B * (s === 4 ? 1.12 : 0.95), life: c.D(0.6), lean: (s - 4) * 0.22 + rr(-0.08, 0.08) });
      flare(q, 0xffffff, 1.2, 0.15, { white: true }); shock(q, c.col, 1.8 * B, 0.3);
      if (!noCards) K.iceChips(q, N(6, c), 3.2, 2.2, 0.13);
      else for (var k = 0; k < N(8, c); k++) E({ sys: 'norm', pos: q.clone().add(rdir(0.3)), vel: rdir(3.2).add(V(0, 2.2, 0)), frame: 'shard', color: pick(ICE), size: [rr(0.1, 0.2), 0.05], ar: 2, life: rr(0.5, 0.8), grav: 7, spin: rr(-12, 12), white: true });
      E({ sys: 'gadd', pos: V(g.x, 0.04, g.z), frame: 'frost', color: c.col, size: [0.3, 2.4 * B], ease: 1, life: 0.8, fadeOut: 0.5, alpha: 0.8 });
    }
    // a monster caught by a wall of fire that sweeps the whole crowd at once: fire, a ring and embers, no white flash (white
    // on every monster within a moment went to a white field)
    function wallBurn(c, m) {
      var q = mp(m), g = gp(m);
      fire(q, N(2, c), { size: 0.5 * Math.min(1.3, c.s), speed: 2, up: 2 }); gRing(g, 0xffb040, 1.6 * Math.min(1.4, c.s), 0.35); scorch(g, 0.9, 2); embers(q, [0xffe080, 0xff6a2b], N(4, c), { speed: 2.4, up: 2.6 });
    }
    function fireBurst(c, m, size) {
      var q = mp(m), g = gp(m);
      flare(q, 0xffffff, 1.2 * c.s, 0.14, { white: true }); fire(q, N(7, c), { size: (size || 1) * c.s, speed: 2.2, up: 2 });
      gRing(g, 0xffb040, 1.8 * c.s, 0.4); scorch(g, 1.0, 2); embers(q, [0xffe080, 0xff6a2b], N(5, c), { speed: 2.4, up: 2.6 }); sc.light(q, 0xff8a3a, 1.4, 0.3);
    }

    // =================================================================== 1차: 별·발톱·털뭉치
    // Jelly paw stamp: the shadow of a paw spreads under one monster, then a great paw drops out of the sky and stamps it flat.
    S.stamp = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('raise', c.D(0.12), c.col);
      var g0 = gp(mob);
      E({ sys: 'gadd', pos: V(g0.x, 0.04, g0.z), frame: 'paw', color: c.col, size: [0.3, 1.5 * c.s], ease: 1, life: c.D(0.32), rot: 0, alpha: 0.6, fadeIn: 0.2 });
      after(c.D(0.14), function () {
        var t = 0, T_FALL = c.D(0.17), from = above(gp(mob), 6.2), to = mp(mob), P = from.clone();
        var parts = [E({ sys: 'col', pos: from, frame: 'paw', color: c.deep, size: 1.9 * c.s, life: 30, upd: STAY, fadeOut: 1, rot: 0 }),
          E({ pos: from, frame: 'paw', color: 0xffffff, size: 1.35 * c.s, life: 30, upd: STAY, fadeOut: 1, rot: 0, alpha: 0.85, white: true }),
          E({ pos: from, frame: 'glow', color: c.col, size: 2.6 * c.s, life: 30, upd: STAY, fadeOut: 1, alpha: 0.5 })];
        tick(function (dt) {
          t += dt; var k = Math.min(1, t / T_FALL); to = mp(mob);
          P.lerpVectors(from, to, k * k); put(parts, P);
          if (Math.random() < dt * 70 * c.n) E({ pos: P.clone().add(rdir(0.5)), vel: UPC.clone().multiplyScalar(rr(2, 5)), frame: pick(['star', 'flare']), color: [0xffffff, c.col], size: [rr(0.1, 0.2), 0], life: rr(0.25, 0.45), spin: 6 });
          if (k < 1) return false;
          kill(parts);
          var g = V(to.x, 0, to.z);
          E({ sys: 'gadd', pos: V(g.x, 0.045, g.z), frame: 'paw', color: [0xffffff, c.col], size: [2.4 * c.s, 2.6 * c.s], life: 0.7, rot: 0, alpha: 0.9, fadeOut: 0.4 });
          flare(to, 0xffffff, 1.5 * c.s, 0.14, { white: true }); shock(to, c.col, 2.6 * c.s, 0.35); gRing(g, c.col, 3.6 * c.s, 0.45); dust(g, N(8, c), 1.4);
          for (var s = 0; s < N(12, c); s++) E({ sys: s % 2 ? 'col' : 'add', pos: to.clone().add(rdir(0.2)), vel: rdir(3.6).add(V(0, 2.4, 0)), frame: pick(['paw', 'star']), color: [0xffffff, c.col], size: [rr(0.16, 0.28) * c.s, 0.04], life: rr(0.45, 0.8), grav: 5, drag: 1.4, spin: rr(-8, 8) });
          sc.light(to, c.col, 1.4, 0.3); heavy(1.1);
          c.hit(mob, 1, 1.7);
          return true;
        });
      });
    };
    // Rolling yarn: a ball of yarn is bowled along the ground from monster to monster, bonking each one and leaving its thread behind.
    S.roll = function (c) {
      var list = c.pool(); if (!list.length) return;
      sc.heroPose('toss', c.D(0.1), c.col);
      // with fewer monsters it comes back round, so every bonk still counts
      var k = Math.max(1, Math.ceil(4 / list.length)), seq = []; for (var r = 0; r < k; r++) seq = seq.concat(list);
      after(c.D(0.1), function () {
        var from = sc.heroPaw().setY(0.3 * c.s), cur = from.clone(), i = 0, t = 0, seg = c.D(0.5 / seq.length + 0.03), to = gp(seq[0]);
        var parts = [E({ sys: 'norm', pos: from, frame: 'fluff', color: c.col, size: 0.66 * c.s, life: 30, upd: STAY, fadeOut: 1 }),
          E({ sys: 'norm', pos: from, frame: 'ring', color: 0xffffff, size: 0.42 * c.s, life: 30, upd: STAY, fadeOut: 1, alpha: 0.75, spin: -14, ar: 0.6 }),
          E({ sys: 'norm', pos: from, frame: 'ring', color: c.deep, size: 0.56 * c.s, life: 30, upd: STAY, fadeOut: 1, alpha: 0.8, spin: -14, ar: 1.5 })];
        var thread = vx.ribbon({ solid: true, mode: 'trail', w: 0.05 * c.s, color: c.col, core: 0.3, maxPts: 24, shrink: 14, minDist: 0.1 });
        tick(function (dt) {
          var mob = seq[i]; t += dt / seg; var kk = Math.min(1, t); if (mob.alive) to = gp(mob);
          cur.lerpVectors(from, V(to.x, 0.3 * c.s, to.z), kk); cur.y += Math.abs(Math.sin(kk * Math.PI)) * (i ? 0.5 : 0.15);
          put(parts, cur); if (parts[0]) parts[0].rot -= dt * 16; if (thread) thread.head(cur);
          if (Math.random() < dt * 24) dust(V(cur.x, 0, cur.z), 1, 0.5);
          if (kk < 1) return false;
          var q = mp(mob);
          impact(q, c.col, 0.7 * c.s); sc.shake(0.06);
          for (var s = 0; s < N(5, c); s++) E({ sys: 'norm', pos: q.clone().add(rdir(0.15)), vel: rdir(2.4).add(V(0, 2, 0)), frame: 'fluff', color: [0xffffff, c.col], size: [rr(0.14, 0.24) * c.s, 0.06], life: rr(0.5, 0.9), grav: 2, drag: 2.4, upd: sway, fadeOut: 0.6 });
          c.hit(mob, 1 / k, 1.0);
          i++; t = 0; from.copy(cur);
          if (i < seq.length) return false;
          kill(parts); if (thread) thread.detach();
          for (var f = 0; f < N(12, c); f++) E({ sys: 'norm', pos: cur.clone().add(rdir(0.2)), vel: rdir(2.8).add(V(0, 2.2, 0)), frame: 'fluff', color: [0xffffff, c.col], size: [rr(0.16, 0.3) * c.s, 0.08], life: rr(0.7, 1.2), grav: 1.6, drag: 2.6, spin: rr(-4, 4), upd: sway, fadeOut: 0.6 });
          ring(cur, c.col, 1.2 * c.s, 0.25);
          return true;
        });
      });
    };
    // Star dust shower: a handful of star dust is thrown up and comes down as little shooting stars, each one on a monster.
    S.sprinkle = function (c) {
      sc.heroPose('spin', c.D(0.08), c.col);
      var tip = c.from;
      for (var i = 0; i < N(18, c); i++) E({ pos: tip.clone().add(rdir(0.1)), vel: UPC.clone().multiplyScalar(rr(5, 9)).add(V(rr(-2.5, 2.5), 0, 0)), frame: pick(['star', 'dot', 'flare']), color: [0xffffff, c.col], size: [rr(0.1, 0.18), 0], life: c.D(rr(0.25, 0.4)), drag: 1.5, spin: 6 });
      flare(tip, 0xffffff, 0.9 * c.s, 0.14, { white: true }); ring(tip, c.col, 0.9 * c.s, 0.22);
      volley(c, { shots: 10, t0: 0.17, span: 0.36, fire: function (mob, frac) {
        if (!mob) return;
        var from = above(gp(mob), rr(4.6, 5.6)).add(V(rr(-0.9, 0.9), 0, 0));
        homing({ from: from, to: function () { return mp(mob); }, time: c.D(0.2), fancy: false, ease: function (x) { return x * x * 0.6 + x * 0.4; },
          trail: { w: 0.08 * c.s, col: c.col, core: 0.9, pts: 12, halo: false },
          heads: [{ frame: 'star', color: 0xffffff, size: 0.38 * c.s, spin: 12, white: true }, { frame: 'glow', color: c.col, size: 0.8 * c.s, alpha: 0.35 }],
          onHit: function (p) {
            E({ sys: 'col', pos: p, frame: 'star', color: [c.col, c.deep], size: [0.15, 0.75 * c.s], ease: 1, life: 0.2, spin: 8 });
            sparks(p, [c.col, 0xffffff], N(5, c), 3.8, { size: 0.15, up: 1 }); gRing(V(p.x, 0, p.z), c.col, 1.2 * c.s, 0.3);
            c.hit(mob, frac, 0.5);
          } });
      } });
    };

    // =================================================================== 2차: 불
    // Fire pillars: the ground glows and cracks under three monsters, then a column of fire comes up out of each crack.
    S.pillars = function (c) {
      c.plain = true;   // This skill supplies its own contact light. Avoid a second white flash.
      var list = c.pool(); if (!list.length) return;
      sc.heroPose('raise', c.D(0.14), 0xff8a3a);
      list.forEach(function (mob, i) {
        var g0 = gp(mob);
        gGlow(g0, 0xff5a1a, 1.2, c.D(0.34));   // the ground glows where it will burst (no magic circle: the user did not want one)
        embers(V(g0.x, 0.1, g0.z), [0xffe080, 0xff6a2b], N(4, c), { speed: 0.8, up: 2.4, life: 0.6 });
        after(c.D(0.2 + i * 0.07), function () {
          var g = gp(mob), q = mp(mob), H = Math.min(7, 4.2 * c.s);
          // the eruption: the ground bursts open and a column of fire SHOOTS UP out of it — a fast core of white-hot flame
          // inside a wider sheath that flares out at the top, the flames racing upward, balls of fire hurled up through it,
          // rock thrown out at its foot; it stands a moment roaring and burns down
          // the column: a real 3D shape made in Blender (narrow out of the crack, flaring at the top), painted as toon fire
          // racing upward (P3.toonFire), with a hotter core inside; the drawn column only until those shapes have loaded
          var tp = P3.toonFire ? P3.toonFire('pillar', { tw: 1.2, rise: 1.8, lift: 0.04, band: 0.6, top: 0.12 }) : null, tp2 = tp && P3.toonFire('pillar', { tw: -1.0, rise: 2.1, lift: 0.0, band: 0.5, top: 0.16, noGlow: true }), tpc = tp && P3.toonFire('pillarCore', { core: true, tw: 1.0, rise: 2.2, lift: -0.04, band: 0.6, top: 0.12 }), pspin = Math.random() * 6.283;
          var col3 = tp && tp.ready() ? null : P3.column({ col: 0xff3a0c, hot: 0xffa028, flare: true, speed: 3.6 });
          // (2026-11-17) the column is the user's painted pillar of fire (art/fx-pillar.webp: bursting up, roaring, dying
          // into smoke) standing on the crack; the 3D one only until the picture has come
          var pp = P3.sheetFx ? P3.sheetFx('fx-pillar') : null, pfr = Math.random() * 8;
          var R = 0.62 * Math.min(1.4, c.s), H2 = Math.min(7.5, 5.0 * c.s), ct = 0, CT = c.D(0.62), base = g.clone();
          P3.blast(V(g.x, 0, g.z), { size: 0.38 * Math.min(1.4, c.s), col: 0xff5a14, low: 0x5a0a08, hotness: 0.2, flash: false, chips: 4, ring: 2.4, ringAlpha: 0.16, life: 0.5, crater: false });
          tick(function (dt) {
            ct += dt; if (mob.alive) { var gg = gp(mob); base.x = gg.x; base.z = gg.z; }
            var up = Math.min(1, ct / c.D(0.07)), burn = Math.max(0, (ct - CT * 0.5) / (CT * 0.5)), roar = 1 + Math.sin(ct * 38) * 0.05;
            var hNow = H2 * (1 - (1 - up) * (1 - up)) * roar;
            if (pp && pp.ready()) {
              // scenes 1-4 as it bursts up, 5-12 looping while it roars, 13-16 as it burns down
              var fr = ct < c.D(0.1) ? ct / c.D(0.1) * 4 : burn <= 0 ? 4 + (pfr + (ct - c.D(0.1)) * 20) % 8 : 12 + Math.min(3.99, burn * 4);
              pp.set(V(base.x, 0, base.z), Math.min(3.4, H2 * 0.5) * (0.8 + 0.2 * up), fr, 0, 1);
              if (col3) { col3.kill(); col3 = null; } if (tp) { tp.set(base, 1, 0, 1); tpc.set(base, 1, 0, 1); tp2.set(base, 1, 0, 1); }
            } else if (col3) col3.set(base, hNow, R * (1.25 - 0.25 * up), Math.min(1, burn));
            else {
              // lower than the drawn column (its flaring top stays on screen); as it dies the fire comes away from the ground
              // and drifts up as it breaks apart, like a fountain cut off at its source
              pspin += dt * 3; var b3 = Math.min(1, burn), hT = hNow * 0.56, wNow = 0.5 * (H2 / 5) * (R / 0.62) * (1.25 - 0.25 * up), lift3 = V(base.x, b3 * b3 * hT * 0.35, base.z);
              tp.set(lift3, hT, pspin, 0, b3 * 1.05, b3 * 0.55, wNow); tpc.set(lift3, hT, pspin * 1.3, 0, Math.min(1, b3 * 1.25), b3 * 0.7, wNow);
              tp2.set(lift3, hT * 0.95, -pspin * 0.8 + 1.9, 0, Math.min(1, b3 * 1.12), b3 * 0.6, wNow * 0.85);
            }
            if (ct < CT) return false; if (col3) col3.kill(); if (tp) { tp.kill(); tpc.kill(); tp2.kill(); } if (pp) pp.kill(); return true;
          });
          // (no balls of fire thrown up the column: the user found them odd, 2026-11-16)
          for (var f = 0; f < N(16, c); f++) E({ pos: V(g.x + rr(-0.35, 0.35), rr(0.2, 1.2), g.z + rr(-0.1, 0.1)), vel: V(rr(-1.2, 1.2), rr(12, 22), 0), frame: pick(['dot', 'dot', 'streak']), color: [0xffe080, 0xff6a2b], size: [rr(0.06, 0.13), 0.02], life: rr(0.35, 0.6), grav: 8, stretch: 0.06 });
          sc.shake(0.18); sc.punch(0.05);
          flare(q, 0xffbd39, 0.88 * c.s, 0.11, { alpha: 0.76 });
          P3.fireGround(g, 2.72 * Math.min(1.5, c.s), c.D(1.3));
          smoke(V(g.x, 0.6, g.z), [0x6a5a54, 0x2e2624], N(5, c), { size: 1.0, rise: 1.6, speed: 0.8, life: 1.2 });
          embers(q, [0xffe080, 0xff6a2b], N(10, c), { speed: 2.6, up: 3.5 });
          sc.light(q, 0xff8a3a, 1.8, 0.4); heavy(0.9); if (!i) sc.flash('rgba(255,131,36,0.12)', 0.12);
          c.hit(mob, 1, 1.5);
        });
      });
    };
    // Flame wave (the user's drawings, 2026-11-15: art/fx-firewave-seq.webp, eight scenes): a small flame catches on the
    // ground in front of the crowd and grows — scene by scene, every piece of it flickering and swaying on its own, the
    // upper part leaning out toward us in 3D — into a towering curling wave, its biggest; then it breaks and its pieces
    // are flung out and scatter into the last wisps of flame. As it breaks the fire sweeps out over the crowd and burns
    // every monster it reaches.
    // (Replaced by the fire tornado below on 2026-11-15, at the user's choice; kept, not used.)
    S.flameSea = function (c) {
      c.plain = true;   // its own burst under every monster it reaches; the shared white contact flash read as a white disk
      sc.heroPose('raise', c.D(0.14), 0xff8a3a);
      var HC = sc.heroCenter(), hit = [], t = 0, cs = Math.min(1.3, c.s), XC = HC.x * 0.4 + (c.center ? c.center.x * 0.3 : 0), flip = Math.random() < 0.5 ? 1 : -1;
      // it catches just behind the crowd and rolls through it toward us as it grows, so the fire really passes over them
      var ml = liveMobs(), back = ml.length ? Math.min.apply(null, ml.map(function (m) { return m.z; })) - 0.6 : HC.z - 4;
      var ZA = Math.max(-5.4, Math.min(HC.z - 2.5, back)), ZB = HC.z + 1.2, HMAX = 4.4 * cs;
      var T_GROW = c.D(0.8), T_HOLD = c.D(0.1), T_BREAK = c.D(0.6), T_FADE = c.D(0.22), END = T_GROW + T_HOLD + T_BREAK + T_FADE;
      var sq = P3.seqWave(), F = V(XC, 0.02, ZA), P = V(), TH = -0.6, CT = Math.cos(TH), ST = Math.sin(TH), r = -1, broke = false, flung = false;
      var bits = []; for (var k = 0; k < sq.N; k++) { var uvk = sq.uv(k); bits.push({ u: uvk.u, v: uvk.v, ph: Math.random() * 6.283, s: Math.random(), dx: rr(-1, 1), dz: rr(0.6, 1.6), dy: rr(-0.2, 0.8) }); }
      function sm(x) { return x * x * (3 - 2 * x); }
      // a monster caught by the wave: fire bursts up out of the ground under it (a short 3D column), a ring, embers
      function burn(m) {
        var g2 = gp(m), q2 = mp(m), jt = 0, JT = c.D(0.36), base = V(g2.x, 0, g2.z), hb = (m.boss ? 3.2 : 2.0) * cs;
        // every other monster (and a boss) gets its own column of fire: a column under every one of a big crowd was too heavy
        if (m.boss || hit.length % 2 === 1) { var jet = P3.column({ col: 0xff4a10, hot: 0xffa028, flare: true, speed: 3.6 }); tick(function (dt2) { jt += dt2; var up = Math.min(1, jt / c.D(0.05)); jet.set(base, hb * up, (m.boss ? 0.6 : 0.36) * cs, Math.max(0, (jt - JT * 0.35) / (JT * 0.65))); if (jt < JT) return false; jet.kill(); return true; }); } else fire(q2, 1, { size: 0.6 * c.s, speed: 1.5, up: 2.4 });
        gRing(g2, 0xff8a30, 1.3 * c.s, 0.35); embers(q2, [0xffe080, 0xff6a2b], N(5, c), { speed: 2.6, up: 3 }); if (Math.random() < 0.4) scorch(g2, 0.9, 1.8); sc.shake(0.04);
        c.hit(m, 1, 1.5);
      }
      tick(function (dt) {
        t += dt;
        // which scene: 0 → 4 while it grows, a beat at its biggest, 4 → 7 as it breaks and scatters
        var f = t < T_GROW ? 4 * Math.pow(t / T_GROW, 1.15) : t < T_GROW + T_HOLD ? 4 : Math.min(7, 4 + 3 * (t - T_GROW - T_HOLD) / T_BREAK);
        var fade = t < END - T_FADE ? 1 : Math.max(0, (END - t) / T_FADE);
        var fi = Math.min(6, Math.floor(f)), fr = sm(f - fi);
        var grow = Math.min(1, f / 4), H = HMAX * (0.8 + 0.2 * grow), W = H * sq.ASPECT, pw = W / sq.GC * 1.36, ph = H / sq.GR * 1.36;
        F.z = ZA + (ZB - ZA) * sm(Math.min(1, t / (T_GROW + T_HOLD + T_BREAK)));
        var curl = sm(grow), scat = Math.max(0, Math.min(1, (f - 4.3) / 2.7));
        // two layers deep (a darker back one a beat behind in its sway, and the front), so the wave has a body (three cost too much fill)
        for (var lay = 0; lay < 2; lay++) for (var slot = 0; slot < 2; slot++) {
          // the back layer draws only the scene that is mostly shown (half the fill while one scene turns into the next)
          var back0 = lay === 0 && (slot ? fr < 0.5 : fr >= 0.5);
          var scene = fi + slot, a = back0 ? 0 : (lay === 0 ? 0.9 : (slot ? fr : 1 - fr)) * fade, tl = t - (1 - lay) * 0.07, dep = (lay - 0.5) * H * 0.26, shade = [0.55, 1.05][lay], lsc = 1 + (1 - lay) * 0.05;
          bits.forEach(function (b, k) {
            var lx = (b.u - 0.5) * W * flip * lsc + Math.sin(tl * 5 + b.v * 3 + b.ph) * 0.05 * H * b.v, ly = b.v * H * lsc, lz = Math.max(0, b.v - 0.35) * H * 0.55 * curl + dep * (0.4 + b.v);
            // breaking: the pieces are flung forward and out, and burn
            lx += b.dx * scat * 1.6; lz += b.dz * scat * 2.2; ly += b.dy * scat * 0.9;
            P.set(F.x + lx, F.y + ly * CT - lz * ST, F.z + ly * ST + lz * CT);
            var fl = 1 + 0.07 * Math.sin(t * 12 + b.ph * 3);
            sq.put(slot, Math.min(7, scene), k, P, TH + Math.max(0, b.v - 0.35) * 0.9 * curl + Math.sin(tl * 4 + b.ph) * 0.05, Math.sin(tl * 6 + b.ph) * 0.08 * b.v, back0 ? 0.0001 : pw * fl * flip * lsc, back0 ? 0.0001 : ph * fl * lsc, a, Math.max(0, (f - 5.6) / 1.4) * (0.4 + 0.6 * b.s), lay, shade);
          });
        }
        sq.commit();
        if (f < 4 && Math.random() < dt * 12) { var xg = XC + rr(-W * 0.4, W * 0.4); E({ sys: 'gadd', pos: V(xg, 0.035, F.z + 0.3), frame: 'glow', color: [0xffa040, 0xc8301a], size: [1.2, 2.2 * grow + 0.6], life: 0.5, rot: 0, alpha: 0.5, fadeIn: 0.2 }); }
        if (f < 5 && Math.random() < dt * 26 * c.n * grow) E({ pos: V(XC + rr(-W * 0.4, W * 0.4), H * rr(0.4, 0.9) * grow, F.z + 0.5), vel: V(rr(-1, 1), rr(2, 5), rr(0.5, 3)), frame: pick(['dot', 'flame']), color: [0xffe080, 0xff5a1a], size: [rr(0.08, 0.16), 0.02], life: rr(0.35, 0.6), grav: 5, stretch: 0.07 });
        if (!broke && f >= 4.1) { broke = true; sc.shake(0.55); sc.punch(0.1); sc.climax(0.6, 0.35); sc.light(V(XC, 1.5, F.z), 0xff8a3a, 2.4, 0.6); }
        // real 3D fire: as it breaks, balls of fire are flung off its crest toward us, tails streaming behind them
        if (broke && !flung) { flung = true; for (var fbI = 0; fbI < 3; fbI++) (function (fbI) { var ball = P3.fireball({ size: rr(0.24, 0.34) * cs, col: 0xff7a1a, hot: 0xfff2b0 }), bp = V(XC + (fbI - 1) * W * 0.25, H * rr(0.6, 0.8), Math.min(F.z - 1.0, HC.z - 3.0)), bv = V((fbI - 1) * rr(1.5, 3) + rr(-0.5, 0.5), rr(2, 4), rr(0.6, 2.0)), bt = 0; tick(function (dt3) { bt += dt3; bv.y -= 12 * dt3; bp.addScaledVector(bv, dt3); ball.set(bp, bv, dt3); if (bp.y > 0.15 && bt < 1.2) return false; ball.kill(); fire(V(bp.x, 0.3, bp.z), N(3, c), { size: 0.7 * c.s, speed: 1.6, up: 2 }); scorch(V(bp.x, 0, bp.z), 0.9, 1.8); return true; }); })(fbI); }
        // and while it grows, tongues of 3D flame leap up along its foot
        if (f < 4 && f > 0.6 && Math.random() < dt * 3) { var jx = XC + rr(-W * 0.4, W * 0.4), jb = V(jx, 0, F.z + rr(-0.3, 0.4)), jc = P3.column({ col: 0xff4a10, hot: 0xffa028, flare: true, speed: 3.2 }), jtt = 0, JTT = c.D(0.4), jh = rr(1.2, 2.2) * cs * (0.5 + 0.5 * grow); tick(function (dt4) { jtt += dt4; var up = Math.min(1, jtt / c.D(0.06)); jc.set(jb, jh * up, 0.32 * cs, Math.max(0, (jtt - JTT * 0.4) / (JTT * 0.6))); if (jtt < JTT) return false; jc.kill(); return true; }); }
        // the wave's front: its foot, the crest leaning out ahead of it, and once it breaks the pieces flung further on. A
        // monster is burnt when the front passes over it (within the wave's width; once it breaks, across the whole field)
        var frontZ = F.z + 0.4 + H * 0.35 * curl + scat * 2.4, half = W * 0.55 + (broke ? 6 : 0);
        if (f >= 2.2) c.pool().forEach(function (m) {
          if (hit.indexOf(m) >= 0 || m.z > frontZ || Math.abs(m.x - XC) > half) return;
          hit.push(m); burn(m);
        });
      });
    };
    // Fire tornado (the user's choice, 2026-11-15, in place of the wave): a whirl of fire spins up out of the ground in
    // front of the wizard into a towering 3D tornado (dark smoke wound round a wall of flame, faster fire inside, a white-hot
    // core), then winds through the crowd from monster to monster; each one it touches is caught up in its fire — flames
    // whirling up round it and a burst of fire under it. Embers fly off it, rocks and dust are thrown out at its foot, it
    // scorches a trail; at the end it bursts, flinging balls of fire out, and burns away.
    S.flameWave = function (c) {
      c.plain = true;
      sc.heroPose('raise', c.D(0.16), 0xff8a3a);
      var HC = sc.heroCenter(), cs = Math.min(1.3, c.s), hit = [];
      var reachRatio = Math.min(1.3, c.hitScale) / cs;
      var T_GROW = c.D(0.42), T_RUN = c.D(1.1), T_FADE = c.D(0.8), END = T_GROW + T_RUN + T_FADE;
      // (2026-11-18, the user: "it plays on its own, as if made up above and wandering about") a streak of fire first runs
      // along the ground from the wizard's feet to where it rises (t < 0), so the wizard is seen to send it out
      var T_LEAD = c.D(0.16), t = -T_LEAD, from0 = V(HC.x, 0, HC.z - 0.35);
      // its way: from just in front of the wizard to the nearest monster, then on to the nearest one left, and so on
      var start = V(HC.x * 0.6, 0, HC.z - 1.2), way = [start.clone()], left = liveMobs().slice(), at = start.clone();
      while (left.length) {
        var bi = 0, bd = 1e9;
        left.forEach(function (m, i) { var g = gp(m), d = Math.hypot(g.x - at.x, g.z - at.z); if (d < bd) { bd = d; bi = i; } });
        var gm = gp(left[bi]); at = V(Math.max(-2.4, Math.min(2.4, gm.x)), 0, gm.z); way.push(at.clone()); left.splice(bi, 1);
      }
      if (way.length < 2) way.push(V(start.x, 0, start.z - 4));
      // (it keeps inside the screen, and ends near the middle so its burning out into smoke is seen)
      way.push(V(way[way.length - 1].x * 0.35, 0, Math.min(HC.z - 2.2, way[way.length - 1].z)));
      var segL = [], total = 0; for (var w = 1; w < way.length; w++) { var L = way[w].distanceTo(way[w - 1]); segL.push(L); total += L; }
      function along(d) { for (var i = 0; i < segL.length; i++) { if (d <= segL[i] || i === segL.length - 1) return way[i].clone().lerp(way[i + 1], Math.min(1, d / Math.max(1e-4, segL[i]))); d -= segL[i]; } return way[way.length - 1].clone(); }
      function ease3(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
      // the tornado: real 3D shapes made in Blender (an outer swirl and a hot core inside it, and the same swirl as smoke for
      // the end), painted as toon fire by the game (P3.toonFire); the drawn tornado only until those shapes have loaded
      var tf = P3.toonFire ? P3.toonFire('tornado', { tw: 5.5, top: 0.1, pic: 'fx-fireswirl', edge: 0.22, paintEdge: 3 }) : null, tcore = tf && P3.toonFire('tornadoCore', { core: true, tw: 4.5, top: 0.1 }), tsm = tf && P3.toonFire('tornado', { smoke: true, tw: 3.5, top: 0.1 }), toonOn = function () { return tf && tf.ready(); };
      // (2026-11-18) the tornado is the user's painted one (art/fx-tornado.webp, laid out like the pillar: 1-4 spinning up
      // out of a spark, 5-12 spinning, 13-16 going out into smoke) carried along its way; the 3D one only until it has come
      var tpic = P3.sheetFx ? P3.sheetFx('fx-tornado') : null, tpf = Math.random() * 8, picOn = function () { return tpic && tpic.ready(); };
      // (2026-11-18, "too much like a picture") a second one just behind it, four scenes on and a little wider, faint: the
      // two read as the near and far side of one turning body; dust and embers off the ground are sucked in round its foot
      var tback = tpic && P3.sheetFx('fx-tornado'), suckT = 0;
      var tw = toonOn() || picOn() ? null : P3.twister({}), spin = Math.random() * 6.283, P = start.clone(), trailT = 0, lastGround = null, emT = 0, chipT = 0, tgT = 0, lightT = 0, flung = false;
      // a monster caught up in it: little flames whirl up round it and sparks fly. Only a boss, and the last monster it
      // reaches, get the big effect (a column of fire, a ring on the ground): one under every monster cluttered the whirl
      var nAll = Math.max(1, c.pool().length);
      function caught(m) {
        var g2 = gp(m), q2 = mp(m), jt = 0, JT = c.D(0.34), base = V(g2.x, 0, g2.z), hb = (m.boss ? 3.0 : 1.9) * cs, big = m.boss || hit.length >= nAll;
        for (var e = 0; e < N(big ? 6 : 3, c); e++) { var a = rr(0, 6.283), r0 = rr(0.25, 0.5); E({ pos: V(q2.x + Math.cos(a) * r0, q2.y + rr(-0.4, 0.3), q2.z + Math.sin(a) * r0 * 0.6), vel: V(-Math.sin(a) * 3.0, rr(2.5, 4.2), Math.cos(a) * 1.8), frame: pick(['flame', 'dot', 'flame']), color: [0xffb040, 0xff3a0c], size: [rr(0.1, 0.18) * c.s, 0.04], life: rr(0.35, 0.55), drag: 1.2, stretch: 0.05 }); }
        embers(q2, [0xffc060, 0xff3a0c], N(big ? 5 : 3, c), { speed: 2.4, up: 3.0 });
        if (big) {
          var jet = P3.column({ col: 0xff2a0a, hot: 0xff6a14, flare: true, speed: 3.6 }); tick(function (dt2) { jt += dt2; var up = Math.min(1, jt / c.D(0.05)); jet.set(base, hb * up, (m.boss ? 0.55 : 0.36) * cs, Math.max(0, (jt - JT * 0.35) / (JT * 0.65))); if (jt < JT) return false; jet.kill(); return true; });
          gGlow(g2, 0xff851d, 1.4 * c.s, 0.27); sc.shake(0.08);
        }
        c.hit(m, 1, 1.5);
      }
      var tilt = 0, pPrev = start.clone(), ringT = 0, padT = 0, leadT = 0;
      tick(function (dt) {
        t += dt;
        // the streak of fire running along the ground from the wizard to where the tornado will rise
        if (t < 0) {
          var lk = 1 + t / T_LEAD, lp = from0.clone().lerp(start, lk);
          leadT -= dt; while (leadT <= 0) {
            leadT += 0.012 / Math.max(0.25, c.n);
            E({ pos: V(lp.x + rr(-0.12, 0.12), rr(0.05, 0.2), lp.z + rr(-0.1, 0.1)), vel: V(rr(-0.4, 0.4), rr(1.5, 3.2), 0), frame: pick(['flame', 'flame', 'dot']), color: [0xffd060, 0xff3a0c], size: [rr(0.2, 0.34) * cs, 0.04], life: rr(0.22, 0.38), drag: 1.2 });
            E({ sys: 'gadd', pos: V(lp.x, 0.035, lp.z), frame: 'glow', color: [0xffa040, 0xc8301a], size: [0.7 * cs, 1.0 * cs], life: 0.4, rot: 0, alpha: 0.5, fadeIn: 0.1 });
          }
          return false;
        }
        // (the user's drawing of its life: a small flame grows into the tornado, at its biggest it throws out embers, then
        // the smoke takes it over from the top down — the fire goes out, the last of it at its foot — and the smoke thins away)
        var grow = ease3(t / T_GROW), run = ease3((t - T_GROW) / T_RUN), fz = Math.max(0, (t - T_GROW - T_RUN) / T_FADE);
        // in order: the fire goes out from the top while grey smoke takes it over and turns (slower than the fire did), the
        // embers at its foot glow on, then the smoke unwinds and drifts up and away
        var k = Math.min(1, fz / 0.4), smk = Math.min(1, fz / 0.3), thin = Math.max(0, (fz - 0.5) / 0.5);
        // where it is: it follows its way smoothly (a little behind the line, so it swings round the corners)
        var Q = along(run * total), wob = V(Math.sin(t * 5.3) * 0.25, 0, Math.cos(t * 4.1) * 0.15);
        P.lerp(Q.add(wob), Math.min(1, dt * 9));
        var roar = 1 + Math.sin(t * 17) * 0.04, H = (0.35 + 3.0 * grow + 0.4 * k) * cs * roar, r0 = (0.035 + 0.07 * grow) * cs, r1 = (0.2 + 0.8 * grow) * cs * (1 + 0.1 * k);
        // the tornado itself: the Blender shapes painted as toon fire (the drawn one only if those shapes are missing)
        spin += dt * 8.8;
        if (picOn()) {
          if (tw) { tw.kill(); tw = null; }
          if (tf) { var hid = V(P.x, 0, P.z); tf.set(hid, 1, 0, 1, 0, 1); tcore.set(hid, 1, 0, 1, 0, 1); tsm.set(hid, 1, 0, 1, 0, 1); }   // (k 1: hidden)
          // scenes 1-4 while it grows, 5-12 looping while it runs, 13-16 as it goes out into smoke (the last of them thinning)
          tpf += dt * 18;
          var tfr = t < T_GROW ? t / T_GROW * 4 : fz <= 0 ? 4 + tpf % 8 : 12 + Math.min(3.99, fz * 4.4);
          var tal = fz > 0.8 ? Math.max(0, (1 - fz) / 0.2) : 1;
          // it rises out of the ground (small at first, growing upward from its foot), and as it is dragged along its top
          // leans back behind its foot, so it is seen to be held to the ground
          var tsz = 3.0 * cs * roar * (0.3 + 0.7 * grow), vx = (P.x - pPrev.x) / Math.max(1e-3, dt); pPrev.copy(P);
          tilt += (Math.max(-0.2, Math.min(0.2, vx * 0.04)) - tilt) * Math.min(1, dt * 6);
          tpic.set(V(P.x, 0, P.z), tsz, tfr, tilt, tal);
          var bfr = tfr >= 4 && tfr < 12 ? 4 + (tfr - 4 + 4) % 8 : tfr;
          tback.set(V(P.x, 0, P.z - 0.12), tsz * 1.1, bfr, tilt * 1.15, tal * 0.35 * (1 - k));
          // at its foot: fire whirling round on the ground, and the ground glowing under it
          if (k < 1) {
            ringT -= dt; while (ringT <= 0) {
              ringT += 0.02 / Math.max(0.25, c.n);
              var ra = rr(0, 6.283), rrad = rr(0.3, 0.55) * cs * (0.5 + 0.5 * grow);
              E({ pos: V(P.x + Math.cos(ra) * rrad, rr(0.03, 0.15), P.z + Math.sin(ra) * rrad * 0.6), vel: V(-Math.sin(ra) * 3.5, rr(0.8, 2.2), Math.cos(ra) * 2.2), frame: pick(['flame', 'flame', 'dot']), color: [0xffd060, 0xff3a0c], size: [rr(0.16, 0.3) * cs, 0.03], life: rr(0.2, 0.32), drag: 1.4 });
            }
            padT -= dt; if (padT <= 0) { padT = 0.1; gGlow(V(P.x, 0, P.z), 0xff6a1a, 1.3 * cs * (0.5 + 0.5 * grow), 0.25); }
          }
          // dust and embers off the ground swept in round its foot, whirled up into it
          if (k < 1 && grow > 0.3) {
            suckT -= dt; while (suckT <= 0) {
              suckT += 0.03 / Math.max(0.25, c.n);
              var sa = rr(0, 6.283), sr = rr(1.1, 1.8) * cs, dust = Math.random() < 0.55;
              E({ pos: V(P.x + Math.cos(sa) * sr, rr(0.03, 0.25), P.z + Math.sin(sa) * sr * 0.7), vel: V(-Math.sin(sa) * 4.5 - Math.cos(sa) * 2.6, rr(1.2, 3.2), Math.cos(sa) * 3.2 - Math.sin(sa) * 1.8),
                frame: dust ? 'smoke' : pick(['dot', 'flame']), sys: dust ? 'norm' : undefined, color: dust ? [0x8a6a50, 0x4a3a30] : [0xffc060, 0xff3a0c],
                size: dust ? [rr(0.18, 0.32) * cs, rr(0.35, 0.6) * cs] : [rr(0.06, 0.12), 0.02], alpha: dust ? 0.35 : undefined, life: rr(0.35, 0.55), drag: 1.6, grav: dust ? -1 : -3, stretch: dust ? undefined : 0.06 });
            }
          }
        } else if (toonOn()) {
          if (tw) { tw.kill(); tw = null; }
          var foot3 = V(P.x, 0, P.z), H3 = H * 0.95;
          tf.set(foot3, H3, spin, k, 0, 0); tcore.set(foot3, H3, spin * 1.15, Math.min(1, k * 1.2), 0, 0);
          // the smoke: the same swirl, shown from the top down as the fire goes out there, turning slower, then breaking up
          if (smk > 0.001 && thin < 1) tsm.set(V(P.x, 0, P.z), H3 * 0.85, spin * 0.6, 0, Math.max(0.001, 1.15 - smk * 1.3), thin); else tsm.set(foot3, H3, 0, 1, 0, 1);
        } else { if (!tw) tw = P3.twister({}); tw.set(P, H, r0, r1, 0.45 + 0.25 * Math.sin(t * 3.1), k, smk, thin); }
        // embers flung off it, spinning out the way it turns
        if (k < 1) {
          emT -= dt; while (emT <= 0) {
            emT += 0.024 / Math.max(0.25, c.n); var y = rr(0.1, 0.95), a = rr(0, 6.283), rad = (r0 + (r1 - r0) * Math.pow(y, 1.6)) * 0.95;
            E({ pos: V(P.x + Math.cos(a) * rad, y * H, P.z + Math.sin(a) * rad * 0.8), vel: V(-Math.sin(a) * rr(3, 6), rr(1, 3.5), Math.cos(a) * rr(2, 4)), frame: pick(['dot', 'dot', 'flame']), color: [0xffb040, 0xff2a0a], size: [rr(0.06, 0.14), 0.02], life: rr(0.35, 0.7), drag: 1.0, grav: 1.5, stretch: 0.05 });
          }
          // tongues of flame licking up its outside, swept round the way it turns
          tgT -= dt; while (tgT <= 0) {
            tgT += (picOn() ? 0.04 : toonOn() ? 0.07 : 0.022) / Math.max(0.25, c.n); var ty = rr(0.08, 0.85), ta = rr(0, 6.283), trad = (r0 + (r1 - r0) * Math.pow(ty, 1.45)) * 1.02;
            E({ pos: V(P.x + Math.cos(ta) * trad, ty * H, P.z + Math.sin(ta) * trad * 0.8), vel: V(-Math.sin(ta) * 2.2, rr(3, 5.5), Math.cos(ta) * 1.4), frame: 'flame', color: [0xffc040, 0xff2a0a], size: [rr(0.3, 0.55) * cs, 0.05], life: rr(0.22, 0.38), drag: 1.5 });
          }
          // rocks and dust thrown out at its foot
          chipT -= dt; if (chipT <= 0 && grow > 0.5) { chipT = 0.1; P3.chip(V(P.x, 0, P.z), 0.6 * cs, 0xff7a1a, false); }
          // Leave a short bed of heat where the funnel passes; do not stack patches while it stands still.
          trailT -= dt;
          if (grow > 0.45 && trailT <= 0 && (!lastGround || lastGround.distanceTo(P) >= 0.85 * cs)) {
            P3.fireGround(P, 2.15 * cs, c.D(0.64));
            lastGround = P.clone(); trailT = c.D(0.25);
          }
          lightT -= dt; if (lightT <= 0) { lightT = 0.25; sc.light(V(P.x, H * 0.4, P.z), 0xff3a12, 0.7, 0.35); }
        }
        // whatever it touches is caught up in it
        if (grow > 0.6 && k < 0.6) {
          var HR = (1.25 * cs + r1 * 0.3) * reachRatio;
          c.pool().forEach(function (m) {
            if (hit.indexOf(m) >= 0) return; var g = gp(m), d = Math.hypot(g.x - P.x, (g.z - P.z) * 1.2);
            if (d > HR * (m.boss ? 1.5 : 1)) return; hit.push(m); caught(m);
          });
        }
        // as it goes out two small balls of fire drop off it (a big burst of them read as an explosion, not a fire going out)
        if (k > 0 && !flung) {
          flung = true; sc.shake(0.12);
          for (var fb = 0; fb < 2; fb++) (function (fb) {
            var ball = P3.fireball({ size: rr(0.13, 0.17) * cs, col: 0xff5a14, hot: 0xffc060 }), a = fb * 3.1416 + rr(-0.5, 0.5), bp = V(P.x + Math.cos(a) * r1 * 0.5, H * rr(0.4, 0.55), P.z + Math.sin(a) * r1 * 0.4);
            var bv = V(Math.cos(a) * rr(1.5, 2.5), rr(1, 2), Math.sin(a) * rr(0.8, 1.5)), bt = 0;
            tick(function (dt3) { bt += dt3; bv.y -= 12 * dt3; bp.addScaledVector(bv, dt3); ball.set(bp, bv, dt3); if (bp.y > 0.15 && bt < 1.0) return false; ball.kill(); embers(V(bp.x, 0.2, bp.z), [0xffc060, 0xff3a0c], N(3, c), { speed: 1.4, up: 1.6 }); scorch(V(bp.x, 0, bp.z), 0.6, 1.6); return true; });
          })(fb);
        }
        // embers left glowing at its foot while the smoke turns over it
        if (fz > 0.3 && thin < 0.7 && Math.random() < dt * 14) E({ pos: V(P.x + rr(-0.25, 0.25), 0.1, P.z + rr(-0.15, 0.15)), vel: V(rr(-0.4, 0.4), rr(0.6, 1.6), 0), frame: 'dot', color: [0xffb040, 0xff3a0c], size: [rr(0.05, 0.1), 0.02], life: rr(0.5, 0.9), drag: 0.8 });
        if (t < END) return false;
        // anyone it never reached (who moved off its way) is still caught in the last of it
        c.pool().forEach(function (m) { if (hit.indexOf(m) < 0) { hit.push(m); caught(m); } });
        if (tw) tw.kill(); if (tf) { tf.kill(); tcore.kill(); tsm.kill(); } if (tpic) { tpic.kill(); tback.kill(); } return true;
      });
    };
    // Inferno shell: one huge fireball is lobbed high, comes down on a monster and takes the ground around it with it.
    S.inferno = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      c.plain = true;
      sc.heroPose('toss', c.D(0.22), 0xff6a2b);
      // the big ball swells over the paw, its flames streaming up, fire whirling into it
      var S_ = Math.min(1.6, 1.3 * c.s), LB = Math.min(2.3, 1.5 * S_), ball = K.toonBall(LB, { glow: 1.1, thick: true, redCore: true, col: 0xef310c }), hold = 0, HOLD = c.D(0.26), thrown = false, hp = V(), UPV = V(0, -1, 0);
      function ballAt() { return hp.copy(sc.heroPaw()).add(V(0, 0.75 + 0.35 * Math.min(1, hold / HOLD), 0)); }
      var tip = ballAt().clone();
      // (2026-11-18) small and faint: over a bright region a big one read as a flat orange disc behind the ball
      glow(tip, 0xff6a2b, [0.2, 0.45 * c.s], HOLD, { fadeIn: 0.6, hot: 1.2 });
      for (var i = 0; i < N(16, c); i++) { var a = rr(0, 6.28), r = rr(0.6, 1.1); E({ pos: tip, frame: 'flame', color: [0xffe080, 0xff6a2b], size: [0.26, 0.08], life: c.D(rr(0.16, 0.24)), delay: rr(0, c.D(0.06)), upd: K.spiralTo(tip, a, r), fadeIn: 0.3 }); }
      tick(function (dt) {
        if (thrown) return true; hold += dt; var k = Math.min(1, hold / HOLD);
        ball.set(ballAt(), UPV, dt, 0.2 + 0.8 * (1 - (1 - k) * (1 - k)) * (1 + 0.05 * Math.sin(hold * 40)), k);
        return false;
      });
      after(HOLD, function () {
        thrown = true; var from = ballAt().clone(), land = mp(mob);
        smoke(from, 0x5a4a44, N(3, c), { size: 0.7, rise: 0.4 }); sc.shake(0.08);
        var ft = 0, FT = c.D(0.42);
        homing({ from: from, to: function () { land = mp(mob); return land; }, time: FT, arc: V(0, 3.6, -0.5), ease: function (x) { return x * x * 0.7 + x * 0.3; },
          fancy: false, heads: [],
          emit: function (p, v, dt) {
            ft += dt; ball.set(p, v, dt, undefined, 1, (ft / FT - 0.7) / 0.3);
            var back = v.clone().multiplyScalar(-0.12);
            if (Math.random() < dt * 26 * c.n) E({ pos: p.clone().addScaledVector(v, -0.06), vel: rdir(1.4).add(back), frame: 'dot', color: [0xffe080, 0xff5a1a], size: [0.08, 0], life: 0.4, grav: 2, stretch: 0.1 });
            if (Math.random() < dt * 16 * c.n) E({ sys: 'norm', pos: p.clone().addScaledVector(v, -0.1), vel: back.clone().add(V(0, 0.5, 0)), frame: 'smoke', color: 0x4a3c38, size: [0.2 * S_, 0.7 * S_], ease: 1, life: 0.6, alpha: 0.32, drag: 2, fadeIn: 0.2 });
          },
          onHit: function (p) {
            var g = V(p.x, 0, p.z);
            ball.kill();
            // One contact point: the hot core opens first, the red flame runs out
            // at floor level, then smoke rises through the exposed center.
            sc.climax(0.45, 0.3); sc.shake(0.46); sc.punch(0.11);
            sc.light(p, 0xff4017, 2.5, 0.36);
            flare(p, 0xff791d, 1.35 * S_, c.D(0.10), { alpha: 0.90 });
            P3.infernoFront(g, S_, c.D(0.62));
            P3.fireGround(g, 3.4 * S_, c.D(1.45));
            after(c.D(0.29), function () {
              smoke(V(g.x, 0.24 * S_, g.z), [0x754b37, 0x443633], N(5, c), {
                size: 0.90 * S_, rise: 2.0, speed: 0.65, life: c.D(0.90)
              });
            });
            // burning bits thrown out in arcs, falling over a wide area; sparks and embers
            for (var b = 0; b < N(8, c); b++) E({ sys: b % 2 ? 'col' : 'add', pos: p.clone().add(rdir(0.2)), vel: V(rr(-5.5, 5.5), rr(3, 6.5), rr(-3.5, 3.5)), frame: 'flame', color: [0xffe080, 0xff7a1a, 0xc8301a], size: [rr(0.28, 0.45) * S_, 0.08], life: rr(0.7, 1.1), grav: 9, drag: 0.6, spin: rr(-5, 5), fadeOut: 0.3 });
            sparks(p, [0xffe080, 0xff8a2b], N(10, c), 7.5, { size: 0.2, stretch: 0.16 });
            embers(p, [0xffe080, 0xff6a2b], N(8, c), { speed: 3.4, up: 3.2 });
            c.hit(mob, 1, 2); c.splash(mob, 2.0, 1.2);
          } });
      });
    };

    // =================================================================== 3차: 번개
    // Thunderbolt: a storm cloud knots together over one monster, and one enormous bolt comes down on it — then its echo.
    S.thunder = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('raise', c.D(0.2), c.col); sc.dim(0.45, c.D(0.85));
      var g0 = gp(mob), cl = above(g0, 4.4);
      for (var i = 0; i < N(10, c); i++) E({ sys: 'norm', pos: cl.clone().add(V(rr(-1.3, 1.3), rr(-0.25, 0.25), 0)), vel: V(rr(-0.3, 0.3), 0, 0), frame: 'smoke', color: [0x59607a, 0x2a2e40], size: [0.5, rr(1.3, 1.9)], ease: 1, life: c.D(0.75), alpha: 0.8, fadeIn: 0.3, fadeOut: 0.7 });
      for (var k = 0; k < 4; k++) after(c.D(0.05 + k * 0.05), function () { var a = cl.clone().add(V(rr(-1, 1), 0, 0)); vx.lightning(a, a.clone().add(V(rr(-0.8, 0.8), rr(-0.3, 0.3), 0)), { w: 0.05, color: c.col, life: 0.1, branches: 0, segs: 6, amp: 0.3 }); });
      function strike(w, frac, power) {
        var g = gp(mob), sky = above(g, 7.6).add(V(rr(-0.4, 0.4), 0, 0)), to = function () { return mp(mob); }, q = mp(mob);
        vx.lightning(sky, to, { w: 0.95 * w * c.s, color: c.col, core: 0, alpha: 0.5, life: c.D(0.3), branches: 0, segs: 18, amp: 0.16 });
        vx.lightning(sky, to, { solid: true, w: 0.27 * w * c.s, color: 0x3d8cff, core: 0.9, life: c.D(0.34), branches: 4, segs: 18, amp: 0.16 });
        vx.lightning(sky, to, { w: 0.11 * w * c.s, color: 0xffffff, life: c.D(0.28), branches: 0, segs: 18, amp: 0.16 });
        shaft(g, 7, 0.22 * w, [0xffffff, c.col], 0.13, { white: true });
        zapHit(c, mob, true); gRing(g, c.col, 3.6 * w * c.s, 0.45); scorch(g, 1.4 * w * c.s, 2.2);
        // forks crawl out over the ground from where it struck
        for (var f = 0; f < 6; f++) { var a = f / 6 * 6.283 + rr(-0.3, 0.3), e = V(g.x + Math.cos(a) * 2.2 * w, 0.1, g.z + Math.sin(a) * 1.8 * w); vx.lightning(V(g.x, 0.15, g.z), e, { w: 0.06, color: c.col, life: c.D(0.22), branches: 1, segs: 8, amp: 0.25 }); }
        sparks(q, [0xffffff, c.col], N(20, c), 9, { size: 0.2, stretch: 0.2, up: 1.5, life: 1.2 });
        c.hit(mob, frac, power); c.splash(mob, 1.9, 1, frac);
      }
      after(c.D(0.26), function () {
        sc.flash('rgba(220,240,255,1)', 0.7); sc.hitStop(0.08); sc.shake(0.5); sc.punch(0.1); fieldWave(gp(mob), c.col, 0.6, 0xffffff);
        strike(1, 0.75, 2.2);
      });
      after(c.D(0.42), function () { sc.flash('rgba(220,240,255,0.5)', 0.2); sc.shake(0.2); strike(0.55, 0.25, 1.2); });
    };
    // Thunderstorm: dark clouds roll in along the top of the screen and bolts come down one after another, each on a monster.
    S.storm = function (c) {
      sc.heroPose('raise', c.D(0.14), c.col); sc.dim(0.5, c.D(1.0));
      for (var i = 0; i < N(18, c); i++) { var g = fieldPt(0); g.z = rr(-3.5, 1.5); E({ sys: 'norm', pos: above(g, rr(4.3, 5.4)), vel: V(rr(0.3, 1.0), 0, 0), frame: 'smoke', color: [0x59607a, 0x2a2e40], size: [0.6, rr(1.5, 2.3)], ease: 1, life: c.D(0.95), delay: rr(0, c.D(0.15)), alpha: 0.75, fadeIn: 0.25, fadeOut: 0.7 }); }
      fieldRain(c, 46, c.D(0.7), { y: function () { return rr(2.5, 4.5); }, vel: function () { return V(-1.2, -11, 0.5); }, frames: ['streak'], cols: 0xbfd8ff, size: function () { return [rr(0.2, 0.3), 0.05]; }, life: 0.5, stretch: 0.1 });
      volley(c, { shots: 10, t0: 0.18, span: 0.52, fire: function (mob, frac, i) {
        if (!mob) return;
        skyBolt(c, function () { return mp(mob); }, c.s, { thin: i % 2, br: 1 });
        zapHit(c, mob, false); sc.flash('rgba(200,230,255,0.25)', 0.1); sc.shake(0.05);
        c.hit(mob, frac, 0.8);
      } });
    };
    // Ball lightning: a crackling orb hops from monster to monster, zapping each one it lands on.
    S.orb = function (c) {
      var list = c.pool(); if (!list.length) return;
      // (2026-11-16, the user: "keep it, but a lightning-orb bomb — a ball wrapped in lightning, thrown, bang bang bang with
      // a lightning impact"): the same ball hopping from monster to monster, now wrapped in bolts that crackle round it
      // all the time and growing a little with every hop; every time it comes down it goes off — a blue burst of
      // lightning swelling out of it, bolts running out over the ground, a ring, sparks, the screen shaking — and the last
      // one goes off biggest. Sizes no longer grow without end with the skill's size (skill level 50)
      sc.heroPose('thrust', c.D(0.12), c.col);
      var cs = Math.min(1.5, c.s), k = Math.max(1, Math.ceil(5 / list.length)), seq = []; for (var r = 0; r < k; r++) seq = seq.concat(list);
      var BOLT = [0xffffff, 0xbff4ff, c.col];
      // a ball of lightning going off at p (B: how big)
      function bang(p, B, mob) {
        var g = V(p.x, 0, p.z), burst = lightBall(c.col, 1.6, 0.5), bt = 0, BT = 0.2;
        tick(function (dt) { bt += dt; var e = Math.min(1, bt / BT), s = (0.25 + 0.75 * (1 - (1 - e) * (1 - e))) * 0.5 * B * cs * (1 - Math.max(0, (bt - BT * 0.6) / (BT * 0.4))); if (bt >= BT) { burst.kill(); return true; } burst.set(p, Math.max(0.001, s)); return false; });
        // bolts running out over the ground, and up off the ball
        for (var f = 0; f < Math.round(6 * B); f++) {
          var a = f / Math.round(6 * B) * 6.283 + rr(-0.25, 0.25), L = rr(1.0, 1.6) * B * cs, e2 = V(g.x + Math.cos(a) * L, 0.08, g.z + Math.sin(a) * L * 0.75);
          vx.lightning(V(g.x, 0.15, g.z), e2, { solid: true, w: 0.06 * cs, color: 0x3d8cff, core: 0.9, life: c.D(0.22), branches: 1, segs: 8, amp: 0.28 });
        }
        for (var u = 0; u < 3; u++) vx.lightning(p.clone(), p.clone().add(rdir(rr(0.6, 1.0) * B * cs)).add(V(0, 0.4, 0)), { w: 0.05 * cs, color: c.col, life: 0.1, branches: 0, segs: 6, amp: 0.3 });
        flare(p, 0xbff4ff, 1.1 * B * cs, 0.12); gRing(g, c.col, 2.2 * B * cs, 0.35); gGlow(g, c.col, 1.4 * B * cs, 0.3);
        sparks(p, BOLT, N(Math.round(10 * B), c), 7, { size: 0.16, stretch: 0.2, up: 1.2 });
        sc.light(p, c.col, 1.8 * B, 0.3); sc.shake(0.08 + 0.08 * B); sc.flash('rgba(190,235,255,' + (0.18 + 0.12 * B).toFixed(2) + ')', 0.12);
        if (mob) zapHit(c, mob, B > 1.2);
      }
      after(c.D(0.12), function () {
        var from = sc.heroPaw(), cur = from.clone(), i = 0, t = 0, seg = c.D(0.52 / seq.length + 0.04), to = mp(seq[0]);
        // the ball: 3D light, a white-hot heart in a blue-white glow, wrapped in bolts, a little bigger after every hop
        var bs = 0.3 * cs, ball = lightBall(c.col, 2.1, 0.55), tw = 0, grow = 1;
        function putBall(p) { tw += 0.016; var f = 1 + Math.sin(tw * 50) * 0.08; ball.set(p, bs * grow * f); }
        var rib = vx.ribbon({ solid: true, mode: 'trail', w: 0.12 * cs, color: c.deep, core: 0.9, maxPts: 14, shrink: 60 });
        flare(from, 0xbff4ff, 0.9 * cs, 0.12);
        tick(function (dt) {
          var mob = seq[i]; t += dt / seg; var kk = Math.min(1, t); to = mp(mob);
          cur.lerpVectors(from, to, kk); cur.y += Math.sin(kk * Math.PI) * 0.8;
          putBall(cur); if (rib) rib.head(cur);
          // the bolts wrapped round it: short arcs from one side of it to another, all the time
          var R = bs * grow * 1.25;
          if (Math.random() < dt * 60 * c.n) { var a1 = rdir(1).normalize().multiplyScalar(R), a2 = rdir(1).normalize().multiplyScalar(R); vx.lightning(cur.clone().add(a1), cur.clone().add(a2), { solid: true, w: 0.035 * cs, color: 0xbff4ff, core: 1.0, life: 0.06, branches: 0, segs: 5, amp: 0.35 }); }
          if (Math.random() < dt * 30 * c.n) vx.lightning(cur.clone(), cur.clone().add(rdir(R * 2.6)), { w: 0.04 * cs, color: c.col, life: 0.07, branches: 0, segs: 5, amp: 0.3 });
          if (kk < 1) return false;
          // it comes down: bang
          var last = i === seq.length - 1;
          bang(cur.clone(), last ? 1.7 : 1.0, mob);
          vx.lightning(from.clone(), to.clone(), { solid: true, w: 0.08 * cs, color: 0x3d8cff, core: 0.9, life: c.D(0.2), branches: 1, segs: 10, amp: 0.2 });
          c.hit(mob, 1 / k, last ? 1.4 : 1.1);
          i++; t = 0; from.copy(cur); grow = Math.min(1.5, grow + 0.1);
          if (i < seq.length) return false;
          ball.kill(); if (rib) rib.detach();
          if (sc.climax) sc.climax(0.35, 0.22);
          return true;
        });
      });
    };

    // =================================================================== 4차: 얼음
    // Ice lance: a spear of ice freezes together over the wizard's head and is hurled through one monster.
    S.lance = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      // real 3D (2026-11-16, 2nd: "a little more like a spear, sharper, long, thrown"): a long spear of clear ice — a slender
      // shaft and a diamond spearhead (js/mesh-ice.js iceLance) — crystallizes over the wizard from its back to its point,
      // is drawn back, and is hurled: it flies fast and a little arced, turning round its length, a thin white streak
      // behind it, and runs the monster through, its point driven into the ground beyond; sharp icicles burst up round the
      // monster's feet and the spear cracks into chips
      c.plain = true;
      sc.heroPose('thrust', c.D(0.3), c.col);
      var up = sc.heroCenter().add(V(0, 1.4, -0.2)), L = 2.05 * Math.min(1.25, c.s), W = 3.96 * Math.min(1.25, c.s), h = P3.bm('iceLance', { col: 0xeaf8ff });
      var q = new T.Quaternion(), R = new T.Quaternion(), dir = V(1, 0, 0), S3 = V(), foot = V(), QY = V(0, 1, 0), roll = 0;
      converge(up, [0xffffff, c.col], N(10, c), 1.0, c.D(0.22), { frame: 'snow' });
      // the spear with its back end at f, pointing along dir (turned roll round its length), k of its length grown
      function placeLance(f, k) { q.setFromUnitVectors(QY, dir).multiply(R.setFromAxisAngle(QY, roll)); S3.set(W, L * Math.max(0.02, k), W); h.set(f, q, S3, 1, 0); }
      var formT = 0, FORM = c.D(0.2), DRAW = c.D(0.1);
      tick(function (dt) {
        formT += dt; dir.copy(mp(mob)).sub(up).normalize();
        var k = Math.min(1, formT / FORM), back = Math.max(0, Math.min(1, (formT - FORM) / DRAW));
        // drawn back before the throw: pulled back along itself, its point lifted a little
        dir.y += 0.25 * back; dir.normalize();
        placeLance(foot.copy(up).addScaledVector(dir, -L * (0.5 + 0.25 * back)), 0.1 + 0.9 * (1 - (1 - k) * (1 - k)));
        if (Math.random() < dt * 30) E({ pos: up.clone().add(rdir(0.5)), vel: rdir(0.5), frame: 'snow', color: 0xffffff, size: rr(0.06, 0.11), life: 0.35, white: true, spin: 3 });
        return formT >= FORM + DRAW;
      });
      after(FORM + DRAW, function () {
        var from = up.clone().addScaledVector(dir, L * 0.25);
        sc.shake(0.06);
        homing({ from: from, to: function () { return mp(mob); }, time: c.D(0.16), arc: V(0, 0.5, 0), fancy: false, ease: function (x) { return x * (0.4 + 0.6 * x); }, heads: [],
          trail: { w: 0.09 * Math.min(1.3, c.s), col: 0xd8f2ff, core: 1.0, pts: 10, halo: false },
          emit: function (p, v, dt) {
            roll += dt * 18; if (v.lengthSq() > 1e-6) dir.copy(v).normalize();
            placeLance(foot.copy(p).addScaledVector(dir, -L), 1);
            if (Math.random() < dt * 40 * c.n) E({ pos: p.clone().addScaledVector(dir, -L * rr(0.2, 0.9)).add(rdir(0.06)), vel: rdir(0.5), frame: pick(['snow', 'dot']), color: 0xffffff, size: rr(0.05, 0.1), life: rr(0.25, 0.4), white: true, spin: 3 });
          },
          onHit: function (p) {
            // it runs the monster through: on past it and stays there, its point in the ground, then cracks
            var t = 0, HOLD = c.D(0.34), d0 = dir.clone(); if (d0.y > -0.3) { d0.y = -0.3; d0.normalize(); }
            tick(function (dt2) {
              t += dt2; var at = mp(mob), push = Math.min(1, t / 0.05); dir.copy(d0);
              placeLance(foot.copy(at).addScaledVector(d0, -L * (0.75 - 0.2 * push)), 1);
              if (t < HOLD) return false;
              h.kill(); K.iceChips(at.clone(), N(9, c), 3.2, 2.1, 0.22); return true;
            });
            K.iceCrown(c, mob, 1.2, 8); K.iceHitFx(c, p, 1.2);
            sc.flash('rgba(200,235,255,0.25)', 0.12); sc.shake(0.2); sc.punch(0.06);
            c.hit(mob, 1, 2);
          } });
      });
    };
    // Frost ring: frost bursts out from the wizard's feet and runs over the whole ground; each monster freezes as the ring reaches it.
    S.frostRing = function (c) {
      // (2026-11-16: the same ring, its ice sharp — K.sharpSpike and iceBurst's 3D spikes — in place of the blunt spikes)
      sc.heroPose('spin', c.D(0.12), c.col);
      var H = sc.heroCenter(), G = V(H.x, 0.04, H.z);
      converge(V(H.x, 0.3, H.z), [0xffffff, c.col], N(16, c), 1.4, c.D(0.14), { frame: 'snow' });
      after(c.D(0.14), function () {
        var r = 0;
        sc.flash('rgba(210,240,255,0.45)', 0.2); sc.punch(0.05); sc.shake(0.2);
        E({ sys: 'gadd', pos: G, frame: 'frost', color: 0xdff4ff, size: [0.6, 11], ease: 1, life: 0.95, fadeOut: 0.6, alpha: 0.7 });
        fieldWave(G, c.col, 0.75, 0xffffff); ring(H, 0xffffff, 3.2, 0.3);
        // a wall of cold mist (3D) rolls out over the ground and real 3D ice crystals stand up along it as it goes
        var wall = P3.ringWall({ kind: 'frost', alpha: 0.85 }), hw = 0.95 * Math.min(1.4, c.s);
        tick(function (dt) {
          r += 13 * c.sp * dt;
          wall.set(G, r, hw * (1 - 0.35 * Math.min(1, r / 10.5)), Math.max(0, (r - 7.5) / 3));
          for (var i = 0; i < N(7, c); i++) { var a = rr(0, 6.283), p = V(G.x + Math.cos(a) * r * 0.97, 0, G.z + Math.sin(a) * r * 0.97); if (Math.abs(p.x) < 4.2 && p.z > -4.8 && p.z < 4) { K.sharpSpike(p, { h: rr(0.42, 0.82) * Math.min(2.2, c.s), lean: rr(-0.3, 0.3), life: c.D(0.5) + 0.1, col: c.col }); if (i % 2) E({ sys: 'norm', pos: V(p.x, 0.15, p.z), vel: V(Math.cos(a) * 3, 0.3, Math.sin(a) * 3), frame: 'smoke', color: 0xe8f8ff, size: [0.3, 0.9], ease: 1, life: 0.6, alpha: 0.3, drag: 2 }); } }
          if (r > 10.5) { wall.kill(); return true; }
          return false;
        });
        ringHits(c, G, 13, 10.5, function (m) { iceBurst(c, m); sc.shake(0.05); c.hit(m, 1, 1.0); });
      });
    };
    // Glacier spikes: the staff is slammed down and cracks run along the ground to four monsters, small spikes shooting up
    // all the way, and a great spike comes up under each of them.
    S.spikes = function (c) {
      var list = c.pool(); if (!list.length) return;
      // real 3D (2026-11-16, 2nd: the first was crude, "no feel"): the staff is struck down and a ridge of sharp ice runs
      // along the ground to each monster — spikes shooting up one after another either side of the crack, leaning out
      // from it, taller as they go (like the frost ring's front) — and under the monster sharp icicles burst up all round
      // its feet, leaning outward (like the ice storm's), then sink, and chips fly
      c.plain = true;
      sc.heroPose('swipe', c.D(0.12), c.col);
      after(c.D(0.12), function () {
        var H = sc.heroCenter(), G0 = V(H.x, 0, H.z), S = Math.min(1.2, c.s);
        gRing(G0, c.col, 1.3, 0.3); dust(G0, N(4, c), 0.9); sc.shake(0.12);
        E({ sys: 'gadd', pos: V(G0.x, 0.04, G0.z), frame: 'frost', color: c.col, size: [0.2, 1.4], ease: 1, life: 0.7, fadeOut: 0.5, alpha: 0.6 });
        list.forEach(function (mob, i) {
          var t = 0, T_RUN = c.D(0.24 + i * 0.05), done = 0, to = gp(mob);
          tick(function (dt) {
            t += dt; var k = Math.min(1, t / T_RUN); to = gp(mob);
            while (done + 0.08 <= k) {
              done += 0.08;
              var d = to.clone().sub(G0).setY(0); if (d.lengthSq() < 1e-6) d.set(1, 0, 0); d.normalize();
              var nx = -d.z, nz = d.x, p = G0.clone().lerp(to, done), hh = (0.62 + 0.68 * done) * S;
              for (var sd = -1; sd <= 1; sd++) {
                var off = sd * rr(0.1, 0.18);
                K.iceRise('iceSpike2', V(p.x + nx * off, -0.04, p.z + nz * off), V(nx * sd * 0.5 + d.x * 0.25, 1, nz * sd * 0.5 + d.z * 0.25), hh * rr(0.8, 1.1) * (sd ? 1 : 1.15), { hold: c.D(0.32), melt: 0.22, w: 1.6 });
              }
              E({ sys: 'gadd', pos: V(p.x, 0.04, p.z), frame: 'frost', color: c.col, size: [0.15, 0.7], life: 0.6, alpha: 0.55, fadeOut: 0.5 });
            }
            if (k < 1) return false;
            K.iceCrown(c, mob, 1.4, 10);
            sc.shake(0.14); sc.light(mp(mob), c.col, 1.4, 0.3); if (!i) sc.flash('rgba(210,240,255,0.25)', 0.12);
            c.hit(mob, 1, 1.8);
            return true;
          });
        });
      });
    };

    // =================================================================== 5차: 별
    // Great comet: a ring closes in on one monster while the sky above lights up — and a single huge comet crashes down on it.
    S.comet = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('raise', c.D(0.2), c.col); sc.dim(0.45, c.D(1.0));
      var g0 = gp(mob);
      E({ sys: 'gadd', pos: V(g0.x, 0.04, g0.z), frame: 'ring', color: 0xffffff, size: [4.2, 0.8], life: c.D(0.5), rot: 0, alpha: 0.7, fadeIn: 0.2 });
      E({ pos: above(g0, 5.6).add(V(2.2, 0, 0)), frame: 'flare', color: [0xffffff, c.col], size: [0.1, 1.8], ease: 2, life: c.D(0.3), spin: 3, white: true });
      after(c.D(0.24), function () {
        // one great stone wrapped in golden fire (the meteor rain's 3D rock, bigger and gold), the ground under it
        // darkening as it comes, and star dust shed all the way down
        var land = mp(mob), from = above(gp(mob), 7.6).add(V(3.4, 0, 0)), cs = Math.min(1.6, c.s), R = 0.75 * cs;
        var rock = P3.rock({ size: R, col: 0xffe27a, hot: 0xffb030 }), spot = P3.mark({ col: 0xffd060 });
        homing({ from: from, to: function () { land = mp(mob); return land; }, time: c.D(0.3), ease: function (x) { return x * x; }, fancy: false, heads: [],
          emit: function (p, v, dt, k) {
            rock.set(p, v, dt); spot.set(land, k, R * 1.6);
            if (Math.random() < dt * 34 * c.n) trailFire(p, v, R, { size: 0.9 * c.s, speed: 0.6, up: 0.3, life: 0.6, cols: [0xffffff, 0xffe14a, 0xff8a2b] });
            if (Math.random() < dt * 60 * c.n) E({ pos: p.clone().addScaledVector(v, -R * 1.4 / Math.max(1e-4, v.length())).add(rdir(0.3)), vel: rdir(1.2), frame: pick(['star', 'flare', 'dot']), color: [0xffffff, c.col], size: [rr(0.14, 0.26), 0], life: rr(0.4, 0.7), spin: 5 });
          },
          onHit: function (p) {
            var g = V(p.x, 0.03, p.z);
            rock.kill(); spot.kill();
            // a golden blast: flash, crown of dirt, rising fireball, rolling ring, thrown rocks, a scorched hollow
            P3.impact(g, { size: 1.15 * cs, col: 0xffc84a, hot: 0xffa020, ringCol: 0xffe08a, dirt: new T.Color(K.dustCol()).lerp(new T.Color(0x4a382c), 0.75).getHex(), chips: 16, ring: 3.8 });
            fire(V(p.x, 0.3, p.z), N(14, c), { size: 0.9 * cs, speed: 3.6, up: 3.0, life: 0.7, cols: [0xffffff, 0xffe14a, 0xff9a2b] });
            sparks(p, [0xffffff, 0xffe080, 0xffb040], N(36, c), 8.5, { size: 0.18, up: 2.8, stretch: 0.12 });
            fieldWave(g, c.col, 0.8, 0xffffff); sc.light(p, 0xffd060, 3.0, 0.45);
            sc.flash('rgba(255,240,180,0.9)', 0.6); sc.slowmo(0.4, 0.45, true); sc.shake(0.7); sc.punch(0.13);
            for (var k = 0; k < N(16, c); k++) E({ sys: 'norm', pos: g.clone().add(V(0, 0.1, 0)), vel: rdir(4.5).add(V(0, 5, 0)), frame: 'dot', color: 0x3a2a2a, size: rr(0.08, 0.16), life: rr(0.6, 1), grav: 10, drag: 0.5 });
            // pieces of the comet skip away over the field
            for (var s = 0; s < N(10, c); s++) E({ pos: p.clone(), vel: V(rr(-7, 7), rr(3, 7), rr(-5, 5)), frame: 'star', color: [0xffffff, c.col], size: [rr(0.25, 0.4) * c.s, 0.05], life: rr(0.6, 1), grav: 9, drag: 0.6, spin: rr(-10, 10) });
            c.hit(mob, 1, 2.4); c.splash(mob, 2.1, 1.2);
          } });
      });
    };
    // Star barrage: the wizard pours a stream of stars out of its paw, a dozen in half a second, shared between three monsters.
    S.barrage = function (c) {
      // (2026-11-16, the user: "too fast, and you can't tell what it is"; made with the constellation's star, in colour):
      // the stars come out one after another in an arc over the wizard, twinkling, each its own colour; then they are shot
      // one at a time, each flying at its monster slowly enough to see, spinning, a trail of its colour behind it; where
      // one lands a ring and a burst of little stars of its colour. No big rings
      c.plain = true;
      sc.heroPose('raise', c.D(0.2), c.col);
      var H = sc.heroCenter(), M = Math.max(1, c.pool().length), n = Math.max(1, Math.ceil(12 / M)) * M, shown = [], T0 = 0.34, SPAN = 0.7;
      for (var i = 0; i < n; i++) (function (i) {
        var a = Math.PI * (0.1 + 0.8 * i / Math.max(1, n - 1)), col = K.STARC[i % K.STARC.length];
        // two rows of a wide fan over its head (packed in one row their glows ran together into a white band)
        var rw = i % 2 ? 1.55 : 2.15, p = V(H.x + Math.cos(a) * rw, H.y + 0.45 + Math.sin(a) * rw * 0.72, H.z - 0.25);
        after(c.D(i * (0.26 / n)), function () {
          shown[i] = { p: p, col: col, e: K.starAt(p, col, 0.56 * Math.min(1.3, c.s), 30, undefined, 0.22) };
          flare(p, col, 0.5, 0.08); sparks(p, [0xffffff, col], 2, 1.5, { size: 0.08 });
        });
      })(i);
      volley(c, { shots: n, t0: T0, span: SPAN, fire: function (mob, frac, i) {
        var s = shown[i]; if (s) kill(s.e);
        if (!mob) return;
        var from = s ? s.p.clone() : sc.heroPaw(), col = s ? s.col : K.STARC[i % K.STARC.length];
        flare(from, col, 0.6, 0.08);
        homing({ from: from, to: function () { return mp(mob); }, time: c.D(0.26), arc: V(0, rr(0.2, 0.6), rr(-0.2, 0.2)), fancy: false, ease: function (x) { return x * (0.5 + 0.5 * x); },
          trail: { w: 0.12 * Math.min(1.3, c.s), col: col, core: 1.0, pts: 14, halo: false }, heads: K.starHeads(col, 0.62 * Math.min(1.3, c.s)),
          onHit: function (p) { K.starBurst(c, p, col, 0.9); sc.shake(0.03); c.hit(mob, frac, 0.5); } });
      } });
      // any still waiting when the skill ends (fewer monsters than shots) go
      after(c.D(T0 + SPAN + 0.1), function () { shown.forEach(function (s) { if (s) kill(s.e); }); });
    };
    // Constellation: a star lights up over every monster and lines join them into a picture — then every star drops at the same moment.
    S.constel = function (c) {
      // (2026-11-16, the user: "it has no colour" — the stars are fine): each star its own colour (gold, sky blue, pink,
      // violet, mint) with a white heart, the lines glowing in their colours, each coming down in its colour with a trail of
      // it, and where it lands a ring and a burst of little stars of it — no white rings
      c.plain = true;
      sc.heroPose('raise', c.D(0.16), c.col); sc.dim(0.5, c.D(1.0));
      var list = c.pool(), marks = [], lines = [], T_DROP = c.D(0.46);
      function over(m) { return above(gp(m), 2.7 + (m.boss ? 0.8 : 0)); }
      list.forEach(function (m, i) {
        after(c.D(0.04 + i * (0.3 / list.length)), function () {
          if (!m.alive) return;
          var p = over(m), col = K.STARC[i % K.STARC.length], st = K.starAt(p, col, 0.75 * c.s, 30, function (q) { var o = over(m); q.x = o.x; q.y = o.y; q.z = o.z; return true; });
          marks.push({ m: m, p: st, col: col }); ring(p, col, 1.0 * c.s, 0.25); glow(p, col, [0.3, 1.2 * c.s], 0.3, { ease: 1, alpha: 0.6 });
          if (marks.length > 1) {
            var prev = marks[marks.length - 2].m, pts = [V(), V(), V()];
            var rb = vx.ribbon({ mode: 'static', hold: true, taper: 'bolt', pts: pts, w: 0.05, color: col, core: 1.2, alpha: 0.9, life: 30, upd: function (r) { var a = over(prev), b = over(m); r.pts[0].copy(a); r.pts[1].lerpVectors(a, b, 0.5); r.pts[2].copy(b); } });
            if (rb) lines.push(rb);
          }
        });
      });
      after(T_DROP, function () {
        marks.forEach(function (x) { kill(x.p); }); lines.forEach(function (r) { r.kill(); });
        sc.flash('rgba(210,190,255,0.45)', 0.25); sc.shake(0.3); sc.hitStop(0.05);
        c.pool().forEach(function (m, i) {
          var from = over(m), mk = marks.filter(function (x) { return x.m === m; })[0], col = mk ? mk.col : K.STARC[i % K.STARC.length];
          shaft(gp(m), 3.4, 0.12, [0xffffff, col], 0.22, { fadeOut: 0.4 });
          homing({ from: from, to: function () { return mp(m); }, time: c.D(0.1), fancy: false, trail: { w: 0.18 * c.s, col: col, core: 1.2, pts: 12, halo: false },
            heads: K.starHeads(col, 0.8 * c.s),
            onHit: function (p) { K.starBurst(c, p, col, 1.1); c.hit(m, 1, 1.4); } });
        });
      });
    };

    // =================================================================== 6차: 달
    // Crescent blades: three great crescents are cut loose across the whole field, one after another; each cuts every monster it passes.
    // Each blade is a real 3D crescent made in Blender (tools/blender/skills6_meshes.py): a thick rounded back, a thin
    // edge burning white-violet, a gleam running along it. It flies flat at waist height with its tips reaching from the
    // far side of the field to the near side, its edge a little raised, so its edge really sweeps through every monster:
    // a monster is hit the moment the edge (where it is drawn at that monster's depth) reaches it (2026-11-16: standing
    // up, the blade only covered the middle of the screen and the ones at the top and bottom were hit untouched).
    // Two fading afterimages follow it.
    S.crescents = function (c) {
      sc.heroPose('swipe', c.D(0.1), c.col); sc.dim(0.35, c.D(0.85));
      var dir = sc.heroState().faceT > 0 ? 1 : -1, cs = Math.min(1.25, c.s), SX = 1.7 * cs, SZ = 5.2, ST = 2.4 * cs, Y0 = 0.75, Z0 = -0.4;
      // laid out on the screen (2026-11-17, the camera turns): u across the screen, w toward the camera; Xv the way it flies
      var FS = sc.fromScreen || function (u, w) { return { x: u, z: w }; }, RX = FS(1, 0), FW = FS(0, 1), Xv = V(RX.x * dir, 0, RX.z * dir);
      function W(u, y, w, out) { var f = FS(u, w); return (out || V()).set(f.x, y, f.z); }
      function mu(m) { return m.x * RX.x + m.z * RX.z; }
      function mw(m) { return m.x * FW.x + m.z * FW.z; }
      // the blade's own x along the way it flies, its tips along the depth of the field, its thickness up
      var X = Xv.clone(), Zu = V(0, 1, 0), Yd = Zu.clone().cross(X), base = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X, Yd, Zu)), scl = V(SX, SZ, ST);
      // where its sharp edge is at depth z (the blade's outer arc: x = sqrt(1 - y²) of its own size, the tips at 0.2)
      function edgeX(x, z) { var ly = Math.abs(z - Z0) / SZ; return x + dir * SX * (ly < 0.978 ? Math.sqrt(1 - ly * ly) : 0.2); }
      for (var b = 0; b < 3; b++) (function (b) {
        after(c.D(0.1 + b * 0.13), function () {
          var x = -dir * (5.2 + SX), hit = [], P = W(x, Y0 + (b - 1) * 0.12, Z0), t = 0, roll = new T.Quaternion(), G = V();
          var blade = P3.bm('crescent', { col: 0xe6e0ff }), ghost = [P3.bm('crescent', { col: c.col, line: false }), P3.bm('crescent', { col: c.col, line: false })];
          sc.shake(0.08); if (!b) sc.flash('rgba(230,225,255,0.35)', 0.18);
          function cut(m) {
            hit.push(m);
            // no slash marks left on each monster (the user: the "/" lines drooping behind the blade, 2026-11-16)
            var q2 = mp(m);
            sparks(q2, [c.col, 0xffffff], N(6, c), 6, { dir: Xv.clone().setY(0.2), spread: 0.4, size: 0.2 * c.s, stretch: 0.12 });
            flare(q2, 0xffffff, 0.7 * c.s, 0.1, { white: true }); sc.shake(0.04);
            c.hit(m, 1 / 3, b === 2 ? 1.3 : 0.8);
          }
          tick(function (dt) {
            t += dt; x += dir * 21 * c.sp * dt; W(x, P.y, Z0, P);
            // the edge tipped up a little (so the face and its thickness show from above), rocking as it flies
            var grow = Math.min(1, t / 0.06), q = base.clone().multiply(roll.setFromAxisAngle(V(0, 1, 0), (0.3 + (b - 1) * 0.08 + Math.sin(t * 26 + b) * 0.05)));
            blade.set(P, q, scl.clone().multiplyScalar(0.35 + 0.65 * grow), 1, 0.7 + 0.3 * Math.sin(t * 40));
            for (var g = 0; g < 2; g++) { G.copy(P).addScaledVector(Xv, -(0.6 + 0.65 * g) * grow); ghost[g].set(G, q, scl.clone().multiplyScalar(0.98 - 0.05 * g), (g ? 0.2 : 0.38) * grow, 1); }
            // light shed off the edge all along it
            for (var i = 0; i < N(3, c); i++) { var z = rr(-4.4, 3.6); E({ pos: W(edgeX(x, z) - dir * rr(0, 0.5), P.y + rr(-0.2, 0.4), z), vel: Xv.clone().multiplyScalar(-rr(1, 3)).setY(rr(-0.3, 0.8)), frame: pick(['crescent', 'flare', 'dot']), color: [0xffffff, c.col], size: [rr(0.12, 0.28), 0.02], life: rr(0.25, 0.5), spin: rr(-6, 6) }); }
            c.pool().forEach(function (m) { if (hit.indexOf(m) < 0 && (mu(m) - edgeX(x, mw(m))) * dir <= 0) cut(m); });
            if ((x + dir * SX * 0.2) * dir < 5.8) return false;
            // any monster it did not pass (one that came on at the far edge) is cut as it goes
            c.pool().forEach(function (m) { if (hit.indexOf(m) < 0) cut(m); });
            blade.kill(); ghost.forEach(function (h) { h.kill(); }); return true;
          });
        });
      })(b);
    };
    // Moonfall: the full moon rises over one monster, hangs for a breath, and comes down on it. The moon is the real 3D
    // moon of the moon laser (lit ball with seas and a pale rim), growing as it rises; the ground under it darkens as it
    // comes; where it lands, a white-violet impact (flash, crown of dirt, rolling ring, thrown rocks, a scorched hollow).
    S.moonfall = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('raise', c.D(0.22), c.col); sc.dim(0.5, c.D(1.15));
      var cs = Math.min(1.6, c.s), t = 0, T_RISE = c.D(0.36), T_FALL = c.D(0.16), size = 0.1, P = above(gp(mob), 3.4), land = mp(mob), sky = P.clone();
      var moon3 = P3.moon({ lit: 0xfbf8ea, dark: 0x4a4070, rim: 0xd8d0ff, deep: c.col }), spot = P3.mark({ col: 0xc8c0ff });
      converge(sky, [0xffffff, c.col], N(22, c), 2.4, T_RISE);
      tick(function (dt) {
        t += dt;
        land = mp(mob);
        if (t < T_RISE) { var kr = t / T_RISE; size = (0.3 + 2.4 * (1 - (1 - kr) * (1 - kr))) * cs; sky = above(V(land.x, 0, land.z), 3.4); P.copy(sky); P.y += Math.sin(t * 9) * 0.05; }
        else { var kf = Math.min(1, (t - T_RISE) / T_FALL); P.lerpVectors(sky, land, kf * kf); }
        moon3.set(P, size * 0.5, dt); spot.set(V(land.x, 0, land.z), Math.min(1, t / (T_RISE + T_FALL)), 1.4 * cs);
        if (t < T_RISE + T_FALL) return false;
        moon3.kill(); spot.kill();
        var g = V(land.x, 0.03, land.z);
        sc.flash('rgba(230,224,255,1)', 0.5); sc.hitStop(0.09); sc.slowmo(0.2, 0.4); sc.shake(0.6); sc.punch(0.12);
        P3.impact(g, { size: 1.3 * cs, col: 0x9a86ff, hot: 0xe8e0ff, ringCol: 0xc8b8ff, calm: 0.85, dirt: new T.Color(K.dustCol()).lerp(new T.Color(0x3a3448), 0.7).getHex(), chips: 14, ring: 3.6 });
        // the rings run violet, not white (white ones stacked on the flash wash the picture out)
        shock(land, 0xb8a8ff, 8.5, 0.65, { delay: 0.05 }); fieldWave(g, 0x9a86ff, 0.8, 0xd8d0ff); dust(g, N(12, c), 2);
        for (var s = 0; s < N(20, c); s++) E({ sys: s % 2 ? 'col' : 'add', pos: land.clone().add(rdir(0.4)), vel: V(rr(-8, 8), rr(2, 7), rr(-5, 5)), frame: pick(['crescent', 'dot', 'shard']), color: [0xffffff, 0xf6f2dc, c.col], size: [rr(0.2, 0.4) * cs, 0.05], life: rr(0.6, 1.1), grav: 9, drag: 0.6, spin: rr(-10, 10) });
        sparks(land, [0xffffff, c.col], N(30, c), 10, { size: 0.26, stretch: 0.14, life: 1.2 }); sc.light(land, c.col, 2.4, 0.5);
        c.hit(mob, 1, 2.6); c.splash(mob, 2.3, 1.4);
        return true;
      });
    };
    // Moon orbs: five small moons rise around the wizard and each one fires its own thin beam into a monster.
    S.moonOrbs = function (c) {
      var list = c.pool(); if (!list.length) return;
      // (2026-11-16, the user: "well made, but the moons can hardly be seen — bigger moons, and more of a laser"): the moons
      // are twice the size and spread wider round the wizard; each gathers light before it fires (it brightens, light
      // streams into it), then fires a thick beam of moonlight that hums (its width flickers) and is held longer, the moon
      // pushed back a little by it, the monster burning where it is held (sparks pouring off it); the flashes and rings no
      // longer grow with the skill's size (at skill level 50 they hid the moons) and are in the moon's colour
      sc.heroPose('raise', c.D(0.16), c.col); sc.dim(0.4, c.D(1.0));
      var cs = Math.min(1.5, c.s), H = sc.heroCenter(), shots = share(list, Math.max(5, list.length)), MOON = [0xffffff, 0xd8ccff, c.col];
      shots.forEach(function (h, i) {
        var n = shots.length, a = Math.PI * (0.12 + 0.76 * (n > 1 ? i / (n - 1) : 0.5)), O = V(H.x + Math.cos(a) * 2.15, H.y + 0.75 + Math.sin(a) * 1.15, H.z - 0.25);
        var moon = null, done = false, R = 0.3 * cs, P = V(), push = V(), charge = 0;
        after(c.D(i * 0.04), function () {
          moon = P3.moon({ lit: 0xfbf8ea, dark: 0x4a4070, rim: 0xd8d0ff, deep: c.col });
          ring(O, c.col, 0.9 * cs, 0.22);
          var t = 0, gone = 0;
          tick(function (dt) {
            t += dt; if (done) gone += dt;
            var g = Math.min(1, t / c.D(0.12)), s = R * (g < 1 ? (1 - (1 - g) * (1 - g)) * 1.12 : 1) * (1 + 0.12 * charge) * Math.max(0, 1 - gone / c.D(0.16));
            P.copy(O).add(push); P.y += Math.sin(t * 6 + i) * 0.06; push.multiplyScalar(Math.max(0, 1 - dt * 8)); moon.set(P, Math.max(0.001, s), dt);
            if (done && gone >= c.D(0.16)) { moon.kill(); return true; }
            return false;
          });
        });
        // gathering light before it fires: light streams into the moon and it brightens
        var T_FIRE = 0.3 + i * 0.07;
        after(c.D(T_FIRE - 0.14), function () {
          var gt = 0; glow(O, c.col, [0.3, 1.1 * cs], c.D(0.16), { fadeIn: 0.7, alpha: 0.7 });
          tick(function (dt) {
            gt += dt; charge = Math.min(1, gt / c.D(0.14));
            if (Math.random() < dt * 60 * c.n) { var d = rdir(rr(0.7, 1.2)); E({ pos: P.clone().add(d), vel: d.clone().multiplyScalar(-1 / 0.14), frame: pick(['streak', 'dot']), color: MOON, size: [rr(0.1, 0.2), 0.03], life: 0.14, stretch: 0.06, fadeIn: 0.3 }); }
            return gt >= c.D(0.14);
          });
        });
        after(c.D(T_FIRE), function () {
          var mob = h.mob, st = { a: O.clone(), b: O.clone(), open: 1 }, beam = P3.beam({ col: 0xd8ccff, deep: 0x6a4cff, r: 0.15 * cs }), t = 0, T_OUT = c.D(0.05), T_HOLD = c.D(0.32), T_END = c.D(0.1), hits = 0, to = mp(mob), dir = V();
          flare(O, 0xe8e0ff, 0.9 * cs, 0.1); charge = 0;
          // the kick: the moon is pushed back from the way it fires
          dir.copy(to).sub(O).normalize(); push.copy(dir).multiplyScalar(-0.18);
          tick(function (dt) {
            t += dt; to = mp(mob);
            st.b.lerpVectors(O, to, Math.min(1, t / T_OUT));
            // the beam hums: its width flickers while it is held, then it closes
            st.open = t > T_OUT + T_HOLD ? Math.max(0, 1 - (t - T_OUT - T_HOLD) / T_END) : 1 + 0.14 * Math.sin(t * 70) + 0.06 * Math.sin(t * 131);
            st.a.copy(P); beam.set(st.a, st.b, st.open);
            if (t >= T_OUT && t < T_OUT + T_HOLD) {
              // the monster burns where it is held: sparks pour off it, a little light at the moon's end
              if (Math.random() < dt * 40 * c.n) E({ pos: to.clone().add(rdir(0.12)), vel: rdir(rr(2, 4)).add(V(0, 1.5, 0)), frame: pick(['dot', 'streak']), color: MOON, size: [rr(0.08, 0.14), 0], life: rr(0.2, 0.4), grav: 3, stretch: 0.06 });
              if (Math.random() < dt * 20) glow(P.clone(), c.col, [0.4, 0.7 * cs], 0.08, { alpha: 0.6 });
            }
            // the beam burns twice while it is held on the monster
            if ((hits === 0 && t >= T_OUT) || (hits === 1 && t >= T_OUT + T_HOLD * 0.6)) {
              hits++;
              flare(to, 0xe8e0ff, 0.9 * cs, 0.12); sparks(to, [0xffffff, c.col], N(6, c), 5, { size: 0.16 });
              if (hits === 1) { ring(to, c.col, 1.0 * cs, 0.22); sc.light(to, c.col, 1.4, 0.35); sc.shake(0.06); }
              c.hit(mob, h.frac / 2, hits === 1 ? 1.1 : 0.7);
            }
            if (t < T_OUT + T_HOLD + T_END) return false;
            beam.kill(); done = true; sparks(O, [0xffffff, c.col], N(5, c), 3, { size: 0.14 });
            return true;
          });
        });
      });
    };

    // =================================================================== 7차: 태양
    // Sun spear: a spear of sunlight is drawn out of the air and thrown straight through one monster; then it bursts.
    S.sunspear = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      // real 3D (2026-11-16, the user: "it is the sun — flashing like the sun; thrown like the ice lance, as if throwing
      // the sun, like hurling a bolt of lightning; where the ice lance freezes, this one goes off — bang — like the solar
      // burst"): light streams together over the wizard and a spear of sunlight grows there — a gold-white body
      // flickering like the sun (js/fx3d.js FS_BM.sunspear on the ice lance's shape), its point a ball of the sun's fire
      // whose flames stream back along it; it is drawn back and hurled fast and nearly straight, crackling with golden
      // bolts, a golden streak behind it; it runs into the monster, the sun at its point swells, and bang: a flash, the
      // world catching its breath, rays of light, a ring of heat, a crown of golden fire, burning bits thrown wide.
      // No magic circle, no screen-wide rings
      c.plain = true;
      sc.heroPose('thrust', c.D(0.3), c.col); sc.dim(0.4, c.D(1.0));
      var cs = Math.min(1.25, c.s), up = sc.heroCenter().add(V(0, 1.45, -0.2)), L = 1.95 * cs, W = 2.6 * cs, h = P3.bm('sunLance', { col: 0xffffff });
      var head = K.toonBall(0.85 * cs, { kind: 'sun', glow: 1.2, thick: true }), halo = P3.orb({ col: 0xffd84a, deep: 0xff8a20, alpha: 0.45, order: 6 });
      var q = new T.Quaternion(), R = new T.Quaternion(), dir = V(1, 0, 0), S3 = V(), foot = V(), tipP = V(), QY = V(0, 1, 0), roll = 0, tt = 0, GOLD = [0xffffff, 0xffe14a, 0xff9a2b];
      // the spear with its back end at f, pointing along dir, k of its length grown; the sun at its point (sk its size)
      function placeSpear(f, k, sk, dt) {
        q.setFromUnitVectors(QY, dir).multiply(R.setFromAxisAngle(QY, roll)); S3.set(W, L * Math.max(0.02, k), W); h.set(f, q, S3, 1, 0);
        tipP.copy(f).addScaledVector(dir, L * k);
        var fl = 1 + 0.12 * Math.sin(tt * 47) * Math.sin(tt * 29);
        // the sun skewered on it just behind the head (its middle at 0.56 of the spear): the sharp point stands out in front
        var sunAt = tipP.clone().addScaledVector(dir, -0.44 * L * Math.min(1, k));
        head.set(sunAt, dir.clone().multiplyScalar(10), dt, sk * fl);
        halo.set(sunAt, (0.55 + 0.14 * Math.sin(tt * 38)) * cs * sk);
      }
      // little golden bolts crackling round it
      function crackle(n) {
        for (var i = 0; i < n; i++) { var a = tipP.clone().addScaledVector(dir, -L * rr(0, 0.8)).add(rdir(0.12)); vx.lightning(a, a.clone().add(rdir(rr(0.35, 0.7))), { w: 0.035 * cs, color: 0xffd84a, life: 0.07, branches: 0, segs: 5, amp: 0.3 }); }
      }
      var formT = 0, FORM = c.D(0.22), DRAW = c.D(0.1);
      tick(function (dt) {
        formT += dt; tt += dt; dir.copy(mp(mob)).sub(up).normalize();
        var k = Math.min(1, formT / FORM), back = Math.max(0, Math.min(1, (formT - FORM) / DRAW)), e = 1 - (1 - k) * (1 - k);
        // drawn back before the throw: pulled back along itself, its point lifted a little
        dir.y += 0.25 * back; dir.normalize();
        placeSpear(foot.copy(up).addScaledVector(dir, -L * (0.5 + 0.25 * back)), 0.1 + 0.9 * e, 0.3 + 0.7 * e, dt);
        // sunlight streams in from every side while it forms; it flashes and crackles
        if (k < 1 && Math.random() < dt * 80 * c.n) { var d = rdir(rr(1.6, 2.8)); d.z *= 0.3; E({ pos: tipP.clone().add(d), vel: d.clone().multiplyScalar(-1 / 0.2), frame: pick(['streak', 'dot']), color: GOLD, size: [rr(0.12, 0.24), 0.03], life: 0.2, stretch: 0.07, fadeIn: 0.3 }); }
        if (Math.random() < dt * 14) { flare(tipP.clone().add(rdir(0.15)), 0xfff2b0, rr(0.5, 0.9) * cs, 0.07); crackle(1); }
        return formT >= FORM + DRAW;
      });
      after(FORM + DRAW, function () {
        var from = tipP.clone();
        flare(from, 0xffffff, 1.0 * cs, 0.1, { white: true }); sc.shake(0.08); sc.punch(0.04); crackle(3);
        homing({ from: from, to: function () { return mp(mob); }, time: Math.max(0.1, c.D(0.13)), arc: V(0, 0.3, 0), fancy: false, ease: function (x) { return x * (0.5 + 0.5 * x); }, heads: [],
          trail: { w: 0.12 * cs, col: 0xffd060, core: 1.0, pts: 12, halo: true },
          emit: function (p, v, dt) {
            tt += dt; roll += dt * 14; if (v.lengthSq() > 1e-6) dir.copy(v).normalize();
            placeSpear(foot.copy(p).addScaledVector(dir, -L), 1, 1, dt);
            if (Math.random() < dt * 40) crackle(1);
            if (Math.random() < dt * 90 * c.n) E({ pos: p.clone().addScaledVector(dir, -L * rr(0.1, 0.9)).add(rdir(0.08)), vel: dir.clone().multiplyScalar(-3).add(rdir(1)), frame: pick(['streak', 'flare', 'dot']), color: GOLD, size: [rr(0.12, 0.26), 0.03], life: rr(0.18, 0.35), stretch: 0.08 });
          },
          onHit: function (p) {
            // it runs in (the game's impact, as before): a flash, a catch, a ring of light, sparks thrown on the way it went;
            // the first of the damage now, and the sun on it swells for a beat
            sc.flash('rgba(255,235,160,0.5)', 0.4); sc.hitStop(0.07); sc.shake(0.4);
            flare(p, 0xffe08a, 1.5 * c.s, 0.16); shock(p, 0xffd84a, 3.6 * c.s, 0.35);
            sparks(p, [0xffffff, 0xffe14a, 0xff8a2b], N(26, c), 11, { dir: dir, spread: 0.5, size: 0.26, stretch: 0.16, life: 1.1 });
            c.hit(mob, 0.6, 2.2);
            var t = 0, BEAT = c.D(0.14), d0 = dir.clone(); if (d0.y > -0.3) { d0.y = -0.3; d0.normalize(); }
            tick(function (dt2) {
              t += dt2; tt += dt2; var at = mp(mob), kb = Math.min(1, t / BEAT); dir.copy(d0);
              placeSpear(foot.copy(at).addScaledVector(d0, -L * 0.72), 1, 1 + 0.9 * kb * kb, dt2);
              if (Math.random() < dt2 * 60) crackle(1);
              if (t < BEAT) return false;
              sunBang(at); return true;
            });
          } });
      });
      // then it goes off (the game's impact, as before): a pillar of light shooting up out of the ground, open and closed
      // again in 0.36 s, over a golden blast, a ring of light, fire and embers
      function sunBang(at) {
        h.kill(); head.kill(); halo.kill();
        var q = at, g = V(q.x, 0, q.z), top = g.clone(), pT = 0, PL = 0.36;
        var pillar = P3.beam({ col: 0xffd060, deep: 0xff7a1a, r: 0.24 * Math.min(1.5, c.s) });
        tick(function (dt2) {
          pT += dt2; var kp = Math.min(1, pT / PL);
          top.set(g.x, 7 * Math.min(1, pT / 0.08), g.z);
          pillar.set(g, top, kp < 0.25 ? kp / 0.25 : Math.max(0, 1 - (kp - 0.25) / 0.75));
          if (kp < 1) return false; pillar.kill(); return true;
        });
        P3.blast(g, { size: 0.75 * Math.min(1.5, c.s), col: 0xffc84a, low: 0x7a3a08, hotness: 0.35, flash: true, chips: 4, hot: 0xffd060, ring: 2.6, life: 0.7, crater: false });
        shock(q, 0xfff2a0, 5 * c.s, 0.45); gRing(g, 0xffd84a, 4.6 * c.s, 0.5); scorch(g, 1.6, 2.4); fieldWave(g, 0xffd84a, 0.6, 0xff9a40);
        fire(q, N(12, c), { size: 1.1 * c.s, speed: 3, up: 3 }); embers(q, [0xffe080, 0xff6a2b], N(14, c), { speed: 3.5, up: 3 });
        sc.flash('rgba(255,225,150,0.5)', 0.4); sc.shake(0.4); sc.light(q, 0xffe080, 2.4, 0.5);
        c.hit(mob, 0.4, 2);
      }
    };
    // Sunlight arrows: a small sun opens high to one side and looses arrow after arrow of light, each one into a monster.
    // The sun is the solar burst's real 3D sun; every arrow is a 3D arrow made in Blender (a faceted gold head, a shaft
    // of light, vanes of orange light) that flies at its monster pointing the way it goes, and stays stuck in it a moment.
    S.sunArrows = function (c) {
      sc.heroPose('raise', c.D(0.14), c.col);
      // high to one side of the screen, a little beyond the fight, whichever way the camera looks (2026-11-17)
      var side = sc.heroState().faceT > 0 ? -1 : 1, sunAt = sc.fromScreen ? sc.fromScreen(0.9 * side, -1.2) : { x: 0.9 * side, z: -1.2 }, sun = above(V(sunAt.x, 0, sunAt.z), 4.0), life = c.D(0.85), st = 0, R = 0.5 * Math.min(1.4, c.s);
      var sunBall = P3.moon({ lit: 0xfff0a0, dark: 0xff7a1a, rim: 0xffd84a, deep: 0xff8a20, solid: true, line: 0x7a3006, glowA: 0.5, spin: 1.5 });
      converge(sun, [0xffffff, 0xffd84a, 0xff9a40], N(14, c), 1.6, c.D(0.14));
      tick(function (dt) {
        st += dt; var g = Math.min(1, st / c.D(0.14)), out = Math.max(0, (st - life * 0.82) / (life * 0.18));
        sunBall.set(sun, Math.max(0.001, R * (1 - (1 - g) * (1 - g)) * (1 - Math.min(1, out))), dt);
        if (Math.random() < dt * 30 * c.n) E({ pos: sun.clone().add(rdir(R * 1.1)), vel: rdir(1.5), frame: pick(['flare', 'dot']), color: [0xffffff, 0xffd84a], size: [rr(0.1, 0.2), 0.02], life: 0.35 });
        if (out < 1) return false; sunBall.kill(); return true;
      });
      volley(c, { shots: 14, t0: 0.17, span: 0.5, fire: function (mob, frac) {
        if (!mob) return;
        var from = sun.clone().add(rdir(0.35)), L = 1.1 * Math.min(1.3, c.s), arrow = P3.bm('arrow', { col: 0xffd04a }), scl = V(L * 1.6, L, L * 1.6), D = V(0, -1, 0);
        flare(from, 0xffffff, 0.5, 0.08, { white: true });
        homing({ from: from, to: function () { mob = liveTarget(mob); return mp(mob); }, time: Math.max(0.12, c.D(0.18)), fancy: false,
          trail: { w: 0.07 * c.s, col: 0xffd84a, core: 1.4, pts: 12, shrink: 90, halo: false },
          heads: [],
          emit: function (p, v) { if (v.lengthSq() > 1e-6) D.copy(v).normalize(); arrow.set(p.clone().addScaledVector(D, -L * 0.92), alongQ(D), scl, 1, 0); },
          onHit: function (p) {
            var g = V(p.x, 0, p.z);
            flare(p, 0xffffff, 0.9 * c.s, 0.1, { white: true });
            sparks(p, [0xffffff, 0xffe14a, 0xff9a40], N(7, c), 5.5, { size: 0.18, up: 1.5 }); gRing(g, 0xffd84a, 1.5 * c.s, 0.3); fire(p, N(2, c), { size: 0.7, speed: 1.4, up: 1.6 });
            sc.light(p, 0xffe080, 1.2, 0.25); sc.shake(0.04);
            c.hit(mob, frac, 0.8);
            // stuck in the monster (it moves with it), its tip a quarter in; then it burns away
            var last = mp(mob), off = p.clone().addScaledVector(D, -L * 0.72).sub(last), q = alongQ(D), at = 0, HOLD = c.D(0.3), FADE = c.D(0.16);
            tick(function (dt) {
              at += dt; last = mp(mob);
              var a = at < HOLD ? 1 : Math.max(0, 1 - (at - HOLD) / FADE);
              arrow.set(last.clone().add(off), q, scl, a, 0);
              if (a > 0) return false; arrow.kill(); return true;
            });
          } });
      } });
    };
    // Corona ring: a small sun is drawn together over the wizard, swells, and bursts — and the edge of that burst is a ring
    // of the sun's fire that tears outward over the whole ground, great tongues of flame (prominences) looping off it.
    // (2026-11-16, the user: "홍염 고리가 애매하고 임팩트가 없어 — 태양의 고리가 번쩍 터지면서 번지는 느낌으로": it was a
    // screen-wide yellow fog round the wizard and a thin orange band; chose "a small sun bursts and becomes the ring")
    S.corona = function (c) {
      sc.heroPose('raise', c.D(0.3), c.col); sc.dim(0.3, c.D(0.3) + 1.0);
      var H = sc.heroCenter(), G = V(H.x, 0.04, H.z), cs = Math.min(1.3, c.s), sunP = H.clone().add(V(0, 1.25, -0.1));
      var GOLD = [0xffffff, 0xffe14a, 0xff9a2b], FORM = c.D(0.2), SWELL = c.D(0.1), t = 0, tt = 0, R = 0.55 * cs, spin = rr(0, 6.283);
      // the sun (2026-11-16, the user "태양 느낌을 살려보자": a plain ball of light read as a lamp): a ball of the sun's toon
      // fire — two of the Blender fire domes back to back, their flames boiling up over the top and down under the bottom,
      // turning — round a white-hot heart, in a gold halo; long rays of sunlight flicker out of it all round, loops of flame
      // (prominences) leap off its rim and fall back, and it lights everything round it gold. (Tried before: the sun spear's
      // ball of fire, a teardrop made to fly, read as a drop of flame standing still; the sun arrows' 3D sun has the moon's
      // dark seas on it and read as a moon)
      // (the Blender fire dome, js/mesh-fire.js 'boom', is 0.9 high and about half as wide at scale 1: widened 1.8 times
      // so the two make a round ball; its flame streaks hardly wind, so they flare outward like the sun's surface — wound round
      // more it read as a hairy cocoon, then a pinwheel)
      var UP = V(0, 1, 0), DN = V(0, -1, 0), GH = 0.9, GW = 1.8;
      var shellU = P3.toonFire('boom', { kind: 'sun', tw: 0.35, rise: 2.4, band: 0.28, lift: 0.0, glow: 1.0 }), shellD = P3.toonFire('boom', { kind: 'sun', tw: -0.35, rise: 2.4, band: 0.28, lift: 0.0, glow: 1.0 });
      var heart = lightBall(0xffd040, 1.5, 0.55), halo = P3.orb({ col: 0xffd84a, deep: 0xff8a20, alpha: 0.4, order: 6 });
      var cq = sc.camera.quaternion, ux = V(1, 0, 0).applyQuaternion(cq), uy = V(0, 1, 0).applyQuaternion(cq);
      function rim(a, d, rk) { return sunP.clone().addScaledVector(ux, Math.cos(a) * rk * d).addScaledVector(uy, Math.sin(a) * rk * d); }
      converge(sunP, GOLD, N(18, c), 2.1, FORM); sc.light(sunP, 0xffd080, 1.8, FORM + SWELL + 0.1);
      tick(function (dt) {
        t += dt; tt += dt; spin += dt * 2.6;
        // drawn together (0.15 → 1), then it swells hard and flickers just before it goes
        var k = Math.min(1, t / FORM), e = 1 - (1 - k) * (1 - k), sw = Math.max(0, Math.min(1, (t - FORM) / SWELL));
        var fl = 1 + (0.04 + 0.07 * sw) * Math.sin(tt * 47) * Math.sin(tt * 29), rk = R * (0.15 + 0.85 * e) * (1 + 0.45 * sw * sw) * fl;
        shellU.set(sunP, GH * rk, spin, 0, 0, 0, GW * rk, UP); shellD.set(sunP, GH * rk, -spin * 0.8 + 1.3, 0, 0, 0, GW * rk, DN);
        heart.set(sunP, rk * 0.85); halo.set(sunP, rk * (2.7 + 0.4 * Math.sin(tt * 38)));
        // rays of sunlight: long beams flickering out through it at every angle, longer as it swells
        if (Math.random() < dt * (40 + 50 * sw)) { var L = rk * rr(3.4, 5) * (1 + 0.5 * sw); E({ pos: sunP, frame: 'streak', color: [0xffffff, 0xffd060], size: [L, L], ar: 0.07, rot: rr(0, 3.1416), life: rr(0.1, 0.18), alpha: rr(0.6, 0.9), fadeIn: 0.25, fadeOut: 0.5 }); }
        if (Math.random() < dt * (10 + 30 * sw)) flare(sunP.clone().add(rdir(0.5 * rk)), 0xfff2b0, rr(0.5, 0.9) * cs * (1 + sw), 0.07);
        // prominences: a loop of flame leaps off the rim and falls back (in the screen's plane)
        if (Math.random() < dt * 26) {
          var a0 = rr(0, 6.283), da = rr(0.45, 0.8), lb = new T.QuadraticBezierCurve3(rim(a0, 0.9, rk), rim(a0 + da / 2, rr(2.0, 2.8), rk), rim(a0 + da, 0.9, rk)), lp = [];
          for (var s0 = 0; s0 <= 8; s0++) lp.push(lb.getPoint(s0 / 8));
          vx.ribbon({ mode: 'static', sweep: true, pts: lp, w: 0.2 * rk, color: 0xff9a20, core: 0, alpha: 0.7, life: 0.24 });
          vx.ribbon({ mode: 'static', sweep: true, pts: lp, w: 0.08 * rk, color: 0xffe070, core: 1.3, life: 0.24 });
        }
        if (sw > 0 && Math.random() < dt * 40) { var a1 = sunP.clone().add(rdir(1.3 * rk)); vx.lightning(a1, a1.clone().add(rdir(rr(0.4, 0.8))), { w: 0.04 * cs, color: 0xffd84a, life: 0.07, branches: 0, segs: 5, amp: 0.3 }); }
        if (t < FORM + SWELL) return false;
        shellU.kill(); shellD.kill(); heart.kill(); halo.kill(); burst(); return true;
      });
      function burst() {
        // bang: a white flash and a catch, rays of light thrown out of it, a crown of the sun's fire bursting up off the ground
        sc.flash('rgba(255,240,190,0.6)', 0.3); sc.hitStop(0.07); sc.shake(0.5); sc.punch(0.1);
        flare(sunP, 0xffffff, 2.6, 0.2, { white: true }); glow(sunP, 0xffd060, [0.6, 2.6], 0.3, { ease: 1, alpha: 0.8 });
        // (no crown of fire or glow on the ground here: they filled the middle of the screen with a mass of orange that went
        // muddy on snow — the burst is light, and the fire is the ring)
        shock(sunP, 0xfff2a0, 4.5 * cs, 0.4); gRing(G, 0xffd84a, 4 * cs, 0.45);
        // sunlight thrown out of it: long beams at every angle shooting out across the field
        for (var i = 0; i < 14; i++) E({ pos: sunP, frame: 'streak', color: [0xffffff, 0xffd84a], size: [0.6, rr(4.2, 5.6) * cs], ar: 0.06, ease: 1, life: 0.38, rot: i / 14 * 3.1416 + rr(-0.08, 0.08), alpha: 0.85, fadeOut: 0.45 });
        sparks(sunP, GOLD, N(16, c), 9, { size: 0.24, stretch: 0.14, life: 1.0 });
        for (var b = 0; b < N(10, c); b++) E({ sys: b % 2 ? 'col' : 'add', pos: sunP.clone().add(rdir(0.3)), vel: V(rr(-5, 5), rr(1.5, 5), rr(-3, 3)), frame: 'flame', color: [0xfff0a0, 0xffa020, 0xe8601a], size: [rr(0.3, 0.45) * cs, 0.08], life: rr(0.6, 0.9), grav: 9, drag: 0.6, spin: rr(-5, 5), fadeOut: 0.3 });
        sc.light(sunP, 0xffe080, 2.6, 0.5);
        // the ring: the sun's fire standing round the burst and pushed out over the ground, with a lower white-gold band of
        // heat just inside it so it reads as burning light rather than a band of smoke
        // (on bright ground — snow, sand — deeper colours: the pale ones went to a cream band of smoke on white)
        var br = vx.isBright && vx.isBright(), r = 0.6;
        var wall = P3.ringWall(br ? { kind: 'sun', col: 0xff8410, heat: 0.45 } : { kind: 'sun', col: 0xff9a20, heat: 0.75 });
        var core = P3.ringWall(br ? { kind: 'sun', col: 0xffc030, lo: 0xe8600a, heat: 0.9, alpha: 0.95 } : { kind: 'sun', col: 0xfff2b0, lo: 0xff9a20, heat: 1.5, alpha: 0.95 });
        var hw = 1.7 * Math.min(1.4, c.s), RING_V = 9, END = 10.5;
        tick(function (dt) {
          // the ring grows at the same pace whatever the cast speed (2026-11-16, user "홍염의 고리도 잘 안 보여": at speed x2 it
          // crossed the whole screen in 0.4 s, under a fog of big painted flame puffs)
          r += RING_V * dt;
          var h = hw * (1 - 0.3 * Math.min(1, r / END)), kOut = Math.max(0, (r - 7.5) / 3);
          wall.set(G, r, h, kOut); core.set(G, r * 0.97, h * 0.5, Math.min(1, kOut * 1.2));
          if (r > END) { wall.kill(); core.kill(); }
          for (var j = 0; j < N(1, c); j++) {
            var a = rr(0, 6.283), p = V(G.x + Math.cos(a) * r, 0.3, G.z + Math.sin(a) * r);
            if (Math.abs(p.x) > 4.4 || p.z < -5 || p.z > 4.2) continue;
            fire(p, 1, { size: rr(0.45, 0.65) * Math.min(1.4, c.s), speed: 0.5, up: 3.2, life: 0.75, v: V(Math.cos(a) * 4, 0, Math.sin(a) * 4), cols: [0xfff0a0, 0xffc040, 0xff8a20, 0xd2501a] });
          }
          // prominences: great loops of flame rising off the ring and falling back into it — an orange glow round a white-gold
          // core, drawn up from one foot to the other
          // (as tall as they are wide, so near the middle, where the ring is small, they stay small loops, not spikes)
          if (r > 1.5 && Math.random() < dt * 30) {
            var a1 = rr(0, 6.283), span = rr(0.3, 0.5), p1 = V(G.x + Math.cos(a1) * r, 0.2, G.z + Math.sin(a1) * r), p2 = V(G.x + Math.cos(a1 + span) * r, 0.2, G.z + Math.sin(a1 + span) * r);
            if (Math.abs(p1.x) < 4.4 && p1.z > -5 && p1.z < 4.2) {
              var lift = Math.max(0.6, Math.min(2.2, p1.distanceTo(p2) * rr(0.7, 1.1))) * cs / 1.3, bez = new T.QuadraticBezierCurve3(p1, above(V((p1.x + p2.x) / 2, 0, (p1.z + p2.z) / 2), lift * 2), p2), pts = [];
              for (var s = 0; s <= 12; s++) pts.push(bez.getPoint(s / 12));
              vx.ribbon({ mode: 'static', sweep: true, pts: pts, w: 0.34 * cs, color: 0xff8a2b, core: 0, alpha: 0.7, life: 0.42 });
              vx.ribbon({ mode: 'static', sweep: true, pts: pts, w: 0.14 * cs, color: 0xffd860, core: 1.3, life: 0.42 });
            }
          }
          if (Math.random() < dt * 16) scorch(V(G.x + Math.cos(rr(0, 6.28)) * r, 0, G.z + Math.sin(rr(0, 6.28)) * r), 0.8, 1.6);
          return r > END;
        });
        // every monster the ring runs over flashes gold as it burns (not white: white on every monster at once went to a
        // white field, see wallBurn)
        ringHits(c, G, RING_V / c.sp, END, function (m) {
          var q = mp(m); wallBurn(c, m); flare(q, 0xffd870, 1.1 * cs, 0.12); sparks(q, GOLD, N(4, c), 4.5, { size: 0.16, up: 1.5 });
          sc.shake(0.05); c.hit(m, 1, 1.4);
        });
      }
    };

    // =================================================================== 8차: 공허
    // Void rift: a tear is cut across the whole field. Dark arms whip out of it at every monster — then it snaps shut and bursts along its length.
    // The tear is a real 3D pocket made in Blender: a jagged burning lip round a deep space with drifting stars. It is
    // cut open from one end, swells open, and slams shut; then pieces of its edge break off and fly.
    S.rift = function (c) {
      sc.heroPose('swipe', c.D(0.14), c.col); sc.dim(0.55, c.D(1.05));
      var M = V(c.center.x * 0.4, 1.3, c.center.z * 0.4 - 0.3), slope = Math.random() < 0.5 ? 1 : -1, A = V(M.x - 4.4, M.y + 1.0 * slope, M.z - 1.2 * slope), B = V(M.x + 4.4, M.y - 1.0 * slope, M.z + 1.2 * slope);
      var path = vx.boltPath(A, B, 14, 0.035), t = 0, T_CUT = c.D(0.16), T_OPEN = c.D(0.5), T_SHUT = c.D(0.07), open = 0, cut = 0, whipped = false;
      var tear = P3.bm('rift', { col: 0xff6ad8 }), Q = seamQ(B.clone().sub(A)), half = A.distanceTo(B) / 2, Hh = 1.0 * Math.min(1.3, c.s), SC3 = V();
      function at(u) { var f = u * (path.length - 1), i = Math.min(path.length - 2, Math.floor(f)); return path[i].clone().lerp(path[i + 1], f - i); }
      tick(function (dt) {
        t += dt; cut = Math.min(1, t / T_CUT);
        open = t < T_OPEN ? Math.min(1, t / (T_CUT * 0.6)) : Math.max(0, 1 - (t - T_OPEN) / T_SHUT);
        var swell = open * (1 + 0.06 * Math.sin(t * 30));
        tear.set(M, Q, SC3.set(half, Math.max(0.001, Hh * swell), 1.2 * Math.max(0.05, open)), 1, cut);
        if (cut < 1) { var tipP = at(cut); flare(tipP, 0xffffff, 0.9 * c.s, 0.08, { white: true }); sparks(tipP, [0xffffff, c.col, 0xff6ad8], N(3, c), 6, { size: 0.18 }); sc.shake(dt * 1.5); }
        else if (t < T_OPEN && Math.random() < dt * 50 * c.n) { var e = at(rr(0, 1)); E({ pos: e.clone().add(rdir(1.2)), vel: V(), frame: pick(['dot', 'streak']), color: [0xffffff, c.col], size: [rr(0.1, 0.18), 0.02], life: 0.3, upd: (function (e) { return function (p, d, k) { p.x += (e.x - p.x) * 0.2; p.y += (e.y - p.y) * 0.2; p.z += (e.z - p.z) * 0.2; return true; }; })(e) }); }
        if (!whipped && t >= T_CUT + c.D(0.05)) {
          whipped = true;
          // one arm of darkness for every monster on the field
          c.pool().forEach(function (m, i) {
            after(c.D(i * 0.022), function () {
              if (!m.alive) return;
              var q = mp(m), u = Math.max(0.04, Math.min(0.96, (q.x - A.x) / (B.x - A.x))), from = at(u), to = function () { return mp(m); };
              vx.lightning(from, to, { w: 0.3 * c.s, color: c.col, core: 0, alpha: 0.5, life: c.D(0.26), branches: 0, segs: 10, amp: 0.2 });
              vx.lightning(from, to, { solid: true, w: 0.09 * c.s, color: 0x2a0a4a, core: 0.2, life: c.D(0.3), branches: 1, segs: 10, amp: 0.2 });
              impact(q, c.col, 0.8 * c.s); sc.shake(0.04);
              c.hit(m, 0.5, 1.0);
            });
          });
        }
        if (t < T_OPEN + T_SHUT) return false;
        tear.kill();
        // it snaps shut: the whole seam goes off at once, and broken pieces of its edge fly
        sc.flash('rgba(220,170,255,0.85)', 0.6); sc.hitStop(0.08); sc.shake(0.5); sc.punch(0.1);
        for (var s = 0; s <= 6; s++) { var p = at(s / 6); flare(p, 0xffffff, 1.6 * c.s, 0.18, { white: true }); shock(p, s % 2 ? 0xff6ad8 : c.col, 3.4 * c.s, 0.4, { delay: s * 0.012 }); sparks(p, [0xffffff, c.col, 0xff6ad8], N(8, c), 9, { size: 0.24, stretch: 0.14, life: 1.1 }); }
        var ax = B.clone().sub(A).normalize(), up = V(0, 1, 0).applyQuaternion(Q);
        for (var k = 0; k < N(16, c); k++) {
          var sgn = Math.random() < 0.5 ? 1 : -1;
          tumble('riftShard', pick([c.col, 0xff6ad8, 0xb07aff]), at(rr(0.05, 0.95)), up.clone().multiplyScalar(sgn * rr(3, 7)).addScaledVector(ax, rr(-2, 2)).add(V(0, rr(1, 3), rr(-1, 2))), rr(0.14, 0.3) * Math.min(1.4, c.s), rr(0.55, 0.85));
        }
        fieldWave(V(M.x, 0, M.z), c.col, 0.8, 0xff6ad8); gRing(V(M.x, 0, M.z), c.col, 11, 0.7);
        c.pool().forEach(function (m) { var q = mp(m); impact(q, pick([c.col, 0xff6ad8]), 1.2 * c.s); gRing(gp(m), c.col, 2.0 * c.s, 0.4); c.hit(m, 0.5, 1.9); });
        return true;
      });
    };
    // Gravity crush: gravity lets go — every monster on the field floats up off the ground, helpless — and then comes
    // back tenfold: they are all slammed down together.
    // The weight is a real 3D orb made in Blender (heavy faceted violet crystal, two rings turning round it) that swells
    // high over the field while they float; then it falls on the middle of the field, a small one falls on each monster,
    // and the ground caves in under every one of them (Blender craters, cracks glowing violet).
    S.crush = function (c) {
      sc.heroPose('raise', c.D(0.16), c.col); sc.dim(0.5, c.D(1.2));
      var held = [], t = 0, T_UP = c.D(0.36), T_HANG = c.D(0.2), G = V(c.center.x * 0.5, 0.04, c.center.z * 0.5 - 0.2), cs = Math.min(1.4, c.s);
      var sky = above(G, 3.6), orb = P3.bm('gravOrb', { col: c.col }), rings = [P3.bm('gravRing', { col: 0xc89aff }), P3.bm('gravRing', { col: c.col })], glowB = P3.orb({ col: c.col, deep: 0x3a0a6a, alpha: 0.35, order: 6 }), OR = 0.001;
      var orbQ = new T.Quaternion(), rq = new T.Quaternion(), SKY = V();
      function drawOrb(P, r, dt, k) {
        orbQ.multiply(QT.setFromAxisAngle(QY, dt * 1.6)); orb.set(P, orbQ, Math.max(0.001, r), 1, k);
        for (var i = 0; i < 2; i++) { rq.setFromEuler(QE.set(i ? 0.9 : -0.5, t * (i ? -2.2 : 1.7), i ? 0.4 : -0.3)); rings[i].set(P, rq, Math.max(0.001, r), Math.min(1, r * 3), 0); }
        glowB.set(P, r * 2.2);
      }
      // dust and pebbles drift up off the whole ground with them
      fieldRain(c, 60, T_UP, { y: function () { return rr(0.05, 0.3); }, vel: function () { return UPC.clone().multiplyScalar(rr(1.2, 3.2)); }, frames: ['dot', 'shard', 'flare'], cols: [K.dustCol(), c.col], size: function () { return [rr(0.08, 0.18), 0.05]; }, life: 0.9, sway: true });
      tick(function (dt) {
        t += dt;
        var ku = Math.min(1, t / T_UP), h = 1 - (1 - ku) * (1 - ku);
        OR = 0.95 * cs * h; drawOrb(SKY.set(sky.x, sky.y + Math.sin(t * 5) * 0.08, sky.z), OR, dt, h);
        liveMobs().forEach(function (m) {
          if (held.indexOf(m) < 0) { held.push(m); ring(mp(m), c.col, 1.2 * c.s, 0.25); }
          m.pull = m.x; m.pullZ = m.z; m.lift = true;
          m.y = ((m.boss ? 0.8 : 1.6) + Math.sin(t * 9 + (m.phase || 0)) * 0.07) * h; m.vy = 0;
          if (Math.random() < dt * 8 * c.n) E({ pos: V(m.x + rr(-0.3, 0.3), 0.1, m.z), vel: UPC.clone().multiplyScalar(rr(2, 4)), frame: 'streak', color: [0xffffff, c.col], size: [0.2, 0.04], life: 0.35, stretch: 0.1 });
        });
        if (t < T_UP + T_HANG) return false;
        held.forEach(function (m) { m.pull = undefined; m.pullZ = undefined; m.lift = undefined; if (m.alive) { if (m.frozen > 0) m.y = 0; else m.vy = -30; } });
        sc.flash('rgba(200,150,255,0.5)', 0.25);
        // the orb comes down on the middle of the field, and a small orb of it on each monster
        var ft = 0, FALL = c.D(0.07), P = SKY.clone(), from = SKY.clone(), land = V(G.x, 0.3, G.z);
        var minis = liveMobs().map(function (m) { return { m: m, h: P3.bm('gravOrb', { col: c.col }), from: above(gp(m), 3.2), r: 0.3 * cs * (m.boss ? 1.6 : 1) }; });
        tick(function (dt2) {
          ft += dt2; var k = Math.min(1, ft / FALL), kk = k * k;
          P.lerpVectors(from, land, kk); drawOrb(P, OR * (1 - 0.3 * k), dt2, 1);
          minis.forEach(function (o) { o.h.set(o.from.clone().lerp(o.m.alive ? mp(o.m) : gp(o.m), kk), orbQ, o.r, 1, 1); });
          if (k < 1) return false;
          orb.kill(); rings.forEach(function (r) { r.kill(); }); glowB.kill(); minis.forEach(function (o) { o.h.kill(); });
          return true;
        });
        after(c.D(0.07), function () {
          sc.flash('rgba(220,170,255,0.9)', 0.6); sc.hitStop(0.09); sc.slowmo(0.2, 0.4); sc.shake(0.65); sc.punch(0.13);
          var dirt = new T.Color(K.dustCol()).lerp(new T.Color(0x3b2a20), 0.55).getHex();
          cave(G, 1.3 * cs, 1.5, dirt);
          fieldWave(G, c.col, 0.8, 0xff6ad8); gRing(G, c.col, 11, 0.7); shock(V(G.x, 0.6, G.z), c.col, 8.5, 0.55);
          for (var b = 0; b < N(24, c); b++) { var p = fieldPt(0.1); E({ sys: 'norm', pos: p, vel: V(rr(-1.5, 1.5), rr(3, 7), rr(-1, 1)), frame: 'shard', color: K.dustCol(), size: rr(0.12, 0.24), life: rr(0.5, 0.9), grav: 13, spin: rr(-9, 9), white: true }); }
          liveMobs().forEach(function (m) {
            var g = gp(m), q = mp(m);
            cave(g, 0.45 * cs * (m.boss ? 1.6 : 1), 1.2, dirt); gRing(g, c.col, 2.6 * c.s * (m.boss ? 1.5 : 1), 0.45); dust(g, N(5, c), 1.3);
            flare(q, 0xffffff, 1.3 * c.s, 0.14, { white: true }); sparks(q, [0xffffff, c.col, 0xff6ad8], N(8, c), 7, { size: 0.2, up: 1.5 });
            c.hit(m, 1, 2.2);
          });
        });
        return true;
      });
    };
    // Dark star: a bead of darkness swells at the paw, drifts — slow and heavy — to one monster, sinks into it, and bursts out as spikes of night.
    S.darkStar = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('thrust', c.D(0.26), c.col); sc.dim(0.5, c.D(1.05));
      var tip = c.from, cs = Math.min(1.6, c.s);
      converge(tip, [0xffffff, c.col, 0xff6ad8], N(24, c), 1.6, c.D(0.26));
      E({ sys: 'addB', pos: tip, frame: 'dot', color: 0x07020e, size: [0.05, 0.9 * cs], ease: 1, life: c.D(0.27), fadeOut: 1 });
      E({ pos: tip, frame: 'ring', color: 0xffb8f4, size: [0.1, 1.05 * cs], ease: 1, life: c.D(0.27), fadeOut: 1, white: true });
      after(c.D(0.26), function () {
        // the bead is a small black hole (the vortex's 3D ball and turning disk, without its bent picture or ground whirl)
        var from = sc.heroPaw(), land = mp(mob), R = 0.32 * cs, star = P3.hole({ pos: from, mid: 0xff6ad8, out: c.col, lens: false, pit: false });
        star.set(R, 1, 0);
        homing({ from: from, to: function () { land = mp(mob); return land; }, time: c.D(0.3), arc: V(0, 0.6, 0), fancy: false, ease: function (x) { return x; },
          trail: { w: 0.3 * cs, col: 0x6a2ad0, core: 0.2, pts: 18, shrink: 40 },
          heads: [],
          emit: function (p, v, dt) {
            star.move(p); star.set(R, 1, dt);
            // it drinks the light around it as it goes
            if (Math.random() < dt * 70 * c.n) { var d = rdir(rr(1, 1.8)); E({ pos: p.clone().add(d), vel: d.clone().multiplyScalar(-4).add(v), frame: pick(['streak', 'dot']), color: [0xffffff, c.col, 0xff6ad8], size: [rr(0.1, 0.2), 0.02], life: 0.26, stretch: 0.06, fadeIn: 0.3 }); }
          },
          onHit: function (p) {
            var g = V(p.x, 0, p.z), sinkT = 0, sinkL = c.D(0.1);
            E({ pos: p, frame: 'ring', color: 0xffffff, size: [3.2 * cs, 0.2], life: c.D(0.1), white: true });
            // it sinks into the monster: smaller and smaller, then gone
            tick(function (dt) { sinkT += dt; var k = Math.min(1, sinkT / sinkL); star.move(mp(mob)); star.set(R * (1 - k * 0.95), 1 - k * 0.6, dt); if (k < 1) return false; star.kill(); return true; });
            sc.shake(0.15); c.hit(mob, 0.3, 1.2);
            after(c.D(0.1), function () {
              var q = mp(mob);
              sc.flash('rgba(220,170,255,0.9)', 0.6); sc.hitStop(0.09); sc.shake(0.55); sc.punch(0.12);
              for (var s = 0; s < 10; s++) { E({ sys: 'col', pos: q, frame: 'streak', color: [0x1a0630, c.col], size: [0.5, rr(4, 6.5)], ease: 1, life: rr(0.3, 0.45), rot: s / 10 * 3.1416 + rr(-0.1, 0.1), alpha: 0.9, fadeOut: 0.4 }); E({ pos: q, frame: 'streak', color: 0xffffff, size: [0.3, rr(2.5, 4)], ease: 1, life: 0.22, rot: s / 10 * 3.1416 + 0.15, alpha: 0.7 }); }
              // night bursts out of it: a violet ball of light (the 3D blast) instead of a flat white star
              P3.blast(q, { ball: true, y: q.y, size: 1.2 * cs, col: 0xb050f0, low: 0x22073e, hotness: 0.22, flash: true, chips: 0, crater: false });
              shock(q, c.col, 6 * cs, 0.5); shock(q, 0xff6ad8, 8.5, 0.65, { delay: 0.05 });
              fieldWave(g, c.col, 0.75, 0xff6ad8); gRing(g, c.col, 6.5 * cs, 0.6); scorch(g, 2.2, 2.6);
              sparks(q, [0xffffff, c.col, 0xff6ad8], N(40, c), 12, { size: 0.28, stretch: 0.14, life: 1.3 }); embers(q, [0xffffff, c.col], N(16, c), { speed: 5, up: 1.5, grav: 2 });
              sc.light(q, c.col, 2.6, 0.5);
              c.hit(mob, 0.7, 2.6); c.splash(mob, 2.1, 1.3);
            });
          } });
      });
    };

    // =================================================================== 9차: 원소 (the user's drawings, 2026-11-15)
    // The five elements of the drawings, in their order: fire (orange), lightning (yellow), star (violet), ice (sky
    // blue), wind (green). Each is a real 3D emblem (fx3d emblem: a flame, a bolt, a star, a snowflake, a swirl).
    var E9 = [0xff7a2a, 0xffcf2e, 0xa860ff, 0x52c4ff, 0x4fd860], E9D = E9.map(function (h) { return deep(h); }), E9L = E9.map(function (h) { return new T.Color(deep(h)).multiplyScalar(0.32).getHex(); });
    var E9F = ['flame', 'streak', 'star', 'snow', 'fluff'];
    function e9o(i, o) { var q = { col: E9[i], deep: E9D[i], line: E9L[i] }; for (var k in o) q[k] = o[k]; return q; }
    function ez(x) { x = Math.max(0, Math.min(1, x)); return 1 - (1 - x) * (1 - x) * (1 - x); }
    // a little spray of an element's own bits: fire flames and embers, lightning crackle, stars, snow, green wisps
    function e9sparks(i, p, n, sp) {
      if (CW.fxOff && CW.fxOff.shards) return;
      if (i === 0) { fire(p, n, { size: 0.5, speed: sp * 0.5, up: 1.4 }); embers(p, [0xffe080, E9[0]], n, { speed: sp, up: 1.6 }); return; }
      if (i === 1) for (var b = 0; b < Math.min(3, n); b++) vx.lightning(p.clone(), p.clone().add(rdir(0.25 * sp)), { w: 0.05, color: E9[1], life: 0.12, branches: 0, segs: 5, amp: 0.3 });
      for (var k = 0; k < n; k++) E({ sys: i === 3 ? 'norm' : 'add', pos: p.clone().add(rdir(0.1)), vel: rdir(sp).add(V(0, sp * 0.3, 0)), frame: E9F[i], color: [0xffffff, E9[i]], size: [rr(0.14, 0.26), 0.03], life: rr(0.35, 0.6), drag: 1.4, spin: rr(-10, 10), white: i === 3 });
    }
    // crystals of an element thrown out of a spot (they fall, stop on the ground and shrink away)
    // spears of an element's light thrown out of a spot (bright, pointing the way they fly, a streak behind; no dark edge and
    // no tumbling, which looked like splashed paint, 2026-11-15)
    function e9crystals(i, p, n, s, up) {
      for (var k = 0; k < n; k++) { var a = k / n * 6.283 + rr(-0.3, 0.3), sp = rr(7, 11) * s; lightSpear(i, p, V(Math.cos(a) * sp, rr(1.5, 4) * (up || 1), Math.sin(a) * sp * 0.8), rr(0.3, 0.5) * s, 0.45); }
    }
    // Is this point on the part of the battle screen the player can see (not under the top bar or the skill row)?
    function onScreen(p) { var q = p.clone().project(sc.camera); return q.x > -0.84 && q.x < 0.84 && q.y > -0.52 && q.y < 0.76 && q.z < 1; }
    // Where something falling out of the sky starts: as high above the spot as the screen allows, so the whole fall is seen.
    function skyStart(g, dx, dz) {
      for (var h = 5.6; h > 2.4; h -= 0.4) { var p = V(g.x + dx * h / 5.6, h, g.z + dz); var q = p.clone().project(sc.camera); if (q.y < 0.74) return p; }
      return V(g.x + dx * 0.45, 2.4, g.z + dz);
    }
    // the way everything comes down in the element storm (the drawing: from the upper left, all on the same slant)
    var SLANT = -2.4;
    // The way the storm blows (the drawing): everything — the falling elements, the wind, the little bits — goes from the
    // upper left to the lower right. WIND is that direction in the world (down the slant, a little toward the camera).
    var WIND = V(-SLANT, -5.6, 0.35).normalize();
    // One element of the storm (the drawings and the review of 2026-11-15): each one is told apart by its shape and the
    // way it moves, not only by its colour —
    //   0 fire: a heavy burning rock with a short, wide flame tail;
    //   2 star: a violet burning shooting star whose sparkling trail curves as it comes;
    //   3 ice: a thin, long ice spear;
    // each falls on the slant straight on to its monster (it follows it), with a short trail that breaks off behind it
    // (a trail reaching all the way back read as a laser); it is gone the moment it lands. Lightning does not fall: it
    // flashes down in an instant (see stormBolt). A soft spot of its colour lights the ground under the monster first.
    function stormFall(c, mob, kind, big, done) {
      var col = E9[kind], B = (big ? 1.5 : 0.95) * Math.min(1.2, c.s) * (mob.boss ? 1.2 : 1), g0 = gp(mob);
      var from = skyStart(g0, SLANT, -0.35), T_ = c.D(big ? 0.5 : 0.4), t = 0, cur = V(), last = from.clone(), vel = V(), side = rr(-1, 1) > 0 ? 1 : -1;
      var spot = E({ sys: 'gadd', pos: V(g0.x, 0.04, g0.z), frame: 'glow', color: col, size: [0.4, 1.4 * B], ease: 1, life: T_ + 0.06, alpha: 0.6, fadeIn: 0.3, fadeOut: 0.3 });
      // a short trail that breaks off behind it
      var noTrail = CW.fxOff && CW.fxOff.trails, rib = noTrail ? null : vx.ribbon({ solid: true, mode: 'trail', w: [0.42, 0, 0.22, 0.14][kind] * B, color: deep(col), core: 0.85, maxPts: kind === 0 ? 8 : 12, shrink: 70, minDist: 0.03 });
      var halo = noTrail ? null : vx.ribbon({ mode: 'trail', w: [1.1, 0, 0.7, 0.5][kind] * B, color: col, core: 0, alpha: 0.4, maxPts: kind === 0 ? 8 : 12, shrink: 70, minDist: 0.03 });
      var body = kind === 0 ? P3.fireball({ size: 0.32 * B, col: 0xff6a1a })
        : kind === 3 ? P3.iceSpear({ size: 1.5 * B, thin: 0.075 })
        : P3.fireball({ size: 0.22 * B, col: 0xb070ff, deep: 0x3a0c70, hot: 0xf6e6ff, glowDeep: 0x7a2cff, smoke: [0x3a2a5a, 0x9a80d0] });
      tick(function (dt) {
        t += dt; var f = Math.min(1, t / T_), e = f * f * 0.55 + f * 0.45, end = mp(mob);
        cur.copy(from).lerp(end, e);
        // the shooting star comes in on a curve (the fire and the ice come straight, heavy and sharp)
        if (kind === 2) cur.x += Math.sin(f * Math.PI) * 0.7 * B * side;
        if (dt > 1e-4) vel.copy(cur).sub(last).multiplyScalar(1 / dt); last.copy(cur);
        if (spot) { spot.x = end.x; spot.z = end.z; }
        if (rib) rib.head(cur); if (halo) halo.head(cur);   // (a ribbon is null when the effect layer is full)
        var v = vel.lengthSq() > 1e-6 ? vel : WIND;
        body.set(cur, v, dt);
        if (kind === 0) { if (Math.random() < dt * 70 * c.n) trailFire(cur, v, 0.32 * B, { size: 0.65 * B, speed: 1.0, up: 0.5, life: 0.4, v: v.clone().multiplyScalar(-0.05) }); }
        else if (kind === 2) { if (Math.random() < dt * 80 * c.n) E({ pos: cur.clone().add(rdir(0.15)), vel: v.clone().multiplyScalar(-0.05).add(rdir(0.4)), frame: pick(['star', 'flare']), color: [0xffffff, col], size: [rr(0.1, 0.2) * B, 0.02], life: rr(0.3, 0.55), drag: 1.5, spin: rr(-10, 10) }); }
        else if (Math.random() < dt * 40 * c.n) E({ sys: 'norm', pos: cur.clone().add(rdir(0.1)), vel: v.clone().multiplyScalar(-0.05).add(rdir(0.5)), frame: 'shard', color: pick(ICE), size: [rr(0.06, 0.12), 0.02], ar: 2, life: 0.3, spin: rr(-12, 12), white: true });
        if (f < 1) return false;
        body.kill(); if (rib) rib.detach(); if (halo) halo.detach();
        stormImpact(c, mob, kind, big, B, end.clone());
        done(end); return true;
      });
    }
    // Lightning: no falling thing — a bent line of light flashes from the sky to the monster in an instant (twice, as
    // lightning does), then the current runs out over the ground.
    function stormBolt(c, mob, big, done) {
      var col = E9[1], B = (big ? 1.3 : 0.9) * Math.min(1.2, c.s) * (mob.boss ? 1.2 : 1), g0 = gp(mob);
      E({ sys: 'gadd', pos: V(g0.x, 0.04, g0.z), frame: 'glow', color: col, size: [0.4, 1.3 * B], ease: 1, life: c.D(0.2), alpha: 0.6, fadeIn: 0.5 });
      after(c.D(0.16), function () {
        var q = mp(mob), top = skyStart(V(q.x, 0, q.z), SLANT * 0.5, -0.35);
        vx.lightning(top, q.clone(), { solid: true, w: 0.09 * B, color: col, core: 1, life: 0.12, branches: 2, segs: 14, amp: 0.3 });
        vx.lightning(top, q.clone(), { w: 0.28 * B, color: col, core: 0, alpha: 0.35, life: 0.12, branches: 0, segs: 14, amp: 0.3 });
        after(0.07, function () { vx.lightning(top.clone().add(V(rr(-0.3, 0.3), 0, 0)), mp(mob), { solid: true, w: 0.06 * B, color: col, core: 1, life: 0.08, branches: 1, segs: 12, amp: 0.34 }); });
        sc.flash('rgba(255,236,150,0.12)', 0.06);
        stormImpact(c, mob, 1, big, B, q);
        done(q);
      });
    }
    // Where it lands: the thing is gone and a small hit of its own goes off — fire in flames, lightning in current running
    // out over the ground, the star in star bits, ice in sharp shards — and then a trace stays a moment and fades away:
    // smoke and embers where fire fell, little crystals where ice fell, an afterglow where the star fell.
    function stormImpact(c, mob, kind, big, B, q) {
      var col = E9[kind], g = V(q.x, 0, q.z);
      if (big) heavy(0.5);
      if (big) sc.light(q, col, 2.6, 0.3); gRing(g, col, 1.9 * B, 0.4); gGlow(g, col, 1.6 * B, 0.45); if (big) shock(q, col, 2.0 * B, 0.32, { alpha: 0.45 });
      if (kind === 0) {
        P3.blast(g, { size: (big ? 0.42 : 0.32) * B, col: 0xff8a2b, flash: big, chips: big ? 4 : 2, ring: 2, life: 0.7 });
        fire(q, N(8, c), { size: 0.85 * B, speed: 2.6, up: 2.6 }); embers(q, [0xffe080, 0xff6a2b], N(big ? 18 : 9, c), { speed: 3, up: 3, grav: 3 }); scorch(g, 1.0 * B, 3.2);
        // what stays: a wisp of smoke and embers glowing a while
        after(0.3, function () { smoke(V(g.x, 0.35, g.z), [0x6a5a54, 0x2e2624], N(2, c), { size: 0.7 * B, rise: 1.0, speed: 0.4, life: 1.4, alpha: 0.6 }); });
        for (var e = 0; e < 3; e++) after(0.4 + e * 0.25, function () { embers(V(g.x, 0.15, g.z), [0xffb040, 0xff6a2b], N(2, c), { speed: 0.6, up: 1.2, grav: 0.5 }); });
      } else if (kind === 1) {
        if (mob.alive) zapHit(c, mob, true, col);
        flare(q, col, 1.2 * B, 0.12);
        for (var b = 0; b < (big ? 8 : 5); b++) { var a = b / (big ? 8 : 5) * 6.283 + rr(-0.3, 0.3), L = rr(0.8, 1.5) * B; vx.lightning(V(g.x, 0.06, g.z), V(g.x + Math.cos(a) * L, 0.06, g.z + Math.sin(a) * L * 0.8), { w: 0.05 * B, color: col, life: c.D(0.3), branches: 1, segs: 9, amp: 0.22, flicker: 0.7 }); }
        sparks(q, [col, 0xffa020, 0xfff0a0], N(big ? 18 : 10, c), 7, { size: 0.16, stretch: 0.2, life: 0.6, up: 1.2 }); scorch(g, 0.6 * B, 1.8);
        after(0.25, function () { vx.lightning(V(g.x + rr(-0.3, 0.3), 0.06, g.z), V(g.x + rr(-0.8, 0.8), 0.06, g.z + rr(-0.5, 0.5)), { w: 0.03, color: col, life: 0.12, branches: 0, segs: 6, amp: 0.2 }); });
      } else if (kind === 2) {
        flare(q, col, 1.1 * B, 0.14); E({ sys: 'col', pos: q, frame: 'star', color: [col, deep(col)], size: [0.3, 1.1 * B], ease: 1, life: 0.22, spin: 8 });
        P3.iceSpikes(g, { size: (big ? 0.6 : 0.45) * B, n: big ? 6 : 4, col: 0xc28aff }); e9crystals(2, q, N(big ? 5 : 3, c), 0.8 * B);
        for (var s = 0; s < N(big ? 14 : 8, c); s++) E({ pos: q, vel: rdir(3.6).add(V(0, 2.4, 0)), frame: 'star', color: [0xffffff, col], size: [rr(0.14, 0.26) * B, 0.03], life: rr(0.45, 0.8), grav: 5, drag: 1.2, spin: rr(-10, 10) });
        // what stays: a violet afterglow on the ground, fading slowly
        E({ sys: 'gadd', pos: V(g.x, 0.04, g.z), frame: 'glow', color: col, size: [1.0 * B, 1.0 * B], life: 1.4, alpha: 0.45, fadeIn: 0.05, fadeOut: 0.9 });
        for (var w = 0; w < N(4, c); w++) (function () { var at = q.clone().add(V(rr(-0.7, 0.7) * B, rr(0.1, 0.9) * B, rr(-0.3, 0.3))); after(rr(0.3, 0.9), function () { E({ pos: at, frame: 'star', color: [0xffffff, col], size: [0.04, 0.2 * B], ease: 1, life: 0.3, spin: 5, fadeIn: 0.3 }); }); })();
      } else {
        if (mob.alive) iceBurst(c, mob, 0.7 * B, true);
        flare(q, 0xbfe8ff, 0.9 * B, 0.12);
        e9crystals(3, q, N(big ? 7 : 4, c), 0.9 * B); if (big) P3.iceSpikes(g, { size: 0.6 * B, n: 5, col: E9[3] });
        // the snowflake shows only for a moment, small, as it lands
        E({ sys: 'gadd', pos: V(g.x, 0.04, g.z), frame: 'frost', color: 0xbfe8ff, size: [0.3, 1.1 * B], ease: 1, life: 0.35, fadeOut: 0.6, alpha: 0.6 });
        // what stays: a few small crystals in the ground, sinking away
        for (var k = 0; k < (big ? 4 : 3); k++) { var a2 = k / 4 * 6.283 + rr(0, 1); P3.iceSpike(V(g.x + Math.cos(a2) * 0.35 * B, 0, g.z + Math.sin(a2) * 0.25 * B), { h: rr(0.25, 0.45) * B, lean: rr(-0.5, 0.5), col: E9[3], life: 1.3 }); }
      }
    }
    // the storm's share for a monster nothing falls on (off the screen, or past the ones that something falls on): its
    // element bursts on it
    function stormPop(c, mob, kind) {
      var col = E9[kind], q = mp(mob), g = gp(mob);
      ring(q, col, 1.0, 0.2); gRing(g, col, 1.3, 0.3); sparks(q, [0xffffff, col], N(5, c), 5, { size: 0.14 });
      e9sparks(kind, q, N(3, c), 3);
    }
    // Element storm (the drawings and their review, 2026-11-15). The power of the elements gathers in the sky; the wind
    // of the storm starts to blow from the upper left to the lower right, thin streaks of wind and little bits of fire,
    // stardust and ice riding it all the way through; then it starts small and builds — falls come faster and faster,
    // irregular and overlapping, two or three big rocks and spears at a time among the small ones — to a peak, and stops;
    // the traces of each element fade out after it. Every fall is aimed at one monster on the screen, spread over the
    // field (the first at the left end, each next one at the monster furthest from those already struck); a monster off
    // the screen, or past the ten something falls on, takes its share as a burst; one that walks in is caught too.
    S.elemStorm = function (c) {
      c.plain = true;   // no common white contact rings: each element has its own landing
      sc.heroPose('raise', c.D(0.16), 0xffffff); sc.dim(0.55, c.D(1.9));
      var cen = c.center || FC, STORM = c.D(1.55), clk = 0, peaked = false;
      // the power gathering in the sky first: lights of the four elements drifting together high over the field
      for (var k = 0; k < N(26, c); k++) (function (k) {
        var gi = [0, 1, 2, 3][k % 4], at = skyStart(V(cen.x + rr(-2.8, 2.4), 0, cen.z + rr(-1.4, 0.8)), SLANT * rr(0.3, 0.9), -0.4);
        after(c.D(rr(0, 0.2)), function () { E({ pos: at, vel: WIND.clone().multiplyScalar(0.6), frame: pick(['star', 'flare', 'dot']), color: [0xffffff, E9[gi]], size: [0.04, rr(0.18, 0.34)], ease: 1, life: c.D(rr(0.35, 0.55)), spin: rr(-6, 6), fadeIn: 0.3, fadeOut: 0.5 }); });
      })(k);
      // the wind of the storm and the little bits riding it, all through (thin streaks; they fade in the air, they hit nothing)
      tick(function (dt) {
        clk += dt; if (clk > STORM + c.D(0.25)) return true;
        var heat = Math.min(1, clk / STORM) * (clk > STORM ? 0.3 : 1);
        if (Math.random() < dt * (14 + 30 * heat) * c.n) { var p = fieldPt(rr(1.2, 3.2)).add(V(SLANT * 0.5, 0, -0.4)); E({ pos: p, vel: WIND.clone().multiplyScalar(rr(9, 13)), frame: 'streak', color: [0xffffff, pick([0xdfe8ff, E9[0], E9[1], E9[2], E9[3]])], size: [rr(0.6, 1.2), 0.1], life: rr(0.25, 0.4), stretch: 0.1, alpha: 0.35, fadeIn: 0.3, fadeOut: 0.5 }); }
        if (Math.random() < dt * (20 + 60 * heat) * c.n) {
          var kd = pick([0, 2, 3]), p2 = fieldPt(rr(1, 3.4)).add(V(SLANT * 0.4, 0, -0.4));
          E({ sys: kd === 3 ? 'norm' : 'add', pos: p2, vel: WIND.clone().multiplyScalar(rr(7, 11)), frame: kd === 0 ? pick(['dot', 'flame']) : kd === 2 ? 'star' : 'shard', color: kd === 0 ? [0xffe080, 0xff6a2b] : kd === 2 ? [0xffffff, E9[2]] : pick(ICE), size: [rr(0.08, 0.16), 0.03], ar: kd === 3 ? 2 : undefined, life: rr(0.25, 0.45), stretch: kd === 3 ? undefined : 0.08, spin: rr(-10, 10), fadeOut: 0.5, white: kd === 3 });
        }
        // the sky over the field glows in the elements' colours while it pours
        if (Math.random() < dt * 10 * heat) { var sp = skyStart(V(cen.x + rr(-2.6, 2.6), 0, cen.z + rr(-1.2, 0.6)), SLANT * rr(0.2, 0.8), -0.4); E({ pos: sp, vel: WIND.clone().multiplyScalar(1.5), frame: 'glow', color: pick([E9[0], E9[1], E9[2], E9[3]]), size: [1.5, 3.2], ease: 1, life: 0.6, alpha: 0.28, fadeIn: 0.4, fadeOut: 0.6 }); }
        // the peak: everything is coming down at once — the ground shudders and the field flares in colour
        if (!peaked && clk > STORM * 0.78) { peaked = true; sc.shake(0.5); sc.punch(0.06); sc.flash('rgba(255,200,150,0.16)', 0.18); gGlow(V(cen.x, 0, cen.z), 0xffb060, 4.5, 0.5); }
        return false;
      });
      var mobs = c.pool(), seen = mobs.filter(function (m) { return onScreen(mp(m)); }), order = [], rest = seen.slice();
      if (rest.length) {
        rest.sort(function (a, b) { return a.x - b.x; }); order.push(rest.shift());
        while (rest.length) { var bi = 0, bd = -1; rest.forEach(function (m, i) { var d = Infinity; order.forEach(function (o) { d = Math.min(d, (o.x - m.x) * (o.x - m.x) + (o.z - m.z) * (o.z - m.z)); }); if (d > bd) { bd = d; bi = i; } }); order.push(rest.splice(bi, 1)[0]); }
      }
      var falling = order.slice(0, 10), popped = order.slice(10).concat(mobs.filter(function (m) { return seen.indexOf(m) < 0; }));
      // a few monsters take several falls each (a lone boss all of them), so the storm still pours
      // one fall for each (two each made the iPhone drop to 40 frames a second, 2026-11-15); a few monsters take several
      var per = falling.length >= 4 ? 1 : Math.ceil(6 / Math.max(1, falling.length)), drops = [];
      for (var r = 0; r < per; r++) falling.forEach(function (m) { drops.push({ m: m, frac: 1 / per }); });
      // it starts small and builds: falls come closer and closer together (irregular, overlapping); the big ones come in
      // the thick of it, two or three at once
      var n = drops.length;
      drops.forEach(function (d, i) {
        var u = n > 1 ? i / (n - 1) : 0, when = 0.22 + STORM * 0.78 * Math.pow(u, 0.65) + rr(-0.05, 0.05), big = n >= 3 ? (u > 0.3 && u < 0.92 && i % 3 !== 1) : i === 0;
        var kind = [0, 3, 1, 2][i % 4];
        after(c.D(Math.max(0.18, when)), function () {
          var hit = function () { c.hit(d.m, d.frac, big ? 1.4 : 0.9); };
          if (kind === 1) stormBolt(c, d.m, big, hit); else stormFall(c, d.m, kind, big, hit);
        });
      });
      popped.forEach(function (m, i) { after(c.D(0.45 + i * 0.05), function () { stormPop(c, m, [0, 3, 1, 2][i % 4]); c.hit(m, 1, 0.8); }); });
      after(c.D(1.5), function () { c.pool().forEach(function (m) { if (mobs.indexOf(m) < 0) { stormPop(c, m, 0); c.hit(m, 1, 0.8); } }); });
    };
    // Prism beam (오색 광선, the drawing): five glass balls — fire, lightning, star, ice, wind, each with its emblem inside
    // and a crown of its element round it — open small in an arch high over the field and swell. Then five real lasers
    // shoot out of them, meet on one monster and each is a hit the moment its tip arrives; where they meet a ball of mixed
    // light swells — and goes off in a rainbow burst of crystals. The balls shrink and fade away after it. The beams
    // follow the monster if it moves.
    S.prism = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      // a target off the edge of the screen would hide the beams: take the nearest monster that can be seen instead
      // and one right beside the wizard would make the lasers stubs: unless it is a boss, aim at a visible monster a few
      // steps away so the five beams really fly across the field
      (function () {
        var h0 = sc.heroCenter(), d = function (m) { var q = mp(m); return Math.hypot(q.x - h0.x, q.z - h0.z); };
        if (mob.boss && onScreen(mp(mob))) return;
        if (onScreen(mp(mob)) && d(mob) >= 2.4) return;
        // a copy of a one-monster cast (fx.js) leaves the monsters the other copies aim at alone
        var seen = liveMobs().filter(function (m) { return onScreen(mp(m)) && !(c.avoid && c.avoid(m)); });
        if (!seen.length) return;
        var sx = function (m) { return Math.abs(mp(m).project(sc.camera).x); };
        seen.sort(function (a, b) { return Math.abs(d(a) - 3.8) + sx(a) * 3 - Math.abs(d(b) - 3.8) - sx(b) * 3; });
        mob = seen[0]; if (c.claim) c.claim(mob);
      })();
      c.plain = true;
      sc.heroPose('thrust', c.D(0.3), 0xffffff); sc.dim(0.55, c.D(1.45));
      var cs = Math.min(1.5, c.s), APPEAR = c.D(0.14), CH = c.D(0.34), FIRE = c.D(0.05), TRAVEL = c.D(0.1), HOLD = c.D(0.4), FADE = c.D(0.42), land = mp(mob);
      var START = APPEAR + CH, MEET0 = START + FIRE * 4 + TRAVEL, BURST = MEET0 + HOLD, clk = 0, burst = false, core = null;
      function target() { land = mp(mob); return land; }
      // the balls hang in an arch high over the middle of the screen (as high as the screen allows), so the lasers come
      // down long and steep from five sides on to the monster
      var arch = (function () {
        var t = land, z = t.z - 0.5, h = 2.6, cx = sc.heroCenter().x;
        var midX = function (hh) { var lo = cx - 8, hi = cx + 8; for (var k = 0; k < 24; k++) { var m = (lo + hi) / 2; if (V(m, hh, z).project(sc.camera).x < 0) lo = m; else hi = m; } return (lo + hi) / 2; };
        for (var hh = 5.2; hh > 2.6; hh -= 0.2) { cx = midX(hh); if (V(cx, hh, z).project(sc.camera).y < 0.6) { h = hh; break; } }
        cx = midX(h);
        var sp = 1.15 * Math.min(1.25, cs);
        for (; sp > 0.6; sp -= 0.05) { var L = V(cx - 2 * sp, h - 0.9, z).project(sc.camera), Rr = V(cx + 2 * sp, h - 0.9, z).project(sc.camera); if (L.x > -0.8 && Rr.x < 0.68) break; }
        // the second copy of a one-monster cast hangs its arch lower and half a step aside, so the ten balls do not pile up
        return { x: cx + (c.copy ? sp * 0.5 : 0), y: h - (c.copy ? 1.0 : 0), z: z, sp: sp };
      })();
      var lean = [0, 0, 0, 0, 0];   // 0..1: how far each ball has leaned toward the monster (it points before it fires)
      function orbBase(i) { var o = i - 2; return V(arch.x + o * arch.sp, arch.y - Math.abs(o) * 0.45 + Math.sin(i * 1.7 + clk * 3.3) * 0.04, arch.z); }
      function orbPos(i) { var p = orbBase(i); if (lean[i] > 0) { var t0 = target(), d = V(t0.x - p.x, t0.y - p.y, t0.z - p.z); var L = d.length(); if (L > 0.01) p.addScaledVector(d, Math.min(0.55, L * 0.15) * lean[i] / L); } return p; }
      function meetPos() { var t = target(); return V(t.x, t.y + 0.15, t.z); }
      var orbs = E9.map(function (col, i) { return { g: P3.glassOrb(e9o(i, { kind: i, haloA: c.copy ? 0.14 : 0.28 })), at: V(), born: false, beam: null, struck: false, a: V(), b: V() }; });
      function beamStrike(o, i, m) {
        if (o.struck) return; o.struck = true;
        var col = E9[i];
        flare(m, 0xffffff, 1.2 * cs, 0.12, { white: true }); ring(m, col, 1.6 * cs, 0.22);
        sparks(m, [0xffffff, col], N(10, c), 7, { size: 0.2, stretch: 0.16 }); sc.shake(0.09); sc.light(m, col, 1.6, 0.25);
        c.hit(mob, 0.1, 1.0);
      }
      tick(function (dt) {
        clk += dt;
        var fk = burst ? Math.min(1, (clk - BURST) / FADE) : 0;
        orbs.forEach(function (o, i) {
          var col = E9[i], t = clk - c.D(i * 0.03);
          if (t < 0) { o.g.set(orbBase(i), 0.001, dt); return; }
          if (!o.born) { o.born = true; var p0 = orbBase(i); flare(p0, 0xffffff, 0.7 * cs, 0.12, { white: true }); ring(p0, col, 1.1 * cs, 0.2); e9sparks(i, p0, N(4, c), 2.5); }
          // it opens small, then swells while it charges (throbbing a little), and after the burst shrinks away
          var k2 = Math.max(0, Math.min(1, (t - APPEAR) / CH));
          var size = 0.25 * cs * (0.4 * ez(t / APPEAR) + 0.6 * ez(k2)) * (c.copy ? 0.75 : 1) * (1 + Math.sin(t * 38 + i) * 0.04 * (1 - fk)) * (1 - 0.8 * fk);
          // it leans toward the monster just before it fires, and back again as it fades
          var lt = clk - (START + FIRE * i - c.D(0.08)); lean[i] = lt > 0 ? ez(lt / c.D(0.08)) * (1 - fk) : 0;
          o.at.copy(orbPos(i)); o.g.set(o.at, size, dt, 1 - fk * 0.6);
          // while it charges, bits of its element are drawn into it
          if (t > APPEAR && clk < START + FIRE * i && Math.random() < dt * 40 * c.n) { var d = rdir(rr(0.8, 1.3)); E({ pos: o.at.clone().add(d), vel: d.clone().multiplyScalar(-4.5), frame: pick([E9F[i], 'dot', 'flare']), color: i ? [0xffffff, col] : [col, deep(col)], size: [0.2, 0.05], life: 0.22, drag: 0.5, white: i === 3 }); }
          // the laser: a real tube of light from the ball; its tip races to the monster, then it holds and burns, narrows
          // into the ball of mixed light, and after the burst thins away
          var bt = clk - (START + FIRE * i);
          if (bt >= 0 && !o.beam) { o.beam = P3.beam({ col: col, deep: vx.isBright && vx.isBright() ? deep(deep(col)) : deep(col), r: 0.1 * cs }); o.a.copy(o.at); flare(o.at, 0xffffff, 1.0 * cs, 0.1, { white: true }); E({ pos: o.at, frame: 'ring', color: col, size: [0.3, 1.3 * cs], ease: 1, life: 0.2 }); }
          if (o.beam && o.beam !== 'gone') {
            var k = Math.min(1, bt / TRAVEL), m = meetPos(); o.a.copy(o.at); o.b.lerpVectors(o.a, m, k * k * (3 - 2 * k));
            var open = clk < MEET0 ? 1 : !burst ? 1 - 0.55 * Math.min(1, (clk - MEET0) / HOLD) : 0.45 * (1 - (clk - BURST) / c.D(0.16));
            if (open <= 0) { o.beam.kill(); o.beam = 'gone'; }
            else {
              o.beam.set(o.a, o.b, open);
              if (k >= 1) beamStrike(o, i, m);
              if (o.struck && !burst && Math.random() < dt * 35 * c.n) E({ pos: m.clone(), vel: rdir(3).add(V(0, 1.2, 0)), frame: 'dot', color: [0xffffff, col], size: [0.1, 0], life: 0.3, grav: 3, stretch: 0.12 });
            }
          }
        });
        // where the five meet, a ball of mixed light swells, the five elements whirling into it
        if (!core && clk >= MEET0 && !burst) {
          var br = vx.isBright && vx.isBright();
          core = { heart: P3.orb(br ? { col: 0xff8af0, deep: 0x8a2cc0 } : { col: 0xffffff, deep: 0xff8af0 }), halo: P3.orb(br ? { col: 0xb050f0, deep: 0x4a1a90, alpha: 0.6, order: 6 } : { col: 0xffd8ff, deep: 0x8a4cff, alpha: 0.42, order: 6 }), bits: E9.map(function (col) { return lightBall(col, 1.6, 0.6); }), t: 0, o3: V() };
        }
        if (core && !burst) {
          core.t += dt; var kk = Math.min(1, core.t / HOLD), sz = (0.9 + 3.0 * kk) * cs * (1 + Math.sin(core.t * 60) * 0.06), mo = meetPos();
          core.heart.set(mo, sz * 0.11); core.halo.set(mo, sz * 0.22);
          core.bits.forEach(function (b, j) { var a = j / 5 * 6.283 + core.t * 14, rad = sz * (0.75 - 0.5 * kk); core.o3.set(mo.x + Math.cos(a) * rad, mo.y + Math.sin(a) * rad * 0.6, mo.z + Math.sin(a) * 0.2); b.set(core.o3, (0.16 + 0.1 * (1 - kk)) * cs); });
          if (Math.random() < dt * 60 * c.n) { var dd = rdir(rr(1.2, 2.2)); E({ pos: mo.clone().add(dd), vel: dd.clone().multiplyScalar(-6), frame: pick(['dot', 'star', 'flare']), color: [0xffffff, pick(E9)], size: [0.18, 0.04], life: 0.25 }); }
          if (Math.random() < dt * 8) sc.shake(0.05 + 0.1 * kk);
        }
        // the burst: the ball goes off as a 3D dome of lilac light with crystals of all five colours flung out of it and
        // five rings rolling away
        if (!burst && clk >= BURST) {
          burst = true;
          orbs.forEach(function (o, i) { if (!o.struck) { o.struck = true; c.hit(mob, 0.1, 1.0); } });   // every beam is its hit, however large the last step
          if (core) { core.heart.kill(); core.halo.kill(); core.bits.forEach(function (b) { b.kill(); }); core = null; }
          var q = mp(mob), g = V(q.x, 0, q.z), calm = c.copy ? 0.5 : 1;
          if (!c.copy) sc.flash('rgba(255,232,255,1)', 0.35); sc.climax(0.3, c.D(0.4)); sc.shake(0.6 * calm); sc.punch(0.14 * calm);
                    if (!c.copy) boomMotion(q, 0.6 * cs, 0xc078ff, 0x2a0c60, 0xffd8ff);
          E9.forEach(function (col, j) { if (c.copy && j % 2) return; shock(q, col, (3.0 + j * 1.2) * c.s, 0.6 + j * 0.08, { delay: j * 0.04, alpha: 0.42 * calm }); });
          for (var r = 0; r < N(8, c); r++) E({ pos: q, frame: 'streak', color: [E9[r % 5], E9[r % 5]], size: [0.8, 8], ease: 1, life: rr(0.45, 0.7), rot: r / 15 * 3.1416, alpha: 0.6, fadeOut: 0.3 });
          if (!c.copy) fieldWave(g, 0xd8b8ff, 0.4, 0x8a5cff);
          sparks(q, E9.concat([0xffffff]), N(24, c), 12, { size: 0.3, stretch: 0.14, life: 1.3 }); sc.light(q, 0xe0b0ff, 2.4, 0.6);
          c.hit(mob, 0.5, 2.6);
        }
        if (burst && clk >= BURST + FADE) { orbs.forEach(function (o) { o.g.kill(); if (o.beam && o.beam !== 'gone') o.beam.kill(); }); return true; }
        return false;
      });
    };
    // Element wheel (the drawing; 2026-11-15 the user: "it has to spin — whoooosh — and then BOOM"): a ring of rainbow
    // light forms round the wizard with the five 3D emblems riding on it, and it winds up — faster and faster, tighter
    // and brighter, wind and sparks sucked into it, the ground swirling and the screen shaking more and more. Then it
    // blows: a blast at the wizard, the screen flashes and all but stops for a beat, the ring is flung out over the whole
    // field as a wall of rainbow light with the emblems riding its edge and spears of light flying out ahead of it;
    // every monster it reaches is struck and bursts in the colour of the element coming its way.
    S.wheel = function (c) {
      sc.heroPose('spin', c.D(0.2), 0xffffff);
      var H = sc.heroCenter(), cs = Math.min(1.5, c.s), C0 = V(H.x, H.y, H.z), G = V(H.x, 0, H.z), R = 1.15 * cs, TILT = -1.25;
      var FORM = c.D(0.16), REL = c.D(0.62), COL = c.D(0.1), END = REL + COL + c.D(0.7), collapsing = false, colT = 0, clk = 0, phase = 0, released = false, P = V(), shakeT = 0;
      var MAXR = 11, WAVE = 15;   // the wave front: how far it goes and how fast (it is what hits)
      sc.dim(0.5, c.D(1.3));
      var ringP = P3.elemRing({ cols: E9, trail: 3.2 });
      var gems = E9.map(function (col, i) { return { e: P3.emblem(i, e9o(i, { glowA: 0.55, rock: 0.55, spin: 3 })), at: V(), dir: V() }; });
      var core = lightBall(0xd890ff, 1.7, 0.5);
      // the colour of the element coming toward a spot: the emblem whose side of the wheel it is on
      function elemAt(x, z) { var a = Math.atan2(z - G.z, x - G.x) / 6.2832; return ((Math.floor(((a - phase) % 1 + 1) % 1 * 5 + 0.5)) % 5); }
      tick(function (dt) {
        clk += dt;
        var form = ez(clk / FORM), wind = Math.min(1, clk / REL);
        if (!released) {
          // winding up: the turn speeds up from one turn a second to seven, the ring pulls in and grows brighter
          phase += dt * c.sp * (1 + 6 * wind * wind);
          var Rn = R * (0.55 + 0.45 * form) * (1 - 0.3 * wind * wind);
          ringP.set(C0, Rn, TILT, phase, form * (0.8 + 0.6 * wind));
          core.set(C0, (0.06 + 0.16 * wind * wind) * cs);
          gems.forEach(function (gm, i) {
            ringP.at(phase + i / 5, gm.at);
            gm.e.set(gm.at, 0.3 * cs * (0.35 + 0.65 * form) * (1 + 0.25 * wind), dt);
            // each throws sparks off along the way it turns, more and more
            if (Math.random() < dt * (18 + 70 * wind) * c.n) { var tg = V(-(gm.at.z - C0.z), 0, gm.at.x - C0.x).normalize().multiplyScalar(-rr(2, 4)); E({ pos: gm.at.clone(), vel: tg, frame: pick(['streak', 'dot', E9F[i]]), color: [0xffffff, E9[i]], size: [0.16, 0.02], life: rr(0.18, 0.3), drag: 2, stretch: 0.12, white: i === 3 }); }
          });
          // wind and light sucked in round it
          for (var sw = 0; sw < 2; sw++) if (Math.random() < dt * (40 + 110 * wind) * c.n) { var a = rr(0, 6.283), r0 = rr(2.2, 3.4) * cs, k = pick([0, 1, 2, 3, 4]); E({ pos: V(C0.x + Math.cos(a) * r0, C0.y + rr(-0.3, 0.5), C0.z + Math.sin(a) * r0 * 0.8), frame: pick(['streak', 'dot', 'flare']), color: [0xffffff, E9[k]], size: [0.18, 0.04], life: 0.3, upd: K.spiralIn(C0, a, r0, 3), stretch: 0.15 }); }
          // the ground swirls under it and the screen shakes harder and harder
          shakeT -= dt; if (shakeT <= 0) { shakeT = 0.09; sc.shake(0.03 + 0.18 * wind * wind); gRing(G, pick(E9), (0.8 + 1.6 * (1 - wind)) * cs, 0.18); }
          if (Math.random() < dt * 10 * wind) vx.lightning(C0.clone().add(rdir(0.3)), gems[(Math.random() * 5) | 0].at.clone(), { w: 0.06, color: pick(E9), life: 0.1, branches: 1, segs: 8, amp: 0.25 });
          if (clk >= REL) { released = true; collapsing = true; }
          return false;
        }
        // the wheel snaps in to a point at the wizard for a breath — everything pulled with it — and then goes off
        if (collapsing) {
          colT += dt; var kc = Math.min(1, colT / COL); phase += dt * c.sp * 9;
          ringP.set(C0, R * 0.7 * (1 - 0.85 * kc), TILT, phase, 1.6);
          core.set(C0, (0.22 + 0.12 * kc) * cs);
          gems.forEach(function (gm, i) { ringP.at(phase + i / 5, gm.at); gm.e.set(gm.at, 0.39 * cs * (1 - 0.6 * kc), dt); });
          if (kc >= 1) { collapsing = false; boom(); }
          return false;
        }
        // the ring is flung out over the field as a wall of light, the emblems riding its edge
        var o = clk - REL - COL, front = Math.min(MAXR, o * WAVE * c.sp), fade = Math.min(1, o / (END - REL));
        phase += dt * c.sp * 3;
        ringP.set(V(C0.x, 0.5, C0.z), Math.max(0.5, front), -Math.PI / 2, phase, 1.4 * (1 - fade * fade));
        gems.forEach(function (gm, i) {
          var a = (phase + i / 5) * 6.2832; gm.at.set(G.x + Math.cos(a) * front, 0.6 + 0.4 * Math.sin(o * 9 + i), G.z + Math.sin(a) * front * 0.85);
          gm.e.set(gm.at, 0.38 * cs * (1 - 0.6 * fade), dt);
          if (Math.random() < dt * 40 * c.n) e9sparks(i, gm.at, 1, 1.5);
        });
        if (clk < END) return false;
        ringP.kill(); gems.forEach(function (gm) { gm.e.kill(); });
        return true;
      });
      function boom() {
        core.kill();
        // BOOM: the screen flashes, all but stops for a beat and is punched in; a blast of light goes off at the wizard
        sc.flash('rgba(230,170,255,0.5)', 0.35); sc.climax(0.9, 0.7); sc.punch(0.18); sc.shake(0.9);
        boomMotion(C0.clone(), 1.1 * cs, 0xb050f0, 0x22073e, 0xffd8ff);
        sc.light(C0, 0xe8c0ff, 3, 0.6);
        E({ sys: 'col', pos: C0, frame: 'shock', color: 0xd890ff, size: [1, 15], ease: 1, life: 0.6, alpha: 0.7, big: true, fadeOut: 0.3 });
        for (var r = 0; r < N(7, c); r++) E({ pos: C0, frame: 'streak', color: [E9[r % 5], E9[r % 5]], size: [0.6, 7], ease: 1, life: rr(0.3, 0.5), rot: r / 12 * 3.1416 + rr(-0.1, 0.1), alpha: 0.45, fadeOut: 0.3 });
        embers(C0, E9, N(14, c), { speed: 7, up: 1.5, grav: 2 });
        fieldWave(G, 0xffd8ff, 0.55, 0x9a5cff);
        E9.forEach(function (col, j) { shock(V(C0.x, 0.3, C0.z), col, (4 + j * 1.6) * c.s, 0.5 + j * 0.06, { delay: j * 0.03, alpha: 0.5 }); });
        // spears of light fly out ahead of the wave, in all five colours
        for (var s = 0; s < N(10, c); s++) { var a = s / N(10, c) * 6.283 + rr(-0.1, 0.1), k = elemAt(G.x + Math.cos(a), G.z + Math.sin(a)), sp = rr(13, 19); lightSpear(k, V(C0.x, 0.5, C0.z), V(Math.cos(a) * sp, rr(0.5, 2), Math.sin(a) * sp * 0.85), rr(0.5, 0.8) * cs, 0.5); }
        sparks(C0, E9, N(28, c), 14, { size: 0.26, stretch: 0.12, life: 1.3 });
        // every monster the wall of light reaches is struck, in the colour of the element coming its way
        var n = 0;
        ringHits(c, G, WAVE, MAXR, function (m) {
          var q = mp(m), k = elemAt(m.x, m.z), col = E9[k], few = n++ < 5;
          elemBlast(k, q, (m.boss ? 1.5 : 1) * cs, few, c);
          if (few) sc.shake(0.12);
          c.hit(m, 1, 1.8);
          if (m.alive && !m.boss) { var dx = m.x - G.x, dz = m.z - G.z, dl = Math.sqrt(dx * dx + dz * dz) || 1; m.pvx = dx / dl * 7; m.pvz = dz / dl * 5.5; }
        });
      }
    };
    // a spear of an element's light shot out from a spot: a bright crystal pointing the way it flies, a streak of its
    // colour behind it; it slows hard and shrinks away
    function lightSpear(k, p, vel, len, life) {
      if (CW.fxOff && CW.fxOff.shards) return;
      P3.crystal({ pos: p, vel: vel, col: new T.Color(E9[k]).lerp(new T.Color(0xffffff), 0.35).getHex(), line: E9[k], len: len, thin: 0.22, grav: 0, drag: 3.5, life: life, spin: 0 });
      E({ pos: p.clone(), vel: vel.clone().multiplyScalar(0.8), frame: 'streak', color: [E9[k], deep(E9[k])], size: [len * 1.4, 0.1], life: life * 0.6, drag: 3.5, stretch: 0.16, alpha: 0.7 });
    }
    // an element bursting on a monster: a flash of its colour, a star of light spears flying out of it, its own bits, a
    // ring on the ground (in colour, never white: a whole crowd bursts at once and white on white went to a white field)
    // The burst of a big element blast, in beats (2026-11-15 the user: make the explosion move well): a hot heart
    // flashes and swells in a blink; the fire dome bursts out round it; a moment later it booms again from inside,
    // smaller and hotter — so it rolls out instead of popping once (one inner boom, small and short: the big see-through
    // balls drawn over each other are what cost the graphics chip the most, 2026-11-15)
    function boomMotion(p, s, col, low, ringCol) {
      if (CW.fxOff && CW.fxOff.domes) return;
      var heart = P3.orb({ col: 0xffe0ff, deep: col }), t = 0, at = p.clone();
      tick(function (dt) { t += dt; var k = Math.min(1, t / 0.14); heart.set(at, s * (0.1 + 0.3 * ez(k)), 1 - k * k); if (k < 1) return false; heart.kill(); return true; });
      // one ball, not as wide and gone sooner: the big see-through balls covering the screen were what made the iPhone
      // stutter (2026-11-15, dev/phone-perf9.html: with them off 60 frames a second, with them on 52); the second beat
      // is a jolt of the camera instead of a second ball
      P3.blast(at, { ball: true, y: at.y, size: s * 0.62, col: col, low: low, hotness: 0.12, ringCol: ringCol, ring: 5 / 0.62, chips: 0, crater: false, life: 0.5, flash: false, keepAdd: true });
      after(0.13, function () { sc.shake(0.35); sc.punch(0.06); });
    }
    function elemBlast(k, q, s, few, c) {
      var col = E9[k], g = V(q.x, 0, q.z);
      flare(q, col, 0.9 * s, 0.14); E({ sys: 'col', pos: q, frame: 'star', color: [col, deep(col)], size: [0.4, 1.7 * s], ease: 1, life: 0.3, spin: 7, alpha: 0.9 });
      gRing(g, col, 2.0 * s, 0.4); if (few) sc.light(q, col, 1.4, 0.25);
      var n = few ? 4 : 0; for (var i = 0; i < n; i++) { var a = i / n * 6.283 + rr(-0.2, 0.2), sp = rr(7, 10) * s; lightSpear(k, q, V(Math.cos(a) * sp, rr(1, 3), Math.sin(a) * sp * 0.8), rr(0.3, 0.45) * s, 0.4); }
      e9sparks(k, q, N(few ? 4 : 2, c), 3.5);
    }
    // Element fusion, the ultimate (2026-11-15 the user: the elements come out, gather power, and it all ends in one
    // enormous explosion). The five glass balls of the elements open far apart round the edge of the screen and spiral
    // in, trailing their colours, to one point high over the field. There they fuse into one ball of five colours that
    // gathers power: light, wind and sparks are sucked in from every edge of the screen, the emblems whirl round it
    // tighter and tighter, lightning cracks down to the ground, the ground glows and the screen shakes harder and harder.
    // It snaps in to a point — and goes off: the screen all but stops, a huge blast of five-coloured fire, a wave that
    // crosses the whole screen; every monster it reaches bursts in an element and is thrown back.
    S.nova = function (c) {
      c.plain = true;
      sc.heroPose('raise', c.D(0.2), 0xffffff);
      var cs = Math.min(1.6, c.s), cen = c.center || FC, C = V(cen.x * 0.5, 2.1, cen.z * 0.5 - 0.4), G = V(C.x, 0, C.z);
      // high over the field, but on the screen
      for (var h = 2.6; h > 1.2; h -= 0.1) { C.y = h; if (C.clone().project(sc.camera).y < 0.45) break; }
      var APPEAR = c.D(0.22), FLY = c.D(0.5), CHARGE = c.D(0.62), COL = c.D(0.1), T1 = APPEAR + FLY, T2 = T1 + CHARGE, T3 = T2 + COL, clk = 0, booming = false, shakeT = 0, zapT = 0;
      sc.dim(0.65, T3 + c.D(0.7));
      // where each ball opens: round the edge of the screen, as far out as can still be seen
      var home = E9.map(function (col, i) {
        var a = Math.PI / 2 + i / 5 * 6.2832, p;
        for (var rad = 3.6; rad > 1.2; rad -= 0.15) { p = V(C.x + Math.cos(a) * rad, C.y + Math.sin(a) * rad * 0.42, C.z - Math.sin(a) * rad * 0.35); if (onScreen(p)) break; }
        return { p: p, a: a, r: rad };
      });
      var balls = E9.map(function (col, i) { return { g: P3.glassOrb(e9o(i, { kind: i, haloA: 0.32 })), at: V(), born: false, rib: vx.ribbon({ solid: true, mode: 'trail', w: 0.22 * cs, color: deep(col), core: 0.9, maxPts: 26, shrink: 30 }), halo: vx.ribbon({ mode: 'trail', w: 0.5 * cs, color: col, core: 0, alpha: 0.3, maxPts: 26, shrink: 30 }) }; });
      var core = null, heart = null, ringP = null;
      tick(function (dt) {
        clk += dt;
        if (clk < T1) {
          // the balls open round the edge, then spiral in, faster and faster
          balls.forEach(function (b, i) {
            var t = clk - c.D(i * 0.04); if (t < 0) { b.g.set(home[i].p, 0.001, dt); return; }
            if (!b.born) { b.born = true; flare(home[i].p, E9[i], 1.2 * cs, 0.16); ring(home[i].p, E9[i], 1.6 * cs, 0.25); e9sparks(i, home[i].p, N(6, c), 3); sc.shake(0.05); }
            var k = Math.max(0, (clk - APPEAR) / FLY), ke = k * k, a = home[i].a + ke * 4.2, rad = home[i].r * (1 - ke);
            b.at.set(C.x + Math.cos(a) * rad, C.y + Math.sin(a) * rad * 0.42, C.z - Math.sin(a) * rad * 0.35);
            b.g.set(b.at, 0.36 * cs * ez(t / APPEAR), dt);
            if (k > 0) { if (b.rib) b.rib.head(b.at); if (b.halo) b.halo.head(b.at); if (Math.random() < dt * 30 * c.n) e9sparks(i, b.at, 1, 1.5); }
          });
          return false;
        }
        if (!core) {
          // they meet: one ball of five colours, the emblems whirling round it
          balls.forEach(function (b) { b.g.kill(); if (b.rib) b.rib.detach(); if (b.halo) b.halo.detach(); });
          balls = E9.map(function (col, i) { return { e: P3.emblem(i, e9o(i, { glowA: 0.5, rock: 0.6, spin: 4 })), at: V() }; });
          var br = vx.isBright && vx.isBright();
          heart = P3.orb(br ? { col: 0xff8af0, deep: 0x8a2cc0 } : { col: 0xffe8ff, deep: 0xd070ff });
          core = P3.orb(br ? { col: 0xb050f0, deep: 0x4a1a90, alpha: 0.6, order: 6 } : { col: 0xd890ff, deep: 0x6a2cff, alpha: 0.5, order: 6 });
          ringP = P3.elemRing({ cols: E9, trail: 3.2 });
          sc.flash('rgba(255,230,255,0.35)', 0.2); sc.shake(0.3); sc.punch(0.06);
          E9.forEach(function (col, j) { shock(C, col, (1.6 + j * 0.4) * cs, 0.35, { delay: j * 0.03, alpha: 0.5 }); });
        }
        var k2 = Math.min(1, (clk - T1) / CHARGE), sz = (0.35 + 0.75 * k2 * k2) * cs * (1 + Math.sin(clk * 50) * 0.05 * k2), col2 = 1 - Math.min(1, Math.max(0, (clk - T2) / COL));
        if (clk >= T2) sz *= 0.25 + 0.75 * col2;   // it snaps in to a point
        heart.set(C, sz * 0.55); core.set(C, sz * 1.25);
        ringP.set(C, (1.7 - 0.8 * k2) * cs * (0.25 + 0.75 * col2), -1.2, clk * (1 + 5 * k2), 0.8 + 0.7 * k2);
        balls.forEach(function (b, i) { ringP.at(clk * (1 + 5 * k2) + i / 5, b.at); b.e.set(b.at, 0.32 * cs * (1 - 0.35 * k2) * (0.4 + 0.6 * col2), dt); });
        // power sucked in from every edge of the screen
        for (var s = 0; s < 3; s++) if (Math.random() < dt * (40 + 120 * k2) * c.n) { var a = rr(0, 6.283), r0 = rr(3.5, 7); E({ pos: C, frame: pick(['streak', 'dot', 'flare']), color: [0xffffff, pick(E9)], size: [rr(0.14, 0.26), 0.03], life: rr(0.25, 0.45), upd: K.spiralIn(C, a, r0, 2), stretch: 0.08, fadeIn: 0.25 }); }
        if (Math.random() < dt * (10 + 30 * k2) * c.n) { var an = rr(0, 6.283), R0 = rr(5, 7.5), from = V(C.x + Math.cos(an) * R0, C.y + Math.sin(an) * R0 * 0.5, C.z - Math.sin(an) * R0 * 0.25), lf = 0.25; E({ pos: from, vel: C.clone().sub(from).multiplyScalar(0.9 / lf), frame: 'streak', color: pick(E9), size: [rr(0.7, 1.2), 0.2], life: lf, stretch: 0.05, alpha: 0.7, fadeIn: 0.3, fadeOut: 0.8 }); }
        // lightning cracks down to the ground and the ground under it glows
        zapT -= dt; if (zapT <= 0) { zapT = 0.16 - 0.1 * k2; var gq = V(G.x + rr(-2.2, 2.2), 0.05, G.z + rr(-1.4, 1.2)); vx.lightning(C.clone(), gq, { w: 0.07, color: pick(E9), life: 0.12, branches: 1, segs: 10, amp: 0.3 }); gRing(gq, pick(E9), 1.0, 0.25); }
        shakeT -= dt; if (shakeT <= 0) { shakeT = 0.08; sc.shake(0.04 + 0.22 * k2 * k2); gGlow(G, pick(E9), 1.5 + 2 * k2, 0.2); }
        if (Math.random() < dt * 20) sc.punch(0.004 + 0.01 * k2);
        if (clk < T3) return false;
        if (!booming) { booming = true; novaBoom(); }
        return true;
      });
      function novaBoom() {
        heart.kill(); core.kill(); ringP.kill(); balls.forEach(function (b) { b.e.kill(); });
        // the screen all but stops; a huge blast of five-coloured fire and a wave that crosses the whole screen
        sc.flash('rgba(235,180,255,0.55)', 0.4); sc.climax(1.0, 0.85); sc.shake(1.0); sc.punch(0.2);
        boomMotion(C, 1.8 * cs, 0xb050f0, 0x22073e, 0xffd8ff);
        P3.blast(G, { size: 0.65 * cs, col: 0xff8a2b, flash: false, chips: 6, ring: 3, life: 0.6 });
        E({ sys: 'col', pos: C, frame: 'shock', color: 0xd890ff, size: [1, 16], ease: 1, life: 0.7, alpha: 0.75, big: true, fadeOut: 0.3 });
        fieldWave(G, 0xd8a8ff, 0.9, 0xff6ad8); gGlow(G, 0xd890ff, 5, 0.8); scorch(G, 2.8, 2.8);
        E9.forEach(function (col, j) { shock(C, col, (4.5 + j * 1.8) * c.s, 0.6 + j * 0.07, { delay: j * 0.04, alpha: 0.5 }); });
        for (var r = 0; r < N(8, c); r++) E({ pos: C, frame: 'streak', color: [E9[r % 5], E9[r % 5]], size: [0.7, 9], ease: 1, life: rr(0.35, 0.6), rot: r / 14 * 3.1416 + rr(-0.1, 0.1), alpha: 0.5, fadeOut: 0.3 });
        for (var s = 0; s < N(12, c); s++) { var a = s / N(12, c) * 6.283 + rr(-0.1, 0.1), sp = rr(14, 20); lightSpear(s % 5, C, V(Math.cos(a) * sp, Math.sin(a) * sp * 0.5, -Math.sin(a) * sp * 0.3), rr(0.6, 0.9) * cs, 0.55); }
        sparks(C, E9, N(36, c), 15, { size: 0.3, stretch: 0.12, life: 1.5 }); embers(C, E9, N(16, c), { speed: 8, up: 1.5, grav: 2 });
        smoke(V(G.x, 0.6, G.z), [0x3a2060, 0x140a24], N(8, c), { r: 1.4, size: 2, rise: 0.7, speed: 2, alpha: 0.45, life: 1.4 });
        sc.light(C, 0xe0b0ff, 3.2, 0.8);
        // the elements burst out of the ground all over the field as the wave passes
        for (var f = 0; f < N(12, c); f++) (function (f) { var gq = fieldPt(0); after(Math.hypot(gq.x - G.x, gq.z - G.z) / (16 * c.sp), function () { elemBlast(f % 5, V(gq.x, 0.4, gq.z), 0.9 * cs, false, c); }); })(f);
        var n = 0;
        ringHits(c, G, 16, 11, function (m) {
          var q = mp(m), k = Math.floor(((Math.atan2(m.z - G.z, m.x - G.x) / 6.2832) % 1 + 1) % 1 * 5) % 5, few = n++ < 6;
          elemBlast(k, q, (m.boss ? 1.5 : 1.1) * cs, few, c);
          if (few) sc.shake(0.12);
          c.hit(m, 1, 2.2);
          if (m.alive && !m.boss) { var dx = m.x - G.x, dz = m.z - G.z, dl = Math.sqrt(dx * dx + dz * dz) || 1; m.pvx = dx / dl * 8; m.pvz = dz / dl * 6; }
        });
      }
    };
  };
})(this);
