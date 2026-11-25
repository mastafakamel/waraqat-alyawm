// notify.js — التفاعل على الموبايل: إشعار مهام اليوم المثبّت، وApp Badge، والاهتزاز، واشتراك Web Push.

import { VAPID_PUBLIC_KEY } from './config.js';
import { buildTasksNotification, groupTasks } from './logic.js';
import { configured, savePushSub, removePushSub, callFunction } from './sync.js';
import { state, patchSettings } from './store.js';

let lastPinSig = null;

function b64UrlToBytes(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64Url(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getSwReg() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.active) return reg;
    if (reg) return await navigator.serviceWorker.ready;
    return null;
  } catch {
    return null;
  }
}

/** اهتزاز خفيف على أندرويد عند التعليم على مهمة أو عادة. */
export function haptic(kind = 'tap') {
  try {
    if (state.settings.notify?.haptic === false) return;
    if (!navigator.vibrate) return;
    navigator.vibrate(kind === 'done' ? [14, 35, 22] : 12);
  } catch { /* مش مدعوم */ }
}

/** رقم المهام المفتوحة للنهارده على أيقونة التطبيق. */
export async function updateAppBadge(tasks = state.tasks, today = state.today, settings = state.settings) {
  try {
    if (!('setAppBadge' in navigator)) return;
    if (settings?.notify?.badge === false) {
      await navigator.clearAppBadge();
      return;
    }
    const n = groupTasks(tasks, today).today.length;
    if (n > 0) await navigator.setAppBadge(n);
    else await navigator.clearAppBadge();
  } catch { /* مش مدعوم */ }
}

/** يثبّت أو يحدّث أو يقفل إشعار «مهام النهارده» في ستارة الإشعارات. */
export async function syncPinnedTasks(tasks = state.tasks, today = state.today, settings = state.settings, { force = false } = {}) {
  try {
    if (typeof Notification === 'undefined') return false;
    const reg = await getSwReg();
    if (!reg) return false;
    const pinned = !!settings?.notify?.tasksPin;
    if (!pinned || Notification.permission !== 'granted') {
      const old = await reg.getNotifications({ tag: 'today-tasks' });
      for (const n of old) n.close();
      lastPinSig = null;
      return false;
    }
    const built = buildTasksNotification(tasks, today);
    if (!built) {
      const old = await reg.getNotifications({ tag: 'today-tasks' });
      for (const n of old) n.close();
      lastPinSig = '';
      return true;
    }
    const sig = `${built.count}|${built.firstId}|${built.body}`;
    if (!force && sig === lastPinSig) return true;
    lastPinSig = sig;
    await reg.showNotification(built.title, {
      body: built.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: 'today-tasks',
      renotify: false,
      silent: true,
      requireInteraction: true,
      actions: built.actions,
      data: { kind: 'tasks', firstId: built.firstId, url: './?open=tasks' },
    });
    return true;
  } catch {
    return false;
  }
}

/** حالة دعم وإذن الإشعارات واشتراك Web Push على الجهاز ده. */
export async function getPushState() {
  const notifSupported = typeof Notification !== 'undefined';
  const perm = notifSupported ? Notification.permission : 'unsupported';
  const reg = await getSwReg();
  const pushSupported = !!(reg && 'pushManager' in reg);
  let sub = null;
  if (pushSupported) {
    try { sub = await reg.pushManager.getSubscription(); } catch { /* فاضي */ }
  }
  return {
    notifSupported,
    swReady: !!reg,
    pushSupported,
    perm,
    hasVapid: !!VAPID_PUBLIC_KEY,
    syncConfigured: configured(),
    subscribed: !!sub,
    endpoint: sub?.endpoint || '',
  };
}

export async function ensurePermission() {
  if (typeof Notification === 'undefined') throw new Error('المتصفح ده مش بيدعم الإشعارات');
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') throw new Error('الإشعارات مقفولة من إعدادات المتصفح/الموبايل');
  const p = await Notification.requestPermission();
  if (p !== 'granted') throw new Error('لازم تسمح بالإشعارات الأول');
  return true;
}

/** تشغيل/إيقاف إشعار مهام اليوم المثبّت. */
export async function toggleTasksPin() {
  const next = !state.settings.notify?.tasksPin;
  if (next) {
    await ensurePermission();
    const reg = await getSwReg();
    if (!reg) throw new Error('افتح التطبيق من الرابط المنشور (أو ?sw على localhost) عشان الإشعار التفاعلي يشتغل');
  }
  patchSettings({ notify: { ...state.settings.notify, tasksPin: next } });
  await syncPinnedTasks(state.tasks, state.today, state.settings, { force: true });
  return next;
}

/** تفعيل إشعارات الخلفية (Web Push) للجهاز ده وحفظ الاشتراك في Supabase. */
export async function enablePush() {
  if (!VAPID_PUBLIC_KEY) throw new Error('مفتاح VAPID_PUBLIC_KEY لسه ماتحطش في js/config.js');
  if (!configured() || state.sync === 'signedout' || state.sync === 'off') {
    throw new Error('سجّل دخول في «المزامنة» الأول عشان الإشعارات تشتغل والتطبيق مقفول');
  }
  await ensurePermission();
  const reg = await getSwReg();
  if (!reg || !('pushManager' in reg)) throw new Error('المتصفح ده مش بيدعم إشعارات الخلفية');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64UrlToBytes(VAPID_PUBLIC_KEY),
    });
  }
  const p256dh = sub.getKey('p256dh');
  const auth = sub.getKey('auth');
  if (!p256dh || !auth) throw new Error('ماقدرناش نجهّز مفاتيح الاشتراك');

  await savePushSub({
    endpoint: sub.endpoint,
    p256dh: bytesToB64Url(p256dh),
    auth: bytesToB64Url(auth),
    userAgent: navigator.userAgent || '',
  });

  // نحدّث المنطقة الزمنية بتاعة الجهاز تلقائي لو متاحة
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== state.settings.notify?.tz) {
      patchSettings({ notify: { ...state.settings.notify, tz } });
    }
  } catch { /* نسيب الافتراضي */ }

  return sub;
}

/** إيقاف إشعارات الخلفية على الجهاز ده. */
export async function disablePush() {
  const reg = await getSwReg();
  const sub = reg && 'pushManager' in reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    try { await removePushSub(sub.endpoint); } catch { /* نكمّل الإلغاء محلياً */ }
    await sub.unsubscribe();
  }
}

/** إشعار تجريبي محلي فوري (بيشتغل حتى من غير Supabase). */
export async function sendLocalTest() {
  await ensurePermission();
  const reg = await getSwReg();
  const built = buildTasksNotification(state.tasks, state.today);
  const title = built ? built.title : 'تجربة · ورقة اليوم';
  const body = built ? built.body : 'الإشعارات شغالة تمام على موبايلك! ضيف مهمة للنهارده وهتظهرلك هنا.';
  const opts = {
    body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    tag: built ? 'today-tasks' : 'waraqa-test',
    renotify: true,
    actions: built ? built.actions : [{ action: 'open-tasks', title: 'افتح المهام' }],
    data: built ? { kind: 'tasks', firstId: built.firstId, url: './?open=tasks' } : { url: './?open=tasks' },
  };
  if (reg) await reg.showNotification(title, opts);
  else new Notification(title, { body, icon: 'icons/icon-192.png', dir: 'rtl', lang: 'ar' });
}

/** إشعار تجريبي حقيقي من سيرفر Supabase (يختبر Web Push بالكامل). */
export async function sendRemoteTest() {
  return callFunction('notify', { action: 'test' });
}
