-- =========================================================================
-- Cadeaux entre amis : des glands d'or envoyés à un ami (même hors ligne), récupérés à sa prochaine visite.
-- Un cadeau par jour et par ami (jour UTC). À appliquer après supabase/amis.sql.
-- =========================================================================
create table if not exists public.friend_gifts (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount between 10 and 500),
  created_at timestamptz not null default now(),
  claimed boolean not null default false
);
create index if not exists friend_gifts_to on public.friend_gifts (to_user) where not claimed;
alter table public.friend_gifts enable row level security;
revoke all on table public.friend_gifts from anon, authenticated;

create or replace function public.gift_send(p_fid uuid, p_amount integer)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); f public.friendships; target uuid;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if p_amount < 10 or p_amount > 500 then raise exception 'bad_amount'; end if;
  select * into f from public.friendships where id = p_fid and status = 'accepted' and (requester = uid or addressee = uid);
  if not found then raise exception 'not_found'; end if;
  target := case when f.requester = uid then f.addressee else f.requester end;
  if exists (select 1 from public.friend_gifts where from_user = uid and to_user = target and created_at::date = current_date) then raise exception 'already_today'; end if;
  insert into public.friend_gifts (from_user, to_user, amount) values (uid, target, p_amount);
end $$;

create or replace function public.gift_inbox()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); out jsonb;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'amount', g.amount, 'pseudo', p.pseudo) order by g.created_at), '[]'::jsonb) into out
  from public.friend_gifts g left join public.profiles p on p.id = g.from_user
  where g.to_user = uid and not g.claimed;
  return out;
end $$;

create or replace function public.gift_claim(p_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); amt integer;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  update public.friend_gifts set claimed = true where id = p_id and to_user = uid and not claimed returning amount into amt;
  return coalesce(amt, 0);
end $$;

do $$ declare f text; begin
  foreach f in array array['gift_send(uuid,integer)', 'gift_inbox()', 'gift_claim(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
