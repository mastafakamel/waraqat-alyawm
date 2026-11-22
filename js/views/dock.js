// views/dock.js — شريط التسجيل السريع (يدعم التصنيفات الديناميكية والتخمين الذكي لتصنيف المصروف وبداية اليوم).

import { lineTarget, parseExpense, guessExpCat, fmtNum } from '../logic.js';
import { esc, ic, P, setHtml } from '../ui.js';

export const MODES = [['idea', 'فكرة'], ['task', 'مهمة'], ['exp', 'مصروف'], ['line', 'سطر لليوم']];

export function dockHtml() {
  return `<div class="dock-in">
    <div class="modes" data-modes role="group" aria-label="نوع التسجيل" hidden>${MODES.map(([k, l]) => `<button class="md" type="button" data-qmode="${k}" aria-pressed="false">${l}</button>`).join('')}</div>
    <div class="cats qcats" data-qcats role="group" aria-label="التصنيف" hidden></div>
    <form class="qrow" data-act="quick">
      <button class="qmode" type="button" data-act="qmenu" aria-expanded="false" aria-label="نوع التسجيل"><span data-qlabel></span>${ic(P.down2)}</button>
      <input class="qf" data-role="quickin" autocomplete="off" enterkeyhint="send" aria-label="تسجيل سريع">
      <button class="qgo" type="submit" aria-label="سجّل">${ic(P.send)}</button>
    </form>
    <p class="qhint" data-qhint aria-live="polite"></p>
  </div>`;
}

function placeholder(mode, dayStart) {
  if (mode === 'idea') return 'اكتب الفكرة…';
  if (mode === 'task') return 'مهمة للنهارده…';
  if (mode === 'exp') return 'المبلغ وعلى إيه، مثلاً: ٧٥ غدا';
  return `عملت إيه ${lineTarget(new Date().getHours(), dayStart).label}؟`;
}

/** بيحدّث الشريط من غير ما يرسمه من الأول. */
export function updateDock(root, ui, away, settings) {
  if (!root) return;
  const ds = settings?.dayStart || 4;
  const expCats = settings?.expCats || [];
  if (expCats.length && !expCats.includes(ui.qcat)) ui.qcat = expCats[0];

  for (const b of root.querySelectorAll('[data-qmode]')) b.setAttribute('aria-pressed', b.dataset.qmode === ui.qmode);
  root.querySelector('[data-modes]').hidden = !ui.qmenu;
  const mb = root.querySelector('[data-act="qmenu"]');
  mb.setAttribute('aria-expanded', !!ui.qmenu);
  const label = MODES.find(([k]) => k === ui.qmode)[1];
  root.querySelector('[data-qlabel]').textContent = label;
  mb.setAttribute('aria-label', `نوع التسجيل: ${label}، دوس عشان تغيّره`);

  const inp = root.querySelector('[data-role="quickin"]');
  inp.placeholder = placeholder(ui.qmode, ds);
  inp.inputMode = 'text';

  const v = inp.value.trim();
  // تخمين ذكي للتصنيف لو المستخدم ما اختارش تصنيف بإيده للكتابة دي
  if (ui.qmode === 'exp' && v && !ui.qcatManual) {
    const r = parseExpense(v);
    const guessed = r?.w ? guessExpCat(r.w, expCats) : null;
    if (guessed) ui.qcat = guessed;
  }

  const cats = root.querySelector('[data-qcats]');
  cats.hidden = ui.qmode !== 'exp';
  setHtml(cats, expCats.map((c) => `<button class="cat" type="button" data-qcat="${esc(c)}" aria-pressed="${c === ui.qcat}">${esc(c)}</button>`).join(''));

  const hint = root.querySelector('[data-qhint]');
  const where = away ? ' في النهارده' : '';
  hint.classList.remove('err');
  if (ui.qmode === 'exp' && v) {
    const r = parseExpense(v);
    if (r) hint.innerHTML = `هيتسجل${where}: <b>${fmtNum(r.a)} جنيه</b>${r.w ? `، ${esc(r.w)}` : ''}، ${esc(ui.qcat)}`;
    else {
      hint.textContent = 'اكتب المبلغ رقم، زي ٧٥ غدا';
      hint.classList.add('err');
    }
  } else if (ui.qmode === 'line' && v) {
    hint.textContent = `هيتضاف لـ "${lineTarget(new Date().getHours(), ds).label}"${where}`;
  } else {
    hint.textContent = '';
  }
}
