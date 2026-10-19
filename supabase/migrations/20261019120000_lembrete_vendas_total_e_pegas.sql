-- Samuel pediu (19/10/26): o lembrete das vendas tem que deixar claro o TOTAL
-- de vendas do mês e quantas já tiveram indicação pega. Antes mostrava só as
-- que faltam ("já são 3 vendas") e parecia que ele tinha vendido menos.
-- Se todas já foram pegas, não manda nada (não há o que lembrar).
create or replace function public.lembrar_indicacoes_samuel()
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  if v_ultimo is not null and v_hoje - v_ultimo < 3 then
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

  -- Sem venda no mês, ou todas já pegas: não tem o que lembrar.
  if v_total = 0 or v_faltam = 0 then
    return;
  end if;

  v_mensagem :=
    '🔔 *Hora de pegar indicação*' || E'\n\n' ||
    'Samuel, neste mês você fez *' || v_total || case when v_total = 1 then ' venda' else ' vendas' end || '*:' || E'\n' ||
    '✅ *' || v_pegas || '* já ' || case when v_pegas = 1 then 'teve' else 'tiveram' end || ' indicação pega' || E'\n' ||
    '⏳ *' || v_faltam || '* ainda ' || case when v_faltam = 1 then 'falta' else 'faltam' end || E'\n\n' ||
    '👥 *Quem ainda falta:*' || E'\n' ||
    v_lista || E'\n\n' ||
    '🎯 Para quem você pegou indicação essa semana?';

  perform private.chamar_enviar_whatsapp(v_usuario, v_mensagem);

  insert into lembretes_pessoais_enviados (org_id, usuario_id, tipo, ultimo_envio_em)
  values (v_org, v_usuario, 'indicacoes', v_hoje)
  on conflict (usuario_id, tipo) do update set ultimo_envio_em = excluded.ultimo_envio_em;
end;
$$;
