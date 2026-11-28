// views/time.js — تاب «الوقت»: الساعة دي فوق، وملخص اليوم مقارن بعادتك، والفترات ساعة بساعة
// (اللي خلص بيتقفل، واللي محتاج منك حاجة بيفضل باين).

import {
  periodsFor, periodHoursFor, activeTimeCats, allTimeCatMap, dayHoursFor,
  fmtHour, fmtNum, fmt12, hourSpan, fmtHours, timeByCat, periodPhase, periodIndex, sleepHourList,
  firstCatHour, lastCatBefore, periodFold, sortTimeCats,
} from '../logic.js';
import { esc, ic, ico, P } from '../ui.js';

const catCls = (cat) => `tc-${cat.color || cat.id}`;

/** كارت «الساعة دي»: إنت بتعمل إيه دلوقتي، وتسجّله بلمسة، وطاقتك في الفترة دي. */
function nowCard(s, hour, brush, catMap, ds) {
  const hrs = s.day.hrs || {};
  const entry = hrs[String(hour)];
  const cat = entry?.c ? catMap.get(entry.c) : null;
  const note = (entry?.t || '').trim();
  const [pk, plabel] = periodsFor(ds)[periodIndex(hour, ds)];
  const prev = cat ? null : lastCatBefore(s.day, hour, ds);
  const prevCat = prev ? catMap.get(prev.c) : null;
  const brushCat = brush !== 'clear' ? catMap.get(brush) : null;
  const goCat = prevCat || brushCat;

  const what = cat
    ? `<div class="tn-what filled ${catCls(cat)}"><span class="hr-ic">${ico(cat.icon)}</span><b>${esc(cat.name)}</b>${note ? `<span class="hr-txt">· ${esc(note)}</span>` : ''}</div>`
    : `<div class="tn-what"><span class="tn-empty">لسه ماسجّلتش الساعة دي</span></div>`;
  const acts = cat
    ? `<button class="tn-b sec" type="button" data-act="hedit" data-h="${hour}">${ic(P.edit)}غيّر</button>`
    : `${goCat ? `<button class="tn-b pri ${catCls(goCat)}" type="button" data-act="hnow" data-h="${hour}" data-c="${esc(goCat.id)}"><span class="hr-ic">${ico(goCat.icon)}</span>${prevCat ? 'كمّل' : 'سجّل'} ${esc(goCat.name)}</button>` : ''}
       <button class="tn-b sec" type="button" data-act="hedit" data-h="${hour}">اختار تاني</button>`;

  return `<section class="panel tnow" aria-label="الساعة دي">
      <div class="tn-h"><b>الساعة ${fmtHour(hour)}</b><small>دلوقتي، ${plabel}</small></div>
      ${what}
      <div class="tn-acts">${acts}</div>
      <div class="tn-en">
        <span>طاقتك</span>
        <div class="pseg amb" data-rate="${pk}e" role="group" aria-label="طاقة ${plabel}">
          ${[1, 2, 3, 4, 5].map((n) => `<button class="ps" type="button" data-v="${n}" aria-label="${n} من ٥">${fmtNum(n)}</button>`).join('')}
        </div>
      </div>
    </section>`;
}

/** ملخص اليوم: الشغل من هدفك، والتشتيت وأول ساعة شغل مقارنين بعادتك (آخر ٧ أيام). */
function daySummary(s, tb, tbase, hour, ds) {
  const cfg = s.settings;
  const isToday = s.cur === s.today;
  const order = dayHoursFor(ds);
  const logged = tb.total - (tb.by.sleep || 0);
  // tbase مش موجود = الأيام اللي فاتت لسه بتتحمّل: سطر فاضي بنفس الارتفاع بدل جملة مش صح
  const early = tbase ? '<span class="pm-sub">لسه بدري نقارن</span>' : '<span class="pm-sub">&nbsp;</span>';

  // ١. الشغل من الهدف
  const workH = tb.by.work || 0;
  const goal = cfg.workTarget || 7;
  const met = workH >= goal;
  const workVal = s.day.workOff && !workH ? 'إجازة'
    : logged ? `${fmtNum(workH)} <small>من ${fmtNum(goal)}</small>` : `— <small>من ${fmtNum(goal)}</small>`;
  const workSub = met ? '<span class="pm-sub">وصلت ✓</span>'
    : s.day.workOff ? '<span class="pm-sub">يوم إجازة</span>'
      : isToday ? `<span class="pm-sub">فاضل ${fmtHours(goal - workH)}</span>` : '';
  const workPct = Math.min(100, Math.round((workH / goal) * 100));

  // ٢. التشتيت وعادتك
  const dist = tb.by.distract || 0;
  const distBase = tbase?.by ? (tbase.by.distract || 0) : null;
  const distVal = logged ? `${fmtNum(dist)} <small>س</small>` : '—';
  const distSub = distBase == null ? early
    : `<span class="pm-sub">عادتك ${fmtNum(Math.round(distBase * 10) / 10)}</span>`;
  const distWorse = logged && distBase != null && dist > distBase + 0.5;

  // ٣. أول ساعة شغل وعادتك
  const fw = firstCatHour(s.day, 'work', ds);
  const usual = tbase?.firstWork ?? null;
  const pos = (h) => order.indexOf(h);
  let fwVal = '—';
  let fwSub = usual != null ? `<span class="pm-sub">عادتك ${fmtHour(usual)}</span>` : early;
  let late = false;
  if (fw != null) {
    fwVal = fmtHour(fw);
    if (usual != null && fw === usual) fwSub = '<span class="pm-sub">زي عادتك</span>';
    late = usual != null && pos(fw) > pos(usual) + 1;
  } else if (isToday && usual != null && pos(hour) > pos(usual) && !s.day.workOff) {
    fwVal = 'لسه';
    late = true;
  }

  return `<section class="panel tday" aria-label="وقتك النهارده">
      <div class="pm-sub3">
        <button class="pm-cell${met || s.day.workOff ? ' done' : ''}" type="button" data-act="tbrush" data-c="work" aria-label="الشغل: ${fmtNum(workH)} من ${fmtNum(goal)} ساعات">
          <span class="pm-k"><span>الشغل</span><span class="pm-ic">${ico('brief')}</span></span>
          <span class="pm-v sm">${workVal}</span>
          ${workSub}
          <span class="pm-line${met ? ' done' : ''}"><i style="width:${s.day.workOff ? 100 : workPct}%"></i></span>
        </button>
        <button class="pm-cell${distWorse ? ' waste' : ''}" type="button" data-act="tbrush" data-c="distract" aria-label="التشتيت">
          <span class="pm-k"><span>تشتيت</span><span class="pm-ic">${ico('distract')}</span></span>
          <span class="pm-v sm${distWorse ? ' warn' : ''}">${distVal}</span>
          ${distSub}
        </button>
        <div class="pm-cell" role="group" aria-label="أول ساعة شغل">
          <span class="pm-k"><span>أول شغل</span><span class="pm-ic">${ico('clock')}</span></span>
          <span class="pm-v sm${late ? ' warn' : ''}">${fwVal}</span>
          ${fwSub}
        </div>
      </div>
      <div class="tb-prog">
        ${timeStackBar(tb)}
        <span class="tb-cnt">${fmtNum(tb.total)} من ٢٤ ساعة</span>
      </div>
    </section>`;
}

/** شريط ساعات الفترة وهي مقفولة: خانة لكل ساعة بلون مجالها. */
function periodStrip(list, hrs, catMap) {
  return `<span class="tper-strip" aria-hidden="true">${list.map((h) => {
    const c = hrs[String(h)]?.c;
    const cat = c ? catMap.get(c) : null;
    return `<i${cat ? ` class="${catCls(cat)}"` : ''}></i>`;
  }).join('')}</span>`;
}

/** شريط توزيع الـ ٢٤ ساعة (مشترك بين تاب اليوم وتاب الوقت). */
export function timeStackBar(tb) {
  if (!tb.total) return '<div class="tstack" aria-hidden="true"></div>';
  return `<div class="tstack" aria-hidden="true">${tb.rows
    .map((r) => `<i class="tc-${r.color || r.id}" style="width:${(r.hours / 24) * 100}%"></i>`).join('')}</div>`;
}

export function renderTime(s, ui, ctx = {}) {
  const cfg = s.settings;
  const ds = cfg.dayStart || 4;
  const pers = periodsFor(ds);
  const perHours = periodHoursFor(ds);
  const cats = sortTimeCats(activeTimeCats(cfg), ctx.tusage || {}); // الأكتر استخدام الأول
  const catMap = allTimeCatMap(cfg);

  const isToday = s.cur === s.today;
  const hour = ctx.hour ?? new Date().getHours();
  const order = dayHoursFor(ds);
  const hrs = s.day.hrs || {};
  const tb = timeByCat(s.day, cfg);
  const brush = (ui.tbrush === 'clear' || catMap.has(ui.tbrush)) ? ui.tbrush : (cats[0]?.id || 'work');
  const activeCat = catMap.get(brush);
  const sleepHours = sleepHourList(s.day.sleep, s.day.wake);
  const sleepBtn = sleepHours.length
    ? `<button class="tfill" type="button" data-act="fillsleep">ملء النوم (${fmt12(s.day.sleep)} ← ${fmt12(s.day.wake)})</button>`
    : '<button class="tfill" type="button" data-act="sheet" data-sheet="sleep">سجّل وقت النوم</button>';

  const brushBar = `<section class="panel tbrush" aria-label="اختيار مجال الوقت">
      <div class="tb-top">
        <span class="tb-l">اختار المجال ودوس على الساعات</span>
        ${sleepBtn}
      </div>
      <div class="tb-chips" role="group" aria-label="مجالات الوقت" data-keep-scroll="tbchips">
        ${cats.map((c) => `<button class="bchip tc-${c.color || c.id}" type="button" data-act="tbrush" data-c="${esc(c.id)}" aria-pressed="${brush === c.id}">
          <span class="bic">${ico(c.icon)}</span><span>${esc(c.name)}</span></button>`).join('')}
        <button class="bchip clear" type="button" data-act="tbrush" data-c="clear" aria-pressed="${brush === 'clear'}">${ic(P.eraser)}<span>مسح</span></button>
      </div>
    </section>`;

  const opened = ui.topen?.[s.cur] || {};
  const periodsHtml = pers.map(([k, label, range], i) => {
    const ph = periodPhase(i, s.cur, s.today, hour, ds);
    const list = perHours[i];
    const doneCount = list.filter((h) => hrs[String(h)]?.c).length;
    const fold = periodFold(ph, doneCount, list.length);
    const open = opened[k] ?? fold.open;
    const oldTxt = (s.day[`${k}t`] || '').trim();
    const shortRange = range.replace(/^من /, '');
    const n = list.length;
    // الفاصل "،" مش "·": الصفر العربي "٠" شكله نقطة، فالنقطة جنب رقم بتتقري صفر
    const statusTxt = {
      now: `${fmtNum(doneCount)} من ${fmtNum(n)}`,
      full: 'متسجلة كلها',
      gaps: `${fmtNum(n - doneCount)} فاضية من ${fmtNum(n)}`,
      empty: 'فاضية خالص',
      future: 'لسه',
    }[fold.kind];
    const en = +s.day[`${k}e`] || 0;

    const head = `<button class="tper-h" type="button" data-act="tptog" data-p="${k}" aria-expanded="${open}">
        <span class="tper-r1">
          <b>${label}</b>
          <small>${shortRange}، ${statusTxt}</small>
          ${ph === 'now' ? '<span class="nowc">دلوقتي</span>' : en ? `<span class="tper-env">طاقة ${fmtNum(en)}</span>` : ''}
          <span class="tper-chev">${ic(P.chev)}</span>
        </span>
        ${!open && fold.kind !== 'future' ? periodStrip(list, hrs, catMap) : ''}
        ${!open && fold.kind === 'empty' ? '<span class="tper-cta">دوس تسجّل ساعاتها</span>' : ''}
      </button>`;
    const cls = `panel tper ${fold.kind}${open ? ' open' : ''}`;
    if (!open) return `<section class="${cls}" aria-label="${label}">${head}</section>`;

    const rows = list.map((h) => {
      const entry = hrs[String(h)];
      const cat = entry?.c ? catMap.get(entry.c) : null;
      const isNow = isToday && h === hour;
      const later = isToday && order.indexOf(h) > order.indexOf(hour);
      const note = (entry?.t || '').trim();
      let slotInner;
      if (cat) {
        slotInner = `<span class="hr-ic">${ico(cat.icon)}</span><b class="hr-cat">${esc(cat.name)}</b>${note ? `<span class="hr-txt">· ${esc(note)}</span>` : ''}`;
      } else if (note) {
        slotInner = `<span class="hr-txt only">${esc(note)}</span><span class="hr-tag">اختار مجال</span>`;
      } else {
        slotInner = `<span class="hr-ph">${activeCat ? `دوس تسجّل ${esc(activeCat.name)}` : 'فاضية'}</span>`;
      }
      const cls = cat ? `hr-slot filled tc-${cat.color || cat.id}` : note ? 'hr-slot untagged' : 'hr-slot';
      const labelWord = cat ? `${cat.name}${note ? `، ${note}` : ''}` : note || 'فاضية';
      return `<div class="hr-row${isNow ? ' now' : ''}${later && !cat && !note ? ' later' : ''}">
          <span class="hr-t">${fmtHour(h)}</span>
          <button class="${cls}" type="button" data-act="hset" data-h="${h}" aria-label="الساعة ${fmtHour(h)}: ${esc(labelWord)}">${slotInner}</button>
          <button class="hr-ed" type="button" data-act="hedit" data-h="${h}" aria-label="تفاصيل الساعة ${fmtHour(h)}">${ic(P.edit)}</button>
        </div>`;
    }).join('');

    return `<section class="${cls}" aria-label="${label}">
        ${head}
        ${oldTxt ? `<div class="tper-oldw"><button class="tper-old" type="button" data-act="sheet" data-sheet="${k}"><span>ملخص الفترة: ${esc(oldTxt)}</span>${ic(P.chev)}</button></div>` : ''}
        <div class="hr-list">${rows}</div>
      </section>`;
  }).join('');

  return `${isToday ? nowCard(s, hour, brush, catMap, ds) : ''}
    ${daySummary(s, tb, ctx.tbase, hour, ds)}
    ${brushBar}${periodsHtml}
    <button class="lnk2" type="button" data-act="sheet" data-sheet="energy" style="align-self:center">طاقة كل الفترات، والتوتر، واللي رفع ووطّى طاقتك</button>`;
}

/** شاشة تفاصيل ساعة واحدة: اختيار المجال + ملاحظة + يمتد كام ساعة (١، ٢، ٣، ٤، ٦). */
export function hourSheet(h, hf, s, usage = {}) {
  const span = hf.span || 1;
  const cats = sortTimeCats(activeTimeCats(s.settings), usage); // نفس ترتيب الصف اللي فوق
  return {
    label: `الساعة ${fmtHour(h)}`,
    head: `<h2>الساعة ${fmtHour(h)}</h2>`,
    body: `<div>
        <span class="lbl">المجال</span>
        <div class="tb-chips" role="group" aria-label="اختيار المجال">
          ${cats.map((c) => `<button class="bchip tc-${c.color || c.id}" type="button" data-act="hcat" data-c="${esc(c.id)}" data-keep aria-pressed="${hf.c === c.id}">
            <span class="bic">${ico(c.icon)}</span><span>${esc(c.name)}</span></button>`).join('')}
        </div>
      </div>
      <form class="addform" data-act="hsave">
        <label class="f"><span class="lbl">عملت إيه في الساعة دي؟ (اختياري)</span>
          <input class="fld" data-role="hnote" data-focus autocomplete="off" enterkeyhint="done" placeholder="مثلاً: شغل على ورقة اليوم، طريق الشغل…" value="${esc(hf.t || '')}">
        </label>
      </form>
      <div>
        <span class="lbl">المدة (يمتد كام ساعة؟)</span>
        <div class="chs" role="group" aria-label="المدة بالساعات">
          ${[1, 2, 3, 4, 6].map((n) => `<button class="ch" type="button" data-act="hspan" data-n="${n}" data-keep aria-pressed="${span === n}">${n === 1 ? 'ساعة' : fmtNum(n)}</button>`).join('')}
        </div>
        <p class="note" data-out="hspaninfo" style="margin-top:8px"></p>
      </div>`,
    foot: `<div class="foot2">
        <button class="b-sec" type="button" data-act="hclear">امسح</button>
        <button class="b-pri" type="button" data-act="hsave">احفظ</button>
      </div>`,
  };
}

export function updateHourSheet(sh, hf, s) {
  if (!sh || !hf) return;
  for (const b of sh.querySelectorAll('[data-act="hcat"]')) {
    b.setAttribute('aria-pressed', b.dataset.c === hf.c);
  }
  for (const b of sh.querySelectorAll('[data-act="hspan"]')) {
    const on = +b.dataset.n === hf.span;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
  const info = sh.querySelector('[data-out="hspaninfo"]');
  if (info) {
    const list = hourSpan(hf.h, hf.span, s?.settings?.dayStart);
    const endH = (list[list.length - 1] + 1) % 24;
    info.innerHTML = list.length > 1
      ? `هيتسجّل من <b>${fmtHour(list[0])}</b> لـ <b>${fmtHour(endH)}</b> (${fmtHours(list.length)}).`
      : `الساعة <b>${fmtHour(hf.h)}</b> بس.`;
  }
}
