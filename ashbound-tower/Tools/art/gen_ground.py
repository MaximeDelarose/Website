"""Peint le sol de l'arène 01 (1152x640 @32 px/unité) à partir de layout.py."""
import math, random
import numpy as np
from PIL import Image
from pixel import *
import layout

W, Hh = layout.ARENA_W * layout.PPU, layout.ARENA_H * layout.PPU


def w2p(x, z):
    return ((x + layout.ARENA_W / 2) * layout.PPU, (layout.ARENA_H / 2 - z) * layout.PPU)


def pal(hexes):
    return np.array([H(h)[:3] for h in hexes], dtype=np.uint8)


def paint(L, out_path):
    rng = random.Random(7)
    nrng = random.Random(11)
    ys, xs = np.mgrid[0:Hh, 0:W]

    # --- 1. terrain de base : terre sombre bleutée, mousse, zones corrompues ---
    n_big = value_noise(W, Hh, 64, nrng, 3)
    n_mid = value_noise(W, Hh, 14, nrng, 2)
    n_cor = value_noise(W, Hh, 110, nrng, 2)
    base = pal(['141729', '181c33', '1d2340', '232b4c'])
    moss = pal(['12302b', '17403a', '1d5444', '256a52'])
    corr = pal(['25134a', '311a63', '3f2183'])
    t = np.clip(((n_big * 0.7 + n_mid * 0.3) * 4).astype(int), 0, 3)
    img = base[t]
    mmask = (n_big > 0.56)
    mt = np.clip((((n_big - 0.56) * 6 + n_mid * 1.4)).astype(int), 0, 3)
    img[mmask] = moss[mt[mmask]]
    cmask = (n_cor > 0.64)
    ct = np.clip(((n_cor - 0.64) * 10 + n_mid).astype(int), 0, 2)
    img[cmask] = corr[ct[cmask]]

    # --- 2. chemin : distance au polyligne ---
    pts = np.array([(p['x'], p['z']) for p in L['path']])
    px_pts = np.array([w2p(x, z) for x, z in pts])
    dist = np.full((Hh, W), 1e9, dtype=np.float32)
    for (cx, cy) in px_pts:
        d = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
        np.minimum(dist, d, out=dist)
    dist_u = dist / layout.PPU
    wob = (value_noise(W, Hh, 18, nrng, 2) - 0.5) * 0.28
    hw = layout.PATH_HALF_WIDTH
    in_path = dist_u < hw + wob
    in_edge = (dist_u < hw + wob + 0.16) & ~in_path
    in_halo = (dist_u < hw + wob + 0.55) & ~in_path & ~in_edge

    # bords : herbe/terre assombrie autour du chemin
    img[in_halo] = (img[in_halo] * 0.72).astype(np.uint8)
    # dalles (briques décalées)
    brick = pal(['3d3558', '473e66', '524875', '5d5384', '2f2a49'])
    bw, bh = 20, 13
    row = ys // bh
    xo = xs + (row % 2) * (bw // 2)
    col = xo // bw
    seed = (row * 73856093 ^ col * 19349663) & 0xffff
    tone = (seed % 4)
    tex = brick[tone]
    gap = ((xo % bw) == 0) | ((ys % bh) == 0)
    hi = ((ys % bh) == 1) & ~gap
    lo = ((ys % bh) == bh - 1)
    tex = np.where(gap[..., None], brick[4], tex)
    tex = np.where(hi[..., None], np.minimum(255, tex.astype(int) + 22).astype(np.uint8), tex)
    tex = np.where(lo[..., None], (tex * 0.8).astype(np.uint8), tex)
    img[in_path] = tex[in_path]
    img[in_edge] = pal(['0c0816'])[0]

    im = Image.fromarray(img, 'RGB').convert('RGBA')
    g = Px(W, Hh); g.im = im; g.d = ImageDraw.Draw(g.im)

    # --- 3. détails de terrain (hors chemin) ---
    def free(x, y, extra=0.4):
        xi, yi = int(x), int(y)
        return 0 <= xi < W and 0 <= yi < Hh and dist_u[yi, xi] > hw + 0.75 + extra

    for _ in range(2600):   # touffes d'herbe
        x, y = rng.randint(0, W - 1), rng.randint(0, Hh - 1)
        if not free(x, y): continue
        c = rng.choice([MOSS_M, MOSS_L, H('2f8a5c'), H('3fae78')]) if mmask[y, x] else rng.choice([H('2a3a63'), H('34477a'), H('1f2c4f')])
        hgt = rng.randint(2, 4)
        for k in range(hgt):
            g.px(x + (k // 2) * rng.choice([-1, 1]) * 0, y - k, c)
        g.px(x + 1, y - 1, c); g.px(x - 1, y - 1, c)
    for _ in range(420):    # cailloux
        x, y = rng.randint(0, W - 1), rng.randint(0, Hh - 1)
        if not free(x, y, 0.1): continue
        g.rect(x, y, x + 2, y + 1, STONE_M); g.px(x, y, STONE_L); g.rect(x, y + 2, x + 2, y + 2, OUT)
    for _ in range(14):     # veines de corruption lumineuses
        x, y = rng.randint(40, W - 40), rng.randint(40, Hh - 40)
        if not free(x, y, 0.6): continue
        for _s in range(rng.randint(18, 40)):
            if free(x, y, 0.2):
                g.px(x, y, VIO_L); g.px(x + 1, y, VIO_M)
            x += rng.choice([-1, 0, 1, 1]); y += rng.choice([-1, 0, 1])
    for _ in range(90):     # petites fleurs spectrales
        x, y = rng.randint(0, W - 1), rng.randint(0, Hh - 1)
        if not free(x, y) or not mmask[y, x]: continue
        c = rng.choice([MAG, CY_M, VIO_L])
        g.px(x, y, c); g.px(x, y + 1, GREEN_D)
    # pierres le long du chemin
    for i in range(0, len(px_pts), 1):
        if rng.random() < 0.55:
            cx, cy = px_pts[i]
            ang = rng.uniform(0, math.tau)
            r = (hw + 0.30 + rng.uniform(0, 0.25)) * layout.PPU
            x, y = cx + math.cos(ang) * r, cy + math.sin(ang) * r
            if dist_u[int(max(0, min(Hh - 1, y))), int(max(0, min(W - 1, x)))] > hw + 0.22:
                s = rng.randint(2, 4)
                g.ell(x, y, x + s + 1, y + s, STONE_M); g.px(x, y, STONE_H)
                g.rect(x, y + s, x + s + 1, y + s, OUT)

    # --- 4. plaques d'emplacements de tourelles ---
    for s in L['slots']:
        cx, cy = w2p(s['x'], s['z'])
        r = 1.05 * layout.PPU
        ang0 = math.pi / 8
        oct_ = [(cx + math.cos(ang0 + k * math.pi / 4) * r, cy + math.sin(ang0 + k * math.pi / 4) * r * 0.98) for k in range(8)]
        g.poly([(x + 1, y + 2) for x, y in oct_], H('0a0612'))          # ombre portée
        g.poly(oct_, STONE_M)
        inner = [(cx + math.cos(ang0 + k * math.pi / 4) * (r - 4), cy + math.sin(ang0 + k * math.pi / 4) * (r - 4)) for k in range(8)]
        g.poly(inner, STONE_D)
        for k in range(8):
            a, b = oct_[k], oct_[(k + 1) % 8]
            g.line(a, b, OUT)
        # anneau runique cyan
        for k in range(0, 360, 6):
            a = math.radians(k)
            rr = r * 0.58
            col = CY_M if (k // 6) % 3 else CY_D
            g.px(cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.98, col)
        for k in range(4):
            a = math.radians(45 + 90 * k)
            g.rect(cx + math.cos(a) * r * 0.82 - 1, cy + math.sin(a) * r * 0.82 - 1, cx + math.cos(a) * r * 0.82, cy + math.sin(a) * r * 0.82, STONE_H)

    # --- 5. portail d'apparition ---
    sx, sy = w2p(L['spawn']['x'], L['spawn']['z'])
    g.glow(sx, sy, 2.4 * layout.PPU, VIO_M, 0.5, 5)
    for i, (rad, col) in enumerate([(1.55, OUT), (1.45, VIO_D), (1.2, VIO_M), (0.95, VIO_D), (0.7, INK), (0.4, VIO_M), (0.25, VIO_H)]):
        rr = rad * layout.PPU
        g.ell(sx - rr, sy - rr * 0.82, sx + rr, sy + rr * 0.82, col)
    for k in range(0, 360, 20):   # runes
        a = math.radians(k)
        rr = 1.32 * layout.PPU
        g.rect(sx + math.cos(a) * rr - 1, sy + math.sin(a) * rr * 0.82 - 1, sx + math.cos(a) * rr + 1, sy + math.sin(a) * rr * 0.82 + 1, VIO_H)

    # --- 6. socle du Cœur ---
    hx, hy = w2p(L['heart']['x'], L['heart']['z'])
    g.glow(hx, hy, 3.2 * layout.PPU, CY_M, 0.45, 5)
    for rad, col in [(2.15, OUT), (2.05, STONE_D), (1.85, STONE_M), (1.7, STONE_D), (1.45, STONE_L), (1.3, STONE_D), (1.05, INK)]:
        rr = rad * layout.PPU
        g.ell(hx - rr, hy - rr * 0.8, hx + rr, hy + rr * 0.8, col)
    for k in range(0, 360, 8):
        a = math.radians(k)
        rr = 1.58 * layout.PPU
        g.px(hx + math.cos(a) * rr, hy + math.sin(a) * rr * 0.8, CY_L if (k // 8) % 2 else CY_M)
    for k in range(0, 360, 45):
        a = math.radians(k + 22)
        rr = 1.95 * layout.PPU
        g.rect(hx + math.cos(a) * rr - 2, hy + math.sin(a) * rr * 0.8 - 2, hx + math.cos(a) * rr + 2, hy + math.sin(a) * rr * 0.8 + 1, STONE_H)

    # --- 7. vignette sombre + brume bleutée ---
    a = np.array(g.im).astype(np.float32)
    nx = (xs - W / 2) / (W / 2); ny = (ys - Hh / 2) / (Hh / 2)
    v = np.clip(1.0 - 0.55 * (nx ** 2 * 0.55 + ny ** 2 * 0.9) ** 1.2, 0.42, 1.0)
    for c in range(3):
        a[:, :, c] *= v
    a[:, :, 2] = np.minimum(255, a[:, :, 2] + (1 - v) * 20)
    g.im = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
    g.save(out_path)
    return g.im
