"""Héros en 16×32, dessinés à la main (voir pixels.py pour les rôles).

Vue 3/4 face, regard vers la droite (le jeu retourne l'image pour la gauche). Proportions chibi :
grosse tête (≈ 14 px), torse court, jambes courtes, pieds sur la ligne 31.
Un héros = une tête (cheveux + visage) + un buste (tenue) + des jambes (animées).
"""

from pixels import parse

# ------------------------------------------------------------------------------------------------
# Augh — éclaireur, lanceur de haches : cheveux châtains en bataille, bouc, veste sombre ouverte
# sur un t-shirt gris, jean foncé, baskets blanches.
# ------------------------------------------------------------------------------------------------
AUGH_HEAD = """
................
................
.......o..o.....
....o.oho.oho...
...ohoohlohlho..
..ohhlhhhlhhhho.
..oHhhlhhhhlhhho
.oHHhhhhhhhhhhho
.oHHhhhhhhhhhhho
.oHHhhshhhhshsho
.oHHhsssHssssHso
.oHsSsssesssseso
.oHsSsssesssseso
.oHSSsssssssssSo
..oSSssbbbbbbsSo
..oSSssssbbsssSo
...oSSsssbbsSso.
....ooSSssbSoo..
"""

AUGH_BODY = """
......oSSSo.....
...ooccttcccoo..
..occCcttttccko.
.oCcCcctttTcckko
.oCCcCcttttTckko
.oCCcCcttttTckko
.oSCoCcttttcokSo
.oSSoaaaayaaoSSo
..oo.oapppppaoo.
"""

LEGS_IDLE = """
.....oppppppo...
.....oppPoPpo...
.....oppo.opo...
.....oPpo.opPo..
....offfo.offfo.
....oFffo.oFffo.
.....ooo...ooo..
"""

# Marche en 4 temps : appui (jambes écartées), passage, appui inversé, passage.
LEGS_WALK = [
    """
.....oppppppo...
.....oPpppppo...
....oPpo.oppo...
...oPpo...oppo..
..offfo...offfo.
..oFffo...oFffo.
...ooo.....ooo..
""",
    """
.....oppppppo...
.....oPpppppo...
.....oPpooppo...
.....oPpoffffo..
....offfooFffo..
....oFffo.ooo...
.....ooo........
""",
    """
.....oppppppo...
.....opppppPo...
.....oppo.oPpo..
....oppo...oPpo.
...offfo...offfo
...oFffo...oFffo
....ooo.....ooo.
""",
    """
.....oppppppo...
.....opppppPo...
.....oppooPpo...
....offffoPpo...
....oFffoofffo..
.....ooo.oFffo..
..........ooo...
""",
]

AUGH_ROLES = dict(
    h="wood2", H="wood1", l="wood3",
    s="skin2", S="skin1", L="skin3",
    b="wood1", B="wood0",
    c="dusk", C="night", k="stone0",
    t="stone2", T="stone1",
    a="wood1", A="wood0", y="gold2",
    p="blue1", P="blue0",
    f="bone", F="stone2",
)


SHADES = lambda r: [(r[k], r[v]) for k, v in (("H", "h"), ("S", "s"), ("C", "c"), ("P", "p"), ("T", "t"), ("B", "b"), ("F", "f")) if k in r and v in r]


def hero_frame(head, body, roles, legs=LEGS_IDLE, dy=0, blink=None):
    from pixels import soften, stack

    h = parse(head, roles)
    if blink:
        for x, y in blink:
            h.px(x, y, roles["s"])
    img = stack((parse(legs, roles), 0, 25), (parse(body, roles), 0, 16 + dy), (h, 0, dy))
    return soften(img, SHADES(roles))


def augh_idle():
    return hero_frame(AUGH_HEAD, AUGH_BODY, AUGH_ROLES)


def augh_walk():
    return [hero_frame(AUGH_HEAD, AUGH_BODY, AUGH_ROLES, legs=l, dy=(0 if k % 2 else 1) - 1 + 1) for k, l in enumerate(LEGS_WALK)]


# ------------------------------------------------------------------------------------------------
# Aka — mage : grosse afro, lunettes épaisses, barbe fournie, veste bordeaux et chaîne dorée, jean.
# ------------------------------------------------------------------------------------------------
AKA_HEAD = """
....oooooo......
..oohhlhhhhoo...
.ohhlhhhhhlhho..
ohhhhhhhhhhhhho.
ohHhhhhlhhhhhhho
oHHhhhhhhhhhhhho
oHHhhhhhhhhhhhho
oHHhhhhhhhhhhhho
oHHHhhhhhhhhhhho
oHHHhhssssssshho
.oHHhsssssssssso
.oHHSoooosoooo.o
.oHHSowexsowexso
.oHHSoooosooooso
..oHbbsssssbbbo.
..obbbbsmmsbbbo.
...obbbbbbbbbo..
....oobbbbboo...
"""

AKA_BODY = """
......obbbo.....
...oocttyttcoo..
..occCtytyttcko.
.oCcCcttyttcckko
.oCCcCcttttTckko
.oCCcCcttttTckko
.oSCoCcttttcokSo
.oSSoaaaayaaoSSo
..oo.oapppppaoo.
"""

AKA_ROLES = dict(
    h="night", H="ink", l="dusk",
    s="skin1", S="skin0", L="skin2",
    b="night", B="ink", x="blue4",
    c="red1", C="red0", k="red2",
    t="night", T="ink", y="gold2",
    a="wood1", A="wood0",
    p="blue2", P="blue1",
    f="wood1", F="wood0",
)

# ------------------------------------------------------------------------------------------------
# Gorak — guerrier à la massue : chignon noir, bandeau rouge, moustache tombante, bras nus,
# tunique rouge barrée d'une sangle de cuir.
# ------------------------------------------------------------------------------------------------
GORAK_HEAD = """
................
......ooo.......
.....ohlho......
.....oHhho......
...ooohHhoooo...
..ohhhhhhhlhhho.
..oHhhlhhhhhhhho
.oHHhhhhhhhhhhho
.oHHxxxxxxxxxxxo
.oHHhhshhhhshsho
.oHHhsssHssssHso
.oHsSsssesssseso
.oHsSsssesssseso
.oHSSsssssssssSo
..oSSsbbbbbbbsSo
..oSSsbssssbssSo
...oSSsbsssbSso.
....ooSSsssSoo..
"""

GORAK_BODY = """
......oSSSo.....
...oocacccccoo..
..oScccacccccSo.
.oSSoCccaccCoSSo
.oSSoCcccacCoSso
.oSSoCccccaCoSso
.oSSoCcccccCoSSo
.oSSoaaaayaaoSSo
..oo.oapppppaoo.
"""

GORAK_ROLES = dict(
    h="ink", H="ink", l="night",
    s="skin1", S="skin0", L="skin2",
    b="ink", B="ink", x="red2",
    c="red2", C="red1", k="red3",
    a="wood1", A="wood0", y="gold1",
    p="red1", P="red0",
    f="wood1", F="wood0",
)

# ------------------------------------------------------------------------------------------------
# Nyra — lanceuse de chakram : longue chevelure bleu nuit semée d'étoiles, veste noire, haut turquoise.
# ------------------------------------------------------------------------------------------------
NYRA_BACK = """
................
................
................
................
................
................
................
................
................
................
................
................
................
................
oHHo............
oHhHo...........
oHxHo...........
oHHhHo..........
.oHHHo..........
.oHxHo..........
.oHHHo..........
..oHHo..........
...oo...........
"""

NYRA_HEAD = """
................
................
.....oooooo.....
...oohhlhlhoo...
..ohhhhllhhhho..
.ohhxhhhhhhhhho.
.ohHhhhhhhhxhhho
ohHHhhhhhhhhhhho
ohHHhhhhhhhhhhho
ohHHhhhhhhhshhho
ohHHhhssssssssho
oHHhSsseessseeso
oHHhSssessssesso
oHxHSsssssssssSo
.oHHSssssssssSo.
.oHHoSsssmmsSso.
..ooooSSssssoo..
......ooSSoo....
"""

NYRA_BODY = """
......oSSSo.....
...oocttttccoo..
..occCtttttccko.
.oCcCctTtttcckko
.oCCcCcttttTckko
.oCCcCaaaaaackko
.oSCoCcccccCokSo
.oSSoCcccccCoSSo
..oo.oapppppaoo.
"""

NYRA_ROLES = dict(
    h="blue1", H="blue0", l="blue2", x="blue4",
    s="skin2", S="skin1", L="skin3",
    c="night", C="ink", k="dusk",
    t="blue3", T="blue2",
    a="blue2", A="blue1", y="gold2",
    p="dusk", P="night",
    f="night", F="ink",
)

# ------------------------------------------------------------------------------------------------
# Ralya — princesse au sceptre : longs cheveux bruns, diadème doré, robe rose à jupe ample.
# ------------------------------------------------------------------------------------------------
RALYA_BACK = """
................
................
................
................
................
................
................
................
................
................
................
................
................
................
oHHo............
oHhHo...........
oHhHo...........
oHHhHo..........
.oHHHo..........
.oHhHo..........
.oHHHHo.........
..oHHHo.........
...ooo..........
"""

RALYA_HEAD = """
.......o........
......oyo.......
....ooyxyoo.....
...ohyyyyyhoo...
..ohhhlhlhhhho..
.ohhhhhhhhhhhho.
.ohHhhhhhhhhhhho
ohHHhhhhhhhhhhho
ohHHhhhhhhhhhhho
ohHHhhhhhhhshhho
ohHHhhssssssssho
oHHhSsseessseeso
oHHhSssessssesso
oHHHSsssssssssSo
.oHHSsLsssssLSo.
.oHHoSsssmmsSso.
..ooooSSssssoo..
......ooSSoo....
"""

RALYA_BODY = """
......oSSSo.....
...oocctttccoo..
..occCcttttccko.
.oCcCccttTtcckko
.oCCcCcctttcckko
.oSCoyyyyyyyokSo
.oSSoCcccccCoSSo
..oCcCcccccCcko.
..oCCcCcccccCcko
"""

SKIRT = """
..oCCcCcccccCcko
..oCCcCccccccCko
.oCCcCcCccccccko
.oCCCcCcCcccccko
.oooooooooooooo.
...offo...offo..
....oo.....oo...
"""

SKIRT_WALK = [
    SKIRT,
    """
..oCCcCcccccCcko
..oCCcCccccccCko
.oCCcCcCccccccko
.oCCCcCcCcccccko
.oooooooooooooo.
.....offo.......
......oo........
""",
    """
..oCCcCcccccCcko
..oCCcCccccccCko
.oCCcCcCccccccko
.oCCCcCcCcccccko
.oooooooooooooo.
..offo.....offo.
...oo.......oo..
""",
    """
..oCCcCcccccCcko
..oCCcCccccccCko
.oCCcCcCccccccko
.oCCCcCcCcccccko
.oooooooooooooo.
.........offo...
..........oo....
""",
]

RALYA_ROLES = dict(
    h="wood0", H="ink", l="wood1", x="red2",
    s="skin3", S="skin2", L="red3",
    c="red2", C="red1", k="red3",
    t="red3", T="red2",
    a="gold2", A="gold1", y="gold2",
    p="red2", P="red1",
    f="red1", F="red0",
)


HEROES = {
    "augh": dict(head=AUGH_HEAD, body=AUGH_BODY, roles=AUGH_ROLES),
    "aka": dict(head=AKA_HEAD, body=AKA_BODY, roles=AKA_ROLES),
    "gorak": dict(head=GORAK_HEAD, body=GORAK_BODY, roles=GORAK_ROLES),
    "nyra": dict(head=NYRA_HEAD, body=NYRA_BODY, roles=NYRA_ROLES, back=NYRA_BACK),
    "ralya": dict(head=RALYA_HEAD, body=RALYA_BODY, roles=RALYA_ROLES, back=RALYA_BACK, legs=SKIRT, walk=SKIRT_WALK),
}


def frame(name, legs=None, dy=0, blink=False):
    from pixels import soften, stack

    d = HEROES[name]
    r = d["roles"]
    parts = []
    if d.get("back"):
        parts.append((parse(d["back"], r), 0, dy))
    parts.append((parse(legs or d.get("legs", LEGS_IDLE), r), 0, 25))
    parts.append((parse(d["body"], r), 0, 16 + dy))
    head = parse(d["head"], r)
    if blink:  # paupières : la ligne haute des yeux devient peau
        for x in range(16):
            if head.get(x, 11) == head.get(x, 12) and head.get(x, 11) == 1 + list(__import__("palette").COLORS).index("ink"):
                head.px(x, 11, r["s"])
    parts.append((head, 0, dy))
    img = stack(*parts)
    return soften(img, SHADES(r))


def walk(name):
    d = HEROES[name]
    legs = d.get("walk", LEGS_WALK)
    return [frame(name, legs=l, dy=1 if k % 2 == 0 else 0) for k, l in enumerate(legs)]


def lineup():
    return [frame(n) for n in HEROES]
