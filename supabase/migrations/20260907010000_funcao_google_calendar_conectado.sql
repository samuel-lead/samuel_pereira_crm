-- google_calendar_conexoes não tem nenhuma policy (só service_role, via
-- Edge Function, acessa — guarda access_token/refresh_token). Mas o
-- painel precisa saber, pro usuário comum, se a EMPRESA dele já conectou
-- ou não, pra só mostrar "salvar no Google Agenda" pra quem realmente
-- pode usar. Essa função devolve só um true/false da PRÓPRIA org de quem
-- chama (nunca recebe org_id de fora, pra ninguém checar empresa alheia).
create or replace function public.google_calendar_esta_conectado()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from google_calendar_conexoes
    where org_id = (select org_id from usuarios where id = auth.uid())
  );
$$;

revoke all on function public.google_calendar_esta_conectado() from public;
grant execute on function public.google_calendar_esta_conectado() to authenticated;
