// views/tasks.js — تبويبة المهام. الهيكل (خانة الإضافة) بيترسم مرة واحدة لما تفتح التبويبة،
// وبعد كده بنحدّث القايمة والاختيارات بس، عشان اللي بتكتبه مايضيعش.

import { groupTasks, isOverdue, shortDate, fmtNum } from '../logic.js';
import { esc, ic, P, setHtml } from '../ui.js';

export function tasksShell(s, ui) {
  return `<form class="panel addform" data-act="addtask">
      <div class="addrow">
        <input class="fld" data-role="taskin" placeholder="مهمة جديدة…" aria-label="مهمة جديدة" autocomplete="off" enterkeyhint="done" value="${esc(ui.drafts.taskin || '')}">
        <button class="addbtn" type="submit" aria-label="ضيف المهمة">${ic(P.plus)}</button>
      </div>
      <div class="topts">
        <button class="opt" type="button" data-act="tpri" data-keep aria-pressed="false">مهم ⚑</button>
        <div class="seg2" role="group" aria-label="المهمة لإمتى">
          <button class="so" type="button" data-act="twhen" data-v="today" data-keep>النهارده</button>
          <button class="so" type="button" data-act="twhen" data-v="later" data-keep>بعدين</button>
        </div>
      </div>
    </form>
    <div class="stack" data-out="tasks"></div>`;
}

function taskRow(t, today, where) {
  const late = isOverdue(t, today);
  const pri = t.pri && !t.done;
  const move = where === 'today'
    ? `<button class="ib" type="button" data-act="tmove" data-id="${esc(t.id)}" aria-label="انقلها لبعدين">${ic(P.down)}</button>`
    : `<button class="ib" type="button" data-act="tmove" data-id="${esc(t.id)}" aria-label="انقلها للنهارده">${ic(P.up)}</button>`;
  return `<div class="tk${t.done ? ' done' : ''}${pri ? ' pri' : ''}">
    <button class="tk-c" type="button" data-act="tdone" data-id="${esc(t.id)}" aria-pressed="${!!t.done}" aria-label="${t.done ? 'رجّعها مفتوحة' : 'علّم إنها خلصت'}: ${esc(t.t)}"><i>${t.done ? ic(P.check) : ''}</i></button>
    <div class="tk-m"><span class="tk-t">${pri ? '<span class="flag" aria-label="مهم">⚑</span>' : ''}${esc(t.t)}</span>${late ? `<span class="tk-s">متأخرة من ${shortDate(t.due)}</span>` : ''}</div>
    ${t.done ? '' : move}
    <button class="ib" type="button" data-act="tdel" data-id="${esc(t.id)}" aria-label="امسح المهمة">${ic(P.close)}</button>
  </div>`;
}

function group(title, list, today, where, emptyMsg) {
  const head = `<div class="sec"><b>${title}</b>${list.length ? `<span>${fmtNum(list.length)}</span>` : ''}</div>`;
  if (!list.length) return `${head}<div class="list"><p class="empty-s">${emptyMsg}</p></div>`;
  return `${head}<div class="list">${list.map((t) => taskRow(t, today, where)).join('')}</div>`;
}

export function updateTasks(root, s, ui) {
  const pri = root.querySelector('[data-act="tpri"]');
  if (!pri) return;
  pri.setAttribute('aria-pressed', ui.tpri);
  for (const b of root.querySelectorAll('[data-act="twhen"]')) {
    const on = b.dataset.v === ui.twhen;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
  const inp = root.querySelector('[data-role="taskin"]');
  inp.placeholder = ui.twhen === 'today' ? 'مهمة للنهارده…' : 'مهمة لبعدين…';

  const out = root.querySelector('[data-out="tasks"]');
  if (!s.tasks.length) {
    setHtml(out, `<div class="empty"><b>مفيش مهام لسه</b>
      <p>اكتب أول مهمة فوق. والمهام اللي بتكتبها من شريط التسجيل السريع بتيجي هنا للنهارده.</p></div>`);
    return;
  }
  const g = groupTasks(s.tasks, s.today);
  const todayEmpty = g.later.length ? 'النهارده فاضي. انقل مهمة من "بعدين" بالسهم.' : 'النهارده فاضي.';
  setHtml(out, group('النهارده', g.today, s.today, 'today', todayEmpty)
    + (g.later.length ? group('بعدين', g.later, s.today, 'later', '') : '')
    + (g.done.length ? group('خلصت', g.done, s.today, 'done', '') : ''));
}
