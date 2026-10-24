"""Schemazeichnungen für scripts/tests/fixtures/netzwerk9/assets – selbst erzeugt, keine Fremdfotos.
Flache Darstellung, Palette aus dem Kurs (#0F766E), 900x600, weißer Grund."""
import sys
from PIL import Image, ImageDraw

W, H = 900, 600
BG = (255, 255, 255)
TEAL = (15, 118, 110)
TEAL_L = (204, 236, 231)
INK = (30, 41, 59)
GREY = (148, 163, 184)
GREY_L = (226, 232, 240)
ORANGE = (217, 164, 65)


def canvas():
    im = Image.new("RGB", (W, H), BG)
    return im, ImageDraw.Draw(im)


def rbox(d, box, r, fill, outline=None, width=4):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def waves(d, cx, cy, radii, color, width=10, start=200, end=340):
    for r in radii:
        d.arc((cx - r, cy - r, cx + r, cy + r), start=start, end=end, fill=color, width=width)


def ports(d, x0, y, n, w=44, h=34, gap=14, lit=()):
    for i in range(n):
        x = x0 + i * (w + gap)
        rbox(d, (x, y, x + w, y + h), 6, GREY_L, INK, 3)
        d.rectangle((x + 10, y + h - 10, x + w - 10, y + h - 4), fill=INK)
        if i in lit:
            d.ellipse((x + w - 14, y + 6, x + w - 6, y + 14), fill=TEAL)


def router():
    im, d = canvas()
    rbox(d, (170, 300, 730, 470), 28, TEAL_L, TEAL, 6)
    ports(d, 230, 390, 4, lit=(0, 2))
    for x in (640, 690):
        d.ellipse((x - 10, 400 - 10, x + 10, 400 + 10), fill=TEAL)
    # zwei Antennen
    for x in (260, 640):
        d.rounded_rectangle((x - 12, 150, x + 12, 300), radius=12, fill=INK)
        d.ellipse((x - 18, 130, x + 18, 166), fill=INK)
    waves(d, 450, 300, (70, 120, 170), TEAL, 10, 215, 325)
    return im


def switch():
    im, d = canvas()
    rbox(d, (120, 250, 780, 400), 22, GREY_L, INK, 6)
    ports(d, 170, 300, 8, w=58, h=46, gap=16, lit=(0, 1, 3, 5))
    # Kabel, die nach unten zu Geräten laufen
    for i, x in enumerate((199, 273, 421, 569)):
        d.line((x, 400, x, 500), fill=TEAL, width=8)
        rbox(d, (x - 40, 500, x + 40, 540), 8, TEAL_L, TEAL, 4)
    d.line((450, 160, 450, 250), fill=TEAL, width=8)
    rbox(d, (380, 110, 520, 160), 10, TEAL_L, TEAL, 4)
    return im


def accesspoint():
    im, d = canvas()
    d.ellipse((300, 320, 600, 520), fill=TEAL_L, outline=TEAL, width=6)
    d.ellipse((430, 405, 470, 435), fill=TEAL)
    waves(d, 450, 330, (110, 180, 250), TEAL, 12, 215, 325)
    d.line((450, 520, 450, 580), fill=INK, width=8)
    d.line((300, 580, 600, 580), fill=INK, width=8)
    return im


def endgeraete():
    im, d = canvas()
    # Laptop
    rbox(d, (90, 220, 390, 400), 14, GREY_L, INK, 5)
    rbox(d, (110, 240, 370, 380), 6, TEAL_L, TEAL, 3)
    rbox(d, (60, 400, 420, 430), 10, INK)
    # Handy
    rbox(d, (470, 180, 600, 440), 24, INK)
    rbox(d, (485, 210, 585, 400), 10, TEAL_L)
    d.ellipse((528, 410, 542, 424), fill=GREY)
    # Drucker
    rbox(d, (640, 290, 860, 420), 14, GREY_L, INK, 5)
    rbox(d, (680, 230, 820, 300), 6, BG, INK, 4)
    rbox(d, (690, 400, 810, 470), 6, BG, INK, 4)
    d.ellipse((820, 320, 840, 340), fill=TEAL)
    return im


def kabel():
    im, d = canvas()
    # Stecker
    rbox(d, (320, 180, 580, 420), 18, GREY_L, INK, 6)
    rbox(d, (380, 110, 520, 190), 10, GREY_L, INK, 6)
    for i in range(8):
        x = 350 + i * 26
        d.rectangle((x, 380, x + 14, 420), fill=ORANGE)
    # Kabel
    d.line((450, 420, 450, 520), fill=TEAL, width=22)
    d.arc((300, 440, 600, 600), start=0, end=180, fill=TEAL, width=22)
    return im


def buchse():
    im, d = canvas()
    rbox(d, (250, 150, 650, 480), 26, GREY_L, INK, 6)
    rbox(d, (310, 230, 590, 400), 14, BG, INK, 5)
    for x in (360, 450, 540):
        rbox(d, (x - 28, 290, x + 28, 350), 6, TEAL_L, TEAL, 4)
        d.rectangle((x - 8, 330, x + 8, 350), fill=INK)
    d.ellipse((440, 420, 460, 440), fill=GREY)
    # Wandlinie
    d.line((120, 520, 780, 520), fill=INK, width=6)
    return im


OUT = sys.argv[1]
for name, fn in [("router", router), ("switch", switch), ("accesspoint", accesspoint),
                 ("endgeraete", endgeraete), ("kabel", kabel), ("buchse", buchse)]:
    fn().save(f"{OUT}/{name}.png", optimize=True)
    print(name)
