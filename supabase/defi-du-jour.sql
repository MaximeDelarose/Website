-- =========================================================================
-- Défi du jour : un score par personne et par jour, classement entre amis.
-- Tout passe par des fonctions ; aucun accès direct à la table.
-- À appliquer après supabase/amis.sql (le classement utilise les amitiés acceptées).
-- =========================================================================
create table if not exists public.daily_scores (
  day date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score >= 0),
  time_s integer not null default 0,
  kills integer not null default 0,
  char text,
  updated_at timestamptz not null default now(),
  primary key (day, user_id)
);
alter table public.daily_scores enable row level security;
revoke all on table public.daily_scores from anon, authenticated;

-- enregistre le meilleur score du jour (jour UTC, à un jour près pour les décalages horaires)
create or replace function public.daily_submit(p_day date, p_score integer, p_time integer, p_kills integer, p_char text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if p_day is null or p_day < current_date - 1 or p_day > current_date + 1 then raise exception 'bad_day'; end if;
  if p_score < 0 or p_score > 20000000 or p_time < 0 or p_time > 7200 or p_kills < 0 or p_kills > 200000 then raise exception 'bad_score'; end if;
  insert into public.daily_scores (day, user_id, score, time_s, kills, char)
  values (p_day, uid, p_score, p_time, p_kills, left(coalesce(p_char, ''), 20))
  on conflict (day, user_id) do update
    set score = excluded.score, time_s = excluded.time_s, kills = excluded.kills, char = excluded.char, updated_at = now()
    where excluded.score > public.daily_scores.score;
end $$;

-- classement du jour : moi et mes amis acceptés
create or replace function public.daily_board(p_day date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); out jsonb;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('pseudo', p.pseudo, 'score', s.score, 'time', s.time_s, 'kills', s.kills, 'char', s.char, 'me', s.user_id = uid) order by s.score desc), '[]'::jsonb)
    into out
  from public.daily_scores s
  left join public.profiles p on p.id = s.user_id
  where s.day = p_day
    and (s.user_id = uid or exists (
      select 1 from public.friendships f
      where f.status = 'accepted' and ((f.requester = uid and f.addressee = s.user_id) or (f.addressee = uid and f.requester = s.user_id))));
  return out;
end $$;

do $$ declare f text; begin
  foreach f in array array['daily_submit(date,integer,integer,integer,text)', 'daily_board(date)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
