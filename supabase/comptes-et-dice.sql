-- =========================================================================
-- Comptes du site + progression d'Écureuil Dice (déjà appliqué sur le projet)
-- À exécuter après ../leaderboard/supabase.sql si on recrée la base.
-- =========================================================================

-- ---------- comptes du site (connexion Google, un compte pour tous les jeux) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text check (pseudo is null or char_length(pseudo) between 2 and 20),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profiles_read_self on public.profiles for select to authenticated using (id = (select auth.uid()));
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- ---------- Écureuil Dice : données de référence (lisibles par tous) ----------
create table public.rd_rarity (id text primary key, ord int not null, weight numeric not null, copies numeric not null);
create table public.rd_types (id text primary key, rarity text not null references public.rd_rarity(id));
create table public.rd_chests (
  id text primary key, ord int not null, price int not null, cards int not null,
  min_rarity text references public.rd_rarity(id), luck numeric not null default 1
);
create table public.rd_achievements (id text primary key, gold int not null);

insert into public.rd_rarity values
  ('commun', 0, 70, 1), ('rare', 1, 24, 0.5), ('epique', 2, 5.4, 0.25), ('legendaire', 3, 0.6, 0.1);
insert into public.rd_types values
  ('noisette','commun'),('braise','commun'),('givre','commun'),('vent','commun'),('pepite','commun'),('ronce','commun'),
  ('venin','rare'),('eclair','rare'),('mine','rare'),('croc','rare'),('echo','rare'),('pie','rare'),
  ('bucheron','epique'),('lune','epique'),('chene','epique'),('graine','epique'),('blizzard','epique'),
  ('cameleon','legendaire'),('orage','legendaire'),('ancetre','legendaire'),('comete','legendaire');
insert into public.rd_chests values
  ('bois', 0, 80, 5, null, 1), ('fer', 1, 220, 14, 'rare', 2), ('or', 2, 600, 32, 'epique', 4);
insert into public.rd_achievements values
  ('v5',30),('v15',80),('v25',200),('pip7',100),('coop10',80),('win1',60),('winbot',40),('boss5',120);

do $$ declare t text; begin
  foreach t in array array['rd_rarity','rd_types','rd_chests','rd_achievements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- ---------- Écureuil Dice : progression (écriture uniquement par les fonctions) ----------
create table public.rd_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gold int not null default 0 check (gold >= 0),
  keys int not null default 0 check (keys >= 0),
  chests int not null default 0,
  have jsonb not null default '{}'::jsonb,
  cards jsonb not null default '{}'::jsonb,
  cls jsonb not null default '{}'::jsonb,
  deck text[] not null default array['noisette','braise','givre','vent','pepite'],
  best_solo int not null default 0,
  best_coop int not null default 0,
  wins int not null default 0,
  games int not null default 0,
  ach jsonb not null default '{}'::jsonb,
  imported boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.rd_profiles enable row level security;
create policy rd_profiles_read_self on public.rd_profiles for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.rd_profiles from anon, authenticated;
grant select on public.rd_profiles to authenticated;

create table public.rd_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  wave int, kills int, gold int
);
create index rd_runs_user_started on public.rd_runs (user_id, started_at desc);
alter table public.rd_runs enable row level security;
revoke all on public.rd_runs from anon, authenticated;

insert into public.lb_games (id, name, higher_is_better, min_score, max_score)
values ('ecureuil-dice', 'Écureuil Dice', true, 0, 1000000) on conflict (id) do nothing;

-- =========================================================================
-- Fonctions
-- =========================================================================
create or replace function public.acct_me()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.profiles;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select * into r from public.profiles where id = uid;
  return jsonb_build_object('id', r.id, 'pseudo', r.pseudo, 'created_at', r.created_at);
end $$;

create or replace function public.acct_set_pseudo(p_pseudo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v text := btrim(coalesce(p_pseudo, ''));
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if v !~ '^[A-Za-z0-9À-ÖØ-öø-ÿ _.-]{2,20}$' then raise exception 'invalid_pseudo'; end if;
  insert into public.profiles (id, pseudo) values (uid, v) on conflict (id) do update set pseudo = excluded.pseudo;
  return public.acct_me();
end $$;

-- supprime le compte et TOUTES ses données (cascade sur les tables liées)
create or replace function public.acct_delete()
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  delete from auth.users where id = uid;
end $$;

create or replace function public.rd_json(p public.rd_profiles)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('gold', p.gold, 'keys', p.keys, 'chests', p.chests, 'have', p.have, 'cards', p.cards, 'cls', p.cls,
    'deck', to_jsonb(p.deck), 'best', jsonb_build_object('solo', p.best_solo, 'coop', p.best_coop), 'wins', p.wins, 'games', p.games,
    'ach', p.ach, 'imported', p.imported);
$$;

create or replace function public.rd_owned(p_have jsonb, p_type text)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.rd_types t where t.id = p_type and (t.rarity = 'commun' or p_have ? p_type));
$$;

create or replace function public.rd_row()
returns public.rd_profiles language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.rd_profiles;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  insert into public.rd_profiles (user_id) values (uid) on conflict (user_id) do nothing;
  select * into r from public.rd_profiles where user_id = uid for update;
  return r;
end $$;

create or replace function public.rd_load()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.acct_me();
  return public.rd_json(public.rd_row());
end $$;

-- reprise UNIQUE de la sauvegarde du navigateur, avec plafonds
create or replace function public.rd_import(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rd_profiles := public.rd_row(); k text; v jsonb; v_have jsonb := '{}'; v_cls jsonb := '{}'; v_cards jsonb := '{}';
begin
  if r.imported or r.games > 0 or r.chests > 0 then
    update public.rd_profiles x set imported = true where x.user_id = r.user_id;
    return public.rd_json(r);
  end if;
  for k, v in select * from jsonb_each(coalesce(p->'have', '{}')) loop
    if exists (select 1 from public.rd_types where id = k) then v_have := v_have || jsonb_build_object(k, true); end if;
  end loop;
  for k, v in select * from jsonb_each(coalesce(p->'cls', '{}')) loop
    if exists (select 1 from public.rd_types where id = k) and jsonb_typeof(v) = 'number' then
      v_cls := v_cls || jsonb_build_object(k, greatest(1, least(3, v::int)));
    end if;
  end loop;
  for k, v in select * from jsonb_each(coalesce(p->'cards', '{}')) loop
    if exists (select 1 from public.rd_types where id = k) and jsonb_typeof(v) = 'number' then
      v_cards := v_cards || jsonb_build_object(k, greatest(0, least(10, v::int)));
    end if;
  end loop;
  update public.rd_profiles x set
    gold = greatest(0, least(1500, coalesce((p->>'gold')::numeric, 0)::int)),
    have = v_have, cls = v_cls, cards = v_cards,
    best_solo = greatest(0, least(40, coalesce((p->'best'->>'solo')::numeric, 0)::int)),
    best_coop = greatest(0, least(40, coalesce((p->'best'->>'coop')::numeric, 0)::int)),
    imported = true, updated_at = now()
  where x.user_id = r.user_id returning * into r;
  return public.rd_json(r);
end $$;

create or replace function public.rd_set_deck(p_deck text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rd_profiles := public.rd_row(); d text[] := '{}'; t text;
begin
  foreach t in array coalesce(p_deck, '{}') loop
    if coalesce(array_length(d, 1), 0) >= 5 then exit; end if;
    if not (t = any(d)) and public.rd_owned(r.have, t) then d := d || t; end if;
  end loop;
  update public.rd_profiles x set deck = d, updated_at = now() where x.user_id = r.user_id returning * into r;
  return public.rd_json(r);
end $$;

create or replace function public.rd_open_chest(p_chest text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rd_profiles := public.rd_row(); c public.rd_chests; i int; rar text; tot numeric; x numeric; rr record; t text;
        got jsonb := '{}'; ord text[] := '{}'; minord int; v_have jsonb; v_cards jsonb; free boolean := false;
begin
  select * into c from public.rd_chests where id = p_chest;
  if not found then raise exception 'unknown_chest'; end if;
  if c.id = 'bois' and r.keys >= 3 then free := true;
  elsif r.gold < c.price then raise exception 'not_enough_gold'; end if;
  select y.ord into minord from public.rd_rarity y where y.id = c.min_rarity;
  select sum(case when y.id = 'commun' then y.weight else y.weight * c.luck end) into tot from public.rd_rarity y;
  v_have := r.have; v_cards := r.cards;
  for i in 1..c.cards loop
    x := random() * tot; rar := 'commun';
    for rr in select y.id, y.ord, case when y.id = 'commun' then y.weight else y.weight * c.luck end w from public.rd_rarity y order by y.ord loop
      x := x - rr.w; if x <= 0 then rar := rr.id; exit; end if;
    end loop;
    if i = 1 and minord is not null and (select y.ord from public.rd_rarity y where y.id = rar) < minord then rar := c.min_rarity; end if;
    select tt.id into t from public.rd_types tt where tt.rarity = rar order by random() limit 1;
    if not (got ? t) then
      got := got || jsonb_build_object(t, jsonb_build_object('n', 0, 'isNew', not public.rd_owned(v_have, t)));
      ord := ord || t;
    end if;
    got := jsonb_set(got, array[t, 'n'], to_jsonb((got->t->>'n')::int + 1));
    if not public.rd_owned(v_have, t) then v_have := v_have || jsonb_build_object(t, true);
    else v_cards := jsonb_set(v_cards, array[t], to_jsonb(coalesce((v_cards->>t)::int, 0) + 1)); end if;
  end loop;
  update public.rd_profiles p set
    gold = p.gold - (case when free then 0 else c.price end), keys = p.keys - (case when free then 3 else 0 end),
    chests = p.chests + 1, have = v_have, cards = v_cards, updated_at = now()
  where p.user_id = r.user_id returning * into r;
  return jsonb_build_object('got', got, 'order', to_jsonb(ord), 'profile', public.rd_json(r));
end $$;

create or replace function public.rd_level_up(p_type text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rd_profiles := public.rd_row(); lv int; need int; cost int; mult numeric;
        copies int[] := array[2, 4, 8, 14, 22, 34, 50, 70, 100];
        costs int[] := array[0, 30, 60, 100, 150, 220, 300, 400, 520, 660];
begin
  if not public.rd_owned(r.have, p_type) then raise exception 'not_owned'; end if;
  lv := coalesce((r.cls->>p_type)::int, 1);
  if lv >= 10 then raise exception 'max_level'; end if;
  select y.copies into mult from public.rd_types t join public.rd_rarity y on y.id = t.rarity where t.id = p_type;
  need := ceil(copies[lv] * mult);
  cost := costs[lv + 1];
  if coalesce((r.cards->>p_type)::int, 0) < need then raise exception 'not_enough_copies'; end if;
  if r.gold < cost then raise exception 'not_enough_gold'; end if;
  update public.rd_profiles p set gold = p.gold - cost,
    cards = jsonb_set(p.cards, array[p_type], to_jsonb((p.cards->>p_type)::int - need)),
    cls = jsonb_set(p.cls, array[p_type], to_jsonb(lv + 1)), updated_at = now()
  where p.user_id = r.user_id returning * into r;
  return public.rd_json(r);
end $$;

create or replace function public.rd_start_run(p_mode text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n int; rid uuid;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if p_mode not in ('solo', 'coop', 'versus', 'bot', 'local-coop', 'local-vs') then raise exception 'invalid_mode'; end if;
  select count(*) into n from public.rd_runs where user_id = uid and started_at > now() - interval '1 hour';
  if n >= 60 then raise exception 'rate_limited'; end if;
  insert into public.rd_runs (user_id, mode) values (uid, p_mode) returning id into rid;
  return rid;
end $$;

-- fin de partie : résultat borné par la durée réelle, gains et succès calculés ici
create or replace function public.rd_end_run(p_run uuid, p_wave int, p_kills int, p_bosses int, p_maxpip int, p_win boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rd_profiles := public.rd_row(); run public.rd_runs; secs numeric; v_wave int; v_kills int; v_bosses int; pip int;
        win boolean; v_gold int; loc boolean; vs boolean; newach text[] := '{}'; a record; ok boolean; achgold int := 0;
begin
  select * into run from public.rd_runs where id = p_run and user_id = r.user_id for update;
  if not found or run.ended_at is not null then raise exception 'unknown_run'; end if;
  secs := extract(epoch from now() - run.started_at);
  if secs > 4 * 3600 then raise exception 'run_expired'; end if;
  v_wave := greatest(0, least(coalesce(p_wave, 0), floor(secs / 7)::int + 2, 300));
  v_kills := greatest(0, least(coalesce(p_kills, 0), v_wave * 60));
  v_bosses := greatest(0, least(coalesce(p_bosses, 0), v_wave / 4 + 1));
  pip := greatest(1, least(coalesce(p_maxpip, 1), 7));
  loc := run.mode in ('local-coop', 'local-vs');
  vs := run.mode in ('versus', 'bot');
  win := coalesce(p_win, false) and vs and secs >= 30;
  v_gold := round(v_wave * 4 + v_kills / 12.0 + v_bosses * 10);
  if vs then v_gold := round(v_gold * 0.6 + case when win then (case when run.mode = 'bot' then 25 else 50 end) else 5 end); end if;
  if loc then v_gold := round(v_gold * 0.5); end if;
  v_gold := least(v_gold, 500);
  if not loc then
    for a in select x.id, x.gold g from public.rd_achievements x loop
      if r.ach ? a.id then continue; end if;
      ok := case a.id
        when 'v5' then run.mode = 'solo' and v_wave >= 6
        when 'v15' then run.mode = 'solo' and v_wave >= 15
        when 'v25' then run.mode = 'solo' and v_wave >= 25
        when 'pip7' then pip >= 7 and v_wave >= 4
        when 'coop10' then run.mode = 'coop' and v_wave >= 10
        when 'win1' then vs and win
        when 'winbot' then run.mode = 'bot' and win
        when 'boss5' then v_bosses >= 5
        else false end;
      if ok then newach := newach || a.id::text; achgold := achgold + a.g; end if;
    end loop;
  end if;
  update public.rd_runs x set ended_at = now(), wave = v_wave, kills = v_kills, gold = v_gold where x.id = run.id;
  update public.rd_profiles p set
    gold = p.gold + v_gold + achgold,
    keys = p.keys + case when loc then 0 else 1 end,
    games = p.games + 1,
    wins = p.wins + case when win then 1 else 0 end,
    best_solo = case when run.mode = 'solo' then greatest(p.best_solo, v_wave) else p.best_solo end,
    best_coop = case when run.mode = 'coop' then greatest(p.best_coop, v_wave) else p.best_coop end,
    ach = p.ach || coalesce((select jsonb_object_agg(z, true) from unnest(newach) z), '{}'::jsonb),
    updated_at = now()
  where p.user_id = r.user_id returning * into r;
  return jsonb_build_object('gold', v_gold, 'achGold', achgold, 'newAch', to_jsonb(newach), 'wave', v_wave, 'win', win, 'key', not loc, 'profile', public.rd_json(r));
end $$;

-- droits : seules les personnes connectées appellent ces fonctions
do $$ declare f text; begin
  foreach f in array array['acct_me()', 'acct_set_pseudo(text)', 'acct_delete()', 'rd_load()', 'rd_import(jsonb)', 'rd_set_deck(text[])',
    'rd_open_chest(text)', 'rd_level_up(text)', 'rd_start_run(text)', 'rd_end_run(uuid,integer,integer,integer,integer,boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['rd_json(public.rd_profiles)', 'rd_owned(jsonb,text)', 'rd_row()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- =========================================================================
-- Admins du site (modifiable uniquement depuis le tableau de bord / SQL)
-- Ajouter un admin : insert into public.site_admins (user_id)
--   select id from auth.users where email = 'adresse@gmail.com';
-- =========================================================================
create table public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.site_admins where user_id = auth.uid());
$$;

-- acct_me renvoie aussi « admin »
create or replace function public.acct_me()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.profiles;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select * into r from public.profiles where id = uid;
  return jsonb_build_object('id', r.id, 'pseudo', r.pseudo, 'created_at', r.created_at, 'admin', public.is_admin());
end $$;

-- outils admin pour Écureuil Dice (tests)
create or replace function public.rd_admin_gold(p_amount int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rd_profiles := public.rd_row();
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.rd_profiles p set gold = greatest(0, p.gold + greatest(-1000000, least(1000000, coalesce(p_amount, 0)))), updated_at = now()
  where p.user_id = r.user_id returning * into r;
  return public.rd_json(r);
end $$;

create or replace function public.rd_admin_unlock(p_copies int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rd_profiles := public.rd_row(); v_have jsonb := '{}'; v_cards jsonb; t text; n int := greatest(0, least(1000, coalesce(p_copies, 0)));
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  v_cards := r.cards;
  for t in select id from public.rd_types loop
    v_have := v_have || jsonb_build_object(t, true);
    v_cards := jsonb_set(v_cards, array[t], to_jsonb(coalesce((v_cards->>t)::int, 0) + n));
  end loop;
  update public.rd_profiles p set have = v_have, cards = v_cards, updated_at = now()
  where p.user_id = r.user_id returning * into r;
  return public.rd_json(r);
end $$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
do $$ declare f text; begin
  foreach f in array array['rd_admin_gold(integer)', 'rd_admin_unlock(integer)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- =========================================================================
-- Sauvegardes en ligne des autres jeux (js/cloudsave.js)
-- =========================================================================
create table public.game_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check (game_id in ('ecureuil-survivor', 'grand-chene', 'merger')),
  data jsonb not null,
  rev int not null default 1,
  saved_at timestamptz not null default now(),
  primary key (user_id, game_id)
);
alter table public.game_saves enable row level security;
create policy game_saves_read_self on public.game_saves for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.game_saves from anon, authenticated;
grant select on public.game_saves to authenticated;

create table public.game_save_rejects (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null, reason text not null, at timestamptz not null default now()
);
create index game_save_rejects_user on public.game_save_rejects (user_id, at desc);
alter table public.game_save_rejects enable row level security;
revoke all on public.game_save_rejects from anon, authenticated;

create or replace function public.gs_num(j jsonb, path text[])
returns numeric language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(j #> path) = 'number' then (j #>> path)::numeric
              when jsonb_typeof(j #> path) = 'string' and (j #>> path) ~ '^-?[0-9]+(\.[0-9]+)?$' then (j #>> path)::numeric
              else 0 end;
$$;

create or replace function public.gs_guard(p_game text, o jsonb, n jsonb, secs numeric)
returns text language plpgsql stable set search_path = '' as $$
declare dE numeric; k text; v numeric;
begin
  if p_game = 'ecureuil-survivor' then
    if public.gs_num(n, '{gold}') < 0 or public.gs_num(n, '{ppts}') < 0 then return 'negative'; end if;
    if o is null then
      if public.gs_num(n, '{gold}') > 50000 or public.gs_num(n, '{ppts}') > 10000 or public.gs_num(n, '{prestige}') > 10
         or public.gs_num(n, '{rank}') > 80 then return 'import_too_big'; end if;
      return null;
    end if;
    dE := public.gs_num(n, '{stats,goldEarned}') - public.gs_num(o, '{stats,goldEarned}');
    if dE < 0 then return 'gold_earned_decreased'; end if;
    if dE > 50 * secs + 5000 then return 'gold_too_fast'; end if;
    if public.gs_num(n, '{gold}') > public.gs_num(n, '{stats,goldEarned}') + 20000 then return 'gold_not_earned'; end if;
    if public.gs_num(n, '{rank}') - public.gs_num(o, '{rank}') > 3 + secs / 30 then return 'rank_too_fast'; end if;
    if public.gs_num(n, '{prestige}') < public.gs_num(o, '{prestige}') then return 'prestige_decreased'; end if;
    if public.gs_num(n, '{prestige}') - public.gs_num(o, '{prestige}') > 1 + floor(secs / 600) then return 'prestige_too_fast'; end if;
    if public.gs_num(n, '{ppts}') > public.gs_num(o, '{ppts}')
       and (public.gs_num(n, '{prestige}') = public.gs_num(o, '{prestige}')
            or public.gs_num(n, '{ppts}') - public.gs_num(o, '{ppts}') > 5000 * (public.gs_num(n, '{prestige}') - public.gs_num(o, '{prestige}'))) then
      return 'ppts_without_prestige';
    end if;
    return null;
  elsif p_game = 'grand-chene' then
    if public.gs_num(n, '{last}') > extract(epoch from now()) * 1000 + 120000 then return 'clock_in_future'; end if;
    if public.gs_num(n, '{acorns}') < 0 or public.gs_num(n, '{seeds}') < 0 or public.gs_num(n, '{essence}') < 0 then return 'negative'; end if;
    if public.gs_num(n, '{acorns}') > public.gs_num(n, '{lifeTotal}') * 1.0001 + 1 then return 'acorns_not_earned'; end if;
    if o is null then return null; end if;
    if public.gs_num(n, '{last}') - public.gs_num(o, '{last}') > (secs + 300) * 1000 then return 'clock_skip'; end if;
    foreach k in array array['lifeTotal', 'seedsLife', 'essenceTotal', 'petalsLife', 'foodLife', 'seasons', 'replants', 'cropsHarvested', 'flowersHarvested'] loop
      if public.gs_num(n, array[k]) < public.gs_num(o, array[k]) * 0.9999 - 1 then return 'lifetime_decreased:' || k; end if;
    end loop;
    if public.gs_num(n, '{seasons}') - public.gs_num(o, '{seasons}') > 1 + floor(secs / 60) then return 'seasons_too_fast'; end if;
    return null;
  elsif p_game = 'merger' then
    for k in select jsonb_object_keys(n) loop
      if k !~ '^merger-best-' then continue; end if;
      v := public.gs_num(n, array[k]);
      if v < 0 or v > 100000000 then return 'score_out_of_range'; end if;
    end loop;
    return null;
  end if;
  return 'unknown_game';
end $$;

create or replace function public.gs_load(p_game text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.game_saves;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  perform public.acct_me();
  select * into r from public.game_saves where user_id = uid and game_id = p_game;
  if not found then return null; end if;
  return jsonb_build_object('data', r.data, 'rev', r.rev, 'saved_at', r.saved_at);
end $$;

create or replace function public.gs_save(p_game text, p_data jsonb, p_rev int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.game_saves; secs numeric; reason text;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if p_game not in ('ecureuil-survivor', 'grand-chene', 'merger') then raise exception 'unknown_game'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 400000 then raise exception 'invalid_save'; end if;
  perform public.acct_me();
  select * into r from public.game_saves where user_id = uid and game_id = p_game for update;
  if found then
    if coalesce(p_rev, -1) <> r.rev then return jsonb_build_object('ok', false, 'reason', 'conflict', 'data', r.data, 'rev', r.rev); end if;
    secs := extract(epoch from now() - r.saved_at);
    if secs < 3 then return jsonb_build_object('ok', false, 'reason', 'too_fast', 'rev', r.rev); end if;
    reason := case when public.is_admin() then null else public.gs_guard(p_game, r.data, p_data, secs) end;
    if reason is not null then
      insert into public.game_save_rejects (user_id, game_id, reason) values (uid, p_game, reason);
      return jsonb_build_object('ok', false, 'reason', reason, 'data', r.data, 'rev', r.rev);
    end if;
    update public.game_saves set data = p_data, rev = r.rev + 1, saved_at = now() where user_id = uid and game_id = p_game returning * into r;
  else
    reason := case when public.is_admin() then null else public.gs_guard(p_game, null, p_data, 0) end;
    if reason is not null then
      insert into public.game_save_rejects (user_id, game_id, reason) values (uid, p_game, reason);
      return jsonb_build_object('ok', false, 'reason', reason, 'data', null, 'rev', 0);
    end if;
    insert into public.game_saves (user_id, game_id, data) values (uid, p_game, p_data) returning * into r;
  end if;
  return jsonb_build_object('ok', true, 'rev', r.rev);
end $$;

revoke all on function public.gs_num(jsonb, text[]) from public, anon, authenticated;
revoke all on function public.gs_guard(text, jsonb, jsonb, numeric) from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['gs_load(text)', 'gs_save(text,jsonb,integer)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- =========================================================================
-- Coffres par lot : 1 ou 10 (10 coffres = prix de 9), garantie de rareté par coffre
-- =========================================================================
create or replace function public.rd_open_chests(p_chest text, p_n int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.rd_profiles := public.rd_row(); c public.rd_chests; i int; j int; rar text; tot numeric; x numeric; rr record; t text;
        got jsonb := '{}'; ord text[] := '{}'; minord int; v_have jsonb; v_cards jsonb; free boolean := false; price int;
begin
  if p_n not in (1, 10) then raise exception 'invalid_count'; end if;
  select * into c from public.rd_chests where id = p_chest;
  if not found then raise exception 'unknown_chest'; end if;
  price := c.price * (case when p_n = 10 then 9 else 1 end);
  if p_n = 1 and c.id = 'bois' and r.keys >= 3 then free := true;
  elsif r.gold < price then raise exception 'not_enough_gold'; end if;
  select y.ord into minord from public.rd_rarity y where y.id = c.min_rarity;
  select sum(case when y.id = 'commun' then y.weight else y.weight * c.luck end) into tot from public.rd_rarity y;
  v_have := r.have; v_cards := r.cards;
  for j in 1..p_n loop
    for i in 1..c.cards loop
      x := random() * tot; rar := 'commun';
      for rr in select y.id, y.ord, case when y.id = 'commun' then y.weight else y.weight * c.luck end w from public.rd_rarity y order by y.ord loop
        x := x - rr.w; if x <= 0 then rar := rr.id; exit; end if;
      end loop;
      if i = 1 and minord is not null and (select y.ord from public.rd_rarity y where y.id = rar) < minord then rar := c.min_rarity; end if;
      select tt.id into t from public.rd_types tt where tt.rarity = rar order by random() limit 1;
      if not (got ? t) then
        got := got || jsonb_build_object(t, jsonb_build_object('n', 0, 'isNew', not public.rd_owned(v_have, t)));
        ord := ord || t;
      end if;
      got := jsonb_set(got, array[t, 'n'], to_jsonb((got->t->>'n')::int + 1));
      if not public.rd_owned(v_have, t) then v_have := v_have || jsonb_build_object(t, true);
      else v_cards := jsonb_set(v_cards, array[t], to_jsonb(coalesce((v_cards->>t)::int, 0) + 1)); end if;
    end loop;
  end loop;
  update public.rd_profiles p set
    gold = p.gold - (case when free then 0 else price end), keys = p.keys - (case when free then 3 else 0 end),
    chests = p.chests + p_n, have = v_have, cards = v_cards, updated_at = now()
  where p.user_id = r.user_id returning * into r;
  return jsonb_build_object('got', got, 'order', to_jsonb(ord), 'count', p_n, 'profile', public.rd_json(r));
end $$;

create or replace function public.rd_open_chest(p_chest text)
returns jsonb language sql security definer set search_path = '' as $$ select public.rd_open_chests(p_chest, 1); $$;

revoke all on function public.rd_open_chests(text, integer) from public, anon;
grant execute on function public.rd_open_chests(text, integer) to authenticated;

-- 0.10 : 21 nouveaux écureuils (non destructif)
insert into public.rd_types (id, rarity) values
('mitraille','commun'),('herisson','commun'),('glandlourd','commun'),('lancepierre','commun'),('resine','commun'),
('spore','rare'),('tornade','rare'),('banquier','rare'),('picvert','rare'),('stalactite','rare'),('tambour','rare'),
('damocles','epique'),('farceur','epique'),('sangsue','epique'),('jumeau','epique'),('boomerang','epique'),
('satellite','legendaire'),('phenix','legendaire'),('trounoir','legendaire'),('chronos','legendaire'),('midas','legendaire')
on conflict (id) do nothing;

-- 0.12 : dés d'équipe et Soleil (non destructif)
insert into public.rd_types (id, rarity) values
('facteur','rare'),('fanfare','rare'),('cadeau','epique'),('renfort','epique'),('soleil','legendaire')
on conflict (id) do nothing;
