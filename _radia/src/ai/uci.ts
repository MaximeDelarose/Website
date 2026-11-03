/* Pilote d'un moteur UCI (Stockfish WASM) tournant dans son propre Web Worker.
   Analyse MultiPV : on récupère plusieurs coups candidats notés, puis la
   « personnalité » d'Auguste (persona.ts) choisit parmi eux. */

export interface Candidate {
  uci: string;
  /** Score en centipions du point de vue du camp au trait (mats convertis). */
  cp: number;
  mate?: number;
  pv: string[];
  depth: number;
}

export interface AnalyseOptions { depth: number; multipv: number; movetime?: number }

export const MATE_SCORE = 20000;
export function mateToCp(mate: number): number {
  return mate > 0 ? MATE_SCORE - mate * 10 : -MATE_SCORE - mate * 10;
}

/** Analyse une ligne « info … » de Stockfish. Exportée pour les tests. */
export function parseInfo(line: string): (Candidate & { multipv: number }) | null {
  if (!line.startsWith("info ") || line.includes(" currmove ") || !line.includes(" pv ")) return null;
  const t = line.split(/\s+/);
  let depth = 0, multipv = 1, cp: number | null = null, mate: number | undefined;
  let bound = false;
  let pv: string[] = [];
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case "depth": depth = Number(t[++i]); break;
      case "multipv": multipv = Number(t[++i]); break;
      case "score":
        if (t[i + 1] === "cp") { cp = Number(t[i + 2]); i += 2; }
        else if (t[i + 1] === "mate") { mate = Number(t[i + 2]); cp = mateToCp(mate); i += 2; }
        if (t[i + 1] === "lowerbound" || t[i + 1] === "upperbound") { bound = true; i++; }
        break;
      case "pv": pv = t.slice(i + 1); i = t.length; break;
    }
  }
  if (cp === null || !pv.length || bound) return null;
  return { uci: pv[0], cp, mate, pv, depth, multipv };
}

export class UciEngine {
  private worker: Worker;
  private listeners: ((line: string) => void)[] = [];
  private busy: Promise<unknown> = Promise.resolve();
  private gen = 0;
  readonly ready: Promise<void>;

  constructor(url: string) {
    this.worker = new Worker(url);
    this.worker.onmessage = (e: MessageEvent) => {
      const data = typeof e.data === "string" ? e.data : String(e.data);
      for (const l of data.split("\n")) for (const f of [...this.listeners]) f(l.trim());
    };
    this.ready = new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("moteur : délai dépassé")), 20000);
      this.worker.onerror = (ev) => { clearTimeout(to); reject(new Error("moteur : " + (ev.message || "erreur"))); };
      this.waitFor("uciok").then(() => {
        this.send("setoption name UCI_AnalyseMode value false");
        this.send("isready");
        return this.waitFor("readyok");
      }).then(() => { clearTimeout(to); resolve(); }, reject);
      this.send("uci");
    });
  }

  send(cmd: string): void { this.worker.postMessage(cmd); }

  private waitFor(prefix: string): Promise<string> {
    return new Promise((resolve) => {
      const f = (l: string) => {
        if (l.startsWith(prefix)) { this.listeners = this.listeners.filter((x) => x !== f); resolve(l); }
      };
      this.listeners.push(f);
    });
  }

  newGame(): void { this.send("ucinewgame"); }

  /** Interrompt l'analyse en cours (la promesse correspondante renvoie ce qui a été trouvé). */
  stop(): void { this.gen++; this.send("stop"); }

  analyse(fen: string, o: AnalyseOptions): Promise<Candidate[]> {
    const run = async (): Promise<Candidate[]> => {
      await this.ready;
      const myGen = ++this.gen;
      const lines = new Map<number, Candidate>();
      const done = new Promise<void>((resolve) => {
        const f = (l: string) => {
          const info = parseInfo(l);
          if (info) {
            const prev = lines.get(info.multipv);
            if (!prev || info.depth >= prev.depth) lines.set(info.multipv, info);
          } else if (l.startsWith("bestmove")) {
            this.listeners = this.listeners.filter((x) => x !== f);
            resolve();
          }
        };
        this.listeners.push(f);
      });
      this.send("setoption name MultiPV value " + o.multipv);
      this.send("position fen " + fen);
      this.send("go depth " + o.depth + (o.movetime ? " movetime " + o.movetime : ""));
      await done;
      if (myGen !== this.gen) return [];
      // ne garder que les lignes à la profondeur la plus aboutie, triées
      const all = [...lines.values()];
      const maxD = Math.max(0, ...all.map((c) => c.depth));
      return all.filter((c) => c.depth >= maxD - 1).sort((a, b) => b.cp - a.cp);
    };
    const p = this.busy.then(run, run);
    this.busy = p.catch(() => undefined);
    return p;
  }

  terminate(): void { this.worker.terminate(); }
}
