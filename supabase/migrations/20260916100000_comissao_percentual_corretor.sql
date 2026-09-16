-- Samuel pediu: no CRM imobiliário, "receita" não é o preço do imóvel
-- (isso é VGV) — é a comissão que o corretor embolsa. Cada corretor
-- configura a própria % no perfil (numeros diferentes por pessoa), e o
-- CRM calcula a comissão sozinho na hora de marcar uma venda (valor da
-- venda × essa %), em vez de pedir pra digitar a receita à mão.
alter table public.usuarios
  add column if not exists comissao_percentual numeric(5, 2);
