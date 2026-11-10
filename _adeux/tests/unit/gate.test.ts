import { describe, expect, it } from 'vitest'
import { COOKIE, codeMatches, gate, makeToken, verifyToken } from '../../server/gate'

const env = { ADEUX_ACCESS_CODES: 'alpha-123, beta-456', ADEUX_COOKIE_SECRET: 'x'.repeat(40) }
const get = (path = '/', headers: Record<string, string> = {}) => new Request('https://adeux.example' + path, { headers })

describe('porte d’accès privée', () => {
  it('ferme par défaut si non configurée', async () => {
    expect((await gate(get(), {}))?.status).toBe(503)
  })
  it('bloque le HTML ET les ressources sans cookie (ce n’est pas une simple URL cachée)', async () => {
    const html = await gate(get('/', { Accept: 'text/html' }), env)
    expect(html?.status).toBe(401); expect(await html!.text()).toContain('Code d’invitation')
    expect((await gate(get('/assets/index-abc.js'), env))?.status).toBe(401)
    expect((await gate(get('/manifest.webmanifest'), env))?.status).toBe(401)
    expect(html!.headers.get('X-Robots-Tag')).toContain('noindex')
  })
  it('accepte un bon code, pose un cookie HttpOnly signé, puis laisse passer', async () => {
    const body = new FormData(); body.set('code', 'beta-456')
    const r = await gate(new Request('https://adeux.example/__adeux_gate', { method: 'POST', body }), env)
    expect(r?.status).toBe(303)
    const cookie = r!.headers.get('Set-Cookie')!
    expect(cookie).toMatch(/HttpOnly/); expect(cookie).toMatch(/Secure/); expect(cookie).toMatch(/SameSite=Lax/)
    const value = cookie.split(';')[0]
    expect(await gate(get('/', { Cookie: value }), env)).toBeNull()
  })
  it('refuse un mauvais code', async () => {
    const body = new FormData(); body.set('code', 'nope')
    const r = await gate(new Request('https://adeux.example/__adeux_gate', { method: 'POST', body }), env)
    expect(r?.status).toBe(401)
  })
  it('refuse un cookie falsifié, modifié ou expiré', async () => {
    const t = await makeToken(env.ADEUX_COOKIE_SECRET, 100, 0)
    expect(await verifyToken(env.ADEUX_COOKIE_SECRET, t, 50_000)).toBe(true)
    expect(await verifyToken(env.ADEUX_COOKIE_SECRET, t, 200_000)).toBe(false)
    expect(await verifyToken(env.ADEUX_COOKIE_SECRET, '9999999999.AAAA', 0)).toBe(false)
    expect(await verifyToken('autre-secret' + 'y'.repeat(30), t, 50_000)).toBe(false)
    expect((await gate(get('/', { Cookie: `${COOKIE}=${t.replace(/.$/, 'X')}` }), env, 50_000))?.status).toBe(401)
  })
  it('codes : comparaison exacte, pas de code vide', () => {
    expect(codeMatches('alpha-123', env.ADEUX_ACCESS_CODES)).toBe(true)
    expect(codeMatches('', ',')).toBe(false); expect(codeMatches('alpha-12', env.ADEUX_ACCESS_CODES)).toBe(false)
  })
})
