// 짧게 적기 (2026-11-23, 형: 알릴 내용에 「패키지 판매」처럼 간단히 적으면 무슨 패키지를 파는지 알아서 판단해 공지를 자동으로,
// 업데이트·이벤트·점검도 마찬가지). ops.html only. A short line + the game's own data (packages, the 운영 달력 windows, coupons)
// → which kind of notice it is, its boxes filled in, and the whole notice in the polite voice (3 ways: n = 0, 1, 2).
//   smartNotice(text, ctx, n) → { kind: 'pack'|'coupon'|'maint'|'update'|'event', tag, title, text, fields, note } or null
//   ctx: { DATA, today 'YYYY-MM-DD', packWindows [{ id, from, until }], coupons [...], giftText(reward) }
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  function W() { return isNode ? require('./ops-write.js') : root.CW; }
  var HI = '안녕하세요, 냥법사님.';
  function v(x) { return String(x == null ? '' : x).trim(); }
  function pick(a, n) { n = Math.floor(+n || 0) % a.length; return a[n < 0 ? n + a.length : n]; }
  function para(ps) { return ps.map(function (p) { return (Array.isArray(p) ? p : [p]).filter(function (l) { return v(l); }).join('\n'); }).filter(Boolean).join('\n\n'); }
  function ko(n) { return Math.round(+n || 0).toLocaleString('ko-KR'); }
  // 받침이 있으면 a(이·을), 없으면 b(가·를)
  function josa(word, a, b) {
    var w = v(word), c = w.charCodeAt(w.length - 1);
    var has = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : /[0-9lmnLMN]$/.test(w);
    return w + (has ? a : b);
  }
  // ---- days
  function dayAt(today, add) { var d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + add); return d.toISOString().slice(0, 10); }
  function md(day) { var m = /^\d{4}-(\d\d)-(\d\d)$/.exec(day || ''); return m ? (+m[1]) + '월 ' + (+m[2]) + '일' : ''; }
  function wd(day) { return '일월화수목금토'[new Date(day + 'T12:00:00Z').getUTCDay()]; }
  function kday(t) { var n = Date.parse(t || ''); return isFinite(n) ? new Date(n + 9 * 3600e3).toISOString().slice(0, 10) : ''; }
  // 「11월 25일」 → that day this year (or next year when it already passed long ago)
  function mdDay(today, m, d) {
    var y = +today.slice(0, 4), day = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    return day < dayAt(today, -60) ? (y + 1) + day.slice(4) : day;
  }
  function hhmm(h, m) { return String(((h % 24) + 24) % 24).padStart(2, '0') + ':' + String(m || 0).padStart(2, '0'); }

  // ---- 패키지
  function giveText(D, g) {
    var hn = function (x) { return (D.hiGrades[x] && D.hiGrades[x].name) || ''; }, out = [];
    var hrs = function (m) { return m >= 60 ? m / 60 + '시간' : m + '분'; };
    if (g.gems) out.push('다이아 ' + ko(g.gems));
    if (g.daily) out.push(g.daily.days + '일 동안 매일 다이아 ' + ko(g.daily.gems));
    if (g.pulls) out.push('장비 뽑기 ' + g.pulls + '번');
    if (g.goldMin) out.push('골드 (사냥 ' + hrs(g.goldMin) + '치)');
    if (g.potionMin) out.push('물약 3종 ' + hrs(g.potionMin));
    if (g.mana) out.push('마력석 ' + ko(g.mana));
    (g.runes || []).forEach(function (x) { out.push(hn(x.grade) + ' 룬 ' + x.n + '개'); });
    if (g.runeStone) out.push('룬석 ' + ko(g.runeStone));
    (g.sigils || []).forEach(function (x) { out.push(hn(x.grade) + ' 신성력 ' + x.n + '개'); });
    if (g.sigilStone) out.push('신성석 ' + ko(g.sigilStone));
    return out.join(' · ');
  }
  var CAT = { winter: '겨울 신규 냥법사', daily: '매일 다이아', grow: '성장', tier: '전직 축하', rune: '룬·신성력', gear: '장비 뽑기' };
  var CAT_WORDS = [[/겨울|신규|첫눈|눈사람/, 'winter'], [/매일|데일리/, 'daily'], [/전직/, 'tier'], [/성장|골드|마력/, 'grow'], [/룬|신성/, 'rune'], [/장비|뽑기/, 'gear']];
  function packsFor(text, ctx) {
    var D = ctx.DATA, all = D.packs.filter(function (p) { return !p.off; });
    var byName = all.filter(function (p) { return text.indexOf(p.name) >= 0; });
    if (byName.length) return byName;
    for (var i = 0; i < CAT_WORDS.length; i++) if (CAT_WORDS[i][0].test(text)) { var c = CAT_WORDS[i][1], l = all.filter(function (p) { return p.cat === c; }); if (l.length) return l; }
    // 그냥 「패키지 판매」: 운영 달력에 지금 열려 있거나 2주 안에 열리는 패키지
    var soon = dayAt(ctx.today, 14), win = (ctx.packWindows || []).filter(function (w) { return w.until >= ctx.today && w.from <= soon; });
    var ids = win.map(function (w) { return w.id; }), cal = all.filter(function (p) { return ids.indexOf(p.id) >= 0; });
    return cal.length ? cal : all.filter(function (p) { return p.cat === 'winter'; });
  }
  function packNotice(text, ctx, n) {
    var D = ctx.DATA, list = packsFor(text, ctx); if (!list.length) return null;
    var cats = []; list.forEach(function (p) { if (cats.indexOf(p.cat) < 0) cats.push(p.cat); });
    var group = cats.length === 1 ? CAT[cats[0]] || '새' : '새', name = group + ' 패키지';
    var wins = (ctx.packWindows || []).filter(function (w) { return list.some(function (p) { return p.id === w.id; }); });
    var from = wins.map(function (w) { return w.from; }).sort()[0], until = wins.map(function (w) { return w.until; }).sort().pop();
    var period = wins.length && list.every(function (p) { return p.cal; }) ? md(from) + ' ~ ' + md(until) : '상시';
    var lines = []; list.forEach(function (p) {
      lines.push([p.icon + ' ' + p.name + ' · ' + ko(p.won) + '원' + (p.limit === 1 ? ' · 한 번만' : '') + (p.need && p.need.tier ? ' · ' + p.need.tier + '차 전직 후' : ''), '- ' + giveText(D, p.give)]);
    });
    var info = ['판매 기간: ' + period, '살 수 있는 곳: 상점 › 패키지'];
    var body = lines.map(function (l) { return l.join('\n'); });
    var t = pick([
      { title: name + ' 판매 안내', text: para([HI, josa(name, '을', '를') + ' 판매합니다.', info].concat(body).concat([['많은 관심 부탁드립니다.', '감사합니다.']])) },
      { title: name + ' 출시', text: para([HI, '냥법사님의 모험에 힘이 될 ' + name + '가 나왔습니다.'.replace(name + '가', josa(name, '이', '가')), info].concat(body).concat([['기간 안에 꼭 만나 보시기 바랍니다.', '감사합니다.']])) },
      { title: name + ' 판매 시작', text: para([HI, '오늘부터 ' + josa(name, '을', '를') + ' 만나 보실 수 있습니다.'].concat(body).concat([info, ['즐거운 모험 되시기 바랍니다.', '감사합니다.']])) }], n);
    return { kind: 'pack', tag: '공지', title: t.title, text: t.text, fields: { what: text },
      note: '패키지 판매 · ' + (cats.length === 1 ? (CAT[cats[0]] || '') + ' ' : '') + list.length + '종 · ' + (period === '상시' ? '상시 판매' : period) };
  }
  // ---- 쿠폰
  function couponNotice(text, ctx, n) {
    var cs = (ctx.coupons || []).filter(function (c) { return c && c.code; });
    var m = /[A-Za-z0-9]{6,16}/.exec(text), named = m && cs.filter(function (c) { return c.code === m[0].toUpperCase(); })[0];
    var live = cs.filter(function (c) { return c.active !== false && (!c.ends_at || kday(c.ends_at) >= ctx.today); })
      .sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
    var c = named || live[0] || null;
    var code = c ? c.code : (m ? m[0].toUpperCase() : '(번호를 적어 주세요)');
    var from = c && c.starts_at ? kday(c.starts_at) : '', until = c && c.ends_at ? kday(c.ends_at) : '';
    var period = from || until ? (from ? md(from) : '지금부터') + ' ~ ' + (until ? md(until) : '끝없음') : '';
    var reward = c && c.reward && ctx.giftText ? ctx.giftText(c.reward) : '';
    var lines = ['쿠폰 번호: ' + code, period && '사용 기간: ' + period, reward && '보상: ' + reward, '쓰는 곳: 설정 › 쿠폰 입력'];
    var t = pick([
      { title: '쿠폰 안내', text: para([HI, '냥법사님을 위한 쿠폰을 준비했습니다.', lines, ['한 사람은 한 번만 받을 수 있습니다.', '감사합니다.']]) },
      { title: (c && c.title) || '선물 쿠폰 안내', text: para([HI, '감사의 마음을 담아 쿠폰 선물을 드립니다.', lines, ['기간 안에 꼭 사용해 주시기 바랍니다.', '감사합니다.']]) },
      { title: '쿠폰 번호 공개', text: para([HI, '쿠폰 번호를 알려 드립니다.', lines, ['받은 보상은 가방에서 열 수 있습니다.', '감사합니다.']]) }], n);
    return { kind: 'coupon', tag: '이벤트', title: t.title, text: t.text, fields: { what: text }, note: '쿠폰 · ' + code + (period ? ' · ' + period : '') };
  }
  // ---- 점검: 날 · 시각 · 길이(또는 ~끝 시각) · 보상
  function maintNotice(text, ctx, n) {
    var t = ' ' + text + ' ', day = '', rest = text;
    var take = function (re) { var m = re.exec(t); if (m) { t = t.replace(m[0], ' '); } return m; };
    var m;
    if ((m = take(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/))) day = mdDay(ctx.today, +m[1], +m[2]);
    else if ((m = take(/모레/))) day = dayAt(ctx.today, 2);
    else if ((m = take(/내일/))) day = dayAt(ctx.today, 1);
    else if ((m = take(/오늘/))) day = ctx.today;
    var ap = take(/(새벽|오전|오후|저녁|밤)/), pm = ap && /오후|저녁|밤/.test(ap[1]);
    var hour = function (h) { h = +h; return pm && h < 12 ? h + 12 : (!pm && h === 12 && ap && /새벽|오전/.test(ap[1]) ? 0 : h); };
    var start = null, end = null;
    if ((m = take(/(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?\s*(?:~|-|부터)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?(?:\s*까지)?/))) {
      start = [hour(m[1]), m[2] ? +m[2] : m[3] ? 30 : 0]; end = [hour(m[4]), m[5] ? +m[5] : m[6] ? 30 : 0];
      if (end[0] < start[0] && pm && end[0] + 12 < 24) end[0] += 12;
    } else if ((m = take(/(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*(반))?/))) {
      start = [hour(m[1]), m[2] ? +m[2] : m[3] ? 30 : 0];
      var du = take(/(\d{1,2})\s*시간(?:\s*(\d{1,2})\s*분)?/), dm = !du && take(/(\d{1,3})\s*분/);
      var mins = du ? +du[1] * 60 + (du[2] ? +du[2] : 0) : dm ? +dm[1] : 0;
      if (mins) { var e = start[0] * 60 + start[1] + mins; end = [Math.floor(e / 60), e % 60]; }
    }
    var rw = take(/보상\s*([^,]+?)\s*$/) || take(/(다이아\s*\d[\d,]*\s*개?)/);
    var reward = rw ? v(rw[1]).replace(/개$/, '') : '';
    var what = v(t.replace(/점검|서버|진행|예정|안내|있습니다|합니다/g, ' ').replace(/\s+/g, ' '));
    var time = '';
    if (day || start) {
      time = (day ? md(day) + '(' + wd(day) + ')' : '') + (start ? (day ? ' ' : '') + hhmm(start[0], start[1]) + (end ? ' ~ ' + hhmm(end[0], end[1]) : ' 부터') : '');
    }
    var fields = { time: time, what: what || '서버 안정화 작업', reward: reward };
    var r = W().noticeWrite('점검', fields, n);
    return { kind: 'maint', tag: '점검', title: r.title, text: r.text, fields: fields, note: '점검 · ' + (time || '시간 못 찾음 (예: 내일 새벽 2시 2시간)') + (reward ? ' · 보상 ' + reward : '') };
  }
  // ---- 업데이트: 새로 생긴 것 · 고친 것
  var FIX = /고침|고쳤|수정|버그|오류|안\s*되던|안되던|해결/;
  function updateNotice(text, ctx, n) {
    var items = text.replace(/업데이트|안내|소식/g, ' ').split(/[,\n·/]+|\s+그리고\s+/).map(v).filter(Boolean);
    var added = [], fixed = [];
    items.forEach(function (it) {
      if (FIX.test(it)) {
        var w = v(it.replace(/(을|를)?\s*(고침|고쳤음|고쳤습니다|고쳤어|수정함|수정|해결|버그\s*고침)$/, ''));
        fixed.push(/문제$|오류$|버그$/.test(w) ? josa(w, '을', '를') + ' 고쳤습니다.' : w + ' 문제를 고쳤습니다.');
      } else {
        var a = v(it.replace(/(이|가)?\s*(추가됨|추가|생김|생겼음|새로\s*생김|출시|도입|등장)$/, '').replace(/^새로\s*/, ''));
        if (a) added.push(josa(a, '이', '가') + ' 추가되었습니다.');
      }
    });
    if (!added.length && !fixed.length) return null;
    var fields = { added: added.join('\n'), fixed: fixed.join('\n') };
    var r = W().noticeWrite('업데이트', fields, n);
    return { kind: 'update', tag: '업데이트', title: r.title, text: r.text, fields: fields, note: '업데이트 · 새로 생긴 것 ' + added.length + '개 · 고친 것 ' + fixed.length + '개' };
  }
  // ---- 이벤트: 이름 · 기간 · 내용
  function eventNotice(text, ctx, n) {
    var t = ' ' + text + ' ', from = ctx.today, until = '', m;
    var take = function (re) { var x = re.exec(t); if (x) t = t.replace(x[0], ' '); return x; };
    if ((m = take(/(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:~|-|부터)\s*(?:(\d{1,2})\s*월\s*)?(\d{1,2})\s*일(?:\s*까지)?/))) {
      from = mdDay(ctx.today, +m[1], +m[2]); until = mdDay(ctx.today, m[3] ? +m[3] : +m[1], +m[4]); if (until < from) until = (+until.slice(0, 4) + 1) + until.slice(4);
    } else if ((m = take(/(\d{1,2})\s*(주|일|달|개월)(?:\s*동안|간)?/))) {
      var k = +m[1], u = m[2];
      if (u === '주') until = dayAt(from, k * 7 - 1); else if (u === '일') until = dayAt(from, k - 1);
      else { var W2 = isNode ? require('./ops-cal.js') : root.CW; until = W2.calRange(from, k >= 2 ? 'month2' : 'month').until; }
    } else if ((m = take(/(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*까지/))) until = mdDay(ctx.today, +m[1], +m[2]);
    var parts = t.split(/이벤트/), name = v((parts[0] || '').replace(/오늘부터|부터|새로운|새/g, ' ').replace(/\s+/g, ' ')), what = v((parts[1] || '').replace(/\s+/g, ' ').replace(/^(을|를|은|는|안내|시작)\s*/, ''));
    var fields = { name: name, period: until ? md(from) + ' ~ ' + md(until) : '', what: what, where: /출석|접속/.test(text) ? '우편함' : '' };
    var r = W().noticeWrite('이벤트', fields, n);
    return { kind: 'event', tag: '이벤트', title: r.title, text: r.text, fields: fields, note: '이벤트 · ' + (name || '이름 없음') + (fields.period ? ' · ' + fields.period : '') };
  }

  function smartNotice(text, ctx, n) {
    text = v(text); if (!text || !ctx || !ctx.DATA) return null;
    if (/점검/.test(text)) return maintNotice(text, ctx, n);
    if (/쿠폰/.test(text)) return couponNotice(text, ctx, n);
    if (/패키지|상품|판매/.test(text)) return packNotice(text, ctx, n);
    if (/업데이트|추가|고침|고쳤|수정|버그|새\s*기능|출시/.test(text)) return updateNotice(text, ctx, n);
    if (/이벤트/.test(text)) return eventNotice(text, ctx, n);
    return null;
  }
  return { smartNotice: smartNotice, josa: josa, packGiveText: giveText };
});
