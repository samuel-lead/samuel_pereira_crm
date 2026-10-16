-- Samuel pediu (16/10/26): um lembrete SÓ PRA ELE, no WhatsApp cadastrado no
-- CRM, a cada 3 dias corridos às 10h (Brasília), pra pedir indicação a quem
-- já comprou dele no mês. A mensagem lista as vendas do mês da empresa dele
-- e muda sozinha conforme entram vendas novas.
--
-- O cron roda todo dia às 10h e a função decide se já passaram 3 dias desde
-- o último envio — é mais certo que "*/3" no dia do mês, que reinicia a
-- contagem na virada do mês e deixa de ser "a cada 3 dias".
create table public.lembretes_pessoais_enviados (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  tipo text not null,
  ultimo_envio_em date not null,
  unique (usuario_id, tipo)
);

alter table public.lembretes_pessoais_enviados enable row level security;

create policy lembretes_pessoais_do_proprio_usuario on public.lembretes_pessoais_enviados
  for select using (usuario_id = auth.uid());

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
  v_vendas int;
  v_lista text;
  v_mensagem text;
begin
  select ultimo_envio_em into v_ultimo
  from lembretes_pessoais_enviados
  where usuario_id = v_usuario and tipo = 'indicacoes';

  if v_ultimo is not null and v_hoje - v_ultimo < 3 then
    return;
  end if;

  select count(*), string_agg('• ' || nome, E'\n' order by vendido_em)
  into v_vendas, v_lista
  from leads
  where org_id = v_org
    and status = 'vendido'
    and arquivado_em is null
    and vendido_em >= v_inicio_mes;

  -- Sem venda no mês não tem de quem pedir indicação — não manda nada.
  if v_vendas = 0 then
    return;
  end if;

  v_mensagem :=
    '🔔 *Hora de pedir indicação*' || E'\n\n' ||
    'Samuel, neste mês já ' || case when v_vendas = 1 then 'é *1 venda*' else 'são *' || v_vendas || ' vendas*' end || '.' || E'\n\n' ||
    '👥 *Quem já comprou de você:*' || E'\n' ||
    v_lista || E'\n\n' ||
    '🎯 Para quem você pediu indicação essa semana?';

  perform private.chamar_enviar_whatsapp(v_usuario, v_mensagem);

  insert into lembretes_pessoais_enviados (org_id, usuario_id, tipo, ultimo_envio_em)
  values (v_org, v_usuario, 'indicacoes', v_hoje)
  on conflict (usuario_id, tipo) do update set ultimo_envio_em = excluded.ultimo_envio_em;
end;
$$;

revoke all on function public.lembrar_indicacoes_samuel() from public, anon, authenticated;

-- 10h de Brasília = 13h UTC.
select cron.schedule('lembrete-indicacoes-samuel', '0 13 * * *', $$select public.lembrar_indicacoes_samuel()$$);
