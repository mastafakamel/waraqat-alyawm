// views/goals.js — نظام الأهداف المتكامل (تاب «الخطة» مع المهام + كارت التركيز في اليوم + تفاصيل الهدف + فورم جديد/تعديل).

import {
  HABIT_NUMS, GOAL_PILLARS, GOAL_MODES, GOAL_HORIZONS,
  activeHabits, activeTimeCats, allHabitLabel,
  fmtNum, fmtDays, todayTasks, isOverdue, shortDate,
} from '../logic.js';
import { esc, ic, ico, P, setHtml } from '../ui.js';

export const GOAL_PRESETS = [
  { t: '٤٠ ساعة شغل عميق في الفترة', p: 'work', m: 'time', src: { kind: 'work', c: 'work' }, hz: 'period', target: 40, unit: 'ساعة', f: true },
  { t: '٢٠ يوم تمرين الشهر ده', p: 'health', m: 'habit', src: { kind: 'days', k: 'ex' }, hz: 'month', target: 20, unit: 'يوم', f: true },
  { t: 'إنجاز مشروع بخطوات ومهام', p: 'growth', m: 'steps', hz: 'month', f: true, steps: ['تحديد أول خطوة', 'النسخة الأولى', 'المراجعة والإنهاء'] },
  { t: 'سقف مصاريف الأكل', p: 'work', m: 'metric', src: { kind: 'exp_cap', cat: 'أكل' }, hz: 'month', target: 3000, unit: 'ج', f: false },
];

const MODE_DESC = {
  habit: 'يتحدث تلقائياً لما تعلّم العادة في اليوم أو تكتب رقمها (مثل التمرين، الورد، الإنجليزي، الصلوات).',
  time: 'يتجمع تلقائياً من ساعات تاب «الوقت» أو ساعات «الشغل» والتركيز العميق.',
  metric: 'مربوط بمقياس من «مقاييسي» (تجميعي أو وصول لرقم زي الوزن) أو الدخل أو سقف مصاريف في «الفلوس».',
  steps: 'هدف مشروع بمراحل (Milestones) ومهام مربوطة من تاب «المهام».',
  manual: 'عدّاد مرن بتزوّده بنفسك (+١) زي عدد الكتب أو الكورسات.',
};

/** مفتاح التبديل فوق تبويبة «الخطة»: الأهداف | المهام */
export function planSwitch(s, ui) {
  const activeG = s.goals.filter((g) => !g.done).length;
  const openT = todayTasks(s.tasks, s.today, s.settings?.dayStart).filter((t) => !t.done).length;
  const isGoals = ui.planSub !== 'tasks';
  return `<div class="plan-top">
      <div class="seg-top" role="tablist" aria-label="أقسام الخطة">
        <button type="button" role="tab" class="${isGoals ? 'on' : ''}" data-act="plansub" data-v="goals" aria-selected="${isGoals}">الأهداف<span class="seg-cnt">${fmtNum(activeG)}</span></button>
        <button type="button" role="tab" class="${!isGoals ? 'on' : ''}" data-act="plansub" data-v="tasks" aria-selected="${!isGoals}">المهام<span class="seg-cnt">${fmtNum(openT)}</span></button>
      </div>
      ${isGoals ? `<button type="button" class="g-newbtn" data-act="gform">${ic(P.plus)}<span>هدف جديد</span></button>` : ''}
    </div>`;
}

export function goalValHtml(g, ev) {
  if (g.m === 'steps') return `${fmtNum(ev.cur)} <small>من ${fmtNum(ev.target)} خطوة</small>`;
  if (ev.isTargetMetric) {
    const start = g.start != null ? fmtNum(g.start) : '—';
    const cur = ev.cur != null ? fmtNum(ev.cur) : '—';
    return `${start} ← ${cur} <small>/ ${fmtNum(ev.target)}${ev.unit ? ` ${esc(ev.unit)}` : ''}</small>`;
  }
  return `${fmtNum(ev.cur)} <small>/ ${fmtNum(ev.target)}${ev.unit ? ` ${esc(ev.unit)}` : ''}</small>`;
}

function paceBarHtml(ev, tall = false) {
  const showTick = !ev.overdue && ev.timePct > 0 && ev.timePct < 100;
  return `<div class="pace-bar${tall ? ' tall' : ''}" aria-hidden="true">
      <div class="pace-fill${ev.status === 'attn' ? ' attn' : ''}" style="width:${ev.pct}%"></div>
      ${showTick ? `<span class="pace-tick" style="inset-inline-start:${ev.timePct}%"></span>` : ''}
    </div>`;
}

function quickActionHtml(g, ev, s) {
  const id = esc(g.id);
  const src = g.src || {};
  if (g.m === 'habit') {
    if (src.kind === 'days' && src.k) {
      const v = +s.day[src.k] || 0;
      const done = v === 2;
      const label = allHabitLabel(src.k, s.settings) || 'العادة';
      return `<button type="button" class="g-act${done ? ' done' : ' attn'}" data-act="ghabit" data-k="${esc(src.k)}">${done ? `${ic(P.check)}اتعملت النهارده` : `علّم ${esc(label)}`}</button>`;
    }
    if (src.kind === 'salah') {
      return `<button type="button" class="g-act" data-act="tab" data-tab="day">الصلوات${ic(P.chev)}</button>`;
    }
    return `<button type="button" class="g-act" data-act="sheet" data-sheet="habits">سجّل الرقم${ic(P.chev)}</button>`;
  }
  if (g.m === 'time') {
    if (src.kind === 'deep' || src.kind === 'proj') {
      return `<button type="button" class="g-act" data-act="sheet" data-sheet="work">سجّل شغل${ic(P.chev)}</button>`;
    }
    const cat = src.kind === 'work' ? 'work' : (src.c || 'work');
    return `<button type="button" class="g-act" data-act="timecat" data-c="${esc(cat)}">سجّل ساعة${ic(P.chev)}</button>`;
  }
  if (g.m === 'metric') {
    if (src.kind === 'income' || src.kind === 'exp_cap') {
      return `<button type="button" class="g-act" data-act="tab" data-tab="money">الفلوس${ic(P.chev)}</button>`;
    }
    const met = s.metrics.find((m) => String(m.id) === String(src.id));
    if (met?.t === 'count') {
      return `<button type="button" class="g-act" data-act="mplus" data-id="${esc(met.id)}">${ic(P.plus)}١ ${esc(met.u || '')}</button>`;
    }
    if (met) {
      return `<button type="button" class="g-act" data-act="medit" data-id="${esc(met.id)}">سجّل قراية${ic(P.chev)}</button>`;
    }
    return `<button type="button" class="g-act" data-act="gopen" data-id="${id}">التفاصيل${ic(P.chev)}</button>`;
  }
  if (g.m === 'manual') {
    return `<button type="button" class="g-act" data-act="ginc" data-id="${id}">${ic(P.plus)}١ ${esc(ev.unit || '')}</button>`;
  }
  return `<button type="button" class="g-act" data-act="gopen" data-id="${id}">التفاصيل${ic(P.chev)}</button>`;
}

function focusCardHtml(g, ev, s) {
  const id = esc(g.id);
  const nextLine = g.m === 'steps'
    ? `<span>الجاية: <b>${esc(ev.nextText)}</b></span>`
    : `<span>${esc(ev.horizonText || 'هدف نشط')}</span>`;

  return `<article class="gcard${ev.pct >= 100 && !ev.isCap ? ' done' : ''}">
      <div class="gcard-h">
        <span class="g-med">${ico(ev.pillar.icon)}</span>
        <button type="button" class="g-main" data-act="gopen" data-id="${id}" aria-label="تفاصيل الهدف: ${esc(g.t)}">
          <span class="g-title">${esc(g.t)}</span>
          <span class="g-src">${esc(ev.sourceLabel)}</span>
        </button>
        <span class="g-pct ${ev.status}">${fmtNum(ev.pct)}٪</span>
      </div>
      <div class="pace-wrap">
        ${g.m === 'steps' && ev.segs?.length
          ? `<div class="m-segs" style="grid-template-columns:repeat(${ev.segs.length},1fr)" aria-hidden="true">${ev.segs.map((on) => `<i class="${on ? 'on' : ''}"></i>`).join('')}</div>`
          : paceBarHtml(ev)}
        <div class="pace-meta">
          <span class="pace-val">${goalValHtml(g, ev)}</span>
          <span class="pace-tag ${ev.status}">${esc(ev.paceText)}</span>
        </div>
      </div>
      <div class="g-foot">
        <div class="g-next">${nextLine}</div>
        ${quickActionHtml(g, ev, s)}
      </div>
    </article>`;
}

function compactRowHtml(g, ev) {
  const id = esc(g.id);
  return `<div class="grow">
      <span class="g-med sm">${ico(ev.pillar.icon)}</span>
      <button type="button" class="grow-m" data-act="gopen" data-id="${id}" aria-label="تفاصيل الهدف: ${esc(g.t)}">
        <span class="grow-r1"><b>${esc(g.t)}</b><span class="${ev.status}">${fmtNum(ev.pct)}٪</span></span>
        ${paceBarHtml(ev)}
        <span class="grow-r2"><span>${goalValHtml(g, ev)}</span><span>${esc(ev.paceText)}</span></span>
      </button>
      ${g.m === 'manual' ? `<button type="button" class="g-incsm" data-act="ginc" data-id="${id}" aria-label="زوّد واحد">+١</button>` : ''}
    </div>`;
}

/** تبويبة الأهداف الكاملة (جوه تبويبة الخطة). */
export function renderGoals(s, ui, gsum) {
  const head = planSwitch(s, ui);
  if (!s.goals.length) {
    return `${head}
      <div class="empty g-empty">
        <b>لسه مفيش أهداف</b>
        <p>اربط أهدافك بعاداتك أو وقتك أو مهامك أو فلوسك — وكل تسجيل في يومك هيحرّك الهدف تلقائياً من غير تسجيل مكرر.</p>
        <div class="g-presets">
          ${GOAL_PRESETS.map((p, i) => `<button type="button" class="g-pre" data-act="gpreset" data-i="${i}">${ic(P.plus)}<span>${esc(p.t)}</span></button>`).join('')}
        </div>
      </div>`;
  }

  const pulse = `<section class="pulse" aria-label="ملخص الأهداف">
      <div class="gp-grid">
        <div class="gp-cell"><span class="gp-k">متوسط التقدّم</span><span class="gp-v">${fmtNum(gsum.avgPct)}٪</span><span class="gp-s">${fmtNum(gsum.active.length)} نشط</span></div>
        <div class="gp-cell"><span class="gp-k">على المسار</span><span class="gp-v done">${fmtNum(gsum.onTrack)}</span><span class="gp-s">ماشي كويس</span></div>
        <div class="gp-cell"><span class="gp-k">محتاج دفعة</span><span class="gp-v attn">${fmtNum(gsum.needPush)}</span><span class="gp-s">أبطأ من المعدّل</span></div>
      </div>
    </section>`;

  const filters = [
    ['all', `الكل (${fmtNum(gsum.active.length)})`],
    ['focus', 'تركيز دلوقتي'],
    ...GOAL_PILLARS.filter((p) => gsum.active.some((g) => g.p === p.id)).map((p) => [p.id, p.name]),
    ...(gsum.archived.length ? [['done', `الأرشيف (${fmtNum(gsum.archived.length)})`]] : []),
  ];
  const fcur = filters.some(([k]) => k === ui.gfilt) ? ui.gfilt : 'all';
  const filtBar = `<div class="pfilt" role="group" aria-label="فلترة الأهداف">${filters.map(([k, l]) => `<button type="button" class="pf" data-act="gfilt" data-v="${k}" aria-pressed="${fcur === k}">${l}</button>`).join('')}</div>`;

  let body = '';
  if (fcur === 'done') {
    body = `<div class="sec"><b>إنجازاتك المكتملة</b><span>${fmtNum(gsum.archived.length)}</span></div>
      <div class="pillars">${gsum.archived.map((g) => {
        const ev = gsum.evals.get(g.id);
        return `<article class="gcard done">
            <div class="gcard-h">
              <span class="g-med">${ico('trophy')}</span>
              <button type="button" class="g-main" data-act="gopen" data-id="${esc(g.id)}">
                <span class="g-title">${esc(g.t)}</span>
                <span class="g-src">${esc(ev.horizonText)} · ${esc(ev.sourceLabel)}</span>
              </button>
              <span class="g-pct done">١٠٠٪</span>
            </div>
            ${g.note ? `<p class="g-ref"><b>الدرس المستفاد:</b> ${esc(g.note)}</p>` : ''}
          </article>`;
      }).join('')}</div>`;
  } else {
    const filtered = gsum.active.filter((g) => (fcur === 'all' ? true : fcur === 'focus' ? g.f : g.p === fcur));
    const focusList = filtered.filter((g) => g.f);
    const otherList = filtered.filter((g) => !g.f);
    if (focusList.length) {
      body += `<div class="sec"><b>تركيز دلوقتي</b><span class="ask">${fmtNum(focusList.length)} مثبّت</span></div>
        <div class="pillars">${focusList.map((g) => focusCardHtml(g, gsum.evals.get(g.id), s)).join('')}</div>`;
    }
    if (otherList.length) {
      body += `<div class="sec"><b>${focusList.length ? 'أهداف تانية شغالة' : 'أهدافك النشطة'}</b><span class="mut">${fmtNum(otherList.length)}</span></div>
        <section class="ledger">${otherList.map((g) => compactRowHtml(g, gsum.evals.get(g.id))).join('')}</section>`;
    }
    if (!filtered.length) {
      body = '<div class="list"><p class="empty-s">مفيش أهداف في التصنيف ده دلوقتي.</p></div>';
    }
  }

  return `${head}${pulse}${filtBar}${body}`;
}

/** كارت «أهداف التركيز» جوه تبويبة اليوم (١ إلى ٣ أهداف فقط، بدون دوشة). */
export function focusGoalsToday(s, gsum) {
  if (!gsum?.focus?.length) return '';
  const rows = gsum.focus.map((g) => {
    const ev = gsum.evals.get(g.id);
    return `<button type="button" class="f-item" data-act="gopen" data-id="${esc(g.id)}" aria-label="${esc(g.t)}: ${fmtNum(ev.pct)}٪">
        <span class="f-top">
          <span class="f-name"><i class="f-dot${ev.status === 'attn' ? ' attn' : ''}" aria-hidden="true"></i><span>${esc(g.t)}</span></span>
          <span class="f-pct ${ev.status}">${fmtNum(ev.pct)}٪</span>
        </span>
        ${paceBarHtml(ev)}
        <span class="pace-meta">
          <span class="f-val">${goalValHtml(g, ev)}</span>
          <span class="pace-tag ${ev.status}">${esc(ev.paceText)}</span>
        </span>
      </button>`;
  }).join('');
  return `<div class="sec"><b>أهداف التركيز</b><span class="mut">${fmtNum(gsum.active.length)} نشط</span></div>
    <section class="ledger" aria-label="أهداف التركيز">
      ${rows}
      <button class="lnk" type="button" data-act="gplan">كل الأهداف${ic(P.chev)}</button>
    </section>`;
}

// ---------- شاشة تفاصيل الهدف ----------
export function goalDetailSheet(g, ev, s) {
  return {
    label: g.t,
    head: `<h2>${esc(g.t)}</h2>`,
    body: `<div class="gdet" data-out="gdet" data-gid="${esc(g.id)}"></div>`,
    foot: `<div class="foot2"><button class="b-sec" type="button" data-act="gform" data-id="${esc(g.id)}">تعديل</button>
      <button class="b-pri" type="button" data-close>تمام</button></div>`,
  };
}

export function updateGoalDetail(sh, g, ev, s) {
  const box = sh?.querySelector('[data-out="gdet"]');
  if (!box || !g || !ev) return;
  const id = esc(g.id);
  const steps = Array.isArray(g.steps) ? g.steps : [];

  const manualBox = g.m === 'manual' && !g.done ? `<div class="g-manrow">
      <span>التقدّم الحالي</span>
      <div class="g-manbtns">
        <button type="button" class="wk-nav" data-act="gdec" data-id="${id}" aria-label="نقص واحد">−</button>
        <b>${fmtNum(ev.cur)} ${esc(ev.unit)}</b>
        <button type="button" class="wk-nav" data-act="ginc" data-id="${id}" aria-label="زوّد واحد">${ic(P.plus)}</button>
      </div>
    </div>` : '';

  const stepsBox = g.m === 'steps' ? `<div class="blk">
      <div class="blk-h"><h3>المراحل (Milestones)</h3><span>${fmtNum(steps.filter((x) => x.done).length)}/${fmtNum(steps.length)}</span></div>
      ${steps.length ? `<div class="list">${steps.map((st) => `<div class="tk${st.done ? ' done' : ''}">
        <button class="tk-c" type="button" data-act="gstog" data-gid="${id}" data-sid="${esc(st.id)}" aria-pressed="${!!st.done}" aria-label="${esc(st.t)}"><i>${st.done ? ic(P.check) : ''}</i></button>
        <div class="tk-m"><span class="tk-t">${esc(st.t)}</span></div>
        <button class="ib" type="button" data-act="gsdel" data-gid="${id}" data-sid="${esc(st.id)}" aria-label="امسح المرحلة">${ic(P.close)}</button>
      </div>`).join('')}</div>` : '<p class="hint">لسه مفيش مراحل — ضيف أول خطوة تحت.</p>'}
      ${!g.done ? `<form class="addrow" data-act="gstepadd" data-gid="${id}">
        <input class="fld" data-role="gstepin" placeholder="+ مرحلة جديدة…" aria-label="مرحلة جديدة" autocomplete="off" enterkeyhint="done">
        <button class="addbtn" type="submit" aria-label="ضيف المرحلة">${ic(P.plus)}</button>
      </form>` : ''}
    </div>` : '';

  const linkedBox = `<div class="blk">
      <div class="blk-h"><h3>مهام مربوطة بالهدف</h3><span>${fmtNum(ev.linked.length)}</span></div>
      ${ev.linked.length ? `<div class="list">${ev.linked.map((t) => `<div class="tk${t.done ? ' done' : ''}${t.pri && !t.done ? ' pri' : ''}">
        <button class="tk-c" type="button" data-act="tdone" data-id="${esc(t.id)}" aria-pressed="${!!t.done}" aria-label="${esc(t.t)}"><i>${t.done ? ic(P.check) : ''}</i></button>
        <div class="tk-m"><span class="tk-t">${esc(t.t)}</span>${isOverdue(t, s.today) ? `<span class="tk-s">${ic(P.clock)}متأخرة من ${shortDate(t.due)}</span>` : ''}</div>
      </div>`).join('')}</div>` : '<p class="hint">مفيش مهام مربوطة لسه. أي مهمة تضيفها هنا هتظهر في «مهام النهارده».</p>'}
      ${!g.done ? `<form class="addrow" data-act="gtaskadd" data-gid="${id}">
        <input class="fld" data-role="gtaskin" placeholder="+ مهمة للنهارده جوه الهدف…" aria-label="مهمة جديدة للهدف" autocomplete="off" enterkeyhint="done">
        <button class="addbtn" type="submit" aria-label="ضيف المهمة">${ic(P.plus)}</button>
      </form>` : ''}
    </div>`;

  const noteBox = g.done && g.note ? `<p class="g-ref"><b>الدرس المستفاد:</b> ${esc(g.note)}</p>` : '';

  const acts = `<div class="g-detacts">
      ${!g.done ? `<button type="button" class="gh${g.f ? ' on' : ''}" data-act="gfocus" data-id="${id}">${g.f ? '★ مثبّت في تركيز اليوم' : '☆ ثبّته في تركيز اليوم'}</button>` : ''}
      ${g.done
        ? `<button type="button" class="gh" data-act="greopen" data-id="${id}">رجّعه هدف نشط</button>`
        : `<button type="button" class="gh done" data-act="garchopen" data-id="${id}">إقفال وأرشفة ✓</button>`}
      <button type="button" class="gh" data-act="gdel" data-id="${id}">امسح الهدف</button>
    </div>`;

  const html = `<div class="panel g-detsum">
      <div class="gcard-h">
        <span class="g-med">${ico(g.done ? 'trophy' : ev.pillar.icon)}</span>
        <div class="g-main"><span class="g-src">${esc(ev.sourceLabel)}</span><span class="g-src">${esc(ev.horizonText)}${!g.done && ev.daysLeft > 0 ? ` · فاضل ${fmtDays(ev.daysLeft)}` : ''}</span></div>
        <span class="g-pct ${ev.status}">${fmtNum(ev.pct)}٪</span>
      </div>
      ${paceBarHtml(ev, true)}
      <div class="pace-meta">
        <span class="pace-val">${goalValHtml(g, ev)}</span>
        <span class="pace-tag ${ev.status}">${esc(ev.paceText)}</span>
      </div>
    </div>
    ${noteBox}${manualBox}${stepsBox}${linkedBox}${acts}`;
  setHtml(box, html);
}

// ---------- شاشة إقفال وأرشفة الهدف ----------
export function goalArchiveSheet(g) {
  return {
    label: 'إقفال وأرشفة الهدف',
    head: '<h2>إقفال وأرشفة الهدف</h2>',
    body: `<p class="note" style="margin:0"><b>${esc(g.t)}</b></p>
      <label class="f"><span class="lbl">سطر للذكرى (اختياري): إيه اللي نجّح الهدف أو عطّله؟</span>
        <textarea class="fld" rows="3" data-focus data-role="gnote" placeholder="مثلاً: تخصيص ساعة بعد الفجر كان أسهل بكتير…">${esc(g.note || '')}</textarea>
      </label>`,
    foot: `<div class="foot2"><button class="b-sec" type="button" data-close>إلغاء</button>
      <button class="b-pri" type="button" data-act="garchsave" data-id="${esc(g.id)}">انقله للإنجازات ✓</button></div>`,
  };
}

// ---------- فورم هدف جديد / تعديل ----------
export function goalFormSheet(f) {
  const editing = !!f.id;
  return {
    label: editing ? 'عدّل الهدف' : 'هدف جديد',
    head: `<h2>${editing ? 'عدّل الهدف' : 'هدف جديد'}</h2>`,
    body: `<label class="f"><span class="lbl">اسم الهدف</span>
        <input class="fld" data-role="gtitle" autocomplete="off" placeholder="مثلاً: ٤٠ ساعة شغل عميق في الفترة" value="${esc(f.t)}">
      </label>
      <div><span class="lbl">يتقاس إزاي؟</span>
        <div class="mode-grid" role="group" aria-label="طريقة القياس">
          ${GOAL_MODES.map(([k, l, icon]) => `<button class="mopt" type="button" data-act="gfmode" data-v="${k}" data-keep aria-pressed="false">${ico(icon)}<span>${l}</span></button>`).join('')}
        </div>
        <p class="hint" data-out="gfdesc" style="margin-top:6px"></p>
      </div>
      <div class="blk" data-out="gfsrc"></div>
      <div><span class="lbl">الركن</span>
        <div class="picks" role="group" aria-label="الركن">
          ${GOAL_PILLARS.map((p) => `<button class="pk" type="button" data-act="gfpil" data-v="${p.id}" data-keep aria-pressed="false">${p.name}</button>`).join('')}
        </div>
      </div>
      <div><span class="lbl">المدة</span>
        <div class="picks" role="group" aria-label="المدة">
          ${GOAL_HORIZONS.map(([k, l]) => `<button class="pk" type="button" data-act="gfhz" data-v="${k}" data-keep aria-pressed="false">${l}</button>`).join('')}
        </div>
        <div class="g2" data-out="gfdates" style="margin-top:8px" hidden>
          <label class="f"><span class="lbl">من</span><input class="fld" type="date" data-role="gffrom" value="${esc(f.from)}"></label>
          <label class="f"><span class="lbl">لحد</span><input class="fld" type="date" data-role="gfto" value="${esc(f.to)}"></label>
        </div>
      </div>
      <div data-out="gfnums"></div>
      <div class="srow" style="padding-inline:4px;min-height:48px">
        <span class="m"><b>تثبيت في «أهداف التركيز»</b><span>يظهر في شاشة اليوم (يفضّل ١–٣ أهداف)</span></span>
        <button class="sw" type="button" role="switch" data-act="gffoc" data-keep aria-checked="${!!f.f}" aria-label="تثبيت في أهداف التركيز"><i></i></button>
      </div>`,
    foot: editing
      ? `<div class="foot2"><button class="b-sec" type="button" data-act="gdel" data-id="${esc(f.id)}">امسح</button>
          <button class="b-pri" type="button" data-act="gfsave">احفظ التعديل</button></div>`
      : '<button class="b-pri" type="button" data-act="gfsave">ضيف الهدف</button>',
  };
}

export function updateGoalForm(sh, f, s) {
  if (!sh || !f) return;
  const desc = sh.querySelector('[data-out="gfdesc"]');
  if (!desc) return;

  for (const b of sh.querySelectorAll('[data-act="gfmode"]')) b.setAttribute('aria-pressed', b.dataset.v === f.m);
  for (const b of sh.querySelectorAll('[data-act="gfpil"]')) b.setAttribute('aria-pressed', b.dataset.v === f.p);
  for (const b of sh.querySelectorAll('[data-act="gfhz"]')) b.setAttribute('aria-pressed', b.dataset.v === f.hz);
  sh.querySelector('[data-act="gffoc"]')?.setAttribute('aria-checked', !!f.f);
  desc.textContent = MODE_DESC[f.m] || '';

  const dates = sh.querySelector('[data-out="gfdates"]');
  if (dates) dates.hidden = f.hz !== 'custom';

  // مصدر القياس حسب النوع
  const srcBox = sh.querySelector('[data-out="gfsrc"]');
  let srcHtml = '';
  if (f.m === 'habit') {
    const hKind = f.src.kind || 'days';
    srcHtml = `<div><span class="lbl">نوع العادة</span><div class="picks">
        <button class="pk" type="button" data-act="gfhkind" data-v="days" data-keep aria-pressed="${hKind === 'days'}">أيام التزام</button>
        <button class="pk" type="button" data-act="gfhkind" data-v="sum" data-keep aria-pressed="${hKind === 'sum'}">رقم العادة (صفحات/دقايق)</button>
        <button class="pk" type="button" data-act="gfhkind" data-v="salah" data-keep aria-pressed="${hKind === 'salah'}">الصلوات في وقتها</button>
      </div></div>`;
    if (hKind === 'days') {
      srcHtml += `<div><span class="lbl">اختار العادة</span><div class="picks">${activeHabits(s.settings).map((h) => `<button class="pk" type="button" data-act="gfsrc" data-k="k" data-v="${esc(h.k)}" data-keep aria-pressed="${f.src.k === h.k}">${esc(h.n)}</button>`).join('')}</div></div>`;
    } else if (hKind === 'sum') {
      srcHtml += `<div><span class="lbl">اختار الرقم</span><div class="picks">${HABIT_NUMS.map(([k, l]) => `<button class="pk" type="button" data-act="gfsrc" data-k="k" data-v="${k}" data-keep aria-pressed="${f.src.k === k}">${l}</button>`).join('')}</div></div>`;
    }
  } else if (f.m === 'time') {
    const tKind = f.src.kind || 'cat';
    srcHtml = `<div><span class="lbl">المصدر</span><div class="picks">
        <button class="pk" type="button" data-act="gftkind" data-v="cat" data-keep aria-pressed="${tKind === 'cat' || tKind === 'work'}">مجال وقت</button>
        <button class="pk" type="button" data-act="gftkind" data-v="deep" data-keep aria-pressed="${tKind === 'deep'}">تركيز عميق</button>
        <button class="pk" type="button" data-act="gftkind" data-v="proj" data-keep aria-pressed="${tKind === 'proj'}">مشروع محدد</button>
      </div></div>`;
    if (tKind === 'cat' || tKind === 'work') {
      const curC = tKind === 'work' ? 'work' : (f.src.c || 'work');
      srcHtml += `<div><span class="lbl">المجال</span><div class="picks">${activeTimeCats(s.settings).map((c) => `<button class="pk" type="button" data-act="gfsrc" data-k="c" data-v="${esc(c.id)}" data-keep aria-pressed="${curC === c.id}">${esc(c.name)}</button>`).join('')}</div></div>`;
    } else if (tKind === 'proj') {
      srcHtml += `<label class="f"><span class="lbl">اسم المشروع (نفس الاسم في الشغل)</span><input class="fld" data-role="gfproj" autocomplete="off" placeholder="مثلاً: ورقة اليوم" value="${esc(f.src.proj || '')}"></label>`;
    }
  } else if (f.m === 'metric') {
    const mKind = f.src.kind || (s.metrics.length ? 'sum' : 'income');
    srcHtml = `<div><span class="lbl">المصدر</span><div class="picks">
        ${s.metrics.length ? `<button class="pk" type="button" data-act="gfmkind" data-v="sum" data-keep aria-pressed="${mKind === 'sum'}">مجموع مقياس</button>
          <button class="pk" type="button" data-act="gfmkind" data-v="target" data-keep aria-pressed="${mKind === 'target'}">وصول لقيمة (زي الوزن)</button>` : ''}
        <button class="pk" type="button" data-act="gfmkind" data-v="income" data-keep aria-pressed="${mKind === 'income'}">دخل الفلوس</button>
        <button class="pk" type="button" data-act="gfmkind" data-v="exp_cap" data-keep aria-pressed="${mKind === 'exp_cap'}">سقف مصاريف</button>
      </div></div>`;
    if ((mKind === 'sum' || mKind === 'target') && s.metrics.length) {
      srcHtml += `<div><span class="lbl">اختار المقياس</span><div class="picks">${s.metrics.map((m) => `<button class="pk" type="button" data-act="gfsrc" data-k="id" data-v="${esc(m.id)}" data-keep aria-pressed="${String(f.src.id) === String(m.id)}">${esc(m.n)}</button>`).join('')}</div></div>`;
    } else if (mKind === 'exp_cap') {
      srcHtml += `<div><span class="lbl">تصنيف المصاريف</span><div class="picks">
          <button class="pk" type="button" data-act="gfsrc" data-k="cat" data-v="" data-keep aria-pressed="${!f.src.cat}">كل المصاريف</button>
          ${(s.settings.expCats || []).map((c) => `<button class="pk" type="button" data-act="gfsrc" data-k="cat" data-v="${esc(c)}" data-keep aria-pressed="${f.src.cat === c}">${esc(c)}</button>`).join('')}
        </div></div>`;
    }
  } else if (f.m === 'steps' && !f.id) {
    srcHtml = `<label class="f"><span class="lbl">الخطوات الأولية (كل خطوة في سطر — اختياري)</span>
        <textarea class="fld" rows="3" data-role="gfsteps" placeholder="الخطوة الأولى&#10;الخطوة التانية&#10;الخطوة التالتة">${esc(f.stepsText || '')}</textarea>
      </label>`;
  }
  setHtml(srcBox, srcHtml);

  // خانات المستهدف والوحدة (إلا في المراحل)
  const numBox = sh.querySelector('[data-out="gfnums"]');
  let numHtml = '';
  if (f.m !== 'steps') {
    const isTarget = f.m === 'metric' && f.src.kind === 'target';
    numHtml = `<div class="g2">
        ${isTarget ? `<label class="f"><span class="lbl">البداية (الرقم الحالي)</span><input class="fld" data-role="gfstart" inputmode="decimal" autocomplete="off" placeholder="مثلاً ٨٤" value="${esc(f.start ?? '')}"></label>` : ''}
        <label class="f"><span class="lbl">${f.m === 'metric' && f.src.kind === 'exp_cap' ? 'السقف الأقصى' : 'المستهدف'}</span><input class="fld" data-role="gftarget" inputmode="decimal" autocomplete="off" placeholder="مثلاً ٢٠" value="${esc(f.target ?? '')}"></label>
        ${!isTarget ? `<label class="f"><span class="lbl">الوحدة</span><input class="fld" data-role="gfunit" autocomplete="off" placeholder="ساعة / يوم / ج" value="${esc(f.unit ?? '')}"></label>` : ''}
      </div>`;
  }
  setHtml(numBox, numHtml);
}
