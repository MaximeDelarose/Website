"""Ennemis gélatineux de la séquence 2 (pixel art, 2 images chacun) + sons courts et rigolos."""
import math, random, sys, os
import numpy as np
from pixel import *

def new(w, h):
    return Px(w, h)

def blob(p, cx, cy, rx, ry, dark, mid, light, squash=0.0):
    ry2 = ry * (1 - squash); rx2 = rx * (1 + squash * .6)
    p.ell(cx - rx2, cy - ry2 * 2 + ry2 + (ry - ry2) * 2 - ry2 + ry2, cx + rx2, cy + ry2 + (ry - ry2), dark)   # silhouette basse
    p.ell(cx - rx2 + 2, cy - ry2 - 1 + (ry - ry2) * 1.5, cx + rx2 - 2, cy + ry2 - 2 + (ry - ry2), mid)
    p.ell(cx - rx2 * .6, cy - ry2 * .75 + (ry - ry2), cx + rx2 * .1, cy - ry2 * .05 + (ry - ry2), light)

def eyes(p, x, y, gap, sz=3, col=H('ffffff'), pupil=H('120b1f')):
    for sx_ in (-1, 1):
        ex = x + sx_ * gap
        p.ell(ex - sz, y - sz, ex + sz, y + sz, col); p.ell(ex - sz * .4, y - sz * .3, ex + sz * .6, y + sz * .8, pupil); p.px(ex - 1, y - 1, col)

def gel(name, w, h, cols, bubbles, f, eye_y=.5, extra=None, mouth=True):
    p = new(w, h); dark, mid, light = [H(c) for c in cols]
    sq = .08 if f else -.04
    blob(p, w / 2, h * .62, w * .42, h * .36, dark, mid, light, sq)
    rng = random.Random(hash(name) & 0xffff)
    for _ in range(bubbles):
        x, y = rng.randint(int(w * .22), int(w * .78)), rng.randint(int(h * .4), int(h * .8)); p.ell(x - 1, y - 1, x + 1, y + 1, light)
    p.px(w * .3, h * .45, H('ffffff')); p.px(w * .3 + 1, h * .45, H('ffffff')); p.px(w * .3, h * .45 + 1, H('ffffff'))
    eyes(p, w / 2, h * eye_y + (2 if f else 0), max(3, int(w * .14)), max(2, int(w * .07)))
    if mouth:
        p.rect(w / 2 - 3, h * eye_y + 7 + (2 if f else 0), w / 2 + 3, h * eye_y + 8 + (2 if f else 0), dark)
    if extra: extra(p, f)
    p.outline(); return p

def boom_extra(p, f):
    w, h = p.w, p.h
    for k in range(3):   # fissures incandescentes
        x = w * (.3 + .2 * k); p.line((x, h * .5), (x + 3, h * .75), H('ffe38a'), 1)
    p.line((w / 2, h * .2), (w / 2 + 2, h * .06), H('7a5a16'), 1); p.px(w / 2 + 2, h * .05, H('ffe38a') if f else H('ff7a30'))

def crown(p, f):
    w = p.w
    o = 22
    p.poly([(w * .3, o + 14), (w * .3, o + 4), (w * .4, o + 10), (w * .5, o), (w * .6, o + 10), (w * .7, o + 4), (w * .7, o + 14)], H('ffd25e'))
    p.rect(w * .3, o + 12, w * .7, o + 15, H('d39a2a'))
    for x in (.4, .5, .6): p.px(w * x, o + 11, H('ff3fa4'))

def skulls(p, f):
    w, h = p.w, p.h
    for x, y in [(.3, .72), (.66, .66)]:
        p.ell(w * x - 3, h * y - 3, w * x + 3, h * y + 3, H('cfc6a8')); p.px(w * x - 1, h * y, H('120b1f')); p.px(w * x + 1, h * y, H('120b1f'))

def build(out):
    os.makedirs(out, exist_ok=True)
    spec = [('enemy_slime', 36, 30, ('1f6b3a', '3fbf66', '8dffb0'), 4, .5, None),
            ('enemy_blop', 40, 36, ('4a1d8a', '8a4ae0', 'c8a0ff'), 5, .5, None),
            ('enemy_jelly', 42, 46, ('1a4f8a', '3a9be0', '9fe0ff'), 7, .46, None),
            ('enemy_boom', 38, 38, ('9a3a10', 'e8801f', 'ffc860'), 3, .52, boom_extra),
            ('enemy_gslime', 100, 88, ('1f6b3a', '3fbf66', '8dffb0'), 14, .46, skulls),
            ('enemy_gking', 132, 124, ('5a1a5a', 'b84fa8', 'ffb0f0'), 20, .5, crown)]
    for name, w, h, cols, bub, ey, ex in spec:
        for f in (0, 1):
            p = gel(name, w, h, cols, bub, f, ey, ex); p.save(f'{out}/{name}_{f}.png')
    print('sprites ok')

# ---------- sons ----------
SR = 22050
def tone(f0, d, kind='sine', f1=None, vib=0):
    n = int(SR * d); t = np.arange(n) / SR; f = np.linspace(f0, f1 if f1 else f0, n) + vib * np.sin(2 * np.pi * 24 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR; return np.sin(ph) if kind == 'sine' else np.sign(np.sin(ph))
def env(n, a=.003, r=.1): 
    e = np.ones(n); k = int(a * SR); e[:k] = np.linspace(0, 1, max(1, k)); e *= np.exp(-np.linspace(0, 1, n) * (1 / max(r, .01)) * 3); return e
def noise(d, seed=1): return np.random.RandomState(seed).uniform(-1, 1, int(SR * d))
def lp(x, a): 
    y = np.zeros_like(x); s = 0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y
def save(path, x):
    import wave
    x = np.clip(x / max(1e-6, np.max(np.abs(x))) * .85, -1, 1); w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes()); w.close()
def sounds(out):
    n = int(SR * .16); save(f'{out}/splat.wav', tone(320, .16, 'sine', 90) * env(n, .002, .09) * .7 + lp(noise(.16, 7), .25) * env(n, .001, .07) * .8)
    n = int(SR * .14); save(f'{out}/blop.wav', tone(220, .14, 'sine', 640) * env(n, .004, .12))
    n = int(SR * .3); save(f'{out}/boing.wav', tone(180, .3, 'sine', 520, vib=60) * env(n, .004, .25) * .8)
    n = int(SR * .4); save(f'{out}/boom.wav', tone(110, .4, 'sine', 40) * env(n, .002, .3) + lp(noise(.4, 9), .12) * env(n, .001, .25) * .9)
    print('sons ok')
if __name__ == '__main__':
    build(sys.argv[1]); sounds(sys.argv[2])
