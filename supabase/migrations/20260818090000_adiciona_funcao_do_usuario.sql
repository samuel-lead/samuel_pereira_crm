-- "Função" é o papel do usuário no processo comercial (SDR ou Closer) —
-- diferente de "papel" (admin/membro), que é nível de acesso ao sistema.
-- Por enquanto só rotula quem é quem; nada mais lê essa coluna ainda.

alter table public.usuarios
  add column funcao text check (funcao in ('sdr', 'closer'));

drop function if exists public.listar_usuarios_da_org();

create function public.listar_usuarios_da_org()
returns table (
  id uuid,
  nome text,
  email text,
  criado_em timestamptz,
  papel text,
  funcao text,
  paginas_permitidas text[],
  foto_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.nome, au.email, u.created_at, u.papel, u.funcao, u.paginas_permitidas, u.foto_url
  from public.usuarios u
  join auth.users au on au.id = u.id
  where u.org_id = private.current_org_id()
  order by u.created_at asc
$$;

revoke all on function public.listar_usuarios_da_org() from public, anon;
grant execute on function public.listar_usuarios_da_org() to authenticated;

-- muda a lista de parâmetros (adiciona nova_funcao) — precisa apagar a
-- assinatura antiga, senão ficam as duas funções coexistindo e chamadas
-- com 3 argumentos continuam caindo na versão velha, sem funcao.
drop function if exists public.atualizar_permissoes_usuario(uuid, text, text[]);

create function public.atualizar_permissoes_usuario(
  usuario_id_alvo uuid,
  novo_papel text,
  novas_paginas text[],
  nova_funcao text default null
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

  if nova_funcao is not null and nova_funcao not in ('sdr', 'closer') then
    raise exception 'Função inválida';
  end if;

  update public.usuarios
  set papel = novo_papel,
      paginas_permitidas = case
        when novo_papel = 'admin' then array['funil', 'lista', 'atividades', 'metricas']
        else coalesce(novas_paginas, array[]::text[])
      end,
      funcao = nova_funcao
  where id = usuario_id_alvo;
end;
$$;

revoke all on function public.atualizar_permissoes_usuario(uuid, text, text[], text) from public, anon;
grant execute on function public.atualizar_permissoes_usuario(uuid, text, text[], text) to authenticated;
