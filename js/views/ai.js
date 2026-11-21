// views/ai.js — قسم "تقرير الذكاء الاصطناعي" في تبويبة اليوم، والشاشة اللي بتعرض التقرير.
// التقرير متخزّن في اليوم نفسه: day.ai (اليومي) و day.aiw (الأسبوعي) = { t: النص، at: وقت عمله }.

import { reportBlocks, shortDate, addDays, dateTitle } from '../logic.js';
import { esc, ic, P } from '../ui.js';

const FIELD = { day: 'ai', week: 'aiw' };
const TITLE = { day: 'تقرير اليوم', week: 'تقرير الأسبوع' };

/** أول جملة في التقرير (مش العنوان)، عشان تبان تحت اسم التقرير. */
function preview(t) {
  const b = reportBlocks(t).find((x) => x.p || x.ul);
  return b ? (b.p || b.ul[0]) : '';
}

/** نص التقرير → HTML. كل الكلام بيتعمله esc، فمفيش أي HTML من الموديل بيتنفّذ. */
export function reportHtml(text) {
  return reportBlocks(text).map((b) => {
    if (b.h) return `<h3>${esc(b.h)}</h3>`;
    if (b.ul) return `<ul>${b.ul.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `<p>${esc(b.p)}</p>`;
  }).join('');
}

export function aiSection(s) {
  const off = s.sync === 'off' || s.sync === 'signedout';
  const row = (kind, empty) => {
    const rep = s.day[FIELD[kind]];
    let sub = esc(empty);
    let cls = '';
    // "بيحلل" و"محتاج تدخل" رمادي: مش بند ناقص، فمش كهرماني (DESIGN.md نسخة ٢)
    if (s.aiBusy === kind) {
      sub = 'بيحلل…';
    } else if (rep?.t) {
      sub = esc(preview(rep.t));
      cls = 'txt';
    } else if (off) {
      sub = 'محتاج تدخل بحسابك (الإعدادات ← المزامنة)';
    }
    return `<button class="lr c" type="button" data-act="ai" data-kind="${kind}"${s.aiBusy ? ' aria-busy="true"' : ''}>
      <span class="m"><span class="t">${TITLE[kind]}</span><span class="s ${cls}">${sub}</span></span>
      <span class="chev">${ic(P.chev)}</span></button>`;
  };
  return `<div class="sec"><b>تقرير الذكاء الاصطناعي</b></div>
    <section class="ledger">
      ${row('day', 'دوس وهيحلل اليوم ده')}
      ${row('week', 'آخر ٧ أيام لحد اليوم ده')}
    </section>`;
}

function when(at) {
  const d = new Date(at);
  return `${shortDate(at)}، الساعة ${d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}`;
}

export function aiSheet(kind, s) {
  const rep = s.day[FIELD[kind]];
  const range = kind === 'week' ? `من ${shortDate(addDays(s.cur, -6))} لـ ${shortDate(s.cur)}` : dateTitle(s.cur);
  const body = rep?.t
    ? `<p class="note" style="margin:0">${range}</p>
      <div class="airep">${reportHtml(rep.t)}</div>
      <p class="note" style="margin:0">اتعمل ${when(rep.at)}. الملخص بيتبعت لـ Groq من غير اسمك ولا إيميلك.</p>`
    : '<p class="empty-s">لسه مفيش تقرير.</p>';
  return {
    label: TITLE[kind],
    head: `<h2>${TITLE[kind]}</h2>`,
    body,
    foot: `<div class="foot2"><button class="b-sec" type="button" data-close>تمام</button>
      <button class="b-pri" type="button" data-act="airegen" data-kind="${kind}">حلّل تاني</button></div>`,
  };
}

/** وإنت مستني: زرار "حلّل تاني" بيقول "بيحلل…" ومايتداسش. */
export function updateAiSheet(sh, s) {
  const b = sh?.querySelector('[data-act="airegen"]');
  if (!b) return;
  b.textContent = s.aiBusy === b.dataset.kind ? 'بيحلل…' : 'حلّل تاني';
  b.disabled = !!s.aiBusy;
}
