/**
 * Gestionnaire central des notices (logique PURE, testée dans tests/notify-core.test.ts).
 *
 * Trois sortes de notices, avec des règles différentes :
 *   - 'ambient'   : pastille discrète (gain, info courte)           — au plus 1 visible, vite périmée, jamais pendant une notice importante
 *   - 'toast'     : petite notification                              — au plus 1 visible (les autres attendent leur tour), jamais pendant une notice importante
 *   - 'narrative' : message important (Auguste, client, invitation…) — au plus 1 visible ; une notice plus prioritaire peut passer devant
 * Règles communes : file d'attente par priorité (puis ordre d'arrivée) ; une notice qui attend trop longtemps est ABANDONNÉE (une
 * information périmée ne s'affiche jamais) ; deux notices de même clé rapprochées sont fusionnées ; rien ne s'affiche tant que
 * `blocked()` (fenêtre, récompense, fusion en cours…) ; un court délai sépare deux notices importantes.
 */
export type Channel = 'ambient' | 'toast' | 'narrative';

export interface NotifyItem {
  key: string;
  channel: Channel;
  /** Plus grand = plus important (narrative : 1 à 5 ; le reste : 0 à 2). */
  prio: number;
  /** Attente maximale dans la file (ms) avant abandon. */
  ttl: number;
  /** Durée d'affichage (ms). */
  ms: number;
  /** Affiche la notice ; renvoie la fonction qui la retire. */
  show: () => HideFn;
}

/** Retire la notice ; `immediate` : sans fondu (une notice plus importante prend sa place tout de suite). */
export type HideFn = (immediate?: boolean) => void;

export interface CoreOptions {
  now: () => number;
  /** Vrai tant qu'on ne doit rien afficher (modale, récompense, fusion en cours…). */
  blocked: () => boolean;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (h: unknown) => void;
  /** Délai de calme après une notice importante (ms). */
  gapMs?: number;
  /**
   * Voie d'affichage partagée (ex. Endless : une seule ligne sous le plateau) : toasts et pastilles se partagent alors UNE place.
   * Sinon : 1 toast + 1 pastille au plus.
   */
  sharedLane?: () => boolean;
}

export type PushResult = 'shown' | 'queued' | 'merged' | 'dropped';

interface Live { item: NotifyItem; hide: HideFn; timer: unknown; at: number }
interface Queued { item: NotifyItem; at: number; seq: number }

export const LIMITS: Record<Channel, number> = { ambient: 1, toast: 1, narrative: 1 }; // jamais deux pop-ups de systèmes différents en même temps : ils se succèdent
export const MERGE_WINDOW_MS = 3000;
/** Une notice importante qui a au moins 2 points d'avance sur celle qui est affichée la remplace. */
export const PREEMPT_MARGIN = 2;

export class NotifyCore {
  private live: Live[] = [];
  private queue: Queued[] = [];
  private seq = 0;
  private lastShown = new Map<string, number>();
  private quietUntil = 0;
  private poll: unknown = null;

  constructor(private readonly o: CoreOptions) {}

  push(item: NotifyItem): PushResult {
    const now = this.o.now();
    const last = this.lastShown.get(item.key);
    if (last !== undefined && now - last < MERGE_WINDOW_MS) return 'merged'; // même notice déjà affichée à l'instant
    if (this.live.some((l) => l.item.key === item.key) || this.queue.some((q) => q.item.key === item.key)) return 'merged';
    // une notice ambiante / un toast qui n'a aucune chance d'être pertinent plus tard est abandonné s'il ne peut pas passer maintenant
    const res: PushResult = this.canShow(item) ? 'shown' : 'queued';
    if (res === 'shown') { this.display(item, now); return 'shown'; }
    if (item.ttl <= 0) return 'dropped';
    this.queue.push({ item, at: now, seq: this.seq++ });
    this.schedule();
    return 'queued';
  }

  /** Retire toutes les notices (changement d'écran, fermeture du jeu…). */
  clear(): void {
    for (const l of this.live) { this.o.clearTimer(l.timer); try { l.hide(true); } catch { /* ignore */ } }
    this.live = []; this.queue = [];
    if (this.poll) { this.o.clearTimer(this.poll); this.poll = null; }
  }

  /** Retire tout de suite les notices affichées (la file d'attente est conservée) : un combo démarre, plus rien ne doit traîner sur le plateau. */
  dismissLive(): void { for (const l of [...this.live]) this.release(l, false, true); }

  get visible(): number { return this.live.length; }
  get waiting(): number { return this.queue.length; }
  visibleKeys(): string[] { return this.live.map((l) => l.item.key); }
  waitingKeys(): string[] { return this.sorted().map((q) => q.item.key); }

  // ------------------------------------------------------------------ interne
  private count(c: Channel): number { return this.live.filter((l) => l.item.channel === c).length; }
  private narrativeLive(): Live | undefined { return this.live.find((l) => l.item.channel === 'narrative'); }

  private canShow(item: NotifyItem): boolean {
    const now = this.o.now();
    if (this.o.blocked()) return false;
    const nar = this.narrativeLive();
    if (item.channel === 'narrative') {
      if (nar) return item.prio >= nar.item.prio + PREEMPT_MARGIN; // préemption seulement si nettement plus important
      return now >= this.quietUntil;
    }
    // ambient / toast : jamais par-dessus une notice importante ni juste après
    if (nar || now < this.quietUntil) return false;
    if (this.o.sharedLane?.()) return this.count('toast') + this.count('ambient') < 1;
    return this.count(item.channel) < LIMITS[item.channel];
  }

  private display(item: NotifyItem, now: number): void {
    if (item.channel === 'narrative') {
      // une notice importante prend la place : l'ancienne importante, et toutes les petites notices (toasts, pastilles) se retirent
      for (const l of [...this.live]) this.release(l, false, true);
    }
    let hide: HideFn = () => undefined;
    try { hide = item.show(); } catch (e) { try { console.error('[notify]', e); } catch { /* ignore */ } return; }
    const entry: Live = { item, hide, at: now, timer: null };
    entry.timer = this.o.setTimer(() => this.release(entry, true), item.ms);
    this.live.push(entry);
    this.lastShown.set(item.key, now);
  }

  private release(l: Live, schedule: boolean, immediate = false): void {
    const i = this.live.indexOf(l);
    if (i < 0) return;
    this.live.splice(i, 1);
    this.o.clearTimer(l.timer);
    try { l.hide(immediate); } catch { /* ignore */ }
    if (l.item.channel === 'narrative') this.quietUntil = this.o.now() + (this.o.gapMs ?? 400);
    if (schedule) this.schedule();
  }

  private sorted(): Queued[] { return [...this.queue].sort((a, b) => b.item.prio - a.item.prio || a.seq - b.seq); }

  private schedule(): void {
    if (this.poll) return;
    this.poll = this.o.setTimer(() => { this.poll = null; this.drain(); }, 120);
  }

  private drain(): void {
    const now = this.o.now();
    // 1. on abandonne ce qui a trop attendu
    this.queue = this.queue.filter((q) => now - q.at <= q.item.ttl);
    // 2. on affiche, dans l'ordre, tout ce qui peut passer
    for (const q of this.sorted()) {
      if (!this.canShow(q.item)) continue;
      this.queue = this.queue.filter((x) => x !== q);
      this.display(q.item, now);
    }
    if (this.queue.length) this.schedule();
  }
}
