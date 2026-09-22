-- Samuel pediu (de novo) pra trocar "Oportunidades para o fim do mês" por
-- "Leads para o fim do mês" — da vez passada isso só foi feito nas orgs
-- imobiliário (20260922110000), por entender errado que o pedido era só
-- pra lá. Agora vale pra todo mundo, mentoria incluso (não mexe na regra
-- de "Reunião"/"Visita", só nesse nome de nível).
update public.niveis
set nome = 'Leads para o fim do mês'
where ordem = 8
  and nome = 'Oportunidades para o fim do mês';
