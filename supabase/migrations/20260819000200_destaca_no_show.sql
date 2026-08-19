-- "No-show" passa a ter o mesmo destaque visual de "Reunião marcada"
-- (cabeçalho sólido, cor cheia) — é um problema que precisa de atenção,
-- não só mais um nível numerado na lista.
update public.niveis set destacado = true where ordem = 5;
