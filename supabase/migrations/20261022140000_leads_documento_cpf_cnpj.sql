-- Samuel (22/10/26): buscar lead por CPF e CNPJ (além de nome, telefone e e-mail).
-- O lead ganha o campo "documento" (CPF ou CNPJ, como a pessoa digitar) e uma
-- coluna gerada só com os dígitos (documento_busca) usada na busca.
alter table public.leads add column documento text;

alter table public.leads
  add column documento_busca text
  generated always as (regexp_replace(coalesce(documento, ''), '[^0-9]', '', 'g')) stored;
