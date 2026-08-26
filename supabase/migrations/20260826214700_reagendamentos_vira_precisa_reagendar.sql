-- Samuel achou "Reagendamentos" confuso — parecia gente que ELE já
-- reagendou, não gente que PRECISA ser reagendada. Troca só o texto.
update public.niveis set nome = 'Precisa reagendar', etiqueta_wpp = 'Precisa reagendar' where nome = 'Reagendamentos';
