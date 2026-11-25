// 펫 기술 아이콘 「빛 녹임」 (2026-11-25, 형: 기술 아이콘 뜨는 건 좋은데 세련되게 → 빛 문장 → 그림 느낌 없이 자연스럽게 녹아들게
// → 이대로 넣어; 시안은 dev/pet-icon-lab.html, 설계 docs/superpowers/specs/2026-11-25-pet-buff-fx-design.md).
// When the worn pet casts (js/pet-sprite.js icon ← js/main.js petCast) its skill icon (GPT 그림 art/sk-pet-<계열>.webp) no longer
// swells and fades over its head like a sticker: one shader draws the picture as light — its dark outlines turned to the family's
// light, the ground showing through a little, a glow in the picture's own colours, faint slow rays. It gathers out of drifting
// light from the middle out, floats with specks of light rising, a band of light runs over it once, then it melts into light from
// the edges, drifting a little toward the hero, whose chest glows softly once (the buff is on).
// Two planes in all (the icon, the glow on the hero), made once and reused; nothing new is made per frame.
(function (root) {
  var CW = root.CW = root.CW || {};
  // a family's two colours: its light, and the picture's second colour (sparks, the coming and going edge)
  var COLS = { cheer: [0x8fe07a, 0xff9cc8], bubble: [0x6fd0ff, 0xffd75a], flame: [0xff7a2a, 0xffd060], bolt: [0xb48cff, 0xffe066], star: [0xc58aff, 0xff9ae0] };
  var IN = 0.55, OUT_AT = 1.12, LIFE = 1.7, GLOW = 0.45;
  var VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var FS = [
    'uniform sampler2D map; uniform vec3 uC1, uC2; uniform float uT, uIn, uOut, uShine, uKind;',
    'varying vec2 vUv;',
    'float sq(float x) { return x * x; }',
    'vec4 icon(vec2 p) { vec2 q = p / 0.56 + 0.5; if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return vec4(0.0); return texture2D(map, q); }',
    'float spark(vec2 q, float s) { q = abs(q) / s; return max(0.0, 1.0 - (q.x * q.y * 60.0 + (q.x + q.y) * 0.9)); }',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }',
    'float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float fbm(vec2 p) { return vnoise(p) * 0.6 + vnoise(p * 2.1 + 3.7) * 0.3 + vnoise(p * 4.3 + 1.3) * 0.1; }',
    'void main() {',
    '  vec2 p = vUv - 0.5; float r = length(p), an = atan(p.y, p.x);',
    '  vec3 mid = mix(uC1, uC2, 0.35), hot = mix(uC2, vec3(1.0), 0.55);',
    '  if (uKind > 0.5) {',   // the soft glow on the hero's chest as it lands
    '    gl_FragColor = vec4(uC1 * exp(-sq(r / (0.12 + 0.2 * uIn))) * (1.0 - uIn) * 1.2 + hot * exp(-sq(r / 0.06)) * (1.0 - uIn) * 0.6, 0.0); return;',
    '  }',
    '  vec3 c = vec3(0.0); float a = 0.0;',   // premultiplied colour and cover
    '  vec4 ic = icon(p); float o = 0.0075;',
    '  float soft = ic.a * 0.2 + (icon(p + vec2(o, 0.0)).a + icon(p - vec2(o, 0.0)).a + icon(p + vec2(0.0, o)).a + icon(p - vec2(0.0, o)).a) * 0.2;',
    '  vec3 bl = vec3(0.0); float ba = 0.0;',
    '  for (int i = 0; i < 8; i++) { float t = float(i) * 0.785 + 0.2; vec4 s = icon(p + vec2(cos(t), sin(t)) * 0.045); bl += s.rgb * s.a; ba += s.a; }',
    '  bl /= 8.0; ba /= 8.0;',
    '  float ink = smoothstep(0.34, 0.1, dot(ic.rgb, vec3(0.299, 0.587, 0.114))) * ic.a;',
    // it comes from the middle out through drifting mist, and goes from the edges in
    '  float n = fbm(vUv * 6.0 + vec2(0.0, -uT * 0.5));',
    '  float inF = n * 0.5 + r * 1.3, inV = uIn * 1.25;',
    '  float vis = smoothstep(inF - 0.08, inF + 0.04, inV);',
    '  float front = exp(-sq((inV - inF + 0.02) / 0.06)) * step(uIn, 0.999);',
    '  float outF = n * 0.55 + (0.55 - r) * 1.1, outV = uOut * 1.25;',
    '  vis *= 1.0 - smoothstep(outF - 0.05, outF + 0.07, outV);',
    '  float front2 = exp(-sq((outV - outF) / 0.07)) * step(0.001, uOut);',
    // light round it in the picture's own colours, a soft bloom, slow faint rays
    '  c += bl * (1.0 - soft) * 1.25 * vis;',
    '  c += mid * exp(-sq(r / 0.21)) * 0.28 * vis;',
    '  c += mix(uC1, vec3(1.0), 0.3) * pow(0.5 + 0.5 * cos(an * 7.0 + uT * 0.9), 10.0) * smoothstep(0.48, 0.18, r) * smoothstep(0.1, 0.22, r) * 0.22 * vis;',
    // the picture as light: dark outlines turned to the family's light, the ground showing through a little, glowing
    '  vec3 lit = mix(ic.rgb * 1.08 + 0.02, uC1 * 1.05, ink);',
    '  float ab = soft * (1.0 - ink * 0.55) * 0.88 * vis;',
    '  c = lit * ab + c * (1.0 - ab); a = ab;',
    '  c += lit * soft * 0.16 * vis;',
    '  c += vec3(1.0) * exp(-sq((p.x * 0.6 + p.y * 0.8 - mix(-0.45, 0.45, uShine)) / 0.05)) * soft * vis * step(0.0, uShine) * step(uShine, 1.0) * 0.4;',
    '  c += hot * (front * smoothstep(0.0, 0.3, ba + soft) + front2 * (soft + ba * 0.6)) * 1.3;',
    // specks of light drifting up round it, brighter as it goes
    '  for (int i = 0; i < 7; i++) { float fi = float(i); vec2 h = vec2(hash(vec2(fi, 1.3)), hash(vec2(fi, 7.1)));',
    '    float life = fract(uT * (0.45 + h.y * 0.3) + h.x);',
    '    vec2 q = vec2((h.x - 0.5) * 0.62 + sin(uT * 2.0 + fi) * 0.03, -0.28 + life * 0.62);',
    '    c += hot * spark(p - q, 0.03 + 0.015 * h.y) * sin(life * 3.1416) * (0.6 + 0.4 * sin(uT * 9.0 + fi * 2.0)) * (0.55 + uOut * 1.2) * smoothstep(0.0, 0.4, uIn) * (1.0 - uOut * 0.6); }',
    '  if (uIn < 1.0) c += mid * exp(-sq(r / (0.08 + 0.34 * uIn))) * (1.0 - uIn) * 0.9;',   // a soft breath of light as it comes
    '  gl_FragColor = vec4(c, a);',
    '}'
  ].join('\n');

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOut(x, k) { return 1 - Math.pow(1 - clamp01(x), k); }

  // sc: { THREE, scene, camera }
  CW.createPetEmblem = function (sc) {
    var T = sc.THREE, geo = new T.PlaneGeometry(1, 1), tex = {};
    function plane(kind) {
      var m = new T.Mesh(geo, new T.ShaderMaterial({
        uniforms: { map: { value: null }, uC1: { value: new T.Color() }, uC2: { value: new T.Color() }, uT: { value: 0 }, uIn: { value: 0 }, uOut: { value: 0 }, uShine: { value: -1 }, uKind: { value: kind } },
        vertexShader: VS, fragmentShader: FS, transparent: true, depthTest: false, depthWrite: false,
        // premultiplied: the picture covers what is behind it, the light is added
        blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor
      }));
      m.visible = false; m.renderOrder = 50; m.frustumCulled = false; sc.scene.add(m); return m;
    }
    var m = plane(0), fl = plane(1), U = m.material.uniforms, F = fl.material.uniforms;
    var t = 0, size = 0.8, chest = null, glowT = -1, head = new T.Vector3(), pos = new T.Vector3(), to = new T.Vector3();
    function colours(u, fam) { var c = COLS[fam] || COLS.flame; u.uC1.value.setHex(c[0]); u.uC2.value.setHex(c[1]); }
    // url: the family's icon picture; toFn(): the hero's chest now. A picture still on its way shows when it comes (the
    // latest cast wins); each family's picture is fetched once.
    function show(url, fam, big, toFn) {
      var go = function (tx) { U.map.value = tx; colours(U, fam); colours(F, fam); size = big ? 0.98 : 0.8; chest = toFn || null; t = 0; m.visible = true; };
      var e = tex[url];
      if (e) { if (e.tx.image) go(e.tx); else e.pend = go; return; }
      e = tex[url] = { pend: go, tx: null };
      e.tx = new T.TextureLoader().load(url, function (tx) { var g = e.pend; e.pend = null; if (g) g(tx); });
    }
    function face(o) { if (sc.camera) o.quaternion.copy(sc.camera.quaternion); }
    // at: the point just over the pet's head now (null when no pet is shown). Every frame.
    function update(dt, at) {
      if (glowT >= 0) {
        glowT += dt; var g = glowT / GLOW;
        if (g >= 1 || !chest) { glowT = -1; fl.visible = false; }
        else { fl.visible = true; fl.position.copy(chest()); face(fl); var gs = size * 1.4; fl.scale.set(gs, gs, 1); F.uIn.value = g; }
      }
      if (!m.visible) return;
      if (!at) { m.visible = false; return; }
      t += dt; head.copy(at);
      U.uT.value = t; U.uIn.value = clamp01(t / IN); U.uShine.value = (t - 0.3) / 0.42; U.uOut.value = 0;
      pos.copy(head); pos.y += size * 0.5 + 0.18 + Math.sin(t * 2.6) * 0.018 + 0.3 * easeOut(t / 0.7, 2);
      var out = (t - OUT_AT) / (LIFE - OUT_AT);
      if (out > 0) {
        // it melts into light and drifts a little toward the hero, whose chest then glows: the buff is on
        if (out >= 1) { m.visible = false; if (chest) glowT = 0; return; }
        U.uOut.value = out;
        if (chest) { to.copy(chest()); pos.lerp(to, out * out * 0.3); }
        pos.y += out * 0.12;
      }
      var s = size * (0.86 + 0.14 * easeOut(t / 0.5, 3));
      m.position.copy(pos); face(m); m.scale.set(s, s, 1);
    }
    function hide() { m.visible = false; fl.visible = false; glowT = -1; }
    return { show: show, update: update, hide: hide, shown: function () { return m.visible; } };
  };
  CW.PET_EMBLEM_COLS = COLS;
})(typeof window !== 'undefined' ? window : this);
