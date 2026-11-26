"""Héros d'Echoes of Aether dans le style Pixel Crawler (Anokolisa), construits sur son corps de base.

  python3 tools/art16/pc_heroes.py <dossier « Pixel Crawler - Free Pack »> <dossier de sortie>

Principe (aucune image du pack n'est redessinée à la main) :
  1. Chaque image d'animation du corps de base (Body_A : face / profil / dos) est découpée en zones :
     tête, haut du corps, ceinture, jambes, chaussures, bras (composantes séparées par le contour).
  2. Chaque zone est recolorée avec la rampe du héros en gardant les 4 tons d'ombre du pack
     (lumière, base, ombre, ombre foncée) : la lumière et les volumes d'origine sont conservés.
  3. La coiffure, la barbe et les accessoires sont des gabarits dessinés une fois par vue, calés
     sur la tête à chaque image (recherche de la meilleure correspondance de silhouette).
  4. Le contour noir est refait autour de la nouvelle silhouette.
"""

import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

# Tons du corps de base Pixel Crawler
SKIN = {"L": (0xFA, 0xC8, 0x95), "s": (0xD9, 0xA0, 0x66), "S": (0xA2, 0x65, 0x43), "D": (0x76, 0x3D, 0x2B)}
INK = (0, 0, 0)
EYE = (0x4C, 0xB5, 0x28)
TONE = {v: k for k, v in SKIN.items()}

hexc = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


def ramp(*hexes):
    """Rampe (lumière, base, ombre, ombre foncée)."""
    l, s, S, D = (hexc(h) for h in hexes)
    return {"L": l, "s": s, "S": S, "D": D}


# Tête de référence (grille locale 16×18, origine = (hl-2, ht-4)) : silhouette pour le calage
HEAD_REF = {
    "Down": [
        "................", "................", "................", "................",
        ".....######.....", "....#SssssS#....", "...#SssssssS#...", "..#SssssssssS#..",
        "..#SssssssssS#..", "..#SssssssssS#..", "..#SssssssssS#..", "..#ssssssssss#..",
        "..#s###ss###s#..", "..#ss?#ss#?ss#..", "..#Ss?esse?sS#..", "...#SssssssS#...",
        "....#SssssS#....", "....########....",
    ],
    "Side": [
        "................", "................", "................", "................",
        ".....#######....", "....#sssssss#...", "...#sssssssss#..", "..#Sssssssssss#.",
        "..#SSsssssssss#.", "..#SSSssssssss#.", "..#SSSssssssss#.", "..#SSS##ssssss#.",
        "..#SSS#sss###s#.", "...#SS#ssss?#s#.", "....#SS#sss?es#.", ".....#SSssssss#.",
        "......#SSssss#..", ".....########...",
    ],
    "Up": [
        "................", "................", "................", "................",
        ".....######.....", "....#ssssss#....", "...#ssssssss#...", "..#SssssssssS#..",
        "..#SssssssssS#..", "..#SssssssssS#..", "..#SSssssssSS#..", "..#SSSSSSSSSS#..",
        "..#SSSSSSSSSS#..", "..#SSSSSSSSSS#..", "..#SSSSSSSSSS#..", "...#SSSSSSSS#...",
        "....#SSSSSS#....", "....########....",
    ],
}
HEAD_MASK = {k: np.array([[c != "." for c in r] for r in v]) for k, v in HEAD_REF.items()}


def find_head(op, view):
    """Position (x0, y0) de la grille de tête dans l'image, et score de correspondance."""
    m = HEAD_MASK[view]
    hh, hw = m.shape
    best = (-1, 0, 0)
    H, W = op.shape
    ht = int(np.where(op.any(1))[0].min())
    for y0 in range(ht - 10, min(H - hh, ht + 14) + 1):
        for x0 in range(6, W - hw - 4):
            ys0, xs0 = max(0, -y0), max(0, -x0)
            sub = op[y0 + ys0 : y0 + hh, x0 + xs0 : x0 + hw]
            mm = m[ys0 : ys0 + sub.shape[0], xs0 : xs0 + sub.shape[1]]
            if not mm.any():
                continue
            inter = (sub & mm).sum()
            # seule la partie tête (lignes 4..17) compte ; tout ce qui dépasse au-dessus est toléré
            score = inter / max(1, mm.sum()) - 0.5 * ((sub & ~mm)[max(0, 4 - ys0) :].sum()) / max(1, mm.sum())
            if score > best[0]:
                best = (score, x0, y0)
    return best[1], best[2], best[0]


def stamp(a, tpl, x0, y0, colors):
    """Applique un gabarit (liste de lignes) : chaque caractère est un rôle de `colors`, '.' = rien,
    '_' = efface."""
    for j, row in enumerate(tpl):
        for i, ch in enumerate(row):
            if ch == ".":
                continue
            y, x = y0 + j, x0 + i
            if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]:
                if ch == "_":
                    a[y, x] = (0, 0, 0, 0)
                else:
                    c = (0, 0, 0) if ch == "#" else colors[ch]
                    a[y, x] = (*c, 255)


CROSS = [[0, 1, 0], [1, 1, 1], [0, 1, 0]]


def outline(a):
    """Contour noir d'1 px, comme le pack : autour des pixels colorés uniquement (pas autour des
    contours existants, sinon il double), puis suppression des pixels noirs qui ne touchent
    plus aucun pixel coloré (restes d'anciens contours devenus extérieurs)."""
    op = a[..., 3] > 0
    black = op & (a[..., :3] == 0).all(-1)
    colored = op & ~black
    ring = ndimage.binary_dilation(colored, structure=CROSS) & ~op
    a[ring] = (0, 0, 0, 255)
    black |= ring
    touching = ndimage.binary_dilation(colored, structure=CROSS)
    a[black & ~touching] = (0, 0, 0, 0)


def erase_tool(a):
    """Efface l'outil tenu (hache, pioche, épée) et l'effet de coup : tout pixel qui n'est ni peau,
    ni contour, ni œil, puis les morceaux de contour qui ne bordent plus le corps."""
    rgb = a[..., :3]
    op = a[..., 3] > 0
    keep_cols = set(SKIN.values()) | {INK, EYE, (0xE7, 0xE7, 0xE7), (0xFF, 0xFF, 0xFE)}
    body = np.zeros(op.shape, bool)
    for y, x in zip(*np.where(op)):
        c = tuple(rgb[y, x])
        if c in SKIN.values() or c == EYE:
            body[y, x] = True
    tool = op & ~body & ~(rgb == 0).all(-1)
    # le blanc des yeux (e7e7e7) est dans la tête : on ne l'efface que loin du corps
    near = ndimage.binary_dilation(body, iterations=1)
    tool &= ~(near & np.isin(rgb.reshape(-1, 3).view([("", rgb.dtype)] * 3).ravel(),
                             np.array([(0xE7, 0xE7, 0xE7)], dtype=rgb.dtype).view([("", rgb.dtype)] * 3).ravel()).reshape(op.shape))
    a[tool] = (0, 0, 0, 0)
    ink = (a[..., 3] > 0) & (a[..., :3] == 0).all(-1)
    body_now = (a[..., 3] > 0) & ~ink
    ring = ndimage.binary_dilation(body_now, structure=np.ones((3, 3)))
    a[ink & ~ring] = (0, 0, 0, 0)


def dress_frame(fr, hero, view, keep_tool=False, k=0):
    a = np.array(fr.convert("RGBA")).copy()
    if not keep_tool:
        erase_tool(a)
    op = a[..., 3] > 0
    if not op.any():
        return fr
    x0, y0, score = find_head(op, view)
    if score < 0.8:
        return None  # tête non reconnue (ex. personnage couché) : image ignorée
    hb = y0 + 17  # ligne de contour sous la tête (cou)
    bottom = np.where(op.any(1))[0].max()
    cx = x0 + 8
    rgb = a[..., :3]
    is_ink = op & (rgb == 0).all(-1)
    colored = op & ~is_ink

    def tone(y, x):
        return TONE.get(tuple(rgb[y, x]))

    # --- corps : composantes séparées par le contour ---
    body = colored.copy()
    body[: hb + 1] = False
    lab, n = ndimage.label(body)
    seed = None
    for dy in range(1, 5):
        for dx in (0, -1, 1, -2, 2):
            y, x = hb + dy, cx + dx
            if 0 <= y < a.shape[0] and 0 <= x < a.shape[1] and lab[y, x]:
                seed = lab[y, x]
                break
        if seed:
            break
    legs_top = hb + 7
    for comp in range(1, n + 1):
        ys, xs = np.where(lab == comp)
        top = ys.min()
        is_main = comp == seed
        # un bras part du haut du corps et ne touche pas le sol (sinon c'est une jambe pliée)
        is_arm = not is_main and top <= hb + 6 and ys.max() < bottom - 2
        for y, x in zip(ys, xs):
            t = tone(y, x)
            if t is None:
                continue
            region = None
            side_arm = (view in ("Down", "Up") and abs(x - cx + 0.5) >= 4.5 and y < legs_top + 4) or (
                view == "Side" and not is_main and False
            ) or (view == "Side" and x <= cx - 3 and hb + 3 <= y < legs_top + 3 and t != "D")
            if is_arm or side_arm:
                rel = y - (top if is_arm else hb + 4)
                region = "sleeve" if rel < hero.get("sleeve_len", 4) else "skin"
            elif view == "Side" and t == "D" and y < legs_top + 2:
                region = "skin"  # poing (ton le plus foncé) en vue de profil
            else:
                if y >= bottom - hero.get("shoe_h", 1):
                    region = "shoes"
                elif y >= legs_top:
                    region = "pants"
                elif y == legs_top - 1:
                    region = "belt"
                else:
                    region = "top"
                    if hero.get("shirt") and view == "Down" and abs(x - cx + 0.5) <= 1 and y >= hb + 1:
                        region = "shirt"
                    if hero.get("shirt") and view == "Side" and y >= hb + 1 and x >= cx + 1:
                        region = "shirt"
            r = hero.get(region) or hero["skin"]
            rgb[y, x] = r[t]
    # --- tête : peau et yeux ---
    for y in range(max(0, y0), min(a.shape[0], hb + 1)):
        for x in range(max(0, x0), min(a.shape[1], x0 + 16)):
            if not op[y, x]:
                continue
            t = tone(y, x)
            if t:
                rgb[y, x] = hero["skin"][t]
            elif tuple(rgb[y, x]) == EYE:
                rgb[y, x] = hexc(hero.get("eye", "#2a1c14"))
    a[..., :3] = rgb
    # --- queue accrochée aux hanches : derrière le corps (face, profil) ; de dos, devant le corps
    # et par-dessus les cheveux, retournée en miroir de la vue de face (elle sort de l'autre côté) ---
    tail_args = None
    if hero.get("logo_tail") and seed:
        zone = np.zeros_like(body)
        zone[legs_top - 3 : legs_top + 1] = True
        ys_, xs_ = np.where((lab == seed) & zone)
        if len(xs_):
            if view == "Side":
                tail_args = dict(hip=(int(xs_.min()), legs_top + 1), front=False, flip=False)
            elif view == "Down":
                tail_args = dict(hip=(int(xs_.min()) + 2, legs_top + 1), front=False, flip=False)
            else:
                # de dos : part du milieu du dos (colonne vertébrale)
                tail_args = dict(hip=(int(round(xs_.mean())), legs_top + 1), front=True, flip=True)
    if tail_args and not tail_args["front"]:
        paste_tail(a, view, shear=hero.get("tail_shear", 0), **tail_args)
    # --- coiffure et accessoires ---
    for layer in hero["head"].get(view, []):
        stamp(a, layer, x0, y0, hero["roles"])
    if tail_args and tail_args["front"]:
        paste_tail(a, view, shear=0, **tail_args)  # devant la tête : pas besoin de l'incliner
    if hero.get("skirt"):
        skirt(a, hero, cx, legs_top, bottom)
    outline(a)
    return Image.fromarray(a)


LOGO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "squirrel.png")
# Dernière colonne de la queue pour chaque ligne du logo (18×19) : la queue s'arrête à la ligne
# brun foncé qui la sépare du corps de l'écureuil.
LOGO_TAIL_LAST_COL = [10, 10, 10, 10, 10, 10, 10, 9, 9, 7, 6, 5, 5, 5, 5, 5, 5]
LOGO_TAIL_BASE = (5, 15)  # point d'attache (bas de la queue) dans le logo


def logo_tail():
    """La queue de l'écureuil du logo du site, pixel pour pixel."""
    im = np.array(Image.open(LOGO).convert("RGBA"))
    t = np.zeros_like(im)
    for y, last in enumerate(LOGO_TAIL_LAST_COL):
        t[y, : last + 1] = im[y, : last + 1]
    t[..., 3] = np.where(t[..., 3] > 127, 255, 0)
    return t


TAIL = None


def paste_tail(a, view, hip, front=False, shear=0, flip=False):
    """Pose la queue : son pied (bas de la queue) contre les hanches ; derrière le corps (face,
    profil) ou dessus (dos). `shear` : inclinaison vers l'arrière (px de décalage au sommet)."""
    global TAIL
    if TAIL is None:
        TAIL = logo_tail()
    tail_img = TAIL[:, ::-1] if flip else TAIL
    bx, by = LOGO_TAIL_BASE
    if flip:
        bx = TAIL.shape[1] - 1 - bx
        shear = -shear
    ax, ay = hip
    H, W = a.shape[:2]
    lean = lambda y: -int(round(shear * (by - y) / by)) if y < by else 0
    for y in range(tail_img.shape[0]):
        for x in range(tail_img.shape[1]):
            if not tail_img[y, x, 3]:
                continue
            X, Y = ax + x - bx + lean(y), ay + y - by
            if 0 <= X < W and 0 <= Y < H and (front or a[Y, X, 3] == 0):
                a[Y, X] = tail_img[y, x]
    if front:  # contour entre la queue et le dos
        m = np.zeros((H, W), bool)
        for y, x in zip(*np.where(tail_img[..., 3] > 0)):
            X, Y = ax + x - bx + lean(y), ay + y - by
            if 0 <= X < W and 0 <= Y < H:
                m[Y, X] = True
        ring = ndimage.binary_dilation(m, structure=CROSS) & ~m & (a[..., 3] > 0)
        a[ring] = (0, 0, 0, 255)

def skirt(a, hero, cx, top, bottom):
    """Jupe : remplit et évase le bas du corps, sur la hauteur des jambes."""
    r = hero["skirt"]
    for y in range(top - 1, bottom - 1):
        k = y - (top - 1)
        half = 4 + k // 2
        for x in range(cx - half, cx + half):
            t = "S" if x < cx - half + 2 else ("D" if k == bottom - top - 1 else "s")
            if (x + y) % 2 and t == "S":
                t = "s"
            a[y, x] = (*r[t], 255)


# ------------------------------------------------------------------------------------------------
# Les héros. Rôles des gabarits : h H l = cheveux (base, ombre, reflet), o = contour,
# b = barbe, g = monture de lunettes, w = verre, y = or, r = rouge, s = peau
# ------------------------------------------------------------------------------------------------


def hero_roles(**k):
    return {kk: hexc(v) for kk, v in k.items()}


AUGH = dict(
    keep_tool=("slice",),  # sa hache de lancer : on garde celle du pack
    skin=ramp("#f6c9a0", "#e09a6a", "#b0663f", "#6b3a2a"),
    top=ramp("#4a4462", "#2b2238", "#1a1424", "#0e0b16"),
    shirt=ramp("#d4d6e2", "#a3a6bb", "#787b94", "#4f516a"),
    sleeve=ramp("#4a4462", "#2b2238", "#1a1424", "#0e0b16"),
    belt=ramp("#8a5632", "#553521", "#2e1c14", "#1a100b"),
    pants=ramp("#4f78c4", "#2f4f94", "#233673", "#161d3f"),
    shoes=ramp("#ffffff", "#f4ecd8", "#bfc2d4", "#8487a0"),
    eye="#2a1c14",
    roles=hero_roles(h="#8a5632", H="#5c3a21", l="#c08a52", o="#000000", b="#5c3a21"),
    head={
        "Down": [[
            "................",
            "................",
            ".....#..#..#....",
            "....#h#.#h##h#..",
            "...#hlh##hlhhh#.",
            "..#hhhlhhhlhhhh#",
            "..#hhhhhhhhhhhh#",
            "..#HhhhhhhhhhhH#",
            "..#HhHhhhhhhHhH#",
            "..#HhH.hHh..HhH#",
            "..#HH...h....HH#",
            "..#H..........H#",
            "................",
            "................",
            "................",
            "......obbbbo....",
            "......#bbbb#....",
            ".......#bb#.....",
        ]],
        "Side": [[
            "................",
            "................",
            ".....#..#.#.....",
            "....#h#.#h#h#...",
            "...#hlh##hlhh#..",
            "..#hhhlhhhlhhh#.",
            ".#hhhhhhhhhhhhh#",
            ".#HHhhhhhhhhhhh#",
            ".#HHHhhhhhhhhhh#",
            ".#HHHhhhhhh.hh#.",
            ".#HHHhh.....h#..",
            ".#HHHh..........",
            ".#HHH...........",
            "..#HH...........",
            "...#H.......bb#.",
            "...........bbbb#",
            "...........bbb#.",
            "...........#bb#.",
        ]],
        "Up": [[
            "................",
            "................",
            ".....#..#..#....",
            "....#h#.#h##h#..",
            "...#hlh##hlhhh#.",
            "..#hhhlhhhlhhhh#",
            "..#hhhhhhhhhhhh#",
            "..#hhhhhhhhhhhh#",
            "..#HhhhhhhhhhhH#",
            "..#HhhhhhhhhhhH#",
            "..#HHhhhhhhhhHH#",
            "..#HHHhhhhhhHHH#",
            "..#HHHHhhhhHHHH#",
            "..#HHHHHHHHHHHH#",
            "...#HHHHHHHHHH#.",
            "....#HHHHHHHH#..",
            "................",
            "................",
        ]],
    },
)

AKA = dict(
    # Homme-écureuil : la queue est celle de l'écureuil du logo du site, pixel pour pixel ;
    # cheveux et oreilles dans la même rampe rousse ; manteau de mage bleu nuit à liseré doré.
    logo_tail=True,
    tail_shear=5,  # queue inclinée vers l'arrière : la boucle se voit à côté de la grosse tête
    skin=ramp("#ffe4c8", "#f6c9a0", "#d99a6a", "#a3603a"),
    top=ramp("#5a6fc0", "#3a4a94", "#26306a", "#161d3f"),
    shirt=ramp("#fff4dc", "#f0dcb0", "#c8a878", "#8a6a48"),
    sleeve=ramp("#5a6fc0", "#3a4a94", "#26306a", "#161d3f"),
    belt=ramp("#fff0a0", "#f2c43e", "#c4861e", "#6e4410"),
    pants=ramp("#8a5632", "#5c3a21", "#3e2716", "#1a100b"),
    shoes=ramp("#5c3a21", "#3e2716", "#24160d", "#120a06"),
    eye="#2e1408",
    # rampe de l'écureuil du logo
    roles=hero_roles(f="#e47f31", a="#bd5c25", b="#aa5324", c="#8a3f20", d="#efab5c", e="#f09b40",
                     g="#632e17", h="#4a2313"),
    head={
        "Down": [[
            "................",
            "...#.......#....",
            "..#c#.....#c#...",
            "..#ec#...#ce#...",
            "..#effffffffe#..",
            "..#ffdfffdfff#..",
            "..#ffffffffff#..",
            "..#ffffffffff#..",
            "..#affffffffa#..",
            "..#aa.f..f.aa#..",
            "..#a........a#..",
        ]],
        "Side": [[
            "................",
            "....#..#........",
            "...#c##c#.......",
            "...#ec#ec#......",
            "...#effeff####..",
            "..#ffdfffdffff#.",
            ".#fffffffffffff#",
            ".#affffffffffff#",
            ".#aafffffffffff#",
            ".#aaaffffff.ff#.",
            ".#aaaff.....f...",
            ".#aaaaaa#.......",
            "..#aaaa#........",
            "...#aa#.........",
            "....##..........",
        ]],
        "Up": [[
            "................",
            "...#.......#....",
            "..#c#.....#c#...",
            "..#ec#...#ce#...",
            "..#effffffffe#..",
            "..#ffdfffdfff#..",
            "..#ffffffffff#..",
            "..#ffffffffff#..",
            "..#affffffffa#..",
            "..#aaffffffaa#..",
            "..#aaaffffaaa#..",
            "..#aaaaaaaaaa#..",
            "..#caaaaaaaac#..",
            "..#ccaaaaaacc#..",
            "...#ccaaaacc#...",
            "....#cccccc#....",
        ]],
    },
)

GORAK = dict(
    skin=ramp("#d99a6a", "#b0663f", "#7a4128", "#4a2418"),
    top=ramp("#f47a5a", "#d03c3a", "#83202c", "#3e1020"),
    sleeve=None,  # bras nus
    belt=ramp("#8a5632", "#553521", "#2e1c14", "#1a100b"),
    pants=ramp("#d03c3a", "#83202c", "#5a1420", "#3e1020"),
    shoes=ramp("#8a5632", "#553521", "#2e1c14", "#1a100b"),
    eye="#1a1424",
    roles=hero_roles(h="#1a1424", H="#0e0b16", l="#3a3850", o="#000000", b="#1a1424", r="#d03c3a", R="#83202c"),
    head={
        "Down": [[
            ".....#####......",
            "....#hlhhh#.....",
            "....#hhhhh#.....",
            ".....#hhh#......",
            "....#hhhhhh#....",
            "...#hhhlhhhhh#..",
            "..#hhhhhhhhhhh#.",
            "..#Hhhhhhhhhhh#.",
            "..#rrrrrrrrrrr#.",
            "..#RRRRRRRRRRR#.",
            "..#H.........H#.",
            "................",
            "................",
            "................",
            "................",
            "....#bbbbbbbb#..",
            "....#b......b#..",
            "................",
        ]],
        "Side": [[
            "..#####.........",
            ".#hlhhh#........",
            ".#hhhhh#........",
            "..#hhh#.........",
            "...#hhhhhh#.....",
            "..#hhhlhhhhh#...",
            ".#hhhhhhhhhhhh#.",
            ".#HHhhhhhhhhhh#.",
            ".#rrrrrrrrrrrr#.",
            ".#RRRRRRRRRRRR#.",
            ".#HHH...........",
            ".#HH............",
            "..#H............",
            "................",
            "............bbb#",
            "...........b..b#",
            "................",
            "................",
        ]],
        "Up": [[
            ".....#####......",
            "....#hlhhh#.....",
            "....#hhhhh#.....",
            ".....#hhh#......",
            "....#hhhhhh#....",
            "...#hhhlhhhhh#..",
            "..#hhhhhhhhhhh#.",
            "..#hhhhhhhhhhh#.",
            "..#rrrrrrrrrrr#.",
            "..#RRRRRRRRRRR#.",
            "..#HHHHHHHHHHH#.",
            "..#HHHHHHHHHHH#.",
            "..#HHHHHHHHHHH#.",
            "..#HHHHHHHHHHH#.",
            "...#HHHHHHHHH#..",
            "....#########...",
            "................",
            "................",
        ]],
    },
)

NYRA = dict(
    skin=ramp("#f2bd8e", "#d6915e", "#a3603a", "#6b3a2a"),
    top=ramp("#3a3850", "#1a1424", "#0e0b16", "#000000"),
    shirt=ramp("#a8def2", "#58a2e0", "#3466b4", "#233673"),
    sleeve=ramp("#3a3850", "#1a1424", "#0e0b16", "#000000"),
    belt=ramp("#58a2e0", "#3466b4", "#233673", "#161d3f"),
    pants=ramp("#4a4462", "#2b2238", "#1a1424", "#0e0b16"),
    shoes=ramp("#3a3850", "#1a1424", "#0e0b16", "#000000"),
    eye="#233673",
    roles=hero_roles(h="#233673", H="#161d3f", l="#3466b4", o="#000000", x="#a8def2"),
    head={
        "Down": [[
            "................",
            "................",
            "................",
            "......####......",
            "....##hhlh##....",
            "...#hhhhhhhlh#..",
            "..#hhxhhhhhhhh#.",
            "..#hhhhhhhhxhh#.",
            "..#HhhhhhhhhhhH#",
            "..#Hhh.hhhh.hhH#",
            ".#HHh.......hHH#",
            ".#HH........xHH#",
            ".#HH.........HH#",
            ".#HH.........HH#",
            ".#xH.........HH#",
            ".#HH#.......#HH#",
            ".#HHH#.....#HxH#",
            ".#HHH#.....#HHH#",
        ]],
        "Side": [[
            "................",
            "................",
            "................",
            ".....####.......",
            "...##hhlh##.....",
            "..#hhhhhhhhh#...",
            ".#hhxhhhhhhhh#..",
            ".#hhhhhhhhhhhh#.",
            ".#HHhhhhhhhhhh#.",
            ".#HHHhhhhhhh.h#.",
            ".#HxHhh......h#.",
            ".#HHHh..........",
            ".#HHH...........",
            ".#HHH...........",
            ".#HHxH..........",
            ".#HHHH#.........",
            ".#HHHH#.........",
            ".#HxHH#.........",
        ]],
        "Up": [[
            "................",
            "................",
            "................",
            "......####......",
            "....##hhlh##....",
            "...#hhhhhhhlh#..",
            "..#hhxhhhhhhhh#.",
            "..#hhhhhhhhxhh#.",
            "..#hhhhhhhhhhhh#",
            "..#HhhhhhhhhhhH#",
            ".#HHhhhhhxhhhHH#",
            ".#HHHhhhhhhhHHH#",
            ".#HHHHhhhhhHHHH#",
            ".#HxHHHHHHHHHHH#",
            ".#HHHHHHHHHHHxH#",
            ".#HHHHHHHHHHHHH#",
            ".#HHHHHxHHHHHHH#",
            ".#HHHHHHHHHHHHH#",
        ]],
    },
)

RALYA = dict(
    skin=ramp("#fff0e0", "#f6c9a0", "#e09a6a", "#b0663f"),
    top=ramp("#f9a0a0", "#e0566a", "#a8304a", "#6e1a30"),
    sleeve=ramp("#f9a0a0", "#e0566a", "#a8304a", "#6e1a30"),
    belt=ramp("#fff0a0", "#f2c43e", "#c4861e", "#6e4410"),
    pants=ramp("#f9a0a0", "#e0566a", "#a8304a", "#6e1a30"),
    shoes=ramp("#e0566a", "#a8304a", "#6e1a30", "#3e1020"),
    skirt=ramp("#f9a0a0", "#e0566a", "#a8304a", "#6e1a30"),
    sleeve_len=3,
    eye="#2a1c14",
    roles=hero_roles(h="#553521", H="#2e1c14", l="#8a5632", o="#000000", y="#f2c43e", Y="#c4861e", r="#d03c3a"),
    head={
        "Down": [[
            "................",
            "......#.#.......",
            ".....#y#y#......",
            "....#yyryyy#....",
            "....#YYYYYY#....",
            "...#hhhlhhhh#...",
            "..#hhhhhhhlhh#..",
            "..#hhhhhhhhhhh#.",
            "..#Hhhhhhhhhhh#.",
            ".#HHhh.hhhh.hHH#",
            ".#HHh........HH#",
            ".#HH.........HH#",
            ".#HH.........HH#",
            ".#HH.........HH#",
            ".#HH.........HH#",
            ".#HH#.......#HH#",
            ".#HHH#.....#HHH#",
            ".#HHH#.....#HHH#",
        ]],
        "Side": [[
            "................",
            ".......#.#......",
            "......#y#y#.....",
            ".....#yyryy#....",
            ".....#YYYYY#....",
            "...#hhhlhhhh#...",
            "..#hhhhhhhhhh#..",
            ".#hhhhhhhhhhhh#.",
            ".#HHhhhhhhhhhh#.",
            ".#HHHhhhhhhh.h#.",
            ".#HHHhh......h#.",
            ".#HHHh..........",
            ".#HHH...........",
            ".#HHH...........",
            ".#HHHH..........",
            ".#HHHH#.........",
            ".#HHHH#.........",
            ".#HHHH#.........",
        ]],
        "Up": [[
            "................",
            "......#.#.......",
            ".....#y#y#......",
            "....#yyyyyy#....",
            "....#YYYYYY#....",
            "...#hhhlhhhh#...",
            "..#hhhhhhhlhh#..",
            "..#hhhhhhhhhhh#.",
            "..#hhhhhhhhhhhh#",
            "..#HhhhhhhhhhhH#",
            ".#HHhhhhhhhhhHH#",
            ".#HHHhhhhhhhHHH#",
            ".#HHHHhhhhhHHHH#",
            ".#HHHHHHHHHHHHH#",
            ".#HHHHHHHHHHHHH#",
            ".#HHHHHHHHHHHHH#",
            ".#HHHHHHHHHHHHH#",
            ".#HHHHHHHHHHHHH#",
        ]],
    },
)

HEROES = {"augh": AUGH, "aka": AKA, "gorak": GORAK, "nyra": NYRA, "ralya": RALYA}

# Animations du corps de base reprises : nom dans le jeu -> dossier Pixel Crawler
ANIMS = {
    "idle": "Idle_Base/Idle",
    "walk": "Walk_Base/Walk",
    "run": "Run_Base/Run",
    "hit": "Hit_Base/Hit",
    "slice": "Slice_Base/Slice",
    "pierce": "Pierce_Base/Pierce",
    "crush": "Crush_Base/Crush",
    "collect": "Collect_Base/Collect",
}
VIEWS = {"Down": "Down", "Side": "Side", "Up": "Up"}


def load_frames(base, anim, view):
    d = os.path.join(base, "Entities/Characters/Body_A/Animations")
    folder, prefix = anim.split("/")
    names = [f"{prefix}_{view}-Sheet.png"] + ([f"{prefix}_Top-Sheet.png"] if view == "Up" else [])
    for n in names:
        p = os.path.join(d, folder, n)
        if os.path.exists(p):
            im = Image.open(p).convert("RGBA")
            return [im.crop((k * 64, 0, k * 64 + 64, 64)) for k in range(im.width // 64)]
    return []


# --- planche « jeu » : 4 directions (ouest = miroir de l'est), images ×2 dans des cases de 80×96 ---
GAME_ANIMS = ["idle", "walk", "run", "hit", "slice", "pierce", "crush", "collect", "death"]
GAME_DIRS = [("south", "Down", False), ("east", "Side", False), ("north", "Up", False), ("west", "Side", True)]
CELL_W, CELL_H = 80, 96
CROP = (12, 0, 52, 48)  # zone utile d'une image 64×64 du pack (art px), agrandie ×2


def dissolve(img, t, seed):
    a = np.array(img).copy()
    rnd = np.random.RandomState(seed)
    b4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16
    H, W = a.shape[:2]
    thr = np.tile(b4, (H // 4 + 1, W // 4 + 1))[:H, :W] * 0.7 + rnd.rand(H, W) * 0.3
    a[(a[..., 3] > 0) & (thr < t)] = 0
    return Image.fromarray(a)


def export_game_sheet(dressed, out_path):
    rows = []
    for anim in GAME_ANIMS:
        for _, view, flip in GAME_DIRS:
            if anim == "death":
                base = dressed.get(("idle", view), [None])[0]
                frames = [dissolve(base, k / 6, k) for k in range(7)] if base is not None else []
            else:
                frames = dressed.get((anim, view), [])
            cells = []
            for f in frames:
                c = f.crop(CROP).resize((CELL_W, CELL_H), Image.NEAREST)
                cells.append(c.transpose(Image.FLIP_LEFT_RIGHT) if flip else c)
            rows.append(cells)
    sheet = Image.new("RGBA", (8 * CELL_W, len(rows) * CELL_H))
    for j, r in enumerate(rows):
        for i, c in enumerate(r[:8]):
            sheet.alpha_composite(c, (i * CELL_W, j * CELL_H))
    sheet.save(out_path)
    return [len(r) for r in rows]


def build(base, out_dir, names=None):
    os.makedirs(out_dir, exist_ok=True)
    report = {}
    for name in names or HEROES:
        hero = dict(HEROES[name])
        if hero.get("sleeve") is None:
            hero["sleeve"] = hero["skin"]
        rows, labels, all_dressed = [], [], {}
        for anim, src in ANIMS.items():
            for view in VIEWS:
                frames = load_frames(base, src, view)
                if not frames:
                    continue
                keep = anim in hero.get("keep_tool", ())
                dressed = [dress_frame(f, hero, view, keep, k) for k, f in enumerate(frames)]
                ok = [d for d in dressed if d is not None]
                all_dressed[(anim, view)] = ok
                report.setdefault(name, []).append(f"{anim}_{view.lower()}:{len(ok)}/{len(frames)}")
                if ok:
                    rows.append(ok)
                    labels.append(f"{anim}_{view.lower()}")
        cols = max(len(r) for r in rows)
        sheet = Image.new("RGBA", (cols * 64, len(rows) * 64))
        for j, r in enumerate(rows):
            for i, f in enumerate(r):
                sheet.alpha_composite(f, (i * 64, j * 64))
        sheet.save(os.path.join(out_dir, f"{name}.png"))
        counts = export_game_sheet(all_dressed, os.path.join(out_dir, f"{name}_game.png"))
        report.setdefault(name, []).append("jeu:" + ",".join(map(str, counts)))
        with open(os.path.join(out_dir, f"{name}.txt"), "w") as fh:
            fh.write("\n".join(f"{j}: {l} ({len(r)} images)" for j, (l, r) in enumerate(zip(labels, rows))))
    return report





# ------------------------------------------------------------------------------------------------
# PNJ du village (mêmes gabarits de coiffure que les héros, recolorés)
# ------------------------------------------------------------------------------------------------
def _with(base, **kw):
    d = dict(base)
    d.update(kw)
    return d


NPCS = {
    # Ancienne Mira : longs cheveux blancs, robe verte
    "elder": _with(RALYA, head={v: [[r.replace("y", "h").replace("Y", "h").replace("r", "h") for r in RALYA["head"][v][0]]] for v in RALYA["head"]},
                   skin=ramp("#fff0e0", "#f6c9a0", "#e09a6a", "#b0663f"),
                   top=ramp("#86c24c", "#4f8f3a", "#2f6131", "#1d3d27"), sleeve=ramp("#86c24c", "#4f8f3a", "#2f6131", "#1d3d27"),
                   skirt=ramp("#86c24c", "#4f8f3a", "#2f6131", "#1d3d27"), pants=ramp("#86c24c", "#4f8f3a", "#2f6131", "#1d3d27"),
                   belt=ramp("#e0bd80", "#c08a52", "#8a5632", "#553521"),
                   roles=hero_roles(h="#e8eaf2", H="#a7acc0", l="#ffffff", o="#000000")),
    # Marchand : cheveux bruns, gilet doré, chemise crème
    "merchant": _with(AUGH, keep_tool=(), top=ramp("#f2c43e", "#c4861e", "#8a5a14", "#5a3a0a"), shirt=ramp("#fff4dc", "#f0dcb0", "#c8a878", "#8a6a48"),
                      sleeve=ramp("#fff4dc", "#f0dcb0", "#c8a878", "#8a6a48"), pants=ramp("#8a5632", "#5c3a21", "#3e2716", "#1a100b"),
                      shoes=ramp("#5c3a21", "#3e2716", "#24160d", "#120a06"),
                      roles=hero_roles(h="#553521", H="#2e1c14", l="#8a5632", o="#000000", b="#2e1c14")),
    # Villageois : tunique bleue
    "villager": _with(AUGH, keep_tool=(), head={v: [[r.replace("b", ".") for r in AUGH["head"][v][0]]] for v in AUGH["head"]},
                      top=ramp("#7fb0e8", "#4f78c4", "#2f4f94", "#233673"), shirt=None, sleeve=ramp("#7fb0e8", "#4f78c4", "#2f4f94", "#233673"),
                      pants=ramp("#8a5632", "#5c3a21", "#3e2716", "#1a100b"), shoes=ramp("#5c3a21", "#3e2716", "#24160d", "#120a06"),
                      skin=ramp("#e0a070", "#c07a4a", "#8a4e2e", "#5a2e1a"),
                      roles=hero_roles(h="#2e1c14", H="#1a100b", l="#553521", o="#000000", b="#2e1c14")),
    # Garde : casque d'acier, tunique grise
    "guard": _with(GORAK, top=ramp("#bfc2d4", "#8487a0", "#57586f", "#3a3850"), sleeve=ramp("#bfc2d4", "#8487a0", "#57586f", "#3a3850"),
                   pants=ramp("#57586f", "#3a3850", "#26243a", "#14121f"), skin=ramp("#f6c9a0", "#e09a6a", "#b0663f", "#6b3a2a"),
                   roles=hero_roles(h="#bfc2d4", H="#8487a0", l="#ffffff", o="#000000", b="#553521", r="#d03c3a", R="#83202c")),
}


def build_npcs(base, out_path):
    """Planche des PNJ : une ligne par PNJ (repos de face, 4 images), cases 80×96 (×2)."""
    rows = []
    for name, d in NPCS.items():
        hero = dict(d)
        if hero.get("sleeve") is None:
            hero["sleeve"] = hero["skin"]
        frames = load_frames(base, ANIMS["idle"], "Down")
        dressed = [dress_frame(f, hero, "Down", False, k) for k, f in enumerate(frames)]
        rows.append([f.crop(CROP).resize((CELL_W, CELL_H), Image.NEAREST) for f in dressed if f is not None])
    sheet = Image.new("RGBA", (4 * CELL_W, len(rows) * CELL_H))
    for j, r in enumerate(rows):
        for i, c in enumerate(r[:4]):
            sheet.alpha_composite(c, (i * CELL_W, j * CELL_H))
    sheet.save(out_path)
    return list(NPCS)


if __name__ == "__main__":
    rep = build(sys.argv[1], sys.argv[2], sys.argv[3:] or None)
    for k, v in rep.items():
        print(k, " ".join(v))
    if not sys.argv[3:]:
        print("PNJ :", build_npcs(sys.argv[1], os.path.join(sys.argv[2], "npcs_game.png")))
