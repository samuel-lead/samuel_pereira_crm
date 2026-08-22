-- Desfaz a migration anterior (dono_da_empresa) — o Samuel decidiu manter
-- o modelo simples: só existe UM super_admin (dono da plataforma), e
-- dentro de cada empresa é só admin ou membro, sem uma camada extra de
-- "dono" por empresa. Volta excluir_usuario, atualizar_permissoes_usuario
-- e listar_usuarios_da_org pro formato de antes (só com proteção de
-- super_admin, sem dono).

create or replace function public.excluir_usuario(usuario_id_alvo uuid, transferir_para uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_do_chamador uuid;
  papel_do_chamador text;
  super_admin_do_chamador boolean;
  org_do_alvo uuid;
  super_admin_do_alvo boolean;
  org_do_destino uuid;
  tem_vinculo boolean;
begin
  org_do_chamador := private.current_org_id();

  select papel, super_admin into papel_do_chamador, super_admin_do_chamador
  from public.usuarios where id = auth.uid();

  if papel_do_chamador is distinct from 'admin' then
    raise exception 'Só administradores podem excluir usuários';
  end if;

  select org_id, super_admin into org_do_alvo, super_admin_do_alvo
  from public.usuarios where id = usuario_id_alvo;

  if org_do_alvo is null or org_do_alvo <> org_do_chamador then
    raise exception 'Usuário não encontrado nessa organização';
  end if;

  if super_admin_do_alvo and not super_admin_do_chamador then
    raise exception 'Você não pode excluir o dono da plataforma';
  end if;

  if usuario_id_alvo = auth.uid() then
    raise exception 'Você não pode excluir seu próprio usuário';
  end if;

  select exists(
    select 1 from public.leads where usuario_id = usuario_id_alvo or responsavel_id = usuario_id_alvo
    union all
    select 1 from public.interacoes where usuario_id = usuario_id_alvo
    union all
    select 1 from public.reunioes where usuario_id = usuario_id_alvo
    union all
    select 1 from public.comandos where usuario_id = usuario_id_alvo
  ) into tem_vinculo;

  if tem_vinculo then
    if transferir_para is null then
      raise exception 'Esse usuário tem leads ou atividades vinculadas a ele. Escolha alguém pra transferir antes de excluir.';
    end if;

    if transferir_para = usuario_id_alvo then
      raise exception 'Escolha um usuário diferente pra transferir';
    end if;

    select org_id into org_do_destino from public.usuarios where id = transferir_para;
    if org_do_destino is null or org_do_destino <> org_do_chamador then
      raise exception 'Usuário de destino não encontrado nessa organização';
    end if;

    update public.leads set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.leads set responsavel_id = transferir_para where responsavel_id = usuario_id_alvo;
    update public.interacoes set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.reunioes set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.comandos set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
  end if;

  delete from public.metas_config where usuario_id = usuario_id_alvo;
  delete from public.metas_mensais where usuario_id = usuario_id_alvo;
  delete from public.usuarios where id = usuario_id_alvo;
  delete from auth.users where id = usuario_id_alvo;
end;
$$;

revoke all on function public.excluir_usuario(uuid, uuid) from public, anon;
grant execute on function public.excluir_usuario(uuid, uuid) to authenticated;

create or replace function public.atualizar_permissoes_usuario(
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
  super_admin_do_chamador boolean;
  super_admin_do_alvo boolean;
begin
  org_do_chamador := private.current_org_id();

  select papel, super_admin into papel_do_chamador, super_admin_do_chamador
  from public.usuarios where id = auth.uid();
  if papel_do_chamador is distinct from 'admin' then
    raise exception 'Só administradores podem alterar permissões';
  end if;

  select org_id, super_admin into org_do_alvo, super_admin_do_alvo
  from public.usuarios where id = usuario_id_alvo;
  if org_do_alvo is null or org_do_alvo <> org_do_chamador then
    raise exception 'Usuário não encontrado nessa organização';
  end if;

  if super_admin_do_alvo and not super_admin_do_chamador and usuario_id_alvo <> auth.uid() then
    raise exception 'Você não pode alterar as permissões do dono da plataforma';
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
        when novo_papel = 'admin' then array['funil', 'lista', 'atividades', 'reunioes', 'metricas']
        else coalesce(novas_paginas, array[]::text[])
      end,
      funcao = nova_funcao
  where id = usuario_id_alvo;
end;
$$;

revoke all on function public.atualizar_permissoes_usuario(uuid, text, text[], text) from public, anon;
grant execute on function public.atualizar_permissoes_usuario(uuid, text, text[], text) to authenticated;

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

drop index if exists public.usuarios_um_dono_por_org_idx;
alter table public.usuarios drop column if exists dono;
