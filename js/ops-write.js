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

  var LETTER_KINDS = [
    { id: 'maint', name: '🛠 점검 보상', fields: [{ key: 'time', label: '점검 시간', ph: '예: 11월 24일 새벽 2시~4시' }],
      write: function (f, g) {
        return { title: '점검 보상 안내', sub: '점검 보상을 보내 드립니다', text: para([HI,
          [(v(f.time) ? v(f.time) + ' ' : '안정적인 서비스를 위한 ') + '점검 동안 기다려 주셔서 진심으로 감사드립니다.', '불편을 드린 점 양해 부탁드리며, 점검 보상을 보내 드립니다.'],
          giftLine(g), ['앞으로도 더 쾌적한 모험을 즐기실 수 있도록 최선을 다하겠습니다.', '감사합니다.']]) };
      } },
    { id: 'sorry', name: '🙇 사과 보상', fields: [{ key: 'why', label: '무엇 때문에', ph: '예: 접속 오류' }],
      write: function (f, g) {
        return { title: '사과의 말씀', sub: '사과의 뜻을 담은 보상을 보내 드립니다', text: para([HI,
          [(v(f.why) ? v(f.why) + ' 때문에' : '이용 중') + ' 불편을 드려 진심으로 사과드립니다.', '작은 정성이지만 사과의 뜻을 담아 보상을 보내 드립니다.'],
          giftLine(g), ['같은 문제가 생기지 않도록 꼼꼼히 살피고 개선하겠습니다.', '너그러운 이해에 감사합니다.']]) };
      } },
    { id: 'event', name: '🎉 이벤트 선물', fields: [{ key: 'name', label: '이벤트 이름', ph: '예: 첫눈' }],
      write: function (f, g) {
        var n = v(f.name);
        return { title: (n ? n + ' ' : '') + '이벤트 보상 안내', sub: '이벤트 선물을 보내 드립니다', text: para([HI,
          [(n ? n + ' ' : '') + '이벤트에 참여해 주셔서 감사합니다.', '약속드린 이벤트 선물을 보내 드립니다.'],
          giftLine(g), ['앞으로도 즐거운 이벤트로 찾아뵙겠습니다.', '감사합니다.']]) };
      } },
    { id: 'welcome', name: '🐾 신규 환영', fields: [],
      write: function (f, g) {
        return { title: '환영 선물', sub: '환영 선물을 보내 드립니다', text: para([HI,
          ['냥법사의 세계에 오신 것을 환영합니다.', '첫 모험을 응원하는 마음을 담아 선물을 보내 드립니다.'],
          giftLine(g), ['천천히, 즐겁게 모험을 즐겨 주시기 바랍니다.', '감사합니다.']]) };
      } },
    { id: 'coupon', name: '🎟️ 쿠폰 안내', fields: [{ key: 'code', label: '쿠폰 번호', ph: '예: WINTER2026' }, { key: 'until', label: '사용 기간', ph: '예: 12월 31일' }],
      write: function (f, g) {
        return { title: '쿠폰 선물 안내', sub: '쿠폰 번호를 보내 드립니다', text: para([HI,
          ['늘 냥법사와 함께해 주셔서 감사합니다.', '감사의 마음을 담아 쿠폰을 준비했습니다.'],
          [v(f.code) ? '쿠폰 번호: ' + v(f.code) : '', v(f.until) ? '사용 기간: ' + v(f.until) + '까지' : '', '게임 설정 › 쿠폰 입력에 번호를 넣으시면 선물을 받으실 수 있습니다.'],
          giftLine(g), ['감사합니다.']]) };
      } },
    { id: 'gift', name: '🎁 일반 선물', fields: [],
      write: function (f, g) {
        return { title: '모험 응원 선물', sub: '모험을 응원하는 선물을 보내 드립니다', text: para([HI,
          ['늘 냥법사와 함께해 주셔서 감사합니다.', '즐거운 모험을 응원하는 마음을 담아 선물을 보내 드립니다.'],
          giftLine(g), ['앞으로도 즐거운 모험이 되시기를 바랍니다.', '감사합니다.']]) };
      } }
  ];
  function letterWrite(kind, fields, giftText) {
    var k = LETTER_KINDS.filter(function (x) { return x.id === kind; })[0] || LETTER_KINDS[LETTER_KINDS.length - 1];
    return k.write(fields || {}, giftText);
  }

  function bullets(t) { return v(t).split(/\n+/).map(v).filter(Boolean).map(function (l) { return '- ' + l.replace(/^[-•·]\s*/, ''); }); }
  var NOTICE_KINDS = [
    { tag: '점검', name: '🛠 점검 안내', fields: [{ key: 'time', label: '점검 시간', ph: '예: 11월 24일 02:00~04:00' }, { key: 'what', label: '점검 내용', ph: '예: 서버 정리' }, { key: 'reward', label: '보상', ph: '예: 다이아 300' }],
      write: function (f) {
        return { title: '점검 안내', text: para([[v(f.time) && '점검 시간: ' + v(f.time), v(f.what) && '점검 내용: ' + v(f.what), v(f.reward) && '보상: ' + v(f.reward)],
          ['점검 중에는 게임에 접속할 수 없습니다.', '이용에 불편을 드려 죄송합니다.']]) };
      } },
    { tag: '업데이트', name: '🆕 업데이트', fields: [{ key: 'added', label: '새로 생긴 것 (한 줄에 하나)', ph: '새 전직\n펫 도감', multi: true }, { key: 'fixed', label: '고쳐진 것 (한 줄에 하나)', ph: '우편함 글자 겹침', multi: true }],
      write: function (f) {
        var a = bullets(f.added), b = bullets(f.fixed);
        return { title: '업데이트 안내', text: para([a.length ? ['새로 생긴 것'].concat(a) : '', b.length ? ['고쳐진 것'].concat(b) : '']) };
      } },
    { tag: '이벤트', name: '🎉 이벤트', fields: [{ key: 'name', label: '이벤트 이름', ph: '예: 첫눈' }, { key: 'period', label: '기간', ph: '예: 12월 1일~12월 14일' }, { key: 'what', label: '내용', ph: '예: 접속하면 선물' }, { key: 'where', label: '받는 곳', ph: '우편함' }],
      write: function (f) {
        return { title: v(f.name) ? v(f.name) + ' 이벤트' : '이벤트 안내',
          text: para([[v(f.period) && '기간: ' + v(f.period), v(f.what) && '내용: ' + v(f.what), '받는 곳: ' + (v(f.where) || '우편함')]]) };
      } },
    { tag: '공지', name: '📢 일반 공지', fields: [{ key: 'title', label: '제목', ph: '예: 안내드립니다' }, { key: 'body', label: '본문', ph: '', multi: true }],
      write: function (f) { return { title: v(f.title), text: v(f.body) }; } }
  ];
  function noticeWrite(tag, fields) {
    var k = NOTICE_KINDS.filter(function (x) { return x.tag === tag; })[0] || NOTICE_KINDS[NOTICE_KINDS.length - 1], r = k.write(fields || {});
    return { tag: k.tag, title: r.title, text: r.text };
  }
  // the text box keeps what the ops person typed: only a text the page wrote itself (or an empty box) is replaced
  function autoText(cur, lastAuto, next) { return !v(cur) || cur === lastAuto ? next : cur; }

  // ---- 계정 탭 (2026-11-23, 형: 접속한 사람 관리 편하게): 요약 · 찾기 · 걸러 보기 · 정렬
  function kday(t) { var n = Date.parse(t || ''); return isFinite(n) ? new Date(n + 9 * 3600e3).toISOString().slice(0, 10) : ''; }
  function today(a, now) { return !!a.last_login_at && kday(a.last_login_at) === kday(new Date(now || Date.now()).toISOString()); }
  function acctSummary(rows, now) {
    rows = rows || [];
    return { all: rows.length, online: rows.filter(function (a) { return !!a.online; }).length,
      today: rows.filter(function (a) { return today(a, now); }).length, suspended: rows.filter(function (a) { return !!a.suspended_at; }).length };
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

  return { acctSummary: acctSummary, acctView: acctView, LETTER_KINDS: LETTER_KINDS, letterWrite: letterWrite, NOTICE_KINDS: NOTICE_KINDS, noticeWrite: noticeWrite, autoText: autoText };
});
