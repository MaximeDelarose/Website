/* Récupère le contenu privé (textes, photos, musique) depuis ../radia/vault/ :
   RADIA_PASSWORD=… npm run unpack   (ou fichier _radia/.password) */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { deriveKeys, open, unb64, type VaultIndex, type VaultMeta } from "../src/loader/crypto";

const ROOT = resolve(import.meta.dirname, "..");
const VAULT = resolve(ROOT, "../radia/vault");
const password = (process.env.RADIA_PASSWORD ?? (existsSync(join(ROOT, ".password")) ? readFileSync(join(ROOT, ".password"), "utf8") : "")).trim();
if (!password) { console.error("✗ RADIA_PASSWORD manquant"); process.exit(1); }
const meta = JSON.parse(readFileSync(join(VAULT, "meta.json"), "utf8")) as VaultMeta;
const keys = await deriveKeys(password, unb64(meta.salt), meta.iter);
let index: VaultIndex;
try { index = JSON.parse(new TextDecoder().decode(await open(keys, readFileSync(join(VAULT, meta.index))))); }
catch { console.error("✗ Mauvais mot de passe"); process.exit(1); }
for (const [rel, e] of Object.entries(index.files)) {
  const out = join(ROOT, "private", rel);
  if (existsSync(out) && !process.argv.includes("--force")) { console.log("= " + rel + " (déjà là, --force pour écraser)"); continue; }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, new Uint8Array(await open(keys, readFileSync(join(VAULT, e.f)))));
  console.log("✓ " + rel);
}
