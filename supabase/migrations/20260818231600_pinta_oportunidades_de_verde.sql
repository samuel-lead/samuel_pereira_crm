-- "Oportunidades para o fim do mês" (nível 7) passa a ter o mesmo destaque
-- visual das outras colunas do quadro Vendas (cabeçalho sólido, como
-- "Reunião marcada" e "Oportunidades futuras") — a cor em si vem do
-- código (CORES_NIVEL), aqui só liga o "destacado".
update public.niveis set destacado = true where ordem = 7;
