"""Готовит фото для сайта: обрезает значок 2GIS снизу, ресайзит, сохраняет в WebP.

Запуск:  python3 tools/images.py <папка ArtTonir_site_kit>
"""
import sys, os, shutil
from pathlib import Path
from PIL import Image, ImageOps

SRC = Path(sys.argv[1]) / "photos"
OUT = Path(__file__).resolve().parent.parent / "assets" / "img"

# фото клиентов (09, 11) не публикуем без их согласия
SKIP = ("09_", "11_")
BADGE_CROP = 72  # px снизу — там значок «2GIS»


MANIFEST = {}


def save(im, path, width, q=80):
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.width > width:
        h = round(im.height * width / im.width)
        im = im.resize((width, h), Image.LANCZOS)
    im.save(path, "WEBP", quality=q, method=6)
    MANIFEST[str(path.relative_to(OUT.parent.parent)).replace(os.sep, "/")] = [im.width, im.height]


def main():
    for f in sorted((SRC / "gallery").glob("*.jpg")):
        if f.name.startswith(SKIP):
            continue
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        im = im.crop((0, 0, im.width, im.height - BADGE_CROP))
        stem = f.stem
        save(im, OUT / "gallery" / f"{stem}-1280.webp", 1280, 78)
        save(im, OUT / "gallery" / f"{stem}-640.webp", 640, 74)
    for f in sorted((SRC / "services").glob("*.jpg")):
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        save(im, OUT / "services" / f"{f.stem}-800.webp", 800, 80)
        save(im, OUT / "services" / f"{f.stem}-400.webp", 400, 76)
    # логотип
    (OUT / "logo").mkdir(parents=True, exist_ok=True)
    shutil.copy(SRC / "logo" / "logo_round_vector.svg", OUT / "logo" / "logo.svg")
    logo = Image.open(SRC / "logo" / "logo_round_upscaled_776px.png").convert("RGBA")
    for s in (32, 180, 512):
        logo.resize((s, s), Image.LANCZOS).save(OUT / "logo" / f"logo-{s}.png")
    plate = Image.open(SRC / "logo" / "ref_plate-frame-ART-TONIR-TUNING-STUDIO.jpg").convert("RGB")
    save(plate, OUT / "logo" / "plate-frame.webp", 760, 82)
    emblem = Image.open(SRC / "logo" / "ref_full-emblem-on-studio-wall.jpg").convert("RGB")
    save(emblem, OUT / "logo" / "emblem-wall.webp", 447, 82)
    # картинка для соцсетей 1200x630
    og = Image.open(SRC / "gallery" / "08_white-suv-in-studio_wrap-process.jpg").convert("RGB")
    og = og.crop((0, 0, og.width, og.height - BADGE_CROP))
    og = ImageOps.fit(og, (1200, 630), Image.LANCZOS, centering=(0.5, 0.35))
    og.save(OUT / "og.jpg", "JPEG", quality=84, optimize=True)
    import json
    (OUT / "manifest.json").write_text(json.dumps(MANIFEST, indent=1, sort_keys=True))


if __name__ == "__main__":
    main()
