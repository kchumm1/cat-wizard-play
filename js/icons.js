// One drawing style for every small picture in the menus: thick dark outline, flat bright colour, one soft highlight
// (the same sticker look as the hero and gear paintings). Skills, runes, sigils (신성력), gear grades and currencies
// are all drawn here so nothing depends on how a phone happens to render emoji.
(function (root) {
  var CW = root.CW = root.CW || {};
  var O = '#2b1838';
  function svg(inner, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 64 64" aria-hidden="true">' + inner + '</svg>'; }
  function sh(d, fill, w, extra) { return '<path d="' + d + '" fill="' + fill + '" stroke="' + O + '" stroke-width="' + (w || 3) + '" stroke-linejoin="round" stroke-linecap="round"' + (extra || '') + '/>'; }
  function hl(d, fill, op) { return '<path d="' + d + '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + '/>'; }
  function ln(d, col, w, cls) { w = w || 4; return '<path d="' + d + '" fill="none" stroke="' + O + '" stroke-width="' + (w + 3.5) + '" stroke-linecap="round" stroke-linejoin="round"/><path' + (cls ? ' class="' + cls + '"' : '') + ' d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function circ(x, y, r, fill, w) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '" stroke="' + O + '" stroke-width="' + (w === undefined ? 3 : w) + '"/>'; }
  function star(cx, cy, R, r, n, rot) {
    var d = '', a0 = (rot || 0) * Math.PI / 180 - Math.PI / 2;
    for (var i = 0; i < n * 2; i++) { var a = a0 + i * Math.PI / n, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(1) + ' ' + (cy + Math.sin(a) * q).toFixed(1); }
    return d + 'Z';
  }
  function hex(c) { c = String(c).replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(x[i] + (y[i] - x[i]) * t).toString(16)).slice(-2); }).join(''); }
  function lite(c, t) { return mix(c, '#ffffff', t); }
  function dark(c, t) { return mix(c, '#140a22', t); }
  function spark(x, y, r, col) { return '<path d="' + star(x, y, r, r * 0.32, 4) + '" fill="' + (col || '#fff') + '" stroke="' + O + '" stroke-width="1.2" stroke-linejoin="round"/>'; }

  // ---------- skills: the shape of the spell itself ----------
  var SK = {
    starShot: function () {
      return ln('M6 56L24 38M6 42l10-9M20 58l8-9', '#fff3a0', 3.5) + sh(star(40, 24, 19, 8.5, 5, 12), '#ffd93b') + hl(star(40, 24, 9, 4, 5, 12), '#fff6b8') + spark(14, 16, 6, '#fff') + spark(54, 52, 5, '#ffe873');
    },
    magicClaw: function () {
      var c = 'M0 0C16 8 23 24 19 46C15 30 8 15-5 7Z';
      return [[14, 8, '#ff5fc0'], [28, 6, '#ff8fd8'], [42, 8, '#ffc1ea']].map(function (p) { return '<g transform="translate(' + p[0] + ' ' + p[1] + ')">' + sh(c, p[2]) + '</g>'; }).join('') + spark(12, 50, 6) + spark(54, 14, 4.5, '#ffe0f5');
    },
    furBomb: function () {
      return ln('M40 20Q46 12 52 12', '#8a5a3c', 3) + sh(star(54, 10, 7, 3, 5), '#ffe14a', 2) + sh('M16 26l-3-13 12 6zM46 26l3-13-12 6z', '#ff9a4d') +
        sh(star(31, 39, 21, 17.5, 11, 8), '#ffc27d') + hl('M19 32a14 12 0 0 1 14-9a16 14 0 0 0-12 13z', '#ffe6c4') +
        '<circle cx="24" cy="39" r="2.6" fill="' + O + '"/><circle cx="38" cy="39" r="2.6" fill="' + O + '"/><path d="M27 45q2 3 4 0q2 3 4 0" fill="none" stroke="' + O + '" stroke-width="2.2" stroke-linecap="round"/>';
    },
    sparkRing: function () {
      return '<ellipse cx="32" cy="34" rx="21" ry="14" fill="none" stroke="' + O + '" stroke-width="12"/><ellipse cx="32" cy="34" rx="21" ry="14" fill="none" stroke="#7fe0ff" stroke-width="6.5"/><ellipse cx="32" cy="33" rx="21" ry="14" fill="none" stroke="#e6fbff" stroke-width="2" stroke-dasharray="16 26"/>' +
        spark(32, 34, 8, '#fff') + spark(12, 14, 6, '#bff2ff') + spark(54, 16, 4.5) + spark(50, 54, 5.5, '#bff2ff');
    },
    fireball: function () {
      return sh('M42 6c2 10 12 16 12 30a22 22 0 0 1-44 0c0-9 4-14 9-20 1 6 4 9 8 9 0-9 7-13 15-19z', '#ff5a1f') +
        sh('M36 30c2 5 8 8 8 14a12 12 0 0 1-24 0c0-5 2-7 5-10 1 3 3 5 5 5 0-4 3-6 6-9z', '#ffc23a', 2.2) + hl('M32 42c1 2 4 4 4 7a4.5 4.5 0 0 1-9 0c0-3 3-4 5-7z', '#fff5c4');
    },
    chainLightning: function () {
      return ln('M8 20l6 5-4 5 7 5M56 38l-6 4 3 6-6 3', '#8fe0ff', 2.6) + sh('M40 3L13 35h13L20 61 51 26H36z', '#ffe84a') + hl('M38 9L20 31h9z', '#fffbd0');
    },
    iceStorm: function () {
      var arms = ''; for (var i = 0; i < 6; i++) arms += '<g transform="rotate(' + (i * 60) + ' 32 32)">' + ln('M32 32V8M32 16l-6-5M32 16l6-5', '#bdf0ff', 3.2) + '</g>';
      return ln('M6 40A27 27 0 0 0 30 59M58 24A27 27 0 0 0 34 5', '#e8fbff', 2.4) + arms + sh(star(32, 32, 8, 7, 6), '#ffffff', 2);
    },
    meteorRain: function () {
      return ln('M8 34l10 8M30 6l8 7', '#ffe9a0', 2.6) + circ(21, 45, 4, '#ffb347', 2) + circ(41, 16, 3.4, '#ffb347', 2) +
        sh('M14 4L56 36 38 54Z', '#ffe14a') + hl('M20 10L48 34 40 42Z', '#fff7c0') + circ(45, 45, 12, '#ff8a3a') + hl('M39 40a8 8 0 0 1 9-4a10 10 0 0 0-7 8z', '#ffd0a0') +
        '<circle cx="48" cy="49" r="2.4" fill="#c8551a"/><circle cx="42" cy="50" r="1.5" fill="#c8551a"/>';
    },
    moonLaser: function () {
      return sh('M24 30L62 50V62L20 38Z', '#a9a2ff') + hl('M26 33L60 53V57L24 37Z', '#ffffff', 0.85) + sh('M30 5A17 17 0 1 0 45 33A13.5 13.5 0 1 1 30 5Z', '#f1efff') + hl('M22 12a12 12 0 0 0-3 13a14 14 0 0 1 5-14z', '#ffffff') + spark(50, 12, 5.5, '#fff') + spark(10, 52, 4, '#d8d4ff');
    },
    solarBurst: function () {
      return sh(star(32, 32, 30, 18, 12), '#ff9d1c') + circ(32, 32, 15, '#ffe25a') + hl('M22 28a11 11 0 0 1 12-7a13 13 0 0 0-10 10z', '#fffbd6') + '<circle cx="32" cy="32" r="6" fill="#fff6b0"/>';
    },
    blackHole: function () {
      var arms = ''; for (var i = 0; i < 3; i++) arms += '<g transform="rotate(' + (i * 120) + ' 32 32)"><path d="M32 7A25 25 0 0 1 55 22" fill="none" stroke="#e7c4ff" stroke-width="3.5" stroke-linecap="round"/><path d="M32 16A16 16 0 0 1 47 26" fill="none" stroke="#b46cff" stroke-width="3" stroke-linecap="round"/></g>';
      return circ(32, 32, 27, '#5a22b8') + arms + circ(32, 32, 10, '#0d0618', 2.5) + '<circle cx="32" cy="32" r="12.5" fill="none" stroke="#ffb8f4" stroke-width="2"/>' + spark(52, 10, 4.5) + spark(10, 54, 4, '#e7c4ff');
    },
    elementNova: function () {
      return sh(star(32, 32, 20, 9, 4, 45), '#ffffff', 2.5) + sh('M32 2L40 24 32 32 24 24Z', '#ff5a1f') + sh('M62 32L40 40 32 32 40 24Z', '#ffe14a') + sh('M32 62L24 40 32 32 40 40Z', '#5fd2ff') + sh('M2 32L24 24 32 32 24 40Z', '#b46cff') + circ(32, 32, 6.5, '#ffffff', 2.5);
    }
  };
  function skill(id) { return svg((SK[id] || SK.starShot)(), 'isk'); }

  // ---------- runes: a carved stone; the glyph is the element, the rim and studs are the grade ----------
  var GLYPH = {
    rFire: 'M32 19c5 6 9 9 9 15a9 9 0 0 1-18 0c0-4 2-6 4-9 1 3 2 4 4 4 0-4 0-6 1-10z',
    rWave: 'M19 27c4-5 8-5 13 0s9 5 13 0M19 38c4-5 8-5 13 0s9 5 13 0',
    rWind: 'M19 29h17a5 5 0 1 0-5-5M19 37h23a5 5 0 1 1-5 5',
    rEarth: 'M18 43l10-18 5 8 4-5 9 15z',
    rLight: 'M32 26a6 6 0 1 0 .01 0zM32 16v4M32 44v4M16 32h4M44 32h4M21 21l3 3M40 40l3 3M43 21l-3 3M24 40l-3 3',
    rDark: 'M37 19a13 13 0 1 0 8 20a11 11 0 0 1-8-20z'
  };
  var CORNERS = [[32, 9], [50, 19], [50, 45], [32, 55], [14, 45], [14, 19]];
  function rune(id, color, grade, gcol) {
    var s = '';
    if (grade >= 6) s += '<circle class="orb" cx="32" cy="32" r="30" fill="none" stroke="' + gcol + '" stroke-width="1.6" stroke-dasharray="4 5"/>';
    if (grade >= 10) s += '<circle class="orb rev" cx="32" cy="32" r="27" fill="none" stroke="#ffd0a0" stroke-width="1.2" stroke-dasharray="2 7"/>';
    s += sh('M32 4L54 16V48L32 60L10 48V16Z', grade >= 8 ? dark(gcol, 0.72) : '#4a4560') + hl('M32 8L14 18V33L32 22Z', '#ffffff', 0.13) + hl('M32 56L50 46V34L32 46Z', '#000000', 0.18);
    s += '<path d="M32 9L50 19V45L32 55L14 45V19Z" fill="none" stroke="' + gcol + '" stroke-width="2.2" stroke-linejoin="round"/>';
    s += '<path class="glyph" d="' + GLYPH[id] + '" fill="' + color + '" fill-opacity=".28" stroke="' + color + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="' + GLYPH[id] + '" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>';
    for (var i = 0; i < Math.min(6, grade); i++) s += '<circle cx="' + CORNERS[i][0] + '" cy="' + CORNERS[i][1] + '" r="2.6" fill="' + lite(gcol, 0.45) + '" stroke="' + O + '" stroke-width="1.1"/>';
    if (grade >= 8) s += sh('M23 7l4 4 5-9 5 9 4-4v8H23z', lite(gcol, 0.25), 1.6);
    return svg(s, 'irune' + (grade >= 4 ? ' hi' : ''));
  }

  // ---------- sigils (신성력): a holy gem. The cut and its trimmings are the grade, the mark inside is the stat ----------
  var EMB = {
    superRate: function () { return star(32, 34, 9.5, 3.6, 4); }, ultraRate: function () { return star(32, 34, 9.5, 4, 5); },
    hyperRate: function () { return star(32, 34, 9.5, 4.6, 6); }, megaRate: function () { return star(32, 34, 9.5, 5.4, 8); },
    critDmg: function () { return 'M41 24l1 6-9 9-3-3 9-9zM26 34l6 6-2 2-2-2-4 4-2-2 4-4-2-2z'; },
    superDmg: function () { return 'M36 23l-9 12h5l-3 10 10-13h-5z'; },
    skillDmg: function () { return star(30, 36, 9, 3, 4) + star(39.5, 26.5, 4.5, 1.6, 4); },
    bossDmg: function () { return 'M21 26c0 9 4 14 11 14s11-5 11-14c-3 4-5 5-8 5h-6c-3 0-5-1-8-5zM28 35a1.6 1.6 0 1 0 .01 0zM36 35a1.6 1.6 0 1 0 .01 0z'; },
    atkPct: function () { return 'M32 32c4 0 7 3 7 6.5S36 44 32 44s-7-2-7-5.5S28 32 32 32zM25 27a2.7 2.7 0 1 0 .01 0zM32 24a2.7 2.7 0 1 0 .01 0zM39 27a2.7 2.7 0 1 0 .01 0z'; }
  };
  function rings(xs) { return xs.map(function (x) { return '<circle cx="' + x + '" cy="34" r="' + (xs.length > 2 ? 4 : 5) + '" fill="none" stroke="' + O + '" stroke-width="5.4"/>'; }).join('') + xs.map(function (x) { return '<circle cx="' + x + '" cy="34" r="' + (xs.length > 2 ? 4 : 5) + '" fill="none" stroke="#fff" stroke-width="2.6"/>'; }).join(''); }
  var CUT = ['M32 18a16 16 0 1 0 .01 0Z', 'M32 13L51 34 32 56 13 34Z', 'M32 14l17 10v20L32 54 15 44V24z', null, null];
  var WING = 'M17 27C9 17 1 20 1 30c3-2 5-2 7 0-2 3-1 7 3 9 0-4 2-6 6-6z';
  function sigil(stat, grade, gcol, q) {
    var band = grade <= 1 ? 0 : grade <= 3 ? 1 : grade <= 5 ? 2 : grade <= 7 ? 3 : 4, odd = grade === 1 || grade === 3 || grade === 5 || grade === 7 || grade >= 9;
    var cut = band === 3 ? star(32, 34, 21, 14.5, 8) : band === 4 ? star(32, 34, 23, 16, 12) : CUT[band], s = '';
    if (band >= 3) s += sh(WING, band === 4 ? lite(gcol, 0.7) : '#ffffff', 2) + '<g transform="translate(64 0) scale(-1 1)">' + sh(WING, band === 4 ? lite(gcol, 0.7) : '#ffffff', 2) + '</g>';
    if (grade >= 10) s += '<path class="orb" d="' + star(32, 34, 30, 24, 12, 15) + '" fill="none" stroke="#ffb0a0" stroke-width="1.4" stroke-linejoin="round"/>';
    s += sh(cut, gcol) + '<g transform="translate(32 34) scale(.66) translate(-32 -34)">' + hl(cut, lite(gcol, 0.3)) + '</g>' + hl('M32 34L18 34 32 ' + (band ? 16 : 20) + 'Z', '#ffffff', 0.22) + hl('M32 34L46 34 32 ' + (band ? 53 : 49) + 'Z', '#000000', 0.16);
    if (band >= 2) s += '<ellipse cx="32" cy="8" rx="10" ry="3.4" fill="none" stroke="' + O + '" stroke-width="4.6"/><ellipse cx="32" cy="8" rx="10" ry="3.4" fill="none" stroke="#ffe9a0" stroke-width="2.2"/>';
    if (band >= 4) s += sh('M24 13l3 4 5-8 5 8 3-4v8H24z', '#ffd84a', 1.6);
    s += stat === 'chain2' ? rings([28, 36]) : stat === 'chain3' ? rings([25, 32, 39]) : '<path d="' + (EMB[stat] || EMB.atkPct)() + '" fill="#fff" fill-rule="evenodd" stroke="' + O + '" stroke-width="1.7" stroke-linejoin="round"/>';
    if (odd) s += spark(51, 16, 4.5) + spark(13, 52, 3.5);
    if (q !== undefined) { var n = q < 0.2 ? 1 : q < 0.4 ? 2 : q < 0.6 ? 3 : q < 0.85 ? 4 : 5; for (var i = 0; i < n; i++) s += '<circle cx="' + (32 + (i - (n - 1) / 2) * 6) + '" cy="60.5" r="2.2" fill="#ffe14a" stroke="' + O + '" stroke-width="1"/>'; }
    return svg(s, 'isg b' + band);
  }

  // ---------- gear: every grade has its own motif behind the item, every step I~IV adds trimmings; staffs are drawn per grade ----------
  var GCOL = ['#a3a7ad', '#4fc46a', '#3d8bfd', '#a259ff', '#ff9f1c', '#ff4d6d'];
  function motif(grade, sub, plain) {
    var c = GCOL[grade], s = '';
    if (sub >= 3) s += '<circle cx="32" cy="32" r="27" fill="none" stroke="' + c + '" stroke-width="1.6" opacity=".7"' + (sub >= 4 ? ' stroke-dasharray="3 4" class="orb"' : '') + '/>';
    if (plain && grade >= 3) s += '<circle cx="32" cy="32" r="22" fill="' + c + '" opacity=".22"/>';
    else if (grade === 1) s += sh('M10 52C4 42 10 34 20 36C20 46 16 50 10 52Z', '#6bd47c', 2) + sh('M54 52C60 42 54 34 44 36C44 46 48 50 54 52Z', '#4fc46a', 2) + (sub >= 2 ? sh('M32 8C26 14 28 20 32 22C36 20 38 14 32 8Z', '#8fe89a', 2) : '');
    else if (grade === 2) s += [[10, 16, 6], [54, 20, 5], [12, 50, 5], [52, 52, 6]].slice(0, 2 + Math.min(2, sub - 1)).map(function (p) { return sh('M' + p[0] + ' ' + (p[1] - p[2] * 1.5) + 'L' + (p[0] + p[2]) + ' ' + p[1] + 'L' + p[0] + ' ' + (p[1] + p[2] * 1.5) + 'L' + (p[0] - p[2]) + ' ' + p[1] + 'Z', '#8fd0ff', 1.8); }).join('');
    else if (grade === 3) s += sh('M46 4A19 19 0 1 0 60 36A15 15 0 1 1 46 4Z', '#c9a2ff', 2) + spark(12, 14, 5, '#e9d6ff') + (sub >= 2 ? spark(10, 48, 4, '#fff') : '');
    else if (grade === 4) s += sh(star(32, 32, 31, 22, 12 + (sub - 1) * 2), '#e8741a', 2) + '<circle cx="32" cy="32" r="21" fill="#7a3a08" opacity=".55"/>';
    else if (grade === 5) {
      var w = 'M30 34C20 12 6 8 2 18c4 0 6 2 7 5-4 1-5 5-3 9 3-2 6-1 8 2-2 3-1 6 2 8 4-6 9-7 14-8z';
      s += sh(w, '#ff6f8a', 2) + '<g transform="translate(64 0) scale(-1 1)">' + sh(w, '#ff6f8a', 2) + '</g>' + '<ellipse cx="32" cy="7" rx="11" ry="3.6" fill="none" stroke="' + O + '" stroke-width="4.6"/><ellipse cx="32" cy="7" rx="11" ry="3.6" fill="none" stroke="#ffe14a" stroke-width="2.2"/>';
    }
    if (sub >= 2) s += spark(54, 10, 3.6 + sub * 0.5, grade ? lite(c, 0.6) : '#fff');
    if (sub >= 4) s += spark(9, 30, 4, '#fff');
    return s;
  }
  function pips(grade, sub) { var s = ''; for (var i = 0; i < sub; i++) s += '<path d="M58 ' + (44 - i * 9) + 'l4 4.5-4 4.5-4-4.5z" fill="' + lite(GCOL[grade], 0.35) + '" stroke="' + O + '" stroke-width="1.3" stroke-linejoin="round"/>'; return s; }
  var STAFF = [
    function () { return ln('M18 58L36 26', '#a9794c', 4.5) + ln('M36 26q2-8 9-8', '#a9794c', 3) + sh(star(47, 15, 8, 3.6, 5), '#f4e7a8', 2); },
    function () { return ln('M18 58L36 24', '#8a5a3c', 4.5) + ln('M36 24c-6-10 4-18 12-12', '#8a5a3c', 3.4) + circ(43, 17, 6.5, '#5ce07a', 2.4) + hl('M40 14a4 4 0 0 1 4-2a5 5 0 0 0-3 4z', '#d6ffd9') + sh('M26 38C18 36 16 30 18 26C24 28 27 32 26 38Z', '#6bd47c', 2); },
    function () { return ln('M18 58L37 25', '#c9d4e6', 4.5) + ln('M33 22l-2-10M44 28l10-2', '#c9d4e6', 3) + sh('M44 6L54 18 44 30 34 18Z', '#4f9bff') + hl('M44 10L38 18h6z', '#cfe6ff') + ln('M24 47l4 2', '#4f9bff', 2.4); },
    function () { return ln('M18 58L35 28', '#4a2a78', 4.5) + sh('M46 4A16 16 0 1 0 58 31A12.5 12.5 0 1 1 46 4Z', '#c9a2ff') + sh(star(46, 19, 6.5, 2.8, 5), '#ffe14a', 1.8) + ln('M23 49l5 3', '#ffd84a', 2.4); },
    function () { return ln('M18 58L34 30', '#e0a81c', 4.8) + sh(star(43, 19, 17, 10.5, 10), '#ffb21c') + circ(43, 19, 8.5, '#ffe873', 2.4) + circ(43, 19, 3.6, '#ff4d6d', 1.6) + ln('M22 50l5 3M26 43l5 3', '#fff0b0', 2.2); },
    function () { return ln('M18 58L34 30', '#c22a4a', 4.8) + sh(star(44, 18, 15, 6.8, 5), '#ff4d6d') + hl(star(44, 18, 7, 3.2, 5), '#ffd0d8') + sh('M38 3l3 3 3-5 3 5 3-3v6H38z', '#ffd84a', 1.5) + ln('M22 50l5 3M26 43l5 3', '#ffd84a', 2.2); }
  ];
  // recolour a gear painting for each grade: gold trim stays gold, every other colour takes the grade's hue
  function rgb2hsv(r, g, b) { var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx / 255]; }
  function hsv2rgb(h, s, v) { h = ((h % 360) + 360) % 360; var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0; if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; } return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; }
  var TINT = {}, LOADING = {}, HUE = [[0, 0.08], [128, 0.75], [214, 0.9], [276, 0.85], [38, 1], [348, 1]];
  function tintLoad(kind, src) {
    if (LOADING[kind] || typeof Image === 'undefined') return; LOADING[kind] = 1;
    var im = new Image();
    im.onload = function () {
      try {
        var w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
        var g = c.getContext('2d'); g.drawImage(im, 0, 0); var base = g.getImageData(0, 0, w, h);
        for (var gr = 0; gr < 6; gr++) {
          var d = new ImageData(new Uint8ClampedArray(base.data), w, h), p = d.data, H = HUE[gr][0], S = HUE[gr][1];
          for (var i = 0; i < p.length; i += 4) {
            if (!p[i + 3]) continue;
            var hsv = rgb2hsv(p[i], p[i + 1], p[i + 2]);
            var gold = hsv[0] > 28 && hsv[0] < 62 && hsv[1] > 0.4 && hsv[2] > 0.62;
            if (hsv[1] < 0.16) continue;
            var o = gr === 0 ? hsv2rgb(hsv[0], hsv[1] * (gold ? 0.12 : 0.1), hsv[2]) : gold && gr !== 4 ? null : hsv2rgb(gr === 4 ? 30 + (hsv[0] % 30) * 0.5 : H + (hsv[0] % 40 - 20) * 0.35, Math.min(1, hsv[1] * S + (gr >= 4 ? 0.1 : 0)), Math.min(1, hsv[2] * (gr >= 4 ? 1.08 : 1)));
            if (o) { p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2]; }
          }
          g.putImageData(d, 0, 0); TINT[kind + gr] = c.toDataURL('image/png');
        }
        if (CW.ICO.onTint) CW.ICO.onTint();
      } catch (e) { for (var k = 0; k < 6; k++) TINT[kind + k] = null; }
    };
    im.onerror = function () { for (var k = 0; k < 6; k++) TINT[kind + k] = null; };
    im.src = src;
  }
  function gear(kind, grade, sub, img) {
    grade = Math.max(0, Math.min(5, grade | 0)); sub = Math.max(1, Math.min(4, sub | 0 || 1));
    var tinted = TINT[kind + grade];
    if (img && kind !== 'staff' && tinted === undefined) tintLoad(kind, img);
    var item = kind === 'staff' || !img ? null : '<img class="gimg' + (tinted ? ' tinted' : '') + '" src="' + (tinted || img) + '" alt="" draggable="false">';
    return '<span class="gart g' + grade + ' s' + sub + '">' + svg(motif(grade, sub, kind === 'staff'), 'gback') + (item || svg(STAFF[grade](), 'gstaff')) + svg(pips(grade, sub), 'gpips') + (sub >= 4 || grade >= 5 ? '<i class="gshine"></i>' : '') + '</span>';
  }

  // ---------- currencies ----------
  var CUR = {
    rune: function () { return sh('M32 5L54 17V47L32 59L10 47V17Z', '#7a5cd6') + '<path d="M32 18v28M22 26l10 8 10-8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'; },
    sigil: function () { return sh('M32 4L56 32 32 60 8 32Z', '#5fd2ff') + hl('M32 12L18 32h14z', '#e2f8ff') + sh(star(32, 32, 9, 3.6, 4), '#fff', 2); },
    mana: function () { return sh('M32 4C44 20 52 30 52 40a20 20 0 0 1-40 0C12 30 20 20 32 4Z', '#4f9bff') + hl('M24 30c-4 6-5 12-2 17c-1-7 1-11 6-17z', '#d6ebff'); }
  };
  function cur(k) { return svg(CUR[k](), 'icur'); }

  CW.ICO = { skill: skill, rune: rune, sigil: sigil, gear: gear, cur: cur, svg: svg };
})(this);
