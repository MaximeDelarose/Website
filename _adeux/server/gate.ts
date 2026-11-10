// Porte d'accès privée (Cloudflare Pages Functions). Protège TOUS les fichiers de l'application : sans cookie valide,
// ni le HTML, ni le JS, ni le manifest ne sont servis. Code(s) d'invitation = variable ADEUX_ACCESS_CODES (secret).
const enc = new TextEncoder()
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function hmac(secret: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))
}
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
export const COOKIE = 'adeux_access'

export async function makeToken(secret: string, ttlSeconds: number, now = Date.now()) {
  const exp = String(Math.floor(now / 1000) + ttlSeconds)
  return `${exp}.${await hmac(secret, exp)}`
}
export async function verifyToken(secret: string, token: string | undefined, now = Date.now()) {
  if (!token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || !/^\d+$/.test(exp)) return false
  if (Number(exp) * 1000 < now) return false
  return safeEqual(await hmac(secret, exp), sig)
}
export const codeMatches = (input: string, codes: string) => {
  const list = codes.split(',').map((c) => c.trim()).filter(Boolean)
  const i = input.trim()
  return list.some((c) => safeEqual(c, i)) && i.length > 0
}
export function readCookie(header: string | null, name: string) {
  return header?.split(';').map((p) => p.trim()).find((p) => p.startsWith(name + '='))?.slice(name.length + 1)
}

export const gatePage = (error = false) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#231C39"><title>À DEUX</title>
<style>html,body{margin:0;height:100%;background:#231C39;color:#FFF7EF;font-family:Georgia,serif}main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;box-sizing:border-box;text-align:center}
h1{margin:0;font-size:34px;letter-spacing:.04em}p{margin:0;opacity:.75;max-width:320px;line-height:1.5;font-family:system-ui,sans-serif}input,button{font:inherit;font-size:16px;border-radius:999px;border:0;padding:16px 22px;min-height:52px;width:100%;max-width:320px;box-sizing:border-box}input{background:#fff;color:#231C39;text-align:center}button{background:#F6B7A0;color:#231C39;font-weight:700}.e{color:#F3C1CC;font-size:14px}</style></head>
<body><main><h1>À DEUX</h1><p>Application en test privé. Entre ton code d’invitation.</p><form method="post" action="/__adeux_gate" style="display:contents"><input name="code" type="password" autocomplete="off" autocapitalize="off" placeholder="Code d’invitation" aria-label="Code d’invitation" required autofocus><button type="submit">Entrer</button></form>${error ? '<p class="e" role="alert">Ce code n’est pas valide.</p>' : ''}</main></body></html>`

export interface GateEnv { ADEUX_ACCESS_CODES?: string; ADEUX_COOKIE_SECRET?: string }
const COMMON = { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }

/** Cœur testable : renvoie une Response si la requête est bloquée/traitée, sinon null (laisser passer). */
export async function gate(req: Request, env: GateEnv, now = Date.now()): Promise<Response | null> {
  if (!env.ADEUX_ACCESS_CODES || !env.ADEUX_COOKIE_SECRET) {
    return new Response('Application non configurée : définis ADEUX_ACCESS_CODES et ADEUX_COOKIE_SECRET.', { status: 503, headers: COMMON }) // ferme par défaut
  }
  const url = new URL(req.url)
  if (url.pathname === '/__adeux_gate' && req.method === 'POST') {
    const code = String((await req.formData()).get('code') ?? '')
    if (codeMatches(code, env.ADEUX_ACCESS_CODES)) {
      const t = await makeToken(env.ADEUX_COOKIE_SECRET, 180 * 86400, now)
      return new Response(null, { status: 303, headers: { ...COMMON, Location: '/', 'Set-Cookie': `${COOKIE}=${t}; Path=/; Max-Age=${180 * 86400}; HttpOnly; Secure; SameSite=Lax` } })
    }
    await new Promise((r) => setTimeout(r, 600)) // freine les essais en rafale
    return new Response(gatePage(true), { status: 401, headers: { ...COMMON, 'Content-Type': 'text/html; charset=utf-8' } })
  }
  if (await verifyToken(env.ADEUX_COOKIE_SECRET, readCookie(req.headers.get('Cookie'), COOKIE), now)) return null
  const wantsHtml = req.method === 'GET' && (req.headers.get('Accept') || '').includes('text/html')
  return wantsHtml
    ? new Response(gatePage(), { status: 401, headers: { ...COMMON, 'Content-Type': 'text/html; charset=utf-8' } })
    : new Response('Accès privé', { status: 401, headers: COMMON })
}
