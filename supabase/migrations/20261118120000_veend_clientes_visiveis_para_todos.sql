-- Samuel (18/11/26): na Veend (CRM do Danilo) cada SDR só vê os leads em que é
-- responsável (leads_so_do_responsavel, de 17/11). Efeito colateral: a Beth
-- deixou de ver os clientes e as vendas do mês, porque a maioria é de leads do
-- Danilo. Agora, nas empresas com a chave abaixo ligada, TODOS veem (só ver —
-- editar segue sendo de quem é responsável ou do admin) os leads já vendidos.
-- Fica numa chave por empresa pra não mudar a Banker, onde cada vendedor deve
-- ver só os seus.
alter table public.orgs
  add column if not exists clientes_visiveis_para_todos boolean not null default false;

update public.orgs
   set clientes_visiveis_para_todos = true
 where id = '1cc080fd-055d-4f8b-950c-7537cf4f0064';

create or replace function private.org_clientes_visiveis_para_todos()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select o.clientes_visiveis_para_todos
       from public.orgs o
       join public.usuarios u on u.org_id = o.id
      where u.id = auth.uid()),
    false)
$$;

revoke all on function private.org_clientes_visiveis_para_todos() from public, anon;
grant execute on function private.org_clientes_visiveis_para_todos() to authenticated;

drop policy if exists leads_select_org on public.leads;
create policy leads_select_org on public.leads
  for select
  using (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or (select private.eh_admin())
      or responsavel_id is null
      or responsavel_id = (select auth.uid())
      or private.eh_closer_da_reuniao_ativa(id)
      or (usuario_id = (select auth.uid()) and (select private.org_criador_continua_vendo_lead()))
      or (status = 'vendido' and (select private.org_clientes_visiveis_para_todos()))
    )
  );
