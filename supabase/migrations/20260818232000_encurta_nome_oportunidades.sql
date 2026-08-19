-- "Oportunidades para o fim do mês" não cabia no cabeçalho da coluna do
-- Kanban (cortava o texto). Encurtado pra caber, mesmo sentido.
update public.niveis set nome = 'Oportunidades do mês' where ordem = 7;
