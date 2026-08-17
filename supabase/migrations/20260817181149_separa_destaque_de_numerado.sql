-- "numerado = false" agora vale pra duas colunas (Leads e Reunião marcada),
-- mas só "Reunião marcada" deve ganhar o destaque visual verde. Separa os
-- dois conceitos: numerado (mostra pílula "Nível X" ou não) e destacado
-- (ganha o estilo verde reforçado ou não).

alter table public.niveis add column destacado boolean not null default false;

update public.niveis set destacado = true where nome = 'Reunião marcada';
