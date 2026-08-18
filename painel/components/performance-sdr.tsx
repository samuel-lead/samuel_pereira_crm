import type { MetricasUsuario } from "@/lib/metricas";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}

export function PerformanceSdr({
  dados,
  periodo,
}: {
  dados: MetricasUsuario[];
  periodo?: string;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">
        Performance da semana por SDR
      </h2>
      <p className="mb-4 text-xs text-neutral-500">
        Só admin vê essa comparação entre a equipe.
        {periodo && <> Semana de {periodo} (domingo a sábado).</>}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2 font-medium">SDR</th>
              <th className="px-3 py-2 font-medium">Leads</th>
              <th className="px-3 py-2 font-medium">Calls marcadas</th>
              <th className="px-3 py-2 font-medium">Calls realizadas</th>
              <th className="px-3 py-2 font-medium">No Show</th>
              <th className="px-3 py-2 font-medium">Vendas</th>
              <th className="px-3 py-2 font-medium">Taxa de venda</th>
              <th className="px-3 py-2 font-medium">Receita</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((linha) => (
              <tr
                key={linha.usuarioId}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="px-3 py-2 font-medium text-neutral-900">{linha.nome}</td>
                <td className="px-3 py-2 text-neutral-600">{linha.leadsTrabalhados}</td>
                <td className="px-3 py-2 text-neutral-600">{linha.reunioesMarcadas}</td>
                <td className="px-3 py-2 text-neutral-600">{linha.reunioesRealizadas}</td>
                <td className="px-3 py-2 text-neutral-600">{linha.noShow}</td>
                <td className="px-3 py-2 text-neutral-600">{linha.vendas}</td>
                <td className="px-3 py-2 text-neutral-600">
                  {formatarPercentual(linha.taxaVenda)}
                </td>
                <td className="px-3 py-2 font-medium text-emerald-700">
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
