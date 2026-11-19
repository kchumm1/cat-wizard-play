// Game loop: spawning, the 4-skill rotation, damage, bosses, job changes, coins, saving and offline rewards.
(function (root) {
  var CW = root.CW, DATA = CW.DATA, T = root.THREE;
  var $ = function (id) { return document.getElementById(id); };

  var storage = null;
  try { storage = root.localStorage; storage.setItem('cw-probe', '1'); storage.removeItem('cw-probe'); } catch (e) { storage = null; }
  var state = CW.migrateBag(CW.load(storage) || CW.newState());
  // 한 종류에 하나 (2026-11-18, js/sigil.js · js/runes.js): a save that wore an option or a rune kind twice keeps the strongest
  function oneOfEach(s) { if (CW.sigilDedupe && s.sigil) CW.sigilDedupe(s); if (CW.runeDedupe && s.runeBag) CW.runeDedupe(s); return s; }
  oneOfEach(state);
  // 체험판 (js/friend.js): a save brought in from a full game keeps at most the 9th job
  // 체험판: 10차 이상은 없음 — 차수만 9로 내리고, 슬롯·프리셋에 남은 10차 이상 스킬도 9차까지의 스킬로 바꿈 (2026-11-16, 나무 10차가 새어 나오지 않게)
  function friendCap(s) {
    if (!CW.FRIEND || !s) return s;
    if (s.tier > CW.FRIEND_MAX_TIER) s.tier = CW.FRIEND_MAX_TIER;
    var ok = function (id) { var k = id && CW.skillById(id); return !!(k && k.tier <= CW.FRIEND_MAX_TIER); };
    var spare = DATA.skills.filter(function (k) { return k.tier <= s.tier; }).map(function (k) { return k.id; });
    var fix = function (arr) { if (!Array.isArray(arr)) return arr; var out = arr.map(function (id) { return id === null || ok(id) ? id : null; }); out.forEach(function (id, i) { if (id === null && arr[i] !== null) { var f = spare.filter(function (x) { return out.indexOf(x) < 0; })[0]; out[i] = f || null; } }); return out; };
    s.slots = fix(s.slots); if (Array.isArray(s.presets)) s.presets = s.presets.map(function (p) { return Array.isArray(p) ? fix(p) : p; });
    return s;
  }
  friendCap(state);
  // 11차 물 (2026-11-17): a 10th-job save that already beat 루나틱 10-31 (its last stage, not to be fought again) gets the
  // 11th job now. Its celebration is owed (state.tierShow, saved): it plays once the game has begun and no window is
  // open — not behind the update screen or under the 「돌아왔어요」 window (final review), and still next time if the
  // app is left before it played
  if (CW.lateTier) CW.lateTier(state, CW.FRIEND);
  var begun = false;
  // monster codex (2026-11-15): an old save gets its codex filled once from how far it went
  if (CW.dexBackfill) CW.dexBackfill(state);
  var params = new URLSearchParams(location.search);
  var FAST = Math.max(1, Math.min(60, +params.get('fast') || 1));

  var sc = CW.createScene($('cv'), $('ov')), fx = CW.createFx(sc), snd = CW.sound;
  var art = {}, ready = false, rot = CW.rotation(state), castT = 0.6, nowSlot = -1, boss = null, spawnT = 0, st = CW.stats(state);
  var thumbs = null, region = -1, preview = null, pendingTier = [], saveT = 0, uiT = 0, panelT = 0, lastSlot = -2, restT = 0;

  function refreshStats() {
    st = CW.stats(state);
    // titles earned along the way (2026-11-14)
    var got = CW.titleCheck ? CW.titleCheck(state) : [];
    if (got.length && typeof ui !== 'undefined' && ui && ui.toast) got.forEach(function (id) { ui.toast('새 칭호 획득 · ' + CW.titleById(id).name + ' — 프로필에서 장착할 수 있어요.'); });
  }
  // equipment changes the wizard's picture (hat/robe colour, jewellery, staff glow)
  var lastLook = null;
  var gained = { gold: 0, xp: 0, gems: 0, dmg: 0, t: 0, more: [] };
  var heroArtId = 'hero', lastCos = null, artWait = {}, artFail = {};
  // costume pictures are fetched the first time they are needed, then the look and the cards refresh
  // monster pictures likewise, when their region is reached
  function needArt(id) {
    var cos = CW.COSTUME_ART.indexOf(id) >= 0 || /^cos\d+-v\d$/.test(id), mon = (CW.MON_ART || []).indexOf(id) >= 0;
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
  function regionArt(r) { var R = CW.regionAt(state.diff, r); return R ? R.monsters.concat(R.minis || [], [R.boss.art]) : []; }
  // wide pictures (crabs, turtles, snakes) are drawn a little shorter so every monster takes about the same room
  function fitHeight(a, h) { return a.aspect > 1.05 ? h / Math.pow(a.aspect, 0.45) : h; }
  var VIEW_IDS = ['hero-v0', 'hero-v1', 'hero-v2', 'hero-v3'];
  // pictures that have four views (the user's turnarounds, 2026-11-15): the plain wizard (staff cut out and put in its
  // paw), and every costume (staff drawn in; cos11/cos16 2026-11-15, the other sixteen 2026-11-17, rigs js/rig.js
  // VIEW_RIGS); a costume's views are fetched when it is worn
  var VIEW_SETS = { hero: VIEW_IDS };
  CW.COSTUME_ART.forEach(function (c) { VIEW_SETS[c] = [0, 1, 2, 3].map(function (i) { return c + '-v' + i; }); });
  // the staff cut out of the plain wizard's picture, trimmed to itself, with where the paw holds it (rig armL.p) and
  // where its star is (armL.tip), in picture heights from its bottom-left — for the side views' paws (scene.js)
  function staffPiece(cv, base, mk) {
    var W = cv.width, H = cv.height, d = cv.getContext('2d').getImageData(0, 0, W, H).data, x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    var bw = x1 - x0 + 1, bh = y1 - y0 + 1, c = document.createElement('canvas'); c.width = bw; c.height = bh;
    c.getContext('2d').drawImage(cv, x0, y0, bw, bh, 0, 0, bw, bh);
    var cr = base.crop, k = W / cr.cw, A = base.rig.armL;
    function at(q) { return [((q[0] - cr.x0) * k - x0) / H, (y1 + 1 - (q[1] - cr.y0) * k) / H]; }
    var g = at(A.p), t = at(A.tip);
    return { tex: mk(c), w: bw / H, h: bh / H, gx: g[0], gy: g[1], tx: t[0], ty: t[1] };
  }
  function applyLook(silent) {
    var l = CW.lookOf(state), cl = CW.costumeLook(state), key = CW.lookKey(l) + '|' + cl.id + '|' + (art[cl.art] ? cl.art : 'hero') + '|' + (VIEW_SETS[cl.art] || []).filter(function (id) { return art[id]; }).length;
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
      // the plain wizard with no costume turns to where it looks, drawn from four sides (2026-11-15): each side view gets
      // the same hat and cape colours, and the staff just cut out goes into its paw
      try {
        if (parts && useViews && base.id === 'hero') sc.setHeroViews(VIEW_IDS.map(function (id) { return art[id]; }), VIEW_IDS.map(function (id) { return mk(CW.paintHero(art[id], l)); }), staffPiece(parts.staff, base, mk));
      } catch (e) { sc.setHeroViews(null); }
    }, 60);
    var vset = VIEW_SETS[base.id], useViews = !!vset && (base.id !== 'hero' || (!cl.fx && !l.outfit)) && vset.every(function (id) { if (!art[id]) needArt(id); return art[id]; });
    if (!useViews) sc.setHeroViews(null);
    else if (base.id !== 'hero') sc.setHeroViews(vset.map(function (id) { return art[id]; }), vset.map(function (id) { return art[id].tex; }), null);
    if (cl.id !== lastCos) { lastCos = cl.id; sc.setCostumeFx(cl.fx); fx.setCostume(cl.fx); }
    if (!first && !silent) { fx.levelUp(state.tier, CW.staffColor(l), true); ui.toast('캐릭터 모습이 변경됐어요.'); }
  }
  function hexCss(h) { return '#' + ('000000' + h.toString(16)).slice(-6); }
  function isBright(R) { var c = new T.Color(R.sky); return c.r * 0.3 + c.g * 0.59 + c.b * 0.11 > 0.55; }
  function save() { CW.save(state, storage); }

  // ---------- stage & region ----------
  function syncRegion() {
    // the sky world's regions are scene regions 10-19 (하늘 세계, 2026-11-17)
    var r = CW.stageInfo(state.stage).region, key = CW.sceneRegion(state.diff, r);
    if (key === region) return;
    // into the other world: its little ones are another kind, so the old ones run off (하늘 세계 졸개, 2026-11-17)
    if (region >= 0 && (region >= 10) !== (key >= 10) && sc.minions) sc.minions.scatter();
    region = key; var R = CW.regionAt(state.diff, r);
    regionArt(r).concat(regionArt(r + 1)).forEach(needArt);
    sc.setRegion(key, R); fx.setRegion(R); fx.setBright(isBright(R));
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
    var info = CW.stageInfo(state.stage), R = CW.regionAt(state.diff, info.region);
    if (!waveKinds.length || R.monsters.indexOf(waveKinds[0]) < 0) pickKinds(R);
    var id = waveKinds[Math.floor(Math.random() * waveKinds.length)], a = mobArt(id, R.monsters[0]); if (!a) return;
    var r = Math.random(), entry = r < 0.6 ? 'run' : r < 0.85 ? 'leap' : 'drop';
    sc.spawnMob({ art: a, id: id, height: fitHeight(a, 0.9 + Math.random() * 0.14), hp: CW.stageMonsterHp(state) / CROWD, entry: entry });
  }
  // the little ones (js/minions.js): the user's six small-fry pictures, mixed at random in every region (2026-11-16);
  // they bring nothing and count for nothing. Their pictures are fetched once, the first time any are wanted.
  // Size: about 80 % of a monster (2026-11-17, the user: 키우되 몬스터의 80% — they were about 55 %; as big as a monster
  // they would be taken for the ones that count)
  // each world's own kinds (하늘 세계 2026-11-17), fetched the first time that world wants one
  var minionArt = {}, minionLoad = {};
  function minionPick() {
    var w = CW.worldOf(state.diff);
    if (!minionLoad[w]) minionLoad[w] = CW.loadArt(CW.minionKinds(w).map(function (k) { return k.id; })).then(function (m) { Object.assign(minionArt, m); });
    var k = CW.pickMinionKind(minionArt, null, w), a = k && minionArt[k.id];
    return a ? { art: a, height: fitHeight(a, 0.72 + Math.random() * 0.11), fly: !!k.fly } : null;
  }
  var mins = sc.minions;
  function startBoss() {
    var info = CW.stageInfo(state.stage), R = CW.regionAt(state.diff, info.region);
    if (mins) mins.scatter();
    clearField(false);
    var sb = CW.stageBoss(state.stage, state.diff || 0), a = mobArt(sb.art, R.boss.art) || mobArt(R.boss.art);
    if (!a) { needArt(sb.art); restT = 0.3; state.bossTry = true; return; }
    var name = sb.name;
    // bosses are drawn clearly bigger than the crowd: a stage boss about twice a monster, the region boss more
    var mob = sc.spawnMob({ art: a, id: sb.art, height: fitHeight(a, info.isRegionBoss ? 2.45 : 2.0), hp: CW.stageBossHp(state), boss: true, regionBoss: info.isRegionBoss, name: name });
    boss = { mob: mob, time: info.timeLimit, info: info, name: name };
    fx.bossEnter(mob, info.isRegionBoss);
    snd.play('boss');
  }
  function onStageMoved(kind) {
    smallKills = 0;
    syncRegion();
    if (kind === 'hold') { ui.toast('도전 버튼을 눌러 보스전을 시작하세요.'); return; }
    if (kind === 'boss') startBoss();
  }

  // ---------- combat ----------
  var CRIT_FLASH = { 4: 'rgba(160,250,255,0.25)', 5: 'rgba(255,90,170,0.28)', 6: 'rgba(255,255,255,0.32)', 7: 'rgba(130,255,110,0.32)' };
  // Damage on its way (2026-11-17, user: '어떤 스킬은 빠르고 어떤 스킬은 시간 걸려서 스킬이 씹혀'): a slow spell (식인 꽃,
  // 대혜성…) lands late, and a quick one cast after it used to finish its monster first, so the slow one's blow had no one
  // left. Now each cast books the damage it will deal on the monsters it aims at (m.book), the next cast passes over a
  // monster whose booked damage already covers its health, and a booking is let go as its hits land (or after BOOK_T).
  // A blow that still finds no one is moved on in fx.js (c.hit: the nearest one standing, or the next one to come).
  // (Holding the next cast until fresh monsters came was tried and dropped: it slowed the whole rotation, 12% fewer kills.)
  var clockT = 0, BOOK_T = 3;
  function bookedOn(m) {
    if (!m.book) return 0;
    var n = 0;
    m.book = m.book.filter(function (b) { return b.left > 0 && b.until > clockT; });
    m.book.forEach(function (b) { n += b.left; });
    return n;
  }
  function doomed(m) { return !m.boss && m.hp - bookedOn(m) <= 0; }
  function bookCast(skill, mul, targets) {
    var list = [];
    // a wide spell lands on everyone on the field: it books its blow on each monster standing there now
    if (skill.targets >= 99) targets = aliveMobs().filter(function (m) { return m.arrived; });
    targets.forEach(function (m) {
      if (m.boss) return;
      var b = { mob: m, left: CW.hitDamage(st, skill, { boss: false, critTier: 0, even: true }) * mul, until: clockT + BOOK_T };
      (m.book || (m.book = [])).push(b); list.push(b);
    });
    return list;
  }
  function onHit(skill, mul, book) {
    return function (mob, frac, power) {
      if (!mob || !mob.alive) return;
      var ct = CW.rollCrit(st), crit = ct > 0;
      var dmg = CW.hitDamage(st, skill, { boss: mob.boss, critTier: ct, even: true, frozen: mob.frozen > 0, shocked: mob.shocked > 0 }) * (frac === undefined ? 1 : frac) * (mul || 1);
      if (book) book.forEach(function (b) { if (b.mob === mob) b.left -= dmg; });
      if (dun && mob === dun.golem) dun.dmg += dmg; else mob.hp -= dmg;
      mob.lastCol = skill.color;
      // a boss freezes now and then, not under every ice spell (it would stand frozen the whole fight)
      if (skill.status === 'freeze') { if (!mob.boss) mob.frozen = Math.max(mob.frozen, 1.5); else if (!(mob.frzCd > 0)) { mob.frozen = Math.max(mob.frozen, 0.7); mob.frzCd = 2.8; } }
      if (skill.status === 'shock') mob.shocked = 2.2;
      sc.hitMob(mob, crit, (power || 1) * (1 + 0.25 * Math.max(0, ct - 1)));
      // water skills: the number in near white — in the skill's own blue it could not be read on the water (2026-11-17,
      // the user: 실제로 타격하는지 모르겠다)
      var numCol = skill.el === 'water' ? '#f4fcff' : hexCss(skill.color);
      sc.damageText(sc.mobTop(mob), CW.fmt(dmg), ct, numCol);
      // the little ones standing near where it landed are knocked out together, with one shared burst
      // (2026-11-18, user: '졸개들한테 타격이 안 들어가는 것 같다'): the reach was 0.8–1.3 round the monster hit, so a
      // wide spell that covers the whole screen (원소 합체 궁극기, 별똥별 비…) left most little ones standing a step away
      // (in a test, twice as many stood within 2 of a hit as were knocked out). Wide spells now reach 2.0 round every
      // monster they land on, the others 1.1–1.6.
      if (mins && !mob.boss) {
        var mk = mins.hitArea(mob.x, mob.z, skill.targets >= 99 ? 2.0 : 1.1 + 0.25 * Math.min(2, power || 1));
        if (mk.n) {
          fx.minionBurst(new sc.THREE.Vector3(mk.x, 0.3, mk.z), mk.n, skill.color); if (mk.n >= 2) snd.play('kill');
          // each little one shows the damage the same spell would deal it, with its own critical roll (2026-11-16, user:
          // "졸개도 스킬에 맞고 대미지를 몬스터 + 졸개까지 다 보여줘"); they still bring nothing and count for nothing
          // (at most 8 numbers a hit, so a wide reach does not flood a phone with text)
          mk.hits.forEach(function (h, hi) {
            if (hi >= 8) return;
            var mt = CW.rollCrit(st), md = CW.hitDamage(st, skill, { boss: false, critTier: mt, even: true }) * (frac === undefined ? 1 : frac) * (mul || 1);
            sc.damageText(new sc.THREE.Vector3(h.x, h.y, h.z), CW.fmt(md), mt, numCol);
          });
        }
      }
      // 크리티컬(2026-11-17, 치명타 다음 단계)은 빼고 셈 — 흔들림·번쩍임은 예전처럼 루나(옛 울트라)부터
      var cv = ct > 1 ? ct - 1 : ct;
      if (cv >= 3) { sc.shake(Math.min(0.42, 0.08 * cv)); if (cv >= 4) sc.flash(CRIT_FLASH[Math.min(cv, 7)], cv >= 5 ? 0.24 : 0.18); }
      gained.dmg = Math.max(gained.dmg, dmg);
      snd.play(crit ? 'crit' : 'hit');
      if (mob.hp <= 0) onDeath(mob, skill);
    };
  }
  // monster codex (2026-11-15): the first kill of each kind is written down, in stage fights and dungeons alike;
  // the id is the one meant to appear even when a stand-in picture was shown, the region is the monster's own
  function dexKill(id) {
    if (!id || !CW.dexRecord) return;
    if (CW.dexRecord(state, id, null, Date.now()) !== 'new') return;
    var r = state.dex[id].r;
    if (CW.dexDot) CW.dexDot(true);
    if (CW.dexRegion(state, r).done) { refreshStats(); ui.toast(CW.dexRegionData(r).name + ' 도감 완성! ' + CW.dexBonusText()); }
  }
  function onDeath(mob, skill) {
    sc.killMob(mob, skill.color, mob.boss);
    var pos = sc.mobPos(mob);
    dexKill(mob.id);
    if (mob.boss && boss && boss.mob === mob) { bossWin(pos); return; }
    if (dun) { dun.kills++; if (CW.idleNote) CW.idleNote({ kill: 1 }); if (dun.kind === 'gold') { fx.coinPop(pos, 4); flyCoins(pos, 2); } else fx.coinPop(pos, 2); snd.play('kill'); return; }
    var gold = CW.stageGold(state, undefined, st.goldMul) * st.goldMul / CROWD * DATA.balance.killPay;
    state.gold += gold; fx.coinPop(pos, 3); flyCoins(pos, 2); snd.play('kill');
    var kx = CW.killXp(state) / CROWD * st.xpMul * DATA.balance.killPay;
    gained.gold += gold; gained.xp += kx;
    if (CW.idleNote) CW.idleNote({ kill: 1, gold: gold, xp: kx });   // 방치모드 counts it (js/idle-ui.js)
    onLevel(CW.gainXp(state, kx));
    if (state.bossTry) return;
    smallKills++;
    if (smallKills < CROWD) return;
    smallKills = 0;
    // a field kill brings the two dusts (2026-11-17: no diamonds in the field, they come from bosses)
    var r0 = Math.floor(state.runeDust || 0), s0 = Math.floor(state.sigilDust || 0), dz = CW.addKillDust(state); if (CW.idleNote) CW.idleNote(dz);
    gained.runeDust = (gained.runeDust || 0) + Math.floor(state.runeDust) - r0; gained.sigilDust = (gained.sigilDust || 0) + Math.floor(state.sigilDust) - s0;
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
    var sstone = CW.addSigilStone(state, CW.sigilStoneForBoss(state, isRB, stage)); if (sstone) gained.sigilStone = (gained.sigilStone || 0) + sstone;
    var sigs = CW.sigilDrop(state, isRB), runeGot = CW.runeDrop(state, isRB);
    gained.gold += gold; gained.gems += gems; gained.xp += bx;
    if (CW.idleNote) CW.idleNote({ kill: 1, gold: gold, xp: bx, rune: rstone });
    onLevel(CW.gainXp(state, bx));
    var res = CW.onBossResult(state, true);
    boss = null;
    // no pop-up for a win: the wizard cheers, and what was won scrolls by quietly in the corner list
    sc.slowmo(0.7, 0.3); snd.play('win'); sc.heroCheer(1.5);
    if (mana) gained.more.push({ t: '마력석 +' + CW.fmt(mana), c: '#8fd8ff' });
    if (shards) gained.more.push({ t: '신기 조각 +' + shards, c: '#ffd24a' });
    if (rstone) gained.runeStone = (gained.runeStone || 0) + rstone;   // shown with its picture (ui gainLog)
    if (sigs.length) gained.more.push({ t: '신성력 ' + sigs.map(function (x) { return DATA.grades[x.grade].name; }).join('·'), c: '#8ff59a' });
    if (runeGot.length) gained.more.push({ t: '룬 ' + runeGot.map(function (x) { return DATA.hiGrades[x.grade].name + ' ' + CW.runeById(x.kind).name; }).join('·'), c: '#c9a8ff' });
    if (runeGot.overflow) gained.more.push({ t: '룬 가방이 꽉 차 룬석 +' + CW.fmt(runeGot.overflow), c: '#c9a8ff' });
    gained.t = 1;
    if (res.tierUp) pendingTier.push({ tier: res.tierUp, at: 1.1 });
    if (res.final) setTimeout(function () {
      var nd = res.unlocked !== null && res.unlocked !== undefined ? DATA.difficulties[res.unlocked] : null;
      ui.modal('<h2>' + CW.regionAt(state.diff, 9).boss.name + ' 토벌 완료</h2><p class="guide-lead">' + CW.diffOf(state).name + ' 난이도를 완료했어요.</p>' + (nd ? '<div class="guide-section"><h3>다음 난이도 해금 · <strong>' + nd.name + '</strong></h3><p>몬스터와 보스가 더 강해지고 등장 수가 늘어요.</p></div>' : '<div class="guide-section"><p>원하는 지역에서 계속 사냥할 수 있어요.</p></div>'),
        nd ? [{ label: '나중에' }, { label: nd.name + ' 도전', pri: true, fn: function () { G.setDifficulty(res.unlocked); } }] : [{ label: '확인', pri: true }], { variant: 'guide' });
    }, 1400);
    castT = Math.max(castT, 0.9); restT = 1.1;
    save();
  }
  function onLevel(r) {
    if (!r || !r.levels) return;
    refreshStats(); fx.levelUp(state.tier, 0x7fe3ff, true); snd.play('tier');
    ui.banner('Lv.' + state.level + '!');
    if (r.gems) ui.toast('Lv.' + state.level + ' 달성 · 다이아 +' + r.gems);
  }
  function bossFail() {
    var mob = boss.mob; boss = null;
    CW.onBossResult(state, false);
    sc.killMob(mob, 0x777788, false);
    ui.banner('도전 시간이 끝났어요'); snd.play('lose');
    ui.toast('성장을 강화한 뒤 ‘보스 다시 도전’을 눌러 보세요.');
    restT = 0.8; save();
  }
  function doTierUp(t) {
    if (state.tierShow === t) delete state.tierShow;
    var id = DATA.tiers[t - 1].skill, sk = id && CW.skillById(id);
    if (id) CW.autoSlotNew(state, id);
    sc.setTierAura(t); fx.levelUp(t, [0xffd84a, 0xff6a2b, 0x9fd8ff, 0xbfefff, 0xffe14a, 0xe6e6ff, 0xffd84a, 0xb04bff, 0xffffff][t - 1]);
    snd.play('tier'); ui.showTierUp(t, sk); ui.slots(); save();
  }
  function pickTargets(skill) {
    // nearest first, leaning toward the ones the wizard already faces so it does not keep turning round
    var H = sc.heroState(), dist = function (m) { var dx = m.x - H.x, dz = m.z - H.z, sx = sc.scrX ? sc.scrX(dx, dz) : dx; return (dx * dx + dz * dz) * (sx * H.faceT < -0.3 ? 1.8 : 1); };
    // monsters already covered by damage on its way go last: they are only aimed at when no one else is left
    var list = aliveMobs().filter(function (m) { return m.arrived; }).map(function (m) { return { m: m, d: dist(m), gone: doomed(m) }; })
      .sort(function (a, b) { return (a.gone - b.gone) || (a.d - b.d); }).map(function (o) { return o.m; });
    return list.slice(0, CW.targetCount(skill, !!dun));
  }
  function castNext() {
    var peek = aliveMobs().filter(function (m) { return m.arrived; });
    if (!peek.length) { castT = 0.12; return; }
    var s = rot.next(); if (!s) { castT = 0.5; return; }
    nowSlot = rot.index();
    var tg = pickTargets(s); if (tg[0]) sc.heroFaceTo(tg[0].x, tg[0].z);
    // mana surge: when the gauge is full this cast hits far harder and is drawn bigger
    var surge = CW.surgeTick(state, st), weak = CW.isWeak(s, CW.regionOf(state), state.diff);
    if (surge) { sc.shake(0.3); sc.flash('rgba(190,140,255,0.32)', 0.22); }
    var mul = (surge ? st.surgeMul : 1) * (weak ? st.weakMul : 1), bk = bookCast(s, mul, tg);
    fx.cast(s, state.tier, tg, onHit(s, mul, bk), st.speedMul, CW.skillLevel(state, s.id), surge);
    ui.surgeGauge(state.surge || 0, DATA.surgeConf.charge);
    snd.play('cast');
    castT = CW.castTime(s, st.speedMul);
  }

  // ---------- dungeons: 30-second runs ----------
  var dun = null;
  function dunDef(kind) { for (var i = 0; i < DATA.dungeons.length; i++) if (DATA.dungeons[i].id === kind) return DATA.dungeons[i]; return null; }
  function spawnDun() {
    var info = CW.stageInfo(Math.max(0, state.best)), R = CW.regionAt(state.diff, info.region);
    var did = R.monsters[Math.floor(Math.random() * R.monsters.length)], a = mobArt(did, R.monsters[0]); if (!a) return;
    var hp = CW.stageMonsterHp({ stage: Math.max(0, state.best), diff: state.diff || 0 }) / CW.DUN_CROWD * 0.6;
    sc.spawnMob({ art: a, id: did, tint: dun.kind === 'gold' ? 0xffd84a : dun.kind === 'rune' ? 0xc49bff : 0x8ff0ff, height: fitHeight(a, 0.88 + Math.random() * 0.14), hp: hp, entry: Math.random() < 0.7 ? 'run' : 'leap' });
  }
  function dungeonStart(kind) {
    var def = dunDef(kind); if (!def) return 'none';
    if (dun || boss || state.bossTry) return 'busy';
    if (!CW.useTicket(state, kind, Date.now())) return 'ticket';
    clearField(true); restT = 0;
    dun = { kind: kind, t: def.time, kills: 0, dmg: 0, golem: null, sp: 0.3, def: def };
    var R0 = CW.regionAt(state.diff, CW.stageInfo(Math.max(0, state.best)).region); needArt('b47');
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
    if (G.wallet) { G.wallet.queueDungeon({ kind: d.kind, kills: d.kills }); walletFlush(); }   // 서버 지갑: tickets and gem-dungeon diamonds are counted by the server
    dun = null; clearField(true); restT = 0.6; ui.dunHud(null);
    snd.play('win'); ui.banner('던전 클리어!'); save();
    // the reward book (js/dungeon-book.js, 2026-11-17): the game's own currency pictures, counting up
    if (CW.dungeonBook) {
      var fG = function (v) { return '+' + CW.fmtGold(v); }, fN = function (v) { return '+' + CW.fmt(v); };
      var rw = d.kind === 'mana' ? [{ ico: 'mana', label: '마력석', value: r.mana || 0, fmt: fN }]
        : d.kind === 'gold' ? [{ ico: 'gold', label: '골드', value: r.gold || 0, fmt: fG }]
        : d.kind === 'gem' ? [{ ico: 'gem', label: '다이아', value: r.gems || 0, fmt: fN }]
        : [{ ico: 'runeStone', label: '룬석', value: r.runeStone || 0, fmt: fN }];
      if (d.kind === 'rune' && r.got && r.got.length) rw.push({ ico: 'rune', label: '룬', value: r.got.length, fmt: function (v) { return CW.fmt(v); }, unit: '개' });
      if (d.kind === 'rune' && r.overflow) rw.push({ ico: 'runeStone', label: '가방이 꽉 차 룬석', value: r.overflow, fmt: fN, sub: true });
      CW.dungeonBook({ kind: d.kind, name: d.def.name, tickets: CW.ticketsLeft(state, d.kind, Date.now()), rewards: rw,
        stat: d.kind === 'mana' ? ['골렘에게 준 피해', CW.fmt(d.dmg), ' · Lv.' + r.level] : ['잡은 몬스터', d.kills, '마리'],
        onClose: function () { snd.play('click'); } });
      return;
    }
    var lines = d.kind === 'mana' ? '<p>골렘에게 준 피해 <b>' + CW.fmt(d.dmg) + '</b> (Lv.' + r.level + ')</p><p style="color:#8fd8ff;font:400 22px var(--display)">마력석 +' + CW.fmt(r.mana) + '</p>'
      : '<p>잡은 몬스터 <b>' + d.kills + '마리</b></p><p style="color:' + (d.kind === 'gold' ? 'var(--gold)' : d.kind === 'rune' ? '#d8b8ff' : 'var(--gem)') + ';font:400 22px var(--display)">' + (d.kind === 'gold' ? '골드 +' + CW.fmtGold(r.gold) : d.kind === 'rune' ? '룬석 +' + CW.fmt(r.runeStone) + (r.got && r.got.length ? ' · 룬 ' + r.got.length + '개' : '') + (r.overflow ? ' · 가방이 꽉 차 룬석 +' + CW.fmt(r.overflow) : '') : '다이아 +' + CW.fmt(r.gems)) + '</p>';
    ui.modal('<h2>' + d.def.name + '</h2>' + lines + '<p class="note">남은 입장권 ' + CW.ticketsLeft(state, d.kind, Date.now()) + '장<br>소탕으로 최고 기록의 보상을 바로 받을 수 있어요.</p>', [{ label: '확인', pri: true }]);
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
  // how many frames a second are drawn (js/framepace.js): the 절전 setting, a menu sheet open, no touch for a while
  var pace = CW.createFramePace();
  // 아래 탭 줄 성운 (2026-11-18, 형: 발열): the nebula is its own layer slid sideways (index.html .tabneb) instead of the
  // tab bar's background being moved, which repainted the whole bar every frame
  (function () { var tb = $('tabs'); if (tb && !tb.querySelector('.tabneb')) { var nb = document.createElement('i'); nb.className = 'tabneb'; nb.setAttribute('aria-hidden', 'true'); tb.insertBefore(nb, tb.firstChild); } })();
  var calmOn = false;
  // 가로 (2026-11-17): how far left the view goes with the drawer open — the middle of the stage to the middle of the
  // part still showing (between the quick-button column and the drawer), a little short of it so the wizard at the left
  // of the fight is not pushed against the column
  var sheetOpen = false;
  function landShift() {
    var app = $('app'), sh = $('sheet'), q = $('quick'), W = app ? app.clientWidth : 0; if (!W || !sh) return 0.2;
    var left = q ? q.offsetLeft + q.offsetWidth : 0, mid = (left + sh.offsetLeft) / 2;
    return Math.max(0, Math.min(0.35, (W / 2 - mid) / W * 0.8));
  }
  if (CW.onLand) CW.onLand(function () { sc.size(); G.setSheet(sheetOpen); });
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
    summonRelics: function (n) { if (G.wallet) return walletDo('summonRelics', { n: n }, function () { snd.play('pull'); }); var r = CW.summonRelics(state, n); if (r) { refreshStats(); snd.play('pull'); save(); } return r; },
    buyCostume: function (id) { if (G.wallet) return walletDo('buyCostume', { id: id }, function () { snd.play('win'); }); var ok = CW.buyCostume(state, id); if (ok) { refreshStats(); snd.play('win'); save(); } return ok; },
    upCostume: function (id) { if (G.wallet) return walletDo('upCostume', { id: id }, function () { snd.play('click'); }); var ok = CW.upCostume(state, id); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    wearCostume: function (id) { var ok = CW.wearCostume(state, id); if (ok) { applyLook(); save(); } return ok; },
    costumeThumb: function (id, size) {   // size: 오팔 코스튬 전시용 큰 그림 (2026-11-16), 없으면 목록용 150px
      size = size || 150;
      thumbs = thumbs || {}; var key = 'c:' + id + (size !== 150 ? ':' + size : ''); if (thumbs[key] !== undefined) return thumbs[key];
      var c = CW.costumeById(id); if (!c) return '';
      var a = art[c.art]; if (!a) { needArt(c.art); return ''; }
      var none = { hat: -1, staff: -1, robe: -1, belt: -1, necklace: -1, ear1: -1, ear2: -1, ring1: -1, ring2: -1, outfit: a.id === 'hero' ? c.outfit : null, fx: c.fx };
      var big = CW.costumePreview(CW.paintHero(a, none), c.fx), cv = document.createElement('canvas'), s = Math.min(1, size / Math.max(big.width, big.height));
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
    // 가방 (2026-11-17, js/chest.js): 산 패키지는 가방에 상자로 — 열 때 지급
    buyPack: function (id) { if (CW.FRIEND) return false; if (G.wallet) return walletDo('buyPack', { id: id }, function () { snd.play('win'); }); var box = CW.chestBuyPack(state, id); if (box) { snd.play('win'); save(); } return box; },
    openChest: function (id) {
      if (G.wallet) return walletDo('openChest', { id: id, goldScale: CW.goldScale(state) }, function () { CW.setGoldScale(CW.capGold(state)); snd.play('win'); }).then(function (r) { return r === null ? { ok: false, why: '열 수 없어요' } : r; });
      var r = CW.chestOpen(state, id, CW.goldScale(state)); if (r.ok) { CW.setGoldScale(CW.capGold(state)); refreshStats(); snd.play('win'); save(); } return r; },
    // the phone's own date (the daily gems reset at its midnight)
    dayKey: function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
    dailyView: function () { return CW.dailyView(state, G.dayKey()); },
    hideDaily: function (on) { CW.hideDaily(state, G.dayKey(), on); save(); },
    // 우편함: claim one letter (js/mail.js); gold in 조 as shown goes through the gold scale, then the cap
    // 우편 선물도 가방으로 (2026-11-17): 받으면 편지는 받음 표시, 선물은 가방에서 열 때 들어감 (보상 없는 편지는 읽음 표시만)
    claimMail: function (l) {
      if (G.wallet) return walletDo('mailTake', { id: l.id }, function () { snd.play('win'); }).then(function (r) { return r && r.walletFail ? r : !!r; });
      if (!CW.mailHasReward(l)) { var ok = CW.mailClaim(state, l, CW.goldScale(state)); if (ok) save(); return ok; }
      var box = CW.chestTakeMail(state, l); if (box) { snd.play('win'); save(); } return !!box;
    },   // items and relics change the stats (2026-11-16)
    // 공지: remember that this notice was opened (js/notice.js)
    readNotice: function (n) { if (CW.noticeMarkRead(state, n)) save(); },
    claimDaily: function () { if (G.wallet) return walletDo('claimDaily', {}, function () { snd.play('win'); }); var n = CW.claimDaily(state, G.dayKey()); if (n) { snd.play('win'); save(); } return n; },
    runeUp: function (id) { var ok = CW.runeUp(state, id); if (ok) { refreshStats(); snd.play('click'); } return ok; },
    runeSwap: function (oldId, newId) { var ok = CW.runeSwap(state, oldId, newId); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    runeEquipToggle: function (id) { var ok = CW.runeIsWorn(state, id) ? CW.runeUnequip(state, id) : CW.runeEquip(state, id); if (!ok) return 'full'; refreshStats(); snd.play('click'); save(); return 'ok'; },
    runeLock: function (id) { var ok = CW.runeLock(state, id); if (ok) save(); return ok; },
    runeDismantle: function (id) { var n = CW.runeDismantle(state, id); if (n) { refreshStats(); save(); } return n; },
    runeDismantleAll: function () { var n = CW.runeDismantleAll(state); if (n) { refreshStats(); snd.play('win'); save(); } return n; },
    runeFuse: function (id) { var it = CW.runeFuse(state, id); if (it) { refreshStats(); if (!it.fail) snd.play('win'); save(); } return it; },
    runeSummon: function (n, group, dust) { if (G.wallet && !dust) return walletDo('runeSummon', { n: n, group: group }, function () { snd.play('pull'); }); var r = CW.runeSummon(state, n, undefined, group, dust); if (r) { refreshStats(); snd.play('pull'); save(); } return r; },
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
    sigilFuse: function (id) { var it = CW.sigilFuse(state, id); if (it) { refreshStats(); if (!it.fail) snd.play('win'); save(); } return it; },
    sigilSummon: function (n, awaken, dust) { if (G.wallet && !(dust && !awaken)) return walletDo('sigilSummon', { n: n, awaken: !!awaken }, function () { snd.play('pull'); }); var r = CW.sigilSummon(state, n, undefined, awaken, dust); if (r) { refreshStats(); snd.play('pull'); save(); } return r; },
    // 각성 제작 (2026-11-16): 각성 파편 → one awakened rune / sigil of the chosen kind
    runeCraft: function (kind) { var r = CW.runeCraft(state, kind); if (r) { refreshStats(); snd.play('pull'); save(); } return r; },
    sigilCraft: function (stat) { var r = CW.sigilCraft(state, stat); if (r) { refreshStats(); snd.play('pull'); save(); } return r; },
    sigilEquipBest: function () { CW.sigilEquipBest(state); refreshStats(); save(); },
    sigilLvUp: function () { var ok = CW.sigilLvUp(state); if (ok) { refreshStats(); snd.play('click'); } return ok; },
    rollPotential: function (k) { if (G.wallet) return walletDo('rollPotential', { k: k }, function () { snd.play('pull'); }); var ok = CW.rollPotential(state, k); if (ok) { refreshStats(); snd.play('pull'); save(); } return ok; },
    titleWear: function (id) { var ok = CW.titleWear(state, id); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    potLock: function (k, i) { var ok = CW.potLock(state, k, i); if (ok) { snd.play('click'); save(); } return ok; },
    talentUp: function (id) { var ok = CW.talentUp(state, id); if (ok) { refreshStats(); snd.play('click'); save(); } return ok; },
    talentReset: function () { CW.talentReset(state); refreshStats(); save(); },
    markUp: function (id) { var ok = CW.markUp(state, id); if (ok) { refreshStats(); snd.play('click'); } return ok; },
    rankUp: function () { var ok = CW.rankUp(state); if (ok) { refreshStats(); snd.play('tier'); fx.levelUp(state.tier, 0xffd84a); save(); } return ok; },
    circleUp: function () { var t = CW.circleTier(state), ok = CW.circleUp(state); if (ok) { refreshStats(); snd.play('click'); if (CW.circleTier(state) > t) { fx.levelUp(state.tier, 0x6fb8ff); ui.banner((CW.circleTier(state) + 1) + '서클 달성!'); save(); } } return ok; },
    dungeon: function (kind) { var r = dungeonStart(kind); if (r === 'ok') ui.openTab('battle'); return r; },
    sweep: function (kind) { var best = state.dungeon && state.dungeon.best && state.dungeon.best[kind]; var r = CW.sweep(state, kind, Date.now()); if (r && G.wallet) { G.wallet.queueDungeon({ kind: kind, kills: (best && best.kills) || 0, sweep: true }); walletFlush(); } if (r) { refreshStats(); snd.play('win'); save(); } return r; },
    dunState: function () { return dun ? { kind: dun.kind, t: dun.t, kills: dun.kills, dmg: dun.dmg, name: dun.def.name, level: dun.kind === 'mana' ? CW.golemLevel(state, dun.dmg) : 0 } : null; },
    pull: function (n) { if (G.wallet) return walletDo('pull', { n: n }); var items = CW.pull(state, n); if (items) { refreshStats(); save(); } return items; },
    buy: function (i) { if (CW.FRIEND) return 0; if (G.wallet) return walletDo('buyShop', { i: i }); var g = CW.buy(state, i); save(); return g; },
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
    // the player's own name (empty = the default: the owner's 귤귤귤귤귤, 체험판 냥법사)
    nickName: function () { return state.nick || (CW.FRIEND ? '냥법사' : '귤귤귤귤귤'); },
    setNick: function (v) { state.nick = v; save(); },
    setSetting: function (k, v) { state.settings[k] = v; applySettings(); save(); },
    // slider being dragged: show the numbers at that value right away, save when the finger lifts
    previewDamage: function (size, alpha) { sc.setDamageStyle(size / 100, alpha / 100); },
    showDamageSample: function () { var h = sc.heroCenter(); for (var i = 0; i < 3; i++) sc.damageText(h.clone().add(new T.Vector3(0.9 + i * 0.5, 0.6 + i * 0.25, 0)), ['1,234', '5.6만', '78억'][i], i); },
    reset: function () { CW.clearSave(storage); state = CW.newState(); if (CW.dexDot) CW.dexDot(false); rot = CW.rotation(state); refreshStats(); clearField(true); region = -1; syncRegion(); sc.setTierAura(1); ui.renderPanel(true); ui.slots(); save(); cloudPush(true); ui.toast('새 모험을 시작해요'); },
    storageOk: function () { return !!storage; },
    exportSave: function () { save(); return CW.exportCode(state); },
    importSave: function (code) { var st2 = CW.importCode(code); if (!st2 || !adopt(JSON.stringify(st2))) return false; save(); cloudPush(true); return true; },
    // a menu open: upright the sheet comes up from below and the view goes up; sideways (가로, js/land.js) the drawer comes
    // in from the right and the view goes left, so the fight sits in the middle of what is left of the screen
    setSheet: function (open) {
      sheetOpen = open; var land = CW.isLand && CW.isLand();
      document.documentElement.classList.toggle('sheeton', open);
      sc.setViewShift(open ? (land ? landShift() : 0.22) : 0, land ? 'x' : 'y');
      // a tall sheet upright leaves only a thin strip of the fight: drawn a few times a second (js/framepace.js COVER)
      var sh = $('sheet'); pace.setSheet(open, !land && !!(sh && sh.classList.contains('tall')));
    },
    screenHz: function () { return pace.hz(); },
    // 성능 표시 (설정 › 문제 확인용): on / off, and the record for the settings page
    perfOn: function () { return !!(perf && perf.on()); },
    perfSet: function (v) { perfSwitch(v, true); },
    perfLog: function () { return perf ? perf.log() : null; },
    perfMinutes: function () { return perf ? perf.minutes() : []; },
    perfText: function () { return perf ? perf.text() : ''; },
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
      var tg = pickTargets(sk); if (!tg.length) { ui.toast('몬스터 등장 후 미리보기를 사용할 수 있어요.'); preview = null; return; }
      fx.cast(sk, Math.max(state.tier, sk.tier), tg, function (m, f, p) { if (m.alive) sc.hitMob(m, false, p || 1); }, 1);
      ui.toast(sk.name + ' 스킬 미리보기');
    }
  };
  var ui = CW.createUI(G);
  // monster codex page (js/dex-ui.js) reads the live state; the 더보기 tab shows a dot while something new is unseen
  CW.dexState = function () { return state; };
  if (CW.dexDot) CW.dexDot(CW.dexHasNew(state));

  function applySettings() {
    var s = state.settings;
    snd.setEnabled(s.sound); sc.setPixel(s.pixel);
    if (sc.setLandView) sc.setLandView(s.landView === 'far' ? 'far' : 'side');   // 가로 시점 (sideways only; upright unchanged)
    sc.setDamageStyle((s.dmgSize === undefined ? 60 : s.dmgSize) / 100, (s.dmgAlpha === undefined ? 85 : s.dmgAlpha) / 100);
    var q = s.quality === 'auto' ? autoQ : s.quality; sc.setQuality(q); fx.setQuality(q);
    pace.setCap(s.fpsCap || 60);
  }

  // ---------- quality watchdog ----------
  // Every 3 s: a low average frame rate lowers the quality, and so do repeated stalls (frames that came more than
  // 45 ms after the one before, i.e. two or more frames missed at 60 a second). The average alone stayed high on a
  // phone that stuttered several times a second, so its quality never came down. 5 stalls in 3 s is steady stutter,
  // not a one-off such as a picture loading; a phone held at 30 frames a second (low power) is not counted as stalls.
  // The game may draw fewer frames on purpose (절전, a menu sheet open, no touch for a while: js/framepace.js); the
  // limits are measured against the rate it aims for, so drawing 30 a second on purpose never lowers the quality.
  // safety valve for skill spam (js/fxload.js): fewer small pieces while frames run late, never fewer skills
  var fxLoad = CW.createFxLoad ? CW.createFxLoad() : null;
  // ---------- 성능 표시 (2026-11-17, js/perfmon.js) ----------
  // Only measured on a real phone can show what heat does over 20 minutes. While it is on (설정 › 문제 확인용, kept in
  // localStorage cw-perf; 형꺼 only): a small box over the game with the last second's numbers, and a row every 10 s
  // kept in cw-perflog that the settings page shows and copies. Off, nothing at all is measured.
  var perf = !CW.FRIEND && CW.createPerfMon ? CW.createPerfMon({ store: storage, probe: perfProbe, info: perfInfo }) : null;
  var perfBox = null, perfBoxAt = 0, perfLeft = '', battery = null;
  function perfProbe() {
    var r = sc.renderer, inf = r && r.info, pm = root.performance && performance.memory;
    return {
      q: sc.getQuality(), pr: r ? r.getPixelRatio() : undefined, k: fx.load(),
      dc: inf ? inf.render.calls : undefined, tri: inf ? inf.render.triangles : undefined,
      tex: inf ? inf.memory.textures : undefined, geo: inf ? inf.memory.geometries : undefined,
      b: battery ? Math.round(battery.level * 100) : undefined, ch: battery ? (battery.charging ? 1 : 0) : undefined,   // Galaxy Chrome only
      mem: pm && pm.usedJSHeapSize ? Math.round(pm.usedJSHeapSize / 1048576) : undefined   // Chrome only
    };
  }
  function perfInfo() {
    var ua = navigator.userAgent || '', s = state.settings, cap = s.fpsCap || 60;
    var dev = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : '기타';
    var br = /SamsungBrowser/.test(ua) ? '삼성 인터넷' : /CriOS|Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : '';
    var app = navigator.standalone || (root.matchMedia && matchMedia('(display-mode: standalone)').matches);
    return {
      dev: '기기: ' + dev + (br ? ' ' + br : '') + (app ? ' (홈 화면 앱)' : '') + ' · 화면 ' + screen.width + '×' + screen.height + ' · DPR ' + Math.round((root.devicePixelRatio || 1) * 100) / 100 + (pace.hz() ? ' · ' + pace.hz() + 'Hz' : ''),
      set: '설정: 화면 빈도 ' + (cap >= 60 ? cap : '절전 ' + cap + '장') + ' · 화질 ' + ({ auto: '자동', high: '높음', mid: '보통', low: '낮음' })[s.quality] +
        ' · 안티앨리어싱 ' + (CW.aaOn && CW.aaOn() ? '켜기' : '끄기') + ' · ' + (s.pixel ? '픽셀' : '3D')
    };
  }
  // fresh: turned on from the settings page (a new record); otherwise opened with it on (the same record goes on)
  function perfSwitch(v, fresh) {
    if (!perf) return;
    try { if (v) storage.setItem('cw-perf', '1'); else storage.removeItem('cw-perf'); } catch (e) { /* no storage: on until closed */ }
    // the draw counts are added up over the whole frame (a lens takes two passes) and cleared by hand before each one
    if (sc.renderer) sc.renderer.info.autoReset = !v;
    if (v) {
      perf.start(perfInfo(), fresh);
      if (!battery && navigator.getBattery) navigator.getBattery().then(function (b) { battery = b; }, function () {});
      if (!perfBox) {
        perfBox = document.createElement('div'); perfBox.id = 'perfBox'; perfBox.setAttribute('aria-hidden', 'true');
        // over everything, never in the way of a finger; under the clock / notch and clear of the round corners
        perfBox.style.cssText = 'position:fixed;z-index:9998;left:calc(env(safe-area-inset-left,0px) + 8px);top:calc(env(safe-area-inset-top,0px) + 96px);' +
          'pointer-events:none;-webkit-user-select:none;user-select:none;white-space:pre;contain:content;' +
          'padding:5px 8px;border-radius:8px;background:rgba(10,6,20,.66);color:#fff;font:600 11px/1.4 system-ui,-apple-system,sans-serif;font-variant-numeric:tabular-nums;';
        document.body.appendChild(perfBox);
        root.addEventListener('resize', placePerfBox);
      }
      perfBox.hidden = false; perfBox.textContent = '재는 중…'; placePerfBox();
    } else {
      perf.stop(); if (perfBox) perfBox.hidden = true;
    }
  }
  // just under the top bar (name, stage bar), so the stage bar and the gold stay in sight; that bar sits lower on a
  // phone with a notch, so it is measured, not guessed
  function placePerfBox() {
    if (!perfBox) return;
    var h = $('hud'), b = h ? h.getBoundingClientRect().bottom : 0;
    var top = Math.round(b + 6) + 'px';
    if (b > 0 && perfBox.style.top !== top) perfBox.style.top = top;
    // a phone on its side shows the game in the middle with room on both sides: the box stays on the game
    var a = $('app'), l = a ? a.getBoundingClientRect().left : 0, left = l > 0 ? Math.round(l + 8) + 'px' : 'calc(env(safe-area-inset-left,0px) + 8px)';
    if (left !== perfLeft) { perfLeft = left; perfBox.style.left = left; }
  }
  try { if (perf && storage && storage.getItem('cw-perf') === '1') perfSwitch(true, false); } catch (e) { noteError(e); }
  var autoQ = 'high', fpsAcc = 0, fpsN = 0, fpsT = 0, stalls = 0, fpsAim = 60;
  // 발열 (2026-11-17): a phone that keeps up 60 a second never had its quality lowered, and got hot over a long run.
  // After HOT_AFTER seconds of the fight on screen, a phone at 'high' steps down to 'mid' once (fewer pixels, effects and
  // little ones) until the game is opened again.
  var HOT_AFTER = 600, hotT = 0;
  function watchFps(rdt, aim) {
    if (state.settings.quality !== 'auto') return;
    if (CW.PHONE && autoQ === 'high') { hotT += rdt; if (hotT >= HOT_AFTER) { autoQ = 'mid'; applySettings(); return; } }
    aim = aim || 60;
    if (aim !== fpsAim) { fpsAim = aim; fpsAcc = 0; fpsN = 0; fpsT = 0; stalls = 0; return; }
    fpsAcc += rdt; fpsN++; fpsT += rdt; if (rdt > Math.max(0.045, 1.4 / aim)) stalls++;
    if (fpsT < 3) return;
    var fps = fpsN / fpsAcc, stuck = stalls >= 5, k = aim / 60; fpsAcc = 0; fpsN = 0; fpsT = 0; stalls = 0;
    var next = autoQ;
    if (fps < 28 * k) next = 'low'; else if ((fps < 42 * k || stuck) && autoQ === 'high') next = 'mid'; else if (stuck && autoQ === 'mid') next = 'low';
    if (next !== autoQ) { autoQ = next; applySettings(); }
  }

  // ---------- main loop ----------
  var lookT = 0;
  // potions run on the clock: refresh the numbers when one starts or ends
  var buffKey = '', buffT = 0;
  function tick(dt) {
    clockT += dt;
    buffT -= dt; if (buffT <= 0) { buffT = 1; var bk = CW.buffKey(state); if (bk !== buffKey) { buffKey = bk; refreshStats(); } }
    var mEl = $('modal'), calm = !mEl || mEl.hidden;
    if (begun && calm && state.tierShow && !pendingTier.length) pendingTier.push({ tier: state.tierShow, at: 1.0 });
    for (var i = pendingTier.length - 1; i >= 0; i--) { if (!calm) break; pendingTier[i].at -= dt; if (pendingTier[i].at <= 0) { doTierUp(pendingTier[i].tier); pendingTier.splice(i, 1); } }
    // how many little ones: only in a plain stage fight (not a boss, not a dungeon), fewer on a phone and at lower quality
    if (mins) mins.setWant(dun || boss || state.bossTry ? 0 : CW.minionCap(sc.getQuality(), CW.PHONE), minionPick);
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
  // The fight's 3D picture lost by the phone (2026-11-17, the user: 화면이 멈춰): a phone takes the 3D picture away when its
  // graphics chip is overworked or short of memory, and the fight then stands still while the menus still work. It is
  // kept for settings (cw-gllost, "전투 화면 끊김"); three.js asks for it back, and if it is not back within 3 s the game
  // is saved and opened again (not again within a minute, so a phone that keeps losing it does not keep reloading).
  (function () {
    var cv = sc.renderer && sc.renderer.domElement; if (!cv) return;
    function note(kind) {
      var r = null; try { r = JSON.parse(localStorage.getItem('cw-gllost') || 'null'); } catch (e) {}
      r = r || { n: 0 }; if (kind === 'lost') { r.n++; r.t = Date.now(); r.back = false; } else if (kind === 'back') r.back = true; else r.reload = Date.now();
      try { localStorage.setItem('cw-gllost', JSON.stringify(r)); } catch (e) {}
    }
    var wait = 0;
    cv.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); note('lost'); clearTimeout(wait);
      wait = setTimeout(function () {
        var gl = sc.renderer.getContext(); if (!gl || !gl.isContextLost || !gl.isContextLost()) return;
        var last = 0; try { last = +sessionStorage.getItem('cw-glreload') || 0; } catch (x) {}
        if (Date.now() - last < 60000) return;
        try { sessionStorage.setItem('cw-glreload', String(Date.now())); } catch (x) {}
        note('reload'); try { save(); } catch (x) {}
        root.location.reload();
      }, 3000);
    }, false);
    cv.addEventListener('webglcontextrestored', function () { clearTimeout(wait); note('back'); }, false);
  })();
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
    // fewer frames on purpose (절전 / menu open / no touch for a while / no monster / 방치모드): this refresh is skipped
    if (ready) {
      pace.setQuiet(!dun && !boss && !preview && aliveMobs().length === 0);
      pace.setHidden(document.documentElement.classList.contains('idling'));
      var calmNow = pace.calm(now); if (calmNow !== calmOn) { calmOn = calmNow; document.documentElement.classList.toggle('cw-calm', calmOn); }
    }
    if (!pace.shouldDraw(now)) return;
    var t0 = ready && perf && perf.on() ? performance.now() : 0;   // 성능 표시: the time this frame's own code takes
    var aim = pace.target(now);
    if (aim > 60) aim = Math.max(60, Math.min(aim, pace.hz() || 60));   // 120 chosen on a 60 Hz screen is 60 a second
    var gap = now - last;
    if (ready && gap > Math.max(100, 2500 / aim) && gap < 5000 && !document.hidden) noteHitch(gap);
    var steps = CW.frameSteps(gap / 1000, aim), rdt = 0; last = now;
    for (var si = 0; si < steps.length; si++) rdt += steps[si];
    if (ready) {
      coinBox = null;
      // a longer gap is played in short pieces so effects and movement behave exactly as at 60 a second
      for (si = 0; si < steps.length; si++) {
        var gdt = sc.scaleDt(steps[si]) * FAST;
        try { tick(gdt); } catch (e) { noteError(e); }
        try { fx.update(gdt); } catch (e) { noteError(e); }
        try { sc.update(gdt, steps[si]); } catch (e) { noteError(e); }
      }
      try {
        updateCoins(rdt);
        lookT -= rdt; if (lookT <= 0) { lookT = 0.25; applyLook(); }
        gained.t += rdt; if (gained.t >= 1) { ui.gainLog(gained); gained.gold = gained.xp = gained.gems = gained.dmg = gained.runeDust = gained.sigilDust = gained.runeStone = gained.sigilStone = 0; gained.t = 0; gained.more.length = 0; }
        uiT += rdt; panelT += rdt; saveT += rdt;
        if (uiT > 0.1) { uiT = 0; CW.setGoldScale(CW.capGold(state)); ui.hud(); if (nowSlot !== lastSlot) { lastSlot = nowSlot; ui.slots(); } }
        if (panelT > 0.3) { panelT = 0; ui.renderPanel(); }
        if (saveT > 5) { saveT = 0; save(); }
        watchFps(rdt, aim);
        if (fxLoad) { var lk = CW.fxLoadOff ? 1 : fxLoad.note(rdt, aim); if (lk !== fx.load()) fx.setLoad(lk); }
      } catch (e) { noteError(e); }
    }
    if (t0 && sc.renderer) sc.renderer.info.reset();
    try { sc.render(); } catch (e) { noteError(e); }
    if (t0) {
      try {
        var t1 = performance.now(); perf.frame(gap, t1 - t0, aim);
        // the box's words change twice a second, not every frame (writing the page each frame costs on its own)
        // the top bar grows at times (a boss bar, a small phone), so the box is put under it again each time (read first, then write)
        if (perfBox && t1 - perfBoxAt > 500) { perfBoxAt = t1; placePerfBox(); perfBox.textContent = perf.hudText(); }
      } catch (e) { noteError(e); }
    }
  }

  // ---------- leaving and coming back ----------
  function giveOffline() {
    begun = true;   // (모험 시작 pressed: an owed job celebration may play — state.tierShow)
    var r = CW.offlineReward(state, Date.now());
    if (r.seconds < 60) { ui.showDaily(true); return; }
    state.gold += r.gold; state.gems += r.gems; state.runeDust = (state.runeDust || 0) + (r.runeDust || 0); state.sigilDust = (state.sigilDust || 0) + (r.sigilDust || 0); CW.setGoldScale(CW.capGold(state)); var lv = CW.gainXp(state, r.xp || 0); r.levels = lv.levels; if (lv.levels) refreshStats(); save();
    ui.showOffline(r, function () { ui.showDaily(true); });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (CW.idleOff) CW.idleOff(); CW.onHidden(state); clearField(true); save(); }   // 방치모드 ends when the app is left: the usual 돌아왔어요 comes back
    else { last = performance.now(); syncRegion(); giveOffline(); }
  });
  root.addEventListener('pagehide', save);
  root.addEventListener('resize', function () { sc.size(); });
  ['pointerdown', 'touchend', 'click'].forEach(function (ev) { document.addEventListener(ev, function () { snd.init(); }, { passive: true }); });   // iPhone turns sound on only from some touches
  // any touch counts as playing: the frame rate comes back at once after a quiet while (js/framepace.js)
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (ev) { document.addEventListener(ev, function () { pace.touch(performance.now()); }, { passive: true, capture: true }); });
  if (/[?&]snd\b/.test(location.search)) {   // ?snd: a small box that shows what the sound is doing (to check on a phone)
    var sndBox = document.createElement('div');
    sndBox.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999;background:rgba(0,0,0,.75);color:#fff;font:12px monospace;padding:6px 8px;border-radius:6px;pointer-events:none;white-space:pre';
    document.body.appendChild(sndBox);
    setInterval(function () {
      var s = snd.status();
      sndBox.textContent = '소리 ' + s.state + (s.enabled ? '' : ' (꺼짐)') + '\n받음 ' + s.loaded + '/57 실패 ' + s.failed + '\n재생 ' + s.played + ' 지금 ' + s.playing + (s.err ? '\n' + s.err : '');
    }, 500);
  }

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
    var loaded = CW.load({ getItem: function () { return json; } }); if (!loaded) return false; CW.migrateBag(loaded); if (CW.dexBackfill) CW.dexBackfill(loaded); oneOfEach(loaded);
    state = friendCap(loaded); if (CW.lateTier) CW.lateTier(state, CW.FRIEND);   // 11차 물: a save brought in (the celebration: state.tierShow)
    rot = CW.rotation(state); refreshStats(); pendingTier.length = 0; preview = null;
    clearField(true); region = -1; restT = 0.4;
    if (state.bossTry) { state.bossTry = false; state.stage = Math.max(0, state.stage - 1); state.farming = true; }
    syncRegion(); sc.setTierAura(state.tier); applySettings();
    if (CW.dexDot) CW.dexDot(CW.dexHasNew(state));
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
          if (adopt(d.json)) { cloud.last = d.json; ui.toast('저장한 진행을 불러왔어요.'); giveOffline(); return; }
          state.lastSeen = keepSeen;
        }
        cloudPush(true);
      });
    }).catch(function () { cloud.ref = null; });
  }
  setInterval(function () { if (ready && !document.hidden) cloudPush(false); }, 20000);

  // ---------- Claude에게 저장 보내기 (2026-11-18, js/owner-sync.js): 형꺼 only, once a key is pasted in 설정 ----------
  // every 10 minutes while playing and when the app is put away; a failure only shows on the settings row
  var ownerSync = !CW.FRIEND && CW.createOwnerSync ? CW.createOwnerSync({
    friend: CW.FRIEND, store: storage, fetch: root.fetch ? root.fetch.bind(root) : null,
    body: function () { save(); return JSON.stringify(state); },
    info: function () { return (navigator.userAgent || '').slice(0, 160); }
  }) : null;
  if (ownerSync) {
    setInterval(function () { if (ready && !document.hidden) ownerSync.tick(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (ready && document.hidden) ownerSync.push('hide'); });
  }
  G.ownerSync = ownerSync;
  // ---------- 서버 저장 (2026-11-18, js/player-sync.js): anonymous login; 형꺼 only for now (형: 우선 내꺼만 올려) ----------
  // a first send a few seconds after the game is ready (moves the save already on this phone to the server), then
  // every 10 minutes when it changed and when the app is put away; off on localhost unless ?psync=1.
  // 체험판 gets it later by taking !CW.FRIEND away (the server already takes anyone's anonymous login).
  // 아이디 로그인 (js/login-gate.js): the game opens on the login screen until this browser holds a login with an id
  var loginGate = !CW.FRIEND && CW.startLoginGate ? CW.startLoginGate({
    friend: CW.FRIEND, allowed: CW.playerSyncAllowed(location), store: storage, fetch: root.fetch ? root.fetch.bind(root) : null,
    reload: function () { location.reload(); }, info: function () { return (navigator.userAgent || '').slice(0, 160); }
  }) : null;
  G.loginGate = loginGate;
  var playerSync = CW.createPlayerSync ? CW.createPlayerSync({
    enabled: !CW.FRIEND && CW.playerSyncAllowed(location), store: storage, fetch: root.fetch ? root.fetch.bind(root) : null,
    account: !!loginGate,
    blocked: function () { return !!(loginGate && loginGate.isKicked()); },
    onLost: function () { if (loginGate && CW.openLoginScreen) CW.openLoginScreen(loginGate, { reload: function () { location.reload(); } }); },
    locks: root.navigator && root.navigator.locks,
    // 서버 지갑: a save-sync answer for a wallet account carries the server's fields (diamonds etc.); they win
    onServer: function (server) { if (!G.wallet) return; CW.applyServer(state, server); refreshStats(); save(); ui.hud(); },
    body: function () { save(); return JSON.stringify(state); },
    // sid first: the server tells which device wrote the newest save from it (js/login-gate.js open)
    info: function () { return (loginGate ? 'sid=' + loginGate.sid() + ' ' : '') + (navigator.userAgent || '').slice(0, 140); }
  }) : null;
  if (playerSync) {
    var psStart = setInterval(function () { if (ready) { clearInterval(psStart); setTimeout(function () { playerSync.start(); }, 5000); } }, 1000);
    setInterval(function () { if (ready && !document.hidden) playerSync.tick(); }, 60000);
    // back on screen: renew a login that is about to run out now, so the send made when the app is put away needn't
    document.addEventListener('visibilitychange', function () { if (ready) { if (document.hidden) playerSync.push('hide'); else playerSync.warm(); } });
  }
  G.playerSync = playerSync;
  // ---------- 서버 지갑 1단계 (2026-11-18, js/wallet.js): 형꺼 diamonds belong to the server ----------
  // Diamond actions go to the function act; the answer's random numbers replay the same line of js/wallet-actions.js
  // here, so the save changes as the server's did. Needs the save sync (its login); 체험판 and local previews: off.
  var wallet = !CW.FRIEND && CW.createWallet && playerSync ? CW.createWallet({ enabled: true, sync: playerSync, fetch: root.fetch ? root.fetch.bind(root) : null, store: storage, rules: CW.WALLET_RULES }) : null;
  G.wallet = wallet;
  // the game's own refusals (the screen says why, e.g. 다이아가 부족해요); anything else is a line or server problem (최종 검토)
  var WFAIL = { walletFail: true }, wBusy = false, ANSWERS = { gems: 1, nope: 1, used: 1, full: 1, ticket: 1, time: 1, slow: 1 };
  function wToast(code) {
    ui.toast(code === 'rules' ? '게임이 새로 나왔어요. 새로 고쳐 주세요.' : code === 'member' ? '이 기기는 아직 서버 지갑을 쓸 수 없어요.' : code === 'wait' ? '잠시만요, 앞의 요청을 처리하고 있어요.' : '인터넷 연결이 필요해요.');
  }
  // the phone runs the same line with the server's numbers. If the phone's own part of the save moved on meanwhile (a boss
  // drop filled the rune bag…) and the line goes another way, the screen must not stop: the server's fields are taken,
  // the result is shown as nothing, and it is noted (최종 검토)
  function replayAct(action, args, reply) {
    try {
      return CW.applyReply(state, reply, function (s, rng, env) { var p = CW.performAction(s, action, args, Object.assign({}, env, { rng: rng })); return p.ok ? p.result : null; });
    } catch (e) {
      if (reply && reply.server) CW.applyServer(state, reply.server);
      noteError(new Error('wallet replay ' + action + ': ' + (e && e.message)));
      return null;
    }
  }
  function walletResume() {
    if (!wallet) return Promise.resolve();
    return wallet.resume(JSON.stringify(state)).then(function (x) { if (x) { replayAct(x.action, x.args, x.reply); refreshStats(); save(); ui.hud(); if (x.reply && x.reply.ok) ui.toast('인터넷이 끊겼을 때 누른 요청을 마저 처리했어요.'); } });
  }
  function walletFlush() {
    if (!wallet) return Promise.resolve();
    save();
    return wallet.flushDungeon(JSON.stringify(state)).then(function (list) {
      list.forEach(function (x) { if (x.reply.ok) replayAct('dungeonClaim', x.args, x.reply); else CW.applyReply(state, x.reply, null); });
      if (list.length) { refreshStats(); save(); ui.hud(); }
    });
  }
  // one diamond action through the server: resolves to what the action gives (as the old wrapper returned it), null when
  // the server says no (not enough diamonds…), or WFAIL when it could not be asked (no line…; a note was shown already)
  function walletDo(action, args, done) {
    if (wBusy) { wToast('wait'); return Promise.resolve(WFAIL); }
    wBusy = true; save();
    return wallet.act(action, args, JSON.stringify(state)).then(function (reply) {
      if (reply.code !== 'pending') return reply;
      return walletResume().then(function () { return wallet.act(action, args, JSON.stringify(state)); });
    }).then(function (reply) {
      wBusy = false;
      if (!reply.ok && reply.code === 'member') { wallet = null; G.wallet = null; ui.toast('이 기기는 서버 지갑 없이 계속해요. 한 번 더 눌러 주세요.'); return WFAIL; }
      if (!reply.ok && !ANSWERS[reply.code]) { wToast(reply.code); return WFAIL; }
      var out = reply.ok ? replayAct(action, args, reply) : (CW.applyReply(state, reply, null), null);
      refreshStats(); save(); ui.hud();
      if (reply.ok && done) done(out);
      return reply.ok ? out : null;
    }, function () { wBusy = false; wToast('net'); return WFAIL; });
  }
  // the screens: run fn with the answer once it is there (a wallet answer comes later; the old way answers at once)
  G.later = function (r, fn) { return Promise.resolve(r).then(function (x) { if (x && x.walletFail) return; fn(x); }); };
  // 쿠폰 (2026-11-18): only with the wallet
  G.coupon = function (code) { return wallet ? walletDo('coupon', { code: code }, function () { snd.play('win'); }) : Promise.resolve(WFAIL); };
  if (wallet) { var wStart = setInterval(function () { if (ready) { clearInterval(wStart); setTimeout(function () { walletResume().then(walletFlush); }, 6000); } }, 1000); }
  // 저장 되돌리기 (설정 › 문제 확인용, 형꺼 only): the save kept on the server takes this phone's place
  G.restoreSave = function (obj) {
    if (CW.FRIEND || !obj || typeof obj !== 'object') return false;
    if (!adopt(JSON.stringify(obj))) return false;
    save(); cloudPush(true); return true;
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden) cloudPush(false); });

  // ---------- start ----------
  $('banner').textContent = '게임을 불러오고 있어요…'; $('banner').classList.add('on');
  applySettings();
  CW.loadArt(CW.ART_IDS.concat(regionArt(CW.stageInfo(state.stage).region))).then(function (a) {
    for (var k in a) art[k] = a[k];
    if (art.hero) { sc.setHero(art.hero); applyLook(true); }
    sc.setTierAura(state.tier);
    if (state.bossTry) { state.bossTry = false; state.stage = Math.max(0, state.stage - 1); state.farming = true; }
    syncRegion();
    $('banner').classList.remove('on');
    ready = true; CW.setGoldScale(CW.capGold(state)); ui.hud(); ui.slots(); ui.renderPanel(true);
    if (CW.mailStart) CW.mailStart();   // 우편함: read mail.json now and every few minutes (js/mail-ui.js)
    if (CW.noticeStart) CW.noticeStart();   // 공지: notice.json the same way (js/notice-ui.js)
    // the 돌아왔어요 popup waits for 모험 시작 on the update screen (js/update-screen.js)
    (CW.afterStart || function (f) { f(); })(giveOffline);
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
