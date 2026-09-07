-- Motivo obrigatório ao mover um lead pra "Repescagem futura de ICP" —
-- mesma ideia do motivo_base que já existe pra quem vai pra Base, só que
-- aqui é sempre texto livre (não tem um motivo padronizado, cada caso é
-- diferente: "não pode investir esse mês", "só decide em janeiro", etc.).
alter table public.leads
  add column motivo_repescagem_futura text;
