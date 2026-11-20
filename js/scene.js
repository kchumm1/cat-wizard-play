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
    'uniform float uArtRole,uDesert; varying vec2 vUv;',
    'float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'void main() {',
    '  vec4 t = texture2D(map, vUv); if (t.a < 0.06) discard;',
    '  vec3 c = t.rgb * uTint; float lum = dot(c, vec3(0.3, 0.59, 0.11));',
    '  c = mix(c, vec3(lum * 0.55 + 0.25, lum * 0.8 + 0.38, lum * 0.6 + 0.62), uFreeze * 0.75);',
    '  if(uDesert>.5 && uArtRole>.5){',
    '    float up=texture2D(map,vUv+vec2(-.0035,.007)).a, down=texture2D(map,vUv+vec2(.004,-.005)).a;',
    '    float ink=smoothstep(.10,.69,t.a-min(up,down)); c=mix(c,vec3(.17,.083,.14),ink*.56);',
    '    c=mix(c,vec3(1.,.885,.66),smoothstep(.20,.78,t.a-up)*.66);',
    '    if(uArtRole>1.5){vec2 p=vUv; float mask=max(max(1.-smoothstep(.06,.16,length(p-vec2(.24,.18))),1.-smoothstep(.06,.17,length(p-vec2(.67,.20)))),1.-smoothstep(.05,.14,length(p-vec2(.36,.79))));',
    '      float ruby=mask*smoothstep(.08,.32,t.r-t.g)*smoothstep(.12,.45,t.b); c+=ruby*vec3(.12,.008,.036);',
    '      c+=ruby*smoothstep(.43,.76,t.r)*smoothstep(.29,.61,t.b)*vec3(.18,.084,.095);}',
    '  }',
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
  // Quiet costume finish (the 멸망 costumes added 2026-11-14): instead of a thick coloured halo, light lives ON the armour —
  // a thin rim of light at the edges, a narrow glint that sweeps over the costume now and then, and a few jewel twinkles
  // on its brightest spots. Additive, only where the costume picture is.
  var SHEEN_FS = [
    'uniform sampler2D map; uniform vec3 uCol; uniform vec3 uCol2; uniform float uTime; uniform float uRim; uniform float uSweep; uniform float uGlint; uniform float uPeriod; uniform float uRainbow;',
    'varying vec2 vUv;',
    'float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'vec3 hue(float t) { return clamp(abs(mod(t * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }',
    'void main() {',
    '  vec4 t = texture2D(map, vUv); float a = t.a; if (a < 0.02) discard;',
    '  float ring = 0.0;',
    '  for (int i = 0; i < 8; i++) { float g = float(i) * 0.785; ring += texture2D(map, vUv + vec2(cos(g), sin(g)) * 0.014).a; }',
    '  float rim = a * clamp(1.0 - ring * 0.125, 0.0, 1.0);',
    '  float lum = dot(t.rgb, vec3(0.3, 0.59, 0.11));',
    '  float ph = fract(uTime / uPeriod); float pos = -0.35 + ph * 2.6;',
    '  float d = vUv.y * 0.9 + vUv.x * 0.45;',
    '  float band = exp(-pow((d - pos) / 0.045, 2.0)) + 0.5 * exp(-pow((d - pos + 0.11) / 0.018, 2.0));',
    '  float sweep = band * a * smoothstep(0.2, 0.85, lum);',
    '  vec2 gg = vUv * 13.0; vec2 cell = floor(gg); vec2 fp = fract(gg) - 0.5; float r = h(cell);',
    '  float on = step(0.72, r) * smoothstep(0.35, 0.7, lum);',
    '  float bl = pow(max(0.0, sin(uTime * (0.9 + r * 1.2) + r * 40.0)), 10.0);',
    '  float crs = max(exp(-abs(fp.x) * 26.0) * exp(-abs(fp.y) * 4.0), exp(-abs(fp.y) * 26.0) * exp(-abs(fp.x) * 4.0));',
    '  float glint = on * bl * (crs + exp(-dot(fp, fp) * 90.0)) * a * 1.6;',
    '  vec3 tint = mix(uCol2, hue(fract(vUv.y * 0.8 + vUv.x * 0.3 + uTime * 0.05)), uRainbow);',
    '  vec3 c = mix(vec3(1.0), uCol, 0.45) * rim * uRim + (t.rgb * 1.35 + mix(vec3(0.25), tint * 0.3, 0.5)) * sweep * uSweep + mix(vec3(1.0), tint, 0.3) * glint * uGlint;',
    '  gl_FragColor = vec4(c, 1.0); }'].join('\n');


  function spring(k, c) { return { x: 0, v: 0, target: 0, k: k, c: c }; }
  function stepSpring(s, dt) { var a = -s.k * (s.x - s.target) - s.c * s.v; s.v += a * dt; s.x += s.v * dt; }

  // 안티앨리어싱 (설정, 2026-11-17): chosen when the 3D picture is made, so a change takes effect after the game is opened
  // again. Not chosen: off on a phone with a sharp screen (2× and more, edges are fine without it there), on elsewhere.
  CW.aaOn = function () {
    var v = null; try { v = localStorage.getItem('cw-aa'); } catch (e) { /* storage blocked */ }
    if (v === 'on') return true; if (v === 'off') return false;
    return !(CW.PHONE && (window.devicePixelRatio || 1) >= 2);
  };
  function createScene(canvas, overlay) {
    var GLOW = CW.GLOW = CW.GLOW || glowTexture();
    // 발열 (2026-11-17): a phone draws at most 1.5× its CSS size (see size()), and on a sharp screen (2× and more) the
    // edges are already fine without smoothing, which costs the most at that size
    var PHONE = !!CW.PHONE;
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: CW.aaOn(), alpha: true, powerPreference: PHONE ? 'default' : 'high-performance' });
    if (T.sRGBEncoding) renderer.outputEncoding = T.sRGBEncoding;
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(38, 1, 0.5, 140);
    var lookAt = new T.Vector3(0, 0.55, -0.4), PITCH = 0.87, CAM_D = 16, H_HALF = 0.185, baseFov = 44;
    var camBase = new T.Vector3(0, lookAt.y + CAM_D * Math.sin(PITCH), lookAt.z + CAM_D * Math.cos(PITCH));
    var viewShift = 0, viewShiftT = 0, vw = 360, vh = 640, shiftX = false;
    // The two lane views frame the field by width. Centered hunting keeps its upright movement bounds.
    // LAND_UP of the screen's height the fight sits higher there, so the wizard (low in the field) stays clear of the
    // skills at the bottom right
    var laneActive = false, centeredHunt = false, fieldAspect = 1, fieldFov = 38, LAND_FX = 1.3, LAND_UP = 0.1;
    // 가로 시점 (2026-11-17, 형: 세로는 xy축이 잘 구별돼 스킬이 어디서 나오는지 보이는데 가로는 안 보이고 좁다 → 옆에서·멀리서
    // 둘 다, 멀리서도 방향이 애매하지 않게). Sideways the fight runs along the screen, a lane: the wizard keeps to the left
    // third, every monster stays to its right and comes in from the right edge, so each spell visibly flies left → right.
    // 'side': the camera turned a quarter (LANE_YAW) and a little lower (PITCH_SIDE), so the field's long depth runs
    // across the wide screen and what rises or falls has more height; 'far': the front view, further back (LAND_HALF_FAR).
    // Upright nothing of this applies (laneActive false).
    var landView = 'center', LANE_YAW = Math.PI / 2, PITCH_SIDE = 0.66, LAND_HALF_SIDE = 5.6, LAND_HALF_FAR = 6.6, LANE_GAP = 0.9;
    var LcY = 1, LsY = 0, laneFrame = 0;
    function sideView() { return laneActive && landView === 'side'; }
    function homeYaw() { return sideView() ? LANE_YAW : 0; }
    function pitchNow() { return sideView() ? PITCH_SIDE : PITCH; }
    // along the lane (u, + toward the monsters = the screen's right) and across it (v, + toward the camera)
    function laneU(x, z) { return x * LcY - z * LsY; }
    function laneV(x, z) { return x * LsY + z * LcY; }
    function fromLane(u, v) { return { x: u * LcY + v * LsY, z: -u * LsY + v * LcY }; }
    // the canvas's size on the page, kept up to date by the browser (ResizeObserver) instead of being read for every
    // damage number: reading it right after numbers were added makes the browser lay the page out again each time,
    // and a spell that hits the whole crowd at once did that once per monster (a stall on phones)
    var cssW = 360, cssH = 640;
    if (window.ResizeObserver) new window.ResizeObserver(function () { cssW = canvas.clientWidth; cssH = canvas.clientHeight; }).observe(canvas);
    camera.position.copy(camBase); camera.lookAt(lookAt);
    // ---------- turning the camera by hand (the user, 2026-11-17: 360도 회전 + 확대, 3초 뒤 원래 자리로, 둘 다) ----------
    // One finger dragged across the fight turns the camera round it (a whole turn and more); two fingers pinch the
    // lens in and out (ORB_ZMIN..ORB_ZMAX of the usual view's width). ORB_BACK seconds after the last finger lifts, both ease back
    // to the usual view, so a fight left running (방치, auto hunting) always looks as it was made to.
    // Pictures standing on the field (the wizard, monsters, the little ones, props) turn with the camera (yaw), and
    // left/right facing is worked out on the screen (scrX), not along the field's x.
    // Monsters are still kept inside the USUAL view (homeCam), so turning the camera never moves the fight about.
    var ORB_ZMIN = 0.62, ORB_ZMAX = 1.45, ORB_BACK = 3;
    var orb = { yaw: 0, zoom: 1, idle: 99, ptr: {}, n: 0, moved: false, x0: 0, y0: 0, yaw0: 0, d0: 0, z0: 1, back: 0 };
    var cY = 1, sY = 0;   // cos / sin of orb.yaw, kept for this frame
    var homeCam = new T.PerspectiveCamera(38, 1, 0.5, 140), homeInv = new T.Matrix4();
    // where a field direction (dx, dz) goes across the screen: + is to the right
    function scrX(dx, dz) { return dx * cY - dz * sY; }
    // a point of a standing picture — px across it, py up it (tilted back by TILT), plus toward the camera — as an
    // offset on the field, with the picture turned to the camera
    function bbPt(px, py, toward) { var a = px, c = -py * SIN_T + (toward || 0); return new T.Vector3(a * cY + c * sY, py * COS_T, -a * sY + c * cY); }
    function orbPtrs() { var a = []; for (var k in orb.ptr) a.push(orb.ptr[k]); return a; }
    function orbDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      orb.ptr[e.pointerId] = { x: e.clientX, y: e.clientY }; orb.n = orbPtrs().length; orb.idle = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* an old browser */ }
      var p = orbPtrs();
      if (orb.n === 1) { orb.moved = false; orb.x0 = e.clientX; orb.y0 = e.clientY; orb.yaw0 = orb.yaw; }
      else if (orb.n === 2) { orb.d0 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1; orb.z0 = orb.zoom; orb.moved = true; }
      if (e.cancelable) e.preventDefault();
    }
    function orbMove(e) {
      var q = orb.ptr[e.pointerId]; if (!q) return;
      q.x = e.clientX; q.y = e.clientY; orb.idle = 0;
      var p = orbPtrs();
      if (p.length >= 2) {
        var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
        orb.zoom = Math.max(ORB_ZMIN, Math.min(ORB_ZMAX, orb.z0 * orb.d0 / d));
      } else if (p.length === 1) {
        var dx = e.clientX - orb.x0;
        // a small wobble of the finger is a tap, not a turn
        if (!orb.moved && Math.abs(dx) + Math.abs(e.clientY - orb.y0) < 7) return;
        orb.moved = true;
        orb.yaw = orb.yaw0 - dx / Math.max(200, cssW) * Math.PI * 1.6;
      }
      if (e.cancelable) e.preventDefault();
    }
    function orbUp(e) {
      if (!orb.ptr[e.pointerId]) return;
      delete orb.ptr[e.pointerId]; orb.n = orbPtrs().length; orb.idle = 0;
      // one finger left after a pinch: carry on turning from where it is now
      var p = orbPtrs(); if (p.length === 1) { orb.x0 = p[0].x; orb.y0 = p[0].y; orb.yaw0 = orb.yaw; }
    }
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', orbDown);
    canvas.addEventListener('pointermove', orbMove);
    canvas.addEventListener('pointerup', orbUp);
    canvas.addEventListener('pointercancel', orbUp);
    canvas.addEventListener('lostpointercapture', orbUp);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // iPhone Safari: its own pinch (page zoom) must not start on the fight
    canvas.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    // a computer: the wheel zooms too
    canvas.addEventListener('wheel', function (e) { orb.zoom = Math.max(ORB_ZMIN, Math.min(ORB_ZMAX, orb.zoom * Math.exp(e.deltaY * 0.0012))); orb.idle = 0; orb.back = 0; if (e.cancelable) e.preventDefault(); }, { passive: false });
    function orbTick(rdt) {
      if (orb.n > 0) { orb.idle = 0; orb.back = 0; } else orb.idle += rdt;
      // back to the usual turn: 0, or a quarter turn in the sideways side view (가로 시점)
      var hY = homeYaw();
      if (orb.n === 0 && orb.idle > ORB_BACK && (orb.yaw !== hY || orb.zoom !== 1)) {
        if (!orb.back) {
          // the long way round is never taken: from 350° it comes back the last 10°. A slow start and a soft landing,
          // longer for a bigger turn (0.7 s … 1.6 s)
          var y = (orb.yaw - hY) % (Math.PI * 2); if (y > Math.PI) y -= Math.PI * 2; if (y < -Math.PI) y += Math.PI * 2;
          orb.back = { y: y, z: orb.zoom, t: 0, d: 0.7 + Math.max(Math.abs(y) / Math.PI, Math.abs(orb.zoom - 1) * 1.5) * 0.9 };
        }
        var B = orb.back; B.t += rdt; var k = Math.min(1, B.t / B.d), e = k * k * (3 - 2 * k);
        orb.yaw = hY + B.y * (1 - e); orb.zoom = B.z + (1 - B.z) * e;
        if (k >= 1) { orb.yaw = hY; orb.zoom = 1; orb.back = 0; }
      }
      cY = Math.cos(orb.yaw); sY = Math.sin(orb.yaw);
    }
    // Zoom is the lens (field of view), so zooming in is the same picture made bigger (the painted backdrop is scaled with it)
    homeCam.position.copy(camBase); homeCam.lookAt(lookAt); homeCam.updateMatrixWorld(); homeInv.copy(homeCam.matrixWorld).invert(); homeCam.projectionMatrix.copy(camera.projectionMatrix);
    scene.add(new T.HemisphereLight(0xffffff, 0x666688, 0.85));
    var sun = new T.DirectionalLight(0xffffff, 0.7); sun.position.set(3, 8, 6); scene.add(sun);

    var world = new T.Group(); scene.add(world);
    var heroGroup = new T.Group(); heroGroup.position.set(-1.3, 0, 0.3); scene.add(heroGroup);
    var auraGroup = new T.Group(); heroGroup.add(auraGroup);
    var cosGroup = new T.Group(); heroGroup.add(cosGroup);
    var cos = { fx: null, aura: null, glow: null };
    var mobGroup = new T.Group(); scene.add(mobGroup);
    var fxGroup = new T.Group(); scene.add(fxGroup);

    var quality = 'high', phoneLite = false, pixel = false, time = 0, region = -1;
    var hero = null, mobs = [], dying = [], ambient = null, ambientVel = null;
    var hooks = { land: null, die: null };

    function size() {
      var w = canvas.clientWidth || 360, h = canvas.clientHeight || 420;
      var dpr = window.devicePixelRatio || 1;
      var pr = PHONE ? (quality === 'high' ? Math.min(dpr, phoneLite ? 1.25 : 1.5) : quality === 'mid' ? Math.min(dpr, 1.25) : 1)
        : quality === 'high' ? Math.min(dpr, 2) : quality === 'mid' ? Math.min(dpr, 1.5) : 1;
      if (pixel) { renderer.setPixelRatio(1); renderer.setSize(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 3)), false); canvas.style.imageRendering = 'pixelated'; }
      else { renderer.setPixelRatio(pr); renderer.setSize(w, h, false); canvas.style.imageRendering = 'auto'; }
      camera.aspect = w / h; vw = w; vh = h; cssW = canvas.clientWidth; cssH = canvas.clientHeight;
      // keep the same width of ground on every phone; tall screens simply see more ground above and below
      var wasLane = laneActive;
      var wide = CW.isLand ? CW.isLand() : w / h >= 1.2;
      centeredHunt = wide && landView === 'center';
      // laneActive enables the two original lane formations. Centered hunting uses the upright field.
      laneActive = landView !== 'center' && w / h > 1.1;
      if (laneActive !== wasLane) laneTurn();
      bgEl.classList.toggle('center-hunt', centeredHunt);
      // The reference camera constrains movement. Keep its upright frustum independent of the wide drawing camera.
      fieldAspect = centeredHunt ? h / w : w / h;
      fieldFov = Math.max(22, Math.min(60, 2 * Math.atan(Math.tan(H_HALF) / Math.min(fieldAspect, 0.95)) * 180 / Math.PI));
      var half = landView === 'far' ? LAND_HALF_FAR : LAND_HALF_SIDE;
      baseFov = laneActive ? Math.max(8, 2 * Math.atan(half / (CAM_D * w / h)) * 180 / Math.PI)
        : centeredHunt ? 24 : fieldFov;
      camera.fov = baseFov; applyShift(); camera.updateProjectionMatrix();
      homeCam.fov = centeredHunt ? fieldFov : baseFov; homeCam.aspect = fieldAspect; homeCam.updateProjectionMatrix();
    }

    // a menu over part of the fight pushes the view away from it: up from a sheet below (upright), left from a drawer at
    // the right (sideways, ax 'x')
    function applyShift() {
      var s = viewShift > 0.002 ? viewShift : 0, ox = shiftX ? s * vw : 0, oy = (shiftX ? 0 : s * vh) + (laneActive ? LAND_UP * vh : 0);
      if (ox || oy) camera.setViewOffset(vw, vh, ox, oy, vw, vh); else camera.clearViewOffset();
    }
    function setViewShift(f, ax) { viewShiftT = f; if (ax) shiftX = ax === 'x'; }
    // the lane's direction follows the camera's usual turn; the camera goes straight to it (turning the phone, or picking
    // the other view in 설정)
    function laneTurn() { var h = homeYaw(); LcY = Math.cos(h); LsY = Math.sin(h); LB.f = -9; if (orb.n === 0) { orb.yaw = h; orb.back = 0; } }
    function setLandView(v) {
      v = v === 'far' || v === 'side' ? v : 'center';
      if (v === landView) return;
      var wasLane = laneActive;
      landView = v; size();
      if (wasLane && laneActive) laneTurn();
    }
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
    // the region's picture (data.js bg, the user's art) stretched to fill the screen behind the see-through canvas: nothing
    // cut off, no empty band. Fetched when the region is reached; until then (or without one: 화산) the drawn ground shows.
    renderer.setClearColor(0x000000, 0);
    var bgEl = document.createElement('div'); bgEl.className = 'stagebg'; canvas.parentNode.insertBefore(bgEl, canvas);
    var bgReady = {}, desertLight = {value:0};
    function showBackdrop(id) {
      bgEl.classList.toggle('expedition-bg',!!id && id.indexOf('expedition-')===0);
      bgEl.style.backgroundImage = id ? 'url(' + (CW.ART_BASE || 'art/') + id + '.webp)' : '';
      bgEl.style.setProperty('--field-art', bgEl.style.backgroundImage);
      bgEl.classList.toggle('desert', id === 'bg-desert');
      if (id === 'bg-desert') {
        // Reduce saturation and value in the sand; the skyline retains the scene's sunlight.
        bgEl.style.backgroundImage = 'linear-gradient(to bottom,transparent 12%,rgba(128,128,128,.12) 42%),linear-gradient(to bottom,transparent 12%,rgba(0,0,0,.11) 42%),' + bgEl.style.backgroundImage;
        bgEl.style.backgroundBlendMode = 'saturation,multiply,normal';
      } else bgEl.style.backgroundBlendMode = '';
      bgEl.style.display = id ? 'block' : 'none';
      document.documentElement.classList.toggle('picbg', !!id);
      if (window.CWDisplay && window.CWDisplay.showBackdrop) window.CWDisplay.showBackdrop(bgEl);
    }
    function setRegion(r, regionData) {
      if (r === region) return; region = r;
      if (!painted) painted = CW.createWorld(scene, { tilt: TILT, halfX: halfX, field: FIELD });
      var id = regionData.bg;
      desertLight.value = id === 'bg-desert' ? 1 : 0;
      if (hero) dressShadow(hero);
      mobs.forEach(function(m){dressShadow(m.group);});
      if (id && bgReady[id]) { painted.build(r, regionData, quality, true); showBackdrop(id); return; }
      painted.build(r, regionData, quality, false); showBackdrop(null);
      if (!id) return;
      var img = new Image();
      img.onload = function () { bgReady[id] = 1; if (region === r) { painted.build(r, regionData, quality, true); showBackdrop(id); } };
      img.src = (CW.ART_BASE || 'art/') + id + '.webp';
    }


    // ---------- billboards with puppet bones ----------
    function rr(a, b) { return a + Math.random() * (b - a); }
    var geoCache = {};
    // one shared mesh per picture, 1 unit tall; each vertex knows how much every bone moves it.
    // mode 'body' / 'staff': the wizard drawn as two pictures (staff-split.js) — the body without the staff bone, and the
    // staff, which moves with the staff bone only, as one stiff piece
    function rigGeometry(art, mode) {
      var key = (art.id || 'x') + (mode ? '|' + mode : ''); if (geoCache[key]) return geoCache[key];
      if (art.puppet) return (geoCache[key] = CW.expeditionPuppet.geometry(art, T));
      var fine = !!(art.rig && art.rig.armL && art.rig.armL.cap), geo = new T.PlaneGeometry(art.aspect, 1, fine ? 48 : 14, fine ? 72 : 22); geo.translate(0, 0.5, 0);
      var n = geo.attributes.position.count, uv = geo.attributes.uv.array, w0 = new Float32Array(n * 4), w1 = new Float32Array(n * 4);
      if (art.rig && art.crop && CW.rigWeightsAt) for (var i = 0; i < n; i++) {
        var ws = mode === 'staff' ? [0, 1, 0, 0, 0, 0, 0, 0] : CW.rigWeightsAt(art.rig, art.crop, uv[i * 2], uv[i * 2 + 1]);
        if (mode === 'body') ws = ws.slice(), ws[1] = 0;
        for (var j = 0; j < 4; j++) { w0[i * 4 + j] = ws[j]; w1[i * 4 + j] = ws[j + 4]; }
      }
      geo.setAttribute('aW0', new T.BufferAttribute(w0, 4)); geo.setAttribute('aW1', new T.BufferAttribute(w1, 4));
      geo.userData.cached = true;
      return (geoCache[key] = geo);
    }
    function bbMaterial(tex, tint) {
      var bp = [], bt = []; for (var i = 0; i < 8; i++) { bp.push(new T.Vector2()); bt.push(new T.Vector2()); }
      return new T.ShaderMaterial({
        uniforms: { uDesert:desertLight, uArtRole:{value:0}, map: { value: tex }, uTint: { value: new T.Color(tint === undefined || tint === null ? 0xffffff : tint) }, uFlash: { value: 0 }, uFlashCol: { value: new T.Color(0xffffff) },
          uFreeze: { value: 0 }, uDissolve: { value: 0 }, uEdge: { value: new T.Color(0xffd84a) }, uLight: { value: new T.Color(0) }, uOpacity: { value: 1 },
          uBend: { value: 0 }, uScale: { value: new T.Vector2(1, 1) }, uH: { value: 1 }, uBP: { value: bp }, uBA: { value: new Float32Array(8) }, uBT: { value: bt } },
        vertexShader: BB_VS, fragmentShader: BB_FS, transparent: true, depthWrite: true, side: T.DoubleSide
      });
    }
    function newAnim(seed) { return { t: seed, ph: seed, walk: 0, aR: spring(150, 11), aL: spring(150, 11), hd: spring(120, 10), lastS: 1 }; }
    // The existing shadow draw carries the soft cast shadow and the sharply grounded paw/claw marks.
    var sandPrints = {};
    function sandPrint(role) {
      if (sandPrints[role]) return sandPrints[role];
      var c=document.createElement('canvas'); c.width=c.height=128;
      var g=c.getContext('2d');
      function oval(x,y,w,h,center,edge,angle) {
        g.save(); g.translate(x,y); g.rotate(angle || 0); g.scale(w,h);
        var shade=g.createRadialGradient(0,0,0,0,0,1);shade.addColorStop(0,center);shade.addColorStop(.54,edge);shade.addColorStop(1,'rgba(76,43,49,0)');
        g.fillStyle=shade;g.fillRect(-1,-1,2,2);g.restore();
      }
      oval(64,63,47,31,'rgba(79,43,48,.36)','rgba(89,52,52,.18)',-.13);
      var feet=role===2?[[18,72,-.5],[28,56,-.65],[36,47,-.5],[109,72,.5],[101,56,.65],[93,47,.5],[39,83,-.35],[89,83,.35]]:[[48,74,-.15],[78,74,.15]];
      feet.forEach(function(f){
        oval(f[0]+1,f[1]+2,role===2?13:11,5,'rgba(255,213,149,.57)','rgba(193,128,78,.31)',f[2]);
        oval(f[0],f[1],role===2?13:11,4,'rgba(52,28,45,.90)','rgba(80,43,49,.63)',f[2]);
      });
      var tex=new T.CanvasTexture(c); sandPrints[role]=tex;return tex;
    }
    function dressShadow(g) {
      var d=g.userData, sh=d.shadow;
      if(!d.printRole || !sh)return;
      var desert=!!desertLight.value;
      sh.geometry=desert?d.printPlane:d.shadowDisk;
      sh.position.z=desert ? -d.w*.065 : 0; sh.material.map=desert?sandPrint(d.printRole):null;
      sh.material.color.setHex(desert?0xffffff:0x000000);
      sh.material.opacity=desert?.89:.22;sh.material.needsUpdate=true;
    }
    function billboard(art, height, tint, role) {
      var w = height * art.aspect, mat = bbMaterial(art.tex, tint);
      mat.uniforms.uArtRole.value=role || 0;
      if (art.puppet) CW.expeditionPuppet.prepare(art, mat);
      var m = new T.Mesh(rigGeometry(art), mat); m.scale.setScalar(height); m.renderOrder = 3; m.rotation.x = -TILT;
      var g = new T.Group(); g.add(m); g.rotation.order = 'YXZ'; g.rotation.y = orb.yaw;
      var sh = new T.Mesh(new T.CircleGeometry(w * 0.32, 20), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.renderOrder = 1; g.add(sh);
      for (var i = 0; i < 8; i++) { var pv = art.rig && CW.rigPivotOf(art.rig, art.crop, CW.RIG_BONES[i], art.aspect, 1); if (pv) mat.uniforms.uBP.value[i].set(pv[0], pv[1]); }
      var seed = Math.random() * 6;
      g.userData = { body: m, u: mat.uniforms, shadow: sh, h: height, w: w, aspect: art.aspect, rig: art.rig, crop: art.crop, seed: seed, face: 1,
        bend: spring(170, 10), sq: spring(230, 13), lift: spring(95, 10), slide: spring(70, 11), light: new T.Color(0), anim: newAnim(seed) };
      if (art.puppet) g.userData.puppet = art.puppet;
      if(role){
        g.userData.printRole=role;g.userData.shadowDisk=sh.geometry;
        g.userData.printPlane=new T.PlaneGeometry(w*1.12,w*.80);dressShadow(g);
      }
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
      A[0] = an.hd.x + Math.sin(t * 1.7 + d.seed) * 0.05 + wk * s * 0.07; TT[0].set(0, br * 0.012 - wk * Math.abs(s) * 0.012);
      // the staff arm: a long staff (most costumes) only tips a little toward the monsters, or it would cross the face (fwd),
      // and rises a little as it does (lift); backward it swings freely
      // (when the staff is its own picture in front of the body it swings fully: it no longer drags the face along)
      var sr = d.rig && d.rig.armL, sa = an.aL.x, fwd = d.split ? 1 : sr && sr.fwd !== undefined ? sr.fwd : 1;
      A[1] = (sa > 0 ? sa * fwd : sa) + wk * s * 0.3 + br * 0.04 - air * 0.4;
      if (sr && sr.lift && !d.split) TT[1].set(0, Math.max(0, sa) * sr.lift); else TT[1].set(0, 0);
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
      if (views) setHeroViews(null);
      if (hero) heroGroup.remove(hero);
      hero = billboard(art, HERO_H, undefined, 1); hero.userData.seed = 0.5; hero.userData.art = art; heroGroup.add(hero); cos.aura = null; if (cos.fx) attachAura();
      ghosts.forEach(function (gh) { heroGroup.remove(gh.mesh); }); ghosts.length = 0;
      for (var i = 0; i < 3; i++) {
        var gm = new T.Mesh(hero.userData.body.geometry, bbMaterial(art.tex)); gm.renderOrder = 2; gm.visible = false; gm.scale.setScalar(HERO_H); gm.rotation.order = 'YXZ'; gm.rotation.x = -TILT;
        gm.material.depthWrite = false; heroGroup.add(gm); ghosts.push({ mesh: gm, t: 1, life: 0.35 });
      }
    }
    // a second, stiff piece drawn just in front of a billboard: the staff cut out of its picture (sharing every setting
    // of the body — bones, bend, flash, tint — but its own picture)
    function staffPiece(body, art, map) {
      var su = {}, bu = body.material.uniforms; for (var k in bu) su[k] = bu[k];
      su.map = { value: map };
      var sm = new T.Mesh(rigGeometry(art, 'staff'), new T.ShaderMaterial({ uniforms: su, vertexShader: BB_VS, fragmentShader: BB_FS, transparent: true, depthWrite: body.material.depthWrite, side: T.DoubleSide }));
      sm.renderOrder = body.renderOrder + 1; sm.position.z = 0.004; body.add(sm);
      return sm;
    }
    // swap the hero's picture (equipment changes how the wizard looks).
    // split = { body, staff } (staff-split.js): the staff cut out of the picture is drawn as its own piece just in front of
    // the body and turns stiffly at the paw, so the wizard can really swing it (2026-11-15). The afterimages do the same.
    function setHeroTexture(tex, split) {
      if (!hero) return;
      var d = hero.userData, art = d.art, old = [d.u.map.value, d.staffMesh && d.staffMesh.material.uniforms.map.value, d.fullTex];
      var on = !!(split && art && art.rig);
      d.body.geometry = rigGeometry(art, on ? 'body' : null);
      if (cos.aura) cos.aura.geometry = d.body.geometry;
      d.u.map.value = on ? split.body : tex; d.fullTex = tex; d.split = on;
      if (on && !d.staffMesh) d.staffMesh = staffPiece(d.body, art, split.staff);
      if (d.staffMesh) { d.staffMesh.visible = on; if (on) d.staffMesh.material.uniforms.map.value = split.staff; }
      ghosts.forEach(function (gh) {
        gh.mesh.geometry = d.body.geometry; gh.mesh.material.uniforms.map.value = on ? split.body : tex;
        if (on && !gh.staff) gh.staff = staffPiece(gh.mesh, art, split.staff);
        if (gh.staff) { gh.staff.visible = on; if (on) gh.staff.material.uniforms.map.value = split.staff; }
      });
      var now = [d.u.map.value, d.staffMesh && d.staffMesh.material.uniforms.map.value, tex];
      old.forEach(function (o) { if (o && o._look && now.indexOf(o) < 0) o.dispose(); });
    }
    // ---------- the plain wizard seen from four sides (2026-11-15, the user's turnaround) ----------
    // While no costume is worn the wizard is drawn from one of four pictures (art/hero-v0..v3: front, three-quarter,
    // side, back), picked from where it is looking: at its target while it fights, otherwise where it walks — toward the
    // camera the front, across the side, away the back, in between the three-quarter — and mirrored for the left.
    // The front-facing picture (hero) still runs the brain, springs and spell poses, unseen; the shown view copies its
    // bend, squash, flash and light and moves its own bones with the same walk and arm settings. The staff is the piece
    // cut out of the plain wizard's picture (staff-split.js), held at the paw (rig armL.grip) and turned with the arm.
    var views = null;
    // which way the staff leans in each view for a wizard looking right (the cut-out staff leans up and to the left)
    var VIEW_STAFF = [1, -1, -1, -1];
    function setHeroViews(arts, texs, staff) {
      if (views) views.list.forEach(function (g) { heroGroup.remove(g); });
      views = null;
      if (hero) hero.userData.body.visible = true;
      if (!arts || !hero) return;
      var list = arts.map(function (a, i) {
        var g = billboard(a, HERO_H); g.userData.u.uArtRole.value=1; g.userData.art = a; g.userData.u.map.value = texs[i]; g.userData.shadow.visible = false; g.visible = false;
        // a costume's views have the staff drawn in (it bends with the arm bone, rig armL.cap); the plain wizard's get the
        // staff cut out of its picture, in front of the body (behind it in the back view)
        if (staff) {
          var sg = new T.PlaneGeometry(staff.w, staff.h); sg.translate(staff.w / 2 - staff.gx, staff.h / 2 - staff.gy, 0);
          var sm = new T.Mesh(sg, new T.MeshBasicMaterial({ map: staff.tex, transparent: true, depthWrite: false, side: T.DoubleSide }));
          sm.renderOrder = i === 3 ? 2 : 4; g.userData.body.add(sm); g.userData.staff = sm;
        }
        heroGroup.add(g);
        return g;
      });
      views = { list: list, cur: 0, want: 0, wantT: 0, hold: 0, face: 1, staff: staff };
      hero.userData.body.visible = false;
      viewAuras();
    }
    function viewsTick(dt, arms) {
      var V = views, hd = hero.userData, f = HB.focus, lx = 0, lz = 0, want = V.cur;
      if (f && f.alive && HB.cheer <= 0 && f.arrived) { lx = f.x - HB.x; lz = f.z - HB.z; }
      else if (HB.sp > 0.35) { lx = HB.vx; lz = HB.vz; }
      // seen from where the camera is now: lx across the screen, lz toward the camera
      var vlx = scrX(lx, lz), vlz = lx * sY + lz * cY; lx = vlx; lz = vlz;
      if (HB.cheer > 0) want = 0;
      else if (lx * lx + lz * lz > 0.02) {
        var a = Math.atan2(-lz, Math.abs(lx)) * 57.3;   // + is up the screen (away from the camera)
        want = a < -55 ? 0 : a < -20 ? 1 : a < 40 ? 2 : 3;
        if (Math.abs(lx) > 0.15) V.face = lx < 0 ? -1 : 1;
      } else { want = f ? V.cur : 1; V.face = HB.faceT; }   // standing and looking around: three-quarter, the way it turned
      V.hold -= dt;
      if (want !== V.cur) { V.wantT += dt; if (V.wantT > 0.1 && V.hold <= 0) { V.cur = want; V.hold = 0.22; V.wantT = 0; hd.sq.v -= 0.5; } }
      else V.wantT = 0;
      var g = V.list[V.cur], d = g.userData, u = d.u, hu = hd.u;
      for (var i = 0; i < V.list.length; i++) V.list[i].visible = i === V.cur;
      u.uBend.value = hu.uBend.value; u.uScale.value.set(Math.abs(hu.uScale.value.x) * V.face, hu.uScale.value.y);
      u.uLight.value.copy(hu.uLight.value); u.uFlash.value = hu.uFlash.value; u.uFlashCol.value.copy(hu.uFlashCol.value);
      u.uFreeze.value = hu.uFreeze.value; u.uOpacity.value = hu.uOpacity.value; u.uDissolve.value = hu.uDissolve.value; u.uTint.value.copy(hu.uTint.value);
      animRig(g, dt, arms);
      g.position.copy(hero.position);
      var st = d.staff; if (!st) return;
      var gr = d.rig.armL.grip, c = d.crop, p = pointOn(g, (gr[0] - c.x0) / c.cw, 1 - (gr[1] - c.y0) / c.ch);
      var s = VIEW_STAFF[V.cur] * V.face;
      st.position.set(p.x / HERO_H, p.y / HERO_H, V.cur === 3 ? -0.006 : 0.006);
      st.scale.set(s * Math.abs(u.uScale.value.x), u.uScale.value.y, 1);
      st.rotation.z = u.uBA.value[1] * s;
    }
    var tipV = new T.Vector3();
    function viewTip() {
      if (!views.staff) { var vg = views.list[views.cur], vd = vg.userData, q = vd.rig.armL.tip, c = vd.crop, p = pointOn(vg, (q[0] - c.x0) / c.cw, 1 - (q[1] - c.y0) / c.ch), o = bbPt(p.x, p.y, 0.1); return new T.Vector3(heroGroup.position.x + vg.position.x + o.x, heroGroup.position.y + vg.position.y + o.y, heroGroup.position.z + vg.position.z + o.z); }
      var st = views.list[views.cur].userData.staff, S = views.staff;
      st.updateMatrixWorld(true); return tipV.set(S.tx - S.gx, S.ty - S.gy, 0).applyMatrix4(st.matrixWorld).clone();
    }
    var HERO_H = 1.02, CUTE = HERO_H / 1.45, TILT = 0.6, COS_T = Math.cos(TILT), SIN_T = Math.sin(TILT);
    auraGroup.scale.setScalar(CUTE);
    // Staff star position inside the hero art (fraction of width from the left, of height from the feet).
    var TIP_U = 0.16, TIP_V = 0.61;
    function heroLocal(u, v) {
      var p = pointOn(hero, u, v), o = bbPt(p.x, p.y, 0.1);
      return new T.Vector3(heroGroup.position.x + hero.position.x + o.x, heroGroup.position.y + hero.position.y + o.y, heroGroup.position.z + hero.position.z + o.z);
    }
    // The staff's head in the picture now worn: the rig's tip (rig.js armL.tip), else the top of its staff strip. (It used
    // to be the plain wizard's star for every picture, which in a costume is beside the helmet — the staff's twinkles and
    // its swing trail came from there, 2026-11-15.)
    function tipUV() {
      var d = hero.userData, a = d.rig && d.rig.armL, c = d.crop, q = a && (a.tip || a.cap);
      return q && c ? [(q[0] - c.x0) / c.cw, 1 - (q[1] - c.y0) / c.ch] : [TIP_U, TIP_V];
    }
    function heroTip() { if (!hero) return new T.Vector3(-1.85, 1.1, 0.35); if (views) return viewTip(); var t = tipUV(); return heroLocal(t[0], t[1]); }
    // spells leave from just in front of the raised paw so they never cross the face
    function heroPaw() { var p = hero ? heroLocal(0.86, 0.5) : new T.Vector3(-0.75, 0.9, 0.35); p.z += 0.12; return p; }
    function heroCenter() { var h = HERO_H * 0.5, o = bbPt(0, h, 0); return new T.Vector3(heroGroup.position.x + (hero ? hero.position.x : 0) + o.x, o.y + (hero ? hero.position.y : 0), heroGroup.position.z + (hero ? hero.position.z : 0) + o.z); }

    // ---------- hero cast poses ----------
    // a* = anticipation (lean/crouch), r* = release kick, hb/hs = pose kept for a moment after release,
    // aR/rR = paw arm (+ up, - out toward the monsters), aL/rL = staff arm (- lifts the staff over the head).
    var POSES = {
      thrust: { ab: -0.14, as: -0.06, ax: -0.03, rb: 2.4, rs: 2.0, rl: 0.4, rx: 0.8, hb: 0.06, hs: 0, aR: 0.55, rR: -1.05, aL: -0.35, rL: 0.7, kick: 0.6 },
      raise: { ab: -0.03, as: -0.12, ax: 0, rb: 1.0, rs: 4.0, rl: 2.4, rx: 0, hb: 0, hs: 0.07, aR: -0.2, rR: 0.95, aL: -0.3, rL: 0.8, kick: 0.2, hold: 0.55 },
      swipe: { ab: -0.17, as: -0.05, ax: -0.05, rb: 3.6, rs: 1.4, rl: 0.8, rx: 2.0, hb: 0.12, hs: 0, aR: 1.0, rR: -1.35, aL: -0.45, rL: 0.8, kick: -0.9 },
      toss: { ab: -0.19, as: -0.09, ax: -0.03, rb: 3.0, rs: 2.6, rl: 0.9, rx: 0.6, hb: 0.07, hs: 0, aR: 1.15, rR: -0.95, aL: -0.35, rL: 0.65, kick: 0.4 },
      spin: { ab: 0, as: -0.12, ax: 0, rb: 0.5, rs: 3.0, rl: 2.0, rx: 0, hb: 0, hs: 0.05, hop: 3.1, aR: 0.3, rR: 0.9, aL: -0.3, rL: 0.85 },
      // the big moment of a spell (2026-11-15): the staff comes down hard as it bursts, the body ducks into it
      slam: { ab: 0.04, as: 0.05, ax: 0, rb: 3.0, rs: -2.6, rl: -0.6, rx: 1.0, hb: 0.08, hs: -0.06, aR: 0.2, rR: -0.9, aL: -0.15, rL: 1.15, kick: 0.3 }
    };
    var pose = null, heroGlow = 0, heroGlowCol = new T.Color();
    function heroPose(type, antic, color) {
      pose = { P: POSES[type] || POSES.thrust, t: 0, a: Math.max(0.03, antic || 0.12), rel: false };
      if (color !== undefined) { heroGlowCol.setHex(color); }
      HB.lock = Math.max(HB.lock, (antic || 0.12) + 0.14);
    }
    var beatT = -9;
    function heroBeat() {
      if (!hero || (pose && !pose.rel) || time - beatT < 0.35) return;
      beatT = time; heroPose('slam', 0.03);
    }
    function heroGlowPulse(color, amt) { heroGlowCol.setHex(color); heroGlow = Math.max(heroGlow, amt === undefined ? 1 : amt); }
    var ghosts = [];
    function ghost(color, still) {
      if (!hero) return;
      var gh = null; for (var i = 0; i < ghosts.length; i++) if (ghosts[i].t >= ghosts[i].life) { gh = ghosts[i]; break; }
      if (!gh) return;
      var u = gh.mesh.material.uniforms, hu = hero.userData.u;
      u.uBend.value = hu.uBend.value; u.uScale.value.copy(hu.uScale.value); u.uH.value = hu.uH.value;
      for (var b = 0; b < 8; b++) { u.uBP.value[b].copy(hu.uBP.value[b]); u.uBT.value[b].copy(hu.uBT.value[b]); u.uBA.value[b] = hu.uBA.value[b]; }
      if (views) { var vd = views.list[views.cur].userData; gh.mesh.geometry = vd.body.geometry; u.map.value = vd.u.map.value; u.uScale.value.copy(vd.u.uScale.value); for (var vb = 0; vb < 8; vb++) { u.uBP.value[vb].copy(vd.u.uBP.value[vb]); u.uBT.value[vb].copy(vd.u.uBT.value[vb]); u.uBA.value[vb] = vd.u.uBA.value[vb]; } if (gh.staff) gh.staff.visible = false; }
      u.uFlash.value = 0.55; u.uFlashCol.value.setHex(color); u.uOpacity.value = 0.55;
      gh.wx = HB.x + hero.position.x; gh.wy = hero.position.y; gh.wz = HB.z + hero.position.z - 0.05; gh.vx = still ? 0 : -0.9 * HB.faceT * cY; gh.vz = still ? 0 : 0.9 * HB.faceT * sY; gh.life = still ? 0.26 : 0.35;
      gh.mesh.position.set(hero.position.x, gh.wy, -0.05); gh.mesh.visible = true; gh.t = 0;
    }
    // hero state: a battle mage that hunts on the move — runs to the nearest monster, keeps casting range,
    // circles while it casts, steps back from the recoil and dashes out of the way of a claw
    var HB = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0, face: 1, faceT: 1, turnT: 0, aim: 0, lock: 0, walk: 0, sp: 0,
      focus: null, focusT: 0, orbit: 1, orbitT: 3, px: 0, pz: 0, pt: 0, dash: 0, dvx: 0, dvz: 0, dashCd: 0, ghostT: 0, kx: 0, kz: 0, cheer: 0,
      // hunting like a person (the user, 2026-11-15): with nobody around the wizard looks around (look, lookT); a monster it
      // newly spots makes it stop, turn to it and start ("!" mark, spot); a moving boss is followed, not circled
      look: 0, lookT: 0, lookS: 0, spot: 0, spotM: null, lost: 9, seen: null, lean: 0 };
    var HERO_ZONE = { x0: -2.0, x1: 1.8, z0: -3.0, z1: 2.2 };
    // turning: one quick snap with a little squash, at most every 0.8 s, so the wizard does not keep flipping in a fight
    function heroTurn(dir) { if (dir === HB.faceT || HB.turnT > 0) return; HB.faceT = dir; HB.turnT = 0.8; if (hero) hero.userData.sq.v -= 0.8; }
    function heroFaceTo(x, z) { HB.aim = 0.75; var s = scrX(x - HB.x, z === undefined ? 0 : z - HB.z); if (Math.abs(s) > 0.3) heroTurn(s < 0 ? -1 : 1); }
    function heroCheer(sec) { HB.cheer = Math.max(HB.cheer, sec || 1.2); }
    function heroDodge(from) {
      if (!hero || HB.dash > 0 || HB.dashCd > 0 || HB.cheer > 0) return;
      var ax = from ? HB.x - from.x : rr(-1, 1), az = from ? HB.z - from.z : rr(-1, 1), al = Math.sqrt(ax * ax + az * az) || 1, Z = heroZone();
      ax /= al; az /= al;
      // slip out sideways, toward whichever side has more room
      var side = Math.random() < 0.5 ? 1 : -1, dx = ax * 0.5 - az * side * 0.87, dz = az * 0.5 + ax * side * 0.87, tx = HB.x + dx * 1.3, tz = HB.z + dz * 1.3;
      if (tx < Z.x0 || tx > Z.x1 || tz < Z.z0 || tz > Z.z1) { dx = ax * 0.5 + az * side * 0.87; dz = az * 0.5 - ax * side * 0.87; }
      HB.dash = 0.2; HB.dvx = dx * 6.4; HB.dvz = dz * 6.4; HB.dashCd = rr(1.2, 2.0); HB.ghostT = 0; HB.vy = Math.max(HB.vy, 2.4);
      hero.userData.sq.v -= 2.4; hero.userData.bend.v += scrX(dx, dz) * 3;
      if (hooks.land) hooks.land(new T.Vector3(HB.x, 0.03, HB.z), false);
    }

    // ---------- monsters ----------
    var FIELD = { z0: -4.6, z1: 3.8 };
    function halfX(z) { return (2.2 + (3.8 - z) * 0.16) * (laneActive ? LAND_FX : 1); }
    // Where a monster may go is also kept inside what the camera shows now: on a tall phone the painted field is wider
    // than the picture, and the camera follows the wizard a little, so a monster (or a boss) could walk out past the edge,
    // or under the skill bar, and every spell aimed at it flew off the screen with it. The limits are for a monster's
    // middle (0.6 above the ground): left/right VIEW_X of the picture's half width, below the top bar, above the skills.
    var VIEW_X = 0.8, VIEW_TOP = 0.62, VIEW_BOT = -0.42, MID_Y = 0.6, VM = new T.Matrix4();
    function viewBox(z) {
      VM.multiplyMatrices(homeCam.projectionMatrix, homeInv); var e = VM.elements;
      // clip = VM * (x, MID_Y, z, 1); ndc.x = (e0 x + b) / (e3 x + d) solved for x at ±VIEW_X; ndc.y the same for z
      var b = e[4] * MID_Y + e[8] * z + e[12], d = e[7] * MID_Y + e[11] * z + e[15];
      var xAt = function (t) { return (t * d - b) / (e[0] - t * e[3]); };
      var zAt = function (t) { return (t * (e[7] * MID_Y + e[15]) - (e[5] * MID_Y + e[13])) / (e[9] - t * e[11]); };
      return { x0: xAt(-VIEW_X), x1: xAt(VIEW_X), zFar: zAt(VIEW_TOP), zNear: zAt(VIEW_BOT) };
    }
    // ---- the sideways lane (가로 시점) ----
    // What the usual view shows of the ground (at a monster's middle, inside VIEW_X / VIEW_TOP / VIEW_BOT), in lane terms:
    // its left and right ends at the far and the near side, and its far and near limits. Worked out once a frame.
    var LB = { f: -9 }, LBp = new T.Vector3(), LBd = new T.Vector3(), LANE_BOT = -0.28;
    function laneBox() {
      if (LB.f === laneFrame) return LB; LB.f = laneFrame;
      homeCam.updateMatrixWorld();
      var at = function (nx, ny) {
        LBp.set(nx, ny, 0.5).unproject(homeCam); LBd.copy(LBp).sub(homeCam.position);
        var t = Math.abs(LBd.y) > 1e-6 ? (MID_Y - homeCam.position.y) / LBd.y : 0, x = homeCam.position.x + LBd.x * t, z = homeCam.position.z + LBd.z * t;
        return { u: laneU(x, z), v: laneV(x, z) };
      };
      // (the low limit a little higher than upright: the skills sit at the bottom right, over the monsters' half)
      var fl = at(-VIEW_X, VIEW_TOP), fr = at(VIEW_X, VIEW_TOP), nl = at(-VIEW_X, LANE_BOT), nr = at(VIEW_X, LANE_BOT);
      LB.uLf = fl.u; LB.uRf = fr.u; LB.uLn = nl.u; LB.uRn = nr.u;
      LB.vFar = Math.max(fl.v, fr.v); LB.vNear = Math.min(nl.v, nr.v);
      LB.uL = Math.max(LB.uLf, LB.uLn); LB.uR = Math.min(LB.uRf, LB.uRn);
      return LB;
    }
    // a spot kept on the field and in the usual view; a monster ('mob', the default) also kept LANE_GAP to the wizard's
    // right, so they never stand behind it; the little ones ('free') go anywhere in view
    function clampLane(p, who) {
      p.z = Math.max(FIELD.z0, Math.min(FIELD.z1, p.z)); var hx = halfX(p.z); p.x = Math.max(-hx, Math.min(hx, p.x));
      var B = laneBox(), u = laneU(p.x, p.z), v = laneV(p.x, p.z), span = B.vNear - B.vFar;
      if (span > 0) v = Math.max(B.vFar, Math.min(B.vNear, v));
      var k = span > 0 ? (v - B.vFar) / span : 0.5, uL = B.uLf + (B.uLn - B.uLf) * k, uR = B.uRf + (B.uRn - B.uRf) * k;
      if (who !== 'free') uL = Math.max(uL, Math.min(laneU(HB.x, HB.z) + LANE_GAP, uR - 0.6));
      if (uR > uL) u = Math.max(uL, Math.min(uR, u));
      var q = fromLane(u, v); p.x = q.x; p.z = q.z; return p;
    }
    // where the wizard keeps: the left third of the lane, inside the view (as a box on the field: the lane runs along
    // the field's x (멀리서) or its z (옆에서))
    function laneHeroZone() {
      var B = laneBox(), a = B.uL + 0.3, b = B.uL + (B.uR - B.uL) * 0.34, p1 = fromLane(a, B.vFar + 0.4), p2 = fromLane(b, B.vNear - 0.3);
      return { x0: Math.min(p1.x, p2.x), x1: Math.max(p1.x, p2.x), z0: Math.min(p1.z, p2.z), z1: Math.max(p1.z, p2.z) };
    }
    function heroZone() { return laneActive ? laneHeroZone() : HERO_ZONE; }
    function clampField(p, who) {
      if (laneActive) return clampLane(p, who);
      var z0 = FIELD.z0, z1 = FIELD.z1, v = viewBox(0);
      if (isFinite(v.zFar) && isFinite(v.zNear) && v.zFar < v.zNear) { z0 = Math.max(z0, v.zFar); z1 = Math.min(z1, v.zNear); }
      p.z = Math.max(z0, Math.min(z1, p.z));
      var hx = halfX(p.z), x0 = -hx, x1 = hx; v = viewBox(p.z);
      if (isFinite(v.x0) && isFinite(v.x1) && v.x0 < v.x1) { x0 = Math.max(x0, v.x0); x1 = Math.min(x1, v.x1); }
      p.x = Math.max(x0, Math.min(x1, p.x)); return p;
    }
    function inView(m) { var p = clampField({ x: m.x, z: m.z }); return Math.abs(p.x - m.x) + Math.abs(p.z - m.z) < 0.05; }
    function ringSpot(r0, r1, boss) {
      // sideways: only on the wizard's right (the half circle facing the monsters' side)
      if (laneActive) { var la = rr(-1.2, 1.2), lr = rr(r0, r1), q = fromLane(laneU(HB.x, HB.z) + Math.cos(la) * lr, laneV(HB.x, HB.z) + Math.sin(la) * lr); return clampLane(q); }
      var a = rr(0, Math.PI * 2), r = rr(r0, r1);
      if (boss) a = rr(-Math.PI * 0.85, -Math.PI * 0.15);
      return clampField({ x: HB.x + Math.cos(a) * r, z: HB.z + Math.sin(a) * r * 1.15 });
    }
    var FLYERS = {}, GAITS = {};
    Object.keys(CW.BESTIARY || {}).forEach(function (id) { var b = CW.BESTIARY[id]; if (b.flyer) FLYERS[id] = 1; if (b.gait && b.gait !== 'walk') GAITS[id] = b.gait; });
    // how each kind of monster gets about: slimes and bunnies hop, penguins and mushrooms waddle, golems and knights stomp,
    // spiders dart and stop, ghosts and dragons glide. Pictures with arms and legs simply walk.
    function freeSpot(boss) {
      var best = null, bestS = -1e9;
      for (var k = 0; k < 16; k++) {
        var p;
        if (boss) p = ringSpot(1.9, 2.6, true);
        else if (laneActive) {
          // sideways: anywhere between a step right of the wizard and the right of the view, near or far
          var LBx = laneBox(), lu0 = Math.min(laneU(HB.x, HB.z) + 1.8, LBx.uR - 0.8);
          p = clampLane(fromLane(rr(lu0, LBx.uR - 0.2), rr(LBx.vFar + 0.2, LBx.vNear - 0.2)));
        }
        else { var z = rr(FIELD.z0 + 0.6, 2.7), hx = halfX(z) - 0.4; p = clampField({ x: rr(-hx, hx), z: z }); }
        var dh = Math.hypot(p.x - HB.x, p.z - HB.z), dmin = 9;
        if (!boss && dh < 1.3) continue;
        mobs.forEach(function (m) { var dd = Math.hypot(m.tx - p.x, m.tz - p.z); if (dd < dmin) dmin = dd; });
        // keep apart from each other, and do not hide too far from the wizard
        var sc0 = Math.min(dmin, 1.5) * 2 - Math.max(0, dh - 3.4) * 0.8 + Math.random() * 0.3;
        if (sc0 > bestS) { bestS = sc0; best = p; }
      }
      return best || ringSpot(1.6, 3.0, boss);
    }
    // def.entry: 'run' (rush in from the right), 'leap' (jump in), 'drop' (fall from the sky)
    function spawnMob(def) {
      var g = billboard(def.art, def.height || 1.25, def.tint, def.art.id === 'b49' ? 2 : 0), boss = !!def.boss, spot = freeSpot(boss);
      var entry = boss ? 'run' : def.entry || 'run';
      var mob = { group: g, hp: def.hp, maxHp: def.hp, boss: boss, regionBoss: !!def.regionBoss, alive: true, name: def.name, id: def.id,
        x: 0, z: 0, y: 0, vy: 0, tx: spot.x, tz: spot.z,
        state: 'enter', st: 0, speed: boss ? 1.5 : rr(2.6, 3.6), entry: entry, arrived: false, stun: 0, atk: 0, struck: false,
        flash: 0, frozen: 0, shocked: 0, freezeV: 0, phase: g.userData.seed, kx: spring(80, 9), face: 1, walk: 0, hurt: 0,
        flyer: !!def.flyer || !!FLYERS[def.art.id], cheer: 0, vx: 0, vz: 0, sp: 0,
        gait: def.gait || GAITS[def.art.id] || 'walk', hopCd: 0, pvx: 0, pvz: 0, tilt: spring(120, 9), dartT: 0, dartOn: true, orbDir: 1, orbR: 2.4 };
      // come in from the nearest screen edge: left, right, the far side or the near side
      var ang = Math.atan2((spot.z - HB.z) / 1.15, spot.x - HB.x), cx = Math.cos(ang), cz = Math.sin(ang);
      // sideways every one (the boss too) comes in from the right edge, at about the depth it is heading for
      if (laneActive) { var LBe = laneBox(), qe = fromLane(Math.max(LBe.uRf, LBe.uRn) + rr(1.2, 2), laneV(spot.x, spot.z) + rr(-0.6, 0.6)); mob.x = qe.x; mob.z = qe.z; }
      else if (boss) { mob.x = spot.x * 0.4; mob.z = FIELD.z0 - 2.5; }
      else if (Math.abs(cx) > Math.abs(cz) * 0.8) { mob.x = (cx > 0 ? 1 : -1) * (halfX(spot.z) + rr(1.2, 2)); mob.z = spot.z + rr(-0.6, 0.6); }
      else if (cz < 0) { mob.x = spot.x + rr(-1, 1); mob.z = FIELD.z0 - rr(1.5, 2.5); }
      else { mob.x = spot.x + rr(-1, 1); mob.z = FIELD.z1 + rr(1.6, 2.4); }
      if (entry === 'leap') { mob.vy = rr(5.5, 7.5); mob.speed = rr(3.2, 4.2); }
      if (entry === 'drop') { mob.x = spot.x; mob.z = spot.z; mob.y = rr(4.5, 6.5); mob.speed = 0; }
      if (def.id === 'exmob-gecko') mob.gait = 'crawl';
      if (def.id === 'exmob-tablet') {
        mob.gait = 'stomp'; mob.entry = 'unseal'; mob.state = 'unseal';
        mob.x = spot.x; mob.z = spot.z; mob.y = mob.vy = 0;
        mob.st = 0.85; g.userData.u.uBuried.value = 1.1;
        if (hooks.burrowDust) hooks.burrowDust(mob, false);
      }
      if (def.id === 'exmob-mole') {
        mob.x = spot.x; mob.z = spot.z;
        mob.entry = 'burrow'; mob.state = 'burrow'; mob.st = 0.55;
        g.visible = false;
        if (hooks.burrowDust) hooks.burrowDust(mob, false);
      }
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
      // A boss staggers now and then, not under every spell (the user 2026-11-17): a big hit (crit) at most every 1.8 s
      // makes it reel back, stop for a moment and straighten up again. Before, every hit of a barrage stunned it again and
      // bent it the same way, so it stood still bent over, slid to the edge on the knockback, and walked about still bent.
      // The hits in between only flash and shiver it.
      var stag = false;
      if (mob.boss) { if (p > 1.4 && !(mob.stunCd > 0)) { stag = true; mob.stun = Math.max(mob.stun, 0.35); mob.stunCd = 1.8; } heavy = stag ? 0.6 : 0.05; }
      mob.flash = Math.min(0.5, 0.28 + 0.12 * p);
      d.bend.v += 2.6 * p * heavy; d.sq.v -= 2.2 * p * heavy;
      mob.kx.v += 2.2 * p * heavy;
      if (mob.pull === undefined && mob.arrived) {
        var hx = mob.x - HB.x, hz = mob.z - HB.z, hl = Math.sqrt(hx * hx + hz * hz) || 1, push = 1.7 * p * heavy;
        mob.pvx += hx / hl * push; mob.pvz += hz / hl * push * 0.8;
        // a boss is only nudged: the shoves of many spells in a row would otherwise add up and carry it off to the edge
        var pl = Math.sqrt(mob.pvx * mob.pvx + mob.pvz * mob.pvz), pmax = mob.boss ? 0.9 : 3.6; if (pl > pmax) { mob.pvx *= pmax / pl; mob.pvz *= pmax / pl; }
        mob.tilt.v -= (scrX(hx, hz) > 0 ? 1 : -1) * 2.6 * p * heavy;
      }
      if (!mob.boss || stag) mob.hurt = Math.min(1, mob.hurt + 0.6 * p);
      if (!mob.boss) mob.stun = Math.max(mob.stun, 0.22 + 0.08 * p);
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
    // a monster quietly taken off the field (no death, no reward): the field is over its size after the quality dropped
    function dismissMob(mob) {
      if (!mob.alive) return;
      mob.alive = false; mobs.splice(mobs.indexOf(mob), 1); if (HB.focus === mob) HB.focus = null;
      mobGroup.remove(mob.group); disposeGroup(mob.group);
    }
    // the little ones milling round the fight (js/minions.js): cheap stiff pictures that burst in crowds where spells land
    var minions = CW.createMinions ? CW.createMinions({ T: T, group: mobGroup, tilt: TILT, yaw: function () { return orb.yaw; }, scrX: scrX, clampField: function (p) { return clampField(p, 'free'); }, halfX: halfX, field: FIELD,
      hero: function () { return HB; }, mobs: function () { return mobs; } }) : null;
    function disposeGroup(g) { var d=g.userData; if(d.printPlane){var spare=d.shadow.geometry===d.printPlane?d.shadowDisk:d.printPlane;spare.dispose();} g.traverse(function (x) { if (x.geometry && !x.geometry.userData.cached) x.geometry.dispose(); if (x.material && x.material.dispose) x.material.dispose(); }); }
    function clearMobs() { if (minions) minions.clear(); HB.focus = null; mobs.slice().forEach(function (m) { m.alive = false; mobGroup.remove(m.group); disposeGroup(m.group); }); mobs.length = 0; dying.forEach(function (m) { mobGroup.remove(m.group); disposeGroup(m.group); }); dying.length = 0; }
    function mobPos(mob) { var g = mob.group, o = bbPt(0, g.userData.h * 0.5, 0.15); return new T.Vector3(g.position.x + o.x, o.y + g.position.y, g.position.z + o.z); }
    function mobTop(mob) { var g = mob.group, o = bbPt(0, g.userData.h * 0.92, 0.15); return new T.Vector3(g.position.x + o.x, o.y + g.position.y, g.position.z + o.z); }

    // ---------- tier aura ----------
    var AURA = [null, 0xff6a2b, 0x9fd8ff, 0xbfefff, 0xffe14a, 0xe6e6ff, 0xffd84a, 0xb04bff, 0xffffff, 0xff8a3a, 0x3fb8e8];   // (11th: water)
    var aura = { ring: null, orbs: [], wings: [] };
    function setTierAura(tier) {
      while (auraGroup.children.length) auraGroup.remove(auraGroup.children[0]);
      aura = { ring: null, orbs: [], wings: [] };
      var col = tier < 2 ? 0xffe9a0 : AURA[tier - 1];
      var ring = new T.Mesh(new T.RingGeometry(0.62, 0.7, 48), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.renderOrder = 2; auraGroup.add(ring); aura.ring = ring;
      if (tier < 2) { ring.material.opacity = 0.7; return; }
      if (tier >= 3) { var r2 = ring.clone(); r2.material = ring.material.clone(); r2.scale.setScalar(0.72); auraGroup.add(r2); aura.ring2 = r2; }
      if (tier >= 5) for (var i = 0; i < (tier >= 7 ? 5 : 3); i++) { var o = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: col, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); o.scale.setScalar(0.32); o.renderOrder = 4; auraGroup.add(o); aura.orbs.push(o); }
      // (the 9th tier's halo over the head is gone, 2026-11-15: it sat on the head with a light as big as the head and
      // washed the hat or helmet out white — the user asked to drop it)
    }

    // ---------- worn costume: an aura hugging the wizard's outline and a soft light behind ----------
    // on: the billboard that gets it (the wizard, or one of its side views); the wizard's own is cos.aura
    function attachAura(on) {
      var f = cos.fx; if (!hero || !f) return;
      if (f.sheen) return attachSheen(on);
      var tg = on || hero, hu = tg.userData.u, body = tg.userData.body, dark = /shadow|void|doom/.test(f.parts || '');
      var mat = new T.ShaderMaterial({
        uniforms: { map: hu.map, uBend: hu.uBend, uScale: hu.uScale, uH: hu.uH, uBP: hu.uBP, uBA: hu.uBA, uBT: hu.uBT,
          uCol: { value: new T.Color(f.col) }, uCol2: { value: new T.Color(f.col2 || f.col) }, uTime: { value: 0 }, uAmt: { value: f.aura }, uAdd: { value: dark ? 0 : 1 } },
        vertexShader: BB_VS, fragmentShader: AURA_FS, transparent: true, depthWrite: false, blending: dark ? T.NormalBlending : T.AdditiveBlending, side: T.DoubleSide });
      var am = new T.Mesh(body.geometry, mat); am.scale.set(1.2, 1.12, 1); am.position.z = -0.03; am.renderOrder = 2;
      body.add(am); if (!on) cos.aura = am;
      return am;
    }
    function attachSheen(on) {
      var f = cos.fx, s = f.sheen, tg = on || hero, hu = tg.userData.u, body = tg.userData.body;
      var mat = new T.ShaderMaterial({
        uniforms: { map: hu.map, uBend: hu.uBend, uScale: hu.uScale, uH: hu.uH, uBP: hu.uBP, uBA: hu.uBA, uBT: hu.uBT,
          uCol: { value: new T.Color(f.col) }, uCol2: { value: new T.Color(f.col2 || f.col) }, uTime: { value: 0 },
          uRim: { value: s.rim === undefined ? 0.35 : s.rim }, uSweep: { value: s.sweep === undefined ? 0.55 : s.sweep },
          uGlint: { value: s.glint === undefined ? 0.9 : s.glint }, uPeriod: { value: s.period || 3.6 }, uRainbow: { value: s.rainbow || 0 } },
        vertexShader: BB_VS, fragmentShader: SHEEN_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
      var am = new T.Mesh(body.geometry, mat); am.position.z = 0.004; am.renderOrder = (body.renderOrder || 0) + 1;
      body.add(am); if (!on) cos.aura = am; cos.sheen = true;
      return am;
    }
    // the costume's aura or sheen on each side view as well (they show instead of the front-facing picture)
    function viewAuras() {
      if (!views) return;
      views.list.forEach(function (g) {
        var d = g.userData; if (d.aura && d.aura.parent) d.aura.parent.remove(d.aura);
        d.aura = cos.fx ? attachAura(g) : null;
      });
    }
    function setCostumeFx(f) {
      while (cosGroup.children.length) cosGroup.remove(cosGroup.children[0]);
      if (cos.aura && cos.aura.parent) cos.aura.parent.remove(cos.aura);
      cos = { fx: f, aura: null, glow: null };
      if (!f) { viewAuras(); return; }
      attachAura(); viewAuras();
      var gl = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: f.col, transparent: true, opacity: f.glow, depthWrite: false, blending: T.AdditiveBlending }));
      gl.scale.set(1.9 * CUTE, 2.3 * CUTE, 1); gl.position.set(0, 0.85 * CUTE, -0.4 * CUTE); gl.renderOrder = 1; cosGroup.add(gl); cos.glow = gl;
      if (f.sheen) gl.scale.set(1.3 * CUTE, 1.7 * CUTE, 1);
    }
    function costumeTick(dt) {
      if (!cos.fx) return;
      var aus = [cos.aura]; if (views) views.list.forEach(function (g) { aus.push(g.userData.aura); });
      aus.forEach(function (a) {
        if (!a) return; var u = a.material.uniforms; u.uTime.value = time;
        if (!cos.sheen) u.uAmt.value = cos.fx.aura * (0.82 + Math.sin(time * 2.2) * 0.18);
      });
      if (cos.glow) { cos.glow.material.opacity = cos.fx.glow * (0.8 + Math.sin(time * 2.2) * 0.2); if (hero) cos.glow.position.set(hero.position.x - 0.4 * CUTE * sY, 0.85 * CUTE + hero.position.y, hero.position.z - 0.4 * CUTE * cY); }
    }

    // ---------- damage numbers (DOM overlay) ----------
    var pool = [];
    // a number that is not showing is taken out of the page (display none): with only opacity 0 each of the 40 (64 since the little ones show numbers too, 2026-11-16) kept its
    // own drawing layer (will-change) all the time, which phones pay for on every frame
    for (var p = 0; p < 64; p++) { var d = document.createElement('div'); d.className = 'dmg'; d.style.display = 'none'; overlay.appendChild(d); pool.push({ el: d, t: 0, x: 0, y: 0, live: false, crit: false, dir: 1 }); }
    // the player's choice in 설정: size and see-through of the numbers (fractions of the drawn size and of full colour)
    var dmgSize = 0.6, dmgAlpha = 0.85;
    function setDamageStyle(size, alpha) { dmgSize = Math.max(0.3, Math.min(1.5, size)); dmgAlpha = Math.max(0.05, Math.min(1, alpha)); }
    var tmpV = new T.Vector3();
    function screenPos(pos) {
      tmpV.copy(pos).project(camera);
      return { x: (tmpV.x * 0.5 + 0.5) * cssW, y: (-tmpV.y * 0.5 + 0.5) * cssH };
    }
    var damageHidden = false;
    function setDamageHidden(hidden) {
      damageHidden = hidden;
      if (hidden) pool.forEach(function (slot) {
        if (slot.live) { slot.live = false; slot.el.style.display = 'none'; }
      });
    }
    function damageText(pos, text, crit, color) {
      if (damageHidden) return;
      var slot = null; for (var i = 0; i < pool.length; i++) if (!pool[i].live) { slot = pool[i]; break; }
      if (!slot) { slot = pool[0]; for (var j = 1; j < pool.length; j++) if (pool[j].t > slot.t) slot = pool[j]; }
      var sp = screenPos(pos);
      slot.x = sp.x + (Math.random() - 0.5) * 34; slot.y = sp.y - 14 - Math.random() * 12;
      var tier = crit === true ? 1 : (+crit || 0), TT = CW.DATA && CW.DATA.critTiers;
      slot.t = 0; slot.live = true; slot.crit = tier > 0; slot.tier = tier; slot.dir = Math.random() < 0.5 ? -1 : 1;
      var html = (tier >= 2 && TT ? '<small>' + TT[tier - 1].name + '</small>' : '') + text;
      if (slot.html !== html) { slot.html = html; slot.el.innerHTML = html; }
      var cls = 'dmg' + (tier ? ' crit c' + tier : '');
      if (slot.el.className !== cls) slot.el.className = cls;
      slot.el.style.color = tier ? '' : (color || '');
      slot.el.style.display = '';
    }

    // ---------- screen effects ----------
    function layer(bg) { var el = document.createElement('div'); el.style.cssText = 'position:absolute;inset:0;opacity:0;pointer-events:none;background:' + bg; overlay.appendChild(el); return el; }
    // darkening drawn inside the scene: after the world and the characters, before the spell effects (the painted ones, order 9 and up, and the 3D ones, 6 and up)
    var dimMat = new T.ShaderMaterial({ uniforms: { uDim: { value: 0 } }, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform float uDim; varying vec2 vUv; void main(){ vec2 p = (vUv - vec2(0.55, 0.45)) * vec2(1.0, 1.25); float v = smoothstep(0.15, 0.75, length(p)); vec3 c = mix(vec3(0.07, 0.03, 0.15), vec3(0.02, 0.0, 0.06), v); gl_FragColor = vec4(c, uDim * (0.72 + 0.28 * v)); }' });
    var dimMesh = new T.Mesh(new T.PlaneGeometry(2, 2), dimMat); dimMesh.frustumCulled = false; dimMesh.renderOrder = 5.95;   // under the 3D spell parts (fx3d, order 6 and up): drawn after them it turned their light grey (2026-11-15). Smoke and chips (4, 5) stay under it with the world dimMesh.visible = false; scene.add(dimMesh);
    var flashEl = layer('#fff'); flashEl.className = 'screen-flash';
    var flashA = 0, dimA = 0, dimTarget = 0, dimT = 0;
    function flash(color, amount) { flashEl.style.background = color; flashA = Math.max(flashA, Math.min(0.42, amount)); }
    function dim(amount, dur) { dimTarget = Math.max(dimTarget, Math.min(0.32, amount)); dimT = Math.max(dimT, dur || 0.5); }
    var trauma = 0, punchV = 0, punch = 0, kick = new T.Vector3(), pan = { x: 0, z: 0 };
    function shake(a) { trauma = Math.min(1, trauma + a * 1.8); if (a >= 0.5) heroBeat(); }
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
    // js/timescale.js: hits and big skills only dip the speed and let it come back smoothly; the game never freezes
    // (a freeze, or a slow part ending with a jump, reads as the game stopping on a phone)
    var timeScale = CW.createTimeScale();
    // a spell's slow motion and its single big moment are where it bursts: the wizard's staff comes down right then
    var hitStop = timeScale.hitStop, scaleDt = timeScale.scaleDt;
    function slowmo() { heroBeat(); return timeScale.slowmo.apply(null, arguments); }
    function climax() { heroBeat(); return timeScale.climax.apply(null, arguments); }


    var tmpC = new T.Color();
    // every standing picture turns to the camera (only round the upright: they still lean back by TILT)
    function turnToCam() {
      var y = orb.yaw, i;
      if (hero) hero.rotation.y = y;
      if (views) for (i = 0; i < views.list.length; i++) views.list[i].rotation.y = y;
      for (i = 0; i < mobs.length; i++) mobs[i].group.rotation.y = y;
      for (i = 0; i < dying.length; i++) dying[i].group.rotation.y = y;
      for (i = 0; i < ghosts.length; i++) ghosts[i].mesh.rotation.y = y;
      if (painted && painted.turn) painted.turn(y);
    }
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
      var hd = hero.userData, Z = heroZone(), i, m;
      HB.lock = Math.max(0, HB.lock - dt); HB.turnT -= dt; HB.aim = Math.max(0, HB.aim - dt); HB.dashCd -= dt; HB.orbitT -= dt; HB.focusT -= dt; HB.cheer = Math.max(0, HB.cheer - dt);
      // who to hunt: the nearest monster, kept for a moment so the wizard does not dither between two
      var f = HB.focus;
      if (!f || !f.alive || HB.focusT <= 0) {
        var best = null, bd = 1e9;
        for (i = 0; i < mobs.length; i++) {
          // one still on its way in counts from the spot it is heading for, so the wizard goes to meet it there
          m = mobs[i]; var ox = (m.arrived ? m.x : m.tx) - HB.x, oz = (m.arrived ? m.z : m.tz) - HB.z, od = ox * ox + oz * oz + (m.arrived ? 0 : 9) - (m === f ? 0.8 : 0);
          if (od < bd) { bd = od; best = m; }
        }
        f = HB.focus = best; HB.focusT = rr(0.7, 1.2);
      }
      // spotting: a monster seen after a while with nobody around (a new wave), or a boss coming in, makes the wizard
      // stop for a moment, turn to it with a little start, and then go for it
      if (f && f !== HB.seen) {
        if (HB.lost > 0.7 || (f.boss && (!HB.seen || !HB.seen.boss))) {
          HB.spot = 0.42; HB.spotM = f; hd.sq.v += 1.6; hd.bend.v -= 0.9 * HB.face;
          if (HB.y <= 0.01 && HB.vy === 0) HB.vy = 1.7;
        }
        HB.seen = f;
      }
      HB.lost = f ? 0 : HB.lost + dt; if (!f) HB.seen = null;
      HB.spot = Math.max(0, HB.spot - dt);
      var wx = 0, wz = 0, top = 1.4;
      if (HB.cheer > 0) {
        // a win: stop and bounce for joy
        if (HB.y <= 0.01 && HB.vy === 0) HB.vy = 3.6;
      } else if (HB.spot > 0 && HB.spotM) {
        // "there it is": stand still, eyes on it
        var sm = HB.spotM, ssx = scrX((sm.arrived ? sm.x : sm.tx) - HB.x, (sm.arrived ? sm.z : sm.tz) - HB.z); if (ssx) heroTurn(ssx < 0 ? -1 : 1);
      } else if (f) {
        var fx = f.arrived ? f.x : f.tx, dx = fx - HB.x, dz = (f.arrived ? f.z : f.tz) - HB.z, d = Math.sqrt(dx * dx + dz * dz) || 1, nx = dx / d, nz = dz / d;
        var r0 = f.boss ? 2.1 : 1.45, r1 = f.boss ? 2.9 : 2.25;
        // a boss on the move is chased: the wizard closes in further and keeps up with it instead of circling
        var fsp = f.arrived && f.px !== undefined && dt > 0 ? Math.sqrt((f.x - f.px) * (f.x - f.px) + (f.z - f.pz) * (f.z - f.pz)) / dt : 0;
        var chase = f.boss && fsp > 0.35;
        if (chase) r1 = 2.4;
        if (d > r1) { var a = Math.min(chase ? 3.3 : 2.9, (d - r1) * 2.4 + 0.9); wx += nx * a; wz += nz * a; top = chase ? 3.3 : 2.9; }
        else if (d < r0) { var b = Math.min(2.4, (r0 - d) * 3 + 0.8); wx -= nx * b; wz -= nz * b; top = 2.4; }
        // in range: keep circling, so the wizard is never planted on one spot (gently while chasing)
        var ob = chase ? 0.25 : d > r1 + 0.8 ? 0.35 : 1;
        wx += -nz * HB.orbit * 0.95 * ob; wz += nx * HB.orbit * 0.95 * ob;
        // eyes stay on the target: it turns to face it, whichever way the feet go (unless a spell aims elsewhere)
        var fsx = scrX(dx, dz); if (HB.aim <= 0 && Math.abs(fsx) > 0.8) heroTurn(fsx < 0 ? -1 : 1);
      } else {
        // nobody to fight yet: walk a little, stop, look around one way and the other, walk on
        HB.pt -= dt; HB.lookT -= dt; var gx = HB.px - HB.x, gz = HB.pz - HB.z, gd = Math.sqrt(gx * gx + gz * gz);
        if (HB.pt <= 0) { HB.px = rr(Z.x0, Z.x1) * (laneActive ? 1 : 0.6); HB.pz = rr(Z.z0, Z.z1) * (laneActive ? 1 : 0.5); HB.pt = rr(2.2, 3.6); HB.lookS = 2; HB.lookT = 0; gx = HB.px - HB.x; gz = HB.pz - HB.z; gd = Math.sqrt(gx * gx + gz * gz); }
        if (gd < 0.2 && HB.lookS > 0 && HB.lookT <= 0) { heroTurn(-HB.faceT); HB.lookS--; HB.lookT = rr(0.55, 0.9); }
        if (gd > 0.2) { var gs = Math.min(1.1, gd * 1.8); wx = gx / gd * gs; wz = gz / gd * gs; }
      }
      mobs.forEach(function (mm) { mm.px = mm.x; mm.pz = mm.z; });
      // give way to anything that gets too close
      for (i = 0; i < mobs.length; i++) {
        m = mobs[i]; if (!m.arrived) continue;
        var qx = HB.x - m.x, qz = HB.z - m.z, qd = Math.sqrt(qx * qx + qz * qz), need = m.boss ? 1.7 : 1.05;
        if (qd < need && qd > 1e-3) { var pk = (need - qd) / need * 3.2; wx += qx / qd * pk; wz += qz / qd * pk; top = Math.max(top, 2.6); }
      }
      // stay on the hunting ground, and turn the circling around at its edges
      var ex = 0, ez = 0;
      if (HB.x < Z.x0 + 0.4) ex = (Z.x0 + 0.4 - HB.x) * 4; else if (HB.x > Z.x1 - 0.4) ex = (Z.x1 - 0.4 - HB.x) * 4;
      if (HB.z < Z.z0 + 0.4) ez = (Z.z0 + 0.4 - HB.z) * 4; else if (HB.z > Z.z1 - 0.4) ez = (Z.z1 - 0.4 - HB.z) * 4;
      if ((ex || ez) && HB.orbitT < 1.5) { HB.orbit = -HB.orbit; HB.orbitT = rr(2.5, 5); }
      if (HB.orbitT <= 0) { HB.orbit = -HB.orbit; HB.orbitT = rr(2.5, 5.5); }
      wx += ex; wz += ez;
      var wl = Math.sqrt(wx * wx + wz * wz); if (wl > top) { wx *= top / wl; wz *= top / wl; }
      // the wind-up of a spell slows the feet for a moment; they never stop for long
      if (HB.lock > 0) { wx *= 0.3; wz *= 0.3; }
      if (HB.dash > 0) {
        HB.dash -= dt; HB.vx = HB.dvx; HB.vz = HB.dvz; HB.dvx *= Math.max(0, 1 - dt * 4); HB.dvz *= Math.max(0, 1 - dt * 4);
        HB.ghostT -= dt; if (HB.ghostT <= 0) { HB.ghostT = 0.055; ghost(0xbfe9ff, true); }
      } else {
        var acc = Math.min(1, dt * 7);
        HB.vx += (wx - HB.vx) * acc; HB.vz += (wz - HB.vz) * acc;
      }
      HB.x += (HB.vx + HB.kx) * dt; HB.z += (HB.vz + HB.kz) * dt;
      var kd = Math.max(0, 1 - dt * 7); HB.kx *= kd; HB.kz *= kd;
      HB.x = Math.max(Z.x0 - 0.25, Math.min(Z.x1 + 0.25, HB.x)); HB.z = Math.max(Z.z0 - 0.25, Math.min(Z.z1 + 0.25, HB.z));
      HB.sp = Math.sqrt(HB.vx * HB.vx + HB.vz * HB.vz); var moving = HB.sp > 0.12;
      HB.walk = Math.min(1, HB.sp / 1.1);
      // look where the spell goes; between spells, look where the feet go
      // with no target the eyes follow the feet (with a target they stay on it, above)
      var vsx = scrX(HB.vx, HB.vz); if (!f && HB.aim <= 0 && Math.abs(vsx) > 0.6) heroTurn(vsx < 0 ? -1 : 1);
      // facing changes in one go (the picture is drawn from the front: a narrowing "turn" only looks like a card being
      // flipped, the user 2026-11-15), and rarely: see heroTurn
      HB.face = HB.faceT;
      // the body leans toward the monster it is fighting (more while it runs at it), like a fighter, not a picture
      var lt = 0; if (f && HB.cheer <= 0) { var ldx = scrX((f.arrived ? f.x : f.tx) - HB.x, (f.arrived ? f.z : f.tz) - HB.z); lt = Math.max(-1, Math.min(1, ldx / 1.6)) * (0.07 + 0.05 * Math.min(1, HB.sp / 2)); }
      HB.lean += (lt - HB.lean) * Math.min(1, dt * 6);
      HB.y += HB.vy * dt; HB.vy -= 17 * dt;
      if (HB.y <= 0) { if (HB.vy < -3.2) { hd.sq.v -= 2.4; if (hooks.land) hooks.land(new T.Vector3(HB.x, 0.03, HB.z), false); } HB.y = 0; HB.vy = 0; }
      heroGroup.position.set(HB.x, 0, HB.z);
      return moving;
    }

    // ---------- monster brain ----------
    var KEEP = 0.78;
    function chargers() { var n = 0; mobs.forEach(function (m) { if (m.state === 'charge' || m.state === 'swipe' || m.state === 'windup') n++; }); return n; }
    // m.st: how long it may try to get there (a walk that keeps being shoved off its goal gives up and picks something else)
    function setGoal(m, x, z, speed, state) { var p = clampField({ x: x, z: z }); m.tx = p.x; m.tz = p.z; m.speed = speed; m.state = state; m.st = 3.5; }
    function nearHero(m, dist) { var dx = m.x - HB.x, dz = (m.z - HB.z) / 1.15, d = Math.sqrt(dx * dx + dz * dz) || 1; return { x: HB.x + dx / d * dist, z: HB.z + dz / d * dist * 1.15 }; }
    function fleeMouse(m) {
      var angle = Math.atan2(m.z - HB.z, m.x - HB.x);
      var turns = [0, 0.95, -0.95, 1.6, -1.6], best, farthest = -1;
      for (var i = 0; i < turns.length; i++) {
        var a = angle + turns[i];
        var p = clampField({ x: m.x + Math.cos(a) * 2.5, z: m.z + Math.sin(a) * 2.5 });
        var distance = Math.hypot(p.x - HB.x, p.z - HB.z);
        if (distance > farthest) { best = p; farthest = distance; }
      }
      setGoal(m, best.x, best.z, 3.4, 'flee');
      m.arrived = true; m.st = 0.72; m.fleeReady = time + 2.4;
      m.trailX = m.x; m.trailZ = m.z; m.coinsLeft = 2;
      m.vx = m.vz = 0;
    }
    function nextAction(m) {
      // left outside the picture (the camera moved with the wizard): walk back in first
      if (m.arrived && !inView(m)) { var cb = clampField({ x: m.x, z: m.z }); setGoal(m, cb.x * 0.9, cb.z, m.boss ? 1.5 : rr(1.5, 2.0), 'wander'); return; }
      if (m.id === 'exmob-core' || m.id === 'exmob-bat') {
        m.state = 'orbit'; m.orbR = m.id === 'exmob-core' ? 2.2 : rr(1.7, 2.8);
        m.st = rr(1.4, 2.7); m.speed = m.id === 'exmob-core' ? 1.1 : 2.4;
        if (Math.random() < 0.25) m.orbDir *= -1;
        return;
      }
      if (m.id === 'exmob-gecko' || m.id === 'exmob-fox' || m.id === 'exmob-tablet') {
        var isFox = m.id === 'exmob-fox', isStone = m.id === 'exmob-tablet';
        var path = ringSpot(isFox ? 1.35 : 1.8, isStone ? 2.5 : 3.4, false);
        setGoal(m, path.x, path.z, isStone ? 1.15 : isFox ? 3.2 : 2.3, 'wander');
        return;
      }
      if (m.boss) return bossAction(m);
      if (m.id === 'exmob-mouse') {
        var forage = ringSpot(1.6, 2.4, false);
        setGoal(m, forage.x, forage.z, 1.65, 'wander'); return;
      }
      var r = Math.random(), dH = Math.hypot(m.x - HB.x, m.z - HB.z), run = m.gait === 'skitter' ? 1.3 : m.gait === 'stomp' ? 0.75 : 1;
      if (dH > 4.3) { var c0 = nearHero(m, rr(2.0, 3.1)); setGoal(m, c0.x, c0.z, rr(1.7, 2.3) * run, 'wander'); }   // the wizard ran off: go after it
      else if (r < 0.28) { var w = freeSpot(false); setGoal(m, (m.x + w.x) / 2, (m.z + w.z) / 2, rr(0.9, 1.4) * run, 'wander'); }
      else if (r < 0.55 && chargers() < 3) { m.state = 'windup'; m.st = rr(0.24, 0.34); m.face = scrX(m.x - HB.x, m.z - HB.z) > 0 ? 1 : -1; }
      else if (r < 0.8) { m.state = 'orbit'; m.st = rr(1.2, 2.6); m.speed = rr(0.9, 1.4) * run; m.orbDir = Math.random() < 0.5 ? 1 : -1; m.orbR = Math.max(1.6, Math.min(3.2, dH)); }
      else if (r < 0.9) { m.state = 'hop'; m.st = 0.05; m.jumped = false; }
      else if (r < 0.96) { m.state = 'taunt'; m.st = rr(0.7, 1.2); }
      else { m.state = 'idle'; m.st = rr(0.3, 0.7); }
    }
    function bossAction(m) {
      var r = Math.random();
      if (r < 0.34) { var w = ringSpot(1.6, 2.6, true); setGoal(m, w.x, w.z, m.flyer ? 1.6 : 1.25, 'wander'); }
      else if (r < 0.56) { m.state = 'roar'; m.st = 1.3; m.roared = false; }
      else if (r < 0.8) { m.state = 'windup'; m.st = 0.45; }
      else { m.state = 'slam'; m.st = 0.3; m.jumped = false; }
    }
    function mobBrain(m, dt) {
      var g = m.group, d = g.userData, gait = m.gait;
      m.atk = Math.max(0, m.atk - dt * 3); m.cheer = 0; m.hopCd -= dt;
      if (m.stunCd > 0) m.stunCd -= dt; if (m.frzCd > 0) m.frzCd -= dt;      if (m.frozen > 0 || m.pull !== undefined) { m.walk = 0; m.vx = m.vz = m.sp = 0; return; }
      if (m.stun > 0) { m.stun -= dt; m.walk *= 0.8; m.vx *= 0.8; m.vz *= 0.8; m.sp = 0; return; }
      m.st -= dt;
      var st = m.state, moving = false, grounded = m.y <= 0.01;
      if (st === 'unseal') {
        var reveal = Math.min(1, Math.max(0, (0.76 - m.st) / 0.68));
        d.u.uBuried.value = 1.1 * (1 - reveal * reveal * (3 - 2 * reveal));
        if (m.st <= 0) {
          m.arrived = true; m.state = 'idle'; m.st = 0.24; m.vy = 2.4;
          if (hooks.burrowDust) hooks.burrowDust(m, true);
        }
        return;
      }
      if (st === 'burrow') {
        if (m.st <= 0) {
          g.visible = true; g.scale.y = 0.2;
          m.vy = 4.6; m.state = 'surface'; m.st = 0.15;
          if (hooks.burrowDust) hooks.burrowDust(m, true);
        }
        return;
      }
      if (st === 'surface') {
        g.scale.y = Math.min(1, 1 - 0.8 * Math.max(0, m.st) / 0.15);
        if (m.st <= 0) { m.arrived = true; m.state = 'idle'; m.st = 0.4; }
        return;
      }
      if (m.id === 'exmob-mouse' && time >= (m.fleeReady || 0) &&
          Math.hypot(m.x - HB.x, m.z - HB.z) < 2.7 && (m.arrived || inView(m))) {
        fleeMouse(m); st = m.state;
      }
      if (st === 'orbit') {
        // circle the wizard at about the distance it already keeps: the goal is always one step ahead on the circle
        var ox = HB.x - m.x, oz = HB.z - m.z, od = Math.sqrt(ox * ox + oz * oz) || 1, rad = (od - m.orbR) * 1.2;
        var gx = m.x + (-oz / od * m.orbDir + ox / od * rad), gz = m.z + (ox / od * m.orbDir + oz / od * rad), cp = clampField({ x: gx, z: gz });
        if (Math.abs(cp.x - gx) + Math.abs(cp.z - gz) > 0.02) m.orbDir = -m.orbDir;
        m.tx = cp.x; m.tz = cp.z;
        if (m.st <= 0) { nextAction(m); st = m.state; }
      }
      if (st === 'enter' || st === 'wander' || st === 'flee' || st === 'charge' || st === 'back' || st === 'orbit') {
        var dx = m.tx - m.x, dz = m.tz - m.z, dist = Math.sqrt(dx * dx + dz * dz);
        // a boss under fire is nudged by every hit and never lands right on the spot: near enough counts, and so does
        // having tried long enough (it used to stay stuck walking "back" a step short of its goal for the whole fight)
        if ((st === 'wander' || st === 'back') && ((m.boss && dist < 0.35) || m.st <= 0)) dist = 0;
        if (st === 'flee' && m.st <= 0) dist = 0;
        var want = m.speed > 0 && dist > 0.05 ? Math.min(m.speed, dist * (st === 'charge' ? 6 : 2.5) + 0.3) : 0;
        var acc = Math.min(1, dt * (st === 'charge' ? 9 : gait === 'float' ? 2.6 : gait === 'skitter' ? 12 : 4.5));
        m.vx += ((dist > 1e-4 ? dx / dist * want : 0) - m.vx) * acc; m.vz += ((dist > 1e-4 ? dz / dist * want : 0) - m.vz) * acc;
        if (dist > 0.05 && m.speed > 0) {
          var mul = 1;
          if (gait === 'hop') {
            // hoppers only travel while they are in the air
            if (grounded) { mul = 0; if (m.hopCd <= 0 && m.vy === 0) { m.vy = st === 'charge' ? 3.4 : rr(3.6, 4.6) * (m.boss ? 1.25 : 1); d.sq.v += 2.2; var hsx = scrX(dx, dz); if (Math.abs(hsx) > 0.2) m.face = hsx < 0 ? 1 : -1; } }
            else mul = 1.45;
          } else if (gait === 'stomp') mul = 0.4 + 1.15 * Math.abs(Math.sin(d.anim.ph));
          else if (gait === 'skitter') {
            m.dartT -= dt; if (m.dartT <= 0) { m.dartOn = !m.dartOn; m.dartT = m.dartOn ? rr(0.22, 0.42) : rr(0.1, 0.28); }
            mul = m.dartOn || st === 'charge' || st === 'flee' ? 1.7 : 0;
          }
          m.x += m.vx * mul * dt; m.z += m.vz * mul * dt; moving = mul > 0;
          if (gait === 'skitter' && moving) { var zz = Math.sin(time * 13 + m.phase) * 0.9 * dt; m.x += -dz / dist * zz; m.z += dx / dist * zz; }
          if (st === 'flee' && m.coinsLeft && Math.hypot(m.x - m.trailX, m.z - m.trailZ) >= 0.5) {
            if (hooks.mouseCoin) hooks.mouseCoin(m.trailX, m.trailZ);
            m.trailX = m.x; m.trailZ = m.z; m.coinsLeft--;
          }
          var msx = scrX(m.vx, m.vz); if (gait !== 'hop' && Math.abs(msx) > 0.25) m.face = msx < 0 ? 1 : -1;
          if (st === 'enter' && dist < 1.2 && m.boss) m.speed = Math.max(0.9, m.speed * 0.98);
        } else if (grounded || m.flyer || gait === 'float') {
          var fh = scrX(m.x - HB.x, m.z - HB.z) > 0 ? 1 : -1;
          if (st === 'enter') { m.arrived = true; m.face = fh; m.state = 'idle'; m.st = rr(0.15, 0.6); if (m.boss && hooks.roar) { m.state = 'roar'; m.st = 1.3; m.roared = false; } }
          else if (st === 'charge') { m.state = 'swipe'; m.st = m.boss ? 0.55 : 0.4; m.struck = false; m.face = fh; }
          else if (st !== 'orbit') { m.state = 'idle'; m.st = rr(0.2, 0.8); m.face = fh; }
        }
      } else if (st === 'idle') {
        if (m.st <= 0) nextAction(m);
      } else if (st === 'swipe') {
        m.atk = 1;
        if (!m.struck && m.st < (m.boss ? 0.3 : 0.22)) { m.struck = true; d.bend.v -= (m.boss ? 3 : 2.5) * (scrX(m.x - HB.x, m.z - HB.z) > 0 ? 1 : -1); if (hooks.swipe) hooks.swipe(m); heroDodge(m); if (m.boss) shake(0.2); }
        if (m.st <= 0) { var bk = m.boss ? ringSpot(1.7, 2.5, true) : nearHero(m, rr(1.9, 3.0)); setGoal(m, bk.x, bk.z, m.boss ? 2.2 : rr(2.0, 2.8), 'back'); }
      } else if (st === 'hop') {
        if (!m.jumped && grounded) { m.jumped = true; m.vy = rr(4.5, 6.2); d.sq.v += 2.5; }
        else if (m.jumped && grounded && m.vy === 0) { m.state = 'idle'; m.st = rr(0.2, 0.6); }
      } else if (st === 'taunt') {
        m.cheer = 1; if (grounded && Math.random() < dt * 3) m.vy = 2.6;
        if (m.st <= 0) { m.state = 'idle'; m.st = rr(0.2, 0.5); }
      } else if (st === 'roar') {
        m.cheer = 0.6;
        if (!m.roared && m.st < 1.0) { m.roared = true; d.sq.v += 3.5; shake(0.35); if (hooks.roar) hooks.roar(m); }
        if (m.st <= 0) { m.state = 'idle'; m.st = rr(0.6, 1.2); }
      } else if (st === 'windup') {
        // crouch and lean back before the rush, so the attack can be seen coming
        m.atk = 0.4; m.face = scrX(m.x - HB.x, m.z - HB.z) > 0 ? 1 : -1;
        if (m.st <= 0) { var bc = nearHero(m, KEEP + (m.boss ? 0.7 : 0.1)); setGoal(m, bc.x, bc.z, m.boss ? 5.2 : rr(3.6, 4.4), 'charge'); }
      } else if (st === 'slam') {
        if (!m.jumped && m.st <= 0) { m.jumped = true; m.vy = m.flyer ? 6 : 7.5; d.sq.v += 3; }
        else if (m.jumped && grounded && m.vy === 0) { m.state = 'idle'; m.st = rr(0.6, 1.1); }
      }
      if (m.pull === undefined) { var ddx = m.x - HB.x, ddz = (m.z - HB.z) / 1.15, dd = Math.sqrt(ddx * ddx + ddz * ddz), keep = m.boss ? KEEP + 0.6 : KEEP; if (dd < keep && dd > 1e-3) { var pushK = Math.min(1, dt * 8) * (keep - dd) / dd; m.x += ddx * pushK; m.z += ddz * 1.15 * pushK; } }
      if (m.state === 'idle' || m.state === 'taunt' || m.state === 'roar') m.face = scrX(m.x - HB.x, m.z - HB.z) > 0 ? 1 : -1;
      if (!moving) { m.vx *= Math.max(0, 1 - dt * 8); m.vz *= Math.max(0, 1 - dt * 8); }
      m.sp = Math.sqrt(m.vx * m.vx + m.vz * m.vz); m.walk = gait === 'hop' || !moving ? 0 : Math.min(1, m.sp / 1.4);
    }
    function separate() {
      for (var i = 0; i < mobs.length; i++) for (var j = i + 1; j < mobs.length; j++) {
        var a = mobs[i], b = mobs[j], need = (a.boss || b.boss) ? 0.9 : 0.5, dx = b.x - a.x, dz = (b.z - a.z) * 1.4, dd = Math.sqrt(dx * dx + dz * dz);
        if (a.state === 'burrow' || b.state === 'burrow' || a.state === 'unseal' || b.state === 'unseal') continue;
        if (dd < need && dd > 1e-4) {
          var push = (need - dd) * 0.5, nx = dx / dd, nz = dz / dd;
          var wa = a.boss ? 0.15 : (b.boss ? 1.85 : 1), wb = 2 - wa;
          if (a.pull === undefined) { a.x -= nx * push * wa * 0.6; a.z -= nz * push * wa * 0.4; }
          if (b.pull === undefined) { b.x += nx * push * wb * 0.6; b.z += nz * push * wb * 0.4; }
        }
      }
    }

    function update(dt, realDt, drawNumbers) {
      var rdt = realDt === undefined ? dt : realDt;
      time += dt; laneFrame++;
      orbTick(rdt);
      // hero
      if (hero) {
        var moving = heroBrain(dt);
        var hd = hero.userData, fs = HB.faceT, rest = { bend: Math.sin(time * 1.3) * 0.018 + scrX(HB.vx, HB.vz) * 0.036 + HB.lean + (HB.dash > 0 ? scrX(HB.dvx, HB.dvz) * 0.03 : 0), sq: Math.sin(time * 2.4) * 0.016 - (HB.dash > 0 ? 0.12 : 0), lift: 0, slide: 0 };
        var arms = { walk: HB.walk, speed: HB.sp, stride: 0.4, air: HB.y > 0.08, armR: 0, armL: 0, head: 0, wag: 0, cheer: HB.cheer > 0 ? 1 : 0 };
        if (pose) {
          var P = pose.P; pose.t += dt;
          if (pose.t < pose.a) { var k = pose.t / pose.a, e = k * k * (3 - 2 * k); rest.bend += P.ab * e * fs; rest.sq += P.as * e; rest.slide = P.ax * e * fs; arms.armR = P.aR * e; arms.armL = P.aL * e; }
          else {
            if (!pose.rel) {
              pose.rel = true; hd.bend.v += P.rb * fs; hd.sq.v += P.rs; hd.lift.v += P.rl; hd.slide.v += P.rx * fs;
              // the shot pushes the wizard back a step (a slash steps in instead); the big ones come with a hop
              if (P.kick) { HB.kx -= fs * P.kick * cY; HB.kz += fs * P.kick * sY; }
              if (P.hop && HB.y <= 0.01) HB.vy = P.hop;
              hd.anim.aR.v += (P.rR - P.aR) * 9; hd.anim.aL.v += (P.rL - P.aL) * 7;
              heroGlow = Math.max(heroGlow, 0.8);
              if (hooks.swing) hooks.swing(heroGlowCol.getHex());
            }
            var kk = Math.min(1, Math.max(0, pose.t - pose.a - (P.hold || 0)) / 0.42); rest.bend += P.hb * (1 - kk) * fs; rest.sq += P.hs * (1 - kk);
            arms.armR = P.rR * (1 - kk * kk); arms.armL = P.rL * (1 - kk * kk);
            if (pose.t > pose.a + (P.hold || 0) + 0.6) pose = null;
          }
        }
        var stepped = animRig(hero, dt, arms);
        if (stepped && hooks.step) hooks.step(new T.Vector3(HB.x, 0.03, HB.z), false);
        rest.bend += Math.sin(hd.anim.ph) * 0.035 * hd.anim.walk;
        driveBillboard(hero, dt, rest, HB.face);
        var bounce = HB.y <= 0.01 ? Math.abs(Math.sin(hd.anim.ph)) * (0.025 + 0.035 * Math.min(1, HB.sp / 2.2)) * hd.anim.walk : 0;
        hero.position.y = Math.max(0, hd.lift.x) * 0.12 + HB.y + bounce; hero.position.x = hd.slide.x * 0.12 * cY; hero.position.z = -hd.slide.x * 0.12 * sY;
        hd.shadow.position.y = 0.012 - hero.position.y;
        hd.shadow.scale.setScalar(1 - Math.min(0.5, hero.position.y * 0.6));
        lightAt(heroCenter(), hd.light); hd.light.r += heroGlowCol.r * heroGlow * 0.22; hd.light.g += heroGlowCol.g * heroGlow * 0.22; hd.light.b += heroGlowCol.b * heroGlow * 0.22;
        hd.u.uLight.value.copy(hd.light);
        if (views) viewsTick(dt, arms);
        heroGlow = Math.max(0, heroGlow - dt * 2.6);
      }
      ghosts.forEach(function (gh) {
        if (gh.t >= gh.life) { gh.mesh.visible = false; return; }
        gh.t += dt; var k = gh.t / gh.life; gh.wx += gh.vx * dt; gh.wz += (gh.vz || 0) * dt; gh.mesh.position.set(gh.wx - HB.x, gh.wy, gh.wz - HB.z); gh.mesh.material.uniforms.uOpacity.value = 0.5 * (1 - k);
        gh.mesh.material.uniforms.uScale.value.multiplyScalar(1 + dt * 0.25);
      });
      if (aura.ring) { aura.ring.rotation.z += dt * 0.8; aura.ring.material.opacity = 0.6 + Math.sin(time * 3) * 0.25; }
      if (aura.ring2) aura.ring2.rotation.z -= dt * 1.4;
      aura.orbs.forEach(function (o, i) { var a = time * 1.6 + i * Math.PI * 2 / aura.orbs.length; o.position.set(Math.cos(a) * 0.75, 1.0 + Math.sin(time * 2 + i) * 0.25, Math.sin(a) * 0.45); });
      aura.wings.forEach(function (w, i) { w.rotation.y = (i ? -1 : 1) * (0.25 + Math.sin(time * 2.2) * 0.18); });
      costumeTick(dt);
      turnToCam();
      // monsters
      mobs.forEach(function (m) { mobBrain(m, dt); });
      separate();
      mobs.forEach(function (m) {
        var g = m.group, d = g.userData, u = d.u, frozen = m.frozen > 0;
        if (m.state === 'burrow') return;
        if (frozen) m.frozen -= dt;
        if (m.shocked > 0) m.shocked -= dt;
        // vertical motion: jumps, falls, flyers hover
        if (!frozen) {
          var grav = m.boss ? 22 : 18;
          m.y += m.vy * dt; m.vy -= grav * dt;
          if (m.y <= 0) {
            if (m.vy < -1 && m.gait === 'hop') m.hopCd = rr(0.05, 0.16);
            if (m.vy < -3) { d.sq.v -= m.boss ? 3.2 : 2.6; if (hooks.land) hooks.land(new T.Vector3(m.x, 0.03, m.z), m.boss || m.vy < -9); if (m.boss) shake(m.state === 'slam' ? 0.55 : 0.12); if (m.boss && m.state === 'slam' && hooks.slam) hooks.slam(m); }
            m.y = 0; m.vy = 0;
          }
        }
        var hopper = m.gait === 'hop', rest = { bend: Math.sin(time * 1.7 + m.phase) * (d.rig ? 0.02 : 0.03), sq: Math.sin(time * (hopper ? 3.4 : 2.6) + m.phase) * (hopper ? 0.05 : d.rig ? 0.02 : 0.03) };
        // knocked back by a hit: a real shove over the ground that dies away
        if (m.pull === undefined && (m.pvx || m.pvz)) {
          m.x += m.pvx * dt; m.z += m.pvz * dt; var pd = Math.max(0, 1 - dt * 6.5); m.pvx *= pd; m.pvz *= pd;
          if (Math.abs(m.pvx) + Math.abs(m.pvz) < 0.03) m.pvx = m.pvz = 0;
          if (m.arrived) { var cl = clampField({ x: m.x, z: m.z }); m.x = cl.x; m.z = cl.z; }
        }
        stepSpring(m.tilt, dt);
        if (m.pull !== undefined) { m.x += (m.pull - m.x) * Math.min(1, dt * 5); if (m.pullZ !== undefined) m.z += (m.pullZ - m.z) * Math.min(1, dt * 5); rest.bend = Math.sin(time * 18 + m.phase) * 0.18; rest.sq = -0.12; }
        rest.bend += scrX(m.vx, m.vz) * 0.035 + Math.sin(d.anim.ph) * 0.04 * d.anim.walk;
        if (m.state === 'windup') { rest.sq = -0.17; rest.bend = (scrX(m.x - HB.x, m.z - HB.z) > 0 ? 1 : -1) * 0.14; }
        m.hurt = Math.max(0, m.hurt - dt * 3);
        var P = { walk: frozen ? 0 : m.walk, speed: m.sp, stride: m.boss ? 0.42 : 0.22, air: m.y > 0.12, armL: -m.atk * 1.15, armR: m.atk * 0.3, hurt: m.hurt, cheer: m.cheer, stepRate: m.boss ? 0.65 : 1,
          flap: m.flyer ? 0.32 : m.boss ? 0.16 : 0.1, flapF: m.flyer ? 9 : 6, wingOpen: m.state === 'roar' ? 0.25 : 0 };
        if (m.pull !== undefined) { P.cheer = 1; P.hurt = 0.8; }
        var stepped = d.puppet ? CW.expeditionPuppet.pose(m, frozen ? 0 : dt) : !frozen && animRig(g, dt, P);
        if (stepped && m.boss && !m.flyer) { shake(0.05); if (hooks.step) hooks.step(new T.Vector3(m.x, 0.03, m.z), true); }
        else if (stepped && m.gait === 'stomp') { d.sq.v -= 1.5; if (hooks.step) hooks.step(new T.Vector3(m.x, 0.03, m.z), false); }
        if (frozen) { d.bend.v *= 0.5; d.sq.v *= 0.5; }
        m.freezeFace = m.face;
        // monsters also turn in one clean flip, and not more than a few times a second
        m.flipHold = (m.flipHold || 0) - dt;
        if (m.face !== d.face && m.flipHold <= 0) { d.face = m.face; m.flipHold = 0.3; d.sq.v -= 0.5; }
        driveBillboard(g, frozen ? dt * 0.15 : dt, rest, d.face);
        stepSpring(m.kx, dt);
        var hover = m.flyer ? 0.4 + Math.sin(time * 2.4 + m.phase) * 0.12 : m.gait === 'float' ? 0.2 + Math.sin(time * 2.2 + m.phase) * 0.08 : 0;
        var bounce = m.y <= 0.01 ? Math.abs(Math.sin(d.anim.ph)) * (m.boss ? 0.035 : 0.035 + 0.06 * Math.min(1, m.sp / 3)) * d.anim.walk : 0;
        if (d.puppet) {
          if (m.id === 'exmob-bat') hover += Math.cos(d.anim.t * 9.5) * 0.075;
          if (m.id === 'exmob-fox') bounce = m.y <= 0.01 ? Math.max(0, Math.cos(d.anim.ph)) * 0.12 * d.anim.walk : 0;
          if (m.id === 'exmob-gecko') bounce *= 0.25;
        }
        g.position.set(m.x + m.kx.x * 0.12 * cY, m.y + hover + bounce, m.z - m.kx.x * 0.12 * sY);
        // the body rocks with the way it moves: waddlers sway from foot to foot, heavy ones lurch, gliders bank into their turns
        var gz = 0, wkA = d.anim.walk, phA = d.anim.ph;
        if (m.pull !== undefined) gz = Math.sin(time * 9 + m.phase) * 0.12;
        else {
          if (m.gait === 'waddle') gz = Math.sin(phA) * 0.17 * wkA;
          else if (m.gait === 'stomp') gz = Math.sin(phA) * 0.07 * wkA;
          else if (m.gait === 'skitter') gz = Math.sin(time * 34 + m.phase) * 0.05 * wkA;
          else if (m.gait === 'float') gz = -m.vx * 0.06 + Math.sin(time * 1.8 + m.phase) * 0.04;
          if (m.y > 0.2 && !m.boss) gz += -m.vy * 0.015 * d.face;
          gz += Math.max(-0.45, Math.min(0.45, m.tilt.x));
        }
        if (m.id === 'exmob-fox') gz += Math.sin(d.anim.ph) * d.anim.walk * 0.075;
        if (m.id === 'exmob-bat') gz += Math.sin(d.anim.t*2.3) * 0.11;
        g.rotation.z = gz;
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
        if (!dd.puppet) animRig(g, dt, { hurt: 1, cheer: 0.6, air: true });
        m.x += m.fvx * dt; m.y += m.fvy * dt; m.fvy -= 15 * dt;
        if (m.y < 0) { m.y = 0; if (!m.bounced && m.fvy < -2) { m.bounced = true; m.fvy = -m.fvy * 0.35; m.fvx *= 0.5; m.fspin *= 0.4; } else m.fvy = 0; }
        g.position.set(m.x, m.y, m.z); g.rotation.z += m.fspin * dt;
        dd.u.uDissolve.value = Math.min(1.05, Math.max(0, k2 - 0.15) * 1.25);
        dd.u.uFlash.value = Math.max(0, 0.6 - k2 * 2);
        dd.shadow.position.y = 0.012 - m.y; dd.shadow.material.opacity = 0.2 * (1 - k2);
        if (k2 >= 1) { mobGroup.remove(g); disposeGroup(g); dying.splice(i, 1); }
      }
      if (minions) minions.update(dt);
      lights.forEach(function (L) { L.t += dt; }); while (lights.length && lights[0].t >= lights[0].life) lights.shift();
      if (painted) painted.update(dt, vh * renderer.getPixelRatio());
      // numbers
      pool.forEach(function (s) {
        if (!s.live) return; s.t += rdt; var dur = s.crit ? 1.05 + 0.15 * (s.tier || 0) : 0.8, k = s.t / dur;
        if (k >= 1) { s.live = false; s.alpha = 0; s.el.style.opacity = 0; s.el.style.display = 'none'; return; }
        // Intermediate simulation steps have no visible frame.
        if (drawNumbers === false) return;
        var pop = s.crit ? (k < 0.12 ? 0.3 + k / 0.12 * 1.2 : k < 0.24 ? 1.5 - (k - 0.12) / 0.12 * 0.4 : 1.1) : (k < 0.1 ? 0.5 + k / 0.1 * 0.7 : 1.2 - Math.min(0.2, k - 0.1));
        var rise = s.crit ? k * 38 : (k * 52 - k * k * 10), side = s.crit ? Math.sin(k * 40) * 3 * (1 - k) : s.dir * k * 14;
        var alpha = (k > 0.72 ? (1 - k) / 0.28 : 1) * dmgAlpha;
        if (s.alpha !== alpha) { s.alpha = alpha; s.el.style.opacity = alpha; }
        var transform = 'translate(' + (s.x + side * dmgSize) + 'px,' + (s.y - rise * dmgSize) + 'px) translate(-50%,-50%) scale(' + pop * dmgSize + ')';
        if (s.transform !== transform) { s.transform = transform; s.el.style.transform = transform; }
      });
      // camera: smooth trauma shake, punch zoom, slow drift
      trauma = Math.max(0, trauma - rdt * 1.25);
      var tq = trauma * trauma, st = time * 1.0 + performance.now() * 0.001;
      var sx = (Math.sin(st * 37.1) + Math.sin(st * 23.7 + 1.3) * 0.6) * 0.3 * tq, sy = (Math.sin(st * 41.3 + 2.1) + Math.sin(st * 29.9) * 0.6) * 0.26 * tq;
      punchV += (-punch * 140 - punchV * 16) * rdt; punch += punchV * rdt;
      kick.multiplyScalar(Math.max(0, 1 - rdt * 7));
      if (Math.abs(viewShift - viewShiftT) > 0.001) { viewShift += (viewShiftT - viewShift) * Math.min(1, rdt * 9); applyShift(); }
      // the picture moves up with the ground when a menu sheet pushes the view up
      // the region's painted backdrop stays on the screen however the camera is turned (the user, 2026-11-17: 돌려도 정면
      // 배경이 똑같이) — the camera keeps its height and lean, so from any side it is the same field seen the same way;
      // only the fight on it turns. Zooming in makes the picture bigger with the fight; zooming out leaves it filling the screen
      var bgY = shiftX ? 0 : -Math.round(viewShift * cssH), bgX = shiftX ? -Math.round(viewShift * cssW) : 0, bgS = Math.round(1000 / Math.min(1, orb.zoom)) / 1000, bgK = bgX + '|' + bgY + '|' + bgS;
      if (bgK !== bgEl._k) { bgEl._k = bgK; bgEl.style.transform = (bgX ? 'translateX(' + bgX + 'px)' : '') + (bgY ? ' translateY(' + bgY + 'px)' : '') + (bgS !== 1 ? ' scale(' + bgS + ')' : ''); }
      // (sideways the camera stays put: the lane is laid out on the screen, the wizard at its left)
      var fk = Math.min(1, rdt * 2.2); pan.x += ((laneActive ? 0 : HB.x * 0.3) - pan.x) * fk; pan.z += ((laneActive ? 0 : HB.z * 0.22) - pan.z) * fk;
      // the usual view (kept for where monsters may go), then the one turned and zoomed by hand; the shake and the slow
      // drift go along the screen's left/right, whichever way the camera looks. The usual view is the usual turn (a
      // quarter in the sideways side view) at the usual lean
      var hP = pitchNow(), hYw = homeYaw(), hzz = CAM_D * Math.cos(hP);
      homeCam.position.set(lookAt.x + pan.x + hzz * Math.sin(hYw), lookAt.y + CAM_D * Math.sin(hP), lookAt.z + pan.z + hzz * Math.cos(hYw)); homeCam.lookAt(lookAt.x + pan.x, lookAt.y, lookAt.z + pan.z);
      homeCam.updateMatrixWorld(); homeInv.copy(homeCam.matrixWorld).invert();
      homeCam.fov = (centeredHunt ? fieldFov : baseFov) * (1 - Math.max(-0.2, Math.min(0.2, punch))); homeCam.aspect = fieldAspect;
      if (!centeredHunt && camera.view && camera.view.enabled) homeCam.setViewOffset(camera.view.fullWidth, camera.view.fullHeight, camera.view.offsetX, camera.view.offsetY, camera.view.width, camera.view.height); else homeCam.clearViewOffset();
      homeCam.updateProjectionMatrix();
      var hz = CAM_D * Math.cos(hP), hy = CAM_D * Math.sin(hP), dr = sx + Math.sin(time * 0.35) * 0.06;
      camera.position.set(lookAt.x + pan.x + hz * sY + dr * cY + kick.x, lookAt.y + hy + sy + kick.y + Math.sin(time * 0.5) * 0.03, lookAt.z + pan.z + hz * cY - dr * sY + kick.z);
      camera.lookAt(lookAt.x + pan.x + sx * 0.3 * cY, lookAt.y + sy * 0.3, lookAt.z + pan.z - sx * 0.3 * sY);
      camera.rotation.z += (Math.sin(st * 19.3) * 0.012) * tq;
      orbFit(rdt);
      var zk = orb.zoom * fitK, zFov = zk === 1 ? baseFov : 2 * Math.atan(Math.tan(baseFov * Math.PI / 360) * zk) * 180 / Math.PI;
      camera.fov = zFov * (1 - Math.max(-0.2, Math.min(0.2, punch))); camera.updateProjectionMatrix();
      flashEl.style.opacity = flashA; flashA = Math.max(0, flashA - rdt * 2.8);
      if (dimT > 0) { dimT -= rdt; dimA += (dimTarget - dimA) * Math.min(1, rdt * 9); } else { dimTarget = 0; dimA += (0 - dimA) * Math.min(1, rdt * 4); }
      dimMat.uniforms.uDim.value = dimA; dimMesh.visible = dimA > 0.01;
    }
    // Turned, the field is long across the screen (seen from the side it is twice as deep as it is wide), so monsters at
    // its ends walked off the screen (2026-11-17). The lens opens just enough to keep the wizard and every monster on it,
    // clear of the top bar, the skill bar and the buttons at the side — quickly when one would leave, slowly back. From
    // the front nothing changes (fitK 1: the usual view already keeps them inside).
    var fitK = 1, fitInv = new T.Matrix4(), fitP = new T.Vector3();
    function orbFit(rdt) {
      var want = 1;
      var turned = orb.yaw !== homeYaw();
      if (turned || centeredHunt) {
        camera.updateMatrixWorld(); fitInv.copy(camera.matrixWorld).invert();
        var tn = Math.tan(baseFov * Math.PI / 360), tx = tn * (camera.aspect || 1);
        var see = function (x, z, height, topLimit) {
          fitP.set(x, height, z).applyMatrix4(fitInv); var d = -fitP.z; if (d < 0.5) return;
          var nx = fitP.x / d / tx, ny = fitP.y / d / tn;
          want = Math.max(want, Math.abs(nx) / 0.8, ny / (topLimit || 0.72), -ny / 0.6);
        };
        see(HB.x, HB.z, MID_Y);
        // (one still coming in from beyond the edge is not waited for)
        for (var i = 0; i < mobs.length; i++) {
          var m = mobs[i];
          if (m.arrived && turned) see(m.x, m.z, MID_Y);
          if (centeredHunt && m.boss && m.alive) {
            // Frame the landing spot before the boss arrives, leaving room for the stage and health bars.
            var bx = m.arrived ? m.x : m.tx, bz = m.arrived ? m.z : m.tz;
            var head = m.group.userData.h, lean = -head * SIN_T;
            see(bx + lean * sY, bz + lean * cY, head * COS_T + m.y, 0.48);
            see(bx, bz, 0);
          }
        }
        want = Math.min(centeredHunt ? 2 : 1.6, want);
      }
      fitK += (want - fitK) * Math.min(1, rdt * (want > fitK ? 5 : 1.2)); if (Math.abs(fitK - want) < 0.0005) fitK = want;
    }
    // ---------- bending the picture around a black hole ----------
    // While a lens is open the scene is drawn into a texture first and then onto the screen through a pass that pulls
    // the picture round the hole (and lets a ripple of bent space run out). With no lens open nothing changes.
    // A lens is { pos (world), r (radius of the hole, world), k (how hard it bends, 0..1), wr (ripple radius, world),
    // wa (ripple strength) }; set lens.dead = true (or call lens(null) to drop them all) when it is over.
    var lenses = [], lensRT = null, lensMat = null, lensScene = null, lensCam = null, lensBuf = new T.Vector2(), lp = new T.Vector3(), lq = new T.Vector3(), camRight = new T.Vector3();
    var LENS_FS = 'uniform sampler2D tDiffuse;uniform vec2 uC[2];uniform vec4 uP[2];uniform float uAspect;varying vec2 vUv;\n' +
      'void main(){vec2 uv=vUv;\n' +
      // nothing is pulled in from beyond the edge of the screen (that would smear the border)
      ' float edge=smoothstep(0.0,0.12,min(min(vUv.x,1.0-vUv.x),min(vUv.y,1.0-vUv.y)));\n' +
      ' for(int i=0;i<2;i++){vec4 P=uP[i];if(P.y<=0.0&&P.w<=0.0)continue;\n' +
      '  vec2 d=uv-uC[i];d.x*=uAspect;float r=length(d)+1e-5;vec2 n=d/r;float R=P.x;\n' +
      // outside the hole the picture is taken from further out and turned a little: space is pulled in and round
      '  float k=P.y*smoothstep(R*0.95,R*1.35,r)*edge;float bend=k*R*R/r;float sw=k*0.8*exp(-(r-R)/(R*1.8));\n' +
      '  float ca=cos(sw),sa=sin(sw);vec2 rn=vec2(n.x*ca-n.y*sa,n.x*sa+n.y*ca);vec2 off=rn*(r+bend)-d;\n' +
      '  if(P.w>0.0){float x=(r-P.z)/max(0.02,R*0.6);off+=n*P.w*edge*exp(-x*x)*(-x);}\n' +
      '  off.x/=uAspect;uv+=off;}\n' +
      ' gl_FragColor=texture2D(tDiffuse,clamp(uv,0.0,1.0));}';
    function lens(o) {
      if (o === null) { lenses.length = 0; return; }
      if (lenses.indexOf(o) < 0) { lenses.push(o); if (lenses.length > 2) lenses.shift(); }
    }
    // build the bending pass's program while the game loads (the texture itself is made the first time it is needed)
    function warmLens() { lensMatReady(); renderer.compile(lensScene, lensCam); }
    function lensMatReady() {
      if (lensMat) return;
      lensMat = new T.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uC: { value: [new T.Vector2(), new T.Vector2()] }, uP: { value: [new T.Vector4(), new T.Vector4()] }, uAspect: { value: 1 } },
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}', fragmentShader: LENS_FS, depthTest: false, depthWrite: false });
      lensScene = new T.Scene(); var q = new T.Mesh(new T.PlaneGeometry(2, 2), lensMat); q.frustumCulled = false; lensScene.add(q);
      lensCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    function lensReady() {
      lensMatReady();
      renderer.getDrawingBufferSize(lensBuf);
      var w = Math.max(1, lensBuf.x | 0), h = Math.max(1, lensBuf.y | 0);
      if (!lensRT || lensRT.width !== w || lensRT.height !== h) {
        if (lensRT) lensRT.dispose();
        var RT = renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget ? T.WebGLMultisampleRenderTarget : T.WebGLRenderTarget;
        lensRT = new RT(w, h, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat });
        // the scene is written into the texture exactly as it would be onto the screen, so it looks the same
        if (T.sRGBEncoding) lensRT.texture.encoding = T.sRGBEncoding;
      }
    }
    function render() {
      for (var i = lenses.length - 1; i >= 0; i--) if (lenses[i].dead) lenses.splice(i, 1);
      var on = lenses.filter(function (L) { return L.k > 0.001 || L.wa > 0.001; });
      if (!on.length) { renderer.render(scene, camera); return; }
      lensReady(); camera.updateMatrixWorld(); camRight.setFromMatrixColumn(camera.matrixWorld, 0);
      var u = lensMat.uniforms, asp = camera.aspect || 1;
      u.uAspect.value = asp;
      for (var j = 0; j < 2; j++) {
        var L = on[j];
        if (!L) { u.uP.value[j].set(0, 0, 0, 0); continue; }
        lp.copy(L.pos).project(camera); lq.copy(L.pos).addScaledVector(camRight, 1).project(camera);
        var unit = Math.abs(lq.x - lp.x) * 0.5 * asp;   // one world unit, in screen heights
        u.uC.value[j].set((lp.x + 1) / 2, (lp.y + 1) / 2);
        u.uP.value[j].set(Math.max(0.001, L.r * unit), L.k || 0, (L.wr || 0) * unit, L.wa || 0);
      }
      renderer.setRenderTarget(lensRT); renderer.render(scene, camera); renderer.setRenderTarget(null);
      u.tDiffuse.value = lensRT.texture; renderer.render(lensScene, lensCam);
    }
    function setPixel(v) { pixel = !!v; size(); }
    function setQuality(q, lite) { quality = q; phoneLite = !!lite; size(); }
    size();
    return {
      THREE: T, scene: scene, camera: camera, renderer: renderer, fxGroup: fxGroup, desertLight: desertLight, glow: GLOW, hooks: hooks,
      size: size, setRegion: setRegion, setHero: setHero, setHeroTexture: setHeroTexture, setHeroViews: setHeroViews, setCostumeFx: setCostumeFx, heroTip: heroTip, heroPaw: heroPaw, heroCenter: heroCenter, heroPose: heroPose, heroBeatAt: function () { return beatT; }, heroGlow: heroGlowPulse, ghost: ghost,
      castPulse: function () { heroGlow = 1; }, heroState: function () { return HB; }, heroFaceTo: heroFaceTo, heroCheer: heroCheer, setViewShift: setViewShift, setLandView: setLandView, landView: function () { return landView; },
      minions: minions, spawnMob: spawnMob, hitMob: hitMob, killMob: killMob, dismissMob: dismissMob, clearMobs: clearMobs, mobs: function () { return mobs; }, mobPos: mobPos, mobTop: mobTop,
      setTierAura: setTierAura, setDamageHidden: setDamageHidden, damageText: damageText, screenPos: screenPos, flash: flash, dim: dim, shake: shake, punch: camPunch, light: light,
      hitStop: hitStop, slowmo: slowmo, climax: climax, scaleDt: scaleDt, update: update, render: render, lens: lens, warmLens: warmLens,
      scrX: function (dx, dz) { return scrX(dx, dz); },
      // a step u across the screen (+ right) and w toward the camera, as a step on the field
      fromScreen: function (u, w) { return { x: u * cY + w * sY, z: -u * sY + w * cY }; },
      camView: function () { return { yaw: orb.yaw, zoom: orb.zoom, fit: fitK, idle: orb.idle, fingers: orb.n }; },
      setPixel: setPixel, setDamageStyle: setDamageStyle, setQuality: setQuality, getQuality: function () { return quality; }
    };
  }
  CW.createScene = createScene;
})(this);
