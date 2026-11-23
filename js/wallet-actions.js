(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function (root) {
  // 서버 지갑 1단계 (2026-11-18): every action the server runs for the phone, in one table both sides use. The server runs
  // it with its own random numbers (server/wallet-core.cjs runAction) and sends them back; the phone (js/wallet.js) runs
  // the very same line with those numbers, so the save on both sides changes the same way.
  //   performAction(state, action, args, env) → { ok: true, result } | { ok: false, code }
  //   env: { rng, now (server ms), gemRoom (diamonds the daily cap still allows), letter, coupon }
  // Days are always Korean days, worked out from env.now here, so the server (UTC) and the phone agree.
  var isNode = typeof module !== 'undefined' && module.exports;
  function mod(f) { return isNode ? require('./' + f + '.js') : root.CW; }

  var ACTIONS = ['pull', 'summonRelics', 'runeSummon', 'sigilSummon', 'rollPotential', 'buyCostume', 'upCostume',
    'buyShop', 'buyPack', 'openChest', 'takeOut', 'claimDaily', 'mailTake', 'coupon', 'dungeonClaim', 'eventAttend', 'passClaim', 'passBuy'];
  var OWNER_ONLY = ['buyShop', 'buyPack', 'passBuy'];   // practice purchases (real payments later)

  // the day key the game uses ('2026-11-18' without zero padding: G.dayKey, js/dungeon.js), as a Korean day
  function kDay(now) { var d = new Date(now + 9 * 3600e3); return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate(); }
  // a time whose local date is the Korean date, for rule code that reads local dates (js/dungeon.js dayKey)
  function kLocal(now) { return now + (9 * 60 + new Date(now).getTimezoneOffset()) * 60000; }
  function no(code) { return { ok: false, code: code }; }
  function yes(result) { return { ok: true, result: result === undefined ? true : result }; }

  function performAction(state, action, args, env) {
    args = args || {}; env = env || {};
    var rng = env.rng, now = env.now, n = +args.n || 0;
    // a count must be one of the game's own choices (a cost table key): a negative or odd count would make a negative price
    // (최종 검토 2026-11-18: summonRelics with n = -100000 gave diamonds)
    var D0 = mod('data').DATA, COUNTS = { pull: D0.gacha.cost, summonRelics: D0.relicSummon.cost, runeSummon: D0.runeConf.summon, sigilSummon: D0.sigilConf.summon };
    if (COUNTS[action] && !(typeof args.n === 'number' && Number.isInteger(args.n) && Object.prototype.hasOwnProperty.call(COUNTS[action], String(args.n)))) return no('nope');
    switch (action) {
      case 'pull': {
        var GA = mod('gacha'), cost = GA.gachaCost(n);
        if (!cost) return no('nope'); if (!(state.gems >= cost)) return no('gems');
        return yes(GA.pull(state, n, rng));
      }
      case 'summonRelics': { var rr = mod('relics').summonRelics(state, n, rng); return rr ? yes(rr) : no('gems'); }
      case 'runeSummon': { var ru = mod('runes').runeSummon(state, n, rng, args.group, false); return ru ? yes(ru) : no('gems'); }
      case 'sigilSummon': { var sg = mod('sigil').sigilSummon(state, n, rng, !!args.awaken, false); return sg ? yes(sg) : no('gems'); }
      case 'rollPotential': return mod('gear').rollPotential(state, args.k, rng) ? yes(true) : no('gems');
      case 'buyCostume': return mod('costume').buyCostume(state, args.id) ? yes(true) : no('gems');
      case 'upCostume': return mod('costume').upCostume(state, args.id) ? yes(true) : no('gems');
      case 'buyShop': { var g = mod('state').buy(state, +args.i); return g ? yes(g) : no('nope'); }
      case 'buyPack': { var box = mod('chest').chestBuyPack(state, args.id, now); return box ? yes(box) : no('full'); }
      case 'openChest': { var o = mod('chest').chestOpen(state, String(args.id), +args.goldScale || 1, rng, now); return o.ok ? yes(o) : no('nope'); }
      case 'takeOut': { var t = mod('chest').chestTakeOut(state, String(args.id), rng); return t.ok ? yes(t) : no('full'); }
      case 'claimDaily': { var d = mod('packs').claimDaily(state, kDay(now)); return d ? yes(d) : no('used'); }
      case 'mailTake': {
        var M = mod('mail'), l = env.letter; if (!l) return no('nope');
        var m = state.mail || {}; if (m.got && m.got[l.id]) return no('used');
        if (!M.mailHasReward(l)) { M.mailMarkGot(state, l, now); return yes({ box: null }); }
        var b = mod('chest').chestTakeMail(state, l, now); return b ? yes({ box: b }) : no('full');
      }
      case 'coupon': {
        var c = env.coupon; if (!c || !c.reward) return no('nope');
        var rw = c.reward, cb = mod('chest').chestTakeMail(state, { id: 'cp-' + c.code, title: c.title || '쿠폰 선물', goldJo: rw.goldJo, gems: rw.gems, give: rw.give }, now);
        if (!cb) return no('full');
        delete state.mail.got['cp-' + c.code];   // a coupon is not a letter; it is remembered in state.coupons
        state.coupons = state.coupons || {}; state.coupons[c.code] = now;
        return yes({ box: cb });
      }
      case 'dungeonClaim': {
        var D = mod('dungeon'), C = mod('data').DATA.dungeonConf;
        if (!D.useTicket(state, args.kind, kLocal(now))) return no('ticket');
        var gems = 0;
        if (args.kind === 'gem') {
          gems = Math.max(0, Math.min(C.gemCap, Math.floor((+args.kills || 0) * C.gemPerKill), env.gemRoom === undefined ? Infinity : env.gemRoom));
          state.gems = (state.gems || 0) + gems;
          if (state.gemSeen) state.gemSeen.dayGems = (state.gemSeen.dayGems || 0) + gems;
        }
        return yes({ gems: gems });
      }
      // 오픈 기념 이벤트 (js/open-event.js): a rune or sigil whose bag is full goes into the 가방 (js/chest.js)
      case 'eventAttend': case 'passClaim': {
        var OE = mod('open-event'), CHS = mod('chest'), sp = function (kind, it) { CHS.chestSpill(state, kind, it, now); };
        var er = action === 'eventAttend' ? OE.evAttend(state, now, rng, sp) : OE.evClaim(state, now, { line: args.line, step: args.step, upto: args.upto }, rng, sp, false);
        return er.ok ? yes(er) : no(er.code);
      }
      case 'passBuy': { var pb = mod('open-event').evBuyPass(state, now); return pb.ok ? yes(pb) : no(pb.code); }
    }
    return no('nope');
  }
  return { performAction: performAction, ACTIONS: ACTIONS, OWNER_ONLY: OWNER_ONLY, walletDay: kDay };
});
