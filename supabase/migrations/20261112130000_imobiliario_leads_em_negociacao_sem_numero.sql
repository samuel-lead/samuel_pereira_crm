-- Samuel (12/11/26): "Leads em negociação" (imobiliário) fica sem o prefixo
-- "N5 -" no título da coluna e no menu de nível. Só empresas imobiliárias.
-- Efeito colateral esperado: a Base, que era N6, passa a ser N5 (a numeração
-- só conta as fases numeradas).
update public.niveis n
   set numerado = false
  from public.orgs o
 where o.id = n.org_id
   and o.publico = 'imobiliario'
   and n.ordem = 8;
