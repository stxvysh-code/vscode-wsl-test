"""Маски для интерактивов на реальных фото студии.

  glc-windows.webp  — маски для Mercedes GLC Coupe (галерея 16):
                      R = задняя полусфера (заднее стекло, задняя дверь, форточка), G = переднее боковое,
                      B = окрашенные панели кузова (для примерки цвета)

  noise-doors.webp  — фото шумоизоляции дверей (услуга 11) без плашки с ценой

Запуск:  python3 tools/masks.py <папка ArtTonir_site_kit> [--debug папка]
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) / "photos" / "gallery"
OUT = ROOT / "assets" / "img" / "tools"
DEBUG = Path(sys.argv[sys.argv.index("--debug") + 1]) if "--debug" in sys.argv else None
BADGE = 72  # значок 2GIS снизу обрезан так же, как в tools/images.py

# ---------- GLC: стёкла (координаты в пикселях исходника 1320×918) ----------
GLC_REAR = [
    # заднее стекло
    [(250, 467.7), (260, 471.7), (290, 478.3), (340, 488.3), (380, 494.3), (406.7, 495), (456.7, 494.3), (470, 491.7),
     (480, 485), (493.3, 473.3), (513.3, 456.7), (530, 441.7), (535, 435), (533.3, 428.3), (523.3, 421.7), (500, 413.3),
     (453.3, 405), (400, 401), (373.3, 404), (323.3, 422), (283.3, 441)],
    # форточка
    [(560, 490), (566, 480), (580, 465), (605, 440), (632.5, 424), (634, 492.5)],
    # стекло задней двери
    [(637.5, 422.5), (660, 410), (700, 397.5), (760, 385), (800, 382), (803, 382.5), (803, 487.5), (637.5, 489)],
]
GLC_FRONT = [
    [(822.5, 381), (870, 382.5), (910, 390), (950, 407.5), (975, 422.5), (990, 440), (998, 462), (993, 480), (850, 488.5), (822.5, 489)],
]


def poly_mask(size, polys, feather=1.2):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon(p, fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather)) if feather else m


def fill_holes(m):
    """Заполняет замкнутые дыры в бинарной маске (блики на стекле)."""
    inv = m.point(lambda v: 0 if v > 127 else 255)
    ImageDraw.floodfill(inv, (0, 0), 128)
    holes = inv.point(lambda v: 255 if v == 255 else 0)
    return ImageChops.lighter(m, holes)


def refine_glass(im, polys, core=10, thr=175):
    """Стекло = полигон ∩ (внутренняя часть ∪ не-белые пиксели): блики внутри остаются стеклом,
    а белый кузов, на который полигон чуть заходит по краю, отрезается."""
    base = poly_mask(im.size, polys, feather=0)
    inner = base.filter(ImageFilter.MinFilter(core * 2 + 1))
    notwhite = im.convert("L").point(lambda v: 255 if v < thr else 0)
    m = ImageChops.multiply(base, ImageChops.lighter(inner, notwhite))
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    return fill_holes(m).filter(ImageFilter.GaussianBlur(1.0))


# Кузов GLC: щедрый силуэт — границу с забором и землёй точно отрезает ключ по яркости/насыщенности
GLC_BODY = [(128, 468), (180, 461), (250, 454), (300, 428), (360, 398), (420, 368), (480, 353), (560, 357), (660, 358),
            (760, 359), (840, 359), (900, 366), (960, 398), (1010, 420), (1040, 436), (1100, 446), (1160, 458), (1200, 476),
            (1226, 505), (1236, 530), (1236, 560), (1234, 612), (1218, 650), (1080, 680), (860, 720), (700, 800), (420, 800), (240, 790),
            (140, 720), (118, 600)]
GLC_WHEELS = [((632, 757), 70), ((1146, 622), 58)]
GLC_TRIM = [[(799, 376), (827, 376), (827, 493), (799, 493)],   # чёрная стойка между дверьми
            [(168, 652), (280, 668), (276, 745), (164, 726)]]   # рамка номера


def keep_main(m, seed):
    """Оставляет только связную область, содержащую seed (убирает крошки на фоне)."""
    b = m.point(lambda v: 255 if v > 127 else 0)
    ImageDraw.floodfill(b, seed, 128)
    return b.point(lambda v: 255 if v == 128 else 0)


def smooth(v, a, b):
    t = min(1.0, max(0.0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


def glc_paint(im, windows):
    """Маска окрашенных панелей: силуэт − стёкла − колёса, × (светлое и не цветное)."""
    sil = poly_mask(im.size, [GLC_BODY], feather=0)
    d = ImageDraw.Draw(sil)
    for (cx, cy), r in GLC_WHEELS:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=0)
    hsv = im.convert("HSV")
    L = im.convert("L")
    keyL = L.point(lambda v: round(255 * smooth(v / 255, 0.47, 0.57)))
    keyS = hsv.getchannel("S").point(lambda v: round(255 * (1 - smooth(v / 255, 0.20, 0.30))))
    key = ImageChops.multiply(keyL, keyS)
    m = ImageChops.multiply(sil, key).point(lambda v: 255 if v > 110 else 0)
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))   # убрать крошки забора
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))   # закрыть щели панелей
    win = ImageChops.lighter(windows.filter(ImageFilter.MaxFilter(5)), poly_mask(im.size, GLC_TRIM, feather=0))
    m = fill_holes(ImageChops.lighter(m, win))      # щели и блики внутри кузова закрываются
    m = keep_main(ImageChops.subtract(m, win), (720, 560))
    return m.filter(ImageFilter.GaussianBlur(0.8))


def glc():
    im = Image.open(SRC / "16_mercedes-glc-coupe-white-rear.jpg").convert("RGB")
    im = im.crop((0, 0, im.width, im.height - BADGE))
    rear = ImageChops.lighter(refine_glass(im, GLC_REAR[:1]), poly_mask(im.size, GLC_REAR[1:]))
    front = poly_mask(im.size, GLC_FRONT)
    paint = glc_paint(im, ImageChops.lighter(rear, front))
    out = Image.merge("RGB", (rear, front, paint))
    out = out.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS)
    out.save(OUT / "glc-windows.webp", "WEBP", lossless=True)
    photo = im.resize(out.size, Image.LANCZOS)
    photo.save(OUT / "glc.webp", "WEBP", quality=84, method=6)
    if DEBUG:
        red = Image.new("RGB", im.size, (255, 0, 40))
        grn = Image.new("RGB", im.size, (0, 255, 120))
        dbg = Image.composite(red, im, rear.point(lambda v: v * 0.55))
        dbg = Image.composite(grn, dbg, front.point(lambda v: v * 0.55))
        dbg.save(DEBUG / "dbg-glc.png")
        blue = Image.new("RGB", im.size, (30, 80, 255))
        Image.composite(blue, im, paint.point(lambda v: v * 0.6)).save(DEBUG / "dbg-glc-paint.png")


def noise():
    """Фото шумоизоляции дверей (услуга 11) без промо-плашки с текстом сверху."""
    im = Image.open(Path(sys.argv[1]) / "photos" / "services" / "11_soundproof-doors.jpg").convert("RGB")
    c = im.crop((0, round(im.height * 0.36), im.width, im.height))
    c = c.resize((900, round(c.height * 900 / c.width)), Image.LANCZOS)
    c.save(OUT / "noise-doors.webp", "WEBP", quality=82, method=6)
    print("noise-doors", c.size)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    glc()
    noise()
    print("ok")
