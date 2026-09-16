const CACHE_NAME = "bambanani-shell-v1";
const SHELL_ASSETS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigations/data, falling back to cache only for shell assets.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});

// Web Push: server sends { title, body, url } as JSON payload.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Bambanani", body: event.data.text() };
  }
  const title = payload.title || "Bambanani";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/home" },
    requireInteraction: payload.urgent === true,
    // Notification actions aren't supported on iOS Safari, tapping the
    // notification body itself still opens the app there. This is a
    // progressive enhancement for Android/Chrome, not the only way in.
    actions: payload.urgent === true ? [{ action: "call112", title: "Call 112" }] : undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "call112") {
    event.waitUntil(self.clients.openWindow("tel:112"));
    return;
  }

  const targetUrl = event.notification.data?.url || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
