// 쿠폰 보상 마음대로 (2026-11-23, 형: 쿠폰 만들 때 보상을 여러 가지 넣고, 원하는 보상을 그때그때 만들어서 — 지난 코스튬도).
// ops.html's 쿠폰 tab: a gift picker (the same things a letter can carry, js/mail-gift.js) and the reward the server keeps
// on the coupon ({ goldJo, gems, give }; act gives it through the same path as a letter, js/wallet-actions.js 'coupon').
//   couponReward(goldJo, gems, give) → { goldJo?, gems?, give? } or '' when there is nothing
//   couponCode(word, rnd) → a code like COSAB12CD (word + 6 letters/digits)
//   CW.opsGiftPicker(root, prefix, onChange) (browser) → { give(), goldJo(), gems(), lines(), clear(), fill(give, goldJo, gems) }
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  var isNode = typeof module !== 'undefined' && module.exports;
  function GF() { return isNode ? require('./mail-gift.js') : root.CW; }
  function couponReward(goldJo, gems, give) {
    var r = {}, g = +goldJo || 0, d = Math.floor(+gems || 0), gv = GF().giftOf({ give: give || {} });
    if (g > 0) r.goldJo = g; if (d > 0) r.gems = d; if (Object.keys(gv).length) r.give = gv;
    return Object.keys(r).length ? r : '';
  }
  var ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function couponCode(word, rnd) {
    rnd = rnd || Math.random; var w = String(word || 'GIFT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10), t = '';
    for (var i = 0; i < 6; i++) t += ABC[Math.floor(rnd() * ABC.length)];
    return (w + t).slice(0, 16);
  }

  // ---- the picker (browser only)
  function opsGiftPicker(box, P, onChange) {
    var CW = root.CW, CAT = CW.giftCatalog(), items = [], ch = function () { if (onChange) onChange(); };
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function id(x) { return P + x; }
    function get(x) { return document.getElementById(id(x)); }
    box.textContent = '';
    // 골드 · 다이아
    var top = el('div', 'row stack-sm');
    var gd = el('div'), gl = el('label', '', '골드 (예: 1조 5000억 · 300)'), gi = el('input'); gi.id = id('gold'); gl.htmlFor = gi.id; gi.type = 'text'; gi.autocomplete = 'off'; gi.placeholder = '0';
    var dd = el('div'), dl = el('label', '', '다이아 (개)'), di = el('input'); di.id = id('gems'); dl.htmlFor = di.id; di.type = 'number'; di.inputMode = 'numeric'; di.min = '0'; di.step = '1'; di.placeholder = '0';
    gd.appendChild(gl); gd.appendChild(gi); dd.appendChild(dl); dd.appendChild(di); top.appendChild(gd); top.appendChild(dd); box.appendChild(top);
    var gr = el('p', 'hint', '경·조·억·만을 붙여 적거나 숫자만 적어도 돼요.'); box.appendChild(gr);
    gi.addEventListener('input', function () {
      var g = CW.parseGold(gi.value);
      gr.textContent = !gi.value.trim() ? '경·조·억·만을 붙여 적거나 숫자만 적어도 돼요.' : isFinite(g) ? '= 골드 ' + CW.countText(g) : '읽지 못했어요. 「1조 5000억」이나 「300」처럼 적어 주세요.';
      gr.style.color = !gi.value.trim() ? '' : isFinite(g) ? 'var(--ok)' : 'var(--bad)'; ch();
    });
    di.addEventListener('input', ch);
    // 아이템
    var ih = el('h3', '', '아이템'); ih.style.marginTop = '14px'; box.appendChild(ih);
    var ty = el('select'); ty.id = id('itType'); ty.setAttribute('aria-label', '아이템 종류');
    [['costumes', '코스튬'], ['gear', '장비'], ['runes', '룬'], ['sigils', '신성력'], ['relics', '유물'], ['looks', '멸망 외형'], ['pets', '펫']].forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; ty.appendChild(op); });
    var opts = el('div', 'row wrap'), nrow = el('div', 'row'), nb = el('div'), nl = el('label', 'small', '개수'), ni = el('input'), ab = el('div'), add = el('button', 'btn add', '아이템 넣기');
    ni.id = id('itN'); nl.htmlFor = ni.id; ni.type = 'number'; ni.inputMode = 'numeric'; ni.min = '1'; ni.step = '1'; ni.value = '1'; add.type = 'button';
    nb.appendChild(nl); nb.appendChild(ni); ab.appendChild(add); nrow.appendChild(nb); nrow.appendChild(ab);
    var hint = el('p', 'hint'), ul = el('ul', 'items');
    box.appendChild(ty); box.appendChild(opts); box.appendChild(nrow); box.appendChild(hint); box.appendChild(ul);
    function sel(key, label, options) {
      var d = el('div'), lb = el('label', 'small', label), s = el('select'); s.id = id(key); lb.htmlFor = s.id;
      options.forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; s.appendChild(op); }); d.appendChild(lb); d.appendChild(s); opts.appendChild(d); return s;
    }
    function form() {
      var t = ty.value; opts.textContent = '';
      if (t === 'gear') {
        sel('kind', '부위', CAT.gearKinds.map(function (k) { return [k.id, k.name]; }));
        sel('grade', '등급', CAT.gearGrades.map(function (g, i) { return [i, g]; }));
        sel('sub', '단계', [[0, 'I'], [1, 'II'], [2, 'III'], [3, 'IV']]);
      } else if (t === 'runes') {
        sel('kind', '룬', CAT.runes.map(function (r) { return [r.id, r.icon + ' ' + r.name]; }));
        sel('grade', '등급', CAT.hiGrades.map(function (g, i) { return [i, g]; }));
      } else if (t === 'sigils') {
        sel('grade', '등급', CAT.hiGrades.map(function (g, i) { return [i, g]; }));
        sel('stat', '능력', CAT.sigilStats.map(function (s) { return [s.id, s.name]; }));
      } else if (t === 'relics') sel('kind', '유물', CAT.relics.map(function (r) { return [r.id, r.icon + ' ' + r.name]; }));
      else if (t === 'looks') sel('kind', '멸망 외형', (CAT.looks || []).map(function (c) { return [c.id, c.name]; }));
      else if (t === 'pets') sel('kind', '펫', CAT.pets.map(function (p) { return [p.id, p.grade + ' · ' + p.group + ' · ' + p.name]; }));
      else sel('kind', '코스튬', CAT.costumes.map(function (c) { return [c.id, (c.past ? '[지난] ' : '') + c.name + (c.grade ? ' · ' + c.grade : '')]; }));
      nb.classList.toggle('hide', t === 'costumes' || t === 'looks');
      hint.textContent = ''; hint.style.color = '';
    }
    ty.onchange = form; form();
    add.onclick = function () {
      var t = ty.value, n = Math.floor(+ni.value || 0), v = function (k) { return get(k).value; };
      if (t !== 'costumes' && t !== 'looks' && !(n >= 1)) { hint.textContent = '개수는 1 이상으로 적어 주세요.'; hint.style.color = 'var(--bad)'; return; }
      items.push(t === 'gear' ? { t: t, kind: v('kind'), grade: +v('grade'), sub: +v('sub'), n: n }
        : t === 'runes' ? { t: t, kind: v('kind'), grade: +v('grade'), n: n }
        : t === 'sigils' ? { t: t, grade: +v('grade'), stat: v('stat'), best: true, n: n }
        : t === 'relics' || t === 'pets' ? { t: t, id: v('kind'), n: n } : { t: t, id: v('kind') });
      draw(); ch();
    };
    function draw() {
      ul.textContent = '';
      items.forEach(function (it, i) {
        var one = {}, o = Object.assign({}, it); delete o.t; one[it.t] = [o];
        var line = CW.giftLines({ give: one })[0]; if (!line) return;
        var li = el('li'), s = el('span', '', line.icon + ' ' + line.text), x = el('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', '빼기');
        x.onclick = function () { items.splice(i, 1); draw(); ch(); };
        li.appendChild(s); li.appendChild(x); ul.appendChild(li);
      });
    }
    // 재화 · 펫 · 물약 · 입장권 (접힘) — 묶음마다 제목과 단위, 칸은 그림·이름 한 줄 + 숫자 칸 (2026-11-23, 형: 보기 좋게, 폰도)
    var more = el('details', 'gifts gpick'), sm = el('summary', '', '다른 재화 · 펫 · 물약 · 던전 입장권'); more.appendChild(sm); box.appendChild(more);
    function group(title, unit) { var g = el('div', 'gpgrp'), h = el('h4', '', title), u = el('small', '', unit); h.appendChild(u); g.appendChild(h); var grid = el('div', 'gpgrid'); g.appendChild(grid); more.appendChild(g); return grid; }
    function num(grid, key, icon, label) {
      var d = el('label', 'gpcell'), i = el('i', '', icon), t = el('span', '', label), inp = el('input');
      inp.id = id(key); inp.type = 'number'; inp.inputMode = 'numeric'; inp.min = '0'; inp.step = '1'; inp.placeholder = '0'; inp.setAttribute('aria-label', label);
      inp.addEventListener('input', function () { d.classList.toggle('has', +inp.value > 0); ch(); }); d.appendChild(i); d.appendChild(t); d.appendChild(inp); grid.appendChild(d);
    }
    var g1 = group('재화', '개'), g2 = group('펫', '개'), g3 = group('물약', '분'), g4 = group('던전 입장권', '장');
    CAT.currencies.forEach(function (c) { num(g1, 'cur-' + c.key, c.icon, c.name); });
    CAT.petCur.forEach(function (c) { num(g2, 'cur-' + c.key, c.icon, c.name); });
    CAT.potions.forEach(function (p) { num(g3, 'pot-' + p.id, p.icon, p.name); });
    CAT.tickets.forEach(function (d) { num(g4, 'tk-' + d.id, d.icon, d.name); });
    function give() {
      var g = {}, p = {}, tk = {};
      CAT.currencies.concat(CAT.petCur).forEach(function (c) { var n = +get('cur-' + c.key).value || 0; if (n > 0) g[c.key] = n; });
      CAT.potions.forEach(function (pt) { var n = +get('pot-' + pt.id).value || 0; if (n > 0) p[pt.id] = n; });
      CAT.tickets.forEach(function (d) { var n = +get('tk-' + d.id).value || 0; if (n > 0) tk[d.id] = n; });
      if (Object.keys(p).length) g.potions = p; if (Object.keys(tk).length) g.tickets = tk;
      items.forEach(function (it) { var o = Object.assign({}, it); delete o.t; (g[it.t] = g[it.t] || []).push(o); });
      return g;
    }
    function goldJo() { var g = CW.parseGold(gi.value); return isFinite(g) && g > 0 ? g / 1e12 : 0; }
    function gems() { return Math.max(0, Math.floor(+di.value || 0)); }
    function lines() {
      var a = [], g = CW.parseGold(gi.value);
      if (isFinite(g) && g > 0) a.push('🪙 골드 ' + CW.countText(g)); if (gems()) a.push('💎 다이아 ' + CW.countText(gems()) + '개');
      CW.giftLines({ give: give() }).forEach(function (x) { a.push(x.icon + ' ' + x.text); });
      return a;
    }
    function clear() { gi.value = ''; di.value = ''; items = []; [].forEach.call(more.querySelectorAll('input'), function (x) { x.value = ''; x.parentNode.classList.remove('has'); }); more.open = false; draw(); gi.dispatchEvent(new Event('input')); }
    function fill(gv, gj, gm) {
      clear(); gv = gv || {};
      if (gj > 0) gi.value = CW.countText(Math.round(gj * 1e12)); if (gm > 0) di.value = gm;
      Object.keys(gv).forEach(function (k) {
        var val = gv[k];
        if (k === 'potions' || k === 'tickets') Object.keys(val).forEach(function (x) { var e = get((k === 'potions' ? 'pot-' : 'tk-') + x); if (e) { e.value = val[x]; e.parentNode.classList.add('has'); more.open = true; } });
        else if (Array.isArray(val)) val.forEach(function (o) { items.push(Object.assign({ t: k }, o)); });
        else { var e = get('cur-' + k); if (e) { e.value = val; e.parentNode.classList.add('has'); more.open = true; } }
      });
      draw(); gi.dispatchEvent(new Event('input'));
    }
    return { give: give, goldJo: goldJo, gems: gems, lines: lines, clear: clear, fill: fill };
  }
  return { couponReward: couponReward, couponCode: couponCode, opsGiftPicker: opsGiftPicker };
});
