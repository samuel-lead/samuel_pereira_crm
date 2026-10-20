-- 20/10/26: importar 3.408 leads no CRM da Ketlyn mandou ~3.400 mensagens no
-- WhatsApp dela (e 306 no da Julia/Samuel em 16/10, nos cadastros em lote), porque
-- o gatilho notificar_lead_sem_responsavel avisa CADA lead novo sem responsável.
-- Trava: se já saíram avisos de 5 leads da empresa nos últimos 2 minutos, é
-- importação/lote e o aviso individual não é enviado.
-- (corpo da função: ver o apply_migration "trava_aviso_lead_sem_responsavel_em_massa";
-- só acrescenta o bloco v_recentes >= 5 antes do loop de envio.)
create or replace function public.notificar_lead_sem_responsavel()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_usuario record;
  v_linhas int;
  v_qualificacao text;
  v_titulo text;
  v_recentes int;
begin
  if new.responsavel_id is not null or new.nivel_ordem <> 0 then
    return new;
  end if;

  select count(distinct lead_id) into v_recentes
  from push_notificacoes_enviadas
  where org_id = new.org_id
    and tipo = 'lead_sem_responsavel'
    and enviado_em > now() - interval '2 minutes';

  if v_recentes >= 5 then
    return new;
  end if;

  select nivel_qualificacao into v_qualificacao
  from isca_respostas
  where lead_id = new.id
  order by created_at desc
  limit 1;

  v_titulo := 'Novo lead: ' || coalesce(
    case
      when new.origem like 'Isca: %' then 'Isca ' || substring(new.origem from 7)
      else new.origem
    end,
    'sem origem'
  );

  for v_usuario in
    select id from usuarios where org_id = new.org_id
  loop
    insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
    values (new.org_id, v_usuario.id, new.id, 'lead_sem_responsavel', '')
    on conflict do nothing;

    get diagnostics v_linhas = row_count;

    if v_linhas > 0 then
      perform private.chamar_enviar_push(
        v_usuario.id,
        'Novo lead sem responsável',
        new.nome || ' caiu em "Novos Leads" sem responsável. Origem: ' || coalesce(new.origem, 'não informada'),
        '/leads/' || new.id
      );
      perform private.chamar_enviar_whatsapp(
        v_usuario.id,
        private.formatar_lembrete_lead('🆕', v_titulo, new.nome, new.origem, new.declarado_em, new.telefone_e164, null, v_qualificacao)
      );
    end if;
  end loop;

  return new;
end;
$function$;
