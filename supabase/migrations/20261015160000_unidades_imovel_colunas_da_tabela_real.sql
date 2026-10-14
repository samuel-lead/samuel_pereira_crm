-- A tabela comercial real (Flow One, outubro/2026) traz: Unidade, Área, Vagas
-- (texto, ex.: "Rotativa"), Tipologia (Apartamento/Studio), Posição
-- (Nascente/Sul/Norte), Status, Preço e as condições (Entrada, Mensal 42x,
-- Semestral 6x, Chaves). Ajusta a tabela de unidades pra guardar tudo isso.
alter table public.unidades_imovel
  alter column vagas type text using vagas::text,
  add column tipologia text,
  add column posicao text,
  add column parcela_entrada numeric,
  add column parcela_mensal numeric,
  add column parcela_semestral numeric,
  add column parcela_chaves numeric,
  drop column suites;
