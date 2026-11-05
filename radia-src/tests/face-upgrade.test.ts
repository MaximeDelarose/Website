import { describe, it, expect } from 'vitest';
import { defaultFace, previousDefaultFaces, upgradeUntouchedFace, sanitizeFace, sanitizeFaceRaw, canonicalFace, hasCustomStructure } from '../src/data/world/face';

describe('migration du visage de base → visage canonique unique', () => {
  it('un visage jamais retouché (anciennes bases) reçoit le visage de base actuel', () => {
    for (const p of previousDefaultFaces()) expect(sanitizeFace(upgradeUntouchedFace(sanitizeFaceRaw(p)))).toEqual(defaultFace());
  });
  it('une ancienne personnalisation de la STRUCTURE (yeux, bouche, forme, peau, sourcils, nez, cheveux) est ramenée à la tête canonique', () => {
    const f = defaultFace(); f.eyes.iris = '#2255AA'; f.eyes.spacing = -0.4; f.shape = 'heart'; f.skin.tone = 7; f.mouth.shape = 'wide'; f.nose.shape = 'button'; f.brows.shape = 'bold'; f.hairColor = '#D98AB0'; f.hairVolume = -1; f.refined = false;
    expect(hasCustomStructure(f)).toBe(true);
    const c = sanitizeFace(f);
    expect(hasCustomStructure(c)).toBe(false);
    expect(c).toEqual(defaultFace());
  });
  it('le maquillage, le rouge à lèvres et le voile sont conservés par la migration', () => {
    const f = defaultFace(); f.shape = 'long'; f.makeup.liner = 'bold'; f.makeup.shadow = '#C9A0D8'; f.makeup.blush = 0.7; f.mouth.lip = '#A8404E'; f.veil = { style: 'elegant', color: '#C9A0D8', elegant: true };
    const c = sanitizeFace(f);
    expect(c.shape).toBe(defaultFace().shape);
    expect(c.makeup).toEqual(f.makeup); expect(c.mouth.lip).toBe('#A8404E'); expect(c.veil).toEqual(f.veil);
  });
  it('le résultat est stable (idempotent) et canonicalFace ne touche jamais le maquillage', () => {
    const f = defaultFace(); f.makeup.shadow = '#E8B8A8';
    expect(canonicalFace(canonicalFace(f))).toEqual(canonicalFace(f));
    expect(upgradeUntouchedFace(defaultFace())).toEqual(defaultFace());
  });
});
