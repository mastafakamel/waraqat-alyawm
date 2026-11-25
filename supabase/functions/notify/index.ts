// notify — إشعارات الخلفية لورقة اليوم (Supabase Edge Function، من غير مكتبات خارجية — Web Crypto بس).
//
// بتشتغل في حالتين:
//   ١. اختبار من التطبيق: POST { action: 'test' } بجلسة المستخدم (Authorization + apikey).
//      الدالة بتتأكد من الجلسة عند Supabase Auth وتبعت إشعار تجريبي لأجهزة المستخدم ده بس.
//   ٢. جدولة تلقائية (pg_cron كل ٥ دقايق): POST بهيدر x-cron-secret = CRON_SECRET.
//      بتشيك على المشتركين في push_subs وتبعت بس للعادات اللي جه وقتها ولسه ماتعملتش + ملخص الصبح + قفلة اليوم.
//
// الإعدادات (Edge Functions ← Secrets):
//   VAPID_PUBLIC_KEY   المفتاح العام (نفس اللي في js/config.js)
//   VAPID_PRIVATE_KEY  المفتاح السري (هنا بس، عمره ما يتحط في كود الموقع)
//   CRON_SECRET        كلمة سر عشوائية بين pg_cron والدالة
//   VAPID_SUBJECT      اختياري (افتراضي mailto:waraqat-alyawm@users.noreply.github.com)
//
// SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY بيبقوا موجودين تلقائي جوه Supabase Edge Functions.

const ORIGINS = ['https://mastafakamel.github.io', 'http://localhost:8765', 'http://127.0.0.1:8765'];
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const AR_DIG = '٠١٢٣٤٥٦٧٨٩';
const WINDOW_MIN = 15; // نافذة الإرسال بالدقايق (مع pg_cron كل ٥ دقايق)

const DEFAULT_HABITS = [
  { k: 'wird', n: 'الورد', on: true },
  { k: 'azkm', n: 'أذكار الصبح', on: true },
  { k: 'azke', n: 'أذكار المسا', on: true },
  { k: 'ex', n: 'تمارين', on: true },
  { k: 'selfcare', n: 'حفاظ على النفس', on: true },
  { k: 'eng', n: 'إنجليزي', on: true },
  { k: 'read', n: 'قراءة', on: true },
  { k: 'tech', n: 'تعلم تقني', on: true },
];

const enc = new TextEncoder();
const toAr = (n: number) => String(n).replace(/\d/g, (d) => AR_DIG[+d]);

function cors(req: Request): Record<string, string> {
  const o = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-cron-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function b64UrlEncode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64UrlDecode(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8);
  return new Uint8Array(bits);
}

/** تشفير Web Push حسب RFC 8291 (aes128gcm). */
export async function encryptWebPush(payloadObj: unknown, p256dhB64: string, authB64: string): Promise<Uint8Array> {
  const uaPublicBytes = b64UrlDecode(p256dhB64);
  const authBytes = b64UrlDecode(authB64);
  const uaPubKey = await crypto.subtle.importKey('raw', uaPublicBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPubKey }, asKeys.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfo = concatBytes(enc.encode('WebPush: info\0'), uaPublicBytes, asPublicBytes);
  const ikm = await hkdf(authBytes, ecdhSecret, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plaintext = enc.encode(JSON.stringify(payloadObj));
  const recordPlain = concatBytes(plaintext, new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, recordPlain));

  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]); // 4096
  return concatBytes(salt, rs, new Uint8Array([asPublicBytes.length]), asPublicBytes, ciphertext);
}

/** توقيع هيدر VAPID (ES256 JWT) حسب RFC 8292. */
export async function makeVapidAuth(endpoint: string, pubB64: string, privB64: string, subject: string): Promise<string> {
  const pubBytes = b64UrlDecode(pubB64);
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) throw new Error('VAPID_PUBLIC_KEY غير صالح');
  const x = b64UrlEncode(pubBytes.slice(1, 33));
  const y = b64UrlEncode(pubBytes.slice(33, 65));
  const privKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d: privB64 },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header = b64UrlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64UrlEncode(enc.encode(JSON.stringify({ aud, exp, sub: subject })));
  const unsigned = `${header}.${body}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, enc.encode(unsigned)));
  return `vapid t=${unsigned}.${b64UrlEncode(sig)}, k=${pubB64}`;
}

/** الوقت واليوم المنطقي في المنطقة الزمنية للمستخدم (مع احترام ساعة بداية اليوم زي ٤ الفجر). */
export function localClock(now: Date, tz = 'Africa/Cairo', dayStart = 4): { today: string; hhmm: string } {
  const safeTz = (() => {
    try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return tz; } catch { return 'Africa/Cairo'; }
  })();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  const h = Number(parts.hour);
  const hhmm = `${parts.hour}:${parts.minute}`;
  let ymd = `${parts.year}-${parts.month}-${parts.day}`;
  if (h < dayStart) {
    const d = new Date(`${ymd}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    ymd = d.toISOString().slice(0, 10);
  }
  return { today: ymd, hhmm };
}

function timeWindowMatch(target: string, nowHHMM: string, windowMin = WINDOW_MIN): boolean {
  if (!HHMM_RE.test(target || '') || !HHMM_RE.test(nowHHMM || '')) return false;
  const toM = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const diff = (toM(nowHHMM) - toM(target) + 1440) % 1440;
  return diff >= 0 && diff < windowMin;
}

interface TaskItem { id: string; t: string; pri?: boolean; due?: string; done?: boolean; at?: number }
interface HabitItem { k: string; n: string; on?: boolean; rem?: string }

function openTodayTasks(tasks: TaskItem[], today: string): TaskItem[] {
  const byPri = (a: TaskItem, b: TaskItem) => (b.pri ? 1 : 0) - (a.pri ? 1 : 0) || (a.at || 0) - (b.at || 0);
  return (tasks || []).filter((t) => !t.done && !!t.due && t.due <= today).sort(byPri);
}

function buildDueForUser(args: {
  settings: Record<string, unknown>;
  day: Record<string, unknown>;
  tasks: TaskItem[];
  today: string;
  hhmm: string;
  sent: Set<string>;
}) {
  const { settings, day, tasks, today, hhmm, sent } = args;
  const habits: HabitItem[] = Array.isArray(settings.habits) && settings.habits.length ? settings.habits as HabitItem[] : DEFAULT_HABITS;
  const active = habits.filter((h) => h.on !== false);
  const notify = (settings.notify && typeof settings.notify === 'object' ? settings.notify : {}) as Record<string, unknown>;
  const morning = notify.morning === '' || notify.morning === null ? '' : (typeof notify.morning === 'string' && HHMM_RE.test(notify.morning) ? notify.morning : '08:30');
  const evening = notify.evening === '' || notify.evening === null ? '' : (typeof notify.evening === 'string' && HHMM_RE.test(notify.evening) ? notify.evening : '22:00');
  const open = openTodayTasks(tasks, today);
  const badgeCount = open.length;
  const out: Array<{ key: string; payload: Record<string, unknown> }> = [];

  for (const h of active) {
    if (!h.rem || !timeWindowMatch(h.rem, hhmm)) continue;
    const key = `habit:${h.k}`;
    if (sent.has(key) || Number(day[h.k] || 0) > 0) continue;
    out.push({
      key,
      payload: {
        kind: 'habit',
        k: h.k,
        today,
        badgeCount,
        title: `وقت ${h.n}`,
        body: 'لسه ماتسجلتش النهارده — تقدر تعلّمها من هنا على طول.',
        tag: `habit-${h.k}`,
        url: './?open=day',
        actions: [
          { action: 'done-habit', title: '✓ عملتها' },
          { action: 'open-app', title: 'افتح اليوم' },
        ],
      },
    });
  }

  if (morning && timeWindowMatch(morning, hhmm) && !sent.has('morning')) {
    if (open.length) {
      const shown = open.slice(0, 5);
      const lines = shown.map((t) => `${t.pri ? '⚑' : '•'} ${t.t}`);
      if (open.length > shown.length) lines.push(`+${toAr(open.length - shown.length)} مهام تانية`);
      out.push({
        key: 'morning',
        payload: {
          kind: 'tasks',
          today,
          badgeCount,
          firstId: open[0].id,
          title: `مهام النهارده (${toAr(open.length)})`,
          body: lines.join('\n'),
          tag: 'today-tasks',
          url: './?open=tasks',
          actions: [
            { action: 'done-task', title: '✓ خلّصت أول مهمة' },
            { action: 'open-tasks', title: 'افتح المهام' },
          ],
        },
      });
    } else {
      out.push({
        key: 'morning',
        payload: {
          kind: 'morning',
          today,
          badgeCount: 0,
          title: 'صباح الخير · ورقة اليوم',
          body: 'مفيش مهام متسجلة للنهارده لسه — ضيف أهم حاجة تبدأ بيها يومك.',
          tag: 'morning-empty',
          url: './?open=newtask',
          actions: [{ action: 'open-newtask', title: '+ مهمة جديدة' }],
        },
      });
    }
  }

  if (evening && timeWindowMatch(evening, hhmm) && !sent.has('evening')) {
    const leftHabits = active.filter((h) => !(Number(day[h.k] || 0) > 0));
    let body = '';
    if (!leftHabits.length && !open.length) {
      body = 'عاش! خلّصت كل عاداتك ومهامك النهارده — فاضل بس تقفل يومك في ورقة اليوم.';
    } else {
      const parts: string[] = [];
      if (leftHabits.length) {
        const names = leftHabits.slice(0, 3).map((h) => h.n).join('، ');
        parts.push(`${toAr(leftHabits.length)} عادات (${names}${leftHabits.length > 3 ? '…' : ''})`);
      }
      if (open.length) parts.push(`${toAr(open.length)} مهام مفتوحة`);
      body = `باقي ${parts.join(' و')} — خلّص اللي تقدر عليه وقفل ورقتك.`;
    }
    out.push({
      key: 'evening',
      payload: {
        kind: 'evening',
        today,
        badgeCount,
        title: 'قفلة اليوم · ورقة اليوم',
        body,
        tag: 'evening-wrap',
        url: './?open=day',
        actions: [
          ...(open.length ? [{ action: 'open-tasks', title: 'افتح المهام' }] : []),
          { action: 'open-app', title: 'افتح اليوم' },
        ],
      },
    });
  }

  return out;
}

interface PushSub { id?: string; user_id: string; endpoint: string; p256dh: string; auth: string }

async function sendWebPush(sub: PushSub, payload: unknown, vapidPub: string, vapidPriv: string, subject: string): Promise<number> {
  const body = await encryptWebPush(payload, sub.p256dh, sub.auth);
  const authHeader = await makeVapidAuth(sub.endpoint, vapidPub, vapidPriv, subject);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'high',
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  return res.status;
}

function timingSafeEq(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const h = cors(req);
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } });
  const fail = (status: number, code: string, message: string) => reply({ code, message }, status);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return fail(405, 'method', 'POST بس');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const VAPID_PUB = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const VAPID_PRIV = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';
  const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:waraqat-alyawm@users.noreply.github.com';

  if (!SUPABASE_URL || !SERVICE_KEY) return fail(500, 'supa_env', 'متغيرات Supabase مش جاهزة');
  if (!VAPID_PUB || !VAPID_PRIV) return fail(500, 'vapid_key', 'VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY مش موجودين في Secrets');

  const srvHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const srvGet = async (path: string) => {
    const r = await fetch(`${SUPABASE_URL}${path}`, { headers: srvHeaders });
    if (!r.ok) throw new Error(`supabase ${r.status}`);
    return r.json();
  };
  const delGone = async (endpoint: string) => {
    await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
      headers: srvHeaders,
    }).catch(() => {});
  };

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* فاضي */ }

  // الحالة ١: اختبار إشعار من التطبيق بجلسة المستخدم
  if (body.action === 'test') {
    const auth = req.headers.get('Authorization') || '';
    const apikey = req.headers.get('apikey') || '';
    if (!auth) return fail(401, 'signed_out', 'لازم تدخل بحسابك');
    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
    if (!uRes.ok) return fail(401, 'signed_out', 'الجلسة غير صالحة');
    const user = await uRes.json();
    const subs: PushSub[] = await srvGet(`/rest/v1/push_subs?select=user_id,endpoint,p256dh,auth&user_id=eq.${encodeURIComponent(user.id)}`);
    let sent = 0;
    for (const sub of subs) {
      const st = await sendWebPush(sub, {
        kind: 'test',
        title: 'ورقة اليوم · شغّال ✓',
        body: 'الإشعارات من السيرفر وصلت تمام! هتوصلك في ميعاد عاداتك حتى والتطبيق مقفول.',
        tag: 'waraqa-test',
        url: './?open=day',
        actions: [{ action: 'open-tasks', title: 'افتح المهام' }],
      }, VAPID_PUB, VAPID_PRIV, VAPID_SUBJECT);
      if (st >= 200 && st < 300) sent += 1;
      else if (st === 404 || st === 410) await delGone(sub.endpoint);
    }
    return reply({ sent, total: subs.length });
  }

  // الحالة ٢: جدولة pg_cron الدورية
  const providedSecret = req.headers.get('x-cron-secret') || '';
  if (!CRON_SECRET || !timingSafeEq(providedSecret, CRON_SECRET)) {
    return fail(401, 'unauthorized', 'محتاج x-cron-secret صح');
  }

  const allSubs: PushSub[] = await srvGet('/rest/v1/push_subs?select=user_id,endpoint,p256dh,auth');
  const byUser = new Map<string, PushSub[]>();
  for (const s of allSubs) {
    const list = byUser.get(s.user_id) || [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  const now = new Date();
  let sentCount = 0;
  let checkedUsers = 0;

  for (const [uid, subs] of byUser) {
    checkedUsers += 1;
    const baseDocs: Array<{ id: string; data: Record<string, unknown> }> = await srvGet(
      `/rest/v1/docs?select=id,data&user_id=eq.${encodeURIComponent(uid)}&id=in.(list/settings,list/tasks)`,
    );
    const settings = (baseDocs.find((d) => d.id === 'list/settings')?.data || {}) as Record<string, unknown>;
    const tasksDoc = baseDocs.find((d) => d.id === 'list/tasks')?.data || {};
    const tasks = Array.isArray(tasksDoc.items) ? tasksDoc.items as TaskItem[] : [];
    const dayStart = [3, 4, 5].includes(Number(settings.dayStart)) ? Number(settings.dayStart) : 4;
    const tz = String(((settings.notify as Record<string, unknown>) || {}).tz || 'Africa/Cairo');
    const { today, hhmm } = localClock(now, tz, dayStart);

    const [dayRows, logRows] = await Promise.all([
      srvGet(`/rest/v1/docs?select=data&user_id=eq.${encodeURIComponent(uid)}&id=eq.${encodeURIComponent(`day/${today}`)}`),
      srvGet(`/rest/v1/push_log?select=kind&user_id=eq.${encodeURIComponent(uid)}&day=eq.${encodeURIComponent(today)}`),
    ]);
    const day = (dayRows?.[0]?.data || {}) as Record<string, unknown>;
    const sentSet = new Set<string>((logRows || []).map((r: { kind: string }) => r.kind));

    const due = buildDueForUser({ settings, day, tasks, today, hhmm, sent: sentSet });
    for (const item of due) {
      let delivered = false;
      for (const sub of subs) {
        try {
          const st = await sendWebPush(sub, item.payload, VAPID_PUB, VAPID_PRIV, VAPID_SUBJECT);
          if (st >= 200 && st < 300) {
            delivered = true;
            sentCount += 1;
          } else if (st === 404 || st === 410) {
            await delGone(sub.endpoint);
          }
        } catch { /* نكمّل باقي الأجهزة */ }
      }
      if (delivered) {
        await fetch(`${SUPABASE_URL}/rest/v1/push_log?on_conflict=user_id,day,kind`, {
          method: 'POST',
          headers: { ...srvHeaders, Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify({ user_id: uid, day: today, kind: item.key }),
        }).catch(() => {});
      }
    }
  }

  return reply({ ok: true, users: checkedUsers, sent: sentCount });
});
