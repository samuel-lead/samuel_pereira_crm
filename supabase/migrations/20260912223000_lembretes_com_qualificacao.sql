-- Samuel pediu pra mostrar "Qualificado/Desqualificado" no lembrete
-- quando o lead tem essa informação (vem de isca/tráfego, tem resposta
-- em isca_respostas). Estende o template compartilhado com uma linha
-- opcional a mais.

-- Precisa derrubar a versão antiga explicitamente — "create or replace"
-- não troca uma função quando a lista de parâmetros muda, ele cria uma
-- SEGUNDA versão (sobrecarga), e as duas ficam ambíguas pra chamadas com
-- 6-7 argumentos.
drop function if exists private.formatar_lembrete_lead(text, text, text, text, timestamptz, text, text);

create or replace function private.formatar_lembrete_lead(
  p_emoji text,
  p_titulo text,
  p_nome text,
  p_origem text,
  p_entrou_em timestamptz,
  p_telefone text,
  p_extra text default null,
  p_qualificacao text default null
) returns text
language sql
immutable
as $$
  select
    p_emoji || ' *' || upper(p_titulo) || '*' || E'\n\n' ||
    '👤 ' || p_nome || E'\n' ||
    '📍 Origem: ' || coalesce(p_origem, 'não informada') ||
    coalesce(
      E'\n' || (
        case p_qualificacao
          when 'super_qualificado' then '⭐ Super qualificado'
          when 'qualificado' then '✅ Qualificado'
          when 'desqualificado' then '❌ Desqualificado'
          else null
        end
      ),
      ''
    ) || E'\n' ||
    '🕐 Entrou: ' || to_char(p_entrou_em at time zone 'America/Sao_Paulo', 'DD/MM às HH24:MI') ||
    coalesce(E'\n' || p_extra, '') || E'\n\n' ||
    '💬 Falar no WhatsApp: https://wa.me/' || regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g')
$$;

revoke all on function private.formatar_lembrete_lead(text, text, text, text, timestamptz, text, text, text) from public, anon, authenticated;

create or replace function public.notificar_lead_atribuido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas int;
  v_qualificacao text;
begin
  if new.responsavel_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.responsavel_id is not distinct from new.responsavel_id then
    return new;
  end if;

  insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
  values (new.org_id, new.responsavel_id, new.id, 'lead_novo', '')
  on conflict do nothing;

  get diagnostics v_linhas = row_count;

  if v_linhas > 0 then
    select nivel_qualificacao into v_qualificacao
    from isca_respostas
    where lead_id = new.id
    order by created_at desc
    limit 1;

    perform private.chamar_enviar_push(
      new.responsavel_id,
      'Lead novo',
      new.nome || ' acabou de ser atribuído a você. Origem: ' || coalesce(new.origem, 'não informada'),
      '/leads/' || new.id
    );
    perform private.chamar_enviar_whatsapp(
      new.responsavel_id,
      private.formatar_lembrete_lead('🆕', 'Lead novo', new.nome, new.origem, new.declarado_em, new.telefone_e164, null, v_qualificacao)
    );
  end if;

  return new;
end;
$$;

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
begin
  if new.responsavel_id is not null or new.nivel_ordem <> 0 then
    return new;
  end if;

  select nivel_qualificacao into v_qualificacao
  from isca_respostas
  where lead_id = new.id
  order by created_at desc
  limit 1;

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
        private.formatar_lembrete_lead('🆘', 'Lead sem responsável', new.nome, new.origem, new.declarado_em, new.telefone_e164, null, v_qualificacao)
      );
    end if;
  end loop;

  return new;
end;
$$;
