#!/usr/bin/env python3
"""Generate Android launcher icons for TDS from assets/icon.png.

Produces, for every density (mdpi..xxxhdpi):
  - ic_launcher.png            legacy square, full bleed
  - ic_launcher_round.png      circular-masked (transparent corners)
  - ic_launcher_foreground.png adaptive foreground, full bleed
and sets @color/ic_launcher_background to a colour sampled from the art so
that masked adaptive corners blend in.

Usage:  python gen-icon.py        (needs Pillow: pip install Pillow)
Swap assets/icon.png (>=1024x1024) and re-run to re-brand.
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "assets", "icon.png")
RES = os.path.join(HERE, "android", "app", "src", "main", "res")

img = Image.open(SRC).convert("RGBA")
side = min(img.size)
left, top = (img.width - side) // 2, (img.height - side) // 2
img = img.crop((left, top, left + side, top + side))
MASTER = 1024
master = img.resize((MASTER, MASTER), Image.LANCZOS)


def avg_region(im, box):
    return im.crop(box).resize((1, 1), Image.LANCZOS).getpixel((0, 0))


c, s = MASTER, 120
corners = [avg_region(master, b) for b in
           [(0, 0, s, s), (c - s, 0, c, s), (0, c - s, s, c), (c - s, c - s, c, c)]]
bg = tuple(sum(ch[i] for ch in corners) // len(corners) for i in range(3))
bg_hex = "#%02X%02X%02X" % bg


def circle_mask(size):
    ss = size * 4
    m = Image.new("L", (ss, ss), 0)
    ImageDraw.Draw(m).ellipse((0, 0, ss - 1, ss - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)


legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
fg = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

for dens, sz in legacy.items():
    d = os.path.join(RES, "mipmap-" + dens)
    sq = master.resize((sz, sz), Image.LANCZOS)
    sq.convert("RGB").save(os.path.join(d, "ic_launcher.png"))
    rnd = sq.copy()
    rnd.putalpha(circle_mask(sz))
    rnd.save(os.path.join(d, "ic_launcher_round.png"))
    master.resize((fg[dens], fg[dens]), Image.LANCZOS).save(
        os.path.join(d, "ic_launcher_foreground.png"))
    print("wrote", dens)

with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">%s</color>\n</resources>\n' % bg_hex)
print("background", bg_hex, "- DONE")
