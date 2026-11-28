// views/tasks.js — تبويبة المهام جوه «الخطة»: ميعاد مرن (النهارده/بكرة/تاريخ/بعدين) + تصنيف + تعديل + ربط بالأهداف.

import { TASK_CATS, groupTasks, isOverdue, shortDate, addDays, fmtNum } from '../logic.js';
import { esc, ic, ico, P, setHtml } from '../ui.js';
import { planSwitch } from './goals.js';

export function tasksShell(s, ui) {
  return `<div data-out="planhead">${planSwitch(s, ui)}</div>
    <form class="panel addform" data-act="addtask">
      <div class="addrow">
        <input class="fld" data-role="taskin" placeholder="مهمة جديدة…" aria-label="مهمة جديدة" autocomplete="off" enterkeyhint="done" value="${esc(ui.drafts.taskin || '')}">
        <button class="addbtn" type="submit" aria-label="ضيف المهمة">${ic(P.plus)}</button>
      </div>
      <div class="topts">
        <button class="opt" type="button" data-act="tpri" data-keep aria-pressed="false">مهم ⚑</button>
        <div class="pfilt tgp-row" role="group" aria-label="المهمة لإمتى" style="flex:1;margin:0;padding:0">
          <button class="pf" type="button" data-act="twhen" data-v="today" data-keep>النهارده</button>
          <button class="pf" type="button" data-act="twhen" data-v="tomorrow" data-keep>بكرة</button>
          <button class="pf" type="button" data-act="twhen" data-v="date" data-keep>تاريخ</button>
          <button class="pf" type="button" data-act="twhen" data-v="later" data-keep>بعدين</button>
        </div>
      </div>
      <input class="fld" type="date" data-role="tdate" value="${esc(ui.tdate || addDays(s.today, 1))}" hidden>
      <div class="pfilt tgp-row" role="group" aria-label="تصنيف المهمة">
        <button class="pf" type="button" data-act="tcat" data-v="" data-keep aria-pressed="true">بدون تصنيف</button>
        ${TASK_CATS.map((c) => `<button class="pf" type="button" data-act="tcat" data-v="${esc(c)}" data-keep aria-pressed="false">${esc(c)}</button>`).join('')}
      </div>
      <div class="tgoal-pick" data-out="tgoalpick" hidden></div>
    </form>
    <div class="stack" data-out="tasks"></div>`;
}

function taskRow(t, today, where, goalMap) {
  const late = isOverdue(t, today);
  const pri = t.pri && !t.done;
  const g = t.goalId ? goalMap.get(String(t.goalId)) : null;
  const tom = addDays(today, 1);
  const dueBadge = !t.done && t.due && t.due > today
    ? `<span class="tcat">${t.due === tom ? 'بكرة' : shortDate(t.due)}</span>` : '';
  const move = where === 'today'
    ? `<button class="ib" type="button" data-act="tmove" data-id="${esc(t.id)}" aria-label="انقلها لبعدين">${ic(P.down)}</button>`
    : `<button class="ib" type="button" data-act="tmove" data-id="${esc(t.id)}" aria-label="انقلها للنهارده">${ic(P.up)}</button>`;
  return `<div class="tk${t.done ? ' done' : ''}${pri ? ' pri' : ''}">
    <button class="tk-c" type="button" data-act="tdone" data-id="${esc(t.id)}" aria-pressed="${!!t.done}" aria-label="${t.done ? 'رجّعها مفتوحة' : 'علّم إنها خلصت'}: ${esc(t.t)}"><i>${t.done ? ic(P.check) : ''}</i></button>
    <button class="tk-m tk-editb" type="button" data-act="tedit" data-id="${esc(t.id)}" aria-label="عدّل المهمة: ${esc(t.t)}">
      <span class="tk-t">${pri ? '<span class="flag" aria-label="مهم">⚑</span>' : ''}${esc(t.t)}</span>
      <span class="tk-tags">
        ${t.cat ? `<span class="tcat">${esc(t.cat)}</span>` : ''}
        ${dueBadge}
        ${g ? `<span class="g-tag">${ico('target')}<span>${esc(g.t)}</span></span>` : ''}
        ${late ? `<span class="tk-s">${ic(P.clock)}متأخرة من ${shortDate(t.due)}</span>` : ''}
      </span>
    </button>
    ${t.done ? '' : move}
    <button class="ib" type="button" data-act="tdel" data-id="${esc(t.id)}" aria-label="امسح المهمة">${ic(P.close)}</button>
  </div>`;
}

function group(title, list, today, where, emptyMsg, goalMap) {
  const head = `<div class="sec"><b>${title}</b>${list.length ? `<span>${fmtNum(list.length)}</span>` : ''}</div>`;
  if (!list.length) return `${head}<div class="list"><p class="empty-s">${emptyMsg}</p></div>`;
  return `${head}<div class="list">${list.map((t) => taskRow(t, today, where, goalMap)).join('')}</div>`;
}

export function updateTasks(root, s, ui) {
  const pri = root.querySelector('[data-act="tpri"]');
  if (!pri) return;
  const head = root.querySelector('[data-out="planhead"]');
  if (head) setHtml(head, planSwitch(s, ui));
  pri.setAttribute('aria-pressed', ui.tpri);
  for (const b of root.querySelectorAll('[data-act="twhen"]')) {
    const on = b.dataset.v === ui.twhen;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
  const dt = root.querySelector('[data-role="tdate"]');
  if (dt) dt.hidden = ui.twhen !== 'date';
  for (const b of root.querySelectorAll('[data-act="tcat"]')) {
    b.setAttribute('aria-pressed', b.dataset.v === (ui.tcat || ''));
  }
  const inp = root.querySelector('[data-role="taskin"]');
  inp.placeholder = ui.twhen === 'today' ? 'مهمة للنهارده…' : ui.twhen === 'tomorrow' ? 'مهمة لبكرة…' : ui.twhen === 'date' ? 'مهمة للتاريخ المختار…' : 'مهمة لبعدين…';

  // ربط بهدف
  const activeGoals = (s.goals || []).filter((g) => !g.done && g.st !== 'backlog');
  const gpick = root.querySelector('[data-out="tgoalpick"]');
  if (gpick) {
    gpick.hidden = !activeGoals.length;
    if (activeGoals.length) {
      if (ui.tgoal && !activeGoals.some((g) => String(g.id) === String(ui.tgoal))) ui.tgoal = '';
      setHtml(gpick, `<span class="tgp-l">ربط بهدف (اختياري):</span>
        <div class="pfilt tgp-row" role="group" aria-label="ربط المهمة بهدف">
          <button class="pf" type="button" data-act="tgoal" data-id="" data-keep aria-pressed="${!ui.tgoal}">بدون هدف</button>
          ${activeGoals.map((g) => `<button class="pf" type="button" data-act="tgoal" data-id="${esc(g.id)}" data-keep aria-pressed="${String(ui.tgoal) === String(g.id)}">${esc(g.t)}</button>`).join('')}
        </div>`);
    }
  }

  const out = root.querySelector('[data-out="tasks"]');
  if (!s.tasks.length) {
    setHtml(out, `<div class="empty"><b>مفيش مهام لسه</b>
      <p>اكتب أول مهمة فوق، ومهام النهارده هتبان كمان في سطر «خطتك» في تبويبة اليوم.</p></div>`);
    return;
  }
  const goalMap = new Map((s.goals || []).map((g) => [String(g.id), g]));
  const hasLinked = s.tasks.some((t) => t.goalId && goalMap.has(String(t.goalId)));
  const usedCats = TASK_CATS.filter((c) => s.tasks.some((t) => t.cat === c));

  const validFilts = new Set(['all', ...(hasLinked ? ['linked'] : []), ...usedCats.map((c) => `cat:${c}`)]);
  if (!validFilts.has(ui.tfilt)) ui.tfilt = 'all';

  let list = s.tasks;
  if (ui.tfilt === 'linked') list = s.tasks.filter((t) => t.goalId && goalMap.has(String(t.goalId)));
  else if (ui.tfilt.startsWith('cat:')) list = s.tasks.filter((t) => t.cat === ui.tfilt.slice(4));

  const g = groupTasks(list, s.today);
  const showFilt = hasLinked || usedCats.length > 0;
  const filt = showFilt ? `<div class="pfilt" role="group" aria-label="فلترة المهام">
      <button class="pf" type="button" data-act="tfilt" data-v="all" aria-pressed="${ui.tfilt === 'all'}">الكل (${fmtNum(s.tasks.length)})</button>
      ${hasLinked ? `<button class="pf" type="button" data-act="tfilt" data-v="linked" aria-pressed="${ui.tfilt === 'linked'}">مربوطة بأهداف</button>` : ''}
      ${usedCats.map((c) => `<button class="pf" type="button" data-act="tfilt" data-v="cat:${esc(c)}" aria-pressed="${ui.tfilt === `cat:${c}`}">${esc(c)}</button>`).join('')}
    </div>` : '';
  const todayEmpty = g.later.length ? 'النهارده فاضي. انقل مهمة من "بعدين" بالسهم.' : 'النهارده فاضي.';
  setHtml(out, filt + group('النهارده', g.today, s.today, 'today', todayEmpty, goalMap)
    + (g.later.length ? group('بعدين / مجدولة', g.later, s.today, 'later', '', goalMap) : '')
    + (g.done.length ? group('خلصت', g.done, s.today, 'done', '', goalMap) : ''));
}
