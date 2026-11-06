-- RADIA ♡ — statistiques de jeu PRIVÉES, partagées avec le consentement explicite de Radia. Trace de ce qui est appliqué ; rejouable.
-- Collecté (rien d'autre) : un identifiant aléatoire d'appareil, le type d'accès (application installée ou navigateur), le fuseau horaire,
-- l'heure de début/dernière activité de chaque session et le temps de jeu ACTIF. Jamais de messages, de conversations, de position,
-- ni de contenu de la partie. Les tables sont verrouillées (RLS sans politique) : seul le code ci-dessous y accède.
--  - Radia (anonyme) : radia_stats_join / _beat / _mine / _pause / _forget, authentifiée par un secret aléatoire propre à son appareil (stocké haché).
--  - Le créateur : radia_stats_admin / _admin_label / _admin_delete, réservées aux comptes de public.site_admins (connexion Google du site).
-- Conservation limitée : sessions 90 jours, jours agrégés 400 jours, appareil sans activité depuis 180 jours supprimé (planifié chaque nuit).

create table if not exists public.radia_stat_devices (
  id uuid primary key,
  secret_hash text not null,
  label text,                              -- nom donné par le créateur (« iPhone de Radia »…)
  platform text not null default 'other' check (platform in ('pwa', 'safari', 'other')),
  tz text not null default 'Europe/Paris',
  consent_at timestamptz not null default now(),
  paused_at timestamptz,                   -- partage désactivé par Radia (plus aucune donnée reçue)
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  active_total_s bigint not null default 0,
  sessions_total int not null default 0
);
alter table public.radia_stat_devices enable row level security;
revoke all on public.radia_stat_devices from anon, authenticated;

create table if not exists public.radia_stat_sessions (
  id uuid primary key,                     -- fourni par le jeu : un renvoi ne crée jamais de doublon
  device_id uuid not null references public.radia_stat_devices(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_beat_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,                         -- background | closed | replaced | timeout
  active_s int not null default 0
);
create index if not exists radia_stat_sessions_dev on public.radia_stat_sessions (device_id, started_at desc);
alter table public.radia_stat_sessions enable row level security;
revoke all on public.radia_stat_sessions from anon, authenticated;

create table if not exists public.radia_stat_days (
  device_id uuid not null references public.radia_stat_devices(id) on delete cascade,
  day date not null,                       -- jour en Europe/Paris
  active_s int not null default 0,
  sessions int not null default 0,
  primary key (device_id, day)
);
alter table public.radia_stat_days enable row level security;
revoke all on public.radia_stat_days from anon, authenticated;

create or replace function public.radia_stat_hash(p text) returns text
language sql immutable set search_path = public as $$ select encode(sha256(convert_to(coalesce(p, ''), 'utf8')), 'hex') $$;

-- vérifie l'appareil + son secret ; renvoie l'id ou null
create or replace function public.radia_stat_auth(p_device uuid, p_secret text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.radia_stat_devices where id = p_device and secret_hash = public.radia_stat_hash(p_secret)
$$;
revoke all on function public.radia_stat_auth(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- côté Radia
create or replace function public.radia_stats_join(p_device uuid, p_secret text, p_platform text default 'other', p_tz text default 'Europe/Paris')
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int; plat text := case when p_platform in ('pwa', 'safari') then p_platform else 'other' end;
begin
  if p_device is null or p_secret is null or length(p_secret) not between 24 and 128 then return jsonb_build_object('ok', false, 'error', 'args'); end if;
  if exists (select 1 from public.radia_stat_devices where id = p_device) then
    if public.radia_stat_auth(p_device, p_secret) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
    update public.radia_stat_devices set paused_at = null, platform = plat, tz = left(coalesce(p_tz, 'Europe/Paris'), 60), consent_at = now() where id = p_device;
    return jsonb_build_object('ok', true);
  end if;
  select count(*) into n from public.radia_stat_devices;
  if n >= 30 then return jsonb_build_object('ok', false, 'error', 'full'); end if;
  insert into public.radia_stat_devices (id, secret_hash, platform, tz) values (p_device, public.radia_stat_hash(p_secret), plat, left(coalesce(p_tz, 'Europe/Paris'), 60));
  return jsonb_build_object('ok', true);
end $$;

-- p_event : start | beat | end ; p_act : secondes d'activité RÉELLE depuis le dernier envoi (plafonné et borné par le temps écoulé)
create or replace function public.radia_stats_beat(p_device uuid, p_secret text, p_session uuid, p_event text, p_act int default 0, p_reason text default 'closed')
returns jsonb language plpgsql security definer set search_path = public as $$
declare dev public.radia_stat_devices; s public.radia_stat_sessions; credit int := 0; gap numeric; today date := (now() at time zone 'Europe/Paris')::date;
begin
  if p_session is null or p_event not in ('start', 'beat', 'end') then return jsonb_build_object('ok', false, 'error', 'args'); end if;
  select * into dev from public.radia_stat_devices where id = p_device and secret_hash = public.radia_stat_hash(p_secret);
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  if dev.paused_at is not null then return jsonb_build_object('ok', false, 'error', 'paused'); end if;

  select * into s from public.radia_stat_sessions where id = p_session and device_id = p_device;
  if not found then
    if p_event = 'end' then return jsonb_build_object('ok', true); end if;
    -- une seule session ouverte par appareil : l'ancienne est close à sa dernière activité connue (pas de doublon, pas de temps inventé)
    update public.radia_stat_sessions set ended_at = last_beat_at, end_reason = 'replaced' where device_id = p_device and ended_at is null;
    insert into public.radia_stat_sessions (id, device_id) values (p_session, p_device) returning * into s;
    update public.radia_stat_devices set sessions_total = sessions_total + 1, last_seen = now() where id = p_device;
    insert into public.radia_stat_days (device_id, day, sessions) values (p_device, today, 1) on conflict (device_id, day) do update set sessions = radia_stat_days.sessions + 1;
    return jsonb_build_object('ok', true, 'session', p_session);
  end if;

  if s.ended_at is not null then return jsonb_build_object('ok', true, 'renew', true); end if; -- session déjà close : le jeu en ouvre une nouvelle
  gap := extract(epoch from (now() - s.last_beat_at));
  if gap > 240 and p_event <> 'end' then -- silence trop long (téléphone verrouillé, fermeture brutale) : on ne compte rien pour ce trou
    update public.radia_stat_sessions set ended_at = last_beat_at, end_reason = 'timeout' where id = s.id;
    return jsonb_build_object('ok', true, 'renew', true);
  end if;
  credit := least(greatest(coalesce(p_act, 0), 0), 75, greatest(0, floor(gap)::int + 2)); -- jamais plus que le temps réellement écoulé
  update public.radia_stat_sessions set active_s = active_s + credit, last_beat_at = now(),
    ended_at = case when p_event = 'end' then now() else null end,
    end_reason = case when p_event = 'end' then case when p_reason in ('background', 'closed') then p_reason else 'closed' end else null end
  where id = s.id;
  update public.radia_stat_devices set active_total_s = active_total_s + credit, last_seen = now() where id = p_device;
  if credit > 0 then
    insert into public.radia_stat_days (device_id, day, active_s) values (p_device, today, credit) on conflict (device_id, day) do update set active_s = radia_stat_days.active_s + credit;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- consultation par Radia de ses propres données
create or replace function public.radia_stats_mine(p_device uuid, p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare dev public.radia_stat_devices;
begin
  select * into dev from public.radia_stat_devices where id = p_device and secret_hash = public.radia_stat_hash(p_secret);
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  return jsonb_build_object('ok', true, 'platform', dev.platform, 'tz', dev.tz, 'consent_at', dev.consent_at, 'paused_at', dev.paused_at,
    'first_seen', dev.first_seen, 'last_seen', dev.last_seen, 'active_total_s', dev.active_total_s, 'sessions_total', dev.sessions_total,
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'active_s', active_s, 'sessions', sessions) order by day desc) from (select * from public.radia_stat_days where device_id = p_device order by day desc limit 14) d), '[]'::jsonb));
end $$;

-- désactiver le partage (les données déjà reçues restent jusqu'à une demande de suppression)
create or replace function public.radia_stats_pause(p_device uuid, p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.radia_stat_auth(p_device, p_secret) is null then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  update public.radia_stat_sessions set ended_at = coalesce(ended_at, last_beat_at), end_reason = coalesce(end_reason, 'closed') where device_id = p_device;
  update public.radia_stat_devices set paused_at = now() where id = p_device;
  return jsonb_build_object('ok', true);
end $$;

-- suppression complète : faite par la fonction Edge radia-push (action « stats-forget », secret d'appareil vérifié) — voir supabase/functions/radia-push/index.ts

-- ---------------------------------------------------------------- côté créateur (connexion Google + public.site_admins)
create or replace function public.radia_stats_admin() returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb; wk date := date_trunc('week', (now() at time zone 'Europe/Paris'))::date; today date := (now() at time zone 'Europe/Paris')::date;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select coalesce(jsonb_agg(x order by (x->>'last_seen') desc nulls last), '[]'::jsonb) into out from (
    select jsonb_build_object(
      'id', d.id, 'short', left(d.id::text, 8), 'label', d.label, 'platform', d.platform, 'tz', d.tz,
      'consent_at', d.consent_at, 'paused_at', d.paused_at, 'first_seen', d.first_seen, 'last_seen', d.last_seen,
      'total_s', d.active_total_s, 'sessions_total', d.sessions_total,
      'today_s', coalesce((select active_s from public.radia_stat_days where device_id = d.id and day = today), 0),
      'week_s', coalesce((select sum(active_s) from public.radia_stat_days where device_id = d.id and day >= wk), 0),
      'sessions_today', coalesce((select sessions from public.radia_stat_days where device_id = d.id and day = today), 0),
      'last_open', (select max(started_at) from public.radia_stat_sessions where device_id = d.id),
      'last_session', (select jsonb_build_object('started_at', started_at, 'last_activity', last_beat_at, 'active_s', active_s, 'ended_at', ended_at, 'end_reason', end_reason,
                         'live', ended_at is null and last_beat_at > now() - interval '150 seconds')
                       from public.radia_stat_sessions where device_id = d.id order by started_at desc limit 1),
      'days', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'active_s', active_s, 'sessions', sessions) order by day desc) from (select * from public.radia_stat_days where device_id = d.id order by day desc limit 14) z), '[]'::jsonb),
      -- historique des 30 dernières sessions (« en cours » = activité il y a moins de 150 s ; sinon fin ESTIMÉE à la dernière activité connue)
      'sessions', coalesce((select jsonb_agg(jsonb_build_object('started_at', started_at, 'last_activity', last_beat_at, 'active_s', active_s, 'ended_at', ended_at, 'end_reason', end_reason, 'live', ended_at is null and last_beat_at > now() - interval '150 seconds') order by started_at desc) from (select * from public.radia_stat_sessions where device_id = d.id order by started_at desc limit 30) q2), '[]'::jsonb)
    ) as x from public.radia_stat_devices d
  ) q;
  return jsonb_build_object('now', now(), 'devices', out, 'retention', jsonb_build_object('sessions_days', 90, 'days_days', 400, 'idle_device_days', 180));
end $$;

create or replace function public.radia_stats_admin_label(p_device uuid, p_label text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.radia_stat_devices set label = nullif(left(trim(coalesce(p_label, '')), 40), '') where id = p_device;
  return jsonb_build_object('ok', true);
end $$;

-- suppression d'un appareil par le créateur : fonction Edge radia-push (action « stats-admin-delete », jeton Google + site_admins)

-- ---------------------------------------------------------------- droits
revoke all on function public.radia_stats_join(uuid, text, text, text), public.radia_stats_beat(uuid, text, uuid, text, int, text),
  public.radia_stats_mine(uuid, text), public.radia_stats_pause(uuid, text),
  public.radia_stats_admin(), public.radia_stats_admin_label(uuid, text) from public, anon, authenticated;
grant execute on function public.radia_stats_join(uuid, text, text, text), public.radia_stats_beat(uuid, text, uuid, text, int, text),
  public.radia_stats_mine(uuid, text), public.radia_stats_pause(uuid, text) to anon, authenticated;
grant execute on function public.radia_stats_admin(), public.radia_stats_admin_label(uuid, text) to authenticated;

-- ---------------------------------------------------------------- conservation limitée
-- Purge (sessions 90 j, jours 400 j, appareil inactif 180 j) : exécutée par la fonction Edge radia-push à chaque envoi horaire (purgeStats).
