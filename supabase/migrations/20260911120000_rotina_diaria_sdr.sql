-- "Minha rotina" — checklist diário das 7 atividades do SDR, pedido do
-- Samuel pra deixar a rotina de pré-vendas mais fluida (hoje só existe
-- como documento no Google Docs, que o time não usa no dia a dia). Só
-- registra QUAL atividade foi marcada em QUAL dia por QUAL usuário — as 7
-- atividades em si (título, horário, descrição) ficam fixas no código,
-- não no banco, porque ainda não é algo configurável por empresa.
create table public.rotina_diaria_status (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  data date not null,
  atividade text not null,
  concluido_em timestamptz not null default now(),
  unique (usuario_id, data, atividade)
);

alter table public.rotina_diaria_status enable row level security;

create policy "rotina_diaria_status_por_usuario" on public.rotina_diaria_status
  for all
  using (org_id = private.current_org_id() and usuario_id = (select auth.uid()))
  with check (org_id = private.current_org_id() and usuario_id = (select auth.uid()));

create index rotina_diaria_status_usuario_data_idx on public.rotina_diaria_status (usuario_id, data);
