/**
 * Personnalisation du visage de Radia (« Personnaliser Radia ») : modèle de données PUR (aucun DOM), bornes, préréglages,
 * nettoyage tolérant de sauvegarde et calcul des teintes de peau. Le dessin (src/game/art/characters.ts) lit ces valeurs ;
 * `defaultFace()` redonne EXACTEMENT l'apparence d'origine, donc une sauvegarde sans personnalisation ne change pas d'un pixel.
 */
export type FaceShape = 'round' | 'oval' | 'long' | 'heart' | 'square' | 'slim' | 'wide';
export type EyeShape = 'almond' | 'round' | 'long' | 'down' | 'up';
export type BrowShape = 'soft' | 'arched' | 'straight' | 'thin' | 'bold';
export type NoseShape = 'fine' | 'round' | 'straight' | 'button';
export type MouthShape = 'natural' | 'full' | 'thin' | 'cupid' | 'wide' | 'closed';
export type LinerStyle = 'none' | 'soft' | 'wing' | 'bold';
export type VeilStyle = 'none' | 'simple' | 'long' | 'elegant' | 'silk';

export interface FaceCustom {
  /** Peau : teinte de base (0–8) + réglages fins −1…+1. */
  skin: { tone: number; hue: number; light: number; sat: number; warm: number };
  shape: FaceShape;
  eyes: { shape: EyeShape; size: number; spacing: number; iris: string; irisSize: number };
  brows: { shape: BrowShape; thick: number; curve: number; color: string };
  nose: { shape: NoseShape; size: number; width: number; length: number };
  mouth: { shape: MouthShape; fullness: number; width: number; lip: string };
  /** Couleur des cheveux ('' = couleur d'origine du dessin). */
  hairColor: string;
  /** Volume des cheveux −1…+1 (0 = d'origine). */
  hairVolume: number;
  /** Rendu affiné (ombrages du visage plus riches, même niveau de détail qu'Auguste). Faux = ancien dessin, identique à l'original. */
  refined: boolean;
  veil: { style: VeilStyle; color: string; elegant: boolean };
  makeup: { liner: LinerStyle; shadow: string; blush: number; blushColor: string; mascara: number; lipstick: boolean; intensity: number };
}

// ------------------------------------------------------------------ préréglages
export const SKIN_TONES: readonly { id: number; name: string; base: string }[] = [
  { id: 0, name: 'Porcelaine', base: '#F3D2B8' }, { id: 1, name: 'Ivoire', base: '#EFC8A6' }, { id: 2, name: 'Beige clair', base: '#E8B995' },
  { id: 3, name: 'Doré', base: '#DDA77F' }, { id: 4, name: 'Caramel (d\'origine)', base: '#D8A17D' }, { id: 5, name: 'Hâlé', base: '#C98B63' },
  { id: 6, name: 'Cannelle', base: '#B87650' }, { id: 7, name: 'Brun', base: '#9A5E3E' }, { id: 8, name: 'Ébène', base: '#7A4630' },
];
export const ORIGINAL_TONE = 4;
export const FACE_SHAPES: readonly { id: FaceShape; name: string }[] = [
  { id: 'round', name: 'Rond' }, { id: 'oval', name: 'Ovale' }, { id: 'long', name: 'Allongé' }, { id: 'heart', name: 'Cœur' },
  { id: 'square', name: 'Carré' }, { id: 'slim', name: 'Plus fin' }, { id: 'wide', name: 'Plus large' },
];
export const EYE_SHAPES: readonly { id: EyeShape; name: string }[] = [
  { id: 'almond', name: 'Amande' }, { id: 'round', name: 'Plus ronds' }, { id: 'long', name: 'Plus étirés' }, { id: 'down', name: 'Tombants' }, { id: 'up', name: 'Relevés' },
];
export const BROW_SHAPES: readonly { id: BrowShape; name: string }[] = [
  { id: 'soft', name: 'Doux' }, { id: 'arched', name: 'Arqués' }, { id: 'straight', name: 'Droits' }, { id: 'thin', name: 'Fins' }, { id: 'bold', name: 'Marqués' },
];
export const NOSE_SHAPES: readonly { id: NoseShape; name: string }[] = [{ id: 'fine', name: 'Fin' }, { id: 'round', name: 'Arrondi' }, { id: 'straight', name: 'Droit' }, { id: 'button', name: 'Petit' }];
export const MOUTH_SHAPES: readonly { id: MouthShape; name: string }[] = [{ id: 'natural', name: 'Naturelle' }, { id: 'full', name: 'Pulpeuse' }, { id: 'thin', name: 'Fine' }, { id: 'cupid', name: 'Arc de Cupidon' }, { id: 'wide', name: 'Grand sourire' }, { id: 'closed', name: 'Discrète' }];
export const LINER_STYLES: readonly { id: LinerStyle; name: string }[] = [{ id: 'none', name: 'Aucun' }, { id: 'soft', name: 'Doux' }, { id: 'wing', name: 'Ailé' }, { id: 'bold', name: 'Marqué' }];
export const VEIL_STYLES: readonly { id: VeilStyle; name: string }[] = [{ id: 'none', name: 'Aucun' }, { id: 'simple', name: 'Simple' }, { id: 'long', name: 'Long' }, { id: 'elegant', name: 'Élégant' }, { id: 'silk', name: 'Foulard de soie' }];
export const EYE_COLORS = ['#5A3520', '#3E2A1E', '#7A5A2A', '#4F7A5A', '#4A78A8', '#6F9490', '#8A8F96', '#6B3F7A'] as const;
export const BROW_COLORS = ['#33201A', '#1B100C', '#4A3022', '#6B4A32', '#8A6A48', '#3B2A3E'] as const;
export const HAIR_COLORS = ['#2A1A12', '#4A2C1A', '#6B4228', '#8C5A33', '#B07A45', '#C9A36B', '#E3C48F', '#2F2A3A', '#7A3B2E', '#B04A4A', '#8A5FA8', '#D98AB0'] as const;
export const LIP_COLORS = ['#C9807A', '#B85C62', '#D9798A', '#A8404E', '#E8A094', '#8A4A55', '#D86A5A', '#F2B8C0'] as const;
export const SHADOW_COLORS = ['', '#E8B8A8', '#C9A0D8', '#8FB8D8', '#D8B86A', '#8A6A5A', '#E88AA8'] as const;
export const BLUSH_COLORS = ['#F08A98', '#E8A094', '#F2A8C0', '#D9798A', '#E8B070'] as const;
export const VEIL_COLORS = ['#FFFFFF', '#F5E6D8', '#E8B8C8', '#C9A0D8', '#9FB8D8', '#7FB89A', '#8A6A5A', '#2F2A3A', '#B04A5A', '#D8B86A'] as const;

// ------------------------------------------------------------------ valeurs d'origine
/** L'ANCIEN visage de Radia (dessin d'origine) : strictement identique à l'ancien rendu, toujours disponible (« Ancien style »). */
export function classicFace(): FaceCustom {
  return {
    skin: { tone: ORIGINAL_TONE, hue: 0, light: 0, sat: 0, warm: 0 },
    shape: 'round',
    eyes: { shape: 'almond', size: 0, spacing: 0, iris: '#5A3520', irisSize: 0 },
    brows: { shape: 'soft', thick: 0, curve: 0, color: '#33201A' },
    nose: { shape: 'fine', size: 0, width: 0, length: 0 },
    mouth: { shape: 'natural', fullness: 0, width: 0, lip: '#C9807A' },
    hairColor: '',
    hairVolume: 0,
    refined: false,
    veil: { style: 'none', color: '#E8B8C8', elegant: false },
    makeup: { liner: 'wing', shadow: '', blush: 0, blushColor: '#F08A98', mascara: 0, lipstick: true, intensity: 0 },
  };
}

/**
 * Le NOUVEAU visage de base de Radia (inspiré de ses photos, dans la direction artistique du jeu) : visage ovale plus fin, yeux en amande
 * un peu étirés et expressifs, sourcils arqués mieux dessinés, nez fin, lèvres plus pulpeuses, teint doré chaud, cheveux bruns foncés
 * pleins de volume, ombrages affinés. Tous les réglages restent modifiables dans « Personnaliser Radia ».
 */
export function defaultFace(): FaceCustom {
  // Base commune avec Auguste : peau crème en dégradé léger, yeux petits au contour fin, sourcils fins, trait léger.
  return {
    skin: { tone: 2, hue: 0, light: 0.04, sat: -0.05, warm: 0.05 },
    shape: 'oval',
    eyes: { shape: 'almond', size: -0.55, spacing: 0.45, iris: '#4A2E1E', irisSize: 0.1 },
    brows: { shape: 'soft', thick: -0.2, curve: 0, color: '#2A1A14' },
    nose: { shape: 'fine', size: -0.1, width: -0.2, length: 0 },
    mouth: { shape: 'full', fullness: 0.3, width: 0.1, lip: '#C27E80' },
    hairColor: '#6B4228',
    hairVolume: 0.35,
    refined: true,
    veil: { style: 'none', color: '#E8B8C8', elegant: false },
    makeup: { liner: 'soft', shadow: '', blush: 0.3, blushColor: '#E8A094', mascara: 0.05, lipstick: true, intensity: 0 },
  };
}

/** Anciennes bases (versions précédentes de ce build). Servent UNIQUEMENT à reconnaître un visage jamais retouché. */
export function previousDefaultFaces(): FaceCustom[] {
  const base = { ...defaultFace() };
  const v1: FaceCustom = { ...base, skin: { tone: 3, hue: 0, light: 0.02, sat: -0.05, warm: 0.1 }, eyes: { shape: 'almond', size: 0.06, spacing: -0.1, iris: '#4A2E1E', irisSize: 0.22 }, brows: { shape: 'arched', thick: 0.25, curve: 0.2, color: '#2A1A14' }, mouth: { shape: 'full', fullness: 0.3, width: 0.1, lip: '#B8707A' }, hairColor: '#4B2E1E', makeup: { liner: 'wing', shadow: '', blush: 0.2, blushColor: '#E8A094', mascara: 0.1, lipstick: true, intensity: 0 } };
  const v2: FaceCustom = { ...v1, eyes: { ...v1.eyes, size: -0.3, spacing: 0.6 } };
  return [v1, v2];
}

// ------------------------------------------------------------------ nettoyage tolérant (une sauvegarde ancienne ou corrompue ne casse rien)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const oneOf = <T extends string>(v: unknown, list: readonly { id: T }[], d: T): T => (typeof v === 'string' && list.some((x) => x.id === v) ? (v as T) : d);
const HEX = /^#[0-9a-fA-F]{6}$/;
const hex = (v: unknown, d: string, allowEmpty = false): string => (typeof v === 'string' && (HEX.test(v) || (allowEmpty && v === '')) ? v : d);
const slider = (v: unknown, d = 0): number => Math.round(num(v, d, -1, 1) * 100) / 100;

export function sanitizeFace(raw: unknown): FaceCustom {
  const d = defaultFace();
  if (!isObj(raw)) return d;
  const sk = isObj(raw.skin) ? raw.skin : {};
  const ey = isObj(raw.eyes) ? raw.eyes : {};
  const br = isObj(raw.brows) ? raw.brows : {};
  const no = isObj(raw.nose) ? raw.nose : {};
  const mo = isObj(raw.mouth) ? raw.mouth : {};
  const ve = isObj(raw.veil) ? raw.veil : {};
  const mk = isObj(raw.makeup) ? raw.makeup : {};
  return {
    skin: { tone: Math.round(num(sk.tone, d.skin.tone, 0, SKIN_TONES.length - 1)), hue: slider(sk.hue), light: slider(sk.light), sat: slider(sk.sat), warm: slider(sk.warm) },
    shape: oneOf(raw.shape, FACE_SHAPES, d.shape),
    eyes: { shape: oneOf(ey.shape, EYE_SHAPES, d.eyes.shape), size: slider(ey.size), spacing: slider(ey.spacing), iris: hex(ey.iris, d.eyes.iris), irisSize: slider(ey.irisSize) },
    brows: { shape: oneOf(br.shape, BROW_SHAPES, d.brows.shape), thick: slider(br.thick), curve: slider(br.curve), color: hex(br.color, d.brows.color) },
    nose: { shape: oneOf(no.shape, NOSE_SHAPES, d.nose.shape), size: slider(no.size), width: slider(no.width), length: slider(no.length) },
    mouth: { shape: oneOf(mo.shape, MOUTH_SHAPES, d.mouth.shape), fullness: slider(mo.fullness), width: slider(mo.width), lip: hex(mo.lip, d.mouth.lip) },
    hairColor: hex(raw.hairColor, d.hairColor, true),
    hairVolume: slider(raw.hairVolume, d.hairVolume),
    refined: typeof raw.refined === 'boolean' ? raw.refined : d.refined,
    veil: { style: oneOf(ve.style, VEIL_STYLES, 'none'), color: hex(ve.color, d.veil.color), elegant: ve.elegant === true },
    makeup: { liner: oneOf(mk.liner, LINER_STYLES, d.makeup.liner), shadow: hex(mk.shadow, '', true), blush: Math.round(num(mk.blush, 0, 0, 1) * 100) / 100, blushColor: hex(mk.blushColor, d.makeup.blushColor), mascara: Math.round(num(mk.mascara, 0, 0, 1) * 100) / 100, lipstick: mk.lipstick !== false, intensity: slider(mk.intensity) },
  };
}

/** Visage jamais personnalisé (égal à une ancienne base) → reçoit la base actuelle ; un visage retouché par la joueuse n'est JAMAIS remplacé. */
export function upgradeUntouchedFace(f: FaceCustom): FaceCustom { const k = JSON.stringify(f); return previousDefaultFaces().some((p) => JSON.stringify(p) === k) ? defaultFace() : f; }

/** Clé de cache (le dessin de l'avatar est mis en cache : toute modification de visage doit changer la clé). */
export const faceKey = (f: FaceCustom): string => JSON.stringify(f);
/** Vrai si le visage est identique au nouveau visage de base (aucune personnalisation). */
export const isDefaultFace = (f: FaceCustom): boolean => faceKey(f) === faceKey(defaultFace());
export const isClassicFace = (f: FaceCustom): boolean => faceKey(f) === faceKey(classicFace());

// ------------------------------------------------------------------ peau : teinte de base + réglages fins → trois nuances (ombre, base, lumière)
export function hexToRgb(h: string): [number, number, number] { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgbToHex(r: number, g: number, b: number): string { const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'); return `#${c(r)}${c(g)}${c(b)}`; }
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  return [h, s, l];
}
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
  const f = (t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
export interface SkinPalette { base: string; shade: string; light: string }
/** Nuances de peau : teinte choisie, puis teinte (±12°), luminosité (±14 %), saturation (±25 %) et chaleur (±8° vers l'orange / le rose). */
export const ORIGINAL_SKIN: SkinPalette = { base: '#D8A17D', shade: '#B87C5A', light: '#EDBF9E' };
export function skinPalette(s: FaceCustom['skin']): SkinPalette {
  // teinte d'origine sans réglage : EXACTEMENT les trois couleurs du dessin d'origine (aucun pixel ne change)
  if (Math.round(s.tone) === ORIGINAL_TONE && !s.hue && !s.light && !s.sat && !s.warm) return ORIGINAL_SKIN;
  const tone = SKIN_TONES[Math.max(0, Math.min(SKIN_TONES.length - 1, Math.round(s.tone)))];
  const [r, g, b] = hexToRgb(tone.base);
  let [h, sa, l] = rgbToHsl(r, g, b);
  h = (h + (s.hue * 12 + s.warm * -6) / 360 + 1) % 1;
  sa = Math.max(0, Math.min(1, sa * (1 + s.sat * 0.25)));
  l = Math.max(0.08, Math.min(0.92, l + s.light * 0.14));
  const mk = (dl: number, ds: number) => rgbToHex(...hslToRgb(h, Math.max(0, Math.min(1, sa + ds)), Math.max(0.05, Math.min(0.96, l + dl))));
  return { base: mk(0, 0), shade: mk(-0.12, 0.04), light: mk(0.1, -0.04) };
}
