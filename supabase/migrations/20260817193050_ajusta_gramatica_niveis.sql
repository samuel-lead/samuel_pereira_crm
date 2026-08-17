-- Ajuste de gramática nos nomes dos níveis (pedido do Samuel).

update public.niveis set nome = 'Topou reunião, mas ainda não definiu o horário'
  where nome = 'Topou reunião, sem horário';

update public.niveis set nome = 'Fez a reunião, mas ainda não comprou'
  where nome = 'Reunião feita, sem fechar';
