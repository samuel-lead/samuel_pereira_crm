-- Samuel pediu: a mensagem mostra a descrição COMPLETA de cada atividade
-- (em lista, um item por linha), e só o título pode ser abreviado.
-- Os itens batem com painel/lib/rotina/atividades.ts.
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
  v_itens text;
begin
  case p_atividade
    when 'confirmar_reunioes' then
      v_emoji := '📅'; v_inicio := '09:00'; v_fim := '09:30';
      v_titulo := 'Confirmar e reagendar reuniões';
      v_itens := '• Reuniões do dia' || E'\n' ||
                 '• Reagendar as do dia anterior (processo anti-no-show)' || E'\n' ||
                 '• Fazer follow com os leads do nível 3';
    when 'retomar_conversas_follow_bloco1' then
      v_emoji := '💬'; v_inicio := '09:30'; v_fim := '10:30';
      v_titulo := 'Retomar conversas e 1º Follow Up (níveis 1 e 2)';
      v_itens := '• Leads que responderam no dia anterior no WhatsApp e Instagram' || E'\n' ||
                 '• Leads parados ou atrasados no CRM, seguindo a matriz de follow-up' || E'\n' ||
                 '• Pausa e atende na hora quem responder ou lead de tráfego que chegar' || E'\n' ||
                 '• Depois volte conforme a rotina';
    when 'prospeccao' then
      v_emoji := '📲'; v_inicio := '10:30'; v_fim := '16:00';
      v_titulo := 'Prospecção';
      v_itens := '• Instagram, base ou tráfego' || E'\n' ||
                 '• Lead de tráfego é sempre prioridade' || E'\n' ||
                 '• Pausa assim que qualquer lead responder' || E'\n' ||
                 '• Depois volte conforme a rotina';
    when 'follow_niveis_1_2_bloco2' then
      v_emoji := '🎯'; v_inicio := '16:00'; v_fim := '16:30';
      v_titulo := '2º Follow Up (níveis 1 e 2)';
      v_itens := '• Sequência seguindo a matriz de follow-up' || E'\n' ||
                 '• Pausa e atende na hora quem responder ou lead de tráfego que chegar' || E'\n' ||
                 '• Depois volte conforme a rotina';
    when 'confirmar_amanha' then
      v_emoji := '✅'; v_inicio := '16:30'; v_fim := '17:00';
      v_titulo := 'Confirmar reuniões de amanhã';
      v_itens := '• Seguir o processo de anti-no-show' || E'\n' ||
                 '• Enviar o relatório diário no grupo do comercial até as 18h';
    else
      return null;
  end case;

  return
    v_emoji || ' *' || v_titulo || '*' || E'\n\n' ||
    'Oi, ' || p_primeiro_nome || '! Chegou a hora:' || E'\n\n' ||
    '🕘 Das ' || v_inicio || ' às ' || v_fim || E'\n\n' ||
    '📝 *O que fazer:*' || E'\n' ||
    v_itens || E'\n\n' ||
    '☑️ Terminou? Marque o check em *Minha rotina* no CRM.';
end;
$$;
