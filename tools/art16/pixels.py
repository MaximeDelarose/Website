"""Sprites dessinés à la main sous forme de grilles de caractères.

Chaque caractère est un *rôle* (contour, cheveux, ombre des cheveux, peau…) ; une table de
couleurs par personnage donne la couleur de chaque rôle. On dessine ainsi une fois une
silhouette, et on la décline (couleurs, coiffures, tenues) sans la redessiner.

Rôles communs :
  .  transparent        o  contour (ink)
  h H l  cheveux / ombre / reflet        s S L  peau / ombre / lumière
  e  œil   w  reflet de l'œil   m  bouche
  b B  barbe / ombre                      c C k  vêtement haut / ombre / reflet
  t T  maillot dessous / ombre            a A  accessoire (ceinture, chaîne) / ombre
  y  doré                                 p P  pantalon / ombre
  f F  chaussures / ombre                 x X z  libres (définis par personnage)
"""

from canvas import Img

DEFAULT_ROLES = {"o": "ink", "e": "ink", "w": "white", "m": "red1"}


def parse(rows, roles, w=None, h=None):
    rows = [r for r in (rows.strip("\n").split("\n") if isinstance(rows, str) else rows)]
    h = h or len(rows)
    w = w or max(len(r) for r in rows)
    img = Img(w, h)
    table = dict(DEFAULT_ROLES, **roles)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in (".", " "):
                continue
            col = table.get(ch)
            if col is None:
                raise KeyError(f"rôle « {ch} » sans couleur")
            img.px(x, y, col)
    return img


def stack(*parts, w=16, h=32):
    """Superpose des morceaux (Img, dx, dy) dans l'ordre."""
    out = Img(w, h)
    for part in parts:
        img, dx, dy = part
        out.blit(img, dx, dy)
    return out


def soften(img, pairs):
    """Tramage des bords d'ombre : un pixel clair voisin d'un pixel d'ombre prend la couleur
    d'ombre un pixel sur deux (damier). `pairs` = [(couleur_ombre, couleur_claire), ...]."""
    from canvas import c

    a = img.a
    src = a.copy()
    h, w = a.shape
    for shade, base in pairs:
        cs, cb = c(shade), c(base)
        for y in range(h):
            for x in range(w):
                if src[y, x] != cb or (x + y) & 1:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and src[yy, xx] == cs:
                        a[y, x] = cs
                        break
    return img
