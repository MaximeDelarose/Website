"""Extrait l'Épéiste électrique de la planche de référence (fond sombre) et le ramène en pixel art simple : réduction + palette limitée.
Usage : python3 extract_epeiste.py <planche.png> <dossier_sortie>"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

def mask_dark_bg(rgb, bg, thr=34):
    a = rgb.astype(int); d = np.abs(a - bg).sum(axis=2)
    m = d > thr
    m = ndimage.binary_closing(m, structure=np.ones((3, 3)), iterations=1)
    holes = ndimage.binary_fill_holes(m) & ~m                      # on ne comble que les petits trous (armure sombre), pas les grandes zones de fond
    lab, n = ndimage.label(holes)
    if n:
        sizes = ndimage.sum(holes, lab, range(1, n + 1)); small = np.zeros(n + 1, bool); small[1:] = sizes <= 40; m = m | small[lab]
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1)); keep = np.zeros(n + 1, bool); keep[1:] = sizes >= max(30, sizes.max() * .03); m = keep[lab]
    return m

def cut(im, box, bg=(19, 19, 32), thr=34):
    c = im.crop(box).convert('RGB'); rgb = np.array(c)
    m = mask_dark_bg(rgb, np.array(bg), thr)
    out = np.dstack([rgb, (m * 255).astype(np.uint8)]); img = Image.fromarray(out, 'RGBA'); bb = img.getbbox()
    return img.crop(bb) if bb else img

def simple(img, h, colors=28):
    """pixel art simple : réduction à la hauteur voulue (moyenne par blocs), palette limitée, alpha binaire, contour sombre."""
    s = h / img.height; w = max(1, round(img.width * s))
    small = img.resize((w, h), Image.BOX)
    a = np.array(small); alpha = a[:, :, 3] > 110
    rgb = Image.fromarray(a[:, :, :3], 'RGB').quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    r = np.array(rgb); out = np.dstack([r, (alpha * 255).astype(np.uint8)])
    o = Image.fromarray(out, 'RGBA')
    # contour 1 px, presque noir bleuté
    al = np.array(o)[:, :, 3] > 0; grow = np.zeros_like(al)
    grow[1:, :] |= al[:-1, :]; grow[:-1, :] |= al[1:, :]; grow[:, 1:] |= al[:, :-1]; grow[:, :-1] |= al[:, 1:]
    edge = grow & ~al; arr = np.array(o); arr[edge] = (8, 10, 24, 255); return Image.fromarray(arr, 'RGBA')

def canvas(img, size=(128, 104), pad=3):
    cw, ch = max(size[0], img.width + 2), max(size[1], img.height + pad + 1)
    c = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); c.alpha_composite(img, ((cw - img.width) // 2, ch - pad - img.height)); return c

def anchor_x(img):
    """abscisse du corps (moitié haute, hors traînées de foudre au sol) pour centrer les poses de façon stable."""
    al = np.array(img)[:, :, 3] > 0; top = al[: max(1, int(al.shape[0] * .55))]; xs = np.nonzero(top)[1]
    return int(np.median(xs)) if len(xs) else img.width // 2

def place(img, pad=2):
    ax = anchor_x(img); half = max(ax, img.width - ax) + 2; cw = max(104, half * 2); ch = max(96, img.height + pad + 1)
    c = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); c.alpha_composite(img, (cw // 2 - ax, ch - pad - img.height)); return c

BOXES = {'idle0': (410, 722, 480, 815), 'idle1': (486, 722, 544, 815), 'move0': (645, 725, 716, 815), 'move1': (836, 722, 908, 815), 'atk': (445, 868, 585, 960), 'cast': (618, 842, 800, 962)}
ICONS = {'s1': (1043, 703, 1092, 753), 's2': (1043, 762, 1092, 812), 'passive': (1043, 828, 1092, 878), 'ult': (1043, 903, 1092, 955)}

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    im = Image.open(src)
    crops = {k: cut(im, b) for k, b in BOXES.items()}
    H0 = 72; sc = H0 / crops['idle0'].height
    # palette commune : construite sur les poses principales
    sm = {k: c.resize((max(1, round(c.width * sc)), max(1, round(c.height * sc))), Image.BOX) for k, c in crops.items()}
    mont = Image.new('RGB', (sum(v.width for v in sm.values()), max(v.height for v in sm.values())))
    x = 0
    for v in sm.values(): mont.paste(v.convert('RGB'), (x, 0)); x += v.width
    pal = mont.quantize(colors=30, method=Image.MEDIANCUT, dither=Image.NONE)
    for k, v in sm.items():
        a = np.array(v); alpha = a[:, :, 3] > 110
        q = Image.fromarray(a[:, :, :3], 'RGB').quantize(palette=pal, dither=Image.NONE).convert('RGB')
        o = np.dstack([np.array(q), (alpha * 255).astype(np.uint8)]); o = Image.fromarray(o, 'RGBA')
        al = np.array(o)[:, :, 3] > 0; grow = np.zeros_like(al); grow[1:, :] |= al[:-1, :]; grow[:-1, :] |= al[1:, :]; grow[:, 1:] |= al[:, :-1]; grow[:, :-1] |= al[:, 1:]
        arr = np.array(o); arr[grow & ~al] = (8, 10, 24, 255); o = Image.fromarray(arr, 'RGBA')
        place(o).save(f'{out}/hero_epeiste_{k}.png')
    # grand portrait (carte de sélection) = la pose de repos en pixel art, agrandie ×4 sans lissage ; icône = tête
    idle = Image.open(f'{out}/hero_epeiste_idle0.png'); bb = idle.getbbox(); body = idle.crop(bb)
    bigi = body.resize((body.width * 4, body.height * 4), Image.NEAREST); bigi.thumbnail((300, 300), Image.NEAREST)
    b = Image.new('RGBA', (300, 300), (0, 0, 0, 0)); b.alpha_composite(bigi, ((300 - bigi.width) // 2, 300 - bigi.height)); b.save(f'{out}/big_epeiste.png')
    for k, bx in ICONS.items(): ic = im.crop(bx).convert('RGB').resize((48, 48), Image.BOX); ic.save(f'{out}/skill_epeiste_{k}.png')
    hw = body.width; head = body.crop((0, 0, hw, int(hw * 0.95))); hs = head.resize((head.width * 2, head.height * 2), Image.NEAREST); hs.thumbnail((96, 96), Image.NEAREST)
    bg = Image.new('RGBA', (96, 96), (12, 16, 44, 255)); bg.alpha_composite(hs, ((96 - hs.width) // 2, (96 - hs.height) // 2 + 6)); bg.save(f'{out}/icon_epeiste.png')
    print('ok', {k: v.size for k, v in sm.items()})
