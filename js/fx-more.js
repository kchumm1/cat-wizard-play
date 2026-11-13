// The second set of skills: three more for every job tier, each built from the same parts as js/fx.js.
// Rule kept everywhere: whatever visibly lands is a real hit, and nothing is hit that the spell does not touch.
(function (root) {
  var CW = root.CW = root.CW || {};
  CW.fxMore = function (K, S) {
    var T = K.T, sc = K.sc, vx = K.vx, V = K.V, rr = K.rr, rdir = K.rdir, pick = K.pick, STAY = K.STAY, sway = K.sway, deep = K.deep, E = K.E, N = K.N, after = K.after, tick = K.tick, FC = K.FC, UPC = K.UPC, above = K.above;
    var fieldPt = K.fieldPt, fieldWave = K.fieldWave, fieldRain = K.fieldRain, flare = K.flare, glow = K.glow, sparks = K.sparks, embers = K.embers, smoke = K.smoke, fire = K.fire, trailFire = K.trailFire, shock = K.shock, ring = K.ring, gRing = K.gRing, gGlow = K.gGlow;
    var scorch = K.scorch, dust = K.dust, circle = K.circle, seal = K.seal, converge = K.converge, impact = K.impact, heavy = K.heavy, homing = K.homing, explosion = K.explosion;
    var liveMobs = K.liveMobs, gp = K.gp, share = K.share, volley = K.volley, ringHits = K.ringHits, skyBolt = K.skyBolt, zapHit = K.zapHit, beamOf = K.beamOf, picHead = K.picHead, picAt = K.picAt, picFall = K.picFall;
    var P3 = K.P3;
    var ICE = [0xffffff, 0xd8f2ff, 0xbfe8ff], ELC = [0xff6a2b, 0x7bddff, 0xdff6ff, 0xffe14a, 0xb68aff], ELF = ['flame', 'streak', 'shard', 'star', 'crescent'];
    function mp(m) { return sc.mobPos(m); }
    function put(list, p) { for (var i = 0; i < list.length; i++) if (list[i]) { list[i].x = p.x; list[i].y = p.y; list[i].z = p.z; } }
    function kill(list) { list.forEach(vx.kill); }
    // a bar of light standing straight up on the screen from a ground point (len is its height)
    function shaft(g, len, w, col, life, o) { var q = { pos: above(g, len / 2), frame: 'streak', color: col, size: [len, len], ar: w, rot: 1.5708, life: life }; for (var k in o) q[k] = o[k]; return E(q); }
    // ice standing up out of the ground at a spot
    function iceSpike(g, h, life, lean) { return E({ sys: 'norm', pos: V(g.x, h * 0.42, g.z + 0.25), frame: 'shard', color: pick(ICE), size: [0.05, h * 0.5], ar: 2.0, rot: lean || 0, ease: 2, life: life, fadeOut: 0.85, white: true }); }
    function iceBurst(c, m, big, noCards) {
      var g = gp(m), q = mp(m), B = (m.boss ? 1.45 : 1) * (big || 1);
      for (var s = 0; s < 5 && !noCards; s++) iceSpike(V(g.x + (s - 2) * 0.17 * B, 0, g.z + rr(-0.05, 0.1)), rr(0.85, 1.35) * c.s * B, c.D(0.6), -((s - 2) * 0.36 + rr(-0.1, 0.1)));
      flare(q, 0xffffff, 1.2, 0.15, { white: true }); shock(q, c.col, 1.8 * B, 0.3);
      for (var k = 0; k < N(8, c); k++) E({ sys: 'norm', pos: q.clone().add(rdir(0.3)), vel: rdir(3.2).add(V(0, 2.2, 0)), frame: 'shard', color: pick(ICE), size: [rr(0.1, 0.2), 0.05], ar: 2, life: rr(0.5, 0.8), grav: 7, spin: rr(-12, 12), white: true });
      E({ sys: 'gadd', pos: V(g.x, 0.04, g.z), frame: 'frost', color: c.col, size: [0.3, 2.4 * B], ease: 1, life: 0.8, fadeOut: 0.5, alpha: 0.8 });
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
          t += dt; var k = Math.min(1, t / T_FALL); if (mob.alive) to = mp(mob);
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
      var list = c.pool().slice(0, 4); if (!list.length) return;
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
      var list = c.pool().slice(0, 3); if (!list.length) return;
      sc.heroPose('raise', c.D(0.14), 0xff8a3a);
      list.forEach(function (mob, i) {
        var g0 = gp(mob);
        circle(g0, 0xff7a2b, 1.3 * c.s, c.D(0.42), { spin: 4 }); gGlow(g0, 0xff5a1a, 1.2, c.D(0.34));
        embers(V(g0.x, 0.1, g0.z), [0xffe080, 0xff6a2b], N(4, c), { speed: 0.8, up: 2.4, life: 0.6 });
        after(c.D(0.2 + i * 0.07), function () {
          var g = gp(mob), q = mp(mob), H = Math.min(7, 4.2 * c.s);
          shaft(g, H, 0.42, [0xffffff, 0xffc23a, 0xff5a1a], 0.42, { hot: 1.3, fadeOut: 0.35 });
          shaft(g, H * 0.8, 0.9, [0xff8a2b, 0xc8301a], 0.5, { sys: 'col', alpha: 0.7, fadeOut: 0.3 });
          // the fire itself rushes up the column
          for (var f = 0; f < N(20, c); f++) E({ sys: f % 2 ? 'col' : 'add', pos: V(g.x + rr(-0.25, 0.25), 0.2, g.z + rr(-0.1, 0.1)), vel: UPC.clone().multiplyScalar(rr(5, 11)).add(V(rr(-0.6, 0.6), 0, 0)), frame: 'flame', color: f % 2 ? [0xffd060, 0xff7a1a, 0xc8301a] : [0xffffff, 0xffe080, 0xff8a2b], size: [rr(0.4, 0.7) * c.s, rr(0.9, 1.4) * c.s], ease: 1, life: rr(0.3, 0.55), delay: rr(0, 0.12), drag: 1.5, spin: rr(-3, 3), fadeOut: 0.4 });
          flare(q, 0xffffff, 1.4 * c.s, 0.15, { white: true }); gRing(g, 0xff7a2b, 2.6 * c.s, 0.45); scorch(g, 1.3 * c.s, 2.4);
          smoke(V(g.x, 0.6, g.z), [0x6a5a54, 0x2e2624], N(5, c), { size: 1.0, rise: 1.6, speed: 0.8, life: 1.2 });
          embers(q, [0xffe080, 0xff6a2b], N(10, c), { speed: 2.6, up: 3.5 });
          sc.light(q, 0xff8a3a, 1.8, 0.4); heavy(0.9); if (!i) sc.flash('rgba(255,170,90,0.3)', 0.2);
          c.hit(mob, 1, 1.5);
        });
      });
    };
    // Flame wave: a wall of fire sweeps the whole field from one edge of the screen to the other; it burns whatever it rolls over.
    S.flameWave = function (c) {
      sc.heroPose('swipe', c.D(0.12), 0xff8a3a);
      var dir = sc.heroState().faceT > 0 ? 1 : -1;
      after(c.D(0.12), function () {
        var x = -4.4 * dir, hit = [];
        sc.flash('rgba(255,150,70,0.3)', 0.2); sc.shake(0.15);
        tick(function (dt) {
          x += dir * 15 * c.sp * dt;
          for (var i = 0; i < N(5, c); i++) {
            var z = rr(-4.6, 3.8);
            fire(V(x + rr(-0.3, 0.3), 0.3, z), 1, { size: rr(0.7, 1.1) * c.s, speed: 0.6, up: 3.4, life: 0.8, v: V(dir * 3.5, 0, 0) });
            if (i % 2) E({ sys: 'gadd', pos: V(x, 0.035, z), frame: 'glow', color: [0xffa040, 0xc8301a], size: [1.2, 2.0], life: 0.6, rot: 0, alpha: 0.6, fadeIn: 0.1 });
          }
          if (Math.random() < dt * 40 * c.n) E({ pos: V(x, 0.3, rr(-4.6, 3.8)), vel: V(dir * rr(3, 6), rr(2, 5), 0), frame: 'dot', color: [0xffe080, 0xff5a1a], size: [rr(0.06, 0.11), 0], life: rr(0.4, 0.8), grav: 4, stretch: 0.08 });
          if (Math.random() < dt * 14) scorch(V(x - dir * 0.4, 0, rr(-4.4, 3.6)), 0.9, 1.6);
          sc.shake(dt * 0.4);
          c.pool().forEach(function (m) { if (hit.indexOf(m) < 0 && (m.x - x) * dir <= 0) { hit.push(m); fireBurst(c, m, 1); c.hit(m, 1, 1.2); } });
          return x * dir > 4.6;
        });
      });
    };
    // Inferno shell: one huge fireball is lobbed high, comes down on a monster and takes the ground around it with it.
    S.inferno = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('toss', c.D(0.22), 0xff6a2b);
      var tip = c.from;
      glow(tip, 0xff6a2b, [0.3, 1.5 * c.s], c.D(0.24), { fadeIn: 0.6, hot: 1.4 });
      for (var i = 0; i < N(18, c); i++) { var a = rr(0, 6.28), r = rr(0.5, 1.0); E({ pos: tip, frame: 'flame', color: [0xffe080, 0xff6a2b], size: [0.3, 0.1], life: c.D(rr(0.14, 0.22)), delay: rr(0, c.D(0.05)), upd: K.spiralTo(tip, a, r), fadeIn: 0.3 }); }
      after(c.D(0.22), function () {
        var from = sc.heroPaw(), S_ = 1.55 * c.s, ball = P3.fireball({ size: 0.24 * S_, col: 0xff6a1a }), land = mp(mob);
        flare(from, 0xffffff, 1.4 * c.s, 0.16, { white: true }); smoke(from, 0x5a4a44, N(4, c), { size: 0.7, rise: 0.4 });
        homing({ from: from, to: function () { if (mob.alive) land = mp(mob); return land; }, time: c.D(0.42), arc: V(0, 3.6, -0.5), ease: function (x) { return x * x * 0.7 + x * 0.3; },
          fancy: false, heads: [],
          emit: function (p, v, dt) {
            if (ball) ball.set(p, v, dt);
            var back = v.clone().multiplyScalar(-0.12);
            if (Math.random() < dt * 34 * c.n) trailFire(p, v, 0.24 * S_, { size: 0.5 * S_, speed: 0.8, up: 0.4, life: 0.8, v: back });
            if (Math.random() < dt * 30 * c.n) E({ sys: 'norm', pos: p.clone(), vel: back.clone().add(V(0, 0.5, 0)), frame: 'smoke', color: 0x4a3c38, size: [0.3 * S_, 0.9 * S_], ease: 1, life: 0.7, alpha: 0.4, drag: 2, fadeIn: 0.2 });
          },
          onHit: function (p) {
            var g = V(p.x, 0, p.z);
            ball.kill(); P3.blast(g, { size: 0.65 * S_, col: 0xff7a1a, flash: true, chips: 6, ring: 2.6, life: 0.8 });
            explosion(c, p, S_, 0xff5a1a); fieldWave(g, 0xff7a2b, 0.7, 0xffe14a); sc.shake(0.3);
            // the blast throws up a ring of fire around where it landed
            for (var f = 0; f < 7; f++) { var a = f / 7 * 6.283, q = V(g.x + Math.cos(a) * 1.5, 0.3, g.z + Math.sin(a) * 1.2); fire(q, N(4, c), { size: 1.0 * c.s, speed: 1.2, up: 3, life: 0.8 }); scorch(V(q.x, 0, q.z), 0.8, 2); }
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
      circle(g0, c.col, 1.5 * c.s, c.D(0.4), { spin: 5 });
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
      var list = c.pool().slice(0, 5); if (!list.length) return;
      sc.heroPose('thrust', c.D(0.12), c.col);
      var k = Math.max(1, Math.ceil(5 / list.length)), seq = []; for (var r = 0; r < k; r++) seq = seq.concat(list);
      after(c.D(0.12), function () {
        var from = sc.heroPaw(), cur = from.clone(), i = 0, t = 0, seg = c.D(0.52 / seq.length + 0.02), to = mp(seq[0]);
        var parts = [E({ pos: from, frame: 'glow', color: c.col, size: 1.5 * c.s, life: 30, upd: STAY, fadeOut: 1, alpha: 0.6 }), E({ sys: 'col', pos: from, frame: 'dot', color: c.deep, size: 0.55 * c.s, life: 30, upd: STAY, fadeOut: 1 }),
          E({ pos: from, frame: 'flare', color: 0xffffff, size: 0.7 * c.s, life: 30, upd: STAY, fadeOut: 1, white: true, spin: 12 }), E({ pos: from, frame: 'ring', color: c.col, size: 0.8 * c.s, life: 30, upd: STAY, fadeOut: 1, spin: 9, ar: 0.6 })];
        var rib = vx.ribbon({ solid: true, mode: 'trail', w: 0.12 * c.s, color: c.deep, core: 0.9, maxPts: 14, shrink: 60 });
        flare(from, 0xffffff, 1.0 * c.s, 0.14, { white: true });
        tick(function (dt) {
          var mob = seq[i]; t += dt / seg; var kk = Math.min(1, t); if (mob.alive) to = mp(mob);
          cur.lerpVectors(from, to, kk); cur.y += Math.sin(kk * Math.PI) * 0.7;
          put(parts, cur); if (rib) rib.head(cur);
          if (Math.random() < dt * 34 * c.n) vx.lightning(cur.clone(), cur.clone().add(rdir(0.8)), { w: 0.04, color: c.col, life: 0.08, branches: 0, segs: 5, amp: 0.3 });
          if (kk < 1) return false;
          zapHit(c, mob, i === 0); sc.shake(0.06);
          vx.lightning(from.clone(), to.clone(), { solid: true, w: 0.08 * c.s, color: 0x3d8cff, core: 0.9, life: c.D(0.2), branches: 1, segs: 10, amp: 0.2 });
          c.hit(mob, 1 / k, 1.1);
          i++; t = 0; from.copy(cur);
          if (i < seq.length) return false;
          kill(parts); if (rib) rib.detach();
          flare(cur, 0xffffff, 1.3 * c.s, 0.15, { white: true }); ring(cur, c.col, 1.6 * c.s, 0.25); sparks(cur, [0xffffff, c.col], N(12, c), 7, { size: 0.16, stretch: 0.2 });
          return true;
        });
      });
    };

    // =================================================================== 4차: 얼음
    // Ice lance: a spear of ice freezes together over the wizard's head and is hurled through one monster.
    S.lance = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('thrust', c.D(0.24), c.col);
      var up = sc.heroCenter().add(V(0, 1.35, -0.2));
      converge(up, [0xffffff, c.col], N(18, c), 1.3, c.D(0.22), { frame: 'shard' });
      var spear = P3.iceSpear({ size: 1.25 * c.s }), formT = 0, aim = V();
      tick(function (dt) { formT += dt; aim.copy(mp(mob)).sub(up); spear.set(up, aim, dt, Math.min(1, formT / c.D(0.2))); return formT >= c.D(0.24); });
      E({ pos: up, frame: 'frost', color: c.col, size: [0.3, 1.8 * c.s], ease: 2, life: c.D(0.3), spin: 2, fadeOut: 0.7, alpha: 0.7 });
      after(c.D(0.24), function () {
        var land = mp(mob);
        flare(up, 0xffffff, 1.2 * c.s, 0.14, { white: true }); ring(up, c.col, 1.3 * c.s, 0.22);
        homing({ from: up, to: function () { if (mob.alive) land = mp(mob); return land; }, time: c.D(0.17), fancy: false, ease: function (x) { return x * x; }, heads: [],
          emit: function (p, v, dt) { spear.set(p, v, dt); if (Math.random() < dt * 70 * c.n) E({ pos: p.clone().add(rdir(0.1)), vel: rdir(0.7), frame: pick(['snow', 'dot']), color: 0xffffff, size: rr(0.07, 0.14), life: rr(0.3, 0.5), white: true, spin: 3 }); },
          onHit: function (p) {
            var g = V(p.x, 0, p.z);
            spear.kill(); P3.iceSpikes(g, { size: 1.15 * Math.min(1.3, c.s), n: 7, col: c.col });
            // it goes in, and a crown of ice bursts out the far side
            for (var s = 0; s < 9; s++) { var a = s / 9 * 6.283; E({ sys: 'norm', pos: p.clone().add(V(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.2)), vel: V(Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0), frame: 'shard', color: pick(ICE), size: [0.1, rr(0.7, 1.1) * c.s], ar: 2.4, rot: a - 1.5708, ease: 1, life: c.D(0.5), drag: 4, fadeOut: 0.7, white: true }); }
            if (mob.alive) iceBurst(c, mob, 1.3, true);
            E({ sys: 'gadd', pos: V(g.x, 0.04, g.z), frame: 'frost', color: 0xdff4ff, size: [0.5, 4.6 * c.s], ease: 1, life: 0.9, fadeOut: 0.5, alpha: 0.8 });
            smoke(V(g.x, 0.3, g.z), 0xe8f8ff, N(5, c), { size: 1.0, alpha: 0.4, rise: 0.3 });
            sc.flash('rgba(210,240,255,0.45)', 0.2); sc.light(p, c.col, 1.8, 0.4); heavy(1.4);
            c.hit(mob, 1, 2);
          } });
      });
    };
    // Frost ring: frost bursts out from the wizard's feet and runs over the whole ground; each monster freezes as the ring reaches it.
    S.frostRing = function (c) {
      sc.heroPose('spin', c.D(0.12), c.col);
      var H = sc.heroCenter(), G = V(H.x, 0.04, H.z);
      converge(V(H.x, 0.3, H.z), [0xffffff, c.col], N(16, c), 1.4, c.D(0.14), { frame: 'snow' });
      circle(G, c.col, 1.6, c.D(0.4), { spin: 4 });
      after(c.D(0.14), function () {
        var r = 0;
        sc.flash('rgba(210,240,255,0.45)', 0.2); sc.punch(0.05); sc.shake(0.2);
        E({ sys: 'gadd', pos: G, frame: 'frost', color: 0xdff4ff, size: [0.6, 11], ease: 1, life: 0.95, fadeOut: 0.6, alpha: 0.7 });
        fieldWave(G, c.col, 0.75, 0xffffff); ring(H, 0xffffff, 3.2, 0.3);
        // little crystals stand up along the ring as it travels, and cold mist rolls ahead of it
        tick(function (dt) {
          r += 13 * c.sp * dt;
          for (var i = 0; i < N(4, c); i++) { var a = rr(0, 6.283), p = V(G.x + Math.cos(a) * r, 0, G.z + Math.sin(a) * r); if (Math.abs(p.x) < 4.2 && p.z > -4.8 && p.z < 4) { iceSpike(p, rr(0.35, 0.7) * c.s, c.D(0.5), rr(-0.3, 0.3)); if (i % 2) E({ sys: 'norm', pos: V(p.x, 0.15, p.z), vel: V(Math.cos(a) * 3, 0.3, Math.sin(a) * 3), frame: 'smoke', color: 0xe8f8ff, size: [0.3, 0.9], ease: 1, life: 0.6, alpha: 0.35, drag: 2 }); } }
          return r > 10.5;
        });
        ringHits(c, G, 13, 10.5, function (m) { iceBurst(c, m); sc.shake(0.05); c.hit(m, 1, 1.0); });
      });
    };
    // Glacier spikes: the staff is slammed down and cracks run along the ground to four monsters, small spikes shooting up
    // all the way, and a great spike comes up under each of them.
    S.spikes = function (c) {
      var list = c.pool().slice(0, 4); if (!list.length) return;
      sc.heroPose('swipe', c.D(0.12), c.col);
      after(c.D(0.12), function () {
        var H = sc.heroCenter(), G0 = V(H.x, 0, H.z);
        gRing(G0, c.col, 1.8, 0.3); dust(G0, N(5, c), 1.1); sc.shake(0.12);
        list.forEach(function (mob, i) {
          var t = 0, T_RUN = c.D(0.24 + i * 0.05), done = 0, to = gp(mob);
          tick(function (dt) {
            t += dt; var k = Math.min(1, t / T_RUN); if (mob.alive) to = gp(mob);
            while (done + 0.13 <= k) {
              done += 0.13;
              var p = G0.clone().lerp(to, done).add(V(rr(-0.12, 0.12), 0, rr(-0.12, 0.12)));
              P3.iceSpike(p, { h: (0.4 + 0.5 * done) * c.s, lean: rr(-0.25, 0.25), life: c.D(0.5) + 0.1, col: c.col }); gRing(p, c.col, 0.7 * c.s, 0.25);
              E({ sys: 'gadd', pos: V(p.x, 0.04, p.z), frame: 'frost', color: c.col, size: [0.2, 1.0], life: 0.7, alpha: 0.7, fadeOut: 0.5 });
            }
            if (k < 1) return false;
            if (mob.alive) { iceBurst(c, mob, 1.25, true); P3.iceSpikes(gp(mob), { size: 1.1 * Math.min(1.3, c.s), n: 6, col: c.col }); }
            sc.shake(0.12); sc.light(mp(mob), c.col, 1.4, 0.3); if (!i) sc.flash('rgba(210,240,255,0.3)', 0.15);
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
      E({ sys: 'gadd', pos: V(g0.x, 0.045, g0.z), frame: 'circle', color: c.col, size: [3.6 * c.s, 1.3 * c.s], life: c.D(0.5), spin: 3, fadeIn: 0.15, alpha: 0.9 });
      E({ sys: 'gadd', pos: V(g0.x, 0.04, g0.z), frame: 'ring', color: 0xffffff, size: [4.2, 0.8], life: c.D(0.5), rot: 0, alpha: 0.7, fadeIn: 0.2 });
      E({ pos: above(g0, 5.6).add(V(2.2, 0, 0)), frame: 'flare', color: [0xffffff, c.col], size: [0.1, 1.8], ease: 2, life: c.D(0.3), spin: 3, white: true });
      after(c.D(0.24), function () {
        // one great stone wrapped in golden fire (the meteor rain's 3D rock, bigger and gold), the ground under it
        // darkening as it comes, and star dust shed all the way down
        var land = mp(mob), from = above(gp(mob), 7.6).add(V(3.4, 0, 0)), cs = Math.min(1.6, c.s), R = 0.75 * cs;
        var rock = P3.rock({ size: R, col: 0xffe27a, hot: 0xffb030 }), spot = P3.mark({ col: 0xffd060 });
        homing({ from: from, to: function () { if (mob.alive) land = mp(mob); return land; }, time: c.D(0.3), ease: function (x) { return x * x; }, fancy: false, heads: [],
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
      sc.heroPose('thrust', c.D(0.1), c.col);
      seal(c.from.clone().add(V(0.1, 0, 0.05)), c.col, 0.9 * c.s, c.D(0.7));
      volley(c, { shots: 12, t0: 0.1, span: 0.5, fire: function (mob, frac, i) {
        if (!mob) return;
        var tip = sc.heroPaw(), star = picHead('starShot-star', 0.95 * c.s, -0.72, 0.77, 0.273);
        flare(tip, 0xffffff, 0.6 * c.s, 0.08, { white: true }); if (i % 3 === 0) ring(tip, c.col, 0.7 * c.s, 0.15);
        homing({ from: tip, to: function () { return mp(mob); }, time: c.D(0.13), arc: V(0, rr(-0.3, 0.5), rr(-0.3, 0.3)), fancy: false,
          trail: { w: 0.12 * c.s, col: c.col, core: 0.9, pts: 10, halo: false },
          heads: [{ frame: 'star', color: 0xffffff, size: 0.42 * c.s, spin: 14, white: true }, { frame: 'glow', color: c.col, size: 0.9 * c.s, alpha: 0.3 }],
          emit: function (p, v, dt) { if (star) star.set(p, v, dt); },
          onHit: function (p) {
            if (star) star.kill();
            impact(p, c.col, 0.55 * c.s); sc.shake(0.03);
            c.hit(mob, frac, 0.5);
          } });
      } });
    };
    // Constellation: a star lights up over every monster and lines join them into a picture — then every star drops at the same moment.
    S.constel = function (c) {
      sc.heroPose('raise', c.D(0.16), c.col); sc.dim(0.5, c.D(1.0));
      var list = c.pool(), marks = [], lines = [], T_DROP = c.D(0.46);
      function over(m) { return above(gp(m), 2.7 + (m.boss ? 0.8 : 0)); }
      list.forEach(function (m, i) {
        after(c.D(0.04 + i * (0.3 / list.length)), function () {
          if (!m.alive) return;
          var p = over(m), st = E({ pos: p, frame: 'star', color: 0xffffff, size: 0.6 * c.s, life: 30, upd: function (q) { var o = over(m); q.x = o.x; q.y = o.y; q.z = o.z; return true; }, fadeOut: 1, white: true, spin: 3 });
          marks.push({ m: m, p: st }); ring(p, c.col, 1.0 * c.s, 0.25); glow(p, c.col, [0.3, 1.2 * c.s], 0.3, { ease: 1, alpha: 0.6 });
          if (marks.length > 1) {
            var prev = marks[marks.length - 2].m, pts = [V(), V(), V()];
            var rb = vx.ribbon({ mode: 'static', hold: true, taper: 'bolt', pts: pts, w: 0.035, color: c.col, core: 1.2, alpha: 0.9, life: 30, upd: function (r) { var a = over(prev), b = over(m); r.pts[0].copy(a); r.pts[1].lerpVectors(a, b, 0.5); r.pts[2].copy(b); } });
            if (rb) lines.push(rb);
          }
        });
      });
      after(T_DROP, function () {
        kill(marks.map(function (x) { return x.p; })); lines.forEach(function (r) { r.kill(); });
        sc.flash('rgba(200,220,255,0.6)', 0.3); sc.shake(0.3); sc.hitStop(0.05);
        c.pool().forEach(function (m) {
          var from = over(m);
          shaft(gp(m), 3.4, 0.12, [0xffffff, c.col], 0.22, { fadeOut: 0.4 });
          homing({ from: from, to: function () { return mp(m); }, time: c.D(0.08), fancy: false, trail: { w: 0.16 * c.s, col: c.col, core: 1.2, pts: 12, halo: false },
            heads: [{ frame: 'star', color: 0xffffff, size: 0.7 * c.s, spin: 16, white: true }, { frame: 'glow', color: c.col, size: 1.2 * c.s, alpha: 0.4 }],
            onHit: function (p) { impact(p, c.col, 0.95 * c.s); gRing(V(p.x, 0, p.z), c.col, 2.0 * c.s, 0.4); c.hit(m, 1, 1.4); } });
        });
      });
    };

    // =================================================================== 6차: 달
    // Crescent blades: three great crescents are cut loose across the whole field, one after another; each cuts every monster it passes.
    S.crescents = function (c) {
      sc.heroPose('swipe', c.D(0.1), c.col); sc.dim(0.35, c.D(0.85));
      var dir = sc.heroState().faceT > 0 ? 1 : -1, SZ = 3.4, TALL = 1.9;
      for (var b = 0; b < 3; b++) (function (b) {
        after(c.D(0.1 + b * 0.13), function () {
          var x = -4.6 * dir - dir * SZ * 0.4, hit = [], tilt = (b - 1) * 0.16, rot = (dir > 0 ? 0 : Math.PI) + tilt, P = V(x, 1.0, -0.4);
          var parts = [E({ pos: P, frame: 'crescent', color: c.col, size: SZ * 1.12, ar: TALL, life: 30, upd: STAY, fadeOut: 1, rot: rot, alpha: 0.4 }), E({ sys: 'col', pos: P, frame: 'crescent', color: c.deep, size: SZ, ar: TALL, life: 30, upd: STAY, fadeOut: 1, rot: rot, alpha: 0.55 }), E({ pos: P, frame: 'crescent', color: 0xffffff, size: SZ * 0.8, ar: TALL * 1.2, life: 30, upd: STAY, fadeOut: 1, rot: rot, alpha: 0.6, white: true })];
          sc.shake(0.08); if (!b) sc.flash('rgba(230,225,255,0.35)', 0.18);
          tick(function (dt) {
            x += dir * 21 * c.sp * dt; P.x = x; put(parts, P);
            var front = x + dir * SZ * 0.4;
            for (var i = 0; i < N(3, c); i++) E({ pos: V(front - dir * rr(0, 0.8), rr(0.2, 1.8), rr(-4.4, 3.6)), vel: V(-dir * rr(1, 3), rr(-0.5, 0.8), 0), frame: pick(['crescent', 'flare', 'dot']), color: [0xffffff, c.col], size: [rr(0.12, 0.28), 0.02], life: rr(0.25, 0.5), spin: rr(-6, 6) });
            c.pool().forEach(function (m) {
              if (hit.indexOf(m) >= 0 || (m.x - front) * dir > 0) return;
              hit.push(m);
              var q = mp(m), R_ = 0.8 * c.s, a = V(q.x - 0.6 * R_ * dir, q.y + 0.6 * R_ + tilt, q.z + 0.3), e = V(q.x + 0.6 * R_ * dir, q.y - 0.5 * R_ - tilt, q.z + 0.3), bez = new T.QuadraticBezierCurve3(a, V(q.x + 0.2 * dir, q.y + 0.2, q.z + 0.45), e), pts = [];
              for (var k = 0; k <= 12; k++) pts.push(bez.getPoint(k / 12));
              vx.ribbon({ mode: 'static', sweep: true, pts: pts, w: 0.34 * c.s, color: c.col, core: 0, alpha: 0.35, life: c.D(0.28) });
              vx.ribbon({ solid: true, mode: 'static', sweep: true, pts: pts, w: 0.12 * c.s, color: c.deep, core: 0.8, life: c.D(0.34) });
              sparks(q, [c.col, 0xffffff], N(6, c), 6, { dir: V(dir, 0.2, 0), spread: 0.4, size: 0.2 * c.s, stretch: 0.12 });
              flare(q, 0xffffff, 0.7 * c.s, 0.1, { white: true }); sc.shake(0.04);
              c.hit(m, 1 / 3, b === 2 ? 1.3 : 0.8);
            });
            if (front * dir < 5.4) return false;
            kill(parts); return true;
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
        if (mob.alive) land = mp(mob);
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
      var list = c.pool().slice(0, 5); if (!list.length) return;
      sc.heroPose('raise', c.D(0.16), c.col); sc.dim(0.35, c.D(0.9));
      var H = sc.heroCenter(), shots = share(list, 5);
      shots.forEach(function (h, i) {
        var a = -0.5 + i * 0.55 + 0.4, O = V(H.x + Math.cos(a + 1.2) * 1.25, H.y + 0.9 + Math.sin(a + 1.2) * 0.55, H.z - 0.2), parts = null;
        after(c.D(i * 0.03), function () {
          parts = [E({ sys: 'col', pos: O, frame: 'dot', color: 0xf6f2ff, size: 0.36 * c.s, life: 30, upd: STAY, fadeOut: 1 }), E({ pos: O, frame: 'glow', color: c.col, size: 1.0 * c.s, life: 30, upd: STAY, fadeOut: 1, alpha: 0.6 }), E({ pos: O, frame: 'crescent', color: 0xffffff, size: 0.5 * c.s, life: 30, upd: STAY, fadeOut: 1, white: true, spin: 3 })];
          ring(O, c.col, 0.8 * c.s, 0.2);
        });
        after(c.D(0.2 + i * 0.05), function () {
          var mob = h.mob, st = { a: O.clone(), b: O.clone(), open: 1 }, beam = beamOf(st, c.col, 0.36 * c.s, 0x8a6cff), t = 0, T_OUT = c.D(0.06), T_HOLD = c.D(0.2), T_END = c.D(0.08), hits = 0, to = mp(mob);
          flare(O, 0xffffff, 0.9 * c.s, 0.12, { white: true });
          tick(function (dt) {
            t += dt; if (mob.alive) to = mp(mob);
            st.b.lerpVectors(O, to, Math.min(1, t / T_OUT)); st.open = t > T_OUT + T_HOLD ? Math.max(0, 1 - (t - T_OUT - T_HOLD) / T_END) : 1;
            // the beam burns twice while it is held on the monster
            if ((hits === 0 && t >= T_OUT) || (hits === 1 && t >= T_OUT + T_HOLD * 0.6)) {
              hits++;
              flare(to, 0xffffff, 1.0 * c.s, 0.12, { white: true }); sparks(to, [0xffffff, c.col], N(6, c), 5, { size: 0.16 }); if (hits === 1) { ring(to, c.col, 1.2 * c.s, 0.22); sc.light(to, c.col, 1.3, 0.3); sc.shake(0.05); }
              c.hit(mob, h.frac / 2, hits === 1 ? 1.1 : 0.7);
            }
            if (t < T_OUT + T_HOLD + T_END) return false;
            beam.kill(); if (parts) kill(parts); sparks(O, [0xffffff, c.col], N(5, c), 3, { size: 0.14 });
            return true;
          });
        });
      });
    };

    // =================================================================== 7차: 태양
    // Sun spear: a spear of sunlight is drawn out of the air and thrown straight through one monster; then it bursts.
    S.sunspear = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('thrust', c.D(0.26), c.col); sc.dim(0.4, c.D(0.95));
      // the spear is a gold crystal (the ice lance's 3D spear, gold with a dark amber outline and no frost mist)
      var up = sc.heroCenter().add(V(0, 1.4, -0.2)), aim = mp(mob), t = 0, T_FORM = c.D(0.26), T_FLY = c.D(0.11), L = 1.9 * c.s, P = up.clone(), dir = V(), stage = 0, end = V(), hit = false;
      var spear = P3.iceSpear({ size: L, col: 0xffe08a, deep: 0xff8a1a, line: 0x6a3a08, mist: false }), vel = V();
      converge(up, [0xffffff, 0xffd84a, 0xff9a40], N(22, c), 1.5, T_FORM); seal(up, 0xffd84a, 1.1 * c.s, T_FORM);
      tick(function (dt) {
        t += dt;
        if (stage === 0) {
          if (mob.alive) aim = mp(mob);
          dir.copy(aim).sub(up).normalize(); var kf = Math.min(1, t / T_FORM);
          spear.set(up, dir, dt, kf);
          if (kf >= 1) { stage = 1; t = 0; end.copy(aim).addScaledVector(dir, 2.6); flare(up, 0xffffff, 1.6 * c.s, 0.14, { white: true }); ring(up, 0xffd84a, 1.6 * c.s, 0.2); sc.punch(0.05); }
          return false;
        }
        if (stage === 1) {
          var k = Math.min(1, t / T_FLY), dist = aim.distanceTo(up), pass = dist / (dist + 2.6);
          P.lerpVectors(up, end, k); vel.copy(dir).multiplyScalar(up.distanceTo(end) / Math.max(1e-3, T_FLY)); spear.set(P, vel, dt);
          // sparks of sunlight stream off its back end
          if (Math.random() < dt * 140 * c.n) E({ pos: P.clone().addScaledVector(dir, -L * 0.7).add(rdir(0.15)), vel: dir.clone().multiplyScalar(-3).add(rdir(1)), frame: pick(['streak', 'flare', 'dot']), color: [0xffffff, 0xffe14a, 0xff8a2b], size: [rr(0.14, 0.3), 0.03], life: rr(0.2, 0.4), stretch: 0.08 });
          if (k >= pass && !hit) {
            hit = true;
            sc.flash('rgba(255,235,160,0.5)', 0.4); sc.hitStop(0.07); sc.shake(0.4);
            flare(aim, 0xffe08a, 1.5 * c.s, 0.16); shock(aim, 0xffd84a, 3.6 * c.s, 0.35);
            sparks(aim, [0xffffff, 0xffe14a, 0xff8a2b], N(26, c), 11, { dir: dir, spread: 0.5, size: 0.26, stretch: 0.16, life: 1.1 });
            c.hit(mob, 0.6, 2.2);
          }
          if (k < 1) return false;
          stage = 2; t = 0; return false;
        }
        // past the monster it fades out where it stopped
        var fade = Math.max(0, 1 - t / c.D(0.12));
        if (fade > 0) { spear.set(P, vel, dt, fade); return false; }
        spear.kill();
        // the light it left in the monster goes off as a pillar: a 3D beam shooting up out of the ground, open and closed
        // again in 0.36 s, over a golden blast
        var q = mob.alive ? mp(mob) : aim, g = V(q.x, 0, q.z), top = g.clone(), pT = 0, PL = 0.36;
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
        return true;
      });
    };
    // Sunlight arrows: a small sun opens high to one side and looses arrow after arrow of light, each one into a monster.
    S.sunArrows = function (c) {
      sc.heroPose('raise', c.D(0.14), c.col);
      var side = sc.heroState().faceT > 0 ? -1 : 1, sun = above(V(2.3 * side, 0, -1.2), 4.6), life = c.D(0.85);
      E({ pos: sun, frame: 'glow', color: [0xffd84a, 0xffa040], size: [0.3, 2.4 * c.s], ease: 1, life: life, hot: 1.4, fadeOut: 0.8 });
      E({ pos: sun, frame: 'flare', color: 0xffffff, size: [0.2, 2.0 * c.s], ease: 1, life: life, spin: 1.6, white: true, fadeOut: 0.8 });
      E({ pos: sun, frame: 'circle', color: 0xffe14a, size: [0.4, 2.0 * c.s], ease: 2, life: life, spin: 2.4, fadeOut: 0.8 });
      volley(c, { shots: 14, t0: 0.17, span: 0.5, fire: function (mob, frac) {
        if (!mob) return;
        var from = sun.clone().add(rdir(0.35));
        flare(from, 0xffffff, 0.5, 0.08, { white: true });
        homing({ from: from, to: function () { return mp(mob); }, time: c.D(0.15), fancy: false,
          trail: { w: 0.1 * c.s, col: 0xffd84a, core: 1.4, pts: 16, shrink: 80 },
          heads: [{ frame: 'streak', color: 0xffffff, size: 1.0 * c.s, stretch: 0.02, white: true }, { frame: 'glow', color: 0xffd84a, size: 0.7 * c.s, alpha: 0.5 }],
          onHit: function (p) {
            var g = V(p.x, 0, p.z);
            flare(p, 0xffffff, 1.0 * c.s, 0.12, { white: true }); shaft(g, 2.6, 0.16, [0xffffff, 0xffd84a], 0.22, { fadeOut: 0.4 });
            sparks(p, [0xffffff, 0xffe14a, 0xff9a40], N(7, c), 5.5, { size: 0.18, up: 1.5 }); gRing(g, 0xffd84a, 1.5 * c.s, 0.3); fire(p, N(2, c), { size: 0.7, speed: 1.4, up: 1.6 });
            sc.light(p, 0xffe080, 1.2, 0.25); sc.shake(0.04);
            c.hit(mob, frac, 0.8);
          } });
      } });
    };
    // Corona ring: the wizard flares up like a small sun and a ring of fire tears outward over the whole ground, tongues of flame arcing off it.
    S.corona = function (c) {
      sc.heroPose('spin', c.D(0.14), c.col);
      var H = sc.heroCenter(), G = V(H.x, 0.04, H.z);
      glow(H, 0xffb030, [0.3, 2.2 * c.s], c.D(0.2), { fadeIn: 0.5, hot: 1.4 }); converge(H, [0xffffff, 0xffd84a, 0xff9a40], N(18, c), 1.6, c.D(0.14));
      for (var i = 0; i < 8; i++) E({ pos: H, frame: 'streak', color: [0xffffff, 0xffd84a], size: [0.3, 2.6 * c.s], ease: 1, life: c.D(0.24), rot: i / 8 * 3.1416, alpha: 0.7, spin: 2 });
      after(c.D(0.14), function () {
        var r = 0.3;
        sc.flash('rgba(255,200,110,0.5)', 0.25); sc.punch(0.07); sc.shake(0.3);
        flare(H, 0xffffff, 2.2 * c.s, 0.18, { white: true }); fieldWave(G, 0xffa040, 0.75, 0xffe14a); shock(H, 0xffd84a, 4, 0.3);
        tick(function (dt) {
          r += 12.5 * c.sp * dt;
          for (var j = 0; j < N(7, c); j++) {
            var a = rr(0, 6.283), p = V(G.x + Math.cos(a) * r, 0.3, G.z + Math.sin(a) * r);
            if (Math.abs(p.x) > 4.4 || p.z < -5 || p.z > 4.2) continue;
            fire(p, 1, { size: rr(0.7, 1.0) * c.s, speed: 0.5, up: 3.2, life: 0.75, v: V(Math.cos(a) * 4, 0, Math.sin(a) * 4) });
            if (j === 0) {
              // a tongue of flame loops up off the ring and falls back
              var q = V(G.x + Math.cos(a + 0.35) * r, 0.2, G.z + Math.sin(a + 0.35) * r), bez = new T.QuadraticBezierCurve3(V(p.x, 0.2, p.z), above(V((p.x + q.x) / 2, 0, (p.z + q.z) / 2), 1.8), q), pts = [];
              for (var k = 0; k <= 10; k++) pts.push(bez.getPoint(k / 10));
              vx.ribbon({ mode: 'static', sweep: true, pts: pts, w: 0.16 * c.s, color: 0xff8a2b, core: 1, life: 0.3 });
            }
          }
          if (Math.random() < dt * 16) scorch(V(G.x + Math.cos(rr(0, 6.28)) * r, 0, G.z + Math.sin(rr(0, 6.28)) * r), 0.8, 1.6);
          return r > 10.5;
        });
        ringHits(c, G, 12.5, 10.5, function (m) { fireBurst(c, m, 1.1); sc.shake(0.05); c.hit(m, 1, 1.4); });
      });
    };

    // =================================================================== 8차: 공허
    // Void rift: a tear is cut across the whole field. Dark arms whip out of it at every monster — then it snaps shut and bursts along its length.
    S.rift = function (c) {
      sc.heroPose('swipe', c.D(0.14), c.col); sc.dim(0.55, c.D(1.05));
      var M = V(c.center.x * 0.4, 1.3, c.center.z * 0.4 - 0.3), slope = Math.random() < 0.5 ? 1 : -1, A = V(M.x - 4.4, M.y + 1.0 * slope, M.z - 1.2 * slope), B = V(M.x + 4.4, M.y - 1.0 * slope, M.z + 1.2 * slope);
      var path = vx.boltPath(A, B, 14, 0.035), t = 0, T_CUT = c.D(0.16), T_OPEN = c.D(0.5), T_SHUT = c.D(0.07), open = 0, cut = 0, whipped = false;
      function wf(mul) { return function (u) { return u <= cut ? open * mul * (0.5 + Math.sin(u * 40 + t * 30) * 0.12 + Math.sin(u * 3.14) * 0.6) : 0; }; }
      var ribs = [vx.ribbon({ mode: 'static', hold: true, taper: 'bolt', pts: path, w: 0.6 * c.s, color: c.col, core: 0, alpha: 0.5, life: 30, widthFn: wf(1) }),
        vx.ribbon({ mode: 'static', hold: true, taper: 'bolt', pts: path, w: 0.3 * c.s, color: 0xffb8f4, core: 1.4, alpha: 0.9, life: 30, widthFn: wf(1) }),
        vx.ribbon({ solid: true, mode: 'static', hold: true, taper: 'bolt', pts: path, w: 0.2 * c.s, color: 0x07020e, core: 0, alpha: 1, life: 30, widthFn: wf(1) })];
      function at(u) { var f = u * (path.length - 1), i = Math.min(path.length - 2, Math.floor(f)); return path[i].clone().lerp(path[i + 1], f - i); }
      tick(function (dt) {
        t += dt; cut = Math.min(1, t / T_CUT);
        open = t < T_OPEN ? Math.min(1, t / (T_CUT * 0.6)) : Math.max(0, 1 - (t - T_OPEN) / T_SHUT);
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
        ribs.forEach(function (r) { if (r) r.kill(); });
        // it snaps shut: the whole seam goes off at once
        sc.flash('rgba(220,170,255,0.85)', 0.6); sc.hitStop(0.08); sc.shake(0.5); sc.punch(0.1);
        for (var s = 0; s <= 6; s++) { var p = at(s / 6); flare(p, 0xffffff, 1.6 * c.s, 0.18, { white: true }); shock(p, s % 2 ? 0xff6ad8 : c.col, 3.4 * c.s, 0.4, { delay: s * 0.012 }); sparks(p, [0xffffff, c.col, 0xff6ad8], N(8, c), 9, { size: 0.24, stretch: 0.14, life: 1.1 }); }
        var pa = A.clone().project(sc.camera), pb = B.clone().project(sc.camera);
        E({ pos: M, frame: 'streak', color: [0xffffff, c.col], size: [7, 7], ar: 0.3, rot: Math.atan2(pb.y - pa.y, (pb.x - pa.x) * (sc.camera.aspect || 1)), life: 0.25, fadeOut: 0.3 });
        fieldWave(V(M.x, 0, M.z), c.col, 0.8, 0xff6ad8); gRing(V(M.x, 0, M.z), c.col, 11, 0.7);
        c.pool().forEach(function (m) { var q = mp(m); impact(q, pick([c.col, 0xff6ad8]), 1.2 * c.s); gRing(gp(m), c.col, 2.0 * c.s, 0.4); c.hit(m, 0.5, 1.9); });
        return true;
      });
    };
    // Gravity crush: gravity lets go — every monster on the field floats up off the ground, helpless — and then comes
    // back tenfold: they are all slammed down together.
    S.crush = function (c) {
      sc.heroPose('raise', c.D(0.16), c.col); sc.dim(0.5, c.D(1.2));
      var held = [], t = 0, T_UP = c.D(0.36), T_HANG = c.D(0.2), G = V(c.center.x * 0.5, 0.04, c.center.z * 0.5 - 0.2);
      E({ sys: 'gadd', pos: G, frame: 'circle', color: c.col, size: [1, 9 * c.s], ease: 1, life: T_UP + T_HANG, spin: 1.6, fadeOut: 0.85, alpha: 0.8 });
      E({ sys: 'gadd', pos: G, frame: 'glow', color: [c.col, 0x6a2ad0], size: [2, 6], life: T_UP + T_HANG, alpha: 0.4, fadeIn: 0.2, fadeOut: 0.8 });
      // dust and pebbles drift up off the whole ground with them
      fieldRain(c, 60, T_UP, { y: function () { return rr(0.05, 0.3); }, vel: function () { return UPC.clone().multiplyScalar(rr(1.2, 3.2)); }, frames: ['dot', 'shard', 'flare'], cols: [K.dustCol(), c.col], size: function () { return [rr(0.08, 0.18), 0.05]; }, life: 0.9, sway: true });
      tick(function (dt) {
        t += dt;
        var ku = Math.min(1, t / T_UP), h = 1 - (1 - ku) * (1 - ku);
        liveMobs().forEach(function (m) {
          if (held.indexOf(m) < 0) { held.push(m); ring(mp(m), c.col, 1.2 * c.s, 0.25); }
          m.pull = m.x; m.pullZ = m.z; m.lift = true;
          m.y = ((m.boss ? 0.8 : 1.6) + Math.sin(t * 9 + (m.phase || 0)) * 0.07) * h; m.vy = 0;
          if (Math.random() < dt * 8 * c.n) E({ pos: V(m.x + rr(-0.3, 0.3), 0.1, m.z), vel: UPC.clone().multiplyScalar(rr(2, 4)), frame: 'streak', color: [0xffffff, c.col], size: [0.2, 0.04], life: 0.35, stretch: 0.1 });
        });
        if (t < T_UP + T_HANG) return false;
        held.forEach(function (m) { m.pull = undefined; m.pullZ = undefined; m.lift = undefined; if (m.alive) { if (m.frozen > 0) m.y = 0; else m.vy = -30; } });
        sc.flash('rgba(200,150,255,0.5)', 0.25);
        // a weight of darkness comes down on each of them
        liveMobs().forEach(function (m) { shaft(gp(m), 6, 0.4 * (m.boss ? 1.7 : 1), [0x1a0630, c.col], 0.22, { sys: 'col', alpha: 0.85, fadeOut: 0.3 }); shaft(gp(m), 6, 0.1, [0xffffff, c.col], 0.16, {}); });
        after(c.D(0.07), function () {
          sc.flash('rgba(220,170,255,0.9)', 0.6); sc.hitStop(0.09); sc.slowmo(0.2, 0.4); sc.shake(0.65); sc.punch(0.13);
          fieldWave(G, c.col, 0.8, 0xff6ad8); gRing(G, c.col, 11, 0.7); shock(V(G.x, 0.6, G.z), c.col, 8.5, 0.55);
          for (var b = 0; b < N(24, c); b++) { var p = fieldPt(0.1); E({ sys: 'norm', pos: p, vel: V(rr(-1.5, 1.5), rr(3, 7), rr(-1, 1)), frame: 'shard', color: K.dustCol(), size: rr(0.12, 0.24), life: rr(0.5, 0.9), grav: 13, spin: rr(-9, 9), white: true }); }
          liveMobs().forEach(function (m) {
            var g = gp(m), q = mp(m);
            gRing(g, c.col, 2.6 * c.s * (m.boss ? 1.5 : 1), 0.45); gRing(g, 0xffffff, 1.6 * c.s, 0.3); scorch(g, 1.2 * (m.boss ? 1.6 : 1), 2.4); dust(g, N(5, c), 1.3);
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
        homing({ from: from, to: function () { if (mob.alive) land = mp(mob); return land; }, time: c.D(0.3), arc: V(0, 0.6, 0), fancy: false, ease: function (x) { return x; },
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
            tick(function (dt) { sinkT += dt; var k = Math.min(1, sinkT / sinkL); star.move(mob.alive ? mp(mob) : p); star.set(R * (1 - k * 0.95), 1 - k * 0.6, dt); if (k < 1) return false; star.kill(); return true; });
            sc.shake(0.15); c.hit(mob, 0.3, 1.2);
            after(c.D(0.1), function () {
              var q = mob.alive ? mp(mob) : p;
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

    // =================================================================== 9차: 원소
    // One element coming down on a monster, big enough to read at a glance. big: the lead drop of its wave (larger, heavier).
    // A coloured warning circle opens on the ground first, then the element falls into it; done(pos) runs as it lands.
    var ELRGBA = ['rgba(255,120,40,0.42)', 'rgba(140,210,255,0.48)', 'rgba(220,245,255,0.42)', 'rgba(255,225,90,0.40)', 'rgba(170,120,255,0.44)'];
    function elemDrop(c, mob, kind, big, done) {
      var col = ELC[kind], g = gp(mob), to = function () { return mp(mob); }, B = (big ? 1.35 : 0.9) * Math.min(1.25, c.s) * (mob.boss ? 1.2 : 1);
      // warning circle: the element's colour and shape on the ground where it is about to land
      E({ sys: 'gadd', pos: V(g.x, 0.04, g.z), frame: 'circle', color: col, size: [0.4, 2.1 * B], ease: 1, life: c.D(0.34), spin: 2.2, alpha: 0.75, fadeIn: 0.3, fadeOut: 0.4 });
      E({ sys: 'gadd', pos: V(g.x, 0.05, g.z), frame: kind === 0 ? 'flame' : kind === 1 ? 'streak' : kind === 2 ? 'frost' : kind === 3 ? 'star' : 'crescent', color: col, size: [0.2, 1.2 * B], ease: 1, life: c.D(0.3), spin: -3, alpha: 0.6, fadeIn: 0.3 });
      function land(p) {
        var q = p || mp(mob), gg = V(q.x, 0, q.z);
        if (big) { sc.flash(ELRGBA[kind], 0.14); heavy(1.0); } else heavy(0.35);
        sc.light(q, col, big ? 2.4 : 1.5, big ? 0.4 : 0.25);
        gRing(gg, col, 2.6 * B, 0.45); shock(q, col, 2.2 * B, 0.35);
        done(q);
      }
      if (kind === 0) {
        // fire: a burning meteor falls in a slant with a thick flame trail and smoke, and blows up into a fire blast
        var ball = P3.fireball({ size: 0.24 * B, col: 0xff6a1a });
        homing({ from: skyStart(g, rr(1.0, 1.6), -0.4), to: to, time: c.D(big ? 0.42 : 0.34), fancy: false, noMuzzle: true, ease: function (x) { return x * x * 0.7 + x * 0.3; }, heads: [],
          emit: function (p, v, dt) {
            ball.set(p, v, dt);
            var back = v.clone().multiplyScalar(-0.1);
            if (Math.random() < dt * 34 * c.n) trailFire(p, v, 0.24 * B, { size: 0.5 * B, speed: 0.6, up: 0.4, life: 0.7, v: back });
            if (Math.random() < dt * 30 * c.n) E({ sys: 'norm', pos: p.clone(), vel: back.clone().add(V(0, 0.5, 0)), frame: 'smoke', color: 0x4a3c38, size: [0.3 * B, 1.0 * B], ease: 1, life: 0.7, alpha: 0.4, drag: 2, fadeIn: 0.2 });
            if (Math.random() < dt * 40 * c.n) E({ pos: p.clone(), vel: rdir(1.8).add(back), frame: 'dot', color: [0xffe080, 0xff5a1a], size: [0.09, 0], life: 0.45, grav: 2, stretch: 0.1 });
          },
          onHit: function (p) {
            ball.kill();
            P3.blast(V(p.x, 0, p.z), { size: (big ? 0.7 : 0.5) * B, col: 0xff8a2b, flash: true, chips: 3, ring: 2.2, life: 0.7 }); if (mob.alive) fireBurst(c, mob, 0.9 * B);
            shaft(V(p.x, 0, p.z), 2.8 * B, 0.32, [0xffffff, 0xffc23a, 0xff5a1a], 0.26, { hot: 1.2, fadeOut: 0.4 });
            embers(p, [0xffe080, 0xff6a2b], N(big ? 12 : 6, c), { speed: 3.2, up: 3, grav: 3 }); scorch(V(p.x, 0, p.z), 1.3 * B, 2.6);
            land(p);
          } });
        return;
      }
      if (kind === 1) {
        // lightning: the sky flickers, then two or three thick bolts crash down at once with a white core and branches
        after(c.D(0.18), function () {
          var n = big ? 3 : 2;
          for (var b = 0; b < n; b++) skyBolt(c, b ? mp(mob).add(rdir(0.25)) : to, (big ? 2.4 : 1.7) * B / 1.2, { col: col, core: 0x2f7dff, br: big ? 3 : 2 });
          vx.lightning(above(g, 6.5).add(V(-1.2, 0, -1)), to, { solid: true, w: 0.07 * B, color: 0xffffff, core: 1, life: c.D(0.2), branches: 2, segs: 14, amp: 0.3 });
          if (mob.alive) zapHit(c, mob, true, col);
          shaft(g, 6.5, 0.32 * B, [0xffffff, col], 0.22, { fadeOut: 0.5 });
          sparks(mp(mob), [0xffffff, col, 0x2f7dff], N(big ? 22 : 12, c), 9, { size: 0.2, stretch: 0.22, life: 0.9, up: 1.6 });
          for (var k = 0; k < 3; k++) after(c.D(0.04 + k * 0.06), function () { if (!mob.alive) return; var q2 = mp(mob); vx.lightning(q2.clone().add(rdir(0.7)), q2.clone().add(rdir(0.7)), { w: 0.06, color: col, life: 0.1, branches: 0, segs: 5, amp: 0.35 }); });
          land(mp(mob));
        });
        return;
      }
      if (kind === 2) {
        // ice: a great icicle spears down, smaller shards follow around it, and the ground freezes in a ring of spikes
        iceFall(g, (big ? 1.7 : 1.3) * B, c.D(big ? 0.26 : 0.22), function () {
          if (mob.alive) iceBurst(c, mob, 1.0 * B, true);
          var q = mp(mob);
          P3.iceSpikes(g, { size: 0.95 * B, n: big ? 8 : 5, col: col });
          E({ sys: 'gadd', pos: V(g.x, 0.04, g.z), frame: 'frost', color: 0xbfe8ff, size: [0.4, 3.4 * B], ease: 1, life: 1.0, fadeOut: 0.5, alpha: 0.85 });
          flare(q, 0xffffff, 1.8 * B, 0.18, { white: true });
          land(q);
        });
        if (big) for (var j = 0; j < 2; j++) (function (j) { var a = rr(0, 6.28), off = V(g.x + Math.cos(a) * 1.0 * B, 0, g.z + Math.sin(a) * 0.5 * B); after(c.D(0.06 + j * 0.05), function () { iceFall(off, 0.9 * B, c.D(0.2), function () { P3.iceSpikes(off, { size: 0.5 * B, n: 3, col: col }); }); }); })(j);
        return;
      }
      if (kind === 3) {
        // star: a big shining star drops with a glittering tail, bursts into a star picture and scatters little stars
        var star = picHead('starShot-star', 1.5 * B, -0.72, 0.77, 0.273);
        homing({ from: skyStart(g, rr(-1.6, -1.0), -0.3), to: to, time: c.D(big ? 0.4 : 0.32), fancy: false, noMuzzle: true, ease: function (x) { return x * x * 0.6 + x * 0.4; },
          trail: { w: 0.3 * B, col: col, core: 1, pts: 20, shrink: 40 },
          heads: [{ frame: 'glow', color: col, size: 2.0 * B, alpha: 0.55 }, { sys: 'col', frame: 'star', color: [col, deep(col)], size: 1.0 * B, spin: 9 }, { frame: 'flare', color: 0xffffff, size: 0.7 * B, white: true, spin: -6 }],
          emit: function (p, v, dt) {
            if (star) star.set(p, v, dt);
            if (Math.random() < dt * 70 * c.n) E({ pos: p.clone().add(rdir(0.2)), vel: v.clone().multiplyScalar(-0.08).add(rdir(0.6)), frame: 'star', color: [0xffffff, col], size: [rr(0.16, 0.3) * B, 0.02], life: rr(0.4, 0.7), grav: 1.5, drag: 1.5, spin: rr(-10, 10) });
          },
          onHit: function (p) {
            if (star) star.kill();
            picAt('starShot-burst', V(p.x, 0, p.z), (big ? 1.4 : 1.0) * B, 'burst', 0.3);
            E({ sys: 'col', pos: p, frame: 'star', color: [col, deep(col)], size: [0.4, 2.8 * B], ease: 1, life: 0.35, spin: 6 });
            flare(p, 0xffffff, 2.0 * B, 0.18, { white: true });
            for (var k = 0; k < N(big ? 16 : 9, c); k++) E({ pos: p, vel: rdir(4.2).add(V(0, 2.8, 0)), frame: 'star', color: [0xffffff, col], size: [rr(0.2, 0.36) * B, 0.04], life: rr(0.5, 0.9), grav: 5, drag: 1.1, spin: rr(-10, 10) });
            land(p);
          } });
        return;
      }
      // moon: a pillar of moonlight opens, a huge crescent blade spins down through it and cuts the monster in a flash
      shaft(g, 7.5, 0.55 * B, [0xffffff, col], c.D(0.4), { fadeIn: 0.4, fadeOut: 0.4 }); shaft(g, 7.5, 0.16 * B, 0xffffff, c.D(0.32), { white: true, fadeIn: 0.4 });
      var t = 0, T_ = c.D(big ? 0.26 : 0.22), blade = [E({ sys: 'col', pos: above(g, 6), frame: 'crescent', color: col, size: 2.3 * B, life: 30, upd: STAY, fadeOut: 1, spin: 14, alpha: 0.95 }), E({ pos: above(g, 6), frame: 'crescent', color: 0xffffff, size: 1.7 * B, life: 30, upd: STAY, fadeOut: 1, spin: 14, white: true, alpha: 0.85 }), E({ pos: above(g, 6), frame: 'glow', color: col, size: 3.0 * B, life: 30, upd: STAY, fadeOut: 1, alpha: 0.5 })];
      tick(function (dt) {
        t += dt; var k = Math.min(1, t / T_), q = mp(mob), P = V(q.x, q.y + (1 - k * k) * 6, q.z);
        put(blade, P);
        if (Math.random() < dt * 50 * c.n) E({ sys: 'col', pos: P.clone(), frame: 'crescent', color: col, size: [1.6 * B, 0.3], life: 0.25, spin: 14, alpha: 0.5 });
        if (k < 1) return false;
        kill(blade);
        for (var r = 0; r < 3; r++) E({ sys: r ? 'col' : 'add', pos: q, frame: 'crescent', color: r ? col : 0xffffff, size: [0.5, 2.6 * B], life: 0.35, rot: r * 2.094, spin: 9, alpha: 0.85, white: !r });
        for (var s = 0; s < 6; s++) E({ pos: q, frame: 'streak', color: [0xffffff, col], size: [0.4, rr(2.5, 4) * B], ease: 1, life: rr(0.22, 0.32), rot: s / 6 * 3.1416, alpha: 0.75, fadeOut: 0.4 });
        sparks(q, [0xffffff, col], N(big ? 18 : 10, c), 8, { size: 0.2, life: 0.9 }); flare(q, 0xffffff, 1.9 * B, 0.16, { white: true });
        land(q);
        return true;
      });
    }
    // the small burst a monster takes when its element's wave lands elsewhere
    // Is this point on the part of the battle screen the player can see (not under the top bar or the skill row)?
    function onScreen(p) { var q = p.clone().project(sc.camera); return q.x > -0.84 && q.x < 0.84 && q.y > -0.52 && q.y < 0.76 && q.z < 1; }
    // a 3D icicle dropping out of the sky, slanted a little, point first, on to the ground point g
    function iceFall(g, len, time, onLand) {
      var spear = P3.iceSpear({ size: len }), from = skyStart(g, rr(-0.8, 0.8), -0.4), end = V(g.x, len * 0.35, g.z), t = 0, cur = V(), last = from.clone(), vel = V();
      tick(function (dt) {
        t += dt; var f = Math.min(1, t / time), e = f * f;
        cur.copy(from).lerp(end, e); if (dt > 1e-4) vel.copy(cur).sub(last).multiplyScalar(1 / dt); last.copy(cur);
        spear.set(cur, vel.lengthSq() > 1e-6 ? vel : V(0, -1, 0), dt);
        if (f < 1) return false;
        spear.kill(); if (onLand) onLand(); return true;
      });
    }
    // Where something falling out of the sky starts: as high above the spot as the screen allows, so the whole fall is seen.
    function skyStart(g, dx, dz) {
      for (var h = 5.6; h > 2.4; h -= 0.4) { var p = V(g.x + dx * h / 5.6, h, g.z + dz); var q = p.clone().project(sc.camera); if (q.y < 0.74) return p; }
      return V(g.x + dx * 0.45, 2.4, g.z + dz);
    }
    function elemPopAt(c, mob, kind) {
      var col = ELC[kind], q = mp(mob), g = gp(mob);
      flare(q, 0xffffff, 0.9, 0.12, { white: true }); ring(q, col, 1.1, 0.22); gRing(g, col, 1.4, 0.3);
      E({ sys: 'col', pos: q, frame: ELF[kind], color: col, size: [0.3, 1.0], ease: 1, life: 0.28, spin: kind === 4 ? 9 : 0, rot: kind === 1 ? 1.5708 : 0, alpha: 0.85 });
      sparks(q, [0xffffff, col], N(5, c), 5, { size: 0.14 });
      if (kind === 0) fire(q, N(3, c), { size: 0.6, speed: 1.5, up: 1.8 });
    }
    // Element storm: a five-coloured wheel turns over the field and the five elements come down one after another in waves —
    // fire, lightning, ice, star, moon — each wave led by one huge drop with smaller ones of the same element beside it.
    S.elemStorm = function (c) {
      sc.heroPose('raise', c.D(0.16), 0xffffff); sc.dim(0.55, c.D(1.75));
      var top = above(V(FC.x, 0, FC.z - 0.6), 4.7), life = c.D(1.7);
      ELC.forEach(function (col, i) {
        var a0 = i / 5 * 6.283;
        E({ pos: top, frame: 'glow', color: col, size: 2.6, life: life, alpha: 0.7, fadeIn: 0.15, fadeOut: 0.7, upd: function (p, dt, k) { var a = a0 + k * 6; p.x = top.x + Math.cos(a) * 2.6; p.y = top.y + Math.sin(a) * 0.5; p.z = top.z; return true; } });
        E({ sys: 'col', pos: top, frame: ELF[i], color: col, size: 1.0, life: life, alpha: 0.9, fadeIn: 0.15, fadeOut: 0.7, spin: 4, upd: function (p, dt, k) { var a = a0 + k * 6; p.x = top.x + Math.cos(a) * 2.6; p.y = top.y + Math.sin(a) * 0.5; p.z = top.z; return true; } });
        E({ sys: 'norm', pos: top, frame: 'smoke', color: col, size: 2.6, life: life, alpha: 0.32, fadeIn: 0.25, fadeOut: 0.7, upd: function (p, dt, k) { var a = a0 + 0.6 + k * 6; p.x = top.x + Math.cos(a) * 2.2; p.y = top.y + Math.sin(a) * 0.45; p.z = top.z; return true; } });
      });
      E({ sys: 'gadd', pos: V(FC.x, 0.04, FC.z), frame: 'circle', color: 0xffe9ff, size: [1, 9], ease: 1, life: life, spin: -1.4, fadeOut: 0.8, alpha: 0.6 });
      // the shots are spread in time; the fifths of them in order belong to fire, lightning, ice, star and moon
      // in each wave only the first three shots are falling elements (one big, two smaller); the rest of the crowd is
      // struck by the same element as a short burst when the big one lands, so each element reads on its own
      var drops = [0, 0, 0, 0, 0];
      volley(c, { shots: 15, t0: 0.16, span: 1.25, fire: function (mob, frac, i, n) {
        if (!mob) return;
        // the falling ones go to monsters the player can see (the first in each wave is the big one); the rest burst
        var kind = Math.min(4, Math.floor(i * 5 / n)), r = i - Math.ceil(kind * n / 5);
        if (drops[kind] < 3 && (onScreen(mp(mob)) || r >= Math.ceil(n / 5) - (3 - drops[kind]))) {
          var big = drops[kind] === 0; drops[kind]++;
          elemDrop(c, mob, kind, big, function () { c.hit(mob, frac, big ? 1.4 : 0.9); }); return;
        }
        after(c.D(0.24), function () { elemPopAt(c, mob, kind); c.hit(mob, frac, 0.8); });
      } });
    };
    // Prism beam (오색 광선). Five element orbs open around the wizard and each one charges with its own element. Then they
    // FIRE: five real lasers shoot out of the orbs, race across the field and meet on one monster. Every beam is a hit the
    // moment its tip arrives and keeps burning where it touches; where the five meet, a ball of mixed light swells, the
    // beams narrow into it — and it goes off in one white blast. The beams follow the monster if it moves.
    S.prism = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      // a target off the edge of the screen would hide the beams: take the nearest monster that can be seen instead
      // and one right beside the wizard would make the lasers stubs: unless it is a boss, aim at a visible monster a few
      // steps away so the five beams really fly across the field
      (function () {
        var h0 = sc.heroCenter(), d = function (m) { var q = mp(m); return Math.hypot(q.x - h0.x, q.z - h0.z); };
        if (mob.boss && onScreen(mp(mob))) return;
        if (onScreen(mp(mob)) && d(mob) >= 2.4) return;
        var seen = liveMobs().filter(function (m) { return onScreen(mp(m)); });
        if (!seen.length) return;
        var sx = function (m) { return Math.abs(mp(m).project(sc.camera).x); };
        seen.sort(function (a, b) { return Math.abs(d(a) - 3.8) + sx(a) * 3 - Math.abs(d(b) - 3.8) - sx(b) * 3; });
        mob = seen[0];
      })();
      c.plain = true;
      sc.heroPose('thrust', c.D(0.3), 0xffffff); sc.dim(0.55, c.D(1.25));
      var cs = Math.min(1.5, c.s), CH = c.D(0.38), FIRE = c.D(0.06), TRAVEL = c.D(0.1), HOLD = c.D(0.42), land = mp(mob);
      var orbs = [], beams = [], meet = { size: 0 }, alive = true;
      function target() { if (mob.alive) land = mp(mob); return land; }
      // the orbs hang in an arch high over the field (as high as the screen allows), so the lasers come down long and
      // steep from five sides on to the monster
      var arch = (function () {
        // centred over the middle of the screen (whatever monster is the target), as high as the screen allows
        var t = land, z = t.z - 0.5, h = 2.6, cx = sc.heroCenter().x;
        var midX = function (hh) { var lo = cx - 8, hi = cx + 8; for (var k = 0; k < 24; k++) { var m = (lo + hi) / 2; if (V(m, hh, z).project(sc.camera).x < 0) lo = m; else hi = m; } return (lo + hi) / 2; };
        for (var hh = 5.2; hh > 2.6; hh -= 0.2) { cx = midX(hh); if (V(cx, hh, z).project(sc.camera).y < 0.6) { h = hh; break; } }
        cx = midX(h);
        var sp = 1.15 * Math.min(1.25, cs);
        for (; sp > 0.6; sp -= 0.05) { var L = V(cx - 2 * sp, h - 0.9, z).project(sc.camera), Rr = V(cx + 2 * sp, h - 0.9, z).project(sc.camera); if (L.x > -0.8 && Rr.x < 0.68) break; }
        return { x: cx, y: h, z: z, sp: sp };
      })();
      function orbPos(i) { var o = i - 2; return V(arch.x + o * arch.sp, arch.y - Math.abs(o) * 0.45 + Math.sin(i * 1.7 + performance.now() / 300) * 0.04, arch.z); }
      function meetPos() { var t = target(); return V(t.x, t.y + 0.15, t.z); }
      // 1. charge: each orb gathers its element — sparks of its colour and shape are pulled into it
      ELC.forEach(function (col, i) {
        after(c.D(i * 0.03), function () {
          homing({ from: sc.heroPaw(), to: function () { return orbPos(i); }, time: c.D(0.13), fancy: false, noMuzzle: true, arc: V((i - 2) * 0.5, 1.2, 0),
            trail: { w: 0.16 * cs, col: col, core: 1, pts: 14, shrink: 40 }, heads: [{ frame: 'glow', color: col, size: 0.9 * cs, alpha: 0.6 }, { frame: 'flare', color: 0xffffff, size: 0.4 * cs, white: true }],
            onHit: function () {} });
        });
        after(c.D(0.13 + i * 0.03), function () {
          var p0 = orbPos(i), follow = function (q) { var o = orbPos(i); q.x = o.x; q.y = o.y; q.z = o.z; return true; }, grow = 0;
          var parts = [E({ pos: p0, frame: 'glow', color: col, size: 2.3 * cs, life: 30, upd: follow, fadeOut: 1, alpha: 0.75, fadeIn: 0.3 }),
            E({ sys: 'col', pos: p0, frame: ELF[i], color: col, size: 1.15 * cs, life: 30, upd: follow, fadeOut: 1, spin: i === 1 ? 0 : 4, rot: i === 1 ? 1.5708 : 0, fadeIn: 0.3 }),
            E({ pos: p0, frame: 'ring', color: col, size: 1.5 * cs, life: 30, upd: follow, fadeOut: 1, spin: -6, alpha: 0.7, fadeIn: 0.3 }),
            E({ pos: p0, frame: 'flare', color: 0xffffff, size: 0.85 * cs, life: 30, upd: follow, fadeOut: 1, white: true, spin: 5 })];
          orbs.push(parts);
          ring(p0, col, 1.4 * cs, 0.25);
          tick(function (dt) {
            if (!alive) return true; grow += dt;
            if (grow < CH && Math.random() < dt * 45 * c.n) { var o = orbPos(i), d = rdir(rr(0.8, 1.3)); E({ pos: o.clone().add(d), vel: d.clone().multiplyScalar(-4.5), frame: pick([ELF[i], 'dot', 'flare']), color: [0xffffff, col], size: [0.2, 0.05], life: 0.22, drag: 0.5 }); }
            return grow > CH + 2;
          });
        });
      });
      // 2. fire: the lasers shoot one after another; each tip races to the monster, then the beam holds and burns
      ELC.forEach(function (col, i) {
        after(CH + FIRE * i, function () {
          var st = { a: orbPos(i), b: orbPos(i), open: 1 }, t = 0, struck = false, beam = beamOf(st, col, 1.2 * cs, deep(col));
          beams.push({ st: st, beam: beam });
          muzzleAt(orbPos(i), col);
          tick(function (dt) {
            if (!alive) return true;
            t += dt; st.a.copy(orbPos(i));
            var k = Math.min(1, t / TRAVEL), m = meetPos(); st.b.lerpVectors(st.a, m, k * k * (3 - 2 * k));
            if (!struck && k >= 1) {
              struck = true;
              flare(m, 0xffffff, 1.3 * cs, 0.12, { white: true }); ring(m, col, 1.6 * cs, 0.22); gRing(V(m.x, 0, m.z), col, 2.0 * cs, 0.3);
              sparks(m, [0xffffff, col], N(10, c), 7, { size: 0.2, stretch: 0.16 }); sc.shake(0.09); sc.light(m, col, 1.6, 0.25);
              c.hit(mob, 0.1, 1.0);
            }
            // while the beam holds, light splashes off the spot it touches
            if (struck && Math.random() < dt * 35 * c.n) E({ pos: m.clone(), vel: rdir(3).add(V(0, 1.2, 0)), frame: 'dot', color: [0xffffff, col], size: [0.1, 0], life: 0.3, grav: 3, stretch: 0.12 });
            return false;
          });
        });
      });
      function muzzleAt(p, col) { flare(p, 0xffffff, 1.0 * cs, 0.1, { white: true }); E({ pos: p, frame: 'ring', color: col, size: [0.3, 1.3 * cs], ease: 1, life: 0.2 }); }
      // 3. where the five meet, a ball of mixed light swells while the beams pour into it
      var MEET0 = CH + FIRE * 4 + TRAVEL, BURST = MEET0 + HOLD;
      after(MEET0, function () {
        var p0 = meetPos(), sz = 0.4, follow = function (mul) { return function (q) { var o = meetPos(); q.x = o.x; q.y = o.y; q.z = o.z; q.s0 = q.s1 = sz * mul; return true; }; };
        var core = [E({ pos: p0, frame: 'glow', color: 0xfff0ff, size: 0.4, life: 30, upd: follow(1.6), fadeOut: 1, alpha: 0.85 }),
          E({ sys: 'col', pos: p0, frame: 'ring', color: 0xffd8ff, size: 0.4, life: 30, upd: follow(1.1), fadeOut: 1, spin: 9, alpha: 0.8 }),
          E({ pos: p0, frame: 'flare', color: 0xffffff, size: 0.4, life: 30, upd: follow(0.7), fadeOut: 1, white: true, spin: -7 })];
        var t = 0;
        tick(function (dt) {
          if (!alive) { kill(core); return true; }
          t += dt; var k = Math.min(1, t / HOLD); sz = (0.9 + 3.0 * k) * cs * (1 + Math.sin(t * 60) * 0.06);
          beams.forEach(function (b) { b.st.open = 1 - 0.55 * k; });
          if (Math.random() < dt * 60 * c.n) { var o = meetPos(), d = rdir(rr(1.2, 2.2)); E({ pos: o.clone().add(d), vel: d.clone().multiplyScalar(-6), frame: pick(['dot', 'star', 'flare']), color: [0xffffff, pick(ELC)], size: [0.18, 0.04], life: 0.25 }); }
          if (Math.random() < dt * 8) sc.shake(0.05 + 0.1 * k);
          return false;
        });
        meet.core = core;
      });
      // 4. the burst
      after(BURST, function () {
        alive = false;
        beams.forEach(function (b) { b.beam.kill(); }); orbs.forEach(kill); if (meet.core) kill(meet.core);
        var q = mob.alive ? mp(mob) : land, g = V(q.x, 0, q.z);
        sc.flash('rgba(255,255,255,1)', 0.85); sc.hitStop(0.1); sc.slowmo(0.25, 0.4); sc.shake(0.6); sc.punch(0.14);
        shaft(g, 7, 0.5, [0xffffff, 0xffe9ff], 0.36, { fadeOut: 0.4 }); shaft(g, 7, 0.14, 0xffffff, 0.28, { white: true });
        flare(q, 0xffffff, 2.6 * c.s, 0.24, { white: true });
        ELC.forEach(function (col, j) { shock(q, col, (3.2 + j * 1.5) * c.s, 0.6 + j * 0.08, { delay: j * 0.04 }); });
        picAt('starShot-burst', g, 3.4 * cs, 'burst', 0.32);
        E({ sys: 'col', pos: q, frame: 'star', color: [0xffffff, 0xffd8ff], size: [0.6, 5.5 * cs], ease: 1, life: 0.5, spin: 3, alpha: 0.9 });
        after(0.12, function () { ELC.forEach(function (col, j) { var a2 = j / 5 * 6.283; E({ pos: q, vel: V(Math.cos(a2) * 7, 2.5 + Math.sin(a2) * 2, 0), frame: ELF[j], color: col, size: [1.4 * cs, 0.3], life: 0.55, drag: 1.5, spin: 8 }); }); sc.shake(0.35); });
        for (var r = 0; r < N(15, c); r++) E({ pos: q, frame: 'streak', color: [0xffffff, ELC[r % 5]], size: [0.8, 9], ease: 1, life: rr(0.45, 0.7), rot: r / 15 * 3.1416, alpha: 0.6, fadeOut: 0.3 });
        fieldWave(g, 0xffffff, 0.8, 0xd8b8ff); gRing(g, 0xffffff, 7, 0.6); scorch(g, 2, 2.4);
        sparks(q, ELC.concat([0xffffff]), N(50, c), 12, { size: 0.3, stretch: 0.14, life: 1.3 }); sc.light(q, 0xffffff, 2.8, 0.6);
        c.hit(mob, 0.5, 2.6);
      });
    };
    // Element wheel: five elemental orbs spin up around the wizard — and the wheel is let go. It opens out over the whole
    // field, each orb scouring a spiral through the crowd; monsters are hit as the wheel reaches them.
    S.wheel = function (c) {
      sc.heroPose('spin', c.D(0.14), 0xffffff);
      var H = sc.heroCenter(), G = V(H.x, 0.04, H.z), t = 0, r = 0.7, T_SPIN = c.D(0.2), hit = [], P = V();
      var orbs = ELC.map(function (col, i) {
        return { col: col, i: i, rib: vx.ribbon({ solid: true, mode: 'trail', w: 0.16 * c.s, color: deep(col), core: 0.9, maxPts: 22, shrink: 46 }), halo: vx.ribbon({ mode: 'trail', w: 0.4 * c.s, color: col, core: 0, alpha: 0.3, maxPts: 22, shrink: 46 }),
          parts: [E({ pos: H, frame: 'glow', color: col, size: 1.3 * c.s, life: 30, upd: STAY, fadeOut: 1, hot: 1.3, alpha: 0.8 }), E({ sys: 'col', pos: H, frame: ELF[i], color: col, size: 0.8 * c.s, life: 30, upd: STAY, fadeOut: 1, spin: 9 }), E({ pos: H, frame: 'flare', color: 0xffffff, size: 0.5 * c.s, life: 30, upd: STAY, fadeOut: 1, white: true, spin: -6 })] };
      });
      circle(G, 0xffffff, 2.0, c.D(0.5), { spin: 4 });
      tick(function (dt) {
        t += dt;
        if (t > T_SPIN) { if (t - dt <= T_SPIN) { sc.flash('rgba(255,255,255,0.45)', 0.22); sc.punch(0.07); sc.shake(0.3); fieldWave(G, 0xffffff, 0.75, 0xd8b8ff); } r += 13 * c.sp * dt; }
        orbs.forEach(function (o) {
          var a = o.i / 5 * 6.283 + t * 10 * c.sp;
          P.set(G.x + Math.cos(a) * r, 0.5 + Math.sin(t * 12 + o.i) * 0.1, G.z + Math.sin(a) * r * 0.85);
          put(o.parts, P); if (o.rib) o.rib.head(P); if (o.halo) o.halo.head(P);
          if (Math.random() < dt * 26 * c.n) {
            if (o.i === 0) fire(P, 1, { size: 0.6, speed: 0.5, up: 0.8, life: 0.6 });
            else if (o.i === 1) vx.lightning(P.clone(), P.clone().add(rdir(0.8)), { w: 0.04, color: o.col, life: 0.08, branches: 0, segs: 5, amp: 0.3 });
            else E({ sys: o.i === 2 ? 'norm' : 'add', pos: P.clone().add(rdir(0.12)), vel: rdir(1).add(V(0, 0.5, 0)), frame: ELF[o.i], color: [0xffffff, o.col], size: [rr(0.14, 0.24), 0.03], life: rr(0.3, 0.55), spin: rr(-8, 8), white: o.i === 2 });
          }
        });
        if (t > T_SPIN) c.pool().forEach(function (m) {
          if (hit.indexOf(m) >= 0) return;
          var dx = m.x - G.x, dz = m.z - G.z; if (dx * dx + dz * dz > r * r) return;
          hit.push(m);
          var col = ELC[hit.length % 5], q = mp(m);
          impact(q, col, 1.2 * c.s); gRing(gp(m), col, 2.2 * c.s, 0.4); shaft(gp(m), 3, 0.14, [0xffffff, col], 0.22, { fadeOut: 0.4 }); sc.shake(0.05);
          c.hit(m, 1, 1.6);
        });
        if (r < 10.5) return false;
        orbs.forEach(function (o) { kill(o.parts); if (o.rib) o.rib.detach(); if (o.halo) o.halo.detach(); });
        return true;
      });
    };
  };
})(this);
