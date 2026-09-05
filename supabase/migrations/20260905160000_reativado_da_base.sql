-- Marca quando um lead foi reativado da Base — Samuel quer isso visível
-- direto no card, não só escondido na linha do tempo (o nivel_historico já
-- registra "Reativado da Base", mas não aparece no card sem abrir o lead).
alter table public.leads
  add column reativado_da_base_em timestamptz;
