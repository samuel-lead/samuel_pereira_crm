-- Samuel (27/10/26): cadastro da isca "Aula" dava erro e o motivo sumia
-- (log da Vercel inacessível). Agora todo erro do cadastro fica gravado aqui.
create table public.isca_erros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text,
  origem text,
  mensagem text,
  user_agent text
);
alter table public.isca_erros enable row level security;

create or replace function public.registrar_erro_isca(
  p_slug text, p_origem text, p_mensagem text, p_user_agent text default null
) returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into isca_erros (slug, origem, mensagem, user_agent)
  values (left(p_slug, 200), left(p_origem, 50), left(p_mensagem, 1000), left(p_user_agent, 400));
$$;
grant execute on function public.registrar_erro_isca(text, text, text, text) to anon, authenticated;
