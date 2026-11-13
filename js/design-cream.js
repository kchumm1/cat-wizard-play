// Cream/champagne design pack (2026-11-14, art-src/design-cream, made by tools/apply-design-icons.py).
// 1) The training pictures: growth, talents, marks, potions, the training tab, the mana stone, the lock and the cauldron
//    use art/tr-<name>.webp. Keys are the game's; names are the pack's file names (manifest.json says which is which).
// 2) One small mark per region for the top stage bar (flower for the flower field, mushroom for the forest, ...).
(function (root) {
  var MAP = {
    stat: { atk: 'growth-atk', speed: 'growth-speed', crit: 'growth-crit', critDmg: 'growth-crit-dmg', gold: 'growth-gold', mastery: 'growth-mastery',
      superCrit: 'growth-super-crit', ultraCrit: 'growth-ultra-crit', hyperCrit: 'growth-hyper-crit', megaCrit: 'growth-mega-crit', megaDmg: 'growth-mega-dmg',
      ultimateCrit: 'growth-ultimate-crit', ultimateDmg: 'growth-ultimate-dmg', alphaCrit: 'growth-alpha-crit', alphaDmg: 'growth-alpha-dmg' },
    talent: { tSkill: 'talent-mana-focus', tBoss: 'talent-boss-hunter', tCrit: 'talent-sharp-claws', tChain: 'talent-weak-point',
      tGold: 'talent-golden-whiskers', tXp: 'talent-curious-eyes', tChain3: 'talent-surge' },
    mark: { mStar: 'mark-star', mClaw: 'mark-claw', mMoon: 'mark-moon', mComet: 'mark-comet', mCrown: 'mark-crown', mBook: 'mark-book' },
    potion: { rage: 'potion-rage', luck: 'potion-luck', wisdom: 'potion-wisdom' },
    tab: { up: 'menu-training' },
    cur: { mana: 'currency-mana' },
    pic: { lock: 'state-lock', cauldron: 'alchemy-cauldron' }
  };

  // ---------- region marks: little stickers with one warm brown outline ----------
  var O = '#5c4330';
  // outline layer (the shapes drawn fat in brown) under the fill layer, so touching shapes share one outline
  function sticker(shapes, fill, w) { return '<g fill="' + O + '" stroke="' + O + '" stroke-width="' + (w || 3.4) + '" stroke-linejoin="round" stroke-linecap="round">' + shapes + '</g><g fill="' + fill + '">' + shapes + '</g>'; }
  function line(d, color, w) { return '<path d="' + d + '" fill="none" stroke="' + O + '" stroke-width="' + (w + 2.6) + '" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function dot(x, y, r, c) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '"/>'; }
  var STAR = 'M16 3 18.3 8.8 24.6 9.2 19.7 13.2 21.3 19.3 16 15.9 10.7 19.3 12.3 13.2 7.4 9.2 13.7 8.8Z';
  var MARKS = [
    // 0 flower field: pink flower with a leaf
    sticker('<path d="M7 28C7 22 12 21 16 24C13 28 9 29 7 28Z"/>', '#7cc45a') +
      sticker('<circle cx="16" cy="8.5" r="5.6"/><circle cx="22.2" cy="13" r="5.6"/><circle cx="19.8" cy="20.3" r="5.6"/><circle cx="12.2" cy="20.3" r="5.6"/><circle cx="9.8" cy="13" r="5.6"/>', '#ff9cc2') +
      '<circle cx="16" cy="15" r="3.8" fill="#ffd34d" stroke="' + O + '" stroke-width="1.8"/>' + dot(14.8, 13.8, 1.1, '#fff6c8'),
    // 1 mushroom forest: red cap with white dots
    sticker('<path d="M11 17V25C11 28.5 21 28.5 21 25V17Z"/>', '#fff1d6') + sticker('<path d="M3.5 18C3.5 9.5 9.5 4 16 4S28.5 9.5 28.5 18Z"/>', '#ef5a4c') +
      dot(10.5, 12, 2.3, '#fff') + dot(18.5, 9, 1.9, '#fff') + dot(23, 14, 1.7, '#fff') + dot(15.5, 15, 1.4, '#fff'),
    // 2 desert: cactus with a little flower
    sticker('<rect x="12.5" y="6" width="7" height="22" rx="3.5"/><rect x="5.5" y="10" width="3.8" height="9" rx="1.9"/><rect x="5.5" y="15.4" width="8" height="3.8" rx="1.9"/><rect x="22.7" y="8" width="3.8" height="9" rx="1.9"/><rect x="18.5" y="13.4" width="8" height="3.8" rx="1.9"/>', '#6cc25a') +
      '<path d="M16 9V25" stroke="#4f9c42" stroke-width="1.4" stroke-linecap="round"/>' + '<circle cx="16" cy="5.6" r="2.6" fill="#ff8fb8" stroke="' + O + '" stroke-width="1.6"/>',
    // 3 ice cave: blue crystal
    sticker('<path d="M16 3 23 11 20.5 28H11.5L9 11Z"/>', '#9be3ff') + '<path d="M16 3 16 28M9 11H23M16 11 12 28M16 11 20 28" fill="none" stroke="#5fb6e6" stroke-width="1.2"/>' +
      '<path d="M12 7 10.2 11" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' + '<path d="M26 4V8M24 6H28" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
    // 4 volcano: flame
    sticker('<path d="M16 3C20 9 26 12 25 20C24 26 20 29 16 29S8 26 7 20C6 14 11 12 12 7C14 10 14 12 16 13C17 10 17 6 16 3Z"/>', '#ff7a2e') +
      '<path d="M16 16C19 19 21 21 20 24.5S12.5 27.5 12 24.5C11.5 21 14 20 16 16Z" fill="#ffd34d"/>',
    // 5 starlight lake: star over a wave
    sticker('<path d="M3 24C7 20.5 11 28 16 24.5S25 20.5 29 24.5V29H3Z"/>', '#6fb8f0') + sticker('<path d="' + STAR + '"/>', '#ffd84a') +
      '<path d="M7 26.6C9 25.4 11 27.6 13 26.6" fill="none" stroke="#d6f0ff" stroke-width="1.3" stroke-linecap="round"/>',
    // 6 moon garden: crescent moon with a sparkle
    sticker('<path d="M19 4A12 12 0 1 0 28 21A9.2 9.2 0 1 1 19 4Z"/>', '#ffe18a') + '<circle cx="11" cy="15" r="1.6" fill="#f3c454"/><circle cx="14" cy="23" r="1.2" fill="#f3c454"/>' +
      '<path d="M25 6V11M22.5 8.5H27.5" stroke="#fff4c4" stroke-width="1.8" stroke-linecap="round"/>',
    // 7 sun temple: sun with rays
    line('M16 3V6.5M16 25.5V29M3 16H6.5M25.5 16H29M6.8 6.8 9.3 9.3M22.7 22.7 25.2 25.2M6.8 25.2 9.3 22.7M22.7 9.3 25.2 6.8', '#ffa630', 3) +
      sticker('<circle cx="16" cy="16" r="7.2"/>', '#ffd23f') + dot(13.6, 13.6, 1.8, '#fff3b8'),
    // 8 galaxy: purple spiral with stars
    line('M16 16C16 12.5 21.5 12.5 21.5 16.5C21.5 22 12 23 10 17C8 10.5 15.5 5 22.5 7.5', '#a985ff', 3.4) + dot(16, 16, 2.4, '#ffe9ff') +
      '<path d="M25 18V22M23 20H27" stroke="#ffd84a" stroke-width="1.6" stroke-linecap="round"/>' + dot(6, 8, 1.3, '#ffd84a') + dot(26, 27, 1.1, '#ffd84a'),
    // 9 demon castle: purple castle with a red flag
    sticker('<path d="M16 6V1.8L21 3.4 16 5Z"/>', '#ff4f6a', 2.8) + sticker('<path d="M5 28V14H8.5V11H11.5V14H13V9.5L16 6 19 9.5V14H20.5V11H23.5V14H27V28Z"/>', '#8b6fd0') +
      '<path d="M13 28V22.5A3 3 0 0 1 19 22.5V28Z" fill="#3d2a5c"/>' + dot(9.5, 19, 1.3, '#ffd84a') + dot(22.5, 19, 1.3, '#ffd84a')
  ];
  var MORE = sticker('<path d="M16 3 19 13 29 16 19 19 16 29 13 19 3 16 13 13Z"/>', '#ecc77a');   // regions added later
  function regionMark(i) { return '<svg viewBox="0 0 32 32" aria-hidden="true">' + (MARKS[i] || MORE) + '</svg>'; }
  // The colour at the very top of each region's battle field (measured 2026-11-14: middle of the top 62pt over three stages).
  // In the iPhone home-screen app a solid band of it sits behind the clock (tools/build-site.cjs #topcap): an iPhone then fills
  // the clock area with that colour instead of laying its blurred glass over the top of the game.
  var TOP = ['#729d57', '#537a4f', '#9c935b', '#bfd0dc', '#3c2927', '#2d4986', '#5c675a', '#aa9675', '#363560', '#2e232f'];
  function regionTop(i) { return TOP[i] || '#2e232f'; }

  var api = { MAP: MAP, regionMark: regionMark, regionTop: regionTop };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  var CW = root.CW, I = CW && CW.ICO; if (!I) return;
  var B = CW.ART_BASE || 'art/';
  function img(name, cls) { return '<img class="ico pic ' + cls + '" src="' + B + 'tr-' + name + '.webp" alt="" draggable="false">'; }
  var stat0 = I.stat, misc0 = I.misc, cur0 = I.cur, pic0 = I.pic, MISC = ['talent', 'mark', 'potion', 'tab'];
  I.stat = function (k) { return MAP.stat[k] ? img(MAP.stat[k], 'imisc tr') : stat0(k); };
  I.misc = function (cat, id) { return MISC.indexOf(cat) >= 0 && MAP[cat][id] ? img(MAP[cat][id], 'imisc tr p-' + cat) : misc0(cat, id); };
  I.cur = function (k) { return MAP.cur[k] ? img(MAP.cur[k], 'icur tr') : cur0(k); };
  I.pic = function (name, cls) { return MAP.pic[name] ? img(MAP.pic[name], (cls || '') + ' tr') : pic0(name, cls); };
  I.region = regionMark;
  I.regionTop = regionTop;
})(this);
