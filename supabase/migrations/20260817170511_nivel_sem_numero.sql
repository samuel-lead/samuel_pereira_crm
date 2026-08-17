-- "Reunião marcada" é uma coluna visual especial: aparece no Kanban, tem cor
-- própria (verde, destacada), mas NÃO carrega número de nível na tela. As
-- outras 6 colunas (Sem conversa iniciada, Em qualificação, Topou reunião
-- sem horário, No Show, Reunião feita sem fechar, Base) continuam numeradas
-- normalmente como "Nível 1" a "Nível 6" (a numeração visível pula essa
-- coluna, não é o mesmo número que o `ordem` interno).

alter table public.niveis add column numerado boolean not null default true;

update public.niveis set numerado = false where nome = 'Reunião marcada';
