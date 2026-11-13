"""Extrait les sprites de Phelto et d'Églantyne depuis les planches de référence fournies par l'auteur du projet (fond blanc → transparent).
Usage : python3 extract_refs2.py <planche_phelto> <planche_eglantyne> <portrait_eglantyne_gris> <planche_noctis> <fiche_etats> <dossier_sortie>"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

def alpha_white(im, box, thr=222):
    a = np.array(im.crop(box).convert('RGB')).astype(int)
    white = (a.min(axis=2) > thr)
    near = np.zeros_like(white)
    near[1:, :] |= white[:-1, :]; near[:-1, :] |= white[1:, :]; near[:, 1:] |= white[:, :-1]; near[:, :-1] |= white[:, 1:]
    fringe = near & (a.min(axis=2) > 192)
    al = np.where(white | fringe, 0, 255).astype(np.uint8)
    # on retire les petits parasites (textes, étincelles isolées < 12 px) sans toucher aux grosses formes
    lab, n = ndimage.label(al > 0, structure=np.ones((3, 3)))
    if n:
        sizes = ndimage.sum(al > 0, lab, range(1, n + 1)); big = sizes.max()
        keep = np.zeros(n + 1, bool); keep[1:] = sizes >= max(12, big * 0.004)
        al = np.where(keep[lab], al, 0).astype(np.uint8)
    img = Image.fromarray(np.dstack([a.astype(np.uint8), al]), 'RGBA')
    bb = img.getbbox()
    return img.crop(bb) if bb else img

def alpha_flood(im, box, tol=30):
    """fond uni sombre/gris : flood-fill depuis les bords."""
    a = np.array(im.crop(box).convert('RGB')).astype(int)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]); bg = np.median(border, axis=0)
    close = (np.abs(a - bg).sum(axis=2) < tol)
    lab, n = ndimage.label(close)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(edge_labels))
    al = np.where(bgmask, 0, 255).astype(np.uint8)
    lab2, n2 = ndimage.label(al > 0, structure=np.ones((3, 3)))
    if n2:
        sizes = ndimage.sum(al > 0, lab2, range(1, n2 + 1)); keep = np.zeros(n2 + 1, bool); keep[1:] = sizes >= max(20, sizes.max() * .003); al = np.where(keep[lab2], al, 0).astype(np.uint8)
    img = Image.fromarray(np.dstack([a.astype(np.uint8), al]), 'RGBA'); bb = img.getbbox(); return img.crop(bb) if bb else img

def fit(img, h=None, w=None, canvas=(128, 104), pad=3):
    """met à l'échelle (h ou w cible), puis pose sur un canevas transparent, pivot bas-centre."""
    s = (h / img.height) if h else (w / img.width)
    im = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    cw, ch = canvas; cw = max(cw, im.width + 2); ch = max(ch, im.height + pad)
    c = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); c.alpha_composite(im, ((cw - im.width) // 2, ch - pad - im.height)); return c, s

# --- boîtes (coordonnées des planches telles qu'affichées 1448x1086) ---
PHELTO = {'big': (10, 155, 312, 560), 'idle0': (350, 120, 520, 300), 'idle1': (525, 120, 690, 300), 'move0': (725, 120, 880, 300), 'move1': (1290, 120, 1432, 300),
          'atk': (325, 395, 472, 590), 'cast': (960, 385, 1130, 590), 'icon': (62, 604, 254, 788)}
PH_FX = {'notes': (300, 640, 492, 765), 'wave': (510, 640, 766, 765), 'heart': (780, 640, 925, 790), 'sonic': (940, 640, 1105, 790), 'recital': (1120, 612, 1425, 790), 'impact': (700, 418, 905, 590)}
PH_TW = {'0': (22, 880, 112, 1012), '1': (118, 880, 232, 1012), '2': (236, 870, 348, 1012)}
EG = {'big': (5, 125, 350, 592), 'idle0': (385, 140, 522, 330), 'idle1': (526, 140, 690, 330), 'move0': (712, 160, 862, 330), 'move1': (1228, 160, 1425, 330),
      'atk': (355, 435, 545, 592), 'cast': (948, 420, 1112, 592), 'icon': (66, 648, 256, 822)}
EG_FX = {'seed': (300, 688, 522, 792), 'spores': (540, 690, 742, 802), 'lianes': (760, 690, 1122, 802), 'solar': (1132, 668, 1432, 812), 'calice': (1170, 415, 1440, 592), 'impact': (705, 415, 905, 592)}
EG_TW = {'0': (15, 905, 118, 1032), '1': (120, 905, 236, 1032), '2': (236, 895, 338, 1032)}
EG_DOLL = (1122, 925, 1440, 1032)

if __name__ == '__main__':
    ph, eg, egbig, nx, st, out = sys.argv[1:7]; os.makedirs(out, exist_ok=True)
    P = Image.open(ph).convert('RGB'); E = Image.open(eg).convert('RGB')
    for name, boxes, im, key in (('phelto', PHELTO, P, 'idle0'), ('eglantyne', EG, E, 'idle0')):
        crops = {k: alpha_white(im, b) for k, b in boxes.items()}
        scale = 80.0 / crops[key].height
        for k in ('idle0', 'idle1', 'move0', 'move1', 'atk', 'cast'):
            c, _ = fit(crops[k], h=crops[k].height * scale); c.save(f'{out}/hero_{name}_{k}.png')
        c, _ = fit(crops['icon'], h=96, canvas=(96, 96), pad=0); c.save(f'{out}/icon_{name}.png')
        c, _ = fit(crops['big'], h=300, canvas=(300, 300), pad=0); c.save(f'{out}/big_{name}.png')
    # FX
    for k, b in PH_FX.items(): c, _ = fit(alpha_white(P, b), w=min(120, alpha_white(P, b).width * .5), canvas=(8, 8), pad=0); c.save(f'{out}/fx_phelto_{k}.png')
    for k, b in EG_FX.items(): c, _ = fit(alpha_white(E, b), w=min(140, alpha_white(E, b).width * .5), canvas=(8, 8), pad=0); c.save(f'{out}/fx_eglantyne_{k}.png')
    # tourelles : 3 stades chacune (le 4e niveau réutilise le 3e, plus grand)
    for fam, tw, im in (('ampli', PH_TW, P), ('ronce', EG_TW, E)):
        crops = [alpha_white(im, tw[str(i)]) for i in range(3)]
        ref_w = max(c.width for c in crops); s = 76.0 / max(ref_w, crops[2].height * 76.0 / 84)
        for i, c in enumerate(crops):
            cc, _ = fit(c, h=min(84, c.height * s), canvas=(80, 88), pad=3); cc.save(f'{out}/tower_{fam}_{i}.png')
        c3, _ = fit(crops[2], h=min(84, crops[2].height * s) * 1.12, canvas=(88, 96), pad=3); c3.save(f'{out}/tower_{fam}_3.png')
    d = alpha_white(E, EG_DOLL); c, _ = fit(d, h=26, canvas=(8, 8), pad=0); c.save(f'{out}/fx_eglantyne_dolls.png')
    # Noctis : grand portrait + icône
    N = Image.open(nx).convert('RGB')
    c, _ = fit(alpha_white(N, (30, 100, 325, 470)), h=300, canvas=(300, 300), pad=0); c.save(f'{out}/big_noctis.png')
    c, _ = fit(alpha_white(N, (95, 525, 268, 690), thr=250), h=96, canvas=(96, 96), pad=0); c.save(f'{out}/icon_noctis.png')
    # Noctis : totems d'ombre (famille 2) = tourelle
    tt = [alpha_white(N, b) for b in ((428, 800, 506, 985), (506, 800, 610, 985), (625, 800, 745, 985))]
    s = 84.0 / max(c.height for c in tt)
    for i, c in enumerate(tt): cc, _ = fit(c, h=c.height * s, canvas=(80, 88), pad=3); cc.save(f'{out}/tower_faille_{i}.png')
    c3, _ = fit(tt[2], h=tt[2].height * s * 1.1, canvas=(88, 96), pad=3); c3.save(f'{out}/tower_faille_3.png')
    # ennemi orbe : fiche d'états (fond sombre uni)
    S = Image.open(st).convert('RGB'); o = alpha_flood(S, (62, 205, 245, 400), tol=26)
    for f in (0, 1):
        c, _ = fit(o, h=44, canvas=(48, 50), pad=2 + f); c.save(f'{out}/enemy_orb_{f}.png')
    print('ok')
