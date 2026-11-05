import { describe, it, expect } from 'vitest';
import { diagnosticsText, formatDiagnostics, safeUrl, type DiagInput } from '../src/core/diagnostics';

const base = (over: Partial<DiagInput> = {}): DiagInput => ({
  buildId: 'abc-123', buildTime: 1_700_000_000_000, launchUrl: 'https://mdelarose.fr/radia-52c8654e04/', standalone: false, manifestStart: 'https://mdelarose.fr/radia-52c8654e04/',
  sw: { supported: true, controlled: true, scope: 'https://mdelarose.fr/radia-52c8654e04/', script: 'https://mdelarose.fr/radia-52c8654e04/sw.js', state: 'activated', caches: ['radia-abc-123'] },
  remote: { version: 'abc-123', built: 1_700_000_000_000 },
  save: { hadSave: true, storyStep: 9999, hearts: 2990, coins: 5474, updatedAt: 1_700_000_100_000, hasPhotoKey: true, storageOk: true }, ...over,
});
const get = (rows: [string, string][], k: string) => rows.find(([a]) => a === k)?.[1] ?? '';

describe('diagnostic Safari / application installée', () => {
  it('l\'adresse affichée ne contient JAMAIS la partie « # » (clé des photos)', () => {
    expect(safeUrl('https://mdelarose.fr/radia-52c8654e04/?debug#k=AbCdEfGhIjKlMnOpQrStUvWx')).toBe('https://mdelarose.fr/radia-52c8654e04/?debug');
    const text = diagnosticsText(formatDiagnostics(base({ launchUrl: safeUrl('https://x.fr/a/#k=SECRETSECRETSECRETSECRET') })));
    expect(text).not.toMatch(/SECRET/);
  });
  it('mode Safari vs application installée : clairement distingué', () => {
    expect(get(formatDiagnostics(base()), 'Mode')).toBe('Safari / navigateur');
    expect(get(formatDiagnostics(base({ standalone: true })), 'Mode')).toMatch(/APPLICATION INSTALLÉE/);
  });
  it('partie neuve et clé absente : signalées sans ambiguïté (cause des « personnages différents »)', () => {
    const r = formatDiagnostics(base({ standalone: true, save: { hadSave: false, storyStep: 0, hearts: 5, coins: 0, updatedAt: 0, hasPhotoKey: false, storageOk: true } }));
    expect(get(r, 'Partie dans ce mode')).toMatch(/NEUVE/);
    expect(get(r, 'Photos (clé)')).toMatch(/ABSENTE/);
  });
  it('état de mise à jour : à jour / nouvelle version / injoignable', () => {
    expect(get(formatDiagnostics(base()), 'Mise à jour')).toBe('à jour');
    expect(get(formatDiagnostics(base({ remote: { version: 'zzz', built: 1_800_000_000_000 } })), 'Mise à jour')).toMatch(/nouvelle version disponible/);
    expect(get(formatDiagnostics(base({ remote: 'unreachable' })), 'Mise à jour')).toMatch(/impossible/);
  });
  it('deux modes sur le même build : le champ « Build » est identique (comparaison objective)', () => {
    expect(get(formatDiagnostics(base()), 'Build')).toBe(get(formatDiagnostics(base({ standalone: true })), 'Build'));
  });
  it('service worker absent ou non pris en charge : pas d\'exception', () => {
    expect(get(formatDiagnostics(base({ sw: { supported: false, controlled: false, scope: '', script: '', state: '', caches: [] } })), 'Service worker')).toMatch(/non pris en charge/);
    expect(get(formatDiagnostics(base({ sw: { supported: true, controlled: false, scope: '', script: '', state: '', caches: [] } })), 'Service worker')).toBe('aucun');
  });
  it('affiche le pack de personnages (empreinte, déchiffrement), le schéma de sauvegarde et le scope — sans jamais montrer la clé', () => {
    const rows = formatDiagnostics(base({ schema: 5, scope: 'https://mdelarose.fr/radia-52c8654e04/', chars: { file: 'char-radia.bin', fingerprint: 'a1b2c3d4', decrypt: 'sans clé' } }));
    expect(get(rows, 'Schéma de sauvegarde')).toBe('v5');
    expect(get(rows, 'Pack de personnages')).toMatch(/a1b2c3d4.*sans clé/);
    expect(get(rows, 'Scope du manifeste')).toMatch(/radia-52c8654e04/);
  });
});
