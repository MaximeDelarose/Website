import { describe, it, expect } from 'vitest';
import { defaultFun, sanitizeFun } from '../src/save/fun';
import { INCIDENTS, MIN, incidentById } from '../src/events/incidents/data';
import {
  INCIDENT_CONFIG, canPay, consequenceText, costNow, defer, escalationIn, isDue, pickIncident, resolve, roomOf, scheduleNext, spawn, step, syncCost, trackActive,
} from '../src/events/incidents/manager';
import { rng } from '../src/events/incidents/rng';
import { rollParcel, shopLot, rollRareFlower, applyReward, applyRareFlower, missingClothes } from '../src/events/incidents/rewards';
import { defaultWorld } from '../src/save/schema';
import { buildLines, completeIn, deliverTo, getSpecialOrder, orderFrom, resetOrderProgress, rewardFor, ORDER_ID } from '../src/events/incidents/chocOrder';

const ctx = { catAdopted: true, hasGarden: true };
const leak = incidentById('leak')!;
const T = 1_700_000_000_000;
/** Avance de `ms` de jeu actif par tics de 10 s (comme le planificateur). */
const adv = (st: ReturnType<typeof defaultFun>['incidents'], ms: number) => { for (let x = 0; x < ms; x += 10_000) trackActive(st, Math.min(10_000, ms - x), true); };

describe('fuite d’eau : coût 100 → 140 après 3 min de jeu ACTIF', () => {
  it('coût de base 100, plafond 140, conséquence affichée dès le premier choix', () => {
    expect(leak.baseCost).toBe(100); expect(leak.capCost).toBe(140); expect(leak.escalateMs).toBe(3 * MIN);
    expect(consequenceText(leak)).toBe('Si tu reportes : 140 pièces dans 3 min de jeu');
    const f = defaultFun();
    spawn(f.incidents, leak, T, 5);
    expect(syncCost(f.incidents, leak)).toBe(100);
  });
  it('reporter démarre l’horloge ; 100 jusqu’à 3 min actives, puis 140, jamais plus', () => {
    const f = defaultFun(); const st = f.incidents;
    spawn(st, leak, T, 5);
    trackActive(st, 20_000, true); trackActive(st, 20_000, true);
    defer(st);
    expect(st.active!.deferActive).toBe(40_000);
    for (let i = 0; i < 17; i++) trackActive(st, 10_000, true); // 170 s
    expect(syncCost(st, leak)).toBe(100);
    expect(escalationIn(leak, st)).toBe(10_000);
    trackActive(st, 10_000, true); // 180 s
    expect(syncCost(st, leak)).toBe(140);
    adv(st, 50 * MIN);
    expect(syncCost(st, leak)).toBe(140);
    expect(costNow(leak, st.active!, 1e12)).toBe(140);
    expect(escalationIn(leak, st)).toBe(0);
  });
  it('le temps hors jeu / onglet caché ne compte PAS', () => {
    const st = defaultFun().incidents;
    spawn(st, leak, T, 5); defer(st);
    for (let i = 0; i < 500; i++) trackActive(st, 10_000, false); // inactif pendant ~83 min
    expect(st.activeMs).toBe(0);
    expect(syncCost(st, leak)).toBe(100);
    trackActive(st, 2 * MIN, true);
    expect(syncCost(st, leak)).toBe(100);
  });
  it('reporter de nouveau ne remet pas l’horloge à zéro, aucune pièce n’est retirée, solution gratuite toujours là', () => {
    const st = defaultFun().incidents;
    spawn(st, leak, T, 5);
    defer(st); const first = st.active!.deferActive;
    trackActive(st, MIN, true); defer(st);
    expect(st.active!.deferActive).toBe(first);
    expect(leak.options.some((o) => o.kind === 'game')).toBe(true);
    expect(canPay(99, 100)).toBe(false); expect(canPay(100, 100)).toBe(true);
    expect(canPay(500, 0)).toBe(false);
  });
  it('tous les incidents ont une solution gratuite ou sans coût, et des coûts ≤ plafond', () => {
    for (const d of INCIDENTS) {
      expect(d.capCost).toBeGreaterThanOrEqual(d.baseCost);
      if (d.baseCost > 0) expect(d.options.some((o) => o.kind === 'game')).toBe(true);
      expect(d.options.some((o) => o.kind === 'pay')).toBe(d.baseCost > 0);
    }
  });
});

describe('tirage et espacement', () => {
  it('le premier incident est planifié, pas immédiat ; ensuite écart 14–24 min actives', () => {
    const st = defaultFun().incidents;
    expect(step(st, ctx, true, T)).toBeNull();
    expect(st.nextAtActive).toBe(INCIDENT_CONFIG.firstMs);
    expect(step(st, ctx, true, T)).toBeNull();
    adv(st, INCIDENT_CONFIG.firstMs - 1); // sous la limite
    for (let i = 0; i < 5; i++) trackActive(st, 0, true);
    expect(isDue(st)).toBe(false);
    trackActive(st, 1, true);
    expect(isDue(st)).toBe(true);
    const r = rng(1);
    const def = step(st, ctx, true, T, r)!;
    expect(def).toBeTruthy();
    expect(st.active!.id).toBe(def.id);
    for (let seed = 1; seed <= 100; seed++) { const s = defaultFun().incidents; s.activeMs = 1000; scheduleNext(s, rng(seed)); const gap = s.nextAtActive - 1000; expect(gap).toBeGreaterThanOrEqual(INCIDENT_CONFIG.gapMinMs); expect(gap).toBeLessThanOrEqual(INCIDENT_CONFIG.gapMaxMs); }
  });
  it('rien tant que le moment n’est pas sûr ; un seul incident actif à la fois', () => {
    const st = defaultFun().incidents; st.activeMs = 100 * MIN; st.nextAtActive = 10;
    expect(step(st, ctx, false, T)).toBeNull();
    expect(st.active).toBeNull();
    const d1 = step(st, ctx, true, T)!;
    expect(d1).toBeTruthy();
    expect(step(st, ctx, true, T)).toBeNull(); // déjà un actif
    expect(spawn(st, incidentById('parcel')!, T, 1)).toBe(false);
    expect(st.active!.id).toBe(d1.id);
  });
  it('jamais de rafale : après résolution, le suivant est loin ; pas deux fois le même d’affilée', () => {
    const st = defaultFun().incidents; st.activeMs = 50 * MIN; st.nextAtActive = 1;
    let prev = '';
    const r = rng(9);
    for (let i = 0; i < 40; i++) {
      const d = step(st, ctx, true, T, r)!;
      expect(d).toBeTruthy();
      expect(d.id).not.toBe(prev);
      prev = d.id;
      resolve(st, T, r);
      expect(isDue(st)).toBe(false);
      expect(st.nextAtActive - st.activeMs).toBeGreaterThanOrEqual(INCIDENT_CONFIG.gapMinMs);
      st.activeMs = st.nextAtActive;
    }
    expect(st.done.leak ?? 0).toBeGreaterThan(0);
  });
  it('conditions du monde : pas de bêtise du chat sans chat', () => {
    const st = defaultFun().incidents;
    for (let seed = 1; seed < 300; seed++) expect(pickIncident(st, { catAdopted: false, hasGarden: true }, rng(seed))!.id).not.toBe('catMess');
  });
  it('tirage pondéré : toutes les familles sortent, la plus lourde plus souvent', () => {
    const st = defaultFun().incidents; const count: Record<string, number> = {};
    const r = rng(3);
    for (let i = 0; i < 4000; i++) { const d = pickIncident(st, ctx, r)!; count[d.id] = (count[d.id] ?? 0) + 1; }
    for (const d of INCIDENTS) expect(count[d.id]).toBeGreaterThan(0);
    expect(count.leak).toBeGreaterThan(count.newShop);
  });
});

describe('persistance et reprise', () => {
  it('l’incident actif (reporté, coût) survit à une sauvegarde / un rechargement', () => {
    const f = defaultFun(); const st = f.incidents;
    spawn(st, leak, T, 12345); trackActive(st, MIN, true); defer(st); adv(st, 4 * MIN); syncCost(st, leak);
    const back = sanitizeFun(JSON.parse(JSON.stringify(f))).incidents;
    expect({ ...back.active, at: 0 }).toEqual({ ...st.active, at: 0 }); // (fun.ts borne les horodatages à 1e12 : voir rapport)
    expect(back.activeMs).toBe(st.activeMs);
    expect(back.active!.cost).toBe(140);
    expect(roomOf(leak, back.active!.seed)).toBe(roomOf(leak, 12345));
    // reprise : le coût continue d’être calculé depuis l’état rechargé
    expect(costNow(leak, back.active!, back.activeMs)).toBe(140);
  });
  it('résolution : compteur, dernier mémorisé, prochaine planification', () => {
    const st = defaultFun().incidents; spawn(st, leak, T, 1);
    expect(resolve(st, T + 5)).toBe('leak');
    expect(st.active).toBeNull(); expect(st.done.leak).toBe(1);
    expect(resolve(st, T)).toBeNull();
    const back = sanitizeFun(JSON.parse(JSON.stringify({ ...defaultFun(), incidents: st }))).incidents;
    expect(back.done.leak).toBe(1);
    expect(pickIncident(back, ctx, rng(1))!.id).not.toBe('leak');
  });
});

describe('récompenses réelles (registres du monde)', () => {
  it('colis : toujours une récompense valide et appliquée dans le monde', () => {
    for (let seed = 1; seed < 200; seed++) {
      const w = defaultWorld(); const coins = w.res.coins;
      const rw = rollParcel(seed, w);
      applyReward(w, rw);
      if (rw.kind === 'coins') expect(w.res.coins).toBeGreaterThan(coins);
      else if (rw.kind === 'cloth') expect(w.wardrobe.owned).toContain(rw.id);
      else expect(w.castle.owned[rw.id]).toBe(1);
    }
  });
  it('boutique : lot de vrais items non possédés ; fleur rare débloquée', () => {
    const w = defaultWorld();
    const before = missingClothes(w).length;
    const lot = shopLot(4, w);
    expect(lot.length).toBeGreaterThanOrEqual(3);
    for (const r of lot) applyReward(w, r);
    expect(missingClothes(w).length).toBeLessThan(before);
    const id = rollRareFlower(2, w)!;
    expect(w.garden.unlocked).not.toContain(id);
    applyRareFlower(w, id);
    expect(w.garden.unlocked).toContain(id);
    expect(w.garden.harvested[id]).toBe(3);
    const w2 = defaultWorld(); w2.garden.unlocked = [...(['rose', 'tulip', 'peony', 'daisy', 'lavender', 'hydrangea', 'orchid', 'lily', 'sunflower', 'magic'])];
    expect(rollRareFlower(1, w2)).toBeNull();
    expect(applyRareFlower(w2, null)).toMatch(/fleurs/);
  });
});

describe('commande spéciale de chocolats (API Endless)', () => {
  const withOrder = () => { const f = defaultFun(); spawn(f.incidents, incidentById(ORDER_ID)!, T, 77); return f; };
  it('pas de commande sans incident ; lignes dérivées de la graine, collection choc', () => {
    expect(getSpecialOrder(defaultFun())).toBeNull();
    const f = withOrder(); const o = getSpecialOrder(f)!;
    expect(o.lines.length).toBeGreaterThanOrEqual(3);
    for (const ln of o.lines) { expect(ln.c).toBe('choc'); expect(ln.l).toBeGreaterThanOrEqual(1); expect(ln.l).toBeLessThanOrEqual(8); }
    expect(o.lines.reduce((s, l) => s + l.n, 0)).toBeLessThanOrEqual(7);
    expect(buildLines(77)).toEqual(buildLines(77));
    expect(o.reward).toEqual(rewardFor(buildLines(77)));
  });
  it('livraison objet par objet, refus des objets inutiles, validation, récompense', () => {
    const f = withOrder(); const o = orderFrom(f)!;
    expect(deliverTo(f, 99)).toBe(false);
    expect(completeIn(f, () => undefined).ok).toBe(false);
    let granted = 0;
    for (const ln of o.lines) { for (let i = 0; i < ln.n; i++) expect(deliverTo(f, ln.l)).toBe(true); expect(deliverTo(f, ln.l)).toBe(false); }
    expect(orderFrom(f)!.complete).toBe(true);
    const res = completeIn(f, (r) => { granted = r.coins; });
    expect(res.ok).toBe(true); expect(granted).toBe(o.reward.coins);
    expect(Object.keys(f.endless2.counters).filter((k) => k.startsWith('inc.choc.'))).toHaveLength(0);
  });
  it('l’avancement survit à la sauvegarde ; reset propre', () => {
    const f = withOrder(); const ln = orderFrom(f)!.lines[0]; deliverTo(f, ln.l);
    const back = sanitizeFun(JSON.parse(JSON.stringify(f)));
    expect(orderFrom(back)!.lines[0].have).toBe(1);
    resetOrderProgress(back);
    expect(orderFrom(back)!.lines[0].have).toBe(0);
  });
});
