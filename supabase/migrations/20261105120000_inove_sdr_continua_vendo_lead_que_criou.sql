-- Inove Gôndolas (Samuel, 05/11/26): quando o SDR "envia pro Elton", o lead
-- muda de responsável, e como a empresa só deixa cada pessoa ver os leads em
-- que ela é responsável (leads_so_do_responsavel), o lead sumia pro SDR.
-- Agora o SDR continua VENDO (só ver — editar segue sendo do Elton) os leads
-- que ele mesmo criou. Fica numa chave por empresa pra não mudar o Banker,
-- onde cada vendedor deve ver só os seus.

alter table public.orgs
  add column if not exists criador_continua_vendo_lead boolean not null default false;

update public.orgs
   set criador_continua_vendo_lead = true
 where id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a';

create or replace function private.org_criador_continua_vendo_lead()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select o.criador_continua_vendo_lead
       from public.orgs o
       join public.usuarios u on u.org_id = o.id
      where u.id = auth.uid()),
    false)
$$;

revoke all on function private.org_criador_continua_vendo_lead() from public, anon;
grant execute on function private.org_criador_continua_vendo_lead() to authenticated;

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
    )
  );
