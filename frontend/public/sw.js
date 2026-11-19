// PWA HydroAlert v5: cache apenas do proprio site.
// Nao interceptar tiles de terceiros (OpenFreeMap, OpenStreetMap, Esri)
// nem dados dinamicos das APIs; evita imagens de mapa antigas em cache.
const CACHE = 'hydroalert-v5-cartografia'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves
        .filter((chave) => chave.startsWith('hydroalert-') && chave !== CACHE)
        .map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const requisicao = event.request
  if (requisicao.method !== 'GET') return

  const url = new URL(requisicao.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') return
  if (url.pathname.endsWith('/sw.js')) return

  event.respondWith(
    fetch(requisicao).then((resposta) => {
      if (resposta.ok && resposta.type === 'basic') {
        const copia = resposta.clone()
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(requisicao, copia)))
      }
      return resposta
    }).catch(() => caches.match(requisicao))
  )
})
