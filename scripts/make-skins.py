"""Builds the Skin sheets (public/art/characters-skin1.png and -skin2.png).

Each sheet has the layout of characters.png, but only the five Companions in the
top row, recolored by gradient maps: every rule picks pixels by hue / saturation /
value (and optionally a box of the cell) and remaps their brightness onto a
dark -> mid -> light color ramp, so the original shading survives.

Run: python scripts/make-skins.py [preview.png]   (needs pillow and numpy)
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "art" / "characters.png"
COMPANIONS = ["miso", "luna", "pip", "clover", "ember"]


def hexrgb(c):
    return np.array([int(c[i : i + 2], 16) for i in (1, 3, 5)], dtype=float)


def ramp(dark, mid, light):
    return [hexrgb(dark), hexrgb(mid), hexrgb(light)]


def rule(ramp_, hue=None, sat=(0, 1), val=(0.18, 1), box=None):
    """hue is (from, to) in degrees and wraps (350, 20) around red."""
    return dict(ramp=ramp_, hue=hue, sat=sat, val=val, box=box)


def apply(cell, rules):
    rgba = np.asarray(cell, dtype=float)
    rgb = rgba[..., :3] / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    v, s = mx, np.where(mx == 0, 0, d / np.maximum(mx, 1e-9))
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(v)
    nz = d > 0
    h = np.where(nz & (mx == r), ((g - b) / np.maximum(d, 1e-9)) % 6, h)
    h = np.where(nz & (mx == g), (b - r) / np.maximum(d, 1e-9) + 2, h)
    h = np.where(nz & (mx == b), (r - g) / np.maximum(d, 1e-9) + 4, h) * 60
    hh, ww = v.shape
    yy, xx = np.mgrid[0:hh, 0:ww]
    out = rgba.copy()
    taken = np.zeros(v.shape, bool)
    for ru in rules:
        m = (
            (rgba[..., 3] > 0)
            & ~taken
            & (s >= ru["sat"][0])
            & (s <= ru["sat"][1])
            & (v >= ru["val"][0])
            & (v <= ru["val"][1])
        )
        if ru["hue"]:
            a, z = ru["hue"]
            m &= ((h >= a) & (h <= z)) if a <= z else ((h >= a) | (h <= z))
        if ru["box"]:
            x0, y0, x1, y1 = ru["box"]
            m &= (xx >= x0 * ww) & (xx <= x1 * ww) & (yy >= y0 * hh) & (yy <= y1 * hh)
        t = np.clip((v - 0.15) / 0.8, 0, 1)[m]
        lo, mi, hi = ru["ramp"]
        t2 = t[:, None]
        col = np.where(t2 < 0.5, lo + (mi - lo) * (t2 / 0.5), mi + (hi - mi) * ((t2 - 0.5) / 0.5))
        out[m, :3] = col
        taken |= m
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def fur(*, box=None, hue=(10, 45), sat=(0.15, 1), val=(0.55, 1)):
    return dict(box=box, hue=hue, sat=sat, val=val)


# Rule order matters: the first rule that claims a pixel wins.
SKINS = {
    # Miso: orange tabby in steel armor with a red scarf.
    "miso": [
        # Iron Warden: blue-gray tabby, steel-blue armor, royal-blue scarf.
        [
            rule(ramp("#1a2a44", "#3f66a8", "#8fb6f0"), hue=(345, 15), sat=(0.45, 1)),  # scarf
            rule(ramp("#262c3a", "#5b6a86", "#a9b8d4"), hue=(12, 45), sat=(0.45, 1), val=(0.45, 1)),  # fur
            rule(ramp("#1c2a44", "#4a6aa0", "#b4cdf2"), sat=(0, 0.22), val=(0.3, 1)),  # armor
        ],
        # Golden Aegis: cream tabby, gold armor, white scarf.
        [
            rule(ramp("#8a8a96", "#d8d8e4", "#ffffff"), hue=(345, 15), sat=(0.45, 1)),  # scarf
            rule(ramp("#6a4a2a", "#d8b078", "#f8e8c0"), hue=(12, 45), sat=(0.45, 1), val=(0.45, 1)),  # fur
            rule(ramp("#5a4210", "#c8982a", "#fce080"), sat=(0, 0.22), val=(0.3, 1)),  # armor
        ],
    ],
    # Luna: lavender cat in a purple witch outfit.
    "luna": [
        # Nightshade: near-black cat, indigo robe.
        [
            rule(ramp("#0c0c18", "#2a2a42", "#5a5a7e"), hue=(270, 345), sat=(0, 0.36), val=(0.55, 1)),  # fur
            rule(ramp("#0a0a22", "#262668", "#5c5cc0"), hue=(260, 345), sat=(0.36, 1), val=(0.18, 1)),  # robe
        ],
        # Persian Eclipse: white fluffy cat, midnight robe with silver light.
        [
            rule(ramp("#9aa0c0", "#e0e4f4", "#ffffff"), hue=(270, 345), sat=(0, 0.36), val=(0.55, 1)),  # fur
            rule(ramp("#060c2a", "#16286a", "#6a84d0"), hue=(260, 345), sat=(0.36, 1), val=(0.18, 1)),  # robe
        ],
    ],
    # Pursian: cream cat in a green hood.
    "pip": [
        # Tuxedo: black and white, charcoal hood.
        [
            rule(ramp("#08080a", "#16161c", "#32323e"), hue=(10, 45), sat=(0.15, 1), val=(0.5, 1), box=(0.378, 0.19, 0.54, 0.34)),
            rule(ramp("#08080a", "#16161c", "#32323e"), hue=(10, 45), sat=(0.15, 1), val=(0.5, 1), box=(0.617, 0.222, 0.735, 0.34)),
            rule(ramp("#08080a", "#16161c", "#32323e"), hue=(10, 45), sat=(0.15, 1), val=(0.5, 1), box=(0.49, 0.35, 0.735, 0.425)),
            rule(ramp("#08080a", "#16161c", "#32323e"), hue=(10, 45), sat=(0.15, 1), val=(0.5, 1), box=(0.14, 0.568, 0.32, 0.795)),
            rule(ramp("#101014", "#2a2a34", "#52526a"), hue=(50, 110), sat=(0.3, 1)),  # hood, tunic
            rule(ramp("#a8a8b8", "#e8e8f0", "#ffffff"), hue=(10, 45), sat=(0.1, 0.5), val=(0.6, 1)),  # fur
        ],
        # Desert Nomad: terracotta hood and tunic.
        [
            rule(ramp("#4a1c10", "#a8472a", "#e8935c"), hue=(50, 110), sat=(0.3, 1)),
        ],
    ],
    # Mei: calico in a green cloak.
    "clover": [
        # Frost Healer: ice-blue cloak, silver patches.
        [
            rule(ramp("#1e3a66", "#5a9ad0", "#d4ecff"), hue=(50, 110), sat=(0.3, 1)),  # cloak
            rule(ramp("#5a6070", "#a8b0c4", "#e4eaf6"), hue=(12, 45), sat=(0.6, 1), val=(0.45, 1)),  # patches
        ],
        # Field Medic: red cloak.
        [
            rule(ramp("#5a1010", "#c02a2a", "#ff7a70"), hue=(50, 110), sat=(0.3, 1)),
        ],
    ],
    # Tuntun: black fighter, red headband, gold gloves.
    "ember": [
        # Karate Master: gray-and-white fur, white gi, red mitts.
        [
            rule(ramp("#b8b8c8", "#f0f0f8", "#ffffff"), hue=(270, 360), sat=(0.05, 0.4), val=(0.2, 0.75), box=(0.617, 0.384, 0.756, 0.49)),  # white patch
            rule(ramp("#b8b8c8", "#f0f0f8", "#ffffff"), hue=(270, 360), sat=(0.05, 0.4), val=(0.2, 0.75), box=(0.47, 0.5, 0.62, 0.63)),  # white patch
            rule(ramp("#b8b8c8", "#f0f0f8", "#ffffff"), hue=(270, 360), sat=(0.05, 0.4), val=(0.2, 0.75), box=(0.27, 0.9, 0.4, 1)),  # white patch
            rule(ramp("#b8b8c8", "#f0f0f8", "#ffffff"), hue=(270, 360), sat=(0.05, 0.4), val=(0.2, 0.75), box=(0.67, 0.9, 0.83, 1)),  # white patch
            rule(ramp("#a8a8b8", "#e8e8f0", "#ffffff"), hue=(345, 15), sat=(0.45, 1)),  # headband, gi
            rule(ramp("#5a0c0c", "#c01818", "#f05050"), hue=(15, 50), sat=(0.55, 1), val=(0.5, 1), box=(0, 0.5, 1, 0.8)),  # mitts
            rule(ramp("#34343e", "#6a6a78", "#aaaab8"), hue=(270, 360), sat=(0.1, 0.4), val=(0.2, 0.7)),  # fur
        ],
        # Shaolin Monk: saffron robes, tan fur.
        [
            rule(ramp("#7a3000", "#e07a10", "#ffc048"), hue=(345, 15), sat=(0.45, 1)),
            rule(ramp("#3a2010", "#7a5230", "#c09060"), hue=(270, 360), sat=(0.1, 0.4), val=(0.2, 0.7)),
        ],
    ],
}


# Tuntun's Karate Master wears Lia's black heart on the nose: (cell x, cell y) of its center.
HEART = ["01100110", "11111111", "11111111", "01111110", "00111100", "00011000"]
HEARTS = {("ember", 0): (277, 160)}


def draw_heart(cell, cx, cy, px=3):
    for r, row in enumerate(HEART):
        for c, on in enumerate(row):
            if on == "1":
                x, y = cx + (c - 4) * px, cy + (r - 3) * px
                cell.paste((24, 12, 16, 255), (x, y, x + px, y + px))


def build():
    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    sheets = []
    for k in (0, 1):
        sheet = Image.new("RGBA", src.size, (0, 0, 0, 0))
        for i, cat in enumerate(COMPANIONS):
            box = (round(i * w / 5), 0, round((i + 1) * w / 5), h // 2)
            cell = apply(src.crop(box), SKINS[cat][k])
            if (cat, k) in HEARTS:
                draw_heart(cell, *HEARTS[(cat, k)])
            sheet.paste(cell, box[:2])
        sheets.append(sheet)
    return src, sheets


if __name__ == "__main__":
    src, sheets = build()
    for k, sheet in enumerate(sheets, 1):
        sheet.save(ROOT / "public" / "art" / f"characters-skin{k}.png", optimize=True)
    if len(sys.argv) > 1:
        w, h = src.size
        prev = Image.new("RGBA", (w, h // 2 * 3), (60, 64, 76, 255))
        for n, im in enumerate((src, *sheets)):
            prev.alpha_composite(im.crop((0, 0, w, h // 2)), (0, n * (h // 2)))
        prev.save(sys.argv[1])
