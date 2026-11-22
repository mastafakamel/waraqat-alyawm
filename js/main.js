// main.js — تشغيل ورقة اليوم. كل الدوسات والكتابة بتتسمع هنا من مكان واحد (event delegation).

import {
  state, subscribe, loadDay, setK, setMany, setKOn, flush, loadLists, refreshToday, addIdea, addTask, getDayData,
  patchItem, removeItem, restoreItem, allDays, setMetric, addItem, saveList, patchSettings, hooks,
} from './store.js';
import { exportFile, importFile } from './backup.js';
import {
  configured, info as syncInfo, initSync, schedule, syncNow, signIn, signUp, signOut,
} from './sync.js';
import { askPersist, getDoc } from './db.js';
import {
  addDays, cycleTri, rateTap, rateSet, readNumber, readDuration, toEn, parseExpense, guessExpCat, fmtNum, missingStars,
  lineTarget, mergeLine, uid, newPeriod, periodOf, periodLabel, AREAS, INC_CATS, STAR_DUE,
  weekKeys, satWeekKeys, dayStatus, dayProgress, baselineFor, starSplit,
  hourSpan, sleepHoursSplit, fmtHour, fmtHours, togglePrayer, activeHabits, activeHabitGroups, activeTimeCats,
  HABIT_NUMS, goalRange, goalsSummary, evalPeriodGoal,
} from './logic.js';
import { monthSheet, updateMonth, shiftMonth } from './views/month.js';
import { $, $$, esc, openSheet, requestClose, isSheetOpen, sheetEl, syncFields, toast, toastErr, setHtml } from './ui.js';
import { renderHeader, updateStatus, renderToday, renderTabs } from './views/today.js';
import { renderTime, hourSheet, updateHourSheet } from './views/time.js';
import {
  GOAL_PRESETS, renderGoals, goalDetailSheet, updateGoalDetail, goalArchiveSheet, goalFormSheet, updateGoalForm,
} from './views/goals.js';
import {
  sheetFor, guideStep, updateOutputs, expEditSheet, taskEditSheet, ideaEditSheet,
} from './views/sheets.js';
import { dockHtml, updateDock } from './views/dock.js';
import { tasksShell, updateTasks } from './views/tasks.js';
import { ideasShell, updateIdeas } from './views/ideas.js';
import { moneyShell, updateMoney } from './views/money.js';
import { SUGGEST, metricSheet, metricForm, updateMetricForm } from './views/metrics.js';
import {
  settingsSheet, updateSettings, periodFormSheet, updatePeriodForm, periodDetailSheet, updatePeriodDetail,
  habitFormSheet, pillarFormSheet, timeCatFormSheet,
} from './views/settings.js';
import { requestReport, aiError, AI_FIELD } from './ai.js';
import { aiSheet, updateAiSheet } from './views/ai.js';

// حالة الواجهة بس (مش بتتحفظ)
const ui = {
  cat: 'أكل', catManual: false, guide: null, qmode: 'idea', qmenu: false, qcat: 'أكل', qcatManual: false,
  inccat: INC_CATS[0],
  tpri: false, twhen: 'today', tdate: '', tcat: '', tgoal: '', tfilt: 'all',
  icat: 'تاني', ifilt: 'all', drafts: {},
  planSub: 'goals',
  gfilt: 'all',
  gf: null, gdet: null,
  mf: null, mfFrom: null,
  accOpen: new Set(['period']),
  pf: null, pfFrom: null, pdet: null,
  hbf: null, grf: null, tcf: null,
  ee: null, te: null, ie: null,
  sf: { email: '' },
  month: null, monthStatus: {},
  tbrush: 'work', tperiod: 'all', hf: null,
};

// كاش لكل الأيام عشان حساب الأهداف وهدف الفترة يشتغل فوراً
let daysCache = [];
async function refreshDaysCache() {
  daysCache = await allDays();
  render();
}
function allDaysSync() {
  const out = daysCache.filter((d) => d.key !== state.cur);
  out.push({ key: state.cur, data: state.day });
  return out;
}
function goalSummaryNow() {
  return goalsSummary(state.goals, {
    days: allDaysSync(), tasks: state.tasks, metrics: state.metrics, today: state.today, settings: state.settings,
  });
}

// ---------- الأيام اللي حوالين اليوم المفتوح ----------
const win = { cur: null, today: null, days: new Map() };
async function loadWindow() {
  const want = new Set([...satWeekKeys(state.cur), ...weekKeys(state.today), ...weekKeys(addDays(state.cur, -1))]);
  want.delete(state.cur);
  const at = `${state.cur}|${state.today}`;
  const docs = await Promise.all([...want].map(async (k) => [k, (await getDoc(`day/${k}`))?.data || null]));
  if (`${state.cur}|${state.today}` !== at) return;
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
  const pct = {};
  for (const [k, d] of win.days) {
    status[k] = dayStatus(d, state.settings);
    pct[k] = dayProgress(d, state.settings);
  }
  const base = {};
  for (const m of ['sleep', 'screen', 'work', 'spend']) base[m] = baselineFor(days, state.cur, m);
  const curPeriod = periodOf(state.periods, state.cur);
  const periodEv = curPeriod
    ? evalPeriodGoal(curPeriod, { days: allDaysSync(), metrics: state.metrics, today: state.today, settings: state.settings })
    : null;
  const prevNextp = (win.days.get(addDays(state.today, -1))?.nextp || '').trim();
  return { status, pct, base, hour: new Date().getHours(), gsum: goalSummaryNow(), curPeriod, periodEv, prevNextp };
}
const sx = () => ({ configured: configured(), ...syncInfo });
const DRAFTS = ['taskin', 'ideain', 'iq', 'mamt', 'mdesc', 'iamt', 'idesc', 'linein'];

const theme = new URLSearchParams(location.search).get('theme');
if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;

// ---------- الرسم ----------
const TABS = {
  tasks: { shell: tasksShell, update: (v) => updateTasks(v, state, ui) },
  ideas: { shell: ideasShell, update: (v) => updateIdeas(v, state, ui) },
  money: { shell: moneyShell, update: (v) => updateMoney(v, state, ui, allDays) },
};
let shown = null;

function render() {
  const ctx = winCtx();
  setHtml($('#top'), renderHeader(state, ctx));
  updateStatus($('#top'), state);
  const view = $('#view');
  if (state.tab === 'tasks' && ui.planSub !== 'tasks') {
    setHtml(view, renderGoals(state, ui, ctx.gsum));
    shown = 'goals';
  } else if (TABS[state.tab]) {
    const tab = TABS[state.tab];
    if (shown !== state.tab) {
      view.innerHTML = tab.shell(state, ui);
      view._html = null;
      shown = state.tab;
    }
    tab.update(view);
  } else if (state.tab === 'time') {
    setHtml(view, renderTime(state, ui, ctx));
    shown = 'time';
  } else {
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
  updateDock(dock, ui, state.cur !== state.today, state.settings);
  const sh = sheetEl();
  if (sh) {
    syncFields(sh, state.day);
    updateOutputs(sh, state);
    updateSettings(sh, state, ui, sx(), allDaysSync());
    if (ui.mf) updateMetricForm(sh, ui.mf, state);
    if (ui.pf) updatePeriodForm(sh, ui.pf, state);
    if (ui.pdet) {
      const p = state.periods.find((x) => String(x.id) === String(ui.pdet));
      if (p) {
        const pev = evalPeriodGoal(p, { days: allDaysSync(), metrics: state.metrics, today: state.today, settings: state.settings });
        updatePeriodDetail(sh, p, pev, state);
      }
    }
    updateAiSheet(sh, state);
    if (ui.month) updateMonth(sh, ui.month, state, ui.monthStatus);
    if (ui.hf) updateHourSheet(sh, ui.hf, state);
    if (ui.gdet) {
      const g = state.goals.find((x) => String(x.id) === String(ui.gdet));
      if (g) updateGoalDetail(sh, g, ctx.gsum.evals.get(g.id), state);
    }
  }
}
subscribe(render);
const updateView = () => {
  if (state.tab === 'tasks' && ui.planSub !== 'tasks') render();
  else TABS[state.tab]?.update($('#view'));
};

// ---------- ملء ساعات النوم التلقائي + إصلاح ساعات نص الليل ----------
function mergeAutoSleep(hrsObj, targetHours) {
  const next = { ...(hrsObj || {}) };
  // شيل أي خانات نوم قديمة كانت auto عشان لو عدّل الوقت تتحدث نضيف
  for (const [h, slot] of Object.entries(next)) {
    if (slot?.c === 'sleep' && slot?.auto) {
      if (slot.t) next[h] = { c: '', t: slot.t };
      else delete next[h];
    }
  }
  for (const h of targetHours) {
    const k = String(h);
    const cur = next[k];
    if (!cur || !cur.c) {
      next[k] = cur?.t ? { c: 'sleep', t: cur.t, auto: 1 } : { c: 'sleep', auto: 1 };
    }
  }
  return Object.keys(next).length ? next : '';
}

async function autoFillSleepIfOn() {
  if (!state.settings.autoFillSleep) return;
  if (!state.day.sleep || !state.day.wake) return;
  const { today: todayHrs, prev: prevHrs } = sleepHoursSplit(state.day.sleep, state.day.wake, state.settings.dayStart);
  if (!todayHrs.length && !prevHrs.length) return;
  const nextCur = mergeAutoSleep(state.day.hrs, todayHrs);
  setK('hrs', nextCur);
  if (prevHrs.length) {
    const prevKey = addDays(state.cur, -1);
    const prevDoc = await getDayData(prevKey);
    const nextPrev = mergeAutoSleep(prevDoc.hrs, prevHrs);
    await setKOn(prevKey, 'hrs', nextPrev);
    refreshDaysCache();
  }
}

async function fillSleepHours() {
  const { today: todayHrs, prev: prevHrs } = sleepHoursSplit(state.day.sleep, state.day.wake, state.settings.dayStart);
  if (!todayHrs.length && !prevHrs.length) return openNamed('sleep');
  const curKey = state.cur;
  const prevKey = addDays(curKey, -1);
  const beforeCur = structuredClone(state.day.hrs || {});
  const nextCur = { ...beforeCur };
  for (const h of todayHrs) {
    const old = nextCur[String(h)];
    nextCur[String(h)] = old?.t ? { c: 'sleep', t: old.t, auto: 1 } : { c: 'sleep', auto: 1 };
  }
  saveHrs(nextCur);

  let beforePrev = null;
  if (prevHrs.length) {
    const pData = await getDayData(prevKey);
    beforePrev = structuredClone(pData.hrs || {});
    const nextPrev = { ...beforePrev };
    for (const h of prevHrs) {
      const old = nextPrev[String(h)];
      nextPrev[String(h)] = old?.t ? { c: 'sleep', t: old.t, auto: 1 } : { c: 'sleep', auto: 1 };
    }
    await setKOn(prevKey, 'hrs', Object.keys(nextPrev).length ? nextPrev : '');
    refreshDaysCache();
  }

  const msg = prevHrs.length && todayHrs.length
    ? `اتملى ${fmtHours(todayHrs.length)} الصبح و${fmtHours(prevHrs.length)} ليلة امبارح`
    : prevHrs.length ? `اتملى ${fmtHours(prevHrs.length)} في ليلة امبارح` : `اتملى ${fmtHours(todayHrs.length)} نوم`;
  return toast(msg, 'رجّع', async () => {
    if (state.cur === curKey) saveHrs(beforeCur);
    else await setKOn(curKey, 'hrs', Object.keys(beforeCur).length ? beforeCur : '');
    if (beforePrev !== null) await setKOn(prevKey, 'hrs', Object.keys(beforePrev).length ? beforePrev : '');
    refreshDaysCache();
  });
}

// ---------- التسجيل السريع ----------
async function handleQuick(form) {
  const inp = form.querySelector('[data-role="quickin"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  refreshToday();
  const today = state.today;
  const where = state.cur !== today ? ' في النهارده' : '';

  if (ui.qmode === 'idea') {
    addIdea(v, state.settings.ideaCats?.at(-1) || 'تاني');
    toast('الفكرة اتحفظت');
  } else if (ui.qmode === 'task') {
    addTask(v);
    toast('المهمة اتضافت للنهارده');
  } else if (ui.qmode === 'exp') {
    const r = parseExpense(v);
    if (!r) return toastErr('اكتب المبلغ رقم، زي ٧٥ غدا');
    const d = await getDayData(today);
    await setKOn(today, 'exp', [...(d.exp || []), { a: r.a, w: r.w, c: ui.qcat }]);
    if (d.noSpend) await setKOn(today, 'noSpend', '');
    if (state.cur !== today) refreshDaysCache();
    ui.qcatManual = false;
    toast(`اتسجل ${fmtNum(r.a)} جنيه · ${ui.qcat}${where}`);
  } else {
    const nowH = new Date().getHours();
    const { key, label } = lineTarget(nowH, state.settings.dayStart);
    const d = await getDayData(today);
    await setKOn(today, key, mergeLine(d[key], v));
    const curHrs = { ...(d.hrs || {}) };
    const slot = curHrs[String(nowH)] || { c: '' };
    curHrs[String(nowH)] = { c: slot.c || '', t: mergeLine(slot.t, v) };
    await setKOn(today, 'hrs', curHrs);
    if (state.cur !== today) refreshDaysCache();
    toast(`اتكتب في ${fmtHour(nowH)} (${label})${where}`);
  }
  inp.value = '';
  updateDock($('#dock'), ui, state.cur !== today, state.settings);
  return undefined;
}

function withHistory() {
  ui.hist = [...win.days].map(([key, data]) => ({ key, data }));
}

function afterOpen() {
  const sh = sheetEl();
  syncFields(sh, state.day);
  updateOutputs(sh, state);
  updateParse();
  const f = sh?.querySelector('[data-focus]');
  if (f && !f.value) f.focus({ preventScroll: true });
}

function openNamed(id, { keepRows = false } = {}) {
  if (!keepRows) ui.workRows = 1;
  withHistory();
  openSheet(sheetFor(id, state, ui));
  afterOpen();
}

// ---------- سؤال بسؤال ----------
function startGuide(startKey) {
  const { now, later } = starSplit(state.day, state.cur, state.today, new Date().getHours(), state.settings);
  const miss = [...now, ...later].map((x) => x.k);
  if (!miss.length) return;
  const at = Math.max(0, miss.indexOf(startKey));
  ui.guide = { order: [...miss.slice(at), ...miss.slice(0, at)], i: 0 };
  showStep();
}
function showStep() {
  const g = ui.guide;
  withHistory();
  openSheet({
    ...guideStep(g.order[g.i], g.i, g.order.length, state, ui),
    onClose: () => {
      ui.guide = null;
      render();
      if (!missingStars(state.day, state.settings).length) toast('اليوم اتسجل كله');
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

// ---------- الفلوس: مصروف + تعديل + دخل ----------
function syncExpCatBtns(cat) {
  for (const x of $$('[data-act="cat"]')) {
    const on = x.dataset.c === cat;
    x.classList.toggle('on', on);
    x.setAttribute('aria-pressed', on);
  }
}

function updateParse() {
  const sh = sheetEl();
  const out = sh?.querySelector('[data-out="parse"]');
  const inp = sh?.querySelector('[data-role="expin"]');
  if (!out || !inp) return;
  const v = inp.value.trim();
  if (!v) {
    out.textContent = '';
    out.classList.remove('err');
    ui.catManual = false;
    return;
  }
  const r = parseExpense(v);
  if (r?.w && !ui.catManual) {
    const g = guessExpCat(r.w, state.settings.expCats);
    if (g && g !== ui.cat) {
      ui.cat = g;
      syncExpCatBtns(g);
    }
  }
  out.classList.toggle('err', !r);
  out.innerHTML = r ? `هيتسجل: <b>${fmtNum(r.a)} جنيه</b>${r.w ? `، ${esc(r.w)}` : ''}، ${esc(ui.cat)}` : 'اكتب المبلغ رقم، زي ٧٥ غدا';
}

function addExpense(form) {
  const inp = form.querySelector('[data-role="expin"]');
  const r = parseExpense(inp.value);
  if (!r) {
    toastErr('اكتب المبلغ رقم، زي ٧٥ غدا');
    inp.focus();
    return;
  }
  setMany({ exp: [...(state.day.exp || []), { a: r.a, w: r.w, c: ui.cat }], noSpend: '' });
  inp.value = '';
  ui.catManual = false;
  updateParse();
  toast(`اتسجل ${fmtNum(r.a)} جنيه · ${ui.cat}`);
}

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
  ui.catManual = false;
  setMany({ exp: [...(state.day.exp || []), { a: r.a, w, c: ui.cat }], noSpend: '' });
  toast(`اتسجل ${fmtNum(r.a)} جنيه · ${ui.cat}`);
}

function openExpEdit(i) {
  const item = (state.day.exp || [])[i];
  if (!item) return;
  ui.ee = { i, c: item.c };
  openSheet({ ...expEditSheet(item, i, state), onClose: () => { ui.ee = null; } });
}

function saveExpEdit() {
  if (!ui.ee) return;
  const sh = sheetEl();
  const a = readNumber(sh?.querySelector('[data-role="eeamt"]')?.value || '');
  if (!a || a <= 0) {
    toastErr('اكتب مبلغ صحيح');
    sh?.querySelector('[data-role="eeamt"]')?.focus();
    return;
  }
  const w = (sh?.querySelector('[data-role="eedesc"]')?.value || '').trim();
  const ex = [...(state.day.exp || [])];
  if (!ex[ui.ee.i]) return;
  ex[ui.ee.i] = { a, w, c: ui.ee.c };
  setK('exp', ex);
  requestClose();
  toast('اتحفظ تعديل المصروف');
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

function addIncome(form) {
  const amt = form.querySelector('[data-role="iamt"]');
  const desc = form.querySelector('[data-role="idesc"]');
  const a = readNumber(amt.value);
  if (!a || a <= 0) {
    toastErr('اكتب مبلغ الدخل');
    amt.focus();
    return;
  }
  const w = desc.value.trim();
  amt.value = '';
  desc.value = '';
  ui.drafts.iamt = '';
  ui.drafts.idesc = '';
  setK('inc', [...(state.day.inc || []), { a, w, c: ui.inccat }]);
  toast(`اتسجل دخل ${fmtNum(a)} جنيه`);
}

function deleteIncome(i) {
  const list = [...(state.day.inc || [])];
  const [gone] = list.splice(i, 1);
  if (!gone) return;
  setK('inc', list);
  toast(`اتمسح دخل ${fmtNum(gone.a)} جنيه`, 'رجّع', () => {
    const cur = [...(state.day.inc || [])];
    cur.splice(Math.min(i, cur.length), 0, gone);
    setK('inc', cur);
  });
}

// ---------- المهام والأفكار ----------
function resolveTaskDue(when, customDate) {
  if (when === 'today') return state.today;
  if (when === 'tomorrow') return addDays(state.today, 1);
  if (when === 'date') return customDate || state.today;
  return '';
}

function addTaskFromForm(form) {
  const inp = form.querySelector('[data-role="taskin"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  refreshToday();
  const customDate = form.querySelector('[data-role="tdate"]')?.value || ui.tdate;
  const due = resolveTaskDue(ui.twhen, customDate);
  addTask(v, { pri: ui.tpri, due, goalId: ui.tgoal || '', cat: ui.tcat || '' });
  ui.tpri = false;
  inp.value = '';
  ui.drafts.taskin = '';
  updateView();
  return toast(ui.tgoal ? 'اتضافت واتربطت بالهدف' : due === state.today ? 'اتضافت للنهارده' : due ? 'اتجدولت المهمة' : 'اتضافت لبعدين');
}

function openTaskEdit(id) {
  const t = state.tasks.find((x) => String(x.id) === String(id));
  if (!t) return;
  const tom = addDays(state.today, 1);
  let when = 'later';
  if (t.due && t.due <= state.today) when = 'today';
  else if (t.due === tom) when = 'tomorrow';
  else if (t.due) when = 'date';
  ui.te = { id: t.id, t: t.t, when, date: t.due || tom, pri: !!t.pri, cat: t.cat || '', goalId: t.goalId || '' };
  openSheet({ ...taskEditSheet(t, ui.te, state), onClose: () => { ui.te = null; } });
}

function refreshTaskEditSheet() {
  const sh = sheetEl();
  if (!sh || !ui.te) return;
  for (const b of sh.querySelectorAll('[data-act="tewhen"]')) b.setAttribute('aria-pressed', b.dataset.v === ui.te.when);
  const dt = sh.querySelector('[data-role="tedate"]');
  if (dt) dt.hidden = ui.te.when !== 'date';
  sh.querySelector('[data-act="tepri"]')?.setAttribute('aria-pressed', !!ui.te.pri);
  for (const b of sh.querySelectorAll('[data-act="tecat"]')) b.setAttribute('aria-pressed', b.dataset.v === ui.te.cat);
  for (const b of sh.querySelectorAll('[data-act="tegoal"]')) b.setAttribute('aria-pressed', String(b.dataset.id) === String(ui.te.goalId));
}

function saveTaskEdit() {
  if (!ui.te) return;
  const sh = sheetEl();
  const txt = (sh?.querySelector('[data-role="tetxt"]')?.value || '').trim();
  if (!txt) {
    toastErr('اكتب نص المهمة');
    sh?.querySelector('[data-role="tetxt"]')?.focus();
    return;
  }
  const customDate = sh?.querySelector('[data-role="tedate"]')?.value || ui.te.date;
  const due = resolveTaskDue(ui.te.when, customDate);
  patchItem('tasks', ui.te.id, {
    t: txt, due, pri: !!ui.te.pri,
    cat: ui.te.cat || undefined,
    goalId: ui.te.goalId || undefined,
  });
  requestClose();
  toast('اتحفظ تعديل المهمة');
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
  const v = inp.value.trim();
  if (!v) return inp.focus();
  addIdea(v, ui.icat);
  inp.value = '';
  ui.drafts.ideain = '';
  return toast('الفكرة اتحفظت');
}
function openIdeaEdit(id) {
  const it = state.ideas.find((x) => String(x.id) === String(id));
  if (!it) return;
  ui.ie = { id: it.id, t: it.t, c: it.c };
  openSheet({ ...ideaEditSheet(it, ui.ie, state), onClose: () => { ui.ie = null; } });
}
function saveIdeaEdit() {
  if (!ui.ie) return;
  const sh = sheetEl();
  const txt = (sh?.querySelector('[data-role="ietxt"]')?.value || '').trim();
  if (!txt) {
    toastErr('اكتب نص الفكرة');
    sh?.querySelector('[data-role="ietxt"]')?.focus();
    return;
  }
  patchItem('ideas', ui.ie.id, { t: txt, c: ui.ie.c });
  requestClose();
  toast('اتحفظ تعديل الفكرة');
}
function ideaToTask(id) {
  const it = state.ideas.find((x) => String(x.id) === String(id));
  if (!it) return;
  refreshToday();
  const txt = it.t.replace(/\s+/g, ' ').trim().slice(0, 140);
  addTask(txt, { due: state.today });
  toast('اتحولت لمهمة في النهارده ✓');
}

// ---------- الإعدادات ومقاييسي ----------
const findMetric = (id) => state.metrics.find((x) => String(x.id) === String(id));

function openSettings(focusAcc = null) {
  ui.mf = null;
  ui.pf = null;
  ui.pdet = null;
  ui.hbf = null;
  ui.grf = null;
  ui.tcf = null;
  if (focusAcc) ui.accOpen.add(focusAcc);
  openSheet(settingsSheet());
  updateSettings(sheetEl(), state, ui, sx(), allDaysSync());
}

function openMetricForm(id) {
  const m = id ? findMetric(id) : null;
  ui.mfFrom = sheetEl()?.querySelector('[data-out="sroot"]') ? 'settings' : null;
  ui.mf = m
    ? { id: m.id, n: m.n, t: m.t, u: m.u || '', a: m.a, w: m.w || 'day', newArea: false }
    : { n: '', t: 'count', u: '', a: AREAS[0], w: 'day', newArea: false };
  openSheet({ ...metricForm(ui.mf, state), onClose: () => { ui.mf = null; } });
  updateMetricForm(sheetEl(), ui.mf, state);
}
function afterMetricForm() {
  if (ui.mfFrom === 'settings') openSettings('metrics');
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
  if (r) toast(`اتمسح "${r.item.n}"`, 'رجّع', () => restoreItem('metrics', r));
}

// ---------- إدارة العادات والأركان ومجالات الوقت في الإعدادات ----------
function openHabitForm(k) {
  const h = k ? state.settings.habits.find((x) => x.k === k) : null;
  ui.hbf = h
    ? { origK: h.k, n: h.n, g: h.g, numU: h.numU || '' }
    : { origK: '', n: '', g: state.settings.habitGroups[0]?.id || 'deen', numU: '' };
  openSheet({ ...habitFormSheet(ui.hbf, state), onClose: () => { ui.hbf = null; } });
}
function saveHabitForm() {
  const f = ui.hbf;
  if (!f) return;
  const sh = sheetEl();
  const n = (sh?.querySelector('[data-role="hfname"]')?.value ?? f.n ?? '').trim();
  if (!n) {
    toastErr('اكتب اسم العادة');
    sh?.querySelector('[data-role="hfname"]')?.focus();
    return;
  }
  const numU = (sh?.querySelector('[data-role="hfunit"]')?.value ?? f.numU ?? '').trim();
  const list = structuredClone(state.settings.habits);
  if (f.origK) {
    const it = list.find((x) => x.k === f.origK);
    if (it) {
      it.n = n;
      it.g = f.g;
      if (numU) {
        it.numU = numU;
        if (!it.numK) it.numK = `hn_${it.k}`;
      } else if (!it.workout) {
        delete it.numU;
        delete it.numK;
      }
    }
    patchSettings({ habits: list });
    toast('اتحفظ تعديل العادة');
  } else {
    const k = `h_${uid().slice(-5)}`;
    list.push({ k, n, g: f.g, on: true, ...(numU ? { numK: `hn_${k}`, numU } : {}) });
    patchSettings({ habits: list });
    toast(`اتضافت عادة «${n}»`);
  }
  openSettings('habits');
}
function deleteHabitForm() {
  if (!ui.hbf?.origK) return;
  const before = structuredClone(state.settings.habits);
  const next = before.filter((x) => x.k !== ui.hbf.origK);
  if (!next.length) return toastErr('لازم تفضل عادة واحدة على الأقل');
  patchSettings({ habits: next });
  openSettings('habits');
  return toast('اتمسحت العادة', 'رجّع', () => patchSettings({ habits: before }));
}

function openPillarForm() {
  ui.grf = { name: '', icon: 'target' };
  openSheet({ ...pillarFormSheet(ui.grf), onClose: () => { ui.grf = null; } });
}
function savePillarForm() {
  const sh = sheetEl();
  const name = (sh?.querySelector('[data-role="grfname"]')?.value || '').trim();
  if (!name) {
    toastErr('اكتب اسم الركن');
    sh?.querySelector('[data-role="grfname"]')?.focus();
    return;
  }
  const next = [...state.settings.habitGroups, { id: `g_${uid().slice(-5)}`, name, icon: ui.grf?.icon || 'target' }];
  patchSettings({ habitGroups: next });
  toast(`اتضاف ركن «${name}»`);
  openSettings('habits');
}

function openTimeCatForm(id) {
  const c = id ? state.settings.timeCats.find((x) => x.id === id) : null;
  ui.tcf = c
    ? { origId: c.id, name: c.name, icon: c.icon || 'target', color: c.color || c.id, custom: !!c.custom }
    : { origId: '', name: '', icon: 'target', color: 'learn', custom: true };
  openSheet({ ...timeCatFormSheet(ui.tcf), onClose: () => { ui.tcf = null; } });
}
function saveTimeCatForm() {
  const f = ui.tcf;
  if (!f) return;
  const sh = sheetEl();
  const name = (sh?.querySelector('[data-role="tcfname"]')?.value || '').trim();
  if (!name) {
    toastErr('اكتب اسم المجال');
    sh?.querySelector('[data-role="tcfname"]')?.focus();
    return;
  }
  const list = structuredClone(state.settings.timeCats);
  if (f.origId) {
    const it = list.find((x) => x.id === f.origId);
    if (it) Object.assign(it, { name, icon: f.icon, color: f.color });
  } else {
    list.push({ id: `tc_${uid().slice(-5)}`, name, icon: f.icon, color: f.color, on: true, custom: true });
  }
  patchSettings({ timeCats: list });
  toast('اتحفظ مجال الوقت');
  openSettings('cats');
}
function deleteTimeCatForm() {
  if (!ui.tcf?.origId) return;
  const before = structuredClone(state.settings.timeCats);
  patchSettings({ timeCats: before.filter((x) => x.id !== ui.tcf.origId) });
  openSettings('cats');
  toast('اتمسح المجال', 'رجّع', () => patchSettings({ timeCats: before }));
}

// ---------- الفترات وهدف الفترة الواحد ----------
const findPeriod = (id) => state.periods.find((x) => String(x.id) === String(id));

function openPeriodDetail(id) {
  const p = findPeriod(id);
  if (!p) return;
  ui.pdet = p.id;
  ui.pf = null;
  openSheet({ ...periodDetailSheet(p), onClose: () => { ui.pdet = null; } });
  const ev = evalPeriodGoal(p, { days: allDaysSync(), metrics: state.metrics, today: state.today, settings: state.settings });
  updatePeriodDetail(sheetEl(), p, ev, state);
}

function defaultPeriodSource(kind) {
  if (kind === 'project') return 'steps';
  return 'manual';
}
function defaultPeriodUnit(kind, src) {
  if (kind === 'build') return 'يوم';
  if (kind === 'quit') return 'يوم نضيف';
  if (kind === 'project') return src === 'steps' ? 'خطوة' : src === 'work' || src.startsWith('proj:') ? 'ساعة' : 'وحدة';
  if (src === 'spend' || src === 'income') return 'ج';
  if (src === 'work') return 'ساعة';
  return '';
}

function openPeriodForm(id) {
  refreshToday();
  ui.pfFrom = sheetEl()?.querySelector('[data-out="sroot"]') ? 'settings' : null;
  const p = id ? findPeriod(id) : null;
  const g = p?.goal || null;
  const len = p ? 0 : 11;
  const from = p ? p.from : state.today;
  const to = p ? p.to : addDays(state.today, len - 1);
  const gKind = g?.kind || 'build';
  const gSource = g?.source || defaultPeriodSource(gKind);
  const daysLen = Math.max(1, Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 864e5) + 1);
  ui.pdet = null;
  ui.pf = {
    id: p?.id || null,
    len,
    from,
    to,
    name: p?.name || '',
    gTitle: g?.title || '',
    gKind,
    gSource,
    gDir: g?.dir || 'min',
    gTarget: g?.target != null ? String(g.target) : String(Math.max(1, Math.round(daysLen * 0.8))),
    gUnit: g?.unit ?? defaultPeriodUnit(gKind, gSource),
    gStepsText: Array.isArray(g?.steps) ? g.steps.map((x) => x.t).join('\n') : '',
  };
  openSheet({ ...periodFormSheet(ui.pf), onClose: () => { ui.pf = null; } });
  updatePeriodForm(sheetEl(), ui.pf, state);
}

function savePeriodForm() {
  const f = ui.pf;
  if (!f) return;
  const sh = sheetEl();
  const from = (sh?.querySelector('[data-role="pffrom"]')?.value || f.from || '').trim();
  const to = (sh?.querySelector('[data-role="pfto"]')?.value || f.to || '').trim();
  if (!from || !to || from > to) {
    toastErr('تاريخ البداية لازم يبقى قبل النهاية');
    return;
  }
  const name = (sh?.querySelector('[data-role="pfname"]')?.value ?? f.name ?? '').trim();
  const gTitle = (sh?.querySelector('[data-role="pgtitle"]')?.value ?? f.gTitle ?? '').trim();

  let goal;
  if (gTitle) {
    const old = f.id ? findPeriod(f.id)?.goal : null;
    const isSteps = f.gKind === 'project' && f.gSource === 'steps';
    const tVal = isSteps ? 0 : readNumber(sh?.querySelector('[data-role="pgtarget"]')?.value ?? f.gTarget);
    if (!isSteps && (!tVal || tVal <= 0)) {
      toastErr('اكتب الرقم المستهدف لنجاح الفترة');
      sh?.querySelector('[data-role="pgtarget"]')?.focus();
      return;
    }
    const unit = isSteps ? 'خطوة' : ((sh?.querySelector('[data-role="pgunit"]')?.value ?? f.gUnit ?? '').trim() || defaultPeriodUnit(f.gKind, f.gSource));
    const steps = isSteps
      ? (f.id && Array.isArray(old?.steps)
        ? old.steps
        : (sh?.querySelector('[data-role="pgsteps"]')?.value ?? f.gStepsText ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((t) => ({ id: uid(), t, done: false })))
      : undefined;
    goal = {
      title: gTitle,
      kind: f.gKind,
      source: f.gSource,
      ...(f.gKind === 'target' ? { dir: f.gDir === 'max' ? 'max' : 'min' } : {}),
      ...(isSteps ? { steps } : { target: tVal, unit }),
      ...(old?.log ? { log: old.log } : {}),
      ...(old?.val != null ? { val: old.val } : {}),
    };
  }

  if (f.id) {
    patchItem('periods', f.id, { from, to, name: name || undefined, goal: goal || undefined });
    toast('اتحفظت الفترة');
    openPeriodDetail(f.id);
    return;
  }

  const before = structuredClone(state.periods);
  const cur = periodOf(state.periods, from);
  if (cur && cur.from < from) patchItem('periods', cur.id, { to: addDays(from, -1) });
  const p = newPeriod(from, 1, { to, ...(name ? { name } : {}), ...(goal ? { goal } : {}) });
  addItem('periods', p);
  if (ui.pfFrom === 'settings') openSettings('period');
  else requestClose();
  toast(`بدأت فترة جديدة: ${name || periodLabel(p)}`, 'رجّع', () => {
    state.periods = before;
    saveList('periods');
  });
}

function deletePeriod(id) {
  const r = removeItem('periods', id);
  if (!r) return;
  if (ui.pfFrom === 'settings') openSettings('period');
  else requestClose();
  toast('اتمسحت الفترة', 'رجّع', () => restoreItem('periods', r));
}

function logPeriodGoalDay(pid, rawVal) {
  const p = findPeriod(pid);
  if (!p?.goal) return;
  refreshToday();
  const log = { ...(p.goal.log || {}) };
  if (rawVal === '') delete log[state.today];
  else log[state.today] = +rawVal;
  patchItem('periods', pid, { goal: { ...p.goal, log } });
}

function adjustPeriodGoalVal(pid, delta) {
  const p = findPeriod(pid);
  if (!p?.goal) return;
  const val = Math.max(0, (+p.goal.val || 0) + delta);
  patchItem('periods', pid, { goal: { ...p.goal, val } });
}

function togglePeriodStep(pid, sid) {
  const p = findPeriod(pid);
  if (!p?.goal || !Array.isArray(p.goal.steps)) return;
  const steps = p.goal.steps.map((x) => (String(x.id) === String(sid) ? { ...x, done: !x.done } : x));
  patchItem('periods', pid, { goal: { ...p.goal, steps } });
}

function deletePeriodStep(pid, sid) {
  const p = findPeriod(pid);
  if (!p?.goal || !Array.isArray(p.goal.steps)) return;
  const before = structuredClone(p.goal.steps);
  const steps = p.goal.steps.filter((x) => String(x.id) !== String(sid));
  patchItem('periods', pid, { goal: { ...p.goal, steps } });
  toast('اتمسحت الخطوة', 'رجّع', () => patchItem('periods', pid, { goal: { ...p.goal, steps: before } }));
}

function addPeriodStep(form) {
  const pid = form.dataset.pid;
  const inp = form.querySelector('[data-role="pgstepin"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  const p = findPeriod(pid);
  if (!p?.goal) return undefined;
  const steps = [...(p.goal.steps || []), { id: uid(), t: v, done: false }];
  inp.value = '';
  patchItem('periods', pid, { goal: { ...p.goal, steps } });
  return toast('اتضافت الخطوة');
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
  input.value = '';
  if (!file) return;
  try {
    const r = await importFile(file);
    await refreshDaysCache();
    const count = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : `${fmtNum(n)} ${n <= 10 ? few : many}`);
    const parts = [];
    if (r.days) parts.push(count(r.days, 'يوم واحد', 'يومين', 'أيام', 'يوم'));
    if (r.lists) parts.push(count(r.lists, 'قايمة واحدة', 'قايمتين', 'قوايم', 'قايمة'));
    toast(parts.length ? `اتدمج: ${parts.join(' و')}` : 'مفيش جديد في الملف، كل اللي فيه موجود عندك');
  } catch (e) {
    toastErr(e.message || 'الاستيراد ماشتغلش');
  }
}

// ---------- دخول المزامنة ----------
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
    updateSettings(sheetEl(), state, ui, sx(), allDaysSync());
    return toast(isNew ? 'الحساب اتعمل، والمزامنة شغالة' : 'دخلت، والمزامنة شغالة');
  } catch (e) {
    return toastErr(loginError(e));
  }
}

// ---------- تقرير الذكاء الاصطناعي ----------
function openAi(kind) {
  if (state.day[AI_FIELD[kind]]?.t) return openSheet(aiSheet(kind, state));
  return makeReport(kind);
}
async function makeReport(kind) {
  if (state.aiBusy) return undefined;
  if (!configured()) return toastErr(aiError({ code: 'off' }));
  if (state.sync === 'signedout') return toastErr(aiError({ signedOut: true }));
  const key = state.cur;
  state.aiBusy = kind;
  render();
  try {
    const r = await requestReport(kind);
    toast(Number.isFinite(r.left) ? `التقرير جاهز، فاضلك ${fmtNum(r.left)} النهارده` : 'التقرير جاهز');
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
async function goTo(key) {
  if (!key || key === state.cur) return;
  await loadDay(key);
  refreshDaysCache();
  window.scrollTo(0, 0);
}

// ---------- sheet الشهر ----------
async function loadMonthStatus(ym) {
  const days = await allDays();
  if (ui.month !== ym) return;
  ui.monthStatus = {};
  for (const { key, data } of days) if (key.startsWith(ym)) ui.monthStatus[key] = dayStatus(data, state.settings);
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

// ---------- سجل الوقت ساعة بساعة ----------
function saveHrs(next) {
  setK('hrs', Object.keys(next).length ? next : '');
}
function paintHour(hStr) {
  const next = { ...(state.day.hrs || {}) };
  const prev = next[hStr];
  if (ui.tbrush === 'clear') {
    delete next[hStr];
  } else if (prev?.c === ui.tbrush) {
    if (prev.t) next[hStr] = { c: '', t: prev.t };
    else delete next[hStr];
  } else {
    next[hStr] = prev?.t ? { c: ui.tbrush, t: prev.t } : { c: ui.tbrush };
  }
  saveHrs(next);
}
function openHourEdit(h) {
  const prev = state.day.hrs?.[String(h)];
  ui.hf = { h, c: prev?.c || (ui.tbrush !== 'clear' ? ui.tbrush : 'work'), t: prev?.t || '', span: 1 };
  openSheet({ ...hourSheet(h, ui.hf, state), onClose: () => { ui.hf = null; } });
  updateHourSheet(sheetEl(), ui.hf, state);
  afterOpen();
}
function saveHourSheet() {
  if (!ui.hf) return undefined;
  const note = (sheetEl()?.querySelector('[data-role="hnote"]')?.value ?? ui.hf.t ?? '').trim();
  const list = hourSpan(ui.hf.h, ui.hf.span, state.settings.dayStart);
  const next = { ...(state.day.hrs || {}) };
  for (const h of list) {
    next[String(h)] = note ? { c: ui.hf.c, t: note } : { c: ui.hf.c };
  }
  saveHrs(next);
  requestClose();
  if (list.length > 1) toast(`اتسجل ${fmtHours(list.length)}`);
  return undefined;
}
function clearHourSheet() {
  if (!ui.hf) return undefined;
  const list = hourSpan(ui.hf.h, ui.hf.span, state.settings.dayStart);
  const before = structuredClone(state.day.hrs || {});
  const next = { ...before };
  let removed = 0;
  for (const h of list) {
    if (next[String(h)]) { delete next[String(h)]; removed += 1; }
  }
  if (removed) {
    saveHrs(next);
    toast(removed > 1 ? `اتمسح ${fmtHours(removed)}` : `اتمسحت الساعة ${fmtHour(ui.hf.h)}`, 'رجّع', () => saveHrs(before));
  }
  return requestClose();
}

function addLine(form) {
  const inp = form.querySelector('[data-role="linein"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  refreshToday();
  if (state.cur !== state.today) return undefined;
  const { key, label } = lineTarget(new Date().getHours(), state.settings.dayStart);
  inp.value = '';
  ui.drafts.linein = '';
  setK(key, mergeLine(state.day[key], v));
  return toast(`اتكتب في ${label}`);
}

// ---------- نظام الأهداف المتكامل (تاب «الخطة») ----------
const findGoal = (id) => state.goals.find((x) => String(x.id) === String(id));
const HABIT_NUM_PILLAR = { wirdp: 'deen', exm: 'health', engm: 'growth', readp: 'growth', techm: 'growth', caf: 'health', relm: 'life' };
const TIME_PILLAR = { work: 'work', learn: 'growth', health: 'health', sleep: 'health', deen: 'deen', life: 'life', rest: 'life', distract: 'life', move: 'work' };
function inferGoalPillar(m, src) {
  if (m === 'habit') {
    if (src.kind === 'salah') return 'deen';
    if (src.kind === 'sum') return HABIT_NUM_PILLAR[src.k] || 'health';
    const found = state.settings.habits.find((h) => h.k === src.k);
    return found?.g || 'health';
  }
  if (m === 'time') return TIME_PILLAR[src.c] || 'work';
  if (m === 'metric' && (src.kind === 'income' || src.kind === 'exp_cap')) return 'work';
  return null;
}

function defaultGoalSrc(m, s) {
  if (m === 'habit') {
    const hs = activeHabits(s.settings);
    const ex = hs.find((h) => h.k === 'ex') || hs[0];
    return { kind: 'days', k: ex?.k || 'ex' };
  }
  if (m === 'time') return { kind: 'cat', c: 'work' };
  if (m === 'metric') {
    const first = s.metrics[0];
    return first ? { kind: 'sum', id: first.id } : { kind: 'exp_cap', cat: s.settings.expCats[0] || 'أكل' };
  }
  return {};
}
function defaultGoalUnit(m, src, s) {
  if (m === 'habit') {
    if (src.kind === 'salah') return 'صلاة';
    if (src.kind === 'sum') return HABIT_NUMS.find(([k]) => k === src.k)?.[2] || '';
    return 'يوم';
  }
  if (m === 'time') return 'ساعة';
  if (m === 'metric') {
    if (src.kind === 'income' || src.kind === 'exp_cap') return 'ج';
    const met = s.metrics.find((x) => String(x.id) === String(src.id));
    return met?.u || (met?.t === 'tri' ? 'يوم' : '');
  }
  if (m === 'manual') return 'مرة';
  return '';
}

function openGoalDetail(id) {
  const g = findGoal(id);
  if (!g) return;
  const gsum = goalSummaryNow();
  const ev = gsum.evals.get(g.id);
  ui.gdet = g.id;
  ui.gf = null;
  openSheet({ ...goalDetailSheet(g, ev, state), onClose: () => { ui.gdet = null; } });
  updateGoalDetail(sheetEl(), g, ev, state);
}

function openGoalForm(id, prefill = null) {
  refreshToday();
  const g = id ? findGoal(id) : null;
  const base = g || prefill || {};
  const m = base.m || 'time';
  const hz = base.hz || 'month';
  const rng = g?.from && g?.to ? { from: g.from, to: g.to } : goalRange(hz, state.today, state.periods);
  const src = base.src ? { ...base.src } : defaultGoalSrc(m, state);
  const unit = base.unit ?? defaultGoalUnit(m, src, state);
  const stepsText = Array.isArray(base.steps) ? base.steps.map((x) => (typeof x === 'string' ? x : x.t)).join('\n') : '';
  ui.gdet = null;
  ui.gf = {
    id: g?.id || null, t: base.t || '', p: base.p || 'work', m, src, hz, from: rng.from, to: rng.to,
    start: base.start != null ? String(base.start) : '',
    target: base.target != null ? String(base.target) : (m === 'time' ? '30' : m === 'habit' ? '20' : m === 'manual' ? '10' : '100'),
    unit,
    f: base.f !== undefined ? !!base.f : state.goals.filter((x) => !x.done && x.f).length < 3,
    stepsText,
  };
  openSheet({ ...goalFormSheet(ui.gf), onClose: () => { ui.gf = null; } });
  updateGoalForm(sheetEl(), ui.gf, state);
  const titleEl = sheetEl()?.querySelector('[data-role="gtitle"]');
  if (titleEl && !titleEl.value) titleEl.focus({ preventScroll: true });
}

function saveGoalForm() {
  const f = ui.gf;
  if (!f) return undefined;
  const sh = sheetEl();
  const t = (sh?.querySelector('[data-role="gtitle"]')?.value ?? f.t ?? '').trim();
  if (!t) {
    toastErr('اكتب اسم الهدف');
    return sh?.querySelector('[data-role="gtitle"]')?.focus();
  }
  const rng = f.hz === 'custom'
    ? goalRange('custom', state.today, state.periods, f.from, f.to)
    : goalRange(f.hz, state.today, state.periods);
  if (rng.from > rng.to) return toastErr('تاريخ البداية لازم يبقى قبل النهاية');

  const isTarget = f.m === 'metric' && f.src.kind === 'target';
  const targetVal = f.m === 'steps' ? 0 : readNumber(sh?.querySelector('[data-role="gftarget"]')?.value ?? f.target);
  if (f.m !== 'steps' && (targetVal === '' || (!isTarget && targetVal <= 0))) {
    toastErr('اكتب رقم المستهدف');
    return sh?.querySelector('[data-role="gftarget"]')?.focus();
  }
  const startVal = isTarget ? readNumber(sh?.querySelector('[data-role="gfstart"]')?.value ?? f.start) : '';
  if (isTarget && startVal === '') {
    toastErr('اكتب رقم البداية (الحالي)');
    return sh?.querySelector('[data-role="gfstart"]')?.focus();
  }
  if (f.m === 'time' && f.src.kind === 'proj' && !(f.src.proj || '').trim()) {
    toastErr('اكتب اسم المشروع');
    return sh?.querySelector('[data-role="gfproj"]')?.focus();
  }

  const unit = f.m === 'steps' ? 'خطوة' : ((sh?.querySelector('[data-role="gfunit"]')?.value ?? f.unit ?? '').trim() || defaultGoalUnit(f.m, f.src, state));
  const payload = {
    t, p: f.p, f: !!f.f, m: f.m, src: { ...f.src }, hz: f.hz, from: rng.from, to: rng.to,
    ...(f.m !== 'steps' ? { target: targetVal, unit } : { unit: 'خطوة' }),
    ...(isTarget ? { start: startVal } : { start: undefined }),
  };

  if (f.id) {
    const old = findGoal(f.id);
    if (f.m === 'steps' && !Array.isArray(old?.steps)) payload.steps = [];
    patchItem('goals', f.id, payload);
    toast('اتحفظ تعديل الهدف');
    return openGoalDetail(f.id);
  }
  const steps = f.m === 'steps'
    ? (sh?.querySelector('[data-role="gfsteps"]')?.value ?? f.stepsText ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((st) => ({ id: uid(), t: st, done: false }))
    : undefined;
  const item = {
    id: uid(), ...payload,
    ...(f.m === 'manual' ? { cur: 0 } : {}),
    ...(steps ? { steps } : {}),
    done: false, at: Date.now(),
  };
  addItem('goals', item);
  requestClose();
  state.tab = 'tasks';
  ui.planSub = 'goals';
  ui.gfilt = 'all';
  render();
  return toast(`اتضاف الهدف «${t}»`);
}

async function toggleGoalHabit(k) {
  refreshToday();
  if (state.cur === state.today) {
    const next = state.day[k] === 2 ? 0 : 2;
    setK(k, next);
    toast(next === 2 ? 'اتعلمت النهارده ← الهدف اتحدّث!' : 'اتشالت من النهارده');
  } else {
    const d = await getDayData(state.today);
    const next = d[k] === 2 ? 0 : 2;
    await setKOn(state.today, k, next);
    await refreshDaysCache();
    toast(next === 2 ? 'اتعلمت في النهارده ← الهدف اتحدّث!' : 'اتشالت من النهارده');
  }
}

function adjustManualGoal(id, delta) {
  const g = findGoal(id);
  if (!g || g.m !== 'manual') return;
  patchItem('goals', id, { cur: Math.max(0, (+g.cur || 0) + delta) });
}
function toggleGoalStep(gid, sid) {
  const g = findGoal(gid);
  if (!g || !Array.isArray(g.steps)) return;
  patchItem('goals', gid, { steps: g.steps.map((s) => (String(s.id) === String(sid) ? { ...s, done: !s.done } : s)) });
}
function deleteGoalStep(gid, sid) {
  const g = findGoal(gid);
  if (!g || !Array.isArray(g.steps)) return;
  const before = structuredClone(g.steps);
  patchItem('goals', gid, { steps: g.steps.filter((s) => String(s.id) !== String(sid)) });
  toast('اتمسحت المرحلة', 'رجّع', () => patchItem('goals', gid, { steps: before }));
}
function addGoalStep(form) {
  const gid = form.dataset.gid;
  const inp = form.querySelector('[data-role="gstepin"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  const g = findGoal(gid);
  if (!g) return undefined;
  inp.value = '';
  patchItem('goals', gid, { steps: [...(g.steps || []), { id: uid(), t: v, done: false }] });
  return toast('اتضافت المرحلة');
}
function addGoalTask(form) {
  const gid = form.dataset.gid;
  const inp = form.querySelector('[data-role="gtaskin"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  refreshToday();
  inp.value = '';
  addTask(v, { due: state.today, goalId: gid });
  return toast('اتضافت لمهام النهارده واتربطت بالهدف');
}
function openGoalArchive(id) {
  const g = findGoal(id);
  if (!g) return;
  ui.gdet = null;
  openSheet(goalArchiveSheet(g));
  const ta = sheetEl()?.querySelector('[data-role="gnote"]');
  if (ta) ta.focus({ preventScroll: true });
}
function saveGoalArchive(id) {
  const note = (sheetEl()?.querySelector('[data-role="gnote"]')?.value || '').trim();
  patchItem('goals', id, { done: true, f: false, dAt: Date.now(), ...(note ? { note } : {}) });
  requestClose();
  ui.gfilt = 'done';
  render();
  toast('عاش! الهدف اتنقل لأرشيف الإنجازات');
}
function deleteGoal(id) {
  const r = removeItem('goals', id);
  if (!r) return;
  if (isSheetOpen()) requestClose();
  toast(`اتمسح "${r.item.t}"`, 'رجّع', () => restoreItem('goals', r));
}
function ideaToGoal(id) {
  const idea = state.ideas.find((x) => String(x.id) === String(id));
  if (!idea) return;
  const pMap = { شغل: 'work', مشروع: 'work', تعلم: 'growth', شخصي: 'health' };
  openGoalForm(null, { t: idea.t.replace(/\s+/g, ' ').trim().slice(0, 90), p: pMap[idea.c] || 'life', m: 'steps', hz: 'month', f: true });
}

// ---------- الدوسات ----------
document.addEventListener('click', async (e) => {
  if (e.target.id === 'ov') return requestClose();
  const b = e.target.closest('button');
  if (!b) return;
  if ('close' in b.dataset) return requestClose();

  if (b.dataset.qmode) {
    ui.qmode = b.dataset.qmode;
    ui.qmenu = false;
    updateDock($('#dock'), ui, state.cur !== state.today, state.settings);
    return $('[data-role="quickin"]').focus();
  }
  if (b.dataset.qcat) {
    ui.qcat = b.dataset.qcat;
    ui.qcatManual = true;
    return updateDock($('#dock'), ui, state.cur !== state.today, state.settings);
  }

  const rg = b.closest('[data-rate]');
  if (rg && b.dataset.v) {
    const k = rg.dataset.rate;
    return setK(k, rg.dataset.kind === 'count' ? rateTap(state.day[k], +b.dataset.v) : rateSet(state.day[k], +b.dataset.v));
  }
  if (b.dataset.set) {
    const k = b.dataset.set;
    const next = String(state.day[k] ?? '') === b.dataset.v ? '' : b.dataset.v;
    setK(k, next);
    if (k === 'sleep' || k === 'wake') autoFillSleepIfOn();
    return undefined;
  }
  if (b.dataset.tri) {
    return setK(b.dataset.tri, cycleTri(state.day[b.dataset.tri]));
  }
  const sg = b.closest('[data-seg]');
  if (sg && b.dataset.v) {
    const k = sg.dataset.seg;
    return setK(k, state.day[k] === b.dataset.v ? '' : b.dataset.v);
  }

  const id = b.dataset.id;
  switch (b.dataset.act) {
    // الصلوات الـ ٥ بأساميهم
    case 'prayer': {
      const patch = togglePrayer(state.day, b.dataset.p);
      if (patch) setMany(patch);
      return undefined;
    }
    // الكافيين +/-
    case 'cafstep': {
      const next = Math.max(0, (+state.day.caf || 0) + (+b.dataset.d || 0));
      return setK('caf', next || '');
    }
    // الشغل: إجازة + نقل من تاب الوقت
    case 'workoff':
      setK('workOff', state.day.workOff ? '' : true);
      return undefined;
    case 'workfromtime': {
      const h = b.dataset.h;
      const before = state.day.w1h ?? '';
      setK('w1h', h);
      return toast(`اتنقلت ${fmtHours(+h)} لمشروع ١`, before ? 'رجّع' : null, () => setK('w1h', before));
    }
    // الفلوس: ماصرفتش + تعديل مصروف + دخل
    case 'nospend':
      setK('noSpend', state.day.noSpend ? '' : true);
      return undefined;
    case 'editexp': return openExpEdit(+b.dataset.i);
    case 'eecat':
      if (ui.ee) {
        ui.ee.c = b.dataset.c;
        for (const x of sheetEl().querySelectorAll('[data-act="eecat"]')) {
          const on = x.dataset.c === ui.ee.c;
          x.classList.toggle('on', on);
          x.setAttribute('aria-pressed', on);
        }
      }
      return undefined;
    case 'saveexpbtn': return saveExpEdit();
    case 'delexp':
      deleteExpense(+b.dataset.i);
      if ('closeAfter' in b.dataset) requestClose();
      return undefined;
    case 'inccat':
      ui.inccat = b.dataset.c;
      return updateView();
    case 'delinc': return deleteIncome(+b.dataset.i);
    case 'delleginc': {
      const old = state.day.income;
      setK('income', '');
      return toast('اتمسح الدخل', 'رجّع', () => setK('income', old));
    }
    // أولوية امبارح ← لمهامي
    case 'nextptask':
      refreshToday();
      addTask(b.dataset.v, { pri: true, due: state.today });
      return toast('اتضافت لأولويات مهام النهارده ✓');
    // التنقل بين الأيام
    case 'day':
      if (isSheetOpen()) requestClose();
      return goTo(b.dataset.key);
    case 'today':
      if (isSheetOpen()) requestClose();
      refreshToday();
      return goTo(state.today);
    case 'month': return openMonth();
    case 'mprev': return moveMonth(-1);
    case 'mnext': return moveMonth(1);
    case 'wprev': return goTo(addDays(state.cur, -7));
    case 'wnext': return goTo(addDays(state.cur, 7));
    case 'scroll': return document.getElementById(b.dataset.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // تاب «الوقت»
    case 'timecat':
      ui.tbrush = b.dataset.c;
      state.tab = 'time';
      render();
      return window.scrollTo(0, 0);
    case 'tbrush':
      ui.tbrush = b.dataset.c;
      return render();
    case 'tperiod':
      ui.tperiod = b.dataset.v;
      return render();
    case 'fillsleep': return fillSleepHours();
    case 'hset': return paintHour(b.dataset.h);
    case 'hedit': return openHourEdit(+b.dataset.h);
    case 'hcat':
      if (ui.hf) { ui.hf.c = b.dataset.c; updateHourSheet(sheetEl(), ui.hf, state); }
      return undefined;
    case 'hspan':
      if (ui.hf) { ui.hf.span = +b.dataset.n; updateHourSheet(sheetEl(), ui.hf, state); }
      return undefined;
    case 'hsave': return saveHourSheet();
    case 'hclear': return clearHourSheet();
    case 'guide': return startGuide(b.dataset.q);
    case 'qmenu':
      ui.qmenu = !ui.qmenu;
      return updateDock($('#dock'), ui, state.cur !== state.today, state.settings);
    case 'gnext': return nextStep();
    case 'sheet': return openNamed(b.dataset.sheet);
    case 'likey': {
      const keys = b.dataset.keys.split(',');
      const vals = b.dataset.vals.split(',');
      const before = Object.fromEntries(keys.map((k) => [k, state.day[k] ?? '']));
      setMany(Object.fromEntries(keys.map((k, i) => [k, vals[i]])));
      if (keys.includes('sleep') || keys.includes('wake')) autoFillSleepIfOn();
      if (keys.some((k) => before[k] && before[k] !== state.day[k])) {
        toast('اتملت زي امبارح', 'رجّع', () => setMany(before));
      }
      return undefined;
    }
    case 'workmore':
      ui.workRows = (ui.workRows || 1) + 1;
      return 'guide' in b.dataset ? showStep() : openNamed('work', { keepRows: true });
    case 'tab':
      state.tab = b.dataset.tab;
      render();
      return window.scrollTo(0, 0);
    case 'cat':
      ui.cat = b.dataset.c;
      ui.catManual = true;
      syncExpCatBtns(ui.cat);
      return updateParse();
    // المهام
    case 'tpri': ui.tpri = !ui.tpri; return updateView();
    case 'twhen': ui.twhen = b.dataset.v; return updateView();
    case 'tcat': ui.tcat = b.dataset.v; return updateView();
    case 'tgoal': ui.tgoal = id || ''; return updateView();
    case 'tfilt': ui.tfilt = b.dataset.v; return updateView();
    case 'tdone': return toggleTask(id);
    case 'tmove': return moveTask(id);
    case 'tdel': return deleteItem('tasks', id);
    case 'tedit': return openTaskEdit(id);
    case 'tewhen': if (ui.te) { ui.te.when = b.dataset.v; refreshTaskEditSheet(); } return undefined;
    case 'tepri': if (ui.te) { ui.te.pri = !ui.te.pri; refreshTaskEditSheet(); } return undefined;
    case 'tecat': if (ui.te) { ui.te.cat = b.dataset.v; refreshTaskEditSheet(); } return undefined;
    case 'tegoal': if (ui.te) { ui.te.goalId = id || ''; refreshTaskEditSheet(); } return undefined;
    case 'tesave': return saveTaskEdit();
    case 'tedel': if (ui.te) { const tid = ui.te.id; requestClose(); deleteItem('tasks', tid); } return undefined;
    // الأفكار
    case 'icat': ui.icat = b.dataset.c; return updateView();
    case 'ifilt': ui.ifilt = b.dataset.v; return updateView();
    case 'iedit': return openIdeaEdit(id);
    case 'iecat':
      if (ui.ie) {
        ui.ie.c = b.dataset.c;
        for (const x of sheetEl().querySelectorAll('[data-act="iecat"]')) x.setAttribute('aria-pressed', x.dataset.c === ui.ie.c);
      }
      return undefined;
    case 'iesave': return saveIdeaEdit();
    case 'iedel': if (ui.ie) { const iid = ui.ie.id; requestClose(); deleteItem('ideas', iid); } return undefined;
    case 'itask': return ideaToTask(id);
    case 'ipin': {
      const it = state.ideas.find((x) => String(x.id) === id);
      return it && patchItem('ideas', id, { pin: !it.pin });
    }
    case 'idel': return deleteItem('ideas', id);
    case 'igoal': return ideaToGoal(id);
    // الأهداف (تاب الخطة)
    case 'plansub': ui.planSub = b.dataset.v; return render();
    case 'gplan': ui.planSub = 'goals'; state.tab = 'tasks'; render(); return window.scrollTo(0, 0);
    case 'gtasks': ui.planSub = 'tasks'; state.tab = 'tasks'; render(); return window.scrollTo(0, 0);
    case 'gfilt': ui.gfilt = b.dataset.v; return render();
    case 'gopen': return openGoalDetail(id);
    case 'gform': return openGoalForm(id);
    case 'gpreset': return openGoalForm(null, GOAL_PRESETS[+b.dataset.i]);
    case 'ghabit': return toggleGoalHabit(b.dataset.k);
    case 'ginc': return adjustManualGoal(id, 1);
    case 'gdec': return adjustManualGoal(id, -1);
    case 'gstog': return toggleGoalStep(b.dataset.gid, b.dataset.sid);
    case 'gsdel': return deleteGoalStep(b.dataset.gid, b.dataset.sid);
    case 'gfocus': {
      const g = findGoal(id);
      if (!g) return undefined;
      patchItem('goals', id, { f: !g.f });
      return toast(!g.f ? 'اتثبّت في أهداف التركيز' : 'اتشال من التركيز');
    }
    case 'garchopen': return openGoalArchive(id);
    case 'garchsave': return saveGoalArchive(id);
    case 'greopen':
      patchItem('goals', id, { done: false, dAt: undefined });
      requestClose();
      ui.gfilt = 'all';
      return toast('الهدف رجع نشط');
    case 'gdel': return deleteGoal(id);
    case 'gfmode':
      if (ui.gf) {
        ui.gf.m = b.dataset.v;
        ui.gf.src = defaultGoalSrc(ui.gf.m, state);
        ui.gf.unit = defaultGoalUnit(ui.gf.m, ui.gf.src, state);
        if (!ui.gf.id && !ui.gf.pSet) ui.gf.p = inferGoalPillar(ui.gf.m, ui.gf.src) || ui.gf.p;
        updateGoalForm(sheetEl(), ui.gf, state);
      }
      return undefined;
    case 'gfpil':
      if (ui.gf) { ui.gf.p = b.dataset.v; ui.gf.pSet = true; updateGoalForm(sheetEl(), ui.gf, state); }
      return undefined;
    case 'gfhz':
      if (ui.gf) {
        ui.gf.hz = b.dataset.v;
        const rng = goalRange(ui.gf.hz, state.today, state.periods, ui.gf.from, ui.gf.to);
        ui.gf.from = rng.from;
        ui.gf.to = rng.to;
        updateGoalForm(sheetEl(), ui.gf, state);
      }
      return undefined;
    case 'gffoc':
      if (ui.gf) { ui.gf.f = !ui.gf.f; updateGoalForm(sheetEl(), ui.gf, state); }
      return undefined;
    case 'gfhkind':
      if (ui.gf) {
        const k = b.dataset.v;
        const hs = activeHabits(state.settings);
        ui.gf.src = k === 'salah' ? { kind: 'salah' } : k === 'sum' ? { kind: 'sum', k: HABIT_NUMS[0][0] } : { kind: 'days', k: hs[0]?.k || 'ex' };
        ui.gf.unit = defaultGoalUnit('habit', ui.gf.src, state);
        if (!ui.gf.id && !ui.gf.pSet) ui.gf.p = inferGoalPillar('habit', ui.gf.src) || ui.gf.p;
        updateGoalForm(sheetEl(), ui.gf, state);
      }
      return undefined;
    case 'gftkind':
      if (ui.gf) {
        const k = b.dataset.v;
        ui.gf.src = k === 'cat' ? { kind: 'cat', c: 'work' } : k === 'proj' ? { kind: 'proj', proj: '' } : { kind: 'deep' };
        ui.gf.unit = 'ساعة';
        if (!ui.gf.id && !ui.gf.pSet) ui.gf.p = inferGoalPillar('time', ui.gf.src) || ui.gf.p;
        updateGoalForm(sheetEl(), ui.gf, state);
      }
      return undefined;
    case 'gfmkind':
      if (ui.gf) {
        const k = b.dataset.v;
        const mid = state.metrics[0]?.id || '';
        ui.gf.src = k === 'income' ? { kind: 'income' } : k === 'exp_cap' ? { kind: 'exp_cap', cat: state.settings.expCats[0] || 'أكل' } : { kind: k, id: mid };
        ui.gf.unit = defaultGoalUnit('metric', ui.gf.src, state);
        if (!ui.gf.id && !ui.gf.pSet) ui.gf.p = inferGoalPillar('metric', ui.gf.src) || ui.gf.p;
        updateGoalForm(sheetEl(), ui.gf, state);
      }
      return undefined;
    case 'gfsrc':
      if (ui.gf) {
        ui.gf.src = { ...ui.gf.src, [b.dataset.k]: b.dataset.v };
        if (ui.gf.m === 'time' && b.dataset.k === 'c') ui.gf.src.kind = b.dataset.v === 'work' ? 'work' : 'cat';
        ui.gf.unit = defaultGoalUnit(ui.gf.m, ui.gf.src, state);
        if (!ui.gf.id && !ui.gf.pSet) ui.gf.p = inferGoalPillar(ui.gf.m, ui.gf.src) || ui.gf.p;
        updateGoalForm(sheetEl(), ui.gf, state);
      }
      return undefined;
    case 'gfsave': return saveGoalForm();
    // الفترات وهدف الفترة الواحد
    case 'pdetail': return openPeriodDetail(id);
    case 'pform': return openPeriodForm(id);
    case 'pflen':
      if (ui.pf) {
        ui.pf.len = +b.dataset.v;
        if (ui.pf.len > 0) {
          ui.pf.from = state.today;
          ui.pf.to = addDays(state.today, ui.pf.len - 1);
          if (ui.pf.gKind === 'build' || ui.pf.gKind === 'quit') {
            ui.pf.gTarget = String(Math.max(1, Math.round(ui.pf.len * 0.8)));
          }
        }
        updatePeriodForm(sheetEl(), ui.pf, state);
      }
      return undefined;
    case 'pgkind':
      if (ui.pf) {
        ui.pf.gKind = b.dataset.v;
        ui.pf.gSource = defaultPeriodSource(ui.pf.gKind);
        ui.pf.gUnit = defaultPeriodUnit(ui.pf.gKind, ui.pf.gSource);
        updatePeriodForm(sheetEl(), ui.pf, state);
      }
      return undefined;
    case 'pgsrc':
      if (ui.pf) {
        ui.pf.gSource = b.dataset.v;
        ui.pf.gUnit = defaultPeriodUnit(ui.pf.gKind, ui.pf.gSource);
        updatePeriodForm(sheetEl(), ui.pf, state);
      }
      return undefined;
    case 'pgdir':
      if (ui.pf) { ui.pf.gDir = b.dataset.v; updatePeriodForm(sheetEl(), ui.pf, state); }
      return undefined;
    case 'pfsave': return savePeriodForm();
    case 'pdel': return deletePeriod(id);
    case 'pglog': return logPeriodGoalDay(id, b.dataset.v);
    case 'pginc': return adjustPeriodGoalVal(id, 1);
    case 'pgdec': return adjustPeriodGoalVal(id, -1);
    case 'pgstep': return togglePeriodStep(id, b.dataset.sid);
    case 'pgstepdel': return deletePeriodStep(id, b.dataset.sid);
    // مقاييسي
    case 'mplus': return setMetric(id, (+(state.day.m?.[id]) || 0) + 1);
    case 'mtri': return setMetric(id, cycleTri(state.day.m?.[id]) || '');
    case 'medit': {
      const m = findMetric(id);
      if (!m) return undefined;
      openSheet(metricSheet(m));
      return afterOpen();
    }
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
    case 'marea': Object.assign(ui.mf, { a: b.dataset.v, newArea: false }); return updateMetricForm(sheetEl(), ui.mf, state);
    case 'mareanew': {
      Object.assign(ui.mf, { newArea: true, a: '' });
      updateMetricForm(sheetEl(), ui.mf, state);
      const inp = sheetEl().querySelector('[data-role="marea"]');
      inp.value = '';
      return inp.focus();
    }
    case 'msave': return saveMetric();
    case 'mdel': return deleteMetric();
    // الإعدادات المنظّمة
    case 'settings': return openSettings();
    case 'sacc': {
      const v = b.dataset.v;
      if (ui.accOpen.has(v)) ui.accOpen.delete(v);
      else ui.accOpen.add(v);
      return updateSettings(sheetEl(), state, ui, sx(), allDaysSync());
    }
    case 'setdaystart':
      patchSettings({ dayStart: +b.dataset.v });
      return toast(`بداية اليوم بقت ${fmtNum(+b.dataset.v)} الفجر`);
    case 'settoggle':
      return patchSettings({ [b.dataset.k]: !state.settings[b.dataset.k] });
    case 'htoggle': {
      const list = state.settings.habits.map((h) => (h.k === b.dataset.k ? { ...h, on: h.on === false } : h));
      return patchSettings({ habits: list });
    }
    case 'hform': return openHabitForm(b.dataset.k);
    case 'hfgrp':
      if (ui.hbf) {
        ui.hbf.g = b.dataset.v;
        for (const x of sheetEl().querySelectorAll('[data-act="hfgrp"]')) x.setAttribute('aria-pressed', x.dataset.v === ui.hbf.g);
      }
      return undefined;
    case 'hfsave': return saveHabitForm();
    case 'hfdel': return deleteHabitForm();
    case 'grfform': return openPillarForm();
    case 'grfico':
      if (ui.grf) {
        ui.grf.icon = b.dataset.v;
        for (const x of sheetEl().querySelectorAll('[data-act="grfico"]')) x.setAttribute('aria-pressed', x.dataset.v === ui.grf.icon);
      }
      return undefined;
    case 'grfsave': return savePillarForm();
    case 'tctoggle': {
      const list = state.settings.timeCats.map((c) => (c.id === id ? { ...c, on: c.on === false } : c));
      return patchSettings({ timeCats: list });
    }
    case 'tcform': return openTimeCatForm(id);
    case 'tcfico':
      if (ui.tcf) {
        ui.tcf.icon = b.dataset.v;
        for (const x of sheetEl().querySelectorAll('[data-act="tcfico"]')) x.setAttribute('aria-pressed', x.dataset.v === ui.tcf.icon);
      }
      return undefined;
    case 'tcfcol':
      if (ui.tcf) {
        ui.tcf.color = b.dataset.v;
        for (const x of sheetEl().querySelectorAll('[data-act="tcfcol"]')) x.setAttribute('aria-pressed', x.dataset.v === ui.tcf.color);
      }
      return undefined;
    case 'tcfsave': return saveTimeCatForm();
    case 'tcfdel': return deleteTimeCatForm();
    case 'delproj':
      return patchSettings({ projects: state.settings.projects.filter((x) => x !== b.dataset.v) });
    case 'delexpcat': {
      const next = state.settings.expCats.filter((x) => x !== b.dataset.v);
      if (!next.length) return toastErr('لازم يفضل تصنيف واحد على الأقل');
      return patchSettings({ expCats: next });
    }
    case 'delideacat': {
      const next = state.settings.ideaCats.filter((x) => x !== b.dataset.v);
      if (!next.length) return toastErr('لازم يفضل تصنيف واحد على الأقل');
      return patchSettings({ ideaCats: next });
    }
    case 'startoggle': {
      const k = b.dataset.k;
      const stars = structuredClone(state.settings.stars);
      stars[k] = { ...(stars[k] || { on: true, due: STAR_DUE[k] }), on: !(stars[k]?.on !== false) };
      return patchSettings({ stars });
    }
    case 'stardue': {
      const k = b.dataset.k;
      const stars = structuredClone(state.settings.stars);
      const curDue = stars[k]?.due ?? STAR_DUE[k];
      stars[k] = { ...(stars[k] || { on: true }), due: (curDue + 1) % 4 };
      return patchSettings({ stars });
    }
    // النسخة الاحتياطية والمزامنة
    case 'export': return doExport();
    case 'import': return sheetEl()?.querySelector('[data-role="importfile"]').click();
    case 'ssignup': return login(b.closest('form'), true);
    case 'ssync': return syncNow().then(() => refreshDaysCache());
    case 'ai': return openAi(b.dataset.kind);
    case 'airegen': return makeReport(b.dataset.kind);
    case 'sout':
      await signOut();
      return toast('خرجت. بياناتك لسه على الجهاز ده');
    default: return undefined;
  }
});

// نماذج الإضافة جوه الإعدادات
function addSettingChip(form, role, key, label) {
  const inp = form.querySelector(`[data-role="${role}"]`);
  const v = inp.value.trim();
  if (!v) return inp.focus();
  if (state.settings[key].includes(v)) return toastErr('موجود بالفعل');
  inp.value = '';
  patchSettings({ [key]: [...state.settings[key], v] });
  return toast(`اتضاف ${label}: ${v}`);
}

const FORMS = {
  addexp: addExpense,
  quick: handleQuick,
  addtask: addTaskFromForm,
  addidea: addIdeaFromForm,
  addmoney: addMoney,
  addinc: addIncome,
  addline: addLine,
  slogin: (f) => login(f, false),
  hsave: saveHourSheet,
  saveexp: saveExpEdit,
  gstepadd: addGoalStep,
  gtaskadd: addGoalTask,
  pgstepadd: addPeriodStep,
  addproj: (f) => addSettingChip(f, 'newproj', 'projects', 'المشروع'),
  addexpcat: (f) => addSettingChip(f, 'newexpcat', 'expCats', 'التصنيف'),
  addideacat: (f) => addSettingChip(f, 'newideacat', 'ideaCats', 'التصنيف'),
};
document.addEventListener('submit', (e) => {
  const fn = FORMS[e.target.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn(e.target);
});

// الحفاظ على الكيبورد
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const typing = document.activeElement?.matches?.('input, textarea');
  if (typing && (b.closest('#dock') || 'keep' in b.dataset)) e.preventDefault();
});
const typingClass = (el) => {
  if (el.dataset?.role === 'quickin') return 'typing';
  if (el.matches?.('input, textarea') && el.closest('#view')) return 'typing-page';
  return null;
};
document.addEventListener('focusin', (e) => {
  const c = typingClass(e.target);
  if (c) document.documentElement.classList.add(c);
  if (e.target.matches?.('input, textarea') && e.target.closest('.sheet')) {
    setTimeout(() => { if (document.activeElement === e.target) e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300);
  }
});
document.addEventListener('focusout', (e) => {
  const c = typingClass(e.target);
  if (c) document.documentElement.classList.remove(c);
});

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
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--dock-h', `${$('#dock').offsetHeight}px`);
}).observe($('#dock'));

// ---------- الكتابة ----------
document.addEventListener('input', (e) => {
  const el = e.target;
  const role = el.dataset.role;

  // إعدادات الأهداف الرقمية والوقت
  if (el.dataset.setcfg) {
    const ck = el.dataset.setcfg;
    if (ck === 'sleepBed' || ck === 'sleepWake') {
      if (el.value) patchSettings({ [ck]: el.value });
    } else {
      const n = readNumber(el.value);
      if (n !== '' && n >= 0) patchSettings({ [ck]: n });
      else if (ck === 'budget' && !el.value.trim()) patchSettings({ budget: 0 });
    }
    return undefined;
  }

  // ملخص/درس نهاية الفترة
  if (role === 'pnote' && el.dataset.pid) {
    patchItem('periods', el.dataset.pid, { note: el.value.trim() || undefined });
    return undefined;
  }

  // فورم الفترة
  if (ui.pf) {
    if (role === 'pfname') { ui.pf.name = el.value; return undefined; }
    if (role === 'pgtitle') { ui.pf.gTitle = el.value; return undefined; }
    if (role === 'pgtarget') { ui.pf.gTarget = el.value; return undefined; }
    if (role === 'pgunit') { ui.pf.gUnit = el.value; return undefined; }
    if (role === 'pgsteps') { ui.pf.gStepsText = el.value; return undefined; }
  }

  if (role === 'expin') return updateParse();
  if (role === 'quickin') {
    if (!el.value.trim()) ui.qcatManual = false;
    return updateDock($('#dock'), ui, state.cur !== state.today, state.settings);
  }
  if (ui.mf && (role === 'mname' || role === 'munit' || role === 'marea')) {
    ui.mf[{ mname: 'n', munit: 'u', marea: 'a' }[role]] = el.value;
    return updateMetricForm(sheetEl(), ui.mf, state);
  }
  if (role === 'semail') { ui.sf.email = el.value; return undefined; }
  if (ui.hf && role === 'hnote') { ui.hf.t = el.value; return undefined; }
  if (ui.gf) {
    if (role === 'gtitle') { ui.gf.t = el.value; return undefined; }
    if (role === 'gftarget') { ui.gf.target = el.value; return undefined; }
    if (role === 'gfstart') { ui.gf.start = el.value; return undefined; }
    if (role === 'gfunit') { ui.gf.unit = el.value; return undefined; }
    if (role === 'gfproj') { ui.gf.src = { ...ui.gf.src, proj: el.value }; return undefined; }
    if (role === 'gfsteps') { ui.gf.stepsText = el.value; return undefined; }
  }
  if (el.dataset.m) {
    const v = el.dataset.type === 'num' ? readNumber(el.value) : el.value;
    return setMetric(el.dataset.m, typeof v === 'string' && !v.trim() ? '' : v);
  }
  if (DRAFTS.includes(role)) {
    ui.drafts[role] = el.value;
    if (role === 'iq') updateView();
    // تخمين ذكي لتصنيف المصروف في تبويبة الفلوس
    if ((role === 'mdesc' || role === 'mamt') && !ui.catManual) {
      const txt = `${ui.drafts.mdesc || ''} ${ui.drafts.mamt || ''}`;
      if (!txt.trim()) ui.catManual = false;
      const g = guessExpCat(txt, state.settings.expCats);
      if (g && g !== ui.cat) {
        ui.cat = g;
        syncExpCatBtns(g);
      }
    }
    return undefined;
  }
  const k = el.dataset.k;
  if (!k) return undefined;
  const t = el.dataset.type;
  let v = el.value;
  if (t === 'num') v = readNumber(v);
  else if (t === 'hrs' || t === 'dig') v = toEn(v).trim();
  else if (t === 'dur') {
    const d = readDuration(v);
    if (v.trim() && !d) return updateOutputs(sheetEl(), state);
    v = d;
  }
  setK(k, v);
  if (k === 'sleep' || k === 'wake') autoFillSleepIfOn();
  return undefined;
});

document.addEventListener('change', (e) => {
  const role = e.target.dataset?.role;
  if (role === 'importfile') doImport(e.target);
  if (role === 'tdate') ui.tdate = e.target.value;
  if (ui.gf && role === 'gffrom') ui.gf.from = e.target.value;
  if (ui.gf && role === 'gfto') ui.gf.to = e.target.value;
  if (ui.pf && role === 'pffrom') ui.pf.from = e.target.value;
  if (ui.pf && role === 'pfto') ui.pf.to = e.target.value;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isSheetOpen()) requestClose();
  const el = e.target;
  if (e.key !== 'Enter' || e.isComposing || !el.matches?.('input.fld') || el.form || !el.closest('.sheet')) return;
  e.preventDefault();
  const all = [...sheetEl().querySelectorAll('input.fld:not([type="time"]), textarea.fld')].filter((x) => x.getClientRects().length);
  const next = all[all.indexOf(el) + 1];
  if (next) next.focus();
  else if (ui.gf) saveGoalForm();
  else if (ui.pf) savePeriodForm();
  else if (ui.te) saveTaskEdit();
  else { el.blur(); requestClose(); }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) flush();
  else refreshToday();
});
window.addEventListener('pagehide', () => { flush(); });

// ---------- Service Worker ----------
const devHost = ['localhost', '127.0.0.1'].includes(location.hostname) && !new URLSearchParams(location.search).has('sw');
if ('serviceWorker' in navigator && !devHost) {
  const hadOld = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
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
  ui.cat = state.settings.expCats[0] || 'أكل';
  ui.qcat = ui.cat;
  ui.icat = state.settings.ideaCats.at(-1) || 'تاني';
  ui.tbrush = activeTimeCats(state.settings)[1]?.id || 'work';
  await loadDay(state.today);
  await refreshDaysCache();
  hooks.saved = () => schedule();
  await initSync();
  await refreshDaysCache();
})();
