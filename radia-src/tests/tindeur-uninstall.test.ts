import { describe, expect, it } from 'vitest';
import { tryUninstall, UNINSTALL_REFUSAL, UNINSTALL_TRIES } from '../src/events/tindeur/logic';
import { defaultFun, sanitizeFun } from '../src/save/fun';

describe('Tindeur : désinstallation en trois essais', () => {
  it('les deux premiers essais sont refusés, le troisième désinstalle', () => {
    const t = defaultFun().tindeur;
    expect(UNINSTALL_TRIES).toBe(3);
    const a = tryUninstall(t, 1000);
    expect(a.ok).toBe(false); expect(t.installed).toBe(true); expect(t.choice).toBe('keep'); expect(t.shown).toBe(true);
    const b = tryUninstall(t, 2000);
    expect(b.ok).toBe(false); expect(t.installed).toBe(true);
    const c = tryUninstall(t, 3000);
    expect(c.ok).toBe(true); expect(t.installed).toBe(false); expect(t.choice).toBe('uninstall');
    expect(c.tries).toBe(3);
  });
  it('le message d’Auguste est celui demandé', () => {
    expect(UNINSTALL_REFUSAL).toContain('Pas utile de désinstaller celle d’ici');
  });
  it('le compteur survit à la sauvegarde', () => {
    const f = defaultFun();
    tryUninstall(f.tindeur, 1000);
    const back = sanitizeFun(JSON.parse(JSON.stringify(f)));
    expect(back.tindeur.uninstallTries).toBe(1);
    expect(back.tindeur.installed).toBe(true);
  });
  it('une sauvegarde sans compteur repart de zéro', () => {
    const back = sanitizeFun({ tindeur: { shown: true, choice: 'keep', installed: true, at: 1, streakMs: 0 } });
    expect(back.tindeur.uninstallTries ?? 0).toBe(0);
  });
});
