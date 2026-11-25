// views/metrics.js — مقاييسي (في تبويبة اليوم)، وشاشة قيمة المقياس، وفورم "مقياس جديد".

import {
  METRIC_TYPES, METRIC_WHEN, metricAreas, metricVisible, groupMetrics, metricDesc, metricValue,
} from '../logic.js';
import { esc, ic, P, setHtml } from '../ui.js';

// اقتراحات في فورم "مقياس جديد": محدثة من غير تكرار مع الأساسي
export const SUGGEST = [
  { n: 'مية', t: 'count', u: 'كوباية', a: 'الصحة', w: 'day' },
  { n: 'الوزن', t: 'num', u: 'كجم', a: 'الصحة', w: 'p1' },
  { n: 'خطوات', t: 'num', u: '', a: 'الصحة', w: 'p4' },
  { n: 'مكالمات العملاء', t: 'count', u: 'مكالمة', a: 'الشغل والبيزنس', w: 'day' },
  { n: 'عروض أسعار', t: 'count', u: '', a: 'الشغل والبيزنس', w: 'day' },
];

const hasUnit = (t) => t === 'count' || t === 'num';

function cell(m, v) {
  const id = esc(m.id);
  const name = `<span class="k">${esc(m.n)}</span>`;
  const val = metricValue(m, v);
  const unit = m.u && hasUnit(m.t) ? `<small>${esc(m.u)}</small>` : '';
  if (m.t === 'count') {
    return `<div class="mc">
      <button class="mc-b" type="button" data-act="medit" data-id="${id}" aria-label="${esc(m.n)}: ${val || 'فاضي'}، دوس تعدّل الرقم"><span class="m">${name}<span class="v${val ? '' : ' none'}">${val ? `${val}${unit}` : '—'}</span></span></button>
      <button class="plus" type="button" data-act="mplus" data-id="${id}" aria-label="زوّد ${esc(m.n)} واحد">${ic(P.plus)}</button></div>`;
  }
  if (m.t === 'tri') {
    const st = +v || 0;
    return `<button class="mc tri-c v${st}" type="button" data-act="mtri" data-id="${id}" aria-label="${esc(m.n)}: ${val || 'فاضي'}"><span class="m">${name}<span class="v${st ? '' : ' none'}">${val || '—'}</span></span><i class="tbox" aria-hidden="true"></i></button>`;
  }
  return `<button class="mc" type="button" data-act="medit" data-id="${id}" aria-label="${esc(m.n)}: ${val || 'فاضي'}"><span class="m">${name}<span class="v${val ? '' : ' none'}">${val ? `${esc(val)}${unit}` : '—'}</span></span></button>`;
}

/** قسم مقاييسي في تبويبة اليوم. لو مفيش مقاييس، بيعرض أزرار الإعدادات بس من غير كارت فاضي يشغل مساحة. */
export function metricsSection(s) {
  const hour = new Date().getHours();
  const vis = s.metrics.filter((m) => metricVisible(m, s.cur, s.today, hour, s.settings?.dayStart));
  const vals = s.day.m || {};
  const headAndBody = vis.length
    ? `<div class="sec"><b>مقاييسي</b></div>
      <section class="metrics" aria-label="مقاييسي">${groupMetrics(vis).map(([a, ms]) => `<div class="area">${esc(a)}</div>
        <div class="mgrid">${ms.map((m) => cell(m, vals[m.id])).join('')}</div>`).join('')}</section>`
    : '';
  return `${headAndBody}
    <div class="links">
      <button class="gh" type="button" data-act="mform">${ic(P.plus)}قيس حاجة جديدة</button>
      <button class="gh" type="button" data-act="settings">الإعدادات</button>
    </div>`;
}

export function metricSheet(m) {
  const id = esc(m.id);
  let field;
  if (m.t === 'time') field = `<input class="fld" type="time" data-m="${id}" data-type="time" aria-label="${esc(m.n)}">`;
  else if (m.t === 'text') field = `<textarea class="fld" rows="3" data-focus enterkeyhint="done" data-m="${id}" data-type="txt" aria-label="${esc(m.n)}" placeholder="اكتب هنا…"></textarea>`;
  else {
    field = `<div class="unitrow"><input class="fld" data-focus data-m="${id}" data-type="num" inputmode="decimal" enterkeyhint="done" autocomplete="off" aria-label="${esc(m.n)}" placeholder="${m.t === 'count' ? '٠' : 'الرقم'}">${m.u ? `<span>${esc(m.u)}</span>` : ''}</div>`;
  }
  return {
    label: m.n,
    head: `<h2>${esc(m.n)}</h2>`,
    body: `<p class="note" style="margin:0">${metricDesc(m)}</p>${field}`,
    foot: '<button class="b-pri" type="button" data-close>تمام</button>',
  };
}

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
