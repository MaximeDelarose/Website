/**
 * Snapchien — illustrations des snaps des garçons (portraits Tindeur réutilisés : même visage, même identité) dans différentes scènes
 * humoristiques et NON explicites : miroir de la salle, tracteur, abdos, pose, salle de bain, photo « par hasard », nouvelle coupe…
 */
import { drawPortrait } from '../../../events/tindeur/swipe/art';
import { profileById } from '../../../events/tindeur/swipe/data';
import type { Look } from '../../../events/tindeur/swipe/types';
import { canvasUrl, makeCanvas } from '../../../game/art/kit';
import { contactById, type ChatContact, type SceneId } from './data';

/** Réglages de scène (surchargent l'apparence du contact). */
export const SCENE_LOOK: Record<SceneId, Partial<Look>> = {
  mirror: { outfit: 'bare', bg: 'gym', bgc: ['#D6E4F7', '#8FA9D6'], prop: 'none', mood: 'smirk' },
  tractor: { outfit: 'bare', bg: 'field', bgc: ['#CDE8FF', '#9ECF7A'], prop: 'tractor', mood: 'grin' },
  abs: { outfit: 'abs', bg: 'gym', bgc: ['#E6DDF5', '#9A86C8'], prop: 'dumbbell', mood: 'proud' },
  pose: { outfit: 'bare', bg: 'sunset', bgc: ['#FFD9B8', '#F28FA6'], prop: 'none', mood: 'wink' },
  bath: { outfit: 'bare', bg: 'room', bgc: ['#DDF0F0', '#9ACFD0'], prop: 'none', mood: 'calm' },
  oops: { outfit: 'bare', bg: 'room', bgc: ['#FBE3D0', '#E8A98A'], prop: 'phone', mood: 'surprised' },
  haircut: { outfit: 'bare', bg: 'shop', bgc: ['#FFE0C9', '#F1A98A'], prop: 'none', mood: 'grin' },
  sport: { outfit: 'tank', bg: 'lake', bgc: ['#CFEAFB', '#7FB7E8'], prop: 'dumbbell', mood: 'proud' },
  funny: { outfit: 'tee', bg: 'room', bgc: ['#FFE6F0', '#F0A7C4'], prop: 'controller', mood: 'tongue' },
  selfie: { outfit: 'tee', bg: 'city', bgc: ['#DCE8FF', '#9CB4E8'], prop: 'none', mood: 'smile' },
  car: { outfit: 'tee', bg: 'car', bgc: ['#CDE8FF', '#9ECF7A'], prop: 'none', mood: 'smile' },
  resto: { outfit: 'shirt', bg: 'resto', bgc: ['#FFE9CF', '#F0A97A'], prop: 'plate', mood: 'grin' },
  outfit: { outfit: 'blazer', bg: 'room', bgc: ['#F0E6FF', '#B9A2E8'], prop: 'none', mood: 'proud' },
  pet: { outfit: 'tee', bg: 'room', bgc: ['#FFF0DA', '#F2B98A'], prop: 'dog', mood: 'smile' },
};

/** Apparence d'un contact : profil Tindeur (même personnage) ou apparence propre (Enzo). */
export function lookOf(c: ChatContact): Look {
  return profileById(c.id)?.look ?? c.look ?? { skin: '#E8B48A', hair: 'short', hairColor: '#3A2A22', outfit: 'tee', top: '#4C7FD0', mood: 'smile', bg: 'city', bgc: ['#DCE8FF', '#9CB4E8'] };
}

const SCALE = 1.5;
export function selfieCanvas(c: ChatContact, scene: SceneId): HTMLCanvasElement {
  const cv = makeCanvas(300 * SCALE, 400 * SCALE);
  const g = cv.getContext('2d')!; g.scale(SCALE, SCALE);
  const base = lookOf(c);
  const sl = { ...SCENE_LOOK[scene], ...(scene === 'pet' ? { prop: ([...c.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 2 ? 'cat' : 'dog') as Look['prop'] } : {}) };
  // une tenue de scène « neutre » garde la couleur du haut du contact
  drawPortrait(g, { ...base, ...sl, top: base.top, glasses: scene === 'abs' || scene === 'tractor' ? 'none' : base.glasses, acc: scene === 'haircut' || scene === 'pose' || scene === 'bath' || scene === 'mirror' ? 'none' : base.acc });
  return cv;
}
export const selfieUrl = (contactId: string, scene: SceneId): string => {
  const c = contactById(contactId); if (!c) return '';
  return canvasUrl(`snp:selfie:${contactId}:${scene}`, () => selfieCanvas(c, scene));
};

/** Pastille ronde (visage) du contact. */
export type AvatarMood = Look['mood'];
/** Avatar dessiné (même personnage que son profil Tindeur) avec une expression : sourire, clin d'œil, surpris, langue tirée… */
export function faceUrl(contactId: string, size = 96, mood?: AvatarMood): string {
  const c = contactById(contactId); if (!c) return '';
  return canvasUrl(`snp:face:${contactId}:${size}${mood ? ':' + mood : ''}`, () => {
    const out = makeCanvas(size, size); const g = out.getContext('2d')!;
    const src = makeCanvas(300 * SCALE, 400 * SCALE); const sg = src.getContext('2d')!; sg.scale(SCALE, SCALE);
    drawPortrait(sg, { ...lookOf(c), outfit: 'tee', ...(mood ? { mood } : {}) });
    g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.clip();
    g.drawImage(src, 52 * SCALE, 26 * SCALE, 196 * SCALE, 196 * SCALE, 0, 0, size, size);
    return out;
  });
}
