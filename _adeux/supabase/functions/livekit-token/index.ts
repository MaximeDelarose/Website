// Edge Function Supabase : génère un jeton LiveKit COURT pour un appel entre les deux participants d'une rencontre.
// Les secrets (LIVEKIT_API_KEY / LIVEKIT_API_SECRET) restent côté serveur : `supabase secrets set ...`
// Déploiement : supabase functions deploy livekit-token
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2.6.1'

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('ADEUX_ORIGIN') ?? '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  try {
    const { encounterId } = await req.json()
    if (typeof encounterId !== 'string') return json({ error: 'bad_request' }, 400)
    // Le client agit AVEC LE JWT de l'utilisateur : la RLS/les RPC décident s'il a le droit.
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const { data: u } = await sb.auth.getUser()
    if (!u.user) return json({ error: 'unauthorized' }, 401)
    const { data: allowed } = await sb.rpc('can_interact', { enc: encounterId })   // participant + rencontre active + pas de blocage
    if (!allowed) return json({ error: 'forbidden' }, 403)

    const at = new AccessToken(Deno.env.get('LIVEKIT_API_KEY')!, Deno.env.get('LIVEKIT_API_SECRET')!, { identity: u.user.id, ttl: '15m' })
    at.addGrant({ roomJoin: true, room: `adeux-${encounterId}`, canPublish: true, canSubscribe: true, canPublishData: false })
    return json({ token: await at.toJwt() })
  } catch {
    return json({ error: 'server_error' }, 500)
  }
})
