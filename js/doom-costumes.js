// 멸망 코스튬 2차 (2026-11-23, 코덱스 원화 art-src/ai-review/2026-11-23-doom-costumes, 인계서 docs 설계/doom-costume-claude-handoff).
// 아직 상품이 아니다: 가격·능력치·친구판 공개 조건이 정해지지 않아 data.js 코스튬 목록에 넣지 않았고, 저장도 건드리지 않는다.
// 로컬 미리보기에서만 입는다: index.html?doomcos=bell  (main.js, localhost 전용) · dev/doom-costume.html
// 한 벌마다 대기 모습(fx.parts — fx.js quietParticle)과 한 번 터지는 순간(act — 아래 CW.fxDoomCos)을 따로 둔다.
// 순간 효과는 그림일 뿐이다: 몬스터 상태·피해·소리를 바꾸지 않는다.
(function (root) {
  var CW = root.CW = root.CW || {};
  CW.DOOM_COSTUMES = {
    bell: { id: 'doomBell', name: '검은 종의 파수꾼', art: 'cos19', outfit: null, act: 'bell',
      // tip: 정면 그림에서 종추 머리 한가운데 · chain: 정면 그림에서 종추를 떼어 낼 때 사슬이 끊기는 자리 (왼쪽에서, 발에서 — 0..1)
      fx: { col: 0xc08a4a, col2: 0xffe6b8, aura: 0.3, glow: 0.05, parts: 'bell', rate: 1.2, chain: [0.277, 0.727], tip: [0.136, 0.671], sheen: { rim: 0.22, sweep: 0.4, glint: 0.5, period: 5.2 } } }
  };

  // 나머지 아홉 벌 (2026-11-23): 평소에는 네 방향 그림(cos20~28-v0..v3, js/rig.js DOOM_RIGS), 발동하면 정면으로 돌아서
  // 코덱스가 그린 3컷(시작 → 가장 강한 순간 → 끝, art/cosNN-a1..a3.webp)이 차례로 바뀌고, 그 위에 움직이는 효과를 얹는다.
  // act.fit: 3컷 그림의 크기·가운데 (주인공 키 단위, x는 발 가운데에서, y는 발에서) — tools/doom-meta.py로 정면 그림에 맞춤
  // act.t: 세 컷을 보여 주는 시간(초) · 효과 자리는 정면 그림의 (u 왼쪽→오른쪽, v 발→머리) 0..1 — tools/doom-grid.py 눈금으로 잼
  // at: 컷이 바뀔 때 번져 나오기 시작하는 자리 (정면 그림의 u, v)
  function doom(key, id, name, art, label, desc, fx, fit, t, at) {
    fx.aura = 0.3; fx.glow = 0.05; fx.sheen = fx.sheen || { rim: 0.22, sweep: 0.4, glint: 0.5, period: 5 };
    fx.act = { art: art, fit: fit, t: t || [0.5, 0.85, 0.7], at: at };
    CW.DOOM_COSTUMES[key] = { id: id, name: name, art: art, outfit: null, act: key, label: label, desc: desc, fx: fx };
  }
  CW.DOOM_COSTUMES.bell.label = '종추 내려치기';
  CW.DOOM_COSTUMES.bell.desc = '종추를 내려치면 발밑 그림자가 검은 판처럼 갈라져 튀고 가라앉아요';
  doom('diver', 'doomDiver', '침몰선의 잠수사', 'cos20', '잠수창 열기', '잠수창의 눈이 켜지면 바닷물과 뱀장어가 창 안으로 빨려 들어요',
    { col: 0x3fd8c0, col2: 0xbff8ee, parts: 'drip', rate: 1.4 }, { w: 1.1189, h: 1.145, x: 0.0007, y: 0.4802 }, [0.55, 0.95, 0.75], [0.53, 0.77]);
  doom('puppet', 'doomPuppet', '무너진 극장의 인형사', 'cos21', '가면 뜯기', '붉은 실이 당겨지면 도자기 가면이 뜯기고 안쪽의 웃음이 드러나요',
    { col: 0xb0102e, col2: 0xffc0c8, parts: 'thread', rate: 1.2 }, { w: 1.0703, h: 1.0952, x: 0.0135, y: 0.4889 }, [0.55, 0.85, 0.85], [0.36, 0.64]);
  doom('potter', 'doomPotter', '금간 대지의 도공', 'cos22', '소매 터뜨리기', '검은 소매가 터지며 하얗게 달아오른 속이 드러나요',
    { col: 0xffb060, col2: 0xfff0d0, parts: 'cinder', rate: 1.6 }, { w: 1.1351, h: 1.1616, x: 0.0304, y: 0.4881 }, [0.5, 0.85, 0.8], [0.67, 0.43]);
  doom('binder', 'doomBinder', '마지막 장의 제본사', 'cos23', '책 투구로 물기', '책 투구가 턱처럼 벌어져 먹귀를 물고 책장에 눌러 찍어요',
    { col: 0xd9c39a, col2: 0xffffff, parts: 'page', rate: 1.2 }, { w: 1.1027, h: 1.1284, x: -0.0135, y: 0.4831 }, [0.6, 0.8, 0.8], [0.5, 0.78]);
  doom('tailor', 'doomTailor', '백야를 삼킨 재단사', 'cos24', '그림자 솔기 뜯기', '흰 봉합실을 당기면 그림자의 솔기가 한 땀씩 뜯겨 벌어져요',
    { col: 0xf0e8d8, col2: 0xffffff, parts: 'lint', rate: 1.3 }, { w: 1.0703, h: 1.0952, x: -0.0189, y: 0.4835 }, [0.55, 0.85, 0.8], [0.5, 0.5]);
  doom('conductor', 'doomConductor', '마지막 열차의 차장', 'cos25', '붉은 선로 내리기', '레버를 내리면 평행한 붉은 선로가 달려 나가 유령 그림자를 갈라요',
    { col: 0xff2a2a, col2: 0xffb0a0, parts: 'signal', rate: 1.3 }, { w: 1.1514, h: 1.1782, x: 0.0061, y: 0.4474 }, [0.55, 0.95, 0.75], [0.5, 0.48]);
  doom('pilgrim', 'doomPilgrim', '말라붙은 바다의 순례자', 'cos26', '소금으로 바스러뜨리기', '지팡이가 유령 물고기의 물기를 끌어내 꼬리부터 소금뼈로 바스러뜨려요',
    { col: 0xe8f0ff, col2: 0xffffff, parts: 'salt', rate: 1.4 }, { w: 1.0865, h: 1.1118, x: 0.0378, y: 0.4806 }, [0.6, 0.9, 0.8], [0.8, 0.62]);
  doom('surveyor', 'doomSurveyor', '지워진 왕국의 측량사', 'cos27', '땅 접기', '발밑에 등고선이 그려지고 땅이 지도처럼 접혀 그림자를 가둬요',
    { col: 0xd8a84a, col2: 0xfff0c0, parts: 'gold', rate: 1.4 }, { w: 1.3784, h: 1.4105, x: -0.0108, y: 0.3474 }, [0.6, 0.95, 0.8], [0.45, 0.04]);
  doom('projector', 'doomProjector', '최후의 영사기사', 'cos28', '마지막 필름 칸', '렌즈가 필름을 비추면 마지막 칸에서 긴 발톱의 귀신이 기어 나와요',
    { col: 0xffe2a8, col2: 0xffffff, parts: 'film', rate: 1.3 }, { w: 1.0541, h: 1.0786, x: 0.0764, y: 0.4864 }, [0.6, 0.9, 0.8], [0.5, 0.74]);

  // 상품 목록(DATA.looks, js/data.js — 서버 지갑도 읽는 파일이라 그림 정보는 여기 둔다)에 모습·발동 효과·발동 이름을 붙인다
  (function () {
    var L = CW.DATA && CW.DATA.looks; if (!L) return;
    Object.keys(CW.DOOM_COSTUMES).forEach(function (k) { var d = CW.DOOM_COSTUMES[k]; L.forEach(function (l) { if (l.id === d.id) { l.fx = d.fx; l.act = k; l.label = d.label; } }); });
  })();

  CW.fxDoomCos = function (K) {
    var T = K.T, sc = K.sc, V = K.V, rr = K.rr, E = K.E, N = K.N, after = K.after, tick = K.tick;
    var busy = false, run = 0;

    // ---- 검은 종의 파수꾼 (2026-11-23 형: 판이 탁 튀어 오르는 건 이상하다 → 가운데를 둥글게) ----
    // 종추가 닿으면 발밑 그림자가 둥근 검은 웅덩이로 넓어지고, 그 안에 금이 가운데에서 바깥으로 쫙 번진다.
    // 금은 하얗게 달았다가 청동색으로 식고, 웅덩이는 다시 평소 그림자 크기로 줄어든다. 테두리에서 검은 부스러기 몇 개만 튄다.
    var R0 = 0.23, pool = null, chain = null;
    // 금 그림: 가운데에서 뻗는 굵은 금 11줄(가지를 친다) + 반쯤 끊긴 둥근 금. 흰색으로 그려 두고 재질 색으로 물들인다.
    function crackTex() {
      var S = 512, c = S / 2, cv = document.createElement('canvas'); cv.width = cv.height = S;
      var g = cv.getContext('2d'), segs = [];
      function crack(x, y, a, len, w, depth) {
        var st = 13, n = Math.max(3, Math.round(len / st));
        for (var i = 0; i < n; i++) {
          a += rr(-0.36, 0.36); var nx = x + Math.cos(a) * st, ny = y + Math.sin(a) * st;
          if ((nx - c) * (nx - c) + (ny - c) * (ny - c) > (c - 10) * (c - 10)) break;
          segs.push([x, y, nx, ny, Math.max(1.2, w * (1 - 0.8 * i / n))]);
          if (depth < 2 && i > 1 && Math.random() < 0.17) crack(nx, ny, a + (Math.random() < 0.5 ? 1 : -1) * rr(0.45, 0.95), (n - i) * st * rr(0.3, 0.55), w * (1 - i / n) * 0.65, depth + 1);
          x = nx; y = ny;
        }
      }
      var M = 11, a0 = rr(0, 6.28);
      for (var i = 0; i < M; i++) { var a = a0 + (i + rr(-0.3, 0.3)) / M * 6.283; crack(c + Math.cos(a) * 6, c + Math.sin(a) * 6, a, c * rr(0.72, 0.95), rr(3.6, 5.4), 0); }
      var rr0 = c * rr(0.46, 0.56), aa = rr(0, 6.28);
      for (var k = 0; k < 44; k++) { if (Math.random() < 0.35) continue; var b0 = aa + k / 44 * 6.283, b1 = b0 + 6.283 / 44, r1 = rr0 + rr(-6, 6), r2 = rr0 + rr(-6, 6); segs.push([c + Math.cos(b0) * r1, c + Math.sin(b0) * r1, c + Math.cos(b1) * r2, c + Math.sin(b1) * r2, rr(2, 3.5)]); }
      g.lineCap = 'round'; g.lineJoin = 'round';
      [[3, 'rgba(255,255,255,0.12)'], [1.7, 'rgba(255,255,255,0.3)'], [1, '#ffffff']].forEach(function (L) {
        g.strokeStyle = L[1]; segs.forEach(function (s) { g.lineWidth = s[4] * L[0]; g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.stroke(); });
      });
      var t = new T.CanvasTexture(cv); if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; return t;
    }
    // 웅덩이 그림: 가운데는 짙고 가장자리만 부드럽게 흐려지는 동그라미
    function poolTex() {
      var S = 256, c = S / 2, cv = document.createElement('canvas'); cv.width = cv.height = S; var g = cv.getContext('2d');
      var gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(4,3,6,1)'); gr.addColorStop(0.7, 'rgba(6,5,8,0.96)'); gr.addColorStop(0.86, 'rgba(10,8,10,0.7)'); gr.addColorStop(1, 'rgba(10,8,10,0)');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      var t = new T.CanvasTexture(cv); if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; return t;
    }
    function flat(tex, order) {
      var m = new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = order; m.visible = false; sc.fxGroup.add(m); return m;
    }
    function buildPool() {
      pool = { disc: flat(poolTex(), 1), crack: flat(crackTex(), 2), glow: flat(crackTex(), 2) };
      pool.glow.material.blending = T.AdditiveBlending;
      // 사슬: 종추를 휘두르는 동안 몸에 남은 사슬 끝과 종추 고리 쪽 끝을 잇는 고리 12마디 (그리기 1번)
      var CN = 12, cp = new Float32Array(CN * 18), cc = new Float32Array(CN * 18), c1 = new T.Color(0x6a4c30), c2 = new T.Color(0x3a2a1c); c1.convertSRGBToLinear(); c2.convertSRGBToLinear();
      for (var i = 0; i < CN * 6; i++) { var c = (Math.floor(i / 6) % 2) ? c1 : c2; cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b; }
      var cg = new T.BufferGeometry(); cg.setAttribute('position', new T.BufferAttribute(cp, 3)); cg.setAttribute('color', new T.BufferAttribute(cc, 3));
      var cm = new T.Mesh(cg, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, depthTest: false, transparent: true }));
      cm.frustumCulled = false; cm.renderOrder = 5; cm.visible = false; sc.fxGroup.add(cm);
      chain = { mesh: cm, pos: cp, n: CN };
    }
    // ---- 납작한 조각 (도자기·종이·소금·필름·검은 부스러기): 뒤집히며 떨어지고 바닥에서 한 번 튀었다 사라진다. 모두 그리기 1번 ----
    var CH = null;
    function chips(p, n, o) {
      if (!CH) {
        var MX = 96, pos = new Float32Array(MX * 18), col = new Float32Array(MX * 18), geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
        var mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
        mesh.frustumCulled = false; mesh.renderOrder = 6; sc.fxGroup.add(mesh);
        CH = { mesh: mesh, pos: pos, col: col, MX: MX, list: [], next: 0, on: false };
      }
      var c1 = new T.Color(o.col[0]).convertSRGBToLinear(), c2 = new T.Color(o.col[1] === undefined ? o.col[0] : o.col[1]).convertSRGBToLinear(), d = o.D || V(1, 0, 0);
      for (var i = 0; i < (n ? N(n) : 0); i++) {
        var slot = CH.next; CH.next = (CH.next + 1) % CH.MX;
        CH.list = CH.list.filter(function (q) { return q.slot !== slot; });
        var a = rr(o.a0 === undefined ? 0 : o.a0, o.a1 === undefined ? 6.283 : o.a1), sp = rr(o.s0 || 0.6, o.s1 || 1.6), sz = rr(0.6, 1.2) * (o.size || 0.06), q = [];
        for (var k = 0; k < 4; k++) { var aa = k * 1.571 + rr(-0.45, 0.45), rd = sz * rr(0.5, 1.1); q.push([Math.cos(aa) * rd, Math.sin(aa) * rd]); }
        var cc = c1.clone().lerp(c2, Math.random()), sh = rr(0.75, 1.1);
        for (var v = 0; v < 6; v++) { var b = (slot * 6 + v) * 3; CH.col[b] = cc.r * sh; CH.col[b + 1] = cc.g * sh; CH.col[b + 2] = cc.b * sh; }
        CH.list.push({ slot: slot, q: q, ax: V(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(), w: rr(-1, 1) * (o.spin || 10), ang: rr(0, 6.28),
          p: p.clone().add(V(rr(-0.03, 0.03), rr(-0.03, 0.03), rr(-0.03, 0.03))), v: V(d.x * Math.cos(a) * sp, Math.sin(a) * sp + (o.up || 0), d.z * Math.cos(a) * sp + rr(-0.25, 0.25)),
          t: 0, life: rr(o.l0 || 0.6, o.l1 || 1.0), g: o.grav === undefined ? 6 : o.grav, floor: o.floor === undefined ? 0.03 : o.floor });
      }
      CH.mesh.geometry.attributes.color.needsUpdate = true;
      if (!CH.on) { CH.on = true; tick(chipTick); }
    }
    function chipTick(dt) {
      if (!CH.on) return true;
      var pos = CH.pos, alive = [];
      CH.list.forEach(function (c) {
        c.t += dt; var k = c.t / c.life, base = c.slot * 18, j;
        if (k >= 1) { for (j = 0; j < 18; j++) pos[base + j] = 0; return; }
        c.v.y -= c.g * dt; c.p.addScaledVector(c.v, dt);
        if (c.p.y < c.floor && c.v.y < 0) { c.p.y = c.floor; c.v.y *= -0.25; c.v.x *= 0.45; c.v.z *= 0.45; c.w *= 0.35; }
        c.ang += c.w * dt;
        var s = k > 0.72 ? Math.max(0, 1 - (k - 0.72) / 0.28) : 1, cs = Math.cos(c.ang), sn = Math.sin(c.ang), ax = c.ax, P = c.p;
        var pts = c.q.map(function (q2) { var x = q2[0] * s, y = q2[1] * s, dot = ax.x * x + ax.y * y;
          return [x * cs - ax.z * y * sn + ax.x * dot * (1 - cs) + P.x, y * cs + ax.z * x * sn + ax.y * dot * (1 - cs) + P.y, (ax.x * y - ax.y * x) * sn + ax.z * dot * (1 - cs) + P.z]; });
        [0, 1, 2, 0, 2, 3].forEach(function (m, i2) { pos[base + i2 * 3] = pts[m][0]; pos[base + i2 * 3 + 1] = pts[m][1]; pos[base + i2 * 3 + 2] = pts[m][2]; });
        alive.push(c);
      });
      CH.list = alive; CH.mesh.geometry.attributes.position.needsUpdate = true;
      if (!alive.length) { CH.on = false; return true; }
      return false;
    }
    // 사슬을 a에서 b까지 늘어뜨려 그린다 (가운데가 처진다). 두 끝이 붙어 있으면 그리지 않는다.
    var camDir = null;
    function drawChain(a, b) {
      var dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 0.035) { chain.mesh.visible = false; return; }
      camDir = camDir || new T.Vector3(); sc.camera.getWorldDirection(camDir);
      var n = chain.n, pos = chain.pos, sag = Math.min(0.16, 0.05 + len * 0.22), w = 0.017, k = 0, px, py, pz;
      function at(t) { var s = Math.sin(t * Math.PI) * sag; return [a.x + dx * t, a.y + dy * t - s, a.z + dz * t]; }
      var p0 = at(0);
      for (var i = 0; i < n; i++) {
        var p1 = at((i + 1) / n), sx = p1[0] - p0[0], sy = p1[1] - p0[1], sz = p1[2] - p0[2];
        // 옆으로 벌릴 방향: 마디 방향 × 보는 방향
        px = sy * camDir.z - sz * camDir.y; py = sz * camDir.x - sx * camDir.z; pz = sx * camDir.y - sy * camDir.x;
        var pl = Math.sqrt(px * px + py * py + pz * pz) || 1, ww = w * (i % 2 ? 1 : 0.6); px *= ww / pl; py *= ww / pl; pz *= ww / pl;
        var q = [[p0[0] - px, p0[1] - py, p0[2] - pz], [p0[0] + px, p0[1] + py, p0[2] + pz], [p1[0] + px, p1[1] + py, p1[2] + pz], [p1[0] - px, p1[1] - py, p1[2] - pz]];
        [0, 1, 2, 0, 2, 3].forEach(function (m) { pos[k++] = q[m][0]; pos[k++] = q[m][1]; pos[k++] = q[m][2]; });
        p0 = p1;
      }
      chain.mesh.geometry.attributes.position.needsUpdate = true; chain.mesh.visible = true;
    }
    // 청동 파문 (코덱스 2026-11-23): 빛을 더하지 않는 일반 합성 — 어두운 갈색 테두리(#433a34) 안에 붉은 청동(#906c5c). 밝은 풀밭에서 노랗게 뜨지 않는다.
    function ripple(x, z, r, life) {
      E({ sys: 'gnorm', pos: V(x, 0.03, z), frame: 'shock', color: 0x433a34, size: [r * 0.12, r * 1.06], ease: 1, life: life, fadeOut: 0.3, rot: 0, alpha: 0.85 });
      E({ sys: 'gnorm', pos: V(x, 0.034, z), frame: 'ring', color: 0x906c5c, size: [r * 0.1, r], ease: 1, life: life, fadeOut: 0.3, rot: 0, alpha: 0.95 });
    }
    function dustAt(x, z, s) { E({ sys: 'norm', pos: V(x, 0.06, z), vel: V(rr(-0.25, 0.25), rr(0.25, 0.6), 0), frame: 'smoke', color: [0x17131a, 0x08070a], size: [0.14 * s, 0.42 * s], alpha: 0.45, life: rr(0.45, 0.7), fadeIn: 0.08, white: true }); }
    function bell(cf) {
      if (!pool) buildPool();
      var my = ++run, ANT = 0.55, HIT = ANT + 0.12, HOLD = HIT + 0.75;
      sc.heroFront(HOLD); sc.heroPose('toll', ANT, 0xc08a4a);
      // 휘두르는 동안 사슬을 이어 그린다
      var ct = 0;
      if (cf && cf.chain) tick(function (dt) {
        if (my !== run) return true; ct += dt;
        if (ct > HOLD) { chain.mesh.visible = false; return true; }
        drawChain(sc.heroPart(cf.chain[0], cf.chain[1], false), sc.heroPart(cf.chain[0], cf.chain[1], true));
        return false;
      });
      // 들어 올리는 동안: 종추 머리 쪽으로 청동빛이 모인다
      var t0 = 0;
      tick(function (dt) {
        if (my !== run) return true; t0 += dt; if (t0 > ANT) return true;
        if (cf && cf.chain && Math.random() < dt * 22) { var tp = sc.heroPart(cf.chain[0] - 0.12, cf.chain[1], true), a = rr(0, 6.28), r = rr(0.25, 0.4); E({ pos: V(tp.x + Math.cos(a) * r, tp.y + Math.sin(a) * r, tp.z), vel: V(-Math.cos(a) * r * 3, -Math.sin(a) * r * 3, 0), frame: 'dot', color: [0xffe6b8, 0xc08a4a], size: [0.07, 0.02], life: 0.3, alpha: 0.9 }); }
        return false;
      });
      after(HIT, function () {
        if (my !== run) return;
        var H = sc.heroState(), tp = cf && cf.tip ? sc.heroPart(cf.tip[0], cf.tip[1], true) : V(H.x + 0.42, 0, H.z);
        // 종추 머리가 실제로 닿은 쪽 바닥 (캐릭터에서 너무 멀어지지 않게)
        var ox = Math.max(-0.5, Math.min(0.5, tp.x - H.x)), ix = H.x + ox, iz = H.z + 0.12, cx = H.x + ox * 0.38, cz = H.z + 0.05;
        // 청동 파문 세 겹: 종추가 닿은 자리에서 번진다
        [0, 0.13, 0.28].forEach(function (d, i) { after(d, function () { if (my !== run) return; ripple(ix, iz, 1.1 + i * 0.55, 0.6 + i * 0.12); }); });
        // 타격감: 화면이 크게 흔들리고 아주 잠깐 멈칫, 청동빛이 번쩍
        sc.shake(0.42); sc.punch(0.1); if (sc.light) sc.light(V(ix, 0.5, iz), 0xffa040, 2.2, 0.45); sc.flash('rgba(255,170,90,0.12)', 0.12); if (sc.heroGlow) sc.heroGlow(0xffa040, 0.8);
        E({ pos: V(ix, 0.14, iz + 0.05), frame: 'flare', color: [0xffffff, 0xffb060], size: [1.1, 0.25], ease: 1, life: 0.26, alpha: 1 });
        E({ pos: V(ix, 0.1, iz + 0.05), frame: 'star', color: [0xffffff, 0xd88a40], size: [0.25, 0.9], life: 0.2, alpha: 0.9, spin: 3 });
        E({ sys: 'gadd', pos: V(ix, 0.04, iz), frame: 'glow', color: [0xffd8a0, 0x8a4a1a], size: [0.6, 2.2], life: 0.45, alpha: 0.9, fadeOut: 0.6, rot: 0 });
        E({ sys: 'gnorm', pos: V(ix, 0.036, iz), frame: 'shock', color: 0x2a2018, size: [0.3, 3.2], ease: 1, life: 0.32, alpha: 0.75, fadeOut: 0.3, rot: 0 });
        // 불꽃과 파편: 위로 크게 튄다
        for (var s = 0; s < N(16); s++) E({ pos: V(ix, 0.08, iz), vel: V(rr(-2.4, 2.4), rr(1.8, 4.2), rr(-1.2, 1.2)), frame: 'dot', color: [0xffffff, 0xd88a40], size: [0.09, 0.02], life: rr(0.35, 0.7), grav: 9 });
        chips(V(ix, 0.08, iz), 16, { a0: 0.5, a1: 2.6, s0: 1.4, s1: 3.4, up: 0.8, col: [0x0c0a0c, 0x4a3420], size: 0.06, grav: 9, spin: 14, l0: 0.7, l1: 1.1 });
        // 땅을 따라 둥글게 밀려 나가는 흙먼지 고리
        for (var dq = 0; dq < N(16); dq++) { var da = dq / 16 * 6.283 + rr(-0.15, 0.15), dsp = rr(1.6, 2.6);
          E({ sys: 'norm', pos: V(ix + Math.cos(da) * 0.25, 0.08, iz + Math.sin(da) * 0.2), vel: V(Math.cos(da) * dsp, rr(0.2, 0.6), Math.sin(da) * dsp * 0.7), frame: 'smoke', color: [0x3a3028, 0x1a1612], size: [0.22, 0.75], alpha: 0.55, life: rr(0.55, 0.85), drag: 2.6, fadeIn: 0.04, white: true }); }
        // 둥근 웅덩이: 그림자가 넓어지며 짙어짐 → 금이 가운데에서 바깥으로 번짐(하얗게 달았다가 청동색으로 식음) → 다시 그림자 크기로
        sc.heroShadow(false);
        var RP = 0.6, t = 0, D = pool.disc, Ck = pool.crack, Gl = pool.glow, rot = rr(0, 6.28), hot = new T.Color(0xffe8c0).convertSRGBToLinear(), warm = new T.Color(0xc07030).convertSRGBToLinear(), cold = new T.Color(0x4a2c14).convertSRGBToLinear();
        cx = H.x; cz = H.z + 0.04;   // 웅덩이는 발 가운데
        [D, Ck, Gl].forEach(function (m) { m.position.set(cx, m === D ? 0.02 : 0.024, cz); m.rotation.z = rot; m.visible = true; m.scale.setScalar(0.001); });
        // 테두리에서 검은 부스러기 몇 개와 먼지
        after(0.08, function () {
          if (my !== run) return;
          for (var q = 0; q < N(7); q++) { var a = rr(0, 6.28); chips(V(cx + Math.cos(a) * RP * 0.85, 0.05, cz + Math.sin(a) * RP * 0.85), 1, { D: V(Math.cos(a), 0, Math.sin(a)), a0: 0.9, a1: 1.3, s0: 0.5, s1: 1.1, col: [0x0a090c, 0x1a1418], size: 0.045, grav: 8, spin: 12, l0: 0.5, l1: 0.8 }); }
          for (var q2 = 0; q2 < N(5); q2++) { var a2 = rr(0, 6.28); dustAt(cx + Math.cos(a2) * RP * 0.9, cz + Math.sin(a2) * RP * 0.9, 1.2); }
        });
        tick(function (dt) {
          if (my !== run) return true;
          t += dt;
          var grow = Math.min(1, t / 0.08), shrink = Math.max(0, Math.min(1, (t - 0.95) / 0.4)), over = 1 + 0.16 * Math.sin(Math.min(1, t / 0.32) * Math.PI) * Math.exp(-t * 3), R = R0 + (RP - R0) * (1 - Math.pow(1 - grow, 3)) * over * (1 - shrink * shrink * (3 - 2 * shrink));
          var HN = sc.heroPart(0.5, 0, false, 0); [D, Ck, Gl].forEach(function (m) { m.position.x = HN.x; m.position.z = HN.z + 0.04; });   // 그림자니까 주인공 발밑을 따라간다
          D.scale.setScalar(R); D.material.opacity = 0.25 + 0.75 * Math.min(1, t / 0.06) * (1 - shrink);
          // 금: 0.02초부터 0.14초 동안 가운데에서 바깥으로 퍼진다
          var sp = Math.max(0, Math.min(1, (t - 0.02) / 0.14)), cr = R * (0.2 + 0.8 * (1 - Math.pow(1 - sp, 2)));
          Ck.scale.setScalar(Math.max(0.001, cr)); Gl.scale.setScalar(Math.max(0.001, cr * 1.02));
          var heat = Math.min(1, t / 0.35), cool = Math.max(0, Math.min(1, (t - 0.35) / 0.5));
          Ck.material.color.copy(hot).lerp(warm, heat).lerp(cold, cool);
          Ck.material.opacity = (t < 0.02 ? 0 : 1) * (1 - Math.max(0, Math.min(1, (t - 0.8) / 0.35)));
          Gl.material.color.setHex(0xff9a40).convertSRGBToLinear(); Gl.material.opacity = sp > 0 ? Math.max(0, 1 - t / 0.5) : 0;
          if (t < 1.35) return false;
          D.visible = Ck.visible = Gl.visible = false; sc.heroShadow(true); busy = false; return true;
        });
      });
    }
    // ---------- 나머지 아홉 벌: 그려진 3컷 + 움직이는 효과 ----------
    var FR = {};   // art → { tex: [3], ready }
    // 옷을 입는 순간 미리 준비해 둔다 (2026-11-23 발열 측정: 첫 발동 때 그림 풀기·그래픽카드에 올리기·재질 준비가 한꺼번에 몰려
    // 0.2~0.5초 멈칫했다) — 3컷 그림을 받아 바로 올려 두고, 번지기 재질은 안 보이게 한 번 그려 준비, 파수꾼 웅덩이·금 그림과 조각 묶음도 미리 만든다
    function upload(tx) { try { if (sc.renderer && sc.renderer.initTexture) sc.renderer.initTexture(tx); } catch (e) { } }
    function prepare(f) {
      if (!f || !(f.act || f.parts === 'bell')) return;
      if (!CH) chips(V(0, -50, 0), 0, { col: [0] });
      if (f.parts === 'bell') { if (!pool) buildPool(); [pool.disc, pool.crack, pool.glow].forEach(function (m) { upload(m.material.map); }); return; }
      var A = f.act; if (FR[A.art]) return;
      var e = FR[A.art] = { tex: [], n: 0, ready: false }, L = new T.TextureLoader(), base = CW.ART_BASE || 'art/';
      [1, 2, 3].forEach(function (i) {
        e.tex[i - 1] = L.load(base + A.art + '-a' + i + '.webp', function (tx) {
          upload(tx);
          if (++e.n < 3) return;
          e.ready = true;
          // 번지기 재질을 한 번 그려서 준비시킨다 (보이지 않게 아주 작게, 발 아래 멀리)
          if (busy) return;
          [0, 1].forEach(function (sl) { var m = sc.heroActPic(sl, { tex: e.tex[sl], w: 0.001, h: 0.001, x: 0, y: -50 }); if (m) { m.material.opacity = 0; m.userData.hide = false; } });
          after(0.15, function () { if (!busy) { sc.heroActPic(0, null); sc.heroActPic(1, null); } });
        }, undefined, function () { delete FR[A.art]; });
        e.tex[i - 1].minFilter = T.LinearMipmapLinearFilter;
      });
    }
    // 정면 그림의 (u, v) 자리를 실제 공간으로 (주인공이 뒤집혀 있으면 같이 뒤집힌다). D: 그림의 오른쪽, Nn: 바닥에서 그와 직각
    function mkCtx(my) {
      var a = sc.heroPart(0, 0.5, false), b = sc.heroPart(1, 0.5, false), D = V(b.x - a.x, 0, b.z - a.z), l = D.length() || 1; D.multiplyScalar(1 / l);
      // 그림 면 바로 위 (카메라 쪽으로 조금만 — 많이 당기면 화면에서 아래로 밀려 보인다)
      return { P: function (u, v) { return sc.heroPart(u, v, false, 0.03); }, G: function (u, h) { var p = sc.heroPart(u, 0, false, 0.03); p.y = h || 0.03; return p; },
        D: D, Nn: V(-D.z, 0, D.x), live: function () { return my === run; },
        at: function (t, fn) { after(t, function () { if (my === run) fn(); }); } };
    }
    function flip(key, cf) {
      var A = cf.act, my = ++run, fr = FR[A.art];
      if (!fr || !fr.ready) { prepare(cf); busy = false; return false; }
      var t1 = A.t[0], t2 = t1 + A.t[1], t3 = t2 + A.t[2], tEnd = t3 + 0.32, t = 0, step = 0, g = GARN[key] || {}, c = mkCtx(my);
      // 번지는 경계 빛: 옷 색을 조금 눌러서(밝은 옷은 하얀 얼룩처럼 보이지 않게), 원래 몸 ↔ 컷 사이는 더 옅게
      var hot = new T.Color(cf.col).multiplyScalar(0.7).getHex(), dim = new T.Color(cf.col).multiplyScalar(0.22).getHex();
      function pic(i, rv, soft) { return { tex: fr.tex[i], w: A.fit.w, h: A.fit.h, x: A.fit.x, y: A.fit.y, at: A.at || [0.5, 0.5], edge: soft ? dim : hot, reveal: rv }; }
      function ease(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }
      sc.heroFront(tEnd + 0.1);
      // 시작: 몸 그림 위로 첫 컷이 발밑에서부터 번져 올라온다(그동안 몸이 비쳐 보인다)
      var L0 = sc.heroActPic(0, pic(0, 0, true)), L1 = null, R1 = 0.18, R2 = 0.3, R3 = 0.3;
      L0.material.uniforms.uCenter.value.set(0.5, 0.15); L0.userData.hide = false;
      if (g.start) g.start(c, t1);
      tick(function (dt) {
        if (my !== run) return true;
        t += dt;
        var breath = 0.006 * Math.sin(t * 7);
        if (step === 0) {                                   // 시작 컷: 살짝 웅크렸다가
          L0.material.uniforms.uReveal.value = ease(t / R1); if (t >= R1) L0.userData.hide = true;
          L0.userData.k = 1 - 0.03 * Math.sin(Math.min(1, t / t1) * Math.PI * 0.5) + breath;
          if (t >= t1) { step = 1; L1 = sc.heroActPic(1, pic(1, 0)); L1.userData.k = 1.06; sc.shake(g.shake || 0.12); if (g.peak) g.peak(c, t2 - t1); }
        } else if (step === 1) {                            // 가장 강한 순간: 효과 자리에서 번져 나오며 확 커졌다가 제자리로
          var u = t - t1;
          L1.material.uniforms.uReveal.value = ease(u / R2);
          L1.userData.k = 1 + 0.06 * Math.pow(Math.max(0, 1 - u / 0.3), 2) + 0.01 * Math.sin(u * 26) * Math.exp(-u * 5) + breath;
          if (u > R2) L0.visible = false;
          if (t >= t2) { step = 2; L0 = sc.heroActPic(0, pic(2, 1)); L1.material.uniforms.uEdge.value.setHex(dim); if (g.end) g.end(c, t3 - t2); }
        } else if (step === 2) {                            // 끝 컷: 위의 강한 컷이 효과 자리로 거둬들여지며 드러난다
          var w2 = t - t2; L1.material.uniforms.uReveal.value = 1 - ease(w2 / R3); L1.userData.k = 1 + breath;
          if (w2 > R3) L1.visible = false;
          L0.userData.k = 1 + breath;
          if (t >= t3) { step = 3; L0.userData.hide = false; L0.material.uniforms.uCenter.value.set(0.5, 0.15); L0.material.uniforms.uEdge.value.setHex(dim); }
        } else {                                            // 원래 모습으로: 끝 컷이 발밑으로 거둬지며 몸이 드러난다
          L0.material.uniforms.uReveal.value = 1 - ease((t - t3) / (tEnd - t3));
          if (t >= tEnd) { sc.heroActPic(0, null); sc.heroActPic(1, null); busy = false; return true; }
        }
        return false;
      });
      return true;
    }
    // 작은 입자 도우미: p에서 사방(a0..a1, 그림 오른쪽 D 기준)으로 튀는 n개
    function burst(p, n, o) {
      for (var i = 0; i < N(n); i++) {
        var a = rr(o.a0 === undefined ? 0 : o.a0, o.a1 === undefined ? 6.283 : o.a1), sp = rr(o.s0 || 0.6, o.s1 || 1.6), d = o.D || V(1, 0, 0);
        var vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
        E({ sys: o.sys, pos: p.clone().add(V(rr(-0.03, 0.03), rr(-0.03, 0.03), 0)), vel: V(d.x * vx, vy + (o.up || 0), d.z * vx + rr(-0.2, 0.2)), frame: o.frame || 'dot', color: o.col, size: o.size || [0.07, 0.02],
          life: rr(o.l0 || 0.4, o.l1 || 0.8), grav: o.grav || 0, drag: o.drag || 0, spin: o.spin ? rr(-o.spin, o.spin) : 0, fadeOut: o.fade === undefined ? 0.3 : o.fade, alpha: o.alpha, white: o.white, flicker: o.flicker });
      }
    }
    // p에서 q로 휘어 끌려가는 입자 하나
    function pull(p, q, life, o) {
      E({ sys: o.sys, pos: p.clone(), frame: o.frame || 'dot', color: o.col, size: o.size || [0.06, 0.03], life: life, alpha: o.alpha, white: o.white, fadeIn: 0.1, fadeOut: 0.2, spin: o.spin || 0,
        upd: function (pt, dt) { var d = pt.data; d.t += dt; var k = Math.min(1, d.t / life), e = k * k * (3 - 2 * k), s = Math.sin(k * Math.PI) * d.bend;
          pt.x = p.x + (q.x - p.x) * e + d.nx * s; pt.y = p.y + (q.y - p.y) * e + s * 0.6; pt.z = p.z + (q.z - p.z) * e + d.nz * s; return true; },
        data: { t: 0, bend: rr(-0.25, 0.25) * (o.bend || 1), nx: rr(-1, 1), nz: rr(-0.3, 0.3) } });
    }
    var RAILS = null;
    function rails() {
      if (RAILS) return RAILS;
      var cv = document.createElement('canvas'); cv.width = 64; cv.height = 32; var g = cv.getContext('2d');
      var gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 32);
      var fx = g.createLinearGradient(0, 0, 64, 0); fx.addColorStop(0.75, 'rgba(0,0,0,0)'); fx.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = fx; g.fillRect(0, 0, 64, 32);
      var tex = new T.CanvasTexture(cv), list = [];
      [[0.055, 0xd81818], [0.055, 0xd81818], [0.26, 0xff1010], [0.26, 0xff1010]].forEach(function (r, i) {
        var geo = new T.PlaneGeometry(1, r[0]); geo.translate(0.5, 0, 0);
        var m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, color: new T.Color(r[1]).convertSRGBToLinear(), transparent: true, depthWrite: false, blending: i < 2 ? T.NormalBlending : T.AdditiveBlending }));   // 심은 진한 빨강 그대로(밝은 땅에서 주황으로 뜨지 않게), 빛은 더하기
        m.renderOrder = 2; m.visible = false; sc.fxGroup.add(m); list.push(m);
      });
      RAILS = { list: list }; return RAILS;
    }
    var GARN = {
      // 잠수사: 창 안의 눈이 켜짐 → 바닷물과 뱀장어가 창 안으로 소용돌이치며 빨려 듦 → 유리가 어두워지고 거품
      diver: {
        start: function (c, T1) { var F = c.P(0.53, 0.77); E({ pos: F.clone().add(V(0, 0, 0.05)), frame: 'flare', color: [0xffffff, 0x3fe8d0], size: [0.05, 0.42], ease: 2, alpha: 0.9, life: T1 + 0.1, fadeOut: 0.3 }); },
        peak: function (c) {
          var F = c.P(0.53, 0.77);
          for (var i = 0; i < N(26); i++) {
            var eel = i % 6 === 0, life = rr(0.45, 0.8);
            E({ sys: eel ? 'norm' : undefined, pos: F.clone(), frame: eel ? 'crescent' : (i % 2 ? 'streak' : 'dot'), ar: eel ? 0.35 : 1, color: eel ? [0x0c1a1c, 0x061012] : [0xd8fff6, 0x2fbfa8], size: eel ? [0.26, 0.1] : [0.09, 0.03], alpha: eel ? 0.95 : 0.9, white: eel, life: life, fadeIn: 0.08, fadeOut: 0.15, spin: eel ? 0 : 4,
              upd: function (pt, dt) { var d = pt.data; d.t += dt; var k = Math.min(1, d.t / d.life), R = d.R * Math.pow(1 - k, 1.4), a = d.a + k * 9;
                pt.x = d.F.x + Math.cos(a) * d.D.x * R; pt.y = d.F.y + Math.sin(a) * R * 0.85; pt.z = d.F.z + Math.cos(a) * d.D.z * R + 0.06; pt.rot = a + 1.57; return true; },
              data: { t: 0, life: life, R: rr(0.55, 1.05), a: rr(0, 6.283), F: F, D: c.D } });
          }
          c.at(0.55, function () { E({ pos: F.clone().add(V(0, 0, 0.06)), frame: 'flare', color: [0xffffff, 0x3fe8d0], size: [0.5, 0.05], life: 0.35, alpha: 0.95 }); });
        },
        end: function (c) { var F = c.P(0.53, 0.77);
          for (var i = 0; i < N(4); i++) c.at(i * 0.15, function () { E({ pos: F.clone().add(V(rr(-0.08, 0.08), rr(-0.06, 0.04), 0.06)), vel: V(rr(-0.05, 0.05), rr(0.35, 0.55), 0), frame: 'circle', color: [0xe8fff8, 0x7fe8d8], size: [0.05, 0.08], alpha: 0.8, life: 0.8, fadeOut: 0.3 }); });
          for (var j = 0; j < N(6); j++) { var q = c.P(rr(0.3, 0.75), 0.6); E({ pos: q, vel: V(0, rr(-0.4, -0.2), 0), frame: 'dot', color: [0xbff8ee, 0x2fbfa8], size: [0.05, 0.03], life: rr(0.5, 0.8), grav: 3, alpha: 0.85 }); } }
      },
      // 인형사: 붉은 실이 당겨짐 → 가면이 옆으로 뜯겨 나가며 도자기 조각이 튐 → 가면이 실에 매달리고 피 같은 붉은 방울이 떨어짐
      puppet: {
        start: function (c, T1) { for (var i = 0; i < N(6); i++) { var p = c.P(rr(0.45, 0.8), rr(0.6, 0.95)); E({ pos: p, vel: V(0, rr(-0.1, 0.1), 0), frame: 'streak', color: [0xff3048, 0x7a0010], size: [0.1, 0.02], life: rr(0.3, T1), alpha: 0.9, flicker: 0.4 }); } },
        peak: function (c) {
          var M = c.P(0.05, 0.66), L = c.D.clone().multiplyScalar(-1);
          chips(M, 18, { D: L, a0: -0.9, a1: 1.1, s0: 0.8, s1: 2.2, col: [0xf4ece0, 0xb8ab98], size: 0.05, grav: 6, spin: 12, l0: 0.7, l1: 1.1 });
          E({ sys: 'norm', pos: c.P(0.55, 0.62).add(V(0, 0, 0.05)), frame: 'smoke', color: [0x3a0010, 0x120006], size: [0.25, 0.6], alpha: 0.5, life: 0.7, white: true, fadeIn: 0.05 });
        },
        end: function (c) { var M = c.P(-0.03, 0.42);
          for (var i = 0; i < N(4); i++) c.at(i * 0.12, function () { E({ pos: M.clone(), vel: V(0, -0.5, 0), frame: 'dot', color: [0x9a0018, 0x4a0008], size: [0.05, 0.04], grav: 6, life: 0.5, sys: 'norm', white: true, alpha: 1 }); }); }
      },
      // 도공: 소매의 금이 하얘짐 → 검은 도판이 터지며 백열하는 속이 드러남 → 조각이 식으며 불씨가 오름
      potter: {
        shake: 0.15,
        start: function (c, T1) { var F = c.P(0.67, 0.43); E({ pos: F.clone().add(V(0, 0, 0.05)), frame: 'glow', color: [0xff8a2a, 0xffe0a0], size: [0.1, 0.55], life: T1 + 0.05, alpha: 0.8 });
          for (var i = 0; i < N(8); i++) { var q = c.P(rr(0.55, 0.85), rr(0.3, 0.6)); E({ pos: q, frame: 'dot', color: [0xffffff, 0xff9a3a], size: [0.045, 0.02], life: rr(0.2, T1), flicker: 0.5, alpha: 0.95 }); } },
        peak: function (c) {
          var F = c.P(0.67, 0.43);
          E({ pos: F.clone().add(V(0, 0, 0.08)), frame: 'flare', color: [0xffffff, 0xffb050], size: [0.62, 0.12], ease: 1, life: 0.28, alpha: 0.9 });
          E({ pos: F.clone().add(V(0, 0, 0.06)), frame: 'star', color: [0xffffff, 0xff9a3a], size: [0.15, 0.55], life: 0.25, alpha: 0.8, spin: 2 });
          chips(F, 16, { D: c.D, a0: -0.5, a1: 1.6, s0: 1.2, s1: 2.8, col: [0x1a1614, 0x3a302a], size: 0.07, grav: 7, spin: 12, l0: 0.7, l1: 1.1 });
          burst(F, 14, { D: c.D, a0: -1.2, a1: 2.2, s0: 1.5, s1: 3.2, col: [0xffffff, 0xff8a2a], size: [0.06, 0.02], grav: 3, l0: 0.3, l1: 0.6 });
        },
        end: function (c, T3) { for (var i = 0; i < N(9); i++) { var q = c.P(rr(0.55, 0.85), rr(0.3, 0.55)); E({ pos: q, vel: V(rr(-0.05, 0.05), rr(0.3, 0.6), 0), frame: 'dot', color: [0xffb060, 0x7a1a08], size: [0.05, 0.02], life: rr(0.5, T3 + 0.3), flicker: 0.3, alpha: 0.9 }); }
          E({ sys: 'norm', pos: c.P(0.7, 0.5), vel: V(0, 0.35, 0), frame: 'smoke', color: [0x3a3634, 0x1a1816], size: [0.18, 0.45], alpha: 0.35, life: 0.9, white: true }); }
      },
      // 제본사: 먹귀가 투구 둘레를 돎 → 표지가 턱처럼 먹귀를 물어 접으며 먹과 종잇조각이 튐 → 책장에 먹자국, 먹이 흘러내림
      binder: {
        shake: 0.15,
        start: function (c, T1) { var F = c.P(0.5, 0.8);
          for (var i = 0; i < N(5); i++) E({ sys: 'norm', pos: F.clone(), frame: 'smoke', color: [0x0a0808, 0x050404], size: [0.12, 0.22], alpha: 0.6, white: true, life: T1, fadeIn: 0.1,
            upd: function (pt, dt) { var d = pt.data; d.a += dt * 5; pt.x = d.F.x + Math.cos(d.a) * 0.55 * d.D.x; pt.z = d.F.z + Math.cos(d.a) * 0.55 * d.D.z + 0.05; pt.y = d.F.y + 0.15 + Math.sin(d.a) * 0.22; return true; }, data: { a: i * 1.25, F: F, D: c.D } }); },
        peak: function (c) { var F = c.P(0.45, 0.76);
          burst(F, 18, { s0: 1.0, s1: 2.6, col: [0x0c0a0a, 0x050404], size: [0.07, 0.05], grav: 7, l0: 0.4, l1: 0.8, sys: 'norm', white: true, alpha: 1 });
          chips(F, 10, { s0: 0.8, s1: 2.0, up: 0.6, col: [0xeadcbc, 0xb89a70], size: 0.07, grav: 3, spin: 9, l0: 0.9, l1: 1.3 });
          E({ sys: 'norm', pos: F.clone().add(V(0, 0, 0.05)), frame: 'smoke', color: [0x161212, 0x050404], size: [0.3, 0.75], alpha: 0.55, life: 0.55, white: true }); },
        end: function (c, T3) { for (var i = 0; i < N(6); i++) { var q = c.P(rr(0.32, 0.68), 0.68); c.at(rr(0, T3 * 0.6), function () { E({ sys: 'norm', pos: q.clone(), vel: V(0, -0.15, 0), frame: 'dot', color: [0x0c0a0a, 0x050404], size: [0.04, 0.03], grav: 2.5, life: 0.7, white: true, alpha: 1 }); }); } }
      },
      // 재단사: 앞발이 흰 봉합실을 팽팽하게 당김 → 바닥 그림자의 솔기가 한 땀씩 뜯겨 벌어짐 → 끊어진 실 끝이 소매로 감김
      tailor: {
        start: function (c, T1) { var a = c.P(0.15, 0.53), b = c.P(0.93, 0.6);
          for (var i = 0; i < N(3); i++) pull(a, b, T1 * rr(0.6, 1), { frame: 'flare', col: [0xffffff, 0xfff0d0], size: [0.1, 0.06], alpha: 0.95, bend: 0.2 }); },
        peak: function (c) {
          var G = c.G(0.5, 0.035), D = c.D, Nn = c.Nn;
          for (var i = 0; i < 7; i++) (function (i) { c.at(i * 0.06, function () {
            var a = (i - 3) * 0.42 + rr(-0.12, 0.12), dir = V(D.x * Math.cos(a) + Nn.x * Math.sin(a), 0, D.z * Math.cos(a) + Nn.z * Math.sin(a)), L = rr(0.55, 0.9), sg = i % 2 ? 1 : -1, m = G.clone().add(dir.clone().multiplyScalar(L * 0.5 * sg));
            E({ sys: 'gnorm', pos: m, frame: 'streak', color: [0x050405, 0x050405], size: [L * 0.6, L], ar: 0.16, rot: Math.atan2(dir.z, dir.x), life: 0.9, alpha: 0.9, white: true, fadeOut: 0.5 });
            for (var s = 0; s < 3; s++) { var q = G.clone().add(dir.clone().multiplyScalar(L * rr(0.2, 0.9) * sg)); E({ pos: q, vel: V(rr(-0.4, 0.4), rr(0.6, 1.2), rr(-0.3, 0.3)), frame: 'streak', color: [0xffffff, 0xd8d0c0], size: [0.08, 0.02], life: rr(0.3, 0.5), drag: 2, alpha: 0.9 }); }
          }); })(i);
          for (var k = 0; k < N(5); k++) E({ sys: 'norm', pos: G.clone().add(V(rr(-0.5, 0.5), 0.05, rr(-0.2, 0.2))), vel: V(0, rr(0.2, 0.4), 0), frame: 'smoke', color: [0x1a1618, 0x080608], size: [0.15, 0.4], alpha: 0.4, life: 0.6, white: true });
        },
        end: function (c, T3) { var a = c.P(0.15, 0.52);
          for (var i = 0; i < N(5); i++) E({ pos: a.clone(), frame: 'crescent', ar: 0.5, color: [0xffffff, 0xe8e0d0], size: [0.12, 0.05], alpha: 0.9, life: T3 * 0.8, fadeIn: 0.1,
            upd: function (pt, dt) { var d = pt.data; d.t += dt; var k = Math.min(1, d.t / d.l), R = 0.16 * (1 - k * 0.8); d.a += dt * 9; pt.x = d.p.x + Math.cos(d.a) * R; pt.y = d.p.y + Math.sin(d.a) * R * 0.8; pt.z = d.p.z + 0.05; pt.rot = d.a; return true; }, data: { t: 0, l: T3 * 0.8, a: i * 1.26, p: a } }); }
      },
      // 차장: 가슴의 붉은 신호가 켜짐 → 레버를 내리면 평행한 붉은 선로가 앞으로 달려 나가 유령 그림자를 가름 → 신호판이 닫히고 선로가 끊김
      conductor: {
        start: function (c, T1) { var F = c.P(0.5, 0.48);
          [0, T1 * 0.5].forEach(function (d) { c.at(d, function () { E({ pos: F.clone().add(V(0, 0, 0.06)), frame: 'flare', color: [0xffffff, 0xff2020], size: [0.06, 0.32], ease: 2, life: T1 * 0.5, alpha: 0.95 }); E({ pos: F.clone().add(V(0, 0, 0.05)), frame: 'ring', color: 0xff3030, size: [0.03, 0.2], ease: 1, life: 0.25, alpha: 0.7, rot: 0 }); }); }); },
        peak: function (c, T2) {
          var D = c.D, Nn = c.Nn, G = c.G(0.5, 0.04), LEN = 3.2;
          var R = rails(), th = Math.atan2(-D.z, D.x), t0 = 0;
          R.list.forEach(function (m, i) { var sd = i % 2 ? 1 : -1, a = G.clone().add(Nn.clone().multiplyScalar(0.2 * sd)); m.position.set(a.x, i < 2 ? 0.032 : 0.03, a.z); m.rotation.set(-Math.PI / 2, 0, th); m.scale.set(0.001, 1, 1); m.material.opacity = 0; m.visible = true; });
          tick(function (dt) {
            if (!c.live()) return true; t0 += dt;
            var k = Math.min(1, t0 / 0.28), e = 1 - (1 - k) * (1 - k), L = Math.max(0.001, LEN * e), fade = 1 - Math.max(0, Math.min(1, (t0 - T2 + 0.1) / 0.3));
            R.list.forEach(function (m, i) { m.scale.x = L; m.material.opacity = (i < 2 ? 1 : 0.55) * fade * (0.85 + 0.15 * Math.sin(t0 * 40 + i)); });
            if (k < 1 && Math.random() < 0.7) { var tip = G.clone().add(D.clone().multiplyScalar(L)).add(Nn.clone().multiplyScalar(Math.random() < 0.5 ? 0.2 : -0.2)); E({ pos: tip.setY(0.06), vel: V(rr(-0.5, 0.5), rr(0.5, 1.4), rr(-0.5, 0.5)), frame: 'dot', color: [0xffffff, 0xff3020], size: [0.05, 0.02], life: 0.3, grav: 5 }); }
            if (fade > 0) return false;
            R.list.forEach(function (m) { m.visible = false; }); return true;
          });
          // 갈라지는 유령 그림자: 선로 사이에서 양옆으로 찢겨 흩어짐
          for (var i = 0; i < N(10); i++) { var q = G.clone().add(D.clone().multiplyScalar(rr(1.0, 2.8))).setY(rr(0.25, 0.8)), s2 = i % 2 ? 1 : -1;
            E({ sys: 'norm', pos: q, vel: Nn.clone().multiplyScalar(s2 * rr(0.8, 1.6)).setY(rr(0.1, 0.4)), frame: 'smoke', color: [0x3a0a10, 0x0c0204], size: [0.32, 0.12], alpha: 0.6, life: rr(0.5, 0.8), white: true, drag: 1.5, fadeIn: 0.06 }); }
          E({ sys: 'gadd', pos: G.clone().add(D.clone().multiplyScalar(1.4)), frame: 'glow', color: [0xff2020, 0x600000], size: [1.2, 2.2], ar: 0.4, rot: Math.atan2(D.z, D.x), life: T2, alpha: 0.5, fadeOut: 0.4 });
        },
        end: function (c) { var G = c.G(0.5, 0.05);
          for (var i = 0; i < N(6); i++) { var q = G.clone().add(c.D.clone().multiplyScalar(rr(0.3, 2.6))).add(c.Nn.clone().multiplyScalar(i % 2 ? 0.2 : -0.2));
            E({ sys: 'norm', pos: q, vel: V(0, rr(0.25, 0.5), 0), frame: 'smoke', color: [0x4a4644, 0x1e1c1c], size: [0.15, 0.4], alpha: 0.35, life: rr(0.6, 0.9), white: true }); } }
      },
      // 순례자: 지팡이가 유령 물고기의 물기를 끌어냄 → 꼬리부터 흰 소금뼈로 바스러짐 → 소금가루가 바닥에 흩어짐
      pilgrim: {
        start: function (c, T1) { var S = c.P(0.13, 0.56);
          for (var i = 0; i < N(10); i++) { var p = c.P(rr(0.65, 0.95), rr(0.45, 0.95)); c.at(rr(0, T1 * 0.4), function () { pull(p, S, T1 * 0.6, { col: [0xd8f0ff, 0x7ab8e0], size: [0.05, 0.03], alpha: 0.9, bend: 0.5 }); }); } },
        peak: function (c) {
          for (var i = 0; i < 6; i++) (function (i) { c.at(i * 0.08, function () { var q = c.P(0.86 - i * 0.02, 0.2 + i * 0.05);
            burst(q, 5, { s0: 0.4, s1: 1.2, up: 0.3, frame: i % 2 ? 'star' : 'dot', col: [0xffffff, 0xd8e0e8], size: [0.05, 0.03], grav: 4, l0: 0.5, l1: 0.8, alpha: 1 }); }); })(i);
          chips(c.P(0.75, 0.42), 12, { s0: 0.5, s1: 1.3, col: [0xfafaf6, 0xc8ccd0], size: 0.035, grav: 6, spin: 8, l0: 0.7, l1: 1.0 });
        },
        end: function (c, T3) { var P0 = c.G(0.95, 0.04);
          for (var i = 0; i < N(14); i++) { var q = c.P(rr(0.75, 0.95), rr(0.15, 0.4)); c.at(rr(0, T3 * 0.5), function () { E({ pos: q.clone(), vel: V(rr(-0.1, 0.1), rr(-0.2, 0), 0), frame: 'dot', color: [0xffffff, 0xe0e4e8], size: [0.035, 0.025], grav: 3, life: 0.6, alpha: 0.95 }); }); }
          E({ sys: 'gnorm', pos: P0, frame: 'glow', color: [0xffffff, 0xd8dce0], size: [0.3, 0.42], life: T3 + 0.3, alpha: 0.5, fadeIn: 0.2, fadeOut: 0.4, rot: 0, white: true }); }
      },
      // 측량사: 발밑에 금빛 등고선이 그려짐 → 땅이 지도처럼 접혀 버둥대는 그림자를 끼움 → 접힌 자국 하나만 남음
      surveyor: {
        start: function (c, T1) { var G = c.G(0.45, 0.03);
          [0, 0.12, 0.24, 0.36].forEach(function (d, i) { c.at(d, function () { E({ sys: 'gnorm', pos: G.clone(), frame: 'ring', color: [0xc89a40, 0x6a4818], size: [0.2, 0.7 + i * 0.4], ease: 1, life: T1 + 0.5 - d, alpha: 0.5, rot: 0, fadeOut: 0.4 }); }); }); },
        peak: function (c) { var G = c.G(0.45, 0.05);
          for (var i = 0; i < N(14); i++) { var q = G.clone().add(c.D.clone().multiplyScalar(rr(-1.1, 1.1))).add(c.Nn.clone().multiplyScalar(rr(-0.4, 0.4)));
            E({ pos: q, vel: V(0, rr(0.5, 1.1), 0), frame: 'dot', color: [0xfff0c0, 0xd8a84a], size: [0.05, 0.02], life: rr(0.4, 0.8), drag: 1, alpha: 0.95 }); }
          for (var j = 0; j < N(8); j++) { var p = G.clone().add(c.D.clone().multiplyScalar(rr(-1.2, 1.2))).setY(rr(0.05, 0.4)); pull(p, G.clone().setY(0.15), rr(0.35, 0.55), { sys: 'norm', frame: 'smoke', col: [0x141010, 0x050404], size: [0.2, 0.08], alpha: 0.6, white: true }); } },
        end: function (c, T3) { var G = c.G(0.45, 0.035);
          E({ sys: 'gadd', pos: G, frame: 'streak', color: [0xffe0a0, 0xd8a84a], size: [2.2, 2.4], ar: 0.05, rot: Math.atan2(c.D.z, c.D.x) + 0.35, life: T3 + 0.4, alpha: 0.75, fadeIn: 0.1, fadeOut: 0.5 }); }
      },
      // 영사기사: 렌즈가 켜져 필름 몇 칸을 비춤 → 마지막 칸에서 긴 발톱의 귀신이 기어 나옴 → 셔터가 닫히며 빛줄기 안에서만 암전
      projector: {
        start: function (c, T1) { var F = c.P(0.5, 0.74);
          E({ pos: F.clone().add(V(0, 0, 0.04)), frame: 'flare', color: [0xffffff, 0xffd890], size: [0.1, 0.38], ease: 2, life: T1 + 0.1, alpha: 0.85 });
          for (var i = 0; i < N(10); i++) { var p = F.clone().add(c.D.clone().multiplyScalar(rr(0.2, 0.9))).add(V(0, rr(-0.12, 0.12), 0.05)); E({ pos: p, vel: c.D.clone().multiplyScalar(rr(0.05, 0.2)), frame: 'dot', color: [0xfff0c8, 0xffc870], size: [0.03, 0.02], life: rr(0.4, T1), alpha: 0.8, flicker: 0.4 }); } },
        peak: function (c) { var F = c.P(0.5, 0.74);
          E({ pos: F.clone().add(V(0, 0, 0.04)), frame: 'flare', color: [0xffffff, 0xffd890], size: [0.5, 0.12], life: 0.3, alpha: 0.9 });
          for (var i = 0; i < N(12); i++) { var p = F.clone().add(c.D.clone().multiplyScalar(rr(0.1, 0.4))); E({ sys: 'norm', pos: p, vel: c.D.clone().multiplyScalar(rr(1.0, 2.0)).add(V(0, rr(0, 0.5), 0)), frame: 'smoke', color: [0x161210, 0x050404], size: [0.12, 0.3], alpha: 0.35, life: rr(0.45, 0.7), white: true, drag: 1.2 }); }
          for (var k = 0; k < N(8); k++) { var q = F.clone().add(c.D.clone().multiplyScalar(rr(0.3, 1.0))); E({ pos: q, frame: 'glow', color: [0xffe8b0, 0xffb860], size: [0.25, 0.1], life: rr(0.08, 0.2), alpha: 0.8 }); } },
        end: function (c, T3) { var F = c.P(0.5, 0.74);
          E({ sys: 'norm', pos: F.clone().add(V(0, 0, 0.06)), frame: 'glow', color: [0x050404, 0x050404], size: [0.5, 0.2], life: 0.3, alpha: 0.7, white: true });
          chips(c.P(0.9, 0.55), 6, { a0: -1.8, a1: -1.2, s0: 0.2, s1: 0.5, col: [0xb89a6a, 0x5a4428], size: 0.06, grav: 1.5, spin: 5, l0: 0.7, l1: T3 + 0.2 });
          E({ sys: 'norm', pos: c.P(0.85, 0.62), vel: V(0, 0.3, 0), frame: 'smoke', color: [0x5a5450, 0x2a2624], size: [0.12, 0.35], alpha: 0.35, life: 0.9, white: true }); }
      }
    };
    // 평소 모습: 옷마다 작은 표시 하나 (fx.js quietParticle이 먼저 여기에 물어본다)
    function idle(f, H) {
      var P = f.parts, x = H.x, z = H.z, q = Math.random();
      if (P === 'drip') { if (q < 0.8) E({ pos: V(x + rr(-0.35, 0.35), rr(0.55, 0.75), z + 0.15), vel: V(0, -0.2, 0), frame: 'dot', color: [0xbff8ee, 0x2fbfa8], size: [0.04, 0.03], grav: 2, life: 0.7, alpha: 0.85 });
        else E({ pos: V(x + rr(-0.2, 0.2), rr(0.6, 0.9), z + 0.15), vel: V(rr(-0.04, 0.04), 0.35, 0), frame: 'circle', color: [0xe8fff8, 0x7fe8d8], size: [0.04, 0.06], life: 1.2, alpha: 0.7, fadeOut: 0.4 }); }
      else if (P === 'thread') E({ pos: V(x + rr(-0.45, 0.45), rr(0.9, 1.3), z + 0.1), vel: V(rr(-0.06, 0.06), rr(-0.25, -0.15), 0), frame: 'streak', color: [0xb0102e, 0x5a0010], size: [0.09, 0.05], life: rr(1.6, 2.2), spin: rr(-1.5, 1.5), alpha: 0.85, fadeIn: 0.2, fadeOut: 0.6 });
      else if (P === 'cinder') E({ pos: V(x + rr(-0.35, 0.35), rr(0.2, 0.8), z + 0.15), vel: V(rr(-0.04, 0.04), rr(0.2, 0.4), 0), frame: 'dot', color: [0xfff0d0, 0xff7a2a], size: [0.04, 0.015], life: rr(0.8, 1.3), flicker: 0.4, alpha: 0.9, fadeIn: 0.15 });
      else if (P === 'page') E({ sys: 'norm', pos: V(x + rr(-0.5, 0.5), rr(1.0, 1.4), z + 0.1), vel: V(rr(-0.06, 0.06), rr(-0.22, -0.14), 0), frame: 'crescent', color: [0xe8d6b0, 0xb89a70], size: [0.09, 0.08], life: rr(2, 2.8), spin: rr(-2, 2), alpha: 0.95, white: true, fadeIn: 0.2, fadeOut: 0.6 });
      else if (P === 'lint') E({ pos: V(x + rr(-0.5, 0.5), rr(0.4, 1.1), z + 0.1), vel: V(rr(-0.05, 0.05), rr(-0.08, 0.08), 0), frame: 'streak', color: [0xffffff, 0xd8d0c0], size: [0.07, 0.05], life: rr(1.4, 2), spin: rr(-1, 1), alpha: 0.7, fadeIn: 0.3, fadeOut: 0.6 });
      else if (P === 'signal') { if (q < 0.35) E({ pos: V(x, 0.5, z + 0.18), frame: 'flare', color: [0xffffff, 0xff2020], size: [0.04, 0.22], ease: 2, life: 0.45, alpha: 0.9 });
        else E({ pos: V(x + rr(-0.3, 0.3), rr(0.1, 0.5), z + 0.12), vel: V(rr(-0.05, 0.05), rr(0.15, 0.35), 0), frame: 'dot', color: [0xff6040, 0x801010], size: [0.035, 0.015], life: rr(0.7, 1.1), flicker: 0.3, alpha: 0.85 }); }
      else if (P === 'salt') E({ pos: V(x + rr(-0.45, 0.45), rr(0.3, 0.9), z + 0.12), vel: V(rr(-0.04, 0.04), rr(-0.3, -0.18), 0), frame: 'dot', color: [0xffffff, 0xd8e0e8], size: [0.03, 0.02], life: rr(1, 1.5), alpha: 0.9, fadeIn: 0.15 });
      else if (P === 'gold') E({ pos: V(x + rr(-0.6, 0.6), rr(0.02, 0.15), z + rr(-0.2, 0.25)), vel: V(0, rr(0.15, 0.3), 0), frame: 'dot', color: [0xfff0c0, 0xd8a84a], size: [0.035, 0.015], life: rr(1.2, 1.8), alpha: 0.85, fadeIn: 0.25 });
      else if (P === 'film') E({ pos: V(x + rr(-0.3, 0.5), rr(0.7, 1.0), z + 0.15), vel: V(rr(0.02, 0.1), rr(-0.03, 0.03), 0), frame: 'dot', color: [0xfff0c8, 0xffc870], size: [0.025, 0.02], life: rr(1.5, 2.2), alpha: 0.7, flicker: 0.5, fadeIn: 0.3, fadeOut: 0.6 });
      else return false;
      return true;
    }
    function stop() { run++; busy = false; if (RAILS) RAILS.list.forEach(function (m) { m.visible = false; }); sc.heroActPic(0, null); sc.heroActPic(1, null); if (sc.heroFront) sc.heroFront(0); if (pool) { pool.disc.visible = pool.crack.visible = pool.glow.visible = false; chain.mesh.visible = false; } if (CH) { CH.on = false; CH.list = []; CH.pos.fill(0); CH.mesh.geometry.attributes.position.needsUpdate = true; } if (sc.heroShadow) sc.heroShadow(true); }
    // 한 번 발동. 이미 진행 중이면 겹치지 않는다(연속 입력). cf = 그 옷의 fx (사슬 자리 등)
    function act(kind, cf) {
      if (busy) return false;
      if (kind === 'bell') { busy = true; bell(cf); return true; }
      if (cf && cf.act && GARN[kind]) { busy = true; return flip(kind, cf); }
      return false;
    }
    return { act: act, stop: stop, prepare: prepare, idle: idle, busy: function () { return busy; } };
  };
})(this);
