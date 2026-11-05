import { describe, it, expect } from 'vitest';
import { b64u, unb64u, encryptPayload, generateVapid, vapidAuthorization, sendPush, isPushHost } from '../../supabase/functions/radia-push/webpush';

const dec = new TextDecoder(); const enc = new TextEncoder();
const cat = (...a: Uint8Array[]): Uint8Array => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> { const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8)); }

/** Côté « navigateur » : un abonnement (clé p256dh + secret auth) et le déchiffrement RFC 8291 du corps reçu. */
async function makeSubscription() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)); const auth = crypto.getRandomValues(new Uint8Array(16));
  const decrypt = async (body: Uint8Array): Promise<string> => {
    const salt = body.slice(0, 16); const idlen = body[20]; const asPub = body.slice(21, 21 + idlen); const record = body.slice(21 + idlen);
    const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, kp.privateKey, 256));
    const ikm = await hkdf(auth, ecdh, cat(enc.encode('WebPush: info\0'), pub, asPub), 32);
    const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16); const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), record));
    expect(plain[plain.length - 1]).toBe(2); // délimiteur du dernier enregistrement
    return dec.decode(plain.slice(0, -1));
  };
  return { p256dh: b64u(pub), auth: b64u(auth), decrypt };
}

describe('Web Push : chiffrement aes128gcm (RFC 8291)', () => {
  it('aller-retour : ce qui est chiffré se déchiffre à l\'identique (accents, ♡, arabe translittéré)', async () => {
    const sub = await makeSubscription();
    for (const text of ['Sabah el kheir ♡ Qu’Allah veille sur toi.', 'x', 'é'.repeat(900)]) {
      const body = await encryptPayload(enc.encode(JSON.stringify({ text })), sub.p256dh, sub.auth);
      expect(JSON.parse(await sub.decrypt(body)).text).toBe(text);
    }
  });
  it('en-tête RFC : sel 16 o, taille d\'enregistrement 4096, clé éphémère 65 o', async () => {
    const sub = await makeSubscription(); const body = await encryptPayload(enc.encode('hello'), sub.p256dh, sub.auth);
    expect(new DataView(body.buffer, body.byteOffset).getUint32(16)).toBe(4096); expect(body[20]).toBe(65); expect(body[21]).toBe(4);
  });
  it('deux envois du même message ne donnent jamais le même corps (sel et clé éphémère aléatoires)', async () => {
    const sub = await makeSubscription(); const a = await encryptPayload(enc.encode('m'), sub.p256dh, sub.auth); const b = await encryptPayload(enc.encode('m'), sub.p256dh, sub.auth);
    expect(b64u(a)).not.toBe(b64u(b));
  });
  it('mauvaise clé d\'abonnement, secret trop court ou message trop long : refusés', async () => {
    const sub = await makeSubscription();
    await expect(encryptPayload(enc.encode('m'), 'AAAA', sub.auth)).rejects.toThrow();
    await expect(encryptPayload(enc.encode('m'), sub.p256dh, 'AA')).rejects.toThrow();
    await expect(encryptPayload(new Uint8Array(4000), sub.p256dh, sub.auth)).rejects.toThrow();
  });
  it('un autre abonné ne peut PAS déchiffrer', async () => {
    const a = await makeSubscription(); const b = await makeSubscription();
    const body = await encryptPayload(enc.encode('secret'), a.p256dh, a.auth);
    await expect(b.decrypt(body)).rejects.toThrow();
  });
});

describe('VAPID (RFC 8292)', () => {
  it('jeton ES256 valide : audience = origine du service, expiration ≤ 24 h, signature vérifiable avec la clé publique', async () => {
    const v = await generateVapid();
    expect(unb64u(v.publicKey).length).toBe(65);
    const now = 1_800_000_000_000;
    const auth = await vapidAuthorization('https://web.push.apple.com/abc/def', v, 'https://mdelarose.fr', now);
    const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(auth)!;
    expect(m[4]).toBe(v.publicKey);
    const claims = JSON.parse(dec.decode(unb64u(m[2])));
    expect(claims.aud).toBe('https://web.push.apple.com'); expect(claims.sub).toBe('https://mdelarose.fr'); expect(claims.exp - now / 1000).toBeLessThanOrEqual(24 * 3600);
    const pub = await crypto.subtle.importKey('raw', unb64u(v.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, unb64u(m[3]), enc.encode(`${m[1]}.${m[2]}`))).toBe(true);
    expect(JSON.stringify(v.publicKey)).not.toContain('"d"');
  });
});

describe('envoi', () => {
  it('requête conforme : en-têtes, corps chiffré ; 201 = succès', async () => {
    const sub = await makeSubscription(); const v = await generateVapid(); let seen: { url: string; headers: Record<string, string>; body: Uint8Array } | null = null;
    const r = await sendPush({ endpoint: 'https://web.push.apple.com/x', p256dh: sub.p256dh, auth: sub.auth }, { title: 'RADIA ♡', body: 'Coucou' }, v, 'https://mdelarose.fr', { fetchFn: (async (url: string, init: RequestInit) => { seen = { url, headers: init.headers as Record<string, string>, body: init.body as Uint8Array }; return new Response('', { status: 201 }); }) as unknown as typeof fetch });
    expect(r).toEqual({ ok: true });
    expect(seen!.headers['Content-Encoding']).toBe('aes128gcm'); expect(seen!.headers.TTL).toBeTruthy(); expect(seen!.headers.Authorization).toMatch(/^vapid t=/);
    expect(JSON.parse(await sub.decrypt(seen!.body)).body).toBe('Coucou');
  });
  it('404 / 410 = abonnement expiré (à supprimer) ; 5xx = erreur à réessayer, jamais supprimé', async () => {
    const sub = await makeSubscription(); const v = await generateVapid();
    const mk = (status: number) => (async () => new Response('x', { status })) as unknown as typeof fetch;
    const base = { endpoint: 'https://fcm.googleapis.com/x', p256dh: sub.p256dh, auth: sub.auth };
    expect(await sendPush(base, {}, v, 's', { fetchFn: mk(410) })).toMatchObject({ ok: false, gone: true });
    expect(await sendPush(base, {}, v, 's', { fetchFn: mk(404) })).toMatchObject({ ok: false, gone: true });
    expect(await sendPush(base, {}, v, 's', { fetchFn: mk(503) })).toMatchObject({ ok: false, gone: false });
  });
  it('on n\'envoie qu\'aux vrais services de push (aucune adresse arbitraire)', () => {
    for (const ok of ['https://web.push.apple.com/abc', 'https://fcm.googleapis.com/fcm/send/x', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://wns2-par02p.notify.windows.com/w/?token=x']) expect(isPushHost(ok)).toBe(true);
    for (const bad of ['http://web.push.apple.com/x', 'https://evil.example.com/x', 'https://127.0.0.1/x', 'https://web.push.apple.com.evil.com/x', 'ftp://fcm.googleapis.com/x', 'pas une adresse']) expect(isPushHost(bad)).toBe(false);
  });
});
