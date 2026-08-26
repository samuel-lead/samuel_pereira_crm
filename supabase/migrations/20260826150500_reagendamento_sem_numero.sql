-- "Reagendamento" (ver 20260826150000_adiciona_nivel_reagendamento.sql)
-- não deve contar na numeração "Nível N" mostrada pro usuário — Samuel
-- pediu que a coluna mostre só a palavra "Reagendamento", sem prefixo, e
-- que os níveis depois dela (Oportunidades, Base) continuem com o mesmo
-- número de antes, sem deslocar por causa da coluna nova.
update public.niveis set numerado = false where nome = 'Reagendamento';
