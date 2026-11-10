/**
 * SIMULATION d'un joueur normal (tests/endless-helpers.ts + bot.endlessBotStep).
 * Les durées visées par la conception sont des HYPOTHÈSES : ce test les MESURE en actions, en touchers
 * (= énergie) et en fusions, puis les convertit en minutes avec un rythme supposé (12 puis 20 actions/min).
 * Le rapport est affiché dans la console ; les assertions ne vérifient que des bornes larges.
 */
import { describe, it, expect } from 'vitest';
import { ENDLESS_CFG } from '../src/game/endless';
import { playEndless, type Sim } from './endless-helpers';

const SEEDS = [101, 102, 103, 104, 105, 106, 107, 108];
const ACTIONS = 1800;
/** Temps simulé par action (HYPOTHÈSE de rythme d'un joueur normal) : enchaîner une fusion ≈ 1,8 s, toucher / livrer / réfléchir ≈ 3,5 s. */
const PACES = [
  { name: 'tranquille', merge: 2500, tap: 5000 },
  { name: 'rapide', merge: 1500, tap: 3000 },
];
const mn = (ms: number) => (ms / 60000).toFixed(1);
const med = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
const pct = (a: number[], p: number) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * p))] : NaN; };

for (const pace of PACES) describe(`simulation d'un joueur normal — rythme ${pace.name}`, () => {
  let sims: Sim[] = [];
  const MERGE_GAP = pace.merge;
  const TAP_GAP = pace.tap;
  it(`${SEEDS.length} parties de ${ACTIONS} actions`, () => {
    sims = SEEDS.map((seed) => playEndless({ seed, actions: ACTIONS, mergeGapMs: MERGE_GAP, tapGapMs: TAP_GAP }));
    expect(sims.length).toBe(SEEDS.length);
  }, 300_000);

  it('rapport de jalons (actions / touchers / fusions) — hypothèses de durée MESURÉES', () => {
    const lines: string[] = [];
    const row = (label: string, key: string) => {
      const v = sims.map((s) => s.miles[key]).filter(Boolean);
      if (!v.length) { lines.push(`${label.padEnd(34)} (non atteint sur ${ACTIONS} actions)`); return; }
      const a = med(v.map((x) => x.action));
      lines.push(`${label.padEnd(34)} actions méd. ${String(a).padStart(4)} (p90 ${String(pct(v.map((x) => x.action), 0.9)).padStart(4)}) · touchers ${String(med(v.map((x) => x.taps))).padStart(4)} · fusions ${String(med(v.map((x) => x.merges))).padStart(4)} · ≈ ${mn(med(v.map((x) => x.t)))} min simulées · ${v.length}/${sims.length} parties`);
    };
    lines.push(`=== ENDLESS 2.0 — SIMULATION rythme ${pace.name} (${sims.length} parties × ${ACTIONS} actions ; rythme simulé : fusion enchaînée ${MERGE_GAP / 1000} s, toucher ${TAP_GAP / 1000} s) ===`);
    row('1re récompense (1re livraison)', 'firstDeliver');
    row('1re nouveauté d\'album', 'firstDiscover');
    row('1er drop', 'firstDrop');
    row('1er coffre gagné', 'firstChest');
    row('1re amélioration de générateur', 'firstUpgrade');
    row('1re collection débloquée (Paris)', 'unlock:paris');
    row('Échecs débloqués', 'unlock:chess');
    row('Fleurs rares débloquées', 'unlock:rare');
    row('Chocolats débloqués', 'unlock:choc');
    row('1er palier événement « fleurs »', 'secStage:flowerFest:0');
    row('1er palier « défis de fusion »', 'secStage:mergeChallenges:0');
    row('1re fusion au niveau maximum', 'firstMaxMerge');
    row('1er objet niveau 5+', 'merge5');
    // cadence des livraisons / progrès (en minutes simulées : durée totale / nombre d'événements)
    const totalMin = sims.map((s) => (s.now - s.t0) / 60000);
    const perMin = (counts: number[]) => med(counts.map((c, i) => totalMin[i] / Math.max(1, c)));
    const all = sims.map((s) => s.deliveries.length);
    const easy = sims.map((s) => s.deliveries.filter((d) => d.tier === 'easy').length);
    lines.push(`Durée simulée par partie: ${totalMin.map((x) => x.toFixed(0)).join(', ')} min`);
    lines.push(`Livraison (toutes): 1 toutes les ${perMin(all).toFixed(1)} min · facile: 1 toutes les ${perMin(easy).toFixed(1)} min (objectif commande courte ${ENDLESS_CFG.targets.shortOrderMin.join('–')} min)`);
    const evPerMin = (pred: (w: string) => boolean) => sims.map((s) => s.majors.filter((m) => pred(m.what)).length);
    const sec = sims.map((s) => s.majors.filter((m) => m.what.startsWith('sec:') || m.what.startsWith('upgrade')).length);
    const major = evPerMin((w) => w.startsWith('unlock') || w === 'chest:epic' || w === 'chest:legendary' || w === 'maxMerge' || (w.startsWith('sec:') && w.endsWith(':2')) || /^upgrade:[a-z]+:[4-6]$/.test(w));
    lines.push(`Progrès secondaire (amélioration de générateur / palier d'événement): 1 toutes les ${perMin(sec).toFixed(1)} min (objectif ${ENDLESS_CFG.targets.secondaryProgressMin.join('–')} min)`);
    lines.push(`Récompense majeure (déblocage / coffre épique+ / dernier palier d'événement / fusion max / générateur niv. 4+): 1 toutes les ${perMin(major).toFixed(1)} min (objectif ${ENDLESS_CFG.targets.majorRewardMin.join('–')} min)`);
    lines.push(`Coffre gagné: 1 toutes les ${perMin(sims.map((s) => s.fun.endless2.counters.chestsEarned ?? 0)).toFixed(1)} min · combos de palier: ${med(sims.map((s) => s.evCount.comboTier ?? 0))} par partie · meilleur combo méd. ${med(sims.map((s) => s.s.bestCombo))}`);
    // jauge de trésor
    const merges = sims.map((s) => s.s.merges);
    const chests = sims.map((s) => s.fun.endless2.counters.chestsEarned ?? 0);
    const perChest = sims.map((_s, i) => merges[i] / Math.max(1, chests[i]));
    lines.push(`Jauge de trésor: ${med(perChest).toFixed(1)} fusions par coffre en médiane (objectif ≈ 30) ; coffres par partie: ${chests.join(', ')}`);
    // énergie
    const spent = sims.map((s) => s.energySpent);
    const free = sims.map((s) => s.freeTaps);
    const taps = sims.map((s) => s.taps);
    const wait = sims.map((s) => s.waitMs / (s.now - s.t0));
    lines.push(`Énergie: ${med(taps)} touchers/partie dont ${med(free)} gratuits (${(100 * med(free) / med(taps)).toFixed(0)} %) ; dépensée ${med(spent)} ; part du temps à attendre l'énergie: ${(100 * med(wait)).toFixed(1)} % (max ${(100 * Math.max(...wait)).toFixed(1)} %)`);
    // économie du monde
    const coins = sims.map((s) => s.world.res.coins);
    const wardrobe = sims.map((s) => s.world.wardrobe.owned.length - 6);
    const furn = sims.map((s) => Object.values(s.world.castle.owned).reduce((a, b) => a + b, 0));
    lines.push(`Monde (fin de partie): pièces restantes méd. ${med(coins)} · vêtements gagnés ${med(wardrobe)} · meubles gagnés ${med(furn)} · album ${med(sims.map((s) => s.fun.endless2.album.length))}/${87} · collections débloquées ${med(sims.map((s) => s.fun.endless2.counters.unlockedSeen ?? 0))}/11`);
    lines.push(`Niveaux de générateur (méd. de la meilleure): ${med(sims.map((s) => Math.max(...Object.values(s.fun.endless2.gens).map((g) => g.level))))} · sauvetages anti-blocage: ${sims.map((s) => s.stuckSeen).join(', ')}`);
    lines.push(`Coffres ouverts par rareté (cumul): ${JSON.stringify(sims.reduce((a, s) => { for (const [k, v] of Object.entries(s.chestRarities)) a[k] = (a[k] ?? 0) + v; return a; }, {} as Record<string, number>))}`);
    console.log('\n' + lines.join('\n'));

    // bornes larges (ce ne sont pas des garanties de durée)
    expect(med(sims.map((s) => s.miles.firstDeliver?.action ?? 9999))).toBeLessThanOrEqual(40); // 1re récompense : large borne (voir rapport)
    expect(med(perChest)).toBeGreaterThan(18);
    expect(med(perChest)).toBeLessThan(45);
    // refonte de l'économie : l'énergie est plus rare (1 / 2 min) ; ce bot ne fait QUE taper, un humain joue Mon Monde / les échecs pendant l'attente
    expect(Math.max(...wait)).toBeLessThan(0.75);
    expect(perMin(all)).toBeGreaterThan(0.3);
    expect(perMin(all)).toBeLessThan(6);
  });
});
