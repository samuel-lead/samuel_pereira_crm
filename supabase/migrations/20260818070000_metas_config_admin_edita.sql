-- As taxas e o piso de volume também são da empresa toda, não de um
-- usuário. Todo mundo vê, só admin edita — mesma régua da Meta de Receita.

drop policy if exists "metas_config_por_org" on public.metas_config;

create policy "metas_config_select_org" on public.metas_config
  for select
  using (org_id = private.current_org_id());

create policy "metas_config_update_admin" on public.metas_config
  for update
  using (org_id = private.current_org_id() and private.eh_admin())
  with check (org_id = private.current_org_id() and private.eh_admin());
