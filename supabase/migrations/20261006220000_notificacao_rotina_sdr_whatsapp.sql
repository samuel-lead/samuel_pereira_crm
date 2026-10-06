-- Samuel pediu: todo dia útil, na hora de cada atividade da "Minha rotina",
-- chega no WhatsApp do SDR uma mensagem avisando que o horário começou e
-- até que horas vai. Só empresas do público mentoria/serviço (o imobiliário
-- não tem essa rotina), só SDRs com WhatsApp cadastrado, só segunda a sexta.
-- Os horários e textos batem com painel/lib/rotina/atividades.ts — se um
-- mudar, mudar o outro (aqui também os horários dos cron.schedule, em UTC:
-- Brasília = UTC-3, sem horário de verão).
--
-- Padrão de mensagem igual ao resto do sistema: emoji + *negrito* + cada
-- informação numa linha.
create or replace function private.mensagem_rotina(p_atividade text, p_primeiro_nome text)
returns text
language plpgsql
immutable
as $$
declare
  v_emoji text;
  v_titulo text;
  v_inicio text;
  v_fim text;
  v_descricao text;
begin
  case p_atividade
    when 'confirmar_reunioes' then
      v_emoji := '📅'; v_inicio := '09:00'; v_fim := '09:30';
      v_titulo := 'Confirmar e reagendar reuniões';
      v_descricao := 'Reuniões do dia, reagendar as do dia anterior (anti-no-show) e fazer follow com os leads do nível 3.';
    when 'retomar_conversas_follow_bloco1' then
      v_emoji := '💬'; v_inicio := '09:30'; v_fim := '10:30';
      v_titulo := 'Retomar conversas e 1º bloco de Follow Up (níveis 1 e 2)';
      v_descricao := 'Leads que responderam ontem, parados ou atrasados no CRM, seguindo a matriz de follow-up.';
    when 'prospeccao' then
      v_emoji := '📲'; v_inicio := '10:30'; v_fim := '16:00';
      v_titulo := 'Prospecção';
      v_descricao := 'Instagram, base ou tráfego. Lead de tráfego é sempre prioridade.';
    when 'follow_niveis_1_2_bloco2' then
      v_emoji := '🎯'; v_inicio := '16:00'; v_fim := '16:30';
      v_titulo := '2º bloco de Follow Up (níveis 1 e 2)';
      v_descricao := 'Sequência da matriz de follow-up. Pausa e atende na hora quem responder.';
    when 'confirmar_amanha' then
      v_emoji := '✅'; v_inicio := '16:30'; v_fim := '17:00';
      v_titulo := 'Confirmar reuniões de amanhã';
      v_descricao := 'Anti-no-show e relatório diário no grupo do comercial até as 18h.';
    else
      return null;
  end case;

  return
    '⏰ *HORA DA ROTINA — ' || v_inicio || '*' || E'\n\n' ||
    'Oi, ' || p_primeiro_nome || '! Chegou a hora:' || E'\n\n' ||
    v_emoji || ' *' || v_titulo || '*' || E'\n' ||
    '🕘 Das ' || v_inicio || ' às ' || v_fim || E'\n' ||
    '📝 ' || v_descricao || E'\n\n' ||
    '☑️ Terminou? Marque o check em *Minha rotina* no CRM.';
end;
$$;

create or replace function public.notificar_rotina_sdr(p_atividade text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario record;
  v_mensagem text;
begin
  -- Só dia útil (segunda a sexta, no horário de Brasília).
  if extract(isodow from (now() at time zone 'America/Sao_Paulo')) not between 1 and 5 then
    return;
  end if;

  for v_usuario in
    select u.id, u.nome
    from usuarios u
    join orgs o on o.id = u.org_id
    where u.funcao = 'sdr'
      and u.wpp_comercial_e164 is not null
      and coalesce(o.publico, 'mentoria') = 'mentoria'
      and o.status = 'ativo'
  loop
    v_mensagem := private.mensagem_rotina(p_atividade, split_part(v_usuario.nome, ' ', 1));
    if v_mensagem is not null then
      perform private.chamar_enviar_whatsapp(v_usuario.id, v_mensagem);
    end if;
  end loop;
end;
$$;

revoke all on function public.notificar_rotina_sdr(text) from public, anon, authenticated;

select cron.schedule('rotina-sdr-confirmar-reunioes',      '0 12 * * 1-5',  $$select public.notificar_rotina_sdr('confirmar_reunioes')$$);
select cron.schedule('rotina-sdr-retomar-follow-bloco1',   '30 12 * * 1-5', $$select public.notificar_rotina_sdr('retomar_conversas_follow_bloco1')$$);
select cron.schedule('rotina-sdr-prospeccao',              '30 13 * * 1-5', $$select public.notificar_rotina_sdr('prospeccao')$$);
select cron.schedule('rotina-sdr-follow-bloco2',           '0 19 * * 1-5',  $$select public.notificar_rotina_sdr('follow_niveis_1_2_bloco2')$$);
select cron.schedule('rotina-sdr-confirmar-amanha',        '30 19 * * 1-5', $$select public.notificar_rotina_sdr('confirmar_amanha')$$);
