/**
 * Photos privées : stockées chiffrées (AES-GCM) dans assets/p/*.bin.
 * La clé vient du lien envoyé à Radia (…/#k=CLÉ) ; elle est mémorisée dans le
 * navigateur pour les visites suivantes. Sans clé, le jeu fonctionne
 * normalement et affiche les illustrations à la place des photos.
 */
const LS = 'radia-k';
const cache = new Map<string, Promise<string | null>>();
const ready = new Map<string, string>();

export function photoKey(): string | null {
  try {
    const m = location.hash.match(/k=([A-Za-z0-9_-]{20,})/);
    if (m) { localStorage.setItem(LS, m[1]); return m[1]; }
    return localStorage.getItem(LS);
  } catch {
    const m = location.hash.match(/k=([A-Za-z0-9_-]{20,})/);
    return m ? m[1] : null;
  }
}

export const hasPhotos = () => !!photoKey() && !!window.crypto?.subtle;

function b64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

let keyP: Promise<CryptoKey | null> | null = null;
function cryptoKey(): Promise<CryptoKey | null> {
  if (!keyP) {
    const k = photoKey();
    keyP = k && window.crypto?.subtle
      ? window.crypto.subtle.importKey('raw', b64url(k), 'AES-GCM', false, ['decrypt']).catch(() => null)
      : Promise.resolve(null);
  }
  return keyP;
}

/** Octets d'un fichier chiffré (assets/p/NOM.bin) ou null (pas de clé / absent). */
export async function decryptAsset(name: string): Promise<Uint8Array | null> {
  const key = await cryptoKey();
  if (!key) return null;
  try {
    const res = await fetch(`./assets/p/${name}.bin`);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    return new Uint8Array(await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12)));
  } catch {
    return null;
  }
}

/** URL (blob:) de la photo déchiffrée, ou null si indisponible. */
export function photoUrl(name: string): Promise<string | null> {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const plain = await decryptAsset(name);
      if (!plain) return null;
      const type = /^(char|bust)-/.test(name) ? 'image/webp' : 'image/jpeg';
      const url = URL.createObjectURL(new Blob([plain as BlobPart], { type }));
      ready.set(name, url);
      return url;
    })();
    cache.set(name, p);
  }
  return p;
}

/** Version immédiate (si déjà chargée). */
export const photoUrlNow = (name: string) => ready.get(name) ?? null;

/** Précharge les visages (pièces d'échecs) et les photos. */
export function preloadPhotos(names: string[]): void { if (hasPhotos()) for (const n of names) void photoUrl(n); }
