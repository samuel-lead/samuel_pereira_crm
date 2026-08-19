-- Permite apagar uma interação registrada por engano (ex.: clicou em
-- "Registrar ligação" sem querer). Soft delete, igual ao resto do sistema —
-- nunca apaga a linha de verdade, só marca quando foi excluída.
alter table public.interacoes add column excluido_em timestamptz;
