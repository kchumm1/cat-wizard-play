// 전투 화면의 펫 (2026-11-23, 설계 7-5 · docs/펫기술-업적-GPT-문구.md 1장): the worn pet floats behind and above the hero cat,
// follows it a little late and bobs; a legend stands behind it nearly as tall as the hero (1.1×) and swells like a roar when
// it casts, the others are about half the hero (40% was hard to see on a phone) and hop. One picture plane (the same shader as the little ones, js/minions.js,
// so its colours are the picture's own). Tapping it opens the 내 펫 page. js/main.js: CW.createPetSprite(sc) once, then
// set(pet or null) when the worn pet changes, update(dt) every frame, pop() on a cast, top() / center() for effects.
(function (root) {
  var CW = root.CW = root.CW || {};
  var TILT = 0.6, HERO_H = 1.02;
  var VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  var FS = 'uniform sampler2D map; uniform float uGlow; varying vec2 vUv;' +
    'void main() { vec4 t = texture2D(map, vUv); if (t.a < 0.06) discard; gl_FragColor = vec4(t.rgb * (1.0 + uGlow), t.a); }';

  CW.createPetSprite = function (sc) {
    var T = sc.THREE, GEO = new T.PlaneGeometry(1, 1); GEO.translate(0, 0.5, 0);
    var mesh = null, tex = null, cur = null, big = false, h = 0.45, at = null, y = 0, ph = 0, popT = 0, glow = 0;
    function drop() {
      if (mesh) { sc.scene.remove(mesh); mesh.material.dispose(); mesh = null; }
      if (tex) { tex.dispose(); tex = null; }
    }
    function set(p) {
      var id = p ? p.id : null; if (id === cur) return;
      cur = id; drop(); if (!p) return;
      big = p.grade === 3; h = big ? HERO_H * 1.1 : HERO_H * 0.5;
      // a legend is drawn big: its full picture (768px); the others the small one (192px)
      new T.TextureLoader().load((CW.ART_BASE || 'art/') + p.art + (big ? '' : '-s') + '.webp', function (t) {
        if (cur !== id) { t.dispose(); return; }
        tex = t;
        mesh = new T.Mesh(GEO, new T.ShaderMaterial({ uniforms: { map: { value: t }, uGlow: { value: 0 } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false }));
        mesh.rotation.order = 'YXZ'; mesh.renderOrder = 2; at = null; sc.scene.add(mesh);
      });
    }
    function update(dt) {
      if (!mesh) return;
      var H = sc.heroState(), face = H.faceT || 1;
      // behind the hero's back (opposite the way it faces) and away from the camera, so it never covers monsters or numbers
      var off = sc.fromScreen(-face * (big ? 0.8 : 0.55), big ? -0.75 : -0.35), tx = H.x + off.x, tz = H.z + off.z;
      if (!at) at = { x: tx, z: tz };
      var k = 1 - Math.exp(-dt * (big ? 2.5 : 3.5)); at.x += (tx - at.x) * k; at.z += (tz - at.z) * k;
      ph += dt; popT = Math.max(0, popT - dt / 0.45); glow = Math.max(0, glow - dt * 2.2);
      var hop = popT > 0 ? Math.sin(Math.PI * (1 - popT)) : 0;
      y = big ? 0.02 + Math.sin(ph * 1.3) * 0.03 : 0.6 + Math.sin(ph * 2.3) * 0.06 + hop * 0.14;
      var s = h * (1 + (big ? 0.03 * Math.sin(ph * 1.3) : 0) + hop * (big ? 0.32 : 0.18));
      mesh.position.set(at.x, y, at.z); mesh.scale.set(s, s, 1);
      mesh.rotation.set(-TILT, sc.camView().yaw, 0);
      mesh.material.uniforms.uGlow.value = glow * (big ? 0.55 : 0.35);
    }
    function center() { return new T.Vector3(at ? at.x : 0, y + h * 0.5, at ? at.z : 0); }
    function top() { return new T.Vector3(at ? at.x : 0, y + h * 1.02, at ? at.z : 0); }
    function pop() { popT = 1; glow = 1; }
    // 탭하면 내 펫 화면 (no hover needed): a short tap that lands on the pet, not a drag that turns the camera
    var down = null, el = sc.renderer && sc.renderer.domElement;
    if (el && el.addEventListener) {
      el.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: Date.now() }; }, { passive: true });
      el.addEventListener('pointerup', function (e) {
        var d = down; down = null; if (!d || !mesh || !CW.petPageOpen) return;
        if (Date.now() - d.t > 350 || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 10) return;
        var r = el.getBoundingClientRect(), c = sc.screenPos(center()), tp = sc.screenPos(top());
        var rad = Math.max(24, Math.abs(c.y - tp.y) * 1.1), dx = e.clientX - r.left - c.x, dy = e.clientY - r.top - c.y;
        if (dx * dx + dy * dy <= rad * rad) CW.petPageOpen();
      }, { passive: true });
    }
    return { set: set, update: update, center: center, top: top, pop: pop, big: function () { return big; }, shown: function () { return !!mesh; } };
  };
})(this);
