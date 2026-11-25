// اختبار نظام التنبيهات والتفاعل: منطق الإشعارات + تشفير RFC 8291 (aes128gcm) + توقيع VAPID (ES256) + دالة notify.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSettings, buildTasksNotification, timeWindowMatch, dueReminders,
} from '../js/logic.js';

// إعداد Deno مزيّف لاختبار supabase/functions/notify/index.ts جوه Node 24
const env = {
  SUPABASE_URL: 'https://fake.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'srv-secret',
  VAPID_PUBLIC_KEY: '',
  VAPID_PRIVATE_KEY: '',
  CRON_SECRET: 'cron-secret-123',
};
let handler = null;
globalThis.Deno = { env: { get: (k) => env[k] }, serve: (fn) => { handler = fn; } };

const mod = await import('../supabase/functions/notify/index.ts');
const { encryptWebPush, makeVapidAuth, localClock, b64UrlEncode, b64UrlDecode } = mod;

// ---------- ١. منطق logic.js ----------
test('إعدادات التنبيهات: تطبيع القيم الافتراضية والسماح بإيقاف الصبح/الليل', () => {
  const def = normalizeSettings({});
  assert.equal(def.notify.tasksPin, false);
  assert.equal(def.notify.morning, '08:30');
  assert.equal(def.notify.evening, '22:00');
  assert.equal(def.notify.badge, true);
  assert.equal(def.notify.haptic, true);
  assert.equal(def.notify.tz, 'Africa/Cairo');

  const custom = normalizeSettings({ notify: { tasksPin: true, morning: '', evening: '23:15', badge: false, haptic: false, tz: 'Asia/Riyadh' } });
  assert.equal(custom.notify.tasksPin, true);
  assert.equal(custom.notify.morning, '');
  assert.equal(custom.notify.evening, '23:15');
  assert.equal(custom.notify.badge, false);
  assert.equal(custom.notify.haptic, false);
  assert.equal(custom.notify.tz, 'Asia/Riyadh');
});

test('إشعار قائمة مهام النهارده: يرتّب المهم الأول ويتجاهل المخلّص والجاي ويقفل لما يفضى', () => {
  const today = '2026-11-25';
  assert.equal(buildTasksNotification([], today), null);
  const tasks = [
    { id: '1', t: 'مهمة عادية', due: today, done: false, at: 10 },
    { id: '2', t: 'مهمة مهمة', due: today, pri: true, done: false, at: 20 },
    { id: '3', t: 'خلصت خلاص', due: today, done: true, at: 5 },
    { id: '4', t: 'لبكرة', due: '2026-11-26', done: false, at: 1 },
    { id: '5', t: 'متأخرة', due: '2026-11-24', done: false, at: 15 },
    { id: '6', t: 'رابعة', due: today, done: false, at: 30 },
    { id: '7', t: 'خامسة', due: today, done: false, at: 40 },
    { id: '8', t: 'سادسة', due: today, done: false, at: 50 },
  ];
  const n = buildTasksNotification(tasks, today);
  assert.equal(n.count, 6);
  assert.equal(n.firstId, '2');
  assert.match(n.body, /^⚑ مهمة مهمة/);
  assert.match(n.body, /\+١ مهام تانية/);
  assert.equal(n.actions[0].action, 'done-task');
});

test('نافذة الوقت timeWindowMatch بتحسب الدقايق صح حتى عند نص الليل', () => {
  assert.equal(timeWindowMatch('07:30', '07:30', 15), true);
  assert.equal(timeWindowMatch('07:30', '07:44', 15), true);
  assert.equal(timeWindowMatch('07:30', '07:45', 15), false);
  assert.equal(timeWindowMatch('07:30', '07:29', 15), false);
  assert.equal(timeWindowMatch('23:55', '00:05', 15), true);
  assert.equal(timeWindowMatch('23:55', '00:15', 15), false);
});

test('dueReminders: يبعت بس للعادات اللي لسه ماتعملتش وماتتكررش، ويبعت الصبح وقفلة اليوم', () => {
  const settings = normalizeSettings({
    habits: [
      { k: 'azkm', n: 'أذكار الصبح', g: 'deen', on: true, rem: '07:30' },
      { k: 'wird', n: 'الورد', g: 'deen', on: true, rem: '07:35' },
      { k: 'ex', n: 'تمارين', g: 'health', on: true, rem: '18:00' },
    ],
    notify: { morning: '08:30', evening: '22:00' },
  });
  const tasks = [{ id: 't1', t: 'أخلّص التقرير', pri: true, due: '2026-11-25', done: false, at: 1 }];

  // أذكار الصبح اتعملت بالفعل (2)، والورد لسه ماتعملش
  const r1 = dueReminders({ settings, day: { azkm: 2 }, tasks, today: '2026-11-25', nowHHMM: '07:40', sent: new Set() });
  assert.deepEqual(r1.map((x) => x.key), ['habit:wird']);
  assert.equal(r1[0].payload.actions[0].action, 'done-habit');

  // لو اتبعت قبل كده في push_log مابيتبعتش تاني
  const r1Dup = dueReminders({ settings, day: { azkm: 2 }, tasks, today: '2026-11-25', nowHHMM: '07:40', sent: new Set(['habit:wird']) });
  assert.equal(r1Dup.length, 0);

  // ملخص الصبح بالمهام
  const r2 = dueReminders({ settings, day: {}, tasks, today: '2026-11-25', nowHHMM: '08:35', sent: new Set() });
  assert.deepEqual(r2.map((x) => x.key), ['morning']);
  assert.equal(r2[0].payload.firstId, 't1');

  // قفلة اليوم لما كل العادات والمهام خلصت
  const r3 = dueReminders({
    settings,
    day: { azkm: 2, wird: 2, ex: 1 },
    tasks: [{ ...tasks[0], done: true }],
    today: '2026-11-25',
    nowHHMM: '22:05',
    sent: new Set(),
  });
  assert.deepEqual(r3.map((x) => x.key), ['evening']);
  assert.match(r3[0].payload.body, /عاش!/);
});

// ---------- ٢. تشفير RFC 8291 وتوقيع VAPID ----------
test('تشفير Web Push (RFC 8291 aes128gcm) بيتفك صح بالمفتاح الخاص للموبايل', async () => {
  const uaKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', uaKeys.publicKey));
  const authSecret = crypto.getRandomValues(new Uint8Array(16));
  const orig = { title: 'وقت الورد', body: 'لسه ماتسجلش النهارده', k: 'wird' };

  const encrypted = await encryptWebPush(orig, b64UrlEncode(uaPubRaw), b64UrlEncode(authSecret));

  // فك التشفير حسب RFC 8291 / RFC 8188 من ناحية المتصفح
  const salt = encrypted.slice(0, 16);
  const idlen = encrypted[20];
  assert.equal(idlen, 65);
  const asPubRaw = encrypted.slice(21, 21 + idlen);
  const ciphertext = encrypted.slice(21 + idlen);

  const asPubKey = await crypto.subtle.importKey('raw', asPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asPubKey }, uaKeys.privateKey, 256));

  const te = new TextEncoder();
  const hkdf = async (s, ikm, info, len) => {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, k, len * 8));
  };
  const keyInfo = new Uint8Array(14 + 65 + 65);
  keyInfo.set(te.encode('WebPush: info\0'), 0);
  keyInfo.set(uaPubRaw, 14);
  keyInfo.set(asPubRaw, 79);

  const ikm = await hkdf(authSecret, shared, keyInfo, 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, ciphertext));
  assert.equal(plain.at(-1), 0x02);
  const parsed = JSON.parse(new TextDecoder().decode(plain.slice(0, -1)));
  assert.deepEqual(parsed, orig);
});

test('توقيع VAPID (ES256 JWT) بيتحقق منه بالمفتاح العام', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const pubB64 = b64UrlEncode(pubRaw);
  const privB64 = jwk.d;

  const header = await makeVapidAuth('https://fcm.googleapis.com/fcm/send/abc', pubB64, privB64, 'mailto:test@example.com');
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(header);
  assert.ok(m);
  assert.equal(m[2], pubB64);
  const [h64, p64, s64] = m[1].split('.');
  const payload = JSON.parse(new TextDecoder().decode(b64UrlDecode(p64)));
  assert.equal(payload.aud, 'https://fcm.googleapis.com');
  assert.equal(payload.sub, 'mailto:test@example.com');
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    kp.publicKey,
    b64UrlDecode(s64),
    new TextEncoder().encode(`${h64}.${p64}`),
  );
  assert.equal(ok, true);
});

test('localClock: بيحترم المنطقة الزمنية وساعة بداية اليوم (٤ الفجر)', () => {
  // 2026-11-25 00:30 UTC = 02:30 بتوقيت القاهرة (قبل ٤ الفجر → لسه يوم 2026-11-24)
  const c1 = localClock(new Date('2026-11-25T00:30:00Z'), 'Africa/Cairo', 4);
  assert.equal(c1.hhmm, '02:30');
  assert.equal(c1.today, '2026-11-24');

  // 2026-11-25 05:30 UTC = 07:30 بتوقيت القاهرة
  const c2 = localClock(new Date('2026-11-25T05:30:00Z'), 'Africa/Cairo', 4);
  assert.equal(c2.hhmm, '07:30');
  assert.equal(c2.today, '2026-11-25');
});

// ---------- ٣. دالة Supabase Edge Function (notify) ----------
test('دالة notify: تتحقق من الجلسة في الاختبار ومن x-cron-secret في الجدولة، وتمسح الاشتراك المنتهي 410', async () => {
  const vapidKp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const vapidPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', vapidKp.publicKey));
  const vapidJwk = await crypto.subtle.exportKey('jwk', vapidKp.privateKey);
  env.VAPID_PUBLIC_KEY = b64UrlEncode(vapidPubRaw);
  env.VAPID_PRIVATE_KEY = vapidJwk.d;

  const uaKp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const p256dh = b64UrlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', uaKp.publicKey)));
  const auth = b64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));

  const calls = [];
  let pushStatus = 201;
  const nowClk = localClock(new Date(), 'Africa/Cairo', 4);
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    calls.push({ host: u.host, path: u.pathname, query: u.search, method: init.method || 'GET', headers: init.headers });
    if (u.host === 'fcm.googleapis.com') {
      return new Response('', { status: pushStatus });
    }
    if (u.pathname === '/auth/v1/user') {
      return init.headers?.Authorization === 'Bearer good-jwt'
        ? new Response(JSON.stringify({ id: 'u1' }), { status: 200 })
        : new Response(JSON.stringify({ msg: 'bad' }), { status: 401 });
    }
    if (u.pathname === '/rest/v1/push_subs' && (init.method || 'GET') === 'GET') {
      return new Response(JSON.stringify([{ user_id: 'u1', endpoint: 'https://fcm.googleapis.com/fcm/send/dev1', p256dh, auth }]), { status: 200 });
    }
    if (u.pathname === '/rest/v1/push_subs' && init.method === 'DELETE') {
      return new Response('', { status: 204 });
    }
    if (u.pathname === '/rest/v1/docs' && u.search.includes('list/settings')) {
      return new Response(JSON.stringify([
        { id: 'list/settings', data: { dayStart: 4, habits: [{ k: 'wird', n: 'الورد', on: true, rem: nowClk.hhmm }], notify: { morning: '', evening: '', tz: 'Africa/Cairo' } } },
        { id: 'list/tasks', data: { items: [] } },
      ]), { status: 200 });
    }
    if (u.pathname === '/rest/v1/docs') return new Response(JSON.stringify([]), { status: 200 });
    if (u.pathname === '/rest/v1/push_log' && (init.method || 'GET') === 'GET') return new Response(JSON.stringify([]), { status: 200 });
    if (u.pathname === '/rest/v1/push_log' && init.method === 'POST') return new Response('', { status: 201 });
    return new Response('{}', { status: 404 });
  };

  // ١. CORS preflight
  const opt = await handler(new Request('https://fake.supabase.co/functions/v1/notify', {
    method: 'OPTIONS', headers: { Origin: 'https://mastafakamel.github.io' },
  }));
  assert.equal(opt.status, 200);
  assert.equal(opt.headers.get('Access-Control-Allow-Origin'), 'https://mastafakamel.github.io');

  // ٢. اختبار بدون جلسة → 401
  const noAuth = await handler(new Request('https://fake.supabase.co/functions/v1/notify', {
    method: 'POST', body: JSON.stringify({ action: 'test' }),
  }));
  assert.equal(noAuth.status, 401);

  // ٣. اختبار بجلسة سليمة → يبعت push مشفّر
  const okTest = await handler(new Request('https://fake.supabase.co/functions/v1/notify', {
    method: 'POST',
    headers: { Authorization: 'Bearer good-jwt', apikey: 'pub', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'test' }),
  }));
  assert.equal(okTest.status, 200);
  assert.deepEqual(await okTest.json(), { sent: 1, total: 1 });
  const pushCall = calls.find((c) => c.host === 'fcm.googleapis.com');
  assert.equal(pushCall.headers['Content-Encoding'], 'aes128gcm');
  assert.match(pushCall.headers.Authorization, /^vapid t=/);

  // ٤. جدولة بدون x-cron-secret → 401
  const badCron = await handler(new Request('https://fake.supabase.co/functions/v1/notify', {
    method: 'POST', headers: { 'x-cron-secret': 'wrong' }, body: '{}',
  }));
  assert.equal(badCron.status, 401);

  // ٥. جدولة بـ x-cron-secret سليم → يبعت تذكير العادة ويسجّله في push_log
  calls.length = 0;
  const goodCron = await handler(new Request('https://fake.supabase.co/functions/v1/notify', {
    method: 'POST', headers: { 'x-cron-secret': 'cron-secret-123' }, body: '{}',
  }));
  assert.equal(goodCron.status, 200);
  assert.deepEqual(await goodCron.json(), { ok: true, users: 1, sent: 1 });
  assert.ok(calls.some((c) => c.path === '/rest/v1/push_log' && c.method === 'POST'));

  // ٦. اشتراك منتهي 410 → بيتمسح تلقائي من push_subs
  calls.length = 0;
  pushStatus = 410;
  await handler(new Request('https://fake.supabase.co/functions/v1/notify', {
    method: 'POST', headers: { 'x-cron-secret': 'cron-secret-123' }, body: '{}',
  }));
  assert.ok(calls.some((c) => c.path === '/rest/v1/push_subs' && c.method === 'DELETE'));
});
