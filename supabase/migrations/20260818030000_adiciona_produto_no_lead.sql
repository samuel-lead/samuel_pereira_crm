-- Qual produto o lead comprou (ou está negociando) — igual à planilha do
-- Samuel, que já tem uma coluna PRODUTO ao lado do resultado da call.

alter table public.leads
  add column produto text;
