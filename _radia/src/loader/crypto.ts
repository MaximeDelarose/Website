/* Chiffrement du contenu privé — partagé par le chargeur (navigateur) et les scripts (Node 22).
   PBKDF2-SHA256 (mot de passe + sel) → 512 bits : 256 pour AES-256-GCM, 256 pour HMAC.
   IV déterministe = HMAC(contenu)[0..12] : un fichier inchangé donne exactement le même
   fichier chiffré (pas de doublons dans l'historique git), et deux contenus différents
   n'ont jamais le même IV. Format d'un fichier : IV (12 octets) ‖ chiffré + tag GCM. */

export const KDF_ITERATIONS = 600_000;

export interface VaultMeta {
  v: 1;
  salt: string; // base64
  iter: number;
  index: string; // nom du fichier d'index chiffré
  build: string;
}

export interface VaultIndex {
  app: string;
  version: string;
  files: Record<string, { f: string; t: string; n: number }>;
}

const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder();

export function b64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
export function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface Keys { aes: CryptoKey; mac?: CryptoKey }

export async function deriveKeys(password: string, salt: Uint8Array, iter: number, withMac = false): Promise<Keys> {
  const base = await subtle().importKey("raw", enc.encode(password.normalize("NFC")), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, 512));
  const aes = await subtle().importKey("raw", bits.slice(0, 32), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  const mac = withMac ? await subtle().importKey("raw", bits.slice(32), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]) : undefined;
  bits.fill(0);
  return { aes, mac };
}

export async function seal(keys: Keys, data: Uint8Array): Promise<Uint8Array> {
  if (!keys.mac) throw new Error("clé HMAC requise pour chiffrer");
  const iv = new Uint8Array(await subtle().sign("HMAC", keys.mac, data)).slice(0, 12);
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, keys.aes, data));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv, 0);
  out.set(ct, 12);
  return out;
}

/** Déchiffre ; lève une erreur si le mot de passe est faux ou le fichier altéré. */
export async function open(keys: Keys, blob: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  const u = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
  return subtle().decrypt({ name: "AES-GCM", iv: u.slice(0, 12) }, keys.aes, u.slice(12));
}

export async function sha256hex(data: Uint8Array, len = 24): Promise<string> {
  const h = new Uint8Array(await subtle().digest("SHA-256", data));
  return [...h].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, len);
}
