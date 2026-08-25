export const PAGINAS_CONFIGURAVEIS = [
  { chave: "funil", label: "Pré-vendas" },
  { chave: "reunioes", label: "Vendas" },
  { chave: "lista", label: "Lista de leads" },
  { chave: "atividades", label: "Atividades" },
  { chave: "metricas", label: "Métricas" },
  // Só aparecem de verdade pra quem é do público imobiliário — pra
  // mentoria/serviço a página redireciona, mesmo que a permissão esteja
  // marcada (ver middleware.ts).
  { chave: "imoveis", label: "Imóveis" },
  { chave: "cartas_contempladas", label: "Cartas contempladas" },
] as const;
