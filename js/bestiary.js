// Every monster and boss picture (art/<id>.webp, cut from the user's sheets by tools/cut-monsters.py):
// its name, how it gets about (gait) and which puppet body it has (body, see js/rig.js BODIES).
// gait: walk (default) · hop (slimes, bunnies) · waddle (penguins, snails) · stomp (heavy) · skitter (spiders, crabs) · float (ghosts, fish)
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var MOBS = {
    // cats (sheets 5, 6)
    c01: ['데이지 고양이', 'walk', 'catL'], c02: ['나뭇잎 삼색이', 'walk', 'catL'], c03: ['버섯 모자 고양이', 'walk', 'catL'], c04: ['이끼 고양이', 'walk', 'catL'],
    c05: ['사막 고양이', 'walk', 'catL'], c06: ['스핑크스 고양이', 'walk', 'catL'], c07: ['털모자 고양이', 'waddle', 'catL'], c08: ['아기 눈표범', 'walk', 'catL'],
    c09: ['불꽃 꼬리 고양이', 'walk', 'catL'], c10: ['용암 고양이', 'stomp', 'catL'], c11: ['물방울 고양이', 'walk', 'catL'], c12: ['물고기 모자 고양이', 'hop', 'catL'],
    c13: ['은빛 달 고양이', 'walk', 'catL'], c14: ['페르시안 고양이', 'waddle', 'catL'], c15: ['아기 사자', 'walk', 'catL'], c16: ['황금 이집트 고양이', 'walk', 'catL'],
    c17: ['우주 고양이', 'walk', 'catL'], c18: ['별무늬 고양이', 'walk', 'catL'], c19: ['아기 악마 고양이', 'walk', 'catL'], c20: ['해골 가면 고양이', 'walk', 'catL'],
    // vegetables (sheet 7)
    v01: ['가시 멧돼지', 'stomp', 'quadL'], v02: ['호두 다람쥐', 'hop', 'sitTail'], v03: ['완두콩 삼형제', 'hop', 'pod'], v04: ['당근 닌자', 'walk', 'stand'],
    v05: ['양파 유령', 'float', 'ghost'], v06: ['옥수수 병사', 'walk', 'stand'], v07: ['새싹 뿌리', 'skitter', 'sprout'], v08: ['양배추 달팽이', 'waddle', 'snail'],
    v09: ['수박 하마', 'stomp', 'quadF'], v10: ['블루베리 까치', 'hop', 'birdL'],
    // flower field (sheet 8)
    f01: ['벚꽃 슬라임', 'hop', null], f02: ['나뭇잎 고슴도치', 'waddle', 'stand'], f03: ['도토리 다람쥐', 'hop', 'standTailR'], f04: ['버섯 고양이', 'walk', 'stand'],
    f05: ['딸기 달팽이', 'waddle', 'snail'], f06: ['민들레 병아리', 'hop', 'stand'], f07: ['나뭇가지 토끼', 'hop', 'stand'], f08: ['이끼 거북', 'waddle', 'quadF'],
    f09: ['꿀벌 곰', 'float', 'flyArms'], f10: ['연꽃 개구리', 'hop', 'quadF'],
    // cave (sheet 9)
    k01: ['수정 박쥐', 'float', 'fly'], k02: ['버섯 고블린', 'walk', 'stand'], k03: ['미믹 상자', 'hop', null], k04: ['돌 골렘', 'stomp', 'stand'],
    k05: ['촛불 유령', 'float', 'ghost'], k06: ['투구 쥐', 'skitter', 'standTailL'], k07: ['마녀 거미', 'skitter', 'spider'], k08: ['광부 두더지', 'walk', 'stand'],
    k09: ['해골 강아지', 'walk', 'quadF'], k10: ['보라 문어', 'waddle', 'octo'],
    // desert and volcano (sheet 10)
    d01: ['선인장 총잡이', 'walk', 'stand'], d02: ['모래 전갈', 'skitter', 'scorpion'], d03: ['항아리 정령', 'hop', 'stand'], d04: ['사막 여우', 'walk', 'sitTail'],
    d05: ['용암 도마뱀', 'walk', 'lizard'], d06: ['용암 달팽이', 'waddle', 'snail'], d07: ['연기 정령', 'float', 'ghost'], d08: ['모래 숫양', 'stomp', 'quadF'],
    d09: ['용암 알 새', 'hop', 'flyArms'], d10: ['모래 코브라', 'waddle', 'cobra'],
    // ice and lake (sheet 11)
    i01: ['얼음 펭귄', 'waddle', 'stand'], i02: ['눈꽃 토끼', 'hop', 'stand'], i03: ['얼음 늑대', 'walk', 'wolf'], i04: ['수정 게', 'skitter', 'spider'],
    i05: ['얼음 물범', 'waddle', 'seal'], l06: ['조약돌 수달', 'waddle', 'sitTail'], l07: ['물방울 해파리', 'float', 'jelly'], l08: ['진주 조개', 'hop', null],
    l09: ['달빛 부엉이', 'float', 'fly'], l10: ['별자리 여우', 'walk', 'foxTail'],
    // galaxy and dark (sheet 12)
    g01: ['별 슬라임', 'hop', null], g02: ['우주 가오리', 'float', 'fly'], g03: ['운석 거북', 'stomp', 'quadF'], g04: ['달 나방', 'float', 'fly'],
    g05: ['태양 풍뎅이', 'skitter', 'spider'], g06: ['수정 기사', 'stomp', 'stand'], g07: ['그림자 고양이', 'walk', 'sitTail'], g08: ['가시 호박', 'stomp', 'stand'],
    g09: ['꼬마 악마', 'walk', 'flyArms'], g10: ['저주 인형', 'walk', 'stand'],
    // sweets and crystals (sheet 13)
    s01: ['치즈 고블린', 'walk', 'stand'], s02: ['푸딩 슬라임', 'hop', null], s03: ['프레첼 강아지', 'walk', 'sitDog'], s04: ['진저브레드 기사', 'walk', 'stand'],
    s05: ['마시멜로 유령', 'float', 'ghost'], s06: ['빵 꿀벌', 'float', 'flyArms'], s07: ['무지개 장수풍뎅이', 'skitter', 'spider'], s08: ['수정 우파루파', 'hop', 'quadF'],
    s09: ['오팔 카멜레온', 'walk', 'quadL'], s10: ['어둠의 알', 'hop', null],
    // east and sea (sheet 14)
    o01: ['복숭아 원숭이', 'hop', 'standTailL'], o02: ['대나무 판다', 'stomp', 'stand'], o03: ['연꽃 잉어', 'float', 'fish'], o04: ['산호 용', 'walk', 'dragonL'],
    o05: ['북 치는 소라게', 'skitter', 'stand'], o06: ['비취 고블린', 'walk', 'stand'], o07: ['조개 전사', 'walk', 'stand'], o08: ['가시 복어', 'float', null],
    o09: ['수정 불가사리', 'hop', null], o10: ['해초 해마', 'float', 'seahorse']
  };
  // bosses: name, body, flies?
  var BOSSES = {
    b01: ['사나운 불독', 'quadL'], b02: ['박쥐 백작', 'fly', 1], b03: ['거대 독수리', 'eagle'], b04: ['설원 늑대', 'quadL'], b05: ['불꽃 도마뱀', 'quadL'],
    b06: ['호수 악어', 'quadL'], b07: ['공포의 부엉이', 'fly', 1], b08: ['황금 하이에나', 'quadL'], b09: ['우주 뱀', 'snake'], b10: ['늑대 왕', 'quadL'],
    b11: ['사슬 마도서', null], b12: ['태엽 공작', 'peacock'], b13: ['번개 코뿔소', 'quadF'], b14: ['황금 코브라', 'cobra'], b15: ['판다 장군', 'stand'],
    b16: ['왕관 아귀', 'quadF'], b17: ['해마 여왕', 'seahorse'], b18: ['번개 악어', 'quadF'], b19: ['별자리 양', 'stand'], b20: ['수정 드래곤', 'fly'],
    b21: ['비취 뱀', 'quadF'], b22: ['장미 여왕', 'stand'], b23: ['버섯 히드라', 'quadF'], b24: ['파라오 풍뎅이', 'stand'], b25: ['바다코끼리 왕', 'quadF'],
    b26: ['유령 해적', 'stand'], b27: ['붉은 도깨비', 'stand'], b28: ['탐욕의 솥', null], b29: ['거울 가면', 'stand'], b30: ['진주 용', 'quadF'],
    b31: ['불사조 부엉이', 'fly'], b32: ['서리 매머드', 'quadF'], b33: ['잿빛 늑대 군주', 'stand'], b34: ['심연 문어', 'octo'], b35: ['진주 거북', 'quadF'],
    b36: ['달빛 부엉이 군주', 'fly'], b37: ['태양 사자', 'stand'], b38: ['우주 나가', 'cobra'], b39: ['흡혈 박쥐 왕', 'fly', 1], b40: ['어둠 기사', 'stand'],
    b41: ['가시덤불 곰', 'stand'], b42: ['버섯 왕', 'stand'], b43: ['숲의 정령왕', 'stand'], b44: ['여왕벌', 'flyArms'], b45: ['수정 거미 여왕', 'spider'],
    b46: ['미믹 왕', null], b47: ['수정 골렘', 'stand'], b48: ['아누비스', 'stand'], b49: ['전갈 왕', 'scorpion'], b50: ['용암 마왕', 'flyArms']
  };
  var info = {};
  Object.keys(MOBS).forEach(function (id) { var m = MOBS[id]; info[id] = { name: m[0], gait: m[1], body: m[2] }; });
  Object.keys(BOSSES).forEach(function (id) { var b = BOSSES[id]; info[id] = { name: b[0], gait: 'walk', body: b[1], flyer: !!b[2], boss: true }; });
  return { BESTIARY: info };
});
