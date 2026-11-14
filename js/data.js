(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var DATA = {
    // monsters: every kind that roams the region (art/<id>.webp, names and bodies in js/bestiary.js); a crowd mixes a few of them.
    // minis: the bosses of stages 5, 10, 15, 20, 25 and 30 in turn; boss: the region boss at stage 31.
    regions: [
      { name: '꽃밭', sky: 0xbfe8ff, ground: 0x8fd16a, accent: 0xff9fc8, monsters: ['c01', 'c02', 'f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07', 'f08', 'f09', 'f10', 'm104', 'm105', 'm107', 'm108'], minis: ['b22', 'b41', 'b44', 'b43', 'b67', 'b54', 'b77'], weak: ['paw', 'fire'], boss: { art: 'b01', name: '사나운 불독' } },
      { name: '버섯 숲', sky: 0xa8dcc8, ground: 0x5f9f62, accent: 0xff6b5b, monsters: ['c03', 'c04', 'v01', 'v02', 'v03', 'v04', 'v05', 'v06', 'v07', 'v08', 'v09', 'v10', 'k02', 'm106', 'm109', 'm138', 'm140'], minis: ['b42', 'b23', 'b21', 'b28', 'b66', 'b63', 'b52'], weak: ['fire', 'star'], boss: { art: 'b02', name: '박쥐 백작' } },
      { name: '사막', sky: 0xffe2b0, ground: 0xe8c27a, accent: 0xffb347, monsters: ['c05', 'c06', 'd01', 'd02', 'd03', 'd04', 'd08', 'd10', 'm103', 'm112', 'm113', 'm114'], minis: ['b49', 'b14', 'b13', 'b48', 'b57', 'b76', 'b79'], weak: ['bolt', 'ice'], boss: { art: 'b03', name: '거대 독수리' } },
      { name: '얼음 동굴', sky: 0xcfe6ff, ground: 0xeef6ff, accent: 0x7fd3ff, monsters: ['c07', 'c08', 'i01', 'i02', 'i03', 'i04', 'i05', 'k01', 'k04', 'k06', 'k08', 'm117', 'm124', 'm127', 'm128'], minis: ['b25', 'b47', 'b32', 'b20', 'b59', 'b71', 'b62'], weak: ['fire', 'sun'], boss: { art: 'b04', name: '설원 늑대' } },
      { name: '화산', sky: 0x4a1e1e, ground: 0x5a2a20, accent: 0xff6a2b, monsters: ['c09', 'c10', 'd05', 'd06', 'd07', 'd09', 'g03', 'm115', 'm133', 'm136', 'm139'], minis: ['b27', 'b18', 'b31', 'b50', 'b69', 'b68', 'b58'], weak: ['ice', 'moon'], boss: { art: 'b05', name: '불꽃 도마뱀' } },
      { name: '별빛 호수', sky: 0x1d2550, ground: 0x34407a, accent: 0x9fd8ff, monsters: ['c11', 'c12', 'l06', 'l07', 'l08', 'k10', 'o03', 'o04', 'o05', 'o07', 'o08', 'o09', 'o10', 'm102', 'm110', 'm116', 'm125'], minis: ['b17', 'b26', 'b16', 'b35', 'b34', 'b53', 'b60', 'b72'], weak: ['bolt', 'moon'], boss: { art: 'b06', name: '호수 악어' } },
      { name: '달의 정원', sky: 0x2c2448, ground: 0x4a6a5a, accent: 0xe6e6ff, monsters: ['c13', 'c14', 'l09', 'l10', 'g04', 'o01', 'o02', 'o06', 'm101', 'm122', 'm123', 'm134'], minis: ['b15', 'b30', 'b29', 'b36', 'b56', 'b65', 'b73'], weak: ['sun', 'star'], boss: { art: 'b07', name: '공포의 부엉이' } },
      { name: '태양 신전', sky: 0xfff1c9, ground: 0xe8c27a, accent: 0xffd84a, monsters: ['c15', 'c16', 'g05', 's01', 's02', 's03', 's04', 's05', 's06', 'm111', 'm118', 'm120', 'm130'], minis: ['b12', 'b46', 'b24', 'b37', 'b51', 'b61', 'b70'], weak: ['moon', 'void'], boss: { art: 'b08', name: '황금 하이에나' } },
      { name: '은하', sky: 0x120f2a, ground: 0x2a2650, accent: 0xb58cff, monsters: ['c17', 'c18', 'g01', 'g02', 's07', 's08', 's09', 'm119', 'm121', 'm129', 'm135'], minis: ['b19', 'b45', 'b33', 'b38', 'b74', 'b78', 'b64'], weak: ['sun', 'void'], boss: { art: 'b09', name: '우주 뱀' } },
      { name: '마왕성', sky: 0x1e1530, ground: 0x3a2a50, accent: 0xff3b5c, monsters: ['c19', 'c20', 'k03', 'k05', 'k07', 'k09', 'g06', 'g07', 'g08', 'g09', 'g10', 's10', 'm126', 'm131', 'm132', 'm137'], minis: ['b11', 'b39', 'b40', 'b55', 'b75', 'b80'], weak: ['sun', 'star'], boss: { art: 'b10', name: '늑대 왕' } }
    ],
    // titles (2026-11-14): earned by playing, one worn (js/titles.js); bonus = what the worn title adds
    titles: [
      { id: 'tNovice', name: '견습 냥법사', need: { kind: 'start' } },
      { id: 'tBoss', name: '보스 사냥꾼', need: { kind: 'boss', n: 100 }, bonus: { bossDmg: 0.05 } },
      { id: 'tRune', name: '룬의 주인', need: { kind: 'runes', n: 7 }, bonus: { finalPct: 0.03 } },
      { id: 'tStar', name: '별을 삼킨 자', need: { kind: 'tier', n: 9 }, bonus: { hyperDmg: 0.2 } },
      { id: 'tSlayer', name: '슬레이어', need: { kind: 'slayer' }, bonus: { finalPct: 0.1 } }
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
      { name: '전설의 대마법냥', skill: 'elementNova', aura: 4 },
      // 10th job and on: legendary beasts (10 phoenix; dragon, sky whale and white tiger to come), in elemental spirit style
      { name: '불사조 냥법사', skill: 'phoenixDive', aura: 4 }
    ],
    // the next jobs, not in the game yet (shown as "준비 중" in the job list): the boss of 10-31 on that difficulty
    tierSoon: [
      { n: 11, name: '용 냥법사', diff: 2 },
      { n: 12, name: '하늘 고래 냥법사', diff: 3 },
      { n: 13, name: '백호 냥법사', diff: 4 }
    ],
    // Every job tier brings four skills of its own kind (the first job has its four starters plus three).
    // mult = the whole damage one monster takes from one cast, however many hits it arrives in.
    // targets 99 = every monster on the field · splash = share of the damage for monsters standing next to the target.
    // how = one short line for the skill list. The effect for each shape is in js/fx.js (first twelve) and js/fx-more.js.
    skills: [
      { id: 'starShot', name: '별 탄환', tier: 1, el: 'star', dur: 0.6, mult: 1.0, targets: 1, shape: 'bolt3', status: null, color: 0xfff27a, how: '별 세 발을 연달아 쏴요' },
      { id: 'magicClaw', name: '마법 발톱', tier: 1, el: 'paw', dur: 0.55, mult: 1.1, targets: 1, shape: 'slash', status: null, color: 0xff8fd8, how: '빠르게 세 번 할퀴어요' },
      { id: 'furBomb', name: '털뭉치 폭탄', tier: 1, el: 'paw', dur: 0.8, mult: 1.2, targets: 2, shape: 'bounceBomb', status: null, color: 0xffb36b, how: '통통 튀다가 터져요' },
      { id: 'sparkRing', name: '반짝 고리', tier: 1, el: 'star', dur: 0.7, mult: 0.9, targets: 3, shape: 'orbitRing', status: null, color: 0x9fe8ff, how: '빛 구슬 여섯 개가 날아가요' },
      { id: 'pawStamp', name: '젤리 발도장', tier: 1, el: 'paw', dur: 0.65, mult: 1.3, targets: 1, shape: 'stamp', status: null, color: 0xffa8c8, how: '하늘에서 큰 발바닥이 쿵 찍어요' },
      { id: 'yarnBall', name: '실뭉치 굴리기', tier: 1, el: 'paw', dur: 0.75, mult: 0.85, targets: 4, shape: 'roll', status: null, color: 0x7fd8a0, how: '실뭉치가 몬스터 사이를 굴러다녀요' },
      { id: 'starDust', name: '별가루 소나기', tier: 1, el: 'star', dur: 0.75, mult: 0.65, targets: 5, shape: 'sprinkle', status: null, color: 0xc8b8ff, how: '작은 별이 우수수 떨어져요' },

      { id: 'fireball', name: '화염구', tier: 2, el: 'fire', dur: 0.75, mult: 1.7, targets: 2, shape: 'fireball', status: null, color: 0xff6a2b, how: '불덩이가 날아가 터져요' },
      { id: 'flamePillar', name: '불기둥', tier: 2, el: 'fire', dur: 0.8, mult: 1.5, targets: 3, shape: 'pillars', status: null, color: 0xff7a2b, how: '발밑에서 불기둥이 솟아요' },
      { id: 'flameWave', name: '화염 파도', tier: 2, el: 'fire', dur: 0.85, mult: 1.0, targets: 99, shape: 'flameWave', status: null, color: 0xff8a3a, how: '불의 벽이 화면을 쓸고 지나가요' },
      { id: 'inferno', name: '폭염탄', tier: 2, el: 'fire', dur: 0.9, mult: 2.5, targets: 1, splash: 0.3, shape: 'inferno', status: null, color: 0xff4a1a, how: '커다란 불덩이 한 방' },

      { id: 'chainLightning', name: '연쇄 번개', tier: 3, el: 'bolt', dur: 0.7, mult: 2.1, targets: 4, shape: 'chain', status: 'shock', color: 0x9fd8ff, how: '번개가 옮겨 다니고 하늘에서 또 내리쳐요' },
      { id: 'thunderStrike', name: '벼락', tier: 3, el: 'bolt', dur: 0.8, mult: 3.1, targets: 1, splash: 0.25, shape: 'thunder', status: 'shock', color: 0xbfe4ff, how: '먹구름에서 큰 벼락 한 줄기' },
      { id: 'stormCloud', name: '뇌우', tier: 3, el: 'bolt', dur: 0.9, mult: 1.5, targets: 99, shape: 'storm', status: 'shock', color: 0x8fc0ff, how: '번개가 몬스터마다 내리쳐요' },
      { id: 'ballLightning', name: '구슬 번개', tier: 3, el: 'bolt', dur: 0.85, mult: 1.9, targets: 5, shape: 'orb', status: 'shock', color: 0x7fe8ff, how: '번개 구슬이 통통 튀며 지져요' },

      { id: 'iceStorm', name: '얼음 폭풍', tier: 4, el: 'ice', dur: 0.9, mult: 2.5, targets: 99, shape: 'blizzard', status: 'freeze', color: 0xbfefff, how: '얼음 조각이 몬스터마다 꽂혀요' },
      { id: 'iceLance', name: '얼음 창', tier: 4, el: 'ice', dur: 0.75, mult: 3.7, targets: 1, shape: 'lance', status: 'freeze', color: 0x9fe4ff, how: '큰 얼음 창을 던져 꿰뚫어요' },
      { id: 'frostNova', name: '서리 고리', tier: 4, el: 'ice', dur: 0.7, mult: 2.0, targets: 99, shape: 'frostRing', status: 'freeze', color: 0xd8f6ff, how: '서리가 발밑에서 화면 끝까지 퍼져요' },
      { id: 'glacierSpikes', name: '빙하 가시', tier: 4, el: 'ice', dur: 0.85, mult: 2.9, targets: 4, shape: 'spikes', status: 'freeze', color: 0x7fd0ff, how: '땅을 타고 가시가 솟아올라요' },

      { id: 'meteorRain', name: '별똥별 비', tier: 5, el: 'star', dur: 0.95, mult: 3.1, targets: 99, shape: 'meteors', status: null, color: 0xffe14a, how: '떨어지는 별똥별이 전부 맞아요' },
      { id: 'cometStrike', name: '대혜성', tier: 5, el: 'star', dur: 0.95, mult: 4.4, targets: 1, splash: 0.3, shape: 'comet', status: null, color: 0xffc84a, how: '거대한 혜성 하나가 내리꽂혀요' },
      { id: 'starBarrage', name: '별빛 연사', tier: 5, el: 'star', dur: 0.8, mult: 3.6, targets: 3, shape: 'barrage', status: null, color: 0xfff0a0, how: '별 열두 발을 쉬지 않고 쏴요' },
      { id: 'constellation', name: '별자리', tier: 5, el: 'star', dur: 0.9, mult: 2.7, targets: 99, shape: 'constel', status: null, color: 0xa8c8ff, how: '별을 이어 그린 뒤 한꺼번에 떨어뜨려요' },

      { id: 'moonLaser', name: '달빛 레이저', tier: 6, el: 'moon', dur: 0.9, mult: 3.8, targets: 99, shape: 'beam', status: null, color: 0xd8d8ff, how: '레이저를 쏘아 화면을 훑어요' },
      { id: 'crescentWave', name: '초승달 베기', tier: 6, el: 'moon', dur: 0.75, mult: 3.4, targets: 99, shape: 'crescents', status: null, color: 0xe0d8ff, how: '커다란 초승달 칼날 세 개가 지나가요' },
      { id: 'moonFall', name: '보름달 낙하', tier: 6, el: 'moon', dur: 1.0, mult: 5.4, targets: 1, splash: 0.35, shape: 'moonfall', status: null, color: 0xf4f0d8, how: '보름달이 떠올랐다가 내려찍어요' },
      { id: 'moonOrbs', name: '달빛 구슬', tier: 6, el: 'moon', dur: 0.85, mult: 4.2, targets: 5, shape: 'moonOrbs', status: null, color: 0xc8c0ff, how: '작은 달 다섯 개가 빛줄기를 쏴요' },

      { id: 'solarBurst', name: '태양 폭발', tier: 7, el: 'sun', dur: 1.0, mult: 4.6, targets: 99, shape: 'flash', status: null, color: 0xffd84a, how: '빛기둥이 위에서 쏟아져 터져요' },
      { id: 'sunSpear', name: '태양의 창', tier: 7, el: 'sun', dur: 0.85, mult: 6.6, targets: 1, shape: 'sunspear', status: null, color: 0xffc23a, how: '빛의 창이 꿰뚫고 나서 터져요' },
      { id: 'sunArrows', name: '햇살 화살비', tier: 7, el: 'sun', dur: 0.95, mult: 4.3, targets: 99, shape: 'sunArrows', status: null, color: 0xffe07a, how: '빛 화살이 몬스터마다 꽂혀요' },
      { id: 'coronaRing', name: '홍염 고리', tier: 7, el: 'sun', dur: 0.75, mult: 3.7, targets: 99, shape: 'corona', status: null, color: 0xff9a3a, how: '불의 고리가 화면 끝까지 퍼져요' },

      { id: 'blackHole', name: '블랙홀', tier: 8, el: 'void', dur: 1.0, mult: 5.5, targets: 99, shape: 'vortex', status: 'gather', color: 0xb04bff, how: '전부 끌어당긴 뒤 한 번에 터뜨려요' },
      { id: 'voidRift', name: '차원 균열', tier: 8, el: 'void', dur: 0.85, mult: 5.0, targets: 99, shape: 'rift', status: null, color: 0xc86bff, how: '하늘을 찢어 열었다가 닫으며 터져요' },
      { id: 'gravityCrush', name: '중력 붕괴', tier: 8, el: 'void', dur: 1.0, mult: 5.6, targets: 99, shape: 'crush', status: null, color: 0x9a5bff, how: '전부 띄웠다가 땅에 내리꽂아요' },
      { id: 'darkStar', name: '암흑 별', tier: 8, el: 'void', dur: 0.95, mult: 8.0, targets: 1, splash: 0.3, shape: 'darkStar', status: null, color: 0x8a3bff, how: '어둠의 구슬이 파고들어 터져요' },

      { id: 'elementNova', name: '원소 합체 궁극기', tier: 9, el: 'all', dur: 1.0, mult: 7, targets: 99, shape: 'nova', status: null, color: 0xffffff, how: '원소를 모아 화면 전체를 터뜨려요' },
      { id: 'elementStorm', name: '원소 폭풍', tier: 9, el: 'all', dur: 0.9, mult: 6.3, targets: 99, shape: 'elemStorm', status: null, color: 0xffe0f0, how: '다섯 원소가 번갈아 쏟아져요' },
      { id: 'prismBeam', name: '오색 광선', tier: 9, el: 'all', dur: 0.9, mult: 9.5, targets: 1, shape: 'prism', status: null, color: 0xfff0ff, how: '다섯 빛줄기를 한 곳에 모아 터뜨려요' },
      { id: 'elementWheel', name: '원소의 수레바퀴', tier: 9, el: 'all', dur: 0.8, mult: 6.0, targets: 99, shape: 'wheel', status: null, color: 0xe8f0ff, how: '원소 구슬이 돌며 화면 끝까지 퍼져요' },
      // 10차 불사조: the user's painted phoenix flies in each of them (js/fx-beasts.js)
      { id: 'phoenixDive', name: '불사조 강림', tier: 10, el: 'fire', dur: 1.0, mult: 8.4, targets: 99, shape: 'phoenixDive', status: null, color: 0xff7a2a, how: '불사조가 날아와 무리를 쓸고 불타올라요' },
      { id: 'featherRain', name: '불꽃 깃털비', tier: 10, el: 'fire', dur: 0.95, mult: 7.6, targets: 99, shape: 'featherRain', status: null, color: 0xffa040, how: '날갯짓 한 번에 불타는 깃털이 쏟아져요' },
      { id: 'rebirthFlame', name: '재탄생의 불꽃', tier: 10, el: 'fire', dur: 0.95, mult: 12.5, targets: 1, splash: 0.3, shape: 'rebirth', status: null, color: 0xff5a1a, how: '불기둥 속에서 불사조가 다시 태어나 터뜨려요' },
      { id: 'phoenixWings', name: '불사조 날개', tier: 10, el: 'fire', dur: 0.9, mult: 7.9, targets: 99, shape: 'phoenixWings', status: null, color: 0xff8a3a, how: '등에 돋은 불사조 날개로 불바람을 두 번 보내요' }
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
        fx: { col: 0xff2a2a, col2: 0xff8a2a, aura: 0.9, glow: 0.38, parts: 'doom', rate: 8, horns: true, eyes: 0xff3030 } },
      // four more 멸망 costumes (user's pictures, 2026-11-14), the same grade and strength as 멸망의 군주.
      // Their look is quiet on purpose (user, 2026-11-14: no thick coloured halo): sheen = light on the armour (scene.js SHEEN_FS),
      // parts = one small sign of each costume (fx.js quietParticle)
      { id: 'doomHoly', name: '순백의 대성기사', desc: '분홍 보석과 진주로 꾸민 순백·황금 성당 갑주', art: 'cos11', outfit: { h: 40, s: 0.35, v: 1.15 }, grade: 10, stat: 'finalPct', per: 0.05, price: 120000,
        fx: { col: 0xffd6e6, col2: 0xfff0c0, aura: 0.3, glow: 0.1, parts: 'holy', rate: 3, sheen: { rim: 0.48, sweep: 0.90, glint: 1.20, period: 4.2 } } },
      { id: 'doomDragon', name: '청룡의 군주', desc: '황금 용이 감아 오르는 비취빛 용린 갑주', art: 'cos12', outfit: { h: 150, s: 0.8, v: 0.5 }, grade: 10, stat: 'finalPct', per: 0.05, price: 120000,
        fx: { col: 0x3ae0a0, col2: 0xffd86a, aura: 0.3, glow: 0.1, parts: 'qi', rate: 2.4, sheen: { rim: 0.40, sweep: 0.83, glint: 0.96, period: 3.8 } } },
      { id: 'doomFrost', name: '서리 성채의 기사', desc: '얼음 결정이 빛나는 은빛 성채 갑옷과 진주 망토', art: 'cos13', outfit: { h: 220, s: 0.6, v: 0.55 }, grade: 10, stat: 'finalPct', per: 0.05, price: 120000,
        fx: { col: 0xcfeaff, col2: 0xffffff, aura: 0.3, glow: 0.1, parts: 'rime', rate: 2.6, sheen: { rim: 0.51, sweep: 0.90, glint: 1.20, period: 3.4 } } },
      { id: 'doomPlume', name: '진홍 깃털 기사', desc: '붉은 깃털과 호박 보석의 진홍 기사 갑주', art: 'cos14', outfit: { h: 355, s: 0.85, v: 0.5 }, grade: 10, stat: 'finalPct', per: 0.05, price: 120000,
        fx: { col: 0xc8202a, col2: 0xffc060, aura: 0.3, glow: 0.1, parts: 'feather', rate: 2.2, sheen: { rim: 0.35, sweep: 0.75, glint: 0.96, period: 4.0 } } },
      { id: 'doomPrism', name: '오색 별빛 마녀', desc: '무지갯빛 수정 깃과 별 모자를 두른 밤하늘 마녀', art: 'cos15', outfit: { h: 268, s: 0.6, v: 0.85 }, grade: 10, stat: 'finalPct', per: 0.05, price: 120000,
        fx: { col: 0xd8c0ff, col2: 0xbff0ff, aura: 0.3, glow: 0.1, parts: 'prism', rate: 3, sheen: { rim: 0.45, sweep: 0.90, glint: 1.20, period: 3.6, rainbow: 0.75 } } },
      { id: 'doomRose', name: '루비 장미 마녀', desc: '루비 결정 날개와 붉은 장미의 검붉은 마녀 드레스', art: 'cos16', outfit: { h: 350, s: 0.85, v: 0.6 }, grade: 10, stat: 'finalPct', per: 0.05, price: 120000,
        fx: { col: 0xb0102e, col2: 0xffb0c0, aura: 0.3, glow: 0.1, parts: 'petal', rate: 2.2, sheen: { rim: 0.35, sweep: 0.75, glint: 1.08, period: 4.4 } } },
      { id: 'doomNight', name: '밤하늘 수정 마녀', desc: '은빛 거미줄 수정과 별이 박힌 검은 마녀 망토', art: 'cos17', outfit: { h: 240, s: 0.5, v: 0.45 }, grade: 10, stat: 'finalPct', per: 0.05, price: 120000,
        fx: { col: 0xb4b0ff, col2: 0xeef0ff, aura: 0.3, glow: 0.1, parts: 'stars', rate: 2.4, sheen: { rim: 0.45, sweep: 0.75, glint: 1.20, period: 4.6 } } },
      { id: 'doomClock', name: '시계태엽 가면 백작', desc: '호박빛 시계 지팡이와 비취 보석의 태엽 백작 옷', art: 'cos18', outfit: { h: 168, s: 0.7, v: 0.45 }, grade: 10, stat: 'finalPct', per: 0.05, price: 120000,
        fx: { col: 0xffb24a, col2: 0x6af0c0, aura: 0.3, glow: 0.1, parts: 'tick', rate: 2.6, sheen: { rim: 0.38, sweep: 0.83, glint: 0.96, period: 3.0 } } }
    ],
    // enhance with diamonds: cost = upBase × upGrowth^grade × (1 + lv × upLv); a star every starEvery levels (+starBonus each);
    // every owned costume adds collect to all damage
    costumeConf: { maxLv: 50, upBase: 20, upGrowth: 1.6, upLv: 0.15, starEvery: 10, starBonus: 0.1, collect: 0.05 },
    // shop packages (practice only, no real payment)
    // Packages (practice only, no real payment). cat = the shop section; need.tier = only after that job; limit = how
    // many times it can be bought. give: gems, goldMin (minutes of hunting gold at the current stage), potionMin (every
    // potion runs that much longer), pulls (free gear pulls), daily { days, gems } (claimed once a day), runeStone,
    // sigils, sigilStone. The plain gem shop is DATA.shop.
    packs: [
      { id: 'dailyGem', cat: 'daily', name: '매일 다이아 7일', won: 6900, icon: '📅', give: { daily: { days: 7, gems: 300 } } },
      { id: 'goldS', cat: 'grow', name: '골드 꾸러미', won: 3300, icon: '💰', give: { goldMin: 120 } },
      { id: 'goldL', cat: 'grow', name: '골드 금고', won: 12000, icon: '💰', give: { goldMin: 600 } },
      { id: 'potion', cat: 'grow', name: '물약 꾸러미', won: 4900, icon: '🧪', give: { potionMin: 120 } },
      { id: 'grow', cat: 'grow', name: '성장 한 번에', won: 15000, icon: '🎁', give: { goldMin: 300, potionMin: 180, gems: 800 } },
      { id: 'gear10', cat: 'gear', name: '장비 뽑기 10번', won: 3300, icon: '🎰', give: { pulls: 10 } },
      { id: 'gear30', cat: 'gear', name: '장비 뽑기 30번', won: 8900, icon: '🎰', give: { pulls: 30 } },
      { id: 'gear100', cat: 'gear', name: '장비 뽑기 100번', won: 27000, icon: '🎰', give: { pulls: 100 } },
      { id: 'tier5', cat: 'tier', name: '5차 전직 축하', won: 9900, icon: '🎉', need: { tier: 5 }, limit: 1, give: { gems: 2000, runeStone: 3000 } },
      { id: 'tier8', cat: 'tier', name: '8차 전직 축하', won: 19900, icon: '🎉', need: { tier: 8 }, limit: 1, give: { gems: 5000, sigils: [{ grade: 4, n: 2 }], sigilStone: 5000 } },
      { id: 'tier10', cat: 'tier', name: '불사조 전직 축하', won: 29900, icon: '🔥', need: { tier: 10 }, limit: 1, give: { gems: 10000, runeStone: 10000, sigils: [{ grade: 6, n: 1 }] } },
      { id: 'runeS', cat: 'rune', name: '룬석 꾸러미', won: 5900, icon: '🔮', give: { runeStone: 1500 } },
      { id: 'runeL', cat: 'rune', name: '룬 승급 상자', won: 33000, icon: '🔮', give: { runeStone: 12000 } },
      { id: 'sigilA', cat: 'rune', name: '신성력 전설 패키지', won: 12000, icon: '💠', give: { sigils: [{ grade: 3, n: 3 }], sigilStone: 2000 } },
      { id: 'sigilB', cat: 'rune', name: '신성력 고대 패키지', won: 33000, icon: '💠', give: { sigils: [{ grade: 5, n: 2 }, { grade: 4, n: 2 }], sigilStone: 8000 } },
      { id: 'sigilC', cat: 'rune', name: '신성력 불멸 패키지', won: 59000, icon: '💠', give: { sigils: [{ grade: 7, n: 1 }, { grade: 6, n: 2 }], sigilStone: 20000 } },
      { id: 'sigilD', cat: 'rune', name: '신성력 멸망 패키지', won: 119000, icon: '💠', give: { sigils: [{ grade: 10, n: 1 }, { grade: 8, n: 2 }], sigilStone: 60000 } },
      { id: 'mixed', cat: 'rune', name: '룬·신성력 성장 세트', won: 22000, icon: '🎁', give: { runeStone: 5000, sigils: [{ grade: 4, n: 1 }], sigilStone: 5000 } }
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
      { id: 'tChain', name: '약점 공략', row: 1, stat: 'weakDmg', per: 0.1, max: 10, icon: '🎯' },
      { id: 'tGold', name: '황금 수염', row: 2, stat: 'goldMul', per: 0.1, max: 5, icon: '💰' },
      { id: 'tXp', name: '호기심 많은 눈', row: 2, stat: 'xpMul', per: 0.06, max: 5, icon: '📚' },
      { id: 'tChain3', name: '폭주 증폭', row: 2, stat: 'surgeDmg', per: 0.2, max: 5, icon: '💥' },
      // 초월 row (2026-11-14)
      { id: 'tManaBurst', name: '마력 해방', row: 3, stat: 'hyperDmg', per: 0.1, max: 5, icon: '⚡' },
      { id: 'tRift', name: '차원 파열', row: 3, stat: 'ultimateDmg', per: 0.1, max: 5, icon: '🌀' },
      { id: 'tOrigin', name: '태초의 섭리', row: 3, stat: 'finalPct', per: 0.05, max: 5, icon: '🌟' }
    ],
    talentConf: { levelsPerPoint: 20, rowLevel: [10, 120, 300, 300], rowNeed: [0, 8, 13, 14] },
    marks: [
      { id: 'mStar', name: '별의 징표', stat: 'atkPct', per: 0.04, icon: '⭐' },
      { id: 'mClaw', name: '발톱의 징표', stat: 'critRate', per: 0.001, icon: '🐾' },
      { id: 'mMoon', name: '달의 징표', stat: 'critDmg', per: 0.04, icon: '🌙' },
      { id: 'mComet', name: '혜성의 징표', stat: 'superRate', per: 0.0008, icon: '☄️' },
      { id: 'mCrown', name: '왕관의 징표', stat: 'bossDmg', per: 0.03, icon: '👑' },
      { id: 'mBook', name: '마도서의 징표', stat: 'skillDmg', per: 0.03, icon: '📕' },
      // extra marks (2026-11-14): open at openRank, not needed for rank up
      { id: 'mArcane', name: '비전의 징표', stat: 'alphaDmg', per: 0.02, icon: '🔮', extra: true, openRank: 3 },
      { id: 'mJudge', name: '심판의 징표', stat: 'bossDmg', per: 0.02, icon: '⚖️', extra: true, openRank: 3 }
    ],
    rankConf: { names: ['견습 마법사', '정식 마법사', '숙련 마법사', '상급 마법사', '대마법사', '현자', '천상 마법사'], capPerRank: 20, rankLevel: [0, 60, 150, 260, 400, 560, 720], rankCost: [0, 300, 1500, 6000, 25000, 100000, 400000], rankFinal: 0.5, markBase: 5, markGrowth: 1.07 },
    circleConf: { base: 20, growth: 1.06, perLv: 0.02, tierEvery: 25, tierFinal: 0.5, maxLv: 225 },
    manaConf: { bossBase: 2, bossPerStage: 0.3, bossGrowth: 1.012, regionMul: 5 },
    // element weakness: a skill whose element the region is weak to hits ×weak (×(1 + 약점 피해) on top)
    // mana surge: every cast fills the gauge by 1 (×(1 + 충전 속도)); when it reaches charge the next cast hits ×mul (×(1 + 폭주 피해))
    elements: { paw: { name: '냥냥', color: '#ff8fd8' }, fire: { name: '불', color: '#ff6a2b' }, bolt: { name: '번개', color: '#7fc8ff' }, ice: { name: '얼음', color: '#9fe8ff' },
      star: { name: '별', color: '#ffe14a' }, moon: { name: '달', color: '#c8c0ff' }, sun: { name: '태양', color: '#ffb02e' }, void: { name: '어둠', color: '#b04bff' }, all: { name: '모든 원소', color: '#ffffff' } },
    weakConf: { mul: 1.6 },
    surgeConf: { charge: 10, mul: 4 },
    potConf: { cost: 40, lines: 3, gradeMul: 0.6, stats: [
      { stat: 'atkPct', min: 0.05, max: 0.2 }, { stat: 'critRate', min: 0.005, max: 0.02 }, { stat: 'critDmg', min: 0.1, max: 0.4 },
      { stat: 'superRate', min: 0.004, max: 0.015 }, { stat: 'bossDmg', min: 0.05, max: 0.2 }, { stat: 'skillDmg', min: 0.05, max: 0.2 }, { stat: 'weakDmg', min: 0.05, max: 0.2 },
      // 초월 crit damages (2026-11-14)
      { stat: 'hyperDmg', min: 0.05, max: 0.2 }, { stat: 'megaDmg', min: 0.04, max: 0.15 }, { stat: 'alphaDmg', min: 0.03, max: 0.1 }] },
    gearCodex: { gradePoints: 5, per: 0.002 },
    // bag: subMul = power step between I~IV of one grade; ownedFrac = owned effect as a share of the worn effect
    // starMax/starLv/starMul/starFinal: transcend stars (each needs max level and copies of the same item)
    bagConf: { subMul: 1.22, lvPer: 0.01, maxLvBase: 100, lvCostBase: 120, lvCostGrowth: 1.035, lvCostTier: 0.4, mergeCount: 3, ownedFrac: 0.25, tierPoints: 5,
      starMax: 5, starLv: 50, starMul: 0.3, starFinal: 0.03, starGold: 20 },
    // runes: six stones levelled with rune stones; resonance = lowest rune level / resEvery
    runes: [
      { id: 'rFire', name: '불꽃 룬', stat: 'atkPct', per: 0.03, icon: '🔥', color: '#ff6a2b' },
      { id: 'rWave', name: '물결 룬', stat: 'critDmg', per: 0.04, icon: '🌊', color: '#3fb6ff' },
      { id: 'rWind', name: '바람 룬', stat: 'surgeRate', per: 0.004, icon: '🍃', color: '#5fe39a' },
      { id: 'rEarth', name: '대지 룬', stat: 'bossDmg', per: 0.03, icon: '🪨', color: '#c99a5b' },
      { id: 'rLight', name: '빛의 룬', stat: 'superDmg', per: 0.02, icon: '☀️', color: '#ffe14a' },
      { id: 'rDark', name: '어둠 룬', stat: 'skillDmg', per: 0.03, icon: '🌑', color: '#a77bff' },
      // 2026-11-14: runes are items now; four new kinds carry the 초월 stats
      { id: 'rBolt', name: '천둥 룬', stat: 'hyperDmg', per: 0.02, icon: '⚡', color: '#5ff4ff' },
      { id: 'rNebula', name: '성운 룬', stat: 'megaDmg', per: 0.02, icon: '🌌', color: '#ff4fa8' },
      { id: 'rComet', name: '혜성 룬', stat: 'alphaDmg', per: 0.015, icon: '☄️', color: '#7dff6a' },
      { id: 'rOrigin', name: '태초 룬', stat: 'finalPct', per: 0.01, icon: '🌟', color: '#ffffff' }
    ],
    // each rune has a grade (hiGrades): the level cap is lvPerGrade × (grade + 1), promoting needs the cap and rune stones,
    // and each grade adds gradeStep to the rune's effect
    runeConf: { unlockTier: 3, costBase: 3, costGrowth: 1.045, lvPerGrade: 20, gradeStep: 0.25, gradeCostBase: 150, gradeCostGrowth: 2.4,
      resEvery: 10, resFinal: 0.15, bossStone: 1, regionStone: 6, dungeonPerKill: 0.6,
      // rune items (2026-11-14): seven slots, a bag, drops, summons; three of a kind and grade fuse into the next grade
      slots: 7, cap: 100, kindWeight: [13, 13, 13, 13, 13, 13, 6, 6, 6, 4], dropRate: 0.25, regionDrops: 2, dungeonPerRune: 20,
      summon: { 5: 200, 10: 380 }, summonTable: [40, 32, 18, 7, 2.4, 0.5, 0.1, 0, 0, 0, 0],
      dropTable: [[70, 25, 5, 0, 0, 0, 0, 0, 0, 0, 0], [50, 32, 14, 4, 0, 0, 0, 0, 0, 0, 0], [35, 33, 20, 9, 3, 0, 0, 0, 0, 0, 0], [25, 30, 25, 13, 6, 1, 0, 0, 0, 0, 0]],
      dismantleBase: [10, 24, 58, 138, 332, 796, 1911, 4586, 11007, 26417, 63400] },
    // sigils (신성력): random gems with a grade, a quality and one stat; only equipped ones count
    sigilStats: [
      { stat: 'superRate', base: 0.004, icon: '✴️' }, { stat: 'ultraRate', base: 0.003, icon: '💫' }, { stat: 'hyperRate', base: 0.002, icon: '🌀' },
      { stat: 'megaRate', base: 0.0015, icon: '🌟' }, { stat: 'critDmg', base: 0.15, icon: '🗡️' }, { stat: 'superDmg', base: 0.12, icon: '⚡' },
      { stat: 'skillDmg', base: 0.08, icon: '📜' }, { stat: 'bossDmg', base: 0.08, icon: '👹' }, { stat: 'weakDmg', base: 0.08, icon: '🎯' },
      { stat: 'surgeDmg', base: 0.12, icon: '💥' }, { stat: 'atkPct', base: 0.1, icon: '🐾' },
      // 초월 crit damages (2026-11-14)
      { stat: 'hyperDmg', base: 0.08, icon: '🌀' }, { stat: 'megaDmg', base: 0.06, icon: '🌟' }, { stat: 'alphaDmg', base: 0.04, icon: '☄️' }
    ],
    sigilConf: { unlockTier: 5, cap: 150, slotsBase: 4, slotsPer: 10, slotsMax: 20, lvCostBase: 20, lvCostGrowth: 1.09, lvFinal: 0.04, lvMax: 300,
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
      { id: 'rune', name: '룬의 신전', desc: '30초 동안 잡은 룬 정령만큼 룬석, 20마리마다 룬 1개', icon: '🔮', time: 30, unlockTier: 3 }
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
      alphaDmg: { name: '알파 크리티컬 데미지', costBase: 1e29, costGrowth: 1.1, max: 300, need: ['ultimateCrit', 50] },
      // 초월 (2026-11-14): open when the stat before is maxed; adds = bonus per level (same keys as gear/relic bonuses).
      // costBase = the needed stat's last level cost. judge/origin/doomClaw/elemRule open inside the main story (user 2026-11-14).
      catEye: { name: '고양이의 눈빛', costBase: 3.25e9, costGrowth: 1.1, max: 200, need: ['crit', 140], adds: { superDmg: 0.02 }, ascend: true },
      manaBurst: { name: '마력 해방', costBase: 8.6e11, costGrowth: 1.1, max: 200, need: ['superCrit', 100], adds: { hyperDmg: 0.02 }, ascend: true },
      resonance: { name: '극한 공명', costBase: 8.6e16, costGrowth: 1.1, max: 200, need: ['ultraCrit', 100], adds: { megaDmg: 0.02 }, ascend: true },
      rift: { name: '차원 파열', costBase: 6.45e21, costGrowth: 1.1, max: 200, need: ['hyperCrit', 100], adds: { ultimateDmg: 0.02 }, ascend: true },
      arcane: { name: '비전 폭발', costBase: 4.3e25, costGrowth: 1.1, max: 200, need: ['megaCrit', 100], adds: { alphaDmg: 0.02 }, ascend: true },
      judge: { name: '왕의 심판', costBase: 2.23e26, costGrowth: 1.1, max: 200, need: ['ultimateCrit', 30], adds: { bossDmg: 0.01 }, ascend: true },
      origin: { name: '태초의 섭리', costBase: 2e29, costGrowth: 1.1, max: 200, need: ['alphaCrit', 1], adds: { finalPct: 0.005 }, ascend: true },
      haste: { name: '시간 가속', costBase: 1.2e8, costGrowth: 1.1, max: 200, need: ['speed', 100], adds: { skillDmg: 0.01 }, ascend: true },
      doomClaw: { name: '파멸의 발톱', costBase: 7.35e25, costGrowth: 1.1, max: 200, need: ['megaDmg', 150], adds: { bossDmg: 0.01 }, ascend: true },
      elemRule: { name: '원소 지배', costBase: 2.67e26, costGrowth: 1.1, max: 200, need: ['ultimateDmg', 50], adds: { weakDmg: 0.01, surgeDmg: 0.02 }, ascend: true }
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
      // difficulty modes keep the walls they had before 초월 (2026-11-14)
      diffWallMul: [1,19169.38,5566798.08,22820341.73,178880696.24,1691557414.71,8489733214.33,95531878018.25,176986468430.32,294004021895.86],
      wallMul: [1,18089.69,10335053.86,96503451.56,762058875.2,1750507849.35,12374981423.27,359382769354.56,247984443986.51,710772058448.84], wallShare: 0.7,
      goldBase: 3, goldGrowth: 1.2,
      // on a harder difficulty a monster gives at most 1/goldCapKills of the next attack level (economy.js stageGold)
      goldCapKills: 400,
      // a plain monster pays this share of its gold and experience (user 2026-11-15: too much came in) — not bosses, not dungeons
      killPay: 0.8,
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
