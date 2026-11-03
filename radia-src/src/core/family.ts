/**
 * Informations sur les enfants (prénoms, âges) : stockées CHIFFRÉES
 * (assets/p/family.bin, même clé que les photos) pour ne jamais apparaître en
 * clair dans le dépôt public ni dans le code. Sans la clé, des libellés neutres
 * (« La petite », « L'aînée », « La cadette ») sont utilisés.
 * Aucun autre détail (apparence, caractère, souvenirs) n'est inventé.
 */
import { decryptAsset, hasPhotos } from './photos';
import { KID_FALLBACK, KID_IDS, type KidId } from '../data/world/ids';

type Info = Record<KidId, { name: string; age: number; says?: string[]; give?: string; louder?: string[] }>;
let info: Info = { ...KID_FALLBACK };
let loaded = false;

const strList = (a: unknown): string[] | undefined => (Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 60)).slice(0, 6) : undefined);

export async function loadFamily(): Promise<void> {
  if (loaded || !hasPhotos()) return;
  const bytes = await decryptAsset('family');
  if (!bytes) return;
  try {
    const j = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Info>;
    const next = { ...KID_FALLBACK } as Info;
    for (const k of KID_IDS) {
      const v = j[k];
      if (v && typeof v.name === 'string' && typeof v.age === 'number') next[k] = { name: v.name.slice(0, 20), age: v.age, says: strList(v.says), give: typeof v.give === 'string' ? v.give.slice(0, 30) : undefined, louder: strList(v.louder) };
    }
    info = next;
    loaded = true;
  } catch { /* données illisibles : libellés neutres */ }
}

export const kidName = (k: KidId): string => info[k].name;
export const kidAge = (k: KidId): number => info[k].age;
/** Phrase « Chambre de … » avec le prénom si disponible. */
export const kidRoomName = (k: KidId): string => (loaded ? `Chambre de ${info[k].name}` : `Chambre de ${KID_FALLBACK[k].name.toLowerCase()}`);

/** Petites phrases propres à l'enfant (chargées avec la clé) ; sinon vide. */
export const kidSays = (k: KidId): string[] => info[k].says ?? [];
/** Libellé du bouton « donner » (propre à l'enfant) ; vide sans la clé. */
export const kidGive = (k: KidId): string => info[k].give ?? '';
/** Phrases de plus en plus insistantes quand on la fait attendre ; vide sans la clé. */
export const kidLouder = (k: KidId): string[] => info[k].louder ?? [];
