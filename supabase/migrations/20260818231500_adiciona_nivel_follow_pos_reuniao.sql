-- Adiciona o nível "Follow após reunião" entre "Reunião marcada" (4) e
-- "Oportunidades para o fim do mês" — pro caso em que a reunião já
-- aconteceu, mas ainda não dá pra dizer se vira oportunidade ou não.
-- Funil passa de 8 pra 9 estágios (0 a 8).
--
-- Renumeração: 6 (Oportunidades para o fim do mês) -> 7 ; 7 (Base) -> 8.
-- Novo nível 6 = Follow após reunião.

alter table public.niveis drop constraint niveis_ordem_check;

-- desloca leads existentes nos níveis antigos 6 e 7 (maior primeiro, evita colisão)
update public.leads set nivel_ordem = 8 where nivel_ordem = 7;
update public.leads set nivel_ordem = 7 where nivel_ordem = 6;

-- desloca o catálogo de níveis (maior primeiro, evita colisão com unique(org_id, ordem))
update public.niveis set ordem = 8 where ordem = 7;
update public.niveis set ordem = 7 where ordem = 6;

-- nível 1 apontava pro antigo "Base" (ordem 7); agora é ordem 8
update public.niveis set destino_ao_estourar = 8 where destino_ao_estourar = 7;

-- insere o novo nível 6, um por organização já existente
insert into public.niveis (org_id, ordem, nome, definicao, prazo_dias, destino_ao_estourar, etiqueta_wpp, numerado, destacado)
select id, 6, 'Follow após reunião', 'A reunião aconteceu, mas ainda não deu pra saber se vira oportunidade ou não — precisa de retorno', null, null, 'Follow após reunião', false, true
from public.orgs;

alter table public.niveis add constraint niveis_ordem_check check (ordem between 0 and 8);

-- ajusta o retorno automático pro funil (Base e Oportunidades futuras)
-- pros novos números: Base agora é 8, Oportunidades agora é 7.
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
        nivel_ordem = 8
        or (nivel_ordem = 7 and oportunidade_futura = true)
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
