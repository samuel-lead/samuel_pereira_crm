-- Faltava a permissão de UPDATE em interacoes (só existia SELECT e INSERT).
-- É o que fazia o "Excluir" na linha do tempo rodar sem erro mas não mudar
-- nada — a exclusão é um soft delete (update em excluido_em), e sem essa
-- permissão o banco simplesmente ignorava a mudança, sem avisar.
-- Mesma regra de quem pode mexer: admin, o dono do lead, ou o closer com
-- reunião ativa nele — igual ao que já vale pra criar a interação.
create policy "interacoes_update_dono_ou_admin" on public.interacoes
  for update
  using (
    org_id = private.current_org_id()
    and (
      private.eh_admin()
      or exists (
        select 1 from public.leads l
        where l.id = interacoes.lead_id and l.responsavel_id = auth.uid()
      )
      or private.eh_closer_da_reuniao_ativa(lead_id)
    )
  )
  with check (
    org_id = private.current_org_id()
    and (
      private.eh_admin()
      or exists (
        select 1 from public.leads l
        where l.id = interacoes.lead_id and l.responsavel_id = auth.uid()
      )
      or private.eh_closer_da_reuniao_ativa(lead_id)
    )
  );
