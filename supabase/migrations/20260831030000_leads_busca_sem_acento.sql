-- Busca de lead por nome ignorava acento: procurar "Junior" não achava
-- "Júnior" (ilike compara texto exato, só ignora maiúscula/minúscula).
-- unaccent() do Postgres não é IMMUTABLE por padrão, então não dá pra usar
-- direto numa coluna gerada — cria um wrapper IMMUTABLE em cima dela.
create extension if not exists unaccent;
create extension if not exists pg_trgm;

create or replace function public.remover_acento(texto text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public
as $$
  select public.unaccent('public.unaccent', texto);
$$;

alter table leads
  add column nome_busca text
  generated always as (public.remover_acento(lower(nome))) stored;

create index leads_nome_busca_idx on leads using gin (nome_busca gin_trgm_ops);
