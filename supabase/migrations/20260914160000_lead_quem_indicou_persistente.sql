-- "Quem indicou?" só existia como nota solta na linha do tempo — o campo
-- do formulário nunca lia esse valor de volta, então SEMPRE abria vazio e
-- a pessoa tinha que digitar de novo toda vez que salvava o lead (e cada
-- vez que digitava e salvava, criava outra nota duplicada). Samuel pegou
-- isso ao vivo. Agora vira uma coluna de verdade no lead, que o
-- formulário lê e mostra de volta.
alter table public.leads
  add column if not exists quem_indicou text;
