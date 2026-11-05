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
