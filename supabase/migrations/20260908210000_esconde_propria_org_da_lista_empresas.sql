-- Samuel pegou ao vivo: a própria empresa dele (não é cliente, é a dele)
-- aparecia na lista de "Empresas" com botão de Suspender — clicável por
-- engano. Essa página é só pra gerenciar CLIENTES, então a org de quem
-- está chamando (o próprio dono da plataforma) sai da lista.
create or replace function public.listar_organizacoes_super_admin()
returns table(
  id uuid,
  nome text,
  status text,
  publico text,
  criado_em timestamptz,
  admin_nome text,
  admin_email text
)
language sql
stable
security definer
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
    and o.id <> (select org_id from public.usuarios where id = auth.uid())
  order by o.created_at desc;
$$;
