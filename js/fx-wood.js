// Tier 10, 나무 냥법사 (2026-11-16, the user: 10차부터 나무 물 바람 태풍): the wood skills in real 3D — shapes made in
// Blender (js/mesh-wood.js, tools/blender/wood_meshes.py) drawn as toon bark with a dark outline (js/fx3d.js FS_BM.wood)
// and grown by k (the part of a root past k is not there yet; leaves sprout as k goes from 1 to 2).
// The scenes follow docs/superpowers/specs/2026-11-16-tier10-wood-scenes.md: gather → the body → the moment it lands →
// what is left. Whatever visibly lands is a real hit, and every monster ends up with the skill's whole damage.
(function (root) {
  var CW = root.CW = root.CW || {};
  CW.fxWood = function (K, S) {
    var T = K.T, sc = K.sc, V = K.V, rr = K.rr, E = K.E, N = K.N, after = K.after, tick = K.tick, gp = K.gp, P3 = K.P3;
    var BARK = [0x9a6538, 0x8a5a32, 0xa66e3e], LIME = 0xb8e05a, UP = new T.Vector3(0, 1, 0);
    // the earth the roots heave up: the place's ground, a little darker and browner (turned-over soil)
    function earthCol() { return new T.Color(K.dustCol()).lerp(new T.Color(0x6a4428), 0.6).getHex(); }
    function yawQ(a, tiltX, tiltZ) { return new T.Quaternion().setFromEuler(new T.Euler(tiltX || 0, a, tiltZ || 0, 'YXZ')); }
    function easeOut(x) { x = Math.min(1, Math.max(0, x)); return 1 - (1 - x) * (1 - x); }

    // a lump of heaved earth at p (the mound lies along x, turned to yaw), up in a blink, held, then settling back
    function heave(p, yaw, size, hold, col) {
      var h = P3.bm('woodMound', { col: col }), q = yawQ(yaw + rr(-0.3, 0.3)), t = 0, at = V(), s = V(size * rr(0.85, 1.15), size * rr(0.8, 1.2), size);
      tick(function (dt) {
        t += dt; var up = easeOut(t / 0.07), sink = Math.max(0, (t - 0.07 - hold) / 0.3);
        at.set(p.x, -0.12 * size * (1 - up) - 0.2 * size * sink, p.z);
        h.set(at, q, s, Math.max(0, 1 - sink), 1);
        if (sink < 1) return false; h.kill(); return true;
      });
    }
    // splinters of wood thrown out from p, tumbling and falling
    function splinters(p, n, spd) {
      for (var k = 0; k < n; k++) (function () {
        var h = P3.bm('woodChip', { col: K.pick(BARK) }), P = p.clone(), vel = K.rdir(spd).add(V(0, spd * 0.8, 0)), q = new T.Quaternion().setFromEuler(new T.Euler(rr(0, 6.3), rr(0, 6.3), rr(0, 6.3)));
        var w = K.rdir(1).normalize(), spin = rr(8, 14), t = 0, life = rr(0.45, 0.7), sz = rr(0.09, 0.15), R = new T.Quaternion();
        tick(function (dt) {
          t += dt; vel.y -= 9 * dt; P.addScaledVector(vel, dt); q.multiply(R.setFromAxisAngle(w, spin * dt));
          h.set(P, q, sz, Math.max(0, 1 - Math.max(0, t - life * 0.6) / (life * 0.4)), 1);
          if (t < life && P.y > -0.05) return false; h.kill(); return true;
        });
      })();
    }
    // the roots pounce on monster m (2026-11-16 2nd, the user: "a little bigger — blunt, not scary; roots pouncing"):
    // five root claws burst up in a ring round it, leaning out wide open (0.1 s), then snap shut over it all at once,
    // their hooked needle points coming down on it (a little overshoot and a shudder), while sharp spikes stab up
    // through it from below; moss and small leaves sprout on them, then they sink back with a spray of splinters.
    // The claw (woodRoot) grows along +y and curls toward +x: turned so +x faces the monster, leaned out by OPEN and
    // in by SHUT (radians about its own z). onPierce: the moment they close on it (the hit)
    var OPEN = [0.5, 0.7], SHUT = [-0.5, -0.36], ZA = new T.Vector3(0, 0, 1);
    function rootBurst(c, m, onPierce) {
      var g = gp(m), big = (m.boss ? 1.5 : 1) * Math.min(1.2, c.s), hold = c.D(0.4), cz = g.z + 0.05;
      var R = 0.55 * big, a0 = rr(0, 6.3), claws = [];
      for (var j = 0; j < 5; j++) {
        var a = a0 + j / 5 * 6.283 + rr(-0.2, 0.2);
        claws.push({ h: P3.bm('woodRoot', { col: K.pick(BARK) }), p: V(g.x + Math.cos(a) * R, -0.05, cz + Math.sin(a) * R * 0.75), yaw: Math.PI - a,
          L: rr(1.2, 1.45) * big, open: rr(OPEN[0], OPEN[1]), shut: rr(SHUT[0], SHUT[1]), lag: rr(0, 0.025) });
      }
      var spike = { h: P3.bm('woodRoots', { col: K.pick(BARK) }), p: V(g.x, -0.06, cz + 0.06), L: 0.8 * big, q: yawQ(rr(0, 6.3), rr(-0.1, 0.1), rr(-0.1, 0.1)) };
      var t = 0, pierced = false, sunk = false, at = V(), qy = new T.Quaternion(), qt = new T.Quaternion();
      tick(function (dt) {
        t += dt;
        var sink = Math.max(0, (t - 0.2 - hold) / 0.22), down = sink * sink, fade = Math.max(0, 1 - down);
        claws.forEach(function (C) {
          var u = t - C.lag, grow = easeOut(u / 0.1), x = Math.min(1, Math.max(0, (u - 0.1) / 0.07));
          // snapping shut: fast, a little past, back, then a shudder dying away
          var s2 = x < 1 ? x * x * (3 - 2 * x) * 1.15 : 1.15 - 0.15 * Math.min(1, (u - 0.17) / 0.08);
          var phi = C.open + (C.shut - C.open) * s2 + (x >= 1 ? Math.sin(u * 46) * 0.035 * Math.max(0, 1 - (u - 0.17) / 0.3) : 0);
          qy.setFromAxisAngle(UP, C.yaw); qt.setFromAxisAngle(ZA, phi); qy.multiply(qt);
          at.set(C.p.x, C.p.y - C.L * 0.9 * down, C.p.z);
          C.h.set(at, qy, C.L, fade, grow + Math.min(1, Math.max(0, (u - 0.22) / 0.2)));
        });
        var sg = easeOut((t - 0.12) / 0.06);   // the spikes from below go in as the claws shut
        at.set(spike.p.x, spike.p.y - spike.L * 0.9 * down, spike.p.z);
        spike.h.set(at, spike.q, spike.L, t < 0.12 ? 0 : fade, sg + Math.min(1, Math.max(0, (t - 0.25) / 0.2)));
        if (!pierced && t >= 0.16) { pierced = true; onPierce(); }
        if (!sunk && sink > 0.05) { sunk = true; splinters(V(g.x, 0.3, g.z), N(5, c), 2.8); K.dust(g, N(3, c), 0.9); }
        if (sink < 1) return false;
        claws.forEach(function (C) { C.h.kill(); }); spike.h.kill(); return true;
      });
    }

    // 뿌리 가시 as a spell (2026-11-17, the user: 식인 꽃처럼 빛 효과로, 무섭게): the root claws and the spikes as dark
    // violet shapes with a blood-red burning outline (art/wt-root.webp, wt-spikes.webp — rendered from bolder Blender
    // roots by tools/blender/render_root_pics.py; liveSheet spirit 2). Four claws rise out of the ground round the monster
    // (two behind it, two in front), curled open, and snap shut over it hooking down on it; the spikes stab up through it
    // from below; they shudder, then sink back into the ground. Same beats and hit as the 3D one (rootBurst).
    var ROOT_PIN = [0.2943, 0.1457], SPIKE_PIN = [0.5, 0.125], ROOT_RIM = 0xff1a2e, ROOT_DARK = 0x2a0a3a;
    function rootBurstLight(c, m, onPierce) {
      var g = gp(m), big = (m.boss ? 1.5 : 1) * Math.min(1.2, c.s), hold = c.D(0.4);
      var camR = V(1, 0, 0).applyQuaternion(sc.camera.quaternion), camU = V(0, 1, 0).applyQuaternion(sc.camera.quaternion);
      var claws = [];
      // [side (−1 left, +1 right), how far out, behind (drawn behind the monster) or in front, size]
      [[-1, 0.62, true, 1.0], [1, 0.62, true, 1.0], [-1, 0.42, false, 0.82], [1, 0.42, false, 0.82]].forEach(function (k, j) {
        var flip = k[0] < 0 ? 1 : -1;   // the picture curls to the right (+x): a claw on the left curls in as drawn
        claws.push({ s: liveSheet('wt-root', ROOT_PIN[0], ROOT_PIN[1], k[2] ? 2.35 : 40, ROOT_RIM, 2, ROOT_DARK), flip: flip,
          p: V(g.x, 0, g.z + (k[2] ? -0.12 : 0.18)).addScaledVector(camR, k[0] * k[1] * big), H: 1.55 * big * k[3] * rr(0.92, 1.08),
          open: rr(0.42, 0.58), shut: rr(-0.32, -0.2), lag: rr(0, 0.03) + (k[2] ? 0 : 0.015), U: {} });
      });
      var spike = { s: liveSheet('wt-spikes', SPIKE_PIN[0], SPIKE_PIN[1], 40.1, ROOT_RIM, 2, ROOT_DARK), p: V(g.x, 0, g.z + 0.08), H: 1.25 * big, U: {} };
      // (2026-11-17 2nd, the user: 그림 위에서 노는 느낌, 하늘에서 나와 때리는 느낌 → 뿌리니까 땅에서 튀어나와 덮치게)
      // The ground is their floor (nothing of them below it): first the ground cracks and glows where each will come out
      // and trembles; then each claw punches up out of it tip first (pushed up from under the ground, not drawn in from
      // the top), earth bursting round it, standing tall and leaning out; then they all curl over and slam shut on it;
      // the spikes punch up through it from below; at the end they are pulled back down into the ground.
      var RUMBLE = c.D(0.13), UP = c.D(0.13), SNAP = RUMBLE + UP + c.D(0.02), SPK = SNAP + c.D(0.02), SN = c.D(0.07);
      var t = 0, pierced = false, sunk = false, at = V();
      E({ sys: 'gnorm', pos: V(g.x, 0.03, g.z), frame: 'glow', color: 0xc01020, size: [0.5, 1.9 * big], ease: 1, life: 0.9, alpha: 0.7, fadeOut: 0.4 });
      E({ sys: 'gnorm', pos: V(g.x, 0.026, g.z), frame: 'smoke', color: 0x1a0612, size: [0.6, 1.7 * big], ease: 1, life: 1.4, alpha: 0.6, fadeIn: 0.05, fadeOut: 0.5 });
      sc.shake(0.08);
      claws.forEach(function (C) {
        C.out = false;
        after(C.lag, function () {   // the crack where it will come out
          E({ sys: 'gnorm', pos: V(C.p.x, 0.032, C.p.z), frame: 'glow', color: 0xff2030, size: [0.15, 0.6 * big], ease: 1, life: RUMBLE + hold + c.D(0.5), alpha: 0.8, fadeOut: 0.35 });
          E({ sys: 'gnorm', pos: V(C.p.x, 0.034, C.p.z), frame: 'smoke', color: 0x0e0408, size: [0.2, 0.42 * big], ease: 1, life: RUMBLE + hold + c.D(0.6), alpha: 0.75, fadeIn: 0.05, fadeOut: 0.4 });
          K.dust(C.p, 1, 0.4);
        });
      });
      tick(function (dt) {
        t += dt;
        var sink = Math.max(0, (t - SNAP - c.D(0.1) - hold) / c.D(0.24)), down = sink * sink;
        claws.forEach(function (C) {
          var u = t - C.lag, rise = easeOut((u - RUMBLE) / UP), x = Math.min(1, Math.max(0, (u - SNAP) / SN));
          if (!C.out && u >= RUMBLE) {   // it breaks out: earth thrown up round it
            C.out = true; K.dust(C.p, N(3, c), 1.0); splinters(V(C.p.x, 0.05, C.p.z), N(3, c), 2.4);
            for (var d = 0; d < N(5, c); d++) E({ pos: C.p.clone().add(V(rr(-0.15, 0.15), 0.05, rr(-0.1, 0.1))), vel: K.rdir(1.4).add(V(0, rr(2.2, 3.4), 0)), frame: 'dot', color: K.pick([0x3a2418, 0x241410, 0x5a1a1a]), size: [rr(0.07, 0.12), 0.05], life: rr(0.4, 0.6), grav: 9 });
            K.sparks(C.p, [0xff3040, 0x9a1020], N(3, c), 2.2, { size: 0.09, up: 2 });
            if (C === claws[0]) sc.shake(0.16);
          }
          // standing up as it comes out (a little leant in), leaning out wide at the top; then slamming shut: fast, a
          // little past, back, a shudder dying away
          var s2 = x < 1 ? x * x * (3 - 2 * x) * 1.15 : 1.15 - 0.15 * Math.min(1, (u - SNAP - SN) / (SN * 1.15));
          var lean = 0.12 + (C.open - 0.12) * rise;
          var phi = lean + (C.shut - lean) * s2 + (x >= 1 ? Math.sin(u * 46 * 0.07 / SN) * 0.035 * Math.max(0, 1 - (u - SNAP - SN) / (SN * 4.3)) : 0);
          at.copy(C.p).addScaledVector(camU, -C.H * 1.02 * (1 - rise + down));
          C.U.floor = 0.0; C.U.grow = 2; C.U.edge = 0.9 + 0.5 * (1 - rise); C.U.flow = 0.6; C.U.alpha = u < RUMBLE ? 0 : Math.max(0, 1 - Math.max(0, down - 0.7) / 0.3);
          C.U.flash = pierced && t < SPK + c.D(0.1) ? 0.5 : 0; C.U.bend = 0; C.U.wig = 0.02 * (1 - rise) + 0.004; C.U.wigF = 8; C.U.wigS = 12;
          C.s.set(at, C.H * C.flip, C.H, C.flip * phi, C.U, dt);
        });
        // the spikes punch up through it from below as the claws shut
        var sg = easeOut((t - SPK) / SN);
        at.copy(spike.p).addScaledVector(camU, -spike.H * 1.02 * (1 - Math.max(0, sg) + down));
        spike.U.floor = 0.0; spike.U.grow = 2; spike.U.edge = 1.0; spike.U.flow = 0.6; spike.U.alpha = t < SPK ? 0 : Math.max(0, 1 - Math.max(0, down - 0.7) / 0.3); spike.U.flash = pierced && t < SPK + c.D(0.1) ? 0.6 : 0;
        spike.s.set(at, spike.H, spike.H, 0, spike.U, dt);
        if (!pierced && t >= SPK + c.D(0.03)) { pierced = true; onPierce(); K.dust(spike.p, N(3, c), 1.1); }
        if (!sunk && sink > 0.05) { sunk = true; K.dust(g, N(4, c), 0.9); claws.forEach(function (C) { K.dust(C.p, 1, 0.6); }); }
        if (sink < 1) return false;
        claws.forEach(function (C) { C.s.kill(); }); spike.s.kill(); return true;
      });
    }
    // 뿌리 가시 (scene 1): the staff is struck on the ground, the earth heaves at the paws, and lines of heaving earth run
    // under the ground to every monster (nearest first, like a mole's run); where each one arrives root claws burst up
    // round it and snap shut on it while spikes stab up from below (rootBurst), moss sprouts on them, they sink back with a spray of
    // splinters, leaving torn ground
    S.rootSpikes = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('slam', c.D(0.12), c.col);
      after(c.D(0.12), function () {
        var H = sc.heroCenter(), G0 = V(H.x, 0, H.z), col = earthCol();
        heave(G0, 0, 0.6, c.D(0.4), col); K.dust(G0, N(5, c), 1.0); sc.shake(0.1);
        K.gRing(G0, 0xc01020, 1.0, 0.3);
        var d2 = function (m) { return (m.x - G0.x) * (m.x - G0.x) + (m.z - G0.z) * (m.z - G0.z); };
        list = list.slice().sort(function (a, b) { return d2(a) - d2(b); });
        var n = list.length;
        list.forEach(function (mob, i) {
          var t = 0, run = c.D(0.22 + 0.36 * (n > 1 ? i / (n - 1) : 0)), done = 0, head = P3.bm('woodMound', { col: col }), yaw = 0;
          tick(function (dt) {
            t += dt; var k = Math.min(1, t / run), to = gp(mob), dx = to.x - G0.x, dz = to.z - G0.z;
            yaw = Math.atan2(-dz, dx);
            var p = G0.clone().lerp(to, k);
            head.set(V(p.x, 0, p.z), yawQ(yaw), 0.36, 1, 1);
            while (done + 0.13 <= k) {
              done += 0.13; var q = G0.clone().lerp(to, done);
              heave(V(q.x + rr(-0.06, 0.06), 0, q.z + rr(-0.06, 0.06)), yaw, rr(0.22, 0.3), c.D(0.28), col);
              E({ sys: 'gnorm', pos: V(q.x, 0.024, q.z), frame: 'smoke', color: 0x2a1a10, size: [0.25, 0.42], ease: 1, life: 1.0, alpha: 0.38, fadeIn: 0.05, fadeOut: 0.5 });
              if (Math.random() < 0.6) K.dust(q, 1, 0.5);
            }
            if (k < 1) return false;
            head.kill();
            (wpLoad('wt-root') && wpLoad('wt-spikes') ? rootBurstLight : rootBurst)(c, mob, function () {
              var q0 = sc.mobPos(mob);
              K.flare(q0, 0xff2a3a, 0.8, 0.12); K.sparks(q0, [0xff4050, 0x700010, 0x9a40ff], N(6, c), 3.4, { size: 0.13, up: 1.5 });   // (blood red, 2026-11-17 무섭게)
              for (var bl = 0; bl < N(5, c); bl++) E({ pos: q0.clone().add(K.rdir(0.2)), vel: K.rdir(2.5).add(V(0, 2, 0)), frame: 'dot', color: K.pick([0xc01020, 0x700010]), size: [0.1, 0.03], life: rr(0.35, 0.6), grav: 7, drag: 0.6 });
              sc.light(q0, 0xff2030, 1.2, 0.25); if (!i) { sc.shake(0.16); sc.hitStop(0.05); }
              c.hit(mob, 1, 0.7);   // a light knock-back: the monster stays caught in the claws
            });
            // the torn ground where they burst out
            E({ sys: 'gnorm', pos: V(to.x, 0.026, to.z + 0.1), frame: 'smoke', color: 0x2a1a10, size: [0.5, 0.95], ease: 1, life: 1.4, alpha: 0.42, fadeIn: 0.05, fadeOut: 0.5 });
            return true;
          });
        });
      });
    };

    // a piece thrown off (a petal, a blade leaf): it tumbles through the air, lands, lies a moment and withers away (a
    // hard piece browns; all fade). leaf: falls slowly, fluttering
    function toss(kind, p, vel, sz, col, leaf) {
      if (CW.fxOff && CW.fxOff.toss) return;   // (switches for measuring on a phone, dev/phone-perf-tree.html; unset in the game)
      var h = P3.bm(kind, { col: col }), P = p.clone(), v = vel.clone(), q = new T.Quaternion().setFromEuler(new T.Euler(rr(0, 6.3), rr(0, 6.3), rr(0, 6.3)));
      var w = K.rdir(1).normalize(), spin = rr(6, 12), t = 0, landed = -1, R = new T.Quaternion(), lie = rr(0.25, 0.45), browned = false, ph = rr(0, 6.3);
      tick(function (dt) {
        if (!h.live()) return true;   // pushed out of its layer (too many at once): nothing drawn, so stop moving it
        t += dt;
        if (landed < 0) {
          v.y -= (leaf ? 3.5 : 9) * dt;
          if (leaf) { v.x *= 1 - 2.5 * dt; v.z *= 1 - 2.5 * dt; v.y = Math.max(v.y, -1.2); P.x += Math.sin(t * 9 + ph) * 0.6 * dt; }
          P.addScaledVector(v, dt); q.multiply(R.setFromAxisAngle(w, spin * dt));
          if (P.y <= 0.03) { P.y = 0.03; landed = t; if (!leaf) K.dust(P, 1, 0.4); }
        }
        var wither = landed < 0 ? 0 : Math.max(0, (t - landed - lie) / 0.45);
        if (wither > 0 && !browned) { browned = true; if (!leaf) h.tint(0x5a4a30); }
        h.set(P, q, sz * (1 - 0.35 * wither), Math.max(0, 1 - wither), 2);
        if (wither < 1 && t < 3) return false; h.kill(); return true;
      });
    }

    // ---- 식인 꽃 (2026-11-16, in place of 덩굴 조이기, which the user turned down twice: "no impact") ----
    // The ground under the monster heaves and darkens; a giant flytrap bursts up behind it, jaws gaping over it, rears
    // back — and snaps shut on it (the bite: 40% of the damage, a jolt); it chews twice, shaking its head (15% each);
    // then it flings its jaws open and spits the monster out flying (the last 30%; the monsters next to it are caught
    // too), its petals and torn leaves bursting off; then it wilts and sinks back into the ground. A one-monster skill:
    // each copy has its own flower.
    // Shapes (js/mesh-wood.js): trapStem (grows along +y, its top bending to +z), trapJaw (hinged along x, reaching +z,
    // its inside +y; the upper jaw is it turned half round z), trapPetal (+y, face +z).
    var TRAP = { stem: 0x5f9632, jaw: 0xd8283a, petal: 0xff6f96, petal2: 0xd0286a }, RX = new T.Vector3(1, 0, 0), RZ = new T.Vector3(0, 0, 1), ROT_Z = new T.Quaternion().setFromAxisAngle(RZ, Math.PI);
    // where drool hangs from the upper jaw (its own frame: along its rim, near the teeth)
    var DROOL = [V(-0.42, 0.02, 0.5), V(0.42, 0.02, 0.5), V(-0.3, 0.02, 0.78), V(0.3, 0.02, 0.78), V(0, 0.02, 0.95)];
    function flytrap(c, mob) {
      var g = gp(mob), hgt = (mob.group && mob.group.userData.h) || (mob.boss ? 1.6 : 0.92), s = hgt * 1.9;
      // (2026-11-17, the user's new icon: "더 고쳐") side-on, the way the icon shows it: the head stands beside the
      // monster, its mouth toward it (toward the edge it is nearer, so the plant itself stands toward the middle), the
      // hinge axis toward the camera so the jaws open and snap in the screen's plane; the neck rises from behind the
      // head and curls into the back of it. fwd: the way the mouth faces (a little up)
      var C = sc.mobPos(mob), fwd = V(C.x < 0 ? -1 : 1, 0.2, 0.65).normalize(), hinge = C.clone().addScaledVector(fwd, -0.6 * 0.95 * s);
      var toCam = V(0, 0.6, 1).normalize(), across = toCam.clone().addScaledVector(fwd, -toCam.dot(fwd)).normalize(), upw = new T.Vector3().crossVectors(fwd, across).normalize();
      if (upw.y < 0) { across.negate(); upw.negate(); }
      var qHead = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across, upw, fwd));
      // the neck: out of the ground behind the head and arching forward into the back of it (the stem shape ends at
      // (0, 0.5, 0.9), turned to reach the hinge from its foot)
      var dirH = V(fwd.x, 0, fwd.z).normalize();
      var Sy = (Math.max(0, hinge.y) + 0.8 * s) / 1.05, Sz = 0.85 * s, base = V(hinge.x - dirH.x * 0.9 * Sz, 0, hinge.z - dirH.z * 0.9 * Sz), qStem = yawQ(Math.atan2(dirH.x, dirH.z));
      var stem = P3.bm('trapStem', { col: TRAP.stem }), lo = P3.bm('trapJaw', { col: TRAP.jaw }), hi = P3.bm('trapJaw', { col: TRAP.jaw }), tongue = P3.bm('trapTongue', { col: TRAP.jaw });
      // (2026-11-17, the user's 3D 시안: the flower's petals are a lily round the stem's foot, part of trapStem — no ring
      // round the head; the petals still burst off the head when it spits, as before)
      var petals = [];
      for (var j = 0; j < 10; j++) {
        var inner = j >= 6, a = inner ? (j - 6) / 4 * 6.283 + 1.2 : j / 6 * 6.283 + 0.4;
        var dir = fwd.clone().multiplyScalar(inner ? -0.25 : -0.55).addScaledVector(across, Math.cos(a) * 0.85).addScaledVector(upw, Math.sin(a) * 0.85);
        petals.push({ h: { set: function () {}, kill: function () {} }, q: aim(new T.Quaternion(), dir, rr(-0.3, 0.3)), dir: dir, k: inner ? 0.3 : 0.46 });
      }
      var qU = new T.Quaternion(), dp = V();
      // (2026-11-17, the user's new icon) a magenta flower crowning the head: six petals round a point on the back of the
      // upper jaw (its own frame: the outside of its shell is -y, the hinge at z 0), riding with it as it snaps and chews
      var crown = [0, 1, 2, 3, 4, 5].map(function (i) { var a = i / 6 * 6.283; return { h: P3.bm('trapPetal', { col: 0xff5aa8 }), d: V(Math.cos(a) * 0.75, -0.75, 0.2 + Math.sin(a) * 0.6).normalize(), q: new T.Quaternion() }; }), CPOS = V(0, -0.3, 0.22), cp = V(), cd = V(), CS = V();
      var t = 0, at = V(), head = V(), qa = new T.Quaternion(), qj = new T.Quaternion(), JL = 0.95 * s, SS = V(), PS = V();
      var D = function (x) { return c.D(x); }, ERUPT = D(0.16), UP_T = D(0.12), REAR = D(0.32), SNAP = D(0.42), BITE = D(0.46), SPIT = D(0.8), GONE = D(1.25);
      var owed = 0, done = { erupt: false, bite: false, chew1: false, chew2: false, spit: false };
      // the rumble: the ground under it heaves and darkens
      E({ sys: 'gnorm', pos: V(g.x, 0.026, g.z), frame: 'smoke', color: 0x1a0e08, size: [0.4, 1.6 * s], ease: 1, life: 1.6, alpha: 0.5, fadeIn: 0.1, fadeOut: 0.5 });
      for (var m = 0; m < 4; m++) { var b = m / 4 * 6.283 + rr(-0.3, 0.3); heave(V(g.x + Math.cos(b) * 0.4 * s, 0, g.z + Math.sin(b) * 0.3 * s), b, 0.28 * s, D(0.25), earthCol()); }
      K.dust(g, N(3, c), 0.8); sc.shake(0.08);
      tick(function (dt) {
        t += dt;
        if (!done.erupt && t >= ERUPT) {
          done.erupt = true;
          K.dust(base, N(7, c), 1.4); heave(base, 0, 0.6 * s, D(0.7), earthCol()); splinters(V(base.x, 0.2, base.z), N(4, c), 3); sc.shake(0.16);
          if (mob.alive) { mob.pull = mob.x; mob.pullZ = mob.z; }
        }
        if (t < ERUPT) return false;
        var u = t - ERUPT, rise = easeOut(u / UP_T), theta, lunge = 0, roll = 0, bob = 1, pitch = 0, sink = 0;
        // how wide the jaws are: gaping as it rises, wider as it rears back, snapping shut, chewing, flung open, then hanging
        if (t < REAR) theta = 1.25;
        else if (t < SNAP) { theta = 1.25 + 0.25 * easeOut((t - REAR) / (SNAP - REAR)); lunge = -0.12 * easeOut((t - REAR) / (SNAP - REAR)); }
        else if (t < BITE) { var x = (t - SNAP) / (BITE - SNAP); theta = 1.5 * (1 - x * x); lunge = -0.12 + 0.22 * x; }
        else if (t < SPIT) { var w = (t - BITE) / (SPIT - BITE); theta = 0.16 * Math.max(0, Math.sin(w * Math.PI * 2 * 2)); lunge = 0.1 - 0.1 * w; roll = Math.sin(w * Math.PI * 4) * 0.22; bob = 1 + 0.06 * Math.max(0, Math.sin(w * Math.PI * 4)); }
        else { var y = (t - SPIT) / (GONE - SPIT); theta = 1.6 * easeOut(y * 6) * (1 - 0.6 * Math.max(0, y - 0.3)); pitch = 0.7 * Math.max(0, y - 0.15); sink = Math.max(0, (y - 0.35) / 0.65); }
        // the head: rising out of the ground to its place, lunging, nodding, wilting and sinking
        head.lerpVectors(V(base.x, -0.2, base.z), hinge, rise).addScaledVector(fwd, lunge * s); head.y -= hinge.y * 1.1 * sink * sink;
        var fade = Math.max(0, 1 - Math.max(0, sink - 0.75) / 0.25);
        qa.setFromAxisAngle(fwd, roll); qa.multiply(qHead); if (pitch) qa.multiply(qj.setFromAxisAngle(RX, pitch));
        var js = JL * (0.35 + 0.65 * rise) * bob;
        lo.set(head, qj.copy(qa).multiply(new T.Quaternion().setFromAxisAngle(RX, theta)), js, fade, 2); tongue.set(head, qj, js, fade, 2);
        qU.copy(qa).multiply(new T.Quaternion().setFromAxisAngle(RX, -theta)).multiply(ROT_Z);
        hi.set(head, qU, js, fade, 2);
        cp.copy(CPOS).applyQuaternion(qU).multiplyScalar(js).add(head);
        crown.forEach(function (P) { cd.copy(P.d).applyQuaternion(qU); aim(P.q, cd, 0); CS.set(0.42, 0.34, 0.42).multiplyScalar(js); P.h.set(cp, P.q, CS, fade, 2); });
        // drool dripping from the upper jaw's teeth while the mouth gapes
        if (theta > 0.6 && fade > 0.5 && Math.random() < dt * 26 * c.n) {
          dp.copy(K.pick(DROOL)).applyQuaternion(qU).multiplyScalar(js).add(head);
          E({ pos: dp.clone(), vel: V(rr(-0.2, 0.2), -0.4, 0), frame: 'dot', color: [0xe8f590, 0xa8d040], size: [0.08, 0.04], stretch: 0.06, life: rr(0.35, 0.55), grav: 7, drag: 0.6, alpha: 0.9 });
        }
        // the stem grows out of the ground with it (and back into it as it wilts)
        SS.set(s * 0.8, Sy * (0.3 + 0.7 * rise) * (1 - 0.6 * sink), Sz);
        stem.set(at.set(base.x, 0, base.z), qStem, SS, fade, Math.max(0, rise * 2 - sink * 2));
        if (!done.spit) petals.forEach(function (P) { PS.set(P.k * s * 1.6, P.k * s, P.k * s * 1.6).multiplyScalar(rise * bob); P.h.set(head, qj.copy(qa).multiply(P.q.clone().premultiply(qHead.clone().invert())), PS, fade, 2); });
        // the bite: a puff of red mist, drool and juice spattering, a ring of shock over the ground
        if (!done.bite && t >= BITE) {
          done.bite = true; var q0 = sc.mobPos(mob);
          K.sparks(q0, [0xff6070, 0x9fe05a, 0xffe0a0], N(10, c), 4.5, { size: 0.16, up: 1.2 }); K.flare(q0, 0xff8070, 0.5, 0.08);
          K.smoke(q0, [0x9a1a2a, 0x5a0a14], N(3, c), { size: 0.7 * s, alpha: 0.38, rise: 0.4, life: 0.8 });
          for (var sp = 0; sp < N(10, c); sp++) E({ pos: q0.clone().add(K.rdir(0.3)), vel: K.rdir(3).add(V(0, 2.5, 0)), frame: 'dot', color: K.pick([0xe8f590, 0xa8d040, 0xff5a6a]), size: [0.1, 0.03], life: rr(0.4, 0.7), grav: 7, drag: 0.8 });
          E({ sys: 'gnorm', pos: V(g.x, 0.035, g.z), frame: 'shock', color: 0x3a0a10, size: [0.3, 2.6 * s], ease: 1, life: 0.38, fadeOut: 0.3, rot: 0, alpha: 0.7 });
          sc.light(q0, 0xff5060, 1.3, 0.25); sc.shake(0.28); sc.hitStop(0.08);
          c.hit(mob, 0.4, 0.3);
        }
        // the chewing
        [['chew1', 0.28], ['chew2', 0.68]].forEach(function (ch) {
          if (!done[ch[0]] && t >= BITE + (SPIT - BITE) * ch[1]) {
            done[ch[0]] = true; var q1 = sc.mobPos(mob);
            for (var d = 0; d < N(4, c); d++) E({ pos: q1.clone().add(K.rdir(0.25)), vel: K.rdir(2).add(V(0, 2, 0)), frame: 'dot', color: K.pick([0xff5a6a, 0x9fe05a]), size: [0.09, 0], life: rr(0.35, 0.55), grav: 6, drag: 1 });
            sc.shake(0.12);
            // a monster that fell to the bite is chewed no more: its share waits for the spit (landing then on the one
            // nearest, as any shot whose monster has fallen does) instead of popping up on another monster mid-chew
            if (mob.alive) c.hit(mob, 0.15, 0.2); else owed += 0.15;
          }
        });
        // spat out: the jaws flung open, the petals and leaves bursting off
        if (!done.spit && t >= SPIT) {
          done.spit = true;
          if (mob.pull !== undefined) { mob.pull = undefined; mob.pullZ = undefined; }
          var q2 = sc.mobPos(mob);
          petals.forEach(function (P) { P.h.kill(); toss('trapPetal', head.clone().addScaledVector(P.dir, 0.2 * s), P.dir.clone().multiplyScalar(rr(3, 4.5)).add(V(0, rr(1.5, 3), 0)), P.k * s, P.k < 0.4 ? TRAP.petal2 : TRAP.petal, true); });
          for (var l = 0; l < N(6, c); l++) toss('leafBlade', q2, K.rdir(3).add(V(0, 2.5, 0)), rr(0.25, 0.35), K.pick(BLADE), true);
          splinters(q2, N(5, c), 3.2);
          E({ sys: 'gnorm', pos: V(g.x, 0.035, g.z), frame: 'shock', color: 0x2f7a26, size: [0.3, 3.2 * s], ease: 1, life: 0.4, fadeOut: 0.3, rot: 0, alpha: 0.8 }); K.gRing(g, 0xff6a80, 1.4 * s, 0.25);
          sc.shake(0.3); sc.hitStop(0.07); sc.light(q2, 0xff6070, 1.4, 0.3);
          c.hit(mob, 0.3 + owed, 2.4);   // spat out flying
          c.splash(mob, 1.6, 0.9);
        }
        if (t < GONE) return false;
        lo.kill(); hi.kill(); tongue.kill(); stem.kill(); crown.forEach(function (P) { P.h.kill(); }); return true;
      });
    }
    // The jaw pictures' joints (art/wt-trap-upper|lower.webp, the GPT pictures): each picture's size and the centre of its
    // round hinge knob as a fraction from its bottom left (2026-11-17, the user: the joint must stay matched open and shut)
    var TP = { upper: { w: 976, h: 570, pin: [0.9467, 0.1035] }, lower: { w: 1017, h: 579, pin: [0.941, 0.7858] } };
    // 식인 꽃 as a spell of light (2026-11-17, the user: "유성우·폭염탄처럼" — the plant itself standing there looked pasted on
    // whatever was tried; the skills that look right are light and fire): giant jaws made of green light (the GPT jaw
    // pictures as shapes of light, liveSheet spirit) loom open over the monster, snap shut on it in a white-green flash,
    // chew twice (flashing), and burst open spitting it out in a blast of green and pink light, petals and leaves.
    // Same beats, hits and effects as before.
    function flytrapLight(c, mob) {
      var g = gp(mob), hgt = (mob.group && mob.group.userData.h) || (mob.boss ? 1.6 : 0.92), s = hgt * 1.9;
      var C = sc.mobPos(mob), dir = C.x < 0 ? -1 : 1, flip = dir > 0 ? -1 : 1;
      var camR = V(1, 0, 0).applyQuaternion(sc.camera.quaternion), camU = V(0, 1, 0).applyQuaternion(sc.camera.quaternion);
      var JW = 1.7 * s, px = JW / TP.upper.w;   // (bigger: one bite takes the monster whole)
      var UW = JW, UH = TP.upper.h * px, LW = TP.lower.w * px, LH = TP.lower.h * px;
      var lo = liveSheet('wt-trap-lower', TP.lower.pin[0], TP.lower.pin[1], 40, 0x7dff2a, 2, 0x8a0612), hi = liveSheet('wt-trap-upper', TP.upper.pin[0], TP.upper.pin[1], 40.1, 0x7dff2a, 2, 0x8a0612);
      var jA = 0, jV = 0, sq = 0, sqV = 0, UJ = {}, hinge = V(), dp = V();
      var D = function (x) { return c.D(x); }, ERUPT = D(0.16), REAR = D(0.32), SNAP = D(0.42), BITE = D(0.46), SPIT = D(0.8), GONE = D(1.0);
      var owed = 0, done = { erupt: false, bite: false, chew1: false, chew2: false, spit: false }, t = 0;
      // a ring of green light gathering under it first
      E({ sys: 'gnorm', pos: V(g.x, 0.03, g.z), frame: 'smoke', color: 0x1a0306, size: [0.4, 2.2 * s], ease: 1, life: 0.8, alpha: 0.6, fadeOut: 0.4 });
      K.gRing(g, 0xc01020, 1.3 * s, 0.3);
      tick(function (dt) {
        t += dt;
        if (!done.erupt && t >= ERUPT) {
          done.erupt = true;
          E({ pos: sc.mobPos(mob), frame: 'glow', color: 0xff2030, size: [0.5, 2.4 * s], life: 0.3, alpha: 0.5 });
          sc.light(sc.mobPos(mob), 0xff2030, 1.4, 0.35); sc.shake(0.1);
          if (mob.alive) { mob.pull = mob.x; mob.pullZ = mob.z; }
        }
        if (t < ERUPT) return false;
        // (2026-11-17, the user: 쫘악 벌어졌다가 한 번에 쾅, 관절이 어긋나지 않게, 한입에 먹어 버리게, 입 둘레에서 독이 흘러내리게)
        // The jaws' angles, measured on the pictures (tools: rotating them about the shared hinge): 0 = as painted, +16°
        // each = the lips meet and the teeth mesh (shut), −26° each = gaping wide. They open wide slowly, tremble wide open,
        // slam shut in one blow (a little bounce, never past shut), stay shut gulping, and fade away shut.
        var SHUT = 0.279, WIDE = -0.59;   // (gaping wider: 34° each)
        var u = t - ERUPT, app = easeOut(u / D(0.1)), ang, tremble = 0, out = 0, lean = 0;
        if (t < REAR) ang = SHUT + (WIDE - SHUT) * easeOut(u / (REAR - ERUPT));                        // 쫘악
        else if (t < SNAP) { ang = WIDE - 0.04 * easeOut((t - REAR) / (SNAP - REAR)); tremble = 0.012; lean = -0.06; } // wide, quivering, rearing back
        else if (t < BITE) { var x = (t - SNAP) / (BITE - SNAP); ang = WIDE - 0.04 + (SHUT - WIDE + 0.04) * x * x * x; lean = -0.06 + 0.12 * x; } // 쾅
        else if (t < SPIT) { var w = t - BITE; ang = SHUT - 0.035 * Math.exp(-w * 18) * Math.abs(Math.sin(w * 40)); lean = 0.06 * Math.exp(-w * 8); } // shut: a little bounce
        else { out = (t - SPIT) / (GONE - SPIT); ang = SHUT; }
        sqV += (-sq * 320 - sqV * 10) * dt; sq += sqV * dt;
        var shake = tremble ? Math.sin(t * 90) * tremble : 0;
        // the mouth's middle over the monster (the hinge to the side of it), one piece: both jaws on the same hinge, the
        // same size and the same squash, no bending of the pictures
        var M = sc.mobPos(mob), sz = (0.55 + 0.45 * app) * (1 + 0.15 * out);
        var push = t < REAR ? 0 : t < SNAP ? -0.05 * easeOut((t - REAR) / (SNAP - REAR)) : t < BITE ? -0.05 + 0.2 * Math.pow((t - SNAP) / (BITE - SNAP), 2) : 0.15 * Math.exp(-(t - BITE) * 6);   // rears back, then lunges in as it bites
        hinge.copy(M).addScaledVector(camR, -dir * (0.45 - push) * UW * sz).addScaledVector(camU, 0.05 * hgt);
        var fl = (t >= BITE && t < BITE + 0.1) ? 1 : 0;
        UJ.flow = 0.9; UJ.edge = 1.0 + 0.8 * fl; UJ.flash = 0.5 * fl; UJ.alpha = Math.min(1, u / D(0.05)) * (1 - out * out);
        UJ.bend = 0; UJ.wig = 0; UJ.flut = 0;
        var head = (lean + shake) * flip;
        hi.set(hinge, UW * sz * flip * (1 + sq), UH * sz * (1 - sq), flip * ang + head, UJ, dt);
        lo.set(hinge, LW * sz * flip * (1 + sq), LH * sz * (1 - sq), -flip * ang + head, UJ, dt);
        // poison running down off the lips: streams dripping from points along both jaws' edges (turned with them), more
        // when it gapes; it lands as a spreading toxic pool under the monster
        var drip = (t < BITE ? 90 : 45) * c.n * (1 - out);
        if (Math.random() < dt * drip) {
          var up = Math.random() < 0.6, fr = rr(0.25, 0.92), jr = up ? flip * ang + head : -flip * ang + head;
          var lx = -flip * fr * (up ? UW : LW) * sz, ly = (up ? -0.12 * UH : 0.1 * LH) * sz;
          var cs = Math.cos(jr), sn = Math.sin(jr);
          dp.copy(hinge).addScaledVector(camR, lx * cs - ly * sn).addScaledVector(camU, lx * sn + ly * cs);
          E({ pos: dp.clone(), vel: V(rr(-0.15, 0.15), rr(-0.3, -0.05), 0), frame: 'dot', color: K.pick([0x7dff2a, 0x9dff3a, 0x4ad010]), size: [rr(0.2, 0.32), 0.09], stretch: 0.42, life: rr(0.55, 0.9), grav: 5, drag: 0.5, alpha: 1 });
          E({ pos: dp.clone(), vel: V(0, -0.3, 0), frame: 'glow', color: 0x7dff2a, size: [0.55, 0.15], life: 0.55, grav: 2.5, alpha: 0.75 });
          if (Math.random() < 0.25) K.smoke(dp, [0x3a8a10, 0x1f5a08], 1, { size: 0.5 * s, alpha: 0.32, rise: 0.25, life: 0.9 });
        }
        var q0, q1, q2;
        if (!done.bite && t >= BITE) {
          done.bite = true; q0 = sc.mobPos(mob); sqV += 6;
          K.flare(q0, 0xff3040, 2.0, 0.12); K.gRing(g, 0xff2030, 2.2 * s, 0.22);
          K.sparks(q0, [0xff4050, 0x9dff3a, 0x700010], N(14, c), 6, { size: 0.16, stretch: 0.12, life: 0.35 });
          for (var sp = 0; sp < N(12, c); sp++) E({ pos: q0.clone().add(K.rdir(0.3)), vel: K.rdir(3.5).add(V(0, 2.5, 0)), frame: 'glow', color: K.pick([0xff2030, 0x9dff3a, 0x900818]), size: [0.2, 0.04], life: rr(0.4, 0.7), grav: 5, drag: 0.8, alpha: 0.9 });
          E({ sys: 'gnorm', pos: V(g.x, 0.035, g.z), frame: 'shock', color: 0x5a0008, size: [0.3, 2.6 * s], ease: 1, life: 0.38, fadeOut: 0.3, rot: 0, alpha: 0.6 });
          sc.light(q0, 0xff2030, 1.8, 0.3); sc.shake(0.4); sc.hitStop(0.14);
          E({ sys: 'gnorm', pos: V(g.x, 0.03, g.z), frame: 'glow', color: 0x6aff20, size: [0.8, 2.4 * s], ease: 1, life: 1.6, alpha: 0.75, fadeOut: 0.6 });
          for (var bb = 0; bb < N(10, c); bb++) after(c.D(rr(0, 0.6)), function () { E({ pos: V(g.x + rr(-0.6, 0.6) * s, 0.05, g.z + rr(-0.3, 0.3) * s), vel: V(0, rr(0.5, 1.1), 0), frame: 'glow', color: [0x9dff3a, 0x6aff20], size: [0.22, 0.3], life: rr(0.35, 0.6), alpha: 0.85 }); });
          K.smoke(q0, [0x2a0408, 0x120206], N(3, c), { size: 0.8 * s, alpha: 0.45, rise: 0.4, life: 0.8 });
          c.hit(mob, 0.4, 0.3);
        }
        [['chew1', 0.28], ['chew2', 0.68]].forEach(function (ch) {
          if (!done[ch[0]] && t >= BITE + (SPIT - BITE) * ch[1]) {
            done[ch[0]] = true; q1 = sc.mobPos(mob); sqV += 4;
            K.flare(q1, 0xff3040, 0.9, 0.08);
            for (var d = 0; d < N(6, c); d++) E({ pos: q1.clone().add(K.rdir(0.25)), vel: K.rdir(2.5).add(V(0, 2, 0)), frame: 'glow', color: K.pick([0xff2030, 0x9dff3a]), size: [0.14, 0.03], life: rr(0.35, 0.55), grav: 4, drag: 1, alpha: 0.9 });
            sc.shake(0.12);
            if (mob.alive) c.hit(mob, 0.15, 0.2); else owed += 0.15;
          }
        });
        if (!done.spit && t >= SPIT) {
          done.spit = true;
          if (mob.pull !== undefined) { mob.pull = undefined; mob.pullZ = undefined; }
          q2 = sc.mobPos(mob);
          K.flare(q2, 0xff4050, 2.4, 0.14); K.gRing(g, 0xff2030, 2.6 * s, 0.28); K.gRing(g, 0x7dff2a, 1.6 * s, 0.35);
          K.sparks(q2, [0xff4050, 0x9dff3a, 0x700010], N(18, c), 8, { size: 0.15, stretch: 0.14, life: 0.4 });
          for (var l = 0; l < N(22, c); l++) E({ pos: q2.clone().add(K.rdir(0.3)), vel: K.rdir(4).add(V(0, 2.4, 0)), frame: 'glow', color: K.pick([0xff2030, 0xb00818, 0x9dff3a, 0x5adf10]), size: [rr(0.18, 0.3), 0.04], life: rr(0.45, 0.8), grav: 3, drag: 1.1, alpha: 0.9 });
          for (var lb = 0; lb < N(5, c); lb++) toss('woodLeaf', q2, K.rdir(3).add(V(0, 2.5, 0)), rr(0.14, 0.2), 0xffffff, true);
          E({ sys: 'gnorm', pos: V(g.x, 0.035, g.z), frame: 'shock', color: 0x5a0008, size: [0.3, 3.4 * s], ease: 1, life: 0.42, fadeOut: 0.3, rot: 0, alpha: 0.7 });
          sc.shake(0.3); sc.hitStop(0.07); sc.light(q2, 0xff2030, 1.8, 0.3);
          c.hit(mob, 0.3 + owed, 0.6);
          c.splash(mob, 1.6, 0.9);
        }
        if (t < GONE) return false;
        lo.kill(); hi.kill(); return true;
      });
    }
    S.flytrap = function (c) {
      var first = c.pool()[0]; if (!first) return;
      c.plain = true;
      sc.heroPose('slam', c.D(0.12), c.col);
      // with no one left it still opens where its monster fell: the bite goes on to the next one to come (fx.js c.hit)
      // (2026-11-17, user: '스킬이 씹혀' — it used to give up there and the whole cast was lost)
      after(c.D(0.12), function () { var mob = first.alive ? first : c.pool()[0] || first; if (wpLoad('wt-trap-upper') && wpLoad('wt-trap-lower')) flytrapLight(c, mob); else flytrap(c, mob); });   // (the painted one once its pictures have loaded)
    };

    // ---- 나뭇잎 칼날 폭풍 (scene 3; the standard from the user: impact first — a big release, shake, a jolt at the
    // first hit) ----
    var BLADE = [0x2f7a26, 0x3a8a2c, 0x286b22, 0x47993a], GOLD = 0xffe27a, RING = 0.8;   // RING: the storm's radius round the wizard
    var MB = new T.Matrix4(), BX = new T.Vector3(), BY = new T.Vector3(), BZ = new T.Vector3();
    // turn a blade leaf (pointing +y, its face +z) to point along d, rolled about it by roll
    function aim(q, d, roll) {
      BY.copy(d); if (BY.lengthSq() < 1e-8) BY.set(0, 1, 0); BY.normalize();
      BZ.set(0, 1, 0); if (Math.abs(BY.y) > 0.92) BZ.set(0, 0, 1);
      BX.crossVectors(BY, BZ).normalize(); BZ.crossVectors(BX, BY);
      if (roll) { var cr = Math.cos(roll), sr = Math.sin(roll), x = BX.clone(); BX.multiplyScalar(cr).addScaledVector(BZ, sr); BZ.multiplyScalar(cr).addScaledVector(x, -sr); }
      MB.makeBasis(BX, BY, BZ); return q.setFromRotationMatrix(MB);
    }
    // a blade that has come down stuck in the ground at p (pointing along d), quivering a moment, then lifting off and
    // fluttering away
    function stuck(h, p, d, sz) {
      var q = aim(new T.Quaternion(), d, rr(0, 6.3)), t = 0, P = p.clone(), hold = rr(0.3, 0.5), roll = rr(0, 6.3), sway = rr(0, 6.3);
      tick(function (dt) {
        t += dt; var up = Math.max(0, (t - hold) / 0.55);
        if (up <= 0) { aim(q, d, roll + Math.sin(t * 60) * 0.06 * Math.max(0, 1 - t / 0.2)); h.set(P, q, sz, 1, 2); return false; }
        P.y += dt * (0.8 + up * 1.4); P.x += Math.sin(t * 7 + sway) * dt * 0.8; roll += dt * 9;
        aim(q, V(Math.sin(t * 5 + sway) * 0.6, 1, 0.3), roll); h.set(P, q, sz * (1 - 0.3 * up), Math.max(0, 1 - up), 2);
        if (up < 1) return false; h.kill(); return true;
      });
    }
    // 나뭇잎 칼날 폭풍: the wizard spins and dark-green blade leaves, their edges gilded, are drawn in from all round and
    // whirl about the wizard in a tightening storm; then it bursts (a shock ring, the screen shakes) and the leaves fly
    // out spinning — and for each monster, nearest first, a flight of blades shoots out of the storm and cuts through it
    // crosswise (gold-green slash trails crossing on it: the hit, a jolt at the first), the blades driving on into the
    // ground beyond like thrown knives, quivering, then lifting off and fluttering away
    S.leafBlades = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('spin', c.D(0.3), c.col);
      var H = sc.heroCenter(), Hg = V(H.x, 0, H.z), GATHER = c.D(0.32), storm = [], i;
      for (i = 0; i < N(56, c); i++) storm.push({ h: P3.bm('leafBlade', { col: K.pick(BLADE) }), a: rr(0, 6.283), r0: rr(1.6, 2.7), y0: rr(0.1, 1.5), y1: rr(0.35, 1.45),
        w: rr(8, 12), sz: rr(0.4, 0.56), roll: rr(0, 6.3), P: V(), last: V(), out: null, t: 0, life: rr(0.45, 0.6) });
      var q = new T.Quaternion(), d = V(), t = 0, burst = false;
      tick(function (dt) {
        t += dt;
        var live = false;
        storm.forEach(function (L) {
          if (L.dead) return; live = true;
          L.last.copy(L.P);
          if (!burst) {
            // drawn in, whirling faster and tighter, rising and falling
            var e = easeOut(t / GATHER), r = L.r0 + (RING - L.r0) * e;
            L.a += L.w * (0.6 + e) * dt;
            L.P.set(Hg.x + Math.cos(L.a) * r, L.y0 + (L.y1 - L.y0) * e, Hg.z + Math.sin(L.a) * r * 0.8);
            d.subVectors(L.P, L.last); if (d.lengthSq() < 1e-9) d.set(-Math.sin(L.a), 0, Math.cos(L.a));
            L.h.set(L.P, aim(q, d, L.roll + t * 6), L.sz * Math.min(1, t / 0.08), Math.min(1, t / 0.06), 2);
          } else {
            // flung out from the storm, spinning, slowing, fading
            L.t += dt; L.out.multiplyScalar(1 - 1.6 * dt); L.P.addScaledVector(L.out, dt); L.roll += dt * 14;
            var f = Math.max(0, (L.t - L.life * 0.55) / (L.life * 0.45));
            L.h.set(L.P, aim(q, L.out, L.roll), L.sz, Math.max(0, 1 - f), 2);
            if (L.t >= L.life) { L.h.kill(); L.dead = true; }
          }
        });
        if (!burst && t >= GATHER) {
          burst = true;
          storm.forEach(function (L) { var tg = V(-Math.sin(L.a), 0, Math.cos(L.a)), rd = V(Math.cos(L.a), 0, Math.sin(L.a)); L.out = rd.multiplyScalar(rr(6, 9)).addScaledVector(tg, rr(3, 5)).add(V(0, rr(0.5, 2), 0)); });
          // the burst
          E({ sys: 'gnorm', pos: V(Hg.x, 0.035, Hg.z), frame: 'shock', color: 0x2f7a26, size: [0.34, 3.8], ease: 1, life: 0.42, fadeOut: 0.3, rot: 0, alpha: 0.8 }); K.gRing(Hg, GOLD, 1.7, 0.22);   // (a dark ring on the ground, no white glare)
          sc.shake(0.26); sc.climax(0.6, 0.22); sc.light(V(H.x, 0.8, H.z), 0x9fd84a, 1.6, 0.3); K.dust(Hg, N(6, c), 1.2);   // (climax: time nearly stops for a blink as it bursts)
          slashAll(c, list, Hg);
        }
        return !live;
      });
    };
    // the flights that cut every monster (nearest first): two blades cross through it leaving gold-green trails, a third
    // follows; the first to reach it is the hit
    function slashAll(c, list, Hg) {
      var d2 = function (m) { return (m.x - Hg.x) * (m.x - Hg.x) + (m.z - Hg.z) * (m.z - Hg.z); };
      list = list.slice().sort(function (a, b) { return d2(a) - d2(b); });
      var trails = 0;
      list.forEach(function (mob, i) {
        var dist = Math.sqrt(d2(mob)), delay = c.D(0.02 * i), hitDone = false;
        for (var b = 0; b < 3; b++) (function (b) {
          after(delay + c.D(b * 0.035), function () {
            var M = sc.mobPos(mob), dir = V(M.x - Hg.x, 0, M.z - Hg.z).normalize(), side = V(-dir.z, 0, dir.x), s = b === 1 ? -1 : 1;
            var S0 = V(Hg.x, 0.9, Hg.z).addScaledVector(dir, RING).addScaledVector(side, -s * 0.5);
            var cut = V(dir.x * 0.5, -0.55, dir.z * 0.5).addScaledVector(side, s * 0.75);   // across it, diagonally downward
            var ctrl = S0.clone().lerp(M, 0.5).addScaledVector(side, -s * 0.9).add(V(0, 0.5, 0));
            var h = P3.bm('leafBlade', { col: K.pick(BLADE) }), sz = (b === 2 ? 0.55 : 0.72) * (mob.boss ? 1.3 : 1), P = S0.clone(), last = S0.clone(), qq = new T.Quaternion(), dd = V(), t = 0, roll = rr(0, 6.3);
            var T1 = c.D(0.12 + dist * 0.025), T2 = c.D(0.09), E2 = null, trail = trails < 18 && b < 2 ? (trails++, K.vx.ribbon({ solid: true, mode: 'trail', w: 0.1, color: b ? GOLD : 0xc8f060, core: 0.85, alpha: 1, maxPts: 14, shrink: 45, minDist: 0.02 })) : null;
            tick(function (dt) {
              t += dt; last.copy(P);
              if (t < T1) { var u = t / T1, a = 1 - u; M = sc.mobPos(mob); P.set(a * a * S0.x + 2 * a * u * ctrl.x + u * u * (M.x - cut.x * 0.5), a * a * S0.y + 2 * a * u * ctrl.y + u * u * (M.y - cut.y * 0.5), a * a * S0.z + 2 * a * u * ctrl.z + u * u * (M.z - cut.z * 0.5)); }
              else {
                if (!E2) {
                  E2 = { from: P.clone(), to: P.clone().addScaledVector(cut, 1.6).setY(0.04) };
                  if (!hitDone) {
                    hitDone = true; var q0 = sc.mobPos(mob);
                    K.flare(q0, 0xd8f080, 0.5, 0.08); for (var f = 0; f < 3; f++) toss('leafBlade', q0, K.rdir(2.2).add(V(0, 2, 0)), rr(0.14, 0.2), K.pick(BLADE), true); K.sparks(q0, [GOLD, 0x9fe05a, 0x2f7a26], N(8, c), 4.2, { dir: cut, spread: 0.4, size: 0.13, stretch: 0.14 });
                    sc.light(q0, 0x9fd84a, 1.1, 0.22); if (!i) { sc.hitStop(0.05); sc.shake(0.18); }
                    c.hit(mob, 1, 0.9);
                  }
                }
                var v = Math.min(1, (t - T1) / T2); P.lerpVectors(E2.from, E2.to, v);
                if (v >= 1) { if (trail) trail.detach(); trail = null; stuck(h, E2.to, cut, sz); return true; }
              }
              dd.subVectors(P, last); roll += dt * 10;
              h.set(P, aim(qq, dd, roll), sz, 1, 2);
              if (trail) trail.head(P);
              return false;
            });
          });
        })(b);
      });
    }
    // ---- 세계수 열매 폭탄 (scene 4; the user's standards: impact, big and sturdy, dense detail, painted skins with a
    // thick outline) ----
    // The ground rumbles and splits behind the monsters; a world tree bursts up there — three strands twisting into its
    // trunk, great limbs spreading forward over the field, leaf masses popping out as each twig is reached — and the
    // field falls into its shade; golden fruits swell under the leaves, one for each monster; they drop one after
    // another onto the monsters and burst (the hit; a jolt at the first): golden juice, seeds, leaves, and where each
    // fell a sprout and a little flower spring up; then the tree pulls back into the ground, its leaves scattering.
    // Shapes (js/mesh-wood.js): treeTrunk (grows from its foot to its tips with k), treeClump, treeFruit, and
    // CW.TREE_TIPS (where the leaf masses sit, model units); the tree is TS times its model, its foot behind the field
    // (z -4.3) so its crown stays under the top of the screen.
    var TS = 1.3, TREE_Z = -4.0, BARKC = 0x7a5230, LEAFC = 0x3a8a2a, GOLDC = 0xe01830;
    // a sprout and a little flower where a fruit fell: two leaves opening upward, three tiny petals, then gone
    function sprout(g) {
      var ls = [P3.bm('woodLeaf', { col: 0xffffff }), P3.bm('woodLeaf', { col: 0xffffff })], ps = [0, 1, 2].map(function () { return P3.bm('trapPetal', { col: 0xff8ab0 }); });
      var qs = [aim(new T.Quaternion(), V(-0.7, 1, 0.2), 0), aim(new T.Quaternion(), V(0.7, 1, 0.2), 0)], qp = ps.map(function (h, i) { var a = i / 3 * 6.283; return aim(new T.Quaternion(), V(Math.cos(a), 0.7, Math.sin(a)), 0); });
      var t = 0, at = V(g.x, 0.02, g.z + 0.1), top = V(g.x, 0.18, g.z + 0.1), PS = V();
      tick(function (dt) {
        t += dt; var s = easeOut(t / 0.14), f = Math.max(0, (t - 0.55) / 0.3), a = Math.max(0, 1 - f);
        ls.forEach(function (h, i) { h.set(at, qs[i], 0.24 * s, a, 2); });
        ps.forEach(function (h, i) { PS.set(0.12, 0.08, 0.12).multiplyScalar(s * Math.min(1, t / 0.2)); h.set(top, qp[i], PS, a, 2); });
        if (f < 1) return false; ls.concat(ps).forEach(function (h) { h.kill(); }); return true;
      });
    }
    // a fruit bursting on a monster like a bomb (2nd, the user: "no impact — make the blasts bigger"): the great comet's
    // golden landing (P3.impact: flash, fire dome, crown of earth, rolling ring, a scorched hollow — lite for all but the
    // first few, as the meteor rain does, so a phone keeps up), golden juice, seeds, leaves, rings of shock, light
    // beat: the first fruit of its wave (the fruits fall in three waves, left to right: 쾅–쾅–쾅, 2026-11-17, the user: more
    // impact) — a short stop and a jolt on each beat
    function fruitBurst(c, p, g, first, lite, beat) {
      P3.impact(V(g.x, 0.03, g.z), { size: 0.78, col: 0xd01828, hot: 0x7a0010, ringCol: 0xff5060, dirt: new T.Color(K.dustCol()).lerp(new T.Color(0x4a382c), 0.75).getHex(), chips: 8, ring: 2.4, lite: lite, hollow: !lite, dome: false, smoke: false, paint: true });
      // the 4th fruit on (lite): its hollow, ball of fire and smoke drawn batched instead (thirteen fruits each with their
      // own 3D landing held an iPhone at 46 frames, 2026-11-17)
      // every fruit's ball of fire and smoke: the painted pictures (art/fx-fruitboom.webp — baked from the 3D landing, then
      // painted over with ComfyUI; the user picked the painted fire, 2026-11-17). The first few (not lite) add the 3D flash,
      // crown of earth, ring and hollow on top
      P3.boom(g); if (lite) K.scorch(g, 0.75, 1.6);
      K.flare(p, 0xff2a3a, 0.6, 0.1);
      // the moment it bursts: a white-hot flash, a quick white ring on the ground, sparks shooting out (all batched)
      K.flare(V(g.x, 0.5, g.z), 0xffb0b8, 2.4, 0.12, { white: true }); K.gRing(g, 0xffc0c8, 2.2, 0.2);
      K.sparks(V(g.x, 0.4, g.z), [0xffffff, 0xff3040], N(10, c), 7, { size: 0.12, stretch: 0.12, life: 0.35 });
      for (var j = 0; j < N(12, c); j++) E({ pos: p.clone().add(K.rdir(0.2)), vel: K.rdir(3.4).add(V(0, 2.6, 0)), frame: 'dot', color: K.pick([0xff3040, 0x7a0010, 0xff8090]), size: [rr(0.08, 0.13), 0.03], life: rr(0.45, 0.7), grav: 8, drag: 0.8 });
      for (var s = 0; s < N(5, c); s++) E({ pos: p.clone(), vel: K.rdir(2.6).add(V(0, 2.2, 0)), frame: 'dot', color: 0x3a2008, size: [0.07, 0.05], life: rr(0.5, 0.7), grav: 9, drag: 0.6 });
      for (var l = 0; l < N(2, c); l++) toss('woodLeaf', p, K.rdir(2.5).add(V(0, 2, 0)), rr(0.12, 0.17), 0xffffff, true);
      K.gRing(g, GOLDC, 1.4, 0.3);
      E({ sys: 'gnorm', pos: V(g.x, 0.035, g.z), frame: 'shock', color: 0x3a0010, size: [0.3, 2.2], ease: 1, life: 0.38, fadeOut: 0.3, rot: 0, alpha: 0.7 });
      K.dust(g, N(3, c), 0.9); sc.light(p, 0xff2030, 1.3, 0.25);
      // no shaking (2026-11-17, the user: "take the shaking out") — the beat is a short stop and a flash of light
      if (first) { sc.hitStop(0.08); sc.flash('rgba(255,40,60,0.22)', 0.12); }
      else if (beat) sc.hitStop(0.05);
      after(c.D(0.15), function () { sprout(g); });
    }
    // the extra fruits' burst: showy but light — the painted ball of fire (smaller), a white-hot flash, a gold ring and
    // a star of sparks, all batched; no 3D landing, no light, no sprout, no shaking
    function miniBurst(c, p, g) {
      P3.boom(g, 0.75);
      K.flare(V(g.x, 0.45, g.z), 0xffb0b8, 1.7, 0.1, { white: true }); K.gRing(g, 0xff5060, 1.6, 0.22); K.gRing(g, GOLDC, 1, 0.3);
      K.sparks(V(g.x, 0.35, g.z), [0xffffff, 0xff3040, 0x7a0010], N(12, c), 7, { size: 0.11, stretch: 0.14, life: 0.32 });
      for (var j = 0; j < N(6, c); j++) E({ pos: p.clone().add(K.rdir(0.15)), vel: K.rdir(3).add(V(0, 2.4, 0)), frame: 'dot', color: K.pick([0xff3040, 0xff8090]), size: [rr(0.07, 0.11), 0.03], life: rr(0.4, 0.6), grav: 8, drag: 0.8 });
    }
    // the great fruit from the top of the crown landing in the middle of them all: the biggest golden blast, time all but
    // stopping, the screen shaking hard, a ring of sprouts
    function greatBurst(c, p, g) {
      P3.impact(V(g.x, 0.03, g.z), { size: 1.7, col: 0xc81020, hot: 0x7a0010, ringCol: 0xff8090, dirt: new T.Color(K.dustCol()).lerp(new T.Color(0x4a382c), 0.75).getHex(), chips: 22, ring: 4.4, dome: false, smoke: false, paint: true }); P3.boom(g, 2.2);   // (its ball of fire: the painted one, big)
      E({ sys: 'gnorm', pos: V(g.x, 0.035, g.z), frame: 'shock', color: 0x3a0010, size: [0.4, 5.2], ease: 1, life: 0.5, fadeOut: 0.35, rot: 0, alpha: 0.75 }); K.gRing(g, GOLDC, 3.6, 0.4);
      for (var j = 0; j < N(26, c); j++) E({ pos: p.clone().add(K.rdir(0.4)), vel: K.rdir(5).add(V(0, 3.4, 0)), frame: 'dot', color: K.pick([0xff3040, 0x7a0010, 0xff8090]), size: [rr(0.1, 0.16), 0.03], life: rr(0.5, 0.8), grav: 8, drag: 0.7 });
      for (var s = 0; s < N(10, c); s++) E({ pos: p.clone(), vel: K.rdir(3.6).add(V(0, 2.8, 0)), frame: 'dot', color: 0x3a2008, size: [0.08, 0.05], life: rr(0.5, 0.8), grav: 9, drag: 0.6 });
      for (var l = 0; l < N(8, c); l++) toss('woodLeaf', p, K.rdir(3.5).add(V(0, 2.5, 0)), rr(0.14, 0.2), 0xffffff, true);
      K.dust(g, N(8, c), 1.6); sc.light(p, 0xff2030, 2.2, 0.35);
      if (!(CW.fxOff && CW.fxOff.dim)) sc.climax(0.6, 0.24); sc.hitStop(0.14); sc.flash('rgba(255,50,70,0.3)', 0.2);
      K.flare(V(g.x, 0.8, g.z), 0xffffff, 2.6, 0.18, { white: true }); K.gRing(g, 0xffffff, 5, 0.3); K.sparks(V(g.x, 0.6, g.z), [0xffffff, 0xff3040], N(24, c), 10, { size: 0.16, stretch: 0.16, life: 0.45 });
      for (var k = 0; k < 5; k++) { var a = k / 5 * 6.283; after(c.D(0.15 + k * 0.03), (function (q) { return function () { sprout(q); }; })(V(g.x + Math.cos(a) * 1.3, 0, g.z + Math.sin(a) * 0.9))); }
    }
    // ---- painted pictures with light (2026-11-17, the user: 1+2 — the icon's painting standing like the monsters, wrapped
    // in light like the other skills) ----
    // woodPic(name, cx, cy): a camera-facing painted picture (art/<name>.webp) and an additive copy of it on top for its
    // light; cx, cy: the picture's pivot (0..1 from its bottom left). set(pos, w, h, alpha, glow, rot); kill()
    var wpTex = {};
    function wpLoad(name) {
      if (wpTex[name] !== undefined) return wpTex[name];
      wpTex[name] = null;
      new T.TextureLoader().load((CW.ART_BASE || 'art/') + name + '.webp', function (t) { if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; wpTex[name] = t; }, undefined, function () { });
      return null;
    }
    ['wt-tree', 'wt-fruit-red', 'wt-trap-upper', 'wt-trap-lower', 'wt-root', 'wt-spikes'].forEach(function (n) { if (!CW.FRIEND) wpLoad(n); });
    // every painted piece on the field (woodPic, liveSheet) until it is killed: fx.clear() (a boss, a dungeon, the app
    // put away…) stops the ticks that would kill them, so they are taken off here — before 2026-11-18 they stayed on the
    // field frozen and were drawn for good (one 뿌리 가시 left ~220 draw calls and 26만 triangles behind: 발열)
    var LIVE = [];
    function track(h) { LIVE.push(h); var k0 = h.kill; h.kill = function () { var i = LIVE.indexOf(h); if (i >= 0) LIVE.splice(i, 1); k0(); }; return h; }
    function woodPic(name, cx, cy, order, tint) {
      var tex = wpLoad(name), parts = [];
      function make(add) {
        var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: !add, alphaTest: add ? 0 : 0.06, depthTest: true, opacity: 0, blending: add ? T.AdditiveBlending : T.NormalBlending, color: add ? (tint || 0xffd870) : 0xffffff }));   // (the painting writes depth: a monster behind it stays behind it)
        sp.center.set(cx, cy); sp.renderOrder = (order || 2) + (add ? 0.05 : 0); (sc.fxGroup || sc.scene).add(sp); parts.push(sp); return sp;
      }
      var a = tex ? make(false) : null, g = tex ? make(true) : null;
      return track({
        ok: !!tex,
        set: function (pos, w, h, alpha, glow, rot) {
          if (!a) return;
          a.position.copy(pos); g.position.copy(pos); a.scale.set(w, h, 1); g.scale.set(w * 1.03, h * 1.03, 1);
          a.material.opacity = Math.max(0, Math.min(1, alpha)); g.material.opacity = Math.max(0, Math.min(1, glow));
          a.material.rotation = g.material.rotation = rot || 0;
        },
        kill: function () { parts.forEach(function (sp) { if (sp.parent) sp.parent.remove(sp); sp.material.dispose(); }); parts.length = 0; a = g = null; }
      });
    }
    // ---- living painted sheets, the phoenix's way (2026-11-17, the user: "불사조처럼 바꾸자" — js/fx-beasts.js: a painted
    // picture moved as a cut-out looked pasted on; the phoenix lives because its picture bends, light runs through it,
    // its outline glows and it leaves light on the ground) ----
    // liveSheet(name, cx, cy, order, tint): a painted picture on a bendable sheet facing the camera, its pivot (cx, cy:
    // 0..1 from its bottom left) at pos. Each frame: set(pos, w, h, rot, U) — U: bend (the top swings sideways), wig/wigF/
    // wigS (an S-wave running up it), flut (the upper part flutters, leaves), flow (light running up through it), edge
    // (a glow along its outline), grow (0..1: it is there only up to that height, a bright front where it grows), flash,
    // alpha. offsetAt(yn, U, t) → the sideways shift (sheet units) of the height yn, so parts can ride on it (the jaws
    // on the neck's top).
    var LS_GL = 'float lh3(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}' +
      'float ln3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(lh3(i),lh3(i+vec3(1,0,0)),f.x),mix(lh3(i+vec3(0,1,0)),lh3(i+vec3(1,1,0)),f.x),f.y),mix(mix(lh3(i+vec3(0,0,1)),lh3(i+vec3(1,0,1)),f.x),mix(lh3(i+vec3(0,1,1)),lh3(i+vec3(1,1,1)),f.x),f.y),f.z);}' +
      'float lfbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*ln3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}';
    var LS_VS = 'uniform vec2 uC;uniform float uTime,uBend,uWig,uWigF,uWigS,uFlut;varying vec2 vUv;varying float vYn;varying float vWy;' +
      'void main(){vUv=uv;vec3 p=position;float yn=p.y+uC.y,xn=p.x+uC.x;vYn=yn;' +
      'p.x+=uBend*yn*yn+uWig*sin(yn*uWigF-uTime*uWigS)*yn;' +
      'float fm=smoothstep(0.42,0.8,yn);p.x+=uFlut*fm*(sin(uTime*3.1+xn*7.0+yn*5.0)+0.5*sin(uTime*5.3+xn*13.0));p.y+=uFlut*0.6*fm*sin(uTime*2.3+xn*9.0);' +
      'vWy=(modelMatrix*vec4(p,1.0)).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}';
    var LS_FS = LS_GL + 'uniform sampler2D map;uniform vec3 uTint;uniform vec3 uDark;uniform float uTime,uAlpha,uFlow,uEdge,uGrow,uFlash,uSpirit,uFloor;varying vec2 vUv;varying float vYn;varying float vWy;' +
      // (발열, 2026-11-18: the empty part of the sheet — most of it — is thrown away first, before any noise; the floor's
      // ragged edge only when a floor is set: the same picture, a fraction of the work on a phone's graphics chip)
      'void main(){if(vYn>uGrow)discard;vec4 t=texture2D(map,vUv);float A=t.a*uAlpha;if(A<0.05)discard;float fl=uFloor<-100.0?-1e4:uFloor+(ln3(vec3(vUv.x*14.0,1.7,uFloor))-0.5)*0.14;if(vWy<fl)discard;vec3 c=t.rgb;' +
      'float lum=dot(c,vec3(0.3,0.59,0.11));' +
      // light running up through it, strongest in its bright parts
      'float n=lfbm(vec3(vUv.x*4.0,vUv.y*5.0-uTime*1.6,uTime*0.3));float band=smoothstep(0.58,0.86,n);c+=uTint*band*uFlow*(0.35+0.9*lum);' +
      // a glow along its outline
      'float o=0.008;float am=min(min(texture2D(map,vUv+vec2(o,0.0)).a,texture2D(map,vUv-vec2(o,0.0)).a),min(texture2D(map,vUv+vec2(0.0,o)).a,texture2D(map,vUv-vec2(0.0,o)).a));' +
      'c+=uTint*clamp(t.a-am,0.0,1.0)*(0.5+0.9*n)*uEdge;' +
      // the growing front
      'c=mix(c,uTint*1.3+0.2,smoothstep(0.06,0.0,uGrow-vYn)*step(uGrow,0.999)*0.85);' +
      'c+=uTint*uFlash*0.55;' +
      // spirit: a shape of light — its tint, white-hot where the painting is bright, flickering
      // spirit 2 (2026-11-17, the user: 무섭게): a dark body (uDark, lighter where the painting is light) with a burning outline (uTint)
      'if(uSpirit>1.5){float L=dot(t.rgb,vec3(0.3,0.59,0.11));c=uDark*(0.4+1.5*L)+uTint*clamp(t.a-am,0.0,1.0)*2.2*(0.6+0.6*n)+uTint*band*0.3+(uDark*1.8+vec3(0.25,0.0,0.02))*uFlash;A*=0.95;}else ' +
      'if(uSpirit>0.5){float L=dot(t.rgb,vec3(0.3,0.59,0.11));c=uTint*(0.35+1.1*L)+vec3(0.9)*smoothstep(0.7,1.0,L)*0.5+uTint*band*0.6;A*=0.55+0.45*n;}' +
      'c*=0.25+0.75*smoothstep(0.0,0.2,vWy-fl);gl_FragColor=vec4(min(c,vec3(1.0)),A);}';
    // a soft halo round it (a second, larger sheet: the picture's blurred outline, rippling)
    var LS_AURA = LS_GL + 'uniform sampler2D map;uniform vec3 uTint;uniform vec2 uC;uniform float uTime,uAlpha,uEdge,uGrow,uK,uFloor;varying vec2 vUv;varying float vYn;varying float vWy;' +
      'void main(){if(vYn>uGrow||uAlpha*uEdge<0.008)discard;float fl=uFloor<-100.0?-1e4:uFloor+(ln3(vec3(vUv.x*14.0,1.7,uFloor))-0.5)*0.14;if(vWy<fl+0.04)discard;vec2 uv=uC+(vUv-uC)*uK;float n=lfbm(vec3(vUv*vec2(6.0,7.0)+vec2(0.0,-uTime*1.5),uTime*0.5));uv+=vec2((n-0.5)*0.02,-n*0.02);' +
      'float a=0.0;for(int i=0;i<8;i++){float g=float(i)*0.785;vec2 q=uv+vec2(cos(g),sin(g))*0.03;a+=(q.x<0.0||q.y<0.0||q.x>1.0||q.y>1.0)?0.0:texture2D(map,q).a;}' +
      'a*=0.125;vec2 u0=uC+(vUv-uC)*uK;float inside=(u0.x<0.0||u0.y<0.0||u0.x>1.0||u0.y>1.0)?0.0:texture2D(map,u0).a;a*=1.0-0.9*inside;float f=a*(0.3+0.9*n)*uEdge*uAlpha;if(f<0.01)discard;gl_FragColor=vec4(uTint*(0.7+0.5*n),min(1.0,f*0.9));}';
    var lsGeo = {};
    function lsGeometry(cx, cy, n) {
      var key = cx + ',' + cy; if (lsGeo[key]) return lsGeo[key];
      var pos = [], uv = [], idx = [];
      for (var j = 0; j <= n; j++) for (var i = 0; i <= n; i++) { var u = i / n, v = j / n; pos.push(u - cx, v - cy, 0); uv.push(u, v); }
      for (var b = 0; b < n; b++) for (var a = 0; a < n; a++) { var k = b * (n + 1) + a; idx.push(k, k + 1, k + n + 1, k + 1, k + n + 2, k + n + 1); }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      return (lsGeo[key] = g);
    }
    var LSQ = new T.Quaternion(), LSZ = new T.Vector3(0, 0, 1);
    function liveSheet(name, cx, cy, order, tint, spirit, dark) {
      var tex = wpLoad(name); if (!tex) return { ok: false, set: function () {}, kill: function () {} };
      var col = new T.Color(tint || 0xb8ff80);
      function mats(fs, add) {
        add = add || spirit === 1 || spirit === true;
        return new T.ShaderMaterial({ vertexShader: LS_VS, fragmentShader: fs, transparent: true, depthWrite: !add && !spirit, depthTest: !spirit, side: T.DoubleSide, blending: add ? T.AdditiveBlending : T.NormalBlending,
          uniforms: { map: { value: tex }, uC: { value: new T.Vector2(cx, cy) }, uTint: { value: col }, uTime: { value: 0 }, uBend: { value: 0 }, uWig: { value: 0 }, uWigF: { value: 9 }, uWigS: { value: 6 }, uFlut: { value: 0 }, uFlow: { value: 0 }, uEdge: { value: 0 }, uGrow: { value: 2 }, uFlash: { value: 0 }, uAlpha: { value: 0 }, uK: { value: 1.12 }, uFloor: { value: -1e4 }, uSpirit: { value: spirit === 2 ? 2 : spirit ? 1 : 0 }, uDark: { value: new T.Color(dark || 0x000000) } } });
      }
      var geo = lsGeometry(cx, cy, 16), body = new T.Mesh(geo, mats(LS_FS, false)), aura = new T.Mesh(geo, mats(LS_AURA, true));
      body.renderOrder = order; aura.renderOrder = order + 0.05; body.frustumCulled = aura.frustumCulled = false;
      var grp = sc.fxGroup || sc.scene; grp.add(aura); grp.add(body);
      var t0 = 0;
      return track({
        ok: true,
        set: function (pos, w, h, rot, U, dt) {
          t0 += dt || 0.016; U = U || {};
          LSQ.copy(sc.camera.quaternion).multiply(new T.Quaternion().setFromAxisAngle(LSZ, rot || 0));
          [body, aura].forEach(function (m, i) {
            m.position.copy(pos); m.quaternion.copy(LSQ); m.scale.set(w * (i ? 1.12 : 1), h * (i ? 1.12 : 1), 1);
            var u = m.material.uniforms; u.uTime.value = t0;
            u.uBend.value = U.bend || 0; u.uWig.value = U.wig || 0; u.uWigF.value = U.wigF || 9; u.uWigS.value = U.wigS || 6; u.uFlut.value = U.flut || 0;
            u.uFlow.value = U.flow || 0; u.uEdge.value = U.edge === undefined ? 0.6 : U.edge; u.uGrow.value = U.grow === undefined ? 2 : U.grow; u.uFlash.value = U.flash || 0; u.uAlpha.value = U.alpha === undefined ? 1 : U.alpha; u.uFloor.value = U.floor === undefined ? -1e4 : U.floor;
          });
          aura.position.z -= 0.001;
          // not drawn at all while nothing of it would show (a claw still under the ground, a halo turned off)
          var al = U.alpha === undefined ? 1 : U.alpha; body.visible = al >= 0.05; aura.visible = al * (U.edge === undefined ? 0.6 : U.edge) >= 0.008;
        },
        time: function () { return t0; },
        kill: function () { [body, aura].forEach(function (m) { if (m.parent) m.parent.remove(m); m.material.dispose(); }); }
      });
    }
    // a falling fruit as a painted picture, with the same set/kill as the 3D one (pos, q, size)
    function fruitPic() {
      var P = woodPic('wt-fruit-red', 0.5, 0.5, 6.7, 0xff2030), t0 = 0;
      if (!P.ok) return P3.bm('treeFruit', { col: GOLDC });
      return { set: function (pos, q, sz) { t0 += 1; P.set(pos, sz * 2.3, sz * 2.3, 1, 0.35 + 0.25 * Math.sin(t0 * 0.7)); }, kill: P.kill };
    }
    S.worldTree = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('raise', c.D(0.14), c.col);
      if (!(CW.fxOff && CW.fxOff.dim)) sc.dim(0.26, c.D(1.4));
      var base = V(Math.max(-1, Math.min(1, c.center.x * 0.5)), 0, TREE_Z), qT = yawQ(rr(-0.12, 0.12), -0.32);   // (leaning back a little: the high camera sees its trunk and the front of its crown, the icon's view — 2026-11-17)
      // (2026-11-17) the icon's tree as a painting standing behind the field (its foot at the bottom middle), growing up
      // out of a pillar of golden light; its painted fruits are where the real ones drop from. Falls back to the 3D tree
      // while the painting has not loaded
      var pic = liveSheet('wt-tree', 0.5, 0.02, 2.2, 0xff1a2e, 2, 0x2a0a3a), PH = 3.4, PW = PH * 1190 / 1239, UT = {};   // (the GPT tree, art/wt-tree.webp: its roots at the bottom)
      var camR = V(1, 0, 0).applyQuaternion(sc.camera.quaternion), camU = V(0, 1, 0).applyQuaternion(sc.camera.quaternion);
      var trunk = pic.ok ? { set: function () {}, kill: function () {} } : P3.bm('treeTrunk', { col: BARKC });
      var NOH = { set: function () {}, kill: function () {} };
      var tips = pic.ok ? [[0.658, 0.656], [0.395, 0.678], [0.183, 0.627], [0.701, 0.794], [0.875, 0.614], [0.753, 0.519], [0.14, 0.533], [0.307, 0.755]].map(function (f) {
        var u = f[0] - 0.5, v = f[1];   // the painted fruits (fractions of the picture)
        return { p: base.clone().addScaledVector(camR, u * PW).addScaledVector(camU, v * PH).add(V(0, 0, 0.3)), r: 0.12, at: Math.min(0.97, v * 0.9 + 0.08), h: NOH, q: yawQ(0), pop: -1 };
      }) : (CW.TREE_TIPS || []).map(function (tp) {
        return { p: V(tp[0], tp[1], tp[2]).applyQuaternion(qT).multiplyScalar(TS).add(base), r: tp[3] * TS, at: tp[4], h: CW.fxOff && CW.fxOff.crown ? { set: function () {}, kill: function () {} } : P3.bm('treeClump', { col: LEAFC }), q: yawQ(rr(0, 6.3)), pop: -1 };
      });
      // the light it comes up in: a golden pillar and glow on the ground
      E({ pos: base.clone().add(V(0, 1.2, 0.3)), frame: 'glow', color: 0xff5060, size: [1.2, 4.2], life: 0.5, alpha: 0.7 });
      E({ sys: 'gnorm', pos: V(base.x, 0.03, base.z + 0.3), frame: 'glow', color: 0xff2a3a, size: [0.8, 3.6], ease: 1, life: 0.7, alpha: 0.55, fadeOut: 0.4 });
      sc.light(base.clone().add(V(0, 1, 0.5)), 0xff2a3a, 1.6, 0.5);
      var flashT = -9;
      if (pic.ok) E({ sys: 'gnorm', pos: V(base.x, 0.02, base.z + 0.2), frame: 'glow', color: 0x000000, size: [1.4, 2.4], ease: 1, life: c.D(1.62), alpha: 0.5, fadeIn: 0.15, fadeOut: 0.3 });
      // the rumble: the ground splits and heaves where it comes up
      E({ sys: 'gnorm', pos: V(base.x, 0.026, base.z + 0.3), frame: 'smoke', color: 0x1a0e08, size: [0.6, 3.4], ease: 1, life: 1.8, alpha: 0.55, fadeIn: 0.05, fadeOut: 0.5 });
      for (var m = 0; m < 6; m++) { var a = m / 6 * 6.283; heave(V(base.x + Math.cos(a) * 1.1, 0, base.z + Math.sin(a) * 0.7), a, 0.5, c.D(0.6), earthCol()); }
      K.dust(base, N(8, c), 1.8); splinters(V(base.x, 0.3, base.z), N(6, c), 3.5);
      var GROW = c.D(0.34), FRUIT = c.D(0.42), DROP = c.D(0.54), GONE = c.D(1.22), OUT = c.D(0.4), t = 0, S3 = V(), first = true;
      // one fruit for each monster, hanging under the leaf masses (spread left to right as the monsters are)
      var mobs = list.slice().sort(function (p, q) { return p.x - q.x; }), anchors = tips.slice().sort(function (p, q) { return p.p.x - q.p.x; }), n = mobs.length;
      var fruits = mobs.map(function (mob, i) {
        var A = anchors[Math.round((n > 1 ? i / (n - 1) : 0.5) * (anchors.length - 1))] || { p: V(base.x, 3, base.z + 1.5), r: 0.5 };
        return { mob: mob, h: null, hang: A.p.clone().add(V(rr(-0.5, 0.5) * A.r, rr(-0.45, 0.1) * A.r, rr(0.75, 0.95) * A.r)), sz: rr(0.2, 0.24), wave: n > 2 ? Math.min(2, Math.floor(i * 3 / n)) : 0, rel: DROP + c.D(0.14 * (n > 2 ? Math.min(2, Math.floor(i * 3 / n)) : 0) + rr(0, 0.035)), fly: c.D(0.2), q: new T.Quaternion(), spin: K.rdir(1).normalize(), done: false };
      });
      // more fruits (2026-11-17, the user: "more fruit falling" → "real damage, right on the monsters" → "no shaking, more
      // hits, more falling, flashier, but no extra load"): one more for every monster (at least 3, at most 8), spread over
      // them, each falling right onto its monster (followed to where it stands as it lands) just after that monster's own
      // fruit, and hitting it. A monster's 60% is shared between all the fruits that fall on it, so the skill's whole
      // damage stays the same. Their burst is a small one made only of batched pieces (miniBurst), so the load stays low
      var nx = Math.min(8, Math.max(3, n)), per = mobs.map(function () { return 1; });
      for (var e = 0; e < nx; e++) {
        var mi = Math.min(n - 1, Math.floor((e + 0.5) * n / nx)), A2 = anchors[Math.floor(rr(0, anchors.length))] || { p: V(base.x, 3, base.z + 1.5), r: 0.5 }, F0 = fruits[mi];
        per[mi]++;
        fruits.push({ mob: mobs[mi], mi: mi, extra: true, h: null, hang: A2.p.clone().add(V(rr(-0.55, 0.55) * A2.r, rr(-0.45, 0.1) * A2.r, rr(0.75, 0.95) * A2.r)), sz: rr(0.18, 0.22), wave: F0.wave, rel: F0.rel + c.D(0.06 * (per[mi] - 1)), fly: c.D(0.18), q: new T.Quaternion(), spin: K.rdir(1).normalize(), done: false });
      }
      fruits.forEach(function (F, i) { F.frac = 0.6 / per[F.extra ? F.mi : i]; });
      // and the great fruit, swelling at the top of the crown, last to fall: into the middle of them all
      var top = tips.reduce(function (b2, T2) { return !b2 || T2.p.y > b2.p.y ? T2 : b2; }, null) || { p: V(base.x, 3, base.z), r: 0.6 };
      // (2026-11-17, 유성우처럼) the fruits come down out of the sky like meteors, onto the monsters
      if (pic.ok) fruits.forEach(function (F) { F.hang = sc.mobPos(F.mob).clone().add(V(rr(-1.4, 1.4), rr(5.5, 7), rr(-1.6, -0.6))); F.fly = c.D(0.24); });
      var great = { h: null, hang: pic.ok ? V(c.center.x + rr(-0.5, 0.5), 7.5, c.center.z - 1.2) : top.p.clone().add(V(0, -0.1 * top.r, 0.95 * top.r)), sz: 0.48, rel: c.D(1.0), fly: c.D(0.14), q: new T.Quaternion(), done: false };
      // how many fruits land as real 3D (the rest play the baked pictures): more while the phone keeps up, fewer when
      // the safety valve (js/fxload.js) has had to ease off — so a phone that has warmed up draws less (2026-11-17)
      var ld = K.load ? K.load() : 1, full = ld >= 0.99 ? 4 : ld >= 0.9 ? 3 : ld >= 0.8 ? 2 : 1;
      var R = new T.Quaternion(), P = V(), fell = 0, beat = [false, false, false];
      tick(function (dt) {
        t += dt;
        var grow = easeOut(t / GROW), gone = Math.max(0, (t - GONE) / OUT), k = Math.max(0.001, grow * (1 - gone));
        S3.setScalar(TS * (0.85 + 0.15 * grow));
        trunk.set(base, qT, S3, 1 - gone * gone, k);
        if (pic.ok) {
          // grows up out of the ground (the picture there up to a rising front of golden light — never stretched), the trunk
          // writhing as it reaches; then the crown sways in the wind, gold runs up the trunk into the fruit, its outline
          // shimmers; it flashes as each fruit bursts and goes up in light at the end
          var gr = t < GROW ? easeOut(t / GROW) : 1, fl = Math.max(0, 1 - (t - flashT) / 0.18);
          UT.grow = Math.min(2, gr * 1.1); UT.wig = 0.035 * (1 - gr) + 0.006; UT.wigF = 7; UT.wigS = 8;
          UT.bend = 0.025 * Math.sin(t * 1.7); UT.flut = 0.006 + 0.004 * Math.sin(t * 0.9);
          UT.flow = 0.45 + 0.4 * fl; UT.edge = 0.5 + 0.6 * (1 - gr) + 0.5 * fl + 1.2 * gone; UT.flash = 0.35 * fl + 0.6 * gone; UT.alpha = 0.9 * (1 - gone * gone);   // (a shape of golden light behind the field, 2026-11-17 유성우처럼)
          var f = 1 + 0.05 * Math.sin(Math.min(1, Math.max(0, (t - GROW * 0.85) / c.D(0.16))) * Math.PI);
          pic.set(base, PW * f, PH * f * (1 + 0.1 * gone), 0, UT, dt);
          if (gone > 0 && Math.random() < dt * 40) E({ pos: base.clone().addScaledVector(camR, rr(-0.45, 0.45) * PW).addScaledVector(camU, rr(0.2, 0.95) * PH), vel: V(rr(-0.4, 0.4), rr(0.6, 1.6), 0), frame: 'glow', color: [0xff5060, 0x9a40ff], size: [0.35, 0.05], life: rr(0.4, 0.7), alpha: 0.8 });
          // leaves and golden pollen drifting off the crown while it stands
          if (gr > 0.9 && gone === 0 && Math.random() < dt * 14) E({ pos: base.clone().addScaledVector(camR, rr(-0.42, 0.42) * PW).addScaledVector(camU, rr(0.5, 0.95) * PH), vel: V(rr(-0.5, 0.5), rr(-0.4, 0.4), 0), frame: 'glow', color: [0xff5060, 0x9a40ff], size: [0.14, 0.04], life: rr(0.6, 1.0), alpha: 0.85 });
        }
        tips.forEach(function (T2) {
          if (T2.pop < 0 && grow >= T2.at * 0.97) { T2.pop = t; for (var l = 0; l < N(2, c); l++) toss('woodLeaf', T2.p, K.rdir(2).add(V(0, 1.5, 0)), rr(0.12, 0.18), 0xffffff, true); }
          if (T2.pop < 0) return;
          var u = (t - T2.pop) / 0.14, s = u < 1 ? easeOut(u) * 1.15 : 1.15 - 0.15 * Math.min(1, (u - 1) / 0.6);   // pops out, a little too big, settles
          if (gone > 0 && !T2.burst) { T2.burst = true; for (var j = 0; j < N(3, c); j++) toss('woodLeaf', T2.p.clone().add(K.rdir(T2.r * 0.6)), K.rdir(2.4).add(V(0, 1, 0)), rr(0.12, 0.2), 0xffffff, true); }
          T2.h.set(T2.p, T2.q, T2.r * Math.max(0.001, s * (1 - gone)), 1, 2);
        });
        fruits.forEach(function (F, i) {
          if (F.done || t < FRUIT) return;
          if (!F.h) { F.h = pic.ok ? fruitPic() : P3.bm('treeFruit', { col: GOLDC }); E({ pos: F.hang.clone(), frame: 'glow', color: 0xff2a3a, size: [0.2, 0.9], life: 0.3, alpha: 0.5 }); }
          if (t < F.rel) {   // swelling under the leaves, glowing a little, swaying
            var sw = easeOut((t - FRUIT) / c.D(0.1)) * (1 + 0.05 * Math.sin(t * 22 + i));
            F.q.setFromAxisAngle(RZ, Math.sin(t * 6 + i) * 0.15); F.h.set(F.hang, F.q, pic.ok ? 0.001 : F.sz * sw, 1, 2); return;   // (from the sky: unseen until it falls)
          }
          var u = Math.min(1, (t - F.rel) / F.fly), to = sc.mobPos(F.mob);
          P.lerpVectors(F.hang, to, u * u); P.y += Math.sin(u * Math.PI) * 0.4;   // dropping, falling faster
          F.q.multiply(R.setFromAxisAngle(F.spin, dt * 12)); F.h.set(P, F.q, F.sz, 1, 2);
          if (Math.random() < dt * (pic.ok ? 90 : 30)) E({ pos: P.clone(), frame: 'glow', color: [0xff2a3a, 0xff8090], size: [pic.ok ? 0.55 : 0.35, 0.1], life: pic.ok ? 0.3 : 0.22, alpha: 0.6 });   // a golden streak behind it (a meteor's tail)
          if (u < 1) return;
          F.done = true; F.h.kill(); flashT = t;
          if (F.extra) miniBurst(c, to, V(to.x, 0, to.z));
          else { fruitBurst(c, to, gp(F.mob), first, fell++ >= full, !beat[F.wave]); beat[F.wave] = true; first = false; }
          c.hit(F.mob, F.frac, 1.2);   // its fruits: 60% between them (the great fruit brings the rest)
        });
        if (!great.done && t >= FRUIT) {
          if (!great.h) great.h = pic.ok ? fruitPic() : P3.bm('treeFruit', { col: GOLDC });
          if (t < great.rel) {   // swelling at the top, throbbing faster as it ripens, glowing
            var gs = easeOut((t - FRUIT) / c.D(0.25)) * (1 + 0.08 * Math.sin(t * (20 + 30 * (t - FRUIT)))); great.q.setFromAxisAngle(RZ, Math.sin(t * 5) * 0.1);
            great.h.set(great.hang, great.q, pic.ok ? 0.001 : great.sz * gs, 1, 2);
            if (!pic.ok && Math.random() < dt * 10) E({ pos: great.hang.clone(), frame: 'glow', color: 0xff2a3a, size: [0.6, 1.4], life: 0.25, alpha: 0.35 });
          } else {
            var gu = Math.min(1, (t - great.rel) / great.fly), gto = V(c.center.x, 0.45, c.center.z);
            P.lerpVectors(great.hang, gto, gu * gu); great.q.multiply(R.setFromAxisAngle(UP, dt * 8)); great.h.set(P, great.q, great.sz, 1, 2);
            if (gu >= 1) {
              great.done = true; great.h.kill(); greatBurst(c, gto, V(gto.x, 0, gto.z));
              c.pool().forEach(function (m) { c.hit(m, 0.4, 2.2); });   // the rest of the damage, every monster on the field
            }
          }
        }
        if (t < GONE + OUT) return false;
        trunk.kill(); pic.kill(); tips.forEach(function (T2) { T2.h.kill(); }); fruits.forEach(function (F) { if (F.h && !F.done) F.h.kill(); }); if (great.h && !great.done) great.h.kill();
        return true;
      });
    };
    return { clear: function () { LIVE.slice().forEach(function (h) { h.kill(); }); LIVE.length = 0; } };
  };
})(this);
