-- Motivo pelo qual o lead caiu na Base — antes era calculado sozinho a
-- partir do histórico (proposta enviada, reunião com no-show, critérios
-- preenchidos). Agora quem move o lead pra Base escolhe o motivo na hora,
-- então precisa de um lugar pra guardar essa escolha.
alter table leads
  add column motivo_base text
  check (motivo_base is null or motivo_base in (
    'nao_iniciou_conversa',
    'qualificou_sumiu',
    'nao_reagendados',
    'proposta_nao_comprou'
  ));
