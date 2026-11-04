/**
 * TikTak : état sauvegardé (`fun.apps.clips`), publications de Radia, favoris, likes, commentaires,
 * fans fictifs plafonnés par jour. Pur et testable (aucun DOM) ; la sanitisation est tolérante.
 */
import { assignInPlace, cleanText, dayKey, hash, isObj, mentionsChild, num, rng, pick, str, strArr } from '../util';
import { SCENE_KINDS, SOUNDS, FEED_CAPTIONS, type SceneKind, type SceneSpec, type Topic } from './gen';

export const MAX_MINE = 200;
export const MAX_LIKED = 400;
export const MAX_FAVED = 300;
export const MAX_DRAFTS = 6;
/** Fans fictifs gagnables par jour via Clips (anti-abus). */
export const DAILY_FAN_CAP = 400;
export const MAX_FANS_PER_POST = 150;

export interface MinePost {
  id: string; at: number; kind: string; title: string; caption: string; tags: string[]; sound: string;
  scene: SceneSpec; dur: number; l0: number; fans: number;
}
export interface ClipDraft { photo: string; caption: string; at: number }
export interface ClipsState {
  v: 1;
  /** Graine du fil « Pour toi ». */
  seed: number;
  liked: string[]; faved: string[];
  /** Commentaires de Radia : par clip, 6 max. */
  comments: Record<string, string[]>;
  mine: MinePost[];
  fansToday: { key: string; n: number };
  fansTotal: number;
  drafts: ClipDraft[];
  shares: number;
  opened: number;
  /** Jour du dernier mot d'Auguste après une publication (un par jour). */
  inviteKey: string;
}

export const defaultClips = (now = Date.now()): ClipsState => ({
  v: 1, seed: (hash('clips' + Math.floor(now / 3_600_000)) % 900000) + 1, liked: [], faved: [], comments: {}, mine: [],
  fansToday: { key: '', n: 0 }, fansTotal: 0, drafts: [], shares: 0, opened: 0, inviteKey: '',
});

const CLEAN_ITEM = /[^a-z0-9,-]/g;
export function sanitizeScene(v: unknown): SceneSpec {
  const o = isObj(v) ? v : {};
  const k = (SCENE_KINDS as string[]).includes(o.k as string) ? (o.k as SceneKind) : 'twirl';
  const s: SceneSpec = { k };
  const place = str(o.place, '', 20).replace(/[^A-Za-z]/g, ''); if (place) s.place = place;
  if (typeof o.pose === 'number' && Number.isFinite(o.pose)) s.pose = Math.round(num(o.pose, 0, 0, 40));
  const mode = str(o.mode, '', 12).replace(/[^a-z]/g, ''); if (mode) s.mode = mode;
  const items = str(o.items, '', 160).toLowerCase().replace(CLEAN_ITEM, ''); if (items) s.items = items;
  const cp = str(o.catPose, '', 10).replace(/[^a-z]/g, ''); if (cp) s.catPose = cp;
  const line = cleanText(o.line, 200); if (line && !mentionsChild(line)) s.line = line;
  if (typeof o.pal === 'number') s.pal = Math.round(num(o.pal, 0, 0, 3));
  const photo = str(o.photo, '', 40).replace(/[^A-Za-z0-9_-]/g, ''); if (photo) s.photo = photo;
  const filter = str(o.filter, '', 14).replace(/[^a-z]/g, ''); if (filter) s.filter = filter;
  const frame = str(o.frame, '', 14).replace(/[^a-z]/g, ''); if (frame) s.frame = frame;
  return s;
}

function sanitizeMine(v: unknown): MinePost | null {
  if (!isObj(v)) return null;
  const id = str(v.id, '', 30).replace(/[^A-Za-z0-9._-]/g, '');
  if (!id) return null;
  const title = cleanText(v.title, 60), caption = cleanText(v.caption, 160);
  if (mentionsChild(title) || mentionsChild(caption)) return null;
  return {
    id, at: num(v.at, 0, 0, 1e14), kind: str(v.kind, 'photo', 14).replace(/[^a-z]/g, ''), title: title || 'Souvenir', caption,
    tags: strArr(v.tags, 6, 24).map((t) => t.replace(/[^\p{L}\p{N}]/gu, '')).filter((t) => t && !mentionsChild(t)),
    sound: str(v.sound, SOUNDS[0], 30), scene: sanitizeScene(v.scene), dur: num(v.dur, 4, 3, 6), l0: Math.floor(num(v.l0, 40, 0, 5000)), fans: Math.floor(num(v.fans, 0, 0, MAX_FANS_PER_POST)),
  };
}

export function sanitizeClips(raw: unknown, now = Date.now()): ClipsState {
  const d = defaultClips(now);
  if (!isObj(raw)) return d;
  d.seed = Math.floor(num(raw.seed, d.seed, 1, 4e9));
  d.liked = strArr(raw.liked, MAX_LIKED, 40).slice(-MAX_LIKED);
  d.faved = strArr(raw.faved, MAX_FAVED, 40).slice(-MAX_FAVED);
  if (isObj(raw.comments)) {
    for (const [k, v] of Object.entries(raw.comments).slice(0, 120)) {
      const list = strArr(v, 6, 120).map((t) => cleanText(t, 120)).filter((t) => t && !mentionsChild(t));
      if (list.length) d.comments[k.slice(0, 40)] = list;
    }
  }
  if (Array.isArray(raw.mine)) d.mine = raw.mine.map(sanitizeMine).filter((p): p is MinePost => !!p).slice(-MAX_MINE);
  if (isObj(raw.fansToday)) d.fansToday = { key: /^\d{4}-\d{2}-\d{2}$/.test(str(raw.fansToday.key)) ? str(raw.fansToday.key) : '', n: Math.floor(num(raw.fansToday.n, 0, 0, DAILY_FAN_CAP)) };
  d.fansTotal = Math.floor(num(raw.fansTotal, 0, 0, 1e9));
  if (Array.isArray(raw.drafts)) {
    d.drafts = raw.drafts.filter(isObj).map((x) => ({ photo: str(x.photo, '', 40).replace(/[^A-Za-z0-9_-]/g, ''), caption: cleanText(x.caption, 160), at: num(x.at, 0, 0, 1e14) })).filter((x) => x.photo && !mentionsChild(x.caption)).slice(-MAX_DRAFTS);
  }
  d.shares = Math.floor(num(raw.shares, 0, 0, 1e6));
  d.opened = Math.floor(num(raw.opened, 0, 0, 1e6));
  d.inviteKey = /^\d{4}-\d{2}-\d{2}$/.test(str(raw.inviteKey)) ? str(raw.inviteKey) : '';
  return d;
}
/** Taille JSON approximative (garde-fou < 400 Ko côté sauvegarde). */
export const stateBytes = (s: unknown): number => { try { return JSON.stringify(s).length; } catch { return 0; } };
export const sanitizeInPlace = (target: Record<string, unknown>, now = Date.now()): ClipsState => {
  const s = sanitizeClips(target, now);
  assignInPlace(target, s as unknown as Record<string, unknown>);
  return s;
};

// ---------------------------------------------------------------- likes, favoris, commentaires
function toggle(list: string[], id: string, max: number): boolean {
  const i = list.indexOf(id);
  if (i >= 0) { list.splice(i, 1); return false; }
  list.push(id);
  if (list.length > max) list.splice(0, list.length - max);
  return true;
}
export const toggleLike = (s: ClipsState, id: string): boolean => toggle(s.liked, id, MAX_LIKED);
export const toggleFav = (s: ClipsState, id: string): boolean => toggle(s.faved, id, MAX_FAVED);
export const isLiked = (s: ClipsState, id: string): boolean => s.liked.includes(id);
export const isFaved = (s: ClipsState, id: string): boolean => s.faved.includes(id);
export function addComment(s: ClipsState, id: string, text: string): boolean {
  const t = cleanText(text, 120);
  if (!t || mentionsChild(t)) return false;
  const list = (s.comments[id] ??= []);
  list.push(t);
  if (list.length > 6) list.splice(0, list.length - 6);
  const keys = Object.keys(s.comments);
  if (keys.length > 120) delete s.comments[keys[0]];
  return true;
}

// ---------------------------------------------------------------- fans fictifs
const BASE_FANS: Record<string, number> = {
  shooting: 60, runway: 90, scene: 80, concert: 110, restaurant: 30, fireworks: 35, castle: 25, outfit: 40,
  garden: 22, chocolate: 22, cat: 45, casino: 18, necklace: 55, photo: 15,
};
/** Fans que rapporterait une publication (avant plafond journalier). Déterministe pour une graine. */
export function fansForMoment(kind: string, seed: number): number {
  const r = rng(hash(`fans${kind}${seed}`));
  return Math.min(MAX_FANS_PER_POST, Math.round((BASE_FANS[kind] ?? 20) * (0.85 + r() * 0.4)));
}
export function fansLeftToday(s: ClipsState, now: number): number {
  return s.fansToday.key === dayKey(now) ? Math.max(0, DAILY_FAN_CAP - s.fansToday.n) : DAILY_FAN_CAP;
}
/** Compte des fans gagnés aujourd'hui, plafonné ; renvoie le nombre réellement accordé. */
export function grantFans(s: ClipsState, want: number, now: number): number {
  const key = dayKey(now);
  if (s.fansToday.key !== key) s.fansToday = { key, n: 0 };
  const g = Math.max(0, Math.min(Math.floor(want), MAX_FANS_PER_POST, DAILY_FAN_CAP - s.fansToday.n));
  s.fansToday.n += g;
  s.fansTotal += g;
  return g;
}

// ---------------------------------------------------------------- publications de Radia
let seq = 0;
export function publishMine(s: ClipsState, p: Omit<MinePost, 'id' | 'at' | 'l0' | 'fans' | 'dur' | 'sound'> & Partial<Pick<MinePost, 'sound' | 'dur'>>, now: number): { post: MinePost; fans: number } {
  const id = `m${now.toString(36)}${(seq++ % 1296).toString(36)}`;
  const r = rng(hash(id));
  const fans = grantFans(s, fansForMoment(p.kind, hash(id)), now);
  const post: MinePost = {
    id, at: now, kind: p.kind, title: cleanText(p.title, 60) || 'Souvenir', caption: cleanText(p.caption, 160), tags: p.tags.slice(0, 6),
    sound: p.sound ?? pick(SOUNDS, r), scene: sanitizeScene(p.scene), dur: p.dur ?? 3 + Math.floor(r() * 7) / 2, l0: 25 + Math.floor(r() * 90), fans,
  };
  s.mine.push(post);
  if (s.mine.length > MAX_MINE) s.mine.splice(0, s.mine.length - MAX_MINE);
  return { post, fans };
}
export const removeMine = (s: ClipsState, id: string): boolean => { const i = s.mine.findIndex((p) => p.id === id); if (i < 0) return false; s.mine.splice(i, 1); return true; };

/** Likes fictifs d'une publication de Radia : cohérents avec ses fans, qui montent doucement avec le temps. */
export function likesOf(p: MinePost, now: number, liked: boolean): number {
  const ageH = Math.max(0, Math.min(72, (now - p.at) / 3_600_000));
  return p.l0 + p.fans * 4 + Math.floor(ageH * (3 + p.fans / 15)) + (liked ? 1 : 0);
}
export const commentCountOf = (p: MinePost, now: number): number => 2 + Math.floor(likesOf(p, now, false) / 14);
export function profileTotals(s: ClipsState, now: number): { posts: number; likes: number } {
  return { posts: s.mine.length, likes: s.mine.reduce((a, p) => a + likesOf(p, now, s.liked.includes(p.id)), 0) };
}

// ---------------------------------------------------------------- moments → propositions de publication
export interface MomentLike { kind: string; title: string; caption?: string; data?: Record<string, string | number> }
export interface Proposal { title: string; caption: string; tags: string[]; scene: SceneSpec; topic: Topic }
const SOLO_PLACE: Record<string, string> = { casino: 'ballroom', necklace: 'palace', outfit: 'boutique' };

/** Trois variantes de publication pour un moment (la joueuse choisit). */
export function proposalsFor(m: MomentLike, now = Date.now()): Proposal[] {
  const r = rng(hash(`${m.kind}|${m.title}|${Math.floor(now / 60000)}`));
  const cap = (t: Topic) => pick(FEED_CAPTIONS[t], r);
  const tagK = (m.kind || 'souvenir').replace(/[^a-z]/g, '');
  const mk = (title: string, topic: Topic, scene: SceneSpec, extra: string[] = []): Proposal => ({ title, caption: m.caption || cap(topic), tags: ['radia', tagK, ...extra].slice(0, 5), scene: { pal: Math.floor(r() * 4), ...scene }, topic });
  const k = m.kind;
  const ttl = m.title || 'Souvenir';
  const data = m.data ?? {};
  const furn = typeof data.furniture === 'string' && /^[a-z-]+$/.test(data.furniture) ? data.furniture : '';
  if (k === 'runway') return [mk(ttl, 'carriere', { k: 'show', place: 'stage', mode: 'catwalk' }, ['défilé']), mk('Dernier tour de piste', 'carriere', { k: 'show', place: 'stage', mode: 'catwalk', pal: 1 }, ['podium']), mk('Dans les coulisses du défilé', 'tenues', { k: 'twirl', place: 'stage' }, ['coulisses'])];
  if (k === 'concert') return [mk(ttl, 'carriere', { k: 'show', place: 'stage', mode: 'concert' }, ['concert']), mk('Le refrain en lumière', 'carriere', { k: 'show', place: 'stage', mode: 'concert', pal: 2 }, ['scène']), mk('Merci pour les applaudissements', 'fans', { k: 'fans', line: 'Merci à tous ♡' }, ['merci'])];
  if (k === 'scene') return [mk(ttl, 'carriere', { k: 'show', place: 'stage', mode: 'scene' }, ['théâtre']), mk('Sous les projecteurs', 'carriere', { k: 'show', place: 'stage', mode: 'scene', pal: 1 }, ['scène']), mk('Les saluts', 'fans', { k: 'fans', line: 'Merci pour vos applaudissements', pal: 1 }, ['saluts'])];
  if (k === 'shooting') return [mk(ttl, 'photo', { k: 'duo', place: 'studio', pose: 6, mode: 'flash' }, ['shooting']), mk('Shooting en solo', 'photo', { k: 'twirl', place: 'studio', mode: 'flash' }, ['studio']), mk('Trois poses, un sourire', 'photo', { k: 'duo', place: 'studio', pose: 8, mode: 'flash', pal: 2 }, ['poses'])];
  if (k === 'restaurant') return [mk(ttl, 'sortie', { k: 'duo', place: 'restaurant', pose: 4 }, ['dîner']), mk('Un dessert à partager', 'sortie', { k: 'duo', place: 'restaurant', pose: 9, pal: 1 }, ['dessert']), mk('Bougies et sourire', 'sortie', { k: 'twirl', place: 'restaurant' }, ['chandelles'])];
  if (k === 'fireworks') return [mk(ttl, 'sortie', { k: 'duo', place: 'fireworks', pose: 2 }, ['feudartifice']), mk('Les étoiles dans les yeux', 'sortie', { k: 'duo', place: 'fireworks', pose: 7, pal: 2 }, ['nuit']), mk('Bouquet final', 'sortie', { k: 'twirl', place: 'fireworks' }, ['bouquetfinal'])];
  if (k === 'castle') return [mk(ttl, 'chateau', { k: 'decor', items: furn || 'sofa,rug-round,lamp-floor,plant-pot' }, ['château']), mk('Un coin cosy', 'chateau', { k: 'decor', items: 'armchair,bookshelf,candles,rug-rect', pal: 1 }, ['déco']), mk('Petit tour du propriétaire', 'chateau', { k: 'duo', place: 'home', pose: 3 }, ['maison'])];
  if (k === 'outfit') return [mk(ttl, 'tenues', { k: 'twirl', place: 'boutique' }, ['nouveaulook']), mk('Collection de la semaine', 'tenues', { k: 'dress', items: 'dr-romantic-pink,dr-lavender-tulle,dr-white-gown,dr-flowy-floral', place: 'boutique' }, ['collection']), mk('Look du jour', 'tenues', { k: 'duo', place: 'palace', pose: 10 }, ['lookdujour'])];
  if (k === 'garden') return [mk(ttl, 'fleurs', { k: 'bloom', items: 'rose,tulip', place: 'garden' }, ['jardin']), mk('Éclosion en accéléré', 'fleurs', { k: 'bloom', items: 'lavender,peony', place: 'garden', pal: 3 }, ['timelapse']), mk('Un tour dans les fleurs', 'fleurs', { k: 'twirl', place: 'garden' }, ['fleurs'])];
  if (k === 'chocolate') return [mk(ttl, 'chocolat', { k: 'choc', items: 'milk,dark,praline,truffle' }, ['chocolat']), mk('La boîte parfaite', 'chocolat', { k: 'choc', items: 'heart,white,hazelnut,royalbox', pal: 1 }, ['coffret']), mk('Dégustation', 'chocolat', { k: 'twirl', place: 'flowerMarket' }, ['gourmandise'])];
  if (k === 'cat') return [mk(ttl, 'chat', { k: 'cat', place: 'home', catPose: 'play' }, ['chat']), mk('Ronron du jour', 'chat', { k: 'cat', place: 'home', catPose: 'purr', pal: 1 }, ['ronron']), mk('Sieste réussie', 'chat', { k: 'cat', place: 'pajama', catPose: 'sleep' }, ['sieste'])];
  const place = SOLO_PLACE[k] ?? 'ballroom';
  return [mk(ttl, 'photo', { k: 'twirl', place }, [tagK]), mk('Souvenir à deux', 'sortie', { k: 'duo', place, pose: 4 }, ['ensemble']), mk('Petit clin d’œil', 'fans', { k: 'fans', line: 'Merci à tous ♡' }, ['merci'])];
}
export const CAREER_KINDS = ['shooting', 'runway', 'scene', 'concert'] as const;
export const isCareerKind = (k: string): boolean => (CAREER_KINDS as readonly string[]).includes(k);
