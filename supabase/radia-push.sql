-- RADIA ♡ — notifications quotidiennes (Web Push). Trace de ce qui est appliqué sur le projet ; rejouable.
-- Sécurité : les tables sont verrouillées (RLS activé, AUCUNE politique) : le navigateur ne peut ni lire ni écrire directement.
-- Il passe uniquement par les fonctions ci-dessous, qui valident tout (service de push légitime, tailles, plafond d'abonnés).

create table if not exists public.radia_push_config (
  id int primary key default 1 check (id = 1),
  public_key text not null,          -- clé VAPID publique (publique par nature)
  private_jwk text not null,         -- clé VAPID privée : lisible UNIQUEMENT par la fonction Edge (service role)
  cron_secret text not null,         -- secret partagé entre la planification et la fonction Edge
  created_at timestamptz not null default now()
);
alter table public.radia_push_config enable row level security;
revoke all on public.radia_push_config from anon, authenticated;

create table if not exists public.radia_push_subs (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  tz text not null default 'Europe/Paris',
  send_hour int not null default 9 check (send_hour between 8 and 20),
  enabled boolean not null default true,
  last_sent_day date,
  last_idx int not null default -1,
  deck int[] not null default '{}',
  sends int not null default 0,
  test_day date,
  test_n int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.radia_push_subs enable row level security;
revoke all on public.radia_push_subs from anon, authenticated;

-- clé publique VAPID (nécessaire au navigateur pour s'abonner)
create or replace function public.radia_push_public_key() returns text
language sql security definer set search_path = public as $$ select public_key from public.radia_push_config where id = 1 $$;

-- enregistrement d'un abonnement (validé : https, service de push connu, tailles, plafond d'abonnés)
create or replace function public.radia_push_register(p_endpoint text, p_p256dh text, p_auth text, p_tz text default 'Europe/Paris', p_hour int default 9)
returns jsonb language plpgsql security definer set search_path = public as $$
declare host text; n int;
begin
  if p_endpoint is null or length(p_endpoint) not between 20 and 600 or p_endpoint !~ '^https://' then return jsonb_build_object('ok', false, 'error', 'endpoint'); end if;
  host := substring(p_endpoint from '^https://([^/:?#]+)');
  if not (host = 'web.push.apple.com' or host like '%.push.apple.com' or host = 'fcm.googleapis.com' or host like '%.push.services.mozilla.com' or host like '%.notify.windows.com') then
    return jsonb_build_object('ok', false, 'error', 'service'); end if;
  if p_p256dh is null or length(p_p256dh) not between 80 and 100 or p_p256dh !~ '^[A-Za-z0-9_-]+$' then return jsonb_build_object('ok', false, 'error', 'key'); end if;
  if p_auth is null or length(p_auth) not between 16 and 32 or p_auth !~ '^[A-Za-z0-9_-]+$' then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select count(*) into n from public.radia_push_subs;
  if n >= 300 and not exists (select 1 from public.radia_push_subs where endpoint = p_endpoint) then return jsonb_build_object('ok', false, 'error', 'full'); end if;
  insert into public.radia_push_subs (endpoint, p256dh, auth, tz, send_hour, enabled)
  values (p_endpoint, p_p256dh, p_auth, left(coalesce(p_tz, 'Europe/Paris'), 60), least(20, greatest(8, coalesce(p_hour, 9))), true)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, tz = excluded.tz, send_hour = excluded.send_hour, enabled = true, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- désinscription (désactiver les messages quotidiens supprime l'abonnement)
create or replace function public.radia_push_unregister(p_endpoint text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin delete from public.radia_push_subs where endpoint = p_endpoint; return jsonb_build_object('ok', true); end $$;

grant execute on function public.radia_push_public_key() to anon, authenticated;
grant execute on function public.radia_push_register(text, text, text, text, int) to anon, authenticated;
grant execute on function public.radia_push_unregister(text) to anon, authenticated;
