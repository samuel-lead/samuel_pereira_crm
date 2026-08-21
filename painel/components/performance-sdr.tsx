import type { MetricasUsuario } from "@/lib/metricas";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}

export function PerformanceSdr({
  titulo = "Performance da semana por SDR",
  dados,
  periodo,
}: {
  titulo?: string;
  dados: MetricasUsuario[];
  periodo?: string;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">{titulo}</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Só admin vê essa comparação entre a equipe.
        {periodo && <> {periodo}</>}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2 text-left font-medium">SDR</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Leads</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Ligações</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Calls marcadas</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Calls realizadas</th>
              <th className="w-28 px-3 py-2 text-center font-medium">No-show</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Vendas</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Taxa de venda</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Receita</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((linha) => (
              <tr
                key={linha.usuarioId}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="px-3 py-2 text-left font-medium text-neutral-900">{linha.nome}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.leadsTrabalhados}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.ligacoes}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.reunioesMarcadas}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.reunioesRealizadas}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.noShow}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.vendas}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarPercentual(linha.taxaVenda)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums font-medium text-green-700">
                  {formatarMoeda(linha.receita)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
