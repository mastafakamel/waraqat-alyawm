// views/money.js — تبويبة الفلوس لليوم المفتوح، وتحتها ملخص من أول الفترة لحد النهارده.

import { EXP_CATS, FIRST_PERIOD, expTotal, expByCat, moneySummary, longDate, fmtNum } from '../logic.js';
import { esc, setHtml } from '../ui.js';
import { expListHtml } from './sheets.js';

export function moneyShell(s, ui) {
  return `<section class="spent" data-out="spent" aria-live="polite"></section>
    <form class="panel addform" data-act="addmoney">
      <div class="g2m">
        <input class="fld" data-role="mamt" inputmode="decimal" placeholder="المبلغ" aria-label="المبلغ" autocomplete="off" enterkeyhint="next" value="${esc(ui.drafts.mamt || '')}">
        <input class="fld" data-role="mdesc" placeholder="على إيه؟" aria-label="على إيه" autocomplete="off" enterkeyhint="done" value="${esc(ui.drafts.mdesc || '')}">
      </div>
      <div class="cats" role="group" aria-label="التصنيف">${EXP_CATS.map((c) => `<button class="cat" type="button" data-act="cat" data-c="${c}" data-keep aria-pressed="false">${c}</button>`).join('')}</div>
      <button class="b-pri" type="submit">سجّل المصروف</button>
    </form>
    <div class="sec"><b data-out="mlisth"></b></div>
    <div data-out="mlist"></div>
    <div class="panel"><label class="f"><span class="lbl">دخل اليوم (جنيه)</span><input class="fld" data-k="income" data-type="num" inputmode="decimal" autocomplete="off" placeholder="لو جالك فلوس النهارده"></label></div>
    <section class="sum" data-out="sum" aria-label="ملخص الفترة"></section>`;
}

let sumToken = 0;

/** بيحدّث الأجزاء اللي بتتغيّر. loadDays بترجع كل الأيام (async) عشان ملخص الفترة. */
export function updateMoney(root, s, ui, loadDays) {
  const spent = root.querySelector('[data-out="spent"]');
  if (!spent) return;
  const isToday = s.cur === s.today;
  const cats = expByCat(s.day).map(([c, v]) => `${esc(c)} ${fmtNum(v)}`);
  setHtml(spent, `<span class="spent-k">${isToday ? 'صرفت النهارده' : 'صرفت في اليوم ده'}</span>
    <span class="spent-v">${fmtNum(expTotal(s.day))}<small>جنيه</small></span>
    <span class="spent-s">${cats.length ? cats.join('، ') : 'لسه مفيش مصاريف.'}</span>`);

  for (const b of root.querySelectorAll('[data-act="cat"]')) {
    const on = b.dataset.c === ui.cat;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }

  const n = (s.day.exp || []).length;
  const lh = root.querySelector('[data-out="mlisth"]');
  lh.textContent = isToday ? 'مصاريف النهارده' : 'مصاريف اليوم ده';
  lh.parentElement.hidden = !n; // العنوان من غير قايمة تحته شكله ناقص
  setHtml(root.querySelector('[data-out="mlist"]'), n ? expListHtml(s.day, { total: false }) : '');

  // ملخص الفترة بيتحسب من كل الأيام، فبيستنى IndexedDB. لو اتطلب تاني قبل ما يخلص، القديم بيتساب.
  const my = ++sumToken;
  const from = FIRST_PERIOD.from;
  loadDays().then((days) => {
    if (my !== sumToken) return;
    const box = root.querySelector('[data-out="sum"]');
    if (!box) return;
    const sum = moneySummary(days, from, s.today);
    const max = sum.cats[0]?.[1] || 1;
    const head = `<b class="sum-h">من ${longDate(from)} لحد دلوقتي</b>`;
    if (!sum.spent && !sum.income) {
      setHtml(box, `${head}<p class="empty-s" style="padding:0;text-align:right">لسه مفيش مصاريف ولا دخل. أول ما تسجّل، الإجمالي والتقسيم هيظهروا هنا.</p>`);
      return;
    }
    setHtml(box, `${head}
      <div class="sum-tot"><div class="out"><span>صرفت</span><b>${fmtNum(sum.spent)}<small>ج</small></b></div>
        <div class="in"><span>دخل</span><b>${fmtNum(sum.income)}<small>ج</small></b></div></div>
      ${sum.cats.length
        ? `<div class="sum-bars">${sum.cats.map(([c, v]) => `<div class="br"><span>${esc(c)}</span><span class="br-t"><i style="width:${Math.max(3, Math.round((v / max) * 100))}%"></i></span><span class="br-v">${fmtNum(v)}</span></div>`).join('')}</div>`
        : '<p class="empty-s" style="padding:0;text-align:right">لسه مفيش مصاريف.</p>'}`);
  });
}
