"""
Calques peints de Radia, tirés des illustrations privées (même artiste qu'Auguste). Entrées (déchiffrées, dossier temporaire) :
  char-radia.webp (avec couronne dorée) et char-radia-nc.webp (sans couronne).
Sorties : headp-radia-nc.webp (tête + cheveux, crâne COMPLET avec dôme), crownp-gold.webp (couronne dorée seule), facep-radia.webp (visage seul).
Repère de sortie 'tête' : origine = (0, -PAD) dans le repère de l'illustration sans couronne (PAD ci-dessous).
"""
from PIL import Image, ImageFilter
import numpy as np, sys
PAD = 26                       # hauteur ajoutée au-dessus pour le dôme du crâne
nc = Image.open('char-radia-nc.webp').convert('RGBA'); cr = Image.open('char-radia.webp').convert('RGBA')
a0 = np.array(nc).astype(float); H, W = a0.shape[:2]

# ---- 1. dôme du crâne : ellipse ajustée sur le vrai contour (lignes 2..24), prolongée au-dessus de la coupe plate
alpha = a0[..., 3]
rows = list(range(3, 26)); hw = []; cx = []
for y in rows:
    xs = np.where(alpha[y] > 100)[0]; hw.append((xs.max() - xs.min()) / 2); cx.append((xs.max() + xs.min()) / 2)
CX0 = float(np.mean(cx))
best = None
for yc in range(8, 120, 2):
    for b in range(14, 90, 2):
        for a in range(40, 120, 2):
            pred = [a * np.sqrt(max(0, 1 - ((y - yc) / b) ** 2)) if abs(y - yc) < b else 0 for y in rows]
            e = np.mean((np.array(pred) - np.array(hw)) ** 2)
            if best is None or e < best[0]: best = (e, yc, a, b)
e, YC, A_, B_ = best
print('ellipse du crâne : centre y=%d demi-largeur=%d demi-hauteur=%d (erreur %.2f px²), sommet y=%d' % (YC, A_, B_, e, YC - B_))
top_y = YC - B_
a = np.zeros((H + PAD, W, 4)); a[PAD:] = a0
FILL_TO = 14   # lignes de l'illustration (0..FILL_TO) : on comble tout trou à l'intérieur du contour du crâne
for x in range(W):
    for y in range(PAD + FILL_TO):
        yi = y - PAD
        dx = (x - CX0)
        if abs(yi - YC) >= B_: continue
        lim = A_ * np.sqrt(1 - ((yi - YC) / B_) ** 2)
        if yi >= 2: lim = max(lim, 0) + (0 if yi < 4 else 0)
        if abs(dx) > lim: continue
        if a[y, x, 3] >= 250 and yi >= 8: continue          # pixel plein sous la ligne 8 : on le garde ; au-dessus, on repeint (reste de la coupe)
        col = a0[FILL_TO + 1:FILL_TO + 9, int(np.clip(x, 0, W - 1)), :3].mean(0)
        edge = abs(dx) / max(lim, 1)
        k = 1.0 - 0.10 * edge ** 2
        al = np.clip((lim - abs(dx)) * 0.9 + 0.5, 0, 1)
        if yi >= 2: al = 1.0
        a[y, x, :3] = col * k; a[y, x, 3] = 255 * al if yi < 8 else max(a[y, x, 3], 255 * al)
# raccord : fondu sur la coupe plate (lignes 0..4 de l'illustration) pour effacer l'arête
for y in range(PAD - 1, PAD + 5):
    pass

# ---- 2. masque tête + cheveux (voir scripts/painted-head/README.md)
R, G, B, A = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
Hh = H + PAD
yy, xx = np.mgrid[0:Hh, 0:W]; yy = yy - PAD
hairish = np.clip(((R - B) - 10) / 10, 0, 1) * np.clip((R - 44) / 12, 0, 1)
hairish = np.where(yy > 300, hairish * np.clip(((R - B) - 14) / 8, 0, 1), hairish)
keep = np.where(yy <= 150, 1.0, 0.0)
cx_, cy_, rx_, ry_ = 176, 118, 64, 90
inface = (((xx - cx_) / rx_) ** 2 + ((yy - cy_) / ry_) ** 2) <= 1.0
zone = (yy > 150) & (yy < 470)
keep[zone] = np.maximum(hairish[zone], inface[zone].astype(float))
corr = (xx > 108) & (xx < 244) & (yy > 150)
darkhair = np.clip(((R - B) - 10) / 10, 0, 1) * np.clip((R - 44) / 12, 0, 1) * (R < 170) * (xx < 176) * ((R > 78) | (yy > 262) | (xx < 122))
keep[corr] = np.where(inface[corr], 1.0, np.where((xx[corr] < 120) | (xx[corr] > 232), hairish[corr], darkhair[corr]))
soft = np.clip((176 - xx) / 22, 0, 1); keep = np.where((yy > 215) & (xx > 118) & (xx < 176), keep * soft, keep)
keep[(xx > 143) & (xx < 226) & (yy >= 209) & (yy < 262)] = 0
# mèche de droite (derrière l'épaule) : bords adoucis et extrémité en FONDU (plus de coupe franche posée sur la manche)
f = np.clip((yy - 170) / 50.0, 0, 1)                      # l'adoucissement des bords démarre PROGRESSIVEMENT (aucune marche)
xfade = 1 - f * (1 - np.clip((270 - xx) / 16.0, 0, 1))
yfade = np.clip((290 - yy) / 56.0, 0, 1)
keep = np.where(xx > 190, keep * xfade * yfade, keep)
fade = np.clip((470 - yy) / 40, 0, 1); keep *= np.where(yy > 200, fade, 1); keep[yy >= 470] = 0

def components(mask):
    lab = np.zeros(mask.shape, dtype=np.int32); n = 0; hh, ww = mask.shape
    for y0 in range(hh):
        for x0 in range(ww):
            if mask[y0, x0] and not lab[y0, x0]:
                n += 1; st = [(y0, x0)]; lab[y0, x0] = n
                while st:
                    y, x = st.pop()
                    for y2, x2 in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= y2 < hh and 0 <= x2 < ww and mask[y2, x2] and not lab[y2, x2]: lab[y2, x2] = n; st.append((y2, x2))
    return lab, n
lab, n = components(keep > 0.35); sizes = np.bincount(lab.ravel(), minlength=n + 1)
big = np.isin(lab, [i for i in range(1, n + 1) if sizes[i] > 600])
grow = Image.fromarray((big * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5))
keep = np.where(np.array(grow) > 0, keep, 0)
m = Image.fromarray((np.clip(keep, 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.9))
out = a.copy(); out[..., 3] = A * np.array(m) / 255.0
head = Image.fromarray(out.astype('uint8'), 'RGBA').crop((0, 0, W, 470 + PAD))
head.save('headp-radia-nc.webp', 'WEBP', quality=92, method=6); print('headp-radia-nc', head.size, 'PAD', PAD)

# ---- 3. couronne dorée seule (calque), repère = illustration sans couronne (les lignes de char-radia sont décalées de +49)
c = np.array(cr).astype(float); Rc, Gc, Bc, Ac = c[..., 0], c[..., 1], c[..., 2], c[..., 3]
gold = np.clip(((Rc - Bc) - 55) / 25, 0, 1) * np.clip((Gc - 110) / 25, 0, 1) * (Ac > 120)
gold[70:] = 0
gm = Image.fromarray((gold * 255).astype('uint8')).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(0.7))   # fermeture : comble le reflet central
cs = c.copy(); cs[..., 3] = np.array(gm)
ys, xs = np.where(np.array(gm) > 40); x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
crown = Image.fromarray(cs.astype('uint8'), 'RGBA').crop((x0, y0, x1, y1))
crown.save('crownp-gold.webp', 'WEBP', quality=94, method=6)
# position de la couronne dans le repère « illustration sans couronne » : y - 49
print('crownp-gold', crown.size, 'origine (illustration sans couronne) x=%d y=%d' % (x0, y0 - 49))
open('crown_origin.txt', 'w').write('%d %d %d %d' % (x0, y0 - 49, crown.width, crown.height))
open('skull_top.txt', 'w').write('%d' % top_y)

# ---- 4. visage seul
cxf, cyf, rxf, ryf = 176, 120, 60, 88
e2 = ((xx - cxf) / rxf) ** 2 + ((yy - cyf) / ryf) ** 2
inside = e2 <= 1.0
hair2 = (R < 150) & ((R - B) > 8) & ((yy < 84) | (np.abs(xx - cxf) > 52)) & ~((yy > 84) & (yy < 104) & (np.abs(xx - cxf) < 56))
kf = (inside & ~hair2).astype(float)
mf = Image.fromarray((kf * 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.0))
of = a.copy(); of[..., 3] = A * np.array(mf) / 255.0
face = Image.fromarray(of.astype('uint8'), 'RGBA').crop((100, 20 + PAD, 252, 215 + PAD))
face.save('facep-radia.webp', 'WEBP', quality=92, method=6); print('facep-radia', face.size)
for n_, im in (('headp-radia-nc', head), ('crownp-gold', crown)):
    bg = Image.new('RGBA', im.size, (120, 255, 120, 255)); bg.alpha_composite(im); bg.convert('RGB').save('chk-' + n_ + '.png')
