// Python Atlas service worker: makes the site installable as an app and usable offline.
// Pages: network first (always fresh when online), falling back to the saved copy.
// Site files and Python itself: saved after the first use, so lessons open and run offline.
const VERSION = "055c40ee42";
const SITE = "atlas-site-" + VERSION;
const PYTHON = "atlas-python-v1";
const CORE = ["./", "index.html", "map.html", "review.html", "playground.html", "offline.html",
  "assets/css/site.css?v=" + VERSION, "assets/config.js?v=" + VERSION,
  "assets/data/course.json", "assets/data/search.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SITE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("atlas-site-") && k !== SITE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req) {
  const cache = await caches.open(SITE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || (await cache.match("offline.html"));
  }
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;           // accounts and the tutor: always live
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/pyodide/")) { e.respondWith(cacheFirst(req, PYTHON)); return; }
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) { e.respondWith(networkFirst(req)); return; }
  if (url.pathname.endsWith(".json") && url.pathname.includes("/data/")) { e.respondWith(networkFirst(req)); return; }
  if (url.pathname.endsWith(".webmanifest") || url.pathname.includes("/img/app-") || url.pathname.includes("/img/apple-touch")) { e.respondWith(networkFirst(req)); return; }
  e.respondWith(cacheFirst(req, SITE));
});
