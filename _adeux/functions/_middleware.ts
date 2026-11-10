import { gate, type GateEnv } from '../server/gate'

// Cloudflare Pages : exécuté avant chaque fichier statique. Définir les secrets avec `wrangler pages secret put`.
export const onRequest = async (ctx: { request: Request; env: GateEnv; next: () => Promise<Response> }) => {
  const blocked = await gate(ctx.request, ctx.env)
  if (blocked) return blocked
  const res = await ctx.next()
  const h = new Headers(res.headers)
  h.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}
