-- Guarda a "inscrição" de notificação push de cada usuário — o endereço
-- que o navegador/celular gera quando a pessoa aceita receber
-- notificação. É isso que a Edge Function usa pra mandar o aviso de
-- verdade pra tela de bloqueio. Uma pessoa pode ter mais de um aparelho
-- inscrito (celular e computador, por exemplo).
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  usuario_id uuid not null references usuarios(id),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now(),
  unique (usuario_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on push_subscriptions for select
  to authenticated
  using (usuario_id = auth.uid());

create policy "push_subscriptions_insert_own" on push_subscriptions for insert
  to authenticated
  with check (usuario_id = auth.uid() and org_id = private.current_org_id());

create policy "push_subscriptions_delete_own" on push_subscriptions for delete
  to authenticated
  using (usuario_id = auth.uid());

create index push_subscriptions_usuario_id_idx on push_subscriptions (usuario_id);
