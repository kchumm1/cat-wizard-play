(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  // 전투 눈 (2026-11-25, 겨울 테마: 형 "전투에도 눈"). three.js 점(THREE.Points) 하나를 한 번에 그림.
  // 눈송이 자리는 처음에 한 번만 정하고, 떨어짐·흔들림·돌기는 정점 셰이더가 시간 값(uTime) 하나로 계산 → 매 프레임 CPU 일은 값 두 개뿐.
  // 개수는 화질 따라(js/theme.js snowCount: 높음 500·보통 300·낮음 끔), 실내·얼음 지역은 숨김(snowBlocked). 그리기 빈도는 장면을 따라감(60 상한·덜 그리기).
  // 상자는 카메라가 보는 전장 가운데(0, -0.4)를 둘러싸서, 카메라를 360도 돌리거나 확대해도 고르게 보임.
  var SNOW_BOX = { x0: -7, x1: 7, z0: -8.4, z1: 7.6, h: 8 };
  // 셰이더에 넘기는 시간: 장면 시간은 끝없이 늘어나는데 float32 로 넘어가면 하루쯤 켜 두면 한 프레임 낙하량이 정밀도에 걸려 끊김
  // → 한 시간마다 0 으로 돌림 (그 순간 눈송이 자리가 한 번 바뀌지만 눈이 내리는 중이라 거의 안 보임) (전체 검사 2026-11-25)
  var SNOW_LOOP = 3600;
  function snowClock(t) { return t % SNOW_LOOP; }

  function snowLayout(n, rand) {
    var pos = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n), spd = new Float32Array(n), B = SNOW_BOX;
    for (var i = 0; i < n; i++) {
      pos[i * 3] = B.x0 + rand() * (B.x1 - B.x0); pos[i * 3 + 1] = rand() * B.h; pos[i * 3 + 2] = B.z0 + rand() * (B.z1 - B.z0);
      size[i] = 0.12 + rand() * 0.16; ph[i] = Math.min(0.9999, rand()); spd[i] = 0.5 + rand() * 0.6;
    }
    return { pos: pos, size: size, ph: ph, spd: spd };
  }

  var VS = 'attribute float aSize; attribute float aPh; attribute float aSpd; uniform float uTime; uniform float uScale; uniform float uH; varying float vA; varying float vRot;' +
    'void main(){ vec3 p = position; p.y = uH - mod(uH - p.y + uTime * aSpd, uH);' +
    ' p.x += sin(uTime * 0.7 + aPh * 6.2832) * 0.35; p.z += cos(uTime * 0.5 + aPh * 12.0) * 0.2;' +
    ' vRot = aPh * 6.2832 + uTime * (0.3 + aPh);' +
    ' vA = 0.9 * smoothstep(0.0, 0.6, p.y) * (1.0 - smoothstep(uH - 1.0, uH, p.y));' +   // 바닥·꼭대기에서 스르륵 (앞 값이 작게: 거꾸로면 아이폰 Metal 에서 정해지지 않음)
    ' vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }';
  var FS = 'uniform sampler2D map; varying float vA; varying float vRot;' +
    'void main(){ vec2 q = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); q = vec2(q.x * c - q.y * s, q.x * s + q.y * c) + 0.5;' +
    ' vec4 t = texture2D(map, q); if (t.a < 0.02) discard; gl_FragColor = vec4(t.rgb, t.a * vA); }';

  // 눈 결정 그림: 흰 육각 결정에 옅은 파란 번짐 — 꽃밭·사막처럼 밝은 지역 배경에서도 보이게 (흰색만이면 묻혀 버림)
  function flakeTex(T) {
    var c = root.document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
    g.translate(32, 32); g.lineCap = 'round';
    for (var pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? '#ffffff' : 'rgba(96,140,200,.85)'; g.lineWidth = pass ? 4.5 : 8;
      if (!pass) { g.shadowColor = 'rgba(90,130,190,.9)'; g.shadowBlur = 6; } else g.shadowBlur = 0;
      for (var i = 0; i < 3; i++) {
        var a = i * Math.PI / 3, x = Math.cos(a) * 23, y = Math.sin(a) * 23;
        g.beginPath(); g.moveTo(-x, -y); g.lineTo(x, y); g.stroke();
        for (var s = -1; s <= 1; s += 2) for (var b = -1; b <= 1; b += 2) {   // 가지
          var bx = Math.cos(a) * 13 * s, by = Math.sin(a) * 13 * s, u = a + b * Math.PI / 4;
          g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(u) * 7 * s, by + Math.sin(u) * 7 * s); g.stroke();
        }
      }
    }
    var t = new T.CanvasTexture(c); return t;
  }

  function createSnow3D(T, parent) {
    var pts = null, mat = null, want = 0, blocked = false;
    function build(n) {
      if (pts) { parent.remove(pts); pts.geometry.dispose(); pts = null; }
      if (!n) return;
      var L = snowLayout(n, Math.random), g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(L.pos, 3)); g.setAttribute('aSize', new T.BufferAttribute(L.size, 1));
      g.setAttribute('aPh', new T.BufferAttribute(L.ph, 1)); g.setAttribute('aSpd', new T.BufferAttribute(L.spd, 1));
      if (!mat) mat = new T.ShaderMaterial({ uniforms: { map: { value: flakeTex(T) }, uTime: { value: 0 }, uScale: { value: 900 }, uH: { value: SNOW_BOX.h } },
        vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: true });
      pts = new T.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 5.9;   // 지역 입자(world.js amb)와 같은 차례: 어둡게 하기(5.95) 아래
      parent.add(pts);
    }
    function sync() { if (pts) pts.visible = !blocked; }
    return {
      setCount: function (n) { n = n | 0; if (n === want) return; want = n; build(n); sync(); },
      setBlocked: function (b) { blocked = !!b; sync(); },
      update: function (time, viewH) { if (!pts || !pts.visible) return; mat.uniforms.uTime.value = snowClock(time); if (viewH) mat.uniforms.uScale.value = viewH * 1.1; },
      count: function () { return pts && pts.visible ? want : 0; }
    };
  }

  return { snowLayout: snowLayout, createSnow3D: createSnow3D, SNOW_BOX: SNOW_BOX, snowClock: snowClock, SNOW_LOOP: SNOW_LOOP };
});
