-- Samuel pediu (20/10/26): o resumo do dia que ele recebe no WhatsApp passa a
-- ser do COMERCIAL INTEIRO (ele + Julia), com ligações e todas as métricas do
-- dia: total do time e o detalhe de cada pessoa. Sai no mesmo horário de
-- sempre (18h, seg–sex). O resumo pessoal antigo continua igual pros demais
-- usuários; só o Samuel deixa de recebê-lo (senão chegariam dois).
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
  v_pessoa record;
  v_blocos text := '';
  v_t_leads int; v_t_lig int; v_t_marc int; v_t_reag int; v_t_real int; v_t_ns int;
  v_t_vendas int; v_t_fat numeric; v_t_rec numeric;
  v_leads int; v_lig int; v_marc int; v_reag int; v_real int; v_ns int; v_vendas int; v_fat numeric; v_rec numeric;
  v_comp text; v_agend text;
  v_msg text;
  fmt_moeda text := 'FM999,999,990.00';
begin
  v_dia := (array['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'])
           [extract(dow from (now() at time zone 'America/Sao_Paulo'))::int + 1];

  -- TOTAIS DO TIME (contados direto na empresa, sem somar pessoa por pessoa,
  -- pra uma call feita por duas pessoas não contar em dobro).
  select count(*) into v_t_leads from leads
   where org_id = v_org and arquivado_em is null and declarado_em >= v_ini and declarado_em < v_fim
     and (nivel_ordem <> 9 or motivo_base is distinct from 'farming');
  select count(*) into v_t_lig from interacoes i join leads l on l.id = i.lead_id
   where i.org_id = v_org and i.tipo = 'ligacao' and i.excluido_em is null and l.arquivado_em is null
     and i.ocorreu_em >= v_ini and i.ocorreu_em < v_fim;
  select count(*) into v_t_marc from reunioes r join leads l on l.id = r.lead_id
   where r.org_id = v_org and l.arquivado_em is null and r.reagendada = false and r.marcada_em >= v_ini and r.marcada_em < v_fim;
  select count(*) into v_t_reag from reunioes r join leads l on l.id = r.lead_id
   where r.org_id = v_org and l.arquivado_em is null and r.reagendada = true and r.marcada_em >= v_ini and r.marcada_em < v_fim;
  select count(*) into v_t_real from reunioes r join leads l on l.id = r.lead_id
   where r.org_id = v_org and l.arquivado_em is null and r.status = 'realizada' and r.agendada_para >= v_ini and r.agendada_para < v_fim;
  select count(*) into v_t_ns from reunioes r join leads l on l.id = r.lead_id
   where r.org_id = v_org and l.arquivado_em is null and r.status = 'nao_compareceu' and r.agendada_para >= v_ini and r.agendada_para < v_fim;
  select count(*), coalesce(sum(valor_venda), 0), coalesce(sum(receita_venda), 0) into v_t_vendas, v_t_fat, v_t_rec from leads
   where org_id = v_org and arquivado_em is null and status = 'vendido' and vendido_em >= v_ini and vendido_em < v_fim;

  v_comp := case when v_t_real + v_t_ns > 0 then round(100.0 * v_t_real / (v_t_real + v_t_ns)) || '%' else '—' end;
  v_agend := case when v_t_leads > 0 then round(100.0 * v_t_marc / v_t_leads) || '%' else '—' end;

  -- DETALHE DE CADA PESSOA DO COMERCIAL.
  for v_pessoa in
    select u.id, u.nome from usuarios u where u.org_id = v_org order by (u.id = v_samuel) desc, u.nome
  loop
    select count(*) into v_leads from leads
     where org_id = v_org and responsavel_id = v_pessoa.id and arquivado_em is null
       and declarado_em >= v_ini and declarado_em < v_fim and (nivel_ordem <> 9 or motivo_base is distinct from 'farming');
    select count(*) into v_lig from interacoes i join leads l on l.id = i.lead_id
     where i.org_id = v_org and i.usuario_id = v_pessoa.id and i.tipo = 'ligacao' and i.excluido_em is null
       and l.arquivado_em is null and i.ocorreu_em >= v_ini and i.ocorreu_em < v_fim;
    select count(*) into v_marc from reunioes r join leads l on l.id = r.lead_id
     where r.org_id = v_org and r.usuario_id = v_pessoa.id and l.arquivado_em is null and r.reagendada = false
       and r.marcada_em >= v_ini and r.marcada_em < v_fim;
    select count(*) into v_reag from reunioes r join leads l on l.id = r.lead_id
     where r.org_id = v_org and r.usuario_id = v_pessoa.id and l.arquivado_em is null and r.reagendada = true
       and r.marcada_em >= v_ini and r.marcada_em < v_fim;
    select count(*) into v_real from reunioes r join leads l on l.id = r.lead_id
     where r.org_id = v_org and (r.usuario_id = v_pessoa.id or r.closer_id = v_pessoa.id) and l.arquivado_em is null
       and r.status = 'realizada' and r.agendada_para >= v_ini and r.agendada_para < v_fim;
    select count(*) into v_ns from reunioes r join leads l on l.id = r.lead_id
     where r.org_id = v_org and (r.usuario_id = v_pessoa.id or r.closer_id = v_pessoa.id) and l.arquivado_em is null
       and r.status = 'nao_compareceu' and r.agendada_para >= v_ini and r.agendada_para < v_fim;
    select count(*), coalesce(sum(valor_venda), 0), coalesce(sum(receita_venda), 0) into v_vendas, v_fat, v_rec from leads
     where org_id = v_org and responsavel_id = v_pessoa.id and arquivado_em is null and status = 'vendido'
       and vendido_em >= v_ini and vendido_em < v_fim;

    v_blocos := v_blocos || E'\n\n' ||
      '👤 *' || upper(v_pessoa.nome) || '*' || E'\n' ||
      '🆕 Leads novos: ' || v_leads || E'\n' ||
      '📞 Ligações: ' || v_lig || E'\n' ||
      '📅 Calls marcadas: ' || v_marc || ' (reagendadas: ' || v_reag || ')' || E'\n' ||
      '✅ Calls realizadas: ' || v_real || E'\n' ||
      '🚫 No-show: ' || v_ns || E'\n' ||
      '💰 Vendas: ' || v_vendas ||
        case when v_vendas > 0 then ' — R$ ' || translate(to_char(v_fat, fmt_moeda), ',.', '.,') || ' (receita R$ ' || translate(to_char(v_rec, fmt_moeda), ',.', '.,') || ')' else '' end;
  end loop;

  v_msg :=
    '📊 *RESUMO DO DIA — COMERCIAL*' || E'\n' ||
    '🗓️ ' || v_dia || ', ' || v_data || E'\n\n' ||
    '👥 *TIME TODO*' || E'\n' ||
    '🆕 Leads novos: ' || v_t_leads || E'\n' ||
    '📞 Ligações: ' || v_t_lig || E'\n' ||
    '📅 Calls marcadas: ' || v_t_marc || ' (reagendadas: ' || v_t_reag || ')' || E'\n' ||
    '✅ Calls realizadas: ' || v_t_real || E'\n' ||
    '🚫 No-show: ' || v_t_ns || E'\n' ||
    '📈 Comparecimento: ' || v_comp || E'\n' ||
    '🎯 Agendamento (marcadas ÷ leads novos): ' || v_agend || E'\n' ||
    '💰 Vendas: ' || v_t_vendas ||
      case when v_t_vendas > 0 then ' — R$ ' || translate(to_char(v_t_fat, fmt_moeda), ',.', '.,') || ' (receita R$ ' || translate(to_char(v_t_rec, fmt_moeda), ',.', '.,') || ')' else '' end ||
    v_blocos;

  perform private.chamar_enviar_whatsapp(v_samuel, v_msg);
end;
$$;

revoke all on function public.enviar_resumo_comercial_samuel() from public, anon, authenticated;

-- Resumo pessoal antigo: o Samuel sai da lista (agora recebe o do time).
create or replace function public.enviar_relatorio_diario()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_usuario record;
  v_leads_novos int;
  v_reunioes_marcadas int;
  v_reunioes_realizadas int;
  v_vendas int;
  v_rotulo_singular text;
  v_rotulo_plural text;
  v_linha_leads text;
  v_linha_marcadas text;
  v_linha_realizadas text;
  v_linha_vendas text;
begin
  for v_usuario in
    select u.id, u.nome, coalesce(o.publico, 'mentoria') as publico
    from usuarios u
    left join orgs o on o.id = u.org_id
    where u.wpp_comercial_e164 is not null
      and u.id <> '31f5b5d4-b3f0-4de3-82c1-2473800613bc'
  loop
    select count(*) into v_leads_novos
    from leads
    where responsavel_id = v_usuario.id
      and declarado_em::date = current_date;

    select count(*) into v_reunioes_marcadas
    from reunioes
    where (usuario_id = v_usuario.id or closer_id = v_usuario.id)
      and marcada_em::date = current_date;

    select count(*) into v_reunioes_realizadas
    from reunioes
    where (usuario_id = v_usuario.id or closer_id = v_usuario.id)
      and status = 'realizada'
      and agendada_para::date = current_date;

    select count(*) into v_vendas
    from leads
    where responsavel_id = v_usuario.id
      and status = 'vendido'
      and vendido_em::date = current_date;

    if v_leads_novos = 0 and v_reunioes_marcadas = 0 and v_reunioes_realizadas = 0 and v_vendas = 0 then
      continue;
    end if;

    v_rotulo_singular := case when v_usuario.publico = 'imobiliario' then 'visita' else 'reunião' end;
    v_rotulo_plural := case when v_usuario.publico = 'imobiliario' then 'visitas' else 'reuniões' end;

    v_linha_leads := case
      when v_leads_novos = 1 then '1 lead novo'
      else v_leads_novos || ' leads novos'
    end;

    v_linha_marcadas := case
      when v_reunioes_marcadas = 1 then '1 ' || v_rotulo_singular || ' marcada'
      else v_reunioes_marcadas || ' ' || v_rotulo_plural || ' marcadas'
    end;

    v_linha_realizadas := case
      when v_reunioes_realizadas = 1 then '1 ' || v_rotulo_singular || ' realizada'
      else v_reunioes_realizadas || ' ' || v_rotulo_plural || ' realizadas'
    end;

    v_linha_vendas := case
      when v_vendas = 1 then '1 venda'
      else v_vendas || ' vendas'
    end;

    perform private.chamar_enviar_whatsapp(
      v_usuario.id,
      '📊 *RESUMO DO DIA*' || E'\n\n' ||
      '🆕 ' || v_linha_leads || E'\n' ||
      '📅 ' || v_linha_marcadas || E'\n' ||
      '✅ ' || v_linha_realizadas || E'\n' ||
      '💰 ' || v_linha_vendas
    );
  end loop;
end;
$function$;

-- O resumo do time sai no mesmo horário do antigo (18h de Brasília, seg–sex).
select cron.schedule('resumo-comercial-samuel', '0 21 * * 1-5', $$select public.enviar_resumo_comercial_samuel()$$);
