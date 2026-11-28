// views/today.js — الهيدر وتبويبة «اليوم» بتصميم هندسي حاد ومنظّم (بدون دوائر وبدون حشو).

import {
  PRAYERS, KHUSHU_LABELS, SLEEP_QUAL, STRESS_OPTS, TODAY_TASK_LIMIT, activeHabits, activeHabitGroups,
  habitGroupStats, prayerSummary, dateTitle, fmtNum, fmtHM, fmtHour, fmtRemTime, habitsDone, todayTasks, groupTasks, has,
  periodOf, periodDay, isOverdue, shortDate, dayStatus, dayProgress, satWeekKeys, weekNumber,
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
  habits: 'دوس على اللي عملته، وقيّم خشوعك في كل صلاة من ١ لـ ٥',
  work: 'المشروع والساعات، أو علّم إجازة لو مفيش شغل',
  money: 'المبلغ والوصف في سطر واحد، زي "٧٥ غدا"',
  post: 'اكتب اللي اتأجل وليه، في ١٠ ثواني',
  top: 'جملة واحدة كفاية، وممكن تكتب أولوية بكرة تحتها',
};

// ---------- الهيدر ----------
const WD = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
const DAY_WORD = { full: 'اتسجل كله', part: 'جزئي', none: 'فاضي', future: 'يوم جاي' };

function dayShort(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric' });
}

function weekRange(keys) {
  const a = new Date(`${keys[0]}T12:00:00`);
  const b = new Date(`${keys[6]}T12:00:00`);
  if (a.getMonth() === b.getMonth()) return `${fmtNum(a.getDate())} – ${shortDate(keys[6])}`;
  return `${shortDate(keys[0])} – ${shortDate(keys[6])}`;
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
    const barCls = st === 'full' ? ' full' : pct > 0 ? ' part' : '';
    return `<button class="${cls}" type="button" data-act="day" data-key="${k}"${isCur ? ' aria-current="date"' : ''}
      aria-label="${dayShort(k)}${isToday ? '، النهارده' : ''}: ${DAY_WORD[st]}">
      <span class="l">${WD[d.getDay()]}</span>
      <span class="n">${fmtNum(d.getDate())}</span>
      <span class="wd-bar${barCls}" aria-hidden="true"><i style="width:${future ? 0 : pct}%"></i></span>
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
  return `<div class="habits2">${hs.map((h) => `<button class="hp" type="button" data-tri="${esc(h.k)}" data-label="${esc(h.n)}"><i></i><span>${esc(h.n)}</span></button>`).join('')}
    ${withMore ? '<button class="hp more" type="button" data-act="sheet" data-sheet="habits">الأرقام والتفاصيل</button>' : ''}</div>`;
}

/** صف الصلوات الخمس بتقييم الخشوع والاستعداد (١–٥ لكل صلاة) + شريط التقييم التفاعلي تحتها. */
export function salahRow(day = {}, activePick = null) {
  const ps = prayerSummary(day);
  const picked = PRAYERS.find(([k]) => k === activePick);

  const tiles = PRAYERS.map(([k, l]) => {
    const sc = ps.scores[k];
    const on = ps.prayed[k];
    const isPick = activePick === k;
    const lvCls = sc ? ` lv-${sc}` : on ? ' lv-3' : '';
    const valTxt = sc ? `${fmtNum(sc)}/٥` : on ? '✓' : '—';
    const pct = sc ? (sc / 5) * 100 : on ? 60 : 0;
    return `<button class="ps5${lvCls}${isPick ? ' picking' : ''}" type="button" data-act="praypick" data-p="${k}" aria-expanded="${isPick}" aria-label="${l}: ${sc ? `${sc} من ٥` : on ? 'اتصلّت' : 'مش متسجلة'}">
      <span class="ps5-n">${l}</span>
      <span class="ps5-v">${valTxt}</span>
      <span class="ps5-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
    </button>`;
  }).join('');

  let picker = '';
  if (picked) {
    const [pk, pl] = picked;
    const curSc = ps.scores[pk];
    const curOn = ps.prayed[pk];
    picker = `<div class="pray-pick" role="group" aria-label="تقييم خشوع واستعداد ${pl}">
        <div class="pray-ph">
          <span>خشوع واستعداد <b>${pl}</b>${curSc ? ` · <em>${KHUSHU_LABELS[curSc]}</em>` : ''}</span>
          ${curOn || curSc ? `<button class="pray-clr" type="button" data-act="prayrate" data-p="${pk}" data-v="0">مسح</button>` : ''}
        </div>
        <div class="pray-nums">
          ${[1, 2, 3, 4, 5].map((n) => `<button class="pnum${curSc === n ? ` on lv-${n}` : ''}" type="button" data-act="prayrate" data-p="${pk}" data-v="${n}" aria-pressed="${curSc === n}">${fmtNum(n)}</button>`).join('')}
        </div>
        <div class="pray-ends"><span>١ · سريع / مشتت</span><span>٥ · خشوع واستعداد كامل</span></div>
      </div>`;
  }

  return `<div class="pray-card">
      <div class="pseg5" role="group" aria-label="الصلوات الخمس">${tiles}</div>
      ${picker}
    </div>`;
}

// ---------- كارت «ملخص اليوم» (٢ كبار فوق: النوم والعادات + ٣ تحت: الفلوس، الشغل، وقت ضايع) ----------
const ARROW = { up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6' };
const showVal = (kind, v) => (kind === 'min' ? fmtHM(Math.round(v)) : fmtNum(kind === 'money' ? Math.round(v) : v));

function diffText(v, base, kind, eps, emptyLabel = 'اضغط للتسجيل') {
  if (v != null) {
    const cmp = compareTo(v, base, eps);
    if (cmp?.dir === 'same') return '<span class="pm-sub">= زي متوسطك</span>';
    if (cmp) return `<span class="pm-sub"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ARROW[cmp.dir]}"/></svg>${fmtDiff(kind, cmp.diff)}</span>`;
    return '';
  }
  if (base != null) return `<span class="pm-sub">متوسطك ${showVal(kind, base)}</span>`;
  return `<span class="pm-sub">${emptyLabel}</span>`;
}

function summary(s, ctx, tb) {
  const base = ctx.base || {};
  const cfg = s.settings;
  const isToday = s.cur === s.today;
  const nums = dayNums(s.day);

  // ١. النوم
  const sleepMin = nums.sleep ?? (tb.by.sleep ? tb.by.sleep * 60 : null);
  const sleepGoalMin = (cfg.sleepTarget || 7.5) * 60;
  const sleepPct = sleepMin != null ? Math.min(100, Math.round((sleepMin / sleepGoalMin) * 100)) : 0;
  const sleepMet = sleepMin != null && sleepMin >= sleepGoalMin;
  const sqLbl = SLEEP_QUAL.find(([k]) => k === s.day.sleepq)?.[1] || '';
  const sleepSub = nums.sleep == null && tb.by.sleep
    ? '<span class="pm-sub">من تاب الوقت</span>'
    : sqLbl ? `<span class="pm-sub">${sqLbl}${+s.day.nap > 0 ? ` · قيلولة ${fmtNum(+s.day.nap)}د` : ''}</span>`
    : diffText(nums.sleep, base.sleep, 'min', 5, 'اضغط للتسجيل');

  // ٢. العادات (مع الصلوات ومتوسط الخشوع)
  const hs = activeHabits(cfg);
  const hDone = habitsDone(s.day, cfg);
  const hPart = hs.filter((h) => s.day[h.k] === 1).length;
  const hPct = hs.length ? Math.round(((hDone + hPart * 0.5) / hs.length) * 100) : 0;
  const psum = prayerSummary(s.day);
  const habitsSub = `صلوات ${fmtNum(psum.count)}/٥${psum.avg != null ? ` · خشوع ${fmtNum(psum.avg)}` : ''}`;

  // ٣. الفلوس
  const spendVal = nums.spend != null
    ? `${fmtNum(Math.round(nums.spend))} <small>ج</small>`
    : s.day.noSpend ? '٠ <small>ج</small>' : '—';
  const spendSub = s.day.noSpend && nums.spend == null
    ? '<span class="pm-sub">ماصرفتش</span>'
    : diffText(nums.spend, base.spend, 'money', 5, 'اضغط للتسجيل');

  // ٤. الشغل (محسوب تلقائياً من تسجيل تاب «الوقت»، مع fallback لليدوي لو موجود)
  const workFromTime = tb.by.work > 0 ? tb.by.work : null;
  const workH = workFromTime ?? nums.work;
  const workGoal = cfg.workTarget || 7;
  const workPct = workH != null ? Math.min(100, Math.round((workH / workGoal) * 100)) : 0;
  const workMet = workH != null && workH >= workGoal;
  const workVal = workH != null ? `${fmtNum(workH)} <small>س</small>` : s.day.workOff ? 'إجازة' : '—';
  const workSub = workFromTime != null
    ? '<span class="pm-sub">من تاب الوقت</span>'
    : s.day.workOff && workH == null
      ? '<span class="pm-sub">يوم إجازة</span>'
      : workH != null
        ? diffText(workH, base.work, 'h', 0.25)
        : '<span class="pm-sub">سجّل من الوقت</span>';

  // ٥. وقت ضايع (محسوب تلقائياً من مجال «تشتيت» في تاب «الوقت»)
  const wasteH = tb.by.distract || 0;
  const wasteCap = cfg.screenLimit || 3;
  const wastePct = wasteH > 0 ? Math.min(100, Math.round((wasteH / wasteCap) * 100)) : 0;
  const wasteVal = wasteH > 0
    ? `${fmtNum(wasteH)} <small>س</small>`
    : tb.total > 0 ? '٠ <small>س</small>' : '—';
  const wasteSub = wasteH > 0
    ? '<span class="pm-sub">من تاب الوقت</span>'
    : tb.total > 0
      ? '<span class="pm-sub">صفر تشتيت ✓</span>'
      : '<span class="pm-sub">سجّل من الوقت</span>';

  const heroRow = `<div class="pm-hero">
      <button class="pm-cell hero${sleepMin == null ? ' none' : ''}" type="button" data-act="sheet" data-sheet="sleep" aria-label="النوم: ${sleepMin != null ? fmtHM(Math.round(sleepMin)) : 'فاضي'}">
        <span class="pm-k"><span>النوم</span><span class="pm-ic">${ico('moon')}</span></span>
        <span class="pm-v">${sleepMin != null ? fmtHM(Math.round(sleepMin)) : '—'}</span>
        ${sleepSub}
        <span class="pm-line${sleepMet ? ' done' : ''}"><i style="width:${sleepPct}%"></i></span>
      </button>
      <button class="pm-cell hero${hDone || hPart ? ' done' : ' none'}" type="button" data-act="scroll" data-to="habits-sec" aria-label="العادات: ${fmtNum(hDone)} من ${fmtNum(hs.length)}">
        <span class="pm-k"><span>العادات</span><span class="pm-ic">${ico('check')}</span></span>
        <span class="pm-v">${fmtNum(hDone)}<small>/${fmtNum(hs.length)}</small></span>
        <span class="pm-sub">${habitsSub}</span>
        <span class="pm-line done"><i style="width:${hPct}%"></i></span>
      </button>
    </div>`;

  const subRow = `<div class="pm-sub3">
      <button class="pm-cell${nums.spend != null ? ' money' : s.day.noSpend ? ' done' : ' none'}" type="button" data-act="tab" data-tab="money" aria-label="الفلوس">
        <span class="pm-k"><span>الفلوس</span><span class="pm-ic">${ico('wallet')}</span></span>
        <span class="pm-v sm">${spendVal}</span>
        ${spendSub}
        <span class="pm-line"><i style="width:0%"></i></span>
      </button>
      <button class="pm-cell${workH == null && !s.day.workOff ? ' none' : workMet ? ' done' : ''}" type="button" data-act="timecat" data-c="work" aria-label="الشغل من الوقت">
        <span class="pm-k"><span>الشغل</span><span class="pm-ic">${ico('brief')}</span></span>
        <span class="pm-v sm">${workVal}</span>
        ${workSub}
        <span class="pm-line${workMet || s.day.workOff ? ' done' : ''}"><i style="width:${s.day.workOff ? 100 : workPct}%"></i></span>
      </button>
      <button class="pm-cell${wasteH > 0 ? ' waste' : tb.total > 0 ? ' done' : ' none'}" type="button" data-act="timecat" data-c="distract" aria-label="الوقت الضايع من الوقت">
        <span class="pm-k"><span>وقت ضايع</span><span class="pm-ic">${ico('distract')}</span></span>
        <span class="pm-v sm">${wasteVal}</span>
        ${wasteSub}
        <span class="pm-line${wasteH > 0 ? ' waste' : ''}"><i style="width:${wastePct}%"></i></span>
      </button>
    </div>`;

  const prevNextp = isToday && ctx.prevNextp
    ? `<div class="nextp-bar">
        <span class="nextp-m"><small>أولوية النهارده (من امبارح):</small><b>${esc(ctx.prevNextp)}</b></span>
        <button class="nextp-b" type="button" data-act="nextptask" data-v="${esc(ctx.prevNextp)}">+ لمهامي</button>
      </div>` : '';

  return `<section class="pulse" aria-label="ملخص اليوم">
      ${heroRow}
      ${subRow}
      ${prevNextp}
    </section>`;
}

// ---------- قسم الصلوات المستقل (تقييم الخشوع والاستعداد ١–٥) ----------
function prayersSection(s, activePick) {
  const ps = prayerSummary(s.day);
  const stat = ps.count
    ? `${fmtNum(ps.count)}/٥${ps.avg != null ? ` · خشوع ${fmtNum(ps.avg)}` : ''}`
    : 'اضغط على أي صلاة لتقييم خشوعك';
  return `<div class="sec" id="prayers-sec"><b>الصلوات والخشوع</b><span class="${ps.count ? '' : 'mut'}">${stat}</span></div>
    <section class="panel pblock" aria-label="الصلوات والخشوع">
      ${salahRow(s.day, activePick)}
    </section>`;
}

// ---------- العادات اليومية (كارت واحد منظّم بشبكة متساوية 2×N بدل ٣ كروت ضخمة) ----------
function habitsSection(s, linkedHabits) {
  const cfg = s.settings;
  const hs = activeHabits(cfg);
  const groups = activeHabitGroups(cfg).filter((g) => g.items.length);
  const n = habitsDone(s.day, cfg);

  const blocks = groups.map((g, gi) => {
    const st = habitGroupStats(s.day, g);
    const hasWorkout = g.items.some((h) => h.workout);
    let wkStrip = '';
    if (hasWorkout) {
      const wBits = [
        has(s.day.ext) ? s.day.ext : '',
        has(s.day.exm) ? `${fmtNum(s.day.exm)} د` : '',
        has(s.day.exn) ? s.day.exn : '',
      ].filter(Boolean);
      if (wBits.length) {
        wkStrip = `<button class="wk-strip" type="button" data-act="sheet" data-sheet="habits">
            <span>التمرين: <b>${esc(wBits.join(' · '))}</b></span>${ic(P.chev)}
          </button>`;
      }
    }
    return `<div class="hgrp${gi > 0 ? ' sep' : ''}">
        <div class="hgrp-h">
          <span>${esc(g.name)}</span>
          <b>${fmtNum(st.done)}/${fmtNum(st.total)}</b>
        </div>
        <div class="habits2">${g.items.map((h) => {
          const dot = linkedHabits?.has(h.k) ? '<span class="hp-gdot" aria-hidden="true"></span>' : '';
          const remTag = h.rem ? `<small class="hp-rem">${fmtRemTime(h.rem)}</small>` : '';
          return `<button class="hp" type="button" data-tri="${esc(h.k)}" data-label="${esc(h.n)}"><i></i><span class="hp-txt"><span>${esc(h.n)}</span>${remTag}</span>${dot}</button>`;
        }).join('')}</div>
        ${wkStrip}
      </div>`;
  }).join('');

  return `<div class="sec" id="habits-sec"><b>العادات اليومية</b><span>${fmtNum(n)} من ${fmtNum(hs.length)} تم</span></div>
    <section class="panel hunified" aria-label="العادات اليومية">
      ${blocks}
      <button class="hdet-btn" type="button" data-act="sheet" data-sheet="habits">أرقام وتفاصيل العادات (التمرين، الورد، الكافيين…)${ic(P.chev)}</button>
    </section>`;
}

// ---------- شريط توزيع الوقت (يظهر بس لو سجّلت ساعات اليوم عشان مايشغلش مساحة فاضية) ----------
function timeSummary(tb, cfg) {
  if (!tb.total) return '';
  const ds = cfg.dayStart || 4;
  const grid = tb.rows.map((r) => {
    const val = r.hours === 1 ? 'ساعة' : r.hours === 2 ? 'ساعتين' : `${fmtNum(r.hours)} <small>${hoursWord(r.hours)}</small>`;
    const pct = Math.round((r.hours / tb.total) * 100);
    return `<button class="ts-item tc-${r.color || r.id}" type="button" data-act="timecat" data-c="${esc(r.id)}" aria-label="${esc(r.name)}: ${fmtHours(r.hours)}">
      <span class="ts-ic">${ico(r.icon)}</span>
      <span class="ts-m"><span class="ts-top"><span class="ts-n">${esc(r.name)}</span><span class="ts-p">${fmtNum(pct)}٪</span></span><span class="ts-v">${val}</span></span>
    </button>`;
  }).join('');
  return `<div class="sec"><b>توزيع وقتك</b><span class="mut">${fmtNum(tb.total)} من ٢٤ ساعة</span></div>
    <section class="panel tsum" aria-label="توزيع الوقت">
      <div class="tscale-wrap">
        ${timeStackBar(tb)}
        <div class="tscale" aria-hidden="true"><span>${fmtHour(ds)}</span><span>١٢ م</span><span>٨ م</span><span>${fmtHour(ds)}</span></div>
      </div>
      <div class="ts-grid">${grid}</div>
      <div class="ts-foot">
        <span>${24 - tb.total > 0 ? `فاضل ${fmtHours(24 - tb.total)}` : 'الـ ٢٤ ساعة متسجلين'}</span>
        <button class="ts-go" type="button" data-act="tab" data-tab="time">تاب الوقت${ic(P.chev)}</button>
      </div>
    </section>`;
}

// ---------- المزاج وقفلة اليوم (مضغوطة واختيارية بدون ضغط) ----------
function row({ sheet, t, sub, subCls = '', st }) {
  return `<button class="lr c" type="button" data-act="sheet" data-sheet="${sheet}" aria-label="${t}">
    <i class="dot ${st}" aria-hidden="true"></i><span class="m"><span class="t">${t}</span><span class="s ${subCls}">${sub}</span></span>
    <span class="chev">${ic(P.chev)}</span></button>`;
}

function endOfDay(s, closeOpen) {
  const d = s.day;
  const sub = (k, empty) => (has(d[k]) ? [esc(d[k]), 'txt', 'done'] : [empty, '', 'later']);
  const [ps, pc, pst] = sub('post', 'اختياري — دوس واكتب');
  const [ts, tc, tst] = sub('top', 'جملة واحدة قبل النوم');

  const enBits = [];
  if (has(d.moodTag)) enBits.push(d.moodTag);
  const stLbl = STRESS_OPTS.find(([k]) => k === d.stress)?.[1];
  if (stLbl && d.stress !== 'none') enBits.push(`توتر ${stLbl}`);
  if (has(d.tired)) enBits.push('إرهاق');
  if (has(d.up)) enBits.push(`رفع: ${d.up}`);
  const enHas = enBits.length > 0 || ['p1e', 'p2e', 'p3e', 'p4e'].some((k) => has(d[k]));
  const enSub = enBits.length ? esc(enBits.join(' · ')) : enHas ? 'الطاقة متسجلة' : 'حالة اليوم، التوتر، الإرهاق';

  const loggedWrap = [enHas, has(d.post), has(d.top), has(d.screen)].filter(Boolean).length;
  const moodVal = +d.mood || 0;

  const drawer = closeOpen ? `<div class="eod-drawer">
      ${row({ sheet: 'energy', t: 'الطاقة والتوتر', sub: enSub, subCls: enBits.length ? 'txt' : '', st: enHas ? 'done' : 'later' })}
      ${row({ sheet: 'post', t: 'أجّلت إيه؟', sub: ps, subCls: pc, st: pst })}
      ${row({ sheet: 'top', t: 'أهم حاجة حصلت', sub: ts, subCls: tc, st: tst })}
      ${row({ sheet: 'screen', t: 'وقت الشاشة (Screen Time)', sub: has(d.screen) ? esc(d.screen) : 'اختياري', subCls: has(d.screen) ? 'txt' : '', st: has(d.screen) ? 'done' : 'later' })}
      <button class="eod-guide" type="button" data-act="guide">قفلة سريعة سؤال بسؤال${ic(P.chev)}</button>
    </div>` : '';

  return `<div class="sec"><b>المزاج وآخر اليوم</b><span class="mut">${moodVal ? `${fmtNum(moodVal)} / ٥` : 'اختياري'}</span></div>
    <section class="panel eod-card">
      <div class="eod-mood">
        <span class="eod-ml">مزاج اليوم</span>
        <div class="pseg amb eod-pseg" data-rate="mood" role="group" aria-label="المزاج من ٥">
          ${[1, 2, 3, 4, 5].map((i) => `<button class="ps" type="button" data-v="${i}" aria-label="${i} من ٥">${fmtNum(i)}</button>`).join('')}
        </div>
      </div>
      <div class="eod-acts">
        <button class="eod-btn${closeOpen ? ' on' : ''}" type="button" data-act="eodtoggle" aria-expanded="${!!closeOpen}">
          قفلة اليوم${loggedWrap ? ` (${fmtNum(loggedWrap)})` : ''}
        </button>
        <button class="eod-btn ai" type="button" data-act="ai" data-kind="day">تقرير اليوم (AI)</button>
      </div>
      ${drawer}
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
  const tb = timeByCat(s.day, s.settings);
  return `${summary(s, ctx, tb)}
    ${periodCardToday(ctx.curPeriod, ctx.periodEv, s)}
    ${s.cur === s.today ? reviewBannerHtml(ctx.review) : ''}
    ${activeProjectToday(s, ctx.sys)}
    ${tasksToday(s, ctx.sys)}
    ${prayersSection(s, ctx.prayPick)}
    ${habitsSection(s, ctx.gsum?.linkedHabits)}
    ${timeSummary(tb, s.settings)}
    ${endOfDay(s, ctx.closeOpen)}
    ${ctx.closeOpen ? aiSection(s) : ''}
    ${metricsSection(s)}`;
}

export function renderTabs(s) {
  const open = todayTasks(s.tasks, s.today, s.settings?.dayStart).filter((t) => !t.done).length;
  const tabs = [
    ['time', 'الوقت', 'clock', 0],
    ['day', 'اليوم', 'sun', 0],
    ['tasks', 'الخطة', 'target', open],
    ['ideas', 'أفكار', 'ideas', 0],
    ['money', 'فلوس', 'wallet', 0],
  ];
  return tabs.map(([k, l, icon, n]) => `<button class="tab" type="button" data-act="tab" data-tab="${k}"${s.tab === k ? ' aria-current="page"' : ''}>
    <span class="tab-ic">${ico(icon)}${n ? `<span class="bd">${fmtNum(n)}</span>` : ''}</span>
    <span class="tab-l">${l}</span></button>`).join('');
}
