// Tier 10, the first legendary beast: the phoenix (불사조 냥법사). Its four skills are all real flights of the bird.
// The bird is the user's painted picture (art/beast-phoenix.webp, 2026-11-14) on a bendable sheet: the wings turn at
// the shoulders (the tips trailing the beat), the tail feathers sway and trail behind the motion, flames lick the
// outline, fire runs through the feathers, embers fly off, a fire trail follows, and its shadow and fire light move
// over the ground. (Tried first in dev/spike-phoenix.js; a bird built from 3D shapes looked wrong to the user.)
// How it flies, learned from the user's notes on the spike:
// - The picture shows the bird from the front, so it flies only the way it faces: at the camera, or straight up. It
//   never hangs still at the top and never slides sideways or down the screen facing the camera (that looked like a
//   cut-out picture moved by hand). It leans into a dive, rears back when it brakes, banks into turns.
// - A real wing beat: a slower, strong down stroke with the wing spread, a quicker up stroke with the wing half folded;
//   the body is lifted by each down stroke and the tail lags behind.
// - Places are offsets from the ground point in the middle of the screen (the camera follows the hero a little).
// - Wing tips stay under the top menus, the wings stay inside the narrow phone screen, a burst is orange (big white
//   light washes the screen out), on snow and sand the fire is painted instead of added.
// Hits: whatever visibly lands is a real hit, and every monster ends up with the skill's whole damage (adds up to 1).
(function (root) {
  var CW = root.CW = root.CW || {}, T = root.THREE;
  if (!T) return;
  var GLSL = [
    'float h3(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}',
    // fire colour: 0 deep red, 0.4 orange, 0.75 gold, 1 pale gold (never pure white)
    'vec3 fire(float t){t=clamp(t,0.0,1.0);vec3 a=vec3(0.5,0.04,0.02),b=vec3(1.0,0.32,0.04),c=vec3(1.0,0.72,0.2),d=vec3(1.0,0.9,0.62);return t<0.4?mix(a,b,t/0.4):t<0.75?mix(b,c,(t-0.4)/0.35):mix(c,d,(t-0.75)/0.25);}',
    // the wings alone (불사조 날개 on the hero's back): the body strip and the tail fade out
    'float wingMask(vec2 uv){float d=abs(uv.x-0.5),v=1.0-uv.y;return smoothstep(0.07,0.13,d)*(1.0-smoothstep(0.5,0.6,v));}'
  ].join('\n');
  // measured on the picture (v from the top): wings fill v 0.03~0.53, the body is the middle strip |u-0.5| < 0.075
  // with the shoulders at v 0.33, the tail feathers hang from v 0.56 down to 0.99
  var SHEET_VS = [
    'uniform float uFlap,uAmp,uBias,uFold,uTime;uniform vec2 uDrag;varying vec2 vUv;',
    'void main(){vUv=uv;float u=uv.x,v=1.0-uv.y;vec3 p=position;',
    '  float s=u<0.5?-1.0:1.0,d=abs(u-0.5);',
    '  float ww=smoothstep(0.06,0.2,d)*(1.0-smoothstep(0.46,0.6,v));',
    // beat phase (the tips a little late): 0..0.55 down stroke, 0.55..1 up stroke; beat 1 = wings up, -1 = down
    '  float f=fract((uFlap-d*2.0)/6.28318);',
    '  float w=f<0.55?f/0.55*0.5:0.5+(f-0.55)/0.45*0.5;',
    '  float beat=cos(6.28318*w),upst=f<0.55?0.0:sin(3.14159*(f-0.55)/0.45);',
    '  float ang=(uBias+uAmp*beat)*(0.55+0.9*d)*ww;',
    '  vec2 piv=vec2(s*0.075,0.17);vec2 r=p.xy-piv;r.x*=1.0-(uFold*0.24+upst*0.22*min(1.0,uAmp*2.5))*ww*smoothstep(0.08,0.3,d);',
    '  float ca=cos(s*ang),sa=sin(s*ang);p.xy=piv+vec2(r.x*ca-r.y*sa,r.x*sa+r.y*ca);',
    '  p.z+=sin(6.28318*w)*0.16*d*uAmp*ww;',
    '  float tw=smoothstep(0.5,1.0,v);',
    '  p.x+=(sin(uTime*2.7-v*6.0)*0.022+sin(uTime*4.1-v*9.0+s)*0.008)*tw+(u-0.5)*0.1*tw*sin(uTime*1.9)+uDrag.x*tw*tw;',
    '  p.y+=uDrag.y*tw*tw;',
    '  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}'
  ].join('\n');
  var PIC_FS = GLSL + '\n' + [
    'uniform sampler2D map;uniform float uTime,uAlpha,uBurn,uHeat,uBright,uWings;varying vec2 vUv;',
    'void main(){vec4 t=texture2D(map,vUv);float v=1.0-vUv.y,d=abs(vUv.x-0.5);',
    '  float n=fbm(vec3(d*7.0-uTime*1.8,v*6.0-uTime*0.7,1.3));',
    // burning: from the wing tips and the tail end inwards (uBurn 0 whole, 1 gone)
    '  float field=n*0.45+(d*1.5+abs(v-0.38)*0.9)*0.55,cut=1.2-uBurn*1.35,ember=0.0;',
    '  if(uBurn>0.001){if(field>cut)discard;ember=smoothstep(0.14,0.0,cut-field);}',
    '  float A=t.a*mix(1.0,wingMask(vUv),uWings);if(A<0.02)discard;',
    '  vec3 c=t.rgb;float H=min(uHeat,1.3);',
    '  float warm=smoothstep(0.3,0.75,t.r)*(1.0-smoothstep(0.62,0.85,t.b));',
    '  c+=fire(0.5+n*0.4)*smoothstep(0.5,0.86,n)*warm*H*mix(0.36,0.2,uBright);',
    '  float o=0.006,am=min(min(texture2D(map,vUv+vec2(o,0.0)).a,texture2D(map,vUv-vec2(o,0.0)).a),min(texture2D(map,vUv+vec2(0.0,o)).a,texture2D(map,vUv-vec2(0.0,o)).a));',
    '  c+=vec3(1.0,0.6,0.15)*clamp(t.a-am,0.0,1.0)*(0.45+0.8*n)*H;',
    '  c=mix(c,fire(0.6+n*0.35),ember*0.9);',
    '  gl_FragColor=vec4(min(c,vec3(1.0)),A*uAlpha);}'
  ].join('\n');
  var AURA_FS = GLSL + '\n' + [
    'uniform sampler2D map;uniform float uTime,uAlpha,uHeat,uBright,uBurn,uWings;varying vec2 vUv;',
    'void main(){',
    '  float live=1.0-smoothstep(0.35,0.85,uBurn);if(live<0.01)discard;',
    '  float n=fbm(vec3(vUv*vec2(6.0,7.0)+vec2(0.0,-uTime*1.7),uTime*0.5));',
    '  vec2 uv=vUv+vec2((n-0.5)*0.035,-n*0.05);',
    '  float a=0.0;for(int i=0;i<8;i++){float g=float(i)*0.785;a+=texture2D(map,uv+vec2(cos(g),sin(g))*0.024).a;}',
    '  a=(a*0.1+texture2D(map,uv).a*0.2)*mix(1.0,wingMask(vUv),uWings);',
    '  float f=a*(0.25+0.95*n);if(f<0.01)discard;',
    '  vec3 c=fire(0.22+f*0.75+(n-0.5)*0.3);',
    '  gl_FragColor=uBright>0.5?vec4(c*vec3(1.0,0.66,0.45),min(1.0,f*0.42)*uAlpha*min(uHeat,1.3)*live):vec4(c,min(1.0,f*1.1)*uAlpha*uHeat*live);}'
  ].join('\n');
  // fire trail: ribbons along the path, frayed at the edges
  var TAIL_VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
  var TAIL_FS = GLSL + '\nuniform float uTime,uAlpha,uSeed,uBright;varying vec2 vUv;void main(){float u=vUv.x,w=abs(vUv.y-0.5)*2.0;' +
    'float n=fbm(vec3(u*7.0-uTime*3.4,vUv.y*2.5,uSeed));float body=1.0-w-(n-0.5)*0.9;' +
    'float heat=0.95-u*0.9+(n-0.5)*0.6;float a=smoothstep(0.0,0.35,body)*pow(1.0-u,1.4)*uAlpha;vec3 c=fire(heat);' +
    'gl_FragColor=vec4(mix(c,c*vec3(0.95,0.62,0.45),uBright),a*mix(0.5,0.55,uBright));}';
  function ribbonGeo(n) {
    var g = new T.BufferGeometry(), pos = new Float32Array((n + 1) * 2 * 3), uv = [], idx = [];
    for (var i = 0; i <= n; i++) { uv.push(i / n, 0, i / n, 1); if (i < n) { var k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  function sheetGeo(n) {
    var pos = [], uv = [], idx = [];
    for (var j = 0; j <= n; j++) for (var i = 0; i <= n; i++) { var u = i / n, v = j / n; pos.push(u - 0.5, 0.5 - v, 0); uv.push(u, 1 - v); }
    for (var b = 0; b < n; b++) for (var a = 0; a < n; a++) { var k = b * (n + 1) + a; idx.push(k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  // smooth curve through keys [time, x, y, z] (the speed at each key from its neighbours, so it never stops dead);
  // x and z are added to base
  function at(K, base, t, out, vout) {
    var n = K.length, i = 0; t = Math.max(0, Math.min(K[n - 1][0], t));
    while (i < n - 2 && t > K[i + 1][0]) i++;
    var a = K[i], b = K[i + 1], h = b[0] - a[0], s = (t - a[0]) / h;
    var pa = K[Math.max(0, i - 1)], pb = K[Math.min(n - 1, i + 2)];
    var s2 = s * s, s3 = s2 * s, h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    var d00 = 6 * s2 - 6 * s, d10 = 3 * s2 - 4 * s + 1, d01 = -6 * s2 + 6 * s, d11 = 3 * s2 - 2 * s;
    for (var c = 1; c <= 3; c++) {
      var ma = (b[c] - pa[c]) / Math.max(1e-3, b[0] - pa[0]) * h, mb = (pb[c] - a[c]) / Math.max(1e-3, pb[0] - a[0]) * h;
      out.setComponent(c - 1, h00 * a[c] + h10 * ma + h01 * b[c] + h11 * mb + (c === 2 ? 0 : base.getComponent(c - 1)));
      if (vout) vout.setComponent(c - 1, (d00 * a[c] + d10 * ma + d01 * b[c] + d11 * mb) / h);
    }
    return out;
  }
  // the same beat timing as the wings in the shader: 0..0.55 of a beat is the down stroke (w 0..0.5), the rest up
  function beatW(ph) { var f = ph / 6.28318 - Math.floor(ph / 6.28318); return f < 0.55 ? f / 0.55 * 0.5 : 0.5 + (f - 0.55) / 0.45 * 0.5; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function smooth(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  // a pose timeline: [[from time, amp, bias, fold, beats per second], ...] (the wings ease from one to the next)
  function poses(list) { return function (t) { var p = list[0]; for (var i = 1; i < list.length; i++) if (t >= list[i][0]) p = list[i]; return p; }; }

  var tex = null, loading = null;
  function loadTex() {
    if (tex || loading) return;
    loading = true;
    new T.TextureLoader().load((CW.ART_BASE || 'art/') + 'beast-phoenix.webp', function (t) { if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; t.anisotropy = 4; tex = t; }, undefined, function () { loading = false; });
  }

  // ---------- the flights ----------
  // 불사조 강림: comes in from the sky above the screen with big slow beats, gathers its wings and stoops at the crowd,
  // skims low over it towards the camera beating hard, rears up braking with a big beat and bursts into flame.
  // (keys drawn on the phone screen and turned into places by talk-bridge .playwright-mcp/cw-phoenix3-keys.js)
  var DIVE = { keys: [[0.0, 0.62, 4.35, -5.0], [0.55, 0.41, 2.43, -2.43], [0.95, 0.15, 1.92, -0.8], [1.35, -0.16, 1.32, 1.45], [1.75, -0.05, 1.34, 2.75], [2.1, 0.24, 1.59, 3.15], [2.55, 0.2, 3.05, 3.3], [3.25, 0.17, 3.45, 3.35]],
    burst: 2.55, dur: 3.25,
    pose: poses([[0, 0.42, -0.04, 0, 1.45], [0.92, 0.035, 0.4, 1, 3.2], [1.42, 0.5, -0.1, 0, 2.5], [2.05, 0.52, -0.2, 0, 1.25], [2.55, 0.14, 0.1, 0, 1.2]]) };
  // 불꽃 깃털비: flies in the same way, brakes above the crowd with the wings swept high, then one great down stroke
  // flings burning feathers at every monster; it beats on a moment and burns away.
  // (the first keys braked too high: the wing tips went under the region bar)
  var RAIN = { keys: [[0.0, 0.62, 4.35, -5.0], [0.5, 0.46, 2.37, -2.51], [0.9, 0.26, 2.08, -1.49], [1.5, 0.19, 2.26, -1.5], [2.35, 0.14, 2.62, -1.55]],
    throw: 1.0, burn: 1.8, dur: 2.35,
    pose: poses([[0, 0.42, -0.04, 0, 1.45], [0.62, 0.05, 0.46, 0, 1.0], [0.98, 0.05, -0.4, 0, 1.0], [1.3, 0.42, -0.06, 0, 1.6]]) };

  CW.fxBeasts = function (K) {
    var sc = K.sc, vx = K.vx, V = K.V, rr = K.rr, E = K.E, N = K.N, after = K.after, pick = K.pick, rdir = K.rdir;
    var cam = sc.camera, scene = sc.scene;
    loadTex();
    var geo = sheetGeo(48), rigs = [], live = [];
    function makeRig() {
      var U = { map: { value: tex }, uTime: { value: 0 }, uAlpha: { value: 1 }, uBurn: { value: 0 }, uHeat: { value: 1 }, uBright: { value: 0 }, uWings: { value: 0 },
        uFlap: { value: 0 }, uAmp: { value: 0.4 }, uBias: { value: 0 }, uFold: { value: 0 }, uDrag: { value: new T.Vector2() } };
      function mat(fs) { return new T.ShaderMaterial({ uniforms: U, vertexShader: SHEET_VS, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide }); }
      var group = new T.Group(), bird = new T.Group(); group.add(bird); group.visible = false; scene.add(group);
      var auraM = mat(AURA_FS), picM = mat(PIC_FS);
      var aura = new T.Mesh(geo, auraM); aura.scale.set(1.16, 1.12, 1); aura.frustumCulled = false; bird.add(aura);
      var pic = new T.Mesh(geo, picM); pic.frustumCulled = false; bird.add(pic);
      var glowTex = CW.GLOW || sc.glow;
      var shadowM = new T.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, depthWrite: false, opacity: 0 });
      var shadow = new T.Mesh(new T.PlaneGeometry(1, 1), shadowM); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1; group.add(shadow);
      var lightM = new T.MeshBasicMaterial({ map: glowTex, color: 0xff7a24, transparent: true, depthWrite: false, opacity: 0, blending: T.AdditiveBlending });
      var light = new T.Mesh(new T.PlaneGeometry(1, 1), lightM); light.rotation.x = -Math.PI / 2; light.renderOrder = 1; group.add(light);
      var tails = [];
      for (var i = 0; i < 3; i++) {
        var tm = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uSeed: { value: i * 3.1 }, uBright: { value: 0 } }, vertexShader: TAIL_VS, fragmentShader: TAIL_FS,
          transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide });
        var me = new T.Mesh(ribbonGeo(30), tm); me.renderOrder = 9.4; me.frustumCulled = false; group.add(me);
        tails.push({ m: me, mat: tm, spread: (i - 1) * 0.6, w: i === 1 ? 0.3 : 0.2, wave: i * 1.7 });
      }
      return { U: U, group: group, bird: bird, aura: aura, pic: pic, auraM: auraM, picM: picM, shadow: shadow, shadowM: shadowM, light: light, lightM: lightM, tails: tails, busy: false };
    }
    // two ready at the start (their shaders are built once and kept: throwing materials away makes the phone build
    // them again on the next cast)
    rigs.push(makeRig(), makeRig());
    function takeRig() {
      for (var i = 0; i < rigs.length; i++) if (!rigs[i].busy) return rigs[i];
      if (rigs.length < 4) { rigs.push(makeRig()); return rigs[rigs.length - 1]; }
      return null;
    }
    // the ground point in the middle of the screen
    function screenBase() { cam.updateMatrixWorld(true); var d = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); return d.multiplyScalar(-cam.position.y / d.y).add(cam.position); }
    var R = new T.Vector3(), Up = new T.Vector3(), tmp = new T.Vector3(), tan = new T.Vector3(), side = new T.Vector3(), toCam = new T.Vector3();
    var Qr = new T.Quaternion(), Qy = new T.Quaternion(), Qp = new T.Quaternion(), AX = new T.Vector3(1, 0, 0), AY = new T.Vector3(0, 1, 0), AZ = new T.Vector3(0, 0, 1);
    // where the wing tips, the tail end and the chest are on the sheet (sheet units, before the bend)
    var TIPS = [V(-0.47, 0.36, 0), V(0.47, 0.36, 0), V(-0.42, 0.08, 0), V(0.42, 0.08, 0)], TAIL = V(0, -0.46, 0), CHEST = V(0, 0.05, 0);

    // One phoenix flight. o: path(t, pos, vel), pose(t) -> [_, amp, bias, fold, beats/s], dur, S (size), sp (cast
    // speed), grow(t) (size factor), burn(t) (0 whole .. 1 burned away), heat(t), trail, embers, ground (shadow and
    // light), wings (only the wings, behind the hero), still (no lean, bank or bob), rate (how fast the wings follow
    // the pose), onStep(f, dt). Returns null when no bird is free (the skill then still deals its damage).
    function fly(o) {
      var rig = takeRig(); if (!rig) return null;
      rig.busy = true;
      var U = rig.U, bright = vx.isBright(), p0 = o.pose(0);
      U.map.value = tex; U.uFlap.value = 0; U.uAmp.value = p0[1]; U.uBias.value = p0[2]; U.uFold.value = p0[3]; U.uDrag.value.set(0, 0);
      U.uBright.value = bright ? 1 : 0; U.uWings.value = o.wings ? 1 : 0; U.uAlpha.value = 1;
      rig.auraM.blending = bright ? T.NormalBlending : T.AdditiveBlending;
      // wings on the hero's back are drawn after the hero and the monsters and tested against their depth (drawn
      // before them with no depth, the monsters standing behind the hero covered the wings)
      rig.aura.renderOrder = o.wings ? 3.45 : 9.6; rig.pic.renderOrder = o.wings ? 3.5 : 9.8;
      rig.auraM.depthTest = rig.picM.depthTest = !!o.wings;
      rig.aura.visible = rig.pic.visible = !!tex;
      rig.light.visible = !bright && o.ground !== false; rig.shadow.visible = o.ground !== false;
      rig.shadowM.opacity = 0; rig.lightM.opacity = 0;
      rig.tails.forEach(function (tl) { tl.mat.blending = bright ? T.NormalBlending : T.AdditiveBlending; tl.mat.uniforms.uBright.value = bright ? 1 : 0; tl.mat.uniforms.uAlpha.value = 0; tl.m.visible = !!o.trail; });
      rig.group.visible = true;
      var f = { o: o, rig: rig, bird: rig.bird, t: 0, pos: V(), vel: V(), pvel: V(), acc: V(), amp: p0[1], bias: p0[2], fold: p0[3], hz: p0[4],
        roll: 0, yaw: 0, pitch: 0, bob: 0, bobV: 0, drag: new T.Vector2(), hist: [], histT: 0, groundT: 0 };
      o.path(0, f.pos, f.vel); f.pvel.copy(f.vel);
      f.world = function (local) { return f.bird.localToWorld(local.clone()); };
      f.step = function (dt0) { return step(f, dt0); };
      live.push(f);
      return f;
    }
    function step(f, dt0) {
      var o = f.o, U = f.rig.U, bird = f.bird, dt = dt0 * (o.sp || 1);
      f.t += dt; var t = f.t;
      o.path(t, f.pos, f.vel); f.acc.copy(f.vel).sub(f.pvel).divideScalar(Math.max(1e-4, dt)); f.pvel.copy(f.vel);
      // ---- the wing beat ----
      var P = o.pose(t), k = 1 - Math.exp(-dt * (o.rate || 7));
      f.amp = lerp(f.amp, P[1], k); f.bias = lerp(f.bias, P[2], k); f.fold = lerp(f.fold, P[3], k); f.hz = lerp(f.hz, P[4], k);
      U.uFlap.value += dt * 6.283 * f.hz; U.uAmp.value = f.amp; U.uBias.value = f.bias; U.uFold.value = f.fold; U.uTime.value = t;
      // ---- body: faces the camera, leans into a dive and back as it climbs, banks into turns, lifted by each beat ----
      R.setFromMatrixColumn(cam.matrixWorld, 0); Up.setFromMatrixColumn(cam.matrixWorld, 1);
      var sx = f.vel.dot(R), sy = f.vel.dot(Up), ax = f.acc.dot(R);
      if (!o.still) {
        f.roll = lerp(f.roll, clamp(-ax * 0.05 - sx * 0.02, -0.38, 0.38), k);
        f.yaw = lerp(f.yaw, clamp(sx * 0.06, -0.22, 0.22), k);
        f.pitch = lerp(f.pitch, clamp(-f.vel.y * 0.1 + f.vel.z * 0.04, -0.42, 0.45), k);
        var nb = -Math.cos(6.28318 * beatW(U.uFlap.value)) * 0.05 * o.S * Math.min(1, f.amp / 0.42);
        f.bobV = (nb - f.bob) / Math.max(1e-4, dt); f.bob = nb;
      }
      bird.quaternion.copy(cam.quaternion).multiply(Qr.setFromAxisAngle(AZ, f.roll)).multiply(Qy.setFromAxisAngle(AY, f.yaw)).multiply(Qp.setFromAxisAngle(AX, f.pitch));
      bird.position.copy(f.pos).addScaledVector(Up, f.bob);
      bird.scale.setScalar(o.S * (o.grow ? o.grow(t) : 1));
      f.drag.set(clamp(-sx * 0.014 - ax * 0.004, -0.09, 0.09), clamp(-sy * 0.01 - f.bobV * 0.02 / o.S, -0.09, 0.07)); U.uDrag.value.lerp(f.drag, 1 - Math.exp(-dt * 14));
      U.uBurn.value = o.burn ? o.burn(t) : 0;
      U.uHeat.value = o.heat ? o.heat(t) : 1 + 0.15 * Math.sin(t * 5);
      bird.updateMatrixWorld(true);
      var burnA = 1 - U.uBurn.value;
      // ---- fire trail streaming behind it: from the body, the last second of the flight ----
      if (o.trail) {
        var hp = bird.localToWorld(tmp.copy(CHEST)).clone(), H = 60, NS = 30; f.histT += dt;
        if (!f.hist.length || f.histT >= 1 / 60) { f.hist.unshift(hp); f.histT = 0; if (f.hist.length > H + 1) f.hist.length = H + 1; } else f.hist[0] = hp;
        var len = 0; for (var q = 1; q < f.hist.length; q++) len += f.hist[q].distanceTo(f.hist[q - 1]);
        var trailA = clamp((len - 1.2) / 2.5, 0, 1) * burnA;
        f.rig.tails.forEach(function (tl) {
          tl.mat.uniforms.uTime.value = t; tl.mat.uniforms.uAlpha.value = trailA;
          var arr = tl.m.geometry.attributes.position.array;
          for (var i = 0; i <= NS; i++) {
            var j = Math.min(Math.round(i * H / NS), f.hist.length - 1), h = f.hist[j], u = i / NS, hn = f.hist[Math.min(j + 2, f.hist.length - 1)];
            tan.copy(h).sub(hn); if (tan.lengthSq() < 1e-8) tan.copy(Up).negate(); tan.normalize();
            toCam.copy(cam.position).sub(h).normalize(); side.crossVectors(tan, toCam).normalize();
            var off = tl.spread * u * 1.3 + Math.sin(u * 7 - t * 9 + tl.wave) * 0.18 * u, w = tl.w * (1.25 - u * 0.75);
            tmp.copy(h).addScaledVector(side, off);
            arr[i * 6] = tmp.x - side.x * w; arr[i * 6 + 1] = tmp.y - side.y * w; arr[i * 6 + 2] = tmp.z - side.z * w;
            arr[i * 6 + 3] = tmp.x + side.x * w; arr[i * 6 + 4] = tmp.y + side.y * w; arr[i * 6 + 5] = tmp.z + side.z * w;
          }
          tl.m.geometry.attributes.position.needsUpdate = true;
        });
      }
      // ---- embers shed from the wing tips and the tail ----
      if (o.embers !== false && burnA > 0.5) {
        var sz = o.S / 4.3;
        for (var e = 0; e < (o.wings ? 2 : 5); e++) {
          var src = e < 4 ? TIPS[e] : TAIL, wp = bird.localToWorld(tmp.copy(src).multiplyScalar(rr(0.75, 1.0)));
          if (Math.random() > vx.quality() + 0.1) continue;
          E({ pos: wp.clone(), vel: f.vel.clone().multiplyScalar(-rr(0.08, 0.2)).add(V(rr(-0.5, 0.5), rr(0.4, 1.6), rr(-0.5, 0.5))), frame: e % 2 ? 'dot' : 'flame',
            color: [0xffe080, 0xff6a1a, 0xa8200c], size: [rr(0.18, 0.36) * sz, 0.03], life: rr(0.35, 0.7), drag: 1.4, fadeIn: 0.08 });
        }
        if (!o.wings) E({ pos: bird.localToWorld(tmp.copy(CHEST)).clone(), frame: 'glow', color: 0xff6a1a, size: 2.4 * sz, life: 0.06, alpha: 0.16 });
      }
      // ---- its shadow and its fire light on the ground ----
      if (o.ground !== false) {
        var hgt = Math.max(0, f.pos.y), fade = Math.min(1, t / 0.4) * burnA;
        f.rig.shadow.position.set(f.pos.x, 0.03, f.pos.z); f.rig.shadow.scale.setScalar(o.S * 0.55 * (1 + hgt * 0.06));
        f.rig.shadowM.opacity = fade * clamp(0.52 - hgt * 0.1, 0, 0.42);
        f.rig.light.position.set(f.pos.x, 0.04, f.pos.z + 0.2); f.rig.light.scale.setScalar(o.S * 0.95);
        f.rig.lightM.opacity = fade * clamp(0.6 - hgt * 0.1, 0, 0.32);
      }
      if (o.onStep) o.onStep(f, dt);
      if (t >= o.dur) { release(f); return false; }
      return true;
    }
    function release(f) { f.rig.group.visible = false; f.rig.busy = false; f.done = true; }
    function update(dt) { for (var i = live.length - 1; i >= 0; i--) { var f = live[i]; if (f.done || !f.step(dt)) live.splice(i, 1); } }
    function clear() { live.forEach(release); live.length = 0; }

    // ---------- shared pieces of the skills ----------
    function gp(m) { return V(m.x, 0, m.z); }
    function keyPath(keys, base) { return function (t, pos, vel) { at(keys, base, t, pos, vel); }; }
    // upright tongues of fire, tall and thin (small round flame cards painted on snow read as orange dots)
    function tongues(c, q, n, B, o) {
      o = o || {};
      for (var i = 0; i < n; i++) E({ sys: i % 3 ? 'col' : 'add', pos: q.clone().add(rdir(0.2 * B, 0.3)), vel: V(rr(-0.5, 0.5) + (o.vx || 0), rr(2.4, 3.6), rr(-0.4, 0.4) + (o.vz || 0)), frame: 'flame', color: [0xffc050, 0xff6a1a, 0xb8280c, 0x4a120a],
        size: [rr(0.3, 0.42) * B, rr(0.6, 0.85) * B], ar: 1.8, ease: 1, life: rr(0.4, 0.6) * (o.life || 1), drag: 2.5, spin: rr(-0.5, 0.5), fadeOut: 0.4 });
    }
    // a monster catches fire where the phoenix touches it
    function burnHit(c, m, big) {
      var q = sc.mobPos(m), g = gp(m), B = (m.boss ? 1.35 : 1) * (big || 1);
      // (white-hot flames on a whole crowd at once washed it out white: orange only, fewer)
      K.flare(q, 0xff9a40, 0.8 * B, 0.14);
      if (vx.isBright()) tongues(c, q, N(2, c), 0.95 * B); else K.fire(q, N(4, c), { size: 0.8 * B, speed: 2.0, up: 2.4, cols: [0xffc050, 0xff6a1a, 0xb8280c, 0x4a120a] });
      K.gRing(g, 0xff8a3a, 1.7 * B, 0.4); K.scorch(g, 0.9 * B, 1.8);
      K.embers(q, [0xffe080, 0xff6a2b], N(4, c), { speed: 2.2, up: 2.4 });
      sc.light(q, 0xff8a3a, 1.2, 0.3);
    }
    // it bursts into flame and is reborn from its fire: burning feathers fly out, a wave of fire rolls over the ground
    // (soft: a smaller burst over a blast already on the ground — at the full count the flames bunched up there into a
    // white ball: measured, this burst alone added about 11000 near-white pixels to the phone screen. Soft, its flames
    // are painted, not added, there are fewer of them and no flare)
    function rebirthBurst(c, f, big, soft) {
      var c0 = f.world(CHEST), g0 = V(f.pos.x, 0.06, f.pos.z), B = big || 1, nf = N(soft ? (vx.isBright() ? 12 : 24) : 44, c);
      // (on snow and sand the glows are painted: at full strength they covered the bird with an orange cloud)
      var GA = vx.isBright() ? 0.5 : 1;
      E({ pos: c0.clone(), frame: 'glow', color: [0xff9a30, 0xff4a10], size: [2 * B, 6 * B * (vx.isBright() ? 0.75 : 1)], life: 0.5, alpha: (soft ? 0.25 : 0.6) * GA, fadeOut: 0.3, big: true });
      if (!soft) E({ pos: c0.clone(), frame: 'flare', color: 0xffa040, size: [0.8, 3.4 * B], life: 0.25 });
      for (var i = 0; i < nf; i++) {
        var an = i / nf * 6.283 + rr(-0.06, 0.06), sp = rr(4.5, 8.5) * Math.max(B, soft ? 0.85 : 0);
        E({ sys: soft ? 'col' : 'add', pos: c0.clone(), vel: R.clone().multiplyScalar(Math.cos(an) * sp).addScaledVector(Up, Math.sin(an) * sp), frame: 'flame', color: [0xffe080, 0xff6a1a, 0xa8200c], size: [rr(0.7, 1.1), 0.15], life: rr(0.6, 0.95), drag: 2.2, grav: 1.5 });
      }
      for (var s = 0; s < N(soft ? 16 : 36, c); s++) E({ pos: c0.clone(), vel: V(rr(-7, 7), rr(-2, 8), rr(-4, 4)), frame: 'dot', color: [0xfff0b0, 0xff7a1a], size: [0.14, 0.03], life: rr(0.6, 1.3), drag: 1.2, grav: 3 });
      E({ sys: 'gadd', pos: g0.clone(), frame: 'shock', color: [0xffb050, 0xff4a10], size: [0.6, 7.5 * B], life: 0.6, alpha: soft ? 0.4 : 0.6, ease: 1 });
      E({ sys: 'gadd', pos: g0.clone(), frame: 'glow', color: 0xff5a1a, size: [2, 5.5 * B], life: 0.9, alpha: (soft ? 0.35 : 0.55) * GA, fadeOut: 0.4 });
      for (var r = 0; r < N(soft ? 10 : 18, c); r++) { var ra = r / N(soft ? 10 : 18, c) * 6.283; E({ sys: soft ? 'col' : 'add', pos: g0.clone().add(V(Math.cos(ra) * 0.6, 0.2, Math.sin(ra) * 0.5)), vel: V(Math.cos(ra) * 6, rr(1.5, 3.5), Math.sin(ra) * 5), frame: 'flame', color: [0xffd070, 0xff4a10, 0x8a1808], size: [0.9, 0.3], life: 0.55, drag: 2.5 }); }
      sc.shake(0.32 * B); sc.light(c0, 0xff8a3a, 2.2, 0.5);
    }
    // what each monster has taken from this cast so far, so the last hit gives each one the rest of its share
    function ledger() { var got = new Map(); return { add: function (m, v) { got.set(m, (got.get(m) || 0) + v); }, of: function (m) { return got.get(m) || 0; } }; }
    // when no bird is free (four already in the air), the spell still lands
    function fallback(c, t) { after(c.D(t), function () { c.pool().forEach(function (m) { burnHit(c, m, 1); c.hit(m, 1, 1.5); }); }); }

    // ======================================================================= 10차: 불사조
    var S = {};
    // 불사조 강림: the phoenix flies in from the sky, stoops onto the crowd and skims low over it towards the camera,
    // setting every monster it touches on fire (0.4), then rears up and bursts into flame: the burst gives everyone
    // the rest (monsters it never touched, and the ones that came late, take it all there).
    S.phoenixDive = function (c) {
      c.plain = true;
      sc.heroPose('raise', c.D(0.14), 0xff7a2a);
      var L = ledger(), burst = false;
      var f = fly({ path: keyPath(DIVE.keys, screenBase()), pose: DIVE.pose, dur: DIVE.dur, S: 3.7, sp: c.sp, trail: true,
        burn: function (t) { return t > DIVE.burst ? Math.min(1, (t - DIVE.burst) / 0.5) : 0; },
        heat: function (t) { return t > DIVE.burst ? 1 + (t - DIVE.burst) * 1.6 : 1 + 0.15 * Math.sin(t * 5); },
        grow: function (t) { return t > DIVE.burst ? 1 + (t - DIVE.burst) * 0.12 : 1; },
        onStep: function (f, dt) {
          if (!burst && f.pos.y < 1.9) {
            // low over the crowd: the ground catches fire under it, every monster it passes bursts into flame
            f.groundT -= dt; if (f.groundT <= 0) { f.groundT = 0.07; E({ sys: 'gadd', pos: V(f.pos.x + rr(-0.6, 0.6), 0.05, f.pos.z + rr(-0.4, 0.4)), frame: 'glow', color: 0xff5a14, size: [1.2, 2.2], life: 0.6, alpha: 0.3, fadeOut: 0.4 }); }
            c.pool().forEach(function (m) {
              if (L.of(m) > 0) return; var dx = m.x - f.pos.x, dz = (m.z - f.pos.z) / 1.15, r = 1.6 + (m.boss ? 0.4 : 0);
              if (dx * dx + dz * dz > r * r) return;
              L.add(m, 0.4); burnHit(c, m, 1); c.hit(m, 0.4, 1.3);
            });
          }
          if (!burst && f.t >= DIVE.burst) {
            burst = true; rebirthBurst(c, f, 1);
            c.pool().forEach(function (m) { var rest = 1 - L.of(m); if (rest < 0.001) return; L.add(m, rest); burnHit(c, m, 1.2); c.hit(m, rest, 2); });
          }
        } });
      if (!f) fallback(c, 1.4);
    };

    // 불꽃 깃털비: the phoenix flies in, brakes above the crowd with its wings swept high, and one great down stroke
    // flings burning feathers at every monster — each feather is a real hit and sticks burning in the ground.
    S.featherRain = function (c) {
      c.plain = true;
      sc.heroPose('raise', c.D(0.14), 0xff7a2a);
      var f = fly({ path: keyPath(RAIN.keys, screenBase()), pose: RAIN.pose, dur: RAIN.dur, S: 3.5, sp: c.sp, trail: true, rate: 9,
        burn: function (t) { return t > RAIN.burn ? Math.min(1, (t - RAIN.burn) / 0.5) : 0; },
        heat: function (t) { return t > RAIN.throw && t < RAIN.throw + 0.4 ? 1.25 : 1 + 0.15 * Math.sin(t * 5); } });
      // the stroke: a fan of fire from the wings, a gust, a flash of heat
      after(c.D(RAIN.throw), function () {
        if (f && !f.done) {
          [0, 1].forEach(function (i) { var w = f.world(TIPS[i]); K.sparks(w, [0xffe080, 0xff7a1a], N(12, c), 6, { size: 0.2, stretch: 0.12 }); E({ pos: w, frame: 'flare', color: 0xffa040, size: [0.6, 2.2], life: 0.2 }); });
          E({ pos: f.world(CHEST), frame: 'glow', color: [0xff9a30, 0xff4a10], size: [1.5, 4.5], life: 0.4, alpha: 0.45, fadeOut: 0.4, big: true });
        }
        sc.shake(0.15);
      });
      var shots = Math.max(16, c.pool().length * 2);
      K.volley(c, { shots: shots, t0: RAIN.throw + 0.02, span: 0.42, fire: function (mob, frac, i) {
        if (!mob) return;
        var from = f && !f.done ? f.world(TIPS[i % 4]).add(rdir(0.25)) : V(mob.x + rr(-1, 1), 4.5, mob.z - 2);
        var side = from.x < mob.x ? -1 : 1;
        K.homing({ from: from, to: function () { return sc.mobPos(mob).setY(0.25); }, time: c.D(rr(0.3, 0.42)), arc: V(side * rr(0.6, 1.4), rr(0.4, 1.2), 0), ease: function (x) { return x * x * 0.55 + x * 0.45; },
          fancy: false, heads: [{ sys: 'col', frame: 'flame', color: [0xffb040, 0xff5a1a], size: 0.62, stretch: 0.12 }, { frame: 'flame', color: [0xffd070, 0xff7a2a], size: 0.4, stretch: 0.1, alpha: 0.8 }],
          trail: { w: 0.07, col: 0xff7a2a, pts: 10, shrink: 70, halo: false },
          emit: function (p, v, dt) { if (Math.random() < dt * 30 * vx.quality()) E({ pos: p.clone(), vel: v.clone().multiplyScalar(-0.1).add(V(0, 0.6, 0)), frame: 'dot', color: [0xffe080, 0xff5a1a], size: [0.09, 0], life: rr(0.3, 0.5), drag: 1 }); },
          onHit: function (p) {
            var g = V(p.x, 0, p.z);
            // the feather stands burning in the ground for a moment
            E({ sys: 'col', pos: V(g.x, 0.32, g.z + 0.05), frame: 'flame', color: [0xffd070, 0xff5a1a, 0x8a1808], size: [0.75, 0.4], ar: 1.6, rot: rr(-0.35, 0.35), life: 0.7, fadeIn: 0.05, fadeOut: 0.6 });
            K.fire(V(g.x, 0.25, g.z), N(3, c), { size: 0.7, speed: 1.2, up: 2.4, cols: [0xffc050, 0xff6a1a, 0xb8280c, 0x4a120a] });
            K.gRing(g, 0xff8a3a, 1.3, 0.35); K.scorch(g, 0.6, 1.6); sc.light(p, 0xff8a3a, 0.8, 0.2);
            c.hit(mob, frac, 1.1);
          } });
      } });
      if (!f) sc.flash('rgba(255,140,60,0.15)', 0.15);
    };

    // 재탄생의 불꽃: a burning seed falls from the sky onto one monster, a pillar of fire bursts up from it (0.3), and out
    // of the pillar the phoenix is born again — it rises burning in, spreads its wings with one huge stroke and the
    // blast takes the monster (0.7) and burns the ones standing next to it.
    S.rebirth = function (c) {
      c.plain = true;
      var mob = c.pool()[0]; if (!mob) return;
      sc.heroPose('toss', c.D(0.18), 0xff7a2a);
      var land = gp(mob), base = screenBase();
      var top = V(land.x - 0.6, 7.5, land.z - 3);
      K.homing({ from: top, to: function () { if (mob.alive) land = gp(mob); return V(land.x, 0.2, land.z); }, time: c.D(0.36), arc: V(0, 0.4, 0), ease: function (x) { return x * x; },
        fancy: false, heads: [{ frame: 'glow', color: 0xff9a30, size: 1.4, alpha: 0.8 }, { sys: 'col', frame: 'flame', color: [0xffe080, 0xff6a1a], size: 0.8, stretch: 0.1 }],
        trail: { w: 0.16, col: 0xff7a2a, pts: 14, shrink: 50 },
        onHit: function (p) {
          var g = V(p.x, 0, p.z);
          // the pillar of fire
          E({ pos: K.above(g, 2.4), frame: 'streak', color: [0xfff0b0, 0xffa040, 0xff4a10], size: [4.8, 4.8], ar: 0.42, rot: 1.5708, life: 0.7, fadeOut: 0.5, hot: 1.2 });
          for (var i = 0; i < N(14, c); i++) K.fire(V(g.x + rr(-0.3, 0.3), rr(0.2, 2.2), g.z), 1, { size: rr(0.9, 1.4), speed: 0.6, up: 4.5, life: 0.9 });
          K.gRing(g, 0xffb040, 2.6, 0.45); K.scorch(g, 1.4, 2.4); K.dust(g, N(4, c), 1.0); sc.light(p, 0xff8a3a, 1.8, 0.4); sc.shake(0.12);
          c.hit(mob, 0.3, 1.5);
          born(g);
        } });
      function born(g) {
        // out of the pillar it rises, coming a little towards the camera (kept on the screen, under the top menus)
        var ex = clamp(g.x, base.x - 0.9, base.x + 0.9), ez = clamp(g.z + 0.5, base.z - 1.0, base.z + 2.6);
        var keys = [[0, g.x, 0.35, g.z + 0.1], [0.5, lerp(g.x, ex, 0.5), 1.45, lerp(g.z, ez, 0.5)], [0.85, ex, 2.25, ez], [1.5, ex, 2.75, ez + 0.05]];
        var BLAST = 0.72, blasted = false;
        var f = fly({ path: keyPath(keys, V(0, 0, 0)), dur: 1.5, S: 3.2, sp: c.sp, rate: 11,
          pose: poses([[0, 0.03, 0.45, 1, 2.0], [0.55, 0.03, 0.5, 0, 1.0], [0.66, 0.05, -0.42, 0, 1.0], [0.95, 0.4, -0.05, 0, 1.6]]),
          grow: function (t) { return 0.35 + 0.65 * smooth(0, 0.6, t); },
          burn: function (t) { return t < 0.45 ? 1 - t / 0.45 : t > 1.0 ? Math.min(1, (t - 1.0) / 0.5) : 0; },
          heat: function (t) { return t < 0.6 ? 1.3 : 1 + 0.15 * Math.sin(t * 5); },
          onStep: function (f) {
            if (blasted || f.t < BLAST) return;
            blasted = true;
            var tg = mob.alive ? gp(mob) : g, q = V(tg.x, 0.6, tg.z);
            // (an explosion with white light and a screen flash washed half the screen out: orange fire only)
            if (K.P3 && K.P3.blast) K.P3.blast(tg, { size: 0.72, col: 0xff6a1a, flash: false, chips: 6, ring: 3.0, life: 0.8, hotness: 0.15 });
            // painted flames (added ones bunched into a white-yellow ball in the middle of the blast)
            // (painted on snow, ten of them and the burst's own made one orange cloud over the bird: five there)
            for (var bf = 0; bf < N(vx.isBright() ? 5 : 10, c); bf++) E({ sys: 'col', pos: q.clone().add(rdir(0.15)), vel: rdir(3.2).add(V(0, 1.4, 0)), frame: 'flame', color: [0xffc050, 0xff6a1a, 0xb8280c, 0x4a120a], size: [rr(0.45, 0.7), rr(1.3, 1.9)], ease: 1, life: rr(0.4, 0.65), drag: 3, spin: rr(-3, 3), fadeOut: 0.4 });
            K.smoke(q, [0x6a5a54, 0x2e2624], N(6, c), { size: 1.4, rise: 1.0, speed: 1.2, life: 1.2 });
            rebirthBurst(c, f, 0.62, true);
            for (var r = 0; r < 8; r++) { var a = r / 8 * 6.283, w = V(tg.x + Math.cos(a) * 1.6, 0.3, tg.z + Math.sin(a) * 1.3); tongues(c, w, N(3, c), 1.1, { life: 1.2 }); K.scorch(V(w.x, 0, w.z), 0.8, 2); }
            c.hit(mob, 0.7, 3); c.splash(mob, 2.2, 1.5);
          } });
        if (!f) { c.hit(mob, 0.7, 3); c.splash(mob, 2.2, 1.5); }
      }
    };

    // 불사조 날개: the phoenix's wings unfurl from fire on the hero's back and beat twice; each down stroke sends a wave
    // of fire rolling out over the whole field (the first 0.5, the second the rest).
    S.phoenixWings = function (c) {
      c.plain = true;
      sc.heroPose('raise', c.D(0.16), 0xff7a2a);
      var L = ledger(), W = 2.7;
      // the sheet faces the camera: its shoulders (0.17 above its middle) sit on the hero's upper back
      var CU = new T.Vector3();
      // and a little further from the camera than the whole hero, so the hero covers them and they cover what stands behind
      var CF = new T.Vector3();
      function back(t, pos, vel) { var h = sc.heroCenter(); CU.setFromMatrixColumn(cam.matrixWorld, 1); CF.setFromMatrixColumn(cam.matrixWorld, 2); pos.set(h.x, h.y + 0.18, h.z - 0.12).addScaledVector(CU, -0.17 * W).addScaledVector(CF, -0.32); vel.set(0, 0, 0); }
      var STROKE = [0.5, 1.05];
      var f = fly({ path: back, dur: 1.75, S: W, sp: c.sp, wings: true, still: true, ground: false, rate: 13, embers: true,
        pose: poses([[0, 0.02, 0.55, 1, 1.0], [0.25, 0.04, 0.32, 0, 1.0], [0.4, 0.03, 0.5, 0, 1.0], [0.5, 0.04, -0.42, 0, 1.0], [0.72, 0.03, 0.5, 0, 1.0], [1.05, 0.04, -0.46, 0, 1.0], [1.3, 0.03, 0.2, 0, 1.0], [1.45, 0.02, 0.5, 1, 1.0]]),
        grow: function (t) { return 0.55 + 0.45 * smooth(0, 0.3, t); },
        burn: function (t) { return t < 0.28 ? 1 - t / 0.28 : t > 1.3 ? Math.min(1, (t - 1.3) / 0.45) : 0; },
        heat: function (t) { return 1.1 + 0.2 * Math.sin(t * 7); } });
      STROKE.forEach(function (ts, n) {
        after(c.D(ts + 0.1), function () {
          var h = sc.heroCenter(), G = V(h.x, 0.04, h.z), last = n === STROKE.length - 1;
          // the gust leaves the wings: sparks fly off the tips, the ground flashes round the hero
          if (f && !f.done) [0, 1].forEach(function (i) { var w = f.world(TIPS[i]); K.sparks(w, [0xffe080, 0xff7a1a], N(10, c), 5, { size: 0.2, stretch: 0.12 }); });
          E({ sys: 'gadd', pos: G.clone(), frame: 'glow', color: 0xff6a1a, size: [1, 3.2], life: 0.5, alpha: 0.4, fadeOut: 0.4 });
          sc.shake(0.12 + n * 0.08);
          // a front of fire rolling out over the field
          var r = 0.6, sp = 9.5 * c.sp, seen = new Set(), bright = vx.isBright();
          K.tick(function (dt) {
            r += sp * dt;
            for (var i = 0; i < N(4, c); i++) {
              var a = rr(0, 6.283), q = V(G.x + Math.cos(a) * r, 0.25, G.z + Math.sin(a) * r);
              if (Math.abs(q.x) > 4.6 || q.z < -5 || q.z > 4.2) continue;
              if (!bright) E({ sys: i % 2 ? 'col' : 'add', pos: q, vel: V(Math.cos(a) * 3, rr(2.2, 3.4), Math.sin(a) * 2.6), frame: 'flame', color: [0xffc050, 0xff6a1a, 0xb8280c, 0x4a120a], size: [rr(0.3, 0.45), rr(0.65, 0.9) * (1 + n * 0.12)], ease: 1, life: rr(0.38, 0.58), drag: 2.5, spin: rr(-3, 3), fadeOut: 0.4 });
              else if (i === 1 && Math.random() < 0.5) tongues(c, q, 1, 0.9, { vx: Math.cos(a) * 1.5, vz: Math.sin(a) * 1.5 });
              if (i === 0 && Math.random() < 0.6) {
                // a tongue of flame loops up off the ring and falls back
                var q2 = V(G.x + Math.cos(a + 0.4) * r, 0.2, G.z + Math.sin(a + 0.4) * r), bez = new T.QuadraticBezierCurve3(V(q.x, 0.2, q.z), K.above(V((q.x + q2.x) / 2, 0, (q.z + q2.z) / 2), 1.4), q2), pts = [];
                for (var k = 0; k <= 10; k++) pts.push(bez.getPoint(k / 10));
                vx.ribbon({ mode: 'static', sweep: true, pts: pts, w: 0.13, color: 0xff7a2b, core: 0.8, life: 0.3 });
              }
            }
            if (Math.random() < dt * 14) { var sa = rr(0, 6.283); K.scorch(V(G.x + Math.cos(sa) * r, 0, G.z + Math.sin(sa) * r), 0.7, 1.4); }
            E({ sys: 'gadd', pos: V(G.x, 0.035, G.z), frame: 'shock', color: [0xff9a40, 0xd8401a], size: [2 * r, 2 * r + sp * 0.07], life: 0.07, alpha: bright ? 0.6 : 0.22, rot: 0, big: true });
            c.pool().forEach(function (m) {
              var dx = m.x - G.x, dz = m.z - G.z, rr2 = r + (m.boss ? 0.4 : 0);
              if (dx * dx + dz * dz > rr2 * rr2) return;
              if (seen.has(m)) return; seen.add(m);
              var share = last ? 1 - L.of(m) : 0.5; if (share < 0.001) return;
              L.add(m, share); burnHit(c, m, 0.8 + n * 0.1); c.hit(m, share, 1.2 + n * 0.4);
            });
            return r > 11;
          });
        });
      });
      if (!f) after(c.D(0.3), function () { sc.flash('rgba(255,140,60,0.12)', 0.12); });
    };

    return { shapes: S, update: update, clear: clear, count: function () { return live.length; } };
  };
})(this);
