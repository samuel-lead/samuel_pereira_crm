import type { BonusSdr } from "@/lib/metricas";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}

export function BonusSdrTabela({ dados, periodo }: { dados: BonusSdr[]; periodo?: string }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">Bônus da equipe</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Calls realizadas (≥60/80/100 → R$300/R$500/R$1.000) + R$20 por call
        marcada no fim de semana e realizada + faturamento do mês
        (≥R$50mil/80mil/100mil → R$1.000/R$2.000/R$3.000).
        {periodo && <> Mês de {periodo}.</>}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2 text-left font-medium">SDR</th>
              <th className="px-3 py-2 text-center font-medium">Calls marcadas</th>
              <th className="px-3 py-2 text-center font-medium">Calls realizadas</th>
              <th className="px-3 py-2 text-center font-medium">No-show</th>
              <th className="px-3 py-2 text-center font-medium">Bônus calls</th>
              <th className="px-3 py-2 text-center font-medium">Bônus fim de semana</th>
              <th className="px-3 py-2 text-center font-medium">Faturamento</th>
              <th className="px-3 py-2 text-center font-medium">Bônus faturamento</th>
              <th className="px-3 py-2 text-center font-medium">Total de bônus</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((linha) => (
              <tr
                key={linha.usuarioId}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="px-3 py-2 text-left font-medium text-neutral-900">{linha.nome}</td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {linha.reunioesMarcadas}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {linha.reunioesRealizadas}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarPercentual(linha.noShowPercentual)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarMoeda(linha.bonusPorCallRealizada)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarMoeda(linha.bonusFimDeSemana)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarMoeda(linha.faturamento)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                  {formatarMoeda(linha.bonusPorFaturamento)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums font-bold text-emerald-700">
                  {formatarMoeda(linha.totalBonus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
