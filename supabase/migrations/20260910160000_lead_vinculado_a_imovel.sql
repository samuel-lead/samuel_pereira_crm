-- Primeiro passo pra copiar o Kanban do 100Bug (CRM concorrente, pedido do
-- Samuel) pro público imobiliário: hoje lead e imóvel são duas coisas
-- soltas no sistema, sem nada que ligue "esse lead quer esse imóvel". Sem
-- isso não dá pra mostrar foto/dados do imóvel no card do Kanban (os
-- próximos passos dessa tarefa).
alter table public.leads
  add column imovel_id uuid references public.imoveis(id);

create index leads_imovel_id_idx on public.leads (imovel_id);
