// اختبارات logic.js — شغّلها بـ: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toEn, arDigits, fmtNum, readNumber, addDays, periodIndex, sleepMinutes, fmtHM, fmt12,
  cycleTri, rateTap, parseExpense, starCount, missingStars, itemsWord, todayTasks, mergeLine,
  habitsDone, workTotal, expTotal, expByCat, dayRel, lineTarget, uid,
  groupTasks, isOverdue, sortIdeas, searchIdeas, normAr, shortDate, moneySummary, longDate, periodPhase,
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

test('التقييم: رقم جديد بيختار لحده، ونفس الرقم بيقلّل واحد', () => {
  assert.equal(rateTap(0, 4), 4);
  assert.equal(rateTap(4, 2), 2);
  assert.equal(rateTap(4, 4), 3);
  assert.equal(rateTap(1, 1), 0);
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
  assert.equal(habitsDone({ fajr: 2, wird: 2, azkm: 1, eng: 2 }), 3);
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
  const s = moneySummary(days, '2026-11-20', '2026-11-21');
  assert.equal(s.spent, 245);
  assert.equal(s.income, 500);
  assert.deepEqual(s.cats, [['مواصلات', 150], ['أكل', 95]]);
  assert.deepEqual(moneySummary([], '2026-11-20', '2026-11-21'), { spent: 0, income: 0, cats: [] });
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
