// Small fry (2026-11-16, user: "more monsters would feel better, but the phone must not stutter"): little copies of the
// region's monsters that mill around the fight and burst in crowds when a spell lands near them.
// They are kept cheap on purpose:
//  - one stiff picture each (no puppet bones, a shared shader per kind of monster), shadows drawn as one instanced mesh;
//  - no damage numbers, no rewards, and one shared burst (fx.minionBurst) for every one a hit kills;
//  - they never take a spell's target and never count toward a stage, so hunting speed and pay stay exactly as they were.
// main.js says how many it wants (CW.minionCap) and which pictures to use; scene.js moves and draws them.
(function (root) {
  var CW = root.CW = root.CW || {};

  // how many at once, by drawing quality; fewer on a phone. 'cw-minions' in storage (a number, 0 = none) overrides it
  // for measuring on the phone; CW.minionsOff switches them off
  var CAPS = { pc: { high: 30, mid: 22, low: 12, lowest: 0 }, phone: { high: 20, mid: 14, low: 8, lowest: 0 } };
  function minionCap(quality, phone, store) {
    var t = phone ? CAPS.phone : CAPS.pc, n = t[quality];
    if (n === undefined) n = t.mid;
    try {
      var s = store === undefined ? root.localStorage : store, o = s && s.getItem('cw-minions');
      if (o !== null && o !== undefined && o !== '' && isFinite(+o)) n = Math.max(0, Math.min(60, Math.round(+o)));
    } catch (e) { }
    if (CW.minionsOff) n = 0;
    return n;
  }
  // the user's own small-fry pictures (2026-11-16, user: "기존 몬스터는 안 나와도 되고 지금 준 졸개들로, 막 섞어서 랜덤으로"):
  // every region uses all six, each spawn one picked at random. art/mn01..06.webp come from tools/cut-minions.py.
  // fly: floats above the ground and bobs instead of hopping (the ghost and the bat)
  var KINDS = [
    { id: 'mn01', name: '얼음 꼬마' }, { id: 'mn02', name: '꼬마 유령', fly: true }, { id: 'mn03', name: '불꽃 꼬마' },
    { id: 'mn04', name: '꼬마 박쥐', fly: true }, { id: 'mn05', name: '꼬마 해골' }, { id: 'mn06', name: '꼬마 멧돼지' }
  ];
  // one of the loaded kinds at random (rand() in 0..1); null while none is loaded yet
  function pickKind(loaded, rand) {
    var ok = KINDS.filter(function (k) { return loaded[k.id]; });
    if (!ok.length) return null;
    return ok[Math.min(ok.length - 1, Math.floor((rand || Math.random)() * ok.length))];
  }
  // inside the hit's reach? (the field is seen at a slant, so depth counts a little less)
  function inReach(mx, mz, x, z, r) { var dx = mx - x, dz = (mz - z) / 1.15; return dx * dx + dz * dz <= r * r; }

  function createMinions(ctx) {
    var T = ctx.T, MAX = 64, list = [], dying = [], pool = [], mats = {}, want = 0, pick = null, packT = 0.6, queue = 0, edge = 1;
    var VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
    var FS = 'uniform sampler2D map; uniform vec3 uTint; varying vec2 vUv;' +
      'void main() { vec4 t = texture2D(map, vUv); if (t.a < 0.06) discard; gl_FragColor = vec4(t.rgb * uTint, t.a); }';
    var GEO = new T.PlaneGeometry(1, 1); GEO.translate(0, 0.5, 0);
    // all the shadows in one draw
    var sGeo = new T.CircleGeometry(0.5, 14); sGeo.rotateX(-Math.PI / 2);
    var shadows = new T.InstancedMesh(sGeo, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }), MAX);
    shadows.renderOrder = 1; shadows.count = 0; shadows.frustumCulled = false; ctx.group.add(shadows);
    var SM = new T.Matrix4();
    function rr(a, b) { return a + Math.random() * (b - a); }
    function matFor(art) {
      var k = art.id || art.tex.uuid;
      return mats[k] || (mats[k] = new T.ShaderMaterial({ uniforms: { map: { value: art.tex }, uTint: { value: new T.Color(0xffffff) } },
        vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: true, side: T.DoubleSide }));
    }
    function meshFor(art) {
      var m = pool.pop() || new T.Mesh(GEO);
      m.material = matFor(art); m.rotation.set(-ctx.tilt, 0, 0); m.renderOrder = 3; m.visible = true;
      if (!m.parent) ctx.group.add(m);
      return m;
    }
    function free(m) { m.visible = false; pool.push(m); }
    // somewhere to be: mostly beside one of the real monsters (that is where the spells land), else around the wizard
    function spot(m) {
      var H = ctx.hero(), mobs = ctx.mobs(), best = null;
      for (var tries = 0; tries < 4; tries++) {
        var p, near = mobs.length && Math.random() < 0.7 ? mobs[Math.floor(Math.random() * mobs.length)] : null;
        if (near) { var a = rr(0, Math.PI * 2), r = rr(0.55, 1.35); p = { x: near.x + Math.cos(a) * r, z: near.z + Math.sin(a) * r * 1.15 }; }
        else { var b = rr(0, Math.PI * 2), q = rr(1.4, 3.3); p = { x: H.x + Math.cos(b) * q, z: H.z + Math.sin(b) * q * 1.15 }; }
        p = ctx.clampField(p);
        var ok = Math.hypot(p.x - H.x, (p.z - H.z) / 1.15) > 1.05;
        for (var i = 0; ok && i < mobs.length; i++) if (Math.hypot(mobs[i].x - p.x, mobs[i].z - p.z) < 0.5) ok = false;
        best = p; if (ok) break;
      }
      m.tx = best.x; m.tz = best.z; m.retarget = rr(1.0, 2.4);
    }
    function spawn(art, h, fly) {
      if (list.length >= MAX) return;
      var aspect = art.aspect || 1, F = ctx.field, z = rr(F.z0 + 1, F.z1 - 0.8), side = edge;
      var m = { mesh: meshFor(art), h: h, w: h * aspect, fly: !!fly, x: side * (ctx.halfX(z) + rr(0.9, 1.8)), z: z, y: 0, vy: 0, face: -side, faceHold: 0,
        ph: rr(0, 6), sp: rr(2.6, 3.4), state: 'in', retarget: 0, tx: 0, tz: 0 };
      spot(m);
      list.push(m);
    }
    function setWant(n, picker) { want = Math.max(0, Math.min(MAX, n | 0)); pick = picker || pick; }
    // a spell landed at (x, z): every little one within r is knocked away; returns how many and where they were
    function hitArea(x, z, r) {
      var n = 0, sx = 0, sz = 0;
      for (var i = list.length - 1; i >= 0; i--) {
        var m = list[i]; if (m.state === 'in' && Math.abs(m.x) > ctx.halfX(m.z) + 0.2) continue;   // still off screen
        if (!inReach(m.x, m.z, x, z, r)) continue;
        list.splice(i, 1); n++; sx += m.x; sz += m.z;
        var dx = m.x - x, dz = m.z - z, dl = Math.sqrt(dx * dx + dz * dz) || 1, push = rr(2.2, 3.6);
        dying.push({ mesh: m.mesh, h: m.h, w: m.w, x: m.x, y: m.y, z: m.z, face: m.face, vx: dx / dl * push + rr(-0.4, 0.4), vz: dz / dl * push * 0.5, vy: rr(3.2, 5.2), spin: (dx > 0 ? -1 : 1) * rr(7, 13), t: 0, life: rr(0.45, 0.6) });
      }
      return { n: n, x: n ? sx / n : x, z: n ? sz / n : z };
    }
    // the boss arrives: the little ones run off the screen
    function flee(m) { m.state = 'flee'; m.sp = rr(4, 5.5); m.tx = (m.x >= 0 ? 1 : -1) * (ctx.halfX(m.z) + 3); m.tz = m.z; }
    function scatter() { list.forEach(flee); queue = 0; }
    function clear() { list.concat(dying).forEach(function (m) { free(m.mesh); }); list.length = 0; dying.length = 0; queue = 0; shadows.count = 0; }
    function update(dt) {
      // fill up in small packs, each from one side, when the field has thinned out
      packT -= dt;
      var staying = 0; list.forEach(function (x) { if (x.state !== 'flee') staying++; });
      if (queue <= 0 && pick && want > 0 && staying <= want * 0.8 && packT <= 0) { queue = Math.min(want - staying, 4 + Math.floor(Math.random() * 4)); edge = Math.random() < 0.5 ? -1 : 1; packT = 0; }
      if (queue > 0 && packT <= 0) { var a = pick && pick(); if (a) spawn(a.art, a.height, a.fly); queue--; packT = queue > 0 ? rr(0.04, 0.09) : rr(0.25, 0.6); }
      // fewer wanted now (the quality dropped, a boss, a dungeon): the extra ones walk off one at a time
      if (staying > want) for (var e = 0; e < list.length; e++) if (list[e].state !== 'flee') { flee(list[e]); break; }
      var si = 0;
      for (var i = list.length - 1; i >= 0; i--) {
        var m = list[i];
        m.retarget -= dt; if (m.state === 'mill' && m.retarget <= 0) spot(m);
        var dx = m.tx - m.x, dz = m.tz - m.z, d = Math.sqrt(dx * dx + dz * dz), moving = d > 0.06;
        if (moving) {
          var step = Math.min(d, m.sp * (m.state === 'mill' ? 0.55 : 1) * dt); m.x += dx / d * step; m.z += dz / d * step; m.ph += dt * 13;
          if (Math.abs(dx) > 0.05) { var f = dx > 0 ? 1 : -1; m.faceHold -= dt; if (f !== m.face && m.faceHold <= 0) { m.face = f; m.faceHold = 0.3; } }
        } else if (m.state === 'in') m.state = 'mill';
        if (m.state === 'flee' && !moving) { free(m.mesh); list.splice(i, 1); continue; }
        var hop = moving ? Math.abs(Math.sin(m.ph)) * 0.11 : 0, sq = moving ? Math.cos(m.ph * 2) * 0.06 : Math.sin(m.ph * 0.4 + m.retarget) * 0.03;
        if (!moving) m.ph += dt * 2;
        // fliers float a little above the ground and bob softly; their shadow stays on the ground, a bit smaller
        if (m.fly) { hop = 0.32 + Math.sin(m.ph * 0.35) * 0.07; sq *= 0.5; m.y = hop; }
        m.mesh.position.set(m.x, hop, m.z); m.mesh.rotation.z = moving ? Math.sin(m.ph) * 0.08 : 0;
        m.mesh.scale.set(m.w * m.face * (1 - sq * 0.5), m.h * (1 + sq), 1);
        if (si < MAX) { var s = m.w * 0.6 * (1 - hop); SM.makeScale(s, 1, s * 0.55); SM.setPosition(m.x, 0.011, m.z); shadows.setMatrixAt(si++, SM); }
      }
      for (var j = dying.length - 1; j >= 0; j--) {
        var q = dying[j]; q.t += dt; var k = q.t / q.life;
        q.vy -= 16 * dt; q.x += q.vx * dt; q.z += q.vz * dt; q.y = Math.max(0, q.y + q.vy * dt);
        var sc = Math.max(0.01, 1 - k * k);
        q.mesh.position.set(q.x, q.y, q.z); q.mesh.rotation.z += q.spin * dt; q.mesh.scale.set(q.w * q.face * sc, q.h * sc, 1);
        if (k >= 1) { free(q.mesh); dying.splice(j, 1); }
      }
      shadows.count = si; shadows.instanceMatrix.needsUpdate = true;
    }
    return { setWant: setWant, update: update, hitArea: hitArea, scatter: scatter, clear: clear, count: function () { return list.length; }, list: function () { return list; } };
  }
  CW.minionCap = minionCap; CW.createMinions = createMinions; CW.minionInReach = inReach; CW.MINION_KINDS = KINDS; CW.pickMinionKind = pickKind;
  if (typeof module !== 'undefined' && module.exports) module.exports = { minionCap: minionCap, createMinions: createMinions, inReach: inReach, KINDS: KINDS, pickKind: pickKind };
})(this);
