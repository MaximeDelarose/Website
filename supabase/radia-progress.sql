-- RADIA ♡ — progression de jeu PARTAGÉE avec le consentement DISTINCT « Partager ma progression de jeu ». Trace de ce qui est appliqué ; rejouable.
-- Complète radia-stats.sql (temps de jeu). Collecté (rien d'autre) : un instantané de PROGRESSION (chapitre/niveau, niveau d'expérience, compteurs de jeu,
-- avancement PIMBÊCHE et Mon Monde), des jalons (niveau terminé, chapitre débloqué…), le temps ACTIF par mode de jeu et un résumé d'activité par session.
-- Jamais : messages, conversations, contacts, position, détail des interactions sociales, ni enregistrement des clics.
-- Tables verrouillées (RLS sans politique) : seul le code ci-dessous y accède. Radia (anonyme) : radia_progress_join / _push / _mine / _pause (secret d'appareil haché) ;
-- suppression : fonction Edge radia-push (action « progress-forget »). Le créateur : radia_progress_admin (comptes de public.site_admins).
-- Conservation : sessions 90 jours, jalons et temps par mode 400 jours (purge nocturne par la fonction Edge radia-push).

alter table public.radia_stat_devices
  add column if not exists progress_consent_at timestamptz,
  add column if not exists progress_paused_at timestamptz,
  add column if not exists snap jsonb,
  add column if not exists snap_at timestamptz;

create table if not exists public.radia_prog_events (
  device_id uuid not null references public.radia_stat_devices(id) on delete cascade,
  eid text not null,                         -- identifiant stable d'un jalon : un renvoi ne crée jamais de doublon
  at timestamptz not null default now(),
  kind text not null,
  label text not null,
  primary key (device_id, eid)
);
alter table public.radia_prog_events enable row level security;
revoke all on public.radia_prog_events from anon, authenticated;

create table if not exists public.radia_prog_sessions (
  id uuid primary key,
  device_id uuid not null references public.radia_stat_devices(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_push_at timestamptz not null default now(),
  active_s int not null default 0,
  seq int not null default 0,                -- ordre des envois : un envoi déjà vu est ignoré
  summary jsonb,
  modes_seen text[] not null default '{}'
);
create index if not exists radia_prog_sessions_dev on public.radia_prog_sessions (device_id, started_at desc);
alter table public.radia_prog_sessions enable row level security;
revoke all on public.radia_prog_sessions from anon, authenticated;

create table if not exists public.radia_prog_modes (
  device_id uuid not null references public.radia_stat_devices(id) on delete cascade,
  day date not null,
  mode text not null,
  active_s int not null default 0,
  sessions int not null default 0,
  primary key (device_id, day, mode)
);
alter table public.radia_prog_modes enable row level security;
revoke all on public.radia_prog_modes from anon, authenticated;

-- ---------------------------------------------------------------- côté Radia
-- Inscription au partage de PROGRESSION (consentement distinct du temps de jeu). Un appareil créé ici n'a PAS accepté le temps de jeu :
-- son partage de temps est « en pause » tant que radia_stats_join n'est pas appelé.
create or replace function public.radia_progress_join(p_device uuid, p_secret text, p_platform text default 'other', p_tz text default 'Europe/Paris')
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int; plat text := case when p_platform in ('pwa', 'safari') then p_platform else 'other' end;
begin
  if p_device is null or p_secret is null or length(p_secret) not between 24 and 128 then return jsonb_build_object('ok', false, 'error', 'args'); end if;
  if exists (select 1 from public.radia_stat_devices where id = p_device) then
    if public.radia_stat_auth(p_device, p_secret) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
    update public.radia_stat_devices set progress_paused_at = null, progress_consent_at = now(), platform = plat, tz = left(coalesce(p_tz, 'Europe/Paris'), 60) where id = p_device;
    return jsonb_build_object('ok', true);
  end if;
  select count(*) into n from public.radia_stat_devices;
  if n >= 30 then return jsonb_build_object('ok', false, 'error', 'full'); end if;
  insert into public.radia_stat_devices (id, secret_hash, platform, tz, paused_at, progress_consent_at)
    values (p_device, public.radia_stat_hash(p_secret), plat, left(coalesce(p_tz, 'Europe/Paris'), 60), now(), now());
  return jsonb_build_object('ok', true);
end $$;

-- arrêt du partage de progression (les données déjà reçues restent jusqu'à une demande de suppression)
create or replace function public.radia_progress_pause(p_device uuid, p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.radia_stat_auth(p_device, p_secret) is null then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  update public.radia_stat_devices set progress_paused_at = now() where id = p_device;
  return jsonb_build_object('ok', true);
end $$;

-- ce que le serveur conserve sur CET appareil (« Voir mes données »)
create or replace function public.radia_progress_mine(p_device uuid, p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare dev public.radia_stat_devices;
begin
  select * into dev from public.radia_stat_devices where id = p_device and secret_hash = public.radia_stat_hash(p_secret);
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  return jsonb_build_object('ok', true, 'consent_at', dev.progress_consent_at, 'paused_at', dev.progress_paused_at, 'snap_at', dev.snap_at, 'snap', dev.snap,
    'events', (select count(*) from public.radia_prog_events where device_id = p_device),
    'sessions', (select count(*) from public.radia_prog_sessions where device_id = p_device));
end $$;

-- Envoi régulier : instantané + jalons + temps actif par mode + résumé de la session. Idempotent (jalons par identifiant, envois par numéro d'ordre).
create or replace function public.radia_progress_push(p_device uuid, p_secret text, p_session uuid, p_seq int, p_snap jsonb, p_events jsonb, p_modes jsonb, p_visited jsonb, p_summary jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare dev public.radia_stat_devices; s public.radia_prog_sessions; today date := (now() at time zone 'Europe/Paris')::date;
  ev jsonb; k text; v int; gap numeric; total int := 0; credit int; fresh boolean := false; m text;
  modes_ok text[] := array['chapters','endless','world','dressing','pimbeche','casino','chess','events','other'];
  kinds_ok text[] := array['chapter_start','level_done','chapter_unlocked','chapter_done','narrative','xp_level','pimb_unlock','pimb_upgrade'];
begin
  if p_session is null or p_seq is null or p_seq < 0 then return jsonb_build_object('ok', false, 'error', 'args'); end if;
  select * into dev from public.radia_stat_devices where id = p_device and secret_hash = public.radia_stat_hash(p_secret);
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  if dev.progress_consent_at is null or dev.progress_paused_at is not null then return jsonb_build_object('ok', false, 'error', 'paused'); end if;
  if coalesce(length(p_snap::text), 0) > 8000 or coalesce(length(p_summary::text), 0) > 4000 or coalesce(length(p_events::text), 0) > 8000 then return jsonb_build_object('ok', false, 'error', 'size'); end if;

  select * into s from public.radia_prog_sessions where id = p_session and device_id = p_device;
  if not found then
    insert into public.radia_prog_sessions (id, device_id, seq) values (p_session, p_device, -1) returning * into s;
    fresh := true;
  end if;
  if p_seq <= s.seq then return jsonb_build_object('ok', true, 'dup', true); end if; -- envoi déjà traité : rien n'est compté deux fois

  -- jalons : au plus 30 par envoi, identifiants stables
  if jsonb_typeof(p_events) = 'array' then
    for ev in select * from jsonb_array_elements(p_events) limit 30 loop
      if (ev->>'kind') = any (kinds_ok) and length(coalesce(ev->>'id', '')) between 1 and 40 then
        insert into public.radia_prog_events (device_id, eid, at, kind, label)
        values (p_device, ev->>'id',
          case when (ev->>'at') ~ '^[0-9]{10,13}$' and abs(extract(epoch from now()) - (ev->>'at')::numeric / 1000) < 172800 then to_timestamp((ev->>'at')::numeric / 1000) else now() end,
          ev->>'kind', left(coalesce(ev->>'label', ''), 140))
        on conflict (device_id, eid) do nothing;
      end if;
    end loop;
  end if;

  -- temps actif par mode : jamais plus que le temps réellement écoulé depuis le dernier envoi
  gap := extract(epoch from (now() - s.last_push_at));
  if fresh then gap := 60; end if;
  if jsonb_typeof(p_modes) = 'object' then
    for k in select jsonb_object_keys(p_modes) loop
      if k = any (modes_ok) and jsonb_typeof(p_modes->k) = 'number' then
        v := least(greatest((p_modes->>k)::int, 0), 150);
        credit := least(v, greatest(0, floor(gap)::int + 5 - total));
        if credit > 0 then
          total := total + credit;
          insert into public.radia_prog_modes (device_id, day, mode, active_s) values (p_device, today, k, credit)
          on conflict (device_id, day, mode) do update set active_s = radia_prog_modes.active_s + excluded.active_s;
        end if;
      end if;
    end loop;
  end if;
  -- sessions par mode : un mode visité compte UNE fois par session
  if jsonb_typeof(p_visited) = 'array' then
    for m in select jsonb_array_elements_text(p_visited) limit 9 loop
      if m = any (modes_ok) and not (m = any (s.modes_seen)) then
        update public.radia_prog_sessions set modes_seen = array_append(modes_seen, m) where id = s.id;
        insert into public.radia_prog_modes (device_id, day, mode, sessions) values (p_device, today, m, 1)
        on conflict (device_id, day, mode) do update set sessions = radia_prog_modes.sessions + 1;
      end if;
    end loop;
  end if;

  update public.radia_prog_sessions set seq = p_seq, last_push_at = now(), active_s = active_s + total,
    summary = case when jsonb_typeof(p_summary) = 'object' then p_summary else summary end where id = s.id;
  if jsonb_typeof(p_snap) = 'object' then
    update public.radia_stat_devices set snap = p_snap, snap_at = now(), last_seen = now() where id = p_device;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- côté créateur
create or replace function public.radia_progress_admin(p_device uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare dev public.radia_stat_devices;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into dev from public.radia_stat_devices where id = p_device;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  return jsonb_build_object('ok', true, 'consent', dev.progress_consent_at is not null and dev.progress_paused_at is null,
    'consent_at', dev.progress_consent_at, 'paused_at', dev.progress_paused_at, 'snap', dev.snap, 'snap_at', dev.snap_at,
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', eid, 'at', at, 'kind', kind, 'label', label) order by at desc) from (select * from public.radia_prog_events where device_id = p_device order by at desc limit 120) e), '[]'::jsonb),
    'modes', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'mode', mode, 'active_s', active_s, 'sessions', sessions)) from (select * from public.radia_prog_modes where device_id = p_device and day >= current_date - 60) q), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'started_at', started_at, 'last_push_at', last_push_at, 'active_s', active_s, 'summary', summary, 'modes', modes_seen) order by started_at desc) from (select * from public.radia_prog_sessions where device_id = p_device order by started_at desc limit 60) q), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- droits
revoke all on function public.radia_progress_join(uuid, text, text, text), public.radia_progress_pause(uuid, text), public.radia_progress_mine(uuid, text),
  public.radia_progress_push(uuid, text, uuid, int, jsonb, jsonb, jsonb, jsonb, jsonb), public.radia_progress_admin(uuid) from public, anon, authenticated;
grant execute on function public.radia_progress_join(uuid, text, text, text), public.radia_progress_pause(uuid, text), public.radia_progress_mine(uuid, text),
  public.radia_progress_push(uuid, text, uuid, int, jsonb, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.radia_progress_admin(uuid) to authenticated;
