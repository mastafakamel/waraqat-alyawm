// views/goals.js — نظام الفلتر والربط الموحّد:
// المجال ← هدف (ليه) ← مشروع (واحد بس شغّال) ← مهمة النهاردة (٣ بالكتير)
// والعادات الصغيرة بتخدم المجال مباشرة من غير هدف تحتها، والباقي مجمّد مش ممسوح.

import {
  TODAY_TASK_LIMIT, activeLifeAreas, activeTimeCats, itemKind, itemStatus,
  isBacklogGoal, backlogAgeText, hasGoalTarget, fmtRemTime,
  fmtNum, fmtDays, isOverdue, shortDate, periodOf,
} from '../logic.js';
import { esc, ic, ico, P, setHtml } from '../ui.js';

export const LIFE_AREA_ICONS = [
  ['brief', 'شغل'],
  ['star', 'ديني'],
  ['heart', 'صحة'],
  ['users', 'علاقات'],
  ['book', 'تعلم'],
  ['wallet', 'مال'],
  ['home', 'بيت وحياة'],
  ['spark', 'إبداع'],
  ['compass', 'تطوير'],
  ['target', 'مشاريع'],
  ['moon', 'نوم وهدوء'],
  ['rest', 'راحة'],
];

export const FILTER_KINDS = [
  ['habit',   'عادة صغيرة', 'check',  'بتتكرر وصغيرة وتخدم المجال مباشرة (مش محتاجة هدف تحتها).'],
  ['goal',    'هدف (ليه؟)', 'compass', 'الاتجاه أو السبب جوه المجال — المشاريع هي اللي بتحققه.'],
  ['project', 'مشروع',      'target', 'له نتيجة ونهاية وبيحقق هدف. القاعدة: مشروع واحد بس شغّال.'],
  ['task',    'مهمة',       'tasks',  'خطوة مرة واحدة. القاعدة: ٣ مهام بالكتير للنهاردة من الشغّال.'],
];

function countWord(n, one, two, few, many) {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${fmtNum(n)} ${n <= 10 ? few : many}`;
}

/** شريط التنقل فوق تبويبة «الخطة»: دلوقتي | المجمّد | المجالات + زرار «+ الفلتر» */
export function planSwitch(sys, ui) {
  const cur = String(ui.planView || 'now');
  const tabCur = cur.startsWith('area:') ? 'areas' : cur;
  return `<div class="plan-top">
      <div class="seg-top seg-top3" role="tablist" aria-label="أقسام الخطة">
        <button type="button" role="tab" class="${tabCur === 'now' ? 'on' : ''}" data-act="planview" data-v="now" aria-selected="${tabCur === 'now'}">دلوقتي</button>
        <button type="button" role="tab" class="${tabCur === 'frozen' ? 'on' : ''}" data-act="planview" data-v="frozen" aria-selected="${tabCur === 'frozen'}">المجمّد<span class="seg-cnt">${fmtNum(sys.frozenTotal)}</span></button>
        <button type="button" role="tab" class="${tabCur === 'areas' ? 'on' : ''}" data-act="planview" data-v="areas" aria-selected="${tabCur === 'areas'}">المجالات<span class="seg-cnt">${fmtNum(sys.areas.length)}</span></button>
      </div>
      <button type="button" class="g-newbtn" data-act="fltform">${ic(P.plus)}<span>الفلتر</span></button>
    </div>`;
}

/** شريط تذكير مراجعة نهاية الفترة (يظهر عند نهاية الفترة لما يكون في مشاريع/أهداف مجمّدة). */
export function reviewBannerHtml(rev) {
  if (!rev?.due) return '';
  const pName = rev.period?.name ? ` «${rev.period.name}»` : '';
  const head = rev.reason === 'last_day'
    ? `آخر يوم في الفترة${pName}`
    : `انتهت الفترة${pName}`;
  const sub = `عندك ${countWord(rev.count, 'حاجة واحدة مجمّدة', 'حاجتين مجمّدين', 'حاجات مجمّدة', 'حاجة مجمّدة')} — راجعهم واختار إيه يتفتح دلوقتي.`;
  return `<section class="rev-ban" aria-label="مراجعة نهاية الفترة">
      <div class="rev-ban-h">
        <span class="g-med sm attn">${ico('inbox')}</span>
        <div class="rev-ban-m">
          <b>${esc(head)} · وقت المراجعة</b>
          <span>${esc(sub)}</span>
        </div>
      </div>
      <div class="rev-ban-acts">
        <button type="button" class="g-act attn" data-act="grevstart">ابدأ المراجعة (${fmtNum(rev.count)})${ic(P.chev)}</button>
        <button type="button" class="rev-skip" data-act="grevdone" data-pid="${esc(rev.period?.id || '')}">مش دلوقتي</button>
      </div>
    </section>`;
}

/** السلسلة البصرية: المجال ← الهدف (ليه) */
function chainCrumbs(area, goal) {
  return `<div class="chain-crumbs">
      <span class="apill on">${ico(area.icon)}<span>${esc(area.name)}</span></span>
      ${goal ? `<span class="chain-arr" aria-hidden="true">←</span><button type="button" class="apill chain-gbtn" data-act="fltedit" data-id="${esc(goal.id)}">${esc(goal.t)}</button>` : ''}
    </div>`;
}

function projectProgressHtml(project, ev) {
  const steps = Array.isArray(project.steps) ? project.steps : [];
  if (project.m && project.m !== 'steps' && ev && ev.target > 0) {
    return `<div class="pace-wrap">
        <div class="pace-bar" aria-hidden="true"><div class="pace-fill${ev.status === 'attn' ? ' attn' : ''}" style="width:${ev.pct}%"></div></div>
        <div class="pace-meta">
          <span class="pace-val">${fmtNum(ev.cur)} <small>/ ${fmtNum(ev.target)} ${esc(ev.unit || '')}</small></span>
          <span class="pace-tag ${ev.status}">${fmtNum(ev.pct)}٪</span>
        </div>
      </div>`;
  }
  const doneCnt = steps.filter((x) => x.done).length + (ev?.linked?.filter((t) => t.done).length || 0);
  const total = steps.length + (ev?.linked?.length || 0);
  if (!total) return '';
  const pct = Math.round((doneCnt / total) * 100);
  return `<div class="pace-wrap">
      <div class="m-segs" style="grid-template-columns:repeat(${Math.min(total, 12)},1fr)" aria-hidden="true">
        ${Array.from({ length: Math.min(total, 12) }, (_, i) => `<i class="${i < Math.round((doneCnt / total) * Math.min(total, 12)) ? 'on' : ''}"></i>`).join('')}
      </div>
      <div class="pace-meta">
        <span class="pace-val">${fmtNum(doneCnt)} <small>من ${fmtNum(total)} خطوة ومهمة</small></span>
        <span class="pace-tag done">${fmtNum(pct)}٪</span>
      </div>
    </div>`;
}

/** كارت «المشروع الواحد الشغّال دلوقتي» (يظهر في اليوم والخطة). */
export function activeProjectToday(s, sys) {
  const ch = sys?.activeChain;
  if (!ch) {
    if (!sys?.frozenProjects?.length) return '';
    return `<section class="panel now-empty-card" aria-label="المشروع الشغّال">
        <div class="gcard-h">
          <span class="g-med sm">${ico('target')}</span>
          <div class="g-main">
            <span class="g-title">مفيش مشروع شغّال دلوقتي</span>
            <span class="g-src">عندك ${countWord(sys.frozenProjects.length, 'مشروع واحد مجمّد', 'مشروعين مجمّدين', 'مشاريع مجمّدة', 'مشروع مجمّد')} مستني دوره</span>
          </div>
          <button type="button" class="g-act attn" data-act="planfrozen">افتح واحد${ic(P.chev)}</button>
        </div>
      </section>`;
  }
  const { project: p, goal, area, ev, nextStep } = ch;
  const id = esc(p.id);
  const firstOpenStep = Array.isArray(p.steps) ? p.steps.find((x) => !x.done) : null;
  const actBtn = firstOpenStep
    ? `<button type="button" class="g-act attn" data-act="gstog" data-gid="${id}" data-sid="${esc(firstOpenStep.id)}">${ic(P.check)}خلّصت الخطوة</button>`
    : `<button type="button" class="g-act" data-act="gopen" data-id="${id}">التفاصيل${ic(P.chev)}</button>`;

  return `<div class="sec"><b>المشروع الشغّال دلوقتي</b><span class="mut">١ فقط للتركيز</span></div>
    <article class="gcard chain-card" aria-label="المشروع الشغّال دلوقتي">
      ${chainCrumbs(area, goal)}
      <button type="button" class="g-main chain-head" data-act="gopen" data-id="${id}">
        <span class="chain-title">${esc(p.t)}</span>
        ${p.outcome ? `<span class="chain-out">النتيجة: ${esc(p.outcome)}</span>` : ''}
      </button>
      ${projectProgressHtml(p, ev)}
      <div class="g-foot">
        <div class="g-next">${nextStep ? `الجاية: <b>${esc(nextStep)}</b>` : 'ضيف خطوات أو مهام للنهاردة'}</div>
        ${actBtn}
      </div>
    </article>`;
}

/** التوافق مع الاستيراد القديم في today.js إن وُجد. */
export const focusGoalsToday = activeProjectToday;

function taskRowHtml(t, today, projMap, inFrozen = false) {
  const late = !t.done && isOverdue(t, today);
  const proj = t.goalId ? projMap.get(String(t.goalId)) : null;
  const actionBtn = t.done
    ? ''
    : inFrozen
      ? `<button class="g-act sm" type="button" data-act="tactivate" data-id="${esc(t.id)}" aria-label="انقلها للنهاردة">للنهاردة${ic(P.up)}</button>`
      : `<button class="ib" type="button" data-act="tfreeze" data-id="${esc(t.id)}" aria-label="جمّد المهمة لبعدين">${ic(P.down)}</button>`;
  return `<div class="tk${t.done ? ' done' : ''}${t.pri && !t.done ? ' pri' : ''}">
      <button class="tk-c" type="button" data-act="tdone" data-id="${esc(t.id)}" aria-pressed="${!!t.done}" aria-label="${t.done ? 'رجّعها مفتوحة' : 'علّم إنها خلصت'}: ${esc(t.t)}"><i>${t.done ? ic(P.check) : ''}</i></button>
      <button class="tk-m tk-editb" type="button" data-act="tedit" data-id="${esc(t.id)}" aria-label="عدّل المهمة: ${esc(t.t)}">
        <span class="tk-t">${t.pri && !t.done ? '<span class="flag" aria-label="مهم">⚑</span>' : ''}${esc(t.t)}</span>
        <span class="tk-tags">
          ${proj ? `<span class="g-tag">${ico('target')}<span>${esc(proj.t)}</span></span>` : ''}
          ${t.cat ? `<span class="tcat">${esc(t.cat)}</span>` : ''}
          ${late ? `<span class="tk-s">${ic(P.clock)}متأخرة من ${shortDate(t.due)}</span>` : ''}
        </span>
      </button>
      ${actionBtn}
      <button class="ib" type="button" data-act="tdel" data-id="${esc(t.id)}" aria-label="امسح المهمة">${ic(P.close)}</button>
    </div>`;
}

// ---------- شاشة ١: «دلوقتي» (المشروع الواحد + ٣ مهام بالكتير + العادات الصغيرة) ----------
function renderNowView(s, sys) {
  const projMap = new Map((s.goals || []).map((g) => [String(g.id), g]));
  const ch = sys.activeChain;

  // ١. المشروع الشغّال دلوقتي (١ فقط)
  let projSection = '';
  if (ch) {
    const { project: p, goal, area, ev } = ch;
    const id = esc(p.id);
    const steps = Array.isArray(p.steps) ? p.steps : [];
    const openSteps = steps.filter((x) => !x.done);
    projSection = `<div class="sec"><b>المشروع الشغّال دلوقتي</b><span class="ask">١ من ١</span></div>
      <article class="gcard chain-card">
        ${chainCrumbs(area, goal)}
        <div class="gcard-h">
          <button type="button" class="g-main" data-act="gopen" data-id="${id}">
            <span class="chain-title">${esc(p.t)}</span>
            ${p.outcome ? `<span class="chain-out">النتيجة: ${esc(p.outcome)}</span>` : ''}
            ${goal?.why ? `<span class="g-src">ليه: ${esc(goal.why)}</span>` : ''}
          </button>
          <button type="button" class="ib" data-act="gopen" data-id="${id}" aria-label="تفاصيل المشروع">${ic(P.chev)}</button>
        </div>
        ${projectProgressHtml(p, ev)}
        ${openSteps.length ? `<div class="mini-steps">${openSteps.slice(0, 3).map((st) => `<div class="tk">
            <button class="tk-c" type="button" data-act="gstog" data-gid="${id}" data-sid="${esc(st.id)}" aria-pressed="false" aria-label="${esc(st.t)}"><i></i></button>
            <div class="tk-m"><span class="tk-t">${esc(st.t)}</span></div>
          </div>`).join('')}</div>` : ''}
        <div class="chain-acts">
          <button type="button" class="g-act done" data-act="garchopen" data-id="${id}">${ic(P.check)}خلّصت المشروع</button>
          <button type="button" class="g-act" data-act="gfreeze" data-id="${id}">جمّده مؤقتاً</button>
          <button type="button" class="g-act" data-act="gopen" data-id="${id}">الخطوات${ic(P.chev)}</button>
        </div>
      </article>`;
  } else {
    projSection = `<div class="sec"><b>المشروع الشغّال دلوقتي</b><span class="mut">٠ من ١</span></div>
      <div class="empty g-empty">
        <b>مفيش مشروع شغّال دلوقتي</b>
        <p>القاعدة بسيطة: <b>مشروع كبير واحد بس</b> شغّال في المرة، والباقي مجمّد مش ممسوح — ولما يخلص تفتح اللي بعده.</p>
        <div class="btns" style="margin-top:12px">
          ${sys.frozenProjects.length
            ? `<button type="button" class="pri" data-act="planview" data-v="frozen">افتح مشروع من المجمّد (${fmtNum(sys.frozenProjects.length)})</button>`
            : `<button type="button" class="pri" data-act="fltform" data-kind="project" data-st="active">+ ابدأ أول مشروع بالفلتر</button>`}
          <button type="button" data-act="fltform" data-kind="project" data-st="frozen">+ اركن مشروع مجمّد</button>
        </div>
      </div>`;
  }

  // لو في مشاريع شغّالة زيادة من بيانات قديمة
  const extraWarn = sys.extraActiveProjects.length
    ? `<section class="panel extra-warn">
        <b>عندك ${countWord(sys.extraActiveProjects.length, 'مشروع تاني مفتوح', 'مشروعين تانيين مفتوحين', 'مشاريع تانية مفتوحة', 'مشروع تاني مفتوح')}</b>
        <p class="hint" style="margin:0">عشان التركيز مايتشتتش، يفضّل تجمّد الزيادة وتخلي مشروع واحد بس شغّال دلوقتي.</p>
        <div class="list">${sys.extraActiveProjects.map(({ project: ep, area: ea }) => `<div class="srow">
          <button class="srow-b" type="button" data-act="gopen" data-id="${esc(ep.id)}"><span class="m"><b>${esc(ep.t)}</b><span>${esc(ea.name)}</span></span></button>
          <button class="g-act sm attn" type="button" data-act="gfreeze" data-id="${esc(ep.id)}">جمّده</button>
        </div>`).join('')}</div>
      </section>` : '';

  // ٢. مهام النهاردة (٣ مهام بالكتير من الشغّال)
  const overCap = sys.todayOpen.count > TODAY_TASK_LIMIT;
  const atCap = sys.todayOpen.count >= TODAY_TASK_LIMIT;
  const capCls = overCap ? 'ask' : atCap ? 'ok' : '';
  const tasksBody = sys.todayOpen.list.length
    ? `<div class="list">${sys.todayOpen.list.map((t) => taskRowHtml(t, s.today, projMap, false)).join('')}</div>`
    : `<div class="list"><p class="empty-s">${sys.todayDone.length ? 'خلّصت مهام النهاردة كلها ✓' : 'مفيش مهام للنهاردة — اختار لحد ٣ مهام من الشغّال بس.'}</p></div>`;

  const todayDoneBox = sys.todayDone.length
    ? `<details class="done-det"><summary>خلّصت النهاردة (${fmtNum(sys.todayDone.length)})</summary>
        <div class="list">${sys.todayDone.map((t) => taskRowHtml(t, s.today, projMap, false)).join('')}</div>
      </details>` : '';

  const tasksSection = `<div class="sec">
      <b>مهام النهاردة</b>
      <span class="${capCls}">${fmtNum(sys.todayOpen.count)} من ${fmtNum(TODAY_TASK_LIMIT)}${overCap ? ' · فوق الحد' : atCap ? ' · كفاية للنهاردة' : ''}</span>
    </div>
    ${tasksBody}
    <div class="now-tacts">
      <button type="button" class="gh full" data-act="fltform" data-kind="task" data-st="active">${ic(P.plus)} ${atCap ? 'ضيف أو بدّل مهمة للنهاردة (حد ٣)' : 'مهمة جديدة للنهاردة'}</button>
    </div>
    ${todayDoneBox}`;

  // ٣. أهداف بقياس (تتحدّث تلقائي من العادات/الوقت أو عدّاد يدوي — من غير ما تكسر قاعدة المشروع الواحد)
  const trackedSection = sys.trackedGoals.length
    ? `<div class="sec"><b>أهداف بقياس</b><span class="mut">${fmtNum(sys.trackedGoals.length)} · تتحدّث من يومك</span></div>
      <section class="panel tgoal-list" aria-label="أهداف بقياس">
        ${sys.trackedGoals.map(({ goal: g, area, ev }) => {
          const gid = esc(g.id);
          const isMan = g.m === 'manual';
          const canDone = ev.pct >= 100;
          return `<div class="grow">
            <span class="g-med sm${canDone ? ' ok' : ''}">${ico(area.icon)}</span>
            <button type="button" class="grow-m" data-act="fltedit" data-id="${gid}">
              <span class="grow-r1">
                <b>${esc(g.t)}</b>
                <span class="${ev.status}">${fmtNum(ev.pct)}٪</span>
              </span>
              <div class="pace-bar" aria-hidden="true"><div class="pace-fill${ev.status === 'attn' ? ' attn' : ''}" style="width:${ev.pct}%"></div></div>
              <span class="grow-r2">
                <span>${fmtNum(ev.cur)} / ${fmtNum(ev.target)} ${esc(ev.unit || '')}</span>
                <span>${esc(ev.sourceLabel)}</span>
              </span>
            </button>
            ${isMan ? `<button type="button" class="g-incsm" data-act="ginc" data-id="${gid}" aria-label="زوّد ١ على ${esc(g.t)}">+١</button>` : ''}
            ${canDone ? `<button type="button" class="g-incsm done" data-act="garchopen" data-id="${gid}" aria-label="أرشف الهدف المكتمل ${esc(g.t)}">${ic(P.check)}</button>` : ''}
          </div>`;
        }).join('')}
      </section>` : '';

  // ٤. العادات الصغيرة الشغّالة (تخدم المجال مباشرة)
  const areasWithHabits = sys.areas.filter((a) => a.activeHabits.length > 0);
  const totalActHabits = areasWithHabits.reduce((sum, a) => sum + a.activeHabits.length, 0);
  const habitsSection = `<div class="sec"><b>العادات الصغيرة الشغّالة</b><span class="mut">${fmtNum(totalActHabits)} · دوس لتعديل الميعاد</span></div>
    ${areasWithHabits.length ? `<section class="panel hab-overview">
      ${areasWithHabits.map(({ area, activeHabits: hs }) => `<div class="hab-ov-grp">
        <div class="hab-ov-h"><span class="apill on">${ico(area.icon)}<span>${esc(area.name)}</span></span></div>
        <div class="hab-ov-chips">${hs.map((h) => habitChipHtml(h)).join('')}</div>
      </div>`).join('')}
      <button type="button" class="lnk" data-act="fltform" data-kind="habit" data-st="active">${ic(P.plus)} عادة صغيرة جديدة${ic(P.chev)}</button>
    </section>` : `<div class="list"><p class="empty-s">مفيش عادات شغّالة دلوقتي. <button type="button" class="bk-link" data-act="fltform" data-kind="habit" data-st="active">+ ضيف عادة</button></p></div>`}`;

  return `${projSection}${extraWarn}${tasksSection}${trackedSection}${habitsSection}`;
}

function habitChipHtml(h) {
  const rem = h.rem ? `<small class="hchip-t">${fmtRemTime(h.rem)}</small>` : '';
  return `<span class="hchip"><button type="button" class="hchip-btn" data-act="hform" data-k="${esc(h.k)}" aria-label="عدّل عادة ${esc(h.n)}"><span>${esc(h.n)}</span>${rem}</button><button type="button" class="hchip-frz" data-act="hfreeze" data-k="${esc(h.k)}" aria-label="جمّد عادة ${esc(h.n)}">جمّد</button></span>`;
}

// ---------- شاشة ٢: «المجمّد» (مش ممسوح — بيتفتح لما حاجة تخلص) ----------
function renderFrozenView(s, ui, sys, rev) {
  const projMap = new Map((s.goals || []).map((g) => [String(g.id), g]));
  const ftype = ui.ftype || 'all';
  const farea = ui.farea || 'all';

  const doneTotal = sys.completedProjects.length + sys.completedGoals.length;
  const typeTabs = [
    ['all', `الكل (${fmtNum(sys.frozenTotal)})`],
    ['project', `مشاريع (${fmtNum(sys.frozenProjects.length)})`],
    ['goal', `أهداف (${fmtNum(sys.frozenGoals.length)})`],
    ['task', `مهام (${fmtNum(sys.frozenTasks.length)})`],
    ['habit', `عادات (${fmtNum(sys.frozenHabits.length)})`],
    ...(doneTotal ? [['done', `المكتمل (${fmtNum(doneTotal)})`]] : []),
  ];
  const curType = typeTabs.some(([k]) => k === ftype) ? ftype : 'all';

  const topBar = `<div class="bk-bar">
      ${(sys.frozenProjects.length + sys.frozenGoals.length) > 0
        ? `<button type="button" class="g-act${rev?.due ? ' attn' : ''}" data-act="grevstart">${ico('inbox')}<span>جلسة مراجعة (${fmtNum(sys.frozenProjects.length + sys.frozenGoals.length)})</span></button>`
        : ''}
      <button type="button" class="g-act" data-act="fltform" data-st="frozen">${ic(P.plus)}<span>اركن في المجمّد</span></button>
    </div>
    <div class="pfilt" role="group" aria-label="نوع المجمّد">
      ${typeTabs.map(([k, l]) => `<button type="button" class="pf" data-act="ftype" data-v="${k}" aria-pressed="${curType === k}">${l}</button>`).join('')}
    </div>`;

  if (curType === 'done') {
    const projCards = sys.completedProjects.map(({ project: p, goal, area }) => `<article class="gcard done">
        ${chainCrumbs(area, goal)}
        <div class="gcard-h">
          <span class="g-med ok">${ico('trophy')}</span>
          <button type="button" class="g-main" data-act="gopen" data-id="${esc(p.id)}">
            <span class="g-title">${esc(p.t)}</span>
            ${p.outcome ? `<span class="g-src">${esc(p.outcome)}</span>` : ''}
          </button>
          <span class="g-pct done">خلص ✓</span>
        </div>
        ${p.note ? `<p class="g-ref"><b>الدرس المستفاد:</b> ${esc(p.note)}</p>` : ''}
      </article>`).join('');
    const goalCards = sys.completedGoals.map((g) => {
      const ev = sys.evals.get(g.id);
      return `<article class="gcard done">
        <div class="gcard-h">
          <span class="g-med ok">${ico('trophy')}</span>
          <button type="button" class="g-main" data-act="fltedit" data-id="${esc(g.id)}">
            <span class="g-title">${esc(g.t)}</span>
            <span class="g-src">${esc(ev?.pillar?.name || '')}${hasGoalTarget(g) ? ` · ${fmtNum(g.target)} ${esc(ev?.unit || g.unit || '')}` : ''}</span>
          </button>
          <span class="g-pct done">تم ✓</span>
        </div>
        ${g.note ? `<p class="g-ref"><b>ملحوظة:</b> ${esc(g.note)}</p>` : ''}
      </article>`;
    }).join('');
    const doneHtml = `<div class="sec"><b>اللي خلصته</b><span>${fmtNum(doneTotal)}</span></div>
      <div class="pillars">${projCards}${goalCards}</div>`;
    return `${topBar}${doneHtml}`;
  }

  const areaBar = sys.areas.length > 1 && sys.frozenTotal > 0
    ? `<div class="pfilt sub-filt" role="group" aria-label="فلترة بالمجال">
        <button type="button" class="pf" data-act="farea" data-v="all" aria-pressed="${farea === 'all'}">كل المجالات</button>
        ${sys.areas.map((a) => `<button type="button" class="pf" data-act="farea" data-v="${esc(a.area.id)}" aria-pressed="${farea === a.area.id}">${esc(a.area.name)}</button>`).join('')}
      </div>` : '';

  const byArea = (areaId) => farea === 'all' || areaId === farea;
  const fProjs = (curType === 'all' || curType === 'project') ? sys.frozenProjects.filter((x) => byArea(x.area.id)) : [];
  const fGoals = (curType === 'all' || curType === 'goal') ? sys.frozenGoals.filter((x) => byArea(x.area.id)) : [];
  const fTasks = (curType === 'all' || curType === 'task')
    ? sys.frozenTasks.filter((t) => {
      if (farea === 'all') return true;
      const pr = t.goalId ? projMap.get(String(t.goalId)) : null;
      return pr?.p === farea || t.p === farea;
    }) : [];
  const fHabits = (curType === 'all' || curType === 'habit') ? sys.frozenHabits.filter((x) => byArea(x.area.id)) : [];

  let sections = '';
  if (fProjs.length) {
    sections += `<div class="sec"><b>مشاريع مجمّدة</b><span class="ask">${fmtNum(fProjs.length)}</span></div>
      <div class="pillars">${fProjs.map(({ project: p, goal, area }) => {
        const age = backlogAgeText(p.at, s.today, s.settings?.dayStart);
        return `<article class="gcard bkcard${p.pri ? ' pri' : ''}">
          ${chainCrumbs(area, goal)}
          <div class="gcard-h">
            <button type="button" class="g-main" data-act="fltedit" data-id="${esc(p.id)}">
              <span class="g-title">${p.pri ? '<span class="flag" aria-label="أولوية">⚑</span>' : ''}${esc(p.t)}</span>
              <span class="g-src">${p.outcome ? `النتيجة: ${esc(p.outcome)}` : (age ? `مجمّد ${esc(age)}` : 'مشروع مجمّد')}</span>
            </button>
            <button type="button" class="ib" data-act="gdel" data-id="${esc(p.id)}" aria-label="امسح المشروع">${ic(P.close)}</button>
          </div>
          ${p.why ? `<p class="bk-why">${esc(p.why)}</p>` : ''}
          <div class="g-foot">
            <button type="button" class="bk-link" data-act="fltedit" data-id="${esc(p.id)}">تعديل</button>
            <button type="button" class="g-act attn" data-act="gunfreeze" data-id="${esc(p.id)}">شغّله دلوقتي${ic(P.arrowUpLeft)}</button>
          </div>
        </article>`;
      }).join('')}</div>`;
  }

  if (fGoals.length) {
    sections += `<div class="sec"><b>أهداف مجمّدة (ليه؟)</b><span>${fmtNum(fGoals.length)}</span></div>
      <div class="pillars">${fGoals.map(({ goal: g, area }) => `<article class="gcard bkcard">
        <div class="gcard-h">
          <span class="g-med sm">${ico(area.icon)}</span>
          <button type="button" class="g-main" data-act="fltedit" data-id="${esc(g.id)}">
            <span class="g-title">${esc(g.t)}</span>
            <span class="g-src">${esc(area.name)} · هدف مجمّد</span>
          </button>
          <button type="button" class="ib" data-act="gdel" data-id="${esc(g.id)}" aria-label="امسح الهدف">${ic(P.close)}</button>
        </div>
        ${g.why ? `<p class="bk-why">ليه: ${esc(g.why)}</p>` : ''}
        <div class="g-foot">
          <button type="button" class="bk-link" data-act="fltform" data-kind="project" data-p="${esc(area.id)}" data-parent="${esc(g.id)}">+ مشروع للهدف ده</button>
          <button type="button" class="g-act" data-act="gunfreeze" data-id="${esc(g.id)}">فعّل الهدف</button>
        </div>
      </article>`).join('')}</div>`;
  }

  if (fTasks.length) {
    sections += `<div class="sec"><b>مهام مجمّدة / لبعدين</b><span>${fmtNum(fTasks.length)}</span></div>
      <div class="list">${fTasks.map((t) => taskRowHtml(t, s.today, projMap, true)).join('')}</div>`;
  }

  if (fHabits.length) {
    sections += `<div class="sec"><b>عادات مجمّدة (محفوظ تاريخها)</b><span>${fmtNum(fHabits.length)}</span></div>
      <div class="list">${fHabits.map(({ habit: h, area }) => `<div class="srow">
        <span class="g-med sm" style="margin-inline-end:8px">${ico(area.icon)}</span>
        <span class="m"><b>${esc(h.n)}</b><span>${esc(area.name)} · مجمّدة</span></span>
        <button type="button" class="g-act sm done" data-act="hunfreeze" data-k="${esc(h.k)}">رجّعها شغّالة</button>
      </div>`).join('')}</div>`;
  }

  if (!sections) {
    sections = `<div class="empty g-empty">
        <b>مفيش حاجة مجمّدة هنا</b>
        <p>أي مشروع أو هدف أو عادة مش وقتهم دلوقتي اركنهم هنا بدل ما تمسحهم أو تزحم يومك بيهم — ولما حاجة تخلص تفتحهم.</p>
      </div>`;
  }

  return `${topBar}${areaBar}${sections}`;
}

// ---------- شاشة ٣: «المجالات» (خريطة الحياة + شجرة كل مجال) ----------
function renderAreasMap(sys) {
  const cards = sys.areas.map((entry) => {
    const { area, activeHabits, goals, standaloneProjects, hasActiveProject, activeProject, frozenCount } = entry;
    const aid = esc(area.id);
    const totalProjects = goals.reduce((a, x) => a + x.projects.length, 0) + standaloneProjects.length;
    const mid = hasActiveProject && activeProject
      ? `<div class="area-now-strip"><i class="f-dot" aria-hidden="true"></i><span>شغّال دلوقتي: <b>${esc(activeProject.project.t)}</b></span></div>`
      : `<p class="area-empty-line">${activeHabits.length
        ? `${countWord(activeHabits.length, 'عادة واحدة شغّالة', 'عادتين شغّالين', 'عادات شغّالة', 'عادة شغّالة')} بتخدم المجال مباشرة`
        : 'دوس عشان ترتّب العادات والأهداف والمشاريع في المجال ده'}</p>`;
    return `<article class="gcard acard${hasActiveProject ? ' has-now' : ''}">
        <div class="gcard-h">
          <span class="g-med${hasActiveProject ? ' ok' : ''}">${ico(area.icon)}</span>
          <button type="button" class="g-main" data-act="planview" data-v="area:${aid}" aria-label="افتح مجال ${esc(area.name)}">
            <span class="g-title">${esc(area.name)}</span>
            <span class="g-src">${area.note ? esc(area.note) : 'المجال ← أهداف ← مشاريع + عادات'}</span>
          </button>
          <button type="button" class="ib" data-act="laform" data-id="${aid}" aria-label="عدّل مجال ${esc(area.name)}">${ic(P.edit)}</button>
        </div>
        ${mid}
        <div class="acard-foot">
          <div class="acard-pills">
            <span class="apill${activeHabits.length ? ' on' : ''}">عادات ${fmtNum(activeHabits.length)}</span>
            <span class="apill${goals.length ? ' on' : ''}">أهداف ${fmtNum(goals.length)}</span>
            <span class="apill${frozenCount ? ' attn' : ''}">مشاريع ${fmtNum(totalProjects)}</span>
          </div>
          <button type="button" class="acard-open${hasActiveProject ? ' done' : ''}" data-act="planview" data-v="area:${aid}">افتح${ic(P.chev)}</button>
        </div>
      </article>`;
  }).join('');

  return `<div class="sec"><b>خريطة مجالات حياتك</b><span>${fmtNum(sys.areas.length)} مجالات</span></div>
    <div class="pillars">${cards}</div>
    <button type="button" class="gh full" data-act="laform">${ic(P.plus)} أضف مجال جديد</button>`;
}

function renderAreaTree(entry, sys) {
  const { area, activeHabits, frozenHabits, goals, standaloneProjects, completedProjects } = entry;
  const aid = esc(area.id);

  const topBar = `<div class="adet-top">
      <button type="button" class="adet-back" data-act="planview" data-v="areas">${ic(P.prev)}<span>كل المجالات</span></button>
      <button type="button" class="adet-ed" data-act="laform" data-id="${aid}">${ic(P.edit)}<span>تعديل المجال</span></button>
    </div>`;

  const hero = `<section class="panel adet-hero">
      <div class="gcard-h">
        <span class="g-med">${ico(area.icon)}</span>
        <div class="g-main">
          <span class="g-title">${esc(area.name)}</span>
          <span class="g-src">${area.note ? esc(area.note) : 'عادات مباشرة + أهداف (ليه) ← مشاريع'}</span>
        </div>
      </div>
      <div class="adet-acts">
        <button type="button" class="g-act" data-act="fltform" data-p="${aid}" data-kind="habit">+ عادة للمجال</button>
        <button type="button" class="g-act attn" data-act="fltform" data-p="${aid}" data-kind="goal">+ هدف / مشروع</button>
      </div>
    </section>`;

  // ١. العادات (تخدم المجال مباشرة من غير هدف تحتها)
  const habBlock = `<div class="sec"><b>عادات المجال (مباشرة)</b><span>${fmtNum(activeHabits.length)} شغّالة</span></div>
    <section class="panel hab-overview">
      ${activeHabits.length ? `<div class="hab-ov-chips">${activeHabits.map((h) => habitChipHtml(h)).join('')}</div>`
        : '<p class="hint" style="margin:0">مفيش عادات شغّالة في المجال ده لسه.</p>'}
      ${frozenHabits.length ? `<div class="hab-frz-row"><span class="hint" style="margin:0">مجمّدة:</span>${frozenHabits.map((h) => `<button type="button" class="hchip muted" data-act="hunfreeze" data-k="${esc(h.k)}">${esc(h.n)} ↺</button>`).join('')}</div>` : ''}
    </section>`;

  // ٢. الأهداف (ليه) ← وتحت كل هدف مشاريعه
  const projRow = ({ project: p, ev, openTasks }) => {
    const isAct = itemStatus(p) === 'active';
    return `<div class="tree-proj${isAct ? ' is-now' : ''}">
        <button type="button" class="tree-proj-m" data-act="gopen" data-id="${esc(p.id)}">
          <span class="tree-proj-r1">
            <b>${esc(p.t)}</b>
            <span class="apill ${isAct ? 'done' : ''}">${isAct ? 'شغّال دلوقتي' : 'مجمّد'}</span>
          </span>
          ${p.outcome ? `<span class="g-src">النتيجة: ${esc(p.outcome)}</span>` : ''}
          ${openTasks.length ? `<span class="g-src">${countWord(openTasks.length, 'مهمة مفتوحة', 'مهمتين مفتوحين', 'مهام مفتوحة', 'مهمة مفتوحة')}</span>` : (ev?.pct > 0 ? `<span class="g-src">تقدّم ${fmtNum(ev.pct)}٪</span>` : '')}
        </button>
        ${isAct
          ? `<button type="button" class="g-act sm" data-act="gfreeze" data-id="${esc(p.id)}">جمّده</button>`
          : `<button type="button" class="g-act sm attn" data-act="gunfreeze" data-id="${esc(p.id)}">شغّله</button>`}
      </div>`;
  };

  let goalsBlock = `<div class="sec"><b>الأهداف (ليه؟) ومشاريعها</b><span>${fmtNum(goals.length)}</span></div>`;
  if (goals.length) {
    goalsBlock += `<div class="pillars">${goals.map(({ goal: g, projects }) => {
      const isFrz = itemStatus(g) === 'frozen';
      const tracked = !isFrz && hasGoalTarget(g);
      const ev = tracked ? sys?.evals?.get(g.id) : null;
      const trackHtml = ev ? `<div class="tgoal-in">
          <div class="pace-wrap">
            <div class="pace-bar" aria-hidden="true"><div class="pace-fill${ev.status === 'attn' ? ' attn' : ''}" style="width:${ev.pct}%"></div></div>
            <div class="pace-meta">
              <span class="pace-val">${fmtNum(ev.cur)} <small>/ ${fmtNum(ev.target)} ${esc(ev.unit || '')}</small></span>
              <span class="pace-tag ${ev.status}">${fmtNum(ev.pct)}٪ · ${esc(ev.sourceLabel)}</span>
            </div>
          </div>
          ${g.m === 'manual' ? `<button type="button" class="g-incsm" data-act="ginc" data-id="${esc(g.id)}" aria-label="زوّد ١ على ${esc(g.t)}">+١</button>` : ''}
          ${ev.pct >= 100 ? `<button type="button" class="g-incsm done" data-act="garchopen" data-id="${esc(g.id)}" aria-label="أرشف الهدف المكتمل">${ic(P.check)}</button>` : ''}
        </div>` : '';
      return `<article class="gcard tree-goal">
          <div class="gcard-h">
            <span class="g-med sm">${ico('compass')}</span>
            <button type="button" class="g-main" data-act="fltedit" data-id="${esc(g.id)}">
              <span class="g-title">${esc(g.t)}</span>
              <span class="g-src">${g.why ? `ليه: ${esc(g.why)}` : (isFrz ? 'هدف مجمّد' : 'هدف نشط')}</span>
            </button>
            <button type="button" class="g-act sm" data-act="${isFrz ? 'gunfreeze' : 'gfreeze'}" data-id="${esc(g.id)}">${isFrz ? 'فعّل' : 'جمّد'}</button>
          </div>
          ${trackHtml}
          ${projects.length ? `<div class="tree-children">${projects.map(projRow).join('')}</div>` : (!tracked ? '<p class="hint" style="margin:0">لسه مفيش مشروع مربوط بالهدف ده.</p>' : '')}
          <button type="button" class="lnk" data-act="fltform" data-kind="project" data-p="${aid}" data-parent="${esc(g.id)}">${ic(P.plus)} مشروع يحقق الهدف ده${ic(P.chev)}</button>
        </article>`;
    }).join('')}</div>`;
  } else {
    goalsBlock += `<div class="list"><p class="empty-s">مفيش أهداف في «${esc(area.name)}» لسه. ضيف هدف (ليه) واربط بيه مشروع يحققه.</p></div>`;
  }

  const standaloneBlock = standaloneProjects.length
    ? `<div class="sec"><b>مشاريع في المجال ده (بدون هدف مربوط)</b><span>${fmtNum(standaloneProjects.length)}</span></div>
      <div class="panel tree-children">${standaloneProjects.map(projRow).join('')}</div>` : '';

  const doneBlock = completedProjects.length
    ? `<div class="sec"><b>مشاريع خلصت هنا</b><span>${fmtNum(completedProjects.length)}</span></div>
      <div class="list">${completedProjects.map(({ project: p }) => `<button type="button" class="srow srow-b" data-act="gopen" data-id="${esc(p.id)}" style="width:100%;padding-inline:14px">
        <span class="g-med sm ok" style="margin-inline-end:8px">${ico('trophy')}</span>
        <span class="m"><b>${esc(p.t)}</b>${p.outcome ? `<span>${esc(p.outcome)}</span>` : ''}</span>
      </button>`).join('')}</div>` : '';

  return `${topBar}${hero}${habBlock}${goalsBlock}${standaloneBlock}${doneBlock}`;
}

/** التبويبة الموحدة «الخطة»: دلوقتي · المجمّد · المجالات */
export function renderPlan(s, ui, sys, rev = null) {
  const head = planSwitch(sys, ui);
  const ban = reviewBannerHtml(rev);
  const view = String(ui.planView || 'now');

  const pulse = `<section class="pulse" aria-label="ملخص النظام">
      <div class="gp-grid">
        <button type="button" class="gp-cell gp-btn" data-act="planview" data-v="now" style="border-inline-start:0">
          <span class="gp-k">مشروع شغّال</span>
          <span class="gp-v ${sys.activeProject ? 'done' : ''}">${sys.activeProject ? '١' : '٠'}<small>/١</small></span>
          <span class="gp-s">${sys.activeProject ? 'مركز عليه' : 'فاضي'}</span>
        </button>
        <button type="button" class="gp-cell gp-btn" data-act="planview" data-v="now">
          <span class="gp-k">مهام النهاردة</span>
          <span class="gp-v ${sys.todayOpen.count > TODAY_TASK_LIMIT ? 'attn' : 'done'}">${fmtNum(sys.todayOpen.count)}<small>/${fmtNum(TODAY_TASK_LIMIT)}</small></span>
          <span class="gp-s">${sys.todayOpen.count >= TODAY_TASK_LIMIT ? 'الحد الأقصى' : 'من الشغّال'}</span>
        </button>
        <button type="button" class="gp-cell gp-btn" data-act="planview" data-v="frozen">
          <span class="gp-k">المجمّد</span>
          <span class="gp-v${rev?.due ? ' attn' : ''}">${fmtNum(sys.frozenTotal)}</span>
          <span class="gp-s">${rev?.due ? 'وقت المراجعة' : 'محفوظ لبعدين'}</span>
        </button>
      </div>
    </section>`;

  if (view.startsWith('area:')) {
    const aid = view.slice(5);
    const entry = sys.areas.find((x) => x.area.id === aid);
    if (entry) return `${head}${renderAreaTree(entry, sys)}`;
  }
  if (view === 'frozen') return `${head}${ban}${pulse}${renderFrozenView(s, ui, sys, rev)}`;
  if (view === 'areas') return `${head}${ban}${pulse}${renderAreasMap(sys)}`;
  return `${head}${ban}${pulse}${renderNowView(s, sys)}`;
}

// ---------- شاشة الفلتر السريع (٣ أسئلة بس: المجال؟ · النوع؟ · الحالة؟) ----------
export function filterSheet(f, sys, s) {
  const editing = !!f.id;
  const areas = activeLifeAreas(s.settings);
  const title = editing
    ? (f.kind === 'goal' ? 'عدّل الهدف' : f.kind === 'habit' ? 'عدّل العادة' : 'عدّل المشروع')
    : 'الفلتر — ٣ أسئلة بس';

  return {
    label: title,
    head: `<h2>${title}</h2>`,
    body: `<div class="flt-wrap">
        <div>
          <span class="lbl">١. المجال؟</span>
          <div class="picks" role="group" aria-label="المجال">
            ${areas.map((a) => `<button class="pk" type="button" data-act="fltp" data-v="${esc(a.id)}" data-keep aria-pressed="false">${esc(a.name)}</button>`).join('')}
          </div>
        </div>
        ${!editing ? `<div>
          <span class="lbl">٢. نوعها إيه؟</span>
          <div class="mode-grid2" role="group" aria-label="النوع">
            ${FILTER_KINDS.map(([k, l, icon]) => `<button class="mopt" type="button" data-act="fltkind" data-v="${k}" data-keep aria-pressed="false">${ico(icon)}<span>${l}</span></button>`).join('')}
          </div>
          <p class="hint" data-out="fltkdesc" style="margin-top:6px"></p>
        </div>` : ''}
        <div class="blk" data-out="fltfields"></div>
        <div>
          <span class="lbl">${editing ? 'الحالة' : '٣. حالتها؟'}</span>
          <div class="seg2" role="group" aria-label="الحالة">
            <button type="button" class="so" data-act="fltst" data-v="active" data-keep aria-pressed="false" data-out="fltactlbl">شغّال دلوقتي</button>
            <button type="button" class="so" data-act="fltst" data-v="frozen" data-keep aria-pressed="false">مجمّد (مش ممسوح)</button>
          </div>
        </div>
        <div data-out="fltguard"></div>
      </div>`,
    foot: `<div data-out="fltfoot"></div>`,
  };
}

function habitTrackOptions(settings) {
  const hs = (settings?.habits || []).filter((h) => h.on !== false);
  return hs.map((h) => {
    if (h.numK && h.numU === 'دقيقة') {
      return { kind: 'sum', k: h.numK, div: 60, u: 'ساعة', label: `${h.n} (ساعات)` };
    }
    if (h.numK) {
      return { kind: 'sum', k: h.numK, div: 1, u: h.numU || '', label: `${h.n} (${h.numU || 'أرقام'})` };
    }
    return { kind: 'days', k: h.k, div: 1, u: 'يوم', label: `${h.n} (أيام)` };
  });
}

export function updateFilterSheet(sh, f, sys, s, forceFields = false) {
  if (!sh || !f) return;
  for (const b of sh.querySelectorAll('[data-act="fltp"]')) b.setAttribute('aria-pressed', b.dataset.v === f.p);
  for (const b of sh.querySelectorAll('[data-act="fltkind"]')) b.setAttribute('aria-pressed', b.dataset.v === f.kind);
  for (const b of sh.querySelectorAll('[data-act="fltst"]')) {
    const on = b.dataset.v === f.st;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
  const desc = sh.querySelector('[data-out="fltkdesc"]');
  if (desc) desc.textContent = FILTER_KINDS.find(([k]) => k === f.kind)?.[3] || '';
  const actLbl = sh.querySelector('[data-out="fltactlbl"]');
  if (actLbl) {
    actLbl.textContent = f.kind === 'task' ? 'للنهاردة (شغّال)' : f.kind === 'habit' ? 'شغّالة دلوقتي' : 'شغّال دلوقتي';
  }

  // الحقول المبسطة حسب النوع
  const fieldsBox = sh.querySelector('[data-out="fltfields"]');
  const activeEl = document.activeElement;
  const skipFields = !forceFields && activeEl && fieldsBox?.contains(activeEl) && activeEl.matches('input, textarea');
  if (fieldsBox && !skipFields) {
    let html = '';
    if (f.kind === 'habit') {
      html = `<label class="f"><span class="lbl">اسم العادة الصغيرة</span>
          <input class="fld" data-role="flttitle" autocomplete="off" placeholder="مثلاً: مراجعة القرآن، حفظ القرآن، إنجليزي، قراءة…" value="${esc(f.t)}">
        </label>
        <div class="g2">
          <label class="f"><span class="lbl">وحدة الرقم (اختياري)</span>
            <input class="fld" data-role="fltunit" autocomplete="off" placeholder="صفحة / دقيقة…" value="${esc(f.unit || '')}">
          </label>
          <label class="f"><span class="lbl">وقت وتنبيه يومي</span>
            <input class="fld" type="time" data-role="fltrem" value="${esc(f.rem || '')}">
          </label>
        </div>
        <p class="hint" style="margin:0">لو حدّدت وقت للعادة هيظهر جنبها في «اليوم» ويبعتلك إشعار لما تكون إشعارات الخلفية شغّالة.</p>`;
    } else if (f.kind === 'goal') {
      const tr = f.track || 'none';
      const trackModes = [
        ['none', 'اتجاه بس'],
        ['habit', 'تلقائي من عادة'],
        ['time', 'تلقائي من الوقت'],
        ['manual', 'عدّاد يدوي (+١)'],
      ];
      let trackHtml = '';
      if (tr === 'habit') {
        const opts = habitTrackOptions(s.settings);
        trackHtml = `<div><span class="lbl">يتحسب تلقائياً من أنهي عادة؟</span>
            <div class="picks">${opts.map((o) => {
              const on = f.src?.k === o.k && (f.src?.kind || 'days') === o.kind && (+(f.src?.div || 1) === o.div);
              return `<button class="pk" type="button" data-act="flthsrc" data-sk="${o.kind}" data-k="${esc(o.k)}" data-div="${o.div}" data-u="${esc(o.u)}" data-keep aria-pressed="${on}">${esc(o.label)}</button>`;
            }).join('')}</div>
          </div>
          <div class="g2">
            <label class="f"><span class="lbl">المستهدف (الرقم)</span>
              <input class="fld" data-role="flttarget" inputmode="decimal" autocomplete="off" placeholder="مثلاً ٣٠ أو ٢٠٠" value="${esc(f.target || '')}">
            </label>
            <label class="f"><span class="lbl">الوحدة</span>
              <input class="fld" data-role="fltunit" autocomplete="off" placeholder="ساعة / صفحة" value="${esc(f.unit || '')}">
            </label>
          </div>
          <label class="f"><span class="lbl">بداية الحساب من يوم</span>
            <input class="fld" type="date" data-role="fltfrom" value="${esc(f.from || s.today)}">
          </label>`;
      } else if (tr === 'time') {
        const cats = activeTimeCats(s.settings);
        trackHtml = `<div><span class="lbl">يتحسب من أنهي مجال في تاب «الوقت»؟</span>
            <div class="picks">${cats.map((c) => `<button class="pk" type="button" data-act="flttcat" data-v="${esc(c.id)}" data-keep aria-pressed="${f.src?.c === c.id}">${esc(c.name)}</button>`).join('')}</div>
          </div>
          <div class="g2">
            <label class="f"><span class="lbl">عدد الساعات المستهدف</span>
              <input class="fld" data-role="flttarget" inputmode="decimal" autocomplete="off" placeholder="مثلاً ٥٠" value="${esc(f.target || '')}">
            </label>
            <label class="f"><span class="lbl">من يوم</span>
              <input class="fld" type="date" data-role="fltfrom" value="${esc(f.from || s.today)}">
            </label>
          </div>`;
      } else if (tr === 'manual') {
        trackHtml = `<div class="g2">
            <label class="f"><span class="lbl">المستهدف (مثلاً عدد الدروس)</span>
              <input class="fld" data-role="flttarget" inputmode="decimal" autocomplete="off" placeholder="مثلاً ٢٠" value="${esc(f.target || '')}">
            </label>
            <label class="f"><span class="lbl">الوحدة</span>
              <input class="fld" data-role="fltunit" autocomplete="off" placeholder="درس / فصل / كتاب" value="${esc(f.unit || '')}">
            </label>
          </div>`;
      }
      html = `<label class="f"><span class="lbl">الهدف</span>
          <input class="fld" data-role="flttitle" autocomplete="off" placeholder="مثلاً: ٣٠ ساعة إنجليزي، أخلص كتاب X، أخلص كورس Y…" value="${esc(f.t)}">
        </label>
        <label class="f"><span class="lbl">ليه الهدف ده مهم ليك؟ (اختياري)</span>
          <textarea class="fld" rows="2" data-role="fltwhy" placeholder="السبب الحقيقي اللي بيخلّيك عايز تحققه…">${esc(f.why || '')}</textarea>
        </label>
        <div class="blk">
          <span class="lbl">قياس التقدّم (اختياري)</span>
          <div class="picks" role="group" aria-label="طريقة قياس الهدف">
            ${trackModes.map(([k, l]) => `<button class="pk" type="button" data-act="flttrack" data-v="${k}" data-keep aria-pressed="${tr === k}">${l}</button>`).join('')}
          </div>
          ${trackHtml}
        </div>`;
    } else if (f.kind === 'project') {
      const areaGoals = (s.goals || []).filter((g) => itemKind(g) === 'goal' && !g.done && g.p === f.p);
      html = `<label class="f"><span class="lbl">اسم المشروع (له نتيجة ونهاية)</span>
          <input class="fld" data-role="flttitle" autocomplete="off" placeholder="مثلاً: إطلاق متجر الأسواف، تظبيط نومي ١٤ يوم…" value="${esc(f.t)}">
        </label>
        <div>
          <span class="lbl">بيحقق أنهي هدف (ليه)؟</span>
          <div class="picks" role="group" aria-label="الهدف المربوط">
            <button class="pk" type="button" data-act="fltpar" data-v="" data-keep aria-pressed="${!f.parentId && !f.newGoal}">بدون هدف دلوقتي</button>
            ${areaGoals.map((g) => `<button class="pk" type="button" data-act="fltpar" data-v="${esc(g.id)}" data-keep aria-pressed="${String(f.parentId) === String(g.id)}">${esc(g.t)}</button>`).join('')}
            <button class="pk dash" type="button" data-act="fltpar" data-v="__new__" data-keep aria-pressed="${!!f.newGoal}">+ اكتب هدف جديد</button>
          </div>
          ${f.newGoal ? `<input class="fld" data-role="fltnewg" autocomplete="off" style="margin-top:8px" placeholder="اسم الهدف (ليه) اللي المشروع ده بيحققه…" value="${esc(f.newGoalTitle || '')}">` : ''}
        </div>
        <label class="f"><span class="lbl">النتيجة النهائية (إمتى أقول خلص؟)</span>
          <input class="fld" data-role="fltout" autocomplete="off" placeholder="مثلاً: أول ١٠ مبيعات، أو الموقع شغال أونلاين…" value="${esc(f.outcome || '')}">
        </label>
        ${!f.id ? `<label class="f"><span class="lbl">أول خطوات المشروع (كل خطوة في سطر — اختياري)</span>
          <textarea class="fld" rows="2" data-role="fltsteps" placeholder="الخطوة الأولى&#10;الخطوة التانية">${esc(f.stepsText || '')}</textarea>
        </label>` : ''}
        <div class="topts">
          <button class="opt" type="button" data-act="fltpri" data-keep aria-pressed="${!!f.pri}">أولوية عالية ⚑</button>
        </div>`;
    } else {
      // مهمة
      const actP = sys.activeProject;
      const projLabel = actP ? `مربوطة بالمشروع الشغّال: «${actP.t}»` : 'مفيش مشروع شغّال — هتتحفظ كمهمة مباشرة';
      html = `<label class="f"><span class="lbl">المهمة (خطوة مرة واحدة)</span>
          <input class="fld" data-role="flttitle" autocomplete="off" placeholder="اكتب خطوة واضحة تتعمل مرة واحدة…" value="${esc(f.t)}">
        </label>
        <div class="topts">
          <button class="opt" type="button" data-act="fltpri" data-keep aria-pressed="${!!f.pri}">مهم ⚑</button>
          ${actP ? `<button class="opt" type="button" data-act="fltlinkp" data-keep aria-pressed="${!!f.linkActive}">${f.linkActive ? `✓ ${esc(actP.t)}` : 'اربطها بالمشروع الشغّال'}</button>` : `<span class="hint" style="margin:0">${esc(projLabel)}</span>`}
        </div>`;
    }
    setHtml(fieldsBox, html);
  }

  // حارس القواعد (مشروع واحد شغّال + ٣ مهام بالكتير للنهاردة)
  const guardBox = sh.querySelector('[data-out="fltguard"]');
  if (guardBox) {
    let gHtml = '';
    if (f.kind === 'project' && f.st === 'active' && sys.activeProject && String(sys.activeProject.id) !== String(f.id || '')) {
      gHtml = `<div class="guard-box">
          <b>قاعدة المشروع الواحد:</b>
          <p>عندك مشروع شغّال دلوقتي: <b>«${esc(sys.activeProject.t)}»</b>. لو حفظت ده شغّال، القديم هيتجمّد (مش هيتمسح) وده يبدأ مكانه — أو اختار «مجمّد» فوق.</p>
        </div>`;
    } else if (f.kind === 'task' && f.st === 'active' && sys.todayOpen.count >= TODAY_TASK_LIMIT) {
      gHtml = `<div class="guard-box">
          <b>قاعدة ٣ مهام للنهاردة (${fmtNum(sys.todayOpen.count)}/${fmtNum(TODAY_TASK_LIMIT)}):</b>
          <p>عشان النهاردة يفضل مركز، اختار «مجمّد» فوق أو اختار مهمة نجمّدها ونحط دي مكانها:</p>
          <div class="picks">
            ${sys.todayOpen.list.map((t) => `<button type="button" class="pk" data-act="fltswap" data-id="${esc(t.id)}" data-keep aria-pressed="${String(f.swapTaskId) === String(t.id)}">بدّل مكان: ${esc(t.t)}</button>`).join('')}
          </div>
        </div>`;
    }
    setHtml(guardBox, gHtml);
  }

  const foot = sh.querySelector('[data-out="fltfoot"]');
  if (foot) {
    let saveLbl = f.id ? 'احفظ التعديل' : (f.st === 'frozen' ? 'احفظها في المجمّد' : 'أضف للشغّال ✓');
    if (f.kind === 'project' && f.st === 'active' && sys.activeProject && String(sys.activeProject.id) !== String(f.id || '')) {
      saveLbl = 'جمّد القديم وشغّل ده ✓';
    } else if (f.kind === 'task' && f.st === 'active' && sys.todayOpen.count >= TODAY_TASK_LIMIT) {
      saveLbl = f.swapTaskId ? 'بدّل وأضف للنهاردة ✓' : 'احفظها في المجمّد لبعدين';
    }
    const footHtml = f.fromReview
      ? `<div class="foot2"><button class="b-sec" type="button" data-act="grevback">رجوع للمراجعة</button>
          <button class="b-pri" type="button" data-act="fltsave">${saveLbl}</button></div>`
      : f.id
        ? `<div class="foot2"><button class="b-sec" type="button" data-act="gdel" data-id="${esc(f.id)}">امسح</button>
            <button class="b-pri" type="button" data-act="fltsave">${saveLbl}</button></div>`
        : `<button class="b-pri" type="button" data-act="fltsave">${saveLbl}</button>`;
    setHtml(foot, footHtml);
  }
}

// ---------- شاشات حارس القواعد (تبديل المشروع الواحد + حد الـ ٣ مهام + المشروع التالي بعد الإنجاز) ----------
export function projectSwapSheet(incoming, current) {
  return {
    label: 'قاعدة المشروع الواحد',
    head: '<h2>مشروع واحد شغّال بس</h2>',
    body: `<div class="guard-box">
        <b>الشغّال دلوقتي: «${esc(current.t)}»</b>
        <p>عشان تكمل وماتتشتتش، القاعدة إن يكون في مشروع كبير واحد بس شغّال. لو شغّلت <b>«${esc(incoming.t)}»</b>، القديم هيتجمّد (مش هيتمسح) وتقدر ترجعله في أي وقت.</p>
      </div>
      <div class="rev-decisions">
        <button type="button" class="b-pri" data-act="gswapdo" data-id="${esc(incoming.id)}">جمّد «${esc(current.t)}» وشغّل ده ✓</button>
        <button type="button" class="b-sec" type="button" data-close>سيب ده مجمّد دلوقتي</button>
      </div>`,
    foot: '',
  };
}

export function taskLimitSheet(pending, openTasks) {
  const label = pending.id ? 'نقل المهمة للنهاردة' : 'حد ٣ مهام للنهاردة';
  return {
    label,
    head: `<h2>عندك ${fmtNum(openTasks.length)} مهام للنهاردة</h2>`,
    body: `<div class="guard-box">
        <b>«${esc(pending.t)}»</b>
        <p>القاعدة ٣ مهام بالكتير للنهاردة عشان تنفّذهم فعلاً. تحب تجمّد دي لبعدين، ولا تجمّد واحدة من التلاتة وتحط دي مكانها؟</p>
      </div>
      <div class="blk">
        <span class="lbl">بدّل مكان مهمة من النهاردة (هتتجمّد مش هتتمسح):</span>
        <div class="list">${openTasks.map((t) => `<button type="button" class="srow srow-b" data-act="tswapdo" data-swap="${esc(t.id)}" style="width:100%;padding-inline:14px">
          <span class="m"><b>جمّد: ${esc(t.t)}</b><span>ودخّل «${esc(pending.t)}» مكانها للنهاردة</span></span>
        </button>`).join('')}</div>
      </div>`,
    foot: `<button type="button" class="b-pri" data-act="tswapfreeze">جمّد «${esc(pending.t)}» لبعدين</button>`,
  };
}

export function nextProjectSheet(finishedTitle, frozenProjects) {
  return {
    label: 'اختار المشروع الجاي',
    head: '<h2>عاش! المشروع خلص ✓</h2>',
    body: `<p class="note" style="margin:0">خلّصت <b>«${esc(finishedTitle)}»</b>. تحب تفتح مشروع جديد من المجمّد دلوقتي، ولا تاخد راحة؟</p>
      <div class="list">${frozenProjects.slice(0, 6).map(({ project: p, goal, area }) => `<button type="button" class="srow srow-b" data-act="gunfreeze" data-id="${esc(p.id)}" style="width:100%;padding-inline:14px">
        <span class="g-med sm" style="margin-inline-end:8px">${ico(area.icon)}</span>
        <span class="m"><b>${esc(p.t)}</b><span>${esc(area.name)}${goal ? ` ← ${esc(goal.t)}` : ''}</span></span>
      </button>`).join('')}</div>`,
    foot: '<button type="button" class="b-sec" type="button" data-close>هاخد راحة دلوقتي</button>',
  };
}

// ---------- شاشة تفاصيل المشروع ----------
export function goalDetailSheet(g) {
  return {
    label: g.t,
    head: `<h2>${esc(g.t)}</h2>`,
    body: `<div class="gdet" data-out="gdet" data-gid="${esc(g.id)}"></div>`,
    foot: `<div class="foot2"><button class="b-sec" type="button" data-act="fltedit" data-id="${esc(g.id)}">تعديل</button>
      <button class="b-pri" type="button" data-close>تمام</button></div>`,
  };
}

export function updateGoalDetail(sh, g, sys, s) {
  const box = sh?.querySelector('[data-out="gdet"]');
  if (!box || !g) return;
  const id = esc(g.id);
  const ev = sys.evals.get(g.id);
  const parentGoal = g.parentId ? (s.goals || []).find((x) => String(x.id) === String(g.parentId)) : null;
  const steps = Array.isArray(g.steps) ? g.steps : [];
  const linked = (s.tasks || []).filter((t) => String(t.goalId || '') === String(g.id));
  const isFrz = itemStatus(g) === 'frozen';

  const stepsBox = `<div class="blk">
      <div class="blk-h"><h3>خطوات المشروع</h3><span>${fmtNum(steps.filter((x) => x.done).length)}/${fmtNum(steps.length)}</span></div>
      ${steps.length ? `<div class="list">${steps.map((st) => `<div class="tk${st.done ? ' done' : ''}">
        <button class="tk-c" type="button" data-act="gstog" data-gid="${id}" data-sid="${esc(st.id)}" aria-pressed="${!!st.done}" aria-label="${esc(st.t)}"><i>${st.done ? ic(P.check) : ''}</i></button>
        <div class="tk-m"><span class="tk-t">${esc(st.t)}</span></div>
        <button class="ib" type="button" data-act="gsdel" data-gid="${id}" data-sid="${esc(st.id)}" aria-label="امسح الخطوة">${ic(P.close)}</button>
      </div>`).join('')}</div>` : '<p class="hint">لسه مفيش خطوات — ضيف أول خطوة واضحة تحت.</p>'}
      ${!g.done ? `<form class="addrow" data-act="gstepadd" data-gid="${id}">
        <input class="fld" data-role="gstepin" placeholder="+ خطوة جديدة في المشروع…" aria-label="خطوة جديدة" autocomplete="off" enterkeyhint="done">
        <button class="addbtn" type="submit" aria-label="ضيف الخطوة">${ic(P.plus)}</button>
      </form>` : ''}
    </div>`;

  const linkedBox = `<div class="blk">
      <div class="blk-h"><h3>مهام المشروع</h3><span>${fmtNum(linked.length)}</span></div>
      ${linked.length ? `<div class="list">${linked.map((t) => `<div class="tk${t.done ? ' done' : ''}${t.pri && !t.done ? ' pri' : ''}">
        <button class="tk-c" type="button" data-act="tdone" data-id="${esc(t.id)}" aria-pressed="${!!t.done}" aria-label="${esc(t.t)}"><i>${t.done ? ic(P.check) : ''}</i></button>
        <div class="tk-m"><span class="tk-t">${esc(t.t)}</span><span class="tk-tags"><span class="tcat">${t.due ? (t.due <= s.today ? 'النهاردة' : shortDate(t.due)) : 'مجمّدة'}</span></span></div>
      </div>`).join('')}</div>` : '<p class="hint">أي مهمة تضيفها هنا بتتربط بالمشروع (مع احترام حد ٣ مهام للنهاردة).</p>'}
      ${!g.done ? `<form class="addrow" data-act="gtaskadd" data-gid="${id}">
        <input class="fld" data-role="gtaskin" placeholder="+ مهمة للنهاردة في المشروع ده…" aria-label="مهمة جديدة" autocomplete="off" enterkeyhint="done">
        <button class="addbtn" type="submit" aria-label="ضيف المهمة">${ic(P.plus)}</button>
      </form>` : ''}
    </div>`;

  const acts = `<div class="g-detacts">
      ${!g.done && !isFrz ? `<button type="button" class="gh done" data-act="garchopen" data-id="${id}">خلّصت المشروع ✓</button>` : ''}
      ${!g.done && !isFrz ? `<button type="button" class="gh" data-act="gfreeze" data-id="${id}">جمّده مؤقتاً</button>` : ''}
      ${!g.done && isFrz ? `<button type="button" class="gh on" data-act="gunfreeze" data-id="${id}">شغّله دلوقتي</button>` : ''}
      ${g.done ? `<button type="button" class="gh" data-act="gunfreeze" data-id="${id}">افتحه تاني</button>` : ''}
      <button type="button" class="gh" data-act="gdel" data-id="${id}">امسح</button>
    </div>`;

  const html = `<div class="panel g-detsum">
      ${chainCrumbs(ev.pillar, parentGoal)}
      ${g.outcome ? `<p class="g-ref" style="margin:0"><b>النتيجة النهائية:</b> ${esc(g.outcome)}</p>` : ''}
      ${parentGoal?.why ? `<p class="g-ref" style="margin:0"><b>ليه الهدف ده:</b> ${esc(parentGoal.why)}</p>` : ''}
      ${projectProgressHtml(g, ev)}
    </div>
    ${g.done && g.note ? `<p class="g-ref"><b>الدرس المستفاد:</b> ${esc(g.note)}</p>` : ''}
    ${stepsBox}${linkedBox}${acts}`;
  setHtml(box, html);
}

// ---------- شاشة إنهاء المشروع أو الهدف وأرشفته ----------
export function goalArchiveSheet(g) {
  const isGoal = itemKind(g) === 'goal';
  const noun = isGoal ? 'الهدف' : 'المشروع';
  return {
    label: `إنهاء ${noun}`,
    head: `<h2>خلّصت ${noun} ✓</h2>`,
    body: `<p class="note" style="margin:0"><b>${esc(g.t)}</b></p>
      <label class="f"><span class="lbl">سطر للذكرى (اختياري): إيه اللي فرّق معاك في إنجاز ${noun}؟</span>
        <textarea class="fld" rows="3" data-focus data-role="gnote" placeholder="مثلاً: الالتزام اليومي الصغير فرّق جداً…">${esc(g.note || '')}</textarea>
      </label>`,
    foot: `<div class="foot2"><button class="b-sec" type="button" data-close>إلغاء</button>
      <button class="b-pri" type="button" data-act="garchsave" data-id="${esc(g.id)}">اتمّ ${noun} ✓</button></div>`,
  };
}

// ---------- فورم مجال حياة جديد / تعديل ----------
export function lifeAreaFormSheet(f, canDelete) {
  const editing = !!f.origId;
  return {
    label: editing ? 'تعديل المجال' : 'مجال جديد',
    head: `<h2>${editing ? 'تعديل المجال' : 'مجال جديد'}</h2>`,
    body: `<label class="f"><span class="lbl">اسم المجال</span>
        <input class="fld" data-role="laname" autocomplete="off" data-focus placeholder="مثلاً: شغل، ديني، صحة، علاقات، تعلم…" value="${esc(f.name || '')}">
      </label>
      <label class="f"><span class="lbl">سطر رؤية أو معيار للمجال (اختياري)</span>
        <input class="fld" data-role="lanote" autocomplete="off" placeholder="مثلاً: أحافظ على هدوئي ووقت حقيقي مع أهلي" value="${esc(f.note || '')}">
      </label>
      <div><span class="lbl">الأيقونة</span>
        <div class="picks">${LIFE_AREA_ICONS.map(([id, l]) => `<button class="bchip" type="button" data-act="laico" data-v="${id}" data-keep aria-pressed="${f.icon === id}"><span class="bic">${ico(id)}</span><span>${l}</span></button>`).join('')}</div>
      </div>`,
    foot: editing && canDelete
      ? `<div class="foot2"><button class="b-sec" type="button" data-act="ladel">امسح المجال</button>
          <button class="b-pri" type="button" data-act="lasave">احفظ</button></div>`
      : '<button class="b-pri" type="button" data-act="lasave">احفظ المجال</button>',
  };
}

// ---------- جلسة مراجعة المجمّد (نهاية الفترة) ----------
export function goalReviewSheet(rv, sys, s) {
  const total = rv.ids.length;
  const pct = total ? Math.min(100, Math.round((rv.i / total) * 100)) : 100;

  if (rv.i >= total) {
    const hasCurPeriod = !!periodOf(s.periods, s.today);
    const parts = [];
    if (rv.stats.activated) parts.push(`شغّلت ${fmtNum(rv.stats.activated)}`);
    if (rv.stats.kept) parts.push(`سبت مجمّد ${fmtNum(rv.stats.kept)}`);
    if (rv.stats.dropped) parts.push(`استبعدت ${fmtNum(rv.stats.dropped)}`);
    return {
      label: 'ملخص المراجعة',
      head: '<h2>خلصت المراجعة ✓</h2>',
      body: `<div class="panel rev-done">
          <span class="g-med ok">${ico('check')}</span>
          <b>المسار واضح دلوقتي</b>
          <p>${parts.length ? esc(parts.join(' · ')) : 'راجعت كل اللي في المجمّد.'}</p>
          <p class="hint">${sys.activeProject ? `المشروع الشغّال دلوقتي: <b>${esc(sys.activeProject.t)}</b>` : 'مفيش مشروع شغّال دلوقتي — اختار واحد لما تبقى جاهز.'}</p>
        </div>`,
      foot: !hasCurPeriod
        ? `<div class="foot2"><button class="b-sec" type="button" data-close>تمام</button>
            <button class="b-pri" type="button" data-act="pform">ابدأ الفترة الجاية</button></div>`
        : '<button class="b-pri" type="button" data-close>تمام</button>',
    };
  }

  const gid = rv.ids[rv.i];
  const g = (s.goals || []).find((x) => String(x.id) === String(gid));
  if (!g) {
    return {
      label: 'مراجعة المجمّد',
      head: '<h2>مراجعة المجمّد</h2>',
      body: '<p class="hint">العنصر ده اتنقل أو اتمسح.</p>',
      foot: '<button class="b-pri" type="button" data-act="grevkeep">اللي بعده</button>',
    };
  }
  const ev = sys.evals.get(g.id);
  const kind = itemKind(g);
  const parentGoal = g.parentId ? (s.goals || []).find((x) => String(x.id) === String(g.parentId)) : null;
  const age = backlogAgeText(g.at, s.today, s.settings?.dayStart);

  return {
    label: 'مراجعة المجمّد',
    head: `<h2>مراجعة المجمّد <small class="rev-step">${fmtNum(rv.i + 1)} من ${fmtNum(total)}</small></h2>`,
    body: `<div class="pace-bar" aria-hidden="true"><div class="pace-fill" style="width:${pct}%"></div></div>
      <div class="panel rev-card">
        <div class="rev-meta">
          <span class="apill on">${ico(ev.pillar.icon)}<span>${esc(ev.pillar.name)}</span></span>
          <span class="apill">${kind === 'goal' ? 'هدف (ليه)' : 'مشروع'}</span>
          ${age ? `<span class="apill">${esc(age)}</span>` : ''}
          ${g.pri ? '<span class="apill attn">أولوية ⚑</span>' : ''}
        </div>
        ${parentGoal ? `<span class="g-src">تبع هدف: <b>${esc(parentGoal.t)}</b></span>` : ''}
        <h3 class="rev-title">${esc(g.t)}</h3>
        ${g.outcome ? `<p class="g-ref"><b>النتيجة:</b> ${esc(g.outcome)}</p>` : ''}
        ${g.why ? `<p class="g-ref"><b>ليه كنت عايز ده:</b> ${esc(g.why)}</p>` : ''}
        <p class="rev-ctx">${sys.activeProject
          ? `المشروع الشغّال حالياً: «${esc(sys.activeProject.t)}»${kind === 'project' ? ' (لو شغّلت ده، القديم هيتجمّد)' : ''}`
          : 'مفيش مشروع شغّال دلوقتي — المساحة فاضية لـ ١ مشروع.'}</p>
      </div>
      <div class="rev-decisions">
        <button type="button" class="b-pri" data-act="grevact" data-id="${esc(g.id)}">${kind === 'goal' ? 'فعّل الهدف دلوقتي ←' : (sys.activeProject ? 'جمّد الحالي وشغّل ده ←' : 'شغّله كمشروعك الواحد ←')}</button>
        <div class="foot2">
          <button type="button" class="b-sec" data-act="grevkeep" data-id="${esc(g.id)}">سيبه مجمّد</button>
          <button type="button" class="gh rev-drop" data-act="grevdrop" data-id="${esc(g.id)}">مش مستاهل</button>
        </div>
      </div>`,
    foot: '',
  };
}
