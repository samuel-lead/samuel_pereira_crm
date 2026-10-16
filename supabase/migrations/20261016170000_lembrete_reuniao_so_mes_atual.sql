-- Samuel pediu (16/10/26): no lembrete de quem fez reunião e não comprou, só
-- entram as reuniões realizadas NO MÊS ATUAL (Brasília). Na virada do mês a
-- lista recomeça; se ninguém fez reunião no mês, não manda nada.
create or replace function public.lembrar_indicacoes_quem_fez_reuniao()
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
  v_lista text;
  v_mensagem text;
begin
  select ultimo_envio_em into v_ultimo
  from lembretes_pessoais_enviados
  where usuario_id = v_usuario and tipo = 'indicacoes_reuniao';

  if v_ultimo is not null and v_hoje - v_ultimo < 3 then
    return;
  end if;

  with fila as (
    select l.nome, l.telefone_e164,
           row_number() over (order by max(r.agendada_para) desc, l.id) as pos
    from leads l
    join reunioes r on r.lead_id = l.id and r.status = 'realizada'
      and r.agendada_para >= v_inicio_mes
    where l.org_id = v_org and l.arquivado_em is null and l.status <> 'vendido'
    group by l.id, l.nome, l.telefone_e164
  )
  select count(*),
         string_agg(
           '• ' || nome || ' — ' ||
           case
             when telefone_e164 ~ '^55\d{11}$' then
               '(' || substr(telefone_e164, 3, 2) || ') ' || substr(telefone_e164, 5, 5) || '-' || substr(telefone_e164, 10)
             else coalesce(telefone_e164, 'sem WhatsApp cadastrado')
           end,
           E'\n' order by pos)
  into v_total, v_lista
  from fila;

  if v_total = 0 then
    return;
  end if;

  v_mensagem :=
    '🔔 *Hora de pegar indicação*' || E'\n\n' ||
    '🤝 *Fizeram reunião com você neste mês e ainda não compraram* (' || v_total || case when v_total = 1 then ' pessoa' else ' pessoas' end || '):' || E'\n' ||
    v_lista || E'\n\n' ||
    '🎯 Para quem você pegou indicação essa semana?';

  perform private.chamar_enviar_whatsapp(v_usuario, v_mensagem);

  insert into lembretes_pessoais_enviados (org_id, usuario_id, tipo, ultimo_envio_em)
  values (v_org, v_usuario, 'indicacoes_reuniao', v_hoje)
  on conflict (usuario_id, tipo) do update set ultimo_envio_em = excluded.ultimo_envio_em;
end;
$$;
