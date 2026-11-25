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
drop policy if exists "own docs" on public.docs; -- عشان الـ SQL ينفع يتشغّل تاني من غير غلط
create policy "own docs" on public.docs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.docs to authenticated;

-- الرفع: كذا مستند في طلب واحد. المستند بيتكتب بس لو أحدث من اللي موجود
create or replace function public.put_docs(p_docs jsonb)
returns void language sql security invoker set search_path = public as $$
  insert into public.docs (user_id, id, data, updated_at, synced_at)
  select auth.uid(), d->>'id', d->'data', (d->>'updated_at')::bigint, now()
  from jsonb_array_elements(p_docs) as d
  where (d->>'id') ~ '^(day/[0-9]{4}-[0-9]{2}-[0-9]{2}|list/(tasks|ideas|metrics|periods|goals|settings))$'
  on conflict (user_id, id) do update
    set data = excluded.data, updated_at = excluded.updated_at, synced_at = now()
    where public.docs.updated_at < excluded.updated_at;
$$;
revoke execute on function public.put_docs(jsonb) from public, anon;
grant execute on function public.put_docs(jsonb) to authenticated;
```

### ٣. الدخول من غير إيميلات
الدخول بإيميل وباسورد، ومفيش أي إيميل بيتبعت. عشان كده لازم تقفل التأكيد بالإيميل:
**Authentication ← Sign In / Providers ← Email**: اقفل **Confirm email**، و**Save**.

ليه مش كود أو لينك على الإيميل: Supabase مابقاش بيسمح تعدّل قالب الإيميل من غير سيرفر إيميل خاص (SMTP)، والقالب الافتراضي بيبعت لينك. واللينك على آيفون بيفتح في Safari، وتخزينه منفصل عن التطبيق اللي على الشاشة الرئيسية، فالدخول مش هيوصل للتطبيق.

### ٤. ربط التطبيق
من **Project Settings ← API Keys** (أو **API**) خد:
- **Project URL** (زي `https://abcd.supabase.co`)
- المفتاح العام: **anon public** أو **Publishable key**. **مش** `service_role` ولا Secret key أبداً.

وحطهم في `js/config.js`، وبعدها `node tools/stamp-sw.mjs` وcommit وpush. المفتاح العام معمول عشان يبقى في كود الموقع، والحماية جاية من RLS اللي فوق.

### ٥. الدخول
1. في التطبيق: **الإعدادات ← المزامنة**، اكتب إيميلك وباسورد قوي (٨ حروف على الأقل، واحفظه في password manager)، ودوس **أول مرة؟ اعمل حساب**. ده بيتعمل مرة واحدة بس.
2. بعدها على أي جهاز تاني: نفس الإيميل والباسورد ← **دخول**.
3. **اقفل عمل الحسابات الجديدة** عشان محدش غيرك يقدر يعمل حساب في مشروعك: **Authentication ← Sign In / Providers**، اقفل **Allow new users to sign up**، و**Save**.

لو المشروع ماتستخدمش أسبوع، Supabase بيوقفه. التطبيق بيكمّل شغال على الجهاز ويقول "المزامنة واقفة"، وبترجّعه بزرار **Resume** من الـ dashboard.

## تقرير الذكاء الاصطناعي (Groq)

في تبويبة اليوم، تحت "آخر اليوم": **تقرير اليوم** و**تقرير الأسبوع**. التطبيق بيجهّز ملخص اللي سجلته (من غير اسمك ولا إيميلك)، ودالة صغيرة على Supabase اسمها `report` بتبعته لـ Groq وترجّع التقرير. والتقرير بيتحفظ جوه اليوم، فبيتزامن بين الأجهزة.

ليه Groq: الخطة المجانية بتاعته بتقول إنه مابيدرّبش على بياناتك، وفيها Zero Data Retention. أما Gemini المجاني فشروطه بتقول ماتبعتش بيانات شخصية.
وليه دالة على السيرفر: مفتاح Groq لو اتحط في كود الموقع، أي حد يفتح الموقع ياخده.

المزامنة لازم تكون شغالة الأول (القسم اللي فوق)، لأن الدالة بتعرفك من جلسة الدخول.

### تقرير ١: مفتاح Groq
1. [console.groq.com](https://console.groq.com) ← **API Keys** ← **Create API Key**. انسخه مرة واحدة واحفظه في password manager.
   **ماتلزقوش في الشات ولا في أي ملف.** مكانه الوحيد Supabase (تقرير ٤).
2. **Settings ← Data Controls**: شغّل **Zero Data Retention**.

### تقرير ٢: حد التقارير (SQL Editor ← New query ← الصق ← Run)

ده SQL **جديد**، غير بتاع جدول المزامنة اللي فوق. أول سطر فيه بيقول "تقرير الذكاء الاصطناعي". وينفع يتشغّل أكتر من مرة عادي.

```sql
-- تقرير الذكاء الاصطناعي: عدّاد لكل مستخدم في اليوم (بتوقيت القاهرة)
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  n int not null default 0,
  primary key (user_id, day)
);
-- RLS شغال ومفيش ولا policy: محدش يقرا الجدول أو يعدّله مباشرة، الدالة اللي تحت بس
alter table public.ai_usage enable row level security;

-- بتزوّد العدّاد وترجّع فاضل كام، ولو الحد خلص بترجّع -1. الحد (٦ في اليوم) مكتوب هنا، فمحدش يقدر يغيّره من برّه
create or replace function public.take_ai_quota()
returns int language plpgsql security definer set search_path = public as $$
declare
  cap constant int := 6;
  v int;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.ai_usage (user_id, day, n)
  values (auth.uid(), (now() at time zone 'Africa/Cairo')::date, 1)
  on conflict (user_id, day) do update set n = public.ai_usage.n + 1
  returning n into v;
  return case when v > cap then -1 else cap - v end;
end $$;
revoke execute on function public.take_ai_quota() from public, anon;
grant execute on function public.take_ai_quota() to authenticated;
```

### تقرير ٣: الدالة
1. **Edge Functions ← Deploy a new function ← Via Editor**.
2. الاسم بالظبط: `report`. امسح الكود اللي فيها، والصق كل اللي في [`supabase/functions/report/index.ts`](supabase/functions/report/index.ts)، ودوس **Deploy**.
3. من صفحة الدالة: اقفل **Verify JWT** واحفظ. الدالة بتتأكد من الجلسة بنفسها (`take_ai_quota` بترفض أي حد مش داخل)، والتحقق ده لو فضل شغال ممكن يرفض طلبات المتصفح.

محرر الـ dashboard مفيهوش تاريخ نسخ، فالنسخة الأصلية هي اللي في الريبو. ولو الملف اتعدّل، الصقه تاني و**Deploy**.

### تقرير ٤: المفتاح في Supabase
**Edge Functions ← Secrets ← Add new secret**: الاسم `GROQ_API_KEY`، والقيمة مفتاح Groq ← **Save**.

اختياري: `GROQ_MODEL` لو عايز موديل غير `openai/gpt-oss-120b`. Groq بيشيل موديلات من وقت للتاني، ولو ده حصل التطبيق هيقولك "الموديل ده مابقاش موجود"، فتغيّر القيمة دي بس. الموديلات المتاحة في [console.groq.com/docs/models](https://console.groq.com/docs/models).

### تقرير ٥: جرّب
الطلب ده بيسأل الدالة: "هتقبل طلبات من موقعي؟" (preflight):

```powershell
curl.exe -i -X OPTIONS https://omeswcfoouwyqodjhhrk.supabase.co/functions/v1/report -H "Origin: https://mastafakamel.github.io"
```

المفروض أول سطر فيه `200`، وتحت `access-control-allow-origin: https://mastafakamel.github.io`. وبعدها من التطبيق: **اليوم ← تقرير اليوم**.

**الحدود:** ٦ تقارير في اليوم من الـ SQL (والتقرير اللي بيفشل من Groq بيتحسب برضه، عشان أي غلطة بتكرر الطلب ماتعدّيش الحد). ولو Groq نفسه وصل حده المجاني، بيرجّع 429 من غير أي فلوس، والتطبيق بيقول "جرّب كمان دقيقة".

## التنبيهات والتفاعل (إشعارات الموبايل)

التطبيق فيه مستويين من التفاعل على أندرويد (من **الإعدادات ← التنبيهات والتفاعل**):
- **شغّال فوراً من غير أي إعداد:** قائمة مهام النهارده في ستارة الإشعارات بزرار **`✓ خلّصت أول مهمة`**، ورقم المهام المفتوحة على الأيقونة (Badge)، واختصارات الدوسة الطويلة على الأيقونة، والاهتزاز الخفيف.
- **إشعارات أوقات العادات وملخص الصبح وقفلة اليوم (والتطبيق مقفول — Web Push):** محتاجة الخطوات السريعة دي مرة واحدة في Supabase:

### تنبيهات ١: توليد مفاتيح VAPID و CRON_SECRET
شغّل على جهازك مرة واحدة:

```powershell
node tools/make-vapid.mjs
```

هيطبعلك ٣ قيم:
1. حط `VAPID_PUBLIC_KEY` في `js/config.js` (المفتاح العام بس).
2. شغّل `node tools/stamp-sw.mjs` واعمل commit وpush.
3. **ماتحطش `VAPID_PRIVATE_KEY` ولا `CRON_SECRET` في أي ملف في الريبو.** مكانهم الوحيد Supabase Secrets.

### تنبيهات ٢: جداول الإشعارات والجدولة (SQL Editor ← New query ← الصق ← Run)
استبدل `<CRON_SECRET>` تحت بنفس القيمة اللي طلعها السكربت:

```sql
-- اشتراكات إشعارات الأجهزة (كل مستخدم يشوف ويدير أجهزته بس)
create table if not exists public.push_subs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, endpoint),
  unique (endpoint)
);
alter table public.push_subs enable row level security;
drop policy if exists "own push subs" on public.push_subs;
create policy "own push subs" on public.push_subs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.push_subs to authenticated;
grant select, delete on public.push_subs to service_role;
grant select on public.docs to service_role;

-- سجل منع تكرار نفس التذكير مرتين في نفس اليوم (للسيرفر بس)
create table if not exists public.push_log (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);
alter table public.push_log enable row level security;
grant select, insert on public.push_log to service_role;

-- جدولة دالة notify كل ٥ دقايق تلقائياً
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('waraqa-notify') where exists (select 1 from cron.job where jobname = 'waraqa-notify');
select cron.schedule(
  'waraqa-notify',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://omeswcfoouwyqodjhhrk.supabase.co/functions/v1/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### تنبيهات ٣: رفع الدالة والأسرار
1. **Edge Functions ← Deploy a new function ← Via Editor**، الاسم بالظبط: `notify`. الصق محتوى [`supabase/functions/notify/index.ts`](supabase/functions/notify/index.ts) ← **Deploy**.
2. من صفحة الدالة `notify`: اقفل **Verify JWT** واحفظ (الدالة بتتحقق بنفسها من الجلسة أو من `x-cron-secret`).
3. **Edge Functions ← Secrets**: ضيف الـ ٣ أسرار: `VAPID_PUBLIC_KEY` و `VAPID_PRIVATE_KEY` و `CRON_SECRET`.
4. افتح التطبيق على موبايلك ← **الإعدادات ← التنبيهات والتفاعل** ← **فعّل إشعارات الموبايل** ← **جرّب إشعار من السيرفر**.
