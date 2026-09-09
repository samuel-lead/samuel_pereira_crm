import type { MetricasUsuario } from "@/lib/metricas";
import { CopiarRelatorioButton } from "@/components/copiar-relatorio-button";
import { Calls, Sdr, Faturamento } from "@/lib/terminologia";

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

export function PerformanceSdr({
  titulo,
  dados,
  periodo,
  publicoOrg = "mentoria",
}: {
  titulo?: string;
  dados: MetricasUsuario[];
  periodo: string;
  publicoOrg?: string;
}) {
  const tituloResolvido = titulo ?? `Performance da semana por ${Sdr(publicoOrg)}`;
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">{tituloResolvido}</h2>
      <p className="mb-4 text-xs text-neutral-500">Comparação entre todo o time. {periodo}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="w-28 px-3 py-2 text-left font-medium">{Sdr(publicoOrg)}</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Leads Novos</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Ligações</th>
              <th className="w-28 px-3 py-2 text-center font-medium">{Calls(publicoOrg)} marcadas</th>
              <th className="w-28 px-3 py-2 text-center font-medium">{Calls(publicoOrg)} realizadas</th>
              <th className="w-28 px-3 py-2 text-center font-medium">No-show</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Vendas</th>
              <th className="w-28 px-3 py-2 text-center font-medium">Taxa de venda</th>
              <th className="w-28 px-3 py-2 text-center font-medium">{Faturamento(publicoOrg)}</th>
              <th className="w-24 px-3 py-2 text-center font-medium">Relatório</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((linha) => (
              <tr
                key={linha.usuarioId}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="truncate px-3 py-2 text-left font-medium text-neutral-900" title={linha.nome}>
                  {linha.nome}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.leadsTrabalhados}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.ligacoes}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.reunioesMarcadas}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.reunioesRealizadas}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarPercentual(
                    linha.reunioesDevidas > 0 ? linha.noShow / linha.reunioesDevidas : null
                  )}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">{linha.vendas}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarPercentual(linha.taxaVenda)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums font-medium text-green-700">
                  {formatarMoeda(linha.faturamento)}
                </td>
                <td className="px-3 py-2 text-center">
                  {linha.podeCopiarRelatorio && (
                    <CopiarRelatorioButton
                      periodoLabel={periodo}
                      callsMarcadas={linha.reunioesMarcadas}
                      callsReagendadas={linha.reunioesReagendadas}
                      ligacoesFeitas={linha.ligacoes}
                      publicoOrg={publicoOrg}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
