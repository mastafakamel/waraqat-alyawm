// main.js — تشغيل ورقة اليوم. كل الدوسات والكتابة بتتسمع هنا من مكان واحد (event delegation).

import {
  state, subscribe, loadDay, setK, setKOn, flush, loadLists, refreshToday, addIdea, addTask, getDayData,
  patchItem, removeItem, restoreItem, allDays,
} from './store.js';
import { askPersist, getDoc } from './db.js';
import {
  addDays, cycleTri, rateTap, readNumber, toEn, parseExpense, fmtNum, missingStars, EXP_CATS, lineTarget, mergeLine,
} from './logic.js';
import { $, $$, esc, openSheet, requestClose, isSheetOpen, sheetEl, syncFields, toast, setHtml } from './ui.js';
import { renderHeader, updateStatus, renderToday, renderTabs } from './views/today.js';
import { sheetFor, guideStep, updateOutputs } from './views/sheets.js';
import { dockHtml, updateDock } from './views/dock.js';
import { tasksShell, updateTasks } from './views/tasks.js';
import { ideasShell, updateIdeas } from './views/ideas.js';
import { moneyShell, updateMoney } from './views/money.js';

// حالة الواجهة بس (مش بتتحفظ). drafts = اللي اتكتب في خانات الإضافة ولسه ماتحفظش، عشان مايضيعش لو غيّرت التبويبة.
const ui = {
  cat: EXP_CATS[0], guide: null, qmode: 'idea', qmenu: false, qcat: EXP_CATS[0],
  tpri: false, twhen: 'today', icat: 'تاني', drafts: {},
};
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
  setHtml($('#top'), renderHeader(state));
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
    setHtml(view, renderToday(state));
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
    if (!r) return toast('اكتب المبلغ رقم');
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
function startGuide(startKey) {
  const miss = missingStars(state.day).map((x) => x.k);
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
      if (!missingStars(state.day).length) toast('اليوم اتسجل ✓');
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
  out.innerHTML = r ? `هيتسجل: <b>${fmtNum(r.a)} جنيه</b>${r.w ? `، ${esc(r.w)}` : ''}، ${ui.cat}` : 'اكتب المبلغ رقم';
}
/** سؤال الفلوس في "سؤال بسؤال": سطر واحد زي "٧٥ غدا". */
function addExpense(form) {
  const inp = form.querySelector('[data-role="expin"]');
  const r = parseExpense(inp.value);
  if (!r) {
    toast('اكتب المبلغ رقم');
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
    toast('اكتب المبلغ رقم');
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

// ---------- التنقل ----------
async function go(n) {
  await loadDay(addDays(state.cur, n)); // loadDay بيحفظ اللي مستني الأول
  render();
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
    case 'prev': return go(-1);
    case 'next': return go(1);
    case 'guide': return startGuide(b.dataset.q); // من عداد ★: بيبدأ من أول بند ناقص
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
    default: return undefined;
  }
});

const FORMS = {
  addexp: addExpense, quick: handleQuick, addtask: addTaskFromForm, addidea: addIdeaFromForm, addmoney: addMoney, addline: addLine,
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
// على localhost مش بنسجّله، عشان وإحنا بنعدّل الكود التعديل يبان على طول من غير ما يتخزّن.
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
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
})();
