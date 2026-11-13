"""Simulation d'équilibrage HORS Unity (reproduit les règles de Tower.cs / Enemy.cs / WaveDirector.cs avec les valeurs de PrototypeSceneBuilder.cs).
Sert à vérifier qu'une séquence est ni impossible ni triviale. Si vous modifiez les données Unity, mettez les constantes ci-dessous à jour."""
import json, math, random, sys, os
here = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(os.path.join(here, '..', '..', 'Assets', '_Project', 'Data', 'Arena01_layout.json')))
P = [(p['x'], p['z']) for p in L['path']]
cum = [0.0]
for a, b in zip(P, P[1:]): cum.append(cum[-1] + math.dist(a, b))
LEN = cum[-1]
def pos(d):
    d = min(d, LEN)
    lo, hi = 1, len(P) - 1
    while lo < hi:
        m = (lo + hi) // 2
        if cum[m] < d: lo = m + 1
        else: hi = m
    t = (d - cum[lo - 1]) / max(1e-6, cum[lo] - cum[lo - 1])
    return (P[lo - 1][0] + (P[lo][0] - P[lo - 1][0]) * t, P[lo - 1][1] + (P[lo][1] - P[lo - 1][1]) * t)

E = {  # hp, speed, heartDamage, gold
    'orb': (55, 2.3, 4, 4), 'scout': (30, 4.2, 3, 3), 'elite': (240, 1.5, 15, 30), 'mini': (1000, 1.2, 35, 90), 'boss': (3600, 0.9, 100, 250)}
T0 = dict(damage=8, rate=1.6, range=5.5, zaps=1, jumps=0, radius=2.8, falloff=0.7)
UPS = [(60, dict(zaps=2, dmg=0.85)), (110, dict(jumps=2, radius=0.5)), (180, dict(dmg=1.5, rate=1.25, range=1.0, jumps=2))]
COST = 50; START_GOLD = 150; HEART = 100

def stats(tier):
    s = dict(T0)
    for i in range(tier):
        m = UPS[i][1]
        s['damage'] *= m.get('dmg', 1); s['rate'] *= m.get('rate', 1); s['range'] += m.get('range', 0)
        s['zaps'] += m.get('zaps', 0); s['jumps'] += m.get('jumps', 0); s['radius'] += m.get('radius', 0)
    return s

def events(seed=1234):
    rng = random.Random(seed); ev = []
    t0, dt = 10, 27
    W = [[('orb', 5, .5, 0)], [('orb', 7, .45, 0)], [('orb', 5, .5, 0), ('scout', 4, .4, 1.5)], [('orb', 9, .4, 0), ('scout', 5, .35, 2)],
         [('mini', 1, 1, 0), ('orb', 8, .45, 2)], [('orb', 8, .4, 0), ('scout', 8, .3, 1.5)], [('elite', 2, 2, 0), ('orb', 10, .4, 1)],
         [('scout', 12, .25, 0), ('orb', 8, .4, 2)], [('elite', 3, 1.8, 0), ('orb', 12, .35, 1)], [('boss', 1, 1, 0), ('elite', 3, 2, 3), ('orb', 10, .4, 2)]]
    for i, w in enumerate(W):
        for kind, n, sp, dl in w:
            for k in range(n): ev.append((t0 + dt * i + dl + k * sp, kind))
    for kind, st, en, iv, pmin, pmax in [('orb', 2, 270, 6, 1, 3), ('scout', 60, 270, 11, 1, 2)]:
        t = st
        while t <= en:
            for k in range(rng.randint(pmin, pmax)): ev.append((t + k * .4, kind))
            t += iv
    return sorted(ev)

def run(policy, verbose=False):
    ev = events(); ni = 0; t = 0.0; dt = 0.05
    gold = START_GOLD; heart = HEART; en = []; towers = []; peak = 0
    slots = [(s['x'], s['z']) for s in L['slots']]
    killed = 0
    while True:
        while ni < len(ev) and ev[ni][0] <= t:
            hp, sp, dm, g = E[ev[ni][1]]; en.append(dict(k=ev[ni][1], hp=hp, sp=sp, dm=dm, g=g, d=0.0)); ni += 1
        # joueur
        if policy == 'greedy':
            while True:
                nt = len(towers)
                if nt < 6 and nt < len(slots) and gold >= COST:
                    gold -= COST; towers.append(dict(p=slots[nt], tier=0, cd=0)); continue
                cand = [x for x in towers if x['tier'] < 3 and gold >= UPS[x['tier']][0]]
                if cand and (nt >= 6 or gold < COST):
                    c = min(cand, key=lambda x: x['tier']); gold -= UPS[c['tier']][0]; c['tier'] += 1; continue
                if nt >= 6 and nt < len(slots) and gold >= COST and all(x['tier'] >= 1 for x in towers):
                    gold -= COST; towers.append(dict(p=slots[nt], tier=0, cd=0)); continue
                break
        for e in en: e['d'] += e['sp'] * dt
        for tw in towers:
            tw['cd'] -= dt
            if tw['cd'] > 0: continue
            s = stats(tw['tier'])
            inr = sorted([e for e in en if math.dist(pos(e['d']), tw['p']) <= s['range']], key=lambda e: -e['d'])
            if not inr: tw['cd'] = 0.08; continue
            distinct = min(s['zaps'], len(inr))
            for z in range(s['zaps']):
                cur = inr[z % distinct]
                if cur['hp'] <= 0: continue
                hit = set(); dmg = s['damage']
                for j in range(s['jumps'] + 1):
                    hit.add(id(cur)); cur['hp'] -= dmg
                    if j == s['jumps']: break
                    pc = pos(cur['d'])
                    nxt = min((x for x in en if id(x) not in hit and x['hp'] > 0 and math.dist(pos(x['d']), pc) <= s['radius']), key=lambda x: math.dist(pos(x['d']), pc), default=None)
                    if nxt is None: break
                    dmg *= s['falloff']; cur = nxt
            tw['cd'] = 1 / s['rate']
        alive = []
        for e in en:
            if e['hp'] <= 0: gold += e['g']; killed += 1
            elif e['d'] >= LEN: heart -= e['dm']
            else: alive.append(e)
        en = alive; peak = max(peak, len(en))
        t += dt
        if heart <= 0: return dict(result='DÉFAITE', t=round(t), heart=0, towers=len(towers), peak=peak, killed=killed)
        if ni >= len(ev) and not en: return dict(result='VICTOIRE', t=round(t), heart=round(heart), towers=len(towers), tiers=sum(x['tier'] for x in towers), gold=gold, peak=peak, killed=killed)
        if t > 900: return dict(result='TIMEOUT')

if __name__ == '__main__':
    print('longueur du chemin: %.1f u | ennemis totaux: %d | PV totaux: %d' % (LEN, len(events()), sum(E[k][0] for _, k in events())))
    for pol in ('aucune', 'greedy'):
        print(pol.ljust(8), run(pol))
