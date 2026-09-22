-- No imobiliário, "Oportunidades" não é o termo que o mercado usa — vira
-- "Leads para o fim do mês", pedido do Samuel. Mentoria continua igual.
update public.niveis n
set nome = 'Leads para o fim do mês'
from public.orgs o
where o.id = n.org_id
  and o.publico = 'imobiliario'
  and n.nome = 'Oportunidades para o fim do mês';
