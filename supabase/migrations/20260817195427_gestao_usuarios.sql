-- Gestão de usuários do CRM: listar (com e-mail, que vive em auth.users,
-- não em public.usuarios) e excluir (revoga o acesso de vez, apaga o login
-- também). Duas funções SECURITY DEFINER — o cliente nunca usa service_role,
-- só chama essas funções como usuário autenticado normal.

create or replace function public.listar_usuarios_da_org()
returns table (id uuid, nome text, email text, criado_em timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.nome, au.email, u.created_at
  from public.usuarios u
  join auth.users au on au.id = u.id
  where u.org_id = private.current_org_id()
  order by u.created_at asc
$$;

revoke all on function public.listar_usuarios_da_org() from public, anon;
grant execute on function public.listar_usuarios_da_org() to authenticated;

create or replace function public.excluir_usuario(usuario_id_alvo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_do_chamador uuid;
  org_do_alvo uuid;
begin
  org_do_chamador := private.current_org_id();

  select org_id into org_do_alvo from public.usuarios where id = usuario_id_alvo;

  if org_do_alvo is null or org_do_alvo <> org_do_chamador then
    raise exception 'Usuário não encontrado nessa organização';
  end if;

  if usuario_id_alvo = auth.uid() then
    raise exception 'Você não pode excluir seu próprio usuário';
  end if;

  delete from public.usuarios where id = usuario_id_alvo;
  delete from auth.users where id = usuario_id_alvo;
end;
$$;

revoke all on function public.excluir_usuario(uuid) from public, anon;
grant execute on function public.excluir_usuario(uuid) to authenticated;
