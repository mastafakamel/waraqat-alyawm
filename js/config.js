// config.js — بيانات مشروع Supabase للمزامنة. الاتنين فاضيين = المزامنة مقفولة والتطبيق شغال على الجهاز بس.
// المفتاح ده هو المفتاح العام (Publishable key): معمول عشان يبقى في كود الموقع، والحماية من RLS في قاعدة البيانات.
// أي مفتاح بيبدأ بـ sb_secret_ عمره ما يتحط هنا ولا في أي ملف.
// (خطوات عمل المشروع في README.md)

export const SUPABASE_URL = 'https://omeswcfoouwyqodjhhrk.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_6WJiQFxiv9ME-MvmXTai9w_6t2VeBH2';

// مفتاح الإشعارات العام (Web Push VAPID public key — فاضي = إشعارات الخلفية مقفولة لحد ما يتولّد).
// بيتولّد مرة واحدة بـ  node tools/make-vapid.mjs  (والمفتاح السري بيتحط في Supabase Secrets بس، مش هنا أبداً).
export const VAPID_PUBLIC_KEY = 'BOV0GcavxqoQPeFU4RTtWiLiAobQHVfQ0czvEsOwbBk97nu7fpN_O2lxS8nLk1bJ0OuQ-3UwD-VkIABbr9zC7cs';
