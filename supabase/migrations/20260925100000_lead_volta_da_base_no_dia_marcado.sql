-- Samuel pediu: todo lead que vai pra Base passa a ter um "dia do próximo
-- contato" obrigatório; no dia marcado, às 7h (horário de Brasília), o lead
-- sai da Base sozinho e volta pra "Novos Leads", mantendo o mesmo
-- responsável (se não tinha, continua sem).
--
-- Coluna nova de propósito (em vez de reaproveitar proximo_follow_em): 18
-- leads que já estão na Base têm proximo_follow_em vencido, e o Samuel
-- disse que quem já está na Base fica como está — reaproveitar essa coluna
-- devolveria todos eles de uma vez. Só entra no robô quem tiver esta data.
alter table public.leads
  add column if not exists voltar_da_base_em timestamptz;

create or replace function public.devolver_leads_da_base()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
begin
  for v_lead in
    select id, org_id
    from public.leads
    where nivel_ordem = 9
      and voltar_da_base_em is not null
      and voltar_da_base_em <= now()
      and status = 'ativo'
      and arquivado_em is null
  loop
    insert into public.nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico)
    values (v_lead.org_id, v_lead.id, 9, 0, 'Voltou da Base — chegou o dia do próximo contato', true);

    -- Mesmo responsável de antes (não mexe em responsavel_id). Marca como
    -- "reativado da Base" pra o card mostrar de onde veio, igual ao
    -- Reativar manual.
    update public.leads
    set nivel_ordem = 0,
        entrou_nivel_em = now(),
        voltar_da_base_em = null,
        motivo_base = null,
        motivo_base_detalhe = null,
        oportunidade_futura = false,
        reativado_da_base_em = now(),
        reativado_origem = 'base'
    where id = v_lead.id;
  end loop;
end;
$$;

revoke all on function public.devolver_leads_da_base() from public, anon, authenticated;

-- De 10 em 10 minutos, todo dia (o horário fica no próprio lead: 07:00 do
-- dia escolhido, Brasília = 10:00 UTC).
select cron.schedule(
  'devolver-leads-da-base',
  '*/10 * * * *',
  $$select public.devolver_leads_da_base()$$
);
