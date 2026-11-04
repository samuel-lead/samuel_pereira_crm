-- Samuel (04/11/26): os dois lembretes de indicação (vendas do mês e quem fez
-- reunião e não comprou) passam a ir TODA SEGUNDA, QUARTA E SEXTA, às 10h de
-- Brasília — antes era a cada 3 dias corridos. Mesmo conteúdo de antes; só
-- muda quando manda. Nunca duas vezes no mesmo dia. O cron também passa a
-- rodar só nesses dias (13h UTC = 10h Brasília).

create or replace function public.lembrar_indicacoes_samuel()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_usuario uuid := '31f5b5d4-b3f0-4de3-82c1-2473800613bc';
  v_org uuid := 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inicio_mes timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_ultimo date;
  v_total int;
  v_pegas int;
  v_faltam int;
  v_lista text;
  v_mensagem text;
begin
  select ultimo_envio_em into v_ultimo
  from lembretes_pessoais_enviados
  where usuario_id = v_usuario and tipo = 'indicacoes';

  -- Só segunda (1), quarta (3) e sexta (5); e nunca duas vezes no mesmo dia.
  if extract(isodow from v_hoje) not in (1, 3, 5) or v_ultimo = v_hoje then
    return;
  end if;

  select count(*),
         count(*) filter (where indicacao_pega_em is not null),
         string_agg(
           '• ' || nome || coalesce(E'\n   ↳ ' || private.origem_para_card(origem, quem_indicou), ''),
           E'\n' order by vendido_em
         ) filter (where indicacao_pega_em is null)
  into v_total, v_pegas, v_lista
  from leads
  where org_id = v_org
    and status = 'vendido'
    and arquivado_em is null
    and vendido_em >= v_inicio_mes;

  v_faltam := v_total - v_pegas;

  if v_total = 0 or v_faltam = 0 then
    return;
  end if;

  v_mensagem :=
    '🔔 *Hora de pegar indicação*' || E'\n\n' ||
    'Samuel, neste mês você fez *' || v_total || case when v_total = 1 then ' venda' else ' vendas' end || '*:' || E'\n' ||
    '✅ *' || v_pegas || '* já ' || case when v_pegas = 1 then 'teve' else 'tiveram' end || ' indicação pega' || E'\n' ||
    '⏳ *' || v_faltam || '* ainda ' || case when v_faltam = 1 then 'falta' else 'faltam' end || E'\n\n' ||
    '👥 *Quem ainda falta:*' || E'\n' ||
    v_lista;

  perform private.chamar_enviar_whatsapp(v_usuario, v_mensagem);

  insert into lembretes_pessoais_enviados (org_id, usuario_id, tipo, ultimo_envio_em)
  values (v_org, v_usuario, 'indicacoes', v_hoje)
  on conflict (usuario_id, tipo) do update set ultimo_envio_em = excluded.ultimo_envio_em;
end;
$function$;

create or replace function public.lembrar_indicacoes_quem_fez_reuniao()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_usuario uuid := '31f5b5d4-b3f0-4de3-82c1-2473800613bc';
  v_org uuid := 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inicio_mes timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_ultimo date;
  v_total int;
  v_lista text;
  v_mensagem text;
begin
  select ultimo_envio_em into v_ultimo
  from lembretes_pessoais_enviados
  where usuario_id = v_usuario and tipo = 'indicacoes_reuniao';

  -- Só segunda (1), quarta (3) e sexta (5); e nunca duas vezes no mesmo dia.
  if extract(isodow from v_hoje) not in (1, 3, 5) or v_ultimo = v_hoje then
    return;
  end if;

  with fila as (
    select l.nome, l.telefone_e164, l.origem, l.quem_indicou,
           row_number() over (order by max(r.agendada_para) desc, l.id) as pos
    from leads l
    join reunioes r on r.lead_id = l.id and r.status = 'realizada'
      and r.agendada_para >= v_inicio_mes
    where l.org_id = v_org and l.arquivado_em is null and l.status <> 'vendido'
      and l.indicacao_pega_em is null
    group by l.id, l.nome, l.telefone_e164, l.origem, l.quem_indicou
  )
  select count(*),
         string_agg(
           '• ' || nome || ' — ' ||
           case
             when telefone_e164 ~ '^55\d{11}$' then
               '(' || substr(telefone_e164, 3, 2) || ') ' || substr(telefone_e164, 5, 5) || '-' || substr(telefone_e164, 10)
             else coalesce(telefone_e164, 'sem WhatsApp cadastrado')
           end || coalesce(E'\n   ↳ ' || private.origem_para_card(origem, quem_indicou), ''),
           E'\n' order by pos)
  into v_total, v_lista
  from fila;

  if v_total = 0 then
    return;
  end if;

  v_mensagem :=
    '🔔 *Hora de pegar indicação*' || E'\n\n' ||
    '🤝 *Fizeram reunião com você neste mês e ainda não compraram* (' || v_total || case when v_total = 1 then ' pessoa' else ' pessoas' end || '):' || E'\n' ||
    v_lista;

  perform private.chamar_enviar_whatsapp(v_usuario, v_mensagem);

  insert into lembretes_pessoais_enviados (org_id, usuario_id, tipo, ultimo_envio_em)
  values (v_org, v_usuario, 'indicacoes_reuniao', v_hoje)
  on conflict (usuario_id, tipo) do update set ultimo_envio_em = excluded.ultimo_envio_em;
end;
$function$;

-- Os dois agendamentos passam a rodar só segunda, quarta e sexta, 13h UTC (10h Brasília).
select cron.alter_job((select jobid from cron.job where jobname = 'lembrete-indicacoes-samuel'), schedule := '0 13 * * 1,3,5');
select cron.alter_job((select jobid from cron.job where jobname = 'lembrete-indicacoes-quem-fez-reuniao'), schedule := '0 13 * * 1,3,5');
