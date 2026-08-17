-- Todo mundo com acesso ao Funil enxerga todos os leads da org (visão de
-- equipe). Mas só o responsável pelo lead — ou um admin — pode alterar,
-- arquivar ou registrar nota nele. Isso é reforçado aqui no banco (RLS),
-- não só na tela, seguindo a regra de segurança do projeto.

create or replace function private.eh_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select papel = 'admin' from public.usuarios where id = auth.uid()), false)
$$;

revoke all on function private.eh_admin() from public, anon;
grant execute on function private.eh_admin() to authenticated;

drop policy if exists "leads_por_org" on public.leads;

create policy "leads_select_org" on public.leads
  for select
  using (org_id = private.current_org_id());

create policy "leads_insert_org" on public.leads
  for insert
  with check (org_id = private.current_org_id());

create policy "leads_update_dono_ou_admin" on public.leads
  for update
  using (
    org_id = private.current_org_id()
    and (private.eh_admin() or responsavel_id = auth.uid())
  )
  with check (
    org_id = private.current_org_id()
    and (private.eh_admin() or responsavel_id = auth.uid())
  );

create policy "leads_delete_dono_ou_admin" on public.leads
  for delete
  using (
    org_id = private.current_org_id()
    and (private.eh_admin() or responsavel_id = auth.uid())
  );

drop policy if exists "interacoes_por_org" on public.interacoes;

create policy "interacoes_select_org" on public.interacoes
  for select
  using (org_id = private.current_org_id());

create policy "interacoes_insert_dono_ou_admin" on public.interacoes
  for insert
  with check (
    org_id = private.current_org_id()
    and (
      private.eh_admin()
      or exists (
        select 1 from public.leads l
        where l.id = lead_id and l.responsavel_id = auth.uid()
      )
    )
  );
