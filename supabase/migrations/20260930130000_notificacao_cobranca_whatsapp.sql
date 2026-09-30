-- Samuel pediu aviso por WhatsApp sobre a cobrança das empresas clientes
-- (dia_vencimento/mensalidade_valor/ultimo_pagamento_em, criados na
-- migration anterior): avisar quando tá perto de vencer e quando atrasou.
-- Vai só pro(s) usuário(s) super_admin (é cobrança da PLATAFORMA, não do
-- cliente — o cliente nunca vê isso).
--
-- Dedupe própria (não dá pra reaproveitar push_notificacoes_enviadas:
-- lead_id lá é obrigatório, isso aqui não tem lead nenhum). Uma linha por
-- ciclo de cobrança (org + tipo + data do vencimento daquele ciclo) — só
-- avisa uma vez por vencimento, não fica repetindo toda hora.
create table public.cobranca_avisos_enviados (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  tipo text not null check (tipo in ('vencendo', 'atrasado')),
  chave text not null,
  enviado_em timestamptz not null default now(),
  unique (org_id, tipo, chave)
);

alter table public.cobranca_avisos_enviados enable row level security;

create policy cobranca_avisos_super_admin on public.cobranca_avisos_enviados
  for select using (private.eh_super_admin());

create or replace function public.notificar_cobrancas()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org record;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_vencimento_ciclo date;
  v_proximo_vencimento date;
  v_dias_ate_vencer int;
  v_pago_neste_ciclo boolean;
  v_destinatario record;
  v_linhas int;
begin
  for v_org in
    select id, nome, dia_vencimento, mensalidade_valor, ultimo_pagamento_em
    from orgs
    where dia_vencimento is not null
  loop
    -- Vencimento deste mês (ajusta pro último dia do mês em fevereiro
    -- etc. — make_date com dia maior que o mês tem não existe, por isso o
    -- least() com o fim do mês).
    v_vencimento_ciclo := least(
      make_date(extract(year from v_hoje)::int, extract(month from v_hoje)::int, 1) + (v_org.dia_vencimento - 1),
      (date_trunc('month', v_hoje) + interval '1 month - 1 day')::date
    );

    -- Se o vencimento deste mês ainda não chegou, o "próximo" é esse
    -- mesmo; se já passou, o próximo é mês que vem.
    if v_vencimento_ciclo >= v_hoje then
      v_proximo_vencimento := v_vencimento_ciclo;
    else
      v_proximo_vencimento := least(
        make_date(extract(year from v_hoje + interval '1 month')::int, extract(month from v_hoje + interval '1 month')::int, 1) + (v_org.dia_vencimento - 1),
        (date_trunc('month', v_hoje + interval '1 month') + interval '1 month - 1 day')::date
      );
    end if;

    v_dias_ate_vencer := v_proximo_vencimento - v_hoje;
    v_pago_neste_ciclo := v_org.ultimo_pagamento_em is not null
      and v_org.ultimo_pagamento_em::date >= v_proximo_vencimento - interval '1 month';

    -- Aviso 1: falta 3 dias pro vencimento (e ainda não tá pago).
    if v_dias_ate_vencer = 3 and not v_pago_neste_ciclo then
      insert into cobranca_avisos_enviados (org_id, tipo, chave)
      values (v_org.id, 'vencendo', v_proximo_vencimento::text)
      on conflict do nothing;

      get diagnostics v_linhas = row_count;

      if v_linhas > 0 then
        for v_destinatario in select id from usuarios where super_admin = true loop
          perform private.chamar_enviar_whatsapp(
            v_destinatario.id,
            'Cobrança chegando: ' || v_org.nome || ' vence em 3 dias (dia ' ||
              to_char(v_proximo_vencimento, 'DD/MM') || ')' ||
              case when v_org.mensalidade_valor is not null
                then ', R$ ' || to_char(v_org.mensalidade_valor, 'FM999999990.00')
                else ''
              end || '.'
          );
        end loop;
      end if;
    end if;

    -- Aviso 2: passou do vencimento deste mês e ainda não pagou.
    if v_vencimento_ciclo < v_hoje
       and (v_org.ultimo_pagamento_em is null or v_org.ultimo_pagamento_em::date < v_vencimento_ciclo)
    then
      insert into cobranca_avisos_enviados (org_id, tipo, chave)
      values (v_org.id, 'atrasado', v_vencimento_ciclo::text)
      on conflict do nothing;

      get diagnostics v_linhas = row_count;

      if v_linhas > 0 then
        for v_destinatario in select id from usuarios where super_admin = true loop
          perform private.chamar_enviar_whatsapp(
            v_destinatario.id,
            'Cobrança atrasada: ' || v_org.nome || ' não pagou a mensalidade que venceu dia ' ||
              to_char(v_vencimento_ciclo, 'DD/MM') ||
              case when v_org.mensalidade_valor is not null
                then ' (R$ ' || to_char(v_org.mensalidade_valor, 'FM999999990.00') || ')'
                else ''
              end || '.'
          );
        end loop;
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.notificar_cobrancas() from public, anon, authenticated;

-- Uma vez por dia de manhã (8h de Brasília = 11h UTC) — vencimento é por
-- dia, não precisa checar de 15 em 15 minutos como lead.
select cron.schedule(
  'notificar-cobrancas',
  '0 11 * * *',
  $$select public.notificar_cobrancas()$$
);
