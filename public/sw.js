/*
 * Service worker de Math Got Motion (sin dependencias).
 * - /assets/* (nombres con hash, inmutables): cache-first. Cada fórmula visitada
 *   queda guardada, así que se puede releer sin conexión.
 * - Navegaciones: network-first; sin red, la copia guardada o el shell de la app.
 * - Todo lo demás del mismo origen: stale-while-revalidate.
 */
const VERSION = "v1";
const SHELL_CACHE = `mgm-shell-${VERSION}`;
const ASSET_CACHE = `mgm-assets-${VERSION}`;
const SCOPE = self.registration.scope;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}favicon.svg`]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("mgm-") && key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function put(cacheName, request, response) {
  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => put(SHELL_CACHE, request, response))
        .catch(async () => (await caches.match(request)) ?? (await caches.match(SCOPE))),
    );
    return;
  }

  if (url.pathname.includes("/assets/")) {
    event.respondWith(
      caches
        .match(request)
        .then((hit) => hit ?? fetch(request).then((response) => put(ASSET_CACHE, request, response))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request).then((response) => put(SHELL_CACHE, request, response));
      return hit ?? network;
    }),
  );
});
