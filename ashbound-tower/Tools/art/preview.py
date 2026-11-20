"""Aperçu composé de l'arène (projection oblique approximative de la vue 3/4). Ce N'EST PAS une capture Unity."""
import json, math, os, sys
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.abspath(os.path.join(here, '..', '..', 'Assets', '_Project'))
L = json.load(open(f'{root}/Data/Arena01_layout.json'))
PPU = 32; PITCH = math.radians(55)
SX = 1.0; SY = math.sin(PITCH)            # écrasement vertical du sol
W, H = int(L['width'] * PPU * SX), int(L['height'] * PPU * SY)
ground = Image.open(f'{root}/Art/Ground/arena01_ground.png').convert('RGBA').resize((W, H), Image.NEAREST)
PAD_T = 130
canvas = Image.new('RGBA', (W, H + PAD_T), (9, 6, 18, 255)); canvas.alpha_composite(ground, (0, PAD_T))
def w2s(x, z): return ((x + L['width'] / 2) * PPU, PAD_T + (L['height'] / 2 - z) * PPU * SY)
def spr(n): return Image.open(f'{root}/Art/Billboards/{n}.png').convert('RGBA')
def put(img, name, x, z, scale=1.0, flip=False):
    s = spr(name)
    if flip: s = s.transpose(Image.FLIP_LEFT_RIGHT)
    if scale != 1: s = s.resize((int(s.width * scale), int(s.height * scale)), Image.NEAREST)
    sx, sy = w2s(x, z)
    shadow = Image.open(f'{root}/Resources/Ashbound/Fx/fx_shadow.png').convert('RGBA')
    shadow = shadow.resize((int(s.width * 0.7), int(s.width * 0.3)), Image.NEAREST); img.alpha_composite(shadow, (int(sx - shadow.width / 2), int(sy - shadow.height / 2)))
    img.alpha_composite(s, (int(sx - s.width / 2), int(sy - s.height)))
items = [(d['z'], d['kind'], d['x'], d['flip']) for d in L['decor']]
P = L['path']
def at(f): i = int(f * (len(P) - 1)); return P[i]['x'], P[i]['z']
for f, n, sc in [(0.12, 'enemy_orb_0', 1), (0.14, 'enemy_orb_1', 1), (0.16, 'enemy_scout_0', 1), (0.33, 'enemy_orb_0', 1), (0.36, 'enemy_orb_1', 1), (0.52, 'enemy_elite_0', 0.9), (0.7, 'enemy_miniboss_0', 0.85), (0.9, 'enemy_boss_0', 0.8)]:
    x, z = at(f); items.append((z, n, x, False)) if False else items.append((z, ('E', n, sc), x, False))
for k, s in enumerate(L['slots']):
    lvl = [0, 1, 2, 3, 0, 0, 1, 2, 0, 1][k % 10] if k < 10 else None
    if lvl is not None: items.append((s['z'] - 0.2, ('T', f'tower_orb_{lvl}', 1), s['x'], False))
items.append((L['heart']['z'] + 0.5, 'heart_0', L['heart']['x'], False))
for z, kind, x, flip in sorted(items, key=lambda t: -t[0]):
    if isinstance(kind, tuple): put(canvas, kind[1], x, z, kind[2])
    elif kind == 'brazier': put(canvas, 'brazier_0', x, z)
    else: put(canvas, kind, x, z, flip=flip)
canvas.convert('RGB').save(sys.argv[1] if len(sys.argv) > 1 else f'{root}/../../Docs/apercu_arene.png')
print(canvas.size)
