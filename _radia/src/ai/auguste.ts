/* Auguste, l'adversaire virtuel : Stockfish (WASM, Web Worker) + personnalité.
   Si Stockfish ne peut pas démarrer, un petit moteur de secours (Web Worker aussi)
   prend le relais. Les coups renvoyés sont TOUJOURS revalidés par chess.js
   dans le contrôleur de partie. */
import { UciEngine, type Candidate } from "./uci";
import { DIFFICULTIES, pickMove, type Choice, type Difficulty } from "./persona";

export interface ThinkResult { choice: Choice; candidates: Candidate[]; engine: "stockfish" | "secours" }

export interface EngineUrls { stockfish: string; fallback: string }

export class AugusteAI {
  private sf: UciEngine | null = null;
  private fb: Worker | null = null;
  private fbSeq = 0;
  private token = 0;
  private sfFailed = false;
  private starting: Promise<void> | null = null;

  constructor(private readonly urls: EngineUrls, private readonly rng: () => number = Math.random) {}

  get engineName(): string { return this.sf && !this.sfFailed ? "Stockfish 18 (lite)" : "moteur de secours"; }

  /** Démarre le moteur en tâche de fond (appelé dès l'accueil pour gagner du temps). */
  warmup(): Promise<void> {
    if (!this.starting) {
      this.starting = (async () => {
        try {
          this.sf = new UciEngine(this.urls.stockfish);
          await this.sf.ready;
        } catch (e) {
          console.warn("Stockfish indisponible, moteur de secours :", e);
          this.sfFailed = true;
          this.sf?.terminate();
          this.sf = null;
        }
      })();
    }
    return this.starting;
  }

  newGame(): void { this.cancel(); this.sf?.newGame(); }

  /** Annule la réflexion en cours (fin de partie, nouvelle partie, abandon). */
  cancel(): void {
    this.token++;
    this.sf?.stop();
  }

  async think(fen: string, ply: number, diff: Difficulty): Promise<ThinkResult | null> {
    const my = ++this.token;
    const cfg = DIFFICULTIES[diff];
    await this.warmup();
    if (my !== this.token) return null;
    if (this.sf) {
      try {
        const cands = await this.sf.analyse(fen, { depth: cfg.depth, multipv: cfg.multipv, movetime: 2500 });
        if (my !== this.token) return null;
        const choice = pickMove(cands, cfg, this.rng, { ply });
        if (choice) return { choice, candidates: cands, engine: "stockfish" };
      } catch (e) {
        console.warn("Analyse Stockfish échouée, moteur de secours :", e);
      }
    }
    const r = await this.fallbackThink(fen, cfg.fallbackLevel);
    if (my !== this.token || !r) return null;
    return {
      choice: { uci: r.uci, loss: 0, quality: "good", cp: r.score, bestCp: r.score },
      candidates: [],
      engine: "secours",
    };
  }

  private fallbackThink(fen: string, level: number): Promise<{ uci: string; score: number } | null> {
    if (!this.fb) this.fb = new Worker(this.urls.fallback);
    const id = ++this.fbSeq;
    const w = this.fb;
    return new Promise((resolve) => {
      const on = (e: MessageEvent) => {
        if (!e.data || e.data.id !== id) return;
        w.removeEventListener("message", on);
        resolve(e.data.uci ? { uci: e.data.uci, score: e.data.score ?? 0 } : null);
      };
      w.addEventListener("message", on);
      w.postMessage({ id, fen, level });
    });
  }

  dispose(): void {
    this.cancel();
    this.sf?.terminate();
    this.fb?.terminate();
  }
}

export type { Difficulty };
