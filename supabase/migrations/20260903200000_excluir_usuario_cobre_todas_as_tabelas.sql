-- A correção anterior (nivel_historico) resolveu só uma das tabelas que
-- faltavam. Levantando TODAS as foreign keys que apontam pra usuarios.id,
-- achei mais: reunioes.closer_id, imoveis.usuario_id e iscas.usuario_id
-- são dado de negócio (igual leads) — precisam ser TRANSFERIDOS, não
-- apagados. bonus_sdr_config.usuario_id também é transferido: essa linha
-- é a régua de bônus DA EMPRESA (uma por org), usuario_id só guarda quem
-- configurou — apagar a linha apagaria a régua de todo mundo.
-- push_notificacoes_enviadas e push_subscriptions são só log técnico/token
-- de dispositivo, sem sentido sem a conta — esses são apagados junto com o
-- usuário, igual já acontecia com metas_config e metas_mensais nessa mesma
-- função.
create or replace function public.excluir_usuario(usuario_id_alvo uuid, transferir_para uuid default null::uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  org_do_chamador uuid;
  papel_do_chamador text;
  super_admin_do_chamador boolean;
  org_do_alvo uuid;
  super_admin_do_alvo boolean;
  dono_do_alvo boolean;
  org_do_destino uuid;
  tem_vinculo boolean;
begin
  org_do_chamador := private.current_org_id();

  select papel, super_admin into papel_do_chamador, super_admin_do_chamador
  from public.usuarios where id = auth.uid();

  if papel_do_chamador is distinct from 'admin' then
    raise exception 'Só administradores podem excluir usuários';
  end if;

  select org_id, super_admin, dono into org_do_alvo, super_admin_do_alvo, dono_do_alvo
  from public.usuarios where id = usuario_id_alvo;

  if org_do_alvo is null or org_do_alvo <> org_do_chamador then
    raise exception 'Usuário não encontrado nessa organização';
  end if;

  if super_admin_do_alvo and not super_admin_do_chamador then
    raise exception 'Você não pode excluir o dono da plataforma';
  end if;

  if dono_do_alvo and not super_admin_do_chamador then
    raise exception 'Você não pode excluir o dono da empresa';
  end if;

  if usuario_id_alvo = auth.uid() then
    raise exception 'Você não pode excluir seu próprio usuário';
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
    update public.reunioes set closer_id = transferir_para where closer_id = usuario_id_alvo;
    update public.comandos set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.nivel_historico set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.imoveis set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.iscas set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
    update public.bonus_sdr_config set usuario_id = transferir_para where usuario_id = usuario_id_alvo;
  end if;

  delete from public.push_notificacoes_enviadas where usuario_id = usuario_id_alvo;
  delete from public.push_subscriptions where usuario_id = usuario_id_alvo;
  delete from public.metas_config where usuario_id = usuario_id_alvo;
  delete from public.metas_mensais where usuario_id = usuario_id_alvo;
  delete from public.usuarios where id = usuario_id_alvo;
  delete from auth.users where id = usuario_id_alvo;
end;
$function$;
