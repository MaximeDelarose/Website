"""Aka l'archer invocateur : flèches, arc tenu en main, balise et icônes de compétences.

  python3 tools/art16/aka_archer.py

Part de l'atlas d'interface d'origine (tools/art16/orig/ui.png / ui.json) et écrit
echoes-moi/assets/ui.png / ui.json avec :
  - p_arrow, p_arrow_fire, p_arrow_ice : la flèche du pack Ninja Adventure (CC0), ×2 ;
  - bow_held : l'arc du pack (tenu par Aka quand il tire), balise : la balise sentinelle ;
  - i_a_* : les icônes des compétences d'Aka (badge rond, flèche du pack, symbole).
"""
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ASSETS = os.path.join(ROOT, "echoes-moi", "assets")
SRC = os.path.join(HERE, "src", "ninja")
ORIG = os.path.join(HERE, "orig")
OUTLINE = (20, 27, 27, 255)


def load(n):
    return np.array(Image.open(os.path.join(SRC, n)).convert("RGBA"))


def up(a, k=2):
    return np.repeat(np.repeat(a, k, 0), k, 1)


def paste(dst, src, x, y):
    h, w = src.shape[:2]
    for j in range(h):
        for i in range(w):
            if src[j, i, 3] and 0 <= y + j < dst.shape[0] and 0 <= x + i < dst.shape[1]:
                dst[y + j, x + i] = src[j, i]


def tint(a, rgb, k=0.55):
    b = a.copy()
    m = b[..., 3] > 0
    b[m, :3] = (b[m, :3] * (1 - k) + np.array(rgb) * k).astype(np.uint8)
    return b


def outline(a):
    """Contour sombre d'un pixel autour des pixels pleins (style du pack)."""
    h, w = a.shape[:2]
    out = np.zeros((h + 2, w + 2, 4), np.uint8)
    out[1:-1, 1:-1] = a
    op = out[..., 3] > 0
    ring = np.zeros_like(op)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        ring |= np.roll(np.roll(op, dy, 0), dx, 1)
    out[ring & ~op] = OUTLINE
    return out


def balise():
    """Balise sentinelle : piquet de bois cerclé, cristal bleu au sommet (12 × 22)."""
    a = np.zeros((22, 12, 4), np.uint8)
    wood, wood_d, ring = (170, 104, 60, 255), (124, 72, 44, 255), (214, 170, 92, 255)
    for y in range(9, 22):
        a[y, 4:8] = wood
        a[y, 7] = wood_d
    for y in (11, 15, 19):
        a[y, 3:9] = ring
    a[21, 3:9] = wood_d
    gem = [(5, 0), (6, 0), (4, 1), (7, 1), (3, 2), (8, 2), (3, 3), (8, 3), (4, 4), (7, 4), (5, 5), (6, 5)]
    for y in range(1, 8):
        half = 3 - abs(4 - y) if y < 8 else 0
        for x in range(6 - max(1, half), 6 + max(1, half)):
            a[y, x] = (96, 200, 236, 255)
    a[2:4, 5] = (220, 248, 255, 255)
    a[1:8, 7] = np.where(a[1:8, 7, 3:] > 0, (54, 140, 196, 255), a[1:8, 7])
    return outline(a)


def badge(rgb):
    s = 24
    a = np.zeros((s, s, 4), np.uint8)
    c = (s - 1) / 2
    for y in range(s):
        for x in range(s):
            d = np.hypot(x - c, y - c)
            if d <= 11.2:
                k = 1.18 if (x + y) < s - 6 else 0.92
                a[y, x] = (*np.clip(np.array(rgb) * k, 0, 255).astype(np.uint8), 255)
            if 10.2 < d <= 11.2:
                a[y, x] = (*np.clip(np.array(rgb) * 0.55, 0, 255).astype(np.uint8), 255)
    return a


def rot90(a, k):
    return np.rot90(a, k).copy()


def icons(arrow_diag, arrow_h, bal):
    small = arrow_diag[::2, ::2].copy()  # petite flèche (8 × 8)
    out = {}

    def mk(rgb, draw):
        a = badge(rgb)
        draw(a)
        return up(a)

    out["i_a_fleche"] = mk((150, 104, 64), lambda a: paste(a, arrow_diag, 4, 4))
    def recul(a):
        paste(a, arrow_diag, 5, 3)
        for k in range(3):  # traits de recul
            a[15 + k, 4 + k * 2 : 6 + k * 2] = (255, 255, 255, 255)
    out["i_a_recul"] = mk((72, 150, 132), recul)
    out["i_a_balise"] = mk((58, 98, 160), lambda a: paste(a, bal, 6, 1))
    def pluie(a):
        down = rot90(arrow_h, -1)  # flèche vers le bas
        for i, (x, y) in enumerate(((5, 3), (10, 6), (15, 3))):
            paste(a, down, x, y)
    out["i_a_pluie"] = mk((196, 110, 52), pluie)
    out["i_a_givre"] = mk((70, 150, 210), lambda a: paste(a, tint(arrow_diag, (170, 235, 255), 0.6), 4, 4))
    def harpon(a):
        paste(a, rot90(arrow_diag, 2), 4, 4)  # flèche qui revient vers soi
        for k in range(6):
            a[18 - k // 2, 5 + k] = (240, 230, 200, 255)
    out["i_a_harpon"] = mk((128, 84, 170), harpon)
    def leurre(a):
        for r, col in ((8, (255, 255, 255, 255)), (6, (200, 60, 60, 255)), (4, (255, 255, 255, 255)), (2, (200, 60, 60, 255))):
            for y in range(24):
                for x in range(24):
                    if np.hypot(x - 11.5, y - 11.5) <= r:
                        a[y, x] = col
    out["i_a_leurre"] = mk((110, 110, 120), leurre)
    def celeste(a):
        paste(a, rot90(arrow_h, -1), 9, 6)
        for (x, y) in ((5, 5), (17, 4), (16, 15), (6, 16)):
            a[y, x] = a[y - 1, x] = a[y + 1, x] = a[y, x - 1] = a[y, x + 1] = (255, 236, 140, 255)
    out["i_a_celeste"] = mk((70, 60, 130), celeste)
    def dispersion(a):
        for k, (x, y) in enumerate(((13, 3), (13, 13), (3, 13), (3, 3))):
            paste(a, rot90(small, -k), x, y)
    out["i_a_dispersion"] = mk((96, 170, 214), dispersion)
    def balises(a):
        b = bal[::2, ::2].copy()
        paste(a, b, 5, 7)
        paste(a, b, 13, 7)
        a[12, 9:13] = (230, 200, 255, 255)
    out["i_a_balises"] = mk((150, 90, 190), balises)
    return out


def main():
    atlas = np.array(Image.open(os.path.join(ORIG, "ui.png")).convert("RGBA"))
    meta = json.load(open(os.path.join(ORIG, "ui.json")))
    fr = meta["frames"]
    arrow_h = load("BowArrow.png")  # 13 × 5, pointe à droite
    arrow_diag = load("ProjectileArrow.png")  # 16 × 16, en diagonale
    bow = load("BowSprite.png")  # 15 × 7

    # flèches en vol (même place et même taille de case : 32 × 12)
    for key, col in (("p_arrow", None), ("p_arrow_fire", (255, 140, 40)), ("p_arrow_ice", (140, 220, 255))):
        f = fr[key]["frame"]
        cell = np.zeros((f["h"], f["w"], 4), np.uint8)
        a = up(arrow_h if col is None else tint(arrow_h, col, 0.45))
        paste(cell, a, (f["w"] - a.shape[1]) // 2, (f["h"] - a.shape[0]) // 2)
        atlas[f["y"] : f["y"] + f["h"], f["x"] : f["x"] + f["w"]] = cell

    bal = balise()
    new = {"bow_held": up(bow), "balise": up(bal)}
    new.update(icons(arrow_diag, arrow_h, bal))

    # nouvelles pièces rangées sous l'atlas d'origine
    H0 = atlas.shape[0]
    x, y, shelf = 0, H0 + 2, 0
    pos = {}
    for k, a in new.items():
        h, w = a.shape[:2]
        if x + w > atlas.shape[1]:
            x, y, shelf = 0, y + shelf + 2, 0
        pos[k] = (x, y)
        x += w + 2
        shelf = max(shelf, h)
    H = y + shelf
    sheet = np.zeros((H, atlas.shape[1], 4), np.uint8)
    sheet[:H0] = atlas
    for k, (x, y) in pos.items():
        h, w = new[k].shape[:2]
        sheet[y : y + h, x : x + w] = new[k]
        fr[k] = {"frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False,
                 "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}}
    meta["meta"]["size"] = {"w": atlas.shape[1], "h": H}
    Image.fromarray(sheet).save(os.path.join(ASSETS, "ui.png"))
    json.dump(meta, open(os.path.join(ASSETS, "ui.json"), "w"))
    return list(new)


if __name__ == "__main__":
    print("ui :", main())
