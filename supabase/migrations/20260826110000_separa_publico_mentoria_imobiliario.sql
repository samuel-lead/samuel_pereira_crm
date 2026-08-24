-- Primeiro passo pra separar os dois públicos que o CRM atende: mentoria/
-- consultoria (o que já existe hoje) e imobiliário (corretores, gestores
-- de imobiliária — features futuras exclusivas, tipo cartas contempladas).
-- Toda empresa já cadastrada vira "mentoria" por padrão, porque é o único
-- público atendido até agora.
alter table public.orgs
  add column publico text not null default 'mentoria'
  check (publico in ('mentoria', 'imobiliario'));

-- listar_organizacoes_super_admin precisa devolver o público de cada
-- empresa pra tela /empresas mostrar isso na listagem. Muda o formato de
-- retorno (nova coluna), então precisa dropar antes de recriar.
drop function if exists public.listar_organizacoes_super_admin();

create function public.listar_organizacoes_super_admin()
returns table (
  id uuid,
  nome text,
  status text,
  publico text,
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
    o.publico,
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
  order by o.created_at desc;
$$;

revoke all on function public.listar_organizacoes_super_admin() from public, anon;
grant execute on function public.listar_organizacoes_super_admin() to authenticated;
