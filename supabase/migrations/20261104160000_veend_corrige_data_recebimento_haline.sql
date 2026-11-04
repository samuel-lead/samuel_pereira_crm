-- Veend (CRM do Danilo), Samuel 04/11/26: o recebimento de R$ 800 da venda da
-- Haline (fechada em 30/10) foi lançado só em 03/11 e entrou na receita de
-- novembro. O dinheiro é de outubro: a data do recebimento volta pra 30/10
-- (mesmo dia e horário da venda). Só muda a data de um recebimento; o valor
-- e o lead continuam iguais. Pra desfazer: recebido_em = '2026-11-03 09:00-03'.
update public.venda_recebimentos
set recebido_em = '2026-10-30 09:00:00-03'
where id = 'e4ddbcac-a0ff-4583-9947-d6007080d529'
  and org_id = '1cc080fd-055d-4f8b-950c-7537cf4f0064'
  and valor = 800
  and recebido_em = '2026-11-03 09:00:00-03';
