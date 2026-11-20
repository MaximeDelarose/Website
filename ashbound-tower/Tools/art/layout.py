"""Source de vérité de l'arène 01 : chemin, emplacements de tourelles, décor.
Le script génère un JSON lu par l'outil d'éditeur Unity et utilisé pour peindre le sol,
ce qui garantit que le chemin visible = le chemin suivi par les ennemis."""
import math, random, json

PPU = 32                      # pixels par unité monde (identique pour tout le projet)
ARENA_W, ARENA_H = 60, 34     # unités monde (x: -30..30, z: -17..17) — ~2,8x la surface de la v1 (36x20)
PATH_HALF_WIDTH = 1.15
MIN_SLOTS = 50                # cible : >= 43 constructions (30 T1 + 10 T2 + 3 T3) + marge

CONTROL = [(-28.0, 11.0), (-21.0, 12.8), (-14.0, 13.8), (-9.0, 10.0), (-9.4, 4.6), (-15.0, 1.6), (-22.0, -1.0), (-25.2, -7.0),
           (-19.0, -12.6), (-11.0, -13.6), (-5.2, -10.0), (-4.0, -3.6), (-0.4, 1.6), (5.6, 4.0), (11.0, 8.2), (16.6, 13.2),
           (22.4, 12.0), (25.2, 6.6), (21.0, 0.8), (14.0, -2.6), (11.2, -8.4), (15.2, -13.2), (22.0, -12.6), (26.6, -8.0)]
SPAWN = CONTROL[0]
HEART = CONTROL[-1]


def catmull(pts, step=0.5):
    p = [pts[0]] + pts + [pts[-1]]
    dense = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        n = 40
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            z = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            dense.append((x, z))
    dense.append(pts[-1])
    # rééchantillonnage à pas constant
    out = [dense[0]]
    acc = 0.0
    for a, b in zip(dense, dense[1:]):
        seg = math.dist(a, b)
        while acc + seg >= step:
            t = (step - acc) / seg
            a = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            out.append(a)
            seg = math.dist(a, b)
            acc = 0.0
        acc += seg
    if math.dist(out[-1], dense[-1]) > 0.05:
        out.append(dense[-1])
    return out


# (hauteur, demi-largeur) en unités monde des sprites hauts
TALL = {'pine_m': (1.9, 0.6), 'pine_s': (1.4, 0.5), 'pine_d': (1.6, 0.5), 'ruin_a': (1.6, 0.9), 'ruin_b': (1.2, 0.7), 'crystal': (1.9, 0.7), 'tree_dead': (2.8, 0.9), 'tree_teal': (2.8, 0.9), 'ruin_pillar': (2.5, 0.7), 'ruin_arch': (2.8, 1.6)}


def dist_to_path(p, path):
    return min(math.dist(p, q) for q in path)


def build():
    path = catmull([tuple(c) for c in CONTROL], 0.5)
    rng = random.Random(4242)

    # --- emplacements de tourelles : couverture du chemin, puis grappes près des virages ---
    RANGE = 6.0
    # virages = points où le cap change de plus de ~55° sur ±3 unités
    corners = []
    k = 6
    for i in range(k, len(path) - k):
        a0 = math.atan2(path[i][1] - path[i - k][1], path[i][0] - path[i - k][0]); a1 = math.atan2(path[i + k][1] - path[i][1], path[i + k][0] - path[i][0])
        d = abs((a1 - a0 + math.pi) % (2 * math.pi) - math.pi)
        if d > math.radians(55): corners.append(path[i])
    def near_corner(p): return any(math.dist(p, c) < 6.5 for c in corners)
    cands = []
    for ix in range(-58, 59):
        for iz in range(-31, 32):
            p = (ix * 0.5, iz * 0.5)
            d = dist_to_path(p, path)
            if 2.6 <= d <= 4.6 and math.dist(p, HEART) > 4.0 and math.dist(p, SPAWN) > 4.0 and abs(p[0]) < 28.4 and abs(p[1]) < 15.4:
                cands.append(p)
    covered = set(); slots = []
    def pick(n, spacing, bonus):
        nonlocal covered
        for _ in range(n):
            best, bs = None, -1
            for p in cands:
                if any(math.dist(p, s) < spacing for s in slots): continue
                cov = len({i for i, q in enumerate(path) if math.dist(p, q) <= RANGE} - covered)
                sc = cov + (bonus if near_corner(p) else 0) + rng.random() * .5
                if sc > bs: best, bs = p, sc
            if best is None: break
            slots.append(best); covered = covered | {i for i, q in enumerate(path) if math.dist(best, q) <= RANGE}
    pick(34, 4.4, 14)       # répartition sur toute la carte
    pick(MIN_SLOTS + 6 - len(slots), 2.8, 30)   # grappes serrées (synergies), surtout aux virages

    # --- décor ---
    kinds = [('pine_s', 120), ('pine_m', 90), ('pine_d', 40), ('tree_dead', 20), ('tree_teal', 18), ('ruin_a', 26), ('ruin_b', 30), ('ruin_pillar', 14), ('ruin_arch', 5),
             ('rock', 26), ('rock_small', 46), ('crystal', 24), ('bush', 70), ('fern', 80), ('bones', 16), ('grave', 12), ('sparkle', 60)]
    pool = [k for k, n in kinds for _ in range(n)]
    decor = []
    tries = 0
    HX, HZ = ARENA_W / 2 - .6, ARENA_H / 2 - .6
    while len(decor) < 520 and tries < 40000:
        tries += 1
        p = (rng.uniform(-HX, HX), rng.uniform(-HZ, HZ))
        k = rng.choice(pool)
        need = {'pine_m': 2.0, 'pine_s': 1.8, 'pine_d': 1.9, 'ruin_a': 2.4, 'ruin_b': 2.2, 'crystal': 2.0, 'sparkle': 1.6, 'tree_dead': 2.4, 'tree_teal': 2.4, 'ruin_pillar': 2.2, 'ruin_arch': 3.0, 'bush': 1.7, 'fern': 1.5, 'bones': 1.6, 'grave': 1.8}.get(k, 1.8)
        if dist_to_path(p, path) < need: continue
        if any(math.dist(p, s) < 2.2 for s in slots): continue
        h, w = TALL.get(k, (0, 0))
        if h:   # un sprite haut masque ce qui est DERRIÈRE lui (z plus grand) en vue 3/4 : on garde chemin et plaques dégagés
            if any(0.0 < q[1] - p[1] < h and abs(q[0] - p[0]) < w + PATH_HALF_WIDTH for q in path): continue
            if any(-0.5 < s[1] - p[1] < h + 0.6 and abs(s[0] - p[0]) < w + 1.2 for s in slots): continue
        if math.dist(p, HEART) < 4.0 or math.dist(p, SPAWN) < 3.4: continue
        gap = 0.9 if k in ('sparkle', 'fern') else 1.1 if k.startswith('pine') or k == 'bush' else 2.0
        if any(math.dist(p, (d['x'], d['z'])) < gap for d in decor): continue
        decor.append({'kind': k, 'x': round(p[0], 2), 'z': round(p[1], 2), 'flip': rng.random() < 0.5})
    # portail d'apparition (sprite) juste derrière le point d'entrée
    decor.append({'kind': 'gate', 'x': round(SPAWN[0] + 0.1, 2), 'z': round(SPAWN[1] + 1.5, 2), 'flip': False})
    return {
        'ppu': PPU, 'width': ARENA_W, 'height': ARENA_H, 'pathHalfWidth': PATH_HALF_WIDTH,
        'spawn': {'x': SPAWN[0], 'z': SPAWN[1]}, 'heart': {'x': HEART[0], 'z': HEART[1]},
        'path': [{'x': round(x, 3), 'z': round(z, 3)} for x, z in path],
        'slots': [{'x': x, 'z': z} for x, z in slots],
        'decor': decor,
    }


if __name__ == '__main__':
    L = build()
    length = sum(math.dist((a['x'], a['z']), (b['x'], b['z'])) for a, b in zip(L['path'], L['path'][1:]))
    print('path pts', len(L['path']), 'length', round(length, 1), 'slots', len(L['slots']), 'decor', len(L['decor']))
    P = [(p['x'], p['z']) for p in L['path']]
    # contrôle : deux portions non voisines du chemin ne doivent pas se rapprocher de moins de 5 unités
    worst = min(math.dist(P[i], P[j]) for i in range(0, len(P), 2) for j in range(i + 24, len(P), 2))
    print('distance min entre portions non voisines', round(worst, 2))
    print('couverture : emplacements à portée 5.5 du chemin', sum(1 for s in L['slots'] if min(math.dist((s['x'], s['z']), q) for q in P) <= 5.5), '/', len(L['slots']))
