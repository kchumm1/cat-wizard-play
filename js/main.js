// Game loop: spawning, the 4-skill rotation, damage, bosses, job changes, coins, saving and offline rewards.
(function (root) {
  var CW = root.CW, DATA = CW.DATA, T = root.THREE;
  var $ = function (id) { return document.getElementById(id); };

  var storage = null;
  try { storage = root.localStorage; storage.setItem('cw-probe', '1'); storage.removeItem('cw-probe'); } catch (e) { storage = null; }
  var state = CW.migrateBag(CW.load(storage) || CW.newState());
  var params = new URLSearchParams(location.search);
  var FAST = Math.max(1, Math.min(60, +params.get('fast') || 1));

  var sc = CW.createScene($('cv'), $('ov')), fx = CW.createFx(sc), snd = CW.sound;
  var art = {}, ready = false, rot = CW.rotation(state), castT = 0.6, nowSlot = -1, boss = null, spawnT = 0, st = CW.stats(state);
  var thumbs = null, region = -1, preview = null, pendingTier = [], saveT = 0, uiT = 0, panelT = 0, lastSlot = -2, restT = 0;

  function refreshStats() {
    st = CW.stats(state);
    // titles earned along the way (2026-11-14)
    var got = CW.titleCheck ? CW.titleCheck(state) : [];
    if (got.length && typeof ui !== 'undefined' && ui && ui.toast) got.forEach(function (id) { ui.toast('타이틀 「' + CW.titleById(id).name + '」 획득! 프로필을 눌러 달 수 있어요'); });
  }
  // equipment changes the wizard's picture (hat/robe colour, jewellery, staff glow)
  var lastLook = null;
  var gained = { gold: 0, xp: 0, gems: 0, dmg: 0, t: 0, more: [] };
  var heroArtId = 'hero', lastCos = null, artWait = {}, artFail = {};
  // costume pictures are fetched the first time they are needed, then the look and the cards refresh
  // monster pictures likewise, when their region is reached
  function needArt(id) {
    var cos = CW.COSTUME_ART.indexOf(id) >= 0, mon = (CW.MON_ART || []).indexOf(id) >= 0;
    if (!id || art[id] || artWait[id] || (!cos && !mon)) return;
    artWait[id] = true;
    CW.loadArt([id]).then(function (m) {
      if (!m[id]) { artFail[id] = true; return; }
      art[id] = m[id]; if (thumbs) delete thumbs[id];
      if (cos) applyLook(true);
      if (ui && (cos || ui.currentTab() === 'stage')) ui.renderPanel(true);
    });
  }
  // the picture for a monster, or null while it is still loading (a failed load falls back to a stand-in)
  function mobArt(id, fallback) {
    if (art[id]) return art[id];
    if (artFail[id] || (CW.MON_ART || []).indexOf(id) < 0) return art[fallback] || null;
    needArt(id); return null;
  }
  function regionArt(r) { var R = DATA.regions[r]; return R ? R.monsters.concat(R.minis || [], [R.boss.art]) : []; }
  // wide pictures (crabs, turtles, snakes) are drawn a little shorter so every monster takes about the same room
  function fitHeight(a, h) { return a.aspect > 1.05 ? h / Math.pow(a.aspect, 0.45) : h; }
  function applyLook(silent) {
    var l = CW.lookOf(state), cl = CW.costumeLook(state), key = CW.lookKey(l) + '|' + cl.id + '|' + (art[cl.art] ? cl.art : 'hero');
    if (key === lastLook || !art.hero) return;
    var first = lastLook === null; lastLook = key;
    var base = art[cl.art];
    if (!base) { needArt(cl.art); base = art.hero; }
    if (base.id !== heroArtId) { heroArtId = base.id; sc.setHero(base); }
    l.outfit = base.id === 'hero' ? cl.outfit : null; l.fx = cl.fx;
    function mk(cv) { var t = new T.CanvasTexture(cv); t.minFilter = T.LinearMipmapLinearFilter; if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; t._look = true; return t; }
    var painted = CW.paintHero(base, l), tex = mk(painted);
    sc.setHeroTexture(tex); fx.setStaffColor(CW.staffColor(l));
    // The staff is cut out of the picture so the wizard can swing it (staff-split.js); a costume picture is cut once, the
    // plain wizard once per look (its hat, cape and gems are painted on). Cutting takes a moment (most on a phone), so the
    // whole picture shows first and the cut one takes over a little later, unless the look has changed again by then.
    if (CW.splitStaff && base.rig && base.rig.armL && base.rig.armL.cap && base.crop) setTimeout(function () {
      if (lastLook !== key) return;
      try { var parts = CW.splitStaff(painted, base.crop, base.rig, base.id === 'hero' ? 'hero|' + CW.lookKey(l) : base.id); sc.setHeroTexture(tex, { body: mk(parts.body), staff: mk(parts.staff) }); }
      catch (e) { /* the whole picture stays */ }
    }, 60);
    if (cl.id !== lastCos) { lastCos = cl.id; sc.setCostumeFx(cl.fx); fx.setCostume(cl.fx); }
    if (!first && !silent) { fx.levelUp(state.tier, CW.staffColor(l), true); ui.toast('모습이 바뀌었어요'); }
  }
  function hexCss(h) { return '#' + ('000000' + h.toString(16)).slice(-6); }
  function isBright(R) { var c = new T.Color(R.sky); return c.r * 0.3 + c.g * 0.59 + c.b * 0.11 > 0.55; }
  function save() { CW.save(state, storage); }

  // ---------- stage & region ----------
  function syncRegion() {
    var r = CW.stageInfo(state.stage).region;
    if (r === region) return;
    region = r; var R = DATA.regions[r];
    regionArt(r).concat(regionArt(r + 1)).forEach(needArt);
    sc.setRegion(r, R); fx.setRegion(R); fx.setBright(isBright(R));
    if (ready) ui.banner(R.name);
  }
  function aliveMobs() { return sc.mobs().filter(function (m) { return m.alive; }); }
  function clearField(silent) {
    fx.clear();
    if (silent) sc.clearMobs(); else aliveMobs().forEach(function (m) { sc.killMob(m, 0xffffff, false); });
    boss = null; wave.left = 0;
  }
  // Normal monsters come in crowds: each one has a third of a stage monster's health and gold,
  // and every three of them count as one kill toward the stage.
  var CROWD = CW.CROWD, smallKills = 0, wave = { left: 0, t: 0 }, trimT = 0;
  function dismissFarthest() {
    var H = sc.heroState(), far = null, fd = -1;
    aliveMobs().forEach(function (m) { if (m.boss) return; var d = (m.x - H.x) * (m.x - H.x) + (m.z - H.z) * (m.z - H.z); if (d > fd) { fd = d; far = m; } });
    if (far) sc.dismissMob(far);
  }
  function crowdMax() { return CW.crowdCap(sc.getQuality(), CW.diffOf(state).extraMobs); }
  // dungeons keep the field size they had before monsters were split finer (2026-11-15): they pay by the number of kills
  function dunCap() { var q = sc.getQuality(), extra = CW.diffOf(state).extraMobs; return q === 'low' ? 7 + Math.round(extra / 2) : q === 'mid' ? 10 + Math.round(extra * 0.75) : 14 + extra; }
  // each wave brings two to four kinds of the region's monsters, taking turns so every kind keeps showing up
  var waveKinds = [], kindTurn = 0;
  function pickKinds(R) {
    var n = Math.min(R.monsters.length, 2 + Math.floor(Math.random() * 3)); waveKinds = [];
    for (var k = 0; k < n; k++) waveKinds.push(R.monsters[(kindTurn + k * 3) % R.monsters.length]);
    kindTurn = (kindTurn + 1) % R.monsters.length;
  }
  function spawnNormal() {
    var info = CW.stageInfo(state.stage), R = DATA.regions[info.region];
    if (!waveKinds.length || R.monsters.indexOf(waveKinds[0]) < 0) pickKinds(R);
    var id = waveKinds[Math.floor(Math.random() * waveKinds.length)], a = mobArt(id, R.monsters[0]); if (!a) return;
    var r = Math.random(), entry = r < 0.6 ? 'run' : r < 0.85 ? 'leap' : 'drop';
    sc.spawnMob({ art: a, height: fitHeight(a, 0.9 + Math.random() * 0.14), hp: CW.stageMonsterHp(state) / CROWD, entry: entry });
  }
  function startBoss() {
    var info = CW.stageInfo(state.stage), R = DATA.regions[info.region];
    clearField(false);
    var sb = CW.stageBoss(state.stage, state.diff || 0), a = mobArt(sb.art, R.boss.art) || mobArt(R.boss.art);
    if (!a) { needArt(sb.art); restT = 0.3; state.bossTry = true; return; }
    var name = sb.name;
    // bosses are drawn clearly bigger than the crowd: a stage boss about twice a monster, the region boss more
    var mob = sc.spawnMob({ art: a, height: fitHeight(a, info.isRegionBoss ? 2.45 : 2.0), hp: CW.stageBossHp(state), boss: true, regionBoss: info.isRegionBoss, name: name });
    boss = { mob: mob, time: info.timeLimit, info: info, name: name };
    fx.bossEnter(mob, info.isRegionBoss);
    snd.play('boss');
  }
  function onStageMoved(kind) {
    smallKills = 0;
    syncRegion();
    if (kind === 'hold') { ui.toast('보스를 잡으려면 도전 버튼을 눌러 주세요'); return; }
    if (kind === 'boss') startBoss();
  }

  // ---------- combat ----------
  var CRIT_FLASH = { 4: 'rgba(160,250,255,0.25)', 5: 'rgba(255,90,170,0.28)', 6: 'rgba(255,255,255,0.32)', 7: 'rgba(130,255,110,0.32)' };
  function onHit(skill, mul) {
    return function (mob, frac, power) {
      if (!mob || !mob.alive) return;
      var ct = CW.rollCrit(st), crit = ct > 0;
      var dmg = CW.hitDamage(st, skill, { boss: mob.boss, critTier: ct, frozen: mob.frozen > 0, shocked: mob.shocked > 0 }) * (frac === undefined ? 1 : frac) * (mul || 1);
      if (dun && mob === dun.golem) dun.dmg += dmg; else mob.hp -= dmg;
      mob.lastCol = skill.color;
      if (skill.status === 'freeze') mob.frozen = Math.max(mob.frozen, mob.boss ? 0.7 : 1.5);
      if (skill.status === 'shock') mob.shocked = 2.2;
      sc.hitMob(mob, crit, (power || 1) * (1 + 0.25 * Math.max(0, ct - 1)));
      sc.damageText(sc.mobTop(mob), CW.fmt(dmg), ct, hexCss(skill.color));
      if (ct >= 3) { sc.shake(Math.min(0.42, 0.08 * ct)); if (ct >= 4) sc.flash(CRIT_FLASH[Math.min(ct, 7)], ct >= 5 ? 0.24 : 0.18); }
      gained.dmg = Math.max(gained.dmg, dmg);
      snd.play(crit ? 'crit' : 'hit');
      if (mob.hp <= 0) onDeath(mob, skill);
    };
  }
  function onDeath(mob, skill) {
    sc.killMob(mob, skill.color, mob.boss);
    var pos = sc.mobPos(mob);
    if (mob.boss && boss && boss.mob === mob) { bossWin(pos); return; }
    if (dun) { dun.kills++; if (dun.kind === 'gold') { fx.coinPop(pos, 4); flyCoins(pos, 2); } else fx.coinPop(pos, 2); snd.play('kill'); return; }
    var gold = CW.stageGold(state, undefined, st.goldMul) * st.goldMul / CROWD;
    state.gold += gold; fx.coinPop(pos, 3); flyCoins(pos, 2); snd.play('kill');
    var kx = CW.killXp(state) / CROWD * st.xpMul;
    gained.gold += gold; gained.xp += kx;
    onLevel(CW.gainXp(state, kx));
    if (state.bossTry) return;
    smallKills++;
    if (smallKills < CROWD) return;
    smallKills = 0;
    var r = CW.onKill(state);
    if (r) onStageMoved(r);
  }
  function bossWin(pos) {
    var stage = state.stage, key = CW.clearKey(state, stage), first = !state.firstClear[key];
    var gems = CW.bossGems(stage, first) * CW.diffOf(state).gemMul; state.firstClear[key] = true; state.gems += gems;
    var gold = CW.stageGold(state, stage, st.goldMul) * CW.BOSS_GOLD * st.goldMul; state.gold += gold;
    flyCoins(pos, 8);
    var bx = CW.bossXp(state) * st.xpMul, shards = CW.addShards(state, CW.stageInfo(stage).isRegionBoss);
    var mana = Math.round(CW.manaForBoss(stage, CW.stageInfo(stage).isRegionBoss) * CW.diffOf(state).gemMul); state.mana = (state.mana || 0) + mana;
    var isRB = CW.stageInfo(stage).isRegionBoss, rstone = CW.runeStoneForBoss(state, isRB); state.runeStone = (state.runeStone || 0) + rstone;
    var sigs = CW.sigilDrop(state, isRB), runeGot = CW.runeDrop(state, isRB);
    gained.gold += gold; gained.gems += gems; gained.xp += bx;
    onLevel(CW.gainXp(state, bx));
    var res = CW.onBossResult(state, true);
    boss = null;
    // no pop-up for a win: the wizard cheers, and what was won scrolls by quietly in the corner list
    sc.slowmo(0.7, 0.3); snd.play('win'); sc.heroCheer(1.5);
    if (mana) gained.more.push({ t: '마력석 +' + CW.fmt(mana), c: '#8fd8ff' });
    if (shards) gained.more.push({ t: '신기 조각 +' + shards, c: '#ffd24a' });
    if (rstone) gained.more.push({ t: '룬석 +' + rstone, c: '#d8b8ff' });
    if (sigs.length) gained.more.push({ t: '신성력 ' + sigs.map(function (x) { return DATA.grades[x.grade].name; }).join('·'), c: '#8ff59a' });
    if (runeGot.length) gained.more.push({ t: '룬 ' + runeGot.map(function (x) { return DATA.hiGrades[x.grade].name + ' ' + CW.runeById(x.kind).name; }).join('·'), c: '#c9a8ff' });
    if (runeGot.overflow) gained.more.push({ t: '룬 가방이 꽉 차 룬석 +' + CW.fmt(runeGot.overflow), c: '#c9a8ff' });
    gained.t = 1;
    if (res.tierUp) pendingTier.push({ tier: res.tierUp, at: 1.1 });
    if (res.final) setTimeout(function () {
      var nd = res.unlocked !== null && res.unlocked !== undefined ? DATA.difficulties[res.unlocked] : null;
      ui.modal('<h2 style="color:var(--gold)">늑대 왕 토벌!</h2><p>' + CW.diffOf(state).name + ' 난이도의 늑대 왕을 물리쳤어요.</p>' + (nd ? '<p>새 난이도 <b style="color:#fff">' + nd.name + '</b>이(가) 열렸어요. 몬스터와 보스가 훨씬 강하고 더 많이 몰려와요.</p>' : '<p>원하는 지역에서 계속 사냥할 수 있어요.</p>'),
        nd ? [{ label: '나중에' }, { label: nd.name + ' 도전', pri: true, fn: function () { G.setDifficulty(res.unlocked); } }] : [{ label: '좋아요', pri: true }]);
    }, 1400);
    castT = Math.max(castT, 0.9); restT = 1.1;
    save();
  }
  function onLevel(r) {
    if (!r || !r.levels) return;
    refreshStats(); fx.levelUp(state.tier, 0x7fe3ff, true); snd.play('tier');
    ui.banner('Lv.' + state.level + '!');
    if (r.gems) ui.toast('레벨 ' + state.level + ' 달성! 다이아 +' + r.gems);
  }
  function bossFail() {
    var mob = boss.mob; boss = null;
    CW.onBossResult(state, false);
    sc.killMob(mob, 0x777788, false);
    ui.banner('시간 초과!'); snd.play('lose');
    ui.toast('강화를 하고 "보스 다시 도전"을 눌러 보세요');
    restT = 0.8; save();
  }
  function doTierUp(t) {
    var id = DATA.tiers[t - 1].skill, sk = id && CW.skillById(id);
    if (id) CW.autoSlotNew(state, id);
    sc.setTierAura(t); fx.levelUp(t, [0xffd84a, 0xff6a2b, 0x9fd8ff, 0xbfefff, 0xffe14a, 0xe6e6ff, 0xffd84a, 0xb04bff, 0xffffff][t - 1]);
    snd.play('tier'); ui.showTierUp(t, sk); ui.slots(); save();
  }
  function pickTargets(skill) {
    // nearest first, leaning toward the ones the wizard already faces so it does not keep turning round
    var H = sc.heroState(), dist = function (m) { var dx = m.x - H.x, dz = m.z - H.z; return (dx * dx + dz * dz) * (dx * H.faceT < -0.3 ? 1.8 : 1); };
    var list = aliveMobs().filter(function (m) { return m.arrived; }).sort(function (a, b) { return dist(a) - dist(b); });
    return list.slice(0, CW.targetCount(skill, !!dun));
  }
  function castNext() {
    var peek = aliveMobs().filter(function (m) { return m.arrived; });
    if (!peek.length) { castT = 0.12; return; }
    var s = rot.next(); if (!s) { castT = 0.5; return; }
    nowSlot = rot.index();
    var tg = pickTargets(s); if (tg[0]) sc.heroFaceTo(tg[0].x);
    // mana surge: when the gauge is full this cast hits far harder and is drawn bigger
    var surge = CW.surgeTick(state, st), weak = CW.isWeak(s, CW.regionOf(state));
    if (surge) { sc.shake(0.3); sc.flash('rgba(190,140,255,0.32)', 0.22); }
    fx.cast(s, state.tier, tg, onHit(s, (surge ? st.surgeMul : 1) * (weak ? st.weakMul : 1)), st.speedMul, CW.skillLevel(state, s.id) + (surge ? 30 : 0));
    ui.surgeGauge(state.surge || 0, DATA.surgeConf.charge);
    snd.play('cast');
    castT = CW.castTime(s, st.speedMul);
  }

  // ---------- dungeons: 30-second runs ----------
  var dun = null;
  function dunDef(kind) { for (var i = 0; i < DATA.dungeons.length; i++) if (DATA.dungeons[i].id === kind) return DATA.dungeons[i]; return null; }
  function spawnDun() {
    var info = CW.stageInfo(Math.max(0, state.best)), R = DATA.regions[info.region];
    var a = mobArt(R.monsters[Math.floor(Math.random() * R.monsters.length)], R.monsters[0]); if (!a) return;
    var hp = CW.stageMonsterHp({ stage: Math.max(0, state.best), diff: state.diff || 0 }) / CW.DUN_CROWD * 0.6;
    sc.spawnMob({ art: a, tint: dun.kind === 'gold' ? 0xffd84a : dun.kind === 'rune' ? 0xc49bff : 0x8ff0ff, height: fitHeight(a, 0.88 + Math.random() * 0.14), hp: hp, entry: Math.random() < 0.7 ? 'run' : 'leap' });
  }
  function dungeonStart(kind) {
    var def = dunDef(kind); if (!def) return 'none';
    if (dun || boss || state.bossTry) return 'busy';
    if (!CW.useTicket(state, kind, Date.now())) return 'ticket';
    clearField(true); restT = 0;
    dun = { kind: kind, t: def.time, kills: 0, dmg: 0, golem: null, sp: 0.3, def: def };
    var R0 = DATA.regions[CW.stageInfo(Math.max(0, state.best)).region]; needArt('b47');
    if (kind === 'mana') {
      var g = mobArt('b47', R0.boss.art) || mobArt(R0.boss.art);
      if (g) dun.golem = sc.spawnMob({ art: g, height: fitHeight(g, 2.3), hp: 1e300, boss: true, name: '마력 골렘' });
    }
    ui.banner(def.name); snd.play('boss'); save();
    return 'ok';
  }
  function dunTick(dt) {
    dun.t -= dt;
    if (dun.kind !== 'mana') {
      var alive = aliveMobs().length;
      dun.sp -= dt; if (dun.sp <= 0 && alive < dunCap() + 4) { spawnDun(); dun.sp = 0.06 + Math.random() * 0.08; }
    }
    if (dun.t <= 0) dungeonEnd();
  }
  function dungeonEnd() {
    var d = dun, res = { kills: d.kills, dmg: d.dmg }, r = CW.dungeonReward(state, d.kind, res);
    CW.recordBest(state, d.kind, res); CW.applyReward(state, r);
    dun = null; clearField(true); restT = 0.6; ui.dunHud(null);
    snd.play('win'); ui.banner('던전 완료!'); save();
    var lines = d.kind === 'mana' ? '<p>골렘에게 준 피해 <b>' + CW.fmt(d.dmg) + '</b> (Lv.' + r.level + ')</p><p style="color:#8fd8ff;font:400 22px var(--display)">마력석 +' + CW.fmt(r.mana) + '</p>'
      : '<p>잡은 몬스터 <b>' + d.kills + '마리</b></p><p style="color:' + (d.kind === 'gold' ? 'var(--gold)' : d.kind === 'rune' ? '#d8b8ff' : 'var(--gem)') + ';font:400 22px var(--display)">' + (d.kind === 'gold' ? '골드 +' + CW.fmtGold(r.gold) : d.kind === 'rune' ? '룬석 +' + CW.fmt(r.runeStone) + (r.got && r.got.length ? ' · 룬 ' + r.got.length + '개' : '') + (r.overflow ? ' · 가방이 꽉 차 룬석 +' + CW.fmt(r.overflow) : '') : '다이아 +' + CW.fmt(r.gems)) + '</p>';
    ui.modal('<h2>' + d.def.name + '</h2>' + lines + '<p class="note">남은 입장권 ' + CW.ticketsLeft(state, d.kind, Date.now()) + '장 · 기록이 좋으면 소탕으로 같은 보상을 바로 받을 수 있어요.</p>', [{ label: '좋아요', pri: true }]);
  }

  // ---------- coins flying to the gold counter ----------
  var coins = [];
  // a coin that is not flying is out of the page (display none), so it does not keep a drawing layer of its own
  for (var i = 0; i < 18; i++) { var el = document.createElement('i'); el.className = 'coin fly'; el.style.opacity = 0; el.style.display = 'none'; document.body.appendChild(el); coins.push({ el: el, t: 1, d: 0.6, on: false }); }
  function coinShown(c, on) { if (c.on !== on) { c.on = on; c.el.style.display = on ? '' : 'none'; } }
  // where the stage and the gold counter are: read at most once a frame, at the first kill (reading it at every kill,
  // after damage numbers were added, made the browser lay the page out again for each monster a spell killed at once)
  var coinBox = null;
  function readCoinBox() { coinBox = { stage: $('stage').getBoundingClientRect(), dst: $('goldTxt').getBoundingClientRect() }; }
  function flyCoins(pos, n) {
    if (!coinBox) readCoinBox();
    var sp = sc.screenPos(pos), stage = coinBox.stage, dst = coinBox.dst;
    for (var k = 0; k < n; k++) {
      var c = null; for (var j = 0; j < coins.length; j++) if (coins[j].t >= 1) { c = coins[j]; break; }
      if (!c) return;
      c.t = -k * 0.05; c.d = 0.55 + Math.random() * 0.2;
      c.x0 = stage.left + sp.x + (Math.random() - 0.5) * 40; c.y0 = stage.top + sp.y + (Math.random() - 0.5) * 30;
      c.x1 = dst.left - 12; c.y1 = dst.top + dst.height / 2 - 9;
      c.cx = c.x0 + (Math.random() - 0.2) * 80; c.cy = Math.min(c.y0, c.y1) - 40 - Math.random() * 60;
    }
  }
  function updateCoins(dt) {
    var arrived = false;
    coins.forEach(function (c) {
      if (c.t >= 1) return;
      c.t += dt / c.d;
      if (c.t < 0) { c.el.style.opacity = 0; coinShown(c, false); return; }
      if (c.t >= 1) { c.t = 1; c.el.style.opacity = 0; coinShown(c, false); arrived = true; return; }
      var k = c.t, e = k * k, a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, cc = e * e;
      var x = a * c.x0 + b * c.cx + cc * c.x1, y = a * c.y0 + b * c.cy + cc * c.y1;
      coinShown(c, true); c.el.style.opacity = 1; c.el.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (1.2 - k * 0.4) + ')';
    });
    if (arrived) pulseGold();
  }
  // the gold counter's little bounce when coins land. Restarting a CSS animation needs the page laid out on the spot
  // (reading offsetWidth), several times a second while farming; the same bounce played by the browser's animation
  // call does not.
  var goldPulse = null;
  function pulseGold() {
    var chip = $('goldTxt').parentNode;
    if (!chip.animate) { chip.classList.remove('pulse'); void chip.offsetWidth; chip.classList.add('pulse'); return; }
    if (goldPulse) goldPulse.cancel();
    goldPulse = chip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }], { duration: 250 });
  }

  // ---------- actions used by the screens ----------
  var G = {
    get state() { return state; },
    boss: function () { return boss; },
    castingSlot: function () { return preview ? -1 : nowSlot; },
    canRetry: function () { var b = Math.max(state.best + 1, state.stage + 1); return b <= CW.LAST_STAGE && CW.stageInfo(b).isBoss; },
    upgradeN: function (k, n) { var c = CW.tryUpgradeN(state, k, n); if (c) { refreshStats(); snd.play('click'); save(); } return c; },
    upgrade: function (k) { var ok = CW.tryUpgrade(state, k); if (ok) { refreshStats(); snd.play('click'); } return ok; },
    equipSkill: function (slot, id) { var ok = CW.equipSkill(state, slot, id); save(); return ok; },
    placeSkill: function (id, slot) { var at = CW.placeSkill(state, id, slot); if (at >= 0) { snd.play('click'); save(); } return at; },
    unequipSkill: function (slot) { var ok = CW.unequipSkill(state, slot); if (ok) save(); return ok; },
    autoSkills: function () { CW.autoFillSkills(state); snd.play('click'); save(); },
    skillUp: function (id) { var ok = CW.trySkillUp(state, id); if (ok) { refreshStats(); snd.play('click'); var sk = CW.skillById(id); fx.levelUp(state.tier, sk.color, true); save(); } return ok; },
    summonRelics: function (n) { var r = CW.summonRelics(state, n); if (r) { refreshStats(); snd.play('pull'); save(); } return r; },
    buyCostume: function (id) { var ok = CW.buyCostume(state, id); if (ok) { refreshStats(); snd.play('win'); save(); } return ok; },
    upCostume: function (id) { var ok = CW.upCostume(state, id); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    wearCostume: function (id) { var ok = CW.wearCostume(state, id); if (ok) { applyLook(); save(); } return ok; },
    costumeThumb: function (id) {
      thumbs = thumbs || {}; var key = 'c:' + id; if (thumbs[key] !== undefined) return thumbs[key];
      var c = CW.costumeById(id); if (!c) return '';
      var a = art[c.art]; if (!a) { needArt(c.art); return ''; }
      var none = { hat: -1, staff: -1, robe: -1, belt: -1, necklace: -1, ear1: -1, ear2: -1, ring1: -1, ring2: -1, outfit: a.id === 'hero' ? c.outfit : null, fx: c.fx };
      var big = CW.costumePreview(CW.paintHero(a, none), c.fx), cv = document.createElement('canvas'), s = 150 / Math.max(big.width, big.height);
      cv.width = Math.round(big.width * s); cv.height = Math.round(big.height * s); cv.getContext('2d').drawImage(big, 0, 0, cv.width, cv.height);
      return (thumbs[key] = cv.toDataURL('image/png'));
    },
    divineUp: function (id) { var ok = CW.divineUp(state, id); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    starUp: function (id) { var ok = CW.starUp(state, id); if (ok) { refreshStats(); snd.play('win'); fx.levelUp(state.tier, 0xffd84a, true); save(); } return ok; },
    switchPreset: function (i) { var ok = CW.switchPreset(state, i); if (ok) { snd.play('click'); save(); } return ok; },
    skillUpAll: function () { var n = CW.skillUpAll(state); if (n) { refreshStats(); snd.play('click'); fx.levelUp(state.tier, 0x9fd8ff, true); save(); } return n; },
    killProgress: function () { return { n: state.kills * CROWD + smallKills, max: DATA.balance.killsPerStage * CROWD }; },
    equipBest: function () { CW.equipBest(state); refreshStats(); save(); },
    mergeAll: function () { var n = CW.mergeAll(state); if (n) { refreshStats(); snd.play('win'); save(); } return n; },
    equipKey: function (k) { var ok = CW.equip(state, k); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    levelUp: function (k) { var ok = CW.levelUp(state, k); if (ok) { refreshStats(); snd.play('click'); } return ok; },
    merge: function (k) { var ok = CW.merge(state, k); if (ok) { refreshStats(); snd.play('win'); save(); } return ok; },
    transcend: function (k) { var ok = CW.transcend(state, k); if (ok) { refreshStats(); snd.play('tier'); fx.levelUp(state.tier, 0xffd84a, true); save(); } return ok; },
    brew: function (id) { var ok = CW.brew(state, id, Date.now()); if (ok) { refreshStats(); buffKey = CW.buffKey(state); snd.play('win'); save(); } return ok; },
    runeGradeUp: function (id) { var ok = CW.runeGradeUp(state, id); if (ok) { refreshStats(); snd.play('tier'); fx.levelUp(state.tier, 0xb58cff, true); save(); } return ok; },
    buyPack: function (id) { var got = CW.buyPack(state, id); if (got !== false) { refreshStats(); snd.play('win'); save(); } return got; },
    // the phone's own date (the daily gems reset at its midnight)
    dayKey: function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
    claimDaily: function () { var n = CW.claimDaily(state, G.dayKey()); if (n) { snd.play('win'); save(); } return n; },
    runeUp: function (id) { var ok = CW.runeUp(state, id); if (ok) { refreshStats(); snd.play('click'); } return ok; },
    runeSwap: function (oldId, newId) { var ok = CW.runeSwap(state, oldId, newId); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    runeEquipToggle: function (id) { var ok = CW.runeIsWorn(state, id) ? CW.runeUnequip(state, id) : CW.runeEquip(state, id); if (!ok) return 'full'; refreshStats(); snd.play('click'); save(); return 'ok'; },
    runeLock: function (id) { var ok = CW.runeLock(state, id); if (ok) save(); return ok; },
    runeDismantle: function (id) { var n = CW.runeDismantle(state, id); if (n) { refreshStats(); save(); } return n; },
    runeDismantleAll: function () { var n = CW.runeDismantleAll(state); if (n) { refreshStats(); snd.play('win'); save(); } return n; },
    runeFuse: function (id) { var it = CW.runeFuse(state, id); if (it) { refreshStats(); snd.play('win'); save(); } return it; },
    runeSummon: function (n) { var r = CW.runeSummon(state, n); if (r) { refreshStats(); snd.play('pull'); save(); } return r; },
    runeEquipBest: function () { CW.runeEquipBest(state); refreshStats(); save(); },
    sigilSet: function (i) { var ok = CW.sigilSet(state, i); if (ok) { refreshStats(); save(); } return ok; },
    sigilEquipToggle: function (id) {
      var ok = CW.equipped(state).indexOf(id) >= 0 ? CW.sigilUnequip(state, id) : CW.sigilEquip(state, id);
      if (!ok) return 'full'; refreshStats(); snd.play('click'); save(); return 'ok';
    },
    sigilSwap: function (oldId, newId) { var ok = CW.sigilSwap(state, oldId, newId); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    sigilLock: function (id) { var ok = CW.sigilLock(state, id); if (ok) save(); return ok; },
    sigilDismantle: function (id) { var n = CW.sigilDismantle(state, id); if (n) { refreshStats(); save(); } return n; },
    sigilDismantleAll: function () { var n = CW.sigilDismantleAll(state); if (n) { refreshStats(); snd.play('win'); save(); } return n; },
    sigilFuse: function (id) { var it = CW.sigilFuse(state, id); if (it) { refreshStats(); snd.play('win'); save(); } return it; },
    sigilSummon: function (n) { var r = CW.sigilSummon(state, n); if (r) { refreshStats(); snd.play('pull'); save(); } return r; },
    sigilEquipBest: function () { CW.sigilEquipBest(state); refreshStats(); save(); },
    sigilLvUp: function () { var ok = CW.sigilLvUp(state); if (ok) { refreshStats(); snd.play('click'); } return ok; },
    rollPotential: function (k) { var ok = CW.rollPotential(state, k); if (ok) { refreshStats(); snd.play('pull'); save(); } return ok; },
    titleWear: function (id) { var ok = CW.titleWear(state, id); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    potLock: function (k, i) { var ok = CW.potLock(state, k, i); if (ok) { snd.play('click'); save(); } return ok; },
    talentUp: function (id) { var ok = CW.talentUp(state, id); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    talentReset: function () { CW.talentReset(state); refreshStats(); save(); },
    markUp: function (id) { var ok = CW.markUp(state, id); if (ok) { refreshStats(); snd.play('click'); } return ok; },
    rankUp: function () { var ok = CW.rankUp(state); if (ok) { refreshStats(); snd.play('tier'); fx.levelUp(state.tier, 0xffd84a); save(); } return ok; },
    circleUp: function () { var t = CW.circleTier(state), ok = CW.circleUp(state); if (ok) { refreshStats(); snd.play('click'); if (CW.circleTier(state) > t) { fx.levelUp(state.tier, 0x6fb8ff); ui.banner((CW.circleTier(state) + 1) + '서클 달성!'); save(); } } return ok; },
    dungeon: function (kind) { var r = dungeonStart(kind); if (r === 'ok') ui.openTab('battle'); return r; },
    sweep: function (kind) { var r = CW.sweep(state, kind, Date.now()); if (r) { refreshStats(); snd.play('win'); save(); } return r; },
    dunState: function () { return dun ? { kind: dun.kind, t: dun.t, kills: dun.kills, dmg: dun.dmg, name: dun.def.name, level: dun.kind === 'mana' ? CW.golemLevel(state, dun.dmg) : 0 } : null; },
    pull: function (n) { var items = CW.pull(state, n); if (items) { refreshStats(); save(); } return items; },
    buy: function (i) { var g = CW.buy(state, i); save(); return g; },
    goStage: function (i) {
      if (dun) return false;
      if (!CW.goStage(state, i)) return false;
      clearField(true); syncRegion(); if (state.bossTry) startBoss(); save(); return true;
    },
    setDifficulty: function (d) {
      if (!CW.setDifficulty(state, d)) return false;
      clearField(true); region = -1; syncRegion(); refreshStats(); smallKills = 0; save(); ui.banner(CW.diffOf(state).name); return true;
    },
    retryBoss: function () { if (boss || dun) return; if (CW.retryBoss(state)) { syncRegion(); startBoss(); } },
    setSetting: function (k, v) { state.settings[k] = v; applySettings(); save(); },
    // slider being dragged: show the numbers at that value right away, save when the finger lifts
    previewDamage: function (size, alpha) { sc.setDamageStyle(size / 100, alpha / 100); },
    showDamageSample: function () { var h = sc.heroCenter(); for (var i = 0; i < 3; i++) sc.damageText(h.clone().add(new T.Vector3(0.9 + i * 0.5, 0.6 + i * 0.25, 0)), ['1,234', '5.6만', '78억'][i], i); },
    reset: function () { CW.clearSave(storage); state = CW.newState(); rot = CW.rotation(state); refreshStats(); clearField(true); region = -1; syncRegion(); sc.setTierAura(1); ui.renderPanel(true); ui.slots(); save(); cloudPush(true); ui.toast('처음부터 다시 시작해요'); },
    storageOk: function () { return !!storage; },
    exportSave: function () { save(); return CW.exportCode(state); },
    importSave: function (code) { var st2 = CW.importCode(code); if (!st2 || !adopt(JSON.stringify(st2))) return false; save(); cloudPush(true); return true; },
    setSheet: function (open) { sc.setViewShift(open ? 0.22 : 0); },
    sound: function (n) { snd.play(n); },
    thumb: function (id) {
      thumbs = thumbs || {};
      if (thumbs[id] !== undefined) return thumbs[id];
      var a = art[id]; if (!a) { needArt(id); return ''; }
      var c = document.createElement('canvas'), s = 72 / Math.max(a.canvas.width, a.canvas.height); c.width = Math.round(a.canvas.width * s); c.height = Math.round(a.canvas.height * s);
      c.getContext('2d').drawImage(a.canvas, 0, 0, c.width, c.height);
      return (thumbs[id] = c.toDataURL('image/png'));
    },
    goStageIn: function (d, i) {
      if (d !== (state.diff || 0) && !G.setDifficulty(d)) return false;
      return G.goStage(i);
    },
    previewSkill: function (id) {
      var sk = CW.skillById(id); if (!sk) return;
      preview = { skill: sk, t: 0 }; castT = Math.max(castT, 1.6);
      var tg = pickTargets(sk); if (!tg.length) { ui.toast('몬스터가 오면 보여 줄게요'); preview = null; return; }
      fx.cast(sk, Math.max(state.tier, sk.tier), tg, function (m, f, p) { if (m.alive) sc.hitMob(m, false, p || 1); }, 1);
      ui.toast(sk.name + ' 미리 보기');
    }
  };
  var ui = CW.createUI(G);

  function applySettings() {
    var s = state.settings;
    snd.setEnabled(s.sound); sc.setPixel(s.pixel);
    sc.setDamageStyle((s.dmgSize === undefined ? 60 : s.dmgSize) / 100, (s.dmgAlpha === undefined ? 85 : s.dmgAlpha) / 100);
    var q = s.quality === 'auto' ? autoQ : s.quality; sc.setQuality(q); fx.setQuality(q);
  }

  // ---------- quality watchdog ----------
  // Every 3 s: a low average frame rate lowers the quality, and so do repeated stalls (frames that came more than
  // 45 ms after the one before, i.e. two or more frames missed at 60 a second). The average alone stayed high on a
  // phone that stuttered several times a second, so its quality never came down. 5 stalls in 3 s is steady stutter,
  // not a one-off such as a picture loading; a phone held at 30 frames a second (low power) is not counted as stalls.
  var autoQ = 'high', fpsAcc = 0, fpsN = 0, fpsT = 0, stalls = 0;
  function watchFps(rdt) {
    if (state.settings.quality !== 'auto') return;
    fpsAcc += rdt; fpsN++; fpsT += rdt; if (rdt > 0.045) stalls++;
    if (fpsT < 3) return;
    var fps = fpsN / fpsAcc, stuck = stalls >= 5; fpsAcc = 0; fpsN = 0; fpsT = 0; stalls = 0;
    var next = autoQ;
    if (fps < 28) next = 'low'; else if ((fps < 42 || stuck) && autoQ === 'high') next = 'mid'; else if (stuck && autoQ === 'mid') next = 'low';
    if (next !== autoQ) { autoQ = next; applySettings(); }
  }

  // ---------- main loop ----------
  var lookT = 0;
  // potions run on the clock: refresh the numbers when one starts or ends
  var buffKey = '', buffT = 0;
  function tick(dt) {
    buffT -= dt; if (buffT <= 0) { buffT = 1; var bk = CW.buffKey(state); if (bk !== buffKey) { buffKey = bk; refreshStats(); } }
    for (var i = pendingTier.length - 1; i >= 0; i--) { pendingTier[i].at -= dt; if (pendingTier[i].at <= 0) { doTierUp(pendingTier[i].tier); pendingTier.splice(i, 1); } }
    if (dun) dunTick(dt);
    else if (restT > 0) { restT -= dt; if (restT <= 0) syncRegion(); }
    else if (boss) {
      if (boss.mob.arrived) boss.time -= dt;
      if (boss.time <= 0 && boss.mob.alive) bossFail();
    } else if (state.bossTry) {
      startBoss();
    } else {
      var alive = aliveMobs().length;
      if (wave.left <= 0 && alive <= Math.floor(crowdMax() * CW.REFILL_AT)) { wave.left = crowdMax() - alive; wave.t = 0.2; }
      wave.left = CW.waveRoom(wave.left, crowdMax(), alive);
      // and the ones already over the new size step away one at a time, farthest from the wizard first
      trimT -= dt; if (trimT <= 0) { trimT = 0.25; if (CW.excessMobs(alive, crowdMax()) > 0) dismissFarthest(); }   // the quality dropped mid-wave: fill only up to the new field size
      if (wave.left > 0) { wave.t -= dt; if (wave.t <= 0) { spawnNormal(); wave.left--; wave.t = (0.05 + Math.random() * 0.12) * 3 / CROWD; } }   // smaller monsters come that much faster: the same health per second walks in as when three made a stage (2026-11-15)
    }
    if (preview) { preview.t += dt; if (preview.t > 1.5) preview = null; }
    castT -= dt;
    if (castT <= 0 && !preview) castNext();
  }
  // an error is kept (at most one every 10 s) so settings can show it ("최근 오류"), the game goes on
  var errAt = 0;
  function noteError(e) {
    if (root.console) console.error(e);
    var n = Date.now(); if (n - errAt < 10000) return; errAt = n;
    var at = (String(e && e.stack || '').split('\n').filter(function (l) { return /\.js/.test(l); })[0] || '').trim();
    try { localStorage.setItem('cw-lasterr', JSON.stringify({ t: n, msg: String(e && e.message || e).slice(0, 160), at: at.slice(0, 160) })); } catch (x) {}
  }
  root.addEventListener('error', function (ev) { noteError(ev.error || ev.message); });
  // hitches: a frame that came more than 0.1 s after the one before while the game is on screen. Settings shows how many
  // in the last minute ("화면 멈칫"), so a phone that lags can tell us what we cannot measure from here.
  var hitches = [];
  function noteHitch(ms) { var n = Date.now(); hitches.push({ t: n, ms: ms }); while (hitches.length && (n - hitches[0].t > 60000 || hitches.length > 200)) hitches.shift(); }
  G.hitches = function () {
    var n = Date.now(), k = 0, worst = 0;
    hitches.forEach(function (h) { if (n - h.t <= 60000) { k++; worst = Math.max(worst, h.ms); } });
    return { n: k, worst: worst };
  };
  var last = performance.now();
  function frame(now) {
    // the next frame is asked for first, and each part runs on its own: one error used to end the game loop for good
    // (the picture stood still until the app was reopened)
    requestAnimationFrame(frame);
    var gap = now - last;
    if (ready && gap > 100 && gap < 5000 && !document.hidden) noteHitch(gap);
    var rdt = Math.min(0.05, Math.max(0, gap / 1000)); last = now;
    if (ready) {
      coinBox = null;
      var gdt = sc.scaleDt(rdt) * FAST;
      try { tick(gdt); } catch (e) { noteError(e); }
      try { fx.update(gdt); } catch (e) { noteError(e); }
      try { sc.update(gdt, rdt); } catch (e) { noteError(e); }
      try {
        updateCoins(rdt);
        lookT -= rdt; if (lookT <= 0) { lookT = 0.25; applyLook(); }
        gained.t += rdt; if (gained.t >= 1) { ui.gainLog(gained); gained.gold = gained.xp = gained.gems = gained.dmg = 0; gained.t = 0; gained.more.length = 0; }
        uiT += rdt; panelT += rdt; saveT += rdt;
        if (uiT > 0.1) { uiT = 0; ui.hud(); if (nowSlot !== lastSlot) { lastSlot = nowSlot; ui.slots(); } }
        if (panelT > 0.3) { panelT = 0; ui.renderPanel(); }
        if (saveT > 5) { saveT = 0; save(); }
        watchFps(rdt);
      } catch (e) { noteError(e); }
    }
    try { sc.render(); } catch (e) { noteError(e); }
  }

  // ---------- leaving and coming back ----------
  function giveOffline() {
    var r = CW.offlineReward(state, Date.now());
    if (r.seconds < 60) return;
    state.gold += r.gold; state.gems += r.gems; var lv = CW.gainXp(state, r.xp || 0); r.levels = lv.levels; if (lv.levels) refreshStats(); save();
    ui.showOffline(r);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { CW.onHidden(state); clearField(true); save(); }
    else { last = performance.now(); syncRegion(); giveOffline(); }
  });
  root.addEventListener('pagehide', save);
  root.addEventListener('resize', function () { sc.size(); });
  document.addEventListener('pointerdown', function () { snd.init(); }, { passive: true });

  // ---------- cloud save: the viewer's own private slot, so phone and PC share progress ----------
  var cloud = { ref: null, busy: false, last: '', startedAt: Date.now(), off: false };
  function cloudBody() { return JSON.stringify(state); }
  function cloudPush(force) {
    if (!cloud.ref || cloud.busy || cloud.off) return;
    state.lastSeen = Date.now();
    var body = cloudBody(); if (!force && body === cloud.last) return;
    cloud.busy = true;
    cloud.ref.set({ json: body, lastSeen: state.lastSeen }).then(function () { cloud.last = body; }, function (e) {
      if (e && (e.code === 'invalid_argument' || e.code === 'quota_exceeded' || e.code === 'revoked' || e.code === 'not_granted')) cloud.off = true;
    }).then(function () { cloud.busy = false; });
  }
  function adopt(json) {
    var loaded = CW.load({ getItem: function () { return json; } }); if (!loaded) return false; CW.migrateBag(loaded);
    state = loaded; rot = CW.rotation(state); refreshStats(); pendingTier.length = 0; preview = null;
    clearField(true); region = -1; restT = 0.4;
    if (state.bossTry) { state.bossTry = false; state.stage = Math.max(0, state.stage - 1); state.farming = true; }
    syncRegion(); sc.setTierAura(state.tier); applySettings();
    ui.renderPanel(true); ui.slots(); ui.hud();
    return true;
  }
  function cloudInit() {
    var c = root.claude; if (!c || typeof c.use !== 'function') return;
    Promise.all([c.use('db'), c.use('user')]).then(function (r) {
      var db = r[0], user = r[1]; if (!db || !user) return null;
      return user.id().then(function (id) { return id ? db.doc('data/users/' + id + '/save') : null; });
    }).then(function (ref) {
      if (!ref) return;
      cloud.ref = ref;
      return ref.get().then(function (snap) {
        var d = snap.exists ? snap.data() : null;
        var localSeen = state.lastSeen || 0, earlyEnough = Date.now() - cloud.startedAt < 20000;
        if (d && typeof d.json === 'string' && (d.lastSeen || 0) > localSeen + 1000 && earlyEnough) {
          var keepSeen = localSeen;
          if (adopt(d.json)) { cloud.last = d.json; ui.toast('다른 기기에서 하던 진행을 불러왔어요'); giveOffline(); return; }
          state.lastSeen = keepSeen;
        }
        cloudPush(true);
      });
    }).catch(function () { cloud.ref = null; });
  }
  setInterval(function () { if (ready && !document.hidden) cloudPush(false); }, 20000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) cloudPush(false); });

  // ---------- start ----------
  $('banner').textContent = '불러오는 중…'; $('banner').classList.add('on');
  applySettings();
  CW.loadArt(CW.ART_IDS.concat(regionArt(CW.stageInfo(state.stage).region))).then(function (a) {
    for (var k in a) art[k] = a[k];
    if (art.hero) { sc.setHero(art.hero); applyLook(true); }
    sc.setTierAura(state.tier);
    if (state.bossTry) { state.bossTry = false; state.stage = Math.max(0, state.stage - 1); state.farming = true; }
    syncRegion();
    $('banner').classList.remove('on');
    ready = true; ui.hud(); ui.slots(); ui.renderPanel(true);
    giveOffline();
    cloudInit();
  });
  requestAnimationFrame(frame);
  // test hook: advance the game by hand (the page may be hidden, which pauses animation frames)
  function step(sec, dt) {
    dt = dt || 1 / 30;
    for (var n = Math.round(sec / dt); n > 0; n--) { coinBox = null; var g = sc.scaleDt(dt) * FAST; tick(g); fx.update(g); sc.update(g, dt); updateCoins(dt); }
    applyLook(); ui.hud(); ui.slots(); ui.renderPanel(); sc.render();
  }
  root.GAME = { G: G, sc: sc, fx: fx, ui: ui, step: step, isReady: function () { return ready; }, get state() { return state; } };
})(this);
