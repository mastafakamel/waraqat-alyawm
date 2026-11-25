// logic.js — حسابات ورقة اليوم. دوال من غير واجهة ومن غير تخزين، عشان تتختبر لوحدها (tests/logic.test.js).

const AR = '٠١٢٣٤٥٦٧٨٩';
const FA = '۰۱۲۳۴۵۶۷۸۹';

export const PRAYERS = [
  ['fajr', 'فجر'],
  ['dhuhr', 'ضهر'],
  ['asr', 'عصر'],
  ['maghrib', 'مغرب'],
  ['isha', 'عشاء'],
];

export const SLEEP_QUAL = [
  ['fresh', 'فايق'],
  ['ok', 'عادي'],
  ['tired', 'مكسّر'],
];
export const NAP_OPTS = [
  ['0', 'مفيش'],
  ['20', '٢٠د'],
  ['45', '٤٥د'],
  ['60', 'ساعة+'],
];
export const MOOD_TAGS = ['هادي', 'مركّز', 'متحمس', 'مضغوط', 'مشتت'];
export const STRESS_OPTS = [
  ['none', 'لا'],
  ['mild', 'خفيف'],
  ['high', 'عالي'],
];
export const POST_REASONS = ['تعب', 'تشتيت', 'مفيش وقت', 'مش واضح أبدأ منين', 'مماطلة'];
export const TASK_CATS = ['شغل', 'تعلم', 'صحة', 'دين', 'شخصي'];
export const INC_CATS = ['راتب', 'فريلانس', 'مشروع', 'هدية', 'تاني'];
export const TIME_CAT_COLORS = ['sleep', 'work', 'learn', 'move', 'health', 'deen', 'rest', 'distract'];

export const PERIOD_GOAL_KINDS = [
  ['build', 'اكتساب عادة', 'check'],
  ['quit', 'إزالة عادة', 'alert'],
  ['project', 'تخليص مشروع', 'tasks'],
  ['target', 'هدف رقمي / عام', 'target'],
];

const DEFAULT_HABIT_LIST = [
  { k: 'wird', n: 'الورد', g: 'deen', on: true, numK: 'wirdp', numU: 'صفحة', chips: [2, 5, 10, 20] },
  { k: 'azkm', n: 'أذكار الصبح', g: 'deen', on: true },
  { k: 'azke', n: 'أذكار المسا', g: 'deen', on: true },
  { k: 'ex', n: 'تمارين', g: 'health', on: true, workout: true, numK: 'exm', numU: 'دقيقة', chips: [15, 30, 45, 60] },
  { k: 'selfcare', n: 'حفاظ على النفس', g: 'health', on: true },
  { k: 'eng', n: 'إنجليزي', g: 'growth', on: true, numK: 'engm', numU: 'دقيقة', chips: [15, 30, 45, 60] },
  { k: 'read', n: 'قراءة', g: 'growth', on: true, numK: 'readp', numU: 'صفحة', chips: [5, 10, 20, 30] },
  { k: 'tech', n: 'تعلم تقني', g: 'growth', on: true, numK: 'techm', numU: 'دقيقة', chips: [30, 45, 60, 90] },
];

const DEFAULT_HABIT_GROUP_LIST = [
  { id: 'deen', name: 'الدين والروح', icon: 'star', withSalah: true },
  { id: 'health', name: 'الصحة والجسم', icon: 'heart' },
  { id: 'growth', name: 'التعلم والتطوير', icon: 'book' },
];

const DEFAULT_TIME_CAT_LIST = [
  { id: 'sleep', name: 'نوم', icon: 'moon', color: 'sleep', on: true },
  { id: 'work', name: 'شغل', icon: 'brief', color: 'work', on: true },
  { id: 'learn', name: 'تعلم', icon: 'book', color: 'learn', on: true },
  { id: 'move', name: 'مواصلات', icon: 'move', color: 'move', on: true },
  { id: 'health', name: 'صحة', icon: 'heart', color: 'health', on: true },
  { id: 'deen', name: 'دين', icon: 'star', color: 'deen', on: true },
  { id: 'rest', name: 'راحة', icon: 'rest', color: 'rest', on: true },
  { id: 'distract', name: 'تشتيت', icon: 'distract', color: 'distract', on: true },
];

const LEGACY_TIME_CATS = [
  { id: 'life', name: 'علاقات', icon: 'home', color: 'life', on: false },
];

const LEGACY_HABIT_LABELS = {
  fajr: 'الفجر', walk: 'مشي', meals: 'أكل منتظم', nojunk: 'بلا جانك', said: 'قلت اللي حسيته', wed: 'الفرح/الشقة',
};

export const DEFAULT_LIFE_AREAS = [
  { id: 'work',   name: 'شغل',    icon: 'brief', note: '' },
  { id: 'deen',   name: 'ديني',   icon: 'star',  note: '' },
  { id: 'health', name: 'صحة',    icon: 'heart', note: '' },
  { id: 'life',   name: 'علاقات', icon: 'users', note: '' },
  { id: 'growth', name: 'تعلم',   icon: 'book',  note: '' },
];

export const TODAY_TASK_LIMIT = 3;

export const EXP_CATS = ['أكل', 'مواصلات', 'بيت', 'شخصي', 'شغل', 'صحة', 'تعلم', 'اشتراكات'];
export const IDEA_CATS = ['مشروع', 'شغل', 'شخصي', 'تعلم', 'تاني'];

export const STAR_DUE = { sleep: 0, habits: 0, work: 2, money: 2, screen: 3, mood: 3, post: 3, top: 3 };

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_NOTIFY = {
  tasksPin: false,
  morning: '08:30',
  evening: '22:00',
  badge: true,
  haptic: true,
  tz: 'Africa/Cairo',
};

/** الإعدادات الافتراضية لكل المتغيرات القابلة للتخصيص (تتحفظ في list/settings). */
export const DEFAULT_SETTINGS = {
  dayStart: 4,
  sleepTarget: 7.5,
  sleepBed: '23:30',
  sleepWake: '06:30',
  autoFillSleep: true,
  workTarget: 7,
  deepTarget: 3,
  screenLimit: 3,
  budget: 0,
  projects: [],
  habits: DEFAULT_HABIT_LIST,
  habitGroups: DEFAULT_HABIT_GROUP_LIST,
  lifeAreas: DEFAULT_LIFE_AREAS,
  timeCats: DEFAULT_TIME_CAT_LIST,
  expCats: EXP_CATS,
  ideaCats: IDEA_CATS,
  stars: Object.fromEntries(Object.entries(STAR_DUE).map(([k, due]) => [k, { on: true, due }])),
  notify: { ...DEFAULT_NOTIFY },
};

/** يطبّع الإعدادات ويملا أي قيمة ناقصة من الافتراضي بأمان. */
export function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const dayStart = [3, 4, 5].includes(+s.dayStart) ? +s.dayStart : DEFAULT_SETTINGS.dayStart;
  const stars = {};
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS.stars)) {
    const cur = s.stars?.[k];
    stars[k] = {
      on: cur?.on !== undefined ? !!cur.on : def.on,
      due: [0, 1, 2, 3].includes(+cur?.due) ? +cur.due : def.due,
    };
  }
  const habits = Array.isArray(s.habits) && s.habits.length ? s.habits : DEFAULT_HABIT_LIST;
  const habitGroups = Array.isArray(s.habitGroups) && s.habitGroups.length ? s.habitGroups : DEFAULT_HABIT_GROUP_LIST;
  const cleanAreas = Array.isArray(s.lifeAreas)
    ? s.lifeAreas
      .filter((a) => a && typeof a.id === 'string' && a.id.trim() && typeof a.name === 'string' && a.name.trim())
      .map((a) => ({
        id: a.id.trim(),
        name: a.name.trim(),
        icon: a.icon || 'target',
        ...(a.note && String(a.note).trim() ? { note: String(a.note).trim() } : {}),
      }))
    : [];
  const lifeAreas = cleanAreas.length ? cleanAreas : DEFAULT_LIFE_AREAS;
  const timeCats = Array.isArray(s.timeCats) && s.timeCats.length ? s.timeCats : DEFAULT_TIME_CAT_LIST;
  const expCats = Array.isArray(s.expCats) && s.expCats.length ? s.expCats : EXP_CATS;
  const ideaCats = Array.isArray(s.ideaCats) && s.ideaCats.length ? s.ideaCats : IDEA_CATS;
  const projects = Array.isArray(s.projects) ? s.projects.filter((x) => typeof x === 'string' && x.trim()) : [];
  const rn = s.notify && typeof s.notify === 'object' ? s.notify : {};
  const optTime = (v, def) => (v === '' || v === null ? '' : (typeof v === 'string' && HHMM_RE.test(v) ? v : def));
  const notify = {
    tasksPin: rn.tasksPin !== undefined ? !!rn.tasksPin : DEFAULT_NOTIFY.tasksPin,
    morning: optTime(rn.morning, DEFAULT_NOTIFY.morning),
    evening: optTime(rn.evening, DEFAULT_NOTIFY.evening),
    badge: rn.badge !== undefined ? !!rn.badge : DEFAULT_NOTIFY.badge,
    haptic: rn.haptic !== undefined ? !!rn.haptic : DEFAULT_NOTIFY.haptic,
    tz: typeof rn.tz === 'string' && rn.tz.trim() ? rn.tz.trim() : DEFAULT_NOTIFY.tz,
  };
  return {
    dayStart,
    sleepTarget: +s.sleepTarget > 0 ? +s.sleepTarget : DEFAULT_SETTINGS.sleepTarget,
    sleepBed: typeof s.sleepBed === 'string' && HHMM_RE.test(s.sleepBed) ? s.sleepBed : DEFAULT_SETTINGS.sleepBed,
    sleepWake: typeof s.sleepWake === 'string' && HHMM_RE.test(s.sleepWake) ? s.sleepWake : DEFAULT_SETTINGS.sleepWake,
    autoFillSleep: s.autoFillSleep !== undefined ? !!s.autoFillSleep : DEFAULT_SETTINGS.autoFillSleep,
    workTarget: +s.workTarget > 0 ? +s.workTarget : DEFAULT_SETTINGS.workTarget,
    deepTarget: +s.deepTarget > 0 ? +s.deepTarget : DEFAULT_SETTINGS.deepTarget,
    screenLimit: +s.screenLimit > 0 ? +s.screenLimit : DEFAULT_SETTINGS.screenLimit,
    budget: +s.budget >= 0 ? +s.budget : 0,
    projects,
    habits,
    habitGroups,
    lifeAreas,
    timeCats,
    expCats,
    ideaCats,
    stars,
    notify,
  };
}

export const HABITS = DEFAULT_HABIT_LIST.map((h) => [h.k, h.n]);
export const HABIT_GROUPS = DEFAULT_HABIT_GROUP_LIST.map((g) => ({
  ...g,
  keys: DEFAULT_HABIT_LIST.filter((h) => h.g === g.id).map((h) => h.k),
}));
export const TIME_CATS = DEFAULT_TIME_CAT_LIST;

export function activeHabits(settings) {
  return normalizeSettings(settings).habits.filter((h) => h.on !== false);
}
export function activeHabitGroups(settings) {
  const cfg = normalizeSettings(settings);
  const hs = cfg.habits.filter((h) => h.on !== false);
  const seen = new Set();
  const base = cfg.habitGroups.map((g) => {
    seen.add(g.id);
    return {
      ...g,
      items: hs.filter((h) => h.g === g.id),
      keys: hs.filter((h) => h.g === g.id).map((h) => h.k),
    };
  });
  for (const a of cfg.lifeAreas || []) {
    if (seen.has(a.id)) continue;
    const items = hs.filter((h) => h.g === a.id);
    if (items.length) {
      seen.add(a.id);
      base.push({ id: a.id, name: a.name, icon: a.icon || 'target', items, keys: items.map((h) => h.k) });
    }
  }
  return base.filter((g) => g.keys.length || g.withSalah);
}
export function allHabitLabel(k, settings) {
  const found = normalizeSettings(settings).habits.find((h) => h.k === k);
  return found?.n || LEGACY_HABIT_LABELS[k] || k;
}
export function activeTimeCats(settings) {
  return normalizeSettings(settings).timeCats.filter((c) => c.on !== false);
}
export function allTimeCatMap(settings) {
  const m = new Map();
  for (const c of LEGACY_TIME_CATS) m.set(c.id, c);
  for (const c of DEFAULT_TIME_CAT_LIST) m.set(c.id, c);
  for (const c of normalizeSettings(settings).timeCats) m.set(c.id, { color: c.id, ...c });
  return m;
}

/** الفترات الأربعة حسب ساعة بداية اليوم (٣ أو ٤ أو ٥ الفجر). */
export function periodsFor(dayStart = 4) {
  const ds = [3, 4, 5].includes(+dayStart) ? +dayStart : 4;
  return [
    ['p1', 'بعد الفجر', `من ${arDigits(ds)} الفجر لـ ١٢ الضهر`],
    ['p2', 'بعد الضهر', 'من ١٢ لـ ٥ العصر'],
    ['p3', 'بعد المغرب', 'من ٥ لـ ٩ بالليل'],
    ['p4', 'قبل النوم', 'بعد ٩ بالليل'],
  ];
}
export function periodHoursFor(dayStart = 4) {
  const ds = [3, 4, 5].includes(+dayStart) ? +dayStart : 4;
  const p1 = Array.from({ length: 12 - ds }, (_, i) => ds + i);
  const p4Late = Array.from({ length: ds }, (_, i) => i);
  return [p1, [12, 13, 14, 15, 16], [17, 18, 19, 20], [21, 22, 23, ...p4Late]];
}
export function dayHoursFor(dayStart = 4) {
  return periodHoursFor(dayStart).flat();
}

export const PERIODS = periodsFor(4);
export const PERIOD_HOURS = periodHoursFor(4);
export const DAY_HOURS = PERIOD_HOURS.flat();

// ---------- الأرقام ----------

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
/** اليوم بيبدأ ٤ الفجر افتراضياً (قابل للتغيير من الإعدادات: ٣ أو ٤ أو ٥). */
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

/** الفترة حسب الساعة وبداية اليوم: ds–١٢ بعد الفجر، ١٢–٥ بعد الضهر، ٥–٩ بعد المغرب، وغير كده قبل النوم. */
export function periodIndex(hour, dayStart = DAY_START) {
  const ds = [3, 4, 5].includes(+dayStart) ? +dayStart : DAY_START;
  if (hour >= ds && hour < 12) return 0;
  if (hour >= 12 && hour < 17) return 1;
  if (hour >= 17 && hour < 21) return 2;
  return 3;
}

/** الفترة i في اليوم المفتوح: 'past' فاتت، 'now' إنت فيها دلوقتي، 'future' لسه. */
export function periodPhase(i, cur, today, hour, dayStart = DAY_START) {
  if (cur < today) return 'past';
  if (cur > today) return 'future';
  const n = periodIndex(hour, dayStart);
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

// ---------- التقييمات والعادات والصلوات ----------
/** العادة: فاضية ← تم ← جزئي ← فاضية. القيم: 0 لا، 1 جزئي، 2 تم. */
export const cycleTri = (v) => [2, 0, 1][v || 0];
/** العدد من ٥: الدوس على رقم بيختار لحد الرقم ده، وعلى نفس الرقم تاني بيقلّل واحد. */
export const rateTap = (cur, v) => ((cur || 0) === v ? v - 1 : v);
/** التقييم ١–٥ (المزاج والطاقة): المختار رقم واحد، ونفس الرقم تاني بيمسحه (''). نفس القيم في البيانات. */
export const rateSet = (cur, v) => (+cur === v ? '' : v);

/** حالة الصلوات الـ ٥ بالاسم من اليوم، مع التوافق الكامل مع بيانات salah/fajr القديمة. */
export function prayersState(day = {}) {
  if (day?.prayers && typeof day.prayers === 'object') {
    return Object.fromEntries(PRAYERS.map(([k]) => [k, !!day.prayers[k]]));
  }
  const out = Object.fromEntries(PRAYERS.map(([k]) => [k, false]));
  const n = Math.max(0, Math.min(5, +day?.salah || 0));
  if (n > 0) {
    for (let i = 0; i < n; i += 1) out[PRAYERS[i][0]] = true;
  } else if (day?.fajr === 2) {
    out.fajr = true;
  }
  return out;
}

/** يبدّل صلاة واحدة بالاسم ويرجّع القيم المتزامنة لـ prayers و salah و fajr. */
export function togglePrayer(day = {}, key) {
  const next = prayersState(day);
  if (!(key in next)) return null;
  next[key] = !next[key];
  const salah = PRAYERS.filter(([k]) => next[k]).length;
  const fajr = next.fajr ? 2 : 0;
  return {
    prayers: salah ? next : '',
    salah: salah || '',
    fajr: fajr || '',
  };
}

export function has(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.values(v).some(Boolean);
  return v !== 0;
}
export function habitsDone(day, settings) {
  const hs = activeHabits(settings);
  return hs.filter((h) => day?.[h.k] === 2).length;
}

// ---------- الشغل والفلوس ----------
export function workRows(day) {
  return [1, 2, 3, 4]
    .map((i) => ({ p: (day?.[`w${i}p`] || '').trim(), h: +toEn(day?.[`w${i}h`]) || 0 }))
    .filter((r) => r.p || r.h);
}
export function workTotal(day) {
  return workRows(day).reduce((a, r) => a + r.h, 0);
}
export function expTotal(day) {
  return (day?.exp || []).reduce((a, e) => a + (+e.a || 0), 0);
}
/** إجمالي الدخل في اليوم: يجمع البنود الجديدة (day.inc) + الخانة القديمة (day.income) للتوافق. */
export function incomeTotal(day = {}) {
  const items = (day?.inc || []).reduce((a, e) => a + (+e.a || 0), 0);
  const leg = +toEn(day?.income) || 0;
  return items + leg;
}
/** [['أكل', 75], ['مواصلات', 30]] مترتبة من الأكبر للأصغر. */
export function expByCat(day) {
  const by = {};
  for (const e of day?.exp || []) by[e.c] = (by[e.c] || 0) + (+e.a || 0);
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

const EXP_GUESS_RULES = [
  ['أكل', ['غدا', 'فطار', 'عشا', 'اكل', 'قهوه', 'شاي', 'كافيه', 'سوبرماركت', 'مطعم', 'ساندوتش', 'عصير', 'ميه', 'خبز', 'عيش', 'فاكهه', 'خضار', 'لحمه', 'فراخ', 'سمك', 'بيتزا', 'شاورما', 'كشري', 'فول', 'طعميه', 'حلويات', 'شوكولاته']],
  ['مواصلات', ['اوبر', 'كريم', 'ديدي', 'اندرايف', 'مترو', 'مواصلات', 'بنزين', 'تاكسي', 'ميكروباص', 'اتوبيس', 'قطر', 'ركنه', 'جراج', 'كارته', 'طريق', 'توصيل', 'مشوار']],
  ['بيت', ['ايجار', 'كهربا', 'غاز', 'مياه', 'نت', 'انترنت', 'بواب', 'صيانه', 'بيت', 'شقه', 'نضافه', 'منظفات', 'اثاث']],
  ['صحة', ['جيم', 'دكتور', 'صيدليه', 'دوا', 'علاج', 'تحليل', 'كشف', 'فيتامين', 'مكمل', 'بروتين', 'اسنان', 'مستشفي', 'صحه']],
  ['تعلم', ['كورس', 'كتاب', 'كتب', 'تعلم', 'دوره', 'محاضره', 'ورشه', 'انجليزي', 'دراسه', 'امتحان', 'شهاده']],
  ['اشتراكات', ['اشتراك', 'باقه', 'شحن', 'رصيد', 'نتفلكس', 'سبوتيفاي', 'يوتيوب', 'كلاود', 'chatgpt', 'claude', 'cursor', 'spotify', 'netflix', 'icloud']],
  ['شغل', ['شغل', 'عميل', 'دومين', 'سيرفر', 'استضافه', 'اعلان', 'تسويق', 'مكتب', 'ادوات', 'بزنس']],
  ['شخصي', ['حلاق', 'لبس', 'هدوم', 'جزمه', 'عطر', 'برفان', 'هديه', 'خروج', 'سينما', 'موبايل', 'اكسسوار']],
];

/** تخمين ذكي لتصنيف المصروف من الوصف؛ يرجّع اسم التصنيف لو موجود في قايمة التصنيفات الحالية، وإلا null. */
export function guessExpCat(text, cats = EXP_CATS) {
  const n = normAr(text);
  if (!n) return null;
  for (const [cat, words] of EXP_GUESS_RULES) {
    if (!cats.includes(cat)) continue;
    if (words.some((w) => n.includes(w))) return cat;
  }
  return null;
}

// ---------- البنود الأساسية ★ ----------
export const STAR_ITEMS = [
  { k: 'sleep', t: 'النوم', q: 'نمت إمتى وصحيت إمتى؟', done: (d) => has(d.sleep) || has(d.wake) },
  { k: 'screen', t: 'الشاشة', q: 'الـ Screen time كان كام النهارده؟', done: (d) => has(d.screen) },
  { k: 'mood', t: 'المزاج', q: 'مزاجك النهارده من ٥؟', done: (d) => has(d.mood) },
  {
    k: 'habits', t: 'العادات', q: 'عملت إيه من العادات النهارده؟',
    done: (d, cfg) => [...activeHabits(cfg).map((h) => h.k), 'fajr', 'salah', 'prayers'].some((k) => has(d[k])),
  },
  {
    k: 'work', t: 'الشغل', q: 'اشتغلت على إيه وكام ساعة؟',
    done: (d, cfg) => !!d.workOff || [1, 2, 3, 4].some((i) => has(d[`w${i}h`])) || (timeByCat(d, cfg).by.work > 0),
  },
  {
    k: 'money', t: 'الفلوس', q: 'صرفت إيه النهارده؟',
    done: (d) => !!d.noSpend || has(d.exp) || incomeTotal(d) > 0,
  },
  { k: 'post', t: 'قرار وتأجيل', q: 'أجّلت إيه النهارده؟', done: (d) => has(d.post) },
  { k: 'top', t: 'أهم حاجة', q: 'إيه أهم حاجة حصلت النهارده؟', done: (d) => has(d.top) },
];

export function starItemsFor(settings) {
  const cfg = normalizeSettings(settings);
  return STAR_ITEMS
    .filter((s) => cfg.stars[s.k]?.on !== false)
    .map((s) => ({ ...s, due: cfg.stars[s.k]?.due ?? STAR_DUE[s.k] }));
}

export function starState(day, settings) {
  const cfg = normalizeSettings(settings);
  return starItemsFor(cfg).map((s) => ({ ...s, ok: !!s.done(day || {}, cfg) }));
}
export function starCount(day, settings) {
  return starState(day, settings).filter((s) => s.ok).length;
}
export function missingStars(day, settings) {
  return starState(day, settings).filter((s) => !s.ok);
}
/** ١ → "بند واحد" ، ٢ → "بندين" ، ٥ → "٥ بنود" */
export function itemsWord(n) {
  if (n === 1) return 'بند واحد';
  if (n === 2) return 'بندين';
  return `${fmtNum(n)} بنود`;
}

// ---------- ملخص النهارده والأسبوع ----------
/** البنود الناقصة مقسومة: now = وقتها جه، later = لسه. اليوم اللي فات كله now، واليوم الجاي كله later. */
export function starSplit(day, cur, today, hour, settings) {
  const cfg = normalizeSettings(settings);
  const miss = missingStars(day || {}, cfg);
  let n = periodIndex(hour, cfg.dayStart);
  if (cur < today) n = 99;
  else if (cur > today) n = -1;
  return { now: miss.filter((s) => s.due <= n), later: miss.filter((s) => s.due > n) };
}

/** حالة اليوم في شريط الأيام: full = البنود المفعّلة كلها اتسجلت، part = فيه تسجيل، none = مفيش. */
export function dayStatus(d, settings) {
  if (!d || !logged(d)) return 'none';
  const total = starItemsFor(settings).length;
  if (!total) return 'full';
  return starCount(d, settings) === total ? 'full' : 'part';
}

/** نسبة إنجاز اليوم للحلقة الصغيرة حوالين كل يوم في شريط الأسبوع (٠ لـ ١٠٠). */
export function dayProgress(d, settings) {
  if (!d || !logged(d)) return 0;
  const total = starItemsFor(settings).length;
  if (!total) return 100;
  const sc = starCount(d, settings);
  return sc ? Math.round((sc / total) * 100) : 15;
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
/** ٩ ← "٩ ص" ، ١٧ ← "٥ م" ، ٠ ← "١٢ ص" */
export function fmtHour(h) {
  const n = ((+h % 24) + 24) % 24;
  return `${fmtNum(n % 12 || 12)} ${n < 12 ? 'ص' : 'م'}`;
}

/** عدد ساعات ورا بعض جوّه نفس اليوم المنطقي من غير ما يلفّ لبكرة. */
export function hourSpan(startHour, count = 1, dayStart = DAY_START) {
  const hours = dayHoursFor(dayStart);
  const i = hours.indexOf(((+startHour % 24) + 24) % 24);
  if (i < 0) return [];
  return hours.slice(i, i + Math.max(1, +count || 1));
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

/** تجميع ساعات اليوم حسب المجال: { total, by, rows: [{ id, name, icon, color, hours }] } مترتبة من الأكبر للأصغر. */
export function timeByCat(day = {}, settings) {
  const cfg = normalizeSettings(settings);
  const catMap = allTimeCatMap(cfg);
  const hours = dayHoursFor(cfg.dayStart);
  const hrs = day?.hrs;
  const by = {};
  let total = 0;
  if (hrs && typeof hrs === 'object') {
    for (const h of hours) {
      const c = hrs[String(h)]?.c;
      if (c && catMap.has(c)) {
        by[c] = (by[c] || 0) + 1;
        total += 1;
      }
    }
  }
  const order = [...cfg.timeCats.map((c) => c.id), ...LEGACY_TIME_CATS.map((c) => c.id)];
  const idx = (id) => {
    const i = order.indexOf(id);
    return i < 0 ? 999 : i;
  };
  const rows = Object.keys(by)
    .map((id) => ({ ...catMap.get(id), hours: by[id] }))
    .sort((a, b) => b.hours - a.hours || idx(a.id) - idx(b.id));
  return { total, by, rows };
}

/** الساعات الخام اللي اتنام فيها من sleep و wake. */
export function sleepHourList(sleep, wake) {
  const s = mins(sleep);
  const dur = sleepMinutes(sleep, wake);
  if (s == null || dur == null || dur === 0) return [];
  const start = Math.floor((s + 29) / 60) % 24;
  const count = Math.max(1, Math.min(16, Math.round(dur / 60)));
  return Array.from({ length: count }, (_, i) => (start + i) % 24);
}

/**
 * تقسيم ساعات النوم صح حسب بداية اليوم المنطقي (dayStart):
 * - prev: الساعات اللي قبل dayStart (ليلة امبارح — تتسجل في آخر يوم امبارح، مش آخر النهارده!).
 * - today: الساعات اللي من أول dayStart وطالع (صباح النهارده، أو لو النوم كله جوّه نفس اليوم المنطقي).
 */
export function sleepHoursSplit(sleep, wake, dayStart = DAY_START) {
  const ds = [3, 4, 5].includes(+dayStart) ? +dayStart : DAY_START;
  const raw = sleepHourList(sleep, wake);
  if (!raw.length) return { today: [], prev: [] };
  const cut = raw.findIndex((h, i) => i > 0 && h === ds);
  if (cut > 0) return { prev: raw.slice(0, cut), today: raw.slice(cut) };
  const w = mins(wake);
  if (w === ds * 60 && raw[0] !== ds) return { prev: raw, today: [] };
  return { prev: [], today: raw };
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

// ---------- نظام الإدخال: اقتراحات من أيامك اللي فاتت ----------
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** ٥ أوقات (HH:MM) كل ربع ساعة حوالين وسيط آخر ٧ أيام قبل cur، للـ chips. */
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

/** مدة الشاشة اللي بتتكتب بكيبورد أرقام → "H:MM". */
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
export function todayTasks(tasks, today, dayStart = DAY_START) {
  return (tasks || []).filter(
    (t) => (t.due && t.due <= today && !t.done) || (t.done && t.dAt && dayKeyAt(t.dAt, dayStart) === today),
  );
}

/** المهمة اتأخرت لو ميعادها فات ولسه ماخلصتش. */
export function isOverdue(t, today) {
  return !t.done && !!t.due && t.due < today;
}

/** تبويبة المهام: النهارده، وبعدين، وخلصت (آخر ٣٠). */
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
    .replace(/[ً-ْـ]/g, '')
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

/** "٢٠ نوفمبر" */
export function longDate(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}

// ---------- الفترات وهدف الفترة الواحد (list/periods) ----------
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
/** فترة جديدة من يوم معيّن، افتراضي ١١ يوم (أو أي مدة تختارها، ومعاها اسم وهدف اختياري). */
export function newPeriod(from, len = 11, extra = {}) {
  return { id: uid(), from, to: addDays(from, Math.max(1, len) - 1), ...extra };
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
  return p ? { from: p.from, title: `من ${longDate(p.from)} لحد دلوقتي`, to: p.to } : { from: `${today.slice(0, 8)}01`, title: 'من أول الشهر لحد دلوقتي', to: '' };
}

/**
 * تقييم هدف الفترة الواحد (اكتساب عادة / إزالة عادة / تخليص مشروع / هدف رقمي عام).
 * period.goal = { title, kind, source, target, unit?, dir?, steps?, log?, val? }
 */
export function evalPeriodGoal(period, { days = [], metrics = [], today = dayKeyAt(), settings } = {}) {
  const g = period?.goal;
  if (!period || !g || !g.title) return null;
  const cfg = normalizeSettings(settings);
  const tp = goalTimeProgress(period, today);
  const ended = today > period.to;
  const inRange = (days || []).filter((x) => x.key >= period.from && x.key <= period.to);
  const byKey = new Map(inRange.map((x) => [x.key, x.data || {}]));

  const kind = g.kind || 'build';
  const kindMeta = PERIOD_GOAL_KINDS.find(([k]) => k === kind) || PERIOD_GOAL_KINDS[0];
  const src = g.source || (kind === 'project' ? 'steps' : 'manual');
  const dir = g.dir === 'max' ? 'max' : 'min';

  let cur = 0;
  let target = Math.max(1, +g.target || tp.daysTotal);
  let unit = g.unit || '';
  let pct = 0;
  let streak = 0;
  let slipped = 0;
  let sourceLabel = 'تسجيل يدوي';
  let steps = null;
  let nextStep = '';
  const todayVal = g.log?.[today];

  // مساعدة لحساب أطول سلسلة متواصلة جوه الفترة
  const calcStreak = (passFn) => {
    let best = 0;
    let run = 0;
    for (let i = 0; i < tp.daysTotal; i += 1) {
      const k = addDays(period.from, i);
      if (k > today && !ended) break;
      if (passFn(k, byKey.get(k) || {})) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    return best;
  };

  if (kind === 'build') {
    unit = unit || 'يوم';
    if (src === 'manual') {
      sourceLabel = 'تسجيل يومي بدوسة';
      const pass = (k) => (g.log?.[k] || 0) >= 1;
      for (let i = 0; i < tp.daysTotal; i += 1) if (pass(addDays(period.from, i))) cur += 1;
      streak = calcStreak(pass);
    } else if (src === 'sleep') {
      sourceLabel = `تلقائي: نوم ≥ ${fmtNum(cfg.sleepTarget)} س`;
      const pass = (_k, d) => {
        const sm = sleepMinutes(d.sleep, d.wake);
        return sm != null && sm >= cfg.sleepTarget * 60;
      };
      cur = inRange.filter(({ key, data }) => pass(key, data)).length;
      streak = calcStreak(pass);
    } else if (src === 'salah') {
      sourceLabel = 'تلقائي: الصلوات ٥/٥';
      const pass = (_k, d) => (+d.salah || 0) >= 5;
      cur = inRange.filter(({ key, data }) => pass(key, data)).length;
      streak = calcStreak(pass);
    } else if (src.startsWith('habit:')) {
      const hk = src.slice(6);
      sourceLabel = `تلقائي: عادة «${allHabitLabel(hk, cfg)}»`;
      cur = r1(inRange.reduce((a, { data }) => a + (data[hk] === 2 ? 1 : data[hk] === 1 ? 0.5 : 0), 0));
      streak = calcStreak((_k, d) => d[hk] === 2);
    } else if (src.startsWith('metric:')) {
      const mid = src.slice(7);
      const met = (metrics || []).find((m) => String(m.id) === String(mid));
      sourceLabel = met ? `تلقائي: مقياس «${met.n}»` : 'تلقائي من مقاييسي';
      const pass = (_k, d) => {
        const v = d.m?.[mid];
        if (!has(v)) return false;
        return met?.t === 'tri' ? +v === 2 : true;
      };
      cur = inRange.filter(({ key, data }) => pass(key, data)).length;
      streak = calcStreak(pass);
    }
    pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
  } else if (kind === 'quit') {
    unit = unit || 'يوم نضيف';
    if (src === 'manual') {
      sourceLabel = 'متابعة يومية (نضيف / وقعت)';
      const pass = (k) => g.log?.[k] === 1;
      for (let i = 0; i < tp.daysTotal; i += 1) {
        const v = g.log?.[addDays(period.from, i)];
        if (v === 1) cur += 1;
        else if (v === 0) slipped += 1;
      }
      streak = calcStreak(pass);
    } else if (src === 'screen') {
      sourceLabel = `تلقائي: شاشة ≤ ${fmtNum(cfg.screenLimit)} س`;
      const pass = (_k, d) => {
        const sm = has(d.screen) ? screenMin(d.screen) : null;
        return sm != null && sm <= cfg.screenLimit * 60;
      };
      cur = inRange.filter(({ key, data }) => pass(key, data)).length;
      slipped = inRange.filter(({ data }) => {
        const sm = has(data.screen) ? screenMin(data.screen) : null;
        return sm != null && sm > cfg.screenLimit * 60;
      }).length;
      streak = calcStreak(pass);
    } else if (src === 'distract') {
      sourceLabel = 'تلقائي: صفر ساعات تشتيت';
      const pass = (_k, d) => {
        const tb = timeByCat(d, cfg);
        return tb.total > 0 && !(tb.by.distract > 0);
      };
      cur = inRange.filter(({ key, data }) => pass(key, data)).length;
      slipped = inRange.filter(({ data }) => (timeByCat(data, cfg).by.distract || 0) > 0).length;
      streak = calcStreak(pass);
    }
    pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
  } else if (kind === 'project') {
    if (src === 'steps') {
      steps = Array.isArray(g.steps) ? g.steps : [];
      cur = steps.filter((x) => x.done).length;
      target = steps.length;
      unit = 'خطوة';
      pct = target ? Math.round((cur / target) * 100) : 0;
      nextStep = steps.find((x) => !x.done)?.t || '';
      sourceLabel = 'خطوات المشروع';
    } else if (src === 'work') {
      sourceLabel = 'تلقائي: ساعات الشغل';
      unit = unit || 'ساعة';
      cur = r1(inRange.reduce((a, { data }) => a + Math.max(workTotal(data), timeByCat(data, cfg).by.work || 0), 0));
      pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
    } else if (src.startsWith('proj:')) {
      const pName = src.slice(5);
      const want = normAr(pName);
      sourceLabel = `تلقائي: مشروع «${pName}»`;
      unit = unit || 'ساعة';
      cur = r1(inRange.reduce((a, { data }) => a + workRows(data).filter((w) => want && normAr(w.p) === want).reduce((x, w) => x + w.h, 0), 0));
      pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
    } else {
      sourceLabel = 'تحديث يدوي';
      cur = Math.max(0, r1(+g.val || 0));
      pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
    }
  } else {
    // target (هدف رقمي / عام)
    if (src === 'spend') {
      sourceLabel = 'تلقائي: مصاريف الفترة';
      unit = unit || 'ج';
      cur = r1(inRange.reduce((a, { data }) => a + expTotal(data), 0));
    } else if (src === 'income') {
      sourceLabel = 'تلقائي: دخل الفترة';
      unit = unit || 'ج';
      cur = r1(inRange.reduce((a, { data }) => a + incomeTotal(data), 0));
    } else if (src === 'work') {
      sourceLabel = 'تلقائي: ساعات الشغل';
      unit = unit || 'ساعة';
      cur = r1(inRange.reduce((a, { data }) => a + Math.max(workTotal(data), timeByCat(data, cfg).by.work || 0), 0));
    } else if (src.startsWith('metric:')) {
      const mid = src.slice(7);
      const met = (metrics || []).find((m) => String(m.id) === String(mid));
      sourceLabel = met ? `تلقائي: مقياس «${met.n}»` : 'تلقائي من مقاييسي';
      unit = unit || met?.u || '';
      cur = r1(inRange.reduce((a, { data }) => {
        const v = data.m?.[mid];
        if (!has(v)) return a;
        if (met?.t === 'tri') return a + (+v === 2 ? 1 : +v === 1 ? 0.5 : 0);
        return a + (numOf(v) || 0);
      }, 0));
    } else {
      sourceLabel = 'تحديث يدوي';
      cur = Math.max(0, r1(+g.val || 0));
    }
    pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
  }

  const isCap = kind === 'target' && dir === 'max';
  let succeeded = false;
  let isBehind = false;
  let status = 'done';
  let statusText = '';
  let paceText = '';

  if (isCap) {
    const over = cur > target;
    succeeded = !over && ended;
    isBehind = over || (!ended && tp.timePct > 0 && pct > tp.timePct + 8);
    status = isBehind ? 'attn' : 'done';
    if (over) {
      statusText = 'عدّيت السقف';
      paceText = `زيادة ${fmtNum(cur - target)} ${unit}`.trim();
    } else if (ended) {
      statusText = 'نجحت الفترة ✓';
      paceText = `تحت السقف بـ ${fmtNum(target - cur)} ${unit}`.trim();
    } else if (isBehind) {
      statusText = 'محتاج تركيز';
      paceText = `فاضل ${fmtNum(target - cur)} ${unit} · ${fmtDays(tp.daysLeft)}`.trim();
    } else {
      statusText = 'على الطريق';
      paceText = `تحت السقف · فاضل ${fmtNum(target - cur)} ${unit}`.trim();
    }
  } else {
    succeeded = target > 0 && cur >= target;
    isBehind = !succeeded && (ended || (tp.timePct > 0 && pct + 8 < tp.timePct));
    status = isBehind ? 'attn' : 'done';
    if (succeeded) {
      statusText = ended ? 'نجحت الفترة ✓' : 'حققت الهدف ✓';
      paceText = streak >= 2 ? `أطول سلسلة ${fmtDays(streak)}` : 'الهدف اتحقق بالكامل';
    } else if (ended) {
      statusText = `وصلت ${fmtNum(pct)}٪`;
      paceText = `انتهت الفترة (${fmtNum(cur)} من ${fmtNum(target)} ${unit})`.trim();
    } else if (isBehind) {
      statusText = 'محتاج تركيز';
      paceText = tp.daysLeft > 0 ? `فاضل ${fmtNum(Math.max(0, target - cur))} ${unit} · ${fmtDays(tp.daysLeft)}`.trim() : 'آخر يوم في الفترة';
    } else {
      statusText = 'على الطريق';
      paceText = streak >= 2 && (kind === 'build' || kind === 'quit')
        ? `سلسلة ${fmtDays(streak)} · فاضل ${fmtDays(tp.daysLeft)}`
        : tp.daysLeft > 0 ? `فاضل ${fmtDays(tp.daysLeft)} في الفترة` : 'آخر يوم في الفترة';
    }
  }

  return {
    title: g.title, kind, kindLabel: kindMeta[1], kindIcon: kindMeta[2], source: src, sourceLabel,
    cur, target, unit, pct, streak, slipped, isCap, succeeded, ended, status, isBehind,
    statusText, paceText, steps, nextStep, todayVal,
    daysTotal: tp.daysTotal, daysPassed: tp.daysPassed, daysLeft: tp.daysLeft, timePct: tp.timePct,
  };
}

export function periodGoalDigestLines(periods, ctx) {
  const cur = periodOf(periods, ctx?.today || dayKeyAt());
  if (!cur?.goal) return [];
  const ev = evalPeriodGoal(cur, ctx);
  if (!ev) return [];
  return [
    `هدف الفترة الحالية (${cur.name ? `${clip(cur.name, 40)}، ` : ''}${cur.from} لـ ${cur.to}): ${clip(ev.title, 80)} [${ev.kindLabel}] — ${ev.pct}% (${ev.cur}/${ev.target}${ev.unit ? ` ${ev.unit}` : ''}، فاضل ${ev.daysLeft} يوم، ${ev.statusText})`,
  ];
}

// ---------- مقاييسي (list/metrics) ----------
export const METRIC_TYPES = [['tri', 'تم / جزئي'], ['count', 'عدّاد'], ['num', 'رقم'], ['time', 'وقت'], ['text', 'كلام']];
export const METRIC_WHEN = [['day', 'طول اليوم'], ...PERIODS.map(([k, l]) => [k, l])];
export const AREAS = ['الشغل والبيزنس', 'الصحة', 'التعلم', 'شخصي'];

/** المجالات: الأساسية، وبعدها أي مجال جديد اتعمل في المقاييس. */
export function metricAreas(metrics) {
  const out = [...AREAS];
  for (const m of metrics || []) if (m.a && !out.includes(m.a)) out.push(m.a);
  return out;
}

/** المقياس يبان في اليوم ده؟ لو مقفول لأ. ولو ليه فترة، بيبان من أول ما الفترة دي تيجي (والأيام اللي فاتت كله باين). */
export function metricVisible(m, cur, today, hour, dayStart = DAY_START) {
  if (!m.on) return false;
  if (!m.w || m.w === 'day') return true;
  const i = PERIODS.findIndex(([k]) => k === m.w);
  return i < 0 || periodPhase(i, cur, today, hour, dayStart) !== 'future';
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

/** قيمة المقياس للعرض، و'' لو ماتسجلش. */
export function metricValue(m, v) {
  if (m.t === 'tri') return ['', 'جزئي', 'تم'][+v || 0];
  if (v === undefined || v === null || v === '') return '';
  if (m.t === 'count') return fmtNum(+v || 0);
  if (m.t === 'num') return fmtNum(+v);
  if (m.t === 'time') return arDigits(v);
  return String(v);
}

/** إجمالي المصروف والدخل والصافي والمتوسط اليومي والميزانية من from لحد to. */
export function moneySummary(days, from, to, budget = 0) {
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
    income += incomeTotal(data);
  }
  const daysElapsed = Math.max(1, daysBetween(from, to) + 1);
  const avgPerDay = Math.round(spent / daysElapsed);
  const net = income - spent;
  const cap = +budget > 0 ? +budget : 0;
  const remaining = cap ? cap - spent : 0;
  const budgetPct = cap ? Math.min(100, Math.round((spent / cap) * 100)) : 0;
  return {
    spent, income, net, avgPerDay, daysElapsed, budget: cap, remaining, budgetPct,
    cats: Object.entries(by).sort((a, b) => b[1] - a[1]),
  };
}

// ---------- النسخة الاحتياطية والمزامنة ----------
export const BACKUP_APP = 'waraqat-alyawm';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function mergeDoc(id, local, incoming) {
  if (!incoming?.data || typeof incoming.data !== 'object') return null;
  if (!local?.data) return { data: incoming.data, changed: true };
  const newer = (incoming.updatedAt || 0) > (local.updatedAt || 0);
  let data;
  if (id === 'list/settings') {
    data = newer ? { ...local.data, ...incoming.data } : { ...incoming.data, ...local.data };
  } else if (id.startsWith('list/')) {
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
  const ok = (d) => d && typeof d.id === 'string' && /^(day\/\d{4}-\d{2}-\d{2}|list\/(tasks|ideas|metrics|periods|goals|settings))$/.test(d.id) && d.data && typeof d.data === 'object';
  return j.docs.filter(ok);
}

/** المزامنة: آخر تعديل بيكسب على مستوى المستند كله. */
export function takeRemote(local, remote) {
  return !local || (+remote.updated_at || 0) > (+local.updatedAt || 0);
}

/** حد للاستخدام في الكود عشان الخطة المجانية: عدد طلبات المزامنة في اليوم. */
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

/** السطر بيروح لخانة "عملت إيه" بتاعة الفترة اللي إنت فيها. */
export function lineTarget(hour, dayStart = DAY_START) {
  const [k, label] = periodsFor(dayStart)[periodIndex(hour, dayStart)];
  return { key: `${k}t`, label };
}

/** id قصير ومش بيتكرر للمهام والأفكار. */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- تقرير الذكاء الاصطناعي: ملخص البيانات ----------
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
const AI_KEYS = ['ai', 'aiw'];
const logged = (d) => Object.keys(d || {}).some((k) => !AI_KEYS.includes(k));
const screenMin = (v) => mins(v) ?? (numOf(v) != null ? numOf(v) * 60 : null);

export const HABIT_NUMS = [
  ['wirdp', 'الورد', 'صفحة'], ['exm', 'تمارين', 'دقيقة'], ['engm', 'إنجليزي', 'دقيقة'], ['readp', 'قراءة', 'صفحة'],
  ['techm', 'تعلم تقني', 'دقيقة'], ['caf', 'قهوة/شاي', 'كوباية'], ['relm', 'وقت بدون موبايل', 'دقيقة'],
];

// ---------- نظام الأهداف المتكامل وبنك الأهداف وخريطة جوانب الحياة (list/goals) ----------
export const GOAL_PILLARS = DEFAULT_LIFE_AREAS;
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

const HABIT_NUM_MAP = new Map(HABIT_NUMS.map(([k, l, u]) => [k, { l, u }]));

/** جوانب الحياة القابلة للتخصيص من الإعدادات. */
export function activeLifeAreas(settings) {
  return normalizeSettings(settings).lifeAreas;
}

/** خريطة id ← جانب حياة (بتحتفظ بالافتراضي كاحتياطي لأي هدف قديم). */
export function lifeAreaMap(settings) {
  const m = new Map();
  for (const a of DEFAULT_LIFE_AREAS) m.set(a.id, a);
  for (const a of activeLifeAreas(settings)) m.set(a.id, a);
  return m;
}

/** نوع العنصر داخل list/goals: 'goal' (هدف = ليه) أو 'project' (مشروع = إيه اللي هيحققه). */
export function itemKind(g) {
  return g?.kind === 'goal' ? 'goal' : 'project';
}

/** حالة العنصر: 'active' (شغّال دلوقتي) | 'frozen' (مجمّد مش ممسوح) | 'done' (مكتمل). */
export function itemStatus(g) {
  if (!g) return 'frozen';
  if (g.done) return 'done';
  if (g.st === 'frozen' || g.st === 'backlog') return 'frozen';
  return 'active';
}

/** هل الهدف/المشروع مجمّد (في الانتظار للمراجعة)؟ يدعم الاسم القديم backlog والجديد frozen. */
export function isBacklogGoal(g) {
  return !!g && !g.done && (g.st === 'backlog' || g.st === 'frozen');
}

/** مهام النهاردة المفتوحة فقط (بحد أقصى ٣ للتركيز). */
export function todayOpenTasks(tasks, today) {
  return (tasks || [])
    .filter((t) => !t.done && t.due && t.due <= today)
    .sort((a, b) => (b.pri ? 1 : 0) - (a.pri ? 1 : 0) || (a.at || 0) - (b.at || 0));
}

/** فحص قاعدة الـ ٣ مهام للنهاردة قبل الإضافة أو النقل للنهاردة. */
export function canAddTodayTask(tasks, today, excludeId = '') {
  const open = todayOpenTasks(tasks, today).filter((t) => String(t.id) !== String(excludeId));
  return { ok: open.length < TODAY_TASK_LIMIT, count: open.length, limit: TODAY_TASK_LIMIT, open };
}

/** عمر فكرة الهدف في بنك الأهداف (قاعدة التبريد): النهارده / من امبارح / من ٥ أيام. */
export function backlogAgeText(at, today = dayKeyAt(), dayStart = DAY_START) {
  if (!at) return '';
  const k = typeof at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(at) ? at : dayKeyAt(at, dayStart);
  const diff = daysBetween(k, today);
  if (diff <= 0) return 'النهارده';
  if (diff === 1) return 'من امبارح';
  return `من ${fmtDays(diff)}`;
}

/**
 * حالة «مراجعة نهاية الفترة» لبنك الأهداف:
 * بتتنبه لما يكون عندك أهداف في الانتظار + إما النهارده آخر يوم في الفترة الحالية أو آخر فترة انتهت ولسه ماتراجعتش.
 */
export function periodReviewState(periods, goals, today = dayKeyAt()) {
  const count = (goals || []).filter(isBacklogGoal).length;
  const cur = periodOf(periods, today);
  const ended = (periods || [])
    .filter((p) => p?.to && p.to < today)
    .sort((a, b) => b.to.localeCompare(a.to))[0] || null;
  if (!count) return { due: false, reason: null, period: cur || ended || null, count: 0 };
  if (cur && cur.to === today && !cur.reviewedAt) {
    return { due: true, reason: 'last_day', period: cur, count };
  }
  if (!cur && ended && !ended.reviewedAt) {
    return { due: true, reason: 'ended', period: ended, count };
  }
  return { due: false, reason: null, period: cur || ended || null, count };
}

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
export function goalSourceLabel(g, metrics = [], settings) {
  const s = g.src || {};
  const tMap = allTimeCatMap(settings);
  if (g.m === 'habit') {
    if (s.kind === 'salah') return 'تلقائي من الصلوات في وقتها';
    if (s.kind === 'sum') return `تلقائي من أرقام «${HABIT_NUM_MAP.get(s.k)?.l || s.k || ''}»`;
    return `تلقائي من عادة «${allHabitLabel(s.k, settings)}»`;
  }
  if (g.m === 'time') {
    if (s.kind === 'deep') return 'تلقائي من التركيز العميق';
    if (s.kind === 'proj') return `تلقائي من مشروع «${s.proj || ''}»`;
    if (s.kind === 'work' || s.c === 'work') return 'تلقائي من الوقت والشغل';
    return `تلقائي من تاب الوقت (${tMap.get(s.c)?.name || 'وقت'})`;
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

export function evalGoal(g, { days = [], tasks = [], metrics = [], today = dayKeyAt(), settings } = {}) {
  const cfg = normalizeSettings(settings);
  const aMap = lifeAreaMap(cfg);
  const pillar = aMap.get(g.p) || cfg.lifeAreas[0] || DEFAULT_LIFE_AREAS[0];
  if (isBacklogGoal(g)) {
    return {
      cur: 0, target: 0, unit: '', pct: 0,
      timePct: 0, daysTotal: 0, daysPassed: 0, daysLeft: 0, overdue: false,
      isCap: false, isTargetMetric: false, isBacklog: true,
      status: 'wait', isBehind: false,
      paceText: backlogAgeText(g.at, today, cfg.dayStart),
      sourceLabel: 'في بنك الأهداف',
      horizonText: '', pillar, segs: null, nextText: '', linked: [],
    };
  }
  const tp = goalTimeProgress(g, today);
  const horizonText = g.from && g.to ? periodLabel({ from: g.from, to: g.to }) : '';
  const sourceLabel = goalSourceLabel(g, metrics, cfg);
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
        const hrsCat = timeByCat(data, cfg).by[cat] || 0;
        return a + (cat === 'work' ? Math.max(workTotal(data), hrsCat) : hrsCat);
      }, 0));
    }
    unit = unit || 'ساعة';
    pct = Math.min(100, Math.max(0, Math.round((cur / target) * 100)));
  } else if (g.m === 'metric') {
    if (s.kind === 'income') {
      cur = r1(inRange.reduce((a, { data }) => a + incomeTotal(data), 0));
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
    cur, target, unit, pct, ...tp, isCap, isTargetMetric, isBacklog: false, status, isBehind,
    paceText, sourceLabel, horizonText, pillar, segs, nextText, linked,
  };
}

/** تقييم كل الأهداف والمشاريع وبنك المجمّد وخريطة المجالات مرة واحدة. */
export function goalsSummary(goals, ctx) {
  const list = goals || [];
  const active = list.filter((g) => !g.done && !isBacklogGoal(g));
  const backlog = list
    .filter(isBacklogGoal)
    .sort((a, b) => (b.pri ? 1 : 0) - (a.pri ? 1 : 0) || (b.at || 0) - (a.at || 0));
  const archived = list.filter((g) => g.done).sort((a, b) => (b.dAt || 0) - (a.dAt || 0));
  const evals = new Map();
  for (const g of list) evals.set(g.id, evalGoal(g, ctx));

  const actProjects = active.filter((g) => itemKind(g) === 'project');
  const actEvals = actProjects.map((g) => evals.get(g.id));
  const avgPct = actEvals.length ? Math.round(actEvals.reduce((a, x) => a + x.pct, 0) / actEvals.length) : 0;
  const onTrack = actEvals.filter((x) => !x.isBehind).length;
  const needPush = actEvals.filter((x) => x.isBehind).length;
  const pinned = actProjects.filter((g) => g.f);
  const focus = (pinned.length ? pinned : actProjects.slice(0, 2)).slice(0, 3);
  const linkedHabits = new Set(actProjects.filter((g) => g.m === 'habit' && g.src?.kind !== 'salah' && g.src?.k).map((g) => g.src.k));

  const areasList = activeLifeAreas(ctx?.settings);
  const areaIds = new Set(areasList.map((a) => a.id));
  const fallbackId = areasList[0]?.id || 'life';
  const belong = (g) => (g.p && areaIds.has(g.p) ? g.p : fallbackId);
  const areas = areasList.map((area) => {
    const act = active.filter((g) => belong(g) === area.id);
    const bak = backlog.filter((g) => belong(g) === area.id);
    const arc = archived.filter((g) => belong(g) === area.id);
    const actP = act.filter((g) => itemKind(g) === 'project');
    const areaAvg = actP.length ? Math.round(actP.reduce((sum, g) => sum + (evals.get(g.id)?.pct || 0), 0) / actP.length) : null;
    const areaPush = actP.filter((g) => evals.get(g.id)?.isBehind).length;
    return { area, active: act, backlog: bak, archived: arc, avgPct: areaAvg, needPush: areaPush };
  });

  return { active, backlog, archived, focus, evals, avgPct, onTrack, needPush, linkedHabits, areas };
}

/**
 * حالة النظام الكاملة بناءً على الفلتر والربط الموحّد:
 * المجال ← هدف (ليه) ← مشروع (إيه اللي هيحققه — واحد بس شغّال) ← مهمة النهاردة (٣ بالكتير)
 * + العادات تخدم المجال مباشرة (شغّالة / مجمّدة) من غير هدف تحتها.
 */
export function systemState(goals, tasks, settings, ctx = {}) {
  const cfg = normalizeSettings(settings);
  const today = ctx.today || dayKeyAt(new Date(), cfg.dayStart);
  const gsum = goalsSummary(goals, { ...ctx, tasks, today, settings: cfg });
  const list = goals || [];
  const areasList = activeLifeAreas(cfg);
  const areaMap = lifeAreaMap(cfg);
  const areaIds = new Set(areasList.map((a) => a.id));
  const fallbackId = areasList[0]?.id || 'work';
  const resolveArea = (id) => (id && areaIds.has(id) ? id : fallbackId);

  const goalsById = new Map(list.map((g) => [String(g.id), g]));
  const allGoals = list.filter((g) => itemKind(g) === 'goal');
  const allProjects = list.filter((g) => itemKind(g) === 'project');

  const activeProjects = allProjects
    .filter((p) => itemStatus(p) === 'active')
    .sort((a, b) => (b.f ? 1 : 0) - (a.f ? 1 : 0) || (b.at || 0) - (a.at || 0));
  const activeProject = activeProjects[0] || null;
  const extraActiveProjects = activeProjects.slice(1);

  const frozenProjects = allProjects
    .filter((p) => itemStatus(p) === 'frozen')
    .sort((a, b) => (b.pri ? 1 : 0) - (a.pri ? 1 : 0) || (b.at || 0) - (a.at || 0));
  const completedProjects = allProjects
    .filter((p) => itemStatus(p) === 'done')
    .sort((a, b) => (b.dAt || 0) - (a.dAt || 0));

  const activeGoals = allGoals.filter((g) => itemStatus(g) === 'active');
  const frozenGoals = allGoals
    .filter((g) => itemStatus(g) === 'frozen')
    .sort((a, b) => (b.pri ? 1 : 0) - (a.pri ? 1 : 0) || (b.at || 0) - (a.at || 0));
  const completedGoals = allGoals.filter((g) => itemStatus(g) === 'done');

  const allHabits = cfg.habits || [];
  const actHabits = allHabits.filter((h) => h.on !== false);
  const frozenHabits = allHabits.filter((h) => h.on === false);

  const openToday = todayOpenTasks(tasks, today);
  const todayAll = todayTasks(tasks, today, cfg.dayStart);
  const todayDone = todayAll.filter((t) => t.done);
  const frozenTasks = (tasks || [])
    .filter((t) => !t.done && (!t.due || t.due > today))
    .sort((a, b) => (b.pri ? 1 : 0) - (a.pri ? 1 : 0) || (a.at || 0) - (b.at || 0));

  const enrichProject = (proj) => {
    const parentGoal = proj.parentId ? goalsById.get(String(proj.parentId)) || null : null;
    const areaId = resolveArea(proj.p || parentGoal?.p);
    const area = areaMap.get(areaId) || areasList[0] || DEFAULT_LIFE_AREAS[0];
    const ev = gsum.evals.get(proj.id);
    const linkedTasks = (tasks || []).filter((t) => String(t.goalId || '') === String(proj.id));
    const openLinked = linkedTasks.filter((t) => !t.done);
    const nextStep = (Array.isArray(proj.steps) ? proj.steps.find((s) => !s.done)?.t : '') || openLinked[0]?.t || '';
    return { project: proj, goal: parentGoal, area, ev, tasks: linkedTasks, openTasks: openLinked, nextStep };
  };

  const activeChain = activeProject ? enrichProject(activeProject) : null;

  const areas = areasList.map((area) => {
    const aActiveHabits = actHabits.filter((h) => resolveArea(h.g) === area.id);
    const aFrozenHabits = frozenHabits.filter((h) => resolveArea(h.g) === area.id);
    const aGoals = allGoals
      .filter((g) => resolveArea(g.p) === area.id && !g.done)
      .sort((a, b) => (itemStatus(a) === 'active' ? -1 : 1) - (itemStatus(b) === 'active' ? -1 : 1) || (b.at || 0) - (a.at || 0));
    const goalIds = new Set(aGoals.map((g) => String(g.id)));
    const aProjects = allProjects.filter((p) => {
      if (p.done) return false;
      const pid = p.parentId ? String(p.parentId) : '';
      if (pid && goalIds.has(pid)) return true;
      return resolveArea(p.p) === area.id;
    });
    const goalTree = aGoals.map((goal) => {
      const children = aProjects
        .filter((p) => String(p.parentId || '') === String(goal.id))
        .map(enrichProject);
      return { goal, projects: children };
    });
    const standaloneProjects = aProjects
      .filter((p) => !p.parentId || !goalIds.has(String(p.parentId)))
      .map(enrichProject);
    const areaCompleted = completedProjects.filter((p) => resolveArea(p.p) === area.id).map(enrichProject);
    const hasActiveProj = activeChain?.area?.id === area.id;
    const frozenCount = aFrozenHabits.length
      + aGoals.filter((g) => itemStatus(g) === 'frozen').length
      + aProjects.filter((p) => itemStatus(p) === 'frozen').length;
    return {
      area,
      activeHabits: aActiveHabits,
      frozenHabits: aFrozenHabits,
      goals: goalTree,
      standaloneProjects,
      completedProjects: areaCompleted,
      hasActiveProject: hasActiveProj,
      activeProject: hasActiveProj ? activeChain : null,
      frozenCount,
    };
  });

  const frozenTotal = frozenProjects.length + frozenGoals.length + frozenHabits.length + frozenTasks.length;

  return {
    today,
    activeProject,
    activeChain,
    extraActiveProjects: extraActiveProjects.map(enrichProject),
    activeGoals,
    frozenProjects: frozenProjects.map(enrichProject),
    frozenGoals: frozenGoals.map((goal) => ({
      goal,
      area: areaMap.get(resolveArea(goal.p)) || areasList[0] || DEFAULT_LIFE_AREAS[0],
    })),
    frozenHabits: frozenHabits.map((habit) => ({
      habit,
      area: areaMap.get(resolveArea(habit.g)) || areasList[0] || DEFAULT_LIFE_AREAS[0],
    })),
    frozenTasks,
    completedProjects: completedProjects.map(enrichProject),
    completedGoals,
    todayOpen: { list: openToday, count: openToday.length, limit: TODAY_TASK_LIMIT, atLimit: openToday.length >= TODAY_TASK_LIMIT },
    todayDone,
    areas,
    frozenTotal,
    gsum,
    evals: gsum.evals,
  };
}

/** سطور مختصرة لمشروعك الشغّال وأهدافك عشان تتبعت لتقرير الذكاء الاصطناعي. */
export function goalDigestLines(goals, ctx) {
  const list = goals || [];
  const active = list.filter((g) => !g.done && !isBacklogGoal(g) && itemKind(g) === 'project');
  const frozen = list.filter(isBacklogGoal);
  const byId = new Map(list.map((g) => [String(g.id), g]));
  const lines = [];
  if (active.length) {
    lines.push('الأهداف النشطة:');
    for (const g of active.slice(0, 8)) {
      const ev = evalGoal(g, ctx);
      const parent = g.parentId ? byId.get(String(g.parentId)) : null;
      const chain = parent ? ` [${ev.pillar.name} ← ${clip(parent.t, 40)}]` : '';
      const val = ev.isTargetMetric
        ? `${ev.cur ?? '—'} من أصل ${g.start ?? 0} → ${ev.target} ${ev.unit}`.trim()
        : `${ev.cur}/${ev.target}${ev.unit ? ` ${ev.unit}` : ''}`;
      const stateWord = ev.pct >= 100 && !ev.isCap ? 'مكتمل' : ev.isBehind ? 'محتاج دفعة' : 'على المسار';
      lines.push(`- ${clip(g.t, 80)}${g.f ? ' [تركيز]' : ''}${chain}: ${ev.pct}% (${val}، عدّى ${ev.timePct}% من الوقت، ${stateWord})`);
    }
  }
  if (frozen.length) {
    lines.push(`بنك الأهداف (في الانتظار للمراجعة): ${frozen.length} هدف`);
  }
  return lines;
}

function metricText(m, v) {
  if (m.t === 'tri') return ['لسه', 'جزئي', 'تم'][+v || 0];
  if (m.t === 'count' || m.t === 'num') return `${toEn(v)}${m.u ? ` ${m.u}` : ''}`;
  return clip(toEn(v), 80);
}

/** سطر واحد مختصر لليوم: للتقرير الأسبوعي، وللمقارنة بامبارح في التقرير اليومي. */
export function dayLine(key, d = {}, settings) {
  const cfg = normalizeSettings(settings);
  const hs = activeHabits(cfg);
  const p = [];
  const sm = sleepMinutes(d.sleep, d.wake);
  if (sm != null) p.push(`نوم ${hmEn(sm)}`);
  if (has(d.screen)) p.push(`شاشة ${toEn(d.screen)}`);
  if (has(d.mood)) p.push(`مزاج ${d.mood}/5`);
  const es = PERIODS.map(([k]) => +d[`${k}e`] || 0).filter(Boolean);
  if (es.length) p.push(`طاقة ${r1(es.reduce((a, b) => a + b, 0) / es.length)}/5`);
  if (hs.some((h) => has(d[h.k]))) p.push(`عادات ${habitsDone(d, cfg)}/${hs.length}`);
  if (has(d.salah)) p.push(`صلوات ${d.salah}/5`);
  const w = workTotal(d);
  if (w) p.push(`شغل ${r1(w)} ساعة`);
  else if (d.workOff) p.push('شغل: إجازة');
  if (has(d.deep)) p.push(`تركيز عميق ${toEn(d.deep)} ساعة`);
  const e = expTotal(d);
  if (e) p.push(`صرف ${r1(e)} ج`);
  else if (d.noSpend) p.push('صرف 0 ج');
  if (has(d.top)) p.push(`أهم حاجة: ${clip(d.top, 120)}`);
  return `${key} (${weekday(key)}): ${p.length ? p.join('، ') : 'مفيش تسجيل'}`;
}

/** ملخص يوم كامل للتقرير اليومي. */
export function dayDigest(key, d = {}, { prev = null, tasks = [], metrics = [], goals = [], periods = [], days = null, settings = null } = {}) {
  const cfg = normalizeSettings(settings);
  const hs = activeHabits(cfg);
  const tMap = allTimeCatMap(cfg);
  const pers = periodsFor(cfg.dayStart);
  const hours = dayHoursFor(cfg.dayStart);
  const L = [`اليوم: ${weekday(key)} ${key}`];

  // أهداف المستخدم الشخصية عشان التحليل يقارن بيها
  const targets = [`نوم ${cfg.sleepTarget} ساعة`, `شغل ${cfg.workTarget} ساعة`, `تركيز ${cfg.deepTarget} ساعة`, `سقف الشاشة ${cfg.screenLimit} ساعة`];
  if (cfg.budget > 0) targets.push(`ميزانية ${cfg.budget} جنيه`);
  L.push(`أهدافه اليومية: ${targets.join('، ')}`);

  const sleep = [];
  if (has(d.sleep)) sleep.push(`نام ${toEn(d.sleep)}`);
  if (has(d.wake)) sleep.push(`صحي ${toEn(d.wake)}`);
  const sm = sleepMinutes(d.sleep, d.wake);
  if (sm != null) sleep.push(`المدة ${hmEn(sm)}`);
  const sq = SLEEP_QUAL.find(([k]) => k === d.sleepq)?.[1];
  if (sq) sleep.push(`الجودة ${sq}`);
  if (has(d.nap) && +toEn(d.nap) > 0) sleep.push(`قيلولة ${toEn(d.nap)} دقيقة`);
  if (sleep.length) L.push(`النوم: ${sleep.join('، ')}`);

  const phone = [];
  if (has(d.screen)) phone.push(`Screen time ${toEn(d.screen)}`);
  if (has(d.lastuse)) phone.push(`آخر استخدام ${toEn(d.lastuse)}`);
  if (has(d.relm)) phone.push(`وقت بدون موبايل ${toEn(d.relm)} دقيقة`);
  if (phone.length) L.push(`الموبايل: ${phone.join('، ')}`);

  if (has(d.mood) || has(d.moodTag)) {
    const mp = [];
    if (has(d.mood)) mp.push(`${d.mood} من 5`);
    if (has(d.moodTag)) mp.push(clip(d.moodTag, 40));
    L.push(`المزاج: ${mp.join('، ')}`);
  }

  const per = pers.map(([k, l]) => {
    const p = [];
    if (has(d[`${k}e`])) p.push(`طاقة ${d[`${k}e`]} من 5`);
    const h = numOf(d[`${k}h`]);
    if (h) p.push(`${h} ساعة`);
    if (has(d[`${k}t`])) p.push(`عمل: ${clip(d[`${k}t`])}`);
    return p.length ? `- ${l}: ${p.join('، ')}` : '';
  }).filter(Boolean);
  if (per.length) L.push('الفترات:', ...per);

  const tb = timeByCat(d, cfg);
  if (tb.total) {
    L.push(`توزيع الوقت (${tb.total} ساعة): ${tb.rows.map((r) => `${r.name} ${r.hours} ساعة`).join('، ')}`);
    const notes = hours
      .map((h) => [h, d.hrs?.[String(h)]])
      .filter(([, x]) => x && has(x.t))
      .map(([h, x]) => `${h}:00 ${tMap.get(x.c)?.name || ''} (${clip(x.t, 40)})`);
    if (notes.length) L.push(`- تفاصيل الساعات: ${clip(notes.join('، '), 320)}`);
  }
  if (has(d.up)) L.push(`رفع طاقته: ${clip(d.up)}`);
  if (has(d.down)) L.push(`وطّى طاقته: ${clip(d.down)}`);
  if (has(d.unpl)) L.push(`مهام طلعت من غير تخطيط: ${toEn(d.unpl)}`);

  // العادات المفعّلة + أي عادة قديمة متسجلة في اليوم ده
  const legacyLogged = Object.keys(LEGACY_HABIT_LABELS).filter((k) => has(d[k]) && !hs.some((h) => h.k === k));
  const allShown = [...hs.map((h) => [h.k, h.n]), ...legacyLogged.map((k) => [k, LEGACY_HABIT_LABELS[k]])];
  if (allShown.some(([k]) => has(d[k]))) {
    const pick = (v) => allShown.filter(([k]) => (+d[k] || 0) === v).map(([, l]) => l);
    L.push(`العادات: ${allShown.filter(([k]) => d[k] === 2).length} من ${allShown.length} تم`);
    if (pick(2).length) L.push(`- تم: ${pick(2).join('، ')}`);
    if (pick(1).length) L.push(`- جزئي: ${pick(1).join('، ')}`);
    if (pick(0).length) L.push(`- ماتعملتش: ${pick(0).join('، ')}`);
  }
  if (has(d.salah) || has(d.prayers)) {
    const ps = prayersState(d);
    const doneP = PRAYERS.filter(([k]) => ps[k]).map(([, l]) => l);
    const cnt = has(d.prayers) ? doneP.length : +d.salah || 0;
    L.push(`الصلوات في وقتها: ${cnt} من 5${has(d.prayers) && doneP.length ? ` (${doneP.join('، ')})` : ''}`);
  }
  const wkParts = [];
  if (has(d.ext)) wkParts.push(`النوع: ${clip(d.ext, 80)}`);
  if (has(d.exm)) wkParts.push(`${toEn(d.exm)} دقيقة`);
  if (has(d.exn)) wkParts.push(`أرقام: ${clip(toEn(d.exn), 80)}`);
  if (wkParts.length) L.push(`تفاصيل التمرين: ${wkParts.join('، ')}`);

  const nums = HABIT_NUMS.filter(([k]) => k !== 'exm' && k !== 'relm' && has(d[k])).map(([k, l, u]) => `${l} ${toEn(d[k])} ${u}`);
  // أرقام العادات المخصصة
  for (const h of hs) {
    if (h.numK && !HABIT_NUMS.some(([k]) => k === h.numK) && has(d[h.numK])) {
      nums.push(`${h.n} ${toEn(d[h.numK])}${h.numU ? ` ${h.numU}` : ''}`);
    }
  }
  if (has(d.cafl)) nums.push(`آخر كوباية ${toEn(d.cafl)}`);
  if (nums.length) L.push(`تفاصيل العادات: ${nums.join('، ')}`);

  const stLbl = STRESS_OPTS.find(([k]) => k === d.stress)?.[1];
  if (stLbl || has(d.tens)) {
    L.push(`توتر: ${[stLbl, has(d.tens) ? clip(d.tens) : ''].filter(Boolean).join(' — ')}`);
  }
  if (has(d.tired)) L.push(`إرهاق غير معتاد: ${['', 'جزئي', 'آه'][+d.tired || 0]}`);
  if (has(d.learnt)) L.push(`اتعلم: ${clip(d.learnt)}`);

  const work = [1, 2, 3, 4]
    .map((i) => ({ p: clip(d[`w${i}p`], 80), h: numOf(d[`w${i}h`]) || 0, o: clip(d[`w${i}o`]) }))
    .filter((w) => w.p || w.h || w.o);
  if (work.length) {
    L.push(`الشغل: ${r1(work.reduce((a, w) => a + w.h, 0))} ساعة`);
    for (const w of work) L.push(`- ${w.p || 'من غير اسم'}: ${w.h} ساعة${w.o ? `، الناتج: ${w.o}` : ''}`);
  } else if (d.workOff) {
    L.push('الشغل: إجازة النهارده');
  }
  if (has(d.deep)) L.push(`تركيز عميق متواصل: ${toEn(d.deep)} ساعة`);

  if (has(d.exp)) {
    L.push(`الفلوس: صرف ${r1(expTotal(d))} جنيه (${expByCat(d).map(([c, v]) => `${c} ${r1(v)}`).join('، ')})`);
    L.push(`- البنود: ${clip(d.exp.map((e) => `${r1(+e.a || 0)} ${e.w || e.c}`).join('، '), 300)}`);
  } else if (d.noSpend) {
    L.push('الفلوس: ماصرفش النهارده');
  }
  const inc = incomeTotal(d);
  if (inc > 0) {
    const incDetail = (d.inc || []).map((x) => `${r1(+x.a || 0)} ${x.w || x.c || ''}`.trim()).join('، ');
    L.push(`دخل: ${r1(inc)} جنيه${incDetail ? ` (${clip(incDetail, 160)})` : ''}`);
  }

  const how = [{ fast: 'بسرعة', slow: 'بعد تفكير' }[d.decs], { full: 'بمعلومات كاملة', part: 'بمعلومات ناقصة' }[d.deci]].filter(Boolean);
  if (has(d.dec)) L.push(`قرار: ${clip(d.dec)}${how.length ? ` (${how.join('، ')})` : ''}`);
  else if (how.length) L.push(`أخد قرار ${how.join('، ')}`);
  if (has(d.post)) L.push(`أجّل: ${clip(d.post)}${has(d.postw) ? `، وليه: ${clip(d.postw)}` : ''}`);
  if (has(d.top)) L.push(`أهم حاجة حصلت: ${clip(d.top, 400)}`);
  if (has(d.nextp)) L.push(`أولوية بكرة: ${clip(d.nextp, 160)}`);

  const ms = (metrics || []).filter((m) => d.m && has(d.m[m.id])).map((m) => `${m.n}: ${metricText(m, d.m[m.id])}`);
  if (ms.length) L.push(`مقاييسي: ${ms.join('، ')}`);

  const doneT = (tasks || []).filter((t) => t.done && t.dAt && dayKeyAt(t.dAt, cfg.dayStart) === key);
  const openT = (tasks || []).filter((t) => !t.done && t.due && t.due <= key);
  const late = openT.filter((t) => t.due < key).length;
  if (doneT.length || openT.length) {
    const names = doneT.slice(0, 5).map((t) => clip(t.t, 60)).join('، ');
    L.push(`المهام: خلّص ${doneT.length}${names ? ` (${names})` : ''}، ولسه مفتوح ${openT.length}${late ? ` منهم ${late} متأخرة` : ''}`);
  }

  const gDays = days || [{ key, data: d }, ...(prev ? [prev] : [])];
  const pLines = periodGoalDigestLines(periods, { days: gDays, metrics, today: key, settings: cfg });
  if (pLines.length) L.push(...pLines);
  const gLines = goalDigestLines(goals, { days: gDays, tasks, metrics, today: key, settings: cfg });
  if (gLines.length) L.push(...gLines);

  const miss = missingStars(d, cfg).map((s) => s.t);
  if (miss.length) L.push(`مش متسجل: ${miss.join('، ')}`);
  if (prev && logged(prev.data)) L.push(`للمقارنة، امبارح: ${dayLine(prev.key, prev.data, cfg)}`);
  return L.join('\n');
}

/** ملخص آخر ٧ أيام (لحد endKey) للتقرير الأسبوعي. */
export function weekDigest(endKey, days, { tasks = [], metrics = [], goals = [], periods = [], settings = null } = {}) {
  const cfg = normalizeSettings(settings);
  const hs = activeHabits(cfg);
  const tMap = allTimeCatMap(cfg);
  const pers = periodsFor(cfg.dayStart);
  const from = addDays(endKey, -6);
  const by = new Map((days || []).map((x) => [x.key, x.data || {}]));
  const week = Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((k) => [k, by.get(k) || {}]);
  const on = week.filter(([, d]) => logged(d));
  const avg = (xs) => (xs.length ? r1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const L = [`الأسبوع: من ${from} لـ ${endKey}، اتسجل فيه ${on.length} من 7 أيام`];
  L.push(`أهدافه اليومية: نوم ${cfg.sleepTarget} ساعة، شغل ${cfg.workTarget} ساعة، تركيز ${cfg.deepTarget} ساعة، سقف الشاشة ${cfg.screenLimit} ساعة${cfg.budget > 0 ? `، ميزانية ${cfg.budget} جنيه` : ''}`);
  L.push('كل يوم:');
  for (const [k, d] of week) L.push(`- ${dayLine(k, d, cfg)}`);

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

  const pe = pers.map(([k, l]) => [l, avg(pick((d) => (has(d[`${k}e`]) ? +d[`${k}e`] : null)))]).filter(([, v]) => v != null);
  if (pe.length) L.push(`متوسط الطاقة في كل فترة: ${pe.map(([l, v]) => `${l} ${v}/5`).join('، ')}`);

  const wtBy = {};
  let wtTotal = 0;
  for (const d of ds) {
    const tb = timeByCat(d, cfg);
    wtTotal += tb.total;
    for (const r of tb.rows) wtBy[r.id] = (wtBy[r.id] || 0) + r.hours;
  }
  if (wtTotal) {
    const wtRows = Object.entries(wtBy).map(([id, h]) => [tMap.get(id)?.name || id, h]).sort((a, b) => b[1] - a[1]);
    L.push(`توزيع الوقت في الأسبوع (${wtTotal} ساعة): ${wtRows.map(([n, h]) => `${n} ${h} ساعة`).join('، ')}`);
  }

  const allHabitKeys = [...hs.map((h) => [h.k, h.n])];
  for (const [k, l] of Object.entries(LEGACY_HABIT_LABELS)) {
    if (!allHabitKeys.some(([x]) => x === k) && ds.some((d) => has(d[k]))) allHabitKeys.push([k, l]);
  }
  const habitDays = ds.filter((d) => allHabitKeys.some(([k]) => has(d[k])));
  if (habitDays.length) {
    const cnt = allHabitKeys.map(([k, l]) => [l, habitDays.filter((d) => d[k] === 2).length]).sort((a, b) => b[1] - a[1]);
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

  const money = moneySummary(on.map(([key, data]) => ({ key, data })), from, endKey, cfg.budget);
  if (money.spent || money.income) {
    L.push(`الفلوس: صرف ${r1(money.spent)} جنيه${money.cats.length ? ` (${money.cats.map(([c, v]) => `${c} ${r1(v)}`).join('، ')})` : ''}، ودخل ${r1(money.income)}، والصافي ${r1(money.net)}`);
  }

  const doneW = (tasks || []).filter((t) => t.done && t.dAt && dayKeyAt(t.dAt, cfg.dayStart) >= from && dayKeyAt(t.dAt, cfg.dayStart) <= endKey).length;
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

  const posts = ds.filter((d) => has(d.post)).map((d) => `${clip(d.post, 60)}${has(d.postw) ? ` (${clip(d.postw, 40)})` : ''}`);
  if (posts.length) L.push(`أجّل خلال الأسبوع: ${posts.join('، ')}`);
  const decs = ds.filter((d) => d.decs || d.deci);
  if (decs.length) {
    const c = (k, v) => decs.filter((d) => d[k] === v).length;
    L.push(`القرارات: ${c('decs', 'fast')} بسرعة و${c('decs', 'slow')} بعد تفكير، و${c('deci', 'part')} بمعلومات ناقصة`);
  }
  const pLines = periodGoalDigestLines(periods, { days, metrics, today: endKey, settings: cfg });
  if (pLines.length) L.push(...pLines);
  const gLines = goalDigestLines(goals, { days, tasks, metrics, today: endKey, settings: cfg });
  if (gLines.length) L.push(...gLines);

  const highStress = ds.filter((d) => d.stress === 'high').length;
  if (highStress) L.push(`أيام فيها توتر عالي: ${highStress}`);
  const tired = ds.filter((d) => has(d.tired)).length;
  if (tired) L.push(`أيام فيها إرهاق غير معتاد: ${tired}`);
  return L.join('\n');
}

/** نص التقرير → أجزاء للعرض: { h: عنوان } و { ul: [بنود] } و { p: فقرة }. */
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

// ---------- التنبيهات والتفاعل ----------

/** يبني محتوى إشعار «قائمة مهام النهارده» المفتوحة (أو null لو مفيش مهام مفتوحة النهارده). */
export function buildTasksNotification(tasks, today) {
  const open = groupTasks(tasks, today).today;
  if (!open.length) return null;
  const shown = open.slice(0, 5);
  const lines = shown.map((t) => `${t.pri ? '⚑' : '•'} ${t.t}`);
  if (open.length > shown.length) lines.push(`+${fmtNum(open.length - shown.length)} مهام تانية`);
  return {
    count: open.length,
    firstId: open[0].id,
    firstTitle: open[0].t,
    title: `مهام النهارده (${fmtNum(open.length)})`,
    body: lines.join('\n'),
    actions: [
      { action: 'done-task', title: '✓ خلّصت أول مهمة' },
      { action: 'open-tasks', title: 'افتح المهام' },
    ],
  };
}

/** هل الوقت الحالي (HH:MM) داخل نافذة التنبيه بعد الميعاد المطلوب بـ windowMin دقيقة؟ */
export function timeWindowMatch(targetHHMM, nowHHMM, windowMin = 15) {
  if (!HHMM_RE.test(String(targetHHMM || '')) || !HHMM_RE.test(String(nowHHMM || ''))) return false;
  const toM = (s) => (+s.slice(0, 2)) * 60 + (+s.slice(3, 5));
  const diff = (toM(nowHHMM) - toM(targetHHMM) + 1440) % 1440;
  return diff >= 0 && diff < windowMin;
}

/** التنبيهات المستحقة دلوقتي لمستخدم واحد (العادات الناقصة + ملخص الصبح + قفلة اليوم). */
export function dueReminders({ settings, day = {}, tasks = [], today, nowHHMM, sent = new Set(), windowMin = 15 }) {
  const cfg = normalizeSettings(settings);
  const out = [];
  const openTasks = groupTasks(tasks, today).today;
  const badgeCount = openTasks.length;

  // ١. تنبيهات العادات اللي جه وقتها ولسه ماتسجلتش النهارده
  for (const h of activeHabits(cfg)) {
    if (!h.rem || !timeWindowMatch(h.rem, nowHHMM, windowMin)) continue;
    const key = `habit:${h.k}`;
    if (sent.has(key) || +day[h.k] > 0) continue;
    out.push({
      key,
      payload: {
        kind: 'habit',
        k: h.k,
        today,
        badgeCount,
        title: `وقت ${h.n}`,
        body: 'لسه ماتسجلتش النهارده — تقدر تعلّمها من هنا على طول.',
        tag: `habit-${h.k}`,
        url: './?open=day',
        actions: [
          { action: 'done-habit', title: '✓ عملتها' },
          { action: 'open-app', title: 'افتح اليوم' },
        ],
      },
    });
  }

  // ٢. ملخص الصبح بالمهام
  if (cfg.notify.morning && timeWindowMatch(cfg.notify.morning, nowHHMM, windowMin) && !sent.has('morning')) {
    const tn = buildTasksNotification(tasks, today);
    out.push({
      key: 'morning',
      payload: tn
        ? {
            kind: 'tasks',
            today,
            badgeCount,
            firstId: tn.firstId,
            title: tn.title,
            body: tn.body,
            tag: 'today-tasks',
            url: './?open=tasks',
            actions: tn.actions,
          }
        : {
            kind: 'morning',
            today,
            badgeCount: 0,
            title: 'صباح الخير · ورقة اليوم',
            body: 'مفيش مهام متسجلة للنهارده لسه — ضيف أهم حاجة تبدأ بيها يومك.',
            tag: 'morning-empty',
            url: './?open=newtask',
            actions: [{ action: 'open-newtask', title: '+ مهمة جديدة' }],
          },
    });
  }

  // ٣. تذكير قفلة اليوم (العادات والمهام المتبقية)
  if (cfg.notify.evening && timeWindowMatch(cfg.notify.evening, nowHHMM, windowMin) && !sent.has('evening')) {
    const leftHabits = activeHabits(cfg).filter((h) => !(+day[h.k] > 0));
    let body = '';
    if (!leftHabits.length && !openTasks.length) {
      body = 'عاش! خلّصت كل عاداتك ومهامك النهارده — فاضل بس تقفل يومك في ورقة اليوم.';
    } else {
      const parts = [];
      if (leftHabits.length) {
        const names = leftHabits.slice(0, 3).map((h) => h.n).join('، ');
        parts.push(`${fmtNum(leftHabits.length)} عادات (${names}${leftHabits.length > 3 ? '…' : ''})`);
      }
      if (openTasks.length) parts.push(`${fmtNum(openTasks.length)} مهام مفتوحة`);
      body = `باقي ${parts.join(' و')} — خلّص اللي تقدر عليه وقفل ورقتك.`;
    }
    out.push({
      key: 'evening',
      payload: {
        kind: 'evening',
        today,
        badgeCount,
        title: 'قفلة اليوم · ورقة اليوم',
        body,
        tag: 'evening-wrap',
        url: './?open=day',
        actions: [
          ...(openTasks.length ? [{ action: 'open-tasks', title: 'افتح المهام' }] : []),
          { action: 'open-app', title: 'افتح اليوم' },
        ],
      },
    });
  }

  return out;
}
