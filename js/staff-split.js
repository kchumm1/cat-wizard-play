// Staff split (2026-11-15, user: in a costume the wizard should really swing its staff). A costume picture is one flat
// image with the staff painted right next to the face, so turning the staff inside the picture smears it over the face.
// Here the staff is cut out into its own picture (drawn in front of the body and turned as one stiff piece at the paw),
// and in the body picture its place is filled from what is on both sides of it: cape colour where the staff lay on the
// cape, clear where it stood against the empty background.
// Which pixels are the staff: the rig's staff strip (rig.js armL.cap / cap2) only says roughly where the staff is; a
// hat brim or an ear often pokes into it. So inside the strip each pixel goes to whichever is "closer" along the
// picture: the staff (grown from the strip's centre line and the paw) or the body (grown in from outside the strip),
// where crossing an outline or a change of colour costs a lot. The staff's own outline keeps the hat out of it.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // how much of each pixel lies in the staff strip (0..1)
  function staffMask(W, H, crop, rig) {
    var CW = (root && root.CW && root.CW.rigWeightsAt) ? root.CW : require('./rig.js'), m = new Float32Array(W * H), raw = new Float32Array(W * H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var w = CW.rigWeightsAt(rig, crop, (x + 0.5) / W, 1 - (y + 0.5) / H)[1];
      raw[y * W + x] = w; m[y * W + x] = smooth(0.35, 0.7, w);
    }
    m.raw = raw;
    return m;
  }
  function stripAxes(rig) {
    var a = rig.armL, out = [a.cap], c2 = a.cap2;
    if (c2) { if (typeof c2[0] === 'number') out.push(c2); else c2.forEach(function (c) { out.push(c); }); }
    return out;
  }
  // a small binary heap of pixel indices ordered by dist
  function Heap(dist) { this.a = []; this.d = dist; }
  Heap.prototype.push = function (i) { var a = this.a, d = this.d; a.push(i); var k = a.length - 1; while (k > 0) { var p = (k - 1) >> 1; if (d[a[p]] <= d[a[k]]) break; var t = a[p]; a[p] = a[k]; a[k] = t; k = p; } };
  Heap.prototype.pop = function () {
    var a = this.a, d = this.d, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; var k = 0, n = a.length; for (;;) { var l = 2 * k + 1, r = l + 1, m = k; if (l < n && d[a[l]] < d[a[m]]) m = l; if (r < n && d[a[r]] < d[a[m]]) m = r; if (m === k) break; var t = a[m]; a[m] = a[k]; a[k] = t; k = m; } }
    return top;
  };
  // Background left inside the picture: the white between the staff and the body that the loader's flood from the
  // picture's edge could not reach. Once the staff swings away it would show as a white patch, so inside the strip
  // flat near-white patches go clear (the same test the loader uses), with their light fringe softened.
  function clearPockets(p, W, H, mask) {   // mask: the area worked on (widened strip)
    var n = W * H, seen = new Uint8Array(n), stack = [], comp = [];
    function white(i) { var o = i * 4; return p[o + 3] > 0 && p[o] >= 232 && p[o + 1] >= 232 && p[o + 2] >= 232; }
    for (var s = 0; s < n; s++) {
      if (seen[s] || !mask[s] || !white(s)) continue;
      comp.length = 0; stack.push(s); seen[s] = 1; var inside = 0;
      while (stack.length) {
        var i = stack.pop(); comp.push(i); if (mask[i]) inside++;
        var x = i % W, y = (i / W) | 0;
        if (x > 0) go(i - 1); if (x < W - 1) go(i + 1); if (y > 0) go(i - W); if (y < H - 1) go(i + W);
      }
      // a real white part of the costume (fur, a highlight) is small or mostly outside the strip
      if (comp.length >= 12 && inside >= comp.length * 0.6) comp.forEach(function (j) { p[j * 4 + 3] = 0; seen[j] = 2; });
    }
    function go(j) { if (!seen[j] && white(j)) { seen[j] = 1; stack.push(j); } }
    for (var q = 0; q < n; q++) {
      if (seen[q] === 2 || p[q * 4 + 3] === 0) continue;
      var qx = q % W, qy = (q / W) | 0;
      if ((qx > 0 && seen[q - 1] === 2) || (qx < W - 1 && seen[q + 1] === 2) || (qy > 0 && seen[q - W] === 2) || (qy < H - 1 && seen[q + W] === 2)) {
        var o = q * 4, lum = (p[o] + p[o + 1] + p[o + 2]) / 3; if (lum > 200) p[o + 3] = Math.min(p[o + 3], Math.max(0, 255 - (lum - 200) * 4.6));
      }
    }
  }
  // label: 1 = staff, 2 = body, 0 = empty (not part of either)
  // The strip only roughly fits the staff (a hook or a crystal often pokes past it), so the staff may grow beyond it:
  // the area worked on is the strip widened by a margin, and the body is grown in from outside that.
  function widen(mask, W, H) {
    var n = W * H, roi = new Uint8Array(n), ring = [], R = Math.max(6, Math.round(24 * W / 512));
    for (var i0 = 0; i0 < n; i0++) if (mask[i0] > 0.02) { roi[i0] = 1; ring.push(i0); }   // (a 0/1 area widens the same way)
    for (var r = 0; r < R; r++) {
      var nextRing = [];
      ring.forEach(function (i) { var x = i % W, y = (i / W) | 0; [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1].forEach(function (j) { if (j >= 0 && !roi[j]) { roi[j] = 1; nextRing.push(j); } }); });
      ring = nextRing;
    }
    return roi;
  }
  function segment(p, W, H, roi, crop, rig, wr) {
    var n = W * H, dist = new Float32Array(n).fill(Infinity), lab = new Uint8Array(n), heap = new Heap(dist), K = 0.16;
    function op(i) { return p[i * 4 + 3] >= 24; }
    function px(sx, sy) { return [(sx - crop.x0) * W / crop.cw, (sy - crop.y0) * H / crop.ch]; }
    function seed(i, l) { if (i < 0 || i >= n || !op(i) || dist[i] === 0) return; dist[i] = 0; lab[i] = l; heap.push(i); }
    // Outside the area worked on, the body is the one big piece; smaller pieces cut off from it by the background are
    // the tips of a staff's head that stick out further (a frame, a flame, a blade), so the staff may grow into them.
    // (only above the paw: below it the strip cuts across the cape, and a piece of cape cut off that way is not the staff)
    var part = new Int32Array(n).fill(-1), sizes = [], high = [], stack = [], cutY = (rig.armL.p[1] - crop.y0) * (H / crop.ch);
    for (var s0 = 0; s0 < n; s0++) {
      if (roi[s0] || part[s0] >= 0 || !op(s0)) continue;
      var id = sizes.length, cnt = 0, up = true; part[s0] = id; stack.push(s0);
      while (stack.length) {
        var c0 = stack.pop(), x0 = c0 % W, y0 = (c0 / W) | 0; cnt++; if (y0 >= cutY) up = false;
        [x0 > 0 ? c0 - 1 : -1, x0 < W - 1 ? c0 + 1 : -1, y0 > 0 ? c0 - W : -1, y0 < H - 1 ? c0 + W : -1].forEach(function (j) { if (j >= 0 && !roi[j] && part[j] < 0 && op(j)) { part[j] = id; stack.push(j); } });
      }
      sizes.push(cnt); high.push(up);
    }
    var big = 0; for (var c1 = 1; c1 < sizes.length; c1++) if (sizes[c1] > sizes[big]) big = c1;
    var open = new Uint8Array(n);   // where the staff and body may grow
    // below the paw the staff is only the stick lying over the cape: there it stays inside the strip itself
    for (var i1 = 0; i1 < n; i1++) open[i1] = (roi[i1] && (((i1 / W) | 0) < cutY || wr[i1] > 0.05)) || (part[i1] >= 0 && part[i1] !== big && high[part[i1]]) ? 1 : 0;
    // the body: every visible pixel that may not be grown into, next to one that may
    for (var i = 0; i < n; i++) {
      if (open[i] || !op(i)) continue;
      var x = i % W, y = (i / W) | 0;
      if ((x > 0 && open[i - 1]) || (x < W - 1 && open[i + 1]) || (y > 0 && open[i - W]) || (y < H - 1 && open[i + W])) { dist[i] = 0; lab[i] = 2; heap.push(i); }
    }
    // the staff: its centre line(s) and the paw that holds it
    stripAxes(rig).forEach(function (c) {
      var a = px(c[0], c[1]), b = px(c[2], c[3]), len = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.max(1, Math.ceil(len * 2));
      for (var k = 0; k <= steps; k++) { var t = k / steps, sx = Math.round(a[0] + (b[0] - a[0]) * t), sy = Math.round(a[1] + (b[1] - a[1]) * t); if (sx >= 0 && sx < W && sy >= 0 && sy < H) seed(sy * W + sx, 1); }
    });
    // and marked points on parts of a staff's head that lie against the hat in the same colours (rig.js armL.seeds)
    (rig.armL.seeds || []).forEach(function (q) { var a = px(q[0], q[1]), r0 = Math.max(1, Math.round(10 * W / crop.cw)); for (var yy = -r0; yy <= r0; yy++) for (var xx = -r0; xx <= r0; xx++) { var sx = Math.round(a[0]) + xx, sy = Math.round(a[1]) + yy; if (sx >= 0 && sx < W && sy >= 0 && sy < H && open[sy * W + sx]) seed(sy * W + sx, 1); } });
    var pw = px(rig.armL.p[0], rig.armL.p[1]), pr = Math.max(2, Math.round(28 * W / crop.cw));
    for (var dy = -pr; dy <= pr; dy++) for (var dx = -pr; dx <= pr; dx++) {
      if (dx * dx + dy * dy > pr * pr) continue; var qx = Math.round(pw[0]) + dx, qy = Math.round(pw[1]) + dy;
      if (qx >= 0 && qx < W && qy >= 0 && qy < H && roi[qy * W + qx]) seed(qy * W + qx, 1);
    }
    while (heap.a.length) {
      var c = heap.pop(), cx = c % W, cy = (c / W) | 0, dc = dist[c];
      if (cx > 0) step(c, c - 1, dc); if (cx < W - 1) step(c, c + 1, dc); if (cy > 0) step(c, c - W, dc); if (cy < H - 1) step(c, c + W, dc);
    }
    function step(a, b, da) {
      if (!open[b] || !op(b)) return;
      var oa = a * 4, ob = b * 4, dr = p[oa] - p[ob], dg = p[oa + 1] - p[ob + 1], db = p[oa + 2] - p[ob + 2], dA = p[oa + 3] - p[ob + 3];
      // and each side pays a little for being where the strip says the other one is: the body for every step into the
      // strip's middle, the staff for every step outside it (so where colours alone cannot tell, the strip decides)
      // walking along a dark outline costs extra: outlines join everything to everything, and the staff would otherwise
      // run up the hood's outline (crossing an outline, a few pixels, costs little)
      var lum = (p[ob] + p[ob + 1] + p[ob + 2]) / 3, dark = lum < 90 ? 6 * (1 - lum / 90) : 0;
      var d = da + 1 + dark + K * Math.sqrt(dr * dr + dg * dg + db * db + dA * dA) + (((b / W) | 0) < cutY ? (lab[a] === 1 ? 1.0 * (1 - wr[b]) : 0.5 * wr[b]) : (lab[a] === 1 ? 3.0 * (1 - wr[b]) : 0.3 * wr[b]));
      if (d < dist[b]) { dist[b] = d; lab[b] = lab[a]; heap.push(b); }
    }
    // the staff's dark outline belongs to it (otherwise it is left behind on the body as a dark line)
    for (var it = 0; it < 2; it++) {
      var take = [];
      for (var q = 0; q < n; q++) {
        if (lab[q] !== 2 || !open[q]) continue;
        var o = q * 4; if (p[o] + p[o + 1] + p[o + 2] > 330) continue;
        var qx2 = q % W, qy2 = (q / W) | 0;
        if ((qx2 > 0 && lab[q - 1] === 1) || (qx2 < W - 1 && lab[q + 1] === 1) || (qy2 > 0 && lab[q - W] === 1) || (qy2 < H - 1 && lab[q + W] === 1)) take.push(q);
      }
      take.forEach(function (q) { lab[q] = 1; });
    }
    return lab;
  }
  // Fill the staff's place in the body picture. A staff is a long thin thing, so each pixel of its place takes the
  // blend of the nearest picture on both sides of it, across the staff (cape on both sides gives cape, background on
  // one side fades out); then a couple of soft passes. What ends up mostly see-through becomes clear.
  // cutY: above the paw that holds it the staff stood against the background (its head), so its place is left clear
  // there; only below the paw, where it lay over the cape, is it filled.
  function fillAcross(d, W, H, hole, crop, rig, cutY) {
    var a = rig.armL.cap, ax = (a[2] - a[0]) * W / crop.cw, ay = (a[3] - a[1]) * H / crop.ch, al = Math.hypot(ax, ay) || 1, nx = -ay / al, ny = ax / al;
    var n = W * H, list = [], R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), A = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var al0 = d[i * 4 + 3] / 255; A[i] = al0; R[i] = d[i * 4] * al0; G[i] = d[i * 4 + 1] * al0; B[i] = d[i * 4 + 2] * al0;
      if (!hole[i]) continue;
      if (((i / W) | 0) < cutY) { if (hole[i] === 1) d[i * 4 + 3] = 0; hole[i] = 0; continue; }
      list.push(i);
    }
    function probe(x, y, sx, sy) {
      for (var s = 1; s < 90; s++) {
        var qx = Math.round(x + sx * s), qy = Math.round(y + sy * s);
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) return [s, 0, 0, 0, 0];
        var q = qy * W + qx; if (!hole[q]) return [s, R[q], G[q], B[q], A[q]];
      }
      return [90, 0, 0, 0, 0];
    }
    list.forEach(function (i) {
      var x = i % W, y = (i / W) | 0, u = probe(x, y, nx, ny), v = probe(x, y, -nx, -ny), wu = v[0], wv = u[0], ws = wu + wv;
      R[i] = (u[1] * wu + v[1] * wv) / ws; G[i] = (u[2] * wu + v[2] * wv) / ws; B[i] = (u[3] * wu + v[3] * wv) / ws; A[i] = (u[4] * wu + v[4] * wv) / ws;
    });
    // soften along the staff (the fill is made row by row across it, which leaves stripes)
    var ux = ax / al, uy = ay / al;
    for (var pass = 0; pass < 8; pass++) list.forEach(function (i) {
      var x = i % W, y = (i / W) | 0, r = R[i], g = G[i], b = B[i], aa = A[i], c = 1;
      for (var s2 = -2; s2 <= 2; s2++) { if (!s2) continue; var qx = Math.round(x + ux * s2), qy = Math.round(y + uy * s2); if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; var j = qy * W + qx; r += R[j]; g += G[j]; b += B[j]; aa += A[j]; c++; }
      R[i] = r / c; G[i] = g / c; B[i] = b / c; A[i] = aa / c;
    });
    list.forEach(function (i) {
      var al1 = A[i] < 0.45 ? 0 : Math.min(1, (A[i] - 0.45) / 0.3), k = A[i] > 1e-4 ? 1 / A[i] : 0;
      d[i * 4] = R[i] * k; d[i * 4 + 1] = G[i] * k; d[i * 4 + 2] = B[i] * k; d[i * 4 + 3] = al1 * 255;
    });
  }
  // Bits of a staff's head that the strip just missed are left floating in the body picture, cut off from the body:
  // a small piece of the body picture that is not joined to the body itself and touches the strip goes over to the staff.
  function adoptStrays(bd, sd, src, W, H, mask) {   // mask: the area worked on (widened strip)
    var n = W * H, lab = new Int32Array(n).fill(-1), sizes = [], near = [], stack = [], id = 0;
    function visit(j) { if (lab[j] < 0 && bd[j * 4 + 3] >= 40) { lab[j] = id; stack.push(j); } }
    for (var s = 0; s < n; s++) {
      if (lab[s] >= 0 || bd[s * 4 + 3] < 40) continue;
      id = sizes.length; var cnt = 0, nr = false; lab[s] = id; stack.push(s);
      while (stack.length) {
        var i = stack.pop(); cnt++; if (mask[i]) nr = true;
        var x = i % W, y = (i / W) | 0;
        if (x > 0) visit(i - 1); if (x < W - 1) visit(i + 1); if (y > 0) visit(i - W); if (y < H - 1) visit(i + W);
      }
      sizes.push(cnt); near.push(nr);
    }
    if (!sizes.length) return;
    var main = 0; for (var c = 1; c < sizes.length; c++) if (sizes[c] > sizes[main]) main = c;
    var moved = new Uint8Array(n);
    function take(o) { sd[o] = src[o]; sd[o + 1] = src[o + 1]; sd[o + 2] = src[o + 2]; sd[o + 3] = Math.max(sd[o + 3], src[o + 3]); bd[o + 3] = 0; }
    for (var p = 0; p < n; p++) { var l = lab[p]; if (l < 0 || l === main || !near[l] || sizes[l] > sizes[main] * 0.08) continue; take(p * 4); moved[p] = 1; }
    for (var q = 0; q < n; q++) {
      if (lab[q] >= 0 || bd[q * 4 + 3] === 0) continue;
      var x2 = q % W, y2 = (q / W) | 0;
      if ((x2 > 0 && moved[q - 1]) || (x2 < W - 1 && moved[q + 1]) || (y2 > 0 && moved[q - W]) || (y2 < H - 1 && moved[q + W])) take(q * 4);
    }
  }
  // Working out which pixel is which is the slow part (about a tenth of a second, more on a phone), so it is kept per
  // picture: the same costume (or the same look of the wizard) is cut the same way the next time.
  var memo = {}, memoKeys = [];
  function analyse(src, W, H, crop, rig) {
    var mask = staffMask(W, H, crop, rig), roi = widen(mask, W, H), before = new Uint8Array(W * H), fixI = [], fixA = [];
    for (var i = 0; i < W * H; i++) before[i] = src[i * 4 + 3];
    clearPockets(src, W, H, roi);
    for (var j = 0; j < W * H; j++) if (src[j * 4 + 3] !== before[j]) { fixI.push(j); fixA.push(src[j * 4 + 3]); }
    return { W: W, H: H, mask: mask, roi: roi, wide: widen(roi, W, H), fixI: fixI, fixA: fixA, lab: segment(src, W, H, roi, crop, rig, mask.raw) };
  }
  // canvas (the costume picture as the art loader cut it, or as the wizard is dressed), crop (its place in the 1254 px
  // source), rig, key (the picture's name, to keep the cut) -> { body, staff } canvases
  function splitStaff(canvas, crop, rig, key) {
    var W = canvas.width, H = canvas.height, g0 = canvas.getContext('2d'), src = g0.getImageData(0, 0, W, H);
    var an = key && memo[key] && memo[key].W === W && memo[key].H === H ? memo[key] : null;
    if (an) an.fixI.forEach(function (i, k) { src.data[i * 4 + 3] = an.fixA[k]; });
    else {
      an = analyse(src.data, W, H, crop, rig);
      if (key) { memo[key] = an; memoKeys.push(key); while (memoKeys.length > 6) delete memo[memoKeys.shift()]; }
    }
    var mask = an.mask, roi = an.roi, lab = an.lab;
    var staff = document.createElement('canvas'), body = document.createElement('canvas');
    staff.width = body.width = W; staff.height = body.height = H;
    var gs = staff.getContext('2d'), gb = body.getContext('2d'), sd = gs.createImageData(W, H), bd = gb.createImageData(W, H), hole = new Uint8Array(W * H);
    for (var i = 0; i < W * H; i++) {
      var o = i * 4, mine = lab[i] === 1;
      sd.data[o] = src.data[o]; sd.data[o + 1] = src.data[o + 1]; sd.data[o + 2] = src.data[o + 2]; sd.data[o + 3] = mine ? src.data[o + 3] : 0;
      bd.data[o] = src.data[o]; bd.data[o + 1] = src.data[o + 1]; bd.data[o + 2] = src.data[o + 2]; bd.data[o + 3] = src.data[o + 3];
      if (mine) hole[i] = 1;
    }
    // the faint edge of the staff (too see-through to be grown into) goes with it
    for (var j = 0; j < W * H; j++) {
      if (lab[j] || src.data[j * 4 + 3] === 0) continue;
      var x = j % W, y = (j / W) | 0;
      if ((x > 0 && lab[j - 1] === 1) || (x < W - 1 && lab[j + 1] === 1) || (y > 0 && lab[j - W] === 1) || (y < H - 1 && lab[j + W] === 1)) { sd.data[j * 4 + 3] = src.data[j * 4 + 3]; hole[j] = 1; }
    }
    // and one pixel around it, so no rim of the staff stays on the body
    var ringFill = hole.slice(), cutY = (rig.armL.p[1] - crop.y0) * (H / crop.ch);
    for (var k = 0; k < W * H; k++) { if (hole[k]) continue; var kx = k % W, ky = (k / W) | 0; if ((kx > 0 && hole[k - 1]) || (kx < W - 1 && hole[k + 1]) || (ky > 0 && hole[k - W]) || (ky < H - 1 && hole[k + W])) ringFill[k] = 2; }
    fillAcross(bd.data, W, H, ringFill, crop, rig, cutY);
    adoptStrays(bd.data, sd.data, src.data, W, H, an.wide);
    gs.putImageData(sd, 0, 0); gb.putImageData(bd, 0, 0);
    staff.crop = body.crop = canvas.crop || crop;
    return { body: body, staff: staff, mask: mask, lab: lab };
  }
  // (analyse: which pixel is the staff, for the tests — rgba pixels in, labels out: 1 staff, 2 body, 0 empty)
  return { splitStaff: splitStaff, staffMask: staffMask, staffLabels: function (rgba, W, H, crop, rig) { return analyse(rgba, W, H, crop, rig).lab; } };
});
