const CACHE_NAME = "casinha-v0-8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Casinha offline</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #f7efff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 20% 10%, rgba(244,123,202,.25), transparent 35%),
        linear-gradient(135deg, #171425, #302b3d);
    }

    main {
      max-width: 520px;
      padding: 24px;
      border: 1px solid rgba(255,255,255,.13);
      border-radius: 28px;
      background: rgba(31,26,47,.94);
      box-shadow: 0 24px 70px rgba(0,0,0,.35);
      text-align: center;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 2.4rem;
      letter-spacing: -.07em;
    }

    p {
      margin: 0;
      color: rgba(247,239,255,.7);
      font-weight: 800;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <main>
    <h1>🏠 Casinha</h1>
    <p>Você está offline. Abra de novo quando a internet voltar para sincronizar a Base.</p>
  </main>
</body>
</html>
`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put("./index.html", copy);
          });

          return response;
        })
        .catch(async () => {
          const cached = await caches.match("./index.html");
          if (cached) return cached;

          return new Response(OFFLINE_HTML, {
            headers: {
              "Content-Type": "text/html; charset=UTF-8"
            }
          });
        })
    );

    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();

              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, copy);
              });
            }

            return response;
          })
          .catch(() => cached);

        return cached || network;
      })
    );
  }
});
