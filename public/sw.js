// Service worker da Fazenda Santo Antônio.
// - Páginas: rede primeiro; sem conexão, usa a última cópia da página (ou do painel).
// - Arquivos do app (js, css, fontes, ícones): cache primeiro (nomes com hash).
// - Dados do Supabase NUNCA são guardados aqui (outro domínio, sempre rede).
const VERSION = "v4";
const PAGES = `fsa-pages-${VERSION}`;
const ASSETS = `fsa-assets-${VERSION}`;
const PRECACHE = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/santo-antonio-agro.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(ASSETS).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") cache.put(request, response.clone());
    return response;
  } catch {
    const cached = (await cache.match(request, { ignoreSearch: true })) || (await cache.match("/painel")) || (await cache.match("/"));
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Sem conexão</title><body style='font-family:sans-serif;padding:2rem;background:#102c20;color:#fff'><h1>Sem conexão</h1><p>Abra o aplicativo uma vez com internet para que ele funcione sem conexão neste aparelho.</p></body>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const fonts = url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com";
  if (url.origin !== self.location.origin && !fonts) return;
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/rest/") || url.pathname.startsWith("/functions/") || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") { event.respondWith(networkFirstPage(request)); return; }
  if (fonts || url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/assets/") || /\.(?:css|js|mjs|svg|png|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

// Toque no aviso de manejos: abre (ou foca) a agenda.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/agenda", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
