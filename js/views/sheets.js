// views/sheets.js — الشاشات اللي بتطلع من تحت، وأسئلة "سؤال بسؤال".
// كل خانة عليها data-k باسم المفتاح في البيانات، و main.js بيحفظها وإنت بتكتب.

import {
  PERIODS, EXP_CATS, STAR_ITEMS, periodIndex, fmtNum, sleepMinutes, fmtHM, fmt12, expTotal,
  suggestTimes, lastWith, readDuration, recentValues, mins, has,
} from '../logic.js';
import { esc, ic, P } from '../ui.js';
import { HINTS, habitsGrid, salahRow } from './today.js';

// ui.hist = أيام قبل اليوم المفتوح [{ key, data }] (من main.js)، ومنها الاقتراحات: الأوقات، و"زي امبارح"، والمشاريع، واللي اتأجل.

// ---------- قطع صغيرة ----------
// ekh = زرار Enter في كيبورد الموبايل: next (الخانة اللي بعدها) أو done (آخر خانة). focus = تاخد التركيز أول ما الـ sheet تفتح لو فاضية
function input(k, { label, type = 'text', dt = 'txt', im = '', ph = '', cls = '', ekh = 'next', focus = false } = {}) {
  const field = `<input class="fld" data-k="${k}" data-type="${dt}" type="${type}"${im ? ` inputmode="${im}"` : ''}${ph ? ` placeholder="${ph}"` : ''} enterkeyhint="${ekh}"${focus ? ' data-focus' : ''} autocomplete="off"${label ? '' : ` aria-label="${ph}"`}>`;
  return label ? `<label class="f ${cls}"><span class="lbl">${label}</span>${field}</label>` : field;
}
const time = (k, label) => input(k, { label, type: 'time', dt: 'time' });
const num = (k, label, ph = '') => input(k, { label, dt: 'num', im: 'decimal', ph });
function hours(k, label = 'ساعات', ekh = 'done') {
  return `<label class="hrs"><input class="fld" data-k="${k}" data-type="hrs" inputmode="decimal" enterkeyhint="${ekh}" autocomplete="off" aria-label="${label}"><span>ساعة</span></label>`;
}
/** chips الأوقات (٥ حوالين وسيطك) وجنبها "وقت تاني" (الـ picker للاستثناء بس). القيمة HH:MM زي input type=time. */
function timeChips(k, label, ui, s, fallback) {
  const ts = suggestTimes(ui.hist, k, s.cur, fallback);
  // لو القيمة المتسجلة مش من الـ chips، بتبان chip زيادة عشان تعرف إيه المختار
  const cur = s.day[k];
  const list = has(cur) && !ts.includes(cur) ? [...ts, cur] : ts;
  return `<div><span class="lbl">${label}</span><div class="chs">${list.map((t) => chip(k, t, fmt12(t))).join('')}</div>
    <label class="f other"><span class="lbl">وقت تاني</span><input class="fld" data-k="${k}" data-type="time" type="time" aria-label="${label}: وقت تاني"></label></div>`;
}
export function rate(k, { big = false, label = '' } = {}) {
  return `<div class="rate${big ? ' big' : ''}" data-rate="${k}" role="group"${label ? ` aria-label="${label}"` : ''}>${[1, 2, 3, 4, 5]
    .map((i) => `<button type="button" data-v="${i}" aria-label="${i} من ٥">${fmtNum(i)}</button>`).join('')}</div>`;
}
/** chip بقيمة جاهزة: دوسة بتحفظ القيمة في المفتاح، ونفس الـ chip تاني بيمسحها (main.js: data-set). */
export function chip(k, v, label = v) {
  return `<button class="ch" type="button" data-set="${k}" data-v="${v}" aria-pressed="false">${label}</button>`;
}
function seg(k, opts) {
  return `<div class="seg2" data-seg="${k}" role="group">${opts.map(([v, l]) => `<button class="so" type="button" data-v="${v}">${l}</button>`).join('')}</div>`;
}
const head = (title) => `<h2>${title}</h2>`;
const done = '<button class="b-pri" type="button" data-close>تمام</button>';

// ---------- الشاشات ----------
/** النوم: "زي امبارح" بدوسة بتملا الوقتين، وchips لكل وقت، و"وقت تاني". كل دوسة بتتحفظ. */
function sleepBody(s, ui) {
  const y = lastWith(ui.hist, s.cur, ['sleep', 'wake']);
  const same = y ? `<button class="ch wide" type="button" data-act="likey" data-keys="sleep,wake" data-vals="${y.sleep},${y.wake}">
      <span>زي امبارح: <b>${fmt12(y.sleep)} ← ${fmt12(y.wake)}</b></span><small>دوسة تملا الاتنين</small></button>` : '';
  return `${same}
    ${timeChips('sleep', 'نمت', ui, s, '00:00')}
    ${timeChips('wake', 'صحيت', ui, s, '06:30')}
    <p class="note" data-out="sleepdur"></p>`;
}

/** الشاشة: "زي امبارح"، وخانة بكيبورد أرقام بتفهم "٤٢٠" = ٤:٢٠ (وبتكتب التفسير تحتها)، وآخر استخدام. */
function screenBody(s, ui) {
  const y = lastWith(ui.hist, s.cur, ['screen']);
  const v = y ? readDuration(y.screen) || y.screen : '';
  return `${v ? `<div class="chs">${chip('screen', v, `زي امبارح ${fmtHM(mins(v))}`)}</div>` : ''}
    ${input('screen', { label: 'Screen time (ساعات ودقايق)', dt: 'dur', im: 'numeric', ph: 'مثلاً ٤٢٠ = ٤ ساعات و٢٠ دقيقة', ekh: 'done' })}
    <p class="note" data-out="durnote" aria-live="polite"></p>
    ${timeChips('lastuse', 'آخر استخدام للموبايل', ui, s, '23:30')}`;
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

/**
 * فترة واحدة (الدوس على سطرها في الصفحة): عملت إيه، والطاقة، والساعات chips (١–٦) أو رقم تاني.
 * المفاتيح نفسها (p1t و p1e و p1h). والساعة من الـ chip بتتحفظ كلام زي "3"، زي اللي بيتكتب في الخانة.
 */
function periodBody(i) {
  const [k, label, range] = PERIODS[i];
  return `<p class="note" style="margin:0">${range}</p>
    ${input(`${k}t`, { label: 'عملت إيه؟', ph: 'مثلاً: شغل على الموقع', focus: true, ekh: 'done' })}
    <div><span class="lbl">طاقتك</span>${rate(`${k}e`, { label: `طاقة ${label}` })}<div class="ends"><span>واطية</span><span>عالية</span></div></div>
    <div><span class="lbl">كام ساعة؟</span><div class="chs">${['1', '2', '3', '4', '5', '6'].map((h) => chip(`${k}h`, h, fmtNum(h))).join('')}</div>
      <label class="f" style="margin-top:8px"><span class="lbl">أو رقم تاني (زي ١٫٥)</span>${hours(`${k}h`)}</label></div>
    <button class="lnk2" type="button" data-act="sheet" data-sheet="energy">كل الفترات، واللي رفع ووطّى طاقتك</button>`;
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

/**
 * الشغل: لكل مشروع chips بآخر مشاريعك (دوسة بدل ما تكتب الاسم كل يوم) + chips الساعات ١–٦ أو رقم تاني + الناتج.
 * سطر واحد باين، و"+ مشروع تاني" بيزوّد لحد ٤. والسطور اللي فيها حاجة بتبان على طول.
 */
function workRow(i, s, recent) {
  return `<div class="per">
      <div class="wph"><b>مشروع ${fmtNum(i)}</b></div>
      ${recent.length ? `<div class="chs">${recent.map((p) => chip(`w${i}p`, p, esc(p))).join('')}</div>` : ''}
      ${input(`w${i}p`, { ph: recent.length ? 'أو اكتب اسم تاني' : 'اسم المشروع' })}
      <div><span class="lbl">كام ساعة؟</span><div class="chs">${['1', '2', '3', '4', '5', '6'].map((h) => chip(`w${i}h`, h, fmtNum(h))).join('')}</div></div>
      <div class="wrow">${input(`w${i}o`, { ph: 'الناتج الملموس (لو حابب)', ekh: 'done' })}${hours(`w${i}h`)}</div></div>`;
}
function workBody(s, ui, { guide = false } = {}) {
  const recent = recentValues(ui.hist, ['w1p', 'w2p', 'w3p', 'w4p'], s.cur, 3);
  const used = [1, 2, 3, 4].filter((i) => has(s.day[`w${i}p`]) || has(s.day[`w${i}h`]) || has(s.day[`w${i}o`]));
  const rows = Math.min(4, Math.max(1, used.length ? Math.max(...used) : 0, ui.workRows || 1));
  return `${[1, 2, 3, 4].slice(0, rows).map((i) => workRow(i, s, recent)).join('')}
    ${rows < 4 ? `<button class="lnk2" type="button" data-act="workmore"${guide ? ' data-guide' : ''}>+ مشروع تاني</button>` : ''}
    ${guide ? '' : `<div class="per"><label class="f"><span class="lbl">تركيز عميق متواصل</span>${hours('deep', 'تركيز عميق')}</label></div>`}`;
}

/** أجّلت إيه الأول (هو البند ★)، وchips بآخر حاجات اتأجلت و"ولا حاجة". وبعدها وليه، وبعدها القرار. */
function postBody(s, ui) {
  const recent = recentValues(ui.hist, 'post', s.cur, 3, ['ولا حاجة']);
  return `<div><span class="lbl">أجّلت إيه؟</span><div class="chs">${chip('post', 'ولا حاجة')}${recent.map((p) => chip('post', p, esc(p))).join('')}</div></div>
    ${input('post', { ph: 'أو اكتب حاجة تانية', label: '' })}
    ${input('postw', { label: 'وليه؟' })}
    ${input('dec', { label: 'قرار خدته النهارده', ekh: 'done' })}
    <div><span class="lbl">أخدت القرار إزاي؟</span>
      ${seg('decs', [['fast', 'بسرعة'], ['slow', 'بعد تفكير']])}
      <div style="height:8px"></div>
      ${seg('deci', [['full', 'معلومات كاملة'], ['part', 'ناقصة']])}</div>`;
}

const topBody = () => '<textarea class="fld" data-k="top" data-focus rows="5" enterkeyhint="done" placeholder="جملة أو اتنين…" aria-label="أهم حاجة حصلت"></textarea>';

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
  sleep: { title: 'النوم', body: sleepBody },
  screen: { title: 'الشاشة', body: screenBody },
  energy: { title: 'الطاقة والمزاج', body: energyBody },
  habits: { title: 'أرقام العادات', body: habitsBody },
  work: { title: 'الشغل', body: (s, ui) => workBody(s, ui) },
  post: { title: 'قرار وتأجيل', body: postBody },
  top: { title: 'أهم حاجة حصلت', body: topBody },
};

export function sheetFor(id, s, ui) {
  const p = /^p([1-4])$/.exec(id); // فترة واحدة: p1 لـ p4
  if (p) {
    const title = PERIODS[+p[1] - 1][1];
    return { label: title, head: head(title), body: periodBody(+p[1] - 1), foot: done };
  }
  const sh = SHEETS[id];
  return { label: sh.title, head: head(sh.title), body: sh.body(s, ui), foot: done };
}

// ---------- سؤال بسؤال ----------
// نفس الـ sheets بالظبط، عشان الإدخال يبقى بطريقة واحدة في التطبيق كله
const GUIDE_BODY = {
  sleep: sleepBody,
  screen: screenBody,
  mood: () => `${rate('mood', { big: true, label: 'المزاج' })}<div class="ends"><span>وحش خالص</span><span>عالي</span></div>`,
  habits: (s) => `<div class="panel" style="padding:8px">${habitsGrid(s.day, false)}${salahRow()}</div>`,
  work: (s, ui) => workBody(s, ui, { guide: true }),
  money: (s, ui) => moneyBody(ui),
  post: postBody,
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
  // تفسير خانة الشاشة وإنت بتكتب: "٤٢٠" ← "= ٤ ساعات و٢٠ دقيقة"
  const dn = root.querySelector('[data-out="durnote"]');
  if (dn) {
    const raw = root.querySelector('[data-k="screen"]')?.value || '';
    const v = readDuration(raw);
    const m = mins(v);
    dn.classList.toggle('err', !!raw.trim() && !v);
    if (!raw.trim()) dn.textContent = 'اكتب الأرقام بس: ٤٢٠ = ٤ ساعات و٢٠ دقيقة، و٤٥ = ٤٥ دقيقة';
    else if (!v) dn.textContent = 'مش مفهوم. اكتبها زي ٤٢٠ أو ٤:٢٠';
    else dn.innerHTML = `= <b>${fmtNum(Math.floor(m / 60))}</b> ساعات و<b>${fmtNum(m % 60)}</b> دقيقة`;
  }
}
