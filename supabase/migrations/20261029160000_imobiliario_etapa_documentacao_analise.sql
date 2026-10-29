-- Imobiliário: nova etapa "Documentação/Análise" logo depois de "Em
-- qualificação" (Samuel, 29/10/26).
--
-- O número da etapa é 10 (não dá pra inserir no meio sem renumerar o funil
-- inteiro — o código usa 4 = visita marcada, 9 = Base etc.). A posição na
-- tela (entre 2 e 3) é decidida no painel, em lib/niveis.ts.
-- Só empresas do público imobiliário ganham a etapa. Sem número visível
-- ("numerado = false"), igual a "Visitas marcadas", pra não mudar o
-- "Nível N" de nenhuma etapa que já existe.

alter table public.niveis drop constraint niveis_ordem_check;
alter table public.niveis add constraint niveis_ordem_check check (ordem >= 0 and ordem <= 10);

insert into public.niveis (org_id, ordem, nome, definicao, prazo_dias, destino_ao_estourar, etiqueta_wpp, numerado, destacado)
select
  o.id,
  10,
  'Documentação/Análise',
  'Lead qualificado; documentos e análise de crédito/perfil em andamento antes de seguir pra visita',
  null,
  null,
  'Documentação/Análise',
  false,
  false
from public.orgs o
where o.publico = 'imobiliario'
  and not exists (select 1 from public.niveis n where n.org_id = o.id and n.ordem = 10);
