-- Samuel (27/10/26): preencheu a isca com o telefone de um lead que já estava
-- no CRM (o "Jhon Guttyerre", pelo nome "Johnny") e NADA aconteceu pra ele:
-- o sistema só gravou uma anotação escondida no lead antigo, jogou o nome
-- digitado fora e não mandou aviso nenhum no WhatsApp.
-- Agora, quando o telefone já existe:
--  * a anotação do lead guarda o nome e o Instagram que a pessoa digitou;
--  * o responsável (ou, se não tiver, todo mundo da empresa) recebe o aviso
--    no WhatsApp e no push, igual acontece com lead novo.
alter table public.push_notificacoes_enviadas
  drop constraint push_notificacoes_enviadas_tipo_check;
alter table public.push_notificacoes_enviadas
  add constraint push_notificacoes_enviadas_tipo_check
  check (tipo = any (array['lead_novo','contato_vencido','lead_parado','lead_sem_responsavel','reuniao_em_breve','reuniao_atrasada','lead_preencheu_de_novo']));

create or replace function public.criar_lead_via_isca(
  p_slug text, p_nome text, p_telefone_e164 text, p_instagram text default null,
  p_tempo_mercado text default null, p_maior_desafio text default null,
  p_prioridade boolean default null, p_atuacao text default null,
  p_disponibilidade_financeira text default null
)
returns table(lead_id uuid, material_url text, whatsapp_contato_e164 text, whatsapp_mensagem text, ja_existia boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_isca record;
  v_lead_id uuid;
  v_ja_existia boolean := false;
  v_tempo_alto boolean;
  v_pode_investir boolean;
  v_nivel_qualificacao text;
  v_origem text;
  v_lead record;
  v_nivel_nome text;
  v_extra text;
  v_msg text;
  v_dest record;
  v_linhas int;
  v_recentes int;
begin
  select * into v_isca from iscas
  where slug = p_slug and ativo = true and arquivado_em is null;

  if v_isca is null then
    raise exception 'Isca não encontrada ou desativada';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'Nome é obrigatório';
  end if;

  if p_telefone_e164 is null or length(p_telefone_e164) < 12 then
    raise exception 'Telefone inválido';
  end if;

  v_origem := case when v_isca.formulario_simples then 'Formulário: ' else 'Isca: ' end || v_isca.nome;

  select id into v_lead_id from leads
  where org_id = v_isca.org_id and telefone_e164 = p_telefone_e164 and arquivado_em is null
  limit 1;

  v_tempo_alto := p_tempo_mercado in ('Mais de 1 ano', 'Mais de 2 anos');
  v_pode_investir := p_disponibilidade_financeira = 'Sim, posso investir';

  v_nivel_qualificacao := case
    when p_prioridade is not true or not v_pode_investir then 'desqualificado'
    when v_tempo_alto then 'super_qualificado'
    else 'qualificado'
  end;

  if v_lead_id is not null then
    v_ja_existia := true;

    if not v_isca.formulario_simples then
      insert into isca_respostas (org_id, lead_id, isca_id, tempo_mercado, maior_desafio, prioridade, atuacao, disponibilidade_financeira, nivel_qualificacao)
      values (v_isca.org_id, v_lead_id, v_isca.id, p_tempo_mercado, p_maior_desafio, p_prioridade, p_atuacao, p_disponibilidade_financeira, v_nivel_qualificacao);
    end if;

    insert into interacoes (org_id, usuario_id, lead_id, tipo, canal, conteudo, ocorreu_em, origem)
    values (
      v_isca.org_id,
      v_isca.usuario_id,
      v_lead_id,
      'nota',
      'manual',
      case when v_isca.formulario_simples
        then 'Preencheu de novo o formulário "' || v_isca.nome || '".'
        else 'Respondeu de novo pela isca "' || v_isca.nome || '".' end
        || ' Nome digitado: ' || trim(p_nome)
        || coalesce(' · Instagram: ' || nullif(trim(p_instagram), ''), ''),
      now(),
      'declarado'
    );

    -- Aviso: antes o lead antigo recebia a anotação em silêncio e ninguém
    -- ficava sabendo que a pessoa tinha voltado.
    select l.id, l.nome, l.responsavel_id, l.nivel_ordem, l.telefone_e164 into v_lead
    from leads l where l.id = v_lead_id;

    select n.nome into v_nivel_nome from niveis n
    where n.org_id = v_isca.org_id and n.ordem = v_lead.nivel_ordem;

    v_extra := '🔁 Já estava no CRM' || coalesce(' (' || v_nivel_nome || ')', '')
      || E'\n✍️ Digitou o nome: ' || trim(p_nome);

    v_msg := private.formatar_lembrete_lead(
      '🔁', 'Lead preencheu de novo', v_lead.nome, v_origem, now(),
      v_lead.telefone_e164, v_extra, case when v_isca.formulario_simples then null else v_nivel_qualificacao end
    );

    select count(distinct pe.lead_id) into v_recentes
    from push_notificacoes_enviadas pe
    where pe.org_id = v_isca.org_id and pe.tipo = 'lead_preencheu_de_novo'
      and pe.enviado_em > now() - interval '2 minutes';

    if v_recentes < 5 then
      for v_dest in
        select u.id from usuarios u
        where u.org_id = v_isca.org_id
          and (v_lead.responsavel_id is null or u.id = v_lead.responsavel_id)
      loop
        insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
        values (v_isca.org_id, v_dest.id, v_lead_id, 'lead_preencheu_de_novo',
                to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'))
        on conflict do nothing;

        get diagnostics v_linhas = row_count;

        if v_linhas > 0 then
          perform private.chamar_enviar_push(
            v_dest.id,
            'Lead preencheu de novo',
            v_lead.nome || ' (digitou "' || trim(p_nome) || '") preencheu ' || v_isca.nome || ' de novo.',
            '/leads/' || v_lead_id
          );
          perform private.chamar_enviar_whatsapp(v_dest.id, v_msg);
        end if;
      end loop;
    end if;
  else
    insert into leads (org_id, usuario_id, nome, telefone_e164, instagram, origem, nivel_ordem, isca_id)
    values (v_isca.org_id, v_isca.usuario_id, trim(p_nome), p_telefone_e164, nullif(trim(p_instagram), ''), v_origem, 0, v_isca.id)
    returning id into v_lead_id;

    insert into origens (org_id, nome)
    values (v_isca.org_id, v_origem)
    on conflict (org_id, nome) do nothing;

    if not v_isca.formulario_simples then
      insert into isca_respostas (org_id, lead_id, isca_id, tempo_mercado, maior_desafio, prioridade, atuacao, disponibilidade_financeira, nivel_qualificacao)
      values (v_isca.org_id, v_lead_id, v_isca.id, p_tempo_mercado, p_maior_desafio, p_prioridade, p_atuacao, p_disponibilidade_financeira, v_nivel_qualificacao);
    end if;
  end if;

  return query select v_lead_id, v_isca.material_url, v_isca.whatsapp_contato_e164, v_isca.whatsapp_mensagem, v_ja_existia;
end;
$function$;
