/* Service worker for Data Skills Studio (only used when the app is served over http/https,
   for example GitHub Pages; it never runs from file://).

   Update strategy: network first, cache as the fallback.
   - Online, every same-origin request goes to the network (bypassing the HTTP cache), and the
     fresh copy replaces the cached one. So a new deploy shows up on the next load: nothing is
     stale-forever, even if someone forgets to bump VERSION.
   - Offline (or if the network takes more than a few seconds), the cached copy is served, so the
     whole app, lessons included, works with no signal once it has been opened once.
   - VERSION is a hash of the app files, stamped by tools/build_tracker.py. A new value installs a
     fresh cache and deletes the old ones on activate.
   Requests to other sites (GitHub's API for gist sync, YouTube) are left alone. */
const VERSION = "3773c0c685f2";
const CACHE = "dss-" + VERSION;
const SHELL = [
  "./", "index.html", "app/app.css", "app/markdown.js", "app/course-data.js", "app/app.js",
  "manifest.webmanifest", "app/icons/icon-192.png", "app/icons/icon-512.png",
  "app/icons/icon-maskable-512.png", "app/icons/apple-touch-icon.png", "app/icons/favicon-32.png",
];
const TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => fetch(u, { cache: "reload" }).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dss-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
    fetch(request, { cache: "no-cache" }).then((r) => { clearTimeout(timer); resolve(r); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/downloads/") || url.pathname.includes("/data/")) return; // course files: straight from the network, never cached
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fromNetwork(req);
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (e) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") {
        const shell = (await cache.match("index.html")) || (await cache.match("./"));
        if (shell) return shell;
      }
      return new Response("Offline and not cached yet.", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
