-- Banker - Consorcio: a taxa de venda (vendas ÷ propostas iniciadas) começa
-- em 20% (Samuel, 27/10/26) — antes herdava os 40% do modelo de reunião.
update public.metas_config
set taxa_venda_min = 0.2
where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';
