"""Petite boîte à outils pixel art (PIL + numpy) pour Ashbound Tower.
Tout est dessiné sans anti-aliasing : pixels nets, contours sombres, glows en bandes."""
import math, random
import numpy as np
from PIL import Image, ImageDraw

def H(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

# --- Palette Ashbound : base sombre bleutée, accents saturés ---
OUT      = H('120b1f')   # contour
INK      = H('1b1330')
STONE_D  = H('2a2540'); STONE_M = H('443d63'); STONE_L = H('6a6191'); STONE_H = H('9b92c4')
MOSS_D   = H('16322e'); MOSS_M  = H('1f5a47'); MOSS_L  = H('2f8a5c')
VIO_D    = H('3b1670'); VIO_M   = H('6d2bd9'); VIO_L   = H('a45bff'); VIO_H = H('d9b4ff')
CY_D     = H('0f5f8c'); CY_M    = H('19b8e8'); CY_L    = H('6af0ff'); CY_H = H('e6ffff')
MAG      = H('ff3fa4'); MAG_D = H('8a1458')
EMB_D    = H('7a1d12'); EMB_M   = H('e2541b'); EMB_L = H('ffa43a'); EMB_H = H('ffe38a')
GOLD_D   = H('7a5a16'); GOLD_M  = H('d39a2a'); GOLD_L = H('ffd25e')
BONE     = H('cfc6a8'); BONE_D = H('8c8468')
GREEN_N  = H('46f08c'); GREEN_D = H('0f7a45')
BLOOD    = H('c2183a')

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))

def mul(c, f):
    return (min(255, int(c[0] * f)), min(255, int(c[1] * f)), min(255, int(c[2] * f)), c[3])


class Px:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        s.d = ImageDraw.Draw(s.im)

    # primitives -------------------------------------------------
    def px(s, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h:
            s.im.putpixel((x, y), c)

    def rect(s, x0, y0, x1, y1, c):
        s.d.rectangle([int(x0), int(y0), int(x1), int(y1)], fill=c)

    def ell(s, x0, y0, x1, y1, c):
        s.d.ellipse([int(x0), int(y0), int(x1), int(y1)], fill=c)

    def poly(s, pts, c):
        s.d.polygon([(int(x), int(y)) for x, y in pts], fill=c)

    def line(s, a, b, c, w=1):
        s.d.line([int(a[0]), int(a[1]), int(b[0]), int(b[1])], fill=c, width=w)

    # volumes : disque éclairé en haut-gauche -------------------
    def ball(s, cx, cy, rx, ry, dark, mid, light, hi=None):
        s.ell(cx - rx, cy - ry, cx + rx, cy + ry, dark)
        s.ell(cx - rx + 1, cy - ry + 1, cx + rx - 2, cy + ry - 2, mid)
        s.ell(cx - rx * 0.62, cy - ry * 0.7, cx + rx * 0.25, cy + ry * 0.1, light)
        if hi:
            s.ell(cx - rx * 0.5, cy - ry * 0.55, cx - rx * 0.1, cy - ry * 0.2, hi)

    def glow(s, cx, cy, r, c, strength=0.55, bands=4):
        """halo en bandes concentriques (style pixel art), composé sur l'image."""
        layer = Image.new('RGBA', (s.w, s.h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(bands, 0, -1):
            rr = r * i / bands
            a = int(255 * strength * (1 - i / (bands + 1)))
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(c[0], c[1], c[2], a))
        s.im = Image.alpha_composite(s.im, layer)
        s.d = ImageDraw.Draw(s.im)

    def outline(s, c=OUT, diag=False):
        a = np.array(s.im)
        solid = a[:, :, 3] > 130
        grow = np.zeros_like(solid)
        grow[1:, :] |= solid[:-1, :]; grow[:-1, :] |= solid[1:, :]
        grow[:, 1:] |= solid[:, :-1]; grow[:, :-1] |= solid[:, 1:]
        if diag:
            grow[1:, 1:] |= solid[:-1, :-1]; grow[:-1, :-1] |= solid[1:, 1:]
            grow[1:, :-1] |= solid[:-1, 1:]; grow[:-1, 1:] |= solid[1:, :-1]
        edge = grow & ~solid
        a[edge] = c
        s.im = Image.fromarray(a, 'RGBA')
        s.d = ImageDraw.Draw(s.im)

    def speckle(s, rng, x0, y0, x1, y1, colors, n):
        for _ in range(n):
            s.px(rng.randint(x0, x1), rng.randint(y0, y1), rng.choice(colors))

    def mask_only(s, ref):
        """garde uniquement les pixels où ref est opaque (pour texturer à l'intérieur d'une forme)."""
        a = np.array(s.im); r = np.array(ref.im)
        a[r[:, :, 3] < 40] = (0, 0, 0, 0)
        s.im = Image.fromarray(a, 'RGBA'); s.d = ImageDraw.Draw(s.im)

    def save(s, path):
        s.im.save(path)

    def flip(s):
        s.im = s.im.transpose(Image.FLIP_LEFT_RIGHT); s.d = ImageDraw.Draw(s.im)
        return s


def value_noise(w, h, cell, rng, octaves=3):
    """bruit de valeur multi-octaves en [0,1] (numpy)."""
    out = np.zeros((h, w), dtype=np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        c = max(1, cell // (2 ** o))
        gw, gh = w // c + 3, h // c + 3
        g = np.array([[rng.random() for _ in range(gw)] for _ in range(gh)], dtype=np.float32)
        ys, xs = np.mgrid[0:h, 0:w]
        fx, fy = xs / c, ys / c
        x0, y0 = fx.astype(int), fy.astype(int)
        tx, ty = fx - x0, fy - y0
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty)
        v = (g[y0, x0] * (1 - tx) * (1 - ty) + g[y0, x0 + 1] * tx * (1 - ty)
             + g[y0 + 1, x0] * (1 - tx) * ty + g[y0 + 1, x0 + 1] * tx * ty)
        out += v * amp; tot += amp; amp *= 0.5
    return out / tot
