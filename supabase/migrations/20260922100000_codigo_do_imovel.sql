-- Cada imóvel ganha um código próprio (tipo "IM001"), pra pesquisar por
-- ele além do título. Preenche os já cadastrados com um código sequencial
-- (por empresa, na ordem em que foram criados) e trava duplicado entre
-- imóveis ativos da mesma empresa.
alter table public.imoveis add column if not exists codigo text;

with numerados as (
  select id, 'IM' || lpad(row_number() over (partition by org_id order by created_at)::text, 3, '0') as novo_codigo
  from public.imoveis
  where codigo is null
)
update public.imoveis
set codigo = numerados.novo_codigo
from numerados
where public.imoveis.id = numerados.id;

create unique index if not exists imoveis_org_codigo_ativo_idx
  on public.imoveis (org_id, upper(codigo))
  where arquivado_em is null;
