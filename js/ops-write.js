// 운영자 페이지 자동 글쓰기 (2026-11-23, 형: 공지면 공지에 맞게, 편지는 편지 형식에 맞게 자동으로 써지게 하고 틀리면 내가 수정).
// ops.html only: a letter kind (+ a few small boxes + the gift being sent) → title, list line and text in the polite letter
// voice (~합니다); a notice kind (+ boxes) → tag, title, text. autoText keeps whatever the ops person typed over it.
// The 「냥법사 운영팀 드림」 line is not written here (the letter screen adds it).
(function (root, f) { var m = f(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  var HI = '안녕하세요, 냥법사님.';
  function v(x) { return String(x == null ? '' : x).trim(); }
  function giftLine(g) { return v(g) ? '보내 드리는 선물: ' + v(g) : ''; }
  // paragraphs (arrays of lines); empty lines and empty paragraphs drop out
  function para(ps) {
    return ps.map(function (p) { return (Array.isArray(p) ? p : [p]).filter(function (l) { return v(l); }).join('\n'); })
      .filter(Boolean).join('\n\n');
  }

  // 다시 쓰기 (2026-11-23, 형: 마음에 안 들면 재작성): every kind says it 3 ways; v = which way (0, 1, 2, then round again).
  // way 0 is the first text the page wrote before. desc: the small line on the kind's card.
  var LETTER_VARIANTS = 3;
  function pick(arr, n) { n = Math.floor(+n || 0) % arr.length; return arr[n < 0 ? n + arr.length : n]; }
  var LETTER_KINDS = [
    { id: 'maint', name: '🛠 점검 보상', icon: '🛠', label: '점검 보상', desc: '점검 끝난 뒤', fields: [{ key: 'time', label: '점검 시간', ph: '예: 11월 24일 새벽 2시~4시' }],
      write: function (f, g, n) {
        var t = v(f.time);
        return pick([
          { title: '점검 보상 안내', sub: '점검 보상을 보내 드립니다', text: para([HI,
            [(t ? t + ' ' : '안정적인 서비스를 위한 ') + '점검 동안 기다려 주셔서 진심으로 감사드립니다.', '불편을 드린 점 양해 부탁드리며, 점검 보상을 보내 드립니다.'],
            giftLine(g), ['앞으로도 더 쾌적한 모험을 즐기실 수 있도록 최선을 다하겠습니다.', '감사합니다.']]) },
          { title: '점검 완료 보상', sub: '점검을 마치고 보상을 보내 드립니다', text: para([HI,
            [(t ? t + ' ' : '') + '점검을 무사히 마쳤습니다.', '기다려 주신 냥법사님께 감사의 마음을 담아 보상을 보내 드립니다.'],
            giftLine(g), ['더 안정적인 냥법사가 되도록 계속 살피겠습니다.', '감사합니다.']]) },
          { title: '기다려 주셔서 감사합니다', sub: '점검 동안 기다려 주신 보답입니다', text: para([HI,
            ['점검으로 잠시 모험이 멈춰 불편하셨을 텐데 기다려 주셔서 감사합니다.', t ? '점검 시간: ' + t : ''], '작은 보상을 준비했습니다.',
            giftLine(g), ['오늘도 즐거운 모험 되시기 바랍니다.', '감사합니다.']]) }], n);
      } },
    { id: 'sorry', name: '🙇 사과 보상', icon: '🙇', label: '사과 보상', desc: '불편 사과', fields: [{ key: 'why', label: '무엇 때문에', ph: '예: 접속 오류' }],
      write: function (f, g, n) {
        var w = v(f.why);
        return pick([
          { title: '사과의 말씀', sub: '사과의 뜻을 담은 보상을 보내 드립니다', text: para([HI,
            [(w ? w + ' 때문에' : '이용 중') + ' 불편을 드려 진심으로 사과드립니다.', '작은 정성이지만 사과의 뜻을 담아 보상을 보내 드립니다.'],
            giftLine(g), ['같은 문제가 생기지 않도록 꼼꼼히 살피고 개선하겠습니다.', '너그러운 이해에 감사합니다.']]) },
          { title: '불편을 드려 죄송합니다', sub: '미안한 마음을 담아 보상을 보내 드립니다', text: para([HI,
            [(w ? w + ' 때문에 ' : '') + '많이 불편하셨을 텐데 정말 죄송합니다.', '미안한 마음을 담아 보상을 보내 드립니다.'],
            giftLine(g), ['문제가 다시 생기지 않도록 꼼꼼히 고치겠습니다.', '감사합니다.']]) },
          { title: '사과 보상 안내', sub: '사과의 선물을 보내 드립니다', text: para([HI,
            ['이용에 불편을 드린 점 깊이 사과드립니다.', w ? '원인: ' + w : ''], '사과의 뜻으로 작은 선물을 준비했습니다.',
            giftLine(g), ['더 나은 냥법사가 되도록 노력하겠습니다.', '감사합니다.']]) }], n);
      } },
    { id: 'event', name: '🎉 이벤트 선물', icon: '🎉', label: '이벤트 선물', desc: '이벤트 보상', fields: [{ key: 'name', label: '이벤트 이름', ph: '예: 첫눈' }],
      write: function (f, g, n) {
        var e = v(f.name) ? v(f.name) + ' ' : '';
        return pick([
          { title: e + '이벤트 보상 안내', sub: '이벤트 선물을 보내 드립니다', text: para([HI,
            [e + '이벤트에 참여해 주셔서 감사합니다.', '약속드린 이벤트 선물을 보내 드립니다.'],
            giftLine(g), ['앞으로도 즐거운 이벤트로 찾아뵙겠습니다.', '감사합니다.']]) },
          { title: e + '이벤트 선물', sub: '함께해 주신 분께 선물을 보내 드립니다', text: para([HI,
            [e + '이벤트는 즐거우셨나요?', '함께해 주신 냥법사님께 이벤트 선물을 보내 드립니다.'],
            giftLine(g), ['다음 이벤트도 기대해 주시기 바랍니다.', '감사합니다.']]) },
          { title: e + '이벤트 보상 도착', sub: '이벤트 보상이 도착했습니다', text: para([HI,
            ['축하드립니다!', e + '이벤트 보상이 도착했습니다.'],
            giftLine(g), ['앞으로도 냥법사와 함께 즐거운 시간 보내시기 바랍니다.', '감사합니다.']]) }], n);
      } },
    { id: 'welcome', name: '🐾 신규 환영', icon: '🐾', label: '신규 환영', desc: '처음 온 분께', fields: [],
      write: function (f, g, n) {
        return pick([
          { title: '환영 선물', sub: '환영 선물을 보내 드립니다', text: para([HI,
            ['냥법사의 세계에 오신 것을 환영합니다.', '첫 모험을 응원하는 마음을 담아 선물을 보내 드립니다.'],
            giftLine(g), ['천천히, 즐겁게 모험을 즐겨 주시기 바랍니다.', '감사합니다.']]) },
          { title: '냥법사가 되신 것을 환영합니다', sub: '처음 오신 분께 선물을 보내 드립니다', text: para([HI,
            ['처음 만나 반갑습니다.', '냥법사가 되신 것을 축하하며 환영 선물을 보내 드립니다.'],
            giftLine(g), ['궁금한 점은 언제든 공지를 확인해 주시기 바랍니다.', '감사합니다.']]) },
          { title: '환영 선물 도착', sub: '첫 모험 선물이 도착했습니다', text: para([HI,
            ['새로운 냥법사님을 진심으로 환영합니다.', '첫 모험에 힘이 되도록 선물을 준비했습니다.'],
            giftLine(g), ['즐겁고 신나는 모험 되시기 바랍니다.', '감사합니다.']]) }], n);
      } },
    { id: 'coupon', name: '🎟️ 쿠폰 안내', icon: '🎟️', label: '쿠폰 안내', desc: '쿠폰 번호', fields: [{ key: 'code', label: '쿠폰 번호', ph: '예: WINTER2026' }, { key: 'until', label: '사용 기간', ph: '예: 12월 31일' }],
      write: function (f, g, n) {
        var lines = function (how) { return [v(f.code) ? '쿠폰 번호: ' + v(f.code) : '', v(f.until) ? '사용 기간: ' + v(f.until) + '까지' : '', how]; };
        return pick([
          { title: '쿠폰 선물 안내', sub: '쿠폰 번호를 보내 드립니다', text: para([HI,
            ['늘 냥법사와 함께해 주셔서 감사합니다.', '감사의 마음을 담아 쿠폰을 준비했습니다.'],
            lines('게임 설정 › 쿠폰 입력에 번호를 넣으시면 선물을 받으실 수 있습니다.'), giftLine(g), ['감사합니다.']]) },
          { title: '특별 쿠폰 안내', sub: '특별한 쿠폰을 보내 드립니다', text: para([HI,
            '냥법사님을 위한 특별한 쿠폰을 준비했습니다.',
            lines('게임 설정 › 쿠폰 입력에서 번호를 넣으시면 됩니다.'), giftLine(g), ['감사합니다.']]) },
          { title: '쿠폰 번호 안내', sub: '쿠폰 번호를 알려 드립니다', text: para([HI,
            '냥법사님께만 드리는 쿠폰 번호를 알려 드립니다.',
            lines('게임 설정 › 쿠폰 입력에 번호를 넣어 주시기 바랍니다.'), giftLine(g), ['기간 안에 꼭 사용해 주시기 바랍니다.', '감사합니다.']]) }], n);
      } },
    { id: 'gift', name: '🎁 일반 선물', icon: '🎁', label: '일반 선물', desc: '응원 선물', fields: [],
      write: function (f, g, n) {
        return pick([
          { title: '모험 응원 선물', sub: '모험을 응원하는 선물을 보내 드립니다', text: para([HI,
            ['늘 냥법사와 함께해 주셔서 감사합니다.', '즐거운 모험을 응원하는 마음을 담아 선물을 보내 드립니다.'],
            giftLine(g), ['앞으로도 즐거운 모험이 되시기를 바랍니다.', '감사합니다.']]) },
          { title: '작은 선물을 보내 드립니다', sub: '작은 선물을 보내 드립니다', text: para([HI,
            ['오늘도 냥법사를 찾아 주셔서 감사합니다.', '작은 선물을 보내 드립니다.'],
            giftLine(g), ['즐거운 모험 되시기 바랍니다.', '감사합니다.']]) },
          { title: '응원 선물 도착', sub: '응원 선물이 도착했습니다', text: para([HI,
            ['열심히 모험하시는 냥법사님을 응원합니다.', '힘이 되는 선물을 준비했습니다.'],
            giftLine(g), ['늘 건강하시고 즐거운 하루 보내시기 바랍니다.', '감사합니다.']]) }], n);
      } }
  ];
  function letterWrite(kind, fields, giftText, n) {
    var k = LETTER_KINDS.filter(function (x) { return x.id === kind; })[0] || LETTER_KINDS[LETTER_KINDS.length - 1];
    return k.write(fields || {}, giftText, n || 0);
  }

  function bullets(t) { return v(t).split(/\n+/).map(v).filter(Boolean).map(function (l) { return '- ' + l.replace(/^[-•·]\s*/, ''); }); }
  var NOTICE_KINDS = [
    { tag: '공지', name: '📢 일반 공지', icon: '📢', label: '일반 공지', desc: '무엇이든 알릴 때', fields: [{ key: 'what', label: '알릴 내용', ph: '예: 내일부터 우편함에서 받은 편지를 지울 수 있습니다.', multi: true }],
      write: function (f, n) {
        if (v(f.body) || v(f.title)) return { title: v(f.title), text: v(f.body) };   // 예전 칸(제목·본문)
        var w = v(f.what);
        return pick([
          { title: '안내드립니다', text: w },
          { title: '공지 안내', text: w ? para(['안녕하세요, 냥법사님.', w, '감사합니다.']) : '' },
          { title: '알려 드립니다', text: w ? para([w, '늘 냥법사를 아껴 주셔서 감사합니다.']) : '' }], n);
      } },
    { tag: '업데이트', name: '🆕 업데이트', icon: '🆕', label: '업데이트', desc: '새로 생긴 것·고친 것', fields: [{ key: 'added', label: '새로 생긴 것 (한 줄에 하나)', ph: '새 전직\n펫 도감', multi: true }, { key: 'fixed', label: '고쳐진 것 (한 줄에 하나)', ph: '우편함 글자 겹침', multi: true }],
      write: function (f, n) {
        var a = bullets(f.added), b = bullets(f.fixed), body = [a.length ? ['새로 생긴 것'].concat(a) : '', b.length ? ['고쳐진 것'].concat(b) : ''];
        return pick([
          { title: '업데이트 안내', text: para(body) },
          { title: '새 업데이트 소식', text: para(['새 업데이트 소식을 전해 드립니다.'].concat(body)) },
          { title: '업데이트 내용 안내', text: para(body.concat(['업데이트 뒤에는 게임을 한 번 다시 켜 주시기 바랍니다.'])) }], n);
      } },
    { tag: '이벤트', name: '🎉 이벤트', icon: '🎉', label: '이벤트', desc: '기간·내용·받는 곳', fields: [{ key: 'name', label: '이벤트 이름', ph: '예: 첫눈' }, { key: 'period', label: '기간', ph: '예: 12월 1일~12월 14일' }, { key: 'what', label: '내용', ph: '예: 접속하면 선물' }, { key: 'where', label: '받는 곳', ph: '우편함' }],
      write: function (f, n) {
        var nm = v(f.name), lines = [v(f.period) && '기간: ' + v(f.period), v(f.what) && '내용: ' + v(f.what), '받는 곳: ' + (v(f.where) || '우편함')];
        return pick([
          { title: nm ? nm + ' 이벤트' : '이벤트 안내', text: para([lines]) },
          { title: nm ? nm + ' 이벤트 안내' : '새 이벤트 안내', text: para(['즐거운 이벤트가 시작됩니다!', lines]) },
          { title: nm ? nm + ' 이벤트 시작!' : '이벤트 시작!', text: para([lines, '많은 참여 부탁드립니다.']) }], n);
      } },
    { tag: '점검', name: '🛠 점검 안내', icon: '🛠', label: '점검', desc: '점검 시간·내용·보상', fields: [{ key: 'time', label: '점검 시간', ph: '예: 11월 24일 02:00~04:00' }, { key: 'what', label: '점검 내용', ph: '예: 서버 정리' }, { key: 'reward', label: '보상', ph: '예: 다이아 300' }],
      write: function (f, n) {
        var lines = [v(f.time) && '점검 시간: ' + v(f.time), v(f.what) && '점검 내용: ' + v(f.what), v(f.reward) && '보상: ' + v(f.reward)];
        return pick([
          { title: '점검 안내', text: para([lines, ['점검 중에는 게임에 접속할 수 없습니다.', '이용에 불편을 드려 죄송합니다.']]) },
          { title: '점검 일정 안내', text: para(['더 안정적인 게임을 위해 점검을 진행합니다.', lines, '점검 중에는 접속할 수 없으니 양해 부탁드립니다.']) },
          { title: '서버 점검 안내', text: para(['점검 일정을 안내드립니다.', lines, ['점검이 끝나면 바로 다시 접속하실 수 있습니다.', '감사합니다.']]) }], n);
      } }
  ];
  // 순서: 점검 · 업데이트 · 이벤트 · 공지 (예전과 같게)
  NOTICE_KINDS = ['점검', '업데이트', '이벤트', '공지'].map(function (t) { return NOTICE_KINDS.filter(function (x) { return x.tag === t; })[0]; });
  function noticeWrite(tag, fields, n) {
    var k = NOTICE_KINDS.filter(function (x) { return x.tag === tag; })[0] || NOTICE_KINDS[3], r = k.write(fields || {}, n || 0);
    return { tag: k.tag, title: r.title, text: r.text };
  }
  // the text box keeps what the ops person typed: only a text the page wrote itself (or an empty box) is replaced
  function autoText(cur, lastAuto, next) { return !v(cur) || cur === lastAuto ? next : cur; }

  // ---- 계정 탭 (2026-11-23, 형: 접속한 사람 관리 편하게): 요약 · 찾기 · 걸러 보기 · 정렬
  function kday(t) { var n = Date.parse(t || ''); return isFinite(n) ? new Date(n + 9 * 3600e3).toISOString().slice(0, 10) : ''; }
  // 오늘 접속: 지금 접속 중이거나 마지막 로그인이 오늘(한국 날짜)
  function today(a, now) { return !!a.online || (!!a.last_login_at && kday(a.last_login_at) === kday(new Date(now || Date.now()).toISOString())); }
  function acctSummary(rows, now) {
    rows = rows || [];
    return { all: rows.length, online: rows.filter(function (a) { return !!a.online; }).length,
      today: rows.filter(function (a) { return today(a, now); }).length, suspended: rows.filter(function (a) { return !!a.suspended_at; }).length,
      ops: rows.filter(function (a) { return a.kind === 'ops'; }).length };
  }
  // o: { q: 찾을 글자 (아이디·메모·닉네임), f: all|online|today|suspended|ops, sort: recent|joined|level }
  function acctView(rows, o, now) {
    o = o || {}; var q = v(o.q).toLowerCase(), f = o.f || 'all';
    var t = function (x) { var n = Date.parse(x || ''); return isFinite(n) ? n : -Infinity; };
    var out = (rows || []).filter(function (a) {
      if (f === 'online' && !a.online) return false;
      if (f === 'today' && !today(a, now)) return false;
      if (f === 'suspended' && !a.suspended_at) return false;
      if (f === 'ops' && a.kind !== 'ops') return false;
      return !q || [a.login_id, a.memo, a.nick].some(function (x) { return String(x || '').toLowerCase().indexOf(q) >= 0; });
    });
    var by = o.sort === 'joined' ? function (a, b) { return t(b.created_at) - t(a.created_at); }
      : o.sort === 'level' ? function (a, b) { return ((+b.tier || 0) - (+a.tier || 0)) || ((+b.level || 0) - (+a.level || 0)); }
      : function (a, b) { return t(b.last_login_at) - t(a.last_login_at); };
    return out.slice().sort(function (a, b) { return by(a, b) || String(a.login_id).localeCompare(String(b.login_id)); });
  }

  return { acctSummary: acctSummary, acctView: acctView, LETTER_VARIANTS: LETTER_VARIANTS, LETTER_KINDS: LETTER_KINDS, letterWrite: letterWrite, NOTICE_KINDS: NOTICE_KINDS, noticeWrite: noticeWrite, autoText: autoText };
});
