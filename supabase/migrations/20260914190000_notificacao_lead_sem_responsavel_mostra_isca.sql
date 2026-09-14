-- Samuel pediu: no destaque da mensagem de WhatsApp de "lead sem
-- responsável", em vez do texto fixo "Lead sem responsável", mostrar o
-- nome da isca (ou da origem) de onde o lead veio — mais rápido de
-- reconhecer na lista de conversas sem precisar abrir a mensagem.
create or replace function public.notificar_lead_sem_responsavel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario record;
  v_linhas int;
  v_qualificacao text;
  v_titulo text;
begin
  if new.responsavel_id is not null or new.nivel_ordem <> 0 then
    return new;
  end if;

  select nivel_qualificacao into v_qualificacao
  from isca_respostas
  where lead_id = new.id
  order by created_at desc
  limit 1;

  v_titulo := 'Novo lead: ' || coalesce(
    case when new.origem like 'Isca: %' then substring(new.origem from 7) else new.origem end,
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
$$;
