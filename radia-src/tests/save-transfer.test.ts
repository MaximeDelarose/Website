import { describe, it, expect } from 'vitest';
import { applyTransfer, BEFORE_IMPORT_LS, decodeTransfer, encodeTransfer, PHOTO_KEY_LS, SAVE_LS, TRANSFER_PREFIX } from '../src/save/transfer';
import { defaultSave } from '../src/save/schema';

const KEY = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AB'; // clé factice de test (aucun rapport avec une vraie clé)
const fakeStore = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, raw: m }; };

describe('transfert de sauvegarde (Safari ⇄ application installée)', () => {
  it('aller-retour : la sauvegarde complète et la clé des photos sont restituées', () => {
    const s = defaultSave();
    s.hearts = 4321; s.story.step = 17;
    const code = encodeTransfer(s, KEY, 1_700_000_000_000);
    expect(code.startsWith(TRANSFER_PREFIX)).toBe(true);
    const d = decodeTransfer(code);
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect((d.payload.save as { hearts: number }).hearts).toBe(4321);
      expect(d.payload.key).toBe(KEY);
      expect(d.summary).toMatch(/photos incluses/);
    }
  });
  it('tolère les retours à la ligne et espaces ajoutés au collage', () => {
    const code = encodeTransfer(defaultSave(), null);
    const messy = `  ${code.slice(0, 40)}\n ${code.slice(40, 90)} \n${code.slice(90)}  `;
    expect(decodeTransfer(messy).ok).toBe(true);
  });
  it('sans clé de photos : pas de clé dans le code', () => {
    const d = decodeTransfer(encodeTransfer(defaultSave(), null));
    expect(d.ok && d.payload.key).toBeFalsy();
  });
  it('une clé invalide n\'est jamais écrite', () => {
    const d = decodeTransfer(encodeTransfer(defaultSave(), '<script>'));
    expect(d.ok && d.payload.key).toBeFalsy();
  });
  it('refuse un code étranger, tronqué, vide ou venant d\'une version plus récente', () => {
    expect(decodeTransfer('bonjour').ok).toBe(false);
    expect(decodeTransfer('').ok).toBe(false);
    const code = encodeTransfer(defaultSave(), KEY);
    expect(decodeTransfer(code.slice(0, code.length - 40)).ok).toBe(false);
    const future = encodeTransfer({ ...defaultSave(), v: 999 }, null);
    const f = decodeTransfer(future);
    expect(f.ok).toBe(false);
  });
  it('accepte une vieille sauvegarde (migration)', () => {
    const d = decodeTransfer(encodeTransfer({ v: 2, seenUpdates: ['v2'], story: { step: 80 }, levels: {}, hearts: 500 }, null));
    expect(d.ok).toBe(true);
  });
  it('applyTransfer : l\'ancienne sauvegarde est gardée de côté avant remplacement, clé écrite', () => {
    const store = fakeStore({ [SAVE_LS]: '{"v":5,"old":true}' });
    const d = decodeTransfer(encodeTransfer(defaultSave(), KEY));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(applyTransfer(d.payload, store)).toBe(true);
    expect(store.raw.get(BEFORE_IMPORT_LS)).toBe('{"v":5,"old":true}');
    expect(JSON.parse(store.raw.get(SAVE_LS)!).v).toBe(5);
    expect(store.raw.get(PHOTO_KEY_LS)).toBe(KEY);
  });
  it('applyTransfer : si le stockage refuse l\'écriture, on le signale (et rien d\'autre n\'est effacé)', () => {
    const d = decodeTransfer(encodeTransfer(defaultSave(), null));
    if (!d.ok) throw new Error('décodage');
    const full = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(applyTransfer(d.payload, full)).toBe(false);
  });
  it('décoder ne modifie aucun stockage', () => {
    const store = fakeStore({ [SAVE_LS]: 'X' });
    decodeTransfer(encodeTransfer(defaultSave(), KEY));
    expect(store.raw.get(SAVE_LS)).toBe('X');
  });
});
