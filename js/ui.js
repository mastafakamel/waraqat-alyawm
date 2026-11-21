// ui.js — أدوات الواجهة: الـ sheet اللي بتطلع من تحت، والـ toast، وتحديث الخانات من بيانات اليوم.

import { arDigits } from './logic.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const P = {
  prev: 'M9 6l6 6-6 6', // سهم لليمين = اليوم اللي قبله
  next: 'M15 6l-6 6 6 6', // سهم للشمال = اليوم اللي بعده
  chev: 'M15 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  send: 'M19 12H5M11 6l-6 6 6 6',
  up: 'M12 19V5M6 11l6-6 6 6', // للنهارده (فوق)
  down: 'M12 5v14M6 13l6 6 6-6', // لبعدين (تحت)
  check: 'M5 12.5l4.5 4.5L19 7',
  down2: 'M6 9l6 6 6-6', // سهم صغير لتحت (قايمة بتفتح)
  // لغة العلامات (DESIGN.md نسخة ٢)
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', // متأخرة
  alert: 'M12 4l9 16H3L12 4zM12 10v4M12 17.2v.3', // غلط، أو المزامنة واقفة
  cloudOff: 'M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18zM4 4l16 16', // مستني النت
  pin: 'M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v7', // فكرة مثبتة
};
/**
 * بيغيّر محتوى العنصر بس لو اتغيّر فعلاً. لو العنصر اترسم من جديد وإنت لسه حاطط صباعك على زرار جواه،
 * الزرار القديم بيتشال، والمتصفح مابيعتبرهاش دوسة. ولو بدّلت محتوى العنصر بطريقة تانية، صفّر el._html.
 */
export function setHtml(el, html) {
  if (!el || el._html === html) return;
  el.innerHTML = html;
  el._html = html;
}

export const ic = (d) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

// ---------- الـ sheet ----------
let open = false;
let onClose = null;
let opener = null;

/** بيفتح sheet، أو بيبدّل محتواها لو مفتوحة (من غير خطوة زيادة في زرار الرجوع). */
export function openSheet({ head, body, foot, label, onClose: cb }) {
  const ov = $('#ov');
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">
    <div class="sh-top"><div class="handle"></div>
      <div class="sh-h"><div class="tt">${head}</div><button class="xbtn" type="button" data-close aria-label="اقفل">${ic(P.close)}</button></div></div>
    <div class="sh-body">${body}</div>
    ${foot ? `<div class="sh-foot">${foot}</div>` : ''}</div>`;
  if (!open) {
    opener = document.activeElement;
    history.pushState({ sheet: 1 }, '');
    ov.hidden = false;
    document.documentElement.classList.add('locked');
    open = true;
  } else {
    ov.querySelector('.sheet').style.animation = 'none';
  }
  onClose = cb || null;
  ov.querySelector('.sheet').focus({ preventScroll: true });
}

/** القفل من جوه التطبيق بيرجع خطوة في التاريخ، فزرار الرجوع في الموبايل والـ × بيعملوا نفس الحاجة. */
export function requestClose() {
  if (!open) return;
  if (history.state?.sheet) history.back();
  else closeSheet();
}

export function closeSheet() {
  if (!open) return;
  open = false;
  const ov = $('#ov');
  ov.hidden = true;
  ov.innerHTML = '';
  document.documentElement.classList.remove('locked');
  const cb = onClose;
  onClose = null;
  if (cb) cb();
  if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  opener = null;
}

export const isSheetOpen = () => open;
export const sheetEl = () => (open ? $('#ov .sheet') : null);

window.addEventListener('popstate', () => { if (open) closeSheet(); });

// ---------- toast ----------
let toastTimer = null;
/** رسالة فوق. النجاح: ✓ وحدود نعناعي. الغلط (err): مثلث وحدود كهرماني، عشان الغلط مايبانش زي النجاح. */
export function toast(msg, action, fn, { err = false } = {}) {
  const t = $('#toast');
  t.classList.toggle('err', err);
  t.innerHTML = `<span class="tm">${ic(err ? P.alert : P.check)}<span>${esc(msg)}</span></span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  t.hidden = false;
  const hide = () => { t.hidden = true; };
  if (action) t.querySelector('button').onclick = () => { hide(); fn?.(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, action ? 4500 : err ? 3000 : 1800);
}
/** رسالة غلط: بتقول إيه اللي مااتعملش وتعمل إيه. */
export const toastErr = (msg) => toast(msg, null, null, { err: true });

// ---------- مزامنة الخانات مع بيانات اليوم ----------
const showNum = (v) => arDigits(String(v)).replace('.', '٫');

/** بيكتب قيم اليوم في الخانات والأزرار اللي جوه root. الخانة اللي إنت بتكتب فيها مبتتلمسش. */
export function syncFields(root, day) {
  if (!root) return;
  const active = document.activeElement;
  for (const el of $$('[data-k]', root)) {
    if (el === active) continue;
    const v = day[el.dataset.k];
    const t = el.dataset.type;
    el.value = v == null ? '' : t === 'num' || t === 'hrs' || t === 'dig' ? showNum(v) : String(v);
  }
  // خانات المقاييس: القيمة في day.m[id]
  for (const el of $$('[data-m]', root)) {
    if (el === active) continue;
    const v = day.m?.[el.dataset.m];
    el.value = v == null ? '' : el.dataset.type === 'num' ? showNum(v) : String(v);
  }
  for (const g of $$('[data-rate]', root)) {
    const v = day[g.dataset.rate] || 0;
    for (const b of $$('button', g)) {
      const on = +b.dataset.v <= v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    }
  }
  for (const b of $$('[data-tri]', root)) {
    const v = day[b.dataset.tri] || 0;
    b.classList.toggle('v1', v === 1);
    b.classList.toggle('v2', v === 2);
    b.setAttribute('aria-label', `${b.dataset.label}: ${['لا', 'جزئي', 'تم'][v]}`);
  }
  for (const g of $$('[data-seg]', root)) {
    for (const b of $$('button', g)) {
      const on = day[g.dataset.seg] === b.dataset.v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    }
  }
}
