// 1차 스킬 7개를 3D로 (2026-11-15). Before this they were flat cards and painted stickers (a star picture flying, a
// claw picture, a paw card falling). Now each has a solid body made in js/fx3d.js: a gem star, curved claw blades,
// a ball of fur, balls of light, a jelly paw, a ball of yarn, little falling stars. Every one follows the same beats:
// gather -> a clear body that moves -> the hit (a short stop, a shake, the number) -> what is left behind.
// The hits are the very ones the old versions dealt (same monsters, same shares, same moments).
(function (root) {
  var CW = root.CW = root.CW || {};
  CW.fxTier1 = function (K, S) {
    var T = K.T, sc = K.sc, vx = K.vx, V = K.V, rr = K.rr, rdir = K.rdir, pick = K.pick, STAY = K.STAY, sway = K.sway, deep = K.deep, E = K.E, N = K.N, after = K.after, tick = K.tick, UPC = K.UPC, above = K.above;
    var fire = K.fire, flare = K.flare, sparks = K.sparks, gRing = K.gRing, gGlow = K.gGlow, dust = K.dust, converge = K.converge, heavy = K.heavy, homing = K.homing, gp = K.gp, near = K.near, share = K.share, volley = K.volley, P3 = K.P3;
    function mp(m) { return sc.mobPos(m); }

    // a ball of light: a light heart in a softer glow; on snow or sand painted in its colour (added light would vanish)
    function light3(col, glowK, glowA) {
      var br = vx.isBright && vx.isBright(), dc = deep(col);
      var heart = P3.orb(br ? { col: col, deep: dc } : { col: 0xffffff, deep: col });
      var haze = P3.orb(br ? { col: dc, deep: deep(dc), alpha: Math.min(0.85, (glowA || 0.45) + 0.25), order: 6 } : { col: col, deep: dc, alpha: glowA || 0.45, order: 6 });
      var gk = (glowK || 2.2) * (br ? 0.7 : 1);
      return { set: function (p, s) { heart.set(p, s); haze.set(p, s * gk); }, kill: function () { heart.kill(); haze.kill(); } };
    }
    // a short pop of light that swells and goes out (small: big white light over a crowd turns the field white)
    function pop(p, col, size, life) {
      var br = vx.isBright && vx.isBright(), b = light3(col, br ? 1.25 : 1.6, br ? 0.3 : 0.4), t = 0, L = life || 0.16, R = size * (br ? 0.16 : 0.22);
      b.set(p, R * 0.4);
      tick(function (dt) { t += dt; var k = Math.min(1, t / L); b.set(p, R * (0.4 + 0.6 * (1 - (1 - k) * (1 - k))) * (1 - k * 0.7)); if (k >= 1) { b.kill(); return true; } });
    }
    // little crystals of a colour thrown out of a hit, falling and stopping on the ground
    function shards(p, col, line, n, speed, len) {
      for (var i = 0; i < n; i++) {
        var v = rdir(speed * rr(0.5, 1)); v.y = Math.abs(v.y) * 0.8 + speed * 0.5;
        P3.crystal({ pos: p, vel: v, grav: 9, drag: 1.2, len: (len || 0.16) * rr(0.7, 1.2), col: col, line: line, life: rr(0.45, 0.75), spin: rr(6, 14) });
      }
    }
    var UPV = V(0, 1, 0), QA = new T.Quaternion();

    // ============ 별 탄환: three gem stars, the last one bigger; it bursts into a ring of little stars ============
    var STAR = { col: 0xfff27a, deep: 0xd08a10, line: 0x5a3608 };
    S.bolt3 = function (c) {
      var mob = c.targets[0]; if (!mob) return;
      c.plain = true;
      sc.heroPose('thrust', c.D(0.09), c.col);
      converge(c.from, [c.col, 0xffffff], N(7, c), 0.55, c.D(0.1));
      // a star forms at the paw, turning
      var held = P3.emblem(2, { col: STAR.col, deep: STAR.deep, line: STAR.line, glowA: 0.25, spin: 6 }), ht = 0;
      tick(function (dt) { ht += dt; var k = Math.min(1, ht / c.D(0.09)); held.set(sc.heroPaw(), 0.2 * c.s * k, dt); if (k >= 1) { held.kill(); return true; } });
      for (var i = 0; i < 3; i++) (function (i) {
        after(c.D(0.09 + i * 0.085), function () {
          var tip = sc.heroPaw(), big = i === 2, sz = (big ? 0.3 : 0.21) * c.s, roll = 0;
          flare(tip, 0xffffff, 0.5 * c.s, 0.1, { white: true });
          var star = P3.emblem(2, { col: STAR.col, deep: STAR.deep, line: STAR.line, glowA: big ? 0.28 : 0.22, spin: 9 });
          homing({ from: tip, to: function () { return mp(mob); }, time: c.D(0.24), arc: V(0.1, [0.6, -0.3, 0.25][i], [0.25, -0.2, 0][i]), fancy: false,
            trail: { w: 0.13 * c.s * (big ? 1.3 : 1), col: c.col, core: 0.8, pts: 14 },
            emit: function (p, v, dt) { roll -= dt * 14; star.set(p, sz, dt, roll); if (Math.random() < dt * 30 * c.n) E({ pos: p.clone().add(rdir(0.06)), vel: rdir(0.5), frame: 'dot', color: [0xffffff, c.col], size: [0.06, 0], life: 0.3 }); },
            onHit: function (p) {
              star.kill();
              pop(p, c.col, (big ? 1.1 : 0.7) * c.s, big ? 0.2 : 0.14);
              shards(p, STAR.col, STAR.line, N(big ? 9 : 5, c), big ? 4.2 : 3.2, big ? 0.2 : 0.15);
              sparks(p, [c.col, 0xffffff], N(big ? 7 : 4, c), 4.5, { size: 0.15 });
              sc.light(p, c.col, big ? 1.2 : 0.6, 0.25);
              if (big) {
                heavy(0.7); gRing(p, c.col, 3.0 * c.s, 0.4);
                // the last star bursts into a ring of little gem stars that skip away over the field and stick in the ground
                var cnt = N(7, c);
                for (var q = 0; q < cnt; q++) (function (q) {
                  var a = q / cnt * 6.283 + rr(-0.2, 0.2), far = V(p.x + Math.cos(a) * rr(1.8, 3.4), 0.12, p.z + Math.sin(a) * rr(1.5, 2.8)), lit = P3.emblem(2, { col: STAR.col, deep: STAR.deep, line: STAR.line, glow: false, spin: 12 }), r2 = 0;
                  homing({ from: p.clone(), to: function () { return far; }, time: c.D(rr(0.3, 0.42)), arc: V(0, rr(0.9, 1.5), 0), fancy: false,
                    trail: { w: 0.05 * c.s, col: c.col, core: 0.8, pts: 9, halo: false },
                    emit: function (e, v, dt) { r2 += dt * 16; lit.set(e, 0.1 * c.s, dt, r2); },
                    onHit: function (e) { lit.kill(); pop(e, c.col, 0.35 * c.s, 0.12); shards(e, STAR.col, STAR.line, 2, 2.2, 0.1); gRing(e, c.col, 0.9 * c.s, 0.3); } });
                })(q);
              } else sc.shake(0.03);
              c.hit(mob, 1 / 3, big ? 1.2 : 0.6);
            } });
        });
      })(i);
    };

    // ============ 마법 발톱: three curved claw blades rake across the monster, one after another ============
    var CLAW = { col: 0xff6ec4, deep: 0xa8126a, line: 0x3a0022 };
    S.slash = function (c) {
      var mob = c.targets[0]; if (!mob) return;
      c.plain = true;
      sc.heroPose('swipe', c.D(0.1), c.col);
      // claws come out of the paw first: three small blades fan open
      var fan = [0, 1, 2].map(function () { return P3.emblem(6, { col: CLAW.col, deep: CLAW.deep, line: CLAW.line, glow: false, rock: 0.1, spin: 0 }); }), ft = 0;
      tick(function (dt) { ft += dt; var k = Math.min(1, ft / c.D(0.1)), at = sc.heroPaw(); fan.forEach(function (b, j) { b.set(at.clone().add(V((j - 1) * 0.08, 0.05, 0.05)), 0.16 * c.s * k, dt, -1.6 + (j - 1) * 0.3); }); if (k >= 1) { fan.forEach(function (b) { b.kill(); }); return true; } });
      after(c.D(0.1), function () {
        for (var i = 0; i < 3; i++) (function (i) {
          after(c.D(i * 0.025), function () {
            var pp = mp(mob), off = (i - 1) * 0.42 * c.s, R_ = 0.95 * c.s * (mob.boss ? 1.4 : 1), ox = off * 0.68, oy = off * 0.73;
            var a = V(pp.x - 0.75 * R_ + ox, pp.y + 0.75 * R_ + oy, pp.z + 0.4), b = V(pp.x + 0.7 * R_ + ox, pp.y - 0.6 * R_ + oy, pp.z + 0.4);
            var blade = P3.emblem(6, { col: CLAW.col, deep: CLAW.deep, line: CLAW.line, glow: false, rock: 0.12, spin: 0 }), t = 0, L = c.D(0.16), HOLD = c.D(0.14), roll = -2.05 + rr(-0.06, 0.06);
            var trail = vx.ribbon({ solid: true, mode: 'trail', w: 0.24 * c.s, color: CLAW.deep, core: 0.55, alpha: 1, maxPts: 16, shrink: 30, minDist: 0.02 });
            var cur = V();
            tick(function (dt) {
              t += dt; var k = Math.min(1, t / L), e = k * k * (3 - 2 * k), h = Math.max(0, t - L) / HOLD;
              cur.lerpVectors(a, b, e); cur.z += Math.sin(k * Math.PI) * 0.15;
              var grow = (k < 0.2 ? k / 0.2 : 1) * (h > 0 ? Math.max(0.01, 1 - h) : 1);
              blade.set(cur, 0.34 * c.s * grow * (mob.boss ? 1.3 : 1), dt, roll, 1);
              if (trail && k < 1) trail.head(cur);
              if (k >= 1 && trail) { trail.detach(); trail = null; }
              if (h >= 1) { blade.kill(); return true; }
            });
            // the moment the blade crosses the middle: the hit
            after(L * 0.5, function () {
              var q = mp(mob);
              pop(q.clone().add(V(ox, oy, 0.3)), c.col, 0.6 * c.s, 0.12);
              sparks(q, [c.col, 0xffffff], N(6, c), 5.5, { dir: b.clone().sub(a), spread: 0.35, size: 0.18 * c.s, stretch: 0.12 });
              shards(q, CLAW.col, CLAW.line, N(3, c), 3.2, 0.12);
              sc.shake(0.06);
              // a deep pink scar stays across the monster for a moment
              var sp = []; for (var sk = 0; sk <= 12; sk++) { var u = sk / 12; sp.push(V(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * 0.08, a.z + 0.05)); }
              vx.ribbon({ solid: true, mode: 'static', sweep: true, pts: sp, w: 0.13 * c.s, color: CLAW.deep, core: 0.6, life: c.D(0.45) });
              if (i === 0) { c.hit(mob, 1, 1.1); sc.hitStop(0.035); }
              if (i === 2) { heavy(0.6); gRing(V(q.x, 0, q.z), c.col, 2.6 * c.s, 0.4); sc.light(q, c.col, 0.9, 0.3); }
            });
          });
        })(i);
      });
    };

    // ============ 털뭉치 폭탄: a real ball of fur with a lit fuse bounces three times and bursts into fluff ============
    var FUR = { col: 0xfff1dc, deep: 0xc8946a };
    S.bounceBomb = function (c) {
      var mob = c.targets[0]; if (!mob) return;
      c.plain = true;
      var left = c.targets.slice();   // every target takes exactly one blast: near ones from the first, far ones when it bounces on
      sc.heroPose('toss', c.D(0.12), c.col);
      after(c.D(0.12), function () { hop(sc.heroPaw(), mob, c.D(0.5), [1.0, 0.45, 0.2], true); });
      function hop(start, mob, dur, hh, big) {
        var t = 0, hops = [0.45, 0.78, 1], seg = -1, lastPos = start.clone(), sz = (big ? 0.25 : 0.2) * c.s, spin = 0;
        var ball = P3.fluffBall({ col: FUR.col, deep: FUR.deep });
        var fuse = E({ pos: start, frame: 'flare', color: [0xffffff, 0xffb040], size: 0.26 * c.s, life: 30, upd: STAY, fadeOut: 1, spin: 9, flicker: 0.5 });
        var P = V();
        tick(function (dt) {
          t += dt / dur; var k = Math.min(1, t), end = mp(mob); end.y = sz;
          var s2 = k < hops[0] ? 0 : k < hops[1] ? 1 : 2, a = s2 ? hops[s2 - 1] : 0, u = (k - a) / (hops[s2] - a);
          if (s2 !== seg) {
            if (seg >= 0) { var land = V(lastPos.x, 0.03, lastPos.z); dust(land, N(4, c), 0.9); P3.puff(V(land.x, 0.15, land.z), { s0: 0.1, s1: 0.32, life: 0.45, vel: V(0, 0.5, 0), dark: 0xc8a888, light: 0xfff6ea, alpha: 0.6 }); sc.shake(0.025); }
            seg = s2;
          }
          var x = start.x + (end.x - start.x) * k, z = start.z + (end.z - start.z) * k;
          var y = (s2 === 0 ? start.y + (end.y - start.y) * u : end.y) + Math.sin(u * Math.PI) * hh[s2];
          var squash = u < 0.1 || u > 0.92 ? 0.7 : 1.08, late = Math.max(0, (k - 0.78) / 0.22), pulse = 1 + late * (0.18 + 0.1 * Math.sin(k * 90));
          spin -= dt * 9; P.set(x, y, z); ball.set(P, sz * pulse, squash, spin);
          if (fuse) { fuse.s0 = fuse.s1 = 0.26 * c.s * (1 + late * 1.4); }
          if (late > 0 && Math.random() < dt * 60) E({ pos: V(x + 0.32 * sz, y + sz * 1.05, z), vel: rdir(2.2).add(V(0, 1.8, 0)), frame: 'streak', color: [0xffffff, 0xffd060, 0xff7a2b], size: [0.1, 0], stretch: 0.08, life: 0.22, drag: 2 });
          if (fuse) { fuse.x = x + 0.32 * sz; fuse.y = y + sz * 1.05; fuse.z = z + 0.05; }
          if (dt > 0 && Math.random() < dt * 30) E({ pos: V(x + 0.32 * sz, y + sz * 1.05, z), vel: rdir(1).add(V(0, 1.3, 0)), frame: 'dot', color: [0xffe080, 0xff6a2b], size: [0.05, 0], life: 0.3, grav: 3 });
          lastPos.set(x, y, z);
          if (k >= 1) { ball.kill(); vx.kill(fuse); land2(V(x, 0.4 * c.s, z), mob, big); return true; }
        });
      }
      function land2(p, mob, big) {
        var R = 1.7 * c.s, hitNow = left.filter(function (m) { return m === mob || ((m.x - p.x) * (m.x - p.x) + (m.z - p.z) * (m.z - p.z) < R * R); });
        left = left.filter(function (m) { return hitNow.indexOf(m) < 0; });
        boom(p, big, hitNow);
        var rest = left.filter(function (m) { return m.alive; });
        if (!rest.length) { left.forEach(function (m) { c.hit(m, 1, 1.4); }); left = []; return; }
        var next = near(rest, p.x, p.z);
        after(c.D(0.06), function () { hop(V(p.x, 0.3 * c.s, p.z), next, c.D(0.34), [0.7, 0.3, 0.12], false); });
      }
      function boom(p, big, list) {
        var B = (big ? 1.15 : 0.85) * c.s;
        sc.hitStop(0.05);
        // a soft warm blast (no white flash over the field), then the fur itself: big clumps of fluff flung out, slowly
        // drifting down, and a cloud of fluff puffing up where it was
        var Gp = V(p.x, 0, p.z);
        P3.blast(Gp, { size: 0.48 * B, col: 0xffa040, low: 0xc0401a, hotness: 0.6, ring: 3.2, ringCol: 0xffb050, crater: false, chips: 0, life: 0.45, flash: true, flashLife: 0.14, keepAdd: true });
        fire(p, N(12, c), { size: 0.75 * B, speed: 3.4, up: 1.6 });
        pop(p, 0xffc890, 1.0 * B, 0.14);
        for (var sm = 0; sm < 4; sm++) P3.puff(V(p.x + rr(-0.2, 0.2), p.y * 0.8 + sm * 0.1, p.z + rr(-0.1, 0.1)), { s0: 0.14 * B, s1: rr(0.35, 0.5) * B, life: rr(0.8, 1.1), vel: V(rr(-0.3, 0.3), rr(0.9, 1.5), 0), drag: 1.4, dark: 0x6a5a54, light: 0xc8bcb4, alpha: 0.35 });
        // the chain of smaller bangs: fluff caught fire goes off around it
        var bangs = big ? 3 : 2;
        for (var bk = 0; bk < bangs; bk++) (function (bk) {
          after(c.D(0.07 + bk * 0.075), function () {
            var a = bk / bangs * 6.283 + rr(-0.5, 0.5), d = rr(0.55, 0.85) * B, q = V(p.x + Math.cos(a) * d, 0, p.z + Math.sin(a) * d * 0.75);
            P3.blast(q, { size: 0.28 * B, col: 0xffb050, low: 0xc0401a, hotness: 0.65, ring: 2.6, ringCol: 0xffb050, crater: false, chips: 0, life: 0.35, flash: true, flashLife: 0.1, keepAdd: true });
            fire(V(q.x, 0.3 * B, q.z), N(5, c), { size: 0.5 * B, speed: 2.6, up: 1.8 });
            P3.puff(V(q.x, 0.3 * B, q.z), { s0: 0.1 * B, s1: 0.3 * B, life: 0.7, vel: V(0, 1.1, 0), drag: 1.5, dark: 0x6a5a54, light: 0xc8bcb4, alpha: 0.3 });
            sparks(V(q.x, 0.3, q.z), [0xffd080, 0xffffff, 0xff8a2b], N(5, c), 4.5, { size: 0.15 });
            sc.shake(0.07); sc.light(V(q.x, 0.4, q.z), 0xff9a40, 0.9, 0.25);
          });
        })(bk);
        for (var j = 0; j < 8; j++) { var a = j / 8 * 6.283 + rr(-0.3, 0.3); P3.puff(V(p.x + Math.cos(a) * 0.2, p.y * 0.7, p.z + Math.sin(a) * 0.15), { s0: 0.1 * B, s1: rr(0.3, 0.45) * B, life: rr(0.7, 1.0), vel: V(Math.cos(a) * 2.6 * B, rr(0.6, 1.6), Math.sin(a) * 1.8 * B), drag: 2.6, dark: 0xc8a888, light: 0xfff8ee, alpha: 0.75 }); }
        for (var f = 0; f < N(9, c); f++) (function () {
          var clump = P3.fluffBall({ col: pick([FUR.col, 0xffe0c0, 0xffd2a8]), deep: FUR.deep }), pos = p.clone(), v = rdir(3.2).add(V(0, 3.2, 0)), r = rr(0.1, 0.17) * c.s, tt = 0, life = rr(0.9, 1.3), rot = 0;
          tick(function (dt) { tt += dt; v.y -= 5 * dt; v.multiplyScalar(Math.max(0, 1 - dt * 1.6)); pos.addScaledVector(v, dt); if (pos.y < r) { pos.y = r; v.set(0, 0, 0); } rot += dt * 4; clump.set(pos, r * Math.min(1, (life - tt) / 0.25), 1, rot); if (tt >= life) { clump.kill(); return true; } });
        })();
        sparks(p, [0xffd080, 0xffffff], N(8, c), 5, { size: 0.18 });
        gGlow(p, 0xff9040, 1.0 * B, 0.3);
        sc.light(p, 0xff9a40, 1.8, 0.35); heavy(1.5);
        list.forEach(function (m) { c.hit(m, 1, 1.4); });
      }
    };

    // ============ 반짝 고리: six balls of light whirl round the wizard, then shoot off at the monsters ============
    S.orbitRing = function (c) {
      // 1) sparkles are drawn in from all round and a ring of light is drawn round the wizard; a second, thinner ring
      //    turns the other way a little tilted, little crystals ride along the rings
      // 2) six ice-blue gem stars spin round on it, each in its own soft light
      // 3) just before letting go the rings tighten, the gems swell and turn bright — then the rings burst outward
      // 4) each gem flies off on a curve, twinkling, and bursts on its monster into a small ring of light and splinters
      c.plain = true;
      sc.heroPose('spin', c.D(0.08), c.col);
      var center = sc.heroCenter(), n = 6, orbs = [], t = 0, launch = c.D(0.36), tight = c.D(0.08), R = 1.25, hits = share(c.targets, n);
      var GEM = { col: 0xd8f6ff, deep: 0x2a8ac8, line: 0x0a2a48 }, LITE = 0xbff0ff;
      var rc = V(center.x, center.y + 0.15, center.z), G = V(center.x, 0, center.z);
      gGlow(G, c.col, 2.4 * c.s, c.D(0.65));
      converge(rc, [c.col, 0xffffff, LITE], N(14, c), 1.6, c.D(0.14));
      var ring = P3.elemRing({ cols: [c.col, 0xffffff, c.col, LITE, c.col], trail: 3 });
      var ring2 = P3.elemRing({ cols: [0xffffff, c.col, LITE, c.col, 0xffffff], trail: 5 });
      // little crystals riding along the two rings (steered every frame)
      var riders = [];
      for (var q = 0; q < N(10, c); q++) riders.push({ u: q / N(10, c) + rr(0, 0.05), inner: q % 2 === 1, x: P3.crystal({ pos: rc, len: 0.08 * c.s, thin: 0.35, col: q % 3 ? LITE : 0xffffff, line: 0x10405a, spin: 10 }) });
      for (var i = 0; i < n; i++) orbs.push({ a0: i * Math.PI / 3, pos: center.clone(), ball: light3(c.col, 1.5, 0.38), gem: P3.emblem(2, { col: GEM.col, deep: GEM.deep, line: GEM.line, glow: false, spin: 8 }),
        rib: vx.ribbon({ solid: true, mode: 'trail', w: 0.07 * c.s, color: c.deep, core: 0.8, maxPts: 16, shrink: 60 }) });
      var P = V(), tmp = V();
      tick(function (dt) {
        t += dt;
        var grow = Math.min(1, t / c.D(0.12)), w = 11 * c.sp;
        // the tightening before the release: 0 → 1 over the last stretch
        var k = Math.max(0, Math.min(1, (t - (launch - tight)) / tight)), squeeze = 1 - 0.18 * k * k, swell = 1 + 0.35 * k;
        var r1 = R * grow * squeeze, r2 = R * 0.78 * grow * squeeze;
        ring.set(rc, r1, 1.5708, -t * 1.75, (0.85 + 0.15 * k) * grow);
        ring2.set(tmp.set(rc.x, rc.y + 0.06, rc.z), r2, 1.5708 - 0.28, t * 2.4, 0.6 * grow);
        riders.forEach(function (d) {
          var rg = d.inner ? ring2 : ring; d.u += dt * (d.inner ? -0.55 : 0.4);
          rg.at(d.u, P); var nx = rg.at(d.u + 0.01, V()).sub(P); d.x.set(P, nx, 0.08 * c.s * grow);
        });
        orbs.forEach(function (o) {
          var a = o.a0 + t * w * (1 + 0.6 * k);
          o.pos.set(center.x + Math.cos(a) * r1, rc.y + Math.sin(a * 2 + t * 4) * 0.06, center.z + Math.sin(a) * r1);
          o.ball.set(o.pos, 0.16 * c.s * (0.6 + 0.4 * grow) * swell); o.gem.set(o.pos, 0.17 * c.s * grow * swell, dt);
          if (o.rib) o.rib.head(o.pos);
          // a twinkle now and then round each gem
          if (Math.random() < dt * 14 * c.n) E({ pos: o.pos.clone().add(rdir(0.12)), vel: rdir(0.4), frame: 'star', color: [0xffffff, LITE], size: [rr(0.05, 0.09), 0], life: rr(0.18, 0.3), spin: 8 });
        });
        if (t < launch) return false;
        // the release: a bright pop in the middle, both rings burst outward and fade, the riders are flung off
        pop(rc, LITE, 0.9 * c.s, 0.16); sc.shake(0.04); sc.light(rc, c.col, 1.0, 0.3);
        var rt = 0; tick(function (d) {
          rt += d; var u = Math.min(1, rt / c.D(0.32)), e = 1 - (1 - u) * (1 - u);
          ring.set(rc, R * (0.82 + e * 1.8), 1.5708, -t * 1.75 - rt * 3, 0.95 * (1 - u));
          ring2.set(tmp.set(rc.x, rc.y + 0.06, rc.z), R * (0.64 + e * 2.3), 1.5708 - 0.28, t * 2.4 + rt * 4, 0.6 * (1 - u));
          if (u >= 1) { ring.kill(); ring2.kill(); return true; }
        });
        riders.forEach(function (d) {
          var rg = d.inner ? ring2 : ring; rg.at(d.u, P); d.x.kill();
          var out = V(P.x - center.x, 0, P.z - center.z).normalize();
          P3.crystal({ pos: P, vel: V(out.x * rr(3, 5.5), rr(1.2, 2.8), out.z * rr(2.5, 4)), grav: 7, drag: 1.4, len: 0.1 * c.s, thin: 0.35, col: LITE, line: 0x10405a, life: rr(0.5, 0.8) });
        });
        orbs.forEach(function (o, i) {
          if (o.rib) o.rib.detach();
          var h = hits[i], from = o.pos.clone();
          if (!h) { o.ball.kill(); o.gem.kill(); pop(from, c.col, 0.4, 0.15); return; }
          after(c.D(i * 0.035), function () {
            var spin = 0;
            homing({ from: from, to: function () { return mp(h.mob); }, time: c.D(0.22), arc: V(rr(0.2, 0.6), rr(0.4, 1.0), rr(-0.5, 0.5)), fancy: false,
              trail: { w: 0.12 * c.s, col: c.col, core: 0.85, pts: 16 },
              emit: function (p, v, dt) {
                spin += dt * 16; o.ball.set(p, 0.16 * c.s); o.gem.set(p, 0.18 * c.s, dt, spin);
                if (Math.random() < dt * 30 * c.n) E({ pos: p.clone().add(rdir(0.08)), vel: rdir(0.6), frame: 'star', color: [0xffffff, LITE], size: [rr(0.05, 0.1), 0], life: rr(0.25, 0.4), spin: 9, drag: 1.5 });
              },
              onHit: function (p) {
                o.ball.kill(); o.gem.kill();
                pop(p, c.col, 0.6 * c.s, 0.13);
                // a small ring of light opens round the monster and the gem breaks into splinters
                var hr = P3.elemRing({ cols: [c.col, 0xffffff, LITE, c.col, 0xffffff], trail: 4 }), ht = 0, hp = p.clone(), ph = rr(0, 1);
                tick(function (d) { ht += d; var u = Math.min(1, ht / 0.28); hr.set(hp, 0.15 + 0.75 * c.s * (1 - (1 - u) * (1 - u)), 1.5708 - 0.35, ph + ht * 3, 1 - u); if (u >= 1) { hr.kill(); return true; } });
                shards(p, LITE, 0x10405a, N(5, c), 3.4, 0.13);
                sparks(p, [c.col, 0xffffff], N(4, c), 4, { size: 0.13 });
                sc.shake(0.03); c.hit(h.mob, h.frac, 0.5);
              } });
          });
        });
        return true;
      });
    };

    // ============ 젤리 발도장: a big jelly paw falls out of the sky and squashes onto one monster ============
    var JELLY = { col: 0xffa8cc, deep: 0xd0507e, line: 0x4a0a26 };
    S.stamp = function (c) {
      var mob = c.pool()[0]; if (!mob) return;
      c.plain = true;
      sc.heroPose('raise', c.D(0.12), c.col);
      var mark = P3.mark({ col: c.col }), mt = 0, markOn = true;
      tick(function (dt) { if (!markOn) { mark.kill(); return true; } mt += dt; mark.set(gp(mob), Math.min(1, mt / c.D(0.32)), 0.45 * c.s); });
      after(c.D(0.14), function () {
        var t = 0, T_FALL = c.D(0.18), from = above(gp(mob), 6.0), to = mp(mob), P = from.clone(), size = 0.4 * c.s * (mob.boss ? 1.4 : 1);
        var paw = P3.emblem(5, { col: JELLY.col, deep: JELLY.deep, line: JELLY.line, glow: false, rock: 0.25, spin: 3 });
        tick(function (dt) {
          t += dt; var k = Math.min(1, t / T_FALL); if (mob.alive) to = mp(mob);
          P.lerpVectors(from, to, k * k); paw.set(P, size, dt, 0.1, 1 + 0.25 * k);
          if (Math.random() < dt * 50 * c.n) E({ pos: P.clone().add(rdir(0.4)), vel: UPC.clone().multiplyScalar(rr(2, 4)), frame: 'dot', color: [0xffffff, c.col], size: [rr(0.06, 0.1), 0], life: rr(0.25, 0.4) });
          if (k < 1) return false;
          markOn = false;
          var g = V(to.x, 0, to.z), land = to.clone();
          // the paw squashes flat, wobbles like jelly and slowly sinks away; the ground keeps the print
          var st = 0, SL = 0.6;
          tick(function (dt2) {
            st += dt2; var u = Math.min(1, st / SL), wob = Math.exp(-u * 6) * Math.cos(u * 26);
            var sy = u < 0.08 ? 1 - 0.55 * (u / 0.08) : 0.45 + 0.55 * (1 - Math.exp(-(u - 0.08) * 9)) + 0.25 * wob, fade = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
            paw.set(V(land.x, land.y - (1 - sy) * size * 0.45, land.z), size * (1 + 0.2 * (1 - sy)) * Math.max(0.01, fade), dt2, 0.1, sy);
            if (u >= 1) { paw.kill(); return true; }
          });
          E({ sys: 'gadd', pos: V(g.x, 0.045, g.z), frame: 'paw', color: [JELLY.deep, c.col], size: [0.9 * c.s, 1.0 * c.s], life: 1.0, rot: 0, alpha: 0.55, fadeOut: 0.5 });
          pop(land, c.col, 1.1 * c.s, 0.15);
          gRing(g, c.col, 2.2 * c.s, 0.4);
          for (var d2 = 0; d2 < 5; d2++) { var a2 = d2 / 5 * 6.283; P3.puff(V(g.x + Math.cos(a2) * 0.3, 0.15, g.z + Math.sin(a2) * 0.22), { s0: 0.12, s1: 0.35, life: 0.55, vel: V(Math.cos(a2) * 2.4, 0.3, Math.sin(a2) * 1.8), drag: 3.2, dark: 0x8a6a6a, light: 0xffe8f0, alpha: 0.5 }); }
          shards(land, JELLY.col, JELLY.line, N(8, c), 4, 0.15);
          sc.light(land, c.col, 1.3, 0.3); heavy(1.1);
          c.hit(mob, 1, 1.7);
          return true;
        });
      });
    };

    // ============ 실뭉치 굴리기: a real ball of yarn rolls from monster to monster, unwinding its thread ============
    S.roll = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('toss', c.D(0.1), c.col);
      var k = Math.max(1, Math.ceil(4 / list.length)), seq = []; for (var r = 0; r < k; r++) seq = seq.concat(list);
      after(c.D(0.1), function () {
        var R0 = 0.3 * c.s, from = sc.heroPaw().setY(R0), cur = from.clone(), last = cur.clone(), i = 0, t = 0, seg = c.D(0.5 / seq.length + 0.03), to = gp(seq[0]);
        var ball = P3.yarnBall({ col: c.col, deep: deep(c.col), line: 0x123a24 }), q = new T.Quaternion(), ax = V(), mv = V();
        var thread = vx.ribbon({ solid: true, mode: 'trail', w: 0.045 * c.s, color: c.col, core: 0.3, maxPts: 28, shrink: 12, minDist: 0.08 });
        tick(function (dt) {
          var mob = seq[i]; t += dt / seg; var kk = Math.min(1, t); if (mob.alive) to = gp(mob);
          cur.lerpVectors(from, V(to.x, R0, to.z), kk); cur.y += Math.abs(Math.sin(kk * Math.PI)) * (i ? 0.45 : 0.12);
          // it really rolls: turned about the axis across its motion by the distance it went
          mv.copy(cur).sub(last); mv.y = 0; var dist = mv.length();
          if (dist > 1e-5) { ax.crossVectors(UPV, mv).normalize(); q.premultiply(QA.setFromAxisAngle(ax, dist / R0)); }
          last.copy(cur); ball.set(cur, R0, q);
          if (thread) thread.head(V(cur.x, 0.04, cur.z));
          if (Math.random() < dt * 20) dust(V(cur.x, 0, cur.z), 1, 0.5);
          if (kk < 1) return false;
          var m = mp(mob);
          pop(m, c.col, 0.7 * c.s, 0.13); sc.shake(0.06); sc.hitStop(0.03);
          for (var s = 0; s < 3; s++) { var a = rr(0, 6.283); P3.puff(V(m.x, 0.25, m.z), { s0: 0.08, s1: 0.25, life: 0.5, vel: V(Math.cos(a) * 1.8, rr(0.4, 1.0), Math.sin(a) * 1.3), drag: 3, dark: deep(c.col), light: 0xeafff2, alpha: 0.5 }); }
          sparks(m, [c.col, 0xffffff], N(5, c), 4.5, { size: 0.15 });
          c.hit(mob, 1 / k, 1.0);
          i++; t = 0; from.copy(cur);
          if (i < seq.length) return false;
          // at the end it unwinds into a little heap and is gone
          if (thread) thread.detach();
          var et = 0, endAt = cur.clone();
          tick(function (dt2) { et += dt2; var u = Math.min(1, et / 0.35); ball.set(V(endAt.x, R0 * (1 - u * 0.6), endAt.z), R0 * (1 - u), q); if (u >= 1) { ball.kill(); return true; } });
          gRing(V(endAt.x, 0, endAt.z), c.col, 1.4 * c.s, 0.3);
          return true;
        });
      });
    };

    // ============ 별가루 소나기: a handful of star dust is thrown up and comes down as little gem stars ============
    S.sprinkle = function (c) {
      c.plain = true;
      sc.heroPose('spin', c.D(0.08), c.col);
      var tip = c.from;
      pop(tip, c.col, 0.6 * c.s, 0.14);
      for (var i = 0; i < N(10, c); i++) P3.crystal({ pos: tip.clone().add(rdir(0.08)), vel: UPC.clone().multiplyScalar(rr(5, 8)).add(V(rr(-2.2, 2.2), 0, rr(-0.5, 0.5))), grav: 4, drag: 1.4, len: 0.1, col: 0xe8dcff, line: 0x2a1a5a, life: c.D(rr(0.3, 0.45)) });
      volley(c, { shots: 10, t0: 0.17, span: 0.36, fire: function (mob, frac) {
        if (!mob) return;
        var from = above(gp(mob), rr(4.6, 5.6)).add(V(rr(-0.9, 0.9), 0, 0)), star = P3.emblem(2, { col: 0xe8dcff, deep: 0x7a5ad8, line: 0x22104a, glowA: 0.2, spin: 10 }), roll = rr(0, 6);
        homing({ from: from, to: function () { return mp(mob); }, time: c.D(0.2), fancy: false, ease: function (x) { return x * x * 0.6 + x * 0.4; },
          trail: { w: 0.1 * c.s, col: c.col, core: 0.9, pts: 12, halo: false },
          emit: function (p, v, dt) { roll += dt * 12; star.set(p, 0.21 * c.s, dt, roll); },
          onHit: function (p) {
            star.kill();
            pop(p, c.col, 0.5 * c.s, 0.12);
            shards(p, 0xe8dcff, 0x22104a, N(4, c), 3.2, 0.14);
            gRing(V(p.x, 0, p.z), c.col, 1.0 * c.s, 0.28);
            c.hit(mob, frac, 0.5);
          } });
      } });
    };
  };
})(this);
