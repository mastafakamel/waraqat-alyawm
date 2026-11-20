// report — تقرير الذكاء الاصطناعي لورقة اليوم (Supabase Edge Function).
//
// التطبيق بيبعت { kind: 'day' | 'week', digest: ملخص نصي } بجلسة الدخول، والدالة:
//   ١. CORS: بتقبل من موقع التطبيق بس.
//   ٢. بتخصم تقرير من حد اليوم (take_ai_quota في قاعدة البيانات). الدالة دي بتشتغل بجلسة المستخدم،
//      فلو الجلسة مش صح بترجع 401 قبل ما أي حاجة توصل لـ Groq.
//   ٣. بتبعت الملخص لـ Groq بتعليمات ثابتة، وترجّع { text, left, model }.
//
// الإعدادات (Edge Functions ← Secrets):
//   GROQ_API_KEY  إجباري. عمره ما يتحط في كود الموقع.
//   GROQ_MODEL    اختياري. لو Groq شال الموديل، غيّره هنا من غير ما تعدّل الكود.
// والخطوات كاملة في README.md (قسم "تقرير الذكاء الاصطناعي").

const ORIGINS = ['https://mastafakamel.github.io', 'http://localhost:8765', 'http://127.0.0.1:8765'];
const MODEL = Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-120b';
const GROQ_KEY = Deno.env.get('GROQ_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const MAX_DIGEST = 12000; // حروف. الأسبوع كله أقل من كده بكتير

const RULES = `اكتب بالعامية المصرية، وكلّم صاحب اليوم بـ "إنت".
القواعد:
- اعتمد على اللي في الملخص بس. ماتخترعش أرقام ولا أحداث.
- كل ملاحظة لازم تبقى مربوطة برقم أو جملة من الملخص.
- البند اللي مش متسجل قول إنه مش متسجل، من غير لوم ولا وعظ.
- مفيش تشخيص طبي أو نفسي، ومفيش نصايح عامة زي "اشرب مية كتير".
- اكتب نص عادي: من غير markdown، ومن غير نجوم ولا #. العنوان سطر لوحده آخره ":"، والبند سطر أوله "- ".`;

const PROMPTS: Record<string, string> = {
  day: `إنت بتحلل يوم واحد من "ورقة اليوم"، وده تطبيق تسجيل يومي شخصي.
${RULES}
- خليك قصير: ١٥٠ كلمة بالكتير.
الشكل بالظبط:
اليوم في سطرين:
(سطرين)
اللي مشي كويس:
- (بند أو اتنين)
اللي محتاج يتحسن:
- (بند أو اتنين)
ملاحظة:
(علاقة بين حاجتين في اليوم، زي النوم والطاقة، أو مقارنة بامبارح لو موجود)
خطوة لبكرة:
(حاجة واحدة صغيرة ومحددة)`,
  week: `إنت بتحلل آخر ٧ أيام من "ورقة اليوم"، وده تطبيق تسجيل يومي شخصي.
${RULES}
- خليك قصير: ٣٠٠ كلمة بالكتير.
- لو أيام كتير مش متسجلة، قول كده في الأول، وماتعمّمش من يوم أو اتنين.
الشكل بالظبط:
الأسبوع في ٣ سطور:
(٣ سطور)
أحسن ٣ حاجات:
- (٣ بنود)
أضعف ٣ حاجات:
- (٣ بنود)
أنماط لاحظتها:
- (بند أو اتنين، كل واحد فيه رقمين بيتحركوا مع بعض، زي النوم والمزاج أو الشاشة والطاقة)
للأسبوع الجاي:
- (٣ حاجات صغيرة ومحددة)`,
};

function cors(req: Request): Record<string, string> {
  const o = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const h = cors(req);
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } });
  const fail = (status: number, code: string, message: string) => reply({ code, message }, status);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return fail(405, 'method', 'POST بس');
  if (!GROQ_KEY) return fail(500, 'ai_key', 'GROQ_API_KEY مش موجود في Secrets');

  let kind = '';
  let digest = '';
  try {
    const b = await req.json();
    kind = String(b.kind || '');
    digest = String(b.digest || '');
  } catch { /* تحت */ }
  if (!PROMPTS[kind] || digest.length < 10 || digest.length > MAX_DIGEST) return fail(400, 'bad_request', 'الطلب ناقص أو كبير');

  // ٢. حد اليوم، بجلسة المستخدم نفسه (نفس الـ apikey والـ Authorization اللي التطبيق بعتهم)
  const q = await fetch(`${SUPABASE_URL}/rest/v1/rpc/take_ai_quota`, {
    method: 'POST',
    headers: {
      apikey: req.headers.get('apikey') || '',
      Authorization: req.headers.get('Authorization') || '',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (q.status === 401 || q.status === 403) return fail(401, 'signed_out', 'لازم تدخل بحسابك');
  if (!q.ok) return fail(500, 'quota_error', `take_ai_quota: ${q.status}`);
  const left = Number(await q.json());
  if (left < 0) return fail(429, 'ai_quota', 'خلصت تقارير النهارده');

  // ٣. Groq (نفس شكل OpenAI)
  const reasoning = MODEL.includes('gpt-oss'); // موديلات بتفكّر قبل ما ترد: نخلّي التفكير قليل ومايرجعش في الرد
  let g: Response;
  try {
    g = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: PROMPTS[kind] }, { role: 'user', content: digest }],
        temperature: 0.4,
        max_completion_tokens: 2500,
        ...(reasoning ? { reasoning_effort: 'low', include_reasoning: false } : {}),
      }),
      signal: AbortSignal.timeout(40_000),
    });
  } catch {
    return fail(504, 'ai_timeout', 'Groq ماردّش');
  }
  if (!g.ok) {
    const t = (await g.text()).slice(0, 300);
    if (g.status === 429) return fail(429, 'ai_busy', 'Groq: وصلت حد الخطة المجانية دلوقتي');
    if (g.status === 401 || g.status === 403) return fail(500, 'ai_key', 'مفتاح Groq مش شغال');
    if (g.status === 404 || /model/i.test(t)) return fail(500, 'ai_model', `الموديل ${MODEL} مش متاح: ${t}`);
    return fail(502, 'ai_error', `Groq ${g.status}: ${t}`);
  }
  const data = await g.json();
  const text = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!text) return fail(502, 'ai_empty', 'Groq رجّع رد فاضي');
  return reply({ text, left, model: MODEL });
});
