"""Extrait les sprites de Noctis depuis la planche de référence fournie par l'auteur du projet (fond blanc -> transparent).
Usage : python3 extract_refs.py <planche_noctis.png> <dossier_sortie>"""
import sys, os
import numpy as np
from PIL import Image

def cut(im, box):
    a = np.array(im.crop(box).convert('RGB')).astype(int)
    white = (a.min(axis=2) > 222)
    # frange claire (anti-aliasing contre le blanc) : retirer les pixels clairs voisins du fond
    near = np.zeros_like(white)
    near[1:, :] |= white[:-1, :]; near[:-1, :] |= white[1:, :]; near[:, 1:] |= white[:, :-1]; near[:, :-1] |= white[:, 1:]
    fringe = near & (a.min(axis=2) > 190)
    alpha = np.where(white | fringe, 0, 255).astype(np.uint8)
    out = np.dstack([a.astype(np.uint8), alpha])
    img = Image.fromarray(out, 'RGBA')
    bb = img.getbbox()
    return img.crop(bb)

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    im = Image.open(src)
    S = {'idle0': (385, 85, 545, 268), 'idle1': (555, 85, 715, 268), 'move0': (758, 95, 905, 268), 'move1': (908, 95, 1072, 268),
         'atk': (330, 380, 475, 552), 'cast': (990, 372, 1165, 552)}
    crops = {k: cut(im, b) for k, b in S.items()}
    scale = 76.0 / crops['idle0'].height
    for k, c in crops.items():
        c = c.resize((max(1, round(c.width * scale)), max(1, round(c.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
        canvas.alpha_composite(c, ((96 - c.width) // 2, 94 - c.height))
        canvas.save(f'{out}/hero_noctis_{k}.png'); print(k, c.size)
