// اختبارات logic.js — شغّلها بـ: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toEn, arDigits, fmtNum, readNumber, addDays, periodIndex, sleepMinutes, fmtHM, fmt12,
  cycleTri, rateTap, rateSet, parseExpense, starCount, missingStars, itemsWord, todayTasks, mergeLine,
  habitsDone, workTotal, expTotal, expByCat, dayRel, lineTarget, uid,
  groupTasks, isOverdue, sortIdeas, searchIdeas, normAr, shortDate, moneySummary, longDate, periodPhase,
  periodOf, periodDay, newPeriod, periodLabel, summaryStart, metricVisible, groupMetrics, metricDesc, metricValue, metricAreas,
  mergeDoc, parseBackup, takeRemote, useQuota, dayLine, dayDigest, weekDigest, reportBlocks, dayKeyAt,
  weekKeys, satWeekKeys, weekNumber, HABITS, HABIT_GROUPS, habitGroupStats,
  dayStatus, dayProgress, starSplit, dayNums, avgOf, baselineFor, compareTo, fmtDiff,
  suggestTimes, lastWith, readDuration, recentValues,
  fmtHour, hourSpan, hoursWord, fmtHours, timeByCat, sleepHourList, sleepHoursSplit,
  goalRange, goalTimeProgress, evalGoal, goalsSummary, goalDigestLines,
  DEFAULT_LIFE_AREAS, TODAY_TASK_LIMIT, activeLifeAreas, lifeAreaMap, isBacklogGoal, backlogAgeText, periodReviewState,
  itemKind, itemStatus, todayOpenTasks, canAddTodayTask, systemState, activeHabitGroups,
  DEFAULT_SETTINGS, normalizeSettings, periodsFor, periodHoursFor,
  prayersState, togglePrayer, guessExpCat, incomeTotal, evalPeriodGoal, periodGoalDigestLines,
} from '../js/logic.js';

test('الأرقام العربي والإنجليزي بتتحول قبل الحفظ', () => {
  assert.equal(toEn('١٢٫٥'), '12.5');
  assert.equal(toEn('۱۲۳'), '123');
  assert.equal(toEn('1,250'), '1250');
  assert.equal(toEn('2,5'), '2.5');
  assert.equal(readNumber('٣٠'), 30);
  assert.equal(readNumber('abc'), '');
  assert.equal(readNumber(''), '');
  assert.equal(arDigits('7:10'), '٧:١٠');
  assert.equal(fmtNum(5.5), '٥٫٥');
  assert.equal(fmtNum(105), '١٠٥');
});

test('المصروف: أول رقم مبلغ، والباقي وصف من غير ج أو جنيه', () => {
  assert.deepEqual(parseExpense('٧٥ غدا'), { a: 75, w: 'غدا' });
  assert.deepEqual(parseExpense('أوبر 30 ج'), { a: 30, w: 'أوبر' });
  assert.deepEqual(parseExpense('١٢٠ جنيه بنزين'), { a: 120, w: 'بنزين' });
  assert.deepEqual(parseExpense('قهوة ٢٢٫٥'), { a: 22.5, w: 'قهوة' });
  assert.deepEqual(parseExpense('50ج'), { a: 50, w: '' });
  assert.deepEqual(parseExpense('حجز ٢٠٠'), { a: 200, w: 'حجز' }); // "حجز" فيها ج ومتتشالش
  assert.equal(parseExpense('غدا'), null);
  assert.equal(parseExpense('٠ غدا'), null);
});

test('سطر لليوم بيروح للفترة حسب الساعة', () => {
  assert.equal(periodIndex(4), 0);
  assert.equal(periodIndex(11), 0);
  assert.equal(periodIndex(12), 1);
  assert.equal(periodIndex(16), 1);
  assert.equal(periodIndex(17), 2);
  assert.equal(periodIndex(19), 2); // ٧ بالليل → بعد المغرب
  assert.equal(periodIndex(21), 3);
  assert.equal(periodIndex(1), 3);
  assert.equal(periodIndex(3), 3);
});

test('النوم من ١٢:٤٠ لـ ٧:٥٠ = ٧:١٠', () => {
  const m = sleepMinutes('00:40', '07:50');
  assert.equal(m, 430);
  assert.equal(fmtHM(m), '٧:١٠');
  assert.equal(sleepMinutes('23:30', '06:00'), 390);
  assert.equal(sleepMinutes('٠٠:٤٠', '٠٧:٥٠'), 430);
  assert.equal(sleepMinutes('', '07:50'), null);
  assert.equal(fmt12('00:40'), '١٢:٤٠');
  assert.equal(fmt12('19:05'), '٧:٠٥');
});

test('العادة بتلف على ٣ حالات: فاضية ← تم ← جزئي ← فاضية', () => {
  assert.equal(cycleTri(undefined), 2);
  assert.equal(cycleTri(0), 2);
  assert.equal(cycleTri(2), 1);
  assert.equal(cycleTri(1), 0);
});

test('العدد من ٥ (الصلوات): رقم جديد بيختار لحده، ونفس الرقم بيقلّل واحد', () => {
  assert.equal(rateTap(0, 4), 4);
  assert.equal(rateTap(4, 2), 2);
  assert.equal(rateTap(4, 4), 3);
  assert.equal(rateTap(1, 1), 0);
});

test('التقييم (المزاج والطاقة): المختار رقم واحد، ونفس الرقم تاني بيمسحه', () => {
  assert.equal(rateSet(0, 4), 4);
  assert.equal(rateSet(undefined, 3), 3);
  assert.equal(rateSet(4, 2), 2);
  assert.equal(rateSet(4, 4), ''); // '' = المفتاح بيتشال من اليوم (setK)
});

test('عداد ★ من ٨', () => {
  assert.equal(starCount({}), 0);
  const day = {
    sleep: '00:40', wake: '07:50', screen: '4:20', mood: 4, fajr: 2,
    w1p: 'ورقة اليوم', w1h: '3.5', exp: [{ a: 75, w: 'غدا', c: 'أكل' }],
  };
  assert.equal(starCount(day), 6);
  assert.deepEqual(missingStars(day).map((s) => s.k), ['post', 'top']);
  assert.equal(starCount({ ...day, post: 'مكالمة', top: 'خلصت' }), 8);
  assert.equal(starCount({ income: 500 }), 1);
  assert.equal(starCount({ salah: 3 }), 1);
  assert.equal(starCount({ mood: 0, post: '   ' }), 0);
});

test('العادات والشغل والفلوس', () => {
  assert.equal(habitsDone({ wird: 2, azkm: 1, eng: 2, selfcare: 2 }), 3);
  assert.equal(workTotal({ w1p: 'أ', w1h: '٣٫٥', w2p: 'ب', w2h: '2' }), 5.5);
  const d = { exp: [{ a: 30, w: 'أوبر', c: 'مواصلات' }, { a: 75, w: 'غدا', c: 'أكل' }] };
  assert.equal(expTotal(d), 105);
  assert.deepEqual(expByCat(d), [['أكل', 75], ['مواصلات', 30]]);
});

test('مهام النهارده: المفتوحة لحد النهارده + اللي خلصت النهارده', () => {
  const today = '2026-11-20';
  const doneToday = new Date('2026-11-20T10:00:00').getTime();
  const doneBefore = new Date('2026-11-19T10:00:00').getTime();
  const tasks = [
    { id: 'a', due: '2026-11-20', done: false },
    { id: 'b', due: '2026-11-18', done: false },
    { id: 'c', due: '', done: false },
    { id: 'd', due: '2026-11-20', done: true, dAt: doneToday },
    { id: 'e', due: '2026-11-19', done: true, dAt: doneBefore },
    { id: 'f', due: '2026-11-21', done: false },
  ];
  assert.deepEqual(todayTasks(tasks, today).map((t) => t.id), ['a', 'b', 'd']);
  // مهمة خلصت ١:٣٠ بالليل (تاريخ ٢١) لسه من مهام يوم ٢٠، لأن اليوم بيبدأ ٤ الفجر
  const lateNight = new Date('2026-11-21T01:30:00').getTime();
  assert.deepEqual(todayTasks([{ id: 'g', due: '2026-11-20', done: true, dAt: lateNight }], today).map((t) => t.id), ['g']);
});

test('اليوم بيبدأ ٤ الفجر، مش ١٢ بالليل', () => {
  assert.equal(dayKeyAt(new Date('2026-11-21T01:40:00')), '2026-11-20');
  assert.equal(dayKeyAt(new Date('2026-11-21T03:59:00')), '2026-11-20');
  assert.equal(dayKeyAt(new Date('2026-11-21T04:00:00')), '2026-11-21');
  assert.equal(dayKeyAt(new Date('2026-11-21T23:59:00')), '2026-11-21');
  assert.equal(dayKeyAt(new Date('2026-12-01T00:30:00')), '2026-11-30'); // أول الشهر
  assert.equal(dayKeyAt(new Date('2027-01-01T02:00:00')), '2026-12-31'); // أول السنة
  assert.equal(dayKeyAt(new Date('2026-11-21T01:40:00').getTime()), '2026-11-20'); // timestamp كمان
  // الساعة ١:٤٠ في اليوم المنطقي: الفترات الأولى فاتت، و"قبل النوم" دلوقتي (مش فترات السبت اللي لسه ماحصلتش)
  assert.deepEqual([0, 1, 2, 3].map((i) => periodPhase(i, '2026-11-20', dayKeyAt(new Date('2026-11-21T01:40:00')), 1)), ['past', 'past', 'past', 'now']);
});

test('"سطر لليوم" الساعة ٧ بالليل بيروح لـ "بعد المغرب"', () => {
  assert.deepEqual(lineTarget(19), { key: 'p3t', label: 'بعد المغرب' });
  assert.deepEqual(lineTarget(9), { key: 'p1t', label: 'بعد الفجر' });
  assert.deepEqual(lineTarget(14), { key: 'p2t', label: 'بعد الضهر' });
  assert.deepEqual(lineTarget(23), { key: 'p4t', label: 'قبل النوم' });
  assert.deepEqual(lineTarget(2), { key: 'p4t', label: 'قبل النوم' });
});

test('uid مش بيتكرر', () => {
  const ids = new Set(Array.from({ length: 500 }, uid));
  assert.equal(ids.size, 500);
});

test('حاجات صغيرة: الكلام والتواريخ والسطر', () => {
  assert.equal(itemsWord(1), 'بند واحد');
  assert.equal(itemsWord(2), 'بندين');
  assert.equal(itemsWord(5), '٥ بنود');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-11-20', -1), '2026-11-19');
  assert.equal(dayRel('2026-11-19', '2026-11-20'), 'يوم فات');
  assert.equal(mergeLine('', 'مشوار'), 'مشوار');
  assert.equal(mergeLine('مشوار', 'شغل'), 'مشوار · شغل');
});

test('تبويبة المهام: النهارده وبعدين وخلصت، والمهم الأول وبعدين الأقدم', () => {
  const today = '2026-11-20';
  const tasks = [
    { id: 'a', due: '2026-11-20', done: false, pri: false, at: 1 },
    { id: 'b', due: '2026-11-18', done: false, pri: false, at: 5 },
    { id: 'c', due: '2026-11-20', done: false, pri: true, at: 9 },
    { id: 'd', due: '', done: false, pri: false, at: 2 },
    { id: 'e', due: '2026-11-25', done: false, pri: true, at: 3 },
    { id: 'f', due: '2026-11-20', done: true, dAt: 100, at: 4 },
    { id: 'g', due: '', done: true, dAt: 200, at: 6 },
  ];
  const g = groupTasks(tasks, today);
  assert.deepEqual(g.today.map((t) => t.id), ['c', 'a', 'b']);
  assert.deepEqual(g.later.map((t) => t.id), ['e', 'd']);
  assert.deepEqual(g.done.map((t) => t.id), ['g', 'f']);
  assert.equal(isOverdue(tasks[1], today), true);
  assert.equal(isOverdue(tasks[0], today), false);
  assert.equal(isOverdue({ due: '2026-11-18', done: true }, today), false);
  assert.equal(isOverdue({ due: '' }, today), false);
  // "خلصت" بتعرض آخر ٣٠ بس
  const many = Array.from({ length: 40 }, (_, i) => ({ id: `x${i}`, done: true, dAt: i }));
  const d = groupTasks(many, today).done;
  assert.equal(d.length, 30);
  assert.equal(d[0].id, 'x39');
});

test('الأفكار: المثبت الأول وبعدين الأحدث، والبحث في النص والتصنيف', () => {
  const ideas = [
    { id: 1, t: 'محل في إسكندرية', c: 'مشروع', pin: false, at: 1 },
    { id: 2, t: 'كورس SQL', c: 'تعلم', pin: true, at: 2 },
    { id: 3, t: 'أكلم أحمد', c: 'شخصي', pin: false, at: 3 },
  ];
  assert.deepEqual(sortIdeas(ideas).map((i) => i.id), [2, 3, 1]);
  assert.deepEqual(searchIdeas(ideas, 'اسكندريه').map((i) => i.id), [1]);
  assert.deepEqual(searchIdeas(ideas, 'تعلم').map((i) => i.id), [2]);
  assert.deepEqual(searchIdeas(ideas, 'sql').map((i) => i.id), [2]);
  assert.equal(searchIdeas(ideas, '  ').length, 3);
  assert.equal(normAr('أَحْمَد'), 'احمد');
  assert.equal(shortDate('2026-11-18'), '١٨ نوف');
  assert.equal(shortDate(new Date('2026-12-03T09:00:00').getTime()), '٣ ديس');
  assert.equal(longDate('2026-11-20'), '٢٠ نوفمبر');
});

test('الفلوس من أول الفترة لحد النهارده', () => {
  const days = [
    { key: '2026-11-19', data: { exp: [{ a: 999, c: 'أكل' }], income: 999 } }, // قبل الفترة
    { key: '2026-11-20', data: { exp: [{ a: 75, c: 'أكل' }, { a: 30, c: 'مواصلات' }], income: '٥٠٠' } },
    { key: '2026-11-21', data: { exp: [{ a: 120, c: 'مواصلات' }, { a: 20, c: 'أكل' }] } },
    { key: '2026-11-22', data: { exp: [{ a: 50, c: 'بيت' }] } }, // بعد النهارده
  ];
  const s = moneySummary(days, '2026-11-20', '2026-11-21', 500);
  assert.equal(s.spent, 245);
  assert.equal(s.income, 500);
  assert.equal(s.net, 255);
  assert.equal(s.remaining, 255);
  assert.deepEqual(s.cats, [['مواصلات', 150], ['أكل', 95]]);
  const empty = moneySummary([], '2026-11-20', '2026-11-21');
  assert.equal(empty.spent, 0);
  assert.equal(empty.income, 0);
  assert.deepEqual(empty.cats, []);
});

test('خط اليوم: كل فترة فاتت ولا دلوقتي ولا لسه', () => {
  const t = '2026-11-20';
  // الساعة ٧ بالليل: بعد المغرب دلوقتي، وقبل النوم لسه، والفترتين الأولانيين فاتوا
  assert.deepEqual([0, 1, 2, 3].map((i) => periodPhase(i, t, t, 19)), ['past', 'past', 'now', 'future']);
  // ٢ بالليل: لسه "قبل النوم"
  assert.deepEqual([0, 1, 2, 3].map((i) => periodPhase(i, t, t, 2)), ['past', 'past', 'past', 'now']);
  assert.equal(periodPhase(3, '2026-11-19', t, 9), 'past'); // يوم فات
  assert.equal(periodPhase(0, '2026-11-21', t, 9), 'future'); // يوم جاي
});

test('الفترات: يوم كام من كام، والفترة الجديدة ١١ يوم، وبداية ملخص الفلوس', () => {
  const p = { id: 'x', from: '2026-11-20', to: '2026-11-30' };
  assert.equal(periodOf([p], '2026-11-22'), p);
  assert.equal(periodOf([p], '2026-12-01'), null);
  assert.deepEqual(periodDay(p, '2026-11-22'), { n: 3, of: 11 });
  assert.equal(periodDay(null, '2026-11-22'), null);
  const np = newPeriod('2026-11-28');
  assert.equal(np.from, '2026-11-28');
  assert.equal(np.to, '2026-12-08');
  assert.equal(periodLabel(p), '٢٠ – ٣٠ نوفمبر');
  assert.equal(periodLabel(np), '٢٨ نوفمبر – ٨ ديسمبر');
  assert.deepEqual(summaryStart([p], '2026-11-25'), { from: '2026-11-20', to: '2026-11-30', title: 'من ٢٠ نوفمبر لحد دلوقتي' });
  assert.deepEqual(summaryStart([], '2026-11-25'), { from: '2026-11-01', to: '', title: 'من أول الشهر لحد دلوقتي' });
});

test('مقاييسي: يبان إمتى، والتجميع بالمجال، والوصف والقيمة', () => {
  const t = '2026-11-20';
  const night = { id: 'a', n: 'خطوات', t: 'num', a: 'الصحة', w: 'p4', on: true };
  const all = { id: 'b', n: 'مية', t: 'count', u: 'كوباية', a: 'الصحة', w: 'day', on: true };
  const off = { id: 'c', n: 'سوشيال', t: 'num', a: 'الموبايل والسوشيال', w: 'day', on: false };
  // الساعة ٧ بالليل: "قبل النوم" لسه ماجاش، فالخطوات مستخبية. والمقفول مستخبي دايماً
  assert.equal(metricVisible(night, t, t, 19), false);
  assert.equal(metricVisible(night, t, t, 22), true);
  assert.equal(metricVisible(night, '2026-11-19', t, 9), true); // يوم فات: كله باين
  assert.equal(metricVisible(all, t, t, 9), true);
  assert.equal(metricVisible(off, t, t, 9), false);
  const biz = { id: 'd', n: 'مكالمات', t: 'count', a: 'الشغل والبيزنس', w: 'day', on: true };
  const own = { id: 'e', n: 'ورد', t: 'tri', a: 'الدين', w: 'p1', on: true };
  assert.deepEqual(groupMetrics([night, own, biz, all]).map(([a, ms]) => [a, ms.map((m) => m.id)]), [['الشغل والبيزنس', ['d']], ['الصحة', ['a', 'b']], ['الدين', ['e']]]);
  assert.deepEqual(metricAreas([own]), ['الشغل والبيزنس', 'الصحة', 'التعلم', 'شخصي', 'الدين']);
  assert.equal(metricDesc(all), 'عدّاد بالكوباية، طول اليوم');
  assert.equal(metricDesc(night), 'رقم، قبل النوم');
  assert.equal(metricDesc(off), 'رقم، طول اليوم، مقفول');
  // الفاضي مش صفر (DESIGN.md نسخة ٢): العدّاد اللي ماتسجلش بيرجع '' والواجهة بتكتب "—". والصفر بيبان بس لو اتسجل صفر.
  // (كان '٠'، واتغيّر عمداً في دفعة لغة العلامات.)
  assert.equal(metricValue(all, undefined), '');
  assert.equal(metricValue(all, 0), '٠');
  assert.equal(metricValue({ t: 'tri' }, 0), '');
  assert.equal(metricValue({ t: 'tri' }, 1), 'جزئي');
  assert.equal(metricValue(all, 5), '٥');
  assert.equal(metricValue(night, ''), '');
  assert.equal(metricValue({ t: 'num' }, 78.4), '٧٨٫٤');
  assert.equal(metricValue({ t: 'tri' }, 2), 'تم');
  assert.equal(metricValue({ t: 'time' }, '13:30'), '١٣:٣٠');
});

test('الاستيراد بيدمج ومابيمسحش: الأيام بالمفاتيح، والقوايم بالـ id، والأحدث يكسب', () => {
  const local = { updatedAt: 200, data: { mood: 4, post: 'محلي', m: { a: 1 } } };
  const older = { updatedAt: 100, data: { mood: 2, top: 'من الملف', m: { a: 9, b: 3 } } };
  const r1 = mergeDoc('day/2026-11-20', local, older);
  assert.deepEqual(r1.data, { mood: 4, post: 'محلي', top: 'من الملف', m: { a: 1, b: 3 } }); // المحلي أحدث: مفاتيحه تكسب
  assert.equal(r1.changed, true);
  const newer = { updatedAt: 300, data: { mood: 5, m: { a: 7 } } };
  assert.deepEqual(mergeDoc('day/2026-11-20', local, newer).data, { mood: 5, post: 'محلي', m: { a: 7 } });
  assert.deepEqual(mergeDoc('day/2026-11-20', null, older), { data: older.data, changed: true });
  assert.equal(mergeDoc('day/2026-11-20', local, { data: null }), null);
  assert.equal(mergeDoc('day/2026-11-20', local, { updatedAt: 1, data: { mood: 1 } }).changed, false); // مفيش جديد
  const lt = { updatedAt: 200, data: { items: [{ id: 'x', t: 'محلي' }, { id: 'y', t: 'واي' }] } };
  const it = { updatedAt: 300, data: { items: [{ id: 'x', t: 'من الملف' }, { id: 'z', t: 'جديد' }] } };
  assert.deepEqual(mergeDoc('list/tasks', lt, it).data.items.map((x) => `${x.id}:${x.t}`), ['x:من الملف', 'y:واي', 'z:جديد']);
});

test('ملف النسخة الاحتياطية: بيقبل ملفنا بس، وبيشيل أي مستند غريب', () => {
  const ok = JSON.stringify({ app: 'waraqat-alyawm', v: 1, docs: [
    { id: 'day/2026-11-20', data: { mood: 4 }, updatedAt: 1 },
    { id: 'list/tasks', data: { items: [] }, updatedAt: 1 },
    { id: 'local/session', data: { token: 'x' } }, // ده مايتستوردش أبداً
    { id: 'day/../x', data: {} },
  ] });
  assert.deepEqual(parseBackup(ok).map((d) => d.id), ['day/2026-11-20', 'list/tasks']);
  assert.throws(() => parseBackup('مش json'), /مش JSON/);
  assert.throws(() => parseBackup('{"docs":[]}'), /مش نسخة/);
});

test('المزامنة: الأحدث يكسب، وحد الاستخدام في اليوم', () => {
  assert.equal(takeRemote(null, { updated_at: 5 }), true);
  assert.equal(takeRemote({ updatedAt: 10 }, { updated_at: 5 }), false);
  assert.equal(takeRemote({ updatedAt: 10 }, { updated_at: 11 }), true);
  let q = useQuota(undefined, '2026-11-20', 2);
  assert.deepEqual(q, { ok: true, meta: { day: '2026-11-20', n: 1 } });
  q = useQuota(q.meta, '2026-11-20', 2);
  assert.equal(q.ok, true);
  q = useQuota(q.meta, '2026-11-20', 2);
  assert.equal(q.ok, false); // وصل للحد
  assert.deepEqual(useQuota(q.meta, '2026-11-21', 2), { ok: true, meta: { day: '2026-11-21', n: 1 } }); // يوم جديد
});

// ---------- تقرير الذكاء الاصطناعي ----------
test('ملخص اليوم: اللي اتسجل بس، وبأرقام إنجليزي، والناقص مكتوب', () => {
  const d = {
    sleep: '01:10', wake: '08:30', screen: '٥:٣٠', mood: 3, p1e: 4, p1t: 'ذاكرت', p1h: '٢', fajr: 2, wird: 1,
    salah: 4, w1p: 'الأسواف', w1h: '٣', w1o: 'صفحة الأسعار', exp: [{ a: 75, w: 'غدا', c: 'أكل' }], decs: 'slow', deci: 'part',
    m: { k1: 3 }, ai: { t: 'تقرير قديم', at: 1 },
  };
  const tasks = [
    { id: 1, t: 'ابعت الفاتورة', done: true, dAt: new Date('2026-11-20T15:00:00').getTime() },
    { id: 2, t: 'مكالمة', done: false, due: '2026-11-18' },
  ];
  const metrics = [{ id: 'k1', n: 'مية', t: 'count', u: 'كوباية', on: true }];
  const prev = { key: '2026-11-19', data: { mood: 2, top: 'يوم تقيل' } };
  const t = dayDigest('2026-11-20', d, { prev, tasks, metrics });
  assert.match(t, /النوم: نام 01:10، صحي 08:30، المدة 7:20/);
  assert.match(t, /Screen time 5:30/); // الأرقام العربي بقت إنجليزي
  assert.match(t, /- بعد الفجر: طاقة 4 من 5، 2 ساعة، عمل: ذاكرت/);
  assert.match(t, /- تم: الفجر/);
  assert.match(t, /- جزئي: الورد/);
  assert.match(t, /- الأسواف: 3 ساعة، الناتج: صفحة الأسعار/);
  assert.match(t, /صرف 75 جنيه \(أكل 75\)/);
  assert.match(t, /أخد قرار بعد تفكير، بمعلومات ناقصة/);
  assert.match(t, /مقاييسي: مية: 3 كوباية/);
  assert.match(t, /المهام: خلّص 1 \(ابعت الفاتورة\)، ولسه مفتوح 1 منهم 1 متأخرة/);
  assert.match(t, /مش متسجل: قرار وتأجيل، أهم حاجة/);
  assert.match(t, /امبارح: 2026-11-19 .*مزاج 2\/5/);
  assert.doesNotMatch(t, /تقرير قديم/); // التقرير القديم مابيتبعتش تاني
  assert.doesNotMatch(t, /دخل|توتر|رفع طاقته/); // الفاضي مابيتكتبش
});

test('ملخص اليوم: الكلام الطويل بيتقص', () => {
  const t = dayDigest('2026-11-20', { top: 'ا'.repeat(1000) });
  const line = t.split('\n').find((l) => l.startsWith('أهم حاجة'));
  assert.ok(line.length < 420);
  assert.ok(line.endsWith('…'));
});

test('سطر اليوم: مختصر، ولو مفيش حاجة بيقول كده', () => {
  assert.match(dayLine('2026-11-20', { sleep: '23:00', wake: '07:00', p1e: 4, p2e: 2, w1h: '2.5' }), /نوم 8:00، طاقة 3\/5، شغل 2.5 ساعة/);
  assert.match(dayLine('2026-11-21', {}), /مفيش تسجيل$/);
});

test('ملخص الأسبوع: ٧ أيام، ومتوسطات للأيام اللي اتسجلت بس', () => {
  const days = [
    { key: '2026-11-14', data: { mood: 5 } }, // برّه الأسبوع
    { key: '2026-11-15', data: { sleep: '23:00', wake: '07:00', mood: 4, fajr: 2, exp: [{ a: 100, c: 'أكل' }], w1p: 'أ', w1h: '3' } },
    { key: '2026-11-17', data: { sleep: '00:00', wake: '06:00', mood: 2, fajr: 2, wird: 2, post: 'الجيم', decs: 'fast' } },
    { key: '2026-11-21', data: { ai: { t: 'x' } } }, // تقرير بس = مش متسجل
  ];
  const tasks = [{ id: 1, t: 'x', done: true, dAt: new Date('2026-11-16T10:00:00').getTime() }, { id: 2, t: 'y', done: false, due: '2026-11-10' }];
  const t = weekDigest('2026-11-21', days, { tasks });
  assert.match(t, /من 2026-11-15 لـ 2026-11-21، اتسجل فيه 2 من 7 أيام/);
  assert.equal(t.split('\n').filter((l) => /^- 2026-11-/.test(l)).length, 7);
  assert.match(t, /نوم 7:00، مزاج 3\/5/);
  assert.match(t, /العادات \(عدد أيام التمام من 2\): الفجر 2، الورد 1/);
  assert.match(t, /الشغل: 3 ساعة \(أ 3\)/);
  assert.match(t, /الفلوس: صرف 100 جنيه \(أكل 100\)/);
  assert.match(t, /المهام: خلّص 1 في الأسبوع، و1 متأخرة دلوقتي/);
  assert.match(t, /أجّل خلال الأسبوع: الجيم/);
  assert.doesNotMatch(t, /مزاج 5/); // اليوم اللي برّه الأسبوع مادخلش
});

test('نص التقرير بيتقسم لعناوين وبنود وفقرات', () => {
  const b = reportBlocks('**اليوم في سطرين:**\nيوم كويس.\n\n- نمت بدري\n- خلصت المهام\n## خطوة لبكرة:\nنام قبل ١٢');
  assert.deepEqual(b, [
    { h: 'اليوم في سطرين' }, { p: 'يوم كويس.' }, { ul: ['نمت بدري', 'خلصت المهام'] }, { h: 'خطوة لبكرة' }, { p: 'نام قبل ١٢' },
  ]);
});

// ---------- ملخص النهارده والأسبوع (إعادة التصميم، الدفعة ٤) ----------
const FULL_DAY = { sleep: '00:15', wake: '06:40', screen: '4:20', mood: 4, fajr: 2, w1h: '6', exp: [{ a: 75, w: 'غدا', c: 'أكل' }], post: 'مكالمة البنك', top: 'خلصت' };

test('شريط الأيام: ٧ مفاتيح من الأقدم، وحالة كل يوم', () => {
  assert.deepEqual(weekKeys('2026-11-21'), ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
  assert.deepEqual(weekKeys('2026-12-02').slice(0, 2), ['2026-11-26', '2026-11-27']);
  assert.equal(dayStatus(undefined), 'none');
  assert.equal(dayStatus({}), 'none');
  assert.equal(dayStatus({ ai: { t: 'تقرير', at: 1 } }), 'none'); // التقرير لوحده مش تسجيل
  assert.equal(dayStatus({ mood: 3 }), 'part');
  assert.equal(dayStatus(FULL_DAY), 'full');
  assert.equal(dayProgress({}), 0);
  assert.equal(dayProgress({ ai: { t: 'تقرير' } }), 0);
  assert.equal(dayProgress({ hrs: { 9: { c: 'learn' } } }), 15);
  assert.equal(dayProgress({ hrs: { 9: { c: 'work' } } }), 13); // شغل من تاب الوقت بيكمّل بند الشغل (١ من ٨)
  assert.equal(dayProgress({ sleep: '00:15', mood: 4 }), 25);
  assert.equal(dayProgress(FULL_DAY), 100);
});

test('فاضل دلوقتي ولا بعدين: كل بند ★ ليه وقت بيبقى فيه ناقص', () => {
  const keys = (r) => [r.now.map((s) => s.k), r.later.map((s) => s.k)];
  const t = '2026-11-21';
  // الصبح: النوم والعادات بس
  assert.deepEqual(keys(starSplit({}, t, t, 8)), [['sleep', 'habits'], ['screen', 'mood', 'work', 'money', 'post', 'top']]);
  // بعد المغرب: والشغل والفلوس
  assert.deepEqual(keys(starSplit({}, t, t, 18)), [['sleep', 'habits', 'work', 'money'], ['screen', 'mood', 'post', 'top']]);
  // قبل النوم، و١٢–٤ الفجر كمان: كله
  assert.equal(starSplit({}, t, t, 22).now.length, 8);
  assert.equal(starSplit({}, t, t, 2).now.length, 8);
  // يوم فات: كله ناقص. ويوم جاي: كله بعدين
  assert.equal(starSplit({}, '2026-11-18', t, 8).now.length, 8);
  assert.equal(starSplit({}, '2026-11-25', t, 23).later.length, 8);
  // اللي اتسجل مابيظهرش في الاتنين
  assert.deepEqual(keys(starSplit({ sleep: '00:15', fajr: 2 }, t, t, 8)), [[], ['screen', 'mood', 'work', 'money', 'post', 'top']]);
});

test('أرقام الملخص، و null للي ماتسجلش (مش صفر)', () => {
  assert.deepEqual(dayNums(FULL_DAY), { sleep: 385, screen: 260, work: 6, spend: 75 });
  assert.deepEqual(dayNums({}), { sleep: null, screen: null, work: null, spend: null });
  assert.equal(dayNums({ screen: '5' }).screen, 300); // "5" = ٥ ساعات
  assert.equal(dayNums({ w1p: 'ورقة اليوم' }).work, null); // مشروع من غير ساعات = لسه ماتسجلش
  assert.equal(dayNums({ w1h: '0' }).work, 0); // صفر ساعات اتسجل = صفر
});

test('المقارنة بمتوسطك: الأيام اللي فيها قيمة بس، و٣ أيام على الأقل', () => {
  assert.deepEqual(avgOf([null, 2, 4, undefined]), { avg: 3, n: 2 });
  assert.deepEqual(avgOf([]), { avg: null, n: 0 });
  const days = [
    { key: '2026-11-16', data: { sleep: '23:55', wake: '06:30' } }, // 395
    { key: '2026-11-17', data: { sleep: '00:20', wake: '06:45' } }, // 385
    { key: '2026-11-18', data: { sleep: '23:30', wake: '06:10' } }, // 400
    { key: '2026-11-19', data: { mood: 3 } }, // من غير نوم: مابيدخلش المتوسط ولا بيتحسب صفر
    { key: '2026-11-21', data: { sleep: '01:05', wake: '07:10' } }, // اليوم نفسه: مش داخل في المتوسط
  ];
  assert.equal(baselineFor(days, '2026-11-21', 'sleep'), (395 + 385 + 400) / 3);
  assert.equal(baselineFor(days.slice(0, 2), '2026-11-21', 'sleep'), null); // يومين بس = لسه بدري
  assert.equal(baselineFor(days, '2026-11-30', 'sleep'), null); // الأيام دي برّه آخر ٧
  assert.deepEqual(compareTo(365, 389, 5), { dir: 'down', diff: 24 });
  assert.deepEqual(compareTo(388, 389, 5), { dir: 'same', diff: 0 });
  assert.deepEqual(compareTo(110, 152.5, 5), { dir: 'down', diff: 42.5 });
  assert.equal(compareTo(null, 389), null);
  assert.equal(compareTo(380, null), null);
  assert.equal(fmtDiff('min', 24), '٢٤د');
  assert.equal(fmtDiff('min', 70), '١:١٠');
  assert.equal(fmtDiff('h', 0.75), '٠٫٨');
  assert.equal(fmtDiff('money', 42.5), '٤٣');
});

// ---------- نظام الإدخال (الدفعة ٦) ----------
const HIST = [
  { key: '2026-11-16', data: { sleep: '23:55', wake: '06:30', screen: '4:50', w1p: 'موقع الأسواف', post: 'القراية' } },
  { key: '2026-11-17', data: { sleep: '00:20', wake: '06:45' } },
  { key: '2026-11-18', data: { sleep: '23:30', wake: '06:10', w1p: 'ورقة اليوم', w2p: 'موقع الأسواف', post: 'ولا حاجة' } },
  { key: '2026-11-19', data: { sleep: '00:45', wake: '07:05', w1p: 'ورقة اليوم', post: 'المشي' } },
  { key: '2026-11-20', data: { sleep: '00:15', wake: '06:40', screen: '4:20', w1p: 'ورقة اليوم', post: 'مكالمة البنك' } },
  { key: '2026-11-21', data: { sleep: '01:05' } }, // اليوم نفسه: مابيدخلش في الاقتراحات
];

test('اقتراحات الوقت: ٥ chips كل ربع ساعة حوالين الوسيط، والوسيط بيفهم إن ١١:٣٠ و١٢:٤٥ قريبين', () => {
  assert.deepEqual(suggestTimes(HIST, 'sleep', '2026-11-21', '00:00'), ['23:45', '00:00', '00:15', '00:30', '00:45']);
  assert.deepEqual(suggestTimes(HIST, 'wake', '2026-11-21', '06:30'), ['06:15', '06:30', '06:45', '07:00', '07:15']);
  // من غير تاريخ: حوالين القيمة الافتراضية
  assert.deepEqual(suggestTimes([], 'sleep', '2026-11-21', '00:00'), ['23:30', '23:45', '00:00', '00:15', '00:30']);
});

test('"زي امبارح": آخر يوم قبل اليوم المفتوح فيه المفاتيح كلها', () => {
  assert.deepEqual(lastWith(HIST, '2026-11-21', ['sleep', 'wake']), { sleep: '00:15', wake: '06:40' });
  assert.deepEqual(lastWith(HIST, '2026-11-21', ['screen']), { screen: '4:20' });
  assert.deepEqual(lastWith(HIST, '2026-11-17', ['screen']), { screen: '4:50' });
  assert.equal(lastWith(HIST, '2026-11-16', ['sleep', 'wake']), null);
});

test('مدة الشاشة: اللي بيتكتب بأرقام بس بيتفهم ويتحفظ بنفس شكل "٥:٣٠" القديم', () => {
  assert.equal(readDuration('420'), '4:20');
  assert.equal(readDuration('٤٢٠'), '4:20');
  assert.equal(readDuration('1130'), '11:30');
  assert.equal(readDuration('5'), '5:00'); // ٥ = ساعات
  assert.equal(readDuration('45'), '0:45'); // أكبر من ٢٤ = دقايق
  assert.equal(readDuration('٢٫٥'), '2:30');
  assert.equal(readDuration('4:20'), '4:20');
  assert.equal(readDuration('٤:٠٥'), '4:05');
  assert.equal(readDuration(''), '');
  assert.equal(readDuration('470'), ''); // ٧٠ دقيقة مش منطقي
  assert.equal(readDuration('abc'), '');
});

test('آخر قيم مختلفة (المشاريع، وأجّلت إيه): الأحدث الأول، ومن غير تكرار', () => {
  assert.deepEqual(recentValues(HIST, ['w1p', 'w2p', 'w3p', 'w4p'], '2026-11-21'), ['ورقة اليوم', 'موقع الأسواف']);
  assert.deepEqual(recentValues(HIST, 'post', '2026-11-21', 3, ['ولا حاجة']), ['مكالمة البنك', 'المشي', 'القراية']);
  assert.deepEqual(recentValues(HIST, 'post', '2026-11-19', 3), ['ولا حاجة', 'القراية']);
});

// ---------- أركان الحياة + الأسبوع السبت←الجمعة + سجل الوقت ساعة بساعة ----------
test('شريط الأسبوع الثابت من السبت للجمعة، ورقم الأسبوع واحد للأسبوع كله', () => {
  const expected = ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
  assert.deepEqual(satWeekKeys('2026-11-14'), expected); // السبت
  assert.deepEqual(satWeekKeys('2026-11-18'), expected); // الأربعاء
  assert.deepEqual(satWeekKeys('2026-11-20'), expected); // الجمعة
  // رقم الأسبوع ثابت من السبت للجمعة، والسبت الجديد بيزيد ١
  assert.equal(weekNumber('2026-11-14'), 47);
  assert.equal(weekNumber('2026-11-18'), 47);
  assert.equal(weekNumber('2026-11-20'), 47);
  assert.equal(weekNumber('2026-11-21'), 48); // السبت اللي بعده
  assert.equal(weekNumber('2026-01-01'), 1);
  assert.equal(weekNumber('2026-01-03'), 2);
});

test('أركان الحياة الـ ٣ بتغطي العادات الـ ٨ من غير تكرار ولا نقص، والنسبة صح', () => {
  const grouped = HABIT_GROUPS.flatMap((g) => g.keys);
  assert.equal(grouped.length, HABITS.length);
  assert.deepEqual(new Set(grouped), new Set(HABITS.map(([k]) => k)));
  assert.equal(HABIT_GROUPS.length, 3);
  const deen = HABIT_GROUPS[0];
  assert.deepEqual(habitGroupStats({ wird: 2, azkm: 1 }, deen), { done: 1, part: 1, total: 3, pct: 50 });
  assert.deepEqual(habitGroupStats({ wird: 2, azkm: 2, azke: 2 }, deen), { done: 3, part: 0, total: 3, pct: 100 });
});

test('سجل الوقت: تجميع المجالات، وامتداد الساعات، وملء النوم، والدمج والذكاء الاصطناعي', () => {
  assert.equal(fmtHour(4), '٤ ص');
  assert.equal(fmtHour(12), '١٢ م');
  assert.equal(fmtHour(17), '٥ م');
  assert.equal(fmtHour(0), '١٢ ص');
  assert.equal(hoursWord(1), 'ساعة');
  assert.equal(hoursWord(2), 'ساعتين');
  assert.equal(hoursWord(5), 'ساعات');
  assert.equal(fmtHours(1), 'ساعة');
  assert.equal(fmtHours(2), 'ساعتين');
  assert.equal(fmtHours(5), '٥ ساعات');
  assert.equal(fmtHours(12), '١٢ ساعة');
  assert.deepEqual(hourSpan(9, 3), [9, 10, 11]);
  assert.deepEqual(hourSpan(23, 3), [23, 0, 1]);
  assert.deepEqual(hourSpan(2, 4), [2, 3]); // مايلفش على ٤ الفجر بتاع بكرة
  // ملء النوم من وقت النوم والصحيان
  assert.deepEqual(sleepHourList('23:30', '06:30'), [23, 0, 1, 2, 3, 4, 5]);
  assert.deepEqual(sleepHourList('00:15', '06:40'), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(sleepHourList('', '06:40'), []);
  // تجميع ساعات كل مجال
  const d = {
    hrs: {
      9: { c: 'work', t: 'ورقة اليوم' },
      10: { c: 'work', t: 'مكالمة' },
      11: { c: 'work' },
      8: { c: 'move', t: 'طريق الشغل' },
      15: { c: 'learn', t: 'إنجليزي' },
      16: { c: '', t: 'ملاحظة بس من غير مجال' },
    },
  };
  const tb = timeByCat(d);
  assert.equal(tb.total, 5);
  assert.deepEqual(tb.rows.map((r) => [r.id, r.hours]), [['work', 3], ['learn', 1], ['move', 1]]);
  // الاستيراد بيدمج hrs من غير ما يمسح ساعات أي طرف
  const m = mergeDoc('day/2026-11-20', { updatedAt: 200, data: { hrs: { 9: { c: 'work' } } } }, { updatedAt: 100, data: { hrs: { 9: { c: 'rest' }, 10: { c: 'learn' } } } });
  assert.deepEqual(m.data.hrs, { 9: { c: 'work' }, 10: { c: 'learn' } });
  // تقرير الذكاء الاصطناعي اليومي والأسبوعي بياخد توزيع الوقت
  const dig = dayDigest('2026-11-20', d);
  assert.match(dig, /توزيع الوقت \(5 ساعة\): شغل 3 ساعة، تعلم 1 ساعة، مواصلات 1 ساعة/);
  assert.match(dig, /ورقة اليوم/);
  const wdig = weekDigest('2026-11-21', [{ key: '2026-11-20', data: d }]);
  assert.match(wdig, /توزيع الوقت في الأسبوع \(5 ساعة\): شغل 3 ساعة، تعلم 1 ساعة، مواصلات 1 ساعة/);
});

test('نظام الأهداف المتكامل: النطاق الزمني، الـ ٥ طرق قياس، محرك الإيقاع، النسخ الاحتياطي والذكاء الاصطناعي', () => {
  const periods = [{ id: 'p1', from: '2026-11-15', to: '2026-11-25' }];
  assert.deepEqual(goalRange('period', '2026-11-20', periods), { from: '2026-11-15', to: '2026-11-25' });
  assert.deepEqual(goalRange('week', '2026-11-20', periods), { from: '2026-11-14', to: '2026-11-20' });
  assert.deepEqual(goalRange('month', '2026-11-20', periods), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(goalRange('month', '2026-02-10', periods), { from: '2026-02-01', to: '2026-02-28' });

  const tp = goalTimeProgress({ from: '2026-11-01', to: '2026-11-20' }, '2026-11-10');
  assert.equal(tp.timePct, 50);
  assert.equal(tp.daysLeft, 10);

  const days = [
    { key: '2026-11-05', data: { ex: 2, wirdp: '10', w1p: 'ورقة اليوم', w1h: '4', hrs: { 9: { c: 'work' }, 10: { c: 'work' }, 15: { c: 'learn' } }, m: { w: 82, calls: 5 }, exp: [{ a: 400, c: 'أكل' }, { a: 100, c: 'مواصلات' }], income: '5000' } },
    { key: '2026-11-10', data: { ex: 1, wirdp: '15', deep: '3', hrs: { 9: { c: 'work' }, 10: { c: 'work' }, 11: { c: 'work' } }, m: { w: 80.5, calls: 7 }, exp: [{ a: 250, c: 'أكل' }] } },
    { key: '2026-11-25', data: { ex: 2, exp: [{ a: 900, c: 'أكل' }] } }, // برّه نطاق 1..20
  ];
  const metrics = [
    { id: 'w', n: 'الوزن', t: 'num', u: 'كجم', on: true },
    { id: 'calls', n: 'مكالمات', t: 'count', u: 'مكالمة', on: true },
  ];
  const tasks = [
    { id: 't1', t: 'خطوة ١', done: true, goalId: 'gSteps' },
    { id: 't2', t: 'خطوة ٢', done: false, goalId: 'gSteps' },
  ];
  const ctx = { days, tasks, metrics, today: '2026-11-10' };

  // ١. عادة (أيام + رقم عادة)
  const gHabit = { id: 'g1', t: 'تمرين', p: 'health', f: true, m: 'habit', src: { kind: 'days', k: 'ex' }, from: '2026-11-01', to: '2026-11-20', target: 10, unit: 'يوم' };
  const evH = evalGoal(gHabit, ctx);
  assert.equal(evH.cur, 1.5); // يوم تم (1) + يوم جزئي (0.5)
  assert.equal(evH.pct, 15);
  assert.equal(evH.isBehind, true);
  assert.equal(evH.status, 'attn');
  assert.doesNotMatch(evH.paceText, /يوم\/يوم/); // مايقولش "يوم/يوم" أبداً

  const gWird = { id: 'g1b', t: 'صفحات ورد', p: 'deen', f: false, m: 'habit', src: { kind: 'sum', k: 'wirdp' }, from: '2026-11-01', to: '2026-11-20', target: 50, unit: 'صفحة' };
  assert.equal(evalGoal(gWird, ctx).cur, 25);

  // ٢. وقت وشغل (مايجمعش نفس اليوم مرتين، ياخد الأكبر بين الشغل والوقت)
  const gWork = { id: 'g2', t: 'شغل', p: 'work', f: true, m: 'time', src: { kind: 'work', c: 'work' }, from: '2026-11-01', to: '2026-11-20', target: 10, unit: 'ساعة' };
  const evW = evalGoal(gWork, ctx);
  assert.equal(evW.cur, 7); // 4 (max(4,2)) + 3 (max(0,3))
  assert.equal(evW.pct, 70);
  assert.equal(evW.isBehind, false);
  assert.equal(evW.status, 'done');

  // ٣. مقياس وصول لقيمة (نزول وزن 84 → 78، وآخر قراية 80.5 = 58%) + مجموع مقياس + سقف مصاريف
  const gWeight = { id: 'g3', t: 'الوزن', p: 'health', m: 'metric', src: { kind: 'target', id: 'w' }, from: '2026-11-01', to: '2026-11-20', start: 84, target: 78, unit: 'كجم' };
  const evWt = evalGoal(gWeight, ctx);
  assert.equal(evWt.cur, 80.5);
  assert.equal(evWt.pct, 58);
  assert.equal(evWt.isBehind, false);

  const gCalls = { id: 'g3b', t: 'مكالمات', p: 'work', m: 'metric', src: { kind: 'sum', id: 'calls' }, from: '2026-11-01', to: '2026-11-20', target: 20, unit: 'مكالمة' };
  assert.equal(evalGoal(gCalls, ctx).cur, 12);

  const gCap = { id: 'g3c', t: 'سقف أكل', p: 'work', m: 'metric', src: { kind: 'exp_cap', cat: 'أكل' }, from: '2026-11-01', to: '2026-11-20', target: 2000, unit: 'ج' };
  const evCap = evalGoal(gCap, ctx);
  assert.equal(evCap.cur, 650); // 400 + 250 بس (برّه النطاق مااتحسبش، والمواصلات مااتحسبتش)
  assert.equal(evCap.isCap, true);
  assert.equal(evCap.isBehind, false); // 33% < 50% وقت = تحت السقف

  // ٤. مراحل + مهام مربوطة
  const gSteps = { id: 'gSteps', t: 'إطلاق', p: 'growth', f: true, m: 'steps', from: '2026-11-01', to: '2026-11-20', steps: [{ id: 's1', t: 'تصميم', done: true }, { id: 's2', t: 'كود', done: false }] };
  const evS = evalGoal(gSteps, ctx);
  assert.equal(evS.cur, 2); // 1 milestone + 1 linked task
  assert.equal(evS.target, 4);
  assert.equal(evS.pct, 50);
  assert.equal(evS.nextText, 'خطوة ٢');

  // ٥. يدوي + أرشفة + تجميع + باك أب + ذكاء اصطناعي
  const gMan = { id: 'g5', t: 'كتب', p: 'growth', m: 'manual', cur: 6, target: 10, unit: 'كتاب', from: '2026-11-01', to: '2026-11-20' };
  const gArch = { id: 'gDone', t: 'مكتمل', p: 'deen', m: 'manual', cur: 5, target: 5, done: true, dAt: 100 };
  const allG = [gHabit, gWork, gWeight, gCap, gSteps, gMan, gArch];
  const sum = goalsSummary(allG, ctx);
  assert.equal(sum.active.length, 6);
  assert.equal(sum.archived.length, 1);
  assert.equal(sum.focus.length, 3);
  assert.equal(sum.linkedHabits.has('ex'), true);

  // parseBackup يقبل list/goals و mergeDoc يدمجها
  const bk = parseBackup(JSON.stringify({ app: 'waraqat-alyawm', docs: [{ id: 'list/goals', data: { items: [gWork] }, updatedAt: 50 }] }));
  assert.equal(bk.length, 1);
  const mg = mergeDoc('list/goals', { updatedAt: 10, data: { items: [gHabit] } }, { updatedAt: 20, data: { items: [gWork] } });
  assert.equal(mg.data.items.length, 2);

  // دمج الأهداف في تقرير الذكاء الاصطناعي اليومي والأسبوعي
  const gl = goalDigestLines([gWork, gHabit, gArch], ctx);
  assert.equal(gl.length, 3); // العنوان + الهدفين النشطين بس (المؤرشف لأ)
  assert.match(gl[1], /شغل \[تركيز\]: 70%/);
  const dd = dayDigest('2026-11-10', days[1].data, { goals: [gWork], days, tasks, metrics });
  assert.match(dd, /الأهداف النشطة:/);
  const wd = weekDigest('2026-11-10', days, { goals: [gWork], tasks, metrics });
  assert.match(wd, /الأهداف النشطة:/);
});

test('ترتيب المتغيرات (الأجزاء ١–٦): الإعدادات، النوم، الصلوات بالاسم، التخمين، الدخل، وهدف الفترة', () => {
  // ١. الإعدادات وبداية اليوم الديناميكية وتقسيم ساعات النوم بعد نص الليل
  const cfg = normalizeSettings({ dayStart: 5, sleepTarget: 8, screenLimit: 2.5, budget: 4000 });
  assert.equal(cfg.dayStart, 5);
  assert.equal(periodsFor(5)[0][2], 'من ٥ الفجر لـ ١٢ الضهر');
  assert.deepEqual(periodHoursFor(5)[0], [5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(periodHoursFor(5)[3], [21, 22, 23, 0, 1, 2, 3, 4]);
  // إصلاح لخبطة ساعات النوم بعد نص الليل: الساعات قبل ٤ الفجر تروح لليلة امبارح (prev) والصباح للنهارده (today)
  assert.deepEqual(sleepHoursSplit('23:30', '06:30', 4), { prev: [23, 0, 1, 2, 3], today: [4, 5] });
  assert.deepEqual(sleepHoursSplit('00:30', '07:30', 4), { prev: [0, 1, 2, 3], today: [4, 5, 6] });
  assert.deepEqual(sleepHoursSplit('05:00', '12:00', 4), { prev: [], today: [5, 6, 7, 8, 9, 10, 11] });
  assert.deepEqual(sleepHoursSplit('23:00', '04:00', 4), { prev: [23, 0, 1, 2, 3], today: [] });
  assert.deepEqual(sleepHoursSplit('22:00', '03:30', 4), { prev: [], today: [22, 23, 0, 1, 2, 3] });

  // ٢. الصلوات الـ ٥ بالاسم والتزامن مع salah و fajr
  let d = {};
  const p1 = togglePrayer(d, 'fajr');
  assert.equal(p1.salah, 1);
  assert.equal(p1.fajr, 2);
  assert.equal(p1.prayers.fajr, true);
  d = { ...d, ...p1 };
  const p2 = togglePrayer(d, 'asr');
  assert.equal(p2.salah, 2);
  assert.equal(p2.fajr, 2);
  assert.equal(p2.prayers.asr, true);
  // التوافق مع أيام قديمة فيها salah=3 بس من غير prayers
  assert.equal(prayersState({ salah: 3 }).fajr, true);
  assert.equal(prayersState({ salah: 3 }).asr, true);
  assert.equal(prayersState({ salah: 3 }).isha, false);

  // ٣. التخمين الذكي لتصنيف المصاريف + الدخل كبنود + إجازة وماصرفتش
  assert.equal(guessExpCat('غدا في المطعم'), 'أكل');
  assert.equal(guessExpCat('أوبر للمكتب'), 'مواصلات');
  assert.equal(guessExpCat('اشتراك جيم'), 'صحة');
  assert.equal(guessExpCat('كتاب برمجة'), 'تعلم');
  assert.equal(guessExpCat('حاجة غير معروفة'), null);
  assert.equal(incomeTotal({ income: 1000, inc: [{ a: 500, c: 'فريلانس' }, { a: 250, c: 'مشروع' }] }), 1750);
  assert.equal(starCount({ workOff: true, noSpend: true }), 2);
  // قفل بند من الإعدادات يطلعه من العدّاد
  const cfgNoPost = normalizeSettings({ stars: { ...DEFAULT_SETTINGS.stars, post: { on: false, due: 3 } } });
  assert.equal(missingStars({}, cfgNoPost).length, 7);

  // ٤. هدف الفترة الواحد (الـ ٤ أنواع: اكتساب عادة، إزالة عادة، تخليص مشروع، هدف رقمي/سقف)
  const pDays = [
    { key: '2026-11-15', data: { ex: 2, screen: '2:00', hrs: { 9: { c: 'work' }, 10: { c: 'work' } }, exp: [{ a: 300, c: 'أكل' }] } },
    { key: '2026-11-16', data: { ex: 2, screen: '4:30', hrs: { 9: { c: 'distract' } }, exp: [{ a: 200, c: 'أكل' }] } },
    { key: '2026-11-17', data: { ex: 1, screen: '1:45', hrs: { 9: { c: 'work' } }, exp: [{ a: 150, c: 'أكل' }] } },
  ];
  const pBuild = { id: 'p1', name: 'الرياضة', from: '2026-11-15', to: '2026-11-25', goal: { title: 'أتمرن ٨ أيام', kind: 'build', source: 'habit:ex', target: 8, unit: 'يوم' } };
  const evB = evalPeriodGoal(pBuild, { days: pDays, today: '2026-11-17' });
  assert.equal(evB.cur, 2.5); // يومين تم + يوم جزئي
  assert.equal(evB.streak, 2);
  assert.equal(evB.pct, 31);

  const pQuit = { id: 'p2', from: '2026-11-15', to: '2026-11-25', goal: { title: 'شاشة تحت ٣ س', kind: 'quit', source: 'screen', target: 8, unit: 'يوم نضيف' } };
  const evQ = evalPeriodGoal(pQuit, { days: pDays, today: '2026-11-17' });
  assert.equal(evQ.cur, 2); // يومين تحت السقف
  assert.equal(evQ.slipped, 1); // يوم عدّى السقف

  const pProj = { id: 'p3', from: '2026-11-15', to: '2026-11-25', goal: { title: 'إطلاق النسخة', kind: 'project', source: 'steps', steps: [{ id: '1', t: 'خطوة ١', done: true }, { id: '2', t: 'خطوة ٢', done: false }] } };
  const evP = evalPeriodGoal(pProj, { days: pDays, today: '2026-11-17' });
  assert.equal(evP.cur, 1);
  assert.equal(evP.target, 2);
  assert.equal(evP.pct, 50);
  assert.equal(evP.nextStep, 'خطوة ٢');

  const pCap = { id: 'p4', from: '2026-11-15', to: '2026-11-25', goal: { title: 'سقف مصاريف', kind: 'target', source: 'spend', dir: 'max', target: 2000, unit: 'ج' } };
  const evC = evalPeriodGoal(pCap, { days: pDays, today: '2026-11-17' });
  assert.equal(evC.cur, 650);
  assert.equal(evC.isCap, true);
  assert.equal(evC.status, 'done');

  // ٥. النسخة الاحتياطية والدمج لـ list/settings وتقرير الذكاء الاصطناعي المحدّث
  const bk = parseBackup(JSON.stringify({ app: 'waraqat-alyawm', docs: [{ id: 'list/settings', data: { sleepTarget: 8 }, updatedAt: 50 }] }));
  assert.equal(bk.length, 1);
  const mg = mergeDoc('list/settings', { updatedAt: 10, data: { sleepTarget: 7.5, workTarget: 7 } }, { updatedAt: 20, data: { sleepTarget: 8 } });
  assert.deepEqual(mg.data, { sleepTarget: 8, workTarget: 7 });

  const dig = dayDigest('2026-11-17', {
    sleep: '23:30', wake: '07:00', sleepq: 'fresh', nap: '20',
    ext: 'مقاومة صدر', exm: '45', exn: '٤×١٢', stress: 'mild', moodTag: 'مركّز', nextp: 'تقفيل الميزة',
  }, { periods: [pBuild], days: pDays, settings: cfg });
  assert.match(dig, /أهدافه اليومية: نوم 8 ساعة/);
  assert.match(dig, /الجودة فايق، قيلولة 20 دقيقة/);
  assert.match(dig, /تفاصيل التمرين: النوع: مقاومة صدر، 45 دقيقة، أرقام: 4×12/);
  assert.match(dig, /أولوية بكرة: تقفيل الميزة/);
  assert.match(dig, /هدف الفترة الحالية/);
  assert.equal(periodGoalDigestLines([pBuild], { days: pDays, today: '2026-11-17' }).length, 1);
});

test('بنك الأهداف + خريطة جوانب الحياة القابلة للتخصيص + مراجعة نهاية الفترة', () => {
  // ١. جوانب الحياة القابلة للتخصيص في الإعدادات
  assert.equal(activeLifeAreas().length, DEFAULT_LIFE_AREAS.length);
  const customCfg = normalizeSettings({
    lifeAreas: [
      { id: 'deen', name: 'الدين', icon: 'star', note: 'محافظة على الفجر' },
      { id: 'rel', name: 'العلاقات والعائلة', icon: 'users', note: 'صلة رحم أسبوعياً' },
      { id: 'money', name: 'المال والاستثمار', icon: 'wallet' },
    ],
  });
  assert.equal(customCfg.lifeAreas.length, 3);
  assert.equal(lifeAreaMap(customCfg).get('rel').name, 'العلاقات والعائلة');
  assert.equal(lifeAreaMap(customCfg).get('work').name, 'شغل'); // fallback للافتراضي

  // ٢. فصل بنك الأهداف عن النشطة + خريطة الجوانب + عدم تلويث متوسط التقدّم
  const goals = [
    { id: 'g1', t: 'ورد يومي', p: 'deen', m: 'manual', cur: 5, target: 10, from: '2026-11-15', to: '2026-11-25', f: true, done: false },
    { id: 'b1', st: 'backlog', t: 'أصلح علاقتي بأخويا', p: 'rel', pri: false, why: 'مهم لراحة بالي', done: false, at: new Date('2026-11-10T12:00:00').getTime() },
    { id: 'b2', st: 'backlog', t: 'أبني صندوق طوارئ', p: 'money', pri: true, why: 'أمان مالي', done: false, at: new Date('2026-11-18T12:00:00').getTime() },
    { id: 'd1', t: 'هدف قديم خلص', p: 'deen', m: 'manual', cur: 10, target: 10, done: true, dAt: 1000 },
  ];
  assert.equal(isBacklogGoal(goals[0]), false);
  assert.equal(isBacklogGoal(goals[1]), true);
  assert.equal(backlogAgeText('2026-11-20', '2026-11-20'), 'النهارده');
  assert.equal(backlogAgeText('2026-11-19', '2026-11-20'), 'من امبارح');
  assert.equal(backlogAgeText('2026-11-15', '2026-11-20'), 'من ٥ أيام');

  const sum = goalsSummary(goals, { days: [], tasks: [], metrics: [], today: '2026-11-20', settings: customCfg });
  assert.equal(sum.active.length, 1);
  assert.equal(sum.backlog.length, 2);
  assert.equal(sum.backlog[0].id, 'b2'); // الأولوية العالية فوق
  assert.equal(sum.archived.length, 1);
  assert.equal(sum.avgPct, 50); // بنك الأهداف ما أثرش على متوسط التقدّم (٥٠٪ بس من g1)
  assert.equal(sum.focus.length, 1);
  assert.equal(sum.evals.get('b1').isBacklog, true);
  assert.equal(sum.evals.get('b1').pillar.name, 'العلاقات والعائلة');

  // خريطة الجوانب
  const deenArea = sum.areas.find((x) => x.area.id === 'deen');
  const relArea = sum.areas.find((x) => x.area.id === 'rel');
  const moneyArea = sum.areas.find((x) => x.area.id === 'money');
  assert.equal(deenArea.active.length, 1);
  assert.equal(deenArea.avgPct, 50);
  assert.equal(deenArea.archived.length, 1);
  assert.equal(relArea.active.length, 0);
  assert.equal(relArea.backlog.length, 1);
  assert.equal(moneyArea.backlog.length, 1);

  // ملخص الـ AI مايحسبش بنك الأهداف كأهداف نشطة
  const digLines = goalDigestLines(goals, { days: [], tasks: [], metrics: [], today: '2026-11-20', settings: customCfg });
  assert.equal(digLines.some((l) => l.includes('ورد يومي')), true);
  assert.equal(digLines.some((l) => l.includes('أبني صندوق طوارئ')), false);
  assert.equal(digLines.some((l) => l.includes('بنك الأهداف') && l.includes('2')), true);

  // ٣. حالة مراجعة نهاية الفترة
  const p = { id: 'p1', name: 'سبرنت نوفمبر', from: '2026-11-10', to: '2026-11-20' };
  // في نص الفترة ← مش وقت المراجعة
  assert.equal(periodReviewState([p], goals, '2026-11-15').due, false);
  // آخر يوم في الفترة + فيه أهداف في البنك ← وقت المراجعة
  const rLast = periodReviewState([p], goals, '2026-11-20');
  assert.equal(rLast.due, true);
  assert.equal(rLast.reason, 'last_day');
  assert.equal(rLast.count, 2);
  // بعد ما الفترة انتهت ومفيش فترة جديدة ← وقت المراجعة
  const rEnd = periodReviewState([p], goals, '2026-11-22');
  assert.equal(rEnd.due, true);
  assert.equal(rEnd.reason, 'ended');
  // لو بنك الأهداف فاضي ← مفيش تنبيه
  assert.equal(periodReviewState([p], [goals[0]], '2026-11-22').due, false);
  // بعد ما تتعلّم إنها اتراجعت ← مفيش تنبيه
  assert.equal(periodReviewState([{ ...p, reviewedAt: Date.now() }], goals, '2026-11-22').due, false);
});

test('نظام الفلتر والربط الموحّد: المجال ← هدف ← مشروع واحد شغّال ← ٣ مهام للنهاردة + عادات مباشرة', () => {
  assert.equal(TODAY_TASK_LIMIT, 3);
  assert.deepEqual(DEFAULT_LIFE_AREAS.map((a) => a.name), ['شغل', 'ديني', 'صحة', 'علاقات', 'تعلم']);

  const settings = normalizeSettings({
    habits: [
      ...DEFAULT_SETTINGS.habits.map((h) => (h.k === 'tech' ? { ...h, on: false } : h)), // عادة مجمّدة
      { k: 'h_rel1', n: 'مكالمة أهلي', g: 'life', on: true }, // عادة في مجال علاقات
    ],
  });
  // العادة المضافة في مجال علاقات تظهر تلقائياً في activeHabitGroups
  assert.equal(activeHabitGroups(settings).some((g) => g.id === 'life' && g.keys.includes('h_rel1')), true);

  const items = [
    { id: 'goal1', kind: 'goal', p: 'work', t: 'الاستقرار المادي', why: 'راحة بالي', st: 'active', done: false, at: 10 },
    { id: 'goal2', kind: 'goal', p: 'health', t: 'لياقة عالية', st: 'frozen', done: false, at: 20 },
    { id: 'proj1', kind: 'project', p: 'work', parentId: 'goal1', t: 'إطلاق المتجر', outcome: 'أول ١٠ مبيعات', st: 'active', f: true, m: 'steps', steps: [{ id: 's1', t: 'تجهيز الصفحة', done: false }], done: false, at: 30 },
    { id: 'proj2', kind: 'project', p: 'health', parentId: 'goal2', t: 'برنامج جري شهر', outcome: '٥ كيلو متواصل', st: 'frozen', pri: true, m: 'steps', done: false, at: 40 },
    { id: 'projDone', kind: 'project', p: 'work', parentId: 'goal1', t: 'تسجيل الدومين', st: 'active', done: true, dAt: 50 },
  ];
  assert.equal(itemKind(items[0]), 'goal');
  assert.equal(itemKind(items[2]), 'project');
  assert.equal(itemStatus(items[2]), 'active');
  assert.equal(itemStatus(items[3]), 'frozen');
  assert.equal(itemStatus(items[4]), 'done');

  const tasks = [
    { id: 't1', t: 'تصميم الهيدر', due: '2026-11-25', goalId: 'proj1', done: false, at: 1 },
    { id: 't2', t: 'ربط الدفع', due: '2026-11-25', goalId: 'proj1', done: false, at: 2 },
    { id: 't3', t: 'اختبار الطلب', due: '2026-11-25', goalId: 'proj1', done: false, at: 3 },
    { id: 't4', t: 'مهمة مجمّدة لبعدين', due: '', goalId: 'proj2', done: false, at: 4 },
    { id: 't5', t: 'مهمة خلصت النهاردة', due: '2026-11-25', goalId: 'proj1', done: true, dAt: new Date('2026-11-25T14:00:00').getTime(), at: 5 },
  ];
  assert.equal(todayOpenTasks(tasks, '2026-11-25').length, 3);
  assert.equal(canAddTodayTask(tasks, '2026-11-25').ok, false); // وصلنا حد الـ ٣ مهام!
  assert.equal(canAddTodayTask(tasks, '2026-11-25', 't1').ok, true); // لو بنعدّل مهمة من التلاتة مسموح

  const sys = systemState(items, tasks, settings, { today: '2026-11-25' });
  assert.equal(sys.activeProject.id, 'proj1');
  assert.equal(sys.activeChain.area.name, 'شغل');
  assert.equal(sys.activeChain.goal.t, 'الاستقرار المادي');
  assert.equal(sys.activeChain.nextStep, 'تجهيز الصفحة');
  assert.equal(sys.frozenProjects.length, 1);
  assert.equal(sys.frozenGoals.length, 1);
  assert.equal(sys.frozenHabits.length, 1);
  assert.equal(sys.frozenTasks.length, 1);
  assert.equal(sys.frozenTotal, 4);
  assert.equal(sys.todayOpen.count, 3);
  assert.equal(sys.todayOpen.atLimit, true);
  assert.equal(sys.completedProjects.length, 1);

  // شجرة المجال بتربط الهدف بمشاريعه والعادات مباشرة بالمجال
  const workArea = sys.areas.find((x) => x.area.id === 'work');
  assert.equal(workArea.hasActiveProject, true);
  assert.equal(workArea.goals.length, 1);
  assert.equal(workArea.goals[0].projects.length, 1);
  assert.equal(workArea.goals[0].projects[0].project.id, 'proj1');
  const lifeArea = sys.areas.find((x) => x.area.id === 'life');
  assert.equal(lifeArea.activeHabits.some((h) => h.k === 'h_rel1'), true);
});
