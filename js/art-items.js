// Painted item pictures (cut from the sheets in art-src/items by tools/cut-items.py) take the place of the drawn ones:
//   gear      art/gi-<kind>-<1..5>.webp   5 pictures per kind, low -> high. Six grades: 일반 shows picture 1 in grey,
//                                         고급·희귀·영웅·전설·신화 show pictures 1..5. Grade glow, I~IV marks and shine stay.
//   sigils    art/sg-<paw|bolt>-<0..10>   one picture per grade (일반 -> 멸망). Bolt for the critical and chain stats,
//                                         paw for attack, skill and boss damage; a small corner mark still tells the stat.
//   runes     art/rn-<id>-<1..3>          stone frame for 일반~전설, hexagon for 신화~불멸, gold for 천상~멸망
//   relics    art/rl-<id>
//   삼신기    art/dv-<id>-<1..3>          grows with stars: 0~6★, 7~13★, 14~20★
// Loaded after js/art-icons.js; anything without a picture keeps its drawn icon.
(function (root) {
  var CW = root.CW, I = CW.ICO, K = I.kit, D = CW.DATA, B = CW.ART_BASE || 'art/';
  function src(name) { return B + name + '.webp'; }
  function pic(name, cls, style) { return '<img class="ico pic ' + cls + '" src="' + src(name) + '" alt="" draggable="false"' + (style ? ' style="' + style + '"' : '') + '>'; }
  function clamp(v, lo, hi) { v = v | 0; return v < lo ? lo : v > hi ? hi : v; }

  // ---------- gear ----------
  var KINDS = ['staff', 'necklace', 'ear', 'ring', 'belt', 'hat', 'robe'];
  function gearPic(kind, grade) { return src('gi-' + kind + '-' + Math.max(1, clamp(grade, 0, 5))); }
  var gear0 = I.gear;
  I.gear = function (kind, grade, sub, img) {
    if (KINDS.indexOf(kind) < 0) return gear0(kind, grade, sub, img);
    grade = clamp(grade, 0, 5);
    // the drawn staff icon already carries the grade glow, the I~IV marks and the shine: keep those, swap the picture
    return gear0('staff', grade, sub).replace('class="gart ', 'class="gart gnew ')
      .replace(/<svg class="ico gstaff"[\s\S]*?<\/svg>/, '<img class="gimg gpic" src="' + gearPic(kind, grade) + '" alt="" draggable="false">');
  };
  if (CW.GEAR_IMG) KINDS.forEach(function (k) { CW.GEAR_IMG[k] = gearPic(k, 1); });

  // ---------- sigils (신성력) ----------
  var BOLT = { superRate: 1, ultraRate: 1, hyperRate: 1, megaRate: 1, critDmg: 1, superDmg: 1, weakDmg: 1, surgeDmg: 1 };
  var sigil0 = I.sigil, MARK = {};
  // the stat mark of the drawn sigil, shown small in the corner so sigils of one grade can still be told apart
  function mark(stat) {
    if (MARK[stat] === undefined) {
      var m = sigil0(stat, 0, '#8a8f99').match(/(?:<circle cx="[\d.]+" cy="34"[^>]*\/>)+|<path d="[^"]*" fill="#fff" fill-rule="evenodd"[^>]*\/>/);
      MARK[stat] = m ? m[0] : '';
    }
    return MARK[stat] ? '<svg class="sgmark" viewBox="16 18 32 32" aria-hidden="true"><circle cx="32" cy="34" r="14.5" fill="#2b1838" stroke="#fff" stroke-width="1.8"/>' + MARK[stat] + '</svg>' : '';
  }
  I.sigil = function (stat, grade, gcol, q) {
    var g = clamp(grade, 0, 10), band = g <= 1 ? 0 : g <= 3 ? 1 : g <= 5 ? 2 : g <= 7 ? 3 : 4;
    // q is given for a real sigil (bag, equipped, selected); package icons pass none and need no stat mark
    return '<span class="ico isg sgpic b' + band + '"><img src="' + src('sg-' + (BOLT[stat] ? 'bolt' : 'paw') + '-' + g) + '" alt="" draggable="false">' + (q !== undefined ? mark(stat) : '') + '</span>';
  };

  // ---------- runes ----------
  var RUNES = ['rFire', 'rWave', 'rWind', 'rEarth', 'rLight', 'rDark'], rune0 = I.rune;
  I.rune = function (id, color, grade, gcol) {
    if (RUNES.indexOf(id) < 0) return rune0(id, color, grade, gcol);
    var t = grade >= 8 ? 3 : grade >= 4 ? 2 : 1;
    return pic('rn-' + id + '-' + t, 'irune' + (grade >= 4 ? ' hi' : ''), '--gc:' + gcol);
  };

  // ---------- relics and the three star items ----------
  var RELICS = D.relics.map(function (r) { return r.id; }), DIVINE = ['staff', 'robe', 'charm'], misc0 = I.misc;
  function divineStep(id) {
    var s = root.GAME && root.GAME.state, d = s && s.divine && s.divine[id], f = d ? (d.star || 0) / D.divineConf.starMax : 0;
    return f >= 2 / 3 ? 3 : f >= 1 / 3 ? 2 : 1;
  }
  I.misc = function (cat, id) {
    if (cat === 'relic' && RELICS.indexOf(id) >= 0) return pic('rl-' + id, 'imisc p-relic');
    if (cat === 'divine' && DIVINE.indexOf(id) >= 0) return pic('dv-' + id + '-' + divineStep(id), 'imisc p-divine');
    return misc0(cat, id);
  };

  // ---------- looks (kept here so index.html needs only the script line) ----------
  if (typeof document !== 'undefined') {
    var css = document.createElement('style');
    css.textContent =
      '.gart.gnew .gimg.gpic{filter:drop-shadow(0 2px 2px rgba(0,0,0,.4))!important}' +
      '.gart.gnew.g0 .gimg.gpic{filter:grayscale(.9) brightness(1.05) drop-shadow(0 2px 2px rgba(0,0,0,.35))!important}' +
      '.gart.gnew.g4 .gimg.gpic{filter:drop-shadow(0 0 4px rgba(255,200,60,.7))!important}' +
      '.gart.gnew.g5 .gimg.gpic{filter:drop-shadow(0 0 5px rgba(255,80,110,.85))!important}' +
      '.ico.sgpic{position:relative}' +
      '.ico.sgpic>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;-webkit-user-drag:none;user-select:none}' +
      '.ico.sgpic .sgmark{position:absolute;left:-8%;bottom:-6%;width:42%;height:42%;overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.6))}';
    (document.body || document.head || document.documentElement).appendChild(css);
  }
})(this);
