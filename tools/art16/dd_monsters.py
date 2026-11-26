"""Monstres d'Echoes of Aether (Max version) à partir des sprites DeepDive (16×16, repos 4 images).

  python3 tools/art16/dd_monsters.py      puis   node tools/echoes-bake.js  (variantes recolorées)

Écrit echoes-moi/assets/monsters/mon_<nom>.png au format exact du jeu : planche 384×384, cases de
64×64, 6 lignes de 6 images (repos, déplacement, préparation, attaque, touché, mort), regard vers
la droite, pieds sur la ligne 57. Le sprite 16×16 est agrandi ×2 (même échelle que le décor) et les
animations manquantes sont dérivées du repos (sauts, recul rougissant, fente, flash, dissolution).
Originaux remplacés conservés dans tools/art16/orig/monsters/.
"""

import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src", "deepdive")
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "echoes-moi", "assets", "monsters"))

MAP = {
    "mon_blob": ("DeathSlime.png", False),
    "mon_archer": ("GoblinArcher.png", False),
    "mon_spectre": ("GraveRevenant.png", False),
    "mon_wolf": ("ToxicHound.png", False),
    "mon_yeti": ("StoneTroll.png", False),
    "mon_guard": ("LizardfolkSpearman.png", False),
    # option 2 : moutons, béliers, sanglier et boss remplacés par des créatures du pack gratuit
    "mon_petit": ("RedCap.png", False),
    "mon_belier": ("CrimsonSlaad.png", False),
    "mon_mystique": ("OcularWatcher.png", False),
    "mon_boar": ("CarcassFeeder.png", False),
    "mon_grand": ("HumongousEttin.png", False, 128),
    "mon_boss": ("SwampTroll.png", False, 128),
}
CELL, FEET, UP = 64, 57, 2
# Boss : cases de 128 (pieds sur la ligne 114), sprite ×4 = chaque pixel du sprite couvre 2×2
# pixels de la grille du jeu (toujours aligné sur elle)
B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16


def frames_of(path, flip, up=UP):
    im = Image.open(path).convert("RGBA")
    fr = [im.crop((k * 16, 0, k * 16 + 16, 16)) for k in range(im.width // 16)]
    if flip:
        fr = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in fr]
    return [np.array(f.resize((16 * up, 16 * up), Image.NEAREST)) for f in fr]


G = {"cell": CELL, "feet": FEET}


def place(a, dx=0, dy=0):
    C, F = G["cell"], G["feet"]
    cell = np.zeros((C, C, 4), np.uint8)
    ys = np.where(a[..., 3].any(1))[0]
    bottom = ys.max() if len(ys) else a.shape[0] - 1
    x0 = (C - a.shape[1]) // 2 + dx
    y0 = F - bottom + dy
    h, w = a.shape[:2]
    for y in range(h):
        Y = y0 + y
        if 0 <= Y < C:
            for x in range(w):
                X = x0 + x
                if 0 <= X < C and a[y, x, 3]:
                    cell[Y, X] = a[y, x]
    return cell


def tint(a, rgb, k):
    b = a.copy().astype(float)
    m = b[..., 3] > 0
    b[m, :3] = b[m, :3] * (1 - k) + np.array(rgb) * k
    return b.astype(np.uint8)


def flash(a):
    b = a.copy()
    b[b[..., 3] > 0, :3] = 255
    return b


def dissolve(a, t, seed):
    b = a.copy()
    rnd = np.random.RandomState(seed)
    H, W = b.shape[:2]
    # tramage en blocs de 2×2 (un pixel d'art) pour rester sur la grille
    thr = np.kron(np.tile(B4, (H // 8 + 1, W // 8 + 1))[: H // 2, : W // 2] * 0.7 + rnd.rand(H // 2, W // 2) * 0.3, np.ones((2, 2)))
    b[(b[..., 3] > 0) & (thr[:H, :W] < t)] = 0
    return b


def sheet_for(fr):
    f = lambda i: fr[i % len(fr)]
    rows = [
        [place(f(i)) for i in range(6)],  # repos
        [place(f(i), dy=-2 * (i % 3 != 0)) for i in range(6)],  # déplacement : petits sauts
        [place(tint(f(i), (230, 40, 40), 0.1 * i), dx=-2 * (1 + i // 2)) for i in range(6)],  # préparation
        [place(f(i), dx=d) for i, d in enumerate((4, 8, 10, 8, 4, 0))],  # attaque : fente
        [place(flash(f(0))), place(f(0), dx=-2), place(flash(f(1)), dx=-2), place(f(1)), place(f(2)), place(f(3))],  # touché
        [place(dissolve(f(0), k / 5, k)) for k in range(6)],  # mort
    ]
    C = G["cell"]
    out = np.zeros((6 * C, 6 * C, 4), np.uint8)
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            out[j * C : (j + 1) * C, i * C : (i + 1) * C] = c
    return out


if __name__ == "__main__":
    for key, (src, flip, *size) in MAP.items():
        big = size and size[0] == 128
        G["cell"], G["feet"] = (128, 114) if big else (CELL, FEET)
        fr = frames_of(os.path.join(SRC, src), flip, 4 if big else UP)
        Image.fromarray(sheet_for(fr)).save(os.path.join(OUT, key + ".png"))
        print(key, "<-", src, "(boss x4)" if big else "")
