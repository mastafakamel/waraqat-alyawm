// اختبار المزامنة ضد سيرفر Supabase مزيّف جوه الاختبار.
// السيرفر بيفهم نفس الطلبات (حساب جديد، والدخول بالباسورد، وput_docs، والسحب)، وبيكتب المستند بس لو updated_at أحدث، زي الـ SQL بالظبط.
// IndexedDB مش موجود في Node، فـ db.js بيشتغل من الذاكرة لوحده.
import { test } from 'node:test';
import assert from 'node:assert/strict';

Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });

const { configure, signUp, signIn, syncNow, signOut, info } = await import('../js/sync.js');
const { state, setK, flush, loadDay } = await import('../js/store.js');
const { getDoc, putDoc } = await import('../js/db.js');

// ---------- السيرفر المزيّف ----------
const server = { docs: new Map(), seq: 0, users: new Map(), signupsOpen: true, confirmEmail: false, calls: [] };
const stamp = () => new Date(Date.UTC(2026, 10, 20) + (server.seq += 1) * 1000).toISOString();
const json = (body, status = 200) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

globalThis.fetch = async (url, { method = 'GET', headers = {}, body } = {}) => {
  const u = new URL(url);
  const b = body ? JSON.parse(body) : {};
  server.calls.push(`${method} ${u.pathname}`);
  assert.equal(headers.apikey, 'anon-test');
  const session = (email) => json({ access_token: 'acc', refresh_token: 'ref', expires_in: 3600, user: { email } });
  if (u.pathname === '/auth/v1/signup') {
    if (!server.signupsOpen) return json({ code: 422, error_code: 'signup_disabled', msg: 'Signups not allowed for this instance' }, 422);
    if (server.users.has(b.email)) return json({ code: 422, error_code: 'user_already_exists', msg: 'User already registered' }, 422);
    server.users.set(b.email, b.password);
    return server.confirmEmail ? json({ id: 'u1', email: b.email }) : session(b.email); // لو التأكيد شغال: مفيش جلسة
  }
  if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
    if (server.users.get(b.email) !== b.password) return json({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
    return session(b.email);
  }
  assert.equal(headers.Authorization, 'Bearer acc'); // باقي الطلبات لازم بالجلسة
  if (u.pathname === '/rest/v1/rpc/put_docs') {
    for (const d of b.p_docs) {
      const cur = server.docs.get(d.id);
      if (!cur || cur.updated_at < d.updated_at) server.docs.set(d.id, { ...d, synced_at: stamp() });
    }
    return { ok: true, status: 204, json: async () => null, text: async () => '' };
  }
  if (u.pathname === '/rest/v1/docs') {
    const since = u.searchParams.get('synced_at').replace(/^gt\./, '');
    const rows = [...server.docs.values()].filter((d) => d.synced_at > since).sort((a, c) => (a.synced_at < c.synced_at ? -1 : 1));
    return json(rows);
  }
  return json({ msg: 'not found' }, 404);
};

configure('https://fake.supabase.co', 'anon-test');

test('المزامنة: الدخول بالكود، والرفع، والسحب، وآخر تعديل يكسب', async () => {
  await loadDay('2026-11-20');

  // من غير دخول: المزامنة مابتعملش حاجة
  await syncNow();
  assert.equal(state.sync, 'signedout');

  // لو "Confirm email" لسه شغال في Supabase: الحساب بيتعمل من غير جلسة، والرسالة بتقول اقفله
  server.confirmEmail = true;
  await assert.rejects(signUp('other@example.com', 'pass-12345'), (e) => e.code === 'confirm_on');
  server.confirmEmail = false;

  // دخول قبل ما يبقى فيه حساب: غلط
  await assert.rejects(signIn('me@example.com', 'pass-12345'), (e) => e.code === 'invalid_credentials');

  // بيانات قبل الدخول، وبعدين الحساب الجديد بيرفعها كلها
  setK('mood', 4);
  await flush();
  await signUp('me@example.com', 'pass-12345');
  assert.equal(state.sync, 'ok');
  assert.equal(info.email, 'me@example.com');
  assert.deepEqual(server.docs.get('day/2026-11-20').data, { mood: 4 });
  assert.equal((await getDoc('day/2026-11-20')).dirty, 0); // اترفع خلاص

  // جهاز تاني عدّل نفس اليوم بعدين (أحدث) → السحب بياخده، والشاشة بتتحدّث
  server.docs.set('day/2026-11-20', { id: 'day/2026-11-20', data: { mood: 2, top: 'من اللابتوب' }, updated_at: Date.now() + 60_000, synced_at: stamp() });
  // ومهمة جديدة من الجهاز التاني
  server.docs.set('list/tasks', { id: 'list/tasks', data: { items: [{ id: 't1', t: 'من اللابتوب', due: '', done: false, at: 1 }] }, updated_at: Date.now() + 60_000, synced_at: stamp() });
  await syncNow();
  assert.deepEqual(state.day, { mood: 2, top: 'من اللابتوب' });
  assert.equal(state.tasks[0].t, 'من اللابتوب');

  // نسخة قديمة على السيرفر مش هتمسح تعديل أحدث على الجهاز
  setK('mood', 5);
  await flush();
  const mine = (await getDoc('day/2026-11-20')).updatedAt;
  server.docs.set('day/2026-11-20', { id: 'day/2026-11-20', data: { mood: 1 }, updated_at: mine - 5000, synced_at: stamp() });
  await syncNow();
  assert.equal(state.day.mood, 5); // المحلي أحدث: فضل
  assert.equal(server.docs.get('day/2026-11-20').data.mood, 5); // واترفع للسيرفر

  // الجلسة ماتترفعش أبداً
  assert.ok(![...server.docs.keys()].some((id) => id.startsWith('local/')));

  // الخروج: البيانات بتفضل على الجهاز
  await signOut();
  assert.equal(state.sync, 'signedout');
  assert.equal(state.day.mood, 5);
  assert.equal(await getDoc('local/session').then((d) => d?.data ?? null), null);

  // نفس الإيميل تاني كحساب جديد: موجود بالفعل. والباسورد الغلط مرفوض. والصح بيدخّل
  await assert.rejects(signUp('me@example.com', 'pass-12345'), (e) => e.code === 'user_already_exists');
  await assert.rejects(signIn('me@example.com', 'wrong-pass'), (e) => e.status === 400);
  await signIn('me@example.com', 'pass-12345');
  assert.equal(state.sync, 'ok');

  // بعد ما نقفل التسجيل في Supabase: محدش يقدر يعمل حساب
  server.signupsOpen = false;
  await assert.rejects(signUp('stranger@example.com', 'pass-12345'), (e) => e.code === 'signup_disabled');
  await signOut();
});

test('حد الاستخدام في اليوم بيوقف المزامنة', async () => {
  await putDoc({ id: 'local/session', data: { access_token: 'acc', refresh_token: 'ref', expires_at: Date.now() + 3_600_000, email: 'me@example.com' }, updatedAt: 1, dirty: 0 });
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  await putDoc({ id: 'local/quota', data: { day: key, n: 400 }, updatedAt: 1, dirty: 0 });
  const before = server.calls.length;
  await syncNow();
  assert.equal(state.sync, 'capped');
  assert.equal(server.calls.length, before); // ولا طلب راح للسيرفر
});
