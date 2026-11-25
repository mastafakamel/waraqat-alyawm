// views/goals.js — نظام الأهداف المتكامل + بنك الأهداف (للمراجعة) + خريطة جوانب الحياة القابلة للتخصيص + جلسة مراجعة نهاية الفترة.

import {
  HABIT_NUMS, GOAL_MODES, GOAL_HORIZONS,
  activeHabits, activeTimeCats, activeLifeAreas, allHabitLabel, isBacklogGoal, backlogAgeText,
  fmtNum, fmtDays, todayTasks, isOverdue, shortDate, periodOf,
} from '../logic.js';
import { esc, ic, ico, P, setHtml } from '../ui.js';

export const GOAL_PRESETS = [
  { t: '٤٠ ساعة شغل عميق في الفترة', p: 'work', m: 'time', src: { kind: 'work', c: 'work' }, hz: 'period', target: 40, unit: 'ساعة', f: true },
  { t: '٢٠ يوم تمرين الشهر ده', p: 'health', m: 'habit', src: { kind: 'days', k: 'ex' }, hz: 'month', target: 20, unit: 'يوم', f: true },
  { t: 'إنجاز مشروع بخطوات ومهام', p: 'growth', m: 'steps', hz: 'month', f: true, steps: ['تحديد أول خطوة', 'النسخة الأولى', 'المراجعة والإنهاء'] },
  { t: 'سقف مصاريف الأكل', p: 'work', m: 'metric', src: { kind: 'exp_cap', cat: 'أكل' }, hz: 'month', target: 3000, unit: 'ج', f: false },
];

export const LIFE_AREA_ICONS = [
  ['star', 'دين وروح'],
  ['heart', 'صحة وجسم'],
  ['brief', 'شغل'],
  ['wallet', 'مال واستثمار'],
  ['book', 'تعلم'],
  ['home', 'بيت وحياة'],
  ['users', 'علاقات'],
  ['spark', 'إبداع وشغف'],
  ['compass', 'تطوير الذات'],
  ['target', 'مشاريع'],
  ['moon', 'نوم وهدوء'],
  ['rest', 'راحة ونفسية'],
];

const MODE_DESC = {
  habit: 'يتحدث تلقائياً لما تعلّم العادة في اليوم أو تكتب رقمها (مثل التمرين، الورد، الإنجليزي، الصلوات).',
  time: 'يتجمع تلقائياً من ساعات تاب «الوقت» أو ساعات «الشغل» والتركيز العميق.',
  metric: 'مربوط بمقياس من «مقاييسي» (تجميعي أو وصول لرقم زي الوزن) أو الدخل أو سقف مصاريف في «الفلوس».',
  steps: 'هدف مشروع بمراحل (Milestones) ومهام مربوطة من تاب «المهام».',
  manual: 'عدّاد مرن بتزوّده بنفسك (+١) زي عدد الكتب أو الكورسات.',
};

function goalsWord(n) {
  if (n === 1) return 'هدف واحد';
  if (n === 2) return 'هدفين';
  return `${fmtNum(n)} ${n <= 10 ? 'أهداف' : 'هدف'}`;
}

/** مفتاح التبديل فوق تبويبة «الخطة»: الأهداف | المهام */
export function planSwitch(s, ui) {
  const activeG = (s.goals || []).filter((g) => !g.done && !isBacklogGoal(g)).length;
  const openT = todayTasks(s.tasks, s.today, s.settings?.dayStart).filter((t) => !t.done).length;
  const isGoals = ui.planSub !== 'tasks';
  const newBtn = ui.gfilt === 'backlog'
    ? `<button type="button" class="g-newbtn" data-act="gform" data-st="backlog">${ic(P.plus)}<span>اركن هدف</span></button>`
    : ui.gfilt === 'areas'
      ? `<button type="button" class="g-newbtn" data-act="laform">${ic(P.plus)}<span>جانب جديد</span></button>`
      : `<button type="button" class="g-newbtn" data-act="gform">${ic(P.plus)}<span>هدف جديد</span></button>`;
  return `<div class="plan-top">
      <div class="seg-top" role="tablist" aria-label="أقسام الخطة">
        <button type="button" role="tab" class="${isGoals ? 'on' : ''}" data-act="plansub" data-v="goals" aria-selected="${isGoals}">الأهداف<span class="seg-cnt">${fmtNum(activeG)}</span></button>
        <button type="button" role="tab" class="${!isGoals ? 'on' : ''}" data-act="plansub" data-v="tasks" aria-selected="${!isGoals}">المهام<span class="seg-cnt">${fmtNum(openT)}</span></button>
      </div>
      ${isGoals ? newBtn : ''}
    </div>`;
}

/** شريط تذكير هادي بمراجعة بنك الأهداف عند نهاية الفترة (يظهر في اليوم والخطة عند الميعاد فقط). */
export function reviewBannerHtml(rev) {
  if (!rev?.due) return '';
  const pName = rev.period?.name ? ` «${rev.period.name}»` : '';
  const head = rev.reason === 'last_day'
    ? `آخر يوم في الفترة${pName}`
    : `انتهت الفترة${pName}`;
  const sub = `عندك ${goalsWord(rev.count)} في بنك الأهداف — راجعهم واختار إيه يستاهل يبدأ دلوقتي.`;
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
          <span class="g-src">${esc(ev.pillar.name)} · ${esc(ev.sourceLabel)}</span>
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

function backlogCardHtml(g, ev, s) {
  const id = esc(g.id);
  const age = backlogAgeText(g.at, s.today, s.settings?.dayStart);
  const revNote = g.revAt ? ` · اتراجع ${backlogAgeText(g.revAt, s.today, s.settings?.dayStart)}` : '';
  return `<article class="gcard bkcard${g.pri ? ' pri' : ''}">
      <div class="gcard-h">
        <span class="g-med sm">${ico(ev.pillar.icon)}</span>
        <button type="button" class="g-main" data-act="gform" data-id="${id}" aria-label="عدّل فكرة الهدف: ${esc(g.t)}">
          <span class="g-title">${g.pri ? '<span class="flag" aria-label="أولوية">⚑</span>' : ''}${esc(g.t)}</span>
          <span class="g-src">${esc(ev.pillar.name)}${age ? ` · ${esc(age)}` : ''}${esc(revNote)}</span>
        </button>
        <button type="button" class="ib" data-act="gdel" data-id="${id}" aria-label="امسح فكرة الهدف">${ic(P.close)}</button>
      </div>
      ${g.why ? `<p class="bk-why">${esc(g.why)}</p>` : ''}
      <div class="g-foot">
        <button type="button" class="bk-link" data-act="gform" data-id="${id}">تعديل</button>
        <button type="button" class="g-act attn" data-act="gpromote" data-id="${id}">ابدأه دلوقتي${ic(P.arrowUpLeft)}</button>
      </div>
    </article>`;
}

function areaCardHtml(entry) {
  const { area, active, backlog, archived, avgPct, needPush } = entry;
  const aid = esc(area.id);
  const hasAct = active.length > 0;
  const statusCls = hasAct ? (needPush > 0 ? 'attn' : 'done') : (backlog.length > 0 ? 'attn' : '');
  const midHtml = hasAct
    ? `<div class="pace-wrap">
        <div class="pace-bar" aria-hidden="true"><div class="pace-fill${needPush > 0 ? ' attn' : ''}" style="width:${avgPct}%"></div></div>
        <div class="pace-meta">
          <span class="area-sub">متوسط التقدّم في الجانب ده</span>
          <span class="pace-tag ${needPush > 0 ? 'attn' : 'done'}">${fmtNum(avgPct)}٪</span>
        </div>
      </div>`
    : `<p class="area-empty-line">${backlog.length
      ? `مفيش هدف نشط دلوقتي · مستني ${goalsWord(backlog.length)} في البنك`
      : 'الجانب ده فاضي — تقدر تبدأ هدف أو تركن أفكار فيه'}</p>`;

  return `<article class="gcard acard">
      <div class="gcard-h">
        <span class="g-med${hasAct && !needPush ? ' ok' : ''}">${ico(area.icon)}</span>
        <button type="button" class="g-main" data-act="gfilt" data-v="area:${aid}" aria-label="افتح جانب ${esc(area.name)}">
          <span class="g-title">${esc(area.name)}</span>
          <span class="g-src">${area.note ? esc(area.note) : 'دوس عشان تشوف أهداف الجانب ده'}</span>
        </button>
        <button type="button" class="ib" data-act="laform" data-id="${aid}" aria-label="عدّل جانب ${esc(area.name)}">${ic(P.edit)}</button>
      </div>
      ${midHtml}
      <div class="acard-foot">
        <div class="acard-pills">
          <span class="apill${hasAct ? ' on' : ''}">نشط ${fmtNum(active.length)}</span>
          <span class="apill${!hasAct && backlog.length ? ' attn' : ''}">في البنك ${fmtNum(backlog.length)}</span>
          ${archived.length ? `<span class="apill done">مكتمل ${fmtNum(archived.length)}</span>` : ''}
        </div>
        <button type="button" class="acard-open ${statusCls}" data-act="gfilt" data-v="area:${aid}">افتح${ic(P.chev)}</button>
      </div>
    </article>`;
}

function renderAreaDetail(entry, gsum, s) {
  const { area, active, backlog, archived } = entry;
  const aid = esc(area.id);
  const topBar = `<div class="adet-top">
      <button type="button" class="adet-back" data-act="gfilt" data-v="areas">${ic(P.prev)}<span>كل الجوانب</span></button>
      <button type="button" class="adet-ed" data-act="laform" data-id="${aid}">${ic(P.edit)}<span>تعديل الجانب</span></button>
    </div>`;

  const hero = `<section class="panel adet-hero">
      <div class="gcard-h">
        <span class="g-med">${ico(area.icon)}</span>
        <div class="g-main">
          <span class="g-title">${esc(area.name)}</span>
          <span class="g-src">${area.note ? esc(area.note) : `${fmtNum(active.length)} نشط · ${fmtNum(backlog.length)} في بنك الأهداف`}</span>
        </div>
      </div>
      <div class="adet-acts">
        <button type="button" class="g-act" data-act="gform" data-p="${aid}" data-st="active">${ic(P.plus)}هدف نشط</button>
        <button type="button" class="g-act attn" data-act="gform" data-p="${aid}" data-st="backlog">${ic(P.plus)}اركن في البنك</button>
      </div>
    </section>`;

  let sections = '';
  if (active.length) {
    sections += `<div class="sec"><b>شغال عليهم دلوقتي</b><span>${fmtNum(active.length)}</span></div>
      <div class="pillars">${active.map((g) => focusCardHtml(g, gsum.evals.get(g.id), s)).join('')}</div>`;
  }
  if (backlog.length) {
    sections += `<div class="sec"><b>في بنك الأهداف (مستني دوره)</b><span class="ask">${fmtNum(backlog.length)}</span></div>
      <div class="pillars">${backlog.map((g) => backlogCardHtml(g, gsum.evals.get(g.id), s)).join('')}</div>`;
  }
  if (archived.length) {
    sections += `<div class="sec"><b>إنجازات مكتملة</b><span>${fmtNum(archived.length)}</span></div>
      <div class="pillars">${archived.map((g) => {
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
  }
  if (!active.length && !backlog.length && !archived.length) {
    sections = `<div class="empty g-empty">
        <b>لسه مفيش أهداف في «${esc(area.name)}»</b>
        <p>تقدر تبدأ هدف نشط دلوقتي، أو تركن أي حاجة عايز تظبطها في الجانب ده جوه «بنك الأهداف» وتراجعها نهاية الفترة.</p>
      </div>`;
  }
  return `${topBar}${hero}${sections}`;
}

/** تبويبة الأهداف الكاملة (جوه تبويبة الخطة): النشطة · بنك الأهداف · جوانب حياتي · الأرشيف. */
export function renderGoals(s, ui, gsum, rev = null) {
  const head = planSwitch(s, ui);
  const ban = reviewBannerHtml(rev);
  const areasList = gsum.areas || [];

  const pulse = `<section class="pulse" aria-label="ملخص الأهداف">
      <div class="gp-grid">
        <div class="gp-cell"><span class="gp-k">متوسط التقدّم</span><span class="gp-v">${gsum.active.length ? `${fmtNum(gsum.avgPct)}٪` : '—'}</span><span class="gp-s">${fmtNum(gsum.active.length)} نشط</span></div>
        <div class="gp-cell"><span class="gp-k">على المسار</span><span class="gp-v ${gsum.needPush ? 'attn' : 'done'}">${fmtNum(gsum.onTrack)}</span><span class="gp-s">${gsum.needPush ? `${fmtNum(gsum.needPush)} محتاج دفعة` : 'ماشي كويس'}</span></div>
        <button type="button" class="gp-cell gp-btn" data-act="gfilt" data-v="backlog" aria-label="افتح بنك الأهداف: ${fmtNum(gsum.backlog.length)}">
          <span class="gp-k">بنك الأهداف</span>
          <span class="gp-v${rev?.due ? ' attn' : ''}">${fmtNum(gsum.backlog.length)}</span>
          <span class="gp-s">${rev?.due ? 'وقت المراجعة' : 'مستني المراجعة'}</span>
        </button>
      </div>
    </section>`;

  const filters = [
    ['all', `النشطة (${fmtNum(gsum.active.length)})`],
    ['backlog', `بنك الأهداف (${fmtNum(gsum.backlog.length)})`],
    ['areas', `جوانب حياتي (${fmtNum(areasList.length)})`],
    ...(gsum.active.some((g) => g.f) ? [['focus', 'تركيز دلوقتي']] : []),
    ...(gsum.archived.length ? [['done', `الأرشيف (${fmtNum(gsum.archived.length)})`]] : []),
  ];

  const isAreaView = typeof ui.gfilt === 'string' && ui.gfilt.startsWith('area:');
  const activeAreaEntry = isAreaView ? areasList.find((x) => `area:${x.area.id}` === ui.gfilt) : null;
  const fcur = activeAreaEntry ? ui.gfilt : (filters.some(([k]) => k === ui.gfilt) ? ui.gfilt : 'all');
  const barCur = activeAreaEntry ? 'areas' : fcur;

  const filtBar = `<div class="pfilt" role="group" aria-label="عرض الأهداف">${filters.map(([k, l]) => `<button type="button" class="pf" data-act="gfilt" data-v="${k}" aria-pressed="${barCur === k}">${l}</button>`).join('')}</div>`;

  let body = '';
  if (activeAreaEntry) {
    body = renderAreaDetail(activeAreaEntry, gsum, s);
  } else if (fcur === 'areas') {
    const activeAreasCnt = areasList.filter((x) => x.active.length > 0).length;
    const waitingOnlyCnt = areasList.filter((x) => !x.active.length && x.backlog.length > 0).length;
    const subParts = [`${fmtNum(activeAreasCnt)} فيها أهداف نشطة`];
    if (waitingOnlyCnt) subParts.push(`${fmtNum(waitingOnlyCnt)} في الانتظار بس`);
    body = `<div class="sec"><b>خريطة جوانب حياتك</b><span>${subParts.join(' · ')}</span></div>
      <div class="pillars">${areasList.map(areaCardHtml).join('')}</div>
      <button type="button" class="gh full" data-act="laform">${ic(P.plus)} أضف جانب حياة جديد</button>`;
  } else if (fcur === 'backlog') {
    if (!gsum.backlog.length) {
      body = `<div class="empty g-empty">
          <b>بنك الأهداف فاضي لسه</b>
          <p>أي هدف ييجي في بالك ومش وقته دلوقتي اركنه هنا من غير تاريخ ولا ضغط — ومع نهاية كل فترة هتراجعه وتقرر يستاهل يبدأ ولا لأ.</p>
          <p class="hint" style="margin-top:8px">وتقدر تضيف بسرعة من الشريط السريع في «اليوم» باختيار «فكرة هدف».</p>
          <div class="btns" style="margin-top:14px">
            <button type="button" class="pri" data-act="gform" data-st="backlog">+ اركن أول فكرة هدف</button>
          </div>
        </div>`;
    } else {
      const usedAreas = areasList.filter((x) => x.backlog.length > 0);
      const bArea = ui.barea && usedAreas.some((x) => x.area.id === ui.barea) ? ui.barea : 'all';
      const shown = bArea === 'all' ? gsum.backlog : gsum.backlog.filter((g) => gsum.evals.get(g.id)?.pillar?.id === bArea);
      const areaFilt = usedAreas.length > 1
        ? `<div class="pfilt sub-filt" role="group" aria-label="فلترة بنك الأهداف حسب الجانب">
            <button type="button" class="pf" data-act="barea" data-v="all" aria-pressed="${bArea === 'all'}">كل الجوانب (${fmtNum(gsum.backlog.length)})</button>
            ${usedAreas.map((x) => `<button type="button" class="pf" data-act="barea" data-v="${esc(x.area.id)}" aria-pressed="${bArea === x.area.id}">${esc(x.area.name)} (${fmtNum(x.backlog.length)})</button>`).join('')}
          </div>` : '';
      const revCta = `<div class="bk-bar">
          <button type="button" class="g-act${rev?.due ? ' attn' : ''}" data-act="grevstart">${ico('inbox')}<span>ابدأ جلسة مراجعة (${fmtNum(gsum.backlog.length)})</span></button>
          <button type="button" class="g-act" data-act="gform" data-st="backlog">${ic(P.plus)}<span>اركن هدف</span></button>
        </div>`;
      body = `${revCta}${areaFilt}
        <div class="sec"><b>مستنيين المراجعة</b><span>${fmtNum(shown.length)}</span></div>
        <div class="pillars">${shown.map((g) => backlogCardHtml(g, gsum.evals.get(g.id), s)).join('')}</div>`;
    }
  } else if (fcur === 'done') {
    body = `<div class="sec"><b>إنجازاتك المكتملة</b><span>${fmtNum(gsum.archived.length)}</span></div>
      <div class="pillars">${gsum.archived.map((g) => {
        const ev = gsum.evals.get(g.id);
        return `<article class="gcard done">
            <div class="gcard-h">
              <span class="g-med">${ico('trophy')}</span>
              <button type="button" class="g-main" data-act="gopen" data-id="${esc(g.id)}">
                <span class="g-title">${esc(g.t)}</span>
                <span class="g-src">${esc(ev.pillar.name)} · ${esc(ev.horizonText)}</span>
              </button>
              <span class="g-pct done">١٠٠٪</span>
            </div>
            ${g.note ? `<p class="g-ref"><b>الدرس المستفاد:</b> ${esc(g.note)}</p>` : ''}
          </article>`;
      }).join('')}</div>`;
  } else {
    // النشطة أو تركيز دلوقتي
    const filtered = fcur === 'focus' ? gsum.active.filter((g) => g.f) : gsum.active;
    if (!gsum.active.length) {
      body = `<div class="empty g-empty">
          <b>مفيش أهداف نشطة دلوقتي</b>
          <p>اربط أهدافك بعاداتك أو وقتك أو مهامك أو فلوسك — أو اركن أفكارك الأول في «بنك الأهداف» واختار منها اللي يستاهل يبدأ دلوقتي.</p>
          <div class="btns" style="margin-top:12px">
            <button type="button" class="pri" data-act="gform" data-st="active">+ هدف نشط</button>
            <button type="button" data-act="gform" data-st="backlog">+ اركن في البنك</button>
          </div>
          <div class="g-presets">
            ${GOAL_PRESETS.map((p, i) => `<button type="button" class="g-pre" data-act="gpreset" data-i="${i}">${ic(P.plus)}<span>${esc(p.t)}</span></button>`).join('')}
          </div>
        </div>`;
    } else {
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
        body = '<div class="list"><p class="empty-s">مفيش أهداف مثبّتة في التركيز دلوقتي.</p></div>';
      }
    }
  }

  return `${head}${ban}${pulse}${filtBar}${body}`;
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
export function goalDetailSheet(g) {
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

  const whyBox = g.why ? `<p class="g-ref"><b>ليه الهدف ده مهم:</b> ${esc(g.why)}</p>` : '';
  const noteBox = g.done && g.note ? `<p class="g-ref"><b>الدرس المستفاد:</b> ${esc(g.note)}</p>` : '';

  const acts = `<div class="g-detacts">
      ${!g.done ? `<button type="button" class="gh${g.f ? ' on' : ''}" data-act="gfocus" data-id="${id}">${g.f ? '★ مثبّت في تركيز اليوم' : '☆ ثبّته في تركيز اليوم'}</button>` : ''}
      ${!g.done ? `<button type="button" class="gh" data-act="gtobacklog" data-id="${id}">اركنه في بنك الأهداف</button>` : ''}
      ${g.done
        ? `<button type="button" class="gh" data-act="greopen" data-id="${id}">رجّعه هدف نشط</button>`
        : `<button type="button" class="gh done" data-act="garchopen" data-id="${id}">إقفال وأرشفة ✓</button>`}
      <button type="button" class="gh" data-act="gdel" data-id="${id}">امسح الهدف</button>
    </div>`;

  const html = `<div class="panel g-detsum">
      <div class="gcard-h">
        <span class="g-med">${ico(g.done ? 'trophy' : ev.pillar.icon)}</span>
        <div class="g-main"><span class="g-src">${esc(ev.pillar.name)} · ${esc(ev.sourceLabel)}</span><span class="g-src">${esc(ev.horizonText)}${!g.done && ev.daysLeft > 0 ? ` · فاضل ${fmtDays(ev.daysLeft)}` : ''}</span></div>
        <span class="g-pct ${ev.status}">${fmtNum(ev.pct)}٪</span>
      </div>
      ${paceBarHtml(ev, true)}
      <div class="pace-meta">
        <span class="pace-val">${goalValHtml(g, ev)}</span>
        <span class="pace-tag ${ev.status}">${esc(ev.paceText)}</span>
      </div>
    </div>
    ${whyBox}${noteBox}${manualBox}${stepsBox}${linkedBox}${acts}`;
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

// ---------- فورم هدف جديد / تعديل (يدعم «هدف نشط» و«بنك الأهداف») ----------
export function goalFormSheet(f, s) {
  const editing = !!f.id;
  const isBacklog = f.st === 'backlog';
  const showSwitch = !editing || f.wasBacklog;
  const areas = activeLifeAreas(s?.settings);
  const titleText = f.promoting
    ? 'تفعيل الهدف من البنك'
    : editing
      ? (isBacklog ? 'عدّل فكرة الهدف' : 'عدّل الهدف')
      : (isBacklog ? 'اركن فكرة هدف' : 'هدف جديد');

  return {
    label: titleText,
    head: `<h2 data-out="gftitle">${titleText}</h2>`,
    body: `${showSwitch ? `<div class="seg2" role="group" aria-label="حالة الهدف">
        <button type="button" class="so" data-act="gfstate" data-v="active" data-keep aria-pressed="${!isBacklog}">ابدأه دلوقتي (نشط)</button>
        <button type="button" class="so" data-act="gfstate" data-v="backlog" data-keep aria-pressed="${isBacklog}">اركنه في بنك الأهداف</button>
      </div>` : ''}
      <label class="f"><span class="lbl">اسم الهدف</span>
        <input class="fld" data-role="gtitle" autocomplete="off" placeholder="مثلاً: أظبّط نومي قبل ١٢، أتعلم إنجليزي…" value="${esc(f.t)}">
      </label>
      <div><span class="lbl">جانب الحياة</span>
        <div class="picks" role="group" aria-label="جانب الحياة">
          ${areas.map((p) => `<button class="pk" type="button" data-act="gfpil" data-v="${esc(p.id)}" data-keep aria-pressed="false">${esc(p.name)}</button>`).join('')}
        </div>
      </div>
      <div class="blk" data-out="gfbk">
        <div class="topts">
          <button class="opt" type="button" data-act="gfpri" data-keep aria-pressed="${!!f.pri}">أولوية عالية ⚑</button>
          <span class="hint" style="margin:0">من غير تاريخ ولا ضغط — هيتراجع نهاية الفترة.</span>
        </div>
      </div>
      <div class="blk" data-out="gfact">
        <div><span class="lbl">يتقاس إزاي؟</span>
          <div class="mode-grid" role="group" aria-label="طريقة القياس">
            ${GOAL_MODES.map(([k, l, icon]) => `<button class="mopt" type="button" data-act="gfmode" data-v="${k}" data-keep aria-pressed="false">${ico(icon)}<span>${l}</span></button>`).join('')}
          </div>
          <p class="hint" data-out="gfdesc" style="margin-top:6px"></p>
        </div>
        <div class="blk" data-out="gfsrc"></div>
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
        </div>
      </div>
      <label class="f"><span class="lbl">ليه مهم ليك؟ (اختياري — بيساعدك وقت المراجعة)</span>
        <textarea class="fld" rows="2" data-role="gfwhy" placeholder="مثلاً: هيفرق في طاقتي الصبح وتركيزي في الشغل…">${esc(f.why || '')}</textarea>
      </label>`,
    foot: `<div data-out="gffoot"></div>`,
  };
}

export function updateGoalForm(sh, f, s) {
  if (!sh || !f) return;
  const isBacklog = f.st === 'backlog';

  const ttl = sh.querySelector('[data-out="gftitle"]');
  if (ttl) {
    ttl.textContent = f.promoting
      ? 'تفعيل الهدف من البنك'
      : f.id
        ? (isBacklog ? 'عدّل فكرة الهدف' : 'عدّل الهدف')
        : (isBacklog ? 'اركن فكرة هدف' : 'هدف جديد');
  }

  for (const b of sh.querySelectorAll('[data-act="gfstate"]')) {
    const on = b.dataset.v === (isBacklog ? 'backlog' : 'active');
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
  for (const b of sh.querySelectorAll('[data-act="gfpil"]')) b.setAttribute('aria-pressed', b.dataset.v === f.p);
  sh.querySelector('[data-act="gfpri"]')?.setAttribute('aria-pressed', !!f.pri);

  const bkBox = sh.querySelector('[data-out="gfbk"]');
  const actBox = sh.querySelector('[data-out="gfact"]');
  if (bkBox) bkBox.hidden = !isBacklog;
  if (actBox) actBox.hidden = isBacklog;

  const foot = sh.querySelector('[data-out="gffoot"]');
  if (foot) {
    const saveLbl = f.promoting
      ? 'ابدأ الهدف دلوقتي ✓'
      : f.id
        ? (isBacklog ? 'احفظ في البنك' : 'احفظ الهدف')
        : (isBacklog ? 'اركنه في بنك الأهداف' : 'ضيف الهدف');
    const footHtml = f.fromReview
      ? `<div class="foot2"><button class="b-sec" type="button" data-act="grevback">رجوع للمراجعة</button>
          <button class="b-pri" type="button" data-act="gfsave">${saveLbl}</button></div>`
      : f.id && !f.promoting
        ? `<div class="foot2"><button class="b-sec" type="button" data-act="gdel" data-id="${esc(f.id)}">امسح</button>
            <button class="b-pri" type="button" data-act="gfsave">${saveLbl}</button></div>`
        : `<button class="b-pri" type="button" data-act="gfsave">${saveLbl}</button>`;
    setHtml(foot, footHtml);
  }

  if (isBacklog) return;

  const desc = sh.querySelector('[data-out="gfdesc"]');
  if (!desc) return;
  for (const b of sh.querySelectorAll('[data-act="gfmode"]')) b.setAttribute('aria-pressed', b.dataset.v === f.m);
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
  } else if (f.m === 'steps' && (!f.id || f.wasBacklog)) {
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

// ---------- فورم جانب حياة جديد / تعديل ----------
export function lifeAreaFormSheet(f, canDelete) {
  const editing = !!f.origId;
  return {
    label: editing ? 'تعديل جانب الحياة' : 'جانب حياة جديد',
    head: `<h2>${editing ? 'تعديل جانب الحياة' : 'جانب حياة جديد'}</h2>`,
    body: `<label class="f"><span class="lbl">اسم الجانب</span>
        <input class="fld" data-role="laname" autocomplete="off" data-focus placeholder="مثلاً: العلاقات، المال، النفسية، المشاريع…" value="${esc(f.name || '')}">
      </label>
      <label class="f"><span class="lbl">سطر رؤية أو معيار للجانب ده (اختياري)</span>
        <input class="fld" data-role="lanote" autocomplete="off" placeholder="مثلاً: أحافظ على هدوئي ووقت حقيقي مع أهلي" value="${esc(f.note || '')}">
      </label>
      <div><span class="lbl">الأيقونة</span>
        <div class="picks">${LIFE_AREA_ICONS.map(([id, l]) => `<button class="bchip" type="button" data-act="laico" data-v="${id}" data-keep aria-pressed="${f.icon === id}"><span class="bic">${ico(id)}</span><span>${l}</span></button>`).join('')}</div>
      </div>`,
    foot: editing && canDelete
      ? `<div class="foot2"><button class="b-sec" type="button" data-act="ladel">امسح الجانب</button>
          <button class="b-pri" type="button" data-act="lasave">احفظ</button></div>`
      : '<button class="b-pri" type="button" data-act="lasave">احفظ الجانب</button>',
  };
}

// ---------- جلسة مراجعة بنك الأهداف (بطاقة ورا بطاقة عند نهاية الفترة) ----------
export function goalReviewSheet(rv, gsum, s) {
  const total = rv.ids.length;
  const doneCount = rv.i;
  const pct = total ? Math.min(100, Math.round((doneCount / total) * 100)) : 100;

  if (rv.i >= total) {
    const hasCurPeriod = !!periodOf(s.periods, s.today);
    const parts = [];
    if (rv.stats.activated) parts.push(`فعّلت ${fmtNum(rv.stats.activated)}`);
    if (rv.stats.period) parts.push(`للفترة الجاية ${fmtNum(rv.stats.period)}`);
    if (rv.stats.kept) parts.push(`أجّلت ${fmtNum(rv.stats.kept)}`);
    if (rv.stats.dropped) parts.push(`استبعدت ${fmtNum(rv.stats.dropped)}`);
    return {
      label: 'ملخص المراجعة',
      head: '<h2>خلصت المراجعة ✓</h2>',
      body: `<div class="panel rev-done">
          <span class="g-med ok">${ico('check')}</span>
          <b>دماغك أصفى دلوقتي</b>
          <p>${parts.length ? esc(parts.join(' · ')) : 'راجعت كل الأهداف اللي كانت في البنك.'}</p>
          <p class="hint">أهدافك النشطة دلوقتي: <b>${fmtNum(gsum.active.length)}</b> · الباقي في البنك: <b>${fmtNum(gsum.backlog.length)}</b></p>
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
      label: 'مراجعة بنك الأهداف',
      head: '<h2>مراجعة بنك الأهداف</h2>',
      body: '<p class="hint">الهدف ده اتنقل أو اتمسح.</p>',
      foot: '<button class="b-pri" type="button" data-act="grevkeep">اللي بعده</button>',
    };
  }
  const ev = gsum.evals.get(g.id);
  const areaEntry = (gsum.areas || []).find((x) => x.area.id === ev.pillar.id);
  const areaActive = areaEntry ? areaEntry.active.length : 0;
  const age = backlogAgeText(g.at, s.today, s.settings?.dayStart);

  return {
    label: 'مراجعة بنك الأهداف',
    head: `<h2>مراجعة بنك الأهداف <small class="rev-step">${fmtNum(rv.i + 1)} من ${fmtNum(total)}</small></h2>`,
    body: `<div class="pace-bar" aria-hidden="true"><div class="pace-fill" style="width:${pct}%"></div></div>
      <div class="panel rev-card">
        <div class="rev-meta">
          <span class="apill on">${ico(ev.pillar.icon)}<span>${esc(ev.pillar.name)}</span></span>
          ${age ? `<span class="apill">${esc(age)}</span>` : ''}
          ${g.pri ? '<span class="apill attn">أولوية ⚑</span>' : ''}
        </div>
        <h3 class="rev-title">${esc(g.t)}</h3>
        ${g.why ? `<p class="g-ref"><b>ليه كنت عايز ده:</b> ${esc(g.why)}</p>` : ''}
        <p class="rev-ctx">${areaActive
          ? `عندك ${goalsWord(areaActive)} نشط في «${esc(ev.pillar.name)}» · الإجمالي النشط: ${fmtNum(gsum.active.length)}`
          : `مفيش أهداف نشطة في «${esc(ev.pillar.name)}» دلوقتي · الإجمالي النشط: ${fmtNum(gsum.active.length)}`}</p>
      </div>
      <div class="rev-decisions">
        <button type="button" class="b-pri" data-act="grevact" data-id="${esc(g.id)}">ابدأه كهدف نشط ←</button>
        <button type="button" class="b-accent" data-act="grevperiod" data-id="${esc(g.id)}">اجعله هدف الفترة الجاية</button>
        <div class="foot2">
          <button type="button" class="b-sec" data-act="grevkeep" data-id="${esc(g.id)}">سيبه لبعدين</button>
          <button type="button" class="gh rev-drop" data-act="grevdrop" data-id="${esc(g.id)}">مش مستاهل</button>
        </div>
      </div>`,
    foot: '',
  };
}
