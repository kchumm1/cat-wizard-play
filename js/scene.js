(function (root) {
  var CW = root.CW = root.CW || {};
  var T = root.THREE;

  function glowTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
    var r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
  }
  CW.GLOW = null;
  // Billboard shader: puppet bones (head, arms, legs, tail, wings bend their own part of the picture),
  // jelly bend from the feet, squash/stretch, white hit flash, ice tint, spell light and a burning dissolve.
  var BB_VS = [
    'uniform float uBend; uniform vec2 uScale; uniform float uH;',
    'uniform vec2 uBP[8]; uniform float uBA[8]; uniform vec2 uBT[8];',
    'attribute vec4 aW0; attribute vec4 aW1; varying vec2 vUv;',
    'vec2 rot2(vec2 r, float a) { float c = cos(a), s = sin(a); return vec2(r.x * c - r.y * s, r.x * s + r.y * c); }',
    'void main() { vUv = uv; vec3 p = position; vec2 q = p.xy, d = vec2(0.0); float w[8];',
    '  w[0] = aW0.x; w[1] = aW0.y; w[2] = aW0.z; w[3] = aW0.w; w[4] = aW1.x; w[5] = aW1.y; w[6] = aW1.z; w[7] = aW1.w;',
    '  for (int i = 0; i < 8; i++) { if (w[i] > 0.001) { vec2 r = q - uBP[i]; d += w[i] * (rot2(r, uBA[i]) - r + uBT[i]); } }',
    '  p.xy = q + d; float k = clamp(p.y / uH, 0.0, 1.0);',
    '  p.x = p.x * uScale.x + uBend * k * k * uH; p.y *= uScale.y;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }'].join('\n');
  var BB_FS = [
    'uniform sampler2D map; uniform vec3 uTint; uniform float uFlash; uniform vec3 uFlashCol; uniform float uFreeze; uniform float uDissolve; uniform vec3 uEdge; uniform vec3 uLight; uniform float uOpacity;',
    'varying vec2 vUv;',
    'float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'void main() {',
    '  vec4 t = texture2D(map, vUv); if (t.a < 0.06) discard;',
    '  vec3 c = t.rgb * uTint; float lum = dot(c, vec3(0.3, 0.59, 0.11));',
    '  c = mix(c, vec3(lum * 0.55 + 0.25, lum * 0.8 + 0.38, lum * 0.6 + 0.62), uFreeze * 0.75);',
    '  c += uLight * (0.25 + 0.75 * lum);',
    '  c = mix(c, uFlashCol, uFlash);',
    '  if (uDissolve > 0.0) { float v = vn(vUv * vec2(10.0, 16.0)) * 0.5 + vn(vUv * vec2(27.0, 31.0)) * 0.12 + vUv.y * 0.42;',
    '    if (v < uDissolve) discard; float e = 1.0 - smoothstep(uDissolve, uDissolve + 0.07, v); c = mix(c, uEdge * 1.6 + vec3(0.25), e); }',
    '  gl_FragColor = vec4(min(c, vec3(1.0)), t.a * uOpacity); }'].join('\n');
  // costume aura: a slightly larger copy of the picture behind it, blurred, coloured and rising like flames
  var AURA_FS = [
    'uniform sampler2D map; uniform vec3 uCol; uniform vec3 uCol2; uniform float uTime; uniform float uAmt; uniform float uAdd;',
    'varying vec2 vUv;',
    'float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'void main() {',
    '  float n = vn(vUv * vec2(6.0, 8.0) + vec2(0.0, -uTime * 1.2)) * 0.65 + vn(vUv * vec2(14.0, 18.0) + vec2(uTime * 0.3, -uTime * 2.1)) * 0.35;',
    '  vec2 uv = vUv + vec2((n - 0.5) * 0.03, -n * 0.035);',
    '  float a = 0.0;',
    '  for (int i = 0; i < 8; i++) { float g = float(i) * 0.785; a += texture2D(map, uv + vec2(cos(g), sin(g)) * 0.024).a; }',
    '  a = a * 0.075 + texture2D(map, uv).a * 0.4;',
    '  float f = a * (0.35 + 0.85 * n) * (0.7 + 0.45 * vUv.y);',
    '  vec3 c = mix(uCol, uCol2, smoothstep(0.45, 0.9, n));',
    '  gl_FragColor = uAdd > 0.5 ? vec4(c * f * uAmt * 2.4, min(1.0, f * uAmt * 1.3)) : vec4(c * (0.75 + 0.35 * n), min(1.0, f * uAmt * 1.15)); }'].join('\n');


  function spring(k, c) { return { x: 0, v: 0, target: 0, k: k, c: c }; }
  function stepSpring(s, dt) { var a = -s.k * (s.x - s.target) - s.c * s.v; s.v += a * dt; s.x += s.v * dt; }

  function createScene(canvas, overlay) {
    var GLOW = CW.GLOW = CW.GLOW || glowTexture();
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    if (T.sRGBEncoding) renderer.outputEncoding = T.sRGBEncoding;
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(38, 1, 0.5, 140);
    var lookAt = new T.Vector3(0, 0.55, -0.4), PITCH = 0.87, CAM_D = 16, H_HALF = 0.185, baseFov = 44;
    var camBase = new T.Vector3(0, lookAt.y + CAM_D * Math.sin(PITCH), lookAt.z + CAM_D * Math.cos(PITCH));
    var viewShift = 0, viewShiftT = 0, vw = 360, vh = 640;
    camera.position.copy(camBase); camera.lookAt(lookAt);
    scene.add(new T.HemisphereLight(0xffffff, 0x666688, 0.85));
    var sun = new T.DirectionalLight(0xffffff, 0.7); sun.position.set(3, 8, 6); scene.add(sun);

    var world = new T.Group(); scene.add(world);
    var heroGroup = new T.Group(); heroGroup.position.set(-1.3, 0, 0.3); scene.add(heroGroup);
    var auraGroup = new T.Group(); heroGroup.add(auraGroup);
    var cosGroup = new T.Group(); heroGroup.add(cosGroup);
    var cos = { fx: null, aura: null, glow: null };
    var mobGroup = new T.Group(); scene.add(mobGroup);
    var fxGroup = new T.Group(); scene.add(fxGroup);

    var quality = 'high', pixel = false, time = 0, region = -1;
    var hero = null, mobs = [], dying = [], ambient = null, ambientVel = null;
    var hooks = { land: null, die: null };

    function size() {
      var w = canvas.clientWidth || 360, h = canvas.clientHeight || 420;
      var pr = quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : quality === 'mid' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;
      if (pixel) { renderer.setPixelRatio(1); renderer.setSize(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 3)), false); canvas.style.imageRendering = 'pixelated'; }
      else { renderer.setPixelRatio(pr); renderer.setSize(w, h, false); canvas.style.imageRendering = 'auto'; }
      camera.aspect = w / h; vw = w; vh = h;
      // keep the same width of ground on every phone; tall screens simply see more ground above and below
      baseFov = Math.max(22, Math.min(60, 2 * Math.atan(Math.tan(H_HALF) / Math.min(w / h, 0.95)) * 180 / Math.PI));
      camera.fov = baseFov; applyShift(); camera.updateProjectionMatrix();
    }

    function applyShift() {
      if (viewShift > 0.002) camera.setViewOffset(vw, vh, 0, viewShift * vh, vw, vh); else camera.clearViewOffset();
    }
    function setViewShift(f) { viewShiftT = f; }
    // ---------- region dressing ----------
    function lambert(c) { return new T.MeshLambertMaterial({ color: c }); }
    function add(geo, mat, x, y, z, s, parent) { var m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (s) m.scale.setScalar(s); (parent || world).add(m); return m; }
    function rnd(seed) { var a = seed; return function () { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }
    var PROPS = [
      function flowers(R, acc) { for (var i = 0; i < 26; i++) { var x = -7 + R() * 14, z = -1.6 - R() * 5; add(new T.CylinderGeometry(0.02, 0.02, 0.3, 5), lambert(0x4f9a3c), x, 0.15, z); add(new T.SphereGeometry(0.11, 8, 6), lambert([0xff9fc8, 0xfff27a, 0xffffff, 0xb58cff][i % 4]), x, 0.33, z); } },
      function mushrooms(R) { for (var i = 0; i < 14; i++) { var x = -7 + R() * 14, z = -1.6 - R() * 5, s = 0.6 + R() * 1.2; add(new T.CylinderGeometry(0.12, 0.15, 0.5, 8), lambert(0xfff0d8), x, 0.25 * s, z, s); var cap = add(new T.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lambert(i % 3 ? 0xe8544e : 0xb06bd8), x, 0.5 * s, z, s); cap.scale.y *= 0.7; } },
      function desert(R) { for (var i = 0; i < 12; i++) { var x = -7 + R() * 14, z = -1.8 - R() * 5, s = 0.7 + R(); add(new T.CylinderGeometry(0.16, 0.18, 0.9, 8), lambert(0x5cae5c), x, 0.45 * s, z, s); add(new T.SphereGeometry(0.16, 8, 6), lambert(0x5cae5c), x, 0.9 * s, z, s); } add(new T.ConeGeometry(2.2, 2.2, 4), lambert(0xe2b866), -4.5, 1.1, -8).rotation.y = 0.6; add(new T.ConeGeometry(1.5, 1.5, 4), lambert(0xd9a95a), 4.8, 0.75, -7).rotation.y = 0.3; },
      function ice(R) { for (var i = 0; i < 16; i++) { var x = -7 + R() * 14, z = -1.6 - R() * 5, s = 0.5 + R() * 1.4; var m = add(new T.OctahedronGeometry(0.35, 0), new T.MeshLambertMaterial({ color: 0xbfe6ff, emissive: 0x335577 }), x, 0.35 * s, z, s); m.scale.y *= 1.8; m.rotation.y = R() * 3; } },
      function volcano(R) { add(new T.ConeGeometry(4, 4.5, 10), lambert(0x3a1c18), 0, 2.2, -10); for (var i = 0; i < 14; i++) { var x = -7 + R() * 14, z = -1.6 - R() * 5, s = 0.5 + R(); add(new T.DodecahedronGeometry(0.35, 0), new T.MeshLambertMaterial({ color: 0x2a1512, emissive: i % 3 ? 0x000000 : 0x661a00 }), x, 0.25 * s, z, s); } },
      function lake(R) { var w = add(new T.CircleGeometry(4.5, 32), new T.MeshLambertMaterial({ color: 0x3a5dbb, emissive: 0x101a40 }), 0, 0.02, -4.5); w.rotation.x = -Math.PI / 2; for (var i = 0; i < 10; i++) { var p = add(new T.CircleGeometry(0.35, 12), lambert(0x4fae7a), -3 + R() * 6, 0.03, -2.8 - R() * 3); p.rotation.x = -Math.PI / 2; } },
      function moon(R) { for (var i = 0; i < 10; i++) { var x = -7 + R() * 14, z = -1.8 - R() * 5; add(new T.SphereGeometry(0.45, 10, 8), lambert(0x2f5a46), x, 0.35, z); if (i % 2) { add(new T.CylinderGeometry(0.03, 0.03, 0.9, 5), lambert(0x333344), x + 0.5, 0.45, z); add(new T.SphereGeometry(0.1, 8, 6), new T.MeshBasicMaterial({ color: 0xfff2b0 }), x + 0.5, 0.95, z); } } add(new T.SphereGeometry(1.2, 20, 14), new T.MeshBasicMaterial({ color: 0xf2f2ff }), 4.5, 6, -14); },
      function temple(R) { for (var i = 0; i < 8; i++) { var x = -6 + i * 1.7, z = -3.5 - (i % 2) * 1.2; add(new T.CylinderGeometry(0.28, 0.32, 2.6, 10), lambert(0xf0dca0), x, 1.3, z); add(new T.BoxGeometry(0.8, 0.2, 0.8), lambert(0xe8c87a), x, 2.65, z); } add(new T.SphereGeometry(1.4, 20, 14), new T.MeshBasicMaterial({ color: 0xffe14a }), -4, 6.5, -14); },
      function galaxy(R) { for (var i = 0; i < 12; i++) { var m = add(new T.DodecahedronGeometry(0.4 + R() * 0.5, 0), lambert(0x4a3f7a), -7 + R() * 14, 0.6 + R() * 3, -3 - R() * 6); m.rotation.set(R() * 3, R() * 3, 0); } add(new T.SphereGeometry(1.6, 24, 16), lambert(0xb58cff), 4.5, 5, -13); var ring = add(new T.TorusGeometry(2.4, 0.08, 6, 48), new T.MeshBasicMaterial({ color: 0xffd0ff }), 4.5, 5, -13); ring.rotation.x = 1.2; },
      function castle(R) { for (var i = 0; i < 7; i++) { var x = -6 + i * 2, z = -6 - (i % 2) * 2, h = 2 + R() * 3; add(new T.CylinderGeometry(0.5, 0.6, h, 8), lambert(0x2a2038), x, h / 2, z); add(new T.ConeGeometry(0.7, 1.2, 8), lambert(0x4a1f3a), x, h + 0.6, z); add(new T.SphereGeometry(0.08, 6, 4), new T.MeshBasicMaterial({ color: 0xff3b5c }), x, h * 0.7, z + 0.6); } }
    ];
    var painted = null;
    function setRegion(r, regionData) {
      if (r === region) return; region = r;
      if (!painted) painted = CW.createWorld(scene, { tilt: TILT, halfX: halfX, field: FIELD });
      painted.build(r, regionData, quality);
    }


    // ---------- billboards with puppet bones ----------
    function rr(a, b) { return a + Math.random() * (b - a); }
    var geoCache = {};
    // one shared mesh per picture, 1 unit tall; each vertex knows how much every bone moves it
    function rigGeometry(art) {
      var key = art.id || 'x'; if (geoCache[key]) return geoCache[key];
      var geo = new T.PlaneGeometry(art.aspect, 1, 14, 22); geo.translate(0, 0.5, 0);
      var n = geo.attributes.position.count, uv = geo.attributes.uv.array, w0 = new Float32Array(n * 4), w1 = new Float32Array(n * 4);
      if (art.rig && art.crop && CW.rigWeightsAt) for (var i = 0; i < n; i++) {
        var ws = CW.rigWeightsAt(art.rig, art.crop, uv[i * 2], uv[i * 2 + 1]);
        for (var j = 0; j < 4; j++) { w0[i * 4 + j] = ws[j]; w1[i * 4 + j] = ws[j + 4]; }
      }
      geo.setAttribute('aW0', new T.BufferAttribute(w0, 4)); geo.setAttribute('aW1', new T.BufferAttribute(w1, 4));
      geo.userData.cached = true;
      return (geoCache[key] = geo);
    }
    function bbMaterial(tex, tint) {
      var bp = [], bt = []; for (var i = 0; i < 8; i++) { bp.push(new T.Vector2()); bt.push(new T.Vector2()); }
      return new T.ShaderMaterial({
        uniforms: { map: { value: tex }, uTint: { value: new T.Color(tint === undefined || tint === null ? 0xffffff : tint) }, uFlash: { value: 0 }, uFlashCol: { value: new T.Color(0xffffff) },
          uFreeze: { value: 0 }, uDissolve: { value: 0 }, uEdge: { value: new T.Color(0xffd84a) }, uLight: { value: new T.Color(0) }, uOpacity: { value: 1 },
          uBend: { value: 0 }, uScale: { value: new T.Vector2(1, 1) }, uH: { value: 1 }, uBP: { value: bp }, uBA: { value: new Float32Array(8) }, uBT: { value: bt } },
        vertexShader: BB_VS, fragmentShader: BB_FS, transparent: true, depthWrite: true, side: T.DoubleSide
      });
    }
    function newAnim(seed) { return { t: seed, ph: seed, walk: 0, aR: spring(150, 11), aL: spring(150, 11), hd: spring(120, 10), lastS: 1 }; }
    function billboard(art, height, tint) {
      var w = height * art.aspect, mat = bbMaterial(art.tex, tint);
      var m = new T.Mesh(rigGeometry(art), mat); m.scale.setScalar(height); m.renderOrder = 3; m.rotation.x = -TILT;
      var g = new T.Group(); g.add(m);
      var sh = new T.Mesh(new T.CircleGeometry(w * 0.32, 20), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.renderOrder = 1; g.add(sh);
      for (var i = 0; i < 8; i++) { var pv = art.rig && CW.rigPivotOf(art.rig, art.crop, CW.RIG_BONES[i], art.aspect, 1); if (pv) mat.uniforms.uBP.value[i].set(pv[0], pv[1]); }
      var seed = Math.random() * 6;
      g.userData = { body: m, u: mat.uniforms, shadow: sh, h: height, w: w, aspect: art.aspect, rig: art.rig, crop: art.crop, seed: seed, face: 1,
        bend: spring(170, 10), sq: spring(230, 13), lift: spring(95, 10), slide: spring(70, 11), light: new T.Color(0), anim: newAnim(seed) };
      return g;
    }
    // where a point of the picture is right now (bones, bend, squash and facing applied), in the group's own space
    function pointOn(g, u, v) {
      var d = g.userData, x = (u - 0.5) * d.aspect, y = v, dx = 0, dy = 0;
      if (d.rig && d.crop) {
        var ws = CW.rigWeightsAt(d.rig, d.crop, u, v), P = d.u.uBP.value, A = d.u.uBA.value, TT = d.u.uBT.value;
        for (var i = 0; i < 8; i++) if (ws[i] > 0.001) {
          var rx = x - P[i].x, ry = y - P[i].y, c = Math.cos(A[i]), s = Math.sin(A[i]);
          dx += ws[i] * (rx * c - ry * s - rx + TT[i].x); dy += ws[i] * (rx * s + ry * c - ry + TT[i].y);
        }
      }
      x += dx; y += dy;
      var k = Math.max(0, Math.min(1, y)), sc = d.u.uScale.value;
      return new T.Vector3((x * sc.x + d.u.uBend.value * k * k) * d.h, y * sc.y * d.h, 0);
    }
    // Animates the bones: walk cycle, arm swing, breathing, tail wag, wing flaps. Returns true on a footstep.
    function animRig(g, dt, P) {
      var d = g.userData, an = d.anim, A = d.u.uBA.value, TT = d.u.uBT.value;
      an.t += dt; an.walk += ((P.walk || 0) - an.walk) * Math.min(1, dt * 10);
      var wk = an.walk; if (wk > 0.02) an.ph += dt * (P.speed !== undefined ? Math.max(4, P.speed / (P.stride || 0.32) * Math.PI) : (5 + 9 * wk) * (P.stepRate || 1));
      var s = Math.sin(an.ph), t = an.t, air = P.air ? 1 : 0, br = Math.sin(t * 2.3 + d.seed), ch = P.cheer || 0;
      an.aR.target = (P.armR || 0) + ch * (0.35 + Math.sin(t * 15) * 0.4);
      an.aL.target = (P.armL || 0) - ch * (0.35 + Math.sin(t * 15 + 1.6) * 0.4);
      an.hd.target = (P.head || 0) - (P.hurt || 0) * 0.24 + ch * Math.sin(t * 7.5) * 0.1;
      stepSpring(an.aR, dt); stepSpring(an.aL, dt); stepSpring(an.hd, dt);
      A[0] = an.hd.x + Math.sin(t * 1.7 + d.seed) * 0.05 + wk * s * 0.07; TT[0].set(0, br * 0.007 - wk * Math.abs(s) * 0.012);
      A[1] = an.aL.x + wk * s * 0.3 + br * 0.04 - air * 0.4;
      A[2] = an.aR.x + wk * s * 0.3 - br * 0.04 + air * 0.4;
      A[3] = wk * s * 0.32 - air * 0.3; TT[3].set(0, Math.max(0, s) * 0.075 * wk + air * 0.04);
      A[4] = wk * s * 0.32 + air * 0.3; TT[4].set(0, Math.max(0, -s) * 0.075 * wk + air * 0.04);
      A[5] = Math.sin(t * (3.2 + wk * 6) + d.seed) * (0.2 + 0.14 * wk) + (P.wag || 0);
      var fl = Math.sin(t * (P.flapF || 6) + d.seed) * (P.flap === undefined ? 0.1 : P.flap) + (P.wingOpen || 0);
      A[6] = -(fl + 0.03); A[7] = fl + 0.03;
      var sg = s >= 0 ? 1 : -1, step = wk > 0.35 && sg !== an.lastS; an.lastS = sg;
      return step;
    }
    function setHero(art) {
      if (hero) heroGroup.remove(hero);
      hero = billboard(art, HERO_H); hero.userData.seed = 0.5; heroGroup.add(hero); cos.aura = null; if (cos.fx) attachAura();
      ghosts.forEach(function (gh) { heroGroup.remove(gh.mesh); }); ghosts.length = 0;
      for (var i = 0; i < 3; i++) {
        var gm = new T.Mesh(hero.userData.body.geometry, bbMaterial(art.tex)); gm.renderOrder = 2; gm.visible = false; gm.scale.setScalar(HERO_H); gm.rotation.x = -TILT;
        gm.material.depthWrite = false; heroGroup.add(gm); ghosts.push({ mesh: gm, t: 1, life: 0.35 });
      }
    }
    // swap the hero's picture (equipment changes how the wizard looks)
    function setHeroTexture(tex) {
      if (!hero) return;
      var old = hero.userData.u.map.value; hero.userData.u.map.value = tex;
      ghosts.forEach(function (gh) { gh.mesh.material.uniforms.map.value = tex; });
      if (old && old !== tex && old._look) old.dispose();
    }
    var HERO_H = 1.45, TILT = 0.6, COS_T = Math.cos(TILT), SIN_T = Math.sin(TILT);
    // Staff star position inside the hero art (fraction of width from the left, of height from the feet).
    var TIP_U = 0.16, TIP_V = 0.61;
    function heroLocal(u, v) {
      var p = pointOn(hero, u, v);
      return new T.Vector3(heroGroup.position.x + hero.position.x + p.x, heroGroup.position.y + hero.position.y + p.y * COS_T, heroGroup.position.z - p.y * SIN_T + 0.1);
    }
    function heroTip() { return hero ? heroLocal(TIP_U, TIP_V) : new T.Vector3(-1.85, 1.1, 0.35); }
    // spells leave from just in front of the raised paw so they never cross the face
    function heroPaw() { var p = hero ? heroLocal(0.86, 0.5) : new T.Vector3(-0.75, 0.9, 0.35); p.z += 0.12; return p; }
    function heroCenter() { var h = HERO_H * 0.5; return new T.Vector3(heroGroup.position.x + (hero ? hero.position.x : 0), h * COS_T + (hero ? hero.position.y : 0), heroGroup.position.z - h * SIN_T); }

    // ---------- hero cast poses ----------
    // a* = anticipation (lean/crouch), r* = release kick, hb/hs = pose kept for a moment after release,
    // aR/rR = paw arm (+ up, - out toward the monsters), aL/rL = staff arm (- lifts the staff over the head).
    var POSES = {
      thrust: { ab: -0.14, as: -0.06, ax: -0.05, rb: 3.4, rs: 2.4, rl: 0.4, rx: 1.9, hb: 0.07, hs: 0, aR: 0.55, rR: -1.05, aL: 0.12, rL: -0.25 },
      raise: { ab: -0.03, as: -0.12, ax: 0, rb: 1.0, rs: 4.8, rl: 2.7, rx: 0, hb: 0, hs: 0.07, aR: -0.2, rR: 0.95, aL: 0.2, rL: -0.65 },
      swipe: { ab: -0.17, as: -0.05, ax: -0.1, rb: 5.2, rs: 1.6, rl: 0.8, rx: 4.6, hb: 0.15, hs: 0, aR: 1.0, rR: -1.35, aL: 0.1, rL: -0.35 },
      toss: { ab: -0.19, as: -0.09, ax: -0.04, rb: 4.2, rs: 3.2, rl: 0.9, rx: 1.0, hb: 0.08, hs: 0, aR: 1.15, rR: -0.95, aL: -0.15, rL: 0.15 },
      spin: { ab: 0, as: -0.09, ax: 0, rb: 0.5, rs: 2.5, rl: 1.9, rx: 0, hb: 0, hs: 0, flip: 0.34, aR: 0.3, rR: -0.7, aL: 0.3, rL: -0.55 }
    };
    var pose = null, heroGlow = 0, heroGlowCol = new T.Color(), flipT = 1, flipDur = 0.34;
    function heroPose(type, antic, color) {
      pose = { P: POSES[type] || POSES.thrust, t: 0, a: Math.max(0.03, antic || 0.12), rel: false };
      if (color !== undefined) { heroGlowCol.setHex(color); }
      HB.lock = Math.max(HB.lock, (antic || 0.12) + 0.45);
    }
    function heroGlowPulse(color, amt) { heroGlowCol.setHex(color); heroGlow = Math.max(heroGlow, amt === undefined ? 1 : amt); }
    var ghosts = [];
    function ghost(color) {
      if (!hero) return;
      var gh = null; for (var i = 0; i < ghosts.length; i++) if (ghosts[i].t >= ghosts[i].life) { gh = ghosts[i]; break; }
      if (!gh) return;
      var u = gh.mesh.material.uniforms, hu = hero.userData.u;
      u.uBend.value = hu.uBend.value; u.uScale.value.copy(hu.uScale.value); u.uH.value = hu.uH.value;
      for (var b = 0; b < 8; b++) { u.uBP.value[b].copy(hu.uBP.value[b]); u.uBT.value[b].copy(hu.uBT.value[b]); u.uBA.value[b] = hu.uBA.value[b]; }
      u.uFlash.value = 0.55; u.uFlashCol.value.setHex(color); u.uOpacity.value = 0.55;
      gh.mesh.position.copy(hero.position); gh.mesh.position.z -= 0.05; gh.mesh.visible = true; gh.t = 0; gh.vx = -0.9;
    }
    // hero wandering state: runs around its corner, hops, twirls, stands still while casting
    var HB = { x: 0, z: 0, tx: 0, tz: 0, y: 0, vy: 0, st: 1.0, face: 1, faceT: 1, lock: 0, walk: 0, speed: 2.2 };
    var HERO_ZONE = { x0: -0.9, x1: 0.9, z0: -0.7, z1: 0.6 };
    function heroFaceTo(x) { if (Math.abs(x - HB.x) > 0.15) HB.faceT = x < HB.x ? -1 : 1; }
    function heroDodge() {
      if (HB.y > 0.05 || HB.lock > 0) return;
      HB.vy = 4.2; HB.tx = Math.max(HERO_ZONE.x0, Math.min(HERO_ZONE.x1, HB.x + rr(-0.7, 0.7))); HB.tz = Math.max(HERO_ZONE.z0, Math.min(HERO_ZONE.z1, HB.z + rr(-0.5, 0.5))); HB.st = rr(0.6, 1.0);
    }

    // ---------- monsters ----------
    var FIELD = { z0: -4.6, z1: 3.8 };
    function halfX(z) { return 2.2 + (3.8 - z) * 0.16; }
    function clampField(p) { p.z = Math.max(FIELD.z0, Math.min(FIELD.z1, p.z)); var hx = halfX(p.z); p.x = Math.max(-hx, Math.min(hx, p.x)); return p; }
    function ringSpot(r0, r1, boss) {
      var a = rr(0, Math.PI * 2), r = rr(r0, r1);
      if (boss) a = rr(-Math.PI * 0.85, -Math.PI * 0.15);
      return clampField({ x: HB.x + Math.cos(a) * r, z: HB.z + Math.sin(a) * r * 1.15 });
    }
    var FLYERS = { B2: 1, B7: 1 };
    function freeSpot(boss) {
      var best = null, bestD = -1;
      for (var k = 0; k < 14; k++) {
        var p = boss ? ringSpot(1.7, 2.4, true) : ringSpot(1.3, 3.4), dmin = 9;
        mobs.forEach(function (m) { var dd = Math.hypot(m.tx - p.x, m.tz - p.z); if (dd < dmin) dmin = dd; });
        if (dmin > bestD) { bestD = dmin; best = p; }
      }
      return best;
    }
    // def.entry: 'run' (rush in from the right), 'leap' (jump in), 'drop' (fall from the sky)
    function spawnMob(def) {
      var g = billboard(def.art, def.height || 1.25, def.tint), boss = !!def.boss, spot = freeSpot(boss);
      var entry = boss ? 'run' : def.entry || 'run';
      var mob = { group: g, hp: def.hp, maxHp: def.hp, boss: boss, regionBoss: !!def.regionBoss, alive: true, name: def.name,
        x: 0, z: 0, y: 0, vy: 0, tx: spot.x, tz: spot.z,
        state: 'enter', st: 0, speed: boss ? 1.5 : rr(2.6, 3.6), entry: entry, arrived: false, stun: 0, atk: 0, struck: false,
        flash: 0, frozen: 0, shocked: 0, freezeV: 0, phase: g.userData.seed, kx: spring(80, 9), face: 1, walk: 0, hurt: 0,
        flyer: !!FLYERS[def.art.id], cheer: 0, vx: 0, vz: 0, sp: 0 };
      // come in from the nearest screen edge: left, right, the far side or the near side
      var ang = Math.atan2((spot.z - HB.z) / 1.15, spot.x - HB.x), cx = Math.cos(ang), cz = Math.sin(ang);
      if (boss) { mob.x = spot.x * 0.4; mob.z = FIELD.z0 - 2.5; }
      else if (Math.abs(cx) > Math.abs(cz) * 0.8) { mob.x = (cx > 0 ? 1 : -1) * (halfX(spot.z) + rr(1.2, 2)); mob.z = spot.z + rr(-0.6, 0.6); }
      else if (cz < 0) { mob.x = spot.x + rr(-1, 1); mob.z = FIELD.z0 - rr(1.5, 2.5); }
      else { mob.x = spot.x + rr(-1, 1); mob.z = FIELD.z1 + rr(1.6, 2.4); }
      if (entry === 'leap') { mob.vy = rr(5.5, 7.5); mob.speed = rr(3.2, 4.2); }
      if (entry === 'drop') { mob.x = spot.x; mob.z = spot.z; mob.y = rr(4.5, 6.5); mob.speed = 0; }
      g.position.set(mob.x, mob.y, mob.z);
      if (def.regionBoss || boss) {
        var glow = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: def.regionBoss ? 0xff4f7a : 0xffd84a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: def.regionBoss ? 0.75 : 0.45 }));
        glow.scale.setScalar(g.userData.h * 1.6); glow.position.set(0, g.userData.h * 0.5, -0.1); glow.renderOrder = 2; g.add(glow); g.userData.glow = glow;
      }
      mobGroup.add(g); mobs.push(mob);
      return mob;
    }
    // power: 0.5 small poke … 2 huge blast. Pushes away from the hero, bends the top back, snaps the head.
    function hitMob(mob, crit, power) {
      var p = (power || 1) * (crit ? 1.5 : 1), d = mob.group.userData, heavy = mob.boss ? 0.45 : 1;
      mob.flash = Math.min(0.5, 0.28 + 0.12 * p);
      d.bend.v += 2.6 * p * heavy; d.sq.v -= 2.2 * p * heavy;
      mob.kx.v += 2.2 * p * heavy;
      mob.hurt = Math.min(1, mob.hurt + 0.6 * p);
      if (!mob.boss || p > 1.4) mob.stun = Math.max(mob.stun, mob.boss ? 0.12 : 0.22 + 0.08 * p);
      if (!mob.boss && p >= 1.6 && mob.y <= 0.01) mob.vy = Math.max(mob.vy, 2 + p);
      if (crit) shake(0.18 * p);
    }
    function killMob(mob, edge, big) {
      if (!mob.alive) return;
      mob.alive = false; mobs.splice(mobs.indexOf(mob), 1); mob.deadT = 0; mob.deadLife = big ? 1.15 : 0.85;
      var d = mob.group.userData; d.u.uEdge.value.setHex(edge || 0xffd84a); d.sq.v += 3; d.bend.v += 2;
      if (d.glow) d.glow.visible = false;
      // knocked flying away from the hero, spinning
      mob.fvx = big ? 0.3 : rr(1.6, 3.6); mob.fvy = big ? 1.2 : rr(3, 5.5); mob.fspin = big ? 0 : (Math.random() < 0.5 ? -1 : 1) * rr(5, 11); mob.bounced = false;
      dying.push(mob);
      if (hooks.die) hooks.die(mob, mobPos(mob), big);
    }
    function disposeGroup(g) { g.traverse(function (x) { if (x.geometry && !x.geometry.userData.cached) x.geometry.dispose(); if (x.material && x.material.dispose) x.material.dispose(); }); }
    function clearMobs() { mobs.slice().forEach(function (m) { mobGroup.remove(m.group); disposeGroup(m.group); }); mobs.length = 0; dying.forEach(function (m) { mobGroup.remove(m.group); disposeGroup(m.group); }); dying.length = 0; }
    function mobPos(mob) { var g = mob.group, h = g.userData.h * 0.5; return new T.Vector3(g.position.x, h * COS_T + g.position.y, g.position.z - h * SIN_T + 0.15); }
    function mobTop(mob) { var g = mob.group, h = g.userData.h * 0.92; return new T.Vector3(g.position.x, h * COS_T + g.position.y, g.position.z - h * SIN_T + 0.15); }

    // ---------- tier aura ----------
    var AURA = [null, 0xff6a2b, 0x9fd8ff, 0xbfefff, 0xffe14a, 0xe6e6ff, 0xffd84a, 0xb04bff, 0xffffff];
    var aura = { ring: null, orbs: [], wings: [], crown: null };
    function setTierAura(tier) {
      while (auraGroup.children.length) auraGroup.remove(auraGroup.children[0]);
      aura = { ring: null, orbs: [], wings: [], crown: null };
      var col = tier < 2 ? 0xffe9a0 : AURA[tier - 1];
      var ring = new T.Mesh(new T.RingGeometry(0.62, 0.7, 48), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.renderOrder = 2; auraGroup.add(ring); aura.ring = ring;
      if (tier < 2) { ring.material.opacity = 0.7; return; }
      if (tier >= 3) { var r2 = ring.clone(); r2.material = ring.material.clone(); r2.scale.setScalar(0.72); auraGroup.add(r2); aura.ring2 = r2; }
      if (tier >= 5) for (var i = 0; i < (tier >= 7 ? 5 : 3); i++) { var o = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: col, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); o.scale.setScalar(0.32); o.renderOrder = 4; auraGroup.add(o); aura.orbs.push(o); }
      if (tier >= 9) { var cr = new T.Mesh(new T.TorusGeometry(0.28, 0.035, 8, 32), new T.MeshBasicMaterial({ color: 0xffe14a })); cr.position.set(0, 1.95, 0); cr.rotation.x = Math.PI / 2.4; auraGroup.add(cr); aura.crown = cr; var cg = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: 0xfff2a0, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); cg.scale.setScalar(0.9); cg.position.copy(cr.position); cg.renderOrder = 4; auraGroup.add(cg); }
    }

    // ---------- worn costume: an aura hugging the wizard's outline and a soft light behind ----------
    function attachAura() {
      var f = cos.fx; if (!hero || !f) return;
      var hu = hero.userData.u, body = hero.userData.body, dark = /shadow|void|doom/.test(f.parts || '');
      var mat = new T.ShaderMaterial({
        uniforms: { map: hu.map, uBend: hu.uBend, uScale: hu.uScale, uH: hu.uH, uBP: hu.uBP, uBA: hu.uBA, uBT: hu.uBT,
          uCol: { value: new T.Color(f.col) }, uCol2: { value: new T.Color(f.col2 || f.col) }, uTime: { value: 0 }, uAmt: { value: f.aura }, uAdd: { value: dark ? 0 : 1 } },
        vertexShader: BB_VS, fragmentShader: AURA_FS, transparent: true, depthWrite: false, blending: dark ? T.NormalBlending : T.AdditiveBlending, side: T.DoubleSide });
      var am = new T.Mesh(body.geometry, mat); am.scale.set(1.2, 1.12, 1); am.position.z = -0.03; am.renderOrder = 2;
      body.add(am); cos.aura = am;
    }
    function setCostumeFx(f) {
      while (cosGroup.children.length) cosGroup.remove(cosGroup.children[0]);
      if (cos.aura && cos.aura.parent) cos.aura.parent.remove(cos.aura);
      cos = { fx: f, aura: null, glow: null };
      if (!f) return;
      attachAura();
      var gl = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: f.col, transparent: true, opacity: f.glow, depthWrite: false, blending: T.AdditiveBlending }));
      gl.scale.set(1.9, 2.3, 1); gl.position.set(0, 0.85, -0.4); gl.renderOrder = 1; cosGroup.add(gl); cos.glow = gl;
    }
    function costumeTick(dt) {
      if (!cos.fx) return;
      if (cos.aura) { var u = cos.aura.material.uniforms; u.uTime.value = time; u.uAmt.value = cos.fx.aura * (0.82 + Math.sin(time * 2.2) * 0.18); }
      if (cos.glow) { cos.glow.material.opacity = cos.fx.glow * (0.8 + Math.sin(time * 2.2) * 0.2); if (hero) cos.glow.position.set(hero.position.x, 0.85 + hero.position.y, hero.position.z - 0.4); }
    }

    // ---------- damage numbers (DOM overlay) ----------
    var pool = [];
    for (var p = 0; p < 40; p++) { var d = document.createElement('div'); d.className = 'dmg'; overlay.appendChild(d); pool.push({ el: d, t: 0, x: 0, y: 0, live: false, crit: false, dir: 1 }); }
    var tmpV = new T.Vector3();
    function screenPos(pos) {
      tmpV.copy(pos).project(camera);
      return { x: (tmpV.x * 0.5 + 0.5) * canvas.clientWidth, y: (-tmpV.y * 0.5 + 0.5) * canvas.clientHeight };
    }
    function damageText(pos, text, crit, color) {
      var slot = null; for (var i = 0; i < pool.length; i++) if (!pool[i].live) { slot = pool[i]; break; }
      if (!slot) { slot = pool[0]; for (var j = 1; j < pool.length; j++) if (pool[j].t > slot.t) slot = pool[j]; }
      var sp = screenPos(pos);
      slot.x = sp.x + (Math.random() - 0.5) * 34; slot.y = sp.y - 14 - Math.random() * 12;
      var tier = crit === true ? 1 : (+crit || 0), TT = CW.DATA && CW.DATA.critTiers;
      slot.t = 0; slot.live = true; slot.crit = tier > 0; slot.tier = tier; slot.dir = Math.random() < 0.5 ? -1 : 1;
      slot.el.innerHTML = (tier >= 2 && TT ? '<small>' + TT[tier - 1].name + '</small>' : '') + text;
      slot.el.className = 'dmg' + (tier ? ' crit c' + tier : '');
      slot.el.style.color = tier ? '' : (color || '');
    }

    // ---------- screen effects ----------
    function layer(bg) { var el = document.createElement('div'); el.style.cssText = 'position:absolute;inset:0;opacity:0;pointer-events:none;background:' + bg; overlay.appendChild(el); return el; }
    // darkening drawn inside the scene: after the world and the characters, before the spell effects
    var dimMat = new T.ShaderMaterial({ uniforms: { uDim: { value: 0 } }, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform float uDim; varying vec2 vUv; void main(){ vec2 p = (vUv - vec2(0.55, 0.45)) * vec2(1.0, 1.25); float v = smoothstep(0.15, 0.75, length(p)); vec3 c = mix(vec3(0.07, 0.03, 0.15), vec3(0.02, 0.0, 0.06), v); gl_FragColor = vec4(c, uDim * (0.72 + 0.28 * v)); }' });
    var dimMesh = new T.Mesh(new T.PlaneGeometry(2, 2), dimMat); dimMesh.frustumCulled = false; dimMesh.renderOrder = 8; dimMesh.visible = false; scene.add(dimMesh);
    var flashEl = layer('#fff'); flashEl.className = 'screen-flash';
    var flashA = 0, dimA = 0, dimTarget = 0, dimT = 0;
    function flash(color, amount) { flashEl.style.background = color; flashA = Math.max(flashA, Math.min(0.42, amount)); }
    function dim(amount, dur) { dimTarget = Math.max(dimTarget, Math.min(0.32, amount)); dimT = Math.max(dimT, dur || 0.5); }
    var trauma = 0, punchV = 0, punch = 0, kick = new T.Vector3();
    function shake(a) { trauma = Math.min(1, trauma + a * 1.8); }
    function camPunch(a, dir) { punchV += a * 14; if (dir) kick.add(dir.clone().multiplyScalar(a * 0.3)); }

    // ---------- lights from spells (tint the billboards) ----------
    var lights = [];
    function light(pos, color, intensity, life) { if (lights.length > 12) lights.shift(); lights.push({ p: pos.clone(), c: new T.Color(color), i: intensity || 1, t: 0, life: life || 0.3 }); }
    function lightAt(pos, out) {
      out.setRGB(0, 0, 0);
      for (var i = 0; i < lights.length; i++) {
        var L = lights[i], k = L.t / L.life; if (k >= 1) continue;
        var dx = L.p.x - pos.x, dy = L.p.y - pos.y, dz = L.p.z - pos.z, f = L.i * (1 - k) * (1 - k) / (1 + 1.3 * (dx * dx + dy * dy + dz * dz));
        out.r += L.c.r * f; out.g += L.c.g * f; out.b += L.c.b * f;
      }
      out.r = Math.min(out.r, 0.32); out.g = Math.min(out.g, 0.32); out.b = Math.min(out.b, 0.32);
      return out;
    }

    // ---------- time control (hit-stop / slow motion) ----------
    var stopT = 0, slowT = 0, slowS = 1, lastStop = -9;
    function hitStop(sec) { if (time - lastStop < 0.22) return; lastStop = time; stopT = Math.max(stopT, sec); }
    function slowmo(sec, s) { slowT = Math.max(slowT, sec); slowS = s; }
    function scaleDt(dt) {
      if (stopT > 0) { stopT -= dt; return dt * 0.04; }
      if (slowT > 0) { slowT -= dt; return dt * slowS; }
      return dt;
    }


    var tmpC = new T.Color();
    function driveBillboard(g, dt, rest, face) {
      var d = g.userData;
      d.bend.target = rest.bend || 0; d.sq.target = rest.sq || 0; d.lift.target = rest.lift || 0; d.slide.target = rest.slide || 0;
      stepSpring(d.bend, dt); stepSpring(d.sq, dt); stepSpring(d.lift, dt); stepSpring(d.slide, dt);
      var sq = Math.max(-0.35, Math.min(0.45, d.sq.x));
      d.u.uBend.value = Math.max(-0.5, Math.min(0.5, d.bend.x));
      d.u.uScale.value.set((1 - sq * 0.55) * (face === undefined ? 1 : face), 1 + sq);
    }

    // ---------- hero brain ----------
    function heroBrain(dt) {
      var hd = hero.userData;
      HB.lock = Math.max(0, HB.lock - dt); HB.st -= dt;
      if (HB.lock <= 0 && HB.st <= 0 && HB.y <= 0.01) {
        var r = Math.random();
        if (r < 0.6) { HB.tx = rr(HERO_ZONE.x0, HERO_ZONE.x1); HB.tz = rr(HERO_ZONE.z0, HERO_ZONE.z1); HB.speed = Math.random() < 0.7 ? rr(1.0, 1.4) : rr(1.9, 2.4); HB.st = rr(1.4, 3.0); if (Math.random() < 0.15) HB.vy = rr(3.6, 4.4); }
        else if (r < 0.78) { HB.vy = 5.4; HB.st = rr(0.9, 1.5); flipT = 0; flipDur = 0.45; }
        else HB.st = rr(0.5, 1.3);
      }
      var dx = HB.tx - HB.x, dz = HB.tz - HB.z, dist = Math.sqrt(dx * dx + dz * dz);
      var want = HB.lock > 0 || dist < 0.04 ? 0 : Math.min(HB.speed, dist * 2.2);
      var wx = dist > 1e-4 ? dx / dist * want : 0, wz = dist > 1e-4 ? dz / dist * want : 0, acc = Math.min(1, dt * (want > 0 ? 5 : 8));
      HB.vx = (HB.vx || 0) + (wx - (HB.vx || 0)) * acc; HB.vz = (HB.vz || 0) + (wz - (HB.vz || 0)) * acc;
      HB.x += HB.vx * dt; HB.z += HB.vz * dt;
      HB.sp = Math.sqrt(HB.vx * HB.vx + HB.vz * HB.vz); var moving = HB.sp > 0.12;
      HB.walk = Math.min(1, HB.sp / 1.2);
      if (moving && Math.abs(HB.vx) > 0.25 && HB.lock <= 0) HB.faceT = HB.vx < 0 ? -1 : 1;
      HB.face += (HB.faceT - HB.face) * Math.min(1, dt * 11);
      HB.y += HB.vy * dt; HB.vy -= 17 * dt;
      if (HB.y <= 0) { if (HB.vy < -3.2) { hd.sq.v -= 2.4; if (hooks.land) hooks.land(new T.Vector3(HB.x, 0.03, HB.z), false); } HB.y = 0; HB.vy = 0; }
      heroGroup.position.set(HB.x, 0, HB.z);
      return moving;
    }

    // ---------- monster brain ----------
    var KEEP = 1.0;
    function chargers() { var n = 0; mobs.forEach(function (m) { if (m.state === 'charge' || m.state === 'swipe') n++; }); return n; }
    function setGoal(m, x, z, speed, state) { var p = clampField({ x: x, z: z }); m.tx = p.x; m.tz = p.z; m.speed = speed; m.state = state; }
    function nearHero(m, dist) { var dx = m.x - HB.x, dz = (m.z - HB.z) / 1.15, d = Math.sqrt(dx * dx + dz * dz) || 1; return { x: HB.x + dx / d * dist, z: HB.z + dz / d * dist * 1.15 }; }
    function nextAction(m) {
      if (m.boss) return bossAction(m);
      var r = Math.random();
      if (r < 0.4) { var w = ringSpot(1.2, 3.4); setGoal(m, (m.x + w.x) / 2, (m.z + w.z) / 2, rr(0.8, 1.3), 'wander'); }
      else if (r < 0.64 && chargers() < 3) { var c = nearHero(m, KEEP + 0.1); setGoal(m, c.x, c.z, rr(3.2, 4.0), 'charge'); }
      else if (r < 0.78) { m.state = 'hop'; m.st = 0.05; m.jumped = false; }
      else if (r < 0.9) { m.state = 'taunt'; m.st = rr(0.8, 1.3); }
      else { m.state = 'idle'; m.st = rr(0.4, 1.0); }
    }
    function bossAction(m) {
      var r = Math.random();
      if (r < 0.34) { var w = ringSpot(1.6, 2.6, true); setGoal(m, w.x, w.z, m.flyer ? 1.6 : 1.25, 'wander'); }
      else if (r < 0.56) { m.state = 'roar'; m.st = 1.3; m.roared = false; }
      else if (r < 0.8) { m.state = 'windup'; m.st = 0.45; }
      else { m.state = 'slam'; m.st = 0.3; m.jumped = false; }
    }
    function mobBrain(m, dt) {
      var g = m.group, d = g.userData;
      m.atk = Math.max(0, m.atk - dt * 3); m.cheer = 0;
      if (m.frozen > 0 || m.pull !== undefined) { m.walk = 0; m.vx = m.vz = m.sp = 0; return; }
      if (m.stun > 0) { m.stun -= dt; m.walk *= 0.8; m.vx *= 0.8; m.vz *= 0.8; m.sp = 0; return; }
      m.st -= dt;
      var st = m.state, moving = false;
      if (st === 'enter' || st === 'wander' || st === 'charge' || st === 'back') {
        var dx = m.tx - m.x, dz = m.tz - m.z, dist = Math.sqrt(dx * dx + dz * dz);
        var want = m.speed > 0 && dist > 0.05 ? Math.min(m.speed, dist * (st === 'charge' ? 6 : 2.5) + 0.3) : 0;
        var acc = Math.min(1, dt * (st === 'charge' ? 9 : 4.5));
        m.vx += ((dist > 1e-4 ? dx / dist * want : 0) - m.vx) * acc; m.vz += ((dist > 1e-4 ? dz / dist * want : 0) - m.vz) * acc;
        if (dist > 0.05 && m.speed > 0) {
          m.x += m.vx * dt; m.z += m.vz * dt; moving = true;
          if (Math.abs(m.vx) > 0.25) m.face = m.vx < 0 ? 1 : -1;
          if (st === 'enter' && dist < 1.2 && m.boss) m.speed = Math.max(0.9, m.speed * 0.98);
        } else if (m.y <= 0.01 || m.flyer) {
          var fh = HB.x < m.x ? 1 : -1;
          if (st === 'enter') { m.arrived = true; m.face = fh; m.state = 'idle'; m.st = rr(0.2, 0.9); if (m.boss && hooks.roar) { m.state = 'roar'; m.st = 1.3; m.roared = false; } }
          else if (st === 'charge') { m.state = 'swipe'; m.st = m.boss ? 0.55 : 0.4; m.struck = false; m.face = fh; }
          else { m.state = 'idle'; m.st = rr(0.4, 1.6); m.face = fh; }
        }
      } else if (st === 'idle') {
        if (m.st <= 0) nextAction(m);
      } else if (st === 'swipe') {
        m.atk = 1;
        if (!m.struck && m.st < (m.boss ? 0.3 : 0.22)) { m.struck = true; d.bend.v -= m.boss ? 3 : 2.5; if (hooks.swipe) hooks.swipe(m); heroDodge(); if (m.boss) shake(0.2); }
        if (m.st <= 0) { var bk = m.boss ? ringSpot(1.7, 2.5, true) : ringSpot(1.6, 3.3); setGoal(m, bk.x, bk.z, m.boss ? 2.2 : rr(2.0, 2.8), 'back'); }
      } else if (st === 'hop') {
        if (!m.jumped && m.y <= 0.01) { m.jumped = true; m.vy = rr(4.5, 6.2); d.sq.v += 2.5; }
        else if (m.jumped && m.y <= 0.01 && m.vy === 0) { m.state = 'idle'; m.st = rr(0.3, 0.9); }
      } else if (st === 'taunt') {
        m.cheer = 1; if (m.y <= 0.01 && Math.random() < dt * 3) m.vy = 2.6;
        if (m.st <= 0) { m.state = 'idle'; m.st = rr(0.3, 0.8); }
      } else if (st === 'roar') {
        m.cheer = 0.6;
        if (!m.roared && m.st < 1.0) { m.roared = true; d.sq.v += 3.5; shake(0.35); if (hooks.roar) hooks.roar(m); }
        if (m.st <= 0) { m.state = 'idle'; m.st = rr(0.6, 1.2); }
      } else if (st === 'windup') {
        d.sq.target = -0.15; m.atk = 0.4;
        if (m.st <= 0) { var bc = nearHero(m, KEEP + 0.7); setGoal(m, bc.x, bc.z, 5.2, 'charge'); }
      } else if (st === 'slam') {
        if (!m.jumped && m.st <= 0) { m.jumped = true; m.vy = m.flyer ? 6 : 7.5; d.sq.v += 3; }
        else if (m.jumped && m.y <= 0.01 && m.vy === 0) { m.state = 'idle'; m.st = rr(0.6, 1.1); }
      }
      if (m.pull === undefined) { var ddx = m.x - HB.x, ddz = (m.z - HB.z) / 1.15, dd = Math.sqrt(ddx * ddx + ddz * ddz), keep = m.boss ? KEEP + 0.6 : KEEP; if (dd < keep && dd > 1e-3) { var pushK = Math.min(1, dt * 8) * (keep - dd) / dd; m.x += ddx * pushK; m.z += ddz * 1.15 * pushK; } }
      if (m.state === 'idle' || m.state === 'taunt' || m.state === 'roar') m.face = HB.x < m.x ? 1 : -1;
      if (!moving) { m.vx *= Math.max(0, 1 - dt * 8); m.vz *= Math.max(0, 1 - dt * 8); }
      m.sp = Math.sqrt(m.vx * m.vx + m.vz * m.vz); m.walk = Math.min(1, m.sp / 1.4);
    }
    function separate() {
      for (var i = 0; i < mobs.length; i++) for (var j = i + 1; j < mobs.length; j++) {
        var a = mobs[i], b = mobs[j], need = (a.boss || b.boss) ? 1.15 : 0.62, dx = b.x - a.x, dz = (b.z - a.z) * 1.4, dd = Math.sqrt(dx * dx + dz * dz);
        if (dd < need && dd > 1e-4) {
          var push = (need - dd) * 0.5, nx = dx / dd, nz = dz / dd;
          var wa = a.boss ? 0.15 : (b.boss ? 1.85 : 1), wb = 2 - wa;
          if (a.pull === undefined) { a.x -= nx * push * wa * 0.6; a.z -= nz * push * wa * 0.4; }
          if (b.pull === undefined) { b.x += nx * push * wb * 0.6; b.z += nz * push * wb * 0.4; }
        }
      }
    }

    function update(dt, realDt) {
      var rdt = realDt === undefined ? dt : realDt;
      time += dt;
      // hero
      if (hero) {
        var moving = heroBrain(dt);
        var hd = hero.userData, rest = { bend: Math.sin(time * 1.3) * 0.018 + (HB.vx || 0) * 0.03, sq: Math.sin(time * 2.4) * 0.016, lift: 0, slide: 0 };
        var arms = { walk: HB.walk, speed: HB.sp, stride: 0.34, air: HB.y > 0.08, armR: 0, armL: 0, head: 0, wag: 0 };
        if (pose) {
          var P = pose.P; pose.t += dt;
          if (pose.t < pose.a) { var k = pose.t / pose.a, e = k * k * (3 - 2 * k); rest.bend += P.ab * e; rest.sq += P.as * e; rest.slide = P.ax * e; arms.armR = P.aR * e; arms.armL = P.aL * e; }
          else {
            if (!pose.rel) {
              pose.rel = true; hd.bend.v += P.rb; hd.sq.v += P.rs; hd.lift.v += P.rl; hd.slide.v += P.rx;
              hd.anim.aR.v += (P.rR - P.aR) * 9; hd.anim.aL.v += (P.rL - P.aL) * 7;
              if (P.flip) { flipT = 0; flipDur = P.flip; }
              heroGlow = Math.max(heroGlow, 0.8);
            }
            var kk = Math.min(1, (pose.t - pose.a) / 0.42); rest.bend += P.hb * (1 - kk); rest.sq += P.hs * (1 - kk);
            arms.armR = P.rR * (1 - kk * kk); arms.armL = P.rL * (1 - kk * kk);
            if (pose.t > pose.a + 0.6) pose = null;
          }
          arms.walk = 0;
        }
        var stepped = animRig(hero, dt, arms);
        if (stepped && hooks.step) hooks.step(new T.Vector3(HB.x, 0.03, HB.z), false);
        rest.bend += Math.sin(hd.anim.ph) * 0.035 * hd.anim.walk;
        driveBillboard(hero, dt, rest, HB.face);
        if (flipT < 1) { flipT = Math.min(1, flipT + dt / flipDur); hd.u.uScale.value.x *= Math.cos(flipT * Math.PI * 2); }
        var bounce = HB.y <= 0.01 ? Math.abs(Math.sin(hd.anim.ph)) * (0.025 + 0.035 * Math.min(1, HB.sp / 2.2)) * hd.anim.walk : 0;
        hero.position.y = Math.max(0, hd.lift.x) * 0.12 + HB.y + bounce; hero.position.x = hd.slide.x * 0.12;
        hd.shadow.position.y = 0.012 - hero.position.y;
        hd.shadow.scale.setScalar(1 - Math.min(0.5, hero.position.y * 0.6));
        lightAt(heroCenter(), hd.light); hd.light.r += heroGlowCol.r * heroGlow * 0.22; hd.light.g += heroGlowCol.g * heroGlow * 0.22; hd.light.b += heroGlowCol.b * heroGlow * 0.22;
        hd.u.uLight.value.copy(hd.light);
        heroGlow = Math.max(0, heroGlow - dt * 2.6);
      }
      ghosts.forEach(function (gh) {
        if (gh.t >= gh.life) { gh.mesh.visible = false; return; }
        gh.t += dt; var k = gh.t / gh.life; gh.mesh.position.x += gh.vx * dt; gh.mesh.material.uniforms.uOpacity.value = 0.5 * (1 - k);
        gh.mesh.material.uniforms.uScale.value.multiplyScalar(1 + dt * 0.25);
      });
      if (aura.ring) { aura.ring.rotation.z += dt * 0.8; aura.ring.material.opacity = 0.6 + Math.sin(time * 3) * 0.25; }
      if (aura.ring2) aura.ring2.rotation.z -= dt * 1.4;
      aura.orbs.forEach(function (o, i) { var a = time * 1.6 + i * Math.PI * 2 / aura.orbs.length; o.position.set(Math.cos(a) * 0.75, 1.0 + Math.sin(time * 2 + i) * 0.25, Math.sin(a) * 0.45); });
      aura.wings.forEach(function (w, i) { w.rotation.y = (i ? -1 : 1) * (0.25 + Math.sin(time * 2.2) * 0.18); });
      if (aura.crown) aura.crown.rotation.z += dt;
      costumeTick(dt);
      // monsters
      mobs.forEach(function (m) { mobBrain(m, dt); });
      separate();
      mobs.forEach(function (m) {
        var g = m.group, d = g.userData, u = d.u, frozen = m.frozen > 0;
        if (frozen) m.frozen -= dt;
        if (m.shocked > 0) m.shocked -= dt;
        // vertical motion: jumps, falls, flyers hover
        if (!frozen) {
          var grav = m.boss ? 22 : 18;
          m.y += m.vy * dt; m.vy -= grav * dt;
          if (m.y <= 0) {
            if (m.vy < -3) { d.sq.v -= m.boss ? 3.2 : 2.6; if (hooks.land) hooks.land(new T.Vector3(m.x, 0.03, m.z), m.boss || m.vy < -9); if (m.boss) shake(m.state === 'slam' ? 0.55 : 0.12); if (m.boss && m.state === 'slam' && hooks.slam) hooks.slam(m); }
            m.y = 0; m.vy = 0;
          }
        }
        var rest = { bend: Math.sin(time * 1.7 + m.phase) * 0.02, sq: Math.sin(time * 2.6 + m.phase) * 0.02 };
        if (m.pull !== undefined) { m.x += (m.pull - m.x) * Math.min(1, dt * 5); if (m.pullZ !== undefined) m.z += (m.pullZ - m.z) * Math.min(1, dt * 5); rest.bend = Math.sin(time * 18 + m.phase) * 0.18; rest.sq = -0.12; }
        rest.bend += m.vx * 0.035 + Math.sin(d.anim.ph) * 0.04 * d.anim.walk;
        if (m.state === 'windup') { rest.sq = -0.16; rest.bend = 0.12; }
        m.hurt = Math.max(0, m.hurt - dt * 3);
        var P = { walk: frozen ? 0 : m.walk, speed: m.sp, stride: m.boss ? 0.55 : 0.3, air: m.y > 0.12, armL: -m.atk * 1.15, armR: m.atk * 0.3, hurt: m.hurt, cheer: m.cheer, stepRate: m.boss ? 0.65 : 1,
          flap: m.flyer ? 0.32 : m.boss ? 0.16 : 0.1, flapF: m.flyer ? 9 : 6, wingOpen: m.state === 'roar' ? 0.25 : 0 };
        if (m.pull !== undefined) { P.cheer = 1; P.hurt = 0.8; }
        var stepped = frozen ? false : animRig(g, frozen ? 0 : dt, P);
        if (stepped && m.boss && !m.flyer) { shake(0.05); if (hooks.step) hooks.step(new T.Vector3(m.x, 0.03, m.z), true); }
        if (frozen) { d.bend.v *= 0.5; d.sq.v *= 0.5; }
        m.freezeFace = m.face;
        d.face += (m.face - d.face) * Math.min(1, dt * 9);
        driveBillboard(g, frozen ? dt * 0.15 : dt, rest, d.face);
        stepSpring(m.kx, dt);
        var hover = m.flyer ? 0.4 + Math.sin(time * 2.4 + m.phase) * 0.12 : 0;
        var bounce = m.y <= 0.01 ? Math.abs(Math.sin(d.anim.ph)) * (m.boss ? 0.03 : 0.02 + 0.045 * Math.min(1, m.sp / 3)) * d.anim.walk : 0;
        g.position.set(m.x + m.kx.x * 0.12, m.y + hover + bounce, m.z);
        g.rotation.z = m.pull !== undefined ? Math.sin(time * 9 + m.phase) * 0.12 : (m.y > 0.2 && !m.boss ? -m.vy * 0.015 * d.face : 0);
        d.shadow.position.y = 0.012 - g.position.y;
        d.shadow.scale.setScalar(Math.max(0.35, 1 - g.position.y * 0.35));
        m.freezeV += ((frozen ? 1 : 0) - m.freezeV) * Math.min(1, dt * 10);
        u.uFreeze.value = m.freezeV;
        u.uFlash.value = m.flash; m.flash = Math.max(0, m.flash - dt * 14);
        u.uFlashCol.value.setHex(m.shocked > 0 && Math.random() < 0.3 ? 0xbfe6ff : 0xffffff);
        if (m.shocked > 0 && Math.random() < dt * 6) u.uFlash.value = Math.max(u.uFlash.value, 0.5);
        u.uLight.value.copy(lightAt(mobPos(m), tmpC));
        if (d.glow) d.glow.material.opacity = (m.regionBoss ? 0.6 : 0.35) + Math.sin(time * 3) * 0.15;
      });
      for (var i = dying.length - 1; i >= 0; i--) {
        var m = dying[i], g = m.group, dd = g.userData; m.deadT += dt; var k2 = m.deadT / m.deadLife;
        driveBillboard(g, dt, { bend: 0, sq: 0 }, dd.face);
        animRig(g, dt, { hurt: 1, cheer: 0.6, air: true });
        m.x += m.fvx * dt; m.y += m.fvy * dt; m.fvy -= 15 * dt;
        if (m.y < 0) { m.y = 0; if (!m.bounced && m.fvy < -2) { m.bounced = true; m.fvy = -m.fvy * 0.35; m.fvx *= 0.5; m.fspin *= 0.4; } else m.fvy = 0; }
        g.position.set(m.x, m.y, m.z); g.rotation.z += m.fspin * dt;
        dd.u.uDissolve.value = Math.min(1.05, Math.max(0, k2 - 0.15) * 1.25);
        dd.u.uFlash.value = Math.max(0, 0.6 - k2 * 2);
        dd.shadow.position.y = 0.012 - m.y; dd.shadow.material.opacity = 0.2 * (1 - k2);
        if (k2 >= 1) { mobGroup.remove(g); disposeGroup(g); dying.splice(i, 1); }
      }
      lights.forEach(function (L) { L.t += dt; }); while (lights.length && lights[0].t >= lights[0].life) lights.shift();
      if (painted) painted.update(dt, vh * renderer.getPixelRatio());
      // numbers
      pool.forEach(function (s) {
        if (!s.live) return; s.t += rdt; var dur = s.crit ? 1.05 + 0.15 * (s.tier || 0) : 0.8, k = s.t / dur;
        if (k >= 1) { s.live = false; s.el.style.opacity = 0; return; }
        var pop = s.crit ? (k < 0.12 ? 0.3 + k / 0.12 * 1.2 : k < 0.24 ? 1.5 - (k - 0.12) / 0.12 * 0.4 : 1.1) : (k < 0.1 ? 0.5 + k / 0.1 * 0.7 : 1.2 - Math.min(0.2, k - 0.1));
        var rise = s.crit ? k * 38 : (k * 52 - k * k * 10), side = s.crit ? Math.sin(k * 40) * 3 * (1 - k) : s.dir * k * 14;
        s.el.style.opacity = k > 0.72 ? (1 - k) / 0.28 : 1;
        s.el.style.transform = 'translate(' + (s.x + side) + 'px,' + (s.y - rise) + 'px) translate(-50%,-50%) scale(' + pop + ')';
      });
      // camera: smooth trauma shake, punch zoom, slow drift
      trauma = Math.max(0, trauma - rdt * 1.25);
      var tq = trauma * trauma, st = time * 1.0 + performance.now() * 0.001;
      var sx = (Math.sin(st * 37.1) + Math.sin(st * 23.7 + 1.3) * 0.6) * 0.3 * tq, sy = (Math.sin(st * 41.3 + 2.1) + Math.sin(st * 29.9) * 0.6) * 0.26 * tq;
      punchV += (-punch * 140 - punchV * 16) * rdt; punch += punchV * rdt;
      kick.multiplyScalar(Math.max(0, 1 - rdt * 7));
      if (Math.abs(viewShift - viewShiftT) > 0.001) { viewShift += (viewShiftT - viewShift) * Math.min(1, rdt * 9); applyShift(); }
      camera.position.set(camBase.x + sx + kick.x + Math.sin(time * 0.35) * 0.06, camBase.y + sy + kick.y + Math.sin(time * 0.5) * 0.03, camBase.z + kick.z);
      camera.lookAt(lookAt.x + sx * 0.3, lookAt.y + sy * 0.3, lookAt.z);
      camera.rotation.z += (Math.sin(st * 19.3) * 0.012) * tq;
      camera.fov = baseFov * (1 - Math.max(-0.2, Math.min(0.2, punch))); camera.updateProjectionMatrix();
      flashEl.style.opacity = flashA; flashA = Math.max(0, flashA - rdt * 2.8);
      if (dimT > 0) { dimT -= rdt; dimA += (dimTarget - dimA) * Math.min(1, rdt * 9); } else { dimTarget = 0; dimA += (0 - dimA) * Math.min(1, rdt * 4); }
      dimMat.uniforms.uDim.value = dimA; dimMesh.visible = dimA > 0.01;
    }
    function render() { renderer.render(scene, camera); }
    function setPixel(v) { pixel = !!v; size(); }
    function setQuality(q) { quality = q; size(); }
    size();
    return {
      THREE: T, scene: scene, camera: camera, renderer: renderer, fxGroup: fxGroup, glow: GLOW, hooks: hooks,
      size: size, setRegion: setRegion, setHero: setHero, setHeroTexture: setHeroTexture, setCostumeFx: setCostumeFx, heroTip: heroTip, heroPaw: heroPaw, heroCenter: heroCenter, heroPose: heroPose, heroGlow: heroGlowPulse, ghost: ghost,
      castPulse: function () { heroGlow = 1; }, heroState: function () { return HB; }, heroFaceTo: heroFaceTo, setViewShift: setViewShift,
      spawnMob: spawnMob, hitMob: hitMob, killMob: killMob, clearMobs: clearMobs, mobs: function () { return mobs; }, mobPos: mobPos, mobTop: mobTop,
      setTierAura: setTierAura, damageText: damageText, screenPos: screenPos, flash: flash, dim: dim, shake: shake, punch: camPunch, light: light,
      hitStop: hitStop, slowmo: slowmo, scaleDt: scaleDt, update: update, render: render,
      setPixel: setPixel, setQuality: setQuality, getQuality: function () { return quality; }
    };
  }
  CW.createScene = createScene;
})(this);
