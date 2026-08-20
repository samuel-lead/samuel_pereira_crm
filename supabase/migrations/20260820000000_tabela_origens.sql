-- A lista de origens era fixa no código (ORIGENS em origem-select.tsx).
-- Quem cadastra um lead pode digitar uma origem nova ("Outro...") e ela
-- precisa ficar salva pra próxima pessoa escolher, e o Samuel precisa poder
-- corrigir o nome de uma origem já existente sem perder o histórico.

create table public.origens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, nome)
);

alter table public.origens enable row level security;

create trigger trg_set_updated_at
  before update on public.origens
  for each row execute function public.set_updated_at();

create policy "origens_por_org" on public.origens
  for all
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

-- Semeia a lista fixa que já existia no código, pra cada org existente.
insert into public.origens (org_id, nome)
select o.id, seed.nome
from public.orgs o
cross join (values
  ('Indicação Closer'),
  ('Networking'),
  ('SS IG'),
  ('Treinamento presencial'),
  ('Tráfego pago'),
  ('Indicação base'),
  ('Base de leads'),
  ('Base de clientes'),
  ('HUNTER IG SAMUEL'),
  ('Parceria (aula semanal)'),
  ('Renovação'),
  ('Meu grupo do Wpp')
) as seed(nome)
on conflict (org_id, nome) do nothing;

-- Semeia também qualquer origem que já tenha sido digitada à mão em algum
-- lead (via "Outro...") e ainda não esteja na lista.
insert into public.origens (org_id, nome)
select distinct l.org_id, l.origem
from public.leads l
where l.origem is not null and l.origem <> ''
on conflict (org_id, nome) do nothing;

-- Renomeia uma origem e atualiza todo lead que já usava o nome antigo, pra
-- não deixar histórico e relatório inconsistentes.
create function public.renomear_origem(origem_id uuid, novo_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_da_origem uuid;
  nome_antigo text;
begin
  select org_id, nome into org_da_origem, nome_antigo
  from public.origens
  where id = origem_id and org_id = private.current_org_id();

  if org_da_origem is null then
    raise exception 'Origem não encontrada nessa organização';
  end if;

  if novo_nome is null or btrim(novo_nome) = '' then
    raise exception 'O nome da origem não pode ficar em branco';
  end if;

  update public.origens set nome = btrim(novo_nome) where id = origem_id;
  update public.leads set origem = btrim(novo_nome)
    where org_id = org_da_origem and origem = nome_antigo;
end;
$$;

revoke all on function public.renomear_origem(uuid, text) from public, anon;
grant execute on function public.renomear_origem(uuid, text) to authenticated;
