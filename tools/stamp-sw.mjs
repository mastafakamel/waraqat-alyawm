// tools/stamp-sw.mjs — بيكتب في sw.js قايمة ملفات التطبيق ورقم نسخة محسوب من محتواها.
// التشغيل من فولدر المشروع:  node tools/stamp-sw.mjs
// لو مفيش ملف اتغيّر، رقم النسخة بيفضل زي ما هو، فالموبايل مش هيحمّل حاجة على الفاضي.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

// الفولدرات والملفات اللي التطبيق محتاجها عشان يشتغل من غير نت
const DIRS = [['css', '.css'], ['fonts', '.woff2'], ['js', '.js'], ['icons', '.png']];
const SINGLE = ['index.html', 'manifest.webmanifest'];

function walk(dir, ext, out) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (name.endsWith(ext)) out.push(p);
  }
  return out;
}

/** { version, files } من الملفات اللي على الجهاز دلوقتي. */
export function compute(root = ROOT) {
  const paths = [...SINGLE.map((f) => join(root, f)), ...DIRS.flatMap(([d, ext]) => walk(join(root, d), ext, []))];
  const hash = createHash('sha256');
  const files = [];
  for (const p of paths) {
    const rel = relative(root, p).split(sep).join('/');
    let data = readFileSync(p);
    // ملفات الكلام: نوحّد نهاية السطر، عشان Windows (CRLF) وGitHub (LF) يطلّعوا نفس الرقم
    if (!rel.endsWith('.woff2') && !rel.endsWith('.png')) data = Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'));
    hash.update(rel).update('\0').update(data);
    files.push(rel);
  }
  return { version: hash.digest('hex').slice(0, 10), files: ['./', ...files] };
}

/** بيقرا VERSION اللي مكتوبة في sw.js دلوقتي. */
export function currentVersion(root = ROOT) {
  const m = /const VERSION = '([^']*)';/.exec(readFileSync(join(root, 'sw.js'), 'utf8'));
  return m ? m[1] : null;
}

export function stamp(root = ROOT) {
  const { version, files } = compute(root);
  const swPath = join(root, 'sw.js');
  const sw = readFileSync(swPath, 'utf8');
  const block = `// <stamp>\nconst VERSION = '${version}';\nconst FILES = [\n${files.map((f) => `  '${f}',`).join('\n')}\n];\n// </stamp>`;
  const next = sw.replace(/\/\/ <stamp>[\s\S]*?\/\/ <\/stamp>/, block);
  if (next === sw) return { version, changed: false, count: files.length };
  writeFileSync(swPath, next);
  return { version, changed: true, count: files.length };
}

// لو اتشغّل من الترمينال (مش import من الاختبار)
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const r = stamp();
  console.log(r.changed ? `sw.js اتحدّث: نسخة ${r.version}، و${r.count} ملف` : `مفيش جديد: نسخة ${r.version}`);
}
