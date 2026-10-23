-- Samuel (23/10/26): a receita tem que contar no mês em que o dinheiro CAIU,
-- não no mês da venda. Ex.: cliente fechou em agosto por R$ 10.000 e pagou
-- R$ 3.000 em outubro → a venda é de agosto, os R$ 3.000 são receita de outubro.
-- Cada pagamento recebido vira uma linha com valor e data própria. O campo
-- leads.receita_venda continua existindo como o TOTAL já recebido daquela
-- venda (é mantido sozinho pelo gatilho abaixo), então as telas que mostram
-- "quanto já recebi dessa venda" não mudam.
create table public.venda_recebimentos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid references public.usuarios(id),
  lead_id uuid not null references public.leads(id),
  valor numeric(14,2) not null check (valor > 0),
  recebido_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  -- Nada é apagado de verdade (regra do projeto): pagamento removido fica só
  -- marcado com a data e some das contas.
  excluido_em timestamptz
);

create index venda_recebimentos_lead_idx on public.venda_recebimentos (lead_id);
create index venda_recebimentos_org_data_idx
  on public.venda_recebimentos (org_id, recebido_em) where excluido_em is null;

alter table public.venda_recebimentos enable row level security;

create policy venda_recebimentos_por_org on public.venda_recebimentos for all
  using (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = venda_recebimentos.lead_id)
    )
  )
  with check (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = venda_recebimentos.lead_id)
    )
  );

-- Tudo que já foi recebido até hoje vira UM pagamento na data da venda — assim
-- os números de meses passados ficam exatamente como estavam.
insert into public.venda_recebimentos (org_id, lead_id, valor, recebido_em)
select l.org_id, l.id, l.receita_venda, coalesce(l.vendido_em, l.declarado_em, now())
from public.leads l
where l.status = 'vendido' and coalesce(l.receita_venda, 0) > 0;

create or replace function private.sincroniza_receita_do_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead uuid := coalesce(new.lead_id, old.lead_id);
begin
  update public.leads
     set receita_venda = (
       select coalesce(sum(valor), 0) from public.venda_recebimentos
        where lead_id = v_lead and excluido_em is null
     )
   where id = v_lead and status = 'vendido';
  return null;
end;
$$;

create trigger venda_recebimentos_sincroniza_receita
  after insert or update or delete on public.venda_recebimentos
  for each row execute function private.sincroniza_receita_do_lead();

-- Resumo do dia no WhatsApp do Samuel: a receita do dia passa a ser o que
-- CAIU hoje (mesmo de venda antiga), não só a das vendas fechadas hoje.
create or replace function public.enviar_resumo_comercial_samuel()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_samuel uuid := '31f5b5d4-b3f0-4de3-82c1-2473800613bc';
  v_org uuid := 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
  v_ini timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_fim timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '1 day') at time zone 'America/Sao_Paulo';
  v_data text := to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM');
  v_dia text;
  v_leads int; v_lig int; v_marc int; v_real int; v_ns int; v_vendas int;
  v_fat numeric; v_rec numeric;
  v_comp text;
  v_linhas_venda text := '';
  fmt_moeda text := 'FM999,999,990.00';
begin
  v_dia := (array['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'])
           [extract(dow from (now() at time zone 'America/Sao_Paulo'))::int + 1];

  select count(*) into v_leads from leads
   where org_id = v_org and arquivado_em is null and declarado_em >= v_ini and declarado_em < v_fim
     and (nivel_ordem <> 9 or motivo_base is distinct from 'farming');
  select count(*) into v_lig from interacoes i join leads l on l.id = i.lead_id
   where i.org_id = v_org and i.tipo = 'ligacao' and i.excluido_em is null and l.arquivado_em is null
     and i.ocorreu_em >= v_ini and i.ocorreu_em < v_fim;
  select count(*) into v_marc from reunioes r join leads l on l.id = r.lead_id
   where r.org_id = v_org and l.arquivado_em is null and r.reagendada = false and r.marcada_em >= v_ini and r.marcada_em < v_fim;
  select count(*) into v_real from reunioes r join leads l on l.id = r.lead_id
   where r.org_id = v_org and l.arquivado_em is null and r.status = 'realizada' and r.agendada_para >= v_ini and r.agendada_para < v_fim;
  select count(*) into v_ns from reunioes r join leads l on l.id = r.lead_id
   where r.org_id = v_org and l.arquivado_em is null and r.status = 'nao_compareceu' and r.agendada_para >= v_ini and r.agendada_para < v_fim;
  select count(*), coalesce(sum(valor_venda), 0) into v_vendas, v_fat from leads
   where org_id = v_org and arquivado_em is null and status = 'vendido' and vendido_em >= v_ini and vendido_em < v_fim;
  select coalesce(sum(r.valor), 0) into v_rec from venda_recebimentos r join leads l on l.id = r.lead_id
   where r.org_id = v_org and r.excluido_em is null and l.arquivado_em is null and l.status = 'vendido'
     and r.recebido_em >= v_ini and r.recebido_em < v_fim;

  v_comp := case when v_real + v_ns > 0 then round(100.0 * v_real / (v_real + v_ns)) || '%' else '—' end;

  if v_vendas > 0 then
    v_linhas_venda :=
      E'\n' || '💵 Faturamento: R$ ' || translate(to_char(v_fat, fmt_moeda), ',.', '.,');
  end if;
  if v_vendas > 0 or v_rec > 0 then
    v_linhas_venda := v_linhas_venda ||
      E'\n' || '🧾 Receita: R$ ' || translate(to_char(v_rec, fmt_moeda), ',.', '.,');
  end if;
  if v_vendas > 0 then
    v_linhas_venda := v_linhas_venda ||
      E'\n' || '🎟️ Ticket médio: R$ ' || translate(to_char(v_fat / v_vendas, fmt_moeda), ',.', '.,');
  end if;

  perform private.chamar_enviar_whatsapp(
    v_samuel,
    '📊 *RESUMO DO DIA — COMERCIAL*' || E'\n' ||
    '🗓️ ' || v_dia || ', ' || v_data || E'\n\n' ||
    '🆕 Leads: ' || v_leads || E'\n' ||
    '📞 Ligações: ' || v_lig || E'\n' ||
    '📅 Calls marcadas: ' || v_marc || E'\n' ||
    '✅ Calls realizadas: ' || v_real || E'\n' ||
    '🚫 No-show: ' || v_ns || E'\n' ||
    '📈 Comparecimento: ' || v_comp || E'\n' ||
    '💰 Vendas: ' || v_vendas ||
    v_linhas_venda
  );
end;
$$;

revoke all on function public.enviar_resumo_comercial_samuel() from public, anon, authenticated;
