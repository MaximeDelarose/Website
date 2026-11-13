"""Sprites v2 (style maquette : terrain vert/brun, accents roses) : héros chibi, ennemi orbe sombre, pins, ruines, portail, tourelles des 3 héros, poupée."""
import math, os, random, sys
from pixel import *

PINK = H('ff4fa8'); PINK_L = H('ff9bd2'); PINK_D = H('a01a68'); PINK_H = H('ffe0f0')
SKIN = H('f3d9c6'); SKIN_D = H('d7b39c')

def save(p, d, n): p.save(f'{d}/{n}.png')

# ------------------------------------------------------------ héros chibi
def chibi(kind, f, pose):
    p = Px(64, 80); cx = 32; bob = (0, 1)[f]
    if kind == 'eglantyne':
        hair, hair_d, hair_l = H('f4e6ee'), H('c9aebd'), H('ffffff'); dress, dress_d, dress_l = H('2f6a3c'), H('1c4226'), H('4fae62')
    else:
        hair, hair_d, hair_l = H('ff5fa8'), H('b0306e'), H('ff9bd2'); dress, dress_d, dress_l = H('2a1e3e'), H('150e24'), H('4a3868')
    p.ell(cx - 14, 74, cx + 14, 79, H('0a0612'))
    # jambes
    for i, x in enumerate((cx - 6, cx + 1)):
        up = (i + f) % 2
        p.rect(x, 62, x + 5, 72 - up, SKIN_D); p.rect(x - 1, 70 - up, x + 6, 75 - up, H('3a2a22') if kind == 'eglantyne' else H('1a1428'))
    # cheveux arrière (longs)
    p.poly([(cx - 14, 20 + bob), (cx - 16, 52), (cx - 8, 56), (cx + 8, 56), (cx + 16, 52), (cx + 14, 20 + bob)], hair_d)
    # robe / tenue
    p.poly([(cx - 10, 62), (cx - 8, 38 + bob), (cx + 8, 38 + bob), (cx + 10, 62), (cx + 14, 66)], dress)
    p.poly([(cx - 10, 62), (cx - 8, 38 + bob), (cx - 2, 38 + bob), (cx - 4, 62)], dress_l)
    p.rect(cx - 8, 52 + bob, cx + 8, 54 + bob, H('7a5a3a') if kind == 'eglantyne' else PINK)
    if kind == 'eglantyne':
        for k in range(5): p.poly([(cx - 12 + k * 6, 66), (cx - 9 + k * 6, 60), (cx - 6 + k * 6, 66)], dress_l)
        p.rect(cx - 1, 40 + bob, cx + 1, 46 + bob, PINK_L)
    else:
        p.rect(cx - 8, 40 + bob, cx + 8, 43 + bob, PINK_D); p.px(cx, 41 + bob, PINK_H)
    # bras
    arm_up = pose == 'atk'
    p.rect(cx - 13, 40 + bob, cx - 9, 52 + bob, dress); p.rect(cx - 13, 52 + bob, cx - 9, 55 + bob, SKIN)
    if arm_up: p.rect(cx + 9, 30 + bob, cx + 13, 42 + bob, dress); p.rect(cx + 9, 27 + bob, cx + 13, 30 + bob, SKIN)
    else: p.rect(cx + 9, 40 + bob, cx + 13, 52 + bob, dress); p.rect(cx + 9, 52 + bob, cx + 13, 55 + bob, SKIN)
    # tête
    p.ell(cx - 11, 8 + bob, cx + 11, 34 + bob, SKIN_D); p.ell(cx - 10, 8 + bob, cx + 10, 33 + bob, SKIN)
    p.poly([(cx - 12, 22 + bob), (cx - 11, 6 + bob), (cx, 3 + bob), (cx + 11, 6 + bob), (cx + 12, 22 + bob), (cx + 7, 14 + bob), (cx, 10 + bob), (cx - 7, 14 + bob)], hair)
    p.poly([(cx - 11, 8 + bob), (cx - 4, 4 + bob), (cx, 9 + bob), (cx - 6, 14 + bob)], hair_l)
    eye = PINK_D if kind == 'phelto' else H('2b1a3a')
    for dx in (-5, 3): p.rect(cx + dx, 21 + bob, cx + dx + 2, 25 + bob, eye); p.px(cx + dx, 21 + bob, H('ffffff'))
    p.px(cx - 8, 27 + bob, PINK_L); p.px(cx + 7, 27 + bob, PINK_L); p.px(cx, 28 + bob, H('b0605a'))
    if kind == 'eglantyne':   # rose + feuilles dans les cheveux, bâton
        p.ell(cx - 14, 4 + bob, cx - 6, 12 + bob, H('d02050')); p.ell(cx - 12, 6 + bob, cx - 8, 10 + bob, H('ff6a8a')); p.poly([(cx - 8, 10 + bob), (cx - 2, 12 + bob), (cx - 6, 15 + bob)], H('3fae78'))
        sx = cx + 16 if not arm_up else cx + 17
        p.line((sx, 74), (sx + 2, 26 + bob - (6 if arm_up else 0)), H('5a3a22'), 3)
        oy = 22 + bob - (6 if arm_up else 0); p.glow(sx + 2, oy, 11, PINK, .55, 3); p.ell(sx - 3, oy - 5, sx + 7, oy + 5, PINK_L); p.ell(sx - 1, oy - 3, sx + 2, oy, PINK_H)
    else:                      # guitare électrique
        gx = cx + 3
        p.line((cx - 6, 66), (cx + 20, 36 + bob), H('2a2036'), 3); p.px(cx + 21, 35 + bob, PINK_L)       # manche
        p.ell(cx - 12, 52 + bob, cx + 6, 70, PINK_D); p.ell(cx - 11, 52 + bob, cx + 4, 67, PINK); p.ell(cx - 9, 55 + bob, cx - 2, 60 + bob, PINK_L)
        p.rect(cx - 6, 58 + bob, cx - 1, 60 + bob, H('1a1428'))
        if arm_up: p.glow(cx + 20, 34 + bob, 10, PINK, .6, 3)
    p.outline(); return p

# ------------------------------------------------------------ ennemi orbe sombre (cf. fiche d'états)
def enemy_orb(f):
    p = Px(48, 48); cx, cy = 24, 27 + f
    rng = random.Random(5 + f)
    p.glow(cx, cy, 22, VIO_M, .3, 3)
    p.ball(cx, cy, 14, 13, H('0c0814'), H('1c1428'), H('3a2c50'), H('7a6a9a'))
    p.ell(cx - 7, cy - 4, cx - 3, cy + 4, VIO_L); p.ell(cx + 3, cy - 4, cx + 7, cy + 4, VIO_L)
    p.ell(cx - 6, cy - 3, cx - 4, cy + 1, H('ffd0ff')); p.ell(cx + 4, cy - 3, cx + 6, cy + 1, H('ffd0ff'))
    for _ in range(16):
        a = rng.uniform(0, 6.283); r = rng.uniform(15, 21); p.px(cx + math.cos(a) * r, cy + math.sin(a) * r * .9, rng.choice([VIO_M, VIO_L, PINK_L]))
    p.outline(OUT); return p

# ------------------------------------------------------------ décor
def pine(name, w, h, dark=False):
    p = Px(w, h); cx = w // 2
    c = [H('14301f'), H('1d4a2e'), H('2b6a3c')] if not dark else [H('1c1838'), H('2b2457'), H('3b3278')]
    p.rect(cx - 1, h - 8, cx + 1, h - 1, H('3a2a1e'))
    layers = 4 if h > 40 else 3
    for i in range(layers):
        top = 2 + i * (h - 14) // (layers + 1); bot = top + (h - 10) // layers + 6; half = 5 + i * (w // 2 - 6) // max(1, layers - 1)
        p.poly([(cx - half, bot), (cx, top), (cx + half, bot)], c[0]); p.poly([(cx - half + 2, bot - 1), (cx, top + 2), (cx + 1, bot - 1)], c[1]); p.poly([(cx - half + 3, bot - 2), (cx - 1, top + 4), (cx - 2, bot - 2)], c[2])
    p.outline(H('0a140e')); return p

def ruin(name, w, h, seed):
    p = Px(w, h); rng = random.Random(seed)
    def cube(x, y, s, top=H('6a6a7c'), l=H('4a4a5a'), r=H('34344a')):
        p.poly([(x, y), (x + s, y - s // 2), (x + 2 * s, y), (x + s, y + s // 2)], top); p.poly([(x, y), (x + s, y + s // 2), (x + s, y + s + s // 2), (x, y + s)], l); p.poly([(x + s, y + s // 2), (x + 2 * s, y), (x + 2 * s, y + s), (x + s, y + s + s // 2)], r)
    s = 8 if w > 40 else 7
    cube(2, h - 3 * s, s); cube(2 + 2 * s, h - 3 * s - 2, s); cube(s, h - 5 * s, s, H('777790')); 
    if w > 40: cube(2 + 3 * s, h - 5 * s - 2, s - 1)
    p.speckle(rng, 4, 8, w - 6, h - 4, [H('3a6a4a'), H('2c5a3a')], 10)
    p.px(w // 2, h // 2, PINK); p.px(w // 2 + 1, h // 2, PINK_L)
    p.outline(H('14101e')); return p

def sparkle():
    p = Px(16, 16); p.glow(8, 8, 7, PINK, .5, 3); p.px(8, 8, PINK_H); p.px(7, 8, PINK_L); p.px(9, 8, PINK_L); p.px(8, 7, PINK_L); p.px(8, 9, PINK_L); return p

def gate():
    p = Px(80, 88)
    p.glow(40, 56, 30, PINK, .35, 4)
    p.rect(8, 22, 22, 84, H('3a3a4c')); p.rect(8, 22, 12, 84, H('55556a')); p.rect(58, 22, 72, 84, H('3a3a4c')); p.rect(68, 22, 72, 84, H('2a2a3a'))
    for y in (36, 52, 68): p.line((8, y), (22, y), H('26263a')); p.line((58, y), (72, y), H('26263a'))
    p.poly([(4, 22), (76, 22), (66, 6), (14, 6)], H('4a4a5e')); p.poly([(14, 6), (66, 6), (60, 2), (20, 2)], H('66667e'))
    p.rect(22, 24, 58, 84, H('1a0c28'))
    for k in range(6): p.line((26 + k * 5, 84), (26 + k * 5 + (k % 2) * 2, 30), PINK_D if k % 2 else H('7a2a9a'))
    p.glow(40, 62, 18, PINK, .55, 3); p.ell(32, 40, 48, 64, PINK_D); p.ell(34, 44, 46, 62, PINK); p.ell(37, 48, 43, 58, PINK_H)
    p.poly([(20, 40), (14, 30), (24, 34)], MOSS_M); p.poly([(66, 44), (74, 32), (60, 36)], MOSS_M)
    p.outline(H('0e0a18')); return p

# ------------------------------------------------------------ tourelles des héros
def base(p):
    from gen_sprites import tower_base
    tower_base(p, False)

def tower_faille(lv):
    p = Px(64, 80); base(p); cx = 32
    def shard(x, y, h, w, c1, c2):
        p.poly([(x, y - h), (x + w, y), (x, y + h * .6), (x - w, y)], c1); p.poly([(x, y - h), (x + w, y), (x, y + h * .6)], c2)
    core = 28 - (2 if lv else 0)
    p.glow(cx, core, 22 + lv * 3, VIO_M, .5, 4)
    if lv >= 2:
        p.ell(cx - 20, core - 4, cx + 20, core + 6, VIO_D); p.ell(cx - 17, core - 3, cx + 17, core + 4, INK)
        for k in range(0, 360, 30): a = math.radians(k); p.px(cx + math.cos(a) * 18, core + 1 + math.sin(a) * 3, CY_L if k % 60 == 0 else VIO_L)
    shard(cx, core, 12 + lv * 3, 7 + lv, VIO_D, VIO_L)
    if lv >= 1: shard(cx - 14, core + 6, 8, 4, VIO_D, VIO_M); shard(cx + 14, core + 6, 8, 4, VIO_D, VIO_M)
    if lv >= 3:
        for dx in (-9, 9): shard(cx + dx, core - 12, 7, 3, INK, VIO_L)
    p.ell(cx - 3, core - 3, cx + 3, core + 5, CY_H); p.line((cx, core - 8), (cx, core + 10), INK)
    p.outline(); return p

def tower_ronce(lv):
    p = Px(64, 80); base(p); cx = 32
    p.glow(cx, 32, 20 + lv * 3, PINK, .35, 3)
    for dx in (-10, -4, 4, 10):
        p.line((cx + dx * .6, 46), (cx + dx * (1.1 + lv * .1), 28 - lv * 3 - abs(dx) * .3), H('1f6a3a'), 3); p.px(cx + dx * 1.1, 27 - lv * 3, H('a8f0c0'))
    for k in range(3 + lv * 2):
        x = cx - 12 + k * (24 // max(1, 2 + lv * 2)); y = 40 - (k * 5) % 14; p.poly([(x, y), (x + 2, y - 5), (x + 4, y)], H('e8e0c0'))   # épines
    r = 8 + lv * 2
    p.ell(cx - r, 32 - r, cx + r, 32 + r - 2, PINK_D); p.ell(cx - r + 2, 32 - r + 2, cx + r - 2, 32 + r - 4, PINK); p.ell(cx - r + 4, 32 - r + 3, cx - 1, 32 - 2, PINK_L)
    if lv >= 2: p.ell(cx - 4, 30, cx + 4, 40, H('2a0a24')); [p.px(cx - 3 + i * 2, 31, BONE) for i in range(4)]
    if lv >= 3:
        for dx in (-16, 16): p.ell(cx + dx - 5, 24, cx + dx + 5, 34, PINK_D); p.ell(cx + dx - 3, 26, cx + dx + 3, 32, PINK)
    p.outline(); return p

def tower_ampli(lv):
    p = Px(64, 80); base(p); cx = 32
    p.glow(cx, 32, 22 + lv * 3, PINK, .45, 4)
    def spk(x, y, w, h):
        p.rect(x - w, y - h, x + w, y + h, H('231a38')); p.rect(x - w, y - h, x - w + 2, y + h, H('4a3868')); p.rect(x - w, y - h, x + w, y - h + 1, H('6a5890'))
        p.ell(x - w + 3, y - h + 4, x + w - 3, y - h + 4 + (w - 3) * 2, PINK_D); p.ell(x - w + 5, y - h + 6, x + w - 5, y - h + 2 + (w - 3) * 2, PINK); p.ell(x - 2, y - h + 8, x + 2, y - h + 12, PINK_H)
    if lv == 0: spk(cx, 34, 9, 12)
    else:
        spk(cx, 32, 10 + lv, 13 + lv)
        if lv >= 1: spk(cx - 16, 40, 6, 8); spk(cx + 16, 40, 6, 8)
    for i in range(1, 2 + lv):
        p.ell(cx - 14 - i * 4, 18 - i * 2, cx + 14 + i * 4, 30 + i * 2 - 8, None) if False else None
        for a in range(-50, 51, 10): q = math.radians(a - 90); p.px(cx + math.cos(q) * (16 + i * 5), 30 + math.sin(q) * (14 + i * 5), PINK_L)
    if lv >= 3: p.ell(cx - 22, 4, cx + 22, 12, PINK_D); p.ell(cx - 20, 5, cx + 20, 10, H('3a0a2a')); p.glow(cx, 8, 18, PINK, .5, 3)
    p.outline(); return p

def doll():
    p = Px(16, 22)
    p.ell(3, 1, 12, 10, H('b98a5a')); p.ell(4, 1, 10, 7, H('d9a86e')); p.rect(5, 10, 10, 18, H('9a6a3a')); p.rect(2, 11, 4, 16, H('b98a5a')); p.rect(11, 11, 13, 16, H('b98a5a')); p.rect(5, 18, 7, 21, H('7a4a2a')); p.rect(9, 18, 11, 21, H('7a4a2a'))
    p.px(5, 4, GREEN_N); p.px(9, 4, GREEN_N); p.px(7, 7, H('3a1a0a')); p.line((4, 3), (6, 5), H('6a3a1a')); p.outline(H('1a0e08')); return p

def build_all(out):
    os.makedirs(out, exist_ok=True)
    for k in ('eglantyne', 'phelto'):
        for f in range(2): save(chibi(k, f, 'idle'), out, f'hero_{k}_{f}')
        save(chibi(k, 0, 'atk'), out, f'hero_{k}_atk')
    for f in range(2): save(enemy_orb(f), out, f'enemy_orb_{f}')
    save(pine('pine_s', 26, 38), out, 'pine_s'); save(pine('pine_m', 34, 54), out, 'pine_m'); save(pine('pine_d', 30, 46, True), out, 'pine_d')
    save(ruin('ruin_a', 46, 50, 1), out, 'ruin_a'); save(ruin('ruin_b', 34, 38, 2), out, 'ruin_b'); save(sparkle(), out, 'sparkle'); save(gate(), out, 'gate'); save(doll(), out, 'doll')
    for lv in range(4):
        save(tower_faille(lv), out, f'tower_faille_{lv}'); save(tower_ronce(lv), out, f'tower_ronce_{lv}'); save(tower_ampli(lv), out, f'tower_ampli_{lv}')

if __name__ == '__main__':
    build_all(sys.argv[1])
