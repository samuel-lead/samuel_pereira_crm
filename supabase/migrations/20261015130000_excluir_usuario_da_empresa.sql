-- Samuel (15/10/26): na tela "Gerenciar empresas" (dono da plataforma) dá pra
-- remover uma pessoa de QUALQUER empresa cliente — a função antiga
-- (excluir_usuario) só deixa remover gente da própria empresa de quem chama.
-- Mesma regra de segurança: só o dono da plataforma, nunca remove outro dono
-- da plataforma nem a si mesmo, e os leads/atividades da pessoa são
-- TRANSFERIDOS pra alguém da mesma empresa (nada de negócio é apagado).
create or replace function public.excluir_usuario_da_empresa(
  p_org_id uuid,
  usuario_id_alvo uuid,
  transferir_para uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  super_admin_do_chamador boolean;
  org_do_alvo uuid;
  super_admin_do_alvo boolean;
  org_do_destino uuid;
  tem_vinculo boolean;
begin
  select super_admin into super_admin_do_chamador from public.usuarios where id = auth.uid();
  if super_admin_do_chamador is distinct from true then
    raise exception 'Só o dono da plataforma pode remover pessoas de outras empresas';
  end if;

  select org_id, super_admin into org_do_alvo, super_admin_do_alvo
  from public.usuarios where id = usuario_id_alvo;

  if org_do_alvo is null or org_do_alvo <> p_org_id then
    raise exception 'Pessoa não encontrada nessa empresa';
  end if;
  if super_admin_do_alvo then
    raise exception 'Você não pode remover o dono da plataforma';
  end if;
  if usuario_id_alvo = auth.uid() then
    raise exception 'Você não pode remover o seu próprio usuário';
  end if;

  select exists(
    select 1 from public.leads where usuario_id = usuario_id_alvo or responsavel_id = usuario_id_alvo
    union all
    select 1 from public.interacoes where usuario_id = usuario_id_alvo
    union all
    select 1 from public.reunioes where usuario_id = usuario_id_alvo or closer_id = usuario_id_alvo
    union all
    select 1 from public.comandos where usuario_id = usuario_id_alvo
    union all
    select 1 from public.nivel_historico where usuario_id = usuario_id_alvo
    union all
    select 1 from public.imoveis where usuario_id = usuario_id_alvo
    union all
    select 1 from public.iscas where usuario_id = usuario_id_alvo
    union all
    select 1 from public.bonus_sdr_config where usuario_id = usuario_id_alvo
    union all
    select 1 from public.google_calendar_conexoes where conectado_por = usuario_id_alvo
  ) into tem_vinculo;

  if tem_vinculo then
    if transferir_para is null then
      raise exception 'Essa pessoa tem leads ou atividades vinculadas. Escolha alguém da empresa pra receber antes de remover.';
    end if;
    if transferir_para = usuario_id_alvo then
      raise exception 'Escolha uma pessoa diferente pra receber';
    end if;
    select org_id into org_do_destino from public.usuarios where id = transferir_para;
    if org_do_destino is null or org_do_destino <> p_org_id then
      raise exception 'A pessoa de destino precisa ser da mesma empresa';
    end if;

    update public.leads set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.leads set responsavel_id = transferir_para where responsavel_id = usuario_id_alvo;
    update public.interacoes set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.reunioes set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.reunioes set closer_id = transferir_para where closer_id = usuario_id_alvo;
    update public.comandos set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.nivel_historico set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.imoveis set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.iscas set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.bonus_sdr_config set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.google_calendar_conexoes set conectado_por = transferir_para where conectado_por = usuario_id_alvo;
  end if;

  delete from public.push_notificacoes_enviadas where usuario_id = usuario_id_alvo;
  delete from public.push_subscriptions where usuario_id = usuario_id_alvo;
  delete from public.metas_config where usuario_id = usuario_id_alvo;
  delete from public.metas_mensais where usuario_id = usuario_id_alvo;
  delete from public.rotina_diaria_status where usuario_id = usuario_id_alvo;
  delete from public.agente_pendencias where usuario_id = usuario_id_alvo;
  delete from public.usuarios where id = usuario_id_alvo;
  delete from auth.users where id = usuario_id_alvo;
end;
$function$;

revoke all on function public.excluir_usuario_da_empresa(uuid, uuid, uuid) from public, anon;
grant execute on function public.excluir_usuario_da_empresa(uuid, uuid, uuid) to authenticated;
