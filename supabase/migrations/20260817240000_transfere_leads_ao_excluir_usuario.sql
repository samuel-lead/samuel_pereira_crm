-- Excluir um usuário que tem leads/atividades vinculadas hoje falha (violação
-- de chave estrangeira). Agora exige escolher pra quem transferir antes.
-- Metas (config/mensais) são pessoais — não faz sentido transferir, então
-- somem junto com o usuário.

drop function if exists public.excluir_usuario(uuid);

create function public.excluir_usuario(usuario_id_alvo uuid, transferir_para uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_do_chamador uuid;
  org_do_alvo uuid;
  org_do_destino uuid;
  tem_vinculo boolean;
begin
  org_do_chamador := private.current_org_id();

  select org_id into org_do_alvo from public.usuarios where id = usuario_id_alvo;

  if org_do_alvo is null or org_do_alvo <> org_do_chamador then
    raise exception 'Usuário não encontrado nessa organização';
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
