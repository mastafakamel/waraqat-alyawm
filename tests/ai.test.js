// اختبار تقرير الذكاء الاصطناعي من ناحية التطبيق، ضد دالة report مزيّفة.
// بيتأكد من اللي بيتبعت (نوع التقرير والملخص بالجلسة)، ومن إن التقرير بيتحفظ في اليوم الصح، ومن رسايل الأخطاء.
import { test } from 'node:test';
import assert from 'node:assert/strict';

Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });

const { configure } = await import('../js/sync.js');
const { requestReport, aiError, buildDigest } = await import('../js/ai.js');
const { state, setK, flush, loadDay } = await import('../js/store.js');
const { putDoc, getDoc } = await import('../js/db.js');

const server = { reply: null, calls: [] };
globalThis.fetch = async (url, { method = 'GET', headers = {}, body } = {}) => {
  const u = new URL(url);
  server.calls.push({ path: u.pathname, method, headers, body: body ? JSON.parse(body) : null });
  const { status = 200, json } = server.reply;
  return { ok: status < 300, status, json: async () => json, text: async () => JSON.stringify(json) };
};
configure('https://fake.supabase.co', 'anon-test');

const session = () => putDoc({ id: 'local/session', data: { access_token: 'acc', refresh_token: 'ref', expires_at: Date.now() + 3_600_000, email: 'me@example.com' }, updatedAt: 1, dirty: 0 });

test('التقرير اليومي: الملخص بيتبعت بالجلسة، والتقرير بيتحفظ في اليوم', async () => {
  await session();
  await loadDay('2026-11-20');
  setK('mood', 4);
  setK('top', 'خلصت الصفحة');
  await flush();
  server.reply = { json: { text: 'اليوم في سطرين:\nيوم كويس.', left: 5, model: 'm' } };

  const r = await requestReport('day');
  assert.deepEqual(r, { text: 'اليوم في سطرين:\nيوم كويس.', left: 5 });
  const call = server.calls.at(-1);
  assert.equal(call.path, '/functions/v1/report');
  assert.equal(call.method, 'POST');
  assert.equal(call.headers.apikey, 'anon-test');
  assert.equal(call.headers.Authorization, 'Bearer acc');
  assert.equal(call.body.kind, 'day');
  assert.match(call.body.digest, /المزاج: 4 من 5/);
  assert.match(call.body.digest, /أهم حاجة حصلت: خلصت الصفحة/);
  assert.doesNotMatch(call.body.digest, /me@example\.com/); // الإيميل مابيتبعتش

  assert.equal(state.day.ai.t, r.text);
  await flush();
  assert.equal((await getDoc('day/2026-11-20')).data.ai.t, r.text); // اتحفظ، وهيتزامن
});

test('التقرير القديم مابيتبعتش تاني في الملخص، والأسبوعي بيتحفظ في aiw', async () => {
  assert.doesNotMatch(await buildDigest('day'), /يوم كويس/);
  server.reply = { json: { text: 'الأسبوع في ٣ سطور:\nتمام', left: 4 } };
  await requestReport('week');
  assert.equal(server.calls.at(-1).body.kind, 'week');
  assert.match(server.calls.at(-1).body.digest, /^الأسبوع: من 2026-11-14 لـ 2026-11-20/);
  assert.equal(state.day.aiw.t, 'الأسبوع في ٣ سطور:\nتمام');
  assert.equal(state.day.ai.t, 'اليوم في سطرين:\nيوم كويس.'); // اليومي زي ما هو
});

test('لو اتنقلت ليوم تاني وإحنا مستنيين، التقرير بيروح لليوم اللي اتطلب له', async () => {
  let release;
  server.reply = { json: { text: 'تقرير ١٩', left: 3 } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (...a) => { await new Promise((r) => { release = r; }); return realFetch(...a); };
  await loadDay('2026-11-19');
  const p = requestReport('day');
  await new Promise((r) => setTimeout(r, 20));
  await loadDay('2026-11-20'); // اتنقل
  release();
  await p;
  globalThis.fetch = realFetch;
  assert.equal((await getDoc('day/2026-11-19')).data.ai.t, 'تقرير ١٩');
  assert.equal(state.day.ai.t, 'اليوم في سطرين:\nيوم كويس.'); // النهارده ماتلمسش
});

test('الأخطاء بتترجم لرسايل مفهومة', async () => {
  server.reply = { status: 429, json: { code: 'ai_quota', message: 'خلصت تقارير النهارده' } };
  const e = await requestReport('day').catch((x) => x);
  assert.equal(e.code, 'ai_quota');
  assert.equal(aiError(e), 'خلصت تقارير النهارده، جرّب بكرة');

  server.reply = { status: 404, json: { code: 'NOT_FOUND', message: 'Requested function was not found' } };
  assert.match(aiError(await requestReport('day').catch((x) => x)), /دالة report لسه مش موجودة/);

  assert.match(aiError({ code: 'ai_model' }), /GROQ_MODEL/);
  assert.equal(aiError(new TypeError('fetch failed')), 'مفيش نت');

  await putDoc({ id: 'local/session', data: null, updatedAt: 1, dirty: 0 }); // خرج
  const out = await requestReport('day').catch((x) => x);
  assert.equal(aiError(out), 'ادخل بحسابك الأول: الإعدادات ← المزامنة');
});
