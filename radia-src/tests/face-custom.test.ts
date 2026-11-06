import { describe, it, expect } from 'vitest';
import { classicFace, defaultFace, faceKey, hexToRgb, isDefaultFace, ORIGINAL_SKIN, rgbToHsl, sanitizeFace, skinPalette, SKIN_TONES, FACE_SHAPES, EYE_SHAPES, BROW_SHAPES, NOSE_SHAPES, MOUTH_SHAPES, VEIL_STYLES, HAIR_COLORS, EYE_COLORS, LIP_COLORS, VEIL_COLORS } from '../src/data/world/face';

const lum = (hex: string) => rgbToHsl(...hexToRgb(hex))[2];
describe('personnalisation du visage : données', () => {
  it('l\'ANCIEN dessin (classicFace) garde la peau exacte d\'origine ; le nouveau visage de base est ovale, affiné, brun chaud et plein de volume', () => {
    expect(skinPalette(classicFace().skin)).toEqual(ORIGINAL_SKIN);
    expect(classicFace().refined).toBe(false); expect(classicFace().hairVolume).toBe(0);
    const f = defaultFace();
    expect(isDefaultFace(f)).toBe(true);
    expect(f.shape).toBe('oval'); expect(f.brows.shape).toBe('soft'); expect(f.mouth.shape).toBe('full');
    expect(f.refined).toBe(true); expect(f.hairVolume).toBeGreaterThan(0); expect(f.hairColor).not.toBe('');
    expect(skinPalette(f.skin)).not.toEqual(ORIGINAL_SKIN);
  });
  it('catalogue : formes de visage, yeux, sourcils, nez, bouche, voiles, couleurs variées', () => {
    expect(SKIN_TONES.length).toBeGreaterThanOrEqual(8);
    expect(FACE_SHAPES.map((x) => x.id)).toEqual(['round', 'oval', 'long', 'heart', 'square', 'slim', 'wide']);
    expect(EYE_SHAPES.length).toBe(5); expect(BROW_SHAPES.length).toBe(5); expect(NOSE_SHAPES.length).toBeGreaterThanOrEqual(4); expect(MOUTH_SHAPES.length).toBe(6); expect(MOUTH_SHAPES[0].id).toBe('natural');
    expect(VEIL_STYLES.length).toBeGreaterThanOrEqual(4);
    expect(HAIR_COLORS.length).toBeGreaterThanOrEqual(10); expect(EYE_COLORS.length).toBeGreaterThanOrEqual(6); expect(LIP_COLORS.length).toBeGreaterThanOrEqual(6); expect(VEIL_COLORS.length).toBeGreaterThanOrEqual(8);
  });
  it('teintes de peau : de plus en plus foncées, chaque nuance plus sombre que la lumière', () => {
    const ls = SKIN_TONES.map((t) => lum(t.base));
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeLessThan(ls[i - 1]);
    for (let t = 0; t < SKIN_TONES.length; t++) { const p = skinPalette({ tone: t, hue: 0, light: 0, sat: 0, warm: 0 }); expect(lum(p.shade)).toBeLessThan(lum(p.base)); expect(lum(p.light)).toBeGreaterThan(lum(p.base)); }
  });
  it('réglages fins : luminosité et saturation vont dans le bon sens, bornés', () => {
    const base = { tone: 3, hue: 0, light: 0, sat: 0, warm: 0 };
    expect(lum(skinPalette({ ...base, light: 1 }).base)).toBeGreaterThan(lum(skinPalette(base).base));
    expect(lum(skinPalette({ ...base, light: -1 }).base)).toBeLessThan(lum(skinPalette(base).base));
    expect(rgbToHsl(...hexToRgb(skinPalette({ ...base, sat: 1 }).base))[1]).toBeGreaterThan(rgbToHsl(...hexToRgb(skinPalette(base).base))[1]);
    expect(skinPalette({ ...base, hue: 1, warm: 1 }).base).not.toBe(skinPalette(base).base);
    for (const v of [-5, 5]) expect(skinPalette({ ...base, light: v, sat: v, hue: v, warm: v }).base).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('nettoyage : absent, corrompu ou hors bornes → valeurs valides, sans exception ; la structure est toujours canonique', () => {
    for (const raw of [undefined, null, 5, 'x', [], { skin: 7, eyes: 'x' }]) expect(() => sanitizeFace(raw)).not.toThrow();
    expect(isDefaultFace(sanitizeFace(null))).toBe(true);
    const f = sanitizeFace({ shape: 'triangle', skin: { tone: 99, light: 9, hue: -9 }, eyes: { shape: 'rond?', size: 5, iris: 'rouge' }, hairColor: 'blond', veil: { style: 'tchador', color: 'zz' }, makeup: { blush: 9, shadow: 'x', liner: 'zzz' } });
    expect(f.shape).toBe(defaultFace().shape); expect(f.skin).toEqual(defaultFace().skin); expect(f.eyes).toEqual(defaultFace().eyes); expect(f.hairColor).toBe(defaultFace().hairColor);
    expect(f.veil.style).toBe('none'); expect(f.makeup.blush).toBe(1); expect(f.makeup.shadow).toBe(''); expect(f.makeup.liner).toBe(defaultFace().makeup.liner);
  });
  it('aller-retour JSON identique ; la clé de cache change dès qu\'un réglage de maquillage ou de voile change (jamais pour la structure)', () => {
    const f = defaultFace(); f.makeup.blush = 0.6; f.makeup.shadow = '#E8B8A8'; f.veil = { style: 'elegant', color: '#C9A0D8', elegant: true };
    expect(sanitizeFace(JSON.parse(JSON.stringify(f)))).toEqual(f);
    expect(faceKey(f)).not.toBe(faceKey(defaultFace()));
    const g = JSON.parse(JSON.stringify(f)); g.makeup.blush = 0.5; expect(faceKey(sanitizeFace(g))).not.toBe(faceKey(f));
    const h = JSON.parse(JSON.stringify(f)); h.eyes.size = 0.5; h.shape = 'heart'; expect(faceKey(sanitizeFace(h))).toBe(faceKey(f)); // structure ignorée
  });
});
