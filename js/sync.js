// sync.js — المزامنة مع Supabase بـ fetch عادي (من غير SDK).
//
// - الدخول: إيميل وباسورد (من غير أي إيميلات). الجلسة بتتحفظ في local/session وبتتجدد لوحدها.
//   (كان كود OTP، بس Supabase مابقاش بيسمح تعدّل قالب الإيميل من غير SMTP خاص)
// - الرفع: كل المستندات اللي dirty في طلب واحد (put_docs). السيرفر بيكتب بس لو updated_at أحدث.
// - السحب: كل اللي synced_at بتاعه بعد آخر سحب. ولو أحدث من اللي عندنا، بيحل محله (آخر تعديل يكسب، على مستوى المستند).
// - حد للاستخدام: QUOTA طلب في اليوم بالكتير، عشان الخطة المجانية مايحصلهاش أي حاجة حتى لو فيه غلطة بتعمل لفة.
//
// local/… مستندات على الجهاز بس: مابتترفعش ومابتتصدّرش.

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { allDocs, getDoc, putDoc } from './db.js';
import { takeRemote, useQuota, keyOf } from './logic.js';
import { state, emit, flush, loadLists, loadDay } from './store.js';

const QUOTA = 400; // طلبات في اليوم
const isData = (id) => /^(day|list)\//.test(id);
let URL_ = SUPABASE_URL;
let KEY = SUPABASE_KEY;
/** للاختبار بس: سيرفر مزيّف بدل Supabase الحقيقي. */
export function configure(url, key) {
  URL_ = url;
  KEY = key;
}
export const configured = () => !!(URL_ && KEY);
export const info = { email: '', last: 0, error: '' };

function set(s, error = '') {
  info.error = error;
  if (state.sync !== s || error) {
    state.sync = s;
    emit();
  }
}

async function meta(name) {
  return (await getDoc(`local/${name}`))?.data ?? null;
}
async function setMeta(name, data) {
  await putDoc({ id: `local/${name}`, data, updatedAt: Date.now(), dirty: 0 });
}

function err(msg, extra) {
  return Object.assign(new Error(msg), extra);
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const q = useQuota(await meta('quota'), keyOf(new Date()), QUOTA);
  await setMeta('quota', q.meta);
  if (!q.ok) throw err('quota', { capped: true });
  const headers = { apikey: KEY, 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${await accessToken()}`;
  const res = await fetch(`${URL_}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    let msg = `${res.status}`;
    let code = '';
    try {
      const j = await res.json();
      msg = j.msg || j.message || j.error_description || j.error || msg;
      code = j.error_code || j.code || j.error || '';
    } catch { /* مش JSON */ }
    throw err(msg, { status: res.status, code: String(code) });
  }
  return res.status === 204 ? null : res.json();
}

// ---------- الجلسة ----------
function toSession(r, email) {
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: Date.now() + (r.expires_in || 3600) * 1000,
    email: r.user?.email || email,
  };
}

async function accessToken() {
  let s = await meta('session');
  if (!s) throw err('signed out', { signedOut: true });
  if (Date.now() > s.expires_at - 60_000) {
    try {
      const r = await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token }, auth: false });
      s = toSession(r, s.email);
      await setMeta('session', s);
    } catch (e) {
      if (e.status === 400 || e.status === 401) {
        await setMeta('session', null); // الجلسة خلصت: لازم دخول تاني
        throw err('signed out', { signedOut: true });
      }
      throw e;
    }
  }
  return s.access_token;
}

async function startSession(r, email) {
  if (!r?.access_token) {
    // التسجيل اتعمل بس من غير جلسة: يعني "Confirm email" لسه شغال في Supabase
    throw err('confirm email is on', { code: 'confirm_on' });
  }
  const s = toSession(r, email);
  await setMeta('session', s);
  await setMeta('cursor', null); // أول مرة: نسحب كل حاجة
  info.email = s.email;
  return syncNow();
}

/** الدخول بالإيميل والباسورد. */
export async function signIn(email, password) {
  const r = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, auth: false });
  return startSession(r, email);
}

/** حساب جديد (مرة واحدة بس). "Confirm email" لازم يكون مقفول في Supabase عشان مايتبعتش إيميل. */
export async function signUp(email, password) {
  const r = await api('/auth/v1/signup', { method: 'POST', body: { email, password }, auth: false });
  return startSession(r, email);
}

export async function signOut() {
  await setMeta('session', null);
  await setMeta('cursor', null);
  info.email = '';
  info.last = 0;
  set('signedout'); // البيانات اللي على الجهاز بتفضل زي ما هي
}

/**
 * يكلّم Edge Function على Supabase (زي report) بجلسة الدخول. الأخطاء بترجع زي api: { status, code }،
 * و signedOut لو مفيش جلسة. ده طلب زيه زي أي طلب، فبيتحسب من حد اليوم بتاع المزامنة كمان.
 */
export async function callFunction(name, body) {
  if (!configured()) throw err('sync off', { code: 'off' });
  return api(`/functions/v1/${name}`, { method: 'POST', body });
}

// ---------- الرفع والسحب ----------
async function push() {
  const dirty = (await allDocs('')).filter((d) => d.dirty && isData(d.id));
  if (!dirty.length) return 0;
  await api('/rest/v1/rpc/put_docs', {
    method: 'POST',
    body: { p_docs: dirty.map((d) => ({ id: d.id, data: d.data, updated_at: d.updatedAt })) },
  });
  for (const d of dirty) {
    const now = await getDoc(d.id);
    // لو اتعدّل تاني وإحنا بنرفع، يفضل dirty عشان يترفع المرة الجاية
    if (now && now.updatedAt === d.updatedAt) await putDoc({ ...now, dirty: 0 });
  }
  return dirty.length;
}

async function pull() {
  const since = (await meta('cursor'))?.at || '1970-01-01T00:00:00Z';
  // بنرجع ١٠ ثواني لورا: لو جهاز تاني كان بيرفع في نفس اللحظة، تعديله مايضيعش.
  // واللي اتسحب قبل كده مش هيتاخد تاني، لأن takeRemote بتاخد الأحدث بس.
  const from = new Date(Math.max(0, Date.parse(since) - 10_000)).toISOString();
  const rows = await api(`/rest/v1/docs?select=id,data,updated_at,synced_at&synced_at=gt.${encodeURIComponent(from)}&order=synced_at.asc&limit=1000`);
  const changed = [];
  let max = since;
  for (const r of rows || []) {
    if (r.synced_at > max) max = r.synced_at;
    if (!isData(r.id)) continue;
    if (takeRemote(await getDoc(r.id), r)) {
      await putDoc({ id: r.id, data: r.data, updatedAt: +r.updated_at, dirty: 0 });
      changed.push(r.id);
    }
  }
  if (max !== since) await setMeta('cursor', { at: max });
  return changed;
}

// ---------- التشغيل ----------
let running = null;
let again = false;
let timer = null;

export async function syncNow() {
  if (!configured()) return set('off');
  const s = await meta('session');
  if (!s) return set('signedout');
  info.email = s.email;
  if (!navigator.onLine) return set('offline');
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    set('busy');
    try {
      await flush();
      await push();
      const changed = await pull();
      // لو جه جديد يخص اللي مفتوح دلوقتي، نعيد تحميله
      if (changed.some((id) => id.startsWith('list/'))) await loadLists();
      if (changed.length) await loadDay(state.cur);
      info.last = Date.now();
      set('ok');
    } catch (e) {
      if (e.capped) set('capped');
      else if (e.signedOut) set('signedout');
      else if (!navigator.onLine || e instanceof TypeError) set('offline'); // TypeError = fetch مقدرش يوصل
      else set('error', e.message);
    } finally {
      running = null;
      if (again) {
        again = false;
        schedule();
      }
    }
  })();
  return running;
}

/** بعد أي حفظ بـ ٣ ثواني: كذا تعديل ورا بعض بيترفعوا في طلب واحد. */
export function schedule(ms = 3000) {
  if (!configured()) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, ms);
}

export async function initSync() {
  if (!configured()) return set('off');
  window.addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => {
    // لما التطبيق يرجع قدامك، لو آخر مزامنة من أكتر من دقيقة
    if (!document.hidden && Date.now() - info.last > 60_000) syncNow();
  });
  return syncNow();
}
