// views/today.js — الهيدر وتبويبة «اليوم» (تصميم موحّد هادي بمساحات تنفّس واضحة: Obsidian & Champagne).
//
// الترتيب:
//   الهيدر (رقم الأسبوع + التاريخ الكبير + حلقات السبت←الجمعة)
//   ← كارت «نبض اليوم» الموحّد (فاضل دلوقتي + النوم والشغل فوق + العادات والشاشة والفلوس تحت)
//   ← «توزيع وقتك» (شريط الـ ٢٤ ساعة بسلم زمني + تجميع المجالات من غير مربعات مزدحمة)
//   ← «أركان حياتك» (٤ كروت موحّدة بشرطات تقدّم مقسّمة + الصلوات)
//   ← «المزاج وآخر اليوم» ← «تقرير الذكاء الاصطناعي» ← «مهام النهارده» ← «مقاييسي»

import {
  HABITS, HABIT_GROUPS, habitGroupStats, dateTitle, fmtNum, fmtHM, habitsDone, todayTasks, groupTasks, has,
  periodOf, periodDay, isOverdue, shortDate, starSplit, dayStatus, dayProgress, satWeekKeys, weekNumber,
  dayNums, compareTo, fmtDiff, timeByCat, fmtHours, hoursWord,
} from '../logic.js';
import { esc, ic, ico, P, setHtml } from '../ui.js';
import { timeStackBar } from './time.js';
import { focusGoalsToday } from './goals.js';
import { metricsSection } from './metrics.js';
import { aiSection } from './ai.js';

export const HINTS = {
  sleep: 'وقت ما نمت ووقت ما صحيت، والمدة بتتحسب لوحدها',
  screen: 'من إعدادات الموبايل: Screen Time أو Digital Wellbeing',
  mood: 'دوسة واحدة',
  habits: 'دوس على اللي عملته، وعلّم الصلوات اللي في وقتها',
  work: 'المشروع والساعات، والناتج لو حابب',
  money: 'المبلغ والوصف في سطر واحد، زي "٧٥ غدا"',
  post: 'اكتب اللي اتأجل وليه، في ١٠ ثواني',
  top: 'جملة واحدة كفاية',
};

const HABIT_NAME = new Map(HABITS);

// ---------- الهيدر ----------
const WD = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
const DAY_WORD = { full: 'اتسجل كله', part: 'ناقص', none: 'مش متسجل', future: 'يوم جاي' };

function dayShort(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric' });
}

function weekRange(keys) {
  const a = new Date(`${keys[0]}T12:00:00`);
  const b = new Date(`${keys[6]}T12:00:00`);
  if (a.getMonth() === b.getMonth()) return `${fmtNum(a.getDate())} – ${shortDate(keys[6])}`;
  return `${shortDate(keys[0])} – ${shortDate(keys[6])}`;
}

/** حلقة إنجاز دقيقة حوالين رقم كل يوم في شريط الأسبوع. */
function dayRing(pct, future) {
  const r = 14.5;
  const c = 2 * Math.PI * r;
  const off = c - (c * Math.max(0, Math.min(100, pct))) / 100;
  const cls = pct === 100 ? ' full' : pct > 0 ? ' part' : '';
  return `<svg class="dring${future ? ' fut' : ''}${cls}" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
    <circle class="dring-bg" cx="17" cy="17" r="${r}"/>
    ${pct > 0 ? `<circle class="dring-fg" cx="17" cy="17" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>` : ''}
  </svg>`;
}

export function renderHeader(s, ctx = {}) {
  const pd = periodDay(periodOf(s.periods, s.cur), s.cur);
  const wKeys = satWeekKeys(s.cur);
  const wNum = weekNumber(s.cur);

  const days = wKeys.map((k) => {
    const future = k > s.today;
    const isCur = k === s.cur;
    const st = future ? 'future' : (isCur ? dayStatus(s.day) : ctx.status?.[k] || 'none');
    const pct = future ? 0 : (isCur ? dayProgress(s.day) : ctx.pct?.[k] || 0);
    const d = new Date(`${k}T12:00:00`);
    const isToday = k === s.today;
    const cls = `wd${isCur ? ' sel' : ''}${isToday && !isCur ? ' is-today' : ''}${st === 'full' ? ' done-pill' : ''}${future ? ' fut' : ''}`;
    return `<button class="${cls}" type="button" data-act="day" data-key="${k}"${isCur ? ' aria-current="date"' : ''}
      aria-label="${dayShort(k)}${isToday ? '، النهارده' : ''}: ${DAY_WORD[st]}">
      <span class="l">${WD[d.getDay()]}</span>
      <span class="wd-ring">${dayRing(pct, future)}<span class="n">${fmtNum(d.getDate())}</span></span>
    </button>`;
  }).join('');

  const away = s.cur === s.today ? '' : `<div class="away"><span><b>${s.cur < s.today ? 'بتعدّل يوم فات:' : 'يوم جاي:'}</b> ${dayShort(s.cur)}</span>
      <button class="awayb" type="button" data-act="today">ارجع للنهارده${ic(P.chev)}</button></div>`;

  return `<div class="top-meta">
      <button class="wk-pill" type="button" data-act="month" aria-label="الأسبوع ${fmtNum(wNum)}، اختار يوم من الشهر">
        <b>الأسبوع ${fmtNum(wNum)}</b><span>· ${weekRange(wKeys)}</span>
      </button>
      <span class="saved" data-out="saved"></span>
    </div>
    <div class="top-hero">
      <div class="top-dt">
        <h1 class="date"><button class="dateb" type="button" data-act="month" aria-label="${dateTitle(s.cur)}، اختار يوم تاني">${dateTitle(s.cur)}</button></h1>
        ${pd ? `<span class="pday">يوم ${fmtNum(pd.n)} من ${fmtNum(pd.of)} في الفترة</span>` : ''}
      </div>
      <div class="wk-navs" role="group" aria-label="التنقل بين الأسابيع">
        <button class="wk-nav" type="button" data-act="wprev" aria-label="الأسبوع اللي فات">${ic(P.prev)}</button>
        <button class="wk-nav" type="button" data-act="wnext" aria-label="الأسبوع اللي بعده">${ic(P.next)}</button>
      </div>
    </div>
    <div class="wk" role="group" aria-label="أسبوع من السبت للجمعة">${days}</div>${away}`;
}

const SAVE = {
  loading: ['بيحمّل…', '', 'wait'], saving: ['بيحفظ…', '', 'wait'],
  memory: ['مش بيتحفظ على الجهاز', 'alert', 'warn'], saved: ['على الجهاز', 'check', 'ok'],
};
const SYNC = {
  ok: ['اتزامن', 'check', 'ok'], busy: ['بيزامن…', '', 'wait'], offline: ['مستني النت', 'cloudOff', 'wait'],
  error: ['المزامنة واقفة', 'alert', 'warn'], capped: ['المزامنة واقفة', 'alert', 'warn'],
};
export function updateStatus(root, s) {
  const el = root.querySelector('[data-out="saved"]');
  if (!el) return;
  const [text, icon, kind] = s.status !== 'saved' ? SAVE[s.status] : SYNC[s.sync] || SAVE.saved;
  setHtml(el, `${icon ? ic(P[icon]) : ''}${text}`);
  el.classList.toggle('busy', kind === 'wait');
  el.classList.toggle('warn', kind === 'warn');
}

// ---------- قطع بتتستخدم في الشاشات اللي بتطلع من تحت كمان ----------
export function habitsGrid(day, withMore) {
  return `<div class="habits">${HABITS.map(([k, l]) => `<button class="hp" type="button" data-tri="${k}" data-label="${l}"><i></i>${l}</button>`).join('')}
    ${withMore ? '<button class="hp more" type="button" data-act="sheet" data-sheet="habits">الأرقام والتفاصيل</button>' : ''}</div>`;
}
export function salahRow() {
  return `<div class="pray"><span>الصلوات في وقتها</span><div class="pseg" data-rate="salah" data-kind="count" role="group" aria-label="الصلوات في وقتها">
    ${[1, 2, 3, 4, 5].map((i) => `<button class="ps" type="button" data-v="${i}" aria-label="${i} من ٥">${fmtNum(i)}</button>`).join('')}</div></div>`;
}

// ---------- كارت «نبض اليوم» الموحّد (بدل ٦ صناديق منفصلة) ----------
const ARROW = { up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6' };
const showVal = (kind, v) => (kind === 'min' ? fmtHM(Math.round(v)) : fmtNum(kind === 'money' ? Math.round(v) : v));

function diffText(v, base, kind, eps, isLater) {
  if (v != null) {
    const cmp = compareTo(v, base, eps);
    if (cmp?.dir === 'same') return '<span class="pm-sub">= زي متوسطك</span>';
    if (cmp) return `<span class="pm-sub"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ARROW[cmp.dir]}"/></svg>${fmtDiff(kind, cmp.diff)}</span>`;
    return '';
  }
  if (isLater) return '<span class="pm-sub">بالليل</span>';
  if (base != null) return `<span class="pm-sub">متوسطك ${showVal(kind, base)}</span>`;
  return '<span class="pm-sub">ناقص</span>';
}

function summary(s, split, ctx, tb) {
  const { now, later } = split;
  const base = ctx.base || {};
  const isToday = s.cur === s.today;
  const future = s.cur > s.today;

  let headHtml;
  if (!now.length && !later.length) {
    headHtml = '<div class="pulse-ok"><i class="dot done" aria-hidden="true"></i><span>اليوم مكتمل كله</span></div>';
  } else if (!now.length) {
    headHtml = `<div class="pulse-h"><b>${future ? 'ده يوم جاي' : 'مفيش حاجة ناقصة دلوقتي'}</b></div>`;
  } else {
    headHtml = `<div class="pulse-h"><b>فاضل${isToday ? ' دلوقتي' : ''} <em>${fmtNum(now.length)}</em></b>
        <button class="sum-go" type="button" data-act="guide">كمّل بالترتيب${ic(P.chev)}</button></div>
      <div class="sum-miss">${now.map((x) => `<button class="mchip" type="button" data-act="guide" data-q="${x.k}" aria-label="${x.t}: ناقص"><i class="dot miss" aria-hidden="true"></i>${x.t}</button>`).join('')}</div>`;
  }
  const lat = later.length && !future
    ? `<p class="sum-later"><i class="dot later" aria-hidden="true"></i><span>بالليل: ${later.map((x) => x.t).join('، ')}</span></p>` : '';

  const nums = dayNums(s.day);
  const laterK = new Set(later.map((x) => x.k));

  const sleepMin = nums.sleep ?? (tb.by.sleep ? tb.by.sleep * 60 : null);
  const workH = nums.work ?? (tb.by.work ?? null);
  const hDone = habitsDone(s.day);
  const hPart = HABITS.filter(([k]) => s.day[k] === 1).length;
  const hPct = Math.round(((hDone + hPart * 0.5) / HABITS.length) * 100);
  const salah = +s.day.salah || 0;

  const sleepPct = sleepMin != null ? Math.min(100, Math.round((sleepMin / 480) * 100)) : 0;
  const workPct = workH != null ? Math.min(100, Math.round((workH / 7) * 100)) : 0;

  const heroRow = `<div class="pm-hero">
      <button class="pm-cell hero${sleepMin == null ? ' none' : ''}" type="button" data-act="sheet" data-sheet="sleep" aria-label="النوم: ${sleepMin != null ? fmtHM(Math.round(sleepMin)) : 'ناقص'}">
        <span class="pm-k"><span>النوم</span><span class="pm-ic">${ico('moon')}</span></span>
        <span class="pm-v">${sleepMin != null ? fmtHM(Math.round(sleepMin)) : '—'}</span>
        ${nums.sleep == null && tb.by.sleep ? '<span class="pm-sub">من سجل الوقت</span>' : diffText(nums.sleep, base.sleep, 'min', 5, laterK.has('sleep'))}
        <span class="pm-line"><i style="width:${sleepPct}%"></i></span>
      </button>
      <button class="pm-cell hero${workH == null ? ' none' : ''}" type="button" data-act="sheet" data-sheet="work" aria-label="الشغل: ${workH != null ? `${fmtNum(workH)} ساعة` : 'ناقص'}">
        <span class="pm-k"><span>الشغل</span><span class="pm-ic">${ico('brief')}</span></span>
        <span class="pm-v">${workH != null ? `${fmtNum(workH)} <small>س</small>` : '—'}</span>
        ${nums.work == null && tb.by.work ? '<span class="pm-sub">من سجل الوقت</span>' : diffText(nums.work, base.work, 'h', 0.25, laterK.has('work'))}
        <span class="pm-line"><i style="width:${workPct}%"></i></span>
      </button>
    </div>`;

  const subRow = `<div class="pm-sub3">
      <button class="pm-cell${hDone || hPart ? ' done' : ' none'}" type="button" data-act="scroll" data-to="pillars" aria-label="العادات: ${fmtNum(hDone)} من ١٣">
        <span class="pm-k"><span>العادات</span><span class="pm-ic">${ico('check')}</span></span>
        <span class="pm-v sm">${fmtNum(hDone)}<small>/${fmtNum(HABITS.length)}</small></span>
        <span class="pm-sub">صلوات ${fmtNum(salah)}/٥</span>
        <span class="pm-line done"><i style="width:${hPct}%"></i></span>
      </button>
      <button class="pm-cell${nums.screen == null ? ' none' : ''}" type="button" data-act="sheet" data-sheet="screen" aria-label="الشاشة: ${nums.screen != null ? fmtHM(Math.round(nums.screen)) : 'ناقص'}">
        <span class="pm-k"><span>الشاشة</span><span class="pm-ic">${ico('phone')}</span></span>
        <span class="pm-v sm">${nums.screen != null ? fmtHM(Math.round(nums.screen)) : '—'}</span>
        ${diffText(nums.screen, base.screen, 'min', 5, laterK.has('screen'))}
      </button>
      <button class="pm-cell${nums.spend != null ? ' money' : ' none'}" type="button" data-act="tab" data-tab="money" aria-label="الفلوس: ${nums.spend != null ? `${fmtNum(Math.round(nums.spend))} جنيه` : 'ناقص'}">
        <span class="pm-k"><span>الفلوس</span><span class="pm-ic">${ico('wallet')}</span></span>
        <span class="pm-v sm">${nums.spend != null ? `${fmtNum(Math.round(nums.spend))} <small>ج</small>` : '—'}</span>
        ${diffText(nums.spend, base.spend, 'money', 5, laterK.has('money'))}
      </button>
    </div>`;

  const anyBase = ['sleep', 'screen', 'work', 'spend'].some((m) => base[m] != null);
  const cap = anyBase ? 'الأسهم مقارنة بمتوسط آخر ٧ أيام' : 'المقارنة بمتوسطك بتظهر بعد ٣ أيام تسجيل';

  return `<section class="pulse${!now.length && !later.length ? ' ok' : ''}" aria-label="ملخص اليوم">
      <div class="pulse-top">${headHtml}${lat}</div>
      ${heroRow}
      ${subRow}
      <p class="pulse-cap">${cap}</p>
    </section>`;
}

// ---------- توزيع الوقت حسب المجالات (متجمّع من تاب «الوقت») ----------
function timeSummary(tb) {
  const head = `<div class="sec"><b>توزيع وقتك</b><span class="mut">${tb.total ? `${fmtNum(tb.total)} من ٢٤ ساعة` : 'لسه مفيش ساعات'}</span></div>`;
  if (!tb.total) {
    return `${head}<section class="panel tsum-empty" aria-label="توزيع الوقت">
      <p>سجّل ساعات يومك في تاب «الوقت»، وهتتجمّع هنا تلقائياً لكل مجال (نوم، شغل، تعلم، مواصلات…).</p>
      <button class="lnk" type="button" data-act="tab" data-tab="time">سجّل ساعات اليوم${ic(P.chev)}</button>
    </section>`;
  }
  const grid = tb.rows.map((r) => {
    const val = r.hours === 1 ? 'ساعة' : r.hours === 2 ? 'ساعتين' : `${fmtNum(r.hours)} <small>${hoursWord(r.hours)}</small>`;
    const pct = Math.round((r.hours / tb.total) * 100);
    return `<button class="ts-item tc-${r.id}" type="button" data-act="timecat" data-c="${r.id}" aria-label="${r.name}: ${fmtHours(r.hours)}">
      <span class="ts-ic">${ico(r.icon)}</span>
      <span class="ts-m"><span class="ts-top"><span class="ts-n">${r.name}</span><span class="ts-p">${fmtNum(pct)}٪</span></span><span class="ts-v">${val}</span></span>
    </button>`;
  }).join('');
  const left = 24 - tb.total;
  return `${head}<section class="panel tsum" aria-label="توزيع الوقت">
      <div class="tscale-wrap">
        ${timeStackBar(tb)}
        <div class="tscale" aria-hidden="true"><span>٤ ص</span><span>١٢ م</span><span>٨ م</span><span>٤ ص</span></div>
      </div>
      <div class="ts-grid">${grid}</div>
      <div class="ts-foot">
        <span>${left > 0 ? `فاضل ${fmtHours(left)} غير مسجّلة` : 'الـ ٢٤ ساعة متسجلين'}</span>
        <button class="ts-go" type="button" data-act="tab" data-tab="time">سجّل الساعات${ic(P.chev)}</button>
      </div>
    </section>`;
}

// ---------- أركان حياتك (لغة ألوان موحّدة: محايد/شامبين → زمردي عند التمام) ----------
function pillarsSection(s, miss, linkedHabits) {
  const n = habitsDone(s.day);
  const head = miss.has('habits') ? '<span class="ask">ناقص</span>' : `<span>${fmtNum(n)} من ١٣ تم</span>`;

  const cards = HABIT_GROUPS.map((g) => {
    const st = habitGroupStats(s.day, g);
    const allDone = st.done === st.total;
    let sub = `فاضل ${fmtNum(st.total - st.done)}`;
    if (allDone) sub = 'الركن ده كمل النهارده';
    else if (st.part) sub = `فاضل ${fmtNum(st.total - st.done)} · ${fmtNum(st.part)} جزئي`;

    const segs = `<div class="pil-segs" style="grid-template-columns:repeat(${st.total},1fr)" aria-hidden="true">
      ${g.keys.map((k) => {
        const v = +s.day[k] || 0;
        return `<i class="${v === 2 ? 'v2' : v === 1 ? 'v1' : ''}"></i>`;
      }).join('')}</div>`;

    return `<section class="panel pillar${allDone ? ' done' : ''}" aria-label="${g.name}">
        <div class="pil-h">
          <span class="pil-med">${ico(g.icon)}</span>
          <div class="pil-m"><b>${g.name}</b><span class="${allDone ? 'ok' : ''}">${sub}</span></div>
          <span class="pil-cnt">${fmtNum(st.done)}/${fmtNum(st.total)}</span>
        </div>
        ${segs}
        <div class="habits2">${g.keys.map((k) => {
          const l = HABIT_NAME.get(k) || k;
          const dot = linkedHabits?.has(k) ? '<span class="hp-gdot" aria-hidden="true"></span>' : '';
          return `<button class="hp" type="button" data-tri="${k}" data-label="${l}"><i></i><span>${l}</span>${dot}</button>`;
        }).join('')}</div>
        ${g.withSalah ? salahRow() : ''}
      </section>`;
  }).join('');

  return `<div class="sec" id="pillars"><b>أركان حياتك</b>${head}</div>
    <div class="pillars">${cards}</div>
    <button class="gh full" type="button" data-act="sheet" data-sheet="habits">أرقام وتفاصيل العادات (الورد، التمرين، القهوة…)</button>`;
}

// ---------- المزاج وآخر اليوم ----------
function row({ sheet, t, sub, subCls = '', st }) {
  const word = { done: 'اتسجل', miss: 'ناقص', later: 'بالليل' }[st];
  return `<button class="lr c" type="button" data-act="sheet" data-sheet="${sheet}" aria-label="${t} ${word}">
    <i class="dot ${st}" aria-hidden="true"></i><span class="m"><span class="t">${t}</span><span class="s ${subCls}">${sub}</span></span>
    <span class="chev">${ic(P.chev)}</span></button>`;
}
function endOfDay(s, miss) {
  const d = s.day;
  const sub = (k, empty) => (has(d[k]) ? [esc(d[k]), 'txt', 'done'] : miss.has(k) ? [empty, 'ask', 'miss'] : ['بالليل', '', 'later']);
  const [ps, pc, pst] = sub('post', 'ناقص، دوس واكتب');
  const [ts, tc, tst] = sub('top', 'ناقص، جملة قبل ما تنام');
  const mood = `<div class="moodr"><span class="ml">مزاجك النهارده${miss.has('mood') ? '<small>ناقص</small>' : ''}</span>
    <div class="pseg amb" data-rate="mood" role="group" aria-label="المزاج من ٥">${[1, 2, 3, 4, 5].map((i) => `<button class="ps" type="button" data-v="${i}" aria-label="${i} من ٥">${fmtNum(i)}</button>`).join('')}</div></div>`;
  return `<div class="sec"><b>المزاج وآخر اليوم</b></div>
    <section class="ledger">
      ${mood}
      ${row({ sheet: 'post', t: 'أجّلت إيه؟', sub: ps, subCls: pc, st: pst })}
      ${row({ sheet: 'top', t: 'أهم حاجة حصلت', sub: ts, subCls: tc, st: tst })}
    </section>`;
}

// ---------- مهام النهارده ----------
function tasksToday(s) {
  const all = todayTasks(s.tasks, s.today);
  const done = all.filter((t) => t.done).length;
  const open = groupTasks(s.tasks, s.today).today.slice(0, 3);
  const gMap = new Map((s.goals || []).map((g) => [String(g.id), g]));
  const head = `<div class="sec"><b>مهام النهارده</b>${all.length ? `<span>${fmtNum(done)} من ${fmtNum(all.length)} خلصت</span>` : ''}</div>`;
  const rows = open.map((t) => {
    const g = t.goalId ? gMap.get(String(t.goalId)) : null;
    return `<div class="tk${t.pri ? ' pri' : ''}">
      <button class="tk-c" type="button" data-act="tdone" data-id="${esc(t.id)}" aria-pressed="false" aria-label="علّم إنها خلصت: ${esc(t.t)}"><i></i></button>
      <div class="tk-m"><span class="tk-t">${t.pri ? '<span class="flag" aria-label="مهم">⚑</span>' : ''}${esc(t.t)}</span>
        ${g ? `<span class="g-tag">${ico('target')}<span>${esc(g.t)}</span></span>` : ''}
        ${isOverdue(t, s.today) ? `<span class="tk-s">${ic(P.clock)}متأخرة من ${shortDate(t.due)}</span>` : ''}</div></div>`;
  }).join('');
  const body = rows || `<p class="empty-s">${all.length ? 'خلّصت مهام النهارده كلها.' : 'مفيش مهام للنهارده.'}</p>`;
  return `${head}<section class="list">${body}
    <button class="lnk" type="button" data-act="gtasks">كل المهام${ic(P.chev)}</button></section>`;
}

export function renderToday(s, ctx = {}) {
  const hour = ctx.hour ?? new Date().getHours();
  const split = starSplit(s.day, s.cur, s.today, hour);
  const miss = new Set(split.now.map((x) => x.k));
  const tb = timeByCat(s.day);
  return `${summary(s, split, ctx, tb)}
    ${focusGoalsToday(s, ctx.gsum)}
    ${timeSummary(tb)}
    ${pillarsSection(s, miss, ctx.gsum?.linkedHabits)}
    ${endOfDay(s, miss)}
    ${aiSection(s)}
    ${tasksToday(s)}
    ${metricsSection(s)}`;
}

export function renderTabs(s) {
  const open = todayTasks(s.tasks, s.today).filter((t) => !t.done).length;
  const tabs = [
    ['day', 'اليوم', 'sun', 0],
    ['time', 'الوقت', 'clock', 0],
    ['tasks', 'الخطة', 'target', open],
    ['ideas', 'أفكار', 'ideas', 0],
    ['money', 'فلوس', 'wallet', 0],
  ];
  return tabs.map(([k, l, icon, n]) => `<button class="tab" type="button" data-act="tab" data-tab="${k}"${s.tab === k ? ' aria-current="page"' : ''}>
    <span class="tab-ic">${ico(icon)}${n ? `<span class="bd">${fmtNum(n)}</span>` : ''}</span>
    <span class="tab-l">${l}</span></button>`).join('');
}
