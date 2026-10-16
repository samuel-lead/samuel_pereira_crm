-- Samuel pediu (16/10/26): um segundo lembrete, também só pra ele, a cada 3
-- dias corridos às 10h, com 10 pessoas que fizeram reunião com ele e NÃO
-- compraram — pra pegar indicação delas. A cada envio mostra as próximas 10
-- da fila (ordenada pela reunião mais recente) e dá a volta quando acaba, pra
-- não repetir sempre as mesmas. Mostra o e-mail da pessoa (ou o WhatsApp,
-- quando não tem e-mail).
alter table public.lembretes_pessoais_enviados
  add column posicao_fila int not null default 0;

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
  v_ultimo date;
  v_posicao int;
  v_total int;
  v_mostrar int;
  v_lista text;
  v_mensagem text;
begin
  select ultimo_envio_em, posicao_fila into v_ultimo, v_posicao
  from lembretes_pessoais_enviados
  where usuario_id = v_usuario and tipo = 'indicacoes_reuniao';

  if v_ultimo is not null and v_hoje - v_ultimo < 3 then
    return;
  end if;
  v_posicao := coalesce(v_posicao, 0);

  with fila as (
    select l.nome, l.email, l.telefone_e164,
           row_number() over (order by max(r.agendada_para) desc, l.id) - 1 as pos
    from leads l
    join reunioes r on r.lead_id = l.id and r.status = 'realizada'
    where l.org_id = v_org and l.arquivado_em is null and l.status <> 'vendido'
    group by l.id, l.nome, l.email, l.telefone_e164
  )
  select count(*) into v_total from fila;

  -- Ninguém fez reunião sem comprar — não manda nada.
  if v_total = 0 then
    return;
  end if;
  v_posicao := v_posicao % v_total;
  v_mostrar := least(10, v_total);

  with fila as (
    select l.nome, l.email, l.telefone_e164,
           row_number() over (order by max(r.agendada_para) desc, l.id) - 1 as pos
    from leads l
    join reunioes r on r.lead_id = l.id and r.status = 'realizada'
    where l.org_id = v_org and l.arquivado_em is null and l.status <> 'vendido'
    group by l.id, l.nome, l.email, l.telefone_e164
  ),
  escolhidos as (
    select *, ((pos - v_posicao) % v_total + v_total) % v_total as distancia
    from fila
  )
  select string_agg(
           '• ' || nome || ' — ' ||
           case
             when email is not null and email <> '' then email
             when telefone_e164 ~ '^55\d{11}$' then
               '(' || substr(telefone_e164, 3, 2) || ') ' || substr(telefone_e164, 5, 5) || '-' || substr(telefone_e164, 10)
             else coalesce(telefone_e164, 'sem contato')
           end,
           E'\n' order by distancia)
  into v_lista
  from escolhidos
  where distancia < v_mostrar;

  v_mensagem :=
    '🔔 *Hora de pegar indicação*' || E'\n\n' ||
    '🤝 *Fizeram reunião com você e ainda não compraram* (' || v_mostrar || ' de ' || v_total || '):' || E'\n' ||
    v_lista || E'\n\n' ||
    '🎯 Para quem você pegou indicação essa semana?';

  perform private.chamar_enviar_whatsapp(v_usuario, v_mensagem);

  insert into lembretes_pessoais_enviados (org_id, usuario_id, tipo, ultimo_envio_em, posicao_fila)
  values (v_org, v_usuario, 'indicacoes_reuniao', v_hoje, (v_posicao + v_mostrar) % v_total)
  on conflict (usuario_id, tipo) do update
    set ultimo_envio_em = excluded.ultimo_envio_em, posicao_fila = excluded.posicao_fila;
end;
$$;

revoke all on function public.lembrar_indicacoes_quem_fez_reuniao() from public, anon, authenticated;

-- 10h de Brasília = 13h UTC.
select cron.schedule('lembrete-indicacoes-quem-fez-reuniao', '0 13 * * *', $$select public.lembrar_indicacoes_quem_fez_reuniao()$$);
