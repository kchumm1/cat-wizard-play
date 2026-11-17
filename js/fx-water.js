// Tier 11, 물 냥법사 (2026-11-17, docs/superpowers/specs/2026-11-17-tier11-water-design.md): the water skills in real 3D
// — shapes made in Blender (js/mesh-water.js, tools/blender/water_meshes.py), drawn after the user's ChatGPT design
// (art-src/ai-review/2026-11-17-water/design) as see-through cel water with foam and a navy outline (js/fx3d.js
// FS_BM.water), grown by k.
// Water, not ice: deep sea blue, heavy and sloshing, the white parts are outlined foam — no added light, no white flash.
// Every scene: gather → the body → the moment it lands (a jolt, a shake, a held beat) → what is left.
// Whatever visibly lands is a real hit, and every monster ends up with the skill's whole damage.
(function (root) {
  var CW = root.CW = root.CW || {};
  CW.fxWater = function (K, S) {
    var T = K.T, sc = K.sc, V = K.V, rr = K.rr, E = K.E, N = K.N, after = K.after, tick = K.tick, gp = K.gp, P3 = K.P3;
    var SEA = 0x2f7fe0, TEAL = 0x3fc8d8, FOAM = 0xfff6e0, NAVY = 0x0a1a3a;
    var UP = new T.Vector3(0, 1, 0);
    function yawQ(a) { return new T.Quaternion().setFromAxisAngle(UP, a); }
    function ease(x) { x = Math.min(1, Math.max(0, x)); return 1 - (1 - x) * (1 - x); }
    function ease3(x) { x = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - x, 3); }
    function cap(c, lo, hi) { return Math.min(hi, Math.max(lo, c.s)); }

    // a lump of water flung from p with velocity vel: tumbles, falls, and where it lands leaves a little splash ring
    function blob(p, vel, sz, life) {
      var h = P3.bm('waterBlob', {}), P = p.clone(), v = vel.clone(), t = 0, L = life || rr(0.5, 0.8), q = new T.Quaternion(), D = new T.Vector3();
      tick(function (dt) {
        if (!h.live()) return true;
        t += dt; v.y -= 11 * dt; P.addScaledVector(v, dt);
        // its tail streams behind it (the drop's +y)
        D.copy(v).normalize().negate(); if (D.lengthSq() > 0.5) q.setFromUnitVectors(UP, D);
        var a = Math.min(1, (L - t) / 0.15);
        h.set(P, q, sz * (1 + 0.15 * Math.sin(t * 30)), Math.max(0, a), 1);
        if (P.y <= 0.02 && v.y < 0) { K.gRing(V(P.x, 0.03, P.z), TEAL, 0.35 * sz / 0.2, 0.25); h.kill(); return true; }
        if (t < L) return false; h.kill(); return true;
      });
    }
    function blobs(p, n, spd, sz, up) {
      for (var i = 0; i < n; i++) { var a = rr(0, 6.283), s = spd * rr(0.5, 1); blob(p, V(Math.cos(a) * s, (up || 1) * spd * rr(0.7, 1.3), Math.sin(a) * s * 0.8), sz * rr(0.7, 1.2)); }
    }
    // a puff of foam: pops up, sits a moment and melts away
    function foam(p, sz, life, vel) {
      var h = P3.bm('foamPuff', {}), P = p.clone(), v = vel ? vel.clone() : V(0, 0, 0), t = 0, L = life || 0.6, q = yawQ(rr(0, 6.3));
      tick(function (dt) {
        if (!h.live()) return true;
        t += dt; if (vel) { v.y -= 9 * dt; P.addScaledVector(v, dt); if (P.y < 0) { P.y = 0; v.set(0, 0, 0); } }
        var g = ease3(t / 0.08), out = Math.max(0, (t - L * 0.6) / (L * 0.4));
        h.set(P, q, sz * g * (1 - 0.5 * out), 1 - out, 1);
        if (t < L) return false; h.kill(); return true;
      });
    }
    // a claw of water (waterTongue: rises along +y, curls over toward +z): grows out of p turned to yaw (its curl toward
    // the screen direction cos/sin of yaw → +x at 0), tipped out by lean, and falls away
    function tongue(p, yaw, sz, grow, life, lean) {
      var h = P3.bm('waterTongue', {}), t = 0, L = life || 0.35, G = grow || 0.1;
      var q = yawQ(Math.PI / 2 - yaw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), lean || 0));
      tick(function (dt) {
        t += dt; var k = ease3(t / G), out = Math.max(0, (t - L * 0.55) / (L * 0.45));
        h.set(V(p.x, p.y - out * 0.3 * sz, p.z), q, sz * (1 + 0.15 * out), 1 - out * out, k);
        if (t < L) return false; h.kill(); return true;
      });
    }
    // a ring of claws bursting out of p (where water lands hard): n of them leaning outward all round
    function claws(p, n, sz, life) {
      for (var i = 0; i < n; i++) { var a = i / n * 6.283 + rr(-0.3, 0.3); tongue(V(p.x + Math.cos(a) * 0.15 * sz, p.y, p.z + Math.sin(a) * 0.12 * sz), a, sz * rr(0.75, 1.15), rr(0.07, 0.11), life || rr(0.32, 0.45), rr(0.2, 0.6)); }
    }
    // spray: small drops flung from p, falling (one batched layer)
    function spray(p, n, spd, sz, dir) {
      for (var i = 0; i < n; i++) (function () {
        var h = P3.bm('waterDrop', {}), P = p.clone(), v = (dir ? dir.clone().multiplyScalar(spd * rr(0.6, 1.2)) : V(0, 0, 0)).add(K.rdir(spd * 0.6)).add(V(0, spd * rr(0.3, 0.9), 0)), t = 0, L = rr(0.35, 0.6), s0 = sz * rr(0.6, 1.4);
        tick(function (dt) {
          if (!h.live()) return true;
          t += dt; v.y -= 10 * dt; P.addScaledVector(v, dt);
          h.set(P, null, V(s0, s0 * (1 + Math.min(1.5, v.length() * 0.12)), s0), Math.min(1, (L - t) / 0.12), 1);
          if (t < L && P.y > 0) return false; h.kill(); return true;
        });
      })();
    }
    // white water: fine spray thrown off p (cheap batched particles, drawn over — not added light, so no white glow),
    // falling; and a light mist that hangs and drifts (the user: 하얀 물보라 입자와 옅은 물안개)
    function whiteSpray(p, n, spd, dir) {
      for (var i = 0; i < n; i++) {
        var v = (dir ? dir.clone().multiplyScalar(spd * rr(0.5, 1.1)) : V(0, 0, 0)).add(K.rdir(spd * 0.7)).add(V(0, spd * rr(0.4, 1), 0));
        E({ sys: 'norm', pos: p.clone().add(K.rdir(0.15)), vel: v, frame: 'dot', color: [0xffffff, 0xd8f4ff], size: [rr(0.05, 0.11), 0.02], life: rr(0.35, 0.6), grav: 9, drag: 0.6, alpha: 0.95 });
      }
    }
    function mist(p, n, size, life) {
      for (var i = 0; i < n; i++) E({ sys: 'gnorm', pos: V(p.x + rr(-0.5, 0.5) * size, rr(0.15, 0.5), p.z + rr(-0.4, 0.4) * size), vel: V(rr(-0.3, 0.3), rr(0.15, 0.45), rr(-0.2, 0.2)), frame: 'smoke', color: 0xe4f6ff, size: [0.5 * size, 1.4 * size], ease: 1, life: life || rr(0.9, 1.4), alpha: 0.32, fadeIn: 0.12, fadeOut: 0.6 });
    }
    // the painted splash (art/fx-watersplash.webp): played once at p, size wide
    function splash(p, size, span) {
      var h = P3.sheetFx('fx-watersplash'), t = 0, L = span || 0.6;
      tick(function (dt) {
        t += dt; var f = Math.min(15.99, t / L * 16);
        h.set(V(p.x, 0, p.z), size, f, 0, Math.min(1, (L - t) / 0.1));
        if (t < L) return false; h.kill(); return true;
      });
    }
    function wet(p, size, life) { if (P3.lavaMark) P3.lavaMark(V(p.x, 0, p.z), size, life || 1.4, 'fx-watermark'); }
    // the beat everything lands on: held, shaken (big: the strongest)
    function slam(power, hold) { sc.hitStop(hold); sc.shake(power); }
    function spread(list) {
      var x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      list.forEach(function (m) { x0 = Math.min(x0, m.x); x1 = Math.max(x1, m.x); z0 = Math.min(z0, m.z); z1 = Math.max(z1, m.z); });
      return { x0: x0, x1: x1, z0: z0, z1: z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
    }

    // ---- 1. 대해일 (the great wave, every monster): the sea wells up at the side of the field and towers into a wave,
    // its lip curling over as it rolls across (sideways, so the game's camera sees its curl — from behind it was a blue
    // hill); a crest of foam boils along its top; it breaks on the monsters one after another (a jolt and a hard shake
    // at the first), crashes down into foam and flung water at the far side, and leaves the ground wet.
    S.tidalWave = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('raise', c.D(0.12), c.col);
      var H = sc.heroCenter(), B = spread(list.concat([{ x: H.x, z: H.z }])), s = cap(c, 2.6, 3.4);
      var DEP = Math.min(7.5, Math.max(4.5, B.z1 - B.z0 + 3)), HT = 0.85 * s, cz = B.cz;
      // (design 2-tidal: a towering wave filling half the screen, coming in on a slant) it rises just inside the left side
      var X0 = Math.max(B.x0 - 1.0, H.x - 2.6), X1 = B.x1 + 0.6, RISE = c.D(0.2), RUN = c.D(0.5), CRASH = c.D(0.16), t = 0, fm = 0;
      var wave = P3.bm('waveSheet', {}), flood = P3.bm('floodSheet', {}), q = yawQ(-Math.PI / 2 - 0.3), hit = [], first = true, crashed = false, SZ = V(), FL = V();
      // the swell gathering at the side: water welling up out of the ground in a line
      for (var i = 0; i < N(7, c); i++) foam(V(X0 + rr(-0.2, 0.3), 0, cz + rr(-DEP / 2, DEP / 2)), rr(0.9, 1.4), c.D(0.35));
      sc.shake(0.08);
      tick(function (dt) {
        t += dt;
        var rise = ease(t / RISE), run = ease3((t - RISE) / RUN), x = X0 + (X1 - X0) * run;
        var down = crashed ? Math.min(1, (t - RISE - RUN) / CRASH) : 0;
        var hgt = HT * (0.25 + 0.75 * rise) * (1 - 0.85 * down), k = Math.min(1, 0.35 + 0.55 * rise + 0.1 * run);
        SZ.set(DEP, hgt, HT * 0.95);
        wave.set(V(x, 0, cz), q, SZ, 1 - down * down, k);
        // the lip, about 0.55 of its depth ahead of its middle
        var lip = x + 0.55 * HT * 0.95;
        // the sea it leaves behind: the field flooded from where it rose up to its foot (design 2-tidal: the monsters in churning water)
        var back = x - 0.6 * HT, len = Math.max(0.1, back - X0 + 0.6), gone = crashed ? Math.min(1, (t - RISE - RUN) / c.D(0.7)) : 0;
        flood.set(V(X0 - 0.6 + len / 2, 0, cz), null, FL.set(len, 1, DEP * 1.05), 1 - gone * gone, 1);
        // foam boiling along the crest as it rolls
        fm += dt * 55 * (1 - down);
        while (fm >= 1 && t > RISE * 0.6) {
          fm -= 1; var zc = cz + rr(-DEP / 2, DEP / 2) * 0.92, top = V(lip - rr(0.15, 0.35) * HT * 0.5, hgt * rr(0.82, 0.98), zc);
          // claws of water curling over the crest, spray thrown ahead, now and then a puff of foam
          if (Math.random() < 0.3) tongue(top, rr(-0.3, 0.3), HT * rr(0.3, 0.42), c.D(0.1), c.D(0.28), rr(-0.1, 0.2));
          spray(top, 1, 2.4, 1.0, V(1, 0.2, 0)); whiteSpray(top, 3, 2.6, V(1, 0.3, 0));
          if (Math.random() < 0.25) foam(top, rr(1.0, 1.5), c.D(0.22), V(rr(1, 3), rr(0, 1), 0));
        }
        list.forEach(function (m) {
          if (t < RISE || hit.indexOf(m) >= 0 || lip < m.x - 0.25) return;   // (not before it has risen)
          hit.push(m);
          var g = gp(m), p = sc.mobPos(m);
          splash(g, 1.6 * (m.boss ? 1.5 : 1), c.D(0.55)); claws(V(g.x, 0, g.z), N(3, c), 0.9 * (m.boss ? 1.5 : 1)); spray(V(g.x, 0.5, g.z), N(4, c), 3, 1.1); whiteSpray(V(g.x, 0.6, g.z), N(10, c), 3.2); mist(g, N(2, c), 1.2);
          if (first) { first = false; slam(0.32, 0.07); sc.light(p, TEAL, 1.2, 0.3); }
          c.hit(m, 1, 1.4);
        });
        if (!crashed && t >= RISE + RUN) {
          crashed = true;
          // it crashes down along its whole length: foam and water thrown forward, the ground soaked
          slam(0.22, 0.04);
          for (var j = 0; j < N(8, c); j++) {
            var at = V(X1 + rr(-0.2, 0.4), 0, cz + rr(-DEP / 2, DEP / 2));
            splash(at, rr(1.3, 1.9), c.D(0.6)); foam(at, rr(1.0, 1.6), c.D(0.7), V(rr(1, 2.5), rr(1.5, 2.5), rr(-0.5, 0.5)));
            claws(at, 4, rr(0.8, 1.1)); spray(V(at.x, 0.4, at.z), 4, 3.4, 1.2, V(1, 0, 0)); whiteSpray(V(at.x, 0.5, at.z), 10, 3.6, V(1, 0.2, 0)); mist(at, 2, 1.6);
          }
          list.forEach(function (m) { wet(gp(m), 1.6, c.D(1.6)); });
        }
        // anything the wave missed is caught as it crashes
        if (crashed && down >= 1 && hit.length >= list.length) { wave.set(V(x, -10, cz), q, SZ, 0, k); }
        if (crashed && down >= 1 && hit.length < list.length) list.forEach(function (m) { if (hit.indexOf(m) < 0) { hit.push(m); c.hit(m, 1, 1.2); } });
        if (crashed && t >= RISE + RUN + c.D(0.7)) {
          wave.kill(); flood.kill(); return true;
        }
        return false;
      });
    };

    // ---- 2. 물방울 감옥 (one monster + 30% to those beside it): water coils up round it into a great bubble that
    // shuts it in, squeezes (the monster squashed, a small jolt), and bursts — a held beat, a hard shake, a crown of
    // water and lumps flung outward onto the monsters beside it.
    function prison(c, mob) {
      var g = gp(mob), p = sc.mobPos(mob), big = (mob.boss ? 1.6 : 1) * Math.min(1.3, c.s / 3), R = 0.95 * big;
      var COIL = c.D(0.28), SHUT = c.D(0.36), POP = c.D(0.66), t = 0, popped = false, squeezed = false;
      var bub = P3.bm('waterBubble', {}), ring = P3.bm('splashCrown', {}), base = P3.bm('waterRing', {}), q = yawQ(rr(0, 6.3)), coil = [];
      for (var i = 0; i < 6; i++) coil.push({ h: P3.bm('waterBlob', {}), a: i / 6 * 6.283, y0: rr(0, 0.15) });
      foam(g, 0.9 * big, COIL + 0.1);
      tick(function (dt) {
        t += dt;
        var pc = mob.alive ? sc.mobPos(mob) : (mob.fellPos || p);
        // the water coiling up round it
        var up = ease(t / COIL);
        ring.set(V(g.x, 0, g.z), q, 1.6 * big * (1 - 0.3 * up), t < SHUT ? 1 : 0, Math.min(1, t / (COIL * 0.6)));
        coil.forEach(function (o, i) {
          var a = o.a + t * 9, r = R * (1.15 - 0.2 * up), y = o.y0 + up * (pc.y + R * 0.8) * (0.4 + 0.6 * i / 5);
          var P = V(g.x + Math.cos(a) * r, y, g.z + Math.sin(a) * r * 0.8);
          o.h.set(P, yawQ(-a), 0.9 * big, t < SHUT ? 1 : 0, 1);
        });
        // the bubble: shuts round it, then squeezes (wobbling smaller), then bursts
        if (t >= SHUT && !popped) {
          var u = ease3((t - SHUT) / c.D(0.08)), sq = (t - SHUT) / (POP - SHUT);
          var squash = 1 - 0.16 * ease(sq) + 0.05 * Math.sin(t * 40) * sq;
          bub.set(V(pc.x, Math.max(0, pc.y - R), pc.z), q, V(2 * R * u * squash * (1 + 0.06 * sq), 2 * R * u * squash, 2 * R * u * squash * (1 + 0.06 * sq)), 1, 0);
          // the wave of water wrapped round its foot (design 3-bubble), turning
          base.set(V(pc.x, 0, pc.z), yawQ(t * 4), V(R * 1.05 * u, 0.55 * big, R * 0.95 * u), 1, 1);
          if (!squeezed && sq > 0.5) { squeezed = true; sc.shake(0.12); c.hit(mob, 0.2, 0.05); whiteSpray(V(pc.x, pc.y + R * 0.6, pc.z), N(6, c), 1.6); }
        }
        if (!popped && t >= POP) {
          popped = true; bub.kill(); base.kill(); coil.forEach(function (o) { o.h.kill(); }); ring.kill();
          slam(0.36, 0.09); sc.light(pc, TEAL, 1.4, 0.3);
          splash(g, 2.6 * big, c.D(0.7));
          var cr = P3.bm('splashCrown', {}), ct = 0;
          tick(function (dt2) { ct += dt2; var k = ease3(ct / c.D(0.14)); cr.set(V(g.x, 0, g.z), q, 2.4 * big * (1 + 0.3 * ct), Math.max(0, 1 - ct / c.D(0.5)), k); if (ct < c.D(0.5)) return false; cr.kill(); return true; });
          blobs(V(pc.x, pc.y, pc.z), N(7, c), 4.2, 1.0, 0.7); claws(V(g.x, 0, g.z), N(9, c), 1.7 * big, c.D(0.5)); spray(V(pc.x, pc.y, pc.z), N(10, c), 4, 1.5); whiteSpray(V(pc.x, pc.y, pc.z), N(22, c), 4.2); mist(g, N(3, c), 1.8 * big);
          for (var f = 0; f < N(6, c); f++) foam(V(g.x, pc.y * 0.6, g.z), rr(0.8, 1.2), c.D(0.6), V(rr(-3, 3), rr(1.5, 3), rr(-2, 2)));
          wet(g, 2.2 * big, c.D(1.6));
          c.hit(mob, 0.8, 2.0);
          c.splash(mob, 1.8, 0.9);
          return true;
        }
        return false;
      });
    }
    S.bubblePrison = function (c) {
      var first = c.pool()[0]; if (!first) return;
      c.plain = true;
      sc.heroPose('slam', c.D(0.12), c.col);
      after(c.D(0.1), function () { var mob = first.alive ? first : c.pool()[0]; if (mob) prison(c, mob); });
    };

    // ---- 3. 물폭발 (every monster): the ground under each monster cracks and its water starts to boil up (foam
    // bubbling, a dark wet patch); a held breath of quiet; then thick columns burst up under all of them at once,
    // carrying them up, a crown of water opening at each top (the jolt, the shake); the water rains back down.
    S.waterBurst = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('slam', c.D(0.12), c.col);
      var BOIL = c.D(0.14), ERUPT = c.D(0.46), HOLD = c.D(0.3), FALL = c.D(0.25), s = cap(c, 2.6, 3.4);
      after(BOIL, function () { sc.shake(0.06); });
      list.forEach(function (m, i) {
        // (a crowd of columns would wall the screen in: thinner as there are more of them)
        var g = gp(m), big = (m.boss ? 1.5 : 1) * s / 3 * Math.min(1, Math.max(0.6, 7 / list.length)), t = 0, col = null, cap_ = [], crown = null, erupted = false, q = yawQ(rr(0, 6.3)), bub = 0;
        wet(g, 1.4 * big, ERUPT + HOLD + FALL);
        tick(function (dt) {
          t += dt;
          // boiling: foam bubbles welling up round its feet, small jumps of water — fewer as the quiet before it falls
          if (t > BOIL && t < ERUPT - c.D(0.1)) {
            bub += dt * 22;
            while (bub >= 1) { bub -= 1; var a = rr(0, 6.283), r = rr(0.1, 0.5) * big; foam(V(g.x + Math.cos(a) * r, 0, g.z + Math.sin(a) * r * 0.8), rr(0.45, 0.8) * big, c.D(0.25)); }
          }
          if (!erupted && t >= ERUPT) {
            erupted = true; col = P3.bm('waterColumn', {});
            if (!i) { slam(0.34, 0.08); sc.climax(0.5, 0.16); }
            cap_ = []; for (var cf = 0; cf < 4; cf++) cap_.push({ h: P3.bm('foamPuff', {}), a: cf / 4 * 6.283 + rr(-0.3, 0.3), r: cf ? 0.28 : 0, s: rr(1.3, 1.7) });
            splash(g, 1.8 * big, c.D(0.55)); claws(V(g.x, 0, g.z), N(4, c), 0.55 * big); whiteSpray(V(g.x, 0.3, g.z), N(8, c), 3.4); mist(g, 1, 1.0 * big);
            after(c.D(0.08), function () { claws(V(g.x, 1.6 * big, g.z), N(4, c), 0.45 * big, c.D(0.4)); });
            c.hit(m, 1, 1.6);
          }
          if (erupted) {
            var e = t - ERUPT, up = ease3(e / c.D(0.1)), sink = Math.max(0, (e - HOLD) / FALL);
            var hgt = 2.0 * big * (1 - 0.8 * sink), R = 0.9 * big;
            col.set(V(g.x, 0, g.z), q, V(R, hgt, R), 1 - sink * sink, up);
            cap_.forEach(function (o) { o.h.set(V(g.x + Math.cos(o.a) * o.r * R, hgt * up * 0.86, g.z + Math.sin(o.a) * o.r * R * 0.9), null, o.s * big * up, 1 - sink, 1); });
            if (e > HOLD * 0.4 && Math.random() < dt * 30) { spray(V(g.x, hgt, g.z), 1, 2, 1.1); whiteSpray(V(g.x, hgt, g.z), 3, 2); }
            if (sink >= 1) { col.kill(); cap_.forEach(function (o) { o.h.kill(); }); foam(g, 1.2 * big, c.D(0.5)); return true; }
          }
          return false;
        });
      });
    };

    // ---- 4. 하늘 폭포 (every monster, the biggest): a whirl of water opens in the sky over the field; a great fall
    // pours down out of it into the middle of the monsters; where it strikes the ground everything stops for a beat and
    // shakes hardest, and a ring wall of water spreads out from it, striking each monster as it passes; mist lingers.
    S.skyFalls = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('raise', c.D(0.14), c.col);
      if (!(CW.fxOff && CW.fxOff.dim)) sc.dim(0.2, c.D(1.3));
      var B = spread(list), G = V(B.cx, 0, B.cz), s = cap(c, 2.6, 3.4), SKY = 5.4;
      var OPEN = c.D(0.22), POUR = c.D(0.1), LAND = OPEN + POUR, RUN = c.D(0.42), GONE = c.D(1.0), t = 0;
      var far = 0; list.forEach(function (m) { far = Math.max(far, Math.hypot(m.x - G.x, (m.z - G.z) / 0.8)); });
      var whirl = P3.bm('waterSwirl', {}), fall = P3.bm('fallStream', {}), wall = null, pool = null, landed = false, hit = [], flip = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI);
      tick(function (dt) {
        t += dt;
        // the whirl in the sky: opening, turning
        var op = ease(t / OPEN), fade = Math.max(0, (t - GONE * 0.7) / (GONE * 0.3));
        whirl.set(V(G.x, SKY, G.z - 0.6), flip.clone().multiply(yawQ(t * 4)), V(2.6 * op * s / 3, 2.2, 2.0 * op * s / 3), (1 - fade) * Math.min(1, op * 1.5), 1);
        // the fall: poured down out of it (k from its top), then thinning and gone
        if (t >= OPEN && t < LAND + c.D(0.5) && Math.random() < dt * 40) whiteSpray(V(G.x + rr(-0.4, 0.4), rr(0.5, SKY - 0.5), G.z + rr(-0.3, 0.3)), 2, 1.5);
        if (t >= OPEN) {
          var pk = Math.min(1, (t - OPEN) / POUR), thin = Math.max(0, (t - LAND - c.D(0.3)) / c.D(0.35));
          fall.set(V(G.x, 0, G.z), yawQ(t * 3), V(1.25 * s / 3 * (1 - 0.6 * thin), SKY, 1.25 * s / 3 * (1 - 0.6 * thin)), 1 - thin, pk);
        }
        if (!landed && t >= LAND) {
          landed = true;
          slam(0.48, 0.12); if (!(CW.fxOff && CW.fxOff.dim)) sc.climax(0.65, 0.24);
          sc.light(V(G.x, 0.6, G.z), TEAL, 1.8, 0.35);
          splash(G, 4.2 * s / 3, c.D(0.75)); wet(G, 4.5 * s / 3, c.D(1.8));
          blobs(V(G.x, 0.4, G.z), N(8, c), 5, 1.1, 0.9); claws(G, N(10, c), 1.4 * s / 3, c.D(0.55)); spray(V(G.x, 0.5, G.z), N(14, c), 5, 1.4); whiteSpray(V(G.x, 0.5, G.z), N(30, c), 5.5); mist(G, N(5, c), 2.4);
          for (var f = 0; f < N(8, c); f++) foam(G, rr(1.2, 1.8), c.D(0.8), V(rr(-4, 4), rr(2, 3.5), rr(-3, 3)));
          wall = P3.bm('waterRing', {}); pool = P3.bm('waterSwirl', {});
        }
        if (landed) {
          var e = (t - LAND) / RUN, R = 0.5 + (far + 0.8) * ease(e), dz = Math.max(0, e - 1) / 0.6;
          wall.set(V(G.x, 0, G.z), yawQ(t), V(R, 1.6 * s / 3 * (1 - 0.6 * ease(e)) * (1 - dz), R * 0.8), Math.max(0, 1 - dz), 1);
          // the whirlpool inside it, turning (design 5-skyfalls: the monsters swept round in it)
          pool.set(V(G.x, 0.02, G.z), yawQ(-t * 3), V(R * 0.98, 0.6, R * 0.78), Math.max(0, 1 - dz), 1);
          list.forEach(function (m) {
            if (hit.indexOf(m) >= 0 || Math.hypot(m.x - G.x, (m.z - G.z) / 0.8) > R) return;
            hit.push(m); var g = gp(m);
            splash(g, 1.5 * (m.boss ? 1.5 : 1), c.D(0.5)); claws(V(g.x, 0, g.z), N(3, c), 0.55); spray(V(g.x, 0.4, g.z), N(4, c), 3, 1.1); whiteSpray(V(g.x, 0.5, g.z), N(8, c), 3);
            sc.shake(0.12); c.hit(m, 1, 1.8);
          });
          // the mist that lingers, drifting
          if (Math.random() < dt * 14) E({ sys: 'gnorm', pos: V(G.x + rr(-2, 2), 0.3, G.z + rr(-1.5, 1.5)), vel: V(rr(-0.3, 0.3), rr(0.2, 0.5), 0), frame: 'smoke', color: 0xbfe6f5, size: [0.8, 1.8], ease: 1, life: 1.2, alpha: 0.35, fadeIn: 0.15, fadeOut: 0.6 });
          if (dz >= 1) {
            list.forEach(function (m) { if (hit.indexOf(m) < 0) { hit.push(m); c.hit(m, 1, 1.4); } });
            whirl.kill(); fall.kill(); wall.kill(); pool.kill(); return true;
          }
        }
        return false;
      });
    };
  };
})(this);
