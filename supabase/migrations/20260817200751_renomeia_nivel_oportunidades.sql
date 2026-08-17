-- Renomeia o nível "Fez a reunião, mas ainda não comprou" (ordem 6) pra
-- "Oportunidades para o fim do mês", pedido do Samuel.

update public.niveis set nome = 'Oportunidades para o fim do mês'
  where nome = 'Fez a reunião, mas ainda não comprou';
