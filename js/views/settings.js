// views/settings.js — شاشة الإعدادات المنظّمة (أقسام بتتفتح وتتقفل) + إدارة الفترات وهدف الفترة + العادات والتصنيفات.

import {
  STAR_ITEMS, PERIOD_GOAL_KINDS, TIME_CAT_COLORS, periodsFor, activeHabits,
  periodOf, periodDay, periodLabel, evalPeriodGoal, groupMetrics, metricDesc,
  fmtNum, fmt12, fmtDays,
} from '../logic.js';
import { esc, ic, ico, P, setHtml } from '../ui.js';

const PILLAR_ICONS = [['star', 'نجمة'], ['heart', 'قلب'], ['book', 'كتاب'], ['brief', 'شغل'], ['target', 'هدف'], ['home', 'بيت']];
const TIME_ICONS = [['moon', 'قمر'], ['brief', 'شغل'], ['book', 'كتاب'], ['move', 'طريق'], ['heart', 'قلب'], ['star', 'نجمة'], ['rest', 'راحة'], ['distract', 'تشتيت'], ['home', 'بيت'], ['target', 'هدف']];

// ---------- كارت «هدف الفترة» الرفيع في تبويبة اليوم ----------
export function periodCardToday(p, ev, s) {
  if (!p || !ev) return '';
  const id = esc(p.id);
  const showTick = !ev.ended && ev.timePct > 0 && ev.timePct < 100;

  let action = '';
  if (!ev.ended) {
    if (ev.kind === 'build' && ev.source === 'manual') {
      const on = ev.todayVal >= 1;
      action = `<button type="button" class="g-act${on ? ' done' : ' attn'}" data-act="pglog" data-id="${id}" data-v="${on ? '' : '1'}">${on ? `${ic(P.check)}عملتها النهارده` : 'علّم النهارده ✓'}</button>`;
    } else if (ev.kind === 'quit' && ev.source === 'manual') {
      const clean = ev.todayVal === 1;
      const slip = ev.todayVal === 0;
      action = `<div class="pg-qbtns">
          <button type="button" class="g-act${clean ? ' done' : ''}" data-act="pglog" data-id="${id}" data-v="${clean ? '' : '1'}">${clean ? `${ic(P.check)}نضيف` : 'نضيف ✓'}</button>
          <button type="button" class="g-act${slip ? ' attn' : ''}" data-act="pglog" data-id="${id}" data-v="${slip ? '' : '0'}">وقعت</button>
        </div>`;
    } else if ((ev.kind === 'target' || ev.kind === 'project') && (ev.source === 'manual' || ev.source === 'manual_num')) {
      action = `<button type="button" class="g-act" data-act="pginc" data-id="${id}">${ic(P.plus)}١ ${esc(ev.unit || '')}</button>`;
    } else if (ev.kind === 'project' && ev.source === 'steps') {
      const nxt = (ev.steps || []).find((x) => !x.done);
      action = nxt
        ? `<button type="button" class="g-act attn" data-act="pgstep" data-id="${id}" data-sid="${esc(nxt.id)}">${ic(P.check)}خلّصت الجاية</button>`
        : `<button type="button" class="g-act done" data-act="pdetail" data-id="${id}">التفاصيل${ic(P.chev)}</button>`;
    } else {
      action = `<button type="button" class="g-act" data-act="pdetail" data-id="${id}">التفاصيل${ic(P.chev)}</button>`;
    }
  }

  const valHtml = ev.kind === 'project' && ev.source === 'steps'
    ? `${fmtNum(ev.cur)} <small>من ${fmtNum(ev.target)} خطوة</small>`
    : `${fmtNum(ev.cur)} <small>/ ${fmtNum(ev.target)}${ev.unit ? ` ${esc(ev.unit)}` : ''}</small>`;

  const footText = ev.kind === 'project' && ev.source === 'steps' && ev.nextStep
    ? `الجاية: <b>${esc(ev.nextStep)}</b>`
    : `${esc(ev.paceText)}`;

  return `<section class="gcard pgoal${ev.succeeded ? ' done' : ''}" aria-label="هدف الفترة">
      <div class="gcard-h">
        <span class="g-med">${ico(ev.kindIcon)}</span>
        <button type="button" class="g-main" data-act="pdetail" data-id="${id}" aria-label="هدف الفترة: ${esc(ev.title)}">
          <span class="g-src">هدف الفترة${p.name ? ` · ${esc(p.name)}` : ''} · ${esc(ev.kindLabel)}</span>
          <span class="g-title">${esc(ev.title)}</span>
        </button>
        <span class="g-pct ${ev.status}">${esc(ev.statusText)}</span>
      </div>
      <div class="pace-wrap">
        ${ev.kind === 'project' && ev.steps?.length
          ? `<div class="m-segs" style="grid-template-columns:repeat(${ev.steps.length},1fr)" aria-hidden="true">${ev.steps.map((x) => `<i class="${x.done ? 'on' : ''}"></i>`).join('')}</div>`
          : `<div class="pace-bar" aria-hidden="true"><div class="pace-fill${ev.status === 'attn' ? ' attn' : ''}" style="width:${ev.pct}%"></div>${showTick ? `<span class="pace-tick" style="inset-inline-start:${ev.timePct}%"></span>` : ''}</div>`}
        <div class="pace-meta">
          <span class="pace-val">${valHtml}</span>
          <span class="pace-tag ${ev.status}">${fmtNum(ev.pct)}٪</span>
        </div>
      </div>
      <div class="g-foot">
        <div class="g-next">${footText}</div>
        ${action}
      </div>
    </section>`;
}

// ---------- شاشة تفاصيل وتقييم الفترة ----------
export function periodDetailSheet(p) {
  return {
    label: p.name || 'هدف الفترة',
    head: `<h2>${esc(p.name || 'الفترة الحالية')}</h2>`,
    body: `<div class="gdet" data-out="pdet" data-pid="${esc(p.id)}"></div>`,
    foot: `<div class="foot2"><button class="b-sec" type="button" data-act="pform" data-id="${esc(p.id)}">تعديل</button>
      <button class="b-pri" type="button" data-close>تمام</button></div>`,
  };
}

export function updatePeriodDetail(sh, p, ev, s) {
  const box = sh?.querySelector('[data-out="pdet"]');
  if (!box || !p) return;
  const id = esc(p.id);
  const pd = periodDay(p, s.today);
  const rangeStr = `${periodLabel(p)}${pd && s.today >= p.from && s.today <= p.to ? ` · يوم ${fmtNum(pd.n)} من ${fmtNum(pd.of)}` : ''}`;

  let goalHtml = '';
  if (ev) {
    const showTick = !ev.ended && ev.timePct > 0 && ev.timePct < 100;
    const valStr = `${fmtNum(ev.cur)} / ${fmtNum(ev.target)}${ev.unit ? ` ${esc(ev.unit)}` : ''}`;

    let controls = '';
    if (!ev.ended) {
      if (ev.kind === 'build' && ev.source === 'manual') {
        const on = ev.todayVal >= 1;
        controls = `<button type="button" class="b-pri" data-act="pglog" data-id="${id}" data-v="${on ? '' : '1'}">${on ? '✓ اتعملت النهارده (دوس للإلغاء)' : 'علّم إنك عملتها النهارده ✓'}</button>`;
      } else if (ev.kind === 'quit' && ev.source === 'manual') {
        const clean = ev.todayVal === 1;
        const slip = ev.todayVal === 0;
        controls = `<div class="seg2">
            <button type="button" class="so${clean ? ' on' : ''}" data-act="pglog" data-id="${id}" data-v="${clean ? '' : '1'}">النهارده عدّى نضيف ✓</button>
            <button type="button" class="so${slip ? ' on' : ''}" data-act="pglog" data-id="${id}" data-v="${slip ? '' : '0'}">وقعت النهارده</button>
          </div>`;
      } else if ((ev.kind === 'target' || ev.kind === 'project') && (ev.source === 'manual' || ev.source === 'manual_num')) {
        controls = `<div class="g-manrow"><span>التقدّم الحالي</span>
          <div class="g-manbtns">
            <button type="button" class="wk-nav" data-act="pgdec" data-id="${id}" aria-label="نقص واحد">−</button>
            <b>${fmtNum(ev.cur)} ${esc(ev.unit)}</b>
            <button type="button" class="wk-nav" data-act="pginc" data-id="${id}" aria-label="زوّد واحد">${ic(P.plus)}</button>
          </div></div>`;
      }
    }

    const stepsBox = ev.kind === 'project' && ev.source === 'steps' ? `<div class="blk">
        <div class="blk-h"><h3>خطوات المشروع</h3><span>${fmtNum(ev.cur)}/${fmtNum(ev.target)}</span></div>
        ${ev.steps?.length ? `<div class="list">${ev.steps.map((st) => `<div class="tk${st.done ? ' done' : ''}">
          <button class="tk-c" type="button" data-act="pgstep" data-id="${id}" data-sid="${esc(st.id)}" aria-pressed="${!!st.done}" aria-label="${esc(st.t)}"><i>${st.done ? ic(P.check) : ''}</i></button>
          <div class="tk-m"><span class="tk-t">${esc(st.t)}</span></div>
          <button class="ib" type="button" data-act="pgstepdel" data-id="${id}" data-sid="${esc(st.id)}" aria-label="امسح الخطوة">${ic(P.close)}</button>
        </div>`).join('')}</div>` : '<p class="hint">ضيف أول خطوة تحت.</p>'}
        <form class="addrow" data-act="pgstepadd" data-pid="${id}">
          <input class="fld" data-role="pgstepin" placeholder="+ خطوة جديدة…" aria-label="خطوة جديدة" autocomplete="off" enterkeyhint="done">
          <button class="addbtn" type="submit" aria-label="ضيف الخطوة">${ic(P.plus)}</button>
        </form>
      </div>` : '';

    goalHtml = `<div class="panel g-detsum">
        <div class="gcard-h">
          <span class="g-med">${ico(ev.kindIcon)}</span>
          <div class="g-main"><span class="g-title">${esc(ev.title)}</span><span class="g-src">${esc(ev.kindLabel)} · ${esc(ev.sourceLabel)}</span></div>
          <span class="g-pct ${ev.status}">${esc(ev.statusText)}</span>
        </div>
        <div class="pace-bar tall" aria-hidden="true"><div class="pace-fill${ev.status === 'attn' ? ' attn' : ''}" style="width:${ev.pct}%"></div>${showTick ? `<span class="pace-tick" style="inset-inline-start:${ev.timePct}%"></span>` : ''}</div>
        <div class="pace-meta"><span class="pace-val">${valStr} (${fmtNum(ev.pct)}٪)</span><span class="pace-tag ${ev.status}">${esc(ev.paceText)}</span></div>
        ${ev.streak >= 2 ? `<p class="note" style="margin:0">أطول سلسلة متواصلة: <b>${fmtDays(ev.streak)}</b>${ev.slipped ? ` · أيام وقعت: ${fmtNum(ev.slipped)}` : ''}</p>` : ''}
      </div>
      ${controls}${stepsBox}`;
  } else {
    goalHtml = `<div class="empty"><b>الفترة دي من غير هدف محدد</b>
      <p>دوس «تعديل» تحت وحدد هدف واحد تقيس عليه نجاح الفترة.</p></div>`;
  }

  const html = `<p class="note" style="margin:0">${rangeStr}</p>
    ${goalHtml}
    <label class="f"><span class="lbl">ملخص / درس الفترة (إيه اللي ساعدني أو عطلني؟)</span>
      <textarea class="fld" rows="3" data-role="pnote" data-pid="${id}" placeholder="اكتب سطر أو اتنين آخر الفترة…">${esc(p.note || '')}</textarea>
    </label>
    <div class="g-detacts">
      <button type="button" class="gh" data-act="pform">ابدأ فترة جديدة بهدف جديد</button>
    </div>`;
  const active = document.activeElement;
  if (active?.dataset?.role === 'pnote') return;
  setHtml(box, html);
}

// ---------- فورم فترة جديدة / تعديل فترة وهدفها ----------
export function periodFormSheet(pf) {
  const editing = !!pf.id;
  return {
    label: editing ? 'تعديل الفترة والهدف' : 'فترة جديدة',
    head: `<h2>${editing ? 'تعديل الفترة والهدف' : 'فترة جديدة'}</h2>`,
    body: `${!editing ? `<div><span class="lbl">مدة الفترة</span>
        <div class="picks" role="group" aria-label="مدة الفترة">
          ${[[7, '٧ أيام'], [11, '١١ يوم'], [14, '١٤ يوم'], [30, '٣٠ يوم'], [0, 'تواريخ مخصصة']].map(([n, l]) => `<button class="pk" type="button" data-act="pflen" data-v="${n}" data-keep aria-pressed="false">${l}</button>`).join('')}
        </div></div>` : ''}
      <div class="g2" data-out="pfdates">
        <label class="f"><span class="lbl">من</span><input class="fld" type="date" data-role="pffrom" value="${esc(pf.from)}"></label>
        <label class="f"><span class="lbl">لحد</span><input class="fld" type="date" data-role="pfto" value="${esc(pf.to)}"></label>
      </div>
      <label class="f"><span class="lbl">اسم الفترة (اختياري)</span>
        <input class="fld" data-role="pfname" autocomplete="off" placeholder="مثلاً: تظبيط النوم، سبرنت الشغل…" value="${esc(pf.name || '')}">
      </label>
      <div class="per">
        <span class="lbl">الهدف الواحد للفترة دي</span>
        <input class="fld" data-role="pgtitle" autocomplete="off" placeholder="مثلاً: أنام قبل ١٢، أخلّص موقع، أبطل سوشيال بالليل…" value="${esc(pf.gTitle || '')}">
        <span class="lbl" style="margin-top:6px">نوع الهدف</span>
        <div class="mode-grid2" role="group" aria-label="نوع هدف الفترة">
          ${PERIOD_GOAL_KINDS.map(([k, l, icon]) => `<button class="mopt" type="button" data-act="pgkind" data-v="${k}" data-keep aria-pressed="false">${ico(icon)}<span>${l}</span></button>`).join('')}
        </div>
        <div class="blk" data-out="pgsrc" style="margin-top:8px"></div>
        <div data-out="pgnums" style="margin-top:8px"></div>
      </div>`,
    foot: editing
      ? `<div class="foot2"><button class="b-sec" type="button" data-act="pdel" data-id="${esc(pf.id)}">امسح</button>
          <button class="b-pri" type="button" data-act="pfsave">احفظ الفترة</button></div>`
      : '<button class="b-pri" type="button" data-act="pfsave">ابدأ الفترة</button>',
  };
}

export function updatePeriodForm(sh, pf, s) {
  if (!sh || !pf) return;
  for (const b of sh.querySelectorAll('[data-act="pflen"]')) b.setAttribute('aria-pressed', +b.dataset.v === +pf.len);
  for (const b of sh.querySelectorAll('[data-act="pgkind"]')) b.setAttribute('aria-pressed', b.dataset.v === pf.gKind);
  const dates = sh.querySelector('[data-out="pfdates"]');
  if (dates) {
    dates.hidden = !pf.id && +pf.len > 0;
    const fIn = dates.querySelector('[data-role="pffrom"]');
    const tIn = dates.querySelector('[data-role="pfto"]');
    if (fIn && fIn !== document.activeElement) fIn.value = pf.from;
    if (tIn && tIn !== document.activeElement) tIn.value = pf.to;
  }

  const hs = activeHabits(s.settings);
  const srcBox = sh.querySelector('[data-out="pgsrc"]');
  let srcHtml = '';
  if (pf.gKind === 'build') {
    const opts = [
      ['manual', 'يدوي بدوسة يومية'],
      ['sleep', `هدف النوم (${fmtNum(s.settings.sleepTarget)} س)`],
      ['salah', 'الصلوات ٥/٥'],
      ...hs.map((h) => [`habit:${h.k}`, `عادة: ${h.n}`]),
      ...(s.metrics || []).map((m) => [`metric:${m.id}`, `مقياس: ${m.n}`]),
    ];
    srcHtml = `<div><span class="lbl">طريقة القياس</span><div class="picks">${opts.map(([v, l]) => `<button class="pk" type="button" data-act="pgsrc" data-v="${esc(v)}" data-keep aria-pressed="${pf.gSource === v}">${esc(l)}</button>`).join('')}</div></div>`;
  } else if (pf.gKind === 'quit') {
    const opts = [
      ['manual', 'متابعة يومية (نضيف / وقعت)'],
      ['screen', `سقف الشاشة (≤ ${fmtNum(s.settings.screenLimit)} س)`],
      ['distract', 'صفر ساعات تشتيت'],
    ];
    srcHtml = `<div><span class="lbl">طريقة القياس</span><div class="picks">${opts.map(([v, l]) => `<button class="pk" type="button" data-act="pgsrc" data-v="${esc(v)}" data-keep aria-pressed="${pf.gSource === v}">${esc(l)}</button>`).join('')}</div></div>`;
  } else if (pf.gKind === 'project') {
    const opts = [
      ['steps', 'خطوات فرعية (Checklist)'],
      ['work', 'تلقائي: ساعات الشغل'],
      ...(s.settings.projects || []).map((p) => [`proj:${p}`, `مشروع: ${p}`]),
      ['manual_num', 'رقم / وحدات يدوي'],
    ];
    srcHtml = `<div><span class="lbl">طريقة القياس</span><div class="picks">${opts.map(([v, l]) => `<button class="pk" type="button" data-act="pgsrc" data-v="${esc(v)}" data-keep aria-pressed="${pf.gSource === v}">${esc(l)}</button>`).join('')}</div></div>`;
    if (pf.gSource === 'steps' && !pf.id) {
      srcHtml += `<label class="f" style="margin-top:8px"><span class="lbl">خطوات المشروع (كل خطوة في سطر)</span>
        <textarea class="fld" rows="3" data-role="pgsteps" placeholder="الخطوة الأولى&#10;الخطوة التانية&#10;الخطوة التالتة">${esc(pf.gStepsText || '')}</textarea></label>`;
    }
  } else {
    // target
    const opts = [
      ['manual', 'تحديث رقمي يدوي'],
      ['work', 'تلقائي: ساعات الشغل'],
      ['spend', 'تلقائي: مصاريف الفترة'],
      ['income', 'تلقائي: دخل الفترة'],
      ...(s.metrics || []).map((m) => [`metric:${m.id}`, `مقياس: ${m.n}`]),
    ];
    srcHtml = `<div><span class="lbl">طريقة القياس</span><div class="picks">${opts.map(([v, l]) => `<button class="pk" type="button" data-act="pgsrc" data-v="${esc(v)}" data-keep aria-pressed="${pf.gSource === v}">${esc(l)}</button>`).join('')}</div></div>
      <div style="margin-top:6px"><span class="lbl">نوع الشرط</span>
      <div class="seg2">
        <button type="button" class="so${pf.gDir !== 'max' ? ' on' : ''}" data-act="pgdir" data-v="min" data-keep>وصول للرقم (≥)</button>
        <button type="button" class="so${pf.gDir === 'max' ? ' on' : ''}" data-act="pgdir" data-v="max" data-keep>سقف ما أعدّيهوش (≤)</button>
      </div></div>`;
  }
  setHtml(srcBox, srcHtml);

  const numBox = sh.querySelector('[data-out="pgnums"]');
  if (pf.gKind === 'project' && pf.gSource === 'steps') {
    setHtml(numBox, '');
  } else {
    const lbl = pf.gKind === 'build' ? 'عدد الأيام للنجاح' : pf.gKind === 'quit' ? 'عدد الأيام النضيفة للنجاح' : pf.gDir === 'max' ? 'السقف الأقصى' : 'الرقم المستهدف';
    setHtml(numBox, `<div class="g2">
        <label class="f"><span class="lbl">${lbl}</span><input class="fld" data-role="pgtarget" inputmode="decimal" autocomplete="off" placeholder="مثلاً ٩" value="${esc(pf.gTarget ?? '')}"></label>
        <label class="f"><span class="lbl">الوحدة</span><input class="fld" data-role="pgunit" autocomplete="off" placeholder="يوم / ساعة / ج" value="${esc(pf.gUnit ?? '')}"></label>
      </div>`);
  }
}

// ---------- فورم عادة جديدة / تعديل عادة ----------
export function habitFormSheet(hf, s) {
  const editing = !!hf.origK;
  const groups = s.settings.habitGroups || [];
  return {
    label: editing ? 'تعديل العادة' : 'عادة جديدة',
    head: `<h2>${editing ? 'تعديل العادة' : 'عادة جديدة'}</h2>`,
    body: `<label class="f"><span class="lbl">اسم العادة</span>
        <input class="fld" data-role="hfname" autocomplete="off" data-focus placeholder="مثلاً: قيام ليل، قراءة تقنية…" value="${esc(hf.n || '')}">
      </label>
      <div><span class="lbl">الركن</span>
        <div class="picks">${groups.map((g) => `<button class="pk" type="button" data-act="hfgrp" data-v="${esc(g.id)}" data-keep aria-pressed="${hf.g === g.id}">${esc(g.name)}</button>`).join('')}</div>
      </div>
      <label class="f"><span class="lbl">وحدة الرقم التفصيلي (اختياري — زي دقيقة أو صفحة)</span>
        <input class="fld" data-role="hfunit" autocomplete="off" placeholder="سيبها فاضية لو عادة بلمسة واحدة بس" value="${esc(hf.numU || '')}">
      </label>`,
    foot: editing
      ? `<div class="foot2"><button class="b-sec" type="button" data-act="hfdel">امسح</button>
          <button class="b-pri" type="button" data-act="hfsave">احفظ</button></div>`
      : '<button class="b-pri" type="button" data-act="hfsave">ضيف العادة</button>',
  };
}

// ---------- فورم ركن حياة جديد ----------
export function pillarFormSheet(grf) {
  return {
    label: 'ركن جديد',
    head: '<h2>ركن حياة جديد</h2>',
    body: `<label class="f"><span class="lbl">اسم الركن</span>
        <input class="fld" data-role="grfname" autocomplete="off" data-focus placeholder="مثلاً: العلاقات، المال، الإبداع…" value="${esc(grf.name || '')}">
      </label>
      <div><span class="lbl">الأيقونة</span>
        <div class="picks">${PILLAR_ICONS.map(([id, l]) => `<button class="bchip" type="button" data-act="grfico" data-v="${id}" data-keep aria-pressed="${grf.icon === id}"><span class="bic">${ico(id)}</span><span>${l}</span></button>`).join('')}</div>
      </div>`,
    foot: '<button class="b-pri" type="button" data-act="grfsave">ضيف الركن</button>',
  };
}

// ---------- فورم مجال وقت جديد / تعديل ----------
export function timeCatFormSheet(tcf) {
  const editing = !!tcf.origId;
  return {
    label: editing ? 'تعديل مجال وقت' : 'مجال وقت جديد',
    head: `<h2>${editing ? 'تعديل مجال وقت' : 'مجال وقت جديد'}</h2>`,
    body: `<label class="f"><span class="lbl">اسم المجال</span>
        <input class="fld" data-role="tcfname" autocomplete="off" data-focus placeholder="مثلاً: مشروع خاص، عائلة…" value="${esc(tcf.name || '')}">
      </label>
      <div><span class="lbl">الأيقونة</span>
        <div class="picks">${TIME_ICONS.map(([id, l]) => `<button class="bchip" type="button" data-act="tcfico" data-v="${id}" data-keep aria-pressed="${tcf.icon === id}"><span class="bic">${ico(id)}</span><span>${l}</span></button>`).join('')}</div>
      </div>
      <div><span class="lbl">اللون</span>
        <div class="picks">${TIME_CAT_COLORS.map((c) => `<button class="bchip tc-${c}" type="button" data-act="tcfcol" data-v="${c}" data-keep aria-pressed="${tcf.color === c}"><i class="cdot"></i><span>${c}</span></button>`).join('')}</div>
      </div>`,
    foot: editing && tcf.custom
      ? `<div class="foot2"><button class="b-sec" type="button" data-act="tcfdel">امسح</button>
          <button class="b-pri" type="button" data-act="tcfsave">احفظ</button></div>`
      : '<button class="b-pri" type="button" data-act="tcfsave">احفظ المجال</button>',
  };
}

// ---------- شاشة الإعدادات الرئيسية (أقسام Accordion مرتبة) ----------
export function settingsSheet() {
  return {
    label: 'الإعدادات',
    head: '<h2>الإعدادات</h2>',
    body: `<div class="sacc-list" data-out="sroot"></div>
      <input type="file" accept="application/json,.json" data-role="importfile" hidden>`,
    foot: '<button class="b-pri" type="button" data-close>تمام</button>',
  };
}

function syncCard(s, sx) {
  if (!sx.configured) {
    return '<div class="pad"><b>مش متظبطة لسه</b><span>كل حاجة محفوظة على الجهاز ده بس. المزامنة بين الموبايل واللابتوب محتاجة مشروع Supabase (الخطوات في README).</span></div>';
  }
  if (s.sync === 'signedout' || s.sync === 'off') {
    return `<div class="pad"><b>مش مسجّل دخول</b><span>كل حاجة محفوظة على الجهاز ده بس. ادخل بنفس الإيميل والباسورد على الموبايل واللابتوب، والاتنين هيبقوا نفس البيانات.</span>
      <form class="sform" data-act="slogin">
        <input class="fld" type="email" data-role="semail" inputmode="email" autocomplete="username" placeholder="الإيميل" aria-label="الإيميل" dir="ltr">
        <input class="fld" type="password" data-role="spass" autocomplete="current-password" placeholder="الباسورد" aria-label="الباسورد" dir="ltr">
        <div class="btns" style="margin-top:0"><button class="pri" type="submit">دخول</button><button type="button" data-act="ssignup">أول مرة؟ اعمل حساب</button></div>
      </form></div>`;
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

function accSection(id, title, sub, body, openSet) {
  const open = openSet.has(id);
  return `<section class="sacc${open ? ' open' : ''}">
      <button class="sacc-h" type="button" data-act="sacc" data-v="${id}" aria-expanded="${open}">
        <span class="sacc-t"><b>${title}</b><span>${sub}</span></span>
        <span class="sacc-ic">${ic(P.down2)}</span>
      </button>
      <div class="sacc-b"${open ? '' : ' hidden'}>${body}</div>
    </section>`;
}

export function updateSettings(root, s, ui, sx = { configured: false }, days = []) {
  const host = root?.querySelector('[data-out="sroot"]');
  if (!host) return;
  const active = document.activeElement;
  if (active && host.contains(active) && active.matches('input, textarea')) return; // ما نرسمش فوق خانة بيتكتب فيها

  const cfg = s.settings;
  const openSet = ui.accOpen || new Set(['period']);

  // ١. اليوم والأهداف
  const targetsHtml = `<div class="blk">
      <div><span class="lbl">بداية اليوم المنطقي</span>
        <div class="picks">${[3, 4, 5].map((h) => `<button class="pk" type="button" data-act="setdaystart" data-v="${h}" aria-pressed="${cfg.dayStart === h}">${fmtNum(h)} الفجر</button>`).join('')}</div>
      </div>
      <div class="g2">
        <label class="f"><span class="lbl">هدف النوم (ساعات)</span><input class="fld" data-setcfg="sleepTarget" inputmode="decimal" value="${esc(cfg.sleepTarget)}"></label>
        <label class="f"><span class="lbl">سقف الشاشة (ساعات)</span><input class="fld" data-setcfg="screenLimit" inputmode="decimal" value="${esc(cfg.screenLimit)}"></label>
      </div>
      <div class="g2">
        <label class="f"><span class="lbl">ميعاد النوم المستهدف</span><input class="fld" type="time" data-setcfg="sleepBed" value="${esc(cfg.sleepBed)}"></label>
        <label class="f"><span class="lbl">ميعاد الصحيان المستهدف</span><input class="fld" type="time" data-setcfg="sleepWake" value="${esc(cfg.sleepWake)}"></label>
      </div>
      <div class="card"><div class="srow">
        <span class="m"><b>ملء النوم تلقائياً في «الوقت»</b><span>يملى الساعات الفاضية أول ما تسجّل نمت وصحيت</span></span>
        <button class="sw" type="button" role="switch" data-act="settoggle" data-k="autoFillSleep" aria-checked="${!!cfg.autoFillSleep}" aria-label="ملء النوم تلقائياً"><i></i></button>
      </div></div>
      <div class="g2">
        <label class="f"><span class="lbl">هدف الشغل (ساعات/يوم)</span><input class="fld" data-setcfg="workTarget" inputmode="decimal" value="${esc(cfg.workTarget)}"></label>
        <label class="f"><span class="lbl">هدف التركيز العميق (س)</span><input class="fld" data-setcfg="deepTarget" inputmode="decimal" value="${esc(cfg.deepTarget)}"></label>
      </div>
      <label class="f"><span class="lbl">سقف/ميزانية الفترة أو الشهر (جنيه، ٠ = بدون سقف)</span>
        <input class="fld" data-setcfg="budget" inputmode="decimal" value="${esc(cfg.budget || '')}" placeholder="مثلاً ٥٠٠٠">
      </label>
    </div>`;

  // ٢. الفترة وهدف الفترة + الأرشيف
  const curP = periodOf(s.periods, s.today);
  const curEv = curP ? evalPeriodGoal(curP, { days, metrics: s.metrics, today: s.today, settings: cfg }) : null;
  const pastPeriods = (s.periods || []).filter((p) => p.id !== curP?.id).sort((a, b) => b.from.localeCompare(a.from));
  let periodHtml = '';
  if (curP) {
    const pd = periodDay(curP, s.today);
    periodHtml += `<div class="card"><div class="pad">
        <b>${esc(curP.name || periodLabel(curP))}</b>
        <span>${periodLabel(curP)} · يوم ${fmtNum(pd.n)} من ${fmtNum(pd.of)}${curEv ? ` · الهدف: ${esc(curEv.title)} (${fmtNum(curEv.pct)}٪)` : ''}</span>
        <div class="btns">
          <button type="button" data-act="pdetail" data-id="${esc(curP.id)}">التفاصيل والتقييم</button>
          <button type="button" data-act="pform" data-id="${esc(curP.id)}">تعديل</button>
        </div>
        <div class="btns" style="margin-top:6px"><button type="button" data-act="pform">ابدأ فترة جديدة بهدف</button></div>
      </div></div>`;
  } else {
    periodHtml += `<div class="card"><div class="pad">
        <b>مفيش فترة شغالة دلوقتي</b>
        <span>ابدأ فترة جديدة وحدد لها هدف واحد تقيس عليه نجاحها.</span>
        <div class="btns"><button class="pri" type="button" data-act="pform">ابدأ فترة جديدة بهدف</button></div>
      </div></div>`;
  }
  if (pastPeriods.length) {
    periodHtml += `<div class="grp"><span>أرشيف الفترات السابقة</span><span>${fmtNum(pastPeriods.length)}</span></div>
      <div class="card">${pastPeriods.map((p) => {
        const ev = evalPeriodGoal(p, { days, metrics: s.metrics, today: s.today, settings: cfg });
        const badge = ev ? `<span class="g-pct ${ev.status}">${ev.succeeded ? 'نجحت ✓' : `${fmtNum(ev.pct)}٪`}</span>` : '';
        return `<button class="srow srow-b" type="button" data-act="pdetail" data-id="${esc(p.id)}" style="width:100%;padding-inline:14px">
            <span class="m"><b>${esc(p.name || periodLabel(p))}</b><span>${periodLabel(p)}${ev ? ` · ${esc(ev.title)}` : ''}</span></span>
            ${badge}
          </button>`;
      }).join('')}</div>`;
  }

  // ٣. العادات والأركان
  const habitsHtml = `<div class="blk">
      ${cfg.habitGroups.map((g) => {
        const list = cfg.habits.filter((h) => h.g === g.id);
        return `<div class="grp"><span>${esc(g.name)}</span><span>${fmtNum(list.filter((x) => x.on !== false).length)}/${fmtNum(list.length)}</span></div>
          <div class="card">${list.map((h) => `<div class="srow${h.on === false ? ' off' : ''}">
            <button class="srow-b" type="button" data-act="hform" data-k="${esc(h.k)}"><span class="m"><b>${esc(h.n)}</b><span>${h.workout ? 'نوع + وقت + أرقام' : h.numU ? `مع رقم (${esc(h.numU)})` : 'تم / جزئي'}</span></span></button>
            <button class="sw" type="button" role="switch" data-act="htoggle" data-k="${esc(h.k)}" aria-checked="${h.on !== false}" aria-label="${esc(h.n)}"><i></i></button>
          </div>`).join('') || '<p class="empty-s">مفيش عادات في الركن ده.</p>'}</div>`;
      }).join('')}
      <div class="btns">
        <button type="button" data-act="hform">+ عادة جديدة</button>
        <button type="button" data-act="grfform">+ ركن جديد</button>
      </div>
    </div>`;

  // ٤. المشاريع والتصنيفات
  const chipRem = (list, act) => `<div class="picks">${list.map((x) => `<button class="pk" type="button" data-act="${act}" data-v="${esc(x)}" aria-label="امسح ${esc(x)}">${esc(x)} ×</button>`).join('')}</div>`;
  const catsHtml = `<div class="blk">
      <div class="grp"><span>المشاريع النشطة (chips في الشغل)</span><span>${fmtNum(cfg.projects.length)}</span></div>
      ${cfg.projects.length ? chipRem(cfg.projects, 'delproj') : '<p class="hint">ضيف مشاريعك الحالية تظهر كأزرار سريعة في الشغل.</p>'}
      <form class="addrow" data-act="addproj"><input class="fld" data-role="newproj" placeholder="اسم مشروع جديد…" autocomplete="off"><button class="addbtn" type="submit" aria-label="ضيف مشروع">${ic(P.plus)}</button></form>

      <div class="grp" style="margin-top:8px"><span>مجالات تاب الوقت</span><span>${fmtNum(cfg.timeCats.filter((x) => x.on !== false).length)}</span></div>
      <div class="card">${cfg.timeCats.map((c) => `<div class="srow${c.on === false ? ' off' : ''}">
        <button class="srow-b" type="button" data-act="tcform" data-id="${esc(c.id)}"><span class="m"><b>${esc(c.name)}</b></span></button>
        <button class="sw" type="button" role="switch" data-act="tctoggle" data-id="${esc(c.id)}" aria-checked="${c.on !== false}" aria-label="${esc(c.name)}"><i></i></button>
      </div>`).join('')}</div>
      <button type="button" class="gh" data-act="tcform">+ مجال وقت جديد</button>

      <div class="grp" style="margin-top:8px"><span>تصنيفات المصاريف</span><span>${fmtNum(cfg.expCats.length)}</span></div>
      ${chipRem(cfg.expCats, 'delexpcat')}
      <form class="addrow" data-act="addexpcat"><input class="fld" data-role="newexpcat" placeholder="تصنيف مصروف جديد…" autocomplete="off"><button class="addbtn" type="submit" aria-label="ضيف تصنيف">${ic(P.plus)}</button></form>

      <div class="grp" style="margin-top:8px"><span>تصنيفات الأفكار</span><span>${fmtNum(cfg.ideaCats.length)}</span></div>
      ${chipRem(cfg.ideaCats, 'delideacat')}
      <form class="addrow" data-act="addideacat"><input class="fld" data-role="newideacat" placeholder="تصنيف فكرة جديد…" autocomplete="off"><button class="addbtn" type="submit" aria-label="ضيف تصنيف">${ic(P.plus)}</button></form>
    </div>`;

  // ٥. البنود الأساسية ★ ومواعيدها
  const pers = periodsFor(cfg.dayStart);
  const starsHtml = `<div class="blk">
      <p class="hint">اقفل أي بند مش عايزه يظهر في «فاضل دلوقتي»، أو دوس على وقته عشان تغيّر يبدأ ناقص إمتى.</p>
      <div class="card">${STAR_ITEMS.map((st) => {
        const sc = cfg.stars[st.k] || { on: true, due: 0 };
        const pLbl = pers[sc.due]?.[1] || 'قبل النوم';
        return `<div class="srow${sc.on ? '' : ' off'}">
          <button class="srow-b" type="button" data-act="stardue" data-k="${st.k}"><span class="m"><b>${st.t}</b><span>يبدأ ناقص: ${pLbl} (دوس للتغيير)</span></span></button>
          <button class="sw" type="button" role="switch" data-act="startoggle" data-k="${st.k}" aria-checked="${!!sc.on}" aria-label="${st.t}"><i></i></button>
        </div>`;
      }).join('')}</div>
    </div>`;

  // ٦. مقاييسي
  const mGroups = groupMetrics(s.metrics);
  const metricsHtml = `<div class="blk">
      <div class="blk-h"><span>مقاييسك المخصصة</span><button class="addb" type="button" data-act="mform">${ic(P.plus)}مقياس</button></div>
      ${mGroups.map(([a, ms]) => `<div class="grp"><span>${esc(a)}</span><span>${fmtNum(ms.length)}</span></div>
        <div class="card">${ms.map((m) => `<div class="srow${m.on ? '' : ' off'}">
          <button class="srow-b" type="button" data-act="mform" data-id="${esc(m.id)}"><span class="m"><b>${esc(m.n)}</b><span>${metricDesc(m)}</span></span></button>
          <button class="sw" type="button" role="switch" data-act="mtoggle" data-id="${esc(m.id)}" aria-checked="${!!m.on}" aria-label="${esc(m.n)}: يبان في اليوم"><i></i></button>
        </div>`).join('')}</div>`).join('')}
      ${mGroups.length ? '' : '<p class="hint">لسه مفيش مقاييس. دوس "+ مقياس" فوق.</p>'}
    </div>`;

  // ٧. النسخة الاحتياطية والمزامنة
  const syncHtml = `<div class="blk">
      <div class="card"><div class="pad"><b>نسخة احتياطية</b><span>ملف JSON فيه كل أيامك وقوايمك وإعداداتك. الاستيراد بيدمج ومابيمسحش حاجة.</span>
        <div class="btns"><button type="button" data-act="export">تصدير JSON</button><button type="button" data-act="import">استيراد JSON</button></div>
      </div></div>
      <div class="card">${syncCard(s, sx)}</div>
    </div>`;

  const enabledStars = STAR_ITEMS.filter((st) => cfg.stars[st.k]?.on !== false).length;
  const html = [
    accSection('targets', 'اليوم والأهداف', `بداية ${fmtNum(cfg.dayStart)} ص · نوم ${fmtNum(cfg.sleepTarget)} س · شغل ${fmtNum(cfg.workTarget)} س`, targetsHtml, openSet),
    accSection('period', 'الفترة وهدف الفترة', curP ? (curEv ? `${curEv.title} (${fmtNum(curEv.pct)}٪)` : periodLabel(curP)) : 'مفيش فترة حالية', periodHtml, openSet),
    accSection('habits', 'العادات والأركان', `${fmtNum(activeHabits(cfg).length)} عادة في ${fmtNum(cfg.habitGroups.length)} أركان`, habitsHtml, openSet),
    accSection('cats', 'المشاريع والتصنيفات', `${fmtNum(cfg.projects.length)} مشروع · وقت · فلوس · أفكار`, catsHtml, openSet),
    accSection('stars', 'البنود الأساسية ★', `${fmtNum(enabledStars)} من ٨ مفعّلين`, starsHtml, openSet),
    accSection('metrics', 'مقاييسي', `${fmtNum((s.metrics || []).length)} مقياس`, metricsHtml, openSet),
    accSection('sync', 'النسخة الاحتياطية والمزامنة', sx.email ? `داخل بـ ${sx.email}` : 'تصدير / استيراد / Supabase', syncHtml, openSet),
  ].join('');

  setHtml(host, html);
  const em = root.querySelector('[data-role="semail"]');
  if (em && em !== document.activeElement && !em.value) em.value = ui.sf.email || '';
}
