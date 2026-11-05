from PIL import Image, ImageFilter
import numpy as np
src=Image.open('char-radia-nc.webp').convert('RGBA')
a=np.array(src).astype(float); H,W=a.shape[:2]
R,G,B,A=a[...,0],a[...,1],a[...,2],a[...,3]
yy,xx=np.mgrid[0:H,0:W]
cx,cy,rx,ry=176,120,60,88
e=((xx-cx)/rx)**2+((yy-cy)/ry)**2
inside=e<=1.0
# cheveux à l'intérieur de l'ovale (front, tempes) : brun foncé AU-DESSUS des sourcils, ou sur les bords des joues
hair=(R<150)&((R-B)>8)&(((yy<84))|(np.abs(xx-cx)>52))&~((yy>84)&(yy<104)&(np.abs(xx-cx)<56))  # garde les sourcils
keep=(inside&~hair).astype(float)
m=Image.fromarray((keep*255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.0))
out=a.copy(); out[...,3]=A*np.array(m)/255.0
im=Image.fromarray(out.astype('uint8'),'RGBA').crop((100,20,252,215)); im.save('facep-radia.png'); print(im.size)
bg=Image.new('RGBA',im.size,(120,255,120,255)); bg.alpha_composite(im); bg.convert('RGB').resize((im.width*3,im.height*3)).save('check-face.png')
