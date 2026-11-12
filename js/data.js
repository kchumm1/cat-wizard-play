(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var DATA = {
    regions: [
      { name: '꽃밭', sky: 0xbfe8ff, ground: 0x8fd16a, accent: 0xff9fc8, monsters: ['M1', 'M2'], miniBoss: 'K1', boss: { art: 'B1', name: '사나운 불독' } },
      { name: '버섯 숲', sky: 0xa8dcc8, ground: 0x5f9f62, accent: 0xff6b5b, monsters: ['M3', 'M4'], miniBoss: null, boss: { art: 'B2', name: '박쥐 백작' } },
      { name: '사막', sky: 0xffe2b0, ground: 0xe8c27a, accent: 0xffb347, monsters: ['M5', 'M6'], miniBoss: null, boss: { art: 'B3', name: '거대 독수리' } },
      { name: '얼음 동굴', sky: 0xcfe6ff, ground: 0xeef6ff, accent: 0x7fd3ff, monsters: ['M7', 'M8'], miniBoss: null, boss: { art: 'B4', name: '설원 늑대' } },
      { name: '화산', sky: 0x4a1e1e, ground: 0x5a2a20, accent: 0xff6a2b, monsters: ['M9', 'M10'], miniBoss: null, boss: { art: 'B5', name: '불꽃 도마뱀' } },
      { name: '별빛 호수', sky: 0x1d2550, ground: 0x34407a, accent: 0x9fd8ff, monsters: ['M11', 'M12'], miniBoss: null, boss: { art: 'B6', name: '호수 악어' } },
      { name: '달의 정원', sky: 0x2c2448, ground: 0x4a6a5a, accent: 0xe6e6ff, monsters: ['M13', 'M14'], miniBoss: null, boss: { art: 'B7', name: '공포의 부엉이' } },
      { name: '태양 신전', sky: 0xfff1c9, ground: 0xe8c27a, accent: 0xffd84a, monsters: ['M15', 'M16'], miniBoss: null, boss: { art: 'B8', name: '황금 하이에나' } },
      { name: '은하', sky: 0x120f2a, ground: 0x2a2650, accent: 0xb58cff, monsters: ['M17', 'M18'], miniBoss: null, boss: { art: 'B9', name: '우주 뱀' } },
      { name: '마왕성', sky: 0x1e1530, ground: 0x3a2a50, accent: 0xff3b5c, monsters: ['M19', 'M20'], miniBoss: null, boss: { art: 'B10', name: '늑대 왕' } }
    ],
    // After the last boss, a harder difficulty opens: stages start again at 1-1 with far tougher monsters
    difficulties: [
      { name: '일반', hpMul: 1, bossMul: 1, extraMobs: 0, gemMul: 1 },
      { name: '슬레이어 킹', hpMul: 2, bossMul: 30, extraMobs: 2, gemMul: 2 },
      { name: '루나틱', hpMul: 4, bossMul: 900, extraMobs: 4, gemMul: 3 },
      { name: '어드밴스', hpMul: 8, bossMul: 27000, extraMobs: 6, gemMul: 4 },
      { name: '엘리멘탈', hpMul: 16, bossMul: 810000, extraMobs: 8, gemMul: 5 }
    ],
    tiers: [
      { name: '견습 냥법사', skill: null, aura: 0 },
      { name: '불꽃 냥법사', skill: 'fireball', aura: 0 },
      { name: '번개 냥법사', skill: 'chainLightning', aura: 1 },
      { name: '얼음 냥법사', skill: 'iceStorm', aura: 1 },
      { name: '별빛 냥법사', skill: 'meteorRain', aura: 2 },
      { name: '달빛 냥법사', skill: 'moonLaser', aura: 2 },
      { name: '태양 냥법사', skill: 'solarBurst', aura: 3 },
      { name: '은하 냥법사', skill: 'blackHole', aura: 3 },
      { name: '전설의 대마법냥', skill: 'elementNova', aura: 4 }
    ],
    skills: [
      { id: 'starShot', name: '별 탄환', tier: 1, dur: 0.6, mult: 1.0, targets: 1, shape: 'bolt3', status: null, color: 0xfff27a },
      { id: 'magicClaw', name: '마법 발톱', tier: 1, dur: 0.55, mult: 1.1, targets: 1, shape: 'slash', status: null, color: 0xff8fd8 },
      { id: 'furBomb', name: '털뭉치 폭탄', tier: 1, dur: 0.8, mult: 1.2, targets: 2, shape: 'bounceBomb', status: null, color: 0xffb36b },
      { id: 'sparkRing', name: '반짝 고리', tier: 1, dur: 0.7, mult: 0.9, targets: 3, shape: 'orbitRing', status: null, color: 0x9fe8ff },
      { id: 'fireball', name: '화염구', tier: 2, dur: 0.75, mult: 1.7, targets: 2, shape: 'fireball', status: null, color: 0xff6a2b },
      { id: 'chainLightning', name: '연쇄 번개', tier: 3, dur: 0.7, mult: 2.1, targets: 4, shape: 'chain', status: 'shock', color: 0x9fd8ff },
      { id: 'iceStorm', name: '얼음 폭풍', tier: 4, dur: 0.9, mult: 2.5, targets: 99, shape: 'blizzard', status: 'freeze', color: 0xbfefff },
      { id: 'meteorRain', name: '별똥별 비', tier: 5, dur: 0.95, mult: 3.1, targets: 99, shape: 'meteors', status: null, color: 0xffe14a },
      { id: 'moonLaser', name: '달빛 레이저', tier: 6, dur: 0.9, mult: 3.8, targets: 99, shape: 'beam', status: null, color: 0xd8d8ff },
      { id: 'solarBurst', name: '태양 폭발', tier: 7, dur: 1.0, mult: 4.6, targets: 99, shape: 'flash', status: null, color: 0xffd84a },
      { id: 'blackHole', name: '블랙홀', tier: 8, dur: 1.0, mult: 5.5, targets: 99, shape: 'vortex', status: 'gather', color: 0xb04bff },
      { id: 'elementNova', name: '원소 합체 궁극기', tier: 9, dur: 1.0, mult: 7, targets: 99, shape: 'nova', status: null, color: 0xffffff }
    ],
    // relics: each copy raises the level; per = bonus per level (fractions, 0.05 = +5%)
    relics: [
      { id: 'pawHammer', name: '말랑 발바닥 망치', stat: 'atkPct', per: 0.05, icon: '🔨', desc: '공격력' },
      { id: 'catEye', name: '고양이 눈 구슬', stat: 'critRate', per: 0.001, icon: '🔮', desc: '치명타 확률' },
      { id: 'clawRing', name: '은빛 발톱 반지', stat: 'critDmg', per: 0.03, icon: '💍', desc: '치명타 피해' },
      { id: 'starFeather', name: '별가루 깃털', stat: 'superRate', per: 0.001, icon: '🪶', desc: '슈퍼 크리티컬 확률' },
      { id: 'moonBell', name: '달빛 방울', stat: 'superDmg', per: 0.02, icon: '🔔', desc: '슈퍼 크리티컬 피해' },
      { id: 'hunterBadge', name: '사냥꾼 휘장', stat: 'bossDmg', per: 0.02, icon: '🎖️', desc: '보스 피해' },
      { id: 'grassCharm', name: '풀잎 부적', stat: 'normalDmg', per: 0.02, icon: '🍀', desc: '일반 몬스터 피해' },
      { id: 'bookmark', name: '마도서 책갈피', stat: 'skillDmg', per: 0.02, icon: '📖', desc: '스킬 피해' },
      { id: 'piggyBank', name: '금화 저금통', stat: 'goldMul', per: 0.02, icon: '🐷', desc: '골드 획득' },
      { id: 'sleepyPillow', name: '졸린 베개', stat: 'xpMul', per: 0.01, icon: '🛏️', desc: '경험치 획득' },
      { id: 'windChime', name: '바람 풍경', stat: 'speed', per: 0.002, icon: '🎐', desc: '공격 속도' },
      { id: 'cometShard', name: '고대 혜성 조각', stat: 'ultraRate', per: 0.002, icon: '☄️', desc: '울트라 크리티컬 확률', divine: true },
      { id: 'galaxyDaggers', name: '은하 쌍단검', stat: 'ultraDmg', per: 0.06, icon: '🗡️', desc: '울트라 크리티컬 피해', divine: true },
      { id: 'dawnCrystal', name: '태초의 수정', stat: 'hyperRate', per: 0.002, icon: '💎', desc: '하이퍼 크리티컬 확률', divine: true },
      { id: 'hourglass', name: '시간의 모래시계', stat: 'hyperDmg', per: 0.08, icon: '⏳', desc: '하이퍼 크리티컬 피해', divine: true },
      { id: 'kingScepter', name: '고양이 왕의 홀', stat: 'atkPct', per: 0.3, icon: '👑', desc: '공격력', divine: true }
    ],
    // costumes change the wizard's look; owning one (and levelling it) gives a bonus whether worn or not
    // eleven grades used by sigils, runes and costumes (gear keeps its own six)
    hiGrades: [
      { name: '일반', color: '#a3a7ad' }, { name: '희귀', color: '#3d8bfd' }, { name: '영웅', color: '#a259ff' }, { name: '전설', color: '#ff9f1c' },
      { name: '신화', color: '#ff4d6d' }, { name: '고대', color: '#c8a25a' }, { name: '태초', color: '#2fd6b3' }, { name: '불멸', color: '#ffc21a' },
      { name: '천상', color: '#e45cff' }, { name: '혼돈', color: '#7b3cff' }, { name: '멸망', color: '#ff2a3a' }
    ],
    // costumes change the wizard's look; owning one (and levelling it) gives a bonus whether worn or not. One per grade, in grade order.
    costumes: [
      // fx: the costume's own aura while worn — col/col2 colours, aura (strength of the glow that hugs the outline), glow (soft light behind),
      // parts + rate (gentle particles); horns/eyes are painted only while the drawn picture is still loading
      { id: 'basic', name: '별빛 견습복', desc: '처음 받은 견습 마법사 옷', art: 'hero', outfit: null, grade: 0, stat: 'atkPct', per: 0.05, price: 0, fx: null },
      { id: 'blossom', name: '서리 기사단', desc: '은빛 갑옷 둘레로 서리 기운이 은은하게 피어올라요', art: 'cos1', outfit: { h: 205, s: 0.55, v: 1 }, grade: 1, stat: 'xpMul', per: 0.04, price: 300,
        fx: { col: 0x9fe0ff, col2: 0xffffff, aura: 0.45, glow: 0.2, parts: 'frost', rate: 4 } },
      { id: 'forest', name: '그림자 추적자', desc: '붉은 그림자 기운이 몸을 감싸는 암살자', art: 'cos2', outfit: { h: 255, s: 0.3, v: 0.45 }, grade: 2, stat: 'normalDmg', per: 0.06, price: 700,
        fx: { col: 0xff3355, col2: 0x7a3acf, aura: 0.5, glow: 0.22, parts: 'shadow', rate: 4 } },
      { id: 'cheese', name: '화염 군주', desc: '몸 둘레로 불꽃 기운이 일렁이는 진홍 갑옷', art: 'cos3', outfit: { h: 358, s: 0.85, v: 0.85 }, grade: 3, stat: 'goldMul', per: 0.08, price: 1500,
        fx: { col: 0xff6a1a, col2: 0xffd84a, aura: 0.55, glow: 0.25, parts: 'ember', rate: 5 } },
      { id: 'midnight', name: '뇌신의 갑주', desc: '푸른 번개 기운이 감도는 갑주', art: 'cos4', outfit: { h: 222, s: 0.9, v: 0.8 }, grade: 4, stat: 'critDmg', per: 0.15, price: 3000,
        fx: { col: 0x6fd8ff, col2: 0xffffff, aura: 0.6, glow: 0.25, parts: 'spark', rate: 5 } },
      { id: 'ember', name: '고대 룬 수호자', desc: '황금빛 룬 기운이 흐르는 청동 갑옷', art: 'cos5', outfit: { h: 32, s: 0.55, v: 0.6 }, grade: 5, stat: 'bossDmg', per: 0.12, price: 6000,
        fx: { col: 0xffc24a, col2: 0x5ff4ff, aura: 0.65, glow: 0.28, parts: 'rune', rate: 5 } },
      { id: 'aurora', name: '태초의 정령왕', desc: '초록 생명의 기운이 피어오르는 정령 로브', art: 'cos6', outfit: { h: 158, s: 0.8, v: 0.75 }, grade: 6, stat: 'skillDmg', per: 0.15, price: 12000,
        fx: { col: 0x3ff0b0, col2: 0xd8ffe8, aura: 0.7, glow: 0.3, parts: 'leaf', rate: 6 } },
      { id: 'royal', name: '불멸의 황제', desc: '황금 불꽃 기운을 두른 황제의 갑옷', art: 'cos7', outfit: { h: 44, s: 0.95, v: 0.6 }, grade: 7, stat: 'atkPct', per: 0.4, price: 22000,
        fx: { col: 0xffb02e, col2: 0xff4a1a, aura: 0.75, glow: 0.32, parts: 'ember', rate: 6 } },
      { id: 'celestial', name: '천상의 대천사', desc: '성스러운 빛이 은은하게 감싸는 흰 갑옷', art: 'cos8', outfit: { h: 48, s: 0.12, v: 1.25 }, grade: 8, stat: 'superDmg', per: 0.3, price: 40000,
        fx: { col: 0xfff2b0, col2: 0xffffff, aura: 0.8, glow: 0.3, parts: 'light', rate: 7 } },
      { id: 'chaos', name: '혼돈의 마왕', desc: '보랏빛 혼돈의 기운이 소용돌이치는 마왕 갑옷', art: 'cos9', outfit: { h: 275, s: 0.9, v: 0.42 }, grade: 9, stat: 'finalPct', per: 0.03, price: 70000,
        fx: { col: 0xa04bff, col2: 0xff6bf0, aura: 0.85, glow: 0.35, parts: 'void', rate: 7, horns: true, eyes: 0xd27bff } },
      { id: 'doom', name: '멸망의 군주', desc: '핏빛 지옥 기운이 타오르는 악마 갑옷', art: 'cos10', outfit: { h: 356, s: 0.95, v: 0.38 }, grade: 10, stat: 'finalPct', per: 0.05, price: 120000,
        fx: { col: 0xff2a2a, col2: 0xff8a2a, aura: 0.9, glow: 0.38, parts: 'doom', rate: 8, horns: true, eyes: 0xff3030 } }
    ],
    // enhance with diamonds: cost = upBase × upGrowth^grade × (1 + lv × upLv); a star every starEvery levels (+starBonus each);
    // every owned costume adds collect to all damage
    costumeConf: { maxLv: 50, upBase: 20, upGrowth: 1.6, upLv: 0.15, starEvery: 10, starBonus: 0.1, collect: 0.05 },
    // shop packages (practice only, no real payment)
    packs: [
      { id: 'runeS', name: '룬석 꾸러미', won: 5900, icon: '🔮', give: { runeStone: 1500 } },
      { id: 'runeL', name: '룬 승급 상자', won: 33000, icon: '🔮', give: { runeStone: 12000 } },
      { id: 'sigilA', name: '신성력 전설 패키지', won: 12000, icon: '💠', give: { sigils: [{ grade: 3, n: 3 }], sigilStone: 2000 } },
      { id: 'sigilB', name: '신성력 고대 패키지', won: 33000, icon: '💠', give: { sigils: [{ grade: 5, n: 2 }, { grade: 4, n: 2 }], sigilStone: 8000 } },
      { id: 'sigilC', name: '신성력 불멸 패키지', won: 59000, icon: '💠', give: { sigils: [{ grade: 7, n: 1 }, { grade: 6, n: 2 }], sigilStone: 20000 } },
      { id: 'sigilD', name: '신성력 멸망 패키지', won: 119000, icon: '💠', give: { sigils: [{ grade: 10, n: 1 }, { grade: 8, n: 2 }], sigilStone: 60000 } },
      { id: 'mixed', name: '룬·신성력 성장 세트', won: 22000, icon: '🎁', give: { runeStone: 5000, sigils: [{ grade: 4, n: 1 }], sigilStone: 5000 } }
    ],
    // the three star items (staff, cape, charm): level with gold, stars from boss shards
    divine: [
      { id: 'staff', name: '별무리 지팡이', desc: '별똥별 천 개를 묶어 만든 지팡이', stat: 'atkPct', per: 0.03, icon: '🪄', kind: '무기' },
      { id: 'robe', name: '은하수 망토', desc: '밤하늘을 통째로 접어 만든 망토', stat: 'critDmg', per: 0.01, icon: '🧥', kind: '방어구' },
      { id: 'charm', name: '태양 고양이 방울', desc: '울리면 보스가 움찔하는 황금 방울', stat: 'bossDmg', per: 0.015, icon: '🔔', kind: '장신구' }
    ],
    divineConf: { unlockTier: 4, maxLv: 500, costBase: 5e5, costGrowth: 1.35, starMax: 20, starBonus: 0.25, shardBoss: 1, shardRegion: 5 },
    // training: talent tree (points from player level), marks + rank (mana stones), mana circle
    talents: [
      { id: 'tSkill', name: '마력 집중', row: 0, stat: 'skillDmg', per: 0.1, max: 5, icon: '✨' },
      { id: 'tBoss', name: '보스 사냥꾼', row: 0, stat: 'bossDmg', per: 0.1, max: 5, icon: '🎯' },
      { id: 'tCrit', name: '날카로운 발톱', row: 0, stat: 'critDmg', per: 0.2, max: 5, icon: '🐾' },
      { id: 'tChain', name: '연쇄 마법', row: 1, stat: 'chain2', per: 0.02, max: 10, icon: '🔗' },
      { id: 'tGold', name: '황금 수염', row: 2, stat: 'goldMul', per: 0.1, max: 5, icon: '💰' },
      { id: 'tXp', name: '호기심 많은 눈', row: 2, stat: 'xpMul', per: 0.06, max: 5, icon: '📚' },
      { id: 'tChain3', name: '삼중 연쇄', row: 2, stat: 'chain3', per: 0.03, max: 5, icon: '⛓️' }
    ],
    talentConf: { levelsPerPoint: 20, rowLevel: [10, 120, 300], rowNeed: [0, 8, 13] },
    marks: [
      { id: 'mStar', name: '별의 징표', stat: 'atkPct', per: 0.04, icon: '⭐' },
      { id: 'mClaw', name: '발톱의 징표', stat: 'critRate', per: 0.001, icon: '🐾' },
      { id: 'mMoon', name: '달의 징표', stat: 'critDmg', per: 0.04, icon: '🌙' },
      { id: 'mComet', name: '혜성의 징표', stat: 'superRate', per: 0.0008, icon: '☄️' },
      { id: 'mCrown', name: '왕관의 징표', stat: 'bossDmg', per: 0.03, icon: '👑' },
      { id: 'mBook', name: '마도서의 징표', stat: 'skillDmg', per: 0.03, icon: '📕' }
    ],
    rankConf: { names: ['견습 마법사', '정식 마법사', '숙련 마법사', '상급 마법사', '대마법사', '현자', '천상 마법사'], capPerRank: 20, rankLevel: [0, 60, 150, 260, 400, 560, 720], rankCost: [0, 300, 1500, 6000, 25000, 100000, 400000], rankFinal: 0.5, markBase: 5, markGrowth: 1.07 },
    circleConf: { base: 20, growth: 1.06, perLv: 0.02, tierEvery: 25, tierFinal: 0.5, maxLv: 225 },
    manaConf: { bossBase: 2, bossPerStage: 0.3, bossGrowth: 1.012, regionMul: 5 },
    chainConf: { base2: 0.1, base3: 0.15, mul: [1, 3, 8], max2: 0.8, max3: 0.6 },
    potConf: { cost: 40, lines: 3, gradeMul: 0.6, stats: [
      { stat: 'atkPct', min: 0.05, max: 0.2 }, { stat: 'critRate', min: 0.005, max: 0.02 }, { stat: 'critDmg', min: 0.1, max: 0.4 },
      { stat: 'superRate', min: 0.004, max: 0.015 }, { stat: 'bossDmg', min: 0.05, max: 0.2 }, { stat: 'skillDmg', min: 0.05, max: 0.2 }, { stat: 'chain2', min: 0.005, max: 0.02 }] },
    gearCodex: { gradePoints: 5, per: 0.002 },
    // bag: subMul = power step between I~IV of one grade; ownedFrac = owned effect as a share of the worn effect
    // starMax/starLv/starMul/starFinal: transcend stars (each needs max level and copies of the same item)
    bagConf: { subMul: 1.22, lvPer: 0.01, maxLvBase: 100, lvCostBase: 120, lvCostGrowth: 1.035, lvCostTier: 0.4, mergeCount: 3, ownedFrac: 0.25, tierPoints: 5,
      starMax: 5, starLv: 50, starMul: 0.3, starFinal: 0.03, starGold: 20 },
    // runes: six stones levelled with rune stones; resonance = lowest rune level / resEvery
    runes: [
      { id: 'rFire', name: '불꽃 룬', stat: 'atkPct', per: 0.03, icon: '🔥', color: '#ff6a2b' },
      { id: 'rWave', name: '물결 룬', stat: 'critDmg', per: 0.04, icon: '🌊', color: '#3fb6ff' },
      { id: 'rWind', name: '바람 룬', stat: 'chain2', per: 0.002, icon: '🍃', color: '#5fe39a' },
      { id: 'rEarth', name: '대지 룬', stat: 'bossDmg', per: 0.03, icon: '🪨', color: '#c99a5b' },
      { id: 'rLight', name: '빛의 룬', stat: 'superDmg', per: 0.02, icon: '☀️', color: '#ffe14a' },
      { id: 'rDark', name: '어둠 룬', stat: 'skillDmg', per: 0.03, icon: '🌑', color: '#a77bff' }
    ],
    // each rune has a grade (hiGrades): the level cap is lvPerGrade × (grade + 1), promoting needs the cap and rune stones,
    // and each grade adds gradeStep to the rune's effect
    runeConf: { unlockTier: 3, costBase: 3, costGrowth: 1.045, lvPerGrade: 20, gradeStep: 0.25, gradeCostBase: 150, gradeCostGrowth: 2.4,
      resEvery: 10, resFinal: 0.15, bossStone: 1, regionStone: 6, dungeonPerKill: 0.6 },
    // sigils (신성력): random gems with a grade, a quality and one stat; only equipped ones count
    sigilStats: [
      { stat: 'superRate', base: 0.004, icon: '✴️' }, { stat: 'ultraRate', base: 0.003, icon: '💫' }, { stat: 'hyperRate', base: 0.002, icon: '🌀' },
      { stat: 'megaRate', base: 0.0015, icon: '🌟' }, { stat: 'critDmg', base: 0.15, icon: '🗡️' }, { stat: 'superDmg', base: 0.12, icon: '⚡' },
      { stat: 'skillDmg', base: 0.08, icon: '📜' }, { stat: 'bossDmg', base: 0.08, icon: '👹' }, { stat: 'chain2', base: 0.006, icon: '🔗' },
      { stat: 'chain3', base: 0.008, icon: '⛓️' }, { stat: 'atkPct', base: 0.1, icon: '🐾' }
    ],
    sigilConf: { unlockTier: 5, cap: 60, slotsBase: 4, slotsPer: 10, slotsMax: 12, lvCostBase: 20, lvCostGrowth: 1.09, lvFinal: 0.04, lvMax: 300,
      dropRate: 0.3, regionDrops: 2, summon: { 5: 200, 10: 380 },
      gradeMul: [1, 2.2, 4.8, 10, 22, 48, 100, 210, 450, 950, 2000], stones: [2, 5, 12, 30, 75, 180, 420, 1000, 2400, 5600, 13000],
      dropTable: [[70, 25, 5, 0, 0, 0, 0, 0, 0, 0, 0], [50, 32, 14, 4, 0, 0, 0, 0, 0, 0, 0], [35, 33, 20, 9, 3, 0, 0, 0, 0, 0, 0], [25, 30, 25, 13, 6, 1, 0, 0, 0, 0, 0]],
      summonTable: [40, 32, 18, 7, 2.4, 0.5, 0.1, 0, 0, 0, 0] },
    // alchemy: timed potions; levels come from brewing
    potions: [
      { id: 'rage', name: '분노의 물약', stat: 'potion', val: 0.5, icon: '🧪', desc: '모든 피해' },
      { id: 'luck', name: '황금 물약', stat: 'potionGold', val: 1, icon: '🍯', desc: '골드 획득' },
      { id: 'wisdom', name: '지혜의 물약', stat: 'potionXp', val: 1, icon: '📘', desc: '경험치 획득' }
    ],
    alchConf: { unlockTier: 2, minutes: 20, minPerLv: 1, effPerLv: 0.03, brewsPerLv: 5, maxLv: 30, costSec: 120, stackCap: 2 },
    dungeons: [
      { id: 'gold', name: '황금 고양이 굴', desc: '30초 동안 몰려오는 황금 몬스터를 잡은 만큼 골드', icon: '💰', time: 30 },
      { id: 'mana', name: '마력의 탑', desc: '30초 동안 마력 골렘에게 준 피해만큼 마력석', icon: '🔷', time: 30 },
      { id: 'gem', name: '보석 동굴', desc: '30초 동안 잡은 보석 몬스터만큼 다이아', icon: '💎', time: 30 },
      { id: 'rune', name: '룬의 신전', desc: '30초 동안 잡은 룬 정령만큼 룬석', icon: '🔮', time: 30, unlockTier: 3 }
    ],
    dungeonConf: { tickets: 3, unlockTier: 2, goldPerKill: 5, gemPerKill: 1, gemCap: 150, golemHpMul: 40, golemGrowth: 1.6, manaLvMul: 0.25 },
    relicSummon: { cost: { 5: 150, 10: 280, 100: 2500 }, divineRate: 0.08, maxLv: 100, divineMaxLv: 50, refund: 8 },
    critTiers: [
      { name: '치명타', color: '#ffd84a' }, { name: '슈퍼 크리티컬', color: '#ff7a3a' },
      { name: '울트라 크리티컬', color: '#d07bff' }, { name: '하이퍼 크리티컬', color: '#5ff4ff' },
      { name: '메가 크리티컬', color: '#ff4fa8' }, { name: '얼티밋 크리티컬', color: '#ffffff' }, { name: '알파 크리티컬', color: '#7dff6a' }
    ],
    upgrades: {
      atk: { name: '공격력', costBase: 10, costGrowth: 1.12, max: null },
      speed: { name: '공격 속도', costBase: 50, costGrowth: 1.16, max: 100 },
      crit: { name: '치명타 확률', costBase: 40, costGrowth: 1.14, max: 140 },
      critDmg: { name: '치명타 피해', costBase: 60, costGrowth: 1.1, max: null },
      gold: { name: '골드 획득', costBase: 30, costGrowth: 1.1, max: null },
      mastery: { name: '마법 숙련', costBase: 200, costGrowth: 1.12, max: null },
      superCrit: { name: '슈퍼 크리티컬 확률', costBase: 2e6, costGrowth: 1.14, max: 100, tier: 3 },
      ultraCrit: { name: '울트라 크리티컬 확률', costBase: 2e11, costGrowth: 1.14, max: 100, tier: 5 },
      hyperCrit: { name: '하이퍼 크리티컬 확률', costBase: 1.5e16, costGrowth: 1.14, max: 100, tier: 7 },
      // need: [upgrade, level] that must be reached first (the tier below)
      megaCrit: { name: '메가 크리티컬 확률', costBase: 1e20, costGrowth: 1.14, max: 100, need: ['hyperCrit', 50] },
      megaDmg: { name: '메가 크리티컬 데미지', costBase: 5e19, costGrowth: 1.1, max: 300, need: ['hyperCrit', 50] },
      ultimateCrit: { name: '얼티밋 크리티컬 확률', costBase: 5e24, costGrowth: 1.14, max: 100, need: ['megaCrit', 50] },
      ultimateDmg: { name: '얼티밋 크리티컬 데미지', costBase: 2.5e24, costGrowth: 1.1, max: 300, need: ['megaCrit', 50] },
      alphaCrit: { name: '알파 크리티컬 확률', costBase: 2e29, costGrowth: 1.14, max: 100, need: ['ultimateCrit', 50] },
      alphaDmg: { name: '알파 크리티컬 데미지', costBase: 1e29, costGrowth: 1.1, max: 300, need: ['ultimateCrit', 50] }
    },
    slots: [
      { id: 'hat', kind: 'hat', name: '마법 모자', stat: 'critRate' },
      { id: 'staff', kind: 'staff', name: '지팡이', stat: 'atk' },
      { id: 'robe', kind: 'robe', name: '로브', stat: 'atkPct' },
      { id: 'belt', kind: 'belt', name: '벨트', stat: 'goldMul' },
      { id: 'necklace', kind: 'necklace', name: '목걸이', stat: 'skillDmg' },
      { id: 'ear1', kind: 'ear', name: '귀걸이', stat: 'critDmg' },
      { id: 'ear2', kind: 'ear', name: '귀걸이', stat: 'critDmg' },
      { id: 'ring1', kind: 'ring', name: '반지', stat: 'speed' },
      { id: 'ring2', kind: 'ring', name: '반지', stat: 'bossDmg' }
    ],
    kinds: ['hat', 'staff', 'robe', 'belt', 'necklace', 'ear', 'ring'],
    kindStat: { hat: 'critRate', staff: 'atk', robe: 'atkPct', belt: 'goldMul', necklace: 'skillDmg', ear: 'critDmg', ring: 'speedBoss' },
    kindName: { hat: '마법 모자', staff: '지팡이', robe: '로브', belt: '벨트', necklace: '목걸이', ear: '귀걸이', ring: '반지' },
    grades: [
      { id: 0, name: '일반', color: '#a3a7ad', mainMul: 1, subs: 0 },
      { id: 1, name: '고급', color: '#4fc46a', mainMul: 2.5, subs: 0 },
      { id: 2, name: '희귀', color: '#3d8bfd', mainMul: 6, subs: 1 },
      { id: 3, name: '영웅', color: '#a259ff', mainMul: 15, subs: 1 },
      { id: 4, name: '전설', color: '#ff9f1c', mainMul: 40, subs: 2 },
      { id: 5, name: '신화', color: '#ff4d6d', mainMul: 110, subs: 3 }
    ],
    gacha: {
      levels: [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000],
      table: [
        [60, 30, 8, 1.8, 0.2, 0], [55, 31, 11, 2.6, 0.4, 0], [50, 32, 14, 3.4, 0.6, 0], [45, 32, 17, 5, 1, 0], [40, 32, 20, 6.5, 1.5, 0],
        [35, 31, 23, 8.5, 2.4, 0.1], [30, 30, 26, 10.6, 3.1, 0.3], [25, 29, 28, 13, 4.5, 0.5], [20, 28, 30, 15.5, 5.8, 0.7], [15, 27, 31, 18, 8, 1]
      ],
      cost: { 1: 30, 10: 280, 30: 800, 100: 2500 },
      pity: 200
    },
    shop: [
      { name: '다이아 한 줌', won: 1200, gems: 100 },
      { name: '다이아 주머니', won: 5900, gems: 550 },
      { name: '다이아 상자', won: 12000, gems: 1200 },
      { name: '다이아 궤짝', won: 33000, gems: 3500 },
      { name: '다이아 보물상자', won: 59000, gems: 6500 },
      { name: '다이아 산더미', won: 119000, gems: 14000 }
    ],
    balance: {
      startGems: 300,
      killsPerStage: 10,
      hpBase: 30, hpGrowth: 1.12, regionStep: 1, bossMul: 9, regionBossMul: 22,
      wallMul: [1,19169.38,5566798.08,22820341.73,178880696.24,1691557414.71,8489733214.33,95531878018.25,176986468430.32,294004021895.86], wallShare: 0.7,
      goldBase: 3, goldGrowth: 1.2,
      bossGemsBase: 10, bossGemsPerRegion: 6, regionBossGems: 25, firstClearMul: 2,
      atkBase: 10, atkPerLevel: 0, atkCompound: 1.05,
      speedPerLevel: 0.01, critPerLevel: 0.005, critDmgBase: 1.5, critDmgPerLevel: 0.02,
      goldPerLevel: 0.03, masteryPerLevel: 0.06,
      gap: 0.25, freezeTaken: 1.3, shockBonus: 1.25,
      offlineRate: 0.5, offlineCapSec: 8 * 3600,
      gearMainBase: { critRate: 0.003, atk: 0.03, atkPct: 0.02, goldMul: 0.03, skillDmg: 0.02, critDmg: 0.05, speedBoss: 0.006 },
      gearLevelPerLv: 0.12, enhanceBase: 200, enhanceGrowth: 1.6,
      mergeCount: 5,
      superPerLevel: 0.004, ultraPerLevel: 0.003, hyperPerLevel: 0.002, superDmg: 3, ultraDmg: 4, hyperDmg: 5,
      megaPerLevel: 0.002, ultimatePerLevel: 0.0015, alphaPerLevel: 0.001, megaDmg: 6, ultimateDmg: 7, alphaDmg: 8, highDmgPerLevel: 0.05,
      skillUpBase: 150, skillOwnedPer: 0.01, skillUpGrowth: 1.6, skillLvBonus: 0.1, skillMaxLv: 20,
      levelMax: 800, levelXpBase: 40, levelXpPow: 2, levelXpStage: 1.004, levelAtk: 0.004, levelBossXp: 30, levelGems: 20
    }
  };
  return { DATA: DATA };
});
