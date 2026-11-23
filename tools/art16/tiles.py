"""Tuiles de terrain 16×16, même disposition que l'actuel terrain.png (16 colonnes × 6 lignes) :

  0–4  herbe            5–7  herbe fleurie      8–11  herbe sombre (forêt)
  16–31 transitions herbe sombre   32–47 chemin   48–63 pavés   64–79 eau (A)   80–95 eau (B)

Transitions par coins : tuile = début de série + masque (1 haut-gauche, 2 haut-droite,
4 bas-gauche, 8 bas-droite). Le bord est tramé et souligné d'une couleur de lisière.
"""

import math

from canvas import Img
from palette import bayer

T = 16


def _hash(ix, iy, seed):
    h = (ix * 374761393 + iy * 668265263 + seed * 982451653) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 0xFFFF


def noise(x, y, cell=4, seed=0, period=T):
    """Bruit de valeur lissé, raccordé sur une tuile (période 16)."""
    n = period // cell
    fx, fy = x / cell, y / cell
    ix, iy = math.floor(fx), math.floor(fy)
    tx, ty = fx - ix, fy - iy
    tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)

    def g(a, b):
        return _hash(a % n, b % n, seed)

    top = g(ix, iy) * (1 - tx) + g(ix + 1, iy) * tx
    bot = g(ix, iy + 1) * (1 - tx) + g(ix + 1, iy + 1) * tx
    return top * (1 - ty) + bot * ty


# --- matières -----------------------------------------------------------------------------------


def grass(x, y, v=0, dark=False):
    base, lo, hi = ("leaf1", "leaf0", "leaf2") if dark else ("leaf3", "leaf2", "leaf4")
    n = noise(x, y, 4, 11 + v * 7) * 0.7 + noise(x, y, 8, 3) * 0.3
    if n > 0.62 and bayer(x, y) < (n - 0.62) * 4:
        return hi
    if n < 0.36 and bayer(x, y) < (0.36 - n) * 4:
        return lo
    return base


def dirt(x, y):
    n = noise(x, y, 4, 21)
    if n > 0.66 and bayer(x, y) < (n - 0.6) * 3:
        return "sand"
    if n < 0.3 and bayer(x, y) < 0.5:
        return "wood2"
    return "wood3"


def stone(x, y):
    # pavés en quinconce 8×4 (2 rangées par tuile de 16), joints sombres
    row = y // 4
    off = 4 if row % 2 else 0
    if y % 4 == 3 or (x + off) % 8 == 7:
        return "stone0"
    n = noise(x, y, 4, 31)
    if (y % 4 == 0 or (x + off) % 8 == 0) and n > 0.35:
        return "stone3"
    return "stone2" if n > 0.4 or bayer(x, y) < 0.5 else "stone1"


def water(x, y, frame=0):
    n = noise(x, y, 8, 41)
    col = "blue2" if n > 0.45 or bayer(x, y) < 0.35 else "blue1"
    # vaguelettes : petits traits clairs qui glissent d'une image à l'autre
    sx = (x + frame * 3) % T
    if (y % 8 == 2 and sx in (3, 4, 5)) or (y % 8 == 6 and sx in (10, 11, 12)):
        col = "blue3"
    return col


MATERIALS = {
    # nom: (début de série, remplissage, couleur de lisière, largeur de lisière)
    "dark": (16, lambda x, y, f: grass(x, y, 0, dark=True), "leaf2", 0.0),
    "path": (32, lambda x, y, f: dirt(x, y), "wood1", 0.12),
    "stone": (48, lambda x, y, f: stone(x, y), "stone0", 0.1),
    "waterA": (64, lambda x, y, f: water(x, y, 0), "blue4", 0.14),
    "waterB": (80, lambda x, y, f: water(x, y, 1), "blue4", 0.14),
}


def autotile(mask, fill, rim, rim_w, frame=0, seed=5):
    img = Img(T, T)
    tl, tr, bl, br = mask & 1, (mask >> 1) & 1, (mask >> 2) & 1, (mask >> 3) & 1
    for y in range(T):
        for x in range(T):
            u, v = (x + 0.5) / T, (y + 0.5) / T
            val = tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v
            val += (noise(x, y, 4, seed) - 0.5) * 0.3
            d = val + (bayer(x, y) - 0.5) * 0.22
            if d > 0.5:
                img.px(x, y, rim if (rim_w and d < 0.5 + rim_w) else fill(x, y, frame))
    return img


def terrain_tiles():
    """Les 96 tuiles, dans l'ordre des index."""
    tiles = [Img(T, T) for _ in range(96)]
    for k in range(5):
        t = tiles[k]
        for y in range(T):
            for x in range(T):
                t.px(x, y, grass(x, y, k))
        # touffes
        for (tx, ty) in [((3 + k * 5) % 13 + 1, (5 + k * 3) % 12 + 2), ((9 + k * 3) % 13 + 1, (11 + k * 7) % 12 + 2)][: 1 + k % 2]:
            t.px(tx, ty, "leaf4")
            t.px(tx + 1, ty - 1, "leaf5")
            t.px(tx + 2, ty, "leaf4")
    flowers = [("gold2", "gold3"), ("red2", "red3"), ("violet2", "violet3")]
    for k, (a, b) in enumerate(flowers):
        t = tiles[5 + k]
        t.blit(tiles[k], 0, 0)
        for fx, fy in ((4 + k * 3, 5), (11 - k, 11), (7, 9 + k)):
            t.px(fx, fy, a)
            t.px(fx + 1, fy, b)
            t.px(fx, fy + 1, a)
            t.px(fx + 1, fy + 1, "leaf2")
    for k in range(4):
        t = tiles[8 + k]
        for y in range(T):
            for x in range(T):
                t.px(x, y, grass(x, y, k + 3, dark=True))
        t.px((5 + k * 4) % 14 + 1, (7 + k * 5) % 12 + 2, "leaf3")
    for name, (start, fill, rim, rim_w) in MATERIALS.items():
        frame = 1 if name == "waterB" else 0
        for mask in range(1, 16):
            tiles[start + mask] = autotile(mask, fill, rim, rim_w, frame, seed=start)
    return tiles
