// 내 펫 화면의 살아 있는 펫 (2026-11-23, 형: 펫이 움직이는 게 하나도 없어 → 알아서 움직이고 생동감 있게, 그림 느낌 없게 →
// 애니메이션처럼 진짜 생동감 넘치게). The big pet on the 내 펫 stage and the one that hatches are drawn on a small WebGL canvas
// with the same puppet shader and pose clock as in battle (js/pet-rig.js): on the stage it walks (or flies, or swims) left and
// right by itself, stops, looks about, turns at the bottom of a little crouch, plays (sniffs, dozes and shakes awake, a hop, a
// happy dance, a bird hovering, a gentle leap,
// a legend's roar) and jumps happily when tapped; the hatched one stays put and is glad to be out. The picture (<img>) stays
// under it until the first frame is drawn, and stays for good if WebGL is not there.
// js/pet-ui.js: CW.petLive.stage(stageEl, pet or null) after every redraw (the same canvas is moved into the new stage, so the
// pet carries on where it was), CW.petLive.hatch(resultEl, pet) when a single hatch result shows.
(function (root) {
  var CW = root.CW = root.CW || {};
  var G = CW.PET_GLSL;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  var VS = 'attribute vec2 uv; uniform vec2 uRes; uniform vec4 uPlace;\n' + (G ? G.VS_HEAD : '') +
    'void main() { vUv = uv; vec2 a = petDeform(uv);\n' +
    '  vec2 l = vec2((a.x - 0.5) * uFlip, 1.0 - a.y) * uPlace.z, c0 = vec2(0.0, 0.5 * uPlace.z), r = l - c0;\n' +
    '  float cs = cos(uPlace.w), sn = sin(uPlace.w); l = c0 + vec2(r.x * cs - r.y * sn, r.x * sn + r.y * cs);\n' +
    '  vec2 px = vec2(uPlace.x + l.x, uPlace.y - l.y);\n' +
    '  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0); }';
  var FS = 'precision mediump float;\n' + (G ? G.FS_HEAD : '') + 'void main() { gl_FragColor = petColor(); }';
  // the soft shadow under it: an ellipse that fades out
  var VS_SH = 'attribute vec2 uv; uniform vec2 uRes; uniform vec4 uSh; varying vec2 vQ;\n' +
    'void main() { vQ = uv * 2.0 - 1.0; vec2 px = uSh.xy + vQ * uSh.zw; gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0); }';
  var FS_SH = 'precision mediump float; uniform float uA; varying vec2 vQ;\n' +
    'void main() { float d = length(vQ); gl_FragColor = vec4(0.06, 0.02, 0.16, uA * (1.0 - smoothstep(0.2, 1.0, d))); }';

  function Live(opts) {
    this.roam = !!opts.roam; this.cls = opts.cls; this.cv = document.createElement('canvas'); this.cv.className = opts.cls;
    this.cv.setAttribute('aria-hidden', 'true');
    this.gl = null; this.texs = {}; this.pet = null; this.pose = null; this.raf = 0; this.last = 0; this.img = null;
    var me = this;
    this.cv.addEventListener('click', function (e) { me.tap(e); });
    this.cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); me.gl = null; me.texs = {}; if (me.img) me.img.classList.remove('pplive-on'); });
  }
  Live.prototype.init = function () {
    if (this.gl) return true;
    var gl = null;
    try { gl = this.cv.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true }); } catch (e) { gl = null; }
    if (!gl || !G) return false;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (root.console) console.warn('pet-live shader', gl.getShaderInfoLog(s)); return null; } return s; }
    function prog(vs, fs) {
      var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs); if (!v || !f) return null;
      var p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'uv'); gl.linkProgram(p);
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    }
    var p = prog(VS, FS), ps = prog(VS_SH, FS_SH); if (!p || !ps) return false;
    // a 20×20 grid over the picture (it bends), and one quad for the shadow
    var N = 20, uv = [], idx = [];
    for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) uv.push(i / N, j / N);
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) { var a = j * (N + 1) + i; idx.push(a, a + 1, a + N + 1, a + 1, a + N + 2, a + N + 1); }
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    var qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    var L = {}; ['uRes', 'uPlace', 'uE', 'uP', 'uBody', 'uSq', 'uWave', 'uFlip', 'map', 'uGlow', 'uEye', 'uLid'].forEach(function (n) { L[n] = gl.getUniformLocation(p, n); });
    var LS = { uRes: gl.getUniformLocation(ps, 'uRes'), uSh: gl.getUniformLocation(ps, 'uSh'), uA: gl.getUniformLocation(ps, 'uA') };
    this.gl = gl; this.p = p; this.ps = ps; this.vb = vb; this.ib = ib; this.qb = qb; this.n = idx.length; this.L = L; this.LS = LS;
    return true;
  };
  // the picture as a 512×512 texture (power of two, so it has mipmaps: the eyelids are filled from blurred fur)
  Live.prototype.tex = function (url, done) {
    var me = this, t = this.texs[url];
    if (t) { if (t.ok) done(t.t); else t.wait.push(done); return; }
    t = this.texs[url] = { ok: false, wait: [done] };
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () {
      var gl = me.gl; if (!gl || me.texs[url] !== t) return;
      var c = document.createElement('canvas'); c.width = c.height = 512; c.getContext('2d').drawImage(im, 0, 0, 512, 512);
      var tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);
      t.ok = true; t.t = tx; t.wait.forEach(function (f) { f(tx); }); t.wait = [];
    };
    im.src = url;
  };
  // put the canvas in a box and show a pet there (the same pet: it just carries on)
  Live.prototype.show = function (host, img, pet, place) {
    this.place = place; this.img = img || null;
    if (this.cv.parentNode !== host) host.insertBefore(this.cv, host.firstChild);   // under the name and the stars
    if (!this.init()) return;
    var me = this, url = (CW.ART_BASE || 'art/') + pet.art + '.webp';
    if (!this.pet || this.pet.id !== pet.id) {
      this.pet = pet; this.pose = CW.createPetPose(pet.id); this.R = CW.petRigOf(pet.id); this.ready = false; this.t = null;
      this.x = null; this.face = -1; this.vx = 0; this.lastVx = 0; this.mode = 'idle'; this.modeT = rnd(0.5, 1.5); this.play = null; this.roll = 0; this.turnCd = 0; this.pend = 0;
      if (place.hello) { this.pose.cheer(1.6); this.jmp(0.3, 0.55); }
      this.tex(url, function (tx) { if (me.pet === pet) { me.t = tx; } });
    } else if (this.ready && this.img) this.img.classList.add('pplive-on');
    this.size();
    if (!this.raf) { this.last = 0; this.raf = requestAnimationFrame(function f(ts) { me.frame(ts, f); }); }
  };
  Live.prototype.size = function () {
    // the layout size, not the drawn one: the hatched pet's box pops in scaled (a CSS animation)
    var d = Math.min(root.devicePixelRatio || 1, 2.5);
    this.W = this.cv.offsetWidth || 300; this.H = this.cv.offsetHeight || 180;
    var w = Math.round(this.W * d), h = Math.round(this.H * d);
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    this.dpr = d;
  };
  Live.prototype.jmp = function (h, d) { this.pose.jump(h * (this.place.jumpK || 1), d); };
  // a turn flips the picture at the bottom of a little crouch, so the flip is never seen in the open
  Live.prototype.turn = function (f) {
    if (f === this.face || this.pend || this.turnCd > 0) return;
    this.pend = f; this.pendT = this.big() ? 0.12 : 0.09; this.turnCd = 0.55; if (!this.pose.busy()) this.jmp(this.big() ? 0.012 : 0.04, 0.24);
  };
  Live.prototype.big = function () { return this.pet && this.pet.grade === 3; };
  Live.prototype.tap = function (e) {
    if (!this.pose || this.x === null) return;
    var r = this.cv.getBoundingClientRect(), x = (e.clientX - r.left) * this.W / (r.width || 1), y = (e.clientY - r.top) * this.H / (r.height || 1), S = this.S;
    if (Math.abs(x - this.x) > S * 0.45 || y < this.gy - S || y > this.gy + 10) return;
    if (this.play && this.play.kind === 'doze') { this.pose.doze(false); this.play = null; this.mode = 'idle'; this.modeT = rnd(1, 2); }
    this.pose.cheer(1.8);
    if (this.big()) this.pose.roar(1); else this.jmp(0.3, 0.5);
  };
  // the stage brain: walk somewhere, stand and look, play
  Live.prototype.think = function (dt) {
    var big = this.big(), R = this.R, S = this.S, lo = S * 0.42, hi = this.W - S * 0.42, sp = (big ? 46 : 70) * (R.slow ? 0.7 : R.fast ? 1.25 : 1);
    this.modeT -= dt; this.turnCd -= dt;
    var want = 0;
    if (this.mode === 'play' && this.play && this.play.kind === 'sniff') want = this.play.dir * 9;   // creeping on, nose down
    if (this.mode === 'go') {
      var d = this.goal - this.x; want = clamp(d / 25, -1, 1) * sp;
      if (Math.abs(d) < 2) { this.mode = 'idle'; this.modeT = rnd(1.4, 3.4); }
    } else if (this.mode === 'idle') {
      if (this.modeT <= 0) {
        var r = Math.random();
        if (r < 0.5 && hi > lo + 40) {
          var g = rnd(lo, hi); for (var n = 0; n < 8 && Math.abs(g - this.x) < 40; n++) g = rnd(lo, hi);
          this.goal = g; this.mode = 'go';
        } else if (r < 0.8) this.startPlay();
        else { this.turn(-this.face); this.modeT = rnd(1.4, 2.8); }
      }
    } else if (this.mode === 'play') {
      this.play.t += dt;
      if (this.modeT <= 0) { if (this.play.kind === 'doze') { this.pose.doze(false); this.pose.shake(); } this.mode = 'idle'; this.modeT = rnd(1.2, 3); this.play = null; }
    }
    this.vx += (want - this.vx) * (1 - Math.exp(-dt * (big ? 4 : 7)));
    this.x = clamp(this.x + this.vx * dt, lo, hi);
    if (Math.abs(this.vx) > 12 && this.mode !== 'play' && (this.vx > 0 ? 1 : -1) !== this.face) this.turn(this.vx > 0 ? 1 : -1);
  };
  Live.prototype.startPlay = function () {
    var R = this.R, big = this.big(), list;
    if (big) list = R.move === 'fly' ? ['hover', 'roar', 'look'] : ['roar', 'look', 'stomp', 'look'];
    else if (R.move === 'fly') list = ['hover', 'happy', 'look', 'hover'];
    else if (R.move === 'swim') list = ['leap', 'happy', 'look'];
    else list = ['sniff', 'doze', 'happy', 'sniff', 'doze', 'bigjump', 'look'];
    var k = list[Math.floor(Math.random() * list.length)], p = this.pose, me = this;
    this.play = { kind: k, t: 0, n: 0, dir: Math.random() < 0.5 ? -1 : 1 }; this.mode = 'play';
    if (k === 'bigjump') { me.jmp(0.4, 0.58); p.cheer(1.2); this.modeT = 1.1; }
    else if (k === 'sniff') { p.look(R.face * 0.16, 1.9, 1); this.modeT = 2; this.play.dir = this.face; }
    else if (k === 'doze') { p.doze(true); this.modeT = rnd(3, 5); }
    else if (k === 'look') { p.look(rnd(-0.1, 0.1), 2.2); this.modeT = 2.3; }
    else if (k === 'hover') { p.flutter(1.9); this.modeT = 1.9; }
    else if (k === 'happy') { p.cheer(1.7); this.modeT = 1.7; }
    else if (k === 'leap') { me.jmp(0.45, 0.85); p.cheer(1.2); this.modeT = 0.95; }
    else if (k === 'roar') { p.roar(1.1); this.modeT = 1.4; }
    else { me.jmp(0.04, 0.45); this.modeT = 0.9; }
  };
  Live.prototype.frame = function (ts, f) {
    var me = this;
    if (!this.cv.isConnected || !this.gl) { this.raf = 0; return; }
    this.raf = requestAnimationFrame(f);
    if (document.hidden) { this.last = 0; return; }
    var dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 1 / 60; this.last = ts;
    if (!this.t) return;
    var P = this.place, R = this.R, big = this.big();
    this.S = P.size(big); this.size();
    // a legend fills the stage already: it hovers on the floor line (its wings would touch the top)
    var air = big ? 0 : R.move === 'fly' ? P.fly : R.move === 'swim' ? P.swim : 0;
    var ground = typeof P.ground === 'function' ? P.ground(big) : P.ground;
    this.gy = ground - air;
    if (this.x === null) this.x = this.W / 2;
    if (this.pend) { this.pendT -= dt; if (this.pendT <= 0) { this.face = this.pend; this.pend = 0; } }
    if (this.roam) this.think(dt); else { this.modeT -= dt; this.turnCd -= dt; if (this.modeT <= 0) { this.modeT = rnd(2.5, 4.5); if (Math.random() < 0.4) this.turn(-this.face); else if (Math.random() < 0.5) this.jmp(0.25, 0.5); else this.pose.look(rnd(-0.1, 0.1), 1.6); } }
    var flip = this.face * (R.face || -1), ivx = this.vx / this.S * flip, iax = (ivx - this.lastVx) / Math.max(dt, 0.001); this.lastVx = ivx;
    var ps = this.pose.update(dt, { walk: clamp(Math.abs(this.vx) / ((big ? 46 : 70)), 0, 1.4), vx: ivx, ax: iax });
    var rl = ps.roll, extra = 0, pl = this.play;
    if (pl && this.mode === 'play' && pl.kind === 'leap') rl += -flip * Math.sin(clamp(pl.t / 0.85, 0, 1) * Math.PI * 2) * 0.22;
    this.roll += (rl - this.roll) * Math.min(1, dt * 10);
    var gl = this.gl, d = this.dpr, L = this.L, u = this.pose.u, S = this.S;
    var lift = ps.lift * S + extra, feetY = this.gy - lift, bottom = feetY + (1 - R.foot) * S;
    gl.viewport(0, 0, this.cv.width, this.cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // shadow on the stage floor (smaller and fainter when it is up in the air)
    var up = (ground - feetY) / S, sw = S * (big ? 0.36 : 0.3) * (1 - Math.min(0.45, up * 0.5));
    gl.useProgram(this.ps); gl.bindBuffer(gl.ARRAY_BUFFER, this.qb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.LS.uRes, this.W, this.H); gl.uniform4f(this.LS.uSh, this.x, ground + 2, sw, sw * 0.22); gl.uniform1f(this.LS.uA, 0.42 * (1 - Math.min(0.7, up * 0.9)));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // the pet
    gl.useProgram(this.p); gl.bindBuffer(gl.ARRAY_BUFFER, this.vb); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.t); gl.uniform1i(L.map, 0);
    gl.uniform2f(L.uRes, this.W, this.H); gl.uniform4f(L.uPlace, this.x, bottom, S, this.roll);
    gl.uniform4fv(L.uE, u.E); gl.uniform4fv(L.uP, u.P); gl.uniform4fv(L.uBody, u.body); gl.uniform4fv(L.uSq, u.sq); gl.uniform4fv(L.uWave, u.wave);
    gl.uniform1f(L.uFlip, flip); gl.uniform4fv(L.uEye, u.eye); gl.uniform4fv(L.uLid, u.lid); gl.uniform1f(L.uGlow, 0);
    gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
    if (!this.ready) { this.ready = true; if (this.img) this.img.classList.add('pplive-on'); }
  };

  var stageLive = null, hatchLive = null;
  CW.petLive = {
    // the 내 펫 stage: the canvas covers the stage above the name; feet on a line under the picture's old place
    stage: function (el, pet) {
      if (!el || !pet || !CW.createPetPose) return;
      if (!stageLive) stageLive = new Live({ roam: true, cls: 'pplive' });
      stageLive.show(el, el.querySelector('.ppbig'), pet, { ground: function (big) { return big ? 184 : 172; }, fly: 10, swim: 6, jumpK: 0.42, size: function (big) { return big ? 178 : 158; } });
    },
    // a single hatch result: stays in its spot, happy to be out
    hatch: function (el, pet) {
      if (!el || !pet || !CW.createPetPose) return;
      var img = el.querySelector('.phpet'); if (!img) return;
      if (!hatchLive) hatchLive = new Live({ roam: false, cls: 'phlive' });
      hatchLive.pet = null;
      var wrap = document.createElement('div'); wrap.className = 'phlivebox' + (pet.grade === 3 ? ' g3' : ''); img.parentNode.insertBefore(wrap, img); wrap.appendChild(img);
      hatchLive.show(wrap, img, pet, { ground: pet.grade === 3 ? 196 : 158, fly: 8, swim: 4, hello: true, jumpK: 0.3, size: function (big) { return big ? 190 : 150; } });
    }
  };
})(this);
