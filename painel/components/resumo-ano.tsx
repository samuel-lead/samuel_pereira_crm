import type { ResumoMes } from "@/lib/metricas";

const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ResumoAno({ dados, mesAtual }: { dados: ResumoMes[]; mesAtual: number }) {
  const totalMeta = dados.reduce((soma, m) => soma + (m.metaReceita ?? 0), 0);
  const totalFaturamento = dados.reduce((soma, m) => soma + m.faturamento, 0);
  const totalReceita = dados.reduce((soma, m) => soma + m.receita, 0);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-700 to-teal-500 p-7 text-white shadow-2xl shadow-emerald-950/50 ring-1 ring-white/10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />
        <p className="relative text-xs font-bold uppercase tracking-widest text-emerald-200">
          Receita do ano até agora
        </p>
        <p className="relative mt-1 text-5xl font-black tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
          {formatarMoeda(totalReceita)}
        </p>
        <p className="relative mt-2 text-sm font-medium text-emerald-100">
          Meta acumulada {formatarMoeda(totalMeta)} · Faturamento acumulado{" "}
          {formatarMoeda(totalFaturamento)}
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-neutral-800">Mês a mês</h2>
        <p className="mb-4 text-xs text-neutral-500">
          Meses antes de agosto/2026 usam o resultado real registrado a
          partir da planilha; agosto em diante é calculado ao vivo pelos
          leads do CRM.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2 text-left font-medium">Mês</th>
                <th className="px-3 py-2 text-center font-medium">Meta</th>
                <th className="px-3 py-2 text-center font-medium">Faturamento</th>
                <th className="px-3 py-2 text-center font-medium">Receita</th>
                <th className="px-3 py-2 text-center font-medium">Falta pra meta</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((linha) => {
                const falta =
                  linha.metaReceita !== null ? linha.metaReceita - linha.receita : null;
                const bateu = falta !== null ? falta <= 0 : null;
                const ehMesAtual = linha.mes === mesAtual;
                return (
                  <tr
                    key={linha.mes}
                    className={`border-b border-neutral-100 last:border-0 ${
                      ehMesAtual ? "bg-emerald-50/50" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-left font-medium text-neutral-900">
                      {NOMES_MESES[linha.mes - 1]}
                      {ehMesAtual && (
                        <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          agora
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                      {linha.metaReceita !== null ? formatarMoeda(linha.metaReceita) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-neutral-600">
                      {formatarMoeda(linha.faturamento)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums font-semibold text-neutral-900">
                      {formatarMoeda(linha.receita)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums font-bold">
                      {bateu === null ? (
                        <span className="text-neutral-400">—</span>
                      ) : bateu ? (
                        <span className="text-emerald-600">Bateu a meta 🎉</span>
                      ) : (
                        <span className="text-amber-600">{formatarMoeda(falta!)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
