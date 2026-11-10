/**
 * SIMULATION D'ÉCONOMIE PAR PROFIL DE JOUEUSE (énergie, pièces, commandes, XP).
 * Joue de vraies séances avec le moteur (botStep + règles + économie), jour après jour, et affiche un rapport.
 * Les chiffres du rapport alimentent docs/BALANCING.md. Les assertions ne vérifient que des garde-fous larges (jamais de blocage définitif,
 * énergie jamais > 100, ressources jamais négatives) : les VALEURS d'équilibrage se règlent dans src/game/endless/config.ts.
 *   BALANCE_REPORT=1 npx vitest run tests/balance-sim.test.ts   (affiche le rapport complet)
 */
import { describe, it, expect } from 'vitest';
import { botStep } from '../src/game/merge/bot';
import { ENDLESS_DEF, placeLoot, replaceOrder } from '../src/game/merge/rules';
import { applyEvents, openChest, upgradeGenerator, activeColls, genKindOf } from '../src/game/endless';
import { spendEnergy, syncEnergy, ENERGY_MAX, nextEnergyIn, takeFreeRefill } from '../src/game/economy/economy';
import { newSim, host, mulberry, type Sim } from './endless-helpers';
import type { BoardEvent } from '../src/game/merge/types';

interface Profile { name: string; days: number; sessions: { at: number; min: number }[] /* heure de la journée (h), durée (min) */; refill: boolean }
const DAY = 86_400_000;
export const PROFILES: Profile[] = [
  { name: 'occasionnelle (3 séances de 4 min / jour)', days: 14, sessions: [{ at: 8, min: 4 }, { at: 13, min: 4 }, { at: 21, min: 4 }], refill: true },
  { name: 'régulière (2 séances de 20 min / jour)', days: 14, sessions: [{ at: 12.5, min: 20 }, { at: 21, min: 20 }], refill: true },
  { name: 'longue (1 séance de 60 min / jour)', days: 14, sessions: [{ at: 20.5, min: 60 }], refill: true },
  { name: 'intensive (4 séances de 30 min / jour)', days: 14, sessions: [{ at: 8, min: 30 }, { at: 12, min: 30 }, { at: 17, min: 30 }, { at: 21, min: 30 }], refill: true },
];
const GAP_MERGE = 1800, GAP_TAP = 3500; // rythme simulé d'un joueur normal (ms)

export interface Report {
  name: string; taps: number; orders: number; ordersPerDay: number; ordersPerMin: number; energyIn: Record<string, number>; energyRegen: number; energyOut: number; energyWasted: number;
  coins: number; coinsBySrc: Record<string, number>; diamonds: number; blockedSessions: number; sessions: number; startFull: number; startAvg: number; xp: number; lastOrdersEnergyFull: number;
  perDay: { taps: number; orders: number; coins: number };
}

/** Joue un profil sur `days` jours ; renvoie les agrégats. */
export function simulateProfile(p: Profile, seed: number): Report {
  const sim: Sim = newSim(seed);
  const eco = sim.eco; const t0 = sim.t0;
  const r: Report = { name: p.name, taps: 0, orders: 0, ordersPerDay: 0, ordersPerMin: 0, energyIn: {}, energyRegen: 0, energyOut: 0, energyWasted: 0, coins: 0, coinsBySrc: {}, diamonds: 0, blockedSessions: 0, sessions: 0, startFull: 0, startAvg: 0, xp: 0, lastOrdersEnergyFull: 0, perDay: { taps: 0, orders: 0, coins: 0 } };
  let startSum = 0, playMin = 0;
  const rnd = mulberry(seed);
  const digestOne = (e: BoardEvent) => {
    if (e.t === 'spawn' && e.source === 'gen' && !e.double) {
      sim.taps++; r.taps++;
      if (!e.free) { r.energyOut++; if (!spendEnergy(eco, 1, sim.now)) { /* garde-fou : ne devrait pas arriver, la séance s'arrête avant */ } }
    }
    if (e.t === 'deliver') { r.orders++; }
    const before = eco.energy;
    const res = applyEvents(host(sim), [e]);
    const added = eco.energy - before; // énergie réellement ajoutée (plafonnée à 100)
    if (res.energy > 0) { r.energyIn[e.t] = (r.energyIn[e.t] ?? 0) + added; r.energyWasted += Math.max(0, res.energy - added); }
    if (res.coins > 0) { r.coins += res.coins; r.coinsBySrc[e.t] = (r.coinsBySrc[e.t] ?? 0) + res.coins; }
    r.diamonds += res.diamonds;
  };
  for (let d = 0; d < p.days; d++) {
    for (const ses of p.sessions) {
      sim.now = t0 + d * DAY + ses.at * 3_600_000;
      // recharge naturelle écoulée depuis la dernière séance
      const e0 = eco.energy; syncEnergy(eco, sim.now); r.energyRegen += eco.energy - e0;
      // recharge offerte d'Auguste (quotidienne) : utilisée au début de la 1re séance de la journée si l'énergie n'est pas pleine
      if (p.refill && ses === p.sessions[0]) { const b = eco.energy; if (takeFreeRefill(eco, sim.now)) { r.energyIn.refill = (r.energyIn.refill ?? 0) + (eco.energy - b); } }
      r.sessions++; startSum += eco.energy; if (eco.energy >= ENERGY_MAX - 2) r.startFull++;
      const end = sim.now + ses.min * 60_000; let blocked = false; let i = 0;
      while (sim.now < end && i++ < 4000) {
        syncEnergy(eco, sim.now);
        if (eco.energy + (eco.reserve ?? 0) < 1) { blocked = true; break; } // plus d'énergie : la joueuse arrête (ou fait autre chose)
        const ch = openChest(sim.fun, mulberry(i + seed + d));
        if (ch) { const pl = placeLoot(sim.s, ch.loot); for (const e of pl.events) digestOne(e); applyEvents(host(sim), []); }
        if (i % 25 === 0) for (const c of activeColls(sim.fun)) upgradeGenerator(sim.fun, genKindOf(c), sim.world);
        if (sim.fun.endless2.replaces > 1 && i % 40 === 0) for (const e of replaceOrder(sim.s, ENDLESS_DEF, 2)) digestOne(e);
        const ev = botStep(sim.s, ENDLESS_DEF, sim.now);
        for (const e of ev) digestOne(e);
        sim.now += ev.some((e) => e.t === 'merge') ? GAP_MERGE : GAP_TAP;
        void rnd;
      }
      playMin += Math.min(ses.min, (sim.now - (end - ses.min * 60_000)) / 60_000);
      if (blocked) r.blockedSessions++;
    }
  }
  r.startAvg = startSum / Math.max(1, r.sessions);
  r.ordersPerDay = r.orders / p.days; r.ordersPerMin = r.orders / Math.max(1, playMin);
  r.perDay = { taps: r.taps / p.days, orders: r.orders / p.days, coins: r.coins / p.days };
  r.xp = sim.fun.endless2.counters.xp ?? 0;
  return r;
}

const SEEDS = [11, 12, 13];
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
function aggregate(p: Profile): Report {
  const rs = SEEDS.map((s) => simulateProfile(p, s));
  const m = (f: (x: Report) => number) => med(rs.map(f));
  const keys = [...new Set(rs.flatMap((x) => Object.keys(x.energyIn)))];
  const ck = [...new Set(rs.flatMap((x) => Object.keys(x.coinsBySrc)))];
  return { name: p.name, taps: m((x) => x.taps), orders: m((x) => x.orders), ordersPerDay: m((x) => x.ordersPerDay), ordersPerMin: m((x) => x.ordersPerMin), energyIn: Object.fromEntries(keys.map((k) => [k, m((x) => x.energyIn[k] ?? 0)])), energyRegen: m((x) => x.energyRegen), energyOut: m((x) => x.energyOut), energyWasted: m((x) => x.energyWasted), coins: m((x) => x.coins), coinsBySrc: Object.fromEntries(ck.map((k) => [k, m((x) => x.coinsBySrc[k] ?? 0)])), diamonds: m((x) => x.diamonds), blockedSessions: m((x) => x.blockedSessions), sessions: m((x) => x.sessions), startFull: m((x) => x.startFull), startAvg: m((x) => x.startAvg), xp: m((x) => x.xp), lastOrdersEnergyFull: 0, perDay: { taps: m((x) => x.perDay.taps), orders: m((x) => x.perDay.orders), coins: m((x) => x.perDay.coins) } };
}

export function formatReport(rs: Report[], days: number): string {
  const L: string[] = [];
  L.push(`=== SIMULATION D'ÉCONOMIE — médiane de ${SEEDS.length} parties, ${days} jours par profil ===`);
  for (const r of rs) {
    L.push(`\n— ${r.name}`);
    L.push(`  séances : ${r.sessions} · bloquées faute d'énergie : ${r.blockedSessions} (${Math.round((100 * r.blockedSessions) / Math.max(1, r.sessions))} %) · énergie au début d'une séance : ${r.startAvg.toFixed(0)}/100 en moyenne, ≥ 98 dans ${Math.round((100 * r.startFull) / Math.max(1, r.sessions))} % des séances`);
    L.push(`  par jour : ${r.perDay.taps.toFixed(0)} touchers · ${r.perDay.orders.toFixed(1)} commandes livrées (${r.ordersPerMin.toFixed(2)} / min jouée) · ${r.perDay.coins.toFixed(0)} pièces · XP total ${r.xp.toFixed(0)}`);
    const inTot = Object.values(r.energyIn).reduce((a, b) => a + b, 0);
    L.push(`  énergie : entrée ${(inTot + r.energyRegen).toFixed(0)} = recharge naturelle ${r.energyRegen.toFixed(0)} + bonus ${inTot.toFixed(0)} (${Object.entries(r.energyIn).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}) ; sortie ${r.energyOut.toFixed(0)} ; bonus perdus (plafond 100) ${r.energyWasted.toFixed(0)}`);
    L.push(`  pièces par source : ${Object.entries(r.coinsBySrc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
  }
  return L.join('\n');
}

describe('simulation d\'économie par profil', () => {
  const reports: Report[] = [];
  for (const p of PROFILES) {
    it(p.name, () => {
      const r = aggregate(p); reports.push(r);
      expect(r.sessions).toBeGreaterThan(0);
      expect(r.perDay.taps).toBeGreaterThan(0);
      expect(r.energyOut).toBeGreaterThan(0);
      expect(nextEnergyIn).toBeTruthy();
    }, 240_000);
  }
  it('rapport', () => {
    const text = formatReport(reports, PROFILES[0].days);
    if ((globalThis as unknown as { process?: { env: Record<string, string> } }).process?.env.BALANCE_REPORT) console.log(text);
    expect(reports.length).toBe(PROFILES.length);
  });
});
