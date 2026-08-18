-- Quem vai fazer a call de vendas (o Closer) pode ser diferente de quem
-- marcou a reunião (o SDR, já é o usuario_id da própria reunião) — mesma
-- distinção que a planilha do Samuel já fazia.
alter table public.reunioes
  add column closer_id uuid references public.usuarios(id);
