// views/ideas.js — تبويبة الأفكار: تصنيفات مرنة + فلتر بالتصنيف + تعديل + تحويل لمهمة أو لهدف.

import { sortIdeas, searchIdeas, shortDate, fmtNum } from '../logic.js';
import { esc, ic, P, setHtml } from '../ui.js';

export function ideasShell(s, ui) {
  return `<form class="panel addform" data-act="addidea">
      <textarea class="fld" data-role="ideain" rows="3" placeholder="اكتب الفكرة…" aria-label="فكرة جديدة">${esc(ui.drafts.ideain || '')}</textarea>
      <div class="picks" data-out="icats" role="group" aria-label="التصنيف"></div>
      <button class="b-pri" type="submit">احفظ الفكرة</button>
    </form>
    <div data-out="isearch" hidden>
      <input class="fld" type="search" data-role="iq" placeholder="دوّر في الأفكار…" aria-label="دوّر في الأفكار" autocomplete="off" enterkeyhint="search" value="${esc(ui.drafts.iq || '')}">
    </div>
    <div data-out="ifilt"></div>
    <div class="stack" data-out="ideas"></div>`;
}

function ideaCard(i) {
  return `<article class="idea${i.pin ? ' pin' : ''}">
    <button class="idea-tb" type="button" data-act="iedit" data-id="${esc(i.id)}" aria-label="عدّل الفكرة">
      <p class="idea-t">${esc(i.t)}</p>
    </button>
    <div class="idea-f">
      <span class="idea-m">${esc(i.c)}، ${shortDate(i.at)}</span>
      <button class="idea-conv" type="button" data-act="itask" data-id="${esc(i.id)}" aria-label="حوّل الفكرة لمهمة">لمهمة${ic(P.plus)}</button>
      <button class="idea-conv" type="button" data-act="igoal" data-id="${esc(i.id)}" aria-label="حوّل الفكرة لهدف">لهدف${ic(P.arrowUpLeft)}</button>
      <button class="ib pinb" type="button" data-act="ipin" data-id="${esc(i.id)}" aria-pressed="${!!i.pin}" aria-label="${i.pin ? 'شيل التثبيت' : 'ثبّت الفكرة فوق'}">${ic(P.pin)}</button>
      <button class="ib" type="button" data-act="idel" data-id="${esc(i.id)}" aria-label="امسح الفكرة">${ic(P.close)}</button>
    </div></article>`;
}

export function updateIdeas(root, s, ui) {
  const cats = s.settings.ideaCats || [];
  if (!cats.includes(ui.icat) && cats.length) ui.icat = cats[cats.length - 1];
  setHtml(root.querySelector('[data-out="icats"]'), cats.map((c) => `<button class="pk" type="button" data-act="icat" data-c="${esc(c)}" data-keep aria-pressed="${c === ui.icat}">${esc(c)}</button>`).join(''));

  const out = root.querySelector('[data-out="ideas"]');
  if (!out) return;
  root.querySelector('[data-out="isearch"]').hidden = !s.ideas.length;
  const fbox = root.querySelector('[data-out="ifilt"]');
  if (!s.ideas.length) {
    setHtml(fbox, '');
    setHtml(out, `<div class="empty"><b>مفيش أفكار لسه</b>
      <p>أي فكرة تيجي في بالك اكتبها فوق، أو من شريط التسجيل السريع في تبويبة اليوم.</p></div>`);
    return;
  }

  const usedCats = [...new Set([...cats, ...s.ideas.map((x) => x.c).filter(Boolean)])].filter((c) => s.ideas.some((x) => x.c === c));
  if (ui.ifilt && ui.ifilt !== 'all' && !usedCats.includes(ui.ifilt)) ui.ifilt = 'all';
  setHtml(fbox, usedCats.length > 1 ? `<div class="pfilt" role="group" aria-label="فلترة الأفكار بالتصنيف">
      <button class="pf" type="button" data-act="ifilt" data-v="all" aria-pressed="${ui.ifilt === 'all'}">الكل (${fmtNum(s.ideas.length)})</button>
      ${usedCats.map((c) => `<button class="pf" type="button" data-act="ifilt" data-v="${esc(c)}" aria-pressed="${ui.ifilt === c}">${esc(c)}</button>`).join('')}
    </div>` : '');

  const q = (ui.drafts.iq || '').trim();
  const byCat = ui.ifilt && ui.ifilt !== 'all' ? s.ideas.filter((x) => x.c === ui.ifilt) : s.ideas;
  const list = sortIdeas(searchIdeas(byCat, q));
  const count = (q || ui.ifilt !== 'all') ? `${fmtNum(list.length)} من ${fmtNum(s.ideas.length)}` : fmtNum(s.ideas.length);
  setHtml(out, `<div class="sec"><b>${q ? 'نتايج البحث' : ui.ifilt !== 'all' ? `أفكار: ${esc(ui.ifilt)}` : 'الأفكار'}</b><span>${count}</span></div>
    ${list.length ? list.map(ideaCard).join('') : `<div class="list"><p class="empty-s">مفيش أفكار مطابقة.</p></div>`}`);
}
