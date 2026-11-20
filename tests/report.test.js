// اختبار دالة report (اللي على Supabase) جوه Node: بنحط Deno مزيّف، ونكلّمها بطلبات حقيقية،
// ونرد بدل Supabase وGroq. كده بنتأكد إن مفيش طلب بيوصل لـ Groq من غير جلسة أو بعد ما الحد يخلص.
// (Node 24 بيشغّل ملفات TypeScript البسيطة لوحده)
import { test } from 'node:test';
import assert from 'node:assert/strict';

const env = { SUPABASE_URL: 'https://fake.supabase.co', GROQ_API_KEY: 'gsk-test' };
let handler = null;
globalThis.Deno = { env: { get: (k) => env[k] }, serve: (fn) => { handler = fn; } };

const net = { quota: { status: 200, json: 5 }, groq: { status: 200, json: { choices: [{ message: { content: ' التقرير ' } }] } }, calls: [] };
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  net.calls.push({ host: u.host, path: u.pathname, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
  const r = u.host === 'api.groq.com' ? net.groq : net.quota;
  return new Response(JSON.stringify(r.json), { status: r.status });
};

const load = async (tag) => {
  await import(`../supabase/functions/report/index.ts?${tag}`);
  return handler;
};
const req = (body, { origin = 'https://mastafakamel.github.io', method = 'POST' } = {}) => new Request('https://fake.supabase.co/functions/v1/report', {
  method,
  headers: { Origin: origin, apikey: 'pub', Authorization: 'Bearer user-jwt', 'Content-Type': 'application/json' },
  body: method === 'POST' ? JSON.stringify(body) : undefined,
});
const ok = { kind: 'day', digest: 'اليوم: الجمعة 2026-11-20\nالمزاج: 4 من 5' };
const groqCalls = () => net.calls.filter((c) => c.host === 'api.groq.com');

test('CORS: الموقع بس، والـ preflight بيعدّي', async () => {
  const h = await load('a');
  const r = await h(req(null, { method: 'OPTIONS' }));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://mastafakamel.github.io');
  assert.match(r.headers.get('Access-Control-Allow-Headers'), /authorization/);
  const other = await h(req(null, { method: 'OPTIONS', origin: 'https://evil.example' }));
  assert.equal(other.headers.get('Access-Control-Allow-Origin'), 'https://mastafakamel.github.io'); // مش بيرجّع أصل غريب
});

test('تقرير ناجح: الحد بيتخصم بجلسة المستخدم، وGroq بياخد التعليمات والملخص', async () => {
  const h = await load('b');
  net.calls = [];
  const r = await h(req(ok));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { text: 'التقرير', left: 5, model: 'openai/gpt-oss-120b' });
  const [q, g] = net.calls;
  assert.equal(q.path, '/rest/v1/rpc/take_ai_quota');
  assert.equal(q.headers.Authorization, 'Bearer user-jwt'); // جلسة المستخدم مش مفتاح سري
  assert.equal(q.headers.apikey, 'pub');
  assert.equal(g.headers.Authorization, 'Bearer gsk-test');
  assert.equal(g.body.model, 'openai/gpt-oss-120b');
  assert.equal(g.body.reasoning_effort, 'low');
  assert.match(g.body.messages[0].content, /بتحلل يوم واحد/);
  assert.equal(g.body.messages[1].content, ok.digest);
});

test('من غير جلسة، أو بعد ما الحد يخلص، أو طلب غلط: مفيش ولا طلب لـ Groq', async () => {
  const h = await load('c');
  net.calls = [];
  net.quota = { status: 401, json: { message: 'JWT expired' } };
  assert.equal((await h(req(ok))).status, 401);
  net.quota = { status: 200, json: -1 };
  const capped = await h(req(ok));
  assert.equal(capped.status, 429);
  assert.equal((await capped.json()).code, 'ai_quota');
  assert.equal((await h(req({ kind: 'month', digest: ok.digest }))).status, 400);
  assert.equal((await h(req({ kind: 'day', digest: 'x'.repeat(13000) }))).status, 400);
  assert.equal(groqCalls().length, 0);
  net.quota = { status: 200, json: 5 };
});

test('أخطاء Groq: الحد، والموديل اللي اتشال', async () => {
  const h = await load('d');
  net.groq = { status: 429, json: { error: { message: 'Rate limit reached' } } };
  assert.equal((await (await h(req(ok))).json()).code, 'ai_busy');
  net.groq = { status: 404, json: { error: { message: 'The model `x` does not exist', code: 'model_not_found' } } };
  assert.equal((await (await h(req(ok))).json()).code, 'ai_model');
});

test('الموديل من GROQ_MODEL، ومن غير مفتاح الدالة بتقول كده', async () => {
  env.GROQ_MODEL = 'llama-x';
  net.groq = { status: 200, json: { choices: [{ message: { content: 'تمام' } }] } };
  const h = await load('e');
  net.calls = [];
  await h(req(ok));
  assert.equal(groqCalls()[0].body.model, 'llama-x');
  assert.equal(groqCalls()[0].body.reasoning_effort, undefined); // الموديلات العادية من غير إعدادات التفكير
  delete env.GROQ_MODEL;
  delete env.GROQ_API_KEY;
  const noKey = await load('f');
  assert.equal((await (await noKey(req(ok))).json()).code, 'ai_key');
});
