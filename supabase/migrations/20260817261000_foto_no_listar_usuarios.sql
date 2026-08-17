drop function if exists public.listar_usuarios_da_org();

create function public.listar_usuarios_da_org()
returns table (
  id uuid,
  nome text,
  email text,
  criado_em timestamptz,
  papel text,
  paginas_permitidas text[],
  foto_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.nome, au.email, u.created_at, u.papel, u.paginas_permitidas, u.foto_url
  from public.usuarios u
  join auth.users au on au.id = u.id
  where u.org_id = private.current_org_id()
  order by u.created_at asc
$$;

revoke all on function public.listar_usuarios_da_org() from public, anon;
grant execute on function public.listar_usuarios_da_org() to authenticated;
