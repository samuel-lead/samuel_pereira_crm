-- Samuel (20/10/26): no resumo do dia do comercial, quando houver venda
-- aparecem também faturamento, receita e ticket médio (faturamento ÷ vendas).
-- Sem venda no dia, essas linhas não aparecem.
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
  select count(*), coalesce(sum(valor_venda), 0), coalesce(sum(receita_venda), 0) into v_vendas, v_fat, v_rec from leads
   where org_id = v_org and arquivado_em is null and status = 'vendido' and vendido_em >= v_ini and vendido_em < v_fim;

  v_comp := case when v_real + v_ns > 0 then round(100.0 * v_real / (v_real + v_ns)) || '%' else '—' end;

  if v_vendas > 0 then
    v_linhas_venda :=
      E'\n' || '💵 Faturamento: R$ ' || translate(to_char(v_fat, fmt_moeda), ',.', '.,') ||
      E'\n' || '🧾 Receita: R$ ' || translate(to_char(v_rec, fmt_moeda), ',.', '.,') ||
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
