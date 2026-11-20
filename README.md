# ورقة اليوم

تطبيق ويب للموبايل (PWA) لتسجيل اليوم في ثواني: الوقت، والطاقة، والعادات، والفلوس، والمهام، والأفكار.
بيشتغل من غير نت، والبيانات بتتحفظ على الجهاز نفسه (IndexedDB)، ومفيش أي بيانات في الريبو ده.

HTML وCSS وJavaScript عادي (ES modules)، من غير build ومن غير ولا مكتبة.

## التشغيل على الجهاز

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

وافتح `http://localhost:8765/`. على `localhost` الـ Service Worker مش بيشتغل، عشان أي تعديل يبان على طول.

## الاختبارات

```powershell
node --test
```

## النشر (GitHub Pages)

أول مرة بس: من الريبو على GitHub ← **Settings** ← **Pages** ← **Source: Deploy from a branch** ← الفرع `master` والفولدر `/ (root)` ← **Save**.
بعد دقيقة أو اتنين التطبيق بيبقى على `https://<اسم-المستخدم>.github.io/waraqat-alyawm/`.

### كل ما تعدّل حاجة

```powershell
node tools/stamp-sw.mjs
node --test
git add -A
git commit -m "وصف التعديل"
git push
```

`stamp-sw.mjs` بيحدّث قايمة الملفات ورقم النسخة جوه `sw.js`. من غيره الموبايل هيفضل شغال على النسخة القديمة اللي متخزنة عنده.
والاختبار بيفشل لو نسيته. وبعد الـ push، أول ما تفتح التطبيق على الموبايل هيقولك "فيه نسخة جديدة"، ودوس "حدّث".

## على الموبايل

- **أندرويد (Chrome):** افتح الرابط ← القايمة (⋮) ← **Install app** أو **Add to Home screen**.
- **آيفون (Safari):** افتح الرابط ← زرار المشاركة ← **Add to Home Screen**.

بعد كده افتحه من الأيقونة. هيفتح من غير شريط المتصفح، وهيشتغل وإنت على وضع الطيران.

## الأيقونات

```powershell
python tools/make-icons.py
```

بيرسم الأيقونات في `icons/` (محتاج مكتبة Pillow). وبعدها شغّل `node tools/stamp-sw.mjs`.
