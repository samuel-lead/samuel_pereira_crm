export const PAGINAS_CONFIGURAVEIS = [
  { chave: "funil", label: "Pré-vendas" },
  { chave: "reunioes", label: "Vendas" },
  { chave: "lista", label: "Lista de leads" },
  { chave: "atividades", label: "Atividades" },
  { chave: "metricas", label: "Métricas" },
  // Exclusivas do público imobiliário — ver paginasParaPublico() abaixo,
  // que já tira essas duas da lista pra quem não é imobiliário.
  { chave: "imoveis", label: "Imóveis" },
  { chave: "cartas_contempladas", label: "Cartas contempladas" },
] as const;

const PAGINAS_SO_IMOBILIARIO = new Set(["imoveis", "cartas_contempladas"]);

// Filtra a lista de páginas configuráveis pro tipo de empresa — quem não é
// imobiliário nem deveria ver "Imóveis"/"Cartas contempladas" na hora de
// montar o acesso de um usuário, senão parece opção de outro sistema.
export function paginasParaPublico(publicoOrg: string) {
  if (publicoOrg === "imobiliario") return PAGINAS_CONFIGURAVEIS;
  return PAGINAS_CONFIGURAVEIS.filter((pagina) => !PAGINAS_SO_IMOBILIARIO.has(pagina.chave));
}
