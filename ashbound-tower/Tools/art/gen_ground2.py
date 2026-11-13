"""Sol de l'arène 01, style maquette : herbe sombre, chemin de terre brun, corruption violette sur les bords, emplacements en losange « + », flèche d'entrée, socle rose du Cœur."""
import math, random
import numpy as np
from PIL import Image
from pixel import *
PINKP = H('ff4fa8')
import layout

W, Hh = layout.ARENA_W * layout.PPU, layout.ARENA_H * layout.PPU
def w2p(x, z): return ((x + layout.ARENA_W / 2) * layout.PPU, (layout.ARENA_H / 2 - z) * layout.PPU)
def pal(hs): return np.array([H(h)[:3] for h in hs], dtype=np.uint8)

def paint(L, out_path):
    rng = random.Random(9); nr = random.Random(21)
    ys, xs = np.mgrid[0:Hh, 0:W]
    n_big = value_noise(W, Hh, 70, nr, 3); n_mid = value_noise(W, Hh, 12, nr, 2); n_fine = value_noise(W, Hh, 4, nr, 1)
    grass = pal(['1f2d1f', '263624', '2d3f2a', '354a30', '3c5636'])
    t = np.clip(((n_big * .55 + n_mid * .3 + n_fine * .15) * 5).astype(int), 0, 4)
    img = grass[t]
    # bords corrompus (violet), plus marqués dans les coins
    nx = (xs - W / 2) / (W / 2); ny = (ys - Hh / 2) / (Hh / 2)
    edge = np.clip((np.maximum(np.abs(nx) ** 2.2, np.abs(ny) ** 2.6) * 1.25), 0, 1.4)
    n_cor = value_noise(W, Hh, 90, nr, 3)
    cor = (edge * .85 + n_cor * .6) > 1.2
    corr = pal(['23123f', '2e1a52', '3a2268', '472a7c'])
    ct = np.clip(((edge * .85 + n_cor * .6 - 1.2) * 7 + n_mid).astype(int), 0, 3)
    img[cor] = corr[ct[cor]]

    # chemin
    pts = np.array([(p['x'], p['z']) for p in L['path']]); px_pts = np.array([w2p(x, z) for x, z in pts])
    dist = np.full((Hh, W), 1e9, dtype=np.float32)
    for (cx, cy) in px_pts: np.minimum(dist, np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2), out=dist)
    du = dist / layout.PPU; hw = layout.PATH_HALF_WIDTH
    wob = (value_noise(W, Hh, 22, nr, 2) - .5) * .5
    inp = du < hw + wob
    ring = (du < hw + wob + .22) & ~inp
    halo = (du < hw + wob + .7) & ~inp & ~ring
    img[halo] = (img[halo] * .8).astype(np.uint8)
    dirt = pal(['41352c', '4b3d33', '55463a', '5f4f42', '695849'])
    dt = np.clip(((n_big * .5 + n_mid * .35 + n_fine * .15) * 5).astype(int), 0, 4)
    img[inp] = dirt[dt][inp]
    inner = inp & (du > hw + wob - .22)          # bord intérieur légèrement plus sombre
    img[inner] = (img[inner] * .85).astype(np.uint8)
    img[ring] = pal(['2a2018'])[0]

    g = Px(W, Hh); g.im = Image.fromarray(img, 'RGB').convert('RGBA'); g.d = ImageDraw.Draw(g.im)

    def free(x, y, extra=.3):
        xi, yi = int(x), int(y)
        return 0 <= xi < W and 0 <= yi < Hh and du[yi, xi] > hw + .6 + extra
    for _ in range(3400):     # touffes d'herbe
        x, y = rng.randint(0, W - 1), rng.randint(0, Hh - 1)
        if not free(x, y): continue
        c = rng.choice([H('456b3c'), H('527a44'), H('3a5a33')]) if not cor[y, x] else rng.choice([H('5a3a8a'), H('6a46a0')])
        for k in range(rng.randint(2, 4)): g.px(x, y - k, c)
        g.px(x + 1, y - 1, c); g.px(x - 1, y - 1, c)
    for _ in range(460):      # cailloux sur le chemin
        x, y = rng.randint(0, W - 1), rng.randint(0, Hh - 1)
        if du[y, x] < hw - .3: g.rect(x, y, x + 2, y + 1, rng.choice([H('7a6a5a'), H('85735f'), H('5a4a3c')]))
    for _ in range(150):      # lueurs roses dans la corruption
        x, y = rng.randint(0, W - 1), rng.randint(0, Hh - 1)
        if cor[y, x] and du[y, x] > hw + .8: g.px(x, y, PINKP); g.px(x + 1, y, H('c0408a'))
    for _ in range(40):       # fleurs
        x, y = rng.randint(0, W - 1), rng.randint(0, Hh - 1)
        if free(x, y) and not cor[y, x]: g.px(x, y, rng.choice([H('ff7ac8'), H('f2e8d0'), H('c48bff')])); g.px(x, y + 1, H('2f6a3a'))

    # emplacements : losange avec « + »
    for s in L['slots']:
        cx, cy = w2p(s['x'], s['z']); r = 1.15 * layout.PPU
        d = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
        ov = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
        od.polygon(d, fill=(10, 8, 20, 70)); od.line(d + [d[0]], fill=(214, 230, 200, 150), width=2)
        od.line([(cx - 9, cy), (cx + 9, cy)], fill=(214, 230, 200, 170), width=3); od.line([(cx, cy - 9), (cx, cy + 9)], fill=(214, 230, 200, 170), width=3)
        g.im = Image.alpha_composite(g.im, ov); g.d = ImageDraw.Draw(g.im)

    # flèche d'entrée rose
    sx, sy = w2p(L['spawn']['x'], L['spawn']['z'])
    g.glow(sx + 20, sy, 40, PINKP, .35, 4)
    g.poly([(sx - 6, sy - 9), (sx + 18, sy - 9), (sx + 18, sy - 20), (sx + 42, sy), (sx + 18, sy + 20), (sx + 18, sy + 9), (sx - 6, sy + 9)], PINKP)
    g.poly([(sx - 2, sy - 6), (sx + 20, sy - 6), (sx + 20, sy - 14), (sx + 36, sy), (sx + 20, sy + 14), (sx + 20, sy + 6), (sx - 2, sy + 6)], H('ff8ad0'))

    # socle du Cœur
    hx, hy = w2p(L['heart']['x'], L['heart']['z'])
    g.glow(hx, hy, 3.2 * layout.PPU, PINKP, .4, 5)
    for rad, col in [(2.15, H('0c0814')), (2.05, H('2a2638')), (1.85, H('3a3650')), (1.7, H('231f34')), (1.45, H('4a4466')), (1.3, H('1c1828')), (1.05, H('120e1e'))]:
        rr = rad * layout.PPU; g.ell(hx - rr, hy - rr * .8, hx + rr, hy + rr * .8, col)
    for k in range(0, 360, 8):
        a = math.radians(k); rr = 1.58 * layout.PPU; g.px(hx + math.cos(a) * rr, hy + math.sin(a) * rr * .8, H('ff9bd2') if (k // 8) % 2 else PINKP)
    for k in range(0, 360, 45):
        a = math.radians(k + 22); rr = 1.95 * layout.PPU; x, y = hx + math.cos(a) * rr, hy + math.sin(a) * rr * .8
        g.poly([(x - 3, y + 3), (x, y - 8), (x + 3, y + 3)], H('ff5fb4')); g.px(x, y - 4, H('ffe0f0'))

    a = np.array(g.im).astype(np.float32)
    v = np.clip(1.0 - .38 * (nx ** 2 * .5 + ny ** 2 * .9) ** 1.2, .62, 1.0)
    for c in range(3): a[:, :, c] *= v
    g.im = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA'); g.save(out_path); return g.im
