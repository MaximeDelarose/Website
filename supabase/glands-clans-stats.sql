-- =============================================================================
--  Glands globaux, clans, statistiques du site et outils admin
--
--  • Glands globaux : un porte-monnaie de glands par compte, commun à tous les
--    jeux, avec l'historique de chaque mouvement. AUCUN JEU N'EST BRANCHÉ :
--    toutes les sources (acorn_sources) sont désactivées, acorn_earn refuse
--    donc tout pour l'instant. Seuls les admins peuvent donner / retirer.
--  • Clans : 3 clans, chacun choisit le sien (changement possible tous les
--    7 jours). Leur utilité viendra plus tard.
--  • site_stats() : statistiques publiques (page stats.html).
--  • admin_*() : outils de la page admin.html, réservés à site_admins.
--
--  Comme le reste : tables verrouillées (RLS sans politique d'écriture), tout
--  passe par des fonctions security definer qui vérifient.
-- =============================================================================

-- ------------------------------------------------------------------- clans --
create table if not exists public.clans (
  id     text primary key check (id ~ '^[a-z0-9-]{2,20}$'),
  name   text not null,
  emblem text not null,
  color  text not null,
  motto  text not null default '',
  ord    int  not null default 0
);
insert into public.clans (id, name, emblem, color, motto, ord) values
  ('chene',  'Clan du Chêne',  '🌳', '#5b8a4a', 'Patience et racines profondes.', 1),
  ('braise', 'Clan de la Braise', '🔥', '#e8873a', 'Vifs comme un feu d''automne.', 2),
  ('givre',  'Clan du Givre',  '❄️', '#3d7cc9', 'Calmes, froids et précis.', 3)
on conflict (id) do nothing;

create table if not exists public.clan_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  clan_id    text not null references public.clans(id),
  joined_at  timestamptz not null default now()
);
create index if not exists clan_members_clan on public.clan_members (clan_id);

-- --------------------------------------------------------- glands globaux --
create table if not exists public.acorn_wallets (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    bigint not null default 0 check (balance >= 0),
  earned     bigint not null default 0,          -- total gagné (jamais diminué)
  spent      bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.acorn_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount     bigint not null check (amount <> 0),  -- + gain, - dépense / retrait
  game       text not null,                        -- jeu d'origine, ou 'admin', 'shop'…
  reason     text not null default '',
  meta       jsonb not null default '{}'::jsonb,
  by_admin   uuid,                                 -- admin qui a fait le mouvement
  created_at timestamptz not null default now()
);
create index if not exists acorn_ledger_user on public.acorn_ledger (user_id, created_at desc);
create index if not exists acorn_ledger_recent on public.acorn_ledger (created_at desc);

-- Jeux autorisés à donner des glands, avec leurs plafonds. Tous désactivés.
create table if not exists public.acorn_sources (
  game         text primary key,
  name         text not null,
  max_per_call int  not null default 100,
  max_per_hour int  not null default 1000,
  enabled      boolean not null default false
);
insert into public.acorn_sources (game, name) values
  ('survivor', 'Écureuil Survivor'), ('grand-chene', 'Le Grand Chêne'), ('merger', 'Merger'),
  ('suika', 'Suika'), ('dice', 'Écureuil Dice'), ('king-dice', 'King Dice'), ('ages', 'Age of Defense'),
  ('golf', 'Mini-golf'), ('grimpe', 'Grimpe-Chêne')
on conflict (game) do nothing;

alter table public.clans         enable row level security;
alter table public.clan_members  enable row level security;
alter table public.acorn_wallets enable row level security;
alter table public.acorn_ledger  enable row level security;
alter table public.acorn_sources enable row level security;
drop policy if exists "clans lecture" on public.clans;
create policy "clans lecture" on public.clans for select using (true);
revoke all on public.clan_members, public.acorn_wallets, public.acorn_ledger, public.acorn_sources from anon, authenticated;
revoke insert, update, delete on public.clans from anon, authenticated;
grant select on public.clans to anon, authenticated;

-- ------------------------------------------------- mouvement de glands (interne) --
create or replace function public.acorn_move(p_user uuid, p_amount bigint, p_game text, p_reason text, p_meta jsonb, p_admin uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_bal bigint;
begin
  if p_amount = 0 then raise exception 'invalid_amount'; end if;
  insert into acorn_wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  update acorn_wallets set
      balance = balance + p_amount,
      earned  = earned + greatest(p_amount, 0),
      spent   = spent + greatest(-p_amount, 0),
      updated_at = now()
    where user_id = p_user and balance + p_amount >= 0
    returning balance into v_bal;
  if v_bal is null then raise exception 'not_enough_acorns'; end if;
  insert into acorn_ledger (user_id, amount, game, reason, meta, by_admin)
    values (p_user, p_amount, coalesce(p_game, ''), left(coalesce(p_reason, ''), 120), coalesce(p_meta, '{}'::jsonb), p_admin);
  return v_bal;
end $$;
revoke all on function public.acorn_move(uuid, bigint, text, text, jsonb, uuid) from public, anon, authenticated;

-- ------------------------------------------------------- glands : joueur --
create or replace function public.acorn_me()
returns jsonb language plpgsql security definer set search_path = public as $$
declare w acorn_wallets%rowtype;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  select * into w from acorn_wallets where user_id = auth.uid();
  return jsonb_build_object(
    'balance', coalesce(w.balance, 0), 'earned', coalesce(w.earned, 0), 'spent', coalesce(w.spent, 0),
    'history', coalesce((select jsonb_agg(x) from (
        select amount, game, reason, created_at from acorn_ledger where user_id = auth.uid() order by created_at desc limit 20) x), '[]'::jsonb));
end $$;

-- Gain depuis un jeu : PRÊT MAIS PAS BRANCHÉ (toutes les sources sont désactivées).
create or replace function public.acorn_earn(p_game text, p_amount int, p_reason text default '', p_meta jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s acorn_sources%rowtype; v_hour bigint; v_bal bigint;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  select * into s from acorn_sources where game = p_game;
  if not found or not s.enabled then raise exception 'source_disabled'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > s.max_per_call then raise exception 'invalid_amount'; end if;
  select coalesce(sum(amount), 0) into v_hour from acorn_ledger
    where user_id = auth.uid() and game = p_game and amount > 0 and created_at > now() - interval '1 hour';
  if v_hour + p_amount > s.max_per_hour then raise exception 'rate_limited'; end if;
  v_bal := acorn_move(auth.uid(), p_amount, p_game, p_reason, p_meta, null);
  return jsonb_build_object('ok', true, 'balance', v_bal);
end $$;

-- Dépense (boutiques futures) : le solde est vérifié.
create or replace function public.acorn_spend(p_amount int, p_game text, p_reason text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_bal bigint;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;
  v_bal := acorn_move(auth.uid(), -p_amount, p_game, p_reason, '{}'::jsonb, null);
  return jsonb_build_object('ok', true, 'balance', v_bal);
end $$;

-- ------------------------------------------------------------- clans : joueur --
create or replace function public.clan_me()
returns jsonb language plpgsql security definer set search_path = public as $$
declare m clan_members%rowtype;
begin
  if auth.uid() is null then return jsonb_build_object('clan', null); end if;
  select * into m from clan_members where user_id = auth.uid();
  return jsonb_build_object('clan', m.clan_id, 'joined_at', m.joined_at,
    'next_change', case when m.joined_at is null or public.is_admin() then null else m.joined_at + interval '7 days' end);
end $$;

create or replace function public.clan_join(p_clan text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m clan_members%rowtype;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  if not exists (select 1 from clans where id = p_clan) then raise exception 'unknown_clan'; end if;
  select * into m from clan_members where user_id = auth.uid();
  if found then
    if m.clan_id = p_clan then return public.clan_me(); end if;
    if m.joined_at > now() - interval '7 days' and not public.is_admin() then raise exception 'clan_cooldown'; end if;
    update clan_members set clan_id = p_clan, joined_at = now() where user_id = auth.uid();
  else
    insert into clan_members (user_id, clan_id) values (auth.uid(), p_clan);
  end if;
  return public.clan_me();
end $$;

-- ------------------------------------------------------ statistiques publiques --
create or replace function public.site_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'accounts',      (select count(*) from profiles),
    'acorns_earned', (select coalesce(sum(earned), 0) from acorn_wallets),
    'acorns_live',   (select count(*) > 0 from acorn_sources where enabled),
    'runs',          (select count(*) from rd_runs where ended_at is not null)
                   + (select count(*) from lb_scores)
                   + (select count(*) from daily_scores),
    'scores',        (select count(*) from lb_scores),
    'clans', coalesce((select jsonb_agg(c order by c.ord) from (
        select cl.id, cl.name, cl.emblem, cl.color, cl.motto, cl.ord,
               (select count(*) from clan_members m where m.clan_id = cl.id) as members,
               (select coalesce(sum(w.earned), 0) from clan_members m join acorn_wallets w on w.user_id = m.user_id where m.clan_id = cl.id) as acorns
        from clans cl) c), '[]'::jsonb),
    'updated_at', now());
$$;

-- -------------------------------------------------------------------- admin --
create or replace function public.admin_check()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
end $$;

create or replace function public.admin_overview()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform admin_check();
  return jsonb_build_object(
    'accounts',       (select count(*) from profiles),
    'accounts_7d',    (select count(*) from profiles where created_at > now() - interval '7 days'),
    'admins',         (select count(*) from site_admins),
    'saves',          coalesce((select jsonb_object_agg(game_id, n) from (select game_id, count(*) n from game_saves group by 1) x), '{}'::jsonb),
    'rejects_7d',     (select count(*) from game_save_rejects where at > now() - interval '7 days'),
    'dice_runs',      (select count(*) from rd_runs),
    'dice_runs_7d',   (select count(*) from rd_runs where started_at > now() - interval '7 days'),
    'daily_scores',   (select count(*) from daily_scores),
    'acorns',         jsonb_build_object(
                        'wallets', (select count(*) from acorn_wallets),
                        'balance', (select coalesce(sum(balance), 0) from acorn_wallets),
                        'earned',  (select coalesce(sum(earned), 0) from acorn_wallets),
                        'moves_7d', (select count(*) from acorn_ledger where created_at > now() - interval '7 days')),
    'clans',          (select site_stats() -> 'clans'),
    'leaderboards',   coalesce((select jsonb_agg(x order by x.id) from (
                        select g.id, g.name, g.enabled, g.higher_is_better, g.min_score, g.max_score, g.max_per_hour,
                               (select count(*) from lb_scores s where s.game_id = g.id) as scores
                        from lb_games g) x), '[]'::jsonb),
    'sources',        coalesce((select jsonb_agg(s order by s.name) from acorn_sources s), '[]'::jsonb),
    'recent_accounts', coalesce((select jsonb_agg(x) from (
                        select p.id, p.pseudo, p.created_at from profiles p order by p.created_at desc limit 10) x), '[]'::jsonb),
    'recent_scores',  coalesce((select jsonb_agg(x) from (
                        select s.id, s.game_id, s.player, s.score, s.created_at from lb_scores s order by s.created_at desc limit 10) x), '[]'::jsonb),
    'recent_rejects', coalesce((select jsonb_agg(x) from (
                        select r.game_id, r.reason, r.at as created_at from game_save_rejects r order by r.at desc limit 10) x), '[]'::jsonb),
    'recent_acorns',  coalesce((select jsonb_agg(x) from (
                        select l.amount, l.game, l.reason, l.created_at, p.pseudo from acorn_ledger l left join profiles p on p.id = l.user_id
                        order by l.created_at desc limit 10) x), '[]'::jsonb));
end $$;

-- Recherche d'un joueur (pseudo, début d'e-mail ou identifiant)
create or replace function public.admin_find_user(p_q text)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare q text := btrim(coalesce(p_q, ''));
begin
  perform admin_check();
  if char_length(q) < 2 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(x) from (
    select u.id, p.pseudo, u.email, u.created_at, u.last_sign_in_at,
           exists (select 1 from site_admins a where a.user_id = u.id) as admin,
           (select clan_id from clan_members m where m.user_id = u.id) as clan,
           coalesce((select balance from acorn_wallets w where w.user_id = u.id), 0) as acorns,
           coalesce((select jsonb_agg(g.game_id) from game_saves g where g.user_id = u.id), '[]'::jsonb) as saves
    from auth.users u left join profiles p on p.id = u.id
    where p.pseudo ilike '%' || q || '%' or u.email ilike q || '%' or u.id::text = q
    order by u.created_at desc limit 20) x), '[]'::jsonb);
end $$;

create or replace function public.admin_acorn_grant(p_user uuid, p_amount int, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_bal bigint;
begin
  perform admin_check();
  if p_amount is null or p_amount = 0 or abs(p_amount) > 1000000 then raise exception 'invalid_amount'; end if;
  v_bal := acorn_move(p_user, p_amount, 'admin', coalesce(nullif(btrim(p_reason), ''), 'Ajustement admin'), '{}'::jsonb, auth.uid());
  return jsonb_build_object('ok', true, 'balance', v_bal);
end $$;

create or replace function public.admin_acorn_history(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform admin_check();
  return coalesce((select jsonb_agg(x) from (
    select amount, game, reason, created_at, by_admin is not null as by_admin
    from acorn_ledger where user_id = p_user order by created_at desc limit 50) x), '[]'::jsonb);
end $$;

create or replace function public.admin_set_clan(p_user uuid, p_clan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_check();
  if p_clan is null or p_clan = '' then delete from clan_members where user_id = p_user; return; end if;
  if not exists (select 1 from clans where id = p_clan) then raise exception 'unknown_clan'; end if;
  insert into clan_members (user_id, clan_id) values (p_user, p_clan)
    on conflict (user_id) do update set clan_id = excluded.clan_id, joined_at = now();
end $$;

-- Efface la sauvegarde en ligne d'un jeu pour un joueur (support : sauvegarde bloquée)
create or replace function public.admin_save_reset(p_user uuid, p_game text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_check();
  delete from game_saves where user_id = p_user and game_id = p_game;
end $$;

-- Classements : créer / modifier un jeu, vider ses scores, supprimer un score
create or replace function public.admin_lb_game(p_id text, p_name text, p_higher boolean, p_min numeric, p_max numeric, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_check();
  insert into lb_games (id, name, higher_is_better, min_score, max_score, enabled)
    values (p_id, p_name, coalesce(p_higher, true), coalesce(p_min, 0), coalesce(p_max, 1000000000), coalesce(p_enabled, true))
  on conflict (id) do update set name = excluded.name, higher_is_better = excluded.higher_is_better,
    min_score = excluded.min_score, max_score = excluded.max_score, enabled = excluded.enabled;
end $$;

create or replace function public.admin_lb_reset(p_game text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform admin_check();
  delete from lb_scores where game_id = p_game;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.admin_lb_delete_score(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_check();
  delete from lb_scores where id = p_id;
end $$;

-- Sources de glands : activer un jeu et régler ses plafonds (quand on branchera)
create or replace function public.admin_acorn_source(p_game text, p_enabled boolean, p_max_call int, p_max_hour int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_check();
  update acorn_sources set enabled = coalesce(p_enabled, enabled),
    max_per_call = coalesce(p_max_call, max_per_call), max_per_hour = coalesce(p_max_hour, max_per_hour)
  where game = p_game;
  if not found then raise exception 'unknown_source'; end if;
end $$;

create or replace function public.admin_clear_rejects()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform admin_check();
  delete from game_save_rejects;
  get diagnostics n = row_count;
  return n;
end $$;

-- ----------------------------------------------------------------- droits --
do $$
declare f text;
begin
  foreach f in array array[
    'acorn_me()', 'acorn_earn(text, integer, text, jsonb)', 'acorn_spend(integer, text, text)',
    'clan_me()', 'clan_join(text)',
    'admin_check()', 'admin_overview()', 'admin_find_user(text)', 'admin_acorn_grant(uuid, integer, text)',
    'admin_acorn_history(uuid)', 'admin_set_clan(uuid, text)', 'admin_save_reset(uuid, text)',
    'admin_lb_game(text, text, boolean, numeric, numeric, boolean)', 'admin_lb_reset(text)',
    'admin_lb_delete_score(bigint)', 'admin_acorn_source(text, boolean, integer, integer)', 'admin_clear_rejects()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function public.site_stats() from public;
grant execute on function public.site_stats() to anon, authenticated;
