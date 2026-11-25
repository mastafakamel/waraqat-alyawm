// views/today.js — الهيدر وتبويبة «اليوم» (Obsidian & Champagne / Alabaster & Bronze).

import {
  PRAYERS, SLEEP_QUAL, STRESS_OPTS, TODAY_TASK_LIMIT, activeHabits, activeHabitGroups, habitGroupStats, prayersState,
  dateTitle, fmtNum, fmtHM, fmtHour, habitsDone, todayTasks, groupTasks, has,
  periodOf, periodDay, isOverdue, shortDate, starSplit, dayStatus, dayProgress, satWeekKeys, weekNumber,
  dayNums, compareTo, fmtDiff, timeByCat, fmtHours, hoursWord,
} from '../logic.js';
import { esc, ic, ico, P, setHtml } from '../ui.js';
import { timeStackBar } from './time.js';
import { activeProjectToday, reviewBannerHtml } from './goals.js';
import { periodCardToday } from './settings.js';
import { metricsSection } from './metrics.js';
import { aiSection } from './ai.js';

export const HINTS = {
  sleep: 'وقت ما نمت ووقت ما صحيت، والمدة بتتحسب لوحدها',
  screen: 'من إعدادات الموبايل: Screen Time أو Digital Wellbeing',
  mood: 'دوسة واحدة',
  habits: 'دوس على اللي عملته، وعلّم الصلوات اللي في وقتها',
  work: 'المشروع والساعات، أو علّم إجازة لو مفيش شغل',
  money: 'المبلغ والوصف في سطر واحد، زي "٧٥ غدا"',
  post: 'اكتب اللي اتأجل وليه، في ١٠ ثواني',
  top: 'جملة واحدة كفاية، وممكن تكتب أولوية بكرة تحتها',
};

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
  const curP = periodOf(s.periods, s.cur);
  const pd = periodDay(curP, s.cur);
  const wKeys = satWeekKeys(s.cur);
  const wNum = weekNumber(s.cur);

  const days = wKeys.map((k) => {
    const future = k > s.today;
    const isCur = k === s.cur;
    const st = future ? 'future' : (isCur ? dayStatus(s.day, s.settings) : ctx.status?.[k] || 'none');
    const pct = future ? 0 : (isCur ? dayProgress(s.day, s.settings) : ctx.pct?.[k] || 0);
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

  const pBtn = pd
    ? `<button class="pday-btn" type="button" data-act="pdetail" data-id="${esc(curP.id)}">يوم ${fmtNum(pd.n)} من ${fmtNum(pd.of)}${curP.name ? ` · ${esc(curP.name)}` : ' في الفترة'}</button>`
    : '';

  return `<div class="top-meta">
      <button class="wk-pill" type="button" data-act="month" aria-label="الأسبوع ${fmtNum(wNum)}، اختار يوم من الشهر">
        <b>الأسبوع ${fmtNum(wNum)}</b><span>· ${weekRange(wKeys)}</span>
      </button>
      <span class="saved" data-out="saved"></span>
    </div>
    <div class="top-hero">
      <div class="top-dt">
        <h1 class="date"><button class="dateb" type="button" data-act="month" aria-label="${dateTitle(s.cur)}، اختار يوم تاني">${dateTitle(s.cur)}</button></h1>
        ${pBtn}
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

// ---------- قطع مشتركة ----------
export function habitsGrid(day, withMore, settings) {
  const hs = activeHabits(settings);
  return `<div class="habits">${hs.map((h) => `<button class="hp" type="button" data-tri="${esc(h.k)}" data-label="${esc(h.n)}"><i></i>${esc(h.n)}</button>`).join('')}
    ${withMore ? '<button class="hp more" type="button" data-act="sheet" data-sheet="habits">الأرقام والتفاصيل</button>' : ''}</div>`;
}

/** صف الصلوات الخمس بأساميهم (فجر · ضهر · عصر · مغرب · عشاء) مع تحديث salah و fajr تلقائياً. */
export function salahRow(day = {}) {
  const ps = prayersState(day);
  const cnt = PRAYERS.filter(([k]) => ps[k]).length;
  return `<div class="pray pray-named">
      <div class="pray-h"><span>الصلوات في وقتها</span><b>${fmtNum(cnt)}/٥</b></div>
      <div class="pseg5" role="group" aria-label="الصلوات الخمس">
        ${PRAYERS.map(([k, l]) => `<button class="ps5${ps[k] ? ' on' : ''}" type="button" data-act="prayer" data-p="${k}" aria-pressed="${!!ps[k]}">${l}</button>`).join('')}
      </div>
    </div>`;
}

// ---------- كارت «نبض اليوم» الموحّد ----------
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
  const cfg = s.settings;
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
  const sleepGoalMin = (cfg.sleepTarget || 7.5) * 60;
  const sleepPct = sleepMin != null ? Math.min(100, Math.round((sleepMin / sleepGoalMin) * 100)) : 0;
  const sleepMet = sleepMin != null && sleepMin >= sleepGoalMin;
  const sqLbl = SLEEP_QUAL.find(([k]) => k === s.day.sleepq)?.[1] || '';

  const workH = nums.work ?? (tb.by.work ?? null);
  const workGoal = cfg.workTarget || 7;
  const workPct = workH != null ? Math.min(100, Math.round((workH / workGoal) * 100)) : 0;
  const workMet = workH != null && workH >= workGoal;

  const hs = activeHabits(cfg);
  const hDone = habitsDone(s.day, cfg);
  const hPart = hs.filter((h) => s.day[h.k] === 1).length;
  const hPct = hs.length ? Math.round(((hDone + hPart * 0.5) / hs.length) * 100) : 0;
  const salah = PRAYERS.filter(([k]) => prayersState(s.day)[k]).length;

  const screenGoalMin = (cfg.screenLimit || 3) * 60;
  const screenPct = nums.screen != null ? Math.min(100, Math.round((nums.screen / screenGoalMin) * 100)) : 0;
  const screenOk = nums.screen != null && nums.screen <= screenGoalMin;

  const sleepSub = nums.sleep == null && tb.by.sleep
    ? '<span class="pm-sub">من سجل الوقت</span>'
    : sqLbl ? `<span class="pm-sub">${sqLbl}${+s.day.nap > 0 ? ` · قيلولة ${fmtNum(+s.day.nap)}د` : ''}</span>`
    : diffText(nums.sleep, base.sleep, 'min', 5, laterK.has('sleep'));

  const workSub = s.day.workOff && workH == null
    ? '<span class="pm-sub">يوم إجازة</span>'
    : nums.work == null && tb.by.work
      ? '<span class="pm-sub">من سجل الوقت</span>'
      : diffText(nums.work, base.work, 'h', 0.25, laterK.has('work'));

  const heroRow = `<div class="pm-hero">
      <button class="pm-cell hero${sleepMin == null ? ' none' : ''}" type="button" data-act="sheet" data-sheet="sleep" aria-label="النوم: ${sleepMin != null ? fmtHM(Math.round(sleepMin)) : 'ناقص'}">
        <span class="pm-k"><span>النوم</span><span class="pm-ic">${ico('moon')}</span></span>
        <span class="pm-v">${sleepMin != null ? fmtHM(Math.round(sleepMin)) : '—'}</span>
        ${sleepSub}
        <span class="pm-line${sleepMet ? ' done' : ''}"><i style="width:${sleepPct}%"></i></span>
      </button>
      <button class="pm-cell hero${workH == null && !s.day.workOff ? ' none' : ''}" type="button" data-act="sheet" data-sheet="work" aria-label="الشغل: ${workH != null ? `${fmtNum(workH)} ساعة` : s.day.workOff ? 'إجازة' : 'ناقص'}">
        <span class="pm-k"><span>الشغل</span><span class="pm-ic">${ico('brief')}</span></span>
        <span class="pm-v">${workH != null ? `${fmtNum(workH)} <small>س</small>` : s.day.workOff ? 'إجازة' : '—'}</span>
        ${workSub}
        <span class="pm-line${workMet || s.day.workOff ? ' done' : ''}"><i style="width:${s.day.workOff ? 100 : workPct}%"></i></span>
      </button>
    </div>`;

  const subRow = `<div class="pm-sub3">
      <button class="pm-cell${hDone || hPart ? ' done' : ' none'}" type="button" data-act="scroll" data-to="pillars" aria-label="العادات: ${fmtNum(hDone)} من ${fmtNum(hs.length)}">
        <span class="pm-k"><span>العادات</span><span class="pm-ic">${ico('check')}</span></span>
        <span class="pm-v sm">${fmtNum(hDone)}<small>/${fmtNum(hs.length)}</small></span>
        <span class="pm-sub">صلوات ${fmtNum(salah)}/٥</span>
        <span class="pm-line done"><i style="width:${hPct}%"></i></span>
      </button>
      <button class="pm-cell${nums.screen == null ? ' none' : ''}" type="button" data-act="sheet" data-sheet="screen" aria-label="الشاشة: ${nums.screen != null ? fmtHM(Math.round(nums.screen)) : 'ناقص'}">
        <span class="pm-k"><span>الشاشة</span><span class="pm-ic">${ico('phone')}</span></span>
        <span class="pm-v sm">${nums.screen != null ? fmtHM(Math.round(nums.screen)) : '—'}</span>
        ${diffText(nums.screen, base.screen, 'min', 5, laterK.has('screen'))}
        ${nums.screen != null ? `<span class="pm-line${screenOk ? ' done' : ''}"><i style="width:${screenPct}%"></i></span>` : ''}
      </button>
      <button class="pm-cell${nums.spend != null ? ' money' : s.day.noSpend ? ' done' : ' none'}" type="button" data-act="tab" data-tab="money" aria-label="الفلوس: ${nums.spend != null ? `${fmtNum(Math.round(nums.spend))} جنيه` : s.day.noSpend ? 'ماصرفتش' : 'ناقص'}">
        <span class="pm-k"><span>الفلوس</span><span class="pm-ic">${ico('wallet')}</span></span>
        <span class="pm-v sm">${nums.spend != null ? `${fmtNum(Math.round(nums.spend))} <small>ج</small>` : s.day.noSpend ? '٠ <small>ج</small>' : '—'}</span>
        ${s.day.noSpend && nums.spend == null ? '<span class="pm-sub">ماصرفتش</span>' : diffText(nums.spend, base.spend, 'money', 5, laterK.has('money'))}
      </button>
    </div>`;

  const prevNextp = isToday && ctx.prevNextp
    ? `<div class="nextp-bar">
        <span class="nextp-m"><small>أولوية النهارده (من امبارح):</small><b>${esc(ctx.prevNextp)}</b></span>
        <button class="nextp-b" type="button" data-act="nextptask" data-v="${esc(ctx.prevNextp)}">+ لمهامي</button>
      </div>` : '';

  const anyBase = ['sleep', 'screen', 'work', 'spend'].some((m) => base[m] != null);
  const cap = anyBase ? 'الأسهم مقارنة بمتوسط آخر ٧ أيام' : 'المقارنة بمتوسطك بتظهر بعد ٣ أيام تسجيل';

  return `<section class="pulse${!now.length && !later.length ? ' ok' : ''}" aria-label="ملخص اليوم">
      <div class="pulse-top">${headHtml}${lat}</div>
      ${prevNextp}
      ${heroRow}
      ${subRow}
      <p class="pulse-cap">${cap}</p>
    </section>`;
}

// ---------- توزيع الوقت حسب المجالات ----------
function timeSummary(tb, cfg) {
  const ds = cfg.dayStart || 4;
  const head = `<div class="sec"><b>توزيع وقتك</b><span class="mut">${tb.total ? `${fmtNum(tb.total)} من ٢٤ ساعة` : 'لسه مفيش ساعات'}</span></div>`;
  if (!tb.total) {
    return `${head}<section class="panel tsum-empty" aria-label="توزيع الوقت">
      <p>سجّل ساعات يومك في تاب «الوقت»، وهتتجمّع هنا تلقائياً لكل مجال (نوم، شغل، تعلم، تشتيت…).</p>
      <button class="lnk" type="button" data-act="tab" data-tab="time">سجّل ساعات اليوم${ic(P.chev)}</button>
    </section>`;
  }
  const grid = tb.rows.map((r) => {
    const val = r.hours === 1 ? 'ساعة' : r.hours === 2 ? 'ساعتين' : `${fmtNum(r.hours)} <small>${hoursWord(r.hours)}</small>`;
    const pct = Math.round((r.hours / tb.total) * 100);
    return `<button class="ts-item tc-${r.color || r.id}" type="button" data-act="timecat" data-c="${esc(r.id)}" aria-label="${esc(r.name)}: ${fmtHours(r.hours)}">
      <span class="ts-ic">${ico(r.icon)}</span>
      <span class="ts-m"><span class="ts-top"><span class="ts-n">${esc(r.name)}</span><span class="ts-p">${fmtNum(pct)}٪</span></span><span class="ts-v">${val}</span></span>
    </button>`;
  }).join('');
  const left = 24 - tb.total;
  return `${head}<section class="panel tsum" aria-label="توزيع الوقت">
      <div class="tscale-wrap">
        ${timeStackBar(tb)}
        <div class="tscale" aria-hidden="true"><span>${fmtHour(ds)}</span><span>١٢ م</span><span>٨ م</span><span>${fmtHour(ds)}</span></div>
      </div>
      <div class="ts-grid">${grid}</div>
      <div class="ts-foot">
        <span>${left > 0 ? `فاضل ${fmtHours(left)} غير مسجّلة` : 'الـ ٢٤ ساعة متسجلين'}</span>
        <button class="ts-go" type="button" data-act="tab" data-tab="time">سجّل الساعات${ic(P.chev)}</button>
      </div>
    </section>`;
}

// ---------- أركان حياتك ----------
function pillarsSection(s, miss, linkedHabits) {
  const cfg = s.settings;
  const hs = activeHabits(cfg);
  const groups = activeHabitGroups(cfg);
  const n = habitsDone(s.day, cfg);
  const head = miss.has('habits') ? '<span class="ask">ناقص</span>' : `<span>${fmtNum(n)} من ${fmtNum(hs.length)} تم</span>`;

  const cards = groups.map((g) => {
    const st = habitGroupStats(s.day, g);
    const allDone = st.total > 0 && st.done === st.total;
    let sub = st.total ? `فاضل ${fmtNum(st.total - st.done)}` : 'الصلوات';
    if (allDone) sub = 'الركن ده كمل النهارده';
    else if (st.part) sub = `فاضل ${fmtNum(st.total - st.done)} · ${fmtNum(st.part)} جزئي`;

    const segs = st.total ? `<div class="pil-segs" style="grid-template-columns:repeat(${st.total},1fr)" aria-hidden="true">
      ${g.keys.map((k) => {
        const v = +s.day[k] || 0;
        return `<i class="${v === 2 ? 'v2' : v === 1 ? 'v1' : ''}"></i>`;
      }).join('')}</div>` : '';

    // ملخص سريع لخانات التمرين (النوع + الوقت + الأرقام) جوّه ركن الصحة
    const hasWorkout = g.items.some((h) => h.workout);
    let wkStrip = '';
    if (hasWorkout) {
      const wBits = [
        has(s.day.ext) ? s.day.ext : '',
        has(s.day.exm) ? `${fmtNum(s.day.exm)} د` : '',
        has(s.day.exn) ? s.day.exn : '',
      ].filter(Boolean);
      wkStrip = `<button class="wk-strip" type="button" data-act="sheet" data-sheet="habits">
          <span>${wBits.length ? `تفاصيل التمرين: <b>${esc(wBits.join(' · '))}</b>` : 'سجّل تفاصيل التمرين (النوع، الوقت، الأرقام)'}</span>
          ${ic(P.chev)}
        </button>`;
    }

    return `<section class="panel pillar${allDone ? ' done' : ''}" aria-label="${esc(g.name)}">
        <div class="pil-h">
          <span class="pil-med">${ico(g.icon)}</span>
          <div class="pil-m"><b>${esc(g.name)}</b><span class="${allDone ? 'ok' : ''}">${sub}</span></div>
          ${st.total ? `<span class="pil-cnt">${fmtNum(st.done)}/${fmtNum(st.total)}</span>` : ''}
        </div>
        ${segs}
        ${g.items.length ? `<div class="habits2">${g.items.map((h) => {
          const dot = linkedHabits?.has(h.k) ? '<span class="hp-gdot" aria-hidden="true"></span>' : '';
          return `<button class="hp" type="button" data-tri="${esc(h.k)}" data-label="${esc(h.n)}"><i></i><span>${esc(h.n)}</span>${dot}</button>`;
        }).join('')}</div>` : ''}
        ${wkStrip}
        ${g.withSalah ? salahRow(s.day) : ''}
      </section>`;
  }).join('');

  return `<div class="sec" id="pillars"><b>عاداتك الصغيرة</b>${head}</div>
    <div class="pillars">${cards}</div>
    <button class="gh full" type="button" data-act="sheet" data-sheet="habits">أرقام وتفاصيل العادات (التمرين، الورد، الكافيين…)</button>`;
}

// ---------- المزاج والطاقة وآخر اليوم ----------
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

  const enBits = [];
  if (has(d.moodTag)) enBits.push(d.moodTag);
  const stLbl = STRESS_OPTS.find(([k]) => k === d.stress)?.[1];
  if (stLbl && d.stress !== 'none') enBits.push(`توتر ${stLbl}`);
  if (has(d.tired)) enBits.push('إرهاق');
  if (has(d.up)) enBits.push(`رفع: ${d.up}`);
  const enHas = enBits.length > 0 || ['p1e', 'p2e', 'p3e', 'p4e'].some((k) => has(d[k]));
  const enSub = enBits.length ? esc(enBits.join(' · ')) : enHas ? 'الطاقة متسجلة' : 'حالة اليوم، التوتر، الإرهاق، اللي رفع طاقتك';

  const mood = `<div class="moodr"><span class="ml">مزاجك النهارده${miss.has('mood') ? '<small>ناقص</small>' : ''}</span>
    <div class="pseg amb" data-rate="mood" role="group" aria-label="المزاج من ٥">${[1, 2, 3, 4, 5].map((i) => `<button class="ps" type="button" data-v="${i}" aria-label="${i} من ٥">${fmtNum(i)}</button>`).join('')}</div></div>`;
  return `<div class="sec"><b>المزاج وآخر اليوم</b></div>
    <section class="ledger">
      ${mood}
      ${row({ sheet: 'energy', t: 'الطاقة والتوتر', sub: enSub, subCls: enBits.length ? 'txt' : '', st: enHas ? 'done' : 'later' })}
      ${row({ sheet: 'post', t: 'أجّلت إيه؟', sub: ps, subCls: pc, st: pst })}
      ${row({ sheet: 'top', t: 'أهم حاجة حصلت', sub: ts, subCls: tc, st: tst })}
    </section>`;
}

// ---------- مهام النهارده (٣ مهام بالكتير — من الشغّال بس) ----------
function tasksToday(s, sys) {
  const open = sys?.todayOpen?.list || groupTasks(s.tasks, s.today).today;
  const done = (sys?.todayDone || []).length;
  const gMap = new Map((s.goals || []).map((g) => [String(g.id), g]));
  const over = open.length > TODAY_TASK_LIMIT;
  const capText = `${fmtNum(open.length)} من ${fmtNum(TODAY_TASK_LIMIT)}${done ? ` · خلصت ${fmtNum(done)}` : ''}`;
  const head = `<div class="sec"><b>مهام النهارده</b><span class="${over ? 'ask' : ''}">${capText}</span></div>`;
  const rows = open.slice(0, 5).map((t) => {
    const g = t.goalId ? gMap.get(String(t.goalId)) : null;
    return `<div class="tk${t.pri ? ' pri' : ''}">
      <button class="tk-c" type="button" data-act="tdone" data-id="${esc(t.id)}" aria-pressed="false" aria-label="علّم إنها خلصت: ${esc(t.t)}"><i></i></button>
      <button class="tk-m tk-editb" type="button" data-act="tedit" data-id="${esc(t.id)}">
        <span class="tk-t">${t.pri ? '<span class="flag" aria-label="مهم">⚑</span>' : ''}${esc(t.t)}</span>
        <span class="tk-tags">
          ${g ? `<span class="g-tag">${ico('target')}<span>${esc(g.t)}</span></span>` : ''}
          ${t.cat ? `<span class="tcat">${esc(t.cat)}</span>` : ''}
          ${isOverdue(t, s.today) ? `<span class="tk-s">${ic(P.clock)}متأخرة من ${shortDate(t.due)}</span>` : ''}
        </span>
      </button>
      <button class="ib" type="button" data-act="tfreeze" data-id="${esc(t.id)}" aria-label="جمّد المهمة لبعدين">${ic(P.down)}</button>
    </div>`;
  }).join('');
  const body = rows || `<p class="empty-s">${done ? 'خلّصت مهام النهارده كلها ✓' : 'مفيش مهام للنهارده — اختار لحد ٣ مهام من الشغّال.'}</p>`;
  return `${head}<section class="list">${body}
    <div class="today-tfoot">
      <button class="lnk" type="button" data-act="fltform" data-kind="task" data-st="active">${ic(P.plus)} مهمة للنهارده</button>
      <button class="lnk" type="button" data-act="gplan">الخطة كلها${ic(P.chev)}</button>
    </div></section>`;
}

export function renderToday(s, ctx = {}) {
  const hour = ctx.hour ?? new Date().getHours();
  const split = starSplit(s.day, s.cur, s.today, hour, s.settings);
  const miss = new Set(split.now.map((x) => x.k));
  const tb = timeByCat(s.day, s.settings);
  return `${summary(s, split, ctx, tb)}
    ${periodCardToday(ctx.curPeriod, ctx.periodEv, s)}
    ${s.cur === s.today ? reviewBannerHtml(ctx.review) : ''}
    ${activeProjectToday(s, ctx.sys)}
    ${tasksToday(s, ctx.sys)}
    ${pillarsSection(s, miss, ctx.gsum?.linkedHabits)}
    ${timeSummary(tb, s.settings)}
    ${endOfDay(s, miss)}
    ${aiSection(s)}
    ${metricsSection(s)}`;
}

export function renderTabs(s) {
  const open = todayTasks(s.tasks, s.today, s.settings?.dayStart).filter((t) => !t.done).length;
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
