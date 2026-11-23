"""Armes, dessinées à part et tenues par la main avant du personnage.

Convention : arme pointée vers la droite (angle 0), sur une case 16×16. `grip` = point tenu par
la main, utilisé comme pivot (origine du sprite dans le jeu) ; le jeu la tourne de l'angle donné
par chaque image d'animation (voir humanoid.py) et la retourne avec le personnage.
`rotate=False` : objet tenu droit (livre, orbe), seulement déplacé.
"""

from canvas import Img


def throwing_axe():
    i = Img(16, 16)
    i.line(1, 8, 10, 8, "wood2")
    i.line(1, 9, 10, 9, "wood1")
    # fer de hache
    i.rect(9, 4, 3, 7, "stone2")
    i.rect(12, 5, 1, 5, "stone3")
    i.vline(13, 6, 8, "white")
    i.rect(9, 4, 1, 7, "stone1")
    return i.outline(), (2, 8.5), True


def bow():
    i = Img(16, 16)
    for y in range(1, 15):
        x = 6 + round(4 * (1 - ((y - 7.5) / 7) ** 2))
        i.px(x, y, "wood2")
        i.px(x - 1, y, "wood1")
    i.vline(5, 1, 14, "bone")  # corde
    i.rect(9, 6, 2, 4, "red1")  # poignée
    return i.outline(), (9.5, 8), False


def daggers():
    i = Img(16, 16)
    i.rect(1, 7, 3, 2, "wood1")
    i.rect(4, 6, 1, 4, "gold1")
    i.line(5, 7, 11, 7, "stone3")
    i.line(5, 8, 10, 8, "stone2")
    i.px(12, 7, "white")
    return i.outline(), (2, 8), True


def boomerang():
    i = Img(16, 16)
    i.line(2, 3, 8, 9, "wood2", 2)
    i.line(8, 9, 14, 5, "wood2", 2)
    i.line(3, 3, 8, 8, "wood3")
    i.px(8, 10, "wood1")
    return i.outline(), (3, 4), True


def javelin():
    i = Img(16, 16)
    i.line(0, 8, 11, 8, "wood2")
    i.rect(11, 7, 3, 3, "stone2")
    i.px(14, 8, "white")
    i.px(3, 8, "red2")
    return i.outline(), (4, 8), True


def club():
    i = Img(16, 16)
    i.line(1, 8, 7, 8, "wood1", 2)
    i.ellipse(10.5, 8.5, 4.5, 3.5, "wood2", dither_to="wood1")
    i.px(11, 6, "wood3")
    i.px(13, 9, "stone2")
    i.px(9, 10, "stone2")
    return i.outline(), (2, 9), True


def staff():
    i = Img(16, 16)
    i.line(0, 9, 11, 9, "wood1")
    i.line(0, 8, 11, 8, "wood2")
    i.ellipse(13, 8.5, 2.5, 2.5, "violet2", dither_to="violet1")
    i.px(12, 7, "violet3")
    return i.outline(), (4, 8.5), True


def scepter():
    i = Img(16, 16)
    i.line(1, 8, 10, 8, "gold1")
    i.rect(10, 6, 3, 5, "gold2")
    i.rect(11, 7, 2, 3, "red2")
    i.px(11, 7, "red3")
    i.px(13, 8, "gold3")
    return i.outline(), (3, 8), True


def grimoire():
    i = Img(16, 16)
    i.rect(4, 3, 8, 10, "violet1")
    i.rect(4, 3, 1, 10, "violet0")
    i.rect(11, 4, 1, 8, "bone")  # tranche des pages
    i.rect(6, 6, 3, 4, "gold2")
    i.px(7, 7, "violet3")
    return i.outline(), (5, 11), False


def orb():
    i = Img(16, 16)
    i.ellipse(8, 8, 4, 4, "violet2", dither_to="violet0", shade_at=0.2)
    i.px(6, 6, "white")
    i.px(7, 6, "violet3")
    i.px(6, 7, "violet3")
    return i.outline(), (8, 12), False


def chakram():
    i = Img(16, 16)
    i.ellipse(8, 8, 6, 6, "blue3")
    i.ellipse(8, 8, 3.5, 3.5, "blue1")
    i.ellipse(8, 8, 2, 2, 0)
    for x, y in ((8, 1), (15, 8), (8, 15), (1, 8)):
        i.px(x, y, "white")
    return i.outline(), (8, 8), True


WEAPONS = {
    "throwing_axe": throwing_axe,
    "bow": bow,
    "daggers": daggers,
    "boomerang": boomerang,
    "javelin": javelin,
    "club": club,
    "staff": staff,
    "scepter": scepter,
    "grimoire": grimoire,
    "orb": orb,
    "chakram": chakram,
}

# Arme montrée par défaut pour chaque héros dans les aperçus
DEFAULT = {"augh": "throwing_axe", "aka": "grimoire", "gorak": "club", "nyra": "chakram", "ralya": "scepter"}
