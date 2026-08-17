-- "Topou reunião, mas ainda não definiu o horário" não cabia numa linha só
-- dentro da coluna do Kanban. Encurtado mantendo o sentido e a gramática.

update public.niveis set nome = 'Topou reunião, horário a definir'
  where nome = 'Topou reunião, mas ainda não definiu o horário';
