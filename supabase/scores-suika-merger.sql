-- Classements en ligne de Merger (solo) et Suika.
-- À exécuter une fois dans l'éditeur SQL de Supabase (sans effet si les lignes existent déjà).
insert into public.lb_games (id, name, higher_is_better, min_score, max_score)
values
  ('merger', 'Merger', true, 0, 10000000),
  ('suika',  'Suika',  true, 0, 10000000)
on conflict (id) do nothing;
