/* PRG Scanner - service worker: scanner se otevre i bez signalu.
   Stranka scanneru: nejdriv sit (aby se dostaly aktualizace), pri vypadku ulozena kopie.
   Knihovny z CDN: ulozena kopie, na pozadi se obnovi. Volani Supabase se nikdy neukladaji. */
var CACHE = 'prg-scanner-v2';
var PAGE = 'prg_scanner_v5.html';
var CORE = [PAGE, 'prg_scanner.webmanifest', 'prg_icon_192.png', 'prg_icon_512.png'];
var CDN = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/@zxing/browser@0.2.1/umd/zxing-browser.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.concat(CDN).map(function (u) {
      return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('prg-scanner-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function isPage(url) { return url.origin === self.location.origin && url.pathname.slice(-PAGE.length) === PAGE; }
function isCore(url) { return url.origin === self.location.origin && CORE.some(function (p) { return url.pathname.slice(-p.length) === p; }); }
function isCdn(u) { return CDN.some(function (c) { return u.indexOf(c) === 0; }); }
function timeout(ms, p) { return new Promise(function (res, rej) { var t = setTimeout(function () { rej(new Error('timeout')); }, ms); p.then(function (v) { clearTimeout(t); res(v); }, function (er) { clearTimeout(t); rej(er); }); }); }
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (isPage(url)) {
    // vždy ověřit novou verzi na serveru (ne z mezipaměti prohlížeče)
    e.respondWith(timeout(8000, fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }))).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(PAGE, copy); }); }
      return res;
    }).catch(function () {
      return caches.open(CACHE).then(function (c) { return c.match(PAGE); }).then(function (m) { return m || new Response('Scanner zatím není uložen v zařízení. Otevři ho jednou se signálem.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); });
    }));
    return;
  }
  if (isCdn(req.url) || isCore(url)) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req.url).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req.url, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  }
});
