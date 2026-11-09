// RADIA ♡ — fonction Edge « radia-push » : envoie la petite pensée du jour (Web Push), une par jour et par appareil.
//   POST { action: 'stats-forget', device, secret } : Radia supprime TOUTES ses statistiques (secret d'appareil vérifié).
//   POST { action: 'stats-admin-delete', device }  : le créateur (compte de site_admins, jeton Google dans Authorization) supprime un appareil.
//   Les suppressions passent par ici (service role) et non par des fonctions SQL ; la purge de rétention des statistiques est lancée par l'envoi horaire.
//   POST { action: 'init' }              : crée (une seule fois) les clés VAPID et le secret de planification ; renvoie la clé publique.
//   POST { action: 'send' }              : appelée chaque heure par pg_cron (en-tête x-radia-cron) ; envoie à ceux dont c'est l'heure.
//   POST { action: 'test', endpoint }    : envoie TOUT DE SUITE une pensée à cet appareil (3 par jour au plus) pour vérifier la réception.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateVapid, isPushHost, sendPush, type VapidKeys } from './webpush.ts';
import { THOUGHTS } from './messages.ts';
import { isDue, nextThought } from './logic.ts';

const SUBJECT = 'https://mdelarose.fr';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
const rnd = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;

async function config(): Promise<{ vapid: VapidKeys; cron_secret: string } | null> {
  const { data } = await db.from('radia_push_config').select('*').eq('id', 1).maybeSingle();
  if (!data) return null;
  return { vapid: { publicKey: data.public_key, privateJwk: JSON.parse(data.private_jwk) }, cron_secret: data.cron_secret };
}

interface Row { endpoint: string; p256dh: string; auth: string; tz: string; send_hour: number; enabled: boolean; last_sent_day: string | null; last_idx: number; deck: number[]; sends: number; test_day: string | null; test_n: number }

async function deliver(row: Row, vapid: VapidKeys, nowMs: number, dayIso: string) {
  const n = nextThought(row.deck ?? [], row.last_idx ?? -1, rnd);
  const t = THOUGHTS[n.idx];
  // AUCUN DOUBLON : le jour est « réservé » de façon atomique AVANT l'envoi (deux exécutions simultanées du planificateur, un redémarrage ou un rejeu
  // ne peuvent pas envoyer deux fois le même jour). Si l'envoi échoue (sans abonnement expiré), la réservation est rendue pour un nouvel essai.
  const claim = await db.from('radia_push_subs').update({ last_sent_day: dayIso, updated_at: new Date().toISOString() }).eq('endpoint', row.endpoint).or(`last_sent_day.is.null,last_sent_day.neq.${dayIso}`).select('endpoint');
  if (claim.error || !claim.data?.length) return { ok: false, gone: false, status: 0, skipped: true };
  const res = await sendPush({ endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth }, { title: t.title ?? 'RADIA ♡', body: t.text, idx: n.idx, at: nowMs, url: './?pensee=1' }, vapid, SUBJECT);
  if (res.ok) await db.from('radia_push_subs').update({ deck: n.deck, last_idx: n.idx, sends: row.sends + 1, updated_at: new Date().toISOString() }).eq('endpoint', row.endpoint);
  else if (!res.gone) await db.from('radia_push_subs').update({ last_sent_day: row.last_sent_day }).eq('endpoint', row.endpoint);
  else if (res.gone) await db.from('radia_push_subs').delete().eq('endpoint', row.endpoint); // abonnement expiré : on le retire (l'appli se réabonnera)
  return res;
}

const sha256hex = async (t: string): Promise<string> => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Conservation limitée des statistiques : sessions 90 j, totaux par jour 400 j, appareil inactif 180 j. */
async function purgeStats(): Promise<void> {
  const ago = (d: number): string => new Date(Date.now() - d * 86400000).toISOString();
  await db.from('radia_stat_sessions').delete().lt('started_at', ago(90));
  await db.from('radia_stat_days').delete().lt('day', ago(400).slice(0, 10));
  await db.from('radia_stat_devices').delete().lt('last_seen', ago(180));
  // progression partagée : sessions 90 jours, jalons et temps par mode 400 jours
  await db.from('radia_prog_sessions').delete().lt('started_at', ago(90));
  await db.from('radia_prog_events').delete().lt('at', ago(400));
  await db.from('radia_prog_modes').delete().lt('day', ago(400).slice(0, 10));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* corps vide */ }
  const action = String(body.action ?? '');
  const cfg = await config();

  if (action === 'init') {
    if (cfg) return json({ ok: true, already: true, publicKey: cfg.vapid.publicKey });
    const v = await generateVapid();
    const secret = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const { error } = await db.from('radia_push_config').insert({ id: 1, public_key: v.publicKey, private_jwk: JSON.stringify(v.privateJwk), cron_secret: secret });
    if (error) return json({ ok: false, error: 'init' }, 500);
    return json({ ok: true, publicKey: v.publicKey });
  }
  if (action === 'stats-forget') {
    const device = String(body.device ?? ''), secret = String(body.secret ?? '');
    if (!UUID.test(device) || secret.length < 24 || secret.length > 128) return json({ ok: false, error: 'args' }, 400);
    const { data } = await db.from('radia_stat_devices').select('id').eq('id', device).eq('secret_hash', await sha256hex(secret)).maybeSingle();
    if (!data) return json({ ok: true }); // déjà supprimé ou secret inconnu : rien à faire
    const { error } = await db.from('radia_stat_devices').delete().eq('id', device); // sessions et jours : suppression en cascade
    return error ? json({ ok: false, error: 'delete' }, 500) : json({ ok: true });
  }
  if (action === 'progress-forget') {
    // supprime TOUTES les données de progression de cet appareil (jalons, sessions, temps par mode, instantané) ; le temps de jeu n'est pas touché
    const device = String(body.device ?? ''), secret = String(body.secret ?? '');
    if (!UUID.test(device) || secret.length < 24 || secret.length > 128) return json({ ok: false, error: 'args' }, 400);
    const { data } = await db.from('radia_stat_devices').select('id').eq('id', device).eq('secret_hash', await sha256hex(secret)).maybeSingle();
    if (!data) return json({ ok: true });
    const a = await db.from('radia_prog_events').delete().eq('device_id', device);
    const b = await db.from('radia_prog_sessions').delete().eq('device_id', device);
    const c = await db.from('radia_prog_modes').delete().eq('device_id', device);
    const d = await db.from('radia_stat_devices').update({ snap: null, snap_at: null, progress_consent_at: null, progress_paused_at: null }).eq('id', device);
    return a.error || b.error || c.error || d.error ? json({ ok: false, error: 'delete' }, 500) : json({ ok: true });
  }
  if (action === 'stats-admin-delete') {
    const device = String(body.device ?? '');
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!UUID.test(device) || !token) return json({ ok: false, error: 'args' }, 400);
    const { data: u } = await db.auth.getUser(token);
    if (!u?.user) return json({ ok: false, error: 'not_admin' }, 403);
    const { data: adm } = await db.from('site_admins').select('user_id').eq('user_id', u.user.id).maybeSingle();
    if (!adm) return json({ ok: false, error: 'not_admin' }, 403);
    const { error } = await db.from('radia_stat_devices').delete().eq('id', device);
    return error ? json({ ok: false, error: 'delete' }, 500) : json({ ok: true });
  }
  if (!cfg) return json({ ok: false, error: 'not-initialised' }, 503);

  if (action === 'send') {
    if (req.headers.get('x-radia-cron') !== cfg.cron_secret) return json({ ok: false, error: 'forbidden' }, 403);
    const now = Date.now();
    await purgeStats().catch(() => undefined); // conservation limitée des statistiques de jeu (sans effet sur les petites pensées)
    const { data: rows } = await db.from('radia_push_subs').select('*').eq('enabled', true);
    const due = (rows ?? []).filter((r: Row) => isDue(r, now) && isPushHost(r.endpoint));
    if (body.dry === true) return json({ ok: true, dry: true, subscribers: rows?.length ?? 0, due: due.length });
    const { localParts } = await import('./logic.ts');
    let sent = 0, failed = 0, removed = 0, skipped = 0;
    for (const r of due) { const res = await deliver(r, cfg.vapid, now, localParts(now, r.tz).day) as { ok: boolean; gone?: boolean; skipped?: boolean }; if (res.ok) sent++; else if (res.skipped) skipped++; else { failed++; if (res.gone) removed++; } }
    return json({ ok: true, subscribers: rows?.length ?? 0, due: due.length, sent, failed, removed, skipped });
  }

  if (action === 'test') {
    const endpoint = String(body.endpoint ?? '');
    if (!isPushHost(endpoint)) return json({ ok: false, error: 'service' }, 400);
    const { data: row } = await db.from('radia_push_subs').select('*').eq('endpoint', endpoint).maybeSingle();
    if (!row) return json({ ok: false, error: 'unknown' }, 404);
    const today = new Date().toISOString().slice(0, 10);
    const used = row.test_day === today ? row.test_n : 0;
    if (used >= 3) return json({ ok: false, error: 'limit' }, 429);
    await db.from('radia_push_subs').update({ test_day: today, test_n: used + 1 }).eq('endpoint', endpoint);
    const n = nextThought(row.deck ?? [], row.last_idx ?? -1, rnd);
    const res = await sendPush({ endpoint, p256dh: row.p256dh, auth: row.auth }, { title: THOUGHTS[n.idx].title ?? 'RADIA ♡', body: THOUGHTS[n.idx].text, idx: n.idx, at: Date.now(), url: './?pensee=1', test: true }, cfg.vapid, SUBJECT);
    if (!res.ok && res.gone) await db.from('radia_push_subs').delete().eq('endpoint', endpoint);
    return json(res.ok ? { ok: true } : { ok: false, error: 'push', status: res.status, gone: res.gone });
  }
  return json({ ok: false, error: 'action' }, 400);
});
