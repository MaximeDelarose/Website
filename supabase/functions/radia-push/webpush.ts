/**
 * Web Push sans dépendance : chiffrement « aes128gcm » (RFC 8291) + authentification VAPID (RFC 8292), en WebCrypto
 * (Deno Edge, Node ≥ 20, navigateurs). Testé par un aller-retour complet (chiffrer → déchiffrer côté « navigateur »)
 * dans radia-src/tests/push-webpush.test.ts.
 */
const enc = new TextEncoder();
export const b64u = (b: ArrayBuffer | Uint8Array): string => { const u = b instanceof Uint8Array ? b : new Uint8Array(b); let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unb64u = (s: string): Uint8Array => { const t = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4); const r = atob(t); const u = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; };
const cat = (...a: Uint8Array[]): Uint8Array => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };

export interface VapidKeys { publicKey: string; privateJwk: JsonWebKey }
/** Génère une paire de clés VAPID (P-256) : clé publique brute (base64url, 65 octets) + clé privée au format JWK. */
export async function generateVapid(): Promise<VapidKeys> {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  return { publicKey: b64u(pub), privateJwk: await crypto.subtle.exportKey('jwk', kp.privateKey) };
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}

/** Chiffre `payload` pour un abonnement (p256dh/auth en base64url) → corps de la requête Web Push (aes128gcm, un seul enregistrement). */
export async function encryptPayload(payload: Uint8Array, p256dh: string, auth: string, opts: { salt?: Uint8Array; asKey?: CryptoKeyPair } = {}): Promise<Uint8Array> {
  const uaPublic = unb64u(p256dh); const authSecret = unb64u(auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4) throw new Error('clé p256dh invalide');
  if (authSecret.length < 16) throw new Error('secret auth invalide');
  if (payload.length > 3993) throw new Error('message trop long');
  const as = opts.asKey ?? await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, cat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const record = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, cat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return cat(salt, rs, new Uint8Array([asPublic.length]), asPublic, record);
}

/** Jeton VAPID (ES256) pour l'origine du service de push ; en-tête « Authorization: vapid t=…, k=… ». */
export async function vapidAuthorization(endpoint: string, v: VapidKeys, subject: string, nowMs = Date.now()): Promise<string> {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(nowMs / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', v.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${v.publicKey}`;
}

export interface PushSub { endpoint: string; p256dh: string; auth: string }
export type PushResult = { ok: true } | { ok: false; status: number; gone: boolean; text: string };

/** Envoie un message (objet JSON) à un abonnement. `gone` = abonnement expiré (404/410) : à supprimer. */
export async function sendPush(sub: PushSub, message: unknown, v: VapidKeys, subject: string, opts: { ttl?: number; fetchFn?: typeof fetch } = {}): Promise<PushResult> {
  const body = await encryptPayload(enc.encode(JSON.stringify(message)), sub.p256dh, sub.auth);
  const res = await (opts.fetchFn ?? fetch)(sub.endpoint, {
    method: 'POST',
    headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(opts.ttl ?? 43200), Urgency: 'normal', Authorization: await vapidAuthorization(sub.endpoint, v, subject) },
    body,
  });
  if (res.status >= 200 && res.status < 300) return { ok: true };
  return { ok: false, status: res.status, gone: res.status === 404 || res.status === 410, text: (await res.text().catch(() => '')).slice(0, 200) };
}

/** Services de push légitimes (Apple, Google, Mozilla, Microsoft) : on n'envoie JAMAIS ailleurs (pas de requête vers une adresse arbitraire). */
export function isPushHost(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return h === 'web.push.apple.com' || h.endsWith('.push.apple.com') || h === 'fcm.googleapis.com' || h.endsWith('.push.services.mozilla.com') || h === 'updates.push.services.mozilla.com' || h.endsWith('.notify.windows.com');
  } catch { return false; }
}
