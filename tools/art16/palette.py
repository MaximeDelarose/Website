"""Palette « Aether 16 » : couleurs nommées, rampes d'ombrage et motifs de tramage.

Toute l'image du jeu (sprites, tuiles, objets) n'utilise que ces couleurs. Les dégradés et les
ombres se font par tramage (dithering) entre deux couleurs voisines d'une même rampe, jamais par
des couleurs intermédiaires.
"""

# Couleurs : nom -> hex. L'ordre définit l'index (0 = transparent).
COLORS = {
    # Contours et noirs (légèrement violets, ambiance nocturne des survivor-likes)
    "ink": "#0e0b16",
    "night": "#1a1424",
    "dusk": "#2b2238",
    # Gris / pierre
    "stone0": "#3a3850",
    "stone1": "#57586f",
    "stone2": "#8487a0",
    "stone3": "#bfc2d4",
    # Crème / blanc
    "bone": "#f4ecd8",
    "white": "#fffdf4",
    # Peau
    "skin0": "#6b3a2a",
    "skin1": "#b0663f",
    "skin2": "#e09a6a",
    "skin3": "#f6c9a0",
    # Bois / terre / cuir
    "wood0": "#2e1c14",
    "wood1": "#553521",
    "wood2": "#8a5632",
    "wood3": "#c08a52",
    "sand": "#e0bd80",
    # Verts (herbe, feuillage)
    "leaf0": "#11251b",
    "leaf1": "#1d3d27",
    "leaf2": "#2f6131",
    "leaf3": "#4f8f3a",
    "leaf4": "#86c24c",
    "leaf5": "#c8e27a",
    # Bleus (eau, glace, tissu)
    "blue0": "#161d3f",
    "blue1": "#233673",
    "blue2": "#3466b4",
    "blue3": "#58a2e0",
    "blue4": "#a8def2",
    # Rouges (sang, feu, tissu)
    "red0": "#3e1020",
    "red1": "#83202c",
    "red2": "#d03c3a",
    "red3": "#f47a5a",
    # Or / feu clair
    "gold0": "#6e4410",
    "gold1": "#c4861e",
    "gold2": "#f2c43e",
    "gold3": "#fff0a0",
    # Violets (corruption, arcane)
    "violet0": "#2c1442",
    "violet1": "#5a2783",
    "violet2": "#9a4fc8",
    "violet3": "#d79af0",
}

NAMES = ["_"] + list(COLORS)
INDEX = {n: i for i, n in enumerate(NAMES)}


def rgba(name_or_index):
    i = name_or_index if isinstance(name_or_index, int) else INDEX[name_or_index]
    if i == 0:
        return (0, 0, 0, 0)
    h = COLORS[NAMES[i]]
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255)


# Rampes (du plus sombre au plus clair) utilisées pour ombrer.
RAMPS = {
    "stone": ["ink", "stone0", "stone1", "stone2", "stone3", "bone"],
    "skin": ["skin0", "skin1", "skin2", "skin3"],
    "wood": ["wood0", "wood1", "wood2", "wood3", "sand"],
    "leaf": ["leaf0", "leaf1", "leaf2", "leaf3", "leaf4", "leaf5"],
    "blue": ["blue0", "blue1", "blue2", "blue3", "blue4", "white"],
    "red": ["red0", "red1", "red2", "red3", "gold3"],
    "gold": ["gold0", "gold1", "gold2", "gold3", "white"],
    "violet": ["violet0", "violet1", "violet2", "violet3", "white"],
    "night": ["ink", "night", "dusk", "stone0"],
}

# Matrice de Bayer 4×4 (seuils 0..15) : le tramage ordonné classique.
BAYER4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]


def bayer(x, y):
    """Seuil de Bayer dans [0, 1) pour le pixel (x, y)."""
    return (BAYER4[y & 3][x & 3] + 0.5) / 16


def checker(x, y):
    return (x + y) & 1 == 0
