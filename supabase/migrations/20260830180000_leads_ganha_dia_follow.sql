-- Marcador manual de "em que dia do follow-up esse lead está" (1 a 5) —
-- a SDR escolhe direto no card do lead, sem regra automática nenhuma
-- atrás, só pra lembrar em que ponto da sequência de follow ela parou.
alter table public.leads
  add column dia_follow smallint;

alter table public.leads
  add constraint leads_dia_follow_check
  check (dia_follow is null or (dia_follow between 1 and 5));
