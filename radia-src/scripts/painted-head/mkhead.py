from PIL import Image, ImageFilter
import numpy as np, sys
name, o = sys.argv[1], int(sys.argv[2])
PAD = 7 if name.endswith('-nc') else 0          # place pour reconstruire le sommet du crâne (couronne effacée)
src=Image.open(f'{name}.webp').convert('RGBA')
a0=np.array(src).astype(float); H,W=a0.shape[:2]
a=np.zeros((H+PAD,W,4)); a[PAD:]=a0
if PAD:
    # dôme : chaque colonne prolonge vers le haut la couleur de ses cheveux, jusqu'à une courbe arrondie
    for x in range(130,222):
        if a[PAD+1,x,3]<200: continue          # seulement là où la coupe plate touche le bord
        col=a[PAD+1:PAD+5,x,:3].mean(0)
        t=(x-176)/46.0
        if abs(t)>=1: continue
        ytop=PAD-PAD*np.sqrt(1-t*t)            # léger arrondi (≤ 7 px)
        for y in range(int(np.floor(ytop)),PAD):
            al=np.clip(y+1-ytop,0,1)
            a[y,x,:3]=col; a[y,x,3]=255*al
R,G,B,A=a[...,0],a[...,1],a[...,2],a[...,3]
Hh=H+PAD
yy,xx=np.mgrid[0:Hh,0:W]; yy=yy-o-PAD
hairish=np.clip(((R-B)-10)/10,0,1)*np.clip((R-44)/12,0,1)
hairish=np.where(yy>300, hairish*np.clip(((R-B)-14)/8,0,1), hairish)   # longueurs : plus strict (ombres du sweat)
keep=np.where(yy<=150,1.0,0.0)
cx,cy,rx,ry=176,118,64,90
inface=(((xx-cx)/rx)**2+((yy-cy)/ry)**2)<=1.0
zone=(yy>150)&(yy<470)
keep[zone]=np.maximum(hairish[zone], inface[zone].astype(float))
corr=(xx>108)&(xx<244)&(yy>150)
darkhair=np.clip(((R-B)-10)/10,0,1)*np.clip((R-44)/12,0,1)*(R<170)*(xx<176)*((R>78)|(yy>262)|(xx<122))
keep[corr]=np.where(inface[corr],1.0,np.where((xx[corr]<120)|(xx[corr]>232),hairish[corr],darkhair[corr]))
# mèches devant l'épaule : fondu horizontal doux (le sweat d'origine les bordait d'une arête nette)
soft=np.clip((176-xx)/22,0,1); keep=np.where((yy>215)&(xx>118)&(xx<176), keep*soft, keep)
keep[(xx>143)&(xx<226)&(yy>=209)&(yy<262)]=0   # reste du contour du col d'origine sous le menton
keep[(xx>262)&(yy>250)]=0                       # pas de liseré du sweat à droite (cheveux derrière l'épaule)
fade=np.clip((470-yy)/40,0,1); keep*=np.where(yy>200,fade,1); keep[yy>=470]=0
def components(mask):
    """composantes connexes (4-voisins) sans scipy : renvoie (étiquettes, nombre)"""
    lab=np.zeros(mask.shape,dtype=np.int32); n=0; Hh_,Ww_=mask.shape
    for y0 in range(Hh_):
        for x0 in range(Ww_):
            if mask[y0,x0] and not lab[y0,x0]:
                n+=1; st=[(y0,x0)]; lab[y0,x0]=n
                while st:
                    y,x=st.pop()
                    for yy2,xx2 in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
                        if 0<=yy2<Hh_ and 0<=xx2<Ww_ and mask[yy2,xx2] and not lab[yy2,xx2]: lab[yy2,xx2]=n; st.append((yy2,xx2))
    return lab,n
lab,n=components(keep>0.35)
sizes=np.bincount(lab.ravel(),minlength=n+1)
keepcomp=np.isin(lab,[i for i in range(1,n+1) if sizes[i]>600])
grow=Image.fromarray((keepcomp*255).astype('uint8')).filter(ImageFilter.MaxFilter(5))
keep=np.where(np.array(grow)>0,keep,0)      # supprime les fils parasites isolés
m=Image.fromarray((np.clip(keep,0,1)*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.9))
out=a.copy(); out[...,3]=A*np.array(m)/255.0
im=Image.fromarray(out.astype('uint8'),'RGBA').crop((0,0,W,470+o+PAD))
out_name='headp-radia-nc' if name.endswith('-nc') else 'headp-radia'
im.save(out_name+'.webp','WEBP',quality=92,method=6); print(out_name, im.size, 'PAD', PAD)
bg=Image.new('RGBA',im.size,(120,255,120,255)); bg.alpha_composite(im); bg.convert('RGB').crop((80,0,280,140)).resize((600,420)).save(f'top-{out_name}.png')
bg.convert('RGB').save(f'full-{out_name}.png')
