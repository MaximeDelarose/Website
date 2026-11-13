"""Assemble les assets de la version navigateur dans ashbound/img (sprites procéduraux + sprites extraits des planches de référence).
Usage : python3 export_web.py <repo_root> <dossier_extraction_refs>"""
import os, shutil, sys
import numpy as np
from PIL import Image
from scipy import ndimage

root, refs = sys.argv[1], sys.argv[2]
A = f'{root}/ashbound-tower/Assets/_Project'
OUT = f'{root}/ashbound/img'
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
def cp(src, dst): shutil.copy(src, f'{OUT}/{dst}')

# décor, ennemis non fournis, cœur, FX
for n in ['enemy_scout_0', 'enemy_scout_1', 'enemy_elite_0', 'enemy_elite_1', 'enemy_miniboss_0', 'enemy_miniboss_1', 'enemy_boss_0', 'enemy_boss_1', 'heart_0', 'heart_1',
          'pine_s', 'pine_m', 'pine_d', 'ruin_a', 'ruin_b', 'rock', 'rock_small', 'crystal', 'sparkle', 'gate', 'tower_orb_0', 'tower_orb_1', 'tower_orb_2', 'tower_orb_3']:
    cp(f'{A}/Art/Billboards/{n}.png', f'{n}.png')
cp(f'{A}/Art/Ground/arena01_ground.png', 'ground.png'); cp(f'{A}/Resources/Ashbound/Fx/fx_shadow.png', 'fx_shadow.png')
# sprites extraits des planches (Noctis, Phelto, Églantyne, orbe, tourelles, FX, portraits)
for f in os.listdir(refs): cp(f'{refs}/{f}', f)
# Noctis (déjà extrait au premier passage : poses de la planche)
nox = f'{root}/ashbound'  # (copié ailleurs par extract_refs.py)
# poupée de bois individuelle (la plus grande de la rangée de 3)
d = Image.open(f'{refs}/fx_eglantyne_dolls.png'); a = np.array(d)[:, :, 3] > 0; lab, n = ndimage.label(a, structure=np.ones((3, 3)))
if n:
    sizes = ndimage.sum(a, lab, range(1, n + 1)); k = int(np.argmax(sizes)) + 1; ys, xs = np.nonzero(lab == k); doll = d.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    s = 26.0 / doll.height; doll = doll.resize((max(1, round(doll.width * s)), 26), Image.LANCZOS); doll.save(f'{OUT}/doll.png')
print(len(os.listdir(OUT)), 'fichiers')
