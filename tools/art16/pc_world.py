"""Monde d'Echoes of Aether (Max version) dans le style Pixel Crawler, en 16 px par case.

  python3 tools/art16/pc_world.py

Écrit, à partir des images Pixel Crawler de echoes-moi/assets/pc/ :
  - echoes-moi/assets/terrain.png : les 96 tuiles du terrain, MÊME disposition que l'original
    (herbe 0–11, transitions par coins : herbe sombre 16–31, chemin 32–47, pavés 48–63,
    eau 64–79 et 80–95), en 16 px agrandis ×2 (une case du jeu = 32 unités) ;
  - echoes-moi/assets/objects.png / objects.json : l'atlas d'objets d'origine
    (tools/art16/orig/) où arbres, buissons, rochers, fleurs, champignons et herbes hautes sont
    remplacés par ceux du pack, eux aussi ×2.
Le code du jeu n'a pas besoin de changer : mêmes noms, mêmes index, origine en bas au centre.
"""

import json
import math
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ASSETS = os.path.join(ROOT, "echoes-moi", "assets")
PC = os.path.join(ASSETS, "pc")
ORIG = os.path.join(HERE, "orig")
T = 16  # taille d'une tuile en pixels d'art
UP = 2  # agrandissement vers les unités du jeu (case = 32)


def load(name):
    return np.array(Image.open(os.path.join(PC, name)).convert("RGBA"))


def crop(a, x, y, w, h):
    return a[y : y + h, x : x + w].copy()


# --- bruit raccordé sur une tuile (pour des bords organiques mais continus d'une tuile à l'autre) ---
def _hash(ix, iy, seed):
    h = (ix * 374761393 + iy * 668265263 + seed * 982451653) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 0xFFFF


def noise(x, y, cell=4, seed=0):
    n = T // cell
    fx, fy = x / cell, y / cell
    ix, iy = math.floor(fx), math.floor(fy)
    tx, ty = fx - ix, fy - iy
    tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    g = lambda a, b: _hash(a % n, b % n, seed)
    return (g(ix, iy) * (1 - tx) + g(ix + 1, iy) * tx) * (1 - ty) + (g(ix, iy + 1) * (1 - tx) + g(ix + 1, iy + 1) * tx) * ty


def shade(rgb, k):
    return np.clip(np.array(rgb, float) * k, 0, 255).astype(np.uint8)


def transition(mask, fill, rim, seed, inner=None):
    """Tuile 16×16 : la matière (texture `fill`) couvre les coins du masque (1 HG, 2 HD, 4 BG, 8 BD),
    bord organique continu d'une tuile à l'autre, liseré `rim` sur la lisière (et `inner` juste dedans)."""
    tl, tr, bl, br = mask & 1, (mask >> 1) & 1, (mask >> 2) & 1, (mask >> 3) & 1
    cov = np.zeros((T, T), bool)
    for y in range(T):
        for x in range(T):
            u, v = (x + 0.5) / T, (y + 0.5) / T
            val = tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v
            cov[y, x] = val + (noise(x, y, 4, seed) - 0.5) * 0.36 > 0.5
    out = np.zeros((T, T, 4), np.uint8)
    out[cov] = fill[cov]
    # lisière : pixels couverts touchant un pixel non couvert (y compris au-delà du bord de tuile,
    # évalué avec la même formule pour rester continu)
    def covered(x, y):
        if 0 <= x < T and 0 <= y < T:
            return cov[y, x]
        u, v = (x + 0.5) / T, (y + 0.5) / T
        val = tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v
        return val + (noise(x % T, y % T, 4, seed) - 0.5) * 0.36 > 0.5

    for y in range(T):
        for x in range(T):
            if not cov[y, x]:
                continue
            edge = any(not covered(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge:
                out[y, x, :3] = rim
            elif inner is not None and any(not covered(x + dx, y + dy) for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2))):
                out[y, x, :3] = inner
    return out


def upscale(a):
    return np.repeat(np.repeat(a, UP, 0), UP, 1)


def build_terrain():
    floors, water, veg = load("floors.png"), load("water.png"), load("vegetation.png")
    grass = [crop(floors, x, 160, T, T) for x in (16, 32, 48)]
    dirt = [crop(floors, x, 160, T, T) for x in (176, 192, 208)]
    stone = [crop(floors, x, y, T, T) for x, y in ((256, 32), (272, 32), (288, 32))]
    wat_a = crop(water, 16, 96, T, T)
    wat_b = crop(water, 32, 96, T, T)
    dark = [np.dstack([shade(g[..., :3], 0.72), g[..., 3:]]) for g in grass]

    tiles = [np.zeros((T, T, 4), np.uint8) for _ in range(96)]

    def paste_small(t, item, x, y):
        h, w = min(item.shape[0], T - y), min(item.shape[1], T - x)
        it = item[:h, :w]
        m = it[..., 3] > 0
        t[y : y + h, x : x + w][m] = it[m]

    flowers = [crop(veg, x, y, 8, 8) for x, y in ((53, 373), (69, 389), (86, 405), (100, 421), (117, 373), (133, 405))]
    tufts = [crop(veg, 21, 150, 8, 6), crop(veg, 36, 149, 10, 9)]
    # herbe : variantes nues (les touffes et fleurs reviennent très souvent sur la carte : on reste discret)
    for k in range(5):
        tiles[k] = grass[k % 3].copy()
    for k in range(3):
        t = grass[k].copy()
        paste_small(t, flowers[k * 2], 4 + 3 * k, 5 + 2 * k)
        tiles[5 + k] = t
    for k in range(4):
        tiles[8 + k] = dark[k % 3].copy()

    def fill_of(tex_list):
        # texture de remplissage continue : on assemble les variantes en damier sur la tuile
        return tex_list[0]

    mats = [
        (16, dark[0], shade(dark[0][8, 8, :3], 0.75), None, 11),
        (32, dirt[0], shade(dirt[0][8, 8, :3], 0.72), shade(dirt[0][8, 8, :3], 0.9), 21),
        (48, stone[1], shade(stone[1][8, 8, :3], 0.65), None, 31),
        (64, wat_a, np.array([0xD8, 0xF0, 0xFA], np.uint8), np.array([0x9C, 0xD4, 0xEC], np.uint8), 41),
        (80, wat_b, np.array([0xD8, 0xF0, 0xFA], np.uint8), np.array([0x9C, 0xD4, 0xEC], np.uint8), 41),
    ]
    for start, fill, rim, inner, seed in mats:
        for m in range(1, 16):
            tiles[start + m] = transition(m, fill, rim, seed, inner)

    sheet = np.zeros((6 * T * UP, 16 * T * UP, 4), np.uint8)
    for i, t in enumerate(tiles):
        x, y = (i % 16) * T * UP, (i // 16) * T * UP
        sheet[y : y + T * UP, x : x + T * UP] = upscale(t)
    Image.fromarray(sheet).save(os.path.join(ASSETS, "terrain.png"))
    return len(tiles)


def bbox_crop(a, x, y, w, h):
    c = crop(a, x, y, w, h)
    ys, xs = np.where(c[..., 3] > 0)
    return c[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def build_objects():
    atlas = np.array(Image.open(os.path.join(ORIG, "objects.png")).convert("RGBA"))
    meta = json.load(open(os.path.join(ORIG, "objects.json")))
    frames = meta["frames"]
    items = frames.items() if isinstance(frames, dict) else [(f["filename"], f) for f in frames]
    old = {k: crop(atlas, v["frame"]["x"], v["frame"]["y"], v["frame"]["w"], v["frame"]["h"]) for k, v in items}

    round_t, pine, oak = load("trees_round.png"), load("trees_pine.png"), load("trees_oak.png")
    veg, rocks = load("vegetation.png"), load("rocks.png")
    new = {
        "tree_oak": bbox_crop(round_t, 3, 1, 45, 47),
        "tree_blossom": bbox_crop(round_t, 67, 49, 45, 47),
        "tree_pine": bbox_crop(pine, 0, 5, 30, 75),
        "bush": bbox_crop(veg, 2, 5, 29, 27),
        "bush_berry": bbox_crop(veg, 50, 5, 29, 27),
        "rock_big": bbox_crop(rocks, 35, 19, 26, 27),
        "rock_small": bbox_crop(rocks, 65, 19, 14, 11),
        "flowers": bbox_crop(veg, 53, 373, 8, 8),
        "mushrooms": bbox_crop(veg, 36, 288, 11, 14),
        "tallgrass": bbox_crop(veg, 36, 149, 10, 9),
    }
    out = dict(old)
    for k, v in new.items():
        out[k] = upscale(v)

    # rangement en étagères dans un atlas de 1024 de large
    order = sorted(out, key=lambda k: -out[k].shape[0])
    x = y = shelf = 0
    pos = {}
    for k in order:
        h, w = out[k].shape[:2]
        if x + w > 1024:
            x, y, shelf = 0, y + shelf + 2, 0
        pos[k] = (x, y)
        x += w + 2
        shelf = max(shelf, h)
    H = y + shelf
    sheet = np.zeros((H, 1024, 4), np.uint8)
    fr = {}
    for k, (x, y) in pos.items():
        h, w = out[k].shape[:2]
        sheet[y : y + h, x : x + w] = out[k]
        fr[k] = {"frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False,
                 "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}}
    Image.fromarray(sheet).save(os.path.join(ASSETS, "objects.png"))
    meta2 = dict(meta)
    meta2["frames"] = fr
    meta2.setdefault("meta", {})["size"] = {"w": 1024, "h": H}
    json.dump(meta2, open(os.path.join(ASSETS, "objects.json"), "w"))
    return {k: out[k].shape[1::-1] for k in new}


if __name__ == "__main__":
    print("terrain :", build_terrain(), "tuiles")
    print("objets remplacés :", build_objects())


# ------------------------------------------------------------------------------------------------
# Sols des zones (forêt, ruines, bosquet corrompu, givre, plage) : mêmes contours que le calque du
# jeu (lus case par case dans le pré-rendu), redessinés avec les textures du pack et les mêmes
# transitions par coins que le terrain. Écrits dans assets/pc/override/ (prioritaires).
# ------------------------------------------------------------------------------------------------
OVERRIDE = os.path.join(PC, "override")


def zone_materials():
    floors = load("floors.png")
    grass = [crop(floors, x, 160, T, T) for x in (16, 32, 48)]
    sand = [crop(floors, x, y, T, T) for x, y in ((80, 352), (96, 352), (112, 352), (128, 352))]
    snow = [crop(floors, x, y, T, T) for x, y in ((0, 352), (16, 352), (32, 352), (48, 352))]
    dark = [np.dstack([shade(g[..., :3], 0.62), g[..., 3:]]) for g in grass]
    purple = [np.dstack([np.clip(g[..., :3].astype(float) * [0.62, 0.48, 0.78], 0, 255).astype(np.uint8), g[..., 3:]]) for g in grass]
    return {
        "foret": (dark, shade(dark[0][8, 8, :3], 0.8)),
        "ruines": (sand, shade(sand[0][8, 8, :3], 0.8)),
        "ombre": (purple, shade(purple[0][8, 8, :3], 0.75)),
        "givre": (snow, shade(snow[0][8, 8, :3], 0.85)),
        "plage": (sand, shade(sand[0][8, 8, :3], 0.8)),
    }


def build_zone_grounds():
    baked = os.path.join(ASSETS, "baked")
    mats = zone_materials()
    out = {}
    for zone, (tex, rim) in mats.items():
        src = os.path.join(baked, f"zg_{zone}.png")
        if not os.path.exists(src):
            continue
        a = np.array(Image.open(src).convert("RGBA"))
        H, W = a.shape[:2]
        cw, ch = W // T, H // T
        cell = np.zeros((ch + 2, cw + 2), float)  # bordure vide autour
        for j in range(ch):
            for i in range(cw):
                cell[j + 1, i + 1] = 1.0 if a[j * T + T // 2, i * T + T // 2, 3] > 0 else 0.0
        img = np.zeros((H, W, 4), np.uint8)
        for j in range(ch):
            for i in range(cw):
                c = lambda dj, di: cell[j + 1 + dj, i + 1 + di]
                # sommet couvert si la majorité des 4 cases qui le touchent l'est
                v = lambda a_, b_, c_, d_: 1 if (a_ + b_ + c_ + d_) >= 3 or (c(0, 0) and (a_ + b_ + c_ + d_) >= 2) else 0
                tl = v(c(-1, -1), c(-1, 0), c(0, -1), c(0, 0))
                tr = v(c(-1, 0), c(-1, 1), c(0, 0), c(0, 1))
                bl = v(c(0, -1), c(0, 0), c(1, -1), c(1, 0))
                br = v(c(0, 0), c(0, 1), c(1, 0), c(1, 1))
                m = tl | tr << 1 | bl << 2 | br << 3
                if not m:
                    continue
                fill = tex[(i * 7 + j * 3) % len(tex)]
                t = fill.copy() if m == 15 else transition(m, fill, rim, 61)
                img[j * T : (j + 1) * T, i * T : (i + 1) * T] = t
        Image.fromarray(img).save(os.path.join(OVERRIDE, f"zg_{zone}.png"))
        out[f"zg_{zone}"] = {"w": W, "h": H, "frames": []}
    return out


def write_override_manifest(textures):
    import hashlib

    h = hashlib.sha1()
    for k in sorted(textures):
        h.update(k.encode())
        h.update(open(os.path.join(OVERRIDE, k + ".png"), "rb").read())
    with open(os.path.join(OVERRIDE, "manifest.js"), "w") as f:
        f.write("// Généré par tools/art16/pc_world.py — ne pas modifier à la main.\n")
        f.write("export default " + json.dumps({"version": h.hexdigest()[:10], "textures": textures}) + ";\n")


if __name__ == "__main__":
    os.makedirs(OVERRIDE, exist_ok=True)
    zones = build_zone_grounds()
    write_override_manifest(zones)
    print("sols de zones :", list(zones))
