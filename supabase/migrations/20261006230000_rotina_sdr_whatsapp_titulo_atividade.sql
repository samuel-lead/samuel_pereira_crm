-- Samuel pediu: a mensagem da rotina começa com o NOME da atividade (em vez
-- de "HORA DA ROTINA — HH:MM"), e embaixo vêm o horário e a descrição.
-- Só muda o texto; os horários dos cron continuam os mesmos.
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
    v_emoji || ' *' || v_titulo || '*' || E'\n\n' ||
    'Oi, ' || p_primeiro_nome || '! Chegou a hora:' || E'\n\n' ||
    '🕘 Das ' || v_inicio || ' às ' || v_fim || E'\n' ||
    '📝 ' || v_descricao || E'\n\n' ||
    '☑️ Terminou? Marque o check em *Minha rotina* no CRM.';
end;
$$;
