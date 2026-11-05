import { describe, it, expect } from 'vitest';
import { isNewer, parseRemoteVersion, versionLabel } from '../src/core/updates';

describe('mises à jour : comparaison de versions', () => {
  it('version.json illisible ou incomplet : jamais d\'exception, jamais de mise à jour', () => {
    for (const bad of [null, undefined, 42, 'x', {}, { version: '' }, { version: 3 }]) expect(parseRemoteVersion(bad)).toBeNull();
    expect(isNewer(parseRemoteVersion({ version: 'zz' }), 'abc', 100)).toBe(false); // built absent (0) : pas plus récent
  });
  it('même build : à jour', () => {
    expect(isNewer({ version: 'abc', built: 200 }, 'abc', 100)).toBe(false);
  });
  it('build plus récente : mise à jour disponible', () => {
    expect(isNewer({ version: 'def', built: 200 }, 'abc', 100)).toBe(true);
  });
  it('build plus ancienne (cache d\'un autre serveur, retour en arrière) : jamais de « mise à jour » vers le passé', () => {
    expect(isNewer({ version: 'old', built: 50 }, 'abc', 100)).toBe(false);
  });
  it('en développement (pas de build id) : on ne propose rien', () => {
    expect(isNewer({ version: 'def', built: 200 }, 'dev', 0)).toBe(false);
  });
  it('libellé de version : identifiant réel, avec la date quand elle est connue', () => {
    expect(versionLabel('abc-123', 0)).toBe('abc-123');
    expect(versionLabel('abc-123', Date.UTC(2026, 10, 5, 12, 0))).toMatch(/^2026-11-0[45] \d\d:\d\d · abc-123$/);
  });
});

import { shouldAutoApply } from '../src/core/updates';
describe('mise à jour automatique : quand recharger toute seule', () => {
  const base = { manual: false, justReloaded: false, onTitle: false, overlay: false, resumedAfterAbsence: false };
  it('écran titre ou retour après une absence : oui', () => {
    expect(shouldAutoApply({ ...base, onTitle: true })).toBe(true);
    expect(shouldAutoApply({ ...base, resumedAfterAbsence: true })).toBe(true);
  });
  it('en pleine partie (pas d\'absence), fenêtre ouverte, vérification manuelle ou rechargement récent : non', () => {
    expect(shouldAutoApply(base)).toBe(false);
    expect(shouldAutoApply({ ...base, onTitle: true, overlay: true })).toBe(false);
    expect(shouldAutoApply({ ...base, onTitle: true, manual: true })).toBe(false);
    expect(shouldAutoApply({ ...base, resumedAfterAbsence: true, justReloaded: true })).toBe(false);
  });
});
