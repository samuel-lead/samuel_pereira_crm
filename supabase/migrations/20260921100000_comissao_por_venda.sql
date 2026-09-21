-- Cada venda do imobiliário guarda como a comissão foi calculada (% do
-- preço ou valor fixo) e o número usado — assim dá pra escolher o tipo
-- venda a venda, e editar uma venda antiga não recalcula com o tipo do
-- perfil por engano. Vendas antigas ficam null (usam o perfil como padrão).
alter table public.leads
  add column if not exists venda_comissao_tipo text
    check (venda_comissao_tipo in ('percentual', 'fixo')),
  add column if not exists venda_comissao_valor numeric(12, 2);
