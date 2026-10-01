import type { MetricasCloser } from "@/lib/metricas";
import { Calls, Faturamento } from "@/lib/terminologia";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}

export function PerformanceCloser({
  titulo,
  dados,
  publicoOrg = "mentoria",
}: {
  titulo?: string;
  dados: MetricasCloser[];
  publicoOrg?: string;
}) {
  const tituloResolvido = titulo ?? "Performance por Closer";
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">{tituloResolvido}</h2>
      <p className="mb-4 text-xs text-neutral-500">Comparação entre todo o time.</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="w-28 px-3 py-2 text-left font-medium">Closer</th>
              <th className="w-28 px-3 py-2 text-center font-medium">{Calls(publicoOrg)} realizadas</th>
              <th className="w-28 px-3 py-2 text-center font-medium">{Calls(publicoOrg)} com proposta</th>
              <th className="w-24 px-3 py-2 text-center font-medium">Vendas</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Taxa de vendas</th>
              <th className="w-32 px-3 py-2 text-center font-medium">Receita</th>
              <th className="w-32 px-3 py-2 text-center font-medium">{Faturamento(publicoOrg)}</th>
              <th className="w-32 px-3 py-2 text-center font-medium">Ticket médio</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((linha) => (
              <tr key={linha.usuarioId} className="border-b border-neutral-100 last:border-0">
                <td className="truncate px-3 py-2 text-left font-medium text-neutral-900" title={linha.nome}>
                  {linha.nome}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.reunioesRealizadas}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.reunioesComPitch}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.vendas}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarPercentual(linha.taxaVenda)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarMoeda(linha.receita)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums font-medium text-green-700">
                  {formatarMoeda(linha.faturamento)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {linha.ticketMedio !== null ? formatarMoeda(linha.ticketMedio) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
