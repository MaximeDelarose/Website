/* Simulation hors navigateur : Auguste (Noirs) contre une joueuse modélisée (Blancs).
   npx tsx scripts/simulate.ts [parties] [difficulté Auguste] [niveau joueuse]
   Sert à vérifier qu'Auguste reste accessible sans donner sa dame. */
import { createRequire } from "node:module";
import { ChessGame, uciToInput, PIECE_VALUE } from "../src/core/rules";
import { DIFFICULTIES, pickMove, type Difficulty } from "../src/ai/persona";
import { parseInfo, type Candidate } from "../src/ai/uci";

const require = createRequire(import.meta.url);
const init = require("stockfish");
const N = Number(process.argv[2] ?? 6);
const aiDiff = (process.argv[3] ?? "doux") as Difficulty;
const human = (process.argv[4] ?? "joueur") as Difficulty;

const eng: any = await init("lite-single");
let listener: (l: string) => void = () => {};
eng.listener = (l: string) => listener(l);
const send = (c: string) => eng.sendCommand(c);
function analyse(fen: string, depth: number, multipv: number): Promise<Candidate[]> {
  return new Promise((res) => {
    const lines = new Map<number, Candidate>();
    listener = (l) => {
      const i = parseInfo(l); if (i) lines.set(i.multipv, i);
      else if (l.startsWith("bestmove")) res([...lines.values()].sort((a, b) => b.cp - a.cp));
    };
    send("setoption name MultiPV value " + multipv); send("position fen " + fen); send("go depth " + depth);
  });
}
let lossSum = 0; let wins = 0, losses = 0, draws = 0, queenLost = 0, aiMist = 0, aiMoves = 0;
for (let g = 0; g < N; g++) {
  const game = new ChessGame(); let ply = 0; let lostQ = false;
  while (!game.outcome() && ply < 220) {
    const white = game.turn === "w";
    const cfg = DIFFICULTIES[white ? human : aiDiff];
    const cands = await analyse(game.fen, cfg.depth, cfg.multipv);
    const ch = pickMove(cands, cfg, Math.random, { ply })!;
    if (!white) { aiMoves++; lossSum += Math.min(ch.loss, 1000); if (ch.quality === "mistake") aiMist++; }
    const mv = game.play(uciToInput(ch.uci))!;
    if (white && mv.captured === "q") lostQ = true;
    ply++;
  }
  const o = game.outcome();
  if (lostQ) queenLost++;
  if (!o || o.winner === null) draws++; else if (o.winner === "w") wins++; else losses++;
  console.log(`partie ${g + 1}: ${o ? o.reason + " " + (o.winner ?? "nulle") : "limite"} en ${ply} demi-coups, matériel B/N ${game.material("w")}/${game.material("b")}${lostQ ? " (dame noire prise)" : ""}`);
}
console.log({ aiDiff, human, wins, losses, draws, queenLost, mistakesPerMove: (aiMist / aiMoves).toFixed(3), acpl: Math.round(lossSum / aiMoves) });
void PIECE_VALUE;
process.exit(0);
