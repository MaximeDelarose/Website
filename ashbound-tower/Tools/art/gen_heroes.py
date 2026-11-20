"""Sprites de héros 64x80 (pivot bas-centre) : Épéiste électrique (marche ×2), Noctis et Églantyne (repos ×2). Originaux, procéduraux."""
import math, os, random, sys
from pixel import *

def epeiste(f):
    p = Px(64, 80); cx = 30; bob = (0, 1)[f]
    p.glow(cx, 44, 30, CY_M, 0.18, 3)
    # cape
    p.poly([(cx - 12, 30 + bob), (cx + 12, 30 + bob), (cx + 16, 70), (cx - 16, 72 + f)], H('1c1a46')); p.poly([(cx - 8, 34 + bob), (cx + 6, 34 + bob), (cx + 10, 70), (cx - 8, 70)], H('2b2870'))
    # jambes
    for i, x in enumerate((cx - 9, cx + 2)):
        up = (i + f) % 2
        p.rect(x, 58, x + 7, 72 - up * 2, H('232a52')); p.rect(x - 1, 70 - up * 2, x + 8, 76 - up * 2, H('14182f')); p.rect(x, 58, x + 2, 70 - up * 2, H('34407a'))
    # torse
    p.poly([(cx - 12, 58), (cx - 14, 34 + bob), (cx + 14, 34 + bob), (cx + 12, 58)], STONE_M); p.poly([(cx - 12, 58), (cx - 14, 34 + bob), (cx - 6, 34 + bob), (cx - 6, 58)], STONE_L); p.poly([(cx + 6, 58), (cx + 6, 34 + bob), (cx + 14, 34 + bob), (cx + 12, 58)], STONE_D)
    p.rect(cx - 12, 54, cx + 12, 57, GOLD_M); p.rect(cx - 2, 40 + bob, cx + 2, 50 + bob, CY_L); p.px(cx, 44 + bob, CY_H)
    # épaulières
    for s in (-1, 1):
        p.ell(cx + s * 15 - 6, 30 + bob, cx + s * 15 + 6, 42 + bob, STONE_D); p.ell(cx + s * 15 - 5, 30 + bob, cx + s * 15 + 4, 39 + bob, STONE_L)
        p.poly([(cx + s * 15 - 2, 31 + bob), (cx + s * 15, 22 + bob), (cx + s * 15 + 2, 31 + bob)], CY_L)
    # tête casquée
    p.ell(cx - 9, 12 + bob, cx + 9, 34 + bob, STONE_D); p.ell(cx - 8, 12 + bob, cx + 8, 32 + bob, STONE_M); p.ell(cx - 7, 13 + bob, cx, 24 + bob, STONE_L)
    p.rect(cx - 6, 22 + bob, cx + 6, 25 + bob, INK); p.rect(cx - 5, 23 + bob, cx + 5, 24 + bob, CY_L)
    p.poly([(cx - 2, 12 + bob), (cx + 2, 12 + bob), (cx + 6, 2 + bob), (cx - 6, 4 + bob)], CY_M)  # crête
    # bras + épée (arme levée à droite)
    p.rect(cx + 14, 40 + bob, cx + 20, 50 + bob, STONE_M); p.ell(cx + 16, 48 + bob, cx + 24, 55 + bob, STONE_L)
    p.line((cx + 20, 50 + bob), (cx + 33, 14 + bob), CY_D, 5); p.line((cx + 20, 50 + bob), (cx + 33, 14 + bob), CY_L, 3); p.line((cx + 21, 48 + bob), (cx + 33, 14 + bob), CY_H, 1)
    p.rect(cx + 15, 47 + bob, cx + 25, 49 + bob, GOLD_L)
    p.glow(cx + 32, 16 + bob, 12, CY_M, 0.5, 3)
    for k in range(5): p.px(cx + 18 + k * 3 + (f * 2), 30 + bob - k * 3, CY_H)
    p.outline(); return p

def noctis(f):
    p = Px(64, 80); cx = 32; bob = (0, 2)[f]
    p.glow(cx, 46, 30, VIO_M, 0.22, 3)
    p.ell(cx - 16, 74, cx + 16, 79, H('0a0612'))
    p.poly([(cx - 18, 70 - bob), (cx - 12, 34 + bob), (cx + 12, 34 + bob), (cx + 18, 70 - bob), (cx + 8, 76 - bob), (cx, 70), (cx - 8, 76 - bob)], H('15122e'))
    p.poly([(cx - 12, 70 - bob), (cx - 8, 36 + bob), (cx, 36 + bob), (cx - 2, 70)], H('221c48')); p.rect(cx - 1, 38 + bob, cx + 1, 66, VIO_M)
    p.ell(cx - 12, 10 + bob, cx + 12, 38 + bob, H('15122e')); p.ell(cx - 9, 14 + bob, cx + 9, 36 + bob, INK)
    p.rect(cx - 6, 24 + bob, cx - 3, 26 + bob, CY_H); p.rect(cx + 3, 24 + bob, cx + 6, 26 + bob, CY_H); p.glow(cx, 25 + bob, 8, CY_M, .5, 3)
    p.poly([(cx - 4, 10 + bob), (cx, 0 + bob), (cx + 4, 10 + bob)], VIO_M)
    for k, (dx, dy) in enumerate([(-24, 40), (24, 34), (-20, 58), (22, 56)]):
        yy = dy + (bob if k % 2 else -bob); p.poly([(cx + dx - 3, yy + 5), (cx + dx, yy - 6), (cx + dx + 3, yy + 5)], CY_L if k % 2 else VIO_L)
    p.rect(cx - 14, 48 + bob, cx - 9, 52 + bob, H('d9c2b0')); p.rect(cx + 9, 48 + bob, cx + 14, 52 + bob, H('d9c2b0'))
    p.outline(); return p

def eglantyne(f):
    p = Px(64, 80); cx = 32; bob = (0, 1)[f]
    p.glow(cx, 46, 30, GREEN_N, 0.15, 3)
    p.poly([(cx - 17, 74), (cx - 10, 40 + bob), (cx + 10, 40 + bob), (cx + 17, 74)], H('1f5a3a')); p.poly([(cx - 17, 74), (cx - 10, 40 + bob), (cx - 2, 40 + bob), (cx - 4, 74)], H('2f8a5c')); p.poly([(cx + 8, 74), (cx + 6, 40 + bob), (cx + 10, 40 + bob), (cx + 17, 74)], H('143c2a'))
    for x in range(cx - 15, cx + 16, 6): p.poly([(x, 74), (x + 3, 66), (x + 6, 74)], H('2f8a5c'))   # bas de robe en feuilles
    p.rect(cx - 9, 52 + bob, cx + 9, 55 + bob, H('5a3a22')); p.rect(cx - 2, 44 + bob, cx + 2, 50 + bob, VIO_L)
    p.ell(cx - 9, 16 + bob, cx + 9, 40 + bob, H('6a4a34')); p.ell(cx - 8, 17 + bob, cx + 2, 30 + bob, H('8a6244'))
    p.rect(cx - 5, 27 + bob, cx - 3, 29 + bob, VIO_H); p.rect(cx + 3, 27 + bob, cx + 5, 29 + bob, VIO_H)
    p.poly([(cx - 12, 22 + bob), (cx - 9, 8 + bob), (cx + 9, 8 + bob), (cx + 12, 22 + bob), (cx, 14 + bob)], H('2a1a12'))
    for k in range(5): p.poly([(cx - 10 + k * 5, 11 + bob), (cx - 8 + k * 5, 0 + bob + (k % 2) * 3), (cx - 6 + k * 5, 11 + bob)], H('3fae78'))
    p.line((cx + 17, 74), (cx + 20, 22 + bob), H('5a3a22'), 3)
    p.glow(cx + 20, 18 + bob, 11, VIO_M, .6, 3); p.ell(cx + 16, 14 + bob, cx + 24, 22 + bob, VIO_L); p.ell(cx + 18, 16 + bob, cx + 21, 19 + bob, VIO_H)
    for k in range(4): p.px(cx - 20 + k * 3, 56 - k * 5 + f, GREEN_N)
    p.outline(); return p

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for f in range(2):
        epeiste(f).save(f'{out}/hero_epeiste_{f}.png'); noctis(f).save(f'{out}/hero_noctis_{f}.png'); eglantyne(f).save(f'{out}/hero_eglantyne_{f}.png')
