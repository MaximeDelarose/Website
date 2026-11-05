-- =========================================================================
-- Amis : demandes, liste. Tout passe par des fonctions (aucun accès direct à la table).
-- La présence en ligne se fait côté client, sur un canal Realtime par amitié (id non devinable).
-- =========================================================================
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references auth.users(id) on delete cascade,
  addressee uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_requester on public.friendships (requester);
create index if not exists friendships_addressee on public.friendships (addressee);
alter table public.friendships enable row level security;
revoke all on table public.friendships from anon, authenticated;

create or replace function public.friend_code(p uuid)
returns text language sql immutable set search_path = '' as $$ select upper(substr(replace(p::text, '-', ''), 1, 8)) $$;

-- ma liste : { code, list: [{ id, status, dir, pseudo, code }] }
create or replace function public.friends_list()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); out jsonb;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id, 'status', f.status, 'dir', case when f.requester = uid then 'out' else 'in' end,
      'pseudo', p.pseudo, 'code', public.friend_code(o.oid)) order by f.status, f.created_at), '[]'::jsonb)
    into out
  from public.friendships f
  cross join lateral (select case when f.requester = uid then f.addressee else f.requester end as oid) o
  left join public.profiles p on p.id = o.oid
  where f.requester = uid or f.addressee = uid;
  return jsonb_build_object('code', public.friend_code(uid), 'list', out);
end $$;

-- demande par code ami (8 caractères) ou par pseudo exact
create or replace function public.friend_request(p_who text)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v text := btrim(coalesce(p_who, '')); t uuid; n int; ex public.friendships;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if v = '' then raise exception 'not_found'; end if;
  if v ~ '^[0-9A-Fa-f]{8}$' then
    select count(*), min(id::text)::uuid into n, t from auth.users where public.friend_code(id) = upper(v);
    if n > 1 then raise exception 'ambiguous'; end if;
  else n := 0; end if;
  if n = 0 then
    select count(*), min(id::text)::uuid into n, t from public.profiles where lower(pseudo) = lower(v);
    if n > 1 then raise exception 'ambiguous'; end if;
  end if;
  if n = 0 or t is null then raise exception 'not_found'; end if;
  if t = uid then raise exception 'self'; end if;
  select * into ex from public.friendships where least(requester, addressee) = least(uid, t) and greatest(requester, addressee) = greatest(uid, t);
  if found then
    if ex.status = 'accepted' or ex.requester = uid then raise exception 'already'; end if;
    update public.friendships set status = 'accepted' where id = ex.id;
    return 'accepted';
  end if;
  if (select count(*) from public.friendships where requester = uid and status = 'pending') >= 20 then raise exception 'too_many'; end if;
  if (select count(*) from public.friendships where (requester = uid or addressee = uid) and status = 'accepted') >= 50 then raise exception 'too_many'; end if;
  insert into public.friendships (requester, addressee) values (uid, t);
  return 'sent';
end $$;

create or replace function public.friend_accept(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  update public.friendships set status = 'accepted' where id = p_id and addressee = uid and status = 'pending';
end $$;

-- refuser, annuler une demande ou retirer un ami
create or replace function public.friend_remove(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  delete from public.friendships where id = p_id and (requester = uid or addressee = uid);
end $$;

do $$ declare f text; begin
  foreach f in array array['friends_list()', 'friend_request(text)', 'friend_accept(uuid)', 'friend_remove(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
