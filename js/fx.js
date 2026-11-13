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
    // real 3D parts (js/fx3d.js) for the spells whose body should have a shape: the laser, the meteors, the black hole
    var P3 = CW.createFx3d(sc);
    P3.warm(); warmPics();
    var staffCol = 0xffe14a;
    var timers = [], ticks = [], time = 0, dustCol = 0xd8c8a8, idleT = 0, crackleT = 0, tierNow = 1;
    function after(t, fn) { timers.push({ at: time + Math.max(0, t), fn: fn }); }
    function tick(fn) { ticks.push(fn); }
    function E(o) {
      // big: the few screen-filling parts of the biggest spells are allowed past the usual size limits
      if (o.size !== undefined && !o.big) {
        // Thin silhouettes can spread; opaque glows stay local so monsters remain readable.
        var ground = o.sys === 'gadd' || o.sys === 'gnorm';
        var outline = o.frame === 'ring' || o.frame === 'shock' || o.frame === 'circle' || o.frame === 'crescent' || o.frame === 'frost';
        var lim = ground && outline ? 11.5 : ground ? 6 : outline ? 8.5 : (o.frame === 'streak' ? 7 : 3.4);
        o.size = Array.isArray(o.size) ? [Math.min(o.size[0], lim), Math.min(o.size[1], lim)] : Math.min(o.size, lim);
      }
      var p = vx.emit(o); if (watcher && p) watcher(o, p); return p;
    }
    var watcher = null;   // checks only: called with every card made (fx.watch)
    function N(n, c) { return Math.max(1, Math.round(n * vx.quality() * (c ? c.n : 1))); }
    function clone(o, extra) { var r = {}; for (var k in o) r[k] = o[k]; for (var j in extra) r[j] = extra[j]; return r; }

    // ---------- building blocks ----------
    // size caps: with the wide view a spell flash must stay around the crowd, not cover the screen
    function capS(v, m) { return Array.isArray(v) ? [Math.min(v[0], m), Math.min(v[1], m)] : Math.min(v, m); }
    // the play field as the camera sees it: spells may now spread over all of it
    var FC = V(0, 0, -0.4);
    // skills drawn without any rune ring (the 'circle' picture): the user found the magic circles in element storm tacky
    var NO_CIRCLE = { elementStorm: 1 };
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
    // one flame left behind a flying 3D body of radius rb (moving with velocity v): past its back edge, not on it
    function trailFire(p, v, rb, o) {
      var sp = v.length(), at = p.clone(); if (sp > 0.5) at.addScaledVector(v, -rb * 1.4 / sp); else at.y += rb * 1.4;   // still: it rises off its top
      if (o.r === undefined) o.r = rb * 0.3; o.trail = true; fire(at, 1, o);   // (trail: lets the checks tell these from blasts)
    }
    function fire(pos, n, o) {
      o = o || {};
      for (var i = 0; i < n; i++) {
        var v = rdir(o.speed || 2.5).add(V(0, o.up === undefined ? 1.0 : o.up, 0)); if (o.v) v.add(o.v);
        // two kinds mixed: white-hot glowing flames and solid orange ones (a single flame is one or the other by chance,
        // so fire that is fed one flame at a time is not all white)
        var solid = n === 1 ? Math.random() < 0.6 : i % 2;
        E({ sys: solid ? 'col' : 'add', trail: o.trail, pos: pos.clone().add(rdir(o.r || 0.12)), vel: v, frame: 'flame', color: o.cols || (solid ? [0xffd060, 0xff7a1a, 0xc8301a, 0x5a1a10] : [0xffffff, 0xffe080, 0xff8a2b, 0xd2361a]),
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
      if (!c.noCircle) E({ sys: 'gadd', pos: G, frame: 'circle', color: c.deep, size: [r * 0.65, r], life: life,
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
        if (!c.noCircle) E({ sys: 'gadd', pos: G, frame: 'circle', color: c.deep, size: [radius * 0.35, radius],
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
    // ---------- who gets hit ----------
    // Whatever visibly lands must really land. Shots are dealt out at the moment they fly, among the monsters that are
    // on the field right then — also the ones that walked in after the cast began.
    function halfX(z) { return 2.2 + (3.8 - z) * 0.16; }
    function onField(m) { return m.z > -4.9 && m.z < 4.1 && Math.abs(m.x) < halfX(m.z) + 0.3 && m.y < 1.6; }
    function liveMobs() { return sc.mobs().filter(function (m) { return m.alive && (m.arrived || onField(m)); }); }
    function gp(m) { return V(m.x, 0, m.z); }
    function near(list, x, z, max) { var best = null, bd = max === undefined ? Infinity : max * max; list.forEach(function (m) { var d = (m.x - x) * (m.x - x) + (m.z - z) * (m.z - z); if (d < bd) { bd = d; best = m; } }); return best; }
    // straight up on the screen: the camera looks down at the field, so "up" leans away from it
    var UPC = V(0, 0.645, -0.764);
    function above(g, L) { return V(g.x, (g.y || 0) + UPC.y * L, g.z + UPC.z * L); }
    // a bar of light standing straight up on the screen from a ground point (len is its height)
    function shaft(g, len, w, col, life, o) { var q = { pos: above(g, len / 2), frame: 'streak', color: col, size: [len, len], ar: w, rot: 1.5708, life: life }; for (var k in o) q[k] = o[k]; return E(q); }
    // the five elements: fire, lightning, ice, star, moon
    var ELC = [0xff6a2b, 0x7bddff, 0xdff6ff, 0xffe14a, 0xb68aff];
    // one element bursting up out of the ground at a spot (kind: index into ELC)
    function elemPop(c, g, kind, s) {
      var col = ELC[kind], q = V(g.x, 0.45, g.z); s = s || 1;
      gRing(g, col, 2.2 * s, 0.4); sc.light(q, col, 1.3, 0.3);
      if (kind === 0) { shaft(g, 3.6 * s, 0.3, [0xffffff, 0xffc23a, 0xff5a1a], 0.3, { hot: 1.3, fadeOut: 0.4 }); fire(q, N(7, c), { size: 1.1 * s, speed: 2, up: 3.5 }); scorch(g, 1.0 * s, 2); embers(q, [0xffe080, 0xff6a2b], N(5, c), { speed: 2.4, up: 3 }); }
      else if (kind === 1) { skyBolt(c, q, s, { col: col, thin: true, br: 1 }); flare(q, 0xffffff, 1.1 * s, 0.12, { white: true }); sparks(q, [0xffffff, col], N(8, c), 7, { size: 0.16, stretch: 0.2, up: 1.2 }); scorch(g, 0.6 * s, 1.6); }
      else if (kind === 2) {
        for (var i = 0; i < 4; i++) E({ sys: 'norm', pos: V(g.x + (i - 1.5) * 0.2 * s, rr(0.35, 0.55) * s, g.z + 0.2), frame: 'shard', color: pick([0xffffff, 0xd8f2ff, 0xbfe8ff]), size: [0.05, rr(0.45, 0.7) * s], ar: 2, rot: -(i - 1.5) * 0.3, ease: 2, life: 0.55, fadeOut: 0.85, white: true });
        E({ sys: 'gadd', pos: V(g.x, 0.04, g.z), frame: 'frost', color: col, size: [0.3, 2.4 * s], ease: 1, life: 0.8, fadeOut: 0.5, alpha: 0.8 }); flare(q, 0xffffff, 0.9 * s, 0.12, { white: true });
      }
      else if (kind === 3) {
        E({ sys: 'col', pos: q, frame: 'star', color: [col, deep(col)], size: [0.3, 1.9 * s], ease: 1, life: 0.26, spin: 7 }); flare(q, 0xffffff, 1.0 * s, 0.12, { white: true });
        for (var k = 0; k < N(6, c); k++) E({ pos: q, vel: rdir(3.6).add(V(0, 2.4, 0)), frame: 'star', color: [0xffffff, col], size: [rr(0.16, 0.28) * s, 0.04], life: rr(0.4, 0.7), grav: 5, drag: 1.2, spin: rr(-10, 10) });
      }
      else { shaft(g, 3.6 * s, 0.22, [0xffffff, col], 0.28, { fadeOut: 0.4 }); for (var j = 0; j < 3; j++) E({ sys: j ? 'col' : 'add', pos: q, frame: 'crescent', color: j ? col : 0xffffff, size: [0.4, 1.8 * s], life: 0.3, rot: j * 2.094, spin: 7, alpha: 0.75, white: !j }); }
    }
    // A volley of real shots. o.fire(mob, frac, i, n) is called for each one, with the monster picked at that very
    // moment: the one this cast has hit least so far. So no shot falls on empty ground, a monster that dies passes its
    // share on, late arrivals are hit too, and every monster ends up with the skill's whole damage (frac adds up to 1).
    function volley(c, o) {
      var M = Math.max(1, c.pool().length), k = Math.max(1, Math.ceil(o.shots / M)), n = k * M, seen = [], cnt = [];
      function next() {
        var best = null, bn = Infinity;
        c.pool().forEach(function (m) { var i = seen.indexOf(m), v = (i < 0 ? 0 : cnt[i]) + Math.random() * 0.6; if (v < bn) { bn = v; best = m; } });
        if (!best) return null;
        var j = seen.indexOf(best); if (j < 0) { seen.push(best); cnt.push(1); } else cnt[j]++;
        return best;
      }
      for (var i = 0; i < n; i++) (function (i) { after(c.D(o.t0 + o.span * (n > 1 ? i / (n - 1) : 0)), function () { o.fire(next(), 1 / k, i, n); }); })(i);
      return n;
    }
    // A blast front rolling out from a point: fn(mob) runs when it reaches each monster on the field, once each.
    function ringHits(c, center, speed, maxR, fn, done) {
      var r = 0, hit = [];
      tick(function (dt) {
        r += speed * c.sp * dt;
        c.pool().forEach(function (m) { if (hit.indexOf(m) < 0 && (m.x - center.x) * (m.x - center.x) + (m.z - center.z) * (m.z - center.z) <= r * r) { hit.push(m); fn(m, r); } });
        if (r >= maxR) { if (done) done(); return true; }
      });
    }
    // For things that fly through a crowd: returns touch(pos), which hits every monster the thing is touching, once each.
    function passHits(c, radius, fn) {
      var hit = [];
      return function (p) { c.pool().forEach(function (m) { if (hit.indexOf(m) >= 0) return; var dx = m.x - p.x, dz = m.z - p.z, r = radius + (m.boss ? 0.4 : 0); if (dx * dx + dz * dz < r * r) { hit.push(m); fn(m); } }); };
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
          var star = picHead('starShot-star', sz * 2.2, -0.72, 0.77, 0.273);
          homing({ from: tip, to: function () { return sc.mobPos(mob); }, time: c.D(0.24), arc: V(0.1, [0.6, -0.3, 0.25][i], [0.25, -0.2, 0][i]),
            trail: { w: 0.16 * c.s * (big ? 1.35 : 1), col: c.col, core: 0.8, pts: 14 },
            heads: [{ sys: 'col', frame: 'glow', color: c.deep, size: sz * 1.25, alpha: 0.75 }, { frame: 'glow', color: c.col, size: sz * 2.6, alpha: 0.18 }, { frame: 'star', color: 0xffffff, size: sz, spin: 14, white: true }],
            emit: function (p, v, dt) { if (star) star.set(p, v, dt); if (Math.random() < dt * 40 * c.n) E({ pos: p.clone().add(rdir(0.06)), vel: rdir(0.6), frame: 'flare', color: [0xffffff, c.col], size: [0.15 * c.s, 0], life: 0.3, spin: 4 }); },
            onHit: function (p) {
              if (star) star.kill(); if (big) picAt('starShot-burst', V(p.x, 0, p.z), 1.0 * c.s, 'blast', 0.3);
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
          // a real ball of fire (js/fx3d.js) instead of a painted one: no flat cards over it, its own tail and smoke
          var ball = P3.fireball({ size: 0.17 * S_ });
          homing({ from: from, to: function () { return sc.mobPos(mob); }, time: c.D(0.36), arc: V(0, 1.9 - j * 0.6, 0.15), ease: function (k) { return k * k * 0.6 + k * 0.4; }, fancy: false, heads: [],
            emit: function (p, v, dt) {
              if (ball) ball.set(p, v, dt);
              var back = v.clone().multiplyScalar(-0.12);
              if (Math.random() < dt * 34 * c.n) trailFire(p, v, 0.17 * S_, { size: 0.36 * S_, speed: 0.6, up: 0.4, life: 0.7, v: back });
              if (Math.random() < dt * 25 * c.n) E({ sys: 'norm', pos: p.clone(), vel: back.clone().add(V(0, 0.5, 0)), frame: 'smoke', color: 0x4a3c38, size: [0.2 * S_, 0.7 * S_], ease: 1, life: 0.6, alpha: 0.35, drag: 2, fadeIn: 0.2 });
              if (Math.random() < dt * 30 * c.n) E({ pos: p.clone(), vel: rdir(1.5).add(back), frame: 'dot', color: [0xffe080, 0xff5a1a], size: [0.07, 0], life: 0.4, grav: 2, stretch: 0.1 });
            },
            onHit: function (p) { ball.kill(); P3.blast(V(p.x, 0, p.z), { size: 0.5 * S_, col: 0xff8a2b, flash: true, chips: 4, ring: 2.4, life: 0.7 }); explosion(c, p, S_, 0xff7a2b); c.hit(mob, 1, 1.6); } });
        });
      });
    };
    // a bolt out of the sky on to a point or a moving monster
    function skyBolt(c, to, w, o) {
      o = o || {}; var p = typeof to === 'function' ? to() : to, sky = p.clone().add(V(rr(-0.7, 0.7), 6.5, -1.2)), col = o.col || c.col;
      vx.lightning(sky, to, { w: 0.42 * w, color: col, core: 0, alpha: 0.42, life: c.D(0.26), branches: 0, segs: 16, amp: 0.22 });
      vx.lightning(sky, to, { solid: true, w: 0.12 * w, color: o.core || 0x3d8cff, core: 0.9, life: c.D(0.28), branches: o.br === undefined ? 2 : o.br, segs: 16, amp: 0.22 });
      if (!o.thin) vx.lightning(sky, to, { w: 0.05 * w, color: 0xffffff, life: c.D(0.2), branches: 0, segs: 16, amp: 0.22 });
    }
    // what a monster looks like the instant a bolt lands on it
    function zapHit(c, mob, big, col) {
      var q = sc.mobPos(mob), g = V(q.x, 0, q.z); col = col || c.col;
      flare(q, 0xffffff, (big ? 1.4 : 1.0) * c.s, 0.13, { white: true }); glow(q, col, [0.5, 1.4 * c.s], 0.25, { ease: 1, alpha: 0.45 });
      sparks(q, [0xffffff, col], N(big ? 12 : 7, c), 7, { size: 0.16, stretch: 0.2, life: 0.8, up: 1.2 });
      gRing(g, col, 1.7 * c.s, 0.3); scorch(g, 0.55 * c.s, 1.6); gGlow(g, col, 1.3, 0.3); sc.light(q, col, 1.6, 0.25);
      for (var k = 0; k < 2; k++) after(c.D(0.05 + k * 0.08), function () { if (!mob.alive) return; var q2 = sc.mobPos(mob); vx.lightning(q2.clone().add(rdir(0.45)), q2.clone().add(rdir(0.45)), { w: 0.045, color: col, life: 0.1, branches: 0, segs: 5, amp: 0.3 }); });
    }
    S.chain = function (c) {
      var list = c.pool().slice(0, 4); if (!list.length) return;
      sc.heroPose('raise', c.D(0.13), c.col);
      sc.dim(0.28, c.D(0.6));
      for (var i = 0; i < 3; i++) after(c.D(i * 0.04), function () { var t2 = sc.heroPaw(); vx.lightning(t2, t2.clone().add(rdir(0.5)), { w: 0.05, color: c.col, life: 0.12, branches: 0, segs: 6, amp: 0.25 }); });
      glow(c.from, c.col, [0.3, 1.0], c.D(0.16), { fadeIn: 0.6 });
      // Every bolt is a real hit. The chain jumps through the monsters once; then bolts keep dropping out of the sky on
      // those same monsters until each has taken the skill's whole damage (a lone boss takes all six).
      var M = list.length, k = Math.max(2, Math.ceil(6 / M)), frac = 1 / k, cnt = list.map(function () { return 0; });
      var prev = function () { return sc.heroPaw(); };
      list.forEach(function (mob, i) {
        var from = prev, to = function () { return sc.mobPos(mob); };
        after(c.D(0.13 + i * 0.075), function () {
          vx.lightning(from, to, { w: 0.34 * c.s, color: c.col, core: 0, alpha: 0.5, life: c.D(0.3), branches: 0, segs: 14, amp: 0.12 });
          vx.lightning(from, to, { solid: true, w: 0.11 * c.s, color: 0x3d8cff, core: 0.9, life: c.D(0.34), branches: c.tier >= 6 ? 3 : 2, segs: 14, amp: 0.12 });
          vx.lightning(from, to, { w: 0.05 * c.s, color: 0xffffff, life: c.D(0.26), branches: 0, segs: 14, amp: 0.12 });
          zapHit(c, mob, i === 0);
          if (i === 0) { sc.flash('rgba(200,235,255,0.55)', 0.22); sc.hitStop(0.04); fieldWave(to(), c.col, 0.55, 0xffffff); }
          sc.shake(0.08); cnt[i]++; c.hit(mob, frac, 1.0);
        });
        prev = to;
      });
      var t0 = 0.13 + M * 0.075 + 0.05, n = (k - 1) * M;
      for (var j = 0; j < n; j++) (function (j) {
        after(c.D(t0 + j * (0.34 / n)), function () {
          var best = -1; list.forEach(function (m, bi) { if (m.alive && (best < 0 || cnt[bi] < cnt[best])) best = bi; });
          var mob = best >= 0 ? list[best] : near(liveMobs(), c.center.x, c.center.z);
          if (!mob) return; if (best >= 0) cnt[best]++;
          skyBolt(c, function () { return sc.mobPos(mob); }, c.s);
          zapHit(c, mob, false); sc.flash('rgba(200,235,255,0.2)', 0.1); sc.shake(0.05);
          c.hit(mob, frac, 0.8);
        });
      })(j);
    };
    S.blizzard = function (c) {
      sc.heroPose('raise', c.D(0.12), c.col);
      var C = c.center.clone(), dur = c.D(0.9);
      E({ sys: 'gadd', pos: V(C.x, 0.04, C.z), frame: 'frost', color: c.col, size: [0.4, 4.4 * c.s], ease: 1, life: dur * 1.3, spin: 0.25, fadeIn: 0.1, fadeOut: 0.6, alpha: 0.9 });
      // frost creeps over the whole ground, wind and snow cross the whole screen
      E({ sys: 'gadd', pos: V(FC.x, 0.035, FC.z), frame: 'frost', color: 0xdff4ff, size: [1.5, 10.5], ease: 1, life: dur * 1.5, spin: -0.12, fadeIn: 0.15, fadeOut: 0.5, alpha: 0.5 });
      for (var wv = 0; wv < N(22, c); wv++) { var wp = fieldPt(rr(0.3, 2.8)); wp.x = rr(-5, -1); E({ pos: wp, vel: V(rr(7, 11), rr(-1.4, -0.4), 0), frame: 'streak', color: 0xe8f8ff, size: [0.3, 0.5], life: rr(0.4, 0.7), delay: rr(0, dur * 0.8), stretch: 0.14, alpha: 0.5, fadeIn: 0.2, fadeOut: 0.4 }); }
      fieldRain(c, 55, dur * 0.7, { vel: function () { return V(rr(0.8, 2.2), rr(-3, -1.6), 0); }, frames: ['snow', 'snow', 'dot'], cols: 0xffffff, size: function () { return rr(0.07, 0.16) * c.s; }, life: 1.2, sway: true, white: true });
      circle(V(sc.heroCenter().x, 0, sc.heroCenter().z), c.col, 1.4, c.D(0.5));
      smoke(V(C.x, 0.2, C.z), 0xdff4ff, N(8, c), { r: 1.2, size: 1.4, rise: 0.15, speed: 0.6, alpha: 0.32, life: 1.4 });
      sc.light(V(C.x, 1, C.z), c.col, 0.7, dur);
      sc.flash('rgba(210,240,255,0.3)', 0.15);
      // every shard that falls is aimed at a monster and is a real hit; the first one to land on a monster freezes it in spikes
      var iced = [];
      function spikes(mob, mi) {
        var p = sc.mobPos(mob), g = mob.group.position, big = mob.boss ? 1.45 : 1;
        for (var s = 0; s < 5; s++) {
          var ang = (s - 2) * 0.36 + rr(-0.1, 0.1), h = rr(0.85, 1.35) * c.s * big;
          E({ sys: 'norm', pos: V(g.x + (s - 2) * 0.17 * big, h * 0.42, g.z + 0.3 + rr(-0.05, 0.1)), frame: 'shard', color: pick([0xffffff, 0xd8f2ff, 0xbfe8ff]), size: [0.05, h * 0.5], ar: 2.0, rot: -ang, ease: 2, life: c.D(0.6), fadeOut: 0.85, white: true });
        }
        flare(p, 0xffffff, 1.2, 0.15, { white: true }); shock(p, c.col, 1.8, 0.3);
        if (mi < 3) picAt('iceStorm', g, 1.2 * Math.min(1.3, c.s) * big, 'rise');
        after(c.D(0.48), function () {
          var q = sc.mobPos(mob);
          for (var k = 0; k < N(10, c); k++) E({ sys: 'norm', pos: q.clone().add(rdir(0.35)), vel: rdir(3.5).add(V(0, 2.2, 0)), frame: 'shard', color: pick([0xffffff, 0xd8f2ff]), size: [rr(0.1, 0.2), 0.05], ar: 2, life: rr(0.5, 0.8), grav: 7, spin: rr(-12, 12), white: true });
          sparks(q, [0xffffff, c.col], N(6, c), 4, { size: 0.15 });
        });
      }
      volley(c, { shots: 10, t0: 0.08, span: 0.5, fire: function (mob, frac) {
        var g = mob ? gp(mob) : fieldPt(0);
        picFall('iceStorm-shard', g, rr(1.0, 1.7) * Math.min(1.4, c.s), c.D(0.19), 0.6, function () {
          gRing(g, c.col, 1.2 * c.s, 0.3); flare(g.clone().setY(0.15), 0xffffff, 0.6, 0.1, { white: true }); sparks(g.clone().setY(0.2), [0xffffff, c.col], N(4, c), 3.5, { size: 0.13, up: 1.8 }); sc.shake(0.03);
          for (var k2 = 0; k2 < N(3, c); k2++) E({ sys: 'norm', pos: g.clone().setY(0.15), vel: rdir(2.2).add(V(0, 2.4, 0)), frame: 'shard', color: pick([0xffffff, 0xd8f2ff]), size: [rr(0.1, 0.18), 0.04], life: rr(0.35, 0.6), grav: 9, spin: rr(-9, 9) });
          if (!mob) return;
          if (mob.alive && iced.indexOf(mob) < 0) { iced.push(mob); spikes(mob, iced.length - 1); }
          c.hit(mob, frac, 0.9);
        });
      } });
    };
    S.meteors = function (c) {
      c.plain = true;
      sc.heroPose('raise', c.D(0.12), c.col);
      sc.dim(0.6, c.D(1.2)); sc.flash('rgba(255,90,30,0.22)', 0.25);
      // the sky reddens and a few far-off streaks show where they come from; every rock that comes down is aimed at a
      // monster and is a real hit
      fieldRain(c, 18, c.D(0.6), { y: function () { return rr(4.2, 5.8); }, vel: function () { return V(rr(-2.6, -1.6), rr(-6.5, -4), 0.3); }, frames: ['streak', 'dot'], cols: [0xffffff, 0xffd080, 0xff9a40], size: function () { return [rr(0.08, 0.13), 0.02]; }, life: 0.45, stretch: 0.07 });
      // dirt for the crown thrown up at each hit: the ground of this place, darkened to earth
      var dirt = new T.Color(dustCol).lerp(new T.Color(0x4a382c), 0.75).getHex(), landed = [];
      volley(c, { shots: 12, t0: 0.14, span: 0.55, fire: function (mob, frac, m, n) {
        var big = c.tier >= 7 && m === n - 1, land = mob ? sc.mobPos(mob) : fieldPt(0.1), cs = Math.min(1.6, c.s), P = big ? 2.0 : 1, R = 0.3 * cs * P;
        // they come in steep from high up and off to the side, so the fall crosses most of the screen
        var from = land.clone().add(V(rr(2.0, 2.6), rr(5.0, 5.6), -1.0));
        // a faceted stone with a dark outline: white hot only on the side it flies into, a cap of burning air in front,
        // a tail of fire behind it, smoke hanging along its way; the spot where it will land darkens and glows first
        var rock = null, spot = null;
        after(big ? c.D(0.22) : 0, function () { rock = P3.rock({ size: R, col: 0xffb83a, hot: 0xff7a1a }); spot = P3.mark({ col: 0xff9a30 });
        homing({ from: from, to: function () { if (mob && mob.alive) land = sc.mobPos(mob); return land; }, time: c.D(big ? 0.46 : 0.34), ease: function (k) { return k * k * 0.55 + k * 0.45; },
          fancy: false, heads: [],
          emit: function (p, v, dt, k) {
            rock.set(p, v, dt); spot.set(land, k, R * 1.6);
            // bits burning off the stone
            if (Math.random() < dt * 60 * c.n) E({ pos: p.clone().add(rdir(0.3 * R / 0.3)), vel: v.clone().multiplyScalar(-0.15).add(rdir(1.4)), frame: pick(['dot', 'flare', 'star']), color: [0xffffff, 0xffd060, 0xff8a2b], size: [rr(0.1, 0.18), 0], life: rr(0.3, 0.6) });
            if (Math.random() < dt * 34 * c.n) fire(p.clone().addScaledVector(v, -0.02), 1, { size: 0.5 * R / 0.3, speed: 0.6, up: 0.4, life: 0.45, cols: [0xffe14a, 0xff8a2b, 0xd8401a] });
          },
          onHit: function (p) {
            var gp2 = V(p.x, 0.03, p.z);
            rock.kill(); spot.kill();
            var near2 = 0; landed = landed.filter(function (q) { return time - q.t < 0.4; }); landed.forEach(function (q) { if ((q.x - p.x) * (q.x - p.x) + (q.z - p.z) * (q.z - p.z) < 1.2) near2++; }); landed.push({ x: p.x, z: p.z, t: time });
            P3.impact(gp2, { size: 0.55 * cs * P, col: 0xff9a2a, hot: 0xff6a1a, dirt: dirt, chips: big ? 20 : 10, ring: big ? 4.2 : 2.8, calm: big ? 1 : 1 / (1 + 0.7 * near2) });
            // flames and sparks thrown up out of the hit
            fire(V(p.x, 0.3, p.z), N(big ? 16 : 7, c), { size: 0.85 * cs * P, speed: 3.8, up: 3.2, life: 0.7 });
            sparks(p, [0xffffff, 0xffd060, 0xff8a2b], N(big ? 40 : 20, c), 8.5, { size: 0.18, up: 2.8, stretch: 0.12 });
            for (var fk = 0; fk < N(big ? 14 : 5, c); fk++) E({ pos: p.clone().add(V(0, 0.2, 0)), vel: V(rr(-6, 6), rr(3, 8), rr(-4, 4)), frame: 'flame', color: [0xffe080, 0xff7a1a, 0xc8301a], size: [rr(0.3, 0.55) * cs, 0.08], life: rr(0.6, 1.0), grav: 10, drag: 0.5, spin: rr(-5, 5), fadeOut: 0.3 });
            sc.flash(big ? 'rgba(255,200,120,0.75)' : 'rgba(255,170,80,0.28)', big ? 0.6 : 0.1);
            if (big) { fieldWave(gp2, 0xffb040, 0.9, 0xff7a1a); fieldWave(gp2, 0xff6a1a, 1.1); sc.slowmo(0.45, 0.45, true); }
            sc.light(p, 0xffa040, big ? 3.2 : 2.4, 0.4); sc.shake(big ? 0.8 : 0.2); sc.punch(big ? 0.14 : 0.03);
            if (mob) c.hit(mob, frac, 0.9);
          } });
        });
      } });
    };
    // A beam of light between two moving points, in four layers (soft halo, colour, solid core, white line).
    // st.a and st.b are read every frame and st.open (0..1) is its thickness; kill() removes it.
    // layers: [width, colour, white core, alpha, solid] from the outside in. taper 'tail' = thin at a, full at b (a column
    // coming down); the default is thin at both ends.
    function beamOf(st, col, w, core, layers, taper) {
      var ribs = [], pts = []; for (var i = 0; i <= 12; i++) pts.push(V());
      function shape(u, rb) { return st.open * (1 + Math.sin(rb.t * 70 + u * 20) * 0.12) * (taper || u >= 0.05 ? 1 : 0.55); }
      function upd(rb) { for (var j = 0; j <= 12; j++) rb.pts[j].lerpVectors(st.a, st.b, j / 12); }
      (layers || [[1.7, col, 0, 0.14, false], [0.95, col, 0, 0.36, false], [0.55, core || deep(col), 0.7, 0.95, true], [0.17, 0xffffff, 1.5, 1, false]]).forEach(function (L) {
        var rb = vx.ribbon({ solid: L[4], mode: 'static', taper: taper || 'bolt', pts: pts, w: L[0] * w, color: L[1], core: L[2], alpha: L[3], life: 30, hold: true, widthFn: shape, upd: upd });
        if (rb) ribs.push(rb);
      });
      return { kill: function () { ribs.forEach(function (r) { r.kill(); }); } };
    }
    // Moon laser. A moon rises behind the wizard and drinks in light; the beam is then FIRED — its tip races out of the
    // paw across the field — and swings over the crowd. It cuts every monster it actually passes over, keeps burning
    // it, and the moonlight left in the wound goes off a moment later. Nothing is hit that the beam does not touch.
    S.beam = function (c) {
      c.plain = true;   // the beam and what it does to the monsters is the whole picture
      sc.heroPose('thrust', c.D(0.22), c.col);
      sc.dim(0.45, c.D(1.1));
      var cs = Math.min(1.6, c.s), chargeT = c.D(0.22), moonSize = 0.1, moonT = 0, moonOn = true;
      function moonAt() { return sc.heroCenter().add(V(-0.1, 1.55, -0.3)); }
      // a real moon (a lit ball with a crescent and seas) rises behind the wizard
      var moon3 = P3.moon({ rim: 0xb8a8ff, deep: 0x6a4cff });
      tick(function (dt) {
        moonT += dt;
        if (moonOn) moonSize = Math.min(1, moonT / chargeT) * 0.95 * cs * (1 + Math.sin(moonT * 22) * 0.04); else moonSize *= Math.max(0, 1 - dt * 8);
        moon3.set(moonAt(), moonSize * 0.42, dt);
        if (moonOn && Math.random() < dt * 40 * c.n) { var d = rdir(rr(1.2, 2)), m = moonAt(); E({ pos: m.clone().add(d), vel: d.clone().multiplyScalar(-5), frame: pick(['flare', 'dot', 'star']), color: [0xffffff, c.col], size: [rr(0.08, 0.16), 0.02], life: 0.26, fadeIn: 0.3, white: true }); }
        if (!moonOn && moonSize < 0.04) { moon3.kill(); return true; }
      });
      after(chargeT, function () {
        var H = sc.heroState(), list = c.pool(), a0, a1, LEN = 11.5;
        // the swing goes from one side of the crowd to the other as seen from the wizard: it starts and ends at the widest empty gap
        var angs = list.map(function (m) { return Math.atan2(m.z - H.z, m.x - H.x); }).sort(function (x, y) { return x - y; });
        if (!angs.length) { a0 = (H.faceT > 0 ? 0 : Math.PI) - 0.4; a1 = a0 + 0.8; }
        else {
          var gap = -1, at = 0;
          for (var i = 0; i < angs.length; i++) { var nx = i + 1 < angs.length ? angs[i + 1] : angs[0] + 6.2832; if (nx - angs[i] > gap) { gap = nx - angs[i]; at = i; } }
          a0 = (at + 1 < angs.length ? angs[at + 1] : angs[0] + 6.2832) - 0.28; a1 = angs[at] + 6.2832 + 0.28;
        }
        if (Math.random() < 0.5) { var sw = a0; a0 = a1; a1 = sw; }
        var k = list.length <= 1 ? 6 : list.length <= 3 ? 3 : 2, burned = [];
        // the beam is a real tube of light (white core, light coiling round it, a violet glow) and a ball of light at its tip
        var start = sc.heroPaw(), st = { a: start.clone(), b: start.clone(), open: 0 }, beam = P3.beam({ col: 0xcbbcff, deep: 0x6a4cff, r: 0.17 * cs });
        var T_OUT = c.D(0.1), T_SW = c.D(0.44), T_END = c.D(0.14), t = 0, prevA = a0, dir = V(Math.cos(a0), 0, Math.sin(a0)), ang2 = 0, pa = V(), pb = V(), scarT = 0;
        var tip = P3.orb({ col: 0xffffff, deep: 0x9a7cff }), paw = P3.orb({ col: 0xffffff, deep: 0x8a6cff });
        sc.heroFaceTo(start.x + Math.cos(a0) * 3);
        // the shot leaving the paw
        flare(start, 0xffffff, 0.7 * cs, 0.16, { white: true });
        for (var r0 = 0; r0 < 1; r0++) E({ pos: start, frame: 'ring', color: c.col, size: [0.3, (1.0 + r0 * 0.7) * cs], ease: 1, life: c.D(0.2 + r0 * 0.06), delay: r0 * 0.03, alpha: 0.7 });
        sparks(start, [0xffffff, c.col], N(14, c), 8, { dir: dir.clone().setY(0.1), spread: 0.5, size: 0.2, stretch: 0.16 });
        
        gRing(V(start.x, 0, start.z), c.col, 2.6, 0.4); sc.flash('rgba(230,225,255,0.4)', 0.2); sc.punch(0.07); sc.shake(0.25);
        function burn(m) {
          for (var bi = 0; bi < k; bi++) (function (bi) {
            after(c.D(bi * 0.07), function () {
              if (!m.alive) return;
              var q = sc.mobPos(m), last = bi === k - 1;
              flare(q, 0xffffff, bi ? 0.45 : 0.7, 0.1, { white: true }); sparks(q, [0xffffff, c.col], N(bi ? 4 : 10, c), 6, { size: 0.18, dir: dir.clone().setY(0.3), spread: 0.8 });
              if (!bi) {   // the cut
                E({ pos: q, frame: 'crescent', color: 0xffffff, size: [0.3, 1.0 * cs], ease: 1, life: c.D(0.2), rot: ang2 - 1.2, alpha: 0.9, white: true });
                E({ sys: 'col', pos: q, frame: 'crescent', color: c.col, size: [0.4, 1.3 * cs], ease: 1, life: c.D(0.28), rot: ang2 - 1.2, alpha: 0.7 });
                E({ sys: 'col', pos: q, frame: 'shock', color: 0x8a6cff, size: [0.3, 1.3 * cs], ease: 1, life: 0.26, alpha: 0.45 }); sc.light(q, c.col, 1.6, 0.4); sc.shake(0.06);
              }
              if (last) {  // the moonlight left in the wound goes off
                shaft(gp(m), 4.2, 0.2, [0xffffff, c.col], 0.26, { fadeOut: 0.4 }); shaft(gp(m), 4.2, 0.07, 0xffffff, 0.2, { white: true });
                ring(q, 0x8a6cff, 0.9 * cs, 0.22); gRing(gp(m), 0x8a6cff, 1.8 * cs, 0.4);
                for (var cr = 0; cr < N(4, c); cr++) E({ pos: q, vel: rdir(3.5).add(V(0, 1.5, 0)), frame: 'crescent', color: [0xffffff, c.col], size: [rr(0.25, 0.45) * cs, 0.05], life: rr(0.35, 0.6), spin: rr(-9, 9), drag: 2 });
              }
              c.hit(m, 1 / k, last ? 1.5 : bi ? 0.7 : 1.2);
            });
          })(bi);
        }
        tick(function (dt) {
          t += dt;
          var s0 = sc.heroPaw(), ks = Math.max(0, Math.min(1, (t - T_OUT) / T_SW)), e = ks * ks * (3 - 2 * ks), ang = a0 + (a1 - a0) * e;
          var len = Math.min(LEN, LEN * t / T_OUT), closing = t > T_OUT + T_SW ? Math.max(0, 1 - (t - T_OUT - T_SW) / T_END) : 1;
          st.open = Math.min(1, t / (T_OUT * 0.5)) * closing;
          dir.set(Math.cos(ang), 0, Math.sin(ang));
          st.a.copy(s0); st.b.set(s0.x + dir.x * len, s0.y - 0.25, s0.z + dir.z * len);
          pa.copy(st.a).project(sc.camera); pb.copy(st.b).project(sc.camera); ang2 = Math.atan2(pb.y - pa.y, (pb.x - pa.x) * (sc.camera.aspect || 1));
          beam.set(st.a, st.b, st.open); tip.set(st.b, 0.3 * cs * st.open); paw.set(st.a, 0.24 * cs * st.open);
          if (closing >= 1) {
            // everything between where the beam was and where it is now has been swept over
            var lo = Math.min(prevA, ang), hi = Math.max(prevA, ang);
            c.pool().forEach(function (m) {
              if (burned.indexOf(m) >= 0) return;
              var rx = m.x - s0.x, rz = m.z - s0.z, d = Math.sqrt(rx * rx + rz * rz); if (d > len + 0.3) return;
              var pad = Math.asin(Math.min(1, (m.boss ? 0.9 : 0.5) / Math.max(0.3, d))), am = Math.atan2(rz, rx), mid = (lo + hi) / 2;
              am = mid + Math.atan2(Math.sin(am - mid), Math.cos(am - mid));
              if (am >= lo - pad && am <= hi + pad) { burned.push(m); burn(m); }
            });
            sc.shake(dt * 0.6);
            // the ground under the beam is left glowing: a fan of light that fades behind the swing
            scarT -= dt;
            if (scarT <= 0) { scarT = 0.028; var L2 = Math.min(len, 9.5); E({ sys: 'gadd', pos: V(s0.x + dir.x * L2 * 0.5, 0.035, s0.z + dir.z * L2 * 0.5), frame: 'streak', color: [0x8a6cff, 0x5a3cdf], size: L2, ar: 0.2, rot: Math.atan2(-dir.z, dir.x), life: 0.42, alpha: 0.35, big: true, fadeOut: 0.2 }); }
            if (Math.random() < dt * 12 * c.n) { var u = rr(0.1, 0.9), sd = Math.random() < 0.5 ? 1 : -1; E({ pos: V(s0.x + dir.x * len * u, s0.y - 0.25 * u, s0.z + dir.z * len * u), vel: V(-dir.z * sd * rr(2, 4), rr(0.5, 2), dir.x * sd * rr(2, 4)), frame: 'crescent', color: [0xffffff, c.col], size: [0.2, rr(0.5, 0.9) * cs], life: rr(0.4, 0.7), spin: rr(-6, 6), drag: 2, fadeOut: 0.5 }); }
            if (Math.random() < dt * 35 * c.n) { var u2 = rr(0, 0.9); E({ pos: V(s0.x + dir.x * len * u2, s0.y - 0.25 * u2 + rr(-0.14, 0.14), s0.z + dir.z * len * u2), vel: dir.clone().multiplyScalar(rr(8, 14)), frame: 'streak', color: [0xffffff, c.col], size: [0.3, 0.1], life: rr(0.15, 0.3), stretch: 0.08 }); }
          }
          prevA = ang;
          if (t < T_OUT + T_SW + T_END) return false;
          beam.kill(); tip.kill(); paw.kill(); moonOn = false;
          // the beam breaks up into moon dust along its last line
          for (var s = 0; s < N(30, c); s++) { var u3 = rr(0, 1); E({ pos: V(s0.x + dir.x * len * u3, s0.y - 0.25 * u3, s0.z + dir.z * len * u3), vel: rdir(0.9).add(V(0, 0.7, 0)), frame: pick(['flare', 'dot', 'star', 'crescent']), color: [0xffffff, c.col], size: [rr(0.1, 0.2), 0], life: rr(0.4, 0.9), white: true, spin: rr(-4, 4) }); }
          return true;
        });
      });
    };
    // Solar burst. A sun gathers high over the field, swelling and beating while light streams into it and thin shafts
    // mark every monster. Then it lets go: a great column of fire POURS DOWN from the top of the screen, strikes the
    // ground and stands there roaring while a ring of fire rolls out over everything. Each monster is struck, under its
    // own falling shaft, as the fire reaches it.
    S.flash = function (c) {
      c.plain = true;
      sc.heroPose('raise', c.D(0.16), c.col);
      sc.dim(0.5, c.D(1.25));
      var cs = Math.min(1.6, c.s), G = V(c.center.x * 0.6, 0.03, c.center.z * 0.6 - 0.2), sun = above(G, 3.3), dur = c.D(0.36), W = 0.6 * cs, sunSize = 0.1, sunT = 0, sunOn = 1;
      var FIRE = [0xffffff, 0xffe14a, 0xff8a2b];
      function sz(mul) { return function (p) { p.s0 = p.s1 = sunSize * mul; return true; }; }
      var sunParts = [E({ pos: sun, frame: 'glow', color: [0xffd84a, 0xff8a20], size: 0.1, life: 30, upd: sz(2.2), fadeOut: 1, hot: 1.3, alpha: 0.5 }),
        E({ pos: sun, frame: 'flare', color: 0xffe14a, size: 0.1, life: 30, upd: sz(2.6), fadeOut: 1, spin: -1, rot: 0.4 }),
        E({ pos: sun, frame: 'flare', color: 0xffffff, size: 0.1, life: 30, upd: sz(1.8), fadeOut: 1, spin: 1.5, white: true }),
        E({ pos: sun, frame: 'circle', color: 0xffe14a, size: 0.1, life: 30, upd: sz(2.1), fadeOut: 1, spin: 2, alpha: 0.8 }),
        E({ sys: 'col', pos: sun, frame: 'dot', color: 0xff9a1a, size: 0.1, life: 30, upd: sz(1.15), fadeOut: 1 }),
        E({ pos: sun, frame: 'dot', color: 0xfff6c8, size: 0.1, life: 30, upd: sz(0.85), fadeOut: 1, white: true })];
      for (var ry = 0; ry < 6; ry++) sunParts.push(E({ pos: sun, frame: 'streak', color: [0xffffff, 0xffd84a], size: 0.1, life: 30, upd: sz(2.7 + (ry % 2) * 0.7), fadeOut: 1, rot: ry / 6 * 3.1416, spin: 0.9, alpha: 0.45, ar: 0.5 }));
      tick(function (dt) {
        sunT += dt;
        var grow = Math.min(1, sunT / dur); grow = 1 - (1 - grow) * (1 - grow);
        if (sunOn) sunSize = (0.25 + 0.5 * grow) * cs * (1 + Math.sin(sunT * 34) * 0.06) * sunOn; else sunSize *= Math.max(0, 1 - dt * 7);
        // light streams in from every side while it gathers
        if (sunOn === 1 && sunT < dur && Math.random() < dt * 90 * c.n) { var d = rdir(rr(2.2, 4.2)); d.z *= 0.2; E({ pos: sun.clone().add(d), vel: d.clone().multiplyScalar(-1 / 0.22), frame: pick(['streak', 'dot']), color: FIRE, size: [rr(0.16, 0.3), 0.04], life: 0.22, stretch: 0.07, fadeIn: 0.3 }); }
        if (!sunOn && sunSize < 0.04) { sunParts.forEach(vx.kill); return true; }
      });
      circle(G, 0xffd84a, 3.0 * cs, dur + c.D(0.6), { spin: 1.6, alpha: 0.6 });
      sc.light(V(G.x, 2, G.z), 0xffd84a, 0.6, dur);
      // heat comes up off the whole ground, and a thin shaft marks the place of the column and every monster
      fieldRain(c, 34, dur, { y: function () { return rr(0.05, 0.3); }, vel: function () { return UPC.clone().multiplyScalar(rr(1.5, 3.5)); }, frames: ['dot', 'flare'], cols: [0xffe080, 0xff6a2b], size: function () { return [rr(0.06, 0.12), 0]; }, life: 0.8 });
      function mark(g, w, life, delay) {
        shaft(g, 7, w, [0xffffff, 0xffe14a], life, { delay: delay || 0, fadeIn: 0.3, fadeOut: 0.7, alpha: 0.75 });
        E({ sys: 'gadd', pos: V(g.x, 0.04, g.z), frame: 'ring', color: 0xffe14a, size: [1.1, 0.5], life: life, delay: delay || 0, rot: 0, alpha: 0.9, fadeIn: 0.2 });
      }
      mark(G, 0.05, dur, 0);
      c.pool().forEach(function (m) { mark(gp(m), 0.03, dur * 0.8, dur * 0.2 * Math.random()); });
      after(dur, function () {
        var top = above(G, 7.8), foot = V(G.x, 0.05, G.z), down = foot.clone().sub(top).normalize(), full = top.distanceTo(foot);
        var st = { a: top.clone(), b: top.clone(), open: 1 }, t = 0, T_FALL = c.D(0.12), T_HOLD = c.D(0.36), T_END = c.D(0.16), landed = false;
        // a body of fire with a white-hot heart
        var col = beamOf(st, 0xffc23a, W, 0, [[2.5, 0xff8a20, 0, 0.16, false], [1.3, 0xff5a12, 0.1, 0.95, true], [0.85, 0xffb82a, 0.5, 0.95, true], [0.36, 0xfff2b0, 1.2, 0.9, false]], 'tail');
        var head = E({ pos: st.b, frame: 'flare', color: 0xffffff, size: 2.6 * cs, life: 30, upd: STAY, fadeOut: 1, white: true, spin: 7 });
        sunOn = 1.25; flare(sun, 0xffffff, 1.6, 0.18, { white: true }); sc.flash('rgba(255,240,190,0.5)', 0.2); sc.shake(0.2);
        tick(function (dt) {
          t += dt;
          var kf = Math.min(1, t / T_FALL), e = kf * kf, len = full * e;
          st.b.lerpVectors(top, foot, e);
          if (head) { head.x = st.b.x; head.y = st.b.y; head.z = st.b.z + 0.1; }
          st.open = t < T_FALL + T_HOLD ? 1 + Math.sin(t * 60) * 0.07 : Math.max(0, 1 - (t - T_FALL - T_HOLD) / T_END);
          if (st.open > 0.3) {
            // fire streams down inside the column, and bands of light slide down it
            for (var i = 0; i < N(3, c); i++) { var u = rr(0, 1) * e, sp = rr(14, 24); E({ pos: V(top.x + (foot.x - top.x) * u + rr(-W, W) * 0.8, top.y + (foot.y - top.y) * u, top.z + (foot.z - top.z) * u + 0.05), vel: down.clone().multiplyScalar(sp), frame: pick(['streak', 'streak', 'flame']), color: FIRE, size: [rr(0.35, 0.7), 0.1], life: Math.min(0.3, (len * (1 - u / Math.max(e, 0.01)) + 0.3) / sp), stretch: 0.09, hot: 1.2 }); }
            if (Math.random() < dt * 14) E({ pos: top, vel: down.clone().multiplyScalar(17), frame: 'ring', color: [0xffffff, 0xffe14a], size: 2.3 * W, ar: 0.32, rot: 0, life: len / 17, alpha: 0.8, fadeIn: 0.15, fadeOut: 0.85 });
          }
          if (landed && st.open > 0.3) {
            // where it stands on the ground, fire is thrown out sideways the whole time
            for (var b = 0; b < N(2, c); b++) { var a = rr(0, 6.283); fire(V(foot.x + Math.cos(a) * W * 0.6, 0.3, foot.z + Math.sin(a) * W * 0.5), 1, { size: rr(0.6, 0.9) * cs, speed: 0.6, up: 2.6, life: 0.6, v: V(Math.cos(a) * 5, 0, Math.sin(a) * 4) }); }
            if (Math.random() < dt * 50 * c.n) E({ pos: V(foot.x + rr(-W, W), 0.3, foot.z), vel: V(rr(-6, 6), rr(3, 8), rr(-3, 3)), frame: 'dot', color: FIRE, size: [rr(0.07, 0.13), 0], life: rr(0.5, 0.9), grav: 6, stretch: 0.08 });
            sc.shake(dt * 0.9);
          }
          if (kf >= 1 && !landed) {
            landed = true; vx.kill(head);
            var C = V(G.x, 0.7, G.z), r = 0.4;
            sc.flash('rgba(255,248,215,1)', 0.8); sc.hitStop(0.1); sc.slowmo(0.25, 0.4); sc.punch(0.13); sc.shake(0.65);
            flare(C, 0xffffff, 2.2, 0.16, { white: true });
            E({ sys: 'col', pos: C, frame: 'glow', color: [0xffc23a, 0xff5a1a], size: [1.5, 5], life: 0.4, alpha: 0.5, big: true, fadeOut: 0.2, ease: 1 });
            for (var ray = 0; ray < N(16, c); ray++) E({ pos: C, frame: 'streak', color: [0xffffff, 0xffd84a], size: [0.6, 7], ease: 1, life: rr(0.35, 0.55), rot: ray / 16 * 3.1416 + rr(-0.1, 0.1), alpha: 0.6, fadeOut: 0.3 });
            E({ sys: 'col', pos: C, frame: 'shock', color: 0xffb030, size: [1, 15], ease: 1, life: 0.6, alpha: 0.8, big: true, fadeOut: 0.3 });
            E({ pos: C, frame: 'ring', color: 0xffffff, size: [1, 12], ease: 1, life: 0.45, alpha: 0.6, big: true, fadeOut: 0.2, white: true });
            fieldWave(G, 0xffd84a, 0.75, 0xff9a40); gRing(G, 0xffd84a, 11, 0.6); gGlow(G, 0xffb040, 4.2, 0.9); scorch(G, 2.8, 3);
            fire(C, N(20, c), { size: 1.0 * cs, speed: 5, up: 3 });
            // burning pieces are thrown high and far, and fire jets out of the ground here and there
            for (var ej = 0; ej < N(36, c); ej++) E({ sys: ej % 2 ? 'col' : 'add', pos: C.clone().add(rdir(0.5, 0.3)), vel: V(rr(-9, 9), rr(3, 9), rr(-6, 6)), frame: 'flame', color: [0xffe080, 0xff7a1a, 0xc8301a], size: [rr(0.3, 0.6) * cs, 0.08], life: rr(0.7, 1.2), grav: 10, drag: 0.5, spin: rr(-5, 5), fadeOut: 0.3 });
            for (var eb = 0; eb < N(50, c); eb++) E({ pos: C.clone().add(rdir(1.2, 0.4)), vel: rdir(9).add(V(0, 3, 0)), frame: 'dot', color: FIRE, size: [rr(0.06, 0.12), 0], life: rr(0.6, 1.1), grav: 3, drag: 1.2, stretch: 0.1 });
            fieldPops(c, N(8, c), 0.06, 0.05, function (g) { elemPop(c, g, 0, 1); });
            sc.light(C, 0xffe080, 2.8, 0.7);
            // the ring of fire itself: flames carried outward over the ground
            tick(function (dt2) {
              r += 16 * c.sp * dt2;
              for (var j = 0; j < N(6, c); j++) { var a2 = rr(0, 6.283), p = V(G.x + Math.cos(a2) * r, 0.3, G.z + Math.sin(a2) * r); if (Math.abs(p.x) < 4.6 && p.z > -5.2 && p.z < 4.4) fire(p, 1, { size: rr(0.6, 0.9) * cs, speed: 0.5, up: 3, life: 0.7, v: V(Math.cos(a2) * 4, 0, Math.sin(a2) * 4) }); }
              if (Math.random() < dt2 * 18) scorch(V(G.x + Math.cos(rr(0, 6.28)) * r, 0, G.z + Math.sin(rr(0, 6.28)) * r), 0.9, 1.8);
              return r > 10.5;
            });
            ringHits(c, G, 16, 10.5, function (m) {
              var q = sc.mobPos(m), g = gp(m);
              shaft(g, 7, 0.2 * (m.boss ? 1.8 : 1), [0xffffff, 0xffd84a, 0xff8a2b], 0.28, { hot: 1.3, fadeOut: 0.4 }); shaft(g, 7, 0.07, 0xffffff, 0.2, { white: true });
              flare(q, 0xffffff, 1.0 * cs, 0.14, { white: true }); fire(q, N(7, c), { size: 0.8, speed: 2.4, up: 2.4 }); gRing(g, 0xffb040, 2.0 * cs, 0.4); scorch(g, 1.1, 2); embers(q, [0xffe080, 0xff6a2b], N(6, c), { speed: 2.6, up: 3 });
              c.hit(m, 1, 2);
            });
          }
          if (t < T_FALL + T_HOLD + T_END) return false;
          col.kill(); sunOn = 0;
          smoke(V(G.x, 0.5, G.z), [0x6a5a54, 0x2e2624], N(8, c), { r: 0.8, size: 1.5, rise: 1.2, speed: 1, life: 1.4 });
          return true;
        });
      });
    };
    // Black hole. It opens over the field and drags EVERY monster on the screen into it — they circle in, late-comers
    // too — while light, dust and bits of the ground are sucked off the whole screen. Then it collapses to a point and
    // blows everything back out at once: one hit for all, and they are thrown clear.
    S.vortex = function (c) {
      c.plain = true;
      sc.heroPose('raise', c.D(0.14), c.col);
      sc.dim(0.6, c.D(1.25));
      var C = V(c.center.x * 0.5, 1.0, c.center.z * 0.5 - 0.2), G = V(C.x, 0.04, C.z), pullT = c.D(0.64), t = 0, held = [], spinA = [], rad0 = [];
      var cs = Math.min(1.6, c.s), PAL = [0xffffff, c.col, 0xff6ad8, 0x6a5aff];
      function grown() { return Math.min(1, t / c.D(0.16)); }
      // a real black hole: a dark ball with a thin ring of trapped light, a tilted disk of glowing gas turning round it
      // (its front half in front of the ball, the back half behind), and the picture around it bent in and round
      var bh = P3.hole({ pos: C, mid: 0xff6ad8, out: c.col, rim: 0xffd8ff }), bhR = 0.01;
      E({ sys: 'addB', pos: C, frame: 'dot', color: 0x0a0416, size: [0.1, 2.6 * cs], ease: 1, life: pullT, alpha: 0.7, fadeOut: 0.95 });
      // the whirl lies facing the screen, like the picture of a galaxy
      function swirl(a0, r0) {
        return function (p, dt, k) {
          var r = r0 * (1 - k * k * 0.97), an = a0 + k * 7 * (1.6 - r0 * 0.12), nx = C.x + Math.cos(an) * r, ny = C.y + Math.sin(an) * r * 0.55, nz = C.z - Math.sin(an) * r * 0.25;
          if (dt > 1e-4) { p.vx = (nx - p.x) / dt; p.vy = (ny - p.y) / dt; p.vz = (nz - p.z) / dt; }
          p.x = nx; p.y = ny; p.z = nz; return true;
        };
      }
      // light, dust and bits of the ground streak in from every edge of the screen
      for (var i = 0; i < N(120, c); i++) { var life = pullT * rr(0.4, 0.75); E({ pos: C, frame: pick(['streak', 'dot', 'flare']), color: pick(PAL), size: [rr(0.12, 0.22), 0.03], life: life, delay: rr(0, pullT - life), upd: swirl(rr(0, 6.283), rr(1.6, 6.5)), stretch: 0.05, fadeIn: 0.25 }); }
      for (var sl = 0; sl < N(36, c); sl++) { var an0 = rr(0, 6.283), R0 = rr(5.5, 7.5), from = V(C.x + Math.cos(an0) * R0, C.y + Math.sin(an0) * R0 * 0.55, C.z - Math.sin(an0) * R0 * 0.25), lf0 = rr(0.2, 0.3) / c.sp; E({ pos: from, vel: C.clone().sub(from).multiplyScalar(0.9 / lf0), frame: 'streak', color: pick(PAL), size: [rr(0.7, 1.3), 0.2], life: lf0, delay: rr(0, pullT - lf0), stretch: 0.05, alpha: 0.7, fadeIn: 0.3, fadeOut: 0.8 }); }
      for (var d = 0; d < N(30, c); d++) { var p0 = fieldPt(0.1), lf = pullT * rr(0.35, 0.6); E({ sys: 'norm', pos: p0, vel: V((C.x - p0.x) / lf, (C.y - 0.1) / lf, (C.z - p0.z) / lf), frame: pick(['shard', 'dot']), color: dustCol, size: [rr(0.1, 0.22), 0.03], life: lf, delay: rr(0, pullT - lf), spin: rr(-9, 9), fadeIn: 0.2, fadeOut: 0.8 }); }
      for (var k = 0; k < 5; k++) after(c.D(0.1 + k * 0.11), function () { vx.lightning(C.clone().add(rdir(0.4)), C.clone().add(rdir(1.8)), { w: 0.07, color: 0xd8a0ff, life: 0.14, branches: 1, segs: 8, amp: 0.25 }); sc.shake(0.04); });
      sc.light(C, c.col, 1.2, pullT);
      tick(function (dt) {
        t += dt;
        var kk = Math.min(1, t / pullT), close = 1 - kk * kk * 0.93;
        bhR = (0.15 + 0.85 * grown()) * 0.55 * cs * (1 + Math.sin(t * 30) * 0.02); bh.set(bhR, grown(), dt);
        // every monster on the field is caught, also the ones that walk in while the hole is open; they circle inward
        liveMobs().forEach(function (m) {
          var i2 = held.indexOf(m);
          if (i2 < 0) { held.push(m); spinA.push(Math.atan2(m.z - C.z, m.x - C.x)); rad0.push(Math.max(0.5, Math.sqrt((m.x - C.x) * (m.x - C.x) + (m.z - C.z) * (m.z - C.z)))); i2 = held.length - 1; }
          var an = spinA[i2] + t * 5.5, r = rad0[i2] * close + 0.18, tx = C.x + Math.cos(an) * r, tz = C.z + Math.sin(an) * r * 0.8, f = Math.min(1, dt * (m.boss ? 4 : 9));
          m.pull = tx; m.pullZ = tz; m.x += (tx - m.x) * f; m.z += (tz - m.z) * f;
          if (Math.random() < dt * 6 * c.n) { var q = sc.mobPos(m); E({ pos: q, vel: C.clone().sub(q).multiplyScalar(3), frame: 'streak', color: pick(PAL), size: [0.3, 0.05], life: 0.25, stretch: 0.08 }); }
        });
        if (Math.random() < dt * 20) sc.punch(0.006);
        sc.shake(dt * 0.5 * kk);
        if (t < pullT) return false;
        // collapse to a point…
        // the ball and its disk squeeze down to a point while space is pulled in harder…
        var t2 = 0, R0 = bhR, T_COL = c.D(0.09);
        tick(function (dt2) { t2 += dt2; var k2 = Math.min(1, t2 / T_COL); bh.set(R0 * (1 - k2 * 0.9), 1 - k2, dt2); bh.lens.k = 0.38 + 0.5 * k2; return k2 >= 1; });
        E({ pos: C, frame: 'ring', color: 0xc070ff, size: [5.5 * cs, 0.1], life: T_COL, ease: 3, alpha: 0.5 });
        E({ pos: C, frame: 'shock', color: c.col, size: [9, 0.2], life: T_COL, ease: 3, big: true });
        after(T_COL, function () {
          // …and everything comes back out at once: a shell of violet fire bursts out of the point and a ripple of bent
          // space runs out over the whole screen
          bh.ripple(15, 0.75, 0.07); bh.kill();
          P3.blast(C, { ball: true, y: C.y, size: 1.5 * cs, col: 0xb050f0, low: 0x22073e, hotness: 0.22, ringCol: c.col, ring: 4.5, chips: 0, crater: false, life: 0.85, keepAdd: true });
          sc.flash('rgba(200,140,255,0.45)', 0.35); sc.slowmo(0.45, 0.45, true); sc.shake(0.7); sc.punch(0.14);
          flare(C, 0xffffff, 1.4, 0.14, { white: true });
          E({ sys: 'col', pos: C, frame: 'shock', color: c.col, size: [1, 15], ease: 1, life: 0.6, alpha: 0.7, big: true, fadeOut: 0.3 });
          fieldWave(G, c.col, 0.8, 0xff6ad8); gGlow(G, c.col, 4.2, 0.6); scorch(G, 2.6, 2.6);
          for (var r = 0; r < N(10, c); r++) E({ pos: C, frame: 'streak', color: [0xffffff, pick(PAL)], size: [0.6, 7], ease: 1, life: rr(0.3, 0.5), rot: r / 10 * 3.1416 + rr(-0.1, 0.1), alpha: 0.5, fadeOut: 0.3 });
          sparks(C, PAL, N(70, c), 14, { size: 0.3, stretch: 0.14, life: 1.5 });
          embers(C, PAL, N(34, c), { speed: 7, up: 1.5, grav: 2 });
          for (var b = 0; b < N(24, c); b++) E({ sys: 'norm', pos: C.clone().add(rdir(0.3)), vel: V(rr(-8, 8), rr(2, 7), rr(-6, 6)), frame: 'shard', color: dustCol, size: [rr(0.12, 0.26), 0.05], life: rr(0.6, 1), grav: 10, spin: rr(-10, 10), white: true });
          // what was swallowed is thrown back as dark fire all over the field
          for (var v2 = 0; v2 < N(16, c); v2++) { var gq = fieldPt(0); E({ sys: 'col', pos: V(gq.x, 0.4, gq.z), vel: V(0, rr(1, 2.5), 0), frame: 'flame', color: [c.col, 0x3a1470], size: [0.3, rr(1.0, 1.6) * cs], ease: 1, life: rr(0.5, 0.9), delay: rr(0.05, 0.3), alpha: 0.8, fadeOut: 0.4 }); }
          smoke(V(C.x, 0.6, C.z), [0x3a2060, 0x140a24], N(8, c), { r: 1.2, size: 1.8, rise: 0.6, speed: 2, alpha: 0.5, life: 1.3 });
          sc.light(C, c.col, 2.8, 0.6);
          var all = liveMobs();
          held.concat(all).forEach(function (m) { m.pull = undefined; m.pullZ = undefined; });
          all.forEach(function (m) {
            var dx = m.x - C.x, dz = m.z - C.z, dl = Math.sqrt(dx * dx + dz * dz) || 1, q = sc.mobPos(m);
            flare(q, 0xffffff, 1.2 * cs, 0.14, { white: true }); E({ sys: 'col', pos: q, frame: 'star', color: [c.col, 0x3a1470], size: [0.3, 1.6 * cs], ease: 1, life: 0.22, spin: 8 });
            c.hit(m, 1, 2);
            if (m.alive && !m.boss) { m.pvx = dx / dl * 8; m.pvz = dz / dl * 6.5; }
          });
        });
        return true;
      });
    };
    // Element fusion. Five elements appear far apart at the edges of the screen, each in its own form — a ball of fire,
    // a knot of lightning, a crystal of ice, a star, a moon — and are drawn together, spiralling in to one point over the
    // field. They fuse into a ball of five colours that swells and shudders, throwing arcs at the ground. And then it
    // goes off: rings of every colour cross the whole screen, each element bursts out of the ground all over the
    // field, and every monster is hit as the blast reaches it.
    S.nova = function (c) {
      c.plain = true;
      sc.heroPose('raise', c.D(0.2), 0xffffff);
      sc.dim(0.6, c.D(1.3));
      var cs = Math.min(1.6, c.s), C = V(c.center.x * 0.4, 1.7, c.center.z * 0.4 - 0.5), G = V(C.x, 0.03, C.z), H = sc.heroCenter(), gatherT = c.D(0.5), fuseT = c.D(0.2);
      var FR5 = ['flame', 'dot', 'shard', 'star', 'crescent'];
      circle(V(H.x, 0, H.z), 0xffffff, 2.2, c.D(1.0), { spin: 2 });
      E({ sys: 'gadd', pos: G, frame: 'circle', color: 0xffe9ff, size: [0.5, 8 * cs], ease: 2, life: gatherT + fuseT, spin: -1.2, fadeOut: 0.85, alpha: 0.6 });
      ELC.forEach(function (col, i) {
        var a0 = i / 5 * 6.283 + 0.5, R = 5.4, P = V(C.x + Math.cos(a0) * R, C.y + Math.sin(a0) * 0.5, C.z + Math.sin(a0) * R * 0.7), t = 0, last = P.clone(), vel = V(), hold = c.D(0.1 + i * 0.012);
        // each one arrives with its own burst, so the five are seen apart before they move
        // fire and ice come as real 3D pieces (js/fx3d.js); the star is still its picture
        var solid = i === 0 || i === 2, pic = i === 0 ? P3.fireball({ size: 0.22 * cs }) : i === 2 ? P3.iceSpear({ size: 1.1 * cs }) : i === 3 ? picHead('starShot-star', 1.25 * cs, -0.72, 0.77, 0.273) : null;
        flare(P, 0xffffff, 1.6, 0.22, { white: true }); ring(P, col, 2.0, 0.3); ring(P, 0xffffff, 1.3, 0.22);
        for (var s = 0; s < N(10, c); s++) E({ sys: i === 2 ? 'norm' : 'add', pos: P, vel: rdir(3.5), frame: FR5[i], color: [0xffffff, col], size: [rr(0.16, 0.3), 0.03], life: rr(0.3, 0.5), spin: rr(-8, 8), drag: 2, white: i === 2 });
        var rib = vx.ribbon({ solid: true, mode: 'trail', w: 0.26 * cs, color: deep(col), core: 0.9, maxPts: 22, shrink: 44 }), rib2 = vx.ribbon({ mode: 'trail', w: 0.65 * cs, color: col, core: 0, alpha: 0.32, maxPts: 22, shrink: 44 });
        // no flat cards over a 3D piece (it has its own glow)
        var heads = solid ? [] : [E({ pos: P, frame: 'glow', color: col, size: 2.0 * cs, life: 30, upd: STAY, fadeOut: 1, hot: 1.3, alpha: 0.8 }), E({ pos: P, frame: 'ring', color: col, size: 1.2 * cs, life: 30, upd: STAY, fadeOut: 1, spin: 8, alpha: 0.7 })];
        if (!solid) heads.push(E({ sys: 'col', pos: P, frame: FR5[i], color: col, size: (pic ? 0.5 : 1.0) * cs, life: 30, upd: STAY, fadeOut: 1, spin: i === 4 ? 4 : 9 }), E({ pos: P, frame: 'flare', color: 0xffffff, size: 0.75 * cs, life: 30, upd: STAY, fadeOut: 1, white: true, spin: -6 }));
        tick(function (dt) {
          t += dt; var k = Math.min(1, Math.max(0, (t - hold) / (gatherT - hold))), e = k * k, r = R * (1 - e), a = a0 + e * 3.6;
          P.set(C.x + Math.cos(a) * r, C.y + Math.sin(a) * 0.5 * (1 - e), C.z + Math.sin(a) * r * 0.7);
          if (dt > 1e-4) vel.copy(P).sub(last).multiplyScalar(1 / dt); last.copy(P);
          heads.forEach(function (p) { if (p) { p.x = P.x; p.y = P.y; p.z = P.z; } });
          if (pic) pic.set(P, vel, dt); if (rib) rib.head(P); if (rib2) rib2.head(P);
          // its own element pours off it on the way
          for (var n2 = 0; n2 < 2; n2++) if (Math.random() < dt * (i === 0 ? 17 : 45) * c.n) {
            if (i === 0) trailFire(P, vel, 0.22 * cs, { size: 0.45 * cs, speed: 0.6, up: 0.6, life: 0.7 });
            else if (i === 1) vx.lightning(P.clone(), P.clone().add(rdir(1.1)), { w: 0.055, color: col, life: 0.1, branches: 0, segs: 5, amp: 0.3 });
            else E({ sys: i === 2 ? 'norm' : 'add', pos: P.clone().add(rdir(0.2)), vel: rdir(1.2).add(V(0, i === 2 ? -1 : 0.4, 0)), frame: i === 2 ? pick(['shard', 'snow']) : FR5[i], color: [0xffffff, col], size: [rr(0.16, 0.3), 0.03], life: rr(0.3, 0.6), spin: rr(-8, 8), grav: i === 2 ? 5 : 0, white: i === 2 });
          }
          if (k < 1) return false;
          heads.forEach(vx.kill); if (pic) pic.kill(); if (rib) rib.detach(); if (rib2) rib2.detach(); ring(C, col, 1.6 * cs, 0.2);
          return true;
        });
      });
      // the fusion: a ball of five colours that swells and shudders, the last light drawn into it, arcs leaping off it
      after(gatherT, function () {
        var t3 = 0, size = 0.3;
        function fz(mul) { return function (p) { p.s0 = p.s1 = size * mul; return true; }; }
        var ball = [E({ pos: C, frame: 'glow', color: [0xff9ad8, 0x8fd0ff, 0xffe08a], size: 0.1, life: 30, upd: fz(2.0), fadeOut: 1, alpha: 0.3 }), E({ pos: C, frame: 'dot', color: 0xffffff, size: 0.1, life: 30, upd: fz(0.36), fadeOut: 1, white: true }), E({ pos: C, frame: 'star', color: 0xffffff, size: 0.1, life: 30, upd: fz(1.1), fadeOut: 1, spin: 9, white: true, alpha: 0.8 })];
        // the five are still five inside it: five colours chasing each other round the white heart
        ELC.forEach(function (col, i) { ball.push(E({ pos: C, frame: 'dot', color: col, size: 0.1, life: 30, fadeOut: 1, hot: 1.2, upd: function (p) { var an = i * 1.2566 + t3 * 26; p.x = C.x + Math.cos(an) * size * 0.4; p.y = C.y + Math.sin(an) * size * 0.4; p.z = C.z + 0.02; p.s0 = p.s1 = size * 0.7; return true; } })); });
        ELC.forEach(function (col, i) { ball.push(E({ sys: 'col', pos: C, frame: 'crescent', color: col, size: 0.1, life: 30, upd: fz(1.9 + i * 0.12), fadeOut: 1, rot: i * 1.2566, spin: 12 + i * 2, alpha: 0.85 })); E({ pos: C, frame: 'ring', color: col, size: [(4.2 - i * 0.4) * cs, 0.3], life: fuseT, delay: i * fuseT * 0.1, alpha: 0.9 }); });
        converge(C, ELC.concat([0xffffff]), N(46, c), 3.4, fuseT);
        sc.flash('rgba(255,255,255,0.4)', 0.2);
        for (var k = 0; k < 5; k++) (function (k) { after(fuseT * k / 5, function () { var g = fieldPt(0.05); vx.lightning(C.clone(), g, { w: 0.07, color: ELC[k], life: 0.12, branches: 1, segs: 10, amp: 0.2 }); gRing(g, ELC[k], 1.2, 0.25); }); })(k);
        tick(function (dt) { t3 += dt; size = (0.5 + 1.1 * Math.min(1, t3 / fuseT)) * cs * (1 + Math.sin(t3 * 70) * 0.08); sc.shake(dt * 1.6); if (Math.random() < dt * 30) sc.punch(0.008); if (t3 < fuseT) return false; ball.forEach(vx.kill); return true; });
      });
      after(gatherT + fuseT, function () {
        sc.flash('rgba(255,255,255,1)', 0.9); sc.hitStop(0.1); sc.slowmo(0.35, 0.35); sc.shake(0.7); sc.punch(0.16);
        flare(C, 0xffffff, 2.2, 0.16, { white: true });
        // rings of every colour, one inside the other, crossing the whole screen
        ELC.concat([0xff6ad8]).forEach(function (col, j) {
          E({ sys: 'col', pos: C, frame: 'shock', color: col, size: [0.8, 9 + j * 2.4], ease: 1, life: 0.5 + j * 0.07, delay: j * 0.04, alpha: 0.85, big: true, fadeOut: 0.3 });
          E({ sys: 'gadd', pos: G, frame: 'shock', color: col, size: [0.6, 11.5], ease: 1, life: 0.55 + j * 0.08, delay: j * 0.05, rot: 0, alpha: 0.7 });
        });
        E({ pos: C, frame: 'ring', color: 0xffffff, size: [1, 13], ease: 1, life: 0.45, alpha: 0.45, big: true, fadeOut: 0.2, white: true });
        E({ sys: 'gadd', pos: G, frame: 'glow', color: [0xb68aff, 0x7bddff], size: [2, 5], life: 0.7, alpha: 0.35, fadeOut: 0.3 }); scorch(G, 2.4, 2.6);
        for (var r = 0; r < N(20, c); r++) E({ pos: C, frame: 'streak', color: [0xffffff, ELC[r % 5]], size: [0.7, 7], ease: 1, life: rr(0.35, 0.6), rot: r / 20 * 3.1416 + rr(-0.08, 0.08), alpha: 0.65, fadeOut: 0.3 });
        sparks(C, ELC.concat([0xffffff]), N(70, c), 14, { size: 0.32, stretch: 0.14, up: 1, life: 1.4 });
        // every element is thrown back out over the whole screen in its own form…
        ELC.forEach(function (col, i) {
          for (var k = 0; k < N(12, c); k++) E({ sys: i === 2 ? 'norm' : i % 2 ? 'col' : 'add', pos: C.clone().add(rdir(0.4)), vel: V(rr(-10, 10), rr(-1, 7), rr(-7, 7)), frame: i === 1 ? 'streak' : FR5[i], color: [0xffffff, col], size: [rr(0.22, 0.42) * cs, 0.05], life: rr(0.6, 1.1), grav: i === 2 ? 8 : 2.5, drag: 0.8, spin: rr(-10, 10), stretch: i === 1 ? 0.1 : 0, white: i === 2 });
        });
        // …and bursts up out of the ground all over the field as the blast passes: fire, lightning, ice, stars, moonlight
        var spots = []; for (var s = 0; s < 15; s++) { var g = fieldPt(0); spots.push({ g: g, d: Math.sqrt((g.x - G.x) * (g.x - G.x) + (g.z - G.z) * (g.z - G.z)) }); }
        spots.sort(function (x, y) { return x.d - y.d; }).forEach(function (sp, j) { after(sp.d / (20 * c.sp) + 0.02, function () { elemPop(c, sp.g, j % 5, 1.25); sc.shake(0.03); }); });
        fieldRain(c, 46, 0.5, { y: function () { return rr(1.5, 4.5); }, vel: function () { return V(rr(-0.5, 0.5), rr(-3, -1.2), 0); }, frames: ['star', 'flare', 'dot'], cols: [0xffffff, pick(ELC)], size: function () { return [rr(0.1, 0.2), 0]; }, life: 1.1 });
        sc.light(C, 0xffffff, 3, 0.7);
        // each monster is hit as the front arrives, by a different element
        var nth = 0;
        ringHits(c, G, 20, 10.5, function (m) {
          var q = sc.mobPos(m), kind = nth++ % 5, col = ELC[kind], dx = m.x - G.x, dz = m.z - G.z, dl = Math.sqrt(dx * dx + dz * dz) || 1;
          elemPop(c, gp(m), kind, 1.3 * (m.boss ? 1.4 : 1)); impact(q, col, 1.0);
          c.hit(m, 1, 2.4);
          if (m.alive && !m.boss) { m.pvx = dx / dl * 5; m.pvz = dz / dl * 4; }
        });
      });
    };

    // ---------- painted skill pictures (art/fx-*.webp) ----------
    // The pictures are parts of the spell, not stickers: some fly as the projectile (picHead) and turn to face where
    // they are going, some fall from the sky and stay stuck in the ground (picFall), and the rest play at the moment
    // of contact (picAt) with a motion that fits them. A glowing copy on top makes them read as light.
    // the laser, the sun, the black hole and the fusion are built from moving parts now, so no still picture is laid over them
    var PIC_MOVE = { magicClaw: 'slash', furBomb: 'burst', chainLightning: 'strike', iceStorm: 'rise', sparkRing: 'swirl' };
    var PIC_LIFE = { slash: 0.36, burst: 0.6, blast: 0.42, strike: 0.46, rise: 0.75, swirl: 0.8 };
    var picTex = {}, pics = [], picHeads = [];
    function picLoad(id) {
      if (picTex[id] !== undefined) return picTex[id];
      picTex[id] = null;
      new T.TextureLoader().load((CW.ART_BASE || 'art/') + 'fx-' + id + '.webp', function (t) { if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; picTex[id] = t; }, undefined, function () { });
      return null;
    }
    ['fireball-ball', 'fireball-blast', 'starShot-star', 'starShot-burst', 'meteorRain-rock', 'meteorRain-ripple', 'iceStorm-shard', 'iceStorm', 'chainLightning'].forEach(picLoad);
    function picSprite(tex, add, cx, cy) {
      var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, opacity: 0, blending: add ? T.AdditiveBlending : T.NormalBlending }));
      sp.center.set(cx === undefined ? 0.5 : cx, cy === undefined ? 0.14 : cy); sp.renderOrder = add ? 41 : 40; (sc.fxGroup || sc.scene).add(sp); return sp;
    }
    // too many pictures on screen: the one furthest through its life makes room for the new one (a fresh spell never vanishes)
    function picRoom() { if (pics.length < 30) return; var bi = 0, bk = -1; for (var i = 0; i < pics.length; i++) { var k = pics[i].t / pics[i].life; if (k > bk) { bk = k; bi = i; } } var q = pics[bi]; if (q.onLand && !q.landed) { q.landed = true; q.onLand(); } picDrop(q); pics.splice(bi, 1); }
    // the sprite materials are not disposed: disposing the last one deletes the compiled sprite program, and rebuilding it
    // on the next picture stalls the frame (they are small and collected by the browser)
    // the painted pictures' sprite program is built before the first picture needs it, once for each kind of fog (the
    // program depends on it); a 1-pixel stand-in with the same colour encoding as the loaded pictures is enough
    var picWarmed, picDummy;   // (no starting value: warmPics() already runs at the top of createFx)
    function warmPics() {
      var f = sc.scene.fog, sig = f ? (f.isFogExp2 ? 'exp2' : 'linear') : 'none';
      picWarmed = picWarmed || {}; if (picWarmed[sig] || !sc.renderer || !sc.renderer.compile) return; picWarmed[sig] = true;
      if (!picDummy) { picDummy = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); if (T.sRGBEncoding) picDummy.encoding = T.sRGBEncoding; picDummy.needsUpdate = true; }
      var sp = picSprite(picDummy, false); sp.position.set(0, -40, 0); sc.renderer.compile(sc.scene, sc.camera); if (sp.parent) sp.parent.remove(sp);
    }
    function picDrop(p) { [p.a, p.g].forEach(function (sp) { if (sp.parent) sp.parent.remove(sp); }); p.dead = true; }
    // a picture that rides a projectile: call set(pos, vel, dt) every frame, kill() when it lands
    function picHead(name, h, artAng, cx, cy) {
      var tex = picLoad(name); if (!tex || !tex.image || picHeads.length >= 20) return null;
      var p = { name: name, a: picSprite(tex, false, cx, cy), g: picSprite(tex, true, cx, cy) }, w = h * tex.image.width / tex.image.height, t = 0, pa = V(), pb = V();
      picHeads.push(p);
      return {
        set: function (pos, vel, dt) {
          if (p.dead) return; t += dt;
          pa.copy(pos).project(sc.camera); pb.copy(pos).addScaledVector(vel, 0.03).project(sc.camera);
          var dx = (pb.x - pa.x) * (sc.camera.aspect || 1), dy = pb.y - pa.y;
          if (dx * dx + dy * dy > 1e-10) { var r = Math.atan2(dy, dx) - artAng; p.a.material.rotation = r; p.g.material.rotation = r; }
          var fl = (1 + 0.07 * Math.sin(t * 46) + 0.04 * Math.sin(t * 71)) * Math.min(1, 0.35 + t / 0.07);
          p.a.position.copy(pos); p.g.position.copy(pos); p.a.scale.set(w * fl, h * fl, 1); p.g.scale.set(w * fl * 1.1, h * fl * 1.1, 1);
          p.a.material.opacity = 1; p.g.material.opacity = 0.42 + 0.2 * Math.sin(t * 60);
        },
        kill: function () { if (p.dead) return; picDrop(p); var i = picHeads.indexOf(p); if (i >= 0) picHeads.splice(i, 1); }
      };
    }
    // a picture that plays on the spot (ground point or monster)
    function picAt(name, at, h, move, cy) {
      var tex = picLoad(name); if (!tex || !tex.image) return; picRoom();
      var p = { a: picSprite(tex, false, 0.5, cy), g: picSprite(tex, true, 0.5, cy), t: 0, life: PIC_LIFE[move] || 0.6, h: h, w: h * tex.image.width / tex.image.height, x: at.x, y: 0.04, z: at.z + 0.25, move: move, seed: Math.random() * 6.28 };
      pics.push(p); picPose(p);
    }
    // a picture that drops out of the sky, sticks where it lands for a moment, then sinks away
    function picFall(name, land, h, time, hold, onLand) {
      var tex = picLoad(name); if (!tex || !tex.image) { if (onLand) onLand(); return; } picRoom();
      var p = { a: picSprite(tex, false, 0.5, 0.06), g: picSprite(tex, true, 0.5, 0.06), t: 0, life: time + hold, fallT: time, h: h, w: h * tex.image.width / tex.image.height, x: land.x, y: 0.02, z: land.z + 0.1, move: 'fall', seed: Math.random() * 6.28, side: rr(0.9, 2.2), tilt: rr(-0.14, 0.14), onLand: onLand };
      pics.push(p); picPose(p);
    }
    function ease3(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
    function picPose(p) {
      var k = p.t / p.life, sx = 1, sy = 1, ox = 0, oy = 0, rot = 0, op = k < 0.62 ? Math.min(1, k * 14) : Math.max(0, 1 - (k - 0.62) / 0.38), glow = Math.max(0, 0.7 - k * 2.6);
      if (p.move === 'fall') {
        // comes down fast and slanted, stretched by its speed; bites into the ground with a wobble; sinks as it melts
        var f = Math.min(1, p.t / p.fallT), fall = 1 - f * f;
        if (f < 1) { ox = fall * p.side; oy = fall * 6.5; sy = 1.35; sx = 0.85; rot = p.tilt - p.side * 0.13; op = Math.min(1, f * 6); glow = 0.5; }
        else {
          if (!p.landed) { p.landed = true; if (p.onLand) p.onLand(); }
          var q = (p.t - p.fallT) / (p.life - p.fallT), wob = Math.exp(-q * 9) * Math.sin(q * 38);
          rot = p.tilt * (1 + wob * 0.9); sy = 1 - 0.1 * Math.exp(-q * 14); oy = -p.h * (0.16 + (q > 0.65 ? (q - 0.65) / 0.35 * 0.5 : 0));
          op = q > 0.65 ? 1 - (q - 0.65) / 0.35 : 1; glow = Math.max(0, 0.8 - q * 5);
        }
      } else if (p.move === 'slash') {
        // the claw marks sweep across in one fast stroke and keep sliding a little as they fade
        var s = ease3(k / 0.28); sx = 0.2 + 0.8 * s; sy = 0.9 + 0.1 * s; rot = (1 - s) * -0.45; ox = (-0.35 + 0.35 * s + k * 0.18) * p.w; op = k < 0.45 ? Math.min(1, k * 20) : Math.max(0, 1 - (k - 0.45) / 0.55); glow = Math.max(0, 0.8 - k * 3);
      } else if (p.move === 'burst') {
        // puffs out past its size, drops back, then keeps swelling slowly while it thins out
        var u = k < 0.16 ? 0.25 + 0.93 * ease3(k / 0.16) : k < 0.32 ? 1.18 - 0.18 * (k - 0.16) / 0.16 : 1 + 0.1 * (k - 0.32) / 0.68;
        sx = sy = u; glow = Math.max(0, 0.95 - k * 3.2);
      } else if (p.move === 'blast') {
        // a ground blast: shoots out sideways first, jumps up, then flattens out as it fades
        var e = ease3(k / 0.14); sx = 0.3 + 0.95 * e - 0.18 * Math.max(0, Math.min(1, (k - 0.14) / 0.2)) + 0.18 * k; sy = 0.4 + 1.0 * e - 0.4 * Math.max(0, Math.min(1, (k - 0.14) / 0.3));
        op = k < 0.45 ? Math.min(1, k * 20) : Math.max(0, 1 - (k - 0.45) / 0.55); glow = Math.max(0, 1 - k * 3);
      } else if (p.move === 'rise') {
        // grows up out of the ground, overshoots a touch, and sinks back as it fades
        var r = ease3(k / 0.22); sy = k < 0.22 ? 0.06 + 1.06 * r : k < 0.36 ? 1.12 - 0.12 * (k - 0.22) / 0.14 : 1 - 0.12 * Math.max(0, (k - 0.7) / 0.3); sx = 0.78 + 0.22 * r;
        glow = Math.max(0, 0.75 - k * 2.4);
      } else if (p.move === 'strike') {
        // slams down from above all at once, goes dark for an instant, flashes again, then burns out
        sy = 1.5 - 0.5 * ease3(k / 0.1); sx = 0.85 + 0.15 * ease3(k / 0.1);
        var fl = k < 0.16 ? 1 : k < 0.24 ? 0.15 : k < 0.42 ? (Math.sin(k * 90 + p.seed) > -0.4 ? 1 : 0.4) : 1; op *= fl; glow = (k < 0.45 ? 0.9 : 0) * fl;
      } else {
        // rings and holes: open up, turn and breathe, then close in on themselves
        var o = ease3(k / 0.25), close = k > 0.7 ? 1 - 0.3 * (k - 0.7) / 0.3 : 1;
        sx = sy = (0.45 + 0.55 * o) * close * (1 + 0.035 * Math.sin(k * 24 + p.seed)); rot = Math.sin(k * 9 + p.seed) * 0.07 + (1 - o) * 0.5; glow = 0.28 + 0.2 * Math.sin(k * 24 + p.seed); if (k > 0.62) glow *= op;
      }
      p.a.position.set(p.x + ox, p.y + oy, p.z); p.g.position.set(p.x + ox, p.y + oy, p.z + 0.01);
      p.a.scale.set(p.w * sx, p.h * sy, 1); p.g.scale.set(p.w * sx * 1.06, p.h * sy * 1.06, 1);
      p.a.material.rotation = rot; p.g.material.rotation = rot;
      p.a.material.opacity = Math.max(0, op); p.g.material.opacity = Math.max(0, Math.min(1, glow)) * Math.min(1, Math.max(0, op) + 0.3);
    }
    // the picture for a spell that has no flying part: plays where it lands, with a matching jolt
    function picture(c, at, big) {
      var id = c.sk.id, move = PIC_MOVE[id]; if (!move) return;
      var h = (big ? 2.7 : 1.75) * Math.min(1.3, c.s) * (move === 'strike' ? 1.7 : 1);
      picAt(id, at, h, move);
      if (move === 'burst') heavy(big ? 1 : 0.5); else if (move === 'slash') { sc.hitStop(0.03); sc.shake(0.05); } else if (move === 'strike') sc.shake(0.06);
    }
    function picTick(dt) {
      for (var i = pics.length - 1; i >= 0; i--) {
        var p = pics[i]; p.t += dt;
        if (p.t >= p.life) { picDrop(p); pics.splice(i, 1); continue; }
        picPose(p);
      }
    }
    function picClear() { pics.forEach(picDrop); pics.length = 0; picHeads.forEach(picDrop); picHeads.length = 0; }
    // the rest of the skills live in js/fx-more.js and are built from the same parts
    if (CW.fxMore) CW.fxMore({ T: T, sc: sc, vx: vx, V: V, rr: rr, rdir: rdir, pick: pick, STAY: STAY, sway: sway, deep: deep, E: E, N: N, after: after, tick: tick, FC: FC, UPC: UPC, above: above,
      fieldPt: fieldPt, fieldPops: fieldPops, fieldWave: fieldWave, fieldRain: fieldRain, flare: flare, glow: glow, sparks: sparks, embers: embers, smoke: smoke, fire: fire, trailFire: trailFire, shock: shock, ring: ring, gRing: gRing, gGlow: gGlow,
      scorch: scorch, dust: dust, circle: circle, seal: seal, converge: converge, impact: impact, muzzle: muzzle, heavy: heavy, homing: homing, explosion: explosion, spiralTo: spiralTo, spiralIn: spiralIn,
      P3: P3, liveMobs: liveMobs, gp: gp, near: near, share: share, volley: volley, ringHits: ringHits, passHits: passHits, skyBolt: skyBolt, zapHit: zapHit, beamOf: beamOf, picHead: picHead, picAt: picAt, picFall: picFall,
      dustCol: function () { return dustCol; } }, S);
    var epoch = 0;
    function tint(base, tier) { var col = new T.Color(base); if (tier >= 5) col.lerp(new T.Color(0xffffff), 0.12); return col.getHex(); }
    function cast(skill, tier, targets, hit, speedMul, lv) {
      var sp = speedMul || 1; lv = lv || 0;
      var c = { sk: skill, noCircle: !!NO_CIRCLE[skill.id], tier: tier, lv: lv, col: tint(skill.color, tier), s: 1.12 * (1 + 0.08 * (tier - 1)) * (1 + 0.018 * lv), n: Math.min(2.4, 1 + 0.1 * (tier - 1) + 0.025 * lv), sp: sp,
        D: function (t) { return t / sp; }, deep: deep(tint(skill.color, tier)), from: sc.heroPaw(), targets: targets.slice(), hit: hit || function () { } };
      c.center = crowdCenter(c.targets);
      c.epoch = epoch;
      // the monsters this cast may hit right now: wide spells take whoever is on the field at that moment
      c.pool = function () {
        if (skill.targets >= 99) return liveMobs();
        var a = c.targets.filter(function (m) { return m.alive; });
        return a.length ? a : liveMobs().slice(0, skill.targets);
      };
      // monsters standing next to the one that was hit take a share (skill.splash) of the damage
      // (part: when the skill lands in several hits, the share of the whole that this hit carries)
      c.splash = function (mob, radius, power, part) {
        if (!skill.splash || !mob) return;
        var x = mob.x, z = mob.z;
        liveMobs().forEach(function (m) { if (m !== mob && (m.x - x) * (m.x - x) + (m.z - z) * (m.z - z) < radius * radius) c.hit(m, skill.splash * (part || 1), power || 0.8); });
      };
      var hitFn = c.hit, decorated = [], released = false;
      c.hit = function (mob, frac, power) {
        if (c.epoch !== epoch) return;   // the field was cleared in the meantime (a boss arrived, the stage changed)
        // a shot whose monster has already fallen lands on the nearest one still standing instead of being wasted
        if (!mob || !mob.alive) { mob = near(liveMobs(), mob ? mob.x : c.center.x, mob ? mob.z : c.center.z, 2.6); if (!mob) return; }
        // Decorate at the existing contact time; retain every damage fraction and argument.
        if (!c.plain && decorated.indexOf(mob) < 0 && decorated.length < 3) {
          // wide spells get one big picture over the crowd; the others get one on each monster they land on
          if (c.sk.targets >= 99) { if (!released) picture(c, c.center, true); } else picture(c, mob, false);
          spellContact(c, mob, power, !released); decorated.push(mob); released = true;
        }
        hitFn(mob, frac, power);
      };
      if (PIC_MOVE[skill.id]) picLoad(skill.id);   // only the skills that still lay a painted picture on the hit
      spellCharge(c);
      var H = sc.heroCenter();
      // casting circle: two rune rings under the feet, sparks rising, a coloured seal at the paw
      if (!c.noCircle) E({ sys: 'gadd', pos: V(H.x, 0.045, H.z), frame: 'circle', color: c.col, size: [0.3, 1.2 + 0.03 * lv], ease: 2, life: c.D(0.55), spin: 3, fadeIn: 0.1, fadeOut: 0.5, alpha: 0.95 });
      E({ sys: 'gadd', pos: V(H.x, 0.05, H.z), frame: 'ring', color: 0xffffff, size: [0.3, 1.1], ease: 1, life: c.D(0.35), alpha: 0.6 });
      for (var q = 0; q < N(8, c); q++) { var qa = rr(0, 6.28); E({ pos: V(H.x + Math.cos(qa) * 0.6, 0.1, H.z + Math.sin(qa) * 0.45), vel: V(0, rr(1.6, 2.8), 0), frame: pick(['star', 'dot']), color: [0xffffff, c.col], size: [0.1, 0], life: rr(0.35, 0.6), drag: 0.6, spin: 6 }); }
      if (!c.noCircle) seal(c.from.clone().add(V(0, 0, 0.1)), c.col, 0.55 * c.s, c.D(0.3));
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
      costumeTick(dt); picTick(dt);
      for (var i = timers.length - 1; i >= 0; i--) { var tm = timers[i]; if (tm && tm.at <= time) { timers.splice(i, 1); tm.fn(); } }
      // a hit inside one of these can end the stage, which empties the list while it is being walked
      for (var j = ticks.length - 1; j >= 0; j--) { var fn = ticks[j]; if (fn && fn(dt)) { var at = ticks.indexOf(fn); if (at >= 0) ticks.splice(at, 1); } }
      // idle sparkle on the staff and crackles on shocked monsters
      idleT += dt; crackleT += dt;
      if (idleT > 0.35) { idleT = 0; var tp = sc.heroTip(); E({ pos: tp.clone().add(rdir(0.08)), vel: V(rr(-0.2, 0.2), rr(0.3, 0.7), 0), frame: 'flare', color: [0xffffff, staffCol], size: [0.13, 0], life: 0.6, spin: 3, drag: 0.5, white: true }); }
      if (crackleT > 0.22) {
        crackleT = 0;
        sc.mobs().forEach(function (m) { if (m.shocked > 0 && Math.random() < 0.7) { var q = sc.mobPos(m); vx.lightning(q.clone().add(rdir(0.4)), q.clone().add(rdir(0.4)), { w: 0.035, color: 0x9fd8ff, life: 0.09, branches: 0, segs: 5, amp: 0.3 }); } });
      }
      vx.update(dt); P3.update(dt);
    }
    function setQuality(q) { vx.setQuality(q); }
    function setBright(v) { vx.setBright(v); P3.setBright(v); }
    function setRegion(regionData) { dustCol = new T.Color(regionData.ground).lerp(new T.Color(0xffffff), 0.45).getHex(); P3.warm(); warmPics(); }
    function clear() { epoch++; timers.length = 0; ticks.length = 0; vx.clear(); P3.clear(); picClear(); sc.mobs().forEach(function (m) { m.pull = undefined; m.pullZ = undefined; m.lift = undefined; }); }
    return { setStaffColor: function (c) { staffCol = c; }, setCostume: function (f) { cosFx = f; cosAcc = 0; }, cast: cast, update: update, setQuality: setQuality, setBright: setBright, setRegion: setRegion, clear: clear, count: vx.count,
      impact: impact, levelUp: levelUp, bossEnter: bossEnter, coinPop: coinPop, burst: function (pos, col) { impact(pos, col, 0.8); }, vfx: vx,
      // for checks: 3D parts alive, and painted heads alive (only those of the given pictures when names are given)
      count3d: function () { return P3.count(); }, spikeTops: function () { return P3.spikeTops(); }, batchSmoke: function (v) { P3.setBatchSmoke(v); }, smoke3d: function () { return P3.smoke(); }, batchChips: function (v) { P3.setBatchChips(v); }, watch: function (fn) { watcher = fn || null; }, picCount: function (names) { return picHeads.filter(function (h) { return !names || names.indexOf(h.name) >= 0; }).length; } };
  }
  CW.createFx = createFx;
})(this);
