-- A coluna "Leads" (ordem 0) também ganha o destaque visual sólido no
-- painel, igual "Reunião marcada" — cor preta (mesma família do Nível 1)
-- em vez de verde.

update public.niveis set destacado = true where nome = 'Leads';
