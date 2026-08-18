-- E-mail do lead — não é pedido no cadastro rápido (só nome, telefone,
-- origem), é um detalhe preenchido depois, editando o lead. Importante
-- pra quando integrar com formulário de anúncio do Meta/Google no futuro,
-- que quase sempre manda e-mail junto.

alter table public.leads
  add column email text;
