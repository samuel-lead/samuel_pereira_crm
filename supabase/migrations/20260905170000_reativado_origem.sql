-- Reativar de "Repescagem futura de ICP" ficou igual reativar da Base
-- (mesmo botão, mesma tela) — mas o selo que aparece no card em Pré-vendas
-- precisa dizer de onde o lead veio ("Repescagem de ICP" ou "Reativado da
-- Base"), não sempre o mesmo texto (Samuel pediu essa distinção).
alter table public.leads
  add column reativado_origem text check (reativado_origem in ('base', 'repescagem_icp'));
