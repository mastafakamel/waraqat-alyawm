// sw.js — الـ Service Worker بتاع ورقة اليوم. بيخزّن ملفات التطبيق على الموبايل،
// فالتطبيق بيفتح ويشتغل وإنت على وضع الطيران.
//
// كل ما ملف يتغيّر: شغّل  node tools/stamp-sw.mjs  قبل الـ commit.
// السكربت بيكتب قايمة الملفات ورقم نسخة جديد تحت، والموبايل بيلاحظ إن sw.js اتغيّر فبيحمّل النسخة الجديدة.
// (و node --test بيفشل لو نسيت.)

// <stamp>
const VERSION = 'e2a30ececc';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'css/fonts.css',
  'fonts/noto-kufi-arabic-arabic.woff2',
  'fonts/noto-kufi-arabic-latin.woff2',
  'fonts/rubik-arabic.woff2',
  'fonts/rubik-latin.woff2',
  'js/db.js',
  'js/logic.js',
  'js/main.js',
  'js/store.js',
  'js/ui.js',
  'js/views/dock.js',
  'js/views/ideas.js',
  'js/views/metrics.js',
  'js/views/money.js',
  'js/views/sheets.js',
  'js/views/tasks.js',
  'js/views/today.js',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];
// </stamp>

const CACHE = `waraqa-${VERSION}`;
const ROOT = new URL('./', self.location).pathname; // مثلاً /waraqat-alyawm/ على GitHub Pages

// التثبيت: نحمّل كل الملفات من النت (من غير الـ cache بتاع المتصفح) ونخزّنها مرة واحدة
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

// التشغيل: نمسح النسخ القديمة، ونمسك الصفحات المفتوحة على طول
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('waraqa-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // أي حاجة برّه التطبيق (المزامنة مثلاً) بتروح للنت على طول

  // فتح التطبيق نفسه (حتى لو فيه ?theme=dark): الصفحة المتخزنة
  if (req.mode === 'navigate' && (url.pathname === ROOT || url.pathname === `${ROOT}index.html`)) {
    e.respondWith(caches.match(`${ROOT}index.html`).then((r) => r || fetch(req)));
    return;
  }
  // باقي الملفات: من المتخزن، ولو مش موجود من النت
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
});
