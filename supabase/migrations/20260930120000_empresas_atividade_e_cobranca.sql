-- Samuel pediu duas coisas na tela "Gerenciar empresas" (super admin):
-- 1. Ver se o cliente está usando o CRM de verdade — mostra a última
--    atividade dele (lead criado, nível mudou, ou interação registrada).
-- 2. Cobrança dentro do CRM — dia de vencimento por empresa + controle de
--    "pago esse mês" manual. O CRM só lembra e mostra a situação; não
--    move dinheiro nem mexe em cartão/Pix de verdade.
alter table public.orgs
  add column if not exists dia_vencimento smallint check (dia_vencimento between 1 and 31),
  add column if not exists mensalidade_valor numeric,
  add column if not exists ultimo_pagamento_em timestamptz;

drop function if exists public.listar_organizacoes_super_admin();
drop function if exists public.detalhe_org_super_admin(uuid);

-- Atualiza as duas funções de super admin pra devolver também a última
-- atividade e os dados de cobrança de cada empresa.
create or replace function public.listar_organizacoes_super_admin()
returns table(
  id uuid,
  nome text,
  status text,
  publico text,
  criado_em timestamptz,
  admin_nome text,
  admin_email text,
  ultima_atividade_em timestamptz,
  dia_vencimento smallint,
  mensalidade_valor numeric,
  ultimo_pagamento_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.nome,
    o.status,
    o.publico,
    o.created_at,
    u.nome as admin_nome,
    au.email as admin_email,
    greatest(
      (select max(l.created_at) from public.leads l where l.org_id = o.id),
      (select max(i.created_at) from public.interacoes i where i.org_id = o.id),
      (select max(h.created_at) from public.nivel_historico h where h.org_id = o.id)
    ) as ultima_atividade_em,
    o.dia_vencimento,
    o.mensalidade_valor,
    o.ultimo_pagamento_em
  from public.orgs o
  left join lateral (
    select u2.id, u2.nome
    from public.usuarios u2
    where u2.org_id = o.id and u2.papel = 'admin'
    order by u2.created_at asc
    limit 1
  ) u on true
  left join auth.users au on au.id = u.id
  where private.eh_super_admin()
    and o.id <> (select org_id from public.usuarios where id = auth.uid())
  order by o.created_at desc;
$$;

create or replace function public.detalhe_org_super_admin(p_org_id uuid)
returns table(
  id uuid,
  nome text,
  status text,
  publico text,
  criado_em timestamptz,
  ultima_atividade_em timestamptz,
  dia_vencimento smallint,
  mensalidade_valor numeric,
  ultimo_pagamento_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.nome,
    o.status,
    o.publico,
    o.created_at,
    greatest(
      (select max(l.created_at) from public.leads l where l.org_id = o.id),
      (select max(i.created_at) from public.interacoes i where i.org_id = o.id),
      (select max(h.created_at) from public.nivel_historico h where h.org_id = o.id)
    ) as ultima_atividade_em,
    o.dia_vencimento,
    o.mensalidade_valor,
    o.ultimo_pagamento_em
  from public.orgs o
  where private.eh_super_admin()
    and o.id = p_org_id;
$$;

revoke all on function public.detalhe_org_super_admin(uuid) from public;
grant execute on function public.detalhe_org_super_admin(uuid) to authenticated;

-- Marca a mensalidade da empresa como paga agora (chamado pelo botão
-- "Marcar como pago" em /empresas). Só o super admin pode.
create or replace function public.marcar_org_como_paga(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.eh_super_admin() then
    raise exception 'Sem permissão';
  end if;

  update public.orgs
  set ultimo_pagamento_em = now()
  where id = p_org_id;
end;
$$;

revoke all on function public.marcar_org_como_paga(uuid) from public;
grant execute on function public.marcar_org_como_paga(uuid) to authenticated;
