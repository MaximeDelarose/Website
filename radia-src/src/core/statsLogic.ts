/**
 * Statistiques de jeu PARTAGÉES AVEC LE CONSENTEMENT de la joueuse : logique PURE (sans DOM, testée dans tests/stats-logic.test.ts).
 * Le temps de jeu est une ESTIMATION du temps d'ACTIVITÉ RÉELLE : il ne compte que quand le jeu est visible ET que la joueuse a touché l'écran
 * dans la dernière minute. Un téléphone verrouillé, l'application en arrière-plan ou un écran laissé allumé sans toucher ne comptent pas.
 */
export const HEARTBEAT_MS = 45_000;   // un envoi toutes les 45 s au plus (raisonnablement espacé)
export const IDLE_MS = 60_000;        // sans toucher depuis 60 s : inactive
export const MAX_ACT_S = 75;          // plafond d'un envoi (le serveur borne aussi par le temps réellement écoulé)
export const MAX_PENDING_S = 150;     // réseau coupé : on garde au plus 150 s à renvoyer (le reste est perdu : estimation)

export class ActivityMeter {
  private cursor: number;
  private lastTouch: number;
  private visible = true;
  private pendingMs = 0;
  constructor(now: number) { this.cursor = now; this.lastTouch = now; }

  /** Fait avancer le compteur jusqu'à `now` en comptant seulement le temps ACTIF. */
  advance(now: number): void {
    const dt = now - this.cursor;
    if (dt <= 0) { this.cursor = Math.max(this.cursor, now); return; }
    if (this.visible) {
      const activeUntil = this.lastTouch + IDLE_MS;
      const active = Math.max(0, Math.min(now, activeUntil) - this.cursor);
      this.pendingMs = Math.min(MAX_PENDING_S * 1000, this.pendingMs + Math.min(active, dt));
    }
    this.cursor = now;
  }
  /** Un toucher / geste de la joueuse. */
  touch(now: number): void { this.advance(now); this.lastTouch = now; }
  setVisible(v: boolean, now: number): void {
    this.advance(now);
    if (v && !this.visible) { this.lastTouch = now; } // revenir dans le jeu compte comme un geste
    this.visible = v;
  }
  get isVisible(): boolean { return this.visible; }
  /** Secondes actives à envoyer (≤ MAX_ACT_S) ; le reste attend le prochain envoi. */
  drain(now: number): number {
    this.advance(now);
    const s = Math.min(MAX_ACT_S, Math.floor(this.pendingMs / 1000));
    this.pendingMs -= s * 1000;
    return s;
  }
  /** Rend des secondes quand l'envoi a échoué (réseau) : elles seront renvoyées au prochain essai. */
  giveBack(s: number): void { this.pendingMs = Math.min(MAX_PENDING_S * 1000, this.pendingMs + s * 1000); }
  get pendingSeconds(): number { return Math.floor(this.pendingMs / 1000); }
}

/** Mise en forme d'une durée en secondes : « 2 h 05 », « 12 min », « 45 s ». */
export function fmtDuration(s: number): string {
  s = Math.max(0, Math.round(s));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

export type SessionState = 'live' | 'ended' | 'estimated';
/** État d'une session vue du tableau de bord : « en cours » (activité il y a < 150 s), « terminée » (fermeture signalée) ou « fin estimée » (dernière activité connue). */
export function sessionState(x: { ended_at: string | null; end_reason: string | null; live?: boolean }): SessionState {
  if (x.live) return 'live';
  if (x.ended_at && (x.end_reason === 'closed' || x.end_reason === 'background')) return 'ended';
  return 'estimated';
}

/** État local du consentement (voir stats.ts) : suffit pour décider quelle invitation proposer. */
export interface ShareLocal { state: 'none' | 'on' | 'off'; asked?: boolean; prog?: 'none' | 'on' | 'off'; progAsked?: boolean }
export type InviteKind = 'full' | 'progress';
/**
 * Quelle invitation afficher (au plus UNE, jamais répétée) :
 *  - « full » : nouvelle joueuse (jamais interrogée) → une seule demande pour le temps de jeu ET la progression ;
 *  - « progress » : joueuse qui avait déjà accepté le temps de jeu mais pas (encore) la progression → une seule invitation supplémentaire
 *    (l'ancien consentement n'autorise JAMAIS les nouvelles données) ;
 *  - null : déjà décidé (accepté ou refusé, y compris un refus ancien du temps de jeu) → on ne redemande pas.
 */
export function shareInviteKind(s: ShareLocal): InviteKind | null {
  if (s.progAsked || s.prog === 'on' || s.prog === 'off') return null;
  if (s.state === 'none' && !s.asked) return 'full';
  if (s.state === 'on') return 'progress';
  return null;
}
