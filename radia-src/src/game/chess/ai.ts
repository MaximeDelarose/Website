/**
 * IA d'échecs : moteur maison (engine/chess-core.js) exécuté dans un Web
 * Worker pour ne jamais bloquer l'interface. Si le worker ne répond pas, on
 * joue un coup légal au hasard : la partie ne reste jamais bloquée.
 */
import { Chess } from 'chess.js';
import type { ChessDifficulty } from '../../save/schema';
import { detenteUci } from './detente';

import { PARTNER } from '../../config/gift';
/** Réglages du moteur par difficulté (profondeur, bruit, hasard, temps). */
export const AI_LEVELS: Record<ChessDifficulty, { label: string; desc: string; engine: Record<string, unknown> }> = {
  relax: { label: 'Détente ♡', desc: `${PARTNER} joue tranquille, un coup à la fois, et laisse parfois traîner une pièce. Parfait pour s'amuser.`, engine: {} },
  easy: { label: 'Détendu', desc: `${PARTNER} joue d'une main, l'autre sur son téléphone.`, engine: { id: 2, depth: 2, noise: 130, random: 0.08, q: true } },
  normal: { label: 'Concentré', desc: `${PARTNER} se concentre. Il ne laisse plus rien traîner.`, engine: { id: 3, depth: 3, noise: 45, random: 0.02, q: true } },
  hard: { label: 'Sérieux', desc: `${PARTNER} ne rigole plus. Enfin… presque.`, engine: { id: 5, time: 1500, maxDepth: 9, noise: 0, random: 0, q: true, book: true } },
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (uci: string | null) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./engine/chess-core.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; uci?: string | null; error?: string }>) => {
      const cb = pending.get(e.data.id);
      if (!cb) return;
      pending.delete(e.data.id);
      cb(e.data.error ? null : e.data.uci ?? null);
    };
    worker.onerror = () => {
      for (const cb of pending.values()) cb(null);
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

function randomMove(fen: string): string | null {
  const c = new Chess(fen);
  const ms = c.moves({ verbose: true });
  if (!ms.length) return null;
  const m = ms[Math.floor(Math.random() * ms.length)];
  return m.from + m.to + (m.promotion ?? '');
}

/**
 * Demande un coup à l'IA. `startFen` + `moves` (UCI) décrivent la partie
 * (l'historique sert au livre d'ouvertures et aux répétitions).
 */
export function aiMove(startFen: string, moves: string[], currentFen: string, diff: ChessDifficulty): Promise<string | null> {
  if (diff === 'relax') {
    // « Détente » : joué ici (coup léger, aucun worker) ; toujours un coup légal
    let u: string | null = null;
    try { u = detenteUci(new Chess(currentFen)); } catch { u = null; }
    return Promise.resolve(u ?? randomMove(currentFen));
  }
  const w = getWorker();
  const minDelay = 350; // un petit temps de « réflexion » visible
  const t0 = performance.now();
  const finish = (uci: string | null) =>
    new Promise<string | null>((res) => window.setTimeout(() => res(uci ?? randomMove(currentFen)), Math.max(0, minDelay - (performance.now() - t0))));
  if (!w) return finish(null);
  const id = ++seq;
  return new Promise<string | null>((resolve) => {
    const timeout = window.setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      resolve(randomMove(currentFen));
    }, 8000);
    pending.set(id, (uci) => { window.clearTimeout(timeout); void finish(uci).then(resolve); });
    w.postMessage({ id, moves, fen: startFen, level: AI_LEVELS[diff].engine });
  });
}
