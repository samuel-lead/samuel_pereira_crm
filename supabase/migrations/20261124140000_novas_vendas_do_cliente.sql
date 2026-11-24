-- Samuel (24/11/26): cliente que já comprou e compra OUTRO produto. Até hoje o
-- lead guardava uma venda só (produto/valor/data na própria linha do lead), então
-- a 2ª compra não tinha onde entrar. Agora cada nova compra do cliente é uma linha
-- em lead_vendas_extras; a 1ª venda continua na linha do lead, sem mexer.
--
-- Regras combinadas com o Samuel:
--  * Só CRMs de serviço/mentoria (receita por pagamento). Imobiliário e Banker não.
--  * A nova venda NÃO conta no bônus do SDR. Entra no faturamento, na contagem de
--    vendas e na receita da EMPRESA (pelo mês em que o dinheiro caiu).
--  * Nada é apagado: venda removida fica só marcada em excluido_em.
create table public.lead_vendas_extras (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid references public.usuarios(id),
  lead_id uuid not null references public.leads(id),
  produto text not null,
  valor_venda numeric(14,2) not null check (valor_venda > 0),
  vendido_em timestamptz not null,
  criado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create index lead_vendas_extras_lead_idx on public.lead_vendas_extras (lead_id) where excluido_em is null;
create index lead_vendas_extras_org_data_idx on public.lead_vendas_extras (org_id, vendido_em) where excluido_em is null;

alter table public.lead_vendas_extras enable row level security;

create policy lead_vendas_extras_por_org on public.lead_vendas_extras for all
  using (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = lead_vendas_extras.lead_id)
    )
  )
  with check (
    org_id = (select private.current_org_id())
    and (
      (select not private.org_restringe_leads())
      or exists (select 1 from public.leads l where l.id = lead_vendas_extras.lead_id)
    )
  );

-- Pagamento de uma nova venda leva o id dela. Pagamento da 1ª venda continua com
-- venda_extra_id vazio.
alter table public.venda_recebimentos
  add column venda_extra_id uuid references public.lead_vendas_extras(id);

create index venda_recebimentos_extra_idx on public.venda_recebimentos (venda_extra_id)
  where venda_extra_id is not null;

-- leads.receita_venda continua sendo o total recebido da 1ª venda: pagamento de
-- nova venda não entra aqui (senão mexia no bônus e na tela da 1ª venda).
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
        where lead_id = v_lead and excluido_em is null and venda_extra_id is null
     )
   where id = v_lead and status = 'vendido';
  return null;
end;
$$;

-- Resumo do dia no WhatsApp do Samuel: vendas e faturamento do dia passam a
-- incluir as novas vendas de clientes (a receita já entra pelos pagamentos).
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
  v_vendas_extras int; v_fat_extras numeric;
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
  select count(*), coalesce(sum(e.valor_venda), 0) into v_vendas_extras, v_fat_extras
    from lead_vendas_extras e join leads l on l.id = e.lead_id
   where e.org_id = v_org and e.excluido_em is null and l.arquivado_em is null and l.status = 'vendido'
     and e.vendido_em >= v_ini and e.vendido_em < v_fim;
  v_vendas := v_vendas + v_vendas_extras;
  v_fat := v_fat + v_fat_extras;
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
