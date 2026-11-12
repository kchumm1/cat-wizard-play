// Skill choreography: every skill has a wind-up (pose + charge), a travelling part and a layered impact.
(function (root) {
  var CW = root.CW = root.CW || {};
  var T = root.THREE;
  function V(x, y, z) { return new T.Vector3(x || 0, y || 0, z || 0); }
  function rr(a, b) { return a + Math.random() * (b - a); }
  function rdir(m, flatY) { var u = rr(-1, 1), a = rr(0, 6.283), s = Math.sqrt(1 - u * u); return V(Math.cos(a) * s * m, u * m * (flatY === undefined ? 1 : flatY), Math.sin(a) * s * m); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function STAY() { return true; }
  var hsl = {};
  function deep(hex) { var col = new T.Color(hex); col.getHSL(hsl); col.setHSL(hsl.h, Math.min(1, hsl.s * 1.15 + 0.2), Math.min(0.62, hsl.l * 0.82)); return col.getHex(); }
  function sway(p, dt) { p.x += Math.sin(p.t * 6 + p.s0 * 40) * dt * 0.5; }

  function createFx(sc) {
    var vx = CW.createVfx(sc.scene, sc.camera);
    var staffCol = 0xffe14a;
    var timers = [], ticks = [], time = 0, dustCol = 0xd8c8a8, idleT = 0, crackleT = 0, tierNow = 1;
    function after(t, fn) { timers.push({ at: time + Math.max(0, t), fn: fn }); }
    function tick(fn) { ticks.push(fn); }
    function E(o) {
      if (o.size !== undefined) {
        // Thin silhouettes can spread; opaque glows stay local so monsters remain readable.
        var ground = o.sys === 'gadd' || o.sys === 'gnorm';
        var outline = o.frame === 'ring' || o.frame === 'shock' || o.frame === 'circle' || o.frame === 'crescent' || o.frame === 'frost';
        var lim = ground && outline ? 11.5 : ground ? 6 : outline ? 8.5 : (o.frame === 'streak' ? 7 : 3.4);
        o.size = Array.isArray(o.size) ? [Math.min(o.size[0], lim), Math.min(o.size[1], lim)] : Math.min(o.size, lim);
      }
      return vx.emit(o);
    }
    function N(n, c) { return Math.max(1, Math.round(n * vx.quality() * (c ? c.n : 1))); }
    function clone(o, extra) { var r = {}; for (var k in o) r[k] = o[k]; for (var j in extra) r[j] = extra[j]; return r; }

    // ---------- building blocks ----------
    // size caps: with the wide view a spell flash must stay around the crowd, not cover the screen
    function capS(v, m) { return Array.isArray(v) ? [Math.min(v[0], m), Math.min(v[1], m)] : Math.min(v, m); }
    // the play field as the camera sees it: spells may now spread over all of it
    var FC = V(0, 0, -0.4);
    function fieldPt(y) { var z = rr(-4.3, 3.4); return V(rr(-1, 1) * (1.9 + (3.8 - z) * 0.15), y || 0, z); }
    // n spots scattered over the whole field, one after another
    function fieldPops(c, n, t0, gap, fn) { for (var i = 0; i < n; i++) (function (i) { after(c.D(t0 + i * gap + rr(0, gap)), function () { fn(fieldPt(0), i); }); })(i); }
    // rings rolling out from a point until they leave the screen
    function fieldWave(pos, col, life, col2) {
      var G = V(pos.x, 0.035, pos.z);
      E({ sys: 'gadd', pos: G, frame: 'shock', color: col, size: [0.6, 11], ease: 1, life: life || 0.7, fadeOut: 0.35, rot: 0, alpha: 0.8 });
      E({ sys: 'gadd', pos: G, frame: 'ring', color: 0xffffff, size: [0.4, 8], ease: 1, life: (life || 0.7) * 0.8, fadeOut: 0.3, rot: 0, alpha: 0.5 });
      E({ sys: 'gadd', pos: G, frame: 'shock', color: col2 || col, size: [0.3, 9.5], ease: 1, life: (life || 0.7) * 1.25, delay: 0.09, fadeOut: 0.4, rot: 0, alpha: 0.55 });
    }
    // things falling (or rising) over the whole field
    function fieldRain(c, n, dur, o) {
      for (var i = 0; i < N(n, c); i++) {
        var p = fieldPt(0); p.y = o.y === undefined ? rr(2.4, 4.2) : o.y();
        E({ pos: p, vel: o.vel(), frame: pick(o.frames), color: o.cols, size: o.size(), life: rr(0.7, 1.2) * (o.life || 1), delay: rr(0, dur), spin: rr(-3, 3), upd: o.sway ? sway : undefined, fadeIn: 0.15, fadeOut: 0.3, white: o.white, stretch: o.stretch, grav: o.grav || 0, drag: o.drag || 0 });
      }
    }
    function flare(pos, col, size, life, o) { size = Math.min(size, 2.6); return E(clone({ pos: pos, frame: 'flare', color: col, size: [size, size * 0.25], life: life || 0.2, ease: 1, fadeOut: 0.25, spin: rr(-2, 2) }, o)); }
    function glow(pos, col, size, life, o) { return E(clone({ pos: pos, frame: 'glow', color: col, size: capS(size, 2.8), life: life || 0.3 }, o)); }
    function sparks(pos, col, n, speed, o) {
      o = o || {};
      for (var i = 0; i < n; i++) {
        var d = o.dir ? o.dir.clone().normalize().multiplyScalar(speed * rr(0.6, 1.1)).add(rdir(speed * (o.spread || 0.5))) : rdir(speed * rr(0.5, 1));
        if (o.up) d.y += o.up;
        E({ pos: pos, vel: d, frame: 'streak', color: Array.isArray(col) ? pick(col) : col, size: [o.size || 0.2, 0], stretch: o.stretch || 0.11, life: rr(0.18, 0.36) * (o.life || 1), drag: o.drag || 3.2, grav: o.grav || 0, ease: 1, hot: o.hot });
      }
    }
    function embers(pos, col, n, o) {
      o = o || {};
      for (var i = 0; i < n; i++) E({ pos: pos.clone().add(rdir(o.r || 0.15)), vel: rdir(o.speed || 2.2).add(V(0, o.up === undefined ? 1.6 : o.up, 0)), frame: 'dot', color: Array.isArray(col) ? pick(col) : col,
        size: [rr(0.05, 0.1) * (o.size || 1), 0], life: rr(0.5, 1.0) * (o.life || 1), grav: o.grav === undefined ? 3.5 : o.grav, drag: 1.2, flicker: 0.3, stretch: o.stretch || 0.04 });
    }
    function smoke(pos, col, n, o) {
      o = o || {};
      for (var i = 0; i < n; i++) E({ sys: 'norm', pos: pos.clone().add(rdir(o.r || 0.2, 0.5)), vel: rdir(o.speed || 0.8, 0.5).add(V(0, o.rise === undefined ? 0.6 : o.rise, 0)), frame: 'smoke',
        color: Array.isArray(col) ? col : [col], size: [rr(0.3, 0.5) * (o.size || 1), rr(0.9, 1.4) * (o.size || 1)], ease: 1, life: rr(0.7, 1.2) * (o.life || 1), drag: 2, alpha: o.alpha || 0.5, spin: rr(-1, 1), fadeIn: 0.12, fadeOut: 0.35 });
    }
    function fire(pos, n, o) {
      o = o || {};
      for (var i = 0; i < n; i++) {
        var v = rdir(o.speed || 2.5).add(V(0, o.up === undefined ? 1.0 : o.up, 0)); if (o.v) v.add(o.v);
        E({ sys: i % 2 ? 'col' : 'add', pos: pos.clone().add(rdir(o.r || 0.12)), vel: v, frame: 'flame', color: o.cols || (i % 2 ? [0xffd060, 0xff7a1a, 0xc8301a, 0x5a1a10] : [0xffffff, 0xffe080, 0xff8a2b, 0xd2361a]),
          size: [rr(0.35, 0.55) * (o.size || 1), rr(1.0, 1.5) * (o.size || 1)], ease: 1, life: rr(0.35, 0.6) * (o.life || 1), drag: 3, spin: rr(-3, 3), fadeOut: 0.4, hot: o.hot });
      }
    }
    function shock(pos, col, r, life, o) {
      r = Math.min(r, 8.5);
      E(clone({ pos: pos, frame: 'ring', color: 0xffffff, size: [r * 0.15, r * 0.92], ease: 1, life: (life || 0.35) * 0.8, fadeOut: 0.2, rot: 0, alpha: 0.5, white: true }, o));
      return E(clone({ sys: 'col', pos: pos, frame: 'shock', color: col, size: [r * 0.15, r], ease: 1, life: life || 0.35, fadeOut: 0.3, rot: 0, alpha: 0.75 }, o));
    }
    function ring(pos, col, r, life, o) { r = Math.min(r, 7.5); return E(clone({ pos: pos, frame: 'ring', color: col, size: [r * 0.2, r], ease: 1, life: life || 0.3, fadeOut: 0.2, rot: 0 }, o)); }
    function gRing(pos, col, r, life) { r = Math.min(r, 11); return E({ sys: 'gadd', pos: V(pos.x, 0.035, pos.z), frame: 'shock', color: col, size: [r * 0.1, r], ease: 1, life: life || 0.5, fadeOut: 0.25, rot: 0 }); }
    function gGlow(pos, col, r, life) { r = Math.min(r, 4.2); return E({ sys: 'gadd', pos: V(pos.x, 0.03, pos.z), frame: 'glow', color: col, size: [r, r * 1.15], life: life || 0.6, fadeIn: 0.05, fadeOut: 0.2, alpha: 0.8 }); }
    function scorch(pos, r, life) { return E({ sys: 'gnorm', pos: V(pos.x, 0.025, pos.z), frame: 'smoke', color: 0x1a1210, size: [r * 0.6, r], ease: 1, life: life || 2.2, alpha: 0.5, fadeIn: 0.05, fadeOut: 0.5 }); }
    function dust(pos, n, size) {
      for (var i = 0; i < n; i++) E({ sys: 'norm', pos: V(pos.x + rr(-0.15, 0.15), 0.08, pos.z + rr(-0.1, 0.1)), vel: V(rr(-1.1, 1.1), rr(0.2, 0.7), rr(-0.3, 0.3)), frame: 'smoke', color: dustCol,
        size: [0.15 * size, 0.55 * size], ease: 1, life: rr(0.4, 0.7), drag: 3, alpha: 0.5, fadeOut: 0.3 });
    }
    // flat magic circle on the ground, two counter-rotating layers and motes rising from its rim
    function circle(pos, col, r, life, o) {
      o = o || {};
      E({ sys: 'gadd', pos: V(pos.x, 0.045, pos.z), frame: 'circle', color: col, size: [r * 0.5, r], ease: 2, life: life, spin: o.spin || 1.4, fadeIn: 0.08, fadeOut: 0.65, alpha: o.alpha || 0.95 });
      E({ sys: 'gadd', pos: V(pos.x, 0.05, pos.z), frame: 'circle', color: col, size: [r * 0.3, r * 0.55], ease: 2, life: life, spin: -(o.spin || 1.4) * 1.8, fadeIn: 0.08, fadeOut: 0.6, alpha: 0.7 });
      E({ sys: 'gadd', pos: V(pos.x, 0.04, pos.z), frame: 'glow', color: col, size: [r * 0.6, r * 1.3], ease: 1, life: life, fadeOut: 0.5, alpha: 0.35 });
      for (var i = 0; i < Math.round(10 * vx.quality()); i++) { var a = rr(0, 6.283); E({ pos: V(pos.x + Math.cos(a) * r * 0.48, 0.1, pos.z + Math.sin(a) * r * 0.35), vel: V(0, rr(0.8, 1.6), 0), frame: 'dot', color: [0xffffff, col], size: [0.07, 0], life: rr(0.4, 0.8), delay: rr(0, life * 0.5), drag: 0.5 }); }
    }
    // camera-facing spell seal (a magic circle drawn in the air)
    function seal(pos, col, r, life) {
      E({ pos: pos, frame: 'circle', color: col, size: [r * 0.3, r], ease: 2, life: life, spin: 3.5, fadeOut: 0.6 });
      E({ pos: pos, frame: 'glow', color: col, size: [r * 0.4, r * 1.3], ease: 1, life: life, alpha: 0.5, fadeOut: 0.6 });
    }
    function converge(pos, col, n, radius, dur, o) {
      o = o || {};
      for (var i = 0; i < n; i++) {
        var d = rdir(radius * rr(0.6, 1)), life = dur * rr(0.55, 1);
        E({ pos: pos.clone().add(d), vel: d.clone().multiplyScalar(-1 / life), frame: o.frame || 'dot', color: Array.isArray(col) ? pick(col) : col, size: [rr(0.06, 0.11), 0.02], life: life, delay: rr(0, Math.max(0, dur - life)), stretch: 0.12, fadeIn: 0.35, fadeOut: 0.9 });
      }
    }
    // a sharp star-shaped hit: white pop, coloured spikes, thin rings, fast streaks, falling glitter
    function impact(pos, col, power, o) {
      o = o || {}; var P = power || 1, front = pos.clone().add(V(0, 0, 0.25)), dk = deep(col);
      flare(front, 0xffffff, 0.55 * P, 0.1, { white: true });
      E({ sys: 'col', pos: front, frame: 'star', color: [dk, col], size: [0.25 * P, 0.75 * P], ease: 1, life: 0.16, spin: rr(-6, 6), alpha: 0.95 });
      for (var k = 0; k < 6; k++) E({ sys: 'col', pos: front, frame: 'streak', color: k % 2 ? col : dk, size: [0.12 * P, 0.95 * P], ease: 1, life: 0.13, rot: k / 6 * 3.1416 + rr(-0.15, 0.15), alpha: 0.9 });
      E({ pos: front, frame: 'ring', color: 0xffffff, size: [0.15 * P, 0.9 * P], ease: 1, life: 0.16, alpha: 0.7, white: true });
      E({ sys: 'col', pos: front, frame: 'shock', color: col, size: [0.2 * P, 1.35 * P], ease: 1, life: 0.24, alpha: 0.7 });
      sparks(pos, [col, 0xffffff, col], Math.max(3, Math.round(11 * P * vx.quality())), 5.5 * Math.sqrt(P), { size: 0.2 * Math.sqrt(P), stretch: 0.13 });
      for (var g = 0; g < Math.max(1, Math.round(5 * P * vx.quality())); g++) E({ pos: pos.clone().add(rdir(0.15)), vel: rdir(2.4).add(V(0, 2.2, 0)), frame: pick(['star', 'flare']), color: [0xffffff, col], size: [rr(0.08, 0.14) * Math.sqrt(P), 0], life: rr(0.45, 0.8), grav: 4.5, drag: 1.2, spin: rr(-9, 9) });
      if (P >= 0.9) E({ sys: 'gadd', pos: V(pos.x, 0.035, pos.z), frame: 'shock', color: col, size: [0.1, 1.3 * P], ease: 1, life: 0.35, alpha: 0.75 });
      sc.light(pos, col, 0.6 * P, 0.25);
    }
    // where the crowd is: average of the targets on the ground, or just in front of the wizard
    function crowdCenter(targets) {
      if (!targets.length) { var h = sc.heroCenter(); return V(h.x + 1.2, 0, h.z - 0.6); }
      var c = V(); targets.forEach(function (m) { c.x += m.x; c.z += m.z; }); c.multiplyScalar(1 / targets.length); return c;
    }
    // muzzle burst where a spell leaves the paw, pointing at the target
    function muzzle(at, toward, col, size) {
      var dir = toward.clone().sub(at); dir.y *= 0.4; dir.normalize(); var S = size || 1;
      flare(at, 0xffffff, 0.75 * S, 0.12, { white: true });
      E({ pos: at, frame: 'ring', color: col, size: [0.15 * S, 0.8 * S], ease: 1, life: 0.18, alpha: 0.85 });
      E({ sys: 'col', pos: at, frame: 'star', color: deep(col), size: [0.6 * S, 0.1], ease: 1, life: 0.16, spin: 10 });
      sparks(at, [col, 0xffffff], N(5), 5 * S, { dir: dir, spread: 0.35, size: 0.16 * S, stretch: 0.12 });
    }
    function heavy(amt) { sc.shake(0.12 * amt); sc.punch(0.035 * amt); if (amt >= 1) sc.hitStop(0.04 * Math.min(2, amt)); }

    // A readable charge -> contact -> afterglow, with a different silhouette for each element.
    // These decorations never schedule or repeat a damage callback.
    function spellCharge(c) {
      var G = c.center.clone().setY(0.045), grade = c.sk.tier || 1;
      var r = Math.min(5.2, 1.6 + grade * 0.32), life = c.D(0.5);
      E({ sys: 'gadd', pos: G, frame: 'circle', color: c.deep, size: [r * 0.65, r], life: life,
        spin: -1.8, alpha: 0.38, ease: 2, fadeIn: 0.08, fadeOut: 0.6 });
      E({ pos: c.from, frame: 'crescent', color: c.col, size: [0.3, 0.85], life: c.D(0.28),
        spin: 13, alpha: 0.8, fadeOut: 0.55 });
      if (grade >= 3) {
        var count = N(8, c);
        for (var i = 0; i < count; i++) {
          var a = i / count * Math.PI * 2;
          E({ pos: c.from.clone().add(V(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.05)),
            vel: V(-Math.cos(a) * 2.3, -Math.sin(a) * 2.3, 0), frame: 'streak', color: [c.col, 0xffffff],
            size: [0.13, 0.03], life: c.D(0.24), stretch: 0.08, fadeIn: 0.15 });
        }
      }
    }
    function spellContact(c, mob, power, finale) {
      var p = sc.mobPos(mob).clone().add(V(0, 0, 0.32));
      var grade = c.sk.tier || 1, s = Math.min(1.65, Math.sqrt(c.s));
      var shape = c.sk.shape, frame = 'star', palette = [0xffffff, c.col, c.deep];
      if (shape === 'slash' || shape === 'orbitRing' || shape === 'beam') frame = 'crescent';
      if (shape === 'blizzard') frame = 'shard';
      if (shape === 'fireball' || shape === 'flash') frame = 'flame';
      if (shape === 'vortex') frame = 'circle';
      if (shape === 'bounceBomb') frame = 'fluff';
      if (shape === 'chain') frame = 'streak';
      if (shape === 'nova') palette = [0xff6a2b, 0x7bddff, 0xb68aff, 0xffe14a, 0xffffff];
      var count = N(8 + Math.min(8, grade), c);
      for (var i = 0; i < count; i++) {
        var a = i / count * Math.PI * 2 + rr(-0.1, 0.1), speed = rr(2.2, 4.2) * s;
        E({ sys: i % 3 ? 'col' : 'add', pos: p.clone().add(V(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0)),
          vel: V(Math.cos(a) * speed, Math.sin(a) * speed * 0.8, rr(-0.3, 0.3)), frame: frame,
          color: pick(palette), size: [rr(0.14, 0.27) * s, 0.025], life: c.D(rr(0.32, 0.56)),
          spin: rr(-9, 9), drag: 2.8, grav: shape === 'blizzard' ? 4 : 0.8, stretch: 0.06 });
      }
      // Offset echoes separate the silhouette into three beats instead of one white blob.
      ring(p, c.deep, (1.25 + grade * 0.08) * s, c.D(0.32), { sys: 'col', alpha: 0.8 });
      ring(p, c.col, (1.7 + grade * 0.1) * s, c.D(0.46), { delay: c.D(0.065), alpha: 0.7 });
      E({ pos: p, frame: 'flare', color: 0xffffff, size: [0.75 * s, 0], ar: 0.18,
        life: c.D(0.15), rot: -0.35, white: true, alpha: 0.95 });
      for (var j = 0; j < N(3, c); j++) E({ sys: 'col', pos: p, frame: 'crescent', color: c.col,
        size: [0.35, 1.5 * s], life: c.D(0.3), rot: j * 2.094, spin: 5, alpha: 0.6 });
      if (finale && grade >= 5) {
        var C = c.center.clone().setY(0.65), G = c.center.clone().setY(0.04);
        var radius = Math.min(9, (3.2 + grade * 0.55) * s);
        E({ sys: 'gadd', pos: G, frame: 'circle', color: c.deep, size: [radius * 0.35, radius],
          life: c.D(0.65), spin: -2.4, ease: 1, alpha: 0.35, fadeOut: 0.3 });
        gRing(G, c.col, radius, c.D(0.55));
        ring(C, c.col, Math.min(7, radius), c.D(0.48), { alpha: 0.65, delay: c.D(0.08) });
        var rays = N(12, c);
        for (var k = 0; k < rays; k++) {
          var angle = k / rays * Math.PI * 2;
          E({ pos: C.clone().add(V(Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 0.1)),
            vel: V(Math.cos(angle) * 5, Math.sin(angle) * 3.4, 0), frame: 'streak', color: pick(palette),
            size: [0.25, 0.04], stretch: 0.15, life: c.D(0.4), drag: 2.2 });
        }
        sc.punch(0.025 + grade * 0.003);
      }
    }
    // hits spread over targets so that every target receives a total fraction of 1
    function share(targets, n) {
      if (!targets.length) return [];
      var cnt = targets.map(function () { return 0; }), out = [];
      for (var i = 0; i < n; i++) cnt[i % targets.length]++;
      for (var j = 0; j < n; j++) out.push({ mob: targets[j % targets.length], frac: 1 / cnt[j % targets.length] });
      return out;
    }
    // projectile on a curved path that tracks a moving target, with heads, ribbon trail and an emitter
    function homing(o) {
      var start = o.from.clone(), t = 0, last = start.clone(), cur = V(), ctrl = V(), vel = V(), arc = o.arc || V();
      var rib = o.trail ? vx.ribbon({ solid: true, mode: 'trail', w: o.trail.w, color: deep(o.trail.col), core: o.trail.core === undefined ? 0.7 : o.trail.core, alpha: 0.95, maxPts: o.trail.pts || 16, shrink: o.trail.shrink || 60, minDist: 0.03 }) : null;
      var halo = o.trail && o.trail.halo !== false ? vx.ribbon({ mode: 'trail', w: o.trail.w * 2.0, color: o.trail.col, core: 0, alpha: 0.2, maxPts: o.trail.pts || 16, shrink: o.trail.shrink || 60, minDist: 0.03 }) : null;
      var hc = o.trail ? o.trail.col : 0xffffff, hw = o.trail ? o.trail.w : 0.15;
      var extra = o.fancy === false ? [] : [{ frame: 'ring', color: hc, size: hw * 4.2, spin: 7, alpha: 0.6 }, { sys: 'col', frame: 'star', color: deep(hc), size: hw * 3.2, spin: -11, alpha: 0.85 }];
      var heads = (o.heads || []).concat(extra).map(function (h) { return E(clone({ pos: start, life: 30, upd: STAY, fadeOut: 1 }, h)); });
      if (o.fancy !== false && !o.noMuzzle) muzzle(start, o.to(), hc, Math.min(1.4, hw * 6));
      tick(function (dt) {
        t += dt / o.time; var k = Math.min(1, t), ke = o.ease ? o.ease(k) : k * (0.55 + 0.45 * k), end = o.to();
        ctrl.copy(start).lerp(end, 0.5).add(arc);
        var a = (1 - ke) * (1 - ke), b = 2 * (1 - ke) * ke, c2 = ke * ke;
        cur.set(a * start.x + b * ctrl.x + c2 * end.x, a * start.y + b * ctrl.y + c2 * end.y, a * start.z + b * ctrl.z + c2 * end.z);
        if (dt > 1e-4) vel.copy(cur).sub(last).multiplyScalar(1 / dt);
        for (var i = 0; i < heads.length; i++) { var p = heads[i]; if (p) { p.x = cur.x; p.y = cur.y; p.z = cur.z; p.vx = vel.x; p.vy = vel.y; p.vz = vel.z; } }
        if (rib) rib.head(cur); if (halo) halo.head(cur);
        if (o.emit && dt > 0) o.emit(cur, vel, dt, k);
        if (o.fancy !== false && dt > 0 && Math.random() < dt * 34 * vx.quality()) E({ pos: cur.clone().add(rdir(hw * 0.6)), vel: rdir(0.5), frame: pick(['star', 'dot', 'flare']), color: [0xffffff, hc], size: [rr(0.06, 0.12), 0], life: rr(0.3, 0.55), spin: rr(-8, 8), drag: 1 });
        last.copy(cur);
        if (k >= 1) { heads.forEach(vx.kill); if (rib) rib.detach(); if (halo) halo.detach(); o.onHit(end.clone()); return true; }
      });
    }
    function spiralTo(tip, a0, r0) {
      return function (p, dt, k) { var a = a0 + k * 5, r = r0 * (1 - k); p.x = tip.x + Math.cos(a) * r; p.y = tip.y + Math.sin(a) * r; p.z = tip.z + 0.05; return true; };
    }
    function spiralIn(C, a0, r0, turns) {
      return function (p, dt, k) {
        var r = r0 * (1 - k * k * 0.97), a = a0 + k * turns * (1.6 - r0 * 0.25);
        var nx = C.x + Math.cos(a) * r, ny = C.y + Math.sin(a) * r * 0.32, nz = C.z + Math.sin(a) * r * 0.3;
        if (dt > 1e-4) { p.vx = (nx - p.x) / dt; p.vy = (ny - p.y) / dt; p.vz = (nz - p.z) / dt; }
        p.x = nx; p.y = ny; p.z = nz; return true;
      };
    }
    function explosion(c, p, S_, col) {
      sc.hitStop(0.06);
      flare(p, 0xffffff, 1.5 * S_, 0.16, { white: true });
      glow(p, 0xff8a30, [0.8, 2.8 * S_], 0.4, { ease: 1, alpha: 0.8 });
      fire(p, N(16, c), { size: S_, speed: 3.2, up: 1.2 });
      smoke(p, [0x6a5a54, 0x2e2624], N(9, c), { size: S_ * 1.1, rise: 1.0, speed: 1.4, life: 1.3 });
      sparks(p, [0xffe080, 0xffffff, 0xff8a2b], N(16, c), 6.5, { size: 0.26, stretch: 0.14 });
      embers(p, [0xffe080, 0xff6a2b], N(12, c), { speed: 3.2, up: 2.2 });
      shock(p, 0xffc080, 3.4 * S_, 0.4); gRing(p, col, 5.5 * S_, 0.6); scorch(p, 1.8 * S_, 2.5); gGlow(p, 0xff7a2b, 2.6 * S_, 0.5);
      // burning bits arc out and keep falling over a wide area
      for (var b = 0; b < N(14, c); b++) E({ sys: b % 2 ? 'col' : 'add', pos: p.clone().add(rdir(0.2)), vel: V(rr(-5.5, 5.5), rr(3, 6.5), rr(-3.5, 3.5)), frame: 'flame', color: [0xffe080, 0xff7a1a, 0xc8301a], size: [rr(0.3, 0.5) * S_, 0.08], life: rr(0.7, 1.1), grav: 9, drag: 0.6, spin: rr(-5, 5), fadeOut: 0.3 });
      sc.light(p, 0xff8a3a, 2, 0.4); heavy(1.5); sc.flash('rgba(255,170,90,0.35)', 0.22);
    }

    // ---------- the 12 skills ----------
    var S = {};
    S.bolt3 = function (c) {
      var mob = c.targets[0]; if (!mob) return;
      sc.heroPose('thrust', c.D(0.09), c.col);
      converge(c.from, [c.col, 0xffffff], N(8, c), 0.55, c.D(0.1));
      glow(c.from, c.col, [0.2, 0.7], c.D(0.12), { fadeIn: 0.6 });
      for (var i = 0; i < 3; i++) (function (i) {
        after(c.D(0.09 + i * 0.085), function () {
          var tip = sc.heroPaw(), big = i === 2, sz = (big ? 0.7 : 0.5) * c.s;
          flare(tip, 0xffffff, 0.7 * c.s, 0.12, { white: true }); ring(tip, c.col, 0.55 * c.s, 0.18);
          homing({ from: tip, to: function () { return sc.mobPos(mob); }, time: c.D(0.24), arc: V(0.1, [0.6, -0.3, 0.25][i], [0.25, -0.2, 0][i]),
            trail: { w: 0.16 * c.s * (big ? 1.35 : 1), col: c.col, core: 0.8, pts: 14 },
            heads: [{ sys: 'col', frame: 'glow', color: c.deep, size: sz * 1.25, alpha: 0.75 }, { frame: 'glow', color: c.col, size: sz * 2.6, alpha: 0.18 }, { frame: 'star', color: 0xffffff, size: sz, spin: 14, white: true }],
            emit: function (p, v, dt) { if (Math.random() < dt * 40 * c.n) E({ pos: p.clone().add(rdir(0.06)), vel: rdir(0.6), frame: 'flare', color: [0xffffff, c.col], size: [0.15 * c.s, 0], life: 0.3, spin: 4 }); },
            onHit: function (p) {
              impact(p, c.col, (big ? 1.05 : 0.65) * c.s);
              for (var k = 0; k < N(big ? 8 : 5, c); k++) E({ sys: 'col', pos: p, vel: rdir(3.4).add(V(0, 1.4, 0)), frame: 'star', color: [c.col, c.deep], size: [0.24 * c.s, 0.06], life: rr(0.3, 0.5), grav: 4, drag: 1.5, spin: rr(-10, 10), ease: 1 });
              if (big) {
                heavy(0.6); gRing(p, c.col, 3.4 * c.s, 0.45);
                // the last star bursts into a ring of little stars that skip away over the field
                var cnt = N(8, c);
                for (var q = 0; q < cnt; q++) (function (q) {
                  var a = q / cnt * 6.283 + rr(-0.2, 0.2), far = V(p.x + Math.cos(a) * rr(2.2, 4), 0.15, p.z + Math.sin(a) * rr(1.8, 3.2));
                  homing({ from: p.clone(), to: function () { return far; }, time: c.D(rr(0.3, 0.42)), arc: V(0, rr(0.9, 1.5), 0), fancy: false,
                    trail: { w: 0.07 * c.s, col: c.col, core: 0.8, pts: 10, halo: false },
                    heads: [{ frame: 'star', color: 0xffffff, size: 0.3 * c.s, spin: 12, white: true }, { frame: 'glow', color: c.col, size: 0.6 * c.s, alpha: 0.3 }],
                    onHit: function (e) { E({ sys: 'col', pos: e, frame: 'star', color: [c.col, c.deep], size: [0.15, 0.6 * c.s], ease: 1, life: 0.22, spin: 8 }); sparks(e, [c.col, 0xffffff], N(4, c), 3.5, { size: 0.14, up: 1 }); gRing(e, c.col, 1.1 * c.s, 0.3); } });
                })(q);
              }
              c.hit(mob, 1 / 3, big ? 1.2 : 0.6);
            } });
        });
      })(i);
    };
    S.slash = function (c) {
      var mob = c.targets[0]; if (!mob) return;
      sc.heroPose('swipe', c.D(0.1), c.col);
      glow(c.from, c.col, [0.2, 0.8], c.D(0.12), { fadeIn: 0.6 });
      E({ pos: c.from, frame: 'paw', color: c.col, size: [0.15, 0.45 * c.s], life: c.D(0.14), ease: 1, rot: 0, fadeIn: 0.3 });
      after(c.D(0.1), function () {
        homing({ from: sc.heroPaw(), to: function () { return sc.mobPos(mob); }, time: c.D(0.11), arc: V(0, 0.2, 0),
          trail: { w: 0.18 * c.s, col: c.col, core: 0.7, pts: 10, shrink: 90 },
          heads: [{ sys: 'col', frame: 'glow', color: c.deep, size: 0.8 * c.s, alpha: 0.7 }, { sys: 'col', frame: 'paw', color: c.deep, size: 0.7 * c.s, rot: -0.4 }, { frame: 'paw', color: 0xffffff, size: 0.4 * c.s, rot: -0.4, white: true, alpha: 0.8 }],
          onHit: function (p) {
            for (var i = 0; i < 3; i++) (function (i) {
              after(c.D(i * 0.05), function () {
                var pp = sc.mobPos(mob), off = (i - 1) * 0.19;
                var R_ = 0.9 * c.s, a = V(pp.x - 0.62 * R_ + off, pp.y + 0.66 * R_ + off, pp.z + 0.3), b = V(pp.x + 0.55 * R_ + off, pp.y - 0.55 * R_ + off, pp.z + 0.3), m = V((a.x + b.x) / 2 + 0.14, (a.y + b.y) / 2 + 0.12, pp.z + 0.45);
                var bez = new T.QuadraticBezierCurve3(a, m, b), pts = []; for (var k = 0; k <= 20; k++) pts.push(bez.getPoint(k / 20));
                vx.ribbon({ mode: 'static', sweep: true, pts: pts, w: 0.42 * c.s, color: c.col, core: 0, alpha: 0.32, life: c.D(0.3) });
                vx.ribbon({ solid: true, mode: 'static', sweep: true, pts: pts, w: 0.15 * c.s, color: c.deep, core: 0.75, life: c.D(0.4) });
                sparks(pp, [c.col, 0xffffff], N(7, c), 5.5, { dir: b.clone().sub(a), spread: 0.35, size: 0.22 * c.s, stretch: 0.12 });
                flare(pp.clone().add(V(off * 1.5, off, 0.2)), 0xffffff, 0.45 * c.s, 0.1, { white: true });
                if (i === 0) { c.hit(mob, 1, 1.1); sc.hitStop(0.035); }
                sc.shake(0.05);
              });
            })(i);
            E({ sys: 'col', pos: p.clone().add(V(0.05, 0.35, 0.2)), frame: 'paw', color: c.deep, size: [0.35 * c.s, 0.6 * c.s], life: c.D(0.5), ease: 1, rot: 0.3, alpha: 0.5, fadeIn: 0.15, delay: c.D(0.12) });
            shock(p, c.col, 1.4 * c.s, 0.3); sc.light(p, c.col, 0.6, 0.3);
            // three huge claw arcs sweep out past the target
            for (var w = 0; w < 3; w++) E({ pos: p.clone().add(V(0.2 + w * 0.25, (1 - w) * 0.45, 0.2)), vel: V(5.5, -1.2, 0), frame: 'crescent', color: w === 1 ? 0xffffff : c.col, size: [1.2 * c.s, 3.6 * c.s], ease: 1, life: c.D(0.34), delay: c.D(0.04 + w * 0.05), rot: 2.6, drag: 3.5, alpha: 0.7, fadeOut: 0.5 });
            gRing(p, c.col, 4.2 * c.s, 0.45);
            for (var g2 = 0; g2 < N(12, c); g2++) E({ pos: p.clone().add(rdir(0.3)), vel: V(rr(2, 7), rr(-1, 2.5), rr(-1.5, 1.5)), frame: pick(['paw', 'star', 'flare']), color: [0xffffff, c.col], size: [rr(0.14, 0.26) * c.s, 0.03], life: rr(0.4, 0.75), drag: 2.2, grav: 2, spin: rr(-6, 6) });
          } });
      });
    };
    S.bounceBomb = function (c) {
      var mob = c.targets[0]; if (!mob) return;
      sc.heroPose('toss', c.D(0.12), c.col);
      after(c.D(0.12), function () {
        var start = sc.heroPaw(), t = 0, dur = c.D(0.5), hops = [0.45, 0.78, 1], hh = [1.0, 0.45, 0.2], seg = -1, lastPos = start.clone();
        var ball = E({ sys: 'norm', pos: start, frame: 'fluff', color: 0xfff1dc, size: 0.58 * c.s, life: 30, upd: STAY, fadeOut: 1 });
        var shade = E({ sys: 'norm', pos: start, frame: 'fluff', color: c.col, size: 0.46 * c.s, life: 30, upd: STAY, fadeOut: 1, alpha: 0.55 });
        var fuse = E({ pos: start, frame: 'flare', color: [0xffffff, 0xffb040], size: 0.32 * c.s, life: 30, upd: STAY, fadeOut: 1, spin: 9, flicker: 0.5 });
        tick(function (dt) {
          t += dt / dur; var k = Math.min(1, t), end = sc.mobPos(mob); end.y = 0.26 * c.s;
          var s2 = k < hops[0] ? 0 : k < hops[1] ? 1 : 2, a = s2 ? hops[s2 - 1] : 0, u = (k - a) / (hops[s2] - a);
          if (s2 !== seg) {
            if (seg >= 0) { var land = V(lastPos.x, 0.03, lastPos.z); dust(land, N(4, c), 0.9); E({ sys: 'gadd', pos: land, frame: 'shock', color: 0xfff1dc, size: [0.1, 0.8], life: 0.3, ease: 1, rot: 0, alpha: 0.6 }); sc.shake(0.025); }
            seg = s2;
          }
          var x = start.x + (end.x - start.x) * k, z = start.z + (end.z - start.z) * k;
          var y = (s2 === 0 ? start.y + (end.y - start.y) * u : end.y) + Math.sin(u * Math.PI) * hh[s2];
          var squash = u < 0.12 || u > 0.9 ? 0.72 : 1.08;
          [ball, shade].forEach(function (p) { if (p) { p.x = x; p.y = y; p.z = z; p.ar = squash; p.rot -= dt * 12; } });
          if (fuse) { fuse.x = x + 0.13 * c.s; fuse.y = y + 0.3 * c.s; fuse.z = z + 0.05; }
          if (dt > 0 && Math.random() < dt * 30) E({ pos: V(x + 0.13 * c.s, y + 0.3 * c.s, z), vel: rdir(1).add(V(0, 1.3, 0)), frame: 'dot', color: [0xffe080, 0xff6a2b], size: [0.06, 0], life: 0.3, grav: 3 });
          lastPos.set(x, y, z);
          if (k >= 1) { vx.kill(ball); vx.kill(shade); vx.kill(fuse); boom(V(x, 0.45 * c.s, z)); return true; }
        });
      });
      function boom(p) {
        var P = 1.4 * c.s;
        sc.hitStop(0.05);
        fieldWave(p, 0xffc070, 0.6, c.col);
        // fluff blown over the whole field, drifting down slowly
        fieldRain(c, 26, 0.25, { y: function () { return rr(0.6, 2.6); }, vel: function () { return V(rr(-0.6, 0.6), rr(0.3, 1.1), 0); }, frames: ['fluff'], cols: [0xfff1dc, 0xffd9b0, c.col], size: function () { return [rr(0.14, 0.26) * c.s, 0.06]; }, life: 1.3, sway: true, grav: 0.9, drag: 1.5 });
        flare(p, 0xffffff, 1.3 * P, 0.16, { white: true });
        glow(p, 0xff9a40, [0.6, 2.2 * P], 0.35, { ease: 1, alpha: 0.75 });
        fire(p, N(10, c), { size: P * 0.9, speed: 3 });
        smoke(p, [0x9a8070, 0x5a4a44], N(8, c), { size: P, rise: 0.8, speed: 1.6 });
        for (var j = 0; j < N(14, c); j++) E({ sys: 'norm', pos: p.clone().add(rdir(0.2)), vel: rdir(3.4).add(V(0, 2.4, 0)), frame: 'fluff', color: pick([0xfff1dc, 0xffd9b0, c.col]),
          size: [rr(0.16, 0.28) * c.s, 0.08], life: rr(0.9, 1.4), grav: 1.6, drag: 2.6, spin: rr(-4, 4), upd: sway, fadeOut: 0.6 });
        sparks(p, [0xffd080, 0xffffff], N(12, c), 5.5, { size: 0.22 });
        shock(p, 0xffd9a0, 2.2 * P, 0.35); gRing(p, 0xffc070, 2.4 * P, 0.45); scorch(p, 1.6 * P); gGlow(p, 0xff9040, 2 * P, 0.4);
        sc.light(p, 0xff9a40, 1.6, 0.35); heavy(1.3);
        c.targets.slice(0, 2).forEach(function (m) { c.hit(m, 1, 1.4); });
      }
    };
    S.orbitRing = function (c) {
      sc.heroPose('spin', c.D(0.08), c.col);
      var center = sc.heroCenter(), n = 6, orbs = [], t = 0, launch = c.D(0.34), R = 1.25, hits = share(c.targets.slice(0, 3), n);
      circle(V(center.x, 0, center.z), c.col, 1.7 * c.s, c.D(0.7), { spin: 3 });
      for (var i = 0; i < n; i++) orbs.push({ a0: i * Math.PI / 3, pos: center.clone(),
        rib: vx.ribbon({ solid: true, mode: 'trail', w: 0.1 * c.s, color: c.deep, core: 0.8, maxPts: 14, shrink: 70 }),
        head: E({ pos: center, frame: 'flare', color: 0xffffff, size: 0.46 * c.s, life: 30, upd: STAY, fadeOut: 1, spin: 6, white: true }),
        halo: E({ sys: 'col', pos: center, frame: 'glow', color: c.deep, size: 0.5 * c.s, alpha: 0.75, life: 30, upd: STAY, fadeOut: 1 }) });
      tick(function (dt) {
        t += dt; var grow = Math.min(1, t / c.D(0.12)), w = 11 * c.sp;
        orbs.forEach(function (o) {
          var a = o.a0 + t * w, r = R * grow;
          o.pos.set(center.x + Math.cos(a) * r, center.y + 0.15 + Math.sin(a * 2) * 0.12, center.z + Math.sin(a) * r * 0.55);
          [o.head, o.halo].forEach(function (p) { if (p) { p.x = o.pos.x; p.y = o.pos.y; p.z = o.pos.z; } });
          if (o.rib) o.rib.head(o.pos);
        });
        if (t < launch) return false;
        // the spin lets go: sparkling rings roll out over the ground and glitter is flung everywhere
        fieldWave(V(center.x, 0, center.z), c.col, 0.65, 0xffffff);
        for (var g3 = 0; g3 < N(28, c); g3++) { var ga = rr(0, 6.283), gs = rr(3, 8); E({ pos: center.clone().add(V(Math.cos(ga) * R, 0.1, Math.sin(ga) * R * 0.55)), vel: V(Math.cos(ga) * gs, rr(0.5, 2.2), Math.sin(ga) * gs * 0.8), frame: pick(['star', 'flare', 'dot']), color: [0xffffff, c.col], size: [rr(0.1, 0.2) * c.s, 0], life: rr(0.5, 0.9), drag: 1.6, grav: 1.5, spin: rr(-8, 8) }); }
        orbs.forEach(function (o, i) {
          vx.kill(o.head); vx.kill(o.halo); if (o.rib) o.rib.detach();
          var h = hits[i], from = o.pos.clone();
          if (!h) { flare(from, c.col, 0.6, 0.2); return; }
          after(c.D(i * 0.035), function () {
            homing({ from: from, to: function () { return sc.mobPos(h.mob); }, time: c.D(0.2), arc: V(rr(0.2, 0.6), rr(0.3, 0.9), rr(-0.5, 0.5)),
              trail: { w: 0.12 * c.s, col: c.col, core: 0.8, pts: 12 }, heads: [{ sys: 'col', frame: 'glow', color: c.deep, size: 0.55 * c.s, alpha: 0.8 }, { frame: 'glow', color: c.col, size: 0.95 * c.s, alpha: 0.25 }, { frame: 'flare', color: 0xffffff, size: 0.42 * c.s, white: true, spin: 8 }],
              onHit: function (p) { impact(p, c.col, 0.55 * c.s); ring(p, c.col, 0.9 * c.s, 0.25); c.hit(h.mob, h.frac, 0.5); } });
          });
        });
        return true;
      });
    };
    S.fireball = function (c) {
      var list = c.targets.slice(0, 2); if (!list.length) return;
      sc.heroPose('thrust', c.D(0.18), 0xff8a3a);
      var tip = c.from;
      seal(tip.clone().add(V(0.3, 0.05, 0.1)), 0xff8a3a, 0.95 * c.s, c.D(0.32));
      for (var i = 0; i < N(14, c); i++) { var a = rr(0, 6.28), r = rr(0.4, 0.75); E({ pos: tip, frame: 'flame', color: [0xffe080, 0xff6a2b], size: [0.24, 0.08], life: c.D(rr(0.12, 0.18)), delay: rr(0, c.D(0.04)), upd: spiralTo(tip, a, r), fadeIn: 0.3 }); }
      glow(tip, 0xff8a3a, [0.2, 0.9 * c.s], c.D(0.2), { fadeIn: 0.7, hot: 1.3 });
      list.forEach(function (mob, j) {
        after(c.D(0.18 + j * 0.09), function () {
          var from = sc.heroPaw(), S_ = c.s * (1 + 0.08 * (c.tier - 2));
          flare(from, 0xffffff, 1.1 * c.s, 0.14, { white: true }); smoke(from, 0x5a4a44, N(3, c), { size: 0.5, rise: 0.4 });
          homing({ from: from, to: function () { return sc.mobPos(mob); }, time: c.D(0.3), arc: V(0, 0.4 - j * 0.35, 0.15),
            trail: { w: 0.26 * S_, col: 0xff7a2b, core: 0.9, pts: 16, shrink: 50 },
            heads: [{ frame: 'glow', color: 0xff6a2b, size: 1.5 * S_, alpha: 0.45 }, { sys: 'col', frame: 'flame', color: 0xff6a1a, size: 0.85 * S_, spin: 6 }, { sys: 'col', frame: 'flame', color: 0xffc040, size: 0.6 * S_, spin: -9 }, { frame: 'flare', color: 0xffffff, size: 0.45 * S_, spin: -5, white: true }],
            emit: function (p, v, dt) {
              var back = v.clone().multiplyScalar(-0.12);
              if (Math.random() < dt * 90 * c.n) fire(p, 1, { size: 0.55 * S_, speed: 0.6, up: 0.4, life: 0.7, v: back });
              if (Math.random() < dt * 25 * c.n) E({ sys: 'norm', pos: p.clone(), vel: back.clone().add(V(0, 0.5, 0)), frame: 'smoke', color: 0x4a3c38, size: [0.2 * S_, 0.7 * S_], ease: 1, life: 0.6, alpha: 0.35, drag: 2, fadeIn: 0.2 });
              if (Math.random() < dt * 30 * c.n) E({ pos: p.clone(), vel: rdir(1.5).add(back), frame: 'dot', color: [0xffe080, 0xff5a1a], size: [0.07, 0], life: 0.4, grav: 2, stretch: 0.1 });
            },
            onHit: function (p) { explosion(c, p, S_, 0xff7a2b); c.hit(mob, 1, 1.6); } });
        });
      });
    };
    S.chain = function (c) {
      var list = c.targets.slice(0, 4); if (!list.length) return;
      sc.heroPose('raise', c.D(0.13), c.col);
      sc.dim(0.28, c.D(0.55));
      for (var i = 0; i < 3; i++) after(c.D(i * 0.04), function () { var t2 = sc.heroPaw(); vx.lightning(t2, t2.clone().add(rdir(0.5)), { w: 0.05, color: c.col, life: 0.12, branches: 0, segs: 6, amp: 0.25 }); });
      glow(c.from, c.col, [0.3, 1.0], c.D(0.16), { fadeIn: 0.6 });
      var prev = function () { return sc.heroPaw(); };
      list.forEach(function (mob, i) {
        var from = prev, to = function () { return sc.mobPos(mob); };
        after(c.D(0.13 + i * 0.075), function () {
          vx.lightning(from, to, { w: 0.34 * c.s, color: c.col, core: 0, alpha: 0.5, life: c.D(0.3), branches: 0, segs: 14, amp: 0.12 });
          vx.lightning(from, to, { solid: true, w: 0.11 * c.s, color: 0x3d8cff, core: 0.9, life: c.D(0.34), branches: c.tier >= 6 ? 3 : 2, segs: 14, amp: 0.12 });
          vx.lightning(from, to, { w: 0.05 * c.s, color: 0xffffff, life: c.D(0.26), branches: 0, segs: 14, amp: 0.12 });
          var p = to();
          flare(p, 0xffffff, 1.4 * c.s, 0.15, { white: true });
          glow(p, c.col, [0.5, 1.4 * c.s], 0.25, { ease: 1, alpha: 0.45 });
          sparks(p, [0xffffff, c.col], N(12, c), 7, { size: 0.16, stretch: 0.2, life: 0.8 });
          for (var k = 0; k < 3; k++) after(c.D(0.05 + k * 0.08), function () { var q = sc.mobPos(mob); vx.lightning(q.clone().add(rdir(0.45)), q.clone().add(rdir(0.45)), { w: 0.045, color: c.col, life: 0.1, branches: 0, segs: 5, amp: 0.3 }); });
          gGlow(p, c.col, 1.4, 0.3); sc.light(p, c.col, 1.6, 0.25);
          if (i === 0) {
            sc.flash('rgba(200,235,255,0.55)', 0.22); sc.hitStop(0.04);
            // a thunderbolt drops from the sky on the first target, then stray bolts strike all over the field
            var sky = p.clone().add(V(rr(-0.6, 0.6), 6.5, -1.2));
            vx.lightning(sky, to, { w: 0.5 * c.s, color: c.col, core: 0, alpha: 0.45, life: c.D(0.3), branches: 0, segs: 16, amp: 0.2 });
            vx.lightning(sky, to, { solid: true, w: 0.14 * c.s, color: 0x3d8cff, core: 0.9, life: c.D(0.32), branches: 3, segs: 16, amp: 0.2 });
            fieldWave(p, c.col, 0.55, 0xffffff);
            fieldPops(c, N(7, c), 0.05, 0.06, function (g) {
              var top = g.clone().add(V(rr(-0.8, 0.8), 6.5, -1.2)), hitP = g.clone().setY(0.1);
              vx.lightning(top, hitP, { w: 0.3 * c.s, color: c.col, core: 0, alpha: 0.4, life: c.D(0.22), branches: 0, segs: 14, amp: 0.22 });
              vx.lightning(top, hitP, { solid: true, w: 0.08 * c.s, color: 0x3d8cff, core: 0.9, life: c.D(0.25), branches: 1, segs: 14, amp: 0.22 });
              flare(hitP, 0xffffff, 0.9 * c.s, 0.12, { white: true }); gRing(g, c.col, 1.8 * c.s, 0.35); gGlow(g, c.col, 1.2, 0.3);
              sparks(hitP, [0xffffff, c.col], N(5, c), 5, { size: 0.14, stretch: 0.18, up: 1.5 }); sc.shake(0.03);
            });
          }
          sc.shake(0.08);
          c.hit(mob, 1, 1.0);
        });
        prev = to;
      });
    };
    S.blizzard = function (c) {
      sc.heroPose('raise', c.D(0.12), c.col);
      var C = c.center.clone(), dur = c.D(0.9);
      E({ sys: 'gadd', pos: V(C.x, 0.04, C.z), frame: 'frost', color: c.col, size: [0.4, 4.4 * c.s], ease: 1, life: dur * 1.3, spin: 0.25, fadeIn: 0.1, fadeOut: 0.6, alpha: 0.9 });
      // frost creeps over the whole ground, wind and snow cross the whole screen, ice spikes pop up everywhere
      E({ sys: 'gadd', pos: V(FC.x, 0.035, FC.z), frame: 'frost', color: 0xdff4ff, size: [1.5, 10.5], ease: 1, life: dur * 1.5, spin: -0.12, fadeIn: 0.15, fadeOut: 0.5, alpha: 0.5 });
      for (var wv = 0; wv < N(22, c); wv++) { var wp = fieldPt(rr(0.3, 2.8)); wp.x = rr(-5, -1); E({ pos: wp, vel: V(rr(7, 11), rr(-1.4, -0.4), 0), frame: 'streak', color: 0xe8f8ff, size: [0.3, 0.5], life: rr(0.4, 0.7), delay: rr(0, dur * 0.8), stretch: 0.14, alpha: 0.5, fadeIn: 0.2, fadeOut: 0.4 }); }
      fieldRain(c, 70, dur * 0.7, { vel: function () { return V(rr(0.8, 2.2), rr(-3, -1.6), 0); }, frames: ['snow', 'snow', 'dot'], cols: 0xffffff, size: function () { return rr(0.07, 0.16) * c.s; }, life: 1.2, sway: true, white: true });
      fieldPops(c, N(9, c), 0.3, 0.035, function (g) {
        for (var s = 0; s < 3; s++) { var h = rr(0.6, 1.2) * c.s; E({ sys: 'norm', pos: V(g.x + (s - 1) * 0.16, h * 0.42, g.z), frame: 'shard', color: pick([0xffffff, 0xd8f2ff, 0xbfe8ff]), size: [0.05, h * 0.5], ar: 2.0, rot: -(s - 1) * 0.4, ease: 2, life: c.D(0.6), fadeOut: 0.85, white: true }); }
        gRing(g, c.col, 1.3 * c.s, 0.35); sparks(g.clone().setY(0.3), [0xffffff, c.col], N(3, c), 3, { size: 0.13, up: 1.5 });
      });
      circle(V(sc.heroCenter().x, 0, sc.heroCenter().z), c.col, 1.4, c.D(0.5));
      for (var i = 0; i < N(14, c); i++) E({ pos: V(C.x + rr(-2, 1.5), rr(0.3, 2.5), C.z + rr(-1.2, 1.2)), vel: V(rr(4, 7), rr(-1.2, -0.6), 0), frame: 'streak', color: 0xe8f8ff, size: 0.35, life: rr(0.25, 0.45), delay: rr(0, dur * 0.6), stretch: 0.12, alpha: 0.6 });
      for (var j = 0; j < N(45, c); j++) E({ pos: V(C.x + rr(-2, 2), rr(2.2, 3.4), C.z + rr(-1.4, 1.4)), vel: V(rr(0.6, 1.6), rr(-2.8, -1.6), 0), frame: pick(['snow', 'snow', 'dot']), color: 0xffffff,
        size: rr(0.07, 0.15) * c.s, life: rr(0.9, 1.4), delay: rr(0, dur * 0.6), spin: rr(-3, 3), upd: sway, fadeIn: 0.15, white: true });
      smoke(V(C.x, 0.2, C.z), 0xdff4ff, N(8, c), { r: 1.2, size: 1.4, rise: 0.15, speed: 0.6, alpha: 0.32, life: 1.4 });
      sc.light(V(C.x, 1, C.z), c.col, 0.7, dur);
      after(c.D(0.36), function () {
        sc.flash('rgba(210,240,255,0.4)', 0.2);
        c.targets.forEach(function (mob, mi) {
          after(c.D(mi * 0.04), function () {
            var p = sc.mobPos(mob), g = mob.group.position, big = mob.boss ? 1.45 : 1;
            for (var s = 0; s < 5; s++) {
              var ang = (s - 2) * 0.36 + rr(-0.1, 0.1), h = rr(0.85, 1.35) * c.s * big;
              E({ sys: 'norm', pos: V(g.x + (s - 2) * 0.17 * big, h * 0.42, g.z + 0.3 + rr(-0.05, 0.1)), frame: 'shard', color: pick([0xffffff, 0xd8f2ff, 0xbfe8ff]), size: [0.05, h * 0.5], ar: 2.0, rot: -ang, ease: 2, life: c.D(0.6), fadeOut: 0.85, white: true });
            }
            flare(p, 0xffffff, 1.2, 0.15, { white: true }); shock(p, c.col, 1.8, 0.3);
            sc.shake(0.06); c.hit(mob, 1, 0.9);
            after(c.D(0.48), function () {
              var q = sc.mobPos(mob);
              for (var k = 0; k < N(12, c); k++) E({ sys: 'norm', pos: q.clone().add(rdir(0.35)), vel: rdir(3.5).add(V(0, 2.2, 0)), frame: 'shard', color: pick([0xffffff, 0xd8f2ff]), size: [rr(0.1, 0.2), 0.05], ar: 2, life: rr(0.5, 0.8), grav: 7, spin: rr(-12, 12), white: true });
              sparks(q, [0xffffff, c.col], N(8, c), 4, { size: 0.15 });
              smoke(q, 0xe8f8ff, N(3, c), { size: 0.7, alpha: 0.4, rise: 0.3 });
            });
          });
        });
      });
    };
    S.meteors = function (c) {
      sc.heroPose('raise', c.D(0.12), c.col);
      sc.dim(0.35, c.D(0.9));
      var tg = c.targets, n = Math.max(tg.length, Math.round(5 + c.s * 3)), hits = share(tg, Math.min(n, tg.length * 2));
      // extra stars that hit nobody: they rain on the whole field so the sky looks full
      n = Math.max(n, hits.length) + N(8, c);
      fieldRain(c, 30, c.D(0.7), { y: function () { return rr(3.5, 5.5); }, vel: function () { return V(rr(-3.2, -1.8), rr(-9, -6), 0.4); }, frames: ['streak', 'flare'], cols: [0xffffff, c.col], size: function () { return [rr(0.12, 0.22), 0.04]; }, life: 0.6, stretch: 0.1 });
      for (var i = 0; i < N(10, c); i++) E({ pos: V(c.center.x + rr(-2.5, 2.5), rr(2.8, 3.8), c.center.z + rr(-2, -0.5)), frame: 'flare', color: [0xffffff, c.col], size: [0, 0.28], ease: 2, life: rr(0.4, 0.8), delay: rr(0, c.D(0.3)), spin: 2, white: true });
      for (var m = 0; m < n; m++) (function (m) {
        var h = hits[m], big = c.tier >= 7 && m === n - 1;
        after(c.D(0.14 + m * 0.065), function () {
          var land = h ? sc.mobPos(h.mob) : fieldPt(0.1);
          var from = land.clone().add(V(rr(1.4, 2.0), rr(4.2, 4.8), -0.6));
          homing({ from: from, to: function () { return h ? sc.mobPos(h.mob) : land; }, time: c.D(0.27), ease: function (k) { return k * k * 0.5 + k * 0.5; },
            trail: { w: 0.26 * c.s * (big ? 1.5 : 1), col: c.col, core: 1.2, pts: 18, shrink: 45 },
            heads: [{ sys: 'col', frame: 'glow', color: c.col, size: 0.7 * c.s * (big ? 1.4 : 1), alpha: 0.85 }, { frame: 'glow', color: c.col, size: 1.2 * c.s * (big ? 1.4 : 1), alpha: 0.4 }, { frame: 'flare', color: 0xffffff, size: 0.55 * c.s, white: true, spin: 6 }],
            emit: function (p, v, dt) {
              if (Math.random() < dt * 60 * c.n) E({ pos: p.clone(), vel: rdir(0.8).add(V(0, -0.3, 0)), frame: pick(['flare', 'dot']), color: [0xffffff, c.col, 0xff9a40], size: [0.16, 0], life: rr(0.3, 0.6), spin: 4 });
              if (Math.random() < dt * 40 * c.n) fire(p, 1, { size: 0.4 * c.s, speed: 0.4, up: 0.3, life: 0.5, cols: [0xffffff, 0xffe14a, 0xff8a2b] });
            },
            onHit: function (p) {
              var gp = V(p.x, 0.03, p.z), P = big ? 1.6 : 1;
              flare(p, 0xffffff, 1.6 * c.s * P, 0.15, { white: true }); glow(p, c.col, [0.5, 1.8 * c.s * P], 0.3, { ease: 1, hot: 1.3 });
              gRing(gp, c.col, 2.4 * c.s * P, 0.45); scorch(gp, 1.0 * c.s * P, 2); if (big) fieldWave(gp, c.col, 0.7, 0xffffff); gGlow(gp, 0xffb040, 1.3 * P, 0.4);
              sparks(p, [0xffffff, c.col, 0xffa040], N(10, c), 5.5, { size: 0.2, up: 1.5 });
              for (var k = 0; k < N(6, c); k++) E({ sys: 'norm', pos: gp.clone().add(V(0, 0.1, 0)), vel: rdir(2.5).add(V(0, 3, 0)), frame: 'dot', color: 0x3a2a2a, size: rr(0.06, 0.11), life: rr(0.5, 0.8), grav: 9, drag: 0.5 });
              smoke(gp, 0x8a7a8a, N(3, c), { size: 0.8, alpha: 0.4, rise: 0.4 });
              sc.light(p, c.col, 1.3, 0.3); sc.shake(big ? 0.25 : 0.07); if (big) sc.hitStop(0.05);
              if (h) c.hit(h.mob, h.frac, 0.9);
            } });
        });
      })(m);
    };
    S.beam = function (c) {
      sc.heroPose('thrust', c.D(0.22), c.col);
      sc.dim(0.4, c.D(0.85));
      var moon = sc.heroCenter().add(V(0.2, 1.25, -0.1));
      E({ pos: moon, frame: 'crescent', color: 0xf4f0ff, size: [0.2, 0.95 * c.s], ease: 2, life: c.D(0.85), rot: 0.5, spin: 0.6, fadeOut: 0.8, white: true });
      E({ pos: moon, frame: 'glow', color: c.col, size: [0.4, 2.1 * c.s], ease: 2, life: c.D(0.85), fadeOut: 0.8, alpha: 0.6 });
      converge(moon, [0xffffff, c.col], N(16, c), 1.2, c.D(0.22));
      after(c.D(0.22), function () {
        var start = sc.heroPaw(), aim = c.targets[0] ? sc.mobPos(c.targets[0]) : c.center.clone().setY(0.6), dir = aim.clone().sub(start); dir.y = 0; dir.normalize();
        var len = 10, y = start.y, end = start.clone().add(dir.clone().multiplyScalar(len)).setY(y - 0.2), life = c.D(0.55), pts = [];
        for (var i = 0; i <= 20; i++) pts.push(new T.Vector3().lerpVectors(start, end, i / 20));
        var pulse = function (u, rb) { var k = rb.t / rb.life, open = k < 0.12 ? k / 0.12 : k > 0.72 ? Math.max(0, 1 - (k - 0.72) / 0.28) : 1; return open * (1 + Math.sin(rb.t * 70 + u * 20) * 0.12) * (u < 0.04 ? 0.6 : 1); };
        vx.ribbon({ mode: 'static', taper: 'bolt', pts: pts, w: 1.5 * c.s, color: c.col, core: 0, alpha: 0.16, life: life, widthFn: pulse });
        vx.ribbon({ mode: 'static', taper: 'bolt', pts: pts, w: 0.7 * c.s, color: c.col, core: 0, alpha: 0.45, life: life, widthFn: pulse });
        vx.ribbon({ solid: true, mode: 'static', taper: 'bolt', pts: pts, w: 0.32 * c.s, color: 0x8a6cff, core: 0.9, alpha: 0.95, life: life, widthFn: pulse });
        vx.ribbon({ mode: 'static', taper: 'bolt', pts: pts, w: 0.13 * c.s, color: 0xffffff, core: 1.5, life: life, widthFn: pulse });
        // moonlight spills off the beam: crescents peel away to both sides and moon dust hangs over the field
        for (var cr = 0; cr < N(12, c); cr++) { var cp = start.clone().add(dir.clone().multiplyScalar(rr(0.5, len * 0.8))), sd = cr % 2 ? 1 : -1; E({ pos: cp, vel: V(-dir.z * sd * rr(2, 4), rr(0.5, 2), dir.x * sd * rr(2, 4)), frame: 'crescent', color: [0xffffff, c.col], size: [0.2, rr(0.5, 0.9) * c.s], life: rr(0.4, 0.7), delay: rr(0, life * 0.6), spin: rr(-6, 6), drag: 2, fadeOut: 0.5 }); }
        fieldRain(c, 34, life * 0.7, { y: function () { return rr(0.2, 3); }, vel: function () { return V(rr(-0.3, 0.3), rr(0.2, 0.9), 0); }, frames: ['flare', 'dot', 'star'], cols: [0xffffff, c.col], size: function () { return [rr(0.08, 0.16), 0]; }, life: 0.9, white: true });
        fieldWave(V(start.x, 0, start.z), c.col, 0.6, 0xffffff);
        flare(start, 0xffffff, 1.5 * c.s, 0.25, { white: true }); glow(start, c.col, 1.2 * c.s, life, { alpha: 0.6 }); seal(start.clone().add(V(0.1, 0, 0.05)), c.col, 0.8 * c.s, life);
        for (var r = 0; r < N(7, c); r++) E({ pos: start.clone(), vel: dir.clone().multiplyScalar(9), frame: 'ring', color: c.col, size: [0.22 * c.s, 0.3 * c.s], ar: 2.6, life: c.D(0.6), delay: r * c.D(0.06), rot: 0, fadeOut: 0.5, alpha: 0.75 });
        for (var s = 0; s < N(30, c); s++) E({ pos: start.clone().add(dir.clone().multiplyScalar(rr(0, len))).add(V(0, rr(-0.14, 0.14), 0)), vel: dir.clone().multiplyScalar(rr(5, 9)), frame: 'streak', color: [0xffffff, c.col], size: [0.28, 0.1], life: rr(0.15, 0.3), delay: rr(0, life * 0.8), stretch: 0.08 });
        for (var d = 0; d < 12; d++) E({ sys: 'gadd', pos: start.clone().add(dir.clone().multiplyScalar(0.6 + d * 0.8)).setY(0.035), frame: 'glow', color: c.col, size: [0.8, 1.6], ar: 0.5, life: life * 1.4, rot: 0, alpha: 0.5, fadeIn: 0.15 });
        sc.flash('rgba(230,225,255,0.55)', 0.28); sc.punch(0.05);
        var t2 = 0;
        tick(function (dt) {
          t2 += dt; if (t2 >= life * 0.8) return true;
          sc.shake(dt * 0.5);
          c.targets.forEach(function (m) { if (Math.random() < dt * 22) sparks(sc.mobPos(m), [0xffffff, c.col], 2, 4.5, { size: 0.16, dir: dir.clone().setY(0.3), spread: 0.8 }); });
          return false;
        });
        after(c.D(0.08), function () {
          c.targets.forEach(function (m) { var q = sc.mobPos(m); flare(q, 0xffffff, 1.3, 0.15, { white: true }); sc.light(q, c.col, 1.5, 0.4); c.hit(m, 1, 1.3); });
          sc.hitStop(0.05);
        });
      });
    };
    S.flash = function (c) {
      sc.heroPose('raise', c.D(0.16), c.col);
      var sun = c.center.clone().add(V(0, 3.1, -0.6)), dur = c.D(0.42);
      E({ pos: sun, frame: 'glow', color: [0xffd84a, 0xffa040], size: [0.3, 3.2 * c.s], ease: 1, life: dur + 0.1, hot: 1.5, fadeOut: 0.9 });
      E({ pos: sun, frame: 'flare', color: 0xffffff, size: [0.2, 2.4 * c.s], ease: 1, life: dur + 0.1, spin: 1.5, white: true, fadeOut: 0.9 });
      E({ pos: sun, frame: 'flare', color: 0xffe14a, size: [0.2, 3.4 * c.s], ease: 1, life: dur + 0.1, spin: -1, rot: 0.4, fadeOut: 0.9 });
      E({ pos: sun, frame: 'circle', color: 0xffe14a, size: [0.4, 2.4 * c.s], ease: 2, life: dur + 0.1, spin: 2, fadeOut: 0.85 });
      converge(sun, [0xffffff, 0xffd84a, 0xff9a40], N(26, c), 2.2, dur);
      sc.flash('rgba(255,230,150,0.25)', 0.2);
      sc.light(c.center.clone().setY(2), 0xffd84a, 0.6, dur);
      after(dur, function () {
        var C = c.center.clone().setY(0.9), G = c.center.clone().setY(0.03), shaft = [];
        for (var i = 0; i <= 10; i++) shaft.push(new T.Vector3().lerpVectors(sun, C, i / 10));
        vx.ribbon({ mode: 'static', taper: 'bolt', pts: shaft, w: 0.9 * c.s, color: 0xffd84a, core: 1.4, life: c.D(0.35) });
        sc.flash('rgba(255,248,215,1)', 0.8); sc.hitStop(0.08); sc.slowmo(0.25, 0.4); sc.punch(0.1); sc.shake(0.4);
        glow(C, 0xffb030, [1, 4.0 * c.s], 0.45, { ease: 1, alpha: 0.45, fadeOut: 0.2 });
        glow(C, 0xff8a20, [1, 3.6 * c.s], 0.5, { ease: 1, alpha: 0.55, sys: 'col', fadeOut: 0.2 });
        flare(C, 0xffffff, 3.2 * c.s, 0.22, { white: true });
        for (var r = 0; r < N(14, c); r++) E({ pos: C, frame: 'streak', color: [0xffffff, 0xffd84a], size: [0.6, 7 * c.s], ease: 1, life: rr(0.35, 0.55), rot: r / 14 * 3.1416 + rr(-0.1, 0.1), alpha: 0.55, fadeOut: 0.3 });
        shock(C, 0xfff2a0, 8 * c.s, 0.55); shock(C, 0xff9a40, 6 * c.s, 0.65, { delay: 0.05 }); fieldWave(G, 0xffd84a, 0.75, 0xff9a40);
        gRing(G, 0xffd84a, 9 * c.s, 0.6); gGlow(G, 0xffb040, 5, 0.8);
        fieldPops(c, N(10, c), 0.02, 0.03, function (g) { var q = g.clone().setY(0.4); fire(q, N(4, c), { size: 0.9 * c.s, speed: 1.6, up: 2.2 }); gRing(g, 0xffb040, 1.6 * c.s, 0.4); scorch(g, 0.9, 1.8); embers(q, [0xffe080, 0xff6a2b], N(4, c), { speed: 2, up: 2.5 }); });
        for (var e = 0; e < N(60, c); e++) E({ pos: C.clone().add(rdir(1.2, 0.4)), vel: rdir(8).add(V(0, 2.5, 0)), frame: 'dot', color: [0xffffff, 0xffe14a, 0xff8a2b], size: [rr(0.06, 0.12), 0], life: rr(0.6, 1.1), grav: 3, drag: 1.2, stretch: 0.1 });
        c.targets.forEach(function (m) { var q = sc.mobPos(m); fire(q, N(5, c), { size: 0.9, speed: 2 }); scorch(V(q.x, 0, q.z), 1.2); c.hit(m, 1, 2); });
        sc.light(C, 0xffe080, 2.5, 0.6);
      });
    };
    S.vortex = function (c) {
      sc.heroPose('raise', c.D(0.14), c.col);
      sc.dim(0.55, c.D(1.0));
      var C = c.center.clone().setY(1.05), dur = c.D(0.78);
      E({ pos: C, frame: 'shock', color: c.col, size: [0.5, 3.6 * c.s], ease: 1, life: dur, spin: 2, fadeOut: 0.85, alpha: 0.9 });
      E({ pos: C, frame: 'ring', color: 0xffd8ff, size: [0.4, 1.35 * c.s], ease: 1, life: dur, fadeOut: 0.85, alpha: 0.8, white: true });
      var core = E({ sys: 'addB', pos: C, frame: 'dot', color: 0x07020e, size: [0.1, 1.2 * c.s], ease: 1, life: dur + 0.5, alpha: 1, fadeOut: 0.95 });
      E({ sys: 'gadd', pos: V(C.x, 0.04, C.z), frame: 'circle', color: c.col, size: [0.5, 6 * c.s], ease: 2, life: dur, spin: -2.5, fadeOut: 0.8, alpha: 0.7 });
      for (var i = 0; i < N(110, c); i++) { var life = dur * rr(0.4, 0.75); E({ pos: C, frame: pick(['streak', 'dot', 'flare']), color: pick([0xffffff, c.col, 0xff6ad8, 0x6a5aff]), size: [rr(0.12, 0.22), 0.03], life: life, delay: rr(0, dur - life), upd: spiralIn(C, rr(0, 6.283), rr(1.2, 4.6), 7), stretch: 0.05, fadeIn: 0.25 }); }
      c.targets.forEach(function (m) { m.pull = C.x + rr(-0.3, 0.3); m.pullZ = C.z + rr(-0.25, 0.25); });
      for (var k = 0; k < 4; k++) after(c.D(0.12 + k * 0.15), function () { vx.lightning(C.clone().add(rdir(0.4)), C.clone().add(rdir(1.3)), { w: 0.06, color: 0xd8a0ff, life: 0.14, branches: 1, segs: 8, amp: 0.25 }); });
      after(dur, function () {
        vx.kill(core);
        E({ pos: C, frame: 'glow', color: 0xffffff, size: [1.6 * c.s, 0], life: c.D(0.08), ease: 1, white: true });
        after(c.D(0.08), function () {
          sc.flash('rgba(220,170,255,0.8)', 0.6); sc.hitStop(0.07); sc.shake(0.4); sc.punch(0.09);
          flare(C, 0xffffff, 4 * c.s, 0.3, { white: true });
          shock(C, c.col, 7.5 * c.s, 0.55); shock(C, 0xffffff, 5 * c.s, 0.4); fieldWave(V(C.x, 0, C.z), c.col, 0.8, 0xff6ad8);
          sparks(C, [0xffffff, c.col, 0xff6ad8], N(46, c), 12, { size: 0.3, stretch: 0.14, life: 1.4 });
          gRing(V(C.x, 0, C.z), c.col, 5 * c.s, 0.6);
          embers(C, [0xffffff, c.col, 0xff6ad8], N(20, c), { speed: 4, up: 0.5, grav: 1 });
          sc.light(C, c.col, 2.2, 0.5);
          c.targets.forEach(function (m) { m.pull = undefined; m.pullZ = undefined; c.hit(m, 1, 2); });
        });
      });
    };
    S.nova = function (c) {
      sc.heroPose('raise', c.D(0.2), 0xffffff);
      sc.dim(0.5, c.D(1.1));
      var H = sc.heroCenter(), top = c.center.clone().add(V(0, 2.9, -0.3)), cols = [0xff6a2b, 0x9fd8ff, 0xbfefff, 0xffe14a, 0xd8d8ff], dur = c.D(0.48);
      circle(V(H.x, 0, H.z), 0xffffff, 2.2, c.D(1.0), { spin: 2 });
      E({ sys: 'gadd', pos: V(top.x, 0.04, c.center.z), frame: 'circle', color: 0xffe9ff, size: [0.5, 8 * c.s], ease: 2, life: c.D(1.1), spin: -1.2, fadeOut: 0.8, alpha: 0.8 });
      cols.forEach(function (col, i) {
        var rib = vx.ribbon({ mode: 'trail', w: 0.12, color: col, core: 1, maxPts: 20, shrink: 60 });
        var head = E({ pos: H, frame: 'flare', color: 0xffffff, size: 0.45, life: 30, upd: STAY, fadeOut: 1, white: true, spin: 6 });
        var halo = E({ pos: H, frame: 'glow', color: col, size: 0.95, life: 30, upd: STAY, fadeOut: 1, hot: 1.3 });
        var t = 0, a0 = i / 5 * 6.283, P = V();
        tick(function (dt) {
          t += dt; var k = Math.min(1, t / dur), e = k * k * (3 - 2 * k), r = 0.9 * (1 - e) + 0.05, a = a0 + t * 9;
          P.set(H.x + (top.x - H.x) * e + Math.cos(a) * r, H.y + (top.y - H.y) * e + Math.sin(a * 0.7) * 0.25 * (1 - e), H.z + (top.z - H.z) * e + Math.sin(a) * r * 0.6);
          [head, halo].forEach(function (p) { if (p) { p.x = P.x; p.y = P.y; p.z = P.z; } });
          if (rib) rib.head(P);
          if (k >= 1) { vx.kill(head); vx.kill(halo); if (rib) rib.detach(); return true; }
        });
      });
      after(dur, function () {
        E({ pos: top, frame: 'star', color: 0xffffff, size: [0.2, 1.6 * c.s], ease: 2, life: c.D(0.24), spin: 5, white: true });
        E({ pos: top, frame: 'glow', color: [0xffd0ff, 0xbfe8ff, 0xfff2a0], size: [0.5, 3 * c.s], life: c.D(0.24), hot: 1.3 });
        cols.forEach(function (col, i) { ring(top, col, (0.8 + i * 0.25) * c.s, c.D(0.24), { delay: i * 0.02 }); });
        sc.flash('rgba(255,255,255,0.4)', 0.2);
      });
      after(dur + c.D(0.2), function () {
        var C = c.center.clone().setY(0.9), G = c.center.clone().setY(0.03), shaft = [];
        for (var i = 0; i <= 10; i++) shaft.push(new T.Vector3().lerpVectors(top, C, i / 10));
        vx.ribbon({ mode: 'static', taper: 'bolt', pts: shaft, w: 0.55 * c.s, color: 0xd8b8ff, core: 1, life: c.D(0.26) });
        sc.flash('rgba(255,255,255,1)', 0.8); sc.hitStop(0.1); sc.slowmo(0.35, 0.35); sc.shake(0.5); sc.punch(0.14);
        flare(C, 0xffffff, 2.6 * c.s, 0.22, { white: true });
        cols.concat([0xff6ad8]).forEach(function (col, j) { shock(C, col, (2.6 + j * 1.15) * c.s, 0.5 + j * 0.07, { delay: j * 0.035 }); });
        fieldWave(G, 0xffffff, 0.85, 0xd8b8ff);
        fieldPops(c, N(10, c), 0.02, 0.04, function (g, gi) { var col = cols[gi % cols.length], q = g.clone().setY(0.5); vx.ribbon({ mode: 'static', taper: 'bolt', pts: [g.clone().setY(5.5), g.clone().setY(2.5), g.clone().setY(0.05)], w: 0.4 * c.s, color: col, core: 1.2, life: c.D(0.3) }); impact(q, col, 1.1 * c.s); gRing(g, col, 2.2 * c.s, 0.4); });
        gRing(G, 0xffffff, 7 * c.s, 0.7); gGlow(G, 0xffe9ff, 5, 0.9);
        sparks(C, cols.concat([0xffffff]), N(70, c), 13, { size: 0.32, stretch: 0.14, up: 1, life: 1.4 });
        fire(C, N(10, c), { size: 1.2, speed: 4 });
        for (var k = 0; k < N(10, c); k++) E({ sys: 'norm', pos: C.clone().add(rdir(0.3)), vel: rdir(5).add(V(0, 2, 0)), frame: 'shard', color: 0xffffff, size: [rr(0.12, 0.2), 0.05], ar: 2, life: rr(0.5, 0.8), grav: 6, spin: rr(-12, 12), white: true });
        c.targets.forEach(function (m) {
          vx.lightning(C, function () { return sc.mobPos(m); }, { w: 0.12, color: 0x9fd8ff, life: 0.3, branches: 1 });
          impact(sc.mobPos(m), pick(cols), 1.3); c.hit(m, 1, 2.4);
        });
        sc.light(C, 0xffffff, 3, 0.7);
      });
    };

    function tint(base, tier) { var col = new T.Color(base); if (tier >= 5) col.lerp(new T.Color(0xffffff), 0.12); return col.getHex(); }
    function cast(skill, tier, targets, hit, speedMul, lv) {
      var sp = speedMul || 1; lv = lv || 0;
      var c = { sk: skill, tier: tier, lv: lv, col: tint(skill.color, tier), s: 1.12 * (1 + 0.08 * (tier - 1)) * (1 + 0.018 * lv), n: Math.min(2.4, 1 + 0.1 * (tier - 1) + 0.025 * lv), sp: sp,
        D: function (t) { return t / sp; }, deep: deep(tint(skill.color, tier)), from: sc.heroPaw(), targets: targets.slice(), hit: hit || function () { } };
      c.center = crowdCenter(c.targets);
      var hitFn = c.hit, decorated = [], released = false;
      c.hit = function (mob, frac, power) {
        // Decorate at the existing contact time; retain every damage fraction and argument.
        if (decorated.indexOf(mob) < 0 && decorated.length < 3) {
          spellContact(c, mob, power, !released); decorated.push(mob); released = true;
        }
        hitFn(mob, frac, power);
      };
      spellCharge(c);
      var H = sc.heroCenter();
      // casting circle: two rune rings under the feet, sparks rising, a coloured seal at the paw
      E({ sys: 'gadd', pos: V(H.x, 0.045, H.z), frame: 'circle', color: c.col, size: [0.3, 1.2 + 0.03 * lv], ease: 2, life: c.D(0.55), spin: 3, fadeIn: 0.1, fadeOut: 0.5, alpha: 0.95 });
      E({ sys: 'gadd', pos: V(H.x, 0.05, H.z), frame: 'ring', color: 0xffffff, size: [0.3, 1.1], ease: 1, life: c.D(0.35), alpha: 0.6 });
      for (var q = 0; q < N(8, c); q++) { var qa = rr(0, 6.28); E({ pos: V(H.x + Math.cos(qa) * 0.6, 0.1, H.z + Math.sin(qa) * 0.45), vel: V(0, rr(1.6, 2.8), 0), frame: pick(['star', 'dot']), color: [0xffffff, c.col], size: [0.1, 0], life: rr(0.35, 0.6), drag: 0.6, spin: 6 }); }
      seal(c.from.clone().add(V(0, 0, 0.1)), c.col, 0.55 * c.s, c.D(0.3));
      if (lv >= 10) E({ pos: H.clone().add(V(0, 0.2, 0.05)), frame: 'glow', color: c.col, size: [1.6, 0.4], life: c.D(0.4), alpha: 0.35 });
      if (tier >= 4) after(c.D(0.12), function () { sc.ghost(c.col); });
      (S[skill.shape] || S.bolt3)(c);
    }

    // ---------- reactions outside skills ----------
    sc.hooks.land = function (pos, boss) { dust(pos, Math.max(1, Math.round((boss ? 6 : 2) * vx.quality())), boss ? 1.6 : 0.8); if (boss) gRing(pos, 0xffffff, 1.4, 0.35); };
    sc.hooks.step = function (pos, boss) { if (boss) { dust(pos, N(3), 1.1); gRing(pos, 0xffffff, 0.9, 0.25); } else if (Math.random() < 0.45) dust(pos, 1, 0.45); };
    // a monster claws at the wizard: slash marks fly at it and its magic barrier ripples
    sc.hooks.swipe = function (mob) {
      var p = sc.mobPos(mob), H = sc.heroCenter(), mid = p.clone().lerp(H, 0.6), B = mob.boss ? 1.9 : 1;
      for (var i = 0; i < 3; i++) E({ pos: mid.clone().add(V(0, (i - 1) * 0.15 * B, 0.25)), frame: 'crescent', color: [0xffffff, mob.boss ? 0xff4f6a : 0xffb0d0], size: [0.35 * B, 0.75 * B], rot: 2.5 + (i - 1) * 0.12, life: 0.2, ease: 1, delay: i * 0.03, fadeOut: 0.5 });
      E({ sys: 'col', pos: H.clone().add(V(0.28, 0, 0.22)), frame: 'shock', color: 0x6fd8ff, size: [0.5, 1.5 * Math.sqrt(B)], ease: 1, life: 0.32, alpha: 0.75 });
      E({ pos: H.clone().add(V(0.32, 0, 0.24)), frame: 'ring', color: 0xffffff, size: [0.35, 1.2 * Math.sqrt(B)], ease: 1, life: 0.22, alpha: 0.55, white: true });
      sparks(H.clone().add(V(0.45, 0, 0.25)), [0x9fe8ff, 0xffffff], N(6), 3, { dir: V(-1, 0.3, 0), size: 0.15 });
      sc.light(H, 0x9fe8ff, 0.6, 0.2);
    };
    sc.hooks.roar = function (mob) {
      var p = sc.mobPos(mob), col = mob.regionBoss ? 0xff3b5c : 0xffd84a, G = V(p.x, 0.04, p.z);
      for (var r = 0; r < 3; r++) E({ sys: 'col', pos: p.clone().add(V(0, 0.3, 0.25)), frame: 'shock', color: col, size: [0.5, 3.2 + r * 0.9], ease: 1, life: 0.55, delay: r * 0.13, alpha: 0.45 });
      gRing(G, col, 3.4, 0.6); dust(G, N(6), 1.4); sc.punch(0.05); sc.light(p, col, 1.2, 0.5);
    };
    sc.hooks.slam = function (mob) {
      var G = V(mob.x, 0.04, mob.z), rock = new T.Color(dustCol).multiplyScalar(0.55).getHex();
      gRing(G, 0xffffff, 4.2, 0.5); gRing(G, mob.regionBoss ? 0xff3b5c : 0xffb347, 3.2, 0.7); dust(G, N(10), 2);
      for (var i = 0; i < N(14); i++) E({ sys: 'norm', pos: G.clone().add(V(rr(-0.8, 0.8), 0.1, rr(-0.4, 0.4))), vel: V(rr(-2.5, 2.5), rr(3, 6), rr(-1, 1)), frame: 'shard', color: rock, size: rr(0.12, 0.22), life: rr(0.6, 1), grav: 14, spin: rr(-8, 8), white: true });
      sc.punch(0.08); sc.hitStop(0.05);
    };
    sc.hooks.die = function (mob, pos, big) {
      var col = mob.lastCol || 0xffd84a, d = mob.group.userData, life = big ? 1.15 : 0.55;
      flare(pos, 0xffffff, big ? 2.2 : 1.1, 0.2, { white: true });
      shock(pos, col, big ? 3 : 1.4, 0.35);
      for (var i = 0; i < Math.round((big ? 40 : 16) * vx.quality()); i++) {
        var k = rr(0, 1);
        E({ pos: V(pos.x + rr(-0.35, 0.35) * d.w, d.h * k * 0.95, pos.z), vel: V(rr(-0.3, 0.3), rr(0.8, 1.8), rr(-0.2, 0.2)), frame: pick(['dot', 'flare']), color: [0xffffff, col], size: [rr(0.07, 0.13), 0], life: rr(0.5, 0.9), delay: k * life * 0.85, drag: 0.6, spin: 3 });
      }
      for (var j = 0; j < Math.round(5 * vx.quality()); j++) E({ pos: pos.clone().add(rdir(0.2)), vel: V(rr(-0.4, 0.4), rr(1.2, 2), 0), frame: 'glow', color: col, size: [0.35, 0.05], life: rr(0.7, 1.1), drag: 0.4, upd: sway });
      smoke(V(pos.x, 0.2, pos.z), dustCol, Math.max(1, Math.round(3 * vx.quality())), { size: big ? 1.6 : 0.8, rise: 0.3, alpha: 0.4 });
      sc.light(pos, col, big ? 2 : 1, 0.4);
      if (big) {
        for (var b = 0; b < 4; b++) (function (b) { after(0.15 + b * 0.2, function () { var q = pos.clone().add(V(rr(-0.5, 0.5), rr(-0.4, 0.6), 0.1)); explosion({ n: 1 }, q, 0.9, col); }); })(b);
        after(life, function () { sc.flash('rgba(255,250,235,0.9)', 0.8); sc.shake(0.4); shock(pos, 0xffffff, 6, 0.6); gRing(V(pos.x, 0, pos.z), col, 6, 0.7); sparks(pos, [0xffffff, col], N(40), 9, { size: 0.3 }); });
      }
    };
    function levelUp(tier, col, small) {
      var H = sc.heroCenter(), G = V(H.x, 0, H.z);
      col = col || 0xffd84a;
      if (small) {
        circle(G, col, 1.6, 0.9, { spin: 2.4 });
        for (var s2 = 0; s2 < N(22); s2++) E({ pos: V(H.x + rr(-0.45, 0.45), rr(0, 0.3), H.z + rr(-0.25, 0.25)), vel: V(0, rr(2, 4), 0), frame: pick(['flare', 'star']), color: [0xffffff, col], size: [rr(0.1, 0.18), 0], life: rr(0.6, 1), delay: rr(0, 0.4), drag: 0.6, spin: 3 });
        ring(V(H.x, 0.9, H.z), col, 2, 0.45); sc.heroGlow(col, 1.2); sc.heroPose('raise', 0.12, col);
        return;
      }
      circle(G, col, 2.6, 1.6, { spin: 2 });
      vx.ribbon({ mode: 'static', taper: 'bolt', pts: [V(H.x, 0, H.z), V(H.x, 2, H.z), V(H.x, 4.5, H.z)], w: 0.7, color: col, core: 1.3, life: 1.2 });
      for (var i = 0; i < N(50); i++) E({ pos: V(H.x + rr(-0.5, 0.5), rr(0, 0.4), H.z + rr(-0.3, 0.3)), vel: V(0, rr(2, 5), 0), frame: pick(['flare', 'dot', 'star']), color: [0xffffff, col], size: [rr(0.1, 0.22), 0], life: rr(0.8, 1.4), delay: rr(0, 0.8), drag: 0.6, spin: 3 });
      for (var r = 0; r < 4; r++) ring(V(H.x, 0.9, H.z), col, 2.5 + r * 0.6, 0.6, { delay: r * 0.12 });
      sc.flash('rgba(255,245,200,0.8)', 0.6); sc.light(H, col, 2.5, 1.2); sc.heroGlow(col, 1.5); sc.heroPose('raise', 0.2, col);
    }
    function bossEnter(mob, region) {
      var p = sc.mobPos(mob), G = V(mob.tx, 0.04, mob.z);
      sc.dim(0.45, 1.2); sc.shake(0.3); sc.punch(0.06);
      circle(G, region ? 0xff3b5c : 0xffd84a, 3, 1.4, { spin: -1.6 });
      smoke(V(mob.tx, 0.3, mob.z), [0x3a2440, 0x1a1020], N(10), { r: 0.8, size: 1.8, rise: 0.5, alpha: 0.5 });
      for (var i = 0; i < N(20); i++) E({ pos: V(mob.tx + rr(-1, 1), rr(0, 0.3), mob.z + rr(-0.4, 0.4)), vel: V(0, rr(1.5, 3.5), 0), frame: 'dot', color: [0xffffff, region ? 0xff3b5c : 0xffd84a], size: [0.1, 0], life: rr(0.6, 1.1), delay: rr(0, 0.6) });
      return p;
    }
    function coinPop(pos, n) {
      for (var i = 0; i < Math.min(8, n || 4); i++) E({ sys: 'norm', pos: pos, vel: rdir(1.6).add(V(0, 3.2, 0)), frame: 'dot', color: 0xffcf3a, size: 0.14, life: rr(0.45, 0.7), grav: 9, white: true });
    }

    // particles around the wizard while a costume is worn
    var cosFx = null, cosAcc = 0;
    function costumeParticle(f) {
      var H = sc.heroCenter(), c1 = f.col, c2 = f.col2 || f.col, x = H.x, z = H.z;
      if (f.parts === 'frost') E({ pos: V(x + rr(-0.8, 0.8), rr(0.3, 2.2), z + rr(-0.3, 0.3)), vel: V(rr(-0.2, 0.2), rr(-0.4, -0.1), 0), frame: pick(['snow', 'frost', 'star']), color: [0xffffff, c1], size: [rr(0.12, 0.22), 0.03], life: rr(1.2, 2), spin: rr(-2, 2), fadeIn: 0.2 });
      else if (f.parts === 'shadow' || f.parts === 'void' || f.parts === 'doom') {
        if (Math.random() < 0.45) E({ sys: 'norm', pos: V(x + rr(-0.6, 0.6), rr(0, 0.35), z - 0.25), vel: V(rr(-0.2, 0.2), rr(0.4, 1), 0), frame: 'smoke', color: f.parts === 'doom' ? [0x2a0606, 0x140404] : [0x1c0a2a, 0x0c0414], size: [rr(0.35, 0.5), rr(0.8, 1.1)], alpha: 0.42, life: rr(1, 1.5), fadeIn: 0.25, white: true });
        else if (f.parts === 'void') { var a = rr(0, 6.28), R = rr(0.9, 1.3); E({ pos: V(x + Math.cos(a) * R, rr(0.3, 1.8), z + Math.sin(a) * R * 0.5), vel: V(-Math.cos(a) * R * 1.4, rr(0.1, 0.5), -Math.sin(a) * R * 0.7), frame: pick(['glow', 'dot', 'star']), color: [c2, c1], size: [rr(0.12, 0.2), 0], life: rr(0.6, 0.9), spin: 3 }); }
        else E({ pos: V(x + rr(-0.6, 0.6), rr(0, 0.6), z + rr(-0.25, 0.25)), vel: V(rr(-0.2, 0.2), rr(1, 2.4), 0), frame: pick(['flame', 'dot', 'flare']), color: [c2, c1], size: [rr(0.1, 0.2), 0], life: rr(0.6, 1.1), drag: 0.3, flicker: 0.3 });
      }
      else if (f.parts === 'ember') E({ pos: V(x + rr(-0.6, 0.6), rr(0, 0.5), z + rr(-0.25, 0.25)), vel: V(rr(-0.15, 0.15), rr(1.2, 2.6), 0), frame: pick(['flame', 'dot', 'flare']), color: [c2, c1], size: [rr(0.12, 0.24), 0], life: rr(0.7, 1.3), drag: 0.3, flicker: 0.3 });
      else if (f.parts === 'spark') E({ pos: V(x + rr(-0.8, 0.8), rr(0.2, 2), z + rr(-0.3, 0.3)), vel: rdir(0.6), frame: pick(['star', 'flare']), color: [0xffffff, c1], size: [rr(0.1, 0.2), 0], life: rr(0.3, 0.6), spin: 4 });
      else if (f.parts === 'rune') E({ pos: V(x + rr(-0.9, 0.9), rr(0, 0.3), z + rr(-0.3, 0.3)), vel: V(0, rr(0.5, 1.1), 0), frame: pick(['circle', 'shard', 'crescent']), color: [c2, c1], size: [0.17, 0.05], life: rr(1.2, 1.8), spin: rr(-1, 1), fadeIn: 0.2 });
      else if (f.parts === 'leaf') E({ pos: V(x + rr(-0.9, 0.9), rr(0, 1.6), z + rr(-0.3, 0.3)), vel: V(rr(0.2, 0.6), rr(0.2, 0.7), 0), frame: pick(['crescent', 'fluff', 'flare']), color: [c2, c1], size: [rr(0.12, 0.2), 0.04], life: rr(1.2, 1.8), spin: rr(-3, 3), fadeIn: 0.2 });
      else E({ pos: V(x + rr(-0.9, 0.9), Math.random() < 0.5 ? rr(0, 0.3) : rr(2.2, 3), z + rr(-0.3, 0.3)), vel: V(0, Math.random() < 0.5 ? rr(0.6, 1.4) : rr(-1.2, -0.5), 0), frame: pick(['flare', 'star', 'dot']), color: [0xffffff, c1], size: [rr(0.12, 0.22), 0], life: rr(0.9, 1.5), spin: 2, fadeIn: 0.15 });
    }
    function costumeTick(dt) {
      if (!cosFx) return;
      cosAcc += dt * cosFx.rate * N(10) / 10;
      while (cosAcc >= 1) { cosAcc -= 1; costumeParticle(cosFx); }
    }
    function update(dt) {
      time += dt;
      costumeTick(dt);
      for (var i = timers.length - 1; i >= 0; i--) { var tm = timers[i]; if (tm && tm.at <= time) { timers.splice(i, 1); tm.fn(); } }
      for (var j = ticks.length - 1; j >= 0; j--) { if (ticks[j](dt)) ticks.splice(j, 1); }
      // idle sparkle on the staff and crackles on shocked monsters
      idleT += dt; crackleT += dt;
      if (idleT > 0.35) { idleT = 0; var tp = sc.heroTip(); E({ pos: tp.clone().add(rdir(0.08)), vel: V(rr(-0.2, 0.2), rr(0.3, 0.7), 0), frame: 'flare', color: [0xffffff, staffCol], size: [0.13, 0], life: 0.6, spin: 3, drag: 0.5, white: true }); }
      if (crackleT > 0.22) {
        crackleT = 0;
        sc.mobs().forEach(function (m) { if (m.shocked > 0 && Math.random() < 0.7) { var q = sc.mobPos(m); vx.lightning(q.clone().add(rdir(0.4)), q.clone().add(rdir(0.4)), { w: 0.035, color: 0x9fd8ff, life: 0.09, branches: 0, segs: 5, amp: 0.3 }); } });
      }
      vx.update(dt);
    }
    function setQuality(q) { vx.setQuality(q); }
    function setBright(v) { vx.setBright(v); }
    function setRegion(regionData) { dustCol = new T.Color(regionData.ground).lerp(new T.Color(0xffffff), 0.45).getHex(); }
    function clear() { timers.length = 0; ticks.length = 0; vx.clear(); sc.mobs().forEach(function (m) { m.pull = undefined; m.pullZ = undefined; }); }
    return { setStaffColor: function (c) { staffCol = c; }, setCostume: function (f) { cosFx = f; cosAcc = 0; }, cast: cast, update: update, setQuality: setQuality, setBright: setBright, setRegion: setRegion, clear: clear, count: vx.count,
      impact: impact, levelUp: levelUp, bossEnter: bossEnter, coinPop: coinPop, burst: function (pos, col) { impact(pos, col, 0.8); }, vfx: vx };
  }
  CW.createFx = createFx;
})(this);
