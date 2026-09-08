import type { LeadPorOrigem } from "@/lib/metricas";

export function LeadsPorOrigem({
  titulo,
  dados,
  diasUteis,
}: {
  titulo: string;
  dados: LeadPorOrigem[];
  diasUteis: number;
}) {
  const total = dados.reduce((soma, d) => soma + d.quantidade, 0);
  const mediaPorDia = diasUteis > 0 ? total / diasUteis : 0;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">{titulo}</h2>
        <span className="text-sm font-bold text-neutral-800">
          {mediaPorDia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} leads/dia
          em média · {total} lead{total === 1 ? "" : "s"} no total
        </span>
      </div>

      {dados.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
          Nenhum lead nesse período ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {dados.map((linha) => {
            const pct = total > 0 ? Math.round((linha.quantidade / total) * 100) : 0;
            return (
              <div key={linha.origem}>
                <div className="mb-1.5 flex items-center justify-between text-lg">
                  <span className="font-semibold text-neutral-700">{linha.origem}</span>
                  <span className="font-bold text-neutral-900">{linha.quantidade}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
