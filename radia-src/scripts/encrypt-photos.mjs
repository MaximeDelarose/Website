// Chiffre les photos privées (AES-256-GCM) pour qu'elles ne soient pas lisibles
// dans le dépôt public. La clé n'est jamais commitée : elle est dans
// private/photo-key.txt et dans le lien envoyé à Radia (#k=…).
//   node scripts/encrypt-photos.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
const keyFile = 'private/photo-key.txt';
let keyB64 = existsSync(keyFile) ? readFileSync(keyFile, 'utf8').trim() : '';
if (!keyB64) {
  keyB64 = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  writeFileSync(keyFile, keyB64 + '\n');
}
const key = await crypto.subtle.importKey('raw', Buffer.from(keyB64, 'base64url'), 'AES-GCM', false, ['encrypt']);
mkdirSync('public/assets/p', { recursive: true });
for (const f of readdirSync('private/photos').filter((f) => f.endsWith('.jpg') || f.endsWith('.webp'))) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, readFileSync('private/photos/' + f)));
  const out = new Uint8Array(12 + data.length);
  out.set(iv); out.set(data, 12);
  writeFileSync('public/assets/p/' + f.replace(/\.(jpg|webp)$/, '.bin'), out);
  console.log('chiffré', f, out.length);
}
console.log('clé :', keyB64);
