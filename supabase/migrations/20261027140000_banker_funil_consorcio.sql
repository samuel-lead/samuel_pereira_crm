-- Banker - Consorcio vende consórcio por ligação: não existe reunião.
-- Funil novo (Samuel, 27/10/26). A numeração interna (ordem) não muda — o
-- código reaproveita os níveis 4 e 7 — só os nomes. Os níveis 5, 6 e 8
-- (No-show, Precisa reagendar, Oportunidades) deixam de aparecer pra essa
-- empresa (o painel esconde pelo funil de consórcio) e saem da numeração.
--
-- Pré-vendas: Novos Leads → Tentando contato → Em conversa → Simulação enviada
-- Vendas:     Proposta iniciada → Aguardando assinatura
update public.niveis set nome = 'Tentando contato',
  definicao = 'Liguei ou mandei mensagem; ainda não consegui conversar com o lead',
  etiqueta_wpp = 'Tentando contato'
where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed' and ordem = 1;

update public.niveis set nome = 'Em conversa',
  definicao = 'Conversa engatou; levantando valor do crédito, parcela e prazo',
  etiqueta_wpp = 'Em conversa'
where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed' and ordem = 2;

update public.niveis set nome = 'Simulação enviada',
  definicao = 'Mandei a simulação do consórcio; aguardando o lead decidir',
  etiqueta_wpp = 'Simulação enviada'
where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed' and ordem = 3;

update public.niveis set nome = 'Proposta iniciada',
  definicao = 'O lead quer seguir; proposta em andamento',
  etiqueta_wpp = 'Proposta iniciada'
where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed' and ordem = 4;

update public.niveis set nome = 'Aguardando assinatura',
  definicao = 'Proposta feita; falta assinatura e documentos pra fechar a venda',
  etiqueta_wpp = 'Aguardando assinatura'
where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed' and ordem = 7;

update public.niveis set numerado = false
where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed' and ordem in (5, 6, 8);
