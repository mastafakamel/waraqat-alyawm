// logic.js — حسابات ورقة اليوم. دوال من غير واجهة ومن غير تخزين، عشان تتختبر لوحدها (tests/logic.test.js).

export const HABITS = [
  ['fajr', 'الفجر'], ['wird', 'الورد'], ['azkm', 'أذكار الصبح'], ['azke', 'أذكار المسا'],
  ['ex', 'تمرين'], ['walk', 'مشي'], ['meals', 'أكل منتظم'], ['nojunk', 'بلا جانك'],
  ['eng', 'إنجليزي'], ['read', 'قراءة'], ['tech', 'تعلم تقني'], ['said', 'قلت اللي حسيته'],
  ['wed', 'الفرح/الشقة'],
];
/** تقسيم العادات الـ ١٣ على جوانب الحياة الأربعة (عرض بس، ومفاتيح البيانات نفسها). */
export const HABIT_GROUPS = [
  { id: 'deen', name: 'الدين والروح', icon: 'star', keys: ['fajr', 'wird', 'azkm', 'azke'], withSalah: true },
  { id: 'health', name: 'الصحة والجسم', icon: 'heart', keys: ['ex', 'walk', 'meals', 'nojunk'] },
  { id: 'growth', name: 'التعلم والتطوير', icon: 'book', keys: ['eng', 'read', 'tech'] },
  { id: 'life', name: 'العلاقات والحياة', icon: 'home', keys: ['said', 'wed'] },
];
export const PERIODS = [
  ['p1', 'بعد الفجر', 'من ٤ الفجر لـ ١٢ الضهر'],
  ['p2', 'بعد الضهر', 'من ١٢ لـ ٥ العصر'],
  ['p3', 'بعد المغرب', 'من ٥ لـ ٩ بالليل'],
  ['p4', 'قبل النوم', 'بعد ٩ بالليل'],
];
/** ساعات اليوم المنطقي (من ٤ الفجر لـ ٣ الفجر) متوزعة على الفترات الأربعة. */
export const PERIOD_HOURS = [
  [4, 5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16],
  [17, 18, 19, 20],
  [21, 22, 23, 0, 1, 2, 3],
];
export const DAY_HOURS = PERIOD_HOURS.flat();
/** مجالات سجل الوقت (تاب «الوقت»). القيمة في اليوم: day.hrs = { "9": { c: "work", t?: "ملاحظة" } } */
export const TIME_CATS = [
  { id: 'sleep', name: 'نوم', icon: 'moon' },
  { id: 'work', name: 'شغل', icon: 'brief' },
  { id: 'learn', name: 'تعلم', icon: 'book' },
  { id: 'move', name: 'مواصلات', icon: 'move' },
  { id: 'health', name: 'صحة', icon: 'heart' },
  { id: 'deen', name: 'دين', icon: 'star' },
  { id: 'life', name: 'علاقات', icon: 'home' },
  { id: 'rest', name: 'راحة', icon: 'rest' },
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
/** اليوم بيبدأ ٤ الفجر: من ١٢ لـ ٤ لسه "قبل النوم" بتاع امبارح (قرار ٢١ نوفمبر). */
export const DAY_START = 4;
/** مفتاح اليوم المنطقي لوقت معيّن (Date أو timestamp). الساعة ١:٤٠ يوم ٢١ ← '…-20'. */
export function dayKeyAt(when = new Date(), startHour = DAY_START) {
  const d = new Date(when);
  if (d.getHours() < startHour) d.setDate(d.getDate() - 1);
  return keyOf(d);
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
/** العدد من ٥ (الصلوات): الدوس على رقم بيختار لحد الرقم ده، وعلى نفس الرقم تاني بيقلّل واحد. */
export const rateTap = (cur, v) => ((cur || 0) === v ? v - 1 : v);
/** التقييم ١–٥ (المزاج والطاقة): المختار رقم واحد، ونفس الرقم تاني بيمسحه (''). نفس القيم في البيانات. */
export const rateSet = (cur, v) => (+cur === v ? '' : v);

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

// ---------- ملخص النهارده والأسبوع (DESIGN.md نسخة ٢) ----------
/**
 * لحظة كل بند ★ (رقم الفترة): قبلها البند "بعدين" (رمادي)، ومن أولها "ناقص" (كهرماني).
 * النوم والعادات من بعد الفجر، والشغل والفلوس من بعد المغرب، والباقي قبل النوم.
 */
export const STAR_DUE = { sleep: 0, habits: 0, work: 2, money: 2, screen: 3, mood: 3, post: 3, top: 3 };

/** البنود الناقصة مقسومة: now = وقتها جه، later = لسه. اليوم اللي فات كله now، واليوم الجاي كله later. */
export function starSplit(day, cur, today, hour) {
  const miss = missingStars(day || {});
  let n = periodIndex(hour);
  if (cur < today) n = 99;
  else if (cur > today) n = -1;
  return { now: miss.filter((s) => STAR_DUE[s.k] <= n), later: miss.filter((s) => STAR_DUE[s.k] > n) };
}

/** حالة اليوم في شريط الأيام: full = الـ ٨ اتسجلوا، part = فيه تسجيل، none = مفيش (والتقرير لوحده مش تسجيل). */
export function dayStatus(d) {
  if (!d || !logged(d)) return 'none';
  return starCount(d) === STAR_ITEMS.length ? 'full' : 'part';
}

/** نسبة إنجاز اليوم للحلقة الصغيرة حوالين كل يوم في شريط الأسبوع (٠ لـ ١٠٠). */
export function dayProgress(d) {
  if (!d || !logged(d)) return 0;
  const sc = starCount(d);
  return sc ? Math.round((sc / STAR_ITEMS.length) * 100) : 15;
}

/** n مفاتيح لحد endKey، من الأقدم للأحدث (الأقدم بيترسم على اليمين). */
export function weekKeys(endKey, n = 7) {
  return Array.from({ length: n }, (_, i) => addDays(endKey, i - n + 1));
}

/** ٧ أيام الأسبوع الثابت من السبت للجمعة اللي فيه key (السبت الأول على اليمين في RTL). */
export function satWeekKeys(key) {
  const d = new Date(`${key}T12:00:00`);
  const offset = (d.getDay() + 1) % 7; // السبت = ٠، الأحد = ١، … الجمعة = ٦
  const sat = addDays(key, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(sat, i));
}

/** رقم الأسبوع في السنة (بداية الأسبوع من السبت). كل أيام السبت–الجمعة ليهم نفس الرقم. */
export function weekNumber(key) {
  const y = key.slice(0, 4);
  const jan1 = new Date(`${y}-01-01T12:00:00`);
  const d = new Date(`${key}T12:00:00`);
  const jan1Offset = (jan1.getDay() + 1) % 7;
  const doy = Math.round((d - jan1) / 864e5);
  return Math.floor((doy + jan1Offset) / 7) + 1;
}

/** نسبة إنجاز ركن من أركان الحياة: التمام ١ والجزئي ٠٫٥. */
export function habitGroupStats(day = {}, group) {
  const keys = group?.keys || [];
  const done = keys.filter((k) => day[k] === 2).length;
  const part = keys.filter((k) => day[k] === 1).length;
  const total = keys.length;
  const pct = total ? Math.round(((done + part * 0.5) / total) * 100) : 0;
  return { done, part, total, pct };
}

// ---------- سجل الوقت ساعة بساعة (day.hrs) ----------
const TIME_CAT_MAP = new Map(TIME_CATS.map((c) => [c.id, c]));

/** ٩ ← "٩ ص" ، ١٧ ← "٥ م" ، ٠ ← "١٢ ص" */
export function fmtHour(h) {
  const n = ((+h % 24) + 24) % 24;
  return `${fmtNum(n % 12 || 12)} ${n < 12 ? 'ص' : 'م'}`;
}

/** عدد ساعات ورا بعض جوّه نفس اليوم المنطقي (من ٤ ص لـ ٣ ص) من غير ما يلفّ لبكرة. */
export function hourSpan(startHour, count = 1) {
  const i = DAY_HOURS.indexOf(((+startHour % 24) + 24) % 24);
  if (i < 0) return [];
  return DAY_HOURS.slice(i, i + Math.max(1, +count || 1));
}

/** ١ ← "ساعة" ، ٢ ← "ساعتين" ، ٥ ← "ساعات" */
export function hoursWord(n) {
  if (n === 1) return 'ساعة';
  if (n === 2) return 'ساعتين';
  return n <= 10 ? 'ساعات' : 'ساعة';
}

/** صيغة عربية سليمة للساعات من غير تكرار الرقم في المثنى: ١ ← "ساعة" ، ٢ ← "ساعتين" ، ٣ ← "٣ ساعات" ، ١٢ ← "١٢ ساعة". */
export function fmtHours(n) {
  if (n === 1) return 'ساعة';
  if (n === 2) return 'ساعتين';
  return `${fmtNum(n)} ${hoursWord(n)}`;
}

/** تجميع ساعات اليوم حسب المجال: { total, by, rows: [{ id, name, icon, hours }] } مترتبة من الأكبر للأصغر. */
export function timeByCat(day = {}) {
  const hrs = day?.hrs;
  const by = {};
  let total = 0;
  if (hrs && typeof hrs === 'object') {
    for (const h of DAY_HOURS) {
      const c = hrs[String(h)]?.c;
      if (c && TIME_CAT_MAP.has(c)) {
        by[c] = (by[c] || 0) + 1;
        total += 1;
      }
    }
  }
  const rows = TIME_CATS
    .filter((cat) => by[cat.id])
    .map((cat) => ({ ...cat, hours: by[cat.id] }))
    .sort((a, b) => b.hours - a.hours);
  return { total, by, rows };
}

/** الساعات اللي اتنام فيها من sleep و wake عشان زرار "ملء النوم" في تاب الوقت. */
export function sleepHourList(sleep, wake) {
  const s = mins(sleep);
  const dur = sleepMinutes(sleep, wake);
  if (s == null || dur == null || dur === 0) return [];
  const start = Math.floor((s + 29) / 60) % 24;
  const count = Math.max(1, Math.min(16, Math.round(dur / 60)));
  return Array.from({ length: count }, (_, i) => (start + i) % 24);
}

/** الأرقام الأربعة بتاعة الملخص بالدقايق والساعات والجنيه، و null للي ماتسجلش (مش صفر). */
export function dayNums(d = {}) {
  return {
    sleep: sleepMinutes(d.sleep, d.wake),
    screen: has(d.screen) ? screenMin(d.screen) : null,
    work: [1, 2, 3, 4].some((i) => has(d[`w${i}h`]) || d[`w${i}h`] === '0') ? workTotal(d) : null,
    spend: has(d.exp) ? expTotal(d) : null,
  };
}

/** متوسط القيم الموجودة بس: { avg, n }. الفاضي مابيدخلش المتوسط ومابيتحسبش صفر. */
export function avgOf(xs) {
  const v = (xs || []).filter((x) => x != null && x !== '' && Number.isFinite(+x)).map(Number);
  return { avg: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, n: v.length };
}

/**
 * المتوسط اللي اليوم ده بيتقارن بيه: الأيام اللي فيها قيمة من آخر ٧ قبله (من غيره هو).
 * days = [{ key, data }]. لو أقل من min أيام: null ("لسه بدري نقارن").
 */
export function baselineFor(days, key, metric, min = 3) {
  const by = new Map((days || []).map((x) => [x.key, x.data || {}]));
  const { avg, n } = avgOf(weekKeys(addDays(key, -1)).map((k) => (by.has(k) ? dayNums(by.get(k))[metric] : null)));
  return n >= min ? avg : null;
}

/** الفرق عن المتوسط: { dir: up | down | same, diff }. لو الفرق أقل من eps يبقى "زي متوسطك". */
export function compareTo(v, base, eps = 0) {
  if (v == null || base == null) return null;
  const diff = v - base;
  if (Math.abs(diff) < eps || diff === 0) return { dir: 'same', diff: 0 };
  return { dir: diff > 0 ? 'up' : 'down', diff: Math.abs(diff) };
}

/** الفرق للعرض: دقايق "٢٤د" أو "١:١٠"، وساعات "٠٫٨"، وجنيه "٤٣". */
export function fmtDiff(kind, diff) {
  if (kind === 'min') {
    const m = Math.round(diff);
    return m < 60 ? `${fmtNum(m)}د` : fmtHM(m);
  }
  return fmtNum(kind === 'money' ? Math.round(diff) : diff);
}

// ---------- نظام الإدخال: اقتراحات من أيامك اللي فاتت (DESIGN.md: الإدخال) ----------
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * ٥ أوقات (HH:MM) كل ربع ساعة حوالين وسيط آخر ٧ أيام قبل cur، للـ chips.
 * الوقت بيلف بعد ١٢ بالليل، فكل قيمة بتتقرّب للأولى (١١:٣٠ و١٢:٤٥ = ساعة وربع فرق، مش ١١ ساعة).
 * لو مفيش تاريخ: حوالين fallback.
 */
export function suggestTimes(days, key, cur, fallback) {
  const by = new Map((days || []).map((x) => [x.key, x.data || {}]));
  const vals = weekKeys(addDays(cur, -1)).map((k) => mins(by.get(k)?.[key])).filter((v) => v != null);
  let center = mins(fallback) ?? 0;
  if (vals.length) {
    const ref = vals[0];
    const near = vals.map((v) => (v - ref > 720 ? v - 1440 : ref - v > 720 ? v + 1440 : v)).sort((a, b) => a - b);
    center = Math.round(near[Math.floor((near.length - 1) / 2)] / 15) * 15;
  }
  return [-30, -15, 0, 15, 30].map((d) => hhmm((((center + d) % 1440) + 1440) % 1440));
}

/** "زي امبارح": قيم المفاتيح دي من آخر يوم قبل cur فيه كلهم، أو null. */
export function lastWith(days, cur, keys) {
  const sorted = (days || []).filter((x) => x.key < cur).sort((a, b) => b.key.localeCompare(a.key));
  for (const { data } of sorted) {
    if (keys.every((k) => has(data?.[k]))) return Object.fromEntries(keys.map((k) => [k, data[k]]));
  }
  return null;
}

/**
 * مدة الشاشة اللي بتتكتب بكيبورد أرقام → "H:MM" (نفس شكل screen القديم).
 * "٤٢٠" = ٤:٢٠، و"٥" = ٥ ساعات، و"٤٥" = ٤٥ دقيقة (أكبر من ٢٤)، و"٢٫٥" = ٢:٣٠، و"٤:٢٠" زي ما هي. غير كده: ''.
 */
export function readDuration(s) {
  const t = toEn(s).trim();
  let m = null;
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, mm] = t.split(':').map(Number);
    if (mm < 60) m = h * 60 + mm;
  } else if (/^\d*\.\d+$/.test(t)) m = Math.round(parseFloat(t) * 60);
  else if (/^\d{1,2}$/.test(t)) m = +t <= 24 ? +t * 60 : +t;
  else if (/^\d{3,4}$/.test(t)) {
    const h = +t.slice(0, -2);
    const mm = +t.slice(-2);
    if (mm < 60) m = h * 60 + mm;
  }
  if (m == null || m > 1440) return '';
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** آخر n قيم مختلفة للمفاتيح دي (المشاريع، أو أجّلت إيه) من الأيام اللي قبل cur، الأحدث الأول. */
export function recentValues(days, keys, cur, n = 3, skip = []) {
  const ks = [].concat(keys);
  const sorted = (days || []).filter((x) => x.key < cur).sort((a, b) => b.key.localeCompare(a.key));
  const out = [];
  for (const { data } of sorted) {
    for (const k of ks) {
      const v = String(data?.[k] ?? '').trim();
      if (v && !skip.includes(v) && !out.includes(v)) out.push(v);
      if (out.length >= n) return out;
    }
  }
  return out;
}

// ---------- المهام ----------
/** مهام النهارده = ميعادها النهارده أو قبله ولسه ماخلصتش، + اللي خلصت النهارده. */
export function todayTasks(tasks, today) {
  return (tasks || []).filter(
    (t) => (t.due && t.due <= today && !t.done) || (t.done && t.dAt && dayKeyAt(t.dAt) === today),
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

/** قيمة المقياس للعرض، و'' لو ماتسجلش (الواجهة بتكتب "—"، مش صفر ولا "لسه"). tri بيرجّع الكلمة (جزئي، تم). */
export function metricValue(m, v) {
  if (m.t === 'tri') return ['', 'جزئي', 'تم'][+v || 0];
  if (v === undefined || v === null || v === '') return '';
  if (m.t === 'count') return fmtNum(+v || 0);
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

// ---------- النسخة الاحتياطية والمزامنة ----------
export const BACKUP_APP = 'waraqat-alyawm';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * الاستيراد بيدمج ومابيمسحش حاجة. local وincoming: { data, updatedAt } (أو null).
 * - القوايم (list/…): كل العناصر من الاتنين بالـ id. ولو نفس العنصر في الاتنين، بتاع المستند الأحدث هو اللي بيكسب.
 * - الأيام: كل المفاتيح من الاتنين. ولو نفس المفتاح في الاتنين، الأحدث هو اللي بيكسب. ونفس الكلام جوه m (قيم المقاييس).
 * بيرجّع { data, changed }، أو null لو الملف مفيهوش بيانات للمستند ده.
 */
export function mergeDoc(id, local, incoming) {
  if (!incoming?.data || typeof incoming.data !== 'object') return null;
  if (!local?.data) return { data: incoming.data, changed: true };
  const newer = (incoming.updatedAt || 0) > (local.updatedAt || 0);
  let data;
  if (id.startsWith('list/')) {
    const items = [...(local.data.items || [])];
    for (const it of incoming.data.items || []) {
      const i = items.findIndex((x) => String(x.id) === String(it.id));
      if (i < 0) items.push(it);
      else if (newer) items[i] = it;
    }
    data = { ...local.data, items };
  } else {
    data = { ...local.data };
    for (const [k, v] of Object.entries(incoming.data)) {
      if ((k === 'm' || k === 'hrs') && v && typeof v === 'object' && data[k] && typeof data[k] === 'object') {
        data[k] = newer ? { ...data[k], ...v } : { ...v, ...data[k] };
      } else if (!(k in data) || newer) {
        data[k] = v;
      }
    }
  }
  return { data, changed: !same(data, local.data) };
}

/** بيقرا ملف النسخة الاحتياطية، ولو مش ملفنا بيرمي رسالة مفهومة. */
export function parseBackup(text) {
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error('الملف ده مش JSON');
  }
  if (!j || j.app !== BACKUP_APP || !Array.isArray(j.docs)) throw new Error('الملف ده مش نسخة من ورقة اليوم');
  const ok = (d) => d && typeof d.id === 'string' && /^(day\/\d{4}-\d{2}-\d{2}|list\/(tasks|ideas|metrics|periods|goals))$/.test(d.id) && d.data && typeof d.data === 'object';
  return j.docs.filter(ok);
}

/** المزامنة: آخر تعديل بيكسب على مستوى المستند كله. ناخد اللي على السيرفر لو مش عندنا أو أحدث. */
export function takeRemote(local, remote) {
  return !local || (+remote.updated_at || 0) > (+local.updatedAt || 0);
}

/**
 * حد للاستخدام في الكود عشان الخطة المجانية: عدد طلبات المزامنة في اليوم.
 * meta = { day, n }. بيرجّع { ok, meta } والـ meta الجديدة اللي تتحفظ.
 */
export function useQuota(meta, today, cap) {
  const m = meta?.day === today ? { ...meta } : { day: today, n: 0 };
  if (m.n >= cap) return { ok: false, meta: m };
  m.n += 1;
  return { ok: true, meta: m };
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

// ---------- تقرير الذكاء الاصطناعي: ملخص البيانات ----------
// الملخص نص عادي بيتبعت للموديل. بأرقام إنجليزي عشان الموديل يقراها صح، ومن غير اسم ولا إيميل.
// الخانات الفاضية مابتتكتبش، والكلام الطويل بيتقص، عشان الطلب يفضل صغير.

const clip = (s, n = 200) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
const r1 = (n) => Math.round(n * 10) / 10;
const hmEn = (m) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const numOf = (v) => {
  if (!has(v)) return null;
  const n = Number(toEn(v));
  return Number.isFinite(n) ? n : null;
};
const weekday = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'long' });
/** الخانات اللي التقرير نفسه بيكتبها في اليوم، ومش جزء من اللي إنت سجلته. */
const AI_KEYS = ['ai', 'aiw'];
const logged = (d) => Object.keys(d || {}).some((k) => !AI_KEYS.includes(k));
/** "5:30" أو "5" (ساعات) → دقايق. */
const screenMin = (v) => mins(v) ?? (numOf(v) != null ? numOf(v) * 60 : null);

export const HABIT_NUMS = [
  ['wirdp', 'الورد', 'صفحة'], ['exm', 'تمرين', 'دقيقة'], ['engm', 'إنجليزي', 'دقيقة'], ['readp', 'قراءة', 'صفحة'],
  ['techm', 'تعلم تقني', 'دقيقة'], ['caf', 'قهوة/شاي', 'كوباية'], ['relm', 'وقت من غير موبايل', 'دقيقة'],
];

// ---------- نظام الأهداف المتكامل (list/goals) ----------
// { id, t, p, f, m, src, hz, from, to, start?, target, unit, cur?, steps?, done?, dAt?, note?, at }
export const GOAL_PILLARS = [
  { id: 'work',   name: 'الشغل والمال',     icon: 'brief' },
  { id: 'health', name: 'الصحة والجسم',     icon: 'heart' },
  { id: 'growth', name: 'التعلم والتطوير',   icon: 'book' },
  { id: 'deen',   name: 'الدين والروح',      icon: 'star' },
  { id: 'life',   name: 'العلاقات والحياة', icon: 'home' },
];
export const GOAL_MODES = [
  ['habit',  'عادة يومية',   'check'],
  ['time',   'وقت / شغل',    'clock'],
  ['metric', 'مقياس / فلوس', 'wallet'],
  ['steps',  'مراحل ومهام',  'tasks'],
  ['manual', 'عدّاد يدوي',   'target'],
];
export const GOAL_HORIZONS = [
  ['period', 'الفترة الحالية'],
  ['week',   'الأسبوع ده'],
  ['month',  'الشهر ده'],
  ['custom', 'تاريخ محدد'],
];

const GOAL_PILLAR_MAP = new Map(GOAL_PILLARS.map((x) => [x.id, x]));
const HABIT_LABEL_MAP = new Map(HABITS);
const HABIT_NUM_MAP = new Map(HABIT_NUMS.map(([k, l, u]) => [k, { l, u }]));

/** نطاق التواريخ الفعلي للهدف حسب الإطار الزمني المختار. */
export function goalRange(hz, today, periods = [], customFrom = '', customTo = '') {
  if (hz === 'period') {
    const p = periodOf(periods, today);
    return p ? { from: p.from, to: p.to } : { from: today, to: addDays(today, 10) };
  }
  if (hz === 'week') {
    const wk = satWeekKeys(today);
    return { from: wk[0], to: wk[6] };
  }
  if (hz === 'month') {
    const [y, m] = today.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return { from: `${today.slice(0, 8)}01`, to: `${today.slice(0, 8)}${String(last).padStart(2, '0')}` };
  }
  const f = customFrom || today;
  const t = customTo && customTo >= f ? customTo : addDays(f, 29);
  return { from: f, to: t };
}

function daysBetween(a, b) {
  return Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);
}

/** "يوم واحد" / "يومين" / "٤ أيام" / "١٥ يوم" */
export function fmtDays(n) {
  const x = Math.max(0, Math.round(n));
  if (x === 0) return 'النهارده';
  if (x === 1) return 'يوم واحد';
  if (x === 2) return 'يومين';
  return `${fmtNum(x)} ${x <= 10 ? 'أيام' : 'يوم'}`;
}

/** نسبة الوقت اللي عدّى من الهدف عشان نقارن بيها التقدم الفعلي (Pace Engine). */
export function goalTimeProgress(g, today) {
  if (!g?.from || !g?.to) return { timePct: 0, daysTotal: 1, daysPassed: 0, daysLeft: 0, overdue: false };
  const daysTotal = Math.max(1, daysBetween(g.from, g.to) + 1);
  if (today < g.from) return { timePct: 0, daysTotal, daysPassed: 0, daysLeft: daysTotal, overdue: false };
  if (today > g.to) return { timePct: 100, daysTotal, daysPassed: daysTotal, daysLeft: 0, overdue: !g.done };
  const daysPassed = Math.max(1, daysBetween(g.from, today) + 1);
  const daysLeft = Math.max(0, daysBetween(today, g.to));
  const timePct = Math.min(100, Math.round((daysPassed / daysTotal) * 100));
  return { timePct, daysTotal, daysPassed, daysLeft, overdue: false };
}

/** وصف بشري مختصر لمصدر قياس الهدف. */
export function goalSourceLabel(g, metrics = []) {
  const s = g.src || {};
  if (g.m === 'habit') {
    if (s.kind === 'salah') return 'تلقائي من الصلوات في وقتها';
    if (s.kind === 'sum') return `تلقائي من أرقام «${HABIT_NUM_MAP.get(s.k)?.l || s.k || ''}»`;
    return `تلقائي من عادة «${HABIT_LABEL_MAP.get(s.k) || s.k || ''}»`;
  }
  if (g.m === 'time') {
    if (s.kind === 'deep') return 'تلقائي من التركيز العميق';
    if (s.kind === 'proj') return `تلقائي من مشروع «${s.proj || ''}»`;
    if (s.kind === 'work' || s.c === 'work') return 'تلقائي من الوقت والشغل';
    return `تلقائي من تاب الوقت (${TIME_CAT_MAP.get(s.c)?.name || 'وقت'})`;
  }
  if (g.m === 'metric') {
    if (s.kind === 'income') return 'تلقائي من دخل الفلوس';
    if (s.kind === 'exp_cap') return s.cat ? `تلقائي من مصاريف «${s.cat}»` : 'تلقائي من إجمالي المصاريف';
    const met = (metrics || []).find((x) => String(x.id) === String(s.id));
    return met ? `تلقائي من مقياس «${met.n}»` : 'تلقائي من مقاييسي';
  }
  if (g.m === 'steps') return 'مراحل + مهام مربوطة';
  return 'عدّاد يدوي سريع';
}

/**
 * حساب التقدم والإيقاع الكامل لهدف واحد ضد بيانات الأيام والمهام والمقاييس.
 * بيرجّع: { cur, target, unit, pct, timePct, daysLeft, overdue, isCap, status, isBehind, paceText, sourceLabel, horizonText, pillar, segs?, nextText?, linked }
 */
export function evalGoal(g, { days = [], tasks = [], metrics = [], today = dayKeyAt() } = {}) {
  const pillar = GOAL_PILLAR_MAP.get(g.p) || GOAL_PILLARS[0];
  const tp = goalTimeProgress(g, today);
  const horizonText = g.from && g.to ? periodLabel({ from: g.from, to: g.to }) : '';
  const sourceLabel = goalSourceLabel(g, metrics);
  const linked = (tasks || []).filter((t) => String(t.goalId || '') === String(g.id));
  const inRange = (days || []).filter((x) => (!g.from || x.key >= g.from) && (!g.to || x.key <= g.to));

  const s = g.src || {};
  let cur = 0;
  let target = Math.max(1, +g.target || 1);
  let unit = g.unit || '';
  let pct = 0;
  let isCap = false;
  let isTargetMetric = false;
  let segs = null;
  let nextText = '';

  if (g.m === 'habit') {
    if (s.kind === 'salah') {
      cur = inRange.reduce((a, { data }) => a + (+data.salah || 0), 0);
      unit = unit || 'صلاة';
    } else if (s.kind === 'sum') {
      cur = r1(inRange.reduce((a, { data }) => a + (numOf(data[s.k]) || 0), 0));
      unit = unit || HABIT_NUM_MAP.get(s.k)?.u || '';
    } else {
      cur = r1(inRange.reduce((a, { data }) => a + (data[s.k] === 2 ? 1 : data[s.k] === 1 ? 0.5 : 0), 0));
      unit = unit || 'يوم';
    }
    pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
  } else if (g.m === 'time') {
    if (s.kind === 'deep') {
      cur = r1(inRange.reduce((a, { data }) => a + (numOf(data.deep) || 0), 0));
    } else if (s.kind === 'proj') {
      const want = normAr(s.proj || '');
      cur = r1(inRange.reduce((a, { data }) => a + workRows(data).filter((w) => want && normAr(w.p) === want).reduce((x, w) => x + w.h, 0), 0));
    } else {
      const cat = s.kind === 'work' ? 'work' : (s.c || 'work');
      cur = r1(inRange.reduce((a, { data }) => {
        const hrsCat = timeByCat(data).by[cat] || 0;
        return a + (cat === 'work' ? Math.max(workTotal(data), hrsCat) : hrsCat);
      }, 0));
    }
    unit = unit || 'ساعة';
    pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
  } else if (g.m === 'metric') {
    if (s.kind === 'income') {
      cur = r1(inRange.reduce((a, { data }) => a + (numOf(data.income) || 0), 0));
      unit = unit || 'ج';
      pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
    } else if (s.kind === 'exp_cap') {
      isCap = true;
      cur = r1(inRange.reduce((a, { data }) => {
        if (!s.cat) return a + expTotal(data);
        return a + (data.exp || []).filter((e) => e.c === s.cat).reduce((x, e) => x + (+e.a || 0), 0);
      }, 0));
      unit = unit || 'ج';
      pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
    } else if (s.kind === 'target') {
      isTargetMetric = true;
      const sorted = (days || []).filter((x) => (!g.to || x.key <= g.to) && x.data?.m && has(x.data.m[s.id])).sort((a, b) => a.key.localeCompare(b.key));
      const last = sorted.at(-1);
      cur = last ? numOf(last.data.m[s.id]) : null;
      const start = numOf(g.start) ?? cur ?? 0;
      target = numOf(g.target) ?? 0;
      const met = (metrics || []).find((x) => String(x.id) === String(s.id));
      unit = unit || met?.u || '';
      if (cur == null) pct = 0;
      else if (target === start) pct = cur === target ? 100 : 0;
      else pct = Math.min(100, Math.max(0, Math.round(((cur - start) / (target - start)) * 100)));
    } else {
      const met = (metrics || []).find((x) => String(x.id) === String(s.id));
      cur = r1(inRange.reduce((a, { data }) => {
        const v = data.m?.[s.id];
        if (!has(v)) return a;
        if (met?.t === 'tri') return a + (+v === 2 ? 1 : +v === 1 ? 0.5 : 0);
        return a + (numOf(v) || 0);
      }, 0));
      unit = unit || met?.u || (met?.t === 'tri' ? 'يوم' : '');
      pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
    }
  } else if (g.m === 'steps') {
    const steps = Array.isArray(g.steps) ? g.steps : [];
    const total = steps.length + linked.length;
    const doneCnt = steps.filter((x) => x.done).length + linked.filter((t) => t.done).length;
    cur = doneCnt;
    target = total;
    unit = 'خطوة';
    pct = total ? Math.round((doneCnt / total) * 100) : 0;
    segs = [...steps.map((x) => !!x.done), ...linked.map((t) => !!t.done)];
    const nextTask = linked.find((t) => !t.done);
    const nextStep = steps.find((x) => !x.done);
    nextText = nextTask ? nextTask.t : nextStep ? nextStep.t : total ? 'كل الخطوات خلصت' : 'ضيف أول خطوة أو مهمة';
  } else {
    cur = Math.max(0, r1(+g.cur || 0));
    pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
  }

  let status = 'done';
  let isBehind = false;
  let paceText = '';

  if (g.done) {
    pct = 100;
    status = 'done';
    isBehind = false;
    paceText = 'مكتمل ✓';
  } else if (isCap) {
    const over = cur > target;
    const overPace = over || (tp.timePct > 0 && pct > tp.timePct + 5);
    status = overPace ? 'attn' : 'done';
    isBehind = overPace;
    if (over) paceText = `عدّيت السقف بـ ${fmtNum(cur - target)} ${unit}`;
    else if (overPace) paceText = `صرف أسرع من المعدّل · فاضل ${fmtNum(target - cur)} ${unit}`;
    else paceText = `تحت السقف · فاضل ${fmtNum(target - cur)} ${unit}`;
  } else if (pct >= 100) {
    status = 'done';
    isBehind = false;
    paceText = 'جاهز للأرشفة ✓';
  } else if (isTargetMetric && cur == null) {
    isBehind = tp.timePct > 15;
    status = isBehind ? 'attn' : 'done';
    paceText = 'سجّل أول قراية في مقاييسي';
  } else {
    isBehind = tp.timePct > 0 && pct + 5 < tp.timePct;
    status = isBehind ? 'attn' : 'done';
    if (tp.overdue) {
      paceText = g.m === 'steps' ? `عدّى الميعاد · فاضل ${fmtNum(Math.max(0, target - cur))}` : `عدّى الميعاد · فاضل ${fmtNum(Math.max(0, target - cur))} ${unit}`.trim();
    } else if (!isBehind) {
      if (pct - tp.timePct >= 8 && tp.timePct > 0) {
        if (g.m !== 'steps' && !isTargetMetric) {
          const ahead = Math.max(1, Math.round(cur - (target * tp.timePct) / 100));
          paceText = `سابق المعدّل بـ ${fmtNum(ahead)} ${unit}`.trim();
        } else {
          paceText = 'سابق المعدّل';
        }
      } else {
        paceText = tp.daysLeft > 0 ? `على المسار · فاضل ${fmtDays(tp.daysLeft)}` : 'على المسار تماماً';
      }
    } else if (isBehind && unit === 'يوم') {
      const behind = Math.max(1, Math.round((target * tp.timePct) / 100 - cur));
      paceText = tp.daysLeft > 0 && (target - cur) > tp.daysLeft
        ? `متأخر ${fmtDays(behind)} · فاضل ${fmtDays(tp.daysLeft)}`
        : `متأخر ${fmtDays(behind)} · محتاج دفعة`;
    } else if (g.m !== 'steps' && !isTargetMetric && tp.daysLeft > 0) {
      const rem = Math.max(0, target - cur);
      const perDay = r1(rem / tp.daysLeft);
      const shortU = unit === 'ساعة' ? 'س' : unit;
      paceText = perDay > 0 ? `محتاج ${fmtNum(perDay)} ${shortU}/يوم عشان تلحق` : 'محتاج دفعة';
    } else {
      paceText = tp.daysLeft > 0 ? `محتاج دفعة · فاضل ${fmtDays(tp.daysLeft)}` : 'محتاج دفعة';
    }
  }

  return {
    cur, target, unit, pct, ...tp, isCap, isTargetMetric, status, isBehind,
    paceText, sourceLabel, horizonText, pillar, segs, nextText, linked,
  };
}

/** تقييم كل الأهداف مرة واحدة للشاشات وبطاقة الملخص. */
export function goalsSummary(goals, ctx) {
  const list = goals || [];
  const active = list.filter((g) => !g.done);
  const archived = list.filter((g) => g.done).sort((a, b) => (b.dAt || 0) - (a.dAt || 0));
  const evals = new Map();
  for (const g of list) evals.set(g.id, evalGoal(g, ctx));

  const actEvals = active.map((g) => evals.get(g.id));
  const avgPct = actEvals.length ? Math.round(actEvals.reduce((a, x) => a + x.pct, 0) / actEvals.length) : 0;
  const onTrack = actEvals.filter((x) => !x.isBehind).length;
  const needPush = actEvals.filter((x) => x.isBehind).length;
  const pinned = active.filter((g) => g.f);
  const focus = (pinned.length ? pinned : active.slice(0, 2)).slice(0, 3);
  const linkedHabits = new Set(active.filter((g) => g.m === 'habit' && g.src?.kind !== 'salah' && g.src?.k).map((g) => g.src.k));
  return { active, archived, focus, evals, avgPct, onTrack, needPush, linkedHabits };
}

/** سطور مختصرة لأهدافك النشطة عشان تتبعت لتقرير الذكاء الاصطناعي (أرقام إنجليزي). */
export function goalDigestLines(goals, ctx) {
  const active = (goals || []).filter((g) => !g.done);
  if (!active.length) return [];
  const lines = ['الأهداف النشطة:'];
  for (const g of active.slice(0, 8)) {
    const ev = evalGoal(g, ctx);
    const val = ev.isTargetMetric
      ? `${ev.cur ?? '—'} من أصل ${g.start ?? 0} → ${ev.target} ${ev.unit}`.trim()
      : `${ev.cur}/${ev.target}${ev.unit ? ` ${ev.unit}` : ''}`;
    const stateWord = ev.pct >= 100 && !ev.isCap ? 'مكتمل' : ev.isBehind ? 'محتاج دفعة' : 'على المسار';
    lines.push(`- ${clip(g.t, 80)}${g.f ? ' [تركيز]' : ''}: ${ev.pct}% (${val}، عدّى ${ev.timePct}% من الوقت، ${stateWord})`);
  }
  return lines;
}

function metricText(m, v) {
  if (m.t === 'tri') return ['لسه', 'جزئي', 'تم'][+v || 0];
  if (m.t === 'count' || m.t === 'num') return `${toEn(v)}${m.u ? ` ${m.u}` : ''}`;
  return clip(toEn(v), 80);
}

/** سطر واحد مختصر لليوم: للتقرير الأسبوعي، وللمقارنة بامبارح في التقرير اليومي. */
export function dayLine(key, d = {}) {
  const p = [];
  const sm = sleepMinutes(d.sleep, d.wake);
  if (sm != null) p.push(`نوم ${hmEn(sm)}`);
  if (has(d.screen)) p.push(`شاشة ${toEn(d.screen)}`);
  if (has(d.mood)) p.push(`مزاج ${d.mood}/5`);
  const es = PERIODS.map(([k]) => +d[`${k}e`] || 0).filter(Boolean);
  if (es.length) p.push(`طاقة ${r1(es.reduce((a, b) => a + b, 0) / es.length)}/5`);
  if (HABITS.some(([k]) => has(d[k]))) p.push(`عادات ${habitsDone(d)}/${HABITS.length}`);
  if (has(d.salah)) p.push(`صلوات ${d.salah}/5`);
  const w = workTotal(d);
  if (w) p.push(`شغل ${r1(w)} ساعة`);
  if (has(d.deep)) p.push(`تركيز عميق ${toEn(d.deep)} ساعة`);
  const e = expTotal(d);
  if (e) p.push(`صرف ${r1(e)} ج`);
  if (has(d.top)) p.push(`أهم حاجة: ${clip(d.top, 120)}`);
  return `${key} (${weekday(key)}): ${p.length ? p.join('، ') : 'مفيش تسجيل'}`;
}

/**
 * ملخص يوم كامل للتقرير اليومي: كل اللي اتسجل، وإيه اللي ناقص، وامبارح للمقارنة.
 * opts: { prev: { key, data } | null, tasks, metrics }
 */
export function dayDigest(key, d = {}, { prev = null, tasks = [], metrics = [], goals = [], days = null } = {}) {
  const L = [`اليوم: ${weekday(key)} ${key}`];

  const sleep = [];
  if (has(d.sleep)) sleep.push(`نام ${toEn(d.sleep)}`);
  if (has(d.wake)) sleep.push(`صحي ${toEn(d.wake)}`);
  const sm = sleepMinutes(d.sleep, d.wake);
  if (sm != null) sleep.push(`المدة ${hmEn(sm)}`);
  if (sleep.length) L.push(`النوم: ${sleep.join('، ')}`);
  const phone = [];
  if (has(d.screen)) phone.push(`Screen time ${toEn(d.screen)}`);
  if (has(d.lastuse)) phone.push(`آخر استخدام ${toEn(d.lastuse)}`);
  if (phone.length) L.push(`الموبايل: ${phone.join('، ')}`);
  if (has(d.mood)) L.push(`المزاج: ${d.mood} من 5`);

  const per = PERIODS.map(([k, l]) => {
    const p = [];
    if (has(d[`${k}e`])) p.push(`طاقة ${d[`${k}e`]} من 5`);
    const h = numOf(d[`${k}h`]);
    if (h) p.push(`${h} ساعة`);
    if (has(d[`${k}t`])) p.push(`عمل: ${clip(d[`${k}t`])}`);
    return p.length ? `- ${l}: ${p.join('، ')}` : '';
  }).filter(Boolean);
  if (per.length) L.push('الفترات:', ...per);
  const tb = timeByCat(d);
  if (tb.total) {
    L.push(`توزيع الوقت (${tb.total} ساعة): ${tb.rows.map((r) => `${r.name} ${r.hours} ساعة`).join('، ')}`);
    const notes = DAY_HOURS
      .map((h) => [h, d.hrs?.[String(h)]])
      .filter(([, x]) => x && has(x.t))
      .map(([h, x]) => `${h}:00 ${TIME_CAT_MAP.get(x.c)?.name || ''} (${clip(x.t, 40)})`);
    if (notes.length) L.push(`- تفاصيل الساعات: ${clip(notes.join('، '), 320)}`);
  }
  if (has(d.up)) L.push(`رفع طاقته: ${clip(d.up)}`);
  if (has(d.down)) L.push(`وطّى طاقته: ${clip(d.down)}`);
  if (has(d.unpl)) L.push(`مهام طلعت من غير تخطيط: ${toEn(d.unpl)}`);

  if (HABITS.some(([k]) => has(d[k]))) {
    const pick = (v) => HABITS.filter(([k]) => (+d[k] || 0) === v).map(([, l]) => l);
    L.push(`العادات: ${habitsDone(d)} من ${HABITS.length} تم`);
    if (pick(2).length) L.push(`- تم: ${pick(2).join('، ')}`);
    if (pick(1).length) L.push(`- جزئي: ${pick(1).join('، ')}`);
    if (pick(0).length) L.push(`- ماتعملتش: ${pick(0).join('، ')}`);
  }
  if (has(d.salah)) L.push(`الصلوات في وقتها: ${d.salah} من 5`);
  const nums = HABIT_NUMS.filter(([k]) => has(d[k])).map(([k, l, u]) => `${l} ${toEn(d[k])} ${u}`);
  if (has(d.cafl)) nums.push(`آخر كوباية ${toEn(d.cafl)}`);
  if (nums.length) L.push(`تفاصيل العادات: ${nums.join('، ')}`);
  if (has(d.relw)) L.push(`الوقت من غير موبايل كان مع: ${clip(d.relw, 80)}`);
  if (has(d.tens)) L.push(`توتر: ${clip(d.tens)}`);
  if (has(d.tired)) L.push(`إرهاق غير معتاد: ${['', 'جزئي', 'آه'][+d.tired || 0]}`);
  if (has(d.learnt)) L.push(`اتعلم: ${clip(d.learnt)}`);

  const work = [1, 2, 3, 4]
    .map((i) => ({ p: clip(d[`w${i}p`], 80), h: numOf(d[`w${i}h`]) || 0, o: clip(d[`w${i}o`]) }))
    .filter((w) => w.p || w.h || w.o);
  if (work.length) {
    L.push(`الشغل: ${r1(work.reduce((a, w) => a + w.h, 0))} ساعة`);
    for (const w of work) L.push(`- ${w.p || 'من غير اسم'}: ${w.h} ساعة${w.o ? `، الناتج: ${w.o}` : ''}`);
  }
  if (has(d.deep)) L.push(`تركيز عميق متواصل: ${toEn(d.deep)} ساعة`);

  if (has(d.exp)) {
    L.push(`الفلوس: صرف ${r1(expTotal(d))} جنيه (${expByCat(d).map(([c, v]) => `${c} ${r1(v)}`).join('، ')})`);
    L.push(`- البنود: ${clip(d.exp.map((e) => `${r1(+e.a || 0)} ${e.w || e.c}`).join('، '), 300)}`);
  }
  if (has(d.income)) L.push(`دخل: ${toEn(d.income)} جنيه`);

  const how = [{ fast: 'بسرعة', slow: 'بعد تفكير' }[d.decs], { full: 'بمعلومات كاملة', part: 'بمعلومات ناقصة' }[d.deci]].filter(Boolean);
  if (has(d.dec)) L.push(`قرار: ${clip(d.dec)}${how.length ? ` (${how.join('، ')})` : ''}`);
  else if (how.length) L.push(`أخد قرار ${how.join('، ')}`);
  if (has(d.post)) L.push(`أجّل: ${clip(d.post)}${has(d.postw) ? `، وليه: ${clip(d.postw)}` : ''}`);
  if (has(d.top)) L.push(`أهم حاجة حصلت: ${clip(d.top, 400)}`);

  const ms = (metrics || []).filter((m) => d.m && has(d.m[m.id])).map((m) => `${m.n}: ${metricText(m, d.m[m.id])}`);
  if (ms.length) L.push(`مقاييسي: ${ms.join('، ')}`);

  const doneT = (tasks || []).filter((t) => t.done && t.dAt && dayKeyAt(t.dAt) === key);
  const openT = (tasks || []).filter((t) => !t.done && t.due && t.due <= key);
  const late = openT.filter((t) => t.due < key).length;
  if (doneT.length || openT.length) {
    const names = doneT.slice(0, 5).map((t) => clip(t.t, 60)).join('، ');
    L.push(`المهام: خلّص ${doneT.length}${names ? ` (${names})` : ''}، ولسه مفتوح ${openT.length}${late ? ` منهم ${late} متأخرة` : ''}`);
  }

  const gDays = days || [{ key, data: d }, ...(prev ? [prev] : [])];
  const gLines = goalDigestLines(goals, { days: gDays, tasks, metrics, today: key });
  if (gLines.length) L.push(...gLines);

  const miss = missingStars(d).map((s) => s.t);
  if (miss.length) L.push(`مش متسجل: ${miss.join('، ')}`);
  if (prev && logged(prev.data)) L.push(`للمقارنة، امبارح: ${dayLine(prev.key, prev.data)}`);
  return L.join('\n');
}

/**
 * ملخص آخر ٧ أيام (لحد endKey) للتقرير الأسبوعي: سطر لكل يوم، ومتوسطات، والعادات، والفلوس، والمهام.
 * days = [{ key, data }]
 */
export function weekDigest(endKey, days, { tasks = [], metrics = [], goals = [] } = {}) {
  const from = addDays(endKey, -6);
  const by = new Map((days || []).map((x) => [x.key, x.data || {}]));
  const week = Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((k) => [k, by.get(k) || {}]);
  const on = week.filter(([, d]) => logged(d));
  const avg = (xs) => (xs.length ? r1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const L = [`الأسبوع: من ${from} لـ ${endKey}، اتسجل فيه ${on.length} من 7 أيام`, 'كل يوم:'];
  for (const [k, d] of week) L.push(`- ${dayLine(k, d)}`);

  const ds = on.map(([, d]) => d);
  const pick = (f) => ds.map(f).filter((v) => v != null);
  const av = [];
  const sl = avg(pick((d) => sleepMinutes(d.sleep, d.wake)));
  if (sl != null) av.push(`نوم ${hmEn(sl)}`);
  const sc = avg(pick((d) => screenMin(d.screen)));
  if (sc != null) av.push(`شاشة ${hmEn(sc)}`);
  const mo = avg(pick((d) => (has(d.mood) ? +d.mood : null)));
  if (mo != null) av.push(`مزاج ${mo}/5`);
  const sa = avg(pick((d) => (has(d.salah) ? +d.salah : null)));
  if (sa != null) av.push(`صلوات في وقتها ${sa}/5`);
  if (av.length) L.push(`المتوسطات (للأيام اللي اتسجلت): ${av.join('، ')}`);

  const pe = PERIODS.map(([k, l]) => [l, avg(pick((d) => (has(d[`${k}e`]) ? +d[`${k}e`] : null)))]).filter(([, v]) => v != null);
  if (pe.length) L.push(`متوسط الطاقة في كل فترة: ${pe.map(([l, v]) => `${l} ${v}/5`).join('، ')}`);

  const wtBy = {};
  let wtTotal = 0;
  for (const d of ds) {
    const tb = timeByCat(d);
    wtTotal += tb.total;
    for (const r of tb.rows) wtBy[r.id] = (wtBy[r.id] || 0) + r.hours;
  }
  if (wtTotal) {
    const wtRows = TIME_CATS.filter((c) => wtBy[c.id]).map((c) => [c.name, wtBy[c.id]]).sort((a, b) => b[1] - a[1]);
    L.push(`توزيع الوقت في الأسبوع (${wtTotal} ساعة): ${wtRows.map(([n, h]) => `${n} ${h} ساعة`).join('، ')}`);
  }

  const habitDays = ds.filter((d) => HABITS.some(([k]) => has(d[k])));
  if (habitDays.length) {
    const cnt = HABITS.map(([k, l]) => [l, habitDays.filter((d) => d[k] === 2).length]).sort((a, b) => b[1] - a[1]);
    L.push(`العادات (عدد أيام التمام من ${habitDays.length}): ${cnt.map(([l, n]) => `${l} ${n}`).join('، ')}`);
  }

  const wk = ds.reduce((a, d) => a + workTotal(d), 0);
  const deep = ds.reduce((a, d) => a + (numOf(d.deep) || 0), 0);
  if (wk || deep) {
    const proj = {};
    for (const d of ds) for (const r of workRows(d)) if (r.p) proj[r.p] = (proj[r.p] || 0) + r.h;
    const top = Object.entries(proj).sort((a, b) => b[1] - a[1]).slice(0, 5);
    L.push(`الشغل: ${r1(wk)} ساعة${deep ? `، منهم تركيز عميق ${r1(deep)}` : ''}${top.length ? ` (${top.map(([p, h]) => `${clip(p, 40)} ${r1(h)}`).join('، ')})` : ''}`);
  }

  const money = moneySummary(on.map(([key, data]) => ({ key, data })), from, endKey);
  if (money.spent || money.income) {
    L.push(`الفلوس: صرف ${r1(money.spent)} جنيه${money.cats.length ? ` (${money.cats.map(([c, v]) => `${c} ${r1(v)}`).join('، ')})` : ''}، ودخل ${r1(money.income)}`);
  }

  const doneW = (tasks || []).filter((t) => t.done && t.dAt && dayKeyAt(t.dAt) >= from && dayKeyAt(t.dAt) <= endKey).length;
  const lateNow = (tasks || []).filter((t) => !t.done && t.due && t.due < endKey).length;
  const later = (tasks || []).filter((t) => !t.done && !t.due).length;
  if (doneW || lateNow || later) L.push(`المهام: خلّص ${doneW} في الأسبوع، و${lateNow} متأخرة دلوقتي، و${later} مستنية من غير ميعاد`);

  for (const m of (metrics || []).filter((x) => x.on !== false)) {
    const vs = ds.map((d) => d.m?.[m.id]).filter(has);
    if (!vs.length) continue;
    if (m.t === 'tri') L.push(`مقياس ${m.n}: تم ${vs.filter((v) => +v === 2).length} أيام، وجزئي ${vs.filter((v) => +v === 1).length}`);
    else if (m.t === 'count' || m.t === 'num') {
      const ns = vs.map((v) => numOf(v)).filter((v) => v != null);
      if (ns.length) L.push(`مقياس ${m.n}: المجموع ${r1(ns.reduce((a, b) => a + b, 0))}، والمتوسط ${avg(ns)}${m.u ? ` ${m.u}` : ''}`);
    } else L.push(`مقياس ${m.n}: ${vs.slice(-3).map((v) => metricText(m, v)).join('، ')}`);
  }

  const posts = ds.filter((d) => has(d.post)).map((d) => clip(d.post, 80));
  if (posts.length) L.push(`أجّل خلال الأسبوع: ${posts.join('، ')}`);
  const decs = ds.filter((d) => d.decs || d.deci);
  if (decs.length) {
    const c = (k, v) => decs.filter((d) => d[k] === v).length;
    L.push(`القرارات: ${c('decs', 'fast')} بسرعة و${c('decs', 'slow')} بعد تفكير، و${c('deci', 'part')} بمعلومات ناقصة`);
  }
  const gLines = goalDigestLines(goals, { days, tasks, metrics, today: endKey });
  if (gLines.length) L.push(...gLines);

  const tired = ds.filter((d) => has(d.tired)).length;
  if (tired) L.push(`أيام فيها إرهاق غير معتاد: ${tired}`);
  return L.join('\n');
}

/**
 * نص التقرير → أجزاء للعرض: { h: عنوان } و { ul: [بنود] } و { p: فقرة }.
 * العنوان = سطر قصير آخره ":". والبند = سطر أوله "-" أو "•". وأي ** أو # من الموديل بتتشال.
 */
export function reportBlocks(text) {
  const out = [];
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
    if (!line) continue;
    const li = /^[-•*]\s+(.*)$/.exec(line);
    if (li) {
      const last = out[out.length - 1];
      if (last?.ul) last.ul.push(li[1]);
      else out.push({ ul: [li[1]] });
    } else if (/[:：]$/.test(line) && line.length <= 40) out.push({ h: line.replace(/[:：]$/, '') });
    else out.push({ p: line });
  }
  return out;
}
