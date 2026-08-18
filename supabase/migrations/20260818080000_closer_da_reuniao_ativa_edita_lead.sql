-- O Closer que vai fazer a reunião pode ser uma pessoa diferente do SDR
-- que é responsável pelo lead. Sem isso, um Closer que não é admin nem
-- responsável nem consegue ver o botão de "Fechar venda" no lead dele.
-- O lead continua sendo do SDR (não muda o responsavel_id) — só abre
-- exceção de edição pra quem é Closer da reunião marcada (ativa) dele.

create or replace function private.eh_closer_da_reuniao_ativa(p_lead_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.reunioes
    where lead_id = p_lead_id
      and closer_id = auth.uid()
      and status = 'marcada'
  )
$$;

revoke all on function private.eh_closer_da_reuniao_ativa(uuid) from public, anon;
grant execute on function private.eh_closer_da_reuniao_ativa(uuid) to authenticated;

alter policy "leads_update_dono_ou_admin" on public.leads
  using (
    org_id = private.current_org_id()
    and (
      private.eh_admin()
      or responsavel_id = auth.uid()
      or responsavel_id is null
      or private.eh_closer_da_reuniao_ativa(id)
    )
  )
  with check (
    org_id = private.current_org_id()
    and (
      private.eh_admin()
      or responsavel_id = auth.uid()
      or private.eh_closer_da_reuniao_ativa(id)
    )
  );

alter policy "interacoes_insert_dono_ou_admin" on public.interacoes
  with check (
    org_id = private.current_org_id()
    and (
      private.eh_admin()
      or exists (
        select 1 from public.leads l
        where l.id = lead_id and l.responsavel_id = auth.uid()
      )
      or private.eh_closer_da_reuniao_ativa(lead_id)
    )
  );
