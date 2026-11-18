(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CW.library = api;
})(this, function () {
  var name = '뒤틀린 마법 도서관', floors = 10, seconds = 24;
  var spells = {
    ember: ['잿불 각주', '맞힌 적에게 불씨가 쌓여 조금씩 피해를 줘요.', 'fireball', '깊게 타는 글자', '불씨 피해가 커져요.', '번지는 불씨', '적이 쓰러지면 옆 적에게 불씨가 옮겨가요.'],
    frost: ['서리 책갈피', '서리 표식이 세 번 쌓이면 터져요.', 'iceLance', '두꺼운 책갈피', '서리 파열이 더 큰 피해를 줘요.', '흩어진 책장', '서리가 터지면 옆 적에게도 표식을 남겨요.'],
    ink: ['방전 잉크', '전하가 세 번 모이면 번개가 떨어져요.', 'sparkRing', '검은 낙뢰', '첫 번개가 더 큰 피해를 줘요.', '흐르는 잉크', '번개가 옆 적에게도 튀어요.'],
    echo: ['메아리 문장', '마법을 세 번 맞히면 마지막 마법의 타격이 약하게 한 번 더 나가요.', 'starShot', '선명한 메아리', '메아리의 복사 피해가 커져요.', '겹문장', '메아리가 적 둘을 나눠 때려요. 하나만 남으면 두 번 맞아요.'],
    press: ['압축 구절', '준 피해 일부를 모아 한 발로 쏴요.', 'furBomb', '무거운 마침표', '모은 피해를 쏘는 한 발이 더 강해져요.', '짧은 구절', '피해를 덜 모으고 더 자주 쏴요.'],
    quill: ['떠도는 깃펜', '깃펜 한 자루가 곁에 떠서 스스로 적을 찔러요.', 'magicClaw', '속필', '깃펜이 적을 더 자주 공격해요.', '대필', '깃펜도 적에게 약한 표식을 남겨요.']
  };
  var fusions = {
    heat: ['ember', 'frost', '열충격 금서', '서리가 터지면 같은 적의 불씨도 함께 터져요.'],
    circuit: ['frost', 'ink', '뇌빙 회로', '서리가 터진 적에게 번개가 떨어져요.'],
    chant: ['echo', 'press', '이중 영창', '모은 피해를 쏘면 메아리가 약한 한 발을 따라 쏴요.'],
    scribe: ['echo', 'quill', '유령 필사실', '메아리가 울리면 깃펜이 그 적을 한 번 더 찔러요.']
  };
  var labels = { gold: '골드', mana: '마력석', runeStone: '룬석' };
  var currency = Object.keys(labels);
  // Same local-date key as the regular dungeon ticket path.
  function dayKey(now) {
    var d = new Date(now);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function dayNumber(key) {
    if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(key || '')) return 0;
    var parts = key.split('-').map(Number);
    return parts[0] * 10000 + parts[1] * 100 + parts[2];
  }
  function canReward(day, last) { return dayNumber(day) > dayNumber(last); }
  function newRun(practice, rates) {
    return { floor: 1, cleared: 0, practice: practice, rates: rates, cards: ['ember', 'echo', 'quill'].map(function (id) {
      return learn(id, '첫 마법');
    }), powers: {}, base: {}, bonus: {}, room: 'normal' };
  }
  function learn(id, label, note) {
    var s = spells[id];
    return { id: id, kind: 'learn', label: label, name: s[0], text: s[1], art: s[2], note: note };
  }
  function augment(id, mode, powers) {
    var s = spells[id], strong = mode === 'strong', desc = strong ? s[4] : s[6];
    if (!strong && id === 'quill') {
      desc = powers.ember && powers.frost ? '깃펜이 공격할 때마다 약한 불씨와 서리를 번갈아 남겨요.'
        : powers.ember ? '깃펜도 적에게 약한 불씨를 남겨요.' : '깃펜도 적에게 약한 서리 표식을 남겨요.';
    }
    return { id: id, kind: mode, label: strong ? '더 강하게' : '다르게 쓰기', name: strong ? s[3] : s[5], text: desc, art: s[2] };
  }
  function roomCards() {
    return [
      { id: 'normal', kind: 'room', label: '연습', name: '일반 진형', text: '평소 수의 적과 싸워요.' },
      { id: 'crowd', kind: 'room', label: '연습', name: '흩어진 무리', text: '체력이 낮은 적이 더 많이 나와요.' },
      { id: 'guard', kind: 'room', label: '연습', name: '단단한 무리', text: '체력이 높은 적이 적게 나와요.' }
    ];
  }
  function addReward(total, extra) {
    currency.forEach(function (key) { if (extra[key]) total[key] = (total[key] || 0) + extra[key]; });
  }
  function whole(amount) { return Math.floor((amount || 0) + 1e-9); }
  function share(rates, keys, budget) {
    var amounts = {};
    keys.forEach(function (key) { amounts[key] = rates[key] * budget / keys.length; });
    return amounts;
  }
  function rewardCards(run, budget) {
    var keys = Object.keys(run.rates);
    var groups = keys.map(function (key) { return [key]; });
    if (keys.length === 2) groups.push(keys);
    return groups.map(function (group) {
      var credit = share(run.rates, group, budget), amounts = {};
      group.forEach(function (key) {
        var accrued = (run.base[key] || 0) + (run.bonus[key] || 0);
        amounts[key] = whole(accrued + credit[key]) - whole(accrued);
      });
      return { id: group.join('-'), kind: 'reward', label: '이번 층 보상', name: group.map(function (key) { return labels[key]; }).join(' + '),
        amounts: amounts, credit: credit };
    }).filter(function (card) { return Object.values(card.amounts).some(Boolean); });
  }
  function offers(run, budget, random) {
    var powers = run.powers, known = Object.keys(powers).filter(function (id) { return spells[id]; });
    var fresh = Object.keys(spells).filter(function (id) { return !powers[id]; });
    var links = [], ready = [];
    Object.keys(fusions).forEach(function (id) {
      var f = fusions[id];
      if (powers[id]) return;
      if (powers[f[0]] && powers[f[1]]) ready.push({ id: id, kind: 'fuse', label: '연결하기', name: f[2], text: f[3], art: spells[f[1]][2], note: '융합 완성' });
      else if (powers[f[0]] || powers[f[1]]) links.push(learn(powers[f[0]] ? f[1] : f[0], '연결하기', f[2] + ' 준비'));
    });
    var strong = known.filter(function (id) { return !powers[id].strong; }).map(function (id) { return augment(id, 'strong', powers); });
    var change = known.filter(function (id) {
      return !powers[id].change && (id !== 'quill' || powers.ember || powers.frost);
    }).map(function (id) { return augment(id, 'change', powers); });
    var pool = [], used = {};
    function pick(list) {
      var available = list.filter(function (c) { return !used[c.kind + ':' + c.id]; });
      if (!available.length || pool.length === 3) return;
      var c = available[Math.floor(random() * available.length)];
      used[c.kind + ':' + c.id] = true;
      pool.push(c);
    }
    pick(ready.length ? ready : links);
    var connection = pool.pop();
    var newSpells = fresh.map(function (id) { return learn(id, '새 마법'); });
    pick(strong.length ? strong : newSpells);
    pick(change);
    if (connection) pool.push(connection);
    var remaining = newSpells.concat(strong, change, ready, links);
    for (var i = 0; i < 3; i++) pick(remaining);
    var extras = run.practice ? [] : rewardCards(run, budget);
    extras.forEach(function () { pick(extras); });
    var rooms = roomCards();
    rooms.forEach(function () { pick(rooms); });
    return pool;
  }
  function clearFloor(run, elapsed, random) {
    var budget = Math.max(0, Math.min(seconds, elapsed)) / 30 * 0.25;
    run.cleared = run.floor;
    if (!run.practice) addReward(run.base, share(run.rates, Object.keys(run.rates), budget / 2));
    run.cards = run.floor < floors ? offers(run, budget / 2, random || Math.random) : null;
  }
  function choose(run, index) {
    var card = run.cards && run.cards[index];
    if (!card) return false;
    if (card.kind === 'learn' || card.kind === 'fuse') run.powers[card.id] = {};
    else if (card.kind === 'strong' || card.kind === 'change') run.powers[card.id][card.kind] = true;
    else if (card.kind === 'reward') addReward(run.bonus, card.credit);
    run.room = card.kind === 'room' ? card.id : 'normal';
    run.floor = run.cleared + 1;
    run.cards = null;
    return true;
  }
  function rewardRates(state, CW) {
    var best = state.dungeon && state.dungeon.best || {};
    var rates = { gold: CW.dungeonReward(state, 'gold', best.gold || { kills: 1 }).gold,
      mana: CW.dungeonReward(state, 'mana', best.mana || { dmg: CW.golemHp(state, 0) }).mana };
    if (CW.runeOpen(state)) rates.runeStone = CW.dungeonReward(state, 'rune', best.rune || { kills: 1 }).runeStone;
    return rates;
  }
  function rewardTotal(run) {
    var total = {};
    addReward(total, run.base);
    addReward(total, run.bonus);
    Object.keys(total).forEach(function (key) {
      total[key] = whole(total[key]);
      if (!total[key]) delete total[key];
    });
    return total;
  }

  function combat(powers, targets, strike, openingDamage) {
    var echo = 0, charge = 0, press = 0, stored = 0, quill = 0, burn = 0.8;
    var last = openingDamage, nextFrost = false, marked = new Set();
    var fire = 0xff9569, ice = 0x9fe7ff, bolt = 0xffda7f, violet = 0xd4baff;
    function other(mob) { return targets().find(function (m) { return m !== mob; }); }
    function light(mob, dmg, withChain) {
      var next = withChain && powers.ink.change && other(mob);
      strike(mob, dmg * (powers.ink.strong ? 0.85 : 0.58), bolt);
      if (next) strike(next, dmg * 0.36, bolt);
    }
    function addEmber(mob, dmg) {
      if (!mob.alive) return;
      mob.libraryEmber = Math.min(last * 0.85, (mob.libraryEmber || 0) + dmg * (powers.ember.strong ? 0.24 : 0.16));
      marked.add(mob);
    }
    function addFrost(mob, dmg) {
      if (!mob.alive) return;
      mob.libraryFrost = (mob.libraryFrost || 0) + 1;
      if (mob.libraryFrost < 3) return;
      mob.libraryFrost = 0;
      var next = powers.frost.change && other(mob);
      if (next) next.libraryFrost = Math.min(2, (next.libraryFrost || 0) + 1);
      var heat = powers.heat ? mob.libraryEmber || 0 : 0;
      if (heat) mob.libraryEmber = 0;
      strike(mob, dmg * (powers.frost.strong ? 0.95 : 0.65) + heat, ice);
      if (powers.circuit && mob.alive) light(mob, dmg, false);
    }
    function copy(mob, dmg) {
      if (!mob || !mob.alive) mob = targets()[0];
      if (!mob) return;
      var second = powers.echo.change && (other(mob) || mob);
      strike(mob, second ? dmg / 2 : dmg, violet);
      if (second) strike(second, dmg / 2, violet);
      if (powers.scribe) strike(mob.alive ? mob : targets()[0], dmg * 0.4, violet);
    }
    return {
      hit: function (mob, dmg, first) {
        if (!first) {
          if (powers.press) stored += dmg * 0.12;
          return;
        }
        last = dmg;
        if (powers.ember) addEmber(mob, dmg);
        if (powers.frost) addFrost(mob, dmg);
        if (powers.ink && ++charge === 3) {
          charge = 0;
          light(mob.alive ? mob : targets()[0], dmg, true);
        }
        if (powers.echo && ++echo === 3) {
          echo = 0;
          copy(mob, dmg * (powers.echo.strong ? 0.66 : 0.44));
        }
        if (powers.press) {
          stored += dmg * 0.12;
          if (++press >= (powers.press.change ? 2 : 4)) {
            var damage = stored * (powers.press.strong ? 1.5 : 1);
            stored = 0; press = 0;
            strike(mob.alive ? mob : targets()[0], damage, violet);
            if (powers.chant) copy(mob, damage * 0.4);
          }
        }
      },
      death: function (mob) {
        marked.delete(mob);
        if (!powers.ember || !powers.ember.change || !mob.libraryEmber) return;
        var next = other(mob);
        if (next) {
          next.libraryEmber = Math.min(last * 0.85, (next.libraryEmber || 0) + mob.libraryEmber);
          marked.add(next);
        }
      },
      tick: function (dt) {
        if (marked.size) {
          burn -= dt;
          if (burn <= 0) {
            burn = 0.8;
            Array.from(marked).slice(0, 6).forEach(function (m) {
              var dmg = m.libraryEmber || 0;
              m.libraryEmber = dmg * 0.5;
              if (m.libraryEmber < last * 0.025) { m.libraryEmber = 0; marked.delete(m); }
              strike(m, dmg, fire);
            });
          }
        }
        if (!powers.quill) return;
        quill -= dt;
        if (quill > 0) return;
        var mob = targets()[0];
        if (!mob) return;
        quill = powers.quill.strong ? 1.4 : 2.2;
        if (powers.quill.change) {
          if (powers.frost && (!powers.ember || nextFrost)) addFrost(mob, last * 0.45);
          else if (powers.ember) addEmber(mob, last * 0.45);
          nextFrost = !nextFrost;
        }
        strike(mob, last * 0.38, violet);
      }
    };
  }
  return { dayKey: dayKey, whole: whole, combat: combat, name: name, floors: floors, seconds: seconds, labels: labels, fusions: fusions, canReward: canReward,
    newRun: newRun, clearFloor: clearFloor, choose: choose, rewardRates: rewardRates, rewardTotal: rewardTotal };
});
