/**
 * Actions communes de Clips et Snap (liens entre applications) : prendre/enregistrer une photo (album du jeu),
 * publier une story, publier un clip (fans fictifs plafonnés), partager un clip vers l'album, mot d'Auguste.
 * Aucune sortie du jeu : tout reste dans la sauvegarde locale.
 */
import { addPhotoRec, ev } from '../events/api';
import { pushMessage } from '../events/manager';
import { emitPhone } from '../events/bus';
import type { PhotoRec, PlaceId } from '../events/types';
import { addFans } from '../core/world';
import { currentLook } from '../game/world/look';
import { pickLine } from '../data/augusteTone';
import { clipsState, snapState, persist, removeAlbumPhotos, catAdopted } from './store';
import { addSnapPhoto, addPending, camForMoment, closeClipsOffer, closeSnapOffer, publishStory, randomCaption, makeSticker, type CamDraft, type Pending, type Story } from './snap/model';
import { publishMine, isCareerKind, type Proposal } from './clips/model';
import type { Clip } from './clips/gen';
import { dayKey, cleanText, rng, hash, pick } from './util';

export const SNAP_EVENT = 'snap';

/** Enregistre la photo dans l'album du jeu (Photos souvenirs du téléphone) + ses autocollants. Aucun enfant. */
export function savePhoto(cam: CamDraft, now = Date.now()): PhotoRec {
  const s = snapState();
  const rec = addPhotoRec({ place: cam.place as PlaceId, title: cleanText(cam.title, 40) || 'Souvenir', look: currentLook(), auguste: cam.aug, kids: [], pose: cam.pose, frame: cam.frame, filter: cam.filter, ts: now }, SNAP_EVENT);
  const evicted = addSnapPhoto(s, { id: rec.id, at: now, stickers: cam.stickers, cat: cam.cat && catAdopted(), cap: '' });
  removeAlbumPhotos(evicted);
  persist();
  return rec;
}
export function deleteSnapPhoto(id: string): void {
  const s = snapState();
  s.photos = s.photos.filter((p) => p.id !== id);
  for (const st of s.stories) st.frames = st.frames.filter((f) => f.photo !== id);
  s.stories = s.stories.filter((st) => st.frames.length);
  if (s.storyDraft) { s.storyDraft.photos = s.storyDraft.photos.filter((x) => x !== id); if (!s.storyDraft.photos.length) s.storyDraft = null; }
  removeAlbumPhotos([id]);
  persist();
}

export function postStory(photos: string[], caption: string, auto = '', now = Date.now()): Story | null {
  const s = snapState();
  const st = publishStory(s, photos, caption, now, auto);
  if (st) { s.storyDraft = null; persist(); emitPhone(); }
  return st;
}

/** Story automatique pour un moment proposé : photo générée (réglages du moment) + story, puis l'offre Snap se ferme. */
export function publishPendingStory(p: Pending, now = Date.now()): { story: Story | null; photo: PhotoRec } {
  const cam = camForMoment(p, catAdopted());
  const photo = savePhoto(cam, now);
  const story = postStory([photo.id], p.caption || randomCaption(rng(hash(p.id))), p.kind, now);
  closeSnapOffer(snapState(), p.id);
  persist(); emitPhone();
  return { story, photo };
}
export function ignorePending(id: string): void { const s = snapState(); s.pending = s.pending.filter((p) => p.id !== id); persist(); emitPhone(); }
export function snapOfferClosed(id: string): void { closeSnapOffer(snapState(), id); persist(); emitPhone(); }
export function clipsOfferClosed(id: string): void { closeClipsOffer(snapState(), id); persist(); emitPhone(); }

/** Reçoit un moment des activités : proposition (jamais de publication automatique). */
export function receiveMoment(m: { kind: string; title: string; caption?: string; data?: Record<string, string | number> }, now = Date.now()): Pending | null {
  const p = addPending(snapState(), m, now, isCareerKind(m.kind));
  if (p) { persist(); emitPhone(); }
  return p;
}

const INVITES = [
  'J’ai vu ta vidéo… tout le monde en parle. Et si on fêtait ça autour d’un dîner, ce soir ?',
  'Tes fans sont de plus en plus nombreux. Moi, je veux juste une place à côté de toi ce soir. Rooftop ?',
  'Ta dernière vidéo m’a fait sourire toute la journée. Sortie à deux, bientôt ?',
  'Star de la semaine, ça te dit une soirée tranquille avec ton plus grand admirateur ?',
  'Je suis fier de toi. Je réserve une table ? Et pas pour 400 fans, juste pour nous.',
];
/** Un mot d'Auguste par jour après une publication qui a rapporté des fans (invitation romantique). */
export function augusteInvite(gained: number, now = Date.now()): boolean {
  const c = clipsState();
  if (gained <= 0 || c.inviteKey === dayKey(now)) return false;
  c.inviteKey = dayKey(now);
  const r = rng(hash('inv' + dayKey(now)));
  pushMessage(ev(), 'auguste', `${pick(INVITES, r)} ${pickLine('romantic', r, { noGalbi: true })}`.slice(0, 220), now);
  emitPhone();
  return true;
}

export interface PublishResult { id: string; fans: number; wanted: number; capped: boolean; invited: boolean }
/** Publie une proposition dans Clips : fans fictifs ajoutés au monde (plafond journalier). */
export function publishClip(prop: Proposal, kind: string, pendingId?: string, now = Date.now()): PublishResult {
  const c = clipsState();
  const { post, fans } = publishMine(c, { kind, title: prop.title, caption: prop.caption, tags: prop.tags, scene: prop.scene }, now);
  if (fans > 0) addFans(fans);
  if (pendingId) closeClipsOffer(snapState(), pendingId);
  const invited = augusteInvite(fans, now);
  persist(); emitPhone();
  return { id: post.id, fans, wanted: fans, capped: fans <= 0, invited };
}
/** Publie une photo de l'album comme clip (diaporama animé). */
export function publishPhotoClip(photoId: string, caption: string, title = 'Un souvenir', now = Date.now()): PublishResult {
  return publishClip({ title, caption: caption || 'Un souvenir à partager ♡', tags: ['radia', 'souvenir', 'photo'], scene: { k: 'still', photo: photoId }, topic: 'photo' }, 'photo', undefined, now);
}

const SCENE_PLACE: Record<string, string> = { cat: 'home', bloom: 'garden', choc: 'flowerMarket', decor: 'home', fans: 'ballroom', meme: 'home', show: 'stage', dress: 'boutique' };
/** « Partager vers l'album interne » : une photo souvenir tirée du clip (visible dans Photos souvenirs). */
export function shareClipToAlbum(clip: Clip, now = Date.now()): PhotoRec {
  const sc = clip.scene;
  const cam: CamDraft = {
    place: sc.place ?? SCENE_PLACE[sc.k] ?? 'rooftop', pose: sc.pose ?? 0, aug: sc.k === 'duo', cat: sc.k === 'cat' && catAdopted(),
    frame: 'rose', filter: 'doux', title: clip.title.slice(0, 40), stickers: [{ ...makeSticker('heart'), x: 0.82, y: 0.2 }],
  };
  const rec = savePhoto(cam, now);
  clipsState().shares++;
  persist();
  return rec;
}
