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
  // أركان الحياة ومجالات الوقت
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  brief: 'M4 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01',
  wallet: 'M3 7a2 2 0 0 1 2-2h14v14H5a2 2 0 0 1-2-2V7zm16 4h-4a2 2 0 0 0 0 4h4',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5z',
  star: 'M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.3 6.7 19.1l1-5.8-4.2-4.1 5.9-.9z',
  home: 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  move: 'M5 17h14M7 17l1.5-6h7L17 17M6 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm12 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  rest: 'M5 8h11v6a5 5 0 0 1-10 0V8zM16 9h2a2 2 0 0 1 0 4h-2M5 19h13',
  edit: 'M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z',
  eraser: 'M19 6L9 16l-4-4L15 2zM4 20h16',
  arrowUpLeft: 'M17 17L7 7M7 17V7h10',
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

/**
 * أيقونات فخمة بطبقتين (Duotone Precision SVG): طبقة خلفية خفيفة (fill-opacity .16) + خط هندسي دقيق ١٫٦٥px.
 */
const ICO = {
  // هلال هادي + نجمة رباعية دقيقة
  moon: '<path class="du" d="M20.2 14.2A8.2 8.2 0 0 1 9.8 3.8a8.2 8.2 0 1 0 10.4 10.4z"/><path d="M20.2 14.2A8.2 8.2 0 0 1 9.8 3.8a8.2 8.2 0 1 0 10.4 10.4z"/><path d="M17.5 4.2v3M16 5.7h3" stroke-width="1.5"/>',
  // شنطة شغل بغطاء وقفل مركزي دقيق
  brief: '<rect class="du" x="3" y="7.5" width="18" height="12.5" rx="3"/><rect x="3" y="7.5" width="18" height="12.5" rx="3"/><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7M3 12.2c5.5 1.7 12.5 1.7 18 0"/><path d="M11 12.2h2v1.6h-2z" fill="currentColor" stroke="none"/>',
  // موبايل عصري بدون حواف مع شاشة خفيفة
  phone: '<rect class="du" x="6.5" y="2.5" width="11" height="19" rx="3"/><rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.2 5.4h3.6M10.5 18.6h3" stroke-width="1.6"/>',
  // محفظة أنيقة بقفل جانبي ونقطة معدن
  wallet: '<path class="du" d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12.5a2 2 0 0 1 2 2v10a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17V7.5z"/><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12.5a2 2 0 0 1 2 2v10a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17V7.5z"/><path d="M20.5 10.2h-4a2 2 0 0 0 0 4h4"/><circle cx="16.6" cy="12.2" r="0.9" fill="currentColor" stroke="none"/>',
  // نجمة ثمانية هندسية إسلامية (ربع الحزب) للدين والروح
  star: '<rect class="du" x="5.6" y="5.6" width="12.8" height="12.8" rx="1.8"/><rect class="du" x="5.6" y="5.6" width="12.8" height="12.8" rx="1.8" transform="rotate(45 12 12)"/><rect x="5.6" y="5.6" width="12.8" height="12.8" rx="1.8"/><rect x="5.6" y="5.6" width="12.8" height="12.8" rx="1.8" transform="rotate(45 12 12)"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  // قلب ناعم بلمعة داخلية للصحة والجسم
  heart: '<path class="du" d="M12 20.2s-7.5-4.7-7.5-10.3A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10.3-7.5 10.3z"/><path d="M12 20.2s-7.5-4.7-7.5-10.3A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10.3-7.5 10.3z"/><path d="M8.5 10.3c0-1 .7-1.9 1.7-2.1" stroke-width="1.4" opacity=".7"/>',
  // كتاب مفتوح بصفحات منحنية للتعلم والتطوير
  book: '<path class="du" d="M12 6.5c-2.2-1.7-5.5-2-8.5-1.5v13c3-.5 6.3-.2 8.5 1.5 2.2-1.7 5.5-2 8.5-1.5V5c-3-.5-6.3-.2-8.5 1.5z"/><path d="M12 6.5c-2.2-1.7-5.5-2-8.5-1.5v13c3-.5 6.3-.2 8.5 1.5m0-13c2.2-1.7 5.5-2 8.5-1.5v13c-3-.5-6.3-.2-8.5 1.5m0-13v13"/>',
  // بيت معماري بقوس داخلي للعلاقات والحياة
  home: '<path class="du" d="M4 10.8L12 4l8 6.8V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8.2z"/><path d="M3.5 11.2L12 4l8.5 7.2M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9"/><path d="M9.5 21v-5a2.5 2.5 0 0 1 5 0v5"/>',
  // سيارة انسيابية للمواصلات
  move: '<path class="du" d="M5.5 12.2l1.6-4.4A2 2 0 0 1 9 6.5h6a2 2 0 0 1 1.9 1.3l1.6 4.4v4.3a1.5 1.5 0 0 1-1.5 1.5h-10a1.5 1.5 0 0 1-1.5-1.5v-4.3z"/><path d="M4.5 12.5h15M5.5 12.2l1.6-4.4A2 2 0 0 1 9 6.5h6a2 2 0 0 1 1.9 1.3l1.6 4.4v4.3a1.5 1.5 0 0 1-1.5 1.5h-10a1.5 1.5 0 0 1-1.5-1.5v-4.3z"/><circle cx="8" cy="15.2" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="15.2" r="1" fill="currentColor" stroke="none"/>',
  // كوب دافئ ببخار هادي للراحة
  rest: '<path class="du" d="M4.5 9.5h11v5.8a4.7 4.7 0 0 1-4.7 4.7H9.2a4.7 4.7 0 0 1-4.7-4.7V9.5z"/><path d="M4.5 9.5h11v5.8a4.7 4.7 0 0 1-4.7 4.7H9.2a4.7 4.7 0 0 1-4.7-4.7V9.5zM15.5 11h1.7a2.3 2.3 0 0 1 0 4.6h-1.7M8 6.2c0-.9.8-1.3.8-2.2M12 6.2c0-.9.8-1.3.8-2.2"/>',
  // ختم تمام دائري للعادات
  check: '<circle class="du" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M8.5 12.3l2.4 2.4 4.8-5.1" stroke-width="1.9"/>',
  // شمس دقيقة لتاب اليوم
  sun: '<circle class="du" cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 2.8v2M12 19.2v2M4.8 4.8l1.4 1.4M17.8 17.8l1.4 1.4M2.8 12h2M19.2 12h2M4.8 19.2l1.4-1.4M17.8 6.2l1.4-1.4"/>',
  // ساعة فخمة بعقارب دقيقة لتاب الوقت
  clock: '<circle class="du" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.4 2" stroke-width="1.8"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  // قائمة مهام بمربع منعم لتاب المهام
  tasks: '<rect class="du" x="4" y="4" width="16" height="16" rx="4.5"/><rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M8.6 12.2l2.3 2.3 4.6-4.8" stroke-width="1.9"/>',
  // لمبة إلهام أنيقة لتاب الأفكار
  ideas: '<path class="du" d="M12 3.2a6 6 0 0 0-3.8 10.6c.7.6 1.1 1.4 1.2 2.2h5.2c.1-.8.5-1.6 1.2-2.2A6 6 0 0 0 12 3.2z"/><path d="M12 3.2a6 6 0 0 0-3.8 10.6c.7.6 1.1 1.4 1.2 2.2h5.2c.1-.8.5-1.6 1.2-2.2A6 6 0 0 0 12 3.2zM9.8 19h4.4M10.6 21.3h2.8"/>',
  // هدف دقيق بحلقات متحدة المركز لتاب الخطة والأهداف
  target: '<circle class="du" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  // كأس هادي لأرشيف الإنجازات
  trophy: '<path class="du" d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4.5a2 2 0 0 0 0 4H7m10-4h2.5a2 2 0 0 1 0 4H17M12 14v5M8.5 19h7"/>',
};
export const ico = (name, cls = '') => (ICO[name]
  ? `<svg class="ico${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICO[name]}</svg>`
  : ic(P[name] || ''));

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
    el.value = v == null ? '' : t === 'num' || t === 'hrs' || t === 'dig' || t === 'dur' ? showNum(v) : String(v);
  }
  // خانات المقاييس: القيمة في day.m[id]
  for (const el of $$('[data-m]', root)) {
    if (el === active) continue;
    const v = day.m?.[el.dataset.m];
    el.value = v == null ? '' : el.dataset.type === 'num' ? showNum(v) : String(v);
  }
  // التقييم (المزاج والطاقة): المختار رقم واحد بس. والعدد من ٥ (الصلوات، data-kind="count"): مليان لحد الرقم
  for (const g of $$('[data-rate]', root)) {
    const v = +day[g.dataset.rate] || 0;
    const count = g.dataset.kind === 'count';
    for (const b of $$('button', g)) {
      const on = count ? +b.dataset.v <= v : +b.dataset.v === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    }
  }
  // chips بقيمة جاهزة (data-set = المفتاح، data-v = القيمة): المختار هو اللي قيمته زي اللي في اليوم
  for (const b of $$('[data-set]', root)) {
    const on = String(day[b.dataset.set] ?? '') === b.dataset.v;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
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
