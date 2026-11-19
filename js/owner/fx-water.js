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
        h.set(P, q, sz * (1 + 0.05 * Math.sin(t * 30)), Math.max(0, a), 1);
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
    // (7th, 2026-11-17, the user: 그림같고 물 같지 않고 타격감이 없다) no painted pictures any more: a splash is real water —
    // claws of water thrown up, white spray, and rings running out over the ground; the wet mark is rings too
    function ripple(p, size) {
      for (var k = 0; k < 3; k++) (function (k) { after(k * 0.11, function () { K.gRing(V(p.x, 0.03, p.z), k ? 0xcfeeff : 0x9fdcff, size * (0.7 + 0.45 * k), 0.5); }); })(k);
    }
    function splash(p, size, span, curled) {
      if (curled) claws(V(p.x, 0, p.z), 3, size * 0.42, (span || 0.6) * 0.75);
      whiteSpray(V(p.x, 0.3, p.z), Math.round(4 + size * 3), 2 + size * 0.8);
      ripple(p, size);
    }
    function wet(p, size) { ripple(p, size * 0.8); }
    // the blow carries the monster: pushed (vx, vz) and thrown up (vy); a boss only shudders
    function knock(m, vx, vz, vy) {
      if (!m || !m.alive || m.boss) return;
      m.pvx = (m.pvx || 0) + vx; m.pvz = (m.pvz || 0) + vz;
      if (vy && (m.y || 0) <= 0.05) m.vy = Math.max(m.vy || 0, vy);
    }
    // (8th, the user: 좀 더 임팩트) the big moments: the camera knocked, a pale water-blue flash (not white), shock rings
    // (9th, 2026-11-17, the user: 커졌다 작아졌다 한다) the camera is knocked once in a skill, at its biggest moment (still: no
    // knock) — a knock on every monster added up, and the whole screen zoomed in and out with each cast, more the more
    // monsters there were
    function boom(p, size, still) {
      if (!still) sc.punch(0.05 * size); sc.flash('rgba(120,195,255,1)', 0.16 * size);
      K.gRing(V(p.x, 0.04, p.z), 0xd8f2ff, 3.2 * size, 0.38); K.gRing(V(p.x, 0.04, p.z), 0x7cc4ff, 2.2 * size, 0.3);
    }
    // where water stands on the ground: rings running out and a little foam, now and then (call each frame)
    function contact(p, size, dt, rate) {
      if (Math.random() < dt * (rate || 6)) K.gRing(V(p.x + rr(-0.2, 0.2) * size, 0.03, p.z + rr(-0.15, 0.15) * size), 0xd8f2ff, size * rr(0.8, 1.3), rr(0.5, 0.8));
      if (Math.random() < dt * (rate || 6) * 0.6) foam(V(p.x + rr(-0.4, 0.4) * size, 0, p.z + rr(-0.3, 0.3) * size), rr(0.5, 0.9) * size, rr(0.35, 0.6));
    }
    // a jolt on each hit of a moving wave: shaken and knocked, but time is not held — held on every monster, the wave
    // stopped and went again as it passed a crowd (2026-11-17, the user: 파도가 뚝뚝 끊기는 느낌); it is held only at the
    // big moments (slam)
    function tapper() { return function (t, hold, sh) { sc.shake(sh || 0.12); }; }
    // (9th, the user: 실제로 몬스터를 타격하는지 모르겠다) the mark of a hit, drawn over the water (the water covered the
    // monster as it was hit, and nothing showed that it had been): a white star, a ring and short streaks on the monster
    function hitMark(m, big, compact) {
      var p = sc.mobPos(m), b = (big || 1) * (m.boss ? 1.5 : 1);
      E({ sys: 'norm', pos: p, frame: 'star', color: [0xffffff, 0xd8f4ff], size: [0.4 * b, 1.25 * b], ease: 1, life: 0.2, spin: rr(-6, 6), alpha: 1 });
      if (!compact) E({ sys: 'norm', pos: p, frame: 'ring', color: 0xffffff, size: [0.25 * b, 1.3 * b], ease: 1, life: 0.22, alpha: 0.95 });
      for (var k = 0; k < (compact ? 3 : 6); k++) E({ sys: 'norm', pos: p, frame: 'streak', color: k % 2 ? 0xffffff : 0xbfeaff, size: [0.14 * b, 1.1 * b], ease: 1, life: 0.16, rot: k / 6 * 3.1416 + rr(-0.15, 0.15), alpha: 0.95 });
    }
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
      // (9th, the user: 커졌다 작아졌다, 타격 범위를 모르겠다) always the same wave, as deep as the whole field (js/scene.js FIELD:
      // z -4.6 … 3.8) — it was as deep as the monsters happened to stand apart, another size at every cast, and a monster
      // off its end was hit with no water on it
      var DEP = 9.4, HT = 0.85 * s, cz = -0.4;
      var hitDepth = 0.85 * Math.min(3.4, Math.max(2.6, c.hitScale)) * 0.95;
      // (design 2-tidal: a towering wave filling half the screen, coming in on a slant) it rises just inside the left side
      // (2026-11-17, the user: 타격이 잘 안 되고 파도가 중간에 멈춘다 — it eased to a stop by the last monster, and every
      // monster was hit in the first 0.13 s while the wave was still far) it rolls on at one speed from the left edge until
      // it has left the screen on the right, and a monster is hit when the wave's real front reaches it
      var X0 = Math.min(B.x0 - 3.0, H.x - 2.4), X1 = Math.max(B.x1 + 2.4, H.x + 3.4), RISE = c.D(0.2), RUN = c.D(0.95), CRASH = c.D(0.18), t = 0, fm = 0;
      var tap = tapper(), wave = P3.bm('waveSheet', {}), flood = P3.bm('floodSheet', {}), q = yawQ(-Math.PI / 2 - 0.3), qi = q.clone().invert(), hit = [], first = true, crashed = false, SZ = V(), FL = V(), LO = V(), LIP = V(), HITZ = 0.85;
      // The same local front used for damage starts the fold above the first monster.
      var breaker = V(), impactTime = null;
      // the swell gathering at the side: water welling up out of the ground in a line
      for (var i = 0; i < N(7, c); i++) foam(V(X0 + rr(-0.2, 0.3), 0, cz + rr(-DEP / 2, DEP / 2)), rr(0.9, 1.4), c.D(0.35));
      sc.shake(0.08);
      tick(function (dt) {
        t += dt;
        // it gathers speed for the first fifth of its run, then rolls on at one speed (no jump from standing to full speed)
        var rise = ease(t / RISE), u = Math.min(1, Math.max(0, (t - RISE) / RUN)), A = 0.2, run = u < A ? u * u / (2 * A) / (1 - A / 2) : (u - A / 2) / (1 - A / 2), x = X0 + (X1 - X0) * run;
        var down = crashed ? Math.min(1, (t - RISE - RUN) / CRASH) : 0;
        var hgt = HT * (0.10 + 0.90 * rise) * (1 - 0.85 * down), k = Math.min(1, 0.35 + 0.55 * rise + 0.1 * run);
        SZ.set(DEP, hgt, HT * 0.95);
        if (impactTime === null) {
          var closest = -Infinity;
          list.forEach(function (m) {
            LO.set(m.x - x, 0, m.z - cz).applyQuaternion(qi);
            if (LO.z > closest) { closest = LO.z; breaker.x = Math.max(-0.5, Math.min(0.5, LO.x / DEP)); }
          });
          var gap = -(closest + HITZ * hitDepth);
          breaker.y = rise * 0.62 * (1 - Math.min(1, Math.max(0, gap / (0.55 * hitDepth))));
          if (t >= RISE && gap <= 0) impactTime = t;
        }
        if (impactTime !== null) breaker.y = 0.62 + (t - impactTime) / c.D(0.40);
        breaker.z = HITZ * hitDepth / SZ.z;
        wave.set(V(x, 0, cz), q, SZ, 1 - down * down, k, breaker);
        // the lip: in the wave's own frame it is about 0.55 of its depth ahead of its middle (turned with it: it comes on a slant)
        LIP.set(0, 0, -0.55 * SZ.z).applyQuaternion(q); var lip = x + LIP.x;
        // the sea it leaves behind: the field flooded from where it rose up to its foot (design 2-tidal: the monsters in churning water)
        var back = x - 0.6 * HT, len = Math.max(0.1, back - X0 + 0.6), gone = crashed ? Math.min(1, (t - RISE - RUN) / c.D(0.7)) : 0;
        flood.set(V(X0 - 0.6 + len / 2, 0, cz), null, FL.set(len, 1, DEP * 1.05), 1 - gone * gone, 1);
        if (!crashed) contact(V(x - 0.2 * HT, 0, cz + rr(-DEP / 2, DEP / 2) * 0.9), 1.2, dt, 14);
        // foam boiling along the crest as it rolls
        fm += dt * 12 * (1 - down);
        while (fm >= 1 && t > RISE * 0.6) {
          fm -= 1; var zc = cz + rr(-DEP / 2, DEP / 2) * 0.92, top = V(lip - rr(0.15, 0.35) * HT * 0.5, hgt * rr(0.82, 0.98), zc);
          // As the lip falls, move the remaining spray down with it.
          top.y *= 1 - 0.84 * Math.min(1, breaker.y);
          spray(top, 1, 2.4, 1.0, V(1, 0.2, 0)); whiteSpray(top, 3, 2.6, V(1, 0.3, 0));
          if (Math.random() < 0.25) foam(top, rr(1.0, 1.5), c.D(0.22), V(rr(1, 3), rr(0, 1), 0));
        }
        list.forEach(function (m) {
          if (t < RISE || hit.indexOf(m) >= 0) return;   // (not before it has risen)
          // the monster in the wave's frame: hit once the curling front (local z -0.55 … ahead) has come over it
          LO.set(m.x - x, 0, m.z - cz).applyQuaternion(qi);
          // (9th) at the moment the lip reaches it, while it still shows in front of the water — it was hit only after the
          // wave had covered it
          if (LO.z / hitDepth < -HITZ) return;
          hit.push(m);
          var g = gp(m), p = sc.mobPos(m);
          whiteSpray(p, N(m.boss ? 7 : 4, c), 2.8, V(1, 0.10, 0));
          if (first || m.boss) mist(g, N(2, c), 1.1);
          // (the user: 파도가 뚝뚝 끊긴다) nothing holds time while it rolls — a slow-motion at the first monster checked it
          // mid-stride; the hold is kept for the crash
          if (first) { first = false; breaker.x = Math.max(-0.5, Math.min(0.5, LO.x / DEP)); sc.shake(0.36); boom(g, 1, true); sc.light(p, TEAL, 1.2, 0.3); } else tap(t, 0, 0.17);
          c.hit(m, 1, 1.4); hitMark(m, 0.65, true); knock(m, 5.2, 0.4, 6.2);
        });
        if (!crashed && t >= RISE + RUN) {
          crashed = true;
          // it crashes down along its whole length: foam and water thrown forward, the ground soaked
          slam(0.4, 0.09); boom(V(Math.min(X1, H.x + 2.3), 0, cz), 1.2);
          for (var j = 0; j < N(5, c); j++) {
            var at = V(Math.min(X1, H.x + 2.3) + rr(-0.3, 0.3), 0, cz + rr(-DEP / 2, DEP / 2));
            ripple(at, rr(1.0, 1.45));
            whiteSpray(at, 5, 2.9, V(1, 0.12, 0));
          }
          list.forEach(function (m) { wet(gp(m), 1.6, c.D(1.6)); });
        }
        // anything the wave missed is caught as it crashes
        if (crashed && down >= 1 && hit.length >= list.length) { wave.set(V(x, -10, cz), q, SZ, 0, k); }
        if (crashed && down >= 1 && hit.length < list.length) list.forEach(function (m) { if (hit.indexOf(m) < 0) { hit.push(m); c.hit(m, 1, 1.2); hitMark(m); } });
        if (crashed && t >= RISE + RUN + c.D(0.7)) {
          wave.kill(); flood.kill(); return true;
        }
        return false;
      });
    };

    // (9th, 2026-11-17) shared by the two bursts below
    // hold a monster still (it struggles: js/scene.js pull) at height y off the ground; a boss is never moved
    function hold(m, x, z, y) {
      if (!m || !m.alive || m.boss) return;
      m.pull = x; m.pullZ = z; if (y !== undefined) { m.y = Math.max(0, y); m.vy = 0; }
    }
    function release(m, vy) {
      if (!m) return;
      if (m.pull !== undefined) { m.pull = undefined; m.pullZ = undefined; }
      if (m.alive && !m.boss && vy) m.vy = Math.max(m.vy || 0, vy);
    }
    // the moment of a burst, in the air at p: a white ring and a star thrown wide (drawn over, not added light), the skin
    // of water flung apart (a clear ball growing fast and gone), streaks of water shot out of the middle (shape: the
    // all-round waterRays or the upward waterFountain; size: how far they reach) that fall and fade
    // (plain: no rings or star — in a crowd of bursts, a white ring on every one walled the screen in circles)
    function popAt(c, p, size, shape, drop, plain) {
      if (!plain) {
        E({ sys: 'norm', pos: p.clone(), frame: 'ring', color: 0xffffff, size: [0.25 * size, 2.0 * size], ease: 1, life: c.D(0.22), alpha: 0.95 });
        E({ sys: 'norm', pos: p.clone(), frame: 'ring', color: 0x8fd4ff, size: [0.2 * size, 1.5 * size], ease: 1, life: c.D(0.18), alpha: 0.8 });
        E({ sys: 'norm', pos: p.clone(), frame: 'star', color: [0xffffff, 0xd8f4ff], size: [0.5 * size, 1.4 * size], ease: 1, life: c.D(0.14), spin: rr(-5, 5), alpha: 1 });
      }
      // (only a blink: left a moment longer, drops still joined to the middle read as a blue flower — the flying drops
      // thrown with it carry the burst on)
      var skin = P3.bm('waterBubble', {}), rays = P3.bm(shape, {}), q = yawQ(rr(0, 6.3)), t = 0, P = p.clone(), RAY = c.D(0.07), GONE = c.D(0.22);
      tick(function (dt) {
        t += dt;
        // the skin: from the ball's own size to half again as big in a tenth of a second, thinning away
        var u = Math.min(1, t / c.D(0.1)), r = size * 0.5 * (1 + 0.6 * ease(u));
        if (u < 1) skin.set(V(p.x, p.y - r, p.z), q, 2 * r, (1 - u) * 0.9, 0); else skin.kill();
        // the streaks: shot out (grown from the middle), then falling and thinning
        var k = ease3(t / RAY), e = Math.max(0, t - RAY), out = Math.max(0, (t - RAY) / (GONE - RAY));
        P.set(p.x, p.y - (drop || 3) * e * e, p.z);
        rays.set(P, q, size * (1.5 + 0.6 * ease(t / GONE)), 1 - out, Math.max(0.02, k));
        if (t < GONE) return false; skin.kill(); rays.kill(); return true;
      });
    }

    // ---- 2. 물방울 감옥 (one monster + 30% to those beside it) — (9th, 2026-11-17, the user: 물방울에 갇혀서 펑 터지는
    // 느낌, 몬스터를 가둔다는 느낌으로 — it was a blue cabbage of water round its feet and a small bubble behind the crowd)
    // water spirals up round it out of the ground and closes into a clear ball of water; the monster is lifted off the
    // ground inside it and struggles, the ball wobbling like jelly, beads of air rising through it; it squeezes tighter
    // and tighter (faster wobbles, a jolt), then bursts — the skin flung apart, water shot out all round and falling
    // onto the ground, the monster dropped out of the air.
    function prison(c, mob) {
      var boss = !!mob.boss, h = (mob.group && mob.group.userData && mob.group.userData.h) || (boss ? 2 : 1);
      var g = gp(mob), last = sc.mobPos(mob), R = (0.5 * h + 0.3) * (boss ? 1.05 : 1), LIFT = boss ? 0 : 0.42, gx = g.x, gz = g.z;
      var GATHER = c.D(0.22), CLOSE = c.D(0.12), SQ = c.D(0.5), POP = c.D(0.8), t = 0, popped = false, squeezed = false, beads = 0, ph = 0;
      // (9th, the user: 타격 범위를 모르겠다) how far the burst reaches the monsters beside it (their 30%): a thin ring
      // runs out over the ground to there while it squeezes, and a white ring marks it as it bursts (a wall of water
      // running out that far buried the ball)
      var REACH = 1.8, RING_K = 2;   // (K.gRing's size for a ring of radius 1)
      var bub = P3.bm('waterBubble', {}), q = yawQ(rr(0, 6.3)), streams = [], DIR = new T.Vector3();
      // three streams of water (five lumps each, one close behind the other, drawn out along the way they go) winding up
      // round it
      for (var s = 0; s < 3; s++) for (var j = 0; j < 5; j++) streams.push({ h: P3.bm('waterBlob', {}), a: s / 3 * 6.283, lag: j * 0.055, sz: 1.2 - j * 0.15, P: null, q: new T.Quaternion() });
      ripple(g, 1.4 * R); foam(g, 0.9 * R, GATHER + 0.05);
      for (var f = 0; f < N(4, c); f++) { var fa = f / 4 * 6.283; foam(V(g.x + Math.cos(fa) * R * 0.9, 0, g.z + Math.sin(fa) * R * 0.7), rr(0.6, 0.9), GATHER); }
      tick(function (dt) {
        t += dt;
        if (mob.alive) last = sc.mobPos(mob);
        var pc = last, C = V(pc.x, pc.y, pc.z);
        // the streams winding up round it, closing in on where the ball will be
        if (t < GATHER) {
          var up = t / GATHER;
          streams.forEach(function (o) {
            var u = Math.max(0, Math.min(1, up * 1.25 - o.lag)), a = o.a + u * 7.5, r = R * (1.3 - 0.35 * u);
            var P = V(gx + Math.cos(a) * r, 0.05 + u * (C.y + R * 0.5), gz + Math.sin(a) * r * 0.8);
            // its tail (the drop's +y) streams back the way it came
            if (o.P) { DIR.subVectors(o.P, P); if (DIR.lengthSq() > 1e-6) o.q.setFromUnitVectors(UP, DIR.normalize()); }
            o.P = P;
            o.h.set(P, o.q, V(1.0, 1.3, 1.0).multiplyScalar(o.sz * Math.min(1.3, R)), u > 0 ? 1 : 0, 1);
            if (u > 0 && u < 1 && Math.random() < dt * 20) E({ sys: 'norm', pos: P.clone(), vel: V(0, -0.4, 0), frame: 'dot', color: 0xffffff, size: [0.07, 0.02], life: 0.25, alpha: 0.9 });
          });
          if (!boss) hold(mob, gx, gz);
          return false;
        }
        if (streams.length) {
          // shut: the streams become the ball — a gulp of spray round it, a little jolt
          streams.forEach(function (o) { o.h.kill(); }); streams.length = 0;
          whiteSpray(C, N(10, c), 2.6); sc.shake(0.1); sc.light(C, TEAL, 0.8, 0.2);
          E({ sys: 'norm', pos: C.clone(), frame: 'ring', color: 0xffffff, size: [R * 2.6, R * 1.9], ease: 1, life: c.D(0.16), alpha: 0.85 });
          // the reach of the burst, running out over the ground until it bursts (drawn over the ground, not added light)
          E({ sys: 'gnorm', pos: V(gx, 0.04, gz), frame: 'ring', color: 0xffffff, size: [R * RING_K, REACH * RING_K], ease: 3, life: POP - GATHER, fadeIn: 0.1, fadeOut: 0.08, alpha: 0.75 });
          E({ sys: 'gnorm', pos: V(gx, 0.035, gz), frame: 'ring', color: 0x2f7fe0, size: [R * RING_K * 1.04, REACH * RING_K * 1.04], ease: 3, life: POP - GATHER, fadeIn: 0.1, fadeOut: 0.08, alpha: 0.5 });
          // the ones crowding it are pushed off as the ball shuts, so it stands alone with its prisoner
          sc.mobs().forEach(function (o) { if (!o.alive || o === mob || o.boss) return; var dx = o.x - gx, dz = o.z - gz, dl = Math.sqrt(dx * dx + dz * dz); if (dl < R * 1.5) { if (dl < 1e-3) { dx = 1; dz = 0; dl = 1; } knock(o, dx / dl * 3.2 * (R * 1.5 - dl + 0.3), dz / dl * 2.6 * (R * 1.5 - dl + 0.3), 0); } });
        }
        if (!popped) {
          // lifted off the ground inside it, held there
          var lu = ease3((t - GATHER) / c.D(0.28)); hold(mob, gx, gz, LIFT * lu + 0.04 * Math.sin(t * 9));
          // the ball: pops in a little too big and settles; wobbles like jelly; squeezes (smaller, faster wobbles)
          var e = t - GATHER, gr = e < CLOSE ? 1.14 * ease3(e / CLOSE) : 1 + 0.14 * Math.cos((e - CLOSE) * 28) * Math.exp(-(e - CLOSE) * 9);
          var sq = Math.max(0, Math.min(1, (t - SQ) / (POP - SQ)));
          ph += dt * (15 + 34 * sq);
          var A = 0.045 + 0.07 * sq, w = Math.sin(ph), Rr = R * gr * (1 - 0.13 * ease(sq));
          var sx = Rr * (1 + A * w), sy = Rr * (1 - A * w);
          bub.set(V(C.x, C.y - sy, C.z), yawQ(t * 1.5), V(2 * sx, 2 * sy, 2 * sx), 1, 0);
          // beads of air rising through it
          beads += dt * 8;
          while (beads >= 1) { beads -= 1; var ba = rr(0, 6.283), br = rr(0, 0.6) * Rr; E({ sys: 'norm', pos: V(C.x + Math.cos(ba) * br, C.y - Rr * 0.6, C.z + Math.sin(ba) * br * 0.5 + 0.1), vel: V(rr(-0.1, 0.1), rr(0.9, 1.6) * Rr, 0), frame: 'dot', color: 0xffffff, size: [rr(0.05, 0.09), rr(0.08, 0.13)], life: rr(0.3, 0.45), alpha: 0.85, fadeIn: 0.1, fadeOut: 0.4 }); }
          // halfway through the squeeze: a jolt (a small share of the damage), water squirting out of it
          if (!squeezed && sq > 0.45) { squeezed = true; sc.shake(0.14); c.hit(mob, 0.2, 0.05); spray(V(C.x, C.y + Rr * 0.5, C.z), N(4, c), 2.2, 1.0); whiteSpray(V(C.x, C.y + Rr * 0.6, C.z), N(6, c), 1.8); }
        }
        if (!popped && t >= POP) {
          popped = true; bub.kill();
          var Rp = R * 0.87;
          // the burst: held, shaken, a pale water-blue flash (the camera knocked by the first copy only)
          slam(0.46, 0.13); sc.climax(0.55, 0.2); boom(g, 1.2, c.copy > 0);
          sc.light(C, TEAL, 1.4, 0.3);
          popAt(c, C, 2 * Rp, 'waterRays', 3.2);
          blobs(C, N(11, c), 5, 1.15, 0.7); spray(C, N(8, c), 4.8, 1.4); whiteSpray(C, N(18, c), 5.2); mist(g, N(3, c), 1.6 * R);
          // the water lands round where it stood a moment later
          after(c.D(0.12), function () { splash(V(gx, 0, gz), 2.2 * R, c.D(0.6), true); for (var fo = 0; fo < N(4, c); fo++) foam(V(gx + rr(-0.6, 0.6) * R, 0, gz + rr(-0.45, 0.45) * R), rr(0.8, 1.2), c.D(0.5)); });
          wet(g, 2 * R, c.D(1.6));
          c.hit(mob, 0.8, 2.0); hitMark(mob, 1.3);
          // dropped out of the air (thrown a little up first)
          release(mob, 2.6);
          // the ones beside it take their share, are marked as they are hit and thrown away from it
          K.gRing(V(gx, 0.04, gz), 0xffffff, REACH * RING_K, 0.3);
          if (c.sk.splash) sc.mobs().forEach(function (o) { if (o.alive && o !== mob) { var dx = o.x - gx, dz = o.z - gz, dl = Math.sqrt(dx * dx + dz * dz); if (dl < REACH) { hitMark(o, 0.75); if (dl > 1e-3) knock(o, dx / dl * 3, dz / dl * 2.4, 4); } } });
          c.splash(mob, REACH, 0.9);
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

    // ---- 3. 물폭발 (every monster) — (9th, 2026-11-17, the user: 화산 폭발같이 물기둥이 올라와서 펑 하고 터지는 느낌 —
    // it only lifted them) the ground under each monster swells into a trembling dome of water, spurting and boiling,
    // the field shaking harder; then a jet of water shoots up out of it, carrying the monster up on its head (the first
    // jolt); the head swells, and blows apart — water thrown up and out all round in falling arcs, the monster flung
    // higher (the big beat: held, shaken, the most damage); the jet loses its push and collapses, raining back down.
    S.waterBurst = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('slam', c.D(0.12), c.col);
      var RUMBLE = c.D(0.34), SHOOT = c.D(0.1), BURST = c.D(0.58), FALL = c.D(0.34), s = cap(c, 2.6, 3.4);
      var liftRatio = Math.min(3.4, Math.max(2.6, c.hitScale)) / s;
      sc.shake(0.06); after(c.D(0.16), function () { sc.shake(0.1); }); after(c.D(0.28), function () { sc.shake(0.14); });
      // (in a crowd every burst keeps its shape, but each throws less loose water: twenty of them buried the field)
      var kq = Math.min(1, Math.max(0.25, 5 / list.length)), n = function (k) { return Math.max(1, Math.round(N(k, c) * kq)); };
      list.forEach(function (m, i) {
        // (one size always — not thinner in a crowd: another size at every cast read as the skill changing)
        var g = gp(m), big = (m.boss ? 1.4 : 1) * s / 3 * 0.85, t = 0, lag = i ? rr(0, c.D(0.05)) : 0, q = yawQ(rr(0, 6.3));
        var X = (i && !m.boss ? 1.46 : 1.74) * big, H = (i && !m.boss ? 2.79 : 3.23) * big, MR = 0.62 * big, MH = 0.5 * big, mound = P3.bm('waterMound', {}), jet = null, shot = false, burst = false, bub = 0, spurt = 0, gx = g.x, gz = g.z;
        E({ sys: 'gnorm', pos: V(gx, 0.035, gz), frame: 'ring', color: 0x2f7fe0, size: [0.4 * big, 1.6 * big], ease: 2, life: RUMBLE + SHOOT, fadeIn: 0.05, fadeOut: 0.3, alpha: 0.55 });
        tick(function (dt) {
          t += dt; var tt = t - lag;
          if (tt < 0) return false;
          // the swelling ground: a dome of water rising and trembling under it, boiling with foam, spurting more and more
          if (!shot) {
            var u = ease(tt / RUMBLE), Mr = MR * (0.35 + 0.65 * u), Mh = MH * (0.15 + 0.85 * u) * (1 + 0.12 * Math.sin(tt * 47)), jx = rr(-0.025, 0.025) * u, jz = rr(-0.02, 0.02) * u;
            mound.set(V(gx + jx, 0, gz + jz), q, V(2 * Mr, Mh, 2 * Mr * 0.9), 1, 1);
            hold(m, gx, gz, 0.26 * Mh * liftRatio + 0.03 * Math.sin(tt * 40) * u);
            bub += dt * (10 + 22 * u) * kq;
            while (bub >= 1) { bub -= 1; var a = rr(0, 6.283), r = rr(0.6, 1.05) * Mr; foam(V(gx + Math.cos(a) * r, 0, gz + Math.sin(a) * r * 0.8), rr(0.45, 0.75) * big, c.D(0.22)); }
            spurt += dt * 14 * u * kq;
            while (spurt >= 1) { spurt -= 1; var sa = rr(0, 6.283), sr = rr(0.2, 0.8) * Mr; spray(V(gx + Math.cos(sa) * sr, 0.25 * Mh, gz + Math.sin(sa) * sr * 0.8), 1, 3, 1.0, V(0, 1, 0)); }
            if (tt < RUMBLE) return false;
            // it shoots up
            shot = true; jet = P3.bm('waterGeyser', {});
            if (!i) { sc.shake(0.3); sc.hitStop(0.04); } else sc.shake(0.12);
            whiteSpray(V(gx, 0.13, gz), n(7), 3.7, V(0, 0.8, 0));
            if (i < 5) foam(V(gx, 0.04, gz), 1.03 * big, c.D(0.32));
            if (i < 5 || m.boss) { ripple(g, 1.55 * big); mist(g, 1, 1.13 * big); }
            c.hit(m, 0.3, 1.0);   // (marked once, as it bursts: two marks on every monster of a crowd walled the screen in rings)
          }
          var e = tt - RUMBLE;
          // the dome sinks into its foot
          if (mound) { var md = Math.min(1, e / c.D(0.12)); mound.set(V(gx, 0, gz), q, V(2 * MR * (1 + 0.3 * md), MH * (1 - md), 2 * MR * 0.9 * (1 + 0.3 * md)), 1 - md, 1); if (md >= 1) { mound.kill(); mound = null; } }
          if (!burst) {
            // shooting up (a little past its height, back), then straining: its head swelling, the rope throbbing
            var gu = e / SHOOT, gr = gu < 1 ? ease3(gu) * 1.06 : 1 + 0.06 * Math.exp(-(e - SHOOT) * 14);
            var pressure = Math.min(1, Math.max(0, (tt - RUMBLE - SHOOT) / (BURST - RUMBLE - SHOOT)));
            var push = 0.83 + 0.13 * Math.min(1, gu) + 0.16 * pressure * pressure;
            jet.set(V(gx, 0, gz), q, V(X * push, H * Math.max(0.015, gr), X * push), (i && !m.boss ? 0.74 : 0.96), Math.min(1, gr));
            // the monster rides up on its head
            hold(m, gx, gz, 2.7 * big * liftRatio * gr * 0.93 - 0.25 + 0.05 * Math.sin(tt * 30));
            if (gu > 0.18 && Math.random() < dt * 22 * kq) {
              var side = rr(-0.36, 0.36) * big;
              spray(V(gx + side, H * gr * rr(0.13, 0.56), gz), 1, 5.9, 0.62, V(side * 0.66, 1, 0));
            }
            if (gu > 1) contact(g, 0.9 * big, dt, 8 * kq);
            if (tt < BURST) return false;
            // the head blows apart
            burst = true;
            var T0 = V(gx, H * 1.02, gz);
            if (!i || m.boss) K.paintImpact(T0, 2, 2.55 * big, c.D(0.22), 0, 0.19);
            if (!i) { slam(0.5, 0.12); sc.climax(0.55, 0.18); boom(g, 1.2); sc.light(T0, TEAL, 1.3, 0.3); } else if (i < 4) K.gRing(V(gx, 0.04, gz), 0xd8f2ff, 2.0 * big, 0.32);
            spray(T0, n(7), 4.5, 0.75, V(0, 0.88, 0));
            whiteSpray(T0, n(13), 4.1, V(0, 0.85, 0));
            if (i < 3 || m.boss) blobs(T0, n(3), 3.6, 0.72, 0.7);
            c.hit(m, 0.7, 1.8); hitMark(m, 0.88, true);
            release(m, 6.5); if (m.alive && !m.boss) { var ka = rr(0, 6.283); knock(m, Math.cos(ka) * 1.2, Math.sin(ka) * 1.0, 0); }
          }
          // the jet loses its push: falling in on itself from the top, its foot spreading, raining back down
          var fu = Math.min(1, (tt - BURST) / FALL), fall = fu * fu, hNow = H * (1 - fall);
          jet.set(V(gx, 0, gz), q, V(X * (1 + 0.52 * fu), Math.max(0.05, hNow), X * (1 + 0.52 * fu)), (i && !m.boss ? 0.64 : 0.90) * (1 - fu), 1 + ease(Math.min(1, fu * 4)));
          if (Math.random() < dt * 30 * kq) spray(V(gx + rr(-0.3, 0.3) * big, hNow, gz + rr(-0.2, 0.2) * big), 1, 1.6, 1.0);
          if (fu > 0.5) contact(g, 1.1 * big, dt, 6 * kq);
          if (fu < 1) return false;
          jet.kill(); foam(g, 1.2 * big, c.D(0.5)); ripple(g, 1.4 * big);
          return true;
        });
      });
    };

    // ---- 4. 하늘 폭포 (every monster, the biggest): a whirl of water opens in the sky over the field; a great fall
    // pours down out of it into the middle of the monsters; where it strikes the ground everything stops for a beat and
    // shakes hardest, and a ring wall of water spreads out from it, striking each monster as it passes; mist lingers.
    var runningFalls = new Set();
    // Each emitted row carries mass across the outlet. Adjacent samples share a
    // surface, while gravity and the floor determine their actual positions.
    function fallingWater(ground, camera, orientation, fallTime) {
      var cols = 15, rows = 26, count = cols * rows, step = fallTime / 12;
      var xyz = new Float32Array(count * 3), velocity = new Float32Array(count * 3);
      var points = new Float32Array(count * 3), flow = new Float32Array(count * 2);
      var head = 0, active = 0, elapsed = 0, carry = 0, emitted = 0, touched = false;
      var indices = [], geo = new T.BufferGeometry();
      for (var j = 1; j < rows; j++) for (var i = 1; i < cols; i++) {
        var n = j * cols + i;
        indices.push(n - cols - 1, n - cols, n, n - cols - 1, n, n - 1);
      }
      geo.setIndex(indices);
      geo.setAttribute('position', new T.BufferAttribute(points, 3).setUsage(T.DynamicDrawUsage));
      geo.setAttribute('flow', new T.BufferAttribute(flow, 2).setUsage(T.DynamicDrawUsage));
      geo.setDrawRange(0, 0);
      var mat = new T.ShaderMaterial({
        transparent: true, depthWrite: false, side: T.DoubleSide,
        extensions: { derivatives: true },
        uniforms: { paint: { value: P3.stormPaint() }, fade: { value: 1 }, inletHeight: { value: 1 } },
        vertexShader: 'attribute vec2 flow; uniform float inletHeight; varying float inletAlpha; varying vec2 f; varying vec3 eye; void main(){inletAlpha=1.0-smoothstep(0.77,1.0,position.y/inletHeight);f=flow;vec4 p=modelViewMatrix*vec4(position,1.);eye=p.xyz;gl_Position=projectionMatrix*p;}',
        fragmentShader: [
          'uniform sampler2D paint; uniform float fade; varying float inletAlpha; varying vec2 f; varying vec3 eye; void main(){',
          'vec3 n=normalize(cross(dFdx(eye),dFdy(eye)));float shine=abs(dot(n,normalize(vec3(-0.45,0.65,0.7))));',
          'float ridge=0.5+0.5*sin(28.0*f.x+1.6*sin(0.51*f.y+f.x*9.0));',
          'float lace=smoothstep(0.77,0.99,ridge)*smoothstep(-0.15,0.85,sin(f.y*0.72+f.x*12.0));',
          'vec3 c=mix(vec3(0.026,0.34,0.44),vec3(0.12,0.77,0.85),0.44*ridge+0.56*shine);',
          'float phase=-f.y*0.096+0.085*sin(f.x*11.0);float a=fract(phase),b=fract(phase+0.5);',
          'float tx=0.62+0.25*f.x;vec3 w1=texture2D(paint,vec2(tx,0.28+0.57*a)).rgb;',
          'vec3 w2=texture2D(paint,vec2(tx,0.28+0.57*b)).rgb;',
          'vec3 grain=mix(w2,w1,smoothstep(0.02,0.44,min(a,1.-a)));',
          'c=mix(c,grain*(0.82+0.26*shine),0.70);',
          'c=mix(c,vec3(0.88,0.99,1.),lace*0.49+0.08*shine);',
          'float edge=smoothstep(0.,0.08,min(f.x,1.-f.x));gl_FragColor=vec4(c,edge*(0.82+0.16*lace)*fade*inletAlpha);}'
        ].join('\n')
      });
      var mesh = new T.Mesh(geo, mat);
      mesh.name = 'skyFalls simulated runoff'; mesh.position.copy(ground); mesh.quaternion.copy(orientation);
      mesh.frustumCulled = false; mesh.renderOrder = 6.72;
      (sc.fxGroup || sc.scene).add(mesh);

      // Intersect the camera ray through the cloud belly with a vertical plane through the target.
      var projected = ground.clone().project(camera), aspect = camera.aspect;
      var skyY = Math.max(0.31, Math.min(0.54, projected.y + 0.48)) + 0.086 - 0.12 * Math.min(0.65, 0.65 / aspect) * aspect;
      var facing = camera.getWorldDirection(V()); facing.y = 0; facing.normalize();
      var plane = new T.Plane().setFromNormalAndCoplanarPoint(facing, ground);
      var ray = new T.Raycaster(), src = ground.clone(), lip = ground.clone();
      ray.setFromCamera(new T.Vector2(projected.x, skyY), camera); ray.ray.intersectPlane(plane, src);
      ray.setFromCamera(new T.Vector2(projected.x + Math.min(0.65, 0.65 / aspect)*0.52, skyY), camera); ray.ray.intersectPlane(plane, lip);
      var height = Math.max(0.48, src.y - ground.y), width = Math.max(0.32, lip.distanceTo(src));
      mat.uniforms.inletHeight.value = height;
      var acceleration = 1.68 * height / (fallTime * fallTime);
      function advance(pour) {
        if (active === rows || (!pour && active)) active--;
        if (pour) {
          head = (head + rows - 1) % rows; active++; emitted++;
          for (var i = 0; i < cols; i++) {
            var u = 2*i/(cols-1)-1, k = (head*cols+i)*3;
            var pulse = Math.sin(emitted*0.47+u*4);
            xyz[k]=u*width*(0.94+0.055*pulse); xyz[k+1]=height; xyz[k+2]=width*(0.18*(1-u*u)+0.08*Math.cos(u*9+pulse));
            velocity[k]=width*0.27*pulse; velocity[k+1]=-(0.17+0.07*pulse)*height/fallTime; velocity[k+2]=0.15*Math.cos(u*5+pulse);
          }
        }
        for (var r = 0; r < active; r++) for (var i = 0; i < cols; i++) {
          var k = (((head+r)%rows)*cols+i)*3;
          velocity[k+1] -= acceleration*step;
          xyz[k]+=velocity[k]*step; xyz[k+1]+=velocity[k+1]*step; xyz[k+2]+=velocity[k+2]*step;
          if (xyz[k+1]<=0.06) {
            if (velocity[k+1]<-2*acceleration*step) {
              var impact=-velocity[k+1], side=i/(cols-1)*2-1;
              velocity[k]+=side*impact*0.33; velocity[k+2]+=impact*(0.12+0.22*(1-side*side)); touched=true;
            }
            xyz[k+1]=0.06; velocity[k+1]=0; velocity[k]*=0.94; velocity[k+2]*=0.94;
          }
          var dst=(r*cols+i)*3; points[dst]=xyz[k]; points[dst+1]=xyz[k+1]; points[dst+2]=xyz[k+2];
          flow[(r*cols+i)*2]=i/(cols-1); flow[(r*cols+i)*2+1]=emitted-r;
        }
      }
      function dispose() { if (!runningFalls.delete(dispose)) return; mesh.parent.remove(mesh); geo.dispose(); mat.dispose(); }
      runningFalls.add(dispose);
      return { dispose: dispose, update: function (dt, duration) {
        carry+=dt;
        while(carry>=step) { elapsed+=step; advance(elapsed<=duration); carry-=step; }
        mat.uniforms.paint.value=P3.stormPaint(); mat.uniforms.fade.value=Math.min(1,active/6);
        geo.attributes.position.needsUpdate=true; geo.attributes.flow.needsUpdate=true;
        geo.setDrawRange(0,Math.max(0,active-1)*(cols-1)*6); return touched;
      }};
    }

    S.skyFalls = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('raise', c.D(0.14), c.col);
      if (!(CW.fxOff && CW.fxOff.dim)) sc.dim(0.2, c.D(1.3));
      var B = spread(list);
      // Land on an occupied spot even when two groups leave a gap in the middle.
      function distanceToCentre(m) {
        var screenX = V(m.x, 0, m.z).project(sc.camera).x;
        return Math.hypot(m.x - B.cx, (m.z - B.cz) / 0.8) + 15 * Math.max(0, Math.abs(screenX) - 0.20);
      }
      var centreMob = list.reduce(function (best, m) { return distanceToCentre(m) < distanceToCentre(best) ? m : best; });
      var G = V(centreMob.x, 0, centreMob.z), s = cap(c, 2.6, 3.4);
      // Place the spillway below the top HUD in either orientation, over the same impact point.
      var camera = sc.camera, floorY = G.clone().project(camera).y, maxY = V(G.x, 5.4, G.z).project(camera).y;
      var SKY = 5.4 * Math.max(0.40, Math.min(1, (0.36 - floorY) / Math.max(0.1, maxY - floorY)));
      var OPEN = c.D(0.30), POUR = c.D(0.22), LAND = OPEN + POUR, FILL = c.D(0.31), RUN = c.D(0.46), t = 0;
      // (9th, the user: 커졌다 작아졌다) the wall runs out to the same size every time (wider only if a monster stands further off)
      var far = 3.2; list.forEach(function (m) { far = Math.max(far, Math.hypot(m.x - G.x, (m.z - G.z) / 0.8)); });
      var SKYLEAD = 0.3, tap = tapper(), swept = [], fall = P3.bm('fallStream', {}), wall = null, pool = null, landed = false, hit = [];
      var right = V(1, 0, 0).applyQuaternion(camera.quaternion), curtain = yawQ(Math.atan2(-right.z, right.x));
      // A short slanted shower frames the vertical cascade, using the existing particle batch.
      var rainCount = N(24, c);
      for (var r = 0; r < rainCount; r++) {
        var lane = (r % 2 ? 1 : -1) * rr(0.65, 2.65);
        var origin = G.clone().addScaledVector(right, lane);
        origin.y = SKY * rr(0.69, 1.0);
        E({sys: 'norm', pos: origin, vel: V(-2.3, -7, 0), frame: 'streak', color: 0xceeeff,
          size: [0.32, 0.055], stretch: 0.18, delay: c.D(0.61 * r / rainCount),
          life: c.D(0.32), alpha: 0.83, fadeIn: 0.04, fadeOut: 0.12});
      }
      var waterWidth = 3.16, fallScale = V();
      var simulation = fallingWater(G, camera, curtain, POUR);
      tick(function (dt) {
        t += dt;
        var gather = ease(t / OPEN);
        var drop = Math.min(1, Math.max(0, (t - OPEN) / POUR));
        // The leading foam spills rapidly on release and reaches the ground on the hit frame.
        var front = 0.17 * gather + 0.83 * drop * (0.38 + 0.62 * drop);
        var thin = Math.max(0, (t - LAND - c.D(0.68)) / c.D(0.55));
        fall.set(G, curtain, fallScale.set(waterWidth, SKY, 1.62 * s / 3), Math.max(0, 1 - thin), front + Math.min(1.16, thin * 1.16));
        var contactNow = t > OPEN && simulation.update(Math.min(dt, t - OPEN), POUR + c.D(0.73));
        if (!landed && contactNow) {
          LAND = t;
          landed = true;
          slam(0.48, 0.055); if (!(CW.fxOff && CW.fxOff.dim)) sc.climax(0.65, 0.24); boom(G, 1.25, true);
          sc.light(V(G.x, 0.6, G.z), TEAL, 1.8, 0.35);
          splash(G, 2.4 * s / 3, c.D(0.50));
          blobs(V(G.x, 0.35, G.z), N(6, c), 4.4, 0.9, 0.59); spray(V(G.x, 0.35, G.z), N(12, c), 4.7, 1.1); whiteSpray(V(G.x, 0.38, G.z), N(22, c), 4.7); mist(G, N(3, c), 2.4);
          for (var f = 0; f < N(4, c); f++) foam(G, rr(1.2, 1.8), c.D(0.8), V(rr(-4, 4), rr(2, 3.5), rr(-3, 3)));
          wall = P3.bm('waterRing', {}); pool = P3.bm('waterSwirl', {});
        }
        if (landed) {
          var age = t - LAND, fill = ease(age / FILL);
          var surge = Math.max(0, (age - FILL) / RUN);
          var drain = ease((age - FILL - RUN - c.D(0.31)) / c.D(0.54));
          var basin = Math.min(2.45, far * 0.65);
          var spill = Math.min(1, surge);
          spill = spill * spill * (3 - 2 * spill);
          var R = 0.48 + (basin - 0.48) * fill + (far + 0.8 - basin) * spill;
          var crest = ease(spill / 0.35) * (1 - ease((surge - 0.68) / 0.50));
          var surface = R * (1 + 0.10 * fill) * (1 - 0.08 * drain);
          pool.set(V(G.x, 0.09 + 0.18 * fill * (1 - drain), G.z), yawQ(0),
            V(surface, 0.20, surface * 0.8), 0.73 * (1 - drain), 1);
          wall.set(V(G.x, 0.08 + 0.22 * fill * (1 - drain), G.z), yawQ(0),
            V(R, (0.18 * fill + 2.65 * crest) * s / 3, R * 0.8), (0.22 * fill + 0.42 * crest) * (1 - drain), 1);
          list.forEach(function (m) {
            // (9th) as the wall's outer face reaches it, while it still shows — it was hit once it was inside the water
            if (surge <= 0 || hit.indexOf(m) >= 0 || Math.hypot(m.x - G.x, (m.z - G.z) / 0.8) > R + SKYLEAD) return;
            hit.push(m); var g = gp(m);
            whiteSpray(g, N(m.boss ? 5 : 2, c), 2.4);
            spray(V(g.x, 0.37, g.z), N(2, c), 2.75, 0.68); whiteSpray(V(g.x, 0.5, g.z), N(4, c), 3, V(g.x - G.x, 0.18, g.z - G.z).normalize());
            tap(t, 0.035, 0.16); c.hit(m, 1, 1.8);
            // engulfed: foam churning round it
            for (var fo = 0; fo < N(2, c); fo++) { var fa = fo / 2 * 6.283 + rr(-0.3, 0.3); foam(V(g.x + Math.cos(fa) * 0.45, 0.25, g.z + Math.sin(fa) * 0.35), rr(0.9, 1.3), c.D(0.5), V(Math.cos(fa) * 1.2, rr(1, 2), Math.sin(fa) * 1)); }
            if (m.alive && !m.boss) swept.push({ m: m, t0: t, a: Math.atan2((m.z - G.z) / 0.8, m.x - G.x), r: Math.hypot(m.x - G.x, (m.z - G.z) / 0.8) });
          });
          // swept round in the whirlpool, then flung out of it
          for (var w = swept.length - 1; w >= 0; w--) {
            var o = swept[w], u = (t - o.t0) / c.D(0.32);
            if (!o.m.alive || u >= 1) { if (o.m.pull !== undefined) { o.m.pull = undefined; o.m.pullZ = undefined; } if (o.m.alive) knock(o.m, Math.cos(o.a) * 3.5, Math.sin(o.a) * 2.8, 5.5); swept.splice(w, 1); continue; }
            o.a += dt * 7; var rr_ = o.r * (1 - 0.25 * Math.sin(u * Math.PI));
            o.m.pull = G.x + Math.cos(o.a) * rr_; o.m.pullZ = G.z + Math.sin(o.a) * rr_ * 0.8;
          }
          if (t < LAND + c.D(0.6)) contact(G, 1.6 * s / 3, dt, 10);
          // the mist that lingers, drifting
          if (surge < 1 && Math.random() < dt * 14) E({ sys: 'gnorm', pos: V(G.x + rr(-2, 2), 0.3, G.z + rr(-1.5, 1.5)), vel: V(rr(-0.3, 0.3), rr(0.2, 0.5), 0), frame: 'smoke', color: 0xbfe6f5, size: [0.8, 1.8], ease: 1, life: 1.2, alpha: 0.35, fadeIn: 0.15, fadeOut: 0.6 });
          if (drain >= 1) {
            list.forEach(function (m) { if (hit.indexOf(m) < 0) { hit.push(m); c.hit(m, 1, 1.4); hitMark(m); } });
            swept.forEach(function (o) { if (o.m.pull !== undefined) { o.m.pull = undefined; o.m.pullZ = undefined; } }); swept.length = 0;
            simulation.dispose(); fall.kill(); wall.kill(); pool.kill(); return true;
          }
        }
        return false;
      });
    };
    return { clear: function () { runningFalls.forEach(function (dispose) { dispose(); }); } };
  };
})(this);
