-- Samuel pediu pra conseguir clicar numa empresa em /empresas e ver os
-- dados de quem trabalha lá (nome, e-mail, papel/função) — hoje só dava
-- pra ver o admin, resumido, na lista. Mesmo desenho de
-- listar_organizacoes_super_admin: só o dono da plataforma pode chamar,
-- e-mail vem de auth.users via join.
create or replace function public.listar_usuarios_org_super_admin(p_org_id uuid)
returns table(
  id uuid,
  nome text,
  email text,
  papel text,
  funcao text,
  criado_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.nome,
    au.email,
    u.papel,
    u.funcao,
    u.created_at
  from public.usuarios u
  join auth.users au on au.id = u.id
  where private.eh_super_admin()
    and u.org_id = p_org_id
  order by u.papel desc, u.created_at asc;
$$;

revoke all on function public.listar_usuarios_org_super_admin(uuid) from public;
grant execute on function public.listar_usuarios_org_super_admin(uuid) to authenticated;

-- Detalhe de uma empresa específica (a mesma coisa que
-- listar_organizacoes_super_admin devolve, só que filtrado numa só) — usada
-- pelo cabeçalho da página de detalhe.
create or replace function public.detalhe_org_super_admin(p_org_id uuid)
returns table(
  id uuid,
  nome text,
  status text,
  publico text,
  criado_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.nome, o.status, o.publico, o.created_at
  from public.orgs o
  where private.eh_super_admin()
    and o.id = p_org_id;
$$;

revoke all on function public.detalhe_org_super_admin(uuid) from public;
grant execute on function public.detalhe_org_super_admin(uuid) to authenticated;
