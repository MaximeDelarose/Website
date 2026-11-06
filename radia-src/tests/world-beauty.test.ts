import { describe, it, expect, vi } from 'vitest';
import { accGroup, CLOTH_IDS, CLOTH_SLOTS, EYE_COLOR, MOUTH_SHAPE, LINER_STYLE, SHADOW_COLOR, DEFAULT_LOOK, isRetiredFaceItem, type Look } from '../src/data/world/ids';
import { CLOTHES } from '../src/data/world/wardrobe';
import { applyItem, repairLook, MAX_ACC } from '../src/game/world/wardrobe';

vi.mock('../src/audio/AudioManager', () => ({ AudioManager: class {}, audio: { play() {}, setSettings() {} } }));
vi.stubGlobal('window', globalThis);
const look = (o: Partial<Look> = {}): Look => ({ ...DEFAULT_LOOK, acc: [], ...o });

describe('beauté : maquillage léger (yeux et bouche retirés)', () => {
  it('chaque option a une famille, une fiche et une valeur de rendu', () => {
    for (const id of Object.keys(EYE_COLOR)) { expect(accGroup(id)).toBe('eyes'); expect(CLOTHES[id as keyof typeof CLOTHES]).toBeTruthy(); }
    for (const id of Object.keys(MOUTH_SHAPE)) expect(accGroup(id)).toBe('mouth');
    for (const id of Object.keys(LINER_STYLE)) expect(accGroup(id)).toBe('liner');
    for (const id of Object.keys(SHADOW_COLOR)) expect(accGroup(id)).toBe('shadow');
    for (const id of CLOTH_IDS.filter((c) => /^(ey|mo|el|es)-/.test(c))) expect(CLOTH_SLOTS[id]).toBe('acc');
  });
  it('les yeux, la bouche et le trait sont gratuits ; les fards coûtent peu', () => {
    for (const id of [...Object.keys(EYE_COLOR), ...Object.keys(MOUTH_SHAPE), ...Object.keys(LINER_STYLE)]) { const d = CLOTHES[id as keyof typeof CLOTHES]; expect(d.free).toBe(true); expect(d.coins).toBe(0); }
    for (const id of Object.keys(SHADOW_COLOR)) expect(CLOTHES[id as keyof typeof CLOTHES].coins).toBeLessThanOrEqual(60);
  });
  it('un seul objet par famille : choisir un nouveau fard remplace le précédent', () => {
    let l = applyItem(look(), 'es-rose');
    l = applyItem(l, 'es-gold');
    expect(l.acc.filter((a) => a.startsWith('es-'))).toEqual(['es-gold']);
    l = applyItem(l, 'lp-red'); l = applyItem(l, 'lp-gloss');
    expect(l.acc.filter((a) => a.startsWith('lp-'))).toEqual(['lp-gloss']);
    expect(l.acc).toContain('es-gold');
  });
  it('toutes les familles de maquillage et d\'accessoires peuvent être portées ensemble sans rien perdre', () => {
    let l = look();
    for (const id of ['el-bold', 'es-gold', 'lp-red', 'gl-aviator', 'ea-hearts', 'hd-bow-pink', 'ac-pendant', 'br-promise'] as const) l = applyItem(l, id);
    const r = repairLook(l);
    expect(r.acc.length).toBe(8);
    expect(MAX_ACC).toBeGreaterThanOrEqual(8);
  });
  it('visage canonique : les yeux, la bouche et les traits « naturels » ne s\'équipent plus (ils changeaient la tête) — rien n\'est perdu des achats', () => {
    for (const id of ['ey-hazel', 'ey-blue', 'mo-cupid', 'mo-wide', 'el-soft', 'el-none', 'el-wing'] as const) {
      expect(isRetiredFaceItem(id)).toBe(true);
      expect(repairLook({ ...look(), acc: [id] }).acc).toEqual([]);
    }
    for (const id of ['el-bold', 'es-gold', 'lp-red', 'lp-gloss'] as const) { expect(isRetiredFaceItem(id)).toBe(false); expect(repairLook({ ...look(), acc: [id] }).acc).toEqual([id]); }
  });
});
