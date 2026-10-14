-- Samuel (15/10/26): quando o SDR folga na sexta por motivo pessoal e
-- trabalha o sábado pra repor, o sábado dele NÃO conta como "fim de semana"
-- no bônus (vale o valor de dia de semana). Lista de datas por pessoa.
alter table public.usuarios
  add column dias_reposicao date[] not null default '{}';

-- Julia: sábado 03/10 (já trabalhado) e sábado 17/10 (folga na sexta 16/10).
update public.usuarios
set dias_reposicao = array['2026-10-03'::date, '2026-10-17'::date]
where id = '4bd8a5a0-bae7-4cd7-8911-c3434596876c';
