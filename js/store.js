// store.js — حالة التطبيق والحفظ. أي تعديل بيغيّر الحالة ويحدّث الشاشة على طول،
// والكتابة في IndexedDB بتحصل بعد 600ms من آخر تعديل (ومفيش زرار حفظ).

import { getDoc, putDoc, allDocs, isMemoryOnly } from './db.js';
import { dayKeyAt, uid } from './logic.js';

// "النهارده" = اليوم المنطقي (بيبدأ ٤ الفجر)، مش تاريخ الساعة
export const state = {
  today: dayKeyAt(),
  cur: dayKeyAt(), // اليوم المفتوح
  day: {}, // بيانات اليوم المفتوح
  tasks: [],
  ideas: [],
  metrics: [], // مقاييسي: { id, n, t, u, a, w, on, at }
  periods: [], // الفترات: { id, from, to }
  goals: [], // الأهداف: { id, t, p, f, m, src, hz, from, to, start?, target, unit, cur?, steps?, done?, dAt?, note?, at }
  tab: 'day',
  status: 'loading', // loading | saving | saved | memory
  sync: 'off', // off | signedout | busy | ok | offline | error | capped (sync.js)
  aiBusy: null, // 'day' أو 'week' وإحنا مستنيين تقرير الذكاء الاصطناعي (مابيتحفظش)
};

// main.js بيربط هنا: بعد أي حفظ، المزامنة تعرف إن فيه جديد ترفعه
export const hooks = { saved: null };

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emit() {
  for (const fn of listeners) fn(state);
}

// ---------- الحفظ بعد 600ms ----------
const SAVE_DELAY = 600;
const pending = new Map(); // id → البيانات (مرجع حي)
let timer = null;
let flushing = Promise.resolve();

function setStatus(s) {
  if (state.status !== s) {
    state.status = s;
    emit();
  }
}

function mark(id, data) {
  pending.set(id, data);
  setStatus('saving');
  clearTimeout(timer);
  timer = setTimeout(flush, SAVE_DELAY);
}

/** يكتب كل اللي مستني على طول. بنناديه قبل التنقل بين الأيام، ولما التطبيق يروح للخلفية. */
export function flush() {
  clearTimeout(timer);
  if (!pending.size) return flushing;
  const items = [...pending];
  pending.clear();
  flushing = flushing.then(async () => {
    for (const [id, data] of items) {
      await putDoc({ id, data: structuredClone(data), updatedAt: Date.now(), dirty: 1 });
    }
    if (!pending.size) setStatus(isMemoryOnly() ? 'memory' : 'saved');
    hooks.saved?.();
  });
  return flushing;
}

// ---------- اليوم ----------
export async function loadDay(key) {
  await flush();
  const doc = await getDoc(`day/${key}`);
  state.cur = key;
  state.day = doc?.data || {};
  if (state.status === 'loading') state.status = isMemoryOnly() ? 'memory' : 'saved';
  emit();
}

/** يغيّر مفتاح في اليوم المفتوح. القيمة الفاضية بتتمسح عشان المستند يفضل نضيف. */
export function setK(k, v) {
  if (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length)) delete state.day[k];
  else state.day[k] = v;
  mark(`day/${state.cur}`, state.day);
  emit();
}

/** يعدّل في يوم معيّن حتى لو مش هو المفتوح (المصروف والسطر بيروحوا للنهارده دايماً — المرحلة ٢). */
export async function setKOn(key, k, v) {
  if (key === state.cur) return setK(k, v);
  await flush();
  const doc = await getDoc(`day/${key}`);
  const data = doc?.data || {};
  if (v === '' || v == null) delete data[k];
  else data[k] = v;
  mark(`day/${key}`, data);
  return flush();
}

// ---------- القوايم ----------
export async function loadLists() {
  const names = ['tasks', 'ideas', 'metrics', 'periods', 'goals'];
  const docs = await Promise.all(names.map((n) => getDoc(`list/${n}`)));
  names.forEach((n, i) => { state[n] = docs[i]?.data?.items || []; });
}
export function saveList(name) {
  mark(`list/${name}`, { items: state[name] });
  emit();
}
export function addIdea(t, c = 'تاني') {
  state.ideas.push({ id: uid(), t, c, pin: false, at: Date.now() });
  saveList('ideas');
}
export function addTask(t, { pri = false, due = state.today, goalId = '' } = {}) {
  state.tasks.push({ id: uid(), t, pri, due, ...(goalId ? { goalId } : {}), done: false, at: Date.now() });
  saveList('tasks');
}

/** قيمة مقياس في اليوم المفتوح: day.m = { <id>: قيمة }. القيمة الفاضية بتتشال. */
export function setMetric(id, v) {
  const m = { ...(state.day.m || {}) };
  if (v === '' || v === null || v === undefined) delete m[id];
  else m[id] = v;
  setK('m', Object.keys(m).length ? m : '');
}

/** يضيف عنصر لقايمة (metrics أو periods) ويحفظ. */
export function addItem(name, item) {
  state[name].push(item);
  saveList(name);
}

/** يعدّل عنصر في قايمة (tasks أو ideas). المفاتيح اللي قيمتها undefined بتتشال. */
export function patchItem(name, id, patch) {
  const it = state[name].find((x) => String(x.id) === String(id));
  if (!it) return;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete it[k];
    else it[k] = v;
  }
  saveList(name);
}

/** يمسح عنصر ويرجّعه هو ومكانه، عشان زرار "رجّع" يحطه في نفس المكان. */
export function removeItem(name, id) {
  const i = state[name].findIndex((x) => String(x.id) === String(id)); // String: الأفكار القديمة ممكن يكون الـ id بتاعها رقم
  if (i < 0) return null;
  const [item] = state[name].splice(i, 1);
  saveList(name);
  return { item, i };
}
export function restoreItem(name, { item, i }) {
  if (state[name].some((x) => x.id === item.id)) return;
  state[name].splice(Math.min(i, state[name].length), 0, item);
  saveList(name);
}

/** كل الأيام المتسجلة [{ key, data }]. اليوم المفتوح بييجي من الذاكرة، لأن ممكن يكون فيه تعديل لسه ماتحفظش. */
export async function allDays() {
  const docs = await allDocs('day/');
  const out = docs.filter((d) => d.id !== `day/${state.cur}`).map((d) => ({ key: d.id.slice(4), data: d.data || {} }));
  out.push({ key: state.cur, data: state.day });
  return out;
}

/** بيانات يوم معيّن، حتى لو مش هو المفتوح (المصروف والسطر بيروحوا للنهارده دايماً). */
export async function getDayData(key) {
  if (key === state.cur) return state.day;
  await flush();
  const doc = await getDoc(`day/${key}`);
  return doc?.data || {};
}

/** لو اليوم اتغيّر وإحنا فاتحين التطبيق (عدّت ٤ الفجر). */
export function refreshToday() {
  const t = dayKeyAt();
  if (t !== state.today) {
    state.today = t;
    emit();
  }
}
