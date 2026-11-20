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

## المزامنة (Supabase)

من غيرها التطبيق شغال عادي، وكل حاجة على الجهاز بس. معاها الموبايل واللابتوب بيبقوا نفس البيانات. الخطة المجانية كفاية جداً، والكود فيه حد ٤٠٠ طلب في اليوم عشان مانعدّيهاش أبداً.

### ١. المشروع
1. ادخل [supabase.com](https://supabase.com) بحساب GitHub، واعمل **New project** (الخطة Free).
2. اختار باسورد لقاعدة البيانات واحفظه في مكان آمن، واختار أقرب منطقة (Frankfurt مثلاً).

### ٢. الجدول (SQL Editor ← New query ← الصق ← Run)

```sql
-- ورقة اليوم: جدول واحد. كل صف = مستند (يوم أو قايمة) لمستخدم واحد
create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at bigint not null,                    -- وقت التعديل على الجهاز (آخر تعديل يكسب)
  synced_at timestamptz not null default now(),  -- وقت وصوله للسيرفر (منه الجهاز بيعرف إيه الجديد)
  primary key (user_id, id)
);
create index if not exists docs_user_synced on public.docs (user_id, synced_at);

-- كل واحد يشوف ويعدّل بياناته هو بس
alter table public.docs enable row level security;
create policy "own docs" on public.docs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.docs to authenticated;

-- الرفع: كذا مستند في طلب واحد. المستند بيتكتب بس لو أحدث من اللي موجود
create or replace function public.put_docs(p_docs jsonb)
returns void language sql security invoker set search_path = public as $$
  insert into public.docs (user_id, id, data, updated_at, synced_at)
  select auth.uid(), d->>'id', d->'data', (d->>'updated_at')::bigint, now()
  from jsonb_array_elements(p_docs) as d
  where (d->>'id') ~ '^(day/[0-9]{4}-[0-9]{2}-[0-9]{2}|list/(tasks|ideas|metrics|periods))$'
  on conflict (user_id, id) do update
    set data = excluded.data, updated_at = excluded.updated_at, synced_at = now()
    where public.docs.updated_at < excluded.updated_at;
$$;
revoke execute on function public.put_docs(jsonb) from public, anon;
grant execute on function public.put_docs(jsonb) to authenticated;
```

### ٣. الإيميل يبعت كود بدل لينك
**Authentication ← Emails (Templates)**: في قالب **Magic Link** وقالب **Confirm signup**، حط الكود في الرسالة بدل اللينك، مثلاً:

```html
<h2>كود الدخول لورقة اليوم</h2>
<p style="font-size:28px;letter-spacing:4px"><b>{{ .Token }}</b></p>
<p>الكود بيخلص بعد ساعة.</p>
```

ليه كود مش لينك: على آيفون، التطبيق اللي على الشاشة الرئيسية تخزينه منفصل عن Safari، فاللينك هيفتح في Safari والدخول مش هيوصل للتطبيق.

خدمة الإيميل المجانية في Supabase بتبعت بس لإيميلات أعضاء المشروع، وعدد قليل في الساعة. فادخل بنفس الإيميل اللي عملت بيه حساب Supabase.

### ٤. ربط التطبيق
من **Project Settings ← API Keys** (أو **API**) خد:
- **Project URL** (زي `https://abcd.supabase.co`)
- المفتاح العام: **anon public** أو **Publishable key**. **مش** `service_role` ولا Secret key أبداً.

وحطهم في `js/config.js`، وبعدها `node tools/stamp-sw.mjs` وcommit وpush. المفتاح العام معمول عشان يبقى في كود الموقع، والحماية جاية من RLS اللي فوق.

### ٥. الدخول
في التطبيق: **الإعدادات ← المزامنة**، اكتب إيميلك، وهيوصلك كود من ٦ أرقام. اعمل كده على الموبايل وعلى اللابتوب.

لو المشروع ماتستخدمش أسبوع، Supabase بيوقفه. التطبيق بيكمّل شغال على الجهاز ويقول "المزامنة واقفة"، وبترجّعه بزرار **Resume** من الـ dashboard.
