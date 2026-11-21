// views/today.js — الهيدر وتبويبة "اليوم" والتبويبات. بيرسم من الحالة بس، ومبيغيّرش حاجة.
//
// ترتيب تبويبة اليوم (DESIGN.md نسخة ٢، المرجع designs/redesign-final.html):
//   ملخص النهارده ("فاضل دلوقتي" + "بالليل" + ٤ أرقام بمقارنة متوسطك) ← المزاج والفترات الأربعة
//   ← العادات ← الصلوات ← آخر اليوم ← تقرير الذكاء الاصطناعي ← مهام النهارده ← مقاييسي ← "قيس حاجة جديدة" و"الإعدادات"
// ctx = حاجات محسوبة برّه (main.js) من أيام تانية غير المفتوح: { status: {مفتاح: حالة}, base: {sleep, screen, work, spend}, hour }

import {
  HABITS, PERIODS, dateTitle, fmtNum, fmtHM, habitsDone, todayTasks, groupTasks, has, periodPhase, periodOf, periodDay,
  isOverdue, shortDate, starSplit, dayStatus, weekKeys, dayNums, compareTo, fmtDiff,
} from '../logic.js';
import { esc, ic, P, setHtml } from '../ui.js';
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

// ---------- الهيدر ----------
// getDay(): ٠ الأحد … ٦ السبت
const WD = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
const DAY_WORD = { full: 'اتسجل كله', part: 'ناقص', none: 'مش متسجل' };
const MARK = { full: 'done', part: 'part', none: 'nolog' };

/** "الأربعاء ١٨" */
function dayShort(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric' });
}

/**
 * السطر الأول: التاريخ (دوسة بتفتح الشهر)، و"يوم ٣ من ١١" لو جوه فترة، وحالة الحفظ.
 * وتحته شريط آخر ٧ أيام لحد النهارده (الأقدم على اليمين)، وكل يوم عليه حالته. ولو اليوم المفتوح مش النهارده: شريط "بتعدّل يوم فات".
 */
export function renderHeader(s, ctx = {}) {
  const pd = periodDay(periodOf(s.periods, s.cur), s.cur);
  const days = weekKeys(s.today).map((k) => {
    // اليوم المفتوح من الذاكرة (فيه تعديلات لسه ماتحفظتش)، والباقي من ctx
    const st = k === s.cur ? dayStatus(s.day) : ctx.status?.[k] || 'none';
    const d = new Date(`${k}T12:00:00`);
    const sel = k === s.cur;
    return `<button class="wd${sel ? ' sel' : ''}" type="button" data-act="day" data-key="${k}"${sel ? ' aria-current="date"' : ''}
      aria-label="${dayShort(k)}${k === s.today ? '، النهارده' : ''}: ${DAY_WORD[st]}"><span class="l">${WD[d.getDay()]}</span><span class="n">${fmtNum(d.getDate())}</span><i class="dot sm ${MARK[st]}" aria-hidden="true"></i></button>`;
  }).join('');
  const away = s.cur === s.today ? '' : `<div class="away"><span><b>${s.cur < s.today ? 'بتعدّل يوم فات:' : 'يوم جاي:'}</b> ${dayShort(s.cur)}</span>
      <button class="awayb" type="button" data-act="today">ارجع للنهارده${ic(P.chev)}</button></div>`;
  return `<div class="top-r1">
      <h1 class="date"><button class="dateb" type="button" data-act="month" aria-label="${dateTitle(s.cur)}، اختار يوم تاني">${dateTitle(s.cur)}</button></h1>
      ${pd ? `<span class="pday">يوم ${fmtNum(pd.n)} من ${fmtNum(pd.of)}</span>` : ''}
      <span class="saved" data-out="saved"></span>
    </div>
    <div class="wk" role="group" aria-label="آخر ٧ أيام">${days}</div>${away}`;
}
/** حالة الحفظ بتتغيّر كتير، فبتتحدّث لوحدها من غير ما الهيدر يترسم من جديد. */
// [الكلام، الأيقونة، النوع]. النوع: ok نعناعي (خلص)، wait رمادي (لسه أو مستني)، warn كهرماني (محتاج انتباهك).
// "مستني النت" رمادي مش نعناعي: البيانات على الجهاز، بس لسه ماوصلتش. و"مش بيتحفظ" كهرماني (كان نعناعي بالغلط).
const SAVE = {
  loading: ['بيحمّل…', '', 'wait'], saving: ['بيحفظ…', '', 'wait'],
  memory: ['مش بيتحفظ على الجهاز', 'alert', 'warn'], saved: ['على الجهاز', 'check', 'ok'],
};
// بعد الحفظ على الجهاز، الكلام بيقول المزامنة وصلت لفين
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
  return `<div class="pray"><span>الصلوات في وقتها</span><div class="pseg" data-rate="salah" role="group" aria-label="الصلوات في وقتها">
    ${[1, 2, 3, 4, 5].map((i) => `<button class="ps" type="button" data-v="${i}" aria-label="${i} من ٥">${fmtNum(i)}</button>`).join('')}</div></div>`;
}

// ---------- ملخص النهارده ----------
// بيجاوب سؤالين من غير scroll: فاضل إيه دلوقتي؟ وماشي إزاي (مقارنة بمتوسطك)؟
// الفرق اللي أقل من eps = "زي متوسطك": ٥ دقايق، وربع ساعة شغل، و٥ جنيه.
const CELLS = [
  { k: 'sleep', m: 'sleep', l: 'نوم', a: 'النوم', kind: 'min', eps: 5, act: 'data-act="sheet" data-sheet="sleep"' },
  { k: 'screen', m: 'screen', l: 'شاشة', a: 'الشاشة', kind: 'min', eps: 5, act: 'data-act="sheet" data-sheet="sleep"' },
  { k: 'work', m: 'work', l: 'ساعة شغل', a: 'الشغل', kind: 'h', eps: 0.25, act: 'data-act="sheet" data-sheet="work"' },
  { k: 'money', m: 'spend', l: 'جنيه', a: 'المصروف', kind: 'money', eps: 5, act: 'data-act="tab" data-tab="money"' },
];
const ARROW = { up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6' };
const showNum = (kind, v) => (kind === 'min' ? fmtHM(Math.round(v)) : fmtNum(kind === 'money' ? Math.round(v) : v));

function summary(s, split, ctx) {
  const { now, later } = split;
  const base = ctx.base || {};
  const isToday = s.cur === s.today;
  const future = s.cur > s.today;
  let head;
  if (!now.length && !later.length) head = '<div class="sum-ok"><i class="dot done" aria-hidden="true"></i>اليوم اتسجل كله</div>';
  else if (!now.length) head = `<div class="sum-h"><b>${future ? 'ده يوم جاي' : 'مفيش حاجة ناقصة دلوقتي'}</b></div>`;
  else {
    head = `<div class="sum-h"><b>فاضل${isToday ? ' دلوقتي' : ''} <em>${fmtNum(now.length)}</em></b>
        <button class="sum-go" type="button" data-act="guide">كمّل بالترتيب${ic(P.chev)}</button></div>
      <div class="sum-miss">${now.map((x) => `<button class="mchip" type="button" data-act="guide" data-q="${x.k}" aria-label="${x.t}: ناقص"><i class="dot miss" aria-hidden="true"></i>${x.t}</button>`).join('')}</div>`;
  }
  // البنود اللي وقتها لسه ماجاش: سطر رمادي، من غير كهرماني (مش ناقصة لسه)
  const lat = later.length && !future
    ? `<p class="sum-later"><i class="dot later" aria-hidden="true"></i><span>بالليل: ${later.map((x) => x.t).join('، ')}</span></p>` : '';
  const nums = dayNums(s.day);
  const laterK = new Set(later.map((x) => x.k));
  const anyBase = CELLS.some((c) => base[c.m] != null);
  const cells = CELLS.map((c) => {
    const v = nums[c.m];
    const b = base[c.m];
    let d = '';
    if (v != null) {
      const cmp = compareTo(v, b, c.eps);
      if (cmp?.dir === 'same') d = '<span class="st-d">= زي متوسطك</span>';
      else if (cmp) d = `<span class="st-d"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ARROW[cmp.dir]}"/></svg>${fmtDiff(c.kind, cmp.diff)}</span>`;
    } else if (laterK.has(c.k)) d = '<span class="st-d">بالليل</span>';
    else if (b != null) d = `<span class="st-d">متوسطك ${showNum(c.kind, b)}</span>`;
    const state = v != null ? '' : laterK.has(c.k) ? 'later' : 'miss';
    const say = v != null ? showNum(c.kind, v) : state === 'later' ? 'لسه، بالليل' : 'ناقص';
    return `<button class="st${c.k === 'money' ? ' money' : ''}${state ? ` ${state}` : ''}" type="button" ${c.act} aria-label="${c.a}: ${say}">
      <span class="st-v">${v != null ? showNum(c.kind, v) : '—'}</span>
      <span class="st-k">${state ? `<i class="dot ${state}" aria-hidden="true"></i>` : ''}${c.l}</span>${d}</button>`;
  }).join('');
  const cap = anyBase ? 'الأسهم: مقارنة بمتوسط آخر ٧ أيام' : 'لسه بدري نقارن بمتوسطك (محتاج ٣ أيام)';
  return `<section class="sum" aria-label="ملخص اليوم">${head}${lat}
    <div class="st4">${cells}</div><p class="sum-cap">${cap}</p></section>`;
}

// ---------- المزاج والفترات ----------
function energyBars(e) {
  const n = +e || 0;
  return `<span class="tp-e" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? (n <= 2 ? 'lo' : 'on') : ''}"></i>`).join('')}</span>`;
}

// miss = البنود ★ الناقصة اللي وقتها جه بس (اللي لسه وقتها ماجاش مابيتكتبش عليها "ناقص")
function timeline(s, miss, hour) {
  const d = s.day;
  const mood = `<div class="moodr"><span class="ml">مزاجك النهارده${miss.has('mood') ? '<small>ناقص</small>' : ''}</span>
    <div class="pseg amb" data-rate="mood" role="group" aria-label="المزاج من ٥">${[1, 2, 3, 4, 5].map((i) => `<button class="ps" type="button" data-v="${i}" aria-label="${i} من ٥">${fmtNum(i)}</button>`).join('')}</div></div>`;

  const rows = PERIODS.map(([k, label, range], i) => {
    const phase = periodPhase(i, s.cur, s.today, hour);
    const txt = (d[`${k}t`] || '').trim();
    const h = +String(d[`${k}h`] || '').replace(/[^\d.]/g, '') || 0;
    const filled = !!txt || has(d[`${k}e`]) || h > 0;
    const parts = [];
    if (txt) parts.push(esc(txt));
    if (h) parts.push(`${fmtNum(h)} ساعة`);
    let sub;
    if (parts.length) sub = `<span class="tp-t txt">${parts.join('، ')}</span>`;
    else if (phase === 'future' && !filled) sub = '<span class="tp-t">لسه</span>';
    else if (phase === 'now') sub = '';
    else sub = '<span class="tp-t">دوس واكتب عملت إيه</span>';
    const short = range.replace(/^من /, '');
    const row = `<button class="tp ${phase}${filled ? ' done' : ''}" type="button" data-act="sheet" data-sheet="energy" aria-label="${label}: افتح الطاقة والمزاج">
      <span class="tp-dot"></span>
      <span class="tp-m"><span class="tp-h"><b>${label}</b><small>${short}</small>${phase === 'now' ? '<span class="nowc">دلوقتي</span>' : ''}</span>${sub}</span>
      ${energyBars(d[`${k}e`])}</button>`;
    if (phase !== 'now') return row;
    return `<div class="tpw">${row}
      <form class="tp-in" data-act="addline">
        <input class="qf" data-role="linein" placeholder="عملت إيه ${label}؟" aria-label="عملت إيه ${label}" autocomplete="off" enterkeyhint="send">
        <button class="qgo" type="submit" aria-label="سجّل">${ic(P.send)}</button>
      </form></div>`;
  }).join('');

  return `<div class="sec"><b>يومك بالفترات</b></div>
    <section class="tline" aria-label="يومك بالفترات">${mood}<div class="tps">${rows}</div></section>`;
}

// ---------- العادات ----------
function habitPills(s, miss) {
  const n = habitsDone(s.day);
  const head = miss.has('habits') ? '<span class="ask">ناقص</span>' : `<span>${fmtNum(n)} من ١٣ تم</span>`;
  return `<div class="sec"><b>العادات</b>${head}</div>
    <div class="hs" data-keep-scroll="habits"><div class="pills">
      ${HABITS.map(([k, l]) => `<button class="pl" type="button" data-tri="${k}" data-label="${l}"><i></i>${l}</button>`).join('')}
      <button class="pl more" type="button" data-act="sheet" data-sheet="habits">الأرقام</button>
    </div></div>
    <section class="panel salah" aria-label="الصلوات">${salahRow()}</section>`;
}

// ---------- آخر اليوم ----------
function row({ sheet, t, sub, subCls = '' }) {
  return `<button class="lr c" type="button" data-act="sheet" data-sheet="${sheet}">
    <span class="m"><span class="t"><span class="star">★</span> ${t}</span><span class="s ${subCls}">${sub}</span></span>
    <span class="chev">${ic(P.chev)}</span></button>`;
}
function endOfDay(s, miss) {
  const d = s.day;
  // ناقص (كهرماني) لو وقته جه، و"بالليل" (رمادي) لو لسه
  const sub = (k, empty) => (has(d[k]) ? [esc(d[k]), 'txt'] : miss.has(k) ? [empty, 'ask'] : ['بالليل', '']);
  const [ps, pc] = sub('post', 'ناقص، دوس واكتب');
  const [ts, tc] = sub('top', 'ناقص، جملة قبل ما تنام');
  return `<div class="sec"><b>آخر اليوم</b></div>
    <section class="ledger">
      ${row({ sheet: 'post', t: 'أجّلت إيه؟', sub: ps, subCls: pc })}
      ${row({ sheet: 'top', t: 'أهم حاجة حصلت', sub: ts, subCls: tc })}
    </section>`;
}

// ---------- مهام النهارده ----------
function tasksToday(s) {
  const all = todayTasks(s.tasks, s.today); // المفتوحة لحد النهارده + اللي خلصت النهارده
  const done = all.filter((t) => t.done).length;
  const open = groupTasks(s.tasks, s.today).today.slice(0, 3); // أول ٣ بالترتيب: المهم الأول وبعدين الأقدم
  const head = `<div class="sec"><b>مهام النهارده</b>${all.length ? `<span>${fmtNum(done)} من ${fmtNum(all.length)} خلصت</span>` : ''}</div>`;
  const rows = open.map((t) => `<div class="tk${t.pri ? ' pri' : ''}">
      <button class="tk-c" type="button" data-act="tdone" data-id="${esc(t.id)}" aria-pressed="false" aria-label="علّم إنها خلصت: ${esc(t.t)}"><i></i></button>
      <div class="tk-m"><span class="tk-t">${t.pri ? '<span class="flag" aria-label="مهم">⚑</span>' : ''}${esc(t.t)}</span>${isOverdue(t, s.today) ? `<span class="tk-s">${ic(P.clock)}متأخرة من ${shortDate(t.due)}</span>` : ''}</div></div>`).join('');
  const body = rows || `<p class="empty-s">${all.length ? 'خلّصت مهام النهارده كلها.' : 'مفيش مهام للنهارده.'}</p>`;
  return `${head}<section class="list">${body}
    <button class="lnk" type="button" data-act="tab" data-tab="tasks">كل المهام${ic(P.chev)}</button></section>`;
}

export function renderToday(s, ctx = {}) {
  const hour = ctx.hour ?? new Date().getHours();
  const split = starSplit(s.day, s.cur, s.today, hour);
  const miss = new Set(split.now.map((x) => x.k));
  return `${summary(s, split, ctx)}
    ${timeline(s, miss, hour)}
    ${habitPills(s, miss)}
    ${endOfDay(s, miss)}
    ${aiSection(s)}
    ${tasksToday(s)}
    ${metricsSection(s)}`;
}

export function renderTabs(s) {
  const open = todayTasks(s.tasks, s.today).filter((t) => !t.done).length;
  // الرقم على التبويبة = حاجة محتاجاك (مهام النهارده المفتوحة) بس. عدد الأفكار كان بيزيد على طول ومش محتاج منك حاجة
  const tabs = [['day', 'اليوم', 0], ['tasks', 'مهام', open], ['ideas', 'أفكار', 0], ['money', 'فلوس', 0]];
  return tabs.map(([k, l, n]) => `<button class="tab" type="button" data-act="tab" data-tab="${k}"${s.tab === k ? ' aria-current="page"' : ''}>${l}${n ? `<span class="bd">${fmtNum(n)}</span>` : ''}</button>`).join('');
}
