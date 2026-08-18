-- Meta de receita não é por usuário, é da empresa toda (uma só por
-- mês). Todo mundo vê, só admin define/edita.

alter table public.metas_mensais
  drop constraint metas_mensais_usuario_id_ano_mes_key;

alter table public.metas_mensais
  add constraint metas_mensais_org_id_ano_mes_key unique (org_id, ano, mes);

drop policy if exists "metas_mensais_por_org" on public.metas_mensais;

create policy "metas_mensais_select_org" on public.metas_mensais
  for select
  using (org_id = private.current_org_id());

create policy "metas_mensais_insert_admin" on public.metas_mensais
  for insert
  with check (org_id = private.current_org_id() and private.eh_admin());

create policy "metas_mensais_update_admin" on public.metas_mensais
  for update
  using (org_id = private.current_org_id() and private.eh_admin())
  with check (org_id = private.current_org_id() and private.eh_admin());
