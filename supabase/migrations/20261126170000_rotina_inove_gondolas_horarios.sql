-- Inove Gôndolas (Samuel, 26/11/26): follow das 09:30 às 12:00 e prospecção das 13:00 às 17:00.
-- O aviso das 09:30 já existia (cron compartilhado com a rotina padrão); a prospecção da Inove
-- ganha um cron próprio às 13:00 (16:00 UTC), com o id 'gondolas_prospeccao'. O cron das 10:30
-- continua existindo pras outras empresas e não manda nada pra Inove.
create or replace function private.mensagem_rotina_gondolas(p_atividade text, p_primeiro_nome text)
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
      v_emoji := '📞'; v_inicio := '09:00'; v_fim := '09:30';
      v_titulo := 'Andamento dos leads do Elton';
      v_itens := '• Confirmar o andamento dos leads enviados para o Elton';
    when 'retomar_conversas_follow_bloco1' then
      v_emoji := '💬'; v_inicio := '09:30'; v_fim := '12:00';
      v_titulo := 'Follow das abordagens (dias 1, 2 e 3)';
      v_itens := '• Fazer follow com os leads da abordagem dos dias 1, 2 e 3' || E'\n' ||
                 '• Pausar e atender na hora quem responder' || E'\n' ||
                 '• Depois, voltar à rotina';
    when 'gondolas_prospeccao' then
      v_emoji := '📲'; v_inicio := '13:00'; v_fim := '17:00';
      v_titulo := 'Prospecção de novos leads';
      v_itens := '• Iniciar a prospecção de novos leads' || E'\n' ||
                 '• Pausar assim que qualquer lead responder' || E'\n' ||
                 '• Depois, voltar à rotina';
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

revoke all on function private.mensagem_rotina_gondolas(text, text) from public, anon, authenticated;

select cron.schedule('rotina-sdr-gondolas-prospeccao', '0 16 * * 1-5', $$select public.notificar_rotina_sdr('gondolas_prospeccao')$$);
