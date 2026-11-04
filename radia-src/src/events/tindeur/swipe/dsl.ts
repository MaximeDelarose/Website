/** Mini-DSL pour écrire les arbres de dialogue sans bruit. */
import type { EndKind, Node } from './types';

/** Choix : [texte, nœud suivant, '?' si c'est une question]. */
export type C = [string, string] | [string, string, '?'];

export const N = (id: string, say: string | string[], ...ch: C[]): Node => ({
  id, say: Array.isArray(say) ? say : [say], ch: ch.map(([t, to, q]) => (q ? { t, to, ask: true } : { t, to })),
});
export const E = (id: string, say: string | string[], kind: EndKind, title: string, note: string): Node => ({
  id, say: Array.isArray(say) ? say : [say], ch: [], end: { title, note, kind },
});
