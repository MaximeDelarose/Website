/** Petits utilitaires purs partagés par TikTak et Snapchien (aucun DOM). */

/** Hash de chaîne → entier 32 bits non signé (FNV-1a). */
export function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/** Générateur déterministe (mulberry32) : même graine, même suite. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T>(list: readonly T[], r: () => number): T => list[Math.min(list.length - 1, Math.floor(r() * list.length))];
/** Tire `n` éléments distincts. */
export function pickN<T>(list: readonly T[], n: number, r: () => number): T[] {
  const a = list.slice();
  const out: T[] = [];
  while (out.length < n && a.length) out.push(a.splice(Math.min(a.length - 1, Math.floor(r() * a.length)), 1)[0]);
  return out;
}
export function shuffle<T>(list: readonly T[], r: () => number): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Clé de jour locale AAAA-MM-JJ. */
export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const num = (v: unknown, d: number, lo = 0, hi = 1e12): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
export const str = (v: unknown, d = '', max = 80): string => (typeof v === 'string' ? v.slice(0, max) : d);
export const strArr = (v: unknown, max: number, maxLen = 60): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, maxLen)).slice(0, max) : []);
/** Texte libre de la joueuse : espaces normalisés, bornes, sans balises. */
export function cleanText(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}
/** Vrai si un texte ou une donnée évoque un enfant (garde-fou : jamais publié). */
export function mentionsChild(s: string): boolean {
  return /\bkid[0-9]?\b|\benfants?\b|\bb[ée]b[ée]s?\b|\bfille\b|\bgar[cç]on\b|\bpetite\b|\bca[dt]ette\b|\bain[ée]e\b/i.test(s);
}
/** Écrit le contenu de `src` dans `dst` (en place) — conserve la référence stockée dans la sauvegarde. */
export function assignInPlace(dst: Record<string, unknown>, src: Record<string, unknown>): void {
  for (const k of Object.keys(dst)) delete dst[k];
  Object.assign(dst, src);
}
