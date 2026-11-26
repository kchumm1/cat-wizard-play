// Painted item pictures (cut from the sheets in art-src/items by tools/cut-items.py) take the place of the drawn ones:
//   gear      art/gi-<kind>-<1..5>.webp   5 pictures per kind, low -> high. Six grades: 일반 shows picture 1 in grey,
//                                         고급·희귀·영웅·전설·신화 show pictures 1..5. Grade glow, I~IV marks and shine stay.
//   sigils    art/sg-<paw|bolt>-<0..10>   one picture per grade (일반 -> 멸망). Bolt for the critical and chain stats,
//                                         paw for attack, skill and boss damage; a small corner mark still tells the stat.
//   runes     art/rn-<id>-<1..3>          stone frame for 일반~전설, hexagon for 신화~불멸, gold for 천상~멸망
//   relics    art/rl-<id>
//   삼신기    art/dv2-<id>                one picture (2026-11-17 user parts, tools/import-divine-parts.py); stars only add glow (s2 7~13★, s3 14~20★)
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
  // 태초·불멸·혼돈·멸망 (grades 6..9, 2026-11-15): until the user's pictures come they show the 신화 picture and frame
  // with their own grade colour around it (class gx gx6..gx9 in index.html). When pictures art/gi-<kind>-6..9.webp
  // arrive, list the grades here and they are used instead.
  // 혼돈 (8) and 멸망 (9) came 2026-11-15 as four pictures each, one per step I..IV: art/gi-<kind>-<grade>-<1..4>.webp
  // (tools/cut-gear-doom.py; 혼돈 is the 멸망 picture turned purple).
  var NEW_PICS = [], STEP_PICS = [8, 9];
  I.gear = function (kind, grade, sub, img) {
    if (KINDS.indexOf(kind) < 0) return gear0(kind, grade, sub, img);
    var real = clamp(grade, 0, 9), pic = STEP_PICS.indexOf(real) >= 0 ? src('gi-' + kind + '-' + real + '-' + clamp(sub, 1, 4))
      : NEW_PICS.indexOf(real) >= 0 ? src('gi-' + kind + '-' + real) : gearPic(kind, real);
    grade = clamp(grade, 0, 5);
    // the drawn staff icon already carries the grade glow, the I~IV marks and the shine: keep those, swap the picture
    return gear0('staff', grade, sub).replace('class="gart ', 'class="gart gnew ' + (real > 5 ? 'gx gx' + real + ' gk-' + kind + ' ' : ''))
      .replace(/<svg class="ico gstaff"[\s\S]*?<\/svg>/, '<img class="gimg gpic" src="' + pic + '" alt="" draggable="false">');
  };
  if (CW.GEAR_IMG) KINDS.forEach(function (k) { CW.GEAR_IMG[k] = gearPic(k, 1); });
  // 원판·장식 없이 그림 파일만 (오팔 전시대용, 2026-11-16): I.gear와 같은 파일 고르기
  I.gearSrc = function (kind, grade, sub) {
    if (KINDS.indexOf(kind) < 0) return null;
    var real = clamp(grade, 0, 9);
    return STEP_PICS.indexOf(real) >= 0 ? src('gi-' + kind + '-' + real + '-' + clamp(sub, 1, 4)) : NEW_PICS.indexOf(real) >= 0 ? src('gi-' + kind + '-' + real) : gearPic(kind, real);
  };

  // ---------- 성장 아이콘 (사용자 부품, 2026-11-16, tools/import-growth-parts.py 가 아래 목록을 고침) ----------
  var GROW_ART = ['alphaCrit', 'alphaDmg', 'arcane', 'atk', 'catEye', 'crit', 'critDmg', 'doomClaw', 'elemRule', 'eternalCrit', 'eternalDmg', 'genesisCrit', 'genesisDmg', 'gold', 'haste', 'hyperCrit', 'hyperDmg', 'judge', 'manaBurst', 'mastery', 'megaCrit', 'megaDmg', 'omegaCrit', 'omegaDmg', 'origin', 'resonance', 'rift', 'speed', 'superCrit', 'superDmg', 'ultimateCrit', 'ultimateDmg', 'ultraCrit', 'ultraDmg'];
  // 크리티컬 (2026-11-17, 치명타 다음 단계): 새 그림이 오기 전까지 치명타 계열 그림을 같이 씀 (성장·특성·룬·신성력)
  var ALIAS = { criticalCrit: 'crit', criticalDmg: 'critDmg', tcCriticalR: 'tcCritR', tcCriticalD: 'tcCritD', rCriticalR: 'rCritR', rCriticalD: 'rWave', criticalRate: 'superRate', criticalDmgPct: 'critDmg' };
  var al = function (k) { return ALIAS[k] || k; };
  I.growArt = function (k) { k = al(k); return GROW_ART.indexOf(k) >= 0 ? 'art/gro-' + k + '.webp' : null; };

  // ---------- 특성 아이콘 (사용자 부품, 2026-11-16, tools/import-talent-parts.py 가 아래 목록을 고침) ----------
  var TAL_ART = ['tBoss', 'tChain', 'tChain3', 'tCrit', 'tGold', 'tManaBurst', 'tOrigin', 'tRift', 'tSkill', 'tXp', 'tcAlphaD', 'tcAlphaR', 'tcCritD', 'tcCritR', 'tcEterD', 'tcEterR', 'tcGenD', 'tcGenR', 'tcHyperD', 'tcHyperR', 'tcMegaD', 'tcMegaR', 'tcOmegaD', 'tcOmegaR', 'tcSuperD', 'tcSuperR', 'tcUltiD', 'tcUltiR', 'tcUltraD', 'tcUltraR'];
  I.talentArt = function (id) { id = al(id); return TAL_ART.indexOf(id) >= 0 ? 'art/tal-' + id + '.webp' : null; };

  // ---------- 코스튬 새 원화 19종 (사용자, 2026-11-16, tools/import-costumes.py) ----------
  // 메뉴 전시·목록에만 쓰는 그림 (전투 캐릭터 모습은 그대로). 캔버스 1254 기준 발(알파 맨 아래) 위치 — 전시 때 발을 받침대에 맞춤
  var COS_FEET = { aurora: 1197, basic: 1200, blossom: 1187, celestial: 1204, chaos: 1190, cheese: 1203, doom: 1189, doomClock: 1200, doomDragon: 1210,
    doomFrost: 1200, doomHoly: 1189, doomNight: 1201, doomPlume: 1190, doomPrism: 1204, doomRose: 1203, ember: 1216, forest: 1219, midnight: 1189, royal: 1215,
    // 멸망 외형 열 벌 (2026-11-23, tools/cut-doom-sheets.py: 860칸 캔버스의 발 835)
    doomBell: 1218, doomDiver: 1218, doomPuppet: 1218, doomPotter: 1218, doomBinder: 1218, doomTailor: 1218, doomConductor: 1218, doomPilgrim: 1218, doomSurveyor: 1218, doomProjector: 1218 };
  // small: 목록 카드용 (투명 여백을 잘라 낸 240px). 그림이 없는 새 코스튬은 null → 예전 방식 썸네일
  I.cosArt = function (id, small) {
    if (!COS_FEET[id]) return null;
    return 'art/cos-' + id + (small ? '-s' : '') + '.webp';
  };
  // 전시 그림을 발 기준으로 맞출 때 올릴 비율 (캔버스 높이 대비, doomPrism 1204 = 0)
  // 스킬 새 원화 (사용자 2026-11-16, tools/import-skill-parts.py): 21종만 새 그림, 나머지는 null → 예전 아이콘
  // 10차 나무 4종 (2026-11-16, 로컬 ComfyUI, 사용자 고름 3232): rootSpikes·flytrap·leafBlades·worldTree
  // 11차 물 4종 (2026-11-17, 사용자 GPT 그림, tools/cut-water-cards.py): tidalWave·bubblePrison·waterBurst·skyFalls
  // 12차 바람 4종 (2026-11-25): 형 GPT 그림이 오기 전까지 tools/wind-temp-art.py 임시 그림
  var SK2 = ['galeSlash', 'sonicArrow', 'downdraft', 'airBomb', 'tidalWave', 'bubblePrison', 'waterBurst', 'skyFalls', 'rootSpikes', 'flytrap', 'leafBlades', 'worldTree', 'ballLightning', 'chainLightning', 'cometStrike', 'fireball', 'flamePillar', 'flameWave', 'frostNova', 'furBomb', 'glacierSpikes', 'iceLance', 'iceStorm', 'inferno', 'magicClaw', 'meteorRain', 'pawStamp', 'sparkRing', 'starDust', 'starShot', 'stormCloud', 'thunderStrike', 'yarnBall',
    // 5~9차 18종 (2026-11-23, 코덱스 그림 art-src/ai-review/2026-11-23-skill-icons, tools/import-skill-icons-5to9.py): 이제 모든 스킬이 새 그림
    'starBarrage', 'constellation', 'moonLaser', 'crescentWave', 'moonFall', 'moonOrbs', 'solarBurst', 'sunSpear', 'sunArrows', 'coronaRing',
    'blackHole', 'voidRift', 'gravityCrush', 'darkStar', 'elementNova', 'elementStorm', 'prismBeam', 'elementWheel'];
  I.skillArt = function (id) { return SK2.indexOf(id) >= 0 ? (CW.ART_BASE || 'art/') + 'sk2-' + id + '.webp' : null; };
  I.cosFeetShift = function (id) { return COS_FEET[id] ? (COS_FEET[id] - 1204) / 1254 : 0; };

  // ---------- 룬·신성력 새 원화 (사용자 부품 2026-11-17, tools/import-rune-sigil-parts.py) ----------
  // 그림은 종류(룬 id / 신성력 옵션 stat)마다 하나, 등급은 따로 얹는 등급 테두리(gf-00..10, 일반 → 멸망).
  // 예전 그림(sg-paw/bolt-<등급>, rn-<id>-<1..3>)은 목록에 없는 id 가 올 때만 쓰임.
  var SG2 = ['superRate', 'ultraRate', 'hyperRate', 'megaRate', 'critDmg', 'superDmg', 'skillDmg', 'bossDmg', 'weakDmg', 'surgeDmg', 'atkPct', 'hyperDmg', 'megaDmg',
    'alphaDmg', 'ultimateRate', 'alphaRate', 'ultraDmg', 'ultimateDmg', 'omegaRate', 'omegaDmg', 'eternalRate', 'eternalDmg', 'genesisRate', 'genesisDmg'];
  var RN2 = ['rFire', 'rWind', 'rEarth', 'rDark', 'rOrigin', 'rWave', 'rLight', 'rBolt', 'rNebula', 'rComet', 'rUltraD', 'rUltiD', 'rCritR', 'rSuperR', 'rUltraR',
    'rHyperR', 'rMegaR', 'rUltiR', 'rAlphaR', 'rOmegaR', 'rOmegaD', 'rEterR', 'rEterD', 'rGenR', 'rGenD'];
  I.sigilSrc = function (stat) { stat = al(stat); return SG2.indexOf(stat) >= 0 ? src('sg2-' + stat) : null; };
  I.runeSrc = function (id) { id = al(id); return RN2.indexOf(id) >= 0 ? src('rn2-' + id) : null; };
  I.gradeFrameSrc = function (g) { g = clamp(g, 0, 10); return src('gf-' + (g < 10 ? '0' : '') + g); };
  // 룬·신성력·삼신기 화면에 <img>로 들어가는 그림 전부 (ui.js 가 시작 뒤 미리 불러 둠, 2026-11-18 형: 룬·신성력 들어가면 가끔 늦게 나옴)
  I.menuItemPics = function () {
    var out = RN2.map(function (k) { return src('rn2-' + k); }).concat(SG2.map(function (k) { return src('sg2-' + k); }));
    for (var g = 0; g <= 10; g++) out.push(I.gradeFrameSrc(g));
    return out.concat(DIVINE.map(function (k) { return src('dv2-' + k); }));
  };
  // 다른 메뉴에 <img>로 들어가는 그림: 성장·특성·스킬·유물·코스튬 목록 카드 (같은 날 형: 전체적으로 늦게 뜨는 화면 없게)
  I.menuOtherPics = function () {
    var A = B, f = function (pre) { return function (k) { return A + pre + k + '.webp'; }; };
    return GROW_ART.map(f('gro-')).concat(TAL_ART.map(f('tal-')), SK2.map(f('sk2-')), RELICS.map(f('rl-')),
      Object.keys(COS_FEET).map(function (k) { return A + 'cos-' + k + '-s.webp'; }));
  };
  // bg: 목록 칸과 같은 바탕 그림 (사용자 2026-11-17 「요걸로 다 통일」) — 룬 art/ru-orb(보석 원판), 신성력 art/si-cardbg(별빛 카드).
  // 바탕이 없을 때(패키지 아이콘)만 등급 테두리.
  // crossorigin: 룬·신성력 그림·등급 테두리는 무대 반짝임 마스크(CORS)와 같은 방식으로 받아 메모리 칸을 같이 씀 (ui.js runeArt 위 설명).
  // 바탕(ru-orb·si-cardbg)은 CSS 바탕으로도 쓰여 일반 방식 그대로

  function framed(cls, art, grade, bg) {
    return '<span class="ico ' + cls + (bg ? ' onbg' : '') + '"><img class="' + (bg ? 'gbg' : 'gfr') + '" src="' + (bg || I.gradeFrameSrc(grade)) + '" alt=""' + (bg ? '' : ' crossorigin="anonymous"') + ' draggable="false"><img class="gart" src="' + art + '" alt="" crossorigin="anonymous" draggable="false"></span>';
  }

  // ---------- sigils (신성력) ----------
  var BOLT = { superRate: 1, ultraRate: 1, hyperRate: 1, megaRate: 1, critDmg: 1, superDmg: 1, weakDmg: 1, surgeDmg: 1 };
  // every crit option (2026-11-16) uses the bolt picture
  ((CW.DATA && CW.DATA.critTiers) || []).forEach(function (t) { BOLT[t.rate] = 1; BOLT[t.dmg] = 1; });
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
    if (I.sigilSrc(stat)) return framed('isg2 b' + band, I.sigilSrc(stat), g, q !== undefined ? src('si-cardbg') : null);   // 옵션 그림 + (실제 신성력) 별빛 카드 / (패키지) 등급 테두리
    // q is given for a real sigil (bag, equipped, selected); package icons pass none and need no stat mark
    return '<span class="ico isg sgpic b' + band + '"><img src="' + src('sg-' + (BOLT[stat] ? 'bolt' : 'paw') + '-' + g) + '" alt="" draggable="false">' + (q !== undefined ? mark(stat) : '') + '</span>';
  };

  // ---------- runes ----------
  var RUNES = ['rFire', 'rWave', 'rWind', 'rEarth', 'rLight', 'rDark', 'rBolt', 'rNebula', 'rComet', 'rOrigin'], rune0 = I.rune; // the last four: tools/make-new-runes.py
  I.rune = function (id, color, grade, gcol) {
    if (I.runeSrc(id)) return framed('irn2', I.runeSrc(id), grade, src('ru-orb'));   // 룬 그림 + 보석 원판
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
    // 2026-11-17 사용자 삼신기 부품: 새 원화 한 장(art/dv2-<id>, tools/import-divine-parts.py)을 모든 자리에 — 별 단계는 빛으로만 (s2·s3)
    if (cat === 'divine' && DIVINE.indexOf(id) >= 0) return pic('dv2-' + id, 'imisc p-divine s' + divineStep(id), 'object-fit:contain');
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
      // 혼돈·멸망 pictures are detailed and thin (the user, 2026-11-15: "too small"): they fill nearly the whole cell
      '.gart.gnew.gx8 .gimg.gpic,.gart.gnew.gx9 .gimg.gpic{left:2%!important;top:2%!important;width:96%!important;height:96%!important}' +
      // the staff leans to the upper right: drawn bigger and pushed toward the top-right corner (the user, 2026-11-15)
      '.gart.gnew.gk-staff.gx8 .gimg.gpic,.gart.gnew.gk-staff.gx9 .gimg.gpic{left:6%!important;top:-7%!important;width:114%!important;height:114%!important}' +
      '.ico.sgpic{position:relative}' +
      '.ico.sgpic>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;-webkit-user-drag:none;user-select:none}' +
      '.ico.sgpic .sgmark{position:absolute;left:-8%;bottom:-6%;width:42%;height:42%;overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.6))}' +
      // 새 룬·신성력 그림: 등급 테두리(뒤) + 원화(앞). 테두리는 빈 투명 선이라 그림을 가리지 않게 원화보다 크게, 원화는 안쪽 72%
      '.ico.isg2,.ico.irn2{position:relative;display:block;width:100%;height:100%;filter:none!important}' +
      '.ico.isg2>img,.ico.irn2>img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;-webkit-user-drag:none;user-select:none;-webkit-touch-callout:none;pointer-events:none}' +
      '.ico.isg2>.gart,.ico.irn2>.gart{left:14%;top:14%;width:72%;height:72%;filter:drop-shadow(0 2px 3px rgba(60,40,120,.28))}' +
      '.ico.irn2.onbg>.gbg{border-radius:50%;box-shadow:0 2px 5px rgba(110,80,180,.22)}.ico.irn2.onbg>.gart{left:21%;top:20%;width:58%;height:58%}' +
      '.ico.isg2.onbg>.gbg{border-radius:18%;object-fit:fill}.ico.isg2.onbg>.gart{left:12%;top:12%;width:76%;height:76%}';
    (document.body || document.head || document.documentElement).appendChild(css);
  }
})(this);
