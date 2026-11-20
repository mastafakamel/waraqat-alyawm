// views/metrics.js — مقاييسي (في تبويبة اليوم)، وشاشة قيمة المقياس، وفورم "مقياس جديد"، والإعدادات (الفترة ومقاييسي).

import {
  METRIC_TYPES, METRIC_WHEN, metricAreas, metricVisible, groupMetrics, metricDesc, metricValue,
  periodOf, periodDay, periodLabel, fmtNum, fmt12,
} from '../logic.js';
import { esc, ic, P, setHtml } from '../ui.js';

// اقتراحات في فورم "مقياس جديد": دوسة بتملا الخانات بس، ومابيتحفظش منها حاجة غير لما تدوس "ضيف المقياس"
export const SUGGEST = [
  { n: 'مكالمات العملاء', t: 'count', u: 'مكالمة', a: 'البيزنس', w: 'day' },
  { n: 'عروض أسعار', t: 'count', u: '', a: 'البيزنس', w: 'day' },
  { n: 'مية', t: 'count', u: 'كوباية', a: 'الصحة', w: 'day' },
  { n: 'الوزن', t: 'num', u: 'كجم', a: 'الصحة', w: 'p1' },
  { n: 'خطوات', t: 'num', u: '', a: 'الصحة', w: 'p4' },
  { n: 'سوشيال', t: 'num', u: 'دقيقة', a: 'الموبايل والسوشيال', w: 'p4' },
];

const hasUnit = (t) => t === 'count' || t === 'num';

// ---------- خانة مقياس ----------
function cell(m, v) {
  const id = esc(m.id);
  const name = `<span class="k">${esc(m.n)}</span>`;
  const val = metricValue(m, v);
  const unit = m.u && hasUnit(m.t) ? `<small>${esc(m.u)}</small>` : '';
  if (m.t === 'count') {
    return `<div class="mc">
      <button class="mc-b" type="button" data-act="medit" data-id="${id}" aria-label="${esc(m.n)}: ${val}، دوس تعدّل الرقم"><span class="m">${name}<span class="v">${val}${unit}</span></span></button>
      <button class="plus" type="button" data-act="mplus" data-id="${id}" aria-label="زوّد ${esc(m.n)} واحد">${ic(P.plus)}</button></div>`;
  }
  if (m.t === 'tri') {
    const st = +v || 0;
    return `<button class="mc tri-c v${st}" type="button" data-act="mtri" data-id="${id}" aria-label="${esc(m.n)}: ${val}"><span class="m">${name}<span class="v${st ? '' : ' none'}">${val}</span></span><i class="tbox" aria-hidden="true"></i></button>`;
  }
  return `<button class="mc" type="button" data-act="medit" data-id="${id}" aria-label="${esc(m.n)}: ${val || 'فاضي'}"><span class="m">${name}<span class="v${val ? '' : ' none'}">${val ? `${esc(val)}${unit}` : '—'}</span></span></button>`;
}

/** قسم مقاييسي في تبويبة اليوم. */
export function metricsSection(s) {
  const hour = new Date().getHours();
  const vis = s.metrics.filter((m) => metricVisible(m, s.cur, s.today, hour));
  const vals = s.day.m || {};
  let body;
  if (!s.metrics.length) {
    body = `<div class="empty"><b>مفيش مقاييس لسه</b>
      <p>أي حاجة عايز تعرف رقمها آخر الفترة: مكالمات، مية، وزن، وقت على السوشيال. ضيفها وسجّلها بدوسة.</p></div>`;
  } else if (!vis.length) {
    body = '<div class="list"><p class="empty-s">مقاييسك هتظهر هنا في وقتها.</p></div>';
  } else {
    body = `<section class="metrics" aria-label="مقاييسي">${groupMetrics(vis).map(([a, ms]) => `<div class="area">${esc(a)}</div>
      <div class="mgrid">${ms.map((m) => cell(m, vals[m.id])).join('')}</div>`).join('')}</section>`;
  }
  return `<div class="sec"><b>مقاييسي</b></div>${body}
    <div class="links">
      <button class="gh" type="button" data-act="mform">${ic(P.plus)}قيس حاجة جديدة</button>
      <button class="gh" type="button" data-act="settings">الإعدادات</button>
    </div>`;
}

// ---------- شاشة قيمة المقياس (رقم أو وقت أو كلام، أو تعديل العدّاد) ----------
export function metricSheet(m) {
  const id = esc(m.id);
  let field;
  if (m.t === 'time') field = `<input class="fld" type="time" data-m="${id}" data-type="time" aria-label="${esc(m.n)}">`;
  else if (m.t === 'text') field = `<textarea class="fld" rows="3" data-m="${id}" data-type="txt" aria-label="${esc(m.n)}" placeholder="اكتب هنا…"></textarea>`;
  else {
    field = `<div class="unitrow"><input class="fld" data-m="${id}" data-type="num" inputmode="decimal" autocomplete="off" aria-label="${esc(m.n)}" placeholder="${m.t === 'count' ? '٠' : 'الرقم'}">${m.u ? `<span>${esc(m.u)}</span>` : ''}</div>`;
  }
  return {
    label: m.n,
    head: `<h2>${esc(m.n)}</h2>`,
    body: `<p class="note" style="margin:0">${metricDesc(m)}</p>${field}`,
    foot: '<button class="b-pri" type="button" data-close>تمام</button>',
  };
}

// ---------- فورم مقياس جديد / تعديل ----------
// f = { id?, n, t, u, a, w, newArea }
export function metricForm(f, s) {
  const editing = !!f.id;
  const taken = new Set(s.metrics.map((m) => m.n));
  const sugg = SUGGEST.map((x, i) => [x, i]).filter(([x]) => !taken.has(x.n));
  return {
    label: editing ? 'عدّل المقياس' : 'مقياس جديد',
    head: `<h2>${editing ? 'عدّل المقياس' : 'مقياس جديد'}</h2>`,
    body: `${!editing && sugg.length ? `<div><span class="lbl">اقتراحات (دوسة بتملا الخانات)</span>
        <div class="sugg">${sugg.map(([x, i]) => `<button class="pk dash" type="button" data-act="msugg" data-i="${i}" data-keep>${x.n}</button>`).join('')}</div></div>` : ''}
      <label class="f"><span class="lbl">الاسم</span><input class="fld" data-role="mname" autocomplete="off" placeholder="مثلاً: مكالمات العملاء" value="${esc(f.n)}"></label>
      <div><span class="lbl">النوع</span><div class="types" role="group" aria-label="النوع">${METRIC_TYPES.map(([k, l]) => `<button class="pk" type="button" data-act="mtype" data-v="${k}" data-keep aria-pressed="false">${l}</button>`).join('')}</div></div>
      <label class="f" data-out="munit"><span class="lbl">الوحدة (اختياري)</span><input class="fld" data-role="munit" autocomplete="off" placeholder="مثلاً: كوباية، كجم، دقيقة" value="${esc(f.u)}"></label>
      <div><span class="lbl">المجال</span><div class="picks" role="group" aria-label="المجال" data-out="mareas"></div>
        <input class="fld" data-role="marea" autocomplete="off" placeholder="اسم المجال الجديد" aria-label="اسم المجال الجديد" style="margin-top:8px" hidden></div>
      <div><span class="lbl">يبان إمتى؟</span><div class="picks" role="group" aria-label="يبان إمتى">${METRIC_WHEN.map(([k, l]) => `<button class="pk" type="button" data-act="mwhen" data-v="${k}" data-keep aria-pressed="false">${l}</button>`).join('')}</div></div>
      <div class="prev"><span>هيبان كده في "مقاييسي":</span><div class="pv" data-out="mprev" inert></div></div>`,
    foot: editing
      ? '<div class="foot2"><button class="b-sec" type="button" data-act="mdel">امسح</button><button class="b-pri" type="button" data-act="msave">احفظ</button></div>'
      : '<button class="b-pri" type="button" data-act="msave">ضيف المقياس</button>',
  };
}

/** بيحدّث الفورم من غير ما يرسمه من الأول، عشان الكيبورد واللي بتكتبه مايضيعوش. */
export function updateMetricForm(root, f, s) {
  const areasBox = root?.querySelector('[data-out="mareas"]');
  if (!areasBox) return;
  for (const b of root.querySelectorAll('[data-act="mtype"]')) b.setAttribute('aria-pressed', b.dataset.v === f.t);
  for (const b of root.querySelectorAll('[data-act="mwhen"]')) b.setAttribute('aria-pressed', b.dataset.v === f.w);
  root.querySelector('[data-out="munit"]').hidden = !hasUnit(f.t);
  const areas = metricAreas(s.metrics);
  if (f.a && !areas.includes(f.a) && !f.newArea) areas.push(f.a);
  setHtml(areasBox, `${areas.map((a) => `<button class="pk" type="button" data-act="marea" data-v="${esc(a)}" data-keep aria-pressed="${!f.newArea && a === f.a}">${esc(a)}</button>`).join('')}
    <button class="pk dash" type="button" data-act="mareanew" data-keep aria-pressed="${!!f.newArea}">+ مجال</button>`);
  root.querySelector('[data-role="marea"]').hidden = !f.newArea;
  const sample = f.t === 'count' ? 0 : f.t === 'tri' ? 0 : '';
  setHtml(root.querySelector('[data-out="mprev"]'), cell({ id: 'preview', n: f.n.trim() || 'اسم المقياس', t: f.t, u: f.u.trim() }, sample));
}

// ---------- الإعدادات ----------
export function settingsSheet() {
  return {
    label: 'الإعدادات',
    head: '<h2>الإعدادات</h2>',
    body: `<section class="blk" aria-label="الفترة"><h3 class="blk-h">الفترة</h3><div class="card" data-out="speriod"></div></section>
      <section class="blk" aria-label="مقاييسي">
        <div class="blk-h"><h3>مقاييسي</h3><button class="addb" type="button" data-act="mform">${ic(P.plus)}مقياس</button></div>
        <p class="hint">الـ ★ أساسي وثابت. الباقي إنت ضايفه: اقفله يختفي من اليوم وأرقامه القديمة تفضل، أو دوس عليه تعدّله.</p>
        <div class="blk" data-out="smetrics"></div>
      </section>
      <section class="blk" aria-label="نسخة احتياطية"><h3 class="blk-h">نسخة احتياطية</h3>
        <div class="card"><div class="pad"><span>ملف فيه كل بياناتك. احفظه في Drive أو ابعته لنفسك. والاستيراد بيدمج ومابيمسحش حاجة.</span>
          <div class="btns"><button type="button" data-act="export">تصدير JSON</button><button type="button" data-act="import">استيراد JSON</button></div>
          <input type="file" accept="application/json,.json" data-role="importfile" hidden></div></div>
      </section>
      <section class="blk" aria-label="المزامنة"><h3 class="blk-h">المزامنة</h3><div class="card" data-out="ssync"></div></section>`,
    foot: '<button class="b-pri" type="button" data-close>تمام</button>',
  };
}

/** كارت المزامنة. sx = { configured, email, last, error } من sync.js */
function syncCard(s, ui, sx) {
  if (!sx.configured) {
    return `<div class="pad"><b>مش متظبطة لسه</b><span>كل حاجة محفوظة على الجهاز ده بس. المزامنة بين الموبايل واللابتوب محتاجة مشروع Supabase (الخطوات في README).</span></div>`;
  }
  if (s.sync === 'signedout' || s.sync === 'off') {
    if (ui.sf.step === 'code') {
      return `<div class="pad"><b>اكتب الكود</b><span>بعتنا كود من ٦ أرقام لـ <bdi>${esc(ui.sf.email)}</bdi>. لو مالقيتهوش، بص في الـ Spam.</span>
        <form class="addrow" data-act="scode" style="margin-top:10px">
          <input class="fld" data-role="scode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="الكود" aria-label="الكود" dir="ltr">
          <button class="b-pri sbtn" type="submit">دخول</button></form>
        <div class="btns"><button type="button" data-act="sback">غيّر الإيميل</button><button type="button" data-act="sresend">ابعت كود تاني</button></div></div>`;
    }
    return `<div class="pad"><b>مش مسجّل دخول</b><span>كل حاجة محفوظة على الجهاز ده بس. ادخل بإيميلك على الموبايل واللابتوب، والاتنين هيبقوا نفس البيانات.</span>
      <form class="addrow" data-act="semail" style="margin-top:10px">
        <input class="fld" type="email" data-role="semail" inputmode="email" autocomplete="email" placeholder="إيميلك" aria-label="إيميلك" dir="ltr">
        <button class="b-pri sbtn" type="submit">ابعت الكود</button></form></div>`;
  }
  const at = sx.last ? fmt12(new Date(sx.last).toTimeString().slice(0, 5)) : '';
  const line = {
    ok: at ? `آخر مزامنة الساعة ${at}.` : 'متزامن.',
    busy: 'بيزامن دلوقتي…',
    offline: 'مستني النت. كل حاجة محفوظة على الجهاز، وهتترفع لوحدها أول ما النت يرجع.',
    capped: 'وقفت النهارده عشان وصلت للحد اللي في الكود، وهترجع بكرة لوحدها. بياناتك محفوظة على الجهاز.',
    error: `المزامنة واقفة (${esc(sx.error)}). لو المشروع اتوقف من قلة الاستخدام، رجّعه من Supabase بزرار Resume.`,
  }[s.sync] || '';
  return `<div class="pad"><b>داخل بـ <bdi>${esc(sx.email)}</bdi></b><span>${line}</span>
    <div class="btns"><button type="button" data-act="ssync">زامن دلوقتي</button><button type="button" data-act="sout">اخرج</button></div></div>`;
}

export function updateSettings(root, s, ui, sx = { configured: false }) {
  const sp = root?.querySelector('[data-out="speriod"]');
  if (!sp) return;
  setHtml(root.querySelector('[data-out="ssync"]'), syncCard(s, ui, sx));
  // الإيميل اللي بتكتبه مش جوه الـ HTML، عشان الكارت مايترسمش من جديد مع كل حرف. فبنرجّعه لو الكارت اترسم
  const em = root.querySelector('[data-role="semail"]');
  if (em && em !== document.activeElement && !em.value) em.value = ui.sf.email || '';
  const cur = periodOf(s.periods, s.today);
  if (cur) {
    const d = periodDay(cur, s.today);
    setHtml(sp, `<div class="pad"><b>${periodLabel(cur)}</b><span>يوم ${fmtNum(d.n)} من ${fmtNum(d.of)}. ملخص الفلوس بيتحسب من أول الفترة.</span>
      ${ui.pedit ? `<div class="g2" style="margin-top:10px">
        <label class="f"><span class="lbl">من</span><input class="fld" type="date" data-role="pfrom" value="${cur.from}"></label>
        <label class="f"><span class="lbl">لحد</span><input class="fld" type="date" data-role="pto" value="${cur.to}"></label></div>` : ''}
      <div class="btns"><button type="button" data-act="pedit" aria-pressed="${!!ui.pedit}">${ui.pedit ? 'خلصت التعديل' : 'عدّل التواريخ'}</button><button type="button" data-act="pnew">ابدأ فترة جديدة</button></div></div>`);
  } else {
    setHtml(sp, `<div class="pad"><b>مفيش فترة دلوقتي</b><span>الفترة بتظهر في الهيدر "يوم ٣ من ١١"، وملخص الفلوس بيبدأ من أولها.</span>
      <div class="btns"><button class="pri" type="button" data-act="pnew">ابدأ فترة من النهارده (١١ يوم)</button></div></div>`);
  }

  const groups = groupMetrics(s.metrics);
  setHtml(root.querySelector('[data-out="smetrics"]'), `<div class="grp"><span>الأساسي ★</span><span>٨ بنود</span></div>
    <div class="card"><div class="srow"><span class="m"><span>النوم، والشاشة، والمزاج والطاقة، والشغل، والفلوس، و١٣ عادة والصلوات، وأجّلت إيه، وأهم حاجة</span></span><span class="lock">ثابت</span></div></div>
    ${groups.map(([a, ms]) => `<div class="grp"><span>${esc(a)}</span><span>${fmtNum(ms.length)}</span></div>
      <div class="card">${ms.map((m) => `<div class="srow${m.on ? '' : ' off'}">
        <button class="srow-b" type="button" data-act="mform" data-id="${esc(m.id)}"><span class="m"><b>${esc(m.n)}</b><span>${metricDesc(m)}</span></span></button>
        <button class="sw" type="button" role="switch" data-act="mtoggle" data-id="${esc(m.id)}" aria-checked="${!!m.on}" aria-label="${esc(m.n)}: يبان في اليوم"><i></i></button>
      </div>`).join('')}</div>`).join('')}
    ${groups.length ? '' : '<p class="hint">لسه مفيش مقاييس. دوس "+ مقياس" فوق.</p>'}`);
}
