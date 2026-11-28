// views/month.js — sheet الشهر: بيفتح من الدوس على التاريخ، عشان توصل لأي يوم أقدم من شريط الـ ٧ أيام.
// الأسبوع بيبدأ السبت (على اليمين)، وكل يوم عليه حالته بنفس علامات شريط الأيام.

import { fmtNum, keyOf, dayStatus } from '../logic.js';
import { ic, P, setHtml } from '../ui.js';

const WD = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']; // السبت الأول
// الحالة من الـ ٥ الأساسيين بس. والنهارده "لسه" لحد ما يخلص، مش "ناقص"
const MARK = { full: 'done', part: 'part', none: 'nolog' };
const WORD = { full: 'مسجّل', part: 'ناقص', none: 'فاضي' };

/** "2026-11" ← { y, m } */
const parse = (ym) => ({ y: +ym.slice(0, 4), m: +ym.slice(5, 7) - 1 });

/** الشهر اللي قبله أو بعده: "2026-11" + 1 ← "2026-12" */
export function shiftMonth(ym, n) {
  const { y, m } = parse(ym);
  return keyOf(new Date(y, m + n, 1)).slice(0, 7);
}

export function monthSheet() {
  return {
    label: 'اختار يوم',
    head: '<h2 data-out="mtitle"></h2>',
    body: `<div class="mnav"><button class="navb" type="button" data-act="mprev" aria-label="الشهر اللي فات">${ic(P.prev)}</button>
        <button class="navb" type="button" data-act="mnext" aria-label="الشهر اللي بعده">${ic(P.next)}</button></div>
      <div class="mgrid-cal" data-out="mgrid"></div>
      <div class="legend-s"><span><i class="dot sm done"></i>مسجّل (الـ ٥ الأساسيين)</span><span><i class="dot sm part"></i>ناقص</span><span><i class="dot sm nolog"></i>فاضي</span></div>`,
    foot: '<div class="foot2"><button class="b-sec" type="button" data-close>تمام</button><button class="b-pri" type="button" data-act="today">النهارده</button></div>',
  };
}

/** بيرسم أيام الشهر. status = { 'YYYY-MM-DD': full | part | none } (الأيام اللي مش فيه = none). */
export function updateMonth(root, ym, s, status = {}) {
  const grid = root?.querySelector('[data-out="mgrid"]');
  if (!grid) return;
  const { y, m } = parse(ym);
  const title = new Date(y, m, 15).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  setHtml(root.querySelector('[data-out="mtitle"]'), title);
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 1) % 7; // كام خانة فاضية قبل يوم ١ (السبت = ٠)
  const count = new Date(y, m + 1, 0).getDate();
  let cells = WD.map((d) => `<span class="mh" aria-hidden="true">${d}</span>`).join('');
  cells += '<span></span>'.repeat(lead);
  for (let i = 1; i <= count; i++) {
    const k = keyOf(new Date(y, m, i));
    const future = k > s.today;
    // اليوم المفتوح من الذاكرة، وبإعداداتك (قبل كده كان بيتحسب بالإعدادات الافتراضية)
    const st = k === s.cur ? dayStatus(s.day, s.settings) : status[k] || 'none';
    const open = k === s.today && st !== 'full';
    const mark = future ? '' : `<i class="dot sm ${open ? 'later' : MARK[st]}" aria-hidden="true"></i>`;
    cells += `<button class="mday${k === s.cur ? ' sel' : ''}${k === s.today ? ' today' : ''}" type="button" data-act="day" data-key="${k}"
      aria-label="${fmtNum(i)}${k === s.today ? '، النهارده' : ''}${future ? '، يوم جاي' : `: ${open ? 'لسه' : WORD[st]}`}">${fmtNum(i)}${mark}</button>`;
  }
  setHtml(grid, cells);
}
