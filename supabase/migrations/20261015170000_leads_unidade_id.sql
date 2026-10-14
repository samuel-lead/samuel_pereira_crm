-- Venda no imobiliário passa a poder apontar a UNIDADE vendida do
-- empreendimento (ver unidades_imovel). Opcional: lead antigo e venda sem
-- unidade continuam como sempre.
alter table public.leads
  add column unidade_id uuid references public.unidades_imovel(id);
