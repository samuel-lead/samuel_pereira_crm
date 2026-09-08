-- Samuel pediu pra mostrar quantas ligações foram atendidas e quantas não
-- foram atendidas na aba Pré-vendas. Até aqui isso só existia como texto
-- solto em interacoes.conteudo ("Ligação atendida"/"Ligação não atendida"),
-- frágil pra somar em métrica — vira uma coluna própria.
alter table public.interacoes
  add column if not exists atendida boolean;

update public.interacoes
set atendida = true
where tipo = 'ligacao' and conteudo = 'Ligação atendida' and atendida is null;

update public.interacoes
set atendida = false
where tipo = 'ligacao' and conteudo = 'Ligação não atendida' and atendida is null;
