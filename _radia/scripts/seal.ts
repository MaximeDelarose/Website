/* Après `vite build` : chiffre l'application + le contenu privé et assemble ../radia/
   (dossier publié tel quel par GitHub Pages).
   Mot de passe : variable RADIA_PASSWORD ou fichier _radia/.password (jamais commité). */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, copyFileSync } from "node:fs";
import { join, relative, resolve, extname } from "node:path";
import { build } from "esbuild";
import { deriveKeys, seal, open, sha256hex, b64, unb64, KDF_ITERATIONS, type VaultIndex, type VaultMeta } from "../src/loader/crypto";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "../radia");
const VAULT = join(OUT, "vault");
const PRIVATE = join(ROOT, "private");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const password = (process.env.RADIA_PASSWORD ?? (existsSync(join(ROOT, ".password")) ? readFileSync(join(ROOT, ".password"), "utf8") : "")).trim();
if (!password) {
  console.error("✗ Mot de passe manquant : crée _radia/.password ou lance RADIA_PASSWORD=… npm run build");
  process.exit(1);
}
if (password.length < 10) console.warn("⚠ Mot de passe court : les fichiers chiffrés sont publics, un mot de passe long est bien plus sûr.");
if (!existsSync(join(PRIVATE, "content.ts"))) {
  console.error("✗ private/content.ts introuvable : `npm run unpack` pour récupérer le contenu chiffré, ou crée-le depuis src/content/example.ts");
  process.exit(1);
}

// Sel : on garde celui du build précédent si le mot de passe n'a pas changé (fichiers identiques
// d'un build à l'autre → pas de doublons dans git). Aucun « vérificateur » rapide du mot de passe
// n'est publié : la seule façon de le tester reste PBKDF2 (600 000 itérations).
let salt: Uint8Array | null = null;
let iter = KDF_ITERATIONS;
const META_FILE = join(VAULT, "meta.json");
if (existsSync(META_FILE)) {
  try {
    const old = JSON.parse(readFileSync(META_FILE, "utf8")) as VaultMeta;
    const k = await deriveKeys(password, unb64(old.salt), old.iter);
    await open(k, readFileSync(join(VAULT, old.index)));
    salt = unb64(old.salt);
    iter = old.iter;
  } catch { /* mot de passe changé : nouveau sel */ }
}
if (!salt) { salt = globalThis.crypto.getRandomValues(new Uint8Array(16)); console.log("• nouveau sel (premier build ou mot de passe changé)"); }
const saltInfo = { salt: b64(salt), iter };
const keys = await deriveKeys(password, unb64(saltInfo.salt), saltInfo.iter, true);

mkdirSync(VAULT, { recursive: true });
const used = new Set<string>();
async function put(data: Uint8Array): Promise<string> {
  const sealed = await seal(keys, data);
  const name = (await sha256hex(sealed)) + ".bin";
  const p = join(VAULT, name);
  if (!existsSync(p)) writeFileSync(p, sealed);
  used.add(name);
  return name;
}

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ts": "text/plain", ".json": "application/json", ".txt": "text/plain" };
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
}

const index: VaultIndex = { app: "", version: pkg.version, files: {} };
index.app = await put(readFileSync(join(ROOT, "dist-app/app.js")));
for (const f of walk(PRIVATE)) {
  const rel = relative(PRIVATE, f).split("\\").join("/");
  if (rel.startsWith(".") || rel.includes("/.")) continue;
  const data = readFileSync(f);
  index.files[rel] = { f: await put(data), t: TYPES[extname(f).toLowerCase()] ?? "application/octet-stream", n: data.length };
}
const indexName = await put(new TextEncoder().encode(JSON.stringify(index)));
const buildId = indexName.slice(0, 10);
const meta: VaultMeta = { v: 1, salt: saltInfo.salt, iter: saltInfo.iter, index: indexName, build: buildId };
writeFileSync(join(VAULT, "meta.json"), JSON.stringify(meta) + "\n");
for (const n of readdirSync(VAULT)) if (n.endsWith(".bin") && !used.has(n)) rmSync(join(VAULT, n));

// chargeur public
await build({ entryPoints: [join(ROOT, "src/loader/loader.ts")], bundle: true, format: "esm", minify: true, target: "es2020", outfile: join(OUT, "loader.js"), legalComments: "none" });
const lock = readFileSync(join(ROOT, "static/lock.html"), "utf8").replaceAll("__BUILD__", buildId);
writeFileSync(join(OUT, "index.html"), lock);
writeFileSync(join(OUT, "sw.js"), readFileSync(join(ROOT, "static/sw.js"), "utf8").replaceAll("__BUILD__", buildId));
for (const f of ["manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) copyFileSync(join(ROOT, "static", f), join(OUT, f));

// moteurs (publics) : Stockfish 18 lite (GPLv3) + moteur de secours
const ENG = join(OUT, "engine");
mkdirSync(ENG, { recursive: true });
const SF = join(ROOT, "node_modules/stockfish");
for (const f of ["stockfish-18-lite-single.js", "stockfish-18-lite-single.wasm"]) copyFileSync(join(SF, "bin", f), join(ENG, f));
copyFileSync(join(SF, "Copying.txt"), join(ENG, "STOCKFISH-COPYING.txt"));
writeFileSync(join(ENG, "README.txt"), "Stockfish 18 lite (single thread), WASM build by Nathan Rugg / Chess.com — GPLv3.\nSource : https://github.com/nmrugg/stockfish.js (v" + JSON.parse(readFileSync(join(SF, "package.json"), "utf8")).version + ") et https://github.com/official-stockfish/Stockfish\nchess-core.js : moteur de secours du site (même auteur que le jeu).\n");
copyFileSync(join(ROOT, "vendor/chess-core.js"), join(ENG, "chess-core.js"));
// Jekyll (GitHub Pages) : ne rien transformer dans ce dossier
writeFileSync(join(OUT, ".nojekyll"), "");

const total = readdirSync(VAULT).reduce((s, n) => s + statSync(join(VAULT, n)).size, 0);
console.log(`✓ ../radia/ prêt — build ${buildId}, ${Object.keys(index.files).length} fichiers privés chiffrés (${(total / 1e6).toFixed(1)} Mo)`);
