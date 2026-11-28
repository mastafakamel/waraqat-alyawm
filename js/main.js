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
  weekKeys, satWeekKeys, dayStatus, dayProgress, baselineFor, timeBaseline, timeCatUsage, starSplit,
  hourSpan, sleepHoursSplit, fmtHour, fmtHours, togglePrayer, setPrayerScore, activeHabits, activeHabitGroups, activeTimeCats, allTimeCatMap,
  activeLifeAreas, isBacklogGoal, periodReviewState,
  TODAY_TASK_LIMIT, itemKind, itemStatus, hasGoalTarget, canAddTodayTask, systemState,
  HABIT_NUMS, goalRange, goalsSummary, evalPeriodGoal,
} from './logic.js';
import { monthSheet, updateMonth, shiftMonth } from './views/month.js';
import { $, $$, esc, openSheet, requestClose, isSheetOpen, sheetEl, syncFields, toast, toastErr, setHtml } from './ui.js';
import { renderHeader, updateStatus, renderToday, renderTabs } from './views/today.js';
import { renderTime, hourSheet, updateHourSheet } from './views/time.js';
import {
  renderPlan, filterSheet, updateFilterSheet, projectSwapSheet, taskLimitSheet, nextProjectSheet,
  goalDetailSheet, updateGoalDetail, goalArchiveSheet, lifeAreaFormSheet, goalReviewSheet,
} from './views/goals.js';
import {
  sheetFor, guideStep, updateOutputs, expEditSheet, taskEditSheet, ideaEditSheet,
} from './views/sheets.js';
import { dockHtml, updateDock } from './views/dock.js';
import { ideasShell, updateIdeas } from './views/ideas.js';
import { moneyShell, updateMoney } from './views/money.js';
import { SUGGEST, metricSheet, metricForm, updateMetricForm } from './views/metrics.js';
import {
  settingsSheet, updateSettings, periodFormSheet, updatePeriodForm, periodDetailSheet, updatePeriodDetail,
  habitFormSheet, pillarFormSheet, timeCatFormSheet,
} from './views/settings.js';
import { requestReport, aiError, AI_FIELD } from './ai.js';
import { aiSheet, updateAiSheet } from './views/ai.js';
import {
  haptic, updateAppBadge, syncPinnedTasks, getPushState, toggleTasksPin, enablePush, disablePush,
  sendLocalTest, sendRemoteTest,
} from './notify.js';

// حالة الواجهة بس (مش بتتحفظ)
const ui = {
  cat: 'أكل', catManual: false, guide: null, qmode: 'filter', qmenu: false, qcat: 'أكل', qcatManual: false, qarea: 'work',
  inccat: INC_CATS[0],
  tpri: false, twhen: 'today', tdate: '', tcat: '', tgoal: '', tfilt: 'all',
  icat: 'تاني', ifilt: 'all', drafts: {},
  planView: 'now', ftype: 'all', farea: 'all',
  flt: null, tswap: null, gdet: null, laf: null, lafFrom: null, rev: null,
  mf: null, mfFrom: null,
  accOpen: new Set(['period']),
  pf: null, pfFrom: null, pdet: null,
  hbf: null, hbfFrom: null, grf: null, tcf: null,
  ee: null, te: null, ie: null,
  sf: { email: '' },
  push: null,
  prayPick: null,
  closeOpen: false,
  month: null, monthStatus: {},
  tbrush: 'work', topen: null, hf: null,
};

// كاش لكل الأيام عشان حساب الأهداف والمشروع الشغّال يشتغل فوراً
let daysCache = [];
let daysLoaded = false;
async function refreshDaysCache() {
  daysCache = await allDays();
  daysLoaded = true;
  render();
}

// ترتيب مجالات الوقت بالأكتر استخدام. آخر عدّ بيتحفظ على الجهاز، عشان أول ما التطبيق يفتح
// (قبل ما الأيام تتحمّل) المجالات ماتتنقلش من مكانها قدامك.
const TCAT_USE_KEY = 'waraqa.tcatUse';
let tcatUseSaved = null;
try { tcatUseSaved = JSON.parse(localStorage.getItem(TCAT_USE_KEY) || 'null'); } catch { tcatUseSaved = null; }
function tcatUse() {
  if (!daysLoaded) return tcatUseSaved || {};
  const use = timeCatUsage(daysCache, state.today);
  const str = JSON.stringify(use);
  if (str !== JSON.stringify(tcatUseSaved)) {
    tcatUseSaved = use;
    try { localStorage.setItem(TCAT_USE_KEY, str); } catch { /* التخزين مقفول: الترتيب بيتحسب تاني المرة الجاية */ }
  }
  return use;
}
function allDaysSync() {
  const out = daysCache.filter((d) => d.key !== state.cur);
  out.push({ key: state.cur, data: state.day });
  return out;
}
function sysNow() {
  return systemState(state.goals, state.tasks, state.settings, {
    days: allDaysSync(), metrics: state.metrics, today: state.today,
  });
}

// ---------- الأيام اللي حوالين اليوم المفتوح ----------
const win = { cur: null, today: null, days: new Map(), ready: false };
async function loadWindow() {
  const want = new Set([...satWeekKeys(state.cur), ...weekKeys(state.today), ...weekKeys(addDays(state.cur, -1))]);
  want.delete(state.cur);
  const at = `${state.cur}|${state.today}`;
  const docs = await Promise.all([...want].map(async (k) => [k, (await getDoc(`day/${k}`))?.data || null]));
  if (`${state.cur}|${state.today}` !== at) return;
  win.days = new Map(docs.filter(([, d]) => d));
  win.ready = true;
  render();
}
function winCtx() {
  if (win.cur !== state.cur || win.today !== state.today) {
    win.cur = state.cur;
    win.today = state.today;
    win.ready = false;
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
  // عادتك في الوقت: undefined لحد ما الأيام اللي فاتت تتحمّل، عشان مانقولش "لسه بدري نقارن" وهي مش صح
  const tbase = state.tab === 'time' && win.ready ? timeBaseline(days, state.cur, state.settings) : undefined;
  const curPeriod = periodOf(state.periods, state.cur);
  const periodEv = curPeriod
    ? evalPeriodGoal(curPeriod, { days: allDaysSync(), metrics: state.metrics, today: state.today, settings: state.settings })
    : null;
  const prevNextp = (win.days.get(addDays(state.today, -1))?.nextp || '').trim();
  const review = periodReviewState(state.periods, state.goals, state.today);
  const sys = sysNow();
  return {
    status, pct, base, tbase, tusage: state.tab === 'time' ? tcatUse() : null, hour: new Date().getHours(), sys, gsum: sys.gsum, curPeriod, periodEv, prevNextp, review,
    prayPick: ui.prayPick, closeOpen: ui.closeOpen,
  };
}
const sx = () => ({ configured: configured(), ...syncInfo });
const DRAFTS = ['taskin', 'ideain', 'iq', 'mamt', 'mdesc', 'iamt', 'idesc', 'linein'];

const theme = new URLSearchParams(location.search).get('theme');
if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;

// ---------- الرسم ----------
const TABS = {
  ideas: { shell: ideasShell, update: (v) => updateIdeas(v, state, ui) },
  money: { shell: moneyShell, update: (v) => updateMoney(v, state, ui, allDays) },
};
let shown = null;

// الصفوف اللي بتتسحب لجنب بتفضل مكانها بعد إعادة الرسم (من غيرها بترجع لأولها مع كل لمسة)
const keepScroll = (view) => $$('[data-keep-scroll]', view).map((el) => [el.dataset.keepScroll, el.scrollLeft]);
function restoreScroll(view, keep) {
  for (const [k, x] of keep) {
    const el = view.querySelector(`[data-keep-scroll="${k}"]`);
    if (el && el.scrollLeft !== x) el.scrollLeft = x;
  }
}

function render() {
  const ctx = winCtx();
  setHtml($('#top'), renderHeader(state, ctx));
  updateStatus($('#top'), state);
  const view = $('#view');
  if (state.tab === 'tasks') {
    setHtml(view, renderPlan(state, ui, ctx.sys, ctx.review));
    shown = 'plan';
  } else if (TABS[state.tab]) {
    const tab = TABS[state.tab];
    if (shown !== state.tab) {
      view.innerHTML = tab.shell(state, ui);
      view._html = null;
      shown = state.tab;
    }
    tab.update(view);
  } else if (state.tab === 'time') {
    const entering = shown !== 'time';
    const keep = keepScroll(view);
    setHtml(view, renderTime(state, ui, ctx));
    restoreScroll(view, keep);
    // أول ما تفتح التاب: المجال المختار يبان في الصف حتى لو كان في آخره
    if (entering) view.querySelector('.tbrush .bchip[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    shown = 'time';
  } else {
    const keep = keepScroll(view);
    setHtml(view, renderToday(state, ctx));
    restoreScroll(view, keep);
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
    updateOutputs(sh, state, ui);
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
      if (g) updateGoalDetail(sh, g, ctx.sys, state);
    }
    if (ui.flt) updateFilterSheet(sh, ui.flt, ctx.sys, state);
  }
  scheduleNotifSync();
}
let notifTimer = null;
function scheduleNotifSync() {
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => {
    updateAppBadge(state.tasks, state.today, state.settings);
    syncPinnedTasks(state.tasks, state.today, state.settings);
  }, 250);
}
async function refreshPushUi() {
  ui.push = await getPushState();
  const sh = sheetEl();
  if (sh?.querySelector('[data-out="sroot"]')) updateSettings(sh, state, ui, sx(), allDaysSync());
}
function handleOpenTarget(rawUrl) {
  let open = '';
  try {
    const u = new URL(rawUrl, location.href);
    open = u.searchParams.get('open') || '';
  } catch { open = String(rawUrl || ''); }
  if (!open) return;
  if (isSheetOpen()) requestClose();
  if (open === 'tasks' || open === 'newtask') {
    state.tab = 'tasks';
    ui.planView = 'now';
    render();
    window.scrollTo(0, 0);
    if (open === 'newtask') setTimeout(() => openFilterSheet({ kind: 'task', st: 'active' }), 60);
  } else if (open === 'quick') {
    state.tab = 'day';
    render();
    setTimeout(() => $('[data-role="quickin"]')?.focus(), 60);
  } else if (open === 'day') {
    state.tab = 'day';
    render();
    window.scrollTo(0, 0);
  }
}
subscribe(render);
const updateView = () => {
  if (state.tab === 'tasks') render();
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
  } else if (ui.qmode === 'filter') {
    inp.value = '';
    updateDock($('#dock'), ui, state.cur !== today, state.settings);
    return openFilterSheet({ t: v, p: ui.qarea, kind: 'project', st: sysNow().activeProject ? 'frozen' : 'active' });
  } else if (ui.qmode === 'task') {
    const ok = tryAddTodayTask(v, { goalId: sysNow().activeProject?.id || '' });
    if (ok) toast('المهمة اتضافت للنهارده');
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
  const chk = due && due <= state.today ? canAddTodayTask(state.tasks, state.today, ui.te.id) : { ok: true };
  if (!chk.ok) {
    const tid = ui.te.id;
    patchItem('tasks', tid, { t: txt, pri: !!ui.te.pri, cat: ui.te.cat || undefined, goalId: ui.te.goalId || undefined });
    ui.te = null;
    ui.tswap = { id: tid, t: txt };
    openSheet({ ...taskLimitSheet(ui.tswap, chk.open), onClose: () => { ui.tswap = null; } });
    return;
  }
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
  haptic(t.done ? 'tap' : 'done');
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
  if (tryAddTodayTask(txt, { goalId: sysNow().activeProject?.id || '' })) {
    toast('اتحولت لمهمة في النهارده ✓');
  }
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
  refreshPushUi();
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
  ui.hbfFrom = sheetEl()?.querySelector('[data-out="sroot"]') ? 'settings' : null;
  const h = k ? state.settings.habits.find((x) => x.k === k) : null;
  ui.hbf = h
    ? { origK: h.k, n: h.n, g: h.g, numU: h.numU || '', rem: h.rem || '' }
    : { origK: '', n: '', g: activeLifeAreas(state.settings)[0]?.id || 'deen', numU: '', rem: '' };
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
  const rem = (sh?.querySelector('[data-role="hfrem"]')?.value ?? f.rem ?? '').trim();
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
      if (rem) it.rem = rem;
      else delete it.rem;
    }
    patchSettings({ habits: list });
    toast('اتحفظ تعديل العادة ✓');
  } else {
    const k = `h_${uid().slice(-5)}`;
    list.push({ k, n, g: f.g, on: true, ...(numU ? { numK: `hn_${k}`, numU } : {}), ...(rem ? { rem } : {}) });
    patchSettings({ habits: list });
    toast(`اتضافت عادة «${n}»`);
  }
  if (ui.hbfFrom === 'settings') openSettings('habits');
  else requestClose();
}
function deleteHabitForm() {
  if (!ui.hbf?.origK) return;
  const before = structuredClone(state.settings.habits);
  const next = before.filter((x) => x.k !== ui.hbf.origK);
  if (!next.length) return toastErr('لازم تفضل عادة واحدة على الأقل');
  patchSettings({ habits: next });
  if (ui.hbfFrom === 'settings') openSettings('habits');
  else requestClose();
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

function openPeriodForm(id, prefill = null) {
  refreshToday();
  ui.pfFrom = sheetEl()?.querySelector('[data-out="sroot"]') ? 'settings' : null;
  const p = id ? findPeriod(id) : null;
  const g = p?.goal || null;
  const len = p ? 0 : 11;
  const from = p ? p.from : state.today;
  const to = p ? p.to : addDays(state.today, len - 1);
  const gKind = g?.kind || prefill?.gKind || 'build';
  const gSource = g?.source || defaultPeriodSource(gKind);
  const daysLen = Math.max(1, Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 864e5) + 1);
  ui.pdet = null;
  ui.pf = {
    id: p?.id || null,
    len,
    from,
    to,
    name: p?.name || prefill?.name || '',
    gTitle: g?.title || prefill?.gTitle || '',
    gKind,
    gSource,
    gDir: g?.dir || 'min',
    gTarget: g?.target != null ? String(g.target) : String(Math.max(1, Math.round(daysLen * 0.8))),
    gUnit: g?.unit ?? defaultPeriodUnit(gKind, gSource),
    gStepsText: Array.isArray(g?.steps) ? g.steps.map((x) => x.t).join('\n') : '',
    fromBacklogId: prefill?.fromBacklogId || null,
    fromReview: !!prefill?.fromReview,
  };
  openSheet({
    ...periodFormSheet(ui.pf),
    onClose: () => {
      ui.pf = null;
      if (ui.rev && !ui.rev._handoff) ui.rev = null;
    },
  });
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
  if (f.fromBacklogId) removeItem('goals', f.fromBacklogId);
  if (f.fromReview && ui.rev) {
    ui.rev.stats.period += 1;
    ui.rev.i += 1;
    ui.rev._handoff = true;
    showReviewStep();
    ui.rev._handoff = false;
    toast(`بدأت فترة جديدة بالهدف «${gTitle || name || periodLabel(p)}»`);
    return;
  }
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
/** «كمّل» أو «سجّل» من كارت الساعة دي: الساعة الحالية تاخد المجال ده، ومعاه «رجّع». */
function paintNow(hStr, c) {
  const cat = allTimeCatMap(state.settings).get(c);
  if (!cat) return;
  const before = structuredClone(state.day.hrs || {});
  const prev = before[hStr];
  saveHrs({ ...before, [hStr]: prev?.t ? { c, t: prev.t } : { c } });
  toast(`الساعة ${fmtHour(+hStr)}: ${cat.name}`, 'رجّع', () => saveHrs(before));
}
function openHourEdit(h) {
  const prev = state.day.hrs?.[String(h)];
  ui.hf = { h, c: prev?.c || (ui.tbrush !== 'clear' ? ui.tbrush : 'work'), t: prev?.t || '', span: 1 };
  openSheet({ ...hourSheet(h, ui.hf, state, tcatUse()), onClose: () => { ui.hf = null; } });
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

// ---------- نظام الفلتر والربط الموحّد (المجال ← هدف ← مشروع واحد شغّال ← ٣ مهام للنهاردة + عادات للمجال) ----------
const findGoal = (id) => state.goals.find((x) => String(x.id) === String(id));

function freezeOtherActiveProjects(exceptId = '') {
  let frozenPrev = null;
  for (const g of state.goals) {
    if (String(g.id) !== String(exceptId) && itemKind(g) === 'project' && itemStatus(g) === 'active') {
      frozenPrev = frozenPrev || g.t;
      patchItem('goals', g.id, { st: 'frozen', f: false });
    }
  }
  return frozenPrev;
}

function openGoalDetail(id) {
  const g = findGoal(id);
  if (!g) return;
  if (itemKind(g) === 'goal') return openFilterEdit(g.id);
  ui.gdet = g.id;
  ui.flt = null;
  openSheet({ ...goalDetailSheet(g), onClose: () => { ui.gdet = null; } });
  updateGoalDetail(sheetEl(), g, sysNow(), state);
}

// ---------- الفلتر السريع (٣ أسئلة بس) ----------
function openFilterSheet(prefill = {}) {
  refreshToday();
  const sys = sysNow();
  const areas = activeLifeAreas(state.settings);
  const curArea = String(ui.planView || '').startsWith('area:') ? ui.planView.slice(5) : '';
  const p = areas.some((a) => a.id === prefill.p)
    ? prefill.p
    : (areas.some((a) => a.id === curArea) ? curArea : (areas[0]?.id || 'work'));
  const kind = prefill.kind || 'project';
  const defaultSt = kind === 'habit' || kind === 'task'
    ? 'active'
    : (kind === 'project' ? (sys.activeProject ? 'frozen' : 'active') : 'active');
  ui.gdet = null;
  ui.flt = {
    id: null,
    p,
    kind,
    st: prefill.st || defaultSt,
    t: prefill.t || '',
    why: prefill.why || '',
    outcome: prefill.outcome || '',
    parentId: prefill.parentId || '',
    newGoal: false,
    newGoalTitle: '',
    unit: '',
    rem: prefill.rem || '',
    track: 'none',
    src: {},
    target: '',
    from: state.today,
    stepsText: '',
    pri: !!prefill.pri,
    linkActive: !!sys.activeProject,
    swapTaskId: '',
    fromReview: !!prefill.fromReview,
  };
  openSheet({
    ...filterSheet(ui.flt, sys, state),
    onClose: () => {
      ui.flt = null;
      if (ui.rev && !ui.rev._handoff) ui.rev = null;
    },
  });
  updateFilterSheet(sheetEl(), ui.flt, sys, state, true);
}

function openFilterEdit(id) {
  const g = findGoal(id);
  if (!g) return;
  refreshToday();
  const sys = sysNow();
  const areas = activeLifeAreas(state.settings);
  const p = areas.some((a) => a.id === g.p) ? g.p : (areas[0]?.id || 'work');
  const kind = itemKind(g);
  const tracked = kind === 'goal' && hasGoalTarget(g) && ['habit', 'time', 'manual'].includes(g.m);
  ui.gdet = null;
  ui.flt = {
    id: g.id,
    p,
    kind,
    st: itemStatus(g) === 'frozen' ? 'frozen' : 'active',
    t: g.t || '',
    why: g.why || '',
    outcome: g.outcome || '',
    parentId: g.parentId || '',
    newGoal: false,
    newGoalTitle: '',
    unit: tracked ? (g.unit || '') : '',
    rem: '',
    track: tracked ? g.m : 'none',
    src: tracked && g.src ? structuredClone(g.src) : {},
    target: tracked && g.target != null ? String(g.target) : '',
    from: g.from || state.today,
    stepsText: '',
    pri: !!g.pri,
    linkActive: false,
    swapTaskId: '',
    fromReview: false,
  };
  openSheet({
    ...filterSheet(ui.flt, sys, state),
    onClose: () => { ui.flt = null; },
  });
  updateFilterSheet(sheetEl(), ui.flt, sys, state, true);
}

function defaultHabitTrack(areaId) {
  const hs = activeHabits(state.settings);
  const h = hs.find((x) => x.g === areaId && x.numK) || hs.find((x) => x.g === areaId) || hs[0];
  if (!h) return { src: {}, unit: '' };
  if (h.numK && h.numU === 'دقيقة') return { src: { kind: 'sum', k: h.numK, div: 60 }, unit: 'ساعة' };
  if (h.numK) return { src: { kind: 'sum', k: h.numK }, unit: h.numU || '' };
  return { src: { kind: 'days', k: h.k }, unit: 'يوم' };
}

function defaultTimeTrack(areaId) {
  const cats = activeTimeCats(state.settings);
  const map = { growth: 'learn', work: 'work', deen: 'deen', health: 'health' };
  const pref = map[areaId];
  const c = cats.find((x) => x.id === pref)?.id || cats[0]?.id || 'learn';
  return { src: { kind: c === 'work' ? 'work' : 'cat', c }, unit: 'ساعة' };
}

function saveFilterSheet() {
  const f = ui.flt;
  if (!f) return undefined;
  const sh = sheetEl();
  const t = (sh?.querySelector('[data-role="flttitle"]')?.value ?? f.t ?? '').trim();
  if (!t) {
    toastErr('اكتب الاسم الأول');
    return sh?.querySelector('[data-role="flttitle"]')?.focus();
  }

  // ١. عادة صغيرة ← تخدم المجال مباشرة
  if (f.kind === 'habit') {
    const unit = (sh?.querySelector('[data-role="fltunit"]')?.value ?? f.unit ?? '').trim();
    const rem = (sh?.querySelector('[data-role="fltrem"]')?.value ?? f.rem ?? '').trim();
    const k = `h_${uid().slice(-5)}`;
    const list = structuredClone(state.settings.habits);
    list.push({
      k, n: t, g: f.p, on: f.st === 'active',
      ...(unit ? { numK: `hn_${k}`, numU: unit } : {}),
      ...(rem ? { rem } : {}),
    });
    patchSettings({ habits: list });
    requestClose();
    return toast(f.st === 'active' ? `اتضافت عادة «${t}» للمجال ✓` : `اتحفظت عادة «${t}» في المجمّد`);
  }

  // ٢. مهمة مرة واحدة ← قاعدة ٣ مهام بالكتير للنهاردة
  if (f.kind === 'task') {
    refreshToday();
    const sys = sysNow();
    const goalId = f.linkActive && sys.activeProject ? sys.activeProject.id : '';
    const areaObj = activeLifeAreas(state.settings).find((a) => a.id === f.p);
    const cat = areaObj?.name || '';
    if (f.st === 'frozen') {
      addTask(t, { due: '', pri: !!f.pri, goalId, cat });
      requestClose();
      return toast(`اتجمّدت مهمة «${t}» لبعدين`);
    }
    const chk = canAddTodayTask(state.tasks, state.today);
    if (!chk.ok) {
      if (f.swapTaskId) {
        patchItem('tasks', f.swapTaskId, { due: '' });
        addTask(t, { due: state.today, pri: !!f.pri, goalId, cat });
        requestClose();
        return toast('اتبدّلت المهمة واتضافت للنهاردة ✓');
      }
      addTask(t, { due: '', pri: !!f.pri, goalId, cat });
      requestClose();
      return toast(`اتحفظت في المجمّد (عندك ${fmtNum(TODAY_TASK_LIMIT)} مهام للنهاردة)`);
    }
    addTask(t, { due: state.today, pri: !!f.pri, goalId, cat });
    requestClose();
    return toast('اتضافت لمهام النهاردة ✓');
  }

  // ٣. هدف (ليه؟) — اختيارياً بقياس تقدّم تلقائي أو عدّاد يدوي
  if (f.kind === 'goal') {
    const why = (sh?.querySelector('[data-role="fltwhy"]')?.value ?? f.why ?? '').trim();
    const payload = { kind: 'goal', p: f.p, t, why: why || undefined, st: f.st, done: false };
    if (f.track && f.track !== 'none') {
      const target = readNumber(sh?.querySelector('[data-role="flttarget"]')?.value ?? f.target);
      if (!target || target <= 0) {
        toastErr('اكتب الرقم المستهدف للهدف');
        return sh?.querySelector('[data-role="flttarget"]')?.focus();
      }
      const unit = (sh?.querySelector('[data-role="fltunit"]')?.value ?? f.unit ?? '').trim();
      const from = (sh?.querySelector('[data-role="fltfrom"]')?.value ?? f.from ?? state.today).trim() || state.today;
      if (f.track === 'habit') {
        const src = f.src?.k ? f.src : defaultHabitTrack(f.p).src;
        Object.assign(payload, { m: 'habit', src, target, unit: unit || undefined, from, cur: undefined });
      } else if (f.track === 'time') {
        const src = f.src?.c ? f.src : defaultTimeTrack(f.p).src;
        Object.assign(payload, { m: 'time', src, target, unit: 'ساعة', from, cur: undefined });
      } else {
        const prevCur = f.id ? (+(findGoal(f.id)?.cur) || 0) : 0;
        Object.assign(payload, { m: 'manual', src: undefined, target, unit: unit || undefined, from: undefined, cur: prevCur });
      }
    } else if (f.id) {
      Object.assign(payload, { m: undefined, src: undefined, target: undefined, unit: undefined, from: undefined, cur: undefined });
    }
    if (f.id) {
      patchItem('goals', f.id, payload);
      requestClose();
      return toast('اتحفظ تعديل الهدف ✓');
    }
    addItem('goals', { id: uid(), ...payload, at: Date.now() });
    requestClose();
    return toast(f.st === 'frozen' ? `اتجمّد هدف «${t}»` : `اتضاف هدف «${t}» ✓`);
  }

  // ٤. مشروع (له نتيجة ونهاية وبيحقق هدف — قاعدة مشروع واحد شغّال بس)
  const outcome = (sh?.querySelector('[data-role="fltout"]')?.value ?? f.outcome ?? '').trim();
  let parentId = f.parentId || '';
  if (f.newGoal) {
    const ngt = (sh?.querySelector('[data-role="fltnewg"]')?.value ?? f.newGoalTitle ?? '').trim();
    if (ngt) {
      const ng = { id: uid(), kind: 'goal', p: f.p, t: ngt, st: f.st, done: false, at: Date.now() };
      addItem('goals', ng);
      parentId = ng.id;
    }
  }

  let frozenOld = null;
  if (f.st === 'active') frozenOld = freezeOtherActiveProjects(f.id || '');

  if (f.id) {
    const old = findGoal(f.id);
    patchItem('goals', f.id, {
      kind: 'project', p: f.p, parentId: parentId || undefined, t,
      outcome: outcome || undefined, pri: !!f.pri, st: f.st, f: f.st === 'active',
      m: old?.m || 'steps', done: false,
    });
    requestClose();
    if (f.st === 'active') {
      state.tab = 'tasks';
      ui.planView = 'now';
      render();
    }
    return toast(frozenOld ? `اتجمّد «${frozenOld}» واشتغل «${t}» ✓` : 'اتحفظ تعديل المشروع ✓');
  }

  const steps = (sh?.querySelector('[data-role="fltsteps"]')?.value ?? f.stepsText ?? '')
    .split(/\r?\n/).map((x) => x.trim()).filter(Boolean).map((stTxt) => ({ id: uid(), t: stTxt, done: false }));
  addItem('goals', {
    id: uid(), kind: 'project', p: f.p, parentId: parentId || undefined, t,
    outcome: outcome || undefined, pri: !!f.pri, st: f.st, f: f.st === 'active',
    m: 'steps', steps, done: false, at: Date.now(),
  });
  requestClose();
  state.tab = 'tasks';
  if (!String(ui.planView || '').startsWith('area:')) ui.planView = f.st === 'active' ? 'now' : 'frozen';
  render();
  return toast(frozenOld ? `اتجمّد «${frozenOld}» وبدأ «${t}» ✓` : (f.st === 'active' ? `بدأ مشروع «${t}» ✓` : `اتجمّد مشروع «${t}»`));
}

// ---------- التجميد وإلغاء التجميد وحراس القواعد ----------
function freezeGoal(id) {
  const g = findGoal(id);
  if (!g) return;
  const prev = { st: g.st, f: g.f, done: g.done };
  patchItem('goals', id, { st: 'frozen', f: false, done: false });
  if (isSheetOpen()) requestClose();
  toast(`اتجمّد «${g.t}» (مش ممسوح)`, 'رجّع', () => patchItem('goals', id, prev));
}

function unfreezeGoal(id) {
  const g = findGoal(id);
  if (!g) return;
  if (itemKind(g) === 'goal') {
    patchItem('goals', id, { st: 'active', done: false });
    toast(`الهدف «${g.t}» بقى نشط ✓`);
    return;
  }
  const curAct = sysNow().activeProject;
  if (curAct && String(curAct.id) !== String(g.id)) {
    openSheet(projectSwapSheet(g, curAct));
    return;
  }
  patchItem('goals', id, { st: 'active', f: true, done: false, dAt: undefined });
  if (isSheetOpen()) requestClose();
  state.tab = 'tasks';
  ui.planView = 'now';
  render();
  toast(`بدأ مشروع «${g.t}» ✓`);
}

function doProjectSwap(incomingId) {
  const g = findGoal(incomingId);
  if (!g) return;
  const oldTitle = freezeOtherActiveProjects(incomingId);
  patchItem('goals', incomingId, { st: 'active', f: true, done: false, dAt: undefined });
  requestClose();
  state.tab = 'tasks';
  ui.planView = 'now';
  render();
  toast(oldTitle ? `اتجمّد «${oldTitle}» وبدأ «${g.t}» ✓` : `بدأ «${g.t}» ✓`);
}

function setHabitActive(k, on) {
  const before = structuredClone(state.settings.habits);
  const h = before.find((x) => x.k === k);
  if (!h) return;
  const next = before.map((x) => (x.k === k ? { ...x, on } : x));
  patchSettings({ habits: next });
  toast(on ? `رجّعت عادة «${h.n}» شغّالة ✓` : `اتجمّدت عادة «${h.n}» (تاريخها محفوظ)`, 'رجّع', () => patchSettings({ habits: before }));
}

function freezeTask(id) {
  const t = state.tasks.find((x) => String(x.id) === String(id));
  if (!t) return;
  const oldDue = t.due || '';
  patchItem('tasks', id, { due: '' });
  toast(`اتجمّدت «${t.t}» لبعدين`, 'رجّع', () => patchItem('tasks', id, { due: oldDue }));
}

function tryAddTodayTask(title, opts = {}) {
  refreshToday();
  const chk = canAddTodayTask(state.tasks, state.today);
  if (chk.ok) {
    addTask(title, { ...opts, due: state.today });
    return true;
  }
  ui.tswap = { id: null, t: title, pri: !!opts.pri, goalId: opts.goalId || '', cat: opts.cat || '' };
  openSheet({ ...taskLimitSheet(ui.tswap, chk.open), onClose: () => { ui.tswap = null; } });
  return false;
}

function activateTaskForToday(id) {
  const t = state.tasks.find((x) => String(x.id) === String(id));
  if (!t) return;
  refreshToday();
  const chk = canAddTodayTask(state.tasks, state.today, id);
  if (chk.ok) {
    patchItem('tasks', id, { due: state.today });
    toast('اتنقلت لمهام النهاردة ✓');
    return;
  }
  ui.tswap = { id: t.id, t: t.t };
  openSheet({ ...taskLimitSheet(ui.tswap, chk.open), onClose: () => { ui.tswap = null; } });
}

function doTaskSwap(swapOutId) {
  if (!ui.tswap) return;
  refreshToday();
  patchItem('tasks', swapOutId, { due: '' });
  if (ui.tswap.id) {
    patchItem('tasks', ui.tswap.id, { due: state.today });
  } else {
    addTask(ui.tswap.t, { due: state.today, pri: !!ui.tswap.pri, goalId: ui.tswap.goalId, cat: ui.tswap.cat });
  }
  ui.tswap = null;
  requestClose();
  toast('اتجمّدت القديمة ودخلت دي للنهاردة ✓');
}

function doTaskSwapFreeze() {
  if (!ui.tswap) return requestClose();
  if (!ui.tswap.id) {
    addTask(ui.tswap.t, { due: '', pri: !!ui.tswap.pri, goalId: ui.tswap.goalId, cat: ui.tswap.cat });
  }
  ui.tswap = null;
  requestClose();
  toast('اتحفظت في المجمّد لبعدين');
}

// ---------- خريطة مجالات الحياة القابلة للتخصيص ----------
function openLifeAreaForm(id) {
  ui.lafFrom = sheetEl()?.querySelector('[data-out="sroot"]') ? 'settings' : null;
  const areas = activeLifeAreas(state.settings);
  const a = id ? areas.find((x) => x.id === id) : null;
  ui.laf = a
    ? { origId: a.id, name: a.name, icon: a.icon || 'target', note: a.note || '' }
    : { origId: '', name: '', icon: 'compass', note: '' };
  openSheet({ ...lifeAreaFormSheet(ui.laf, areas.length > 1), onClose: () => { ui.laf = null; } });
}
function saveLifeAreaForm() {
  const f = ui.laf;
  if (!f) return;
  const sh = sheetEl();
  const name = (sh?.querySelector('[data-role="laname"]')?.value || '').trim();
  if (!name) {
    toastErr('اكتب اسم المجال');
    sh?.querySelector('[data-role="laname"]')?.focus();
    return;
  }
  const note = (sh?.querySelector('[data-role="lanote"]')?.value || '').trim();
  const list = structuredClone(activeLifeAreas(state.settings));
  if (f.origId) {
    const it = list.find((x) => x.id === f.origId);
    if (it) {
      it.name = name;
      it.icon = f.icon || 'target';
      if (note) it.note = note;
      else delete it.note;
    }
    patchSettings({ lifeAreas: list });
    toast(`اتحفظ مجال «${name}»`);
  } else {
    const newArea = { id: `la_${uid().slice(-5)}`, name, icon: f.icon || 'compass', ...(note ? { note } : {}) };
    list.push(newArea);
    patchSettings({ lifeAreas: list });
    toast(`اتضاف مجال «${name}»`);
  }
  if (ui.lafFrom === 'settings') openSettings('areas');
  else requestClose();
}
function deleteLifeAreaForm() {
  if (!ui.laf?.origId) return;
  const before = structuredClone(activeLifeAreas(state.settings));
  const next = before.filter((x) => x.id !== ui.laf.origId);
  if (!next.length) return toastErr('لازم يفضل مجال حياة واحد على الأقل');
  if (ui.planView === `area:${ui.laf.origId}`) ui.planView = 'areas';
  patchSettings({ lifeAreas: next });
  if (ui.lafFrom === 'settings') openSettings('areas');
  else requestClose();
  return toast('اتمسح المجال', 'رجّع', () => patchSettings({ lifeAreas: before }));
}

// ---------- جلسة مراجعة المجمّد (نهاية الفترة) ----------
function startGoalReview(pid = null) {
  refreshToday();
  const sys = sysNow();
  const ids = [...sys.frozenProjects.map((x) => x.project.id), ...sys.frozenGoals.map((x) => x.goal.id)];
  if (!ids.length) return toastErr('مفيش مشاريع أو أهداف مجمّدة دلوقتي');
  const revSt = periodReviewState(state.periods, state.goals, state.today);
  const stampPeriodId = pid || (revSt.due ? revSt.period?.id : null);
  ui.rev = {
    ids,
    i: 0,
    stampPeriodId,
    stats: { activated: 0, kept: 0, dropped: 0 },
    _handoff: false,
  };
  return showReviewStep();
}
function showReviewStep() {
  const rv = ui.rev;
  if (!rv) return;
  while (rv.i < rv.ids.length) {
    const cur = findGoal(rv.ids[rv.i]);
    if (cur && isBacklogGoal(cur)) break;
    rv.i += 1;
  }
  if (rv.i >= rv.ids.length && rv.stampPeriodId) {
    patchItem('periods', rv.stampPeriodId, { reviewedAt: Date.now() });
    rv.stampPeriodId = null;
  }
  openSheet({
    ...goalReviewSheet(rv, sysNow(), state),
    onClose: () => { if (!ui.rev?._handoff) ui.rev = null; },
  });
}
function reviewActivate(id) {
  const g = findGoal(id);
  if (!g) return;
  if (itemKind(g) === 'project') {
    freezeOtherActiveProjects(id);
    patchItem('goals', id, { st: 'active', f: true, done: false });
    toast(`بدأ مشروع «${g.t}» دلوقتي ✓`);
  } else {
    patchItem('goals', id, { st: 'active', done: false });
    toast(`الهدف «${g.t}» بقى نشط ✓`);
  }
  if (!ui.rev) return;
  ui.rev.stats.activated += 1;
  ui.rev.i += 1;
  ui.rev._handoff = true;
  showReviewStep();
  ui.rev._handoff = false;
}
function reviewKeep(id) {
  if (id && findGoal(id)) patchItem('goals', id, { revAt: Date.now() });
  if (!ui.rev) return;
  ui.rev.stats.kept += 1;
  ui.rev.i += 1;
  ui.rev._handoff = true;
  showReviewStep();
  ui.rev._handoff = false;
}
function reviewDrop(id) {
  const r = id ? removeItem('goals', id) : null;
  if (!ui.rev) return;
  ui.rev.stats.dropped += 1;
  ui.rev.i += 1;
  ui.rev._handoff = true;
  showReviewStep();
  ui.rev._handoff = false;
  if (r) toast(`اتشال «${r.item.t}»`, 'رجّع', () => restoreItem('goals', r));
}
function dismissReviewBanner(pid) {
  if (pid) patchItem('periods', pid, { reviewedAt: Date.now() });
  toast('اتأجلت المراجعة — تقدر تبدأها أي وقت من المجمّد');
}

function toggleGoalStep(gid, sid) {
  const g = findGoal(gid);
  if (!g || !Array.isArray(g.steps)) return;
  haptic('tap');
  patchItem('goals', gid, { steps: g.steps.map((s) => (String(s.id) === String(sid) ? { ...s, done: !s.done } : s)) });
}
function deleteGoalStep(gid, sid) {
  const g = findGoal(gid);
  if (!g || !Array.isArray(g.steps)) return;
  const before = structuredClone(g.steps);
  patchItem('goals', gid, { steps: g.steps.filter((s) => String(s.id) !== String(sid)) });
  toast('اتمسحت الخطوة', 'رجّع', () => patchItem('goals', gid, { steps: before }));
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
  return toast('اتضافت الخطوة');
}
function addGoalTask(form) {
  const gid = form.dataset.gid;
  const inp = form.querySelector('[data-role="gtaskin"]');
  const v = inp.value.trim();
  if (!v) return inp.focus();
  inp.value = '';
  if (tryAddTodayTask(v, { goalId: gid })) toast('اتضافت لمهام النهاردة ✓');
  return undefined;
}
function openGoalArchive(id) {
  const g = findGoal(id);
  if (!g) return;
  ui.gdet = null;
  openSheet(goalArchiveSheet(g));
  const ta = sheetEl()?.querySelector('[data-role="gnote"]');
  if (ta) ta.focus({ preventScroll: true });
}
function incrementGoal(id, delta = 1) {
  const g = findGoal(id);
  if (!g) return;
  const next = Math.max(0, (+g.cur || 0) + delta);
  const reached = +g.target > 0 && next >= +g.target;
  haptic(reached ? 'done' : 'tap');
  patchItem('goals', id, { cur: next });
  if (reached) toast(`عاش! وصلت لـ ${fmtNum(next)} ${g.unit || ''} — تقدر تأرشف «${g.t}» ✓`);
}
function saveGoalArchive(id) {
  const g = findGoal(id);
  const isGoal = itemKind(g) === 'goal';
  const note = (sheetEl()?.querySelector('[data-role="gnote"]')?.value || '').trim();
  patchItem('goals', id, { done: true, f: false, st: 'active', dAt: Date.now(), ...(note ? { note } : {}) });
  haptic('done');
  const nextFrozen = sysNow().frozenProjects;
  if (!isGoal && nextFrozen.length) {
    openSheet(nextProjectSheet(g?.t || 'المشروع', nextFrozen));
    toast('عاش! المشروع خلص ✓');
    return;
  }
  requestClose();
  ui.planView = 'now';
  render();
  toast(isGoal ? 'عاش! الهدف خلص ✓' : 'عاش! المشروع خلص ✓');
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
  const areas = activeLifeAreas(state.settings);
  const guessed = pMap[idea.c] || 'work';
  const p = areas.some((a) => a.id === guessed) ? guessed : (areas[0]?.id || 'work');
  openFilterSheet({ t: idea.t.replace(/\s+/g, ' ').trim().slice(0, 90), p, kind: 'project', st: 'frozen' });
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
  if (b.dataset.qarea) {
    ui.qarea = b.dataset.qarea;
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
    const next = cycleTri(state.day[b.dataset.tri]);
    haptic(next === 2 ? 'done' : 'tap');
    return setK(b.dataset.tri, next);
  }
  const sg = b.closest('[data-seg]');
  if (sg && b.dataset.v) {
    const k = sg.dataset.seg;
    return setK(k, state.day[k] === b.dataset.v ? '' : b.dataset.v);
  }

  const id = b.dataset.id;
  switch (b.dataset.act) {
    // الصلوات الـ ٥ بتقييم الخشوع والاستعداد (١–٥) + التوافق مع التبديل القديم
    case 'prayer': {
      const patch = togglePrayer(state.day, b.dataset.p);
      if (patch) {
        haptic('tap');
        setMany(patch);
      }
      return undefined;
    }
    case 'praypick':
      ui.prayPick = ui.prayPick === b.dataset.p ? null : b.dataset.p;
      haptic('tap');
      return render();
    case 'prayrate': {
      const v = +b.dataset.v || 0;
      const patch = setPrayerScore(state.day, b.dataset.p, v);
      ui.prayPick = null;
      if (patch) {
        haptic(v > 0 ? 'done' : 'tap');
        setMany(patch);
      } else {
        render();
      }
      return undefined;
    }
    case 'eodtoggle':
      ui.closeOpen = !ui.closeOpen;
      return render();
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
    // أولوية امبارح ← لمهامي (مع احترام حد الـ ٣ مهام)
    case 'nextptask':
      if (tryAddTodayTask(b.dataset.v, { pri: true, goalId: sysNow().activeProject?.id || '' })) {
        return toast('اتضافت لأولويات مهام النهارده ✓');
      }
      return undefined;
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
    case 'tptog': {
      // فتح/قفل فترة بإيدك: بيغلب القاعدة لحد ما تغيّر اليوم المفتوح
      ui.topen = { [state.cur]: { ...(ui.topen?.[state.cur] || {}), [b.dataset.p]: b.getAttribute('aria-expanded') !== 'true' } };
      return render();
    }
    case 'hnow': return paintNow(b.dataset.h, b.dataset.c);
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
    // نظام الفلتر والربط الموحّد (دلوقتي · المجمّد · المجالات + حراس القواعد + المراجعة)
    case 'planview': ui.planView = b.dataset.v; return render();
    case 'planfrozen': state.tab = 'tasks'; ui.planView = 'frozen'; render(); return window.scrollTo(0, 0);
    case 'gplan': state.tab = 'tasks'; ui.planView = 'now'; render(); return window.scrollTo(0, 0);
    case 'gtasks': state.tab = 'tasks'; ui.planView = 'now'; render(); return window.scrollTo(0, 0);
    case 'ftype': ui.ftype = b.dataset.v; return render();
    case 'farea': ui.farea = b.dataset.v; return render();
    case 'fltform':
      return openFilterSheet({
        kind: b.dataset.kind || undefined,
        p: b.dataset.p || undefined,
        st: b.dataset.st || undefined,
        parentId: b.dataset.parent || undefined,
      });
    case 'fltedit': return openFilterEdit(id);
    case 'fltp':
      if (ui.flt) {
        ui.flt.p = b.dataset.v;
        ui.flt.parentId = '';
        ui.flt.newGoal = false;
        updateFilterSheet(sheetEl(), ui.flt, sysNow(), state, true);
      }
      return undefined;
    case 'fltkind':
      if (ui.flt) {
        ui.flt.kind = b.dataset.v;
        ui.flt.parentId = '';
        ui.flt.newGoal = false;
        ui.flt.swapTaskId = '';
        if (ui.flt.kind === 'project') ui.flt.st = sysNow().activeProject ? 'frozen' : 'active';
        else if (ui.flt.kind === 'habit' || ui.flt.kind === 'task') ui.flt.st = 'active';
        updateFilterSheet(sheetEl(), ui.flt, sysNow(), state, true);
      }
      return undefined;
    case 'fltst':
      if (ui.flt) {
        ui.flt.st = b.dataset.v === 'frozen' ? 'frozen' : 'active';
        ui.flt.swapTaskId = '';
        updateFilterSheet(sheetEl(), ui.flt, sysNow(), state, false);
      }
      return undefined;
    case 'fltpar':
      if (ui.flt) {
        if (b.dataset.v === '__new__') {
          ui.flt.newGoal = !ui.flt.newGoal;
          ui.flt.parentId = '';
        } else {
          ui.flt.newGoal = false;
          ui.flt.parentId = b.dataset.v;
        }
        updateFilterSheet(sheetEl(), ui.flt, sysNow(), state, true);
        if (ui.flt.newGoal) sheetEl()?.querySelector('[data-role="fltnewg"]')?.focus();
      }
      return undefined;
    case 'fltpri':
      if (ui.flt) { ui.flt.pri = !ui.flt.pri; updateFilterSheet(sheetEl(), ui.flt, sysNow(), state, true); }
      return undefined;
    case 'fltlinkp':
      if (ui.flt) { ui.flt.linkActive = !ui.flt.linkActive; updateFilterSheet(sheetEl(), ui.flt, sysNow(), state, true); }
      return undefined;
    case 'flttrack':
      if (ui.flt) {
        const tr = b.dataset.v || 'none';
        ui.flt.track = tr;
        if (tr === 'habit') {
          const def = defaultHabitTrack(ui.flt.p);
          ui.flt.src = def.src;
          ui.flt.unit = def.unit;
        } else if (tr === 'time') {
          const def = defaultTimeTrack(ui.flt.p);
          ui.flt.src = def.src;
          ui.flt.unit = def.unit;
        } else if (tr === 'manual') {
          ui.flt.src = {};
        } else {
          ui.flt.src = {};
        }
        updateFilterSheet(sheetEl(), ui.flt, sysNow(), state, true);
      }
      return undefined;
    case 'flthsrc':
      if (ui.flt) {
        const div = +b.dataset.div || 1;
        ui.flt.src = { kind: b.dataset.sk || 'days', k: b.dataset.k, ...(div > 1 ? { div } : {}) };
        ui.flt.unit = b.dataset.u || '';
        updateFilterSheet(sheetEl(), ui.flt, sysNow(), state, true);
      }
      return undefined;
    case 'flttcat':
      if (ui.flt) {
        const c = b.dataset.v || 'learn';
        ui.flt.src = { kind: c === 'work' ? 'work' : 'cat', c };
        ui.flt.unit = 'ساعة';
        updateFilterSheet(sheetEl(), ui.flt, sysNow(), state, true);
      }
      return undefined;
    case 'fltswap':
      if (ui.flt) {
        ui.flt.swapTaskId = String(ui.flt.swapTaskId) === String(id) ? '' : id;
        updateFilterSheet(sheetEl(), ui.flt, sysNow(), state);
      }
      return undefined;
    case 'fltsave': return saveFilterSheet();
    // تفاصيل وتجميد وإلغاء تجميد المشاريع والأهداف والعادات والمهام
    case 'gopen': return openGoalDetail(id);
    case 'ginc': return incrementGoal(id, 1);
    case 'gfreeze': return freezeGoal(id);
    case 'gunfreeze': return unfreezeGoal(id);
    case 'gswapdo': return doProjectSwap(id);
    case 'hfreeze': return setHabitActive(b.dataset.k, false);
    case 'hunfreeze': return setHabitActive(b.dataset.k, true);
    case 'tfreeze': return freezeTask(id);
    case 'tactivate': return activateTaskForToday(id);
    case 'tswapdo': return doTaskSwap(b.dataset.swap);
    case 'tswapfreeze': return doTaskSwapFreeze();
    case 'gstog': return toggleGoalStep(b.dataset.gid, b.dataset.sid);
    case 'gsdel': return deleteGoalStep(b.dataset.gid, b.dataset.sid);
    case 'garchopen': return openGoalArchive(id);
    case 'garchsave': return saveGoalArchive(id);
    case 'gdel': return deleteGoal(id);
    // مجالات الحياة القابلة للتخصيص
    case 'laform': return openLifeAreaForm(id);
    case 'laico':
      if (ui.laf) {
        ui.laf.icon = b.dataset.v;
        for (const x of sheetEl().querySelectorAll('[data-act="laico"]')) x.setAttribute('aria-pressed', x.dataset.v === ui.laf.icon);
      }
      return undefined;
    case 'lasave': return saveLifeAreaForm();
    case 'ladel': return deleteLifeAreaForm();
    // جلسة مراجعة المجمّد (نهاية الفترة)
    case 'grevstart': return startGoalReview(b.dataset.pid || null);
    case 'grevdone': return dismissReviewBanner(b.dataset.pid || null);
    case 'grevact': return reviewActivate(id);
    case 'grevkeep': return reviewKeep(id);
    case 'grevdrop': return reviewDrop(id);
    case 'grevback':
      if (ui.rev) {
        ui.rev._handoff = true;
        showReviewStep();
        ui.rev._handoff = false;
      } else {
        requestClose();
      }
      return undefined;
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
    // التنبيهات والتفاعل
    case 'ntaskspin':
      try {
        const on = await toggleTasksPin();
        await refreshPushUi();
        return toast(on ? 'اتثبّتت قائمة مهام النهارده في الإشعارات ✓' : 'اتقفلت قائمة المهام في الإشعارات');
      } catch (err) {
        return toastErr(err.message || 'ماقدرناش نفعّل الإشعارات');
      }
    case 'ntasksrefresh': {
      const ok = await syncPinnedTasks(state.tasks, state.today, state.settings, { force: true });
      return ok ? toast('اتحدّثت قائمة المهام في الستارة ✓') : toastErr('اسمح بالإشعارات الأول أو افتح من الرابط المنشور');
    }
    case 'ntoggle': {
      const nk = b.dataset.k;
      const next = !(state.settings.notify?.[nk] !== false);
      patchSettings({ notify: { ...state.settings.notify, [nk]: next } });
      if (nk === 'haptic' && next) haptic('tap');
      if (nk === 'badge') updateAppBadge(state.tasks, state.today, state.settings);
      return undefined;
    }
    case 'npushon':
      try {
        await enablePush();
        await refreshPushUi();
        return toast('اتفعّلت إشعارات الخلفية على الجهاز ده ✓');
      } catch (err) {
        return toastErr(err.message || 'فشل تفعيل الإشعارات');
      }
    case 'npushoff':
      try {
        await disablePush();
        await refreshPushUi();
        return toast('اتوقفت إشعارات الخلفية على الجهاز ده');
      } catch (err) {
        return toastErr(err.message || 'فشل إيقاف الإشعارات');
      }
    case 'nlocaltest':
      try {
        await sendLocalTest();
        return toast('اتبعَت إشعار تجريبي — بص في الستارة فوق');
      } catch (err) {
        return toastErr(err.message || 'ماقدرناش نبعت إشعار تجريبي');
      }
    case 'nremotetest':
      try {
        const r = await sendRemoteTest();
        return toast(r?.sent ? 'اتبعَت إشعار من السيرفر ✓' : 'مفيش اشتراك متسجّل على السيرفر، فعّله تاني');
      } catch (err) {
        return toastErr(err.message || 'فشل اختبار السيرفر');
      }
    case 'hremclr': {
      const list = state.settings.habits.map((h) => {
        if (h.k !== b.dataset.k) return h;
        const copy = { ...h };
        delete copy.rem;
        return copy;
      });
      patchSettings({ habits: list });
      return toast('اتلغى ميعاد التذكير');
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
  if (e.target.dataset?.hrem || e.target.dataset?.ncfg) {
    setTimeout(() => {
      const sh = sheetEl();
      if (sh?.querySelector('[data-out="sroot"]')) updateSettings(sh, state, ui, sx(), allDaysSync());
    }, 0);
  }
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
  if (ui.flt) {
    if (role === 'flttitle') { ui.flt.t = el.value; return undefined; }
    if (role === 'fltunit') { ui.flt.unit = el.value; return undefined; }
    if (role === 'fltrem') { ui.flt.rem = el.value; return undefined; }
    if (role === 'flttarget') { ui.flt.target = el.value; return undefined; }
    if (role === 'fltfrom') { ui.flt.from = el.value; return undefined; }
    if (role === 'fltwhy') { ui.flt.why = el.value; return undefined; }
    if (role === 'fltnewg') { ui.flt.newGoalTitle = el.value; return undefined; }
    if (role === 'fltout') { ui.flt.outcome = el.value; return undefined; }
    if (role === 'fltsteps') { ui.flt.stepsText = el.value; return undefined; }
  }
  if (ui.laf) {
    if (role === 'laname') { ui.laf.name = el.value; return undefined; }
    if (role === 'lanote') { ui.laf.note = el.value; return undefined; }
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
  const el = e.target;
  const role = el.dataset?.role;
  if (el.dataset?.ncfg) {
    const ck = el.dataset.ncfg;
    patchSettings({ notify: { ...state.settings.notify, [ck]: el.value || '' } });
    return;
  }
  if (el.dataset?.hrem) {
    const hk = el.dataset.hrem;
    const val = el.value || '';
    const list = state.settings.habits.map((h) => {
      if (h.k !== hk) return h;
      const copy = { ...h };
      if (val) copy.rem = val;
      else delete copy.rem;
      return copy;
    });
    patchSettings({ habits: list });
    return;
  }
  if (role === 'importfile') doImport(el);
  if (role === 'tdate') ui.tdate = el.value;
  if (ui.flt && role === 'fltrem') ui.flt.rem = el.value;
  if (ui.flt && role === 'fltfrom') ui.flt.from = el.value;
  if (ui.hbf && role === 'hfrem') ui.hbf.rem = el.value;
  if (ui.gf && role === 'gffrom') ui.gf.from = el.value;
  if (ui.gf && role === 'gfto') ui.gf.to = el.value;
  if (ui.pf && role === 'pffrom') ui.pf.from = el.value;
  if (ui.pf && role === 'pfto') ui.pf.to = el.value;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isSheetOpen()) requestClose();
  const el = e.target;
  if (e.key !== 'Enter' || e.isComposing || !el.matches?.('input.fld') || el.form || !el.closest('.sheet')) return;
  e.preventDefault();
  const all = [...sheetEl().querySelectorAll('input.fld:not([type="time"]):not([type="date"]), textarea.fld')].filter((x) => x.getClientRects().length);
  const next = all[all.indexOf(el) + 1];
  if (next) next.focus();
  else if (ui.flt) saveFilterSheet();
  else if (ui.laf) saveLifeAreaForm();
  else if (ui.pf) savePeriodForm();
  else if (ui.te) saveTaskEdit();
  else { el.blur(); requestClose(); }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) flush();
  else {
    refreshToday();
    scheduleNotifSync();
  }
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
  navigator.serviceWorker.addEventListener('message', async (e) => {
    const msg = e.data || {};
    if (msg.type === 'waraqa-nav' && msg.url) {
      handleOpenTarget(msg.url);
    } else if (msg.type === 'waraqa-updated') {
      await loadLists();
      await loadDay(state.cur);
      await refreshDaysCache();
    }
  });
}

// ---------- التشغيل ----------
$('#dock').innerHTML = dockHtml();
(async () => {
  await askPersist();
  await loadLists();
  ui.cat = state.settings.expCats[0] || 'أكل';
  ui.qcat = ui.cat;
  ui.qarea = activeLifeAreas(state.settings)[0]?.id || 'deen';
  ui.icat = state.settings.ideaCats.at(-1) || 'تاني';
  ui.tbrush = activeTimeCats(state.settings)[1]?.id || 'work';
  await loadDay(state.today);
  await refreshDaysCache();
  if (new URLSearchParams(location.search).has('open')) {
    handleOpenTarget(location.href);
    const clean = new URL(location.href);
    clean.searchParams.delete('open');
    history.replaceState(null, '', clean);
  }
  hooks.saved = () => schedule();
  await initSync();
  await refreshDaysCache();
})();
