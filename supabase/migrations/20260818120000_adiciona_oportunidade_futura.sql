-- Dentro de "Oportunidades para o fim do mês" (nível 6), existe um grupo
-- de leads que já fizeram a reunião, são ICP qualificado, mas avisaram
-- que só fecham depois — não é um nível novo (não muda nivel_ordem nem
-- entra separado nos relatórios), é uma divisão visual dentro do mesmo
-- nível, pra não perder de vista quem vale acompanhar mais pra frente.

alter table public.leads
  add column oportunidade_futura boolean not null default false;
