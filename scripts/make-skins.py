"""Builds the Skin sheets (public/art/characters-skin1.png and -skin2.png).

Each sheet has the layout of characters.png, but only the five Companions in the
top row, recolored by gradient maps. A rule picks pixels with soft weights on hue,
saturation and value (and optionally a hand-drawn polygon of the cell), then maps
their lightness onto a dark -> light color ramp. Soft weights avoid speckles, and
every ramp is stretched over the lightness range its own pixels really use, so the
original shading and detail survive. Edge pixels borrow the color of their opaque
neighbors first, so no fringe of the old colors is left behind.

Run: python scripts/make-skins.py [preview.png]   (needs pillow and numpy)
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "art" / "characters.png"
COMPANIONS = ["miso", "luna", "pip", "clover", "ember"]


def hexrgb(c):
    return np.array([int(c[i : i + 2], 16) for i in (1, 3, 5)], dtype=float)


def rule(ramp, hue=None, sat=(0, 1), val=(0.2, 1), poly=None, hf=14):
    """A rule without ramp keeps its pixels as they are. hue is (from, to) degrees and may wrap, e.g. (340, 15); poly is [(x, y)...] in cell pixels."""
    return dict(ramp=[hexrgb(c) for c in ramp] if ramp else None, hue=hue, sat=sat, val=val, poly=poly, hf=hf)


def box(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def band(x, lo, hi, f):
    return np.clip((x - (lo - f)) / f, 0, 1) * np.clip(((hi + f) - x) / f, 0, 1)


def hue_band(h, lo, hi, f=14):
    if lo > hi:
        hi += 360
    c, half = (lo + hi) / 2, (hi - lo) / 2
    d = np.abs(((h - c + 180) % 360) - 180)
    return np.clip((half + f - d) / f, 0, 1)


def fill_edges(rgb, alpha):
    """Gives translucent edge pixels the color of the nearest opaque ones."""
    ok = alpha >= 230
    out = np.where(ok[..., None], rgb, 0.0)
    shifts = [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
    for _ in range(8):
        if ok.all():
            break
        k = ok.astype(float)
        num = sum(np.roll(out * k[..., None], s, (0, 1)) for s in shifts)
        den = sum(np.roll(k, s, (0, 1)) for s in shifts)
        new = (~ok) & (den > 0)
        out[new] = num[new] / den[new][:, None]
        ok = ok | new
    return out


def to_hsv(rgb):
    r, g, b = rgb[..., 0] / 255, rgb[..., 1] / 255, rgb[..., 2] / 255
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn
    s = np.where(mx == 0, 0, d / np.maximum(mx, 1e-9))
    dd = np.maximum(d, 1e-9)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    return np.where(d == 0, 0, h), s, mx


def poly_mask(poly, shape):
    img = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(img).polygon(poly, fill=255)
    return np.asarray(img.filter(ImageFilter.GaussianBlur(1.3)), dtype=float) / 255


def gradient(t, stops):
    pos = t * (len(stops) - 1)
    i = np.clip(np.floor(pos).astype(int), 0, len(stops) - 2)
    f = (pos - i)[..., None]
    arr = np.stack(stops)
    return arr[i] * (1 - f) + arr[i + 1] * f


LEVELS = 6


# Yellow irises keep their color so the eyes never melt into a dark fur or cloak.
EYES = rule(None, hue=(42, 60), sat=(0.5, 1), val=(0.5, 1), hf=3)


def apply(cell, rules, extra=None):
    rules = [EYES, *rules]
    rgba = np.asarray(cell, dtype=float)
    alpha = rgba[..., 3]
    own = rgba[..., :3]
    rgb = fill_edges(own, alpha)
    h, s, v = to_hsv(rgb)
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255
    out = rgb.copy()
    rem = (alpha > 0).astype(float)
    for ru in rules:
        w = band(s, ru["sat"][0], ru["sat"][1], 0.06) * band(v, ru["val"][0], ru["val"][1], 0.05)
        if ru["hue"]:
            w = w * hue_band(h, *ru["hue"], ru["hf"])
        if ru["poly"]:
            w = w * poly_mask(ru["poly"], v.shape)
        w = w * rem
        if ru["ramp"] is None:
            rem = rem * (1 - w)
            continue
        core = w > 0.5
        lo, hi = np.percentile(lum[core], [4, 96]) if core.sum() > 40 else (0.1, 0.9)
        t = np.clip((lum - lo) / max(hi - lo, 0.05), 0, 1)
        t = np.round(t * (LEVELS - 1)) / (LEVELS - 1)  # flat bands, like the original pixel art
        out += w[..., None] * (gradient(t, ru["ramp"]) - out)
        rem = rem * (1 - w)
    # A translucent edge pixel is a blend with black: keep its darkness, take the new hue.
    fill_lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]).clip(min=1)
    own_lum = 0.299 * own[..., 0] + 0.587 * own[..., 1] + 0.114 * own[..., 2]
    edge = (alpha < 230) & (alpha > 0)
    out[edge] *= np.clip(own_lum / fill_lum, 0, 1)[edge][:, None]
    if extra:
        extra(out)
    res = np.concatenate([np.clip(out, 0, 255), alpha[..., None]], -1)
    return Image.fromarray(res.astype(np.uint8), "RGBA")


# Black fur keeps a lighter top end so the shading and the outline stay readable.
BLACK = ["#101018", "#1c1c28", "#2c2c3c", "#464a5e"]
WHITE = ["#8f94ae", "#c4c8dc", "#eceef8", "#ffffff"]
OUTLINE = (24, 12, 16)
CREAM = dict(hue=(5, 42), sat=(0.1, 1), val=(0.5, 1), hf=6)  # Pursian's fur
GRAYFUR = dict(hue=(260, 25), sat=(0.04, 0.45), val=(0.2, 0.78))  # Tuntun's fur


def heart(out, cx, cy, px=3):
    rows = ["01100110", "11111111", "11111111", "01111110", "00111100", "00011000"]
    for r, row in enumerate(rows):
        for c, on in enumerate(row):
            if on == "1":
                x, y = cx + (c - 4) * px, cy + (r - 3) * px
                out[y : y + px, x : x + px] = OUTLINE


# Rule order matters: earlier rules claim their pixels first.
SKINS = {
    # Miso: orange tabby in steel armor with a red scarf.
    "miso": [
        # Iron Warden: blue-gray tabby, steel-blue armor, white scarf.
        [
            rule(None, val=(0, 1), poly=box(150, 270, 197, 312)),  # leather panel keeps its color
            rule(["#6c7088", "#a4a8c0", "#d6d9ea", "#f6f7ff"], hue=(350, 6), sat=(0.45, 1), hf=5, poly=box(0, 150, 340, 300)),
            rule(["#1e2638", "#3a4a6c", "#6a80a8", "#aebcd6"], hue=(12, 38), sat=(0.45, 1), val=(0.4, 1), hf=6),
            rule(["#8e98b4", "#bec6da", "#e4e8f4", "#fbfcff"], hue=(350, 50), sat=(0.08, 0.6), val=(0.7, 1)),
            rule(["#18243c", "#34548c", "#5f88c4", "#b4cef0"], sat=(0, 0.22), val=(0.3, 1)),
        ],
        # Golden Aegis: cream tabby, gold armor, royal-purple scarf.
        [
            rule(None, val=(0, 1), poly=box(150, 270, 197, 312)),  # leather panel keeps its color
            rule(["#2a1a52", "#503c9c", "#7e66d8", "#c0b0ff"], hue=(350, 6), sat=(0.45, 1), hf=5, poly=box(0, 150, 340, 300)),
            rule(["#5e402a", "#a67e52", "#dfba88", "#fbe9c6"], hue=(12, 38), sat=(0.45, 1), val=(0.4, 1), hf=6),
            rule(["#c4a070", "#eacfa0", "#fbe9c6", "#fffbef"], hue=(350, 50), sat=(0.08, 0.6), val=(0.7, 1)),
            rule(["#4e3810", "#a5761c", "#dcae2e", "#fff0a0"], sat=(0, 0.22), val=(0.3, 1)),
        ],
    ],
    # Luna: lavender cat in a purple witch outfit.
    "luna": [
        # Nightshade: near-black cat, deep indigo robe.
        [
            rule(["#164c5c", "#2c8ea4", "#62c8dc", "#b8f0fa"], hue=(270, 345), sat=(0.12, 1), val=(0.45, 1), poly=box(201, 120, 230, 154)),  # iris
            rule(["#403e58", "#6c6a88", "#9a98b4", "#cac8de"], hue=(345, 30), sat=(0.04, 0.4), val=(0.78, 1), hf=8, poly=box(140, 90, 300, 215)),
            rule(BLACK, hue=(270, 350), sat=(0, 0.38), val=(0.5, 1)),
            rule(["#0a0c28", "#1a2064", "#3a44ae", "#8896ff"], hue=(255, 350), sat=(0.3, 1), hf=10),
        ],
        # Persian Eclipse: white fluffy cat, midnight robe.
        [
            rule(["#7a4010", "#c47a1c", "#f0b840", "#ffe8a0"], hue=(270, 345), sat=(0.12, 1), val=(0.45, 1), poly=box(201, 120, 230, 154)),  # iris
            rule(["#8085a8", "#bcc0dc", "#e8eaf8", "#ffffff"], hue=(270, 350), sat=(0, 0.38), val=(0.5, 1)),
            rule(["#070b26", "#13206a", "#2c46b0", "#7c9ef2"], hue=(255, 350), sat=(0.3, 1), hf=10),
        ],
    ],
    # Pursian: cream cat in a green hood.
    "pip": [
        # Tuxedo: black hood, ears, mask and tail; white blaze, muzzle, chest and paws.
        [
            rule(BLACK, poly=box(140, 60, 215, 152), **CREAM),  # left ear
            rule(BLACK, poly=box(240, 80, 300, 150), **CREAM),  # right ear
            rule(BLACK, poly=box(50, 220, 130, 320), **CREAM),  # tail
            rule(BLACK, poly=[(180, 138), (244, 138), (252, 160), (238, 205), (205, 210), (182, 190)], **CREAM),  # left eye patch
            rule(BLACK, poly=[(270, 138), (300, 138), (300, 205), (284, 210), (268, 190), (264, 160)], **CREAM),  # right eye patch
            rule(["#0c0c14", "#1c1c28", "#30303f", "#52526a"], hue=(62, 120), sat=(0.25, 1)),  # hood
            rule(WHITE, poly=box(140, 60, 300, 235), hue=(5, 50), sat=(0.08, 0.6), val=(0.55, 1)),  # head
            rule(WHITE, poly=box(150, 268, 192, 312), hue=(5, 50), sat=(0.08, 0.6), val=(0.55, 1)),  # left hand
            rule(WHITE, poly=box(246, 266, 288, 310), hue=(5, 50), sat=(0.08, 0.6), val=(0.55, 1)),  # right hand
            rule(WHITE, poly=box(110, 335, 300, 395), hue=(5, 50), sat=(0.08, 0.6), val=(0.55, 1)),  # legs
        ],
        # Desert Nomad: terracotta hood.
        [
            rule(["#3a1912", "#7a3424", "#b8623a", "#eba06c"], hue=(62, 120), sat=(0.25, 1)),
        ],
    ],
    # Mei: calico in a green cloak.
    "clover": [
        # Frost Healer: ice-blue cloak, silver-gray patches.
        [
            rule(["#1a3260", "#3c76b6", "#84bce8", "#e2f4ff"], hue=(62, 118), sat=(0.25, 1), poly=box(0, 172, 397, 396)),
            rule(["#4c566c", "#8794ac", "#bcc6dc", "#e8eef8"], hue=(8, 40), sat=(0.5, 1), val=(0.45, 1), poly=box(0, 0, 397, 175)),
            rule(["#4c566c", "#8794ac", "#bcc6dc", "#e8eef8"], hue=(8, 40), sat=(0.5, 1), val=(0.45, 1), poly=box(30, 262, 120, 365)),
            rule(["#1c2236", "#2e3a56", "#48587c", "#7084aa"], hue=(260, 350), sat=(0.15, 0.6), val=(0.2, 0.5), poly=box(0, 0, 397, 175)),
            rule(["#1c2236", "#2e3a56", "#48587c", "#7084aa"], hue=(260, 350), sat=(0.15, 0.6), val=(0.2, 0.5), poly=box(30, 262, 120, 365)),
        ],
        # Field Medic: red cloak.
        [
            rule(["#50101a", "#a82434", "#e0525e", "#ffa8a8"], hue=(62, 118), sat=(0.25, 1), poly=box(0, 172, 397, 396)),
        ],
    ],
    # Tuntun: black fighter, red headband, gold gloves.
    "ember": [
        # Karate Master: gray cat like Tuna, white muzzle, chest and paws, white gi, black mitts.
        [
            rule(WHITE, poly=[(236, 150), (300, 148), (300, 192), (258, 196), (238, 172)], **GRAYFUR),
            rule(WHITE, poly=[(188, 198), (246, 196), (252, 236), (236, 256), (200, 256), (186, 230)], sat=(0, 0.6), val=(0.2, 1)),
            rule(WHITE, poly=box(104, 358, 160, 395), **GRAYFUR),
            rule(WHITE, poly=box(264, 358, 330, 395), **GRAYFUR),
            rule(["#0e0e14", "#1e1e28", "#34343f", "#575868"], poly=[(108, 238), (135, 218), (165, 220), (190, 238), (192, 285), (165, 303), (130, 290), (106, 268)]),  # left mitts
            rule(["#0e0e14", "#1e1e28", "#34343f", "#575868"], poly=[(262, 218), (298, 200), (342, 208), (356, 250), (340, 294), (296, 299), (264, 262)]),  # right mitts
            rule(["#8f94ae", "#c4c8dc", "#eceef8", "#ffffff"], hue=(345, 8), sat=(0.4, 1), hf=6),
            rule(["#a0a4bc", "#d0d4e6", "#f0f2fa", "#ffffff"], hue=(14, 48), sat=(0.12, 0.5), val=(0.7, 1), poly=box(120, 170, 195, 225)),
            rule(["#a0a4bc", "#d0d4e6", "#f0f2fa", "#ffffff"], hue=(14, 48), sat=(0.12, 0.5), val=(0.7, 1), poly=box(100, 330, 330, 372)),
            rule(["#16161e", "#2c2c38", "#4e5064", "#8a8ea6"], **GRAYFUR),
        ],
        # Shaolin Monk: saffron robes, warm brown fur.
        [
            rule(["#642400", "#b4500a", "#f08a1e", "#ffd47a"], hue=(335, 18), sat=(0.4, 1)),
            rule(["#2c1a10", "#5a3b22", "#8e653f", "#c49a6a"], **GRAYFUR),
        ],
    ],
}

EXTRA = {("ember", 0): lambda out: heart(out, 277, 160)}


def build():
    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    sheets = []
    for k in (0, 1):
        sheet = Image.new("RGBA", src.size, (0, 0, 0, 0))
        for i, cat in enumerate(COMPANIONS):
            cell_box = (round(i * w / 5), 0, round((i + 1) * w / 5), h // 2)
            sheet.paste(apply(src.crop(cell_box), SKINS[cat][k], EXTRA.get((cat, k))), cell_box[:2])
        sheets.append(sheet)
    return src, sheets


if __name__ == "__main__":
    src, sheets = build()
    for k, sheet in enumerate(sheets, 1):
        sheet.save(ROOT / "public" / "art" / f"characters-skin{k}.png", optimize=True)
    if len(sys.argv) > 1:
        w, h = src.size
        prev = Image.new("RGBA", (w, h // 2 * 3), (58, 62, 74, 255))
        for n, im in enumerate((src, *sheets)):
            prev.alpha_composite(im.crop((0, 0, w, h // 2)), (0, n * (h // 2)))
        prev.save(sys.argv[1])
