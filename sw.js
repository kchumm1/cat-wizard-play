// 별빛 냥법사 offline cache — version changes whenever any game file changes
const VERSION = '910af9aa5a';
const CACHE = 'cw-' + VERSION, EXTRA = 'cw-cdn';
const LOCAL = ["./","index.html","manifest.webmanifest","js/num.js","js/data.js","js/economy.js","js/level.js","js/look.js","js/progress.js","js/skills.js","js/gear.js","js/gacha.js","js/relics.js","js/costume.js","js/divine.js","js/training.js","js/dungeon.js","js/runes.js","js/sigil.js","js/alchemy.js","js/packs.js","js/state.js","js/rig.js","js/art.js","js/world.js","js/scene.js","js/vfx.js","js/fx.js","js/sound.js","js/icons.js","js/icons-more.js","js/ui.js","js/main.js","art/B2.webp","art/B4.webp","art/B7.webp","art/cos1.webp","art/cos10.webp","art/cos2.webp","art/cos3.webp","art/cos4.webp","art/cos5.webp","art/cos6.webp","art/cos7.webp","art/cos8.webp","art/cos9.webp","art/g-belt.webp","art/g-ear.webp","art/g-hat.webp","art/g-necklace.webp","art/g-ring.webp","art/g-robe.webp","art/g-staff.webp","art/hero-cheese.webp","art/hero.webp","art/K1.webp","art/M1.webp","art/M10.webp","art/M11.webp","art/M13.webp","art/M15.webp","art/M16.webp","art/M17.webp","art/M19.webp","art/M2.webp","art/M20.webp","art/M3.webp","art/M5.webp","art/M7.webp","art/M9.webp","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
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
