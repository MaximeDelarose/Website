"""Surface d'Echoes of Aether (Max version) au style « RPG 16 bits » du pack Ninja Adventure.

  python3 tools/art16/ninja_world.py

Pack Ninja Adventure de Pixel-boy (CC0, domaine public : src/ninja/LICENSE.txt), 16 px par case.
Écrit :
  - echoes-moi/assets/terrain.png : herbe (0–11) et transitions par coins (chemin 32–47,
    places 48–63, eau 64–95), même disposition qu'avant. Les tuiles de transition sont composées
    en « grille duale » : chaque quart de case est pris dans le bloc 3×3 + coins intérieurs du pack ;
  - l'atlas d'objets (via pc_world.build_objects) avec les arbres, buisson, hautes herbes, maisons,
    panneau et fleurs du pack, et un rebord dessiné dans ses couleurs.
Les herbes sombres (16–31) restent vides : la forêt est dessinée par le jeu en rangées d'arbres.
"""
import os

import numpy as np
from PIL import Image

import pc_world as pw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src", "ninja")
T = 16
H = 8  # quart de case


def load(name):
    return np.array(Image.open(os.path.join(SRC, name)).convert("RGBA"))


def crop(a, x, y, w, h):
    return a[y : y + h, x : x + w].copy()


def dual_tiles(sheet, ox, oy):
    """16 tuiles (masque des coins HG=1, HD=2, BG=4, BD=8) depuis un bloc 3×3 + coins intérieurs."""
    tile = lambda c, r: crop(sheet, ox + c * T, oy + r * T, T, T)
    C = tile(1, 1)
    edge = {(0, -1): tile(1, 0), (0, 1): tile(1, 2), (-1, 0): tile(0, 1), (1, 0): tile(2, 1)}
    outer = {(-1, -1): tile(0, 0), (1, -1): tile(2, 0), (-1, 1): tile(0, 2), (1, 1): tile(2, 2)}
    inner = {(1, 1): tile(5, 1), (-1, 1): tile(6, 1), (1, -1): tile(5, 2), (-1, -1): tile(6, 2)}
    bit = {(-1, -1): 1, (1, -1): 2, (-1, 1): 4, (1, 1): 8}
    out = []
    for m in range(16):
        t = np.zeros((T, T, 4), np.uint8)
        on = lambda dx, dy: bool(m & bit[(dx, dy)])
        for (dx, dy) in bit:
            if not on(dx, dy):
                continue
            # ce sommet est le centre d'une case « normale » ; le quart de notre case est le quart
            # (qx, qy) de cette case-là, tourné vers nous
            qx, qy = -dx, -dy
            hz = on(-dx, dy)  # sommet voisin à l'horizontale
            vt = on(dx, -dy)  # sommet voisin à la verticale
            dg = on(-dx, -dy)  # sommet en diagonale
            if hz and vt:
                src = C if dg else inner[(qx, qy)]
            elif hz:
                src = edge[(0, qy)]
            elif vt:
                src = edge[(qx, 0)]
            else:
                src = outer[(qx, qy)]
            sx, sy = (0 if qx < 0 else H), (0 if qy < 0 else H)
            tx, ty = (0 if dx < 0 else H), (0 if dy < 0 else H)
            t[ty : ty + H, tx : tx + H] = src[sy : sy + H, sx : sx + H]
        out.append(t)
    return out


def build_terrain():
    floor, water = load("TilesetFloor.png"), load("TilesetWater.png")
    tiles = [np.zeros((T, T, 4), np.uint8) for _ in range(96)]
    plain = crop(floor, 0, 192, T, T)
    details = [crop(floor, x, y, T, T) for x, y in ((16, 192), (32, 192), (48, 192), (32, 176), (48, 176))]
    for k in range(5):
        tiles[k] = plain.copy()
    for k in range(3):
        tiles[5 + k] = details[k].copy()
    for k in range(4):
        tiles[8 + k] = plain.copy()
    path = dual_tiles(floor, 0, 112)
    wat = dual_tiles(water, 0, 96)
    for m in range(1, 16):
        tiles[32 + m] = path[m]
        tiles[48 + m] = path[m]
        tiles[64 + m] = wat[m]
        tiles[80 + m] = wat[m]
    sheet = np.zeros((6 * T * 2, 16 * T * 2, 4), np.uint8)
    for i, t in enumerate(tiles):
        x, y = (i % 16) * T * 2, (i // 16) * T * 2
        sheet[y : y + T * 2, x : x + T * 2] = pw.upscale(t)
    Image.fromarray(sheet).save(os.path.join(pw.ASSETS, "terrain.png"))


def make_ledge():
    """Rebord : arête d'herbe claire, petite falaise de terre, ombre — couleurs du pack."""
    g_light, g_mid, g_dark = (196, 208, 92), (173, 188, 58), (116, 163, 52)
    d_top, d_mid, d_low, d_line = (211, 134, 95), (189, 121, 89), (160, 98, 72), (110, 62, 48)
    a = np.zeros((T, T, 4), np.uint8)
    for x in range(T):
        bump = 1 if x % 4 in (1, 2) else 0
        a[5 - bump, x] = (*g_light, 255)
        for y in range(6 - bump, 8):
            a[y, x] = (*g_mid, 255)
        a[8, x] = (*g_dark, 255)
        a[9, x] = (*d_top, 255)
        a[10, x] = (*d_top, 255) if x % 5 else (*d_mid, 255)
        a[11, x] = (*d_mid, 255)
        a[12, x] = (*d_low, 255)
        a[13, x] = (*d_line, 255)
        a[14, x] = (0, 0, 0, 60)
    return a


def sprites():
    nat, house, elem = load("TilesetNature.png"), load("TilesetHouse.png"), load("TilesetElement.png")
    s = {
        "tree_oak": crop(nat, 256, 0, 32, 32),
        "tree_oak2": crop(nat, 288, 0, 32, 32),
        "tree_pine": crop(nat, 32, 0, 32, 32),
        "tree_blossom": crop(nat, 224, 0, 32, 32),
        "n_bush": crop(nat, 160, 144, 16, 16),
        "bush": crop(nat, 0, 160, 16, 16),
        "bush_berry": crop(nat, 16, 160, 16, 16),
        "tallgrass_tile": crop(nat, 224, 176, 16, 16),
        "flowers": crop(nat, 16, 176, 16, 16),
        "n_flower2": crop(nat, 0, 176, 16, 16),
        "n_sign": crop(elem, 96, 48, 16, 32),
        "n_house_a": crop(house, 0, 0, 64, 48),
        "n_house_b": crop(house, 64, 0, 64, 48),
        "n_house_c": crop(house, 128, 0, 64, 48),
        "n_house_d": crop(house, 192, 0, 64, 48),
        "ledge": make_ledge(),
    }
    # on retire les colonnes/lignes vides (origine en bas au centre dans le jeu)
    out = {}
    for k, a in s.items():
        if k.startswith("n_house") or k in ("tallgrass_tile", "ledge", "tree_oak", "tree_oak2"):
            out[k] = a
            continue
        ys, xs = np.nonzero(a[..., 3])
        out[k] = a[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1] if len(xs) else a
    return out


if __name__ == "__main__":
    build_terrain()
    print("objets :", ", ".join(pw.build_objects(extra=sprites())))
    zones, decor = pw.build_overrides()  # sols et petit décor des royaumes / de la plage (Pixel Crawler)
    print("sols de zones :", zones, "décor :", decor)
