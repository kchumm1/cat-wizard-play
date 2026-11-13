// 별빛 냥법사 offline cache — version changes whenever any game file changes
const VERSION = '6681450ce4';
const CACHE = 'cw-' + VERSION, EXTRA = 'cw-cdn';
const LOCAL = ["./","index.html","manifest.webmanifest","js/num.js","js/data.js","js/economy.js","js/level.js","js/look.js","js/progress.js","js/skills.js","js/gear.js","js/gacha.js","js/relics.js","js/costume.js","js/divine.js","js/training.js","js/dungeon.js","js/runes.js","js/sigil.js","js/alchemy.js","js/packs.js","js/state.js","js/rig.js","js/art.js","js/world.js","js/scene.js","js/vfx.js","js/fx.js","js/fx-more.js","js/sound.js","js/icons.js","js/icons-more.js","js/icons-skills.js","js/art-icons.js","js/ui.js","js/main.js","art/B2.webp","art/B4.webp","art/B7.webp","art/cos1.webp","art/cos10.webp","art/cos2.webp","art/cos3.webp","art/cos4.webp","art/cos5.webp","art/cos6.webp","art/cos7.webp","art/cos8.webp","art/cos9.webp","art/fx-blackHole.webp","art/fx-chainLightning.webp","art/fx-elementNova.webp","art/fx-fireball-ball.webp","art/fx-fireball-blast.webp","art/fx-fireball.webp","art/fx-furBomb.webp","art/fx-iceStorm-shard.webp","art/fx-iceStorm.webp","art/fx-magicClaw.webp","art/fx-meteorRain-ripple.webp","art/fx-meteorRain-rock.webp","art/fx-meteorRain.webp","art/fx-moonLaser.webp","art/fx-solarBurst.webp","art/fx-sparkRing.webp","art/fx-starShot-burst.webp","art/fx-starShot-star.webp","art/fx-starShot.webp","art/g-belt.webp","art/g-ear.webp","art/g-hat.webp","art/g-necklace.webp","art/g-ring.webp","art/g-robe.webp","art/g-staff.webp","art/hero-cheese.webp","art/hero.webp","art/K1.webp","art/M1.webp","art/M10.webp","art/M11.webp","art/M13.webp","art/M15.webp","art/M16.webp","art/M17.webp","art/M19.webp","art/M2.webp","art/M20.webp","art/M3.webp","art/M5.webp","art/M7.webp","art/M9.webp","art/sk-blackHole.webp","art/sk-chainLightning.webp","art/sk-elementNova.webp","art/sk-fireball.webp","art/sk-furBomb.webp","art/sk-iceStorm.webp","art/sk-magicClaw.webp","art/sk-meteorRain.webp","art/sk-moonLaser.webp","art/sk-solarBurst.webp","art/sk-sparkRing.webp","art/sk-starShot.webp","art/ui-cauldron.webp","art/ui-circle.webp","art/ui-dungeon-gem.webp","art/ui-dungeon-gold.webp","art/ui-dungeon-mana.webp","art/ui-dungeon-rune.webp","art/ui-gacha.webp","art/ui-lock.webp","art/ui-map.webp","art/ui-mark-mClaw.webp","art/ui-mark-mComet.webp","art/ui-mark-mCrown.webp","art/ui-mark-mMoon.webp","art/ui-mark-mStar.webp","art/ui-potion-luck.webp","art/ui-potion-rage.webp","art/ui-potion-wisdom.webp","art/ui-rune-leaf.webp","art/ui-rune-rDark.webp","art/ui-rune-rEarth.webp","art/ui-rune-rFire.webp","art/ui-rune-rLight.webp","art/ui-rune-rWave.webp","art/ui-rune-rWind.webp","art/ui-tab-battle.webp","art/ui-tab-dungeon.webp","art/ui-tab-gacha.webp","art/ui-tab-gear.webp","art/ui-tab-more.webp","art/ui-tab-skill.webp","art/ui-tab-up.webp","art/ui-talent-room.webp","art/ui-talent-tBoss.webp","art/ui-talent-tCrit.webp","art/ui-talent-tSkill.webp","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
const THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(LOCAL.map((u) => new Request(u, { cache: 'no-cache' }))))
    .then(() => caches.open(EXTRA)).then((c) => c.match(THREE).then((hit) => hit || fetch(new Request(THREE, { mode: 'no-cors' })).then((r) => c.put(THREE, r))).catch(() => {}))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('cw-') && k !== CACHE && k !== EXTRA).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
  } else if (/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open(EXTRA).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
