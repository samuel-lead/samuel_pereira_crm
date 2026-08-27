-- Samuel pediu pra trocar "Leads" (nível 0, lead cadastrado ainda não
-- abordado) por "Novos Leads", pra ficar mais claro na coluna do Kanban.
update public.niveis
set nome = 'Novos Leads', etiqueta_wpp = 'Novos Leads'
where ordem = 0;
