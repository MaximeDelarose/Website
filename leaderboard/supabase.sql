-- =============================================================================
--  AkaBox Leaderboard — classements génériques pour tes jeux (Supabase)
--
--  À coller une fois dans Supabase → SQL Editor → « Run ».
--  Le script peut être relancé sans risque (il ne supprime aucun score).
--
--  Principe :
--   • lb_games  : un jeu = une ligne (id, sens du classement, bornes de score…)
--   • lb_scores : tous les scores envoyés
--   • Personne n'accède aux tables directement : tout passe par 2 fonctions
--       lb_top(jeu, limite)                → le classement (meilleur score par joueur)
--       lb_submit(jeu, joueur, score, meta) → enregistre un score, renvoie son rang
--     Elles vérifient le jeu, le pseudo, les bornes du score, et limitent le
--     nombre d'envois par adresse IP (stockée uniquement sous forme de hash).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables ----
create table if not exists public.lb_games (
  id               text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name             text not null,
  higher_is_better boolean not null default true,   -- false = un temps (plus petit = mieux)
  min_score        numeric not null default 0,
  max_score        numeric not null default 1000000000,
  max_per_hour     int     not null default 30,     -- envois max par IP et par heure
  enabled          boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.lb_scores (
  id         bigint generated always as identity primary key,
  game_id    text not null references public.lb_games(id) on delete cascade,
  player     text not null check (char_length(player) between 2 and 20),
  score      numeric not null,
  meta       jsonb not null default '{}'::jsonb,    -- infos libres : niveau, version…
  ip_hash    text,
  created_at timestamptz not null default now()
);

create index if not exists lb_scores_game_score on public.lb_scores (game_id, score desc);
create index if not exists lb_scores_ip_recent  on public.lb_scores (game_id, ip_hash, created_at desc);

-- --------------------------------------------------------------- sécurité ---
alter table public.lb_games  enable row level security;
alter table public.lb_scores enable row level security;

-- La liste des jeux est lisible par tous ; les scores ne sont lisibles
-- qu'à travers lb_top (qui ne renvoie jamais l'ip_hash).
drop policy if exists "lb_games lecture publique" on public.lb_games;
create policy "lb_games lecture publique" on public.lb_games for select using (true);

revoke all on public.lb_scores from anon, authenticated;
revoke insert, update, delete on public.lb_games from anon, authenticated;
grant select on public.lb_games to anon, authenticated;

-- ------------------------------------------------------------ classement ----
create or replace function public.lb_top(p_game text, p_limit int default 10)
returns table (rank bigint, player text, score numeric, meta jsonb, created_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  with g as (
    select * from lb_games where id = p_game and enabled
  ),
  best as (  -- meilleur score de chaque joueur (pseudo insensible à la casse)
    select distinct on (lower(s.player)) s.player, s.score, s.meta, s.created_at
    from lb_scores s join g on s.game_id = g.id
    order by lower(s.player),
      case when g.higher_is_better     then s.score end desc nulls last,
      case when not g.higher_is_better then s.score end asc  nulls last,
      s.created_at asc
  )
  select
    rank() over (order by
      case when g.higher_is_better     then b.score end desc nulls last,
      case when not g.higher_is_better then b.score end asc  nulls last) as rank,
    b.player, b.score, b.meta, b.created_at
  from best b cross join g
  order by 1, b.created_at
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;

-- ---------------------------------------------------------- envoi score -----
create or replace function public.lb_submit(
  p_game text, p_player text, p_score numeric, p_meta jsonb default '{}'::jsonb
)
returns json
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  g        lb_games%rowtype;
  v_player text;
  v_ip     text;
  v_hash   text;
  v_recent int;
  v_rank   bigint;
begin
  select * into g from lb_games where id = p_game and enabled;
  if not found then
    raise exception 'unknown_game';
  end if;

  -- pseudo : lettres, chiffres, espace, _ - . ; 2 à 20 caractères
  v_player := regexp_replace(coalesce(p_player, ''), '[^[:alnum:] _.-]', '', 'g');
  v_player := btrim(regexp_replace(v_player, '\s+', ' ', 'g'));
  if char_length(v_player) < 2 or char_length(v_player) > 20 then
    raise exception 'invalid_player';
  end if;

  if p_score is null or p_score < g.min_score or p_score > g.max_score then
    raise exception 'invalid_score';
  end if;

  if p_meta is null or jsonb_typeof(p_meta) <> 'object' or pg_column_size(p_meta) > 2000 then
    p_meta := '{}'::jsonb;
  end if;

  -- limite d'envois par IP (l'IP n'est jamais stockée en clair)
  v_ip   := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  v_hash := encode(digest(btrim(v_ip) || '|' || g.id, 'sha256'), 'hex');
  select count(*) into v_recent
    from lb_scores
   where game_id = g.id and ip_hash = v_hash and created_at > now() - interval '1 hour';
  if v_recent >= g.max_per_hour then
    raise exception 'rate_limited';
  end if;

  insert into lb_scores (game_id, player, score, meta, ip_hash)
  values (g.id, v_player, p_score, p_meta, v_hash);

  -- rang de ce score parmi les meilleurs scores de chaque joueur
  select count(*) + 1 into v_rank
  from (
    select distinct on (lower(s.player)) s.score
    from lb_scores s
    where s.game_id = g.id and lower(s.player) <> lower(v_player)
    order by lower(s.player),
      case when g.higher_is_better     then s.score end desc nulls last,
      case when not g.higher_is_better then s.score end asc  nulls last
  ) b
  where (g.higher_is_better and b.score > p_score)
     or (not g.higher_is_better and b.score < p_score);

  return json_build_object('ok', true, 'player', v_player, 'score', p_score, 'rank', v_rank);
end;
$$;

revoke all on function public.lb_top(text, int) from public;
revoke all on function public.lb_submit(text, text, numeric, jsonb) from public;
grant execute on function public.lb_top(text, int) to anon, authenticated;
grant execute on function public.lb_submit(text, text, numeric, jsonb) to anon, authenticated;

-- ----------------------------------------------------------------- jeux -----
-- Ajoute une ligne par jeu. Exemples :
insert into public.lb_games (id, name, higher_is_better, min_score, max_score)
values
  ('demo',   'Démo (tests)', true, 0, 1000000),
  ('chaaat', 'Chaaat',       true, 0, 10000000),
  ('ecureuil-survivor', 'Écureuil Survivor', true, 0, 2000000),
  ('ecureuil-arene', 'Écureuil Survivor : Arène', true, 0, 200000),
  ('ecureuil-donjon', 'Écureuil Survivor : Donjon', true, 0, 500000)
on conflict (id) do nothing;

-- Pour un jeu chronométré (plus petit temps = mieux), par exemple :
-- insert into public.lb_games (id, name, higher_is_better, min_score, max_score)
-- values ('cubelite', 'Cubelite', false, 1, 36000) on conflict (id) do nothing;

-- Pour vider les scores de test :
-- delete from public.lb_scores where game_id = 'demo';
