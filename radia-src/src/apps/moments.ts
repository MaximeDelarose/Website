/**
 * « Moments » du jeu : les activités annoncent ici qu'un souvenir vient d'avoir lieu ; RADIA Snap (stories) et
 * RADIA Clips (publications) s'y abonnent pour PROPOSER à Radia de publier. Rien n'est publié sans son action.
 * Données pures, aucun DOM. Une activité appelle `emitMoment({ kind, title, ... })`.
 */
export type MomentKind =
  | 'shooting' | 'runway' | 'scene' | 'concert'          // carrière
  | 'restaurant' | 'fireworks' | 'castle' | 'outfit'      // sorties, château, nouvelle tenue
  | 'garden' | 'chocolate' | 'cat' | 'casino' | 'necklace';

export interface Moment {
  id: string;
  kind: MomentKind;
  title: string;
  /** Petite légende proposée. */
  caption?: string;
  /** Fans fictifs que la publication peut rapporter (informatif). */
  fans?: number;
  at: number;
  /** Données libres (ex. id de tenue, de lieu). Jamais de prénom d'enfant. */
  data?: Record<string, string | number>;
}

type Listener = (m: Moment) => void;
const listeners = new Set<Listener>();
/** Moments émis avant que les applications ne soient chargées (elles se chargent à la demande) : rejoués à l'abonnement. */
const backlog: Moment[] = [];
let booted = false;
let seq = 0;

export function onMoment(fn: Listener): () => void {
  listeners.add(fn);
  for (const m of backlog.splice(0)) { try { fn(m); } catch { /* ignoré */ } }
  return () => { listeners.delete(fn); };
}

export function emitMoment(m: Omit<Moment, 'id' | 'at'> & { at?: number }): Moment {
  const full: Moment = { ...m, id: `m${Date.now().toString(36)}${(seq++).toString(36)}`, at: m.at ?? Date.now() };
  if (!listeners.size) {
    // première émission : on charge les applications (Clips / Snap), qui s'abonnent puis reçoivent ce moment
    backlog.push(full); if (backlog.length > 10) backlog.shift();
    if (!booted) { booted = true; void import('./index').catch(() => undefined); }
    return full;
  }
  for (const l of [...listeners]) { try { l(full); } catch { /* un abonné ne casse jamais l'activité */ } }
  return full;
}
