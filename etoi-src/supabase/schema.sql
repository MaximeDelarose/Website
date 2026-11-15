-- Schéma proposé (NON appliqué). Aucune donnée sur les enfants : seulement un nombre / tranches d'âge facultatifs.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null, birth_date date not null check (birth_date <= current_date - interval '18 years'),
  gender text, zone text not null, intention text, avail text[] default '{}', interests text[] default '{}', bio text,
  kids_count text, kids_age_ranges text[], created_at timestamptz default now()
);
create table slots (user_id uuid references profiles on delete cascade, slot text, primary key (user_id, slot));
create table interests (from_id uuid references profiles on delete cascade, to_id uuid references profiles on delete cascade, created_at timestamptz default now(), primary key (from_id, to_id));
create view connections as select a.from_id as a, a.to_id as b from interests a join interests b on a.from_id = b.to_id and a.to_id = b.from_id;
create table tonight (user_id uuid primary key references profiles on delete cascade, until timestamptz not null);
create table messages (id bigint generated always as identity primary key, sender uuid references profiles on delete cascade, receiver uuid references profiles on delete cascade, body text, kind text default 'text', created_at timestamptz default now());
create table blocks (blocker uuid references profiles on delete cascade, blocked uuid references profiles on delete cascade, primary key (blocker, blocked));
create table reports (id bigint generated always as identity primary key, reporter uuid, reported uuid, reason text, created_at timestamptz default now());
alter table profiles enable row level security; alter table slots enable row level security; alter table interests enable row level security;
alter table tonight enable row level security; alter table messages enable row level security; alter table blocks enable row level security; alter table reports enable row level security;
-- Politiques RLS à écrire : chacun lit/écrit ses lignes ; messages visibles par les deux parties d'une connexion réciproque non bloquée ; slots jamais lisibles par autrui (comparaison via fonction security definer).
