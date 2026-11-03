/* Lancement en développement (npm run dev) : contenu et fichiers privés en clair, sur ta machine. */
import { start } from "./app";
const vault = {
  async url(path: string) {
    const u = "/private/" + path;
    try { const r = await fetch(u, { method: "HEAD" }); return r.ok ? u : null; } catch { return null; }
  },
};
start(document.getElementById("root")!, vault, {
  version: "dev",
  engines: { stockfish: "/node_modules/stockfish/bin/stockfish-18-lite-single.js", fallback: "/vendor/chess-core.js" },
});
