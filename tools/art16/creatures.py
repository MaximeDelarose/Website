"""Monstres non humanoïdes. Profil, regard vers la droite, pattes posées sur la dernière ligne.

Petits monstres : case 16×16. Mêmes 6 animations que le jeu actuel :
idle, move, windup (préparation, doit avertir le joueur), attack, hurt, death.
"""

import math

from canvas import Img, dissolve, flash


def sheep(dy=0, legs=0, head=0, lunge=0, eye="ink", squash=0, tone="bone"):
    """Petit mouton. legs : phase des pattes (0..3) ; head : tête baissée (+) ; lunge : avance (px)."""
    wool, wool_s = ("bone", "stone3") if tone == "bone" else (tone, "violet1")
    i = Img(16, 16)
    x0 = 1 + lunge
    by = 6 + dy + squash
    # pattes (4, deux plus sombres derrière)
    off = [0, 1, 0, -1][legs % 4]
    for k, lx in enumerate((x0 + 3, x0 + 5, x0 + 8, x0 + 10)):
        o = off if k % 2 == 0 else -off
        col = "dusk" if k in (1, 3) else "night"
        i.vline(lx + o, by + 5, 15, col)
    # toison : grappe de bosses tramées
    for cx, cy, r in ((x0 + 4, by + 3, 3.5), (x0 + 7, by + 2, 3.8), (x0 + 10, by + 3, 3.3), (x0 + 6, by + 5, 3.4), (x0 + 9, by + 5, 3)):
        i.ellipse(cx, cy, r, r - squash * 0.4, wool, dither_to=wool_s, shade_at=0.5)
    # queue
    i.px(x0, by + 2, wool)
    # tête
    hx, hy = x0 + 11, by + 1 + head
    i.rect(hx, hy, 4, 4, "dusk")
    i.rect(hx + 1, hy + 4, 3, 1, "dusk")
    i.px(hx + 3, hy + 4, "night")
    i.px(hx - 1, hy, "dusk")  # oreille
    i.px(hx, hy - 1, wool)  # mèche
    i.px(hx + 1, hy - 1, wool)
    i.px(hx + 2, hy + 1, eye)
    return i.outline()


SHEEP_ANIMS = {
    "idle": ([sheep(), sheep(), sheep(dy=1, squash=0), sheep(dy=1)], 5, True),
    "move": ([sheep(dy=0, legs=0), sheep(dy=-1, legs=1), sheep(dy=-2, legs=2), sheep(dy=-1, legs=3)], 10, True),
    "windup": (
        [sheep(head=1, squash=1), sheep(head=2, squash=1, lunge=-1, eye="red2"), sheep(head=2, squash=1, lunge=-1, eye="red3"), sheep(head=2, squash=1, lunge=-1, eye="red2")],
        10,
        False,
    ),
    "attack": ([sheep(head=1, lunge=1, dy=-1), sheep(head=1, lunge=3, dy=-2), sheep(head=2, lunge=3), sheep(lunge=1)], 12, False),
    "hurt": ([flash(sheep(head=-1, lunge=-1)), sheep(head=-1, lunge=-1)], 12, False),
    "death": ([sheep(dy=1, head=2, squash=1)] + [dissolve(sheep(dy=1, head=2, squash=1), k / 4.5, seed=k) for k in range(1, 6)], 10, False),
}

CREATURES = {"sheep": (SHEEP_ANIMS, 16, 16)}
