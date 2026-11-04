/**
 * Snapchien : état sauvegardé (`fun.apps.snap`) — photos retouchées (autocollants), stories, moments proposés,
 * brouillons. Pur (aucun DOM). Jamais d'enfant : les photos Snap n'ont aucun enfant (`kids` vide) et tout
 * texte évoquant un enfant est refusé. Sanitisation tolérante, bornes strictes (40 photos, 60 stories).
 */
import { assignInPlace, cleanText, hash, isObj, mentionsChild, num, pick, pickN, rng, str } from '../util';
import { POSES, FRAMES, FILTERS } from '../../events/photo/data';

export const MAX_PHOTOS = 40;
export const MAX_STORIES = 60;
export const MAX_PENDING = 12;
export const MAX_STICKERS = 14;
export const PENDING_TTL = 3 * 24 * 3_600_000;

// ---------------------------------------------------------------- catalogue
export const SHAPE_STICKERS = [
  { k: 'heart', label: 'Cœur', anim: 1 }, { k: 'star', label: 'Étoile', anim: 2 }, { k: 'sparkle', label: 'Paillettes', anim: 2 },
  { k: 'crown', label: 'Couronne', anim: 0 }, { k: 'bow', label: 'Nœud', anim: 0 }, { k: 'flower', label: 'Fleur', anim: 1 },
  { k: 'lips', label: 'Bisou', anim: 1 }, { k: 'moon', label: 'Lune', anim: 3 },
] as const;
export const TEXT_STICKERS = ['Coucou ♡', 'Mon amour', 'Date night', 'Trop belle', 'Merci ♡', 'Souvenir', 'Magique', 'Toi & moi', 'On sort ?', 'Rooftop vibes', 'Bonne soirée', 'Je t’aime'] as const;
/** Animations : 0 aucune, 1 battement, 2 scintillement, 3 flottement. */
export const ANIM_NAMES = ['Fixe', 'Battement', 'Scintille', 'Flotte'];
export const SNAP_PLACES = ['studio', 'restaurant', 'palace', 'fireworks', 'rooftop', 'ballroom', 'garden', 'fountain', 'home', 'boutique', 'stage', 'cinema', 'hotel', 'spa', 'flowerMarket', 'pajama'] as const;

export interface Sticker { id: string; k: string; x: number; y: number; s: number; r: number; a: number; t?: string }
export interface SnapPhoto { id: string; at: number; stickers: Sticker[]; cat: boolean; cap: string }
export interface StoryFrame { photo: string; cap: string }
export interface Reaction { who: string; txt: string; after: number }
export interface Story { id: string; at: number; frames: StoryFrame[]; caption: string; reactions: Reaction[]; viewed: boolean; auto: string }
export interface Pending { id: string; kind: string; title: string; caption: string; at: number; snap: boolean; clips: boolean; data?: Record<string, string | number> }
export interface CamDraft { place: string; pose: number; aug: boolean; cat: boolean; frame: string; filter: string; title: string; stickers: Sticker[] }
export interface StoryDraft { photos: string[]; caption: string }
export interface SnapState { v: 1; photos: SnapPhoto[]; stories: Story[]; pending: Pending[]; cam: CamDraft | null; storyDraft: StoryDraft | null; shots: number; published: number }

export const defaultSnap = (): SnapState => ({ v: 1, photos: [], stories: [], pending: [], cam: null, storyDraft: null, shots: 0, published: 0 });
export const defaultCam = (): CamDraft => ({ place: 'rooftop', pose: 0, aug: true, cat: false, frame: 'rose', filter: 'doux', title: 'Un joli souvenir', stickers: [] });

// ---------------------------------------------------------------- sanitisation
const STICKER_K: string[] = SHAPE_STICKERS.map((s) => s.k);
export function sanitizeSticker(v: unknown): Sticker | null {
  if (!isObj(v)) return null;
  const k = str(v.k, '', 12);
  const isText = k === 'text';
  if (!isText && !STICKER_K.includes(k)) return null;
  const t = isText ? cleanText(v.t, 18) : undefined;
  if (isText && (!t || mentionsChild(t))) return null;
  const st: Sticker = {
    id: str(v.id, '', 12).replace(/[^A-Za-z0-9]/g, '') || 's' + Math.floor(num(v.x, 0, 0, 1) * 1000).toString(36),
    k, x: num(v.x, 0.5, 0, 1), y: num(v.y, 0.5, 0, 1), s: num(v.s, 1, 0.4, 3), r: num(v.r, 0, -3.2, 3.2), a: Math.round(num(v.a, 0, 0, 3)),
  };
  if (t) st.t = t;
  return st;
}
const sanitizeStickers = (v: unknown): Sticker[] => (Array.isArray(v) ? v.map(sanitizeSticker).filter((s): s is Sticker => !!s).slice(0, MAX_STICKERS) : []);
const idOf = (v: unknown, max = 40): string => str(v, '', max).replace(/[^A-Za-z0-9_-]/g, '');
const placeOf = (v: unknown): string => ((SNAP_PLACES as readonly string[]).includes(str(v)) ? str(v) : 'rooftop');

export function sanitizeCam(v: unknown): CamDraft | null {
  if (!isObj(v)) return null;
  const title = cleanText(v.title, 40);
  return {
    place: placeOf(v.place), pose: Math.round(num(v.pose, 0, 0, POSES.length - 1)), aug: v.aug !== false, cat: v.cat === true,
    frame: FRAMES.some((f) => f.id === v.frame) ? (v.frame as string) : 'rose', filter: FILTERS.some((f) => f.id === v.filter) ? (v.filter as string) : 'doux',
    title: title && !mentionsChild(title) ? title : 'Un joli souvenir', stickers: sanitizeStickers(v.stickers),
  };
}
function sanitizePending(v: unknown): Pending | null {
  if (!isObj(v)) return null;
  const id = idOf(v.id, 30); if (!id) return null;
  const title = cleanText(v.title, 60), caption = cleanText(v.caption, 160);
  if (mentionsChild(title) || mentionsChild(caption)) return null;
  const data: Record<string, string | number> = {};
  if (isObj(v.data)) for (const k of ['furniture', 'outfit', 'place', 'flower', 'choc']) { const x = v.data[k]; if (typeof x === 'string' && /^[a-z0-9-]{1,30}$/.test(x) && !mentionsChild(x)) data[k] = x; }
  return { id, kind: str(v.kind, 'photo', 14).replace(/[^a-z]/g, ''), title: title || 'Souvenir', caption, at: num(v.at, 0, 0, 1e14), snap: v.snap !== false, clips: v.clips === true, ...(Object.keys(data).length ? { data } : {}) };
}
function sanitizeStory(v: unknown): Story | null {
  if (!isObj(v)) return null;
  const id = idOf(v.id, 30); if (!id) return null;
  const frames = (Array.isArray(v.frames) ? v.frames : []).filter(isObj).map((f) => ({ photo: idOf(f.photo), cap: cleanText(f.cap, 60) })).filter((f) => f.photo && !mentionsChild(f.cap)).slice(0, 5);
  if (!frames.length) return null;
  const caption = cleanText(v.caption, 80);
  const reactions = (Array.isArray(v.reactions) ? v.reactions : []).filter(isObj).map((x) => ({ who: cleanText(x.who, 24), txt: cleanText(x.txt, 120), after: num(x.after, 0, 0, 3_600_000) })).filter((x) => x.who && x.txt).slice(0, 8);
  return { id, at: num(v.at, 0, 0, 1e14), frames, caption: mentionsChild(caption) ? '' : caption, reactions, viewed: v.viewed === true, auto: str(v.auto, '', 14).replace(/[^a-z]/g, '') };
}

export function sanitizeSnap(raw: unknown): SnapState {
  const d = defaultSnap();
  if (!isObj(raw)) return d;
  if (Array.isArray(raw.photos)) {
    d.photos = raw.photos.filter(isObj).map((p): SnapPhoto | null => {
      const id = idOf(p.id); if (!id) return null;
      const cap = cleanText(p.cap, 60);
      return { id, at: num(p.at, 0, 0, 1e14), stickers: sanitizeStickers(p.stickers), cat: p.cat === true, cap: mentionsChild(cap) ? '' : cap };
    }).filter((p): p is SnapPhoto => !!p).slice(-MAX_PHOTOS);
  }
  if (Array.isArray(raw.stories)) d.stories = raw.stories.map(sanitizeStory).filter((s): s is Story => !!s).slice(-MAX_STORIES);
  if (Array.isArray(raw.pending)) d.pending = raw.pending.map(sanitizePending).filter((p): p is Pending => !!p).slice(-MAX_PENDING);
  d.cam = sanitizeCam(raw.cam);
  if (isObj(raw.storyDraft)) {
    const photos = (Array.isArray(raw.storyDraft.photos) ? raw.storyDraft.photos : []).map((x) => idOf(x)).filter(Boolean).slice(0, 5);
    const caption = cleanText(raw.storyDraft.caption, 80);
    if (photos.length) d.storyDraft = { photos, caption: mentionsChild(caption) ? '' : caption };
  }
  d.shots = Math.floor(num(raw.shots, 0, 0, 1e6));
  d.published = Math.floor(num(raw.published, 0, 0, 1e6));
  return d;
}
export const sanitizeInPlace = (target: Record<string, unknown>): SnapState => { const s = sanitizeSnap(target); assignInPlace(target, s as unknown as Record<string, unknown>); return s; };

// ---------------------------------------------------------------- photos
/** Ajoute une photo ; renvoie les identifiants élagués (au-delà de 40) pour retirer aussi les photos de l'album. */
export function addSnapPhoto(s: SnapState, p: SnapPhoto): string[] {
  s.photos.push({ ...p, stickers: sanitizeStickers(p.stickers) });
  const out: string[] = [];
  while (s.photos.length > MAX_PHOTOS) out.push(s.photos.shift()!.id);
  s.shots++;
  return out;
}
export const photoMeta = (s: SnapState, id: string): SnapPhoto | undefined => s.photos.find((p) => p.id === id);
export function removeSnapPhoto(s: SnapState, id: string): void {
  s.photos = s.photos.filter((p) => p.id !== id);
  for (const st of s.stories) st.frames = st.frames.filter((f) => f.photo !== id);
  s.stories = s.stories.filter((st) => st.frames.length);
  if (s.storyDraft) { s.storyDraft.photos = s.storyDraft.photos.filter((x) => x !== id); if (!s.storyDraft.photos.length) s.storyDraft = null; }
}

let sseq = 0;
export const newStickerId = (): string => 's' + (Date.now() % 1e7).toString(36) + (sseq++).toString(36);
export function makeSticker(kind: string, text?: string): Sticker {
  const def = SHAPE_STICKERS.find((x) => x.k === kind);
  return { id: newStickerId(), k: kind, x: 0.5, y: 0.42, s: kind === 'text' ? 1 : 1.1, r: kind === 'text' ? -0.08 : 0, a: def?.anim ?? 0, ...(kind === 'text' ? { t: cleanText(text, 18) } : {}) };
}

// ---------------------------------------------------------------- stories
const STORY_CAPS = ['Un petit moment à garder ♡', 'Juste nous deux.', 'Aujourd’hui était parfait.', 'Souvenir du soir ✨', 'Avec le sourire !', 'Un jour comme on les aime.', 'Pour ne pas oublier.'];
const REACT_TXT = ['Magnifique ♡', 'Quelle jolie photo !', 'Vous êtes adorables.', 'Cette lumière, un rêve.', 'Je veux la même tenue !', 'Ça donne envie de sortir.', 'Pile le sourire qu’il fallait.', 'Mon coup de cœur du jour.', 'Quelle élégance !', 'On veut la suite de l’histoire.', 'Ça sent la belle soirée.', 'Je mets en fond d’écran, pardon.', 'Cadre parfait, bravo au photographe 😄', 'Toi, tu rayonnes.', 'Quatre étoiles. Non, cinq.'];
const REACT_WHO = ['Lila', 'Nour', 'Ambre', 'Théo', 'Camille', 'Iris', 'Mira', 'Gaspard', 'Rose', 'Lou', 'Victor', 'Zoé', 'Nina', 'Clara', 'Hugo'];
const AUGUSTE_REACT = ['Tu es magnifique, point final.', 'Je regarde cette photo en boucle. Je ne suis pas objectif.', 'Voilà pourquoi je souris tout seul.', 'Celle-là, je l’encadre.', 'Je suis le plus chanceux de la ville.', 'Même la lumière est jalouse de toi.', 'Tu me fais fondre, comme d’habitude ♡', 'Belle photo. Beau photographe aussi, non ?'];
export const randomCaption = (r: () => number = Math.random): string => pick(STORY_CAPS, r);

/** Réactions fictives (positives ou drôles), déterministes ; la première est souvent celle d'Auguste. */
export function genReactions(storyId: string, n?: number): Reaction[] {
  const r = rng(hash('re' + storyId));
  const count = n ?? 3 + Math.floor(r() * 4);
  const out: Reaction[] = [];
  if (r() < 0.8) out.push({ who: 'Auguste', txt: pick(AUGUSTE_REACT, r), after: 1500 });
  const txt = pickN(REACT_TXT, count, r), who = pickN(REACT_WHO, count, r);
  for (let i = 0; i < count && out.length < 7; i++) out.push({ who: who[i], txt: txt[i], after: 3000 + i * 4000 + Math.floor(r() * 2500) });
  return out;
}
/** Réactions visibles à l'instant `now`. */
export const visibleReactions = (st: Story, now: number): Reaction[] => st.reactions.filter((x) => now - st.at >= x.after);

let stseq = 0;
export function publishStory(s: SnapState, photos: string[], caption: string, now: number, auto = ''): Story | null {
  const frames = photos.filter((p) => s.photos.some((x) => x.id === p)).slice(0, 5).map((p) => ({ photo: p, cap: '' }));
  if (!frames.length) return null;
  const cap = cleanText(caption, 80);
  const id = `st${now.toString(36)}${(stseq++ % 1296).toString(36)}`;
  const st: Story = { id, at: now, frames, caption: mentionsChild(cap) ? '' : cap, reactions: genReactions(id), viewed: false, auto };
  s.stories.push(st);
  while (s.stories.length > MAX_STORIES) s.stories.shift();
  s.published++;
  return st;
}
export const unviewedStories = (s: SnapState): number => s.stories.filter((x) => !x.viewed).length;

// ---------------------------------------------------------------- moments proposés (stories automatiques)
let pseq = 0;
/** Enregistre un moment à proposer. Renvoie null si doublon récent, enfant mentionné ou type inconnu. */
export function addPending(s: SnapState, m: { kind: string; title: string; caption?: string; data?: Record<string, string | number> }, now: number, clips = false): Pending | null {
  const kind = str(m.kind, '', 14).replace(/[^a-z]/g, '');
  const title = cleanText(m.title, 60), caption = cleanText(m.caption, 160);
  if (!kind || mentionsChild(title) || mentionsChild(caption)) return null;
  if (s.pending.some((p) => p.kind === kind && now - p.at < 20_000)) return null;
  const clean = sanitizePending({ id: `p${now.toString(36)}${(pseq++ % 1296).toString(36)}`, kind, title, caption, at: now, snap: true, clips, data: m.data });
  if (!clean) return null;
  s.pending.push(clean);
  while (s.pending.length > MAX_PENDING) s.pending.shift();
  return clean;
}
export function expirePending(s: SnapState, now: number): void { s.pending = s.pending.filter((p) => now - p.at < PENDING_TTL); }
export const dismissPending = (s: SnapState, id: string): void => { s.pending = s.pending.filter((p) => p.id !== id); };
/** Retire l'offre Snap d'un moment (garde l'offre Clips s'il y en a une). */
export function closeSnapOffer(s: SnapState, id: string): void { const p = s.pending.find((x) => x.id === id); if (!p) return; p.snap = false; if (!p.clips) dismissPending(s, id); }
export function closeClipsOffer(s: SnapState, id: string): void { const p = s.pending.find((x) => x.id === id); if (!p) return; p.clips = false; if (!p.snap) dismissPending(s, id); }
export const snapBadge = (s: SnapState): number => s.pending.filter((p) => p.snap).length;
export const clipsBadge = (s: SnapState): number => s.pending.filter((p) => p.clips).length;

interface StoryLook { place: string; pose: number; aug: boolean; cat: boolean; frame: string; filter: string }
const STORY_LOOK: Record<string, StoryLook> = {
  restaurant: { place: 'restaurant', pose: 4, aug: true, cat: false, frame: 'romantique', filter: 'chaud' },
  fireworks: { place: 'fireworks', pose: 2, aug: true, cat: false, frame: 'minuit', filter: 'nuit' },
  castle: { place: 'home', pose: 3, aug: true, cat: false, frame: 'classique', filter: 'doux' },
  outfit: { place: 'boutique', pose: 1, aug: false, cat: false, frame: 'rose', filter: 'doux' },
  runway: { place: 'stage', pose: 1, aug: false, cat: false, frame: 'or', filter: 'soir' },
  scene: { place: 'stage', pose: 3, aug: false, cat: false, frame: 'or', filter: 'soir' },
  concert: { place: 'stage', pose: 3, aug: false, cat: false, frame: 'minuit', filter: 'nuit' },
  shooting: { place: 'studio', pose: 6, aug: true, cat: false, frame: 'polaroid', filter: 'doux' },
  garden: { place: 'garden', pose: 3, aug: false, cat: false, frame: 'lavande', filter: 'rose' },
  chocolate: { place: 'flowerMarket', pose: 5, aug: false, cat: false, frame: 'coeurs', filter: 'chaud' },
  cat: { place: 'home', pose: 0, aug: false, cat: true, frame: 'dentelle', filter: 'doux' },
  casino: { place: 'ballroom', pose: 1, aug: true, cat: false, frame: 'or', filter: 'soir' },
  necklace: { place: 'palace', pose: 2, aug: true, cat: false, frame: 'or', filter: 'doux' },
};
/** Réglages d'appareil proposés pour un moment (la joueuse peut tout changer). */
export function camForMoment(m: { kind: string; title: string; caption?: string }, catAdopted: boolean): CamDraft {
  const l = STORY_LOOK[m.kind] ?? { place: 'rooftop', pose: 0, aug: true, cat: false, frame: 'rose', filter: 'doux' };
  const title = cleanText(m.title, 40);
  const st: Sticker[] = [m.kind === 'outfit' || m.kind === 'runway' ? makeSticker('star') : makeSticker('heart')];
  return { place: l.place, pose: l.pose, aug: l.aug, cat: l.cat && catAdopted, frame: l.frame, filter: l.filter, title: title && !mentionsChild(title) ? title : 'Souvenir', stickers: st.map((x, i) => ({ ...x, x: 0.8 - i * 0.1, y: 0.2 })) };
}
