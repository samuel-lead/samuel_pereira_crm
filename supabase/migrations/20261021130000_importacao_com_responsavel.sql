-- Samuel (21/10/26): a importação de leads passa a permitir escolher o
-- RESPONSÁVEL dos leads importados (todos os CRMs). Cuidado com o aviso: o
-- gatilho notificar_lead_atribuido manda push + WhatsApp pra pessoa a CADA
-- lead atribuído a ela — numa importação de centenas, seriam centenas de
-- mensagens (foi o que aconteceu com a Ketlyn em 20/10, no outro gatilho).
-- 1) Trava: se a pessoa já recebeu 5 avisos de "lead novo" nos últimos 2
--    minutos, é lote e os próximos não mandam aviso individual.
-- 2) Em troca, a importação manda UM aviso resumo no fim (função abaixo).
create or replace function public.notificar_lead_atribuido()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_linhas int;
  v_qualificacao text;
  v_recentes int;
begin
  if new.responsavel_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.responsavel_id is not distinct from new.responsavel_id then
    return new;
  end if;

  -- Autoatribuição (reivindicar lead, ou editar e escolher a si mesmo) —
  -- não notifica quem já sabe que acabou de fazer isso.
  if new.responsavel_id = auth.uid() then
    return new;
  end if;

  select count(*) into v_recentes
  from push_notificacoes_enviadas
  where usuario_id = new.responsavel_id
    and tipo = 'lead_novo'
    and enviado_em > now() - interval '2 minutes';

  if v_recentes >= 5 then
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
$function$;

-- Aviso ÚNICO no fim de uma importação com responsável escolhido.
create or replace function public.avisar_leads_importados(
  p_responsavel_id uuid,
  p_quantidade int,
  p_origem text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org_chamador uuid;
  v_org_resp uuid;
begin
  select org_id into v_org_chamador from usuarios where id = auth.uid();
  select org_id into v_org_resp from usuarios where id = p_responsavel_id;

  -- Só avisa alguém da própria empresa de quem importou, e nunca a si mesmo.
  if v_org_chamador is null or v_org_chamador is distinct from v_org_resp or p_responsavel_id = auth.uid() then
    return;
  end if;
  if p_quantidade is null or p_quantidade < 1 then
    return;
  end if;

  perform private.chamar_enviar_whatsapp(
    p_responsavel_id,
    '📥 *LEADS NOVOS PRA VOCÊ*' || E'\n\n' ||
    '🆕 ' || p_quantidade || case when p_quantidade = 1 then ' lead novo' else ' leads novos' end || ' atribuído' || case when p_quantidade = 1 then '' else 's' end || ' a você' || E'\n' ||
    '📍 Origem: ' || coalesce(nullif(btrim(p_origem), ''), 'não informada') || E'\n\n' ||
    'Abra o CRM em *Pré-vendas* pra ver.'
  );
end;
$function$;

revoke all on function public.avisar_leads_importados(uuid, int, text) from public, anon;
grant execute on function public.avisar_leads_importados(uuid, int, text) to authenticated;
