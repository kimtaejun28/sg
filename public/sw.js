const CACHE_NAME = 'bt-cache-v2'
const APP_SHELL = ['./', './index.html', './manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

// 페이지(HTML)는 새 배포를 바로 받아야 하므로 네트워크를 먼저 쓰고,
// 끊겼을 때만 캐시로 떨어진다.
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
      }
      return response
    })
    .catch(() =>
      caches.match(request).then((cached) => cached || caches.match('./index.html'))
    )
}

// 자산 파일명에는 빌드 해시가 붙어 내용이 바뀌면 이름도 바뀐다.
// 그래서 캐시를 먼저 내어주고 뒤에서 갱신해도 오래된 내용이 남지 않는다.
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    const network = fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
        }
        return response
      })
      .catch(() => cached)
    return cached || network
  })
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const isPage = request.mode === 'navigate' || request.destination === 'document'
  event.respondWith(isPage ? networkFirst(request) : cacheFirst(request))
})
