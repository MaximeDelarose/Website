-- RADIA ♡ — compteurs de la fonction OPTIONNELLE « radia-chat » (NON appliqué : à exécuter seulement si la fonction est activée).
create table if not exists public.radia_chat_usage (day date not null, device text not null, n int not null default 0, primary key (day, device));
alter table public.radia_chat_usage enable row level security; -- aucune politique : accessible uniquement par la clé de service
create or replace function public.radia_chat_count(p_day date, p_device text) returns jsonb language plpgsql security definer set search_path = public as $$
declare g int; d int;
begin
  insert into public.radia_chat_usage (day, device, n) values (p_day, p_device, 1) on conflict (day, device) do update set n = radia_chat_usage.n + 1 returning n into d;
  select coalesce(sum(n), 0) into g from public.radia_chat_usage where day = p_day;
  return jsonb_build_object('global', g, 'device', d);
end $$;
revoke all on function public.radia_chat_count(date, text) from public, anon, authenticated;
