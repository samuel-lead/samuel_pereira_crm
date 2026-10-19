-- Samuel (19/10/26): o CRM ficou lento. Causa: a regra nova de "cada vendedor
-- só vê os próprios leads" (migration 20261019140000) chamava uma função por
-- LINHA de lead em TODAS as empresas (~230 ms só pra contar 940 leads).
-- Aqui as perguntas "a empresa restringe?", "sou admin?" e "quem sou eu?"
-- viram subconsultas que o banco responde UMA vez por consulta, e nas
-- empresas sem a regra nenhuma função roda por linha. O resultado de quem
-- vê o quê é exatamente o mesmo de antes.
drop policy leads_select_org on public.leads;
create policy leads_select_org on public.leads for select
  using (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or (select private.eh_admin())
      or responsavel_id is null
      or responsavel_id = (select auth.uid())
      or private.eh_closer_da_reuniao_ativa(id)
    )
  );

drop policy interacoes_select_org on public.interacoes;
create policy interacoes_select_org on public.interacoes for select
  using (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = interacoes.lead_id)
    )
  );

drop policy reunioes_por_org on public.reunioes;
create policy reunioes_por_org on public.reunioes for all
  using (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = reunioes.lead_id)
    )
  )
  with check (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = reunioes.lead_id)
    )
  );

drop policy nivel_historico_por_org on public.nivel_historico;
create policy nivel_historico_por_org on public.nivel_historico for all
  using (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = nivel_historico.lead_id)
    )
  )
  with check (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = nivel_historico.lead_id)
    )
  );

drop policy isca_respostas_select_org on public.isca_respostas;
create policy isca_respostas_select_org on public.isca_respostas for select
  using (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = isca_respostas.lead_id)
    )
  );
