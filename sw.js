// sw.js — الـ Service Worker بتاع ورقة اليوم. بيخزّن ملفات التطبيق على الموبايل،
// فالتطبيق بيفتح ويشتغل وإنت على وضع الطيران.
//
// كل ما ملف يتغيّر: شغّل  node tools/stamp-sw.mjs  قبل الـ commit.
// السكربت بيكتب قايمة الملفات ورقم نسخة جديد تحت، والموبايل بيلاحظ إن sw.js اتغيّر فبيحمّل النسخة الجديدة.
// (و node --test بيفشل لو نسيت.)

// <stamp>
const VERSION = '3a0bc7a673';
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
  'js/ai.js',
  'js/backup.js',
  'js/config.js',
  'js/db.js',
  'js/logic.js',
  'js/main.js',
  'js/notify.js',
  'js/store.js',
  'js/sync.js',
  'js/ui.js',
  'js/views/ai.js',
  'js/views/dock.js',
  'js/views/goals.js',
  'js/views/ideas.js',
  'js/views/metrics.js',
  'js/views/money.js',
  'js/views/month.js',
  'js/views/settings.js',
  'js/views/sheets.js',
  'js/views/tasks.js',
  'js/views/time.js',
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

// ---------- التنبيهات التفاعلية و Web Push ----------
const DB_NAME = 'waraqa';
const STORE = 'docs';
const AR_DIG = '٠١٢٣٤٥٦٧٨٩';
const toAr = (n) => String(n).replace(/\d/g, (d) => AR_DIG[d]);

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(id) {
  return openIdb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const r = t.objectStore(STORE).get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  }));
}

function idbPut(doc) {
  return openIdb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put(doc);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

function dayKeyNow(dayStart = 4) {
  const d = new Date();
  if (d.getHours() < dayStart) d.setDate(d.getDate() - 1);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function openTodayTasks(items, today) {
  const byPri = (a, b) => (b.pri ? 1 : 0) - (a.pri ? 1 : 0) || (a.at || 0) - (b.at || 0);
  return (items || []).filter((t) => !t.done && t.due && t.due <= today).sort(byPri);
}

async function setBadgeSafe(count, badgeOn = true) {
  try {
    if (!self.navigator?.setAppBadge) return;
    if (!badgeOn || !count) await self.navigator.clearAppBadge();
    else await self.navigator.setAppBadge(count);
  } catch { /* مش مدعوم */ }
}

async function notifyClients(msg) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of list) c.postMessage(msg);
}

async function bgPushDocs(docs) {
  try {
    const supa = (await idbGet('local/supa'))?.data;
    let sess = (await idbGet('local/session'))?.data;
    if (!supa?.url || !supa?.key || !sess?.access_token) return;
    if (Date.now() > (sess.expires_at || 0) - 60_000 && sess.refresh_token) {
      const r = await fetch(`${supa.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: supa.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: sess.refresh_token }),
      });
      if (!r.ok) return;
      const j = await r.json();
      sess = {
        access_token: j.access_token,
        refresh_token: j.refresh_token,
        expires_at: Date.now() + (j.expires_in || 3600) * 1000,
        email: j.user?.email || sess.email,
      };
      await idbPut({ id: 'local/session', data: sess, updatedAt: Date.now(), dirty: 0 });
    }
    const res = await fetch(`${supa.url}/rest/v1/rpc/put_docs`, {
      method: 'POST',
      headers: {
        apikey: supa.key,
        Authorization: `Bearer ${sess.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_docs: docs.map((d) => ({ id: d.id, data: d.data, updated_at: d.updatedAt })) }),
    });
    if (!res.ok) return;
    for (const d of docs) {
      const cur = await idbGet(d.id);
      if (cur && cur.updatedAt === d.updatedAt) await idbPut({ ...cur, dirty: 0 });
    }
  } catch { /* محفوظة في IndexedDB وهتترفع أول ما التطبيق يفتح */ }
}

async function showTodayTasksNotif(items, today, { badgeOn = true, silent = true } = {}) {
  const open = openTodayTasks(items, today);
  await setBadgeSafe(open.length, badgeOn);
  if (!open.length) return false;
  const shown = open.slice(0, 5);
  const lines = shown.map((t) => `${t.pri ? '⚑' : '•'} ${t.t}`);
  if (open.length > shown.length) lines.push(`+${toAr(open.length - shown.length)} مهام تانية`);
  await self.registration.showNotification(`مهام النهارده (${toAr(open.length)})`, {
    body: lines.join('\n'),
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    tag: 'today-tasks',
    renotify: !silent,
    silent,
    requireInteraction: true,
    actions: [
      { action: 'done-task', title: '✓ خلّصت أول مهمة' },
      { action: 'open-tasks', title: 'افتح المهام' },
    ],
    data: { kind: 'tasks', firstId: open[0].id, url: './?open=tasks' },
  });
  return true;
}

async function completeTaskFromNotif(firstId) {
  const setDoc = await idbGet('list/settings');
  const dayStart = [3, 4, 5].includes(+setDoc?.data?.dayStart) ? +setDoc.data.dayStart : 4;
  const badgeOn = setDoc?.data?.notify?.badge !== false;
  const today = dayKeyNow(dayStart);
  const doc = await idbGet('list/tasks');
  const items = Array.isArray(doc?.data?.items) ? doc.data.items.slice() : [];
  let target = firstId ? items.find((t) => String(t.id) === String(firstId) && !t.done) : null;
  if (!target) target = openTodayTasks(items, today)[0] || null;
  if (!target) {
    await setBadgeSafe(0, badgeOn);
    return;
  }
  target.done = true;
  target.dAt = Date.now();
  const nextDoc = { id: 'list/tasks', data: { items }, updatedAt: Date.now(), dirty: 1 };
  await idbPut(nextDoc);
  const hasMore = await showTodayTasksNotif(items, today, { badgeOn, silent: true });
  if (!hasMore) {
    await self.registration.showNotification('عاش! خلّصت كل مهام النهارده ✓', {
      body: `اتشطبت «${target.t}» — يومك فاضي من المهام دلوقتي.`,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: 'today-tasks-done',
      silent: true,
      data: { url: './?open=tasks' },
    });
  }
  await notifyClients({ type: 'waraqa-updated', id: 'list/tasks' });
  await bgPushDocs([nextDoc]);
}

async function completeHabitFromNotif(k, todayArg) {
  if (!k) return;
  const setDoc = await idbGet('list/settings');
  const dayStart = [3, 4, 5].includes(+setDoc?.data?.dayStart) ? +setDoc.data.dayStart : 4;
  const today = todayArg || dayKeyNow(dayStart);
  const id = `day/${today}`;
  const doc = await idbGet(id);
  const data = { ...(doc?.data || {}), [k]: 2 };
  const nextDoc = { id, data, updatedAt: Date.now(), dirty: 1 };
  await idbPut(nextDoc);
  await notifyClients({ type: 'waraqa-updated', id });
  await bgPushDocs([nextDoc]);
}

async function openApp(relUrl = './') {
  const full = new URL(relUrl, self.registration.scope).href;
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of list) {
    if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
      await c.focus();
      c.postMessage({ type: 'waraqa-nav', url: full });
      return;
    }
  }
  if (self.clients.openWindow) await self.clients.openWindow(full);
}

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let p = {};
    try { p = e.data ? e.data.json() : {}; } catch { p = { body: e.data?.text?.() || '' }; }
    if (typeof p.badgeCount === 'number') {
      const setDoc = await idbGet('list/settings');
      await setBadgeSafe(p.badgeCount, setDoc?.data?.notify?.badge !== false);
    }
    await self.registration.showNotification(p.title || 'ورقة اليوم', {
      body: p.body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: p.tag || 'waraqa-push',
      renotify: p.kind !== 'tasks',
      silent: !!p.silent,
      requireInteraction: p.kind === 'tasks' || p.kind === 'habit',
      actions: Array.isArray(p.actions) ? p.actions : [],
      data: p,
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  e.waitUntil((async () => {
    if (e.action === 'done-task') return completeTaskFromNotif(d.firstId);
    if (e.action === 'done-habit') return completeHabitFromNotif(d.k, d.today);
    if (e.action === 'open-tasks') return openApp('./?open=tasks');
    if (e.action === 'open-newtask') return openApp('./?open=newtask');
    return openApp(d.url || './');
  })());
});
