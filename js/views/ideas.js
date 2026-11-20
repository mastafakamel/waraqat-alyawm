// views/ideas.js — تبويبة الأفكار. نفس فكرة المهام: الهيكل مرة واحدة، والقايمة بتتحدّث لوحدها.

import { IDEA_CATS, sortIdeas, searchIdeas, shortDate, fmtNum } from '../logic.js';
import { esc, ic, P, setHtml } from '../ui.js';

export function ideasShell(s, ui) {
  return `<form class="panel addform" data-act="addidea">
      <textarea class="fld" data-role="ideain" rows="3" placeholder="اكتب الفكرة…" aria-label="فكرة جديدة">${esc(ui.drafts.ideain || '')}</textarea>
      <div class="cats chips" role="group" aria-label="التصنيف">${IDEA_CATS.map((c) => `<button class="cat" type="button" data-act="icat" data-c="${c}" data-keep aria-pressed="false">${c}</button>`).join('')}</div>
      <button class="b-pri" type="submit">احفظ الفكرة</button>
    </form>
    <div data-out="isearch" hidden>
      <input class="fld" type="search" data-role="iq" placeholder="دوّر في الأفكار…" aria-label="دوّر في الأفكار" autocomplete="off" enterkeyhint="search" value="${esc(ui.drafts.iq || '')}">
    </div>
    <div class="stack" data-out="ideas"></div>`;
}

function ideaCard(i) {
  return `<article class="idea${i.pin ? ' pin' : ''}">
    <p class="idea-t">${esc(i.t)}</p>
    <div class="idea-f">
      <span class="idea-m">${esc(i.c)}، ${shortDate(i.at)}</span>
      <button class="ib pinb" type="button" data-act="ipin" data-id="${esc(i.id)}" aria-pressed="${!!i.pin}" aria-label="${i.pin ? 'شيل التثبيت' : 'ثبّت الفكرة فوق'}">★</button>
      <button class="ib" type="button" data-act="idel" data-id="${esc(i.id)}" aria-label="امسح الفكرة">${ic(P.close)}</button>
    </div></article>`;
}

export function updateIdeas(root, s, ui) {
  for (const b of root.querySelectorAll('[data-act="icat"]')) {
    const on = b.dataset.c === ui.icat;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
  const out = root.querySelector('[data-out="ideas"]');
  if (!out) return;
  root.querySelector('[data-out="isearch"]').hidden = !s.ideas.length;
  if (!s.ideas.length) {
    setHtml(out, `<div class="empty"><b>مفيش أفكار لسه</b>
      <p>أي فكرة تيجي في بالك اكتبها فوق، أو من شريط التسجيل السريع في تبويبة اليوم.</p></div>`);
    return;
  }
  const q = (ui.drafts.iq || '').trim();
  const list = sortIdeas(searchIdeas(s.ideas, q));
  const count = q ? `${fmtNum(list.length)} من ${fmtNum(s.ideas.length)}` : fmtNum(s.ideas.length);
  setHtml(out, `<div class="sec"><b>${q ? 'نتايج البحث' : 'الأفكار'}</b><span>${count}</span></div>
    ${list.length ? list.map(ideaCard).join('') : `<div class="list"><p class="empty-s">مفيش أفكار فيها "${esc(q)}".</p></div>`}`);
}
