// main.js — تشغيل ورقة اليوم. كل الدوسات والكتابة بتتسمع هنا من مكان واحد (event delegation).

import {
  state, subscribe, loadDay, setK, setKOn, flush, loadLists, refreshToday, addIdea, addTask, getDayData,
  patchItem, removeItem, restoreItem, allDays, setMetric, addItem, saveList, hooks,
} from './store.js';
import { exportFile, importFile } from './backup.js';
import {
  configured, info as syncInfo, initSync, schedule, syncNow, signIn, signUp, signOut,
} from './sync.js';
import { askPersist, getDoc } from './db.js';
import {
  addDays, cycleTri, rateTap, readNumber, toEn, parseExpense, fmtNum, missingStars, EXP_CATS, lineTarget, mergeLine,
  uid, newPeriod, periodOf, periodLabel, AREAS, weekKeys, dayStatus, baselineFor, starSplit,
} from './logic.js';
import { monthSheet, updateMonth, shiftMonth } from './views/month.js';
import { $, $$, esc, openSheet, requestClose, isSheetOpen, sheetEl, syncFields, toast, toastErr, setHtml } from './ui.js';
import { renderHeader, updateStatus, renderToday, renderTabs } from './views/today.js';
import { sheetFor, guideStep, updateOutputs } from './views/sheets.js';
import { dockHtml, updateDock } from './views/dock.js';
import { tasksShell, updateTasks } from './views/tasks.js';
import { ideasShell, updateIdeas } from './views/ideas.js';
import { moneyShell, updateMoney } from './views/money.js';
import {
  SUGGEST, metricSheet, metricForm, updateMetricForm, settingsSheet, updateSettings,
} from './views/metrics.js';
import { requestReport, aiError, AI_FIELD } from './ai.js';
import { aiSheet, updateAiSheet } from './views/ai.js';

// حالة الواجهة بس (مش بتتحفظ). drafts = اللي اتكتب في خانات الإضافة ولسه ماتحفظش، عشان مايضيعش لو غيّرت التبويبة.
const ui = {
  cat: EXP_CATS[0], guide: null, qmode: 'idea', qmenu: false, qcat: EXP_CATS[0],
  tpri: false, twhen: 'today', icat: 'تاني', drafts: {},
  mf: null, // فورم المقياس المفتوح: { id?, n, t, u, a, w, newArea }
  mfFrom: null, // 'settings' لو الفورم اتفتح من الإعدادات، عشان نرجعلها بعد الحفظ
  pedit: false, // تعديل تواريخ الفترة مفتوح
  sf: { email: '' }, // الإيميل اللي اتكتب في دخول المزامنة (الباسورد مابيتحفظش)
  month: null, // sheet الشهر مفتوح على أنهي شهر "YYYY-MM"، وحالات أيامه
  monthStatus: {},
};

// ---------- الأيام اللي حوالين اليوم المفتوح ----------
// شريط الأيام (آخر ٧ لحد النهارده) والمقارنة بمتوسطك (آخر ٧ قبل اليوم المفتوح) محتاجين أيام تانية من IndexedDB.
// بتتحمّل لما اليوم المفتوح أو النهارده يتغيّروا بس، واليوم المفتوح نفسه بيتاخد من الذاكرة (فيه تعديلات لسه ماتحفظتش).
const win = { cur: null, today: null, days: new Map() };
async function loadWindow() {
  const want = new Set([...weekKeys(state.today), ...weekKeys(addDays(state.cur, -1))]);
  want.delete(state.cur);
  const at = `${state.cur}|${state.today}`;
  const docs = await Promise.all([...want].map(async (k) => [k, (await getDoc(`day/${k}`))?.data || null]));
  if (`${state.cur}|${state.today}` !== at) return; // اتغيّر وإحنا بنحمّل: التحميل الجديد هيرسم
  win.days = new Map(docs.filter(([, d]) => d));
  render();
}
function winCtx() {
  if (win.cur !== state.cur || win.today !== state.today) {
    win.cur = state.cur;
    win.today = state.today;
    loadWindow();
  }
  const days = [...win.days].map(([key, data]) => ({ key, data }));
  const status = {};
  for (const [k, d] of win.days) status[k] = dayStatus(d);
  const base = {};
  for (const m of ['sleep', 'screen', 'work', 'spend']) base[m] = baselineFor(days, state.cur, m);
  return { status, base, hour: new Date().getHours() };
}
const sx = () => ({ configured: configured(), ...syncInfo }); // حالة المزامنة لكارت الإعدادات
const DRAFTS = ['taskin', 'ideain', 'iq', 'mamt', 'mdesc', 'linein'];

// ?theme=light أو ?theme=dark للتجربة، وغير كده بيمشي مع إعداد الموبايل
const theme = new URLSearchParams(location.search).get('theme');
if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;

// ---------- الرسم ----------
// تبويبة اليوم مفيهاش خانات كتابة، فبتترسم كلها كل مرة.
// التبويبات التانية فيها خانات، فالهيكل بيترسم مرة واحدة لما تفتحها، وبعد كده "update" بتحدّث الأجزاء اللي بتتغيّر بس.
const TABS = {
  tasks: { shell: tasksShell, update: (v) => updateTasks(v, state, ui) },
  ideas: { shell: ideasShell, update: (v) => updateIdeas(v, state, ui) },
  money: { shell: moneyShell, update: (v) => updateMoney(v, state, ui, allDays) },
};
let shown = null; // التبويبة اللي هيكلها مرسوم دلوقتي

function render() {
  const ctx = winCtx();
  setHtml($('#top'), renderHeader(state, ctx));
  updateStatus($('#top'), state);
  const view = $('#view');
  const tab = TABS[state.tab];
  if (tab) {
    if (shown !== state.tab) {
      view.innerHTML = tab.shell(state, ui);
      view._html = null; // المحتوى اتبدّل من غير setHtml
      shown = state.tab;
    }
    tab.update(view);
  } else {
    // صف العادات بيتسحب لجنب: لو الصفحة اترسمت من جديد، نرجّعه لنفس مكانه بدل ما ينط لأوله
    const keep = $$('[data-keep-scroll]', view).map((el) => [el.dataset.keepScroll, el.scrollLeft]);
    setHtml(view, renderToday(state, ctx));
    for (const [k, x] of keep) {
      const el = view.querySelector(`[data-keep-scroll="${k}"]`);
      if (el && el.scrollLeft !== x) el.scrollLeft = x;
    }
    const li = view.querySelector('[data-role="linein"]');
    if (li && li !== document.activeElement && ui.drafts.linein) li.value = ui.drafts.linein;
    shown = 'day';
  }
  syncFields(view, state.day);
  setHtml($('#tabs'), renderTabs(state));
  const dock = $('#dock');
  dock.hidden = state.tab !== 'day';
  updateDock(dock, ui, state.cur !== state.today);
  const sh = sheetEl();
  if (sh) {
    syncFields(sh, state.day);
    updateOutputs(sh, state);
    updateSettings(sh, state, ui, sx());
    if (ui.mf) updateMetricForm(sh, ui.mf, state);
    updateAiSheet(sh, state);
    if (ui.month) updateMonth(sh, ui.month, state, ui.monthStatus);
  }
}
subscribe(render);
const updateView = () => TABS[state.tab]?.update($('#view'));

// ---------- التسجيل السريع ----------
async function handleQuick(form) {
  const inp = form.querySelector('[data-role="quickin"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  refreshToday();
  const today = state.today;
  const where = state.cur !== today ? ' في النهارده' : '';

  if (ui.qmode === 'idea') {
    addIdea(v);
    toast('الفكرة اتحفظت');
  } else if (ui.qmode === 'task') {
    addTask(v);
    toast('المهمة اتضافت للنهارده');
  } else if (ui.qmode === 'exp') {
    const r = parseExpense(v);
    if (!r) return toastErr('اكتب المبلغ رقم، زي ٧٥ غدا');
    const d = await getDayData(today);
    await setKOn(today, 'exp', [...(d.exp || []), { a: r.a, w: r.w, c: ui.qcat }]);
    toast(`اتسجل ${fmtNum(r.a)} جنيه · ${ui.qcat}${where}`);
  } else {
    const { key, label } = lineTarget(new Date().getHours());
    const d = await getDayData(today);
    await setKOn(today, key, mergeLine(d[key], v));
    toast(`اتكتب في ${label}${where}`);
  }
  inp.value = '';
  updateDock($('#dock'), ui, state.cur !== today);
  return undefined;
}

function afterOpen() {
  const sh = sheetEl();
  syncFields(sh, state.day);
  updateOutputs(sh, state);
  updateParse();
}

function openNamed(id) {
  openSheet(sheetFor(id, state, ui));
  afterOpen();
}

// ---------- سؤال بسؤال ----------
/** "سؤال بسؤال": اللي ناقص ووقته جه الأول، وبعده اللي لسه "بالليل". ولو دوست على اسم معيّن بيبدأ منه. */
function startGuide(startKey) {
  const { now, later } = starSplit(state.day, state.cur, state.today, new Date().getHours());
  const miss = [...now, ...later].map((x) => x.k);
  if (!miss.length) return;
  const at = Math.max(0, miss.indexOf(startKey));
  ui.guide = { order: [...miss.slice(at), ...miss.slice(0, at)], i: 0 };
  showStep();
}
function showStep() {
  const g = ui.guide;
  openSheet({
    ...guideStep(g.order[g.i], g.i, g.order.length, state, ui),
    onClose: () => {
      ui.guide = null;
      render();
      if (!missingStars(state.day).length) toast('اليوم اتسجل كله');
    },
  });
  afterOpen();
}
function nextStep() {
  const g = ui.guide;
  if (g && g.i < g.order.length - 1) {
    g.i += 1;
    showStep();
  }
}

// ---------- المصروف ----------
function updateParse() {
  const sh = sheetEl();
  const out = sh?.querySelector('[data-out="parse"]');
  const inp = sh?.querySelector('[data-role="expin"]');
  if (!out || !inp) return;
  const v = inp.value.trim();
  if (!v) {
    out.textContent = '';
    out.classList.remove('err');
    return;
  }
  const r = parseExpense(v);
  out.classList.toggle('err', !r);
  out.innerHTML = r ? `هيتسجل: <b>${fmtNum(r.a)} جنيه</b>${r.w ? `، ${esc(r.w)}` : ''}، ${ui.cat}` : 'اكتب المبلغ رقم، زي ٧٥ غدا';
}
/** سؤال الفلوس في "سؤال بسؤال": سطر واحد زي "٧٥ غدا". */
function addExpense(form) {
  const inp = form.querySelector('[data-role="expin"]');
  const r = parseExpense(inp.value);
  if (!r) {
    toastErr('اكتب المبلغ رقم، زي ٧٥ غدا');
    inp.focus();
    return;
  }
  setK('exp', [...(state.day.exp || []), { a: r.a, w: r.w, c: ui.cat }]);
  inp.value = '';
  updateParse();
  toast(`اتسجل ${fmtNum(r.a)} جنيه · ${ui.cat}`);
}
/** تبويبة الفلوس: خانة المبلغ وخانة "على إيه". لو كتبت "٧٥ غدا" في خانة المبلغ، الوصف بيطلع منها. */
function addMoney(form) {
  const amt = form.querySelector('[data-role="mamt"]');
  const desc = form.querySelector('[data-role="mdesc"]');
  const r = parseExpense(amt.value);
  if (!r) {
    toastErr('اكتب المبلغ رقم، زي ٧٥ غدا');
    amt.focus();
    return;
  }
  const w = desc.value.trim() || r.w;
  amt.value = '';
  desc.value = '';
  ui.drafts.mamt = '';
  ui.drafts.mdesc = '';
  setK('exp', [...(state.day.exp || []), { a: r.a, w, c: ui.cat }]);
  toast(`اتسجل ${fmtNum(r.a)} جنيه · ${ui.cat}`);
}
function deleteExpense(i) {
  const key = state.cur;
  const ex = [...(state.day.exp || [])];
  const [gone] = ex.splice(i, 1);
  if (!gone) return;
  setK('exp', ex);
  toast(`اتمسح ${fmtNum(gone.a)} جنيه`, 'رجّع', async () => {
    if (state.cur === key) {
      const cur = [...(state.day.exp || [])];
      cur.splice(Math.min(i, cur.length), 0, gone);
      setK('exp', cur);
    } else {
      const doc = await getDoc(`day/${key}`);
      const cur = [...(doc?.data?.exp || [])];
      cur.splice(Math.min(i, cur.length), 0, gone);
      await setKOn(key, 'exp', cur);
    }
  });
}

// ---------- المهام والأفكار ----------
function addTaskFromForm(form) {
  const inp = form.querySelector('[data-role="taskin"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  refreshToday();
  addTask(v, { pri: ui.tpri, due: ui.twhen === 'today' ? state.today : '' });
  ui.tpri = false; // "مهم" بيرجع لوضعه بعد كل إضافة
  inp.value = '';
  ui.drafts.taskin = '';
  updateView();
  return toast(ui.twhen === 'today' ? 'اتضافت للنهارده' : 'اتضافت لبعدين');
}
function toggleTask(id) {
  const t = state.tasks.find((x) => String(x.id) === id);
  if (!t) return;
  refreshToday();
  patchItem('tasks', id, t.done ? { done: false, dAt: undefined } : { done: true, dAt: Date.now() });
}
function moveTask(id) {
  const t = state.tasks.find((x) => String(x.id) === id);
  if (!t) return;
  refreshToday();
  const inToday = t.due && t.due <= state.today;
  patchItem('tasks', id, { due: inToday ? '' : state.today });
  toast(inToday ? 'اتنقلت لبعدين' : 'اتنقلت للنهارده');
}
function deleteItem(name, id) {
  const r = removeItem(name, id);
  if (r) toast(name === 'tasks' ? 'اتمسحت المهمة' : 'اتمسحت الفكرة', 'رجّع', () => restoreItem(name, r));
}
function addIdeaFromForm(form) {
  const inp = form.querySelector('[data-role="ideain"]');
  const v = inp.value.trim(); // السطور الجديدة اللي جوه الفكرة بتفضل زي ما هي
  if (!v) return inp.focus();
  addIdea(v, ui.icat);
  inp.value = '';
  ui.drafts.ideain = '';
  return toast('الفكرة اتحفظت');
}

// ---------- مقاييسي والإعدادات ----------
const findMetric = (id) => state.metrics.find((x) => String(x.id) === String(id));

function openSettings() {
  ui.mf = null;
  ui.mfFrom = null;
  ui.pedit = false;
  openSheet(settingsSheet());
  updateSettings(sheetEl(), state, ui, sx());
}

/** فورم مقياس: من غير id = جديد، ومع id = تعديل. */
function openMetricForm(id) {
  const m = id ? findMetric(id) : null;
  ui.mfFrom = sheetEl()?.querySelector('[data-out="speriod"]') ? 'settings' : null;
  ui.mf = m
    ? { id: m.id, n: m.n, t: m.t, u: m.u || '', a: m.a, w: m.w || 'day', newArea: false }
    : { n: '', t: 'count', u: '', a: AREAS[0], w: 'day', newArea: false };
  openSheet({ ...metricForm(ui.mf, state), onClose: () => { ui.mf = null; } });
  updateMetricForm(sheetEl(), ui.mf, state);
}

function afterMetricForm() {
  if (ui.mfFrom === 'settings') openSettings();
  else requestClose();
}

function saveMetric() {
  const f = ui.mf;
  const n = f.n.trim();
  if (!n) {
    toastErr('اكتب اسم المقياس');
    return sheetEl()?.querySelector('[data-role="mname"]').focus();
  }
  const a = f.a.trim() || AREAS[0];
  const u = f.t === 'count' || f.t === 'num' ? f.u.trim() : '';
  if (f.id) {
    patchItem('metrics', f.id, { n, t: f.t, u: u || undefined, a, w: f.w });
    toast('اتحفظ التعديل');
  } else {
    addItem('metrics', { id: uid(), n, t: f.t, ...(u ? { u } : {}), a, w: f.w, on: true, at: Date.now() });
    toast(`اتضاف "${n}" لمقاييسي`);
  }
  return afterMetricForm();
}

function deleteMetric() {
  const r = removeItem('metrics', ui.mf.id);
  afterMetricForm();
  // الأرقام اللي اتسجلت قبل كده بتفضل في الأيام، و"رجّع" بيرجّع المقياس نفسه
  if (r) toast(`اتمسح "${r.item.n}"`, 'رجّع', () => restoreItem('metrics', r));
}

/** فترة جديدة من النهارده (١١ يوم). لو فيه فترة شغالة بتخلص امبارح. */
function startPeriod() {
  refreshToday();
  const before = structuredClone(state.periods);
  const cur = periodOf(state.periods, state.today);
  if (cur && cur.from === state.today) return toastErr('فيه فترة بادئة النهارده بالفعل');
  if (cur) patchItem('periods', cur.id, { to: addDays(state.today, -1) });
  const p = newPeriod(state.today);
  addItem('periods', p);
  return toast(`بدأت فترة: ${periodLabel(p)}`, 'رجّع', () => {
    state.periods = before;
    saveList('periods');
  });
}

function editPeriodDate(el) {
  const cur = periodOf(state.periods, state.today);
  if (!cur || !el.value) return;
  const key = el.dataset.role === 'pfrom' ? 'from' : 'to';
  const next = { from: cur.from, to: cur.to, [key]: el.value };
  if (next.from > next.to) {
    toastErr('تاريخ البداية لازم يبقى قبل النهاية');
    el.value = cur[key];
    return;
  }
  patchItem('periods', cur.id, next);
}

// ---------- النسخة الاحتياطية ----------
async function doExport() {
  try {
    const r = await exportFile();
    if (r.how === 'download') toast(`اتنزّل ملف فيه ${fmtNum(r.count)} مستند`);
    else if (r.how === 'share') toast('اتعمل الملف');
  } catch {
    toastErr('التصدير ماشتغلش، جرّب تاني');
  }
}
async function doImport(input) {
  const file = input.files?.[0];
  input.value = ''; // عشان لو اخترت نفس الملف تاني يشتغل
  if (!file) return;
  try {
    const r = await importFile(file);
    // العدد بالعربي: يوم واحد، يومين، ٣ أيام، ١١ يوم
    const count = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : `${fmtNum(n)} ${n <= 10 ? few : many}`);
    const parts = [];
    if (r.days) parts.push(count(r.days, 'يوم واحد', 'يومين', 'أيام', 'يوم'));
    if (r.lists) parts.push(count(r.lists, 'قايمة واحدة', 'قايمتين', 'قوايم', 'قايمة'));
    toast(parts.length ? `اتدمج: ${parts.join(' و')}` : 'مفيش جديد في الملف، كل اللي فيه موجود عندك');
  } catch (e) {
    toastErr(e.message || 'الاستيراد ماشتغلش');
  }
}

// ---------- دخول المزامنة (إيميل وباسورد) ----------
function loginError(e) {
  const t = `${e.code} ${e.message}`.toLowerCase();
  if (e instanceof TypeError) return 'مفيش نت';
  if (e.code === 'confirm_on') return 'الحساب اتعمل بس محتاج تأكيد بالإيميل. اقفل "Confirm email" في Supabase (README) وادخل تاني';
  if (t.includes('invalid') && t.includes('credential')) return 'الإيميل أو الباسورد غلط';
  if (t.includes('already') || t.includes('exists')) return 'الإيميل ده عليه حساب بالفعل، دوس "دخول"';
  if (t.includes('signup') && (t.includes('disabled') || t.includes('not allowed'))) return 'عمل الحسابات مقفول في المشروع، دوس "دخول"';
  if (t.includes('password')) return 'الباسورد ضعيف، خليه ٨ حروف على الأقل وفيه أرقام';
  if (e.status === 429) return 'محاولات كتير، استنى شوية وجرّب تاني';
  return 'حصلت مشكلة، جرّب تاني';
}
async function login(form, isNew) {
  const email = form.querySelector('[data-role="semail"]').value.trim();
  const pass = form.querySelector('[data-role="spass"]').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toastErr('اكتب إيميل صحيح');
  if (pass.length < (isNew ? 8 : 1)) return toastErr(isNew ? 'الباسورد ٨ حروف على الأقل' : 'اكتب الباسورد');
  try {
    toast(isNew ? 'بيعمل الحساب…' : 'بيدخل…');
    await (isNew ? signUp : signIn)(email, pass);
    ui.sf = { email: '' };
    updateSettings(sheetEl(), state, ui, sx());
    return toast(isNew ? 'الحساب اتعمل، والمزامنة شغالة' : 'دخلت، والمزامنة شغالة');
  } catch (e) {
    return toastErr(loginError(e));
  }
}

// ---------- تقرير الذكاء الاصطناعي ----------
/** لو التقرير موجود بيفتحه، ولو لأ بيعمله. */
function openAi(kind) {
  if (state.day[AI_FIELD[kind]]?.t) return openSheet(aiSheet(kind, state));
  return makeReport(kind);
}
async function makeReport(kind) {
  if (state.aiBusy) return undefined; // تقرير واحد في المرة
  if (!configured()) return toastErr(aiError({ code: 'off' }));
  if (state.sync === 'signedout') return toastErr(aiError({ signedOut: true }));
  const key = state.cur;
  state.aiBusy = kind;
  render();
  try {
    const r = await requestReport(kind);
    toast(Number.isFinite(r.left) ? `التقرير جاهز، فاضلك ${fmtNum(r.left)} النهارده` : 'التقرير جاهز');
    // نفتحه بس لو لسه على نفس اليوم، ومفيش شاشة تانية مفتوحة غير شاشة التقرير نفسها
    const sh = sheetEl();
    if (state.cur === key && (!sh || sh.querySelector('[data-act="airegen"]'))) openSheet(aiSheet(kind, state));
  } catch (e) {
    toastErr(aiError(e));
  } finally {
    state.aiBusy = null;
    render();
  }
  return undefined;
}

// ---------- التنقل ----------
/** يفتح يوم معيّن (من شريط الأيام أو الشهر أو "ارجع للنهارده"). loadDay بيحفظ اللي مستني الأول. */
async function goTo(key) {
  if (!key || key === state.cur) return;
  await loadDay(key);
  render();
  window.scrollTo(0, 0);
}

// ---------- sheet الشهر ----------
async function loadMonthStatus(ym) {
  const days = await allDays(); // كل الأيام المتسجلة (والمفتوح من الذاكرة)
  if (ui.month !== ym) return;
  ui.monthStatus = {};
  for (const { key, data } of days) if (key.startsWith(ym)) ui.monthStatus[key] = dayStatus(data);
  updateMonth(sheetEl(), ym, state, ui.monthStatus);
}
function openMonth() {
  ui.month = state.cur.slice(0, 7);
  ui.monthStatus = {};
  openSheet({ ...monthSheet(), onClose: () => { ui.month = null; } });
  updateMonth(sheetEl(), ui.month, state, ui.monthStatus);
  loadMonthStatus(ui.month);
}
function moveMonth(n) {
  ui.month = shiftMonth(ui.month, n);
  ui.monthStatus = {};
  updateMonth(sheetEl(), ui.month, state, ui.monthStatus);
  loadMonthStatus(ui.month);
}

// ---------- السطر في الفترة اللي إنت فيها (خط اليوم) ----------
function addLine(form) {
  const inp = form.querySelector('[data-role="linein"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  refreshToday();
  if (state.cur !== state.today) return undefined; // الخانة دي بتظهر في النهارده بس
  const { key, label } = lineTarget(new Date().getHours());
  inp.value = '';
  ui.drafts.linein = '';
  setK(key, mergeLine(state.day[key], v));
  return toast(`اتكتب في ${label}`);
}

// ---------- الدوسات ----------
document.addEventListener('click', async (e) => {
  if (e.target.id === 'ov') return requestClose(); // الدوس على الخلفية الغامقة
  const b = e.target.closest('button');
  if (!b) return;
  if ('close' in b.dataset) return requestClose();

  if (b.dataset.qmode) {
    ui.qmode = b.dataset.qmode;
    ui.qmenu = false; // اختار نوع ← القايمة تتقفل والخانة تاخد الكتابة
    updateDock($('#dock'), ui, state.cur !== state.today);
    return $('[data-role="quickin"]').focus();
  }
  if (b.dataset.qcat) {
    ui.qcat = b.dataset.qcat;
    return updateDock($('#dock'), ui, state.cur !== state.today);
  }

  const rg = b.closest('[data-rate]');
  if (rg && b.dataset.v) {
    const k = rg.dataset.rate;
    return setK(k, rateTap(state.day[k], +b.dataset.v));
  }
  if (b.dataset.tri) {
    const k = b.dataset.tri;
    return setK(k, cycleTri(state.day[k]));
  }
  const sg = b.closest('[data-seg]');
  if (sg && b.dataset.v) {
    const k = sg.dataset.seg;
    return setK(k, state.day[k] === b.dataset.v ? '' : b.dataset.v);
  }

  const id = b.dataset.id;
  switch (b.dataset.act) {
    // التنقل بين الأيام: شريط الأيام، والشهر، و"ارجع للنهارده"
    case 'day':
      if (isSheetOpen()) requestClose(); // لو من الشهر
      return goTo(b.dataset.key);
    case 'today':
      if (isSheetOpen()) requestClose();
      refreshToday();
      return goTo(state.today);
    case 'month': return openMonth();
    case 'mprev': return moveMonth(-1);
    case 'mnext': return moveMonth(1);
    case 'guide': return startGuide(b.dataset.q); // من "فاضل دلوقتي": من أول بند ناقص، أو من الاسم اللي دوست عليه
    case 'qmenu':
      ui.qmenu = !ui.qmenu;
      return updateDock($('#dock'), ui, state.cur !== state.today);
    case 'gnext': return nextStep();
    case 'sheet': return openNamed(b.dataset.sheet);
    case 'tab':
      state.tab = b.dataset.tab;
      render();
      return window.scrollTo(0, 0);
    case 'cat': // تصنيف المصروف: في سؤال الفلوس وفي تبويبة الفلوس
      ui.cat = b.dataset.c;
      for (const x of $$('[data-act="cat"]')) {
        const on = x.dataset.c === ui.cat;
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', on);
      }
      return updateParse();
    case 'delexp': return deleteExpense(+b.dataset.i);
    case 'tpri': ui.tpri = !ui.tpri; return updateView();
    case 'twhen': ui.twhen = b.dataset.v; return updateView();
    case 'tdone': return toggleTask(id);
    case 'tmove': return moveTask(id);
    case 'tdel': return deleteItem('tasks', id);
    case 'icat': ui.icat = b.dataset.c; return updateView();
    case 'ipin': {
      const it = state.ideas.find((x) => String(x.id) === id);
      return it && patchItem('ideas', id, { pin: !it.pin });
    }
    case 'idel': return deleteItem('ideas', id);
    // مقاييسي
    case 'mplus': return setMetric(id, (+(state.day.m?.[id]) || 0) + 1);
    case 'mtri': return setMetric(id, cycleTri(state.day.m?.[id]) || '');
    case 'medit': {
      const m = findMetric(id);
      if (!m) return undefined;
      openSheet(metricSheet(m));
      return syncFields(sheetEl(), state.day);
    }
    case 'settings': return openSettings();
    case 'mform': return openMetricForm(id);
    case 'mtoggle': {
      const m = findMetric(id);
      return m && patchItem('metrics', id, { on: !m.on });
    }
    case 'msugg': {
      const x = SUGGEST[+b.dataset.i];
      Object.assign(ui.mf, { n: x.n, t: x.t, u: x.u, a: x.a, w: x.w, newArea: false });
      const sh = sheetEl();
      sh.querySelector('[data-role="mname"]').value = x.n;
      sh.querySelector('[data-role="munit"]').value = x.u;
      return updateMetricForm(sh, ui.mf, state);
    }
    case 'mtype': ui.mf.t = b.dataset.v; return updateMetricForm(sheetEl(), ui.mf, state);
    case 'mwhen': ui.mf.w = b.dataset.v; return updateMetricForm(sheetEl(), ui.mf, state);
    case 'marea':
      Object.assign(ui.mf, { a: b.dataset.v, newArea: false });
      return updateMetricForm(sheetEl(), ui.mf, state);
    case 'mareanew': {
      Object.assign(ui.mf, { newArea: true, a: '' });
      updateMetricForm(sheetEl(), ui.mf, state);
      const inp = sheetEl().querySelector('[data-role="marea"]');
      inp.value = '';
      return inp.focus();
    }
    case 'msave': return saveMetric();
    case 'mdel': return deleteMetric();
    // الفترة
    case 'pnew': return startPeriod();
    case 'pedit': ui.pedit = !ui.pedit; return updateSettings(sheetEl(), state, ui, sx());
    // النسخة الاحتياطية
    case 'export': return doExport();
    case 'import': return sheetEl()?.querySelector('[data-role="importfile"]').click();
    // المزامنة
    case 'ssignup': return login(b.closest('form'), true);
    case 'ssync': return syncNow();
    // تقرير الذكاء الاصطناعي
    case 'ai': return openAi(b.dataset.kind);
    case 'airegen': return makeReport(b.dataset.kind);
    case 'sout':
      await signOut();
      return toast('خرجت. بياناتك لسه على الجهاز ده');
    default: return undefined;
  }
});

const FORMS = {
  addexp: addExpense, quick: handleQuick, addtask: addTaskFromForm, addidea: addIdeaFromForm, addmoney: addMoney, addline: addLine,
  slogin: (f) => login(f, false),
};
document.addEventListener('submit', (e) => {
  const fn = FORMS[e.target.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn(e.target);
});

// الدوس على أزرار الشريط (أو أي زرار عليه data-keep) وإنت بتكتب مايقفلش الكيبورد
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const typing = document.activeElement?.matches?.('input, textarea');
  if (typing && (b.closest('#dock') || 'keep' in b.dataset)) e.preventDefault();
});
// typing: بتكتب في الشريط السريع. typing-page: بتكتب في خانة جوه الصفحة نفسها (مش جوه شاشة من تحت)
const typingClass = (el) => {
  if (el.dataset?.role === 'quickin') return 'typing';
  if (el.matches?.('input, textarea') && el.closest('#view')) return 'typing-page';
  return null;
};
document.addEventListener('focusin', (e) => {
  const c = typingClass(e.target);
  if (c) document.documentElement.classList.add(c);
});
document.addEventListener('focusout', (e) => {
  const c = typingClass(e.target);
  if (c) document.documentElement.classList.remove(c);
});

// الكيبورد على آيفون مش بيصغّر الصفحة، فبنحسب ارتفاعه ونرفع الشريط فوقه.
// وعلى أندرويد زرار الرجوع بيقفل الكيبورد والخانة لسه مختارة، فالتبويبات تفضل مستخبية.
// فلو الشاشة كبرت فجأة (الكيبورد اتقفل) وإحنا بنكتب، بنسيب الخانة.
if (window.visualViewport) {
  const vv = window.visualViewport;
  let lastH = vv.height;
  const onVV = () => {
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--kb', `${kb}px`);
    const a = document.activeElement;
    if (vv.height > lastH + 120 && a?.matches?.('input, textarea') && !isSheetOpen()) a.blur();
    lastH = vv.height;
  };
  vv.addEventListener('resize', onVV);
  vv.addEventListener('scroll', onVV);
}
// ارتفاع الشريط بيتغيّر (صف التصنيفات وسطر المعاينة)، فالمساحة اللي تحت الصفحة بتتظبط معاه.
// ولما الشريط مخفي (في التبويبات التانية) ارتفاعه صفر.
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--dock-h', `${$('#dock').offsetHeight}px`);
}).observe($('#dock'));

// ---------- الكتابة ----------
document.addEventListener('input', (e) => {
  const el = e.target;
  const role = el.dataset.role;
  if (role === 'expin') return updateParse();
  if (role === 'quickin') return updateDock($('#dock'), ui, state.cur !== state.today);
  if (ui.mf && (role === 'mname' || role === 'munit' || role === 'marea')) {
    ui.mf[{ mname: 'n', munit: 'u', marea: 'a' }[role]] = el.value;
    return updateMetricForm(sheetEl(), ui.mf, state);
  }
  if (role === 'semail') {
    ui.sf.email = el.value;
    return undefined;
  }
  if (el.dataset.m) { // قيمة مقياس من شاشته
    const v = el.dataset.type === 'num' ? readNumber(el.value) : el.value;
    return setMetric(el.dataset.m, typeof v === 'string' && !v.trim() ? '' : v);
  }
  if (DRAFTS.includes(role)) {
    ui.drafts[role] = el.value;
    if (role === 'iq') updateView(); // البحث بيفلتر وإنت بتكتب
    return undefined;
  }
  const k = el.dataset.k;
  if (!k) return undefined;
  const t = el.dataset.type;
  let v = el.value;
  if (t === 'num') v = readNumber(v);
  else if (t === 'hrs' || t === 'dig') v = toEn(v).trim();
  return setK(k, v);
});

// تواريخ الفترة: بتتحفظ لما تختار من الـ date picker
document.addEventListener('change', (e) => {
  const role = e.target.dataset?.role;
  if (role === 'pfrom' || role === 'pto') editPeriodDate(e.target);
  if (role === 'importfile') doImport(e.target);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isSheetOpen()) requestClose();
});

// قبل ما التطبيق يروح للخلفية أو يتقفل: احفظ اللي مستني
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flush();
  else refreshToday();
});
window.addEventListener('pagehide', () => { flush(); });

// ---------- الشغل من غير نت (Service Worker) ----------
// على جهاز التطوير (localhost أو 127.0.0.1) مش بنسجّله، عشان التعديل يبان على طول من غير ما يتخزّن.
// ولو عايز تجرّبه هناك: ضيف ?sw=1 للرابط.
const devHost = ['localhost', '127.0.0.1'].includes(location.hostname) && !new URLSearchParams(location.search).has('sw');
if ('serviceWorker' in navigator && !devHost) {
  const hadOld = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // التطبيق ممكن يفضل مفتوح أيام، فكل ما يرجع قدامك بنشوف لو فيه نسخة جديدة
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) reg.update().catch(() => {});
    });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadOld) toast('فيه نسخة جديدة من التطبيق', 'حدّث', () => flush().then(() => location.reload()));
  });
}

// ---------- التشغيل ----------
$('#dock').innerHTML = dockHtml();
(async () => {
  await askPersist();
  await loadLists();
  await loadDay(state.today);
  hooks.saved = () => schedule(); // بعد أي حفظ بـ ٣ ثواني بيرفع الجديد
  await initSync();
})();
