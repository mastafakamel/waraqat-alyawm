// views/today.js — الهيدر وتبويبة «اليوم»: حكم اليوم فوق (أنا فين؟ وصح ولا لأ؟)، والتسجيل تحته.

import {
  PRAYERS, KHUSHU_LABELS, STRESS_OPTS, activeHabits, activeHabitGroups,
  habitGroupStats, prayerSummary, dateTitle, fmtNum, fmtRemTime, habitsDone, todayTasks, has,
  periodOf, periodDay, shortDate, dayStatus, dayProgress, satWeekKeys, weekNumber,
  dayNums, timeByCat, dayVerdict,
} from '../logic.js';
import { esc, ic, ico, P, setHtml } from '../ui.js';
import { timeStackBar } from './time.js';
import { reviewBannerHtml } from './goals.js';
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
// الحالة من الـ ٥ الأساسيين بس (dayStatus). والنهارده مايتقالش عليه "ناقص" لحد ما يخلص: بيبقى "لسه"
const DAY_WORD = { full: 'مسجّل', part: 'ناقص', none: 'فاضي', future: 'يوم جاي' };

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
    const open = isToday && st !== 'full';
    const cls = `wd${isCur ? ' sel' : ''}${isToday && !isCur ? ' is-today' : ''}${st === 'full' ? ' done-pill' : ''}${future ? ' fut' : ''}`;
    const barCls = st === 'full' ? ' full' : pct > 0 ? (open ? ' now' : ' part') : '';
    return `<button class="${cls}" type="button" data-act="day" data-key="${k}"${isCur ? ' aria-current="date"' : ''}
      aria-label="${dayShort(k)}${isToday ? '، النهارده' : ''}: ${open ? 'لسه' : DAY_WORD[st]}${!future && pct ? `، ${fmtNum(pct)}٪ من الأساسي` : ''}">
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

  // الهيدر الخفيف: التاريخ والأسهم في صف، وتحتهم سطر صغير (الأسبوع، والفترة، وحالة الحفظ)، وبعدهم الأيام
  return `<div class="top-hero">
      <h1 class="date"><button class="dateb" type="button" data-act="month" aria-label="${dateTitle(s.cur)}، اختار يوم تاني">${dateTitle(s.cur)}</button></h1>
      <div class="wk-navs" role="group" aria-label="التنقل بين الأسابيع">
        <button class="wk-nav" type="button" data-act="wprev" aria-label="الأسبوع اللي فات">${ic(P.prev)}</button>
        <button class="wk-nav" type="button" data-act="wnext" aria-label="الأسبوع اللي بعده">${ic(P.next)}</button>
      </div>
    </div>
    <div class="top-meta">
      <button class="wk-pill" type="button" data-act="month" aria-label="الأسبوع ${fmtNum(wNum)}، ${weekRange(wKeys)}، اختار يوم من الشهر">
        <b>الأسبوع ${fmtNum(wNum)}</b>
      </button>
      ${pBtn}
      <span class="saved" data-out="saved"></span>
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

// ---------- حكم اليوم: أنا فين؟ وصح ولا لأ؟ (الحسبة كلها في dayVerdict جوه logic.js) ----------
// كل سطر بيفتح مكان تسجيله
const V_ACT = {
  sleep: 'data-act="sheet" data-sheet="sleep"',
  work: 'data-act="timecat" data-c="work"',
  habits: 'data-act="scroll" data-to="habits-sec"',
  mood: 'data-act="scroll" data-to="eod-sec"',
  top: 'data-act="sheet" data-sheet="top"',
  first: 'data-act="timecat" data-c="work"',
  distract: 'data-act="timecat" data-c="distract"',
  tasks: 'data-act="gtasks"',
};

function vValue(r) {
  if (r.show === '—' || !r.unit) return esc(r.show);
  return `${esc(r.show)} <small>${esc(r.unit)}</small>`;
}

/** سطر واحد: الاسم والقيمة فوق، والمرجع (هدفك أو عادتك) والحكم تحت. قبل ما الأيام اللي فاتت تتحمّل، الحكم بيفضل فاضي. */
function vRow(r, ready) {
  const tag = ready ? `<span class="v-tag ${r.state}">${esc(r.tag)}</span>` : '<span class="v-tag wait">&nbsp;</span>';
  return `<button class="v-row" type="button" ${V_ACT[r.id] || ''} aria-label="${esc(r.name)}: ${esc(r.show)}${r.unit && r.show !== '—' ? ` ${esc(r.unit)}` : ''}${ready ? `، ${esc(r.tag)}` : ''}">
      <span class="v-n">${esc(r.name)}</span>
      <span class="v-v${r.text ? ' txt' : ''}">${vValue(r)}</span>
      <span class="v-ref">${esc(r.ref)}</span>
      ${tag}
    </button>`;
}

function vSection(title, sub, rows, ready, foot = '') {
  return `<div class="sec"><b>${title}</b><span class="mut">${sub}</span></div>
    <section class="v-list" aria-label="${title}">${rows.map((r) => vRow(r, ready)).join('')}${foot}</section>`;
}

function verdictHero(v, ready) {
  const cnt = (k, word) => `<span class="v-cnt ${k}"><i aria-hidden="true"></i><b>${fmtNum(v.counts[k])}</b>${word}</span>`;
  return `<section class="panel v-hero" aria-label="حكم اليوم">
      <p class="v-big"><small class="v-lbl${v.warnBig ? ' warn' : ''}">${ready ? v.bigLabel : '&nbsp;'}</small>${ready ? esc(v.big) : '&nbsp;'}</p>
      <div class="v-counts">
        ${cnt('ok', 'في السليم')}
        ${cnt('warn', 'محتاجين انتباه')}
        ${cnt('wait', 'لسه')}
        ${v.counts.none ? cnt('none', 'مش متسجلين') : ''}
      </div>
    </section>`;
}

/** خطتك: سطر مهام النهارده، وأولوية النهارده من امبارح، وهدف الفترة. */
function planSection(v, s, ctx, ready) {
  const isToday = s.cur === s.today;
  const nextp = isToday && ctx.prevNextp
    ? `<div class="v-row v-np">
        <span class="v-n">أولوية النهارده</span>
        <button class="v-add" type="button" data-act="nextptask" data-v="${esc(ctx.prevNextp)}">${ic(P.plus)}لمهامي</button>
        <span class="v-ref">${esc(ctx.prevNextp)}</span>
        <span class="v-tag wait">من امبارح</span>
      </div>` : '';
  const period = periodCardToday(ctx.curPeriod, ctx.periodEv, s);
  if (!v.tasks && !nextp && !period) return '';
  return `<div class="sec"><b>خطتك</b><span class="mut">من الخطة</span></div>
    <section class="v-list" aria-label="خطتك">${v.tasks ? vRow(v.tasks, ready) : ''}${nextp}</section>
    ${period}`;
}

/** زيادة: الفلوس. بتتعرض بس، ومابتدخلش في حكم اليوم. (الشاشة بقت من «تشتيت» في تاب الوقت، فهي جوه «وقتك».) */
function extraSection(s, ctx) {
  const base = ctx.base || {};
  const nums = dayNums(s.day);
  const spend = nums.spend != null
    ? { show: `${fmtNum(Math.round(nums.spend))} <small>ج</small>`, ref: base.spend != null ? `متوسطك ${fmtNum(Math.round(base.spend))}` : '' }
    : s.day.noSpend ? { show: 'صفر <small>ج</small>', ref: 'ماصرفتش' } : { show: '—', ref: 'سجّل' };
  return `<div class="sec"><b>زيادة</b><span class="mut">مابتدخلش في حكم اليوم</span></div>
    <section class="v-list" aria-label="زيادة">
      <button class="v-row x" type="button" data-act="tab" data-tab="money">
        <span class="v-n">الفلوس</span><span class="v-v">${spend.show}</span><span class="v-ref">${esc(spend.ref)}</span>
      </button>
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
          <b>${st.done ? fmtNum(st.done) : '—'} من ${fmtNum(st.total)}</b>
        </div>
        <div class="habits2">${g.items.map((h) => {
          const dot = linkedHabits?.has(h.k) ? '<span class="hp-gdot" aria-hidden="true"></span>' : '';
          const remTag = h.rem ? `<small class="hp-rem">${fmtRemTime(h.rem)}</small>` : '';
          return `<button class="hp" type="button" data-tri="${esc(h.k)}" data-label="${esc(h.n)}"><i></i><span class="hp-txt"><span>${esc(h.n)}</span>${remTag}</span>${dot}</button>`;
        }).join('')}</div>
        ${wkStrip}
      </div>`;
  }).join('');

  return `<div class="sec" id="habits-sec"><b>العادات اليومية</b><span class="${n ? '' : 'mut'}">${n ? `${fmtNum(n)} من ${fmtNum(hs.length)} تم` : `لسه، من ${fmtNum(hs.length)}`}</span></div>
    <section class="panel hunified" aria-label="العادات اليومية">
      ${blocks}
      <button class="hdet-btn" type="button" data-act="sheet" data-sheet="habits">أرقام وتفاصيل العادات (التمرين، الورد، الكافيين…)${ic(P.chev)}</button>
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

  const loggedWrap = [enHas, has(d.post), has(d.top)].filter(Boolean).length;
  const moodVal = +d.mood || 0;

  const drawer = closeOpen ? `<div class="eod-drawer">
      ${row({ sheet: 'energy', t: 'الطاقة والتوتر', sub: enSub, subCls: enBits.length ? 'txt' : '', st: enHas ? 'done' : 'later' })}
      ${row({ sheet: 'post', t: 'أجّلت إيه؟', sub: ps, subCls: pc, st: pst })}
      ${row({ sheet: 'top', t: 'أهم حاجة حصلت', sub: ts, subCls: tc, st: tst })}
      <button class="eod-guide" type="button" data-act="guide">قفلة سريعة سؤال بسؤال${ic(P.chev)}</button>
    </div>` : '';

  return `<div class="sec" id="eod-sec"><b>المزاج وآخر اليوم</b><span class="mut">${moodVal ? `${fmtNum(moodVal)} / ٥` : 'اختياري'}</span></div>
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

/**
 * تبويبة «اليوم» بتجاوب "أنا فين؟" الأول (قراية)، وبعدها "سجّل اللي فاضل" (كتابة)
 * بترتيب استخدامه في اليوم: الصلوات، والعادات، والمزاج والقفلة، والزيادة، ومقاييسي.
 */
export function renderToday(s, ctx = {}) {
  const isToday = s.cur === s.today;
  const ready = ctx.vReady !== false;
  const v = dayVerdict(s.day, {
    settings: s.settings, isToday, hour: ctx.hour, base: ctx.base, tbase: ctx.tbase, hb: ctx.hb,
    tasks: isToday ? ctx.tasksNow : null,
  });
  const tb = timeByCat(s.day, s.settings);
  const hoursFoot = `<div class="v-foot">
      ${timeStackBar(tb)}
      <span>${fmtNum(tb.total)} من ٢٤ ساعة متسجلة</span>
      <button class="v-go" type="button" data-act="tab" data-tab="time">الوقت${ic(P.chev)}</button>
    </div>`;
  return `${verdictHero(v, ready)}
    ${isToday ? reviewBannerHtml(ctx.review) : ''}
    ${vSection('الأساسي', 'الـ ٥ اللي بيخلّوا اليوم "مسجّل"', v.core, ready)}
    ${vSection('وقتك', 'من تاب الوقت', v.time, ready, hoursFoot)}
    ${planSection(v, s, ctx, ready)}
    <hr class="v-hr">
    ${prayersSection(s, ctx.prayPick)}
    ${habitsSection(s, ctx.gsum?.linkedHabits)}
    ${endOfDay(s, ctx.closeOpen)}
    ${ctx.closeOpen ? aiSection(s) : ''}
    ${extraSection(s, ctx)}
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
