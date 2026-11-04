import { describe, it, expect } from 'vitest';
import { LINES, pickLine, augusteLineStats, hasGalbi, type Situation, type ToneMemory } from '../src/data/augusteTone';
import { AUG_LINES } from '../src/data/world/augusteLines';
import { BARKS } from '../src/data/dialogue';
import { LINE_ALL } from '../src/events/restaurant/logic';
import { PROMISE_INTRO } from '../src/events/bracelet/data';
import { VERDICT_FIRST } from '../src/events/dressLines';
import { EVENTS, SMALL_MESSAGES } from '../src/events/data';

const fnv = (w: string): number => { let x = 2166136261; for (let i = 0; i < w.length; i++) { x ^= w.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x >>> 0; };
const rngSeed = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const mem = (): ToneMemory => ({ recent: [], galbiHistory: [] });

describe('ton d\'Auguste : « galbi » rare', () => {
  it('les banques ne sont jamais vides (≥ 5 variantes) et le mot reste rare', () => {
    for (const [k, v] of Object.entries(LINES)) expect(v.length, k).toBeGreaterThanOrEqual(5);
    const st = augusteLineStats();
    expect(st.ratio).toBeLessThan(0.1);
    expect(st.galbi).toBeGreaterThan(0);
  });

  it('proportion < 10 % dans les répliques et données d\'événements scannées', () => {
    const texts: string[] = [
      ...Object.values(AUG_LINES).flat(), ...Object.values(BARKS).flat(),
      ...Object.values(LINES).flat(),
      JSON.stringify(EVENTS).split('","'), JSON.stringify(SMALL_MESSAGES).split('","'),
    ].flat() as string[];
    const n = texts.length;
    const g = texts.filter(hasGalbi).length;
    expect(n).toBeGreaterThan(150);
    expect(g / n).toBeLessThan(0.1);
  });

  it('pickLine : jamais deux « galbi » d\'affilée, au plus 1 sur 10 tirages, sur 1000 tirages', () => {
    const m = mem();
    const rng = rngSeed(42);
    const sits = Object.keys(LINES) as Situation[];
    const flags: boolean[] = [];
    for (let i = 0; i < 1000; i++) flags.push(hasGalbi(pickLine(sits[i % sits.length], rng, { memory: m })));
    for (let i = 1; i < flags.length; i++) expect(flags[i] && flags[i - 1]).toBe(false);
    for (let i = 0; i + 10 <= flags.length; i++) expect(flags.slice(i, i + 10).filter(Boolean).length).toBeLessThanOrEqual(1);
    expect(flags.filter(Boolean).length / flags.length).toBeLessThan(0.1);
  });

  it('pickLine : pas de répétition immédiate et option noGalbi', () => {
    const m = mem();
    const rng = rngSeed(7);
    let prev = '';
    for (let i = 0; i < 200; i++) {
      const l = pickLine('reward', rng, { memory: m });
      expect(l).not.toBe(prev);
      prev = l;
      expect(hasGalbi(pickLine('tender', rng, { memory: m, noGalbi: true }))).toBe(false);
    }
  });

  it('tindeurUninstall reste neutre (aucun jugement, aucun « galbi »)', () => {
    for (const l of LINES.tindeurUninstall) expect(hasGalbi(l)).toBe(false);
  });

  it('aucun prénom d\'enfant (empreintes) dans les banques et dialogues', () => {
    const banned = new Set<number>([3946716181, 2134510645, 4286642214, 2941064473]);
    const all = JSON.stringify([LINES, AUG_LINES, BARKS]).toLowerCase();
    for (const w of new Set(all.match(/[a-zà-ÿ]+/g) ?? [])) expect(banned.has(fnv(w))).toBe(false);
  });

  it('les déclarations validées restent inchangées (empreinte de contrôle)', () => {
    const decl = [LINE_ALL, PROMISE_INTRO, VERDICT_FIRST].join('|');
    expect(decl).toContain('galbi');
    expect(fnv(decl)).toBe(EXPECTED);
  });
});
const EXPECTED = 540938051;
