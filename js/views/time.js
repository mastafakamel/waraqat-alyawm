// views/time.js — تاب «الوقت»: تسجيل اليوم ساعة بساعة (٤ الفجر ← ٤ الفجر) + طاقة كل فترة.
// التلوين بلمسة واحدة من شريط المجالات، والضغط على القلم يفتح sheet لتفاصيل الساعة والمدة (١–٤ ساعات).

import {
  PERIODS, PERIOD_HOURS, TIME_CATS, fmtHour, fmtNum, fmt12, hourSpan, fmtHours, timeByCat, periodPhase, sleepHourList,
} from '../logic.js';
import { esc, ic, ico, P } from '../ui.js';

const CAT_MAP = new Map(TIME_CATS.map((c) => [c.id, c]));

/** شريط توزيع الـ ٢٤ ساعة (مشترك بين تاب اليوم وتاب الوقت). */
export function timeStackBar(tb) {
  if (!tb.total) return '<div class="tstack" aria-hidden="true"></div>';
  return `<div class="tstack" aria-hidden="true">${tb.rows
    .map((r) => `<i class="tc-${r.id}" style="width:${(r.hours / 24) * 100}%"></i>`).join('')}</div>`;
}

export function renderTime(s, ui, ctx = {}) {
  const hour = ctx.hour ?? new Date().getHours();
  const hrs = s.day.hrs || {};
  const tb = timeByCat(s.day);
  const brush = ui.tbrush || 'work';
  const activeCat = CAT_MAP.get(brush);
  const filter = ui.tperiod || 'all';
  const sleepHours = sleepHourList(s.day.sleep, s.day.wake);
  const sleepBtn = sleepHours.length
    ? `<button class="tfill" type="button" data-act="fillsleep">ملء النوم (${fmt12(s.day.sleep)} ← ${fmt12(s.day.wake)})</button>`
    : '<button class="tfill" type="button" data-act="sheet" data-sheet="sleep">سجّل وقت النوم</button>';

  const brushBar = `<section class="panel tbrush" aria-label="اختيار مجال الوقت">
      <div class="tb-top">
        <span class="tb-l">اختار المجال ودوس على الساعات</span>
        ${sleepBtn}
      </div>
      <div class="tb-chips" role="group" aria-label="مجالات الوقت">
        ${TIME_CATS.map((c) => `<button class="bchip tc-${c.id}" type="button" data-act="tbrush" data-c="${c.id}" aria-pressed="${brush === c.id}">
          <span class="bic">${ico(c.icon)}</span><span>${c.name}</span></button>`).join('')}
        <button class="bchip clear" type="button" data-act="tbrush" data-c="clear" aria-pressed="${brush === 'clear'}">${ic(P.eraser)}<span>مسح</span></button>
      </div>
      <div class="tb-prog">
        ${timeStackBar(tb)}
        <span class="tb-cnt">${fmtNum(tb.total)} من ٢٤ ساعة</span>
      </div>
    </section>`;

  const filters = `<div class="pfilt" role="tablist" aria-label="تصفية بالفترات">
      <button class="pf" type="button" data-act="tperiod" data-v="all" aria-pressed="${filter === 'all'}">اليوم كله</button>
      ${PERIODS.map(([k, l]) => `<button class="pf" type="button" data-act="tperiod" data-v="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}
    </div>`;

  const periodsHtml = PERIODS.map(([k, label, range], i) => {
    if (filter !== 'all' && filter !== k) return '';
    const ph = periodPhase(i, s.cur, s.today, hour);
    const list = PERIOD_HOURS[i];
    const doneCount = list.filter((h) => hrs[String(h)]?.c).length;
    const oldTxt = (s.day[`${k}t`] || '').trim();
    const shortRange = range.replace(/^من /, '');

    const rows = list.map((h) => {
      const entry = hrs[String(h)];
      const cat = entry?.c ? CAT_MAP.get(entry.c) : null;
      const isNow = s.cur === s.today && h === hour;
      const note = (entry?.t || '').trim();
      let slotInner;
      if (cat) {
        slotInner = `<span class="hr-ic">${ico(cat.icon)}</span><b class="hr-cat">${cat.name}</b>${note ? `<span class="hr-txt">· ${esc(note)}</span>` : ''}`;
      } else if (note) {
        slotInner = `<span class="hr-txt only">${esc(note)}</span><span class="hr-tag">اختار مجال</span>`;
      } else {
        slotInner = `<span class="hr-ph">${activeCat ? `دوس تسجّل ${activeCat.name}` : 'فاضية'}</span>`;
      }
      const cls = cat ? `hr-slot filled tc-${cat.id}` : note ? 'hr-slot untagged' : 'hr-slot';
      const labelWord = cat ? `${cat.name}${note ? `، ${note}` : ''}` : note || 'فاضية';
      return `<div class="hr-row${isNow ? ' now' : ''}">
          <span class="hr-t">${fmtHour(h)}</span>
          <button class="${cls}" type="button" data-act="hset" data-h="${h}" aria-label="الساعة ${fmtHour(h)}: ${esc(labelWord)}">${slotInner}</button>
          <button class="hr-ed" type="button" data-act="hedit" data-h="${h}" aria-label="تفاصيل الساعة ${fmtHour(h)}">${ic(P.edit)}</button>
        </div>`;
    }).join('');

    return `<section class="panel tper${ph === 'now' ? ' now' : ''}" aria-label="${label}">
        <div class="tper-h">
          <div class="tper-r1">
            <b>${label}</b>
            <small>${shortRange} · ${fmtNum(doneCount)} من ${fmtNum(list.length)}</small>
            ${ph === 'now' ? '<span class="nowc">دلوقتي</span>' : ''}
          </div>
          <div class="tper-en">
            <span>طاقة الفترة</span>
            <div class="pseg amb" data-rate="${k}e" role="group" aria-label="طاقة ${label}">
              ${[1, 2, 3, 4, 5].map((n) => `<button class="ps" type="button" data-v="${n}" aria-label="${n} من ٥">${fmtNum(n)}</button>`).join('')}
            </div>
          </div>
          ${oldTxt ? `<button class="tper-old" type="button" data-act="sheet" data-sheet="${k}"><span>ملخص الفترة: ${esc(oldTxt)}</span>${ic(P.chev)}</button>` : ''}
        </div>
        <div class="hr-list">${rows}</div>
      </section>`;
  }).join('');

  return `${brushBar}${filters}${periodsHtml}
    <button class="lnk2" type="button" data-act="sheet" data-sheet="energy" style="align-self:center">اللي رفع ووطّى طاقتك والمهام غير المخططة</button>`;
}

/** شاشة تفاصيل ساعة واحدة: اختيار المجال + ملاحظة + يمتد كام ساعة (١–٤). */
export function hourSheet(h, hf) {
  const span = hf.span || 1;
  return {
    label: `الساعة ${fmtHour(h)}`,
    head: `<h2>الساعة ${fmtHour(h)}</h2>`,
    body: `<div>
        <span class="lbl">المجال</span>
        <div class="tb-chips" role="group" aria-label="اختيار المجال">
          ${TIME_CATS.map((c) => `<button class="bchip tc-${c.id}" type="button" data-act="hcat" data-c="${c.id}" data-keep aria-pressed="${hf.c === c.id}">
            <span class="bic">${ico(c.icon)}</span><span>${c.name}</span></button>`).join('')}
        </div>
      </div>
      <form class="addform" data-act="hsave">
        <label class="f"><span class="lbl">عملت إيه في الساعة دي؟ (اختياري)</span>
          <input class="fld" data-role="hnote" data-focus autocomplete="off" enterkeyhint="done" placeholder="مثلاً: شغل على ورقة اليوم، طريق الشغل…" value="${esc(hf.t || '')}">
        </label>
      </form>
      <div>
        <span class="lbl">المدة (يمتد كام ساعة؟)</span>
        <div class="chs" role="group" aria-label="المدة بالساعات">
          ${[1, 2, 3, 4].map((n) => `<button class="ch" type="button" data-act="hspan" data-n="${n}" data-keep aria-pressed="${span === n}">${n === 1 ? 'ساعة' : fmtNum(n)}</button>`).join('')}
        </div>
        <p class="note" data-out="hspaninfo" style="margin-top:8px"></p>
      </div>`,
    foot: `<div class="foot2">
        <button class="b-sec" type="button" data-act="hclear">امسح</button>
        <button class="b-pri" type="button" data-act="hsave">احفظ</button>
      </div>`,
  };
}

export function updateHourSheet(sh, hf) {
  if (!sh || !hf) return;
  for (const b of sh.querySelectorAll('[data-act="hcat"]')) {
    b.setAttribute('aria-pressed', b.dataset.c === hf.c);
  }
  for (const b of sh.querySelectorAll('[data-act="hspan"]')) {
    const on = +b.dataset.n === hf.span;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
  const info = sh.querySelector('[data-out="hspaninfo"]');
  if (info) {
    const list = hourSpan(hf.h, hf.span);
    const endH = (list[list.length - 1] + 1) % 24;
    info.innerHTML = list.length > 1
      ? `هيتسجّل من <b>${fmtHour(list[0])}</b> لـ <b>${fmtHour(endH)}</b> (${fmtHours(list.length)}).`
      : `الساعة <b>${fmtHour(hf.h)}</b> بس.`;
  }
}
