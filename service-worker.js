/* v2.5 PWA: kabuk onbellegi. Harita karolari/API (cross-origin) onbelleklenmez. Yollar goreli (Capacitor/alan adi tasimasina uygun). */
const CACHE = "sd-shell-v25";
const SHELL = ["./", "./index.html", "./manifest.json", "./v2/css/style.css", "./v2/js/data.js", "./v2/js/articles.js", "./v2/js/i18n.js", "./v2/js/i18n2.js", "./v2/js/i18n3.js", "./v2/js/places_i18n.js", "./v2/js/local.js", "./v2/js/app.js", "./v2/img/logo-96.png", "./v2/img/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).then(x => { const cp = x.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return x; }).catch(() => caches.match(r).then(m => m || caches.match("./index.html")))); return; }
  e.respondWith(caches.match(r).then(m => { const net = fetch(r).then(x => { if (x.ok) { const cp = x.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return x; }).catch(() => m); return m || net; }));
});
