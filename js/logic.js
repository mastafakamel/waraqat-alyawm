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
      if (k === 'm' && v && typeof v === 'object' && data.m && typeof data.m === 'object') {
        data.m = newer ? { ...data.m, ...v } : { ...v, ...data.m };
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
  const ok = (d) => d && typeof d.id === 'string' && /^(day\/\d{4}-\d{2}-\d{2}|list\/(tasks|ideas|metrics|periods))$/.test(d.id) && d.data && typeof d.data === 'object';
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

const HABIT_NUMS = [
  ['wirdp', 'الورد', 'صفحة'], ['exm', 'تمرين', 'دقيقة'], ['engm', 'إنجليزي', 'دقيقة'], ['readp', 'قراءة', 'صفحة'],
  ['techm', 'تعلم تقني', 'دقيقة'], ['caf', 'قهوة/شاي', 'كوباية'], ['relm', 'وقت من غير موبايل', 'دقيقة'],
];

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
export function dayDigest(key, d = {}, { prev = null, tasks = [], metrics = [] } = {}) {
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

  const doneT = (tasks || []).filter((t) => t.done && t.dAt && keyOf(new Date(t.dAt)) === key);
  const openT = (tasks || []).filter((t) => !t.done && t.due && t.due <= key);
  const late = openT.filter((t) => t.due < key).length;
  if (doneT.length || openT.length) {
    const names = doneT.slice(0, 5).map((t) => clip(t.t, 60)).join('، ');
    L.push(`المهام: خلّص ${doneT.length}${names ? ` (${names})` : ''}، ولسه مفتوح ${openT.length}${late ? ` منهم ${late} متأخرة` : ''}`);
  }

  const miss = missingStars(d).map((s) => s.t);
  if (miss.length) L.push(`مش متسجل: ${miss.join('، ')}`);
  if (prev && logged(prev.data)) L.push(`للمقارنة، امبارح: ${dayLine(prev.key, prev.data)}`);
  return L.join('\n');
}

/**
 * ملخص آخر ٧ أيام (لحد endKey) للتقرير الأسبوعي: سطر لكل يوم، ومتوسطات، والعادات، والفلوس، والمهام.
 * days = [{ key, data }]
 */
export function weekDigest(endKey, days, { tasks = [], metrics = [] } = {}) {
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

  const doneW = (tasks || []).filter((t) => t.done && t.dAt && keyOf(new Date(t.dAt)) >= from && keyOf(new Date(t.dAt)) <= endKey).length;
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
