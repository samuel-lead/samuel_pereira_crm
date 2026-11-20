-- Samuel (20/11/26): depois de importar uma lista grande com responsável, no dia
-- seguinte o sistema mandava UM WhatsApp "Lead parado" POR LEAD (73 mensagens
-- seguidas pro Glauber). Agora, se a mesma pessoa tiver mais de 5 leads parados
-- NOVOS na mesma rodada, ela recebe 1 resumo só. Até 5, continua um aviso por lead.
-- Nada deixa de ser registrado: a tabela de "já avisei" continua sendo preenchida
-- lead por lead, então o aviso não se repete.
create or replace function public.notificar_leads_parados()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lead record;
  v_resp record;
  v_linhas int;
begin
  create temp table if not exists tmp_leads_parados_novos (
    responsavel_id uuid,
    lead_id uuid,
    nome text,
    origem text,
    telefone_e164 text,
    declarado_em timestamptz
  ) on commit drop;
  truncate tmp_leads_parados_novos;

  for v_lead in
    select
      l.id,
      l.org_id,
      l.nome,
      l.responsavel_id,
      l.origem,
      l.telefone_e164,
      l.declarado_em,
      greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)) as parado_desde
    from leads l
    left join lateral (
      select max(i.ocorreu_em) as ultima_interacao
      from interacoes i
      where i.lead_id = l.id
    ) ult on true
    where l.responsavel_id is not null
      and l.status = 'ativo'
      and l.arquivado_em is null
      and l.nivel_ordem <> 9 and (l.funil is null or l.nivel_ordem in (1, 2))
      and not l.oportunidade_futura
      and greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)) < now() - interval '1 day'
      and (l.proximo_follow_em is null or l.proximo_follow_em > now())
      and not exists (
        select 1 from reunioes r
        where r.lead_id = l.id and r.status = 'marcada' and r.agendada_para > now()
      )
  loop
    insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
    values (v_lead.org_id, v_lead.responsavel_id, v_lead.id, 'lead_parado', v_lead.parado_desde::text)
    on conflict do nothing;

    get diagnostics v_linhas = row_count;

    if v_linhas > 0 then
      insert into tmp_leads_parados_novos
      values (v_lead.responsavel_id, v_lead.id, v_lead.nome, v_lead.origem, v_lead.telefone_e164, v_lead.declarado_em);
    end if;
  end loop;

  for v_resp in
    select responsavel_id, count(*) as qtd
    from tmp_leads_parados_novos
    group by responsavel_id
  loop
    if v_resp.qtd <= 5 then
      for v_lead in select * from tmp_leads_parados_novos where responsavel_id = v_resp.responsavel_id loop
        perform private.chamar_enviar_push(
          v_lead.responsavel_id,
          'Lead parado',
          v_lead.nome || ' tá sem interação há mais de 1 dia',
          '/leads/' || v_lead.lead_id
        );
        perform private.chamar_enviar_whatsapp(
          v_lead.responsavel_id,
          private.formatar_lembrete_lead('🔴', 'Lead parado', v_lead.nome, v_lead.origem, v_lead.declarado_em, v_lead.telefone_e164)
        );
      end loop;
    else
      perform private.chamar_enviar_push(
        v_resp.responsavel_id,
        'Leads parados',
        v_resp.qtd || ' leads estão sem interação há mais de 1 dia',
        '/leads'
      );
      perform private.chamar_enviar_whatsapp(
        v_resp.responsavel_id,
        '🔴 *LEADS PARADOS*' || E'\n\n' ||
        '👥 ' || v_resp.qtd || ' leads estão sem interação há mais de 1 dia' || E'\n\n' ||
        'Abra o CRM em *Pré-vendas* pra ver quem precisa de contato.'
      );
    end if;
  end loop;
end;
$function$;
