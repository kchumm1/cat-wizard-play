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
        // (2026-11-23) the roots go for the monsters on the field as they leave the ground, not those at the cast
        var now = c.pool(); if (now.length) list = now; else if (!list.some(function (m) { return m.alive; })) { c.recover(); return; }
        list = list.slice().sort(function (a, b) { return d2(a) - d2(b); });
        var n = list.length, late = n;
        list.forEach(function (mob, i) { root(mob, i, c.D(0.22 + 0.36 * (n > 1 ? i / (n - 1) : 0))); });
        // one that walks in while the roots are still running under the ground gets its own (a quick one)
        K.lateComers(c, list.slice(), c.D(0.58), function (m) { root(m, late++, c.D(0.26)); });
        function root(mob, i, run) {
          var t = 0, done = 0, head = P3.bm('woodMound', { col: col }), yaw = 0;
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
        }
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

    // 수호목의 흰 울림. Keep the saved skill key and cast through the normal damage queue.
    var RZ = V(0, 0, 1), guardianQuad, guardianTree, guardianArc, guardianContacts;
    // The ground patch and the painting share one draw. Sole and root coordinates are in the
    // original 384px pose tiles. The raised foreleg in the walking pose has no contact mark.
    function guardianGroundMap() {
      var canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 192;
      var ctx = canvas.getContext('2d');
      var soles = [
        [[79,364,24],[136,357,17],[229,356,20],[194,372,27]],
        [[59,372,26],[178,358,22]],
        [[58,347,25],[131,331,20],[306,345,28],[173,372,31]],
        [[48,349,27],[99,371,26],[155,358,22],[222,371,39],[264,356,28],[309,344,26]]
      ];
      // Bottom edge of the approved tree tile, sampled every four pixels. Also masks the buried tips.
      var rootEdge=[0,0,0,0,0,0,0,344,344,343,343,349,349,349,349,350,350,348,342,342,367,367,367,367,368,369,369,368,366,362,358,356,354,354,354,354,355,355,355,355,356,356,349,347,347,370,370,369,369,368,367,366,366,367,369,370,372,372,371,371,370,356,356,356,356,356,356,357,358,358,342,342,343,345,346,347,347,347,346,344,343,342,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      function pool(x,y,rx,ry,color) {
        ctx.save(); ctx.translate(x,y); ctx.scale(rx,ry);
        var g=ctx.createRadialGradient(0,0,.15,0,0,1);
        g.addColorStop(0,color); g.addColorStop(.6,'rgba(63,43,41,.25)');
        g.addColorStop(1,'rgba(50,32,37,0)'); ctx.fillStyle=g; ctx.fillRect(-1,-1,2,2); ctx.restore();
      }
      soles.forEach(function (feet, pose) {
        var tree = pose === 3;
        ctx.save(); ctx.translate((pose%2)*256,Math.floor(pose/2)*96);
        ctx.beginPath(); ctx.rect(0,0,256,96); ctx.clip();
        // Local canvas covers atlas pixels (-32, 254) through (416, 411).
        ctx.scale(256/448,96/157); ctx.translate(32,-254);
        pool(tree?181:173,tree?345:339,tree?202:165,tree?40:36,'rgba(60,41,42,.50)');
        if(!tree) feet.forEach(function (f,i) {
          var x=f[0],y=f[1],r=f[2];
          pool(x+3,y-1,r*1.55,tree?9:8,'rgba(54,35,38,.74)');
          ctx.lineCap='round'; ctx.strokeStyle='rgba(229,194,143,.80)'; ctx.lineWidth=2.8;
          ctx.beginPath(); ctx.moveTo(x-r*.86,y+2);
          ctx.quadraticCurveTo(x-r*.12,y+9,x+r*.85,y+3); ctx.stroke();
          pool(x,y-1,r*1.06,5.2,'rgba(48,31,33,.90)');
          for (var j=0;j<4;j++) {
            var dx=Math.sin((i+1)*17+j*11)*r*1.32;
            ctx.fillStyle=j%2?'rgba(110,79,54,.64)':'rgba(235,206,156,.70)';
            ctx.fillRect(x+dx,y+4+(j%3)*2,2+(i+j)%3,1.6);
          }
        });
        if(tree){
          ctx.lineCap='round';
          function rootSeam(offset,width,colour){
            ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.beginPath();
            rootEdge.forEach(function(y,i){
              if(!y)return;
              var x=4*i+2;
              if(!rootEdge[i-1]||Math.abs(y-rootEdge[i-1])>11)ctx.moveTo(x,y+offset);
              else ctx.lineTo(x,y+offset);
            });
            ctx.stroke();
          }
          rootSeam(-6,10,'rgba(64,40,27,.78)');
          rootSeam(-3,4,'rgba(171,126,73,.78)');
          rootSeam(-1.5,1.7,'rgba(232,190,119,.72)');
          rootEdge.forEach(function(row,i){
            if(!row||i%3)return;
            var x=4*i+2;
            ctx.fillStyle=i%2?'rgba(215,171,105,.85)':'rgba(122,82,49,.59)';
            ctx.fillRect(x,row-3+(i%5)*.5,1.8+i%4,1.6);
          });
        }
        ctx.restore();
      });
      // Two reserved rows store the grounding contour without a separate texture or draw call.
      for(var x=0;x<256;x++){
        var row=rootEdge[Math.floor(x*rootEdge.length/256)];
        var value=row?Math.round(255*(384-row)/384):0;
        ctx.fillStyle='rgb('+value+','+value+','+value+')';ctx.fillRect(256+x,96,1,2);
      }
      var map=new T.CanvasTexture(canvas);
      map.generateMipmaps=false;map.minFilter=T.LinearFilter;
      return map;
    }
    function guardianPaintingGeometry(tree) {
      // Corresponding pixel landmarks in the calm, stepping and braced paintings. The same
      // triangles follow the muzzle, antler tips, shoulders and individual hooves between poses.
      var landmarks = [
        [0,0,0,0,0,0],
        [384,0,384,0,384,0],
        [0,384,0,384,0,384],
        [384,384,384,384,384,384],
        [80,80,88,91,90,117],
        [168,18,171,24,197,51],
        [279,46,293,57,305,85],
        [333,93,349,103,350,130],
        [222,104,237,110,262,161],
        [172,134,185,149,206,202],
        [210,152,241,169,242,238],
        [254,151,276,195,271,260],
        [130,189,137,188,155,217],
        [220,233,231,246,239,282],
        [60,178,70,178,76,179],
        [76,274,80,282,69,274],
        [137,279,146,286,128,279],
        [187,281,187,279,180,287],
        [228,281,249,267,273,286],
        [76,363,59,371,57,347],
        [137,357,178,358,128,331],
        [193,372,239,342,174,371],
        [235,355,259,316,306,344],
        [0,165,0,165,0,165],
        [384,188,384,188,384,188],
        [75,384,65,384,60,384],
        [195,384,215,384,180,384],
        [290,384,295,384,301,384]
      ];
      var faces = [
        1,5,0,4,5,9,4,23,0,5,4,0,6,5,1,27,26,21,
        19,25,2,26,20,21,25,20,26,20,25,19,18,11,24,22,27,21,
        18,22,21,27,22,3,22,24,3,22,18,24,17,18,21,20,17,21,
        11,7,24,24,7,1,7,6,1,4,14,23,15,20,19,14,15,23,
        23,15,2,15,19,2,17,13,18,13,11,18,13,10,11,7,8,6,
        8,7,11,10,8,11,8,10,9,5,8,9,6,8,5,16,17,20,
        15,16,20,12,15,14,12,16,15,12,4,9,12,14,4,16,12,17,
        12,13,17,10,12,9,13,12,10
      ];
      var pos=[], still=[], step=[], brace=[], floor=[];
      var indices=[0,1,2,0,2,3];
      [[-32,411,0,0],[416,411,1,0],[416,254,1,1],[-32,254,0,1]].forEach(function (p) {
        pos.push(p[0]/384-.5,(373-p[1])/384,0);
        [still,step,brace].forEach(function (uv) { uv.push(p[2],p[3]); }); floor.push(1);
      });
      // Subdivide matching landmarks to let the neck, ribs and branches turn independently.
      var subdivisions=tree?3:2;
      for(var f=0;f<faces.length;f+=3){
        var a=landmarks[faces[f]],b=landmarks[faces[f+1]],c=landmarks[faces[f+2]],rows=[];
        for(var row=0;row<=subdivisions;row++){
          var strip=[];rows.push(strip);
          for(var col=0;col<=subdivisions-row;col++){
            var u=row/subdivisions,v=col/subdivisions;
            strip.push(pos.length/3);
            [still,step,brace].forEach(function(coords,i){
              var x=a[i*2]*(1-u-v)+b[i*2]*u+c[i*2]*v;
              var y=a[i*2+1]*(1-u-v)+b[i*2+1]*u+c[i*2+1]*v;
              coords.push(x/384,1-y/384);
              if(!i)pos.push(x/384-.5,(373-y)/384,0);
            });
            floor.push(0);
            if(row && col){
              indices.push(rows[row-1][col-1],strip[col-1],rows[row-1][col]);
              indices.push(strip[col-1],strip[col],rows[row-1][col]);
            }
          }
          if(row)indices.push(rows[row-1][strip.length-1],strip[strip.length-1],rows[row-1][strip.length]);
        }
      }
      // Rounded buttress roots lie on the arena plane. Their tips stay buried in sand.
      if(tree){
        var artEnd=indices.length;
        function woodyRoot(baseX,baseZ,angle,length,radius,phase){
          var first=pos.length/3,sections=8,sides=4;
          var dx=Math.cos(angle),dz=Math.sin(angle);
          for(var j=0;j<=sections;j++){
            var t=j/sections,curve=.043*Math.sin(t*4+phase)*t;
            var x=baseX+length*t*dx-curve*dz,z=baseZ+length*t*dz+curve*dx;
            var r=radius*Math.pow(1-t,.76);
            for(var k=0;k<=sides;k++){
              var q=k*Math.PI/sides;
              pos.push(x-r*dz*Math.cos(q),r*(.23+.86*Math.sin(q))-.012*t,z+r*dx*Math.cos(q));
              still.push(t,k/sides);step.push(.035+.30*t+.022*phase,.60+.26*Math.sin(q)-.12*Math.cos(q));
              brace.push(0,0);floor.push(2);
              if(k && j){var h=first+j*(sides+1)+k;indices.push(h-sides-2,h-1,h,h-sides-2,h,h-sides-1);}
            }
          }
        }
        [[.06,.43,.06],[.72,.43,.066],[1.48,.30,.052],[2.42,.44,.065],[3.04,.41,.046],[4.05,.30,.053],[5.49,.33,.041]].forEach(function(spec,i){
          var angle=spec[0],length=spec[1];
          woodyRoot(0,0,angle,length,spec[2],i*.32);
          if(i%2===1)woodyRoot(Math.cos(angle)*length*.52,Math.sin(angle)*length*.52,angle+.52,length*.49,spec[2]*.4,i*.32);
        });
        indices=indices.slice(0,6).concat(indices.slice(artEnd),indices.slice(6,artEnd));
      }
      var geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
      geo.setAttribute('uv',new T.Float32BufferAttribute(still,2));
      geo.setAttribute('stepUV',new T.Float32BufferAttribute(step,2));
      geo.setAttribute('braceUV',new T.Float32BufferAttribute(brace,2));
      geo.setAttribute('isGround',new T.Float32BufferAttribute(floor,1)); geo.setIndex(indices);
      return geo;
    }
    function makeGuardianArc() {
      // One open half-ring. A low inner wake climbs into the wind wall, then curls back into wisps.
      var pos=[],uv=[],indices=[],segments=60;
      var profile=[[.58,.01],[.75,.07],[.91,.14],[1,.025],[.99,.26],[.94,.49],[.86,.65]];
      for (var i=0;i<=segments;i++) {
        var u=i/segments,a=(u-.5)*Math.PI, taper=Math.sin(Math.PI*u);
        for(var row=0;row<profile.length;row++){
          var r=1-(1-profile[row][0])*(.16+.84*taper);
          pos.push(Math.cos(a)*r,profile[row][1]*(.08+.92*taper),Math.sin(a)*r);
          uv.push(u,row/(profile.length-1));
          if(i && row){var j=i*profile.length+row;indices.push(j-8,j-1,j,j-8,j,j-7);}
        }
      }
      // Seven narrow curls of light rise off the same leading edge as the solar ring's prominences.
      // Pack them in the wave mesh. Their extra UV range selects the bright filament in the shader.
      for (var l=0;l<7;l++) {
        var first=pos.length/3, centre=(l+.55)/7.15, span=.048+.011*(l%3);
        for (var j=0;j<=10;j++) {
          var t=j/10, arc=Math.sin(t*Math.PI), u=centre+(t-.5)*span*2;
          var a=(u-.5)*Math.PI, height=(.22+.12*(l%3))*(.45+.55*Math.sin(centre*Math.PI));
          for(var edge=0;edge<2;edge++){
            var r=.983-.17*arc*(1.-t) + .04*edge*arc;
            pos.push(Math.cos(a)*r,.04+height*arc+.037*edge*arc,Math.sin(a)*r);
            uv.push(u,2+t);
          }
          if(j){var k=first+j*2;indices.push(k-2,k,k+1,k-2,k+1,k-1);}
        }
      }
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(indices);
      return geo;
    }
    S.flytrap = function (c) {
      var aimed = c.pool().slice();
      if (!aimed.length || CW.FRIEND) return;
      c.plain = true;
      sc.heroPose('raise', c.D(.18), c.col);
      if (!guardianQuad) {
        guardianQuad = guardianPaintingGeometry(false);
        guardianTree = guardianPaintingGeometry(true);
        guardianContacts = guardianGroundMap();
        guardianArc = makeGuardianArc();
      }
      var layer = sc.fxGroup || sc.scene;
      function painting(name, tileX, tileY) {
        var material = new T.ShaderMaterial({
          uniforms: { atlas: { value: wpLoad('fx-guardian-surface') }, form: { value: wpLoad('fx-guardian-form') }, growth: { value: 1 }, contacts: { value: guardianContacts }, desert: sc.desertLight, pose: { value: 0 }, motion: { value: new T.Vector4() }, isTree: { value: name === 'guardian tree' ? 1 : 0 }, tile: { value: new T.Vector2(tileX,tileY) }, fade: { value: 0 } },
          side: T.DoubleSide, transparent: true, depthWrite: false,
          vertexShader: [
            'attribute float isGround;attribute vec2 stepUV,braceUV;',
            'uniform float pose,isTree,growth;uniform sampler2D form;uniform vec4 motion;',
            'varying vec2 vA,vB;varying float ground;varying float buried;',
            'void main(){',
            '  buried=0.;ground=isGround; vA=pose<1.?uv:stepUV; vB=pose<1.?stepUV:braceUV;',
            '  vec3 local=position; float blend=pose<1.?pose:pose-1.;',
            '  if(isTree>.5){vA=uv;vB=uv;}',
            '  if(isGround>1.5){',
            '    vec3 axis=normalize(vec3(modelMatrix[0].x,0.,modelMatrix[0].z));vec3 front=vec3(-axis.z,0.,axis.x);',
            '    float size=length(modelMatrix[0].xyz);float reach=smoothstep(stepUV.x-.14,stepUV.x+.03,growth);',
            '    vec3 root=modelMatrix[3].xyz+size*(axis*local.x*.86+front*(local.z*.44-.073))*mix(.42,1.,reach);',
            '    float settle=smoothstep(.30,.72,growth)*.035;buried=local.y*reach-.054*(1.-reach)-settle;root.y+=size*buried;',
            '    gl_Position=projectionMatrix*viewMatrix*vec4(root,1.);vA=uv;vB=stepUV;return;',
            '  }',
            '  if(isGround<.5){',
            '    vec2 shape=mix(vA,vB,blend);local.xy=shape-vec2(.5,11./384.);',
            '    vec2 ta=pose<1.?vec2(0,1):vec2(1,1),tb=pose<1.?vec2(1,1):vec2(0,0);',
            '    if(isTree>.5){ta=vec2(1,0);tb=ta;}',
            '    vec3 formA=texture2D(form,(ta+clamp(vA,.004,.996))*.5).rgb;',
            '    vec3 formB=texture2D(form,(tb+clamp(vB,.004,.996))*.5).rgb;',
            '    vec3 relief=mix(formA,formB,blend);float upper=smoothstep(.16,.74,shape.y);',
            '    local.z+=relief.b*(isTree>.5?.18:.24)*length(modelMatrix[0].xyz);',
            '    if(isTree>.5){float leaf=smoothstep(.31,.75,shape.y);',
            '      float open=smoothstep(relief.r-.17,relief.r+.12,growth);',
            '      local.x*=mix(.72,1.,open);local.y*=mix(.63,1.,open);',
            '      local.x+=leaf*(.008*sin(motion.x*5.+shape.x*4.)+motion.w*(.05+.018*sin(shape.x*11.)));',
            '      local.y+=leaf*.022*motion.w*sin(shape.x*7.);',
            '      float trunk=exp(-19.*(shape.x-.50)*(shape.x-.50));',
            '      float crown=leaf*(.58+.42*sin(shape.x*12.+shape.y*4.));',
            '      local.z+=.12*trunk+.095*crown;',
            '      local.x+=crown*.026*sin(motion.x*3.6+shape.x*6.);',
            '    }else{float head=smoothstep(.22,.70,shape.x);',
            '      local.x+=upper*(.025*motion.y-.045*motion.z)*(.4+.6*head);',
            '      local.y+=upper*(.029*motion.y-.044*motion.z)*head;',
            '      float skull=upper*head;float shoulder=upper*exp(-12.*(shape.x-.53)*(shape.x-.53));',
            '      local.z+=.155*shoulder+.17*skull;',
            '      float turn=(-.115*motion.y+.17*motion.z)*skull;',
            '      vec2 pivot=vec2(.04,.38);vec2 v=local.xy-pivot;',
            '      local.xy=pivot+vec2(v.x*cos(turn)-v.y*sin(turn),v.x*sin(turn)+v.y*cos(turn));',
            '      float yaw=skull*(.12*motion.y-.15*motion.z);',
            '      vec2 offset=local.xz-vec2(.05,.07);',
            '      local.xz=vec2(.05,.07)+vec2(cos(yaw)*offset.x+sin(yaw)*offset.y,-sin(yaw)*offset.x+cos(yaw)*offset.y);',
            '      local.z+=.065*skull*motion.z;',
            '      float load=motion.w;float torso=smoothstep(.06,.34,shape.y)*(1.-smoothstep(.67,.87,shape.y));',
            '      local.y-=load*.055*torso;local.x+=load*.027*torso;',
            '      local.x+=relief.b*(.040*sin(motion.x*5.)*upper+.062*motion.z);',
            '      local.y+=.016*upper*head*sin(motion.x*11.-3.*shape.y)*(.3+abs(load));',


            '    }',
            '  }',
            '  vec4 p=modelMatrix*vec4(local,1.);',
            '  if(isTree>.5){',
            // The shadow, root bank and trunk share a plane fixed in world space. Relief begins above this bank.
            '    vec3 side=normalize(vec3(modelMatrix[0].x,0.,modelMatrix[0].z));vec3 front=vec3(-side.z,0.,side.x);',
            '    float size=length(modelMatrix[0].xyz);vec3 pivot=modelMatrix[3].xyz;',
            '    float expand=.72+.28*smoothstep(.02,.30,growth);',
            '    vec3 bed=pivot+size*expand*(side*position.x-front*(position.y-.018)*1.50);',
            '    bed.y=pivot.y+.012;',
            '    if(isGround>.5)p.xyz=bed;',
            '    else p.xyz=mix(bed,p.xyz,smoothstep(.085,.29,vA.y));',
            '  }else if(isGround>.5){vec3 ray=p.xyz-cameraPosition;p.xyz=cameraPosition+ray*((.014-cameraPosition.y)/min(-.001,ray.y));}',
            '  gl_Position=projectionMatrix*viewMatrix*p;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform sampler2D atlas,contacts,form; uniform vec2 tile;uniform float fade,desert,pose,isTree,growth;uniform vec4 motion;',
            'varying vec2 vA,vB;varying float ground;varying float buried;',
            'vec4 samplePose(vec2 tileID,vec2 v){vec2 uv=(tileID+clamp(v,.002,.998))*.5;',
            '  if(ground>.5){if(isTree>.5 && v.y>.963)return vec4(0.);vec4 c=texture2D(contacts,uv);c.a*=1.-(1.-desert)*smoothstep(.53,.82,c.r);return c;}',
            '  return texture2D(atlas,uv);}',
            'void main(){',
            '  if(ground>1.5){float tip=smoothstep(vB.x-.1,vB.x+.04,growth);',
            '    float ridge=.055*sin(vA.y*37.+3.*sin(vA.x*11.));',
            '    vec3 bark=texture2D(atlas,(vec2(1,0)+vec2(.46+.15*vA.x,.22+.040*vA.y+.025*sin(4.*vA.x)))*.5).rgb*(.78+.30*vB.y+ridge);',
            '    float grain=dot(bark,vec3(.35,.48,.17));bark=mix(vec3(.30,.185,.13),vec3(.66,.44,.29),clamp(grain*.86+.25*vB.y,0.,1.));float covered=smoothstep(.65,.98,vA.x);bark=mix(bark,vec3(.64,.47,.29),covered*.65*desert);',
            '    float exposed=smoothstep(-.004,.020,buried);if(exposed<.03)discard;gl_FragColor=vec4(bark,(1.-covered)*tip*exposed*fade);return;}',
            '  float f=pose<1.?pose:pose-1.;vec2 nextTile=pose<1.?vec2(1,1):vec2(0,0);vec4 p;',
            '  if(isTree>.5)p=samplePose(tile,vA);else if(f>.999)p=samplePose(nextTile,vB);else{',
            'p=samplePose(pose<1.?vec2(0,1):vec2(1,1),vA);if(f>.001){vec4 q=samplePose(nextTile,vB);',
            // Move the whole pose continuously, but hand the paint across in a narrow band.
            // Long antlers otherwise show both sets of tips during a translucent crossfade.
            '    float sweep=f+(vA.y-.5)*.59+(vA.x-.5)*.13;',
            '    float mixPaint=ground>.5?f:smoothstep(.43,.57,sweep);',
            '    if(ground<.5 && abs(p.a-q.a)>.45)mixPaint=step(.50,sweep);',
            '    float a=mix(p.a,q.a,mixPaint);p=vec4(mix(p.rgb*p.a,q.rgb*q.a,mixPaint)/max(.001,a),a);}}',
            '  if(isTree>.5 && ground>.5){',
            '    float x=clamp((448.*vA.x-32.)/384.,.003,.997);',
            '    float line=texture2D(contacts,vec2(.5+.5*x,1.-97./192.)).r;',
            '    float arrival=texture2D(form,(vec2(1,0)+vec2(x,max(.065,line+.013)))*.5).r;',
            '    p.a*=smoothstep(arrival-.018,arrival+.085,growth);}',
            '  if(p.a<.018)discard;',
            '  vec2 surface=mix(vA,vB,f);',
            '  if(ground<.5){vec2 first=pose<1.?vec2(0,1):vec2(1,1);',
            '    vec3 a=texture2D(form,((isTree>.5?tile:first)+clamp(vA,.004,.996))*.5).rgb;',
            '    vec3 b=texture2D(form,((isTree>.5?tile:nextTile)+clamp(vB,.004,.996))*.5).rgb;',
            '    vec3 relief=mix(a,b,f);if(isTree>.5){',
            '      p.a*=smoothstep(relief.r-.048,relief.r+.036,growth);',
            '      if(surface.y<.22){float seam=texture2D(contacts,vec2(.5+.5*surface.x,1.-97./192.)).r;',
            '        float soil=surface.y-seam-.011-.003*sin(surface.x*183.);',
            '        if(seam>.001){p.a*=smoothstep(0.,.008,soil);',
            '          p.rgb=mix(p.rgb*vec3(.65,.59,.51),p.rgb,smoothstep(.003,.035,soil));}}',
            '      if(p.a<.018)discard;}',
            '    float key=relief.g-.5;float groundBounce=(1.-surface.y)*desert;',
            '    p.rgb*=vec3(1.+.46*key+.06*groundBounce,1.+.40*key+.021*groundBounce,1.+.33*key-.044*groundBounce);',
            '    p.rgb+=vec3(.085,.069,.046)*max(0.,key)*abs(motion.z+motion.w);}',
            '  if(isTree>.5 && ground<.5){float canopy=smoothstep(.33,.72,surface.y);',
            '    float shade=sin(surface.x*11.+surface.y*7.+motion.w*1.7);',
            '    p.rgb*=1.+canopy*.048*shade+.075*abs(motion.w)*surface.x;}',
            '  if(isTree<.5 && ground<.5){float horns=smoothstep(.64,.86,surface.y);',
            '    float chest=smoothstep(.12,.43,surface.y)*(1.-smoothstep(.49,.74,surface.y));',
            '    p.rgb*=1.+.07*chest*motion.z*(surface.x-.35);',
            '    p.rgb=mix(p.rgb,vec3(1.,.98,.81),motion.y*horns*.36*smoothstep(.20,.7,p.r));}',

            '  gl_FragColor=vec4(p.rgb,p.a*fade);',
            '}'
          ].join('\n')
        });
        var mesh = new T.Mesh(name==='guardian tree'?guardianTree:guardianQuad, material);
        mesh.name = name; mesh.visible = false; layer.add(mesh);
        return mesh;
      }
      var tree = painting('guardian tree',1,0), deer = painting('guardian reindeer',0,1);
      var wave = new T.Mesh(guardianArc, new T.ShaderMaterial({
        uniforms: { fade:{value:0}, age:{value:0} }, transparent:true, depthWrite:false, side:T.DoubleSide,
        vertexShader: [
          'uniform float age;varying vec2 v;void main(){v=uv;vec3 p=position;',
          'float crest=smoothstep(.50,1.,uv.y);',
          'float gust=.74+.26*sin(39.*uv.x-14.*age)+.14*sin(81.*uv.x+9.*age);',
          'p.y*=mix(1.,gust,uv.y>1.5?.32:crest);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}'
        ].join('\n'),
        fragmentShader: [
          'uniform float age,fade;varying vec2 v;void main(){',
          'if(v.y>1.5){float glow=sin((v.y-2.)*3.14159);gl_FragColor=vec4(1.,.99,.89,fade*.94*glow);return;}',
          'float ends=smoothstep(0.,.07,min(v.x,1.-v.x));',
          'float band=exp(-8.*abs(v.y-.48));float foot=exp(-13.*abs(v.y-.21));',
          'float strands=.5+.5*sin(v.x*84.-v.y*19.-age*12.+1.5*sin(v.x*24.));',
          'float lace=smoothstep(.18,.86,strands)*smoothstep(.53,.83,v.y);',
          'float outer=1.-smoothstep(.79,1.,v.y);',
          'float a=ends*fade*(smoothstep(.01,.32,v.y)*outer*(.43+.95*band)+foot*.44+lace*(1.-smoothstep(.88,1.,v.y))*.80);',
          'vec3 col=mix(vec3(.36,.44,.35),vec3(1.,.99,.91),smoothstep(.05,.47,v.y));',
          'col=mix(col,vec3(1.,1.,.98),clamp(band+lace+foot*.7,0.,1.));gl_FragColor=vec4(col,min(1.,a));}'
        ].join('\n')
      }));
      wave.name = 'guardian shockwave'; wave.renderOrder = 4; wave.visible = false; layer.add(wave);
      var live = track({ kill: function () {
        layer.remove(tree,deer,wave); tree.material.dispose(); deer.material.dispose(); wave.material.dispose();
      } });
      var right = V(1,0,0).applyQuaternion(sc.camera.quaternion); right.y = 0; right.normalize();
      var back = V(0,0,-1).applyQuaternion(sc.camera.quaternion); back.y = 0; back.normalize();
      var size = 1.85; // Fixed cast size, including against bosses.
      var target = c.center.clone(), guard = V(), base = V(), hero = sc.heroCenter();
      var sign = 1, best = -Infinity;
      var heroUV = hero.clone().project(sc.camera);
      var rootObstacles=K.liveMobs().map(function(m){return sc.mobPos(m).project(sc.camera);});
      // Pick a clear strip on the actual projected battlefield, including the hero's hat and the HUD.
      var layouts=[];
      [1.12,.76,1.58,2.04].forEach(function(gap){
        [.22,-.46,.86,-1.10,1.60,-1.84].forEach(function(depth){layouts.push([gap,depth]);});
      });
      [-1,1].forEach(function (s) {
        layouts.forEach(function (layout) {
          var gap=layout[0],depth=layout[1];
          var p = target.clone().addScaledVector(right,-s*size*gap).addScaledVector(back,depth*size);
          var treePos = p.clone().addScaledVector(right,-s*size*.37).addScaledVector(back,.31*size);
          var faceUV = p.clone().addScaledVector(UP,.52*size).project(sc.camera);
          var entryUV = treePos.clone().lerp(p,.40).addScaledVector(UP,.54*size).project(sc.camera);
          var treeUV = treePos.clone().addScaledVector(UP,.61*size).project(sc.camera);
          var deltaX = Math.abs(faceUV.x-heroUV.x), deltaY = Math.abs(faceUV.y-heroUV.y);
          var clearance = Math.min(Math.max(deltaX/.41,deltaY/.25),
            Math.max(Math.abs(entryUV.x-heroUV.x)/.35,Math.abs(entryUV.y-heroUV.y)/.22));
          var edge = Math.max(0,-.72-treeUV.x,treeUV.x-.54,-.72-faceUV.x,faceUV.x-.54,Math.abs(treeUV.y)-.72);
          var score = -7*edge - 5*Math.max(0,1.22-clearance) - .35*Math.abs(treeUV.x) - .32*Math.abs(depth-.22);
          var rootUV=treePos.clone().project(sc.camera);
          var rootLeft=treePos.clone().addScaledVector(right,-.53*size).project(sc.camera);
          var halfWidth=Math.abs(rootLeft.x-rootUV.x);
          // Keep the actual base on open sand, clear of rocky margins, menu and overlapping mobs.
          score-=24*Math.max(0,-.85-rootUV.x+halfWidth,rootUV.x+halfWidth-.70);
          score-=8*Math.max(0,Math.abs(rootUV.y)-.61);
          score-=.9*Math.abs(gap-1.12);
          var headUV=p.clone().addScaledVector(UP,.65*size).project(sc.camera);
          rootObstacles.forEach(function(v){
            var dx=Math.abs(v.x-rootUV.x)/(halfWidth+.09),dy=Math.abs(v.y-rootUV.y)/.14;
            score-=4.1*Math.max(0,1-Math.max(dx,dy));
            score-=1.6*Math.max(0,1-Math.max(Math.abs(v.x-headUV.x)/(halfWidth+.08),Math.abs(v.y-headUV.y)/.16));
          });
          if (score > best) { best=score; sign=s; guard.copy(p); base.copy(treePos); }
        });
      });
      var origin = guard.clone().addScaledVector(right,sign*size*.21);
      var start = base.clone().addScaledVector(right,sign*size*.28).addScaledVector(back,size*.12);
      var dir = V(), foot = V(), contact = V();
      var raisedSand=false;
      var elapsed=0, gathered=false, released=false, landed=false, struck=false, radius=0;
      function ramp(a,b) {
        var v = Math.max(0, Math.min(1, (elapsed-a)/(b-a)));
        return v*v*(3-2*v);
      }
      function show(mesh, pos, w, h, fade) {
        var u = mesh.material.uniforms;
        if (!u.atlas.value) u.atlas.value = wpLoad('fx-guardian-surface');
        if (!u.form.value) u.form.value = wpLoad('fx-guardian-form');
        mesh.visible = !!u.atlas.value && !!u.form.value && fade > .01;
        mesh.position.copy(pos); mesh.scale.set(w,h,1);
        mesh.quaternion.copy(sc.camera.quaternion); u.fade.value = fade;
      }
      tick(function (dt) {
        elapsed += dt / c.D(1);
        var advance=ramp(.23,.62),retreat=ramp(1.12,1.53);
        var emerge=advance*(1-retreat),lift=Math.sin(Math.PI*emerge);
        // Recede into the same collar after the guardian has stepped back into cover.
        var growth=ramp(0,.66)*(1-ramp(1.48,2.07));
        tree.renderOrder=2.7;
        tree.material.uniforms.growth.value=growth;
        show(tree,base,size*1.24,size*1.24,ramp(0,.09)*(1-ramp(2.01,2.12)));
        var breath=ramp(.25,.55)*(1-ramp(.72,.82));
        var kick=ramp(.72,.79)*(1-ramp(.84,1.04));
        var wind=ramp(.70,.89)*(1-ramp(1.02,1.43))*Math.sin((elapsed-.70)*14);
        var pose=(ramp(.24,.43)+ramp(.45,.62))*(1-retreat);
        deer.material.uniforms.pose.value=pose;
        deer.material.uniforms.motion.value.set(elapsed,breath,kick,Math.sin(2*Math.PI*advance)*.72+kick*.72-Math.sin(Math.PI*retreat)*.42);
        tree.material.uniforms.motion.value.set(elapsed,0,0,sign*wind);
        foot.copy(start).lerp(guard,emerge);
        foot.addScaledVector(back,-size*.10*lift);
        if(elapsed-dt/c.D(1)<.10 && elapsed>=.10)K.dust(base,N(2,c),.43);
        deer.renderOrder = emerge < .48 ? 2.6 : 2.8;
        show(deer,foot,sign*size,size,ramp(.21,.38)*(1-ramp(1.37,1.52)));
        if (!gathered && elapsed >= .37) {
          gathered=true; if(!c.copy && !(CW.fxOff && CW.fxOff.dim))sc.dim(.30,c.D(.51));
          var antlers=foot.clone().addScaledVector(right,sign*size*.13).addScaledVector(V(0,1,0).applyQuaternion(sc.camera.quaternion),size*.70);
          K.converge(antlers,[0xfffee0,0xd9e5a3],N(5,c),.43*size,c.D(.25));
        }
        if (!landed && elapsed >= .60) {
          landed = true; K.dust(origin,N(2,c),.58);
          K.flare(V(origin.x,.11,origin.z),0xffffe8,.43,.12);
        }
        if (!released && elapsed >= .74) {
          released=true;
          var hoof=origin.clone();hoof.y=.11;
          K.flare(hoof,0xffffee,.94*size,.15,{white:true});sc.light(hoof,0xfff3c9,1.55,.22);
          if(!c.copy){sc.shake(.12);sc.punch(.035);}
        }
        if (elapsed >= .74) {
          if (!struck) {
            // Keep living reservations. Replace fallen targets only with unclaimed enemies.
            target.set(0,0,0);
            var count=0, edgeInset=0;
            aimed.forEach(function (m,i) {
              if (!m.alive) {
                var free=K.liveMobs().filter(function (other) { return aimed.indexOf(other)<0; });
                var arrived=free.filter(function (other) { return other.arrived; });
                m=K.near(arrived.length?arrived:free,m.x,m.z);
                if (!m) return;
                aimed[i]=m;
              }
              target.x+=m.x; target.z+=m.z; count++;
              edgeInset+=m.group.userData.h*(m.boss ? .30 : .17);
            });
            if (count) target.multiplyScalar(1/count);
            else target.copy(gp(aimed[0]));
            dir.subVectors(target,origin);
            var distance = dir.length(); if (distance > .001) dir.multiplyScalar(1/distance); else dir.copy(right).multiplyScalar(sign);
            // First contact is the near edge of the target's feet, not its centre.
            radius = Math.max(.12,distance - edgeInset/Math.max(1,count));
            contact.copy(origin).addScaledVector(dir,radius);
          }
          var flight=Math.min(1,Math.max(0,(elapsed-.74)/.21));
          var travel=elapsed<.95 ? .12+.88*(1-Math.pow(1-flight,1.45)) : 1+.57*ramp(.95,1.19);
          var breakOver=ramp(.91,.995)*(1-ramp(1.01,1.23));
          var waveFade=(1-ramp(1.015,1.28))*ramp(.73,.76);
          wave.visible = waveFade > .01;
          wave.position.copy(origin); wave.position.y=.047;
          wave.rotation.y=-Math.atan2(dir.z,dir.x);
          wave.scale.set(radius*travel,size*(.49+.63*travel+.42*breakOver),size*.8*travel*(1+.29*breakOver));
          wave.material.uniforms.fade.value=waveFade; wave.material.uniforms.age.value=elapsed-.74;
          if (!raisedSand && flight>=.56) {
            raisedSand=true;
            [-.94,-.28,.51,.99].forEach(function (angle,i) {
              var outward=dir.clone().applyAxisAngle(UP,angle), at=V(Math.cos(angle)*wave.scale.x,0,-Math.sin(angle)*wave.scale.z).applyQuaternion(wave.quaternion).add(origin);
              at.y=.055;
              E({sys:'norm',frame:'smoke',pos:at,vel:outward.multiplyScalar(1.4+.25*i).addScaledVector(UP,.7),
                color:K.dustCol(),size:[.095*size,.31*size],alpha:.54,life:.28+.02*i,fadeOut:.75,drag:2});
            });
          }
          if (!struck && elapsed >= .95) {
            struck = true;
            var impact=V(contact.x,.26,contact.z);
            // The pressure front tears a short fan of sand and pebbles outwards on contact.
            for(var h=0;h<7;h++){
              var bearing=(h-3)*.29,side=dir.clone().applyAxisAngle(UP,bearing);
              var groundHit=impact.clone().addScaledVector(side,.13*size);groundHit.y=.055;
              E({sys:'col',frame:'smoke',pos:groundHit,vel:side.clone().multiplyScalar(2.0+.5*(h%3)).addScaledVector(UP,1.2+.4*(h%2)),
                color:[K.dustCol(),0xa98968],size:[.12*size,.45*size],life:.27+.035*(h%3),alpha:.53,drag:2.8,fadeOut:.72});
              E({sys:'col',frame:'shard',pos:groundHit.clone(),vel:side.multiplyScalar(3.6+.3*(h%3)).addScaledVector(UP,3+.6*(h%2)),
                color:[0x775e49,0xac9174],size:[.16*size,.05],ar:.74,grav:16,spin:h-3,life:.43,fadeOut:.40});
            }
            K.flare(impact,0xffffef,1.24*size,.19,{white:true});
            sc.light(impact,0xfff6d4,2.0,.23);
            // The same front breaks around the target. Two short pressure trails mark its outward path.
            var across=V(-dir.z,0,dir.x);
            [-1,1].forEach(function (side) {
              var points=[];
              for(var j=0;j<7;j++){
                var u=j/6, p=impact.clone().addScaledVector(dir,size*(1.30*u-.12))
                  .addScaledVector(across,side*size*(.09+.54*Math.sin(u*1.30)));
                p.y+=size*(.13+.29*Math.sin(u*Math.PI)-.13*u);points.push(p);
              }
              K.vx.ribbon({mode:'static',sweep:true,pts:points,w:size*.15,color:0xf4edc6,core:.95,alpha:.89,life:.22});
            });
            E({pos:impact.clone(),frame:'star',color:[0xffffff,0xe7edc7],size:[.36*size,1.20*size],life:.15,fadeOut:.62});
            K.sparks(impact,[0xfffffa,0xecf0c5,0xbccc87],N(6,c),4.2,{size:.13,stretch:.26});
            K.dust(contact,N(4,c),1.15);
            for(var j=0;j<5;j++){
              var a=(j-2)*.43, along=dir.clone().applyAxisAngle(UP,a);
              E({sys:'col',pos:impact.clone().addScaledVector(along,.13),frame:'streak',
                vel:along.multiplyScalar(2.6+.25*j).addScaledVector(UP,.7+.2*(j%2)),color:[0xffffed,0xcad6a2],
                size:[.75*size,.08],ar:.10,stretch:.27,life:.22+.02*j,fadeOut:.65});
            }
            if(!c.copy){sc.shake(.29);sc.punch(.065);sc.hitStop(.085);}

            // One front covers this cast. A neighbour within reach of two targets takes one splash.
            var direct=aimed.filter(function (m) { return m.alive; });
            if (!direct.length) c.hit(aimed[0],1,1.25); // Use the shared empty-field carry queue.
            var splash=K.liveMobs().filter(function (m) {
              return direct.indexOf(m)<0 && direct.some(function (main) {
                var dx=m.x-main.x,dz=m.z-main.z;
                return dx*dx+dz*dz<1.6*1.6;
              });
            });
            direct.forEach(function (m) {
              if (direct.length>1) K.flare(V(m.x,.26,m.z),0xffffef,.44*size,.13);
              c.hit(m,1,1.25);
            });
            splash.forEach(function (m) { if(m.alive) c.hit(m,c.sk.splash,.9); });
          }
        }
        if (elapsed < 2.12) return false;
        live.kill(); return true;
      });
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
          // (2026-11-23) the blades fly at the monsters on the field as it bursts, not the ones there at the cast (felled by
          // then by the spells before it, while the ones that walked in were left standing)
          var now = c.pool(); if (now.length) slashAll(c, now, Hg); else c.recover();
          // and one that walks in while the blades are still flying gets its own flight
          K.lateComers(c, now.slice(), c.D(0.3), function (m) { slashAll(c, [m], Hg, true); });
        }
        return !live;
      });
    };
    // the flights that cut every monster (nearest first): two blades cross through it leaving gold-green trails, a third
    // follows; the first to reach it is the hit
    function slashAll(c, list, Hg, late) {
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
                    sc.light(q0, 0x9fd84a, 1.1, 0.22); if (!i && !late) { sc.hitStop(0.05); sc.shake(0.18); }
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
      new T.TextureLoader().load((CW.ART_BASE || 'art/') + name + '.webp', function (t) { if (name !== 'fx-guardian-form' && T.sRGBEncoding) t.encoding = T.sRGBEncoding; wpTex[name] = t; }, undefined, function () { });
      return null;
    }
    ['wt-tree', 'wt-fruit-red', 'wt-root', 'wt-spikes', 'fx-guardian-surface', 'fx-guardian-form'].forEach(function (n) { if (!CW.FRIEND) wpLoad(n); });
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
