-- Base pra você (dono da plataforma) cadastrar e suspender empresas
-- clientes, cada uma isolada na própria "caixinha" (org_id + RLS que já
-- existe desde o início do projeto).

alter table public.usuarios
  add column super_admin boolean not null default false;

update public.usuarios
  set super_admin = true
  where id = '31f5b5d4-b3f0-4de3-82c1-2473800613bc';

create or replace function private.eh_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select super_admin from public.usuarios where id = auth.uid()), false)
$$;

revoke all on function private.eh_super_admin() from public, anon;
grant execute on function private.eh_super_admin() to authenticated;

alter table public.orgs
  add column status text not null default 'ativo' check (status in ('ativo', 'suspenso'));

-- Super admin pode ver/editar qualquer org, não só a própria.
alter policy "orgs_por_org" on public.orgs
  using (id = private.current_org_id() or private.eh_super_admin())
  with check (id = private.current_org_id() or private.eh_super_admin());

-- Lista as empresas clientes pro dono da plataforma — função própria (em
-- vez de abrir RLS de `usuarios` pra todo mundo) porque só precisa
-- expor nome do admin de cada empresa, nada além disso.
create or replace function public.listar_organizacoes_super_admin()
returns table (
  id uuid,
  nome text,
  status text,
  criado_em timestamptz,
  admin_nome text,
  admin_email text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    o.id,
    o.nome,
    o.status,
    o.created_at,
    u.nome as admin_nome,
    au.email as admin_email
  from public.orgs o
  left join lateral (
    select u2.id, u2.nome
    from public.usuarios u2
    where u2.org_id = o.id and u2.papel = 'admin'
    order by u2.created_at asc
    limit 1
  ) u on true
  left join auth.users au on au.id = u.id
  where private.eh_super_admin()
  order by o.created_at desc
$$;

revoke all on function public.listar_organizacoes_super_admin() from public, anon;
grant execute on function public.listar_organizacoes_super_admin() to authenticated;
