-- Samuel achou a explicação longa demais — só quer "(Pediu para
-- reagendar)", sem repetir "Marcou reunião e".
update public.niveis
set
  nome = 'Precisa reagendar (Pediu para reagendar)',
  etiqueta_wpp = 'Precisa reagendar (Pediu para reagendar)'
where ordem = 6;
