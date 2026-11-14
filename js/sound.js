(function (root) {
  var CW = root.CW = root.CW || {};
  var ctx = null, enabled = true, master = null, last = {};
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return; ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination); } catch (e) { ctx = null; }
  }
  function tone(freq, dur, type, vol, slide, delay) {
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, hp) {
    var t = ctx.currentTime, n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = hp || 800; g.gain.value = vol || 0.2;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  var SOUNDS = {
    cast: function () { tone(660, 0.12, 'triangle', 0.12, 1.6); },
    hit: function () { noise(0.07, 0.12, 1500); },
    crit: function () { tone(880, 0.1, 'square', 0.08, 1.3); noise(0.1, 0.16, 900); },
    kill: function () { tone(520, 0.09, 'sine', 0.14, 1.8); },
    boss: function () { tone(110, 0.6, 'sawtooth', 0.18, 0.7); tone(165, 0.6, 'sawtooth', 0.12, 0.7); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.16, 1, i * 0.08); }); },
    lose: function () { tone(300, 0.4, 'triangle', 0.15, 0.5); },
    tier: function () { [392, 523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.3, 'triangle', 0.18, 1, i * 0.09); }); },
    pull: function () { tone(1200, 0.08, 'sine', 0.1, 1.4); },
    legend: function () { [523, 659, 784].forEach(function (f) { tone(f, 0.9, 'triangle', 0.14, 1); }); tone(1568, 0.6, 'sine', 0.1, 1.2, 0.2); },
    click: function () { tone(900, 0.04, 'sine', 0.06); }
  };
  // ---------- recorded sounds (2026-11-15): sfx/<group>-<n>.m4a, free CC0 packs (js/sfx-map.js says which skill uses which) ----------
  var bufs = {}, loading = false, voices = 0, lastPick = {}, MAX_VOICES = 10;
  function loadAll() {
    if (loading || !ctx || !CW.SFX_GROUPS) return; loading = true;
    Object.keys(CW.SFX_GROUPS).forEach(function (g) {
      bufs[g] = [];
      for (var i = 1; i <= CW.SFX_GROUPS[g]; i++) (function (g) {
        fetch('sfx/' + g + '-' + i + '.m4a').then(function (r) { return r.arrayBuffer(); })
          .then(function (a) { return new Promise(function (ok, bad) { ctx.decodeAudioData(a, ok, bad); }); })
          .then(function (b) { bufs[g].push(b); }).catch(function () { });
      })(g);
    });
  }
  // one variant of a group, not the same one twice in a row, slightly different pitch each time; vol 0..1
  function sample(g, vol, gap) {
    var list = bufs[g]; if (!list || !list.length || voices >= MAX_VOICES) return false;
    var now = performance.now(); if (last['s:' + g] && now - last['s:' + g] < (gap || 70)) return true; last['s:' + g] = now;
    var k = Math.floor(Math.random() * list.length); if (list.length > 1 && k === lastPick[g]) k = (k + 1) % list.length; lastPick[g] = k;
    var s = ctx.createBufferSource(), gn = ctx.createGain();
    s.buffer = list[k]; s.playbackRate.value = 0.94 + Math.random() * 0.12; gn.gain.value = vol === undefined ? 1 : vol;
    s.connect(gn); gn.connect(master); voices++; s.onended = function () { voices--; }; s.start();
    if (CW.sound.onSample) CW.sound.onSample(g, k, vol);   // test hook (a video with sound)
    return true;
  }
  function skillCast(id) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    var e = CW.SKILL_SFX && CW.SKILL_SFX[id]; if (e && e.cast) sample(e.cast, 0.7, 120);
  }
  function skillHit(id) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    var e = CW.SKILL_SFX && CW.SKILL_SFX[id]; if (!e) return;
    e.hit.forEach(function (g, i) { sample(g, i ? 0.6 : 0.95, 80); });
  }
  function play(name) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    if (name === 'cast') return;   // the skill's own cast sound plays from the effects (skillCast)
    // the plain hit and kill sounds are recordings now, quiet (no synth tick or beep)
    if (CW.BASIC && (name === 'hit' || name === 'kill')) { sample(CW.BASIC[name], name === 'hit' ? 0.25 : 0.32, 60); return; }
    var now = performance.now(); if (last[name] && now - last[name] < 45) return; last[name] = now;
    try { SOUNDS[name] && SOUNDS[name](); } catch (e) { }
  }
  var init0 = init; init = function () { init0(); loadAll(); };
  CW.sound = { init: init, play: play, skillCast: skillCast, skillHit: skillHit, setEnabled: function (v) { enabled = !!v; } };
})(this);
