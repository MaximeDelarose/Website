"""Décor supplémentaire de l'arène agrandie : buisson, fougère, tombe (pixel art, mêmes palettes)."""
import random, sys, os
from pixel import *

def new(name, w, h):
    p = Px(w, h); p.name = name; return p

def bush(rng):
    p = new('bush', 34, 24)
    for cx, cy, r in [(10, 16, 8), (22, 16, 9), (16, 11, 9), (7, 19, 5), (27, 19, 5)]:
        p.ell(cx - r, cy - r * .8, cx + r, cy + r * .8, H('1d3b2a'))
    for cx, cy, r in [(11, 15, 6), (22, 15, 7), (16, 10, 7)]:
        p.ell(cx - r, cy - r * .8, cx + r, cy + r * .8, H('2a5a3a'))
    for _ in range(26):
        x, y = rng.randint(5, 28), rng.randint(5, 18); p.px(x, y, rng.choice([H('3f8a52'), H('2f6e46'), H('4aa060')]))
    for _ in range(5):
        x, y = rng.randint(7, 26), rng.randint(6, 16); p.px(x, y, rng.choice([MAG, VIO_L])); p.px(x, y + 1, VIO_D)
    p.outline(); return p

def fern(rng):
    p = new('fern', 26, 20)
    for ang, ln in [(-60, 11), (-30, 15), (0, 17), (30, 15), (60, 11)]:
        import math
        a = math.radians(ang - 90); x0, y0 = 13, 19; x1, y1 = 13 + math.cos(a) * ln, 19 + math.sin(a) * ln
        p.line((x0, y0), (x1, y1), H('2f7a4a'), 1)
        for t in (.4, .6, .8):
            mx, my = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            p.px(mx - 2, my + 1, H('3f9a5a')); p.px(mx + 2, my + 1, H('3f9a5a')); p.px(mx, my, H('4fb06a'))
    p.outline(); return p

def grave(rng):
    p = new('grave', 26, 34)
    p.poly([(5, 33), (5, 12), (8, 5), (13, 3), (18, 5), (21, 12), (21, 33)], STONE_D)
    p.poly([(7, 33), (7, 13), (9, 7), (13, 5), (17, 7), (19, 13), (19, 33)], STONE_M)
    p.rect(11, 12, 14, 24, STONE_H); p.rect(8, 15, 17, 18, STONE_H)       # croix gravée
    p.rect(11, 12, 14, 24, STONE_L); p.rect(8, 15, 17, 18, STONE_L)
    p.speckle(rng, 6, 8, 20, 32, [MOSS_M, MOSS_L], 14)
    p.glow(13, 30, 8, VIO_M, .35, 3)
    p.outline(); return p

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); rng = random.Random(77)
    for f in (bush, fern, grave):
        p = f(rng); p.save(f'{out}/{p.name}.png')
    print('ok')
