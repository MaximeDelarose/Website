import { describe, it, expect } from 'vitest';
import { paintedLookId as pid } from '../src/game/world/paintedLook';
import { DEFAULT_LOOK, type Look } from '../src/data/world/ids';

let faceOk = true;
const setFaceCustom = (ok: boolean) => { faceOk = ok; };
const paintedLookId = (l: Look) => pid(l, faceOk);
const ref: Look = { ...DEFAULT_LOOK, hair: 'hair-wavy', acc: [], crown: null };
describe('Radia peinte : la tenue doit correspondre à l\'illustration', () => {
  it('tenue de l\'illustration : sans couronne → char-radia-nc, couronne dorée → char-radia', () => {
    setFaceCustom(true);
    expect(paintedLookId(ref)).toBe('char-radia-nc');
    expect(paintedLookId({ ...ref, hair: 'hair-loose' })).toBe('char-radia-nc');
    expect(paintedLookId({ ...ref, crown: 'cr-gold' })).toBe('char-radia');
  });
  it('toute autre tenue, coiffure, accessoire ou couronne → dessin du dressing', () => {
    setFaceCustom(true);
    expect(paintedLookId({ ...ref, hair: 'hair-bun' })).toBeNull();
    expect(paintedLookId({ ...ref, top: 'top-tee-white' })).toBeNull();
    expect(paintedLookId({ ...ref, jacket: 'jk-track-red' })).toBeNull();
    expect(paintedLookId({ ...ref, dress: 'dr-pink-satin', top: null, bottom: null })).toBeNull();
    expect(paintedLookId({ ...ref, acc: ['ac-hoops'] })).toBeNull();
    expect(paintedLookId({ ...ref, crown: 'cr-tiara' })).toBeNull();
    expect(paintedLookId({ ...ref, bag: null })).toBeNull();
  });
  it('visage personnalisé → dessin (il suit les réglages de la joueuse)', () => {
    setFaceCustom(false);
    expect(paintedLookId(ref)).toBeNull();
    setFaceCustom(true);
  });
});

import { paintedHeadKind } from '../src/game/world/paintedLook';
import { accGroup } from '../src/data/world/ids';
describe('tête peinte sur toutes les tenues', () => {
  const k = (l: Look, ok = true) => paintedHeadKind(l, ok, accGroup);
  it('cheveux longs : tête complète peinte (couronne dorée comprise ou non), quelle que soit la tenue', () => {
    expect(k({ ...ref, top: null, bottom: 'bot-track-red', jacket: 'jk-track-red' })).toBe('head');
    expect(k({ ...ref, crown: 'cr-gold', dress: 'dr-pink-satin', top: null, bottom: null })).toBe('head-crown');
    expect(k({ ...ref, hair: 'hair-loose', acc: ['ac-pearls'] })).toBe('head'); // collier : n'est pas sur la tête
  });
  it('autre coiffure, autre couronne, boucles / lunettes / accessoire de tête : visage peint seul, le reste dessiné', () => {
    expect(k({ ...ref, hair: 'hair-bun' })).toBe('face');
    expect(k({ ...ref, crown: 'cr-tiara' })).toBe('face');
    expect(k({ ...ref, acc: ['ac-hoops'] })).toBe('face');
    expect(k({ ...ref, acc: ['ac-sunglasses'] })).toBe('face');
  });
  it('visage personnalisé ou maquillage du dressing : dessin (il suit ces réglages)', () => {
    expect(k(ref, false)).toBeNull();
    expect(k({ ...ref, acc: ['lp-red'] })).toBeNull();
    expect(k({ ...ref, acc: ['ey-blue'] })).toBeNull();
  });
});
