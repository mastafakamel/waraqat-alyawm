// اختبار الـ Service Worker: لو ملف اتغيّر ونسيت تشغّل السكربت، الموبايل هيفضل على النسخة القديمة.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { compute, currentVersion, ROOT } from '../tools/stamp-sw.mjs';

test('sw.js متحدّث بآخر نسخة من الملفات', () => {
  assert.equal(currentVersion(), compute().version, 'فيه ملف اتغيّر: شغّل  node tools/stamp-sw.mjs  وبعدين اعمل commit');
});

test('كل ملفات التطبيق اللي محتاجها من غير نت موجودة في القايمة', () => {
  const { files } = compute();
  for (const f of ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/main.js', 'js/views/today.js', 'fonts/rubik-arabic.woff2', 'icons/icon-192.png']) {
    assert.ok(files.includes(f), `${f} مش في القايمة`);
  }
  for (const f of files.filter((x) => x !== './')) assert.ok(existsSync(join(ROOT, f)), `${f} مش موجود`);
});
