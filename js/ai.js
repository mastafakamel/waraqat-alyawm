// ai.js — تقرير الذكاء الاصطناعي: اليومي والأسبوعي.
//
// التطبيق بيجهّز الملخص من البيانات اللي على الجهاز (dayDigest وweekDigest في logic.js)،
// والدالة report على Supabase بتبعته لـ Groq وترجّع التقرير. المفتاح على السيرفر بس.
// التقرير بيتحفظ جوه اليوم نفسه (ai لليومي، aiw للأسبوعي)، فبيتزامن بين الأجهزة زي أي خانة.

import { state, allDays, setKOn, flush } from './store.js';
import { dayDigest, weekDigest, addDays } from './logic.js';
import { callFunction } from './sync.js';

export const AI_FIELD = { day: 'ai', week: 'aiw' };

/** الملخص اللي هيتبعت لليوم المفتوح، أو لآخر ٧ أيام لحد اليوم المفتوح. */
export async function buildDigest(kind, key = state.cur) {
  await flush();
  const days = await allDays();
  const opts = { tasks: state.tasks, metrics: state.metrics, goals: state.goals };
  if (kind === 'week') return weekDigest(key, days, opts);
  const data = days.find((d) => d.key === key)?.data || {};
  const prevKey = addDays(key, -1);
  const prev = days.find((d) => d.key === prevKey) || null;
  return dayDigest(key, data, { ...opts, prev, days });
}

/** يطلب التقرير ويحفظه في اليوم اللي اتطلب له (حتى لو اتنقلت ليوم تاني وإحنا مستنيين). بيرجّع { text, left }. */
export async function requestReport(kind) {
  const key = state.cur;
  const digest = await buildDigest(kind, key);
  const r = await callFunction('report', { kind, digest });
  await setKOn(key, AI_FIELD[kind], { t: r.text, at: Date.now() });
  return { text: r.text, left: r.left };
}

/** رسالة مفهومة لأي غلط. */
export function aiError(e) {
  if (e?.signedOut || e?.code === 'signed_out') return 'ادخل بحسابك الأول: الإعدادات ← المزامنة';
  if (e?.code === 'off') return 'المزامنة مش متظبطة، والتقرير محتاجها';
  if (e?.capped) return 'المزامنة وصلت حد النهارده، جرّب بكرة';
  if (e instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false)) return 'مفيش نت';
  switch (e?.code) {
    case 'ai_quota': return 'خلصت تقارير النهارده، جرّب بكرة';
    case 'ai_busy': return 'Groq مشغول أو وصلت حده المجاني، جرّب كمان دقيقة';
    case 'ai_timeout': return 'Groq اتأخر في الرد، جرّب تاني';
    case 'ai_key': return 'مفتاح Groq مش متظبط في Supabase (README)';
    case 'ai_model': return 'الموديل ده مابقاش موجود في Groq. غيّر GROQ_MODEL في Supabase (README)';
    default: break;
  }
  if (e?.status === 404) return 'دالة report لسه مش موجودة على Supabase (README)';
  return 'حصلت مشكلة في التقرير، جرّب تاني';
}
