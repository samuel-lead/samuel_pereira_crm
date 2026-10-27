-- Banker - Consorcio: a primeira etapa de Vendas se chama
-- "Proposta iniciada/documentação" (Samuel, 27/10/26).
update public.niveis
set nome = 'Proposta iniciada/documentação',
    definicao = 'O lead quer seguir; proposta e documentação em andamento',
    etiqueta_wpp = 'Proposta iniciada/documentação'
where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed' and ordem = 4;
