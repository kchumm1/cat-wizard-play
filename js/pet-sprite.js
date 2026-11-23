// 전투 화면의 펫 (2026-11-23, 설계 7-5 · docs/펫기술-업적-GPT-문구.md 1장; 살아 움직이기 2026-11-23, 형: 펫이 움직이는 게 하나도
// 없어 → 알아서 움직이고 생동감 있게, 그림 느낌 없게 → 애니메이션처럼 진짜 생동감 넘치게).
// The worn pet lives around the hero by itself: it potters about behind and beside it (never in front, where the monsters and
// the numbers are), stops, watches the fight, sniffs the ground, dozes off and shakes itself awake, comes over to the hero, and
// follows when the hero walks off (running when far behind); it hops up (a legend roars) when it casts. Walkers really walk
// (feet in turn, a small bob and roll), flyers flap, swoop and hover, swimmers glide through the air; all of them breathe and
// blink, their ears, tails, wings and trinkets move on their own (js/pet-rig.js), nothing spins the picture round, and
// a soft shadow under each keeps it standing in the scene. A legend is nearly as tall as the hero (1.1×), the others about
// half. Tapping it opens the 내 펫 page. js/main.js: CW.createPetSprite(sc) once, then set(pet or null) when the worn pet
// changes, update(dt) every frame, pop() and icon(url, big) on a cast, top() / center() for effects.
(function (root) {
  var CW = root.CW = root.CW || {};
  var TILT = 0.6, HERO_H = 1.02, COS_T = Math.cos(TILT);
  var VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  // the skill icon over the pet (GPT 그림 art/sk-pet-*.webp): fades by uA
  var FS_ICON = 'uniform sampler2D map; uniform float uA; varying vec2 vUv;' +
    'void main() { vec4 t = texture2D(map, vUv); if (t.a * uA < 0.02) discard; gl_FragColor = vec4(t.rgb, t.a * uA); }';
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  CW.createPetSprite = function (sc) {
    var T = sc.THREE, G = CW.PET_GLSL;
    var GEO = new T.PlaneGeometry(1, 1, 20, 20); GEO.translate(0, 0.5, 0);
    var mesh = null, tex = null, cur = null, big = false, h = 0.45, at = null, y = 0, glow = 0;
    var pose = null, R = null, U = null, shadow = null;
    // the brain: where it wants to be (b: how far behind the hero, w: how far back from the camera), what it is doing
    var mode = 'idle', modeT = 1, goal = { b: 0.7, w: -0.3 }, vel = { x: 0, z: 0 }, face = -1, turnCd = 0, lastVx = 0;
    var play = null, roll = 0, flyH = 0;
    // 기술 아이콘: one plane reused, the five pictures loaded once each (kept: they are small and come back every few seconds)
    var ico = null, icoTex = {}, icoT = 0, icoBig = false, ICO_LIFE = 1.15;
    function drop() {
      // (2026-11-23 검토) the skill icon goes with the pet: update() stops at !mesh, so it was left hanging in the air
      if (ico) ico.visible = false;
      if (mesh) { sc.scene.remove(mesh); mesh.material.dispose(); mesh = null; }
      if (shadow) shadow.visible = false;
      if (tex) { tex.dispose(); tex = null; }
    }
    function vec4s(n) { var a = []; for (var i = 0; i < n; i++) a.push(new T.Vector4()); return a; }
    // a soft round shadow (one picture made once)
    function makeShadow() {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      var m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.3 }));
      m.rotation.order = 'YXZ'; m.renderOrder = 1; m.visible = false; sc.scene.add(m);
      return m;
    }
    function set(p) {
      var id = p ? p.id : null; if (id === cur) return;
      cur = id; drop(); if (!p) return;
      // on the ground beside the hero a small pet needs a little more size than up in the air (0.5 looked tiny next to a boar)
      big = p.grade === 3; h = big ? HERO_H * 1.1 : HERO_H * 0.6;
      R = CW.petRigOf(id); pose = CW.createPetPose(id);
      mode = 'idle'; modeT = rnd(0.6, 1.5); play = null; roll = 0; vel.x = vel.z = 0; face = -1; pend = 0; voteT = 0; sideT = 0;
      flyH = R.move === 'fly' ? (big ? 0.2 : 0.5) : R.move === 'swim' ? (big ? 0.12 : 0.36) : 0;
      // a legend is drawn big: its full picture (768px); the others the small one (192px)
      new T.TextureLoader().load((CW.ART_BASE || 'art/') + p.art + (big ? '' : '-s') + '.webp', function (t) {
        if (cur !== id) { t.dispose(); return; }
        tex = t;
        U = { map: { value: t }, uGlow: { value: 0 }, uE: { value: vec4s(8) }, uP: { value: vec4s(8) }, uBody: { value: new T.Vector4() },
          uSq: { value: new T.Vector4(1, 1, 0, 0) }, uWave: { value: new T.Vector4() }, uFlip: { value: 1 }, uEye: { value: vec4s(2) }, uLid: { value: new T.Vector4() } };
        for (var i = 0; i < 8; i++) U.uE.value[i].fromArray(pose.u.E, i * 4);
        U.uEye.value[0].fromArray(pose.u.eye, 0); U.uEye.value[1].fromArray(pose.u.eye, 4);
        U.uBody.value.fromArray(pose.u.body);
        // drawn like the hero and the monsters (depth written, the same order): with depthWrite off, whatever the scene drew after
        // it covered it as soon as it walked on the ground
        mesh = new T.Mesh(GEO, new T.ShaderMaterial({ uniforms: U, vertexShader: G.VS_THREE, fragmentShader: G.FS_THREE, transparent: true, depthWrite: true, side: T.DoubleSide }));
        mesh.rotation.order = 'YXZ'; mesh.renderOrder = 3; at = null; sc.scene.add(mesh);
        if (!shadow) shadow = makeShadow();
      });
    }
    // ---- the brain (2026-11-23 다듬기, 형: 필드에서 생동감 넘치게, 살아서 움직이는 느낌, 어색한 모션 없이 정말 자연스럽게) ----
    // It potters about behind the hero: walks a little way, stops, watches the fight, sniffs the ground creeping forward, sits
    // and dozes off for a moment and shakes itself awake, comes over to the hero now and then. A bird swoops low, hovers
    // flapping hard or flies a lap round its spot; a "fish" glides along or leaps in a gentle arc; a legend stands, looks about
    // and now and then roars. Nothing spins the picture round. It turns at the bottom of a little crouch (the flip is never seen
    // in the open) and only for a real change of way; it follows as soon as the hero has walked off a little, runs when far.
    // side: the side of the hero it keeps to (screen right +1 / left -1). The hero turns to every monster it aims at; the pet
    // goes round to the other side only when the hero has kept its new way for 4.5 s (it does not run to and fro at every turn)
    var pend = 0, pendT = 0, voteT = 0, side = -1, sideT = 0, lastHf = 0;
    function speed() { return (big ? 0.62 : 0.95) * (R.slow ? 0.7 : R.fast ? 1.25 : 1) * (R.move === 'walk' ? 1 : 1.15); }
    function newGoal() {
      // behind and beside the hero; a legend keeps further back
      goal = big ? { b: rnd(0.75, 1.55), w: rnd(-1.15, -0.45) } : { b: rnd(0.6, 1.45), w: rnd(-0.85, 0.2) };
    }
    function turnTo(f) {
      if (f === face || pend || turnCd > 0) return;
      pend = f; pendT = big ? 0.12 : 0.09; turnCd = 0.55;
      if (!pose.busy()) pose.jump(big ? 0.012 : 0.04, 0.24);
    }
    function pick(list) {
      var sum = 0, i; for (i = 0; i < list.length; i++) sum += list[i][1];
      var r = Math.random() * sum; for (i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
      return list[0][0];
    }
    function choose(hf, su, sw) {
      var k = pick(big ? [['go', 35], ['look', 30], ['play', 20], ['face', 15]] : [['go', 40], ['play', 34], ['face', 12], ['near', 14]]);
      if (k === 'go') { newGoal(); mode = 'go'; return; }
      if (k === 'play') { startPlay(hf, su, sw); return; }
      if (k === 'face') { turnTo(Math.random() < 0.65 ? hf : -face); mode = 'idle'; modeT = rnd(1.5, 3); return; }
      if (k === 'look') { pose.look(rnd(-0.12, 0.12), 2); mode = 'idle'; modeT = rnd(2, 3.5); return; }
      // over to the hero for a moment, glad
      goal = { b: big ? 0.7 : 0.5, w: big ? -0.5 : 0.12 }; mode = 'go'; play = { kind: 'near', t: 0 };
    }
    function startPlay(hf, su, sw) {
      var list;
      if (big) list = R.move === 'fly' ? [['hover', 3], ['roar', 1]] : [['roar', 1], ['look', 2], ['stomp', 1]];
      else if (R.move === 'fly') list = [['hover', 3], ['swoop', 3], ['circle', 2], ['happy', 1]];
      else if (R.move === 'swim') list = [['drift', 3], ['leap', 2], ['happy', 1]];
      else list = [['sniff', 4], ['doze', 3], ['watch', 3], ['happy', 2], ['bigjump', 1], ['zoomies', 1]];
      var k = pick(list); play = { kind: k, t: 0, dir: face }; mode = 'play';
      if (k === 'sniff') { pose.look(R.face * 0.16, 1.9, 1); modeT = 2; }          // nose down, little nods, creeping on
      else if (k === 'doze') { pose.doze(true); modeT = rnd(3, 5); }               // half-shut eyes, slow breaths, then a shake
      else if (k === 'watch') { turnTo(hf); pose.look(-R.face * 0.06, 2.3); modeT = 2.4; }   // looks up at the fight
      else if (k === 'happy') { pose.cheer(1.4); modeT = 1.4; }
      else if (k === 'bigjump') { pose.jump(0.26, 0.55); pose.cheer(1.1); modeT = 1; }
      else if (k === 'zoomies') { goal = { b: rnd(1, 1.4), w: rnd(-0.75, 0.1) }; mode = 'go'; play.fast = 1.8; pose.cheer(1.2); }
      else if (k === 'hover') { pose.flutter(1.9); pose.look(rnd(-0.1, 0.1), 1.9); modeT = 1.9; }
      else if (k === 'swoop') modeT = 1.3;
      else if (k === 'circle') { modeT = 3; play.c = { u: su, w: sw }; play.a = 0; }
      else if (k === 'drift') modeT = 2.6;
      else if (k === 'leap') { pose.jump(0.32, 0.85); pose.cheer(1); modeT = 0.95; }
      else if (k === 'roar') { turnTo(hf); pose.roar(1.1); modeT = 1.5; }
      else if (k === 'look') { pose.look(rnd(-0.1, 0.1), 2.2); modeT = 2.4; }
      else if (k === 'stomp') { pose.jump(0.03, 0.45); modeT = 0.9; }
    }
    function endPlay() { if (play && play.kind === 'doze') { pose.doze(false); pose.shake(); } play = null; }
    function update(dt) {
      if (!mesh || !pose) return;
      dt = Math.min(dt, 0.05);
      var H = sc.heroState(), hf = H.faceT || 1, ex = sc.fromScreen(1, 0), ew = sc.fromScreen(0, 1);
      if (!at) { var o0 = sc.fromScreen(-hf * (big ? 0.8 : 0.55), big ? -0.75 : -0.35); at = { x: H.x + o0.x, z: H.z + o0.z }; side = -hf; lastHf = hf; }
      if (hf !== lastHf) { lastHf = hf; sideT = 0; } else sideT += dt;
      if (side !== -hf && sideT > 4.5) side = -hf;
      // where it is, seen from the screen, against the hero
      var dx = at.x - H.x, dz = at.z - H.z, su = dx * ex.x + dz * ex.z, sw = dx * ew.x + dz * ew.z;
      turnCd -= dt; modeT -= dt; glow = Math.max(0, glow - dt * 2.2);
      if (pend) { pendT -= dt; if (pendT <= 0) { face = pend; pend = 0; } }
      // too far (the hero walked off, or turned round so the pet is now in front): run back behind it
      var far = Math.abs(su) > 2.4 || Math.abs(sw) > 1.6 || (su * side < -0.25 && mode !== 'cast');
      if (far && mode !== 'go') { endPlay(); mode = 'go'; newGoal(); }
      var tu = side * goal.b - su, tw = goal.w - sw, dist = Math.sqrt(tu * tu + tw * tw);
      // a brisker walk when it is a way off, a run only when far behind
      var want = 0, vu = 0, vw = 0, sp = speed() * (play && play.fast ? play.fast : 1) * (dist > 1.6 ? 1.9 : Math.min(1.35, 0.85 + dist * 0.35)), extraY = 0, rl = 0;
      if (mode === 'go') {
        want = sp * Math.min(1, dist / 0.3);
        if (dist < 0.05) {
          mode = 'idle'; modeT = rnd(1.4, 3.6);
          if (play && play.kind === 'near') { pose.cheer(1.6); turnTo(su < 0 ? 1 : -1); }
          else if (play && play.kind === 'zoomies') pose.jump(0.18, 0.45);
          play = null;
        }
      } else if (mode === 'idle') {
        if (dist > 0.75) mode = 'go';                         // the hero walked off a little: follow
        else if (Math.abs(su) < (big ? 0.6 : 0.42) && Math.abs(sw) < 0.3) { newGoal(); mode = 'go'; }   // standing in the hero: step aside
        else if (modeT <= 0) choose(hf, su, sw);
        else if (turnCd < -2 && Math.random() < dt * 0.15) turnTo(Math.random() < 0.75 ? hf : (su < 0 ? 1 : -1));
      } else if (mode === 'play') {
        play.t += dt;
        var k = clamp(play.t / Math.max(0.1, play.t + modeT), 0, 1);
        // a few plays move it along: never toward the front of the hero, nor into the hero
        var ahead = su * side < 0.3 || (Math.abs(su) < (big ? 0.85 : 0.6) && play.dir * su < 0);
        if (play.kind === 'sniff' && !ahead) vu = play.dir * 0.12;
        else if (play.kind === 'drift' && !ahead) vu = play.dir * 0.28;
        else if (play.kind === 'swoop') { if (!ahead) vu = play.dir * 0.55; extraY = -Math.sin(Math.PI * k) * 0.3 * h; }
        else if (play.kind === 'circle') {
          play.a += dt * 2.1;
          // a lap that swings out away from the hero and back (never through it)
          var cu0 = play.c.u + side * (1 - Math.cos(play.a)) * 0.4, cw0 = play.c.w + Math.sin(play.a) * 0.3;
          var du = cu0 - su, dw = cw0 - sw, dd = Math.sqrt(du * du + dw * dw) || 1, cs = Math.min(speed() * 1.3, dd * 6);
          vu = du / dd * cs; vw = dw / dd * cs;
        } else if (play.kind === 'leap') rl = -face * (R.face || -1) * Math.sin(clamp(play.t / 0.85, 0, 1) * Math.PI * 2) * 0.22;
        if (dist > 1.1 && play.kind !== 'circle') { endPlay(); mode = 'go'; }   // the hero walked off: stop and follow
        else if (modeT <= 0) { endPlay(); mode = 'idle'; modeT = rnd(1.2, 2.8); }
      } else if (modeT <= 0) { mode = 'idle'; modeT = rnd(1, 2.4); }
      // move (screen units → world), easing in and out
      if (want > 0 && dist > 0.001) { vu = tu / dist * want; vw = tw / dist * want; }
      var cu = vel.x * ex.x + vel.z * ex.z, cw = vel.x * ew.x + vel.z * ew.z, e = 1 - Math.exp(-dt * (big ? 4 : 6));
      cu += (vu - cu) * e; cw += (vw - cw) * e;
      vel.x = cu * ex.x + cw * ew.x; vel.z = cu * ex.z + cw * ew.z;
      at.x += vel.x * dt; at.z += vel.z * dt;
      // it turns only for a real change of way, held a moment (no flip-flopping when it walks toward or away from you)
      if (mode !== 'cast' && Math.abs(cu) > 0.22 && (cu > 0 ? 1 : -1) !== face) { voteT += dt; if (voteT > 0.15) { turnTo(cu > 0 ? 1 : -1); voteT = 0; } } else voteT = 0;
      // the pose: steps, wings, tail, eyes … (picture space: + is the picture's right)
      var flip = face * (R.face || -1), sv = Math.sqrt(cu * cu + cw * cw), ivx = cu / h * flip, iax = (ivx - lastVx) / Math.max(dt, 0.001); lastVx = ivx;
      var ps = pose.update(dt, { walk: clamp(sv / speed(), 0, 2.2), vx: ivx, ax: iax });
      roll += (ps.roll + rl - roll) * Math.min(1, dt * 10);
      var s = h * (1 + glow * (big ? 0.05 : 0.03));
      y = flyH + ps.lift * h + extraY;
      // stand on the foot line (the picture's empty margin under the feet), bank about the body's middle
      var c = 0.5 * s, foot = (1 - R.foot) * s * COS_T;
      mesh.position.set(at.x + ex.x * Math.sin(roll) * c, y - foot + (1 - Math.cos(roll)) * c, at.z + ex.z * Math.sin(roll) * c);
      mesh.scale.set(s, s, 1);
      mesh.rotation.set(-TILT, sc.camView().yaw, roll);
      var u = pose.u;
      for (var i = 0; i < 8; i++) U.uP.value[i].set(u.P[i * 4], u.P[i * 4 + 1], u.P[i * 4 + 2], u.P[i * 4 + 3]);
      U.uSq.value.set(u.sq[0], u.sq[1], u.sq[2], u.sq[3]); U.uWave.value.set(u.wave[0], u.wave[1], u.wave[2], 0);
      U.uLid.value.set(u.lid[0], u.lid[1], u.lid[2], u.lid[3]); U.uFlip.value = flip;
      U.uGlow.value = glow * (big ? 0.55 : 0.35);
      // the shadow: smaller and fainter the higher it is
      if (shadow) {
        var up = Math.max(0, y) / (h * 1.4), w = s * (big ? 0.85 : 0.78) * (1 - Math.min(0.45, up * 0.5));
        shadow.visible = true; shadow.position.set(at.x, 0.014, at.z); shadow.scale.set(w, w * 0.62, 1);
        shadow.rotation.set(-Math.PI / 2, sc.camView().yaw, 0); shadow.material.opacity = 0.32 * (1 - Math.min(0.7, up * 0.8));
      }
      if (ico && ico.visible) { icoT -= dt; if (icoT <= 0) ico.visible = false; else placeIcon(); }
    }
    function center() { return new T.Vector3(at ? at.x : 0, y + h * 0.5, at ? at.z : 0); }
    function top() { return new T.Vector3(at ? at.x : 0, y + h * 1.02, at ? at.z : 0); }
    // a cast: it wakes if it dozed, turns to the monsters and hops up (a legend roars and swells), glowing
    function pop() {
      glow = 1;
      if (!pose) return;
      endPlay();
      var H = sc.heroState(), f = H.faceT || 1; if (f !== face) { pend = f; pendT = 0.08; }
      turnCd = 0.6; mode = 'cast'; modeT = 0.75;
      if (big) { pose.roar(1); pose.jump(0.04, 0.5); } else { pose.jump(0.26, 0.5); pose.cheer(0.9); }
    }
    function icon(url, isBig) {
      var show = function (t) {
        if (!ico) { ico = new T.Mesh(new T.PlaneGeometry(1, 1).translate(0, 0.5, 0), new T.ShaderMaterial({ uniforms: { map: { value: t }, uA: { value: 0 } }, vertexShader: VS, fragmentShader: FS_ICON, transparent: true, depthWrite: false, depthTest: false })); ico.rotation.order = 'YXZ'; ico.renderOrder = 6; sc.scene.add(ico); }
        ico.material.uniforms.map.value = t; ico.visible = true; icoT = ICO_LIFE; icoBig = !!isBig; placeIcon();
      };
      if (icoTex[url]) { if (icoTex[url].image) show(icoTex[url]); return; }
      icoTex[url] = new T.TextureLoader().load(url, show);
    }
    // just over the pet's head: pops up big, settles, fades out (an iPhone held upright and the side views alike: it turns to the camera)
    function placeIcon() {
      if (!ico || !at) return;
      var k = 1 - icoT / ICO_LIFE, grow = k < 0.18 ? 0.6 + 0.6 * (k / 0.18) : 1.2 - 0.2 * Math.min(1, (k - 0.18) / 0.2), sz = (icoBig ? 0.72 : 0.58) * grow;
      ico.position.set(at.x, y + h * 1.0 + 0.05 + k * 0.12, at.z); ico.scale.set(sz, sz, 1);
      ico.rotation.set(-TILT, sc.camView().yaw, 0);
      ico.material.uniforms.uA.value = k > 0.72 ? Math.max(0, 1 - (k - 0.72) / 0.28) : 1;
    }
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
    var api = { set: set, update: update, center: center, top: top, pop: pop, icon: icon, big: function () { return big; }, shown: function () { return !!mesh; },
      // for checking in a browser (CW.petSpriteNow.debug()): what it is doing now and where it is on the screen
      debug: function () { var H = sc.heroState(), ex = sc.fromScreen(1, 0); return { mode: mode, play: play && play.kind, face: face, at: at, y: y, flip: U && U.uFlip.value, side: side, sideT: sideT, lastHf: lastHf, heroFace: H.faceT, su: at ? (at.x - H.x) * ex.x + (at.z - H.z) * ex.z : null, sw: at ? (at.x - H.x) * sc.fromScreen(0, 1).x + (at.z - H.z) * sc.fromScreen(0, 1).z : null, goal: goal, hero: { x: H.x, z: H.z }, screen: mesh ? sc.screenPos(center()) : null }; },
      mesh: function () { return mesh; }, pose: function () { return pose; } };
    CW.petSpriteNow = api;
    return api;
  };
})(this);
