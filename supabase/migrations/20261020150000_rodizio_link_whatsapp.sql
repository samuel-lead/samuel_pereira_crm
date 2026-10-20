-- Fila exata do link sousamuelpereira.com.br/whatsapp: em vez de sortear o
-- vendedor (que com poucos leads dava divisões tortas tipo 9/5/1), o link
-- guarda um contador e cada clique pega o próximo da vez — 1, 2, 3, 1, 2, 3.
--
-- org_id fica opcional: o link é do site, não de uma empresa específica do
-- CRM. A coluna existe pra seguir a regra "toda tabela tem org_id" e pra dar
-- pra amarrar um rodízio a uma empresa no futuro.

create table public.rodizio_links (
  chave text primary key,
  org_id uuid references public.orgs(id),
  contador bigint not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.rodizio_links enable row level security;
-- Sem policy nenhuma de propósito: ninguém lê nem escreve a tabela direto.
-- O único jeito de mexer é a função abaixo.

insert into public.rodizio_links (chave) values ('whatsapp');

-- Soma 1 no contador e devolve o novo valor, numa operação só — dois cliques
-- no mesmo instante nunca pegam o mesmo número. Só atualiza chave que já
-- existe (não cria linha nova), então quem chamar com chave inventada
-- recebe null e não suja a tabela.
create or replace function public.proximo_rodizio(p_chave text)
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.rodizio_links
     set contador = contador + 1,
         atualizado_em = now()
   where chave = p_chave
  returning contador;
$$;

revoke all on function public.proximo_rodizio(text) from public;
grant execute on function public.proximo_rodizio(text) to anon, authenticated;
