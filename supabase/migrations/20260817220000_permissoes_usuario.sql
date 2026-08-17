-- Papel do usuário (admin vê tudo sempre) e quais páginas operacionais
-- um "membro" pode acessar. Usuários e Configurações ficam sempre restritos
-- a admin — só as 4 páginas de trabalho do dia a dia são configuráveis.

alter table public.usuarios
  add column papel text not null default 'admin' check (papel in ('admin', 'membro'));

alter table public.usuarios
  add column paginas_permitidas text[] not null default array['funil', 'lista', 'atividades', 'metricas'];

-- listar_usuarios_da_org agora também devolve papel e páginas permitidas
drop function if exists public.listar_usuarios_da_org();

create function public.listar_usuarios_da_org()
returns table (
  id uuid,
  nome text,
  email text,
  criado_em timestamptz,
  papel text,
  paginas_permitidas text[]
)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.nome, au.email, u.created_at, u.papel, u.paginas_permitidas
  from public.usuarios u
  join auth.users au on au.id = u.id
  where u.org_id = private.current_org_id()
  order by u.created_at asc
$$;

revoke all on function public.listar_usuarios_da_org() from public, anon;
grant execute on function public.listar_usuarios_da_org() to authenticated;

-- só admin pode mudar o papel/páginas de outro usuário da mesma org
create or replace function public.atualizar_permissoes_usuario(
  usuario_id_alvo uuid,
  novo_papel text,
  novas_paginas text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_do_chamador uuid;
  org_do_alvo uuid;
  papel_do_chamador text;
begin
  org_do_chamador := private.current_org_id();

  select papel into papel_do_chamador from public.usuarios where id = auth.uid();
  if papel_do_chamador is distinct from 'admin' then
    raise exception 'Só administradores podem alterar permissões';
  end if;

  select org_id into org_do_alvo from public.usuarios where id = usuario_id_alvo;
  if org_do_alvo is null or org_do_alvo <> org_do_chamador then
    raise exception 'Usuário não encontrado nessa organização';
  end if;

  if novo_papel not in ('admin', 'membro') then
    raise exception 'Papel inválido';
  end if;

  update public.usuarios
  set papel = novo_papel,
      paginas_permitidas = case
        when novo_papel = 'admin' then array['funil', 'lista', 'atividades', 'metricas']
        else coalesce(novas_paginas, array[]::text[])
      end
  where id = usuario_id_alvo;
end;
$$;

revoke all on function public.atualizar_permissoes_usuario(uuid, text, text[]) from public, anon;
grant execute on function public.atualizar_permissoes_usuario(uuid, text, text[]) to authenticated;
