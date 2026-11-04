/**
 * Suspension temporaire de l'interface pendant une ouverture de cadeau, SANS rien détruire :
 * les fenêtres gênantes (modales, bulles d'Auguste, toasts…) sont masquées (`visibility`), l'application est rendue
 * inerte (toucher, clavier, lecteur d'écran) et le focus est mémorisé ; `release` remet exactement l'état d'avant.
 * Logique pure : l'environnement (DOM ou faux objets de test) est injecté.
 */
export interface ElLike {
  style: { visibility: string };
  getAttribute(n: string): string | null;
  setAttribute(n: string, v: string): void;
  removeAttribute(n: string): void;
}
export interface FocusLike { focus?: () => void; blur?: () => void; isConnected?: boolean }
export interface SuspendEnv {
  /** Éléments à masquer (selon `SUSPEND_SELECTORS`). */
  hideable(): ElLike[];
  /** Conteneur de l'application (rendu inerte) ou null. */
  app(): ElLike | null;
  /** Marque la racine (classe CSS de secours pour les éléments apparus pendant l'ouverture). */
  setOpen(on: boolean): void;
  active(): FocusLike | null;
}

interface Snap { el: ElLike; vis: string; aria: string | null }

export interface Suspender {
  acquire(): void;
  release(): void;
  depth(): number;
  /** Élément apparu PENDANT la suspension : masqué aussi (et restitué à la fin). Sans effet hors suspension. */
  add(el: ElLike): void;
}

export function createSuspender(env: SuspendEnv): Suspender {
  let depth = 0;
  let snaps: Snap[] = [];
  let appSnap: { el: ElLike; inert: string | null; aria: string | null } | null = null;
  let focus: FocusLike | null = null;

  function apply(): void {
    snaps = env.hideable().map((el) => ({ el, vis: el.style.visibility, aria: el.getAttribute('aria-hidden') }));
    for (const s of snaps) { s.el.style.visibility = 'hidden'; s.el.setAttribute('aria-hidden', 'true'); }
    const a = env.app();
    if (a) { appSnap = { el: a, inert: a.getAttribute('inert'), aria: a.getAttribute('aria-hidden') }; a.setAttribute('inert', ''); a.setAttribute('aria-hidden', 'true'); }
    focus = env.active();
    try { focus?.blur?.(); } catch { /* ignoré */ }
    env.setOpen(true);
  }
  function restore(): void {
    env.setOpen(false);
    for (const s of snaps) {
      // si l'appelant a lui-même changé la visibilité pendant l'ouverture (ex. calendrier qui se réaffiche), on ne l'écrase pas
      if (s.el.style.visibility === 'hidden') s.el.style.visibility = s.vis;
      if (s.aria === null) s.el.removeAttribute('aria-hidden'); else s.el.setAttribute('aria-hidden', s.aria);
    }
    snaps = [];
    if (appSnap) {
      const { el, inert, aria } = appSnap;
      if (inert === null) el.removeAttribute('inert'); else el.setAttribute('inert', inert);
      if (aria === null) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', aria);
      appSnap = null;
    }
    const f = focus; focus = null;
    try { if (f && f.isConnected !== false) f.focus?.(); } catch { /* ignoré */ }
  }

  return {
    acquire() { if (depth++ === 0) apply(); },
    release() { if (depth === 0) return; if (--depth === 0) restore(); },
    depth: () => depth,
    add(el) {
      if (depth === 0 || snaps.some((s) => s.el === el)) return;
      const sn = { el, vis: el.style.visibility, aria: el.getAttribute('aria-hidden') };
      snaps.push(sn);
      el.style.visibility = 'hidden'; el.setAttribute('aria-hidden', 'true');
    },
  };
}
