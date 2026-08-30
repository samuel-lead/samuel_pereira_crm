// Sem centavos aqui — é um resumo rápido, não a tela de editar o valor da
// venda. "R$ 27.000,03" só polui a leitura sem fazer diferença nenhuma.
function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

// Célula "N vendas" com faturamento do lado do número e receita numa
// linha embaixo — reaproveitada em Pré-vendas e Vendas (Vendas hoje /
// Vendas no mês), só muda o rótulo e a fonte dos números.
export function CartaoVendas({
  label,
  vendas,
  faturamento,
  receita,
}: {
  label: string;
  vendas: number;
  faturamento: number;
  receita: number;
}) {
  return (
    <div className="min-w-[150px] flex-1 px-3 py-2">
      <p className="text-[10px] leading-tight text-neutral-500">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-base font-bold leading-tight text-neutral-900">{vendas}</span>
        <span className="truncate text-[10px] leading-tight text-neutral-400">
          {formatarMoeda(faturamento)} faturamento
        </span>
      </div>
      <p className="mt-0.5 truncate text-[10px] leading-tight text-neutral-400">
        {formatarMoeda(receita)} receita
      </p>
    </div>
  );
}
