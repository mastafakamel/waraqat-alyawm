// views/today.js — الهيدر وتبويبة "اليوم" (خط اليوم) والتبويبات. بيرسم من الحالة بس، ومبيغيّرش حاجة.
//
// ترتيب تبويبة اليوم (التصميم "ج: خط اليوم"):
//   شريط ٤ أرقام ← المزاج والفترات الأربعة (والفترة اللي إنت فيها بتكتب فيها على طول) ← العادات صف بيتسحب
//   ← الصلوات ← آخر اليوم (أجّلت إيه وأهم حاجة) ← تقرير الذكاء الاصطناعي (اليوم والأسبوع)
//   ← مهام النهارده ← مقاييسي ← "قيس حاجة جديدة" و"الإعدادات"

import {
  HABITS, PERIODS, dateTitle, dayRel, starState, starCount, fmtNum, arDigits, sleepMinutes, fmtHM,
  habitsDone, workTotal, expTotal, todayTasks, groupTasks, has, periodPhase, periodOf, periodDay,
  isOverdue, shortDate,
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
export function renderHeader(s) {
  const n = starCount(s.day);
  // عداد ★ هو المكان الوحيد اللي بيقول فاضل كام، والدوس عليه بيبدأ "سؤال بسؤال" للناقص
  const star = n < 8
    ? `<button class="starb" type="button" data-act="guide" aria-label="البنود الأساسية: ${n} من ٨، كمّل الناقص"><span class="pill">★ ${fmtNum(n)} من ٨<b>كمّل</b>${ic(P.chev)}</span></button>`
    : `<span class="starb done" aria-label="البنود الأساسية اتسجلت كلها"><span class="pill">★ ٨ من ٨ ✓</span></span>`;
  return `<div class="top-r1">
      <h1 class="date">${dateTitle(s.cur)}</h1>
      <button class="navb" type="button" data-act="prev" aria-label="اليوم اللي قبله">${ic(P.prev)}</button>
      <button class="navb" type="button" data-act="next" aria-label="اليوم اللي بعده">${ic(P.next)}</button>
    </div>
    <div class="top-r2">
      <span class="chip-day">${dayRel(s.cur, s.today)}${dayOfPeriod(s)}</span>
      ${star}
      <span class="saved" data-out="saved"></span>
    </div>`;
}
/** "، يوم ٣ من ١١" لو اليوم المفتوح جوه فترة. */
function dayOfPeriod(s) {
  const d = periodDay(periodOf(s.periods, s.cur), s.cur);
  return d ? `، يوم ${fmtNum(d.n)} من ${fmtNum(d.of)}` : '';
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

// ---------- شريط الأرقام ----------
function strip(s, ok) {
  const d = s.day;
  const sm = sleepMinutes(d.sleep, d.wake);
  const cells = [
    { k: 'sleep', v: sm != null ? fmtHM(sm) : '', l: 'نوم', act: 'data-act="sheet" data-sheet="sleep"', a: 'النوم' },
    { k: 'screen', v: has(d.screen) ? arDigits(d.screen) : '', l: 'شاشة', act: 'data-act="sheet" data-sheet="sleep"', a: 'الشاشة' },
    { k: 'work', v: ok.work ? fmtNum(workTotal(d)) : '', l: 'ساعة شغل', act: 'data-act="sheet" data-sheet="work"', a: 'الشغل' },
    { k: 'money', v: ok.money ? fmtNum(expTotal(d)) : '', l: 'جنيه', act: 'data-act="tab" data-tab="money"', a: 'المصروف', cls: 'money' },
  ];
  return `<section class="strip" aria-label="أرقام اليوم">${cells.map((c) => {
    const miss = !ok[c.k];
    return `<button class="st${c.cls ? ` ${c.cls}` : ''}${miss ? ' miss' : ''}" type="button" ${c.act} aria-label="${c.a}: ${miss ? 'ناقص' : c.v}">
      <span class="st-v">${c.v || '—'}</span><span class="st-k">${c.l}</span></button>`;
  }).join('')}</section>`;
}

// ---------- المزاج والفترات ----------
function energyBars(e) {
  const n = +e || 0;
  return `<span class="tp-e" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? (n <= 2 ? 'lo' : 'on') : ''}"></i>`).join('')}</span>`;
}

function timeline(s, ok) {
  const d = s.day;
  const hour = new Date().getHours();
  const mood = `<div class="moodr"><span class="ml">مزاجك النهارده${ok.mood ? '' : '<small>ناقص</small>'}</span>
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
function habitPills(s, ok) {
  const n = habitsDone(s.day);
  return `<div class="sec"><b>العادات</b>${ok.habits ? `<span>${fmtNum(n)} من ١٣ تم</span>` : '<span class="ask">ناقص</span>'}</div>
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
function endOfDay(s) {
  const d = s.day;
  return `<div class="sec"><b>آخر اليوم</b></div>
    <section class="ledger">
      ${row({ sheet: 'post', t: 'أجّلت إيه؟', sub: has(d.post) ? esc(d.post) : 'ناقص، دوس واكتب', subCls: has(d.post) ? 'txt' : 'ask' })}
      ${row({ sheet: 'top', t: 'أهم حاجة حصلت', sub: has(d.top) ? esc(d.top) : 'ناقص، جملة قبل ما تنام', subCls: has(d.top) ? 'txt' : 'ask' })}
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

export function renderToday(s) {
  const ok = Object.fromEntries(starState(s.day).map((x) => [x.k, x.ok]));
  return `${strip(s, ok)}
    ${timeline(s, ok)}
    ${habitPills(s, ok)}
    ${endOfDay(s)}
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
