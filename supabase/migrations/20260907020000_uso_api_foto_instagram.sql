-- Controla quantas vezes por mês a API paga (RapidAPI) de foto do
-- Instagram foi chamada. É uma tabela GLOBAL, sem org_id de propósito:
-- é UMA chave de API só, compartilhada entre a Samuel e todos os
-- clientes que usam o CRM (a cota de 5.000/mês do plano gratuito é
-- somada entre todo mundo, não por empresa) — foge da regra normal de
-- "toda tabela tem org_id" porque esse recurso não é por empresa.
create table public.instagram_foto_uso (
  mes text primary key,
  quantidade integer not null default 0
);

alter table public.instagram_foto_uso enable row level security;
-- Sem nenhuma policy — só as duas funções abaixo (security definer)
-- mexem nessa tabela, ninguém lê/escreve direto nela.

create or replace function public.instagram_foto_uso_do_mes()
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select quantidade from instagram_foto_uso where mes = to_char(now(), 'YYYY-MM')),
    0
  );
$$;

revoke all on function public.instagram_foto_uso_do_mes() from public;
grant execute on function public.instagram_foto_uso_do_mes() to authenticated;

create or replace function public.registrar_uso_instagram_foto()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into instagram_foto_uso (mes, quantidade)
  values (to_char(now(), 'YYYY-MM'), 1)
  on conflict (mes) do update set quantidade = instagram_foto_uso.quantidade + 1;
end;
$$;

revoke all on function public.registrar_uso_instagram_foto() from public;
grant execute on function public.registrar_uso_instagram_foto() to authenticated;
