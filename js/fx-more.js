// The second set of skills: three more for every job tier, each built from the same parts as js/fx.js.
// Rule kept everywhere: whatever visibly lands is a real hit, and nothing is hit that the spell does not touch.
(function (root) {
  var CW = root.CW = root.CW || {};
  CW.fxMore = function (K, S) {
    var T = K.T, sc = K.sc, vx = K.vx, V = K.V, rr = K.rr, rdir = K.rdir, pick = K.pick, STAY = K.STAY, sway = K.sway, deep = K.deep, E = K.E, N = K.N, after = K.after, tick = K.tick, FC = K.FC, UPC = K.UPC, above = K.above;
    var fieldPt = K.fieldPt, fieldWave = K.fieldWave, fieldRain = K.fieldRain, flare = K.flare, glow = K.glow, sparks = K.sparks, embers = K.embers, smoke = K.smoke, fire = K.fire, shock = K.shock, ring = K.ring, gRing = K.gRing, gGlow = K.gGlow;
    var scorch = K.scorch, dust = K.dust, circle = K.circle, seal = K.seal, converge = K.converge, impact = K.impact, heavy = K.heavy, homing = K.homing, explosion = K.explosion;
    var liveMobs = K.liveMobs, gp = K.gp, share = K.share, volley = K.volley, ringHits = K.ringHits, skyBolt = K.skyBolt, zapHit = K.zapHit, beamOf = K.beamOf, picHead = K.picHead, picAt = K.picAt, picFall = K.picFall;
    var ICE = [0xffffff, 0xd8f2ff, 0xbfe8ff], ELC = [0xff6a2b, 0x7bddff, 0xdff6ff, 0xffe14a, 0xb68aff], ELF = ['flame', 'streak', 'shard', 'star', 'crescent'];
    function mp(m) { return sc.mobPos(m); }
    function put(list, p) { for (var i = 0; i < list.length; i++) if (list[i]) { list[i].x = p.x; list[i].y = p.y; list[i].z = p.z; } }
    function kill(list) { list.forEach(vx.kill); }
    // a bar of light standing straight up on the screen from a ground point (len is its height)
    function shaft(g, len, w, col, life, o) { var q = { pos: above(g, len / 2), frame: 'streak', color: col, size: [len, len], ar: w, rot: 1.5708, life: life }; for (var k in o) q[k] = o[k]; return E(q); }
    // ice standing up out of the ground at a spot
    function iceSpike(g, h, life, lean) { return E({ sys: 'norm', pos: V(g.x, h * 0.42, g.z + 0.25), frame: 'shard', color: pick(ICE), size: [0.05, h * 0.5], ar: 2.0, rot: lean || 0, ease: 2, life: life, fadeOut: 0.85, white: true }); }
    function iceBurst(c, m, big) {
      var g = gp(m), q = mp(m), B = (m.boss ? 1.45 : 1) * (big || 1);
      for (var s = 0; s < 5; s++) iceSpike(V(g.x + (s - 2) * 0.17 * B, 0, g.z + rr(-0.05, 0.1)), rr(0.85, 1.35) * c.s * B, c.D(0.6), -((s - 2) * 0.36 + rr(-0.1, 0.1)));
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
        var from = sc.heroPaw(), S_ = 1.55 * c.s, ball = picHead('fireball-ball', 1.5 * S_, -0.765, 0.756, 0.286), land = mp(mob);
        flare(from, 0xffffff, 1.4 * c.s, 0.16, { white: true }); smoke(from, 0x5a4a44, N(4, c), { size: 0.7, rise: 0.4 });
        homing({ from: from, to: function () { if (mob.alive) land = mp(mob); return land; }, time: c.D(0.42), arc: V(0, 3.6, -0.5), ease: function (x) { return x * x * 0.7 + x * 0.3; },
          trail: { w: 0.42 * c.s, col: 0xff5a1a, core: 0.9, pts: 20, shrink: 40 },
          heads: [{ frame: 'glow', color: 0xff6a2b, size: 2.2 * S_, alpha: 0.45 }, { sys: 'col', frame: 'flame', color: 0xff5a1a, size: 1.3 * S_, spin: 6 }, { sys: 'col', frame: 'flame', color: 0xffc040, size: 0.9 * S_, spin: -9 }, { frame: 'flare', color: 0xffffff, size: 0.6 * S_, spin: -5, white: true }],
          emit: function (p, v, dt) {
            if (ball) ball.set(p, v, dt);
            var back = v.clone().multiplyScalar(-0.12);
            if (Math.random() < dt * 110 * c.n) fire(p, 1, { size: 0.8 * S_, speed: 0.8, up: 0.4, life: 0.8, v: back });
            if (Math.random() < dt * 30 * c.n) E({ sys: 'norm', pos: p.clone(), vel: back.clone().add(V(0, 0.5, 0)), frame: 'smoke', color: 0x4a3c38, size: [0.3 * S_, 0.9 * S_], ease: 1, life: 0.7, alpha: 0.4, drag: 2, fadeIn: 0.2 });
          },
          onHit: function (p) {
            var g = V(p.x, 0, p.z);
            if (ball) ball.kill(); picAt('fireball-blast', g, 1.3 * S_, 'blast', 0.3);
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
      E({ sys: 'norm', pos: up, frame: 'shard', color: ICE, size: [0.1, 1.0 * c.s], ar: 2.6, ease: 2, life: c.D(0.26), rot: 0.5, white: true, fadeOut: 0.9 });
      E({ pos: up, frame: 'frost', color: c.col, size: [0.3, 1.8 * c.s], ease: 2, life: c.D(0.3), spin: 2, fadeOut: 0.7, alpha: 0.7 });
      after(c.D(0.24), function () {
        var spear = picHead('iceStorm-shard', 2.0 * c.s, 1.5708, 0.5, 0.5), land = mp(mob);
        flare(up, 0xffffff, 1.2 * c.s, 0.14, { white: true }); ring(up, c.col, 1.3 * c.s, 0.22);
        homing({ from: up, to: function () { if (mob.alive) land = mp(mob); return land; }, time: c.D(0.17), fancy: false, ease: function (x) { return x * x; },
          trail: { w: 0.24 * c.s, col: c.col, core: 1.1, pts: 16, shrink: 50 },
          heads: [{ frame: 'glow', color: c.col, size: 1.3 * c.s, alpha: 0.5 }, { frame: 'flare', color: 0xffffff, size: 0.6 * c.s, white: true, spin: 6 }],
          emit: function (p, v, dt) { if (spear) spear.set(p, v, dt); if (Math.random() < dt * 70 * c.n) E({ pos: p.clone().add(rdir(0.1)), vel: rdir(0.7), frame: pick(['snow', 'dot']), color: 0xffffff, size: rr(0.07, 0.14), life: rr(0.3, 0.5), white: true, spin: 3 }); },
          onHit: function (p) {
            var g = V(p.x, 0, p.z);
            if (spear) spear.kill();
            // it goes in, and a crown of ice bursts out the far side
            for (var s = 0; s < 9; s++) { var a = s / 9 * 6.283; E({ sys: 'norm', pos: p.clone().add(V(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.2)), vel: V(Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0), frame: 'shard', color: pick(ICE), size: [0.1, rr(0.7, 1.1) * c.s], ar: 2.4, rot: a - 1.5708, ease: 1, life: c.D(0.5), drag: 4, fadeOut: 0.7, white: true }); }
            if (mob.alive) { iceBurst(c, mob, 1.3); picAt('iceStorm', gp(mob), 1.7 * Math.min(1.3, c.s), 'rise'); }
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
              iceSpike(p, (0.4 + 0.5 * done) * c.s, c.D(0.5), rr(-0.25, 0.25)); gRing(p, c.col, 0.7 * c.s, 0.25);
              E({ sys: 'gadd', pos: V(p.x, 0.04, p.z), frame: 'frost', color: c.col, size: [0.2, 1.0], life: 0.7, alpha: 0.7, fadeOut: 0.5 });
            }
            if (k < 1) return false;
            if (mob.alive) { iceBurst(c, mob, 1.25); if (i < 3) picAt('iceStorm', gp(mob), 1.3 * Math.min(1.3, c.s), 'rise'); }
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
        var land = mp(mob), from = above(gp(mob), 7.6).add(V(3.4, 0, 0)), P = 1.6 * c.s;
        var rock = picHead('meteorRain-rock', 2.3 * c.s, -2.24, 0.314, 0.167);
        homing({ from: from, to: function () { if (mob.alive) land = mp(mob); return land; }, time: c.D(0.3), ease: function (x) { return x * x; },
          trail: { w: 0.62 * c.s, col: c.col, core: 1.3, pts: 22, shrink: 30 },
          heads: [{ sys: 'col', frame: 'glow', color: c.col, size: 1.6 * c.s, alpha: 0.85 }, { frame: 'glow', color: c.col, size: 2.8 * c.s, alpha: 0.4 }, { frame: 'flare', color: 0xffffff, size: 1.2 * c.s, white: true, spin: 6 }],
          emit: function (p, v, dt) {
            if (rock) rock.set(p, v, dt);
            if (Math.random() < dt * 120 * c.n) fire(p, 1, { size: 0.9 * c.s, speed: 0.6, up: 0.3, life: 0.6, cols: [0xffffff, 0xffe14a, 0xff8a2b] });
            if (Math.random() < dt * 60 * c.n) E({ pos: p.clone().add(rdir(0.3)), vel: rdir(1.2), frame: pick(['star', 'flare', 'dot']), color: [0xffffff, c.col], size: [rr(0.14, 0.26), 0], life: rr(0.4, 0.7), spin: 5 });
          },
          onHit: function (p) {
            var g = V(p.x, 0.03, p.z);
            if (rock) rock.kill(); picAt('meteorRain-ripple', g, 1.0 * c.s, 'blast', 0.4);
            explosion(c, p, P, c.col); fieldWave(g, c.col, 0.8, 0xffffff); gRing(g, 0xffffff, 6 * c.s, 0.6); scorch(g, 2.6 * c.s, 3);
            sc.flash('rgba(255,240,180,0.9)', 0.6); sc.slowmo(0.2, 0.4); sc.shake(0.5); sc.punch(0.1);
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
    // Moonfall: the full moon rises over one monster, hangs for a breath, and comes down on it.
    S.moonfall = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('raise', c.D(0.22), c.col); sc.dim(0.5, c.D(1.15));
      var cs = Math.min(1.6, c.s), t = 0, T_RISE = c.D(0.36), T_FALL = c.D(0.16), size = 0.1, P = above(gp(mob), 5.0), land = mp(mob), sky = P.clone();
      function sz(mul) { return function (p) { p.s0 = p.s1 = size * mul; return true; }; }
      var parts = [E({ pos: P, frame: 'glow', color: c.col, size: 0.1, life: 30, upd: sz(1.5), fadeOut: 1, alpha: 0.28 }), E({ sys: 'col', pos: P, frame: 'dot', color: 0xf2ecc8, size: 0.1, life: 30, upd: sz(1), fadeOut: 1 }),
        E({ pos: P, frame: 'ring', color: 0xffffff, size: 0.1, life: 30, upd: sz(1.08), fadeOut: 1, alpha: 0.35, white: true })];
      var seas = [[-0.16, 0.12, 0.22], [0.14, -0.06, 0.16], [0.02, 0.2, 0.12]].map(function (o) { return { o: o, p: E({ sys: 'col', pos: P, frame: 'dot', color: 0xb0a67e, size: 0.1, life: 30, upd: sz(o[2]), fadeOut: 1, alpha: 0.8 }) }; });
      E({ sys: 'gnorm', pos: V(land.x, 0.03, land.z), frame: 'smoke', color: 0x0a0818, size: [0.6, 3.4 * cs], ease: 1, life: T_RISE + T_FALL, alpha: 0.55, fadeIn: 0.3 });
      converge(sky, [0xffffff, c.col], N(22, c), 2.4, T_RISE);
      tick(function (dt) {
        t += dt;
        if (mob.alive) land = mp(mob);
        if (t < T_RISE) { var kr = t / T_RISE; size = (0.3 + 2.4 * (1 - (1 - kr) * (1 - kr))) * cs; sky = above(V(land.x, 0, land.z), 5.0); P.copy(sky); P.y += Math.sin(t * 9) * 0.05; }
        else { var kf = Math.min(1, (t - T_RISE) / T_FALL); P.lerpVectors(sky, land, kf * kf); }
        put(parts, P); seas.forEach(function (s) { if (s.p) { s.p.x = P.x + s.o[0] * size; s.p.y = P.y + s.o[1] * size; s.p.z = P.z + 0.02; } });
        if (t < T_RISE + T_FALL) return false;
        kill(parts); kill(seas.map(function (s) { return s.p; }));
        var g = V(land.x, 0.03, land.z);
        sc.flash('rgba(240,238,220,1)', 0.75); sc.hitStop(0.09); sc.slowmo(0.2, 0.4); sc.shake(0.6); sc.punch(0.12);
        flare(land, 0xffffff, 2.6 * cs, 0.22, { white: true }); shock(land, 0xffffff, 6 * cs, 0.5); shock(land, c.col, 8.5, 0.65, { delay: 0.05 });
        fieldWave(g, c.col, 0.8, 0xffffff); gRing(g, 0xffffff, 7 * cs, 0.6); scorch(g, 2.6 * cs, 3); dust(g, N(12, c), 2);
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
      var up = sc.heroCenter().add(V(0, 1.4, -0.2)), aim = mp(mob), st = { a: up.clone(), b: up.clone(), open: 0 }, spear = beamOf(st, 0xffc23a, 0.75 * c.s, 0xff8a1a), t = 0, T_FORM = c.D(0.26), T_FLY = c.D(0.11), L = 1.9 * c.s, P = up.clone(), dir = V(), stage = 0, end = V();
      converge(up, [0xffffff, 0xffd84a, 0xff9a40], N(22, c), 1.5, T_FORM); seal(up, 0xffd84a, 1.1 * c.s, T_FORM);
      tick(function (dt) {
        t += dt;
        if (stage === 0) {
          if (mob.alive) aim = mp(mob);
          dir.copy(aim).sub(up).normalize(); var kf = Math.min(1, t / T_FORM);
          st.open = kf; st.b.copy(up).addScaledVector(dir, L * 0.5 * kf); st.a.copy(up).addScaledVector(dir, -L * 0.5 * kf);
          if (kf >= 1) { stage = 1; t = 0; end.copy(aim).addScaledVector(dir, 2.6); flare(up, 0xffffff, 1.6 * c.s, 0.14, { white: true }); ring(up, 0xffd84a, 1.6 * c.s, 0.2); sc.punch(0.05); }
          return false;
        }
        if (stage === 1) {
          var k = Math.min(1, t / T_FLY), dist = aim.distanceTo(up), pass = dist / (dist + 2.6);
          P.lerpVectors(up, end, k); st.b.copy(P).addScaledVector(dir, L * 0.5); st.a.copy(P).addScaledVector(dir, -L * 0.5);
          if (Math.random() < dt * 140 * c.n) E({ pos: P.clone().add(rdir(0.15)), vel: dir.clone().multiplyScalar(-3).add(rdir(1)), frame: pick(['streak', 'flare', 'dot']), color: [0xffffff, 0xffe14a, 0xff8a2b], size: [rr(0.14, 0.3), 0.03], life: rr(0.2, 0.4), stretch: 0.08 });
          if (k >= pass && stage === 1 && !st.hit) {
            st.hit = true;
            sc.flash('rgba(255,235,160,0.7)', 0.4); sc.hitStop(0.07); sc.shake(0.4);
            flare(aim, 0xffffff, 2.0 * c.s, 0.16, { white: true }); shock(aim, 0xffd84a, 3.6 * c.s, 0.35);
            sparks(aim, [0xffffff, 0xffe14a, 0xff8a2b], N(26, c), 11, { dir: dir, spread: 0.5, size: 0.26, stretch: 0.16, life: 1.1 });
            c.hit(mob, 0.6, 2.2);
          }
          if (k < 1) return false;
          stage = 2; t = 0; return false;
        }
        st.open = Math.max(0, 1 - t / c.D(0.12));
        if (t < c.D(0.12)) return false;
        spear.kill();
        // the light it left in the monster goes off as a pillar
        var q = mob.alive ? mp(mob) : aim, g = V(q.x, 0, q.z);
        shaft(g, 7, 0.34, [0xffffff, 0xffd84a, 0xff8a2b], 0.36, { hot: 1.3, fadeOut: 0.4 }); shaft(g, 7, 0.1, 0xffffff, 0.26, { white: true });
        flare(q, 0xffffff, 2.2 * c.s, 0.2, { white: true }); shock(q, 0xfff2a0, 5 * c.s, 0.45); gRing(g, 0xffd84a, 4.6 * c.s, 0.5); scorch(g, 1.6, 2.4); fieldWave(g, 0xffd84a, 0.6, 0xff9a40);
        fire(q, N(12, c), { size: 1.1 * c.s, speed: 3, up: 3 }); embers(q, [0xffe080, 0xff6a2b], N(14, c), { speed: 3.5, up: 3 });
        sc.flash('rgba(255,245,200,0.8)', 0.4); sc.shake(0.4); sc.light(q, 0xffe080, 2.4, 0.5);
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
        var from = sc.heroPaw(), land = mp(mob);
        homing({ from: from, to: function () { if (mob.alive) land = mp(mob); return land; }, time: c.D(0.3), arc: V(0, 0.6, 0), fancy: false, ease: function (x) { return x; },
          trail: { w: 0.3 * cs, col: 0x6a2ad0, core: 0.2, pts: 18, shrink: 40 },
          heads: [{ frame: 'glow', color: c.col, size: 2.3 * cs, alpha: 0.45 }, { frame: 'shock', color: c.col, size: 2.0 * cs, spin: 7, alpha: 0.8 }, { sys: 'addB', frame: 'dot', color: 0x07020e, size: 1.0 * cs }, { frame: 'ring', color: 0xffb8f4, size: 1.15 * cs, white: true, alpha: 0.9 }],
          emit: function (p, v, dt) {
            // it drinks the light around it as it goes
            if (Math.random() < dt * 70 * c.n) { var d = rdir(rr(1, 1.8)); E({ pos: p.clone().add(d), vel: d.clone().multiplyScalar(-4).add(v), frame: pick(['streak', 'dot']), color: [0xffffff, c.col, 0xff6ad8], size: [rr(0.1, 0.2), 0.02], life: 0.26, stretch: 0.06, fadeIn: 0.3 }); }
          },
          onHit: function (p) {
            var g = V(p.x, 0, p.z);
            E({ pos: p, frame: 'ring', color: 0xffffff, size: [3.2 * cs, 0.2], life: c.D(0.1), white: true }); E({ sys: 'addB', pos: p, frame: 'dot', color: 0x07020e, size: [1.0 * cs, 1.9 * cs], life: c.D(0.1), fadeOut: 1 });
            sc.shake(0.15); c.hit(mob, 0.3, 1.2);
            after(c.D(0.1), function () {
              var q = mob.alive ? mp(mob) : p;
              sc.flash('rgba(220,170,255,0.9)', 0.6); sc.hitStop(0.09); sc.shake(0.55); sc.punch(0.12);
              for (var s = 0; s < 10; s++) { E({ sys: 'col', pos: q, frame: 'streak', color: [0x1a0630, c.col], size: [0.5, rr(4, 6.5)], ease: 1, life: rr(0.3, 0.45), rot: s / 10 * 3.1416 + rr(-0.1, 0.1), alpha: 0.9, fadeOut: 0.4 }); E({ pos: q, frame: 'streak', color: 0xffffff, size: [0.3, rr(2.5, 4)], ease: 1, life: 0.22, rot: s / 10 * 3.1416 + 0.15, alpha: 0.7 }); }
              flare(q, 0xffffff, 2.6 * cs, 0.2, { white: true }); shock(q, c.col, 6 * cs, 0.5); shock(q, 0xff6ad8, 8.5, 0.65, { delay: 0.05 });
              fieldWave(g, c.col, 0.75, 0xff6ad8); gRing(g, c.col, 6.5 * cs, 0.6); scorch(g, 2.2, 2.6);
              sparks(q, [0xffffff, c.col, 0xff6ad8], N(40, c), 12, { size: 0.28, stretch: 0.14, life: 1.3 }); embers(q, [0xffffff, c.col], N(16, c), { speed: 5, up: 1.5, grav: 2 });
              sc.light(q, c.col, 2.6, 0.5);
              c.hit(mob, 0.7, 2.6); c.splash(mob, 2.1, 1.3);
            });
          } });
      });
    };

    // =================================================================== 9차: 원소
    // one element coming down on a monster; done(pos) is called at the moment it lands
    function elemDrop(c, mob, kind, done) {
      var col = ELC[kind], g = gp(mob), to = function () { return mp(mob); };
      if (kind === 1) { skyBolt(c, to, c.s, { col: col, thin: true, br: 1 }); zapHit(c, mob, false, col); done(mp(mob)); return; }
      if (kind === 2) { picFall('iceStorm-shard', g, rr(1.2, 1.7) * Math.min(1.4, c.s), c.D(0.17), 0.5, function () { if (mob.alive) iceBurst(c, mob, 0.8); done(mp(mob)); }); return; }
      if (kind === 4) {
        shaft(g, 7, 0.2, [0xffffff, col], 0.24, { fadeOut: 0.4 }); shaft(g, 7, 0.06, 0xffffff, 0.18, { white: true });
        var q = mp(mob); for (var i = 0; i < 3; i++) E({ sys: 'col', pos: q, frame: 'crescent', color: col, size: [0.4, 1.7 * c.s], life: c.D(0.3), rot: i * 2.094, spin: 6, alpha: 0.7 });
        ring(q, col, 1.5 * c.s, 0.25); sparks(q, [0xffffff, col], N(8, c), 6, { size: 0.18 }); done(q); return;
      }
      var pic = kind === 0 ? picHead('fireball-ball', 1.1 * c.s, -0.765, 0.756, 0.286) : picHead('starShot-star', 1.1 * c.s, -0.72, 0.77, 0.273);
      homing({ from: above(g, rr(5, 6)).add(V(rr(0.6, 1.6), 0, 0)), to: to, time: c.D(0.18), fancy: false, ease: function (x) { return x * x * 0.6 + x * 0.4; },
        trail: { w: 0.2 * c.s, col: col, core: 1, pts: 14, shrink: 50 }, heads: [{ frame: 'glow', color: col, size: 1.1 * c.s, alpha: 0.5 }, { frame: kind ? 'star' : 'flare', color: 0xffffff, size: 0.5 * c.s, white: true, spin: 10 }],
        emit: function (p, v, dt) { if (pic) pic.set(p, v, dt); if (!kind && Math.random() < dt * 60 * c.n) fire(p, 1, { size: 0.5 * c.s, speed: 0.4, up: 0.3, life: 0.5 }); },
        onHit: function (p) {
          if (pic) pic.kill();
          if (kind === 0) { if (mob.alive) fireBurst(c, mob, 1.1); shock(p, 0xffc080, 2.2 * c.s, 0.3); }
          else { impact(p, col, 0.9 * c.s); gRing(V(p.x, 0, p.z), col, 1.8 * c.s, 0.35); }
          done(p);
        } });
    }
    // Element storm: a five-coloured wheel of cloud turns over the field and every element comes down in turn, each on a monster.
    S.elemStorm = function (c) {
      sc.heroPose('raise', c.D(0.16), 0xffffff); sc.dim(0.45, c.D(1.1));
      var top = above(V(FC.x, 0, FC.z - 0.6), 4.7), life = c.D(0.95);
      ELC.forEach(function (col, i) {
        var a0 = i / 5 * 6.283;
        E({ pos: top, frame: 'glow', color: col, size: 2.0, life: life, alpha: 0.6, fadeIn: 0.2, fadeOut: 0.75, upd: function (p, dt, k) { var a = a0 + k * 5; p.x = top.x + Math.cos(a) * 2.6; p.y = top.y + Math.sin(a) * 0.5; p.z = top.z; return true; } });
        E({ sys: 'norm', pos: top, frame: 'smoke', color: col, size: 2.2, life: life, alpha: 0.3, fadeIn: 0.25, fadeOut: 0.7, upd: function (p, dt, k) { var a = a0 + 0.6 + k * 5; p.x = top.x + Math.cos(a) * 2.2; p.y = top.y + Math.sin(a) * 0.45; p.z = top.z; return true; } });
      });
      E({ sys: 'gadd', pos: V(FC.x, 0.04, FC.z), frame: 'circle', color: 0xffe9ff, size: [1, 9], ease: 1, life: life, spin: -1.4, fadeOut: 0.8, alpha: 0.6 });
      volley(c, { shots: 15, t0: 0.16, span: 0.56, fire: function (mob, frac, i) {
        if (!mob) return;
        elemDrop(c, mob, i % 5, function (p) { sc.shake(0.05); sc.light(p, ELC[i % 5], 1.3, 0.25); c.hit(mob, frac, 0.9); });
      } });
    };
    // Prism beam: five crystals open in a ring around one monster and fire into it one after another; where the five colours meet, the light turns white and bursts.
    S.prism = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('raise', c.D(0.2), 0xffffff); sc.dim(0.5, c.D(1.1));
      var beams = [], gems = [], T0 = 0.2, GAP = 0.075, land = mp(mob);
      function gemPos(i) { if (mob.alive) land = mp(mob); var a = i / 5 * 6.283 - 1.2; return V(land.x + Math.cos(a) * 2.5, land.y + 1.5 + Math.sin(a) * 0.9, land.z - 0.3); }
      ELC.forEach(function (col, i) {
        after(c.D(i * 0.035), function () {
          var p = gemPos(i), follow = function (q) { var o = gemPos(i); q.x = o.x; q.y = o.y; q.z = o.z; return true; };
          gems.push(E({ sys: 'col', pos: p, frame: 'shard', color: col, size: 0.7 * c.s, ar: 1.5, rot: 0, life: 30, upd: follow, fadeOut: 1 }), E({ pos: p, frame: 'glow', color: col, size: 1.3 * c.s, life: 30, upd: follow, fadeOut: 1, alpha: 0.6 }), E({ pos: p, frame: 'flare', color: 0xffffff, size: 0.45 * c.s, life: 30, upd: follow, fadeOut: 1, white: true, spin: 5 }));
          ring(p, col, 1.0 * c.s, 0.22);
        });
        after(c.D(T0 + i * GAP), function () {
          var st = { a: gemPos(i), b: gemPos(i), open: 1 }, t = 0, struck = false;
          beams.push(beamOf(st, col, 0.5 * c.s, deep(col)));
          tick(function (dt) {
            t += dt; st.a.copy(gemPos(i)); st.b.lerpVectors(st.a, land, Math.min(1, t / c.D(0.05)));
            if (!struck && t >= c.D(0.05)) {
              struck = true;
              flare(land, 0xffffff, 1.1 * c.s, 0.12, { white: true }); ring(land, col, 1.5 * c.s, 0.22); sparks(land, [0xffffff, col], N(8, c), 6, { size: 0.18 }); sc.shake(0.07); sc.light(land, col, 1.4, 0.25);
              c.hit(mob, 0.12, 0.9);
            }
            return t > c.D(T0 + 5 * GAP + 0.1 - (T0 + i * GAP));
          });
        });
      });
      after(c.D(T0 + 5 * GAP + 0.1), function () {
        beams.forEach(function (b) { b.kill(); }); kill(gems);
        var q = mob.alive ? mp(mob) : land, g = V(q.x, 0, q.z);
        sc.flash('rgba(255,255,255,1)', 0.85); sc.hitStop(0.1); sc.slowmo(0.25, 0.4); sc.shake(0.6); sc.punch(0.14);
        shaft(g, 7, 0.5, [0xffffff, 0xffe9ff], 0.36, { fadeOut: 0.4 }); shaft(g, 7, 0.14, 0xffffff, 0.28, { white: true });
        flare(q, 0xffffff, 2.6 * c.s, 0.24, { white: true });
        ELC.forEach(function (col, j) { shock(q, col, (2.4 + j * 1.2) * c.s, 0.45 + j * 0.06, { delay: j * 0.03 }); });
        for (var r = 0; r < N(15, c); r++) E({ pos: q, frame: 'streak', color: [0xffffff, ELC[r % 5]], size: [0.6, 6.5], ease: 1, life: rr(0.3, 0.5), rot: r / 15 * 3.1416, alpha: 0.6, fadeOut: 0.3 });
        fieldWave(g, 0xffffff, 0.8, 0xd8b8ff); gRing(g, 0xffffff, 7, 0.6); scorch(g, 2, 2.4);
        sparks(q, ELC.concat([0xffffff]), N(50, c), 12, { size: 0.3, stretch: 0.14, life: 1.3 }); sc.light(q, 0xffffff, 2.8, 0.6);
        c.hit(mob, 0.4, 2.6);
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
