/* XLV Service Worker */
const CACHE_NAME = 'xlv-cache-v1';
const APP_ROOT   = '/XLV/';

/* キャッシュするアプリシェル */
const PRECACHE_URLS = [
  APP_ROOT,
  APP_ROOT + 'index.html',
  APP_ROOT + 'manifest.webmanifest'
];

/* インストール: アプリシェルを事前キャッシュ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* アクティブ化: 古いキャッシュを削除 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('xlv-cache-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* フェッチ戦略 */
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  /* twimg.com などの外部メディアはキャッシュしない（CORS/サイズ問題）*/
  if (!url.pathname.startsWith(APP_ROOT)) return;

  /* ナビゲーション: ネット優先 → 失敗時はキャッシュ済みシェルを返す */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(APP_ROOT + 'index.html'))
    );
    return;
  }

  /* その他: キャッシュ優先 → なければネットから取得してキャッシュ */
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      });
    })
  );
});
