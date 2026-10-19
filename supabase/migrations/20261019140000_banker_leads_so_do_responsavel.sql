-- Samuel pediu (19/10/26): no CRM da Banker - Consorcio cada vendedor só vê os
-- dados dos PRÓPRIOS leads (pra um vendedor não "roubar" lead do outro). Admin
-- continua vendo tudo, e lead SEM responsável (a fila de novos leads, que
-- qualquer um pode pegar) continua visível pra todos.
--
-- Vale por empresa, ligado por orgs.leads_so_do_responsavel — as outras
-- empresas não mudam em nada. A regra é aplicada no BANCO (RLS), não só na
-- tela, e cobre também o que pendura no lead: notas/ligações, reuniões,
-- histórico de nível e respostas da isca.
alter table public.orgs add column leads_so_do_responsavel boolean not null default false;

update public.orgs set leads_so_do_responsavel = true
where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';

-- A empresa de quem está logado restringe leads por responsável?
create or replace function private.org_restringe_leads()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select o.leads_so_do_responsavel
       from public.orgs o
       join public.usuarios u on u.org_id = o.id
      where u.id = auth.uid()),
    false)
$$;

-- Quem está logado pode ver esse lead? (empresa sem a regra: sempre sim)
create or replace function private.pode_ver_lead(p_lead_id uuid, p_responsavel_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select not private.org_restringe_leads()
      or private.eh_admin()
      or p_responsavel_id is null
      or p_responsavel_id = auth.uid()
      or private.eh_closer_da_reuniao_ativa(p_lead_id)
$$;

revoke all on function private.org_restringe_leads() from public, anon;
revoke all on function private.pode_ver_lead(uuid, uuid) from public, anon;
grant execute on function private.org_restringe_leads() to authenticated;
grant execute on function private.pode_ver_lead(uuid, uuid) to authenticated;

-- leads
drop policy leads_select_org on public.leads;
create policy leads_select_org on public.leads for select
  using (org_id = private.current_org_id() and private.pode_ver_lead(id, responsavel_id));

-- interacoes (notas, ligações...)
drop policy interacoes_select_org on public.interacoes;
create policy interacoes_select_org on public.interacoes for select
  using (
    org_id = private.current_org_id()
    and (not private.org_restringe_leads()
         or exists (select 1 from public.leads l where l.id = interacoes.lead_id))
  );

-- reunioes
drop policy reunioes_por_org on public.reunioes;
create policy reunioes_por_org on public.reunioes for all
  using (
    org_id = private.current_org_id()
    and (not private.org_restringe_leads()
         or exists (select 1 from public.leads l where l.id = reunioes.lead_id))
  )
  with check (
    org_id = private.current_org_id()
    and (not private.org_restringe_leads()
         or exists (select 1 from public.leads l where l.id = reunioes.lead_id))
  );

-- nivel_historico
drop policy nivel_historico_por_org on public.nivel_historico;
create policy nivel_historico_por_org on public.nivel_historico for all
  using (
    org_id = private.current_org_id()
    and (not private.org_restringe_leads()
         or exists (select 1 from public.leads l where l.id = nivel_historico.lead_id))
  )
  with check (
    org_id = private.current_org_id()
    and (not private.org_restringe_leads()
         or exists (select 1 from public.leads l where l.id = nivel_historico.lead_id))
  );

-- isca_respostas
drop policy isca_respostas_select_org on public.isca_respostas;
create policy isca_respostas_select_org on public.isca_respostas for select
  using (
    org_id = private.current_org_id()
    and (not private.org_restringe_leads()
         or exists (select 1 from public.leads l where l.id = isca_respostas.lead_id))
  );

-- A conferência de duplicados da importação continua avisando que o número já
-- existe, mas não entrega o NOME de um lead que o vendedor não pode ver.
create or replace function public.conferir_telefones_leads(p_telefones text[])
returns table(telefone text, nome text, excluido boolean)
language sql
stable
security definer
set search_path = public
as $$
  with eu as (select org_id from usuarios where id = auth.uid())
  select t.tel,
         case when private.pode_ver_lead(l.id, l.responsavel_id) then l.nome else 'outro vendedor' end,
         (l.arquivado_em is not null)
  from unnest(p_telefones) as t(tel)
  join leads l on l.org_id = (select org_id from eu)
    and l.telefone_e164 is not null
    and (
      l.telefone_e164 = t.tel
      or (
        t.tel like '55%' and l.telefone_e164 like '55%' and length(t.tel) >= 12
        and substring(l.telefone_e164 from 3 for 2) = substring(t.tel from 3 for 2)
        and right(l.telefone_e164, 8) = right(t.tel, 8)
      )
    );
$$;
