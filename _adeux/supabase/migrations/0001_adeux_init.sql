-- À DEUX — schéma initial (Supabase / PostgreSQL)
-- Projet Supabase DÉDIÉ à À DEUX. Ne jamais appliquer cette migration sur la base d'un autre projet.
-- Principe : les tables sont fermées par défaut (RLS + aucun droit direct). Les actions sensibles
-- (proposition, consentement, blocage, signalement, suppression) passent par des fonctions SECURITY DEFINER
-- qui appliquent les règles côté serveur. Le consentement de l'autre personne n'est jamais lisible.

-- ───────────────────────── Tables ─────────────────────────
create table public.invite_codes (
  code_hash text primary key,                     -- sha256 hex du code (jamais le code en clair)
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.invite_redemptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null references public.invite_codes(code_hash),
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 2 and 20),
  birthdate date not null,
  gender text not null check (gender in ('woman','man','nonbinary')),
  seeks text[] not null check (cardinality(seeks) between 1 and 3 and seeks <@ array['woman','man','nonbinary']),
  age_min int not null check (age_min between 18 and 99),
  age_max int not null check (age_max between 18 and 99),
  region text not null check (char_length(region) <= 60),
  scope text not null check (scope in ('region','country')),
  show_exact_age boolean not null default false,
  adult_declared boolean not null default false,  -- déclaration, PAS une vérification d'identité
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_max >= age_min)
);

create table public.answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) <= 32),
  value jsonb,
  must boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'proposed' check (status in ('proposed','active','paused','closed','revealed','blocked','declined')),
  accepted_a boolean not null default false,
  accepted_b boolean not null default false,
  done_intro boolean not null default false,
  done_activity boolean not null default false,
  done_voice boolean not null default false,
  created_at timestamptz not null default now(),
  check (user_a <> user_b)
);
create index on public.encounters (user_a);
create index on public.encounters (user_b);

-- Une réponse par personne ; lisible uniquement par son auteur.
create table public.consents (
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer boolean not null,
  created_at timestamptz not null default now(),
  primary key (encounter_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  sender uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','voice')),
  body text check (char_length(body) <= 1000),
  voice_path text,
  created_at timestamptz not null default now(),
  check ((kind = 'text' and body is not null) or (kind = 'voice' and voice_path is not null))
);
create index on public.messages (encounter_id, created_at);

create table public.game_moves (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null check (game in ('intro','mirror','compass','bridge','moment','call')),
  round_key text not null check (char_length(round_key) <= 40),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (encounter_id, user_id, game, round_key)
);

create table public.blocks (
  blocker uuid not null references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users(id) on delete cascade,
  reported uuid not null,
  encounter_id uuid,
  reason text not null check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
create table public.proposals (            -- une proposition de rencontre par jour et par personne
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  primary key (user_id, day)
);
create table public.rate_events (
  user_id uuid not null, action text not null, at timestamptz not null default now()
);
create index on public.rate_events (user_id, action, at);

-- ───────────────────────── Fonctions utilitaires ─────────────────────────
create or replace function public.age_of(d date) returns int language sql immutable as
$$ select extract(year from age(current_date, d))::int $$;

create or replace function public.is_participant(enc uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from encounters e where e.id = enc and auth.uid() in (e.user_a, e.user_b)) $$;

create or replace function public.can_interact(enc uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from encounters e where e.id = enc and auth.uid() in (e.user_a, e.user_b) and e.status in ('active','revealed')
   and not exists (select 1 from blocks b where (b.blocker = e.user_a and b.blocked = e.user_b) or (b.blocker = e.user_b and b.blocked = e.user_a))) $$;

-- Photos : accessibles UNIQUEMENT si la rencontre est « revealed » (deux consentements « oui ») et sans blocage.
create or replace function public.can_view_photos(owner uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select auth.uid() = owner or exists (
     select 1 from encounters e
     where e.status = 'revealed' and ((e.user_a = auth.uid() and e.user_b = owner) or (e.user_b = auth.uid() and e.user_a = owner))
       and (select count(*) from consents c where c.encounter_id = e.id and c.answer) = 2
       and not exists (select 1 from blocks b where (b.blocker = e.user_a and b.blocked = e.user_b) or (b.blocker = e.user_b and b.blocked = e.user_a))) $$;

create or replace function public.intro_done(enc uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from encounters e where e.id = enc and e.done_intro) $$;

create or replace function public.is_paused(enc uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from encounters e where e.id = enc and e.status = 'paused') $$;

create or replace function public.has_my_move(enc uuid, g text, rk text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from game_moves m where m.encounter_id = enc and m.game = g and m.round_key = rk and m.user_id = auth.uid()) $$;

create or replace function public.check_rate(act text, max_n int, window_s int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from rate_events where user_id = auth.uid() and action = act and at > now() - make_interval(secs => window_s)) >= max_n then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into rate_events(user_id, action) values (auth.uid(), act);
  delete from rate_events where at < now() - interval '1 day';
end $$;

-- Majorité garantie côté serveur, quoi que dise l'application.
create or replace function public.enforce_adult() returns trigger language plpgsql as $$
begin
  if new.birthdate > (current_date - interval '18 years')::date then raise exception 'adult_only' using errcode = 'P0001'; end if;
  if not new.adult_declared then raise exception 'adult_declaration_required' using errcode = 'P0001'; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_adult before insert or update on public.profiles for each row execute function public.enforce_adult();

create or replace function public.rate_messages() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.check_rate('message', 30, 60); return new; end $$;
create trigger messages_rate before insert on public.messages for each row execute function public.rate_messages();

-- Les étapes se débloquent à partir d'actions RÉCIPROQUES constatées côté serveur.
create or replace function public.advance_encounter(enc uuid) returns void
language plpgsql security definer set search_path = public as $$
declare e encounters; a_n int; ok_intro boolean; ok_act boolean; ok_voice boolean;
begin
  select * into e from encounters where id = enc for update;
  if not found or e.status not in ('active','revealed') then return; end if;
  ok_intro := (select count(distinct user_id) from game_moves where encounter_id = enc and game = 'intro') = 2;
  ok_act := exists (select 1 from game_moves where encounter_id = enc and game in ('mirror','compass','bridge','moment')
                    group by game, round_key having count(distinct user_id) = 2);
  ok_voice := (select count(distinct user_id) from game_moves where encounter_id = enc and game = 'call') = 2
           or (select count(distinct sender) from messages where encounter_id = enc and kind = 'voice') = 2;
  update encounters set done_intro = done_intro or ok_intro, done_activity = done_activity or ok_act, done_voice = done_voice or ok_voice where id = enc;
end $$;
create or replace function public.moves_advance() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.advance_encounter(new.encounter_id); return new; end $$;
create trigger moves_adv after insert on public.game_moves for each row execute function public.moves_advance();
create trigger msgs_adv after insert on public.messages for each row execute function public.moves_advance();

-- ───────────────────────── Actions (RPC) ─────────────────────────
create or replace function public.redeem_invite(code text) returns void
language plpgsql security definer set search_path = public as $$
declare h text := encode(sha256(convert_to(trim(code), 'UTF8')), 'hex'); c invite_codes;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  perform public.check_rate('invite', 5, 3600);
  select * into c from invite_codes where code_hash = h for update;
  if not found or c.uses >= c.max_uses or (c.expires_at is not null and c.expires_at < now()) then raise exception 'invalid_invite'; end if;
  insert into invite_redemptions(user_id, code_hash) values (auth.uid(), h);
  update invite_codes set uses = uses + 1 where code_hash = h;
end $$;

create or replace function public.has_invite() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from invite_redemptions where user_id = auth.uid()) $$;

create or replace function public.propose_match() returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p1 profiles; cand uuid; enc uuid;
begin
  if me is null then raise exception 'auth_required'; end if;
  perform pg_advisory_xact_lock(hashtext(me::text));
  select * into p1 from profiles where user_id = me and onboarded;
  if not found then raise exception 'profile_incomplete'; end if;
  if exists (select 1 from encounters e where me in (e.user_a, e.user_b) and e.status in ('proposed','active','paused','revealed')) then raise exception 'busy'; end if;
  begin insert into proposals(user_id) values (me); exception when unique_violation then raise exception 'daily_limit'; end;

  select p2.user_id into cand
  from profiles p2
  where p2.user_id <> me and p2.onboarded
    and public.age_of(p1.birthdate) >= 18 and public.age_of(p2.birthdate) >= 18
    and p1.seeks @> array[p2.gender] and p2.seeks @> array[p1.gender]
    and public.age_of(p2.birthdate) between p1.age_min and p1.age_max
    and public.age_of(p1.birthdate) between p2.age_min and p2.age_max
    and ((p1.scope = 'country' and p2.scope = 'country') or p1.region = p2.region)
    and not exists (select 1 from blocks b where (b.blocker = me and b.blocked = p2.user_id) or (b.blocker = p2.user_id and b.blocked = me))
    and not exists (select 1 from encounters e where (e.user_a = me and e.user_b = p2.user_id) or (e.user_b = me and e.user_a = p2.user_id))
    and not exists (select 1 from encounters e where p2.user_id in (e.user_a, e.user_b) and e.status in ('proposed','active','paused','revealed'))
    -- critères indispensables (intention, enfants)
    and not exists (
      select 1 from answers x join answers y on y.question_id = x.question_id and y.user_id = p2.user_id
      where x.user_id = me and (x.must or y.must) and (
        (x.question_id = 'intent' and ((x.value #>> '{}', y.value #>> '{}') in (('serious','discover'),('discover','serious')))) or
        (x.question_id = 'kids' and ((x.value #>> '{}', y.value #>> '{}') in (('yes','no'),('no','yes'))))))
  order by (select count(*) from answers x join answers y on y.question_id = x.question_id and y.user_id = p2.user_id and y.value = x.value where x.user_id = me) desc, random()
  limit 1;

  if cand is null then return null; end if;   -- aucun faux match : état « personne pour l'instant »
  insert into encounters(user_a, user_b) values (me, cand) returning id into enc;
  return enc;
end $$;

create or replace function public.respond_proposal(enc uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare e encounters;
begin
  select * into e from encounters where id = enc for update;
  if not found or auth.uid() not in (e.user_a, e.user_b) or e.status <> 'proposed' then raise exception 'forbidden'; end if;
  if not accept then update encounters set status = 'declined' where id = enc; return; end if;
  if auth.uid() = e.user_a then e.accepted_a := true; else e.accepted_b := true; end if;
  update encounters set accepted_a = e.accepted_a, accepted_b = e.accepted_b,
    status = case when e.accepted_a and e.accepted_b then 'active' else 'proposed' end where id = enc;
end $$;

-- Double consentement : atomique (verrou de ligne) donc sûr si les deux répondent en même temps.
create or replace function public.submit_consent(enc uuid, yes boolean) returns text
language plpgsql security definer set search_path = public as $$
declare e encounters; n int; yeses int;
begin
  select * into e from encounters where id = enc for update;
  if not found or auth.uid() not in (e.user_a, e.user_b) then raise exception 'forbidden'; end if;
  if e.status <> 'active' or not (e.done_intro and e.done_activity and e.done_voice) then raise exception 'not_ready'; end if;
  if exists (select 1 from blocks b where (b.blocker = e.user_a and b.blocked = e.user_b) or (b.blocker = e.user_b and b.blocked = e.user_a)) then raise exception 'forbidden'; end if;
  insert into consents(encounter_id, user_id, answer) values (enc, auth.uid(), yes) on conflict do nothing;
  select count(*), count(*) filter (where answer) into n, yeses from consents where encounter_id = enc;
  if n = 2 then
    update encounters set status = case when yeses = 2 then 'revealed' else 'closed' end where id = enc;
    return case when yeses = 2 then 'revealed' else 'kind_end' end;   -- le même message pour les deux personnes
  end if;
  return 'waiting';
end $$;

create or replace function public.leave_encounter(enc uuid, pause boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_participant(enc) then raise exception 'forbidden'; end if;
  if pause then update encounters set status = case when status = 'active' then 'paused' when status = 'paused' then 'active' else status end where id = enc;
  else update encounters set status = 'closed' where id = enc and status in ('proposed','active','paused'); end if;
end $$;

create or replace function public.block_user(enc uuid) returns void
language plpgsql security definer set search_path = public as $$
declare e encounters; other uuid;
begin
  select * into e from encounters where id = enc for update;
  if not found or auth.uid() not in (e.user_a, e.user_b) then raise exception 'forbidden'; end if;
  other := case when auth.uid() = e.user_a then e.user_b else e.user_a end;
  insert into blocks(blocker, blocked) values (auth.uid(), other) on conflict do nothing;
  update encounters set status = 'blocked' where id = enc;
end $$;

create or replace function public.report_user(enc uuid, reason text) returns void
language plpgsql security definer set search_path = public as $$
declare e encounters;
begin
  select * into e from encounters where id = enc;
  if not found or auth.uid() not in (e.user_a, e.user_b) then raise exception 'forbidden'; end if;
  perform public.check_rate('report', 10, 3600);
  insert into reports(reporter, reported, encounter_id, reason) values (auth.uid(), case when auth.uid() = e.user_a then e.user_b else e.user_a end, enc, left(reason, 200));
end $$;

-- Vue assainie de MA rencontre : jamais le consentement de l'autre, jamais l'identité avant révélation.
create or replace function public.get_my_encounter() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e encounters; me uuid := auth.uid(); other uuid; pr profiles; mine boolean; n int; stage int; revealed boolean;
begin
  select * into e from encounters where me in (user_a, user_b) and status in ('proposed','active','paused','revealed','closed','blocked','declined')
    order by created_at desc limit 1;
  if not found then return null; end if;
  other := case when me = e.user_a then e.user_b else e.user_a end;
  select * into pr from profiles where user_id = other;
  select answer into mine from consents where encounter_id = e.id and user_id = me;
  select count(*) into n from consents where encounter_id = e.id;
  stage := (e.done_intro)::int + (e.done_intro and e.done_activity)::int + (e.done_intro and e.done_activity and e.done_voice)::int;
  revealed := e.status = 'revealed';
  return jsonb_build_object(
    'id', e.id, 'status', e.status, 'stage', stage,
    'accepted_me', case when me = e.user_a then e.accepted_a else e.accepted_b end,
    'done', jsonb_build_object('intro', e.done_intro, 'activity', e.done_activity, 'voice', e.done_voice),
    'my_consent', mine,                                       -- uniquement MA réponse
    'outcome', case when e.status = 'revealed' then 'revealed' when n = 2 then 'kind_end' else 'waiting' end,
    'partner', jsonb_build_object(
       'pseudo', pr.pseudo,
       'age', case when pr.show_exact_age then public.age_of(pr.birthdate) end,
       'age_band', case when not pr.show_exact_age then public.age_of(pr.birthdate) / 5 * 5 end,
       'user_id', case when revealed then other end),         -- l'identifiant (donc le chemin des photos) n'est donné qu'après révélation
    'common', (select coalesce(jsonb_agg(jsonb_build_object('qid', x.question_id, 'same', x.value = y.value)), '[]'::jsonb)
               from answers x join answers y on y.question_id = x.question_id and y.user_id = other where x.user_id = me));
end $$;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  delete from storage.objects where bucket_id in ('photos','voice') and (storage.foldername(name))[1] = auth.uid()::text;
  delete from public.reports where reporter = auth.uid();
  delete from auth.users where id = auth.uid();   -- cascade : profil, réponses, messages, rencontres, blocages
end $$;

-- ───────────────────────── Droits et RLS ─────────────────────────
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;

alter table public.invite_codes enable row level security;        -- aucune politique : inaccessible aux clients
alter table public.invite_redemptions enable row level security;
alter table public.profiles enable row level security;
alter table public.answers enable row level security;
alter table public.encounters enable row level security;           -- aucune politique : tout passe par RPC
alter table public.consents enable row level security;
alter table public.messages enable row level security;
alter table public.game_moves enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;               -- aucune politique : écriture par RPC uniquement
alter table public.proposals enable row level security;
alter table public.rate_events enable row level security;

grant select, insert, update, delete on public.profiles, public.answers to authenticated;
grant select on public.messages, public.game_moves, public.blocks, public.consents to authenticated;
grant insert on public.messages, public.game_moves to authenticated;

create policy profiles_own_select on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_own_insert on public.profiles for insert to authenticated with check (user_id = auth.uid() and public.has_invite());
create policy profiles_own_update on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_own_delete on public.profiles for delete to authenticated using (user_id = auth.uid());
create policy answers_own on public.answers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy consents_own_select on public.consents for select to authenticated using (user_id = auth.uid());
create policy blocks_own_select on public.blocks for select to authenticated using (blocker = auth.uid());

create policy messages_read on public.messages for select to authenticated using (public.can_interact(encounter_id) or (public.is_participant(encounter_id) and public.is_paused(encounter_id)));
create policy messages_insert on public.messages for insert to authenticated with check (sender = auth.uid() and public.can_interact(encounter_id) and public.intro_done(encounter_id));
create policy moves_read on public.game_moves for select to authenticated using (
  public.can_interact(encounter_id) and (user_id = auth.uid() or game in ('bridge','intro','call') or public.has_my_move(encounter_id, game, round_key)));  -- secret du Miroir/Boussole jusqu'à ma propre réponse
create policy moves_insert on public.game_moves for insert to authenticated with check (user_id = auth.uid() and public.can_interact(encounter_id));

grant execute on function public.redeem_invite(text), public.has_invite(), public.propose_match(), public.respond_proposal(uuid, boolean),
  public.submit_consent(uuid, boolean), public.leave_encounter(uuid, boolean), public.block_user(uuid), public.report_user(uuid, text),
  public.get_my_encounter(), public.delete_my_account(), public.can_view_photos(uuid), public.can_interact(uuid), public.is_participant(uuid), public.has_my_move(uuid, text, text), public.intro_done(uuid), public.is_paused(uuid)
  to authenticated;

-- ───────────────────────── Stockage privé ─────────────────────────
insert into storage.buckets (id, name, public) values ('photos', 'photos', false), ('voice', 'voice', false) on conflict (id) do update set public = false;

create policy photos_write_own on storage.objects for insert to authenticated with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_update_own on storage.objects for update to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete_own on storage.objects for delete to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_read on storage.objects for select to authenticated using (
  bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.can_view_photos(((storage.foldername(name))[1])::uuid)));

create policy voice_write_own on storage.objects for insert to authenticated with check (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);
create policy voice_delete_own on storage.objects for delete to authenticated using (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);
create policy voice_read on storage.objects for select to authenticated using (
  bucket_id = 'voice' and ((storage.foldername(name))[1] = auth.uid()::text or exists (
    select 1 from public.messages m where m.voice_path = name and public.can_interact(m.encounter_id))));
