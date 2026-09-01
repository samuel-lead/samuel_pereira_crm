-- Iscas: material (PDF, link de aula, etc.) que a pessoa recebe assim que
-- se cadastra numa página pública de captura, sem o Samuel precisar
-- enviar nada manualmente. Cada isca tem um link público próprio
-- (dominio.com/<slug>), reutilizável por quantas pessoas quiserem.
create table iscas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  usuario_id uuid not null references usuarios(id),
  nome text not null,
  slug text not null unique,
  material_url text not null,
  ativo boolean not null default true,
  arquivado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table iscas enable row level security;

-- Membros da org veem/gerenciam as iscas da própria org (inclusive
-- inativas, pra poder reativar/editar).
create policy "iscas_select_org" on iscas for select
  to authenticated
  using (org_id = private.current_org_id());

create policy "iscas_insert_org" on iscas for insert
  to authenticated
  with check (org_id = private.current_org_id() and private.eh_admin());

create policy "iscas_update_org" on iscas for update
  to authenticated
  using (org_id = private.current_org_id() and private.eh_admin());

-- A página pública de captura roda sem login — precisa achar a isca pelo
-- slug pra saber o material e a org, então visitante anônimo só enxerga
-- iscas ativas e não arquivadas (nunca vê as de outras orgs por engano
-- porque a busca já é sempre por slug exato, que é único no sistema).
create policy "iscas_select_publico" on iscas for select
  to anon
  using (ativo = true and arquivado_em is null);

create index iscas_org_id_idx on iscas (org_id);

-- Rastreia de qual isca cada lead veio (pra relatório de quantos leads
-- cada isca trouxe, mais pra frente).
alter table leads add column isca_id uuid references iscas(id);

-- Cria o lead a partir do formulário público da isca. SECURITY DEFINER
-- porque quem chama é anônimo (sem sessão, sem org) — a função é o único
-- jeito controlado de um visitante sem login conseguir gravar um lead,
-- em vez de abrir a tabela leads pra qualquer INSERT anônimo.
create or replace function public.criar_lead_via_isca(
  p_slug text,
  p_nome text,
  p_telefone_e164 text
)
returns table(lead_id uuid, material_url text, ja_existia boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_isca record;
  v_lead_id uuid;
  v_ja_existia boolean := false;
begin
  select * into v_isca from iscas
  where slug = p_slug and ativo = true and arquivado_em is null;

  if v_isca is null then
    raise exception 'Isca não encontrada ou desativada';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'Nome é obrigatório';
  end if;

  if p_telefone_e164 is null or length(p_telefone_e164) < 12 then
    raise exception 'Telefone inválido';
  end if;

  -- Mesmo telefone cadastrado de novo na mesma isca/org: não duplica o
  -- lead, só devolve o material de novo pra ela.
  select id into v_lead_id from leads
  where org_id = v_isca.org_id and telefone_e164 = p_telefone_e164
  limit 1;

  if v_lead_id is not null then
    v_ja_existia := true;
  else
    insert into leads (org_id, usuario_id, nome, telefone_e164, origem, nivel_ordem, isca_id)
    values (v_isca.org_id, v_isca.usuario_id, trim(p_nome), p_telefone_e164, 'Isca: ' || v_isca.nome, 0, v_isca.id)
    returning id into v_lead_id;

    insert into origens (org_id, nome)
    values (v_isca.org_id, 'Isca: ' || v_isca.nome)
    on conflict (org_id, nome) do nothing;
  end if;

  return query select v_lead_id, v_isca.material_url, v_ja_existia;
end;
$$;

grant execute on function public.criar_lead_via_isca(text, text, text) to anon, authenticated;
