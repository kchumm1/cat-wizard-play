// Which sound each skill makes (2026-11-15). The files are sfx/<group>-<n>.m4a (tools/make-sfx.cjs, free CC0 packs).
// cast: when the spell leaves the paw (optional) · hit: when it lands — each landing plays one of these groups.
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // group → how many variants there are
  var SFX_GROUPS = { fire: 5, ice: 5, bolt: 5, water: 3, boom: 5, bigboom: 2, beam: 3, zap: 3, shimmer: 3, whoosh: 3, hum: 2, punch: 3, claw: 3, thud: 3, shatter: 3, tap: 3, pop: 3 };
  var SKILL_SFX = {
    starShot: { hit: ['shimmer'] }, magicClaw: { hit: ['claw'] }, furBomb: { hit: ['boom'] }, sparkRing: { hit: ['shimmer'] },
    pawStamp: { hit: ['thud', 'punch'] }, yarnBall: { hit: ['thud'] }, starDust: { hit: ['shimmer'] },
    fireball: { cast: 'whoosh', hit: ['fire'] }, flamePillar: { hit: ['fire'] }, flameWave: { cast: 'whoosh', hit: ['fire'] }, inferno: { cast: 'whoosh', hit: ['fire', 'boom'] },
    chainLightning: { hit: ['bolt'] }, thunderStrike: { hit: ['bolt', 'boom'] }, stormCloud: { hit: ['bolt'] }, ballLightning: { hit: ['bolt'] },
    iceStorm: { hit: ['ice'] }, iceLance: { hit: ['ice', 'shatter'] }, frostNova: { hit: ['ice'] }, glacierSpikes: { hit: ['shatter', 'ice'] },
    meteorRain: { hit: ['bigboom', 'boom'] }, cometStrike: { cast: 'whoosh', hit: ['bigboom', 'boom'] }, starBarrage: { hit: ['zap'] }, constellation: { cast: 'shimmer', hit: ['boom'] },
    moonLaser: { hit: ['beam'] }, crescentWave: { hit: ['water'] }, moonFall: { hit: ['bigboom'] }, moonOrbs: { hit: ['zap'] },
    solarBurst: { hit: ['bigboom', 'fire'] }, sunSpear: { cast: 'beam', hit: ['boom'] }, sunArrows: { hit: ['zap'] }, coronaRing: { cast: 'whoosh', hit: ['fire'] },
    blackHole: { cast: 'hum', hit: ['bigboom'] }, voidRift: { cast: 'hum', hit: ['boom'] }, gravityCrush: { hit: ['bigboom', 'thud'] }, darkStar: { hit: ['boom'] },
    elementNova: { hit: ['bigboom', 'fire'] }, elementStorm: { hit: ['fire', 'ice', 'bolt'] }, prismBeam: { cast: 'beam', hit: ['bigboom'] }, elementWheel: { hit: ['fire', 'ice', 'bolt', 'water'] },
    phoenixDive: { cast: 'whoosh', hit: ['fire'] }, featherRain: { cast: 'whoosh', hit: ['fire'] }, rebirthFlame: { cast: 'whoosh', hit: ['fire', 'bigboom'] }, phoenixWings: { cast: 'whoosh', hit: ['fire'] }
  };
  // the plain hit and kill sounds (they replaced the synth tick and beep)
  var BASIC = { hit: 'tap', kill: 'pop' };
  function sfxFiles() { var out = []; for (var g in SFX_GROUPS) for (var i = 1; i <= SFX_GROUPS[g]; i++) out.push('sfx/' + g + '-' + i + '.m4a'); return out; }
  return { SFX_GROUPS: SFX_GROUPS, SKILL_SFX: SKILL_SFX, BASIC: BASIC, sfxFiles: sfxFiles };
});
