// tools/make-vapid.mjs — يولّد مفاتيح Web Push (VAPID) وسرّ الجدولة (CRON_SECRET) من غير أي مكتبات خارجية.
// التشغيل مرة واحدة بس:  node tools/make-vapid.mjs

import { generateKeyPairSync, randomBytes } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = privateKey.export({ format: 'jwk' });
const x = Buffer.from(jwk.x, 'base64url');
const y = Buffer.from(jwk.y, 'base64url');
// مفتاح P-256 العام غير المضغوط (65 بايت: 0x04 || x || y)
const pubRaw = Buffer.concat([Buffer.from([0x04]), x, y]);
const vapidPublic = pubRaw.toString('base64url');
const vapidPrivate = jwk.d;
const cronSecret = randomBytes(24).toString('base64url');

console.log(`
=== مفاتيح إشعارات ورقة اليوم (احتفظ بالمفتاح السري في مكان آمن وماتحطوش في Git أبداً) ===

1) في ملف js/config.js (المفتاح العام بس):
export const VAPID_PUBLIC_KEY = '${vapidPublic}';

2) في Supabase ← Edge Functions ← Secrets (٣ أسرار):
VAPID_PUBLIC_KEY  = ${vapidPublic}
VAPID_PRIVATE_KEY = ${vapidPrivate}
CRON_SECRET       = ${cronSecret}

3) وفي SQL الجدولة (pg_cron) استبدل <CRON_SECRET> بـ:
${cronSecret}
`);
