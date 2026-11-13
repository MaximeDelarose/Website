"""Source de vérité de l'arène 01 : chemin, emplacements de tourelles, décor.
Le script génère un JSON lu par l'outil d'éditeur Unity et utilisé pour peindre le sol,
ce qui garantit que le chemin visible = le chemin suivi par les ennemis."""
import math, random, json

PPU = 32                      # pixels par unité monde (identique pour tout le projet)
ARENA_W, ARENA_H = 36, 20     # unités monde (x: -18..18, z: -10..10)
PATH_HALF_WIDTH = 1.1

CONTROL = [(-16.2, 6.2), (-12.5, 6.6), (-8.5, 4.2), (-8.2, 0.2), (-10.5, -3.8), (-6.5, -7.0),
           (-1.8, -5.6), (0.2, -1.5), (-0.8, 3.2), (3.2, 6.6), (8.0, 5.2), (9.0, 0.8),
           (7.2, -3.0), (10.5, -6.6), (14.4, -4.6), (15.4, -0.6)]
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
TALL = {'tree_dead': (3.0, 1.0), 'tree_teal': (3.0, 1.0), 'ruin_pillar': (2.6, 0.7), 'ruin_arch': (2.9, 1.6), 'crystal': (1.9, 0.7)}


def dist_to_path(p, path):
    return min(math.dist(p, q) for q in path)


def build():
    path = catmull([tuple(c) for c in CONTROL], 0.5)
    rng = random.Random(1337)

    # --- emplacements de tourelles : glouton sur la couverture du chemin ---
    RANGE = 5.5
    cands = []
    for ix in range(-32, 33):
        for iz in range(-17, 18):
            p = (ix * 0.5, iz * 0.5)
            d = dist_to_path(p, path)
            if 2.5 <= d <= 3.8 and math.dist(p, HEART) > 3.2 and math.dist(p, SPAWN) > 3.2 and abs(p[0]) < 16.4 and abs(p[1]) < 8.8:
                cands.append(p)
    covered = set()
    slots = []
    for _ in range(12):
        best, bs = None, -1
        for p in cands:
            if any(math.dist(p, s) < 4.2 for s in slots):
                continue
            cov = {i for i, q in enumerate(path) if math.dist(p, q) <= RANGE} - covered
            if len(cov) > bs:
                best, bs = p, len(cov)
        if best is None:
            break
        slots.append(best)
        covered |= {i for i, q in enumerate(path) if math.dist(best, q) <= RANGE}

    # --- décor ---
    kinds = [('tree_dead', 16), ('tree_teal', 14), ('rock', 16), ('rock_small', 12), ('crystal', 9),
             ('mushroom', 12), ('ruin_pillar', 7), ('ruin_arch', 3), ('bones', 7)]
    pool = [k for k, n in kinds for _ in range(n)]
    decor = []
    tries = 0
    while len(decor) < 96 and tries < 6000:
        tries += 1
        p = (rng.uniform(-17.4, 17.4), rng.uniform(-9.4, 9.4))
        k = rng.choice(pool)
        need = {'tree_dead': 2.6, 'tree_teal': 2.6, 'ruin_arch': 3.2, 'ruin_pillar': 2.4, 'crystal': 2.3}.get(k, 2.0)
        if dist_to_path(p, path) < need: continue
        if any(math.dist(p, s) < 2.0 for s in slots): continue
        h, w = TALL.get(k, (0, 0))
        if h:   # un sprite haut masque ce qui est DERRIÈRE lui (z plus grand) en vue 3/4 : on garde chemin et plaques dégagés
            if any(0.0 < q[1] - p[1] < h and abs(q[0] - p[0]) < w + PATH_HALF_WIDTH for q in path): continue
            if any(-0.5 < s[1] - p[1] < h + 0.6 and abs(s[0] - p[0]) < w + 1.2 for s in slots): continue
        if math.dist(p, HEART) < 3.4 or math.dist(p, SPAWN) < 3.2: continue
        if any(math.dist(p, (d['x'], d['z'])) < 1.5 for d in decor): continue
        decor.append({'kind': k, 'x': round(p[0], 2), 'z': round(p[1], 2), 'flip': rng.random() < 0.5})
    # torches : le long du chemin, des deux côtés du Cœur et du portail
    for base in (HEART, SPAWN):
        for sx in (-1, 1):
            for sz in (-1, 1):
                p = (base[0] + sx * 2.6, base[1] + sz * 2.4)
                if abs(p[0]) < 17.5 and abs(p[1]) < 9.6 and dist_to_path(p, path) > 1.9 and all(math.dist(p, s) >= 2.0 for s in slots):
                    decor.append({'kind': 'brazier', 'x': round(p[0], 2), 'z': round(p[1], 2), 'flip': False})
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
