"""Petite toile en couleurs indexées (palette.py) et outils de dessin pixel art."""

import math
import random

import numpy as np
from PIL import Image

from palette import INDEX, NAMES, bayer, rgba


def c(name):
    return name if isinstance(name, int) else INDEX[name]


class Img:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w), dtype=np.uint8)

    # --- pixels -------------------------------------------------------------------------------
    def get(self, x, y):
        return int(self.a[y, x]) if 0 <= x < self.w and 0 <= y < self.h else 0

    def px(self, x, y, col):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = c(col)

    def rect(self, x, y, w, h, col):
        for j in range(int(y), int(y + h)):
            for i in range(int(x), int(x + w)):
                self.px(i, j, col)

    def hline(self, x0, x1, y, col):
        for x in range(int(x0), int(x1) + 1):
            self.px(x, y, col)

    def vline(self, x, y0, y1, col):
        for y in range(int(y0), int(y1) + 1):
            self.px(x, y, col)

    def line(self, x0, y0, x1, y1, col, width=1):
        """Segment épais (pinceau carré de `width` px)."""
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(int(math.ceil(n)) + 1):
            t = k / n
            x = x0 + (x1 - x0) * t
            y = y0 + (y1 - y0) * t
            for dy in range(width):
                for dx in range(width):
                    self.px(math.floor(x) + dx, math.floor(y) + dy, col)

    def ellipse(self, cx, cy, rx, ry, col, dither_to=None, light=(-0.6, -0.8), shade_at=0.35):
        """Ellipse pleine. Avec `dither_to`, la partie à l'ombre (opposée à la lumière) passe
        progressivement à cette couleur par tramage de Bayer."""
        lx, ly = light
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                if nx * nx + ny * ny > 1:
                    continue
                col_ = col
                if dither_to is not None:
                    # 0 côté lumière → 1 côté ombre
                    t = (-(nx * lx + ny * ly) + 1) / 2
                    if t - shade_at > bayer(x, y) * (1 - shade_at):
                        col_ = dither_to
                self.px(x, y, col_)

    def dither_rect(self, x, y, w, h, col, amount, ox=0, oy=0):
        """Remplit en tramage : `amount` (0..1) = proportion de pixels colorés."""
        for j in range(int(y), int(y + h)):
            for i in range(int(x), int(x + w)):
                if bayer(i + ox, j + oy) < amount:
                    self.px(i, j, col)

    def replace(self, old, new, mask=None):
        old, new = c(old), c(new)
        sel = self.a == old
        if mask is not None:
            sel &= mask
        self.a[sel] = new

    # --- composition --------------------------------------------------------------------------
    def blit(self, other, dx, dy, flip=False):
        src = other.a[:, ::-1] if flip else other.a
        for j in range(other.h):
            for i in range(other.w):
                v = src[j, i]
                if v:
                    self.px(dx + i, dy + j, int(v))

    def outline(self, col="ink", diagonal=False):
        """Contour extérieur d'1 px autour de tout ce qui est opaque."""
        filled = self.a != 0
        out = np.zeros_like(filled)
        shifts = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        if diagonal:
            shifts += [(1, 1), (-1, 1), (1, -1), (-1, -1)]
        for dx, dy in shifts:
            s = np.zeros_like(filled)
            ys = slice(max(dy, 0), self.h + min(dy, 0))
            yd = slice(max(-dy, 0), self.h + min(-dy, 0))
            xs = slice(max(dx, 0), self.w + min(dx, 0))
            xd = slice(max(-dx, 0), self.w + min(-dx, 0))
            s[yd, xd] = filled[ys, xs]
            out |= s
        self.a[out & ~filled] = c(col)
        return self

    def copy(self):
        o = Img(self.w, self.h)
        o.a = self.a.copy()
        return o

    def to_pil(self):
        im = Image.new("RGBA", (self.w, self.h))
        lut = [rgba(i) for i in range(len(NAMES))]
        im.putdata([lut[v] for v in self.a.flatten()])
        return im


def dissolve(img, t, seed=1):
    """Disparition tramée (mort, téléportation) : t de 0 (intact) à 1 (disparu)."""
    o = img.copy()
    rnd = random.Random(seed)
    for y in range(o.h):
        for x in range(o.w):
            if o.a[y, x] and (bayer(x, y) * 0.7 + rnd.random() * 0.3) < t:
                o.a[y, x] = 0
    return o


def flash(img, col="white"):
    """Silhouette d'une seule couleur (coup reçu)."""
    o = img.copy()
    o.a[o.a != 0] = c(col)
    return o


def sheet(rows, fw, fh, cols=None):
    """Assemble une planche : `rows` = liste de listes d'Img (une ligne par animation)."""
    cols = cols or max(len(r) for r in rows)
    out = Image.new("RGBA", (cols * fw, len(rows) * fh))
    for j, row in enumerate(rows):
        for i, fr in enumerate(row):
            out.alpha_composite(fr.to_pil(), (i * fw, j * fh))
    return out
