# tools/make-icons.py — بيرسم أيقونات ورقة اليوم بألوان DESIGN.md (الوضع الغامق).
# التشغيل من فولدر المشروع:  python tools/make-icons.py
# الشكل: ورقة فاتحة عليها "خط اليوم": خط رأسي و٤ دواير (خلصت، خلصت، دلوقتي، لسه) وجنب كل دايرة سطر.
# بنرسم على ٢٠٤٨ وبعدين نصغّر، عشان الحواف تطلع ناعمة.

from pathlib import Path
from PIL import Image, ImageDraw

BG = (15, 18, 21)        # --bg غامق
PAGE = (236, 234, 228)   # --ink غامق (فاتح)
LINE = (190, 194, 200)   # خط الوقت والسطور
MINT = (15, 108, 68)     # --mint فاتح (غامق كفاية على الورقة)
AMBER = (138, 83, 10)    # --amber فاتح
HOLLOW = (150, 156, 164)

S = 2048
OUT = Path(__file__).resolve().parent.parent / 'icons'


def draw(scale):
    """scale = حجم الورقة بالنسبة للأيقونة. الـ maskable محتاجة الشكل جوه دايرة ٨٠٪ من النص."""
    im = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(im)
    w, h = S * 0.50 * scale, S * 0.62 * scale
    x0, y0 = (S - w) / 2, (S - h) / 2
    x1, y1 = x0 + w, y0 + h
    r = S * 0.05 * scale
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=PAGE)

    # خط الوقت على اليمين (الكتابة عربي)
    lx = x1 - w * 0.24
    top, bot = y0 + h * 0.18, y0 + h * 0.84
    d.line([(lx, top), (lx, bot)], fill=LINE, width=int(S * 0.012 * scale))
    dots = [(MINT, 'f'), (MINT, 'f'), (AMBER, 'now'), (HOLLOW, 'o')]
    for i, (c, kind) in enumerate(dots):
        cy = top + (bot - top) * i / 3
        rr = S * (0.045 if kind == 'now' else 0.034) * scale
        if kind == 'o':
            d.ellipse([lx - rr, cy - rr, lx + rr, cy + rr], fill=PAGE, outline=c, width=int(S * 0.012 * scale))
        else:
            d.ellipse([lx - rr, cy - rr, lx + rr, cy + rr], fill=c)
        # سطر الكلام جنب الدايرة (على الشمال)، والسطر اللي "دلوقتي" أطول
        bl = w * (0.52 if kind == 'now' else 0.40 if i % 2 == 0 else 0.30)
        bh = S * 0.026 * scale
        bx1 = lx - S * 0.075 * scale
        d.rounded_rectangle([bx1 - bl, cy - bh / 2, bx1, cy + bh / 2], radius=bh / 2, fill=AMBER if kind == 'now' else LINE)
    return im


def save(im, size, name):
    im.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
    print('icons/' + name, size)


OUT.mkdir(exist_ok=True)
normal = draw(1.12)     # الأندرويد بيقص الحواف أو بيحطها في دايرة، والآيفون بيدوّر الزوايا
maskable = draw(0.82)   # أصغر شوية عشان يفضل جوه منطقة الأمان لما الأندرويد يقصّه دايرة
save(normal, 512, 'icon-512.png')
save(normal, 192, 'icon-192.png')
save(normal, 180, 'apple-touch-icon.png')
save(normal, 32, 'favicon-32.png')
save(maskable, 512, 'icon-maskable-512.png')
