-- Lead pode ter um responsável opcional (um usuário da própria org).
-- Nullable: não é obrigatório escolher.

alter table public.leads
  add column responsavel_id uuid references public.usuarios(id);

create index leads_responsavel_idx on public.leads (responsavel_id);
