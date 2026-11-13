"""Régénère tous les assets du projet : `python3 Tools/art/generate_all.py`"""
import os, json, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
import layout, gen_ground, gen_sprites, gen_ui_audio
root = os.path.abspath(os.path.join(here, '..', '..', 'Assets', '_Project'))
os.makedirs(f'{root}/Art/Ground', exist_ok=True); os.makedirs(f'{root}/Art/Billboards', exist_ok=True); os.makedirs(f'{root}/Data', exist_ok=True)
os.makedirs(f'{root}/Resources/Ashbound/Fx', exist_ok=True)
L = layout.build()
json.dump(L, open(f'{root}/Data/Arena01_layout.json', 'w'), indent=1)
gen_ground.paint(L, f'{root}/Art/Ground/arena01_ground.png')
spr = gen_sprites.build_all(f'{root}/Art/Billboards')
for k in [k for k in spr if k.startswith('fx_')]:
    os.replace(f'{root}/Art/Billboards/{k}.png', f'{root}/Resources/Ashbound/Fx/{k}.png')
gen_ui_audio.build_ui(f'{root}/Resources/Ashbound/UI')
gen_ui_audio.build_audio(f'{root}/Resources/Ashbound/Audio')
print('OK', len(spr), 'sprites')
