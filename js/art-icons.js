// Painted pictures (cut from the sheets in art-src/new by tools/cut-skills.py and tools/cut-menus.py) take the place of
// the drawn icons wherever one exists; anything without a picture keeps its drawn icon.
(function (root) {
  var CW = root.CW, I = CW.ICO, B = CW.ART_BASE || 'art/';
  function img(file, cls, style) { return '<img class="ico pic ' + cls + '" src="' + B + file + '.webp" alt="" draggable="false"' + (style ? ' style="' + style + '"' : '') + '>'; }
  var SKILLS = ['starShot', 'magicClaw', 'furBomb', 'sparkRing', 'fireball', 'chainLightning', 'iceStorm', 'meteorRain', 'moonLaser', 'solarBurst', 'blackHole', 'elementNova',
    'pawStamp', 'yarnBall', 'starDust', 'flamePillar', 'flameWave', 'inferno', 'thunderStrike', 'stormCloud', 'ballLightning', 'iceLance', 'frostNova', 'glacierSpikes',
    'cometStrike', 'starBarrage', 'constellation', 'crescentWave', 'moonFall', 'moonOrbs', 'sunSpear', 'sunArrows', 'coronaRing', 'voidRift', 'gravityCrush', 'darkStar',
    'elementStorm', 'prismBeam', 'elementWheel'];
  var MISC = ['tab:battle', 'tab:up', 'tab:skill', 'tab:gear', 'tab:gacha', 'tab:dungeon', 'tab:more', 'talent:tSkill', 'talent:tBoss', 'talent:tCrit',
    'potion:rage', 'potion:luck', 'potion:wisdom', 'mark:mStar', 'mark:mClaw', 'mark:mMoon', 'mark:mComet', 'mark:mCrown', 'dungeon:gold', 'dungeon:mana', 'dungeon:gem', 'dungeon:rune'];
  var RUNES = ['rFire', 'rWave', 'rWind', 'rEarth', 'rLight', 'rDark'];
  var skill0 = I.skill, misc0 = I.misc, rune0 = I.rune;
  I.skill = function (id) { return SKILLS.indexOf(id) >= 0 ? img('sk-' + id, 'isk') : skill0(id); };
  I.misc = function (cat, id) { return MISC.indexOf(cat + ':' + id) >= 0 ? img('ui-' + cat + '-' + id, 'imisc p-' + cat) : misc0(cat, id); };
  I.rune = function (id, color, grade, gcol) { return RUNES.indexOf(id) >= 0 ? img('ui-rune-' + id, 'irune', '--gc:' + gcol) : rune0(id, color, grade, gcol); };
  I.pic = function (name, cls) { return img('ui-' + name, cls || ''); };
  CW.UI_ART = function (name) { return B + 'ui-' + name + '.webp'; };
})(this);
