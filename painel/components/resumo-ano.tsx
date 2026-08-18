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
          Receita do ano{mesAtual > 0 ? " até agora" : ""}
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

        <div className="space-y-3">
          {dados.map((linha) => {
            const meta = linha.metaReceita;
            const pct = meta && meta > 0 ? Math.min(100, Math.round((linha.receita / meta) * 100)) : 0;
            const bateu = meta !== null ? linha.receita >= meta : null;
            const ehMesAtual = linha.mes === mesAtual;
            const corBarra =
              bateu === null ? "bg-neutral-300" : bateu ? "bg-emerald-500" : "bg-amber-500";

            return (
              <div
                key={linha.mes}
                className={`rounded-lg border p-3 transition ${
                  ehMesAtual
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-neutral-100 bg-neutral-50/40"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                    {NOMES_MESES[linha.mes - 1]}
                    {ehMesAtual && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        agora
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-neutral-900">
                    {formatarMoeda(linha.receita)}
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200/70">
                  <div
                    className={`h-full rounded-full ${corBarra} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                  <span className="text-neutral-500">
                    Meta {meta !== null ? formatarMoeda(meta) : "—"} · Faturamento{" "}
                    {formatarMoeda(linha.faturamento)}
                  </span>
                  <span
                    className={`font-semibold ${
                      bateu === null
                        ? "text-neutral-400"
                        : bateu
                          ? "text-emerald-600"
                          : "text-amber-600"
                    }`}
                  >
                    {bateu === null
                      ? "—"
                      : bateu
                        ? "Bateu a meta 🎉"
                        : `Falta ${formatarMoeda(meta! - linha.receita)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
