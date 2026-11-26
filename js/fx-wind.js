// Tier 12, 바람 냥법사 (2026-11-25, docs/superpowers/specs/2026-11-25-tier12-wind-design.md): the wind skills, drawn with
// light ribbons, rings and particles (형 chose this over painted sheets or solid 3D: wind is see-through, and like the meteor
// rain and the fire bomb it melts into the picture). Sharp, fast, see-through mint wind with a white core and a deep teal
// edge — never a tornado, storm cloud, rain or lightning (the 13th, the typhoon, keeps those), never a swirl.
// Every scene: gather → the body → the moment it lands (a jolt, a shake, a held beat) → what is left.
// Whatever visibly lands is a real hit, and every monster ends up with the skill's whole damage.
(function (root) {
  var CW = root.CW = root.CW || {};
  CW.fxWind = function (K, S) {
    var T = K.T, sc = K.sc, V = K.V, rr = K.rr, E = K.E, N = K.N, after = K.after, tick = K.tick, pick = K.pick;
    var MINT = 0x4fe3b8, PALE = 0xbffff0, TEAL = 0x0d5a52, WHITE = 0xffffff;
    var live = [];   // meshes made here (clear() takes them away with the rest of the effects)
    var PAW_VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
    var PLANE = new T.PlaneGeometry(2, 2);   // shared by the paws and the rings (never disposed)
    function ease(x) { x = Math.min(1, Math.max(0, x)); return 1 - (1 - x) * (1 - x); }
    function ease3(x) { x = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - x, 3); }
    function addMesh(m, order) { m.renderOrder = order || 6; m.frustumCulled = false; (sc.fxGroup || sc.scene).add(m); live.push(m); return m; }
    function kill(m) { var i = live.indexOf(m); if (i >= 0) live.splice(i, 1); if (m.parent) m.parent.remove(m); if (m.geometry && !m.userData.shareGeo) m.geometry.dispose(); if (m.material) m.material.dispose(); }

    // ---------- a wind streak: a ribbon of light whose bright head runs from one end to the other ----------
    // aU: along it (0 → 1), aV: across it (0 → 1). The core pass adds mint-to-white light; the edge pass lays a thin deep teal
    // line along both sides under it, so the streak still shows on bright ground and does not wash out to white where many cross.
    var RIB_VS = 'attribute float aU;attribute float aV;varying float vU;varying float vV;varying float vWY;' +
      'void main(){vU=aU;vV=aV;vWY=(modelMatrix*vec4(position,1.0)).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
    // (uClipY: nothing above this world height is drawn — a spear coming out through the face of 짓누르는 바람's gate)
    var RIB_HEAD = 'uniform vec3 uCol;uniform float uHead,uTail,uAlpha,uClipY;varying float vU;varying float vV;varying float vWY;' +
      'void main(){if(vWY>uClipY)discard;float d=uHead-vU;if(d<0.0||d>uTail)discard;float k=1.0-d/uTail;float w=mix(0.2,1.0,k);' +
      'float ac=(1.0-abs(vV*2.0-1.0))-(1.0-w);if(ac<=0.0)discard;ac/=w;';
    var RIB_CORE = RIB_HEAD + 'float core=smoothstep(0.45,1.0,ac);vec3 col=mix(uCol,vec3(1.0),core*k);' +
      'float a=smoothstep(0.15,0.5,ac)*k*uAlpha;gl_FragColor=vec4(col,a);}';
    var RIB_EDGE = RIB_HEAD + 'float a=(1.0-smoothstep(0.12,0.32,ac))*smoothstep(0.0,0.06,ac)*k*uAlpha*0.9;gl_FragColor=vec4(uCol,a);}';
    var UPV = new T.Vector3(0, 1, 0);
    function curvePts(from, to, bend, n) {
      // a quadratic curve bowed by bend (a vector added to the middle)
      var mid = from.clone().add(to).multiplyScalar(0.5).add(bend || new T.Vector3()), pts = [];
      for (var i = 0; i <= n; i++) { var t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
        pts.push(new T.Vector3(from.x * a + mid.x * b + to.x * d, from.y * a + mid.y * b + to.y * d, from.z * a + mid.z * b + to.z * d)); }
      return pts;
    }
    function ribbonGeo(pts, w) {
      var n = pts.length, pos = new Float32Array(n * 6), au = new Float32Array(n * 2), av = new Float32Array(n * 2), idx = [];
      var cam = sc.camera.position, tan = new T.Vector3(), view = new T.Vector3(), side = new T.Vector3();
      for (var i = 0; i < n; i++) {
        var p = pts[i]; tan.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
        view.subVectors(cam, p).normalize(); side.crossVectors(tan, view); if (side.lengthSq() < 1e-6) side.crossVectors(tan, UPV);
        side.normalize().multiplyScalar(w / 2);
        pos.set([p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z], i * 6);
        au[i * 2] = au[i * 2 + 1] = i / (n - 1); av[i * 2] = 0; av[i * 2 + 1] = 1;
        if (i < n - 1) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aU', new T.BufferAttribute(au, 1)); g.setAttribute('aV', new T.BufferAttribute(av, 1));
      g.setIndex(idx); return g;
    }
    function ribMat(fs, col, add) {
      return new T.ShaderMaterial({ vertexShader: RIB_VS, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide,
        blending: add ? T.AdditiveBlending : T.NormalBlending,
        uniforms: { uCol: { value: new T.Color(col) }, uHead: { value: 0 }, uTail: { value: 0.35 }, uAlpha: { value: 1 }, uClipY: { value: 1e6 } } });
    }
    // streak(from, to, o): o.w width (0.16), o.life seconds (0.4), o.col (mint), o.edge (deep teal), o.bend (Vector3),
    // o.tail (how much of the length is lit behind the head, 0.4), o.delay, o.order. Returns { kill }.
    function streak(from, to, o) {
      o = o || {};
      var pts = curvePts(from, to, o.bend, 18), geo = ribbonGeo(pts, o.w || 0.16), L = o.life || 0.4, tail = o.tail || 0.4, t = -(o.delay || 0);
      // (a thin streak is drawn once, without the teal line: too thin for it to show, and every pass is a draw on the phone)
      var ms = [addMesh(new T.Mesh(geo, ribMat(RIB_CORE, o.col || MINT, true)), (o.order || 6) + 0.01)];
      if ((o.w || 0.16) >= 0.1) ms.unshift(addMesh(new T.Mesh(geo.clone(), ribMat(RIB_EDGE, o.edge || TEAL, false)), (o.order || 6)));
      ms.forEach(function (m) { m.visible = false; m.material.uniforms.uTail.value = tail; });
      var dead = false;
      function gone() { if (!dead) { ms.forEach(kill); dead = true; } }
      tick(function (dt) {
        if (dead) return true;
        t += dt; if (t < 0) return false;
        var run = Math.min(1, t / (L * 0.7)), head = run * (1 + tail), fade = t > L * 0.7 ? 1 - (t - L * 0.7) / (L * 0.3) : 1;
        ms.forEach(function (m) { m.visible = true; m.material.uniforms.uHead.value = head; m.material.uniforms.uAlpha.value = Math.max(0, fade) * (o.alpha || 1); });
        if (t < L) return false; gone(); return true;
      });
      return { kill: gone };
    }
    // a ring of air rolling out on the ground at p (radius r0 → r1 over life): a clean thin line of the same width however wide
    // it grows (the sprite rings got thick and soft as they grew and washed the field green — 형: 녹색 번짐은 촌스럽다),
    // a white-mint core over a fine deep teal line. col: the core colour (pale mint); shadow: how strong the teal line is
    var LR_FS = 'varying vec2 vUv;uniform float uR,uW,uAlpha;uniform vec3 uCol;' +
      'void main(){float r=length(vUv*2.0-1.0);float d=abs(r-uR);float a=1.0-smoothstep(uW*0.5,uW*0.5+0.004,d);if(a<=0.0)discard;gl_FragColor=vec4(uCol,a*uAlpha);}';
    function airRing(p, r0, r1, life, col, shadow) {
      var L = life || 0.4, M = Math.max(r0, r1) + 0.3, t = 0, W = 0.07, sh = shadow === undefined ? 0.5 : shadow;
      function mkLine(add, c, w, order) {
        var m = addMesh(new T.Mesh(PLANE, new T.ShaderMaterial({ vertexShader: PAW_VS, fragmentShader: LR_FS, transparent: true, depthWrite: false, depthTest: false,
          blending: add ? T.AdditiveBlending : T.NormalBlending, uniforms: { uR: { value: 0 }, uW: { value: w / M }, uAlpha: { value: 1 }, uCol: { value: new T.Color(c) } } })), order);
        m.userData.shareGeo = true; m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.05, p.z); m.scale.setScalar(M); return m;
      }
      var edge = sh > 0 ? mkLine(false, TEAL, W * 2.4, 2.3) : null, core = mkLine(true, col || PALE, W, 2.31);
      tick(function (dt) {
        t += dt; var k = Math.min(1, t / L), rad = r0 + (r1 - r0) * ease(k), a = 1 - k * k;
        if (edge) { edge.material.uniforms.uR.value = rad / M; edge.material.uniforms.uAlpha.value = a * sh; }
        core.material.uniforms.uR.value = rad / M; core.material.uniforms.uAlpha.value = a;
        if (t < L) return false; if (edge) kill(edge); kill(core); return true;
      });
    }
    // little blades of wind flung out from p
    function chips(p, n, spd, col) {
      for (var i = 0; i < n; i++) {
        var a = rr(0, 6.283), s = (spd || 4) * rr(0.5, 1.1), v = V(Math.cos(a) * s, rr(0.5, 2.5), Math.sin(a) * s * 0.7);
        E({ sys: 'norm', pos: p.clone(), vel: v, frame: 'streak', color: [i % 3 ? (col || MINT) : WHITE, PALE], size: [0.5, 0.1], life: rr(0.18, 0.32), drag: 3, rot: Math.atan2(-v.y, v.x), alpha: 0.95 });
      }
    }
    // the mark a wind blow leaves on a monster: a mint flash, a ring and blades flung off it
    function windHit(m, k) {
      var p = sc.mobPos(m), b = (k || 1) * (m.boss ? 1.5 : 1);
      E({ sys: 'norm', pos: p, frame: 'star', color: [WHITE, PALE], size: [0.35 * b, 1.1 * b], ease: 1, life: 0.18, spin: rr(-6, 6), alpha: 1 });
      E({ sys: 'norm', pos: p, frame: 'ring', color: WHITE, size: [0.25 * b, 0.8 * b], ease: 1, life: 0.16, alpha: 0.5 });
      chips(p, 5, 3.2 * b);
    }
    // the thick of the crowd (the rule 하늘 폭포 found, 2026-11-23): the monster with the most others round it, the ones that
    // have arrived counting double, a spot far from the middle of the picture counting for less
    function crowdCentre(list) {
      var REACH = 2.4, arrived = list.filter(function (m) { return m.arrived; }), cand = arrived.length ? arrived : list;
      function score(m) {
        var n = 0, p = V(m.x, 0.6, m.z).project(sc.camera), off = Math.hypot(p.x / 0.55, (p.y - 0.05) / 0.45);
        list.forEach(function (o) { if (Math.hypot(o.x - m.x, (o.z - m.z) / 0.8) <= REACH) n += o.arrived ? 1 : 0.5; });
        return n - 1.6 * off * off;
      }
      return cand.reduce(function (best, m) { return score(m) > score(best) ? m : best; });
    }
    // the reach of the 30% share round 소닉붐 화살's target: fixed like 물방울 감옥's (1.8) — c.hitScale grows with the skill
    // level and at 50 would reach the whole field
    var SPLASH_R = 1.8;
    function blow(power, hold) { if (hold) sc.hitStop(hold); sc.shake(power); }

    // ---------- a cat's paw of wind (응축공기폭탄): one big pad and four toe pads, drawn by distance in a flat square ----------
    // uv -1..1, toes toward +y. uFill: how full the inside is (see-through mint with streaks of wind running through it);
    // uRim: the bright band just inside the outline; uRing: only the outline (the blast front); the edge pass lays the deep
    // teal line just outside it. uT runs the streaks.
    var PAW_SDF = 'varying vec2 vUv;uniform float uT,uAlpha,uFill,uRim,uRing,uW;uniform vec3 uCol;' +
      'float sdE(vec2 p,vec2 c,vec2 r){vec2 q=(p-c)/r;return (length(q)-1.0)*min(r.x,r.y);}' +
      'float paw(vec2 p){float d=sdE(p,vec2(0.0,-0.3),vec2(0.5,0.4));d=min(d,sdE(p,vec2(-0.62,0.2),vec2(0.18,0.22)));' +
      'd=min(d,sdE(p,vec2(-0.23,0.52),vec2(0.2,0.24)));d=min(d,sdE(p,vec2(0.23,0.52),vec2(0.2,0.24)));d=min(d,sdE(p,vec2(0.62,0.2),vec2(0.18,0.22)));return d;}';
    var PAW_CORE = PAW_SDF + 'void main(){vec2 p=vUv*2.0-1.0;float d=paw(p);' +
      'float inside=1.0-smoothstep(-0.006,0.006,d);' +
      'float wind=0.5+0.5*sin((p.x*0.8+p.y*5.0)*3.2-uT*16.0);wind=pow(wind,3.0);' +
      'float rim=(1.0-smoothstep(0.0,uW,-d))*inside;' +
      'float ring=1.0-smoothstep(uW*0.32,uW*0.5,abs(d+uW*0.5));' +
      'float a=inside*uFill*(0.1+0.32*wind)+rim*uRim*0.75+ring*uRing;' +
      'vec3 col=mix(uCol,vec3(1.0),clamp(rim*uRim*0.35+ring*uRing*0.55+inside*uFill*wind*0.12,0.0,1.0));' +
      'gl_FragColor=vec4(col,clamp(a,0.0,1.0)*uAlpha);}';
    var PAW_EDGE = PAW_SDF + 'void main(){vec2 p=vUv*2.0-1.0;float d=paw(p);' +
      'float band=smoothstep(0.0,0.008,d)*(1.0-smoothstep(uW*0.22,uW*0.45,d));' +
      'gl_FragColor=vec4(uCol,band*uAlpha*0.7*min(1.0,max(uFill,max(uRim,uRing))));}';
    // pawPlane(flat): a paw that stands facing the camera (flat false) or lies on the ground, toes away from the camera.
    // set(pos, radius, o): o.fill, o.rim, o.ring, o.alpha, o.w (band width in uv), o.t (time for the streaks)
    function pawPlane(flat, order) {
      function mk(fs, add, col) {
        return new T.ShaderMaterial({ vertexShader: PAW_VS, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide,
          blending: add ? T.AdditiveBlending : T.NormalBlending,
          uniforms: { uT: { value: 0 }, uAlpha: { value: 1 }, uFill: { value: 0 }, uRim: { value: 0 }, uRing: { value: 0 }, uW: { value: 0.1 }, uCol: { value: new T.Color(col) } } });
      }
      var edge = addMesh(new T.Mesh(PLANE, mk(PAW_EDGE, false, TEAL)), order || 6), core = addMesh(new T.Mesh(PLANE, mk(PAW_CORE, true, MINT)), (order || 6) + 0.01);
      edge.userData.shareGeo = core.userData.shareGeo = true;   // PLANE is shared: never disposed
      if (flat) { edge.rotation.x = core.rotation.x = -Math.PI / 2; }
      var dead = false;
      return {
        set: function (pos, r, o) {
          if (dead) return;
          [edge, core].forEach(function (m) {
            m.position.copy(pos); m.scale.setScalar(r);
            if (!flat) m.quaternion.copy(sc.camera.quaternion);
            var u = m.material.uniforms; u.uT.value = o.t || 0; u.uAlpha.value = o.alpha === undefined ? 1 : o.alpha;
            u.uFill.value = o.fill || 0; u.uRim.value = o.rim || 0; u.uRing.value = o.ring || 0; u.uW.value = o.w || 0.1;
          });
        },
        kill: function () { if (dead) return; dead = true; kill(edge); kill(core); }
      };
    }

    // ---------- 1. 칼바람 일섬 (every monster, the job's own skill) ----------
    // (2nd, 형: X 쳐지는 게 별로, 임팩트가 너무 없다) One great stroke instead of marks: wind is drawn into the staff as the
    // wizard winds up (the field darkening), then giant blades of wind slash right across the screen from edge to edge, one
    // through each row of the crowd, 샥-샥-샥 — each leaves a thin seam of light hanging in the air and the monsters it went
    // through stop dead; a held silence, the seams glinting — then 착: every seam bursts open, the air above and below it
    // peeling apart, blades of wind thrown out all along it, every monster cut at once (held beat, slow motion, the hardest
    // shake). Straight strokes and a delayed cut — not 6차 초승달 베기's three curved blades passing over.
    // a straight line of light on the screen plane through P: ang its slant, len its length, w its width. set(o): o.head
    // (0 → 1 drawn in), o.alpha, o.grow (scale about P), o.apart (slid along the screen's up, either way), o.white
    function cutLine(P, ang, len, w) {
      var cam = sc.camera, right = V(1, 0, 0).applyQuaternion(cam.quaternion), up = V(0, 1, 0).applyQuaternion(cam.quaternion);
      var d = right.clone().multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.sin(ang)), n = right.clone().multiplyScalar(-Math.sin(ang)).addScaledVector(up, Math.cos(ang));
      var pts = []; for (var i = 0; i <= 16; i++) pts.push(d.clone().multiplyScalar((i / 16 - 0.5) * len).add(P));
      var geo = ribbonGeo(pts, w);
      // the geometry in the line's own frame (so it can grow and slide about its middle)
      var pos = geo.attributes.position; for (var k = 0; k < pos.count; k++) pos.setXYZ(k, pos.getX(k) - P.x, pos.getY(k) - P.y, pos.getZ(k) - P.z);
      // (a very thin line — a needle of light, a thin shaft — is drawn once, without the teal line round it: too thin for
      // it to show, and every pass is one more draw on the phone)
      var core = addMesh(new T.Mesh(geo, ribMat(RIB_CORE, PALE, true)), 6.41), ms = [core];
      if (w >= 0.05) ms.unshift(addMesh(new T.Mesh(geo.clone(), ribMat(RIB_EDGE, TEAL, false)), 6.4));
      ms.forEach(function (m) { m.position.copy(P); m.material.uniforms.uTail.value = 4; m.material.uniforms.uHead.value = 0; });
      var dead = false;
      return {
        n: n, d: d,
        set: function (o) {
          if (dead) return;
          ms.forEach(function (m) {
            var u = m.material.uniforms; u.uHead.value = (o.head === undefined ? 1 : o.head) * 1.02; u.uAlpha.value = (o.alpha === undefined ? 1 : o.alpha) * (m === core ? 1 + (o.white || 0) : 1); u.uClipY.value = o.clipY === undefined ? 1e6 : o.clipY;
            m.scale.setScalar(o.grow || 1); m.position.copy(P).addScaledVector(n, o.apart || 0); if (o.at) m.position.add(o.at);
          });
        },
        kill: function () { if (dead) return; dead = true; ms.forEach(kill); }
      };
    }
    // liveLine(w): a thin straight line of light whose two ends move every frame (the bow's string) — one mesh made once,
    // its points rewritten in place (not a new line every frame). span(A, B, a): from A to B, a its brightness
    function liveLine(w) {
      var NP = 9, pts = []; for (var i = 0; i < NP; i++) pts.push(V(i, 0, 0));
      var geo = ribbonGeo(pts, w), pos = geo.attributes.position, m = addMesh(new T.Mesh(geo, ribMat(RIB_CORE, PALE, true)), 6.41);
      m.material.uniforms.uTail.value = 4; m.material.uniforms.uHead.value = 1.02; m.material.uniforms.uAlpha.value = 0;
      var tan = new T.Vector3(), view = new T.Vector3(), side = new T.Vector3(), p = new T.Vector3(), dead = false;
      return {
        span: function (A, B, a) {
          if (dead) return;
          tan.subVectors(B, A).normalize();
          for (var j = 0; j < NP; j++) {
            p.lerpVectors(A, B, j / (NP - 1)); view.subVectors(sc.camera.position, p).normalize();
            side.crossVectors(tan, view); if (side.lengthSq() < 1e-6) side.crossVectors(tan, UPV); side.normalize().multiplyScalar(w / 2);
            pos.setXYZ(j * 2, p.x - side.x, p.y - side.y, p.z - side.z); pos.setXYZ(j * 2 + 1, p.x + side.x, p.y + side.y, p.z + side.z);
          }
          pos.needsUpdate = true; m.material.uniforms.uAlpha.value = a;
        },
        kill: function () { if (!dead) { dead = true; kill(m); } }
      };
    }
    // a blade of wind: aU along it, aV across (1 = the cutting edge, or 0 with flip). Pointed at both ends, thickest in the
    // middle; a crisp white edge, mint behind it fading out toward the back, a glint running along the edge (uGlint); the
    // edge pass is a fine deep teal line round its outline so it holds on bright ground. uHead: drawn in from the tail.
    var BLADE_HEAD = 'uniform vec3 uCol;uniform float uHead,uAlpha,uGlint,uFlip,uT,uStyle,uClipY;varying float vU;varying float vV;varying float vWY;' +
      'void main(){if(vWY>uClipY)discard;if(vU>uHead)discard;float u=vU/max(uHead,0.001);float th=0.9*pow(max(sin(3.14159*u),0.0),0.6);' +
      'float vv=mix(vV,1.0-vV,uFlip);float fe=(1.0-vv)-0.06;';
    var BLADE_CORE = BLADE_HEAD + 'if(fe<0.0||fe>th)discard;float k=fe/max(th,0.001);' +
      'float edge=1.0-smoothstep(0.0,0.06,k);vec3 col=mix(vec3(1.0),uCol,smoothstep(0.02,0.14,k));' +
      'float gq=(u-uGlint)*14.0;float g=exp(-gq*gq)*(1.0-smoothstep(0.0,0.35,k));col+=vec3(g*0.9);' +
      'float grain=pow(0.5+0.5*sin(u*70.0-uT*38.0+k*9.0+sin(u*13.0+uT*5.0)*2.0),10.0)*(1.0-k*0.7)*1.1;' +
      'float bevel=(1.0-smoothstep(0.0,0.035,abs(k-0.36)))*0.55;col+=vec3(grain+bevel*0.6);' +
      'vec3 prism=0.5+0.5*cos(6.2832*(u*1.6-uT*2.2+vec3(0.0,0.33,0.67)));col=mix(col,mix(vec3(1.0),prism,0.55),(1.0-smoothstep(0.0,0.16,k))*0.7);' +
      'float a=(1.0-smoothstep(0.2,1.0,k))*0.5+edge*0.6+g+grain*0.6+bevel*0.5;' +
      // style 1, a feather: a quill down its middle, barbs slanting off it
      'if(uStyle>0.5&&uStyle<1.5){float quill=1.0-smoothstep(0.0,0.06,abs(k-0.5));float barb=pow(0.5+0.5*sin(u*58.0-abs(k-0.5)*22.0),7.0)*(1.0-smoothstep(0.75,1.0,k));' +
      'col+=vec3(quill*0.7+barb*0.35);a+=quill*0.55+barb*0.3;}' +
      // style 2, engraved: a lattice of diamonds along it with a stud of light in each
      'if(uStyle>1.5){float cc=abs(fract(u*8.0+0.5)-0.5)*2.0;float dia=1.0-smoothstep(0.0,0.07,abs(cc*0.8-abs(k-0.45)*1.6));' +
      'float stud=1.0-smoothstep(0.0,0.08,length(vec2((fract(u*8.0)-0.5)*2.6,(k-0.45)*1.4)));col+=vec3(dia*0.45+stud*0.9);a+=dia*0.35+stud*0.6;}' +
      'gl_FragColor=vec4(col,clamp(a,0.0,1.0)*uAlpha);}';
    var BLADE_EDGE = BLADE_HEAD + 'float d=fe<0.0?-fe:(fe>th?fe-th:-1.0);if(d<0.0||d>0.05)discard;' +
      'gl_FragColor=vec4(uCol,(1.0-d/0.05)*uAlpha*0.8*smoothstep(0.0,0.08,th));}';
    function bladeMat(fs, col, add) {
      return new T.ShaderMaterial({ vertexShader: RIB_VS, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide,
        blending: add ? T.AdditiveBlending : T.NormalBlending,
        uniforms: { uCol: { value: new T.Color(col) }, uHead: { value: 0 }, uAlpha: { value: 1 }, uGlint: { value: -1 }, uFlip: { value: 0 }, uT: { value: 0 }, uStyle: { value: 0 }, uClipY: { value: 1e6 } } });
    }
    // bladeLine(P, ang, len, w, o): a blade on the screen plane through P along ang, w its greatest width; o.bend (how far
    // its middle bows toward its edge side), o.flip (its edge on the other side), o.style (1 feather, 2 engraved). set(o): o.head, o.alpha, o.glint (0..1
    // along it), o.apart (slid along the screen's up), o.grow
    function bladeLine(P, ang, len, w, o) {
      o = o || {};
      var cam = sc.camera, right = V(1, 0, 0).applyQuaternion(cam.quaternion), up = V(0, 1, 0).applyQuaternion(cam.quaternion);
      var d = right.clone().multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.sin(ang)), n = right.clone().multiplyScalar(-Math.sin(ang)).addScaledVector(up, Math.cos(ang));
      var sideN = o.flip ? -1 : 1, pts = [];
      for (var i = 0; i <= 24; i++) { var t = i / 24; pts.push(d.clone().multiplyScalar((t - 0.5) * len).addScaledVector(n, sideN * (o.bend || 0) * Math.sin(Math.PI * t)).add(P)); }
      var geo = ribbonGeo(pts, w), pos = geo.attributes.position;
      for (var k = 0; k < pos.count; k++) pos.setXYZ(k, pos.getX(k) - P.x, pos.getY(k) - P.y, pos.getZ(k) - P.z);
      // ribbonGeo puts aV 1 on the side of cross(tangent, view): make that the side the edge faces (n, or -n with flip)
      var tan = d, view = cam.position.clone().sub(P).normalize(), side = new T.Vector3().crossVectors(tan, view), flipAV = side.dot(n) * sideN < 0 ? 1 : 0;
      // (a narrow blade — a barb, the bow's fine outer lines — is drawn once, without the teal line round it)
      var ms = [addMesh(new T.Mesh(geo, bladeMat(BLADE_CORE, PALE, true)), 6.46)];
      if (w >= 0.12) ms.unshift(addMesh(new T.Mesh(geo.clone(), bladeMat(BLADE_EDGE, TEAL, false)), 6.45));
      ms.forEach(function (m) { m.position.copy(P); m.material.uniforms.uFlip.value = flipAV; m.material.uniforms.uStyle.value = o.style || 0; });
      var dead = false;
      return {
        n: n, d: d,
        set: function (q) {
          if (dead) return;
          ms.forEach(function (m) {
            var u = m.material.uniforms; u.uHead.value = q.head === undefined ? 1 : q.head; u.uAlpha.value = q.alpha === undefined ? 1 : q.alpha; u.uGlint.value = q.glint === undefined ? -1 : q.glint; u.uT.value = q.t || 0; u.uClipY.value = q.clipY === undefined ? 1e6 : q.clipY;
            m.scale.setScalar(q.grow || 1); m.position.copy(P).addScaledVector(n, q.apart || 0).addScaledVector(d, q.along || 0); if (q.at) m.position.add(q.at);
          });
        },
        kill: function () { if (dead) return; dead = true; ms.forEach(kill); }
      };
    }
    S.galeSlash = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      var WIND = c.D(0.2), GAP = c.D(0.06), CUT = c.D(0.62);
      sc.heroPose('gale', WIND, c.col);
      if (!(CW.fxOff && CW.fxOff.dim)) sc.dim(0.22, CUT + c.D(0.2));
      var dir = sc.heroState && sc.heroState().faceT < 0 ? -1 : 1, cam = sc.camera;
      // the rows of the crowd as the screen shows them (up to three): each gets one stroke through its middle
      var rows = [], scr = list.map(function (m) { var p = sc.mobPos(m); return { m: m, p: p, y: p.clone().project(cam).y }; }).sort(function (a, b) { return a.y - b.y; });
      var span = scr[scr.length - 1].y - scr[0].y, nR = span < 0.18 ? 1 : span < 0.45 ? 2 : 3;
      for (var r = 0; r < nR; r++) rows.push(scr.slice(Math.floor(r * scr.length / nR), Math.floor((r + 1) * scr.length / nR)));
      rows = rows.filter(function (g) { return g.length; });
      // wind drawn into the staff while it winds up, a star swelling at its tip, blade shards drawn in
      var tw = 0, FANCY = [0xffffff, 0xcff8ff, 0xffd6f0, 0xfff1b8, 0xd9d2ff];
      tick(function (dt) {
        tw += dt; var tip = sc.heroTip();
        E({ sys: 'norm', pos: tip.clone(), frame: 'star', color: WHITE, size: [0.3 + 0.9 * (tw / WIND), 0.2], life: 0.05, spin: 7, alpha: 0.95 });
        if (Math.random() < 0.5) { var a5 = rr(0, 6.283), d5 = rr(1.2, 1.8), f5 = V(tip.x + Math.cos(a5) * d5, tip.y + Math.sin(a5) * d5 * 0.7, tip.z), t5 = V(tip.x - f5.x, tip.y - f5.y, 0);
          E({ sys: 'norm', pos: f5, vel: t5.clone().multiplyScalar(5.5), frame: 'shard', color: [pick(FANCY), WHITE], size: [0.26, 0.08], life: 0.17, spin: rr(-14, 14), alpha: 0.95 }); }
        if (Math.random() < 0.9) { var a = rr(0, 6.283), dd = rr(1.0, 1.8), from = V(tip.x + Math.cos(a) * dd, tip.y + Math.sin(a) * dd * 0.7, tip.z), to = V(tip.x - from.x, tip.y - from.y, 0);
          E({ sys: 'norm', pos: from, vel: to.clone().multiplyScalar(6), frame: 'streak', color: [WHITE, PALE], size: [0.4, 0.05], life: 0.15, rot: Math.atan2(-to.y, to.x), alpha: 0.9 }); }
        return tw >= WIND;
      });
      var seams = [];
      rows.forEach(function (g, i) {
        after(WIND + GAP * i, function () {
          var now = g.filter(function (o) { return o.m.alive; }); if (!now.length) return;
          var P = now.reduce(function (s, o) { return s.add(sc.mobPos(o.m)); }, V(0, 0, 0)).multiplyScalar(1 / now.length);
          var ang = dir * (0.16 - 0.1 * i), L = 26;
          // the blade: a whole blade of wind (shorter than the screen so its points show) flying across it fast, the cut
          // seam drawn on behind its point and staying
          var fly = ang + (dir > 0 ? 0 : Math.PI), BL = 4.6, blade = bladeLine(P, fly, BL, 0.95, { bend: 0.3 }), seam = cutLine(P, fly, L, 0.07), tb = 0, FLY = c.D(0.2), A0 = -L / 2 - BL / 2, A1 = L / 2 + BL / 2 + 1.8;
          var ghosts = [bladeLine(P, fly, BL * 0.92, 0.85, { bend: 0.3 }), bladeLine(P, fly, BL * 0.84, 0.75, { bend: 0.3 })], dustC = K.dustCol ? K.dustCol() : 0xd8c8a8;
          var wings = [bladeLine(P, fly, BL * 0.55, 0.5, { bend: 0.22 }), bladeLine(P, fly, BL * 0.5, 0.45, { bend: 0.22, flip: true })];
          seams.push({ seam: seam, P: P, ang: ang, rows: now.map(function (o) { return o.m; }) });
          sc.shake(0.16); if (sc.punch) sc.punch(0.04);
          // speed lines along it
          for (var q = 0; q < N(8, c); q++) { var off = rr(-0.45, 0.45), sp = P.clone().addScaledVector(blade.n, off).addScaledVector(blade.d, rr(-3, 3));
            streak(sp.clone().addScaledVector(blade.d, -dir * 3), sp.clone().addScaledVector(blade.d, dir * 3), { w: rr(0.04, 0.09), life: c.D(0.16), tail: 0.6, col: WHITE }); }
          tick(function (dt) {
            tb += dt; var k = Math.min(1, tb / FLY), al = A0 + (A1 - A0) * k;
            blade.set({ along: al, glint: (tb * 7) % 1, alpha: 1, t: tb });
            ghosts[0].set({ along: al - 0.9, alpha: 0.38, t: tb }); ghosts[1].set({ along: al - 1.8, alpha: 0.18, t: tb });
            wings[0].set({ along: al - 1.2, apart: 0.62, alpha: 0.8, glint: (tb * 9) % 1, t: tb }); wings[1].set({ along: al - 1.6, apart: -0.6, alpha: 0.75, glint: (tb * 8 + 0.5) % 1, t: tb });
            seam.set({ head: Math.max(0, Math.min(1, (al + BL / 2 + L / 2) / L)), alpha: 0.9 });
            var mid = P.clone().addScaledVector(blade.d, al), back = mid.clone().addScaledVector(blade.n, -0.35);
            for (var th = 0; th < 3; th++) { var tp = back.clone().addScaledVector(blade.d, rr(-BL / 2, BL / 2)), tv = blade.d.clone().multiplyScalar(-rr(3, 6)).addScaledVector(blade.n, -rr(0.5, 1.5));
              E({ sys: 'norm', pos: tp, vel: tv, frame: 'streak', color: [WHITE, PALE], size: [0.32, 0.03], life: rr(0.14, 0.24), drag: 2, rot: Math.atan2(-tv.y, tv.x), alpha: 0.75 }); }
            if (Math.random() < 0.7) E({ sys: 'norm', pos: mid.clone().addScaledVector(blade.d, rr(-BL / 2.5, BL / 2.5)).addScaledVector(blade.n, 0.35), frame: 'star', color: WHITE, size: [0.28, 0.05], life: 0.08, spin: 10, alpha: 1 });
            if (Math.random() < 0.6) E({ sys: 'norm', pos: V(mid.x, 0.08, mid.z), vel: V(blade.d.x * 3, rr(0.6, 1.6), blade.d.z * 3), frame: 'smoke', color: dustC, size: [0.25, 0.75], ease: 1, life: rr(0.3, 0.5), drag: 3, alpha: 0.4, fadeOut: 0.4 });
            if (k < 1) return false; blade.kill(); ghosts.concat(wings).forEach(function (g) { g.kill(); }); return true;
          });
          now.forEach(function (o) {
            var m = o.m, mp0 = sc.mobPos(m), at0 = mp0.clone().sub(P).dot(blade.d), when = Math.max(0, (at0 + BL / 2 - A0) / (A1 - A0)) * FLY;
            after(when, function () {
              if (!m.alive) return; if (!m.boss) m.stun = Math.max(m.stun || 0, CUT - WIND + c.D(0.1));
              E({ sys: 'norm', pos: sc.mobPos(m), frame: 'star', color: [WHITE, PALE], size: [0.3, 0.9], ease: 1, life: 0.1, spin: 6, alpha: 0.9 });
            });
          });
        });
      });
      // the silence: the seams glint
      var ts = 0;
      tick(function (dt) {
        ts += dt;
        seams.forEach(function (s) {
          s.seam.set({ alpha: 0.75 + 0.25 * Math.sin(ts * 38), white: 0.4 });
          if (Math.random() < 0.5) { var mp = s.P.clone().addScaledVector(V(1, 0, 0).applyQuaternion(sc.camera.quaternion), rr(-5, 5)).add(V(0, rr(-0.06, 0.06), 0));
            E({ sys: 'norm', pos: mp, vel: V(rr(-0.4, 0.4), rr(0.1, 0.5), 0), frame: Math.random() < 0.5 ? 'dot' : 'star', color: [WHITE, PALE], size: [0.12, 0.02], life: rr(0.25, 0.45), alpha: 0.85 }); }
        });
        return ts >= CUT;
      });
      // 착 — every seam bursts open and every monster is cut at once
      after(CUT, function () {
        var now = c.pool();
        if (!now.length) { seams.forEach(function (s) { s.seam.kill(); }); c.recover(); return; }
        sc.hitStop(0.12); sc.shake(0.65); if (sc.punch) sc.punch(0.12); if (sc.climax) sc.climax(0.4, c.D(0.26));
        seams.forEach(function (s) {
          s.seam.kill();
          // the air above and below the seam peels apart, a broad flash between, blades of wind thrown out all along it
          var hi = bladeLine(s.P, s.ang, 6.5, 0.5, { bend: 0.2 }), lo = bladeLine(s.P, s.ang, 6.5, 0.5, { bend: 0.2, flip: true }), fl = cutLine(s.P, s.ang, 26, 0.3), tc = 0;
          tick(function (dt) {
            tc += dt; var k = Math.min(1, tc / c.D(0.26)), e = ease3(k);
            hi.set({ apart: 0.9 * e, alpha: 1 - k, glint: 0.5 + 0.5 * k }); lo.set({ apart: -0.9 * e, alpha: 1 - k, glint: 0.5 - 0.5 * k });
            fl.set({ grow: 1 + 0.6 * e, alpha: Math.max(0, 1 - k * 3), white: 1.6 * (1 - k) });
            if (k < 1) return false; hi.kill(); lo.kill(); fl.kill(); return true;
          });
          for (var q = 0; q < N(9, c); q++) { var bp = s.P.clone().addScaledVector(V(1, 0, 0).applyQuaternion(sc.camera.quaternion), rr(-4, 4)), sgn = q % 2 ? 1 : -1, vv = V(rr(-2, 2), sgn * rr(3, 6), rr(-1, 1));
            E({ sys: 'norm', pos: bp, vel: vv, frame: 'shard', color: WHITE, size: [0.3, 0.08], life: rr(0.18, 0.28), drag: 2, spin: rr(-14, 14), alpha: 0.9 }); }
        });
        var hit = [];
        var flashes = 0;
        now.forEach(function (m) {
          hit.push(m); c.hit(m, 1, 2.2); windHit(m, 1.3);
          var mp = sc.mobPos(m), sm = seams.reduce(function (b, s) { return !b || Math.abs(mp.clone().sub(s.P).dot(s.seam.n)) < Math.abs(mp.clone().sub(b.P).dot(b.seam.n)) ? s : b; }, null);
          if (sm && flashes++ < 14) { var gl = bladeLine(mp, sm.ang + rr(-0.1, 0.1), m.boss ? 2.4 : 1.5, m.boss ? 0.5 : 0.34, { bend: 0.1 }), tg = 0;
            tick(function (dt) { tg += dt; var kk = Math.min(1, tg / c.D(0.16)); gl.set({ alpha: 1 - kk, grow: 1 + 0.5 * kk, glint: kk, t: tg }); if (kk < 1) return false; gl.kill(); return true; }); }
          E({ sys: 'norm', pos: V(m.x, 0.08, m.z), vel: V(rr(-1, 1), 0.6, rr(-0.5, 0.5)), frame: 'smoke', color: K.dustCol ? K.dustCol() : 0xd8c8a8, size: [0.4, 1.0], ease: 1, life: 0.45, drag: 3, alpha: 0.45, fadeOut: 0.4 });
        });
        seams.forEach(function (s) {
          var mc = s.P.clone(), ax = V(1, 0, 0).applyQuaternion(sc.camera.quaternion), ay = V(0, 1, 0).applyQuaternion(sc.camera.quaternion);
          E({ sys: 'norm', pos: mc.clone(), frame: 'flare', color: [WHITE, 0xcff8ff], size: [1.2, 3.0], ease: 1, life: 0.2, alpha: 0.9 });
          for (var rq = 0, RN = N(10, c); rq < RN; rq++) { var ra = rq / RN * 6.283 + rr(-0.12, 0.12), rv = ax.clone().multiplyScalar(Math.cos(ra)).addScaledVector(ay, Math.sin(ra) * 0.8).multiplyScalar(rr(9, 14));
            E({ sys: 'norm', pos: mc.clone(), vel: rv, frame: 'streak', color: [WHITE, pick(FANCY)], size: [1.3, 0.2], life: rr(0.16, 0.24), drag: 4, rot: Math.atan2(-rv.dot(ay), rv.dot(ax)), alpha: 0.95 }); }
          for (var gq = 0; gq < N(22, c); gq++) { var gp = mc.clone().addScaledVector(ax, rr(-5, 5)).addScaledVector(ay, rr(-0.3, 0.9));
            E({ sys: 'norm', pos: gp, vel: V(rr(-0.4, 0.4), rr(-1.4, -0.5), 0), frame: gq % 3 ? 'star' : 'dot', color: [pick(FANCY), WHITE], size: [rr(0.14, 0.26), 0.04], life: rr(0.6, 0.95), delay: rr(0, 0.15), spin: rr(-6, 6), alpha: 0.95 }); }
        });
        seams.forEach(function (s) { for (var q = 0; q < N(8, c); q++) { var cp = s.P.clone().addScaledVector(V(1, 0, 0).applyQuaternion(sc.camera.quaternion), rr(-4.5, 4.5)), cv = V(rr(-1.5, 1.5), rr(0.8, 2.2) * (q % 2 ? 1 : -1), 0);
          E({ sys: 'norm', pos: cp, vel: cv, frame: 'crescent', color: [WHITE, PALE], size: [0.35, 0.6], ease: 1, life: rr(0.22, 0.32), drag: 2.5, spin: rr(-12, 12), alpha: 0.85 }); } });
        // whoever comes onto the field just after is caught by a short stroke of its own
        K.lateComers(c, hit, c.D(0.3), function (m) {
          var p = sc.mobPos(m), ln = cutLine(p, dir * 0.12, 2.4, 0.3), tl = 0;
          tick(function (dt) { tl += dt; var k = Math.min(1, tl / c.D(0.14)); ln.set({ head: Math.min(1, k * 3), alpha: 1 - k, white: 1 - k }); if (k < 1) return false; ln.kill(); return true; });
          c.hit(m, 1, 1.4); windHit(m);
        });
      });
    };

    // ---------- 2. 소닉붐 화살 (one monster + 30% next to it) ----------
    // The staff is held out like a bow and the paw draws back an unseen string — a thin V of wind from the staff to the paw —
    // while an arrow of wind (a slim blade, its point at the target) lengthens at the tip, wind and shards drawn into it; let
    // go, a ring of air bursts round the staff (the sonic boom) and the arrow flies very fast and straight, rings of air
    // peeling off behind it one after another and widening (a cone), threads of wind shed, the dust on the ground split along
    // its way; it goes right through the monster and on (a held beat, a flash), then 펑 — the air bursts there: a ring of it
    // standing up, rays, shards and glitter, and the ring on the ground strikes the monsters close by (30%).
    // Unlike 7차 태양의 창 (a spear thrown, gold fire): drawn like a bow, much faster, rings of air, no gold or fire.
    // ringAt(P, n, r0, r1, life, col): a thin ring of air at P facing along n (its radius r0 → r1)
    function ringAt(P, n, r0, r1, life, col, sh) {   // sh: how strong its teal line is (0.6)
      var L = life || 0.25, M = Math.max(r0, r1) + 0.1, t = 0;
      function one(add, cl, w, order) {
        var m = addMesh(new T.Mesh(PLANE, new T.ShaderMaterial({ vertexShader: PAW_VS, fragmentShader: LR_FS, transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide,
          blending: add ? T.AdditiveBlending : T.NormalBlending, uniforms: { uR: { value: 0 }, uW: { value: w / M }, uAlpha: { value: 1 }, uCol: { value: new T.Color(cl) } } })), order);
        m.userData.shareGeo = true; m.position.copy(P); m.lookAt(P.clone().add(n)); m.scale.setScalar(M); return m;
      }
      // (sh 0: no teal line under it — one draw instead of two)
      var edge = sh === 0 ? null : one(false, TEAL, 0.1, 6.2), core = one(true, col || WHITE, 0.05, 6.21);
      tick(function (dt) {
        t += dt; var k = Math.min(1, t / L), rad = r0 + (r1 - r0) * ease(k), a = 1 - k;
        core.material.uniforms.uR.value = rad / M; core.material.uniforms.uAlpha.value = a;
        if (edge) { edge.material.uniforms.uR.value = rad / M; edge.material.uniforms.uAlpha.value = a * (sh === undefined ? 0.6 : sh); }
        if (t < L) return false; if (edge) kill(edge); kill(core); return true;
      });
    }
    // the screen-plane angle of the way from a to b (for laying a blade along it)
    function screenAng(a, b) {
      var cam = sc.camera, right = V(1, 0, 0).applyQuaternion(cam.quaternion), up = V(0, 1, 0).applyQuaternion(cam.quaternion), d = b.clone().sub(a);
      return Math.atan2(d.dot(up), d.dot(right));
    }
    var SPARK = [0xffffff, 0xcff8ff, 0xffd6f0, 0xfff1b8, 0xd9d2ff];
    // arrowShape(P, ang, L): an arrow on the screen plane, its middle at P, pointing along ang — a thin shaft; a head of a
    // diamond blade with two barbs and a needle of light ahead of its point; four fletchings of wind at the tail.
    // move(v, o): shifted by v (o.alpha, o.t); tipAt(): where its point is
    function arrowShape(P, ang, L) {
      var shaft = cutLine(P, ang, L, 0.07), d = shaft.d, n = shaft.n, tip = P.clone().addScaledVector(d, L / 2), tail = P.clone().addScaledVector(d, -L / 2);
      var lines = [shaft,
        cutLine(tip.clone().addScaledVector(d, -0.3).addScaledVector(n, 0.1), ang - 0.4, 0.5, 0.08),
        cutLine(tip.clone().addScaledVector(d, -0.3).addScaledVector(n, -0.1), ang + 0.4, 0.5, 0.08),
        cutLine(tip.clone().addScaledVector(d, 0.24), ang, 0.55, 0.035)];
      var blades = [bladeLine(tip.clone().addScaledVector(d, -0.12), ang, 0.8, 0.3, { style: 2 }),
        bladeLine(tail.clone().addScaledVector(d, 0.22).addScaledVector(n, 0.14), ang + 0.5, 0.55, 0.2, { bend: 0.08, style: 1 }),
        bladeLine(tail.clone().addScaledVector(d, 0.22).addScaledVector(n, -0.14), ang - 0.5, 0.55, 0.2, { bend: 0.08, flip: true, style: 1 }),
        bladeLine(tail.clone().addScaledVector(d, 0.48).addScaledVector(n, 0.11), ang + 0.42, 0.44, 0.16, { bend: 0.06, style: 1 }),
        bladeLine(tail.clone().addScaledVector(d, 0.48).addScaledVector(n, -0.11), ang - 0.42, 0.44, 0.16, { bend: 0.06, flip: true, style: 1 })];
      var off = new T.Vector3();
      return {
        d: d, n: n,
        move: function (v, o) {
          off.copy(v); var a = (o && o.alpha) === undefined ? 1 : o.alpha, t = (o && o.t) || 0;
          lines.forEach(function (q, i) { q.set({ at: off, alpha: a, white: i ? 0.6 : 0.3 }); });
          blades.forEach(function (q, i) { q.set({ at: off, alpha: a, glint: (t * (i ? 3 : 6) + i * 0.3) % 1, t: t }); });
        },
        tipAt: function () { return tip.clone().addScaledVector(d, 0.5).add(off); },
        headAt: function () { return tip.clone().add(off); },
        kill: function () { lines.concat(blades).forEach(function (q) { q.kill(); }); }
      };
    }
    // ornateBow(C, ang, R): a bow of wind at C across the line of a shot along ang, bowed toward the target, R its half
    // span — three limbs (the main one, a slim inner one and a fine outer line), tips curled back, feathers of wind fanning
    // out behind both limbs, a star gem in the grip with rings throbbing round it. set(g, t): g grows it in (0 → 1);
    // release(): it twangs, the feathers fly off as shards, it fades
    function ornateBow(C, ang, R) {
      var span = ang + Math.PI / 2, main = bladeLine(C, span, R * 2, 0.34, { bend: 0.55 * R, flip: true, style: 2 });
      var sd = main.d, toT = main.n.clone().negate();   // toT: toward the target
      var inner = bladeLine(C.clone().addScaledVector(toT, 0.12), span, R * 1.6, 0.14, { bend: 0.45 * R, flip: true, style: 2 });
      var outer = bladeLine(C.clone().addScaledVector(toT, -0.14), span, R * 2.25, 0.07, { bend: 0.62 * R, flip: true });
      var halo = bladeLine(C.clone().addScaledVector(toT, -0.5), span, R * 2.6, 0.05, { bend: 0.8 * R, flip: true });
      // small wing feathers either side of the grip
      var wingL = bladeLine(C.clone().addScaledVector(sd, 0.2).addScaledVector(toT, -0.22), span + 0.9, 0.62, 0.2, { bend: 0.06, style: 1 });
      var wingR = bladeLine(C.clone().addScaledVector(sd, -0.2).addScaledVector(toT, -0.22), span - 0.9 + Math.PI, 0.62, 0.2, { bend: 0.06, flip: true, style: 1 });
      var parts = [main, inner, outer, halo, wingL, wingR], feathers = [], ends = [];
      // where along the limb (s from -1 to 1) the bow's curve sits, and its slant there
      function limbAt(s) { return C.clone().addScaledVector(sd, s * R).addScaledVector(toT, 0.55 * R * (1 - s * s) * 0.95); }
      [-1, 1].forEach(function (side) {
        // the tip curled back away from the target
        var e = limbAt(side * 0.98); ends.push(e);
        parts.push(bladeLine(e.clone().addScaledVector(toT, -0.16).addScaledVector(sd, side * 0.12), span + side * 0.9, 0.55, 0.15, { bend: 0.12, flip: side < 0 }));
        // feathers fanning out behind the limb, longer toward the middle
        for (var f = 0; f < 4; f++) {
          var s0 = side * (0.25 + 0.19 * f), at = limbAt(s0), fl = 0.95 - 0.13 * f, fa = span + Math.PI + side * (0.55 + 0.22 * f);
          var fea = bladeLine(at.clone().addScaledVector(toT, -0.12 - fl * 0.42), fa + (side > 0 ? 0 : Math.PI), fl, 0.24, { bend: 0.1, flip: side < 0, style: 1 });
          feathers.push({ b: fea, delay: f * 0.08, at: at });
        }
      });
      var all = parts.concat(feathers.map(function (q) { return q.b; })), dead = false;
      return {
        ends: ends,
        set: function (g, t) {
          if (dead) return;
          parts.forEach(function (q, i) { q.set({ head: g, alpha: 0.95, glint: (t * (2 + i) + i * 0.2) % 1, t: t }); });
          feathers.forEach(function (q, i) { var h = Math.max(0, Math.min(1, (g - q.delay) / 0.5)); q.b.set({ head: h, alpha: 0.85 * h, glint: (t * 3 + i * 0.13) % 1, t: t }); });
          // beads of light set along the limb, a ribbon of wind running along it
          for (var bq = -3; bq <= 3; bq++) { if (!bq) continue; var bp = limbAt(bq / 3.6); E({ sys: 'norm', pos: bp, frame: 'dot', color: bq % 2 ? WHITE : 0xcff8ff, size: [0.11 * g, 0.11 * g], life: 0.04, alpha: 0.95 }); }
          for (var rw = 0; rw < 2; rw++) { var ss = ((t * 1.8 + rw * 0.5) % 1) * 2 - 1, a1 = limbAt(ss), a2 = limbAt(Math.min(1, ss + 0.05)), tg = a2.clone().sub(a1);
            E({ sys: 'norm', pos: a1.addScaledVector(toT, 0.06 * Math.sin(t * 25 + rw)), vel: tg.multiplyScalar(30), frame: 'streak', color: [WHITE, PALE], size: [0.35 * g, 0.05], life: 0.1, rot: Math.atan2(-tg.dot(V(0, 1, 0).applyQuaternion(sc.camera.quaternion)), tg.dot(V(1, 0, 0).applyQuaternion(sc.camera.quaternion))), alpha: 0.9 }); }
          // the gem in the grip: a throbbing star, a ring, sparkles floating round the bow
          E({ sys: 'norm', pos: C.clone(), frame: 'star', color: WHITE, size: [(0.45 + 0.12 * Math.sin(t * 30)) * g, 0.2], life: 0.05, spin: 5, alpha: 1 });
          if (Math.random() < 0.35) ringAt(C.clone(), sc.camera.position.clone().sub(C).normalize(), 0.18 * g, 0.5 * g, c0D(0.16), PALE);
          if (Math.random() < 0.6) { var sp = limbAt(rr(-1, 1)).add(V(rr(-0.2, 0.2), rr(-0.2, 0.2), 0));
            E({ sys: 'norm', pos: sp, vel: V(rr(-0.3, 0.3), rr(0.2, 0.6), 0), frame: Math.random() < 0.5 ? 'star' : 'dot', color: [pick(SPARK), WHITE], size: [0.15, 0.03], life: rr(0.25, 0.4), spin: rr(-6, 6), alpha: 0.95 }); }
        },
        release: function (D) {
          if (dead) return; dead = true;
          var tt = 0, L = D(0.22);
          feathers.forEach(function (q) { for (var k2 = 0; k2 < 2; k2++) { var v = V(rr(-3, 3), rr(-1, 3), 0).addScaledVector(toT, -rr(1, 3));
            E({ sys: 'norm', pos: q.at.clone().add(V(rr(-0.2, 0.2), rr(-0.2, 0.2), 0)), vel: v, frame: 'shard', color: [pick(SPARK), WHITE], size: [0.3, 0.08], life: rr(0.25, 0.4), drag: 2, spin: rr(-14, 14), alpha: 0.95 }); } });
          tick(function (dt) {
            tt += dt; var k = Math.min(1, tt / L), q = Math.sin(tt * 90) * (1 - k) * 0.09;
            parts.forEach(function (p, i) { p.set({ alpha: 1 - k, apart: i % 2 ? -q : q, glint: 0.5, t: tt }); });
            feathers.forEach(function (p, i) { p.b.set({ alpha: (1 - k) * 0.7, along: k * 0.5 * (i < 4 ? -1 : 1), t: tt }); });
            if (k < 1) return false; all.forEach(function (p) { p.kill(); }); return true;
          });
        },
        kill: function () { if (dead) return; dead = true; all.forEach(function (p) { p.kill(); }); }
      };
    }
    var c0D = function (t) { return t; };   // (ornateBow's rings keep their own time)
    S.sonicArrow = function (c) {
      var first = c.pool()[0]; if (!first) return;
      c.plain = true;
      var DRAW = c.D(0.3), FLY = c.D(0.12), HOLD = c.D(0.07);
      sc.heroPose('bow', DRAW, c.col);
      // drawing the bow: the bow of wind grows in, the string is pulled back to the paw, the arrow nocked and drawn with it,
      // wind gathering into its head
      var t = 0, drawn = false, tip0 = sc.heroTip(), m0 = first;
      var ang0 = screenAng(tip0, sc.mobPos(m0)), AL = 1.8, BOW = 1.25, PULL = 0.8;
      var bow = ornateBow(tip0, ang0, BOW), arrow = arrowShape(tip0.clone(), ang0, AL), ad = arrow.d, strs = bow.ends.map(function () { return liveLine(0.045); });
      tick(function (dt) {
        t += dt; if (drawn) return true;
        var k = Math.min(1, t / DRAW), m = m0.alive ? m0 : c.pool()[0];
        if (!m) { drawn = true; arrow.kill(); bow.kill(); strs.forEach(function (q) { q.kill(); }); c.hit(null, 1, 1.6); return true; }   // nobody left to aim at: the blow waits for the next one
        var g = ease3(Math.min(1, t / (DRAW * 0.5))), pull = PULL * ease(k);
        bow.set(g, t);
        arrow.move(ad.clone().multiplyScalar(-pull), { alpha: g, t: t });
        // the string: two bright strands from the bow's tips to the nock, light running along them
        var nock = tip0.clone().addScaledVector(ad, -AL / 2 - pull);
        bow.ends.forEach(function (e, ei) { strs[ei].span(e, nock, 0.95 * g * (1.5 + 0.5 * Math.sin(t * 40))); });
        bow.ends.forEach(function (e0, ei) { for (var bb = 0; bb < 2; bb++) { var fr = ((t * 2.2 + bb * 0.5 + ei * 0.25) % 1);
          E({ sys: 'norm', pos: e0.clone().lerp(nock, fr), frame: bb ? 'dot' : 'star', color: [WHITE, pick(SPARK)], size: [0.13 * g, 0.05], life: 0.05, spin: 6, alpha: 0.95 }); } });
        // wind gathering into the arrow's head, its light swelling
        var head = arrow.headAt();
        if (Math.random() < 0.8) { var a6 = rr(0, 6.283), d6 = rr(0.8, 1.4), f6 = head.clone().add(V(Math.cos(a6) * d6, Math.sin(a6) * d6 * 0.7, 0)), v6 = head.clone().sub(f6);
          E({ sys: 'norm', pos: f6, vel: v6.clone().multiplyScalar(6), frame: Math.random() < 0.5 ? 'shard' : 'streak', color: [pick(SPARK), WHITE], size: [0.24, 0.05], life: 0.15, spin: rr(-10, 10), rot: Math.atan2(-v6.y, v6.x), alpha: 0.9 }); }
        E({ sys: 'norm', pos: head, frame: 'star', color: WHITE, size: [0.2 + 0.6 * k, 0.15], life: 0.05, spin: 8, alpha: 0.95 });
        if (t >= DRAW) { drawn = true; arrow.kill(); strs.forEach(function (q) { q.kill(); }); bow.release(c.D); loose(m); return true; }
        return false;
      });
      function loose(m) {
        var from = sc.heroTip(), to = sc.mobPos(m), d = to.clone().sub(from); d.normalize();
        var end = to.clone().addScaledVector(d, 0.9), ang = screenAng(from, end);
        // the sonic boom round the bow as it goes
        sc.shake(0.2); if (sc.punch) sc.punch(0.05); sc.hitStop(0.03);
        ringAt(from.clone().addScaledVector(d, 0.25), d, 0.2, 1.4, c.D(0.24), WHITE);
        ringAt(from.clone().addScaledVector(d, 0.55), d, 0.1, 0.9, c.D(0.2), PALE);
        E({ sys: 'norm', pos: from.clone(), frame: 'star', color: [WHITE, PALE], size: [0.5, 1.8], ease: 1, life: 0.12, spin: 5, alpha: 1 });
        // the arrow flying point first, a trail of light under it
        var fa = arrowShape(from.clone().addScaledVector(d, AL / 2), ang, AL);
        streak(from, end, { w: 0.1, life: FLY + c.D(0.12), tail: 0.35, col: WHITE });
        streak(from, end, { w: 0.32, life: FLY + c.D(0.18), tail: 0.6, alpha: 0.45 });
        var ft = 0, next = 0, P = new T.Vector3(), dustC = K.dustCol ? K.dustCol() : 0xd8c8a8;
        tick(function (dt) {
          ft += dt; var k = Math.min(1, ft / FLY); P.lerpVectors(from, end, k);
          fa.move(P.clone().sub(from), { t: ft });
          var tp = fa.tipAt();
          E({ sys: 'norm', pos: tp, frame: 'star', color: WHITE, size: [0.55, 0.15], life: 0.05, spin: 9, alpha: 1 });
          // rings of air peeling off behind it, widening: the cone
          if ((next -= dt) <= 0) { next = c.D(0.02); ringAt(P.clone(), d, 0.1, 0.8, c.D(0.26), (Math.random() < 0.5 ? WHITE : PALE)); }
          // wind threads wound round it (a helix seen from the side), sparkles, the dust on the ground split along the way
          for (var h = 0; h < 2; h++) { var ph = ft * 60 + h * Math.PI, hp = P.clone().addScaledVector(fa.n, Math.sin(ph) * 0.25).addScaledVector(d, -0.4 - h * 0.3);
            E({ sys: 'norm', pos: hp, vel: d.clone().multiplyScalar(-2), frame: 'streak', color: [WHITE, pick(SPARK)], size: [0.26, 0.03], life: 0.16, rot: Math.atan2(-d.y, d.x), alpha: 0.85 }); }
          if (Math.random() < 0.6) E({ sys: 'norm', pos: P.clone().add(V(rr(-0.2, 0.2), rr(-0.2, 0.2), 0)), frame: 'dot', color: pick(SPARK), size: [0.12, 0.03], life: 0.3, alpha: 0.9 });
          if (Math.random() < 0.8) { var gp = V(P.x, 0.06, P.z), sdv = V(-d.z, 0, d.x).multiplyScalar(rr(1.3, 3.0) * (Math.random() < 0.5 ? -1 : 1));
            E({ sys: 'norm', pos: gp, vel: sdv.add(V(0, rr(0.3, 0.9), 0)), frame: 'smoke', color: dustC, size: [0.25, 0.7], ease: 1, life: 0.35, drag: 3, alpha: 0.45 }); }
          if (k < 1) return false;
          fa.kill(); land(m, d); return true;
        });
      }
      function land(m0, d) {
        var tgt = m0.alive ? m0 : null;
        // through it: a held beat and a flash
        sc.hitStop(0.08); sc.shake(0.25);
        if (tgt) { var p0 = sc.mobPos(tgt); E({ sys: 'norm', pos: p0, frame: 'star', color: [WHITE, PALE], size: [0.6, 1.8], ease: 1, life: 0.12, spin: 4, alpha: 1 }); ringAt(p0.clone(), d, 0.15, 0.9, c.D(0.14), WHITE); }
        after(HOLD, function () {
          var m = tgt && tgt.alive ? tgt : null;
          // 펑 — the air bursts
          sc.shake(0.5); if (sc.punch) sc.punch(0.1); sc.hitStop(0.06);
          // (its monster fell while it flew: the fallen one is handed over, so the blow goes to the one standing nearest it —
          // a bare null would share the cast's one carried blow with every other arrow whose monster fell)
          c.hit(m || m0, 1, 2.2);
          if (!m) return;
          var p = sc.mobPos(m), ax = V(1, 0, 0).applyQuaternion(sc.camera.quaternion), ay = V(0, 1, 0).applyQuaternion(sc.camera.quaternion), toCam = sc.camera.position.clone().sub(p).normalize();
          windHit(m, 1.6);
          ringAt(p.clone(), toCam, 0.3, 1.9, c.D(0.26), WHITE);
          ringAt(p.clone(), toCam, 0.15, 1.2, c.D(0.2), PALE);
          for (var q = 0, RN = N(10, c); q < RN; q++) { var ra = q / RN * 6.283 + rr(-0.15, 0.15), rv = ax.clone().multiplyScalar(Math.cos(ra)).addScaledVector(ay, Math.sin(ra)).multiplyScalar(rr(8, 12));
            E({ sys: 'norm', pos: p.clone(), vel: rv, frame: 'streak', color: [WHITE, pick(SPARK)], size: [1.0, 0.15], life: rr(0.14, 0.22), drag: 4, rot: Math.atan2(-rv.dot(ay), rv.dot(ax)), alpha: 0.95 }); }
          for (var s2 = 0; s2 < N(10, c); s2++) { var sv = V(rr(-5, 5), rr(1, 5), rr(-2, 2));
            E({ sys: 'norm', pos: p.clone(), vel: sv, frame: 'shard', color: WHITE, size: [0.28, 0.08], life: rr(0.2, 0.3), drag: 2, spin: rr(-14, 14), alpha: 0.95 }); }
          for (var g2 = 0; g2 < N(12, c); g2++) E({ sys: 'norm', pos: p.clone().add(V(rr(-0.8, 0.8), rr(0, 1.2), 0)), vel: V(rr(-0.3, 0.3), rr(-1.2, -0.4), 0), frame: g2 % 3 ? 'star' : 'dot', color: [pick(SPARK), WHITE], size: [rr(0.12, 0.22), 0.04], life: rr(0.5, 0.8), delay: rr(0, 0.1), spin: rr(-6, 6), alpha: 0.95 });
          airRing(V(m.x, 0, m.z), 0.3, SPLASH_R, c.D(0.26), PALE, 0.5);
          c.splash(m, SPLASH_R, 0.9);
        });
      }
    };

    // ---------- 3. 짓누르는 바람 (every monster) ----------
    // (2nd, 형: 뭐가 떨어지는지·어디서 떨어지는지 모르겠다, 하늘이면 하늘 — 그런 디테일이 부족) Where it comes from and what
    // falls, both plain to see: the wizard raises the staff and wind rushes up into the sky; up there, over the crowd (below
    // the top bar), a gate of wind opens — rings of air spreading, white clouds billowing round its rim, rays of light reaching
    // down — while a ring closes in on the ground under every monster (marked: it will land here); then out of the gate, one
    // after another (nearest first), great spears of wind drop onto them — engraved blades pointing down, a long tail of light
    // back up to the gate, rings of air peeling off as they fall — 쿵: the monster squashed flat and bouncing back, the
    // ground ringing out (a fine ring, cracks of light, dust, shards, glitter). The last lands hardest and the gate flashes shut.
    // No dark storm cloud (the 13th's), no swirl; not 7차 태양 폭발's columns of light or 11차 하늘 폭포's water.
    // the gate's disc: flat and level, faintly lit inside, a bright rim (uOpen grows it); no pattern in it — no magic circles
    var GATE_FS = 'varying vec2 vUv;uniform float uAlpha,uOpen;uniform vec3 uCol;' +
      'void main(){float r=length(vUv*2.0-1.0)/max(uOpen,0.001);if(r>1.0)discard;float rim=smoothstep(0.72,0.95,r)*(1.0-smoothstep(0.95,1.0,r));' +
      'float fill=0.15*(0.5+0.5*r);gl_FragColor=vec4(mix(uCol,vec3(1.0),rim*0.9+0.2),(fill+rim)*uAlpha);}';
    // the lower edge of the top bar (the place and stage plate with 지도, the boss's bar when it is up — not the thin line
    // of stars under the plate, which the gate may pass behind) on the screen, in the camera's terms (1 the top of the
    // fight, -1 its bottom); 1 when none of it is showing
    function barLine() {
      var cv = sc.renderer && sc.renderer.domElement, r = cv && cv.getBoundingClientRect && cv.getBoundingClientRect(), y = 1;
      if (!r || !r.height || typeof document === 'undefined') return y;
      ['#hud .nh-mid', '#bossbox'].forEach(function (q) {
        var el = document.querySelector(q), b = el && el.getBoundingClientRect();
        if (b && b.width > 0 && b.height > 0) y = Math.min(y, 1 - 2 * (b.bottom - r.top) / r.height);
      });
      return y;
    }
    function gateDisc(C, R) {
      var m = addMesh(new T.Mesh(PLANE, new T.ShaderMaterial({ vertexShader: PAW_VS, fragmentShader: GATE_FS, transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide,
        blending: T.AdditiveBlending, uniforms: { uAlpha: { value: 0 }, uOpen: { value: 0 }, uCol: { value: new T.Color(MINT) } } })), 2.35);
      m.userData.shareGeo = true; m.rotation.x = -Math.PI / 2; m.position.copy(C); m.scale.setScalar(R);
      return { set: function (open, a) { m.material.uniforms.uOpen.value = open; m.material.uniforms.uAlpha.value = a; }, kill: function () { kill(m); } };
    }
    // windSpear(P, ang, L, sz): a spear of light and wind on the screen plane, its middle at P, pointing along ang, L long.
    // move(off, t, a): shifted by off; tipAt() · tailAt(): its point and the end of its shaft; kill(). plain: only the head
    // and the shaft (the far ones in a big crowd — small on the screen, and many at once on the phone)
    function windSpear(P, ang, L, sz, plain) {
      var shaftL = L * 0.66, headL = L * 0.36;
      var cam = sc.camera, right = V(1, 0, 0).applyQuaternion(cam.quaternion), up = V(0, 1, 0).applyQuaternion(cam.quaternion);
      var d = right.clone().multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.sin(ang)), n = right.clone().multiplyScalar(-Math.sin(ang)).addScaledVector(up, Math.cos(ang));
      // the shaft runs from the tail to the head's base; the head ahead of it
      var tail = P.clone().addScaledVector(d, -L / 2), base = tail.clone().addScaledVector(d, shaftL), tip = P.clone().addScaledVector(d, L / 2);
      var shaft = cutLine(tail.clone().lerp(base, 0.5), ang, shaftL, 0.06 * sz);
      var lines = plain ? [shaft] : [shaft,
        cutLine(tip.clone().addScaledVector(d, 0.16 * sz), ang, 0.4 * sz, 0.035 * sz),          // the needle of light ahead of the point
        cutLine(base.clone(), ang + Math.PI / 2, 0.32 * sz, 0.06 * sz)];                     // the collar
      // the side blades: from either edge of the head's base, swept back and out (barbs), each laid along its own way
      function barb(side) {
        var a = ang + Math.PI - side * 0.5, dirB = right.clone().multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a)), bl = 0.38 * sz;
        return bladeLine(base.clone().addScaledVector(n, side * 0.08 * sz).addScaledVector(dirB, bl / 2), a, bl, 0.1 * sz, { bend: 0.03, flip: side < 0 });
      }
      var head = bladeLine(base.clone().lerp(tip, 0.5), ang, headL, 0.24 * sz, { style: 2 });   // the head: long, narrow, engraved
      var blades = plain ? [head] : [head, barb(1), barb(-1)];
      var off = new T.Vector3();
      return {
        d: d, n: n,
        move: function (v, t, a, clipY) {
          off.copy(v); a = a === undefined ? 1 : a;
          lines.forEach(function (q, i) { q.set({ at: off, alpha: a, white: i === 1 ? 1 : 0.5, clipY: clipY }); });
          blades.forEach(function (q, i) { q.set({ at: off, alpha: a, glint: (t * (i ? 4 : 7) + i * 0.3) % 1, t: t, clipY: clipY }); });
        },
        tipAt: function () { return tip.clone().addScaledVector(d, 0.36 * sz).add(off); },
        tailAt: function () { return tail.clone().add(off); },
        kill: function () { lines.concat(blades).forEach(function (q) { q.kill(); }); }
      };
    }
    S.downdraft = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('raise', c.D(0.2), c.col);
      if (!(CW.fxOff && CW.fxOff.dim)) sc.dim(0.18, c.D(1.1));
      var cm = crowdCentre(list), cam = sc.camera;
      // the gate's height: over the crowd, kept below the top bar of the screen (as 하늘 폭포 does) — and the whole disc too,
      // not only its middle: held sideways the screen is short and the bar takes much more of it, so there the gate comes
      // lower (2026-11-26, 가로 화면에서 문 가운데가 「3-8」 칸 뒤에 가려지고 위가 잘림). Upright it comes out as before (the
      // disc is already well under the bar).
      var line = barLine() - 0.03, floorY = V(cm.x, 0, cm.z).project(cam).y, maxY = V(cm.x, 6, cm.z).project(cam).y;
      // sideways (LAND) the gate starts a little smaller, 2.1 against 2.6 upright — there the whole picture is drawn about
      // twice as big, and at 2.6 it took more than half the height of the screen (2026-11-26 3rd, 형: 문 조금 작게)
      var LAND = !!(CW.isLand && CW.isLand());
      var SKY = 6 * Math.max(0.45, Math.min(1, (Math.min(0.42, line) - floorY) / Math.max(0.1, maxY - floorY))), GR = LAND ? 2.1 : 2.6, SH = 0;
      // first lower (never down among their heads); then, at that size, slide it toward the viewer (SH) — still over the
      // crowd, just in front of its middle, so it comes lower on the screen; only if that is still not enough, smaller
      // (2026-11-26 2nd, 형: 가로 문 더 크게 — sideways the crowd sits right under the bar, and shrinking it made the gate
      // half the size of the crowd it falls on; slid, it covers the crowd)
      var LOW = list.some(function (m) { return m.boss; }) ? 3.0 : 2.1, SHMAX = 2;
      var cp = cam.getWorldPosition ? cam.getWorldPosition(new T.Vector3()) : cam.position, tx = cp.x - cm.x, tz = cp.z - cm.z, tl = Math.hypot(tx, tz) || 1;
      tx /= tl; tz /= tl;
      for (var st = 0; st < 80 && rimTop(SKY, GR, SH) > line; st++) {
        if (SKY > LOW) SKY = Math.max(LOW, SKY - 0.1);
        else if (SH < SHMAX) SH = Math.min(SHMAX, SH + 0.1);
        else GR = Math.max(1.2, GR - 0.05);
      }
      function rimTop(h, R, s) {
        for (var a = 0, top = -9; a < 16; a++) top = Math.max(top, V(cm.x + tx * s + Math.cos(a * 0.3927) * R, h, cm.z + tz * s + Math.sin(a * 0.3927) * R).project(cam).y);
        return top;
      }
      var GC = V(cm.x + tx * SH, SKY, cm.z + tz * SH), OPEN = c.D(0.3), GK = 0.4 + 0.6 * GR / 2.6;   // GK: the clouds and flashes round a smaller gate
      var CN = LAND ? 2 : 3, CS = LAND ? 0.8 : 1, CA = LAND ? 0.85 : 0.95;                        // the cloud ring: how many a frame, size, alpha
      var BK = 0.75;                                                                              // how far back in the gate a spear leaves, sideways (drop)
      // wind rushing up from the staff into the sky, toward the gate
      var tip = sc.heroTip();
      for (var u = 0; u < N(8, c); u++) streak(tip.clone().add(V(rr(-0.3, 0.3), 0, 0)), GC.clone().add(V(rr(-1.2, 1.2), rr(-0.3, 0.3), rr(-0.6, 0.6))), { w: rr(0.05, 0.12), life: c.D(0.26), delay: c.D(rr(0, 0.1)), tail: 0.5, col: WHITE, bend: V(rr(-0.5, 0.5), 0.6, 0) });
      // the gate opening: rings of air spreading, clouds billowing round its rim, rays of light down, sparkles
      ringAt(GC.clone(), UPV, 0.3, GR, OPEN, WHITE);
      after(OPEN * 0.3, function () { ringAt(GC.clone(), UPV, 0.2, GR * 0.72, OPEN * 0.8, PALE); });
      after(OPEN * 0.55, function () { ringAt(GC.clone(), UPV, 0.1, GR * 0.45, OPEN * 0.7, WHITE); });
      var tg = 0, gateLife = c.D(1.0), shut = false, disc = gateDisc(GC, GR);
      tick(function (dt) {
        tg += dt;
        if (shut || tg > gateLife) { disc.kill(); return true; }
        var open = Math.min(1, tg / OPEN), ease1 = ease3(open);
        disc.set(ease1, 0.9);
        // a ring of thick white cloud round the gate (drawn plain, not as light, so it shows on bright ground too); sideways
        // fewer, smaller and fainter — there the gate lies over the crowd and the clouds hid it (2026-11-26 3rd, 형: 둘레 구름 가볍게)
        for (var cq = 0; cq < CN; cq++) { var ca = rr(0, 6.283), cr = GR * ease1 * rr(0.95, 1.18), cpp = GC.clone().add(V(Math.cos(ca) * cr, rr(-0.1, 0.25), Math.sin(ca) * cr * 0.85));
          E({ sys: 'norm', pos: cpp, vel: V(Math.cos(ca) * 0.3 * GK, rr(0.05, 0.2), Math.sin(ca) * 0.25 * GK), frame: 'smoke', color: [WHITE, 0xe8f6ff], size: [1.0 * GK * CS, 1.7 * GK * CS], ease: 1, life: rr(0.5, 0.75), drag: 1, alpha: CA, fadeOut: 0.4 }); }
        if (Math.random() < 0.35) { var a2 = rr(0, 6.283), r2 = GR * open * rr(0.1, 0.8), rs = GC.clone().add(V(Math.cos(a2) * r2, 0, Math.sin(a2) * r2 * 0.85));
          streak(rs, V(rs.x, 0.3, rs.z), { w: rr(0.04, 0.08), life: c.D(0.3), tail: 0.7, col: WHITE, alpha: 0.5 }); }
        if (Math.random() < 0.6) E({ sys: 'norm', pos: GC.clone().add(V(rr(-GR, GR) * open, rr(-0.3, 0.3), rr(-1, 1))), frame: Math.random() < 0.5 ? 'star' : 'dot', color: [pick(SPARK), WHITE], size: [0.16, 0.03], life: rr(0.25, 0.4), spin: rr(-6, 6), alpha: 0.95 });
        return false;
      });
      var hit = [], H0 = sc.heroState ? sc.heroState() : null, hx = H0 ? H0.x : 0, hz = H0 ? H0.z : 0;
      var order = list.slice().sort(function (a, b) { return Math.hypot(a.x - hx, a.z - hz) - Math.hypot(b.x - hx, b.z - hz); });
      var STEP = Math.min(0.045, 0.3 / Math.max(1, order.length - 1));
      // the mark on the ground under each: a ring closing in while the gate opens
      // (the first eight get the full spear and rings with their teal line; the rest, lighter ones — see drop)
      order.forEach(function (m, i) { var sz = m.boss ? 1.5 : 1; airRing(V(m.x, 0, m.z), 0.75 * sz, 0.2 * sz, OPEN + c.D(0.05), PALE, i < 8 ? 0.3 : 0); });
      order.forEach(function (m, i) { after(OPEN + c.D(i * STEP), function () { drop(m, i === order.length - 1); }); });
      after(OPEN + c.D(0.2), function () { K.lateComers(c, hit.concat(order), c.D(0.4), function (m) { drop(m, false); }); });
      // anyone the spears missed (moved, or came in late) is struck before the end
      after(c.D(0.95), function () { order.forEach(function (m) { if (m.alive && hit.indexOf(m) < 0) { hit.push(m); c.hit(m, 1, 1.2); windHit(m); } }); });
      // every one of them fell to something else before a spear came down (a wide spell swept the field just before): the
      // blow is not lost — it waits for the next monster to come (fx.js c.recover; nothing if any spear landed)
      after(c.D(1.1), function () { c.recover(); });
      function drop(m, last) {
        if (!m.alive || hit.indexOf(m) >= 0) return;
        var p = sc.mobPos(m), sz = m.boss ? 1.5 : 1, G = V(m.x, 0, m.z), FALL = c.D(0.12), tf = 0, landed = false;
        // where it leaves the gate: over the monster, drawn in toward the gate's middle
        var ox = (m.x - GC.x) * 0.55, oz = (m.z - GC.z) * 0.55, ol = Math.hypot(ox, oz / 0.85), lim = GR * 0.8;
        if (ol > lim) { ox *= lim / ol; oz *= lim / ol; }
        // (2026-11-26 3rd, 형: 창 더 길게 떨어지게) sideways the gate lies over the crowd, so from there the spear had only a
        // short way down the screen: it leaves from further back in the gate instead (straight away from the viewer, BK of
        // the way to 0.8 of the rim) — higher on the screen, about over the same place across it — and falls further
        if (LAND) { var ux = -tx, uz = -tz, pu = ox * ux + oz * uz, rb = GR * 0.8, sb = -pu + Math.sqrt(Math.max(0, pu * pu - (ox * ox + oz * oz - rb * rb)));
          ox += ux * sb * BK; oz += uz * sb * BK; }
        var S0 = V(GC.x + ox, SKY, GC.z + oz), A = V(m.x, SKY, m.z), pY = p.clone().project(cam).y;
        // (2026-11-26 2nd) when the gate has slid toward the viewer, for one at the back (right under the bar) that point
        // can be no higher on the screen than the monster — a spear flying up or sideways; then it leaves from further back,
        // over the monster itself, so it always comes down the screen
        for (var fk = 0; fk < 10 && S0.clone().project(cam).y - pY < 0.12; fk++) S0.lerp(A, 0.25);
        var dd = p.clone().sub(S0).normalize(), ang = screenAng(S0, p), CLIP = SKY - 0.02;
        var big = order.indexOf(m) < 8 || last, L = (big ? 2.8 : 2.1) * sz, spear = windSpear(S0.clone(), ang, L, big ? sz : sz * 0.75, !big);
        streak(S0.clone(), p.clone(), { w: 0.08 * sz, life: FALL + c.D(0.14), tail: 0.7, col: WHITE });
        // the disc ripples and flashes where it comes through
        ringAt(S0.clone(), UPV, 0.08, 0.7 * sz, c.D(0.26), WHITE, big ? 0.35 : 0);
        E({ sys: 'norm', pos: S0.clone(), frame: 'star', color: [WHITE, PALE], size: [0.35 * sz, 1.0 * sz], ease: 1, life: 0.12, spin: 5, alpha: 0.95 });
        var next = 0, P = new T.Vector3();
        tick(function (dt) {
          tf += dt; var k = Math.min(1, tf / FALL), kk = k * k;
          // the spear's point arrives at the monster's middle: its middle travels from the gate down to there
          P.lerpVectors(S0.clone().addScaledVector(dd, -L / 2), p.clone().addScaledVector(dd, -L / 2), kk);
          var off = P.clone().sub(S0); spear.move(off, tf, 1, CLIP);
          // wind wound round the shaft, wisps streaming off its tail, sparkles shed
          var tl = spear.tailAt(), sp = spear.tipAt(); if (tl.y > CLIP) tl.lerp(sp, Math.min(1, (tl.y - CLIP) / Math.max(0.01, tl.y - sp.y)));
          for (var h = 0; h < 2; h++) { var ph = tf * 70 + h * Math.PI, hp = tl.clone().lerp(sp, 0.25 + 0.15 * h).addScaledVector(spear.n, Math.sin(ph) * 0.16 * sz);
            E({ sys: 'norm', pos: hp, vel: dd.clone().multiplyScalar(-1.5), frame: 'streak', color: [WHITE, PALE], size: [0.22 * sz, 0.03], life: 0.12, rot: Math.atan2(-dd.y, dd.x), alpha: 0.85 }); }
          if (big) for (var w2 = 0; w2 < 2; w2++) { var wv = dd.clone().multiplyScalar(-rr(2, 4)).addScaledVector(spear.n, (w2 ? 1 : -1) * rr(0.8, 1.8));
            E({ sys: 'norm', pos: tl.clone(), vel: wv, frame: 'streak', color: [WHITE, pick(SPARK)], size: [0.3 * sz, 0.03], life: rr(0.14, 0.22), drag: 2, alpha: 0.8 }); }
          E({ sys: 'norm', pos: tl.clone(), frame: 'star', color: WHITE, size: [0.16 * sz, 0.05], life: 0.04, spin: 8, alpha: 0.95 });
          E({ sys: 'norm', pos: sp.clone(), frame: 'star', color: WHITE, size: [0.3 * sz, 0.08], life: 0.04, spin: 9, alpha: 1 });
          if (Math.random() < 0.6) E({ sys: 'norm', pos: tl.clone().lerp(sp, Math.random()), vel: V(rr(-0.4, 0.4), rr(0, 0.4), 0), frame: 'dot', color: pick(SPARK), size: [0.1, 0.02], life: 0.3, alpha: 0.9 });
          if (k < 1) return false;
          if (!landed) { landed = true; thud(); }
          // it stands in the ground a moment and breaks into glitter
          var stand = 0, gone = false;
          tick(function (dt2) {
            stand += dt2; var f = Math.min(1, stand / c.D(0.14)); spear.move(off, tf + stand, 1 - f * f, CLIP);
            if (f < 1) return false;
            if (!gone) { gone = true; var a0 = spear.tailAt(), a1 = spear.tipAt();
              for (var g = 0; g < N(6, c); g++) E({ sys: 'norm', pos: a0.clone().lerp(a1, Math.random()), vel: V(rr(-0.8, 0.8), rr(0.2, 1.2), 0), frame: g % 2 ? 'star' : 'dot', color: [pick(SPARK), WHITE], size: [0.14, 0.03], life: rr(0.3, 0.5), spin: rr(-8, 8), alpha: 0.95 });
              spear.kill(); }
            return true;
          });
          return true;
        });
        // 쿵 — squashed flat, the ground rings out
        function thud() {
          if (!m.alive) { c.hit(m, 1, 1.2); return; }
          hit.push(m); c.hit(m, 1, last ? 2.0 : 1.5); windHit(m, 1.2);
          var gd = m.group && m.group.userData; if (gd && gd.sq) gd.sq.v -= m.boss ? 4.5 : 9;
          if (last) { sc.hitStop(0.1); sc.shake(0.6); if (sc.punch) sc.punch(0.12); if (sc.climax) sc.climax(0.4, c.D(0.24)); shutGate(); }
          else { sc.hitStop(0.025); sc.shake(0.14); }
          airRing(G, 0.2, 1.3 * sz, c.D(0.28), WHITE, big ? 0.5 : 0); if (last) airRing(G, 0.4, 4.5, c.D(0.36), PALE, 0.4);
          for (var q = 0, CN = N(7, c); q < CN; q++) { var ca = q / CN * 6.283 + rr(-0.2, 0.2);
            E({ sys: 'gadd', white: true, pos: V(G.x + Math.cos(ca) * 0.55 * sz, 0.04, G.z + Math.sin(ca) * 0.45 * sz), frame: 'streak', color: [WHITE, 0xcff8ff], size: [1.0 * sz, 0.2 * sz], life: c.D(0.3), rot: -ca, alpha: 0.9 }); }
          var dustC = K.dustCol ? K.dustCol() : 0xd8c8a8;
          for (var q2 = 0; q2 < N(9, c); q2++) { var da = rr(0, 6.283);
            E({ sys: 'norm', pos: V(G.x + Math.cos(da) * 0.4, 0.1, G.z + Math.sin(da) * 0.3), vel: V(Math.cos(da) * rr(2.5, 4.5) * sz, rr(0.2, 0.9), Math.sin(da) * rr(2, 3.5) * sz), frame: 'smoke', color: dustC, size: [0.35 * sz, 0.9 * sz], ease: 1, life: rr(0.35, 0.55), drag: 2.5, alpha: 0.5, fadeOut: 0.4 }); }
          for (var q3 = 0; q3 < N(6, c); q3++) { var sv = V(rr(-4, 4), rr(1.5, 4.5), rr(-1.5, 1.5));
            E({ sys: 'norm', pos: p.clone(), vel: sv, frame: 'shard', color: WHITE, size: [0.26, 0.07], life: rr(0.2, 0.3), drag: 2, spin: rr(-14, 14), alpha: 0.95 }); }
          for (var q4 = 0; q4 < N(6, c); q4++) E({ sys: 'norm', pos: p.clone().add(V(rr(-0.6, 0.6), rr(0, 0.9), 0)), vel: V(rr(-0.3, 0.3), rr(-0.9, -0.3), 0), frame: q4 % 2 ? 'star' : 'dot', color: [pick(SPARK), WHITE], size: [rr(0.12, 0.2), 0.04], life: rr(0.45, 0.7), spin: rr(-6, 6), alpha: 0.95 });
        }
      }
      // the gate flashes shut after the last
      function shutGate() {
        if (shut) return; shut = true;
        ringAt(GC.clone(), UPV, GR * 0.9, 0.1, c.D(0.18), WHITE);
        E({ sys: 'norm', pos: GC.clone(), frame: 'star', color: [WHITE, PALE], size: [0.8 * GK, 2.4 * GK], ease: 1, life: 0.16, spin: 4, alpha: 0.95 });
        for (var q = 0; q < N(10, c); q++) { var a = rr(0, 6.283); E({ sys: 'norm', pos: GC.clone().add(V(Math.cos(a) * GR * 0.8, 0, Math.sin(a) * GR * 0.7)), vel: V(-Math.cos(a) * 3 * GK, rr(-0.2, 0.4), -Math.sin(a) * 2.5 * GK), frame: 'smoke', color: WHITE, size: [0.8 * GK, 0.3 * GK], ease: 1, life: 0.3, alpha: 0.7 }); }
      }
    };

    // ---------- 4. 응축공기폭탄 (every monster, the biggest scene — 형's own idea, 2026-11-25) ----------
    // Wind gathers in front of the staff into a see-through mint cat's paw that grows, then squeezes smaller and smaller
    // (wind, dust and rings of air sucked in, brighter, trembling harder) into a ball of light that blinks once; the ball is
    // shot at the thick of the crowd, lands, and squeezes once more — a tiny paw throbbing white-hot, everything round it
    // drawn in — then 퍼엉: held beat, the blast bursts out in the shape of a paw past its size and settles (every monster under
    // it hit at once and flung, the hardest shake, a mint light over the field), three rings of air roll out after it (the
    // ones further off are hit as a ring reaches them), and a big paw print is left on the ground until the wind blows it
    // away. Monsters are not pulled in (that is 블랙홀). (2nd, 형: 작아졌다 커지면서 터지는 모습을 좀 더 임팩트 있게)
    S.airBomb = function (c) {
      var list = c.pool(); if (!list.length) return;
      c.plain = true;
      sc.heroPose('raise', c.D(0.5), c.col);
      if (!(CW.fxOff && CW.fxOff.dim)) sc.dim(0.2, c.D(1.3));
      var S0 = Math.min(1.6, c.s) * 0.6;   // the gathered paw's half-width
      var GROW = c.D(0.28), SHRINK = c.D(0.27), FLY = c.D(0.15), T1 = GROW, T2 = GROW + SHRINK, T3 = T2 + FLY;
      var tip = sc.heroTip(), aim = crowdCentre(list), dir = V(aim.x - tip.x, 0, aim.z - tip.z);
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1); dir.normalize();
      var home = V(tip.x + dir.x * 0.5, tip.y + 1.5, tip.z + dir.z * 0.5);
      var paw = pawPlane(false, 6.5), t = 0, ball = new T.Vector3(), G = null, landed = false, ringT = 0;
      // the wind it is made of: streaks curving in from all round
      for (var i = 0; i < N(10, c); i++) {
        var a = rr(0, 6.283), d = rr(2.0, 3.0) * S0;
        streak(V(home.x + Math.cos(a) * d, home.y + Math.sin(a) * d * 0.6, home.z + rr(-0.4, 0.4)), home.clone(),
          { w: rr(0.07, 0.14), life: c.D(0.32), delay: c.D(rr(0, 0.18)), bend: V(rr(-0.7, 0.7), rr(-0.4, 0.4), 0), tail: 0.5 });
      }
      // a ring of air closing in on p (from wide to nothing)
      function inRing(p, r, life) { E({ sys: 'norm', pos: p.clone(), frame: 'ring', color: PALE, size: [r * 2, r * 0.15], ease: 2, life: life, alpha: 0.85 }); }
      // streaks of wind drawn into p from about r away
      function sucked(p, r, n) {
        for (var q = 0; q < n; q++) {
          var a2 = rr(0, 6.283), d2 = rr(0.8, 1.3) * r, from = V(p.x + Math.cos(a2) * d2, p.y + Math.sin(a2) * d2 * 0.7, p.z), to = V(p.x - from.x, p.y - from.y, 0);
          E({ sys: 'norm', pos: from, vel: to.clone().multiplyScalar(6.5), frame: 'streak', color: [PALE, MINT], size: [0.45, 0.05], life: 0.15, rot: Math.atan2(-to.y, to.x), alpha: 0.95 });
        }
      }
      // dust on the ground drawn in toward p (inward) or thrown out from it
      function dustRing(p, r, inward) {
        var col = K.dustCol ? K.dustCol() : 0xd8c8a8;
        for (var q = 0; q < N(inward ? 12 : 16, c); q++) {
          var a3 = rr(0, 6.283);
          if (inward) { var d3 = rr(0.7, 1) * r; E({ sys: 'norm', pos: V(p.x + Math.cos(a3) * d3, 0.08, p.z + Math.sin(a3) * d3 * 0.8), vel: V(-Math.cos(a3) * d3 * 4.5, 0.2, -Math.sin(a3) * d3 * 3.6), frame: 'smoke', color: col, size: [0.5, 0.15], life: 0.2, drag: 1, alpha: 0.55 }); }
          else E({ sys: 'norm', pos: V(p.x + Math.cos(a3) * r * 0.6, 0.1, p.z + Math.sin(a3) * r * 0.5), vel: V(Math.cos(a3) * rr(3, 6), rr(0.3, 1.2), Math.sin(a3) * rr(2, 4)), frame: 'smoke', color: col, size: [0.4, 1.1], ease: 1, life: rr(0.35, 0.6), drag: 2.5, alpha: 0.5, fadeOut: 0.4 });
        }
      }
      tick(function (dt) {
        t += dt;
        if (t < T1) { var g = ease3(t / T1); paw.set(home, S0 * (0.15 + 0.85 * g), { fill: 1.1 * g, rim: 1.0 * g, t: t, w: 0.14 }); return false; }
        if (t < T2) {
          // squeezing, faster and faster: smaller and white-hot, trembling harder, wind and rings of air drawn in
          var k = (t - T1) / SHRINK, s = S0 * (1 - 0.86 * k * k * k), j = 0.09 * k * S0;
          paw.set(V(home.x + rr(-j, j), home.y + rr(-j, j), home.z), s, { fill: 1.1 + 1.4 * k, rim: 1.0 + 2.4 * k, t: t * (1.7 + 3 * k), w: 0.14 + 0.2 * k });
          if (Math.random() < 0.8) sucked(home, S0 * 2.2, 1);
          if ((ringT -= dt) <= 0) { ringT = c.D(0.07); inRing(home, S0 * (1.6 - 0.6 * k), c.D(0.12)); }
          return false;
        }
        if (!G) {
          // squeezed into a ball of light: it blinks once and is shot at the thick of the crowd as it stands now
          var now = c.pool(), gm = now.length ? crowdCentre(now) : aim; G = V(gm.x, 0, gm.z);
          paw.kill(); sc.shake(0.18); sc.hitStop(0.04);
          E({ sys: 'norm', pos: home.clone(), frame: 'glow', color: PALE, size: [0.9, 0.3], ease: 1, life: 0.12, alpha: 0.8 });
          E({ sys: 'norm', pos: home.clone(), frame: 'star', color: [WHITE, PALE], size: [1.4, 0.2], ease: 1, life: 0.12, spin: 6, alpha: 1 });
          streak(home.clone(), V(G.x, 0.7, G.z), { w: 0.3, life: FLY + c.D(0.12), col: PALE, tail: 0.55 });
        }
        if (t < T3) {
          ball.lerpVectors(home, V(G.x, 0.7, G.z), ease((t - T2) / FLY));
          E({ sys: 'norm', pos: ball.clone(), frame: 'glow', color: PALE, size: [0.55, 0.2], life: 0.1, alpha: 0.8 });
          E({ sys: 'norm', pos: ball.clone(), frame: 'ring', color: PALE, size: [0.5, 0.9], life: 0.1, alpha: 0.7 });
          E({ sys: 'norm', pos: ball.clone(), frame: 'star', color: WHITE, size: [0.55, 0.15], life: 0.08, spin: 8, alpha: 1 });
          return false;
        }
        if (!landed) { landed = true; squeeze(G); }
        return true;
      });
      // where it lands it squeezes once more: a tiny paw throbbing white-hot, the air and dust round it drawn in
      function squeeze(G) {
        sc.shake(0.2); if (sc.punch) sc.punch(0.06);
        var tiny = pawPlane(false, 6.7), P = V(G.x, 0.85, G.z), ts = 0, HOLD = c.D(0.16), rt = 0, R0 = 0.55;
        dustRing(G, 2.2, true);
        tick(function (dt) {
          ts += dt;
          var k = Math.min(1, ts / HOLD), beat = 0.5 + 0.5 * Math.cos(k * Math.PI * 4), j = 0.04;
          tiny.set(V(P.x + rr(-j, j), P.y + rr(-j, j), P.z), R0 * (0.75 - 0.35 * k) * (0.9 + 0.2 * beat), { fill: 2.4, rim: 3.0 + 2 * beat, t: ts * 5, w: 0.3 });
          if ((rt -= dt) <= 0) { rt = c.D(0.05); inRing(P, 1.4 - 0.5 * k, c.D(0.09)); }
          if (Math.random() < 0.9) sucked(P, 1.6, 1);
          if (ts < HOLD) return false;
          tiny.kill(); boom(G); return true;
        });
      }
      function boom(G) {
        var now = c.pool();
        if (!now.length) { c.recover(); return; }
        // the paw covers the crowd round where it landed (the ones further off are struck by the rings of air)
        var R = 1.5; now.forEach(function (m) { var dd = Math.hypot(m.x - G.x, (m.z - G.z) / 0.8); if (dd < 3.2) R = Math.max(R, dd + 0.7); });
        R = Math.min(R, 3.0);
        // the beat everything lands on: held, the hardest shake, a mint light over the field
        sc.hitStop(0.12); sc.shake(0.8); if (sc.punch) sc.punch(0.16); if (sc.climax) sc.climax(0.45, c.D(0.3));
        var hit = [];
        now.forEach(function (m) { if (Math.hypot(m.x - G.x, (m.z - G.z) / 0.8) <= R) { hit.push(m); c.hit(m, 1, 3.0); windHit(m, 1.4); } });
        // the ones outside the paw are struck as the ring of air reaches them (about the speed the drawn ring rolls out), and
        // only once it has rolled past everyone do the ones that come in late get theirs (before, they were caught at once)
        K.ringHits(c, G, 40, 14, function (m) { if (hit.indexOf(m) < 0) { hit.push(m); c.hit(m, 1, 1.8); windHit(m); } },
          function () { K.lateComers(c, hit, c.D(0.3), function (m) { c.hit(m, 1, 1.4); windHit(m); }); });
        // the blast in the shape of a paw: bursting out past its size and settling, standing over the crowd and lying on the
        // ground (then the print it leaves)
        var up = pawPlane(false, 6.6), down = pawPlane(true, 2.4), tb = 0, P = V(G.x, 0.9, G.z), F = V(G.x, 0.05, G.z);
        E({ sys: 'norm', pos: V(G.x, 0.8, G.z), frame: 'star', color: [WHITE, PALE], size: [0.6, 2.2], ease: 1, life: 0.16, spin: 4, alpha: 0.95 });
        [0, 0.08].forEach(function (dl, n) { after(c.D(dl), function () { airRing(G, R * (0.6 + 0.2 * n), 8 + 2 * n, c.D(0.32 + 0.06 * n), n ? WHITE : PALE, 0.5); }); });
        chips(V(G.x, 0.6, G.z), N(28, c), 9);
        dustRing(G, R, false);
        for (var i = 0, M = N(22, c); i < M; i++) {
          var a = i / M * 6.283 + rr(-0.15, 0.15), r0 = R * 0.4, r1 = R * rr(2.0, 3.0);
          streak(V(G.x + Math.cos(a) * r0, rr(0.15, 1.0), G.z + Math.sin(a) * r0 * 0.8), V(G.x + Math.cos(a) * r1, rr(0.1, 0.7), G.z + Math.sin(a) * r1 * 0.8),
            { w: rr(0.14, 0.3), life: c.D(0.32), delay: c.D(rr(0, 0.05)), tail: 0.55 });
        }
        var OUT = c.D(0.07), SET = c.D(0.17), UPL = c.D(0.34), MARK = c.D(0.75);
        // size over time: out fast past the full size (1.2), back to it (1.0)
        function swell(x) { return x < OUT ? 0.15 + 1.0 * ease3(x / OUT) : x < SET ? 1.15 - 0.15 * ease((x - OUT) / (SET - OUT)) : 1.0; }
        tick(function (dt) {
          tb += dt;
          var sz = swell(tb);
          if (tb < UPL) { var u = Math.max(0, (tb - OUT) / (UPL - OUT)); up.set(P, Math.min(R, 2.4) * sz, { ring: 1.8 * (1 - u * 0.6), rim: 0.5 * (1 - u), fill: 0.1 * (1 - u), alpha: 1 - u * u, t: tb * 3, w: 0.1 }); }
          else up.kill();
          if (tb < SET) down.set(F, R * 1.15 * sz, { ring: 1.6, rim: 0.4, fill: 0.15, t: tb * 3, w: 0.07 });
          else if (tb < SET + MARK) {
            // the print left behind fades as the wind blows it away
            var f = (tb - SET) / MARK; down.set(F, R * 1.15 * (1 + 0.04 * f), { ring: 0.55 * (1 - f), fill: 0.03 * (1 - f), rim: 0, t: tb * 1.2, w: 0.035 });
            if (Math.random() < 0.35 * (1 - f)) { var a4 = rr(0, 6.283), rp = rr(0.2, 1.0) * R, sp = V(G.x + Math.cos(a4) * rp, 0.1, G.z + Math.sin(a4) * rp * 0.8);
              E({ sys: 'norm', pos: sp, vel: V(Math.cos(a4) * 3, 0.6, Math.sin(a4) * 2), frame: 'streak', color: [PALE, MINT], size: [0.35, 0.05], life: 0.25, rot: Math.atan2(-0.6, Math.cos(a4)), alpha: 0.7 }); }
          } else { down.kill(); return true; }
          return false;
        });
      }
    };

    // ---------- 첫 시전 멈춤 없게 (2026-11-26; the design: 새 셰이더는 형꺼에서 미리 올린다) ----------
    // three.js drops a compiled program as soon as the last material using it is disposed, and every scene here disposes its
    // materials when it ends — so each cast after a quiet spell built its programs again (a hitch, worst on a phone). One
    // material of each kind is kept here and never disposed, and they are built once for each kind of fog a region brings
    // (the program depends on it), as js/fx3d.js warm() does. The owner's game only: the 체험판 never casts these.
    var keep = null, warmed = {};
    function warm() {
      if (CW.FRIEND || !sc.renderer || !sc.renderer.compile || !sc.scene) return;
      var f = sc.scene.fog, sig = f ? (f.isFogExp2 ? 'exp2' : 'linear') : 'none';
      if (warmed[sig]) return;
      warmed[sig] = true;
      if (!keep) {
        var plane = function (fs, side, add) {
          return new T.ShaderMaterial({ vertexShader: PAW_VS, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, side: side,
            blending: add ? T.AdditiveBlending : T.NormalBlending,
            uniforms: { uT: { value: 0 }, uAlpha: { value: 0 }, uFill: { value: 0 }, uRim: { value: 0 }, uRing: { value: 0 }, uW: { value: 0.1 }, uR: { value: 0 }, uOpen: { value: 0 }, uCol: { value: new T.Color(WHITE) } } });
        };
        // (the side is part of a program: the ground rings of airRing are one-sided, ringAt's two-sided)
        keep = [ribMat(RIB_CORE, PALE, true), ribMat(RIB_EDGE, TEAL, false), bladeMat(BLADE_CORE, PALE, true), bladeMat(BLADE_EDGE, TEAL, false),
          plane(PAW_CORE, T.DoubleSide, true), plane(PAW_EDGE, T.DoubleSide, false), plane(GATE_FS, T.DoubleSide, true),
          plane(LR_FS, T.DoubleSide, true), plane(LR_FS, T.FrontSide, true)];
      }
      var held = keep.map(function (mat) { var m = new T.Mesh(PLANE, mat); m.position.set(0, -40, 0); m.frustumCulled = false; sc.scene.add(m); return m; });
      try { sc.renderer.compile(sc.scene, sc.camera); } finally { held.forEach(function (m) { sc.scene.remove(m); }); }
    }
    warm();

    return { clear: function () { live.slice().forEach(kill); }, warm: warm, streak: streak, airRing: airRing, chips: chips, windHit: windHit, crowdCentre: crowdCentre };
  };
})(this);
