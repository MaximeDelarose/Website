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
}
CELL, FEET, UP = 64, 57, 2
B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16


def frames_of(path, flip):
    im = Image.open(path).convert("RGBA")
    fr = [im.crop((k * 16, 0, k * 16 + 16, 16)) for k in range(im.width // 16)]
    if flip:
        fr = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in fr]
    return [np.array(f.resize((16 * UP, 16 * UP), Image.NEAREST)) for f in fr]


def place(a, dx=0, dy=0):
    cell = np.zeros((CELL, CELL, 4), np.uint8)
    ys = np.where(a[..., 3].any(1))[0]
    bottom = ys.max() if len(ys) else a.shape[0] - 1
    x0 = (CELL - a.shape[1]) // 2 + dx
    y0 = FEET - bottom + dy
    h, w = a.shape[:2]
    for y in range(h):
        Y = y0 + y
        if 0 <= Y < CELL:
            for x in range(w):
                X = x0 + x
                if 0 <= X < CELL and a[y, x, 3]:
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
    out = np.zeros((6 * CELL, 6 * CELL, 4), np.uint8)
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            out[j * CELL : (j + 1) * CELL, i * CELL : (i + 1) * CELL] = c
    return out


if __name__ == "__main__":
    for key, (src, flip) in MAP.items():
        Image.fromarray(sheet_for(frames_of(os.path.join(SRC, src), flip))).save(os.path.join(OUT, key + ".png"))
        print(key, "<-", src)
