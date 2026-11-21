// views/dock.js — شريط التسجيل السريع. بيترسم مرة واحدة بس، وبعد كده بنحدّث أجزاء منه،
// عشان اللي بتكتبه والكيبورد مايتقفلوش مع كل تغيير في الشاشة.
// وهو مقفول سطر واحد بس: زرار النوع (فكرة ▾) والخانة. الأنواع الأربعة بتظهر لما تدوس على زرار النوع.

import { EXP_CATS, lineTarget, parseExpense, fmtNum } from '../logic.js';
import { esc, ic, P } from '../ui.js';

export const MODES = [['idea', 'فكرة'], ['task', 'مهمة'], ['exp', 'مصروف'], ['line', 'سطر لليوم']];

export function dockHtml() {
  return `<div class="dock-in">
    <div class="modes" data-modes role="group" aria-label="نوع التسجيل" hidden>${MODES.map(([k, l]) => `<button class="md" type="button" data-qmode="${k}" aria-pressed="false">${l}</button>`).join('')}</div>
    <div class="cats qcats" data-qcats role="group" aria-label="التصنيف" hidden>${EXP_CATS.map((c) => `<button class="cat" type="button" data-qcat="${c}" aria-pressed="false">${c}</button>`).join('')}</div>
    <form class="qrow" data-act="quick">
      <button class="qmode" type="button" data-act="qmenu" aria-expanded="false" aria-label="نوع التسجيل"><span data-qlabel></span>${ic(P.down2)}</button>
      <input class="qf" data-role="quickin" autocomplete="off" enterkeyhint="send" aria-label="تسجيل سريع">
      <button class="qgo" type="submit" aria-label="سجّل">${ic(P.send)}</button>
    </form>
    <p class="qhint" data-qhint aria-live="polite"></p>
  </div>`;
}

function placeholder(mode) {
  if (mode === 'idea') return 'اكتب الفكرة…';
  if (mode === 'task') return 'مهمة للنهارده…';
  if (mode === 'exp') return 'المبلغ وعلى إيه، مثلاً: ٧٥ غدا';
  return `عملت إيه ${lineTarget(new Date().getHours()).label}؟`;
}

/** بيحدّث الشريط من غير ما يرسمه من الأول. */
export function updateDock(root, ui, away) {
  if (!root) return;
  for (const b of root.querySelectorAll('[data-qmode]')) b.setAttribute('aria-pressed', b.dataset.qmode === ui.qmode);
  root.querySelector('[data-modes]').hidden = !ui.qmenu;
  const mb = root.querySelector('[data-act="qmenu"]');
  mb.setAttribute('aria-expanded', !!ui.qmenu);
  const label = MODES.find(([k]) => k === ui.qmode)[1];
  root.querySelector('[data-qlabel]').textContent = label;
  mb.setAttribute('aria-label', `نوع التسجيل: ${label}، دوس عشان تغيّره`);
  const cats = root.querySelector('[data-qcats]');
  cats.hidden = ui.qmode !== 'exp';
  for (const b of cats.querySelectorAll('[data-qcat]')) b.setAttribute('aria-pressed', b.dataset.qcat === ui.qcat);
  const inp = root.querySelector('[data-role="quickin"]');
  inp.placeholder = placeholder(ui.qmode);
  inp.inputMode = 'text';

  const hint = root.querySelector('[data-qhint]');
  const v = inp.value.trim();
  const where = away ? ' في النهارده' : '';
  hint.classList.remove('err');
  if (ui.qmode === 'exp' && v) {
    const r = parseExpense(v);
    if (r) hint.innerHTML = `هيتسجل${where}: <b>${fmtNum(r.a)} جنيه</b>${r.w ? `، ${esc(r.w)}` : ''}، ${ui.qcat}`;
    else {
      hint.textContent = 'اكتب المبلغ رقم، زي ٧٥ غدا';
      hint.classList.add('err');
    }
  } else if (ui.qmode === 'line' && v) {
    hint.textContent = `هيتضاف لـ "${lineTarget(new Date().getHours()).label}"${where}`;
  } else {
    hint.textContent = '';
  }
}
