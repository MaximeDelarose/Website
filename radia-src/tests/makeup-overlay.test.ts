import { describe, it, expect } from 'vitest';
import { makeupSpec, hasMakeup, NO_MAKEUP } from '../src/game/world/makeupSpec';
import { defaultFace, sanitizeFace } from '../src/data/world/face';
import { sanitizeWorld } from '../src/save/schema';

describe('maquillage = surcouche légère, jamais un changement de tête', () => {
  it('réglage d\'origine, sans objet : AUCUNE surcouche (la tête reste exactement l\'illustration)', () => {
    const m = makeupSpec([], defaultFace());
    expect(m).toEqual(NO_MAKEUP); expect(hasMakeup(m)).toBe(false);
  });
  it('le trait « naturel » et le trait ailé ne dessinent rien de plus ; « appuyé » épaissit', () => {
    expect(makeupSpec(['el-wing'], defaultFace()).linerBold).toBe(false);
    expect(makeupSpec(['el-bold'], defaultFace()).linerBold).toBe(true);
    const f = defaultFace(); f.makeup.liner = 'bold'; expect(makeupSpec([], f).linerBold).toBe(true);
  });
  it('fards, rouge à lèvres et gloss : couleur de l\'objet porté', () => {
    expect(makeupSpec(['es-gold'], defaultFace()).shadow).toBe('#E8C168');
    expect(makeupSpec(['lp-red'], defaultFace()).lip).toEqual({ color: '#C4202F', gloss: false });
    expect(makeupSpec(['lp-gloss'], defaultFace()).lip?.gloss).toBe(true);
  });
  it('blush : seulement la part ajoutée au blush d\'origine ; plafonné', () => {
    const f = defaultFace(); expect(makeupSpec([], f).blush).toBeNull();
    f.makeup.blush = 1; const b = makeupSpec([], f).blush!; expect(b.alpha).toBeGreaterThan(0.2); expect(b.alpha).toBeLessThanOrEqual(0.6);
  });
  it('la couleur de rouge à lèvres du réglage n\'agit que si elle diffère de la base', () => {
    const f = defaultFace(); expect(makeupSpec([], f).lip).toBeNull();
    f.mouth.lip = '#A8404E'; expect(makeupSpec([], f).lip?.color).toBe('#A8404E');
    f.makeup.lipstick = false; expect(makeupSpec([], f).lip).toBeNull();
  });
  it('sauvegarde : yeux / bouche retirés du look porté et des looks enregistrés, visage ramené à la tête canonique, ancien réglage gardé en copie, achats conservés', () => {
    const face = defaultFace(); face.eyes.iris = '#2255AA'; face.shape = 'heart'; face.makeup.shadow = '#C9A0D8';
    const w = sanitizeWorld({ wardrobe: { owned: ['ey-blue', 'mo-wide', 'es-gold'], look: { acc: ['ey-blue', 'mo-wide', 'es-gold', 'el-soft'] }, looks: [{ name: 'a', look: { acc: ['mo-full', 'lp-red'] } }], face, faces: [{ name: 'x', face }] } });
    const wd = w.wardrobe;
    expect(wd.look.acc).toEqual(['es-gold']);
    expect(wd.looks[0]!.look.acc).toEqual(['lp-red']);
    expect(wd.face.eyes).toEqual(defaultFace().eyes); expect(wd.face.shape).toBe(defaultFace().shape); expect(wd.face.makeup.shadow).toBe('#C9A0D8');
    expect(wd.faces[0]!.face.eyes).toEqual(defaultFace().eyes);
    expect(wd.legacyFace?.eyes.iris).toBe('#2255AA'); // copie de l'ancien réglage : retour en arrière possible
    expect(wd.owned).toEqual(expect.arrayContaining(['ey-blue', 'mo-wide', 'es-gold'])); // rien n'est supprimé de l'inventaire
    const again = sanitizeWorld(JSON.parse(JSON.stringify(w)));
    expect(again.wardrobe.legacyFace).toEqual(wd.legacyFace); expect(again.wardrobe.face).toEqual(wd.face); // idempotent
  });
  it('un visage jamais retouché ne crée pas de copie', () => {
    expect(sanitizeWorld({ wardrobe: { face: sanitizeFace(null) } }).wardrobe.legacyFace ?? null).toBeNull();
  });
});
