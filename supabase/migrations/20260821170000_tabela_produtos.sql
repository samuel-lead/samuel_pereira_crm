-- A lista de produtos era fixa no código (PRODUTOS em produto-select.tsx).
-- O Samuel precisa poder adicionar, renomear e excluir produto sem precisar
-- pedir alteração de código — mesmo padrão já usado pra origens.

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, nome)
);

alter table public.produtos enable row level security;

create trigger trg_set_updated_at
  before update on public.produtos
  for each row execute function public.set_updated_at();

create policy "produtos_por_org" on public.produtos
  for all
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

-- Semeia a lista fixa que já existia no código, pra cada org existente.
insert into public.produtos (org_id, nome)
select o.id, seed.nome
from public.orgs o
cross join (values
  ('Agenda Previsível'),
  ('Treinamento comercial')
) as seed(nome)
on conflict (org_id, nome) do nothing;

-- Semeia também qualquer produto que já tenha sido digitado à mão em algum
-- lead vendido (via "Outro...") e ainda não esteja na lista.
insert into public.produtos (org_id, nome)
select distinct l.org_id, l.produto
from public.leads l
where l.produto is not null and l.produto <> ''
on conflict (org_id, nome) do nothing;

-- Renomeia um produto e atualiza todo lead que já usava o nome antigo, pra
-- não deixar histórico e relatório inconsistentes.
create function public.renomear_produto(produto_id uuid, novo_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_do_produto uuid;
  nome_antigo text;
begin
  select org_id, nome into org_do_produto, nome_antigo
  from public.produtos
  where id = produto_id and org_id = private.current_org_id();

  if org_do_produto is null then
    raise exception 'Produto não encontrado nessa organização';
  end if;

  if novo_nome is null or btrim(novo_nome) = '' then
    raise exception 'O nome do produto não pode ficar em branco';
  end if;

  update public.produtos set nome = btrim(novo_nome) where id = produto_id;
  update public.leads set produto = btrim(novo_nome)
    where org_id = org_do_produto and produto = nome_antigo;
end;
$$;

revoke all on function public.renomear_produto(uuid, text) from public, anon;
grant execute on function public.renomear_produto(uuid, text) to authenticated;

-- Bloqueia a exclusão se algum lead ainda usa esse produto (o nome é texto
-- solto em `leads`, sem FK) — evita deixar lead com um produto "fantasma".
create function public.excluir_produto(produto_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_do_produto uuid;
  nome_produto text;
  qtd_leads int;
begin
  select org_id, nome into org_do_produto, nome_produto
  from public.produtos
  where id = produto_id and org_id = private.current_org_id();

  if org_do_produto is null then
    raise exception 'Produto não encontrado nessa organização';
  end if;

  select count(*) into qtd_leads
  from public.leads
  where org_id = org_do_produto and produto = nome_produto;

  if qtd_leads > 0 then
    raise exception 'Esse produto está sendo usado por % lead%. Troque o produto desses leads (ou renomeie) antes de excluir.',
      qtd_leads, case when qtd_leads = 1 then '' else 's' end;
  end if;

  delete from public.produtos where id = produto_id;
end;
$$;

revoke all on function public.excluir_produto(uuid) from public, anon;
grant execute on function public.excluir_produto(uuid) to authenticated;
