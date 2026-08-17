-- Adiciona o nível "No Show" (reunião marcada, lead não compareceu) entre
-- "Reunião marcada" e "Reunião feita, sem fechar". Funil passa de 6 pra 7 níveis.
--
-- Renumeração: 5 (Reunião feita, sem fechar) -> 6 ; 6 (Base) -> 7
-- Novo nível 5 = No Show.

alter table public.niveis drop constraint niveis_ordem_check;

-- desloca leads existentes nos níveis antigos 5 e 6 (maior primeiro, evita colisão)
update public.leads set nivel_ordem = 7 where nivel_ordem = 6;
update public.leads set nivel_ordem = 6 where nivel_ordem = 5;

-- desloca o catálogo de níveis (maior primeiro, evita colisão com unique(org_id, ordem))
update public.niveis set ordem = 7 where ordem = 6;
update public.niveis set ordem = 6 where ordem = 5;

-- nível 1 apontava pro antigo "Base" (ordem 6); agora é ordem 7
update public.niveis set destino_ao_estourar = 7 where destino_ao_estourar = 6;

-- insere o novo nível 5, um por organização já existente
insert into public.niveis (org_id, ordem, nome, definicao, prazo_dias, destino_ao_estourar, etiqueta_wpp)
select id, 5, 'No Show', 'A reunião estava marcada e o lead não compareceu', null, null, 'No Show'
from public.orgs;

alter table public.niveis add constraint niveis_ordem_check check (ordem between 1 and 7);
