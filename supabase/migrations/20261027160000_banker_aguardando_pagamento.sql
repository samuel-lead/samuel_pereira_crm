-- Banker - Consorcio: a última etapa do funil se chama "Aguardando pagamento"
-- (Samuel, 27/10/26), não "Aguardando assinatura".
update public.niveis
set nome = 'Aguardando pagamento',
    definicao = 'Proposta feita; falta o pagamento pra fechar a venda',
    etiqueta_wpp = 'Aguardando pagamento'
where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed' and ordem = 7;
