/* 口算能量訓練器 — Service Worker（v2）
   作用：第一次有網路時把 App 存進裝置，之後沒網路也能玩。
   策略：有網路時優先抓最新版（所以你更新後一打開就是新版），
        沒網路時才用先前存好的版本。
   改版時把 CACHE 版本號（v2→v3…）加一即可。 */
const CACHE = 'mpt-v2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png', './icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const isPage = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    // 網頁本身：先抓網路（拿最新版），失敗才用快取（離線可開）
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
  } else {
    // 圖示等資源：先用快取（快），順便在背景更新
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return resp;
      }))
    );
  }
});
