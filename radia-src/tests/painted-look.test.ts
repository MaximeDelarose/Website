import { describe, it, expect } from 'vitest';
import { paintedLookId as pid } from '../src/game/world/paintedLook';
import { DEFAULT_LOOK, type Look } from '../src/data/world/ids';

let noVeil = true;
const setFaceCustom = (ok: boolean) => { noVeil = ok; };
const paintedLookId = (l: Look) => pid(l, noVeil);
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
  it('un voile remplace les cheveux → dessin ; le maquillage (acc ou réglage) ne change rien : l\'illustration reste la référence', () => {
    setFaceCustom(false);
    expect(paintedLookId(ref)).toBeNull();
    setFaceCustom(true);
    expect(paintedLookId(ref)).toBe('char-radia-nc'); // maquillage du réglage : surcouche, même illustration
  });
});

import { paintedHeadKind } from '../src/game/world/paintedLook';
import { accGroup } from '../src/data/world/ids';
describe('tête peinte sur toutes les tenues', () => {
  const k = (l: Look, veil = false) => paintedHeadKind(l, veil, accGroup);
  it('cheveux longs : tête complète peinte, quelle que soit la tenue ET quelle que soit la couronne', () => {
    expect(k({ ...ref, top: null, bottom: 'bot-track-red', jacket: 'jk-track-red' })).toBe('head');
    for (const crown of [null, 'cr-gold', 'cr-flowers', 'cr-tiara'] as const) expect(k({ ...ref, crown })).toBe('head'); // la couronne ne change JAMAIS le mode
    expect(k({ ...ref, hair: 'hair-loose', acc: ['ac-pearls'] })).toBe('head'); // collier : pas sur la tête
  });
  it('lunettes et boucles sont des calques ancrés sur le visage : ils ne changent pas le mode', () => {
    expect(k({ ...ref, acc: ['ac-hoops'] })).toBe('head');
    expect(k({ ...ref, acc: ['ac-sunglasses'] })).toBe('head');
    expect(k({ ...ref, acc: ['gl-aviator', 'ea-drop-gold'] })).toBe('head');
  });
  it('autre coiffure ou accessoire de cheveux : visage peint seul, coiffure dessinée autour', () => {
    expect(k({ ...ref, hair: 'hair-bun' })).toBe('face');
    expect(k({ ...ref, hair: 'hair-bun', crown: 'cr-tiara' })).toBe('face');
    expect(k({ ...ref, acc: ['hd-bandana-pink'] })).toBe('face');
    expect(k({ ...ref, acc: ['hd-beret'] })).toBe('face');
  });
  it('le MAQUILLAGE (rouge à lèvres, fard, eye-liner) ne remplace jamais la tête : même mode que sans maquillage', () => {
    for (const acc of [['lp-red'], ['lp-gloss'], ['es-gold'], ['el-bold'], ['lp-rose', 'es-smoky', 'el-bold']] as const) {
      expect(k({ ...ref, acc: [...acc] })).toBe('head');
      expect(k({ ...ref, hair: 'hair-bun', acc: [...acc] })).toBe('face');
    }
  });
  it('un voile remplace les cheveux : visage peint seul', () => {
    expect(k(ref, true)).toBe('face');
  });
});
