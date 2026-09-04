-- Novo motivo de Base "desqualificado" (lead sem perfil pro momento) exige
-- uma descrição de por que — guarda esse texto aqui, separado do
-- motivo_base em si (que continua sendo só a categoria).
alter table public.leads
  add column motivo_base_detalhe text;
