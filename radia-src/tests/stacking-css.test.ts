import { describe, it, expect } from 'vitest';
// pas de types Node dans le projet : import dynamique non typé
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fs: any = await import(/* @vite-ignore */ 'node:' + 'fs');
const readdirSync = (d: string): string[] => fs.readdirSync(d);
const readFileSync = (f: string, e: string): string => fs.readFileSync(f, e);
const statSync = (p: string): { isDirectory(): boolean } => fs.statSync(p);
const join = (a: string, b: string): string => `${a}/${b}`;
import { Z } from '../src/ui/rewards/zlayers';

/** Parcourt src/ et extrait chaque z-index déclaré (feuilles CSS + styles en ligne dans le code). */
function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(css|ts)$/.test(n)) out.push(p);
  }
  return out;
}
const decl: { file: string; z: number }[] = [];
for (const f of walk('src')) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/z-index\s*:\s*(-?\d+)/g)) decl.push({ file: f, z: +m[1] });
}
const REWARD_CSS = 'src/ui/rewards/rewards.css';
const layerZ = +(/#reward-overlay\s*\{[^}]*z-index:\s*(\d+)/.exec(readFileSync(REWARD_CSS, 'utf8'))?.[1] ?? NaN);

describe('empilement : table des z-index', () => {
  it('la couche récompense du CSS correspond à la table documentée', () => {
    expect(layerZ).toBe(Z.reward);
  });
  it('aucun autre z-index déclaré n\'atteint la couche récompense', () => {
    const others = decl.filter((d) => !(d.file === REWARD_CSS && d.z === layerZ));
    expect(others.length).toBeGreaterThan(50);
    const worst = others.reduce((a, b) => (b.z > a.z ? b : a));
    expect(worst.z, `${worst.file} déclare z-index ${worst.z}`).toBeLessThan(Z.reward);
  });
  it('la table est strictement croissante et couvre la barre de mise à jour', () => {
    expect(Z.game).toBeLessThan(Z.ui);
    expect(Z.ui).toBeLessThan(Z.uiMax);
    expect(Z.uiMax).toBeLessThan(Z.updateBar);
    expect(Z.updateBar).toBeLessThan(Z.reward);
    // les z-index internes à #ui restent <= uiMax, hors barre de mise à jour
    const inUi = decl.filter((d) => d.z > Z.uiMax && !/updateWatch|updates\.ts|rewards\.css/.test(d.file));
    expect(inUi).toEqual([]);
  });
  it('#app et body ne créent pas de contexte d\'empilement parasite (transform/filter/will-change/isolation)', () => {
    const css = readFileSync('src/ui/styles/base.css', 'utf8');
    for (const sel of ['body', '#app', '#ui']) {
      const m = new RegExp(`(^|\\n)${sel.replace('#', '\\#')}\\s*\\{([^}]*)\\}`).exec(css);
      expect(m, sel).toBeTruthy();
      expect(m![2]).not.toMatch(/transform|filter|will-change|isolation|perspective/);
    }
  });
  it('l\'ancien nom de classe du fond sombre n\'est pas réutilisé', () => {
    const css = walk('src').filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(css).not.toMatch(/\.fx-layer\b/);
  });
});
