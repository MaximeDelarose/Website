import { describe, it, expect, afterEach } from 'vitest';
import { defaultFun } from '../src/save/fun';
import { hasPending, setUnreadSource } from '../src/events/tindeur/logic';

describe('Tindeur : pastille de l’icône (messages non lus des matchs)', () => {
  afterEach(() => setUnreadSource(() => 0));
  it('par défaut : pas de pastille tant que la scène « 2 500 matchs » n’a pas eu lieu', () => {
    const t = defaultFun().tindeur;
    expect(hasPending(t)).toBe(false);
  });
  it('un message non lu d’un match allume la pastille', () => {
    const t = defaultFun().tindeur;
    setUnreadSource(() => 2);
    expect(hasPending(t)).toBe(true);
  });
  it('appli désinstallée : plus de pastille du tout, même avec des messages non lus', () => {
    const t = defaultFun().tindeur;
    t.installed = false; t.choice = 'uninstall';
    setUnreadSource(() => 5);
    expect(hasPending(t)).toBe(false);
  });
  it('la scène d’origine garde sa pastille (match jamais ouvert)', () => {
    const t = defaultFun().tindeur;
    t.shown = true; t.choice = 'none';
    expect(hasPending(t)).toBe(true);
    t.choice = 'keep';
    expect(hasPending(t)).toBe(false);
  });
});
