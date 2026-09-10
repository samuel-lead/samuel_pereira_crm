-- Samuel reportou o CRM travando pra ele e pros clientes ao mesmo tempo.
-- Não achei o erro exato (já tinha passado quando investiguei), mas achei
-- uma ineficiência real nessas policies: auth.uid()/funções de contexto
-- eram reavaliadas LINHA POR LINHA em vez de uma vez só por consulta —
-- pesa mais quanto mais leads a organização tem, especialmente carregando
-- o Kanban inteiro de uma vez. Envolver em "(select ...)" deixa o Postgres
-- calcular uma vez só (mesma correção sugerida pelo linter do Supabase).
-- Não muda nenhum comportamento, só performance.

alter policy leads_delete_dono_ou_admin on public.leads
  using (
    (org_id = (select private.current_org_id()))
    and ((select private.eh_admin()) or (responsavel_id = (select auth.uid())))
  );

alter policy leads_update_dono_ou_admin on public.leads
  using (
    (org_id = (select private.current_org_id()))
    and (
      (select private.eh_admin())
      or (responsavel_id = (select auth.uid()))
      or (responsavel_id is null)
      or private.eh_closer_da_reuniao_ativa(id)
    )
  )
  with check (
    (org_id = (select private.current_org_id()))
    and (
      (select private.eh_admin())
      or (responsavel_id = (select auth.uid()))
      or private.eh_closer_da_reuniao_ativa(id)
    )
  );

alter policy interacoes_insert_dono_ou_admin on public.interacoes
  with check (
    (org_id = (select private.current_org_id()))
    and (
      (select private.eh_admin())
      or exists (
        select 1 from public.leads l
        where l.id = interacoes.lead_id and l.responsavel_id = (select auth.uid())
      )
      or private.eh_closer_da_reuniao_ativa(lead_id)
    )
  );

alter policy interacoes_update_dono_ou_admin on public.interacoes
  using (
    (org_id = (select private.current_org_id()))
    and (
      (select private.eh_admin())
      or exists (
        select 1 from public.leads l
        where l.id = interacoes.lead_id and l.responsavel_id = (select auth.uid())
      )
      or private.eh_closer_da_reuniao_ativa(lead_id)
    )
  )
  with check (
    (org_id = (select private.current_org_id()))
    and (
      (select private.eh_admin())
      or exists (
        select 1 from public.leads l
        where l.id = interacoes.lead_id and l.responsavel_id = (select auth.uid())
      )
      or private.eh_closer_da_reuniao_ativa(lead_id)
    )
  );

alter policy push_subscriptions_select_own on public.push_subscriptions
  using (usuario_id = (select auth.uid()));

alter policy push_subscriptions_insert_own on public.push_subscriptions
  with check (
    (usuario_id = (select auth.uid()))
    and (org_id = (select private.current_org_id()))
  );

alter policy push_subscriptions_delete_own on public.push_subscriptions
  using (usuario_id = (select auth.uid()));
