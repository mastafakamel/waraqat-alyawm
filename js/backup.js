// backup.js — تصدير واستيراد JSON. الاستيراد بيدمج ومابيمسحش حاجة (mergeDoc في logic.js).
// الملف فيه الأيام والقوايم بس (day/ و list/)، ومفيهوش أي حاجة من local/ زي جلسة المزامنة.

import { allDocs, getDoc, putDoc } from './db.js';
import { BACKUP_APP, mergeDoc, parseBackup, keyOf } from './logic.js';
import { state, flush, loadLists, loadDay, hooks } from './store.js';

const isData = (id) => /^(day|list)\//.test(id);

/** بيعمل الملف. على الموبايل بيفتح قايمة المشاركة (Drive، واتساب لنفسك…)، وعلى اللابتوب بينزّله. */
export async function exportFile() {
  await flush();
  const docs = (await allDocs('')).filter((d) => isData(d.id)).map(({ id, data, updatedAt }) => ({ id, data, updatedAt }));
  const body = JSON.stringify({ app: BACKUP_APP, v: 1, exportedAt: new Date().toISOString(), docs });
  const name = `waraqat-alyawm-${keyOf(new Date())}.json`;
  const file = new File([body], name, { type: 'application/json' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'ورقة اليوم: نسخة احتياطية' });
      return { count: docs.length, how: 'share' };
    } catch (e) {
      if (e.name === 'AbortError') return { count: 0, how: 'cancel' };
      // لو المشاركة فشلت لأي سبب تاني، ننزّله عادي
    }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { count: docs.length, how: 'download' };
}

/** بيقرا الملف ويدمجه. بيرجّع عدد الأيام والقوايم اللي اتغيّرت. */
export async function importFile(file) {
  const docs = parseBackup(await file.text());
  await flush();
  let days = 0;
  let lists = 0;
  for (const inc of docs) {
    const r = mergeDoc(inc.id, await getDoc(inc.id), inc);
    if (!r?.changed) continue;
    // الوقت الجديد + dirty: المزامنة هترفع النسخة المدموجة
    await putDoc({ id: inc.id, data: r.data, updatedAt: Date.now(), dirty: 1 });
    if (inc.id.startsWith('day/')) days += 1;
    else lists += 1;
  }
  await loadLists();
  await loadDay(state.cur);
  if (days || lists) hooks.saved?.();
  return { days, lists, total: docs.length };
}
