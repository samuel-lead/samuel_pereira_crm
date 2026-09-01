// Converte um valor digitado em formato brasileiro (ponto pra milhar,
// vírgula pra decimal — ex: "60.000,00" ou só "60000") pro número que o
// banco espera. Sem isso, um <input type="number"> descarta a vírgula
// sozinho e transforma "60.000,00" em 60 (sessenta), não sessenta mil.
export function paraNumeroBR(valor: string): number {
  const limpo = valor.trim().replace(/\./g, "").replace(",", ".");
  return Number(limpo);
}
