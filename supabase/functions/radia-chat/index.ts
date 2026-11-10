// RADIA ♡ — fonction Edge « radia-chat » (OPTIONNELLE, NON DÉPLOYÉE PAR DÉFAUT) : réponses de conversation générées par un modèle.
//   POST { pid, text, history[], memory[], device } -> { ok: true, lines: string[] }   |   { ok: false, error }
//   La clé du modèle est le secret ANTHROPIC_API_KEY de CETTE fonction (supabase secrets set) : jamais dans le JavaScript du jeu.
//   Sans clé, ou au-delà des plafonds, ou en cas d'erreur / de délai dépassé : { ok: false } et le jeu répond avec son moteur local (hors-ligne compris).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { LIMITS, buildSystem, cleanReply, validateRequest, withinCaps } from './logic.ts';

const MODEL = Deno.env.get('RADIA_CHAT_MODEL') ?? 'claude-haiku-5-5';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = { 'Access-Control-Allow-Origin': 'https://mdelarose.fr', 'Access-Control-Allow-Headers': 'content-type, authorization, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...cors } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ ok: false, error: 'disabled' }, 503); // pas de clé : fonction inactive, le jeu reste sur son moteur local
  let body: unknown; try { body = await req.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  const chk = validateRequest(body);
  if (!chk.ok) return json({ ok: false, error: chk.error }, 400);
  const day = new Date().toISOString().slice(0, 10);
  // compteurs atomiques (table radia_chat_usage(day, device, n)) : plafond global et par appareil
  const { data: caps } = await db.rpc('radia_chat_count', { p_day: day, p_device: chk.req.device });
  const c = caps as { global: number; device: number } | null;
  const verdict = withinCaps(c?.global ?? 0, c?.device ?? 0);
  if (verdict !== 'ok') return json({ ok: false, error: verdict }, 429);
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const messages = [...chk.req.history.map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text })), { role: 'user', content: chk.req.text }];
    while (messages.length && messages[0].role !== 'user') messages.shift();
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 220, system: buildSystem(chk.req), messages }) });
    if (!r.ok) return json({ ok: false, error: 'upstream' }, 502);
    const out = await r.json() as { content?: { type: string; text?: string }[] };
    const lines = cleanReply(out.content?.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n') ?? '');
    return lines ? json({ ok: true, lines }) : json({ ok: false, error: 'filtered' }, 200);
  } catch { return json({ ok: false, error: 'timeout' }, 504); } finally { clearTimeout(timer); void LIMITS; }
});
