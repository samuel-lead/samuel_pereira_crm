-- Fase 1, Tarefa 1.1 (correção) — endurece funções auxiliares apontadas pelo advisor de segurança:
-- 1) current_org_id() não deve ficar exposta como endpoint público via PostgREST
-- 2) set_updated_at() precisa de search_path fixo

create schema if not exists private;

create or replace function private.current_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from public.usuarios where id = auth.uid()
$$;

revoke all on function public.current_org_id() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_org_id() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- troca todas as policies pra usar a função agora privada
alter policy "orgs_por_org" on public.orgs
  using (id = private.current_org_id())
  with check (id = private.current_org_id());

alter policy "usuarios_por_org" on public.usuarios
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

alter policy "metas_config_por_org" on public.metas_config
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

alter policy "metas_mensais_por_org" on public.metas_mensais
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

alter policy "niveis_por_org" on public.niveis
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

alter policy "leads_por_org" on public.leads
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

alter policy "nivel_historico_por_org" on public.nivel_historico
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

alter policy "interacoes_por_org" on public.interacoes
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

alter policy "reunioes_por_org" on public.reunioes
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

alter policy "mensagens_brutas_por_org" on public.mensagens_brutas
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

alter policy "comandos_por_org" on public.comandos
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

drop function public.current_org_id();
