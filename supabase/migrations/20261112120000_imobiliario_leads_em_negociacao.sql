-- Samuel (12/11/26): no CRM imobiliário, a fase 8 ("Oportunidades para o fim
-- do mês" / "Leads para o fim do mês") não faz sentido pro mercado imobiliário.
-- Passa a se chamar "Leads em negociação": lead que já está negociando, e que
-- pode vir direto da Pré-vendas ou de Vendas, sem visita marcada (a regra de
-- "não precisa de visita" está no código do painel). Só empresas imobiliárias;
-- mentoria continua igual.
update public.niveis n
   set nome = 'Leads em negociação',
       definicao = 'Lead que já está em negociação (pode vir direto da Pré-vendas, sem visita marcada)',
       etiqueta_wpp = 'Leads em negociação'
  from public.orgs o
 where o.id = n.org_id
   and o.publico = 'imobiliario'
   and n.ordem = 8;
