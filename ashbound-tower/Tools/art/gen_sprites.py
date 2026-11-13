"""Sprites pixel art d'Ashbound Tower (décor, tourelle Orbe foudroyant, ennemis, Cœur, FX).
Tous dessinés ici de façon procédurale : originaux, aucun asset externe."""
import math, random
import numpy as np
from PIL import Image
from pixel import *

SPR = {}   # nom -> Px


def new(name, w, h):
    p = Px(w, h); SPR[name] = p; return p


def grad_fill(p, mask, colors, axis='y', bands=None):
    """remplit les pixels opaques de `mask` (Px) par un dégradé posterisé."""
    a = np.array(mask.im)[:, :, 3] > 40
    ys, xs = np.nonzero(a)
    if len(ys) == 0: return
    v = ys if axis == 'y' else xs
    lo, hi = v.min(), v.max() + 1
    n = len(colors)
    for y, x, vv in zip(ys, xs, v):
        t = (vv - lo) / (hi - lo)
        p.px(x, y, colors[min(n - 1, int(t * n))])


# ---------------------------------------------------------------- décor
def tree_dead(rng, name='tree_dead'):
    p = new(name, 64, 96)
    # tronc tordu
    trunk = [(26, 94), (22, 70), (25, 50), (24, 34), (30, 30), (36, 34), (36, 52), (40, 72), (43, 94)]
    p.poly(trunk, H('2b2036'))
    p.poly([(28, 94), (26, 70), (29, 50), (30, 34), (33, 34), (32, 52), (34, 72), (36, 94)], H('3a2c4a'))
    p.poly([(26, 94), (23, 72), (26, 50)], H('1b1426'))
    # base racines
    for x0, x1 in [(14, 26), (43, 54), (20, 28), (40, 48)]:
        p.poly([(x0, 95), (x1, 95), ((x0 + x1) / 2, 86)], H('2b2036'))
    # branches
    br = [((28, 36), (12, 16), 4), ((34, 34), (52, 12), 4), ((30, 44), (8, 38), 3), ((36, 46), (58, 36), 3), ((31, 30), (32, 4), 3)]
    for a, b, w in br:
        p.line(a, b, H('2b2036'), w)
        p.line((a[0] + 1, a[1]), (b[0] + 1, b[1]), H('3a2c4a'), max(1, w - 2))
    for tip in [(12, 16), (52, 12), (8, 38), (58, 36), (32, 4)]:
        p.line(tip, (tip[0] + rng.randint(-6, 6), tip[1] - rng.randint(3, 8)), H('2b2036'), 2)
        p.line(tip, (tip[0] + rng.randint(-8, 8), tip[1] + rng.randint(2, 7)), H('2b2036'), 1)
    # creux lumineux + feuilles spectrales
    p.glow(32, 64, 12, VIO_M, 0.6, 4)
    p.ell(28, 58, 36, 70, INK); p.ell(30, 61, 34, 68, VIO_L); p.ell(31, 62, 33, 65, VIO_H)
    for _ in range(14):
        x, y = rng.randint(6, 58), rng.randint(6, 44)
        p.px(x, y, rng.choice([VIO_M, VIO_L, MAG])); p.px(x, y + 1, VIO_D)
    p.speckle(rng, 24, 40, 42, 90, [STONE_L, H('4a3a5e')], 12)
    p.outline(); return p


def tree_teal(rng, name='tree_teal'):
    p = new(name, 64, 96)
    p.poly([(27, 95), (28, 62), (30, 50), (34, 50), (36, 62), (38, 95)], H('2a2038'))
    p.poly([(29, 95), (30, 62), (32, 50), (34, 50), (35, 62), (35, 95)], H('3a2c4a'))
    for x0, x1 in [(18, 28), (37, 48)]:
        p.poly([(x0, 95), (x1, 95), ((x0 + x1) / 2, 84)], H('2a2038'))
    blobs = [(32, 30, 22, 18), (18, 40, 14, 12), (46, 40, 14, 12), (32, 16, 14, 12), (24, 24, 12, 10), (42, 24, 12, 10)]
    for cx, cy, rx, ry in blobs:
        p.ball(cx, cy, rx, ry, H('0f4a4a'), H('15706a'), H('22a38a'), None)
    for cx, cy, rx, ry in blobs[:4]:
        for _ in range(8):
            p.px(cx + rng.randint(-rx + 3, rx - 3), cy + rng.randint(-ry + 3, ry - 3), CY_L)
    for _ in range(10):
        p.px(rng.randint(8, 56), rng.randint(6, 56), GREEN_N)
    p.glow(32, 32, 28, CY_M, 0.22, 3)
    p.outline(); return p


def rock(rng, name='rock', w=48, h=40):
    p = new(name, w, h)
    pts = [(2, h - 3), (4, h * 0.45), (w * 0.22, h * 0.16), (w * 0.5, 3), (w * 0.78, h * 0.2), (w - 3, h * 0.5), (w - 2, h - 3)]
    p.poly(pts, STONE_M)
    p.poly([(4, h - 3), (6, h * 0.5), (w * 0.24, h * 0.2), (w * 0.5, 5), (w * 0.45, h * 0.5), (w * 0.3, h * 0.8)], STONE_L)
    p.poly([(w * 0.5, 4), (w * 0.78, h * 0.22), (w - 4, h * 0.5), (w - 3, h - 3), (w * 0.7, h - 3), (w * 0.62, h * 0.5)], STONE_D)
    p.poly([(w * 0.22, h * 0.17), (w * 0.5, 4), (w * 0.62, h * 0.18), (w * 0.4, h * 0.3)], MOSS_L)   # mousse
    p.speckle(rng, 6, 8, w - 6, h - 6, [STONE_H, MOSS_M], max(4, w // 4))
    p.line((w * 0.35, h * 0.45), (w * 0.45, h * 0.8), OUT)
    p.outline(); return p


def crystal(rng, name='crystal'):
    p = new(name, 40, 60)
    p.glow(20, 40, 22, VIO_M, 0.5, 4)
    shards = [(20, 56, 8, 52, VIO_D, VIO_M, VIO_L), (11, 56, 5, 30, CY_D, CY_M, CY_L), (29, 56, 6, 36, VIO_D, MAG, VIO_L)]
    for cx, by, hw, hgt, d, m, l in shards:
        top = (cx, by - hgt)
        p.poly([(cx - hw, by), (cx - hw, by - hgt * 0.7), top, (cx + hw, by - hgt * 0.7), (cx + hw, by)], m)
        p.poly([(cx - hw, by), (cx - hw, by - hgt * 0.7), top, (cx, by - hgt * 0.6), (cx - 1, by)], l)
        p.poly([(cx + 1, by), (cx, by - hgt * 0.6), top, (cx + hw, by - hgt * 0.7), (cx + hw, by)], d)
        p.px(cx - 2, by - hgt * 0.6, CY_H)
    p.rect(4, 55, 36, 58, STONE_D); p.rect(6, 54, 34, 55, STONE_M)
    p.outline(); return p


def mushroom(rng, name='mushroom'):
    p = new(name, 40, 36)
    p.glow(20, 22, 18, CY_M, 0.3, 3)
    for cx, by, r, cap in [(12, 33, 7, (CY_D, CY_M, CY_L)), (26, 33, 9, ((MAG_D, MAG, H('ff8ad0')))), (19, 30, 5, (VIO_D, VIO_M, VIO_L))]:
        p.rect(cx - 1, by - r, cx + 1, by, BONE); p.px(cx - 1, by - r + 2, BONE_D)
        p.ell(cx - r, by - r * 1.6, cx + r, by - r * 0.4, cap[0])
        p.ell(cx - r + 1, by - r * 1.6, cx + r - 1, by - r * 0.7, cap[1])
        p.ell(cx - r * 0.5, by - r * 1.5, cx + r * 0.1, by - r * 1.05, cap[2])
        p.px(cx + 2, by - r * 1.1, CY_H)
    p.outline(); return p


def ruin_pillar(rng, name='ruin_pillar'):
    p = new(name, 44, 84)
    p.rect(6, 76, 38, 83, STONE_D); p.rect(6, 76, 38, 77, STONE_M)
    p.poly([(10, 76), (11, 26), (14, 22), (22, 28), (26, 20), (34, 24), (33, 76)], STONE_M)
    p.poly([(10, 76), (11, 28), (14, 24), (17, 26), (17, 76)], STONE_L)
    p.poly([(26, 20), (34, 24), (33, 76), (28, 76), (27, 30)], STONE_D)
    for y in (36, 50, 64):
        p.line((11, y), (33, y + 1), STONE_D)
    p.line((20, 30), (22, 44), OUT); p.line((22, 44), (19, 52), OUT)
    p.poly([(12, 28), (24, 26), (26, 30), (18, 34), (12, 36)], MOSS_M)
    for k in range(5):
        p.px(14 + k * 4, 40 + (k % 2) * 8, MOSS_L)
    for k in range(4):
        p.px(18, 60 + k, VIO_L); p.px(19, 60 + k, VIO_M)       # rune lumineuse
    p.px(16, 62, VIO_H)
    p.outline(); return p


def ruin_arch(rng, name='ruin_arch'):
    p = new(name, 100, 92)
    for x0 in (6, 74):
        p.rect(x0, 84, x0 + 20, 91, STONE_D); p.rect(x0, 84, x0 + 20, 85, STONE_M)
        p.rect(x0 + 3, 28, x0 + 17, 84, STONE_M); p.rect(x0 + 3, 28, x0 + 7, 84, STONE_L); p.rect(x0 + 13, 28, x0 + 17, 84, STONE_D)
        for y in (44, 62):
            p.line((x0 + 3, y), (x0 + 17, y), STONE_D)
    # arc partiel
    for k in range(0, 100):
        a = math.radians(180 + k * 1.2)
        for rr in (23, 22, 21, 20, 19, 18):
            x, y = 50 + math.cos(a) * rr * 2.0, 38 + math.sin(a) * rr * 1.3
            if 8 < x < 92:
                p.px(x, y, STONE_L if rr > 20 else STONE_M)
    p.rect(40, 14, 62, 20, STONE_L)
    p.poly([(2, 26), (30, 26), (26, 18), (12, 18)], STONE_M)
    p.poly([(12, 30), (30, 28), (30, 34), (14, 40)], MOSS_M)
    for k in range(8): p.px(10 + k * 3, 58 + (k % 3), MOSS_L)
    p.glow(50, 60, 26, VIO_M, 0.45, 4)           # portail spectral entre les piliers
    for y in range(36, 84, 3):
        p.line((30, y), (70, y), VIO_D if (y // 3) % 2 else VIO_M)
    p.outline(); return p


def bones(rng, name='bones'):
    p = new(name, 40, 24)
    for i in range(6):
        y = 14 + (i % 3) * 2
        p.line((8 + i * 4, y), (14 + i * 4, y - 6), BONE, 2)
    p.ball(12, 12, 7, 6, BONE_D, BONE, H('ece4c8'))
    p.rect(9, 11, 10, 12, OUT); p.rect(13, 11, 14, 12, OUT); p.px(12, 15, OUT)
    p.px(10, 11, CY_M); p.px(14, 11, CY_M)
    p.line((24, 18), (36, 20), BONE, 2); p.ell(34, 18, 38, 22, BONE)
    p.outline(); return p


def brazier(rng, name, f):
    p = new(name, 28, 50)
    p.glow(14, 18, 15, EMB_M, 0.4, 4)
    p.poly([(9, 49), (11, 30), (17, 30), (19, 49)], STONE_M)
    p.poly([(9, 49), (11, 31), (13, 31), (13, 49)], STONE_L)
    p.poly([(4, 30), (6, 40), (22, 40), (24, 30)], STONE_D)
    p.rect(4, 29, 24, 31, STONE_L)
    sway = (-1, 0, 1)[f % 3]
    p.poly([(7, 29), (10 + sway, 14), (14 + sway * 2, 3 + f), (18 + sway, 14), (21, 29)], EMB_M)
    p.poly([(10, 29), (12 + sway, 16), (14 + sway, 8 + f), (16 + sway, 16), (18, 29)], EMB_L)
    p.poly([(12, 29), (14, 18), (16, 29)], EMB_H)
    p.outline(); return p


# ---------------------------------------------------------------- tourelle Orbe foudroyant
def tower_base(p, gold=False):
    cx = 32
    p.ell(10, 62, 54, 76, OUT)
    p.ell(11, 60, 53, 74, STONE_D)
    p.ell(12, 58, 52, 71, STONE_M)
    p.ell(15, 57, 49, 68, STONE_L)
    for k in range(8):
        a = math.radians(k * 45)
        p.px(cx + math.cos(a) * 15, 64 + math.sin(a) * 5, CY_M)
    p.poly([(24, 62), (26, 44), (38, 44), (40, 62)], STONE_M)
    p.poly([(24, 62), (26, 44), (29, 44), (29, 62)], STONE_L)
    p.poly([(36, 62), (36, 44), (38, 44), (40, 62)], STONE_D)
    col = GOLD_M if gold else STONE_H
    p.rect(23, 43, 41, 46, col); p.rect(23, 43, 41, 44, GOLD_L if gold else STONE_H)


def prong(p, x0, y0, x1, y1, col=STONE_H):
    p.line((x0, y0), (x1, y1), col, 2); p.px(x1, y1 - 1, CY_H)


def orb(p, cx, cy, r, core=CY_H):
    p.glow(cx, cy, r * 2.4, CY_M, 0.55, 5)
    p.ell(cx - r, cy - r, cx + r, cy + r, CY_D)
    p.ell(cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1, CY_M)
    p.ell(cx - r * 0.7, cy - r * 0.7, cx + r * 0.2, cy + r * 0.2, CY_L)
    p.ell(cx - r * 0.45, cy - r * 0.45, cx - r * 0.05, cy - r * 0.05, core)


def tower_orb(level, rng):
    p = new(f'tower_orb_{level}', 64, 80)
    tower_base(p, gold=(level == 3))
    if level == 0:
        for dx in (-9, -3, 3, 9):
            prong(p, 32 + dx * 0.8, 44, 32 + dx * 1.2, 34 - abs(dx) * 0.2)
        orb(p, 32, 30, 9)
    elif level == 1:
        for dx in (-13, 13):
            p.line((32 + dx * 0.5, 44), (32 + dx, 36), STONE_H, 2)
            p.ell(32 + dx - 3, 28, 32 + dx + 3, 36, STONE_D)
            orb(p, 32 + dx, 30, 5)
        for dx in (-7, 7):
            prong(p, 32 + dx * 0.6, 44, 32 + dx, 34)
        orb(p, 32, 26, 9)
        for dx in (-13, 13):
            p.line((32 + dx, 30), (32, 26), CY_L)            # arcs entre orbes
    elif level == 2:
        for dx in (-14, 14):
            p.rect(32 + dx - 2, 18, 32 + dx + 2, 45, STONE_M); p.rect(32 + dx - 2, 18, 32 + dx - 1, 45, STONE_L)
            p.rect(32 + dx - 3, 16, 32 + dx + 3, 19, GOLD_M); p.ell(32 + dx - 3, 10, 32 + dx + 3, 17, CY_L)
        orb(p, 32, 26, 11)
        for i in range(6):                                  # arcs électriques en zigzag
            for sgn in (-1, 1):
                y = 18 + i * 3
                p.px(32 + sgn * (14 - i * 2) + rng.randint(-1, 1), y, CY_H)
        p.line((18, 13), (28, 20), CY_L); p.line((46, 13), (36, 20), CY_L)
    else:
        for dx in (-16, 16):
            p.rect(32 + dx - 3, 16, 32 + dx + 3, 45, STONE_M); p.rect(32 + dx - 3, 16, 32 + dx - 1, 45, STONE_L)
            p.rect(32 + dx - 4, 13, 32 + dx + 4, 17, GOLD_M); p.rect(32 + dx - 4, 13, 32 + dx + 4, 14, GOLD_L)
            p.poly([(32 + dx - 3, 13), (32 + dx, 2), (32 + dx + 3, 13)], CY_L)
        p.ell(14, 30, 50, 38, VIO_D); p.ell(16, 31, 48, 37, INK)                   # anneau flottant
        for k in range(0, 360, 24):
            a = math.radians(k); p.px(32 + math.cos(a) * 17, 34 + math.sin(a) * 3, VIO_H if k % 48 == 0 else CY_M)
        for k in range(7):                                  # couronne de pointes
            a = math.radians(200 + k * 23)
            p.line((32 + math.cos(a) * 12, 24 + math.sin(a) * 12), (32 + math.cos(a) * 21, 24 + math.sin(a) * 21), CY_L, 2)
        orb(p, 32, 24, 13, CY_H)
        p.glow(32, 24, 22, H('ffffff'), 0.25, 3)
    p.outline(); return p


# ---------------------------------------------------------------- ennemis
def enemy_orb(f):
    p = new(f'enemy_orb_{f}', 48, 48)
    sq = (0, 2)[f]
    p.ellipse = None
    cx, cy = 24, 28 + sq // 2
    rx, ry = 15 + sq, 14 - sq
    p.glow(cx, cy, 24, VIO_M, 0.28, 3)
    # pointes
    for k, ang in enumerate([-150, -120, -90, -60, -30]):
        a = math.radians(ang)
        p.poly([(cx + math.cos(a - 0.25) * rx, cy + math.sin(a - 0.25) * ry), (cx + math.cos(a) * (rx + 7), cy + math.sin(a) * (ry + 8)), (cx + math.cos(a + 0.25) * rx, cy + math.sin(a + 0.25) * ry)], VIO_D)
    p.ball(cx, cy, rx, ry, H('1f1038'), H('3b1670'), VIO_M, None)
    # tentacules / gouttes
    for i, dx in enumerate((-9, -3, 4, 10)):
        h_ = 6 + ((i + f) % 2) * 3
        p.rect(cx + dx - 1, cy + ry - 2, cx + dx + 1, cy + ry + h_ - 5, VIO_D)
    # œil
    p.ell(cx - 6, cy - 6, cx + 6, cy + 5, INK)
    p.ell(cx - 5, cy - 5, cx + 5, cy + 4, CY_D)
    p.ell(cx - 3, cy - 4, cx + 3, cy + 2, CY_L)
    p.ell(cx - 1, cy - 3, cx + 1, cy, INK)
    p.px(cx - 2, cy - 4, CY_H)
    p.outline(); return p


def enemy_scout(f):
    p = new(f'enemy_scout_{f}', 56, 40)
    cx, cy = 28, 24
    p.glow(cx, cy, 24, MAG, 0.22, 3)
    # pattes alternées
    for i, x in enumerate((14, 21, 33, 40)):
        up = (i + f) % 2
        p.line((x, cy + 5), (x + (3 if up else -3), 36 - up * 3), H('2a0e2e'), 3)
    p.ell(8, 14, 46, 32, H('2a0e2e'))
    p.ell(9, 14, 45, 30, H('4a1550'))
    p.ell(12, 14, 36, 24, H('7a2285'))
    for k in range(7):                                   # épines dorsales
        x = 12 + k * 5
        p.poly([(x, 17), (x + 2, 8 - (k % 2) * 3), (x + 4, 17)], MAG_D)
    p.poly([(40, 14), (54, 22), (48, 31), (38, 29)], H('4a1550'))       # museau
    p.poly([(40, 14), (46, 6), (47, 15)], MAG_D)                         # oreille
    p.px(46, 19, MAG); p.px(47, 19, H('ffb0dd')); p.px(45, 19, MAG)
    p.rect(48, 27, 53, 28, BONE)
    p.line((8, 20), (2, 14 + f * 3), H('4a1550'), 3)                     # queue
    p.outline(); return p


def enemy_elite(f):
    p = new(f'enemy_elite_{f}', 72, 80)
    cx = 36; bob = f * 2
    p.glow(cx, 42, 34, EMB_M, 0.22, 3)
    for x in (22, 42):                                    # jambes
        p.rect(x, 62 + (bob if x < 30 else 0), x + 9, 76, STONE_D); p.rect(x - 2, 74, x + 11, 78, STONE_M)
    p.poly([(16, 62), (20, 30 + bob), (52, 30 + bob), (56, 62)], STONE_M)        # torse
    p.poly([(20, 62), (22, 32 + bob), (30, 32 + bob), (30, 62)], STONE_L)
    p.poly([(46, 62), (46, 32 + bob), (52, 32 + bob), (56, 62)], STONE_D)
    for (x0, y0, x1, y1) in [(26, 40, 34, 52), (38, 46, 46, 58), (30, 54, 36, 60)]:  # fissures de braise
        p.line((x0, y0 + bob), (x1, y1 + bob), EMB_L, 2); p.px(x0, y0 + bob, EMB_H)
    for sx in (-1, 1):                                    # épaulières
        x = cx + sx * 24
        p.ell(x - 9, 24 + bob, x + 9, 42 + bob, STONE_D); p.ell(x - 8, 24 + bob, x + 8, 38 + bob, STONE_L)
        p.poly([(x - 4, 26 + bob), (x, 14 + bob), (x + 4, 26 + bob)], STONE_H)
        p.rect(x - 5, 42 + bob, x + 5, 58 + bob, STONE_M)
        p.ell(x - 7, 56 + bob, x + 7, 66 + bob, STONE_L)
    p.ell(cx - 10, 12 + bob, cx + 10, 32 + bob, STONE_D)                       # casque
    p.ell(cx - 9, 12 + bob, cx + 9, 30 + bob, STONE_M)
    p.rect(cx - 7, 22 + bob, cx + 7, 25 + bob, INK)
    p.rect(cx - 5, 22 + bob, cx - 2, 24 + bob, EMB_L); p.rect(cx + 2, 22 + bob, cx + 5, 24 + bob, EMB_L)
    p.poly([(cx - 3, 12 + bob), (cx, 2 + bob), (cx + 3, 12 + bob)], EMB_M)
    p.outline(); return p


def enemy_miniboss(f):
    p = new(f'enemy_miniboss_{f}', 112, 112)
    cx = 56; bob = f * 2
    p.glow(cx, 62, 52, GREEN_N, 0.18, 4)
    p.ell(26, 100 - 2, 86, 110, H('0a0612'))
    for x in (30, 60):                                    # jambes-dalles
        p.rect(x, 84 + (bob if x < 40 else 0), x + 22, 106, STONE_D); p.rect(x - 3, 102, x + 25, 108, STONE_M)
    # torse : blocs superposés
    blocks = [(24, 44, 88, 88, STONE_D), (28, 44, 84, 84, STONE_M), (34, 28 + bob, 78, 56, STONE_M), (42, 14 + bob, 70, 34, STONE_L)]
    for x0, y0, x1, y1, c in blocks:
        p.rect(x0, y0, x1, y1, c)
    for y in (58, 72):
        p.line((28, y), (84, y + 1), OUT)
    p.line((56, 44), (58, 88), OUT); p.line((42, 60), (40, 84), OUT)
    p.poly([(28, 44), (84, 44), (78, 36), (34, 36)], MOSS_M)                    # mousse sur les épaules
    for k in range(10): p.px(30 + k * 5, 46 + (k % 3), MOSS_L)
    # cœur de runes vert
    p.glow(cx, 66, 18, GREEN_N, 0.6, 4)
    p.ell(cx - 8, 58, cx + 8, 76, GREEN_D); p.ell(cx - 6, 60, cx + 6, 74, GREEN_N); p.ell(cx - 3, 63, cx + 3, 70, H('d8ffe8'))
    # bras
    p.rect(8, 40 + bob, 26, 54 + bob, STONE_M); p.rect(2, 52 + bob, 24, 86 + bob, STONE_D); p.rect(2, 52 + bob, 8, 86 + bob, STONE_L)
    p.rect(0, 84 + bob, 26, 100 + bob, STONE_M); p.rect(0, 84 + bob, 8, 100 + bob, STONE_L)
    p.rect(86, 40 + bob, 104, 54 + bob, STONE_M); p.rect(88, 52 + bob, 110, 82 + bob, STONE_D)
    p.rect(88, 80 + bob, 112, 96 + bob, STONE_M); p.rect(88, 80 + bob, 94, 96 + bob, STONE_L)
    # tête
    p.rect(46, 4 + bob, 66, 18 + bob, STONE_M); p.rect(46, 4 + bob, 50, 18 + bob, STONE_L)
    p.rect(48, 9 + bob, 64, 12 + bob, INK); p.rect(50, 9 + bob, 53, 11 + bob, GREEN_N); p.rect(59, 9 + bob, 62, 11 + bob, GREEN_N)
    p.poly([(44, 6 + bob), (50, -2 + bob), (52, 6 + bob)], STONE_H) if False else None
    p.outline(); return p


def enemy_boss(f):
    p = new(f'enemy_boss_{f}', 144, 150)
    cx = 72; bob = f * 2
    p.glow(cx, 70, 70, EMB_M, 0.28, 5)
    p.ell(30, 136, 114, 148, H('0a0612'))
    # cape / robe
    p.poly([(36, 146), (32, 70 + bob), (52, 36 + bob), (92, 36 + bob), (112, 70 + bob), (108, 146)], H('3a0e18'))
    p.poly([(44, 146), (42, 76 + bob), (56, 40 + bob), (72, 40 + bob), (72, 146)], H('5a1420'))
    p.poly([(72, 146), (72, 40 + bob), (90, 40 + bob), (104, 76 + bob), (100, 146)], H('240810'))
    for k in range(7):
        x = 38 + k * 10
        p.poly([(x, 146), (x + 5, 154 - 8 * (k % 2) - 8), (x + 10, 146)], H('3a0e18')) if False else None
    for x in range(40, 108, 9):
        p.line((x, 146), (x + 2, 118), H('7a1d12'))
    # armure : plastron + épaules
    p.poly([(48, 92 + bob), (52, 56 + bob), (92, 56 + bob), (96, 92 + bob), (84, 100 + bob), (60, 100 + bob)], H('2e2a3c'))
    p.poly([(52, 92 + bob), (54, 58 + bob), (66, 58 + bob), (64, 96 + bob)], STONE_M)
    p.glow(cx, 78 + bob, 14, EMB_L, 0.6, 3)
    p.ell(cx - 8, 70 + bob, cx + 8, 88 + bob, EMB_D); p.ell(cx - 6, 72 + bob, cx + 6, 86 + bob, EMB_M); p.ell(cx - 3, 75 + bob, cx + 3, 82 + bob, EMB_H)
    for sx in (-1, 1):
        x = cx + sx * 34
        p.ell(x - 16, 44 + bob, x + 16, 70 + bob, H('2e2a3c')); p.ell(x - 14, 44 + bob, x + 12, 64 + bob, STONE_M)
        for k in range(3):
            p.poly([(x - 10 + k * 8, 48 + bob), (x - 6 + k * 8, 30 + bob - k * 2), (x - 2 + k * 8, 48 + bob)], STONE_H if k != 1 else EMB_M)
        p.rect(x - 8, 68 + bob, x + 8, 100 + bob, H('3a0e18'))
        p.ell(x - 11, 98 + bob + (f if sx > 0 else 0), x + 11, 114 + bob, STONE_M)
    # tête casquée à cornes + couronne de flammes
    p.ell(cx - 14, 22 + bob, cx + 14, 54 + bob, H('2e2a3c')); p.ell(cx - 12, 22 + bob, cx + 10, 50 + bob, STONE_M)
    p.rect(cx - 10, 36 + bob, cx + 10, 41 + bob, INK)
    p.rect(cx - 8, 37 + bob, cx - 3, 40 + bob, EMB_H); p.rect(cx + 3, 37 + bob, cx + 8, 40 + bob, EMB_H)
    for sx in (-1, 1):
        p.poly([(cx + sx * 12, 30 + bob), (cx + sx * 30, 18 + bob), (cx + sx * 36, -2 + bob), (cx + sx * 24, 22 + bob), (cx + sx * 12, 40 + bob)], BONE)
    for k in range(7):                                   # flammes de la couronne
        x = cx - 18 + k * 6
        hgt = 20 + ((k + f) % 3) * 6 - abs(k - 3) * 3
        p.poly([(x - 4, 26 + bob), (x + 1, 26 - hgt + bob), (x + 6, 26 + bob)], EMB_M)
        p.poly([(x - 1, 26 + bob), (x + 1, 26 - hgt * 0.6 + bob), (x + 4, 26 + bob)], EMB_L)
    p.glow(cx, 14 + bob, 26, EMB_L, 0.45, 4)
    p.outline(); return p


# ---------------------------------------------------------------- Cœur
def heart(f):
    p = new(f'heart_{f}', 96, 112)
    pulse = (0, 3)[f]
    cx, cy = 48, 56
    p.glow(cx, cy, 44 + pulse * 2, CY_M, 0.5, 6)
    p.glow(cx, cy, 30 + pulse, VIO_L, 0.45, 4)
    # forme de cœur
    mask = Px(96, 112)
    r = 21 + pulse // 2
    mask.ell(cx - r - 3, cy - r - 8, cx + 2, cy + 6, (255, 255, 255, 255))
    mask.ell(cx - 2, cy - r - 8, cx + r + 3, cy + 6, (255, 255, 255, 255))
    mask.poly([(cx - r - 3, cy - 6), (cx + r + 3, cy - 6), (cx, cy + r + 22)], (255, 255, 255, 255))
    ol = Px(96, 112); ol.im = mask.im.copy(); ol.d = ImageDraw.Draw(ol.im)
    ol.outline(OUT, diag=True)
    p.im = Image.alpha_composite(p.im, ol.im); p.d = ImageDraw.Draw(p.im)
    grad_fill(p, mask, [CY_H, CY_L, CY_M, VIO_L, VIO_M, VIO_D], 'y')
    # facettes
    for a, b in [((cx - 14, cy - 18), (cx - 4, cy + 4)), ((cx + 8, cy - 22), (cx + 2, cy + 8)), ((cx - 22, cy - 4), (cx, cy + 26)), ((cx + 22, cy - 4), (cx, cy + 26)), ((cx - 4, cy + 4), (cx, cy + 26))]:
        p.line(a, b, H('2b0f66'))
    p.poly([(cx - 17, cy - 22), (cx - 8, cy - 24), (cx - 12, cy - 14)], CY_H)
    p.px(cx - 8, cy - 8, H('ffffff'))
    # éclats en orbite
    for k, (dx, dy) in enumerate([(-34, -10 + pulse), (36, -18 - pulse), (-28, 22), (32, 18)]):
        p.poly([(cx + dx - 3, cy + dy + 5), (cx + dx, cy + dy - 6), (cx + dx + 3, cy + dy + 5)], CY_L)
        p.px(cx + dx, cy + dy - 3, CY_H)
    p.outline(); return p


# ---------------------------------------------------------------- FX & divers
def fx():
    p = new('fx_spark', 16, 16)
    for r, a in [(7, 40), (5, 90), (3, 170), (1.5, 255)]:
        p.ell(8 - r, 8 - r, 8 + r - 1, 8 + r - 1, (255, 255, 255, a))
    p = new('fx_ring', 64, 64)
    for k in range(0, 720):
        a = math.radians(k / 2)
        for rr in (30, 29, 28):
            p.px(32 + math.cos(a) * rr, 32 + math.sin(a) * rr, (255, 255, 255, 255 if rr == 30 else 140))
    p = new('fx_disc', 64, 64)
    p.ell(1, 1, 62, 62, (255, 255, 255, 60))
    p = new('fx_shadow', 32, 16)
    p.ell(0, 0, 31, 15, (0, 0, 0, 90)); p.ell(4, 3, 27, 12, (0, 0, 0, 70))
    p = new('fx_slot', 64, 64)
    ang0 = math.pi / 8
    pts = [(32 + math.cos(ang0 + k * math.pi / 4) * 30, 32 + math.sin(ang0 + k * math.pi / 4) * 30) for k in range(8)]
    for i in range(8):
        p.line(pts[i], pts[(i + 1) % 8], (255, 255, 255, 255), 2)
    p.glow(32, 32, 30, (255, 255, 255, 255), 0.25, 3)
    p = new('fx_bolt', 8, 32)
    p.rect(3, 0, 4, 31, (255, 255, 255, 255)); p.rect(2, 0, 5, 31, (255, 255, 255, 110))


def build_all(out_dir):
    import os
    os.makedirs(out_dir, exist_ok=True)
    rng = random.Random(21)
    tree_dead(random.Random(3)); tree_teal(random.Random(4)); rock(rng); rock(rng, 'rock_small', 26, 22)
    crystal(rng); mushroom(rng); ruin_pillar(rng); ruin_arch(rng); bones(rng)
    for f in range(2): brazier(rng, f'brazier_{f}', f)
    for lv in range(4): tower_orb(lv, random.Random(40 + lv))
    for f in range(2):
        enemy_orb(f); enemy_scout(f); enemy_elite(f); enemy_miniboss(f); enemy_boss(f); heart(f)
    fx()
    for k, p in SPR.items():
        p.save(os.path.join(out_dir, k + '.png'))
    return SPR
