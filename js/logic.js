// logic.js — حسابات ورقة اليوم. دوال من غير واجهة ومن غير تخزين، عشان تتختبر لوحدها (tests/logic.test.js).

export const HABITS = [
  ['fajr', 'الفجر'], ['wird', 'الورد'], ['azkm', 'أذكار الصبح'], ['azke', 'أذكار المسا'],
  ['ex', 'تمرين'], ['walk', 'مشي'], ['meals', 'أكل منتظم'], ['nojunk', 'بلا جانك'],
  ['eng', 'إنجليزي'], ['read', 'قراءة'], ['tech', 'تعلم تقني'], ['said', 'قلت اللي حسيته'],
  ['wed', 'الفرح/الشقة'],
];
export const PERIODS = [
  ['p1', 'بعد الفجر', 'من ٤ الفجر لـ ١٢ الضهر'],
  ['p2', 'بعد الضهر', 'من ١٢ لـ ٥ العصر'],
  ['p3', 'بعد المغرب', 'من ٥ لـ ٩ بالليل'],
  ['p4', 'قبل النوم', 'بعد ٩ بالليل'],
];
export const EXP_CATS = ['أكل', 'مواصلات', 'بيت', 'شخصي', 'شغل', 'فرح'];
export const IDEA_CATS = ['مشروع', 'شغل', 'شخصي', 'تعلم', 'تاني'];

// ---------- الأرقام ----------
const AR = '٠١٢٣٤٥٦٧٨٩';
const FA = '۰۱۲۳۴۵۶۷۸۹';

/** أي أرقام عربي أو فارسي → إنجليزي، والفاصلة العشرية العربي → نقطة. */
export function toEn(s) {
  return String(s ?? '')
    .replace(/[٠-٩]/g, (d) => AR.indexOf(d))
    .replace(/[۰-۹]/g, (d) => FA.indexOf(d))
    .replace(/٫/g, '.')
    .replace(/٬/g, '')
    .replace(/(\d),(\d{3})(?!\d)/g, '$1$2') // 1,250 = ألف ومتين وخمسين
    .replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2'); // 2,5 = اتنين ونص
}

/** يحوّل الأرقام الإنجليزي اللي في نص لعربي، من غير ما يلمس أي حاجة تانية. */
export function arDigits(s) {
  return String(s ?? '').replace(/\d/g, (d) => AR[d]);
}

/** رقم للعرض: عربي، وعشري واحد بالكتير، وبالفاصلة العشرية العربي (٥٫٥). */
export function fmtNum(n) {
  const r = Math.round((+n || 0) * 10) / 10;
  return r.toLocaleString('ar-EG', { maximumFractionDigits: 1 });
}

/** خانة رقم: يقبل عربي وإنجليزي ويرجّع رقم، أو '' لو مش رقم. */
export function readNumber(s) {
  const t = toEn(s).trim();
  if (t === '') return '';
  const n = Number(t);
  return Number.isFinite(n) ? n : '';
}

// ---------- التواريخ ----------
export function keyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(key, n) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}
export function dateTitle(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function dayRel(key, today) {
  if (key === today) return 'النهارده';
  return key < today ? 'يوم فات' : 'يوم جاي';
}

/** الفترة حسب الساعة: ٤–١٢ بعد الفجر، ١٢–٥ بعد الضهر، ٥–٩ بعد المغرب، وغير كده قبل النوم. */
export function periodIndex(hour) {
  if (hour >= 4 && hour < 12) return 0;
  if (hour >= 12 && hour < 17) return 1;
  if (hour >= 17 && hour < 21) return 2;
  return 3;
}

/**
 * الفترة i في اليوم المفتوح: 'past' فاتت، 'now' إنت فيها دلوقتي، 'future' لسه.
 * اليوم اللي فات كل فتراته فاتت، واليوم الجاي كلها لسه. وبعد ١٢ بالليل لحد ٤ الفجر لسه "قبل النوم" (زي lineTarget).
 */
export function periodPhase(i, cur, today, hour) {
  if (cur < today) return 'past';
  if (cur > today) return 'future';
  const n = periodIndex(hour);
  if (i === n) return 'now';
  return i < n ? 'past' : 'future';
}

// ---------- الوقت والنوم ----------
export function mins(s) {
  const m = /^(\d{1,2}):(\d{2})/.exec(toEn(s || '').trim());
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
/** مدة النوم بالدقايق = (صحيت − نمت + ١٤٤٠) % ١٤٤٠، فبتمشي صح مع النوم بعد نص الليل. */
export function sleepMinutes(sleep, wake) {
  const s = mins(sleep);
  const w = mins(wake);
  return s == null || w == null ? null : (w - s + 1440) % 1440;
}
/** ٤٣٠ → "٧:١٠" */
export function fmtHM(m) {
  return arDigits(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);
}
/** "00:40" → "١٢:٤٠" ، "19:05" → "٧:٠٥" */
export function fmt12(s) {
  const m = mins(s);
  if (m == null) return '';
  const h = Math.floor(m / 60) % 12 || 12;
  return arDigits(`${h}:${String(m % 60).padStart(2, '0')}`);
}

// ---------- التقييمات والعادات ----------
/** العادة: فاضية ← تم ← جزئي ← فاضية. القيم: 0 لا، 1 جزئي، 2 تم. */
export const cycleTri = (v) => [2, 0, 1][v || 0];
/** ٥ زراير: الدوس على رقم بيختار لحد الرقم ده، وعلى نفس الرقم تاني بيقلّل واحد. */
export const rateTap = (cur, v) => ((cur || 0) === v ? v - 1 : v);

export function has(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return v !== 0;
}
export function habitsDone(day) {
  return HABITS.filter(([k]) => day[k] === 2).length;
}

// ---------- الشغل والفلوس ----------
export function workRows(day) {
  return [1, 2, 3, 4]
    .map((i) => ({ p: (day[`w${i}p`] || '').trim(), h: +toEn(day[`w${i}h`]) || 0 }))
    .filter((r) => r.p || r.h);
}
export function workTotal(day) {
  return workRows(day).reduce((a, r) => a + r.h, 0);
}
export function expTotal(day) {
  return (day.exp || []).reduce((a, e) => a + (+e.a || 0), 0);
}
/** [['أكل', 75], ['مواصلات', 30]] مترتبة من الأكبر للأصغر. */
export function expByCat(day) {
  const by = {};
  for (const e of day.exp || []) by[e.c] = (by[e.c] || 0) + (+e.a || 0);
  return Object.entries(by).sort((a, b) => b[1] - a[1]);
}

/**
 * "٧٥ غدا" → {a:75, w:'غدا'} ، "أوبر 30 ج" → {a:30, w:'أوبر'} ، "١٢٠ جنيه بنزين" → {a:120, w:'بنزين'}
 * أول رقم هو المبلغ، والباقي وصف، ومن غير كلمة ج أو جنيه. لو مفيش رقم أكبر من صفر: null.
 */
export function parseExpense(text) {
  const s = toEn(text).trim();
  const m = /\d+(?:\.\d+)?/.exec(s);
  if (!m) return null;
  const a = parseFloat(m[0]);
  if (!(a > 0)) return null;
  const rest = `${s.slice(0, m.index)} ${s.slice(m.index + m[0].length)}`;
  const w = rest
    .split(/\s+/)
    .filter((t) => t && !/^(ج|ج\.|جم|جنيه|جنية|جنيهات)$/.test(t))
    .join(' ');
  return { a, w };
}

// ---------- البنود الأساسية ★ ----------
export const STAR_ITEMS = [
  { k: 'sleep', t: 'النوم', q: 'نمت إمتى وصحيت إمتى؟', done: (d) => has(d.sleep) || has(d.wake) },
  { k: 'screen', t: 'الشاشة', q: 'الـ Screen time كان كام النهارده؟', done: (d) => has(d.screen) },
  { k: 'mood', t: 'المزاج', q: 'مزاجك النهارده من ٥؟', done: (d) => has(d.mood) },
  {
    k: 'habits', t: 'العادات', q: 'عملت إيه من العادات النهارده؟',
    done: (d) => [...HABITS.map((h) => h[0]), 'salah'].some((k) => has(d[k])),
  },
  { k: 'work', t: 'الشغل', q: 'اشتغلت على إيه وكام ساعة؟', done: (d) => [1, 2, 3, 4].some((i) => has(d[`w${i}h`])) },
  { k: 'money', t: 'الفلوس', q: 'صرفت إيه النهارده؟', done: (d) => has(d.exp) || has(d.income) },
  { k: 'post', t: 'قرار وتأجيل', q: 'أجّلت إيه النهارده؟', done: (d) => has(d.post) },
  { k: 'top', t: 'أهم حاجة', q: 'إيه أهم حاجة حصلت النهارده؟', done: (d) => has(d.top) },
];
export function starState(day) {
  return STAR_ITEMS.map((s) => ({ ...s, ok: !!s.done(day) }));
}
export function starCount(day) {
  return starState(day).filter((s) => s.ok).length;
}
export function missingStars(day) {
  return starState(day).filter((s) => !s.ok);
}
/** ١ → "بند واحد" ، ٢ → "بندين" ، ٥ → "٥ بنود" */
export function itemsWord(n) {
  if (n === 1) return 'بند واحد';
  if (n === 2) return 'بندين';
  return `${fmtNum(n)} بنود`;
}

// ---------- المهام ----------
/** مهام النهارده = ميعادها النهارده أو قبله ولسه ماخلصتش، + اللي خلصت النهارده. */
export function todayTasks(tasks, today) {
  return (tasks || []).filter(
    (t) => (t.due && t.due <= today && !t.done) || (t.done && t.dAt && keyOf(new Date(t.dAt)) === today),
  );
}

/** المهمة اتأخرت لو ميعادها فات ولسه ماخلصتش. */
export function isOverdue(t, today) {
  return !t.done && !!t.due && t.due < today;
}

/**
 * تبويبة المهام: النهارده (ميعادها النهارده أو قبله ولسه ماخلصتش)، وبعدين (باقي اللي ماخلصتش)،
 * وخلصت (آخر ٣٠، الأحدث فوق). جوه النهارده وبعدين: المهم الأول، وبعدين الأقدم.
 */
export function groupTasks(tasks, today) {
  const byPri = (a, b) => (b.pri ? 1 : 0) - (a.pri ? 1 : 0) || (a.at || 0) - (b.at || 0);
  const open = (tasks || []).filter((t) => !t.done);
  return {
    today: open.filter((t) => t.due && t.due <= today).sort(byPri),
    later: open.filter((t) => !t.due || t.due > today).sort(byPri),
    done: (tasks || []).filter((t) => t.done).sort((a, b) => (b.dAt || 0) - (a.dAt || 0)).slice(0, 30),
  };
}

// ---------- الأفكار ----------
/** المثبتة الأول، وبعدين الأحدث. */
export function sortIdeas(ideas) {
  return [...(ideas || [])].sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (b.at || 0) - (a.at || 0));
}

/** بيوحّد الحروف اللي بتتكتب بأكتر من شكل، عشان "اسكندرية" تلاقي "إسكندريه". */
export function normAr(s) {
  return toEn(s)
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // التشكيل والمدّ (ـ)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/** البحث في النص والتصنيف. */
export function searchIdeas(ideas, q) {
  const n = normAr(q);
  if (!n) return ideas || [];
  return (ideas || []).filter((i) => normAr(`${i.t} ${i.c}`).includes(n));
}

const MONTHS = ['ينا', 'فبر', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
/** '2026-11-18' أو timestamp → "١٨ نوف" */
export function shortDate(v) {
  const d = typeof v === 'number' ? new Date(v) : new Date(`${v}T12:00:00`);
  return `${fmtNum(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

// ---------- الفلوس على مدى فترة ----------
/** أول فترة تسجيل. في المرحلة ٤ الفترات هتتحفظ في list/periods وتتعدّل من الإعدادات. */
/** "٢٠ نوفمبر" */
export function longDate(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}

// ---------- الفترات (list/periods) ----------
/** الفترة اللي فيها اليوم ده، أو null. */
export function periodOf(periods, key) {
  return (periods || []).find((p) => p.from <= key && key <= p.to) || null;
}
/** يوم كام من كام: { n: 3, of: 11 } */
export function periodDay(p, key) {
  if (!p) return null;
  const days = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);
  return { n: days(p.from, key) + 1, of: days(p.from, p.to) + 1 };
}
/** فترة جديدة من يوم معيّن، ١١ يوم زي الأولى. */
export function newPeriod(from, len = 11) {
  return { id: uid(), from, to: addDays(from, len - 1) };
}
/** "٢٠ – ٣٠ نوفمبر" ، "٢٨ نوفمبر – ٨ ديسمبر" */
export function periodLabel(p) {
  const [a, b] = [new Date(`${p.from}T12:00:00`), new Date(`${p.to}T12:00:00`)];
  if (a.getMonth() === b.getMonth()) return `${fmtNum(a.getDate())} – ${longDate(p.to)}`;
  return `${longDate(p.from)} – ${longDate(p.to)}`;
}
/** بداية ملخص الفلوس: أول الفترة اللي فيها النهارده، ولو مفيش فترة: أول الشهر. */
export function summaryStart(periods, today) {
  const p = periodOf(periods, today);
  return p ? { from: p.from, title: `من ${longDate(p.from)} لحد دلوقتي` } : { from: `${today.slice(0, 8)}01`, title: 'من أول الشهر لحد دلوقتي' };
}

// ---------- مقاييسي (list/metrics) ----------
// { id, n: الاسم, t: النوع, u: الوحدة, a: المجال, w: يبان إمتى, on: ظاهر, at }
// والقيم في اليوم: day.m = { <id>: قيمة }
export const METRIC_TYPES = [['tri', 'تم / جزئي'], ['count', 'عدّاد'], ['num', 'رقم'], ['time', 'وقت'], ['text', 'كلام']];
export const METRIC_WHEN = [['day', 'طول اليوم'], ...PERIODS.map(([k, l]) => [k, l])];
export const AREAS = ['البيزنس', 'الصحة', 'الموبايل والسوشيال'];

/** المجالات: الأساسية، وبعدها أي مجال جديد اتعمل في المقاييس. */
export function metricAreas(metrics) {
  const out = [...AREAS];
  for (const m of metrics || []) if (m.a && !out.includes(m.a)) out.push(m.a);
  return out;
}

/** المقياس يبان في اليوم ده؟ لو مقفول لأ. ولو ليه فترة، بيبان من أول ما الفترة دي تيجي (والأيام اللي فاتت كله باين). */
export function metricVisible(m, cur, today, hour) {
  if (!m.on) return false;
  if (!m.w || m.w === 'day') return true;
  const i = PERIODS.findIndex(([k]) => k === m.w);
  return i < 0 || periodPhase(i, cur, today, hour) !== 'future';
}

/** [[المجال، [مقاييس]]] بترتيب المجالات. */
export function groupMetrics(metrics) {
  const order = metricAreas(metrics);
  const by = new Map();
  for (const m of metrics || []) {
    const a = m.a || order[0];
    if (!by.has(a)) by.set(a, []);
    by.get(a).push(m);
  }
  return order.filter((a) => by.has(a)).map((a) => [a, by.get(a)]);
}

/** "عدّاد بالكوباية، طول اليوم" */
export function metricDesc(m) {
  const t = (METRIC_TYPES.find(([k]) => k === m.t) || [])[1] || '';
  const w = (METRIC_WHEN.find(([k]) => k === (m.w || 'day')) || [])[1] || '';
  const unit = m.u && (m.t === 'count' || m.t === 'num') ? ` بال${m.u.replace(/^ال/, '')}` : '';
  return `${t}${unit}، ${w}${m.on ? '' : '، مقفول'}`;
}

/** قيمة المقياس للعرض. tri بيرجّع الكلمة (تم، جزئي، لسه). */
export function metricValue(m, v) {
  if (m.t === 'tri') return ['لسه', 'جزئي', 'تم'][+v || 0];
  if (m.t === 'count') return fmtNum(+v || 0);
  if (v === undefined || v === null || v === '') return '';
  if (m.t === 'num') return fmtNum(+v);
  if (m.t === 'time') return arDigits(v);
  return String(v);
}

/**
 * days = [{ key: 'YYYY-MM-DD', data }] → إجمالي المصروف والدخل من from لحد to،
 * والتصنيفات مترتبة من الأكبر للأصغر.
 */
export function moneySummary(days, from, to) {
  let spent = 0;
  let income = 0;
  const by = {};
  for (const { key, data } of days || []) {
    if (key < from || key > to) continue;
    for (const e of data.exp || []) {
      const a = +e.a || 0;
      spent += a;
      by[e.c] = (by[e.c] || 0) + a;
    }
    income += +toEn(data.income) || 0;
  }
  return { spent, income, cats: Object.entries(by).sort((a, b) => b[1] - a[1]) };
}

/** "سطر لليوم": لو فيه كلام قبل كده، الجديد بيتضاف بعده بفاصل " · ". */
export function mergeLine(old, line) {
  return has(old) ? `${old} · ${line}` : line;
}

/** السطر بيروح لخانة "عملت إيه" بتاعة الفترة اللي إنت فيها: الساعة ١٩ → { key: 'p3t', label: 'بعد المغرب' }. */
export function lineTarget(hour) {
  const [k, label] = PERIODS[periodIndex(hour)];
  return { key: `${k}t`, label };
}

/** id قصير ومش بيتكرر للمهام والأفكار. */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
