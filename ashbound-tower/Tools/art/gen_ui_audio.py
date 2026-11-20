"""Sprites d'interface (9-slice) et sons synthétisés (WAV 22,05 kHz mono) – originaux, sans licence externe."""
import math, wave, random, os
import numpy as np
from PIL import Image
from pixel import *

def panel(w, h, fill, border, rivet=True, glow=None):
    p = Px(w, h)
    p.rect(0, 0, w - 1, h - 1, OUT)
    p.rect(1, 1, w - 2, h - 2, border)
    p.rect(2, 2, w - 3, h - 3, H('0d0818'))
    p.rect(3, 3, w - 4, h - 4, fill)
    p.rect(3, 3, w - 4, 4, mul(fill, 1.5)); p.rect(3, 3, 4, h - 4, mul(fill, 1.25))
    p.rect(3, h - 5, w - 4, h - 4, mul(fill, 0.6))
    if rivet:
        for x, y in [(5, 5), (w - 7, 5), (5, h - 7), (w - 7, h - 7)]:
            p.rect(x, y, x + 1, y + 1, GOLD_L)
    return p

def icon(name, fn, size=20):
    p = Px(size, size); fn(p); p.outline(); return p

def i_gold(p):
    p.ell(2, 2, 17, 17, GOLD_D); p.ell(3, 3, 16, 16, GOLD_M); p.ell(5, 4, 12, 10, GOLD_L)
    p.rect(9, 6, 10, 14, GOLD_D); p.rect(7, 6, 12, 7, GOLD_D); p.rect(7, 13, 12, 14, GOLD_D)
def i_heart(p):
    p.ell(1, 2, 10, 11, VIO_M); p.ell(9, 2, 18, 11, VIO_M); p.poly([(1, 8), (18, 8), (9.5, 18)], VIO_M)
    p.ell(3, 3, 7, 7, CY_L); p.poly([(5, 10), (14, 10), (9.5, 16)], VIO_L)
def i_time(p):
    p.ell(2, 2, 17, 17, STONE_H); p.ell(4, 4, 15, 15, H('15102a'))
    p.line((9.5, 9.5), (9.5, 5), CY_L); p.line((9.5, 9.5), (13, 11), CY_L); p.px(9, 9, CY_H)
def i_wave(p):
    p.ell(3, 2, 16, 13, BONE); p.rect(6, 12, 13, 17, BONE); p.rect(7, 12, 12, 13, BONE_D)
    p.rect(5, 6, 8, 9, OUT); p.rect(11, 6, 14, 9, OUT); p.px(9, 11, OUT); p.px(10, 11, OUT)
    p.px(6, 7, EMB_L); p.px(12, 7, EMB_L)
def i_bolt(p):
    p.poly([(11, 1), (4, 11), (9, 11), (7, 19), (16, 8), (10, 8)], CY_L); p.poly([(11, 3), (7, 10), (11, 10)], CY_H)
def i_up(p):
    p.poly([(10, 2), (18, 11), (13, 11), (13, 18), (7, 18), (7, 11), (2, 11)], GREEN_N); p.poly([(10, 4), (14, 10), (10, 10)], H('c8ffe0'))
def i_sword(p):
    p.line((4, 16), (15, 3), STONE_H, 3); p.line((4, 16), (14, 4), CY_H); p.rect(2, 13, 8, 15, GOLD_M); p.rect(2, 17, 5, 18, GOLD_D)

def vignette():
    w, h = 256, 144
    ys, xs = np.mgrid[0:h, 0:w]
    nx, ny = (xs - w / 2) / (w / 2), (ys - h / 2) / (h / 2)
    a = np.clip((nx ** 2 * 0.8 + ny ** 2 * 1.0 - 0.35) * 1.1, 0, 0.85)
    arr = np.zeros((h, w, 4), np.uint8); arr[:, :, 0] = 6; arr[:, :, 1] = 3; arr[:, :, 2] = 18; arr[:, :, 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')

def build_ui(out):
    os.makedirs(out, exist_ok=True)
    panel(48, 48, H('1d1633'), GOLD_D).save(f'{out}/panel.png')
    panel(48, 48, H('141028'), STONE_M).save(f'{out}/panel_dark.png')
    panel(24, 24, H('2c2150'), VIO_M, rivet=False).save(f'{out}/button.png')
    panel(24, 24, H('3a2c68'), CY_M, rivet=False).save(f'{out}/button_hover.png')
    b = Px(16, 12); b.rect(0, 0, 15, 11, OUT); b.rect(1, 1, 14, 10, H('0a0614')); b.rect(2, 2, 13, 9, H('1a1430')); b.save(f'{out}/bar_bg.png')
    f = Px(16, 12)
    for y, c in zip(range(2, 10), [(255, 255, 255, 255), (235, 235, 235, 255), (215, 215, 215, 255), (200, 200, 200, 255), (185, 185, 185, 255), (165, 165, 165, 255), (145, 145, 145, 255), (125, 125, 125, 255)]):
        f.rect(2, y, 13, y, c)
    f.save(f'{out}/bar_fill.png')
    for n, fn in [('icon_gold', i_gold), ('icon_heart', i_heart), ('icon_time', i_time), ('icon_wave', i_wave), ('icon_bolt', i_bolt), ('icon_up', i_up), ('icon_sword', i_sword)]:
        icon(n, fn).save(f'{out}/{n}.png')
    vignette().save(f'{out}/vignette.png')

# ------------------------------------------------------------ audio
SR = 22050
def env(n, a=0.005, d=0.05, s=0.6, r=0.1):
    t = np.arange(n) / SR; e = np.ones(n)
    e *= np.minimum(1, t / max(a, 1e-4))
    tail = np.clip((n / SR - t) / max(r, 1e-4), 0, 1); e *= tail
    return e
def tone(f, dur, wave='sine', fend=None):
    n = int(SR * dur); t = np.arange(n) / SR
    fr = np.linspace(f, fend if fend else f, n); ph = np.cumsum(fr) / SR * 2 * np.pi
    if wave == 'sine': y = np.sin(ph)
    elif wave == 'saw': y = 2 * ((ph / (2 * np.pi)) % 1) - 1
    elif wave == 'square': y = np.sign(np.sin(ph))
    else: y = np.sin(ph)
    return y
def noise(dur, seed=0):
    return np.random.RandomState(seed).uniform(-1, 1, int(SR * dur))
def lp(x, k):
    out = np.zeros_like(x); a = 0.0
    for i, v in enumerate(x):
        a += (v - a) * k; out[i] = a
    return out
def save(path, y, gain=0.8):
    y = y / (np.max(np.abs(y)) + 1e-9) * gain
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype('<i2').tobytes())
def mix(*parts):
    n = max(len(p) for p in parts); y = np.zeros(n)
    for p in parts: y[:len(p)] += p
    return y

def build_audio(out):
    os.makedirs(out, exist_ok=True)
    n = int(SR * 0.2)
    zap = mix(tone(1800, 0.2, 'saw', 220) * env(n, 0.001, r=0.18) * 0.6, lp(noise(0.2, 1), 0.6) * env(n, 0.001, r=0.12) * 0.7, tone(90, 0.2, 'sine') * env(n, 0.001, r=0.15) * 0.5)
    save(f'{out}/zap.wav', zap)
    hit = mix(lp(noise(0.09, 2), 0.35) * env(int(SR * 0.09), 0.001, r=0.08), tone(200, 0.09, 'sine', 80) * env(int(SR * 0.09), 0.001, r=0.08))
    save(f'{out}/hit.wav', hit)
    d = int(SR * 0.35)
    save(f'{out}/death.wav', mix(tone(260, 0.35, 'square', 50) * env(d, 0.002, r=0.3) * 0.5, lp(noise(0.35, 3), 0.3) * env(d, 0.002, r=0.3)))
    b = int(SR * 0.4)
    knock = lp(noise(0.12, 4), 0.2) * env(int(SR * 0.12), 0.001, r=0.1)
    arp = np.concatenate([tone(f, 0.09, 'square') * env(int(SR * 0.09), 0.002, r=0.07) * 0.35 for f in (392, 523, 659, 784)])
    save(f'{out}/build.wav', mix(knock, np.concatenate([np.zeros(int(SR * 0.05)), arp])))
    chime = np.concatenate([tone(f, 0.16, 'sine') * env(int(SR * 0.16), 0.002, r=0.15) for f in (659, 880, 1175, 1568)])
    save(f'{out}/upgrade.wav', mix(chime, tone(1318, 0.64, 'sine') * env(int(SR * 0.64), 0.05, r=0.5) * 0.25))
    h = int(SR * 0.7)
    save(f'{out}/heart_hit.wav', mix(tone(70, 0.7, 'sine', 35) * env(h, 0.002, r=0.6), tone(233, 0.7, 'saw', 180) * env(h, 0.002, r=0.5) * 0.25, lp(noise(0.7, 5), 0.1) * env(h, 0.001, r=0.5) * 0.6))
    save(f'{out}/win.wav', np.concatenate([tone(f, 0.28, 'square') * env(int(SR * 0.28), 0.005, r=0.25) * 0.4 + tone(f * 2, 0.28, 'sine') * env(int(SR * 0.28), 0.005, r=0.25) * 0.3 for f in (392, 494, 587, 784, 988)]))
    save(f'{out}/lose.wav', np.concatenate([tone(f, 0.4, 'saw') * env(int(SR * 0.4), 0.005, r=0.35) * 0.4 for f in (294, 262, 247, 196)]))
    save(f'{out}/click.wav', tone(900, 0.05, 'square') * env(int(SR * 0.05), 0.001, r=0.04))
    save(f'{out}/error.wav', tone(150, 0.16, 'square', 110) * env(int(SR * 0.16), 0.001, r=0.12))
    w_ = int(SR * 0.9)
    save(f'{out}/wave.wav', mix(tone(110, 0.9, 'saw') * env(w_, 0.2, r=0.5) * 0.4, tone(165, 0.9, 'saw') * env(w_, 0.2, r=0.5) * 0.3, tone(55, 0.9, 'sine') * env(w_, 0.1, r=0.6)))
    boss = int(SR * 1.4)
    save(f'{out}/boss.wav', mix(tone(55, 1.4, 'saw', 40) * env(boss, 0.05, r=1.0) * 0.5, tone(58, 1.4, 'square', 42) * env(boss, 0.05, r=1.0) * 0.25, lp(noise(1.4, 6), 0.05) * env(boss, 0.2, r=1.0)))
    # ambiance : nappe sombre bouclable de 12 s
    dur = 12; t = np.arange(SR * dur) / SR
    amb = 0.5 * np.sin(2 * np.pi * 55 * t) + 0.35 * np.sin(2 * np.pi * 82.5 * t + 0.4 * np.sin(2 * np.pi * (1 / dur) * t * 2)) + 0.18 * np.sin(2 * np.pi * 110.3 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 2 / dur * t))
    amb += 0.12 * np.sin(2 * np.pi * 329.6 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 / dur * t)) ** 2
    save(f'{out}/ambient.wav', amb, 0.5)
