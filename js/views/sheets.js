// views/sheets.js — الشاشات اللي بتطلع من تحت، وأسئلة "سؤال بسؤال".
// كل خانة عليها data-k باسم المفتاح في البيانات، و main.js بيحفظها وإنت بتكتب.

import { PERIODS, EXP_CATS, STAR_ITEMS, periodIndex, fmtNum, sleepMinutes, fmtHM, expTotal } from '../logic.js';
import { esc, ic, P } from '../ui.js';
import { HINTS, habitsGrid, salahRow } from './today.js';

// ---------- قطع صغيرة ----------
function input(k, { label, type = 'text', dt = 'txt', im = '', ph = '', cls = '' } = {}) {
  const field = `<input class="fld" data-k="${k}" data-type="${dt}" type="${type}"${im ? ` inputmode="${im}"` : ''}${ph ? ` placeholder="${ph}"` : ''} autocomplete="off"${label ? '' : ` aria-label="${ph}"`}>`;
  return label ? `<label class="f ${cls}"><span class="lbl">${label}</span>${field}</label>` : field;
}
const time = (k, label) => input(k, { label, type: 'time', dt: 'time' });
const num = (k, label, ph = '') => input(k, { label, dt: 'num', im: 'decimal', ph });
function hours(k, label = 'ساعات') {
  return `<label class="hrs"><input class="fld" data-k="${k}" data-type="hrs" inputmode="decimal" autocomplete="off" aria-label="${label}"><span>ساعة</span></label>`;
}
export function rate(k, { big = false, label = '' } = {}) {
  return `<div class="rate${big ? ' big' : ''}" data-rate="${k}" role="group"${label ? ` aria-label="${label}"` : ''}>${[1, 2, 3, 4, 5]
    .map((i) => `<button type="button" data-v="${i}" aria-label="${i} من ٥">${fmtNum(i)}</button>`).join('')}</div>`;
}
function seg(k, opts) {
  return `<div class="seg2" data-seg="${k}" role="group">${opts.map(([v, l]) => `<button class="so" type="button" data-v="${v}">${l}</button>`).join('')}</div>`;
}
const head = (title) => `<h2>${title}</h2>`;
const done = '<button class="b-pri" type="button" data-close>تمام</button>';

// ---------- الشاشات ----------
function sleepBody() {
  return `<div class="g2">${time('sleep', 'نمت')}${time('wake', 'صحيت')}</div>
    <p class="note" data-out="sleepdur"></p>
    <div class="g2">${input('screen', { label: 'Screen time', dt: 'dig', ph: 'مثلاً ٥:٣٠' })}${time('lastuse', 'آخر استخدام للموبايل')}</div>`;
}

function energyBody(s) {
  const nowP = s.cur === s.today ? periodIndex(new Date().getHours()) : -1;
  return `<div><span class="lbl">مزاجك النهارده من ٥</span>${rate('mood', { label: 'المزاج' })}</div>
    ${PERIODS.map(([k, l, range], i) => `<div class="per">
      <div class="per-h"><b>${l}</b><small>${range}</small>${i === nowP ? '<span class="now">دلوقتي</span>' : ''}</div>
      ${input(`${k}t`, { ph: 'عملت إيه؟' })}
      <div class="r2">${hours(`${k}h`)}${rate(`${k}e`, { label: `طاقة ${l}` })}</div>
    </div>`).join('')}
    <div class="per"><div class="g2">${input('up', { label: 'رفع طاقتي' })}${input('down', { label: 'وطّى طاقتي' })}</div>
    ${num('unpl', 'مهام طلعت من غير تخطيط (عدد)')}</div>`;
}

function habitsBody() {
  return `<div class="g2">
      ${num('wirdp', 'الورد (صفحات)')}${num('exm', 'تمرين (دقيقة)')}
      ${num('engm', 'إنجليزي (دقيقة)')}${num('readp', 'قراءة (صفحات)')}
      ${num('techm', 'تعلم تقني (دقيقة)')}${num('caf', 'قهوة/شاي (كوباية)')}
      ${time('cafl', 'آخر كوباية')}${num('relm', 'وقت بدون موبايل (دقيقة)')}
    </div>
    ${input('relw', { label: 'الوقت ده كان مع مين' })}
    ${input('tens', { label: 'توتر النهارده' })}
    <button class="tri" type="button" data-tri="tired" data-label="إرهاق غير معتاد"><i></i><span>إرهاق غير معتاد</span><small>دوس تاني للجزئي</small></button>
    ${input('learnt', { label: 'اتعلمت النهارده' })}`;
}

function workBody(rows = 4) {
  return `${[1, 2, 3, 4].slice(0, rows).map((i) => `<div class="per">
      <div class="wrow">${input(`w${i}p`, { ph: 'المشروع' })}${hours(`w${i}h`)}</div>
      ${input(`w${i}o`, { ph: 'الناتج الملموس' })}</div>`).join('')}
    ${rows === 4 ? `<div class="per"><label class="f"><span class="lbl">تركيز عميق متواصل</span>${hours('deep', 'تركيز عميق')}</label></div>` : ''}`;
}

function postBody() {
  return `${input('dec', { label: 'قرار خدته النهارده' })}
    <div><span class="lbl">أخدت القرار إزاي؟</span>
      ${seg('decs', [['fast', 'بسرعة'], ['slow', 'بعد تفكير']])}
      <div style="height:8px"></div>
      ${seg('deci', [['full', 'معلومات كاملة'], ['part', 'ناقصة']])}</div>
    ${input('post', { label: 'أجّلت إيه؟' })}
    ${input('postw', { label: 'وليه؟' })}`;
}

const topBody = () => '<textarea class="fld" data-k="top" rows="5" placeholder="جملة أو اتنين…" aria-label="أهم حاجة حصلت"></textarea>';

// ---------- الفلوس (سؤال الفلوس في "سؤال بسؤال"، وقايمة تبويبة الفلوس) ----------
export function expListHtml(day, { total = true } = {}) {
  const ex = day.exp || [];
  if (!ex.length) return '<p class="note" style="margin:0">لسه مفيش مصاريف في اليوم ده.</p>';
  return `<div class="explist">${ex.map((e, i) => `<div class="ex"><span class="a">${fmtNum(e.a)} ج</span><span class="w">${esc(e.w) || '—'}</span><span class="c">${esc(e.c)}</span>
    <button class="del" type="button" data-act="delexp" data-i="${i}" aria-label="امسح ${fmtNum(e.a)} جنيه">${ic(P.close)}</button></div>`).join('')}</div>
    ${total ? `<p class="note" style="margin:0">الإجمالي: <b>${fmtNum(expTotal(day))} ج</b></p>` : ''}`;
}
function moneyBody(ui) {
  return `<div class="cats" role="group" aria-label="التصنيف">${EXP_CATS.map((c) => `<button class="cat${ui.cat === c ? ' on' : ''}" type="button" data-act="cat" data-c="${c}" aria-pressed="${ui.cat === c}">${c}</button>`).join('')}</div>
    <form class="addrow" data-act="addexp">
      <input class="fld" data-role="expin" placeholder="مثلاً: ٧٥ غدا، أو أوبر ٣٠ ج" aria-label="المبلغ وعلى إيه" autocomplete="off" enterkeyhint="done">
      <button class="addbtn" type="submit" aria-label="سجّل المصروف">${ic(P.plus)}</button>
    </form>
    <p class="parse" data-out="parse" aria-live="polite"></p>
    <div data-out="explist"></div>
    ${num('income', 'دخل اليوم (جنيه)')}`;
}

// ---------- كل شاشة ----------
const SHEETS = {
  sleep: { title: 'النوم والشاشة', body: sleepBody },
  energy: { title: 'الطاقة والمزاج', body: energyBody },
  habits: { title: 'أرقام العادات', body: habitsBody },
  work: { title: 'الشغل', body: () => workBody(4) },
  post: { title: 'قرار وتأجيل', body: postBody },
  top: { title: 'أهم حاجة حصلت', body: topBody },
};

export function sheetFor(id, s, ui) {
  const sh = SHEETS[id];
  return { label: sh.title, head: head(sh.title), body: sh.body(s, ui), foot: done };
}

// ---------- سؤال بسؤال ----------
const GUIDE_BODY = {
  sleep: () => `<div class="g2">${time('sleep', 'نمت')}${time('wake', 'صحيت')}</div><p class="note" data-out="sleepdur"></p>`,
  screen: () => `${input('screen', { label: 'Screen time', dt: 'dig', ph: 'مثلاً ٥:٣٠' })}${time('lastuse', 'آخر استخدام للموبايل')}`,
  mood: () => `${rate('mood', { big: true, label: 'المزاج' })}<div class="ends"><span>وحش خالص</span><span>عالي</span></div>`,
  habits: (s) => `<div class="panel" style="padding:8px">${habitsGrid(s.day, false)}${salahRow()}</div>`,
  work: () => `${workBody(2)}<p class="note" style="margin:0">لو اشتغلت على أكتر من مشروعين، كمّل من سطر الشغل.</p>`,
  money: (s, ui) => moneyBody(ui),
  post: () => `${input('post', { label: 'أجّلت إيه؟' })}${input('postw', { label: 'وليه اتأجل؟' })}${input('dec', { label: 'قرار خدته النهارده' })}
    <div><span class="lbl">أخدت القرار إزاي؟</span>${seg('decs', [['fast', 'بسرعة'], ['slow', 'بعد تفكير']])}<div style="height:8px"></div>${seg('deci', [['full', 'معلومات كاملة'], ['part', 'ناقصة']])}</div>`,
  top: () => topBody(),
};

export function guideStep(key, i, n, s, ui) {
  const item = STAR_ITEMS.find((x) => x.k === key);
  const last = i === n - 1;
  return {
    label: `سؤال ${i + 1} من ${n}`,
    head: `<span class="step">سؤال ${fmtNum(i + 1)} من ${fmtNum(n)}: ${item.t}</span>`,
    body: `<p class="gq">${item.q}</p><p class="gsub">${HINTS[key]}</p>${GUIDE_BODY[key](s, ui)}`,
    foot: last
      ? '<button class="b-pri" type="button" data-close>خلصت</button>'
      : `<div class="foot2"><button class="b-sec" type="button" data-close>تمام</button><button class="b-pri" type="button" data-act="gnext">احفظ والسؤال الجاي${ic(P.chev)}</button></div>`,
  };
}

/** نتايج بتتحسب وإنت بتكتب (مدة النوم، وقايمة المصاريف). */
export function updateOutputs(root, s) {
  if (!root) return;
  const dur = root.querySelector('[data-out="sleepdur"]');
  if (dur) {
    const m = sleepMinutes(s.day.sleep, s.day.wake);
    dur.innerHTML = m == null ? 'اكتب الوقتين والمدة هتتحسب لوحدها.' : `مدة النوم: <b>${fmtHM(m)}</b>`;
  }
  const list = root.querySelector('[data-out="explist"]');
  if (list) list.innerHTML = expListHtml(s.day);
}
