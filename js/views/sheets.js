// views/sheets.js — الشاشات اللي بتطلع من تحت، وأسئلة "سؤال بسؤال"، وشاشات التعديل (مصروف، مهمة، فكرة).

import {
  SLEEP_QUAL, NAP_OPTS, MOOD_TAGS, STRESS_OPTS, POST_REASONS, TASK_CATS,
  STAR_ITEMS, periodsFor, activeHabitGroups, timeByCat, incomeTotal,
  fmtNum, sleepMinutes, fmtHM, fmt12, expTotal, fmtHours, addDays,
  suggestTimes, lastWith, readDuration, recentValues, mins, has,
} from '../logic.js';
import { esc, ic, P } from '../ui.js';
import { HINTS, habitsGrid, salahRow } from './today.js';

// ---------- قطع صغيرة ----------
function input(k, { label, type = 'text', dt = 'txt', im = '', ph = '', cls = '', ekh = 'next', focus = false } = {}) {
  const field = `<input class="fld" data-k="${k}" data-type="${dt}" type="${type}"${im ? ` inputmode="${im}"` : ''}${ph ? ` placeholder="${ph}"` : ''} enterkeyhint="${ekh}"${focus ? ' data-focus' : ''} autocomplete="off"${label ? '' : ` aria-label="${ph}"`}>`;
  return label ? `<label class="f ${cls}"><span class="lbl">${label}</span>${field}</label>` : field;
}
const num = (k, label, ph = '') => input(k, { label, dt: 'num', im: 'decimal', ph });
function hours(k, label = 'ساعات', ekh = 'done') {
  return `<label class="hrs"><input class="fld" data-k="${k}" data-type="hrs" inputmode="decimal" enterkeyhint="${ekh}" autocomplete="off" aria-label="${label}"><span>ساعة</span></label>`;
}
function timeChips(k, label, ui, s, fallback) {
  const ts = suggestTimes(ui.hist, k, s.cur, fallback);
  const cur = s.day[k];
  const list = has(cur) && !ts.includes(cur) ? [...ts, cur] : ts;
  return `<div><span class="lbl">${label}</span><div class="chs">${list.map((t) => chip(k, t, fmt12(t))).join('')}</div>
    <label class="f other"><span class="lbl">وقت تاني</span><input class="fld" data-k="${k}" data-type="time" type="time" aria-label="${label}: وقت تاني"></label></div>`;
}
export function rate(k, { big = false, label = '' } = {}) {
  return `<div class="rate${big ? ' big' : ''}" data-rate="${k}" role="group"${label ? ` aria-label="${label}"` : ''}>${[1, 2, 3, 4, 5]
    .map((i) => `<button type="button" data-v="${i}" aria-label="${i} من ٥">${fmtNum(i)}</button>`).join('')}</div>`;
}
export function chip(k, v, label = v, aria = '') {
  return `<button class="ch" type="button" data-set="${k}" data-v="${esc(v)}" aria-pressed="false"${aria ? ` aria-label="${esc(aria)}"` : ''}>${label}</button>`;
}
function seg(k, opts, cols = 2) {
  return `<div class="seg${cols}" data-seg="${k}" role="group">${opts.map(([v, l]) => `<button class="so" type="button" data-v="${esc(v)}">${l}</button>`).join('')}</div>`;
}
const head = (title) => `<h2>${title}</h2>`;
const done = '<button class="b-pri" type="button" data-close>تمام</button>';

// ---------- الشاشات ----------
/** النوم: زي امبارح + chips نمت/صحيت (من الإعدادات) + جودة النوم + القيلولة. */
function sleepBody(s, ui) {
  const cfg = s.settings;
  const y = lastWith(ui.hist, s.cur, ['sleep', 'wake']);
  const same = y ? `<button class="ch wide" type="button" data-act="likey" data-keys="sleep,wake" data-vals="${y.sleep},${y.wake}">
      <span>زي امبارح: <b>${fmt12(y.sleep)} ← ${fmt12(y.wake)}</b></span><small>دوسة تملا الاتنين</small></button>` : '';
  return `${same}
    ${timeChips('sleep', 'نمت', ui, s, cfg.sleepBed || '23:30')}
    ${timeChips('wake', 'صحيت', ui, s, cfg.sleepWake || '06:30')}
    <p class="note" data-out="sleepdur"></p>
    <div><span class="lbl">صحيت إزاي؟ (جودة النوم)</span>${seg('sleepq', SLEEP_QUAL, 3)}</div>
    <div><span class="lbl">قيلولة (اختياري)</span>
      <div class="chs">${NAP_OPTS.map(([v, l]) => chip('nap', v, l)).join('')}</div>
    </div>`;
}

/** الشاشة: زي امبارح + Screen time + آخر استخدام + وقت بدون موبايل (من الجزء ٤). */
function screenBody(s, ui) {
  const y = lastWith(ui.hist, s.cur, ['screen']);
  const v = y ? readDuration(y.screen) || y.screen : '';
  return `${v ? `<div class="chs">${chip('screen', v, `زي امبارح ${fmtHM(mins(v))}`)}</div>` : ''}
    ${input('screen', { label: 'Screen time (ساعات ودقايق)', dt: 'dur', im: 'numeric', ph: 'مثلاً ٤٢٠ = ٤ ساعات و٢٠ دقيقة', ekh: 'done' })}
    <p class="note" data-out="durnote" aria-live="polite"></p>
    ${timeChips('lastuse', 'آخر استخدام للموبايل', ui, s, '23:30')}
    <div class="per">
      <span class="lbl">وقت بدون موبايل (دقيقة)</span>
      <div class="chs">${['30', '60', '90', '120'].map((m) => chip('relm', m, `${fmtNum(+m)}د`)).join('')}</div>
      ${num('relm', '', 'أو اكتب عدد الدقايق')}
    </div>`;
}

/** الطاقة والمزاج والتوتر (من غير خانات الساعات المتكررة مع تاب الوقت). */
function energyBody(s, ui) {
  const pers = periodsFor(s.settings.dayStart);
  const recUp = recentValues(ui.hist, 'up', s.cur, 4);
  const recDown = recentValues(ui.hist, 'down', s.cur, 4);
  return `<div><span class="lbl">مزاجك النهارده من ٥</span>${rate('mood', { label: 'المزاج' })}</div>
    <div><span class="lbl">حالة اليوم (اختياري)</span>
      <div class="chs">${MOOD_TAGS.map((t) => chip('moodTag', t, esc(t))).join('')}</div>
    </div>
    <div class="per"><span class="lbl">طاقة الفترات الأربعة</span>
      ${pers.map(([k, l]) => `<div class="en-row"><span>${l}</span>${rate(`${k}e`, { label: `طاقة ${l}` })}</div>`).join('')}
    </div>
    <div class="per">
      <span class="lbl">التوتر النهارده</span>
      ${seg('stress', STRESS_OPTS, 3)}
      ${input('tens', { ph: 'سبب التوتر (اختياري)', ekh: 'next' })}
      <button class="tri" type="button" data-tri="tired" data-label="إرهاق غير معتاد"><i></i><span>إرهاق غير معتاد</span><small>دوس تاني للجزئي</small></button>
    </div>
    <div class="per">
      <span class="lbl">رفع طاقتي</span>
      ${recUp.length ? `<div class="chs">${recUp.map((x) => chip('up', x, esc(x))).join('')}</div>` : ''}
      ${input('up', { ph: 'مثلاً: تمرين، نوم كويس، إنجاز…' })}
      <span class="lbl" style="margin-top:4px">وطّى طاقتي</span>
      ${recDown.length ? `<div class="chs">${recDown.map((x) => chip('down', x, esc(x))).join('')}</div>` : ''}
      ${input('down', { ph: 'مثلاً: سهر، تشتيت، ضغط شغل…' })}
      ${num('unpl', 'مهام طلعت من غير تخطيط (عدد)')}
    </div>`;
}

function periodBody(i, s) {
  const [k, label, range] = periodsFor(s.settings.dayStart)[i];
  return `<p class="note" style="margin:0">${range}</p>
    ${input(`${k}t`, { label: 'ملخص الفترة (اختياري)', ph: 'مثلاً: شغل على الموقع', focus: true, ekh: 'done' })}
    <div><span class="lbl">طاقتك</span>${rate(`${k}e`, { label: `طاقة ${label}` })}<div class="ends"><span>واطية</span><span>عالية</span></div></div>
    <button class="lnk2" type="button" data-act="sheet" data-sheet="energy">الطاقة والتوتر واللي رفع ووطّى طاقتك</button>`;
}

/** أرقام وتفاصيل العادات المفكوكة حسب الأركان + تفاصيل التمرين + الكافيين. */
function habitsBody(s, ui) {
  const groups = activeHabitGroups(s.settings);
  const recWk = recentValues(ui.hist, 'ext', s.cur, 4);
  const wkPresets = [...new Set([...recWk, 'مقاومة', 'كارديو', 'مشي'])].slice(0, 5);
  const cafVal = +s.day.caf || 0;

  let html = '';
  for (const g of groups) {
    const detailed = g.items.filter((h) => h.workout || h.numK || h.numU);
    if (!detailed.length && g.id !== 'health' && g.id !== 'growth') continue;
    let body = '';
    for (const h of detailed) {
      if (h.workout) {
        body += `<div class="wk-box">
            <div class="wk-bh"><b>تفاصيل التمرين (${esc(h.n)})</b></div>
            <span class="lbl">نوع التمرين</span>
            <div class="chs">${wkPresets.map((t) => chip('ext', t, esc(t))).join('')}</div>
            ${input('ext', { ph: 'مثلاً: صدر وتراي، جري، مقاومة…' })}
            <span class="lbl">الوقت (دقيقة)</span>
            <div class="chs">${(h.chips || [15, 30, 45, 60]).map((n) => chip('exm', String(n), `${fmtNum(n)}د`, `وقت التمرين ${fmtNum(n)} دقيقة`)).join('')}</div>
            <div class="g2">
              ${num('exm', 'دقايق التمرين', 'مثلاً ٤٥')}
              ${input('exn', { label: 'أرقام التمرين', ph: 'مثلاً ٤×١٢ أو ٦٠ كجم' })}
            </div>
          </div>`;
      } else {
        const nk = h.numK || `hn_${h.k}`;
        const u = h.numU || '';
        const chs = h.chips?.length
          ? `<div class="chs">${h.chips.map((n) => chip(nk, String(n), `${fmtNum(n)}${u === 'دقيقة' ? 'د' : u === 'صفحة' ? 'ص' : ''}`, `${h.n}: ${fmtNum(n)} ${u}`)).join('')}</div>`
          : '';
        body += `<div class="hnum-blk">
            <span class="lbl">${esc(h.n)}${u ? ` (${esc(u)})` : ''}</span>
            ${chs}
            ${num(nk, '', u ? `عدد ال${u.replace(/^ال/, '')}` : 'الرقم')}
          </div>`;
      }
    }
    if (g.id === 'health') {
      body += `<div class="hnum-blk">
          <div class="g-manrow"><span>قهوة / شاي (كوباية)</span>
            <div class="g-manbtns">
              <button type="button" class="wk-nav" data-act="cafstep" data-d="-1" aria-label="نقص كوباية">−</button>
              <b data-out="cafval">${cafVal ? fmtNum(cafVal) : '—'}</b>
              <button type="button" class="wk-nav" data-act="cafstep" data-d="1" aria-label="زوّد كوباية">${ic(P.plus)}</button>
            </div>
          </div>
          ${timeChips('cafl', 'آخر كوباية كافيين', ui, s, '16:00')}
        </div>`;
    }
    if (g.id === 'growth') {
      body += input('learnt', { label: 'اتعلمت إيه النهارده؟', ph: 'فكرة أو معلومة جديدة…', ekh: 'done' });
    }
    if (body) {
      html += `<div class="per"><div class="per-h"><b>${esc(g.name)}</b></div>${body}</div>`;
    }
  }
  return html || '<p class="note">مفيش عادات ليها أرقام تفصيلية. تقدر تضيف وحدة لأي عادة من الإعدادات.</p>';
}

/** الشغل: إجازة + ربط بتاب الوقت + مشاريعك النشطة + ساعات + تركيز عميق. */
function workRow(i, s, recent) {
  return `<div class="per">
      <div class="wph"><b>مشروع ${fmtNum(i)}</b></div>
      ${recent.length ? `<div class="chs">${recent.map((p) => chip(`w${i}p`, p, esc(p))).join('')}</div>` : ''}
      ${input(`w${i}p`, { ph: recent.length ? 'أو اكتب اسم تاني' : 'اسم المشروع' })}
      <div><span class="lbl">كام ساعة؟</span><div class="chs">${['1', '2', '3', '4', '5', '6'].map((h) => chip(`w${i}h`, h, fmtNum(h))).join('')}</div></div>
      <div class="wrow">${input(`w${i}o`, { ph: 'الناتج الملموس (لو حابب)', ekh: 'done' })}${hours(`w${i}h`)}</div></div>`;
}
function workBody(s, ui, { guide = false } = {}) {
  const cfg = s.settings;
  const recentHist = recentValues(ui.hist, ['w1p', 'w2p', 'w3p', 'w4p'], s.cur, 4);
  const recent = [...new Set([...(cfg.projects || []), ...recentHist])].slice(0, 6);
  const used = [1, 2, 3, 4].filter((i) => has(s.day[`w${i}p`]) || has(s.day[`w${i}h`]) || has(s.day[`w${i}o`]));
  const rows = Math.min(4, Math.max(1, used.length ? Math.max(...used) : 0, ui.workRows || 1));

  const timeWorkH = timeByCat(s.day, cfg).by.work || 0;
  const timeBanner = timeWorkH > 0 ? `<div class="wk-link">
      <span>سجّلت في تاب «الوقت»: <b>${fmtHours(timeWorkH)}</b> شغل</span>
      <button type="button" class="tfill" data-act="workfromtime" data-h="${timeWorkH}">انقلها لمشروع ١</button>
    </div>` : '';

  const offBtn = `<button class="ch wide${s.day.workOff ? ' on' : ''}" type="button" data-act="workoff" aria-pressed="${!!s.day.workOff}">
      <span>إجازة / مفيش شغل النهارده</span>
      <small>${s.day.workOff ? 'متعلمة ✓' : 'دوس لو إجازة'}</small>
    </button>`;

  const deepBlock = guide ? '' : `<div class="per">
      <span class="lbl">تركيز عميق متواصل (الهدف ${fmtNum(cfg.deepTarget)} س)</span>
      <div class="chs">${['1', '2', '3', '4'].map((h) => chip('deep', h, `${fmtNum(+h)} س`)).join('')}</div>
      ${hours('deep', 'تركيز عميق')}
    </div>`;

  return `${offBtn}${timeBanner}
    ${[1, 2, 3, 4].slice(0, rows).map((i) => workRow(i, s, recent)).join('')}
    ${rows < 4 ? `<button class="lnk2" type="button" data-act="workmore"${guide ? ' data-guide' : ''}>+ مشروع تاني</button>` : ''}
    ${deepBlock}`;
}

/** قرار وتأجيل: chips أسباب التأجيل + القرار. */
function postBody(s, ui) {
  const recent = recentValues(ui.hist, 'post', s.cur, 3, ['ولا حاجة']);
  return `<div><span class="lbl">أجّلت إيه؟</span><div class="chs">${chip('post', 'ولا حاجة')}${recent.map((p) => chip('post', p, esc(p))).join('')}</div></div>
    ${input('post', { ph: 'أو اكتب حاجة تانية', label: '' })}
    <div><span class="lbl">وليه؟ (اختار سبب أو اكتب)</span>
      <div class="chs">${POST_REASONS.map((r) => chip('postw', r, esc(r))).join('')}</div>
    </div>
    ${input('postw', { ph: 'أو اكتب سبب تاني', label: '' })}
    <div class="per">
      ${input('dec', { label: 'قرار خدته النهارده (اختياري)', ekh: 'done' })}
      <div><span class="lbl">أخدت القرار إزاي؟</span>
        ${seg('decs', [['fast', 'بسرعة'], ['slow', 'بعد تفكير']])}
        <div style="height:8px"></div>
        ${seg('deci', [['full', 'معلومات كاملة'], ['part', 'ناقصة']])}
      </div>
    </div>`;
}

/** أهم حاجة حصلت + أهم أولوية لبكرة. */
const topBody = () => `<label class="f"><span class="lbl">أهم حاجة حصلت النهارده</span>
    <textarea class="fld" data-k="top" data-focus rows="4" enterkeyhint="next" placeholder="جملة أو اتنين…" aria-label="أهم حاجة حصلت"></textarea>
  </label>
  <label class="f"><span class="lbl">أهم أولوية لبكرة (اختياري — هتظهرلك الصبح)</span>
    <input class="fld" data-k="nextp" autocomplete="off" enterkeyhint="done" placeholder="حاجة واحدة تبدأ بيها بكرة…">
  </label>`;

// ---------- الفلوس ----------
export function expListHtml(day, { total = true } = {}) {
  const ex = day.exp || [];
  if (!ex.length) return '<p class="note" style="margin:0">لسه مفيش مصاريف في اليوم ده.</p>';
  return `<div class="explist">${ex.map((e, i) => `<div class="ex">
    <button class="ex-b" type="button" data-act="editexp" data-i="${i}" aria-label="عدّل ${fmtNum(e.a)} جنيه">
      <span class="a">${fmtNum(e.a)} ج</span><span class="w">${esc(e.w) || '—'}</span><span class="c">${esc(e.c)}</span>
    </button>
    <button class="del" type="button" data-act="delexp" data-i="${i}" aria-label="امسح ${fmtNum(e.a)} جنيه">${ic(P.close)}</button></div>`).join('')}</div>
    ${total ? `<p class="note" style="margin:0">الإجمالي: <b>${fmtNum(expTotal(day))} ج</b></p>` : ''}`;
}
function moneyBody(ui, s) {
  const cats = s.settings.expCats || [];
  return `<button class="ch wide${s.day.noSpend ? ' on' : ''}" type="button" data-act="nospend" aria-pressed="${!!s.day.noSpend}">
      <span>ماصرفتش حاجة النهارده</span>
      <small>${s.day.noSpend ? 'متعلمة ✓' : 'دوس لو ٠ ج'}</small>
    </button>
    <div class="cats" role="group" aria-label="التصنيف">${cats.map((c) => `<button class="cat${ui.cat === c ? ' on' : ''}" type="button" data-act="cat" data-c="${esc(c)}" aria-pressed="${ui.cat === c}">${esc(c)}</button>`).join('')}</div>
    <form class="addrow" data-act="addexp">
      <input class="fld" data-role="expin" placeholder="مثلاً: ٧٥ غدا، أو أوبر ٣٠ ج" aria-label="المبلغ وعلى إيه" autocomplete="off" enterkeyhint="done">
      <button class="addbtn" type="submit" aria-label="سجّل المصروف">${ic(P.plus)}</button>
    </form>
    <p class="parse" data-out="parse" aria-live="polite"></p>
    <div data-out="explist"></div>`;
}

// ---------- شاشات التعديل السريع (مصروف / مهمة / فكرة) ----------
export function expEditSheet(item, idx, s) {
  const cats = s.settings.expCats || [];
  return {
    label: 'تعديل المصروف',
    head: '<h2>تعديل المصروف</h2>',
    body: `<form class="addform" data-act="saveexp" data-i="${idx}">
        <div class="g2m">
          <input class="fld" data-role="eeamt" inputmode="decimal" autocomplete="off" value="${esc(item.a)}" placeholder="المبلغ" aria-label="المبلغ">
          <input class="fld" data-role="eedesc" autocomplete="off" value="${esc(item.w || '')}" placeholder="على إيه؟" aria-label="على إيه">
        </div>
        <div><span class="lbl">التصنيف</span>
          <div class="cats">${cats.map((c) => `<button class="cat${item.c === c ? ' on' : ''}" type="button" data-act="eecat" data-c="${esc(c)}" data-keep aria-pressed="${item.c === c}">${esc(c)}</button>`).join('')}</div>
        </div>
      </form>`,
    foot: `<div class="foot2"><button class="b-sec" type="button" data-act="delexp" data-i="${idx}" data-close-after>امسح</button>
      <button class="b-pri" type="button" data-act="saveexpbtn">احفظ التعديل</button></div>`,
  };
}

export function taskEditSheet(t, tf, s) {
  const activeGoals = (s.goals || []).filter((g) => !g.done && g.kind !== 'goal');
  return {
    label: 'تعديل المهمة',
    head: '<h2>تعديل المهمة</h2>',
    body: `<label class="f"><span class="lbl">المهمة</span>
        <input class="fld" data-role="tetxt" autocomplete="off" data-focus value="${esc(tf.t)}">
      </label>
      <div><span class="lbl">الميعاد</span>
        <div class="picks">
          ${[['today', 'النهارده'], ['tomorrow', 'بكرة'], ['date', 'تاريخ محدد'], ['later', 'بعدين']].map(([v, l]) => `<button class="pk" type="button" data-act="tewhen" data-v="${v}" data-keep aria-pressed="${tf.when === v}">${l}</button>`).join('')}
        </div>
        <input class="fld" type="date" data-role="tedate" value="${esc(tf.date || s.today)}" style="margin-top:8px"${tf.when === 'date' ? '' : ' hidden'}>
      </div>
      <div><span class="lbl">الأهمية والتصنيف</span>
        <div class="picks">
          <button class="opt" type="button" data-act="tepri" data-keep aria-pressed="${!!tf.pri}">مهم ⚑</button>
          <button class="pk" type="button" data-act="tecat" data-v="" data-keep aria-pressed="${!tf.cat}">بدون تصنيف</button>
          ${TASK_CATS.map((c) => `<button class="pk" type="button" data-act="tecat" data-v="${esc(c)}" data-keep aria-pressed="${tf.cat === c}">${esc(c)}</button>`).join('')}
        </div>
      </div>
      ${activeGoals.length ? `<div><span class="lbl">ربط بهدف</span>
        <div class="picks">
          <button class="pk" type="button" data-act="tegoal" data-id="" data-keep aria-pressed="${!tf.goalId}">بدون هدف</button>
          ${activeGoals.map((g) => `<button class="pk" type="button" data-act="tegoal" data-id="${esc(g.id)}" data-keep aria-pressed="${String(tf.goalId) === String(g.id)}">${esc(g.t)}</button>`).join('')}
        </div>
      </div>` : ''}`,
    foot: `<div class="foot2"><button class="b-sec" type="button" data-act="tedel">امسح</button>
      <button class="b-pri" type="button" data-act="tesave">احفظ التعديل</button></div>`,
  };
}

export function ideaEditSheet(it, ie, s) {
  const cats = s.settings.ideaCats || [];
  return {
    label: 'تعديل الفكرة',
    head: '<h2>تعديل الفكرة</h2>',
    body: `<label class="f"><span class="lbl">نص الفكرة</span>
        <textarea class="fld" rows="4" data-role="ietxt" data-focus>${esc(ie.t)}</textarea>
      </label>
      <div><span class="lbl">التصنيف</span>
        <div class="picks">${cats.map((c) => `<button class="pk" type="button" data-act="iecat" data-c="${esc(c)}" data-keep aria-pressed="${ie.c === c}">${esc(c)}</button>`).join('')}</div>
      </div>`,
    foot: `<div class="foot2"><button class="b-sec" type="button" data-act="iedel">امسح</button>
      <button class="b-pri" type="button" data-act="iesave">احفظ التعديل</button></div>`,
  };
}

// ---------- كل شاشة ----------
const SHEETS = {
  sleep: { title: 'النوم', body: sleepBody },
  screen: { title: 'الموبايل والشاشة', body: screenBody },
  energy: { title: 'الطاقة والمزاج والتوتر', body: energyBody },
  habits: { title: 'أرقام وتفاصيل العادات', body: habitsBody },
  work: { title: 'الشغل', body: (s, ui) => workBody(s, ui) },
  post: { title: 'قرار وتأجيل', body: postBody },
  top: { title: 'أهم حاجة حصلت', body: topBody },
};

export function sheetFor(id, s, ui) {
  const p = /^p([1-4])$/.exec(id);
  if (p) {
    const title = periodsFor(s.settings.dayStart)[+p[1] - 1][1];
    return { label: title, head: head(title), body: periodBody(+p[1] - 1, s), foot: done };
  }
  const sh = SHEETS[id];
  return { label: sh.title, head: head(sh.title), body: sh.body(s, ui), foot: done };
}

// ---------- سؤال بسؤال ----------
const GUIDE_BODY = {
  sleep: sleepBody,
  screen: screenBody,
  mood: () => `${rate('mood', { big: true, label: 'المزاج' })}<div class="ends"><span>وحش خالص</span><span>عالي</span></div>`,
  habits: (s, ui) => `<div class="panel" style="padding:10px;display:flex;flex-direction:column;gap:10px">${habitsGrid(s.day, false, s.settings)}<div data-out="salahbox">${salahRow(s.day, ui?.prayPick)}</div></div>`,
  work: (s, ui) => workBody(s, ui, { guide: true }),
  money: (s, ui) => moneyBody(ui, s),
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

export function updateOutputs(root, s, ui) {
  if (!root) return;
  const cfg = s.settings;
  const sb = root.querySelector('[data-out="salahbox"]');
  if (sb) sb.innerHTML = salahRow(s.day, ui?.prayPick);
  const dur = root.querySelector('[data-out="sleepdur"]');
  if (dur) {
    const m = sleepMinutes(s.day.sleep, s.day.wake);
    const goal = cfg.sleepTarget || 7.5;
    dur.innerHTML = m == null
      ? `اكتب الوقتين والمدة هتتحسب لوحدها (هدفك ${fmtNum(goal)} س).`
      : `مدة النوم: <b>${fmtHM(m)}</b> (هدفك ${fmtNum(goal)} س${+s.day.nap > 0 ? ` + قيلولة ${fmtNum(+s.day.nap)}د` : ''})`;
  }
  const caf = root.querySelector('[data-out="cafval"]');
  if (caf) caf.textContent = +s.day.caf ? fmtNum(+s.day.caf) : '—';
  const list = root.querySelector('[data-out="explist"]');
  if (list) list.innerHTML = expListHtml(s.day);
  const dn = root.querySelector('[data-out="durnote"]');
  if (dn) {
    const raw = root.querySelector('[data-k="screen"]')?.value || '';
    const v = readDuration(raw);
    const m = mins(v);
    dn.classList.toggle('err', !!raw.trim() && !v);
    const lim = cfg.screenLimit || 3;
    if (!raw.trim()) dn.textContent = `اكتب الأرقام بس: ٤٢٠ = ٤:٢٠، و٤٥ = ٤٥ دقيقة (سقفك ${fmtNum(lim)} س)`;
    else if (!v) dn.textContent = 'مش مفهوم. اكتبها زي ٤٢٠ أو ٤:٢٠';
    else dn.innerHTML = `= <b>${fmtNum(Math.floor(m / 60))}</b> ساعات و<b>${fmtNum(m % 60)}</b> دقيقة (السقف ${fmtNum(lim)} س)`;
  }
}

export { addDays, incomeTotal };
