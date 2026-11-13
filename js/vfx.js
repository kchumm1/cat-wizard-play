// Batched effect renderer: instanced particles (one draw call per layer) and camera-facing ribbons.
(function (root) {
  var CW = root.CW = root.CW || {};
  var T = root.THREE;
  var FR = { glow: 0, flare: 1, star: 2, streak: 3, smoke: 4, flame: 5, ring: 6, shock: 7, snow: 8, shard: 9, circle: 10, crescent: 11, fluff: 12, paw: 13, dot: 14, frost: 15 };
  CW.FRAMES = FR;

  // ---------- one 4x4 texture atlas, drawn once ----------
  function buildAtlas() {
    var S = 256, H = S / 2, c = document.createElement('canvas'); c.width = c.height = S * 4;
    var g = c.getContext('2d'), W = 'rgba(255,255,255,';
    function cell(i, fn) { g.save(); g.translate((i % 4) * S + H, Math.floor(i / 4) * S + H); g.beginPath(); g.rect(-H + 2, -H + 2, S - 4, S - 4); g.clip(); fn(); g.restore(); }
    function radial(r, stops) { var gr = g.createRadialGradient(0, 0, 0, 0, 0, r); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); return gr; }
    function rnd(seed) { var a = seed; return function () { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }
    function ray(len, w, ang) {
      g.save(); g.rotate(ang); var gr = g.createLinearGradient(-len, 0, len, 0);
      gr.addColorStop(0, W + '0)'); gr.addColorStop(0.5, W + '1)'); gr.addColorStop(1, W + '0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.closePath(); g.fill(); g.restore();
    }
    function blobs(seed, n, spread, rMin, rMax, alpha, biasY) {
      var R = rnd(seed);
      for (var i = 0; i < n; i++) {
        var a = R() * 6.283, d = Math.sqrt(R()) * spread, x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9 + (biasY || 0) * (R() - 0.3);
        var r = rMin + R() * (rMax - rMin), gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, W + alpha + ')'); gr.addColorStop(1, W + '0)'); g.fillStyle = gr; g.fillRect(-H, -H, S, S);
      }
    }
    function mask(inner) { g.globalCompositeOperation = 'destination-in'; g.fillStyle = radial(H * 0.98, [[0, W + '1)'], [inner, W + '1)'], [1, W + '0)']]); g.fillRect(-H, -H, S, S); g.globalCompositeOperation = 'source-over'; }
    cell(FR.glow, function () { g.fillStyle = radial(H, [[0, W + '1)'], [0.1, W + '0.9)'], [0.28, W + '0.45)'], [0.55, W + '0.14)'], [1, W + '0)']]); g.fillRect(-H, -H, S, S); });
    cell(FR.flare, function () {
      g.fillStyle = radial(H * 0.5, [[0, W + '1)'], [0.25, W + '0.7)'], [1, W + '0)']]); g.fillRect(-H, -H, S, S);
      g.globalCompositeOperation = 'lighter';
      ray(H * 0.97, 8, 0); ray(H * 0.97, 8, Math.PI / 2); ray(H * 0.55, 4, Math.PI / 4); ray(H * 0.55, 4, -Math.PI / 4);
    });
    cell(FR.star, function () {
      g.fillStyle = radial(H, [[0, W + '0.55)'], [0.5, W + '0.12)'], [1, W + '0)']]); g.fillRect(-H, -H, S, S);
      g.shadowColor = '#fff'; g.shadowBlur = 22; g.fillStyle = '#fff'; g.beginPath();
      for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? H * 0.27 : H * 0.66; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill();
    });
    cell(FR.streak, function () { g.save(); g.scale(1, 0.16); g.fillStyle = radial(H, [[0, W + '1)'], [0.25, W + '0.8)'], [0.6, W + '0.25)'], [1, W + '0)']]); g.fillRect(-H, -H / 0.16, S, S / 0.16); g.restore(); });
    cell(FR.smoke, function () { blobs(7, 26, H * 0.45, H * 0.2, H * 0.5, 0.22, 0); mask(0.45); });
    cell(FR.flame, function () {
      g.fillStyle = radial(H * 0.55, [[0, W + '1)'], [0.4, W + '0.7)'], [1, W + '0)']]); g.fillRect(-H, -H, S, S);
      blobs(11, 22, H * 0.42, H * 0.14, H * 0.38, 0.35, -H * 0.3); mask(0.4);
    });
    cell(FR.ring, function () { g.strokeStyle = '#fff'; g.lineWidth = 9; g.shadowColor = '#fff'; g.shadowBlur = 18; g.beginPath(); g.arc(0, 0, H * 0.78, 0, 6.283); g.stroke(); g.stroke(); });
    cell(FR.shock, function () { g.fillStyle = radial(H, [[0, W + '0)'], [0.5, W + '0)'], [0.78, W + '0.3)'], [0.92, W + '1)'], [1, W + '0)']]); g.fillRect(-H, -H, S, S); });
    cell(FR.snow, function () {
      g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 10;
      for (var i = 0; i < 6; i++) {
        g.save(); g.rotate(i * Math.PI / 3); g.lineWidth = 10; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -H * 0.82); g.stroke();
        g.lineWidth = 7; [0.38, 0.62].forEach(function (f) { g.beginPath(); g.moveTo(0, -H * f); g.lineTo(H * 0.2, -H * (f + 0.18)); g.moveTo(0, -H * f); g.lineTo(-H * 0.2, -H * (f + 0.18)); g.stroke(); });
        g.restore();
      }
    });
    cell(FR.shard, function () {
      var top = -H * 0.95, mid = -H * 0.18, bot = H * 0.92;
      var gr = g.createLinearGradient(-H * 0.3, top, H * 0.3, bot); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#a8dcff');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, top); g.lineTo(H * 0.3, mid); g.lineTo(H * 0.18, bot); g.lineTo(-H * 0.18, bot); g.lineTo(-H * 0.3, mid); g.closePath(); g.fill();
      g.fillStyle = 'rgba(90,150,215,0.45)'; g.beginPath(); g.moveTo(0, top); g.lineTo(H * 0.3, mid); g.lineTo(H * 0.18, bot); g.lineTo(0, H * 0.55); g.closePath(); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, top); g.lineTo(H * 0.3, mid); g.lineTo(H * 0.18, bot); g.lineTo(-H * 0.18, bot); g.lineTo(-H * 0.3, mid); g.closePath(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4; g.beginPath(); g.moveTo(-H * 0.1, mid); g.lineTo(-H * 0.04, H * 0.6); g.stroke();
    });
    cell(FR.circle, function () {
      g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 8;
      [[0.95, 6], [0.84, 3], [0.5, 4], [0.42, 2]].forEach(function (r) { g.lineWidth = r[1]; g.beginPath(); g.arc(0, 0, H * r[0], 0, 6.283); g.stroke(); });
      g.lineWidth = 3.5;
      for (var t = 0; t < 2; t++) { g.beginPath(); for (var i = 0; i <= 3; i++) { var a = -Math.PI / 2 + t * Math.PI + i * 2.094; g.lineTo(Math.cos(a) * H * 0.84, Math.sin(a) * H * 0.84); } g.stroke(); }
      var R = rnd(5);
      for (var k = 0; k < 28; k++) {
        g.save(); g.rotate(k / 28 * 6.283); g.translate(0, -H * 0.895); g.lineWidth = 2.5; g.beginPath();
        var kind = Math.floor(R() * 4);
        if (kind === 0) { g.moveTo(-5, -6); g.lineTo(5, 6); g.moveTo(5, -6); g.lineTo(-5, 6); }
        else if (kind === 1) { g.arc(0, 0, 5, 0, 6.283); }
        else if (kind === 2) { g.moveTo(-6, 6); g.lineTo(0, -6); g.lineTo(6, 6); }
        else { g.moveTo(0, -7); g.lineTo(0, 7); g.moveTo(-5, 0); g.lineTo(5, 0); }
        g.stroke(); g.restore();
      }
      for (var v = 0; v < 6; v++) { var a2 = -Math.PI / 2 + v * Math.PI / 3; g.beginPath(); g.arc(Math.cos(a2) * H * 0.84, Math.sin(a2) * H * 0.84, 7, 0, 6.283); g.fill(); }
      g.beginPath(); g.arc(0, 0, 10, 0, 6.283); g.fill();
    });
    cell(FR.crescent, function () {
      g.shadowColor = '#fff'; g.shadowBlur = 20;
      g.fillStyle = radial(H, [[0, W + '0.4)'], [0.7, W + '1)'], [1, W + '1)']]);
      g.beginPath(); g.arc(0, 0, H * 0.86, 0, 6.283); g.fill();
      g.shadowBlur = 0; g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(-H * 0.3, -H * 0.05, H * 0.8, 0, 6.283); g.fill();
    });
    cell(FR.fluff, function () {
      g.fillStyle = radial(H * 0.6, [[0, W + '0.95)'], [0.6, W + '0.6)'], [1, W + '0)']]); g.fillRect(-H, -H, S, S);
      var R = rnd(3); g.lineCap = 'round';
      for (var i = 0; i < 70; i++) {
        var a = R() * 6.283, r0 = R() * H * 0.25, r1 = H * (0.4 + R() * 0.5), bend = (R() - 0.5) * 0.6;
        g.strokeStyle = 'rgba(255,255,255,' + (0.35 + R() * 0.5) + ')'; g.lineWidth = 2 + R() * 5; g.beginPath();
        g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        g.quadraticCurveTo(Math.cos(a + bend) * r1 * 0.6, Math.sin(a + bend) * r1 * 0.6, Math.cos(a + bend * 1.5) * r1, Math.sin(a + bend * 1.5) * r1); g.stroke();
      }
    });
    cell(FR.paw, function () {
      g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 16;
      function el(x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x * H, y * H, rx * H, ry * H, rot || 0, 0, 6.283); g.fill(); }
      el(0, 0.28, 0.42, 0.34); el(-0.55, -0.22, 0.17, 0.22, -0.4); el(-0.2, -0.52, 0.17, 0.23, -0.1); el(0.2, -0.52, 0.17, 0.23, 0.1); el(0.55, -0.22, 0.17, 0.22, 0.4);
    });
    cell(FR.dot, function () { g.fillStyle = radial(H, [[0, W + '1)'], [0.3, W + '1)'], [0.5, W + '0.4)'], [1, W + '0)']]); g.fillRect(-H, -H, S, S); });
    cell(FR.frost, function () {
      g.fillStyle = radial(H, [[0, W + '0.35)'], [0.7, W + '0.12)'], [1, W + '0)']]); g.fillRect(-H, -H, S, S);
      var R = rnd(9); g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 6;
      for (var i = 0; i < 14; i++) {
        var a = i / 14 * 6.283 + R() * 0.2, len = H * (0.6 + R() * 0.35);
        g.save(); g.rotate(a); g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(len, 0); g.stroke(); g.lineWidth = 2.5;
        for (var b = 0.3; b < 0.95; b += 0.18) { var bl = len * 0.18 * (1.1 - b); g.beginPath(); g.moveTo(len * b, 0); g.lineTo(len * b + bl, bl); g.moveTo(len * b, 0); g.lineTo(len * b + bl, -bl); g.stroke(); }
        g.restore();
      }
    });
    var tex = new T.CanvasTexture(c); tex.anisotropy = 2;
    return tex;
  }

  // ---------- instanced particle layer ----------
  var PVS = [
    'attribute vec4 iPR; attribute vec4 iSz; attribute vec4 iCol; attribute vec4 iVel;',
    'varying vec2 vUv; varying vec4 vCol;',
    'void main() {',
    '  vec2 q = position.xy * iSz.xy; float rot = iPR.w; vec4 mv;',
    '  if (iVel.w > 0.5) {',
    '    float c = cos(rot), s = sin(rot); q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);',
    '    mv = modelViewMatrix * vec4(iPR.xyz + vec3(q.x, 0.0, -q.y), 1.0);',
    '  } else {',
    '    mv = modelViewMatrix * vec4(iPR.xyz, 1.0);',
    '    if (iSz.w > 0.0) { vec2 vv = (modelViewMatrix * vec4(iVel.xyz, 0.0)).xy; float sp = length(vv); if (sp > 0.0001) { rot = atan(vv.y, vv.x); q.x *= 1.0 + sp * iSz.w; } }',
    '    float c = cos(rot), s = sin(rot); q = vec2(c * q.x - s * q.y, s * q.x + c * q.y); mv.xy += q;',
    '  }',
    '  gl_Position = projectionMatrix * mv;',
    '  float f = iSz.z; vUv = (vec2(mod(f, 4.0), 3.0 - floor(f / 4.0 + 0.01)) + position.xy + 0.5) * 0.25;',
    '  vCol = iCol;',
    '}'].join('\n');
  var PFS = [
    'uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;',
    'void main() { vec4 t = texture2D(map, vUv); float a = t.a * vCol.a; if (a < 0.004) discard; gl_FragColor = vec4(min(t.rgb * vCol.rgb, vec3(1.0)), min(a, 1.0)); }'].join('\n');

  function Layer(scene, tex, max, opt) {
    var geo = new T.InstancedBufferGeometry(), quad = new T.PlaneGeometry(1, 1);
    geo.setIndex(quad.index); geo.setAttribute('position', quad.attributes.position);
    this.a = {}; this.b = {};
    var self = this;
    ['iPR', 'iSz', 'iCol', 'iVel'].forEach(function (n) {
      var arr = new Float32Array(max * 4), at = new T.InstancedBufferAttribute(arr, 4);
      if (at.setUsage) at.setUsage(T.DynamicDrawUsage);
      geo.setAttribute(n, at); self.a[n] = arr; self.b[n] = at;
    });
    geo.instanceCount = 0;
    this.mat = new T.ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false, depthTest: !!opt.depth, blending: opt.add ? T.AdditiveBlending : T.NormalBlending });
    this.mesh = new T.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = opt.order; scene.add(this.mesh);
    this.geo = geo; this.max = max; this.cap = max; this.list = []; this.flat = !!opt.flat;
  }

  // ---------- ribbons (trails, slashes, lightning) ----------
  var RVS = 'attribute vec4 aCol; attribute vec3 aUv; varying vec4 vCol; varying vec3 vUv; void main(){ vCol = aCol; vUv = aUv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var RFS = [
    'varying vec4 vCol; varying vec3 vUv;',
    'void main(){ float d = abs(vUv.y * 2.0 - 1.0); float e = max(0.0, 1.0 - d);',
    '  float glow = pow(e, 1.4); float core = pow(e, 7.0) * vUv.z;',
    '  vec3 c = mix(vCol.rgb, vec3(1.0), clamp(core * 1.5, 0.0, 1.0)); float a = (glow * 0.85 + core) * vCol.a;',
    '  if (a < 0.004) discard; gl_FragColor = vec4(min(c, vec3(1.0)), min(a, 1.0)); }'].join('\n');

  function hexArr(h, hot) { var c = new T.Color(h); var k = hot || 1; return [c.r * k, c.g * k, c.b * k]; }
  function colors(c, hot) { return (Array.isArray(c) ? c : [c === undefined ? 0xffffff : c]).map(function (h) { return hexArr(h, hot); }); }

  function createVfx(scene, camera) {
    var atlas = buildAtlas();
    var layers = {
      gnorm: new Layer(scene, atlas, 80, { depth: true, flat: true, add: false, order: 1 }),
      gadd: new Layer(scene, atlas, 120, { depth: true, flat: true, add: true, order: 2 }),
      norm: new Layer(scene, atlas, 500, { add: false, order: 9 }),
      addB: new Layer(scene, atlas, 700, { add: false, order: 10 }),
      add: new Layer(scene, atlas, 1500, { add: true, order: 11 })
    };
    var CAP = { high: [1, 1500, 500, 700], mid: [0.6, 850, 300, 420], low: [0.35, 460, 170, 240] };
    var qf = 1, bright = false, pool = [], camPos = new T.Vector3(), camDir = new T.Vector3();

    function emit(o) {
      var name = o.sys || 'add';
      if ((name === 'add' && bright && !o.white) || name === 'col') name = 'addB';
      if (name === 'gadd' && bright && !o.white) name = 'gnorm';
      var L = layers[name]; if (L.list.length >= L.cap) return null;
      var p = pool.pop() || {};
      var pos = o.pos; p.x = pos.x; p.y = pos.y; p.z = pos.z;
      var v = o.vel; p.vx = v ? v.x : 0; p.vy = v ? v.y : 0; p.vz = v ? v.z : 0;
      p.t = -(o.delay || 0); p.life = o.life || 0.5;
      var sz = o.size === undefined ? 0.3 : o.size;
      if (Array.isArray(sz)) { p.s0 = sz[0]; p.s1 = sz[1]; } else { p.s0 = p.s1 = sz; }
      p.ease = o.ease || 0; p.ar = o.ar || 1;
      p.rot = o.rot === undefined ? Math.random() * 6.283 : o.rot; p.spin = o.spin || 0;
      p.frame = FR[o.frame || 'glow']; p.stretch = o.stretch || 0;
      p.cols = colors(o.color, o.hot);
      p.a = o.alpha === undefined ? 1 : o.alpha; p.fin = o.fadeIn || 0; p.fout = o.fadeOut === undefined ? 0.55 : o.fadeOut;
      p.drag = o.drag || 0; p.grav = o.grav || 0; p.upd = o.upd || null; p.data = o.data || null;
      p.flick = o.flicker || 0; p.dead = false; p.L = L; p.k = 0;
      L.list.push(p); return p;
    }
    function kill(p) { if (p) p.dead = true; }

    function writeLayer(L, dt) {
      var A = L.a, n = 0, list = L.list;
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i]; p.t += dt;
        if (p.dead || p.t >= p.life) { list[i] = list[list.length - 1]; list.pop(); p.upd = null; p.data = null; pool.push(p); continue; }
        if (p.t < 0) continue;
        var k = p.t / p.life; p.k = k;
        if (!(p.upd && p.upd(p, dt, k))) {
          p.vy -= p.grav * dt; var dm = p.drag ? Math.max(0, 1 - p.drag * dt) : 1;
          p.vx *= dm; p.vy *= dm; p.vz *= dm;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        }
        p.rot += p.spin * dt;
        if (p.dead) continue;
        var e = p.ease === 1 ? 1 - (1 - k) * (1 - k) : p.ease === 2 ? Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.5) : p.ease === 3 ? k * k : k;
        var s = p.s0 + (p.s1 - p.s0) * e;
        var al = p.a * (p.fin && k < p.fin ? k / p.fin : 1) * (k > p.fout ? (1 - k) / (1 - p.fout) : 1);
        if (p.flick) al *= 1 - p.flick * Math.random();
        var cs = p.cols, r, g, b;
        if (cs.length === 1) { r = cs[0][0]; g = cs[0][1]; b = cs[0][2]; }
        else { var f = k * (cs.length - 1), j = Math.min(cs.length - 2, Math.floor(f)), u = f - j, c0 = cs[j], c1 = cs[j + 1]; r = c0[0] + (c1[0] - c0[0]) * u; g = c0[1] + (c1[1] - c0[1]) * u; b = c0[2] + (c1[2] - c0[2]) * u; }
        var o4 = n * 4;
        A.iPR[o4] = p.x; A.iPR[o4 + 1] = p.y; A.iPR[o4 + 2] = p.z; A.iPR[o4 + 3] = p.rot;
        A.iSz[o4] = s; A.iSz[o4 + 1] = s * p.ar; A.iSz[o4 + 2] = p.frame; A.iSz[o4 + 3] = p.stretch;
        A.iCol[o4] = r; A.iCol[o4 + 1] = g; A.iCol[o4 + 2] = b; A.iCol[o4 + 3] = al;
        A.iVel[o4] = p.vx; A.iVel[o4 + 1] = p.vy; A.iVel[o4 + 2] = p.vz; A.iVel[o4 + 3] = L.flat ? 1 : 0;
        n++;
      }
      L.geo.instanceCount = n;
      if (n) { for (var key in L.b) { L.b[key].needsUpdate = true; } }
    }

    // ---- ribbons: two batches, glowing (additive) and solid colour (normal blending) ----
    var RP = 24;
    function RibbonBatch(RN, blending, order) {
      var verts = RN * RP * 2, idx = [];
      this.RN = RN; this.pos = new Float32Array(verts * 3); this.col = new Float32Array(verts * 4); this.uv = new Float32Array(verts * 3); this.ribs = new Array(RN);
      for (var r = 0; r < RN; r++) for (var i = 0; i < RP - 1; i++) { var b0 = (r * RP + i) * 2; idx.push(b0, b0 + 1, b0 + 2, b0 + 1, b0 + 3, b0 + 2); }
      var geo = new T.BufferGeometry();
      this.PA = new T.BufferAttribute(this.pos, 3); this.CA = new T.BufferAttribute(this.col, 4); this.UA = new T.BufferAttribute(this.uv, 3);
      [this.PA, this.CA, this.UA].forEach(function (x) { if (x.setUsage) x.setUsage(T.DynamicDrawUsage); });
      geo.setAttribute('position', this.PA); geo.setAttribute('aCol', this.CA); geo.setAttribute('aUv', this.UA); geo.setIndex(idx);
      this.mat = new T.ShaderMaterial({ vertexShader: RVS, fragmentShader: RFS, transparent: true, depthWrite: false, depthTest: false, blending: blending, side: T.DoubleSide });
      this.mesh = new T.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = order; scene.add(this.mesh);
    }
    var batches = { glow: new RibbonBatch(44, T.AdditiveBlending, 12), solid: new RibbonBatch(36, T.NormalBlending, 10.5) };

    function ribbon(o) {
      var B = o.solid || bright ? batches.solid : batches.glow;
      var slot = -1; for (var i = 0; i < B.RN; i++) if (!B.ribs[i]) { slot = i; break; }
      if (slot < 0) return null;
      var rb = { slot: slot, pts: o.pts ? o.pts.slice() : [], w: o.w || 0.1, col: hexArr(o.color === undefined ? 0xffffff : o.color, o.hot), core: o.core === undefined ? 0.8 : o.core,
        a: o.alpha === undefined ? 1 : o.alpha, mode: o.mode || 'static', life: o.life || 0.3, t: -(o.delay || 0), maxPts: Math.min(RP, o.maxPts || RP), minDist: o.minDist || 0.035,
        shrink: o.shrink || 40, acc: 0, detached: false, flicker: o.flicker || 0, regen: o.regen || null, regenEvery: o.regenEvery || 0.05, ra: 0, regenUntil: o.regenUntil === undefined ? 0.6 : o.regenUntil,
        sweep: !!o.sweep, taper: o.taper || (o.mode === 'trail' ? 'tail' : 'both'), widthFn: o.widthFn || null, upd: o.upd || null, dead: false, hold: !!o.hold };
      rb.head = function (p) {
        var last = rb.pts[rb.pts.length - 1];
        if (!last || last.distanceToSquared(p) > rb.minDist * rb.minDist) { rb.pts.push(p.clone()); if (rb.pts.length > rb.maxPts) rb.pts.shift(); }
        else last.copy(p);
      };
      rb.detach = function () { rb.detached = true; };
      rb.kill = function () { rb.dead = true; };
      B.ribs[slot] = rb; return rb;
    }
    var tmpT = new T.Vector3(), tmpS = new T.Vector3(), tmpC = new T.Vector3(), lastSide = new T.Vector3(0, 1, 0);
    function writeRibbons(B, dt) {
      var rPos = B.pos, rCol = B.col, rUv = B.uv, ribs = B.ribs;
      for (var r = 0; r < B.RN; r++) {
        var rb = ribs[r], base = r * RP * 2;
        if (rb) {
          rb.t += dt;
          if (rb.t >= 0) {
            if (rb.upd) rb.upd(rb, dt);
            if (rb.mode === 'trail') {
              if (rb.detached) { rb.acc += dt * rb.shrink; while (rb.acc >= 1 && rb.pts.length) { rb.pts.shift(); rb.acc -= 1; } if (rb.pts.length < 2) rb.dead = true; }
              else if (rb.t > 30) rb.dead = true;
            } else {
              if (rb.t >= rb.life) rb.dead = true;
              if (rb.regen && rb.t < rb.life * rb.regenUntil) { rb.ra += dt; if (rb.ra >= rb.regenEvery) { rb.ra = 0; rb.pts = rb.regen(); } }
            }
          }
          if (rb.dead) { ribs[r] = null; rb = null; }
        }
        var n = rb && rb.t >= 0 ? Math.min(rb.pts.length, RP) : 0;
        if (n < 2) { for (var z = 0; z < RP * 2; z++) rCol[(base + z) * 4 + 3] = 0; continue; }
        var k = rb.mode === 'trail' ? 0 : Math.min(1, rb.t / rb.life);
        var A = rb.a;
        // hold: a ribbon that is steered every frame (a beam, a whirl) keeps its full brightness until it is removed
        if (rb.mode !== 'trail' && !rb.hold) A *= (k < 0.08 ? k / 0.08 : 1) * (k > 0.45 ? Math.max(0, (1 - k) / 0.55) : 1);
        if (rb.flicker) A *= 1 - rb.flicker * (Math.random() < 0.35 ? 1 : 0);
        var headU = 1, tailU = 0;
        if (rb.sweep) { headU = Math.min(1, k / 0.32); tailU = Math.max(0, (k - 0.22) / 0.78); }
        for (var i = 0; i < RP; i++) {
          var ii = Math.min(i, n - 1), p = rb.pts[ii], vi = (base + i * 2);
          if (i >= n) { for (var q = 0; q < 2; q++) { rCol[(vi + q) * 4 + 3] = 0; rPos[(vi + q) * 3] = p.x; rPos[(vi + q) * 3 + 1] = p.y; rPos[(vi + q) * 3 + 2] = p.z; } continue; }
          var pa = rb.pts[Math.max(0, ii - 1)], pb = rb.pts[Math.min(n - 1, ii + 1)];
          tmpT.subVectors(pb, pa); tmpC.subVectors(camPos, p);
          tmpS.crossVectors(tmpT, tmpC); var sl = tmpS.length();
          if (sl < 1e-6) tmpS.copy(lastSide); else { tmpS.multiplyScalar(1 / sl); lastSide.copy(tmpS); }
          var u = ii / (n - 1), wf, af;
          if (rb.taper === 'tail') { wf = 0.15 + 0.85 * u; af = Math.pow(u, 0.8); }
          else if (rb.taper === 'bolt') { wf = 0.4 + 0.6 * Math.pow(Math.sin(Math.PI * u), 0.3); af = 1; }
          else { wf = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.45); af = 1; }
          if (rb.sweep) {
            if (u > headU + 1e-4 || u < tailU - 1e-4 || headU - tailU < 0.02) { wf = 0; af = 0; }
            else { var lu = (u - tailU) / Math.max(0.02, headU - tailU); wf = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, lu))), 0.5) * (0.55 + 0.45 * lu); af = 1; }
          }
          if (rb.widthFn) wf *= rb.widthFn(u, rb);
          var w = rb.w * wf, al = A * af;
          for (var sgn = 0; sgn < 2; sgn++) {
            var o3 = (vi + sgn) * 3, o4 = (vi + sgn) * 4, sd = sgn ? -w : w;
            rPos[o3] = p.x + tmpS.x * sd; rPos[o3 + 1] = p.y + tmpS.y * sd; rPos[o3 + 2] = p.z + tmpS.z * sd;
            rCol[o4] = rb.col[0]; rCol[o4 + 1] = rb.col[1]; rCol[o4 + 2] = rb.col[2]; rCol[o4 + 3] = al;
            rUv[o3] = u; rUv[o3 + 1] = sgn; rUv[o3 + 2] = rb.core;
          }
        }
      }
      B.PA.needsUpdate = true; B.CA.needsUpdate = true; B.UA.needsUpdate = true;
    }

    // jagged path between two points, perpendicular jitter in the screen plane
    function boltPath(a, b, segs, amp) {
      var dir = new T.Vector3().subVectors(b, a), len = dir.length() || 0.001;
      var side = new T.Vector3().crossVectors(dir, camDir).normalize(), up = new T.Vector3().crossVectors(side, dir).normalize();
      var pts = [], off = 0;
      for (var i = 0; i <= segs; i++) {
        var u = i / segs, env = Math.sin(Math.PI * u);
        off = off * 0.35 + (Math.random() - 0.5) * 2 * amp * len * (0.5 + Math.random() * 0.5);
        var p = new T.Vector3().lerpVectors(a, b, u);
        if (i && i < segs) p.addScaledVector(side, off * env).addScaledVector(up, (Math.random() - 0.5) * amp * len * 0.4 * env);
        pts.push(p);
      }
      return pts;
    }
    function val(x) { return typeof x === 'function' ? x() : x; }
    function lightning(a, b, o) {
      o = o || {};
      var segs = o.segs || 14, amp = o.amp === undefined ? 0.13 : o.amp;
      var made = [];
      var main = ribbon({ mode: 'static', solid: o.solid, w: o.w || 0.12, color: o.color || 0x9fd8ff, hot: o.hot, core: o.core === undefined ? 1 : o.core, alpha: o.alpha, life: o.life || 0.3, flicker: o.flicker === undefined ? 0.5 : o.flicker, taper: 'bolt', delay: o.delay,
        regenEvery: o.regenEvery || 0.045, regenUntil: o.regenUntil, pts: boltPath(val(a), val(b), segs, amp) });
      if (!main) return made;
      main.regen = function () { return boltPath(val(a), val(b), segs, amp); };
      made.push(main);
      var nb = o.branches === undefined ? 2 : o.branches;
      for (var j = 0; j < nb; j++) (function () {
        var at = 0.25 + Math.random() * 0.5;
        function br() {
          var pa = val(a), pb = val(b), from = new T.Vector3().lerpVectors(pa, pb, at), d = new T.Vector3().subVectors(pb, pa);
          var to = from.clone().addScaledVector(d, 0.25 + Math.random() * 0.25).add(new T.Vector3(0, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.4));
          return boltPath(from, to, 7, amp * 1.4);
        }
        var b2 = ribbon({ mode: 'static', solid: o.solid, w: (o.w || 0.12) * 0.55, color: o.color || 0x9fd8ff, hot: o.hot, core: 0.8, life: (o.life || 0.3) * 0.8, flicker: 0.6, taper: 'both', delay: o.delay, pts: br() });
        if (b2) { b2.regen = br; made.push(b2); }
      })();
      return made;
    }

    function update(dt) {
      camera.getWorldPosition(camPos); camera.getWorldDirection(camDir);
      for (var key in layers) writeLayer(layers[key], dt);
      writeRibbons(batches.glow, dt); writeRibbons(batches.solid, dt);
    }
    function setQuality(q) {
      var c = CAP[q] || CAP.high; qf = c[0];
      layers.add.cap = c[1]; layers.norm.cap = c[2]; layers.addB.cap = c[3];
    }
    function setBright(v) { bright = !!v; }
    function clear() {
      for (var key in layers) { layers[key].list.forEach(function (p) { p.dead = true; }); }
      [batches.glow, batches.solid].forEach(function (B) { for (var i = 0; i < B.RN; i++) if (B.ribs[i]) B.ribs[i].dead = true; });
    }
    function count() { var n = 0; for (var key in layers) n += layers[key].list.length; return n; }
    return { emit: emit, kill: kill, ribbon: ribbon, lightning: lightning, boltPath: boltPath, update: update, setQuality: setQuality, setBright: setBright, clear: clear, count: count,
      quality: function () { return qf; }, isBright: function () { return bright; }, atlas: atlas, layers: layers };
  }
  CW.createVfx = createVfx;
})(this);
