-- Novo nível "Reagendamento": entra entre "No Show" (5) e "Follow após
-- reunião" (6) — o lead cai aqui quando tinha reunião marcada e avisou
-- ANTES que ia precisar remarcar (diferente de No Show, que é sumiço sem
-- aviso). Só existe vindo de "Reunião marcada", igual No Show.
--
-- Isso empurra todo mundo que vem depois uma casa pra frente:
--   6 Follow após reunião        -> 7
--   7 Oportunidades fim do mês   -> 8
--   8 Base                       -> 9
--
-- Afeta todas as orgs (o esquema de níveis é igual pra todo mundo — ver
-- 20260820010000_corrige_niveis_da_veend.sql pro mesmo padrão de migration
-- usado quando "Follow após reunião" foi inserido).

alter table public.niveis drop constraint niveis_ordem_check;
alter table public.niveis add constraint niveis_ordem_check check (ordem >= 0 and ordem <= 9);

-- Desloca de trás pra frente (9 antes de 8, 8 antes de 7) pra nunca colidir
-- com a unique (org_id, ordem) no meio do caminho.
update public.leads set nivel_ordem = 9 where nivel_ordem = 8;
update public.leads set nivel_ordem = 8 where nivel_ordem = 7;
update public.leads set nivel_ordem = 7 where nivel_ordem = 6;

update public.nivel_historico set de_ordem = 9 where de_ordem = 8;
update public.nivel_historico set de_ordem = 8 where de_ordem = 7;
update public.nivel_historico set de_ordem = 7 where de_ordem = 6;
update public.nivel_historico set para_ordem = 9 where para_ordem = 8;
update public.nivel_historico set para_ordem = 8 where para_ordem = 7;
update public.nivel_historico set para_ordem = 7 where para_ordem = 6;

update public.niveis set destino_ao_estourar = 9 where destino_ao_estourar = 8;
update public.niveis set ordem = 9 where ordem = 8;
update public.niveis set ordem = 8 where ordem = 7;
update public.niveis set ordem = 7 where ordem = 6;

insert into public.niveis (org_id, ordem, nome, definicao, prazo_dias, destino_ao_estourar, etiqueta_wpp, numerado, destacado)
select
  id,
  6,
  'Reagendamento',
  'A reunião estava marcada e o lead avisou antes que ia precisar remarcar (diferente de No Show, que é sumiço sem aviso)',
  null,
  null,
  'Reagendamento',
  true,
  false
from public.orgs;

-- mover_leads_prontos_para_contato também tinha os números antigos de Base
-- (8) e Oportunidades (7) fixos no meio da função — mesmo ajuste que já foi
-- feito em 20260818231500_adiciona_nivel_follow_pos_reuniao.sql da última
-- vez que um nível novo foi inserido no meio do funil.
create or replace function public.mover_leads_prontos_para_contato()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
begin
  for v_lead in
    select id, org_id, nivel_ordem
    from public.leads
    where proximo_follow_em is not null
      and proximo_follow_em <= now()
      and status = 'ativo'
      and arquivado_em is null
      and (
        nivel_ordem = 9
        or (nivel_ordem = 8 and oportunidade_futura = true)
      )
  loop
    insert into public.nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico)
    values (v_lead.org_id, v_lead.id, v_lead.nivel_ordem, 0, 'Chegou a data do próximo contato marcado', true);

    update public.leads
    set nivel_ordem = 0,
        oportunidade_futura = false,
        entrou_nivel_em = now(),
        proximo_follow_em = null
    where id = v_lead.id;
  end loop;
end;
$$;
