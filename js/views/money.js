// views/money.js — تبويبة الفلوس: مصاريف اليوم، «ماصرفتش»، الدخل كبنود، وملخص الفترة (الصافي + المتوسط + الميزانية).

import {
  INC_CATS, expTotal, incomeTotal, expByCat, moneySummary, summaryStart, fmtNum, addDays,
} from '../logic.js';
import { esc, ic, P, setHtml } from '../ui.js';
import { expListHtml } from './sheets.js';

export function moneyShell(s, ui) {
  return `<section class="spent" data-out="spent" aria-live="polite"></section>
    <form class="panel addform" data-act="addmoney">
      <div class="g2m">
        <input class="fld" data-role="mamt" inputmode="decimal" placeholder="المبلغ" aria-label="المبلغ" autocomplete="off" enterkeyhint="next" value="${esc(ui.drafts.mamt || '')}">
        <input class="fld" data-role="mdesc" placeholder="على إيه؟" aria-label="على إيه" autocomplete="off" enterkeyhint="done" value="${esc(ui.drafts.mdesc || '')}">
      </div>
      <div class="cats" data-out="mcats" role="group" aria-label="التصنيف"></div>
      <button class="b-pri" type="submit">سجّل المصروف</button>
      <div data-out="mnospend"></div>
    </form>
    <div class="sec"><b data-out="mlisth"></b></div>
    <div data-out="mlist"></div>
    <div class="sec"><b>دخل اليوم</b><span class="mut" data-out="inctot"></span></div>
    <form class="panel addform" data-act="addinc">
      <div class="g2m">
        <input class="fld" data-role="iamt" inputmode="decimal" placeholder="المبلغ" aria-label="مبلغ الدخل" autocomplete="off" enterkeyhint="next" value="${esc(ui.drafts.iamt || '')}">
        <input class="fld" data-role="idesc" placeholder="المصدر (اختياري)" aria-label="مصدر الدخل" autocomplete="off" enterkeyhint="done" value="${esc(ui.drafts.idesc || '')}">
      </div>
      <div class="picks" data-out="icatsm" role="group" aria-label="نوع الدخل">${INC_CATS.map((c) => `<button class="pk" type="button" data-act="inccat" data-c="${esc(c)}" data-keep aria-pressed="false">${esc(c)}</button>`).join('')}</div>
      <button class="b-sec" type="submit">سجّل الدخل</button>
      <div data-out="inclist"></div>
    </form>
    <section class="sum" data-out="sum" aria-label="ملخص الفترة"></section>`;
}

let sumToken = 0;

function incListHtml(day) {
  const list = day.inc || [];
  const leg = +day.income || 0;
  if (!list.length && !leg) return '';
  const rows = list.map((e, i) => `<div class="ex">
      <span class="a inc">${fmtNum(e.a)} ج</span>
      <span class="w">${esc(e.w) || '—'}</span>
      <span class="c">${esc(e.c || '')}</span>
      <button class="del" type="button" data-act="delinc" data-i="${i}" aria-label="امسح دخل ${fmtNum(e.a)} جنيه">${ic(P.close)}</button>
    </div>`).join('');
  const legRow = leg > 0 ? `<div class="ex">
      <span class="a inc">${fmtNum(leg)} ج</span>
      <span class="w">دخل مسجّل</span>
      <span class="c">قديم</span>
      <button class="del" type="button" data-act="delleginc" aria-label="امسح الدخل">${ic(P.close)}</button>
    </div>` : '';
  return `<div class="explist" style="margin-top:4px">${rows}${legRow}</div>`;
}

export function updateMoney(root, s, ui, loadDays) {
  const spent = root.querySelector('[data-out="spent"]');
  if (!spent) return;
  const isToday = s.cur === s.today;
  const cats = expByCat(s.day).map(([c, v]) => `${esc(c)} ${fmtNum(v)}`);
  const expCount = (s.day.exp || []).length;
  const spentVal = expCount ? `${fmtNum(expTotal(s.day))}<small>جنيه</small>` : s.day.noSpend ? '٠<small>ماصرفتش</small>' : '—';
  setHtml(spent, `<span class="spent-k">${isToday ? 'صرفت النهارده' : 'صرفت في اليوم ده'}</span>
    <span class="spent-v">${spentVal}</span>
    <span class="spent-s">${cats.length ? cats.join('، ') : s.day.noSpend ? 'متعلّم إنك ماصرفتش حاجة ✓' : 'لسه مفيش مصاريف.'}</span>`);

  // تصنيفات المصاريف الديناميكية من الإعدادات
  const expCats = s.settings.expCats || [];
  if (!expCats.includes(ui.cat) && expCats.length) ui.cat = expCats[0];
  setHtml(root.querySelector('[data-out="mcats"]'), expCats.map((c) => `<button class="cat${ui.cat === c ? ' on' : ''}" type="button" data-act="cat" data-c="${esc(c)}" data-keep aria-pressed="${ui.cat === c}">${esc(c)}</button>`).join(''));

  const nsp = root.querySelector('[data-out="mnospend"]');
  if (nsp) {
    setHtml(nsp, expCount ? '' : `<button class="ch wide${s.day.noSpend ? ' on' : ''}" type="button" data-act="nospend" aria-pressed="${!!s.day.noSpend}">
      <span>ماصرفتش حاجة النهارده</span><small>${s.day.noSpend ? 'متعلمة ✓' : 'علّم ٠ ج'}</small></button>`);
  }

  const lh = root.querySelector('[data-out="mlisth"]');
  lh.textContent = isToday ? 'مصاريف النهارده (دوس على بند لتعديله)' : 'مصاريف اليوم ده';
  lh.parentElement.hidden = !expCount;
  setHtml(root.querySelector('[data-out="mlist"]'), expCount ? expListHtml(s.day, { total: false }) : '');

  // الدخل
  for (const b of root.querySelectorAll('[data-act="inccat"]')) {
    b.setAttribute('aria-pressed', b.dataset.c === ui.inccat);
  }
  const incTot = incomeTotal(s.day);
  const incTotEl = root.querySelector('[data-out="inctot"]');
  if (incTotEl) incTotEl.textContent = incTot > 0 ? `${fmtNum(incTot)} ج` : '';
  setHtml(root.querySelector('[data-out="inclist"]'), incListHtml(s.day));

  // ملخص الفترة: الصرف + الدخل + الصافي + المتوسط اليومي + الميزانية
  const my = ++sumToken;
  const { from, to: periodEnd, title } = summaryStart(s.periods, s.today);
  const budget = +s.settings.budget || 0;
  loadDays().then((days) => {
    if (my !== sumToken) return;
    const box = root.querySelector('[data-out="sum"]');
    if (!box) return;
    const sum = moneySummary(days, from, s.today, budget);
    const max = sum.cats[0]?.[1] || 1;
    const head = `<b class="sum-h">${title}</b>`;
    if (!sum.spent && !sum.income && !budget) {
      setHtml(box, `${head}<p class="empty-s" style="padding:0;text-align:right">لسه مفيش مصاريف ولا دخل. أول ما تسجّل، الإجمالي والتقسيم هيظهروا هنا.</p>`);
      return;
    }

    let budgetHtml = '';
    if (budget > 0) {
      const over = sum.remaining < 0;
      let dailyRem = '';
      if (!over && periodEnd && periodEnd >= s.today) {
        const dLeft = Math.max(1, Math.round((new Date(`${periodEnd}T12:00:00`) - new Date(`${s.today}T12:00:00`)) / 864e5) + 1);
        dailyRem = ` · مسموح ${fmtNum(Math.floor(sum.remaining / dLeft))} ج/يوم`;
      }
      budgetHtml = `<div class="bud-box">
          <div class="pace-meta">
            <span>السقف: <b>${fmtNum(budget)} ج</b></span>
            <span class="pace-tag ${over ? 'attn' : 'done'}">${over ? `زيادة ${fmtNum(Math.abs(sum.remaining))} ج` : `فاضل ${fmtNum(sum.remaining)} ج${dailyRem}`}</span>
          </div>
          <div class="pace-bar" aria-hidden="true"><div class="pace-fill${over || sum.budgetPct >= 85 ? ' attn' : ''}" style="width:${sum.budgetPct}%"></div></div>
        </div>`;
    }

    const netCls = sum.net >= 0 ? 'net-pos' : 'net-neg';
    const netSign = sum.net < 0 ? '−' : '';

    setHtml(box, `${head}
      <div class="sum-tot3">
        <div class="out"><span>صرفت</span><b>${sum.spent ? `${fmtNum(sum.spent)}<small>ج</small>` : '—'}</b></div>
        <div class="in"><span>دخل</span><b>${sum.income ? `${fmtNum(sum.income)}<small>ج</small>` : '—'}</b></div>
        <div class="${netCls}"><span>الصافي</span><b>${(sum.spent || sum.income) ? `${netSign}${fmtNum(Math.abs(sum.net))}<small>ج</small>` : '—'}</b></div>
      </div>
      <p class="note" style="margin:0">متوسط الصرف اليومي: <b>${fmtNum(sum.avgPerDay)} ج</b> (على مدار ${fmtNum(sum.daysElapsed)} يوم)</p>
      ${budgetHtml}
      ${sum.cats.length
        ? `<div class="sum-bars">${sum.cats.map(([c, v]) => `<div class="br"><span>${esc(c)}</span><span class="br-t"><i style="width:${Math.max(3, Math.round((v / max) * 100))}%"></i></span><span class="br-v">${fmtNum(v)}</span></div>`).join('')}</div>`
        : '<p class="empty-s" style="padding:0;text-align:right">لسه مفيش مصاريف.</p>'}`);
  });
}

export { addDays };
