// 운영자 편지 보내기 (2026-11-15, the user: 운영자 화면에서 우편함 편지 보내기). The page ops.html uses this to build a
// letter and to change mail.json on the site; tools/build-site.cjs uses mailMerge so a rebuilt site keeps what was sent
// from ops.html. Letters always read the same way (the user's picture): 「안녕하세요, 냥법사님!」, a blank line, three short
// lines, 「냥법사 운영팀 드림」; a gift letter is titled 「모험 응원 선물」. Not loaded by the game itself.
(function (root, f) { if (typeof module !== 'undefined' && module.exports) module.exports = f(require('./mail.js'), require('./mail-gift.js')); else { root.CW = root.CW || {}; Object.assign(root.CW, f(root.CW, root.CW)); } })(this, function (M, GF) {
  var GIFT_TEXT = '안녕하세요, 냥법사님!\n\n오늘도 모험을 즐겨주셔서 고마워요.\n작은 응원 선물을 준비했어요.\n새로운 모험도 함께해 주세요!';
  var GOLD_MAX = 9999e16;       // the most gold a player can hold: 9999경 (js/economy.js capGold)
  var GEMS_MAX = 100000000;     // 1억 diamonds per letter at most, so a typo cannot break a save
  var PID = /^[0-9A-HJ-NP-Z]{8}$/; // player numbers (js/mail.js mailPid: no I, no O)

  // today's date in Korean time, YYYY-MM-DD
  function kstDay(now, plusDays) {
    var d = new Date((now || Date.now()) + 9 * 3600e3 + (plusDays || 0) * 864e5);
    return d.toISOString().slice(0, 10);
  }
  // 500000 → 50만, 1500000000300 → 1조 5000억 300 (the same words the game's mailbox uses)
  function countText(n) { return M.goldWords(n); }
  // what the 골드 box says, as gold: "1조 5000억 300", "5000억", "1,000,000", "1.5조", "골드 300" → a whole number;
  // '' → 0; anything it cannot read → NaN (2026-11-15, the user: 1원부터 9999조까지; 2026-11-16: 9999경까지)
  function parseGold(text) {
    var t = String(text == null ? '' : text).replace(/[,\s]|골드|원/g, '');
    if (!t) return 0;
    if (!/^(\d+(\.\d+)?(경|조|억|만)?)+$/.test(t)) return NaN;
    var sum = 0, unit = { '경': 1e16, '조': 1e12, '억': 1e8, '만': 1e4, '': 1 };
    t.replace(/(\d+(?:\.\d+)?)(경|조|억|만)?/g, function (m, n, u) { sum += parseFloat(n) * unit[u || '']; return m; });
    var r = Math.round(sum);
    return Math.abs(r - sum) < 1e-6 ? r : NaN;
  }
  // does the words end with a sound that takes 과/을 (조 → 와/를, 억 · 만 · 300 (삼백) → 과/을)
  function closed(words) {
    var c = words.slice(-1);
    if (c === '조') return false; if (c === '억' || c === '만' || c === '경') return true;
    var m = /(\d+)$/.exec(words); if (!m) return false;
    var n = m[1].replace(/^0+/, ''); if (/0$/.test(n)) return true; // 십 · 백 · 천
    return '013678'.indexOf(n.slice(-1)) >= 0;                      // 일 삼 육 칠 팔 (영)
  }
  // give: the other currencies and items (js/mail-gift.js, 2026-11-16). With them the line names the first thing and
  // how many more: 「마력석 3만 외 2가지 선물이에요」
  function rewardSub(gold, gems, give) {
    var gl = give && GF && GF.giftLines ? GF.giftLines({ give: give }) : [];
    if (gl.length) {
      var all = []; if (+gold > 0) all.push('골드 ' + countText(gold)); if (+gems > 0) all.push('다이아 ' + countText(gems) + '개');
      all = all.concat(gl.map(function (x) { return x.text; }));
      return all.length === 1 ? all[0] + ' 선물이에요' : all[0] + ' 외 ' + (all.length - 1) + '가지 선물이에요';
    }
    var g = +gold > 0, d = +gems > 0, w = g ? countText(gold) : '';
    if (g && d) return '골드 ' + w + (closed(w) ? '과' : '와') + ' 다이아 ' + countText(gems) + '개를 보내요';
    if (g) return '골드 ' + w + (closed(w) ? '을' : '를') + ' 보내요';
    if (d) return '다이아 ' + countText(gems) + '개를 보내요';
    return '';
  }
  // "AB12CD34, ef56gh78" → ['AB12CD34', 'EF56GH78']
  function parseTo(text) {
    return String(text || '').toUpperCase().split(/[\s,;·]+/).filter(Boolean);
  }
  // what is wrong with the form, or '' when it can be sent. f.gold is the 골드 box as typed
  function mailCheck(f) {
    var g = parseGold(f.gold), d = +f.gems || 0, items = f.give && GF ? GF.giftHas({ give: f.give }) : false;
    if (!isFinite(g)) return '골드를 읽지 못했어요. 「1조 5000억」이나 「300」처럼 적어 주세요.';
    if (!(g > 0) && !(d > 0) && !items) return '골드나 다이아, 다른 재화나 아이템 중 하나는 넣어 주세요.';
    if (d < 0 || Math.floor(d) !== d) return '다이아는 0 이상의 정수로 적어 주세요.';
    if (g > GOLD_MAX) return '골드는 한 번에 9999경까지예요(가질 수 있는 최대 골드).';
    if (d > GEMS_MAX) return '다이아는 한 번에 1억 개까지예요.';
    if (f.toAll === false) {
      var to = parseTo(f.toText);
      if (!to.length) return '받는 사람 우편번호를 적어 주세요.';
      var bad = to.filter(function (p) { return !PID.test(p); });
      if (bad.length) return '우편번호가 이상해요: ' + bad.join(', ') + ' (8글자, I·O는 없어요)';
    }
    if (f.from && f.until && f.until < f.from) return '받을 수 있는 마지막 날이 첫날보다 빨라요.';
    return '';
  }
  // the letter as mail.json keeps it; gold is written in 조 like the letters before (0.5 = 5000억, 1e-12 = 1 gold)
  function mailMake(f, now) {
    now = now || Date.now();
    var g = parseGold(f.gold), stamp = new Date(now + 9 * 3600e3).toISOString().replace(/[-:T]/g, '').slice(0, 14);
    var l = {
      id: 'gift-' + stamp + '-' + Math.random().toString(36).slice(2, 6),
      title: String(f.title || '').trim().slice(0, 30) || '모험 응원 선물',
      sub: String(f.sub || '').trim() || rewardSub(g, f.gems, f.give),
      text: String(f.text || '').replace(/\r\n/g, '\n').trim().slice(0, 800) || GIFT_TEXT,
      sign: '냥법사 운영팀 드림',
      sender: '운영팀',
      date: kstDay(now),
      to: f.toAll === false ? parseTo(f.toText) : 'all'
    };
    if (f.from && f.from > kstDay(now)) l.from = f.from;
    if (f.until) l.until = f.until;
    if (g > 0) l.goldJo = g / 1e12;
    if (+f.gems > 0) l.gems = +f.gems;
    if (f.give && GF && GF.giftHas({ give: f.give })) l.give = GF.giftOf({ give: f.give });
    l.by = 'ops';
    return l;
  }
  function doc0(doc) { doc = doc && typeof doc === 'object' ? doc : {}; return { note: doc.note, letters: Array.isArray(doc.letters) ? doc.letters.slice() : [], removed: Array.isArray(doc.removed) ? doc.removed.slice() : [] }; }
  function clean(doc) { var o = {}; if (doc.note) o.note = doc.note; o.letters = doc.letters; if (doc.removed.length) o.removed = doc.removed; return o; }
  // newest letter first
  function mailAdd(doc, letter) { var d = doc0(doc); d.letters.unshift(letter); return clean(d); }
  // take a letter off the list; its id is remembered so a rebuilt site does not bring it back
  function mailRemove(doc, id) {
    var d = doc0(doc); d.letters = d.letters.filter(function (l) { return !l || l.id !== id; });
    if (d.removed.indexOf(id) < 0) d.removed.push(id);
    return clean(d);
  }
  // the site's mail.json (may have letters sent from ops.html) + the project's mail.json (letters added by hand):
  // every letter once, none that was taken off, newest date first
  function mailMerge(site, main) {
    var s = doc0(site), m = doc0(main), removed = s.removed.slice();
    m.removed.forEach(function (id) { if (removed.indexOf(id) < 0) removed.push(id); });
    var seen = {}, out = [];
    s.letters.concat(m.letters).forEach(function (l) {
      if (!l || typeof l.id !== 'string' || seen[l.id] || removed.indexOf(l.id) >= 0) return;
      seen[l.id] = 1; out.push(l);
    });
    out = out.map(function (l, i) { return { l: l, i: i }; }).sort(function (a, b) { return (b.l.date || '').localeCompare(a.l.date || '') || a.i - b.i; }).map(function (x) { return x.l; });
    return clean({ note: m.note || s.note, letters: out, removed: removed });
  }
  function mailText(doc) { return JSON.stringify(doc, null, 2) + '\n'; }
  return { GIFT_TEXT: GIFT_TEXT, kstDay: kstDay, countText: countText, parseGold: parseGold, rewardSub: rewardSub, parseTo: parseTo, mailCheck: mailCheck, mailMake: mailMake, mailAdd: mailAdd, mailRemove: mailRemove, mailMerge: mailMerge, mailText: mailText };
});
