-- Alguns corretores não ganham porcentagem da venda, ganham um valor fixo
-- por imóvel vendido (ex.: R$ 500 por venda, sempre o mesmo, não importa
-- o preço do imóvel). Adiciona o tipo de comissão do corretor e o campo
-- pro valor fixo — mantém comissao_percentual como estava, só passa a ser
-- opcional dependendo do tipo escolhido.
alter table public.usuarios
  add column if not exists comissao_tipo text not null default 'percentual'
    check (comissao_tipo in ('percentual', 'fixo')),
  add column if not exists comissao_valor_fixo numeric(12, 2);
