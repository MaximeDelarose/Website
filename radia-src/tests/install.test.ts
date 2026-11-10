import { describe, it, expect } from 'vitest';
import { installKind } from '../src/core/install';

const E = { standalone: false, ios: false, safari: false, hasPrompt: false };
describe('installation sur l\'écran d\'accueil', () => {
  it('déjà installée : aucun bouton', () => { expect(installKind({ ...E, standalone: true, ios: true, safari: true })).toBe('installed'); });
  it('iPhone + Safari : instructions « Partager → Sur l\'écran d\'accueil » (pas de fausse installation automatique)', () => {
    expect(installKind({ ...E, ios: true, safari: true })).toBe('ios-safari');
  });
  it('iPhone hors Safari (Chrome, application intégrée) : demander d\'ouvrir Safari', () => { expect(installKind({ ...E, ios: true })).toBe('ios-other'); });
  it('Android / Chrome : boîte d\'installation native quand le navigateur la propose', () => { expect(installKind({ ...E, hasPrompt: true })).toBe('prompt'); });
  it('ailleurs : consigne générique', () => { expect(installKind(E)).toBe('other'); });
});
